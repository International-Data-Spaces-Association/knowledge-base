#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from pathlib import Path
from datetime import datetime, timezone

# Capture Markdown links: [Label](href)
MD_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
# Capture list items with optional indentation: * Something OR - Something
LIST_ITEM_RE = re.compile(r"^(\s*[*-]\s+)(.+?)\s*$")

def is_md_path(href: str) -> bool:
    href = href.strip()
    path = href.split("#", 1)[0]
    return path.lower().endswith(".md")

def normalize_href(href: str) -> str:
    """Drop anchor portion for file resolution; keep file path only."""
    return href.split("#", 1)[0].strip()

def extract_nav_entries(summary_text: str) -> list[tuple[int, str, str]]:
    """
    Extract nav entries from literate-nav style SUMMARY.md as:
      (indent_level, label, href_md)

    - Only keeps entries that point to a .md file.
    - Indent level is computed from leading whitespace to allow grouping.
    """
    entries: list[tuple[int, str, str]] = []

    for line in summary_text.splitlines():
        m = LIST_ITEM_RE.match(line)
        if not m:
            continue

        lead = m.group(1)
        content = m.group(2).strip()
        indent = len(lead) - len(lead.lstrip(" "))

        # If line contains a markdown link, use its label + href
        lm = MD_LINK_RE.search(content)
        if lm:
            label, href = lm.group(1).strip(), lm.group(2).strip()
            if is_md_path(href):
                entries.append((indent, label, normalize_href(href)))
            continue

        # If line is a plain md path, create a label from filename
        token = content.split("#", 1)[0].strip()
        if token.lower().endswith(".md"):
            label = Path(token).stem.replace("-", " ").replace("_", " ").strip().title()
            if label.lower() in {"index", "readme"}:
                label = "Overview"
            entries.append((indent, label, token))

    # De-duplicate by href while preserving order
    seen: set[str] = set()
    out: list[tuple[int, str, str]] = []
    for indent, label, href in entries:
        if href not in seen:
            seen.add(href)
            out.append((indent, label, href))
    return out

def list_all_md_files(docs_dir: Path) -> list[Path]:
    files = [p for p in docs_dir.rglob("*.md") if p.is_file()]
    return sorted(files, key=lambda p: p.as_posix().lower())

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--docs-dir", default="docs")
    ap.add_argument("--summary", default="docs/SUMMARY.md")
    ap.add_argument("--out", default="exports/knowledge-base.md")
    ap.add_argument("--title", default="Knowledge Base")
    ap.add_argument("--version", required=True)
    ap.add_argument("--append-unlisted", action="store_true",
                    help="Append markdown files not referenced in SUMMARY (scope=ALL).")
    args = ap.parse_args()

    docs_dir = Path(args.docs_dir).resolve()
    summary_path = Path(args.summary).resolve()
    out_path = Path(args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    summary_text = summary_path.read_text(encoding="utf-8", errors="ignore")
    nav_entries = extract_nav_entries(summary_text)

    # Resolve nav files in order
    nav_files: list[tuple[str, Path]] = []
    seen_paths: set[Path] = set()

    for _indent, label, rel in nav_entries:
        p = (docs_dir / rel).resolve()
        if p.exists() and p.is_file():
            # Skip SUMMARY files (not content)
            rel_lower = p.relative_to(docs_dir).as_posix().lower()
            if rel_lower == "summary.md":
                continue
            if rel_lower.startswith("external/") and rel_lower.endswith("/summary.md"):
                continue
            if p not in seen_paths:
                nav_files.append((label, p))
                seen_paths.add(p)

    # Optional: scope=ALL → append remaining .md files not listed in SUMMARY
    extras: list[Path] = []
    if args.append_unlisted:
        for p in list_all_md_files(docs_dir):
            rel_lower = p.relative_to(docs_dir).as_posix().lower()
            if rel_lower == "summary.md":
                continue
            if rel_lower.startswith("external/") and rel_lower.endswith("/summary.md"):
                continue
            if p not in seen_paths:
                extras.append(p)
                seen_paths.add(p)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    parts: list[str] = []
    parts.append("---")
    parts.append(f"title: \"{args.title}\"")
    parts.append(f"date: \"{now}\"")
    parts.append(f"version: \"{args.version}\"")
    parts.append("---")
    parts.append("")
    parts.append(f"# {args.title}")
    parts.append("")
    parts.append(f"**Version:** {args.version}  ")
    parts.append(f"**Generated:** {now}")
    parts.append("")
    parts.append("\\newpage")
    parts.append("")

    # Add nav-listed pages with human-friendly headings
    for label, p in nav_files:
        parts.append(f"# {label}")
        parts.append("")
        parts.append(p.read_text(encoding="utf-8", errors="ignore"))
        parts.append("")
        parts.append("\\newpage")
        parts.append("")

    # Append any unlisted pages without file-path headings
    if extras:
        parts.append("# Appendix")
        parts.append("")
        parts.append("The following pages exist in the repository but are not listed in the navigation summary.")
        parts.append("")
        parts.append("\\newpage")
        parts.append("")

        for p in extras:
            # Use the first heading inside the file if present; fallback to stem
            text = p.read_text(encoding="utf-8", errors="ignore")
            first_h1 = None
            for line in text.splitlines():
                if line.startswith("# "):
                    first_h1 = line[2:].strip()
                    break
            label = first_h1 or p.stem.replace("-", " ").replace("_", " ").strip().title()

            parts.append(f"# {label}")
            parts.append("")
            parts.append(text)
            parts.append("")
            parts.append("\\newpage")
            parts.append("")

    out_path.write_text("\n".join(parts), encoding="utf-8")
    print(f"[INFO] Wrote export book: {out_path}")

if __name__ == "__main__":
    main()