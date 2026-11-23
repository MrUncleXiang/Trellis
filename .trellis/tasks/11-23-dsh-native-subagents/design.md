# Design — configure `dsh` as a dogfood platform

## Shape of the change

```
adopt (chosen)                         keep-inline (rejected)
─────────────                          ──────────────────────
7 new files under .dsh/                0 new files
7 new manifest entries                 delete 5 DSH lines in workflow.md
0 existing files edited                rewrite 5 assertions in 4 test files
1 behaviour change: DSH sessions       no behaviour change, but the tree stops
  load role skills instead of           matching the wording beta ships, and
  running roles inline                  every upstream sync re-conflicts
```

The two outcomes are not symmetric in cost. Adopting adds files; keeping inline
removes a claim the test suite is currently built around. §1–§2 record why the
asymmetry decides it.

## 1. Why adopt

Three facts, each measured on the merged tree rather than argued:

1. **The claim already exists.** `.trellis/workflow.md` names `trellis-agent-*` on
   five lines (236, 240, 383, 535, 584) and lists `DeepSeek Harness` on twelve
   sub-agent tag lines. Keeping inline does not delete a hypothetical; it deletes
   text the merge already committed.
2. **Deleting that text breaks five assertions across four files.**
   `test/templates/trellis.test.ts:193-195` pins the class-2 block name that contains
   `DeepSeek Harness`; `:251-261` asserts nine substrings that occur *only* on those
   five lines; `test/commands/update.integration.test.ts:883` and `:1574` pin the same
   block name; `test/regression.test.ts:8627-8639` drives the real
   `get_context.py --mode phase --step 2.1 --platform dsh` and expects
   `Spawn the implement sub-agent`. That last one is unsatisfiable in both
   directions on the merged tree — measured `False` before and after the edit — so
   "keep inline" means rewriting the test's premise, not adjusting a string.
3. **Adoption costs seven files and changes nothing that exists.** Measured with
   `collectDshTemplates()` against the working tree under the usual
   `python3` → `python` normalization: 50 files total, **43 present and already
   byte-identical, 7 absent, 0 mismatched**. The seven absent files are exactly the
   `.dsh/` tree. No existing file is rewritten by the adoption.

The asymmetry is the whole argument: one direction adds a directory, the other
rewrites tests to disagree with the code they ship.

## 1a. How to write them: not with `trellis init`

Two ways exist. Both were run against a throwaway copy of this repository
(`$env:TEMP\dsh-init-probe2`, `…-probe3`) with the real ledger and the six configured
platform trees in place, so the comparison is on identical input.

**`trellis init --dsh --yes`** — exit 0, wrote the seven `.dsh/` files, and touched
nothing else on disk (413 existing platform files byte-identical before and after;
only `.trellis/.template-hashes.json` changed). But its manifest bookkeeping is
wider than the task:

```
301 entries before  →  346 after    0 lost
+7   .dsh/**
+7   .trellis/scripts/*  (developer.py, io.py, spec_inject.py, task_context.py,
                          get_context.py, hooks/linear_sync.py, init_developer.py)
+3   .trellis/agents/{architect,plan,research}.md
+23  .trellis/scripts/common/__pycache__/*.pyc
+5   .trellis/.runtime/sessions/*.json
```

The `__pycache__` and `.runtime` rows are the real problem: `initializeHashes` walks
`.trellis/` wholesale (`template-hash.ts:387`) and `EXCLUDE_FROM_HASH` does not name
either path, so machine-local bytecode and session pointers become "template files we
own". The current ledger has **zero** `.pyc` and **zero** `.runtime` entries, and the
repo has 43 `.pyc` files on disk — running `init` here would add them and make
`trellis update` believe it owns machine state.

**Direct write** — call `collectDshTemplates()`, write only the `.dsh/` entries, then
set their hashes with `computeHash` + `saveHashes`:

```
301 entries before  →  308 after    0 lost    +7 exactly, all .dsh/**
```

**Decision: direct write.** It produces the same seven files and the same seven
entries as `init`, without re-hashing the rest of the tree. The write is reproducible
— the content comes from `collectDshTemplates()`, not from an agent's typing — which
is what makes the parity test meaningful.

## 2. What "adopt" actually writes

Seven files, all derived — none hand-written:

| path | what it is |
| ---- | ---------- |
| `.dsh/skills/trellis-agent-research/SKILL.md` | role prompt `templates/dsh/agents/trellis-research.md`, republished as a skill with the pull-based prelude |
| `.dsh/skills/trellis-agent-implement/SKILL.md` | same for implement (prelude included) |
| `.dsh/skills/trellis-agent-check/SKILL.md` | same for check (prelude included) |
| `.dsh/skills/trellis-start/SKILL.md` | entry skill, `--platform dsh` resolved |
| `.dsh/skills/trellis-continue/SKILL.md` | entry skill, `--platform dsh` resolved |
| `.dsh/skills/trellis-finish-work/SKILL.md` | entry skill |
| `.dsh/DSH.md` | operator guide, and the `configDir`-owned tracked file |

**These must be generated, never typed.** `collectDshTemplates()` is the single
source; a hand-written copy drifts on the next upstream sync and the parity test
catches it late (that is precisely the `.omp/` history the test comments cite).

## 3. Why the manifest entries are not optional

`getConfiguredPlatforms()` (`packages/cli/src/configurators/index.ts:138-158`) reads
`.trellis/.template-hashes.json`, not the filesystem: a platform counts as configured
only when some template path under its `configDir` already has a hash entry. So
writing `.dsh/` without registering it produces the one state the repository
explicitly forbids — a committed tree nothing owns.

