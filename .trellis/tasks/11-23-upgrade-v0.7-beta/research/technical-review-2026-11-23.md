# Technical review of the upgrade plan — findings and dispositions

Second attempt at the technical review (the first run died without a report). Scope
was deliberately narrowed to three questions the other two reviews did not cover:
is the eight-conflict list complete, is the DSH edit list complete, and do the
verification commands actually run.

**Headline: the plan cannot be executed as written.** Three blocking defects, all
reproduced here. Two of them invalidate design decisions rather than typos, so they
are recorded as decisions D5–D7 below.

## Blocking, and confirmed

### B1 — Dropping the DSH paragraphs breaks five tests, and no plan step mentions them

`design.md §2a` says: delete the three DSH bullets (383/535/584) and the DSH
sentences on 236/240. Measured consequences:

| test | assertion | what breaks |
| ---- | --------- | ----------- |
| `test/templates/trellis.test.ts:193-195` | `pullBasedMarker = "[Gemini, Qoder, Copilot, Reasonix, Trae, Grok, Kimi Code, DeepSeek Harness]"`, then `platformBlock(implement, marker)` throws if the block is missing | deleting DSH from the class-2 list destroys the block name the test looks up |
| `test/templates/trellis.test.ts:251-261` | nine substrings (`default continuable background mode`, `native settlement notice`, `optional companion plugin`, `once per dependent child id`, `` Without `trellis_wait` ``, `run_in_background: false`, `Never simulate waiting…`, `trellis-agent-<role>`) asserted present in `workflowMdTemplate` | every one of them lives **only** on lines 236/240/383/535/584 — the exact lines §2a deletes |
| `test/commands/update.integration.test.ts:883`, `:1574` | the same class-2 marker string, asserted after an update | same block name |
| `test/regression.test.ts:8627` (`[dsh] get_context phase filtering keeps DeepSeek Harness instructions`) | `--mode phase --step 2.1 --platform dsh` output contains `Spawn the implement sub-agent` and `DeepSeek Harness` | with DSH in the inline group, dsh hits the inline block: 5 numbered steps, no `Spawn`, and the marker line is filtered out |

The last one is not hypothetical. I ran the real resolver against the merged tree's
workflow and got `Spawn the implement sub-agent: False`, `DeepSeek Harness: False`.
And against the merged tree's *current* (unmodified) workflow: `Spawn … False`,
`DeepSeek Harness: True`. **Neither configuration satisfies that test** — it was
written against beta's dispatch wording and beta's classification together.

`design.md` §5 lists only the three interpreter fixes as follow-ups. §2a's edit list
has no test step at all. This is the single largest gap in the plan.

### B2 — three `<…>` placeholders cannot execute in PowerShell

`implement.md:326,329,334`: `task.py start <task-with-only-prd>`,
`task.py archive <scratch-task>`, `task.py workflow <id>`. Reproduced:

```
ParserError: 运算符"<"… (the "<" operator is reserved for future use)
```

### B3 — the CRLF check asserts nothing

`implement.md:330`: `git diff --stat; # then assert no CRLF`. `#` starts a comment, so
only `git diff --stat` runs, and because `DEFAULT_SESSION_AUTO_COMMIT = True`
(`common/config.py:24`) the archive command commits its own output — the working tree
is clean and `git diff --stat` prints nothing. A silent no-op reads as a pass.

## Misleading, and confirmed

