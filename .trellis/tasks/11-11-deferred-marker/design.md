# Design — deferred-work marker

## Shape of the change

Four artifacts, each with one job:

```
marker line            scanner                      prompt + docs            skill
──────────             ───────                      ─────────────            ─────
why this code          reads the marker             teaches the format       reads the list,
is still here          and lists it                 at the moment of need    judges each one
```

Nothing stores state. The marker lives next to the code, and the scanner re-derives everything from the tree on each run. There is no index file, no ledger, no cache to invalidate.

## 1. Marker syntax

```
// trellis-defer: <why this code is still here>
```

- Keyword `trellis-defer:` is the only machine-readable part. Everything after it is free text.
- The comment prefix belongs to the host language (`//`, `#`, `<!-- -->`, `--`, …). The scanner does not care about the prefix; it looks for the keyword anywhere in a line. That keeps the scanner from needing a language table.
- Markdown files may contain the marker as a bare line. The scanner skips anything inside a fenced code block, so a documentation example does not count as a real marker.

**Why free text rather than `key="value"` pairs.** The rejected fields (`owner`, `verify`, expiry, source, timestamp) all needed a value vocabulary the author would have had to invent. Free text lets the author write the one thing they actually know. The cost: the scanner cannot validate the content, only its presence. That trade is intentional — see `prd.md` R2a.

**Why not a `TODO` comment.** `TODO` is already used for "I meant to do this now and did not". The marker answers a different question: "this is finished as designed, and it is still here on purpose". Keeping the two words separate keeps the existing convention intact.

## 2. Scanner — `check_deferred.py`

Single file, no `common/` import. It must run in a user project where the rest of `.trellis/scripts/common/` may be older or customized, and it must exist byte-identically in both trees (`.trellis/scripts/` and `packages/cli/src/templates/trellis/scripts/`). Importing `common/log.py` would couple a read-only reporter to internal helpers for no benefit.

**Walk.** Start at the repo root (parent of `.trellis/`), visit every file, skip these directories by name at any depth:

```
.git  node_modules  dist  __pycache__  .venv  .pnpm-store
.trellis/tasks/archive
```

Skip by prefix, not by exact path, so a nested `node_modules` is also skipped.

**Read.** Decode as UTF-8 with `errors="ignore"`. A file that fails to decode is skipped rather than reported — the scanner is not a linter and a binary file is not an error.

**Match.** Line by line. Track fenced-code state per file: a line whose stripped form starts with `` ``` `` or `~~~` toggles the fence. Lines inside a fence are ignored. Otherwise, a line containing `trellis-defer:` yields a marker.

**Validate.** Everything after `trellis-defer:` is `.strip()`ed. Empty means malformed.

**Output.**

```
.trellis/scripts/x.py:12  <reason>
packages/cli/src/cli/index.ts:83  <reason>

