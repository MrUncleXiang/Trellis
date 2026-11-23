# Implementation plan

Ordered so each step is verifiable before the next depends on it. Steps 1–2
build the scanner and prove it works; steps 3–4 ship it; steps 5–7 teach the
format; step 8 syncs the dogfood copies.

## 1. Scanner — both trees

Create the same bytes at:

- `.trellis/scripts/check_deferred.py`
- `packages/cli/src/templates/trellis/scripts/check_deferred.py`

Follow `.trellis/spec/cli/backend/script-conventions.md`: `#!/usr/bin/env python3`,
module docstring with usage, `from __future__ import annotations`, `main() -> None`,
`if __name__ == "__main__": main()`.

Stdlib only — `argparse`, `pathlib`, `sys`. No `common/` imports (see `design.md` §2).

**Verify:**

```bash
python .trellis/scripts/check_deferred.py
```

Run it on this repo before any markers exist → `0 marker(s)`, exit 0.

Add a temporary marker by hand in a scratch file, run again → the marker is listed. Delete the scratch file.

Confirm the two copies are identical:

```bash
python -c "import hashlib,sys;[print(hashlib.sha256(open(p,'rb').read()).hexdigest()) for p in sys.argv[1:]]" .trellis/scripts/check_deferred.py packages/cli/src/templates/trellis/scripts/check_deferred.py
```

## 2. Scanner integration test

New file `packages/cli/test/scripts/deferred-marker.integration.test.ts`, modelled
on `packages/cli/test/scripts/task-meta.integration.test.ts`: copy
`src/templates/trellis/scripts` into a temp dir, `describe.skipIf(!hasPython())`,
spawn via `PYTHON` from `../helpers/python.js`.

Cases:

| Case | Expected |
| --- | --- |
| no markers | exit 0, output contains `0 marker(s)` |
| one marker in a `.ts` file | exit 0, output has `path:line` and the reason text |
| one marker in a `.py` file (`#` prefix) | same |
| marker with nothing after `trellis-defer:` | exit 1, output contains `marker has no reason text` |
| marker inside a fenced code block in `.md` | not listed |
| marker in `.md` outside a fence | listed |
| marker under `node_modules/` | not listed |
| marker under `.trellis/tasks/archive/` | not listed |

**Verify:** `npx vitest run test/scripts/deferred-marker.integration.test.ts` — all green.

## 3. Register for distribution

`packages/cli/src/templates/trellis/index.ts`:

- Add `export const checkDeferredScript = readTemplate("scripts/check_deferred.py");` beside the other main-script exports (around `:72`).
- Add `scripts.set("check_deferred.py", checkDeferredScript);` in `getAllScripts()` beside `add_session.py` (around `:124`).

**Verify:**

```bash
npx vitest run test/templates/trellis.test.ts
npx vitest run test/regression.test.ts -t "byte-identical"
```

Both green, and `getAllScripts().has("check_deferred.py")` is true.

## 4. Prompt in the check skill

`packages/cli/src/templates/common/skills/check.md`, in **Scope Discipline**
(currently `:60-66`, five items). Append two items and show the line shape:

