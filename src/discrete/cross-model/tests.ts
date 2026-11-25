import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync,mkdtempSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {baseline,curve} from './baseline'
import {strip,allow,payload,ask} from './provider'
import {slug} from './experiment'
import {messages,parse} from '../dynamics/protocol'
import {textMessages,compact,parse as parseVision} from '../vision/protocol'
test('read-only GPT baseline cap3 exactly matches A 2/5/6, B 4/5/6, C 3/4',()=>{assert.deepEqual(curve(baseline('A'),3,6).map(p=>p.success),[2,5,6]);assert.deepEqual(curve(baseline('B'),3,6).map(p=>p.success),[4,5,6]);assert.equal(curve(baseline('C'),1,4)[0].success,3)})
test('all original selected text requests reconstruct exactly; new family changes model only',()=>{
 for(const slice of ['A','B']){const runs=baseline(slice);for(const r of runs){const prev=runs.filter(p=>p.seed===r.seed&&p.attempt<r.attempt).sort((a,b)=>a.attempt-b.attempt).map(p=>p.public)
  for(const [j,row] of r.steps.entries()){
   const active={attempt:r.attempt,observations:r.public.observations.slice(0,j+1),decisions:r.public.decisions.slice(0,j),failureReason:null}
   const m=messages(r.condition,r.attempt,row.input,prev,active,r.instance,row.before),paths=[0,1].map(n=>join(r.source,'wire',row.wireName+'-'+n+'.json')).filter(existsSync),wire=paths.map(p=>JSON.parse(readFileSync(p,'utf8'))).find(w=>w.status===200)
   assert.deepEqual(m,wire.body.messages);for(const model of ['claude-opus-5-5','gemini-4-argon'])assert.deepEqual({...payload(model,m),model:'gpt-5.6-sol'},wire.body)
   assert.doesNotMatch(JSON.stringify(m),/identical_loop|parametric_shift|predictionCorrect|mechanism_state/)
  }
 }}
})
test('all selected visual text and image bytes match original payloads',()=>{
 for(const r of baseline('C')){const history:string[]=[];for(const row of r.steps){const m=textMessages('Partial-known-Vision',row.before.tick,history),wire=JSON.parse(readFileSync(join('src/discrete/artifacts/vision-ablation',row.answer.wire),'utf8')),bytes=readFileSync(join('src/discrete/artifacts/vision-ablation',row.frame));assert.equal(m[0].content,wire.body.messages[0].content);assert.equal(m[1].content,wire.body.messages[1].content[0].text)
  const expected={model:'gpt-5.6-sol',messages:[m[0],{role:'user',content:[{type:'text',text:m[1].content},{type:'image_url',image_url:{url:'data:image/png;base64,'+bytes.toString('base64')}}]}]};assert.deepEqual({...payload('claude-opus-5-5',m,bytes),model:'gpt-5.6-sol'},expected);assert.deepEqual({...payload('gemini-4-argon',m,bytes),model:'gpt-5.6-sol'},expected);if(row.decision)history.push(compact(row.before.tick,row.decision))
 }}
})
test('fences, strict schemas, budget boundary and model cache keys',()=>{assert.equal(strip('```json\n{"a":1}\n```'),'{"a":1}');assert.equal(strip('```\n{}\n```'),'{}');assert.throws(()=>JSON.parse(strip('explanation\n```json\n{}\n```')));assert.throws(()=>parse(strip('```json\n{}\n```'),'Partial-unknown-passive'));assert.throws(()=>parseVision('{}'));assert.equal(allow(14.499,15),true);assert.equal(allow(14.5,15),false);assert.notEqual(slug('a/b'),slug('a-b'))})
test('same context in distinct model/slice/seed/attempt paths samples independently; resume caches; GPT denied',async()=>{
 const root=mkdtempSync(join(tmpdir(),'cross-cache-')),old=globalThis.fetch;let calls=0
 globalThis.fetch=(async(_url:any,opts:any)=>{calls++;const body=JSON.parse(opts.body);return new Response(JSON.stringify({id:'mock-'+calls,model:body.model,usage:{prompt_tokens:1,completion_tokens:1,cost:'¥0.01'},choices:[{finish_reason:'stop',message:{content:'```json\n{}\n```'}}]}),{status:200})}) as typeof fetch
 try{const m=[{role:'user',content:'same'}];for(const path of ['A-seed-101-attempt-1','A-seed-101-attempt-2','B-seed-101-attempt-1'])await ask(root,join(root,path),'tick-0','claude-opus-5-5',m,15);await ask(root,join(root,'A-seed-101-attempt-2'),'tick-0','claude-opus-5-5',m,15);assert.equal(calls,3);await assert.rejects(()=>ask(root,join(root,'gpt'),'tick','gpt-5.6-sol',m,15));assert.equal(calls,3)}finally{globalThis.fetch=old;rmSync(root,{recursive:true,force:true})}
})
