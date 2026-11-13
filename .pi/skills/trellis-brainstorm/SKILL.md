---
name: trellis-brainstorm
description: "Guides collaborative requirements discovery before implementation. Creates task directory, seeds PRD, asks high-value questions one at a time, researches technical choices, and converges on MVP scope. Use when requirements are unclear, there are multiple valid approaches, or the user describes a new feature or complex task."
---

# Trellis Brainstorm

## Non-Negotiable Planning Contract

A request to build, implement, fix, refactor, or "go ahead" is not approval to leave planning. Task-creation consent is also not implementation approval.

For every non-trivial task, the user must respond at least once after the initial request before implementation begins. If no clarification is needed, that response must approve the final planning summary described below.

While any user-owned product, scope, UX, compatibility, risk, or acceptance decision remains unresolved, end the turn with exactly one highest-value question. Do not edit product code, dispatch implementation, or run `task.py start`.

## Non-Negotiable Evidence Rule

If a question can be answered by exploring the codebase, explore the codebase instead.

This is mandatory. Before asking the user a question, first check whether the answer is already available in code, tests, configs, docs, existing specs, or task history.

Do not ask the user to confirm facts that the repository can answer. Ask only for product intent, preference, scope, risk tolerance, acceptance behavior, or decisions that remain ambiguous after inspection.

Repository evidence establishes current behavior and technical constraints. The user's intended behavior, feature scope boundaries, and UX preferences are never answerable by repository evidence alone, even when an existing pattern exists; existing patterns are options and recommendation evidence, not decisions.

## Research Evidence Handoff

When external evidence is used to support, reject, or change a requirement, design, compatibility, risk, or acceptance decision, save it before presenting that conclusion or changing the plan. External evidence includes online material, local third-party source or documentation, user-provided references, and experiments about external behavior. Project code and existing spec inspection follow the evidence rule above and do not need a separate report. Reuse sufficient existing evidence instead of searching again; do not log unrelated browsing. A research agent must save its result in the assigned task research file before returning; the main agent must read and validate it before using it as evidence. If saving fails, report the failure rather than claiming handoff. Save only necessary facts and accessible source identifiers. Remove credentials and unrelated personal data, respect project access boundaries, and do not persist unrelated raw request/response payloads.

Each adopted finding must make the question, locatable source, conclusion and limits, and decision impact recoverable. Add version, commit, or access date when it affects applicability. Web sources need a link and relevant section or entry; local third-party material needs a stable package or path identifier, version, and location; user material needs a name or identifier and relevant location, must be identified as user-provided, and must not be presented as independently verified; if it exists only in the session, save the necessary excerpt or summary; experiments need enough environment, steps, and observations to repeat them. Keep facts, inferences, and unknowns distinguishable. If no reliable answer is found or sources conflict, save what was checked, what remains unresolved, the current choice and reason, the impact, and the next step; do not treat "not found" as proof of absence. Record alternatives only when they were actually compared.

Keep or add a `## Research` section in `prd.md` as the handoff index. State whether research is unnecessary (with a task-specific reason), reused (with why it applies and relevant version or premise checks), or performed (with key conclusions and record links), and note unresolved questions and their impact. Cite the same record near affected decisions in `design.md`; do not copy the full research. Use task-relative paths for task records and repository-root paths in `implement.jsonl` or `check.jsonl` when relevant. Update the record and affected decisions when evidence changes, and mark superseded conclusions. No fixed format, file count, or length is required; do not create empty research artifacts.

Before declaring planning ready, recheck that the status is explicit, decision-relevant evidence is saved or validly reused, references resolve, facts, inferences, and unknowns are distinguishable, and unknowns that affect the agreed result have a handling decision. File existence or a link alone is not enough.

---

Use this skill during Phase 1 planning to turn the user's request into clear requirements and planning artifacts.

## Preconditions

Use this skill only after task-creation consent has been given and the user is ready to enter Trellis planning.

If no task exists yet, create one:

```bash
TASK_DIR=$(python ./.trellis/scripts/task.py create "<short task title>" --description "<one-line summary>" --slug <slug>)
```

Use a concise title from the user's request. Both the title and `--description` must be non-empty — `create` rejects blanks, and a record with either one empty is refused at archive. Use a slug without a date prefix. `task.py create` adds the `MM-DD-` directory prefix automatically.

`task.py create` creates the default `prd.md`. Update that file with the current understanding before asking follow-up questions.

## Planning Flow

1. Capture the user's request and initial known facts in `prd.md`.
2. Inspect available evidence before asking questions:
   - code, tests, fixtures, and configs
   - README files, docs, existing specs, and domain notes
   - related Trellis tasks, research files, and session history when present
   - when external evidence is needed, save decision-relevant findings under `research/` as described above
3. Separate what you found into:
   - confirmed facts
   - inferences and unknowns
   - product intent still needed from the user
   - scope or risk decisions still needed from the user
   - likely out-of-scope items
4. If a user-owned decision remains, ask the single highest-value question, include your recommendation and trade-off, then stop. Do not perform implementation work in the same turn.
5. After each user answer, update `prd.md`, recompute the decision inventory, and repeat from step 2.
6. When no user-owned decision remains, create or update `design.md` and `implement.md` for every new task, citing relevant research records near affected decisions.
7. Run the requirement convergence gate, then the PRD convergence pass. Recheck the research handoff before declaring planning ready.
8. Present the final planning summary and stop. Do not run `task.py start` or edit product code in the same turn.
9. Only a subsequent user message that explicitly approves the latest planning summary authorizes `task.py start` and implementation. If the artifacts change materially after approval, repeat the final review.

