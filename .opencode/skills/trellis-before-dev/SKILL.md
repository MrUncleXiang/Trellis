---
name: trellis-before-dev
description: "Discovers and injects project-specific coding guidelines from .trellis/spec/ before implementation begins. Reads spec indexes, pre-development checklists, and shared thinking guides for the target package. Use when starting a new coding task, before writing any code, switching to a different package, or needing to refresh project conventions and standards."
---

Read the relevant development guidelines before starting your task.

Execute these steps:

1. **Read current task artifacts**:
   - `prd.md` for requirements, acceptance criteria, and its `## Research` handoff index
   - the research records referenced there that affect implementation
   - `design.md` for technical design
   - `implement.md` for execution order and validation plan

2. **Discover packages and their spec layers**:
   ```bash
   python ./.trellis/scripts/get_context.py --mode packages
   ```

3. **Identify which specs apply** to your task based on:
   - Which package you're modifying (e.g., `cli/`, `docs-site/`)
   - What type of work (backend, frontend, unit-test, docs, etc.)
   - Any spec/research paths referenced by the task artifacts, including research that constrains implementation or acceptance

4. **Read the spec index** for each relevant module:
   ```bash
   cat .trellis/spec/<package>/<layer>/index.md
   ```
   Follow the **"Pre-Development Checklist"** section in the index.

5. **Read the specific guideline files** listed in the Pre-Development Checklist that are relevant to your task. The index is NOT the goal — it points you to the actual guideline files (e.g., `error-handling.md`, `conventions.md`, `mock-strategies.md`). Read those files to understand the coding standards and patterns. Also read the relevant research records and confirm that their versions and key premises still apply. If a required record is missing, unreadable, or a key unknown or outdated premise affects implementation, return to planning instead of guessing.

6. **Always read shared guides**:
   ```bash
   cat .trellis/spec/guides/index.md
   ```

7. **For a non-trivial task, state the change boundary before writing code.** Non-trivial means it touches more than one file, crosses a layer, changes a public interface, or edits code you did not just write. Write down:
   - the smallest behavior gap between what happens now and what should happen
   - where that behavior actually lives (not where it is easiest to intercept)
   - which files you expect to change, and why each one is necessary
   - the relevant research evidence and limits that constrain the change
   - what you are explicitly not doing in this task
   - if a local refactor is needed, how you will show it did not change behavior

   A small, well-scoped change does not need this — do it directly.

   If the real scope turns out to be clearly larger than this, say so and why before continuing. Do not widen the change on your own.

8. Understand the coding standards and patterns you need to follow, then proceed with your development plan.

This step is **mandatory** before writing any code.

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
