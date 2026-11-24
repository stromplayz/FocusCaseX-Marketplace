# FocusCaseX — Core Files

This folder is the **canonical home of the core layer** — the mandatory
files every FocusCaseX client loads. The app ships a copy under
`public/core/` (same-origin fallback, so the core works even when the
marketplace is unreachable), and the publish flow mirrors this folder into
the public **FocusCaseX-Marketplace** repo, where GitHub Pages serves it as
the API mediator.

## Layout

| Path | Role |
| --- | --- |
| `core.json` | The core manifest (schema `fcx.market.core.v1`): version, feature flags, the announcement, the `corePlugins` the updater pulls and the `coreCss` files it applies. |
| `core.css` | The core stylesheet layer — token-driven restyling of the default chrome (sidebar seams, launcher polish, focus rings). Applied only after a pull; scoped under `html.fcx-core-on`. |
| `plugins/core-ui/` | **Core-UI** — the default-UI customization plugin (settings, sidebar, panels, tabs) riding the same plugin + CSS system as any marketplace extension. |
| `plugins/update-v2-notifier/` | The pixel-art announcement banner (top toast) with the one-tap **Download Update** button that runs the core-updater. |
| `plugins/quick-actions-v2/` | **The v2.1 payload** — auto-enabled core plugin that completes the quick actions launcher with the clinical EMR set (`ctx.registerQuickAction`). |

## How updates flow

1. `core.json` bumps its `version` (and the announcement) here.
2. `npm run sync:marketplace` copies `core/` + every bundled plugin into the
   public marketplace repo, refreshes `api/core.json` + the registry and
   pushes — GitHub Pages redeploys automatically.
3. Clients check on boot (stale-while-revalidate): the announcement banner
   offers the update; **after the user confirms**, `core-updater.ts`
   checks → pulls → installs → enables, all at runtime. No app redeploy.

## Rules

- Versions: semver, bumped with every payload change; `updatedAt` too.
- CSS: theme tokens only (`var(--…)`), never raw hex — the layer must fit
  every theme.
- Plugins: ordinary manifests; `"core": true` marks them, `enable: true`
  in `corePlugins` auto-flips them on after a pull.
- The app's bundled copy (`public/core/`) must be refreshed whenever this
  folder changes: `cp core/core.json core/core.css public/core/ &&
  cp -r core/plugins public/core/plugins`.
