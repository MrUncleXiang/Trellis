# A：开工前规划材料检查

## 本任务归属与当前状态

父任务：[完善任务材料的可靠性与可追溯性](../11-12-task-artifact-reliability/prd.md)。本任务沿用原 `planning-artifact-gate` 的身份、目录、创建日期和负责人，只负责 A 的需求。

2026-11-12 已按用户确认完成结构拆分。本次没有批准实施；下方保留 2026-11-11 原方案，不能把历史“已定案”直接当成当前开工许可。设计与实施计划尚未补齐。

## 迁移说明

原 B 的详细需求与调研已迁至 [B：调研依据保存与交接](../archive/2026-11/11-12-research-evidence-handoff/prd.md)；原 C 已迁至 [C：归档记录对应提交](../11-12-archive-commit-provenance/prd.md)。共同约束、任务映射及最终整合由父任务维护；本任务不继续维护 B、C 的完整正文。

## 后续规划复核点

2026-11-12 的评估提出：历史上缺少独立文件不能直接证明规划失败；内容指纹只能证明声明后文件没变，不能证明设计满足需求。三文件统一要求的代价，以及用户确认如何对应材料版本，留在 A 单独复核，未擅自改写以下既有需求。

## Research（调研）

拆分不产生新的外部调查。下方 `Notes` 中既有的外部先例及测量依据属于 A，继续保留；B 的外部方案记录不属于本任务。

---

# A. Gate planning artifacts before implementation starts

**Status:** Decisions closed 2026-11-11. Eight open questions were settled in discussion; each decision is recorded inline next to the requirement it produced and summarized under `## Notes`. The review the same day corrected two counts and one unmeasurable acceptance criterion; those corrections are marked below.

## Goal

A task may not enter `in_progress` until the AI has produced `design.md` and `implement.md` **and declared them in sync with the current `prd.md`**. The gate is structural: it checks that the three documents exist and that a sync record matches their current bytes. It does not judge whether the design is any good.

## Problem

Two separate failures, both real.

### Failure 1 — the artifacts are never required

`.trellis/workflow.md:167` states the rule in prose: "Lightweight tasks may be PRD-only. Complex tasks must have `prd.md`, `design.md`, and `implement.md` before `task.py start`." Nothing computes which case applies, and nothing looks at the files.

`task.py start` gates only on `implement.jsonl` / `check.jsonl` having curated entries (`packages/cli/src/templates/trellis/scripts/task.py:199-215`). `task.py validate` gates on the same two files (`packages/cli/src/templates/trellis/scripts/common/task_context.py:190-193`). Neither reads `design.md` or `implement.md`. The two artifact names appear in only three lines of the whole script tree, and none of them is a condition: the PRD scaffold's complex-task sentence (`packages/cli/src/templates/trellis/scripts/common/task_store.py:321`) and the two console hints at `:687`/`:688`. The line just above the scaffold, `:320`, carries the PRD-only sentence and mentions neither artifact. (Corrected after review: an earlier draft attributed the artifact names to `:320`, which holds only the PRD-only sentence.)

Measured in this repo: of 231 archived tasks, 30 (13%) have a `design.md` and 30 have an `implement.md`, but **only 28 have both**. The four disagreeing tasks are `07-22-no-trellis-skip` and `07-23-channel-trusted-context-dirs` (design only), plus `05-17-verify-trellis-subagent-pi` and `05-13-channel-post-text-input` (implement only). Of 14 active tasks, 11 are already `in_progress`; **6 of those 11 have neither file**, and the remaining 5 have both.

### Failure 2 — the artifacts drift out of sync with the PRD and nobody notices

This is the failure the file-existence check cannot see. The sequence that actually happens:

1. PRD discussion begins.
2. The AI writes `design.md` and `implement.md` early, before the PRD is settled.
3. The PRD keeps changing over several more turns.
4. All three files now exist. File-existence passes.
5. The AI asks "shall I start?" — and starts. The design describes an older PRD and nothing says so.

