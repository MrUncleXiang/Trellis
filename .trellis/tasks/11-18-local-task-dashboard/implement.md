# Local task canvas implementation record and follow-up plan

## Current baseline

- Keep `trellis dashboard` as a manual, local-only CLI command.
- Render active Trellis tasks in separate planning and in-progress lanes.
- Show task title, description and status on the canvas.
- Show task ID and task metadata in the details panel.
- Draw labelled parent-child links between active tasks.
- Preserve canvas pan, zoom, fit-view and in-page node repositioning.
- Remove session matching, session-count scans, assistant/session nodes,
  session routes, DSH support and session-related dashboard dependencies.
- Keep Trellis Core's independent `mem` feature unchanged.

## Main files

- `packages/trellis-dashboard/src/task-reader.ts`: read and safely project task
  records without loading PRD text or assistant history.
- `packages/trellis-dashboard/src/server/app.ts`: serve the task index and local
  browser assets; reject unknown routes.
- `packages/trellis-dashboard/src/client/main.tsx` and
  `packages/trellis-dashboard/src/client/canvas-layout.ts`: render task nodes,
  details and hierarchy edges.
- `packages/cli/src/cli/index.ts`: start the bundled dashboard from the current
  directory.
- `packages/cli/scripts/copy-dashboard.js`: include the dashboard runtime in
  the CLI package.

## Validation

- Dashboard unit tests cover task parsing, hierarchy, canvas layout, CLI
  argument handling and server security.
- CLI integration tests use a synthetic initialized project and check startup,
  task API responses, removed session endpoints, file immutability and shutdown.
- Build and package checks verify the server and browser assets ship with the
  CLI.
- Session matching was not tested as part of this version because the feature
  has been removed.

## Follow-up change boundary

- Add an opt-in, read-only path for loading archived task records. Leave the
  existing session-free, manually started dashboard and task files unchanged.
- Replace the current two-status-column layout with parent-to-child rows,
  sibling branches and a separate group for unrelated tasks.
- Add task-status visual styles, a status legend, visible-task counts, an
  archive toggle and concise card descriptions.
- Do not add assistant-session scanning, task editing, saved positions,
  inferred relationships or remote access.

## Follow-up implementation steps

1. **Read active and archived records**
   - Extend the task reader to load `.trellis/tasks/archive/<YYYY-MM>/*/task.json`
     only when explicitly requested.
   - Reuse project-root path checks for archive and task directories; skip
     invalid records and outside-project links safely.
   - Give archived entries project-local keys that cannot collide with active
     task keys. Keep absolute paths and raw task records out of the API.
2. **Build parent-child family rows**
   - Place parents left of children, and place siblings on separate rows.
   - Group each connected family together; place tasks with no family links in
     a separate group.
   - Draw only links that the selected task records resolve uniquely; do not
     invent a link when an archived record does not preserve it clearly.
   - Keep card dragging, panning, zoom and fit-to-view.
3. **Add task status and archive controls**
   - Add a `显示归档任务` toggle that starts off and requests archived task
     data only when enabled.
   - Keep all unarchived task records visible, including records with other
     statuses.
   - Style planning (`planning`, `brainstorm`) cards light blue and in-progress
     (`in_progress`, `in-progress`) cards light green. Style completed and
     archived cards muted grey and unknown statuses neutrally. Always show the
     status text; give archived cards an additional archived label.
   - Add a legend and counts that match the tasks currently displayed.
   - Keep descriptions short on cards and show the full text in task details.
4. **Test data and layout behaviour**
   - Add synthetic active/archive fixtures and tests for archive opt-in, safe
     path handling, unique keys, duplicate task-directory names, and readable
     projections.
   - Test family chains, siblings, unrelated tasks, unresolved relationships,
     unrecognized statuses, status-based styling, visible counts, details and
     preserved dragging.
   - Extend CLI dashboard integration tests to check that archives are hidden
     by default and appear only when requested. Verify task files remain
     unchanged and session routes remain unavailable.
5. **Verify the CLI integration**
   - Run dashboard tests, lint, type checks and build.
   - Run focused CLI dashboard tests plus CLI lint, type checks and build.
   - Run the packed-CLI preflight and check that its files include the updated
     task-only dashboard.
   - If the full CLI suite reports failures, compare the failures with the
     repository baseline before attributing them to this feature.

## Follow-up risk notes

- Trellis archive records are nested by month and task directory; the reader
  must not follow a symlink outside the selected project's task folder.
- Trellis stores task relationships by directory names. Only link tasks when
  those names identify one visible record; archived and active tasks can share
  a directory name.
- A deep family can extend beyond the browser width. Keep fit-to-view and canvas
  panning available rather than shrinking cards until their descriptions are
  unreadable.
- Tests must use synthetic project records and must not inspect real project
  tasks or assistant-session stores.
