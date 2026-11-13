#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Task Management Script.

Usage:
    python3 task.py create "<title>" --description "<desc>" [--slug <name>] [--assignee <dev>] [--priority P0|P1|P2|P3] [--parent <dir>] [--package <pkg>] [--no-start] [--force]
    python3 task.py add-context <dir> <file> <path> [reason] # Add jsonl entry
    python3 task.py validate <dir>              # Validate jsonl files
    python3 task.py list-context <dir>          # List jsonl entries
    python3 task.py start <dir>                 # Set active task, record current branch
    python3 task.py current [--source] [--json] # Show active task
    python3 task.py finish                      # Clear active task
    python3 task.py set-branch <dir> <branch>   # Set git branch
    python3 task.py set-base-branch <dir> <branch>  # Set PR target branch
    python3 task.py set-scope <dir> <scope>     # Set scope for PR title
    python3 task.py set-meta <dir> <key> <value>  # Set a task metadata key
    python3 task.py rename <dir> <new-slug> [--dry-run]  # Rename task + references
    python3 task.py archive <task-dir> [--skip-branch-validation]  # Archive completed task
    python3 task.py list                        # List active tasks
    python3 task.py list-archive [month]        # List archived tasks
    python3 task.py add-subtask <parent-dir> <child-dir>     # Link child to parent
    python3 task.py remove-subtask <parent-dir> <child-dir>  # Unlink child from parent
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from common.log import Colors, colored
from common.paths import (
    DEVELOPER_HINT,
    DIR_WORKFLOW,
    DIR_TASKS,
    FILE_TASK_JSON,
    get_repo_root,
    get_developer,
    get_tasks_dir,
    get_current_task,
)
from common.active_task import (
    clear_active_task,
    resolve_active_task,
    resolve_context_key,
    set_active_task,
)
from common.git import current_branch_name
from common.io import (
    describe_json_read_failure,
    read_json_checked,
    write_json,
)
from common.task_utils import resolve_task_dir, run_task_hooks
from common.tasks import iter_active_tasks, children_progress

# Import command handlers from split modules (also re-exports for plan.py compatibility)
from common.task_store import (
    cmd_create,
    cmd_rename,
    cmd_archive,
    cmd_set_branch,
    cmd_set_base_branch,
    cmd_set_scope,
    cmd_set_meta,
    cmd_add_subtask,
    cmd_remove_subtask,
)
from common.task_context import (
    cmd_add_context,
    cmd_validate,
    cmd_list_context,
    curated_entry_count,
)
from common.planning import (
    _append_change,
    _new_approval,
    basic_task_errors,
    check_current_files,
    check_planning,
    cmd_attest,
    cmd_replan,
    planning_summary,
    record_errors,
)


# =============================================================================
# Command: start / finish
# =============================================================================

def _record_start_state(
    task_json_path: Path,
    repo_root: Path,
    data: dict | None = None,
    label: str = "",
) -> bool:
    """Save the prepared start state once, then report what was written.

    The caller prepares status, approval and branch in memory and validates
    both record layers before this call. A read error means the candidate could
    not be refreshed, so nothing is written. A write failure is returned as
    False so the caller can skip pointer writes and hooks.
    """
    if data is None:
        data, reason = read_json_checked(task_json_path)
        if data is None:
            problem, hint = describe_json_read_failure(task_json_path, reason)
            print(
                colored(f"Warning: {problem}; task.json not updated.", Colors.YELLOW),
                file=sys.stderr,
            )
            print(hint, file=sys.stderr)
            return False

    applied: list[str] = []
    base_branch_conflict: str | None = None

    # Only fill an empty field: an explicit `set-branch` must survive a later
    # `start` (re-starting a task after a checkout is a normal thing to do).
    if not data.get("branch"):
        branch = current_branch_name(repo_root)
        if branch:
            data["branch"] = branch
            applied.append(f"✓ Branch recorded: {branch}{label}")
            if branch == data.get("base_branch"):
                base_branch_conflict = branch
        else:
            print(
                colored(
                    "Note: no checked-out branch (detached HEAD, or not a git "
                    "repository); task branch not recorded.",
                    Colors.YELLOW,
                ),
                file=sys.stderr,
            )

    if not write_json(task_json_path, data):
        print(
            colored(
                f"Error: Failed to save {task_json_path}; "
                "task status and approval are unchanged.",
                Colors.RED,
            ),
            file=sys.stderr,
        )
        return False

    for line in applied:
        print(colored(line, Colors.GREEN))

    if base_branch_conflict:
        # Recorded anyway — the value is true, it just cannot describe a PR.
        # Archive refuses this shape, so say so now rather than at the gate.
        print(
            colored(
                f"Warning: '{base_branch_conflict}' is also this task's base_branch; "
                "a PR cannot target its own branch, and archive will refuse it.",
                Colors.YELLOW,
            ),
            file=sys.stderr,
        )
        print(
            f"Once you branch off, run: python3 {DIR_WORKFLOW}/scripts/task.py "
            "set-branch <task> <feature-branch>",
            file=sys.stderr,
        )
    return True


