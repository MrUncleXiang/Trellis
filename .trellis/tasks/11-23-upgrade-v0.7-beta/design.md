# Design — upgrade to upstream 0.7.0-beta.4

## Shape of the change

```
one merge commit                 eight conflict resolutions          four follow-ups
─────────────────                ──────────────────────────          ───────────────
codex/upgrade-v0.7-beta          two workflow.md copies              .version → beta.4
  ← upstream/feat/v0.7-beta      template hashes (regenerated)       config.yaml sections
  ← codex/personal (base)        platform-integration.md             test/helpers/python.ts
                                 regression.test.ts                  in the three new tests
                                 shared-hooks.test.ts
                                 marketplace (submodule)
                                 docs-site (submodule)
```

Nothing is cherry-picked and nothing is retyped. The merge is the change; the
follow-ups are the small number of places where git's automatic result is correct
but incomplete for this repository.

## 1. Why a merge and not `trellis update`

`trellis update` copies files out of the installed package and asks the user to
decide per file. On this repository the installed package is 0.6.17 and the
working tree *is* the newer template source, so the direction is backwards:

```
trellis update (dry run, measured)   git merge (measured)
──────────────────────────────────   ────────────────────
95 files "modified by you"           8 conflicts
43 files auto-overwritten            141 files merged cleanly
task.py among the 43                 task.py merged with both feature sets intact
```

The merge preserves the fork's own edits because git compares changes. `update`
cannot, because all it knows is "this file's bytes differ from the package's".

Merging also sidesteps the version gate: `trellis update` refuses to run when the
CLI is older than the project (`compareVersions('0.6.17', '0.7.0-beta.4')` is
`-1`), so a merge-upgraded tree could never be repaired by the global CLI anyway.

## 2. Conflict resolution — one row per conflict

| # | Path | Nature | Resolution |
| - | ---- | ------ | ---------- |
| 1 | `.trellis/.template-hashes.json` | 6 hunks of clashing hash values; pure derived state | Do not resolve by hand. Recompute after the tree is final (§4). |
| 2 | `.trellis/spec/cli/backend/platform-integration.md` | One body block at line 1266: four rows of a Class-3 table differing by trailing whitespace and by `if present`. Byte sizes are close (fork 193,861 / beta 197,630 / merged 202,524), so this is not a rewrite | Keep the form the beta side adds (`if present`), since it matches the merged planning gate. The rest of the two versions already agrees. |
| 3 | `.trellis/workflow.md` | Two real conflict blocks (379, 569). Nothing else: measured on the merge tree, `trellis-agent-` occurs 5 times and all five are inside beta's DSH paragraphs; `DeepSeek Harness` occurs 17 times, 12 on sub-agent-group tag lines and **0** on inline-group lines | Manual three-way merge. At 379 keep the fork's two research rules **and** beta's DSH bullet — they answer different questions. At 569 take beta's list, which is the fork's list plus `DeepSeek Harness`. See §2a for why no further DSH edits are made. |
| 4 | `packages/cli/src/templates/trellis/workflow.md` | Same content, same file shipped to users | Same resolution as #3. Then assert the two copies are identical after `python3` → `python` normalization. |
| 5 | `packages/cli/test/regression.test.ts` | `AMBIENT_SESSION_ENV_KEYS` starts at line 2007; the conflict is inside the DSH entries | Union: keep `DSH_SESSION_ID`, add `DSH_TRELLIS_CONTEXT_ID` and `DSH_SHELL`. |
| 6 | `packages/cli/test/templates/shared-hooks.test.ts` | Line 233: assertions about `session-start.py` wording | Keep the fork side. Measured on the merged tree: the fork sentence occurs once, both beta sentences occur zero times — beta's assertions would fail. |
| 7 | `marketplace` (submodule) | Fork pins `60228d8` (reachable only on `personal/codex/planning-artifact-gate`), beta pins `62a77c9` (on `origin/main`); merge base `d286b2c`, 5 and 4 commits on each side. Upstream `.gitmodules` points at `mindfold-ai/marketplace`, the fork at `MrUncleXiang/marketplace` | Inside the submodule: `git merge 62a77c9`, resolve there, commit there, **push**, then `git add marketplace` in the parent. Never silently keep either pointer — the content differs. |
| 8 | `docs-site` (submodule) | `587a1c8` → `ec975c3` is a fast-forward | Accept the fast-forward. |

