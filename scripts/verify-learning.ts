import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import assert from 'node:assert/strict'
import {LearningWorld} from '../src/learning/protocol'
import type {Replay} from '../src/video/replay'
import type {Choice} from '../src/learning/protocol'
const dir=process.argv[2],r:Replay=JSON.parse(readFileSync(join(dir,'replay.json'),'utf8'))
const lines=(name:string)=>readFileSync(join(dir,name+'.jsonl'),'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l))
const acts=lines('actions'),truth=lines('private_ground_truth')
for(const a of r.attempts){
  const w=new LearningWorld();w.reset(a.seed,a.config)
  const states=truth.filter(t=>t.id===a.id)
  let i=0
  function check(){
    const {id,...record}=states[i]
    assert.deepEqual(w.get_private_evaluation(),record);assert.deepEqual(w.sample(),a.frames[i]);i++
  }
  check()
  for(const d of acts.filter(d=>d.id===a.id)){
    assert.equal(w.observe().time,d.start);w.step(d as Choice,check)
    assert.equal(w.observe().time,d.end);assert.equal(w.observe().outcome,d.feedback)
  }
  assert.equal(i,states.length);assert.equal(i,a.frames.length)
  if(w.observe().outcome!=='active')assert.equal(w.observe().outcome,a.result)
}
console.log('Verified '+r.attempts.length+' attempts, '+acts.length+' decisions and '+truth.length+' synchronized samples.')
