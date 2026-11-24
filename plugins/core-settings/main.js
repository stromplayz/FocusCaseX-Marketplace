/**
 * FocusCaseX — Core Settings (core plugin, marketplace payload v2.2.3).
 *
 * The settings surface becomes a core-owned layer, riding the exact
 * plugin + CSS system every other extension uses:
 *
 *   • polish  — accent seams on section heads, sticky navigation, focus
 *     rings that follow the live accent.
 *   • compact — tighter settings rows for small screens / fast hands.
 *
 * The seasonal snowfall / string-lights layer was RETIRED (v2.2.3): the
 * falling effect kept surprising clinics during real consults and is
 * gone everywhere — the theme presets keep their looks, none of them
 * animates the workspace anymore.
 *
 * Settings write through ctx.settings (the same deep-merge the Settings
 * modal uses), so nothing here is a second source of truth.
 *
 * Surfaces: CSS · Settings pane · Storage.
 */
(function (ctx) {
  "use strict";

  /* ---------------------------------------------------------------- */
  /* option state                                                      */

  var OPTIONS = [
    { key: "polish", label: "Settings polish (accent seams + sticky nav)", def: true },
    { key: "compact", label: "Compact rows (tighter settings density)", def: false },
  ];

  var data = {};
  for (var i = 0; i < OPTIONS.length; i++) data[OPTIONS[i].key] = OPTIONS[i].def;

  var ROOT_CLASS = "fcx-core-settings-on";

  /* ---------------------------------------------------------------- */
  /* class application                                                  */

  function apply() {
    var html = document.documentElement;
    html.classList.add(ROOT_CLASS);
    for (var i = 0; i < OPTIONS.length; i++) {
      var opt = OPTIONS[i];
      html.classList.toggle("fcx-core-settings-" + opt.key, data[opt.key] === true);
    }
    /* the retired snow layer: never started again, and any canvas a
       previous build left behind is removed on boot + unload */
    try {
      var stale = document.getElementById("fcx-pixel-snow");
      if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
      if (typeof window !== "undefined" && typeof window.__fcxSnowStop === "function") {
        window.__fcxSnowStop();
      }
    } catch (ignored) { }
  }

  function clear() {
    var html = document.documentElement;
    html.classList.remove(ROOT_CLASS);
    for (var i = 0; i < OPTIONS.length; i++) html.classList.remove("fcx-core-settings-" + OPTIONS[i].key);
  }

  /* ---------------------------------------------------------------- */
  /* stylesheet — token-driven, zero raw colors, steps() only          */

  var CSS = [
    "/* ---- Core Settings: pane ---- */",
    ".fcx-cs-head{margin:0 0 .25rem;font-weight:700;font-size:.875rem;}",
    ".fcx-cs-hint{margin:0 0 .75rem;font-size:.75rem;color:var(--muted-foreground);}",
    ".fcx-cs-row{display:flex;align-items:center;gap:.5rem;margin:0 0 .5rem;font-size:.8125rem;}",
    ".fcx-cs-row input[type=checkbox]{width:1rem;height:1rem;accent-color:var(--accent-live,var(--accent));}",
    ".fcx-cs-perm-row{display:flex;align-items:center;gap:.5rem;margin:0 0 .4rem;font-size:.75rem;}",
    ".fcx-cs-perm-name{font-family:var(--font-mono);font-weight:700;}",
    ".fcx-cs-perm-detail{color:var(--muted-foreground);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
    ".fcx-cs-perm-revoke{border:1px solid var(--border);background:transparent;color:var(--foreground);font-family:var(--font-mono);font-size:.625rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:.25rem .5rem;cursor:pointer;}",
    ".fcx-cs-perm-revoke:hover{background:color-mix(in srgb,var(--accent-live,var(--accent)) 14%,transparent);}",

    "/* ---- Core Settings: polish ---- */",
    "html.fcx-core-settings-on.fcx-core-settings-polish [role=\"dialog\"] h3{letter-spacing:.02em;}",
    "html.fcx-core-settings-on.fcx-core-settings-polish [role=\"dialog\"] h3::before{content:\"\";display:inline-block;width:6px;height:6px;margin-right:.5rem;background:var(--accent-live,var(--accent));vertical-align:middle;}",
    "html.fcx-core-settings-on.fcx-core-settings-polish [role=\"dialog\"] nav button{transition:none;}",
    "html.fcx-core-settings-on.fcx-core-settings-polish [role=\"dialog\"] nav button[aria-current=\"page\"]{box-shadow:2px 2px 0 0 color-mix(in srgb,var(--foreground) 22%,transparent);}",
    "html.fcx-core-settings-on.fcx-core-settings-polish [role=\"dialog\"] section{scroll-margin-top:1rem;}",

    "/* ---- Core Settings: compact ---- */",
    "html.fcx-core-settings-on.fcx-core-settings-compact [role=\"dialog\"] section{margin-bottom:1.1rem;}",
    "html.fcx-core-settings-on.fcx-core-settings-compact [role=\"dialog\"] .rounded-xl{padding-block:.55rem;}",
  ].join("\n");
  if (typeof ctx.registerCss === "function") ctx.registerCss(CSS);

  /* ---------------------------------------------------------------- */
  /* settings pane                                                     */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  function save() {
    void ctx.saveData(data);
  }

  ctx.addSettingsPane(function (container) {
    container.replaceChildren();

    container.appendChild(el("p", "fcx-cs-head", "Core Settings"));
    container.appendChild(
      el(
        "p",
        "fcx-cs-hint",
        "The settings surface as a core extension — chrome polish and row density. Toggles apply instantly.",
      ),
    );

    var _loop = function (i) {
      var opt = OPTIONS[i];
      var row = el("label", "fcx-cs-row");
      var check = document.createElement("input");
      check.type = "checkbox";
      check.checked = data[opt.key] === true;
      check.addEventListener("change", function () {
        data[opt.key] = check.checked;
        save();
        apply();
      });
      row.appendChild(check);
      row.appendChild(el("span", null, " " + opt.label));
      container.appendChild(row);
    };
    for (var i = 0; i < OPTIONS.length; i++) _loop(i);

    /* ---- extension permissions — the clinic stays in control ---- */
    var permsHead = el("p", "fcx-cs-head", "Extension permissions");
    permsHead.style.marginTop = "1rem";
    container.appendChild(permsHead);
    var permsHint = el(
      "p",
      "fcx-cs-hint",
      "Folders and access each extension was granted. Revoking takes effect immediately — the extension will simply ask again the next time it needs access.",
    );
    container.appendChild(permsHint);

    var PERMS_KEY = "fcx.plugin-perms.v1";
    var renderPerms = function () {
      var listNode = el("div", "fcx-cs-perms");
      var grants = {};
      try {
        grants = JSON.parse(window.localStorage.getItem(PERMS_KEY) || "{}") || {};
      } catch (ignored) {
        grants = {};
      }
      var ids = Object.keys(grants);
      if (ids.length === 0) {
        listNode.appendChild(el("p", "fcx-cs-hint", "No extensions have been granted folder or network access yet."));
        container.appendChild(listNode);
        return;
      }
      for (var g = 0; g < ids.length; g++) {
        (function (id) {
          var grant = grants[id] || {};
          var rowNode = el("div", "fcx-cs-perm-row");
          var labelNode = el("span", "fcx-cs-perm-name", id);
          var folders = Array.isArray(grant.folders) ? grant.folders : [];
          var detail = folders.length > 0
            ? folders.map(function (f) { return f + "/"; }).join(", ")
            : "network only";
          if (grant.fetch === true && folders.length > 0) detail += " + network";
          var detailNode = el("span", "fcx-cs-perm-detail", detail);
          var revoke = el("button", "fcx-cs-perm-revoke", "Revoke");
          revoke.type = "button";
          revoke.addEventListener("click", function () {
            try {
              var next = JSON.parse(window.localStorage.getItem(PERMS_KEY) || "{}") || {};
              delete next[id];
              window.localStorage.setItem(PERMS_KEY, JSON.stringify(next));
              try {
                window.dispatchEvent(new CustomEvent("fcx:perm-changed", { detail: { pluginId: id } }));
              } catch (ignored) { }
              ctx.showToast("Access revoked for " + id);
              refreshPane();
            } catch (ignored) { }
          });
          rowNode.appendChild(labelNode);
          rowNode.appendChild(detailNode);
          rowNode.appendChild(revoke);
          listNode.appendChild(rowNode);
        })(ids[g]);
      }
      container.appendChild(listNode);
    };
    var refreshPane = function () {
      // repaint the permissions list in place after a revoke
      var existing = container.querySelector(".fcx-cs-perms");
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      renderPerms();
    };
    renderPerms();
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
    try {
      var stale = document.getElementById("fcx-pixel-snow");
      if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
      if (typeof window !== "undefined" && typeof window.__fcxSnowStop === "function") {
        window.__fcxSnowStop();
      }
    } catch (ignored) { }
  };
})(ctx);
