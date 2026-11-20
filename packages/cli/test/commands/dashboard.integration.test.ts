import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cliBin = new URL("../../bin/trellis.js", import.meta.url);
const taskKey = "11-18-synthetic-dashboard";

describe("trellis dashboard", () => {
  let root: string;
  let project: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "trellis-dashboard-")));
    project = path.join(root, "sample project");
    fs.mkdirSync(project);
    env = {
      ...process.env,
      HOME: root,
      USERPROFILE: root,
    };
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("explains how to start from a project when the current directory is uninitialized", () => {
    const result = spawnSync(process.execPath, [fileURLToPath(cliBin), "dashboard"], {
      cwd: project,
      env,
      encoding: "utf8",
      timeout: 5_000,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("not a Trellis project (no .trellis/tasks)");
    expect(fs.readdirSync(project)).toEqual([]);
  });

  it("serves task cards without reading assistant sessions until interrupted", async () => {
    const taskDir = path.join(project, ".trellis", "tasks", taskKey);
    const taskFile = path.join(taskDir, "task.json");
    const archiveTaskDir = path.join(project, ".trellis", "tasks", "archive", "2026-11", "11-17-synthetic-archive");
    const archiveTaskFile = path.join(archiveTaskDir, "task.json");
    const task = JSON.stringify({
      id: "synthetic-dashboard",
      title: "Synthetic dashboard task",
      description: "Fixture only",
      status: "in_progress",
    });
    const archivedTask = JSON.stringify({
      id: "synthetic-archived-dashboard",
      title: "Synthetic archived dashboard task",
      description: "Fixture only",
      status: "completed",
    });
    fs.mkdirSync(taskDir, { recursive: true });
    fs.writeFileSync(taskFile, task);
    fs.mkdirSync(archiveTaskDir, { recursive: true });
    fs.writeFileSync(archiveTaskFile, archivedTask);

    const launcher = path.join(root, "launch.mjs");
    fs.writeFileSync(launcher, `
      process.once("message", () => {
        process.disconnect();
        process.emit("SIGINT", "SIGINT");
      });
      await import(${JSON.stringify(cliBin.href)});
    `);
    const child = spawn(process.execPath, [launcher, "dashboard"], {
      cwd: project,
      env,
      stdio: ["ignore", "pipe", "pipe", "ipc"],
      timeout: 9_000,
    });
    const exited = once(child, "close");
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

    try {
      const origin = await Promise.race([
        vi.waitFor(() => {
          const address = /Trellis dashboard: (http:\/\/127\.0\.0\.1:\d+)/.exec(stdout)?.[1];
          if (!address) throw new Error(stderr || "Dashboard did not print a loopback address");
          return address;
        }, { timeout: 5_000 }),
        exited.then(() => { throw new Error(`Dashboard exited during startup: ${stderr || stdout}`); }),
      ]);

      const page = await fetch(origin);
      expect(page.ok).toBe(true);
      expect(await page.text()).toContain("/app.js");
      for (const asset of ["/app.js", "/app.css"]) {
        const response = await fetch(`${origin}${asset}`);
        expect(response.ok).toBe(true);
        expect(await response.text()).not.toBe("");
      }

      const tasks = await fetch(`${origin}/api/tasks`);
      const payload = await tasks.json() as { tasks: { taskId: string }[] };
      expect(payload.tasks).toMatchObject([{ taskId: "synthetic-dashboard" }]);
      const archiveTasks = await fetch(`${origin}/api/tasks?includeArchived=true`);
      const archivePayload = await archiveTasks.json() as {
        tasks: { taskId: string; isArchived: boolean }[];
      };
      expect(archivePayload.tasks).toMatchObject([
        { taskId: "synthetic-dashboard", isArchived: false },
        { taskId: "synthetic-archived-dashboard", isArchived: true },
      ]);
      expect(JSON.stringify(payload)).not.toContain("session");
      expect((await fetch(`${origin}/api/task-counts`)).status).toBe(404);
      expect((await fetch(`${origin}/api/tasks/${taskKey}`)).status).toBe(404);

      child.send("stop");
      await expect(exited).resolves.toEqual([0, null]);
      await expect(fetch(origin)).rejects.toThrow();
      expect(fs.readFileSync(taskFile, "utf8")).toBe(task);
      expect(fs.readFileSync(archiveTaskFile, "utf8")).toBe(archivedTask);
      expect(fs.readdirSync(path.join(project, ".trellis"))).toEqual(["tasks"]);
    } finally {
      child.kill();
      await exited;
    }
  });
});
