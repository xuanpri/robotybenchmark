import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {LearningWorld,settings,variant} from '../src/learning/protocol'
import {runExperiment} from '../src/learning/runner'
import {defaults} from '../src/sim/config'
import {sampleAt,timeline,type Replay} from '../src/video/replay'
import {fitMemory} from '../src/learning/agents'
const dir=()=>mkdtempSync(join(tmpdir(),'arena-learning-'))
const json=(d:string,file:string)=>JSON.parse(readFileSync(join(d,file),'utf8'))
const lines=(d:string,name:string)=>readFileSync(join(d,name+'.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l))
test('long actions stop on the first terminal substep, identical to short controls',()=>{
 const a=new LearningWorld(),b=new LearningWorld(),cfg=defaults()
 a.reset(1,cfg);b.reset(1,cfg)
 for(let i=0;i<5&&a.observe().outcome==='active';i++)a.step({action:'MOVE_EAST',duration:1},()=>{})
 while(b.observe().outcome==='active')b.step({action:'MOVE_EAST',duration:.1},()=>{})
 assert.deepEqual(a.get_private_evaluation(),b.get_private_evaluation())
})
test('HP charged once, memory conditions isolated, public requests exclude private frames, stable resume',async()=>{
 for(const memory of ['M0','M1','M2'] as const){
  const d=dir(),s=settings({agent:'mock',memory,maxAttempts:2,memoryBudget:4096})
  const report=await runExperiment(d,s)
  assert.equal(report.firstSuccessAttempt,null);assert.deepEqual(report.attempts.map(a=>a.hp),[90,80])
  assert.deepEqual(report.attempts.map(a=>a.time),[report.attempts[0].time,report.attempts[0].time])
  const req=lines(d,'requests'),second=req.find(r=>r.id==='exploration-2/0001')
  assert.equal(second.body.history.length,0)
  if(memory==='M0')assert.deepEqual(second.body.memory,[])
  if(memory==='M1')assert.ok(second.body.memory.at(-1).feedback!=='active')
  if(memory==='M2')assert.equal(typeof second.body.memory[0].uncertainty,'string')
  for(const r of req){
    assert.ok(!JSON.stringify(r.body).includes('patrols'));assert.ok(!('robots' in r.body))
    assert.ok(!r.body.current.robots.some((bot:object)=>'phase' in bot))
  }
  const replay=json(d,'replay.json') as Replay
  for(const a of replay.attempts){
    const restored=new LearningWorld();restored.reset(a.seed,a.config);let i=1
    for(const t of lines(d,'actions').filter(t=>t.id===a.id))restored.step(t,()=>assert.deepEqual(restored.sample(),a.frames[i++]))
    assert.equal(i,a.frames.length)
    const track=timeline(a,'simulation')
    assert.equal(track.at(-1)?.after,true)
    for(const t of track){const f=sampleAt(a,t.sim);assert.equal(f.full.time,f.limited.time)}
    assert.ok(timeline(a,'wall-clock').at(-1)!.until>=track.at(-1)!.until)
  }
  const file=join(d,'journal/exploration-1/complete.json'),mtime=statSync(file).mtimeMs
  assert.deepEqual(await runExperiment(d,s),report);assert.equal(statSync(file).mtimeMs,mtime)
 }
})
test('invalid and uncertain interrupted responses are charged explicitly and never execute another policy',async()=>{
 for(const broken of [false,true]){
  const d=dir()
  if(broken){mkdirSync(join(d,'journal/exploration-1'),{recursive:true});writeFileSync(join(d,'journal/exploration-1/0001.intent.json'),'{"body":{},"units":0,"discarded":0,"historyDropped":0}')}
  const r=await runExperiment(d,settings({agent:'invalid-mock',memory:'M0',maxAttempts:1}))
  assert.equal(r.attempts[0].result,broken?'interrupted_request_unknown':'invalid_response')
  assert.equal(r.srK,0);assert.equal(r.hpConsumed,10);assert.equal(r.attempts[0].actions,0)
 }
})
test('three reset protocols and whole-record memory cap',async()=>{
 const c=defaults()
 assert.deepEqual(variant(c,1,'Same',2),c)
 for(const p of ['PhaseShift','FreshDynamics'] as const){
  const n=variant(c,1,p,2);assert.deepEqual(n.room,c.room);assert.deepEqual(n,variant(c,1,p,2));assert.notDeepEqual(n.patrols,c.patrols)
  assert.equal(n.patrols[0].speed===c.patrols[0].speed,p==='PhaseShift')
 }
 assert.deepEqual((await fitMemory(['12345','xy'],6)).records,['xy'])
})
test('Oracle verification and transfer have independent budgets and protected success',async()=>{
 const s=settings({agent:'oracle',maxAttempts:1,memory:'M0',maxTime:25})
 const r=await runExperiment(dir(),s)
 assert.equal(r.sr1,1);assert.equal(r.masterySuccessRate,1);assert.equal(r.hpConsumedBeforeFirstSuccess,0)
 assert.equal(r.attempts.filter(a=>a.id.startsWith('mastery')).length,3)
 assert.equal(r.attempts.filter(a=>a.id.startsWith('transfer')).length,2)
})
test('loopback adapter receives public information and meters the model-selected action and reflection separately',async()=>{
 const original=globalThis.fetch,requests:any[]=[]
 globalThis.fetch=async(url,opts)=>{
   const b=JSON.parse(opts!.body as string)
   if(String(url).endsWith('/tokenize'))return Response.json({count:b.messages?90:30})
   assert.ok(String(url).startsWith('http://127.0.0.1:'))
   requests.push(b);const reflect=b.messages[0].content.startsWith('Summarize')
   return Response.json({model:b.model,usage:{prompt_tokens:90,completion_tokens:11},choices:[{finish_reason:'stop',message:{content:JSON.stringify(reflect?
     {observations:'public only',failure:'seen',next:'wait',uncertainty:'phase unknown'}:{action:'MOVE_EAST',duration:1})}}]})
 }
 try{
   const d=dir(),r=await runExperiment(d,settings({agent:'local-1.7b',memory:'M2',maxAttempts:2}))
   assert.equal(r.llmRequests,4);assert.equal(r.inputTokens,360);assert.equal(r.outputTokens,44)
   assert.deepEqual(lines(d,'actions').map(r=>r.action),['MOVE_EAST','MOVE_EAST'])
   const second=JSON.parse(requests[2].messages[1].content)
   assert.equal(second.memory[0].next,'wait');assert.equal(second.current.time,0)
   assert.ok(!JSON.stringify(second).includes('periodSeconds'));assert.ok(!JSON.stringify(second).includes('seed'))
   const logged=lines(d,'requests')[2];assert.equal(logged.unit,'provider-token');assert.equal(logged.memoryUnits,30)
   assert.ok(JSON.parse(logged.reply.raw).choices)
 }finally{globalThis.fetch=original}
})
test('provider-side refusal/truncation never becomes an executed action',async()=>{
 const saved=globalThis.fetch
 try{
   for(const reason of ['length','refusal']){
    globalThis.fetch=async(url,opts)=>String(url).endsWith('/tokenize')?Response.json({count:20}):Response.json({
      model:JSON.parse(opts!.body as string).model,usage:{prompt_tokens:20,completion_tokens:6},choices:[{finish_reason:reason==='length'?'length':'stop',
        message:{content:'{"action":"MOVE_EAST","duration":1}',refusal:reason==='refusal'?'declined':null}}]})
    const r=await runExperiment(dir(),settings({agent:'local-8b',memory:'M0',maxAttempts:1}))
    assert.equal(r.attempts[0].actions,0);assert.equal(r.attempts[0].result,reason==='length'?'truncated':'refusal')
   }
 }finally{globalThis.fetch=saved}
})
test('resume reuses saved response, completes interrupted attempt, and preserves a sealed attempt',async()=>{
 const s=settings({agent:'mock',memory:'M0',maxAttempts:2}),from=dir(),to=dir()
 const {cpSync}=await import('node:fs')
 const expected=await runExperiment(from,s)
 cpSync(join(from,'metadata.json'),join(to,'metadata.json'))
 mkdirSync(join(to,'journal/exploration-2'),{recursive:true})
 cpSync(join(from,'journal/exploration-1'),join(to,'journal/exploration-1'),{recursive:true})
 cpSync(join(from,'journal/exploration-2/0001.response.json'),join(to,'journal/exploration-2/0001.response.json'))
 assert.deepEqual(await runExperiment(to,s),expected)
})
test('public history contains decision samples only; invalid granularity fails before any movement',()=>{
 const world=new LearningWorld();world.reset(1,defaults())
 const start=world.observe()
 assert.deepEqual(world.get_public_history(),[])
 assert.throws(()=>settings({durations:[.15]}))
 assert.throws(()=>world.step({action:'WAIT',duration:.15}));assert.deepEqual(world.get_public_history(),[])
 world.step({action:'WAIT',duration:.2},()=>{})
 assert.deepEqual(world.get_public_history(),[start])
 assert.equal(world.observe().time,.2)
})
test('time/action and token budget failures consume only one trial without silently moving',async()=>{
 const d=dir(),r=await runExperiment(d,settings({agent:'mock',maxAttempts:1,maxActions:1,durations:[.1],memory:'M0'}))
 assert.equal(r.attempts[0].result,'action_budget');assert.equal(r.hpConsumed,10)
 const saved=globalThis.fetch
 try{
  globalThis.fetch=async(url)=>{assert.ok(String(url).endsWith('/tokenize'));return Response.json({count:100})}
  const result=await runExperiment(dir(),settings({agent:'local-1.7b',maxAttempts:1,tokenBudget:80,memory:'M0'}))
  assert.equal(result.attempts[0].result,'token_budget');assert.equal(result.llmRequests,0)
  assert.equal(result.attempts[0].time,0)
 }finally{globalThis.fetch=saved}
})