def _check_start_prerequisites(
    args: argparse.Namespace,
    task_dir: Path,
    data: dict,
    task_input: str,
) -> tuple[dict | None, int]:
    """Validate the planning gate and prepare the exact start-state candidate.

    Returns (candidate, 0) when start may proceed, or (None, exit_code) with
    all diagnostics already printed. This function never writes.
    """
    status = data.get("status")
    check = check_planning(task_dir, data)
    raw_meta = data.get("meta")
    meta: dict[str, object] = raw_meta if isinstance(raw_meta, dict) else {}
    review_arg = getattr(args, "review", None)
    approval_note = getattr(args, "approval_note", None)
    approval_source = getattr(args, "approval_source", None)
    editorial_note = getattr(args, "editorial_note", None)
    confirmation_args = (review_arg, approval_note, approval_source)
    has_any_confirmation = any(value is not None for value in confirmation_args)

    if status == "completed":
        print(colored("Error: completed tasks cannot be started", Colors.RED))
        return None, 1

    if has_any_confirmation:
        missing = [
            name
            for name, value in (
                ("--review", review_arg),
                ("--approval-note", approval_note),
                ("--approval-source", approval_source),
            )
            if not isinstance(value, str) or not value.strip()
        ]
        if missing:
            print(
                colored(
                    "Error: first start needs " + ", ".join(missing) + " (non-empty)",
                    Colors.RED,
                )
            )
            return None, 1

    if editorial_note is not None and not editorial_note.strip():
        print(colored("Error: --editorial-note must be non-empty", Colors.RED))
        return None, 1

    if status in ("in_progress", "review"):
        if has_any_confirmation or editorial_note is not None:
            print(
                colored(
                    "Error: resume does not accept confirmation/editorial arguments",
                    Colors.RED,
                )
            )
            return None, 1
        if check.mode == "ready":
            return dict(data), 0
        if check.mode == "legacy_resume":
            return dict(data), 0
        for error in check.errors:
            print(colored(f"Error: {error}", Colors.RED))
        if check.mode == "drift":
            print(
                "Hint: run replan if the reviewed meaning changed; record a "
                "typo-only editorial only when it is truly non-substantive."
            )
        return None, 1

    # planning
    if check.mode == "legacy_resume":
        # Only possible for non-planning statuses; defensive.
        for error in check.errors:
            print(colored(f"Error: {error}", Colors.RED))
        return None, 1
    if check.mode == "ready":
        for error in check.errors:
            print(colored(f"Error: {error}", Colors.RED))
        return None, 1
    if check.mode == "waiting_confirmation":
        if not has_any_confirmation:
            print(
                colored(
                    "Error: planning version is waiting for explicit user confirmation",
                    Colors.RED,
                )
            )
            print(
                f"Re-run: python3 {DIR_WORKFLOW}/scripts/task.py start "
                f"{task_input} --review <id> --approval-note \"<user reply>\" "
                "--approval-source \"<where to find it>\""
            )
            return None, 1
        assert isinstance(review_arg, str) and isinstance(approval_note, str)
        assert isinstance(approval_source, str)
        if review_arg != check.review_id:
            print(
                colored(
                    f"Error: --review {review_arg} does not match the current "
                    f"review {check.review_id}",
                    Colors.RED,
                )
            )
            return None, 1
        if editorial_note is not None:
            print(
                colored(
                    "Error: --editorial-note is only valid when the reviewed files drifted",
                    Colors.RED,
                )
            )
            return None, 1
        candidate = dict(data)
        candidate_meta = dict(meta)
        candidate_meta["planningApproval"] = _new_approval(
            check.review_id or "",
            check.record_review_files,
            approval_note,
            approval_source,
        )
        candidate_meta.pop("planningReplan", None)
        candidate["meta"] = candidate_meta
        candidate["status"] = "in_progress"
        return candidate, 0

    if check.mode == "drift":
        # A drift is only repairable here when the *only* problem is current
        # file bytes and the explicit editorial note was supplied. Record
        # structure was already validated by check_planning.
        if editorial_note is None:
            for error in check.errors:
                print(colored(f"Error: {error}", Colors.RED))
            print("Hint: use --editorial-note only for non-substantive corrections.")
            return None, 1
        if not has_any_confirmation:
            print(
                colored(
                    "Error: --editorial-note also needs --review, --approval-note "
                    "and --approval-source",
                    Colors.RED,
                )
            )
            return None, 1
        assert isinstance(review_arg, str) and isinstance(approval_note, str)
        assert isinstance(approval_source, str)
        attest_value = meta.get("planningAttest")
        if not isinstance(attest_value, dict) or review_arg != attest_value.get("reviewId"):
            print(
                colored(
                    f"Error: --review {review_arg} does not match the current "
                    f"review {check.review_id}",
                    Colors.RED,
                )
            )
            return None, 1
        candidate = dict(data)
        candidate_meta = dict(meta)
        candidate_meta["planningAttest"] = _append_change(
            attest_value, check.actual_files, editorial_note
        )
        candidate_meta["planningApproval"] = _new_approval(
            str(attest_value["reviewId"]),
            dict(attest_value["reviewFiles"]),
            approval_note,
            approval_source,
        )
        candidate_meta.pop("planningReplan", None)
        candidate["meta"] = candidate_meta
        candidate["status"] = "in_progress"
        return candidate, 0

    for error in check.errors:
        print(colored(f"Error: {error}", Colors.RED))
    return None, 1


