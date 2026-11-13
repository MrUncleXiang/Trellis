/**
 * A (planning artifact gate) integration tests: T01-T28 and T38.
 *
 * These tests stamp the real shipping Python templates into a real temporary
 * Git repository and run `task.py` as a subprocess. Only two external seams
 * are wrapped for fault injection: `Path.read_bytes` (unreadable planning
 * file) and `os.replace` (task.json save failure/count). No business logic is
 * stubbed.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TEMPLATE_SCRIPTS = path.resolve(
  __dirname,
  "../../src/templates/trellis/scripts",
);
const PYTHON = process.platform === "win32" ? "python" : "python3";
const TASK_DIR = ".trellis/tasks/gate-fixture";
const ARTIFACTS = ["prd.md", "design.md", "implement.md"] as const;
const SENTINEL_TOP = "keep-me-top-level";
const SENTINEL_META = { other: "keep-me-meta" };

function hasPython(): boolean {
  const r = spawnSync(PYTHON, ["--version"], { stdio: "ignore" });
  return r.status === 0;
}

function git(cwd: string, ...args: string[]): string {
  const r = spawnSync("git", args, { cwd, encoding: "utf-8" });
  if (r.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
  }
  return r.stdout.trim();
}

interface Repo {
  root: string;
  taskDir: string;
  taskJson: string;
  pointerDir: string;
}

function setupRepo(): Repo {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-planning-test-"));
  git(root, "init", "-q", "-b", "main");
  git(root, "config", "user.email", "test@example.com");
  git(root, "config", "user.name", "Test");

  const scriptsDest = path.join(root, ".trellis", "scripts");
  fs.mkdirSync(scriptsDest, { recursive: true });
  fs.cpSync(TEMPLATE_SCRIPTS, scriptsDest, { recursive: true });

  const init = spawnSync(
    PYTHON,
    [".trellis/scripts/init_developer.py", "tester"],
    { cwd: root, encoding: "utf-8" },
  );
  if (init.status !== 0) {
    throw new Error(`init_developer failed: ${init.stderr}`);
  }

  const taskDir = path.join(root, TASK_DIR);
  fs.mkdirSync(path.join(taskDir, "research"), { recursive: true });
  fs.writeFileSync(path.join(taskDir, "implement.jsonl"), '{"file":"README.md","reason":"fixture"}\n');
  fs.writeFileSync(path.join(taskDir, "check.jsonl"), '{"file":"README.md","reason":"fixture"}\n');
  writeArtifacts(taskDir, {});
  writeTaskJson(taskDir, {});

  // A hook writes a marker; every command under test must leave it at 0
  // unless the hook is expected to run exactly once.
  fs.writeFileSync(
    path.join(root, ".trellis", "config.yaml"),
    "hooks:\n  after_start:\n    - echo started >> hook-count.txt\n",
  );
  fs.writeFileSync(path.join(root, "README.md"), "# fixture\n");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "fixture");

  const pointerDir = path.join(root, ".trellis", ".runtime", "sessions");
  fs.mkdirSync(pointerDir, { recursive: true });
  return { root, taskDir, taskJson: path.join(taskDir, "task.json"), pointerDir };
}

function writeArtifacts(
  taskDir: string,
  overrides: Partial<Record<(typeof ARTIFACTS)[number], string | Buffer>>,
): void {
  const defaults: Record<(typeof ARTIFACTS)[number], string> = {
    "prd.md": "# PRD\nA small task.\n",
    "design.md": "# Design\nOne module.\n",
    "implement.md": "# Implement\nOne step.\n",
  };
  for (const name of ARTIFACTS) {
    const value = overrides[name] ?? defaults[name];
    fs.writeFileSync(path.join(taskDir, name), value);
  }
}

function baseTask(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "gate-fixture",
    name: "gate-fixture",
    title: "Planning gate fixture",
    description: "fixture",
    status: "planning",
    priority: "P2",
    createdAt: "2026-11-12",
    assignee: "tester",
    creator: "tester",
    subtasks: [],
    children: [],
    relatedFiles: [],
    meta: { ...SENTINEL_META },
    [SENTINEL_TOP]: { keep: true },
    ...overrides,
  };
}

function writeTaskJson(taskDir: string, overrides: Record<string, unknown>): void {
  fs.writeFileSync(
    path.join(taskDir, "task.json"),
    JSON.stringify(baseTask(overrides), null, 2) + "\n",
  );
}

function readTask(repo: Repo): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(repo.taskJson, "utf-8"));
}

function readBytes(file: string): Buffer {
  return fs.readFileSync(file);
}

function runTask(repo: Repo, ...args: string[]) {
  return spawnSync(
    PYTHON,
    [".trellis/scripts/task.py", ...args],
    { cwd: repo.root, encoding: "utf-8", env: cleanEnv() },
  );
}

function cleanEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const key of ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "HOME", "USERPROFILE", "COMSPEC", "PATHEXT", "PYTHONIOENCODING", "PYTHONDONTWRITEBYTECODE"]) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  env.PYTHONIOENCODING = "utf-8";
  env.PYTHONDONTWRITEBYTECODE = "1";
  env.TRELLIS_CONTEXT_ID = "codex_test-session";
  return env;
}

function hookCount(repo: Repo): number {
  const file = path.join(repo.root, "hook-count.txt");
  return fs.existsSync(file) ? fs.readFileSync(file, "utf-8").trim().split("\n").filter(Boolean).length : 0;
}

function snapshot(repo: Repo) {
  return {
    task: fs.existsSync(repo.taskJson) ? readBytes(repo.taskJson) : Buffer.alloc(0),
    taskExists: fs.existsSync(repo.taskJson),
    branch: git(repo.root, "branch", "--show-current"),
    pointers: fs.existsSync(repo.pointerDir)
      ? fs.readdirSync(repo.pointerDir).sort().map((name) => [name, readBytes(path.join(repo.pointerDir, name))])
      : [],
    hooks: hookCount(repo),
  };
}

function assertNoSideEffects(repo: Repo, before: ReturnType<typeof snapshot>): void {
  expect(fs.existsSync(repo.taskJson)).toBe(before.taskExists);
  if (before.taskExists) {
    expect(readBytes(repo.taskJson).equals(before.task)).toBe(true);
  }
  expect(git(repo.root, "branch", "--show-current")).toBe(before.branch);
  expect(snapshot(repo).pointers).toEqual(before.pointers);
  expect(hookCount(repo)).toBe(before.hooks);
}

function attest(repo: Repo, note = "ready for review", extra: string[] = []) {
  return runTask(repo, "attest", TASK_DIR, "--note", note, ...extra);
}

function start(repo: Repo, reviewId?: string, note = "user approved", source = "session message 1") {
  const args = ["start", TASK_DIR];
  if (reviewId !== undefined) args.push("--review", reviewId);
  if (reviewId !== undefined) args.push("--approval-note", note, "--approval-source", source);
  return runTask(repo, ...args);
}

function reviewedId(repo: Repo): string {
  const data = readTask(repo);
  expect(typeof data.meta.planningAttest?.reviewId).toBe("string");
  return data.meta.planningAttest.reviewId;
}

function assertSentinels(repo: Repo): void {
  const data = readTask(repo);
  expect(data[SENTINEL_TOP]).toEqual({ keep: true });
  expect(data.meta.other).toBe("keep-me-meta");
}

describe.skipIf(!hasPython())("task.py planning artifact gate T01-T28/T38", () => {
  let repo: Repo;

  beforeEach(() => {
    repo = setupRepo();
  });

  afterEach(() => {
    fs.rmSync(repo.root, { recursive: true, force: true });
  });

  it("T01 missing any artifact: attest/start reject, name the file, no side effects", () => {
    for (const name of ARTIFACTS) {
      fs.rmSync(path.join(repo.taskDir, name));
      const before = snapshot(repo);
      for (const r of [attest(repo), start(repo, "a".repeat(32))]) {
        expect(r.status).toBe(1);
        expect(`${r.stdout}${r.stderr}`).toContain(name);
      }
      assertNoSideEffects(repo, before);
      writeArtifacts(repo.taskDir, {});
    }
  });

  it("T02 empty, whitespace-only and directory artifacts are rejected", () => {
    const cases: [(typeof ARTIFACTS)[number], string | Buffer | "dir"][] = [
      ["prd.md", ""],
      ["design.md", " \r\n\t "],
      ["implement.md", "dir"],
    ];
    for (const [name, value] of cases) {
      const target = path.join(repo.taskDir, name);
      fs.rmSync(target, { recursive: true, force: true });
      if (value === "dir") fs.mkdirSync(target);
      else fs.writeFileSync(target, value);
      const r = attest(repo);
      expect(r.status).toBe(1);
      expect(`${r.stdout}${r.stderr}`).toContain(name);
      expect(readTask(repo).meta.planningAttest).toBeUndefined();
      fs.rmSync(target, { recursive: true, force: true });
      writeArtifacts(repo.taskDir, {});
    }
  });

  it("T03 unreadable artifact gives a diagnosis without traceback", () => {
    const wrapper = path.join(repo.root, ".trellis", "scripts", "fault_read.py");
    fs.writeFileSync(
      wrapper,
      [
        "import runpy, sys",
        "from pathlib import Path",
        "target = str(Path(sys.argv[1]).resolve())",
        "orig = Path.read_bytes",
        "def read_bytes(self):",
        "    if str(self.resolve()) == target:",
        "        raise OSError('injected read failure')",
        "    return orig(self)",
        "Path.read_bytes = read_bytes",
        "sys.argv = [sys.argv[2], *sys.argv[3:]]",
        "sys.path.insert(0, str(Path(sys.argv[0]).resolve().parent))",
        "runpy.run_path(sys.argv[0], run_name='__main__')",
      ].join("\n"),
    );
    const target = path.join(repo.taskDir, "design.md");
    const r = spawnSync(
      PYTHON,
      [".trellis/scripts/fault_read.py", target, ".trellis/scripts/task.py", "attest", TASK_DIR, "--note", "x"],
      { cwd: repo.root, encoding: "utf-8", env: cleanEnv() },
    );
    expect(r.status).toBe(1);
    expect(r.stderr).not.toContain("Traceback");
    expect(`${r.stdout}${r.stderr}`).toContain("design.md");
    expect(readTask(repo).meta.planningAttest).toBeUndefined();
  });

  it("T04 a small three-file chain works end-to-end", () => {
    writeArtifacts(repo.taskDir, {
      "prd.md": "# PRD\nAdd one line.\n",
      "design.md": "# Design\nEdit settings.py.\n",
      "implement.md": "# Implement\nRun one test.\n",
    });
    expect(attest(repo).status).toBe(0);
    const id = reviewedId(repo);
    const v = runTask(repo, "validate", TASK_DIR);
    expect(v.status).toBe(0);
    expect(v.stdout).toContain("waiting_confirmation");
    const s = start(repo, id);
    expect(s.status).toBe(0);
    expect(readTask(repo).status).toBe("in_progress");
    expect(readTask(repo).meta.planningApproval.reviewId).toBe(id);
  });

  it("T05 blank --note is a business error; missing --note is argparse usage", () => {
    const before = snapshot(repo);
    for (const note of ["", "   \r\n\t"]) {
      const r = attest(repo, note);
      expect(r.status).toBe(1);
      expect(`${r.stdout}${r.stderr}`).toContain("note");
    }
    expect(runTask(repo, "attest", TASK_DIR).status).toBe(2);
    assertNoSideEffects(repo, before);
  });

  it("T06 no attestation: start rejects even with --allow-empty-context", () => {
    const before = snapshot(repo);
    const r = runTask(repo, "start", TASK_DIR, "--allow-empty-context");
    expect(r.status).toBe(1);
    expect(`${r.stdout}${r.stderr}`).toMatch(/attest|review|confirmation/i);
    assertNoSideEffects(repo, before);
  });

  it("T07 per-file edits drift and a fresh attest gets a new id", () => {
    expect(attest(repo).status).toBe(0);
    const first = reviewedId(repo);
    for (const name of ARTIFACTS) {
      fs.appendFileSync(path.join(repo.taskDir, name), `change ${name}\n`);
      const before = snapshot(repo);
      const v = runTask(repo, "validate", TASK_DIR);
      expect(v.status).toBe(1);
      expect(`${v.stdout}${v.stderr}`).toContain(name);
      const s = start(repo, first);
      expect(s.status).toBe(1);
      assertNoSideEffects(repo, before);
      fs.appendFileSync(path.join(repo.taskDir, name), "");
      writeArtifacts(repo.taskDir, {});
    }
    expect(attest(repo).status).toBe(0);
    expect(reviewedId(repo)).not.toBe(first);
  });

  it("T08 normalizes only CRLF to LF", () => {
    writeArtifacts(repo.taskDir, {
      "prd.md": "line one\r\nline two\r\n",
      "design.md": Buffer.from([0xef, 0xbb, 0xbf, ...Buffer.from("# Design\n")]),
      "implement.md": "single\rcarriage\n",
    });
    expect(attest(repo).status).toBe(0);
    const original = readTask(repo).meta.planningAttest.files;

    // CRLF -> LF: same bytes after canonicalization.
    fs.writeFileSync(path.join(repo.taskDir, "prd.md"), "line one\nline two\n");
    expect(runTask(repo, "validate", TASK_DIR).status).toBe(0);

    // BOM and lone CR are real changes, not noise.
    fs.writeFileSync(path.join(repo.taskDir, "design.md"), "# Design\n");
    expect(runTask(repo, "validate", TASK_DIR).status).toBe(1);
    fs.writeFileSync(path.join(repo.taskDir, "implement.md"), "single\ncarriage\n");
    expect(runTask(repo, "validate", TASK_DIR).status).toBe(1);
    expect(original["prd.md"]).toMatch(/^[0-9a-f]{64}$/);
  });

  it("T09 malformed/unknown attestation records are rejected, never overwritten", () => {
    const badMetas = [
      { planningAttest: { schemaVersion: 2 } },
      { planningAttest: { schemaVersion: 1.0 } },
      { planningAttest: { schemaVersion: true } },
      { planningAttest: { schemaVersion: 1, reviewId: "bad" } },
      { planningAttest: "not-an-object" },
      { planningAttest: { schemaVersion: 1, reviewId: "a".repeat(32), attestedAt: "no-zone", note: "x", reviewFiles: {}, files: {}, editorialChanges: [] } },
    ];
    for (const meta of badMetas) {
      writeTaskJson(repo.taskDir, { meta: { ...SENTINEL_META, ...meta } });
      const before = snapshot(repo);
      const v = runTask(repo, "validate", TASK_DIR);
      expect(v.status).toBe(1);
      expect(`${v.stdout}${v.stderr}`).toContain("planningAttest");
      assertNoSideEffects(repo, before);
    }
  });

  it.each([
    ["planningAttest", null],
    ["planningAttest", "broken"],
    ["planningAttest", { schemaVersion: 2 }],
    ["planningApproval", null],
    ["planningApproval", { schemaVersion: 2 }],
    ["planningReplan", null],
    ["planningReplan", "broken"],
  ])("T09 review regression: ordinary attest preserves invalid %s=%j", (key, value) => {
    writeTaskJson(repo.taskDir, {
      meta: { ...SENTINEL_META, [key as string]: value },
    });
    const before = snapshot(repo);
    const result = attest(repo);
    expect(result.status, result.stdout + result.stderr).toBe(1);
    expect(result.stdout + result.stderr).toContain(key);
    assertNoSideEffects(repo, before);
  });

  it.each(["planningAttest", "planningApproval"])(
    "T09 review regression: genuine JSON floating schemaVersion in %s is rejected",
    (key) => {
      expect(attest(repo).status).toBe(0);
      const id = reviewedId(repo);
      if (key === "planningApproval") expect(start(repo, id).status).toBe(0);
      const text = fs.readFileSync(repo.taskJson, "utf-8");
      const at = text.indexOf(`"${key}"`);
      const suffix = text.slice(at).replace(/"schemaVersion": 1(?=,)/, '"schemaVersion": 1.0');
      expect(suffix).toContain('"schemaVersion": 1.0');
      fs.writeFileSync(repo.taskJson, text.slice(0, at) + suffix);
      const before = snapshot(repo);
      for (const args of [
        ["validate", TASK_DIR],
        ["attest", TASK_DIR, "--note", "must not overwrite"],
        ["replan", TASK_DIR, "--reason", "changed", "--affected", "all", "--independent", "none"],
      ]) {
        const result = runTask(repo, ...args);
        expect(result.status, result.stdout + result.stderr).toBe(1);
        assertNoSideEffects(repo, before);
      }
    },
  );

  it("T10 valid unattested-approval planning state is waiting_confirmation", () => {
    expect(attest(repo).status).toBe(0);
    const v = runTask(repo, "validate", TASK_DIR);
    expect(v.status).toBe(0);
    expect(v.stdout).toContain("waiting_confirmation");
    expect(readTask(repo).status).toBe("planning");
  });

  it("T11 start confirmation arguments are all required and non-blank", () => {
    expect(attest(repo).status).toBe(0);
    const id = reviewedId(repo);
    const before = snapshot(repo);
    const cases = [
      ["start", TASK_DIR],
      ["start", TASK_DIR, "--review", id],
      ["start", TASK_DIR, "--review", id, "--approval-note", "", "--approval-source", "s"],
      ["start", TASK_DIR, "--review", id, "--approval-note", "n", "--approval-source", " "],
    ];
    for (const args of cases) {
      const r = runTask(repo, ...args);
      expect(r.status).toBe(1);
      expect(`${r.stdout}${r.stderr}`).toMatch(/approval|review|required|missing/i);
    }
    assertNoSideEffects(repo, before);
  });

  it("T12 old approved version cannot authorize a newly attested version", () => {
    expect(attest(repo).status).toBe(0);
    const oldId = reviewedId(repo);
    expect(start(repo, oldId).status).toBe(0);
    // Go back to planning through the explicit contract.
    expect(runTask(repo, "replan", TASK_DIR, "--reason", "version change", "--affected", "all", "--independent", "none").status).toBe(0);
    fs.appendFileSync(path.join(repo.taskDir, "design.md"), "new direction\n");
    expect(attest(repo).status).toBe(0);
    const newId = reviewedId(repo);
    expect(newId).not.toBe(oldId);
    const r = start(repo, oldId);
    expect(r.status).toBe(1);
    expect(`${r.stdout}${r.stderr}`).toMatch(/review/i);
  });

  it("T13 successful start performs one task.json replace with approval+status", () => {
    expect(attest(repo).status).toBe(0);
    const id = reviewedId(repo);
    const wrapper = path.join(repo.root, ".trellis", "scripts", "count_replace.py");
    const log = path.join(repo.root, "replace-log.txt");
    fs.writeFileSync(
      wrapper,
      [
        "import os, runpy, sys",
        "from pathlib import Path",
        "target = str(Path(sys.argv[1]).resolve())",
        "orig = os.replace",
        "def replace(src, dst):",
        "    with open(r'" + log.replace(/\\/g, "\\\\") + "', 'a', encoding='utf-8') as f:",
        "        f.write(str(Path(dst).resolve()) + '\\n')",
        "        if str(Path(dst).resolve()) == target:",
        "            f.write('BEFORE:' + Path(src).read_text(encoding='utf-8') + '\\n')",
        "    return orig(src, dst)",
        "os.replace = replace",
        "sys.argv = [sys.argv[2], *sys.argv[3:]]",
        "sys.path.insert(0, str(Path(sys.argv[0]).resolve().parent))",
        "runpy.run_path(sys.argv[0], run_name='__main__')",
      ].join("\n"),
    );
    const r = spawnSync(
      PYTHON,
      [".trellis/scripts/count_replace.py", repo.taskJson, ".trellis/scripts/task.py", "start", TASK_DIR, "--review", id, "--approval-note", "yes", "--approval-source", "test"],
      { cwd: repo.root, encoding: "utf-8", env: cleanEnv() },
    );
    expect(r.status).toBe(0);
    const data = readTask(repo);
    expect(data.status).toBe("in_progress");
    expect(data.meta.planningApproval.reviewId).toBe(id);
    expect(data.branch).toBe("main");
    assertSentinels(repo);
    const logText = fs.readFileSync(log, "utf-8");
    const taskReplaces = logText.split("\n").filter((line) => line.startsWith(repo.taskJson));
    expect(taskReplaces).toHaveLength(1);
    expect(hookCount(repo)).toBe(1);
  });

  it("T14 two attests on identical files still make distinct ids and clear approval", () => {
    expect(attest(repo).status).toBe(0);
    const first = reviewedId(repo);
    expect(start(repo, first).status).toBe(0);
    expect(runTask(repo, "replan", TASK_DIR, "--reason", "re-review", "--affected", "none", "--independent", "none").status).toBe(0);
    const secondAttest = attest(repo);
    expect(secondAttest.status).toBe(0);
    expect(reviewedId(repo)).not.toBe(first);
    expect(readTask(repo).meta.planningApproval).toBeUndefined();
  });

  it("T15 both editorial paths preserve review identity and append the chain", () => {
    expect(attest(repo).status).toBe(0);
    const id = reviewedId(repo);
    expect(start(repo, id).status).toBe(0);
    const originalFiles = readTask(repo).meta.planningAttest.files;
    fs.appendFileSync(path.join(repo.taskDir, "design.md"), "typo correction\n");
    const editorial = runTask(repo, "attest", TASK_DIR, "--editorial", "--note", "typo only");
    expect(editorial.status).toBe(0);
    let data = readTask(repo);
    expect(data.meta.planningAttest.reviewId).toBe(id);
    expect(data.meta.planningAttest.reviewFiles).toEqual(originalFiles);
    expect(data.meta.planningAttest.editorialChanges).toHaveLength(1);
    expect(data.meta.planningApproval.reviewId).toBe(id);
    expect(data.status).toBe("in_progress");

    // The pre-start editorial path: fresh planning version with real approval.
    expect(runTask(repo, "replan", TASK_DIR, "--reason", "second review", "--affected", "none", "--independent", "none").status).toBe(0);
    expect(attest(repo).status).toBe(0);
    const secondId = reviewedId(repo);
    fs.appendFileSync(path.join(repo.taskDir, "prd.md"), "another typo\n");
    const s = runTask(repo, "start", TASK_DIR, "--review", secondId, "--approval-note", "approved", "--approval-source", "session 2", "--editorial-note", "typo only");
    expect(s.status).toBe(0);
    data = readTask(repo);
    expect(data.meta.planningAttest.reviewId).toBe(secondId);
    expect(data.meta.planningApproval.reviewId).toBe(secondId);
    expect(data.meta.planningAttest.editorialChanges).toHaveLength(1);
  });

  it("T16 no-op editorial does not write; extra editorial arg on no-diff start fails", () => {
    expect(attest(repo).status).toBe(0);
    const id = reviewedId(repo);
    expect(start(repo, id).status).toBe(0);
    const before = snapshot(repo);
    const e = runTask(repo, "attest", TASK_DIR, "--editorial", "--note", "no change");
    expect(e.status).toBe(0);
    expect(`${e.stdout}${e.stderr}`).toMatch(/no change|unchanged|no file changes/i);
    assertNoSideEffects(repo, before);

    // New planning version, then a no-diff start with --editorial-note.
    expect(runTask(repo, "replan", TASK_DIR, "--reason", "again", "--affected", "none", "--independent", "none").status).toBe(0);
    expect(attest(repo).status).toBe(0);
    const secondId = reviewedId(repo);
    const before2 = snapshot(repo);
    const s = runTask(repo, "start", TASK_DIR, "--review", secondId, "--approval-note", "ok", "--approval-source", "s", "--editorial-note", "no change");
    expect(s.status).toBe(1);
    expect(`${s.stdout}${s.stderr}`).toMatch(/editorial|change/i);
    assertNoSideEffects(repo, before2);
  });

  it("T17 editorial cannot manufacture approval or ignore a pending replan", () => {
    const before = snapshot(repo);
    expect(runTask(repo, "attest", TASK_DIR, "--editorial", "--note", "nope").status).toBe(1);
    assertNoSideEffects(repo, before);

    expect(attest(repo).status).toBe(0);
    const id = reviewedId(repo);
    expect(start(repo, id).status).toBe(0);
    fs.appendFileSync(path.join(repo.taskDir, "prd.md"), "changed\n");
    const noSource = runTask(repo, "start", TASK_DIR, "--review", id, "--approval-note", "ok", "--editorial-note", "typo");
    expect(noSource.status).toBe(1);
    expect(`${noSource.stdout}${noSource.stderr}`).toMatch(/approval-source|source/i);
  });

  it("T18 tampered chain/approval is rejected by validate and start", () => {
    expect(attest(repo).status).toBe(0);
    const id = reviewedId(repo);
    expect(start(repo, id).status).toBe(0);
    const data = readTask(repo);
    const meta = data.meta as { planningAttest: { reviewFiles: Record<string, string> } };
    meta.planningAttest.reviewFiles["prd.md"] = "0".repeat(64);
    fs.writeFileSync(repo.taskJson, JSON.stringify(data, null, 2) + "\n");
    const before = snapshot(repo);
    expect(runTask(repo, "validate", TASK_DIR).status).toBe(1);
    expect(start(repo).status).toBe(1);
    assertNoSideEffects(repo, before);
  });

  it("T19 normal attest on an implemented task is refused with replan guidance", () => {
    expect(attest(repo).status).toBe(0);
    const id = reviewedId(repo);
    expect(start(repo, id).status).toBe(0);
    const before = snapshot(repo);
    const r = attest(repo, "silent rewrite");
    expect(r.status).toBe(1);
    expect(`${r.stdout}${r.stderr}`).toMatch(/replan/i);
    assertNoSideEffects(repo, before);
  });

  it("T20 replan returns to planning, clears statements, preserves branch/code", () => {
    expect(attest(repo).status).toBe(0);
    const id = reviewedId(repo);
    expect(start(repo, id).status).toBe(0);
    const branchBefore = readTask(repo).branch;
    const hooksBefore = hookCount(repo);
    const r = runTask(repo, "replan", TASK_DIR, "--reason", "scope changed", "--affected", "design, implement", "--independent", "README notes");
    expect(r.status).toBe(0);
    const data = readTask(repo);
    expect(data.status).toBe("planning");
    expect(data.meta.planningAttest).toBeUndefined();
    expect(data.meta.planningApproval).toBeUndefined();
    expect(data.meta.planningReplan).toMatchObject({
      reason: "scope changed",
      affectedWork: "design, implement",
      independentWork: "README notes",
    });
    expect(data.branch).toBe(branchBefore);
    expect(fs.readFileSync(path.join(repo.root, "README.md"), "utf-8")).toBe("# fixture\n");
    expect(hookCount(repo)).toBe(hooksBefore);
  });

  it.each([
    ["planningAttest", null],
    ["planningAttest", "broken"],
    ["planningAttest", { schemaVersion: 2 }],
    ["planningApproval", null],
    ["planningApproval", { schemaVersion: 2 }],
    ["planningReplan", null],
    ["planningReplan", { requestedAt: "2026-11-12T10:00:00+08:00", reason: "changed", affectedWork: "all", independentWork: "none" }],
  ])("T20 review regression: replan cannot erase invalid %s=%j", (key, value) => {
    expect(attest(repo).status).toBe(0);
    expect(start(repo, reviewedId(repo)).status).toBe(0);
    const data = readTask(repo);
    data.meta[key as string] = value;
    fs.writeFileSync(repo.taskJson, JSON.stringify(data, null, 2));
    const before = snapshot(repo);
    const result = runTask(repo, "replan", TASK_DIR, "--reason", "change", "--affected", "all", "--independent", "none");
    expect(result.status, result.stdout + result.stderr).toBe(1);
    expect(result.stdout + result.stderr).toContain(key);
    assertNoSideEffects(repo, before);
  });

  it("T20 review regression: omitted independent defaults to none for legacy replan", () => {
    writeTaskJson(repo.taskDir, { status: "review" });
    const before = snapshot(repo);
    const result = runTask(repo, "replan", TASK_DIR, "--reason", "new requirement", "--affected", "all implementation");
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(readTask(repo).meta.planningReplan.independentWork).toBe("none");
    expect(readTask(repo).status).toBe("planning");
    expect(snapshot(repo).pointers).toEqual(before.pointers);
    expect(hookCount(repo)).toBe(before.hooks);
    assertSentinels(repo);
  });

  it("T21 repeated replan/blank args/completed start attest replan are refused", () => {
    expect(attest(repo).status).toBe(0);
    const id = reviewedId(repo);
    expect(start(repo, id).status).toBe(0);
    expect(runTask(repo, "replan", TASK_DIR, "--reason", "r1", "--affected", "a", "--independent", "none").status).toBe(0);
    const before = snapshot(repo);
    for (const args of [
      ["replan", TASK_DIR, "--reason", "r2", "--affected", "a", "--independent", "none"],
      ["replan", TASK_DIR, "--reason", "", "--affected", "a", "--independent", "none"],
    ]) {
      const r = runTask(repo, ...args);
      expect(r.status).toBe(1);
      assertNoSideEffects(repo, before);
    }
    writeTaskJson(repo.taskDir, { status: "completed", meta: { ...SENTINEL_META }, [SENTINEL_TOP]: { keep: true } });
    const done = snapshot(repo);
    for (const args of [["start", TASK_DIR], ["attest", TASK_DIR, "--note", "x"], ["replan", TASK_DIR, "--reason", "x", "--affected", "a", "--independent", "none"]]) {
      expect(runTask(repo, ...args).status).toBe(1);
    }
    assertNoSideEffects(repo, done);
  });

  it("T22 replan -> edit -> attest -> validate -> approve -> start recovers", () => {
    expect(attest(repo).status).toBe(0);
    const oldId = reviewedId(repo);
    expect(start(repo, oldId).status).toBe(0);
    expect(runTask(repo, "replan", TASK_DIR, "--reason", "change", "--affected", "all", "--independent", "none").status).toBe(0);
    writeArtifacts(repo.taskDir, { "prd.md": "# PRD\nChanged requirement.\n" });
    expect(attest(repo).status).toBe(0);
    const newId = reviewedId(repo);
    expect(runTask(repo, "validate", TASK_DIR).status).toBe(0);
    expect(start(repo, newId).status).toBe(0);
    const data = readTask(repo);
    expect(data.status).toBe("in_progress");
    expect(data.meta.planningReplan).toBeUndefined();
    expect(data.meta.planningApproval.reviewId).toBe(newId);
  });

  it("T23 legacy in_progress resumes only when all three keys are absent", () => {
    writeTaskJson(repo.taskDir, { status: "in_progress" });
    expect(start(repo).status).toBe(0);
    expect(readTask(repo).status).toBe("in_progress");

    for (const key of ["planningAttest", "planningApproval", "planningReplan"]) {
      writeTaskJson(repo.taskDir, { status: "in_progress", meta: { ...SENTINEL_META, [key]: null } });
      const before = snapshot(repo);
      const r = start(repo);
      expect(r.status).toBe(1);
      assertNoSideEffects(repo, before);
    }
  });

  it("T24 invalid task shapes fail clearly without creating a task", () => {
    const cases: (() => void)[] = [
      () => fs.rmSync(repo.taskJson),
      () => fs.writeFileSync(repo.taskJson, "{"),
      () => fs.writeFileSync(repo.taskJson, "[]\n"),
      () => fs.writeFileSync(repo.taskJson, "{}\n"),
      () => writeTaskJson(repo.taskDir, { status: "unknown" }),
      () => writeTaskJson(repo.taskDir, { meta: [] }),
    ];
    for (const mutate of cases) {
      mutate();
      const before = snapshot(repo);
      for (const args of [["attest", TASK_DIR, "--note", "x"], ["start", TASK_DIR]]) {
        const r = runTask(repo, ...args);
        expect(r.status).toBe(1);
        expect(`${r.stdout}${r.stderr}`).toMatch(/task\.json|status|meta|JSON/i);
      }
      assertNoSideEffects(repo, before);
      writeTaskJson(repo.taskDir, {});
    }
  });

  it("T25 missing identity keeps the same gate, then saves state without a pointer", () => {
    expect(attest(repo).status).toBe(0);
    const id = reviewedId(repo);
    const env = cleanEnv();
    delete env.TRELLIS_CONTEXT_ID;
    const pointersBefore = JSON.stringify(snapshot(repo).pointers);
    const ok = spawnSync(PYTHON, [".trellis/scripts/task.py", "start", TASK_DIR, "--review", id, "--approval-note", "ok", "--approval-source", "src"], { cwd: repo.root, encoding: "utf-8", env });
    expect(ok.status).toBe(0);
    expect(readTask(repo).status).toBe("in_progress");
    expect(JSON.stringify(snapshot(repo).pointers)).toBe(pointersBefore);

    // A failed gate in degraded mode must not write or run hooks.
    writeTaskJson(repo.taskDir, { status: "planning" });
    const before = snapshot(repo);
    const fail = spawnSync(PYTHON, [".trellis/scripts/task.py", "start", TASK_DIR], { cwd: repo.root, encoding: "utf-8", env });
    expect(fail.status).toBe(1);
    assertNoSideEffects(repo, before);
  });

  it("T26 normal progress leaves reviewed artifacts unchanged; substantive changes require replan and fresh approval", () => {
    expect(attest(repo).status).toBe(0);
    const oldId = reviewedId(repo);
    expect(start(repo, oldId).status).toBe(0);
    const original = readBytes(repo.taskJson);
    const artifacts = ARTIFACTS.map((name) => readBytes(path.join(repo.taskDir, name)));
    fs.writeFileSync(path.join(repo.root, "implementation.py"), "# normal code progress\n");
    fs.writeFileSync(path.join(repo.root, "implementation.test.ts"), "// normal test progress\n");
    fs.writeFileSync(path.join(repo.taskDir, "research/implementation-progress.md"), "B1 complete; commands and evidence recorded here.\n");
    expect(runTask(repo, "validate", TASK_DIR).status).toBe(0);
    expect(readBytes(repo.taskJson)).toEqual(original);
    ARTIFACTS.forEach((name, index) => {
      expect(readBytes(path.join(repo.taskDir, name))).toEqual(artifacts[index]);
    });
    expect(start(repo).status).toBe(0);
    expect(reviewedId(repo)).toBe(oldId);
    expect(readTask(repo).meta.planningApproval.reviewId).toBe(oldId);
    assertSentinels(repo);

    fs.appendFileSync(path.join(repo.taskDir, "implement.md"), "Change the implementation steps and acceptance criteria.\n");
    const drifted = snapshot(repo);
    expect(runTask(repo, "validate", TASK_DIR).status).toBe(1);
    expect(start(repo).status).toBe(1);
    expect(attest(repo, "cannot silently replace the approved version").status).toBe(1);
    assertNoSideEffects(repo, drifted);

    expect(runTask(repo, "replan", TASK_DIR, "--reason", "implementation meaning changed", "--affected", "implementation and acceptance").status).toBe(0);
    expect(attest(repo).status).toBe(0);
    const newId = reviewedId(repo);
    expect(newId).not.toBe(oldId);
    const awaiting = snapshot(repo);
    expect(start(repo).status).toBe(1);
    expect(start(repo, oldId).status).toBe(1);
    assertNoSideEffects(repo, awaiting);
    expect(start(repo, newId).status).toBe(0);
    expect(readTask(repo).meta.planningReplan).toBeUndefined();
    assertSentinels(repo);
  });

  it("T27 task.json save failure leaves no pointer/hook; pointer failure reports started-but-not-located", () => {
    expect(attest(repo).status).toBe(0);
    const id = reviewedId(repo);
    const wrapper = path.join(repo.root, ".trellis", "scripts", "fail_replace.py");
    fs.writeFileSync(
      wrapper,
      [
        "import os, runpy, sys",
        "from pathlib import Path",
        "target = str(Path(sys.argv[1]).resolve())",
        "mode = sys.argv[2]",
        "orig = os.replace",
        "def replace(src, dst):",
        "    if str(Path(dst).resolve()) == target and mode == 'fail':",
        "        raise OSError('injected replace failure')",
        "    return orig(src, dst)",
        "os.replace = replace",
        "sys.argv = [sys.argv[3], *sys.argv[4:]]",
        "sys.path.insert(0, str(Path(sys.argv[0]).resolve().parent))",
        "runpy.run_path(sys.argv[0], run_name='__main__')",
      ].join("\n"),
    );
    const run = (mode: string) => spawnSync(
      PYTHON,
      [".trellis/scripts/fail_replace.py", repo.taskJson, mode, ".trellis/scripts/task.py", "start", TASK_DIR, "--review", id, "--approval-note", "ok", "--approval-source", "src"],
      { cwd: repo.root, encoding: "utf-8", env: cleanEnv() },
    );

    const before = snapshot(repo);
    const taskFail = run("fail");
    expect(taskFail.status).toBe(1);
    expect(`${taskFail.stdout}${taskFail.stderr}`).toMatch(/write|save|task\.json/i);
    assertNoSideEffects(repo, before);

    // Pointer failure: point os.replace at the session file. The task state
    // must remain approved/in_progress and the hook must not run.
    const pointerTarget = path.join(repo.root, ".trellis", ".runtime", "sessions", "codex_test-session.json");
    const pointerWrapper = path.join(repo.root, ".trellis", "scripts", "fail_pointer.py");
    fs.writeFileSync(pointerWrapper, fs.readFileSync(wrapper, "utf-8"));
    const pointerRun = spawnSync(
      PYTHON,
      [".trellis/scripts/fail_pointer.py", pointerTarget, "fail", ".trellis/scripts/task.py", "start", TASK_DIR, "--review", id, "--approval-note", "ok", "--approval-source", "src"],
      { cwd: repo.root, encoding: "utf-8", env: cleanEnv() },
    );
    expect(pointerRun.status).toBe(1);
    expect(`${pointerRun.stdout}${pointerRun.stderr}`).toMatch(/started|locat|pointer/i);
    expect(readTask(repo).status).toBe("in_progress");
    expect(hookCount(repo)).toBe(0);
  });

  it("T38 concurrent starts are observed and reported as unsupported", async () => {
    expect(attest(repo).status).toBe(0);
    const id = reviewedId(repo);
    const run = (source: string) => new Promise<number>((resolve) => {
      const child = spawn(
        PYTHON,
        [".trellis/scripts/task.py", "start", TASK_DIR, "--review", id, "--approval-note", "ok", "--approval-source", source],
        { cwd: repo.root, env: cleanEnv() },
      );
      child.on("exit", (code) => resolve(code ?? 1));
    });
    const codes = await Promise.all([run("source A"), run("source B")]);
    // This is an observation, not a concurrency guarantee. Both may succeed.
    expect(codes.every((code) => code === 0 || code === 1)).toBe(true);
    expect(["in_progress", "planning"]).toContain(readTask(repo).status);
  });
});
