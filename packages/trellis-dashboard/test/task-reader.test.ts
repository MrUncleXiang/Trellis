import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { findTask, normalizeTaskRecord, readTasks, toTaskIndex } from "../src/task-reader.js";

const created: string[] = [];

function tmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dash-task-"));
  created.push(dir);
  fs.mkdirSync(path.join(dir, ".trellis", "tasks"), { recursive: true });
  return dir;
}

function writeTask(project: string, dirName: string, record: Record<string, unknown>): void {
  const dir = path.join(project, ".trellis", "tasks", dirName);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "task.json"), JSON.stringify(record), "utf8");
}

afterEach(() => {
  for (const dir of created.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("readTasks", () => {
  it("keeps planning and in_progress cards separate with their own text", () => {
    const project = tmpProject();
    writeTask(project, "01-01-alpha", {
      id: "alpha",
      title: "Alpha title",
      description: "Alpha description",
      status: "planning",
    });
    writeTask(project, "01-02-beta", {
      id: "beta",
      title: "Beta title",
      description: "Beta description",
      status: "in_progress",
    });

    const index = toTaskIndex(readTasks(project));

    expect(index.tasks.map((t) => t.status)).toEqual(["planning", "in_progress"]);
    expect(index.tasks[0]).toMatchObject({ title: "Alpha title", description: "Alpha description" });
    expect(index.tasks[1]).toMatchObject({ title: "Beta title", description: "Beta description" });
  });

  it("loads archived tasks only when explicitly requested", () => {
    const project = tmpProject();
    writeTask(project, "01-01-live", {
      id: "live", title: "Live", description: "Active task", status: "in_progress",
    });
    writeTask(project, "archive/2026-01/01-01-old", {
      id: "old", title: "Old", description: "Archived task", status: "completed",
    });

    const activeOnly = toTaskIndex(readTasks(project));
    const result = readTasks(project, { includeArchived: true });
    const withArchive = toTaskIndex(result);

    expect(activeOnly.tasks.map((task) => task.taskId)).toEqual(["live"]);
    expect(withArchive.tasks.map((task) => task.taskId)).toEqual(["live", "old"]);
    expect(withArchive.tasks[0]?.isArchived).toBe(false);
    expect(withArchive.tasks[1]).toMatchObject({ isArchived: true, status: "completed" });
    expect(withArchive.tasks[1]?.key).toMatch(/^archive:2026-01:/);
    const archivedRecord = result.tasks.find((task) => task.isArchived);
    expect(archivedRecord?.key).not.toContain("/");
    expect(findTask(result, archivedRecord?.key ?? "")?.taskId).toBe("old");
  });

  it("omits hierarchy links when an active and archived directory name is ambiguous", () => {
    const project = tmpProject();
    writeTask(project, "01-01-parent", {
      id: "parent", title: "Parent", description: "", status: "planning",
      children: ["01-02-shared"],
    });
    writeTask(project, "01-02-shared", {
      id: "active-child", title: "Active child", description: "", status: "in_progress",
      parent: "01-01-parent",
    });
    writeTask(project, "archive/2026-01/01-02-shared", {
      id: "archived-child", title: "Archived child", description: "", status: "completed",
      parent: "01-01-parent",
    });

    const index = toTaskIndex(readTasks(project, { includeArchived: true }));

    expect(index.tasks.find((task) => task.key === "01-01-parent")?.childKeys).toEqual([]);
    expect(index.tasks.find((task) => task.key === "01-02-shared" && !task.isArchived)?.parentKey)
      .toBe("01-01-parent");
    expect(index.tasks.find((task) => task.isArchived)?.parentKey).toBe("01-01-parent");
  });

  it("refuses an archive directory redirected outside the selected project", () => {
    const project = tmpProject();
    const otherProject = tmpProject();
    writeTask(otherProject, "archive/2026-01/01-01-outside", {
      id: "outside", title: "Outside", description: "", status: "completed",
    });
    const archiveDir = path.join(project, ".trellis", "tasks", "archive");
    fs.symlinkSync(path.join(otherProject, ".trellis", "tasks", "archive"), archiveDir, "junction");

    const result = readTasks(project, { includeArchived: true });

    expect(result.tasks).toEqual([]);
    expect(result.warnings).toContain("skipped an archive directory outside the project");
  });

  it("projects useful task metadata without exposing private operational fields", () => {
    const project = tmpProject();
    writeTask(project, "01-01-alpha", {
      id: "alpha", title: "Alpha", description: "Description", status: "planning",
      priority: "P1", assignee: "Developer", createdAt: "2026-01-01", completedAt: null,
      package: "cli", scope: "dashboard", parent: "01-00-parent", children: ["01-02-child"],
      branch: "private-branch", worktree_path: "private-path", notes: "private-notes",
      relatedFiles: ["private-file"],
    });

    const index = toTaskIndex(readTasks(project));
    const task = index.tasks[0];

    expect(task).toMatchObject({
      priority: "P1", assignee: "Developer", createdAt: "2026-01-01", completedAt: null,
      package: "cli", scope: "dashboard", hasParent: true, childCount: 1,
    });
    expect(JSON.stringify(index)).not.toContain("private-branch");
    expect(JSON.stringify(index)).not.toContain("private-path");
    expect(JSON.stringify(index)).not.toContain("private-notes");
    expect(JSON.stringify(index)).not.toContain("private-file");
    expect(JSON.stringify(index)).not.toContain("01-00-parent");
    expect(JSON.stringify(index)).not.toContain("01-02-child");
  });

  it("projects only task hierarchy links that resolve inside the selected project", () => {
    const project = tmpProject();
    writeTask(project, "01-01-parent", {
      id: "parent", title: "Parent", description: "", status: "planning",
      children: ["01-02-child", "outside-child"],
    });
    writeTask(project, "01-02-child", {
      id: "child", title: "Child", description: "", status: "in_progress",
      parent: "01-01-parent",
    });

    const index = toTaskIndex(readTasks(project));

    expect(index.tasks.find((task) => task.key === "01-01-parent")?.childKeys)
      .toEqual(["01-02-child"]);
    expect(index.tasks.find((task) => task.key === "01-02-child")?.parentKey)
      .toBe("01-01-parent");
    expect(JSON.stringify(index)).not.toContain("outside-child");
  });

  it("skips the archive directory and dot directories", () => {
    const project = tmpProject();
    writeTask(project, "01-01-live", { id: "live", title: "Live", description: "", status: "planning" });
    writeTask(project, "archive/2026-01/01-01-old", { id: "old", title: "Old", description: "", status: "completed" });
    writeTask(project, ".hidden", { id: "hidden", title: "Hidden", description: "", status: "planning" });

    const index = toTaskIndex(readTasks(project));

    expect(index.tasks.map((t) => t.taskId)).toEqual(["live"]);
  });

  it("counts unreadable task directories instead of failing", () => {
    const project = tmpProject();
    fs.mkdirSync(path.join(project, ".trellis", "tasks", "01-01-broken"));
    writeTask(project, "01-02-good", { id: "good", title: "Good", description: "", status: "planning" });

    const index = toTaskIndex(readTasks(project));

    expect(index.tasks.map((t) => t.taskId)).toEqual(["good"]);
    expect(index.skippedTasks).toBe(1);
  });

  it("does not read a task collection redirected outside the selected project", () => {
    const project = tmpProject();
    const other = tmpProject();
    writeTask(other, "01-01-outside", { id: "outside", title: "Outside project" });
    const tasks = path.join(project, ".trellis", "tasks");
    fs.rmdirSync(tasks);
    fs.symlinkSync(path.join(other, ".trellis", "tasks"), tasks, "junction");

    expect(readTasks(project)).toMatchObject({ tasks: [], warnings: [expect.any(String)] });
  });

  it("falls back to the directory name when title and id are missing", () => {
    expect(normalizeTaskRecord({ title: "Only title" }, "01-01-dir")).toMatchObject({
      key: "01-01-dir",
      taskId: "01-01-dir",
      title: "Only title",
    });
    expect(normalizeTaskRecord({}, "01-01-dir")).toBeUndefined();
  });

  it("refuses path-like keys when looking a task up", () => {
    const project = tmpProject();
    writeTask(project, "01-01-alpha", { id: "alpha", title: "Alpha", description: "", status: "planning" });
    const tasks = readTasks(project);

    expect(findTask(tasks, "01-01-alpha")?.taskId).toBe("alpha");
    expect(findTask(tasks, "../01-01-alpha")).toBeUndefined();
    expect(findTask(tasks, "..\\01-01-alpha")).toBeUndefined();
    expect(findTask(tasks, "..")).toBeUndefined();
  });

  it("never puts the absolute task directory into the index projection", () => {
    const project = tmpProject();
    writeTask(project, "01-01-alpha", { id: "alpha", title: "Alpha", description: "", status: "planning" });

    const serialized = JSON.stringify(toTaskIndex(readTasks(project)));

    expect(serialized.includes(project.replace(/\\/g, "\\\\"))).toBe(false);
    expect(serialized.includes("prd.md")).toBe(false);
  });
});
