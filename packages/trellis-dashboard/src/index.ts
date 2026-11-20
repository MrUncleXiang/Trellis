/**
 * Public entry points for `@mindfoldhq/trellis-dashboard`.
 *
 * The package reads Trellis task metadata only and binds the HTTP server to
 * loopback.
 */

export { readTasks, findTask, toTaskIndex, normalizeTaskRecord } from "./task-reader.js";
export type { NormalizedTask, ReadTasksOptions, ReadTasksResult } from "./task-reader.js";
export { createDashboardServer } from "./server/app.js";
export type { DashboardServer, DashboardServerOptions } from "./server/app.js";
export { assertLoopbackBind, admitRequest, LOOPBACK_HOST } from "./server/host-guard.js";
export { normalizeProjectRoot, resolveInside, PathEscapeError } from "./paths.js";
export {
  partitionTaskCards,
  PLANNING_STATUSES,
  IN_PROGRESS_STATUSES,
} from "./columns.js";
export type { StatusedCard, TaskColumns } from "./columns.js";
export type { TaskCard, TaskIndex } from "./types.js";
