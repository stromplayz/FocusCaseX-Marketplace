/**
 * FocusCaseX — Quick Actions v2 (the Update v2.1 payload, core plugin).
 *
 * The v2.1 update is all about the quick actions launcher: the app ships
 * the reworked, grouped, customizable launcher and this core plugin —
 * auto-enabled like the rest of the core — completes the EMR action set
 * live from the marketplace via ctx.registerQuickAction. When the user
 * pulls core v2.1 (Update v2 banner → DOWNLOAD, or Settings › About →
 * Check for updates), these actions appear in the launcher's sections
 * immediately; the launcher's Customize mode treats them first-class.
 *
 * Surfaces: quick actions · commands · ribbon · settings pane · storage.
 */
(function (ctx) {
  "use strict";

  /* ---------------------------------------------------------------- */
  /* state                                                             */

  var data = { contributed: true };
  var disposers = [];

  /* ---------------------------------------------------------------- */
  /* the clinical EMR actions this core plugin contributes             */

  var ACTIONS = [
    {
      id: "core-exam",
      title: "Start examination",
      hint: "The full ophthalmic workup — vision to plan (core plugin)",
      icon: "Stethoscope",
      group: "clinical",
      run: function () {
        void ctx.app.openNote("Clinic/Examination.md");
      },
    },
    {
      id: "core-recalls",
      title: "Recalls & follow-ups",
      hint: "Who to call back in — the recall desk (core plugin)",
      icon: "BellRing",
      group: "schedule",
      run: function () {
        void ctx.app.openNote("Clinic/Recalls.md");
      },
    },
    {
      id: "core-billing",
      title: "Billing & receipts",
      hint: "The cash desk — card, cash or UPI (core plugin)",
      icon: "Receipt",
      group: "schedule",
      run: function () {
        void ctx.app.openNote("Clinic/Billing.md");
      },
    },
  ];

  /* ---------------------------------------------------------------- */
  /* registration                                                      */

  function registerAll() {
    unregisterAll();
    for (var i = 0; i < ACTIONS.length; i++) {
      var action = ACTIONS[i];
      disposers.push(
        ctx.registerQuickAction({
          id: action.id,
          title: action.title,
          hint: action.hint,
          icon: action.icon,
          group: action.group,
          run: action.run,
        }),
      );
    }
  }

  function unregisterAll() {
    for (var i = 0; i < disposers.length; i++) {
      try {
        disposers[i]();
      } catch (err) {
        /* keep unregistering */
      }
    }
    disposers = [];
  }

  ctx.registerCommand({
    id: "start-exam",
    title: "Start examination",
    icon: "Stethoscope",
    run: function () {
      void ctx.app.openNote("Clinic/Examination.md");
    },
  });

  ctx.addRibbonIcon("Stethoscope", "Start examination — quick actions v2", function () {
    void ctx.app.openNote("Clinic/Examination.md");
  });

  ctx.addSettingsPane(function (container) {
    container.replaceChildren();

    var head = document.createElement("p");
    head.style.cssText = "margin:0 0 .25rem;font-weight:700;font-size:.875rem;";
    head.textContent = "Quick Actions v2";
    var hint = document.createElement("p");
    hint.style.cssText = "margin:0 0 .75rem;font-size:.75rem;color:var(--muted-foreground);line-height:1.5;";
    hint.textContent =
      "The Update v2.1 core plugin — completes the quick actions launcher with the clinical EMR set. Reorder or hide every action from the launcher's Customize mode.";
    container.appendChild(head);
    container.appendChild(hint);

    var list = document.createElement("ul");
    list.style.cssText = "margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:.375rem;";
    for (var i = 0; i < ACTIONS.length; i++) {
      var row = document.createElement("li");
      row.style.cssText = "display:flex;align-items:center;gap:.5rem;font-size:.8125rem;";
      var dot = document.createElement("span");
      dot.style.cssText =
        "width:.5rem;height:.5rem;flex:none;background:var(--accent-live,var(--accent));";
      dot.setAttribute("aria-hidden", "true");
      var label = document.createElement("span");
      label.textContent = ACTIONS[i].title;
      row.appendChild(dot);
      row.appendChild(label);
      list.appendChild(row);
    }
    container.appendChild(list);
  });

  /* ---------------------------------------------------------------- */
  /* boot                                                              */

  registerAll();

  ctx.onunload = function () {
    unregisterAll();
  };
})(ctx);
