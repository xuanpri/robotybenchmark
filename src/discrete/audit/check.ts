import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {join} from 'node:path'
import {loadRuns,memoryOffMessages} from './memory'
import {instance,initial,step,same} from '../dynamics/world'
import {save} from '../dynamics/preflight'
const root='src/discrete/artifacts/phase2-v2b';let requests=0
for(const r of loadRuns(root)){
 const world=instance('identical_loop',r.seed,r.attempt);assert.deepEqual(r.states[0],initial(world))
 for(const [i,row] of r.steps.entries()){
  const active={attempt:1,observations:r.public.observations.slice(0,i+1),decisions:r.public.decisions.slice(0,i),failureReason:null}
  const receipts=[0,1].map(n=>join(root,r.id,'wire',row.wireName+'-'+n+'.json')).filter(existsSync).map(p=>JSON.parse(readFileSync(p,'utf8'))),wire=receipts.find(r=>r.status===200)
  assert.ok(wire);assert.deepEqual(wire.body.messages,memoryOffMessages(row.input,active,world,row.before))
  if(row.decision){assert.deepEqual(row.after,step(row.before,row.decision.action,world));assert.equal(row.predictionCorrect,same(row.decision.predicted_next.pos,row.after.robot.pos)&&row.decision.predicted_next.heading===row.after.robot.heading)}
  requests++
 }
}
save(join(root,'request-reconstruction.json'),{passed:true,requests,independentSeedAttemptPaths:true,emptyCrossAttemptHistory:true,fixedPromptAttempt:1,worldReplay:true});console.log('Verified',requests,'requests')
