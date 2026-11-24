/**
 * FocusCaseX sample plugin — Focuslinks Navigation.
 *
 * Owns the LEFT sidebar only: it swaps the raw vault clutter (Files tree,
 * Database/Bases rows, the Optomize EMR composer) for a pure clinical
 * "Clinic" navigator — navigation only, no stat tiles, no clutter — and
 * re-orders the remaining sections so Clinic sits on top with Search
 * right below.
 *
 *  • Registers a Clinic sidebar section — one nav entry per clinical page,
 *    each backed by its own markdown file.
 *  • Seeds one markdown file per page under Clinic/ on first enable:
 *    Appointment (the book), Recalls, Billing, Patients, Prescriptions,
 *    Reports, Cohorts. The KPI Dashboard and the note-card Exams worklist
 *    are retired (v17), and the "Front desk" page itself is retired
 *    (v19): the appointment book is the desk landing, and exams open
 *    from patient flows, never a menu.
 *    Pages use Capsules UI blocks (ui-appointment / ui-flow / ui-billing /
 *    ui-actions / ui-patients) so the center panel reads as a full
 *    clinical tool.
 *  • Ships its own CSS (registered like a snippet, removed on disable):
 *    hides the Files / Database / Optomize sections, orders the rest,
 *    styles the Clinic nav, and turns markdown tables in the reading view
 *    into appointment boards with status pills.
 *  • Nothing outside the left sidebar is modified — the workspace, tabs,
 *    right panel and editors are untouched.
 */