def cmd_planning_status(args: argparse.Namespace) -> int:
    """Read-only planning diagnostics (not a write or approval command)."""
    repo_root = get_repo_root()
    full_path = resolve_task_dir(args.dir, repo_root)
    if full_path is None:
        return 1
    if not full_path.is_dir():
        print(colored(f"Error: Task not found: {args.dir}", Colors.RED))
        return 1
    task_json = full_path / "task.json"
    data, reason = read_json_checked(task_json)
    if data is None:
        if args.json:
            print(json.dumps({"error": reason, "file": str(task_json)}))
        else:
            problem, hint = describe_json_read_failure(task_json, reason)
            print(colored(f"Error: {problem}", Colors.RED))
            print(hint)
        return 1
    errors = basic_task_errors(data)
    if errors:
        if args.json:
            print(json.dumps({"errors": errors}, ensure_ascii=False))
        else:
            for error in errors:
                print(colored(f"Error: {error}", Colors.RED))
        return 1
    summary = planning_summary(full_path, data)
    if args.json:
        print(json.dumps(summary, ensure_ascii=False))
        return 0
    print(f"Mode: {summary['mode']}")
    if summary["reviewId"]:
        print(f"Review: {summary['reviewId']}")
    if summary["note"]:
        print(f"Note: {summary['note']}")
    if summary["approvalSource"]:
        print(f"Approval source: {summary['approvalSource']}")
    if summary["changedFiles"]:
        print("Changed files: " + ", ".join(summary["changedFiles"]))
    for error in summary["errors"]:
        print(f"Diagnostic: {error}")
    return 0

