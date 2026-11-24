/**
 * FocusCaseX sample plugin — Tag Summary.
 * Registers a "tag-summary" view that lists vault tags with note counts.
 * The panel re-renders whenever the vault changes.
 */
(function (ctx) {
  "use strict";

  var el = null;

  function render() {
    if (!el) return;
    ctx.app
      .getNotes()
      .then(function (notes) {
        var counts = {};
        notes.forEach(function (n) {
          (n.tags || []).forEach(function (t) {
            counts[t] = (counts[t] || 0) + 1;
          });
        });
        var tags = Object.keys(counts).sort();
        el.textContent = "";
        if (!tags.length) {
          var empty = document.createElement("p");
          empty.style.cssText = "font-size:12px;color:var(--muted-foreground);padding:8px 4px;";
          empty.textContent = "No tags in the vault yet.";
          el.appendChild(empty);
          return;
        }
        tags.forEach(function (tag) {
          var row = document.createElement("div");
          row.style.cssText =
            "display:flex;justify-content:space-between;align-items:center;" +
            "padding:6px 8px;border-radius:8px;font-size:13px;cursor:default;";
          row.style.background = "transparent";
          var name = document.createElement("span");
          name.textContent = "#" + tag;
          name.style.cssText = "color:var(--accent-live,#34d399);font-weight:600;";
          var count = document.createElement("span");
          count.textContent = counts[tag] + (counts[tag] === 1 ? " note" : " notes");
          count.style.cssText = "font-size:11px;color:var(--muted-foreground);";
          row.appendChild(name);
          row.appendChild(count);
          el.appendChild(row);
        });
      })
      .catch(function () {});
  }

  ctx.registerView("tag-summary", {
    mount: function (host) {
      el = document.createElement("div");
      el.style.cssText = "display:flex;flex-direction:column;gap:2px;padding:4px 2px;";
      host.appendChild(el);
      render();
    },
    destroy: function () {
      el = null;
    },
  });

  ctx.registerCommand({
    id: "show-tags",
    title: "Open tag summary",
    icon: "Hash",
    run: function () {
      ctx.activateView("tag-summary");
    },
  });

  ctx.addRibbonIcon("Hash", "Open tag summary", function () {
    ctx.activateView("tag-summary");
  });

  ctx.registerEvent("vault-changed", render);

  ctx.onunload = function () {
    el = null;
  };
})(ctx);
