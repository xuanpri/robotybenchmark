import {mkdirSync,readFileSync,existsSync,writeFileSync,renameSync} from 'node:fs'
import {join} from 'node:path'
import {spawnSync} from 'node:child_process'
import {save} from '../src/discrete/dynamics/preflight'
import {root} from '../src/discrete/cross-model/baseline'
import {preflight,textEpisode,visionEpisode,slug} from '../src/discrete/cross-model/experiment'
import {BudgetStop,spending,sha} from '../src/discrete/cross-model/provider'
import {report} from '../src/discrete/cross-model/report'
import {renderer} from '../src/discrete/vision/render-agent-view'
function protect(){const old=JSON.parse(readFileSync(join(root,'protected-before.json'),'utf8')),changed=Object.keys(old).filter(f=>!existsSync(f)||sha(readFileSync(f))!==old[f]);save(join(root,'protected-audit.json'),{passed:changed.length===0,files:Object.keys(old).length,changed});if(changed.length)throw Error('Protected files changed')}
async function main(){
 const args=process.argv.slice(2),value=(f:string)=>{const i=args.indexOf(f);return i<0?undefined:args[i+1]},budget=Number(value('--max-budget-per-model-rmb')??15);if(!Number.isFinite(budget)||budget<=.5||budget>25)throw Error('budget must be 0.50..25')
 const selected=(value('--slices')??'A,B,C').split(',');if(!selected.length||selected.some(s=>!['A','B','C'].includes(s))||new Set(selected).size!==selected.length)throw Error('slices must be distinct A,B,C');
 mkdirSync(root,{recursive:true});protect()
 const tests=spawnSync(process.execPath,['--import','tsx','--test','--test-isolation=none','src/discrete/cross-model/tests.ts'],{encoding:'utf8'});save(join(root,'unit-tests.json'),{status:tests.status,stdout:tests.stdout,stderr:tests.stderr});process.stdout.write(tests.stdout);if(tests.status!==0||!tests.stdout.includes('tests 5'))throw Error('Five zero-cost tests must actually execute before any paid calls')
 if(args.includes('--local-only')){console.log('Local tests passed; no network calls');return}
 const key=process.env.DMXAPI_API_KEY,base=process.env.DMXAPI_BASE_URL;if(!key||!base)throw Error('missing_environment');const u=new URL(base);if(u.protocol!=='https:'||!(u.hostname==='dmxapi.cn'||u.hostname.endsWith('.dmxapi.cn')))throw Error('unexpected_endpoint')
 const res=await fetch(base.replace(/\/+$/,'')+'/models',{headers:{Authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(30000)});if(!res.ok)throw Error('model_discovery_http_'+res.status);const discovery=await res.json();save(join(root,'model-discovery.json'),discovery)
 const ids=discovery.data.map((m:any)=>m.id),models=[value('--claude-model')??'claude-opus-5-5',value('--gemini-model')??'gemini-4-argon'];for(const id of models)if(!ids.includes(id))throw Error('Requested title model unavailable/ambiguous; explicitly choose a listed model ID: '+id)
 console.log('Selected exact model IDs:',JSON.stringify(models))
 const sources=['provider.ts','experiment.ts'].map(file=>({file,sha256:sha(readFileSync(join('src/discrete/cross-model',file)))})),manifest={version:2,selectedSlices:selected,models,gpt:'read-only baseline only',seeds:[101,102,103,104,105,106],phases:[0,1,2,4],operationalTextAttemptCap:3,originalPromptMaxAttempts:5,visionAttemptCap:1,budgetPerModelRMB:budget,reserveRMB:.5,video:false,sources,normalization:'Strip whole Markdown JSON fences only; no other repairs',preflightCallsPerNewModel:2},fingerprint=sha(JSON.stringify(manifest)),file=join(root,'manifest.json')
 if(existsSync(file)){const old=JSON.parse(readFileSync(file,'utf8'));if(JSON.stringify(old.models)!==JSON.stringify(models)||JSON.stringify(old.sources)!==JSON.stringify(sources))throw Error('Frozen models or core source changed');if(old.fingerprint!==fingerprint){const history=join(root,'manifest-history');mkdirSync(history,{recursive:true});const archive=join(history,old.fingerprint+'.json');if(!existsSync(archive))writeFileSync(archive,JSON.stringify(old,null,2))}}
 const resumeFile=join(root,'resume-baseline.json');if(!existsSync(resumeFile)){const {files}=await import('../src/discrete/cross-model/provider');const wires=Object.fromEntries(models.flatMap(m=>files(join(root,slug(m)))).map(f=>[f,sha(readFileSync(f))]));save(resumeFile,{models:models.map(model=>({model,...spending(join(root,slug(model)))})),wires,started:new Date().toISOString(),selectedSlices:selected});if(Object.keys(wires).length!==252)throw Error('Expected 252 historical receipts before resumption')}
 const checkpoint=JSON.parse(readFileSync(resumeFile,'utf8'));for(const [f,h] of Object.entries(checkpoint.wires))if(sha(readFileSync(f))!==h)throw Error('Historical wire changed: '+f)
 save(file,{...manifest,fingerprint})
 for(const model of models){const p=await preflight(root,model,budget);console.log('Preflight passed',JSON.stringify(p))}
 if(args.includes('--preflight-only')){report(root,models);protect();return}
 for(const model of models){const stop=join(root,slug(model),'stop.json');if(existsSync(stop)){const h=join(root,slug(model),'stop-history');mkdirSync(h,{recursive:true});renameSync(stop,join(h,'stop-'+Date.now()+'.json'))}}
 const render=await renderer()
 try{await Promise.all(models.map(async model=>{
  const update=()=>report(root,models)
  try{for(const slice of (['A','B'] as const).filter(s=>selected.includes(s)))for(const seed of [101,102,103,104,105,106]){
    const history:any[]=[];for(let n=1;n<=3;n++){const r=await textEpisode(root,model,slice,seed,n,history,budget,update);if(r.outcome==='success')break;history.push(r.public)}
   }
   if(selected.includes('C'))for(const phase of [0,1,2,4])await visionEpisode(root,model,phase,budget,render,update)
  }catch(e){save(join(root,slug(model),'stop.json'),{reason:(e as Error).message,budgetStop:e instanceof BudgetStop,cost:spending(join(root,slug(model)))});console.error('Stopped model',model,(e as Error).message)}finally{update()}
 }))}finally{await render.close()}
 protect();console.log(JSON.stringify(report(root,models),null,2))
}
main().catch(e=>{console.error('Cross-model stopped:',(e as Error).message);process.exitCode=1})