def cmd_start(args: argparse.Namespace) -> int:
    """Set active task after the shared planning gate."""
    repo_root = get_repo_root()
    task_input = args.dir

    if not task_input:
        print(colored("Error: task directory or name required", Colors.RED))
        return 1

    full_path = resolve_task_dir(task_input, repo_root)

    if full_path is None:
        # resolve_task_dir already named the exact reason on stderr.
        return 1

    if not full_path.is_dir():
        print(colored(f"Error: Task not found: {task_input}", Colors.RED))
        print("Hint: Use task name (e.g., 'my-task') or full path (e.g., '.trellis/tasks/01-31-my-task')")
        return 1

    try:
        task_dir = full_path.relative_to(repo_root.resolve()).as_posix()
    except ValueError:
        print(colored(f"Error: Task not found: {task_input}", Colors.RED))
        print("Hint: Use task name (e.g., 'my-task') or full path (e.g., '.trellis/tasks/01-31-my-task')")
        return 1

    task_json_path = full_path / FILE_TASK_JSON
    data, reason = read_json_checked(task_json_path)
    if data is None:
        problem, hint = describe_json_read_failure(task_json_path, reason)
        print(colored(f"Error: {problem}", Colors.RED))
        print(hint)
        return 1
    shape_errors = basic_task_errors(data)
    if shape_errors:
        for error in shape_errors:
            print(colored(f"Error: {error}", Colors.RED))
        return 1

    candidate, code = _check_start_prerequisites(args, full_path, data, task_input)
    if candidate is None:
        return code

    # Context-manifest gate (#573): an empty manifest means sub-agents get
    # zero spec context. This stays after the planning gate so a missing
    # review is reported before unrelated context suggestions.
    if not getattr(args, "allow_empty_context", False):
        empty_manifests = [
            name
            for name in ("implement.jsonl", "check.jsonl")
            if curated_entry_count(full_path / name) == 0
        ]
        if empty_manifests:
            print(colored(
                f"Error: {' and '.join(empty_manifests)} "
                f"{'has' if len(empty_manifests) == 1 else 'have'} no curated entries",
                Colors.RED,
            ))
            print("Sub-agents (implement/check) would run with zero spec context.")
            print(f"  Curate:  python3 .trellis/scripts/task.py add-context {task_input} implement <path> \"<why>\"")
            print(f"  Verify:  python3 .trellis/scripts/task.py validate {task_input}")
            print("  Intentionally empty? Re-run start with --allow-empty-context")
            return 1

    # Re-read immediately before the single save. This catches a concurrent
    # record change that happened while the context gate was running; it
    # cannot eliminate a writer racing this final read.
    latest, latest_reason = read_json_checked(task_json_path)
    if latest is None:
        problem, hint = describe_json_read_failure(task_json_path, latest_reason)
        print(colored(f"Error: {problem}", Colors.RED))
        print(hint)
        return 1
    latest_errors = record_errors(latest)
    if latest_errors:
        for error in latest_errors:
            print(colored(f"Error: {error}", Colors.RED))
        return 1

    # The candidate was prepared from the record read by the gate. If the
    # record identity changed since then, stop rather than silently
    # overwriting that newer record. A changed *artifact* is handled below by
    # rechecking the candidate's own files; the editorial path intentionally
    # differs from the old attestation.
    status = data.get("status")
    data_meta = data.get("meta")
    latest_meta_value = latest.get("meta")
    original_meta: dict[str, object] = data_meta if isinstance(data_meta, dict) else {}
    latest_meta: dict[str, object] = latest_meta_value if isinstance(latest_meta_value, dict) else {}
    original_attest = original_meta.get("planningAttest")
    latest_attest = latest_meta.get("planningAttest")
    original_review = original_attest.get("reviewId") if isinstance(original_attest, dict) else None
    latest_review = latest_attest.get("reviewId") if isinstance(latest_attest, dict) else None
    if status == "planning" and original_review != latest_review:
        print(colored("Error: task.json changed while start was preparing; retry.", Colors.RED))
        return 1

    candidate["status"] = "in_progress"
    candidate_errors = record_errors(candidate)
    if candidate_errors:
        for error in candidate_errors:
            print(colored(f"Error: {error}", Colors.RED))
        return 1
    candidate_meta_value = candidate.get("meta")
    candidate_meta: dict[str, object] = candidate_meta_value if isinstance(candidate_meta_value, dict) else {}
    candidate_attest = candidate_meta.get("planningAttest")
    if isinstance(candidate_attest, dict):
        _actual, current_errors = check_current_files(
            full_path,
            candidate_attest.get("files", {}),
        )
        if current_errors:
            for error in current_errors:
                print(colored(f"Error: {error}", Colors.RED))
            return 1

    if not _record_start_state(
        task_json_path,
        repo_root,
        candidate,
        label=" (planning gate)",
    ):
        return 1

    active = None
    if resolve_context_key():
        active = set_active_task(task_dir, repo_root)
        if not active:
            print(
                colored(
                    "Error: Start was recorded, but the active-task pointer could "
                    "not be saved. No hook ran. Retry start to restore the session "
                    "pointer; do not treat this as an untracked failed start.",
                    Colors.RED,
                )
            )
            return 1
        print(colored(f"✓ Current task set to: {task_dir}", Colors.GREEN))
        print(f"Source: {active.source}")
    else:
        print(colored(
            "ℹ Session identity not available; active-task pointer not persisted "
            "this session (degraded mode).",
            Colors.YELLOW,
        ))
        print(colored(
            "Hint: run inside an AI IDE/session that exposes session identity, "
            "or set TRELLIS_CONTEXT_ID before running task.py start.",
            Colors.YELLOW,
        ))

    run_task_hooks("after_start", task_json_path, repo_root)
    return 0

def cmd_finish(args: argparse.Namespace) -> int:
    """Clear active task."""
    repo_root = get_repo_root()
    active = clear_active_task(repo_root)
    current = active.task_path

    if not current:
        print(colored("No current task set", Colors.YELLOW))
        return 0

    # Resolve task.json path before clearing
    task_json_path = repo_root / current / FILE_TASK_JSON

    print(colored(f"✓ Cleared current task (was: {current})", Colors.GREEN))
    print(f"Source: {active.source}")

    if task_json_path.is_file():
        run_task_hooks("after_finish", task_json_path, repo_root)
    return 0