The user is asked to approve implementation against a design that no longer matches the requirements it was written for. This is worse than a missing file, because a missing file is visible and a stale one is not.

## Requirements

- **R1 — Three artifacts, every task.** `prd.md`, `design.md`, and `implement.md` must all exist in the task directory. No task-size classification and no "lightweight" carve-out. (Decided 2026-11-11: a size flag would be self-assigned by the same AI the gate exists to constrain, so it adds a field without adding a check.)

- **R2 — An `attest` command that records content fingerprints.** `task.py attest <task-dir> --note "<what changed>"` stores, in `task.json` under `meta.planningAttest`: a SHA-256 hash of each of the three files, the record time, and the non-empty note. Each attest overwrites the previous one; history lives in git, not in the file. The name is `attest` rather than `sync` because "sync" reads as "synchronize the files", which is not what this does — it is the AI declaring that the three files are aligned at this moment. (Decided 2026-11-11.)

- **R3 — The gate compares fingerprints, not file presence alone.** `task.py start` refuses to proceed when no attest record exists, or when any of the three files' current hash differs from its recorded hash. The error names the file whose bytes changed since the attest, not just "out of sync".

- **R4 — The attest note is mandatory and is shown to the user.** Attesting requires a non-empty note. `task.py start` prints the note so the user sees, in one sentence, what the AI claims changed. A hash by itself tells the user nothing; the note is the part they can act on.

- **R5 — Gate moment: `planning` → `in_progress` only.** The check runs in `task.py start` when the task's status is `planning`. A task already `in_progress` is never re-gated, so resuming old work does not fail. Archived tasks are untouched. (Consequence, decided 2026-11-11: the 6 active tasks already `in_progress` without either file are exempt and are **not** backfilled; they get one warning at archive time.)

  **Boundary this does not cover** (added after review): `workflow.md:570-574` explicitly allows returning to Phase 1 mid-implementation when a check reveals a PRD defect. A PRD edited at that point is never re-gated, so the record can go stale exactly the way Failure 2 describes, and nothing notices. Accepted rather than fixed: re-gating `in_progress` tasks would fire on every legitimate course correction, and the failure it would catch (design no longer matching a revised PRD) is visible to anyone who reads the two files. Do not claim in release notes that the fingerprint covers mid-implementation drift — it covers drift up to the moment of `start`.

- **R6 — No bypass flag.** The gate has no `--allow-*` escape. The existing `--allow-empty-context` flag keeps applying only to the jsonl manifests and must not disable this gate.

- **R7 — `task.py validate` reports the same findings** so the AI can check itself before attempting `start`, using the same function as the gate (one implementation, two call sites).

- **R8 — `task.py archive` warns, never blocks.** Refusing at archive would strand a task on disk. Missing artifacts or a stale attest print a warning naming the file, and the archive proceeds. (Decided 2026-11-11.)

- **R9 — `task.py create` does NOT scaffold `design.md` or `implement.md`.** Only `prd.md` is generated, as today (`task_store.py:571-576`). A skeleton file would satisfy the existence check while containing nothing, making the gate pass on an empty design — strictly worse than a missing file, which the gate catches. The AI writes the other two when it has something to say. What `create` must change is its **text**: the `## Notes` line `- Lightweight tasks can remain PRD-only.` in `_default_prd_content` (`task_store.py:320`) and the console hints at `:687-688` both go away, replaced by a statement that `design.md` and `implement.md` are required before `start`. (Decided 2026-11-11.)

