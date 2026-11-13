# A：开工前规划材料检查

## 本任务归属与当前状态

父任务：[完善任务材料的可靠性与可追溯性](../11-12-task-artifact-reliability/prd.md)。本任务沿用原 `planning-artifact-gate` 的身份、目录、创建日期和负责人，只负责 A 的需求。

2026-11-12 已按用户确认完成结构拆分。本次没有批准实施；下方保留 2026-11-11 原方案，不能把历史“已定案”直接当成当前开工许可。设计与实施计划尚未补齐。

## 迁移说明

原 B 的详细需求与调研已迁至 [B：调研依据保存与交接](../archive/2026-11/11-12-research-evidence-handoff/prd.md)；原 C 已迁至 [C：归档记录对应提交](../11-12-archive-commit-provenance/prd.md)。共同约束、任务映射及最终整合由父任务维护；本任务不继续维护 B、C 的完整正文。

## 后续规划复核点

2026-11-12 的评估提出：历史上缺少独立文件不能直接证明规划失败；内容指纹只能证明声明后文件没变，不能证明设计满足需求。三文件统一要求的代价，以及用户确认如何对应材料版本，留在 A 单独复核，未擅自改写以下既有需求。

## 2026-11-12 已确认补充：确认对应材料版本

来源：本会话中，主会话询问“你确认之后，只要需求、设计或实施计划发生实质变化，就必须重新展示变化并获得你的确认，才能开工？”，用户明确回复“是的，同意。”。这是用户产品决定，不是程序能力已验证。

- 在用户确认开工前，先核对并修正需求、设计、实施计划之间的矛盾，展示对应版本及人能理解的变化和边界。
- 用户确认后、实际开工前，任一材料发生实质变化，旧确认不再覆盖新方案；须停止开工，重新展示变化并获得用户确认后才能开始。
- 实质变化包括改变范围、行为、方案、兼容性、风险、验收或实施步骤含义；模型重新计算内容指纹或重新声明一致，不能替代用户确认。
- 本次确认针对实质变化；没有批准“任何字节变化都必须再次询问”。纯排版、错别字等不改变含义的修订如何与指纹校验协调，留待设计明确；不能把实质变化冒称文字润色来沿用确认。
- 本节记录开工前的版本对应要求；三文件要求和实施中实质变化后的重新确认，已由后续补充决定确认。本次仍不构成A实施授权，也不意味着每次普通修改都触发程序门禁。

验收补充：用户确认甲版后，模型若将任一材料改成实质不同的乙版，即使重新生成了有效指纹，也不能沿用甲版确认开工；应能从任务材料还原变化、重新展示及用户确认所针对的版本。程序版本检查与模型语义审阅、用户批准的保证边界需分别说明。

以下2026-11-11原方案保留追溯；涉及确认顺序和实质变化后的再确认，以本节已确认决定为准，其余历史要求不因本次答复自动重新定案。

## 2026-11-12 已确认补充：统一三份规划材料

来源：主会话建议“保留统一三份，但允许写得很短”，并询问“是否同意保留这个统一三份、内容可短的要求？”，用户回复“可以”。这是对原R1的再次确认，不是A实施授权。

- 所有任务首次进入实施前，统一准备prd.md、design.md和implement.md，不由模型自评“任务简单”而省略其中一份。
- prd.md说明做什么、范围约束和怎样算完成；design.md说明准备怎样解决及为什么；implement.md说明执行步骤和验证方式。
- 内容可按问题规模简短表达，不设最低字数、不重复凑篇幅；各文件应承担上述作用，不能用空文件或重复正文冒充完成规划。
- 材料齐全和指纹有效仅是结构与版本条件，不能替代内容一致性审阅或用户确认。程序如何识别空白等最低有效性，留待设计明确，不引入语义质量评分。
- 保持不自动生成空设计/空计划、不为普通恢复追补既有任务材料的兼容边界；实施中若发生实质变化，则按下节规则更新相关规划材料并重新确认。

验收补充：用一个很小的任务验证三份材料仍齐全且各有用途，内容可短；不接受以“简单任务”为由缺少设计或计划，也不把字数或文件数当成规划质量证明。

## 2026-11-12 已确认补充：实施中实质变化重新确认

来源：主会话建议“已经开工后，如果需求、方案或验收标准发生实质变化，暂停受影响的工作，更新相关材料并重新获得你的确认，再继续；按已确认方案正常写代码、修正实现错误，则继续执行即可”，用户回复“同意”。这是对变更处理原则的确认，不是A实施授权。

- 已进入实施的任务，若需求、方案或验收标准发生实质变化，立即暂停受影响的工作，返回规划讨论并核对相关影响。
- 按变化更新需求、设计、实施计划中的相关内容，使三份材料相互对应；向用户展示变化、影响和待继续执行的版本，获得再次确认后才能继续受影响的工作。
- 按已确认方案正常编码、补充测试、修正实现未满足原要求的错误，可以继续；不因普通代码修改、会话恢复或任务已实施就一律重新审批。若修错必须改变已确认的范围、方案或验收标准，则适用实质变化规则。
- 暂停针对受影响工作，不自动扩大为所有独立任务或无关工作的全局停止；不能把存在依赖的工作称为“无关”而继续执行变更后的方案。
- 旧确认不能覆盖实质不同的新方案；重算指纹、模型自写批准字段或仅保留in_progress状态，都不能替代用户再次确认。
- 本决定覆盖实施中的实质变化，取代原R5将该情形完全列为不覆盖的范围。普通恢复及既有任务兼容继续保留；具体回到规划、保存确认版本及重新进入实施的命令和状态机制，须在设计中明确，不因本次答复自动认定已有程序门禁。

验收补充：实施中将“只保存在本机”改为“上传远程服务”时，必须在执行受影响的新方案前暂停、更新相关材料、展示影响并获准；按原离线要求修正本地保存错误则可继续。验证应检查实际行为与确认顺序，不能只检查状态字段或指纹有效。

## Research（调研）

拆分不产生新的外部调查。下方 `Notes` 中既有的外部先例及测量依据属于 A，继续保留；B 的外部方案记录不属于本任务。

2026-11-12 已完成[规划方案审查](research/planning-review-2026-11-12.md)：核对现有源码与测试，并在固定提交的隔离样例中复现10种开工/恢复/校验行为。审查提出的版本对应、统一三文件和实施中实质变化处理三项产品取舍，已由本会话后续答复确认，见上述补充决定；原R1—R11保留历史追溯，有冲突时以上述当前决定为准。程序机制、兼容细节和测试尚需整理到设计与实施计划，A尚未获准实施。未新增外部调查。

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

