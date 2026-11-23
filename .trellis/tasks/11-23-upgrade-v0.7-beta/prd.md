# Upgrade the fork to upstream 0.7.0-beta.4

## Goal

Bring `upstream/feat/v0.7-beta` (tag `v0.7.0-beta.4`) into the personal fork without
losing the fork's own guarantees: the planning-artifact gate, the Windows LF /
interpreter fixes, and the dogfood byte-parity discipline.

## Problem

The fork sits on `upstream/main` (0.6.17) and has 16 commits of its own. The beta
line branched from `v0.6.17` and has since moved 47 commits in a different
direction, touching the same files the fork rewrote — `workflow.md`, `task.py`,
`task_store.py`, `session-start.py`, `platform-integration.md`. Neither line is a
subset of the other: beta is missing three commits that main (and therefore the
fork) already has, including a real `task.py archive` bug fix.

`trellis update` cannot be used for this repository. It writes files from the
installed global package, so on the fork it would overwrite the fork's own
template sources — a dry run already reports 95 files as "modified by you" and
43 as auto-overwrite, `task.py` among them. A git merge computes changes instead
of replacing files, which is the only path that preserves both sides.

## Requirements

- **R1 — merge, never overwrite.** Upgrade through `git merge --no-ff` on a task
  branch cut from `codex/personal`. Do not run `trellis update` to perform the
  upgrade, and do not install the beta CLI globally (it would change the
  toolchain for every other project on this machine).
- **R2 — the fork's planning gate survives.** After the merge,
  `task.py attest` / `replan` / `planning-status` and the version-bound `start`
  must all still work, and `common/planning.py` must exist in both script trees.
- **R3 — the fork's Windows fixes survive and extend to beta's new surface.**
  `common/io.py` keeps `newline="\n"`. The two tests beta adds that spawn Python
  (`spec-injection`, `workflow-layered-default`) must resolve the interpreter through
  `packages/cli/test/helpers/python.ts` instead of hard-coding `python3`; on this
  machine `python3` is the Store stub that exits 9009, so the existing
  `describe.skipIf(!hasPython())` guard silently skips the whole suite while the UI
  reports it as passing. `pi-truncate-utf8` needs no change — it spawns nothing.
- **R4 — the two script trees stay byte-identical.** The `regression.test.ts`
  parity contract is not negotiable: `.trellis/scripts/**.py` and
  `packages/cli/src/templates/trellis/scripts/**.py` must match exactly, and every
  dogfood platform file must match its template after the `python3` → `python`
  normalization.
- **R5 — the two `workflow.md` copies stay in step with each other** and keep the
  fork's strict planning philosophy (every new task needs `prd.md`, `design.md`,
  `implement.md`) while adopting beta's genuinely new sections. DSH routing is **not**
  edited: the merged classification is kept, because beta ships the role prompts the
  DSH paragraphs name and four test files pin that routing (decision D5).
- **R6 — `.trellis/.version` ends at `0.7.0-beta.4`.** The merge lands it at
  `0.7.0-beta.1`, which is the value beta froze and is wrong for this tree.
- **R7 — no migration run.** All nine manifests between 0.6.14 and 0.7.0-beta.4
  declare `breaking: false` and carry zero migrations, so `--migrate` must not be
  used.
- **R8 — leave concurrent work alone.** `.trellis/tasks/11-11-deferred-marker/`
  has uncommitted edits from another session. They are not part of this task and
  must not be staged, reverted, or folded into this branch's commits.

## Non-goals

- Backfilling `paths:` frontmatter onto the 29 spec files that lack it. Beta adds
  it to 13 files; the rest is a separate task, and until then path-scoped
  injection matches little in this repo.
- Configuring `dsh` as a dogfood platform in this repository. The merged
  `workflow.md` describes beta's DSH routing, but no `.dsh/` tree is generated here
  because dsh is not a configured platform; making that decision is
  `11-23-dsh-native-subagents`, not this task.
