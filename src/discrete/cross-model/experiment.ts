import {mkdirSync,readFileSync,existsSync,readdirSync,writeFileSync,copyFileSync} from 'node:fs'
import {join,relative} from 'node:path'
import * as D from '../dynamics/world'
import * as DP from '../dynamics/protocol'
import {attribute as textAttribute} from '../dynamics/experiment'
import * as V from '../vision/protocol'
import * as W from '../blind/environment'
import {renderer,imageObservation} from '../vision/render-agent-view'
import {ask,strip,spending,BudgetStop,sha} from './provider'
import {save} from '../dynamics/preflight'
export type Run=any
export const slug=(id:string)=>id.replace(/[^a-zA-Z0-9-]/g,'-')+'-'+sha(id).slice(0,8)
export async function preflight(root:string,model:string,budget:number){
 const mr=join(root,slug(model));mkdirSync(mr,{recursive:true});const i=D.instance('identical_loop',101,1),s=D.initial(i),obs=DP.observe(s,'Partial-unknown-passive'),active={attempt:1,observations:[obs],decisions:[],failureReason:null}
 const a=await ask(mr,join(mr,'preflight-text'),'sample',model,DP.messages('Partial-unknown-passive',1,obs,[],active,i,s),budget)
 DP.parse(a.content,'Partial-unknown-passive')
 const dir=join(mr,'preflight-vision');mkdirSync(dir,{recursive:true});const frame=join(dir,'partial-window-visible.png');copyFileSync('src/discrete/artifacts/vision-ablation/preview/partial-window-visible.png',frame)
 const b=await ask(mr,dir,'sample',model,V.textMessages('Partial-known-Vision',0,[]),budget,frame)
 const decision=V.parse(b.content),perception=V.perception(W.initial(1),'Partial-known-Vision',decision)
 if(!perception.all)throw Error('preflight_image_perception_failed')
 const result={passed:true,model,returnedModels:[a.model,b.model],textSchema:true,visionSchema:true,visionPerception:perception,cost:spending(mr)};save(join(mr,'preflight.json'),result);return result
}
export async function textEpisode(root:string,model:string,slice:'A'|'B',seed:number,n:number,history:any[],budget:number,onStep:()=>void){
 const mode=slice==='A'?'identical_loop':'parametric_shift',c=slice==='A'?'Partial-unknown-passive':'Partial-unknown-interactive',i=D.instance(mode,seed,n),start=D.initial(i),id=`${slice}-seed-${seed}-attempt-${n}`,mr=join(root,slug(model)),dir=join(mr,id)
 mkdirSync(dir,{recursive:true});const file=join(dir,'run.json');if(existsSync(file)){const old=JSON.parse(readFileSync(file,'utf8'));if(old.outcome!=='running')return old}
 const run:any={id,slice,model,seed,attempt:n,mode,condition:c,instance:i,states:[start],steps:[],outcome:'running',public:{attempt:n,observations:[DP.observe(start,c)],decisions:[],failureReason:null}};let seen=0
 const persist=()=>{save(file,run);onStep()};persist()
 while(run.outcome==='running'){
  const before=run.states.at(-1),input=run.public.observations.at(-1);if(input.robot)seen=before.tick
  let answer;try{answer=await ask(mr,dir,'tick-'+String(before.tick).padStart(2,'0'),model,DP.messages(c,n,input,history,run.public,i,before),budget)}catch(e){run.interruption=(e as Error).message;persist();throw e}
  let decision:any,formatError;try{decision=DP.parse(answer.content,c)}catch(e){formatError=(e as Error).message}
  const after=decision?D.step(before,decision.action,i):{...before,outcome:'format'},output=DP.observe(after,c,decision?.action==='PEEK')
  run.steps.push({before,after,input,output,decision,answer,formatError,visible:input.robot!==null,ticks_since_last_seen:before.tick-seen,...(decision?{predictionCorrect:D.same(decision.predicted_next.pos,after.robot.pos)&&decision.predicted_next.heading===after.robot.heading}:{})});run.states.push(after);run.public.observations.push(output);if(decision)run.public.decisions.push(decision);run.outcome=after.outcome
  if(!['running','success'].includes(after.outcome)){run.attribution=textAttribute(before,after,decision);run.category=run.attribution?.category;run.public.failureReason=after.outcome}
  persist();console.log(model,slice,seed,n,before.tick,decision?.action??'FORMAT',run.outcome,spending(mr).actualRMB.toFixed(4))
 }
 save(join(dir,'public-history.json'),run.public);return run
}
export async function visionEpisode(root:string,model:string,phase:number,budget:number,render:Awaited<ReturnType<typeof renderer>>,onStep:()=>void){
 const id='C-phase-'+phase,mr=join(root,slug(model)),dir=join(mr,id),file=join(dir,'run.json');mkdirSync(join(dir,'frames'),{recursive:true})
 if(existsSync(file)){const old=JSON.parse(readFileSync(file,'utf8'));if(old.outcome!=='running')return old}
 const run:any={id,slice:'C',model,phase,attempt:1,condition:'Partial-known-Vision',states:[W.initial(phase)],steps:[],outcome:'running',public:{own_history:[]}};const history:string[]=[];let seen=0,last=true
 const persist=()=>{save(file,run);onStep()};persist()
 while(run.outcome==='running'){
  const before=run.states.at(-1),visible=imageObservation(before,'Partial-known-Vision').robot!==null;if(visible)seen=before.tick
  const frame=join(dir,'frames','tick-'+String(before.tick).padStart(2,'0')+'.png');writeFileSync(frame,await render.png(before,'Partial-known-Vision'))
  let answer;try{answer=await ask(mr,dir,'tick-'+String(before.tick).padStart(2,'0'),model,V.textMessages('Partial-known-Vision',before.tick,history),budget,frame)}catch(e){run.interruption=(e as Error).message;persist();throw e}
  let decision:any,formatError;try{decision=V.parse(answer.content)}catch(e){formatError=(e as Error).message}
  const after=decision?W.step(before,decision.action):{...before,outcome:'format'},p=decision?V.perception(before,'Partial-known-Vision',decision):undefined;if(visible&&p)last=p.all
  run.steps.push({before,after,decision,answer,formatError,visible,age:before.tick-seen,frame:relative(mr,frame),perception:p,...(decision?{predictionCorrect:W.same(decision.predicted_next.pos,after.robot.pos)&&decision.predicted_next.heading===after.robot.heading}:{})});run.states.push(after);run.outcome=after.outcome;if(decision)history.push(V.compact(before.tick,decision));run.public.own_history=[...history]
  if(!['running','success'].includes(after.outcome))run.category=V.attribute(before,after,'Partial-known-Vision',decision,last)
  persist();console.log(model,'C',phase,before.tick,decision?.action??'FORMAT',run.outcome,spending(mr).actualRMB.toFixed(4))
 }
 save(join(dir,'public-history.json'),run.public);return run
}
export function load(root:string):any[]{if(!existsSync(root))return [];return readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()).flatMap(m=>readdirSync(join(root,m.name),{withFileTypes:true}).filter(d=>d.isDirectory()&&/^[ABC]-/.test(d.name)).flatMap(d=>{const p=join(root,m.name,d.name,'run.json');return existsSync(p)?[JSON.parse(readFileSync(p,'utf8'))]:[]}))}
