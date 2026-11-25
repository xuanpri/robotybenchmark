import {mkdirSync,readFileSync,existsSync,readdirSync,writeFileSync} from 'node:fs'
import {join,relative} from 'node:path'
import {initial,step,same,type State} from '../blind/environment'
import {save} from '../dynamics/preflight'
import {renderer,imageObservation,type Condition} from './render-agent-view'
import {textMessages,compact,parse,perception,attribute,type Decision} from './protocol'
import {ask,ledger,BudgetStop} from './vision-provider'
export const phases=[0,1,2,4] as const
export const conditions:Condition[]=['Omniscient-Vision','Partial-known-Vision']
export type Row={before:State;after:State;frame:string;visible:boolean;age:number;decision?:Decision;perception?:ReturnType<typeof perception>;predictionCorrect?:boolean;formatError?:string;answer:Awaited<ReturnType<typeof ask>>}
export type Episode={id:string;condition:Condition;phase:number;states:State[];steps:Row[];outcome:string;category?:string;interruption?:string}
export function load(root:string):Episode[]{return readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory()).flatMap(d=>{const f=join(root,d.name,'run.json');return existsSync(f)?[JSON.parse(readFileSync(f,'utf8'))]:[]})}
export async function runAll(root:string,budget:number){
 const render=await renderer()
 try{for(const c of conditions)for(const phase of phases){
  const id=c.toLowerCase()+'-phase-'+phase,dir=join(root,id),file=join(dir,'run.json');mkdirSync(join(dir,'frames'),{recursive:true})
  const run:Episode={id,condition:c,phase,states:[initial(phase)],steps:[],outcome:'running'};let history:string[]=[],lastSeen=0,lastSightingCorrect=true
  const persist=()=>{save(file,run);report(root)};persist()
  while(run.outcome==='running'){
   const before=run.states.at(-1)!,visible=imageObservation(before,c).robot!==null;if(visible)lastSeen=before.tick
   const frame=join(dir,'frames','tick-'+String(before.tick).padStart(2,'0')+'.png');writeFileSync(frame,await render.png(before,c))
   let answer
   try{answer=await ask(root,dir,'tick-'+String(before.tick).padStart(2,'0'),textMessages(c,before.tick,history),frame,budget)}catch(e){run.interruption=(e as Error).message;persist();throw e}
   let decision:Decision|undefined,formatError:string|undefined
   try{decision=parse(answer.content)}catch(e){formatError=(e as Error).message}
   const after:State=decision?step(before,decision.action):{...before,outcome:'format'},p=decision?perception(before,c,decision):undefined
   if(visible&&p)lastSightingCorrect=p.all
   run.steps.push({before,after,frame:relative(root,frame),visible,age:before.tick-lastSeen,decision,perception:p,formatError,answer,...(decision?{predictionCorrect:same(decision.predicted_next.pos,after.robot.pos)&&decision.predicted_next.heading===after.robot.heading}:{})});run.states.push(after);run.outcome=after.outcome
   if(decision)history.push(compact(before.tick,decision))
   if(!['success','running'].includes(after.outcome))run.category=attribute(before,after,c,decision,lastSightingCorrect)
   persist();console.log(c,phase,before.tick,decision?.action??'FORMAT',after.outcome,ledger(root).costRMB.toFixed(4))
  }
 }}finally{await render.close()}
}
const acc=(a:boolean[])=>({correct:a.filter(Boolean).length,total:a.length,accuracy:a.length?a.filter(Boolean).length/a.length:null})
export function report(root:string){
 const runs=load(root),groups=conditions.map(c=>{
  const group=runs.filter(r=>r.condition===c),rows=group.flatMap(r=>r.steps),old=c==='Omniscient-Vision'?'Omniscient':'Partial-known'
  const text=phases.map(phase=>JSON.parse(readFileSync(join('src/discrete/artifacts/phase2-v1',old.toLowerCase()+'-phase-'+phase+'-attempt-1','run.json'),'utf8')))
  const oldrows=text.flatMap(r=>r.steps),cost=oldrows.reduce((n,r)=>n+Number(String(r.usage?.cost??'0').replace(/[^0-9.]/g,'')),0)
  const categories=['Format Error','Perception Error (Immediate)','Perception Error (Upstream Sighting)','Prediction Error','Action/Planning Error']
  return {condition:c,completed:group.filter(r=>r.outcome!=='running').length,success:group.filter(r=>r.outcome==='success').length,total:4,
   perception:{player:acc(rows.filter(r=>r.perception).map(r=>r.perception!.player)),robotVisible:acc(rows.filter(r=>r.perception).map(r=>r.perception!.visible)),visibleRobotJoint:acc(rows.filter(r=>r.visible&&r.perception).map(r=>r.perception!.robot===true))},
   prediction:{visible:acc(rows.filter(r=>r.visible&&r.predictionCorrect!==undefined).map(r=>r.predictionCorrect!)),occluded:acc(rows.filter(r=>!r.visible&&r.predictionCorrect!==undefined).map(r=>r.predictionCorrect!)),age:Object.fromEntries(['1','2','3','4+'].map(k=>[k,acc(rows.filter(r=>!r.visible&&r.predictionCorrect!==undefined&&(k==='4+'?r.age>=4:r.age===Number(k))).map(r=>r.predictionCorrect!))]))},
   attribution:Object.fromEntries(categories.map(k=>[k,group.filter(r=>r.category===k).length])),fourClasses:{format:group.filter(r=>r.category==='Format Error').length,perception:group.filter(r=>r.category?.startsWith('Perception Error')).length,prediction:group.filter(r=>r.category==='Prediction Error').length,planning:group.filter(r=>r.category==='Action/Planning Error').length},
   textBaseline:{success:text.filter(r=>r.outcome==='success').length,total:4,perception:'N/A: structured truth input; no perception task',visiblePrediction:acc(oldrows.filter(r=>r.visible&&r.predictionCorrect!==undefined).map(r=>r.predictionCorrect)),occludedPrediction:acc(oldrows.filter(r=>!r.visible&&r.predictionCorrect!==undefined).map(r=>r.predictionCorrect)),requests:oldrows.length,costRMB:cost,failures:0},requests:rows.length,costRMB:rows.reduce((n,r)=>n+Number(String(r.answer.usage.cost??'0').replace(/[^0-9.]/g,'')),0)}
 })
 const errors=runs.flatMap(r=>r.steps.filter(s=>s.perception&&!s.perception.all).map(s=>({episode:r.id,tick:s.before.tick,frame:s.frame,perceived:s.decision!.perceived_current,actualPublicObservation:imageObservation(s.before,r.condition),metrics:s.perception})))
 const results={complete:groups.every(g=>g.completed===4),groups,ledger:ledger(root),failures:runs.filter(r=>r.category).map(r=>({id:r.id,outcome:r.outcome,category:r.category,frame:r.steps.at(-1)?.frame})),perceptionErrors:errors,interruptions:runs.filter(r=>r.interruption).map(r=>({id:r.id,reason:r.interruption})),unstarted:conditions.flatMap(c=>phases.filter(p=>!runs.some(r=>r.condition===c&&r.phase===p)).map(p=>({condition:c,phase:p}))),method:'Same period-8 phase2-v1 environment, user-confirmed correction from requested period14. Immediate attribution only; does not exclude earlier risk-management errors. Hidden images omit robot AND vision. Current images alone supplied, text memory only model-owned outputs.'}
 save(join(root,'summary.json'),results)
 const fmt=(x:ReturnType<typeof acc>)=>x.total?`${x.correct}/${x.total} (${(x.accuracy!*100).toFixed(1)}%)`:'N/A'
 let md=`# Phase 2.3 — visual input ablation\n\nStatus: ${results.complete?'COMPLETE':'INCOMPLETE'}. ${results.method}\n\n| Condition | Input | Pass | Player perception | Visible flag | Visible robot joint | Visible prediction | Occluded prediction | Requests | RMB |\n|---|---|---|---|---|---|---|---|---|---|\n`
 for(const g of groups){const b=g.textBaseline;md+=`| ${g.condition} | Text baseline | ${b.success}/4 | N/A | N/A | N/A | ${fmt(b.visiblePrediction)} | ${fmt(b.occludedPrediction)} | ${b.requests} | ${b.costRMB.toFixed(6)} |\n| ${g.condition} | Current PNG + own history | ${g.success}/4 (${g.completed}/4 completed) | ${fmt(g.perception.player)} | ${fmt(g.perception.robotVisible)} | ${fmt(g.perception.visibleRobotJoint)} | ${fmt(g.prediction.visible)} | ${fmt(g.prediction.occluded)} | ${g.requests} | ${g.costRMB.toFixed(6)} |\n`}
 md+=`\nVision total actual RMB: ${results.ledger.costRMB.toFixed(6)}. Text baseline RMB by condition: ${groups.map(g=>g.condition+' '+g.textBaseline.costRMB.toFixed(6)).join('; ')}. No new text-baseline calls. Incomplete/budget interruptions are not model failures.\n\n## Prediction by hidden age\n\n| Condition | Age1 | Age2 | Age3 | Age4+ |\n|---|---|---|---|---|\n`
 for(const g of groups)md+=`| ${g.condition} | ${['1','2','3','4+'].map(k=>fmt(g.prediction.age[k])).join(' | ')} |\n`
 md+='\n## Immediate attribution (five subtypes / four classes)\n\n'
 for(const g of groups)md+=`- ${g.condition}: ${JSON.stringify(g.attribution)}; four classes ${JSON.stringify(g.fourClasses)}.\n`
 md+='\n## Failed episodes\n\n'+(results.failures.map(f=>`- ${f.id}: ${f.category} (${f.outcome}). [fatal input frame](${f.frame})`).join('\n')||'None.')
 md+='\n\n## Perception error ticks\n\n'+(errors.map(e=>`- ${e.episode} tick ${e.tick}: ${JSON.stringify(e.perceived)}, player=${e.metrics!.player}, visibility=${e.metrics!.visible}, visible robot=${e.metrics!.robot}. [frame](${e.frame})`).join('\n')||'None.')
 md+='\n\nPerception denominators exclude schema-invalid responses, which are separate Format Errors. Joint prediction requires both position and heading. Input visibility determines prediction strata; age resets at each actual legal sighting. Budget threshold is maxBudget minus 0.50 RMB; one already-dispatched call may consume part of this reserve. Static patrol rules and static GOAL coordinates are allowed; no live truth coordinates appear in request text.\n'
 writeFileSync(join(root,'REPORT.md'),md);return results
}
