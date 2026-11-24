/**
 * FocusCaseX sample plugin — Random Note.
 * Dice ribbon icon + "Open random note" command that jumps to a random
 * note from the vault index.
 */
(function (ctx) {
  "use strict";

  function pick() {
    ctx.app
      .getNotes()
      .then(function (notes) {
        if (!notes.length) {
          ctx.showToast("The vault is empty — nothing to roll for.");
          return;
        }
        var idx = Math.floor(Math.random() * notes.length);
        var note = notes[idx];
        if (ctx.app.getActiveNote && ctx.app.getActiveNote() === note.path && notes.length > 1) {
          note = notes[(idx + 1) % notes.length];
        }
        ctx.app.openNote(note.path);
      })
      .catch(function () {
        ctx.showToast("Random note failed.");
      });
  }

  ctx.registerCommand({
    id: "open-random",
    title: "Open random note",
    icon: "Dices",
    run: pick,
  });

  ctx.addRibbonIcon("Dices", "Open a random note", pick);

  ctx.onunload = function () {
    /* host cleans up registrations */
  };
})(ctx);
