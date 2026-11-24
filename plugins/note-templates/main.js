/**
 * FocusCaseX sample plugin — Note Templates.
 * One command that appends a dated checklist template to the active note.
 */
(function (ctx) {
  "use strict";

  function todayKey() {
    var d = new Date();
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var dd = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + mm + "-" + dd;
  }

  function template() {
    return [
      "",
      "## Checklist — " + todayKey(),
      "",
      "- [ ] Review yesterday's notes",
      "- [ ] Plan the top three tasks",
      "- [ ] Capture one new idea #journal",
      ""
    ].join("\n");
  }

  ctx.registerCommand({
    id: "insert-checklist",
    title: "Insert checklist template",
    icon: "FileText",
    run: function () {
      ctx.app
        .insertIntoActiveNote(template())
        .then(function (ok) {
          if (ok) ctx.showToast("Checklist template inserted.");
        })
        .catch(function () {
          ctx.showToast("Could not insert the template.");
        });
    },
  });

  ctx.onunload = function () {
    /* registrations are removed automatically by the host */
  };
})(ctx);
