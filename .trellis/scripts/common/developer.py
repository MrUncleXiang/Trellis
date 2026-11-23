#!/usr/bin/env python3
"""
Developer management utilities.

Provides:
    init_developer     - Initialize developer
    ensure_developer   - Ensure developer is initialized (exit if not)
    show_developer_info - Show developer information
"""

from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

from .paths import (
    DEVELOPER_HINT,
    DIR_WORKFLOW,
    DIR_WORKSPACE,
    DIR_TASKS,
    FILE_DEVELOPER,
    FILE_JOURNAL_PREFIX,
    get_repo_root,
    get_developer,
    check_developer,
)


# =============================================================================
# Developer Initialization
# =============================================================================

def init_developer(name: str, repo_root: Path | None = None) -> bool:
    """Initialize developer.

    Creates:
        - .trellis/.developer file with developer info
        - .trellis/workspace/<name>/ directory structure
        - Initial journal file and index.md

    Args:
        name: Developer name.
        repo_root: Repository root path. Defaults to auto-detected.

    Returns:
        True on success, False on error.
    """
    if not name:
        print("Error: developer name is required", file=sys.stderr)
        return False

    if repo_root is None:
        repo_root = get_repo_root()

    dev_file = repo_root / DIR_WORKFLOW / FILE_DEVELOPER
    workspace_dir = repo_root / DIR_WORKFLOW / DIR_WORKSPACE / name

    # Create .developer file
    initialized_at = datetime.now().isoformat()
    try:
        # `newline="\n"` (via open, not Path.write_text: the `newline` kwarg on
        # write_text only exists on 3.10+) keeps generated state LF-only on
        # Windows so the same repo does not flip to CRLF after init.
        with dev_file.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(f"name={name}\ninitialized_at={initialized_at}\n")
    except (OSError, IOError) as e:
        print(f"Error: Failed to create .developer file: {e}", file=sys.stderr)
        return False

    # Create workspace directory structure
    try:
        workspace_dir.mkdir(parents=True, exist_ok=True)
    except (OSError, IOError) as e:
        print(f"Error: Failed to create workspace directory: {e}", file=sys.stderr)
        return False

    # Create initial journal file
    journal_file = workspace_dir / f"{FILE_JOURNAL_PREFIX}1.md"
    if not journal_file.exists():
        today = datetime.now().strftime("%Y-%m-%d")
        journal_content = f"""# Journal - {name} (Part 1)

> AI development session journal
> Started: {today}

---

"""
        try:
            with journal_file.open("w", encoding="utf-8", newline="\n") as handle:
                handle.write(journal_content)
        except (OSError, IOError) as e:
            print(f"Error: Failed to create journal file: {e}", file=sys.stderr)
            return False

    # Create index.md with markers for auto-update
    index_file = workspace_dir / "index.md"
    if not index_file.exists():
        index_content = f"""# Workspace Index - {name}

> Journal tracking for AI development sessions.

---

## Current Status

<!-- @@@auto:current-status -->
- **Active File**: `journal-1.md`
- **Total Sessions**: 0
- **Last Active**: -
<!-- @@@/auto:current-status -->

---

## Active Documents

<!-- @@@auto:active-documents -->
| File | Lines | Status |
|------|-------|--------|
| `journal-1.md` | ~0 | Active |
<!-- @@@/auto:active-documents -->

---

## Session History

<!-- @@@auto:session-history -->
| # | Date | Title | Commits | Branch |
|---|------|-------|---------|--------|
<!-- @@@/auto:session-history -->

---

## Notes

- Sessions are appended to journal files
- New journal file created when current exceeds 2000 lines
- Use `add_session.py` to record sessions
"""
        try:
            with index_file.open("w", encoding="utf-8", newline="\n") as handle:
                handle.write(index_content)
        except (OSError, IOError) as e:
            print(f"Error: Failed to create index.md: {e}", file=sys.stderr)
            return False

    print(f"Developer initialized: {name}")
    print(f"  .developer file: {dev_file}")
    print(f"  Workspace dir: {workspace_dir}")

    return True


def ensure_developer(repo_root: Path | None = None) -> None:
    """Ensure developer is initialized, exit if not.

    Args:
        repo_root: Repository root path. Defaults to auto-detected.
    """
    if repo_root is None:
        repo_root = get_repo_root()

    if not check_developer(repo_root):
        print("Error: Developer not initialized.", file=sys.stderr)
        print(f"Run: python3 ./{DIR_WORKFLOW}/scripts/init_developer.py <your-name>", file=sys.stderr)
        print(DEVELOPER_HINT, file=sys.stderr)
        sys.exit(1)


def show_developer_info(repo_root: Path | None = None) -> None:
    """Show developer information.

    Args:
        repo_root: Repository root path. Defaults to auto-detected.
    """
    if repo_root is None:
        repo_root = get_repo_root()

    developer = get_developer(repo_root)

    if not developer:
        print("Developer: (not initialized)")
    else:
        print(f"Developer: {developer}")
        print(f"Workspace: {DIR_WORKFLOW}/{DIR_WORKSPACE}/{developer}/")
        print(f"Tasks: {DIR_WORKFLOW}/{DIR_TASKS}/")


# =============================================================================
# Main Entry (for testing)
# =============================================================================

if __name__ == "__main__":
    show_developer_info()
