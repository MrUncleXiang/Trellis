# Implementation plan

Ordered so each step is verifiable before the next depends on it. Steps 1–2 set up
and merge; step 3 resolves conflicts; step 4 settles the submodules; step 5 rebuilds
derived state; steps 6–7 make the beta tests actually run; steps 8–9 prove nothing
regressed.

Every command runs from the repository root. Test commands use
`pnpm --filter @mindfoldhq/trellis exec vitest run <file>`: vitest is installed in
`packages/cli`, not at the root, so a bare `npx vitest` from the root fails.

The merge rehearsal (a detached worktree of `codex/personal` with the beta branch
merged in, never committed) produced every conflict and every "did the fork
survive?" answer quoted below. That rehearsal is scratch space, not a deliverable.

## 1. Branch and clean start

```bash
git switch codex/upgrade-v0.7-beta
git status --porcelain
```

Expect **six** dirty entries, and check them one by one rather than trusting a count:

| entry | owner | action |
| ----- | ----- | ------ |
| `.trellis/tasks/11-11-deferred-marker/{prd,design,implement}.md` (3 × `M`) | another session | leave unstaged; excluded from every commit |
| `.tmp-review/` (`??`) | the same other session — scratch scripts for the deferred-marker work | leave untouched; it is not this task's |
| `.trellis/tasks/11-23-dsh-native-subagents/` (`??`) | this task's follow-up planning | commit with this task |
| `.trellis/tasks/11-23-upgrade-v0.7-beta/` (`??`) | this task's planning | commit with this task |

The first four belong to work this task must not touch (R8). If a commit picks any of
them up, that commit is wrong — step 7 excludes them by path.

**Verify:** `git rev-parse --abbrev-ref HEAD` prints `codex/upgrade-v0.7-beta`, and
`git merge-base --is-ancestor codex/personal HEAD` succeeds.

## 2. Merge

```bash
git merge --no-ff upstream/feat/v0.7-beta
```

Expect **seven `UU` entries plus one `MM`**: six files and `marketplace` report as
unmerged, and `docs-site` reports `MM` because it fast-forwards cleanly rather than
conflicting. Roughly 142 files merge without a report. Fewer conflicts means a stale
fetch; check `git rev-parse upstream/feat/v0.7-beta` against `be9e19b2`.

**Verify:** `git status --porcelain` filtered to `^(UU|AA|DU|UD|AU|UA)` lists seven
paths, and `git status --porcelain docs-site` shows `MM` — assert it on its own line
rather than expecting eight `UU` rows.

## 3. Resolve the six file conflicts

Resolve in the order below; #1 stays unresolved on purpose until step 5.

**This is a real three-way merge, not "take our side".** Beta changed
`workflow.md` by 91 additions and 144 deletions relative to the merge base; checking
out the fork's whole file throws all of that away, including the planning-rule
improvements the fork wants. Resolve the two conflicted blocks by hand, and make **no
other edits to DSH routing** — decision D5 keeps the merged classification, for the
reasons and the measured test cost in `design.md` §2a.

### 3.1 `packages/cli/src/templates/trellis/workflow.md`, then `.trellis/workflow.md`

Same edits in both copies.

**(a) The two conflict blocks.**

At the research-dispatch block: keep the fork's two rules ("Dispatch prompt guard",
"Return and integration") **and** keep beta's `- **DeepSeek Harness**: tell the child
to load `trellis-agent-research`…` bullet. They answer different questions — how to
brief a research worker versus how to dispatch one on DSH — and deleting the bullet is
what breaks five assertions elsewhere (`design.md` §2a).

At the platform tag block: take beta's list. The fork's text is the merge base plus
nothing; beta adds `DeepSeek Harness` to it.

**(b) Nothing else.**

Do **not** touch the other DSH mentions. An earlier draft of this plan listed eleven
"clean but wrong" spots to unpick; that list is withdrawn (decision D5). After
resolution the merged copies must show `DeepSeek Harness` 17 times each — 12 on
sub-agent-group tag lines, 0 on inline-group lines, and the rest in prose — and
`trellis-agent-` 5 times, all inside the DSH paragraphs.

Beta's DSH identity material also stays: `DSH_TRELLIS_CONTEXT_ID` / `DSH_SHELL`
handling in `common/active_task.py` and the `"dsh": "DeepSeek Harness"` label in
`workflow_phase.py`.

**Verify:**

```bash
# identical apart from the interpreter literal
$a = (Get-Content .trellis/workflow.md -Raw) -replace '\bpython3\b','python'
$b = (Get-Content packages/cli/src/templates/trellis/workflow.md -Raw) -replace '\bpython3\b','python'
$a -eq $b   # True

