# Implementation plan

Ordered so each step is verifiable before the next depends on it. Steps 1–2 write the
files; step 3 registers them; steps 4–6 prove the repository's own checks still pass;
step 7 records the reversibility procedure.

Every command runs from the repository root. Test commands use
`pnpm --filter @mindfoldhq/trellis exec vitest run <file>`: vitest lives in
`packages/cli`, so a bare `npx vitest` from the root fails.

Two throwaway copies of this repository were used to measure the numbers quoted
below (`$env:TEMP\dsh-init-probe2`, `…-probe3`). They are scratch space, not
deliverables, and both are deleted before the task closes.

## 1. Confirm the starting state

```powershell
git status --porcelain
git rev-parse --abbrev-ref HEAD          # codex/personal
Test-Path .dsh                            # False
```

Expect the three ` M` entries under `.trellis/tasks/11-11-deferred-marker/`. They are
another session's uncommitted work; leave them out of every commit (R6 below).

**Verify:** `Test-Path .dsh` is `False`, and the manifest has no `.dsh/` keys:

```powershell
$h = Get-Content .trellis/.template-hashes.json -Raw | ConvertFrom-Json
($h.hashes.PSObject.Properties.Name | Where-Object { $_ -like '.dsh/*' }).Count   # 0
```

## 2. Write the seven files from the template, not by hand

```powershell
node -e "
const fs=require('node:fs'), path=require('node:path');
const base='file:///D:/zcx/Trellis/packages/cli/dist/';
Promise.all([import(base+'configurators/dsh.js'),import(base+'utils/template-hash.js')]).then(([dsh,th])=>{
  const files=dsh.collectDshTemplates();
  const written=[];
  for(const [rel,content] of files){
    if(!rel.startsWith('.dsh/')) continue;
    const full=path.join(process.cwd(),rel);
    fs.mkdirSync(path.dirname(full),{recursive:true});
    fs.writeFileSync(full,content,'utf-8');
    written.push(rel);
  }
  const hashes=th.loadHashes(process.cwd());
  for(const rel of written){
    hashes[rel]=th.computeHash(fs.readFileSync(path.join(process.cwd(),rel),'utf-8'));
  }
  th.saveHashes(process.cwd(),hashes);
  console.log('written='+written.length);
});
"
```

`pnpm build` first if `dist/` is stale — the script imports the built configurator,
and a stale `dist` would write yesterday's templates.

The `file:///` prefix is required: Node's ESM loader rejects a bare `D:/…` path with
`ERR_UNSUPPORTED_URL_SCHEME`.

**Verify:**

```powershell
(Get-ChildItem .dsh -Recurse -File).Count          # 7
$h = Get-Content .trellis/.template-hashes.json -Raw | ConvertFrom-Json
$keys = $h.hashes.PSObject.Properties.Name
($keys | Where-Object { $_ -like '.dsh/*' }).Count  # 7
$keys.Count                                        # 308  (was 301; +7, nothing lost)
```

The seven paths, in the order `collectDshTemplates()` emits them:

```
.dsh/DSH.md
.dsh/skills/trellis-agent-check/SKILL.md
.dsh/skills/trellis-agent-implement/SKILL.md
.dsh/skills/trellis-agent-research/SKILL.md
.dsh/skills/trellis-continue/SKILL.md
.dsh/skills/trellis-finish-work/SKILL.md
.dsh/skills/trellis-start/SKILL.md
```

## 3. Confirm the platform is now configured

```powershell
node -e "import('file:///D:/zcx/Trellis/packages/cli/dist/configurators/index.js').then(m=>console.log([...m.getConfiguredPlatforms(process.cwd())]))"
node packages/cli/bin/trellis.js platforms
```

**Verify:** the first prints seven ids including `dsh`; the second lists
`DeepSeek Harness (dsh) — .dsh`.

If `getConfiguredPlatforms` still returns six, the manifest keys did not land —
re-check step 2's `saveHashes` output rather than editing the JSON by hand.

## 4. Byte parity against the template

```powershell
node -e "
const fs=require('node:fs');
const base='file:///D:/zcx/Trellis/packages/cli/dist/';
import(base+'configurators/dsh.js').then(m=>{
  const norm=s=>s.replace(/\bpython3\b/g,'python');
  let ok=0,drift=0,missing=0;
  for(const [rel,c] of m.collectDshTemplates()){
    if(!fs.existsSync(rel)){missing++;continue;}
    (norm(fs.readFileSync(rel,'utf-8'))===norm(c))?ok++:drift++;
  }
  console.log('ok='+ok+' drift='+drift+' missing='+missing);
});
"
```