```markdown
- [ ] Left code in place on purpose (an old alias, a compatibility branch, a capability deliberately not built yet)? Write the marker at that line with the reason — `// trellis-defer: <who still depends on it, or what breaks if deleted>` (`#` in Python/shell/YAML).
- [ ] Removed such code? Delete its `trellis-defer` marker in the same change.
```

**Verify:** `cat packages/cli/src/templates/common/skills/check.md` — the two items
are present and the marker shape appears verbatim. The keyword `trellis-defer:`
must match byte-for-byte what the scanner looks for.

## 5. Format guide — two copies

New files:

- `.trellis/spec/guides/deferred-marker-format.md`
- `packages/cli/src/templates/markdown/spec/guides/deferred-marker-format.md.txt`

Content (see `design.md` §5): line shape, one filled example, the R2a writing
requirement, and the *fields we deliberately do not have* section covering
`owner`, `verify`, expiry, source, timestamp.

Index rows:

- `.trellis/spec/guides/index.md` — add to *Available Guides* (`:22-26`)
- `packages/cli/src/templates/markdown/spec/guides/index.md.txt` — same row

**Verify:** both index files list the guide; both guide files exist and agree on
the line shape.

## 6. Wire the shipped guide

`packages/cli/src/templates/markdown/index.ts`:

- `export const guidesDeferredMarkerFormatContent: string = readLocalTemplate("spec/guides/deferred-marker-format.md.txt");`

`packages/cli/src/configurators/workflow.ts`:

- Import the new export beside `guidesCodeReuseThinkingGuideContent` (`:37`).
- Add `{ name: "deferred-marker-format.md", content: guidesDeferredMarkerFormatContent }` to `guidesDocs` (`:278-288`).

**Verify:** `npx tsc --noEmit` clean. A file in the package that is missing from
`guidesDocs` never reaches a new project, so this step is not optional.

## 7. The `trellis-deferred` skill

New file `packages/cli/src/templates/common/skills/deferred.md`, structured like
`before-dev.md` (numbered steps, bash blocks, one mandatory line at the end).

Steps per `design.md` §6: run scanner → exit if empty → group by directory →
**check each reason against the code** → recommend delete/check/keep → remind
about deleting the marker with the code.

Must contain the sentence about the marker having exactly one field and the
missing fields being dropped on purpose.

**Verify:** `cat packages/cli/src/templates/common/skills/deferred.md`, and
`getSkillTemplates()` returns 6 entries (`node -e` against the built package, or
the existing skill test).

## 8. Dogfood sync

Render the new skill into the six platform trees and register the paths in
`.trellis/.template-hashes.json`. Use the same approach as the earlier dogfood
sync: render with `setResolvedPythonCommand("python3")` so committed copies keep
`python3`, then `updateHashes` against the committed bytes.

Paths to appear:

```
.claude/skills/trellis-deferred/SKILL.md
.cursor/skills/trellis-deferred/SKILL.md
.opencode/skills/trellis-deferred/SKILL.md
.pi/skills/trellis-deferred/SKILL.md
.omp/skills/trellis-deferred/SKILL.md
.agents/skills/trellis-deferred/SKILL.md
```

**Verify:** `npx vitest run test/regression.test.ts -t "dogfood platform files"` green,
which means every configured platform tree matches the template and every committed
platform tree is in the manifest.

## 9. Seed the three real markers

Add markers to the three known instances:

| File | Line area | Reason to write |
| --- | --- | --- |
| `packages/cli/src/cli/index.ts` | `--windsurf` option (`:83`) | say who still passes the old flag, or what breaks |
| `packages/cli/src/commands/update.ts` | `LEGACY_UNTRACKED_AGENTS_MD_BLOCK_HASHES` (`:116`) | say which installs still need the old hash recognition |
| `packages/cli/src/commands/update.ts` | legacy Codex upgrade probe (`:658`) | say what still hits it |

Each reason must name a dependency or a failure, per R2a. No invented dates.

**Verify:** `python .trellis/scripts/check_deferred.py` lists exactly three markers,
exit 0.

## 10. Full gate

```bash
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

Plus the parity check:

```bash
diff -rq .trellis/scripts packages/cli/src/templates/trellis/scripts -x __pycache__
```

**Rollback.** Every step is additive. Deleting `check_deferred.py` (both copies),
the `getAllScripts()` line, the two `check.md` items, the guide + its two index rows,
the `guidesDocs` entry, the markdown export, the skill, the six rendered copies, and
the three markers restores the previous state exactly. No data is migrated, nothing
is renamed.

## Ordering note

Steps 1–2 prove the scanner works with no dependencies on anything else. If the
scanner cannot be made to work cleanly, stop there — the rest of the plan is only
worth doing if the scanner is reliable.
