/**
 * FocusCaseX sample plugin — Quick Phrases.
 *
 * A chairside text expander. Keep a personal list of snippet pairs
 * (trigger → text) — "va" drops in the visual acuity table skeleton,
 * "plan" the plan line, "letter" a recall-letter opener — and add the
 * expanded result to the end of the ACTIVE note with one tap.
 *
 *  • Right panel manager ("Quick Phrases" tab): add, edit and delete
 *    phrases; every row is click-to-insert. The list persists through
 *    ctx.loadData / ctx.saveData.
 *  • One command per phrase in the palette — "Insert phrase: <trigger>"
 *    — re-registered live whenever the list changes.
 *  • Variable expansion at insert time:
 *      {{date}}    → YYYY-MM-DD (local)
 *      {{time}}    → HH:MM (24-hour, local)
 *      {{patient}} → active patient name (ctx.app.getActivePatient)
 *      {{mr}}      → active patient MR number
 *    Patient tokens are left untouched when no patient file is open,
 *    so nothing is silently blanked.
 *  • The host exposes no editor keystroke hook, so triggers fire from
 *    palette commands and panel taps only — nothing listens to typing.
 *  • No network, no folder access, no editor chrome changes.
 */
(function (ctx) {
  "use strict";

  /* ================================ seeds ================================ */

  var DEFAULT_PHRASES = [
    {
      id: "seed-va",
      trigger: "va",
      text:
        "**Visual acuity**\n\n" +
        "| Vision | OD | OS |\n" +
        "|---|---|---|\n" +
        "| Distance, unaided |  |  |\n" +
        "| Distance, pinhole |  |  |\n" +
        "| Distance, best corrected |  |  |\n" +
        "| Near (N-notation) |  |  |\n",
    },
    {
      id: "seed-plan",
      trigger: "plan",
      text: "**Plan:** \n- Review in \n- \n",
    },
    {
      id: "seed-letter",
      trigger: "letter",
      text:
        "Dear {{patient}} (MR {{mr}}),\n\n" +
        "Thank you for attending on {{date}}. \n\n" +
        "Kind regards,\n",
    },
    {
      id: "seed-drops",
      trigger: "drops",
      text:
        "**Advice:** Use the drops as discussed — right eye / left eye / both, " +
        "per the schedule. Review sooner if pain, redness or vision worsens.\n",
    },
  ];

  /* ================================ state ================================ */

  var phrases = [];
  var booted = false;
  var patient = null; // latest PluginPatientSnapshot (or null)
  var commandDisposers = [];
  var renderers = []; // one per mounted panel instance

  /* =============================== storage =============================== */

  /** Coerce whatever loadData returns into a clean phrase list (or null). */
  function sanitizeList(raw) {
    if (!Array.isArray(raw)) return null;
    var out = [];
    var seen = {};
    for (var i = 0; i < raw.length; i++) {
      var item = raw[i];
      if (!item || typeof item !== "object") continue;
      var trig = typeof item.trigger === "string" ? item.trigger.trim() : "";
      var text = typeof item.text === "string" ? item.text : "";
      if (!trig || !text) continue;
      var key = trig.toLowerCase();
      if (seen[key]) continue;
      seen[key] = true;
      out.push({
        id:
          typeof item.id === "string" && item.id
            ? item.id
            : "ph-" + i + "-" + Math.random().toString(36).slice(2, 8),
        trigger: trig,
        text: text,
      });
    }
    return out;
  }

  function persist() {
    try {
      void ctx.saveData({ phrases: phrases });
    } catch (e) {
      /* non-fatal */
    }
  }

  /* ============================ variable fill ============================ */

  function two(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function dateToken() {
    var d = new Date();
    return d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate());
  }

  function timeToken() {
    var d = new Date();
    return two(d.getHours()) + ":" + two(d.getMinutes());
  }

  /** Expand the supported tokens; unknown ones and patient tokens without
   *  an open patient file pass through untouched. */
  function expand(text) {
    var p = patient && typeof patient === "object" ? patient : null;
    var hasFile = !!(p && (p.patient || p.mr));
    return String(text == null ? "" : text).replace(
      /\{\{\s*([a-zA-Z]+)\s*\}\}/g,
      function (whole, name) {
        var key = String(name).toLowerCase();
        if (key === "date") return dateToken();
        if (key === "time") return timeToken();
        if (key === "patient") return hasFile && p.patient ? String(p.patient) : whole;
        if (key === "mr") return hasFile && p.mr ? String(p.mr) : whole;
        return whole;
      },
    );
  }

  /* ============================== inserting ============================== */

  function findPhrase(id) {
    for (var i = 0; i < phrases.length; i++) {
      if (phrases[i].id === id) return phrases[i];
    }
    return null;
  }

  function insertPhrase(id) {
    var p = findPhrase(id);
    if (!p) return;
    Promise.resolve()
      .then(function () {
        return ctx.app.getActivePatient();
      })
      .catch(function () {
        return null; // never block the insert on a failed lookup
      })
      .then(function (snap) {
        if (snap && typeof snap === "object") patient = snap;
        return ctx.app.insertIntoActiveNote(expand(p.text));
      })
      .then(function (ok) {
        if (ok) ctx.showToast("Phrase \u201c" + p.trigger + "\u201d added to the note.");
      })
      .catch(function () {
        ctx.showToast("Could not insert \u201c" + p.trigger + "\u201d — open a note first.");
      });
  }

  /* ======================= palette commands per phrase ==================== */

  function syncCommands() {
    for (var i = 0; i < commandDisposers.length; i++) {
      try {
        commandDisposers[i]();
      } catch (e) {
        /* keep unregistering */
      }
    }
    commandDisposers = [];
    for (var j = 0; j < phrases.length; j++) {
      (function (p) {
        commandDisposers.push(
          ctx.registerCommand({
            id: "insert-" + p.id,
            title: "Insert phrase: " + p.trigger,
            icon: "Zap",
            run: function () {
              insertPhrase(p.id);
            },
          }),
        );
      })(phrases[j]);
    }
  }

  /* ============================== dom helpers ============================ */

  var C = {
    fg: "var(--popover-foreground,var(--foreground,#e5e7eb))",
    dim: "var(--muted-foreground,#9ca3af)",
    accent: "var(--accent-live,#2979ff)",
    border: "color-mix(in oklab, var(--accent-live) 14%, var(--border))",
    soft: "color-mix(in oklab, var(--accent-live) 7%, transparent)",
    chip: "color-mix(in oklab, var(--accent-live) 14%, transparent)",
  };

  function h(tag, style, text) {
    var node = document.createElement(tag);
    if (style) node.style.cssText = style;
    if (text != null) node.textContent = text;
    return node;
  }

  function button(labelText, onClick, primary) {
    var b = h(
      "button",
      "height:26px;padding:0 10px;border-radius:8px;cursor:pointer;font-size:11.5px;font-weight:600;" +
        "border:1px solid " + (primary ? "color-mix(in oklab, var(--accent-live) 40%, transparent)" : "var(--border)") + ";" +
        "background:" + (primary ? C.chip : "var(--muted,#1f2937)") + ";" +
        "color:" + (primary ? C.accent : C.dim) + ";transition:all .12s ease;",
      labelText,
    );
    b.type = "button";
    b.addEventListener("click", function (ev) {
      ev.stopPropagation();
      onClick();
    });
    return b;
  }

  function textInput(placeholder, value, mono) {
    var inp = h("input", "");
    inp.type = "text";
    inp.placeholder = placeholder || "";
    inp.value = value != null ? value : "";
    inp.setAttribute(
      "style",
      "height:30px;border-radius:8px;border:1px solid var(--border);background:var(--background);" +
        "padding:0 8px;font-size:12.5px;color:" + C.fg + ";outline:none;width:100%;box-sizing:border-box;" +
        (mono ? "font-family:ui-monospace,monospace;" : ""),
    );
    inp.addEventListener("focus", function () {
      inp.style.borderColor = C.accent;
    });
    inp.addEventListener("blur", function () {
      inp.style.borderColor = "var(--border)";
    });
    return inp;
  }

  function areaInput(placeholder, value) {
    var ta = document.createElement("textarea");
    ta.placeholder = placeholder || "";
    ta.value = value != null ? value : "";
    ta.rows = 5;
    ta.setAttribute(
      "style",
      "border-radius:8px;border:1px solid var(--border);background:var(--background);" +
        "padding:6px 8px;font-size:12px;line-height:1.5;color:" + C.fg + ";outline:none;width:100%;" +
        "box-sizing:border-box;resize:vertical;font-family:ui-monospace,monospace;",
    );
    ta.addEventListener("focus", function () {
      ta.style.borderColor = C.accent;
    });
    ta.addEventListener("blur", function () {
      ta.style.borderColor = "var(--border)";
    });
    return ta;
  }

  function fieldLabel(text) {
    return h(
      "div",
      "font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:" + C.dim + ";",
      text,
    );
  }

  /* ======================== phrase cards + editor ======================== */

  var editingId = null; // phrase id being edited, or "__new__", or null

  function phraseCard(p, list) {
    var card = h(
      "div",
      "border-radius:10px;border:1px solid var(--border);background:var(--muted,#1f2937);" +
        "padding:7px 9px;display:flex;flex-direction:column;gap:4px;cursor:pointer;transition:border-color .12s ease;",
    );
    card.addEventListener("mouseenter", function () {
      card.style.borderColor = "color-mix(in oklab, var(--accent-live) 40%, transparent)";
    });
    card.addEventListener("mouseleave", function () {
      card.style.borderColor = "var(--border)";
    });
    card.addEventListener("click", function () {
      insertPhrase(p.id); // click-to-insert
    });

    var top = h("div", "display:flex;align-items:center;gap:6px;min-width:0;");
    var trig = h(
      "span",
      "font-family:ui-monospace,monospace;font-size:11.5px;font-weight:700;color:" + C.accent + ";" +
        "background:" + C.chip + ";border-radius:6px;padding:2px 7px;flex:none;",
      p.trigger,
    );
    var preview = h(
      "span",
      "font-size:11px;color:" + C.dim + ";overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;",
      expand(p.text).replace(/\s+/g, " ").trim() || "(empty)",
    );
    top.appendChild(trig);
    top.appendChild(preview);
    card.appendChild(top);

    var actions = h("div", "display:flex;gap:5px;justify-content:flex-end;");
    actions.appendChild(button("Insert", function () { insertPhrase(p.id); }, true));
    actions.appendChild(button("Edit", function () {
      editingId = p.id;
      rerender();
    }));
    actions.appendChild(button("Delete", function () {
      phrases = phrases.filter(function (x) { return x.id !== p.id; });
      editingId = null;
      persist();
      syncCommands();
      rerender();
      ctx.showToast("Phrase \u201c" + p.trigger + "\u201d deleted.");
    }));
    card.appendChild(actions);
    list.appendChild(card);
  }

  function editorForm(host) {
    var isNew = editingId === "__new__";
    var current = isNew ? null : findPhrase(editingId);
    var draftTrigger = current ? current.trigger : "";
    var draftText = current ? current.text : "";

    var form = h(
      "div",
      "border-radius:10px;border:1px solid " + C.border + ";background:" + C.soft + ";" +
        "padding:9px;display:flex;flex-direction:column;gap:6px;",
    );
    form.appendChild(fieldLabel(isNew ? "New phrase" : "Edit phrase"));

    var trig = textInput('trigger — e.g. "va"', draftTrigger, true);
    var body = areaInput(
      "Text to insert. Tokens: {{date}} {{time}} {{patient}} {{mr}}",
      draftText,
    );
    form.appendChild(trig);
    form.appendChild(body);

    var preview = h(
      "div",
      "font-size:10.5px;line-height:1.5;color:" + C.dim + ";white-space:pre-wrap;word-break:break-word;",
      "",
    );
    function updatePreview() {
      var expanded = expand(body.value);
      preview.textContent = expanded
        ? "Preview: " + expanded.replace(/\s+/g, " ").trim().slice(0, 160)
        : "";
    }
    body.addEventListener("input", updatePreview);
    form.appendChild(preview);
    updatePreview();

    form.appendChild(
      h(
        "div",
        "font-size:10px;line-height:1.5;color:" + C.dim + ";",
        "{{date}} → 2026-01-31 · {{time}} → 09:41 · {{patient}} and {{mr}} resolve from the open patient file, and stay as written when none is open.",
      ),
    );

    var row = h("div", "display:flex;gap:5px;justify-content:flex-end;");
    row.appendChild(button("Cancel", function () {
      editingId = null;
      rerender();
    }));
    row.appendChild(
      button(isNew ? "Add phrase" : "Save", function () {
        var trigVal = trig.value.trim();
        var textVal = body.value;
        if (!trigVal) {
          ctx.showToast("Give the phrase a trigger.");
          return;
        }
        if (!textVal.trim()) {
          ctx.showToast("Give the phrase some text.");
          return;
        }
        for (var i = 0; i < phrases.length; i++) {
          if (
            phrases[i].id !== editingId &&
            phrases[i].trigger.toLowerCase() === trigVal.toLowerCase()
          ) {
            ctx.showToast("Another phrase already uses \u201c" + trigVal + "\u201d.");
            return;
          }
        }
        if (isNew) {
          phrases.push({
            id: "ph-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6),
            trigger: trigVal,
            text: textVal,
          });
        } else {
          var p = findPhrase(editingId);
          if (p) {
            p.trigger = trigVal;
            p.text = textVal;
          }
        }
        editingId = null;
        persist();
        syncCommands();
        rerender();
        ctx.showToast(isNew ? "Phrase added." : "Phrase saved.");
      }, true),
    );
    form.appendChild(row);
    host.appendChild(form);
  }

  /* ============================ panel instance =========================== */

  function buildManager(host) {
    while (host.firstChild) host.removeChild(host.firstChild);

    var root = h(
      "div",
      "display:flex;flex-direction:column;gap:8px;font-size:12.5px;color:" + C.fg + ";min-width:0;",
    );

    var header = h("div", "display:flex;align-items:center;justify-content:space-between;gap:8px;");
    var count = h(
      "div",
      "font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:" + C.dim + ";",
      "",
    );
    header.appendChild(count);
    header.appendChild(button("+ New phrase", function () {
      editingId = "__new__";
      rerender();
    }));
    root.appendChild(header);

    var listWrap = h("div", "display:flex;flex-direction:column;gap:6px;");
    root.appendChild(listWrap);

    function render() {
      listWrap.textContent = "";
      count.textContent = phrases.length + (phrases.length === 1 ? " phrase" : " phrases");
      if (editingId) {
        editorForm(listWrap);
      }
      if (phrases.length === 0) {
        listWrap.appendChild(
          h(
            "div",
            "border-radius:10px;border:1px dashed var(--border);padding:12px 10px;font-size:11px;line-height:1.6;color:" + C.dim + ";",
            "No phrases yet. Tap \u201c+ New phrase\u201d to store your first snippet — the trigger becomes a palette command (\u201cInsert phrase: \u2026\u201d) and the text lands at the end of the active note.",
          ),
        );
        return;
      }
      for (var i = 0; i < phrases.length; i++) {
        phraseCard(phrases[i], listWrap);
      }
    }

    render();
    root.appendChild(
      h(
        "div",
        "font-size:10px;line-height:1.5;color:" + C.dim + ";",
        "Tap a card (or its Insert button) to add the expanded text to the open note; each trigger is also a \u201cInsert phrase: \u2026\u201d palette command.",
      ),
    );
    host.appendChild(root);
    renderers.push({ el: root, render: render });
  }

  function rerender() {
    for (var i = 0; i < renderers.length; i++) {
      if (renderers[i].el && renderers[i].el.isConnected) renderers[i].render();
      else if (renderers[i].el && !renderers[i].el.isConnected) renderers[i].detached = true;
    }
    renderers = renderers.filter(function (r) {
      return r.el && r.el.isConnected && !r.detached;
    });
  }

  /* ============================ registration ============================= */

  ctx.registerRightPanel({
    id: "phrases",
    title: "Quick Phrases",
    icon: "Zap",
    order: 15,
    mount: function (host) {
      buildManager(host);
    },
    destroy: function () {
      renderers = [];
      editingId = null;
    },
  });

  ctx.addSettingsPane(function (el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    var box = h("div", "display:flex;flex-direction:column;gap:4px;font-size:12.5px;");
    box.appendChild(fieldLabel("Quick Phrases"));
    box.appendChild(
      h(
        "div",
        "font-size:11px;line-height:1.6;color:" + C.dim + ";",
        "Chairside text expander — manages your trigger → text snippets from the Quick Phrases tab of the right panel, and adds an \u201cInsert phrase: \u2026\u201d command per snippet. Supported tokens: {{date}}, {{time}}, {{patient}}, {{mr}}.",
      ),
    );
    el.appendChild(box);
  });

  /* patient snapshot follows the open note */
  ctx.registerEvent("active-note-changed", function () {
    ctx.app
      .getActivePatient()
      .then(function (p) {
        patient = p;
      })
      .catch(function () {
        /* non-fatal */
      });
  });

  /* ================================= boot ================================ */

  ctx
    .loadData()
    .then(function (d) {
      var list = d && typeof d === "object" ? sanitizeList(d.phrases) : null;
      // a stored list (even empty) wins; defaults only for first run
      phrases = Array.isArray(list) ? list : DEFAULT_PHRASES.slice();
      booted = true;
      syncCommands();
      return ctx.app.getActivePatient();
    })
    .then(function (p) {
      patient = p;
      rerender();
    })
    .catch(function () {
      if (!booted) {
        phrases = DEFAULT_PHRASES.slice();
        booted = true;
        try {
          syncCommands();
        } catch (e) {
          /* non-fatal */
        }
      }
      rerender();
    });

  ctx.onunload = function () {
    renderers = [];
    editingId = null;
    /* palette commands are removed automatically by the host */
  };
})(ctx);
