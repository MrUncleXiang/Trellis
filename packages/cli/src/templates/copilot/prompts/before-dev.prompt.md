---
description: "Trellis Copilot prompt: before-dev.prompt"
---

Read the relevant development guidelines before starting your task.

Execute these steps:

1. **Read current task artifacts**:
   - `prd.md` for requirements and acceptance criteria
   - `design.md` for technical design
   - `implement.md` for execution order and validation plan

2. **Discover packages and their spec layers**:
   ```bash
   python3 ./.trellis/scripts/get_context.py --mode packages
   ```

3. **Identify which specs apply** to your task based on:
   - Which package you're modifying (e.g., `cli/`, `docs-site/`)
   - What type of work (backend, frontend, unit-test, docs, etc.)
   - Any spec/research paths referenced by the task artifacts

4. **Read the spec index** for each relevant module:
   ```bash
   cat .trellis/spec/<package>/<layer>/index.md
   ```
   Follow the **"Pre-Development Checklist"** section in the index.

5. **Read the specific guideline files** listed in the Pre-Development Checklist that are relevant to your task. The index is NOT the goal — it points you to the actual guideline files (e.g., `error-handling.md`, `conventions.md`, `mock-strategies.md`). Read those files to understand the coding standards and patterns.

6. **Always read shared guides**:
   ```bash
   cat .trellis/spec/guides/index.md
   ```

7. Understand the coding standards and patterns you need to follow, then proceed with your development plan.

This step is **mandatory** before writing any code.

## Planning version and change boundary

Every new task requires readable, nonempty `prd.md`, `design.md`, and `implement.md`. Read them in that order after role-specific JSONL context. Their length may be short; do not require fixed headings or word counts. Missing new-task artifacts mean return the issue to the main session before affected implementation/check work; an injection marker alone does not approve the task.

The main session owns the real user confirmation and version-specific `task.py start`. If requirements, design or implementation plan materially change, pause affected work and dependencies, report the actual change to the main session, and have it run `task.py replan` and obtain confirmation for the revised version. Do not approve a new direction yourself. Normal coding, tests and fixes within the approved scope may continue. Record progress separately from frozen reviewed planning files. Wording-only corrections need the documented editorial path, not a new substantive plan disguised as a typo.

Legacy exception: only an already `in_progress`/`review` task with all three planning metadata keys absent may resume without backfilling missing planning files. Partial, null or malformed records are not legacy; new records must match the current files. Confirm the exception with `task.py planning-status <task-path> --json` before using the available historical artifacts. Query failure is not permission to proceed.
