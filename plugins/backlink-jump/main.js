/**
 * FocusCaseX sample plugin — Backlink Jump.
 * Finds notes that embed a [[link]] to the active note and cycles through
 * them with repeated runs of the same command.
 */
(function (ctx) {
  "use strict";

  var cursor = 0;

  function baseName(path) {
    var seg = String(path).split("/").pop() || "";
    return seg.replace(/\.md$/i, "").toLowerCase();
  }

  function findBacklinks(activePath) {
    var target = baseName(activePath);
    if (!target) return Promise.resolve([]);
    return ctx.app.getNotes().then(function (notes) {
      var found = [];
      var checks = notes.map(function (n) {
        return ctx.app.getNoteContent(n.path).then(function (content) {
          if (!content || n.path === activePath) return;
          var re = new RegExp("\\[\\[[^\\]]*" + target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[^\\]]*\\]\\]", "i");
          if (re.test(content)) found.push(n);
        });
      });
      return Promise.all(checks).then(function () {
        return found;
      });
    });
  }

  ctx.registerCommand({
    id: "jump-next-backlink",
    title: "Jump to next note linking here",
    icon: "GitFork",
    run: function () {
      var active = ctx.app.getActiveNote();
      if (!active) {
        ctx.showToast("Open a note first.");
        return;
      }
      findBacklinks(active)
        .then(function (links) {
          if (!links.length) {
            ctx.showToast("No notes link to this one yet.");
            return;
          }
          cursor = (cursor + 1) % links.length;
          ctx.app.openNote(links[cursor].path);
          ctx.showToast("Backlink " + (cursor + 1) + "/" + links.length + ": " + links[cursor].title);
        })
        .catch(function () {
          ctx.showToast("Backlink lookup failed.");
        });
    },
  });

  ctx.onunload = function () {
    cursor = 0;
  };
})(ctx);
