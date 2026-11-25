import {readFileSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
export const root='src/discrete/artifacts/cross-model-v1'
export const slices=['A','B','C'] as const
export function baseline(slice:string):any[]{const base=slice==='C'?'src/discrete/artifacts/vision-ablation':'src/discrete/artifacts/phase2-v2';return readdirSync(base,{withFileTypes:true}).filter(d=>d.isDirectory()).flatMap(d=>{try{const r=JSON.parse(readFileSync(join(base,d.name,'run.json'),'utf8'));if(slice==='C')return r.condition==='Partial-known-Vision'&&[0,1,2,4].includes(r.phase)?[{...r,slice,model:'gpt-5.6-sol',baseline:true,source:join(base,d.name)}]:[];return r.attempt<=3&&((slice==='A'&&r.mode==='identical_loop'&&r.condition==='Partial-unknown-passive')||(slice==='B'&&r.mode==='parametric_shift'&&r.condition==='Partial-unknown-interactive'))?[{...r,slice,model:'gpt-5.6-sol',baseline:true,source:join(base,d.name)}]:[]}catch{return []}})}
export function curve(runs:any[],cap:number,n:number){return Array.from({length:cap},(_,i)=>({k:i+1,success:new Set(runs.filter(r=>r.outcome==='success'&&(r.attempt??1)<=i+1).map(r=>r.seed??r.phase)).size,total:n}))}
