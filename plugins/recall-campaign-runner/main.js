/**
 * FocusCaseX sample plugin — Recall Campaigns.
 *
 * Turns overdue recall patients into a run campaign from the left sidebar:
 *  • Lists patients whose follow-up is past due. Patient files are read
 *    from Database/Patients exactly the way the Optomize sample reads
 *    them — frontmatter identity (type, mr, patient) plus one ```emr-visit
 *    block per visit, changed-value sub-maps included — and the due date
 *    comes from either an explicit dated recall key on the file
 *    (recall-due / recall / next-review / next-visit) or an interval
 *    inside the latest effective Advice text ("Recheck IOP in 4 weeks").
 *  • "Start campaign" snapshots the overdue MRs into one campaign,
 *    { id, startedAt, mrs: [], done: [] }, kept in plugin storage
 *    (ctx.loadData / ctx.saveData).
 *  • "Mark done" moves a patient MR into the campaign's done list; the
 *    Letter action writes a ready-to-send recall letter note into the
 *    Recalls folder (ctx.fs.write) and records the outreach in the
 *    campaign log.
 *  • Progress shows in the section header line and the status bar.
 *
 * Defensive by design: rows missing identity or recall information are
 * skipped, every ctx call is guarded, and nothing leaves the app (no
 * network is used).
 */
