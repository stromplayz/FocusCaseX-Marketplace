# FocusCaseX-Marketplace (legacy mirror)

This repository exists for **one reason only**: the public site and API used to
live here, and the repo was renamed to **stromplayz/FocusCaseX** on Nov 24 2026.
GitHub Pages does **not** redirect old Pages URLs after a rename, so every
bookmark, published link and — most importantly — **every FocusCaseX app build
shipped before the rename** still points at:

```
https://stromplayz.github.io/FocusCaseX-Marketplace/...
```

To keep those installs working this repo mirrors the full **static contract
tree** of the upstream site (the things the app fetches, never a browser page):

- `catalog.json` and `releases.json` (catalog + app release feed)
- `api/core.json`, `api/registry.json` (boot core config, registry)
- `plugins/`, `capsules/`, `themes/`, `templates/`, `snippets/`, `core/` (installable bundles)

Human-facing pages (`index.html`, `404.html`) are **redirect stubs** to the
official site, and `robots.txt` blocks crawling — nothing here is meant to be
indexed or linked.

## Official site

Everything lives at **https://stromplayz.github.io/FocusCaseX** (repo
[`stromplayz/FocusCaseX`](https://github.com/stromplayz/FocusCaseX)). Please
publish links there.

## Sync

`.github/workflows/sync.yml` runs daily (and on manual dispatch): it clones the
public upstream repo, mirrors the contract tree into this repo, restores the
legacy override files (`index.html`, `404.html`, `robots.txt`, `README.md`) and
pushes if anything changed. No credentials involved — the upstream repo is
public, pushes use the built-in `GITHUB_TOKEN`.