def cmd_current(args: argparse.Namespace) -> int:
    """Show active task."""
    repo_root = get_repo_root()
    active = resolve_active_task(repo_root)

    if getattr(args, "json", False):
        task_obj = None
        read_error = None
        if active.task_path:
            task_json_path = repo_root / active.task_path / FILE_TASK_JSON
            data, reason = read_json_checked(task_json_path)
            if data is None:
                # Without this, a corrupt task.json emits null for every field
                # — indistinguishable from a task whose fields really are null.
                problem, hint = describe_json_read_failure(task_json_path, reason)
                read_error = {
                    "file": str(task_json_path),
                    "reason": reason,
                    "message": f"{problem}. {hint}",
                }
                data = {}
            task_obj = {
                "dir": active.task_path,
                "id": data.get("id") or data.get("name"),
                "title": data.get("title"),
                "status": data.get("status"),
                "parent": data.get("parent"),
                "children": data.get("children", []),
                "branch": data.get("branch"),
                "base_branch": data.get("base_branch"),
            }
        payload = {
            "current_task": task_obj,
            "source": active.source,
            "stale": active.stale,
        }
        # Only present when the read failed, so the healthy shape is unchanged.
        if read_error:
            payload["error"] = read_error
        print(json.dumps(payload, ensure_ascii=False))
        return 0 if active.task_path else 1

    if args.source:
        print(f"Current task: {active.task_path or '(none)'}")
        print(f"Source: {active.source}")
        if active.stale:
            print("State: stale")
        return 0 if active.task_path else 1

    if active.task_path:
        print(active.task_path)
        return 0

    return 1


# =============================================================================
# Command: list
# =============================================================================

def _display_status(t, all_statuses: dict) -> str:
    """Return the status label to show for a task in `list` output.

    A parent task's stored status stays "planning" until someone runs
    `task.py start` on the parent directly, even while its children are
    actively being worked — a misleading label for anyone scanning the
    list (#399 item 3). Show "active" instead when at least one child is
    past planning; the stored status.json value is left untouched.
    """
    if t.status == "planning" and t.children:
        child_in_flight = any(
            all_statuses.get(c) not in (None, "planning") for c in t.children
        )
        if child_in_flight:
            return "active"
    return t.status


def cmd_list(args: argparse.Namespace) -> int:
    """List active tasks."""
    repo_root = get_repo_root()
    tasks_dir = get_tasks_dir(repo_root)
    current_task = get_current_task(repo_root)
    developer = get_developer(repo_root)
    filter_mine = args.mine
    filter_status = args.status
    as_json = getattr(args, "json", False)

    # Single pass: collect all tasks via shared iterator
    all_tasks = {t.dir_name: t for t in iter_active_tasks(tasks_dir)}
    all_statuses = {name: t.status for name, t in all_tasks.items()}

    if as_json:
        if filter_mine and not developer:
            print(
                json.dumps({"error": "No developer set", "hint": DEVELOPER_HINT}),
                file=sys.stderr,
            )
            return 1

        items = []
        for dir_name in sorted(all_tasks.keys()):
            t = all_tasks[dir_name]
            if filter_mine and (t.assignee or "-") != developer:
                continue
            if filter_status and t.status != filter_status:
                continue
            items.append({
                "dir": f"{DIR_WORKFLOW}/{DIR_TASKS}/{dir_name}",
                "id": t.raw.get("id") or dir_name,
                "title": t.title,
                "status": t.status,
                "display_status": _display_status(t, all_statuses),
                "priority": t.priority,
                "assignee": t.assignee or None,
                "parent": t.parent,
                "children": list(t.children),
                "package": t.package,
            })
        print(json.dumps({"tasks": items}, ensure_ascii=False))
        return 0

    if filter_mine:
        if not developer:
            print(colored("Error: No developer set. Run init_developer.py first", Colors.RED), file=sys.stderr)
            print(DEVELOPER_HINT, file=sys.stderr)
            return 1
        print(colored(f"My tasks (assignee: {developer}):", Colors.BLUE))
    else:
        print(colored("All active tasks:", Colors.BLUE))
    print()

    # Display tasks hierarchically
    count = 0

    def _print_task(dir_name: str, indent: int = 0) -> None:
        nonlocal count
        t = all_tasks[dir_name]

        # Apply --mine filter
        if filter_mine and (t.assignee or "-") != developer:
            return

        # Apply --status filter
        if filter_status and t.status != filter_status:
            return

        relative_path = f"{DIR_WORKFLOW}/{DIR_TASKS}/{dir_name}"
        marker = ""
        if relative_path == current_task:
            marker = f" {colored('<- current', Colors.GREEN)}"

        # Children progress
        progress = children_progress(t.children, all_statuses)
        status_label = _display_status(t, all_statuses)

        # Package tag
        pkg_tag = f" @{t.package}" if t.package else ""

        prefix = "  " * indent + "  - "

        if filter_mine:
            print(f"{prefix}{dir_name}/ ({status_label}){pkg_tag}{progress}{marker}")
        else:
            print(f"{prefix}{dir_name}/ ({status_label}){pkg_tag}{progress} [{colored(t.assignee or '-', Colors.CYAN)}]{marker}")
        count += 1

        # Print children indented
        for child_name in t.children:
            if child_name in all_tasks:
                _print_task(child_name, indent + 1)

    # Display only top-level tasks: those without a parent, plus orphans
    # whose recorded parent is not (or no longer) in the active set — a
    # dangling parent ref must still render flat instead of disappearing.
    for dir_name in sorted(all_tasks.keys()):
        parent = all_tasks[dir_name].parent
        if not parent or parent not in all_tasks:
            _print_task(dir_name)

    if count == 0:
        if filter_mine:
            print("  (no tasks assigned to you)")
        else:
            print("  (no active tasks)")

    print()
    print(f"Total: {count} task(s)")
    return 0


