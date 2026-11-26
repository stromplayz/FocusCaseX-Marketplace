/**
 * FocusCaseX sample plugin — Referral Composer.
 *
 * A sidebar composer that turns the active patient's chart into a clean,
 * prefilled referral letter to an ophthalmologist, a GP or another
 * colleague, then files it under Referrals/<YYYY-MM-DD>-<PatientSlug>.md.
 *
 *  • Sidebar section (registerSidebarSection): recipient type (Ophthalmologist
 *    / GP / Other + optional named recipient), reason for referral, findings
 *    summary, management line and the question to answer.
 *  • Prefill from the ACTIVE patient (ctx.app.getActivePatient): the latest
 *    resolved visit values (VA, IOP, Rx, H/O, Dx, Advice) are parsed leniently —
 *    any field the chart does not record simply stays a blank placeholder, and
 *    a chart with nothing recorded still composes an editable letter.
 *  • Letter body ships as a default template string, editable per recipient
 *    type from the settings pane and stored with the extension
 *    ({templates, signer} in extension storage).
 *  • Signer identity prefers the app's clinic context (Settings › General ›
 *    Clinic name / Clinician name, read via ctx.settings.get) and falls back
 *    to the signer fields saved in extension storage.
 *  • Compose merges the template, picks a fresh file name and writes the
 *    letter via ctx.app.createNote; the last letters are listed for one-tap
 *    reopening (ctx.fs, permission-gated by the declared folders).
 *  • No network — everything happens inside the running app.
 */
