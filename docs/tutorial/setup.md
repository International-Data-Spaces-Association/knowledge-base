# Tutorial: Setup & Operations

This guide walks through the setup required to operate the `knowledge-base` site.

## 1) Create the repository

- Create a new repository named **`knowledge-base`** in your GitHub organization.
- Default branch: **`main`**.

## 2) Configure GitHub Pages

- Settings → Pages → Build and deployment: **Source: GitHub Actions** (no `gh-pages` branch).
- No custom domain.

## 3) Add secret

- Settings → Secrets and variables → Actions → **New repository secret**:
  - Name: `SOURCE_REPOS_PAT`
  - Value: a **read‑only** Personal Access Token with `repo` (read) scope that can access:
    - `International-Data-Spaces-Association/IDSA-Rulebook`
    - `International-Data-Spaces-Association/RAM5`
    - `International-Data-Spaces-Association/members-area`

> Least privilege: this PAT is used **only** for checking out the source repositories.

## 4) Branch protection (recommended)

- Protect `main` and **require status checks to pass**:
  - `Markdown Lint`
  - `Broken Link Check`
  - `Build Docs (with external sources)`

## 5) Local preview (Docker)

Then run:

```bash
docker compose up
# open http://localhost:8000
``


- To also sync external sources locally, clone them beside this repo as:
  - ../IDSA-Rulebook/, ../RAM5/, ../members-area/
- Then run:

# optional local sync (uses adjacent clones)
python scripts/sync_external_content.py
mkdocs serve -a 0.0.0.0:8000

## 6) How the nav works

- During CI, we read:

   - documentation/SUMMARY.md (Rulebook)
   - docs/summary.md (RAM5)
   - OrganizationalHandbook/summary.md (Handbook)


- We concatenate them (in that order) with H2 headings and rewrite links so they point to:
   -   external/rulebook/..., external/ram5/..., external/handbook/...

- The merged docs/SUMMARY.md drives the left navigation (via mkdocs-literate-nav).

7) Troubleshooting

- Auth errors in CI: validate SOURCE_REPOS_PAT, ensure it has access and is not from a forked PR.
- Broken links: check .lychee.toml exclusions; update external summaries or add redirects.
- MkDocs build fails: run mkdocs build --strict locally to see exact error lines.