# =============================================================================
# Command: list-archive
# =============================================================================

def cmd_list_archive(args: argparse.Namespace) -> int:
    """List archived tasks."""
    repo_root = get_repo_root()
    tasks_dir = get_tasks_dir(repo_root)
    archive_dir = tasks_dir / "archive"
    month = args.month

    print(colored("Archived tasks:", Colors.BLUE))
    print()

    if month:
        month_dir = archive_dir / month
        if month_dir.is_dir():
            print(f"[{month}]")
            for d in sorted(month_dir.iterdir()):
                if d.is_dir():
                    print(f"  - {d.name}/")
        else:
            print(f"  No archives for {month}")
    else:
        if archive_dir.is_dir():
            for month_dir in sorted(archive_dir.iterdir()):
                if month_dir.is_dir():
                    month_name = month_dir.name
                    count = sum(1 for d in month_dir.iterdir() if d.is_dir())
                    print(f"[{month_name}] - {count} task(s)")

    return 0


# =============================================================================
# Help
# =============================================================================

def show_usage() -> None:
    """Show usage help."""
    print("""Task Management Script

Usage:
  python3 task.py create <title> --description <desc>  Create new task directory (both required, non-empty)
  python3 task.py create <title> --description <desc> --package <pkg>   Create task for a specific package
  python3 task.py create <title> --description <desc> --parent <dir>    Create task as child of parent
  python3 task.py create <title> --description <desc> --no-start        Create without making it active in this session
  python3 task.py add-context <dir> <jsonl> <path> [reason]  Add entry to jsonl
  python3 task.py validate <dir>                     Validate jsonl files
  python3 task.py list-context <dir>                 List jsonl entries
  python3 task.py start <dir>                        Set active task; records the checked-out branch when unset
  python3 task.py current [--source]                 Show active task
  python3 task.py finish                             Clear active task
  python3 task.py set-branch <dir> <branch>          Set git branch
  python3 task.py set-base-branch <dir> <branch>     Set PR target branch
  python3 task.py set-scope <dir> <scope>            Set scope for PR title
  python3 task.py set-meta <dir> <key> <value>       Set/overwrite a task metadata key
  python3 task.py rename <dir> <new-slug>            Rename task, identity fields and references
  python3 task.py archive <task-dir>                 Archive completed task
  python3 task.py add-subtask <parent> <child>       Link child task to parent
  python3 task.py remove-subtask <parent> <child>    Unlink child from parent
  python3 task.py list [--mine] [--status <status>] [--json]  List tasks
  python3 task.py list-archive [YYYY-MM]             List archived tasks

Monorepo options:
  --package <pkg>      Package name (validated against config.yaml packages)

Rename options:
  --dry-run            Print the change set without writing anything

Archive options:
  --no-commit                Skip the auto git commit after archiving
  --skip-branch-validation   Archive despite missing or self-referential branch metadata.
                             Archive normally refuses a task with no `branch` when it has a
                             `base_branch` and the repo has a remote, or with
                             `branch == base_branch`; repair those with `set-branch` /
                             `set-base-branch` instead. Use this flag only for tasks that
                             were never PR-backed. A recorded branch that was merged and
                             deleted is only a warning and needs no flag.

List options:
  --mine, -m           Show only tasks assigned to current developer
  --status, -s <s>     Filter by status (planning, in_progress, review, completed)
  --json               Output machine-readable JSON (also available on `current`)

Examples:
  python3 task.py create "Add login feature" --description "Email + password sign-in" --slug add-login
  python3 task.py create "Add login feature" --description "Email + password sign-in" --slug add-login --package cli
  python3 task.py create "Add login feature" --description "Email + password sign-in" --meta linear=ENG-123 --meta epic=auth
  python3 task.py create "Child task" --description "Session cookie handling" --slug child --parent .trellis/tasks/01-21-parent
  python3 task.py add-context <dir> implement .trellis/spec/cli/backend/auth.md "Auth guidelines"
  python3 task.py set-branch <dir> task/add-login
  python3 task.py start .trellis/tasks/01-21-add-login
  python3 task.py current --source
  python3 task.py finish
  python3 task.py rename add-login add-sso --dry-run  # Preview the change set
  python3 task.py rename add-login add-sso
  python3 task.py archive add-login
  python3 task.py archive add-login --skip-branch-validation  # Task never had a branch of its own
  python3 task.py add-subtask parent-task child-task  # Link existing tasks
  python3 task.py remove-subtask parent-task child-task
  python3 task.py list                               # List all active tasks
  python3 task.py list --mine                        # List my tasks only
  python3 task.py list --mine --status in_progress   # List my in-progress tasks
""")


