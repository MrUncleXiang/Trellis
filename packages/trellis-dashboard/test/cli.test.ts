import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { parseArgs, USAGE } from "../src/cli.js";
import { normalizeProjectRoot, resolveInside, PathEscapeError } from "../src/paths.js";

const cleanup: (() => void)[] = [];

afterEach(() => {
  for (const fn of cleanup.splice(0).reverse()) fn();
});

function tmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dash-cli-"));
  cleanup.push(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, ".trellis", "tasks"), { recursive: true });
  return dir;
}

describe("parseArgs", () => {
  it("requires an explicit project root", () => {
    const result = parseArgs([]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("--project is required");
  });

  it("rejects unknown flags instead of guessing", () => {
    const project = tmpProject();
    const result = parseArgs(["--projct", project]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("unknown argument");
  });

  it("does not let a flag swallow the next flag as its value", () => {
    const result = parseArgs(["--project", "--dsh-home", "x"]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("--project requires a value");
  });

  it("rejects a trailing flag with no value", () => {
    const project = tmpProject();
    const result = parseArgs(["--project", project, "--unsupported"]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("unknown argument: --unsupported");
  });

  it("rejects a directory that is not a Trellis project", () => {
    const bare = fs.mkdtempSync(path.join(os.tmpdir(), "dash-bare-"));
    cleanup.push(() => fs.rmSync(bare, { recursive: true, force: true }));

    expect(parseArgs(["--project", bare]).ok).toBe(false);
  });

  it("accepts a real Trellis project", () => {
    const project = tmpProject();
    const result = parseArgs(["--project", project]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.options).toEqual({ projectRoot: fs.realpathSync.native(project) });
    }
  });

  it("rejects assistant-history options", () => {
    const project = tmpProject();
    const result = parseArgs(["--project", project, "--dsh-home", ".dsh"]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("unknown argument: --dsh-home");
  });

  it("prints usage for --help", () => {
    const result = parseArgs(["--help"]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(USAGE);
      expect(result.help).toBe(true);
    }
  });
});
describe("path containment", () => {
  it("resolves paths inside the root", () => {
    const root = tmpProject();

    expect(resolveInside(root, ".trellis/tasks")).toBe(path.join(root, ".trellis", "tasks"));
  });

  it("refuses traversal out of the root", () => {
    const root = tmpProject();

    expect(() => resolveInside(root, "../outside")).toThrowError(PathEscapeError);
  });

  it("refuses an absolute path outside the root", () => {
    const root = tmpProject();

    expect(() => resolveInside(root, os.tmpdir())).toThrowError(PathEscapeError);
  });

  it("refuses a symlink that points outside the root", () => {
    const root = tmpProject();
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "dash-outside-"));
    cleanup.push(() => fs.rmSync(outside, { recursive: true, force: true }));
    const link = path.join(root, "link");
    try {
      fs.symlinkSync(outside, link, "dir");
    } catch {
      return;
    }

    expect(() => resolveInside(root, "link")).toThrowError(PathEscapeError);
  });

  it("normalizes an existing project root and rejects a missing one", () => {
    const root = tmpProject();

    expect(normalizeProjectRoot(root)).toBe(fs.realpathSync.native(root));
    expect(normalizeProjectRoot(path.join(root, "missing"))).toBeNull();
    expect(normalizeProjectRoot("")).toBeNull();
  });
});
