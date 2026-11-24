/**
 * FocusCaseX sample plugin — Utility Panel.
 *
 * Docks a clinical utility tab into the RIGHT context panel (registered via
 * ctx.registerRightPanel). Eleven tools an optometry practice actually uses:
 *
 *   • Spherical equivalent      SE = Sph + Cyl/2
 *   • Toric transposition       minus-cyl standard form
 *   • Age from DOB              calendar-exact years + months
 *   • IOP check + CCT           10–21 band + 0.5 mmHg per 20 µm from 545
 *   • Snellen converter         6-m ↔ 20-ft ↔ decimal ↔ logMAR
 *   • Vertex compensation       Fc = F / (1 − d·F)
 *   • Presbyopia add            Hofstetter amplitude, half in reserve
 *   • Keratometry               mm ↔ D (D = 337.5 / mm)
 *   • Prentice's rule           Δ = c(cm) × F
 *   • Rx summary                the active patient's latest Rx, copyable
 *   • Reference cards           IOP norms, VA grades, drop frequencies
 *
 * Patient-aware tools (IOP prefill, Rx summary) read the active note via
 * ctx.app.getActivePatient() and refresh on active-note-changed. The last
 * selected tool persists through ctx.loadData/saveData. Nothing outside the
 * right panel is touched.
 */
