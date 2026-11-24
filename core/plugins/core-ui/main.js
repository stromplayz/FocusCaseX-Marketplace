/**
 * FocusCaseX — Core UI (the Update v2 payload).
 *
 * Published ONLY through the FocusCaseX-Marketplace (public repo, GitHub
 * Pages). The core-updater pulls this plugin when the user confirms the
 * Update v2 banner — it is never bundled with the app, which is what
 * makes the marketplace the delivery channel for UI evolution.
 *
 * Core UI means the app's default chrome — the entire settings surface,
 * the sidebar, the left/right panels and the tab strips — becomes
 * customizable through the exact same plugin + CSS system every other
 * extension uses. Each toggle below flips a class on <html> and the
 * stylesheet responds; more customization knobs are coded to land here in
 * later core versions without touching the app itself.
 *
 * Surfaces: CSS · Settings pane · Storage.
 */
(function (ctx) {
  "use strict";

  /* ---------------------------------------------------------------- */
  /* customization state                                               */

  var OPTIONS = [
    { key: "polish", label: "Core polish (accent seams + quiet chrome)", css: "fcx-core-ui-polish", def: true },
    { key: "float", label: "Floating panels (inset, rounded, shadowed)", css: "fcx-core-ui-float", def: false },
    { key: "pill", label: "Pill tabs (rounded, accent-active)", css: "fcx-core-ui-pill", def: true },
    { key: "compact", label: "Compact chrome (tighter rows + tabs)", css: "fcx-core-ui-compact", def: false },
    { key: "wide", label: "Wide right panel (24rem context)", css: "fcx-core-ui-wide", def: false },
    { key: "glow", label: "Accent glow on the app frame", css: "fcx-core-ui-glow", def: false },
  ];

  var data = {};
  for (var i = 0; i < OPTIONS.length; i++) data[OPTIONS[i].key] = OPTIONS[i].def;

  var CSS_LOADED = "fcx-core-ui-on";

  function apply() {
    var html = document.documentElement;
    html.classList.add(CSS_LOADED);
    for (var i = 0; i < OPTIONS.length; i++) {
      var opt = OPTIONS[i];
      if (data[opt.key]) html.classList.add(opt.css);
      else html.classList.remove(opt.css);
    }
  }

  function clear() {
    var html = document.documentElement;
    html.classList.remove(CSS_LOADED);
    for (var i = 0; i < OPTIONS.length; i++) html.classList.remove(OPTIONS[i].css);
  }

  /* ---------------------------------------------------------------- */
  /* stylesheet — token-driven, targets the app's own chrome classes   */

  var CSS = [
    "/* Core UI v2 — chrome polish */",
    "html.fcx-core-ui-on.fcx-core-ui-polish aside.fcx-chrome{position:relative;}",
    "html.fcx-core-ui-on.fcx-core-ui-polish aside.fcx-chrome::before{content:\"\";position:absolute;top:0;bottom:0;width:2px;background:var(--accent-live,var(--accent));opacity:.55;pointer-events:none;z-index:1;}",
    "html.fcx-core-ui-on.fcx-core-ui-polish aside.fcx-chrome:first-of-type::before{right:auto;left:0;}",
    "html.fcx-core-ui-on.fcx-core-ui-polish aside.fcx-chrome:not(:first-of-type)::before{right:0;left:auto;}",
    "html.fcx-core-ui-on.fcx-core-ui-polish .fcx-tree-row{border-left:2px solid transparent;}",
    "html.fcx-core-ui-on.fcx-core-ui-polish .fcx-tree-row:hover{border-left-color:color-mix(in srgb,var(--accent-live,var(--accent)) 45%,transparent);}",

    "/* Floating panels */",
    "html.fcx-core-ui-on.fcx-core-ui-float aside.fcx-chrome{margin:.5rem;border-radius:calc(var(--radius,0.625rem) + 4px);border:1px solid var(--border);box-shadow:0 2px 14px color-mix(in srgb,var(--foreground) 8%,transparent);background:var(--card);overflow:hidden;}",
    "html.fcx-core-ui-on.fcx-core-ui-float.fcx-core-ui-polish aside.fcx-chrome::before{border-radius:inherit;}",

    "/* Pill tabs */",
    "html.fcx-core-ui-on.fcx-core-ui-pill .fcx-chrome.h-11 button{border-radius:9999px;margin:.25rem .125rem;padding-inline:.625rem;}",
    "html.fcx-core-ui-on.fcx-core-ui-pill .fcx-chrome.h-11 button:hover{background:var(--accent);}",
    "html.fcx-core-ui-on.fcx-core-ui-pill .fcx-accent-fill{left:.75rem;right:.75rem;}",

    "/* Compact chrome */",
    "html.fcx-core-ui-on.fcx-core-ui-compact .fcx-tree-row{height:2rem;}",
    "html.fcx-core-ui-on.fcx-core-ui-compact .fcx-chrome.h-11{height:2.5rem;}",
    "html.fcx-core-ui-on.fcx-core-ui-compact aside.fcx-chrome{font-size:.8125rem;}",

    "/* Wide right panel */",
    "html.fcx-core-ui-on.fcx-core-ui-wide aside.fcx-chrome.w-80{width:24rem;}",

    "/* Accent glow */",
    "html.fcx-core-ui-on.fcx-core-ui-glow aside.fcx-chrome{box-shadow:0 0 0 1px color-mix(in srgb,var(--accent-live,var(--accent)) 22%,transparent),0 0 22px color-mix(in srgb,var(--accent-live,var(--accent)) 12%,transparent);}",

    "/* Quiet chrome polish (scrollbars) */",
    "html.fcx-core-ui-on.fcx-core-ui-polish *::-webkit-scrollbar{width:8px;height:8px;}",
    "html.fcx-core-ui-on.fcx-core-ui-polish *::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--foreground) 18%,transparent);border-radius:4px;}",
    "html.fcx-core-ui-on.fcx-core-ui-polish *::-webkit-scrollbar-thumb:hover{background:color-mix(in srgb,var(--accent-live,var(--accent)) 45%,transparent);}",
  ].join("\n");

  if (typeof ctx.registerCss === "function") ctx.registerCss(CSS);

  /* ---------------------------------------------------------------- */
  /* settings pane — the Core UI v2 customization panel                */

  ctx.addSettingsPane(function (container) {
    container.replaceChildren();

    var head = document.createElement("p");
    head.textContent = "Core UI (v2)";
    head.style.cssText = "margin:0 0 .25rem;font-weight:700;font-size:.875rem;";
    var hint = document.createElement("p");
    hint.textContent =
      "Customizes the app's default chrome — sidebar, panels, tabs and settings surface. Delivered through the FocusCaseX Marketplace core; more knobs land with future core versions.";
    hint.style.cssText = "margin:0 0 .75rem;font-size:.75rem;color:var(--muted-foreground);";
    container.appendChild(head);
    container.appendChild(hint);

    for (var i = 0; i < OPTIONS.length; i++) {
      (function (opt) {
        var row = document.createElement("label");
        row.style.cssText = "display:flex;align-items:center;gap:.5rem;margin:0 0 .5rem;font-size:.8125rem;";
        var check = document.createElement("input");
        check.type = "checkbox";
        check.checked = data[opt.key] === true;
        check.addEventListener("change", function () {
          data[opt.key] = check.checked;
          void ctx.saveData(data);
          apply();
        });
        row.appendChild(check);
        var label = document.createElement("span");
        label.textContent = " " + opt.label;
        row.appendChild(label);
        container.appendChild(row);
      })(OPTIONS[i]);
    }

    var note = document.createElement("p");
    note.textContent = "Applied live — nothing here touches your clinical data.";
    note.style.cssText = "margin:.75rem 0 0;font-size:.6875rem;color:var(--muted-foreground);";
    container.appendChild(note);
  });

  /* ---------------------------------------------------------------- */
  /* boot                                                              */

  void ctx.loadData().then(function (saved) {
    if (saved && typeof saved === "object") {
      for (var i = 0; i < OPTIONS.length; i++) {
        var key = OPTIONS[i].key;
        if (typeof saved[key] === "boolean") data[key] = saved[key];
      }
    }
    apply();
  });

  ctx.onunload = function () {
    clear();
  };
})(ctx);