- **R10 — Remove the lightweight/complex split from every document that ships it.** Corrected scope after review: **55 lines across 19 hand-edited source files**. The figure in this file before the review (20 sites / 11 files) undercounted badly, and a second pass caught one more omission (see the configurator bullet). The counts below come from `grep -c -i "lightweight|prd-only"` and exclude five legitimate unrelated hits that must stay (see the acceptance criteria).

  **Templates — 27 lines / 13 files** (raw grep finds 28 lines; one, `context-injection.md:29`, says "workflow-state is a lightweight hint" and is not about task sizing):
  - `packages/cli/src/templates/trellis/scripts/common/task_store.py` — 2: `:320` (the scaffold line copied into every new PRD), `:687` (console hint). The third source line, `:688` ("Complex task: add design.md and implement.md before task.py start"), carries no lightweight keyword but is rewritten with the other two.
  - `packages/cli/src/templates/trellis/workflow.md` — 7: `:167`, `:205`, `:218`, `:280`, `:305`, `:455`, `:666`
  - `packages/cli/src/templates/common/skills/brainstorm.md` — 2
  - `packages/cli/src/templates/common/commands/continue.md` — 2; `.../commands/start.md` — 1
  - `packages/cli/src/templates/shared-hooks/session-start.py` — 2; `codex/hooks/session-start.py` — 2; `copilot/hooks/session-start.py` — 2
  - `packages/cli/src/templates/copilot/prompts/brainstorm.prompt.md` — 2; `.../prompts/start.prompt.md` — 1
  - `packages/cli/src/templates/opencode/lib/session-utils.js` — 2
  - `packages/cli/src/templates/common/bundled-skills/trellis-meta/references/local-architecture/task-system.md` — 1; `.../customize-local/change-workflow.md` — 1

  **Configurator — 1 line / 1 file**: `packages/cli/src/configurators/shared.ts:642`, inside `buildPullBasedPrelude`, holds `lightweight tasks may be PRD-only, while complex tasks may also include design.md and implement.md`. It is the generator for the `.pi/agents/trellis-check.md:27` and `trellis-implement.md:27` prelude lines, so leaving it alone would leave those two rendered copies saying the old thing no matter how many templates get cleaned. (Added after review: the earlier 18-file list missed it, and its two output lines are inside the 66 rendered copies.)

  **Spec documents — 10 lines / 2 files:** `.trellis/spec/cli/backend/platform-integration.md` at `:1375`, `:1401`, `:1418`, `:1426`, `:1439`, `:1457`, `:1472`, `:1931-1932` (nine lines, eight sentences — `:1602` and `:1973` are the unrelated ones) and `.trellis/spec/cli/backend/workflow-state-contract.md:308`.

  **Marketplace — 17 lines / 3 files:** `marketplace/workflows/native/workflow.md` (7), `marketplace/workflows/tdd/workflow.md` (7), `marketplace/workflows/channel-driven-subagent-dispatch/workflow.md` (3). These are separate shipped workflows, not copies, so each is edited in place.

  **Rendered copies are regenerated, never hand-edited** — 66 further lines: `.trellis/workflow.md` (7) and `.trellis/scripts/common/task_store.py` (2) are dogfood twins that must stay byte-identical to their templates (`packages/cli/test/regression.test.ts:11771`), and 57 more live inside `.agents/` (9), `.claude/` (10), `.cursor/` (9), `.codex/` (2), `.opencode/` (10), `.pi/` (10), `.omp/` (7), all produced by `trellis update`. Regenerating them is part of the work, but the edit happens in the template.

  Archived tasks and existing task PRDs are **not** rewritten — they are history.

  **This is a behaviour change, not a wording cleanup.** The spec lines in `platform-integration.md` describe code that actually runs: `packages/cli/src/templates/shared-hooks/session-start.py:471-473` computes `has_prd` / `has_design` / `has_implement_plan`, `:488-510` branches on `missing_complex`, and `:499` prints `Lightweight task can request start review with PRD-only; complex task must add …`. Deleting the spec sentences while leaving that branch alive would make `.trellis/spec/` describe a world that does not exist. So the same change must rewrite the `missing_complex` branch to a single rule — artifacts missing means stay in planning and name what is missing — and carry that through every platform copy (`codex/hooks/session-start.py:286`, `copilot/hooks/session-start.py:285`, `opencode/lib/session-utils.js:101`, plus the `.claude/`, `.cursor/` hook copies). Same for `packages/cli/src/configurators/shared.ts:642` and the OpenCode `session-utils.js` fallback text. A ticket that edits only Markdown is not done.

  **Two shipped files also assert the old wording and must change with it**, or the build fails: `packages/cli/test/templates/shared-hooks.test.ts:226` expects `"Lightweight task can request start review with PRD-only"` and `packages/cli/test/regression.test.ts:7521` expects `/Lightweight: `prd\.md` can be enough/`. Both assertions move to the new wording.