| # | claim | measured |
| - | ----- | -------- |
| M1 | §2a: "class-2 list that names DSH — 1 — line 528" | lines 528 **and 541** are the same block's opening and closing lines. Correcting the plan gives 12 hits, not 10, unless 541 is also edited |
| M2 | §2a table: "inline-group tag lines that name DSH 10" presented as the merged state | the **merged** tree's inline lines are `[codex-inline, Kilo, Antigravity, Devin]` — no DSH. The ten DSH-bearing inline lines exist in the fork and in `v0.6.17`, not in the merge result |
| M3 | "236's DSH sentence" | line 236 names DSH **twice**: once in the class-2 enumeration (`…Kimi Code/DeepSeek Harness, hook-backed…`) and once in `On DeepSeek Harness, tell the child…`. Deleting "the sentence" leaves one hit |
| M4 | §2 row 2 and `implement.md:122`: "fork file is 193 KB, beta's is 2.4 KB — beta rewrote the document" | bytes: fork 193,861 / beta 197,630 / merged 202,524. The conflict block at 1266 is four rows of a Class-3 table differing by trailing whitespace and `if present` — not a rewrite, not 2.4 KB, not frontmatter |
| M5 | §5: `pi-truncate-utf8.integration.test.ts` "(0, but uses the same guard shape)" | 85 lines, no `spawnSync`, no `hasPython`, no python invocation. The only occurrence is a comment. Nothing to change |
| M6 | §6.1 / AC1: markers grep `^(<{7}|>{7})( \|$)` is "the stricter form" | it cannot see `=======`. With `:!.trellis/tasks/archive` the `={7}` alternative has **zero** false positives (6 real hits) while the archive holds 18, so excluding the path already solves the stated reason for dropping it |
| M7 | `implement.md:23`: "Expect exactly three entries" from `git status --porcelain` | there are five: three `M` plus the two untracked task directories |
| M8 | `implement.md:36`: "roughly 141 files merged cleanly" / `:40` eight `UU` | 142 clean entries; and with submodules initialised `docs-site` lands `MM` after the fast-forward, so the `UU` filter prints 7 |

## What the review confirmed as sound

- The eight-conflict list is complete: `git merge-tree` reports 7, a real
  `merge --no-commit` in a throwaway worktree reports 7 `UU` plus `docs-site`'s `MM`.
  No ninth conflict.
- All 16 line numbers in §2a exist and match the merged file's content.
- `platform-map.md`, `agents.md`, `skills-and-commands.md`, `templates/dsh/DSH.md`
  describe product behaviour of `trellis init --dsh` and do not conflict with D1.

## Decisions this forces

**D5 — DSH goes into the sub-agent group, not the inline group. D1 is reversed.**

The evidence against D1 is what the review surfaced: beta does not merely describe
DSH sub-agents, it *ships* them. `packages/cli/src/configurators/dsh.ts:58-72`
(`resolveDshAgentSkills`) republishes `getAllAgents()` as `trellis-agent-*` skills
under `.dsh/skills/`, and `packages/cli/src/templates/dsh/agents/trellis-{research,
implement,check}.md` exist in the merged tree. So the skills are not "missing" in
principle — they are missing only because this repository has dsh unconfigured, which
is a state the follow-up task may change. Meanwhile D1's cost is concrete: five test
files must be rewritten, and `v0.6.17`'s behaviour is restored by forcing an obsolete
classification onto a tree whose CLI now emits the opposite.

D1's own justification — "the paragraph would tell a session to load files that do not
exist" — is weaker than it looks once the skills *do* ship with the package: the
sentence describes what `trellis init --dsh` produces, which is true of the product
even though this repository has not run it.

Conclusion: **keep beta's routing as merged.** No §2a edits at all. The merged tree is
then internally consistent (`trellis-agent-` 5 hits, all inside the DSH paragraphs;
DSH in the sub-agent group and the class-2 list; zero DSH in the inline group) and
`workflow.md` needs only the two real conflict blocks resolved, in favour of the
fork's planning rules.

This deletes B1 entirely, removes M1–M3, and reduces the whole `workflow.md` step to
"resolve 379 and 569".

**D6 — the CRLF check counts bytes.**

Replace B3 with an assertion that cannot pass vacuously:

```powershell
$cr = 0; $bytes = [IO.File]::ReadAllBytes('.trellis/scripts/task.py')
foreach ($b in $bytes) { if ($b -eq 13) { $cr++ } }
$cr   # must be 0
```

Measured on the current tree: 0 CR bytes, so the check is meaningful and currently
green.

**D7 — every placeholder becomes a concrete literal in the plan.**

`<id>` → `smoke`, `<scratch-task>` → `smoke-task`, and the "task with only prd.md" is
created explicitly in a temp clone rather than described.

## Corrections carried regardless of D5

- `pi-truncate-utf8` drops out of the interpreter follow-up list (M5): two files, not
  three.
- `platform-integration.md` is described as "one Class-3 table row group differing by
  trailing whitespace and `if present`" (M4), not as a rewrite.
- `platform-integration.md` size in §5 becomes 202,524 B (M4).
- Conflict grep keeps `={7}` and keeps the archive exclusion (M6).
- Step 1 expects five dirty entries and names all five (M7).
- Step 2 expects seven `UU` plus `docs-site` `MM`, and says so (M8).
