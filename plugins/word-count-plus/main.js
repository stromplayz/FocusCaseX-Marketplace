/**
 * FocusCaseX sample plugin — Word Count Plus.
 * Adds a statusbar item that tracks words, characters and sentences of the
 * active note. Updates live via the host's active-note-changed event.
 */
(function (ctx) {
  "use strict";

  var item = ctx.addStatusBarItem();

  function countSentences(text) {
    var trimmed = text.trim();
    if (!trimmed) return 0;
    var parts = trimmed.split(/[.!?…]+(?:\s|$)/);
    var n = 0;
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].trim().length > 0) n++;
    }
    return n;
  }

  function render(content) {
    var words = (String(content).trim().match(/\S+/g) || []).length;
    var chars = String(content).length;
    var sentences = countSentences(content);
    item.setText(words + " words \u00B7 " + chars + " chars \u00B7 " + sentences + " sentences");
  }

  render("");

  ctx.registerEvent("active-note-changed", function (payload) {
    render(payload && typeof payload.content === "string" ? payload.content : "");
  });

  ctx.onunload = function () {
    item.setText("");
  };
})(ctx);
