# C：归档记录对应提交

## 本任务归属与当前状态

父任务：[完善任务材料的可靠性与可追溯性](../11-12-task-artifact-reliability/prd.md)。本任务从 [原入口 A](../11-11-planning-artifact-gate/prd.md) 中的 C 节拆出，下方原方案、测量口径、已知限制与验收保持完整。

2026-11-12 用户批准的是任务拆分与材料迁移，不是本任务实施。继续处于规划阶段，后续单独审阅、补齐设计和实施计划。代码提交存在性校验与归档警告等边界以本任务最终审阅结果为准。

## Research（调研）

本次迁移无需外部调查。下方证据来自原仓库任务记录、脚本和提交历史，保留 2026-11-11 测量口径；本轮未重新测量，不把“迁移校验通过”表述为原统计全部复核通过。

---

# C. A task's edit provenance is not recorded

**Status:** **Redesigned 2026-11-11 after review.** The original design gated `task.py archive` on a commit hash derived by scanning `git log` for the task directory. Measurement killed it: the derivation returns nothing for most tasks and a repository-wide commit for many of the rest. The replacement records provenance forward, at the moment the AI still knows the answer, and never blocks.

## Measurements (2026-11-11)

`packages/core/src/task/schema.ts` defines 24 canonical task fields (the `TASK_RECORD_FIELD_ORDER` list at `:44-69`). Across 231 archived tasks:

| Field | Non-empty | Why |
|---|---|---|
| `creator` / `createdAt` | 230 / 231 | `task.py create` writes them; `04-16-skill-first-refactor` predates `creator` and uses the older `created` key |
| `base_branch` | 195 | `create` / `set-base-branch` writes it |
| `branch` | 12 | `task.py start` fills it only if empty |
| `pr_url` | 4 | no command writes it |
| `commit` | 3 | no command writes it |
| `relatedFiles` | 2 | `trellis init` writes it for its own bootstrap tasks (`packages/cli/src/commands/init.ts:577`, `:594`); `task.py` cannot |
| `updatedAt` | — | field does not exist |

`task.py` exposes **17** subcommands (`create`, `add-context`, `validate`, `list-context`, `start`, `current`, `finish`, `set-branch`, `set-base-branch`, `set-scope`, `set-meta`, `rename`, `archive`, `list`, `add-subtask`, `remove-subtask`, `list-archive`), and none of them can write `commit`; `set-meta` only writes inside `meta`. The 3 filled `commit` values were hand-edited, and **one** of them no longer resolves: `08-10-full-trellis-ablation`'s `3ea84685`. (Corrected after review: `04-21-task-schema-unify` stores five hashes as one comma-joined string, and each of `4eaa2b5`, `b323e93`, `c0f0806`, `ef07e6c`, `f12b5c4` still resolves to a commit that is an ancestor of `HEAD`. The earlier "2 of 3 are dangling" came from running `git cat-file` on the joined string instead of on each hash.)

A counting caveat, because it explains the denominators: **10 of the 231 archived `task.json` files are not valid JSON** (unquoted scalars such as `"dev_type": docs`, all from 2026-01). Counts above are over the raw text, so they include those ten wherever the field itself is quoted; a strict `JSON.parse` pass gets 221 records and reports `creator` as 220/221, `relatedFiles` as 0. `task.py` never wrote those files and cannot read them back, which is a separate pre-existing defect out of scope here.

**Why deriving it backwards does not work.** The original design assumed `git log -- <task dir>` could recover the answer. Measured once, under one stated method, it cannot.

The method, so these numbers are reproducible rather than folklore: take every commit reachable from `HEAD` (`git log --name-only` over 1369 commits including merges; `--no-merges` gives 1271 and identical results), keep commits that touch the task directory, drop commits whose subject starts with `chore(task): archive `, and require at least one changed path outside `.trellis/`. Then ask the question the gate would actually ask — on the **live** path `.trellis/tasks/<name>`, before archiving, over the 231 archived tasks:

| Candidates on the live path | Tasks |
|---|---|
| none | 114 |
| exactly one | 101 |
| two or more | 16 |

- **114 of 231 tasks have no candidate at all.** A "print the candidate list and let the AI choose" step would print an empty list and leave `--skip` as the only way forward.
- **34 of the 101 single-candidate tasks point at a commit touching more than 50 files** — repository-wide sweeps like `700e7d313` ("feat: skill-first template refactor", 479 files, touching 92 task directories) and `3c3bb027a` ("Release v0.6.0", 854 files, touching 39). Writing such a hash in automatically would not be a missing record; it would be a plausible-looking false one, which is worse.
- Measured on the **archived** path instead — the most generous variant of the method, where the directory has stopped moving — the numbers only improve to 105 none / 94 one / 32 multi, and 80 of those 94 single candidates are again >50-file commits. Retroactive recovery is not a fallback here; it is a different, smaller feature.

Archiving does not help because the commit history was never built for this. Against `HEAD`, 94 commits carry an archive subject, 88 of the 231 tasks match one exactly, and 91 have their name appear in some subject somewhere. Across **all** refs (`--all`), those become 134 archive subjects, 123 exact matches, and 126 mentions. (Corrected after review: the earlier claim of "126 of 231 archive commits" conflated these three quantities — number of archive commits, number of tasks with an exact archive commit, and number of tasks whose name appears in any subject — and mismatched its reference set.)