# the merge result's routing was not disturbed
(Select-String -Path .trellis/workflow.md -Pattern 'DeepSeek Harness').Count                 # 17
(Select-String -Path .trellis/workflow.md -Pattern 'trellis-agent-').Count                   # 5
(Select-String -Path .trellis/workflow.md -Pattern '^\[/?codex-inline.*DeepSeek').Count      # 0
```

The third check is the one that catches a half-applied classification change: DSH in
the inline group while the paragraphs still tell sessions to load role skills.

### 3.2 `.trellis/spec/cli/backend/platform-integration.md`

The two versions are close in size (fork 193,861 B, beta 197,630 B), so this is not a
rewrite-versus-keep choice. The single conflict block is four rows of a Class-3 table
that differ by trailing whitespace and by `if present` — beta says `design.md` if
present, `implement.md` if present, which matches the merged planning gate. Take that
form; leave the rest of the file as the merge arranged it.

### 3.3 `packages/cli/test/regression.test.ts`

Union the DSH entries in `AMBIENT_SESSION_ENV_KEYS` (the array starts at line 2007;
the conflict block is the DSH portion): `DSH_TRELLIS_CONTEXT_ID`, `DSH_SESSION_ID`,
`DSH_SHELL` all present.

**Verify:** the three names appear in `AMBIENT_SESSION_ENV_KEYS`.

### 3.4 `packages/cli/test/templates/shared-hooks.test.ts`

Keep the fork's assertions. Beta's two strings do not occur in the merged
`session-start.py`, so its side would fail.

**Verify:**

```bash
Select-String -Path packages/cli/src/templates/shared-hooks/session-start.py `
  -Pattern 'All new tasks require these three concise files'   # 1 hit
Select-String -Path packages/cli/src/templates/shared-hooks/session-start.py `
  -Pattern 'Lightweight task can request start review with PRD-only'  # 0 hits
```

If the first is 0, the merge took the wrong side and the planning gate's prompt
text was lost.

## 4. Submodules

```bash
cd marketplace
git merge 62a77c9          # 62a77c9 is on origin/main; no fetch needed
# resolve (only workflows/native/workflow.md conflicts), commit inside the submodule
git push origin HEAD:personal/codex/planning-artifact-gate   # or the branch that tracks it
cd ..
git add marketplace

git -C docs-site checkout ec975c3
git add docs-site
```

`marketplace` **must be pushed** before the parent records the pointer. The fork's
current pin `60228d8` lives only on `personal/codex/planning-artifact-gate`; if the
merge result stays local, the parent points at a commit no remote holds and
`git submodule update --init` on this branch fails with `did not contain <sha>`.
`AGENTS.md` requires checking that a changed submodule reference is pullable.
No force-push is involved — the merge is an ordinary commit on top.

**Verify:**

```bash
git -C marketplace log --oneline -1                    # a merge whose 2nd parent is 62a77c9
git -C marketplace branch -r --contains HEAD           # lists the pushed remote branch
git -C docs-site rev-parse HEAD                        # starts with ec975c3
git status --porcelain | Select-String '^(UU|AA)'      # no submodule entries
```

If the push is not wanted, the alternative is to **not** record a new pointer — keep
`60228d8` and accept that the submodule content no longer corresponds to the merged
templates. Do not leave a local-only merge recorded in the parent.

## 5. Rebuild derived state

`.trellis/.template-hashes.json` is left conflicted until now on purpose: its six
hunks are clashes between hash values, and any hand-picked value is wrong.

**Do not assume `update` will be a no-op.** The merged `.trellis/.version` is
`0.7.0-beta.1` while the local build is `0.7.0-beta.4`, so `update` runs the
*upgrade* path. With conflict markers still in the ledger, `JSON.parse` fails,
`loadHashes` returns `{}`, and every differing file is classified "modified by you".
Non-interactive runs then exit 1 at the `Proceed?` prompt having done nothing.

Sequence:

```bash
# 1. make the ledger parse: take either side, then stage it
git checkout --ours -- .trellis/.template-hashes.json
git add .trellis/.template-hashes.json

