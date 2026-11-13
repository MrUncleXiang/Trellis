---
name: trellis-check
description: "Comprehensive quality verification: spec compliance, lint, type-check, tests, cross-layer data flow, code reuse, and consistency checks. Use when code is written and needs quality verification, before committing changes, or to catch context drift during long sessions."
---

# Code Quality Check

Comprehensive quality verification for recently written code. Combines spec compliance, cross-layer safety, and pre-commit checks.

---

## Step 1: Identify What Changed

```bash
git diff --name-only HEAD
git status
```

## Step 2: Read Task Artifacts and Applicable Specs

Read the current task artifacts in order:

- `prd.md`, including its `## Research` handoff index
- the research records referenced there that affect implementation or acceptance
- `design.md`
- `implement.md`

```bash
python ./.trellis/scripts/get_context.py --mode packages
```

For each changed package/layer, read the spec index and follow its **Quality Check** section:

```bash
cat .trellis/spec/<package>/<layer>/index.md
```

Read the specific guideline files referenced — the index is a pointer, not the goal.

## Step 3: Run Project Checks

Run the project's lint, type-check, and test commands. Fix any failures before proceeding.

## Step 4: Review Against Checklist

### Code Quality

- [ ] Linter passes?
- [ ] Type checker passes (if applicable)?
- [ ] Tests pass?
- [ ] No debug logging left in?
- [ ] No suppressed warnings or type-safety bypasses?

### Test Coverage

- [ ] New function → unit test added?
- [ ] Bug fix → regression test added?
- [ ] Changed behavior → existing tests updated?

### Spec Sync

- [ ] Does `.trellis/spec/` need updates? (new patterns, conventions, lessons learned)

> "If I fixed a bug or discovered something non-obvious, should I document it so future me won't hit the same issue?" → If YES, update the relevant spec doc.

### Decision Evidence

- [ ] For each key decision, compared the implementation or result with the cited evidence and its applicable limits?
- [ ] Checked relevant source locations, versions, or premises where evidence is uncertain, stale, or decisive?
- [ ] Unknowns that affect agreed behavior have a handling decision, and unresolved ones are not reported as passed?
- [ ] Findings identify the source or record and distinguish facts, inferences, and unknowns?

### Scope Discipline

- [ ] Any tidying of code the task did not require?
- [ ] Any abstraction, config or extension point added for a case that does not exist yet?
- [ ] Any speculative fallback for a state that cannot occur?
- [ ] Any file changed that the acceptance criteria do not mention?
- [ ] Any workaround added at the caller instead of a fix where the behavior actually lives?

## Step 5: Cross-Layer Dimensions (if applicable)

Skip this step if your change is confined to a single layer.

### A. Data Flow (changes touch 3+ layers)

- [ ] Read flow traces correctly: Storage → Service → API → UI
- [ ] Write flow traces correctly: UI → API → Service → Storage
- [ ] Types/schemas correctly passed between layers?
- [ ] Errors properly propagated to caller?

### B. Code Reuse (modifying constants, creating utilities)

- [ ] Searched for existing similar code before creating new?
  ```bash
  grep -r "pattern" src/
  ```
- [ ] If the same value repeats, does it represent one stable concept whose callers must change together? Extract only then — two literals that merely happen to match today should stay separate.
- [ ] After batch modification, all occurrences updated?

### C. Import/Dependency (creating new files)

- [ ] Correct import paths (relative vs absolute)?
- [ ] No circular dependencies?

### D. Same-Layer Consistency

- [ ] Other places using the same concept are consistent?

---

## Step 6: Report and Fix

Report every violation you find. Then:

- Mechanical and local (lint nit, missing type, wrong import, dead branch, failing assertion) → fix in place, then re-run project checks.
- Design or judgment (naming a shared concept, moving a module boundary, changing a public interface, reassigning where behavior lives) → record the evidence and your recommendation, and stop. Do not rewrite it silently.

If a fix would touch files outside the current task's scope, say so and stop instead of widening the change.

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
