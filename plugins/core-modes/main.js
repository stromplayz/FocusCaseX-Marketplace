/**
 * FocusCaseX — Core Modes (core plugin, marketplace payload v2.2).
 *
 * The app already ships two ways to work: Clinic Mode (the chart is
 * sacred, chrome is quiet) and Dev Mode (customization unlocked —
 * snippets host, capsule spec/logic editing, UI page editing). This
 * core extension owns that switch as a first-class system:
 *
 *   • One tap (or one command) flips Clinical ↔ Developer — the sidebar
 *     badge, the snippets host and the capsule studio all follow, since
 *     they already read settings.general.developerMode. Writes go
 *     through ctx.settings, so nothing here is a second source of truth.
 *   • Per-mode extension bundles: assign any installed extension to
 *     Clinical, Developer or both. Switching modes enables the target
 *     mode's bundle and pauses (disables) extensions assigned ONLY to
 *     the other mode — everything unassigned stays untouched.
 *   • CSS per mode: html gains fcx-mode-clinical / fcx-mode-dev, so
 *     core CSS layers can restyle per mode without new plumbing.
 *
 * Surfaces: Commands · Settings pane · CSS · Storage.
 */
(function (ctx) {
  "use strict";

  /* ---------------------------------------------------------------- */
  /* state                                                             */

  var MODES = {
    clinical: {
      label: "Clinical mode",
      blurb: "The everyday charting profile — quiet chrome, clinic extensions on, snippets parked.",
      icon: "Stethoscope",
    },
    developer: {
      label: "Developer mode",
      blurb: "The customization profile — snippets host, capsule spec/logic editing and UI page editing unlock.",
      icon: "Code2",
    },
  };

  /** persisted: which mode is active + which extensions belong to which mode */
  var data = { mode: "", bundles: { clinical: [], developer: [] } };
  /** in-memory mirror of the settings gate so the pane reflects reality */
  var devModeNow = false;

  function save() {
    void ctx.saveData(data);
  }

  function ensureLists() {
    if (!Array.isArray(data.bundles.clinical)) data.bundles.clinical = [];
    if (!Array.isArray(data.bundles.developer)) data.bundles.developer = [];
  }

  /* ---------------------------------------------------------------- */
  /* apply                                                             */

  function applyMode(mode, opts) {
    var silent = opts && opts.silent === true;
    devModeNow = mode === "developer";

    /* 1) the app-wide gate — sidebar badge, snippets host, capsule
          studio and UI page editing all read this one flag */
    if (ctx.settings && typeof ctx.settings.update === "function") {
      ctx.settings.update({ general: { developerMode: devModeNow } });
    }

    /* 2) mode CSS hooks for every core CSS layer */
    var html = document.documentElement;
    html.classList.toggle("fcx-mode-dev", devModeNow);
    html.classList.toggle("fcx-mode-clinical", !devModeNow);
    html.setAttribute("data-fcx-mode", devModeNow ? "developer" : "clinical");

    /* 3) per-mode extension bundles — enable the target's set, pause
          extensions that live ONLY in the other mode */
    if (ctx.extensions && typeof ctx.extensions.list === "function") {
      ensureLists();
      var mine = {};
      var other = {};
      var otherList = devModeNow ? data.bundles.clinical : data.bundles.developer;
      var i;
      for (i = 0; i < data.bundles[devModeNow ? "developer" : "clinical"].length; i++) {
        mine[data.bundles[devModeNow ? "developer" : "clinical"][i]] = true;
      }
      for (i = 0; i < otherList.length; i++) other[otherList[i]] = true;

      var exts = ctx.extensions.list();
      for (i = 0; i < exts.length; i++) {
        var ext = exts[i];
        if (mine[ext.id] && !ext.enabled) {
          ctx.extensions.setEnabled(ext.id, true);
        } else if (other[ext.id] && !mine[ext.id] && ext.enabled) {
          ctx.extensions.setEnabled(ext.id, false);
        }
      }
    }

    data.mode = devModeNow ? "developer" : "clinical";
    save();
    if (!silent) {
      ctx.showToast((MODES[devModeNow ? "developer" : "clinical"] || {}).label + " — switched");
    }
  }

  /* ---------------------------------------------------------------- */
  /* commands                                                          */

  ctx.registerCommand({
    id: "mode-clinical",
    title: "Switch to Clinical mode",
    icon: "Stethoscope",
    hint: "quiet chrome, clinic extensions",
    run: function () {
      applyMode("clinical");
    },
  });

  ctx.registerCommand({
    id: "mode-developer",
    title: "Switch to Developer mode",
    icon: "Code2",
    hint: "snippets + customization unlocked",
    run: function () {
      applyMode("developer");
    },
  });

  ctx.registerCommand({
    id: "mode-toggle",
    title: "Toggle Clinical ↔ Developer mode",
    icon: "Repeat",
    hint: "flip the workspace profile",
    run: function () {
      applyMode(devModeNow ? "clinical" : "developer");
    },
  });

  /* ---------------------------------------------------------------- */
  /* settings pane                                                     */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  ctx.addSettingsPane(function (container) {
    renderPane(container);
  });

  /* The pane body — re-invoked in place after a mode switch so the
     cards and bundle checkboxes always reflect the live mode. */
  function renderPane(container) {
    container.replaceChildren();

    container.appendChild(el("p", "fcx-cs-head", "Core Modes"));
    container.appendChild(
      el(
        "p",
        "fcx-cs-hint",
        "Clinical and Developer profiles, each with its own extension bundle. Unassigned extensions stay on in both modes; snippets stay a developer-mode surface.",
      ),
    );

    /* mode switch row — active mode first */
    var modeRow = el("div", "fcx-modes-row");
    var order = devModeNow ? ["developer", "clinical"] : ["clinical", "developer"];
    for (var r = 0; r < order.length; r++) {
      (function (modeKey) {
        var spec = MODES[modeKey];
        var active = devModeNow === (modeKey === "developer");
        var card = el("button", "fcx-modes-card" + (active ? " fcx-modes-card-active" : ""));
        card.type = "button";
        card.setAttribute("aria-pressed", String(active));
        card.appendChild(el("p", "fcx-modes-title", spec.label + (active ? " — active" : "")));
        card.appendChild(el("p", "fcx-modes-blurb", spec.blurb));
        card.addEventListener("click", function () {
          applyMode(modeKey);
          if (container.isConnected) renderPane(container);
        });
        modeRow.appendChild(card);
      })(order[r]);
    }
    container.appendChild(modeRow);

    buildBundles(container);
  }

  function buildBundles(host) {
    /* bundle assignment grid */
    if (!ctx.extensions || typeof ctx.extensions.list !== "function") return;
    var exts = ctx.extensions.list();
    if (host.querySelector(".fcx-modes-bundles")) host.querySelector(".fcx-modes-bundles").remove();
    var wrap = el("div", "fcx-modes-bundles");
    wrap.appendChild(el("p", "fcx-modes-sub", "Per-mode extension bundles — tap a cell to assign"));

    var table = el("div", "fcx-modes-table");
    var head = el("div", "fcx-modes-tr fcx-modes-th");
    head.appendChild(el("span", "fcx-modes-ext", "Extension"));
    head.appendChild(el("span", null, "Clinical"));
    head.appendChild(el("span", null, "Developer"));
    table.appendChild(head);

    function cellState(id, modeKey) {
      ensureLists();
      return data.bundles[modeKey].indexOf(id) !== -1;
    }
    function toggleCell(id, modeKey) {
      ensureLists();
      var list = data.bundles[modeKey];
      var idx = list.indexOf(id);
      if (idx === -1) list.push(id);
      else list.splice(idx, 1);
      save();
      buildBundles(host);
    }

    for (var i = 0; i < exts.length; i++) {
      (function (ext) {
        var tr = el("div", "fcx-modes-tr");
        var name = el("span", "fcx-modes-ext", ext.name + (ext.core ? "  (core)" : ""));
        tr.appendChild(name);
        ["clinical", "developer"].forEach(function (modeKey) {
          var cell = el("button", "fcx-modes-cell" + (cellState(ext.id, modeKey) ? " fcx-modes-cell-on" : ""));
          cell.type = "button";
          cell.textContent = cellState(ext.id, modeKey) ? "\u2713" : "";
          cell.setAttribute("aria-label", ext.name + " in " + MODES[modeKey].label);
          cell.addEventListener("click", function () {
            toggleCell(ext.id, modeKey);
          });
          tr.appendChild(cell);
        });
        table.appendChild(tr);
      })(exts[i]);
    }
    wrap.appendChild(table);
    host.appendChild(wrap);
  }

  /* ---------------------------------------------------------------- */
  /* stylesheet                                                        */

  var CSS = [
    ".fcx-cs-head{margin:0 0 .25rem;font-weight:700;font-size:.875rem;}",
    ".fcx-cs-hint{margin:0 0 .75rem;font-size:.75rem;color:var(--muted-foreground);}",
    ".fcx-modes-row{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;}",
    "@media (max-width:520px){.fcx-modes-row{grid-template-columns:1fr;}}",
    ".fcx-modes-card{border:1px solid var(--border);border-radius:10px;background:var(--card);color:var(--card-foreground);padding:.6rem .7rem;text-align:left;cursor:pointer;}",
    ".fcx-modes-card-active{border-color:color-mix(in srgb,var(--accent-live,var(--accent)) 55%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent-live,var(--accent)) 40%,transparent);}",
    ".fcx-modes-title{margin:0;font-size:.8125rem;font-weight:700;}",
    ".fcx-modes-blurb{margin:.2rem 0 0;font-size:.6875rem;color:var(--muted-foreground);}",
    ".fcx-modes-sub{margin:.9rem 0 .4rem;font-size:.6875rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-foreground);}",
    ".fcx-modes-table{display:flex;flex-direction:column;gap:.25rem;}",
    ".fcx-modes-tr{display:grid;grid-template-columns:minmax(0,1fr) 5rem 5rem;align-items:center;gap:.375rem;}",
    "@media (max-width:420px){.fcx-modes-tr{grid-template-columns:minmax(0,1fr) 4rem 4rem;}}",
    ".fcx-modes-th{font-size:.625rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted-foreground);}",
    ".fcx-modes-th span:not(.fcx-modes-ext){text-align:center;}",
    ".fcx-modes-ext{font-size:.75rem;color:var(--foreground);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
    ".fcx-modes-cell{height:1.75rem;border:1px solid var(--border);border-radius:6px;background:transparent;color:var(--accent-live,var(--accent));font-size:.75rem;cursor:pointer;}",
    ".fcx-modes-cell-on{background:color-mix(in srgb,var(--accent-live,var(--accent)) 16%,transparent);border-color:color-mix(in srgb,var(--accent-live,var(--accent)) 45%,transparent);}",
  ].join("\n");
  if (typeof ctx.registerCss === "function") ctx.registerCss(CSS);

  /* ---------------------------------------------------------------- */
  /* boot                                                              */

  void ctx.loadData().then(function (saved) {
    if (saved && typeof saved === "object") {
      if (saved.mode === "clinical" || saved.mode === "developer") data.mode = saved.mode;
      if (saved.bundles && typeof saved.bundles === "object") {
        data.bundles = {
          clinical: Array.isArray(saved.bundles.clinical) ? saved.bundles.clinical.slice() : [],
          developer: Array.isArray(saved.bundles.developer) ? saved.bundles.developer.slice() : [],
        };
      }
    }
    ensureLists();
    /* resume the persisted mode silently — only after the user has
       switched once (empty data.mode = follow whatever the app had) */
    if (ctx.settings && typeof ctx.settings.get === "function") {
      try {
        var s = ctx.settings.get();
        devModeNow = Boolean(s && s.general && s.general.developerMode);
      } catch {
        devModeNow = false;
      }
    }
    if (data.mode && ((data.mode === "developer") !== devModeNow)) {
      applyMode(data.mode, { silent: true });
    } else {
      document.documentElement.classList.toggle("fcx-mode-dev", devModeNow);
      document.documentElement.classList.toggle("fcx-mode-clinical", !devModeNow);
      document.documentElement.setAttribute("data-fcx-mode", devModeNow ? "developer" : "clinical");
    }
  });

  ctx.onunload = function () {
    /* mode classes persist deliberately — unloading the switcher should
       never yank the workspace into a different profile mid-session */
  };
})(ctx);
