/**
 * FocusCaseX sample plugin — FocusCaseX SBL (Sidebar-Left).
 *
 * Owns the LEFT sidebar only: it swaps the raw vault clutter (Files tree,
 * Database/Bases rows, the Optomize EMR composer) for a clinical
 * "Clinic" navigator with live appointment stats, and re-orders the
 * remaining sections so Clinic sits on top with Search right below.
 *
 *  • Registers a Clinic sidebar section — one nav entry per clinical page,
 *    each backed by its own markdown file, plus a live stat strip
 *    (Booked / Done / Patients / Revenue) computed from the vault.
 *  • Seeds one markdown file per page under Clinic/ on first enable:
 *    Dashboard, Appointment (the book), Patients, Exams, Prescriptions,
 *    Reports. Pages use Case Sheets UI blocks (ui-clinic / ui-flow /
 *    ui-today / ui-actions / ui-note-cards / bases-embed) so the center
 *    panel reads as a full clinical dashboard: KPI ranges + revenue,
 *    an appointment→checkout workflow tracker and Today's patients
 *    with scrollable status tabs and one-click patient files.
 *  • Ships its own CSS (registered like a snippet, removed on disable):
 *    hides the Files / Database / Optomize sections, orders the rest,
 *    styles the Clinic nav, and turns markdown tables in the reading view
 *    into appointment boards with status pills.
 *  • Nothing outside the left sidebar is modified — the workspace, tabs,
 *    right panel and editors are untouched.
 */
