/**
 * Status groups used by callers that need the original two-lane view.
 *
 * Kept out of the browser entry point so the split is a pure, testable
 * function instead of markup logic buried in a DOM callback. The task canvas
 * uses its hierarchy layout and does not filter cards through these groups.
 */

/** Statuses that fill the planning column. */
export const PLANNING_STATUSES = ["planning", "brainstorm"] as const;

/** Statuses that fill the in-progress column. */
export const IN_PROGRESS_STATUSES = ["in_progress", "in-progress"] as const;

export interface StatusedCard {
  status: string;
}

export interface TaskColumns<T extends StatusedCard> {
  planning: T[];
  inProgress: T[];
}

/**
 * Split cards into the two columns, preserving the input order.
 *
 * The comparison is exact and case-sensitive on purpose: `task.json` is written
 * by `task.py`, so an unexpected spelling is a data problem to surface, not
 * something to guess at.
 */
export function partitionTaskCards<T extends StatusedCard>(cards: readonly T[]): TaskColumns<T> {
  const planning = new Set<string>(PLANNING_STATUSES);
  const inProgress = new Set<string>(IN_PROGRESS_STATUSES);
  return {
    planning: cards.filter((card) => planning.has(card.status)),
    inProgress: cards.filter((card) => inProgress.has(card.status)),
  };
}
