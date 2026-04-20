#!/usr/bin/env python3
"""
Stage all images referenced by an export book Markdown file into a single media directory
and rewrite image links to point to that staged media.

Why:
- When many markdown pages are concatenated into one 'book.md', relative image paths like
  ./media/foo.png no longer resolve relative to their original page. Pandoc then fails
  to fetch resources and replaces images with alt text. Pandoc expects resources to be
  resolvable at conversion time. (See Pandoc manual on conversion behavior.) 

What this script does:
- Parse Markdown image links: ![alt](path)
- Resolve each referenced image by searching:
  - The directory of the original source page (tracked via a marker, if present)
  - docs/ and common roots (docs/external/*)
- Copy resolved images into exports/media/ (flat, collision-safe)
- Rewrite image paths in the book to 'media/<newname>' so Pandoc always finds them
"""

from __future__ import annotations

import argparse
import hashlib
import os
import re
import shutil
from pathlib import Path
from urllib.parse import unquote

# Markdown image patterns:
# 1) ![alt](url "title")
# 2) ![alt](url)
IMG_RE = re.compile(r"!\[([^\]]*)\]\((\S+?)(?:\s+\"[^\"]*\")?\)")

# Optional markers in the book to help resolve "current page directory"
# You can add these markers in export_book.py if you want later:
# e.g. <!-- KB-SOURCE: external/rulebook/chapter1.md -->
SRC_MARKER_RE = re.compile(r"^\s*<!--\s*KB-SOURCE:\s*(.+?)\s*-->\s*$")

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".tif", ".tiff", ".bmp"}

def safe_name(path: str) -> str:
    """Normalize a filename for staging (strip dirs, decode URL-encoding, keep extension)."""
    p = unquote(path)
    name = Path(p).name
    # Avoid weird characters; keep simple
    name = name.replace("%", "_")
    return name

def hash_suffix(data: str) -> str:
    return hashlib.sha1(data.encode("utf-8")).hexdigest()[:10]

def is_image_path(p: str) -> bool:
    p = p.split("#", 1)[0].split("?", 1)[0]
    ext = Path(p).suffix.lower()
    return ext in IMAGE_EXTS

def candidate_roots(docs_dir: Path) -> list[Path]:
    """Common roots where images may live after sync."""
    roots = [docs_dir]
    ext = docs_dir / "external"
    if ext.exists():
        roots.append(ext)
        # include each repo root under external
        for child in ext.iterdir():
            if child.is_dir():
                roots.append(child)
                # common media folders
                media = child / "media"
                if media.exists():
                    roots.append(media)
    assets = docs_dir / "assets"
    if assets.exists():
        roots.append(assets)
    return roots

def resolve_image(img_ref: str, base_dir: Path, roots: list[Path]) -> Path | None:
    """
    Try to resolve img_ref as:
    - relative to base_dir
    - relative to each candidate root
    """
    ref = unquote(img_ref)
    ref_path = Path(ref.split("#", 1)[0])
    # 1) relative to base_dir
    p1 = (base_dir / ref_path).resolve()
    if p1.exists() and p1.is_file():
        return p1
    # 2) relative to roots
    for r in roots:
        p2 = (r / ref_path).resolve()
        if p2.exists() and p2.is_file():
            return p2
    return None

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--docs-dir", default="docs", help="Docs directory (root where content is assembled).")
    ap.add_argument("--book", required=True, help="Input book markdown (generated).")
    ap.add_argument("--out-book", required=True, help="Output book markdown with rewritten image links.")
    ap.add_argument("--media-dir", required=True, help="Directory to stage images into (e.g., exports/media).")
    args = ap.parse_args()

    docs_dir = Path(args.docs_dir).resolve()
    book_path = Path(args.book).resolve()
    out_book = Path(args.out_book).resolve()
    media_dir = Path(args.media_dir).resolve()
    media_dir.mkdir(parents=True, exist_ok=True)

    roots = candidate_roots(docs_dir)

    lines = book_path.read_text(encoding="utf-8", errors="ignore").splitlines()
    out_lines = []

    # Track "current source page" base directory if markers are present
    # Default base is docs/
    current_base = docs_dir

    # Map from original resolved file -> staged filename
    staged_map: dict[Path, str] = {}

    for line in lines:
        msrc = SRC_MARKER_RE.match(line)
        if msrc:
            rel_src = msrc.group(1).strip()
            src_file = (docs_dir / rel_src).resolve()
            current_base = src_file.parent if src_file.exists() else docs_dir
            # Keep marker out of final book to avoid noise
            continue

        def replace_match(m: re.Match) -> str:
            alt = m.group(1)
            url = m.group(2)
            url_clean = url.strip().strip("<>").split("#", 1)[0]  # ignore anchor
            # Ignore non-image links
            if not is_image_path(url_clean):
                return m.group(0)

            resolved = resolve_image(url_clean, current_base, roots)
            if not resolved:
                # Leave unchanged; Pandoc will warn but at least we tried
                return m.group(0)

            # Stage file (ensure unique name)
            base_name = safe_name(url_clean)
            candidate = base_name
            target = media_dir / candidate

            if resolved in staged_map:
                candidate = staged_map[resolved]
            else:
                if target.exists():
                    # collision: add hash suffix
                    stem = Path(base_name).stem
                    ext = Path(base_name).suffix
                    candidate = f"{stem}-{hash_suffix(str(resolved))}{ext}"
                    target = media_dir / candidate
                shutil.copy2(resolved, target)
                staged_map[resolved] = candidate

            # Rewrite to relative path from out_book location (typically exports/)
            new_url = f"media/{candidate}"
            return f"![{alt}]({new_url})"

        new_line = IMG_RE.sub(replace_match, line)
        out_lines.append(new_line)

    out_book.parent.mkdir(parents=True, exist_ok=True)
    out_book.write_text("\n".join(out_lines) + "\n", encoding="utf-8")

    print(f"[INFO] Staged {len(staged_map)} images to {media_dir}")
    print(f"[INFO] Wrote rewritten book: {out_book}")

if __name__ == "__main__":
    main()