(function (ctx) {
  "use strict";

  var cfg = { tool: "se" };

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

  function label(text) {
    return h(
      "div",
      "font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:" + C.dim,
      text,
    );
  }

  function inputRow(caption, placeholder, value) {
    var wrap = h("div", "display:flex;flex-direction:column;gap:2px;flex:1;min-width:0;");
    wrap.appendChild(h("label", "font-size:10.5px;font-weight:600;color:" + C.dim + ";", caption));
    var inp = h("input", "");
    inp.type = "text";
    inp.inputMode = "decimal";
    inp.placeholder = placeholder || "";
    inp.value = value != null ? value : "";
    inp.setAttribute(
      "style",
      "height:30px;border-radius:8px;border:1px solid var(--border);background:var(--background);" +
        "padding:0 8px;font-size:12.5px;color:" + C.fg + ";outline:none;width:100%;",
    );
    inp.addEventListener("focus", function () {
      inp.style.borderColor = C.accent;
    });
    inp.addEventListener("blur", function () {
      inp.style.borderColor = "var(--border)";
    });
    wrap.appendChild(inp);
    return { wrap: wrap, input: inp };
  }

  function num(v) {
    var n = parseFloat(String(v == null ? "" : v).replace(",", "."));
    return isFinite(n) ? n : null;
  }

  function round(n, places) {
    var p = Math.pow(10, places == null ? 2 : places);
    return Math.round(n * p) / p;
  }

  function dioptreStr(n) {
    if (n == null) return "—";
    if (Math.abs(n) < 0.005) return "pl";
    return (n > 0 ? "+" : "−") + Math.abs(n).toFixed(2);
  }

  function resultRow(caption, valueText, tone) {
    var row = h(
      "div",
      "display:flex;align-items:center;justify-content:space-between;gap:8px;" +
        "border-radius:9px;padding:6px 9px;background:" + (tone ? C.soft : "var(--muted,#1f2937)") + ";",
    );
    row.appendChild(h("span", "font-size:11px;font-weight:600;color:" + C.dim + ";", caption));
    var val = h("span", "font-family:ui-monospace,monospace;font-size:13px;font-weight:700;" + (tone ? "color:" + C.accent + ";" : ""), valueText);
    row.appendChild(val);
    return row;
  }

  function formulaNote(text) {
    return h("div", "font-size:10px;line-height:1.5;color:" + C.dim + ";padding-top:2px;", text);
  }

  /* ============================== math core ============================== */

  function se(sph, cyl) {
    return round(sph + cyl / 2, 2);
  }

  function transpose(sph, cyl, axis) {
    var newAxis = axis > 90 ? axis - 90 : axis + 90;
    if (newAxis <= 0) newAxis += 180;
    if (newAxis > 180) newAxis -= 180;
    return { sph: round(sph + cyl, 2), cyl: round(-cyl, 2), axis: Math.round(newAxis) };
  }

  function ageFrom(dobIso) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(dobIso || "").trim());
    if (!m) return null;
    var dob = new Date(+m[1], +m[2] - 1, +m[3]);
    if (isNaN(dob.getTime()) || dob.getDate() !== +m[3] || dob.getMonth() !== +m[2] - 1) return null;
    var ref = new Date();
    if (ref < dob) return null;
    var years = ref.getFullYear() - dob.getFullYear();
    var months = ref.getMonth() - dob.getMonth();
    if (ref.getDate() < dob.getDate()) months -= 1;
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    if (years < 0) return null;
    return { years: years, months: months };
  }

  function cctCorrected(iop, cct) {
    if (iop <= 0 || cct < 300 || cct > 700) return null;
    return round(iop + (545 - cct) * 0.025, 1);
  }

  function snellen(den6) {
    if (!(den6 > 0)) return null;
    var decimal = 6 / den6;
    var logmar = Math.log10(den6 / 6);
    return {
      six: "6/" + (Math.round(den6 * 10) / 10),
      feet: "20/" + (Math.round(((den6 * 20) / 6) * 10) / 10),
      decimal: decimal.toFixed(2),
      logmar: (logmar >= 0 ? "" : "−") + Math.abs(logmar).toFixed(2),
    };
  }

  function parseSnellen(raw) {
    var s = String(raw || "").trim();
    if (!s) return null;
    var frac = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(s);
    if (frac) {
      var n = +frac[1];
      var d = +frac[2];
      if (!(n > 0 && d > 0)) return null;
      if (n === 6) return d;
      if (n === 20) return (d * 6) / 20;
      return (d * 6) / n;
    }
    var v = parseFloat(s);
    if (!isFinite(v) || v <= 0) return null;
    if (v > 1) return v; // bare 6-metre denominator
    return 6 / v; // decimal acuity
  }

  /* =============================== tools ================================ */

  var state = { patient: null };
  var instances = [];

  var TOOLS = [
    {
      id: "se",
      name: "Spherical equiv.",
      hint: "SE = Sph + Cyl/2",
      build: function (body) {
        var a = inputRow("Sph (D)", "+1.25", "");
        var b = inputRow("Cyl (D)", "−0.50", "");
        var out = h("div", "display:flex;flex-direction:column;gap:4px;");
        function calc() {
          var s = num(a.input.value);
          var c = num(b.input.value);
          out.textContent = "";
          if (s === null || c === null) {
            out.appendChild(resultRow("SE", "—", false));
            return;
          }
          out.appendChild(resultRow("Spherical equivalent", dioptreStr(se(s, c)), true));
        }
        a.input.addEventListener("input", calc);
        b.input.addEventListener("input", calc);
        body.appendChild(a.wrap);
        body.appendChild(b.wrap);
        body.appendChild(out);
        calc();
      },
    },
    {
      id: "transpose",
      name: "Transposition",
      hint: "minus-cyl standard form",
      build: function (body) {
        var a = inputRow("Sph (D)", "+1.00", "");
        var b = inputRow("Cyl (D)", "+0.50", "");
        var c = inputRow("Axis (°)", "90", "");
        var out = h("div", "display:flex;flex-direction:column;gap:4px;");
        function calc() {
          var s = num(a.input.value);
          var cy = num(b.input.value);
          var ax = num(c.input.value);
          out.textContent = "";
          if (s === null || cy === null || ax === null || ax < 0 || ax > 180) {
            out.appendChild(resultRow("Rx′", "—", false));
            return;
          }
          var t = transpose(s, cy, ax);
          var text = dioptreStr(t.sph) + " / " + dioptreStr(t.cyl) + " × " + t.axis;
          out.appendChild(resultRow("Rx′ (minus cyl)", text, true));
        }
        [a, b, c].forEach(function (r) {
          r.input.addEventListener("input", calc);
          body.appendChild(r.wrap);
        });
        body.appendChild(out);
        calc();
      },
    },
    {
      id: "age",
      name: "Age from DOB",
      hint: "calendar-exact",
      build: function (body) {
        var a = inputRow("Date of birth", "1990-06-15", "");
        a.input.inputMode = "numeric";
        var out = h("div", "display:flex;flex-direction:column;gap:4px;");
        function calc() {
          out.textContent = "";
          var r = ageFrom(a.input.value);
          if (!r) {
            out.appendChild(resultRow("Age", "—", false));
            return;
          }
          out.appendChild(
            resultRow("Age", r.years >= 2 ? r.years + "y" + (r.months ? " " + r.months + "m" : "") : r.years + "y " + r.months + "m", true),
          );
        }
        a.input.addEventListener("input", calc);
        body.appendChild(a.wrap);
        body.appendChild(out);
        calc();
      },
    },
    {
      id: "iop",
      name: "IOP + CCT",
      hint: "10–21 mmHg · +0.5 per 20 µm",
      build: function (body) {
        var prefill = state.patient && state.patient.values.iop_od ? String(parseFloat(state.patient.values.iop_od) || "") : "";
        var a = inputRow("Measured IOP (mmHg)", "18", prefill);
        var b = inputRow("CCT (µm) — optional", "545", "");
        var out = h("div", "display:flex;flex-direction:column;gap:4px;");
        function band(v) {
          if (v < 10) return "low";
          if (v > 21) return "high";
          return "normal";
        }
        function calc() {
          out.textContent = "";
          var v = num(a.input.value);
          if (v === null) {
            out.appendChild(resultRow("Band", "—", false));
            return;
          }
          var b1 = band(v);
          out.appendChild(resultRow("Band (" + v + " mmHg)", b1, b1 !== "normal"));
          var cct = num(b.input.value);
          if (cct !== null) {
            var corr = cctCorrected(v, cct);
            out.appendChild(
              resultRow("CCT-corrected", corr === null ? "—" : corr + " mmHg", corr !== null && band(corr) !== "normal"),
            );
          }
        }
        a.input.addEventListener("input", calc);
        b.input.addEventListener("input", calc);
        body.appendChild(a.wrap);
        body.appendChild(b.wrap);
        body.appendChild(out);
        body.appendChild(formulaNote("Rule of thumb: measured IOP shifts ≈ 0.5 mmHg per 20 µm away from a 545 µm cornea — thin corneas read low, thick read high."));
        calc();
      },
    },
    {
      id: "snellen",
      name: "Snellen convert",
      hint: "6-m ↔ 20-ft ↔ decimal ↔ logMAR",
      build: function (body) {
        var a = inputRow("Any notation", "6/9 · 20/30 · 0.67", "");
        var out = h("div", "display:flex;flex-direction:column;gap:4px;");
        function calc() {
          out.textContent = "";
          var den = parseSnellen(a.input.value);
          var set = den ? snellen(den) : null;
          if (!set) {
            out.appendChild(resultRow("—", "enter e.g. 6/9", false));
            return;
          }
          out.appendChild(resultRow("6-metre", set.six, true));
          out.appendChild(resultRow("Feet", set.feet, false));
          out.appendChild(resultRow("Decimal", set.decimal, false));
          out.appendChild(resultRow("logMAR", set.logmar, false));
        }
        a.input.addEventListener("input", calc);
        body.appendChild(a.wrap);
        body.appendChild(out);
        body.appendChild(formulaNote("Decimal = 6/den · logMAR = log₁₀(den/6) · feet = 20-ft equivalent."));
        calc();
      },
    },
    {
      id: "vertex",
      name: "Vertex power",
      hint: "Fc = F / (1 − d·F)",
      build: function (body) {
        var a = inputRow("Spectacle power (D)", "−8.00", "");
        var b = inputRow("Vertex distance (mm)", "12", "12");
        var out = h("div", "display:flex;flex-direction:column;gap:4px;");
        function calc() {
          out.textContent = "";
          var f = num(a.input.value);
          var dmm = num(b.input.value);
          if (f === null || dmm === null) {
            out.appendChild(resultRow("Corneal plane", "—", false));
            return;
          }
          var d = dmm / 1000;
          var denom = 1 - d * f;
          if (Math.abs(denom) < 1e-6) {
            out.appendChild(resultRow("Corneal plane", "beyond range", false));
            return;
          }
          out.appendChild(resultRow("Corneal plane", dioptreStr(round(f / denom, 2)), true));
        }
        a.input.addEventListener("input", calc);
        b.input.addEventListener("input", calc);
        body.appendChild(a.wrap);
        body.appendChild(b.wrap);
        body.appendChild(out);
        body.appendChild(formulaNote("Meaningful for powers beyond about ±4.00 D — contact lens and refraction checks."));
        calc();
      },
    },
    {
      id: "add",
      name: "Near add",
      hint: "Hofstetter · half in reserve",
      build: function (body) {
        var a = inputRow("Age (y)", "52", "");
        var b = inputRow("Working distance (cm)", "40", "40");
        var out = h("div", "display:flex;flex-direction:column;gap:4px;");
        function q(n) {
          return Math.round(n * 4) / 4;
        }
        function calc() {
          out.textContent = "";
          var age = num(a.input.value);
          var wd = num(b.input.value);
          if (age === null || wd === null) {
            out.appendChild(resultRow("Add", "—", false));
            return;
          }
          var amp = 18.5 - 0.3 * age;
          var add = q(100 / wd - Math.max(0.5, amp / 2));
          if (add <= 0) {
            out.appendChild(resultRow("Add", "none needed", false));
            return;
          }
          out.appendChild(resultRow("Add (≈)", dioptreStr(Math.min(add, 3.5)), true));
        }
        a.input.addEventListener("input", calc);
        b.input.addEventListener("input", calc);
        body.appendChild(a.wrap);
        body.appendChild(b.wrap);
        body.appendChild(out);
        body.appendChild(formulaNote("Amplitude ≈ 18.5 − 0.3 × age; add = 100/WD − ½ amplitude, rounded to 0.25 D."));
        calc();
      },
    },
    {
      id: "k",
      name: "Keratometry",
      hint: "mm ↔ D (337.5 / mm)",
      build: function (body) {
        var a = inputRow("Radius (mm)", "7.8", "");
        var b = inputRow("Power (D)", "43.25", "");
        var out = h("div", "display:flex;flex-direction:column;gap:4px;");
        function calc() {
          out.textContent = "";
          var mm = num(a.input.value);
          var d = num(b.input.value);
          out.appendChild(
            resultRow("mm → D", mm !== null && mm >= 5 && mm <= 12 ? round(337.5 / mm, 2) + " D" : "—", true),
          );
          out.appendChild(
            resultRow("D → mm", d !== null && d >= 28 && d <= 67 ? round(337.5 / d, 2) + " mm" : "—", false),
          );
        }
        a.input.addEventListener("input", calc);
        b.input.addEventListener("input", calc);
        body.appendChild(a.wrap);
        body.appendChild(b.wrap);
        body.appendChild(out);
        calc();
      },
    },
    {
      id: "prentice",
      name: "Prentice's rule",
      hint: "Δ = c(cm) × F",
      build: function (body) {
        var a = inputRow("Decentration (cm)", "0.4", "");
        var b = inputRow("Lens power (D)", "−5.00", "");
        var out = h("div", "display:flex;flex-direction:column;gap:4px;");
        function calc() {
          out.textContent = "";
          var c = num(a.input.value);
          var f = num(b.input.value);
          if (c === null || f === null) {
            out.appendChild(resultRow("Induced prism", "—", false));
            return;
          }
          var delta = round(Math.abs(c * f), 2);
          out.appendChild(resultRow("Induced prism", delta + " Δ", delta >= 1));
        }
        a.input.addEventListener("input", calc);
        b.input.addEventListener("input", calc);
        body.appendChild(a.wrap);
        body.appendChild(b.wrap);
        body.appendChild(out);
        calc();
      },
    },
    {
      id: "rx",
      name: "Rx summary",
      hint: "active patient's latest Rx",
      build: function (body) {
        var out = h("div", "display:flex;flex-direction:column;gap:4px;");
        body.appendChild(out);
        function render() {
          out.textContent = "";
          var p = state.patient;
          if (!p || (!p.values.sph_od && !p.values.sph_os)) {
            out.appendChild(resultRow("Rx", "no patient file open", false));
            body.appendChild(formulaNote("Open a patient case file to pull its latest spectacle Rx here — both eyes plus the spherical equivalents."));
            return;
          }
          var v = p.values;
          [
            ["OD", v.sph_od, v.cyl_od, v.axis_od, v.va_od],
            ["OS", v.sph_os, v.cyl_os, v.axis_os, v.va_os],
          ].forEach(function (eye) {
            var txt =
              dioptreStr(parseFloat(eye[1])) + " / " + dioptreStr(parseFloat(eye[2]));
            if (eye[3]) txt += " × " + eye[3];
            if (eye[4]) txt += "  ·  VA " + eye[4];
            out.appendChild(resultRow(eye[0], txt, true));
          });
          if (v.sph_od && v.cyl_od) {
            var seOd = se(parseFloat(v.sph_od), parseFloat(v.cyl_od));
            out.appendChild(resultRow("SE OD", dioptreStr(seOd), false));
          }
          if (v.sph_os && v.cyl_os) {
            var seOs = se(parseFloat(v.sph_os), parseFloat(v.cyl_os));
            out.appendChild(resultRow("SE OS", dioptreStr(seOs), false));
          }
        }
        render();
        body.__refresh = render;
      },
    },
    {
      id: "reference",
      name: "Reference",
      hint: "norms the front desk asks about",
      build: function (body) {
        var cards = [
          ["IOP normal range", "10 – 21 mmHg"],
          ["VA grades", "6/6 normal · 6/9–6/12 reduced · 6/18+ impaired"],
          ["Drop frequencies", "QID = 4×/day · TID = 3×/day · HS = at bedtime"],
          ["Screen rule", "20-20-20 — every 20 min, look 20 ft away, 20 s"],
          ["Glaucoma review", "suspects recheck IOP + fields every 6 months"],
        ];
        cards.forEach(function (card) {
          var box = h(
            "div",
            "border-radius:10px;border:1px solid " + C.border + ";background:" + C.soft + ";padding:7px 9px;display:flex;flex-direction:column;gap:1px;",
          );
          box.appendChild(h("span", "font-size:11px;font-weight:700;color:" + C.fg + ";", card[0]));
          box.appendChild(h("span", "font-size:11px;line-height:1.45;color:" + C.dim + ";", card[1]));
          body.appendChild(box);
        });
      },
    },
  ];

  /* ============================ panel mount ============================== */

  function buildInstance(host) {
    while (host.firstChild) host.removeChild(host.firstChild);

    var root = h(
      "div",
      "display:flex;flex-direction:column;gap:8px;font-size:12.5px;color:" + C.fg + ";min-width:0;",
    );

    /* tool picker */
    var picker = h("div", "display:flex;flex-wrap:wrap;gap:4px;");
    var body = h("div", "display:flex;flex-direction:column;gap:6px;");
    var hint = h("div", "font-size:10px;line-height:1.5;color:" + C.dim + ";", "");

    function openTool(id) {
      cfg.tool = id;
      persist();
      var tool = null;
      TOOLS.forEach(function (t) {
        if (t.id === id) tool = t;
      });
      if (!tool) tool = TOOLS[0];
      Array.prototype.forEach.call(picker.children, function (chip) {
        var on = chip.getAttribute("data-tool") === tool.id;
        chip.style.background = on ? C.chip : "var(--muted,#1f2937)";
        chip.style.color = on ? C.accent : C.dim;
        chip.style.borderColor = on ? "color-mix(in oklab, var(--accent-live) 40%, transparent)" : "var(--border)";
      });
      body.textContent = "";
      body.appendChild(label(tool.hint || tool.name));
      tool.build(body);
      if (body.__refresh) body.__refresh();
      hint.textContent = "";
    }

    TOOLS.forEach(function (t) {
      var chip = h(
        "button",
        "height:24px;padding:0 9px;border-radius:999px;border:1px solid var(--border);cursor:pointer;" +
          "font-size:11px;font-weight:600;transition:all .12s ease;background:var(--muted,#1f2937);color:" + C.dim + ";",
        t.name,
      );
      chip.setAttribute("data-tool", t.id);
      chip.type = "button";
      chip.addEventListener("click", function () {
        openTool(t.id);
      });
      picker.appendChild(chip);
    });

    root.appendChild(picker);
    root.appendChild(body);
    root.appendChild(hint);
    host.appendChild(root);
    instances.push(root);
    openTool(cfg.tool);
  }

  function refreshInstances() {
    instances.forEach(function (root) {
      if (!root.isConnected) return;
      /* re-run the active tool's renderer so patient-aware tools update */
      var chips = root.querySelectorAll("[data-tool]");
      var active = null;
      Array.prototype.forEach.call(chips, function (chip) {
        if (chip.style.color.indexOf("accent") >= 0 || chip.getAttribute("data-tool") === cfg.tool) active = chip.getAttribute("data-tool");
      });
      var id = active || cfg.tool;
      cfg.tool = id;
      var click = null;
      Array.prototype.forEach.call(chips, function (chip) {
        if (chip.getAttribute("data-tool") === id) click = chip;
      });
      if (click) click.click();
    });
  }

  function reapInstances() {
    instances = instances.filter(function (el) {
      return el.isConnected;
    });
  }

  ctx.registerRightPanel({
    id: "tools",
    title: "Utility tools",
    icon: "Calculator",
    order: 10,
    mount: function (host) {
      buildInstance(host);
    },
    destroy: reapInstances,
  });

  /* patient-aware refresh */
  ctx.registerEvent("active-note-changed", function () {
    ctx.app
      .getActivePatient()
      .then(function (p) {
        state.patient = p;
        refreshInstances();
      })
      .catch(function () {
        /* non-fatal */
      });
  });

  ctx.registerCommand({
    id: "open-utility-panel",
    title: "Utility Panel: open clinical tools",
    icon: "Calculator",
    run: function () {
      /* the right panel renders the registered tab whenever it is visible —
         opening it is instant on desktop, and the command doubles as the
         discoverability entry in the palette */
      ctx.showToast("Utility Panel — open the right panel to use the clinical tools");
    },
  });

  ctx.addRibbonIcon("Calculator", "Open utility panel", function () {
    ctx.showToast("Utility Panel — open the right panel to use the clinical tools");
  });

  /* ============================== settings ============================== */

  ctx.addSettingsPane(function (el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    var box = h("div", "display:flex;flex-direction:column;gap:4px;font-size:12.5px;");
    box.appendChild(label("Utility Panel"));
    box.appendChild(
      h(
        "div",
        "font-size:11px;line-height:1.6;color:" + C.dim + ";",
        "Adds a Tools tab to the right context panel: spherical equivalent, transposition, age, IOP + CCT, Snellen conversions, vertex power, near add, keratometry, Prentice's rule, the active patient's Rx summary and quick reference cards.",
      ),
    );
    el.appendChild(box);
  });

  /* ================================ boot ================================ */

  ctx
    .loadData()
    .then(function (d) {
      if (d && typeof d === "object" && typeof d.tool === "string") {
        var known = false;
        TOOLS.forEach(function (t) {
          if (t.id === d.tool) known = true;
        });
        if (known) cfg.tool = d.tool;
      }
      return ctx.app.getActivePatient();
    })
    .then(function (p) {
      state.patient = p;
      refreshInstances();
    })
    .catch(function () {
      /* non-fatal */
    });

  function persist() {
    try {
      void ctx.saveData({ tool: cfg.tool });
    } catch (e) {
      /* non-fatal */
    }
  }

  ctx.onunload = function () {
    instances = [];
  };
})(ctx);
