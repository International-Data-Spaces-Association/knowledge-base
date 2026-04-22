# Top-bar menu editor

A static admin panel for the top-bar navigation of the Knowledge Base site.
Edit visually, drag to reorder, then save as a Pull Request — no backend, no database.

## What it edits

The single file [`config/menu.json`](../config/menu.json). At CI time,
[`scripts/build_summary.py`](../scripts/build_summary.py) reads it and rebuilds
`docs/SUMMARY.md`, which `mkdocs-material`'s `navigation.tabs` feature turns into
the header tabs you see on the live site.

If `config/menu.json` is removed, the build falls back to the original hard-coded
top bar — the patch is fully backwards-compatible.

## Run the demo locally

The panel needs to be served over HTTP (so it can `fetch()` the config file
relative to the page).

```bash
# from the repo root:
python -m http.server 8000
# then open:
#   http://localhost:8000/admin/
```

## Use it

1. **Drag the `⋮⋮` handle** to reorder items (works at top level *and* inside dropdowns).
2. **+ Add top-level item** appends a new tab.
3. **Type per item:**
   - **Link** — paste a docs path (e.g. `about.md`, `downloads/index.md`) or an `https://…` URL.
   - **Dropdown (no URL)** — turns the item into a parent. Use **+ Child** to nest.
   - **External section** — only valid as a *child*. Picks one of `rulebook` / `ram5` / `glossary`
     and expands its full sub-tree from the upstream repo at build time. This is how the
     "Knowledge ▾" dropdown works today.
4. **Preview JSON** shows the exact `config/menu.json` that will be committed.
5. **Download menu.json** saves it locally without touching the repo.
6. **Save & open PR…** commits to a new branch in this repo and opens a PR.

Local edits auto-save to `localStorage` so you don't lose work on refresh.
**Reset** discards the draft and reloads the file from disk.

## How "Save & open PR" works

The browser talks directly to the GitHub REST API using a **fine-grained Personal
Access Token** that you paste into the dialog. Nothing is sent to any other server.

To create the token:

1. Go to <https://github.com/settings/personal-access-tokens/new>.
2. **Resource owner**: pick the org/user that owns the repo
   (default in the dialog: `International-Data-Spaces-Association`).
3. **Repository access**: *Only select repositories* → choose `knowledge-base`.
4. **Repository permissions**:
   - **Contents**: Read and write
   - **Pull requests**: Read and write
5. Generate, copy the `github_pat_…` value, paste into the dialog.

Tick **Remember token in this browser** to persist it in `localStorage`
(only if you trust the device — it's reversible, the **Save & open PR** dialog
is the only place that writes it).

The flow is then:

1. Read base SHA of `main`.
2. Create a new branch `menu-edit-<timestamp>`.
3. PUT the new `config/menu.json` to that branch.
4. Open a PR against `main`.

CI runs against the PR; the merged `SUMMARY.md` and the rebuilt site appear in
the build logs. Merge to deploy.

## Demo without a token

You don't need a PAT to evaluate the editor. The flow:

1. Edit visually.
2. **Preview JSON** to see exactly what would be committed.
3. **Download menu.json** to a file.
4. Drop it into `config/menu.json` and run the build script:

   ```bash
   python scripts/build_summary.py
   cat docs/SUMMARY.md     # see the regenerated nav
   ```

   The external sections will show `*(content not available)*` locally — that's
   expected, because they're only fetched in CI. The top-level structure is
   what you're verifying.

## Deploying the editor with the site

Today the editor lives at `/admin/` at the **repo root**, so it is served by
`python -m http.server` but **not** by `mkdocs build` (mkdocs only sees `docs/`).
That's intentional for now — keeps mkdocs-strict happy and avoids touching
`mkdocs.yml`. To publish the panel alongside the docs later, the simplest move is
to copy `admin/` into the built `site/` directory in the CI workflow after
`mkdocs build`.

## Files added by this feature

- `admin/` — this folder (HTML/CSS/JS, no build tools, no dependencies beyond a CDN copy of [SortableJS](https://github.com/SortableJS/Sortable)).
- `config/menu.json` — source of truth.
- `config/menu.schema.json` — JSON Schema for editor & validators.

## Files modified

- `scripts/build_summary.py` — small additive change: reads `config/menu.json`
  if present, falls back to the original hard-coded layout otherwise.
