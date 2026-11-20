# Local task canvas

## Goal

Let a developer inspect the purpose, status and parent-child hierarchy of
Trellis tasks in the current project from a locally served, read-only canvas.

## Requirements

- Run `trellis dashboard` manually from an initialized project root.
- Show all unarchived task records in a left-to-right parent-child layout;
  place children of the same task on separate rows.
- Show each task's name, a short description and its status on its card.
- Distinguish planning tasks with light blue styling and in-progress tasks with
  light green styling. Use muted grey for completed or archived tasks and
  neutral styling for other statuses. Always show the status text.
- Show a status legend and counts for the tasks currently on the canvas.
- Provide a `显示归档任务` toggle that defaults to off. When enabled,
  read tasks from the project's monthly archive folders and include them in the
  same graph with muted styling and an archived label.
- Let a user select a task to inspect its full description, ID and task
  metadata.
- Draw parent-child links only when the relationship can be resolved
  unambiguously among the tasks visible on the canvas.
- Place tasks without a parent or child relationship in a separate group.
- Support canvas pan, zoom, fit-to-view and temporary node repositioning.
- Bind only to `127.0.0.1`; do not upload, modify or persist project data.
- Read task records only. Do not scan or display Codex, Pi, DSH or other
  assistant-session history.
- Keep examples and automated tests synthetic; never store real project or
  session data in the fork.

## Out of scope

- Linking tasks to assistant conversations or showing session counts or details.
- Editing task files, changing task status or saving node positions.
- Starting the dashboard automatically or adding an agent skill that launches
  it.
- Editing, moving or otherwise changing archived task files.
- Inferring task relationships that Trellis has not recorded.
- Accessing other projects or providing remote access.

## Acceptance

- `trellis dashboard` serves the current project's active tasks by default and
  exits on Ctrl+C; an uninitialized directory produces a clear error.
- The archive toggle starts off; enabling it adds tasks found below
  `.trellis/tasks/archive/<YYYY-MM>/` without changing project files.
- All unarchived task records remain visible, including tasks with statuses
  outside planning and in progress. The graph lays parents left of their
  children and puts siblings on separate rows. Tasks without family links
  remain visible in a separate group.
- Cards show a short description preview; selecting one reveals its full
  description and task metadata.
- Status text, legend, card colours and displayed counts agree with each task's
  record; unknown status text remains visible and archived cards are muted.
- Parent-child links match only relationships that can be resolved
  unambiguously from the shown task records; missing or ambiguous links are not
  guessed.
- The browser API returns task metadata only. Session-related routes are not
  available, and task list requests do not read assistant history.
- Synthetic tests cover active and archived task parsing, archive toggle
  behaviour, hierarchy layout, status presentation, command parsing, loopback
  access and HTTP security.
