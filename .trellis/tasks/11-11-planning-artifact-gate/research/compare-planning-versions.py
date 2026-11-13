"""Compare pinned Trellis commits with identical planning-gate fixtures.

The script is a verification harness, not shipped product code. It accepts only
complete commit SHAs, exports the selected template tree from each commit, and
runs every scenario in an isolated temporary Git repository. It never executes
the historical reproduce-current-start.py script and never writes into the old
evidence directory.
"""
from __future__ import annotations

import argparse
import ast
import hashlib
import io
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
from typing import Dict, List, Optional, Tuple

ROOT = Path.cwd().resolve()
ARTIFACTS = ("prd.md", "design.md", "implement.md")
TASK_REF = ".trellis/tasks/review-case"
PYTHON_CMD = "python" if os.name == "nt" else "python3"
NODE_CMD = "node"
COMMIT_RE = re.compile(r"^[0-9a-fA-F]{40}$")
HOOK_FILE = "hook-runs.txt"
APPROVAL_NOTE = "Fixture-only confirmation for this reviewed version; not a real approval"
APPROVAL_SOURCE = "Fixture-only transcript line after the displayed version"
EDITORIAL_NOTE = "Corrected a typo only; meaning and scope are unchanged"



def git(*args: str, cwd: Optional[Path] = None) -> str:
    return subprocess.check_output(
        ["git", *args], cwd=str(cwd or ROOT), text=True,
        encoding="utf-8", errors="replace",
    ).strip()


