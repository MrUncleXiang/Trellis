/**
 * Shared Python interpreter lookup for tests that spawn the real scripts.
 *
 * Windows installs the interpreter as `python.exe`; `python3` there is either
 * absent or the Microsoft Store stub (`...\WindowsApps\python3.exe`), which
 * exits 9009 instead of running. Hard-coding `"python3"` therefore made whole
 * integration suites silently skip on Windows — the guard's `hasPython()`
 * probe failed, so the tests never ran and never reported a problem.
 *
 * `PYTHON` is what the product itself resolves (`getPythonCommandForPlatform`),
 * so a test that fails here is a real cross-platform failure, not a harness
 * artefact.
 */
import { execFileSync } from "node:child_process";

export const PYTHON = process.platform === "win32" ? "python" : "python3";

/** True when an interpreter is actually runnable — not just present on PATH. */
export function hasPython(): boolean {
  try {
    execFileSync(PYTHON, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
