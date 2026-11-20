/**
 * Path containment helpers.
 *
 * Every dashboard filesystem read resolves through {@link resolveInside} so a
 * crafted task directory name or symlink cannot redirect reads outside the
 * selected project's task files.
 */

import * as fs from "node:fs";
import * as path from "node:path";

/** Raised when a path would escape a declared root. */
export class PathEscapeError extends Error {
  constructor(root: string) {
    super(`refused to read a path outside ${root}`);
    this.name = "PathEscapeError";
  }
}

function isInside(parent: string, child: string): boolean {
  const rel = path.relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * Resolve the real path of `target`, canonicalizing the deepest existing
 * ancestor and re-appending the missing tail.
 */
export function realpathOfDeepestExisting(target: string): string {
  const absolute = path.resolve(target);
  const missing: string[] = [];
  let current = absolute;
  for (;;) {
    try {
      const real = fs.realpathSync.native(current);
      return missing.length === 0 ? real : path.join(real, ...missing.reverse());
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return absolute;
      missing.push(path.basename(current));
      current = parent;
    }
  }
}

/**
 * Resolve `candidate` against `root` and refuse anything that escapes it.
 *
 * The realpath comparison means a symlinked subdirectory cannot smuggle the
 * read somewhere else.
 */
export function resolveInside(root: string, candidate: string): string {
  const absoluteRoot = path.resolve(root);
  const realRoot = realpathOfDeepestExisting(absoluteRoot);
  const resolved = path.resolve(absoluteRoot, candidate);
  const realTarget = realpathOfDeepestExisting(resolved);
  const insideRoot = resolved === absoluteRoot || isInside(absoluteRoot, resolved);
  const insideReal = realTarget === realRoot || isInside(realRoot, realTarget);
  if (!insideRoot || !insideReal) {
    throw new PathEscapeError(root);
  }
  return resolved;
}

/**
 * Normalize a user-supplied project root and prove it looks like a Trellis
 * project. Returns `null` when the path is not a directory or has no
 * `.trellis/tasks` directory.
 */
export function normalizeProjectRoot(input: string): string | null {
  if (typeof input !== "string" || input.trim().length === 0) return null;
  const resolved = path.resolve(input.trim());
  let stat: fs.Stats;
  try {
    stat = fs.statSync(resolved);
  } catch {
    return null;
  }
  if (!stat.isDirectory()) return null;
  const tasksDir = path.join(resolved, ".trellis", "tasks");
  try {
    if (!fs.statSync(tasksDir).isDirectory()) return null;
  } catch {
    return null;
  }
  return realpathOfDeepestExisting(resolved);
}