- **R11 — Tests.** Python-side coverage: no attest record, stale hash on each of the three files, empty note rejected, `in_progress` task not re-gated, all-in-attest passing. Plus an integration test that a real `task.py start` on a planning task with three files but no attest record exits non-zero.

## Non-goals

- **No content quality check.** No section-name requirement, no minimum character count, no placeholder-token blacklist, no LLM judging. Density thresholds were considered and dropped: measured across the 7 active tasks that have both files, the thinnest legitimate artifacts are 817 and 515 raw characters (751 and 491 once heading lines are excluded), so any threshold either lets everything through or condemns honest short documents.
- **No per-requirement traceability.** Requirement IDs (`R1`, `R2`, …) are not required and the design is not checked against them. The fingerprint record covers drift up to `start`, without imposing a rewrite on the 12 of 14 active PRDs that use plain prose. (Corrected after review: an earlier draft claimed it covers "the drift this was meant to catch" without that qualifier — see R5's boundary note.)
- **No guarantee that the design is derived from the PRD.** The record proves the three files have not changed independently since the AI declared them in sync. It cannot prove the design was ever correct. Pretending otherwise would be a quality gate in disguise.
- No automated generation of design or implement content.
- No retroactive migration of archived tasks or of the active tasks that started without these files.
- No blocking of `task.py archive`.

## Acceptance Criteria

- [ ] `task.py start` on a `planning` task with all three files but no attest record exits 1 and says the attest record is missing.
- [ ] `task.py start` after editing `prd.md` following an attest exits 1 and names `prd.md` as changed since the attest.
- [ ] The same holds when `design.md` or `implement.md` is the edited file.
- [ ] `task.py start` after a fresh attest succeeds and prints the recorded note, and the `Next-Action` block that SessionStart emits names the same note so the user sees it without scrolling.
- [ ] `task.py attest` rejects an empty or whitespace-only note.
- [ ] `task.py attest` writes `meta.planningAttest` into `task.json` and preserves every existing `meta` key.
- [ ] `task.py attest` hashes file bytes after normalizing CRLF to LF, so a file checked out on another machine does not produce a false "changed" verdict.
- [ ] `task.py start` on a task already `in_progress` succeeds without gate checks.
- [ ] `--allow-empty-context` does not bypass this gate; a test asserts it.
- [ ] `task.py validate` reports the same artifact findings as `start`, with a documented exit code (non-zero when any file is missing or stale, zero otherwise, regardless of task status).
- [ ] `task.py archive` on a task with a stale attest warns and still archives.
- [ ] `task.py create` produces **only** `prd.md` — no `design.md`, no `implement.md`.
- [ ] `task.py create` in a fresh task produces a `prd.md` whose `## Notes` no longer mentions lightweight/complex, and a console hint that names both required artifacts.
- [ ] **Replaced after review** — the original criterion `grep -rn -i "lightweight\|prd-only" … returns no match describing a task split` cannot be judged by a machine, and a narrow regex does not rescue it either: `prd-only|lightweight task` misses 10 of the 54 lines, because the wording varies (`Lightweight: \`prd.md\` can be enough`, `decide whether the task is lightweight or complex`, and a sentence in `platform-integration.md` that wraps mid-phrase).

  The replacement is a per-file expected count over the 19 files in R10, using `(?i)lightweight|prd-only`, measured **after** the edit:
  - **18 files expect 0 matches.**
  - `.trellis/spec/cli/backend/platform-integration.md` expects **2**, not 0: the 9 sizing lines go, and two unrelated lines must survive (`:1602` "a single lightweight task uses no parent/child structure", `:1973` "A lightweight hook … fires on every user prompt"). Asserting 2 keeps a future editor from "cleaning up" the file by deleting them.
  - `.trellis/scripts/common/task_store.py:688` (`Complex task: add design.md and implement.md before task.py start`) contains no keyword at all, so the count cannot see it. It gets its own assertion: the file must contain the new required-artifacts sentence and must not contain `PRD-only`.
  - `.pi/agents/trellis-check.md` and `.pi/agents/trellis-implement.md` are rendered from `packages/cli/src/configurators/shared.ts:642`, so their count stays 0 only if the configurator changes; a test that asserts 0 there without touching the generator would be asserting a number the next `trellis update` breaks.

  `.trellis/spec/cli/backend/commands-channel.md` and `context-injection.md` are deliberate exclusions and are not checked; each keeps its `lightweight alias` / `lightweight hint` lines untouched.

  The count is asserted as an exact number rather than "no match", so a partial edit that removes three of a file's seven lines fails the test.
- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test` pass; both script trees stay byte-identical.

## Notes

- What the record proves: the three files have not changed independently since the AI attested to them. What it does not prove: that the design is any good, or that the AI did not attest across mismatched content. Like Aegis's evidence mechanisms, it makes the correct path the default and makes drift visible; it does not prevent lying.
- The user-facing value is R4. A hash tells nobody anything, but "PRD added the archive-warning requirement; design §7 updated" is a sentence the user can accept or reject. If the note becomes boilerplate ("updated docs"), the mechanism has degraded to a checkbox — the same failure mode as the marker reasons in `11-11-deferred-marker`.
- **Why no scaffold (R9).** A generated empty `design.md` would satisfy the existence check while containing nothing, so the gate would pass on an empty design. A missing file is caught; an empty one is not. Verified against the 37 existing `design.md` files: the thinnest is 817 characters and every one has real content, so humans do not write empty shells — only a generator would.
- **Why `task.json` instead of a sidecar file (R2).** `meta` is already an extension point: 49 of the 245 task records in the repo carry a non-empty `meta` (143 hold an empty `{}`), and the populated ones are dominated by issue links — 44 `linear_issue` and 4 GitHub issue keys — plus one `fp_analysis` object. That last one matters most: it is structured, nested data that scripts already read and write, so `planningAttest` is not asking `meta` to do anything new. Every script writes `task.json` by reading the whole object, changing one key, and writing it back, so unknown keys survive. Corrected after review: the earlier claim "no other task directory carries an auxiliary JSON" is false — there are 240 such files. All but one live in a single research task: 239 under `.trellis/tasks/archive/2026-06/05-12-trellis-agent-runtime/research/codex-schema/` (202 in `v2/`, 35 at its root, 2 in `v1/`), plus `06-15-release-v0-6-0-ga/research/0.6.0-manifest-draft.json`. The decision still holds, because every one of them is a research payload, none is task state, and none is written by `task.py`.
- **Decisions closed 2026-11-11** (all confirmed by the user in discussion): command name `attest`; record stored in `task.json` `meta.planningAttest`; `create` does not scaffold the two artifacts; `archive` warns rather than blocks; the 6 already-`in_progress` tasks without artifacts are exempt and not backfilled; every mention site gets cleaned, including the three in `task_store.py` that generate the others.
- Prior-art note (2026-11-11): published PRD conventions were surveyed and deliberately not adopted. GitHub's [spec-driven workflow](https://github.com/github/awesome-copilot/blob/18362138723066ce0dbaf7976d1a2921e79a54e4/instructions/spec-driven-workflow-v1.instructions.md) requires EARS notation and explicit traceability; a typical [requirements PRD template](https://github.com/catlog22/claude-code-workflow/blob/07491b04ac30c9a2d887f443661288b1b7520832/docs/skills/templates/requirements-prd.md) uses `REQ-NNN` IDs, MoSCoW priorities, and a traceability table. Both are heavier than this problem needs and would fail the existing PRD corpus.

---