(function (ctx) {
  "use strict";

  /* ==================== sidebar-ownership guard (v22) ====================
   * FocusCaseX SBL — the Clinic sidebar the hosted site runs — and
   * Focuslinks Navigation both own the LEFT sidebar. When SBL is active
   * this plugin stands down completely (no nav rows, no CSS, no seeding)
   * so the workspace never stacks two navigators. Disable SBL in
   * Settings › Extensions to hand the sidebar back to Focuslinks. */
  var htmlEl = typeof document !== "undefined" ? document.documentElement : null;
  function sblOwnsSidebar() {
    try { return !!htmlEl && htmlEl.getAttribute("data-fcx-sbl") === "on"; }
    catch (e) { return false; }
  }
  function standDown() {
    try {
      if (htmlEl) {
        htmlEl.removeAttribute("data-fcx-links");
        htmlEl.removeAttribute("data-fcx-links-core");
      }
      if (typeof ctx.showToast === "function") {
        ctx.showToast("FocusCaseX SBL owns the sidebar. Disable it in Settings › Extensions to switch to Focuslinks Navigation.");
      }
    } catch (e) { /* non-fatal */ }
  }
  if (sblOwnsSidebar()) { standDown(); return; }

  /* ============================== settings ============================== */

  var cfg = { hideCore: true, seeded: false, contentVersion: 0 };
  ctx
    .loadData()
    .then(function (d) {
      if (d && typeof d === "object") {
        if (typeof d.hideCore === "boolean") cfg.hideCore = d.hideCore;
        if (d.seeded === true) cfg.seeded = true;
        if (typeof d.contentVersion === "number") cfg.contentVersion = d.contentVersion;
      }
      if (sblOwnsSidebar()) { standDown(); return; } // SBL won — stay inert
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

  /** The EMR navigator: grouped, one md file per page. The Dashboard and
      note-card "Exams" entries are retired (v17): the KPI dashboard
      duplicated the front desk and the note-card exam worklist duplicated
      the patient directory. The REAL workup page (Clinic/Examination.md —
      the ui-exam board) is navigable again (v21): one tap from the side
      menu, Clinical group first — the exam is the clinic's core surface
      and patient-flow-only access made it hard to reach.
      The appointment book (Clinic/Appointment.md) is the desk landing
      now — the standalone "Front desk" page was removed (v19). */
  var PAGES = [
    { file: "Appointment", label: "Appointments", icon: "calendar", group: "Front desk", desc: "Book & calendar" },
    { file: "Recalls", label: "Recalls", icon: "check", group: "Front desk", desc: "Follow-up call list" },
    { file: "Billing", label: "Billing", icon: "chart", group: "Front desk", desc: "To-bill & collections" },
    { file: "Examination", label: "Examination", icon: "clipboard", group: "Clinical", desc: "Workup board — case hx to plan" },
    { file: "Patients", label: "Patient List", icon: "users", group: "Clinical", desc: "Directory & bases" },
    { file: "ContactLens", label: "Contact Lens", icon: "eye", group: "Clinical", desc: "CL fittings & trials" },
    { file: "Prescriptions", label: "Prescriptions", icon: "pen", group: "Clinical", desc: "Rx templates" },
    { file: "Opticals", label: "Opticals", icon: "glasses", group: "Opticals", desc: "Dispensing counter" },
    { file: "Inventory", label: "Inventory", icon: "box", group: "Opticals", desc: "Stock & reorder" },
    { file: "Camps", label: "Camps", icon: "tent", group: "Outreach", desc: "Screening camps" },
    { file: "Referrals", label: "Referrals", icon: "share", group: "Outreach", desc: "Referral register" },
    { file: "SurgeryTracker", label: "Surgery Tracker", icon: "activity", group: "Outreach", desc: "Surgical log" },
    { file: "Reports", label: "Reports", icon: "chart", group: "Insights", desc: "Clinical stats" },
    { file: "Cohorts", label: "Cohorts", icon: "users", group: "Insights", desc: "Chronic-care registers" },
  ];

  function pagePath(file) {
    return FOLDER + "/" + file + ".md";
  }

  /** Starter content for each clinical page (markdown IS the UI). */
  function pageContent(file) {
    var LABELS = { Patients: "Patient List", SurgeryTracker: "Surgery Tracker", ContactLens: "Contact Lens" };
    var pageTitle = LABELS[file] || file;
    var fm = "---\nfcxui: dashboard\ntitle: " + pageTitle + "\n---\n\n";
    if (file === "Examination") {
      /* Same bare shape the app core seeds (seed-notes.ts): the ui-exam
         board IS the page — no prose, the exam desk panel beside it. */
      return (
        fm +
        FENCE + "ui-exam\n" + FENCE + "\n\n" +
        FENCE + "ui-panel\ntitle: Exam desk\n- examctx\n- action: Open appointment book | open-note:Clinic/Appointment.md\n" + FENCE + "\n"
      );
    }
    if (file === "Appointment") {
      /* Pure UI — the board is the page, the table is the hidden data
         layer (ReadingView strips it above a bare ui-appointment fence).
         Same byte shape as the app core seed. Seed v18 ships the book
         EMPTY: no demo rows, no fake patients — the clinic books its own
         real appointments. */
      return (
        fm +
        "| Time | Date | Patient | MR | Phone | Visit type | With | Reason | Status | Age | Sex | Fee | Paid | Amount |\n" +
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n\n" +
        FENCE + "ui-appointment\n" + FENCE + "\n\n" +
        FENCE + "ui-panel\ntitle: Front desk\n- booking\n- pipeline\n" + FENCE + "\n"
      );
    }
    if (file === "Recalls") {
      return (
        fm +
        "# Recall board\n\n" +
        "The follow-up safety net — every patient whose latest visit advised a recheck, ordered by urgency: overdue first, then due within 14 days, then upcoming. Booking a patient into today's book marks them handled.\n\n" +
        FENCE + "ui-recalls\n" + FENCE + "\n\n" +
        FENCE + "ui-actions\nitems:\n" +
        "  - Open appointment book | open-note:Clinic/Appointment.md\n" +
        "  - Patient directory | open-note:Clinic/Patients.md\n" + FENCE + "\n"
      );
    }
    if (file === "Billing") {
      return (
        fm +
        "# Billing & dispensing\n\n" +
        "The front desk's money worklist — everyone sitting at the billing stage, everyone at the optics counter, and every completed visit still missing a fee.\n\n" +
        FENCE + "ui-billing\n" + FENCE + "\n\n" +
        FENCE + "ui-actions\nitems:\n" +
        "  - Open appointment book | open-note:Clinic/Appointment.md\n" +
        "  - Command palette | open-palette\n" + FENCE + "\n"
      );
    }
    if (file === "Cohorts") {
      return (
        fm +
        "# Diagnosis cohorts\n\n" +
        "Chronic-care registers built from each patient's latest Dx / H/O — the same rules the dashboard runs, with overdue recall counts per program.\n\n" +
        FENCE + "ui-cohorts\nrules:\n" +
        "  - Glaucoma|poag, glaucoma, oht, ocular hypertension, suspect\n" +
        "  - Dry eye|dry eye, ded, mgd\n" +
        "  - Post-op|post-op, post op, surgery\n" + FENCE + "\n\n" +
        FENCE + "ui-recalls\n" + FENCE + "\n"
      );
    }
    if (file === "Patients") {
      /* Pure UI — the live board plus its desk panel; no prose, no raw
         file-card grids (same shape as the app core seed). */
      return (
        fm +
        FENCE + "ui-patients\n" + FENCE + "\n\n" +
        FENCE + "ui-panel\ntitle: Patient desk\n- directory\n- recalls\n- action: Open appointment book | open-note:Clinic/Appointment.md\n" + FENCE + "\n"
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
    if (file === "ContactLens") {
      return (
        fm +
        "# Contact lens desk\n\n" +
        "Every fitting on one board — trials, dispenses and annual reviews. The table below is the data layer; rows write back from the booking sheet when a CL fitting is the visit type.\n\n" +
        "| Date | Patient | MR | Lens type | BC / Dia | Power (OD / OS) | Trial | Status | Next review |\n" +
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n\n" +
        FENCE + "ui-panel\ntitle: CL desk\n- directory\n- action: Open appointment book | open-note:Clinic/Appointment.md\n" + FENCE + "\n"
      );
    }
    if (file === "Opticals") {
      return (
        fm +
        "# Opticals counter\n\n" +
        "Dispensing worklist — every order from frame selection to pickup. Amount and Paid feed the same money counters the billing desk shows; **Ready** orders are this hour's pickup calls.\n\n" +
        "| Order | Date | Patient | MR | Frame | Lens | Amount | Paid | Status |\n" +
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n\n" +
        FENCE + "ui-actions\nitems:\n" +
        "  - Open billing desk | open-note:Clinic/Billing.md\n" +
        "  - Patient directory | open-note:Clinic/Patients.md\n" + FENCE + "\n"
      );
    }
    if (file === "Inventory") {
      return (
        fm +
        "# Inventory\n\n" +
        "Stock register for frames, lenses, solutions and consumables. **At/below reorder** rows are today's purchase list — update the Stock column as deliveries land.\n\n" +
        "| Item | Category | Supplier | Stock | Reorder at | Cost | MRP | Updated |\n" +
        "| --- | --- | --- | --- | --- | --- | --- | --- |\n\n" +
        FENCE + "ui-panel\ntitle: Stock desk\n- action: Open opticals counter | open-note:Clinic/Opticals.md\n" + FENCE + "\n"
      );
    }
    if (file === "Camps") {
      return (
        fm +
        "# Screening camps\n\n" +
        "One row per camp — site, partner, what the team screened and what left the camp: specs issued, referrals handed over, surgeries booked from the camp list.\n\n" +
        "| Date | Camp site | Partner | Screened | Specs issued | Referrals | Surgeries booked | Status |\n" +
        "| --- | --- | --- | --- | --- | --- | --- | --- |\n\n" +
        FENCE + "ui-panel\ntitle: Camp desk\n- action: Open surgery tracker | open-note:Clinic/SurgeryTracker.md\n" + FENCE + "\n"
      );
    }
    if (file === "Referrals") {
      return (
        fm +
        "# Referral register\n\n" +
        "Every patient sent out or received — reason, letter status and whether the report ever came back. **Report due** rows are this week's chase list.\n\n" +
        "| Date | Patient | MR | Direction | Referred to | Reason | Letter | Report back | Status |\n" +
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n\n" +
        FENCE + "ui-panel\ntitle: Referral desk\n- directory\n- action: Open appointment book | open-note:Clinic/Appointment.md\n" + FENCE + "\n"
      );
    }
    if (file === "SurgeryTracker") {
      return (
        fm +
        "# Surgery tracker\n\n" +
        "The surgical log — pre-op clearance through post-op reviews. Walk a row down **Scheduled → Pre-op cleared → Theatre → Post-op**; post-op reviews book themselves into the appointment book.\n\n" +
        "| Date | Patient | MR | Surgery | Surgeon | Theatre | Pre-op clear | Status | Post-op review |\n" +
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n\n" +
        FENCE + "ui-panel\ntitle: Surgery desk\n- directory\n- action: Open appointment book | open-note:Clinic/Appointment.md\n" + FENCE + "\n"
      );
    }
    /* Reports */
    return (
      fm +
      "# Clinic reports\n\n" +
      FENCE + "ui-clinic\n" + FENCE + "\n\n" +
      FENCE + "ui-actions\nitems:\n" +
      "  - Open appointment book | open-note:Clinic/Appointment.md\n" +
      "  - Open patient list | open-note:Clinic/Patients.md\n" + FENCE + "\n"
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
    clipboard:
      '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    check: '<path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    glasses:
      '<circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M14 15a2 2 0 0 0-4 0"/><path d="M2.5 13 5 7c.7-1.3 1.4-2 3-2"/><path d="M21.5 13 19 7c-.7-1.3-1.5-2-3-2"/>',
    box:
      '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    tent:
      '<path d="M3.5 21 14 13"/><path d="M9.5 21 19 13"/><path d="M15 5 17 3l6 7-2 2"/><path d="M22 10 12 21l-9-9s6-6 9.5-3.5c3.5 2.5 9.5 1.5 9.5 1.5Z"/>',
    share:
      '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 3.7"/><path d="m15.4 6.8-6.8 3.7"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
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

  var LINKS_CSS = [
    "/* == Focuslinks Navigation — left-sidebar clinical nav (auto-managed) == */",
    "",
    "/* 1 · Keep only the selected core UI: Files, Database (Bases) and the",
    "      Optomize EMR composer hide; the Clinic navigator replaces them. */",
    'html[data-fcx-links-core="hide"] section[aria-label="Sidebar section: Files"],',
    'html[data-fcx-links-core="hide"] section[aria-label="Sidebar section: Database"],',
    'html[data-fcx-links-core="hide"] section[aria-label="Sidebar section: Optometry EMR"],',
    'html[data-fcx-links-core="hide"] section:has(> button[aria-controls^="sidebar-section-optomize:"]) { display: none !important; }',
    "",
    "/* 2 · Ordering — Clinic on top, Search right below, other plugin",
    "      sections after; core sections keep their slot when unhidden.",
    "      Plugin sections carry their key on the direct-child toggle button. */",
    'section:has(> button[aria-controls^="sidebar-section-"]) { order: -10; }',
    'section:has(> button[aria-controls^="sidebar-section-focuslinks-navigation:"]) { order: -30; }',
    'section:has(> div > button[aria-controls="sidebar-section-search"]) { order: -20; }',
    "",
    "/* 3 · Clinic navigator look */",
    ".fcx-links-nav-item { transition: background-color .15s ease; }",
    '.fcx-links-nav-item:hover { background: color-mix(in oklab, var(--accent-live, #2979ff) 10%, transparent); }',
    '.fcx-links-nav-item.is-active { background: color-mix(in oklab, var(--accent-live, #2979ff) 14%, transparent); box-shadow: inset 2px 0 0 var(--accent-live, #2979ff); }',
    ".fcx-links-go { opacity: 0; transform: translateX(-3px); transition: opacity .15s ease, transform .15s ease; }",
    ".fcx-links-nav-item:hover .fcx-links-go { opacity: 1; transform: translateX(0); }",
    "",
    "/* 4 · Clinic pages in the reading view: markdown tables become",
    "      appointment boards; bold status text becomes a pill. */",
    'html[data-fcx-links="on"] .fcx-prose table {',
    "  border-collapse: separate; border-spacing: 0; width: 100%; overflow: hidden;",
    "  border-radius: 12px; border: 1px solid color-mix(in oklab, var(--accent-live, #2979ff) 20%, var(--border));",
    "}",
    'html[data-fcx-links="on"] .fcx-prose thead th {',
    "  background: color-mix(in oklab, var(--accent-live, #2979ff) 10%, transparent);",
    "  text-transform: uppercase; letter-spacing: .07em; font-size: 11px;",
    "}",
    'html[data-fcx-links="on"] .fcx-prose tbody td { border-top: 1px solid var(--border); }',
    'html[data-fcx-links="on"] .fcx-prose tbody tr { transition: background-color .12s ease; }',
    'html[data-fcx-links="on"] .fcx-prose tbody tr:hover { background: color-mix(in oklab, var(--accent-live, #2979ff) 6%, transparent); }',
    'html[data-fcx-links="on"] .fcx-prose table strong {',
    "  display: inline-block; padding: 1px 9px; border-radius: 999px;",
    "  font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;",
    "  background: color-mix(in oklab, var(--accent-live, #2979ff) 15%, transparent);",
    "  color: var(--accent-live, #2979ff);",
    "}",
  ].join("\n");

  ctx.registerCss(LINKS_CSS);

  /* html flags so the CSS can react to settings and unload cleanly */
  function applyAttrs() {
    try {
      if (sblOwnsSidebar()) { clearAttrs(); return; } // SBL owns the sidebar
      var root = document.documentElement;
      root.setAttribute("data-fcx-links", "on");
      if (cfg.hideCore) root.setAttribute("data-fcx-links-core", "hide");
      else root.removeAttribute("data-fcx-links-core");
    } catch (e) {
      /* non-fatal */
    }
  }

  function clearAttrs() {
    try {
      var root = document.documentElement;
      root.removeAttribute("data-fcx-links");
      root.removeAttribute("data-fcx-links-core");
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
            title: (file === "Patients" && "Patient List") || (file === "SurgeryTracker" && "Surgery Tracker") || (file === "ContactLens" && "Contact Lens") || file,
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

  var CONTENT_VERSION = 6;

  /** Exact v3 Appointment template (what pre-1.4 installs carry). */
  var V3_APPOINTMENT =
    "---\nfcxui: dashboard\ntitle: Appointment\n---\n\n" +
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
    FENCE + "ui-note-cards\nfolder: Database/Patients\nlimit: 3\n" + FENCE + "\n";

  /** Exact v4 appointment template (what 1.4.x installs carry). */
  var V4_APPOINTMENT =
    "---\nfcxui: dashboard\ntitle: Appointment\n---\n\n" +
    "# Appointment book\n\n" +
    "The interactive book — the board below carries the day book, a week strip, the month calendar and the booking form; every action writes straight back into this page's table. " +
    "The dashboard's flow tracker, Today's-patients tabs and revenue tiles read this table.\n" +
    "Statuses: **booked** · **arrived** · **in-exam** · **optics** · **billing** · **done** · **no-show**\n\n" +
    "| Time | Date | Patient | MR | Visit type | Status | Fee |\n" +
    "| --- | --- | --- | --- | --- | --- | --- |\n" +
    "| 09:00 |  | Ravi Kumar | MR-1042 | Follow-up · IOP recheck | done | 300 |\n" +
    "| 09:45 |  | Meena Shah | MR-0997 | Visual field baseline | done | 500 |\n" +
    "| 10:30 |  | Arjun Patel | MR-0731 | Refraction review | in-exam | 600 |\n" +
    "| 11:15 |  | Lakshmi Iyer | MR-2281 | New case · full exam | arrived | 1200 |\n" +
    "| 12:00 |  | Karthik S | MR-2282 | Contact lens fitting | optics | 800 |\n" +
    "| 12:40 |  | Nithya Hari | MR-2283 | Spectacle pickup | billing | 450 |\n" +
    "| 16:00 |  | Farhan Ali | MR-2284 | Post-op review | booked | 400 |\n" +
    "| 16:30 |  | Ananya Rao | MR-2285 | Follow-up · refraction | booked | 300 |\n" +
    "| 17:00 |  | Gopal Menon | MR-2286 | Dry-eye workup | booked | 700 |\n" +
    "| 17:20 |  | Suresh Babu | MR-2287 | Repeat IOP | no-show | 300 |\n\n" +
    FENCE + "ui-appointment\n" + FENCE + "\n\n" +
    "## House rules\n\n" +
    "- Rows with an empty Date belong to today; a booking made for another day carries its date.\n" +
    "- Walk-ins slot into free times; mark **no-show** after 15 minutes.\n" +
    "- The Fee column feeds the dashboard revenue — plain numbers or `₹`.\n" +
    "- Rows whose MR matches a patient file open that file with one click.\n\n" +
    "## Waiting room\n\n" +
    FENCE + "ui-note-cards\nfolder: Database/Patients\nlimit: 3\n" + FENCE + "\n";

  /** Sentinel phrases from older stock templates — a page carrying one is
      untouched stock and may be refreshed to the current template.
      Hand-edited pages never carry them and are left alone. Dashboard and
      Exams are retired (v17) — the app seed deletes those files, so they
      are no longer refreshed here. */
  var STOCK_MARKERS = {
    Appointment: [
      "The interactive book — the board below carries",
      "## House rules",
    ],
    Patients: [
      "One file per patient under",
    ],
    Reports: [
      "## What is counted",
    ],
  };

  /** Replace untouched v3/v4 stock pages with the v5 templates.
      Hand-edited pages never match and are left alone. */
  function refreshStockPages() {
    if ((cfg.contentVersion || 0) >= CONTENT_VERSION) return Promise.resolve(0);
    var updated = 0;
    var pairs = [
      ["Appointment", [V3_APPOINTMENT, V4_APPOINTMENT]],
      ["Patients", []],
      ["Reports", []],
    ];
    var chain = Promise.resolve();
    pairs.forEach(function (pair) {
      chain = chain.then(function () {
        return ctx.app
          .getNoteContent(pagePath(pair[0]))
          .then(function (content) {
            var isStock =
              content !== null &&
              (pair[1].some(function (old) {
                return content === old;
              }) ||
                (STOCK_MARKERS[pair[0]] || []).some(function (marker) {
                  return content.indexOf(marker) !== -1;
                }));
            if (isStock) {
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

  /** Nav click: create-with-template when missing, otherwise open.
      Clinic pages always land in reading mode so they render as UI. */
  function openPage(file) {
    var path = pagePath(file);
    return ctx.app.getNoteContent(path).then(function (existing) {
      var open = existing === null
        ? ctx.app
            .createNote(path, {
              title: (file === "Patients" && "Patient List") || (file === "SurgeryTracker" && "Surgery Tracker") || (file === "ContactLens" && "Contact Lens") || file,
              content: pageContent(file),
            })
            .catch(function () {
              /* createNote already opened the note */
            })
        : ctx.app.openNote(path);
      return open.then(function () {
        ctx.app.setMode("read");
      });
    });
  }

  /* ========================= sidebar section UI ========================= */

  var instances = [];

  function buildInstance(host) {
    /* remount into the same host (StrictMode-style double effects):
       drop the previous tree first so trees never pile up */
    while (host.firstChild) host.removeChild(host.firstChild);
    if (sblOwnsSidebar()) return; // SBL owns the sidebar — mount nothing

    var inst = { el: null, navEls: {} };
    var el = h(
      "div",
      "display:flex;flex-direction:column;gap:8px;padding:6px 2px 10px;font-size:12.5px;color:" + C.fg + ";min-width:0;",
    );
    inst.el = el;

    /* --- clinical page nav, grouped (navigation only — no stat tiles) --- */
    var nav = h("div", "display:flex;flex-direction:column;gap:2px;");
    var lastGroup = null;
    PAGES.forEach(function (p) {
      if (p.group !== lastGroup) {
        lastGroup = p.group;
        nav.appendChild(label(p.group));
      }
      var row = h(
        "div",
        "display:flex;align-items:center;gap:8px;height:32px;padding:0 8px;border-radius:9px;cursor:pointer;min-width:0;",
      );
      row.className = "fcx-links-nav-item";
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");
      row.title = p.desc;
      var ic = icon(p.icon, 15, C.dim);
      var text = h("span", "flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12.5px;font-weight:600;", p.label);
      var go = icon("arrow", 13, C.dim);
      go.setAttribute("class", "fcx-links-go");
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

    host.appendChild(el);
    instances.push(inst);
    renderActive(inst);
  }

  function renderActive(inst) {
    renderActivePath(inst, ctx.app.getActiveNote() || "");
  }

  function refreshInstances() {
    instances.forEach(function (inst) {
      if (inst.el && inst.el.isConnected) renderActive(inst);
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
    icon: "Compass",
    order: -30,
    mount: function (host) {
      buildInstance(host);
    },
    destroy: function () {
      reapInstances();
    },
  });

  /* ====================== commands, ribbon, events ====================== */

  /* The clinic KPI dashboard page is retired (v17) and the "Front desk"
     page itself is retired too (v19 — the clinic removed the page; the
     appointment book IS the desk landing now). "open-dashboard" kept its
     id (older stock pages carry ui-actions buttons referencing it) but
     now opens the appointment book via the same openPage path. */
  function openFrontDesk() {
    return openPage("Appointment");
  }

  ctx.registerCommand({
    id: "open-dashboard",
    title: "Focuslinks: open the appointment book",
    icon: "Gauge",
    run: function () {
      void openFrontDesk();
    },
  });

  ctx.registerCommand({
    id: "open-appointments",
    title: "Focuslinks: open appointment book",
    icon: "CalendarDays",
    run: function () {
      void openPage("Appointment");
    },
  });

  ctx.registerCommand({
    id: "open-recalls",
    title: "Focuslinks: open the recall board",
    icon: "BellRing",
    run: function () {
      void openPage("Recalls");
    },
  });

  ctx.registerCommand({
    id: "open-billing",
    title: "Focuslinks: open billing & dispensing",
    icon: "Receipt",
    run: function () {
      void openPage("Billing");
    },
  });

  ctx.registerCommand({
    id: "new-appointment",
    title: "Focuslinks: go to appointment book",
    icon: "CalendarDays",
    run: function () {
      void openPage("Appointment");
    },
  });

  ctx.registerCommand({
    id: "rebuild-pages",
    title: "Focuslinks: recreate missing clinic pages",
    icon: "RefreshCcw",
    run: function () {
      void ensurePages().then(function (n) {
        ctx.showToast(
          n > 0
            ? "Focuslinks: recreated " + n + " clinic page" + (n === 1 ? "" : "s")
            : "Focuslinks: all clinic pages already exist",
        );
        refreshInstances();
      });
    },
  });

  ctx.addRibbonIcon("Compass", "Open the appointment book", function () {
    void openFrontDesk();
  });

  /* keep the navigator's active highlight in sync with the workspace */
  ctx.registerEvent("active-note-changed", function (payload) {
    var path = payload && typeof payload.path === "string" ? payload.path : ctx.app.getActiveNote() || "";
    instances.forEach(function (inst) {
      if (inst.el && inst.el.isConnected) renderActivePath(inst, path);
    });
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
    box.appendChild(label("Focuslinks navigation"));
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
    var foot = h(
      "div",
      "font-size:10.5px;line-height:1.55;color:" + C.dim + ";padding-top:4px;",
    );
    foot.appendChild(
      h(
        "span",
        "",
        "Pure navigation — every entry opens as a full clinical UI in the center panel, and each page docks its own tools in the right panel.",
      ),
    );
    box.appendChild(foot);
    el.appendChild(box);
  });

  /* ================================ boot ================================ */

  if (sblOwnsSidebar()) { standDown(); } else {
    applyAttrs();
    void ensurePages()
      .then(function () {
        return refreshStockPages();
      })
      .then(function (refreshed) {
        cfg.seeded = true;
        persist();
        if (refreshed > 0) {
          ctx.showToast(
            "Focuslinks: refreshed " + refreshed + " stock page" + (refreshed === 1 ? "" : "s") + " with the current clinical dashboard",
          );
        }
        refreshInstances();
      });
  }

  ctx.onunload = function () {
    clearAttrs();
  };
})(ctx);
