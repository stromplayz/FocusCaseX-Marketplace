/* ============================================================
   FocusCaseX Marketplace — per-capsule LIVE DEMO boards (v6)
   window.FCX_CAPSULE_DEMOS[capsuleId] = html string.
   Loads BEFORE app.js; pure literals + one style-injection IIFE.
   Every board is bespoke to its capsule's real purpose (day book,
   recall board, billing desk, stepper, sparkline, ...), styled in
   the "Electric" design language with safe variable fallbacks.
   ============================================================ */

/* ---- one shared <style> tag, injected once at script load ---- */
(function () {
  if (document.getElementById("fcxd-style")) return;
  var css = [
    "/* injected by assets/demos-capsules.js — capsule demo boards */",
    ".fcxd-board{background:var(--paper,#fff);border:1px solid var(--line,#e4e7f0);border-radius:14px;padding:16px;box-shadow:0 1px 2px rgba(10,12,24,.05),0 8px 24px -14px rgba(10,12,24,.16);color:var(--ink,#0a0a0f);font-family:var(--font-body,-apple-system,'Segoe UI',sans-serif);font-size:13px;line-height:1.45;box-sizing:border-box;max-width:100%;}",
    ".fcxd-board *,.fcxd-board *::before,.fcxd-board *::after{box-sizing:border-box;}",
    ".fcxd-h{font-family:var(--font-display,'Space Grotesk',system-ui,sans-serif);font-size:14.5px;font-weight:700;letter-spacing:-.01em;margin:0;color:var(--ink,#0a0a0f);}",
    ".fcxd-meta{font-family:var(--font-mono,ui-monospace,'JetBrains Mono',Menlo,monospace);font-size:9.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--ink-3,#767d92);}",
    ".fcxd-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:11px;flex-wrap:wrap;}",
    ".fcxd-stats{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px;}",
    ".fcxd-stat{flex:1;min-width:82px;background:var(--bg-soft,#f5f6fb);border:1px solid var(--line,#e4e7f0);border-radius:10px;padding:8px 11px;}",
    ".fcxd-stat b{font-family:var(--font-display,'Space Grotesk',system-ui,sans-serif);font-size:16px;font-weight:700;letter-spacing:-.02em;display:block;color:var(--ink,#0a0a0f);}",
    ".fcxd-stat span{font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-3,#767d92);}",
    ".fcxd-stat.is-money b{color:var(--ok,#0b8a3e);}",
    ".fcxd-stat.is-warn b{color:var(--warn,#b3540c);}",
    ".fcxd-row{display:flex;align-items:center;gap:10px;padding:8px 2px;border-top:1px solid var(--line,#e4e7f0);font-size:12.5px;transition:background .15s ease;}",
    ".fcxd-row:hover{background:var(--bg-soft,#f5f6fb);}",
    ".fcxd-time{font-family:var(--font-mono,ui-monospace,'JetBrains Mono',Menlo,monospace);font-size:11px;color:var(--ink-3,#767d92);width:44px;flex:none;}",
    ".fcxd-name{font-weight:500;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink,#0a0a0f);}",
    ".fcxd-tag{font-size:10px;font-weight:600;letter-spacing:.03em;border-radius:999px;padding:2.5px 9px;white-space:nowrap;flex:none;}",
    ".fcxd-t-ok{background:var(--ok-soft,#e4f4ea);color:var(--ok,#0b8a3e);}",
    ".fcxd-t-warn{background:var(--k-theme-soft,#fdeee4);color:var(--warn,#b3540c);}",
    ".fcxd-t-info{background:var(--blue-soft,#e9edff);color:var(--blue,#0533ff);}",
    ".fcxd-t-caps{background:var(--k-capsule-soft,#e4f4ea);color:var(--k-capsule,#0b8a3e);}",
    ".fcxd-t-dim{background:var(--bg-soft-2,#eef0f8);color:var(--ink-2,#4a5064);}",
    ".fcxd-chip{font-family:var(--font-mono,ui-monospace,'JetBrains Mono',Menlo,monospace);font-size:9.5px;letter-spacing:.02em;border:1px solid var(--line-2,#d4d9e8);color:var(--ink-2,#4a5064);border-radius:999px;padding:2.5px 8px;white-space:nowrap;flex:none;background:var(--paper,#fff);}",
    ".fcxd-chip.on{background:var(--ink,#0a0a0f);border-color:var(--ink,#0a0a0f);color:#fff;}",
    ".fcxd-chip.blue{border-color:var(--blue-line,#bcc7ff);background:var(--blue-soft,#e9edff);color:var(--blue,#0533ff);}",
    ".fcxd-amt{font-family:var(--font-mono,ui-monospace,'JetBrains Mono',Menlo,monospace);font-size:11.5px;font-weight:600;color:var(--ink-2,#4a5064);flex:none;}",
    ".fcxd-cap{margin-top:11px;font-size:10.5px;color:var(--ink-3,#767d92);display:flex;align-items:center;gap:6px;}",
    ".fcxd-cap::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--k-capsule,#0b8a3e);flex:none;}",
    ".fcxd-sub{font-size:11.5px;color:var(--ink-2,#4a5064);margin:2px 0 0;}",
    /* — recall board: two columns — */
    ".fcxd-cols{display:grid;grid-template-columns:1fr 1fr;gap:10px;}",
    ".fcxd-colcard{background:var(--bg-soft,#f5f6fb);border:1px solid var(--line,#e4e7f0);border-radius:10px;padding:10px 11px;}",
    ".fcxd-colcard.is-hot{background:var(--k-theme-soft,#fdeee4);border-color:#f0dcc9;}",
    ".fcxd-colcard.is-calm{background:var(--ok-soft,#e4f4ea);border-color:#d3e9dc;}",
    ".fcxd-colhead{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px;}",
    ".fcxd-colhead b{font-size:11.5px;font-weight:700;letter-spacing:.01em;}",
    ".fcxd-colhead span{font-family:var(--font-mono,ui-monospace,'JetBrains Mono',Menlo,monospace);font-size:10px;color:var(--ink-3,#767d92);}",
    /* — billing desk: queue tabs + money strip — */
    ".fcxd-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;}",
    ".fcxd-tab{font-size:11px;font-weight:600;border:1px solid var(--line-2,#d4d9e8);border-radius:999px;padding:4px 11px;color:var(--ink-2,#4a5064);background:var(--paper,#fff);transition:all .15s ease;}",
    ".fcxd-tab.on{background:var(--ink,#0a0a0f);border-color:var(--ink,#0a0a0f);color:#fff;}",
    /* — stat tiles: 2x2 KPI grid — */
    ".fcxd-kpis{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px;}",
    ".fcxd-kpi{border:1px solid var(--line,#e4e7f0);border-radius:11px;padding:10px 12px;background:var(--paper,#fff);}",
    ".fcxd-kpi b{font-family:var(--font-display,'Space Grotesk',system-ui,sans-serif);font-size:21px;font-weight:700;letter-spacing:-.03em;display:block;color:var(--ink,#0a0a0f);}",
    ".fcxd-kpi span{font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-3,#767d92);}",
    ".fcxd-kpi.is-hi{background:var(--blue-soft,#e9edff);border-color:var(--blue-line,#bcc7ff);}",
    ".fcxd-kpi.is-hi b{color:var(--blue,#0533ff);}",
    ".fcxd-krow{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 2px;border-top:1px solid var(--line,#e4e7f0);font-size:12.5px;}",
    /* — clinic overview: load bars — */
    ".fcxd-load{display:flex;align-items:center;gap:10px;padding:7px 2px;border-top:1px solid var(--line,#e4e7f0);font-size:12px;}",
    ".fcxd-loadlabel{width:86px;flex:none;color:var(--ink-2,#4a5064);}",
    ".fcxd-bar{height:6px;border-radius:999px;background:var(--bg-soft-2,#eef0f8);flex:1;overflow:hidden;}",
    ".fcxd-fill{height:100%;border-radius:999px;background:var(--blue,#0533ff);}",
    ".fcxd-fill.green{background:var(--k-capsule,#0b8a3e);}",
    ".fcxd-pct{font-family:var(--font-mono,ui-monospace,'JetBrains Mono',Menlo,monospace);font-size:10.5px;color:var(--ink-3,#767d92);width:34px;text-align:right;flex:none;}",
    /* — today worklist: sections + ticks — */
    ".fcxd-sec{font-family:var(--font-mono,ui-monospace,'JetBrains Mono',Menlo,monospace);font-size:9.5px;text-transform:uppercase;letter-spacing:.11em;color:var(--ink-3,#767d92);margin:11px 0 1px;}",
    ".fcxd-tick{width:16px;height:16px;border-radius:50%;border:1.5px solid var(--line-2,#d4d9e8);flex:none;display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:transparent;}",
    ".fcxd-tick.done{background:var(--ok-soft,#e4f4ea);border-color:var(--ok,#0b8a3e);color:var(--ok,#0b8a3e);}",
    ".fcxd-row.is-done .fcxd-name{color:var(--ink-3,#767d92);text-decoration:line-through;text-decoration-color:var(--line-2,#d4d9e8);}",
    /* — flow tracker: stepper + stage cells — */
    ".fcxd-track{height:7px;border-radius:999px;background:var(--bg-soft-2,#eef0f8);overflow:hidden;margin:7px 0 12px;}",
    ".fcxd-trackfill{height:100%;border-radius:999px;background:var(--k-capsule,#0b8a3e);}",
    ".fcxd-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;}",
    ".fcxd-step{border:1px solid var(--line,#e4e7f0);border-radius:10px;padding:8px 9px;background:var(--paper,#fff);transition:all .15s ease;}",
    ".fcxd-step.on{background:var(--blue-soft,#e9edff);border-color:var(--blue-line,#bcc7ff);}",
    ".fcxd-stepname{font-family:var(--font-mono,ui-monospace,'JetBrains Mono',Menlo,monospace);font-size:9px;text-transform:uppercase;letter-spacing:.09em;color:var(--ink-3,#767d92);display:flex;align-items:center;gap:5px;}",
    ".fcxd-dot{width:7px;height:7px;border-radius:50%;background:var(--line-2,#d4d9e8);flex:none;}",
    ".fcxd-step.on .fcxd-dot{background:var(--blue,#0533ff);box-shadow:0 0 0 3px rgba(5,51,255,.15);}",
    ".fcxd-steppat{font-size:11.5px;font-weight:600;margin-top:5px;color:var(--ink,#0a0a0f);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
    ".fcxd-steptime{font-family:var(--font-mono,ui-monospace,'JetBrains Mono',Menlo,monospace);font-size:9.5px;color:var(--ink-3,#767d92);margin-top:2px;}",
    /* — action buttons — */
    ".fcxd-actions{display:flex;gap:8px;flex-wrap:wrap;}",
    ".fcxd-btn{font-family:var(--font-body,-apple-system,'Segoe UI',sans-serif);font-size:12.5px;font-weight:600;border-radius:9px;padding:8px 14px;border:1px solid transparent;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease;}",
    ".fcxd-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px -4px rgba(10,12,24,.25);}",
    ".fcxd-btn-p{background:var(--ink,#0a0a0f);color:#fff;}",
    ".fcxd-btn-b{background:var(--blue,#0533ff);color:#fff;}",
    ".fcxd-btn-o{background:var(--paper,#fff);border-color:var(--line-2,#d4d9e8);color:var(--ink,#0a0a0f);}",
    ".fcxd-btn-g{background:var(--k-capsule-soft,#e4f4ea);color:var(--k-capsule,#0b8a3e);}",
    /* — note cards — */
    ".fcxd-note{background:var(--bg-soft,#f5f6fb);border:1px solid var(--line,#e4e7f0);border-left:3px solid var(--k-capsule,#0b8a3e);border-radius:10px;padding:10px 12px;margin-bottom:8px;transition:border-color .15s ease;}",
    ".fcxd-note:hover{border-left-color:var(--blue,#0533ff);}",
    ".fcxd-note p{margin:4px 0 0;font-size:12px;color:var(--ink-2,#4a5064);}",
    ".fcxd-notetop{display:flex;align-items:center;justify-content:space-between;gap:8px;}",
    /* — side panel mock — */
    ".fcxd-panel{border:1px solid var(--line,#e4e7f0);border-radius:12px;padding:12px;background:var(--bg-soft,#f5f6fb);max-width:300px;}",
    ".fcxd-field{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--line,#e4e7f0);font-size:12.5px;}",
    ".fcxd-field:first-of-type{border-top:0;}",
    ".fcxd-fieldlabel{font-family:var(--font-mono,ui-monospace,'JetBrains Mono',Menlo,monospace);font-size:9px;text-transform:uppercase;letter-spacing:.09em;color:var(--ink-3,#767d92);flex:none;}",
    ".fcxd-fieldval{font-weight:500;color:var(--ink,#0a0a0f);text-align:right;}",
    ".fcxd-save{width:100%;margin-top:10px;background:var(--ink,#0a0a0f);color:#fff;border:0;border-radius:9px;padding:9px 0;font-size:12.5px;font-weight:600;font-family:var(--font-body,-apple-system,'Segoe UI',sans-serif);cursor:pointer;transition:opacity .15s ease;}",
    ".fcxd-save:hover{opacity:.88;}",
    /* — patient directory — */
    ".fcxd-search{display:flex;align-items:center;gap:8px;border:1px solid var(--line-2,#d4d9e8);border-radius:9px;padding:7px 10px;color:var(--ink-3,#767d92);font-size:12px;margin-bottom:4px;background:var(--paper,#fff);}",
    ".fcxd-magnifier{width:11px;height:11px;border:1.5px solid var(--ink-3,#767d92);border-radius:50%;position:relative;flex:none;}",
    ".fcxd-magnifier::after{content:'';position:absolute;width:1.5px;height:5px;background:var(--ink-3,#767d92);transform:rotate(-45deg);bottom:-4px;right:-1px;}",
    ".fcxd-avatar{width:26px;height:26px;border-radius:50%;background:var(--blue-soft,#e9edff);color:var(--blue,#0533ff);display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;letter-spacing:.02em;flex:none;}",
    ".fcxd-avatar.g{background:var(--k-capsule-soft,#e4f4ea);color:var(--k-capsule,#0b8a3e);}",
    /* — patient header card — */
    ".fcxd-id{display:flex;align-items:center;gap:12px;margin-bottom:10px;}",
    ".fcxd-idavatar{width:44px;height:44px;border-radius:12px;background:var(--ink,#0a0a0f);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-family:var(--font-display,'Space Grotesk',system-ui,sans-serif);font-size:15px;font-weight:700;flex:none;}",
    ".fcxd-idname{font-family:var(--font-display,'Space Grotesk',system-ui,sans-serif);font-size:18px;font-weight:700;letter-spacing:-.02em;color:var(--ink,#0a0a0f);line-height:1.2;}",
    ".fcxd-chiprow{display:flex;gap:6px;flex-wrap:wrap;}",
    ".fcxd-miniacts{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px;}",
    ".fcxd-miniact{font-size:11.5px;font-weight:600;border:1px solid var(--line-2,#d4d9e8);border-radius:8px;padding:6px 11px;color:var(--ink,#0a0a0f);background:var(--paper,#fff);transition:all .15s ease;}",
    ".fcxd-miniact:hover{border-color:var(--ink,#0a0a0f);}",
    ".fcxd-miniact.pri{background:var(--blue,#0533ff);border-color:var(--blue,#0533ff);color:#fff;}",
    /* — vitals grid — */
    ".fcxd-vgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}",
    ".fcxd-vit{border:1px solid var(--line,#e4e7f0);border-radius:10px;padding:9px 11px;background:var(--paper,#fff);}",
    ".fcxd-vit.is-live{background:var(--k-capsule-soft,#e4f4ea);border-color:#cfe6da;}",
    ".fcxd-vkey{font-family:var(--font-mono,ui-monospace,'JetBrains Mono',Menlo,monospace);font-size:9px;text-transform:uppercase;letter-spacing:.09em;color:var(--ink-3,#767d92);display:block;}",
    ".fcxd-vval{font-family:var(--font-mono,ui-monospace,'JetBrains Mono',Menlo,monospace);font-size:16px;font-weight:600;color:var(--ink,#0a0a0f);margin-top:3px;}",
    ".fcxd-unit{font-size:10px;font-weight:400;color:var(--ink-3,#767d92);margin-left:3px;}",
    /* — visit timeline — */
    ".fcxd-tl{position:relative;padding-left:18px;}",
    ".fcxd-tl::before{content:'';position:absolute;left:5px;top:8px;bottom:12px;width:1.5px;background:var(--line,#e4e7f0);}",
    ".fcxd-tlrow{position:relative;padding:7px 0;}",
    ".fcxd-tlrow::before{content:'';position:absolute;left:-17px;top:13px;width:8px;height:8px;border-radius:50%;background:var(--paper,#fff);border:2px solid var(--blue,#0533ff);}",
    ".fcxd-tlrow.first::before{background:var(--blue,#0533ff);}",
    /* — single visit record — */
    ".fcxd-kv{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid var(--line,#e4e7f0);font-size:12.5px;}",
    ".fcxd-kv .fcxd-k{color:var(--ink-3,#767d92);flex:none;font-size:11.5px;}",
    ".fcxd-kv .fcxd-v{color:var(--ink,#0a0a0f);font-weight:500;text-align:right;}",
    ".fcxd-delta{font-family:var(--font-mono,ui-monospace,'JetBrains Mono',Menlo,monospace);font-size:9.5px;color:var(--ok,#0b8a3e);margin-left:6px;}",
    /* — trend sparkline — */
    ".fcxd-spark{display:flex;align-items:flex-end;gap:7px;height:52px;margin:12px 2px 4px;}",
    ".fcxd-sbar{flex:1;border-radius:4px 4px 0 0;background:var(--blue-soft,#e9edff);border:1px solid var(--blue-line,#bcc7ff);border-bottom:0;min-height:6px;transition:opacity .15s ease;}",
    ".fcxd-sbar:hover{opacity:.8;}",
    ".fcxd-sbar.now{background:var(--blue,#0533ff);border-color:var(--blue,#0533ff);}",
    ".fcxd-svals{display:flex;gap:7px;margin:0 2px;}",
    ".fcxd-svals span{flex:1;text-align:center;font-family:var(--font-mono,ui-monospace,'JetBrains Mono',Menlo,monospace);font-size:9px;color:var(--ink-3,#767d92);}",
    /* — exam checklist — */
    ".fcxd-exrow{display:flex;align-items:center;gap:10px;padding:9px 2px;border-top:1px solid var(--line,#e4e7f0);font-size:12.5px;}",
    ".fcxd-exstep{flex:1;min-width:0;}",
    ".fcxd-exname{font-weight:500;color:var(--ink,#0a0a0f);}",
    ".fcxd-exnote{font-size:10.5px;color:var(--ink-3,#767d92);margin-top:1px;}",
    /* — cohort cards — */
    ".fcxd-cohorts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}",
    ".fcxd-cohort{border:1px solid var(--line,#e4e7f0);border-radius:10px;padding:10px;background:var(--bg-soft,#f5f6fb);}",
    ".fcxd-cohcount{font-family:var(--font-display,'Space Grotesk',system-ui,sans-serif);font-size:20px;font-weight:700;letter-spacing:-.03em;color:var(--k-capsule,#0b8a3e);display:block;}",
    ".fcxd-cohname{font-size:11.5px;font-weight:600;color:var(--ink,#0a0a0f);}",
    ".fcxd-cohrule{font-family:var(--font-mono,ui-monospace,'JetBrains Mono',Menlo,monospace);font-size:8.5px;color:var(--ink-3,#767d92);margin-top:2px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
    ".fcxd-cohm{display:flex;align-items:center;gap:6px;font-size:10.5px;color:var(--ink-2,#4a5064);margin-top:5px;padding-top:5px;border-top:1px dashed var(--line-2,#d4d9e8);}",
    /* — bases table embed — */
    ".fcxd-table{width:100%;border-collapse:collapse;font-size:12px;}",
    ".fcxd-table th{font-family:var(--font-mono,ui-monospace,'JetBrains Mono',Menlo,monospace);font-size:9px;text-transform:uppercase;letter-spacing:.09em;color:var(--ink-3,#767d92);text-align:left;padding:6px 8px;border-bottom:1px solid var(--line-2,#d4d9e8);font-weight:600;}",
    ".fcxd-table td{padding:7px 8px;border-bottom:1px solid var(--line,#e4e7f0);color:var(--ink,#0a0a0f);}",
    ".fcxd-table tr:last-child td{border-bottom:0;}",
    ".fcxd-table td.num{font-family:var(--font-mono,ui-monospace,'JetBrains Mono',Menlo,monospace);font-size:11px;color:var(--ink-2,#4a5064);}"
  ].join("\n");
  var style = document.createElement("style");
  style.id = "fcxd-style";
  style.textContent = css;
  document.head.appendChild(style);
})();