`test/regression.test.ts:12249` (`every platform tree present on disk is tracked in
the manifest`) enforces the other half: for each platform *not* in
`getConfiguredPlatforms()`, it checks whether any `configDir` path exists on disk and
collects the offenders into an `untracked` array asserted `toEqual([])`. The failure
message tells the reader to run `trellis init` / `trellis update`.

Three consequences:

- Doing only half fails the suite, which is R3 made mechanical.
- The registration path is the same one `trellis update` uses, so a correctly adopted
  tree is also a tree `update` can maintain.
- Because `configuredPlatforms` grows from six to seven, the parity suite starts
  comparing `.dsh/**` against `collectDshTemplates()`. The seven files must therefore
  be byte-identical after the `python3` → `python` normalization, not merely present.

## 4. The one behaviour R5 asks about — duplicate skill names

Three names will exist in both skill roots:

```
.dsh/skills/trellis-start/SKILL.md        .agents/skills/trellis-start/SKILL.md
.dsh/skills/trellis-continue/SKILL.md     .agents/skills/trellis-continue/SKILL.md
.dsh/skills/trellis-finish-work/SKILL.md  .agents/skills/trellis-finish-work/SKILL.md
```

Frontmatter `name:` and `description:` are identical (verified by reading both
copies). The bodies differ in exactly the places the `--platform` literal appears:

| skill | `--platform` lines in the shared copy | in the dsh copy |
| ----- | ------------------------------------- | --------------- |
| `trellis-start` | 1 (`--platform codex`) | 4 (`--platform dsh`) |
| `trellis-continue` | 1 (`--platform codex`) | 1 (`--platform dsh`, with `<X.X>`) |
| `trellis-finish-work` | 0 | 0 |

So the duplicate is not cosmetic: the copies disagree about which platform's phase
text to load. If DSH resolves the collision to the `.agents/` copy, a DSH session gets
`--platform codex` guidance and the wrong routing blocks — silently, because the
skill still loads and still looks plausible.

**Resolved: `.dsh/skills` wins.** The DSH documentation shipped beside the engine
(`@deepseek-ai/dsh@0.2.2-rc.5`, `docs/subsystems/skills.md`) states the root order and
the tie-break:

| rank | source | root |
| ---- | ------ | ---- |
| 100 | `project-dsh` | `<projectRoot>/.dsh/skills` |
| 200 | `project-agents` | `<projectRoot>/.agents/skills` |
| 300 | `custom` | `customSkillDirs` |
| 400 | `user-dsh` | `<dshHome>/skills` |
| 500 | `user-agents` | `<agentsHome>/skills` |
| 600 | `bundled` | configured bundled root |

and on the collision rule: *"Lower ranks win duplicate skill names before provider
registration order is considered"*, with the layer text adding *"Within one layer,
duplicate names resolve by rank, provider order, then local order"* and *"the rank
order below decides duplicates only within one layer"*.

Both roots are project-scoped and land in the same (global) layer, so this is a
within-layer duplicate at rank 100 versus 200: **the dsh-private copy wins.** A DSH
session therefore gets `--platform dsh` guidance, which is the intent of writing the
entry skills into the private root in the first place.

That downgrades R5 from a gate to a recorded fact with a citation. It stays in
`implement.md` as a post-write check rather than a pre-write blocker: assert the two
roots' ranks are what the vendor documents, so a future DSH release that changes the
order is caught here instead of being discovered as wrong routing months later.

If a later DSH version reverses this — errors, or prefers `.agents/skills` — the
fallback is to drop the three duplicated entry skills from `.dsh/skills/` and keep the
collision-free role skills plus `DSH.md`. That is a deletion of three files, not a
re-plan.

Separately worth recording, though out of scope: Trellis itself creates this
collision by writing the same three entry skills to both roots. Writing them to
`.dsh/skills` alone would remove the ambiguity entirely. That is a product decision
for `dsh.ts`, not a change this repository should make unilaterally.

## 5. Reversibility

Adoption is reversible in three operations, no history rewrite:

1. `git rm -r --cached .dsh && rm -r .dsh` — or plainly `rm -r .dsh` then commit.
2. Remove the seven `.dsh/**` keys from `.trellis/.template-hashes.json`. Until they
   are gone, `getConfiguredPlatforms()` still counts dsh as configured and the parity
   suite complains that the templates exist but the files do not.
3. Nothing else changes: no existing file, no `workflow.md` line, no test.

The reverse direction is not as clean — see §1 — which is itself an argument for
adopting first and revisiting only if R5 goes badly.

## 6. Verification

1. **Parity.** All seven `.dsh/` files equal `collectDshTemplates()` under the
   `python3` → `python` normalization; the 43 shared files stay at zero mismatches.
2. **Registration.** `getConfiguredPlatforms()` returns seven ids including `dsh`;
   `trellis platforms` prints dsh with `.dsh`; the manifest gains exactly seven
   entries and loses none.
3. **The half-state test.** `regression.test.ts`'s "every platform tree present on
   disk is tracked in the manifest" passes — it is the check that fails if files and
   manifest disagree in either direction.
4. **Parity suite.** The per-platform `committed files are byte-identical to the
   templates` case now includes `dsh` and passes.
5. **R5 observation.** Record what DSH does with the three duplicate names, with the
   method used to observe it, before declaring the task complete.
6. **No behaviour change elsewhere.** Six platforms still report configured; the
   existing 43 shared files are untouched; `pnpm build`, `typecheck`, `lint` pass.

## 7. What this design deliberately does not do

- It does not change `packages/cli/src/configurators/dsh.ts`. The product's
  behaviour for other projects is not in question.
- It does not backfill `paths:` frontmatter on the 29 specs that lack it.
- It does not touch `.trellis/tasks/11-11-deferred-marker/` (another session's
  uncommitted work).
- It does not archive `11-23-upgrade-v0.7-beta`; that is the user's call.