(function (ctx) {
  "use strict";

  /* ================================ state =============================== */

  var FOLDER_PATIENTS = "Database/Patients";
  var FOLDER_LETTERS = "Recalls";
  var MAX_FILES = 80;
  var READ_CHUNK = 8;

  var state = { folder: FOLDER_PATIENTS, campaigns: [] };
  var overdue = []; // [{mr, patient, path, due, days, phrase}]
  var instances = []; // every mounted section body (desktop + drawer)
  var scanTimer = null;
  var scanning = false;
  var statusItem = null;

  function todayIso() {
    var d = new Date();
    return (
      d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  function isoOf(d) {
    return (
      d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  function daysBetween(fromIso, toIso) {
    var a = new Date(fromIso + "T00:00:00").getTime();
    var b = new Date(toIso + "T00:00:00").getTime();
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round((b - a) / 86400000);
  }

  /* ---------------------------- persistence ----------------------------- */

  function isMrList(v) {
    return Array.isArray(v) && v.every(function (x) { return typeof x === "string"; });
  }

  /** Adopt only well-formed saved data; anything else falls back to defaults. */
  function sanitizeState(d) {
    if (!d || typeof d !== "object") return;
    if (typeof d.folder === "string" && d.folder.indexOf("/") > 0) state.folder = d.folder;
    if (!Array.isArray(d.campaigns)) return;
    var kept = [];
    for (var i = 0; i < d.campaigns.length; i++) {
      var c = d.campaigns[i];
      if (!c || typeof c !== "object" || typeof c.id !== "string" || !c.id) continue;
      if (!isMrList(c.mrs) || !isMrList(c.done)) continue;
      kept.push({
        id: c.id,
        startedAt: typeof c.startedAt === "string" ? c.startedAt : new Date().toISOString(),
        mrs: c.mrs.slice(),
        done: c.done.slice(),
        log: Array.isArray(c.log)
          ? c.log.filter(function (e) {
              return e && typeof e === "object" &&
                typeof e.mr === "string" && typeof e.action === "string";
            })
          : [],
      });
    }
    state.campaigns = kept;
  }

  function load() {
    try {
      Promise.resolve(ctx.loadData())
        .then(function (d) {
          sanitizeState(d);
          refreshSoon();
          renderAll();
        })
        .catch(function () {});
    } catch (err) {
      console.error("[recall-campaigns] load failed:", err);
    }
  }

  function persist() {
    try {
      Promise.resolve(
        ctx.saveData({ folder: state.folder, campaigns: JSON.parse(JSON.stringify(state.campaigns)) }),
      ).catch(function () {});
    } catch (err) {
      console.error("[recall-campaigns] save failed:", err);
    }
  }

  /* ------------------------- patient file reader ------------------------ */

  function cleanVal(s) {
    return String(s == null ? "" : s).trim().replace(/^"|"$/g, "");
  }

  /** `key: value` reader with one indented sub-map level. */
  function parseSpec(source) {
    var fm = {};
    var lines = String(source || "").split("\n");
    var cur = null;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/\t/g, "  ");
      if (line.trim() === "---") break;
      if (cur !== null && /^\s+\S/.test(line)) {
        var iv = line.indexOf(":");
        if (iv > 0 && fm[cur] && typeof fm[cur] === "object") {
          fm[cur][line.trim().slice(0, iv).trim()] = cleanVal(line.slice(iv + 1));
        }
        continue;
      }
      var ci = line.indexOf(":");
      if (ci > 0) {
        var key = line.slice(0, ci).trim();
        var rest = line.slice(ci + 1);
        if (rest.trim() === "") {
          cur = key;
          fm[key] = {};
        } else {
          fm[key] = cleanVal(rest);
          cur = null;
        }
      }
    }
    return fm;
  }

  function parseFrontmatter(content) {
    var lines = String(content || "").split("\n");
    if (!lines.length || lines[0].trim() !== "---") return {};
    return parseSpec(lines.slice(1).join("\n"));
  }

  function stripFrontmatter(content) {
    var lines = String(content || "").split("\n");
    if (!lines.length || lines[0].trim() !== "---") return String(content || "");
    for (var i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") return lines.slice(i + 1).join("\n");
    }
    return String(content || "");
  }

  /** Top-level ``` code blocks of a note body — the emr-visit records. */
  function scanBlocks(content) {
    var out = [];
    var lines = String(content || "").split("\n");
    var open = null;
    for (var i = 0; i < lines.length; i++) {
      var m = /^\s*```(.*)$/.exec(lines[i]);
      if (m) {
        if (open) {
          out.push({ info: open.info, body: open.body.join("\n") });
          open = null;
        } else {
          open = { info: (m[1] || "").trim(), body: [] };
        }
      } else if (open) {
        open.body.push(lines[i]);
      }
    }
    return out;
  }

  /** The clinical keys this extension cares about. */
  var CLINICAL_KEYS = ["advice", "dx", "recall-due", "recall", "next-review", "next-visit"];

  /** Frontmatter of a legacy per-visit note read as one visit record. */
  function noteAsVisit(fm) {
    var values = {};
    CLINICAL_KEYS.forEach(function (k) {
      if (typeof fm[k] === "string" && fm[k]) values[k] = fm[k];
    });
    return { date: cleanVal(fm.date), base: cleanVal(fm.base) || null, values: values };
  }

  /**
   * Parse one patient file: identity from the frontmatter, visits from the
   * emr-visit blocks (base chains included). Returns null for anything that
   * is not recognizably a patient record.
   */
  function parsePatient(path, content, title) {
    try {
      var fm = parseFrontmatter(content);
      var mr = cleanVal(fm.mr);
      if (!mr) return null;
      var type = cleanVal(fm.type).toLowerCase();
      var visits = [];
      if (type === "optom-visit") {
        var v = noteAsVisit(fm);
        if (v.date || v.values.advice) visits.push(v);
      } else {
        scanBlocks(stripFrontmatter(content)).forEach(function (b) {
          if (b.info !== "emr-visit") return;
          var spec = parseSpec(b.body);
          var values = {};
          CLINICAL_KEYS.forEach(function (k) {
            if (typeof spec[k] === "string" && spec[k]) values[k] = spec[k];
          });
          if (spec.delta && typeof spec.delta === "object") {
            CLINICAL_KEYS.forEach(function (k) {
              if (typeof spec.delta[k] === "string" && spec.delta[k]) values[k] = spec.delta[k];
            });
          }
          var hasSomething = Boolean(spec.date) || Object.keys(values).length > 0;
          if (hasSomething) {
            visits.push({ date: cleanVal(spec.date), base: cleanVal(spec.base) || null, values: values });
          }
        });
      }
      visits.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
      return {
        path: path,
        mr: mr,
        patient: cleanVal(fm.patient) || cleanVal(title) || mr,
        visits: visits,
        recallDue:
          cleanVal(fm["recall-due"]) || cleanVal(fm["recall"]) ||
          cleanVal(fm["next-review"]) || cleanVal(fm["next-visit"]) || "",
      };
    } catch (err) {
      return null; // unreadable or odd file → skip the row
    }
  }

  /* --------------------------- recall engine ---------------------------- */

  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  var RANGE_RE = /(\d+)\s*[-–]\s*\d+\s*(day|week|wk|month|mo|year|yr)/i;
  var INTERVAL_RE = /(\d+)\s*(day|week|wk|month|mo|year|yr)s?/i;

  function addInterval(iso, n, unit) {
    var u = unit.charAt(0).toLowerCase();
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return null;
    if (u === "m") d.setMonth(d.getMonth() + n);
    else if (u === "y") d.setFullYear(d.getFullYear() + n);
    else d.setDate(d.getDate() + (u === "w" ? n * 7 : n));
    return isoOf(d);
  }

  /**
   * Latest visit's effective value — a follow-up that omits a field
   * inherits it from its base visit, so walk the chain (cycle-safe depth).
   */
  function effective(patient, field) {
    if (!patient.visits.length) return "";
    var byDate = {};
    patient.visits.forEach(function (v) {
      if (v.date) byDate[v.date] = v;
    });
    var v = patient.visits[patient.visits.length - 1];
    for (var depth = 0; v && depth < 12; depth++) {
      if (v.values[field]) return v.values[field];
      if (!v.base || !byDate[v.base]) return "";
      v = byDate[v.base];
    }
    return "";
  }

  /**
   * The dated recall for one patient — {due, phrase} or null.
   * Mirrors the app's own recall logic: an explicit dated key wins,
   * otherwise an interval inside the latest advice text is added to the
   * latest visit date. Undated advice is skipped (never invent a date).
   */
  function recallFor(patient) {
    var explicit = patient.recallDue;
    if (!explicit && patient.visits.length) {
      var last = patient.visits[patient.visits.length - 1];
      explicit =
        cleanVal(last.values["recall-due"]) || cleanVal(last.values["recall"]) ||
        cleanVal(last.values["next-review"]) || cleanVal(last.values["next-visit"]) || "";
    }
    if (DATE_RE.test(explicit)) return { due: explicit, phrase: "dated recall in the patient file" };
    var advice = effective(patient, "advice");
    if (!advice || !patient.visits.length) return null;
    var m = RANGE_RE.exec(advice) || INTERVAL_RE.exec(advice);
    if (!m) return null;
    var visitDate = cleanVal(patient.visits[patient.visits.length - 1].date);
    if (!DATE_RE.test(visitDate)) return null;
    var n = parseInt(m[1], 10);
    if (!isFinite(n) || n <= 0) return null;
    var due = addInterval(visitDate, n, m[2]);
    if (!due) return null;
    return { due: due, phrase: advice.trim() };
  }

  /* ------------------------------- access ------------------------------- */

  function hasAccess(folder) {
    try {
      var granted = ctx.fs.folders();
      return Array.isArray(granted) && granted.indexOf(folder || FOLDER_PATIENTS) >= 0;
    } catch (err) {
      return false;
    }
  }

  function ensureAccess() {
    if (hasAccess(FOLDER_PATIENTS) && hasAccess(FOLDER_LETTERS)) return Promise.resolve(true);
    try {
      return Promise.resolve(
        ctx.requestAccess({ folders: [FOLDER_PATIENTS, FOLDER_LETTERS] }),
      )
        .then(function (ok) {
          renderAll();
          return ok === true && hasAccess(FOLDER_PATIENTS);
        })
        .catch(function () {
          return false;
        });
    } catch (err) {
      return Promise.resolve(false);
    }
  }

  /* -------------------------------- scan -------------------------------- */

  function readOne(path) {
    try {
      return Promise.resolve(ctx.fs.read(path)).catch(function () { return null; });
    } catch (err) {
      return Promise.resolve(null);
    }
  }

  function scan() {
    overdue = [];
    if (!hasAccess(FOLDER_PATIENTS)) {
      renderAll();
      return Promise.resolve();
    }
    var files;
    try {
      files = ctx.fs.list(state.folder);
    } catch (err) {
      files = Promise.reject(err);
    }
    scanning = true;
    renderAll();
    return Promise.resolve(files)
      .then(function (list) {
        var rows = (Array.isArray(list) ? list : []).filter(function (f) {
          return f && typeof f.path === "string" && f.path;
        });
        var titles = {};
        var paths = rows.slice(0, MAX_FILES).map(function (f) {
          titles[f.path] = typeof f.title === "string" ? f.title : "";
          return f.path;
        });
        var chunks = [];
        for (var i = 0; i < paths.length; i += READ_CHUNK) {
          chunks.push(paths.slice(i, i + READ_CHUNK));
        }
        var found = [];
        var run = function (k) {
          if (k >= chunks.length) return Promise.resolve();
          return Promise.all(chunks[k].map(readOne)).then(function (contents) {
            chunks[k].forEach(function (p, j) {
              var content = contents[j];
              if (typeof content !== "string" || !content) return;
              var patient = parsePatient(p, content, titles[p]);
              if (patient) found.push(patient);
            });
            return run(k + 1);
          });
        };
        return run(0).then(function () {
          var today = todayIso();
          found.forEach(function (patient) {
            var rec = recallFor(patient);
            if (!rec) return;
            var days = daysBetween(today, rec.due);
            if (days === null || days >= 0) return; // overdue rows only
            overdue.push({
              mr: patient.mr,
              patient: patient.patient,
              path: patient.path,
              due: rec.due,
              days: days,
              phrase: rec.phrase,
            });
          });
          overdue.sort(function (a, b) {
            return a.days - b.days || a.mr.localeCompare(b.mr);
          });
        });
      })
      .catch(function (err) {
        console.error("[recall-campaigns] scan failed:", err);
      })
      .then(function () {
        scanning = false;
        renderAll();
      });
  }

  function refreshSoon() {
    if (scanTimer) return;
    scanTimer = setTimeout(function () {
      scanTimer = null;
      scan();
    }, 250);
  }

  /* ------------------------------- actions ------------------------------ */

  function activeCampaign() {
    return state.campaigns.length ? state.campaigns[state.campaigns.length - 1] : null;
  }

  function startCampaign() {
    ensureAccess()
      .then(function (ok) {
        if (!ok) {
          ctx.showToast("Folder access is needed before a campaign can start.");
          return null;
        }
        return scan().then(function () {
          var mrs = overdue.map(function (r) { return r.mr; });
          if (!mrs.length) {
            ctx.showToast("No overdue recall patients found — nothing to run right now.");
            return null;
          }
          var id =
            "RC-" + todayIso().replace(/-/g, "") + "-" + String(Date.now()).slice(-4);
          state.campaigns.push({
            id: id,
            startedAt: new Date().toISOString(),
            mrs: mrs,
            done: [],
            log: [],
          });
          persist();
          renderAll();
          ctx.showToast(
            "Campaign " + id + " started — " + mrs.length +
              " patient" + (mrs.length === 1 ? "" : "s") + " due.",
          );
        });
      })
      .catch(function (err) {
        console.error("[recall-campaigns] start failed:", err);
      });
  }

  function markDone(mr) {
    var c = activeCampaign();
    if (!c) {
      ctx.showToast("Start a campaign first — overdue patients are listed below.");
      return;
    }
    if (c.done.indexOf(mr) >= 0) return;
    try {
      c.done.push(mr);
      c.log.push({ mr: mr, at: new Date().toISOString(), action: "done" });
      persist();
      renderAll();
      ctx.showToast(
        mr + " marked done — " + c.done.length + " of " + c.mrs.length + " complete.",
      );
    } catch (err) {
      console.error("[recall-campaigns] mark done failed:", err);
    }
  }

  function reopen(mr) {
    var c = activeCampaign();
    if (!c) return;
    var i = c.done.indexOf(mr);
    if (i < 0) return;
    try {
      c.done.splice(i, 1);
      c.log.push({ mr: mr, at: new Date().toISOString(), action: "reopened" });
      persist();
      renderAll();
    } catch (err) {
      console.error("[recall-campaigns] reopen failed:", err);
    }
  }

  function letterPath(mr) {
    var safe = String(mr || "patient").trim().replace(/[^\w.\-]+/g, "-") || "patient";
    return FOLDER_LETTERS + "/" + safe + "-recall-letter.md";
  }

  function writeLetter(row) {
    if (!row || !row.mr) return;
    ensureAccess()
      .then(function (ok) {
        if (!ok) {
          ctx.showToast("Folder access was declined — the letter note was not written.");
          return;
        }
        var lines = [
          "---",
          "title: Recall letter — " + row.patient + " (" + row.mr + ")",
          "---",
          "",
          "# Recall letter — " + row.patient + " (" + row.mr + ")",
          "",
          "Prepared: " + todayIso(),
          "Follow-up was due: " + row.due + " — " + (row.phrase || "advised recall"),
          "",
          "Dear " + row.patient + ",",
          "",
          "Our records show your follow-up visit was due on " + row.due +
            ". Please contact the clinic at your convenience so we can arrange a",
          "suitable appointment time.",
          "",
          "Kind regards,",
          "The clinic team",
          "",
        ];
        var path = letterPath(row.mr);
        Promise.resolve(ctx.fs.write(path, lines.join("\n"), "Recall letter — " + row.patient))
          .then(function (written) {
            if (written) {
              var c = activeCampaign();
              if (c && c.mrs.indexOf(row.mr) >= 0 && Array.isArray(c.log)) {
                c.log.push({ mr: row.mr, at: new Date().toISOString(), action: "letter" });
                persist();
              }
              ctx.showToast("Letter note saved to " + FOLDER_LETTERS + " for " + row.mr + ".");
              renderAll();
            } else {
              ctx.showToast("The letter note could not be written.");
            }
          })
          .catch(function () {
            ctx.showToast("The letter note could not be written.");
          });
      })
      .catch(function (err) {
        console.error("[recall-campaigns] letter failed:", err);
      });
  }

  function openPatient(path) {
    try {
      Promise.resolve(ctx.app.openNote(path)).catch(function () {
        ctx.showToast("That patient file could not be opened.");
      });
    } catch (err) {
      ctx.showToast("That patient file could not be opened.");
    }
  }

  /* --------------------------------- ui --------------------------------- */

  var CSS_ROW =
    "border:1px solid var(--border,var(--sidebar-border,#e2e8f0));border-radius:10px;" +
    "padding:8px 10px;display:flex;flex-direction:column;gap:6px;";
  var CSS_MUTED = "font-size:11px;color:var(--muted-foreground);";
  var CSS_BTN =
    "border:1px solid var(--border,var(--sidebar-border,#e2e8f0));background:transparent;" +
    "color:inherit;border-radius:8px;padding:3px 10px;font-size:11px;cursor:pointer;";
  var CSS_BTN_PRIMARY =
    "border:1px solid transparent;background:var(--primary,#5b21b6);color:var(--primary-foreground,#fff);" +
    "border-radius:8px;padding:4px 12px;font-size:12px;font-weight:600;cursor:pointer;";

  function button(label, style, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.cssText = style;
    b.addEventListener("click", function (ev) {
      ev.preventDefault();
      try {
        onClick();
      } catch (err) {
        console.error("[recall-campaigns] action failed:", err);
      }
    });
    return b;
  }

  function rowTitle(row) {
    var box = document.createElement("div");
    box.style.cssText = "display:flex;align-items:baseline;justify-content:space-between;gap:8px;";
    var name = document.createElement("span");
    name.style.cssText = "font-size:13px;font-weight:600;color:var(--foreground);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
    name.textContent = row.patient + " · " + row.mr;
    var due = document.createElement("span");
    due.style.cssText =
      "font-size:10px;font-weight:700;border-radius:999px;padding:2px 8px;white-space:nowrap;" +
      "background:rgba(239,68,68,0.12);color:rgb(239,68,68);";
    var n = Math.abs(row.days);
    due.textContent = String(n) + " day" + (n === 1 ? "" : "s") + " overdue";
    box.appendChild(name);
    box.appendChild(due);
    return box;
  }

  function rowSub(row) {
    var sub = document.createElement("div");
    sub.style.cssText = CSS_MUTED + "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
    sub.textContent = "Due " + row.due + " — " + (row.phrase || "advised recall");
    sub.title = sub.textContent;
    return sub;
  }

  function rowButtons(row) {
    var bar = document.createElement("div");
    bar.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;";
    bar.appendChild(button("Mark done", CSS_BTN, function () { markDone(row.mr); }));
    bar.appendChild(button("Letter note", CSS_BTN, function () { writeLetter(row); }));
    bar.appendChild(button("Open", CSS_BTN, function () { openPatient(row.path); }));
    return bar;
  }

  function renderRow(host, row) {
    var box = document.createElement("div");
    box.style.cssText = CSS_ROW;
    box.appendChild(rowTitle(row));
    box.appendChild(rowSub(row));
    box.appendChild(rowButtons(row));
    host.appendChild(box);
  }

  function renderDoneBox(inst, campaign) {
    inst.doneBox.textContent = "";
    inst.doneBox.style.display = campaign && campaign.done.length > 0 ? "flex" : "none";
    if (!campaign || !campaign.done.length) return;
    var head = document.createElement("div");
    head.style.cssText = "font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted-foreground);";
    head.textContent = "Completed in " + campaign.id;
    inst.doneBox.appendChild(head);
    campaign.done.forEach(function (mr) {
      var line = document.createElement("div");
      line.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px dashed var(--border,var(--sidebar-border,#e2e8f0));border-radius:8px;padding:5px 8px;";
      var label = document.createElement("span");
      label.style.cssText = "font-size:12px;color:var(--muted-foreground);";
      label.textContent = mr;
      var side = document.createElement("span");
      side.style.cssText = "display:flex;align-items:center;gap:8px;";
      var check = document.createElement("span");
      check.style.cssText = "font-size:11px;color:var(--accent-live,#34d399);font-weight:700;";
      check.textContent = "done";
      side.appendChild(check);
      side.appendChild(button("Reopen", CSS_BTN, function () { reopen(mr); }));
      line.appendChild(label);
      line.appendChild(side);
      inst.doneBox.appendChild(line);
    });
  }

  function progressText() {
    var c = activeCampaign();
    if (c) return c.id + " · " + c.done.length + " of " + c.mrs.length + " done";
    var n = overdue.length;
    return n
      ? n + " overdue patient" + (n === 1 ? "" : "s") + " — no campaign running"
      : "No overdue recalls — all caught up";
  }

  function renderInstance(inst) {
    if (!inst || !inst.el) return;
    var ok = hasAccess(FOLDER_PATIENTS);
    inst.accessRow.style.display = ok ? "none" : "flex";
    inst.progress.textContent = progressText();
    inst.list.textContent = "";
    if (!ok) {
      var hint = document.createElement("p");
      hint.style.cssText = "font-size:12px;color:var(--muted-foreground);padding:2px 0;margin:0;";
      hint.textContent = "Grant access to the patient records folder to see overdue recalls.";
      inst.list.appendChild(hint);
    } else if (scanning) {
      var busy = document.createElement("p");
      busy.style.cssText = "font-size:12px;color:var(--muted-foreground);padding:2px 0;margin:0;";
      busy.textContent = "Reading patient files…";
      inst.list.appendChild(busy);
    } else if (!overdue.length) {
      var calm = document.createElement("p");
      calm.style.cssText = "font-size:12px;color:var(--muted-foreground);padding:2px 0;margin:0;";
      calm.textContent = "No overdue recall patients right now.";
      inst.list.appendChild(calm);
    } else {
      var c = activeCampaign();
      overdue.forEach(function (row) {
        if (c && c.done.indexOf(row.mr) >= 0) return; // finished rows live in the done box
        renderRow(inst.list, row);
      });
    }
    renderDoneBox(inst, activeCampaign());
  }

  function renderAll() {
    for (var i = 0; i < instances.length; i++) {
      try {
        renderInstance(instances[i]);
      } catch (err) {
        console.error("[recall-campaigns] render failed:", err);
      }
    }
    updateStatus();
  }

  function updateStatus() {
    if (!statusItem) return;
    try {
      var c = activeCampaign();
      statusItem.setText(c ? "Recalls: " + c.done.length + "/" + c.mrs.length + " done" : "");
    } catch (err) {
      /* status text is cosmetic — never raise */
    }
  }

  function buildSection(host) {
    var wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:8px;padding:4px 2px 8px;";

    var head = document.createElement("div");
    head.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;";
    var progress = document.createElement("span");
    progress.style.cssText = CSS_MUTED + "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
    head.appendChild(progress);
    head.appendChild(button("Start campaign", CSS_BTN_PRIMARY, startCampaign));
    wrap.appendChild(head);

    var accessRow = document.createElement("div");
    accessRow.style.cssText = "display:none;align-items:center;justify-content:space-between;gap:8px;border:1px solid var(--border,var(--sidebar-border,#e2e8f0));border-radius:10px;padding:8px 10px;";
    var accessText = document.createElement("span");
    accessText.style.cssText = CSS_MUTED;
    accessText.textContent = "Patient records access is off.";
    accessRow.appendChild(accessText);
    accessRow.appendChild(button("Grant access", CSS_BTN, function () { ensureAccess().then(refreshSoon); }));
    wrap.appendChild(accessRow);

    var list = document.createElement("div");
    list.style.cssText = "display:flex;flex-direction:column;gap:6px;";
    wrap.appendChild(list);

    var doneBox = document.createElement("div");
    doneBox.style.cssText = "display:none;flex-direction:column;gap:6px;padding-top:2px;";
    wrap.appendChild(doneBox);

    host.appendChild(wrap);
    return { el: wrap, progress: progress, accessRow: accessRow, list: list, doneBox: doneBox };
  }

  /* ---------------------------- registrations --------------------------- */

  ctx.registerSidebarSection({
    id: "recall-campaigns",
    title: "Recall Campaigns",
    icon: "CalendarDays",
    order: 30,
    mount: function (host) {
      var inst = buildSection(host);
      instances.push(inst);
      renderInstance(inst);
      refreshSoon();
    },
    destroy: function () {
      // React removed a section body — drop its instance; other mounts stay
      var remaining = [];
      var removedAny = false;
      instances.forEach(function (inst) {
        if (inst.el && inst.el.isConnected) remaining.push(inst);
        else removedAny = true;
      });
      if (!removedAny && remaining.length > 0) {
        var last = remaining.pop(); // fallback: LIFO
        if (last.el && last.el.parentNode) last.el.parentNode.removeChild(last.el);
      }
      instances = remaining;
    },
  });

  ctx.registerCommand({
    id: "start-recall-campaign",
    title: "Recall Campaigns: start a campaign from overdue patients",
    icon: "CalendarDays",
    run: startCampaign,
  });

  try {
    statusItem = ctx.addStatusBarItem();
  } catch (err) {
    statusItem = null;
  }

  ctx.registerEvent("vault-changed", refreshSoon);

  load();
  refreshSoon();

  ctx.onunload = function () {
    if (scanTimer) {
      clearTimeout(scanTimer);
      scanTimer = null;
    }
    instances.forEach(function (inst) {
      if (inst.el && inst.el.parentNode) inst.el.parentNode.removeChild(inst.el);
    });
    instances = [];
    try {
      if (statusItem) statusItem.setText("");
    } catch (err) {
      /* keep unloading quietly */
    }
  };
})(ctx);
