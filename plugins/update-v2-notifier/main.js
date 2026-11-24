/**
 * FocusCaseX — Update Notifier (core plugin).
 *
 * The marketplace's announcement banner: a hand-coded pixel-art strip at
 * the top of the workspace announcing the latest marketplace core —
 * quick patches, Extensions, Modes. Everything is drawn with code — a
 * 5×5 bitmap font for the headline, a 12×12 two-frame pixel rocket,
 * scanlines, a marching border and steps() animations. No images, no
 * external fonts, no smooth gradients: pure pixel coding that rides the
 * app's theme tokens.
 *
 * The DOWNLOAD button runs the core-updater (ctx.core.pull): it checks
 * the marketplace core and pulls only the core plugins whose version is
 * actually newer (already-current ones are skipped — an existing
 * extension is never re-installed) — no app redeploy needed. A
 * "▲ PATCH READY" status-bar chip stays lit while an update is waiting.
 *
 * Repeat-guard: the banner auto-shows only when the marketplace core is
 * genuinely newer than the APPLIED core version (fcx.core.applied — the
 * single source of truth every update surface writes), and only when
 * THIS announcement hasn't been dismissed. An installed update never
 * re-announces, no matter which surface applied it.
 *
 * Surfaces: banner · commands · ribbon · status bar · settings pane · CSS · storage.
 */
