/**
 * FocusCaseX — Core Pages (core plugin, marketplace payload v2.4).
 *
 * CONCRETE PAGES THAT ACT AS MD FILES — the thing the vault was missing:
 * a "Pages" section in the sidebar where every page is a REAL markdown
 * file at pages/<name>.md inside the clinic folder (frontmatter title +
 * body), editable in the same editor as patient notes and openable by
 * any markdown tool.
 *
 * Pages are written through ctx.fs — the permission-gated file bridge.
 * The manifest declares `permissions.folders: ["pages"]`; the first use
 * raises a one-tap consent dialog, and the grant can be revoked from
 * Settings › Extensions. An extension cannot touch anything outside the
 * folders the clinic approved.
 *
 * Surfaces: Sidebar section (list + new page) · Command · Right-panel tab.
 */
(function (ctx) {
  "use strict";

  var FOLDER = "pages";
  var unlisten = [];

  function slugify(name) {
    return String(name || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "page";
  }

  function pageBody(title) {
    return (
      "# " + title + "\n\n" +
      "A page that lives as a real markdown file (pages/" + slugify(title) + ".md) " +
      "inside the clinic folder.\n\n" +
      "- Write anything here — clinic info, protocols, links to patients with [[wiki links]].\n" +
      "- Every change is saved straight to the folder.\n"
    );
  }

  async function ensureAccess() {
    var granted = await ctx.requestAccess();
    if (!granted) {
      ctx.showToast("Pages needs access to the pages/ folder — allow it to continue.");
      return false;
    }
    return true;
  }

  async function createPage(title) {
    if (!(await ensureAccess())) return;
    var clean = String(title || "").trim();
    if (!clean) return;
    var path = FOLDER + "/" + slugify(clean) + ".md";
    var existing = await ctx.fs.list(FOLDER);
    for (var i = 0; i < existing.length; i++) {
      if (existing[i].path === path) {
        ctx.showToast("A page with that name already exists — opening it.");
        await ctx.app.openNote(path);
        return;
      }
    }
    var ok = await ctx.fs.write(path, pageBody(clean), clean);
    if (ok) {
      await ctx.app.openNote(path);
      ctx.showToast("Page created — pages/" + slugify(clean) + ".md");
      paintList(); // refresh the list
    } else {
      ctx.showToast("Could not write the page — permission denied.");
    }
  }

  function rowClick(path) {
    return function () {
      void ctx.app.openNote(path);
    };
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  /* -------------------------------------------------------------- */
  /* stylesheet — token-driven, steps() only                           */

  var CSS = [
    "/* ---- Core Pages ---- */",
    ".fcx-pages-head{margin:0 0 .5rem;font-family:var(--font-mono);font-size:.6875rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-foreground);}",
    ".fcx-pages-toolbar{margin:0 0 .5rem;}",
    ".fcx-pages-new{width:100%;border:1px solid var(--border);background:var(--accent-live,var(--accent));color:var(--background,#fff);font-family:var(--font-mono);font-size:.6875rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:.45rem .5rem;cursor:pointer;}",
    ".fcx-pages-new:active{translate:1px 1px;}",
    ".fcx-pages-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.125rem;}",
    ".fcx-pages-row{margin:0;}",
    ".fcx-pages-link{display:flex;align-items:center;gap:.5rem;width:100%;border:0;background:transparent;padding:.3rem .375rem;text-align:left;font-size:.8125rem;color:var(--foreground);cursor:pointer;}",
    ".fcx-pages-link:hover{background:color-mix(in srgb,var(--accent-live,var(--accent)) 12%,transparent);}",
    ".fcx-pages-dot{color:var(--accent-live,var(--accent));font-size:.5rem;line-height:1;}",
    ".fcx-pages-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
    ".fcx-pages-empty{margin:0 0 .5rem;font-size:.75rem;line-height:1.45;color:var(--muted-foreground);}",
    ".fcx-pages-hint{margin:0 0 .5rem;font-size:.75rem;line-height:1.45;color:var(--muted-foreground);}",
    ".fcx-pages-count{margin:0;font-family:var(--font-mono);font-size:.6875rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent-live,var(--accent));}",
    "html.fcx-core-settings-on.fcx-core-settings-pixel .fcx-pages-section{animation:fcx-cs-pop .22s steps(3) both;}",
  ].join("\n");
  if (typeof ctx.registerCss === "function") ctx.registerCss(CSS);

  /* The sidebar section mounts through registerSidebarSection's mount()
     callback — the list re-renders itself by keeping a reference to the
     container element and re-reading ctx.fs on demand. */
  var listContainer = null;
  var toolbarNode = null;

  function paintList() {
    if (!listContainer) return;
    var box = listContainer;
    box.replaceChildren();
    /* the toolbar is part of the repaint — replaceChildren() wipes it */
    if (toolbarNode) box.appendChild(toolbarNode);
    box.appendChild(el("div", "fcx-pages-head", "Pages — real .md files in pages/"));
    void ctx.fs.list(FOLDER).then(function (items) {
      if (!listContainer || listContainer !== box) return;
      if (!items || items.length === 0) {
        box.appendChild(
          el("p", "fcx-pages-empty", "No pages yet — create the first one below. Each page is a plain markdown file the clinic folder keeps forever."),
        );
        return;
      }
      var list = el("ul", "fcx-pages-list");
      for (var i = 0; i < items.length; i++) {
        (function (item) {
          var li = el("li", "fcx-pages-row");
          var btn = el("button", "fcx-pages-link");
          btn.type = "button";
          btn.appendChild(el("span", "fcx-pages-dot", "■"));
          btn.appendChild(el("span", "fcx-pages-title", item.title || item.path));
          btn.addEventListener("click", rowClick(item.path));
          li.appendChild(btn);
          list.appendChild(li);
        })(items[i]);
      }
      box.appendChild(list);
    });
  }

  /* -------------------------------------------------------------- */
  /* registration                                                     */

  unlisten.push(
    ctx.registerSidebarSection({
      id: "pages",
      title: "Pages",
      icon: "FileText",
      order: 40,
      mount: function (box) {
        listContainer = box;
        box.className += " fcx-pages-section";
        var toolbar = el("div", "fcx-pages-toolbar");
        var newBtn = el("button", "fcx-pages-new");
        newBtn.type = "button";
        newBtn.textContent = "+ NEW PAGE";
        newBtn.addEventListener("click", function () {
          var title = window.prompt("Page title", "Clinic info");
          if (title === null) return;
          void createPage(title);
        });
        toolbar.appendChild(newBtn);
        toolbarNode = toolbar;
        box.appendChild(toolbar);
        paintList();
      },
      destroy: function () {
        listContainer = null;
        toolbarNode = null;
      },
    }),
  );

  unlisten.push(
    ctx.registerCommand({
      id: "create-page",
      title: "Pages: create a page (saved as pages/<name>.md)",
      icon: "FilePlus",
      run: function () {
        var title = window.prompt("Page title", "Clinic info");
        if (title === null) return;
        void createPage(title);
      },
    }),
  );

  unlisten.push(
    ctx.registerRightPanel({
      id: "pages-info",
      title: "Pages",
      icon: "FileText",
      order: 85,
      mount: function (box) {
        box.className += " fcx-pages-section";
        var info = el(
          "p",
          "fcx-pages-hint",
          "Pages are concrete markdown files under pages/ in the clinic folder. The Pages extension may read and write only that folder — grants are revocable in Settings › Extensions.",
        );
        box.appendChild(info);
        void ctx.fs.list(FOLDER).then(function (items) {
          box.appendChild(el("p", "fcx-pages-count", (items ? items.length : 0) + " page(s) on file"));
        });
      },
    }),
  );

  unlisten.push(
    ctx.registerEvent("vault-changed", function () {
      paintList();
    }),
  );

  ctx.onunload = function () {
    for (var i = 0; i < unlisten.length; i++) {
      try {
        unlisten[i]();
      } catch (ignored) { }
    }
    unlisten = [];
    listContainer = null;
  };
})(ctx);