2 marker(s)
```

Malformed entries print as `<path>:<line>  [WARN] marker has no reason text` and go to the summary count separately.

**Exit codes.** `0` — no malformed markers (markers found or none found). `1` — at least one malformed marker. Never a nonzero exit for "markers exist"; the marker count is not a health signal.

**Flags.** `--root <path>` to scan a different tree (used by tests). Nothing else. No `--strict`, no `--expired`, no JSON — those belonged to the dropped mechanism.

## 3. Registration for distribution

`packages/cli/src/templates/trellis/index.ts`:

- `export const checkDeferredScript = readTemplate("scripts/check_deferred.py");`
- `scripts.set("check_deferred.py", checkDeferredScript);` inside `getAllScripts()`

Without the second line the file sits in the package but `trellis update` never ships it to existing projects. The dogfood parity test (`packages/cli/test/regression.test.ts`, "stays byte-identical") derives its file list from the filesystem, so adding the file to both trees is enough for that test; it is `getAllScripts()` that decides distribution.

## 4. Where the AI learns the format

`packages/cli/src/templates/common/skills/check.md`, in the **Scope Discipline** checklist. Two new items, and the full line shape inline — not a pointer to the guide, because a pointer is a document the model may not open:

- Did you leave code in place on purpose (an old alias, a compatibility branch, a capability you are deliberately not building yet)? If so, write the marker at that line, with the reason.
- If you removed such code, did you remove its marker in the same change?

The line shape appears verbatim in the second item so the model sees the exact syntax at the moment it is asked the question.

## 5. Documentation

`spec/guides/deferred-marker-format.md`, in two copies:

| Copy | Why |
| --- | --- |
| `.trellis/spec/guides/deferred-marker-format.md` | This repo's own guide |
| `packages/cli/src/templates/markdown/spec/guides/deferred-marker-format.md.txt` | What new projects receive |

Contents: the line shape, one filled example, the R2a writing requirement ("say who still depends on it, or what breaks if it is deleted"), and a short *fields we deliberately do not have* section listing `owner` / `verify` / expiry / source / timestamp with the one-line reason each was dropped.

Wiring for the shipped copy:

- `packages/cli/src/templates/markdown/index.ts` — new export `guidesDeferredMarkerFormatContent = readLocalTemplate("spec/guides/deferred-marker-format.md.txt")`.
- `packages/cli/src/configurators/workflow.ts` — add the file to the `guidesDocs` array (around `:278-288`). This is required: unlike skill templates, guide templates are listed explicitly, so a file that exists in the package but is not in this array never reaches a new project.

Index rows in both index files:

- `.trellis/spec/guides/index.md` — one row in the *Available Guides* table
- `packages/cli/src/templates/markdown/spec/guides/index.md.txt` — the same row

## 6. The `trellis-deferred` skill

`packages/cli/src/templates/common/skills/deferred.md`. Skill templates are auto-discovered by `getSkillTemplates()` (`packages/cli/src/templates/common/index.ts:77`), which reads the directory — no registration code, no array to update.

The skill's steps:

1. Run the scanner.
2. If there are no markers, say so and stop. Do not invent work.
3. Group by directory so related markers appear together.
4. For each marker, open the code at that line and check whether the stated reason still holds. This is the step that makes the skill worth having; without it the skill is a `cat`.
5. Recommend one of: *delete now* (the dependency is gone), *check X first* (name the concrete thing to check), *keep* (the reason still holds).
6. If the user decides to delete, remind them that the marker goes in the same change.

One line must appear in the skill: **the marker has exactly one field, and the missing fields were dropped on purpose — do not suggest adding them back.** This is the defense against the next session re-opening the same design debate.

## 7. Dogfood copies

A skill renders to six platform trees: `.claude/skills/`, `.cursor/skills/`, `.opencode/skills/`, `.pi/skills/`, `.omp/skills/`, `.agents/skills/`. All must be synced and registered in `.trellis/.template-hashes.json`, or `trellis update` sees them as user-modified files and refuses to manage them. The dogfood parity test added earlier ("regression: dogfood platform files match what ships to users") reports any copy left out of sync.

## Risks

- **The marker becomes a way to avoid deleting code.** An agent can write a plausible reason for anything. Nothing in this design prevents that; R2a only raises the cost by requiring the author to name a dependency. The defense is the skill's step 4, where a reader checks the claim against the code — which only works if someone runs it.
- **The reason is written for the wrong reader.** A reason that records *what* the code does ("handles the legacy flag") rather than *why it is still there* is useless. The guide states the requirement; nothing enforces it.
- **The scanner rots silently.** It has one test file and no CI gate. If someone changes the marker keyword in `check.md` and not in the scanner, the scanner reports zero markers and everyone reads that as "no debt". The integration test pins the keyword in both places so this shows up as a test failure rather than as silence.
- **Guide copies diverge.** Two index files and two guide copies. The dogfood parity test covers `.trellis/` versus templates only for platform files, not for spec guides, so a divergence here would not be caught.
