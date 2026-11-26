/**
 * FocusCaseX sample plugin — Day Sheet.
 *
 * One-tap printable end-of-day summary (command + ribbon button):
 *  • Reads every patient file under Database/Patients — the ONE PATIENT =
 *    ONE FILE layout where each visit is stored as an ```emr-visit block
 *    (the Optomize format: flat keys, follow-ups store only what changed
 *    in one nested map, `fee` is per-visit metadata).
 *  • Business day boundary — `dayCutoff` (default 18:00): a visit logged
 *    at or after the cutoff rolls into the NEXT business day, so running
 *    the sheet right at closing keeps today's totals clean.
 *  • Aggregates visit count, new patients (first-ever visit falls today),
 *    revenue (₹ fee fields summed) and the procedures list (proc tokens).
 *  • Writes DaySheets/<yyyy-mm-dd>.md — totals row, visit table, procedure
 *    counts and new-patient list on one printable page. Re-runs overwrite
 *    the same note, so the sheet always reflects the charts as of now.
 *  • Config (loadData): { folder: "DaySheets", dayCutoff: "18:00" } —
 *    editable in Settings › Extensions › Day Sheet.
 */
(function (ctx) {
  "use strict";

  /* ============================== settings ============================== */

  var cfg = { folder: "DaySheets", dayCutoff: "18:00" };
  var busy = false;

  ctx
    .loadData()
    .then(function (d) {
      if (d && typeof d === "object") {
        if (typeof d.folder === "string" && d.folder.trim()) {
          cfg.folder = d.folder.trim().replace(/^\/+|\/+$/g, "");
        }
        if (typeof d.dayCutoff === "string" && /^\d{1,2}:\d{2}$/.test(d.dayCutoff.trim())) {
          cfg.dayCutoff = d.dayCutoff.trim();
        }
      }
    })
    .catch(function () {});

  function persistCfg() {
    try {
      ctx.saveData(JSON.parse(JSON.stringify(cfg))).catch(function () {});
    } catch (err) {
      console.error("[day-sheet] saving config failed:", err);
    }
  }

  /* ============================ small helpers ============================ */

  function pad2(n) {
    return String(n).length < 2 ? "0" + String(n) : String(n);
  }

  /** Local date as `yyyy-mm-dd`. */
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function cleanVal(s) {
    return String(s == null ? "" : s).trim().replace(/^"|"$/g, "");
  }

  /** `fee: ₹1,200` / `1200.5` → number; anything unparsable → null. */
  function parseFee(raw) {
    var s = String(raw == null ? "" : raw).replace(/[^0-9.]/g, "");
    if (!s) return null;
    var n = Number.parseFloat(s);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  function money(n) {
    return "\u20B9" + Number(n || 0).toLocaleString("en-IN");
  }

  /** `yyyy-mm-dd` + optional `HH:MM` from a visit date line (null-safe). */
  function parseWhen(raw) {
    var s = String(raw == null ? "" : raw).trim();
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/.exec(s);
    if (!m) return null;
    return {
      day: m[1] + "-" + m[2] + "-" + m[3],
      hh: m[4] != null ? Number(m[4]) : null,
      mm: m[5] != null ? Number(m[5]) : null,
    };
  }

  /** Shift a `yyyy-mm-dd` day by N days (local calendar). */
  function shiftDay(day, days) {
    var d = new Date(day + "T00:00:00");
    if (isNaN(d.getTime())) return day;
    d.setDate(d.getDate() + days);
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  /** Cutoff "HH:MM" → minutes (defensive, 0 on failure). */
  function cutoffMinutes() {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(cfg.dayCutoff || "").trim());
    if (!m) return 18 * 60;
    var h = Math.min(23, Math.max(0, Number(m[1]) || 0));
    var mm = Math.min(59, Math.max(0, Number(m[2]) || 0));
    return h * 60 + mm;
  }

  /**
   * The BUSINESS day a visit belongs to: visits logged at or after the
   * cutoff roll into the next calendar day (the clinic day rolls over).
   */
  function businessDay(when) {
    if (!when) return null;
    var day = when.day;
    if (when.hh != null) {
      var mins = when.hh * 60 + when.mm;
      if (mins >= cutoffMinutes()) day = shiftDay(day, 1);
    }
    return day;
  }

  /** Weekday name for a `yyyy-mm-dd` heading (empty when unparsable). */
  function weekdayOf(day) {
    try {
      var d = new Date(day + "T00:00:00");
      if (isNaN(d.getTime())) return "";
      return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];
    } catch (err) {
      return "";
    }
  }

  /** Markdown table cells must not carry raw pipes. */
  function cell(s) {
    return String(s == null ? "" : s).replace(/\|/g, "\\|").trim() || "\u2014";
  }

  /* ============================ EMR parsing ============================= */

  /** `key: value` reader with one nested-map level (the visit format). */
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
          cur = null;
          fm[key] = cleanVal(rest);
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

  /** Top-level ``` blocks of a markdown body (nested ones are body text). */
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

  /**
   * One ```emr-visit body → visit values. Flat keys ride in as-is; the
   * nested changed-values map of a follow-up visit merges into the same
   * flat map (only stored keys — inherited values resolve in the file).
   */
  function parseVisitBlock(body) {
    var fm = parseSpec(body);
    var values = {};
    Object.keys(fm).forEach(function (k) {
      var v = fm[k];
      if (v && typeof v === "object") {
        Object.keys(v).forEach(function (k2) {
          if (v[k2] !== "") values[k2] = String(v[k2]);
        });
      } else if (typeof v === "string" && v !== "") {
        values[k] = v;
      }
    });
    return {
      date: String(values.date || "").trim(),
      fee: parseFee(values.fee),
      dx: String(values.dx || "").trim(),
      advice: String(values.advice || "").trim(),
      procRaw: String(values.proc || "").trim(),
    };
  }

  /** Procedures tokens from one visit ("; "-joined checkgroup). */
  function procTokens(procRaw) {
    return String(procRaw || "")
      .split(/[;,]/)
      .map(function (t) {
        return t.trim();
      })
      .filter(Boolean);
  }

  /** Patient file (type: optom-patient) → identity + every visit. */
  function parsePatientFile(path, content) {
    var fm = parseFrontmatter(content);
    if (String(fm.type || "") !== "optom-patient" || !fm.mr) return null;
    var visits = [];
    scanBlocks(stripFrontmatter(content)).forEach(function (b) {
      if (b.info !== "emr-visit") return;
      var v = parseVisitBlock(b.body);
      if (!v.date && v.fee === null && !v.dx && !v.procRaw) return;
      visits.push({
        date: v.date,
        fee: v.fee,
        dx: v.dx,
        proc: procTokens(v.procRaw),
      });
    });
    return {
      mr: String(fm.mr),
      patient: String(fm.patient || ""),
      visits: visits,
    };
  }

  /** Legacy standalone visit note (type: optom-visit) — still counted. */
  function parseLegacyVisit(path, content) {
    var fm = parseFrontmatter(content);
    if (String(fm.type || "") !== "optom-visit" || !fm.mr) return null;
    return [
      {
        date: String(fm.date || "").trim(),
        fee: parseFee(fm.fee),
        dx: String(fm.dx || "").trim(),
        proc: procTokens(fm.proc),
      },
    ];
  }

  /* ============================ aggregation ============================= */

  function isPatientPath(path) {
    return path.indexOf("Database/Patients/") === 0 && /\.md$/i.test(path);
  }

  /** Every visit in the charts as {mr, patient, date, fee, dx, proc[]}. */
  function collectVisits() {
    return ctx.app
      .getNotes()
      .then(function (notes) {
        var paths = notes
          .map(function (n) {
            return n.path;
          })
          .filter(isPatientPath);
        return Promise.all(
          paths.map(function (p) {
            return ctx.app
              .getNoteContent(p)
              .then(function (content) {
                if (!content) return [];
                var file = parsePatientFile(p, content);
                if (file) {
                  return file.visits.map(function (v) {
                    return { mr: file.mr, patient: file.patient, date: v.date, fee: v.fee, dx: v.dx, proc: v.proc };
                  });
                }
                var legacy = parseLegacyVisit(p, content);
                if (legacy) {
                  return legacy.map(function (v) {
                    var fm = parseFrontmatter(content);
                    return { mr: String(fm.mr || ""), patient: String(fm.patient || ""), date: v.date, fee: v.fee, dx: v.dx, proc: v.proc };
                  });
                }
                return [];
              })
              .catch(function () {
                return [];
              });
          }),
        );
      })
      .then(function (batches) {
        var out = [];
        batches.forEach(function (batch) {
          batch.forEach(function (v) {
            if (v && v.mr) out.push(v);
          });
        });
        return out;
      });
  }

  /** Aggregate one business day from the full visit list. */
  function aggregate(visits, day) {
    var dayVisits = [];
    var firstDayByMr = {};
    var procCounts = {};
    var feeCount = 0;

    visits.forEach(function (v) {
      var when = parseWhen(v.date);
      var bday = businessDay(when);
      if (!bday) return;
      if (!(v.mr in firstDayByMr) || String(bday).localeCompare(String(firstDayByMr[v.mr])) < 0) {
        firstDayByMr[v.mr] = bday;
      }
      if (bday !== day) return;
      dayVisits.push({
        time: when && when.hh != null ? pad2(when.hh) + ":" + pad2(when.mm) : "",
        mr: v.mr,
        patient: v.patient,
        dx: v.dx,
        fee: v.fee,
        proc: v.proc,
      });
      if (v.fee !== null) feeCount++;
      (v.proc || []).forEach(function (t) {
        procCounts[t] = (procCounts[t] || 0) + 1;
      });
    });

    dayVisits.sort(function (a, b) {
      return String(a.time || "99:99").localeCompare(String(b.time || "99:99")) || String(a.patient).localeCompare(String(b.patient));
    });

    var newPatients = Object.keys(firstDayByMr)
      .filter(function (mr) {
        return firstDayByMr[mr] === day;
      })
      .map(function (mr) {
        var name = "";
        for (var i = 0; i < visits.length; i++) {
          if (visits[i].mr === mr && visits[i].patient) {
            name = visits[i].patient;
            break;
          }
        }
        return { mr: mr, patient: name };
      });

    var revenue = dayVisits.reduce(function (sum, v) {
      return sum + (v.fee || 0);
    }, 0);

    var procedures = Object.keys(procCounts)
      .sort(function (a, b) {
        return procCounts[b] - procCounts[a] || a.localeCompare(b);
      })
      .map(function (t) {
        return { name: t, count: procCounts[t] };
      });

    return {
      visits: dayVisits,
      newPatients: newPatients,
      revenue: revenue,
      feeCount: feeCount,
      procedures: procedures,
    };
  }

  /* ============================ sheet writer ============================ */

  function buildSheet(day, agg) {
    var lines = [];
    var wd = weekdayOf(day);
    lines.push("---");
    lines.push("title: Day sheet \u2014 " + day);
    lines.push("---");
    lines.push("");
    lines.push("# Day sheet \u2014 " + day + (wd ? " (" + wd + ")" : ""));
    lines.push("");
    lines.push(
      "> Generated by Day Sheet \u00B7 business day ends at " +
        cell(cfg.dayCutoff) +
        " \u00B7 source: Database/Patients",
    );
    lines.push("");
    lines.push("## Totals");
    lines.push("");
    lines.push("| Visits | New patients | Revenue |");
    lines.push("| --- | --- | --- |");
    lines.push(
      "| " +
        String(agg.visits.length) +
        " | " +
        String(agg.newPatients.length) +
        " | " +
        money(agg.revenue) +
        " |",
    );
    if (agg.visits.length > 0 && agg.feeCount < agg.visits.length) {
      lines.push("");
      lines.push(
        "_Fees recorded on " + agg.feeCount + " of " + agg.visits.length + " visits; the rest add \u20B90._",
      );
    }
    lines.push("");
    lines.push("## Visits");
    lines.push("");
    lines.push("| Time | Patient | MR | Dx | Fee (\u20B9) |");
    lines.push("| --- | --- | --- | --- | --- |");
    if (agg.visits.length === 0) {
      lines.push("| \u2014 | _no visits recorded_ | \u2014 | \u2014 | \u2014 |");
    } else {
      agg.visits.forEach(function (v) {
        lines.push(
          "| " +
            cell(v.time) +
            " | " +
            cell(v.patient) +
            " | " +
            cell(v.mr) +
            " | " +
            cell(v.dx) +
            " | " +
            (v.fee === null ? "\u2014" : String(v.fee)) +
            " |",
        );
      });
    }
    lines.push("");
    lines.push("## Procedures done");
    lines.push("");
    if (agg.procedures.length === 0) {
      lines.push("_None recorded._");
    } else {
      agg.procedures.forEach(function (p) {
        lines.push("- " + cell(p.name) + (p.count > 1 ? " \u00D7 " + p.count : ""));
      });
    }
    lines.push("");
    lines.push("## New patients");
    lines.push("");
    if (agg.newPatients.length === 0) {
      lines.push("_None \u2014 every visit today was a known MR._");
    } else {
      agg.newPatients.forEach(function (p) {
        lines.push("- " + cell(p.patient) + " (" + cell(p.mr) + ")");
      });
    }
    lines.push("");
    lines.push("_Print this page for the day file \u2014 Day Sheet._");
    lines.push("");
    return lines.join("\n");
  }

  /** Build today's sheet, write DaySheets/<day>.md and open it. */
  function createSheet() {
    if (busy) return;
    busy = true;
    var day = todayStr();
    var sheetPath = cfg.folder + "/" + day + ".md";
    collectVisits()
      .then(function (visits) {
        var agg = aggregate(visits, day);
        var md = buildSheet(day, agg);
        return ctx.app.writeNote(sheetPath, md).then(function (ok) {
          if (!ok) throw new Error("could not write " + sheetPath);
          return ctx.app
            .openNote(sheetPath)
            .catch(function () {})
            .then(function () {
              ctx.showToast(
                "Day sheet ready \u2014 " +
                  agg.visits.length +
                  " visit" +
                  (agg.visits.length === 1 ? "" : "s") +
                  " \u00B7 " +
                  money(agg.revenue) +
                  " \u00B7 " +
                  sheetPath,
              );
            });
        });
      })
      .catch(function (err) {
        console.error("[day-sheet] build failed:", err);
        try {
          ctx.showToast("Day sheet failed \u2014 " + (err && err.message ? err.message : "unknown error"));
        } catch (err2) {
          /* toast is best effort */
        }
      })
      .then(function () {
        busy = false;
      });
  }

  /* ============================ registrations =========================== */

  try {
    ctx.registerCommand({
      id: "create-day-sheet",
      title: "Create day sheet",
      icon: "CalendarDays",
      run: createSheet,
    });
  } catch (err) {
    console.error("[day-sheet] command registration failed:", err);
  }

  try {
    ctx.addRibbonIcon("Receipt", "Create day sheet", createSheet);
  } catch (err) {
    console.error("[day-sheet] ribbon registration failed:", err);
  }

  try {
    ctx.addSettingsPane(function (container) {
      container.replaceChildren();

      var head = document.createElement("p");
      head.textContent = "Day Sheet";
      container.appendChild(head);

      var hint = document.createElement("p");
      hint.textContent =
        "One-tap end-of-day summary. Reads Database/Patients, writes " +
        cfg.folder +
        "/<date>.md. A visit logged at or after the cutoff counts for the NEXT business day.";
      container.appendChild(hint);

      var rowFolder = document.createElement("label");
      var spanFolder = document.createElement("span");
      spanFolder.textContent = "Output folder ";
      var inputFolder = document.createElement("input");
      inputFolder.type = "text";
      inputFolder.value = cfg.folder;
      inputFolder.addEventListener("change", function () {
        var v = String(inputFolder.value || "").trim().replace(/^\/+|\/+$/g, "");
        if (v) {
          cfg.folder = v;
          persistCfg();
        }
        inputFolder.value = cfg.folder;
      });
      rowFolder.appendChild(spanFolder);
      rowFolder.appendChild(inputFolder);
      container.appendChild(rowFolder);

      var rowCutoff = document.createElement("label");
      var spanCutoff = document.createElement("span");
      spanCutoff.textContent = "Day cutoff ";
      var inputCutoff = document.createElement("input");
      inputCutoff.type = "time";
      inputCutoff.value = /^\d{1,2}:\d{2}$/.test(cfg.dayCutoff) ? cfg.dayCutoff : "18:00";
      inputCutoff.addEventListener("change", function () {
        if (/^\d{1,2}:\d{2}$/.test(String(inputCutoff.value || "").trim())) {
          cfg.dayCutoff = String(inputCutoff.value).trim();
          persistCfg();
        }
        inputCutoff.value = cfg.dayCutoff;
      });
      rowCutoff.appendChild(spanCutoff);
      rowCutoff.appendChild(inputCutoff);
      container.appendChild(rowCutoff);

      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "CREATE NOW";
      btn.addEventListener("click", function () {
        createSheet();
      });
      container.appendChild(btn);
    });
  } catch (err) {
    console.error("[day-sheet] settings registration failed:", err);
  }

  ctx.onunload = function () {
    /* host cleans up registrations */
  };
})(ctx);