Separately, a task's work and its task directory are often committed separately: `_auto_commit_archive` (`packages/cli/src/templates/trellis/scripts/common/task_store.py:1466`, not `safe_commit.py`) stages only paths under `.trellis/`, so a work commit never rides along with the archive commit — that part is true regardless of `--no-commit` or `session_auto_commit`. Whoever records the hash must do it explicitly.

## Why this is still worth recording

The value is not enforcement; it is that after archiving, `commit` is the only field that answers "which change was this task?" — and today nothing writes it, so it answers nothing for 228 of 231 tasks. A record written while the AI still knows the hash costs one command; the same record reconstructed a month later costs a git-archaeology session that usually fails.

## Decisions closed

1. **Record the commit as an argument to `archive`, not as a separate command.** `task.py archive <task-name> --commit "h1,h2"` writes the hashes into `task.json` **before** moving the directory, in the same command that ends the task. The earlier design put a `set-commits` subcommand in `check.md`, which was unworkable: `check.md` is the Phase 2.2 quality skill and the commit does not exist yet when it runs, and after archiving a name no longer resolves through `find_task_by_name` (which searches `.trellis/tasks/` only), so there is no second chance. `--commit` is optional at the CLI level to keep `archive` usable, but `finish-work.md` Step 3 calls it.
2. **Multiple hashes are stored comma-joined and read by splitting.** `commit` stays `string | null` in `packages/core/src/task/schema.ts:30`, and that line gets a JSDoc comment saying so, because the type alone does not. This is not an invented encoding — `04-21-task-schema-unify` already holds five hashes that way. The format becomes defined: comma-separated, no spaces, each a full or abbreviated hash that resolves. Every consumer splits on `,` before handing anything to git; `git show --name-only "a,b"` fails with `fatal: ambiguous argument`. Changing the field to `string[]` is a separate schema change with its own migration and is out of scope.
3. **Validation happens at write time and at archive time, and only write time blocks.**
   - `archive --commit` **rejects** a hash that does not resolve to a commit, so an unreadable record cannot be written in the first place.
   - `archive` **warns, never blocks**, when `--commit` is omitted or a previously recorded hash no longer resolves, and prints the exact command to repair it. It offers no `--skip-*` for this, because there is nothing to skip: the archive proceeds either way. A blocking gate was rejected: the measurement above shows it would fire on the majority of historical tasks, and a gate everyone bypasses is worse than a warning that names a one-line fix.
4. **No ancestry or file-set check.** `git merge-base --is-ancestor` rejects hashes from squash-merged branches, the most common way a legitimate task commit disappears from the main line; a "touches a non-`.trellis/` path" check would reject documentation-only tasks. Neither check earns its false positives.
5. **`relatedFiles` is not stored.** The measured median per task is 189 non-`.trellis/` files and the maximum is 337, and nothing reads the field. Derive a list from the recorded commit on demand, splitting the string first. The field stays in the schema untouched.

## Known gap

The warning at archive time is the *last* moment anyone sees this record, and the archive output is one line followed by the task directory disappearing. Nothing reads `commit` afterwards, and `task.py list-archive` prints directory names only, so a missing hash is invisible forever. This is accepted for now — the same reason `commit` is empty in 228 of 231 tasks today is that no command ever asked for it, and `--commit` fixes the asking. What would make it fail: the AI omitting `--commit` because it is optional, and the warning scrolling past in the closing seconds of a session. The mitigation is placement, not enforcement — `finish-work.md` shows the `--commit` form in the same code block as `archive`, so the default action writes it. Re-examine if a month of archives shows the flag being skipped.

## Non-goals

- No `updatedAt` field. The task directory is fully git-tracked (1367 tracked files, 1300 of them archived), so `git log -- .trellis/tasks/<dir>` already answers "when did this record change and who changed it". Adding a timestamp would duplicate git with a value that can lie.
- No automatic derivation of `pr_url` or `branch` in this change.
- No retroactive backfill of the 231 archived tasks. The 126 whose name appears in a commit subject are recoverable through `git log`; guessing at the rest would be worse than a gap.
- No change to `relatedFiles` semantics or schema.
- No CI-level enforcement and no archive-time block.

## Acceptance Criteria

- [ ] `task.py archive <name> --commit "h1,h2"` writes `commit` as `h1,h2` into `task.json` **before** the directory moves, and the written value survives the move.
- [ ] `task.py archive <name> --commit "deadbeef"` (a hash that does not resolve) exits non-zero and archives nothing.
- [ ] `task.py archive <name>` with no `--commit` archives, and prints a warning that contains the literal repair command.
- [ ] `task.py archive <name> --commit ""` is treated as omitted, not as an empty-string value.
- [ ] `task.py list` and `task.py list-archive` are unchanged by this — no new column, no new read path. The record exists for a human or a future consumer, not for today's output.
- [ ] `packages/core/src/task/schema.ts:30` carries a comment stating the comma-joined format and that consumers split before calling git.
- [ ] `packages/cli/src/templates/common/commands/finish-work.md` Step 3 shows the `--commit` form, in the same code block as the archive call.
- [ ] Both script trees stay byte-identical (`packages/cli/test/regression.test.ts` parity test).
