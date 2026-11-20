/**
 * Command-line entry for the local dashboard.
 *
 * Usage: `trellis-dashboard --project <path>`
 *
 * The project root is mandatory — there is no "current directory" or "search
 * all projects" default. It reads task records only; assistant-session stores
 * are outside this command's scope.
 *
 * The server binds 127.0.0.1 only, prints the loopback URL, and runs until
 * Ctrl+C.
 */

import { normalizeProjectRoot } from "./paths.js";
import { createDashboardServer, type DashboardServer } from "./server/app.js";
import { LOOPBACK_HOST } from "./server/host-guard.js";

export interface CliOptions {
  projectRoot: string;
}

export const USAGE = `Usage: trellis-dashboard --project <path>

  --project <path>   Trellis project root to view (required, read-only)
  --help             show this message

The dashboard listens on ${LOOPBACK_HOST} only, reads Trellis task files,
and never writes to the project or reads assistant session history.`;

export type ParsedArgs =
  | { ok: true; options: CliOptions }
  | { ok: false; error: string; help?: true };

/**
 * Parse argv.
 *
 * Unknown flags are rejected rather than ignored: a typo such as `--projct`
 * must not silently fall back to reading some other directory. `env` and
 * `home` are parameters so tests never depend on the developer's real home.
 */
export function parseArgs(argv: readonly string[]): ParsedArgs {
  let project: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { ok: false, error: USAGE, help: true };
    if (arg === "--project") {
      const value = argv[i + 1];
      // A following flag is not a value: `--project --unsupported x` must fail
      // instead of treating the flag as a path.
      if (value === undefined || value.trim().length === 0 || value.startsWith("--")) {
        return { ok: false, error: `${arg} requires a value\n\n${USAGE}` };
      }
      project = value;
      i += 1;
      continue;
    }
    return { ok: false, error: `unknown argument: ${arg ?? ""}\n\n${USAGE}` };
  }
  if (project === undefined) {
    return { ok: false, error: `--project is required\n\n${USAGE}` };
  }
  const normalized = normalizeProjectRoot(project);
  if (normalized === null) {
    return { ok: false, error: `not a Trellis project (no .trellis/tasks): ${project}` };
  }
  return {
    ok: true,
    options: {
      projectRoot: normalized,
    },
  };
}

/** Start the dashboard and resolve once it is listening. */
export async function startDashboard(options: CliOptions): Promise<DashboardServer> {
  return createDashboardServer({
    projectRoot: options.projectRoot,
  }).listen();
}

export async function main(argv: readonly string[]): Promise<number> {
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    const stream = parsed.help === true ? process.stdout : process.stderr;
    stream.write(`${parsed.error}\n`);
    return parsed.help === true ? 0 : 2;
  }
  const running = await startDashboard(parsed.options);
  process.stdout.write(
    `Trellis dashboard: http://${running.address}:${running.port}\n` +
      `project: ${parsed.options.projectRoot}\n` +
      `read-only; press Ctrl+C to stop\n`,
  );

  await new Promise<void>((resolve) => {
    const stop = (): void => {
      void running.close().then(() => {
        resolve();
      });
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
  return 0;
}
