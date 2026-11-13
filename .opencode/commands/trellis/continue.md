# Continue Current Task

Resume work on the current task — pick up at the right phase/step in `.trellis/workflow.md`.

---

## Step 1: Load Current Context

```bash
python ./.trellis/scripts/get_context.py
```

Confirms: current task, git state, recent commits.

## Step 2: Load the Phase Index

```bash
python ./.trellis/scripts/get_context.py --mode phase
```

Shows the Phase Index (Plan / Execute / Finish) with routing + skill mapping.

## Step 3: Decide Where You Are

`get_context.py` shows the active task's `status` field. Route by `status` + artifact presence. This command replaces the user needing to remember the Trellis flow; it does not itself approve implementation.

- `status=planning` + no `prd.md` → **1.1** (load `trellis-brainstorm`)
- `status=planning` + `prd.md` only → return to **1.1** to add concise `design.md` + `implement.md` for this task.
- `status=planning` + all three artifacts complete + sub-agent jsonl not curated (empty, or only a legacy `_example` placeholder row) → **1.3**
- `status=planning` + required artifacts complete + required jsonl curated or inline mode → **1.4** (ask for start review; only run `task.py start` after user confirms)
- `status=in_progress` + implementation not started → **2.1**
- `status=in_progress` + implementation done, not yet checked → **2.2**
- `status=in_progress` + check passed → **3.3** (spec update) → **3.4** (commit)
- `status=completed` (rare; usually archived immediately) → archive flow

For an existing task with `prd.md`, before entering planning review or continuing implementation, read its `## Research` section when present and the records needed for the next decision. Recheck key premises and versions, and whether unresolved unknowns affect the agreed result. If a key premise no longer applies, a required version is unverified, or an unresolved unknown affects the agreed result, return to the relevant planning step; a file or link alone is not sufficient. If `prd.md` is absent, keep the original route and do not require nonexistent research. If this turn discovers external evidence used for a task decision, follow the `trellis-brainstorm` research handoff rules and save it before presenting the conclusion, including when findings conflict or no reliable answer is found.

Phase rules (full detail in `.trellis/workflow.md`):

1. Run steps **in order** within a phase — `[required]` steps must not be skipped
2. `[once]` steps are already done if the required output exists. Every new task needs `prd.md`, `design.md`, and `implement.md`, each as short as its purpose allows.
3. You may go back to an earlier phase if discoveries require it

## Step 4: Load the Specific Step

Once you know which step to resume at:

```bash
python ./.trellis/scripts/get_context.py --mode phase --step <X.X> --platform opencode
```

Follow the loaded instructions. After each `[required]` step completes, move to the next.

---

## Reference

Full workflow and detailed phase steps live in `.trellis/workflow.md`. This command is only an entry point — the canonical guidance is there.

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
