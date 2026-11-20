/**
 * Read-only task reader.
 *
 * Tasks live at `<project>/.trellis/tasks/<dir>/task.json`; archived tasks are
 * read only when requested. Nothing here writes, renames, or normalizes files.
 */

import * as fs from "node:fs";
import * as path from "node:path";

import { resolveInside } from "./paths.js";
import type { CanvasTaskCard, TaskCard, TaskIndex } from "./types.js";

export { PLANNING_STATUSES, IN_PROGRESS_STATUSES } from "./columns.js";

export interface TaskRecordOnDisk {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  status?: unknown;
  name?: unknown;
  priority?: unknown;
  assignee?: unknown;
  createdAt?: unknown;
  completedAt?: unknown;
  package?: unknown;
  scope?: unknown;
  parent?: unknown;
  children?: unknown;
  subtasks?: unknown;
}

export interface NormalizedTask extends TaskCard {
  directoryName: string;
  parentReference: string | null;
  childReferences: string[];
}

type TaskRecordCard = NormalizedTask;

export interface ReadTasksResult {
  tasks: NormalizedTask[];
  skipped: number;
  warnings: string[];
}

export interface ReadTasksOptions {
  includeArchived?: boolean;
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Normalize one raw `task.json` into a card.
 *
 * Returns `undefined` when the record carries no usable identity — better to
 * count a skip than render a blank card.
 */
export function normalizeTaskRecord(
  raw: TaskRecordOnDisk,
  dirName: string,
  options: { key?: string; isArchived?: boolean } = {},
): TaskRecordCard | undefined {
  const taskId = asTrimmedString(raw.id);
  const title = asTrimmedString(raw.title) ?? asTrimmedString(raw.name);
  if (taskId === undefined && title === undefined) return undefined;
  return {
    key: options.key ?? dirName,
    taskId: taskId ?? dirName,
    title: title ?? dirName,
    description: asTrimmedString(raw.description) ?? "",
    status: asTrimmedString(raw.status) ?? "unknown",
    priority: asTrimmedString(raw.priority) ?? "P2",
    assignee: asTrimmedString(raw.assignee) ?? "",
    createdAt: asTrimmedString(raw.createdAt) ?? "",
    completedAt: asTrimmedString(raw.completedAt) ?? null,
    package: asTrimmedString(raw.package) ?? null,
    scope: asTrimmedString(raw.scope) ?? null,
    hasParent: asTrimmedString(raw.parent) !== undefined,
    childCount: uniqueStringCount(raw.children, raw.subtasks),
    isArchived: options.isArchived ?? false,
    directoryName: dirName,
    parentReference: asTrimmedString(raw.parent) ?? null,
    childReferences: [...new Set([...stringArray(raw.children), ...stringArray(raw.subtasks)])],
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim())
    : [];
}

function uniqueStringCount(...values: unknown[]): number {
  const items = new Set<string>();
  for (const value of values) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.trim().length > 0) items.add(item);
      }
    }
  }
  return items.size;
}

function readTaskDirectories(
  directory: string,
  options: { isArchived: boolean; keyFor: (name: string) => string },
): { tasks: NormalizedTask[]; skipped: number; warnings: string[] } {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return { tasks: [], skipped: 0, warnings: [] };
  }

  const tasks: NormalizedTask[] = [];
  const warnings: string[] = [];
  let skipped = 0;
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith(".") || (!options.isArchived && entry.name === "archive")) continue;
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

    let taskDir: string;
    try {
      taskDir = resolveInside(directory, entry.name);
    } catch {
      skipped += 1;
      warnings.push(`skipped a task directory outside the project: ${entry.name}`);
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(resolveInside(taskDir, "task.json"), "utf8"));
    } catch {
      skipped += 1;
      continue;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      skipped += 1;
      continue;
    }

    const card = normalizeTaskRecord(parsed as TaskRecordOnDisk, entry.name, {
      key: options.keyFor(entry.name),
      isArchived: options.isArchived,
    });
    if (!card) {
      skipped += 1;
      continue;
    }
    tasks.push(card);
  }

  return { tasks, skipped, warnings };
}