Do not invent a project-specific product/spec hierarchy. If the repository already has product, domain, or spec docs, use them. If it does not, proceed with the evidence that exists.

## Question Rules

Ask only one question per message.

Each question must include:

- the decision needed
- why the answer matters
- your recommended answer
- the trade-off if the user chooses differently

Do not ask process questions such as whether to search, inspect files, or continue brainstorming. Do the evidence work directly. Ask the user only when the remaining issue is a product decision, preference, scope boundary, or risk tolerance choice.

Recommendations are not default selections. Never choose a recommended product decision on the user's behalf merely because the user asked for implementation.

Do not manufacture clarification questions when the request and repository evidence already resolve every decision. In that case, proceed directly to the final planning summary, which still requires a subsequent explicit approval.

The final review is a required phase-transition gate, not a prohibited process question. Task-creation consent, the initial implementation request, and approval given before the latest final summary do not satisfy this gate.

## Thinking Framework: First Principles Analysis

When requirements are vague, solutions feel over-engineered, or you're about to add complexity "because everyone does" — decompose to fundamental truths before reasoning upward.

### Step 1: Restate the Problem

Strip away implementation details to one sentence.

> Bad: "We need to add Redis caching to the user profile endpoint"
> Good: "User profile data takes too long to load"

### Step 2: List Fundamental Truths

What is absolutely true (not opinion or convention)?

| Category | Examples |
|----------|----------|
| **Physical constraints** | Network latency ≥ 0, disk I/O has limits |
| **Business rules** | "Users must see their own data" |
| **Technical invariants** | "Data must be consistent" |
| **User needs** | "The user wants X within Y seconds" |

### Step 3: Challenge Assumptions

For each component of the current plan:

- **Fact or convention?** "We always use REST" — why?
- **What if we removed this?** If nothing breaks, it's unnecessary.
- **Solving the actual problem or a symptom?** Trace the causal chain.
- **Who benefits from this complexity?** If "nobody", simplify.

### Step 4: Build Up from Truths

1. Start with the minimum viable mechanism satisfying all truths
2. Add complexity only when a specific truth demands it
3. Each addition must answer: "Which truth requires this?"

### Step 5: Validate

- Does the solution solve the original problem?
- What assumptions need verification?
- What's the simplest experiment to test this?

## Requirement Convergence Gate

Before final review, verify all of the following:

- the user outcome and product value are explicit
- in-scope and out-of-scope behavior are explicit
- acceptance criteria describe observable outcomes
- user-owned product, scope, UX, compatibility, and risk decisions are resolved
- blocking open questions are empty
- technical unknowns are researched or explicitly deferred without changing MVP behavior

Every new task needs all three concise planning files, evidence inspection, requirement convergence, final review, and confirmation of the reviewed version before implementation.

The final planning summary must show Goal, In Scope, Out of Scope, Acceptance Criteria, Key Decisions, relevant Risks or Deferred Items, and artifact status.

## Artifact Rules

`prd.md` records requirements and acceptance:

- goal and user value
- confirmed facts
- requirements
- acceptance criteria
- out of scope
- open questions that still block planning
- a `## Research` handoff index with status, key conclusions and record links, and unresolved questions and impact

`design.md` records technical design for every new task:

- architecture and boundaries
- data flow and contracts
- compatibility and migration notes
- important trade-offs
- operational or rollback considerations

`implement.md` records execution planning for every new task:

- ordered implementation checklist
- validation commands
- risky files or rollback points
- follow-up checks before `task.py start`

Every new task must have concise `prd.md`, `design.md`, and `implement.md` before first `task.py start`; no fixed sections or word counts are required.

`implement.md` is not a replacement for `implement.jsonl`. On sub-agent-dispatch workflows, `implement.jsonl` and `check.jsonl` must each contain at least one real spec/research entry before `task.py start`; an empty manifest, or one holding only a legacy `_example` placeholder row, does not count. Inline workflows skip this JSONL gate because Phase 2 loads context through `trellis-before-dev`.

## PRD Convergence Pass

Before declaring planning ready, review and consolidate `prd.md` without losing decisions, evidence or acceptance links. Resolve contradictions and keep it as short as the task allows; do not impose fixed sections or expand it just to fill a template.

The pass must be lossless:

- Collapse repeated facts into one authoritative section.
- Consolidate temporary notes into the relevant requirements or supporting research; the destination headings are optional.
- Remove resolved open questions instead of leaving empty or already-answered sections.
- Merge parallel bug and requirement lists when they describe the same work; keep each defect's severity, evidence, and file:line anchors on the owning requirement.
- Preserve every file:line anchor, decision, constraint, requirement ID, and acceptance-criteria mapping. Also preserve research links and unresolved impacts.
- Do not proceed to final review while any blocking open question remains.

After the pass, read `prd.md` top to bottom and verify that no fact is repeated across sections unless the repetition adds new information.

## Quality Bar

Before declaring planning ready:

- `prd.md` contains testable acceptance criteria.
- `prd.md` has passed the PRD convergence pass: no unresolved temporary brainstorm sections, no duplicate facts across sections, and no lost anchors, decisions, or acceptance mappings.
- Repository-answerable questions have already been answered through inspection.
- Blocking open questions are empty.
- Every new task has `prd.md`, `design.md`, and `implement.md`, with content suited to its purpose.
- Sub-agent-dispatch tasks have real curated entries in both `implement.jsonl` and `check.jsonl`; seed-only manifests are not ready.
- The latest final planning summary has been presented to the user.
- In a subsequent message, the user explicitly approved that summary for implementation.

Do not start implementation merely because the user originally asked for implementation.

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
