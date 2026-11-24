/**
 * FocusCaseX — Core Commands (core plugin, marketplace payload v2.2).
 *
 * The commands section becomes a core-owned surface: the full command
 * registry (built-ins + every live extension's contributions) listed in
 * one filterable pane inside Settings › Extensions › Core Commands,
 * with one-tap RUN buttons. Commands themselves stay single-source —
 * the host registry — this plugin only renders and runs them through
 * ctx.commands (no second registry, no stale copies).
 *
 * Also contributes the palette-opening command so the section and the
 * launcher feel like one system.
 *
 * Surfaces: Settings pane · Commands · Storage.
 */
(function (ctx) {
  "use strict";

  /* ---------------------------------------------------------------- */
  /* state                                                             */

  var data = { lastRun: "" };
  var MAX_ROWS = 120;

  function save() {
    void ctx.saveData(data);
  }

  /* ---------------------------------------------------------------- */
  /* pane helpers                                                      */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  function runCommand(id, title) {
    if (!ctx.commands || typeof ctx.commands.run !== "function") return;
    var ok = ctx.commands.run(id);
    data.lastRun = ok ? id : "";
    save();
    ctx.showToast(ok ? title + " — ran" : "Command not available right now.");
  }

  function buildList(container, query) {
    var listWrap = container.querySelector(".fcx-cmds-list");
    if (!listWrap || !ctx.commands || typeof ctx.commands.list !== "function") return;
    var cmds = ctx.commands.list();
    var q = String(query || "").trim().toLowerCase();
    var filtered = q
      ? cmds.filter(function (c) {
          return (
            c.title.toLowerCase().includes(q) ||
            c.hint.toLowerCase().includes(q) ||
            (c.pluginId || "").toLowerCase().includes(q)
          );
        })
      : cmds;

    listWrap.replaceChildren();
    container.querySelector(".fcx-cmds-count").textContent =
      filtered.length + " of " + cmds.length + " commands" + (q ? " · filtered" : "");

    var rows = filtered.slice(0, MAX_ROWS);
    for (var i = 0; i < rows.length; i++) {
      (function (cmd) {
        var row = el("div", "fcx-cmds-row");
        var main = el("div", "fcx-cmds-main");
        main.appendChild(el("p", "fcx-cmds-title", cmd.title));
        var meta = cmd.hint;
        var hintEl = el("p", "fcx-cmds-hint", meta);
        main.appendChild(hintEl);
        row.appendChild(main);
        var btn = el("button", "fcx-cmds-run", "RUN");
        btn.type = "button";
        btn.setAttribute("aria-label", "Run command: " + cmd.title);
        btn.addEventListener("click", function () {
          runCommand(cmd.id, cmd.title);
        });
        row.appendChild(btn);
        listWrap.appendChild(row);
      })(rows[i]);
    }

    if (filtered.length > MAX_ROWS) {
      listWrap.appendChild(
        el("p", "fcx-cmds-hint", "+" + (filtered.length - MAX_ROWS) + " more — narrow the filter to see them."),
      );
    }
    if (filtered.length === 0) {
      listWrap.appendChild(el("p", "fcx-cmds-hint", "No command matches that filter."));
    }
  }

  /* ---------------------------------------------------------------- */
  /* settings pane — the commands section                              */

  ctx.addSettingsPane(function (container) {
    container.replaceChildren();

    container.appendChild(el("p", "fcx-cs-head", "Core Commands"));
    container.appendChild(
      el(
        "p",
        "fcx-cs-hint",
        "Every live user command — built-ins plus each extension's own — listed here as it runs right now. One tap runs it.",
      ),
    );

    var input = document.createElement("input");
    input.type = "search";
    input.className = "fcx-cmds-filter";
    input.placeholder = "Filter commands — title, hint or extension id…";
    input.setAttribute("aria-label", "Filter commands");
    input.addEventListener("input", function () {
      buildList(container, input.value);
    });
    container.appendChild(input);

    var count = el("p", "fcx-cmds-count", "");
    container.appendChild(count);

    var listWrap = el("div", "fcx-cmds-list");
    container.appendChild(listWrap);

    buildList(container, "");
  });

  /* ---------------------------------------------------------------- */
  /* commands of our own                                               */

  ctx.registerCommand({
    id: "open-palette",
    title: "Open command palette",
    icon: "TerminalSquare",
    hint: "the launcher for every command",
    run: function () {
      if (ctx.commands && typeof ctx.commands.run === "function") {
        ctx.commands.run("open-palette"); /* delegate to the builtin */
      }
    },
  });

  /* ---------------------------------------------------------------- */
  /* stylesheet                                                        */

  var CSS = [
    ".fcx-cs-head{margin:0 0 .25rem;font-weight:700;font-size:.875rem;}",
    ".fcx-cs-hint{margin:.15rem 0 .75rem;font-size:.75rem;color:var(--muted-foreground);}",
    ".fcx-cmds-filter{width:100%;border:1px solid var(--border);border-radius:8px;background:var(--card);color:var(--card-foreground);padding:.5rem .75rem;font-size:.8125rem;}",
    ".fcx-cmds-filter:focus{outline:2px solid var(--accent-live,var(--accent));outline-offset:1px;}",
    ".fcx-cmds-count{margin:.5rem 0 .35rem;font-family:var(--font-mono,monospace);font-size:.65rem;color:var(--muted-foreground);}",
    ".fcx-cmds-run{display:inline-flex;align-items:center;justify-content:center;border:2px solid color-mix(in srgb,var(--foreground) 30%,transparent);border-radius:0;background:var(--accent-live,var(--accent));color:var(--accent-foreground);box-shadow:2px 2px 0 0 color-mix(in srgb,var(--foreground) 30%,transparent);font-family:var(--font-mono,monospace);font-size:.625rem;font-weight:700;letter-spacing:.08em;padding:.3rem .5rem;cursor:pointer;flex:none;}",
    ".fcx-cmds-run:active{translate:1px 1px;box-shadow:1px 1px 0 0 color-mix(in srgb,var(--foreground) 30%,transparent);}",
    ".fcx-cmds-list{display:flex;flex-direction:column;gap:.375rem;max-height:34vh;overflow-y:auto;padding-right:2px;}",
    ".fcx-cmds-row{display:flex;align-items:center;gap:.625rem;border:1px solid var(--border);border-radius:8px;background:var(--card);padding:.4rem .55rem;}",
    ".fcx-cmds-main{min-width:0;flex:1;}",
    ".fcx-cmds-title{margin:0;font-size:.8125rem;font-weight:600;color:var(--foreground);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
    ".fcx-cmds-hint{margin:.1rem 0 0;font-size:.6875rem;color:var(--muted-foreground);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
    "@media (max-width:520px){.fcx-cmds-row{flex-wrap:wrap;}}",
  ].join("\n");
  if (typeof ctx.registerCss === "function") ctx.registerCss(CSS);

  /* ---------------------------------------------------------------- */
  /* boot                                                              */

  void ctx.loadData().then(function (saved) {
    if (saved && typeof saved === "object" && typeof saved.lastRun === "string") data.lastRun = saved.lastRun;
  });

  ctx.onunload = function () {
    /* CSS + pane are removed by the host; commands unregister themselves */
  };
})(ctx);