(function (ctx) {
  "use strict";

  /* ============================ default letter ============================ */

  /**
   * The default letter body. Merge fields are {{name}} tokens; anything the
   * chart cannot supply is merged as an empty string (a blank placeholder
   * the clinician fills by hand).
   *
   *   {{date}}          today (YYYY-MM-DD)          {{recipient}}   salutation target
   *   {{opening}}       per-recipient courtesy line {{patientLine}}  name · age · sex · MR
   *   {{patient}} {{mr}} {{age}} {{sex}}             {{visitDate}}   latest visit date
   *   {{reason}} {{findings}} {{management}} {{question}}
   *   {{clinician}} = {{clinic.clinician}}          {{clinic.name}} {{contact}}
   */
  var DEFAULT_TEMPLATE = [
    "{{date}}",
    "",
    "Dear {{recipient}},",
    "",
    "Re: {{patientLine}}",
    "",
    "{{opening}}",
    "",
    "**Reason for referral**",
    "",
    "{{reason}}",
    "",
    "**Latest findings** ({{visitDate}} visit)",
    "",
    "{{findings}}",
    "",
    "**Management so far**",
    "",
    "{{management}}",
    "",
    "**Question to answer**",
    "",
    "{{question}}",
    "",
    "Thank you for seeing this patient.",
    "",
    "Kind regards,",
    "",
    "{{clinician}}",
    "{{clinic.name}}",
    "{{contact}}",
    "",
  ].join("\n");

  var RECIPIENT_TYPES = [
    {
      id: "ophthalmologist",
      label: "Ophthalmologist",
      opening: "I would be grateful for your ophthalmological assessment and management of this patient.",
    },
    {
      id: "gp",
      label: "GP",
      opening: "I would appreciate your review and continued care of this patient.",
    },
    {
      id: "other",
      label: "Other",
      opening: "I would be grateful for your opinion on this patient.",
    },
  ];

  function typeById(id) {
    for (var i = 0; i < RECIPIENT_TYPES.length; i++) {
      if (RECIPIENT_TYPES[i].id === id) return RECIPIENT_TYPES[i];
    }
    return RECIPIENT_TYPES[0];
  }

  /* ============================== storage ================================ */

  var cfg = {
    folder: "Referrals",
    signer: { clinician: "", role: "", clinic: "", contact: "" },
    templates: { ophthalmologist: DEFAULT_TEMPLATE, gp: DEFAULT_TEMPLATE, other: DEFAULT_TEMPLATE },
    recipientType: "ophthalmologist",
    recipientName: "",
  };

  ctx
    .loadData()
    .then(function (d) {
      if (!d || typeof d !== "object") return;
      if (typeof d.folder === "string" && d.folder.trim()) cfg.folder = d.folder.trim().replace(/^\/+|\/+$/g, "");
      if (d.signer && typeof d.signer === "object") {
        ["clinician", "role", "clinic", "contact"].forEach(function (k) {
          if (typeof d.signer[k] === "string") cfg.signer[k] = d.signer[k];
        });
      }
      if (d.templates && typeof d.templates === "object") {
        RECIPIENT_TYPES.forEach(function (t) {
          if (typeof d.templates[t.id] === "string" && d.templates[t.id].trim()) cfg.templates[t.id] = d.templates[t.id];
        });
      }
      if (typeof d.recipientType === "string" && typeById(d.recipientType).id === d.recipientType) cfg.recipientType = d.recipientType;
      if (typeof d.recipientName === "string") cfg.recipientName = d.recipientName;
      syncInputs();
      renderDynamic();
    })
    .catch(function () {});

  function persistCfg() {
    try {
      void ctx.saveData(JSON.parse(JSON.stringify(cfg)));
    } catch (e) {
      /* best effort */
    }
  }

  /* ============================== helpers ================================ */

  function str(s) {
    return s == null ? "" : String(s).trim();
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /** Path-safe slug from the patient name (falls back to the MR). */
  function patientSlug(p) {
    var base = p && str(p.patient) ? str(p.patient) : p && str(p.mr) ? str(p.mr) : "patient";
    var slug = base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug || "patient";
  }

  /** "Jane Doe · 54 y · F · MR MR-1042" — missing parts are dropped. */
  function patientLine(p) {
    if (!p) return "";
    var parts = [];
    var name = str(p.patient);
    if (name) parts.push(name);
    var age = str(p.age);
    var sex = str(p.sex);
    var demo = [];
    if (age) demo.push(/^\d+$/.test(age) ? age + " y" : age);
    if (sex) demo.push(sex);
    if (demo.length) parts.push(demo.join(" · "));
    var mr = str(p.mr);
    if (mr) parts.push("MR " + mr);
    return parts.join(" · ");
  }

  /** Replace every {{token}}; tokens with no value merge as blank. */
  function applyMerge(tpl, map) {
    return String(tpl || "").replace(/\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g, function (whole, key) {
      return Object.prototype.hasOwnProperty.call(map, key) ? String(map[key]) : "";
    });
  }

  /** Tidy spacing — a blank section never leaves triple gaps behind. */
  function tidy(text) {
    var out = String(text || "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n");
    return out.replace(/\s+$/, "") + "\n";
  }

  /**
   * Signer identity. The host DOES expose the clinic context — the app
   * settings store (ctx.settings.get → general.clinicName / clinicianName,
   * the General profile card). Those win; the extension-storage signer
   * fields fill whatever the clinic context leaves blank.
   */
  function signerIdentity() {
    var gen = null;
    try {
      var s = ctx.settings.get();
      if (s && s.general && typeof s.general === "object") gen = s.general;
    } catch (e) {
      gen = null;
    }
    var clinic = (gen && str(gen.clinicName)) || cfg.signer.clinic;
    var clinician = (gen && str(gen.clinicianName)) || cfg.signer.clinician;
    var name = clinician;
    if (name && cfg.signer.role) name = name + ", " + cfg.signer.role;
    return { clinician: name, clinic: clinic, contact: cfg.signer.contact };
  }

  /* ==================== findings from the latest visit ==================== */

  function eyePair(a, b) {
    var A = str(a);
    var B = str(b);
    if (A && B) return "OD " + A + " · OS " + B;
    if (A) return "OD " + A;
    if (B) return "OS " + B;
    return "";
  }

  function rxLine(v) {
    var parts = [];
    [
      ["OD", v.sph_od, v.cyl_od, v.axis_od],
      ["OS", v.sph_os, v.cyl_os, v.axis_os],
    ].forEach(function (eye) {
      if (!str(eye[1]) && !str(eye[2])) return;
      var t = str(eye[1]) || "—";
      if (str(eye[2])) t += " / " + str(eye[2]);
      if (str(eye[3])) t += " × " + str(eye[3]);
      parts.push(eye[0] + " " + t);
    });
    return parts.join(" · ");
  }

  /**
   * Lenient findings summary from the latest resolved visit values. Every
   * line is optional — a chart that records none of it yields "" and the
   * letter keeps a blank placeholder where the findings go.
   */
  function buildFindings(values) {
    var v = values || {};
    var lines = [];
    var va = eyePair(v.va_od, v.va_os);
    if (va) lines.push("Visual acuity — " + va);
    var iop = eyePair(v.iop_od, v.iop_os);
    if (iop) lines.push("Intraocular pressure — " + iop + " mmHg");
    var rx = rxLine(v);
    if (rx) lines.push("Current spectacles — " + rx);
    if (str(v.hx)) lines.push("History — " + str(v.hx));
    if (str(v.dx)) lines.push("Working diagnosis — " + str(v.dx));
    return lines.join("\n");
  }

  /**
   * Latest visit date, parsed leniently off the active patient file: the
   * last ```emr-visit block with a date: line wins; anything else → "".
   */
  function latestVisitDate() {
    if (!S.patient || !S.patient.path) return Promise.resolve("");
    return ctx.app
      .getNoteContent(S.patient.path)
      .then(function (content) {
        var d = "";
        if (content) {
          var blocks = String(content).match(/```emr-visit[\s\S]*?```/g) || [];
          for (var i = blocks.length - 1; i >= 0 && !d; i--) {
            var m = /^\s*date:\s*(.+)$/m.exec(blocks[i]);
            if (m) d = str(m[1]);
          }
        }
        return d;
      })
      .catch(function () {
        return "";
      });
  }

  /* ============================ composer state ============================ */

  var S = {
    patient: null,
    patientPath: null,
    recipientType: cfg.recipientType,
    recipientName: cfg.recipientName,
    reason: "",
    findings: "",
    findingsTouched: false,
    management: "",
    question: "",
    recent: null, // null = access unknown/ungranted, [] = granted, empty
  };

  function prefillFromPatient() {
    var p = S.patient;
    if (!p) return;
    if (!S.findingsTouched) S.findings = buildFindings(p.values);
    if (!S.management) S.management = str(p.values && p.values.advice);
  }

  function recipientLabel() {
    var named = str(S.recipientName);
    if (named) return named;
    return typeById(S.recipientType).label;
  }

  function templateFor(typeId) {
    var t = cfg.templates[typeId];
    return typeof t === "string" && t.trim() ? t : DEFAULT_TEMPLATE;
  }

  function buildLetter() {
    return latestVisitDate().then(function (visitDate) {
      var sign = signerIdentity();
      var map = {
        date: todayStr(),
        recipient: recipientLabel(),
        opening: typeById(S.recipientType).opening,
        patientLine: patientLine(S.patient),
        patient: S.patient ? str(S.patient.patient) : "",
        mr: S.patient ? str(S.patient.mr) : "",
        age: S.patient ? str(S.patient.age) : "",
        sex: S.patient ? str(S.patient.sex) : "",
        visitDate: visitDate || "latest",
        reason: str(S.reason),
        findings: str(S.findings),
        management: str(S.management),
        question: str(S.question),
        clinician: sign.clinician,
        "clinic.clinician": sign.clinician,
        "clinic.name": sign.clinic,
        clinic: sign.clinic,
        contact: sign.contact,
      };
      return tidy(applyMerge(templateFor(S.recipientType), map));
    });
  }

  /* ================================ UI ================================= */

  var instances = [];

  var C = {
    fg: "var(--foreground,#e6e6e6)",
    dim: "var(--muted-foreground,#9ca3af)",
    accent: "var(--accent-live,#2979ff)",
    border: "color-mix(in oklab, var(--accent-live) 16%, var(--border))",
    soft: "color-mix(in oklab, var(--accent-live) 7%, transparent)",
    chip: "color-mix(in oklab, var(--accent-live) 14%, transparent)",
  };

  function h(tag, style, text) {
    var node = document.createElement(tag);
    if (style) node.style.cssText = style;
    if (text != null) node.textContent = text;
    return node;
  }

  function sectionLabel(text) {
    return h("div", "margin:2px 0 -2px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:" + C.dim, text);
  }

  var INPUT_CSS =
    "width:100%;box-sizing:border-box;height:34px;padding:0 9px;border-radius:9px;font:inherit;font-size:12.5px;color:" + C.fg + ";" +
    "background:" + C.soft + ";border:1px solid " + C.border + ";outline:none;transition:border-color .15s;";
  var AREA_CSS = INPUT_CSS.replace("height:34px;", "height:56px;padding:7px 9px;resize:vertical;line-height:1.45;");

  function focusAccent(e) {
    e.target.style.borderColor = C.accent;
  }
  function blurAccent(e) {
    e.target.style.borderColor = C.border;
  }

  function mkInput(placeholder, oninput, value) {
    var i = document.createElement("input");
    i.style.cssText = INPUT_CSS;
    i.placeholder = placeholder || "";
    i.value = value == null ? "" : value;
    i.spellcheck = false;
    i.addEventListener("focus", focusAccent);
    i.addEventListener("blur", blurAccent);
    if (oninput) i.addEventListener("input", oninput);
    return i;
  }

  function mkArea(placeholder, oninput, value) {
    var a = document.createElement("textarea");
    a.style.cssText = AREA_CSS;
    a.placeholder = placeholder || "";
    a.value = value == null ? "" : value;
    a.spellcheck = false;
    a.addEventListener("focus", focusAccent);
    a.addEventListener("blur", blurAccent);
    if (oninput) a.addEventListener("input", oninput);
    return a;
  }

  function mkBtn(label, opts) {
    opts = opts || {};
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.cssText =
      "display:inline-flex;align-items:center;justify-content:center;gap:5px;height:" + (opts.h || 32) + "px;padding:0 12px;border-radius:9px;" +
      "font:inherit;font-size:12px;font-weight:600;cursor:pointer;transition:opacity .15s,transform .05s;" +
      (opts.primary
        ? "background:" + C.accent + ";color:#fff;border:1px solid transparent;"
        : "background:" + C.soft + ";color:" + C.fg + ";border:1px solid " + C.border + ";") +
      (opts.block ? "width:100%;" : "");
    b.addEventListener("click", function () {
      b.style.transform = "scale(0.97)";
      setTimeout(function () {
        b.style.transform = "";
      }, 90);
      if (opts.onClick) opts.onClick();
    });
    return b;
  }

  function chip(text, tone) {
    return h(
      "span",
      "display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;font-size:10.5px;font-weight:600;" +
        (tone === "warn"
          ? "background:color-mix(in oklab,#f59e0b 14%,transparent);color:#f59e0b;"
          : tone === "ok"
            ? "background:color-mix(in oklab,#10b981 14%,transparent);color:#10b981;"
            : "background:" + C.chip + ";color:" + C.accent + ";"),
      text,
    );
  }

  function buildInstance(host) {
    /* remount into the same host — drop the previous tree first so trees
       never pile up (StrictMode-style double effects) */
    while (host.firstChild) host.removeChild(host.firstChild);

    var inst = { el: null, els: {}, inputs: {} };
    var el = document.createElement("div");
    el.style.cssText = "display:flex;flex-direction:column;gap:9px;padding:6px 2px 10px;font-size:12.5px;color:" + C.fg + ";min-width:0;";
    inst.el = el;

    /* --- patient banner (dynamic) --- */
    inst.els.patient = h("div", "display:flex;flex-direction:column;gap:6px;padding:8px 9px;border-radius:10px;background:" + C.soft + ";border:1px solid " + C.border + ";");
    el.appendChild(inst.els.patient);

    /* --- recipient --- */
    el.appendChild(sectionLabel("Recipient"));
    var typeSel = document.createElement("select");
    typeSel.style.cssText = INPUT_CSS;
    RECIPIENT_TYPES.forEach(function (t) {
      var o = document.createElement("option");
      o.value = t.id;
      o.textContent = t.label;
      typeSel.appendChild(o);
    });
    typeSel.addEventListener("change", function () {
      S.recipientType = typeSel.value;
      cfg.recipientType = typeSel.value;
      persistCfg();
      schedulePreview();
    });
    inst.inputs.type = typeSel;
    el.appendChild(typeSel);

    var nameInput = mkInput("Named recipient (optional — e.g. Dr A. Rao, MO)", function () {
      S.recipientName = nameInput.value;
      schedulePreview();
    }, S.recipientName);
    nameInput.addEventListener("change", function () {
      cfg.recipientName = S.recipientName;
      persistCfg();
    });
    inst.inputs.name = nameInput;
    el.appendChild(nameInput);

    /* --- reason --- */
    el.appendChild(sectionLabel("Reason for referral"));
    var reasonArea = mkArea("e.g. Cataract assessment · dropping VA · glaucoma review", function () {
      S.reason = reasonArea.value;
      schedulePreview();
    }, S.reason);
    inst.inputs.reason = reasonArea;
    el.appendChild(reasonArea);

    /* --- findings --- */
    var findHead = document.createElement("div");
    findHead.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:6px;";
    findHead.appendChild(sectionLabel("Findings summary (from chart)"));
    findHead.appendChild(
      mkBtn("Refresh", {
        h: 24,
        onClick: function () {
          S.findingsTouched = false;
          prefillFromPatient();
          syncInputs();
          schedulePreview();
        },
      }),
    );
    el.appendChild(findHead);
    var findArea = mkArea("Prefilled from the latest visit — VA, IOP, Rx, H/O, Dx. Blank lines stay blank; add anything the chart is missing.", function () {
      S.findings = findArea.value;
      S.findingsTouched = true;
      schedulePreview();
    }, S.findings);
    inst.inputs.findings = findArea;
    el.appendChild(findArea);

    /* --- management + question --- */
    el.appendChild(sectionLabel("Management so far"));
    var mgmtArea = mkArea("e.g. Timolol BD OU · review 6 weeks", function () {
      S.management = mgmtArea.value;
      schedulePreview();
    }, S.management);
    inst.inputs.management = mgmtArea;
    el.appendChild(mgmtArea);

    el.appendChild(sectionLabel("Question to answer"));
    var qArea = mkArea("e.g. Is she suitable for phaco + IOL, and when?", function () {
      S.question = qArea.value;
      schedulePreview();
    }, S.question);
    inst.inputs.question = qArea;
    el.appendChild(qArea);

    /* --- preview + compose --- */
    var preview = document.createElement("details");
    preview.style.cssText = "border:1px solid " + C.border + ";border-radius:10px;padding:6px 8px;";
    preview.appendChild(h("summary", "cursor:pointer;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:" + C.dim + ";user-select:none;", "Letter preview"));
    inst.els.preview = h(
      "pre",
      "margin:8px 0 2px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;line-height:1.55;white-space:pre-wrap;word-break:break-word;color:" + C.fg + ";" +
        "background:color-mix(in oklab, var(--accent-live) 4%, transparent);border-radius:8px;padding:8px;max-height:200px;overflow:auto;",
    );
    preview.appendChild(inst.els.preview);
    el.appendChild(preview);

    inst.els.composeBtn = mkBtn("Compose & file under " + cfg.folder, { primary: true, block: true, h: 38, onClick: compose });
    el.appendChild(inst.els.composeBtn);

    /* --- filed letters (dynamic) --- */
    inst.els.recent = h("div", "display:none;flex-direction:column;gap:4px;");
    el.appendChild(inst.els.recent);

    instances.push(inst);
    host.appendChild(el);
    syncInputs();
    return inst;
  }

  function syncInputs() {
    instances.forEach(function (inst) {
      if (inst.inputs.type) inst.inputs.type.value = S.recipientType;
      if (inst.inputs.name) inst.inputs.name.value = S.recipientName;
      if (inst.inputs.reason) inst.inputs.reason.value = S.reason;
      if (inst.inputs.findings) inst.inputs.findings.value = S.findings;
      if (inst.inputs.management) inst.inputs.management.value = S.management;
      if (inst.inputs.question) inst.inputs.question.value = S.question;
    });
  }

  /* --------------------------- dynamic rendering --------------------------- */

  var previewTimer = null;
  function schedulePreview() {
    if (previewTimer) clearTimeout(previewTimer);
    previewTimer = setTimeout(renderDynamic, 250);
  }

  function renderPatient(inst) {
    var box = inst.els.patient;
    box.textContent = "";
    box.style.display = "flex";
    if (!S.patient) {
      box.appendChild(
        h(
          "div",
          "font-size:11px;line-height:1.55;color:" + C.dim,
          "No patient chart is open. Open a chart under Database/Patients (type: optom-patient) and the letter prefills from its latest visit.",
        ),
      );
      return;
    }
    var top = h("div", "display:flex;align-items:center;gap:6px;flex-wrap:wrap;");
    top.appendChild(chip(str(S.patient.patient) || "Unnamed", "ok"));
    top.appendChild(chip(str(S.patient.mr) || "MR —"));
    box.appendChild(top);
    var demo = [];
    if (str(S.patient.age)) demo.push(str(S.patient.age) + ( /^\d+$/.test(str(S.patient.age)) ? " y" : ""));
    if (str(S.patient.sex)) demo.push(str(S.patient.sex));
    demo.push(S.patient.visits + (S.patient.visits === 1 ? " visit" : " visits"));
    box.appendChild(h("div", "font-size:11px;color:" + C.dim + ";line-height:1.5;", demo.join(" · ") + " — the latest visit prefills the letter; blanks stay blank."));
  }

  function renderPreview(inst) {
    var pre = inst.els.preview;
    if (!S.patient) {
      pre.textContent = "Open a patient chart to compose.";
      return;
    }
    buildLetter().then(function (body) {
      pre.textContent = body;
    }).catch(function () {
      pre.textContent = "";
    });
  }

  function renderRecent(inst) {
    var box = inst.els.recent;
    box.textContent = "";
    if (S.recent === null) {
      box.style.display = "flex";
      box.appendChild(
        h("div", "font-size:10.5px;line-height:1.5;color:" + C.dim, "Filed letters live in " + cfg.folder + " — grant the folder to list them here."),
      );
      box.appendChild(
        mkBtn("Grant folder access", {
          h: 26,
          onClick: function () {
            ctx
              .requestAccess()
              .catch(function () {
                return null;
              })
              .then(function () {
                refreshRecent();
              });
          },
        }),
      );
      return;
    }
    if (!S.recent.length) {
      box.style.display = "none";
      return;
    }
    box.style.display = "flex";
    box.appendChild(sectionLabel("Recently filed"));
    S.recent.forEach(function (f) {
      var row = h(
        "button",
        "display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:8px;border:1px solid " + C.border + ";background:" + C.soft + ";cursor:pointer;font:inherit;font-size:11.5px;color:" + C.fg + ";text-align:left;",
      );
      row.addEventListener("click", function () {
        ctx.app.openNote(f.path).catch(function () {});
      });
      row.appendChild(h("span", "font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;", f.title || f.path.split("/").pop()));
      box.appendChild(row);
    });
  }

  function renderDynamic() {
    instances.forEach(function (inst) {
      if (!inst.el || !inst.el.isConnected) return;
      renderPatient(inst);
      renderPreview(inst);
      renderRecent(inst);
      /* keep the compose label in step with the folder setting */
      if (inst.els.composeBtn) inst.els.composeBtn.textContent = "Compose & file under " + cfg.folder;
    });
  }

  /* ============================ filing letters ============================ */

  function folderGranted() {
    try {
      return (ctx.fs.folders() || []).indexOf(cfg.folder) >= 0;
    } catch (e) {
      return false;
    }
  }

  function ensureAccess() {
    if (folderGranted()) return Promise.resolve(true);
    try {
      return ctx.requestAccess().catch(function () {
        return false;
      });
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  function refreshRecent() {
    if (!folderGranted()) {
      S.recent = null;
      renderDynamic();
      return;
    }
    ctx.fs
      .list(cfg.folder)
      .then(function (files) {
        S.recent = (files || [])
          .filter(function (f) {
            return /\.md$/i.test(f.path);
          })
          .sort(function (a, b) {
            return String(b.path).localeCompare(String(a.path));
          })
          .slice(0, 5);
        renderDynamic();
      })
      .catch(function () {
        S.recent = null;
        renderDynamic();
      });
  }

  /** First unused path: base, base-2 … base-9, then a clock-stamped one. */
  function nextPath(base, n) {
    var path = n === 0 ? base : base.replace(/\.md$/, "") + "-" + (n + 1) + ".md";
    return ctx.app.getNoteContent(path).then(function (hit) {
      if (!hit) return path;
      if (n >= 8) {
        var d = new Date();
        var stamp = String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0") + String(d.getSeconds()).padStart(2, "0");
        return base.replace(/\.md$/, "") + "-" + stamp + ".md";
      }
      return nextPath(base, n + 1);
    });
  }

  function compose() {
    if (!S.patient) {
      ctx.showToast("Open a patient chart first — the letter prefills from the active chart.");
      return;
    }
    ensureAccess()
      .catch(function () {
        return false;
      })
      .then(function () {
        return buildLetter();
      })
      .then(function (body) {
        var base = cfg.folder + "/" + todayStr() + "-" + patientSlug(S.patient) + ".md";
        var title = "Referral — " + (str(S.patient.patient) || str(S.patient.mr) || "patient") + " (" + todayStr() + ")";
        return nextPath(base, 0).then(function (path) {
          return ctx.app
            .createNote(path, { title: title, content: body })
            .then(function () {
              /* createNote swallows write errors — verify before celebrating */
              return ctx.app.getNoteContent(path).then(function (written) {
                if (written) {
                  ctx.showToast("Referral filed — " + path);
                  refreshRecent();
                  return path;
                }
                ctx.showToast("Could not write the letter to " + cfg.folder + ".");
                return null;
              });
            })
            .catch(function () {
              ctx.showToast("Could not write the letter to " + cfg.folder + ".");
              return null;
            });
        });
      })
      .catch(function () {
        ctx.showToast("Could not compose the letter.");
      });
  }

  /* =========================== settings pane =========================== */

  ctx.addSettingsPane(function (pane) {
    pane.textContent = "";
    var wrap = h("div", "display:flex;flex-direction:column;gap:10px;font-size:12.5px;color:" + C.fg + ";");

    wrap.appendChild(sectionLabel("Signer"));
    wrap.appendChild(
      h(
        "div",
        "font-size:11px;line-height:1.6;color:" + C.dim,
        "The letter signs with the app's clinic identity (Settings › General › Clinic name / Clinician name). The fields below fill in whatever that leaves blank — fallbacks, role line and contact line.",
      ),
    );
    [
      ["clinician", "Fallback clinician name", "Dr Meera Iyer"],
      ["role", "Role line", "Consultant Ophthalmologist"],
      ["clinic", "Fallback clinic name", "City Eye Centre"],
      ["contact", "Contact line", "Suite 4, 12 Marine Pde · (04) 5550 1234"],
    ].forEach(function (pair) {
      var row = h("div", "display:flex;align-items:center;gap:8px;justify-content:space-between;");
      row.appendChild(h("span", "font-size:11.5px;color:" + C.dim + ";flex:0 0 auto;", pair[1]));
      var inp = mkInput(pair[2], null, cfg.signer[pair[0]]);
      inp.style.cssText = INPUT_CSS + "max-width:190px;";
      inp.addEventListener("change", function () {
        cfg.signer[pair[0]] = inp.value.trim();
        persistCfg();
      });
      row.appendChild(inp);
      wrap.appendChild(row);
    });

    var folderRow = h("div", "display:flex;align-items:center;gap:8px;justify-content:space-between;");
    folderRow.appendChild(h("span", "font-size:11.5px;color:" + C.dim + ";", "Letters folder"));
    var folderInp = mkInput("Referrals", null, cfg.folder);
    folderInp.style.cssText = INPUT_CSS + "max-width:190px;";
    folderInp.addEventListener("change", function () {
      cfg.folder = (folderInp.value.trim() || "Referrals").replace(/^\/+|\/+$/g, "");
      folderInp.value = cfg.folder;
      persistCfg();
      refreshRecent();
      renderDynamic();
    });
    folderRow.appendChild(folderInp);
    wrap.appendChild(folderRow);

    /* --- template editor --- */
    wrap.appendChild(sectionLabel("Letter template"));
    var sel = document.createElement("select");
    sel.style.cssText = INPUT_CSS;
    RECIPIENT_TYPES.forEach(function (t) {
      var o = document.createElement("option");
      o.value = t.id;
      o.textContent = t.label;
      sel.appendChild(o);
    });
    sel.value = "ophthalmologist";
    wrap.appendChild(sel);

    var tplArea = document.createElement("textarea");
    tplArea.style.cssText = AREA_CSS.replace("height:56px;", "height:190px;");
    tplArea.value = templateFor(sel.value);
    tplArea.spellcheck = false;
    sel.addEventListener("change", function () {
      tplArea.value = templateFor(sel.value);
    });
    wrap.appendChild(tplArea);

    var tplBtns = h("div", "display:flex;gap:6px;");
    tplBtns.appendChild(
      mkBtn("Save template", {
        primary: true,
        h: 28,
        onClick: function () {
          var v = tplArea.value.trim();
          cfg.templates[sel.value] = v || DEFAULT_TEMPLATE;
          persistCfg();
          ctx.showToast("Template saved for " + typeById(sel.value).label + ".");
        },
      }),
    );
    tplBtns.appendChild(
      mkBtn("Reset to default", {
        h: 28,
        onClick: function () {
          cfg.templates[sel.value] = DEFAULT_TEMPLATE;
          tplArea.value = DEFAULT_TEMPLATE;
          persistCfg();
        },
      }),
    );
    wrap.appendChild(tplBtns);

    wrap.appendChild(
      h(
        "div",
        "font-size:11px;line-height:1.6;color:" + C.dim,
        "Merge fields: {{date}} · {{recipient}} · {{opening}} · {{patientLine}} · {{patient}} · {{mr}} · {{age}} · {{sex}} · {{visitDate}} · {{reason}} · {{findings}} · {{management}} · {{question}} · {{clinician}} ({{clinic.clinician}}) · {{clinic.name}} · {{contact}}. Anything the chart cannot supply merges as a blank line.",
      ),
    );
    pane.appendChild(wrap);
  });

  /* =========================== registrations =========================== */

  function focusComposer() {
    var last = instances[instances.length - 1];
    if (last && last.inputs.reason && last.el && last.el.isConnected) {
      last.inputs.reason.focus();
      last.el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  ctx.registerSidebarSection({
    id: "referral-composer",
    title: "Referral Composer",
    icon: "FilePlus2",
    order: 30,
    mount: function (host) {
      buildInstance(host);
      renderDynamic();
      ctx.app
        .getActivePatient()
        .then(function (p) {
          var path = p ? p.path : null;
          if (path !== S.patientPath) {
            S.patient = p;
            S.patientPath = path;
            prefillFromPatient();
            syncInputs();
          } else {
            S.patient = p;
          }
          renderDynamic();
        })
        .catch(function () {});
      refreshRecent();
    },
    destroy: function () {
      // React removed the section DOM — drop the matching instance(s);
      // other mounts (desktop sidebar vs mobile drawer) stay alive
      var remaining = [];
      var removedAny = false;
      instances.forEach(function (inst) {
        if (inst.el && inst.el.isConnected) remaining.push(inst);
        else removedAny = true;
      });
      if (!removedAny && remaining.length > 0) {
        var last = remaining.pop();
        if (last.el && last.el.parentNode) last.el.parentNode.removeChild(last.el);
      }
      instances = remaining;
    },
  });

  ctx.registerCommand({
    id: "focus-composer",
    title: "Referral Composer: open the composer",
    icon: "FilePlus2",
    run: focusComposer,
  });

  ctx.registerCommand({
    id: "compose-from-chart",
    title: "Referral Composer: compose & file from the active chart",
    icon: "FilePlus2",
    run: function () {
      ctx.app
        .getActivePatient()
        .then(function (p) {
          var path = p ? p.path : null;
          if (path !== S.patientPath) {
            S.patient = p;
            S.patientPath = path;
            prefillFromPatient();
            syncInputs();
          }
          compose();
        })
        .catch(function () {
          ctx.showToast("Could not read the active chart.");
        });
    },
  });

  ctx.addRibbonIcon("FilePlus2", "Compose a referral letter", focusComposer);

  ctx.registerEvent("active-note-changed", function () {
    ctx.app
      .getActivePatient()
      .then(function (p) {
        var path = p ? p.path : null;
        var changed = path !== S.patientPath;
        S.patient = p;
        S.patientPath = path;
        if (changed) {
          prefillFromPatient();
          syncInputs();
        }
        renderDynamic();
      })
      .catch(function () {});
  });

  ctx.onunload = function () {
    instances.forEach(function (inst) {
      if (inst.el && inst.el.parentNode) inst.el.parentNode.removeChild(inst.el);
    });
    instances = [];
  };
})(ctx);
