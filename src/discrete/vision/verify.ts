import assert from 'node:assert/strict'
import {readFileSync,existsSync,readdirSync} from 'node:fs'
import {join,relative,resolve} from 'node:path'
import {spawnSync} from 'node:child_process'
import {load,report} from './experiment'
import {renderer,imageObservation} from './render-agent-view'
import {parse,textMessages,compact,perception,attribute} from './protocol'
import {sha,ledger} from './vision-provider'
import {initial,step,same,type State} from '../blind/environment'
import {save} from '../dynamics/preflight'
const root='src/discrete/artifacts/vision-ablation',runs=load(root),render=await renderer()
let count=0;const responseIDs:string[]=[]
try{for(const run of runs){
 assert.deepEqual(run.states[0],initial(run.phase));assert.equal(run.states.length,run.steps.length+1)
 const history:string[]=[];let seen=0,lastCorrect=true
 for(const [i,row] of run.steps.entries()){
  assert.deepEqual(row.before,run.states[i]);assert.deepEqual(row.after,run.states[i+1]);const visible=imageObservation(row.before,run.condition).robot!==null
  if(visible)seen=row.before.tick
  assert.equal(row.visible,visible);assert.equal(row.age,row.before.tick-seen)
  const frame=join(root,row.frame),bytes=readFileSync(frame);assert.equal(bytes.readUInt32BE(16),640);assert.equal(bytes.readUInt32BE(20),384)
  assert.equal(sha(bytes),sha(await render.png(row.before,run.condition)))
  const wire=JSON.parse(readFileSync(join(root,row.answer.wire),'utf8')),text=textMessages(run.condition,row.before.tick,history),dir=join(root,run.id)
  assert.equal(wire.image.sha256,sha(bytes));assert.equal(resolve(dir,wire.image.path),resolve(frame));assert.equal(wire.body.model,'gpt-5.6-sol')
  const expected={model:'gpt-5.6-sol',messages:[text[0],{role:'user',content:[{type:'text',text:text[1].content},{type:'image_url',image_url:{url:'artifact:'+relative(dir,frame),sha256:sha(bytes)}}]}]}
  assert.deepEqual(wire.body,expected);assert.equal(wire.hash,sha(JSON.stringify(expected)))
  const actual={model:'gpt-5.6-sol',messages:[text[0],{role:'user',content:[{type:'text',text:text[1].content},{type:'image_url',image_url:{url:'data:image/png;base64,'+bytes.toString('base64')}}]}]}
  assert.equal(sha(JSON.stringify(actual)),wire.payloadSHA256)
  const envelope=JSON.parse(wire.raw);assert.equal(envelope.choices[0].message.content,row.answer.content);responseIDs.push(envelope.id)
  assert.ok(!JSON.stringify(wire.body).includes('data:image/png;base64'))
  if(row.decision){assert.deepEqual(parse(row.answer.content),row.decision);assert.deepEqual(row.after,step(row.before,row.decision.action));const p=perception(row.before,run.condition,row.decision);assert.deepEqual(p,row.perception);if(visible)lastCorrect=p.all;assert.equal(row.predictionCorrect,same(row.decision.predicted_next.pos,row.after.robot.pos)&&row.decision.predicted_next.heading===row.after.robot.heading);history.push(compact(row.before.tick,row.decision))}
  else{assert.throws(()=>parse(row.answer.content));assert.equal(row.after.outcome,'format')}
  if(i===run.steps.length-1&&run.category)assert.equal(run.category,attribute(row.before,row.after,run.condition,row.decision,lastCorrect))
  count++
 }
}}
finally{await render.close()}
const baseline=JSON.parse(readFileSync(join(root,'protected-before.json'),'utf8')),changed=Object.keys(baseline).filter(f=>!existsSync(f)||sha(readFileSync(f))!==baseline[f]);assert.deepEqual(changed,[])
save(join(root,'protected-audit.json'),{passed:true,files:Object.keys(baseline).length,changed})
for(const s of JSON.parse(readFileSync(join(root,'manifest.json'),'utf8')).sources)assert.equal(sha(readFileSync(join('src/discrete/vision',s.file))),s.sha256)
const compile=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--noEmit'],{encoding:'utf8'});assert.equal(compile.status,0,compile.stdout+compile.stderr)
const regression=readFileSync(join(root,'regression-tests.txt'),'utf8');assert.ok(regression.includes('tests 70')&&regression.includes('fail 0'))
const tests=JSON.parse(readFileSync(join(root,'unit-tests.json'),'utf8'));assert.equal(tests.status,0);assert.ok(tests.stdout.includes('tests 4')&&tests.stdout.includes('fail 0'))
const images=spawnSync('/home/jiaxuanren/miniconda3/envs/opsd/bin/python',['-c',`import pathlib,cv2,numpy as np
for p in pathlib.Path('${root}').glob('**/*.png'):
 im=cv2.imread(str(p));assert im is not None and im.shape==(384,640,3);assert len(np.unique(im.reshape(-1,3),axis=0))>20
`],{encoding:'utf8'});assert.equal(images.status,0,images.stderr)
const summary=report(root),cost=ledger(root);assert.ok(cost.costRMB<12);assert.equal(count,cost.physicalRequests)
save(join(root,'verification.json'),{passed:true,complete:summary.complete,episodes:runs.length,requests:count,uniqueResponseIDs:new Set(responseIDs).size,imagePayloadsPerRequest:1,allPNG640x384:true,allPNGsRerenderMatch:true,wireHasNoBase64:true,payloadHashesReconstructed:true,onlyModelOwnedTextHistory:true,protectedFiles:Object.keys(baseline).length,totalTests:74,typescript:'passed',costRMB:cost.costRMB})
console.log(JSON.stringify({verified:count,cost:cost.costRMB,complete:summary.complete}))
