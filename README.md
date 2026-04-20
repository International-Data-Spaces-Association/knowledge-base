# knowledge-base

A standards-aware, CI-gated documentation site built with **MkDocs Material** and deployed via **GitHub Pages (Actions deployment)**. It assembles content from three IDSA repositories at build time, merges their summaries into one navigation, and enforces quality gates before publishing.

## Why this repo?

- **Single entry point** for Rulebook, RAM5, and the Organizational Handbook.
- **Consistent navigation** using a merged `SUMMARY.md`.
- **Searchable** (client-side search plugin).
- **Reliable**: markdown lint + link checks + strict build gate deployments.

## External sources (read-only during build)

1. `International-Data-Spaces-Association/IDSA-Rulebook` → `documentation/` → copied to `docs/external/rulebook/`
2. `International-Data-Spaces-Association/RAM5` → `docs/` → `docs/external/ram5/`
3. `International-Data-Spaces-Association/Glossary` → `glossary/` → `docs/external/glossary/`

> Checked out with the PAT stored in `SOURCE_REPOS_PAT`. Files are **not** committed back.

## How it works

- **CI** checks out the sources, runs `scripts/sync_external_content.py` which:
  - Copies each folder into `docs/external/...`
  - Concatenates their *summary files* (Rulebook → RAM5 → Handbook)
  - **Rewrites relative links** to the new locations
  - Writes the merged `docs/SUMMARY.md`
- MkDocs uses `mkdocs-literate-nav` to turn `SUMMARY.md` into the left navigation.
- Deployment occurs **only on `main`** and **only if** lint, link check, and build succeed.

## Local development

```bash
# Option A: Docker
docker compose up

# Option B: native
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python scripts/sync_external_content.py
mkdocs serve -a 0.0.0.0:8000
``

## Secrets

- SOURCE_REPOS_PAT: read-only PAT used exclusively to checkout the three source repos.

## Contributing

- Create feature branches off main.
- Open a PR; CI must pass (lint, linkcheck, build).
- On merge to main, the site auto-deploys via GitHub Pages (Actions deployment).

## License, Security, Privacy

- See docs/legal/license.md, docs/legal/security.md, docs/legal/privacy.md.
