"""Planning-artifact gate: fingerprints, record validation, and shared checks.

This module is deliberately standalone (standard library only, no imports from
task.py / task_store.py / task_context.py). `start`, `validate` and `archive`
must all use the same rules; importing a command module here would create a
cycle.

The records are audit declarations, not an identity system. They make the
reviewed version and the user's recorded approval observable; they cannot
prove that a user really approved, or that prose is semantically consistent.
"""

from __future__ import annotations

import argparse
import hashlib
import re
import sys
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .io import describe_json_read_failure, read_json_checked, write_json
from .log import Colors, colored
from .task_utils import resolve_task_dir

ARTIFACTS = ("prd.md", "design.md", "implement.md")
ARTIFACT_KEYS = frozenset(ARTIFACTS)
VALID_STATUSES = frozenset({"planning", "in_progress", "review", "completed"})

_HEX64 = re.compile(r"^[0-9a-f]{64}$")
_HEX32 = re.compile(r"^[0-9a-f]{32}$")


@dataclass
class PlanningCheck:
    """Read-only combined result of record and current-file checks."""

    mode: str
    errors: list[str] = field(default_factory=list)
    review_id: str | None = None
    note: str | None = None
    approval_note: str | None = None
    approval_source: str | None = None
    changed_files: list[str] = field(default_factory=list)
    record_review_files: dict[str, str] = field(default_factory=dict)
    actual_files: dict[str, str] = field(default_factory=dict)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _nonempty(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _valid_time(value: Any) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return parsed.tzinfo is not None and parsed.utcoffset() is not None


def _valid_files(value: Any, where: str) -> list[str]:
    if not isinstance(value, dict):
        return [f"{where}: must be an object with exactly {', '.join(ARTIFACTS)}"]
    errors: list[str] = []
    keys = set(value)
    if keys != ARTIFACT_KEYS:
        missing = [name for name in ARTIFACTS if name not in keys]
        extra = sorted(str(k) for k in keys - ARTIFACT_KEYS)
        detail = []
        if missing:
            detail.append("missing " + ", ".join(missing))
        if extra:
            detail.append("unexpected " + ", ".join(extra))
        errors.append(
            f"{where}: expected exactly {', '.join(ARTIFACTS)} ({'; '.join(detail)})"
        )
    for name in ARTIFACTS:
        if name not in value:
            continue
        digest = value[name]
        if not isinstance(digest, str) or not _HEX64.match(digest):
            errors.append(f"{where}.{name}: expected 64 lowercase hex characters")
    return errors

def basic_task_errors(data: dict) -> list[str]:
    """Validate only the task object's basic shape, without reading files."""
    if not isinstance(data, dict) or not data:
        return ["task.json: expected a non-empty JSON object"]
    errors: list[str] = []
    status = data.get("status")
    if not isinstance(status, str) or status not in VALID_STATUSES:
        errors.append(
            "task.json.status: expected one of planning, in_progress, review, completed"
        )
    if "meta" in data and not isinstance(data["meta"], dict):
        errors.append("task.json.meta: expected an object")
    return errors


def _meta(data: dict) -> dict:
    value = data.get("meta", {})
    return value if isinstance(value, dict) else {}


def artifact_fingerprints(task_dir: Path) -> tuple[dict[str, str], list[str]]:
    """Read the three planning artifacts and return canonical SHA-256 values.

    CRLF is normalized to LF before hashing. Nothing else is normalized: a BOM,
    a lone CR, trailing whitespace, or a trailing newline all change the hash.
    """
    fingerprints: dict[str, str] = {}
    errors: list[str] = []
    for name in ARTIFACTS:
        try:
            raw = (task_dir / name).read_bytes()
            text = raw.decode("utf-8")
        except (OSError, UnicodeError) as error:
            errors.append(f"{name}: unreadable UTF-8 text ({error})")
            continue
        if not text.strip():
            errors.append(f"{name}: empty or whitespace-only")
            continue
        canonical = raw.replace(b"\r\n", b"\n")
        fingerprints[name] = hashlib.sha256(canonical).hexdigest()
    return fingerprints, errors


def check_current_files(
    task_dir: Path, expected: dict[str, str]
) -> tuple[dict[str, str], list[str]]:
    """Return actual fingerprints and file-level errors against expected."""
    actual, errors = artifact_fingerprints(task_dir)
    for name in ARTIFACTS:
        if actual.get(name) != expected.get(name):
            errors.append(f"{name}: changed since it was reviewed")
    return actual, errors

def _attest_errors(value: Any, where: str) -> list[str]:
    if not isinstance(value, dict):
        return [f"{where}: must be an object"]
    errors: list[str] = []
    version = value.get("schemaVersion")
    if type(version) is not int or version != 1:
        errors.append(f"{where}.schemaVersion: expected integer 1")
    review_id = value.get("reviewId")
    if not isinstance(review_id, str) or not _HEX32.match(review_id):
        errors.append(f"{where}.reviewId: expected 32 lowercase hex characters")
    if not _valid_time(value.get("attestedAt")):
        errors.append(f"{where}.attestedAt: expected timezone-aware ISO 8601")
    if not _nonempty(value.get("note")):
        errors.append(f"{where}.note: expected a non-empty string")
    review_files = value.get("reviewFiles")
    files = value.get("files")
    errors.extend(_valid_files(review_files, f"{where}.reviewFiles"))
    errors.extend(_valid_files(files, f"{where}.files"))
    changes = value.get("editorialChanges")
    if not isinstance(changes, list):
        errors.append(f"{where}.editorialChanges: expected an array")
        changes = []

    if isinstance(review_files, dict) and isinstance(files, dict):
        previous = review_files
        for index, change in enumerate(changes):
            prefix = f"{where}.editorialChanges[{index}]"
            if not isinstance(change, dict):
                errors.append(f"{prefix}: must be an object")
                continue
            if not _valid_time(change.get("recordedAt")):
                errors.append(f"{prefix}.recordedAt: expected timezone-aware ISO 8601")
            if not _nonempty(change.get("note")):
                errors.append(f"{prefix}.note: expected a non-empty string")
            before = change.get("before")
            after = change.get("after")
            errors.extend(_valid_files(before, f"{prefix}.before"))
            errors.extend(_valid_files(after, f"{prefix}.after"))
            if isinstance(before, dict) and isinstance(previous, dict):
                if any(before.get(k) != previous.get(k) for k in ARTIFACTS):
                    errors.append(f"{prefix}.before: does not match the previous files")
            if isinstance(after, dict):
                previous = after
        if isinstance(previous, dict) and any(
            previous.get(k) != files.get(k) for k in ARTIFACTS
        ):
            errors.append(f"{where}.files: does not match the end of the editorial chain")
        if not changes and any(
            review_files.get(k) != files.get(k) for k in ARTIFACTS
        ):
            errors.append(
                f"{where}.files: differs from reviewFiles without an editorial chain"
            )
    return errors


def _approval_errors(value: Any, where: str) -> list[str]:
    if not isinstance(value, dict):
        return [f"{where}: must be an object"]
    errors: list[str] = []
    version = value.get("schemaVersion")
    if type(version) is not int or version != 1:
        errors.append(f"{where}.schemaVersion: expected integer 1")
    review_id = value.get("reviewId")
    if not isinstance(review_id, str) or not _HEX32.match(review_id):
        errors.append(f"{where}.reviewId: expected 32 lowercase hex characters")
    errors.extend(_valid_files(value.get("reviewedFiles"), f"{where}.reviewedFiles"))
    if not _valid_time(value.get("recordedAt")):
        errors.append(f"{where}.recordedAt: expected timezone-aware ISO 8601")
    if not _nonempty(value.get("note")):
        errors.append(f"{where}.note: expected a non-empty string")
    if not _nonempty(value.get("source")):
        errors.append(f"{where}.source: expected a non-empty string")
    return errors


def _replan_errors(value: Any, where: str) -> list[str]:
    if not isinstance(value, dict):
        return [f"{where}: must be an object"]
    errors: list[str] = []
    if not _valid_time(value.get("requestedAt")):
        errors.append(f"{where}.requestedAt: expected timezone-aware ISO 8601")
    for key in ("reason", "affectedWork", "independentWork"):
        if not _nonempty(value.get(key)):
            errors.append(f"{where}.{key}: expected a non-empty string")
    return errors


def record_errors(data: dict) -> list[str]:
    """Validate record shape and cross-record consistency; never read artifacts."""
    errors = basic_task_errors(data)
    if errors:
        return errors
    meta = _meta(data)
    attest = meta.get("planningAttest")
    approval = meta.get("planningApproval")
    replan = meta.get("planningReplan")

    if "planningAttest" in meta:
        errors.extend(_attest_errors(attest, "task.json.meta.planningAttest"))
    if "planningApproval" in meta:
        errors.extend(_approval_errors(approval, "task.json.meta.planningApproval"))
    if "planningReplan" in meta:
        errors.extend(_replan_errors(replan, "task.json.meta.planningReplan"))
        if data["status"] != "planning":
            errors.append("task.json.meta.planningReplan: only allowed while planning")

    if isinstance(approval, dict):
        if not isinstance(attest, dict):
            errors.append("task.json.meta.planningApproval: requires planningAttest")
        else:
            if approval.get("reviewId") != attest.get("reviewId"):
                errors.append(
                    "task.json.meta.planningApproval.reviewId: does not match planningAttest.reviewId"
                )
            reviewed = approval.get("reviewedFiles")
            review_files = attest.get("reviewFiles")
            if isinstance(reviewed, dict) and isinstance(review_files, dict):
                if any(reviewed.get(k) != review_files.get(k) for k in ARTIFACTS):
                    errors.append(
                        "task.json.meta.planningApproval.reviewedFiles: does not match planningAttest.reviewFiles"
                    )
    return errors

def _new_attest(files: dict[str, str], note: str) -> dict:
    return {
        "schemaVersion": 1,
        "reviewId": uuid.uuid4().hex,
        "attestedAt": _now(),
        "note": note.strip(),
        "reviewFiles": dict(files),
        "files": dict(files),
        "editorialChanges": [],
    }


def _new_approval(
    review_id: str, reviewed_files: dict[str, str], note: str, source: str
) -> dict:
    return {
        "schemaVersion": 1,
        "reviewId": review_id,
        "reviewedFiles": dict(reviewed_files),
        "recordedAt": _now(),
        "note": note.strip(),
        "source": source.strip(),
    }


def _append_change(attest: dict, current: dict[str, str], note: str) -> dict:
    changes = [dict(change) for change in attest["editorialChanges"]]
    changes.append(
        {
            "recordedAt": _now(),
            "note": note.strip(),
            "before": dict(attest["files"]),
            "after": dict(current),
        }
    )
    return {
        "schemaVersion": 1,
        "reviewId": attest["reviewId"],
        "attestedAt": attest["attestedAt"],
        "note": attest["note"],
        "reviewFiles": dict(attest["reviewFiles"]),
        "files": dict(current),
        "editorialChanges": changes,
    }


def _changed_files(actual: dict[str, str], attest: dict | None) -> list[str]:
    if not isinstance(attest, dict) or not isinstance(attest.get("files"), dict):
        return []
    expected = attest["files"]
    return [name for name in ARTIFACTS if actual.get(name) != expected.get(name)]


def check_planning(task_dir: Path, data: dict) -> PlanningCheck:
    """Combine record validation with current-file matching, read-only."""
    base_errors = basic_task_errors(data)
    if base_errors:
        return PlanningCheck(mode="invalid", errors=base_errors)

    meta = _meta(data)
    attest = meta.get("planningAttest")
    approval = meta.get("planningApproval")
    review_id = attest.get("reviewId") if isinstance(attest, dict) else None
    note = attest.get("note") if isinstance(attest, dict) else None
    approval_note = approval.get("note") if isinstance(approval, dict) else None
    approval_source = approval.get("source") if isinstance(approval, dict) else None
    actual, file_errors = artifact_fingerprints(task_dir)
    changed = _changed_files(actual, attest if isinstance(attest, dict) else None)
    rec_errors = record_errors(data)

    if rec_errors:
        return PlanningCheck(
            mode="invalid",
            errors=rec_errors + file_errors,
            review_id=review_id,
            note=note,
            approval_note=approval_note,
            approval_source=approval_source,
            changed_files=changed,
        )

    status = data["status"]
    if status == "completed":
        return PlanningCheck(
            mode="completed",
            review_id=review_id,
            note=note,
            approval_note=approval_note,
            approval_source=approval_source,
            changed_files=changed,
        )

    if status == "planning":
        if attest is None:
            errors = list(file_errors)
            errors.append("task.json.meta.planningAttest: missing; run attest first")
            return PlanningCheck(mode="invalid", errors=errors, changed_files=changed)
        if "planningApproval" in meta:
            return PlanningCheck(
                mode="ready",
                errors=[
                    "task.json.meta.planningApproval: approval exists while planning; repair the record"
                ],
                review_id=review_id,
                note=note,
                approval_note=approval_note,
                approval_source=approval_source,
                changed_files=changed,
            )
        if changed:
            return PlanningCheck(
                mode="drift",
                errors=[f"{name}: changed since it was reviewed" for name in changed],
                review_id=review_id,
                note=note,
                changed_files=changed,
                record_review_files=(
                    dict(attest["reviewFiles"])
                    if isinstance(attest.get("reviewFiles"), dict)
                    else {}
                ),
                actual_files=actual,
            )
        return PlanningCheck(
            mode="waiting_confirmation",
            review_id=review_id,
            note=note,
            record_review_files=(
                dict(attest["reviewFiles"])
                if isinstance(attest.get("reviewFiles"), dict)
                else {}
            ),
            actual_files=actual,
        )

    # in_progress / review
    if attest is None:
        # Legacy only when all three keys are truly absent. A key present with
        # null/bad type is a partial modern record and must not downgrade to a
        # legacy resume.
        if not any(key in meta for key in ("planningAttest", "planningApproval", "planningReplan")):
            return PlanningCheck(mode="legacy_resume")
        return PlanningCheck(
            mode="invalid",
            errors=["task.json.meta: incomplete planning records"],
            review_id=review_id,
            note=note,
            approval_note=approval_note,
            approval_source=approval_source,
            changed_files=changed,
        )
    if "planningApproval" not in meta:
        return PlanningCheck(
            mode="invalid",
            errors=["task.json.meta.planningApproval: missing"],
            review_id=review_id,
            note=note,
            changed_files=changed,
            record_review_files=(
                dict(attest["reviewFiles"])
                if isinstance(attest.get("reviewFiles"), dict)
                else {}
            ),
            actual_files=actual,
        )
    if not isinstance(approval, dict):
        return PlanningCheck(
            mode="invalid",
            errors=["task.json.meta.planningApproval: must be an object"],
            review_id=review_id,
            note=note,
            changed_files=changed,
            record_review_files=(
                dict(attest["reviewFiles"])
                if isinstance(attest.get("reviewFiles"), dict)
                else {}
            ),
            actual_files=actual,
        )
    if changed:
        return PlanningCheck(
            mode="drift",
            errors=[f"{name}: changed since it was reviewed" for name in changed],
            review_id=review_id,
            note=note,
            approval_note=approval_note,
            approval_source=approval_source,
            changed_files=changed,
            record_review_files=(
                dict(attest["reviewFiles"])
                if isinstance(attest.get("reviewFiles"), dict)
                else {}
            ),
            actual_files=actual,
        )
    return PlanningCheck(
        mode="ready",
        review_id=review_id,
        note=note,
        approval_note=approval_note,
        approval_source=approval_source,
        record_review_files=(
            dict(attest["reviewFiles"])
            if isinstance(attest.get("reviewFiles"), dict)
            else {}
        ),
        actual_files=actual,
    )

def planning_summary(task_dir: Path, data: dict) -> dict:
    """Fixed-shape, read-only status payload."""
    check = check_planning(task_dir, data)
    meta = _meta(data)
    replan = meta.get("planningReplan")
    return {
        "mode": check.mode,
        "reviewId": check.review_id,
        "note": check.note,
        "approvalNote": check.approval_note,
        "approvalSource": check.approval_source,
        "changedFiles": check.changed_files,
        "errors": check.errors,
        "replan": replan if isinstance(replan, dict) else None,
    }

def _resolve(args: argparse.Namespace) -> tuple[Path, Path, dict] | None:
    repo_root = Path.cwd().resolve()
    while repo_root != repo_root.parent and not (repo_root / ".trellis").is_dir():
        repo_root = repo_root.parent
    full_path = resolve_task_dir(args.dir, repo_root)
    if full_path is None:
        return None
    if not full_path.is_dir():
        print(colored(f"Error: Task not found: {args.dir}", Colors.RED))
        return None
    task_json = full_path / "task.json"
    data, reason = read_json_checked(task_json)
    if data is None:
        problem, hint = describe_json_read_failure(task_json, reason)
        print(colored(f"Error: {problem}", Colors.RED))
        print(hint)
        return None
    errors = basic_task_errors(data)
    if errors:
        _print_errors(errors)
        return None
    return repo_root, full_path, data


def _print_errors(errors: list[str]) -> None:
    for error in errors:
        print(colored(f"Error: {error}", Colors.RED))


def _save(task_json_path: Path, data: dict) -> bool:
    if not write_json(task_json_path, data):
        print(
            colored(
                f"Error: Failed to save {task_json_path}; task.json is unchanged.",
                Colors.RED,
            ),
            file=sys.stderr,
        )
        return False
    return True


def cmd_attest(args: argparse.Namespace) -> int:
    resolved = _resolve(args)
    if resolved is None:
        return 1
    _repo_root, task_dir, data = resolved
    status = data.get("status")
    meta = _meta(data)
    note = getattr(args, "note", "") or ""
    if not note.strip():
        print(colored("Error: --note must be non-empty", Colors.RED))
        return 1

    rec_errors = record_errors(data)
    if rec_errors:
        _print_errors(rec_errors)
        return 1

    files, file_errors = artifact_fingerprints(task_dir)
    if file_errors:
        _print_errors(file_errors)
        return 1

    if getattr(args, "editorial", False):
        if status not in ("in_progress", "review"):
            print(
                colored(
                    "Error: --editorial is only allowed for in_progress or review tasks",
                    Colors.RED,
                )
            )
            return 1
        attest = meta.get("planningAttest")
        approval = meta.get("planningApproval")
        if not isinstance(attest, dict) or not isinstance(approval, dict):
            print(
                colored(
                    "Error: --editorial requires a matching recorded approval",
                    Colors.RED,
                )
            )
            return 1
        if meta.get("planningReplan") is not None:
            print(
                colored(
                    "Error: --editorial is not allowed while planningReplan is pending",
                    Colors.RED,
                )
            )
            return 1
        if any(files.get(k) != attest["files"].get(k) for k in ARTIFACTS):
            candidate = dict(data)
            candidate_meta = dict(meta)
            candidate_meta["planningAttest"] = _append_change(attest, files, note)
            candidate["meta"] = candidate_meta
            candidate_errors = record_errors(candidate)
            _actual, current_errors = check_current_files(
                task_dir, candidate_meta["planningAttest"]["files"]
            )
            if candidate_errors or current_errors:
                _print_errors(candidate_errors + current_errors)
                return 1
            if not _save(task_dir / "task.json", candidate):
                return 1
            updated = candidate_meta["planningAttest"]
            print(
                colored(
                    f"✓ Editorial change recorded for review {updated['reviewId']}",
                    Colors.GREEN,
                )
            )
            return 0
        print("No file changes; editorial record not written.")
        return 0

    if status != "planning":
        print(
            colored(
                "Error: normal attest is only allowed while planning; run replan first.",
                Colors.RED,
            )
        )
        return 1
    approval = meta.get("planningApproval")
    if approval is not None:
        print(
            colored(
                "Error: planningApproval exists while planning; repair the record before attest.",
                Colors.RED,
            )
        )
        return 1

    candidate = dict(data)
    candidate_meta = dict(meta)
    candidate_meta["planningAttest"] = _new_attest(files, note)
    candidate_meta.pop("planningApproval", None)
    candidate["meta"] = candidate_meta
    candidate_errors = record_errors(candidate)
    if candidate_errors:
        _print_errors(candidate_errors)
        return 1
    if not _save(task_dir / "task.json", candidate):
        return 1
    attest = candidate_meta["planningAttest"]
    print(colored(f"✓ Planning version attested: {attest['reviewId']}", Colors.GREEN))
    print(f"Note: {attest['note']}")
    for name in ARTIFACTS:
        print(f"  {name}: {attest['files'][name]}")
    print("Still needs explicit user review and approval before start.")
    return 0


def cmd_replan(args: argparse.Namespace) -> int:
    resolved = _resolve(args)
    if resolved is None:
        return 1
    _repo_root, task_dir, data = resolved
    if data.get("status") not in ("in_progress", "review"):
        print(
            colored(
                "Error: replan is only allowed for in_progress or review tasks",
                Colors.RED,
            )
        )
        return 1
    rec_errors = record_errors(data)
    if rec_errors:
        _print_errors(rec_errors)
        return 1
    reason = getattr(args, "reason", "") or ""
    affected = getattr(args, "affected", "") or ""
    independent = getattr(args, "independent", None)
    if independent is None:
        independent = "none"
    if not reason.strip() or not affected.strip() or not independent.strip():
        print(
            colored(
                "Error: --reason, --affected and --independent must be non-empty",
                Colors.RED,
            )
        )
        return 1
    candidate = dict(data)
    meta = dict(_meta(data))
    meta.pop("planningAttest", None)
    meta.pop("planningApproval", None)
    meta["planningReplan"] = {
        "requestedAt": _now(),
        "reason": reason.strip(),
        "affectedWork": affected.strip(),
        "independentWork": independent.strip(),
    }
    candidate["meta"] = meta
    candidate["status"] = "planning"
    candidate_errors = record_errors(candidate)
    if candidate_errors:
        _print_errors(candidate_errors)
        return 1
    if not _save(task_dir / "task.json", candidate):
        return 1
    print(colored("✓ Task returned to planning; affected work is paused.", Colors.GREEN))
    print(f"Reason: {reason.strip()}")
    print(f"Affected: {affected.strip()}")
    print(f"Independent work: {independent.strip()}")
    return 0
