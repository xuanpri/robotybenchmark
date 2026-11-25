import {readFileSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
import {save} from '../dynamics/preflight'
import {danger,move,cycle,advance,same,type Robot} from '../dynamics/world'
import type {Run} from './memory'
export const source='src/discrete/artifacts/phase2-v2'
export function original():Run[]{return readdirSync(source,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>JSON.parse(readFileSync(join(source,d.name,'run.json'),'utf8')))}
const key=(z:number,h:string)=>z+','+h
const robot=(k:string)=>{const [z,h]=k.split(',');return {pos:[5,Number(z)],heading:h,pauseRemaining:0,cooldown:0,altNext:0,stutterRemaining:0} as Robot}
export function transitions(k:string){const r=robot(k),z=r.pos[1],ds=[...(z>0?[-1]:[]),...(z<5?[1]:[]),0];return ds.map(d=>({key:key(z+d,d===0?r.heading:d>0?'S':'N'),p:1/ds.length}))}
export function local(root:string){
 const all=original(),scores:any[]=[]
 for(const run of all.filter(r=>r.mode==='pure_random')){
  let belief=new Map<string,number>()
  for(const row of run.steps){
   if(row.input.robot)belief=new Map([[key(row.input.robot.pos[1],row.input.robot.heading),1]])
   if(!belief.size)throw Error('empty belief')
   const edges:any[]=[],next=new Map<string,number>()
   for(const [k,p] of belief)for(const tr of transitions(k)){const mass=p*tr.p;next.set(tr.key,(next.get(tr.key)??0)+mass);edges.push({from:k,to:tr.key,mass})}
   const max=Math.max(...next.values()),maps=[...next].filter(([,p])=>Math.abs(p-max)<1e-12).map(([k])=>k).sort()
   scores.push({id:run.id,tick:row.before.tick,visible:row.visible,age:row.ticks_since_last_seen,ceiling:max,llmCorrect:row.predictionCorrect,llmExpected:row.decision!.predicted_next.pos[0]===5?(next.get(key(row.decision!.predicted_next.pos[1],row.decision!.predicted_next.heading))??0):0,mapRealized:maps[0]===key(row.after.robot.pos[1],row.after.robot.heading),belief:Object.fromEntries(belief)})
   const posterior=new Map<string,number>()
   for(const e of edges){const r=robot(e.to),before={...row.before,robot:robot(e.from)},player=move(before.player,row.decision!.action);let out=danger(before,player,r);if(out==='running')out=same(player,[8,3])?'success':before.tick+1>=30?'timeout':'running'
    if(out!==row.output.outcome)continue
    if(row.output.robot&&e.to!==key(row.output.robot.pos[1],row.output.robot.heading))continue
    posterior.set(e.to,(posterior.get(e.to)??0)+e.mass)
   }
   const sum=[...posterior.values()].reduce((a,b)=>a+b,0);if(!sum)throw Error('zero posterior');belief=new Map([...posterior].map(([k,p])=>[k,p/sum]))
  }
 }
 const aggregate=(rows:any[])=>({n:rows.length,bayesExpectedMAP:rows.reduce((n,r)=>n+r.ceiling,0)/rows.length,llmAccuracy:rows.filter(r=>r.llmCorrect).length/rows.length,llmExpectedUnderFilter:rows.reduce((n,r)=>n+r.llmExpected,0)/rows.length,realizedTieBrokenMAP:rows.filter(r=>r.mapRealized).length/rows.length})
 const bayes={method:'Exact 12-state forward filter; condition only on legal sightings, own actions and survival/failure outcomes. Previous attempts are independent. Ceiling is mean max predictive posterior, not realized MAP success; ties broken lexicographically for realized score.',visible:aggregate(scores.filter(r=>r.visible)),occluded:aggregate(scores.filter(r=>!r.visible)),age:Object.fromEntries(['1','2','3','4+'].map(k=>[k,aggregate(scores.filter(r=>!r.visible&&(k==='4+'?r.age>=4:r.age===Number(k))))])),steps:scores}
 save(join(root,'bayes-ceiling.json'),bayes)
 const stale:any[]=[]
 for(const run of all.filter(r=>['parametric_shift','pattern_shift'].includes(r.mode)&&r.attempt>=2&&r.condition!=='Omniscient')){
  const prev=all.find(r=>r.mode===run.mode&&r.seed===run.seed&&r.condition===run.condition&&r.attempt===run.attempt-1)!
  for(const row of run.steps.filter(r=>r.predictionCorrect===false)){
   const pred=row.decision!.predicted_next,old=prev.instance.params!,states=cycle(old).filter(r=>same(r.pos,row.before.robot.pos)&&r.heading===row.before.robot.heading),possible=states.map(r=>advance(r,old))
   const applicable=row.before.robot.pos[1]>=old.min&&row.before.robot.pos[1]<=old.max,trans=applicable?advance(row.before.robot,old):null
   stale.push({id:run.id,mode:run.mode,condition:run.condition,seed:run.seed,attempt:run.attempt,tick:row.before.tick,predicted:pred,truth:row.after.robot,reason:row.decision!.reason,fatal:row.after.outcome!=='running'&&row.after.outcome!=='success',matches_prev_attempt_rule:trans&&trans.pos[1]>=old.min&&trans.pos[1]<=old.max?same(trans.pos,pred.pos)&&trans.heading===pred.heading:null,previousRuleCompatibleLatentSupport:possible.some(r=>same(r.pos,pred.pos)&&r.heading===pred.heading),compatibleLatentStates:states.length,matchesPreviousElapsedTrajectory:same(prev.instance.robots[row.after.tick].pos,pred.pos)&&prev.instance.robots[row.after.tick].heading===pred.heading})
  }
 }
 save(join(root,'stale-rule-audit.json'),{definition:'Primary: apply previous parameters to actual current full internal state; outside previous range is null. This is an oracle-assisted counterfactual diagnostic, not evidence the model knew internal state. Also report marginal support over compatible old latent phases and same-elapsed-tick old trajectory. Matching is association, not proof of reliance.',wrongSteps:stale.length,applicable:stale.filter(r=>r.matches_prev_attempt_rule!==null).length,matches:stale.filter(r=>r.matches_prev_attempt_rule).length,rows:stale})
 save(join(root,'seed105-reasons.json'),all.filter(r=>r.mode==='parametric_shift'&&r.seed===105).map(r=>({id:r.id,attempt:r.attempt,condition:r.condition,outcome:r.outcome,steps:r.steps.map(s=>({tick:s.before.tick,action:s.decision?.action,reason:s.decision?.reason,correct:s.predictionCorrect,explicitPriorReference:/previous|prior|last attempt|earlier|before|上一|上次/i.test(s.decision?.reason??'')}))})))
 const old=JSON.parse(readFileSync(join(source,'summary.json'),'utf8'))
 save(join(root,'attribution-corrected.json'),{label:'Immediate Counterfactual Attribution',scope:'Only immediate fatal step; does not rule out earlier risk-management errors.',rows:old.groups.map((g:any)=>({mode:g.mode,condition:g.condition,...g.failures,...(g.mode==='pure_random'?{'Prediction Error':0,'Stochastic Realization Error':g.failures['Prediction Error']}:{'Stochastic Realization Error':0})}))})
 return bayes
}