(function (ctx) {
  "use strict";

  /* ============================== settings ============================== */

  var cfg = { hideCore: true, showStats: true, seeded: false, contentVersion: 0 };
  ctx
    .loadData()
    .then(function (d) {
      if (d && typeof d === "object") {
        if (typeof d.hideCore === "boolean") cfg.hideCore = d.hideCore;
        if (typeof d.showStats === "boolean") cfg.showStats = d.showStats;
        if (d.seeded === true) cfg.seeded = true;
        if (typeof d.contentVersion === "number") cfg.contentVersion = d.contentVersion;
      }
      applyAttrs();
      refreshInstances();
    })
    .catch(function () {
      applyAttrs();
    });

  function persist() {
    try {
      void ctx.saveData({
        hideCore: cfg.hideCore,
        showStats: cfg.showStats,
        seeded: cfg.seeded,
        contentVersion: cfg.contentVersion,
      });
    } catch (e) {
      /* non-fatal */
    }
  }

  /* ============================ clinic pages ============================ */

  var FOLDER = "Clinic";
  var FENCE = "```";

  var PAGES = [
    { file: "Dashboard", label: "Dashboard", icon: "dashboard", desc: "Clinic overview" },
    { file: "Appointment", label: "Appointments", icon: "calendar", desc: "Today's book" },
    { file: "Patients", label: "Patients", icon: "users", desc: "Directory & bases" },
    { file: "Exams", label: "Exams", icon: "eye", desc: "Exam worklist" },
    { file: "Prescriptions", label: "Prescriptions", icon: "pen", desc: "Rx templates" },
    { file: "Reports", label: "Reports", icon: "chart", desc: "Clinical stats" },
  ];

  function pagePath(file) {
    return FOLDER + "/" + file + ".md";
  }

  /** Starter content for each clinical page (markdown IS the UI). */
  function pageContent(file) {
    var fm = "---\nfcxui: dashboard\ntitle: " + file + "\n---\n\n";
    if (file === "Dashboard") {
      return (
        fm +
        "# Clinic dashboard\n\nLive overview of the practice — every number resolves from the markdown case files and the appointment book.\n\n" +
        FENCE + "ui-clinic\n" + FENCE + "\n\n" +
        FENCE + "ui-flow\n" + FENCE + "\n\n" +
        FENCE + "ui-today\n" + FENCE + "\n\n" +
        "## Quick actions\n\n" +
        FENCE + "ui-actions\nitems:\n" +
        "  - New visit note | new-note\n" +
        "  - Patient directory | open-note:Clinic/Patients.md\n" +
        "  - Exam worklist | open-note:Clinic/Exams.md\n" +
        "  - Command palette | open-palette\n" + FENCE + "\n\n" +
        "## Clinic pages\n\n" +
        FENCE + "ui-note-cards\nfolder: Clinic\nlimit: 6\n" + FENCE + "\n"
      );
    }
    if (file === "Appointment") {
      return (
        fm +
        "# Appointment book\n\n" +
        "Today's schedule — edit the rows right here and the dashboard's flow tracker, Today's-patients tabs and revenue tiles update live.\n" +
        "Statuses: **booked** · **arrived** · **in-exam** · **optics** · **billing** · **done** · **no-show**\n\n" +
        "| Time | Patient | MR | Visit type | Status | Fee |\n" +
        "| --- | --- | --- | --- | --- | --- |\n" +
        "| 09:00 | Ravi Kumar | MR-1042 | Follow-up · IOP recheck | done | 300 |\n" +
        "| 09:45 | Meena Shah | MR-0997 | Visual field baseline | done | 500 |\n" +
        "| 10:30 | Arjun Patel | MR-0731 | Refraction review | in-exam | 600 |\n" +
        "| 11:15 | Lakshmi Iyer | MR-2281 | New case · full exam | arrived | 1200 |\n" +
        "| 12:00 | Karthik S | MR-2282 | Contact lens fitting | optics | 800 |\n" +
        "| 12:40 | Nithya Hari | MR-2283 | Spectacle pickup | billing | 450 |\n" +
        "| 16:00 | Farhan Ali | MR-2284 | Post-op review | booked | 400 |\n" +
        "| 16:30 | Ananya Rao | MR-2285 | Follow-up · refraction | booked | 300 |\n" +
        "| 17:00 | Gopal Menon | MR-2286 | Dry-eye workup | booked | 700 |\n" +
        "| 17:20 | Suresh Babu | MR-2287 | Repeat IOP | no-show | 300 |\n\n" +
        "## House rules\n\n" +
        "- Walk-ins slot into free times; mark **no-show** after 15 minutes.\n" +
        "- The Fee column feeds the dashboard revenue — plain numbers or `₹`.\n" +
        "- Rows whose MR matches a patient file open that file with one click.\n\n" +
        "## Waiting room\n\n" +
        FENCE + "ui-note-cards\nfolder: Database/Patients\nlimit: 3\n" + FENCE + "\n"
      );
    }
    if (file === "Patients") {
      return (
        fm +
        "# Patient directory\n\n" +
        "One file per patient under `Database/Patients/` — every visit accumulates inside that single markdown file as compact ∆-delta records (see Optomize).\n\n" +
        FENCE + "ui-actions\nitems:\n" +
        "  - New patient (EMR composer) | optomize:focus-composer\n" +
        "  - Open appointment book | open-note:Clinic/Appointment.md\n" +
        "  - Search vault | open-palette\n" + FENCE + "\n\n" +
        "## Patients database\n\n" +
        FENCE + "bases-embed\nname: Patients\nlimit: 8\n" + FENCE + "\n\n" +
        "## Recent patient files\n\n" +
        FENCE + "ui-note-cards\nfolder: Database/Patients\nlimit: 9\n" + FENCE + "\n"
      );
    }
    if (file === "Exams") {
      return (
        fm +
        "# Exam worklist\n\n" +
        "Open a patient file to review its visit history, vitals and trends.\n\n" +
        FENCE + "ui-note-cards\nfolder: Database/Patients\nlimit: 9\n" + FENCE + "\n\n" +
        FENCE + "ui-actions\nitems:\n" +
        "  - Open appointment book | open-note:Clinic/Appointment.md\n" +
        "  - Command palette | open-palette\n" + FENCE + "\n\n" +
        "## Reading a chart\n\n" +
        "- `emr-vitals` renders the resolved VA / IOP for both eyes of a visit.\n" +
        "- `emr-visits` lists a patient's visit history; `emr-trend` plots IOP or VA across visits.\n" +
        "- Follow-up visits store only deltas (`∆iop:OD=16`) — the rest resolves from the base visit at read time.\n"
      );
    }
    if (file === "Prescriptions") {
      return (
        fm +
        "# Prescriptions\n\n" +
        "Starter Rx templates — copy them into the patient file or keep them as the clinic standard.\n\n" +
        "## Glaucoma suspect\n\n" +
        "| Drug | Dose | Frequency | Duration |\n" +
        "| --- | --- | --- | --- |\n" +
        "| Timolol 0.5% | 1 drop | OD nightly | 30 days |\n" +
        "| Latanoprost | 1 drop | HS | 30 days |\n\n" +
        "## Dry eye routine\n\n" +
        "| Drug | Dose | Frequency | Duration |\n" +
        "| --- | --- | --- | --- |\n" +
        "| Carboxymethylcellulose 0.5% | 1 drop | QID | 30 days |\n" +
        "| Omega-3 supplement | 1 cap | OD | 90 days |\n\n" +
        "## Advice checklist\n\n" +
        "- [ ] 20-20-20 rule for screen work\n" +
        "- [ ] Review in 4–6 weeks with IOP\n" +
        "- [ ] Return sooner for pain, redness or halos\n"
      );
    }
    /* Reports */
    return (
      fm +
      "# Clinic reports\n\n" +
      FENCE + "ui-clinic\n" + FENCE + "\n\n" +
      "## What is counted\n\n" +
      "- **Patients / New patients** — distinct MR numbers with a visit in the selected range; *new* = first-ever visit inside it.\n" +
      "- **Visits** — every `emr-visit` record, including ∆-delta follow-ups.\n" +
      "- **Revenue** — `fee:` lines on visits; hover or click a month bar to zoom into any window.\n" +
      "- Day-to-day flow lives on the Dashboard (ui-flow) and the appointment book.\n\n" +
      FENCE + "ui-actions\nitems:\n" +
      "  - Open appointment book | open-note:Clinic/Appointment.md\n" +
      "  - Open patient directory | open-note:Clinic/Patients.md\n" + FENCE + "\n"
    );
  }

  /* ============================= dom helpers ============================ */

  var C = {
    fg: "var(--sidebar-foreground,#e5e7eb)",
    dim: "var(--muted-foreground,#9ca3af)",
    accent: "var(--accent-live,#2979ff)",
    border: "color-mix(in oklab, var(--accent-live) 14%, var(--border))",
    soft: "color-mix(in oklab, var(--accent-live) 7%, transparent)",
    chip: "color-mix(in oklab, var(--accent-live) 14%, transparent)",
  };

  function h(tag, style, text) {
    var node = document.createElement(tag);
    if (style) node.style.cssText = style;
    if (text != null) node.textContent = text;
    return node;
  }

  /** Inline stroke icons (lucide-style paths, 24×24 viewBox). */
  var ICON_PATHS = {
    dashboard:
      '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
    calendar:
      '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>',
    users:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    eye:
      '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    check: '<path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  };

  function icon(name, size, color) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", String(size || 16));
    svg.setAttribute("height", String(size || 16));
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", color || "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = ICON_PATHS[name] || ICON_PATHS.dashboard;
    return svg;
  }

  function label(text) {
    return h(
      "div",
      "margin:2px 0 -2px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:" + C.dim,
      text,
    );
  }

  /* ================================ css ================================= */

  var SBL_CSS = [
    "/* == FocusCaseX SBL — left-sidebar clinical layout (auto-managed) == */",
    "",
    "/* 1 · Keep only the selected core UI: Files, Database (Bases) and the",
    "      Optomize EMR composer hide; the Clinic navigator replaces them. */",
    'html[data-fcx-sbl-core="hide"] section[aria-label="Sidebar section: Files"],',
    'html[data-fcx-sbl-core="hide"] section[aria-label="Sidebar section: Database"],',
    'html[data-fcx-sbl-core="hide"] section[aria-label="Sidebar section: Optometry EMR"],',
    'html[data-fcx-sbl-core="hide"] section:has(> button[aria-controls^="sidebar-section-optomize:"]) { display: none !important; }',
    "",
    "/* 2 · Ordering — Clinic on top, Search right below, other plugin",
    "      sections after; core sections keep their slot when unhidden.",
    "      Plugin sections carry their key on the direct-child toggle button. */",
    'section:has(> button[aria-controls^="sidebar-section-"]) { order: -10; }',
    'section:has(> button[aria-controls^="sidebar-section-focuscasex-sbl:"]) { order: -30; }',
    'section:has(> div > button[aria-controls="sidebar-section-search"]) { order: -20; }',
    "",
    "/* 3 · Clinic navigator look */",
    ".fcx-sbl-nav-item { transition: background-color .15s ease; }",
    '.fcx-sbl-nav-item:hover { background: color-mix(in oklab, var(--accent-live, #2979ff) 10%, transparent); }',
    '.fcx-sbl-nav-item.is-active { background: color-mix(in oklab, var(--accent-live, #2979ff) 14%, transparent); box-shadow: inset 2px 0 0 var(--accent-live, #2979ff); }',
    ".fcx-sbl-go { opacity: 0; transform: translateX(-3px); transition: opacity .15s ease, transform .15s ease; }",
    ".fcx-sbl-nav-item:hover .fcx-sbl-go { opacity: 1; transform: translateX(0); }",
    ".fcx-sbl-stat { transition: border-color .15s ease, background-color .15s ease; }",
    '.fcx-sbl-stat:hover { border-color: color-mix(in oklab, var(--accent-live, #2979ff) 45%, var(--border)); background: color-mix(in oklab, var(--accent-live, #2979ff) 8%, transparent); }',
    ".fcx-sbl-new:hover { border-color: " + C.border + " !important; color: " + C.accent + "; }",
    "",
    "/* 4 · Clinic pages in the reading view: markdown tables become",
    "      appointment boards; bold status text becomes a pill. */",
    'html[data-fcx-sbl="on"] .fcx-prose table {',
    "  border-collapse: separate; border-spacing: 0; width: 100%; overflow: hidden;",
    "  border-radius: 12px; border: 1px solid color-mix(in oklab, var(--accent-live, #2979ff) 20%, var(--border));",
    "}",
    'html[data-fcx-sbl="on"] .fcx-prose thead th {',
    "  background: color-mix(in oklab, var(--accent-live, #2979ff) 10%, transparent);",
    "  text-transform: uppercase; letter-spacing: .07em; font-size: 11px;",
    "}",
    'html[data-fcx-sbl="on"] .fcx-prose tbody td { border-top: 1px solid var(--border); }',
    'html[data-fcx-sbl="on"] .fcx-prose tbody tr { transition: background-color .12s ease; }',
    'html[data-fcx-sbl="on"] .fcx-prose tbody tr:hover { background: color-mix(in oklab, var(--accent-live, #2979ff) 6%, transparent); }',
    'html[data-fcx-sbl="on"] .fcx-prose table strong {',
    "  display: inline-block; padding: 1px 9px; border-radius: 999px;",
    "  font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;",
    "  background: color-mix(in oklab, var(--accent-live, #2979ff) 15%, transparent);",
    "  color: var(--accent-live, #2979ff);",
    "}",
  ].join("\n");

  ctx.registerCss(SBL_CSS);

  /* html flags so the CSS can react to settings and unload cleanly */
  function applyAttrs() {
    try {
      var root = document.documentElement;
      root.setAttribute("data-fcx-sbl", "on");
      if (cfg.hideCore) root.setAttribute("data-fcx-sbl-core", "hide");
      else root.removeAttribute("data-fcx-sbl-core");
    } catch (e) {
      /* non-fatal */
    }
  }

  function clearAttrs() {
    try {
      var root = document.documentElement;
      root.removeAttribute("data-fcx-sbl");
      root.removeAttribute("data-fcx-sbl-core");
    } catch (e) {
      /* non-fatal */
    }
  }

  /* ============================ page plumbing =========================== */

  /** GET-check then POST — never overwrites an existing note. */
  function seedPage(file) {
    return ctx.app
      .getNoteContent(pagePath(file))
      .then(function (existing) {
        if (existing !== null) return false;
        return fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: pagePath(file),
            title: file,
            content: pageContent(file),
          }),
        }).then(function (res) {
          return res.ok;
        });
      })
      .catch(function () {
        return false;
      });
  }

  /** Seeds every clinic page that is missing. Resolves to # created. */
  function ensurePages() {
    var created = 0;
    var chain = Promise.resolve();
    PAGES.forEach(function (p) {
      chain = chain.then(function () {
        return seedPage(p.file).then(function (did) {
          if (did) created += 1;
        });
      });
    });
    return chain.then(function () {
      return created;
    });
  }

  /* ---- content refresh: stock pages that were never hand-edited ---- */

  var CONTENT_VERSION = 2;

  /** Exact v1 Dashboard template (identical strings to the old seeds). */
  var V1_DASHBOARD =
    "---\nfcxui: dashboard\ntitle: Dashboard\n---\n\n" +
    "# Clinic dashboard\n\nLive overview of the practice — every number resolves from the markdown case files.\n\n" +
    FENCE + "ui-stats\npreset: clinic\n" + FENCE + "\n\n" +
    FENCE + "ui-actions\nitems:\n" +
    "  - Open appointment book | open-note:Clinic/Appointment.md\n" +
    "  - Patient directory | open-note:Clinic/Patients.md\n" +
    "  - Exam worklist | open-note:Clinic/Exams.md\n" +
    "  - Command palette | open-palette\n" + FENCE + "\n\n" +
    "## Clinic pages\n\n" +
    FENCE + "ui-note-cards\nfolder: Clinic\nlimit: 6\n" + FENCE + "\n";

  /** Exact v1 Appointment template. */
  var V1_APPOINTMENT =
    "---\nfcxui: dashboard\ntitle: Appointment\n---\n\n" +
    "# Appointment book\n\n" +
    "Today's schedule — edit the rows directly in this markdown and the sidebar counters update live.\n" +
    "Statuses: **booked** · **waiting** · **done** · **no-show**\n\n" +
    FENCE + "ui-actions\nitems:\n" +
    "  - Patient directory | open-note:Clinic/Patients.md\n" +
    "  - Prescriptions | open-note:Clinic/Prescriptions.md\n" +
    "  - Command palette | open-palette\n" + FENCE + "\n\n" +
    "## Schedule\n\n" +
    "| Time | Patient | MR | Visit type | Status |\n" +
    "| --- | --- | --- | --- | --- |\n" +
    "| 09:00 | Anita Rao | MR-1001 | Follow-up · IOP check | **done** |\n" +
    "| 09:45 | Ravi Menon | MR-1002 | Refraction | **done** |\n" +
    "| 10:30 | Meera Nair | MR-1003 | New case · full exam | **waiting** |\n" +
    "| 11:15 | John Mathew | MR-1004 | Visual field test | **booked** |\n" +
    "| 12:00 | Sneha Pillai | MR-1005 | Contact lens fitting | **booked** |\n" +
    "| 16:00 | Arjun Das | MR-1006 | Post-op review | **booked** |\n\n" +
    "## Waiting room\n\n" +
    FENCE + "ui-note-cards\nfolder: Database/Patients\nlimit: 3\n" + FENCE + "\n";

  /** Replace untouched v1 stock pages with the v2 templates. Hand-edited
      pages never match the v1 strings and are left alone. */
  function refreshStockPages() {
    if ((cfg.contentVersion || 0) >= CONTENT_VERSION) return Promise.resolve(0);
    var updated = 0;
    var pairs = [
      ["Dashboard", V1_DASHBOARD],
      ["Appointment", V1_APPOINTMENT],
    ];
    var chain = Promise.resolve();
    pairs.forEach(function (pair) {
      chain = chain.then(function () {
        return ctx.app
          .getNoteContent(pagePath(pair[0]))
          .then(function (content) {
            if (content !== null && content === pair[1]) {
              return ctx.app.writeNote(pagePath(pair[0]), pageContent(pair[0])).then(function (ok) {
                if (ok) updated += 1;
              });
            }
            return null;
          })
          .catch(function () {});
      });
    });
    return chain.then(function () {
      cfg.contentVersion = CONTENT_VERSION;
      persist();
      return updated;
    });
  }

  /** Starter content for user-created pages (New clinical page). */
  function blankContent(file) {
    return (
      "---\nfcxui: dashboard\ntitle: " + file + "\n---\n\n" +
      "# " + file + "\n\n" +
      "Clinical page — mix markdown with Case Sheets UI blocks; the center panel renders them as dashboard elements.\n\n" +
      FENCE + "ui-actions\nitems:\n" +
      "  - Open appointment book | open-note:Clinic/Appointment.md\n" +
      "  - Command palette | open-palette\n" + FENCE + "\n\n" +
      "## Notes\n\n- \n"
    );
  }

  /** Nav click: create-with-template when missing, otherwise open.
      Clinic pages always land in reading mode so they render as UI. */
  function openPage(file) {
    var path = pagePath(file);
    return ctx.app.getNoteContent(path).then(function (existing) {
      var open = existing === null
        ? ctx.app
            .createNote(path, { title: file, content: pageContent(file) })
            .catch(function () {
              /* createNote already opened the note */
            })
        : ctx.app.openNote(path);
      return open.then(function () {
        ctx.app.setMode("read");
      });
    });
  }

  /* ============================== live stats ============================ */

  /** Status count from the appointment book's table rows — statuses may be
      plain (`| done |`) or bold (`| **done** |`); the legend line is not a
      table row so counters stay truthful. */
  function countStatus(content, status) {
    var re = new RegExp("^\\s*\\|.*\\|\\s*\\*{0,2}" + status + "\\*{0,2}\\s*\\|", "gmi");
    var m = String(content || "").match(re);
    return m ? m.length : 0;
  }

  /** Sum of the book's Fee column (6th pipe column) across table rows. */
  function bookRevenue(content) {
    var re = /^\s*\|(?:[^|\n]*\|){5}\s*₹?\s*(\d+(?:\.\d+)?)\s*\|/gm;
    var sum = 0;
    var m;
    var text = String(content || "");
    while ((m = re.exec(text)) !== null) {
      var v = parseFloat(m[1]);
      if (isFinite(v)) sum += v;
    }
    return sum;
  }

  function computeStats() {
    return Promise.all([
      ctx.app.getNoteContent(pagePath("Appointment")),
      ctx.app.getNotes(),
    ]).then(function (r) {
      var book = r[0] || "";
      var notes = r[1] || [];
      var patients = 0;
      for (var i = 0; i < notes.length; i++) {
        if (notes[i].path.indexOf("Database/Patients/") === 0) patients += 1;
      }
      return {
        booked: countStatus(book, "booked"),
        done: countStatus(book, "done"),
        patients: patients,
        revenue: bookRevenue(book),
      };
    });
  }

  /* ========================= sidebar section UI ========================= */

  var instances = [];

  function buildInstance(host) {
    /* remount into the same host (StrictMode-style double effects):
       drop the previous tree first so trees never pile up */
    while (host.firstChild) host.removeChild(host.firstChild);

    var inst = { el: null, statsEl: null, statEls: null, navEls: {}, newWrap: null };
    var el = h(
      "div",
      "display:flex;flex-direction:column;gap:8px;padding:6px 2px 10px;font-size:12.5px;color:" + C.fg + ";min-width:0;",
    );
    inst.el = el;

    /* --- live stat strip (2×2: booked · done · patients · revenue) --- */
    var stats = h("div", "display:grid;grid-template-columns:repeat(2,1fr);gap:6px;");
    inst.statsEl = stats;
    inst.statEls = {};
    [
      ["booked", "Booked", "calendar", "Appointment"],
      ["done", "Done", "check", "Appointment"],
      ["patients", "Patients", "users", "Patients"],
      ["revenue", "Revenue", "chart", "Dashboard"],
    ].forEach(
      function (def) {
        var key = def[0];
        var tile = h(
          "div",
          "display:flex;flex-direction:column;gap:1px;padding:7px 9px;border-radius:10px;cursor:pointer;min-width:0;" +
            "background:" + C.soft + ";border:1px solid " + C.border + ";",
        );
        tile.className = "fcx-sbl-stat";
        var num = h("span", "font-size:15px;font-weight:800;line-height:1.1;color:" + C.accent + ";", "…");
        var cap = h(
          "span",
          "font-size:9px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:" + C.dim,
          def[1],
        );
        tile.appendChild(num);
        tile.appendChild(cap);
        tile.title = "Open " + def[3];
        tile.addEventListener("click", function () {
          void openPage(def[3]);
        });
        inst.statEls[key] = num;
        stats.appendChild(tile);
      },
    );
    el.appendChild(stats);

    /* --- clinical page nav --- */
    var nav = h("div", "display:flex;flex-direction:column;gap:2px;");
    PAGES.forEach(function (p) {
      var row = h(
        "div",
        "display:flex;align-items:center;gap:8px;height:34px;padding:0 8px;border-radius:9px;cursor:pointer;min-width:0;",
      );
      row.className = "fcx-sbl-nav-item";
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");
      row.title = p.desc + " · Clinic/" + p.file + ".md";
      var ic = icon(p.icon, 15, C.dim);
      var text = h("span", "flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12.5px;font-weight:600;", p.label);
      var go = icon("arrow", 13, C.dim);
      go.setAttribute("class", "fcx-sbl-go");
      row.appendChild(ic);
      row.appendChild(text);
      row.appendChild(go);
      var open = function () {
        void openPage(p.file);
      };
      row.addEventListener("click", open);
      row.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
      inst.navEls[p.file] = { row: row, ic: ic, text: text };
      nav.appendChild(row);
    });
    el.appendChild(nav);

    /* --- new clinical page --- */
    var newWrap = h("div", "display:flex;flex-direction:column;gap:6px;");
    var newBtn = h(
      "div",
      "display:flex;align-items:center;gap:8px;height:32px;padding:0 8px;border-radius:9px;cursor:pointer;font-size:12px;font-weight:600;color:" +
        C.dim + ";border:1px dashed var(--border);",
      "",
    );
    newBtn.className = "fcx-sbl-new";
    newBtn.appendChild(icon("plus", 14, "currentColor"));
    newBtn.appendChild(h("span", "", "New clinical page"));
    newBtn.setAttribute("role", "button");
    newBtn.setAttribute("tabindex", "0");
    var input = null;
    function showInput() {
      if (input) return;
      newWrap.removeChild(newBtn);
      input = document.createElement("input");
      input.style.cssText =
        "width:100%;box-sizing:border-box;height:32px;padding:0 9px;border-radius:9px;font:inherit;font-size:12px;color:" +
        C.fg + ";background:" + C.soft + ";border:1px solid " + C.border + ";outline:none;";
      input.placeholder = "Page name (e.g. Inventory)";
      input.spellcheck = false;
      var row2 = h("div", "display:flex;gap:6px;");
      var mk = h(
        "button",
        "height:32px;padding:0 10px;border-radius:9px;font:inherit;font-size:11.5px;font-weight:700;cursor:pointer;border:1px solid transparent;background:" +
          C.accent + ";color:#fff;",
        "Create",
      );
      function commit() {
        var name = (input.value || "").trim().replace(/[\\/:*?"<>|]+/g, "").slice(0, 60);
        if (!name) {
          reset();
          return;
        }
        var file = name;
        input.disabled = true;
        ctx.app.getNoteContent(pagePath(file)).then(function (existing) {
          if (existing === null) {
            return ctx.app
              .createNote(pagePath(file), { title: file, content: blankContent(file) })
              .catch(function () {});
          }
          return ctx.app.openNote(pagePath(file));
        });
        reset();
        ctx.showToast("Clinic page “" + file + "” is open");
      }
      function reset() {
        newWrap.removeChild(row2);
        input = null;
        newWrap.appendChild(newBtn);
      }
      mk.addEventListener("click", commit);
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") reset();
      });
      row2.appendChild(input);
      row2.appendChild(mk);
      newWrap.appendChild(row2);
      input.focus();
    }
    newBtn.addEventListener("click", showInput);
    newBtn.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showInput();
      }
    });
    newWrap.appendChild(newBtn);
    inst.newWrap = newWrap;
    el.appendChild(newWrap);

    /* --- hint --- */
    el.appendChild(
      h(
        "div",
        "font-size:10px;line-height:1.5;color:" + C.dim + ";padding:0 2px;",
        "Pages live in Clinic/ · markdown is the source of truth",
      ),
    );

    host.appendChild(el);
    instances.push(inst);
    renderStats(inst);
    renderActive(inst);
  }

  function renderStats(inst) {
    if (!inst.el || !inst.el.isConnected || !inst.statsEl) return;
    if (!cfg.showStats) {
      inst.statsEl.style.display = "none";
      return;
    }
    inst.statsEl.style.display = "";
    void computeStats().then(function (s) {
      if (!inst.el || !inst.el.isConnected || !inst.statEls) return;
      inst.statEls.booked.textContent = String(s.booked);
      inst.statEls.done.textContent = String(s.done);
      inst.statEls.patients.textContent = String(s.patients);
      inst.statEls.revenue.textContent = "₹" + Number(s.revenue || 0).toLocaleString("en-IN");
    });
  }

  function renderActive(inst) {
    renderActivePath(inst, ctx.app.getActiveNote() || "");
  }

  function refreshInstances() {
    instances.forEach(function (inst) {
      if (inst.el && inst.el.isConnected) {
        renderStats(inst);
        renderActive(inst);
      }
    });
  }

  function reapInstances() {
    var remaining = [];
    var removedAnyDisconnected = false;
    instances.forEach(function (inst) {
      if (inst.el && inst.el.isConnected) remaining.push(inst);
      else removedAnyDisconnected = true;
    });
    if (!removedAnyDisconnected && remaining.length > 0) {
      var last = remaining.pop();
      if (last.el && last.el.parentNode) last.el.parentNode.removeChild(last.el);
    }
    instances = remaining;
  }

  ctx.registerSidebarSection({
    id: "clinic-nav",
    title: "Clinic",
    icon: "Stethoscope",
    order: -30,
    mount: function (host) {
      buildInstance(host);
    },
    destroy: function () {
      reapInstances();
    },
  });

  /* ====================== commands, ribbon, events ====================== */

  ctx.registerCommand({
    id: "open-dashboard",
    title: "SBL: open clinic dashboard",
    icon: "Gauge",
    run: function () {
      void openPage("Dashboard");
    },
  });

  ctx.registerCommand({
    id: "open-appointments",
    title: "SBL: open appointment book",
    icon: "CalendarDays",
    run: function () {
      void openPage("Appointment");
    },
  });

  ctx.registerCommand({
    id: "new-appointment",
    title: "SBL: go to appointment book",
    icon: "CalendarDays",
    run: function () {
      void openPage("Appointment");
    },
  });

  ctx.registerCommand({
    id: "rebuild-pages",
    title: "SBL: recreate missing clinic pages",
    icon: "RefreshCcw",
    run: function () {
      void ensurePages().then(function (n) {
        ctx.showToast(
          n > 0 ? "SBL: recreated " + n + " clinic page" + (n === 1 ? "" : "s") : "SBL: all clinic pages already exist",
        );
        refreshInstances();
      });
    },
  });

  ctx.addRibbonIcon("Stethoscope", "Open clinic dashboard", function () {
    void openPage("Dashboard");
  });

  ctx.registerEvent("vault-changed", function () {
    refreshInstances();
  });

  /* draft streams on every keystroke — debounce so typing in the book
     updates the counters live without recomputing per character */
  var refreshTimer = null;
  ctx.registerEvent("active-note-changed", function (payload) {
    var path = payload && typeof payload.path === "string" ? payload.path : ctx.app.getActiveNote() || "";
    instances.forEach(function (inst) {
      if (inst.el && inst.el.isConnected) renderActivePath(inst, path);
    });
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () {
      refreshTimer = null;
      refreshInstances();
    }, 400);
  });

  function renderActivePath(inst, path) {
    PAGES.forEach(function (p) {
      var entry = inst.navEls[p.file];
      if (!entry) return;
      var on = path === pagePath(p.file);
      if (on) entry.row.classList.add("is-active");
      else entry.row.classList.remove("is-active");
      entry.ic.setAttribute("stroke", on ? C.accent : C.dim);
      entry.text.style.color = on ? C.accent : "inherit";
    });
  }

  /* ============================ settings pane =========================== */

  function toggleRow(tip, text, value, onChange) {
    var row = h("div", "display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0;");
    var cap = h("div", "");
    cap.appendChild(h("div", "font-size:12.5px;font-weight:600;", text));
    cap.appendChild(h("div", "font-size:10.5px;color:" + C.dim + ";margin-top:1px;", tip));
    var btn = h(
      "button",
      "position:relative;width:38px;height:22px;border-radius:999px;cursor:pointer;flex-shrink:0;transition:background .15s;border:1px solid " +
        C.border + ";background:" + (value ? C.accent : "var(--border)") + ";",
    );
    var knob = h(
      "span",
      "position:absolute;top:2px;left:" + (value ? 18 : 2) + "px;width:16px;height:16px;border-radius:999px;background:#fff;transition:left .15s;box-shadow:0 1px 2px rgba(0,0,0,.25);",
    );
    btn.appendChild(knob);
    btn.addEventListener("click", function () {
      var next = !(btn.getAttribute("data-on") === "1");
      btn.setAttribute("data-on", next ? "1" : "0");
      btn.style.background = next ? C.accent : "var(--border)";
      knob.style.left = next ? "18px" : "2px";
      onChange(next);
    });
    btn.setAttribute("data-on", value ? "1" : "0");
    row.appendChild(cap);
    row.appendChild(btn);
    return row;
  }

  ctx.addSettingsPane(function (el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    var box = h(
      "div",
      "display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:" + C.fg + ";min-width:0;",
    );
    box.appendChild(label("Sidebar-Left layout"));
    box.appendChild(
      toggleRow(
        "Files tree, Database bases and the Optomize composer hide from the left sidebar",
        "Show only the Clinic navigator + Search",
        cfg.hideCore,
        function (v) {
          cfg.hideCore = v;
          applyAttrs();
          persist();
        },
      ),
    );
    box.appendChild(
      toggleRow(
        "Booked / Done / Patients / Revenue tiles above the page list",
        "Live appointment stats",
        cfg.showStats,
        function (v) {
          cfg.showStats = v;
          persist();
          refreshInstances();
        },
      ),
    );
    var foot = h(
      "div",
      "font-size:10.5px;line-height:1.55;color:" + C.dim + ";padding-top:4px;",
    );
    foot.appendChild(
      h(
        "span",
        "",
        "Pages: Clinic/Dashboard.md · Appointment.md · Patients.md · Exams.md · Prescriptions.md · Reports.md — edit them freely; ui-clinic / ui-flow / ui-today read the appointment book and visit fees live.",
      ),
    );
    box.appendChild(foot);
    el.appendChild(box);
  });

  /* ================================ boot ================================ */

  applyAttrs();
  void ensurePages()
    .then(function () {
      return refreshStockPages();
    })
    .then(function (refreshed) {
      cfg.seeded = true;
      persist();
      if (refreshed > 0) {
        ctx.showToast("SBL: refreshed " + refreshed + " stock page" + (refreshed === 1 ? "" : "s") + " with the v2 clinical dashboard");
      }
      refreshInstances();
    });

  ctx.onunload = function () {
    clearAttrs();
  };
})(ctx);
