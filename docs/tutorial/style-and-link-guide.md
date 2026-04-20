# Contributor Linking & Markdown Style Guide

> **Scope:** This guide applies to all content authored for the `knowledge-base` and the three aggregated sources (Rulebook, RAM 5, Organizational Handbook). It explains **how to link**, **how to structure Markdown**, and **what to avoid**, so your content works locally, in CI, and on GitHub Pages.

---

## 0) Why this guide?

Our site aggregates Markdown from several repositories into a single static site built with **MkDocs** and **Material for MkDocs**. MkDocs renders Markdown placed under the `docs/` directory, resolves links **relative to the current file**, and auto‑generates anchors for headings; index pages are served using directory URLs.

---

## 1) The Golden Rule for Links

> **Always link to the published runtime layout using relative Markdown links that point to real files in `docs/`.** Do **not** link to imagined destinations like `/about/` or `.html` files, and avoid GitHub “blob” URLs.

### ✅ Do

```md
external/rulebook/Rulebook_content_1.md
../ram5/RAM1.md
index.md
about.md#team
````

### ❌ Don’t

```md
/about/                # imaginary destination that breaks under subpaths
/about.html            # link to final HTML – MkDocs expects Markdown paths
https://github.com/org/repo/blob/main/docs/page.md  # GitHub UI, not our site
```

**Why:** MkDocs expects links to **source Markdown paths**; relative links remain valid in local preview, CI, and on GitHub Pages (which serves under a subpath). [\[github.com\]](https://github.com/oprypin/mkdocs-literate-nav), [\[oprypin.github.io\]](https://oprypin.github.io/mkdocs-literate-nav/index.html)

---

## 2) Cross‑Repository Linking (Runtime Contract)

During CI, content from the three source repositories is copied under:

**Use these patterns:**

* From a **knowledge base** page (e.g., `docs/index.md`) → Rulebook:

    ```md
    external/rulebook/Rulebook_content_1.md
    ```

* From a Rulebook page → RAM 5 page:

    ```md
    ../ram5/RAM1.md
    ```

* From any external page → Home:

    ```md
    ../index.md
    ```

MkDocs resolves these **relative links** and publishes the same structure to the site. [\[github.com\]](https://github.com/oprypin/mkdocs-literate-nav)

---

## 3) Anchors & Heading Links

* MkDocs auto‑generates **anchors** from headings by slugifying the text (lowercase, spaces → dashes).  

    Example: `## Trust Framework` → `#trust-framework`. You can link within the same page or cross‑page:

    ```md
    # within same page
    #trust-framework

    # cross-page
    external/ram5/RAM1.md#trust-framework
    ```

    Anchors come from headings; you can also use plugins like **mkdocs‑autorefs** to reference headings by name without paths if enabled.
    [\[github.com\]](https://github.com/oprypin/mkdocs-literate-nav), [\[squidfunk.github.io\]](https://squidfunk.github.io/mkdocs-material/blog/2026/02/18/mkdocs-2.0/)

* For long or repeated headings, keep them **unique** (or define explicit IDs/aliases when available) to avoid ambiguity. [\[squidfunk.github.io\]](https://squidfunk.github.io/mkdocs-material/blog/2026/02/18/mkdocs-2.0/)

---

## 4) Literate‑Nav & Navigation Files

We use **mkdocs‑literate‑nav** to build the left navigation from `docs/SUMMARY.md`. Do **not** hand‑edit navigation in `mkdocs.yml`. Ensure your page is included in the merged `SUMMARY.md`. Items must be **Markdown links** (or wildcards) in **nested lists**—**bare filenames** are not valid nav items. [\[deepwiki.com\]](https://deepwiki.com/mkdocs/mkdocs/5.6-customizing-themes)

**Valid (excerpt):**

```md
* Knowledge
    * Rulebook
        * external/rulebook/Rulebook_content_1.md
        * external/rulebook/Rulebook_content_2.md
```

---

## 5) Absolute vs. Relative Links

* Prefer **relative links to Markdown files** (e.g., `../index.md`, `external/rulebook/...`). This works for local builds and for GitHub Pages (subpath hosting like `/org/knowledge-base/`). [\[oprypin.github.io\]](https://oprypin.github.io/mkdocs-literate-nav/index.html)
* Avoid site‑root absolute paths (`/about`) — they break under subpaths.
* If you truly need site‑relative URLs, a plugin like **mkdocs‑site‑urls** can rewrite custom `site:` links to the correct subpath (only if we enable it). [\[squidfunk.github.io\]](https://squidfunk.github.io/mkdocs-material/upgrade/)

---

## 6) Linking Checklist (before you submit)

1. Each link points to a **real Markdown file or asset** inside `docs/` (or `docs/external/...`). [\[github.com\]](https://github.com/oprypin/mkdocs-literate-nav)
2. No `.html` or directory URLs (`/path/`) in links. [\[oprypin.github.io\]](https://oprypin.github.io/mkdocs-literate-nav/index.html)
3. Anchors match the destination heading slug; test by clicking in local preview. [\[github.com\]](https://github.com/oprypin/mkdocs-literate-nav)
4. If your page must appear in the sidebar, ensure it’s included in `SUMMARY.md` (literate‑nav). [\[deepwiki.com\]](https://deepwiki.com/mkdocs/mkdocs/5.6-customizing-themes)

---

## 7) Minimal Markdown Style Guide

### 7.1 File & Heading Hygiene

* **One `# H1` per file**; subsections use `##`, `###`, …  
    Headings become anchors—keep them short, unique, and meaningful. [\[github.com\]](https://github.com/oprypin/mkdocs-literate-nav)
* **Filenames**: lowercase, hyphenated; keep stable to avoid link churn.

### 7.2 Links

* Use standard Markdown links to **Markdown files**:

    ```md
    ../about.md
    external/handbook/Handbook.md#roles
    ```

    (MkDocs turns these into correct published URLs—avoid `.html` or `/dir/` links.) [\[github.com\]](https://github.com/oprypin/mkdocs-literate-nav), [\[oprypin.github.io\]](https://oprypin.github.io/mkdocs-literate-nav/index.html)

### 7.3 Images & Media

* Place assets near the content or in a sibling `assets/` folder and link relatively:

    ```md
    assets/architecture.svg
    ```

    MkDocs copies non‑Markdown files verbatim; relative paths remain valid post‑build. [\[github.com\]](https://github.com/oprypin/mkdocs-literate-nav)

### 7.4 Code Blocks

* Prefer fenced code blocks with language hints:
        ```bash
        mkdocs build --strict
        ```

### 7.5 Admonitions (Material)

* Use standard admonitions:

    ```md
    !!! note "Why relative links"
        Relative links remain valid locally and on Pages.
    ```

### 7.6 Accessibility & UX

* Use **descriptive link text** (avoid “here”).
* Provide **alt text** for images.
* Keep tables simple; avoid deeply nested HTML.

---

## 8) Writing Content for Aggregated Repos

When editing content **inside source repositories**, keep links **relative to the repo’s docs root** and avoid hard‑coded GitHub links. CI copies content under `external/<repo>/...`; relative links continue to work after the move. If a cross‑repo link is required, use the runtime path `external/<repo>/...` (or a valid sibling relative path like `../ram5/...`) per §2. [\[github.com\]](https://github.com/oprypin/mkdocs-literate-nav)

---

## 9) Advanced (optional): Cross‑page Heading Links without Paths

If we enable **mkdocs‑autorefs**, you can reference headings from other pages **by identifier** (the heading text) and let the plugin resolve the URL automatically. This reduces maintenance when pages move, but headings should be unique site‑wide. [\[squidfunk.github.io\]](https://squidfunk.github.io/mkdocs-material/blog/2026/02/18/mkdocs-2.0/)

---

## 10) Do’s & Don’ts (Quick Reference)

### Do

* Link to **Markdown files** with **relative paths**. [\[github.com\]](https://github.com/oprypin/mkdocs-literate-nav)
* Use anchors like `#section-title` for headings. [\[github.com\]](https://github.com/oprypin/mkdocs-literate-nav)
* Add nav entries via **literate‑nav** (lists in `SUMMARY.md`). [\[deepwiki.com\]](https://deepwiki.com/mkdocs/mkdocs/5.6-customizing-themes)
* Keep one `# H1` per page; clear and unique headings. [\[github.com\]](https://github.com/oprypin/mkdocs-literate-nav)

### Don’t

* Don’t use `/path/` or `.html` in links. [\[oprypin.github.io\]](https://oprypin.github.io/mkdocs-literate-nav/index.html)
* Don’t link to GitHub blob URLs for internal navigation.
* Don’t put **bare filenames** in nav lists—use list items with links. [\[deepwiki.com\]](https://deepwiki.com/mkdocs/mkdocs/5.6-customizing-themes)

---

## 11) Pre‑submit Checklist (add to your PR)

* [ ] All internal links are **relative** and point to files under `docs/` (or `docs/external/...`). [\[github.com\]](https://github.com/oprypin/mkdocs-literate-nav)
* [ ] Cross‑repo links use `external/<repo>/...` (or valid sibling paths).
* [ ] Anchors tested in local preview; slugs match headings. [\[github.com\]](https://github.com/oprypin/mkdocs-literate-nav)
* [ ] Page included in `SUMMARY.md` if it should appear in the left nav (literate‑nav). [\[deepwiki.com\]](https://deepwiki.com/mkdocs/mkdocs/5.6-customizing-themes)
* [ ] Images/media use relative paths and render locally. [\[github.com\]](https://github.com/oprypin/mkdocs-literate-nav)
* [ ] One `# H1` per file; properly nested headings. [\[github.com\]](https://github.com/oprypin/mkdocs-literate-nav)

---

## 12) FAQ

**Q: Can I link to `/` for home?**  
**A:** Prefer `index.md` or `../index.md`. Root‑absolute links break under GitHub Pages subpaths. [\[oprypin.github.io\]](https://oprypin.github.io/mkdocs-literate-nav/index.html)

**Q: My link to `about/` works locally but not after publish.**  
**A:** You linked to a directory URL. Link to `about.md` (MkDocs will publish with the correct URL). [\[github.com\]](https://github.com/oprypin/mkdocs-literate-nav), [\[oprypin.github.io\]](https://oprypin.github.io/mkdocs-literate-nav/index.html)

---

## 13) References

* **MkDocs – Writing your docs** (file layout, index pages, link behavior). [\[github.com\]](https://github.com/oprypin/mkdocs-literate-nav)
* **MkDocs Discussion – Link best practices** (use only relative links to real Markdown files). [\[oprypin.github.io\]](https://oprypin.github.io/mkdocs-literate-nav/index.html)
* **mkdocs‑literate‑nav** (nav from Markdown lists). [\[deepwiki.com\]](https://deepwiki.com/mkdocs/mkdocs/5.6-customizing-themes)
* **mkdocs‑autorefs** (optional cross‑page heading references). [\[squidfunk.github.io\]](https://squidfunk.github.io/mkdocs-material/blog/2026/02/18/mkdocs-2.0/)

---

### Appendix A — Working Examples

#### Cross‑repo link from Rulebook → RAM 5

See ../ram5/RAM1.md#trust-framework for the RAM view.

#### Home & About

Return to ../index.md or continue with ../about.md.

#### Image

assets/architecture.svg

#### Nav item for literate‑nav (`docs/SUMMARY.md` excerpt)

* Knowledge
  * Rulebook
    * external/rulebook/Rulebook_content_1.md

(Items must be links/wildcards in lists; headings alone are ignored.) [\[deepwiki.com\]](https://deepwiki.com/mkdocs/mkdocs/5.6-customizing-themes)
