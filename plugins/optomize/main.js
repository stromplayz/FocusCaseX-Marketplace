/**
 * FocusCaseX sample plugin — Optomize.
 *
 * Optometry EMR suite that lives in the left sidebar (registerSidebarSection):
 *  • Compose markdown-based case files for optometry (VA, IOP, refraction, H/O, Dx, advice).
 *  • ONE PATIENT = ONE FILE — every visit is appended to the same markdown
 *    file (Database/Patients/<MR>.md) as a ```emr-visit block, so charts
 *    never scatter across notes and the Database/Base stays one row per patient.
 *  • Delta encoding — a follow-up visit stores ONLY what changed
 *    (`∆iop:OD=16`, `∆va:OS=6/9`) plus a `base:` link to the prior visit
 *    date inside that file; everything else resolves at read time, so more
 *    visits fit in less storage.
 *  • Pattern matching — when a new patient's values match an existing
 *    patient, the composer finds the best matched pair and writes
 *    `pattern: MR-0997` + only the real differences (`∆H/O: -DM`).
 *  • Seeds the "Patients" Base over the Database folder on first save.
 */
(function (ctx) {
  "use strict";

  /* ============================== settings ============================== */

  var cfg = { folder: "Database/Patients", autoPattern: true, threshold: 0.65, baseCreated: false };
  ctx
    .loadData()
    .then(function (d) {
      if (d && typeof d === "object") {
        if (typeof d.folder === "string" && d.folder) cfg.folder = d.folder;
        if (typeof d.autoPattern === "boolean") cfg.autoPattern = d.autoPattern;
        if (typeof d.threshold === "number") cfg.threshold = d.threshold;
        if (d.baseCreated === true) cfg.baseCreated = true;
      }
      // migrate installs saved with the legacy per-visit clinic folder
      if (cfg.folder === "clinic" || cfg.folder === "clinic/Patients") {
        cfg.folder = "Database/Patients";
        persistCfg();
      }
      refreshIndex();
    })
    .catch(function () {});

  function persistCfg() {
    ctx.saveData(JSON.parse(JSON.stringify(cfg))).catch(function () {});
  }

  /* ============================ field registry =========================== */

  var VA_OPTIONS = ["6/6", "6/9", "6/12", "6/18", "6/24", "6/36", "6/60", "CF", "HM", "PL", "NPL"];

  /** kind: va | num(range) | text — used by the composer and the scorer. */
  var FIELDS = [
    { id: "va_od", label: "VA OD", short: "va:OD", kind: "va", w: 0.17, group: "vision" },
    { id: "va_os", label: "VA OS", short: "va:OS", kind: "va", w: 0.17, group: "vision" },
    { id: "iop_od", label: "IOP OD", short: "iop:OD", kind: "num:8", w: 0.13, group: "vision", unit: "mmHg" },
    { id: "iop_os", label: "IOP OS", short: "iop:OS", kind: "num:8", w: 0.13, group: "vision", unit: "mmHg" },
    { id: "sph_od", label: "SPH OD", short: "sph:OD", kind: "num:4", w: 0.04, group: "rx" },
    { id: "cyl_od", label: "CYL OD", short: "cyl:OD", kind: "num:4", w: 0.03, group: "rx" },
    { id: "axis_od", label: "AXIS OD", short: "axis:OD", kind: "num:60", w: 0.02, group: "rx" },
    { id: "sph_os", label: "SPH OS", short: "sph:OS", kind: "num:4", w: 0.04, group: "rx" },
    { id: "cyl_os", label: "CYL OS", short: "cyl:OS", kind: "num:4", w: 0.03, group: "rx" },
    { id: "axis_os", label: "AXIS OS", short: "axis:OS", kind: "num:60", w: 0.02, group: "rx" },
    { id: "hx", label: "H/O (history)", short: "H/O", kind: "text", w: 0.17, group: "text" },
    { id: "dx", label: "Dx (diagnosis)", short: "Dx", kind: "text", w: 0.05, group: "text" },
    { id: "advice", label: "Advice", short: "Advice", kind: "text", w: 0.04, group: "text" },
  ];
  var FIELD_BY_ID = {};
  FIELDS.forEach(function (f) {
    FIELD_BY_ID[f.id] = f;
  });

  /* ============================= EMR engine ============================== */

  function cleanVal(s) {
    return String(s == null ? "" : s).trim().replace(/^"|"$/g, "");
  }

  /** `key: value` reader with one nested-map level (frontmatter/visit blocks). */
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

  /** Minimal frontmatter reader (delegates to the generic spec parser). */
  function parseFrontmatter(content) {
    var lines = String(content || "").split("\n");
    if (!lines.length || lines[0].trim() !== "---") return {};
    // skip the opening fence; parseSpec stops at the closing one
    return parseSpec(lines.slice(1).join("\n"));
  }

  /** Body without the leading frontmatter block. */
  function stripFrontmatter(content) {
    var lines = String(content || "").split("\n");
    if (!lines.length || lines[0].trim() !== "---") return String(content || "");
    for (var i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") return lines.slice(i + 1).join("\n");
    }
    return String(content || "");
  }

  /** Top-level ``` fences of a markdown body (nested fences are body text). */
  function scanFences(content) {
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

  /** Parse one ```emr-visit block body into date/base/pattern/values/delta. */
  function parseEmrVisitSpec(body) {
    var fm = parseSpec(body);
    var values = {};
    var delta = {};
    FIELDS.forEach(function (f) {
      if (typeof fm[f.id] === "string" && fm[f.id] !== "") values[f.id] = String(fm[f.id]);
    });
    if (fm.delta && typeof fm.delta === "object") {
      FIELDS.forEach(function (f) {
        if (fm.delta[f.id] !== undefined && fm.delta[f.id] !== "") delta[f.id] = String(fm.delta[f.id]);
      });
    }
    return {
      date: String(fm.date || "").trim(),
      base: fm.base ? String(fm.base) : null,
      pattern: fm.pattern ? String(fm.pattern) : null,
      match: fm.match ? String(fm.match) : null,
      values: values,
      delta: delta,
    };
  }

  /**
   * Parse one patient file (type: optom-patient) into identity + visits —
   * every ```emr-visit block in the body becomes a visit record keyed
   * `<file>#<date>`.
   */
  function parseEmrPatient(path, content) {
    var fm = parseFrontmatter(content);
    if (String(fm.type || "") !== "optom-patient" || !fm.mr) return null;
    var visits = [];
    var seen = {};
    scanFences(stripFrontmatter(content)).forEach(function (fence) {
      if (fence.info !== "emr-visit") return;
      var spec = parseEmrVisitSpec(fence.body);
      if (!spec.date && !spec.base && !spec.pattern) {
        var empty = Object.keys(spec.values).length === 0 && Object.keys(spec.delta).length === 0;
        if (empty) return;
      }
      var key = spec.date || String(visits.length);
      seen[key] = (seen[key] || 0) + 1;
      visits.push({
        path: seen[key] > 1 ? path + "#" + key + "#" + seen[key] : path + "#" + key,
        file: path,
        mr: String(fm.mr),
        patient: String(fm.patient || ""),
        age: fm.age ? String(fm.age) : undefined,
        sex: fm.sex ? String(fm.sex) : undefined,
        date: spec.date,
        base: spec.base,
        pattern: spec.pattern,
        match: spec.match,
        values: spec.values,
        delta: spec.delta,
      });
    });
    return { mr: String(fm.mr), visits: visits };
  }

  /** Parse one legacy per-visit note (type: optom-visit) — still resolved. */
  function parseEmrNote(path, content) {
    var fm = parseFrontmatter(content);
    if (String(fm.type || "") !== "optom-visit" || !fm.mr) return null;
    var values = {};
    var delta = {};
    FIELDS.forEach(function (f) {
      if (fm[f.id] !== undefined && fm[f.id] !== "") values[f.id] = String(fm[f.id]);
    });
    if (fm.delta && typeof fm.delta === "object") {
      FIELDS.forEach(function (f) {
        if (fm.delta[f.id] !== undefined && fm.delta[f.id] !== "") delta[f.id] = String(fm.delta[f.id]);
      });
    }
    return {
      path: path,
      file: null,
      mr: String(fm.mr),
      patient: String(fm.patient || ""),
      age: fm.age ? String(fm.age) : undefined,
      sex: fm.sex ? String(fm.sex) : undefined,
      date: String(fm.date || ""),
      base: fm.base ? String(fm.base) : null,
      pattern: fm.pattern ? String(fm.pattern) : null,
      match: fm.match ? String(fm.match) : null,
      values: values,
      delta: delta,
    };
  }

  /* ------------------------------ resolution ------------------------------ */

  /** Fully resolve a visit by walking base/pattern chains (cycle-safe). */
  function resolveVisit(v, depth) {
    depth = depth || 0;
    if (!v) return null;
    var resolved = {};
    var chain = [];
    if (depth < 12) {
      if (v.base) {
        var parent = index.byPath[v.base] || null;
        if (!parent && v.file && index.byFile[v.file]) {
          // patient-file visits inherit by DATE within the same file
          index.byFile[v.file].forEach(function (cand) {
            if (cand.date === v.base && cand.path !== v.path) parent = cand;
          });
        }
        var pr = resolveVisit(parent, depth + 1);
        if (pr && parent) {
          resolved = Object.assign({}, pr.values);
          chain = pr.chain.concat([parent]);
        }
      } else if (v.pattern) {
        var donor = latestVisitOfMr(v.pattern, v.path);
        var dr = resolveVisit(donor, depth + 1);
        if (dr && donor) {
          resolved = Object.assign({}, dr.values);
          chain = dr.chain.concat([donor]);
        }
      }
    }
    Object.keys(v.values).forEach(function (k) {
      resolved[k] = v.values[k];
    });
    Object.keys(v.delta).forEach(function (k) {
      resolved[k] = v.delta[k];
    });
    return { values: resolved, chain: chain.filter(Boolean) };
  }

  function latestVisitOfMr(mr, excludePath) {
    var list = (index.byMr[mr] || []).filter(function (v) {
      return v.path !== excludePath;
    });
    if (!list.length) return null;
    return list.slice().sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date)) || String(b.path).localeCompare(String(a.path));
    })[0];
  }

  /* ------------------------------- scoring ------------------------------- */

  function vaNum(s) {
    s = String(s == null ? "" : s).toUpperCase();
    var m = s.match(/^6\s*\/\s*(\d+)$/);
    if (m) return Number(m[1]);
    return { CF: 75, HM: 90, PL: 110, NPL: 130 }[s] || null;
  }

  function fieldScore(f, a, b) {
    a = a == null ? "" : String(a);
    b = b == null ? "" : String(b);
    if (!a && !b) return null;
    if (f.kind === "va") {
      var x = vaNum(a);
      var y = vaNum(b);
      if (x == null && y == null) return a === b ? 1 : null;
      if (x == null || y == null) return 0.3;
      return 1 - Math.min(Math.abs(x - y) / 48, 1);
    }
    if (f.kind && f.kind.indexOf("num:") === 0) {
      var range = Number(f.kind.slice(4)) || 1;
      var na = parseFloat(a);
      var nb = parseFloat(b);
      if (isNaN(na) && isNaN(nb)) return null;
      if (isNaN(na) || isNaN(nb)) return 0.3;
      return 1 - Math.min(Math.abs(na - nb) / range, 1);
    }
    // text — jaccard over word tokens
    var ta = a.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    var tb = b.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    if (!ta.length && !tb.length) return null;
    var setA = {};
    ta.forEach(function (t) {
      setA[t] = true;
    });
    var inter = 0;
    tb.forEach(function (t) {
      if (setA[t]) inter++;
    });
    var union = {};
    ta.concat(tb).forEach(function (t) {
      union[t] = true;
    });
    var u = Object.keys(union).length;
    return u ? inter / u : 1;
  }

  /** Weighted similarity of two resolved value maps (0..1). */
  function similarity(valuesA, valuesB) {
    var sum = 0;
    var wsum = 0;
    FIELDS.forEach(function (f) {
      var s = fieldScore(f, valuesA[f.id], valuesB[f.id]);
      if (s == null) return;
      sum += f.w * s;
      wsum += f.w;
    });
    return wsum ? sum / wsum : 0;
  }

  /** Human list of fields that differ between two resolved maps. */
  function diffFields(valuesA, valuesB) {
    var out = [];
    FIELDS.forEach(function (f) {
      var a = String(valuesA[f.id] == null ? "" : valuesA[f.id]).trim();
      var b = String(valuesB[f.id] == null ? "" : valuesB[f.id]).trim();
      if (a && b && a !== b) out.push(f.label);
    });
    return out;
  }

  /**
   * Find the best matched pair for the composer's current values among all
   * OTHER patients' visits. Returns { visit, score, diffs, resolved } or null.
   */
  function findBestMatch(targetValues, excludeMr) {
    var best = null;
    Object.keys(index.byMr).forEach(function (mr) {
      if (excludeMr && mr === excludeMr) return;
      (index.byMr[mr] || []).forEach(function (v) {
        var r = resolveVisit(v);
        if (!r) return;
        var score = similarity(targetValues, r.values);
        if (!best || score > best.score) {
          best = { visit: v, score: score, resolved: r, donorMr: mr };
        }
      });
    });
    if (!best) return null;
    return {
      visit: best.visit,
      donorMr: best.donorMr,
      score: best.score,
      resolved: best.resolved,
      diffs: diffFields(targetValues, best.resolved.values),
    };
  }

  /* --------------------------- delta generation --------------------------- */

  /** Fields whose value changed vs the inherited record (touched only). */
  function encodeDelta(current, inherited, touched) {
    var delta = {};
    var unchanged = 0;
    FIELDS.forEach(function (f) {
      var c = String(current[f.id] == null ? "" : current[f.id]).trim();
      var p = String(inherited[f.id] == null ? "" : inherited[f.id]).trim();
      if (!c) return; // empty stays inherited
      if (!touched[f.id]) return;
      if (c !== p) delta[f.id] = c;
      else unchanged++;
    });
    return { delta: delta, unchanged: unchanged };
  }

  function deltaLine(fieldId, value) {
    var f = FIELD_BY_ID[fieldId];
    return "∆" + (f ? f.short : fieldId) + "=" + value;
  }

  /* ------------------------- markdown renderers -------------------------- */

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /** Path-safe MR segment for the patient file name. */
  function sanitizeMr(mr) {
    return String(mr || "MR-?").trim().replace(/[^\w.\- ]+/g, "-").replace(/\s+/g, "-") || "MR-?";
  }

  /** The patient file path for one MR (single file per patient). */
  function patientPath(mr) {
    return cfg.folder + "/" + sanitizeMr(mr) + ".md";
  }

  /** Render the ```emr-visit block that stores one visit. */
  function renderVisitBlockMd(rec) {
    var lines = ["```emr-visit", "date: " + rec.date];
    if (rec.pattern) {
      lines.push("pattern: " + rec.pattern);
      if (rec.match) lines.push("match: " + rec.match);
    } else if (rec.base) {
      lines.push("base: " + rec.base);
    }
    if (rec.pattern || rec.base) {
      var deltaKeys = Object.keys(rec.delta || {});
      if (deltaKeys.length) {
        lines.push("delta:");
        deltaKeys.forEach(function (k) {
          lines.push("  " + k + ": " + rec.delta[k]);
        });
      }
    } else {
      FIELDS.forEach(function (f) {
        var v = String(rec.values[f.id] == null ? "" : rec.values[f.id]).trim();
        if (v) lines.push(f.id + ": " + v);
      });
    }
    lines.push("```");
    return lines.join("\n");
  }

  /** Render a NEW patient file: identity frontmatter + first visit section. */
  function renderPatientFile(rec, identity) {
    var fm = ["type: optom-patient", "mr: " + rec.mr, "patient: " + (identity.patient || rec.patient || "—")];
    if (identity.age) fm.push("age: " + identity.age);
    if (identity.sex) fm.push("sex: " + identity.sex);
    var mode = rec.pattern ? " · pattern " + rec.pattern : rec.base ? " · ∆ visit" : " · baseline";
    return (
      "---\n" + fm.join("\n") + "\n---\n\n" +
      "# " + (identity.patient || rec.patient || rec.mr) + " · " + rec.mr + "\n\n" +
      "## Visits\n\n" +
      "### " + rec.date + mode + "\n\n" +
      renderVisitBlockMd(rec) + "\n\n" +
      (rec.pattern
        ? "> Every value inherits from patient **" + rec.pattern + "** — only the delta above is stored."
        : rec.base
          ? "> Everything else resolves from the " + rec.base + " visit at read time (Optomize ∆)."
          : "> Full baseline — follow-up visits will ∆-link here.") +
      "\n\n#clinic\n"
    );
  }

  /** Age/sex to write into a new patient file (inherited when available). */
  function patientIdentity(rec) {
    var age = "";
    var sex = "";
    if (S.pattern && S.pattern.mr) {
      var donors = index.byMr[S.pattern.mr] || [];
      var d = donors[donors.length - 1];
      if (d) {
        age = d.age || "";
        sex = d.sex || "";
      }
    }
    var patient = S.patient || (function () {
      var own = index.byMr[rec.mr] || [];
      var o = own[own.length - 1];
      return o ? o.patient || "" : "";
    })();
    return { patient: patient, age: age, sex: sex };
  }

  function byteLen(s) {
    return new TextEncoder().encode(s).length;
  }

  /* ================================ index ================================ */

  var index = { byPath: {}, byMr: {}, byFile: {}, files: {}, count: 0, loading: false };

  function isEmrPath(path) {
    return path.indexOf(cfg.folder + "/") === 0 && /\.md$/i.test(path);
  }

  function refreshIndex() {
    if (index.loading) return;
    index.loading = true;
    ctx.app
      .getNotes()
      .then(function (notes) {
        var emrPaths = notes.map(function (n) {
          return n.path;
        }).filter(isEmrPath);
        return Promise.all(
          emrPaths.map(function (p) {
            return ctx.app
              .getNoteContent(p)
              .then(function (content) {
                if (!content) return [];
                var patient = parseEmrPatient(p, content);
                if (patient) return patient.visits;
                var legacy = parseEmrNote(p, content);
                return legacy ? [legacy] : [];
              })
              .catch(function () {
                return [];
              });
          }),
        );
      })
      .then(function (batches) {
        var records = [];
        batches.forEach(function (batch) {
          batch.forEach(function (r) {
            records.push(r);
          });
        });
        var byPath = {};
        var byMr = {};
        var byFile = {};
        var files = {};
        records.forEach(function (r) {
          byPath[r.path] = r;
          (byMr[r.mr] = byMr[r.mr] || []).push(r);
          if (r.file) {
            files[r.file] = true;
            (byFile[r.file] = byFile[r.file] || []).push(r);
          }
        });
        var byDate = function (a, b) {
          return String(a.date).localeCompare(String(b.date)) || String(a.path).localeCompare(String(b.path));
        };
        Object.keys(byMr).forEach(function (mr) {
          byMr[mr].sort(byDate);
        });
        Object.keys(byFile).forEach(function (file) {
          byFile[file].sort(byDate);
        });
        index.byPath = byPath;
        index.byMr = byMr;
        index.byFile = byFile;
        index.files = files;
        index.count = records.length;
        index.loading = false;
        renderDynamic();
      })
      .catch(function () {
        index.loading = false;
      });
  }

  var refreshTimer = null;
  function scheduleRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshIndex, 800);
  }

  /* ============================ composer state ============================ */

  var S = {
    mr: "",
    patient: "",
    date: todayStr(),
    values: {}, // current field values (id -> string)
    touched: {}, // fields the user actually edited
    base: null, // visit record inherited from (same MR)
    baseResolved: null,
    pattern: null, // { mr, score, donorDate } cross-patient clone
    match: null, // last find-match result (pre-use)
  };

  function resetComposer(keepMr) {
    var mr = keepMr ? S.mr : "";
    S.mr = mr;
    S.patient = "";
    S.date = todayStr();
    S.values = {};
    S.touched = {};
    S.base = null;
    S.baseResolved = null;
    S.pattern = null;
    S.match = null;
    syncInputs();
    renderDynamic();
  }

  /** Load (or re-load) the selected patient: inherits their latest visit. */
  function loadPatient(mr) {
    S.pattern = null;
    S.match = null;
    var visits = index.byMr[mr] || [];
    if (!visits.length) {
      S.base = null;
      S.baseResolved = null;
      // keep whatever the user typed
      renderDynamic();
      return;
    }
    var last = visits[visits.length - 1];
    S.base = last;
    S.baseResolved = resolveVisit(last);
    S.values = Object.assign({}, S.baseResolved ? S.baseResolved.values : {});
    S.touched = {};
    syncInputs();
    renderDynamic();
  }

  /* ================================ UI ================================= */

  /**
   * The composer can be mounted several times at once (desktop sidebar +
   * mobile drawer). Composer STATE (S) is shared; each mount gets its own
   * DOM tree in `instances` and every render refreshes all of them.
   */
  var instances = []; // { el, els, inputs, mrInput, nameInput, dateInput, seq }
  var seqCounter = 0;

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

  function fieldGrid() {
    var g = document.createElement("div");
    g.style.cssText = "display:grid;grid-template-columns:64px 1fr 1fr;gap:6px;align-items:center;";
    return g;
  }

  function buildInstance(host) {
    /* remount into the same host (e.g. StrictMode-style double effects):
       drop the previous tree first so trees never pile up */
    while (host.firstChild) host.removeChild(host.firstChild);

    var inst = { el: null, els: {}, inputs: {}, mrInput: null, nameInput: null, dateInput: null, seq: ++seqCounter };
    var el = document.createElement("div");
    el.style.cssText = "display:flex;flex-direction:column;gap:9px;padding:6px 2px 10px;font-size:12.5px;color:" + C.fg + ";min-width:0;";
    inst.el = el;

    /* --- patient block --- */
    el.appendChild(sectionLabel("Patient"));
    var mrWrap = document.createElement("div");
    mrWrap.style.cssText = "display:flex;gap:6px;";
    var mrInput = mkInput("MR number (e.g. MR-1042)", null);
    mrInput.setAttribute("list", "fcx-optomize-mrs-" + inst.seq);
    mrInput.addEventListener("input", function () {
      S.mr = mrInput.value.trim();
      schedulePreview();
    });
    mrInput.addEventListener("change", function () {
      S.mr = mrInput.value.trim();
      loadPatient(S.mr);
    });
    mrWrap.appendChild(mrInput);
    inst.mrInput = mrInput;
    var datalist = document.createElement("datalist");
    datalist.id = "fcx-optomize-mrs-" + inst.seq;
    inst.els.datalist = datalist;
    mrWrap.appendChild(datalist);
    el.appendChild(mrWrap);

    var nameInput = mkInput("Patient name", function () {
      S.patient = nameInput.value.trim();
      schedulePreview();
    });
    inst.nameInput = nameInput;
    el.appendChild(nameInput);

    var dateRow = document.createElement("div");
    dateRow.style.cssText = "display:flex;align-items:center;gap:6px;";
    var dateLab = h("span", "font-size:11px;color:" + C.dim + ";flex:0 0 auto;", "Visit date");
    var dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.value = S.date;
    dateInput.style.cssText = INPUT_CSS;
    dateInput.addEventListener("change", function () {
      S.date = dateInput.value || todayStr();
      schedulePreview();
    });
    inst.dateInput = dateInput;
    dateRow.appendChild(dateLab);
    dateRow.appendChild(dateInput);
    el.appendChild(dateRow);

    /* --- status banner (dynamic) --- */
    inst.els.banner = h("div", "display:none;flex-direction:column;gap:6px;padding:8px 9px;border-radius:10px;background:" + C.soft + ";border:1px solid " + C.border + ";");
    el.appendChild(inst.els.banner);

    /* --- vision: VA + IOP --- */
    el.appendChild(sectionLabel("Vision & pressure"));
    var visGrid = fieldGrid();
    visGrid.appendChild(h("div", "font-size:11px;color:" + C.dim, ""));
    visGrid.appendChild(h("div", "font-size:10.5px;font-weight:700;text-align:center;color:" + C.dim, "OD"));
    visGrid.appendChild(h("div", "font-size:10.5px;font-weight:700;text-align:center;color:" + C.dim, "OS"));
    ["va", "iop"].forEach(function (prefix) {
      var f1 = FIELD_BY_ID[prefix + "_od"];
      var f2 = FIELD_BY_ID[prefix + "_os"];
      visGrid.appendChild(h("div", "font-size:11px;color:" + C.dim, prefix === "va" ? "VA" : "IOP"));
      [f1, f2].forEach(function (f) {
        var input;
        if (f.kind === "va") {
          input = document.createElement("select");
          input.style.cssText = INPUT_CSS;
          var opt0 = document.createElement("option");
          opt0.value = "";
          opt0.textContent = "—";
          input.appendChild(opt0);
          VA_OPTIONS.forEach(function (o) {
            var opt = document.createElement("option");
            opt.value = o;
            opt.textContent = o;
            input.appendChild(opt);
          });
          input.addEventListener("change", function () {
            onFieldInput(f.id, input.value);
          });
        } else {
          input = mkInput("—", function () {
            onFieldInput(f.id, input.value);
          });
          input.type = "number";
          input.step = "any";
          input.placeholder = "mmHg";
        }
        inst.inputs[f.id] = input;
        visGrid.appendChild(input);
      });
    });
    el.appendChild(visGrid);

    /* --- refraction (collapsed) --- */
    var rxDetails = document.createElement("details");
    rxDetails.style.cssText = "border:1px solid " + C.border + ";border-radius:10px;padding:6px 8px;";
    var rxSummary = h("summary", "cursor:pointer;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:" + C.dim + ";user-select:none;", "Refraction (optional)");
    rxDetails.appendChild(rxSummary);
    var rxGrid = fieldGrid();
    rxGrid.appendChild(h("div", "", ""));
    rxGrid.appendChild(h("div", "font-size:10.5px;font-weight:700;text-align:center;color:" + C.dim, "OD"));
    rxGrid.appendChild(h("div", "font-size:10.5px;font-weight:700;text-align:center;color:" + C.dim, "OS"));
    ["sph", "cyl", "axis"].forEach(function (prefix) {
      var f1 = FIELD_BY_ID[prefix + "_od"];
      var f2 = FIELD_BY_ID[prefix + "_os"];
      rxGrid.appendChild(h("div", "font-size:11px;color:" + C.dim, prefix.toUpperCase()));
      [f1, f2].forEach(function (f) {
        var input = mkInput("—", function () {
          onFieldInput(f.id, input.value);
        });
        input.type = "number";
        input.step = "any";
        inst.inputs[f.id] = input;
        rxGrid.appendChild(input);
      });
    });
    rxDetails.appendChild(rxGrid);
    el.appendChild(rxDetails);

    /* --- history / dx / advice --- */
    ["hx", "dx", "advice"].forEach(function (id) {
      var f = FIELD_BY_ID[id];
      el.appendChild(sectionLabel(f.label));
      var area = document.createElement("textarea");
      area.style.cssText = AREA_CSS;
      area.placeholder = id === "hx" ? "e.g. -DM since 2019, no HTN" : id === "dx" ? "e.g. POAG OU" : "e.g. Timolol BD OU · review 6 weeks";
      area.spellcheck = false;
      area.addEventListener("focus", focusAccent);
      area.addEventListener("blur", blurAccent);
      area.addEventListener("input", function () {
        onFieldInput(id, area.value);
      });
      inst.inputs[id] = area;
      el.appendChild(area);
    });

    /* --- pattern match panel --- */
    var matchHead = document.createElement("div");
    matchHead.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:6px;";
    matchHead.appendChild(sectionLabel("Similar patient"));
    var findBtn = mkBtn("Find match", { onClick: runFindMatch, h: 26 });
    matchHead.appendChild(findBtn);
    el.appendChild(matchHead);
    inst.els.match = h("div", "display:none;flex-direction:column;gap:6px;");
    el.appendChild(inst.els.match);

    /* --- preview + save --- */
    inst.els.savings = h("div", "display:none;font-size:11px;color:" + C.dim + ";line-height:1.5;");
    el.appendChild(inst.els.savings);

    var preview = document.createElement("details");
    preview.style.cssText = "border:1px solid " + C.border + ";border-radius:10px;padding:6px 8px;";
    var pSummary = h("summary", "cursor:pointer;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:" + C.dim + ";user-select:none;", "Markdown preview");
    inst.els.preview = h("pre", "margin:8px 0 2px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;line-height:1.55;white-space:pre-wrap;word-break:break-word;color:" + C.fg + ";background:color-mix(in oklab, var(--accent-live) 4%, transparent);border-radius:8px;padding:8px;max-height:180px;overflow:auto;");
    preview.appendChild(pSummary);
    preview.appendChild(inst.els.preview);
    el.appendChild(preview);

    el.appendChild(mkBtn("Save visit to vault", { primary: true, block: true, h: 38, onClick: saveVisit }));

    /* --- visit history (dynamic) --- */
    inst.els.history = h("div", "display:none;flex-direction:column;gap:4px;");
    el.appendChild(inst.els.history);

    instances.push(inst);
    host.appendChild(el);
    syncInputs();
    return inst;
  }

  /* --------------------------- dynamic rendering --------------------------- */

  function onFieldInput(id, value) {
    S.values[id] = value;
    S.touched[id] = true;
    schedulePreview();
  }

  var previewTimer = null;
  function schedulePreview() {
    if (previewTimer) clearTimeout(previewTimer);
    previewTimer = setTimeout(renderDynamic, 250);
  }

  function currentDelta() {
    var inherited = S.pattern && S.pattern.resolved ? S.pattern.resolved.values : S.baseResolved ? S.baseResolved.values : {};
    return encodeDelta(S.values, inherited, S.touched);
  }

  function pendingRecord() {
    var rec = {
      mr: S.mr || "MR-?",
      patient: S.patient || "—",
      date: S.date,
      values: {},
      delta: {},
    };
    if (S.pattern) {
      rec.pattern = S.pattern.mr;
      rec.match = Math.round(S.pattern.score * 100) + "%";
      rec.delta = currentDelta().delta;
    } else if (S.base) {
      rec.base = S.base.date || S.base.path;
      rec.baseDate = S.base.date;
      rec.delta = currentDelta().delta;
    } else {
      FIELDS.forEach(function (f) {
        var v = String(S.values[f.id] == null ? "" : S.values[f.id]).trim();
        if (v) rec.values[f.id] = v;
      });
    }
    return rec;
  }

  function renderBanner(inst) {
    var b = inst.els.banner;
    b.textContent = "";
    if (!S.mr) {
      b.style.display = "flex";
      b.appendChild(
        h(
          "div",
          "font-size:11px;line-height:1.55;color:" + C.dim,
          "Type an MR number. Known patients inherit their last visit automatically — you only store what changed.",
        ),
      );
      return;
    }
    if (S.pattern) {
      b.style.display = "flex";
      var row = h("div", "display:flex;align-items:center;gap:6px;flex-wrap:wrap;");
      row.appendChild(chip("PATTERN " + S.pattern.mr + " · " + Math.round(S.pattern.score * 100) + "%", "ok"));
      row.appendChild(h("span", "font-size:11px;color:" + C.dim, "values inherited — edits become ∆"));
      b.appendChild(row);
      var d = currentDelta().delta;
      var keys = Object.keys(d);
      b.appendChild(
        h(
          "div",
          "font-family:ui-monospace,Menlo,monospace;font-size:11px;color:" + C.fg + ";line-height:1.6;",
          keys.length ? keys.map(function (k) { return deltaLine(k, d[k]); }).join("\n") : "∆ (nothing yet — edit a field)",
        ),
      );
      b.appendChild(mkBtn("Detach pattern — plain visit", { onClick: function () { S.pattern = null; renderDynamic(); }, h: 26 }));
      return;
    }
    if (S.base) {
      b.style.display = "flex";
      var row2 = h("div", "display:flex;align-items:center;gap:6px;flex-wrap:wrap;");
      row2.appendChild(chip("CONTINUING · base " + (S.base.date || S.base.path.split("/").pop())));
      var enc = currentDelta();
      row2.appendChild(
        h(
          "span",
          "font-size:11px;color:" + C.dim,
          "inherits " + countNonEmpty(S.baseResolved ? S.baseResolved.values : {}) + " values · you store " + Object.keys(enc.delta).length + " ∆",
        ),
      );
      b.appendChild(row2);
      var actions = h("div", "display:flex;gap:6px;flex-wrap:wrap;");
      actions.appendChild(mkBtn("Start full visit", { onClick: function () { S.base = null; S.baseResolved = null; renderDynamic(); }, h: 26 }));
      var hist = index.byMr[S.mr] || [];
      if (hist.length > 1) {
        actions.appendChild(mkBtn("Pick earlier base", { onClick: function () { showHistory(inst); }, h: 26 }));
      }
      b.appendChild(actions);
      return;
    }
    var known = (index.byMr[S.mr] || []).length > 0;
    if (!known) {
      b.style.display = "flex";
      var row3 = h("div", "display:flex;align-items:center;gap:6px;flex-wrap:wrap;");
      row3.appendChild(chip("NEW PATIENT"));
      row3.appendChild(h("span", "font-size:11px;color:" + C.dim, "creates one patient file — every value stored once"));
      b.appendChild(row3);
      if (cfg.autoPattern && countNonEmpty(S.values) >= 3) {
        var hint = h("div", "font-size:11px;color:" + C.dim, "3+ values captured — run “Find match” to clone a similar patient's profile.");
        b.appendChild(hint);
      }
      return;
    }
    b.style.display = "none";
  }

  function countNonEmpty(values) {
    return FIELDS.filter(function (f) {
      return String(values[f.id] == null ? "" : values[f.id]).trim() !== "";
    }).length;
  }

  function renderMatch(inst) {
    var m = inst.els.match;
    m.textContent = "";
    if (!S.match) {
      m.style.display = "none";
      return;
    }
    m.style.display = "flex";
    var match = S.match;
    var card = h("div", "display:flex;flex-direction:column;gap:6px;padding:8px 9px;border-radius:10px;background:" + C.soft + ";border:1px solid " + C.border + ";");
    var top = h("div", "display:flex;align-items:center;gap:6px;flex-wrap:wrap;");
    top.appendChild(chip(match.donorMr + " · " + (match.visit.patient || "—"), "ok"));
    top.appendChild(chip(Math.round(match.score * 100) + "% similar"));
    card.appendChild(top);
    card.appendChild(
      h("div", "font-size:11px;color:" + C.dim + ";line-height:1.5;",
        "Donor visit " + (match.visit.date || "") + " — differs: " + (match.diffs.length ? match.diffs.join(", ") : "nothing")),
    );
    var actions = h("div", "display:flex;gap:6px;flex-wrap:wrap;");
    actions.appendChild(
      mkBtn("Use as pattern", {
        primary: true,
        h: 26,
        onClick: function () {
          S.pattern = { mr: match.donorMr, score: match.score, donorDate: match.visit.date, resolved: match.resolved };
          S.match = null;
          S.base = null;
          S.baseResolved = null;
          S.values = Object.assign({}, match.resolved.values);
          S.touched = {};
          syncInputs();
          renderDynamic();
        },
      }),
    );
    actions.appendChild(mkBtn("Dismiss", { onClick: function () { S.match = null; renderDynamic(); }, h: 26 }));
    card.appendChild(actions);
    m.appendChild(card);
  }

  function runFindMatch() {
    if (index.count === 0) {
      ctx.showToast("No EMR visits stored yet — save a full visit first.");
      return;
    }
    if (countNonEmpty(S.values) < 2) {
      ctx.showToast("Enter at least VA or IOP values to match on.");
      return;
    }
    var match = findBestMatch(S.values, S.mr || null);
    if (!match) {
      ctx.showToast("No other patients found to match against.");
      return;
    }
    if (match.score < cfg.threshold) {
      ctx.showToast("Best candidate " + match.donorMr + " is only " + Math.round(match.score * 100) + "% similar (threshold " + Math.round(cfg.threshold * 100) + "%).");
    }
    S.match = match;
    renderDynamic();
  }

  function renderSavings(inst) {
    var s = inst.els.savings;
    if (!S.mr) {
      s.style.display = "none";
      return;
    }
    var rec = pendingRecord();
    var isDelta = !!(rec.pattern || rec.base);
    var fullMd = renderVisitBlockMd(
      Object.assign({}, rec, {
        values: Object.assign({}, S.pattern && S.pattern.resolved ? S.pattern.resolved.values : S.baseResolved ? S.baseResolved.values : {}, rec.delta, rec.values),
        delta: {},
        pattern: null,
        base: null,
      }),
    );
    var db = byteLen(renderVisitBlockMd(rec));
    var fb = byteLen(fullMd);
    var saved = fb > 0 ? Math.max(0, Math.round((1 - db / fb) * 100)) : 0;
    s.style.display = "block";
    s.textContent = isDelta
      ? "This visit appends " + db + " B to the patient file instead of " + fb + " B — " + saved + "% smaller. Resolved at read time from " + (rec.pattern ? "pattern " + rec.pattern : "the " + (rec.baseDate || "base") + " visit") + "."
      : "Full visit — " + fb + " B stored once in the patient file. Follow-ups will ∆-link here.";
  }

  function renderPreview(inst) {
    var rec = pendingRecord();
    var known = !!(index.files && index.files[patientPath(S.mr)]);
    var head = known
      ? "# append → " + patientPath(S.mr) + "\n\n### " + rec.date + (rec.pattern || rec.base ? " · ∆ visit" : "") + "\n\n"
      : "# new file → " + patientPath(S.mr) + "\n\n";
    inst.els.preview.textContent = head + renderVisitBlockMd(rec);
  }

  function showHistory(inst) {
    var list = inst.els.history;
    list.textContent = "";
    list.style.display = "flex";
    list.appendChild(sectionLabel("Visit history — tap to set base"));
    var hist = (index.byMr[S.mr] || []).slice().reverse();
    hist.forEach(function (v) {
      var row = h(
        "button",
        "display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:8px;border:1px solid " + C.border + ";background:" + C.soft + ";cursor:pointer;font:inherit;font-size:11.5px;color:" + C.fg + ";text-align:left;",
      );
      row.addEventListener("click", function () {
        S.base = v;
        S.baseResolved = resolveVisit(v);
        S.pattern = null;
        S.values = Object.assign({}, S.baseResolved ? S.baseResolved.values : {}, pick(S.values, S.touched));
        syncInputs();
        renderDynamic();
      });
      var dateSpan = h("span", "font-weight:700;", v.date || "visit");
      row.appendChild(dateSpan);
      var mode = v.pattern ? "pattern " + v.pattern : v.base ? "∆ " + Object.keys(v.delta).length + " fields" : "full";
      row.appendChild(h("span", "margin-left:auto;font-size:10px;color:" + C.dim, mode));
      list.appendChild(row);
    });
  }

  function pick(obj, keys) {
    var out = {};
    Object.keys(keys || {}).forEach(function (k) {
      if (obj[k] !== undefined) out[k] = obj[k];
    });
    return out;
  }

  function renderHistory(inst) {
    var list = inst.els.history;
    if (!S.mr || !(index.byMr[S.mr] || []).length) {
      if (list.style.display !== "none") {
        list.style.display = "none";
        list.textContent = "";
      }
      return;
    }
    if (list.style.display === "flex" && list.childElementCount > 1) {
      showHistory(inst); // visible via "Pick earlier base" — refresh rows in place
    }
  }

  function syncInputs() {
    instances.forEach(function (inst) {
      inst.mrInput.value = S.mr;
      inst.nameInput.value = S.patient;
      inst.dateInput.value = S.date;
      FIELDS.forEach(function (f) {
        var node = inst.inputs[f.id];
        if (node) node.value = S.values[f.id] == null ? "" : String(S.values[f.id]);
      });
    });
  }

  function renderDatalist(inst) {
    var dl = inst.els.datalist;
    dl.textContent = "";
    Object.keys(index.byMr)
      .sort()
      .forEach(function (mr) {
        var opt = document.createElement("option");
        opt.value = mr;
        var first = index.byMr[mr][0];
        opt.label = (first && first.patient) || "";
        dl.appendChild(opt);
      });
  }

  function renderDynamic() {
    instances.forEach(function (inst) {
      if (!inst.el || !inst.el.isConnected) return;
      renderDatalist(inst);
      renderBanner(inst);
      renderMatch(inst);
      renderSavings(inst);
      renderPreview(inst);
      renderHistory(inst);
    });
  }

  /* ------------------------------- saving ------------------------------- */

  /**
   * Save the composed visit into the patient's SINGLE markdown file:
   * create Database/Patients/<MR>.md on first visit, append a
   * ```emr-visit section on every follow-up.
   */
  function saveVisit() {
    if (!S.mr) {
      ctx.showToast("Enter an MR number first.");
      return;
    }
    if (countNonEmpty(S.values) === 0 && !(S.base || S.pattern)) {
      ctx.showToast("Enter at least one clinical value.");
      return;
    }
    var rec = pendingRecord();
    var filePath = patientPath(S.mr);
    ctx.app
      .getNoteContent(filePath)
      .then(function (existing) {
        if (existing) {
          // one patient, one file — a pattern donor only applies to NEW files
          if (rec.pattern) {
            rec.pattern = null;
            rec.match = null;
            if (!rec.base) {
              var own = index.byMr[S.mr] || [];
              var last = own[own.length - 1];
              if (last && last.date && last.date !== rec.date) {
                rec.base = last.date;
                rec.delta = currentDelta().delta;
              }
            }
          }
          var isDelta = !!rec.base;
          var section =
            "### " + rec.date + (isDelta ? " · ∆ visit" : "") + "\n\n" + renderVisitBlockMd(rec);
          var content = existing.replace(/\s+$/, "") + "\n\n" + section + "\n";
          var stat = isDelta
            ? "∆ visit appended (" + byteLen(renderVisitBlockMd(rec)) + " B — only the changes were stored)"
            : "Visit appended to the patient file";
          return { content: content, stat: "Appended to " + filePath + " — " + stat };
        }
        var identity = patientIdentity(rec);
        return {
          content: renderPatientFile(rec, identity),
          stat: "Created patient file " + filePath + " — " + (rec.pattern ? "pattern=" + rec.pattern + " inheritance" : "full baseline"),
        };
      })
      .then(function (plan) {
        return ctx.app.writeNote(filePath, plan.content).then(function () {
          ctx.showToast("Saved — " + plan.stat);
          setTimeout(function () {
            refreshIndex();
            setTimeout(function () {
              loadPatient(S.mr);
            }, 600);
          }, 100);
          ensurePatientsBase();
        });
      })
      .catch(function () {
        ctx.showToast("Could not save the visit to the patient file.");
      });
  }

  /** Seed the "Patients" Base over the Database folder the first time. */
  function ensurePatientsBase() {
    if (cfg.baseCreated) return;
    ctx.app
      .createBase("Patients", {
        sources: { folders: [cfg.folder], tags: [] },
        filters: { id: "root", kind: "group", combinator: "and", children: [] },
        sorts: [{ prop: "mr", dir: "asc" }],
        columns: ["file.name", "mr", "patient", "age", "sex"],
        groupBy: null,
        view: { type: "table", cardSize: "medium", limit: 0 },
      })
      .then(function () {
        cfg.baseCreated = true;
        persistCfg();
      })
      .catch(function () {});
  }

  /* ---------------------------- settings pane ---------------------------- */

  ctx.addSettingsPane(function (pane) {
    pane.textContent = "";
    var wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:10px;font-size:12.5px;color:" + C.fg + ";";

    var row1 = document.createElement("label");
    row1.style.cssText = "display:flex;align-items:center;gap:8px;justify-content:space-between;";
    row1.appendChild(h("span", "", "Patient folder"));
    var folderInput = mkInput("Database/Patients", null, cfg.folder);
    folderInput.style.cssText = INPUT_CSS + "max-width:130px;";
    folderInput.addEventListener("change", function () {
      cfg.folder = (folderInput.value.trim() || "Database/Patients").replace(/^\/+|\/+$/g, "");
      folderInput.value = cfg.folder;
      persistCfg();
      refreshIndex();
    });
    row1.appendChild(folderInput);
    wrap.appendChild(row1);

    var row2 = document.createElement("label");
    row2.style.cssText = "display:flex;align-items:center;gap:8px;justify-content:space-between;";
    row2.appendChild(h("span", "", "Suggest pattern matches"));
    var auto = document.createElement("input");
    auto.type = "checkbox";
    auto.checked = cfg.autoPattern === true;
    auto.addEventListener("change", function () {
      cfg.autoPattern = auto.checked;
      persistCfg();
    });
    row2.appendChild(auto);
    wrap.appendChild(row2);

    var row3 = document.createElement("label");
    row3.style.cssText = "display:flex;align-items:center;gap:8px;justify-content:space-between;";
    row3.appendChild(h("span", "", "Match threshold"));
    var sel = document.createElement("select");
    sel.style.cssText = INPUT_CSS + "max-width:130px;";
    [
      ["0.5", "50% — loose"],
      ["0.65", "65% — balanced"],
      ["0.8", "80% — strict"],
    ].forEach(function (pair) {
      var o = document.createElement("option");
      o.value = pair[0];
      o.textContent = pair[1];
      if (String(cfg.threshold) === pair[0]) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", function () {
      cfg.threshold = parseFloat(sel.value) || 0.65;
      persistCfg();
    });
    row3.appendChild(sel);
    wrap.appendChild(row3);

    var note = h(
      "div",
      "font-size:11px;line-height:1.6;color:" + C.dim,
      "Each patient is ONE markdown file (<folder>/<MR>.md) and every visit is appended inside it as a ```emr-visit block. Delta visits keep a base: date link and only changed values; pattern visits reference the matched patient's MR. A “Patients” Base is created automatically on the first save.",
    );
    wrap.appendChild(note);
    pane.appendChild(wrap);
  });

  /* =========================== registrations =========================== */

  function focusComposer() {
    var last = instances[instances.length - 1];
    if (last && last.mrInput && last.el && last.el.isConnected) {
      last.mrInput.focus();
      last.mrInput.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  ctx.registerSidebarSection({
    id: "emr-composer",
    title: "Optometry EMR",
    icon: "ScanEye",
    order: 20,
    mount: function (host) {
      buildInstance(host);
      renderDynamic();
      refreshIndex();
    },
    destroy: function () {
      // React removed the section DOM — drop the matching instance(s);
      // other mounts (desktop sidebar vs mobile drawer) stay alive
      var remaining = [];
      var removedAnyDisconnected = false;
      instances.forEach(function (inst) {
        if (inst.el && inst.el.isConnected) remaining.push(inst);
        else removedAnyDisconnected = true;
      });
      if (!removedAnyDisconnected && remaining.length > 0) {
        var last = remaining.pop(); // fallback: LIFO
        if (last.el && last.el.parentNode) last.el.parentNode.removeChild(last.el);
      }
      instances = remaining;
    },
  });

  ctx.registerCommand({
    id: "focus-composer",
    title: "Optomize: open EMR composer",
    icon: "ScanEye",
    run: focusComposer,
  });

  ctx.registerCommand({
    id: "match-active-note",
    title: "Optomize: find similar patient for active note",
    icon: "Stethoscope",
    run: function () {
      var path = ctx.app.getActiveNote();
      if (!path) {
        ctx.showToast("Open an EMR note first.");
        return;
      }
      Promise.resolve(ctx.app.getNoteContent(path))
        .then(function (content) {
          var patient = parseEmrPatient(path, content || "");
          var rec = patient ? patient.visits[patient.visits.length - 1] : parseEmrNote(path, content || "");
          if (!rec) {
            ctx.showToast("The active note is not an Optomize patient file (type: optom-patient).");
            return;
          }
          var resolved = resolveVisit(rec);
          var match = findBestMatch(resolved ? resolved.values : {}, rec.mr);
          if (!match) {
            ctx.showToast("No comparable patients yet.");
            return;
          }
          ctx.showToast(
            "Best match for " + rec.mr + ": " + match.donorMr + " (" + Math.round(match.score * 100) + "%) — differs: " +
              (match.diffs.length ? match.diffs.join(", ") : "nothing"),
          );
        })
        .catch(function () {});
    },
  });

  ctx.addRibbonIcon("ScanEye", "Open Optometry EMR", focusComposer);

  ctx.registerEvent("vault-changed", scheduleRefresh);

  ctx.onunload = function () {
    instances.forEach(function (inst) {
      if (inst.el && inst.el.parentNode) inst.el.parentNode.removeChild(inst.el);
    });
    instances = [];
  };
})(ctx);
