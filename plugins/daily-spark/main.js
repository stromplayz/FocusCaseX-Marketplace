/**
 * My FocusCaseX plugin — created in the marketplace studio.
 * The host injects "ctx" with: manifest, app (openNote, getNotes,
 * getActiveNote, getNoteContent, insertIntoActiveNote, createNote,
 * setMode), registerCommand, addRibbonIcon, addStatusBarItem,
 * registerView, activateView, addSettingsPane, registerCss,
 * loadData / saveData, showToast and registerEvent.
 */
(function (ctx) {
  "use strict";

  // 1) A command — shows up in the palette (Ctrl+K, type ">")
  ctx.registerCommand({
    id: "hello",
    title: "Spark a hello from Daily Spark",
    icon: "Sparkles",
    run: function () {
      ctx.showToast("Hello from " + ctx.manifest.name + "!");
    },
  });

  // 2) A ribbon icon in the left toolbar
  ctx.addRibbonIcon("Sparkles", "Say hello", function () {
    ctx.showToast("Ribbon icon clicked!");
  });

  // 3) A statusbar item that tracks how many notes exist
  var item = ctx.addStatusBarItem();
  function updateCount() {
    ctx.app.getNotes().then(function (notes) {
      item.setText(notes.length + " notes");
    });
  }
  updateCount();
  ctx.registerEvent("vault-changed", updateCount);

  ctx.onunload = function () {
    item.setText("");
  };
})(ctx);
