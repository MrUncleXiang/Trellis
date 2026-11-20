/**
 * Public data shapes for the local dashboard.
 *
 * Everything here is JSON-serializable and deliberately narrow: it carries the
 * fields the page renders and nothing else. No absolute user paths or raw task
 * records are sent to the browser.
 */

/** One task card. */
export interface TaskCard {
  /** Stable project-local view key; archived task keys use an archive prefix. */
  key: string;
  /** `task.json` id. */
  taskId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee: string;
  createdAt: string;
  completedAt: string | null;
  package: string | null;
  scope: string | null;
  hasParent: boolean;
  childCount: number;
  isArchived: boolean;
}

/** Task card shown on the canvas with project-local hierarchy links. */
export interface CanvasTaskCard extends TaskCard {
  parentKey: string | null;
  childKeys: string[];
}

/** Aggregate response for the index page. */
export interface TaskIndex {
  tasks: CanvasTaskCard[];
  /** Count of task directories that could not be parsed. */
  skippedTasks: number;
  warnings: string[];
}
