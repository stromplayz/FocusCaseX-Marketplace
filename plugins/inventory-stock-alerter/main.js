/**
 * FocusCaseX sample plugin — Stock Alerter.
 *
 * Watches the workbench stock note (Clinic/Inventory.md — a markdown table
 * with headers Item | Category | Stock | Reorder at | Supplier | Last
 * ordered) and flags any row whose Stock is at or below its Reorder point.
 *
 * Surfaces:
 *   • A status-bar item that reads "N low" while N rows need restocking.
 *   • A "Low stock" sidebar section listing those rows with a calm amber
 *     tint, an "Open note" action and a "Write reorder note" action that
 *     appends (or idempotently refreshes) a "## Reorders" section in the
 *     inventory note. Existing content is never rewritten — only the
 *     Reorders block itself is replaced.
 *
 * Parsing is lenient: the first markdown table with Stock + Reorder
 * columns wins; rows with missing cells are skipped; non-numeric stock or
 * reorder values are skipped. Structured storage (loadData/saveData) is
 * supported by the host, so the last parsed low list is cached there and
 * used only while folder access has not been granted yet — the note itself
 * is always the source of truth once readable.
 *
 * No network access; reads and writes stay inside the granted Clinic folder.
 */
(function (ctx) {
  "use strict";

  var NOTE_PATH = "Clinic/Inventory.md";
  var NOTE_FOLDER = "Clinic";
  var REORDERS_HEADING = "Reorders";

  var item = ctx.addStatusBarItem();
  var lowItems = []; // [{sku,name,qty,min,category,supplier}]
  var readable = false; // last read of the stock note succeeded
  var cacheUsed = false; // currently showing the loadData cache
  var seq = 0; // async race guard
  var sidebarEl = null;

  /* ============================== parsing ================================ */

  function splitCells(line) {
    var body = line.trim().replace(/^\|/, "").replace(/\|\s*$/, "");
    return body.split("|").map(function (c) {
      return c.trim();
    });
  }

  function isSeparator(cells) {
    if (cells.length === 0) return false;
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i].replace(/:/g, "");
      if (c !== "" && !/^-{2,}$/.test(c)) return false;
    }
    return true;
  }

  function num(v) {
    if (v == null) return null;
    var n = parseFloat(String(v).replace(/[,\s₹$]+/g, ""));
    return isFinite(n) ? n : null;
  }

  /**
   * Finds the stock table in the note and returns the low rows.
   * The table must have a "Stock" column and a "Reorder..." column; the
   * item column is "Item" when present, otherwise the first column.
   */
  function parseStock(content) {
    var lines = String(content == null ? "" : content).split(/\r?\n/);
    var low = [];
    var headerIdx = -1;
    var iItem = -1;
    var iStock = -1;
    var iReorder = -1;
    var iCat = -1;
    var iSup = -1;

    for (var i = 0; i < lines.length - 1; i++) {
      var line = lines[i].trim();
      if (!line || line.charAt(0) !== "|") continue;
      var cells = splitCells(line);
      if (!isSeparator(splitCells(lines[i + 1] || ""))) continue;
      var lower = cells.map(function (c) {
        return c.toLowerCase();
      });
      iStock = lower.indexOf("stock");
      iReorder = -1;
      for (var j = 0; j < lower.length; j++) {
        if (/^reorder/.test(lower[j])) {
          iReorder = j;
          break;
        }
      }
      if (iStock < 0 || iReorder < 0) continue;
      iItem = lower.indexOf("item");
      if (iItem < 0) iItem = 0;
      iCat = lower.indexOf("category");
      iSup = lower.indexOf("supplier");
      headerIdx = i;
      break;
    }
    if (headerIdx < 0) return { found: false, low: low };

    for (var r = headerIdx + 2; r < lines.length; r++) {
      var row = lines[r].trim();
      if (!row || row.charAt(0) !== "|") break; // table ended
      var vals = splitCells(row);
      if (isSeparator(vals)) continue;
      var need = Math.max(iItem, iStock, iReorder, iCat, iSup);
      if (vals.length <= need) continue; // missing cells → skip the row
      var name = vals[iItem] || "";
      var qty = num(vals[iStock]);
      var min = num(vals[iReorder]);
      if (!name || qty === null || min === null) continue; // non-numeric → skip
      if (qty > min) continue;
      low.push({
        sku: name,
        name: name,
        qty: qty,
        min: min,
        category: iCat >= 0 ? vals[iCat] || "" : "",
        supplier: iSup >= 0 ? vals[iSup] || "" : "",
      });
    }
    return { found: true, low: low };
  }

  /* ============================ reorder block ============================= */

  function headingOf(line) {
    var m = line.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*$/);
    if (!m) return null;
    return { level: m[1].length, text: m[2] };
  }

  function today() {
    var d = new Date();
    var p = function (n) {
      return (n < 10 ? "0" : "") + n;
    };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function reorderBlock(rows) {
    var out = [];
    out.push("## " + REORDERS_HEADING);
    out.push("");
    out.push(
      "Updated " + today() + " — " + rows.length + " item" + (rows.length === 1 ? "" : "s") +
        " at or below its reorder point.",
    );
    out.push("");
    out.push("| Item | Stock | Reorder at | Supplier |");
    out.push("| --- | --- | --- | --- |");
    for (var i = 0; i < rows.length; i++) {
      out.push(
        "| " + rows[i].name + " | " + rows[i].qty + " | " + rows[i].min + " | " +
          (rows[i].supplier || "—") + " |",
      );
    }
    return out.join("\n");
  }

  /**
   * Merges the Reorders block into the note text. Replaces only the existing
   * "## Reorders" section (heading up to the next heading of the same or a
   * higher level); otherwise appends after the current content.
   */
  function mergeReorders(content, rows) {
    var lines = String(content == null ? "" : content).split(/\r?\n/);
    var start = -1;
    var startLevel = 2;
    for (var i = 0; i < lines.length; i++) {
      var h = headingOf(lines[i]);
      if (h && h.text.toLowerCase() === REORDERS_HEADING.toLowerCase()) {
        start = i;
        startLevel = h.level;
        break;
      }
    }
    var block = reorderBlock(rows);
    if (start < 0) {
      var base = String(content == null ? "" : content).replace(/\s+$/, "");
      return base.length ? base + "\n\n" + block + "\n" : block + "\n";
    }
    var end = lines.length;
    for (var k = start + 1; k < lines.length; k++) {
      var h2 = headingOf(lines[k]);
      if (h2 && h2.level <= startLevel) {
        end = k;
        break;
      }
    }
    var head = lines.slice(0, start).join("\n").replace(/\s+$/, "");
    var tail = lines.slice(end).join("\n").replace(/^\s+/, "").replace(/\s+$/, "");
    var merged = head.length ? head + "\n\n" + block : block;
    return tail.length ? merged + "\n\n" + tail + "\n" : merged + "\n";
  }

  function writeReorders() {
    if (!lowItems.length) {
      ctx.showToast("Nothing is below its reorder point.");
      return;
    }
    seq += 1;
    var mine = seq;
    ctx.fs
      .read(NOTE_PATH)
      .then(function (content) {
        if (mine !== seq || content == null) {
          ctx.showToast("Could not read the inventory note.");
          return;
        }
        var next = mergeReorders(content, lowItems);
        return ctx.fs.write(NOTE_PATH, next).then(function (ok) {
          if (mine !== seq) return;
          if (ok) {
            ctx.showToast("Reorder list written to " + NOTE_PATH + ".");
            refresh();
          } else {
            ctx.showToast("Writing the reorder list failed.");
          }
        });
      })
      .catch(function () {
        ctx.showToast("Writing the reorder list failed.");
      });
  }

  /* =============================== refresh ================================ */

  function hasAccess() {
    try {
      return ctx.fs.folders().indexOf(NOTE_FOLDER) >= 0;
    } catch (e) {
      return false;
    }
  }

  function renderStatus() {
    if (readable || cacheUsed) {
      item.setText(lowItems.length + " low");
    } else {
      item.setText("");
    }
    renderSidebar();
  }

  function renderSidebar() {
    if (!sidebarEl) return;
    var el = sidebarEl;
    el.textContent = "";

    function row(item) {
      var wrap = document.createElement("div");
      wrap.style.cssText =
        "display:flex;flex-direction:column;gap:2px;padding:7px 9px;border-radius:9px;" +
        "border:1px solid color-mix(in oklab, #f59e0b 28%, transparent);" +
        "background:color-mix(in oklab, #f59e0b 9%, transparent);";
      var top = document.createElement("div");
      top.style.cssText =
        "display:flex;align-items:baseline;justify-content:space-between;gap:8px;";
      var name = document.createElement("span");
      name.style.cssText = "font-size:12.5px;font-weight:600;color:var(--foreground);";
      name.textContent = item.name;
      var chip = document.createElement("span");
      chip.style.cssText =
        "font-size:11px;font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap;" +
        "color:color-mix(in oklab, #f59e0b 78%, var(--foreground));";
      chip.textContent = item.qty + " / reorder at " + item.min;
      top.appendChild(name);
      top.appendChild(chip);
      wrap.appendChild(top);
      var meta = [];
      if (item.category) meta.push(item.category);
      if (item.supplier) meta.push(item.supplier);
      if (meta.length) {
        var sub = document.createElement("span");
        sub.style.cssText = "font-size:11px;color:var(--muted-foreground);";
        sub.textContent = meta.join(" · ");
        wrap.appendChild(sub);
      }
      el.appendChild(wrap);
    }

    function button(labelText, onClick) {
      var b = document.createElement("button");
      b.type = "button";
      b.style.cssText =
        "border:1px solid var(--border);background:var(--muted,#1f2937);border-radius:8px;" +
        "padding:4px 10px;font-size:11.5px;font-weight:600;color:var(--foreground);cursor:pointer;";
      b.textContent = labelText;
      b.addEventListener("click", onClick);
      return b;
    }

    if (!hasAccess()) {
      var note = document.createElement("p");
      note.style.cssText = "font-size:12px;color:var(--muted-foreground);padding:2px 2px 6px;";
      note.textContent = "Reads " + NOTE_PATH + " once folder access is granted.";
      el.appendChild(note);
      el.appendChild(button("Grant access", function () {
        ctx.requestAccess({ folders: [NOTE_FOLDER] }).then(function (ok) {
          if (ok) refresh();
        });
      }));
      return;
    }

    if (!readable) {
      var missing = document.createElement("p");
      missing.style.cssText = "font-size:12px;color:var(--muted-foreground);padding:2px 2px 6px;";
      missing.textContent = "No " + NOTE_PATH + " note found yet.";
      el.appendChild(missing);
      return;
    }

    if (!lowItems.length) {
      var ok = document.createElement("p");
      ok.style.cssText = "font-size:12px;color:var(--muted-foreground);padding:2px 2px 6px;";
      ok.textContent = "Everything is at or above its reorder point.";
      el.appendChild(ok);
    } else {
      for (var i = 0; i < lowItems.length; i++) row(lowItems[i]);
    }

    var actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;padding-top:4px;";
    actions.appendChild(button("Open note", function () {
      void ctx.app.openNote(NOTE_PATH);
    }));
    if (lowItems.length) {
      actions.appendChild(button("Write reorder note", writeReorders));
    }
    el.appendChild(actions);
  }

  function refresh() {
    seq += 1;
    var mine = seq;
    ctx.fs
      .read(NOTE_PATH)
      .then(function (content) {
        if (mine !== seq) return;
        if (typeof content !== "string") {
          readable = false;
          renderStatus();
          return;
        }
        readable = true;
        cacheUsed = false;
        lowItems = parseStock(content).low;
        renderStatus();
        persist(lowItems);
      })
      .catch(function () {
        if (mine !== seq) return;
        readable = false;
        renderStatus();
      });
  }

  /* ============================ cached snapshot =========================== */

  function persist(rows) {
    var slim = rows.map(function (r) {
      return { sku: r.sku, name: r.name, qty: r.qty, min: r.min };
    });
    ctx.saveData({ items: slim, updatedAt: Date.now() }).catch(function () {});
  }

  function loadCache() {
    ctx
      .loadData()
      .then(function (data) {
        if (readable || !data || !Array.isArray(data.items)) return;
        var ok = true;
        var rows = [];
        for (var i = 0; i < data.items.length; i++) {
          var it = data.items[i];
          if (!it || typeof it.name !== "string" || !isFinite(it.qty) || !isFinite(it.min)) {
            ok = false;
            break;
          }
          rows.push({
            sku: String(it.sku != null ? it.sku : it.name),
            name: it.name,
            qty: Number(it.qty),
            min: Number(it.min),
            category: "",
            supplier: "",
          });
        }
        if (!ok || readable) return;
        cacheUsed = true;
        lowItems = rows;
        renderStatus();
      })
      .catch(function () {});
  }

  /* ============================== wiring ================================= */

  ctx.registerSidebarSection({
    id: "low-stock",
    title: "Low stock",
    icon: "Boxes",
    order: 60,
    mount: function (host) {
      sidebarEl = document.createElement("div");
      sidebarEl.style.cssText = "display:flex;flex-direction:column;gap:6px;padding:4px 2px;";
      host.appendChild(sidebarEl);
      renderStatus();
    },
    destroy: function () {
      sidebarEl = null;
    },
  });

  ctx.registerCommand({
    id: "refresh-stock",
    title: "Refresh stock check",
    icon: "RefreshCcw",
    run: function () {
      refresh();
    },
  });

  ctx.registerCommand({
    id: "open-inventory",
    title: "Open inventory note",
    icon: "Boxes",
    run: function () {
      void ctx.app.openNote(NOTE_PATH);
    },
  });

  ctx.addRibbonIcon("BellRing", "Check stock levels", function () {
    void ctx.app.openNote(NOTE_PATH);
    refresh();
  });

  ctx.registerEvent("vault-changed", function () {
    refresh();
  });
  ctx.registerEvent("active-note-changed", function () {
    refresh();
  });

  ctx.onunload = function () {
    seq += 1;
    sidebarEl = null;
    item.setText("");
  };

  refresh();
  loadCache();
})(ctx);
