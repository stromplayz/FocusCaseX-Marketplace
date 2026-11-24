/**
 * FocusCaseX sample plugin — Heading Numbering.
 * Injects CSS counters for H2/H3 headings in reading view. The stylesheet
 * is removed automatically when the plugin is disabled.
 */
(function (ctx) {
  "use strict";

  var css = [
    "body { counter-reset: fcx-h2 fcx-h3; }",
    ".fcx-prose h2::before {",
    "  counter-increment: fcx-h2;",
    "  content: counter(fcx-h2) '. ';",
    "  color: var(--accent-live, #34d399);",
    "}",
    ".fcx-prose h3::before {",
    "  counter-increment: fcx-h3;",
    "  content: counter(fcx-h2) '.' counter(fcx-h3) ' ';",
    "  color: var(--muted-foreground);",
    "}"
  ].join("\n");

  ctx.registerCss(css);

  ctx.registerCommand({
    id: "about-numbering",
    title: "What is heading numbering?",
    icon: "ListTree",
    run: function () {
      ctx.showToast("Reading-view H2/H3 headings are numbered via CSS counters.");
    },
  });

  ctx.onunload = function () {
    /* the injected stylesheet leaves with the host cleanup */
  };
})(ctx);
