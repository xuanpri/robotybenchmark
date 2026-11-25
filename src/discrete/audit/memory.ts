import {mkdirSync,existsSync,readFileSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
import {provider} from '../../study/provider'
import {instance,initial,step,same,danger,move,modes,seeds,type Mode,type State,type Instance} from '../dynamics/world'
import {observe,parse,messages,type Condition,type PublicAttempt,type Decision,type Observation} from '../dynamics/protocol'
import {save} from '../dynamics/preflight'
export type Row={before:State;after:State;input:Observation;output:Observation;decision?:Decision;raw:string;wireName:string;predictionCorrect?:boolean;visible:boolean;ticks_since_last_seen:number;latency:number;model:string;usage:Record<string,unknown>;formatError?:string}
export type Run={id:string;mode:Mode;seed:number;phase:number;condition:Condition;attempt:number;instance:Instance;states:State[];steps:Row[];public:PublicAttempt;outcome:State['outcome'];attribution?:{category:string;evidence:string};infrastructureError?:string}
export function attribute(before:State,after:State,d?:Decision):Run['attribution']{
  if(after.outcome==='format')return {category:'Format Error',evidence:'Strict JSON/schema rejected; no fallback action or world advance.'}
  const correct=d&&same(d.predicted_next.pos,after.robot.pos)&&d.predicted_next.heading===after.robot.heading
  if(d&&!correct&&['collision','swap','vision'].includes(after.outcome)&&danger(before,move(before.player,d.action),d.predicted_next)==='running')return {category:'Prediction Error',evidence:'Replacing the next robot truth with the reported prediction removes the immediate fatal event for the same action.'}
  return {category:'Action/Planning Error',evidence:correct?'Correct terminal prediction but fatal action/timeout.':'Wrong prediction does not remove death in the one-step counterfactual, or failure is timeout.'}
}
function wireName(dir:string,base:string){
  let name=base
  for(let k=0;k<=3;k++){
    const paths=[0,1].map(n=>join(dir,name+'-'+n+'.json')).filter(existsSync)
    if(!paths.length)return name
    const receipts=paths.map(p=>JSON.parse(readFileSync(p,'utf8')))
    if(receipts.some(r=>r.status===200)||receipts.some(r=>r.latency===undefined))return name
    const last=receipts.at(-1)
    if(!(last.error||[429,502,503,504].includes(last.status)))return name
    if(k===3)throw Error('Transport retry cap reached')
    name=base+'-transport-'+(k+1)
  }
  return name
}
export async function play(root:string,mode:Mode,c:Condition,seed:number,n:number,history:PublicAttempt[]){
  const i=instance(mode,seed,n),id=mode+'-'+c.toLowerCase()+'-seed-'+seed+'-attempt-'+n,dir=join(root,id)
  mkdirSync(join(dir,'wire'),{recursive:true})
  const file=join(dir,'run.json'),ask=provider(join(dir,'wire'),true)
  // Completed trajectories are immutable on resume; the audit reconstructs all
  // their requests and private truth before final acceptance.
  if(existsSync(file)){const old=JSON.parse(readFileSync(file,'utf8')) as Run;if(old.outcome!=='running')return old}
  const start=initial(i),run:Run={id,mode,seed,phase:i.phase,condition:c,attempt:n,instance:i,states:[start],steps:[],outcome:'running',public:{attempt:1,observations:[observe(start,c)],decisions:[],failureReason:null}}
  const persist=()=>save(file,run);let lastSeen=0;persist()
  while(run.outcome==='running'){
    const before=run.states.at(-1)!,input=run.public.observations.at(-1)!
    if(input.robot)lastSeen=before.tick
    const name=wireName(join(dir,'wire'),'tick-'+String(before.tick).padStart(2,'0'))
    let answer
    try{if(!existsSync(join(dir,'wire',name+'-0.json'))&&cost(root)>9.70)throw Error('budget_reserve_stop');answer=await ask(name,memoryOffMessages(input,run.public,i,before))}catch(e){run.infrastructureError=(e as Error).message;persist();throw e}
    let decision:Decision|undefined,formatError:string|undefined
    try{decision=parse(answer.content,c)}catch(e){formatError=(e as Error).message}
    const after=decision?step(before,decision.action,i):{...before,outcome:'format' as const},output=observe(after,c,decision?.action==='PEEK')
    const row:Row={before,after,input,output,raw:answer.content,wireName:name,decision,visible:input.robot!==null,ticks_since_last_seen:before.tick-lastSeen,latency:answer.latency,model:answer.model,usage:answer.usage,
      ...(decision?{predictionCorrect:same(decision.predicted_next.pos,after.robot.pos)&&decision.predicted_next.heading===after.robot.heading}:{formatError})}
    run.steps.push(row);run.states.push(after);run.public.observations.push(output);if(decision)run.public.decisions.push(decision)
    run.outcome=after.outcome
    if(!['running','success'].includes(after.outcome)){run.public.failureReason=after.outcome;run.attribution=attribute(before,after,decision)}
    persist();console.log(mode,c,'seed',seed,'attempt',n,'tick',after.tick,decision?.action??'FORMAT',run.outcome)
  }
  save(join(dir,'public-history.json'),run.public);return run
}

export function memoryOffMessages(input:Observation,active:PublicAttempt,i:Instance,before:State){return messages('Partial-unknown-passive',1,input,[],{...active,attempt:1},i,before)}
export function cost(root:string){let total=0;for(const d of readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory())){const w=join(root,d.name,'wire');if(!existsSync(w))continue;for(const f of readdirSync(w).filter(f=>f.endsWith('.json'))){const r=JSON.parse(readFileSync(join(w,f),'utf8'));if(r.status===200){const u=JSON.parse(r.raw).usage;const m=String(u?.cost??'').match(/[\d.]+/);if(!m)throw Error('missing_cost_metadata');total+=Number(m[0])}}}return total}
export function loadRuns(root:string):Run[]{return readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()).flatMap(d=>{const f=join(root,d.name,'run.json');return existsSync(f)?[JSON.parse(readFileSync(f,'utf8')) as Run]:[]})}
