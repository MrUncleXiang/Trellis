import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createDashboardServer } from "../dist/index.js";

const projectRoot = await mkdtemp(join(tmpdir(), "trellis-dashboard-demo-"));
const parentDirectory = "11-18-sample-parent";

try {
  const tasks = [
    {
      directory: parentDirectory,
      id: "sample-parent",
      title: "Improve the task canvas",
      description: "Show task purpose, status and parent-child relationships.",
      status: "in_progress",
      children: ["11-18-sample-planning", "11-18-sample-review"],
    },
    {
      directory: "11-18-sample-planning",
      id: "sample-planning",
      title: "Plan the layout",
      description: "Arrange related tasks from left to right.",
      status: "planning",
      parent: parentDirectory,
    },
    {
      directory: "11-18-sample-review",
      id: "sample-review",
      title: "Review the status colors",
      description: "Check that each status is clear without relying only on color.",
      status: "review",
      parent: parentDirectory,
    },
    {
      directory: "11-18-sample-completed",
      id: "sample-completed",
      title: "Keep task details readable",
      description: "Show each task ID and its metadata in the details panel.",
      status: "completed",
    },
    {
      directory: "11-18-sample-other",
      id: "sample-other",
      title: "Handle unfamiliar statuses",
      description: "Preserve status text that the dashboard does not recognize.",
      status: "blocked",
    },
    {
      directory: "archive/2026-11/11-17-sample-archived",
      id: "sample-archived",
      title: "Older task layout",
      description: "An archived sample shown only after turning on the toggle.",
      status: "completed",
    },
  ];

  for (const task of tasks) {
    const directory = join(projectRoot, ".trellis", "tasks", task.directory);
    await mkdir(directory, { recursive: true });
    const { directory: _directory, ...record } = task;
    await writeFile(join(directory, "task.json"), JSON.stringify(record));
  }

  const dashboard = await createDashboardServer({ projectRoot }).listen();
  console.log(`http://${dashboard.address}:${dashboard.port}`);
  await new Promise((resolve) => {
    process.once("SIGINT", resolve);
    process.once("SIGTERM", resolve);
  });
  await dashboard.close();
} finally {
  await rm(projectRoot, { recursive: true, force: true });
}
