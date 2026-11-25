import assert from 'node:assert/strict'
import {readdirSync,readFileSync,existsSync} from 'node:fs'
import {join} from 'node:path'
import {LearningWorld,type PublicTurn} from '../src/learning/protocol'
import {type Replay} from '../src/video/replay'
import {digest} from '../src/study/provider'
import type {Job,Lesson} from '../src/study/learn'
const root='results/layout-transfer-1'
const load=(f:string)=>JSON.parse(readFileSync(f,'utf8'))
for(const sub of readdirSync(root)){
 const dir=join(root,sub)
 if(!existsSync(join(dir,'replay.json')))continue
 const replay=load(join(dir,'replay.json')) as Replay
 const {job}:{job:Job}=load(join(dir,'metadata.json'))
 const memory=structuredClone(job.initial)
 if(job.arm==='transfer')assert.deepEqual(memory,load(join(root,'A-N'+job.cfg.robotCount+'-G3-source','success-memory.json')))
 else assert.deepEqual(memory,[])
 for(const film of replay.attempts){
  const trial=load(join(dir,'attempt-'+film.attempt+'.json'))
  const turns=trial.turns as PublicTurn[],world=new LearningWorld()
  world.reset(film.seed,film.config)
  let idx=0
  function frame(){
   assert.deepEqual(world.sample(),film.frames[idx]);assert.deepEqual(world.get_private_evaluation(),trial.truth[idx]);idx++
  }
  function request(name:string){
    const base=join(dir,'wire',film.attempt+'-'+name)
    const r=load(base+(existsSync(base+'-1.json')?'-1':'-0')+'.json')
    assert.equal(r.hash,digest(r.body));assert.equal(r.status,200)
    const data=JSON.parse(r.raw),input=JSON.parse(r.body.messages[1].content)
    assert.deepEqual(input.memory,memory);assert.deepEqual(input.map,job.cfg.room)
    assert.deepEqual(input.current,world.observe());assert.equal(input.attempt,film.attempt)
    assert.deepEqual(Object.keys(input).sort(),['map','goal','current','hp','attempt','remaining','legal','durations','history','memory',...(name==='reflect'?['outcome']:[])].sort())
    return {input,answer:JSON.parse(data.choices[0].message.content)}
  }
  frame()
  for(const [i,turn] of turns.entries()){
   const {input,answer}=request('act-'+(i+1))
   assert.deepEqual(input.history,turns.slice(Math.max(0,i-4),i))
   assert.deepEqual(answer,turn.choice);assert.deepEqual(turn.before,world.observe())
   world.step(turn.choice!,frame);assert.deepEqual(turn.after,world.observe())
  }
  assert.equal(idx,film.frames.length)
  if(trial.lesson){const {input,answer}=request('reflect');assert.deepEqual(input.history,turns);assert.deepEqual(answer,trial.lesson.summary);memory.push(trial.lesson as Lesson)}
 }
 console.log(sub,'confirmed',replay.attempts.length,'replayed attempt(s) and all associated prompt projections')
}