(function (ctx) {
  "use strict";

  /* ---------------------------------------------------------------- */
  /* pixel font — 5×5 glyphs, drawn on canvas, never an image file     */

  var FONT = {
    U: ["X...X", "X...X", "X...X", "X...X", "XXXXX"],
    P: ["XXXX.", "X...X", "XXXX.", "X....", "X...."],
    D: ["XXXX.", "X...X", "X...X", "X...X", "XXXX."],
    A: [".XXX.", "X...X", "XXXXX", "X...X", "X...X"],
    T: ["XXXXX", "..X..", "..X..", "..X..", "..X.."],
    E: ["XXXXX", "X....", "XXXX.", "X....", "XXXXX"],
    V: ["X...X", "X...X", "X...X", ".X.X.", "..X.."],
    C: [".XXXX", "X....", "X....", "X....", ".XXXX"],
    O: [".XXX.", "X...X", "X...X", "X...X", ".XXX."],
    R: ["XXXX.", "X...X", "XXXX.", "X..X.", "X...X"],
    F: ["XXXXX", "X....", "XXXX.", "X....", "X...."],
    I: ["XXXXX", "..X..", "..X..", "..X..", "XXXXX"],
    N: ["X...X", "XX..X", "X.X.X", "X..XX", "X...X"],
    L: ["X....", "X....", "X....", "X....", "XXXXX"],
    M: ["X...X", "XX.XX", "X.X.X", "X...X", "X...X"],
    S: [".XXXX", "X....", ".XXX.", "....X", "XXXX."],
    W: ["X...X", "X...X", "X.X.X", "XX.XX", "X...X"],
    Y: ["X...X", "X...X", ".XXX.", "..X..", "..X.."],
    "!": ["..X..", "..X..", "..X..", ".....", "..X.."],
    "2": [".XXX.", "X...X", "..XX.", ".X...", "XXXXX"],
    "1": ["..X..", ".XX..", "..X..", "..X..", "XXXXX"],
    ".": [".....", ".....", ".....", ".....", "..X.."],
    "0": [".XXX.", "X..XX", "X.X.X", "XX..X", ".XXX."],
    " ": [".....", ".....", ".....", ".....", "....."],
  };

  /** Draws text with the bitmap font onto a 5-row canvas (1px = 1px). */
  function drawPixelText(canvas, text, color) {
    if (!canvas) return;
    var c = canvas.getContext("2d");
    if (!c) return;
    c.clearRect(0, 0, canvas.width, canvas.height);
    var x = 0;
    for (var i = 0; i < text.length; i++) {
      var glyph = FONT[text[i]] || FONT[" "];
      for (var gy = 0; gy < glyph.length; gy++) {
        var row = glyph[gy];
        for (var gx = 0; gx < row.length; gx++) {
          if (row[gx] === "X") {
            c.fillStyle = color;
            c.fillRect(x + gx, gy, 1, 1);
          }
        }
      }
      x += 6; /* 5 wide + 1 gap */
    }
  }

  /* ---------------------------------------------------------------- */
  /* the pixel rocket — 12×12, two frames (flame flicker)              */

  var ROCKET_A = [
    ".....XX.....",
    ".....XX.....",
    "....XXXX....",
    "....XXXX....",
    "...XXXXXX...",
    "...XXooXX...",
    "...XXooXX...",
    "..XXXXXXXX..",
    "..XXXXXXXX..",
    "..XXX..XXX..",
    ".F........F.",
    "....FFFF....",
  ];
  var ROCKET_B = [
    ".....XX.....",
    ".....XX.....",
    "....XXXX....",
    "....XXXX....",
    "...XXXXXX...",
    "...XXooXX...",
    "...XXooXX...",
    "..XXXXXXXX..",
    "..XXXXXXXX..",
    "..XXX..XXX..",
    "F..........F",
    ".....FF.....",
  ];

  function drawRocket(canvas, frame, colors) {
    if (!canvas) return;
    var c = canvas.getContext("2d");
    if (!c) return;
    c.clearRect(0, 0, canvas.width, canvas.height);
    var map = frame === 0 ? ROCKET_A : ROCKET_B;
    for (var y = 0; y < map.length; y++) {
      var row = map[y];
      for (var x = 0; x < row.length; x++) {
        var ch = row[x];
        if (ch === ".") continue;
        c.fillStyle = ch === "F" ? colors.flame : ch === "o" ? colors.window : colors.body;
        c.fillRect(x, y, 1, 1);
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* theme colors (tokens only — the app sets --accent-live)           */

  function themeColors() {
    var styles = getComputedStyle(document.documentElement);
    var pick = function (name) {
      return styles.getPropertyValue(name).trim();
    };
    return {
      body: pick("--accent-live") || pick("--accent"),
      window: pick("--background"),
      flame: pick("--foreground"),
      ink: pick("--foreground"),
    };
  }

  /* ---------------------------------------------------------------- */
  /* plugin state                                                      */

  var data = { autoShow: true, intensity: "retro", pulledVersion: "", dismissedFor: "" };
  var mounted = false;
  var root = null;
  var frameTimer = null;
  var frame = 0;
  var hideTimer = null;
  var pullRunning = false;
  /** the announcement id currently known from the marketplace core. */
  var currentAnnounceId = "";
  /** pixel headline + version label, refreshed from the remote core check. */
  var VERSION_LABEL = "2.1";
  var TITLE_ANNOUNCE = "UPDATE V2.1!";
  var TITLE_SUCCESS = "CORE V2.1 LIVE";

  /** "2.2.0" → "2.2" (the pixel font renders major.minor comfortably). */
  function shortVersion(v) {
    var m = /^\d+\.\d+/.exec(String(v || ""));
    return m ? m[0] : "2.1";
  }

  function retitle(version) {
    VERSION_LABEL = shortVersion(version);
    TITLE_ANNOUNCE = "UPDATE V" + VERSION_LABEL + "!";
    TITLE_SUCCESS = "CORE V" + VERSION_LABEL + " LIVE";
  }

  /* ---------------------------------------------------------------- */
  /* banner DOM                                                        */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  function drawPixelTextScaled(canvas, text, color) {
    setCanvasSize(canvas, text);
    drawPixelText(canvas, text, color);
  }

  function setCanvasSize(canvas, text) {
    if (!canvas) return;
    canvas.width = text.length * 6 - 1;
    canvas.height = 5;
  }

  function build() {
    var colors = themeColors();
    root = el("div", "fcx-uv2");
    root.setAttribute("data-intensity", data.intensity);
    root.setAttribute("data-state", "announce");

    var frameBox = el("div", "fcx-uv2-frame");

    var mascot = document.createElement("canvas");
    mascot.className = "fcx-uv2-mascot";
    mascot.width = 12;
    mascot.height = 12;
    mascot.setAttribute("aria-hidden", "true");
    drawRocket(mascot, 0, colors);

    var copy = el("div", "fcx-uv2-copy");

    var headline = el("div", "fcx-uv2-headline");
    var title = document.createElement("canvas");
    title.className = "fcx-uv2-title";
    title.setAttribute("role", "img");
    title.setAttribute("aria-label", "Core " + VERSION_LABEL + " update is live");
    drawPixelTextScaled(title, TITLE_ANNOUNCE, colors.body);
    var caret = el("span", "fcx-uv2-caret");
    caret.setAttribute("aria-hidden", "true");
    var badge = el("span", "fcx-uv2-badge", "CORE");
    headline.appendChild(title);
    headline.appendChild(caret);
    headline.appendChild(badge);

    var sub = el(
      "p",
      "fcx-uv2-sub",
      "Quick patches, Extensions, Modes and more — Core v" +
        VERSION_LABEL +
        " is live on the FocusCaseX Marketplace. One tap pulls it; already-current extensions are never re-installed.",
    );

    copy.appendChild(headline);
    copy.appendChild(sub);

    var actions = el("div", "fcx-uv2-actions");
    var download = el("button", "fcx-uv2-btn", "DOWNLOAD UPDATE V" + VERSION_LABEL);
    download.type = "button";
    download.setAttribute("aria-label", "Download Core v" + VERSION_LABEL + " from the FocusCaseX Marketplace");
    download.addEventListener("click", onDownload);
    var dismiss = el("button", "fcx-uv2-x", "\u00d7");
    dismiss.type = "button";
    dismiss.setAttribute("aria-label", "Dismiss the update banner");
    dismiss.addEventListener("click", onDismiss);
    actions.appendChild(download);
    actions.appendChild(dismiss);

    frameBox.appendChild(mascot);
    frameBox.appendChild(copy);
    frameBox.appendChild(actions);
    root.appendChild(frameBox);

    var scan = el("div", "fcx-uv2-scanlines");
    scan.setAttribute("aria-hidden", "true");
    root.appendChild(scan);

    startFrames(mascot);
  }

  function startFrames(mascot) {
    stopFrames();
    frameTimer = setInterval(function () {
      frame = frame === 0 ? 1 : 0;
      drawRocket(mascot, frame, themeColors());
    }, 320);
  }

  function stopFrames() {
    if (frameTimer) clearInterval(frameTimer);
    frameTimer = null;
  }

  /* ---------------------------------------------------------------- */
  /* status bar — the quick-patch beacon                               */

  var statusItem = null;
  var statusWanted = false;

  /** Shows a persistent "PATCH READY" chip while a core update waits;
   *  cleared once the pull lands or the banner is dismissed. */
  function setPatchStatus(waiting) {
    statusWanted = waiting === true;
    if (!statusItem && typeof ctx.addStatusBarItem === "function") {
      try {
        statusItem = ctx.addStatusBarItem();
      } catch {
        statusItem = null;
      }
    }
    if (!statusItem) return;
    try {
      statusItem.setText(statusWanted ? "\u25b2 PATCH READY" : "");
    } catch {
      /* status item gone — ignore */
    }
  }

  /* ---------------------------------------------------------------- */
  /* actions                                                           */

  function onDownload() {
    if (pullRunning) return;
    var btn = root ? root.querySelector(".fcx-uv2-btn") : null;
    if (!btn || !ctx.core || typeof ctx.core.pull !== "function") {
      ctx.showToast("The core-updater is not available in this build.");
      return;
    }
    pullRunning = true;
    btn.disabled = true;
    btn.textContent = "CHECKING…";
    /* silent: this banner renders its own success state — the pull must
       not ALSO toast, or one tap stacks two confirmations */
    ctx.core
      .pull(
        function (progress) {
        var label = "CHECKING…";
        if (progress.phase === "fetch") label = "PULLING " + progress.done + "/" + progress.total;
        else if (progress.phase === "install") {
          label = progress.detail && progress.detail.indexOf("already current") !== -1
            ? "ALREADY CURRENT"
            : "INSTALLING " + progress.done + "/" + progress.total;
        } else if (progress.phase === "apply") label = "APPLYING…";
        else if (progress.phase === "done") label = "DONE!";
        btn.textContent = label;
        },
        { silent: true },
      )
      .then(function (result) {
        pullRunning = false;
        if (btn) btn.disabled = false;
        if (result && result.ok) {
          data.pulledVersion = result.version || "";
          data.dismissedFor = currentAnnounceId || TITLE_ANNOUNCE;
          save();
          setPatchStatus(false);
          successState(result);
        } else {
          btn.textContent = "RETRY DOWNLOAD";
        }
      })
      .catch(function () {
        pullRunning = false;
        if (btn) {
          btn.disabled = false;
          btn.textContent = "RETRY DOWNLOAD";
        }
      });
  }

  function successState(result) {
    if (!root) return;
    var colors = themeColors();
    root.setAttribute("data-state", "success");
    var title = root.querySelector(".fcx-uv2-title");
    if (title) drawPixelTextScaled(title, TITLE_SUCCESS, colors.body);
    var sub = root.querySelector(".fcx-uv2-sub");
    var pulled = result && (result.installed.length + result.volatile.length) || 0;
    var skipped = result && result.skipped ? result.skipped.length : 0;
    if (sub) {
      sub.textContent =
        pulled > 0
          ? "Core v" + VERSION_LABEL + " is live — " + pulled + " pulled, " + skipped + " already current. Quick patches land the same way."
          : "Core v" + VERSION_LABEL + " applied — every core extension was already current, nothing re-installed.";
    }
    var btn = root.querySelector(".fcx-uv2-btn");
    if (btn) btn.remove();
    ctx.showToast(
      pulled > 0
        ? "Core v" + VERSION_LABEL + " pulled from the FocusCaseX Marketplace."
        : "Core v" + VERSION_LABEL + " — everything was already current.",
    );
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      hideBanner();
    }, 6000);
  }

  function onDismiss() {
    data.dismissedFor = currentAnnounceId || TITLE_ANNOUNCE;
    save();
    setPatchStatus(false);
    hideBanner();
  }

  function hideBanner() {
    if (root) {
      root.classList.add("fcx-uv2-out");
      var node = root;
      setTimeout(function () {
        if (node.parentNode) node.parentNode.removeChild(node);
      }, 260);
      root = null;
    }
    stopFrames();
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;
    mounted = false;
  }

  function show() {
    if (mounted) return;
    if (!ctx.registerBanner) {
      ctx.showToast("Update v2: banners are not supported by this build.");
      return;
    }
    mounted = true;
    build();
    /* registerBanner mounts immediately into the workspace strip */
    ctx.registerBanner({
      id: "update-v2",
      order: 0,
      mount: function (host) {
        if (root) host.replaceChildren(root);
      },
      destroy: function () {
        stopFrames();
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = null;
        mounted = false;
      },
    });
  }

  function save() {
    void ctx.saveData(data);
  }

  /* ---------------------------------------------------------------- */
  /* surfaces                                                          */

  /* Pixel stylesheet — token-driven (no raw hex), steps() animations,
     zero radii. Removed automatically on unload by the plugin host. */
  var CSS = [
    ".fcx-uv2{position:relative;overflow:hidden;border-bottom:2px solid var(--border);background:var(--card);color:var(--card-foreground);animation:fcx-uv2-drop .34s steps(6) both;}",
    ".fcx-uv2::after{content:\"\";position:absolute;top:0;left:0;right:0;height:4px;background:repeating-linear-gradient(to right,var(--accent-live,var(--accent)) 0 4px,transparent 4px 8px);animation:fcx-uv2-march .5s steps(2) infinite;}",
    ".fcx-uv2-frame{position:relative;z-index:1;display:flex;align-items:center;gap:.875rem;padding:.625rem .875rem;}",
    ".fcx-uv2-mascot{width:44px;height:44px;flex:none;image-rendering:pixelated;animation:fcx-uv2-hop .9s steps(2) infinite;}",
    ".fcx-uv2-copy{min-width:0;flex:1;}",
    ".fcx-uv2-headline{display:flex;align-items:center;gap:.625rem;min-width:0;}",
    ".fcx-uv2-title{image-rendering:pixelated;height:1.4rem;width:auto;flex:none;}",
    ".fcx-uv2-caret{display:inline-block;width:.55rem;height:1.05rem;flex:none;background:var(--accent-live,var(--accent));animation:fcx-uv2-caret .8s steps(1) infinite;}",
    ".fcx-uv2-badge{display:inline-flex;align-items:center;padding:.1rem .4rem;flex:none;border:1px solid var(--accent-foreground);background:var(--accent-live,var(--accent));color:var(--accent-foreground);font-family:var(--font-mono,monospace);font-size:.5625rem;font-weight:700;letter-spacing:.14em;animation:fcx-uv2-blink 1.2s steps(1) infinite;}",
    ".fcx-uv2-sub{margin:.2rem 0 0;font-size:.75rem;line-height:1.4;color:var(--muted-foreground);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}",
    ".fcx-uv2-actions{display:flex;align-items:center;gap:.375rem;flex:none;}",
    ".fcx-uv2-btn{display:inline-flex;align-items:center;gap:.375rem;border:2px solid color-mix(in srgb,var(--foreground) 30%,transparent);border-radius:0;background:var(--accent-live,var(--accent));color:var(--accent-foreground);box-shadow:3px 3px 0 0 color-mix(in srgb,var(--foreground) 30%,transparent);font-family:var(--font-mono,monospace);font-size:.6875rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:.5rem .75rem;cursor:pointer;transition:none;}",
    ".fcx-uv2-btn:active{translate:2px 2px;box-shadow:1px 1px 0 0 color-mix(in srgb,var(--foreground) 30%,transparent);}",
    ".fcx-uv2-btn:disabled{opacity:.7;cursor:progress;}",
    ".fcx-uv2-btn-sm{padding:.3rem .5rem;font-size:.625rem;}",
    ".fcx-uv2-x{display:inline-flex;align-items:center;justify-content:center;width:1.75rem;height:1.75rem;flex:none;border:1px solid var(--border);border-radius:0;background:transparent;color:var(--muted-foreground);font-size:1rem;line-height:1;cursor:pointer;transition:none;}",
    ".fcx-uv2-x:hover{color:var(--foreground);border-color:var(--accent-live,var(--accent));}",
    ".fcx-uv2-scanlines{position:absolute;inset:0;pointer-events:none;z-index:2;background:repeating-linear-gradient(to bottom,color-mix(in srgb,var(--foreground) 5%,transparent) 0 1px,transparent 1px 4px);opacity:.55;}",
    ".fcx-uv2[data-intensity=\"subtle\"] .fcx-uv2-scanlines{display:none;}",
    ".fcx-uv2[data-state=\"success\"]{background:color-mix(in srgb,var(--accent) 14%,var(--card));}",
    ".fcx-uv2[data-state=\"success\"] .fcx-uv2-mascot{animation-duration:.45s;}",
    ".fcx-uv2-out{animation:fcx-uv2-up .26s steps(4) both;}",
    "@keyframes fcx-uv2-drop{from{transform:translateY(-100%);}to{transform:translateY(0);}}",
    "@keyframes fcx-uv2-up{from{transform:translateY(0);opacity:1;}to{transform:translateY(-100%);opacity:0;}}",
    "@keyframes fcx-uv2-hop{0%,100%{transform:translateY(0);}50%{transform:translateY(-3px);}}",
    "@keyframes fcx-uv2-caret{0%,49%{opacity:1;}50%,100%{opacity:0;}}",
    "@keyframes fcx-uv2-blink{0%,60%{opacity:1;}61%,100%{opacity:.15;}}",
    "@keyframes fcx-uv2-march{from{background-position-x:0;}to{background-position-x:8px;}}",
    "@media (prefers-reduced-motion:reduce){.fcx-uv2,.fcx-uv2::after,.fcx-uv2-mascot,.fcx-uv2-caret,.fcx-uv2-badge{animation:none;}}",
    ".fcx-uv2-settings-head{margin:0 0 .25rem;font-weight:700;font-size:.875rem;}",
    ".fcx-uv2-settings-hint{margin:0 0 .75rem;font-size:.75rem;color:var(--muted-foreground);}",
    ".fcx-uv2-settings-version{margin:0 0 .75rem;font-family:var(--font-mono,monospace);font-size:.6875rem;color:var(--muted-foreground);}",
    ".fcx-uv2-settings-row{display:flex;align-items:center;gap:.5rem;margin:0 0 .5rem;font-size:.8125rem;}",
    ".fcx-uv2-settings-row select{border:1px solid var(--border);border-radius:0;background:var(--card);color:var(--card-foreground);padding:.25rem .375rem;font-size:.75rem;}",
    ".fcx-uv2-settings-actions{display:flex;gap:.5rem;margin-top:.75rem;flex-wrap:wrap;}",
  ].join("\n");
  if (typeof ctx.registerCss === "function") ctx.registerCss(CSS);

  ctx.registerCommand({
    id: "show-banner",
    title: "Show the update banner",
    icon: "Rocket",
    run: function () {
      data.dismissedFor = "";
      save();
      show();
    },
  });

  ctx.registerCommand({
    id: "check-core",
    title: "Check marketplace core updates",
    icon: "RefreshCcw",
    run: function () {
      if (!ctx.core || typeof ctx.core.check !== "function") {
        ctx.showToast("The core-updater is not available in this build.");
        return;
      }
      void ctx.core.check().then(function (result) {
        if (!result) {
          ctx.showToast("The marketplace is unreachable right now.");
          return;
        }
        var applied = result.appliedVersion || "stock";
        ctx.showToast(
          result.hasUpdate
            ? "Core v" + result.remoteVersion + " is available (applied: v" + applied + ") — open the banner to pull it."
            : "Core is current: v" + result.remoteVersion + " (applied: v" + applied + ").",
        );
      });
    },
  });

  ctx.addRibbonIcon("Rocket", "Marketplace updates — core + quick patches", function () {
    data.dismissedFor = "";
    save();
    show();
  });

  ctx.addSettingsPane(function (container) {
    container.replaceChildren();

    var head = el("p", "fcx-uv2-settings-head", "Update Notifier");
    var hint = el(
      "p",
      "fcx-uv2-settings-hint",
      "The pixel-art announcement banner of the FocusCaseX Marketplace core — quick patches for Extensions land through here.",
    );
    container.appendChild(head);
    container.appendChild(hint);

    var coreVersion = el("p", "fcx-uv2-settings-version");
    if (ctx.core && typeof ctx.core.version === "function") {
      var v = ctx.core.version();
      coreVersion.textContent = "Applied core: " + (v ? "v" + v : "stock (no core pulled yet)");
    } else {
      coreVersion.textContent = "Core-updater unavailable in this build.";
    }
    container.appendChild(coreVersion);

    var row1 = el("label", "fcx-uv2-settings-row");
    var check1 = document.createElement("input");
    check1.type = "checkbox";
    check1.checked = data.autoShow !== false;
    check1.addEventListener("change", function () {
      data.autoShow = check1.checked;
      save();
      if (check1.checked) show();
    });
    row1.appendChild(check1);
    row1.appendChild(el("span", null, " Show the banner when a core update is waiting"));
    container.appendChild(row1);

    var row2 = el("label", "fcx-uv2-settings-row");
    var select = document.createElement("select");
    var optRetro = el("option", null, "Retro (scanlines + march)");
    optRetro.value = "retro";
    var optSubtle = el("option", null, "Subtle (no overlay)");
    optSubtle.value = "subtle";
    select.appendChild(optRetro);
    select.appendChild(optSubtle);
    select.value = data.intensity === "subtle" ? "subtle" : "retro";
    select.addEventListener("change", function () {
      data.intensity = select.value;
      save();
      if (root) root.setAttribute("data-intensity", select.value);
    });
    row2.appendChild(el("span", null, "Intensity "));
    row2.appendChild(select);
    container.appendChild(row2);

    var actionsRow = el("div", "fcx-uv2-settings-actions");
    var showBtn = el("button", "fcx-uv2-btn fcx-uv2-btn-sm", "SHOW BANNER");
    showBtn.type = "button";
    showBtn.addEventListener("click", function () {
      data.dismissedFor = "";
      save();
      show();
    });
    var pullBtn = el("button", "fcx-uv2-btn fcx-uv2-btn-sm", "RUN CORE UPDATE");
    pullBtn.type = "button";
    pullBtn.addEventListener("click", function () {
      show();
      var btn = root ? root.querySelector(".fcx-uv2-btn") : null;
      if (btn) btn.click();
    });
    actionsRow.appendChild(showBtn);
    actionsRow.appendChild(pullBtn);
    container.appendChild(actionsRow);
  });

  /* ---------------------------------------------------------------- */
  /* boot                                                              */

  void ctx.loadData().then(function (saved) {
    if (saved && typeof saved === "object") {
      if (typeof saved.autoShow === "boolean") data.autoShow = saved.autoShow;
      if (saved.intensity === "subtle" || saved.intensity === "retro") data.intensity = saved.intensity;
      if (typeof saved.pulledVersion === "string") data.pulledVersion = saved.pulledVersion;
      if (typeof saved.dismissedFor === "string") data.dismissedFor = saved.dismissedFor;
    }

    /* Auto-show policy — the applied core version is the single source of
       truth. A pull can land through ANY surface (this banner, Settings
       › About, a core plugin), so the banner only auto-shows when the
       marketplace core is genuinely NEWER than the applied one, and the
       user hasn't dismissed THIS announcement. This kills the bug where
       the banner kept re-announcing an update that was already installed. */
    if (!ctx.core || typeof ctx.core.check !== "function") {
      /* legacy fallback: builds without the core bridge */
      if (data.autoShow && data.dismissedFor !== TITLE_ANNOUNCE && !data.pulledVersion) show();
      return;
    }
    void ctx.core
      .check()
      .then(function (check) {
        if (!check) return; /* offline — stay quiet on boot, never nag */
        retitle(check.remoteVersion);
        var remoteAnnounce = check.core && check.core.announcement ? check.core.announcement : null;
        currentAnnounceId = (remoteAnnounce && remoteAnnounce.id) || TITLE_ANNOUNCE;
        if (check.hasUpdate) setPatchStatus(true);
        if (check.hasUpdate && data.autoShow && data.dismissedFor !== currentAnnounceId) show();
      })
      .catch(function () {
        /* marketplace unreachable — quiet boot */
      });
  });

  ctx.onunload = function () {
    stopFrames();
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;
    root = null;
    mounted = false;
  };
})(ctx);
