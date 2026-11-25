import {existsSync,mkdirSync,readFileSync,writeFileSync,renameSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {provider,type Ask} from '../../study/provider'
import {initial,step,same,move,danger,baseline,phases,spec,walls,type State} from './environment'
import {observe,messages,parse,maxAttempts,conditions,type Condition,type Decision,type PublicAttempt,type Observation} from './public'
export const save=(file:string,data:unknown)=>{writeFileSync(file+'.partial',JSON.stringify(data,null,2));renameSync(file+'.partial',file)}
export type Category='Format Error'|'Prediction Error'|'Action/Planning Error'
export type Row={before:State;after:State;input:Observation;output:Observation;decision?:Decision;raw:string;wireName:string;
  predictionCorrect?:boolean;visible:boolean;ticks_since_last_seen:number;latency:number;model:string;usage:Record<string,unknown>;formatError?:string}
export type Attempt={id:string;condition:Condition;phase:number;attempt:number;states:State[];public:PublicAttempt;steps:Row[];
  outcome:State['outcome'];attribution?:{category:Category;evidence:string};infrastructureError?:string}
export function attribute(before:State,after:State,d?:Decision):Attempt['attribution']{
  if(after.outcome==='format')return {category:'Format Error',evidence:'Strict JSON/schema failed; no fallback action executed.'}
  const correct=!!d&&same(d.predicted_next.pos,after.robot.pos)&&d.predicted_next.heading===after.robot.heading
  if(d&&!correct&&['collision','swap','vision'].includes(after.outcome)&&danger(before,move(before.player,d.action),d.predicted_next)==='running')
    return {category:'Prediction Error',evidence:'Wrong terminal next-state prediction; replacing the actual next robot with that prediction removes immediate death for the identical action.'}
  return {category:'Action/Planning Error',evidence:correct?'Terminal next-state prediction correct, but action failed or budget expired.':'Wrong prediction does not remove death in the one-step counterfactual, or failure is timeout.'}
}
export function programmaticGates(root:string){
  const runs=(['Oracle','Blind-Rush','Memoryless-Reactive'] as const).flatMap(policy=>phases.map(p=>baseline(p,policy)))
  const counts=Object.fromEntries(['Oracle','Blind-Rush','Memoryless-Reactive'].map(policy=>[policy,runs.filter(r=>r.policy===policy&&r.outcome==='success').length]))
  const directDeaths=runs.filter(r=>r.policy==='Blind-Rush'&&r.outcome!=='success').length
  const passed=counts.Oracle===6&&counts['Blind-Rush']<=2&&counts['Memoryless-Reactive']<=2&&directDeaths>=4
  save(join(root,'programmatic-gates.json'),{passed,counts,directDeaths,total:6,runs})
  if(!passed)throw Error('Programmatic gates failed; API dispatch forbidden')
  return {passed,counts,directDeaths}
}
function nextWireName(dir:string,base:string){
  let name=base
  for(let retry=0;retry<=3;retry++){
    const file=join(dir,name+'-0.json')
    if(!existsSync(file))return name
    const r=JSON.parse(readFileSync(file,'utf8'))
    if(!r.error||r.latency===undefined)return name
    if(retry===3)throw Error('Completed transport retry cap reached')
    name=base+'-transport-'+(retry+1)
  }
  return name
}
export async function play(root:string,c:Condition,phase:number,n:number,history:PublicAttempt[],askOverride?:Ask):Promise<Attempt>{
  const id=c.toLowerCase()+'-phase-'+phase+'-attempt-'+n,dir=join(root,id),wire=join(dir,'wire')
  mkdirSync(wire,{recursive:true})
  const ask=askOverride??provider(wire,true),start=initial(phase),first=observe(start,c)
  const run:Attempt={id,condition:c,phase,attempt:n,states:[start],steps:[],outcome:'running',
    public:{attempt:n,observations:[first],decisions:[],failureReason:null}}
  const persist=()=>save(join(dir,'run.json'),run)
  let lastSeen=0
  persist()
  while(run.outcome==='running'){
    const before=run.states.at(-1)!,input=run.public.observations.at(-1)!
    if(input.robot)lastSeen=before.tick
    const wireName=nextWireName(wire,'tick-'+String(before.tick).padStart(2,'0'))
    let answer
    try{answer=await ask(wireName,messages(c,n,input,history,run.public))}
    catch(e){run.infrastructureError=(e as Error).message;persist();throw e}
    let decision:Decision|undefined,formatError:string|undefined
    try{decision=parse(answer.content,c)}catch(e){formatError=(e as Error).message}
    const after:State=decision?step(before,decision.action):{...before,outcome:'format'}
    const output=observe(after,c,decision?.action==='PEEK')
    const row:Row={before,after,input,output,decision,raw:answer.content,wireName,visible:input.robot!==null,
      ticks_since_last_seen:before.tick-lastSeen,latency:answer.latency,model:answer.model,usage:answer.usage,
      ...(decision?{predictionCorrect:same(decision.predicted_next.pos,after.robot.pos)&&decision.predicted_next.heading===after.robot.heading}:{formatError})}
    run.steps.push(row);run.states.push(after);run.public.observations.push(output)
    if(decision)run.public.decisions.push(decision)
    run.outcome=after.outcome
    if(!['running','success'].includes(after.outcome)){
      run.attribution=attribute(before,after,decision);run.public.failureReason=after.outcome
    }
    persist()
    console.log(c,'phase',phase,'attempt',n,'tick',after.tick,decision?.action??'FORMAT',after.outcome)
  }
  save(join(dir,'public-history.json'),run.public)
  return run
}
export async function playPhase(root:string,c:Condition,phase:number,onAttempt:()=>void){
  const history:PublicAttempt[]=[]
  for(let n=1;n<=maxAttempts(c);n++){
    const run=await play(root,c,phase,n,history);onAttempt()
    if(run.outcome==='success')break
    history.push(run.public)
  }
}
export function loadRuns(root:string):Attempt[]{
  return readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()).flatMap(d=>{
    const file=join(root,d.name,'run.json');return existsSync(file)?[JSON.parse(readFileSync(file,'utf8')) as Attempt]:[]
  }).sort((a,b)=>conditions.indexOf(a.condition)-conditions.indexOf(b.condition)||a.phase-b.phase||a.attempt-b.attempt)
}
export function freeze(root:string){
  mkdirSync(root,{recursive:true})
  const sources=['environment.ts','public.ts','experiment.ts'].map(name=>({name,sha256:createHash('sha256').update(readFileSync(join('src/discrete/blind',name))).digest('hex')}))
  const manifest={version:1,model:'gpt-5.6-sol',spec,walls,phases,conditions,attemptLimits:Object.fromEntries(conditions.map(c=>[c,maxAttempts(c)])),sources}
  const path=join(root,'manifest.json'),fingerprint=createHash('sha256').update(JSON.stringify(manifest)).digest('hex')
  if(existsSync(path)&&JSON.parse(readFileSync(path,'utf8')).fingerprint!==fingerprint)throw Error('Frozen experiment differs; use a fresh output directory')
  save(path,{...manifest,fingerprint})
}
