# deferred-work marker for deliberately retained code

## Goal

Give deliberately retained code a place to record *why it is still here*, at the code site, so a later reader (human or AI) does not have to guess whether the code is dead weight or a compatibility promise.

## Problem

Some code is kept on purpose: a deprecated CLI alias, a legacy-install hash set, a probe for an old on-disk layout. The code is fine — it runs. What is lost is the judgment behind it: why it is still here.

With that judgment gone, the only two moves left are *delete and risk breaking old users* or *route around it forever*. Neither is a decision; both are avoidance.

Concrete instances in this repo:

| Location | What it is |
| --- | --- |
| `packages/cli/src/cli/index.ts:83` | `.option("--windsurf", "Deprecated alias for --devin (Windsurf was renamed)")` |
| `packages/cli/src/commands/update.ts:116` | `LEGACY_UNTRACKED_AGENTS_MD_BLOCK_HASHES` |
| `packages/cli/src/commands/update.ts:658` | legacy Codex upgrade probe |

## Requirements

- **R1 — marker format.** One fixed-format, single-line comment written at the code site: the keyword `trellis-defer:` followed by free-text reason. Example:
  ```
  // trellis-defer: 老用户脚本里还在写 --windsurf，等这批脚本退场再删
  ```
  Comment prefix follows the host language (`//` for TS/JS, `#` for Python/shell/YAML). Markdown files take the bare line.

- **R2 — reason only, no other fields.** No `owner`, no `verify`, no expiry, no source, no timestamp. Rationale (decided 2026-11-11):
  - `owner` needs a team/ownership concept Trellis does not have, and a package key that can go stale when packages are renamed or removed.
  - `verify` needs a per-project notion of "how to test", which does not translate across domains — a Unity, Unreal, or Godot project has no single command to run, and forcing the field makes people invent one.
  - An expiry field needs a comparison rule for versions or dates; every candidate rule was wrong on template files, repo-root files, or prerelease versions.
  - A source field would need every code change to know which task it belongs to. Checked against real history: the commit that introduced the `--windsurf` alias (`1a9a9475e`, "feat(platform): rename Windsurf to Devin (#325)", 2026-06-18) never touched `.trellis/tasks/` at all, so there is no task to name. `git blame` already yields the commit, author, and date.
  - A timestamp field duplicates what `git blame` already reports.
  - All of them add fields with no existing content to copy from, so the first person to write a marker has to invent the answer. The MVP keeps only what the author actually knows: why the code is here.

- **R2a — reason has a writing requirement, not a template.** The reason must say **who still depends on this code, or what breaks if it is deleted**. This is a requirement on the sentence, not a field: no required shape, no required punctuation, and the scanner performs no check on it. Knowing who depends on the code is what lets a later reader decide whether the code can go now; demanding a future deletion condition would force the author to predict, which is the failure mode this MVP avoids. The requirement is stated once in the format guide (R7); nothing enforces it mechanically.

- **R2b — document why the fields are absent.** The rejected fields and their reasons (R2) are written into the format guide (R7) as a short section, so a later session does not re-open the same debate. The `trellis-deferred` skill (R9) carries a single line: the marker has exactly one field, and missing fields were dropped on purpose — do not suggest adding them back.

- **R3 — readable scanner.** One read-only Python entry script lists every marker in the repo as `path:line` plus its reason, and reports markers whose reason is empty. It never edits, never deletes, never fails on a missing optional field.

- **R4 — single file, both trees.** The scanner is one file with no `common/` module. It exists twice, byte-identical: `.trellis/scripts/check_deferred.py` (dogfood) and `packages/cli/src/templates/trellis/scripts/check_deferred.py` (shipped).

- **R5 — registered for distribution.** The script is registered in `getAllScripts()` in `packages/cli/src/templates/trellis/index.ts`, so `trellis update` ships it to existing projects.

- **R6 — where it gets written.** A prompt in the Scope Discipline section of `packages/cli/src/templates/common/skills/check.md` carrying the exact line shape inline, so the AI reads the format at the moment it is asked the question.

- **R7 — format reference.** A short guide under `.trellis/spec/guides/`, with a mirror under `packages/cli/src/templates/markdown/spec/guides/` so new projects get it, plus the index row in `.trellis/spec/guides/index.md`. The guide carries: the line shape, one filled example, the R2a writing requirement, and a short "fields we deliberately do not have" section (R2b).

- **R8 — test coverage.** Integration test for the scanner (a marker is found, an empty reason is reported, markers inside fenced code blocks are skipped, skipped directories are not scanned). The existing dogfood parity test picks the new script up automatically.

- **R9 — a skill that answers questions about the markers.** A new `packages/cli/src/templates/common/skills/deferred.md` renders as `trellis-deferred` on every platform (skill files are auto-discovered by `getSkillTemplates()` in `packages/cli/src/templates/common/index.ts:77`, so no registration code is needed). The skill must do more than run the scanner: group markers by area, re-read each reason against the current code, and recommend *delete now / check X first / keep*. Its value is the judgment, not the command wrapper.

- **R10 — dogfood the new skill.** The rendered copies under `.claude/skills/`, `.cursor/skills/`, `.opencode/skills/`, `.pi/skills/`, `.omp/skills/`, `.agents/skills/` are synced, and the new paths are registered in `.trellis/.template-hashes.json` so `trellis update` does not treat them as user edits.

## Non-goals

- No central ledger file. A ledger separate from the code goes stale the moment someone edits the code and forgets the ledger.
- No automatic deletion. The scanner reports; a human decides.
- No count baseline or trend. More markers is not an error.
- No replacement for spec documents. A spec says how code should be written; a marker says this spot deliberately has not finished doing that.
- No enforcement of who owns the marker or how to verify the removal. Those were considered and dropped; see R2.

## Acceptance Criteria

- [ ] `python .trellis/scripts/check_deferred.py` lists every marker as `<path>:<line>` with its reason.
- [ ] A marker with no reason text is reported, naming the file and line.
- [ ] Markers inside fenced code blocks in Markdown are not collected.
- [ ] `.git`, `node_modules`, `dist`, `__pycache__`, and `.trellis/tasks/archive` are not scanned.
- [ ] Both copies of `check_deferred.py` are byte-identical; the existing parity test passes without editing it.
- [ ] `getAllScripts()` includes `check_deferred.py`, and `packages/cli/test/regression.test.ts` stays green.
- [ ] The three instances in the table above carry markers.
- [ ] `check.md` Scope Discipline shows the full marker line, not a pointer to another doc.
- [ ] The format guide states the R2a writing requirement and lists the rejected fields with their reasons.
- [ ] The `trellis-deferred` skill says the marker has exactly one field and that the others were dropped on purpose.
- [ ] `python .trellis/scripts/check_deferred.py` on this repo exits 0.

## Notes

- Design rationale and the rejected alternatives live in `drafts/trellis-deferred-marker-proposal.md`. That draft is the long form and describes a larger mechanism (five fields, expiry, generator subcommand, archive hook). This PRD is the settled MVP scope.
- Why the archive hook is out of scope: `task.json.relatedFiles` is initialized empty and never populated (`.trellis/scripts/common/task_store.py:550`), so a hook-driven check has no file list to work with.
- Scope of the MVP: prove that the marker gets written and gets read. Ownership, expiry, and verification can be added later if the markers prove useful in practice.
