import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {PLATFORM_IDS,collectPlatformTemplates,getConfiguredPlatforms} from '../../../../packages/cli/dist/configurators/index.js';
import {replacePythonCommandLiterals} from '../../../../packages/cli/dist/configurators/shared.js';
import {updateHashes} from '../../../../packages/cli/dist/utils/template-hash.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const configured=[...getConfiguredPlatforms(root)];const roles=['brainstorm','before-dev','check','start','continue'];const all=[];const selected=new Map();
for(const platform of PLATFORM_IDS){
 const files=collectPlatformTemplates(platform);if(!files)throw new Error('No templates for '+platform);const hits=[];
 for(const[p,t]of files){
  const role=roles.find(r=>new RegExp('(?:^|/)(?:trellis-)?'+r+'(?:/SKILL|[.]prompt)?[.](?:md|toml|json)$').test(p));
  if(!role||p.includes('/agents/'))continue;
  hits.push({role,path:p,characters:t.length,sha256:createHash('sha256').update(t).digest('hex')});
  if(configured.includes(platform)){const rendered=replacePythonCommandLiterals(t);if(selected.has(p)&&selected.get(p)!==rendered)throw new Error('Shared content mismatch '+p);selected.set(p,rendered);}
 }
 all.push({platform,entries:hits});
}
const report={date:'2026-11-12',configured,platforms:all,targets:[...selected.keys()],changed:[]};
if(process.argv.includes('--apply')){
 const applied=new Map();
 for(const[p,t]of selected){const abs=path.join(root,p);if(!fs.existsSync(abs))continue;if(fs.readFileSync(abs,'utf8')!==t){fs.writeFileSync(abs,t);report.changed.push(p);}applied.set(p,t);}
 const source=replacePythonCommandLiterals(fs.readFileSync(path.join(root,'packages/cli/dist/templates/trellis/workflow.md'),'utf8'));
 fs.writeFileSync(path.join(root,'.trellis/workflow.md'),source);applied.set('.trellis/workflow.md',source);updateHashes(root,applied);report.applied=true;
}
fs.writeFileSync(path.join(root,'.trellis/tasks/11-12-research-evidence-handoff/research/platform-entry-candidate.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