function readArchivedTasks(tasksDir: string): ReadTasksResult {
  let archiveDir: string;
  try {
    archiveDir = resolveInside(tasksDir, "archive");
  } catch {
    return { tasks: [], skipped: 0, warnings: ["skipped an archive directory outside the project"] };
  }

  let months: fs.Dirent[];
  try {
    months = fs.readdirSync(archiveDir, { withFileTypes: true });
  } catch {
    return { tasks: [], skipped: 0, warnings: [] };
  }

  const result: ReadTasksResult = { tasks: [], skipped: 0, warnings: [] };
  for (const month of months.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month.name)) continue;
    if (!month.isDirectory() && !month.isSymbolicLink()) continue;

    let monthDir: string;
    try {
      monthDir = resolveInside(archiveDir, month.name);
    } catch {
      result.skipped += 1;
      result.warnings.push(`skipped an archive month outside the project: ${month.name}`);
      continue;
    }

    const monthTasks = readTaskDirectories(monthDir, {
      isArchived: true,
      keyFor: (name) => `archive:${month.name}:${name}`,
    });
    result.tasks.push(...monthTasks.tasks);
    result.skipped += monthTasks.skipped;
    result.warnings.push(...monthTasks.warnings);
  }
  return result;
}

/** List active tasks and, only when requested, archived task records. */
export function readTasks(
  projectRoot: string,
  options: ReadTasksOptions = {},
): ReadTasksResult {
  let tasksDir: string;
  try {
    tasksDir = resolveInside(projectRoot, path.join(".trellis", "tasks"));
  } catch {
    return { tasks: [], skipped: 0, warnings: ["task directory could not be read"] };
  }

  const active = readTaskDirectories(tasksDir, {
    isArchived: false,
    keyFor: (name) => name,
  });
  if (!options.includeArchived) return active;

  const archived = readArchivedTasks(tasksDir);
  return {
    tasks: [...active.tasks, ...archived.tasks],
    skipped: active.skipped + archived.skipped,
    warnings: [...active.warnings, ...archived.warnings],
  };
}

/** Public index projection — strips internal directory and relation references. */
export function toTaskIndex(result: ReadTasksResult): TaskIndex {
  const tasksByDirectory = new Map<string, NormalizedTask[]>();
  for (const task of result.tasks) {
    const matches = tasksByDirectory.get(task.directoryName) ?? [];
    matches.push(task);
    tasksByDirectory.set(task.directoryName, matches);
  }
  const resolveUniqueTask = (directoryName: string): NormalizedTask | undefined => {
    const matches = tasksByDirectory.get(directoryName);
    return matches?.length === 1 ? matches[0] : undefined;
  };

  return {
    tasks: result.tasks.map((task): CanvasTaskCard => ({
      key: task.key,
      taskId: task.taskId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      package: task.package,
      scope: task.scope,
      hasParent: task.hasParent,
      childCount: task.childCount,
      isArchived: task.isArchived,
      parentKey: task.parentReference === null
        ? null
        : resolveUniqueTask(task.parentReference)?.key ?? null,
      childKeys: task.childReferences
        .map(resolveUniqueTask)
        .filter((child): child is NormalizedTask => child !== undefined)
        .map((child) => child.key),
    })),
    skippedTasks: result.skipped,
    warnings: result.warnings,
  };
}

/** Find one task by directory key, without ever accepting a path. */
export function findTask(
  result: ReadTasksResult,
  key: string,
): NormalizedTask | undefined {
  if (typeof key !== "string" || key.length === 0) return undefined;
  if (key.includes("/") || key.includes("\\") || key.includes("\0")) return undefined;
  if (key === ".." || key === ".") return undefined;
  return result.tasks.find((task) => task.key === key);
}
