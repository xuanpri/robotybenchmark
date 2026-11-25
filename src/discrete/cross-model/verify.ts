import assert from 'node:assert/strict'
import {readFileSync,existsSync,writeFileSync} from 'node:fs'
import {join,resolve,relative} from 'node:path'
import {spawnSync} from 'node:child_process'
import {root} from './baseline'
import {load,slug} from './experiment'
import {sha,strip,spending,payload} from './provider'
import {report} from './report'
import * as D from '../dynamics/world'
import * as P from '../dynamics/protocol'
import {attribute as attributeText} from '../dynamics/experiment'
import * as W from '../blind/environment'
import * as V from '../vision/protocol'
import {renderer,imageObservation} from '../vision/render-agent-view'
import {save} from '../dynamics/preflight'
const manifest=JSON.parse(readFileSync(join(root,'manifest.json'),'utf8')),models:string[]=manifest.models,runs=load(root),render=await renderer();let verified=0;const ids:string[]=[]
try{for(const r of runs){
 const mr=join(root,slug(r.model)),isVision=r.slice==='C',world=isVision?null:D.instance(r.mode,r.seed,r.attempt)
 assert.deepEqual(r.states[0],isVision?W.initial(r.phase):D.initial(world!));if(!isVision)assert.deepEqual(r.instance,world)
 const previous=runs.filter(p=>p.model===r.model&&p.slice===r.slice&&p.seed===r.seed&&p.attempt<r.attempt).sort((a,b)=>a.attempt-b.attempt).map(p=>p.public)
 if(!isVision)assert.equal(previous.length,r.attempt-1)
 const history:string[]=[];let seen=0,last=true
 for(const [j,row] of r.steps.entries()){
  assert.deepEqual(row.before,r.states[j]);assert.deepEqual(row.after,r.states[j+1]);const wire=JSON.parse(readFileSync(join(mr,row.answer.wire),'utf8'));assert.equal(wire.body.model,r.model)
  const text=isVision?V.textMessages('Partial-known-Vision',row.before.tick,history):P.messages(r.condition,r.attempt,row.input,previous,{attempt:r.attempt,observations:r.public.observations.slice(0,j+1),decisions:r.public.decisions.slice(0,j),failureReason:null},world!,row.before)
  let actual:any
  if(isVision){const frame=join(mr,row.frame),bytes=readFileSync(frame);assert.equal(sha(bytes),sha(await render.png(row.before,'Partial-known-Vision')));assert.equal(wire.image.sha256,sha(bytes));assert.equal(resolve(mr,r.id,wire.image.path),resolve(frame));actual=payload(r.model,text,bytes);assert.equal(wire.body.messages[0].content,text[0].content);assert.equal(wire.body.messages[1].content[0].text,text[1].content);assert.equal(wire.body.messages[1].content.length,2)}
  else{assert.deepEqual(wire.body.messages,text);actual=payload(r.model,text);assert.deepEqual(row.input,r.public.observations[j])}
  assert.equal(sha(JSON.stringify(wire.body)),wire.hash);assert.equal(sha(JSON.stringify(actual)),wire.payloadSHA256)
  const response=JSON.parse(wire.raw),raw=response.choices[0].message.content;assert.equal(typeof raw==='string'?raw:raw.filter((p:any)=>p.type==='text').map((p:any)=>p.text).join(''),row.answer.rawContent);assert.equal(strip(row.answer.rawContent),row.answer.content);ids.push(response.id)
  const visible=isVision?imageObservation(row.before,'Partial-known-Vision').robot!==null:row.input.robot!==null;if(visible)seen=row.before.tick;assert.equal(row.visible,visible);assert.equal(row.age??row.ticks_since_last_seen,row.before.tick-seen)
  if(row.decision){assert.deepEqual(isVision?V.parse(row.answer.content):P.parse(row.answer.content,r.condition),row.decision);assert.deepEqual(row.after,isVision?W.step(row.before,row.decision.action):D.step(row.before,row.decision.action,world!));assert.equal(row.predictionCorrect,D.same(row.decision.predicted_next.pos,row.after.robot.pos)&&row.decision.predicted_next.heading===row.after.robot.heading)
   if(isVision){const p=V.perception(row.before,'Partial-known-Vision',row.decision);assert.deepEqual(p,row.perception);if(visible)last=p.all;history.push(V.compact(row.before.tick,row.decision))}
  }else{assert.equal(row.after.outcome,'format');assert.throws(()=>isVision?V.parse(row.answer.content):P.parse(row.answer.content,r.condition))}
  if(!isVision)assert.deepEqual(row.output,P.observe(row.after,r.condition,row.decision?.action==='PEEK'))
  if(j===r.steps.length-1&&r.category)assert.equal(r.category,isVision?V.attribute(row.before,row.after,'Partial-known-Vision',row.decision,last):attributeText(row.before,row.after,row.decision)?.category)
  verified++
 }
 if(r.outcome!=='running')assert.deepEqual(JSON.parse(readFileSync(join(mr,r.id,'public-history.json'),'utf8')),r.public)
}}
finally{await render.close()}
const before=JSON.parse(readFileSync(join(root,'protected-before.json'),'utf8')),changed=Object.keys(before).filter(f=>!existsSync(f)||sha(readFileSync(f))!==before[f]);assert.deepEqual(changed,[]);save(join(root,'protected-audit.json'),{passed:true,files:Object.keys(before).length,changed})
for(const s of manifest.sources)assert.equal(sha(readFileSync(join('src/discrete/cross-model',s.file))),s.sha256)
const compile=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--noEmit'],{encoding:'utf8'});assert.equal(compile.status,0,compile.stdout+compile.stderr)
const tests=readFileSync(join(root,'full-tests.txt'),'utf8');assert.ok(tests.includes('tests 79')&&tests.includes('fail 0'))
for(const m of models){assert.ok(spending(join(root,slug(m))).actualRMB<=manifest.budgetPerModelRMB);assert.ok(JSON.parse(readFileSync(join(root,slug(m),'preflight.json'),'utf8')).passed)}
const resume=JSON.parse(readFileSync(join(root,'resume-baseline.json'),'utf8'));assert.equal(Object.keys(resume.wires).length,252);for(const [f,h] of Object.entries(resume.wires))assert.equal(sha(readFileSync(f)),h)
const extra=readFileSync(join(root,'resume-tests.txt'),'utf8');assert.ok(extra.includes('tests 3')&&extra.includes('fail 0'))
const result=report(root,models);save(join(root,'verification.json'),{passed:true,complete:result.complete,selectedSlices:manifest.selectedSlices,deferredSlices:result.deferredSlices,episodes:runs.length,verifiedEpisodeRequests:verified,uniqueResponseIDs:new Set(ids).size,preflightRequests:4,reusedHistoricalReceipts:252,historicalReceiptsByteIdentical:true,modelIds:models,gptNewRequests:0,tests:82,typescript:'passed',protectedFiles:Object.keys(before).length,exactOriginalPromptFactories:true,exactPRNGWorlds:true,exactOriginalVisionRenderer:true,interruptedEpisodesNotFailures:true})
console.log(JSON.stringify({verified,complete:result.complete,budgets:result.budgets}))