def save(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def canonical_artifact_hash(path: Path) -> str:
    return sha256_bytes(path.read_bytes().replace(b"\r\n", b"\n"))


def artifact_hashes(task_dir: Path) -> Dict[str, str]:
    result: Dict[str, str] = {}
    for name in ARTIFACTS:
        path = task_dir / name
        if path.is_file():
            try:
                result[name] = canonical_artifact_hash(path)
            except OSError:
                pass
    return result


def read_record(task_dir: Optional[Path]) -> Tuple[Optional[dict], Optional[str]]:
    if task_dir is None:
        return None, None
    path = task_dir / "task.json"
    if not path.is_file():
        return None, "missing"
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        return None, str(error)
    return (value if isinstance(value, dict) else None,
            "not an object" if not isinstance(value, dict) else None)


def rel_posix(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def resolve_complete_commit(value: str) -> str:
    if not COMMIT_RE.match(value):
        raise ValueError("commit must be the complete 40-character SHA: " + value)
    try:
        resolved = git("rev-parse", "--verify", value + "^{commit}").lower()
        object_type = git("cat-file", "-t", resolved)
    except subprocess.CalledProcessError as error:
        raise ValueError("not a complete commit: " + value) from error
    if object_type != "commit" or resolved != value.lower():
        raise ValueError("not a complete commit: " + value)
    return resolved


def commit_path_exists(commit: str, path: str) -> bool:
    result = subprocess.run(
        ["git", "cat-file", "-e", commit + ":" + path], cwd=str(ROOT),
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    return result.returncode == 0


def marketplace_record(commit: str) -> dict:
    try:
        line = git("ls-tree", commit, "--", "marketplace")
    except subprocess.CalledProcessError:
        return {"path": "marketplace", "present": False}
    if not line:
        return {"path": "marketplace", "present": False}
    parts = line.split("\t", 1)
    fields = parts[0].split()
    return {
        "path": "marketplace", "present": True,
        "mode": fields[0] if fields else None,
        "type": fields[1] if len(fields) > 1 else None,
        "commit": fields[2] if len(fields) > 2 else None,
        "raw": line,
    }


def export_templates(commit: str, destination: Path) -> Path:
    raw = subprocess.check_output(
        ["git", "archive", commit, "packages/cli/src/templates"], cwd=str(ROOT)
    )
    destination.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(raw), mode="r:") as archive:
        for member in archive.getmembers():
            target = (destination / member.name).resolve()
            try:
                target.relative_to(destination.resolve())
            except ValueError as error:
                raise RuntimeError("unsafe git archive member: " + member.name) from error
            if not (member.isfile() or member.isdir()):
                raise RuntimeError("unsupported git archive member: " + member.name)
        archive.extractall(destination)
    return destination / "packages/cli/src/templates"


def historical_cases() -> List[dict]:
    path = Path(__file__).with_name("reproduce-current-start.py")
    tree = ast.parse(path.read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(
            isinstance(target, ast.Name) and target.id == "cases" for target in node.targets
        ):
            value = ast.literal_eval(node.value)
            if isinstance(value, list):
                return value
    raise RuntimeError("historical cases assignment is missing")


def base_environment() -> Dict[str, str]:
    names = {
        "PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "PATHEXT", "COMSPEC",
        "HOME", "USERPROFILE", "HOMEDRIVE", "HOMEPATH", "APPDATA", "LOCALAPPDATA",
        "PROGRAMFILES", "PROGRAMFILES(X86)", "PROGRAMDATA",
    }
    env = {key: value for key, value in os.environ.items() if key.upper() in names}
    env.update({
        "TRELLIS_DEVELOPER": "review-fixture",
        "PYTHONIOENCODING": "utf-8",
        "PYTHONDONTWRITEBYTECODE": "1",
    })
    return env


def command_environment_keys(env: Dict[str, str]) -> List[str]:
    return sorted(env.keys())


def run_version_probe(argv: List[str], cwd: Path, env: Dict[str, str]) -> dict:
    result = subprocess.run(
        argv, cwd=str(cwd), env=env, capture_output=True, text=True,
        encoding="utf-8", errors="replace", timeout=30,
    )
    return {"argv": argv, "exit": result.returncode,
            "stdout": result.stdout, "stderr": result.stderr}


def environment_report(work: Path, commits: Dict[str, str]) -> dict:
    env = base_environment()
    tools: Dict[str, object] = {}
    for name, argv in (
        ("python", [PYTHON_CMD, "--version"]),
        ("node", [NODE_CMD, "--version"]),
        ("pnpm", ([os.environ.get("COMSPEC", "cmd.exe"), "/d", "/c", "pnpm --version"] if os.name == "nt" else ["pnpm", "--version"])),
        ("git", ["git", "--version"]),
    ):
        try:
            tools[name] = run_version_probe(argv, ROOT, env)
        except (OSError, subprocess.SubprocessError) as error:
            tools[name] = {"argv": argv, "exit": None, "stdout": "",
                           "stderr": type(error).__name__ + ": " + str(error)}
    return {
        "executionStatus": "running", "commits": commits,
        "marketplace": {label: marketplace_record(sha) for label, sha in commits.items()},
        "platform": platform.platform(),
        "pythonRuntime": {"version": sys.version, "executable": sys.executable,
                          "implementation": platform.python_implementation()},
        "tools": tools, "environmentKeys": command_environment_keys(env),
        "fixtureRoot": str(work),
        "scope": "Pinned committed template trees only. Every version gets a separate "
                 "temporary Git repository. Timings are observational only.",
        "sensitiveValuesStored": False,
    }


def fixture_files(case: dict) -> Dict[str, str]:
    files: Dict[str, str] = {}
    if case.get("files") == "prd":
        files["prd.md"] = "# Requirement\nChange a local prompt only.\n"
    elif case.get("files") in ("empty", "all"):
        for name in ARTIFACTS:
            files[name] = "" if case["files"] == "empty" else (
                "# " + name + "\nKeep storage local.\n"
            )
    return files


def make_initial_record(case: dict, task_dir: Path) -> dict:
    record: Dict[str, object] = {
        "id": "review-case", "name": "review-case", "title": "Fixture",
        "description": "Review only", "status": case.get("status", "planning"),
        "branch": None, "base_branch": None,
        "unknownTop": "preserve", "meta": {"other": {"keep": True}},
    }
    if case.get("command") == "archive":
        record["branch"] = "compare-feature"
        record["base_branch"] = "main"
    elif case.get("modern_record") or case.get("seed_record") or case.get("status") in ("in_progress", "review"):
        record["branch"] = "compare-feature"
    if case.get("seed_record"):
        files = artifact_hashes(task_dir)
        review_id = "c" * 32
        timestamp = "2026-11-12T12:00:00+00:00"
        meta = record["meta"]
        assert isinstance(meta, dict)
        meta["planningAttest"] = {
            "schemaVersion": 1, "reviewId": review_id, "attestedAt": timestamp,
            "note": "Fixture planning version under review",
            "reviewFiles": files, "files": files, "editorialChanges": [],
        }
        meta["planningApproval"] = {
            "schemaVersion": 1, "reviewId": review_id, "reviewedFiles": files,
            "recordedAt": timestamp, "note": APPROVAL_NOTE, "source": APPROVAL_SOURCE,
        }
    return record


def seed_pointer(repo: Path, context_id: str) -> None:
    sessions = repo / ".trellis/.runtime/sessions"
    sessions.mkdir(parents=True, exist_ok=True)
    (sessions / (context_id + ".json")).write_text(
        json.dumps({"current_task": TASK_REF, "platform": "codex"}, indent=2) + "\n",
        encoding="utf-8",
    )


def locate_task(repo: Path, preferred: Optional[str]) -> Optional[str]:
    if preferred:
        candidate = repo / preferred
        if candidate.is_dir():
            return preferred
    active = repo / ".trellis/tasks"
    if active.is_dir():
        direct = [p for p in active.iterdir() if p.is_dir() and p.name != "archive"]
        named = [p for p in direct if p.name == "review-case" or "review-planning" in p.name]
        if len(named) == 1:
            return rel_posix(named[0], repo)
    archive = active / "archive"
    if archive.is_dir():
        archived = [p for p in archive.glob("*/*") if p.is_dir()]
        if len(archived) == 1:
            return rel_posix(archived[0], repo)
    return None


def snapshot(repo: Path, task_ref: Optional[str]) -> dict:
    actual_ref = locate_task(repo, task_ref)
    task_dir = repo / actual_ref if actual_ref else None
    file_hashes: Dict[str, str] = {}
    if task_dir and task_dir.is_dir():
        for path in sorted(task_dir.rglob("*")):
            if path.is_file():
                file_hashes[rel_posix(path, task_dir)] = sha256_file(path)
    record, record_error = read_record(task_dir)
    pointers = []
    sessions = repo / ".trellis/.runtime/sessions"
    if sessions.is_dir():
        for path in sorted(sessions.glob("*.json")):
            parsed = None
            parse_error = None
            try:
                parsed = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, ValueError) as error:
                parse_error = str(error)
            pointers.append({"file": path.name, "sha256": sha256_file(path),
                             "record": parsed, "parseError": parse_error})
    branch = ""
    head = ""
    status_porcelain = ""
    try:
        branch = git("rev-parse", "--abbrev-ref", "HEAD", cwd=repo)
        head = git("rev-parse", "HEAD", cwd=repo)
        status_porcelain = git("status", "--porcelain", cwd=repo)
    except subprocess.CalledProcessError:
        pass
    hook_path = repo / HOOK_FILE
    hook_text = hook_path.read_text(encoding="utf-8") if hook_path.is_file() else ""
    return {
        "taskRef": actual_ref, "taskPath": str(task_dir) if task_dir else None,
        "fileHashes": file_hashes, "record": record, "recordError": record_error,
        "taskStatus": (record or {}).get("status") if record else ("corrupt" if record_error else None),
        "sessionPointers": pointers,
        "activePointers": [p.get("record", {}).get("current_task") for p in pointers
                           if isinstance(p.get("record"), dict) and p["record"].get("current_task")],
        "gitBranch": branch, "gitHead": head, "gitStatusPorcelain": status_porcelain,
        "hookRuns": {"file": HOOK_FILE,
                     "sha256": sha256_file(hook_path) if hook_path.is_file() else None,
                     "text": hook_text,
                     "counts": {event: hook_text.count(event)
                                for event in ("after_start", "after_archive")}},
    }


def active_pointer_count(state: dict) -> int:
    return len(state.get("activePointers") or [])


def hook_count(state: dict, event: str) -> int:
    return int(((state.get("hookRuns") or {}).get("counts") or {}).get(event, 0))


def task_file_hash(state: dict, name: str = "task.json") -> Optional[str]:
    return (state.get("fileHashes") or {}).get(name)


def record_meta(state: dict) -> dict:
    record = state.get("record") or {}
    meta = record.get("meta")
    return meta if isinstance(meta, dict) else {}


class Recorder:
    def __init__(self, label: str, repo: Path, task_ref: Optional[str], env: Dict[str, str]):
        self.label = label
        self.repo = repo
        self.task_ref = task_ref
        self.env = env
        self.steps: List[dict] = []

    def state(self) -> dict:
        state = snapshot(self.repo, self.task_ref)
        if state.get("taskRef"):
            self.task_ref = state["taskRef"]
        return state

    def run(self, label: str, argv: List[str], expected_exit: Optional[int] = None,
            input_text: Optional[str] = None, timeout: int = 60) -> dict:
        before = self.state()
        started = time.perf_counter()
        launch_error = None
        try:
            result = subprocess.run(
                argv, cwd=str(self.repo), env=self.env, input=input_text,
                capture_output=True, text=True, encoding="utf-8",
                errors="replace", timeout=timeout,
            )
            exit_code, stdout, stderr = result.returncode, result.stdout, result.stderr
        except (OSError, subprocess.SubprocessError) as error:
            exit_code, stdout = None, ""
            stderr = type(error).__name__ + ": " + str(error)
            launch_error = stderr
        after = self.state()
        step = {
            "kind": "command", "label": label, "argv": argv,
            "environmentKeys": command_environment_keys(self.env),
            "exit": exit_code, "expectedExit": expected_exit,
            "stdout": stdout, "stderr": stderr, "launchError": launch_error,
            "seconds": round(time.perf_counter() - started, 6),
            "before": before, "after": after,
        }
        self.steps.append(step)
        return step

    def command(self, label: str, args: List[str], expected_exit: Optional[int] = None) -> dict:
        return self.run(label, [PYTHON_CMD, ".trellis/scripts/task.py", *args], expected_exit)

    def edit(self, label: str, changes: Dict[str, str]) -> dict:
        before = self.state()
        task_ref = before.get("taskRef")
        if not task_ref:
            raise RuntimeError("cannot edit a fixture before its task exists")
        task_dir = self.repo / task_ref
        hash_before = {name: canonical_artifact_hash(task_dir / name) if (task_dir / name).is_file() else None for name in changes}
        file_before = {
            name: (task_dir / name).read_text(encoding="utf-8") if (task_dir / name).is_file() else None
            for name in changes
        }
        for name, content in changes.items():
            (task_dir / name).write_text(content, encoding="utf-8")
        after = self.state()
        step = {
            "kind": "fixture-edit", "label": label, "argv": None,
            "environmentKeys": [], "exit": 0, "expectedExit": 0,
            "stdout": "", "stderr": "", "launchError": None, "seconds": 0,
            "before": before, "after": after,
            "changes": {name: {"beforeText": file_before[name], "afterText": changes[name],
                               "beforeHash": hash_before[name],
                               "afterHash": canonical_artifact_hash(task_dir / name)}
                        for name in changes},
        }
        self.steps.append(step)
        return step

    def finalize(self) -> dict:
        return self.state()


def make_fixture(base: Path, templates: Path, case: dict, suffix: str = "") -> Tuple[Path, str, Dict[str, str]]:
    case_id = case.get("id", "case") + suffix
    repo = base / case_id
    (repo / ".trellis/tasks").mkdir(parents=True)
    shutil.copytree(templates / "trellis/scripts", repo / ".trellis/scripts")
    shutil.copyfile(templates / "trellis/workflow.md", repo / ".trellis/workflow.md")
    (repo / ".trellis/spec").mkdir()
    (repo / ".trellis/spec/review.md").write_text(
        "# Fixture spec\nDo not change product files.\n", encoding="utf-8"
    )
    hook_script = (
        "from pathlib import Path\nimport sys\n"
        "event = sys.argv[1] if len(sys.argv) > 1 else 'hook'\n"
        "p = Path('hook-runs.txt')\n"
        "with p.open('a', encoding='utf-8') as f:\n"
        "    f.write(event + '\\n')\n"
    )
    (repo / "fixture-hook.py").write_text(hook_script, encoding="utf-8")
    (repo / ".trellis/config.yaml").write_text(
        "session_auto_commit: false\nhooks:\n  after_start:\n"
        "    - '\"" + PYTHON_CMD + "\" fixture-hook.py after_start'\n"
        "  after_archive:\n"
        "    - '\"" + PYTHON_CMD + "\" fixture-hook.py after_archive'\n",
        encoding="utf-8",
    )
    subprocess.run(["git", "init", "-q", "-b", "compare-feature"], cwd=str(repo), check=True)
    env = base_environment()
    if not case.get("no_session"):
        env["TRELLIS_CONTEXT_ID"] = "review-" + case_id
    task_dir = repo / TASK_REF
    if case.get("command") != "create":
        task_dir.mkdir()
        for name, content in fixture_files(case).items():
            (task_dir / name).write_text(content, encoding="utf-8")
        if case.get("manifests") is not None:
            for name in ("implement.jsonl", "check.jsonl"):
                content = "" if case["manifests"] == "empty" else (
                    json.dumps({"file": ".trellis/spec/review.md", "reason": "Fixture contract"}) + "\n"
                )
                (task_dir / name).write_text(content, encoding="utf-8")
        if case.get("status") == "corrupt":
            (task_dir / "task.json").write_text("{ not valid json", encoding="utf-8")
        else:
            record = make_initial_record(case, task_dir)
            (task_dir / "task.json").write_text(
                json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
        if case.get("seed_pointer") and not case.get("no_session"):
            seed_pointer(repo, env["TRELLIS_CONTEXT_ID"])
    subprocess.run(["git", "add", "-A"], cwd=str(repo), check=True)
    subprocess.run(
        ["git", "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid",
         "commit", "-qm", "fixture"], cwd=str(repo), check=True,
    )
    return repo, TASK_REF, env



def assertion(assertions: List[dict], name: str, passed: bool, expected: object, actual: object) -> None:
    assertions.append({"name": name, "passed": bool(passed), "expected": expected, "actual": actual})


def step_by_label(recorder: Recorder, label: str) -> Optional[dict]:
    for step in recorder.steps:
        if step.get("label") == label:
            return step
    return None


def capability_absent(step: dict, version_label: str) -> bool:
    if version_label != "before" or step.get("exit") != 2:
        return False
    text = (step.get("stderr") or "").lower()
    return "invalid choice" in text or "unrecognized arguments" in text


def final_record(recorder: Recorder) -> dict:
    return recorder.finalize().get("record") or {}


def finish_row(case: dict, label: str, recorder: Recorder, assertions: List[dict],
               classification: str = "executed") -> dict:
    final = recorder.finalize()
    for step in recorder.steps:
        if step.get("expectedExit") is not None:
            assertion(assertions, "exit-" + step["label"], step.get("exit") == step["expectedExit"], step["expectedExit"], step.get("exit"))
    return {
        "id": None, "scenario": case.get("id"), "version": label,
        "fixture": case, "environmentKeys": sorted(recorder.env.keys()),
        "initial": recorder.steps[0]["before"] if recorder.steps else final,
        "steps": recorder.steps, "final": final, "assertions": assertions,
        "expectationMatched": bool(assertions) and all(item["passed"] for item in assertions),
        "classification": classification, "capabilityAbsentAt": None,
    }


def common_expectations(case_id: str) -> Dict[str, dict]:
    table = {
        "prd-only-no-manifests": {
            "before": {"firstExit": 0, "finalStatus": "in_progress", "pointers": 1},
            "after": {"firstExit": 1, "finalStatus": "planning", "pointers": 0, "afterStartHooks": 0},
            "category": "预期改善", "reason": "旧版允许只有需求初稿的无确认开工；新版要求三份材料和声明。"},
        "missing-prd-curated": {
            "before": {"firstExit": 0, "finalStatus": "in_progress", "pointers": 1},
            "after": {"firstExit": 1, "finalStatus": "planning", "pointers": 0, "afterStartHooks": 0},
            "category": "预期改善", "reason": "旧版缺 prd.md 仍可开工；新版在副作用前拒绝。"},
        "three-empty-files-curated": {
            "before": {"firstExit": 0, "finalStatus": "in_progress", "pointers": 1},
            "after": {"firstExit": 1, "finalStatus": "planning", "pointers": 0, "afterStartHooks": 0},
            "category": "预期改善", "reason": "旧版空文件仍可开工；新版检查最低文本条件。"},
        "empty-manifests": {
            "before": {"firstExit": 1, "finalStatus": "planning", "pointers": 0},
            "after": {"firstExit": 1, "finalStatus": "planning", "pointers": 0},
            "category": "保留", "reason": "两版都拒绝；新版拒绝原因更早落在规划声明门禁。"},
        "empty-manifests-explicit-bypass": {
            "before": {"firstExit": 0, "finalStatus": "in_progress", "pointers": 1},
            "after": {"firstExit": 1, "finalStatus": "planning", "pointers": 0},
            "category": "明确行为变更", "reason": "--allow-empty-context 只控制上下文清单，不能绕过规划门禁。"},
        "corrupt-task-json": {
            "before": {"firstExit": 0, "pointers": 1},
            "after": {"firstExit": 1, "pointers": 0, "afterStartHooks": 0},
            "category": "明确行为变更", "reason": "损坏记录从旧版成功开工改为新版明确拒绝。"},
        "no-session-identity": {
            "before": {"firstExit": 0, "finalStatus": "in_progress", "pointers": 0},
            "after": {"firstExit": 1, "finalStatus": "planning", "pointers": 0},
            "category": "预期改善", "reason": "无会话身份只是定位降级，不是规划门禁降级。"},
        "resume-in-progress-empty-manifests": {
            "before": {"firstExit": 1, "finalStatus": "in_progress", "pointers": 0},
            "after": {"firstExit": 1, "finalStatus": "in_progress", "pointers": 0},
            "category": "保留", "reason": "旧任务空上下文清单仍被拒绝；未要求历史任务补规划记录。"},
        "validate-no-planning-files": {
            "before": {"firstExit": 0, "finalStatus": "planning", "pointers": 0},
            "after": {"firstExit": 1, "finalStatus": "planning", "pointers": 0},
            "category": "明确行为变更", "reason": "validate 现在也能报告缺失/不完整的规划记录。"},
        "create-targets-planning": {
            "before": {"firstExit": 0, "finalStatus": "planning", "pointers": 1},
            "after": {"firstExit": 0, "finalStatus": "planning", "pointers": 1},
            "category": "保留", "reason": "create 仍只定位到 planning，不生成空设计或空计划。"},
    }
    return table[case_id]


def evaluate_common(case: dict, label: str, recorder: Recorder) -> List[dict]:
    expected = common_expectations(case["id"])[label]
    first = recorder.steps[0]
    final = recorder.finalize()
    actual = {
        "firstExit": first.get("exit"), "finalStatus": final.get("taskStatus"),
        "pointers": active_pointer_count(final),
        "afterStartHooks": hook_count(final, "after_start"),
    }
    assertions: List[dict] = []
    for key, value in expected.items():
        if key in actual:
            assertion(assertions, key, actual[key] == value, value, actual[key])
    if case["id"] == "create-targets-planning":
        files = final.get("fileHashes") or {}
        assertion(assertions, "no-empty-design-generated", "design.md" not in files, False, "design.md" in files)
        assertion(assertions, "no-empty-plan-generated", "implement.md" not in files, False, "implement.md" in files)
    return assertions


def approval_args(record: dict) -> List[str]:
    meta = record.get("meta") if isinstance(record.get("meta"), dict) else {}
    attest = meta.get("planningAttest") if isinstance(meta.get("planningAttest"), dict) else {}
    review_id = attest.get("reviewId")
    if not isinstance(review_id, str) or not review_id:
        raise RuntimeError("current record has no planningAttest.reviewId")
    return ["--review", review_id, "--approval-note", APPROVAL_NOTE,
            "--approval-source", APPROVAL_SOURCE]


def row_for_capability_absent(case: dict, label: str, recorder: Recorder, step: dict) -> dict:
    # Unsupported old commands are an observed capability gap, not a failed
    # expectation that a command absent from that version should succeed.
    row = finish_row(case, label, recorder, [], "capability_absent")
    for item in row["assertions"]:
        if item["name"] == "exit-" + step["label"]:
            item.update(passed=step.get("exit") == 2, expected=2)
    row["expectationMatched"] = bool(row["assertions"]) and all(
        item["passed"] for item in row["assertions"])
    row["capabilityAbsentAt"] = {
        "label": step.get("label"), "exit": step.get("exit"), "stderr": step.get("stderr"),
        "reason": "only the old baseline may classify an argparse exit 2 as capability absent",
    }
    return row


def run_p11(base: Path, templates: Path, case: dict, label: str) -> dict:
    repo, task_ref, env = make_fixture(base, templates, case)
    recorder = Recorder(label, repo, task_ref, env)
    attest = recorder.command("attest", ["attest", task_ref, "--note", "Fixture three-file version ready for review"], 0)
    if capability_absent(attest, label):
        return row_for_capability_absent(case, label, recorder, attest)
    validate = recorder.command("validate", ["validate", task_ref], 0)
    record = final_record(recorder)
    start = recorder.command("approved-start", ["start", task_ref, *approval_args(record)], 0)
    final = recorder.finalize()
    attest_value = record_meta(final).get("planningAttest") or {}
    approval = record_meta(final).get("planningApproval") or {}
    actual_files = artifact_hashes(repo / final["taskRef"])
    record_value = final.get("record") or {}
    assertions: List[dict] = []
    assertion(assertions, "attest-exit", attest.get("exit") == 0, 0, attest.get("exit"))
    assertion(assertions, "validate-exit", validate.get("exit") == 0, 0, validate.get("exit"))
    assertion(assertions, "start-exit", start.get("exit") == 0, 0, start.get("exit"))
    assertion(assertions, "status-in-progress", final.get("taskStatus") == "in_progress", "in_progress", final.get("taskStatus"))
    assertion(assertions, "approval-review-matches", approval.get("reviewId") == attest_value.get("reviewId"), attest_value.get("reviewId"), approval.get("reviewId"))
    assertion(assertions, "approval-files-match-review", approval.get("reviewedFiles") == attest_value.get("reviewFiles"), "same reviewFiles", approval.get("reviewedFiles"))
    assertion(assertions, "current-files-match-attest", actual_files == (attest_value.get("files") or {}), attest_value.get("files"), actual_files)
    assertion(assertions, "one-pointer", active_pointer_count(final) == 1, 1, active_pointer_count(final))
    assertion(assertions, "one-after-start-hook", hook_count(final, "after_start") == 1, 1, hook_count(final, "after_start"))
    assertion(assertions, "unknown-top-preserved", record_value.get("unknownTop") == "preserve", "preserve", record_value.get("unknownTop"))
    assertion(assertions, "other-meta-preserved", ((record_value.get("meta") or {}).get("other") == {"keep": True}), {"keep": True}, (record_value.get("meta") or {}).get("other"))
    return finish_row(case, label, recorder, assertions)


def run_p12_variant(base: Path, templates: Path, case: dict, label: str, variant: str) -> dict:
    repo, task_ref, env = make_fixture(base, templates, case, "-" + variant)
    recorder = Recorder(label, repo, task_ref, env)
    attest = recorder.command("attest", ["attest", task_ref, "--note", "Fixture version before an editorial correction"], 0)
    if capability_absent(attest, label):
        return row_for_capability_absent(case, label, recorder, attest)
    recorder.command("validate", ["validate", task_ref], 0)
    before_start_record = final_record(recorder)
    initial_approval = None
    before_attest = record_meta(snapshot(repo, task_ref)).get("planningAttest") or {}
    if variant == "a":
        recorder.command("approved-start", ["start", task_ref, *approval_args(before_start_record)], 0)
        initial_approval = record_meta(recorder.state()).get("planningApproval")
        recorder.edit("typo-edit", {"design.md": "# design.md\nKeep storage locally.\n"})
        recorder.command("editorial-attest", ["attest", task_ref, "--editorial", "--note", EDITORIAL_NOTE], 0)
        recorder.command("resume", ["start", task_ref], 0)
    else:
        recorder.edit("typo-edit", {"design.md": "# design.md\nKeep storage locally.\n"})
        recorder.command("approved-start-with-editorial", ["start", task_ref, *approval_args(before_start_record), "--editorial-note", EDITORIAL_NOTE], 0)
    final = recorder.finalize()
    meta = record_meta(final)
    attest_after = meta.get("planningAttest") or {}
    approval_after = meta.get("planningApproval") or {}
    changes = attest_after.get("editorialChanges") or []
    actual_files = artifact_hashes(repo / final["taskRef"])
    assertions: List[dict] = []
    assertion(assertions, "status-in-progress", final.get("taskStatus") == "in_progress", "in_progress", final.get("taskStatus"))
    assertion(assertions, "review-id-preserved", attest_after.get("reviewId") == before_attest.get("reviewId"), before_attest.get("reviewId"), attest_after.get("reviewId"))
    assertion(assertions, "review-files-preserved", attest_after.get("reviewFiles") == before_attest.get("reviewFiles"), before_attest.get("reviewFiles"), attest_after.get("reviewFiles"))
    assertion(assertions, "files-updated-to-typo-version", attest_after.get("files") == actual_files, actual_files, attest_after.get("files"))
    assertion(assertions, "one-editorial-change", len(changes) == 1, 1, len(changes))
    if changes:
        assertion(assertions, "change-before-matches-old-files", changes[0].get("before") == before_attest.get("files"), before_attest.get("files"), changes[0].get("before"))
        assertion(assertions, "change-after-matches-new-files", changes[0].get("after") == attest_after.get("files"), attest_after.get("files"), changes[0].get("after"))
    assertion(assertions, "approval-matches-review", approval_after.get("reviewId") == attest_after.get("reviewId"), attest_after.get("reviewId"), approval_after.get("reviewId"))
    assertion(assertions, "approval-reviewed-old-files", approval_after.get("reviewedFiles") == before_attest.get("reviewFiles"), before_attest.get("reviewFiles"), approval_after.get("reviewedFiles"))
    if variant == "a":
        assertion(assertions, "approval-not-rewritten", approval_after == initial_approval, initial_approval, approval_after)
        assertion(assertions, "two-start-hooks", hook_count(final, "after_start") == 2, 2, hook_count(final, "after_start"))
    else:
        assertion(assertions, "one-start-hook", hook_count(final, "after_start") == 1, 1, hook_count(final, "after_start"))
    return finish_row(case, label, recorder, assertions)


def run_p12(base: Path, templates: Path, case: dict, label: str) -> dict:
    variants = [run_p12_variant(base, templates, case, label, "a"),
                run_p12_variant(base, templates, case, label, "b")]
    if any(row.get("classification") == "capability_absent" for row in variants):
        result = {"id": None, "scenario": case["id"], "version": label, "classification": "capability_absent", "steps": [step for row in variants for step in row["steps"]], "assertions": [], "expectationMatched": True, "initial": variants[0]["initial"], "final": variants[-1]["final"]}
        result["variants"] = variants
        result["capabilityAbsentAt"] = next(row["capabilityAbsentAt"] for row in variants if row.get("capabilityAbsentAt"))
        return result
    result = {"id": None, "scenario": case["id"], "version": label, "classification": "executed", "steps": [step for row in variants for step in row["steps"]], "capabilityAbsentAt": None}
    result["variants"] = variants
    result["assertions"] = [{"name": "variant-" + item["scenario"] + "-matched", "passed": item["expectationMatched"], "expected": True, "actual": item["expectationMatched"]} for item in variants]
    result["expectationMatched"] = all(item["expectationMatched"] for item in variants)
    result["initial"] = variants[0]["initial"]
    result["final"] = variants[-1]["final"]
    return result

def run_p13(base: Path, templates: Path, case: dict, label: str) -> dict:
    repo, task_ref, env = make_fixture(base, templates, case)
    recorder = Recorder(label, repo, task_ref, env)
    initial_state = snapshot(repo, task_ref)
    initial_meta = record_meta(initial_state)
    initial_attest = initial_meta.get("planningAttest") or {}
    initial_branch = initial_state.get("gitBranch")
    initial_pointers = active_pointer_count(initial_state)
    replan = recorder.command(
        "replan",
        ["replan", task_ref, "--reason", "Fixture changed the storage design",
         "--affected", "storage and dependent tests", "--independent", "documentation wording"],
        0,
    )
    if capability_absent(replan, label):
        return row_for_capability_absent(case, label, recorder, replan)
    after_replan = recorder.state()
    after_replan_meta = record_meta(after_replan)
    recorder.edit("material-change", {
        "design.md": "# design.md\nKeep storage local. Add a new queue boundary.\n",
        "implement.md": "# implement.md\nKeep storage local. Add queue integration tests.\n",
    })
    changed_hashes = artifact_hashes(repo / task_ref)
    attest = recorder.command("attest", ["attest", task_ref, "--note", "Fixture changed plan ready for review"], 0)
    after_attest = recorder.state()
    after_attest_meta = record_meta(after_attest)
    after_attest_value = after_attest_meta.get("planningAttest") or {}
    validate = recorder.command("validate", ["validate", task_ref], 0)
    start = recorder.command("approved-start", ["start", task_ref, *approval_args(after_attest["record"])], 0)
    final = recorder.finalize()
    final_meta = record_meta(final)
    final_attest = final_meta.get("planningAttest") or {}
    final_approval = final_meta.get("planningApproval") or {}
    actual_files = artifact_hashes(repo / final["taskRef"])
    assertions: List[dict] = []
    assertion(assertions, "replan-exit", replan.get("exit") == 0, 0, replan.get("exit"))
    assertion(assertions, "replan-status-planning", after_replan.get("taskStatus") == "planning", "planning", after_replan.get("taskStatus"))
    assertion(assertions, "replan-record", isinstance(after_replan_meta.get("planningReplan"), dict), "planningReplan object", after_replan_meta.get("planningReplan"))
    assertion(assertions, "replan-clears-old-attest", "planningAttest" not in after_replan_meta, False, "planningAttest" in after_replan_meta)
    assertion(assertions, "replan-clears-old-approval", "planningApproval" not in after_replan_meta, False, "planningApproval" in after_replan_meta)
    assertion(assertions, "replan-preserves-branch", after_replan.get("gitBranch") == initial_branch, initial_branch, after_replan.get("gitBranch"))
    assertion(assertions, "replan-preserves-pointer", active_pointer_count(after_replan) == initial_pointers, initial_pointers, active_pointer_count(after_replan))
    assertion(assertions, "replan-no-start-hook", hook_count(after_replan, "after_start") == 0, 0, hook_count(after_replan, "after_start"))
    assertion(assertions, "materials-really-changed", changed_hashes != (initial_attest.get("files") or {}), "different from old reviewFiles", changed_hashes)
    assertion(assertions, "attest-exit", attest.get("exit") == 0, 0, attest.get("exit"))
    assertion(assertions, "new-review-id", after_attest_value.get("reviewId") != initial_attest.get("reviewId"), "different reviewId", after_attest_value.get("reviewId"))
    assertion(assertions, "new-files-attested", after_attest_value.get("files") == changed_hashes, changed_hashes, after_attest_value.get("files"))
    assertion(assertions, "replan-pending-after-attest", after_attest_meta.get("planningReplan") is not None, "still pending", after_attest_meta.get("planningReplan"))
    assertion(assertions, "validate-exit", validate.get("exit") == 0, 0, validate.get("exit"))
    assertion(assertions, "start-exit", start.get("exit") == 0, 0, start.get("exit"))
    assertion(assertions, "final-status", final.get("taskStatus") == "in_progress", "in_progress", final.get("taskStatus"))
    assertion(assertions, "replan-cleared-on-start", final_meta.get("planningReplan") is None, None, final_meta.get("planningReplan"))
    assertion(assertions, "new-approval", final_approval.get("reviewId") == final_attest.get("reviewId"), final_attest.get("reviewId"), final_approval.get("reviewId"))
    assertion(assertions, "final-files-match", final_attest.get("files") == actual_files, actual_files, final_attest.get("files"))
    assertion(assertions, "one-start-hook", hook_count(final, "after_start") == 1, 1, hook_count(final, "after_start"))
    return finish_row(case, label, recorder, assertions)


def run_p14_variant(base: Path, templates: Path, case: dict, label: str, variant: str) -> dict:
    repo, task_ref, env = make_fixture(base, templates, case, "-" + variant)
    recorder = Recorder(label, repo, task_ref, env)
    attest = recorder.command("attest", ["attest", task_ref, "--note", "Fixture version without session identity"], 0)
    if capability_absent(attest, label):
        return row_for_capability_absent(case, label, recorder, attest)
    recorder.command("validate", ["validate", task_ref], 0)
    record = final_record(recorder)
    if variant == "negative":
        absent = recorder.command("start-without-confirmation", ["start", task_ref], 1)
        final = recorder.finalize()
        assertions = [
            {"name": "negative-exit", "passed": absent.get("exit") == 1, "expected": 1, "actual": absent.get("exit")},
            {"name": "negative-status", "passed": final.get("taskStatus") == "planning", "expected": "planning", "actual": final.get("taskStatus")},
            {"name": "negative-no-pointer", "passed": active_pointer_count(final) == 0, "expected": 0, "actual": active_pointer_count(final)},
            {"name": "negative-no-hook", "passed": hook_count(final, "after_start") == 0, "expected": 0, "actual": hook_count(final, "after_start")},
            {"name": "negative-task-unchanged", "passed": task_file_hash(absent["before"]) == task_file_hash(absent["after"]), "expected": "same task.json", "actual": task_file_hash(absent["after"])},
        ]
    else:
        positive = recorder.command("approved-start", ["start", task_ref, *approval_args(record)], 0)
        final = recorder.finalize()
        assertions = [
            {"name": "positive-exit", "passed": positive.get("exit") == 0, "expected": 0, "actual": positive.get("exit")},
            {"name": "positive-status", "passed": final.get("taskStatus") == "in_progress", "expected": "in_progress", "actual": final.get("taskStatus")},
            {"name": "positive-no-pointer", "passed": active_pointer_count(final) == 0, "expected": 0, "actual": active_pointer_count(final)},
            {"name": "positive-one-hook", "passed": hook_count(final, "after_start") == 1, "expected": 1, "actual": hook_count(final, "after_start")},
            {"name": "degraded-message", "passed": "degraded" in (positive.get("stdout") or "").lower(), "expected": "degraded", "actual": positive.get("stdout")},
        ]
    return finish_row(case, label, recorder, assertions)


def run_p14(base: Path, templates: Path, case: dict, label: str) -> dict:
    variants = [run_p14_variant(base, templates, case, label, "negative"),
                run_p14_variant(base, templates, case, label, "positive")]
    if any(row.get("classification") == "capability_absent" for row in variants):
        result = {"id": None, "scenario": case["id"], "version": label, "classification": "capability_absent", "steps": [step for row in variants for step in row["steps"]], "assertions": [], "expectationMatched": True, "initial": variants[0]["initial"], "final": variants[-1]["final"]}
        result["variants"] = variants
        result["capabilityAbsentAt"] = next(row["capabilityAbsentAt"] for row in variants if row.get("capabilityAbsentAt"))
        return result
    result = {"id": None, "scenario": case["id"], "version": label, "classification": "executed", "steps": [step for row in variants for step in row["steps"]], "capabilityAbsentAt": None}
    result["variants"] = variants
    result["assertions"] = [{"name": "variant-" + item["scenario"] + "-matched", "passed": item["expectationMatched"], "expected": True, "actual": item["expectationMatched"]} for item in variants]
    result["expectationMatched"] = all(item["expectationMatched"] for item in variants)
    result["initial"] = variants[0]["initial"]
    result["final"] = variants[-1]["final"]
    return result


def extract_python_prompt(step: dict) -> str:
    try:
        payload = json.loads(step.get("stdout") or "{}")
    except ValueError:
        return step.get("stdout") or ""
    if not isinstance(payload, dict):
        return step.get("stdout") or ""
    specific = payload.get("hookSpecificOutput")
    if isinstance(specific, dict) and isinstance(specific.get("additionalContext"), str):
        return specific["additionalContext"]
    if isinstance(payload.get("additional_context"), str):
        return payload["additional_context"]
    if isinstance(payload.get("additionalContext"), str):
        return payload["additionalContext"]
    return json.dumps(payload, ensure_ascii=False)


def write_opencode_harness(work: Path) -> Path:
    path = work / "opencode-prompt.mjs"
    path.write_text(
        "import { pathToFileURL } from 'node:url';\n"
        "const root = process.argv[2];\n"
        "const templates = process.argv[3];\n"
        "const contextModule = await import(pathToFileURL(templates + '/opencode/lib/trellis-context.js').href);\n"
        "const statusModule = await import(pathToFileURL(templates + '/opencode/lib/session-utils.js').href);\n"
        "const ctx = new contextModule.TrellisContext(root);\n"
        "process.stdout.write(statusModule.buildSessionContext(ctx, { session_id: process.env.TRELLIS_CONTEXT_ID || 'fixture' }));\n",
        encoding="utf-8",
    )
    return path


def run_prompt_checks(recorder: Recorder, templates: Path, work: Path) -> List[dict]:
    steps: List[dict] = []
    for name in ("shared-hooks/session-start.py", "codex/hooks/session-start.py", "copilot/hooks/session-start.py"):
        hook_path = templates / name
        payload = json.dumps({
            "cwd": str(recorder.repo),
            "session_id": recorder.env.get("TRELLIS_CONTEXT_ID", "fixture"),
            "platform": "codex" if "shared" in name or "codex" in name else "copilot",
        }, ensure_ascii=False)
        steps.append(recorder.run("python-prompt:" + name, [PYTHON_CMD, str(hook_path)], 0, input_text=payload, timeout=30))
    steps.append(recorder.run("opencode-prompt", [NODE_CMD, str(work / "opencode-prompt.mjs"), str(recorder.repo), str(templates)], 0, timeout=30))
    return steps


def run_p15(base: Path, templates: Path, case: dict, label: str, work: Path) -> dict:
    repo, task_ref, env = make_fixture(base, templates, case)
    recorder = Recorder(label, repo, task_ref, env)
    status_step = recorder.command("planning-status", ["planning-status", task_ref, "--json"], 0)
    if capability_absent(status_step, label):
        prompt_recorder = Recorder(label, repo, task_ref, env)
        prompt_steps = run_prompt_checks(prompt_recorder, templates, work)
        result = row_for_capability_absent(case, label, recorder, status_step)
        result["legacyPromptObservation"] = {
            "purpose": "Separate real old prompt observation; not substituted for the unsupported main command.",
            "steps": prompt_steps,
            "final": prompt_recorder.finalize(),
            "containsPlanningRecord": {step["label"]: "planning-record-data" in (step.get("stdout") or "") for step in prompt_steps},
        }
        return result
    if status_step.get("exit") != 0:
        return finish_row(case, label, recorder, [{"name": "planning-status-exit", "passed": False, "expected": 0, "actual": status_step.get("exit")}])
    try:
        status_payload = json.loads(status_step.get("stdout") or "{}")
    except ValueError:
        status_payload = {}
    prompt_steps = run_prompt_checks(recorder, templates, work)
    assertions: List[dict] = []
    assertion(assertions, "status-mode", status_payload.get("mode") == "ready", "ready", status_payload.get("mode"))
    assertion(assertions, "status-review-id", status_payload.get("reviewId") == "c" * 32, "c" * 32, status_payload.get("reviewId"))
    assertion(assertions, "status-note", bool(status_payload.get("note")), "non-empty", status_payload.get("note"))
    assertion(assertions, "status-approval-source", status_payload.get("approvalSource") == APPROVAL_SOURCE, APPROVAL_SOURCE, status_payload.get("approvalSource"))
    assertion(assertions, "status-no-errors", status_payload.get("errors") == [], [], status_payload.get("errors"))
    for step in prompt_steps:
        text = extract_python_prompt(step) if step["label"].startswith("python-prompt:") else (step.get("stdout") or "")
        assertion(assertions, step["label"] + "-exit", step.get("exit") == 0, 0, step.get("exit"))
        assertion(assertions, step["label"] + "-review-id", "c" * 32 in text, "c" * 32, text[:500])
        assertion(assertions, step["label"] + "-source", APPROVAL_SOURCE in text, APPROVAL_SOURCE, text[:500])
        assertion(assertions, step["label"] + "-record-container", "planning-record-data" in text, "planning-record-data", text[:500])
    return finish_row(case, label, recorder, assertions)


def run_p16(base: Path, templates: Path, case: dict, label: str) -> dict:
    repo, task_ref, env = make_fixture(base, templates, case)
    recorder = Recorder(label, repo, task_ref, env)
    archive = recorder.command("archive", ["archive", task_ref], 0)
    final = recorder.finalize()
    record = final.get("record") or {}
    assertions: List[dict] = []
    assertion(assertions, "archive-exit", archive.get("exit") == 0, 0, archive.get("exit"))
    if label == "after":
        assertion(assertions, "archive-warning", "warning: planning:" in (archive.get("stderr") or "").lower(), "planning warning", archive.get("stderr"))
    assertion(assertions, "archive-destination", (final.get("taskRef") or "").startswith(".trellis/tasks/archive/"), "archive path", final.get("taskRef"))
    assertion(assertions, "archived-status", record.get("status") == "completed", "completed", record.get("status"))
    assertion(assertions, "archived-unknown-top", record.get("unknownTop") == "preserve", "preserve", record.get("unknownTop"))
    assertion(assertions, "archived-other-meta", ((record.get("meta") or {}).get("other") == {"keep": True}), {"keep": True}, (record.get("meta") or {}).get("other"))
    assertion(assertions, "archived-branch", record.get("branch") == "compare-feature", "compare-feature", record.get("branch"))
    assertion(assertions, "archive-hook", hook_count(final, "after_archive") == 1, 1, hook_count(final, "after_archive"))
    return finish_row(case, label, recorder, assertions)


def legacy_alternative(base: Path, templates: Path, case: dict) -> dict:
    alt_case = dict(case)
    alt_case["id"] = case["id"] + "-legacy-alternative"
    alt_case.pop("seed_record", None)
    alt_case.pop("seed_pointer", None)
    if case["id"] == "P13":
        alt_case["status"] = "in_progress"
        alt_case["modern_record"] = True
    repo, task_ref, env = make_fixture(base, templates, alt_case)
    recorder = Recorder("before", repo, task_ref, env)
    recorder.command("old-start-without-planning-flags", ["start", task_ref], None)
    result = finish_row(alt_case, "before", recorder, [], "observation")
    result["purpose"] = "Old baseline's original start path, kept separate from the main P scenario."
    return result

def new_case_definitions(historical: List[dict]) -> List[dict]:
    return historical + [
        {"id": "P11", "files": "all", "manifests": "curated", "status": "planning"},
        {"id": "P12", "files": "all", "manifests": "curated", "status": "planning"},
        {"id": "P13", "files": "all", "manifests": "curated", "status": "in_progress",
         "seed_record": True, "seed_pointer": True},
        {"id": "P14", "files": "all", "manifests": "curated", "status": "planning", "no_session": True},
        {"id": "P15", "files": "all", "manifests": "curated", "status": "in_progress",
         "seed_record": True, "seed_pointer": True},
        {"id": "P16", "files": "prd", "manifests": "curated", "status": "in_progress", "command": "archive"},
    ]


def run_version(label: str, templates: Path, work: Path, cases: List[dict]) -> Dict[str, dict]:
    work.mkdir(parents=True, exist_ok=True)
    write_opencode_harness(work)
    rows: Dict[str, dict] = {}
    for index, case in enumerate(cases, 1):
        row_id = "P%02d" % index
        base = work / label
        if index <= 10:
            repo, task_ref, env = make_fixture(base, templates, case)
            recorder = Recorder(label, repo, task_ref, env)
            if case.get("command") == "create":
                recorder.command("create", ["create", "Review planning", "--description", "Review only", "--slug", "review-planning"], 0)
            else:
                recorder.command(case.get("command", "start"), [case.get("command", "start"), task_ref, *case.get("flags", [])], None)
            row = finish_row(case, label, recorder, evaluate_common(case, label, recorder))
        elif case["id"] == "P11":
            row = run_p11(base, templates, case, label)
        elif case["id"] == "P12":
            row = run_p12(base, templates, case, label)
        elif case["id"] == "P13":
            row = run_p13(base, templates, case, label)
        elif case["id"] == "P14":
            row = run_p14(base, templates, case, label)
        elif case["id"] == "P15":
            row = run_p15(base, templates, case, label, work)
        elif case["id"] == "P16":
            row = run_p16(base, templates, case, label)
        else:
            raise RuntimeError("unknown scenario: " + case["id"])
        row["id"] = row_id
        if label == "before" and case["id"] in ("P11", "P12", "P13", "P14"):
            row["legacyAlternative"] = legacy_alternative(work / "legacy", templates, case)
        rows[row_id] = row
    return rows


def comparison_category(before: dict, after: dict) -> Tuple[str, str]:
    if before.get("classification") == "capability_absent":
        if after.get("expectationMatched") and after.get("classification") == "executed":
            return "新增能力", "旧版不支持首个新命令；新版完成完整语义验收，旧版后续状态未模拟。"
        return "意外回归", "旧版能力不存在，但新版没有完成预期验收。"
    if not before.get("expectationMatched") or not after.get("expectationMatched"):
        if not before.get("expectationMatched") and not after.get("expectationMatched"):
            return "共同失败", "两版都未满足预期；保留原始日志，不称为通过。"
        if not after.get("expectationMatched"):
            return "意外回归", "新版未满足预期。"
        return "意外回归", "旧基线复现与冻结预期不符；不能据此宣称新版改善。"
    if before.get("scenario") == "P16":
        return "保留", "原归档能力保留；新版另有规划警告。"
    table = common_expectations(before.get("scenario", ""))
    return table["category"], table["reason"]


def legacy_summary(row: Optional[dict]) -> dict:
    if not row:
        return {"available": False}
    steps = row.get("steps") or []
    step = steps[0] if steps else {}
    return {
        "available": True, "argv": step.get("argv"), "exit": step.get("exit"),
        "status": (row.get("final") or {}).get("taskStatus"),
        "pointers": active_pointer_count(row.get("final") or {}),
        "afterStartHooks": hook_count(row.get("final") or {}, "after_start"),
        "stdout": step.get("stdout"), "stderr": step.get("stderr"),
    }


def write_report(output: Path, commits: Dict[str, str], env_report: dict, rows: List[dict]) -> None:
    lines = [
        "# 固定提交同条件对照", "",
        "旧版 `" + commits["before"] + "`；新版 `" + commits["after"] + "`。", "",
        "本报告由 `compare-planning-versions.py` 实际运行生成。两版使用相同场景生成函数、相同临时 Git 仓库设置、相同环境键和相同 Python/Node 命令。耗时只观察，不承诺性能。样例里的确认文字是测试字符串，不是现实用户授权。", "",
        "## 环境", "",
        "- Python: `" + str(env_report.get("pythonRuntime", {}).get("version")) + "`",
        "- Node: `" + str((env_report.get("tools", {}).get("node") or {}).get("stdout", "")).strip() + "`",
        "- pnpm: `" + str((env_report.get("tools", {}).get("pnpm") or {}).get("stdout", "")).strip() + "`",
        "- Git: `" + str((env_report.get("tools", {}).get("git") or {}).get("stdout", "")).strip() + "`",
        "- 临时样例根目录: `" + str(env_report.get("fixtureRoot")) + "`", "",
        "## 场景结果", "",
        "| 编号 | 场景 | 旧版退出码 | 新版退出码 | 判定 | 判定依据 |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for row in rows:
        before_exits = row["beforeExits"]
        after_exits = row["afterExits"]
        reason = row["reason"]
        if row.get("beforeClassification") == "capability_absent":
            reason += " 旧版首个不支持命令后停止，不模拟后续状态。"
        lines.append("| " + row["id"] + " | " + row["scenario"] + " | " +
                     repr(before_exits) + " | " + repr(after_exits) + " | " +
                     row["category"] + " | " + reason + " |")
    lines += [
        "", "## 旧版原有替代流程观察", "",
        "这些观察来自单独的旧版样例，不替换 P11—P14 的主命令，也不计入新版通过。", "",
        "| 编号 | 旧版 start（无新参数）退出码 | 结果状态 | 指针 | 启动钩子 |",
        "| --- | --- | --- | --- | --- |",
    ]
    for row in rows:
        legacy = row["legacyAlternative"]
        if legacy.get("available"):
            lines.append("| " + row["id"] + " | " + str(legacy.get("exit")) + " | " +
                         str(legacy.get("status")) + " | " + str(legacy.get("pointers")) + " | " +
                         str(legacy.get("afterStartHooks")) + " |")
    lines += [
        "", "## 能力与限制", "",
        "- P11—P15：旧版 argparse 退出 2 只在旧版、且命令不支持时归为“能力不存在”；新版绝不使用该豁免。",
        "- P12：两个勘误时点分别在独立样例中运行，没有把两个时点拼成一条不存在的记录链。",
        "- P13：先 replan，再真实修改设计和实施材料，之后才 attest；记录前后指纹和旧声明清除状态。",
        "- P14：没有会话身份时以相同版本/确认检查驱动失败和成功分支；成功只降级指针，不降级规划检查。",
        "- P15：三种 Python 平台提示来自真实 `session-start.py`；OpenCode 提示来自真实 `buildSessionContext`。",
        "- P16：最终快照重新定位归档目标，读取归档后的实际 record、文件指纹、分支和钩子。",
        "- 指纹只证明字节一致，不证明语义正确；本地记录不能证明真实用户授权不可伪造。", "",
        "状态: " + ("complete-with-findings" if any("意外" in row["category"] or row["category"] == "共同失败" for row in rows) else "complete"), "",
    ]
    (output / "report.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--before", required=True, help="complete 40-character commit SHA")
    parser.add_argument("--after", required=True, help="complete 40-character commit SHA")
    parser.add_argument("--out", type=Path, required=True, help="base output directory")
    args = parser.parse_args()

    try:
        before = resolve_complete_commit(args.before)
        after = resolve_complete_commit(args.after)
    except ValueError as error:
        parser.error(str(error))
    if before == after:
        parser.error("before and after must be distinct complete commits")
    for path in ("packages/cli/src/templates/trellis/scripts/task.py",
                 "packages/cli/src/templates/trellis/workflow.md"):
        if not commit_path_exists(before, path) or not commit_path_exists(after, path):
            parser.error("both commits must contain " + path)
    if not commit_path_exists(after, "packages/cli/src/templates/trellis/scripts/common/planning.py"):
        parser.error("after commit does not contain the new planning module")

    result_dir = args.out / (before[:12] + "-" + after[:12])
    if result_dir.exists() and any(result_dir.iterdir()):
        parser.error("result directory already exists and is not empty; historical evidence is never overwritten")
    result_dir.mkdir(parents=True, exist_ok=True)

    work = Path(tempfile.mkdtemp(prefix="trellis-a-pinned-comparison-"))
    commits = {"before": before, "after": after}
    env_report = environment_report(work, commits)
    save(result_dir / "environment.json", env_report)
    try:
        cases = new_case_definitions(historical_cases())
        sources = {label: export_templates(sha, work / (label + "-source"))
                   for label, sha in commits.items()}
        all_rows = {label: run_version(label, sources[label], work / label, cases)
                    for label in commits}
        rows: List[dict] = []
        for row_id in ["P%02d" % index for index in range(1, len(cases) + 1)]:
            before_row = all_rows["before"][row_id]
            after_row = all_rows["after"][row_id]
            category, reason = comparison_category(before_row, after_row)
            rows.append({
                "id": row_id, "scenario": before_row.get("scenario"),
                "category": category, "reason": reason,
                "beforeClassification": before_row.get("classification"),
                "afterClassification": after_row.get("classification"),
                "beforeExpectedMatched": before_row.get("expectationMatched"),
                "afterExpectedMatched": after_row.get("expectationMatched"),
                "beforeExits": [step.get("exit") for step in before_row.get("steps", [])],
                "afterExits": [step.get("exit") for step in after_row.get("steps", [])],
                "beforeStatus": (before_row.get("final") or {}).get("taskStatus"),
                "afterStatus": (after_row.get("final") or {}).get("taskStatus"),
                "beforePointers": active_pointer_count(before_row.get("final") or {}),
                "afterPointers": active_pointer_count(after_row.get("final") or {}),
                "beforeAfterStartHooks": hook_count(before_row.get("final") or {}, "after_start"),
                "afterAfterStartHooks": hook_count(after_row.get("final") or {}, "after_start"),
                "beforeAfterArchiveHooks": hook_count(before_row.get("final") or {}, "after_archive"),
                "afterAfterArchiveHooks": hook_count(after_row.get("final") or {}, "after_archive"),
                "beforeEvidence": "before/" + row_id + ".json",
                "afterEvidence": "after/" + row_id + ".json",
                "legacyAlternative": legacy_summary(before_row.get("legacyAlternative")),
                "legacyPromptObservation": before_row.get("legacyPromptObservation"),
            })
            save(result_dir / "before" / (row_id + ".json"), before_row)
            save(result_dir / "after" / (row_id + ".json"), after_row)
        status = "complete-with-findings" if any(
            "意外" in row["category"] or row["category"] == "共同失败" for row in rows
        ) else "complete"
        save(result_dir / "comparison.json", {"commits": commits, "status": status, "rows": rows})
        write_report(result_dir, commits, env_report, rows)
        env_report["executionStatus"] = "complete"
        save(result_dir / "environment.json", env_report)
        print(json.dumps({"out": str(result_dir), "cases": len(rows),
                          "unexpected": [row["id"] for row in rows if "意外" in row["category"] or row["category"] == "共同失败"]},
                         ensure_ascii=False))
        return 0
    except Exception as error:
        env_report["executionStatus"] = "failed"
        env_report["failure"] = type(error).__name__ + ": " + str(error)
        save(result_dir / "environment.json", env_report)
        save(result_dir / "failure.json", {"errorType": type(error).__name__, "error": str(error)})
        raise


if __name__ == "__main__":
    raise SystemExit(main())
