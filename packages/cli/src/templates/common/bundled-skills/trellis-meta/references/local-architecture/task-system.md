# Local Task System

The Trellis task system is stored entirely under `.trellis/tasks/` in the user project. Each task is a directory containing requirements, context, research, state, and relationship information.

## Task Directory Structure

```text
.trellis/tasks/
├── 04-28-example-task/
│   ├── task.json
│   ├── prd.md
│   ├── design.md
│   ├── implement.md
│   ├── implement.jsonl
│   ├── check.jsonl
│   └── research/
└── archive/
    └── 2026-04/
```

| File | Purpose |
| --- | --- |
| `task.json` | Task metadata: status, assignee, priority, branch, parent/child tasks, and similar fields. |
| `prd.md` | Requirements, constraints, and acceptance criteria. Every new task requires all three concise planning files. |
| `design.md` | Technical design for every new task: boundaries, contracts, data flow, compatibility, tradeoffs. |
| `implement.md` | Execution plan for every new task: ordered checklist, validation commands, review gates, rollback points. |
| `implement.jsonl` | List of spec/research files the implement agent must read first. |
| `check.jsonl` | List of spec/research files the check agent must read first. |
| `research/` | Research artifacts. Complex findings should not live only in chat. |

## `task.json`

`task.json` records task status and metadata. Common fields:

| Field | Meaning |
| --- | --- |
| `id` / `name` / `title` | Task identity and title. |
| `status` | Status such as `planning`, `in_progress`, `review`, or `completed`. |
| `priority` | `P0`, `P1`, `P2`, `P3`. |
| `creator` / `assignee` | Creator and assignee. |
| `package` | Target package in a monorepo; may be empty. |
| `branch` / `base_branch` | Working branch and PR target branch. |
| `children` / `parent` | Parent/child task relationships. |
| `commit` / `pr_url` | Commit and PR information after completion. |
| `meta` | Extension fields. |

## Parent / Child Task Trees

Parent/child task relationships are for work structure. A parent task groups related deliverables under one source requirement set; it is not a dependency scheduler and does not replace the child task's own planning artifacts.

Use a parent task when a request has multiple independently verifiable deliverables. The parent owns:

- Source requirements and user-facing scope.
- The map of child tasks and their responsibility boundaries.
- Cross-child acceptance criteria and final integration review.

Use child tasks for deliverables that can move through planning, implementation, check, and archive independently. If one child depends on another, write that dependency in the child `prd.md` / `implement.md`; do not rely on tree position to imply ordering.

Create new children with:

```bash
python3 ./.trellis/scripts/task.py create "<child title>" --description "<one-line summary>" --slug <child-slug> --parent <parent-dir>
```

Link or unlink existing tasks with:

```bash
python3 ./.trellis/scripts/task.py add-subtask <parent-dir> <child-dir>
python3 ./.trellis/scripts/task.py remove-subtask <parent-dir> <child-dir>
```

`children` on the parent is a historical list. When a child is archived, Trellis keeps that child name in the parent so progress like `[2/3 done]` remains meaningful after completed children move to `archive/`.

The AI should not treat phase numbers as task status. Task progress is mainly determined by `status`, artifact presence (`prd.md`, `design.md` and `implement.md`), whether JSONL context is configured for sub-agent mode, and the phase descriptions in `workflow.md`.

## Active Task

The user sees a "current task," but Trellis stores active task state per session.

```text
.trellis/.runtime/sessions/<context-key>.json
```

`task.py start` writes the task path into the runtime session file for the current session. `task.py current --source` shows the current task and where it came from. Different AI windows can point to different tasks without overwriting each other.

If the platform or shell environment has no stable session identity, `task.py start` may be unable to set the active task. The AI should read the error, inspect the platform hook/session environment, and not fall back to a shared global pointer.

## JSONL Context

`implement.jsonl` and `check.jsonl` are context manifests for sub-agents to read first. They do not replace `implement.md`; `implement.md` is the human-readable execution plan.

Format:

```jsonl
{"file": ".trellis/spec/cli/backend/index.md", "reason": "Backend conventions"}
{"file": ".trellis/tasks/04-28-example/research/api.md", "reason": "API research"}
```

Rules:

