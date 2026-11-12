import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,'../../../..');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'trellis-b-paired-'));
const baseline=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
const sourceFiles=['common/skills/brainstorm.md','common/skills/before-dev.md','common/skills/check.md','common/commands/start.md','common/commands/continue.md','trellis/workflow.md'];
const archive=path.join(root,'baseline.zip');
execFileSync('git',['archive','--format=zip','--output',archive,'HEAD','packages/cli/src/templates'],{cwd:repo});
execFileSync('python',['-c','import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',archive,path.join(root,'baseline')]);
const sha=s=>createHash('sha256').update(s).digest('hex');
for(const version of ['old','new']){
 const dist=path.join(root,version,'dist');fs.mkdirSync(path.dirname(dist),{recursive:true});fs.cpSync(path.join(repo,'packages/cli/dist'),dist,{recursive:true});
 fs.cpSync(path.join(root,'baseline/packages/cli/src/templates'),path.join(dist,'templates'),{recursive:true});
 if(version==='new')for(const p of sourceFiles)fs.copyFileSync(path.join(repo,'packages/cli/src/templates',p),path.join(dist,'templates',p));
 fs.symlinkSync(path.join(repo,'packages/cli/node_modules'),path.join(root,version,'node_modules'),'junction');fs.writeFileSync(path.join(root,version,'package.json'),'{"type":"module"}');
 const collect=`import fs from 'node:fs';import path from 'node:path';import {collectPlatformTemplates} from './dist/configurators/index.js';import {replacePythonCommandLiterals} from './dist/configurators/shared.js';import {getAllScripts,workflowMdTemplate} from './dist/templates/trellis/index.js';const target=process.argv[2];for(const [p,t] of collectPlatformTemplates('codex')){const a=path.join(target,p);fs.mkdirSync(path.dirname(a),{recursive:true});fs.writeFileSync(a,replacePythonCommandLiterals(t));}for(const [p,t]of getAllScripts()){const a=path.join(target,'.trellis/scripts',p);fs.mkdirSync(path.dirname(a),{recursive:true});fs.writeFileSync(a,replacePythonCommandLiterals(t));}fs.writeFileSync(path.join(target,'.trellis/workflow.md'),replacePythonCommandLiterals(workflowMdTemplate));`;
 fs.writeFileSync(path.join(root,version,'collect.mjs'),collect);execFileSync(process.execPath,[path.join(root,version,'collect.mjs'),path.join(root,version,'seed')]);
}
function walk(d,b=d,out={}){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,b,out);else out[path.relative(b,p).replaceAll('\\','/')]=sha(fs.readFileSync(p));}return out;}
const oldHashes=walk(path.join(root,'old/seed'));const newHashes=walk(path.join(root,'new/seed'));const delta=Object.keys({...oldHashes,...newHashes}).filter(p=>oldHashes[p]!==newHashes[p]);
const expected=['.trellis/workflow.md','.agents/skills/trellis-brainstorm/SKILL.md','.agents/skills/trellis-before-dev/SKILL.md','.agents/skills/trellis-check/SKILL.md','.agents/skills/trellis-start/SKILL.md','.agents/skills/trellis-continue/SKILL.md'];
if(delta.some(p=>!expected.includes(p))||delta.length!==expected.length)throw Error('Unexpected generated difference '+JSON.stringify(delta));
const manifest={date:'2026-11-12',root,baseline,cliVersion:execFileSync(process.execPath,['C:/Users/PXWD/AppData/Roaming/npm/node_modules/@openai/codex/bin/codex.js','--version'],{encoding:'utf8'}).trim(),sourceFiles:sourceFiles.map(p=>({path:'packages/cli/src/templates/'+p,old:sha(fs.readFileSync(path.join(root,'old/dist/templates',p))),new:sha(fs.readFileSync(path.join(root,'new/dist/templates',p)))})),generatedDifferences:delta,oldHashes,newHashes};
fs.mkdirSync(path.join(here,'paired-evidence'),{recursive:true});fs.writeFileSync(path.join(here,'paired-evidence/setup.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({root,baseline,cliVersion:manifest.cliVersion,generatedDifferences:delta},null,2));
