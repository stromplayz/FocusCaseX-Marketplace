/* FocusCaseX docs — animated terminal demos.
 *
 * Scans .term blocks and replays their content like a real CLI session:
 * commands type out character by character, outputs print in fast
 * bursts, and a cursor blinks at the end. A replay button re-runs the
 * block; a copy button copies its command line. Honors
 * prefers-reduced-motion by rendering everything instantly.
 *
 * Markup contract (used across the docs pages):
 *   <div class="term" data-title="fcx status">
 *     <div class="term-cmd">fcx status</div>
 *     <div class="term-out">Not activated — run fcx login.</div>
 *     <div class="term-note"># elided for the guide</div>
 *   </div>
 * .term-cmd lines are typed; the "$ " prompt is added by the component.
 * .term-out prints right after the preceding command. .term-note is a
 * dim aside inside the terminal. Order of children is preserved.
 */
(function () {
  "use strict";

  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var CSS =
    ".term{background:#05070d;border:1px solid #1e2633;border-radius:12px;margin:16px 0;overflow:hidden;font-family:var(--font-mono,ui-monospace,SFMono-Regular,Menlo,monospace)}" +
    ".term-bar{display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid #1e2633;background:#0a0f1a}" +
    ".term-dots{display:flex;gap:6px;flex-shrink:0}.term-dots i{width:10px;height:10px;border-radius:50%;display:block}" +
    ".term-dots i:nth-child(1){background:#f87171}.term-dots i:nth-child(2){background:#fbbf24}.term-dots i:nth-child(3){background:#34d399}" +
    ".term-title{font-size:11.5px;color:#8fa3bf;letter-spacing:.02em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".term-actions{margin-left:auto;display:flex;gap:8px;flex-shrink:0}" +
    ".term-btn{background:transparent;border:1px solid #263248;border-radius:7px;color:#8fa3bf;font-size:11px;padding:3px 9px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;font-family:inherit}" +
    ".term-btn:hover{color:#e5e7eb;border-color:#3b5378}" +
    ".term-body{padding:13px 16px 15px;font-size:12.4px;line-height:1.58;color:#dbe3ee;white-space:pre;overflow-x:auto}" +
    ".term-cmd{color:#ffffff}.term-cmd::before{content:\"$ \";color:#3b82f6;font-weight:600}" +
    ".term-out{color:#a7b4c8}" +
    ".term-note{color:#5c6b84;font-style:italic}" +
    ".term-caret{display:inline-block;width:7px;height:14px;background:#3b82f6;vertical-align:-2px;margin-left:1px;animation:termblink 1s steps(1) infinite}" +
    "@keyframes termblink{50%{opacity:0}}" +
    "@media (prefers-reduced-motion: reduce){.term-caret{animation:none}}";

  function injectStyle() {
    if (document.getElementById("term-demo-css")) return;
    var s = document.createElement("style");
    s.id = "term-demo-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {});
      return;
    }
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch (e) {
      /* clipboard unavailable — nothing to do */
    }
    document.body.removeChild(ta);
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function initTerm(term) {
    if (term.getAttribute("data-term-ready")) return;
    term.setAttribute("data-term-ready", "1");

    // capture the authored children, then rebuild with chrome
    var spec = [];
    var kids = Array.prototype.slice.call(term.childNodes);
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (k.nodeType !== 1) continue;
      var cls = k.className || "";
      var kind = cls.indexOf("term-cmd") >= 0 ? "cmd" : cls.indexOf("term-note") >= 0 ? "note" : "out";
      spec.push({ kind: kind, text: k.textContent.replace(/^\n+|\n+$/g, "") });
    }
    if (!spec.length) return;

    var title = term.getAttribute("data-title") || "terminal";
    term.textContent = "";

    var bar = el("div", "term-bar");
    var dots = el("div", "term-dots");
    dots.appendChild(el("i"));
    dots.appendChild(el("i"));
    dots.appendChild(el("i"));
    bar.appendChild(dots);
    bar.appendChild(el("div", "term-title", title));
    var actions = el("div", "term-actions");
    var copyBtn = el("button", "term-btn", "Copy");
    copyBtn.type = "button";
    copyBtn.setAttribute("aria-label", "Copy command");
    var replayBtn = el("button", "term-btn", "Replay");
    replayBtn.type = "button";
    replayBtn.setAttribute("aria-label", "Replay demo");
    actions.appendChild(copyBtn);
    actions.appendChild(replayBtn);
    bar.appendChild(actions);
    term.appendChild(bar);

    var body = el("div", "term-body");
    term.appendChild(body);

    var cmds = spec.filter(function (s) { return s.kind === "cmd"; }).map(function (s) { return s.text; });
    copyBtn.addEventListener("click", function () {
      copyText(cmds.join("\n"));
      copyBtn.textContent = "Copied";
      setTimeout(function () { copyBtn.textContent = "Copy"; }, 1400);
    });

    var playing = false;
    var token = 0;

    function caret() {
      var c = el("span", "term-caret");
      return c;
    }

    function play() {
      if (playing) return;
      playing = true;
      var my = ++token;
      body.textContent = "";
      var chain = Promise.resolve();

      function typeInto(node, text) {
        return new Promise(function (resolve) {
          if (REDUCED) {
            node.textContent = text;
            return resolve();
          }
          var i = 0;
          var caretEl = caret();
          node.appendChild(caretEl);
          var step = Math.max(14, Math.min(38, 900 / Math.max(6, text.length)));
          (function tick() {
            if (my !== token) return resolve();
            i += 1;
            node.textContent = text.slice(0, i);
            node.appendChild(caretEl);
            if (i < text.length) setTimeout(tick, step);
            else setTimeout(resolve, 160);
          })();
        });
      }

      function reveal(node, text) {
        return new Promise(function (resolve) {
          if (my !== token) return resolve();
          var lines = text.split("\n");
          if (REDUCED || lines.length > 14) {
            node.textContent = text;
            return setTimeout(resolve, 90);
          }
          var per = Math.max(9, Math.min(42, 950 / lines.length));
          var i = 0;
          (function tick() {
            if (my !== token) return resolve();
            i += 1;
            node.textContent = lines.slice(0, i).join("\n");
            if (i < lines.length) setTimeout(tick, per);
            else setTimeout(resolve, 120);
          })();
        });
      }

      spec.forEach(function (step) {
        chain = chain.then(function () {
          if (my !== token) return;
          var node = el("div", step.kind === "cmd" ? "term-cmd" : step.kind === "note" ? "term-note" : "term-out");
          body.appendChild(node);
          if (step.kind === "cmd") return typeInto(node, step.text);
          if (step.kind === "note") {
            node.textContent = step.text;
            return;
          }
          return reveal(node, step.text);
        });
      });

      chain.then(function () {
        if (my !== token) return;
        var last = body.lastChild;
        if (last && last.nodeType === 1 && last.className.indexOf("term-out") >= 0) {
          last.appendChild(caret());
        }
        playing = false;
      });
    }

    replayBtn.addEventListener("click", function () {
      token += 1;
      playing = false;
      play();
    });

    if (REDUCED) {
      play();
      return;
    }
    if ("IntersectionObserver" in window) {
      var seen = false;
      var io = new IntersectionObserver(
        function (entries) {
          for (var j = 0; j < entries.length; j++) {
            if (entries[j].isIntersecting && !seen) {
              seen = true;
              io.disconnect();
              play();
            }
          }
        },
        { threshold: 0.3 }
      );
      io.observe(term);
    } else {
      play();
    }
  }

  window.FCXTERM = {
    init: function (root) {
      injectStyle();
      (root || document).querySelectorAll(".term").forEach(initTerm);
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      window.FCXTERM.init();
    });
  } else {
    window.FCXTERM.init();
  }
})();