# =============================================================================
# Main Entry
# =============================================================================

def main() -> int:
    """CLI entry point."""
    # Deprecation guard: `init-context` was removed in v0.5.0-beta.12.
    # Detect early so argparse doesn't mask the real reason with a generic
    # "invalid choice" error.
    if len(sys.argv) >= 2 and sys.argv[1] == "init-context":
        print(
            colored(
                "Error: `task.py init-context` was removed in v0.5.0-beta.12.",
                Colors.RED,
            ),
            file=sys.stderr,
        )
        print(
            "implement.jsonl / check.jsonl are now seeded on `task.py create` for",
            file=sys.stderr,
        )
        print(
            "sub-agent-capable platforms and curated by the AI during planning when needed.",
            file=sys.stderr,
        )
        print("See .trellis/workflow.md planning artifact guidance or run:", file=sys.stderr)
        print(
            "  python3 ./.trellis/scripts/get_context.py --mode phase --step 1",
            file=sys.stderr,
        )
        print(
            "Use `task.py add-context <dir> implement|check <path> <reason>` to append entries.",
            file=sys.stderr,
        )
        return 2

    parser = argparse.ArgumentParser(
        description="Task Management Script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # create
    p_create = subparsers.add_parser("create", help="Create new task")
    p_create.add_argument("title", help="Task title (required, non-empty)")
    p_create.add_argument("--slug", "-s", help="Task slug without the MM-DD date prefix")
    p_create.add_argument("--assignee", "-a", help="Assignee developer")
    p_create.add_argument("--priority", "-p", default="P2", help="Priority (P0-P3)")
    p_create.add_argument(
        "--description",
        "-d",
        help="Task description (required, non-empty — an empty one is refused at archive)",
    )
    p_create.add_argument("--parent", help="Parent task directory (establishes subtask link)")
    p_create.add_argument("--package", help="Package name for monorepo projects")
    p_create.add_argument(
        "--base-branch",
        help="PR target branch (overrides origin/HEAD detection and the checked-out-branch fallback)",
    )
    p_create.add_argument(
        "--meta",
        action="append",
        help="Task metadata key=value (repeatable)",
    )
    p_create.add_argument(
        "--no-start",
        action="store_true",
        help="Create the task without making it active in this session",
    )
    p_create.add_argument(
        "--force",
        action="store_true",
        help="Overwrite task.json when the task directory already exists",
    )

    # add-context
    p_add = subparsers.add_parser("add-context", help="Add context entry")
    p_add.add_argument("dir", help="Task directory")
    p_add.add_argument("file", help="JSONL file (implement|check)")
    p_add.add_argument("path", help="File path to add")
    p_add.add_argument("reason", nargs="?", help="Reason for adding")

    # validate
    p_validate = subparsers.add_parser("validate", help="Validate context files")
    p_validate.add_argument("dir", help="Task directory")

    # list-context
    p_listctx = subparsers.add_parser("list-context", help="List context entries")
    p_listctx.add_argument("dir", help="Task directory")

    # start
    p_start = subparsers.add_parser("start", help="Set active task")
    p_start.add_argument("dir", help="Task directory")
    p_start.add_argument(
        "--allow-empty-context",
        action="store_true",
        help="Start even when implement.jsonl / check.jsonl have no curated entries",
    )
    p_start.add_argument("--review", help="Attested reviewId approved by the user")
    p_start.add_argument("--approval-note", help="User's approval reply (verbatim or faithful excerpt)")
    p_start.add_argument("--approval-source", help="Where the approval can be found")
    p_start.add_argument("--editorial-note", help="Non-substantive correction made after approval")

    # attest
    p_attest = subparsers.add_parser("attest", help="Attest the current planning version")
    p_attest.add_argument("dir", help="Task directory")
    p_attest.add_argument("--note", required=True, help="Why this version is ready for review")
    p_attest.add_argument("--editorial", action="store_true", help="Record a non-substantive correction")

    # replan
    p_replan = subparsers.add_parser("replan", help="Pause affected work and return to planning")
    p_replan.add_argument("dir", help="Task directory")
    p_replan.add_argument("--reason", help="What changed")
    p_replan.add_argument("--affected", help="Affected work")
    p_replan.add_argument("--independent", help="Work that can continue independently (default: none)")

    # planning-status
    p_pstatus = subparsers.add_parser("planning-status", help="Read-only planning diagnostics")
    p_pstatus.add_argument("dir", help="Task directory")
    p_pstatus.add_argument("--json", action="store_true", help="Output machine-readable JSON")

    # current
    p_current = subparsers.add_parser("current", help="Show active task")
    p_current.add_argument("--source", action="store_true",
                           help="Show active task source")
    p_current.add_argument("--json", action="store_true",
                           help="Output machine-readable JSON")

    # finish
    subparsers.add_parser("finish", help="Clear active task")

    # set-branch
    p_branch = subparsers.add_parser("set-branch", help="Set git branch")
    p_branch.add_argument("dir", help="Task directory")
    p_branch.add_argument("branch", help="Branch name")

    # set-base-branch
    p_base = subparsers.add_parser("set-base-branch", help="Set PR target branch")
    p_base.add_argument("dir", help="Task directory")
    p_base.add_argument("base_branch", help="Base branch name (PR target)")

    # set-scope
    p_scope = subparsers.add_parser("set-scope", help="Set scope")
    p_scope.add_argument("dir", help="Task directory")
    p_scope.add_argument("scope", help="Scope name")

    # set-meta
    p_setmeta = subparsers.add_parser("set-meta", help="Set/overwrite a task metadata key")
    p_setmeta.add_argument("dir", help="Task directory")
    p_setmeta.add_argument("key", help="Metadata key")
    p_setmeta.add_argument("value", help="Metadata value")

    # rename
    p_rename = subparsers.add_parser("rename", help="Rename task and its references")
    p_rename.add_argument("name", help="Task directory or name")
    p_rename.add_argument("new_slug", help="New slug without the MM-DD date prefix")
    p_rename.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the change set without writing anything",
    )

    # archive
    p_archive = subparsers.add_parser("archive", help="Archive task")
    p_archive.add_argument("name", help="Task directory or name")
    p_archive.add_argument("--no-commit", action="store_true", help="Skip auto git commit after archive")
    p_archive.add_argument(
        "--skip-branch-validation",
        action="store_true",
        help=(
            "Archive even when branch metadata is missing or self-referential "
            "(for tasks that were never PR-backed)"
        ),
    )

    # list
    p_list = subparsers.add_parser("list", help="List tasks")
    p_list.add_argument("--mine", "-m", action="store_true", help="My tasks only")
    p_list.add_argument("--status", "-s", help="Filter by status")
    p_list.add_argument("--json", action="store_true", help="Output machine-readable JSON")

    # add-subtask
    p_addsub = subparsers.add_parser("add-subtask", help="Link child task to parent")
    p_addsub.add_argument("parent_dir", help="Parent task directory")
    p_addsub.add_argument("child_dir", help="Child task directory")

    # remove-subtask
    p_rmsub = subparsers.add_parser("remove-subtask", help="Unlink child task from parent")
    p_rmsub.add_argument("parent_dir", help="Parent task directory")
    p_rmsub.add_argument("child_dir", help="Child task directory")

    # list-archive
    p_listarch = subparsers.add_parser("list-archive", help="List archived tasks")
    p_listarch.add_argument("month", nargs="?", help="Month (YYYY-MM)")

    args = parser.parse_args()

    if not args.command:
        show_usage()
        return 1

    commands = {
        "create": cmd_create,
        "add-context": cmd_add_context,
        "validate": cmd_validate,
        "list-context": cmd_list_context,
        "start": cmd_start,
        "current": cmd_current,
        "finish": cmd_finish,
        "set-branch": cmd_set_branch,
        "set-base-branch": cmd_set_base_branch,
        "set-scope": cmd_set_scope,
        "set-meta": cmd_set_meta,
        "rename": cmd_rename,
        "archive": cmd_archive,
        "add-subtask": cmd_add_subtask,
        "remove-subtask": cmd_remove_subtask,
        "list": cmd_list,
        "list-archive": cmd_list_archive,
        "attest": cmd_attest,
        "replan": cmd_replan,
        "planning-status": cmd_planning_status,
    }

    if args.command in commands:
        return commands[args.command](args)
    else:
        show_usage()
        return 1


if __name__ == "__main__":
    sys.exit(main())