Two facts make #3 and #4 safe to resolve by content rather than by side: after the
merge the merged `session-start.py` carries the fork's wording, and the two
`workflow.md` copies are byte-identical apart from the `python3`/`python` literal.
Both are checked in §6.

## 2a. DSH: why the merge result is kept, and what the alternative would cost

An earlier draft of this design removed `DeepSeek Harness` from the sub-agent group
and deleted beta's DSH paragraphs, on the reasoning that this repository has dsh
unconfigured so the `trellis-agent-*` skills those paragraphs name do not exist.
The technical review showed the cost of that edit and the reasoning behind it was
wrong; decision D5 reverses it.

**Why the reasoning was wrong.** Beta does not only describe DSH sub-agents, it ships
them: `packages/cli/src/configurators/dsh.ts:58-72` (`resolveDshAgentSkills`)
republishes `getAllAgents()` as `trellis-agent-*` skills under `.dsh/skills/`, and
`packages/cli/src/templates/dsh/agents/trellis-{research,implement,check}.md` exist in
the merged tree. The skills are absent from *this working tree* only because
`.trellis/.template-hashes.json` has zero `.dsh/` entries and `trellis platforms`
lists six platforms without dsh. That is a configuration state, not a missing
capability — and it is exactly what `11-23-dsh-native-subagents` exists to decide.

**What the edit would have cost.** Five assertions across four test files are tied to
the merged routing:

| file | what fails |
| ---- | ---------- |
| `test/templates/trellis.test.ts:193-195` | `platformBlock(implement, "[Gemini, Qoder, Copilot, Reasonix, Trae, Grok, Kimi Code, DeepSeek Harness]")` throws once the block name loses DSH |
| `test/templates/trellis.test.ts:251-261` | nine substrings asserted in `workflowMdTemplate`; all nine occur only on the five lines the edit deletes |
| `test/commands/update.integration.test.ts:883`, `:1574` | the same block name, asserted after an update |
| `test/regression.test.ts:8627` | `--mode phase --step 2.1 --platform dsh` must contain `Spawn the implement sub-agent` and `DeepSeek Harness`; with DSH in the inline group the resolver returns the 5-step inline block and filters the marker out. Measured: both `False` |

That last row is the decisive one: resolving the conflict in the fork's favour and
deleting the paragraphs makes the test unsatisfiable in **either** direction — with
the merged workflow unmodified it also returns `Spawn … False`. The test was written
against beta's routing.

**So the merge result stands: 17 DSH mentions, 12 on sub-agent tag lines, 0 on inline
tag lines, 5 `trellis-agent-` mentions inside the DSH paragraphs themselves.** No
post-merge DSH edits. The two `workflow.md` conflict blocks are resolved for the
fork's planning rules only; beta's DSH paragraph at 379 stays, because it answers a
different question than the fork's two research rules next to it.

If `11-23-dsh-native-subagents` later decides dsh stays unconfigured forever, the
honest fix at that point is to delete the paragraphs **and** rewrite the four test
files in one change — not to do half of it now and leave the suite red.

## 3. Submodule ordering

The parent commit must not be created before both submodules are consistent,
because `regression.test.ts` reads the manifest and the platform trees:

```
marketplace/  merge 62a77c9 → commit → push to MrUncleXiang/marketplace → parent `git add marketplace`
docs-site/    checkout ec975c3 (fast-forward) → parent `git add docs-site`
```

`marketplace` must be pushed, contrary to an earlier draft of this design (D2). The
fork's pinned commit `60228d8` is reachable only on `personal/codex/planning-artifact-gate`
in that submodule; `62a77c9` is on `origin/main`. Merging locally without pushing
would leave the parent pointing at a commit no remote holds, and anyone running
`git submodule update --init` against this branch would fail with "did not contain
<sha>". `AGENTS.md` requires checking that a changed submodule reference is pullable
from the personal remote, so the merge commit is pushed to
`MrUncleXiang/marketplace` before the parent records it.