/* ---------------- the 19 live demo boards ---------------- */
window.FCX_CAPSULE_DEMOS = {

  "ui-appointment": [
    '<div class="fcxd-board">',
    '  <div class="fcxd-head"><div><h4 class="fcxd-h">Day book — Wed, 04 Mar</h4><p class="fcxd-sub">Front desk · Dr. Rao consulting</p></div><span class="fcxd-chip">10:22</span></div>',
    '  <div class="fcxd-stats">',
    '    <span class="fcxd-stat"><b>32</b><span>Today</span></span>',
    '    <span class="fcxd-stat"><b>21</b><span>Done</span></span>',
    '    <span class="fcxd-stat is-money"><b>&#8377;18,400</b><span>Collected</span></span>',
    '    <span class="fcxd-stat is-warn"><b>3</b><span>Unpaid</span></span>',
    '  </div>',
    '  <div class="fcxd-row"><span class="fcxd-time">9:00</span><span class="fcxd-name">Arun Kumar</span><span class="fcxd-tag fcxd-t-ok">Done</span></div>',
    '  <div class="fcxd-row"><span class="fcxd-time">9:30</span><span class="fcxd-name">Meera Joseph</span><span class="fcxd-tag fcxd-t-info">In exam</span></div>',
    '  <div class="fcxd-row"><span class="fcxd-time">10:00</span><span class="fcxd-name">Rahim Shaikh</span><span class="fcxd-tag fcxd-t-warn">Optics</span></div>',
    '  <div class="fcxd-row"><span class="fcxd-time">10:20</span><span class="fcxd-name">Divya Nair</span><span class="fcxd-chip">Walk-in</span></div>',
    '  <div class="fcxd-cap">Sample data — your version reads your real records, offline.</div>',
    '</div>'
  ].join("\n"),

  "ui-recalls": [
    '<div class="fcxd-board">',
    '  <div class="fcxd-head"><div><h4 class="fcxd-h">Recall board</h4><p class="fcxd-sub">Follow-ups computed from visit advice</p></div><span class="fcxd-chip">Mar week 1</span></div>',
    '  <div class="fcxd-cols">',
    '    <div class="fcxd-colcard is-hot">',
    '      <div class="fcxd-colhead"><b>Overdue</b><span>3</span></div>',
    '      <div class="fcxd-row"><span class="fcxd-name">Sneha Patil</span><span class="fcxd-time">12 Feb</span></div>',
    '      <div class="fcxd-row"><span class="fcxd-name">Divya Nair</span><span class="fcxd-time">28 Feb</span></div>',
    '      <div class="fcxd-row"><span class="fcxd-name">Arun Kumar</span><span class="fcxd-time">02 Mar</span></div>',
    '    </div>',
    '    <div class="fcxd-colcard is-calm">',
    '      <div class="fcxd-colhead"><b>Booked today</b><span>5</span></div>',
    '      <div class="fcxd-row"><span class="fcxd-name">Meera Joseph</span><span class="fcxd-time">11:30</span></div>',
    '      <div class="fcxd-row"><span class="fcxd-name">Rahim Shaikh</span><span class="fcxd-time">4:45</span></div>',
    '    </div>',
    '  </div>',
    '  <div class="fcxd-chiprow" style="margin-top:10px;">',
    '    <span class="fcxd-chip blue">6-month recall</span><span class="fcxd-chip">12-month recall</span><span class="fcxd-chip">Field test</span>',
    '  </div>',
    '  <div class="fcxd-cap">Sample data — your version reads your real records, offline.</div>',
    '</div>'
  ].join("\n"),

  "ui-billing": [
    '<div class="fcxd-board">',
    '  <div class="fcxd-head"><div><h4 class="fcxd-h">Billing desk</h4><p class="fcxd-sub">Front desk · to-bill and dispensing queue</p></div><span class="fcxd-chip blue">4 to bill</span></div>',
    '  <div class="fcxd-tabs"><span class="fcxd-tab on">To bill · 4</span><span class="fcxd-tab">Dispensing · 2</span><span class="fcxd-tab">Unbilled · 1</span></div>',
    '  <div class="fcxd-stats">',
    '    <span class="fcxd-stat is-money"><b>&#8377;9,850</b><span>Collected today</span></span>',
    '    <span class="fcxd-stat"><b>5</b><span>Receipts</span></span>',
    '    <span class="fcxd-stat"><b>2</b><span>Optics orders</span></span>',
    '  </div>',
    '  <div class="fcxd-row"><span class="fcxd-time">MR-1042</span><span class="fcxd-name">Arun Kumar</span><span class="fcxd-tag fcxd-t-ok">Paid · UPI</span><span class="fcxd-amt">&#8377;350</span></div>',
    '  <div class="fcxd-row"><span class="fcxd-time">MR-1039</span><span class="fcxd-name">Meera Joseph</span><span class="fcxd-tag fcxd-t-warn">Cash due</span><span class="fcxd-amt">&#8377;1,250</span></div>',
    '  <div class="fcxd-row"><span class="fcxd-time">MR-1047</span><span class="fcxd-name">Rahim Shaikh</span><span class="fcxd-tag fcxd-t-info">Paid · Card</span><span class="fcxd-amt">&#8377;2,780</span></div>',
    '  <div class="fcxd-row"><span class="fcxd-time">MR-1031</span><span class="fcxd-name">Divya Nair</span><span class="fcxd-tag fcxd-t-dim">Unbilled</span><span class="fcxd-amt">—</span></div>',
    '  <div class="fcxd-cap">Sample data — your version reads your real records, offline.</div>',
    '</div>'
  ].join("\n"),

  "ui-stats": [
    '<div class="fcxd-board">',
    '  <div class="fcxd-head"><div><h4 class="fcxd-h">Stat tiles</h4><p class="fcxd-sub">Headline numbers from the EMR index</p></div><span class="fcxd-chip">Live</span></div>',
    '  <div class="fcxd-kpis">',
    '    <div class="fcxd-kpi is-hi"><b>214</b><span>Patients</span></div>',
    '    <div class="fcxd-kpi"><b>32</b><span>Visits today</span></div>',
    '    <div class="fcxd-kpi"><b>&#8377;48,200</b><span>Month billing</span></div>',
    '    <div class="fcxd-kpi"><b>91%</b><span>Recalls booked</span></div>',
    '  </div>',
    '  <div class="fcxd-krow"><span>New patients this month</span><span class="fcxd-tag fcxd-t-ok">+38</span></div>',
    '  <div class="fcxd-krow"><span>Optics conversion</span><span class="fcxd-tag fcxd-t-info">62%</span></div>',
    '  <div class="fcxd-cap">Sample data — your version reads your real records, offline.</div>',
    '</div>'
  ].join("\n"),

  "ui-clinic": [
    '<div class="fcxd-board">',
    '  <div class="fcxd-head"><div><h4 class="fcxd-h">Clinic overview</h4><p class="fcxd-sub">Business KPIs + clinical load</p></div><span class="fcxd-chip">This month</span></div>',
    '  <div class="fcxd-tabs"><span class="fcxd-tab">Today</span><span class="fcxd-tab on">Month</span><span class="fcxd-tab">Quarter</span></div>',
    '  <div class="fcxd-stats">',
    '    <span class="fcxd-stat"><b>412</b><span>Visits</span></span>',
    '    <span class="fcxd-stat is-money"><b>&#8377;48,200</b><span>Billing</span></span>',
    '    <span class="fcxd-stat"><b>38</b><span>New patients</span></span>',
    '  </div>',
    '  <div class="fcxd-load"><span class="fcxd-loadlabel">Exams</span><span class="fcxd-bar"><span class="fcxd-fill" style="width:58%"></span></span><span class="fcxd-pct">58%</span></div>',
    '  <div class="fcxd-load"><span class="fcxd-loadlabel">Optics</span><span class="fcxd-bar"><span class="fcxd-fill green" style="width:62%"></span></span><span class="fcxd-pct">62%</span></div>',
    '  <div class="fcxd-load"><span class="fcxd-loadlabel">Follow-ups</span><span class="fcxd-bar"><span class="fcxd-fill" style="width:24%"></span></span><span class="fcxd-pct">24%</span></div>',
    '  <div class="fcxd-cap">Sample data — your version reads your real records, offline.</div>',
    '</div>'
  ].join("\n"),

  "ui-today": [
    '<div class="fcxd-board">',
    '  <div class="fcxd-head"><div><h4 class="fcxd-h">Today — Wed, 04 Mar</h4><p class="fcxd-sub">Triage chips and patient rows</p></div><span class="fcxd-chip blue">5 patients</span></div>',
    '  <div class="fcxd-sec">Morning</div>',
    '  <div class="fcxd-row is-done"><span class="fcxd-tick done">&#10003;</span><span class="fcxd-name">Arun Kumar — Refraction</span><span class="fcxd-time">9:00</span></div>',
    '  <div class="fcxd-row is-done"><span class="fcxd-tick done">&#10003;</span><span class="fcxd-name">Meera Joseph — Counselling</span><span class="fcxd-time">9:30</span></div>',
    '  <div class="fcxd-row"><span class="fcxd-tick"></span><span class="fcxd-name">Sneha Patil — IOP recheck</span><span class="fcxd-time">11:15</span></div>',
    '  <div class="fcxd-sec">Afternoon</div>',
    '  <div class="fcxd-row"><span class="fcxd-tick"></span><span class="fcxd-name">Rahim Shaikh — Optics pickup</span><span class="fcxd-time">2:30</span></div>',
    '  <div class="fcxd-row"><span class="fcxd-tick"></span><span class="fcxd-name">Divya Nair — Field test</span><span class="fcxd-time">3:30</span></div>',
    '  <div class="fcxd-cap">Sample data — your version reads your real records, offline.</div>',
    '</div>'
  ].join("\n"),

  "ui-flow": [
    '<div class="fcxd-board">',
    '  <div class="fcxd-head"><div><h4 class="fcxd-h">Workflow tracker</h4><p class="fcxd-sub">Appointment to checkout, one tap per stage</p></div><span class="fcxd-chip">18 / 32 out</span></div>',
    '  <div class="fcxd-track"><div class="fcxd-trackfill" style="width:56%"></div></div>',
    '  <div class="fcxd-steps">',
    '    <div class="fcxd-step"><div class="fcxd-stepname"><span class="fcxd-dot"></span>Registered</div><div class="fcxd-steppat">Sneha Patil</div><div class="fcxd-steptime">9:15</div></div>',
    '    <div class="fcxd-step on"><div class="fcxd-stepname"><span class="fcxd-dot"></span>Exam</div><div class="fcxd-steppat">Divya Nair</div><div class="fcxd-steptime">10:05</div></div>',
    '    <div class="fcxd-step"><div class="fcxd-stepname"><span class="fcxd-dot"></span>Optics</div><div class="fcxd-steppat">Rahim Shaikh</div><div class="fcxd-steptime">10:20</div></div>',
    '    <div class="fcxd-step"><div class="fcxd-stepname"><span class="fcxd-dot"></span>Billing</div><div class="fcxd-steppat">Arun Kumar</div><div class="fcxd-steptime">9:40</div></div>',
    '  </div>',
    '  <div class="fcxd-cap">Sample data — your version reads your real records, offline.</div>',
    '</div>'
  ].join("\n"),

  "ui-actions": [
    '<div class="fcxd-board">',
    '  <div class="fcxd-head"><div><h4 class="fcxd-h">Action buttons</h4><p class="fcxd-sub">One-tap commands, your labels</p></div></div>',
    '  <div class="fcxd-actions">',
    '    <button class="fcxd-btn fcxd-btn-p">+ New patient</button>',
    '    <button class="fcxd-btn fcxd-btn-b">Walk-in</button>',
    '    <button class="fcxd-btn fcxd-btn-o">Collect &#8377;</button>',
    '    <button class="fcxd-btn fcxd-btn-o">Print slip</button>',
    '  </div>',
    '  <div class="fcxd-chiprow" style="margin-top:10px;">',
    '    <span class="fcxd-chip">Open appointments</span><span class="fcxd-chip">Recall board</span><span class="fcxd-chip fcxd-chip-g" style="background:var(--k-capsule-soft,#e4f4ea);border-color:transparent;color:var(--k-capsule,#0b8a3e);">Today</span>',
    '  </div>',
    '  <p class="fcxd-sub" style="margin-top:10px;">Runs right in your page — one short line, wired to your clinic commands.</p>',
    '  <div class="fcxd-cap">Sample data — your version reads your real records, offline.</div>',
    '</div>'
  ].join("\n"),

  "ui-note-cards": [
    '<div class="fcxd-board">',
    '  <div class="fcxd-head"><div><h4 class="fcxd-h">Note cards</h4><p class="fcxd-sub">Linked notes, tappable</p></div><span class="fcxd-chip">3 linked</span></div>',
    '  <div class="fcxd-note">',
    '    <div class="fcxd-notetop"><b style="font-size:12.5px;">Glaucoma suspect — counselling</b><span class="fcxd-time">26 Feb</span></div>',
    '    <p>Explained pressure targets and drop timing. Family history noted — sister, age 40.</p>',
    '    <div class="fcxd-chiprow" style="margin-top:6px;"><span class="fcxd-chip">IOP 21</span><span class="fcxd-chip">OD</span></div>',
    '  </div>',
    '  <div class="fcxd-note" style="border-left-color:var(--blue,#0533ff);">',
    '    <div class="fcxd-notetop"><b style="font-size:12.5px;">Dry eye — start protocol</b><span class="fcxd-time">12 Feb</span></div>',
    '    <p>Lubricants QID, warm compress nightly. Review in 6 weeks with tear film check.</p>',
    '  </div>',
    '  <div class="fcxd-cap">Sample data — your version reads your real records, offline.</div>',
    '</div>'
  ].join("\n"),

  "ui-panel": [
    '<div class="fcxd-board">',
    '  <div class="fcxd-head"><div><h4 class="fcxd-h">Right panel</h4><p class="fcxd-sub">Docked beside the board it serves</p></div><span class="fcxd-chip">Booking</span></div>',
    '  <div class="fcxd-panel">',
    '    <b style="font-size:13px;display:block;margin-bottom:6px;">Booking panel</b>',
    '    <div class="fcxd-field"><span class="fcxd-fieldlabel">Patient</span><span class="fcxd-fieldval">Arun Kumar · MR-1042</span></div>',
    '    <div class="fcxd-field"><span class="fcxd-fieldlabel">Date</span><span class="fcxd-fieldval">Wed, 04 Mar</span></div>',
    '    <div class="fcxd-field"><span class="fcxd-fieldlabel">Time</span><span class="fcxd-chiprow"><span class="fcxd-chip on">10:00</span><span class="fcxd-chip">10:30</span><span class="fcxd-chip">11:00</span></span></div>',
    '    <div class="fcxd-field"><span class="fcxd-fieldlabel">Doctor</span><span class="fcxd-fieldval">Dr. Rao</span></div>',
    '    <button class="fcxd-save">Book appointment</button>',
    '  </div>',
    '  <div class="fcxd-cap">Sample data — your version reads your real records, offline.</div>',
    '</div>'
  ].join("\n"),

  "ui-patients": [
    '<div class="fcxd-board">',
    '  <div class="fcxd-head"><div><h4 class="fcxd-h">Patient directory</h4><p class="fcxd-sub">Tap-first register of every file</p></div><span class="fcxd-chip">214 files</span></div>',
    '  <div class="fcxd-stats" style="margin-bottom:8px;">',
    '    <span class="fcxd-stat"><b>6</b><span>Seen today</span></span>',
    '    <span class="fcxd-stat is-warn"><b>3</b><span>Recalls overdue</span></span>',
    '    <span class="fcxd-stat"><b>38</b><span>New this month</span></span>',
    '  </div>',
    '  <div class="fcxd-search"><span class="fcxd-magnifier"></span>Search name or MR…</div>',
    '  <div class="fcxd-row"><span class="fcxd-avatar">AK</span><span class="fcxd-name">Arun Kumar</span><span class="fcxd-time">MR-1042</span><span class="fcxd-tag fcxd-t-warn">Recall due</span></div>',
    '  <div class="fcxd-row"><span class="fcxd-avatar">MJ</span><span class="fcxd-name">Meera Joseph</span><span class="fcxd-time">MR-1039</span><span class="fcxd-tag fcxd-t-info">Optics pending</span></div>',
    '  <div class="fcxd-row"><span class="fcxd-avatar g">RS</span><span class="fcxd-name">Rahim Shaikh</span><span class="fcxd-time">MR-1047</span><span class="fcxd-tag fcxd-t-caps">New today</span></div>',
    '  <div class="fcxd-row"><span class="fcxd-avatar">DN</span><span class="fcxd-name">Divya Nair</span><span class="fcxd-time">MR-1031</span><span class="fcxd-tag fcxd-t-dim">Stable</span></div>',
    '  <div class="fcxd-cap">Sample data — your version reads your real records, offline.</div>',
    '</div>'
  ].join("\n"),

  "emr-patient": [
    '<div class="fcxd-board">',
    '  <div class="fcxd-id">',
    '    <span class="fcxd-idavatar">AK</span>',
    '    <div style="flex:1;min-width:0;">',
    '      <div class="fcxd-idname">Arun Kumar</div>',
    '      <div class="fcxd-meta">Patient file · last visit 26 Feb</div>',
    '    </div>',
    '    <span class="fcxd-chip blue">MR-1042</span>',
    '  </div>',
    '  <div class="fcxd-chiprow">',
    '    <span class="fcxd-chip">34 · Male</span>',
    '    <span class="fcxd-chip" style="background:var(--k-capsule-soft,#e4f4ea);border-color:transparent;color:var(--k-capsule,#0b8a3e);">Recall · 6-month · due 26 Aug</span>',
    '    <span class="fcxd-chip">Allergies — none recorded</span>',
    '  </div>',
    '  <div class="fcxd-miniacts">',
    '    <button class="fcxd-miniact pri">Open chart</button>',
    '    <button class="fcxd-miniact">New visit</button>',
    '    <button class="fcxd-miniact">Collect &#8377;</button>',
    '  </div>',
    '  <div class="fcxd-cap">Sample data — your version reads your real records, offline.</div>',
    '</div>'
  ].join("\n"),

  "emr-vitals": [
    '<div class="fcxd-board">',
    '  <div class="fcxd-head"><div><h4 class="fcxd-h">Vitals panel</h4><p class="fcxd-sub">Arun Kumar · latest visit</p></div><span class="fcxd-chip">26 Feb</span></div>',
    '  <div class="fcxd-vgrid">',
    '    <div class="fcxd-vit"><span class="fcxd-vkey">Blood pressure</span><div class="fcxd-vval">118/76<span class="fcxd-unit">mmHg</span></div><span class="fcxd-tag fcxd-t-ok" style="margin-top:5px;display:inline-block;">Normal</span></div>',
    '    <div class="fcxd-vit"><span class="fcxd-vkey">Pulse</span><div class="fcxd-vval">72<span class="fcxd-unit">bpm</span></div><span class="fcxd-tag fcxd-t-ok" style="margin-top:5px;display:inline-block;">Normal</span></div>',
    '    <div class="fcxd-vit"><span class="fcxd-vkey">SpO&#8322;</span><div class="fcxd-vval">98<span class="fcxd-unit">%</span></div><span class="fcxd-tag fcxd-t-ok" style="margin-top:5px;display:inline-block;">Normal</span></div>',
    '    <div class="fcxd-vit is-live"><span class="fcxd-vkey">IOP · right eye</span><div class="fcxd-vval">16<span class="fcxd-unit">mmHg</span></div><span class="fcxd-tag fcxd-t-caps" style="margin-top:5px;display:inline-block;">Within target</span></div>',
    '  </div>',
    '  <div class="fcxd-cap">Sample data — your version reads your real records, offline.</div>',
    '</div>'
  ].join("\n"),

  "emr-visits": [
    '<div class="fcxd-board">',
    '  <div class="fcxd-head"><div><h4 class="fcxd-h">Visit history</h4><p class="fcxd-sub">Arun Kumar · newest first</p></div><span class="fcxd-chip">3 visits</span></div>',
    '  <div class="fcxd-tl">',
    '    <div class="fcxd-tlrow first"><div style="display:flex;align-items:center;gap:8px;"><span class="fcxd-time" style="width:auto;">26 Feb 2026</span><span class="fcxd-name">Follow-up · IOP stable</span><span class="fcxd-tag fcxd-t-ok">Stable</span></div><div class="fcxd-exnote">Dr. Rao · 10 min</div></div>',
    '    <div class="fcxd-tlrow"><div style="display:flex;align-items:center;gap:8px;"><span class="fcxd-time" style="width:auto;">12 Jan 2026</span><span class="fcxd-name">New exam · refraction</span><span class="fcxd-tag fcxd-t-info">Rx given</span></div><div class="fcxd-exnote">Dr. Rao · 25 min</div></div>',
    '    <div class="fcxd-tlrow"><div style="display:flex;align-items:center;gap:8px;"><span class="fcxd-time" style="width:auto;">04 Nov 2025</span><span class="fcxd-name">Redness · irritation</span><span class="fcxd-tag fcxd-t-dim">Resolved</span></div><div class="fcxd-exnote">Dr. Menon · 8 min</div></div>',
    '  </div>',
    '  <div class="fcxd-cap">Sample data — your version reads your real records, offline.</div>',
    '</div>'
  ].join("\n"),

  "emr-visit": [
    '<div class="fcxd-board">',
    '  <div class="fcxd-head"><div><h4 class="fcxd-h">Visit — 26 Feb 2026</h4><p class="fcxd-sub">Resolved through the visit chain</p></div><span class="fcxd-tag fcxd-t-caps">Complete</span></div>',
    '  <div class="fcxd-kv"><span class="fcxd-k">Reason</span><span class="fcxd-v">Follow-up · pressure check</span></div>',
    '  <div class="fcxd-kv"><span class="fcxd-k">IOP right eye</span><span class="fcxd-v">16 mmHg<span class="fcxd-delta">&#8595; from 21</span></span></div>',
    '  <div class="fcxd-kv"><span class="fcxd-k">Vision</span><span class="fcxd-v">6/6 · unchanged</span></div>',
    '  <div class="fcxd-kv"><span class="fcxd-k">Advice</span><span class="fcxd-v">Continue Timolol 0.5% BD</span></div>',
    '  <div class="fcxd-kv"><span class="fcxd-k">Next recall</span><span class="fcxd-v">26 Aug · 6-month</span></div>',
    '  <p class="fcxd-meta" style="margin-top:9px;">Dr. Rao · only changed values are saved — the rest resolve from the prior visit.</p>',
    '  <div class="fcxd-cap">Sample data — your version reads your real records, offline.</div>',
    '</div>'
  ].join("\n"),

  "emr-trend": [
    '<div class="fcxd-board">',
    '  <div class="fcxd-head"><div><h4 class="fcxd-h">IOP · right eye</h4><p class="fcxd-sub">Trend across the last 6 visits</p></div><span class="fcxd-chip blue">16 mmHg · today</span></div>',
    '  <div class="fcxd-spark">',
    '    <span class="fcxd-sbar" style="height:46px;"></span>',
    '    <span class="fcxd-sbar" style="height:44px;"></span>',
    '    <span class="fcxd-sbar" style="height:38px;"></span>',
    '    <span class="fcxd-sbar" style="height:41px;"></span>',
    '    <span class="fcxd-sbar" style="height:34px;"></span>',
    '    <span class="fcxd-sbar now" style="height:31px;"></span>',
    '  </div>',
    '  <div class="fcxd-svals"><span>21</span><span>20</span><span>18</span><span>19</span><span>17</span><span>16</span></div>',
    '  <div class="fcxd-svals"><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span><span>Jan</span><span>Feb</span></div>',
    '  <div class="fcxd-cap">Sample data — your version reads your real records, offline.</div>',
    '</div>'
  ].join("\n"),

  "ui-exam": [
    '<div class="fcxd-board">',
    '  <div class="fcxd-head"><div><h4 class="fcxd-h">Examination workup</h4><p class="fcxd-sub">Meera Joseph · pre-filled from the book</p></div><span class="fcxd-chip blue">2 of 4 done</span></div>',
    '  <div class="fcxd-exrow"><span class="fcxd-tick done">&#10003;</span><div class="fcxd-exstep"><div class="fcxd-exname">History &amp; complaints</div><div class="fcxd-exnote">Headache, evening blur — 2 weeks</div></div><span class="fcxd-tag fcxd-t-ok">Done</span></div>',
    '  <div class="fcxd-exrow"><span class="fcxd-tick done">&#10003;</span><div class="fcxd-exstep"><div class="fcxd-exname">Vision &amp; refraction</div><div class="fcxd-exnote">R 6/6 · L 6/9 — both eyes side by side</div></div><span class="fcxd-tag fcxd-t-info">Rx given</span></div>',
    '  <div class="fcxd-exrow"><span class="fcxd-tick"></span><div class="fcxd-exstep"><div class="fcxd-exname">IOP (NCT)</div><div class="fcxd-exnote">Tap to record — one field per eye</div></div><span class="fcxd-tag fcxd-t-warn">Pending</span></div>',
    '  <div class="fcxd-exrow"><span class="fcxd-tick"></span><div class="fcxd-exstep"><div class="fcxd-exname">Slit lamp</div><div class="fcxd-exnote">Queued behind IOP</div></div><span class="fcxd-tag fcxd-t-dim">Queued</span></div>',
    '  <div class="fcxd-cap">Sample data — your version reads your real records, offline.</div>',
    '</div>'
  ].join("\n"),

  "ui-cohorts": [
    '<div class="fcxd-board">',
    '  <div class="fcxd-head"><div><h4 class="fcxd-h">Diagnosis cohorts</h4><p class="fcxd-sub">Chronic-care registers, keyword rules</p></div><span class="fcxd-chip">3 registers</span></div>',
    '  <div class="fcxd-cohorts">',
    '    <div class="fcxd-cohort"><span class="fcxd-cohcount">34</span><div class="fcxd-cohname">Diabetes follow-ups</div><span class="fcxd-cohrule">sugar · hba1c</span><div class="fcxd-cohm"><span class="fcxd-mr">MR-1019</span>Meera Joseph</div><div class="fcxd-cohm"><span class="fcxd-mr">MR-1007</span>Sneha Patil</div></div>',
    '    <div class="fcxd-cohort"><span class="fcxd-cohcount">12</span><div class="fcxd-cohname">Glaucoma care</div><span class="fcxd-cohrule">poag · oht</span><div class="fcxd-cohm"><span class="fcxd-mr">MR-1042</span>Arun Kumar</div><div class="fcxd-cohm"><span class="fcxd-mr">MR-1011</span>Divya Nair</div></div>',
    '    <div class="fcxd-cohort"><span class="fcxd-cohcount">21</span><div class="fcxd-cohname">Pediatric myopia</div><span class="fcxd-cohrule">under 16 · rx</span><div class="fcxd-cohm"><span class="fcxd-mr">MR-1023</span>Rahim Shaikh</div><div class="fcxd-cohm"><span class="fcxd-mr">MR-1034</span>Sneha Patil</div></div>',
    '  </div>',
    '  <div class="fcxd-cap">Sample data — your version reads your real records, offline.</div>',
    '</div>'
  ].join("\n"),

  "bases-embed": [
    '<div class="fcxd-board">',
    '  <div class="fcxd-head"><div><h4 class="fcxd-h">Patients — saved view</h4><p class="fcxd-sub">Rendered inside the page</p></div><span class="fcxd-chip">8 rows</span></div>',
    '  <div class="fcxd-tabs" style="margin-bottom:6px;"><span class="fcxd-tab on">Sort: last visit</span><span class="fcxd-tab">Filter: recalls</span></div>',
    '  <table class="fcxd-table">',
    '    <thead><tr><th>MR</th><th>Patient</th><th>Last visit</th><th>Tag</th></tr></thead>',
    '    <tbody>',
    '      <tr><td class="num">MR-1042</td><td>Arun Kumar</td><td class="num">12 Feb</td><td><span class="fcxd-tag fcxd-t-warn">Recall due</span></td></tr>',
    '      <tr><td class="num">MR-1039</td><td>Meera Joseph</td><td class="num">26 Feb</td><td><span class="fcxd-tag fcxd-t-info">Optics pending</span></td></tr>',
    '      <tr><td class="num">MR-1047</td><td>Rahim Shaikh</td><td class="num">Today</td><td><span class="fcxd-tag fcxd-t-caps">New</span></td></tr>',
    '      <tr><td class="num">MR-1031</td><td>Divya Nair</td><td class="num">18 Jan</td><td><span class="fcxd-tag fcxd-t-dim">Stable</span></td></tr>',
    '    </tbody>',
    '  </table>',
    '  <div class="fcxd-cap">Sample data — your version reads your real records, offline.</div>',
    '</div>'
  ].join("\n")

};

/* convenience export — the full covered id list, for app.js sanity checks */
window.FCX_CAPSULE_DEMO_IDS = Object.keys(window.FCX_CAPSULE_DEMOS);
