# Local task canvas design

## Scope

Provide a manually started, read-only view of active Trellis tasks in one
project. Archived tasks are available only when the user turns on an explicit
display toggle. The dashboard does not access AI assistant sessions. Session
matching was left out because the relationship is difficult to establish
reliably from incomplete records, unclear titles and delegated-agent
conversations.

## Interface

- Use the existing React Flow canvas.
- Lay out all unarchived task families from left to right: parents before
  children, and children of the same parent on separate rows. Show unrelated
  tasks in a separate group.
- Show the task title, a short description and its status on each node.
- Keep the card description concise; show its full text and task metadata in the
  details panel when a user selects the card.
- Use pale status-specific backgrounds, a coloured left stripe and a text
  label. Planning (`planning`, `brainstorm`) is light blue, in-progress
  (`in_progress`, `in-progress`) is light green, and completed or archived
  tasks are muted grey. Unknown statuses use neutral styling and keep their
  original status text. An archived task also has an archived label.
- Show a legend and counts that reflect the tasks currently displayed. Keep
  the status label visible so colour is not the only status cue.
- Add a `显示归档任务` toggle that defaults to off. When on, include
  valid tasks found in `.trellis/tasks/archive/<YYYY-MM>/` in their recorded
  parent-child family when the relationship can be resolved safely.
- Select a node to inspect the task ID and metadata in the side panel.
- Connect parent and child tasks with a labelled hierarchy edge only when the
  relationship resolves uniquely among visible task records. Keep tasks with
  no family link visible in their separate group.
- Keep pan, zoom, fit-view and drag positioning for the current page only.
- Show no session toggle, session count, assistant node, session node or
  session-details tab.
- Do not infer relationships from task titles, dates, descriptions or directory
  ordering.

## Data flow and privacy

- The CLI passes its current working directory to the dashboard process.
- The task reader loads active records from `.trellis/tasks/*/task.json`. When
  the archive toggle is on, it additionally reads task records inside
  `.trellis/tasks/archive/<YYYY-MM>/*/task.json`. It resolves both roots inside
  the selected project and does not inspect PRDs, conversation logs or
  assistant data.
- The server exposes a task index and same-origin static assets only. It binds
  to `127.0.0.1` and serves only `GET` and `HEAD` requests.
- The index contains selected task metadata and unambiguous project-local
  hierarchy keys; it excludes absolute paths and raw task records.
- When an active and archived task cannot be distinguished unambiguously from
  stored relationship references, render them without a link rather than
  guessing.
- Node positions remain in browser memory and are not written to disk.

## Verification

Use synthetic task files to test active and archived task reads, the archive
toggle, parent-child family layout, sibling rows, status styles and counts,
unrelated tasks, task details, CLI startup and HTTP restrictions. Verify there
is no session API and no session-store read path in the dashboard runtime.
Build the CLI package and check that the packaged dashboard contains its
server, page and browser assets.
