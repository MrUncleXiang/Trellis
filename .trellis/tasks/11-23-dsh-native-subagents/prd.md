# Decide whether DSH should run Trellis role work as native sub-agents

## Goal

Decide, once the 0.7.0-beta.4 upgrade has landed, whether this repository should
configure `dsh` as a dogfood platform — so that implement / check / research run as
`trellis-agent-*` sub-agents instead of inline in the main session.

## Problem

Beta changed its mind about DSH. The fork's `packages/cli/src/configurators/dsh.ts`
says DSH has no project-level sub-agent definition surface and runs those roles
inline; beta ships three role prompts (`templates/dsh/agents/trellis-{research,
implement,check}.md`), republishes them as skills named `trellis-agent-*` under
`.dsh/skills/`, and rewrote the dispatch paragraphs in `workflow.md` around the
`trellis_wait` protocol.

After the upgrade the repository will carry beta's dispatch wording while still
having no `.dsh/` tree: `trellis platforms` lists six platforms and dsh is not one
of them, and `.template-hashes.json` holds zero `.dsh/` entries. The instructions
would therefore point sessions at skills that do not exist on disk. That gap is the
thing this task exists to close — in whichever direction is actually better.

## Dependency

This task is blocked on `11-23-upgrade-v0.7-beta`. Two of the inputs it needs do not
exist before that merge:

- what the merged `workflow.md` actually says about DSH dispatch;
- how dogfood byte-parity and `.template-hashes.json` behave once beta's additions
  are in the tree.

Do not start before the upgrade is merged into `codex/personal`.

## Requirements

- **R1 — decide from measurement, not preference.** The decision must rest on what
  changing the configuration actually breaks or costs. At minimum: how many files
  `trellis init --dsh` adds, whether `regression.test.ts`'s dogfood parity suite
  still passes with a seventh platform, and whether the manifest ends up consistent.
- **R2 — name the two outcomes and their consequences** before choosing. Adopting
  native sub-agents means this repository's own sessions change behaviour; keeping
  inline means beta's imported paragraphs stay partly inapplicable and must be
  marked as such rather than silently misleading.
- **R3 — no half state.** Either dsh is a configured platform and the role skills
  exist, or it is not and no wording tells a session to load them. A tree that
  carries the instructions without the skills is the state this task must not ship.
- **R4 — reversibility.** Whatever is chosen must be undoable with a recorded
  procedure (how to remove `.dsh/`, restore the manifest, and revert the workflow
  classification).

## Acceptance Criteria

- [ ] The two outcomes are written down with measured consequences attached to each,
      not adjectives.
- [ ] A recommendation is recorded with the evidence behind it.
- [ ] If adopting: `trellis platforms` lists dsh, `trellis init --dsh` (or the
      equivalent) has been run, the `trellis-agent-*` skills exist, the dogfood
      parity suite passes, and `.template-hashes.json` has the new entries.
- [ ] If keeping inline: beta's DSH dispatch paragraphs are either removed or
      explicitly marked as an unconfigured capability, and a reader cannot mistake
      them for this repository's behaviour.
- [ ] The chosen path is reversible per R4, with the procedure written down.

## Notes

- `design.md` and `implement.md` are deliberately not written yet. Their content
  depends on post-upgrade facts (R1), and writing them now would be guessing. They
  are required before `task.py start`, not before this task is registered.
- Related but separate: backfilling `paths:` frontmatter onto the 29 specs that
  lack it is another non-goal of the upgrade and is not in scope here either.
