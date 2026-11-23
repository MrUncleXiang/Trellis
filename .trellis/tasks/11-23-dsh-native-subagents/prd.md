# Decide whether DSH should run Trellis role work as native sub-agents

## Goal

Decide, now that 0.7.0-beta.4 has landed, whether this repository should configure
`dsh` as a dogfood platform — so that implement / check / research run as
`trellis-agent-*` sub-agents instead of inline in the main session.

## Problem

Beta changed its mind about DSH. The fork's `packages/cli/src/configurators/dsh.ts`
said DSH has no project-level sub-agent definition surface and ran those roles
inline; beta ships three role prompts
(`templates/dsh/agents/trellis-{research,implement,check}.md`), republishes them as
skills named `trellis-agent-*` under `.dsh/skills/`, and rewrote the dispatch
paragraphs in `workflow.md` around the `trellis_wait` protocol.

The upgrade kept beta's wording. This repository still has no `.dsh/` tree:
`trellis platforms` lists six platforms and dsh is not one of them, and
`.template-hashes.json` holds zero `.dsh/` entries. So the merged instructions tell a
session to load skills that do not exist here. That gap is what this task closes.

## Dependency (satisfied)

`11-23-upgrade-v0.7-beta` is merged into `codex/personal`. Both inputs now exist:
the merged `workflow.md` wording (measured: `DeepSeek Harness` on 17 lines,
`trellis-agent-` on 5) and the post-merge manifest state (301 entries, 0 `.dsh/`).

## Measured cost of each outcome

**Adopt — write the dsh file set and register it.**

- `collectDshTemplates()` yields 50 files. Measured against disk with the usual
  `python3` → `python` normalization: **43 present and already byte-identical, 7
  absent, 0 mismatched.** The seven absent files are the entire `.dsh/` tree:
  - `.dsh/skills/trellis-agent-{research,implement,check}/SKILL.md` — the three role
    skills the merged `workflow.md` names
  - `.dsh/skills/trellis-{start,continue,finish-work}/SKILL.md` — DSH-private entry
    skills
  - `.dsh/DSH.md` — operator guide, and the `configDir`-owned file that makes
    platform detection and `uninstall` scoping work
- Plus 7 manifest entries. Nothing existing is rewritten.

**Keep inline — remove beta's DSH wording.**

- Delete the three DSH bullets and the two prose mentions, then repair five
  assertions across four test files:
  `test/templates/trellis.test.ts:193-195` (the class-2 block name),
  `:251-261` (nine strings that only occur on the deleted lines),
  `test/commands/update.integration.test.ts:883` and `:1574` (same block name),
  `test/regression.test.ts:8627-8639` (`[dsh] get_context phase filtering`).
- Measured on the merged tree: that last test is unsatisfiable in either direction
  once DSH moves back to inline (both `Spawn the implement sub-agent` and
  `DeepSeek Harness` come back `False`). So "keep inline" is not a text edit; it is a
  test rewrite that will re-conflict on every future upstream sync.

## Requirements

- **R1 — decide from measurement, not preference.** The decision rests on the counts
  above and on one unmeasured behaviour named in R5.
- **R2 — name both outcomes and their consequences** before choosing (above), so the
  choice is auditable rather than taste.
- **R3 — no half state.** Either dsh is configured — files written *and* manifest
  entries recorded — or the wording is gone. The repository has a test that fails on
  exactly this half state (`test/regression.test.ts:12249`, "every platform tree
  present on disk is tracked in the manifest": a `.dsh/` directory that the manifest
  does not own is reported as an untracked platform tree).
- **R4 — reversibility.** The chosen path is undoable with a written procedure:
  deleting `.dsh/`, removing its manifest entries, and restoring the previous
  `workflow.md` are each single operations.
- **R5 — verify the duplicate-name behaviour before committing to adopt.** Three
  skill names exist in both roots once dsh is configured (`trellis-start`,
  `trellis-continue`, `trellis-finish-work`); frontmatter `name:` and `description:`
  are identical, and the bodies differ only in the `--platform dsh` vs
  `--platform codex` literal. DSH loads `.dsh/skills` at rank 100 and
  `.agents/skills` at rank 200, but which copy wins on a name collision — highest
  rank, first found, or a hard error — is unverified. Adoption must not be recorded
  as complete until this is observed, because "the skill did not load" and "the wrong
  copy loaded" look the same from inside a session.

## Acceptance Criteria

- [ ] Both outcomes are recorded with the measured costs above, not adjectives.
- [ ] The recommendation and its evidence are written down.
- [ ] **If adopting:** `trellis platforms` lists `dsh`; the seven `.dsh/` files exist
      and match `collectDshTemplates()` byte for byte; `.template-hashes.json` owns
      them; `regression.test.ts`'s dogfood parity suite and its
      "tracked in the manifest" case both pass; and R5's duplicate-name behaviour has
      been observed and recorded.
- [ ] **If keeping inline:** beta's DSH dispatch paragraphs are removed and the five
      assertions listed above are repaired in the same change, with
      `test/regression.test.ts:8627` rewritten to a state that can actually hold.
- [ ] The chosen path is reversible per R4, with the procedure written into
      `implement.md`.
- [ ] Whichever path is chosen, the tree does not ship beta's DSH instructions
      without the skills they name (R3).

## Notes

- `design.md` and `implement.md` follow this PRD; they are required before
  `task.py start`, not before the task is registered.
- Out of scope, and deliberately so: backfilling `paths:` frontmatter onto the 29
  specs that lack it. That is a separate task.
- The product-side DSH behaviour (`trellis init --dsh` for *other* projects) is not
  in question and is not touched by either outcome. The question is only what this
  repository runs on.