Neither pointer needs a force-push: the submodule merge is a normal commit, and
`docs-site` moves forward along a line already on `origin/main`.

## 4. Template hashes and `.version`

`.trellis/.template-hashes.json` is the ownership ledger `trellis update` and
`trellis uninstall` read. Its values are SHA-256 digests of the templates that were
written, so resolving six hunks of digests by hand produces a file that is wrong in
every entry it touched.

An earlier draft of this section said "run `update` and it will be a no-op because
the versions match". That premise is false, and the correction matters:

- The merge lands `.trellis/.version` at `0.7.0-beta.1` (beta's value), while the
  local build reports `0.7.0-beta.4`. `compareVersions` therefore returns `+1` and
  `update` takes the **upgrade** path, not the up-to-date path.
- With the ledger still carrying conflict markers, `loadHashes` hits
  `JSON.parse` failure and returns `{}` (`template-hash.ts:99-103`). With no
  stored hashes, `analyzeChanges` classifies every differing file as "modified by
  you" and asks per file.
- Non-interactive invocation does not get past this: `update.ts:2541` calls
  `inquirer` for `Proceed?` unless `--force`, `--skip-all`, or `--create-new` is
  passed, and with stdin closed it exits 1 having done nothing.
- The dangerous branch is `--force` / "apply to all": measured on the merge tree,
  it rewrote `.trellis/scripts/**.py` from the templates and broke the byte-parity
  contract in 10 files, because `replacePythonCommandLiterals` writes `python` where
  the templates say `python3`.

Correct sequence:

1. Finish every other conflict and follow-up, so the tree stops changing.
2. Take the ledger from either side to clear the markers (`git checkout --ours --
   .trellis/.template-hashes.json`), then `git add` it. Both sides are equally wrong;
   what matters is that the file parses.
3. Record the pre-update state of `.trellis/config.yaml` **outside the repo**, with a
   timestamp: `Copy-Item .trellis/config.yaml "$env:TEMP\config-$(Get-Date -f yyyyMMdd-HHmmss).yaml"`.
   (Historical accident `7b17052d`: a forced update wiped the monorepo `packages:`
   map from this file.)
4. `pnpm build`, then `node packages/cli/bin/trellis.js update --skip-all` — never
   `--force`. `--skip-all` declines every "modified by you" prompt, which is what we
   want: the fork's own files must not be replaced. It still writes `.version` and
   still auto-updates the files it is confident about.
5. Re-check the two invariants that `--force` would have broken.

**Verify:**

```bash
Get-Content .trellis/.version                              # 0.7.0-beta.4
git grep -c '<<<<<<<' -- .trellis/.template-hashes.json    # 0 / no output
git grep -c '^packages:' -- .trellis/config.yaml           # 1
Select-String -Path .trellis/config.yaml -Pattern 'default_package:\s*cli'   # 1 hit
# byte parity must still hold after update ran
```

If parity is broken, `update` overwrote a script and the correct recovery is
`git checkout -- .trellis/scripts` — not manual editing.

`--skip-all` has one known residue: a file that was skipped gets no hash written, so
a later `update` reports it as "modified by you" again. That is acceptable here (this
repository is not maintained through `trellis update`), but it means "Already up to
date" is not a reachable end state on this tree and must not be used as an
acceptance check.

## 5. Follow-ups the merge does not do for us

- **Interpreter in beta's two Python-spawning tests.**
  `spec-injection.integration.test.ts` (8 occurrences) and
  `workflow-layered-default.integration.test.ts` (7). Each declares its own
  `hasPython()` that probes `python3`. Replace both the guard and every spawn site
  with the shared helper:

  ```ts
  import { PYTHON, hasPython } from "../helpers/python.js";
  ```

  `pi-truncate-utf8.integration.test.ts` does **not** belong on this list: it is 85
  lines with no `spawnSync`, no `hasPython()` and no Python invocation — the only
  occurrence of the word is a comment. An earlier draft included it on the assumption
  that all three new suites share a shape; they do not.

  This is the same fix as commit `5282b7b5`, which is why it belongs to this task
  and not to a new one: leaving it undone means the beta suites report green while
  executing nothing.

- **DSH classification.** The merge result is kept unchanged: DSH stays in the
  sub-agent group, beta's DSH dispatch paragraphs stay, and no post-merge DSH edits are
  made (decision D5, which reverses the earlier D1 — reasoning and measured cost in
  §2a). What the merge also brings on this axis, and what is independent of the
  routing question: the `DSH_TRELLIS_CONTEXT_ID` / `DSH_SHELL` identity handling in
  `common/active_task.py` and the `{"dsh": "DeepSeek Harness"}` label in
  `workflow_phase.py`. Both are improvements to this repository's own DSH sessions
  regardless of how the roles are dispatched.

- **`.trellis/config.yaml`.** The merge brings a commented `spec_injection:` section
  and a commented `default_workflow:` key. Leaving them commented does **not** leave
  injection off: `inject-spec-context.py` defaults `enabled = True`
  (`:266`, `:277` — `section.get("enabled", True)`), and the merge registers the hook
  cleanly in `.claude/settings.json` (`PostToolUse` with a `Read|Edit|Write|MultiEdit`
  matcher) and `.codex/hooks.json` (`PreToolUse` and `SessionStart`). Neither settings
  file is one of the eight conflicts, so this lands without anyone deciding it.

  Consequence to state plainly: after the merge, Claude Code and Codex sessions in
  this repository will start receiving path-scoped spec context on every matching
  edit. On the specs beta annotates that is a handful of files, but
  `platform-integration.md` alone is 202,524 B (≈202 KB) and will be truncated at
  9,400 characters, so the practical effect is "a truncated fragment of a large
  document arrives at edit time". This task does not turn it off — it is beta's
  shipped default and disabling it would be a fork-specific deviation the user has not
  asked for — but the behaviour change must be visible in the delivery note rather
  than discovered later. Turning it off is one line, `enabled: false`, if that is
  wanted after living with it.

  `default_workflow` stays commented: no `.trellis/workflows/` directory exists yet,
  so a default naming a variant file would resolve to nothing.

## 6. Verification

Ordered so each step can fail before the next runs on top of it.

1. **No conflict markers.** `git grep -nE '^(<{7}|={7}|>{7})( |$)' -- ':!.trellis/tasks/archive'`
   returns nothing. The archive exclusion is what makes the `={7}` alternative usable:
   without it, 18 archived research lines match; with it, only genuine markers do
   (6 before resolution). Dropping `={7}` instead — as an earlier draft did — would make
   a half-resolved file (`<<<<<<<` and `=======` left, `>>>>>>>` gone) pass the check.
2. **DSH routing is single-valued.** `DeepSeek Harness` occurs 17 times in each
   `workflow.md` copy, 0 of them on an inline-group tag line; `trellis-agent-` occurs 5
   times, all inside the DSH dispatch paragraphs. Both numbers are the merged state and
   the check is that the merge did not disturb them — see §2a.
3. **Merge integrity.** The merge commit has two parents; `git log --oneline` shows
   the fork's `5282b7b5` (Windows) and `1b801471` (planning gate) still reachable.
4. **Script parity.** Byte comparison over all 29 `.py` files in both trees;
   `regression.test.ts` enforces this but a direct loop gives a usable diff when it
   fails.
5. **Platform parity.** The four merged hook copies equal their templates after
   `python3` → `python` normalization.
6. **The planning gate refuses.** Beyond `--help` listing the subcommands: a
   throwaway task directory with only `prd.md` must make `task.py start` exit
   non-zero. `task-planning.integration.test.ts` must execute with skip=0 — a gate
   that only exists in `--help` output is not verified.
7. **Windows writing, by bytes.** Run `task.py archive` and `add_session.py` for
   real, then count CR bytes in what they wrote. Reading `newline="\n"` in the
   source proves nothing: the question is what the file on disk holds. The counting
   form matters because a bare `git diff --stat` after an archive is empty — the
   archive auto-commits (`DEFAULT_SESSION_AUTO_COMMIT = True`,
   `common/config.py:24`), so the working tree is clean and an empty diff reads as a
   pass. Use an assertion that cannot pass vacuously:

   ```powershell
   $cr = 0; $bytes = [IO.File]::ReadAllBytes('.trellis/scripts/task.py')
   foreach ($b in $bytes) { if ($b -eq 13) { $cr++ } }
   $cr   # must be 0 (measured on the current tree: 0)
   ```

8. **Build and static checks.** `pnpm build`, `pnpm typecheck`, `pnpm lint`.
9. **Tests.** `pnpm --filter @mindfoldhq/trellis test` from the root (vitest lives
   in `packages/cli`; a bare `npx vitest` at the root fails). Watch the reported
   skip count — the two beta suites must show executing, not skipped. The four
   test files that pin DSH routing (listed in §2a) must stay green: they are the
   reason the merge result is kept rather than edited.
10. **Beta capabilities, end to end.** Create `.trellis/workflows/smoke.md`, run
    `task.py workflow smoke` and `--clear`, and read the same variant through
    `get_context.py --mode phase`. Trigger a spec edit in a temporary tree and
    confirm a `<spec-context sha256=…>` block appears — compile-time presence does
    not prove the hook or the resolver actually runs.
11. **Daily command.** Confirm what `trellis` (global 0.6.17) now does on this
    project — prints a CLI-is-older warning, refuses `update` — and that
    `node packages/cli/bin/trellis.js` is the working alternative.

## 7. Decisions taken 2026-11-23

| id | decision | basis |
| -- | -------- | ----- |
| D1 | **Superseded by D5.** DSH was to stay in the inline group with beta's DSH paragraphs deleted | Dropped: the review showed the edit breaks five assertions across four test files, and that beta ships the skills the paragraphs name (§2a). |
| D2 | `marketplace` is merged inside the submodule **and pushed** to `MrUncleXiang/marketplace` before the parent records the pointer | Earlier draft said "merge only, no push". That leaves the parent pointing at a commit no remote holds, and `git submodule update --init` on this branch then fails with "did not contain <sha>" — which `AGENTS.md` forbids. The push is a normal fast-forwardable commit, no force needed. |
| D3 | Verification runs the full suite, not a subset | The beta tests are exactly the ones that would silently skip; a subset that skips proves nothing. |
| D4 | The global CLI stays at 0.6.17; build-time and dogfood work goes through `packages/cli/bin/trellis.js` | Installing `@beta` globally would change the toolchain for every other project on this machine. |
| D5 | **The merged DSH routing is kept as-is**: DSH in the sub-agent group, beta's DSH dispatch paragraphs retained, no post-merge DSH edits | The review measured what the alternative costs: five assertions in `test/templates/trellis.test.ts`, `test/commands/update.integration.test.ts` (×2) and `test/regression.test.ts` are written against the merged routing, and `[dsh] get_context phase filtering` is unsatisfiable in either direction once the inline classification is restored. Beta also ships `templates/dsh/agents/trellis-{research,implement,check}.md` and republishes them as `trellis-agent-*` skills, so the paragraphs describe real product behaviour; this repo simply has dsh unconfigured. §2a. |
| D6 | The Windows write check counts CR bytes instead of diffing | `task.py archive` auto-commits, so `git diff --stat` afterwards prints nothing and a silent no-op reads as a pass. |
| D7 | Every `<…>` placeholder in the plan becomes a concrete literal | PowerShell rejects `<id>` with "the '<' operator is reserved for future use" (reproduced). |

Two of these carry consequences the delivery note has to state rather than leave to be
discovered: D2 adds a commit to a personal remote, and the merge itself (not any
decision) turns path-scoped spec injection on for Claude Code and Codex in this repo
(§5). D5 carries a third: this repository will follow beta's DSH routing while its own
dsh platform stays unconfigured, which is the state `11-23-dsh-native-subagents`
exists to resolve.

## 8. What this design deliberately does not do

- It does not backfill `paths:` on 29 spec files. Without that, injection matches
  only the 13 annotated specs; the acceptance criterion is scoped accordingly.
- It does not upgrade the global CLI. Build-time and dogfood work goes through
  `packages/cli/bin/trellis.js`, so other projects on this machine keep 0.6.17.
- It does not merge `main` into the beta branch, cherry-pick the three main-only
  commits, or attempt to make beta equal main. The fork already carries the only
  behavioural fix among them (`36292d64`, the archive commit).
- It does not touch `.trellis/tasks/11-11-deferred-marker/`.