# 2. back up config.yaml OUTSIDE the repo, with a timestamp
Copy-Item .trellis/config.yaml "$env:TEMP\config-$(Get-Date -f yyyyMMdd-HHmmss).yaml"

# 3. build, then update with --skip-all (never --force)
pnpm build
node packages/cli/bin/trellis.js update --skip-all
```

`--skip-all` declines every "modified by you" prompt. That is the point: the fork's
own files must not be replaced by 0.6-era templates. Measured on the merge tree,
`--force` instead rewrites `.trellis/scripts/**.py` and breaks byte parity in 10
files, because `replacePythonCommandLiterals` writes `python` where the templates say
`python3`.

Then check the two invariants `--force` would have broken:

```bash
Get-Content .trellis/.version                            # 0.7.0-beta.4
(Select-String -Path .trellis/config.yaml -Pattern '^packages:').Count        # 1
(Select-String -Path .trellis/config.yaml -Pattern 'default_package:\s*cli').Count  # 1
# byte parity over the 29 .py files in both trees                  # 0 diffs
```

If parity is broken, `update` overwrote a script; recover with
`git checkout -- .trellis/scripts`, not by hand-editing.

The entry point is `packages/cli/bin/trellis.js`, not `dist/index.js`. `dist/index.js`
is the library main (`export { VERSION }`, `export { init }`) — running it prints
nothing and exits 0, which looks like a silent no-op instead of an upgrade.

If `config.yaml`'s monorepo block is missing, restore it from the timestamped copy —
commit `7b17052d` records an update that wiped exactly this block.

Known residue, so it is not mistaken for a failure later: `--skip-all` writes no hash
for a skipped file, so a later `update` reports it as "modified by you" again.
"Already up to date" is **not** a reachable end state on this tree and must not be
used as an acceptance check.

**Verify:** `.version` reads `0.7.0-beta.4`; ledger parses and has no conflict
markers; monorepo map intact; parity 0.

## 6. Make beta's tests actually run on Windows

Two files hard-code `python3` and guard on it:

- `packages/cli/test/scripts/spec-injection.integration.test.ts` — 8 occurrences
- `packages/cli/test/scripts/workflow-layered-default.integration.test.ts` — 7

`packages/cli/test/scripts/pi-truncate-utf8.integration.test.ts` is **not** on this
list: 85 lines, no `spawnSync`, no `hasPython()`, no Python call — the only occurrence
of the word is a comment. An earlier draft included it by assuming all three new
suites share a shape.

Replace each file's local `hasPython()` and every `spawnSync("python3", …)` with the
shared helper, matching commit `5282b7b5`:

```ts
import { PYTHON, hasPython } from "../helpers/python.js";
```

On this machine `python3 --version` exits 9009 (Microsoft Store stub), so without
this edit the suites skip and the run still reports success.

**Verify:**

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run test/scripts/spec-injection.integration.test.ts
pnpm --filter @mindfoldhq/trellis exec vitest run test/scripts/workflow-layered-default.integration.test.ts
```

Each must report executed tests, not "skipped". A non-zero skip count is expected
elsewhere in the suite (POSIX-only cases), but these two must not be among the skips.

## 7. Commit the resolution

Before staging anything, protect the other session's work. `git reset --hard` in the
rollback section would destroy it, and the exclusion below means it never enters a
commit — so it needs a belt-and-braces copy first:

```bash
$stamp = Get-Date -f yyyyMMdd-HHmmss
Copy-Item .trellis/tasks/11-11-deferred-marker "$env:TEMP\deferred-marker-$stamp" -Recurse
```

Then:

```bash
git add -A -- ':!.trellis/tasks/11-11-deferred-marker' ':!.tmp-review'
git status --porcelain .trellis/tasks/11-11-deferred-marker .tmp-review   # still dirty
git commit
```

Commit message in Chinese per `AGENTS.md`, e.g.
`merge: 合入上游 0.7.0-beta.4，保留规划闸门与 Windows 修复`.

**Verify:** `git cat-file -p HEAD | Select-String '^parent'` shows two parents;
`git status --porcelain` still lists the three `M` files and `.tmp-review/`.

## 8. Static checks and full suite

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm --filter @mindfoldhq/trellis-core test
pnpm --filter @mindfoldhq/trellis test
```

Watch four things in the output: the two `regression.test.ts` parity suites, the
planning suites (`task-planning`, `planning-status`, `research-evidence-contract`), the
skip count on the beta suites from step 6, and — beyond "tests pass" — that
`task-planning.integration.test.ts` reports skip=0. A gate that runs zero assertions
and reports green is the failure mode this whole step exists to catch.

**Verify:** both suites pass; no parity failure; the beta suites executed.

## 9. Runtime smoke, then merge back

Functional, not just `--help`. Every placeholder below is a concrete literal: PowerShell
rejects `<…>` with "the '<' operator is reserved for future use", so a plan that writes
`<id>` cannot be run as written.

```bash
python .trellis/scripts/task.py --help                        # 21 subcommands

# (a) the gate must refuse, not merely exist — build a throwaway task with only prd.md
python .trellis/scripts/task.py create "gate probe" --slug gate-probe `
  --description "verifies the planning gate refuses an incomplete task" --assignee codex
Remove-Item .trellis/tasks/*-gate-probe/design.md, .trellis/tasks/*-gate-probe/implement.md `
  -ErrorAction SilentlyContinue
python .trellis/scripts/task.py start *-gate-probe            # must exit non-zero
python .trellis/scripts/task.py archive *-gate-probe --no-commit 2>$null   # then delete it

# (b) Windows writing, verified by bytes rather than by an empty diff
$cr = 0; $bytes = [IO.File]::ReadAllBytes('.trellis/scripts/task.py')
foreach ($b in $bytes) { if ($b -eq 13) { $cr++ } }
$cr                                                            # must be 0

# (c) beta's new capabilities, end to end
Set-Content -Path .trellis/workflows/smoke.md -Value "# smoke variant`n`nmarker-line" -Encoding utf8
python .trellis/scripts/task.py workflow smoke                 # pins it on the active task
python .trellis/scripts/get_context.py --mode phase --step 1.1  # reads the variant
python .trellis/scripts/task.py workflow --clear
Remove-Item .trellis/workflows/smoke.md -ErrorAction SilentlyContinue

# (d) spec injection fires, in a throwaway tree (never the real one)
python .trellis/scripts/get_context.py --mode spec --file packages/cli/src/commands/update.ts
```

For (a): `task.py start` on a task whose `design.md`/`implement.md` are missing must
print a planning error and exit non-zero. A `--help` entry proves nothing. For (b):
`task.py archive` auto-commits (`DEFAULT_SESSION_AUTO_COMMIT = True`,
`common/config.py:24`), so `git diff --stat` after it is empty and would read as a pass
— count CR bytes instead.

Then merge back without a fast-forward:

```bash
git switch codex/personal
git merge --no-ff codex/upgrade-v0.7-beta
git push origin codex/personal
```

**Verify:** `git log --oneline -3` shows the merge; `git rev-parse HEAD` matches
`origin/codex/personal` after the push; the fork's Windows commit and planning-gate
commit are both still reachable.

## Rollback

The merge is one commit on a task branch; nothing is pushed until step 9.

```bash
git merge --abort                                  # before committing: safe
git reset --keep codex/personal                    # after committing, before pushing
```

`--keep`, not `--hard`: `--hard` discards the other session's uncommitted edits to
`.trellis/tasks/11-11-deferred-marker/`, which are not backed by any stash or commit.
`--keep` resets tracked files while leaving local modifications that would be
overwritten — it stops instead of destroying them. If it refuses, resolve by hand
rather than escalating to `--hard`.

Two things survive the rollout and are intentional: the `marketplace` merge commit
(already pushed in step 4, so it lives on the remote regardless of what happens to the
parent branch) and `docs-site` moving forward along a commit already on
`origin/main`. Reverting the parent merge later is `git revert -m 1 <merge-sha>` —
no force-push needed.
