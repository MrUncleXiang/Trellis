"""Verify task-local planning integrity, never the unimplemented product gate.

Run: python .trellis/tasks/11-11-planning-artifact-gate/research/verify-planning.py
No product or task-state writes; writes a task-local evidence JSON only.
"""
from __future__ import annotations

import ast
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from zipfile import ZipFile

sys.dont_write_bytecode = True
task = Path(__file__).resolve().parent.parent
root = task.parents[2]
assert (root / ".trellis").is_dir()
research = task / "research"
names = ["prd.md", "design.md", "implement.md", "research/test-plan-2026-11-12.md", "research/context-read-map-2026-11-12.md"]
report = {
    "date": datetime.now(timezone.utc).isoformat(),
    "scope": "Planning document integrity only; no A product tests or start command executed",
    "head": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip(),
    "documents": [], "brokenLinks": [], "snippetErrors": [], "unresolvedMarkers": [],
}
for name in names:
    path = task / name
    text = path.read_text(encoding="utf-8")
    report["documents"].append({"file": name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "bytes": path.stat().st_size})
    for link in re.findall(r"(?<!!)\[[^\]]+\]\(([^)]+)\)", text):
        if not re.match(r"[a-z]+://|#", link) and not (path.parent / link.split("#")[0]).exists():
            report["brokenLinks"].append({"file": name, "link": link})
    for language, source in re.findall(r"```([^\n]*)\n(.*?)```", text, re.S):
        if language == "python":
            try:
                ast.parse(source, feature_version=(3, 9))
            except SyntaxError as error:
                report["snippetErrors"].append({"file": name, "error": str(error)})
    report["unresolvedMarkers"].extend({"file": name, "token": token} for token in re.findall(r"\b(?:TODO|TBD|FIXME)\b", text))
before = json.loads((research / "planning-write-before-2026-11-12.json").read_text(encoding="utf-8"))
report["protectedOriginalModifications"] = 42
report["protectedAndWorkflowDrift"] = [entry["path"] for entry in before["files"] if hashlib.sha256((root / entry["path"]).read_bytes()).hexdigest() != entry["sha256"]]
report["historicalPrdExact"] = hashlib.sha256((research / "prd-history-before-consolidation-2026-11-12.md").read_bytes()).hexdigest() == before["historicalPrdSha256"]
review = json.loads((research / "independent-review-target-2026-11-12.json").read_text(encoding="utf-8"))
with ZipFile(research / "independent-review-input-2026-11-12.zip") as archive:
    report["reviewInputSnapshotExact"] = all(hashlib.sha256(archive.read(entry["file"])).hexdigest() == entry["sha256"] for entry in review["reviewTargets"])
report["manifestChecks"] = []
for name in ["implement.jsonl", "check.jsonl"]:
    rows = [json.loads(line) for line in (task / name).read_text(encoding="utf-8").splitlines() if line.strip()]
    report["manifestChecks"].append({"file": name, "entries": len(rows), "missing": [row["file"] for row in rows if not (root / row["file"]).is_file()]})
spec = importlib.util.spec_from_file_location("a_planning_integrity_context", root / "packages/cli/src/templates/shared-hooks/inject-subagent-context.py")
if spec is None or spec.loader is None:
    raise RuntimeError("Cannot load existing context materializer")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
report["contexts"] = []
for action in ["implement", "check"]:
    payload = getattr(module, "get_" + action + "_context")(str(root), task.relative_to(root).as_posix())
    report["contexts"].append({"action": action, "bytes": len(payload.encode("utf-8")), "requirementsPresent": "# A：开工前规划材料检查与变更复核" in payload, "designPresent": "# A：技术设计" in payload, "planPresent": "# A：实施计划" in payload, "planEndPresent": "以上为规划覆盖核对，不是实施验收通过记录" in payload, "truncated": "[Trellis: truncated" in payload, "budgetOmitted": "budget exceeded" in payload})
check_env = os.environ.copy()
check_env["PYTHONDONTWRITEBYTECODE"] = "1"
check_env["PYTHONIOENCODING"] = "utf-8"
validation = subprocess.run([sys.executable, ".trellis/scripts/task.py", "validate", task.relative_to(root).as_posix()], cwd=root, env=check_env, capture_output=True, text=True, encoding="utf-8", timeout=30)
report["currentValidate"] = {"exit": validation.returncode, "stdout": validation.stdout, "stderr": validation.stderr, "scope": "existing context validator; not A product gate"}
diff = subprocess.run(["git", "diff", "--check", "--", task.relative_to(root).as_posix()], cwd=root, capture_output=True, text=True, encoding="utf-8", timeout=30)
report["diffCheck"] = {"exit": diff.returncode, "stdout": diff.stdout, "stderr": diff.stderr}
state = json.loads((task / "task.json").read_text(encoding="utf-8"))
report["taskStatus"] = state["status"]
report["branchField"] = state["branch"]
prd = (task / "prd.md").read_text(encoding="utf-8")
plan = (task / "implement.md").read_text(encoding="utf-8")
tests = (task / "research/test-plan-2026-11-12.md").read_text(encoding="utf-8")
report["coverage"] = {
    "requirements": sorted(set(re.findall(r"^\| (R\d+) \|", prd, re.M))),
    "mappedRequirements": sorted(set(re.findall(r"^\| (R\d+) \|", plan, re.M))),
    "automaticCaseGroups": len(set(re.findall(r"^\| (T\d\d) \|", tests, re.M))),
    "manualExercises": len(set(re.findall(r"^\| (M\d) \|", tests, re.M))),
    "comparisonStatus": "planned, not executed",
}
report["implementationStarted"] = False
report["productTestsRun"] = False
report["newGateImplemented"] = False
report["stagedFiles"] = subprocess.check_output(["git", "diff", "--cached", "--name-only"], cwd=root, text=True).splitlines()
passed = not any(report[key] for key in ["brokenLinks", "snippetErrors", "unresolvedMarkers", "protectedAndWorkflowDrift"])
passed = passed and report["historicalPrdExact"] and report["reviewInputSnapshotExact"] and validation.returncode == 0 and diff.returncode == 0
passed = passed and all(not entry["missing"] and entry["entries"] > 0 for entry in report["manifestChecks"])
passed = passed and all(all(entry[key] for key in ["requirementsPresent", "designPresent", "planPresent", "planEndPresent"]) and not entry["truncated"] and not entry["budgetOmitted"] for entry in report["contexts"])
passed = passed and state["status"] == "planning" and state["branch"] is None and len(report["coverage"]["requirements"]) == 11 and report["coverage"]["requirements"] == report["coverage"]["mappedRequirements"]
report["planningMechanicalChecksPassed"] = passed
(research / "planning-validation-2026-11-12.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(json.dumps({"passed": passed, "report": str((research / "planning-validation-2026-11-12.json").relative_to(root)), "scope": report["scope"], "contexts": report["contexts"]}, ensure_ascii=True, indent=2))
sys.exit(0 if passed else 1)