- Publishing the result to npm, or declaring the fork safe to track upstream main
  again. Beta has had no commit since 2026-09-12; adopting it means parking on a
  beta line on purpose.
- Choosing what to do about DSH sub-agents. Tracked separately as
  `11-23-dsh-native-subagents`, which is blocked on this task because it needs the
  merged `workflow.md` wording and the post-merge manifest state to decide.

## Acceptance Criteria

- [ ] `git merge --no-ff upstream/feat/v0.7-beta` completes on
      `codex/upgrade-v0.7-beta` with all eight measured conflicts resolved and no
      conflict markers left anywhere (`git grep -nE '^(<{7}|={7}|>{7})( |$)' -- ':!.trellis/tasks/archive'`
      returns nothing; the archive exclusion is what makes the `={7}` alternative
      usable, and dropping it would let a half-resolved file pass).
- [ ] **DSH routing still matches beta.** `DeepSeek Harness` occurs 17 times in each
      `workflow.md` copy with 0 of them on an inline-group tag line, and
      `trellis-agent-` occurs 5 times, all inside the DSH paragraphs. This is the
      merged state (decision D5): the four test files that pin this routing stay
      green, rather than being rewritten to match an edited document.
- [ ] **The planning gate refuses, not just runs.** `task.py --help` lists `attest`,
      `replan`, `planning-status`, and `workflow`; `planning-status` runs; and a
      throwaway task holding only `prd.md` makes `task.py start` exit non-zero with a
      planning error. `task-planning.integration.test.ts` executes with skip=0.
- [ ] **Windows writing is verified by bytes, not by reading source or by an empty
      diff.** `common/io.py` still passes `newline="\n"`, `task_store.py` still
      carries the `commit_paths` archive fix, and counting CR bytes in a file written
      by a real `task.py archive` / `add_session.py` on this machine yields 0.
- [ ] **Beta's new capabilities work end to end, not just compile.** A concrete
      `.trellis/workflows/smoke.md` is created, `task.py workflow smoke` and
      `--clear` behave, and `get_context.py --mode phase` reads the variant. A spec
      edit in a temporary tree emits `<spec-context sha256=…>`, proving injection
      fires.
- [ ] The two beta tests that spawn Python (`spec-injection`,
      `workflow-layered-default`) resolve the interpreter via `test/helpers/python.ts`,
      and vitest confirms they execute on Windows rather than skip.
      `pi-truncate-utf8` is not in scope — it spawns nothing.
- [ ] `regression.test.ts`'s two parity suites pass (script trees byte-identical,
      dogfood platform files match templates).
- [ ] `pnpm build`, `pnpm typecheck`, `pnpm lint` pass.
- [ ] The full core and cli test suites pass, with the beta-added suites among the
      ones that actually ran.
- [ ] `.trellis/.version` reads `0.7.0-beta.4`, and `.trellis/config.yaml` still has
      its monorepo `packages:` block and `default_package: cli` (the ledger rebuild
      must not repeat the `7b17052d` wipe).
- [ ] **The daily `trellis` command is accounted for.** After the upgrade, the
      global 0.6.17 CLI prints a CLI-is-older warning and refuses `trellis update`
      (downgrade guard). The delivered answer states what a session should run
      instead — `node packages/cli/bin/trellis.js` — and where that is documented.
- [ ] `marketplace`'s merge commit is pushed to `MrUncleXiang/marketplace`, so the
      parent pointer is pullable; `docs-site` points at a commit already on
      `origin/main`.
- [ ] `get_context.py --mode spec --file <repo file>` returns matches for the specs
      beta annotates — measured against the files that actually route
      (`platform-integration.md`, `trellis-core-sdk.md`), not a raw file count.
- [ ] The fork's own Windows commit and the planning-gate commit are both
      reachable in history; nothing was force-pushed or rewritten.
- [ ] `.trellis/tasks/11-11-deferred-marker/` is still modified and uncommitted,
      byte-identical to its pre-task state.
