# Trellis local task dashboard

A read-only local canvas for tasks in one Trellis project. Run
`trellis dashboard` from the project root to view task names, descriptions,
statuses and parent-child links. Select a task to inspect its task ID and
metadata. The page does not display or read AI assistant sessions.

The dashboard is bundled with Trellis CLI. It only reads the selected project's
`.trellis/tasks` files and serves the page on `127.0.0.1`. It does not change
task files, start automatically, or access session stores.

## Develop

The commands below are for the workspace package, not for installing the
user-facing command.

```bash
pnpm install --frozen-lockfile
pnpm --filter @mindfoldhq/trellis-dashboard build
pnpm --filter @mindfoldhq/trellis-dashboard start -- --project /path/to/project
```

To preview the interface with fake tasks, run
`pnpm --filter @mindfoldhq/trellis-dashboard demo` after building. The demo
creates temporary task records and removes them when it stops.

## What it shows

- **Canvas**: all unarchived tasks appear, grouped by parent-child relations.
  Parents sit to the left of their children, and siblings use separate rows.
  Tasks without links appear in a separate group.
- **Status**: planning cards use pale blue, in-progress cards pale green,
  completed and archived cards muted grey, and other statuses a neutral style.
  Each card keeps its status label; archived cards also show an archive badge.
- **Archives**: the `显示归档任务` toggle starts off. Turn it on to read
  `.trellis/tasks/archive/<YYYY-MM>/` and show archived tasks in the same canvas.
  The header count updates to match the visible tasks.
- **Hierarchy**: visible parent and child tasks are connected with a labelled
  line. Ambiguous links are omitted rather than guessed.
- **Details**: select a task to view its task ID, description, status, priority,
  assignee, dates, package, scope and parent-child counts. The task ID can be
  copied.
- **Placement**: dragged positions remain in the open page. They are not saved
  to task files.
- **Scope**: only task records in the selected project are read. Archived task
  records are read only while the toggle is on. Assistant-session history is
  not inspected or displayed.

## Privacy and network behaviour

- The HTTP server listens only on `127.0.0.1` and accepts same-origin requests.
- The page sends no external requests. There is no CORS, upload, filesystem or
  remote-sharing route.
- Only `GET` and `HEAD` requests are served.
- Responses use a closed content security policy and `X-Frame-Options: DENY`.
- Task and archive directory names are resolved within the selected project's
  task folder; symlinks that point outside are refused.
- The browser receives a narrow task index, not task file paths or raw records.
- The dashboard does not read assistant-session history, including Codex, Pi or
  DSH data.

## Scripts

```bash
pnpm --filter @mindfoldhq/trellis-dashboard test        # vitest
pnpm --filter @mindfoldhq/trellis-dashboard lint        # eslint src/ test/
pnpm --filter @mindfoldhq/trellis-dashboard typecheck   # tsc --noEmit
pnpm --filter @mindfoldhq/trellis-dashboard build       # tsc + browser bundle
pnpm --filter @mindfoldhq/trellis-dashboard start -- --project <path>
```

`pnpm build` writes the ignored `dist/` directory. The browser bundle is built
from `src/client/main.tsx` and served at `/app.js`.

## Tests

Tests use synthetic task records in temporary folders. They cover task parsing,
task hierarchy, canvas layout, command-line parsing, loopback binding and HTTP
security. They do not open assistant-session stores or use real project data.
