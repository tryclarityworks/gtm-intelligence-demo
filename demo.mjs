import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { campaign, accounts } from './lib/fixtures.mjs';
import { AS_OF, validate, approve, approvedExport, brief, reviewStatus } from './lib/workflow.mjs';
import { render } from './lib/render.mjs';

const args=process.argv.slice(2), command=args[0]?.startsWith('--')?'run':args[0]||'run';
const option=(key,fallback)=>{const i=args.indexOf('--'+key);return i<0?fallback:args[i+1]};
const output=resolve(option('output','output')), path=join(output,'state.json');
try {
  await mkdir(output,{recursive:true});
  let state;
  try{state=JSON.parse(await readFile(path,'utf8'))}catch(err){if(err.code!=='ENOENT')throw err;state=structuredClone({campaign,accounts,as_of:AS_OF})}
  validate(state.campaign,state.accounts);
  if(Number.isNaN(Date.parse(state.as_of)))throw Error('Invalid evaluation date');
  const p=state.accounts.find(p=>p.id===option('id'));
  if(command==='review'){if(!p)throw Error('Unknown account');approve(p,state.campaign,option('reviewer'),state.as_of)}
  else if(command==='rate'){
    if(!p)throw Error('Unknown account');
    const r=p.reviewed_dimension_ratings.find(r=>r.dimension_key===option('dimension'));
    if(!r)throw Error('Choose an existing supported rating; add new evidence explicitly in state.json');
    const raw=option('value');if(!['0','0.5','1','unknown'].includes(raw))throw Error('Rating must be 0, 0.5, 1 or unknown');
    r.rating=raw==='unknown'?null:Number(raw);
  } else if(command==='export'){
    if(!p)throw Error('Unknown account');
    await writeFile(join(output,`approved-${p.id}.txt`),approvedExport(p,state.campaign,state.as_of));
  } else if(command!=='run')throw Error('Commands: run, review, rate, export');
  validate(state.campaign,state.accounts);
  await writeFile(path,JSON.stringify(state,null,2)+'\n');
  await writeFile(join(output,'report.html'),render(state.campaign,state.accounts,state.as_of));
  await writeFile(join(output,'results.json'),JSON.stringify(state.accounts.map(p=>({id:p.id,...brief(p,state.campaign,state.as_of),review:reviewStatus(p,state.campaign,state.as_of)})),null,2)+'\n');
  console.log(`Synthetic report: ${join(output,'report.html')}`);
  console.log('No external requests or messages sent.');
} catch(err){console.error(err.message);process.exitCode=1}
