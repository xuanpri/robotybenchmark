import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {design,scene} from '../src/study/scenes'
import {runJob,type Job} from '../src/study/learn'
import {digest,type Answer} from '../src/study/provider'
import {Pause} from '../src/learning/dmx'
import {Physics} from '../src/sim/world'
const registry=JSON.parse(readFileSync('evidence/layout-transfer-1/scene-manifest.json','utf8'))
const temp=()=>mkdtempSync(join(tmpdir(),'arena-study-'))
const reply=(o:unknown):Answer=>({content:JSON.stringify(o),latency:10,model:'test',usage:{}})
function job():Job{return {layout:'A',id:'fixture',group:'G3',cfg:scene('A',0,1),budget:2,initial:[],arm:'source'}}
test('15 registered scenes reproduce real outcomes with model-legal actions, including N0',()=>{
  assert.equal(registry.scenes.length,15)
  for(const r of registry.scenes){
    const cfg=scene(r.layout_id,r.robot_count,r.patrol_pattern_id)
    assert.equal(digest({seed:1,config:cfg}),r.hash)
    const phy=new Physics(cfg,1);let s=phy.initial()
    assert.equal(s.outcome,'active')
    assert.ok(r.oracle.decisions.length<=60)
    for(const c of r.oracle.decisions){
      assert.ok(design.durations.includes(c.duration))
      for(let i=0;i<Math.round(c.duration*10)&&s.outcome==='active';i++)s=phy.advance(s,c.action)
    }
    assert.equal(s.outcome,'escaped');assert.equal(s.clock*.01,r.oracle.seconds)
    if(r.robot_count)assert.ok(r.hazard)
  }
})
test('provider interruption freezes elapsed time and HP',async()=>{
  const result=await runJob(job(),temp(),async()=>{throw new Pause('http_429')})
  assert.equal(result.status,'paused');assert.equal(result.hp,100);assert.equal(result.attempts[0].time,0)
})
test('60 waits survive arbitrarily high cumulative tokens; online lesson reaches next reset and success snapshot',async()=>{
  const dir=temp(),example=registry.scenes[0].oracle.decisions
  const result=await runJob(job(),dir,async(name,messages)=>{
    assert.equal(typeof messages[1].content,'string')
    const input=JSON.parse(messages[1].content as string)
    for(const field of ['phase','patrols','truth','seed','oracle','tokens'])assert.ok(!(messages[1].content as string).includes('"'+field+'"'))
    if(name.endsWith('reflect'))return reply({observations:'walls',failure:input.outcome,next:'move',uncertainty:'test'})
    if(name.startsWith('1-'))return {...reply({action:'WAIT',duration:1}),usage:{prompt_tokens:100000}}
    assert.equal(input.memory.length,1);assert.equal(input.memory[0].result,'action_budget')
    return reply(example[Number(name.split('-')[2])-1])
  })
  assert.equal(result.hp,90);assert.equal(result.first,2);assert.equal(result.status,'acquired')
  assert.equal(result.attempts[0].actions,60)
  assert.equal(JSON.parse(readFileSync(join(dir,'success-memory.json'),'utf8')).at(-1).result,'escaped')
})
test('interrupted mandatory reflection preserves actual terminal failure but never starts a new attempt',async()=>{
  const j=job();j.cfg.maxTime=.1
  const result=await runJob(j,temp(),async name=>{if(name.endsWith('reflect'))throw new Pause('http_402');return reply({action:'WAIT',duration:.2})})
  assert.equal(result.hp,90);assert.equal(result.attempts.length,1);assert.equal(result.status,'paused');assert.equal(result.attempts[0].result,'timeout')
})
test('receipt replay uses recorded model response and rejects mismatched or unknown in-flight calls',async()=>{
  const {provider}=await import('../src/study/provider')
  const {writeFileSync}=await import('node:fs')
  const messages=[{role:'user' as const,content:'public observation'}],body={model:design.model,messages},dir=temp(),file=join(dir,'1-act-1-0.json')
  const receipt={hash:digest(body),body,start:'fixture'}
  writeFileSync(file,JSON.stringify(receipt))
  await assert.rejects(provider(dir)('1-act-1',messages),/unknown_inflight/)
  writeFileSync(file,JSON.stringify({...receipt,status:200,latency:1,raw:JSON.stringify({id:'fixture',model:design.model,usage:{prompt_tokens:50,completion_tokens:2},choices:[{finish_reason:'stop',message:{content:'recorded'}}]})}))
  assert.equal((await provider(dir)('1-act-1',messages)).content,'recorded')
  await assert.rejects(provider(dir)('1-act-1',[{role:'user',content:'changed'}]),/mismatch/)
})
test('hybrid input uses selected public frame, full current history and no cross-attempt reflection',async()=>{
 const j=job();j.budget=1;j.cfg.maxTime=.2
 let screenshots=0,calls=0
 const result=await runJob(j,temp(),async(name,messages)=>{
   assert.ok(!name.endsWith('reflect'))
   const parts=messages[1].content
   assert.ok(Array.isArray(parts));assert.equal(parts[0].type,'text');assert.equal(parts[1].type,'image_url')
   if(parts[0].type!=='text')throw Error('Missing text')
   const o=JSON.parse(parts[0].text)
   assert.equal(o.history.length,calls++);assert.deepEqual(o.memory,[])
   assert.equal(o.current.robots.length,0)
   return reply({action:'WAIT',duration:.2})
 },{observation_mode:'limited',input_mode:'hybrid',history_limit:'full',system:'test rules',noMemory:true,
 screenshot:async frame=>{screenshots++;assert.equal(frame.robots.length,0);return 'data:image/png;base64,fixture'}})
 assert.equal(calls,1);assert.equal(screenshots,1);assert.equal(result.status,'not_acquired')
})