**Verify:** `ok=50 drift=0 missing=0`. Before this task it was
`43 / 0 / 7`; the seven missing were the `.dsh/` files.

The `python3` → `python` normalization is not cosmetic: on Windows the writer emits
`python`, the template source says `python3`, and `computeHash` does not normalize.
The parity test applies the same normalization, so a copy that skipped it would pass
the test but differ from what `trellis update` would write.

## 5. The tests that police this

```powershell
pnpm --filter @mindfoldhq/trellis exec vitest run test/regression.test.ts -t "dogfood"
pnpm --filter @mindfoldhq/trellis exec vitest run test/regression.test.ts -t "tracked in the manifest"
```

**Verify:** both pass. The second is the half-state guard — it fails if files exist
that the manifest does not own, and it fails the other way round too once a platform
is registered.

Note `-t` filters by test name: the per-platform parity cases are named
`` `${platformId}: committed files are byte-identical to the templates` ``
(`test/regression.test.ts:12283`), inside the describe block
`regression: dogfood platform files match what ships to users` (`:12209`).
`-t "dogfood"` matches that describe and therefore runs them all; `-t "committed
files"` also works and is narrower.

## 6. Nothing else moved

```powershell
pnpm build
pnpm typecheck
pnpm lint
pnpm --filter @mindfoldhq/trellis exec vitest run test/regression.test.ts
```

**Verify:** all pass. The full regression suite covers the six previously configured
platforms, whose 413 files must stay byte-identical.

Watch the run time: this suite takes ~150–230 s. Do not read a `STACK_TRACE_ERROR`
as a real failure without re-running that file alone at low concurrency — see §8.

## 7. Record the reverse procedure

Append to this file's sibling `design.md` §5 only if the reverse differs from what is
written there; otherwise state in the commit message that reversal is:

```powershell
git rm -r --cached .dsh; Remove-Item .dsh -Recurse -Force
# then remove the seven .dsh/** keys from .trellis/.template-hashes.json
```

**Verify:** the seven keys are the only manifest entries whose removal is required —
`getConfiguredPlatforms` reads the manifest, so deleting the directory alone leaves
`dsh` reported as configured while its files are gone, which is the half state §3 of
`design.md` forbids.

## 8. Commit

```powershell
git add -A -- ':!.trellis/tasks/11-11-deferred-marker'
git status --porcelain .trellis/tasks/11-11-deferred-marker   # still M, unstaged
git commit
```

Commit message in Chinese per `AGENTS.md`, e.g.
`chore(dsh): 把本仓库配成 dsh 平台，补齐 7 个角色与入口技能`.

**Verify:** `git show --stat HEAD` touches only `.dsh/**` and
`.trellis/.template-hashes.json`; `git status --porcelain` still lists the three
foreign files.

Two pre-commit behaviours to expect: `.husky/pre-commit` runs `pnpm lint-staged`,
then `git submodule update --init marketplace`, then the full `pnpm test`
(~230 s). If it reports a `STACK_TRACE_ERROR` in an unrelated suite, run that file
alone before assuming the change broke it — the suite is I/O heavy and the CLI vitest
config caps workers at 4 for exactly this reason.

## 9. Close the loop on the duplicate-name question

The DSH docs shipped with the engine (`@deepseek-ai/dsh@0.2.2-rc.5`,
`docs/subsystems/skills.md`) give the answer, so this step is confirmation rather
than discovery:

- root ranks: `.dsh/skills` = 100 (`project-dsh`), `.agents/skills` = 200
  (`project-agents`)
- collision rule: *"Lower ranks win duplicate skill names before provider
  registration order is considered"*

**Verify:** the three duplicated names (`trellis-start`, `trellis-continue`,
`trellis-finish-work`) resolve to the `.dsh/` copies. Record the vendor version the
claim came from in the commit message body, so a later DSH upgrade that changes the
order has a dated anchor to compare against.

If a future version reverses the order, the fallback is to delete the three
duplicated entry skills from `.dsh/skills/` and keep the collision-free role skills
plus `DSH.md` — three deletions, no re-plan.

## Rollback

Everything this task produces is untracked-then-added, so rollback is a deletion plus
a manifest edit:

```powershell
git rm -r --cached .dsh; Remove-Item .dsh -Recurse -Force
# remove the seven .dsh/** keys from .trellis/.template-hashes.json
git commit
```

Before the commit, `git reset` (mixed, not `--hard`) restores the index without
touching the working tree. **Never `--hard`**: `.trellis/tasks/11-11-deferred-marker/`
holds another session's uncommitted work with no stash and no commit.
