#!/usr/bin/env python3
"""
Synchronize external content from three private/public repos and generate a merged SUMMARY.md
with correctly rewritten links for the new layout under docs/external/*.

Requirements:
- Called from repo root.
- External sources are checked out by CI into:
  _sources/rulebook/ (folder to copy: documentation/)
  _sources/ram5/     (folder to copy: docs/)
  _sources/glossary/ (folder to copy: docs/)
- Generates:
  docs/external/rulebook/
  docs/external/ram5/
  docs/external/glossary/
  docs/SUMMARY.md  (via build_summary.py)
"""
import os
import shutil
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = REPO_ROOT / "docs"
EXTERNAL_DIR = DOCS_DIR / "external"
SOURCES = {
    "rulebook": {
        "src_root": REPO_ROOT / "_sources" / "rulebook" / "documentation",
        "summary_rel": "SUMMARY.md",
        "dst": EXTERNAL_DIR / "rulebook",
    },
    "ram5": {
        "src_root": REPO_ROOT / "_sources" / "ram5" / "docs",
        "summary_rel": "SUMMARY.md",
        "dst": EXTERNAL_DIR / "ram5",
    },
    "glossary": {
        "src_root": REPO_ROOT / "_sources" / "glossary" / "docs",
        "summary_rel": "SUMMARY.md",
        "dst": EXTERNAL_DIR / "glossary",
    },
}

def rm_tree(path: Path):
    if path.exists():
        shutil.rmtree(path)

def copy_tree(src: Path, dst: Path):
    if not src.exists():
        print(f"[WARN] Source not found, skipping: {src}")
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(src, dst)

def main():
    # Clean external dir to avoid stale files
    rm_tree(EXTERNAL_DIR)
    EXTERNAL_DIR.mkdir(parents=True, exist_ok=True)

    # Copy content
    summaries = []
    for key, cfg in SOURCES.items():
        src_root = cfg["src_root"]
        dst = cfg["dst"]
        print(f"[INFO] Copying {key}: {src_root} -> {dst}")
        if not src_root.exists():
            print(f"[ERROR] Missing source for {key}: {src_root}")
        else:
            copy_tree(src_root, dst)
            summ_path = src_root / cfg["summary_rel"]
            if summ_path.exists():
                summaries.append((key, src_root, summ_path))
            else:
                print(f"[WARN] Summary not found for {key}: {summ_path}")

    # Build merged SUMMARY.md (prefer literate-nav)
    cmd = ["python", str(REPO_ROOT / "scripts" / "build_summary.py")]
    # Arguments: sequence of triplets key|src_root|summary_path
    for key, src_root, summ in summaries:
        cmd.append(f"{key}|{src_root}|{summ}")
    print(f"[INFO] Generating merged SUMMARY via: {' '.join(cmd)}")
    subprocess.check_call(cmd)

    # Optional: ensure placeholder exists when no sources present
    summary_file = DOCS_DIR / "SUMMARY.md"
    if not summary_file.exists():
        summary_file.write_text(
            "# Home\n\n- [Home](index.md)\n\n# Knowledge\n\n- *(no external content available)*\n\n# About\n\n- [About](about.md)\n",
            encoding="utf-8"
        )
    print("[INFO] sync_external_content completed.")

if __name__ == "__main__":
    main()