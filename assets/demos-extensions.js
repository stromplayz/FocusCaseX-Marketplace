/* FocusCaseX Marketplace — per-extension FUNCTIONAL previews.
 * Every extension gets a small simulated UI showing what it actually DOES
 * (sample data, static snapshot styled as live — no timers, no JS animation),
 * not marketing copy. Keyed by item id, e.g.
 *   window.FCX_EXT_DEMOS["plugin:optomize"] = function (item) { return htmlString; }
 * Self-contained: one <style> tag injected into <head> at load, every class
 * prefixed "fcxe-". Loads BEFORE app.js — no FCX dependency, plain literals.
 */
(function () {
  "use strict";

  /* ----------------------------- styling -------------------------------- */
  /* Site tokens with hardcoded fallbacks so the demos survive standalone.  */

  var CSS = [
    ".fcxe,.fcxe *{box-sizing:border-box}",
    ".fcxe{display:flex;flex-direction:column;gap:10px;min-width:0;font-family:var(--font-display,\"Space Grotesk\",system-ui,sans-serif)}",

    /* header */
    ".fcxe-head{display:flex;align-items:center;gap:8px;min-width:0}",
    ".fcxe-tile{flex:0 0 auto;width:24px;height:24px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--blue-soft,#e9edff);border:1px solid var(--blue-line,#bcc7ff);color:var(--blue,#0533ff);font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:11px;font-weight:700}",
    ".fcxe-name{font-size:13px;font-weight:700;color:var(--ink,#0a0a0f);letter-spacing:-.01em}",
    ".fcxe-kind{font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3,#767d92);background:var(--bg-soft,#f5f6fb);border:1px solid var(--line,#e4e7f0);border-radius:999px;padding:2px 8px}",
    ".fcxe-cat{margin-left:auto;font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--blue,#0533ff);background:var(--blue-soft,#e9edff);border:1px solid var(--blue-line,#bcc7ff);border-radius:999px;padding:2px 8px}",

    /* stage + footer */
    ".fcxe-stage{border:1px solid var(--line,#e4e7f0);border-radius:12px;background:var(--paper,#fff);padding:12px;display:flex;flex-direction:column;gap:8px;min-width:0}",
    ".fcxe-stage--soft{background:var(--bg-soft,#f5f6fb)}",
    ".fcxe-foot{display:flex;align-items:center;gap:7px;font-size:10.5px;color:var(--ink-3,#767d92)}",
    ".fcxe-foot::before{content:\"\";flex:0 0 auto;width:5px;height:5px;border-radius:50%;background:var(--blue-line,#bcc7ff)}",

    /* micro components */
    ".fcxe-lab{font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3,#767d92)}",
    ".fcxe-dim{font-size:11px;color:var(--ink-3,#767d92);line-height:1.45}",
    ".fcxe-mono{font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace)}",
    ".fcxe-chip{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;border-radius:999px;padding:2.5px 9px;background:var(--blue-soft,#e9edff);color:var(--blue,#0533ff);border:1px solid var(--blue-line,#bcc7ff);white-space:nowrap}",
    ".fcxe-chip--dim{background:var(--bg-soft,#f5f6fb);color:var(--ink-2,#4a5064);border-color:var(--line,#e4e7f0)}",
    ".fcxe-chip--ok{background:var(--ok-soft,#e4f4ea);color:var(--ok,#0b8a3e);border-color:#bfe4cd}",
    ".fcxe-chip--warn{background:#fdeee4;color:var(--warn,#b3540c);border-color:#f3cdb2}",
    ".fcxe-row{display:flex;align-items:center;gap:8px;padding:7px 9px;border:1px solid var(--line,#e4e7f0);border-radius:9px;background:#fff;font-size:12px;color:var(--ink-2,#4a5064);transition:border-color .15s ease,background .15s ease}",
    ".fcxe-row--hi{border-color:var(--blue-line,#bcc7ff);background:var(--blue-soft,#e9edff);color:var(--blue-deep,#0226c2);font-weight:600}",
    ".fcxe-row--dim{background:var(--bg-soft,#f5f6fb);border-style:dashed}",
    ".fcxe-kbd{font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:9.5px;color:var(--ink-2,#4a5064);border:1px solid var(--line-2,#d4d9e8);border-bottom-width:2px;border-radius:5px;padding:1.5px 6px;background:#fff;white-space:nowrap}",
    ".fcxe-btn{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;border-radius:8px;padding:6px 12px;border:1px solid var(--blue-deep,#0226c2);background:var(--blue,#0533ff);color:#fff}",
    ".fcxe-btn--ghost{background:#fff;color:var(--blue,#0533ff);border-color:var(--blue-line,#bcc7ff)}",
    ".fcxe-meter{flex:1;height:6px;border-radius:999px;background:var(--bg-soft-2,#eef0f8);overflow:hidden;min-width:20px}",
    ".fcxe-meter i{display:block;height:100%;border-radius:999px;background:var(--blue,#0533ff)}",
    ".fcxe-tg{position:relative;flex:0 0 auto;width:26px;height:15px;border-radius:999px;background:var(--line-2,#d4d9e8);transition:background .15s ease}",
    ".fcxe-tg::after{content:\"\";position:absolute;top:2px;left:2px;width:11px;height:11px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(10,12,24,.25);transition:left .15s ease}",
    ".fcxe-tg.is-on{background:var(--blue,#0533ff)}",
    ".fcxe-tg.is-on::after{left:13px}",
    ".fcxe-cols{display:flex;gap:9px;min-width:0}",
    ".fcxe-col{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}",
    ".fcxe-sq{flex:0 0 auto;width:20px;height:20px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;background:var(--blue-soft,#e9edff);border:1px solid var(--blue-line,#bcc7ff);color:var(--blue,#0533ff);font-weight:700}",
    ".fcxe-push{margin-left:auto}",

    /* 01 · optomize */
    ".fcxe-op-bar{display:flex;align-items:center;gap:8px}",
    ".fcxe-op-file{border:1px solid var(--line,#e4e7f0);border-radius:10px;background:#fff;overflow:hidden}",
    ".fcxe-op-pat{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--line,#e4e7f0);background:var(--bg-soft,#f5f6fb)}",
    ".fcxe-op-av{flex:0 0 auto;width:22px;height:22px;border-radius:50%;background:var(--blue-soft,#e9edff);border:1px solid var(--blue-line,#bcc7ff);color:var(--blue,#0533ff);font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center}",
    ".fcxe-op-visit{display:flex;align-items:baseline;gap:8px;padding:7px 10px;border-bottom:1px dashed var(--line,#e4e7f0);font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:10.5px;color:var(--ink-2,#4a5064)}",
    ".fcxe-op-visit b{font-weight:700;color:var(--ink,#0a0a0f)}",
    ".fcxe-op-delta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:7px 8px;padding:7px 9px;border:1px solid var(--blue-line,#bcc7ff);border-radius:8px;background:var(--blue-soft,#e9edff);font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:10.5px;color:var(--blue-deep,#0226c2)}",
    ".fcxe-op-delta b{font-weight:700}",
    ".fcxe-op-patline{display:flex;align-items:center;gap:8px;padding:6px 10px 2px;font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:10px;color:var(--ink-3,#767d92)}",

    /* 02 · focuslinks-navigation */
    ".fcxe-fn-side{border:1px solid var(--line,#e4e7f0);border-radius:10px;background:var(--bg-soft,#f5f6fb);padding:8px;display:flex;flex-direction:column;gap:3px}",
    ".fcxe-fn-head{display:flex;align-items:center;gap:6px;padding:2px 4px 6px;font-size:11px;font-weight:700;color:var(--ink,#0a0a0f);box-shadow:inset 2px 0 0 var(--blue,#0533ff);padding-left:8px}",
    ".fcxe-fn-row{display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--ink-2,#4a5064);padding:5px 8px;border-radius:7px;transition:background .15s ease}",
    ".fcxe-fn-row.is-active{background:#fff;border:1px solid var(--blue-line,#bcc7ff);color:var(--blue,#0533ff);font-weight:600}",
    ".fcxe-fn-ic{flex:0 0 auto;width:12px;height:12px;border-radius:4px;background:var(--bg-soft-2,#eef0f8);border:1px solid var(--line,#e4e7f0)}",
    ".fcxe-fn-row.is-active .fcxe-fn-ic{background:var(--blue-soft,#e9edff);border-color:var(--blue-line,#bcc7ff)}",
    ".fcxe-crumbs{display:flex;align-items:center;flex-wrap:wrap;gap:5px;font-size:11.5px}",
    ".fcxe-crumb{font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:10.5px;padding:3px 8px;border:1px solid var(--line,#e4e7f0);border-radius:7px;background:#fff;color:var(--ink-2,#4a5064)}",
    ".fcxe-crumb--hi{border-color:var(--blue-line,#bcc7ff);background:var(--blue-soft,#e9edff);color:var(--blue-deep,#0226c2);font-weight:600}",
    ".fcxe-crumbs i{font-style:normal;color:var(--ink-3,#767d92)}",

    /* 03 · essential-diagrams */
    ".fcxe-dg-eye{position:relative;width:76px;height:76px;border-radius:50%;background:#fff;border:1.5px solid var(--line-2,#d4d9e8)}",
    ".fcxe-dg-limbus{position:absolute;inset:9px;border-radius:50%;border:1.5px solid var(--blue-line,#bcc7ff);background:var(--blue-soft,#e9edff)}",
    ".fcxe-dg-iris{position:absolute;inset:23px;border-radius:50%;background:linear-gradient(140deg,#9db1ff,#3d5bff)}",
    ".fcxe-dg-pupil{position:absolute;inset:31px;border-radius:50%;background:var(--ink,#0a0a0f)}",
    ".fcxe-dg-sel{position:absolute;inset:20px;border-radius:50%;border:1.5px dashed var(--blue,#0533ff)}",
    ".fcxe-dg-dot{position:absolute;top:2px;right:10px;width:7px;height:7px;border-radius:50%;background:var(--blue,#0533ff);box-shadow:0 0 0 3px var(--blue-soft,#e9edff)}",
    ".fcxe-dg-find{display:flex;align-items:center;gap:7px;padding:6px 9px;border:1px solid var(--line,#e4e7f0);border-radius:8px;background:#fff;font-size:11.5px;color:var(--ink-2,#4a5064)}",
    ".fcxe-dg-flow{display:flex;align-items:center;gap:5px;flex-wrap:wrap;font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:9.5px;color:var(--ink-3,#767d92)}",
    ".fcxe-dg-flow b{font-weight:600;color:var(--blue,#0533ff);border:1px solid var(--blue-line,#bcc7ff);border-radius:6px;padding:2px 7px;background:var(--blue-soft,#e9edff)}",
    ".fcxe-dg-flow i{font-style:normal}",

    /* 04 · word-count-plus */
    ".fcxe-wc-doc{border:1px solid var(--line,#e4e7f0);border-radius:10px;background:#fff;padding:10px;display:flex;flex-direction:column;gap:5px}",
    ".fcxe-wc-doc .t{font-size:12.5px;font-weight:700;color:var(--ink,#0a0a0f)}",
    ".fcxe-wc-doc p{margin:0;font-size:11.5px;line-height:1.55;color:var(--ink-2,#4a5064)}",
    ".fcxe-wc-status{display:flex;align-items:center;gap:10px;border:1px solid var(--line,#e4e7f0);border-radius:8px;background:var(--bg-soft,#f5f6fb);padding:6px 10px;font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:10.5px}",
    ".fcxe-wc-status b{color:var(--blue,#0533ff);font-weight:700}",
    ".fcxe-wc-status span{color:var(--ink-3,#767d92)}",
    ".fcxe-wc-dot{flex:0 0 auto;width:6px;height:6px;border-radius:50%;background:var(--ok,#0b8a3e);box-shadow:0 0 0 2.5px var(--ok-soft,#e4f4ea)}",

    /* 05 · random-note */
    ".fcxe-die{flex:0 0 auto;width:30px;height:30px;border-radius:8px;background:#fff;border:1px solid var(--line-2,#d4d9e8);display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);padding:4px}",
    ".fcxe-die span{display:flex;align-items:center;justify-content:center}",
    ".fcxe-die span.is-p::before{content:\"\";width:4.5px;height:4.5px;border-radius:50%;background:var(--ink,#0a0a0f)}",
    ".fcxe-die.is-hit{border-color:var(--blue,#0533ff);box-shadow:0 0 0 2.5px var(--blue-soft,#e9edff)}",
    ".fcxe-die.is-hit span.is-p::before{background:var(--blue,#0533ff)}",

    /* 06 · note-templates */
    ".fcxe-nt-doc{border:1px solid var(--line,#e4e7f0);border-radius:10px;background:#fff;padding:10px;display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--ink-2,#4a5064)}",
    ".fcxe-nt-ins{border:1px dashed var(--blue-line,#bcc7ff);border-radius:8px;background:var(--blue-soft,#e9edff);padding:8px 9px;display:flex;flex-direction:column;gap:4px;font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:10.5px;color:var(--blue-deep,#0226c2)}",
    ".fcxe-nt-ins b{font-weight:700}",
    ".fcxe-nt-cb{display:inline-block;width:10px;height:10px;border:1.5px solid var(--ink-3,#767d92);border-radius:3px;margin-right:6px;vertical-align:-1px;background:#fff}",
    ".fcxe-nt-cb.is-on{background:var(--blue,#0533ff);border-color:var(--blue,#0533ff)}",

    /* 07 · heading-numbering */
    ".fcxe-hn-pane{flex:1;border:1px solid var(--line,#e4e7f0);border-radius:10px;padding:9px 10px;display:flex;flex-direction:column;gap:5px;background:#fff;min-width:0}",
    ".fcxe-hn-pane.is-before{background:var(--bg-soft,#f5f6fb)}",
    ".fcxe-hn-h2{font-size:12.5px;font-weight:700;color:var(--ink,#0a0a0f)}",
    ".fcxe-hn-h3{font-size:11.5px;font-weight:600;color:var(--ink-2,#4a5064);padding-left:10px}",
    ".fcxe-hn-num{font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-weight:700;color:var(--blue,#0533ff);margin-right:3px}",
    ".fcxe-hn-num--sub{color:var(--ink-3,#767d92)}",
    ".fcxe-hn-arrow{align-self:center;flex:0 0 auto;color:var(--blue,#0533ff);font-weight:700;font-size:13px}",

    /* 08 · tag-summary */
    ".fcxe-ts-row{display:flex;align-items:center;gap:9px;padding:6px 9px;border:1px solid var(--line,#e4e7f0);border-radius:8px;background:#fff}",
    ".fcxe-ts-tag{font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:11.5px;font-weight:600;color:var(--blue,#0533ff)}",
    ".fcxe-ts-count{font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:10.5px;color:var(--ink-2,#4a5064);border:1px solid var(--line,#e4e7f0);border-radius:6px;padding:1px 7px;background:var(--bg-soft,#f5f6fb)}",

    /* 09 · update-v2-notifier */
    ".fcxe-up-banner{position:relative;display:flex;align-items:center;gap:12px;border:1px solid var(--dark-line,#20242f);border-radius:10px;background:var(--dark-2,#0d0f16);padding:12px;overflow:hidden;background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px)}",
    ".fcxe-up-title{font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:15px;font-weight:800;letter-spacing:.28em;color:#fff;text-transform:uppercase;white-space:nowrap}",
    ".fcxe-up-sub{font-size:10px;color:var(--dark-muted,#9aa1b5);margin-top:3px}",
    ".fcxe-up-dl{font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:10px;font-weight:700;letter-spacing:.14em;color:#fff;background:var(--blue,#0533ff);border-radius:6px;padding:7px 12px;box-shadow:2px 2px 0 rgba(255,255,255,.16);white-space:nowrap}",
    ".fcxe-up-chip{font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:9.5px;font-weight:700;letter-spacing:.14em;color:var(--blue-bright,#7c9bff);border:1px solid var(--dark-line,#20242f);border-radius:6px;padding:4px 9px;background:rgba(124,155,255,.08);white-space:nowrap}",
    ".fcxe-up-rocket{position:relative;flex:0 0 auto;width:15px;height:24px}",
    ".fcxe-up-rocket i{position:absolute;top:0;left:0;width:3px;height:3px;background:transparent;box-shadow:6px 0 0 #fff,3px 3px 0 var(--blue-bright,#7c9bff),6px 3px 0 var(--blue-bright,#7c9bff),9px 3px 0 var(--blue-bright,#7c9bff),3px 6px 0 var(--blue-bright,#7c9bff),6px 6px 0 var(--dark,#060609),9px 6px 0 var(--blue-bright,#7c9bff),3px 9px 0 var(--blue-bright,#7c9bff),6px 9px 0 var(--blue-bright,#7c9bff),9px 9px 0 var(--blue-bright,#7c9bff),3px 12px 0 var(--blue-bright,#7c9bff),6px 12px 0 var(--blue-bright,#7c9bff),9px 12px 0 var(--blue-bright,#7c9bff),0 15px 0 var(--warn,#b3540c),3px 15px 0 var(--blue-bright,#7c9bff),6px 15px 0 var(--blue-bright,#7c9bff),9px 15px 0 var(--blue-bright,#7c9bff),12px 15px 0 var(--warn,#b3540c),0 18px 0 var(--warn,#b3540c),6px 18px 0 var(--warn,#b3540c),6px 21px 0 var(--warn,#b3540c)}",

    /* 10 · backlink-jump */
    ".fcxe-bl-note{border:1px solid var(--line,#e4e7f0);border-radius:10px;background:#fff;padding:10px;font-size:12px;line-height:1.6;color:var(--ink-2,#4a5064)}",
    ".fcxe-bl-link{background:var(--blue-soft,#e9edff);color:var(--blue-deep,#0226c2);border:1px solid var(--blue-line,#bcc7ff);border-radius:4px;padding:0 4px;font-weight:600;white-space:nowrap}",
    ".fcxe-bl-panel{border:1px solid var(--line,#e4e7f0);border-radius:10px;background:var(--bg-soft,#f5f6fb);padding:8px;display:flex;flex-direction:column;gap:4px}",
    ".fcxe-bl-from{display:flex;align-items:center;gap:7px;padding:6px 8px;border:1px solid var(--line,#e4e7f0);border-radius:8px;background:#fff;font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:10.5px;color:var(--ink-2,#4a5064)}",

    /* 11 · core-ui */
    ".fcxe-cui-win{border:1px solid var(--line,#e4e7f0);border-radius:10px;overflow:hidden;background:#fff;min-width:0}",
    ".fcxe-cui-cap{display:flex;align-items:center;gap:6px;padding:4px 9px;border-bottom:1px solid var(--line,#e4e7f0);background:var(--bg-soft,#f5f6fb);font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3,#767d92)}",
    ".fcxe-cui-bar{display:flex;gap:6px;padding:8px 9px;align-items:center}",
    ".fcxe-cui-tab{font-size:10.5px;padding:3px 9px;border:1px solid var(--line,#e4e7f0);border-radius:4px;color:var(--ink-2,#4a5064);background:#fff;white-space:nowrap}",
    ".fcxe-cui-tab.is-new{border-radius:999px;border-color:var(--blue-line,#bcc7ff);background:var(--blue-soft,#e9edff);color:var(--blue,#0533ff);font-weight:600}",
    ".fcxe-cui-row{display:flex;align-items:center;gap:8px;padding:7px 9px;border:1px solid var(--line,#e4e7f0);border-radius:9px;background:#fff;font-size:12px;color:var(--ink-2,#4a5064)}",
    ".fcxe-cui-row b{color:var(--ink,#0a0a0f);font-weight:600}",

    /* 12 · daily-spark */
    ".fcxe-ds-card{border:1px solid var(--line,#e4e7f0);border-radius:12px;background:#fff;padding:11px;display:flex;flex-direction:column;gap:8px;box-shadow:0 1px 2px rgba(10,12,24,.05)}",
    ".fcxe-ds-top{display:flex;align-items:center;gap:8px}",
    ".fcxe-ds-title{font-size:13.5px;font-weight:700;color:var(--ink,#0a0a0f)}",
    ".fcxe-ds-check{display:flex;align-items:center;gap:8px;padding:6px 9px;border:1px solid var(--line,#e4e7f0);border-radius:8px;font-size:11.5px;color:var(--ink-2,#4a5064)}",
    ".fcxe-ds-check b{font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:11px;color:var(--blue,#0533ff)}",
    ".fcxe-ds-toast{display:flex;align-items:center;gap:8px;border:1px solid var(--line,#e4e7f0);border-radius:999px;padding:7px 12px;background:var(--bg-soft,#f5f6fb);font-size:11px;color:var(--ink-2,#4a5064)}",
    ".fcxe-ds-toast i{font-style:normal;flex:0 0 auto;width:7px;height:7px;border-radius:50%;background:var(--blue,#0533ff);box-shadow:0 0 0 3px var(--blue-soft,#e9edff)}",

    /* 13 · focuscasex-sbl */
    ".fcxe-sbl-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}",
    ".fcxe-sbl-stat{border:1px solid var(--line,#e4e7f0);border-radius:9px;padding:7px 8px;background:#fff;min-width:0}",
    ".fcxe-sbl-stat b{display:block;font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:12.5px;color:var(--ink,#0a0a0f);white-space:nowrap}",
    ".fcxe-sbl-stat span{font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3,#767d92)}",
    ".fcxe-sbl-tree{border:1px solid var(--line,#e4e7f0);border-radius:10px;background:#fff;padding:8px;display:flex;flex-direction:column;gap:2px}",
    ".fcxe-sbl-r{display:flex;align-items:center;gap:7px;font-size:11.5px;padding:5px 8px;border-radius:7px;color:var(--ink-2,#4a5064)}",
    ".fcxe-sbl-nest{margin-left:14px;padding-left:10px;border-left:1px solid var(--line,#e4e7f0);display:flex;flex-direction:column;gap:2px}",
    ".fcxe-sbl-r.is-hi{background:var(--blue-soft,#e9edff);border:1px solid var(--blue-line,#bcc7ff);color:var(--blue-deep,#0226c2);font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:10.5px;font-weight:600}",
    ".fcxe-sbl-glyph{flex:0 0 auto;width:14px;height:14px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:8px;background:var(--bg-soft-2,#eef0f8);border:1px solid var(--line,#e4e7f0);color:var(--ink-3,#767d92)}",
    ".fcxe-sbl-r.is-hi .fcxe-sbl-glyph{background:#fff;border-color:var(--blue-line,#bcc7ff);color:var(--blue,#0533ff)}",

    /* 14 · utility-panel */
    ".fcxe-ut-dock{border:1px solid var(--line,#e4e7f0);border-radius:10px;background:var(--bg-soft,#f5f6fb);padding:9px;display:flex;flex-direction:column;gap:8px}",
    ".fcxe-ut-tabs{display:flex;gap:4px;flex-wrap:wrap}",
    ".fcxe-ut-tab{font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:9px;letter-spacing:.06em;padding:3px 7px;border:1px solid var(--line,#e4e7f0);border-radius:6px;background:#fff;color:var(--ink-3,#767d92)}",
    ".fcxe-ut-tab.is-on{background:var(--blue,#0533ff);border-color:var(--blue-deep,#0226c2);color:#fff;font-weight:700}",
    ".fcxe-ut-field{display:flex;align-items:center;gap:7px}",
    ".fcxe-ut-key{flex:0 0 auto;width:44px;font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:10px;color:var(--ink-3,#767d92);text-transform:uppercase;letter-spacing:.08em}",
    ".fcxe-ut-in{flex:1;font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:12px;border:1px solid var(--line-2,#d4d9e8);border-radius:7px;padding:6px 9px;background:#fff;color:var(--ink,#0a0a0f)}",
    ".fcxe-ut-res{display:flex;justify-content:space-between;align-items:center;border:1px dashed var(--blue-line,#bcc7ff);border-radius:8px;padding:7px 10px;background:var(--blue-soft,#e9edff);font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:12px;color:var(--blue-deep,#0226c2)}",
    ".fcxe-ut-res b{font-weight:700}",

    /* 15 · quick-actions-v2 */
    ".fcxe-qa-launch{border:1px solid var(--line,#e4e7f0);border-radius:12px;background:var(--bg-soft,#f5f6fb);padding:10px;display:flex;flex-direction:column;gap:7px}",
    ".fcxe-qa-search{display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid var(--line,#e4e7f0);border-radius:8px;background:#fff;padding:6px 9px;font-size:11.5px;color:var(--ink-3,#767d92)}",
    ".fcxe-qa-act{display:flex;align-items:center;gap:8px;font-size:11.5px;font-weight:600;color:var(--ink,#0a0a0f);background:#fff;border:1px solid var(--line,#e4e7f0);border-radius:9px;padding:7px 9px}",
    ".fcxe-qa-act.is-new{border-color:var(--blue-line,#bcc7ff);box-shadow:0 0 0 2px var(--blue-soft,#e9edff)}",

    /* 16 · core-cmds */
    ".fcxe-cc-box{border:1px solid var(--line-2,#d4d9e8);border-radius:11px;background:#fff;box-shadow:0 8px 24px -14px rgba(10,12,24,.2);overflow:hidden}",
    ".fcxe-cc-input{display:flex;align-items:center;gap:7px;padding:9px 11px;border-bottom:1px solid var(--line,#e4e7f0);font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:12px;color:var(--ink,#0a0a0f)}",
    ".fcxe-cc-input i{font-style:normal;color:var(--ink-3,#767d92)}",
    ".fcxe-cc-caret{flex:0 0 auto;width:7px;height:13px;background:var(--blue,#0533ff)}",
    ".fcxe-cc-row{display:flex;align-items:center;gap:8px;padding:7px 11px;border-top:1px solid var(--line,#e4e7f0);font-size:12px;color:var(--ink,#0a0a0f)}",
    ".fcxe-cc-row:first-of-type{border-top:0}",
    ".fcxe-cc-src{font-size:9px;font-weight:600;letter-spacing:.06em;border-radius:999px;padding:2px 7px;border:1px solid var(--line,#e4e7f0);color:var(--ink-3,#767d92);background:var(--bg-soft,#f5f6fb);white-space:nowrap}",
    ".fcxe-cc-src--ext{border-color:var(--blue-line,#bcc7ff);background:var(--blue-soft,#e9edff);color:var(--blue,#0533ff)}",
    ".fcxe-cc-run{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border-radius:6px;padding:3px 8px;background:var(--blue,#0533ff);color:#fff}",

    /* 17 · core-modes */
    ".fcxe-cm-seg{display:flex;border:1px solid var(--line,#e4e7f0);border-radius:10px;overflow:hidden;background:var(--bg-soft,#f5f6fb)}",
    ".fcxe-cm-opt{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:9px;font-size:12px;font-weight:600;color:var(--ink-2,#4a5064)}",
    ".fcxe-cm-opt.is-on{background:#fff;color:var(--blue,#0533ff);box-shadow:inset 0 -2px 0 var(--blue,#0533ff)}",
    ".fcxe-cm-glyph{font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:10px}",
    ".fcxe-cm-row{display:flex;align-items:center;gap:8px;padding:6px 9px;border:1px solid var(--line,#e4e7f0);border-radius:8px;background:#fff;font-size:11.5px;color:var(--ink-2,#4a5064)}",
    ".fcxe-cm-row b{color:var(--ink,#0a0a0f);font-weight:600}",

    /* 18 · core-settings */
    ".fcxe-cs-pane{border:1px solid var(--line,#e4e7f0);border-radius:12px;background:#fff;overflow:hidden}",
    ".fcxe-cs-head{display:flex;align-items:center;gap:8px;padding:9px 12px;font-size:12px;font-weight:700;color:var(--ink,#0a0a0f);border-bottom:1px solid var(--line,#e4e7f0);box-shadow:inset 3px 0 0 var(--blue,#0533ff)}",
    ".fcxe-cs-row{display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid var(--line,#e4e7f0)}",
    ".fcxe-cs-row:last-child{border-bottom:0}",
    ".fcxe-cs-row .t{font-size:12px;font-weight:600;color:var(--ink,#0a0a0f)}",
    ".fcxe-cs-row .s{font-size:10.5px;color:var(--ink-3,#767d92);margin-top:1px}",

    /* 19 · core-pages */
    ".fcxe-cp-side{border:1px solid var(--line,#e4e7f0);border-radius:10px;background:var(--bg-soft,#f5f6fb);padding:8px;display:flex;flex-direction:column;gap:3px}",
    ".fcxe-cp-row{display:flex;align-items:center;gap:7px;font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:10.5px;color:var(--ink-2,#4a5064);padding:5px 8px;border-radius:7px;border:1px solid transparent}",
    ".fcxe-cp-row.is-active{background:#fff;border-color:var(--blue-line,#bcc7ff);color:var(--blue,#0533ff);font-weight:600}",
    ".fcxe-cp-file{border:1px solid var(--line,#e4e7f0);border-radius:10px;background:#fff;overflow:hidden;min-width:0}",
    ".fcxe-cp-filehead{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:6px 10px;border-bottom:1px solid var(--line,#e4e7f0);background:var(--bg-soft,#f5f6fb);font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:9.5px;color:var(--ink-3,#767d92)}",
    ".fcxe-cp-fm{padding:9px 10px;display:flex;flex-direction:column;gap:4px;font-family:var(--font-mono,\"JetBrains Mono\",ui-monospace,Menlo,monospace);font-size:11px;color:var(--ink-2,#4a5064)}",
    ".fcxe-cp-fm .hi{color:var(--blue,#0533ff);font-weight:600}"
  ].join("\n");

  var styleEl = document.createElement("style");
  styleEl.id = "fcxe-demos-style";
  styleEl.textContent = CSS;
  (document.head || document.documentElement).appendChild(styleEl);

  /* ---------------------------- tiny helpers ---------------------------- */

  function head(item) {
    var n = (item && item.name) || "Extension";
    var cat = (item && item.category) || "Extension";
    var letter = String(n).trim().charAt(0).toUpperCase() || "E";
    return (
      '<div class="fcxe-head">' +
      '<span class="fcxe-tile">' + letter + "</span>" +
      '<span class="fcxe-name">' + n + "</span>" +
      '<span class="fcxe-kind">Extension</span>' +
      '<span class="fcxe-cat">' + cat + "</span>" +
      "</div>"
    );
  }

  var FOOT =
    '<div class="fcxe-foot">Simulated preview — the real tool runs in your workspace, offline.</div>';

  function wrap(item, inner, mod) {
    return (
      head(item) +
      '<div class="fcxe-stage' + (mod ? " " + mod : "") + '">' +
      inner +
      "</div>" +
      FOOT
    );
  }

  function die(n, hit) {
    var P = { 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
    var marks = P[n] || [];
    var cells = "";
    for (var i = 0; i < 9; i++) {
      cells += '<span class="' + (marks.indexOf(i) > -1 ? "is-p" : "") + '"></span>';
    }
    return '<span class="fcxe-die' + (hit ? " is-hit" : "") + '">' + cells + "</span>";
  }

  /* ------------------------- the 19 functional demos -------------------- */

  var DEMOS = {};

  /* 01 — Optomize: EMR composer, delta-encoded visits, matched patterns. */
  DEMOS["plugin:optomize"] = function (item) {
    return wrap(item,
      '<div class="fcxe-lab">Workspace toolbar</div>' +
      '<div class="fcxe-op-bar"><span class="fcxe-chip">Optomize</span><span class="fcxe-dim">clinical suite living in the sidebar</span><span class="fcxe-chip fcxe-chip--dim fcxe-push">saves to your Patients base</span></div>' +
      '<div class="fcxe-op-file">' +
        '<div class="fcxe-op-pat"><span class="fcxe-op-av">M</span><b style="font-size:12px;color:var(--ink,#0a0a0f)">Meera Iyer</b><span class="fcxe-mono" style="font-size:10px;color:var(--ink-3,#767d92)">MR-0042</span><span class="fcxe-chip fcxe-chip--dim fcxe-push">one file per patient</span></div>' +
        '<div class="fcxe-op-visit"><b>Visit 14-01</b><span>va 6/6 · iop 15/15 · rx −1.25 DS · advice annual review</span></div>' +
        '<div class="fcxe-op-delta"><b>∆ Visit 12-03</b><span>∆iop:OD=16 · ∆va:OS=6/9 · base: 14-01</span><span class="fcxe-chip fcxe-push">only changes written</span></div>' +
        '<div class="fcxe-op-patline">pattern: MR-0997 · ∆H/O: −DM<span class="fcxe-chip fcxe-chip--dim fcxe-push">matched profile</span></div>' +
      "</div>" +
      '<div class="fcxe-row fcxe-row--hi"><span class="fcxe-sq">✚</span>Compose refraction case file<span class="fcxe-chip fcxe-push">run</span></div>' +
      '<div class="fcxe-row"><span class="fcxe-sq">∆</span>Mark visit changes<span class="fcxe-chip fcxe-chip--dim fcxe-push">run</span></div>'
    );
  };

  /* 02 — Focuslinks Navigation: owns the left sidebar with a clinical navigator. */
  DEMOS["plugin:focuslinks-navigation"] = function (item) {
    var rows = ["Appointments", "Examination", "Recalls", "Billing", "Patients", "Prescriptions", "Reports", "Cohorts"];
    var side = '<div class="fcxe-col"><div class="fcxe-fn-side">' +
      '<div class="fcxe-fn-head">Clinic<span class="fcxe-chip fcxe-push">added</span></div>';
    for (var i = 0; i < rows.length; i++) {
      side += '<div class="fcxe-fn-row' + (i === 0 ? " is-active" : "") + '"><span class="fcxe-fn-ic"></span>' + rows[i] + "</div>";
    }
    side += "</div></div>";
    return wrap(item,
      '<div class="fcxe-cols">' + side +
      '<div class="fcxe-col">' +
        '<div class="fcxe-lab">Breadcrumb jump</div>' +
        '<div class="fcxe-crumbs"><span class="fcxe-crumb">Patients</span><i>›</i><span class="fcxe-crumb">Arjun Rao</span><i>›</i><span class="fcxe-crumb fcxe-crumb--hi">Refraction</span><i>→</i><span class="fcxe-chip">open</span></div>' +
        '<div class="fcxe-row">One nav entry per clinical page<span class="fcxe-dim fcxe-push">each backed by its own file</span></div>' +
        '<div class="fcxe-row fcxe-row--dim"><span>Navigation only — no stat tiles, no clutter.</span></div>' +
        '<div class="fcxe-dim">Sidebar-ownership guard: when the hosted Clinic sidebar is active, Focuslinks stands down — one navigator at a time.</div>' +
      "</div></div>"
    );
  };

  /* 03 — Essential Diagrams: tap-to-select eye atlas, labeled findings into the exam note. */
  DEMOS["plugin:essential-diagrams"] = function (item) {
    return wrap(item,
      '<div class="fcxe-cols">' +
        '<div class="fcxe-col" style="align-items:center;gap:6px">' +
          '<div class="fcxe-dg-eye"><span class="fcxe-dg-limbus"></span><span class="fcxe-dg-iris"></span><span class="fcxe-dg-pupil"></span><span class="fcxe-dg-sel"></span><span class="fcxe-dg-dot"></span></div>' +
          '<span class="fcxe-chip fcxe-chip--dim">Anterior segment · OD</span>' +
        "</div>" +
        '<div class="fcxe-col">' +
          '<div class="fcxe-lab">Labeled findings</div>' +
          '<div class="fcxe-dg-find"><span class="fcxe-sq">◉</span>Cornea — fine KPs<span class="fcxe-chip fcxe-chip--dim fcxe-push">OD</span></div>' +
          '<div class="fcxe-dg-find"><span class="fcxe-sq">◉</span>Iris — sector atrophy<span class="fcxe-chip fcxe-chip--dim fcxe-push">OS</span></div>' +
          '<div class="fcxe-dg-flow"><b>Tap</b><i>→</i><b>Label</b><i>→</i><b>Exam note</b></div>' +
        "</div>" +
      "</div>" +
      '<div class="fcxe-row"><button class="fcxe-btn fcxe-btn--ghost" type="button">Add findings to note</button><span class="fcxe-dim fcxe-push">results land straight in the workup</span></div>'
    );
  };

  /* 04 — Word Count Plus: live statusbar counter for the active note. */
  DEMOS["plugin:word-count-plus"] = function (item) {
    return wrap(item,
      '<div class="fcxe-wc-doc">' +
        '<div class="t">Refraction note — Ananya Sharma</div>' +
        "<p>Subjective refraction settled at −1.25 DS OU. Cycloplegic values within 0.25 D of the dry result. Advised annual review and an AV ruling for the driving licence form.</p>" +
      "</div>" +
      '<div class="fcxe-wc-status"><span class="fcxe-wc-dot"></span><span>statusbar · updates as you type</span><span class="fcxe-push"><b>418</b> words · <b>2,396</b> chars · <b>17</b> sentences</span></div>' +
      '<div class="fcxe-dim">One quiet strip at the bottom of the workspace — words, characters and sentences for whatever note is open.</div>'
    );
  };

  /* 05 — Random Note: dice on the ribbon, one tap jumps to a random note. */
  DEMOS["plugin:random-note"] = function (item) {
    return wrap(item,
      '<div class="fcxe-lab">Ribbon dice</div>' +
      '<div class="fcxe-row" style="flex-wrap:wrap">' + die(5) + die(2) + die(6, true) +
        '<button class="fcxe-btn fcxe-btn--ghost fcxe-push" type="button">Roll again</button></div>' +
      '<div class="fcxe-row fcxe-row--hi"><span>→ Clinic/Recalls.md</span><span class="fcxe-chip fcxe-push">opened</span></div>' +
      '<div class="fcxe-row fcxe-row--dim"><span class="fcxe-lab" style="letter-spacing:.08em">earlier hops</span><span class="fcxe-mono" style="font-size:10.5px">Patients/Ananya Sharma.md</span></div>' +
      '<div class="fcxe-row fcxe-row--dim"><span class="fcxe-mono" style="font-size:10.5px;padding-left:82px">Clinic/Billing.md</span></div>' +
      '<div class="fcxe-dim">A dice icon on the ribbon and one command — each roll opens any note in your workspace, at random.</div>'
    );
  };

  /* 06 — Note Templates: one command appends a dated checklist to the active note. */
  DEMOS["plugin:note-templates"] = function (item) {
    return wrap(item,
      '<div class="fcxe-nt-doc">' +
        "<div>Clinic journal — Monday</div>" +
        '<div class="fcxe-nt-ins">' +
          "<div><b>## Checklist — 2025-05-14</b></div>" +
          '<div><span class="fcxe-nt-cb is-on"></span>Review yesterday’s notes</div>' +
          '<div><span class="fcxe-nt-cb"></span>Plan the top three tasks</div>' +
          '<div><span class="fcxe-nt-cb"></span>Capture one new idea #journal</div>' +
        "</div>" +
      "</div>" +
      '<div class="fcxe-row"><span class="fcxe-chip">command</span>Insert checklist template<span class="fcxe-dim fcxe-push">appends at the end of the active note</span></div>' +
      '<div class="fcxe-dim">The inserted block is highlighted — dated automatically, checkboxes ready to tick.</div>'
    );
  };

  /* 07 — Heading Numbering: CSS counters number H2/H3 in reading view. */
  DEMOS["plugin:heading-numbering"] = function (item) {
    return wrap(item,
      '<div class="fcxe-cols">' +
        '<div class="fcxe-hn-pane is-before">' +
          '<div class="fcxe-lab">before</div>' +
          '<div class="fcxe-hn-h2">Examination</div>' +
          '<div class="fcxe-hn-h3">Slit lamp</div>' +
          '<div class="fcxe-hn-h3">Fundus</div>' +
          '<div class="fcxe-hn-h2">Plan</div>' +
        "</div>" +
        '<span class="fcxe-hn-arrow">→</span>' +
        '<div class="fcxe-hn-pane">' +
          '<div class="fcxe-lab">reading view</div>' +
          '<div class="fcxe-hn-h2"><span class="fcxe-hn-num">1.</span>Examination</div>' +
          '<div class="fcxe-hn-h3"><span class="fcxe-hn-num fcxe-hn-num--sub">1.1</span>Slit lamp</div>' +
          '<div class="fcxe-hn-h3"><span class="fcxe-hn-num fcxe-hn-num--sub">1.2</span>Fundus</div>' +
          '<div class="fcxe-hn-h2"><span class="fcxe-hn-num">2.</span>Plan</div>' +
        "</div>" +
      "</div>" +
      '<div class="fcxe-dim">CSS counters — numbers appear with the extension on, clean up when it’s off.</div>'
    );
  };

  /* 08 — Tag Summary: every #tag with note counts, sorted, as a panel. */
  DEMOS["plugin:tag-summary"] = function (item) {
    var data = [["#recalls", 100, "14"], ["#billing", 86, "12"], ["#glaucoma", 64, "9"], ["#contact-lens", 50, "7"]];
    var out = '<div class="fcxe-lab">Tags panel</div>';
    for (var i = 0; i < data.length; i++) {
      out += '<div class="fcxe-ts-row"><span class="fcxe-ts-tag">' + data[i][0] + '</span><span class="fcxe-meter"><i style="width:' + data[i][1] + '%"></i></span><span class="fcxe-ts-count">' + data[i][2] + " notes</span></div>";
    }
    out += '<div class="fcxe-dim">One row per tag across your notes, sorted by count — opens as a panel from a command or the ribbon.</div>';
    return wrap(item, out);
  };

  /* 09 — Update v2 Notifier: pixel-art announcement banner with a one-tap updater. */
  DEMOS["plugin:update-v2-notifier"] = function (item) {
    return wrap(item,
      '<div class="fcxe-up-banner">' +
        '<span class="fcxe-up-rocket"><i></i></span>' +
        '<div style="min-width:0"><div class="fcxe-up-title">Update V2</div><div class="fcxe-up-sub">Patches · Extensions · Modes</div></div>' +
        '<span class="fcxe-up-dl fcxe-push">Download</span>' +
      "</div>" +
      '<div class="fcxe-row"><span class="fcxe-up-chip">▲ Patch ready</span><span class="fcxe-dim fcxe-push">core v2.1 waiting — one tap pulls only what is newer</span></div>' +
      '<div class="fcxe-row fcxe-row--dim"><span>Drawn entirely in code — no images, announces each update once, then stays quiet.</span></div>'
    );
  };

  /* 10 — Backlink Jump: cycles through notes linking to the active note. */
  DEMOS["plugin:backlink-jump"] = function (item) {
    return wrap(item,
      '<div class="fcxe-bl-note">Recall plan reviewed with Meera — queued on <span class="fcxe-bl-link">[[Recall board]]</span> and cross-checked against last month’s <span class="fcxe-bl-link">[[Recall board]]</span> entry before billing.</div>' +
      '<div class="fcxe-bl-panel">' +
        '<div class="fcxe-lab" style="padding:2px 2px 0">Linked from · 2 notes</div>' +
        '<div class="fcxe-bl-from"><span class="fcxe-sq" style="width:16px;height:16px;font-size:8px">↩</span>Clinic/Recalls.md<span class="fcxe-chip fcxe-push">jump</span></div>' +
        '<div class="fcxe-bl-from"><span class="fcxe-sq" style="width:16px;height:16px;font-size:8px">↩</span>Patients/Ananya Sharma.md<span class="fcxe-chip fcxe-push">jump</span></div>' +
      "</div>" +
      '<div class="fcxe-row"><span class="fcxe-chip">hop 1 of 2</span><span class="fcxe-dim fcxe-push">one command per hop — run it again to continue</span></div>'
    );
  };

  /* 11 — Core UI: restyles the workspace chrome with live toggles. */
  DEMOS["plugin:core-ui"] = function (item) {
    return wrap(item,
      '<div class="fcxe-cols">' +
        '<div class="fcxe-cui-win"><div class="fcxe-cui-cap">before</div><div class="fcxe-cui-bar"><span class="fcxe-cui-tab">Patients</span><span class="fcxe-cui-tab">Exams</span><span class="fcxe-cui-tab">Billing</span></div></div>' +
        '<div class="fcxe-cui-win"><div class="fcxe-cui-cap">after · restyled</div><div class="fcxe-cui-bar"><span class="fcxe-cui-tab is-new">Patients</span><span class="fcxe-cui-tab is-new">Exams</span><span class="fcxe-cui-tab">Billing</span></div></div>' +
      "</div>" +
      '<div class="fcxe-cui-row"><b>Sidebar rail</b><span class="fcxe-dim">quiet column of icons</span><span class="fcxe-tg is-on fcxe-push"></span></div>' +
      '<div class="fcxe-cui-row"><b>Pill tabs</b><span class="fcxe-dim">rounded tab strip</span><span class="fcxe-tg is-on fcxe-push"></span></div>' +
      '<div class="fcxe-cui-row"><b>Floating panels</b><span class="fcxe-dim">detached side panels</span><span class="fcxe-tg fcxe-push"></span></div>' +
      '<div class="fcxe-dim">Each toggle flips a class on the page and the stylesheet responds — chrome customization without touching the app.</div>'
    );
  };

  /* 12 — Daily Spark: morning greeting panel, toast and note counter. */
  DEMOS["plugin:daily-spark"] = function (item) {
    return wrap(item,
      '<div class="fcxe-ds-card">' +
        '<div class="fcxe-ds-top"><span class="fcxe-chip">Wed · 14 May</span><span class="fcxe-chip fcxe-chip--dim fcxe-push">128 notes</span></div>' +
        '<div class="fcxe-ds-title">Today’s note is ready</div>' +
        '<div class="fcxe-ds-check">Bookings<span class="fcxe-push"><b>32</b></span></div>' +
        '<div class="fcxe-ds-check">Recalls<span class="fcxe-push"><b>5</b></span></div>' +
        '<div class="fcxe-ds-check">Optics<span class="fcxe-push"><b>7</b></span></div>' +
        '<div style="display:flex;gap:7px"><button class="fcxe-btn" type="button">Open today</button><button class="fcxe-btn fcxe-btn--ghost" type="button">Spark a hello</button></div>' +
      "</div>" +
      '<div class="fcxe-ds-toast"><i></i>Hello from Daily Spark!<span class="fcxe-dim fcxe-push">toast · statusbar count</span></div>'
    );
  };

  /* 13 — FocusCaseX SBL: clinic sidebar with live stats + nested page structure. */
  DEMOS["plugin:focuscasex-sbl"] = function (item) {
    return wrap(item,
      '<div class="fcxe-lab">Clinic sidebar · live stats</div>' +
      '<div class="fcxe-sbl-stats">' +
        '<div class="fcxe-sbl-stat"><b>18</b><span>Booked</span></div>' +
        '<div class="fcxe-sbl-stat"><b>9</b><span>Done</span></div>' +
        '<div class="fcxe-sbl-stat"><b>42</b><span>Patients</span></div>' +
        '<div class="fcxe-sbl-stat"><b>₹36,400</b><span>Revenue</span></div>' +
      "</div>" +
      '<div class="fcxe-lab">Structure</div>' +
      '<div class="fcxe-sbl-tree">' +
        '<div class="fcxe-sbl-r"><span class="fcxe-sbl-glyph">▸</span>Clinic</div>' +
        '<div class="fcxe-sbl-nest">' +
          '<div class="fcxe-sbl-r"><span class="fcxe-sbl-glyph">▤</span>Appointments</div>' +
          '<div class="fcxe-sbl-nest">' +
            '<div class="fcxe-sbl-r is-hi"><span class="fcxe-sbl-glyph">▦</span>ui-appointment<span class="fcxe-chip fcxe-push">block</span></div>' +
          "</div>" +
        "</div>" +
      "</div>" +
      '<div class="fcxe-dim">Each page is a real markdown file; dashboard pages render range-aware KPIs, revenue and the appointment → checkout workflow.</div>'
    );
  };

  /* 14 — Utility Panel: clinical calculators docked in the right panel. */
  DEMOS["plugin:utility-panel"] = function (item) {
    var tabs = ["SE", "TORIC", "AGE", "IOP", "SNELLEN", "VERTEX", "K"];
    var t = '<div class="fcxe-ut-tabs">';
    for (var i = 0; i < tabs.length; i++) {
      t += '<span class="fcxe-ut-tab' + (i === 0 ? " is-on" : "") + '">' + tabs[i] + "</span>";
    }
    t += "</div>";
    return wrap(item,
      '<div class="fcxe-lab">Right-panel dock</div>' +
      '<div class="fcxe-ut-dock">' + t +
        '<div class="fcxe-ut-field"><span class="fcxe-ut-key">Sph</span><span class="fcxe-ut-in">−1.25</span></div>' +
        '<div class="fcxe-ut-field"><span class="fcxe-ut-key">Cyl</span><span class="fcxe-ut-in">−0.75</span></div>' +
        '<div class="fcxe-ut-res"><span>Spherical equivalent</span><b>SE = −1.62 D</b></div>' +
      "</div>" +
      '<div class="fcxe-dim">Eleven clinical tools — SE, toric transposition, IOP with CCT, Snellen, vertex, adds, keratometry, Prentice’s rule, Rx summary and reference cards.</div>'
    );
  };

  /* 15 — Quick Actions v2: the clinical EMR action set in the launcher. */
  DEMOS["plugin:quick-actions-v2"] = function (item) {
    return wrap(item,
      '<div class="fcxe-qa-launch">' +
        '<div class="fcxe-qa-search"><span>Quick actions…</span><span class="fcxe-kbd">Ctrl K</span></div>' +
        '<div class="fcxe-lab">Clinical</div>' +
        '<div class="fcxe-qa-act is-new"><span class="fcxe-sq">✚</span>Start examination<span class="fcxe-dim fcxe-push">vision to plan</span></div>' +
        '<div class="fcxe-lab">Schedule</div>' +
        '<div class="fcxe-qa-act is-new"><span class="fcxe-sq">↻</span>Recalls &amp; follow-ups<span class="fcxe-dim fcxe-push">the recall desk</span></div>' +
        '<div class="fcxe-lab">Billing</div>' +
        '<div class="fcxe-qa-act is-new"><span class="fcxe-sq">₹</span>Billing &amp; receipts<span class="fcxe-dim fcxe-push">card, cash or UPI</span></div>' +
      "</div>" +
      '<div class="fcxe-dim">Contributed live to the launcher — grouped, customizable, and first-class in Customize mode.</div>'
    );
  };

  /* 16 — Core Commands: every live command, filterable, one-tap run. */
  DEMOS["plugin:core-cmds"] = function (item) {
    return wrap(item,
      '<div class="fcxe-lab">Commands pane · Settings</div>' +
      '<div class="fcxe-cc-box">' +
        '<div class="fcxe-cc-input"><i>›</i>refra<span class="fcxe-cc-caret"></span><span class="fcxe-dim fcxe-push" style="font-size:9.5px">3 of 48</span></div>' +
        '<div class="fcxe-cc-row">Open refraction workup<span class="fcxe-cc-src">built-in</span><span class="fcxe-kbd fcxe-push">⇧R</span><span class="fcxe-cc-run">Run</span></div>' +
        '<div class="fcxe-cc-row">New refraction case file<span class="fcxe-cc-src fcxe-cc-src--ext">Optomize</span><span class="fcxe-kbd fcxe-push">Ctrl N</span><span class="fcxe-cc-run">Run</span></div>' +
        '<div class="fcxe-cc-row">Refraction templates<span class="fcxe-cc-src fcxe-cc-src--ext">Note Templates</span><span class="fcxe-kbd fcxe-push">Ctrl T</span><span class="fcxe-cc-run">Run</span></div>' +
      "</div>" +
      '<div class="fcxe-dim">Built-ins plus every live extension’s contributions, listed in one filterable pane — source-labeled, one tap to run.</div>'
    );
  };

  /* 17 — Core Modes: Clinical ↔ Developer, each with its own extension bundle. */
  DEMOS["plugin:core-modes"] = function (item) {
    return wrap(item,
      '<div class="fcxe-cm-seg">' +
        '<div class="fcxe-cm-opt is-on"><span class="fcxe-cm-glyph">✚</span>Clinical</div>' +
        '<div class="fcxe-cm-opt"><span class="fcxe-cm-glyph">&lt;/&gt;</span>Developer</div>' +
      "</div>" +
      '<div class="fcxe-row fcxe-row--dim"><span>Quiet chrome, clinic extensions on, snippets parked.</span></div>' +
      '<div class="fcxe-lab">Mode bundles</div>' +
      '<div class="fcxe-cm-row"><b>Optomize</b><span class="fcxe-chip fcxe-push">Clinical</span></div>' +
      '<div class="fcxe-cm-row"><b>Snippets host</b><span class="fcxe-chip fcxe-chip--dim fcxe-push">Developer</span></div>' +
      '<div class="fcxe-cm-row"><b>Daily Spark</b><span class="fcxe-chip fcxe-push">Clinical</span><span class="fcxe-chip fcxe-chip--dim">Developer</span></div>' +
      '<div class="fcxe-dim">One tap flips the mode — the target mode’s bundle enables, the other mode’s pauses.</div>'
    );
  };

  /* 18 — Core Settings: polished settings surface with live toggles. */
  DEMOS["plugin:core-settings"] = function (item) {
    return wrap(item,
      '<div class="fcxe-cs-pane">' +
        '<div class="fcxe-cs-head">Appearance &amp; behavior<span class="fcxe-chip fcxe-chip--dim fcxe-push">v2.2.3</span></div>' +
        '<div class="fcxe-cs-row"><div style="min-width:0"><div class="t">Accent seams</div><div class="s">Section heads carry the live accent</div></div><span class="fcxe-tg is-on fcxe-push"></span></div>' +
        '<div class="fcxe-cs-row"><div style="min-width:0"><div class="t">Sticky navigation</div><div class="s">Section list stays pinned while you scroll</div></div><span class="fcxe-tg is-on fcxe-push"></span></div>' +
        '<div class="fcxe-cs-row"><div style="min-width:0"><div class="t">Compact rows</div><div class="s">Tighter rows for small screens and fast hands</div></div><span class="fcxe-tg fcxe-push"></span></div>' +
      "</div>" +
      '<div class="fcxe-dim">The seasonal snowfall layer retired in v2.2.3 — surfaces stay still during consults.</div>'
    );
  };

  /* 19 — Core Pages: a Pages section where every page is a real markdown file. */
  DEMOS["plugin:core-pages"] = function (item) {
    return wrap(item,
      '<div class="fcxe-cols">' +
        '<div class="fcxe-col"><div class="fcxe-cp-side">' +
          '<div class="fcxe-lab" style="padding:2px 4px 4px">Pages</div>' +
          '<div class="fcxe-cp-row is-active">clinic-protocol.md</div>' +
          '<div class="fcxe-cp-row">referral-letter.md</div>' +
          '<div class="fcxe-cp-row">dispensing-guide.md</div>' +
          '<div class="fcxe-cp-row" style="color:var(--blue,#0533ff);font-weight:600">+ New page</div>' +
        "</div></div>" +
        '<div class="fcxe-col"><div class="fcxe-cp-file">' +
          '<div class="fcxe-cp-filehead">pages/clinic-protocol.md<span class="fcxe-chip fcxe-chip--dim">markdown</span></div>' +
          '<div class="fcxe-cp-fm"><span class="hi">title: Clinic protocol</span><span>editable like any note — any markdown tool can open it</span></div>' +
        "</div></div>" +
      "</div>" +
      '<div class="fcxe-row"><span class="fcxe-chip fcxe-chip--ok">✓ Folder access — pages</span><span class="fcxe-dim fcxe-push">granted once, revocable in Settings</span></div>'
    );
  };

  /* ------------------------------ exports ------------------------------- */

  window.FCX_EXT_DEMOS = DEMOS;
  window.FCX_EXT_DEMO_IDS = Object.keys(window.FCX_EXT_DEMOS);
})();