- Include spec and research files.
- Do not include code files that are about to be modified.
- Do not treat temporary conclusions in chat as the only context.
- Rows without a `file` field are skipped by readers. Legacy `{"_example": ...}` placeholder rows are rejected by `task.py validate` — delete them.

## Common Commands

```bash
python3 ./.trellis/scripts/task.py create "<title>" --description "<one-line summary>" --slug <slug>
python3 ./.trellis/scripts/task.py start <task>
python3 ./.trellis/scripts/task.py current --source
python3 ./.trellis/scripts/task.py add-context <task> implement <file> <reason>
python3 ./.trellis/scripts/task.py validate <task>
python3 ./.trellis/scripts/task.py finish
python3 ./.trellis/scripts/task.py archive <task>
```

When modifying the task system, the AI should prefer script commands to maintain structure. Edit JSON/Markdown directly only when scripts do not cover the need.

## Local Customization Points

| Need | Edit location |
| --- | --- |
| Change the default task template | `.trellis/scripts/common/task_store.py` and task creation instructions. |
| Change status semantics | `.trellis/workflow.md`, workflow-state hook logic, and task usage conventions. |
| Add task lifecycle actions | `hooks.after_*` in `.trellis/config.yaml`. |
| Change context rules | Planning artifact guidance in `.trellis/workflow.md` and related platform agent/hook instructions. |
| Change archive policy | `.trellis/scripts/common/task_store.py` / `task_utils.py`. |

These are local files in the user project. Do not default to editing Trellis CLI source code unless the user wants to contribute upstream.


## Reviewed planning version and material changes

For every new task, prepare readable, nonempty `prd.md` (requirements), `design.md` (solution), and `implement.md` (implementation and verification order). Keep each concise; the topics above are guidance, not required headings or word counts. Read all three together and resolve contradictions. File presence or a successful script cannot assess meaning or prove user identity.

Before first start or start after replanning:

1. Check the three files and decision-relevant research, then run `task.py attest <task-dir> --note "what was reviewed"`.
2. Run `task.py validate <task-dir>`. A waiting version may validate successfully but is still not approved.
3. Show the user the complete `reviewId`, explanation, and a plain-language summary of scope, solution, verification and limits. Append the summary, original three fingerprints, changes and real response/source to `<task-dir>/research/planning-review-log.md`; do not overwrite older rounds or invent message identifiers. Preserve the old review log before clearing records with replan; if saving fails, address that first. Full historical text requires version control; fingerprints cannot restore overwritten text.
4. Only after the user's explicit response to that version, recheck and run `task.py start <task-dir> --review <reviewId> --approval-note "actual response" --approval-source "locatable conversation source"`. Ordinary attest always creates a new version and clears prior approval; recomputing hashes cannot grant permission.

If requirements, design or the implementation plan materially change, including a change agreed in conversation, pause affected work and dispatched dependencies. Run `task.py replan <task-dir> --reason "what changed" --affected "work to pause" --independent "work that does not depend on the change, or none"`, update the three files and repeat review/confirmation. State why any continuing work is independent; that field does not grant new authorization. Keep normal coding, testing and fixes within the approved requirements moving. Record normal progress separately without checking off the frozen reviewed plan.

For a verified wording-only correction after start, use `task.py attest <task-dir> --editorial --note "specific correction; behavior and scope unchanged"`; preserve the reviewed version and confirmation. If the user has already responded but first start is not recorded, add `--editorial-note "specific correction"` to that same version-specific start. Inspect the actual diff; neither command can determine whether a purported wording correction changes meaning.

Only `in_progress`/`review` tasks with all three planning metadata keys absent may resume through the legacy path without backfilling the files. Partial, null or malformed records are not legacy. Completed tasks cannot start again. Same-task writes are serialized by the main session; concurrency and exactly-once hooks are not promised. Session hints query `task.py planning-status <task-dir> --json`; unavailable checks never imply permission to start. New records must match the current files on resume. Archive planning problems warn while existing archive checks remain in force.

Only already-started legacy tasks in `in_progress` or `review` with all planning-record keys absent may resume using available historical artifacts. Every new task needs all three concise planning files. Material changes return to the main session for `replan`, updated artifacts and renewed user confirmation; record ordinary progress separately.
