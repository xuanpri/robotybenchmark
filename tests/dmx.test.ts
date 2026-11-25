import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,readFileSync,readdirSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Ledger,dmx} from '../src/learning/dmx'
import {pilot} from '../src/learning/dmx-pilot'
const dir=()=>mkdtempSync(join(tmpdir(),'arena-dmx-test-'))
async function fixture(f:(body:any)=>Response,work:()=>Promise<void>){
  const original=globalThis.fetch,k=process.env.DMXAPI_API_KEY,u=process.env.DMXAPI_BASE_URL
  process.env.DMXAPI_API_KEY='test-only-credential';process.env.DMXAPI_BASE_URL='https://www.dmxapi.cn/v1'
  globalThis.fetch=async(url,opts)=>{
    assert.equal(url,'https://www.dmxapi.cn/v1/chat/completions');assert.equal(opts!.redirect,'error')
    const body=JSON.parse(String(opts!.body));assert.deepEqual(Object.keys(body).sort(),['messages','model'])
    assert.equal(body.model,'gpt-5.6-sol');return f(body)
  }
  try{await work()}finally{globalThis.fetch=original
    if(k===undefined)delete process.env.DMXAPI_API_KEY;else process.env.DMXAPI_API_KEY=k
    if(u===undefined)delete process.env.DMXAPI_BASE_URL;else process.env.DMXAPI_BASE_URL=u
  }
}
const response=(text:string)=>Response.json({model:dmx.acceptedSnapshot,id:'mock-http-unit-test',choices:[{finish_reason:'stop',message:{content:text}}],usage:{prompt_tokens:12,completion_tokens:8}})
test('remote adapter logs only a redacted response on auth failure and preserves HP/clock',async()=>{
  const path=dir(),ledger=new Ledger(join(path,'wire'))
  await fixture(()=>new Response('bad test-only-credential',{status:401}),async()=>{
    const r=await pilot('A',ledger,join(path,'A'));assert.equal(r.stop,'auth_or_balance');assert.equal(r.attempts[0].actions,0)
    assert.deepEqual([r.attempts[0].after,r.attempts[0].time],[100,0])
    assert.ok(!JSON.stringify(ledger.records()).includes('test-only-credential'));assert.equal(ledger.records().length,1)
  })
})
test('combined A/B cap and smoke cap count physical calls before dispatch',async()=>{
  for(const track of ['smoke','B'] as const){
    const path=dir(),ledger=new Ledger(path),limit=track==='smoke'?5:200
    for(let i=1;i<=limit;i++)writeFileSync(join(path,String(i).padStart(3,'0')+'.json'),JSON.stringify({track:track==='B'?'A':'smoke',seq:i,name:'earlier'}))
    await fixture(()=>{throw Error('must not issue another call')},async()=>{
      await assert.rejects(ledger.ask(track,'new',[]),/request_cap/);assert.equal(readdirSync(path).length,limit)
    })
  }
})
test('same saved response is reused; mismatched task cannot replace a billed request',async()=>{
  const l=new Ledger(dir());let count=0
  await fixture(()=>{count++;return response('hello')},async()=>{
    const msg=[{role:'user' as const,content:'unit test'}]
    await l.ask('smoke','x',msg);await l.ask('smoke','x',msg);assert.equal(count,1)
    await assert.rejects(l.ask('smoke','x',[]),/reconstruction_mismatch/);assert.equal(count,1)
  })
})
test('omniscient and limited tracks receive the corresponding current projection and no private patrol parameters',async()=>{
  const path=dir(),l=new Ledger(join(path,'wire'))
  await fixture(()=>response('{"action":"MOVE_EAST","duration":1,"reason":"test"}'),async()=>{
    await pilot('A',l,join(path,'A'))
    await pilot('smoke',l,join(path,'smoke'))
    for(const track of ['A','smoke'] as const){
      const wire=l.records().find(x=>x.track===track)!,input=JSON.parse(wire.body.messages[1].content)
      const frame=JSON.parse(readFileSync(join(path,track,'replay.json'),'utf8')).attempts[0].frames[0]
      assert.deepEqual(input.current,frame[track==='A'?'full':'limited'])
      assert.ok(!JSON.stringify(input).includes('patrols'));assert.deepEqual(input.memory,[])
      assert.equal(input.current.robots.length,track==='A'?4:1)
    }
  })
})
test('a frozen replay cannot send a request, and manual recovery retains the failed reservation',async()=>{
  const path=dir(),before=new Ledger(path)
  await fixture(()=>new Response('Unauthorized',{status:401}),async()=>{
    await assert.rejects(before.ask('A','a',[]),/auth_or_balance/)
    await assert.rejects(new Ledger(path,true).ask('A','new',[]),/checkpoint_boundary/)
    assert.equal(before.records().length,1)
  })
  let calls=0
  await fixture(()=>{calls++;return response('recovered')},async()=>{
    const l=new Ledger(path,false,true)
    assert.equal((await l.ask('A','a',[])).content,'recovered')
    assert.equal((await before.ask('A','a',[])).content,'recovered')
    assert.equal(calls,1);assert.deepEqual(before.records().map(r=>r.status),[401,200])
  })
})
test('persistent throttling stops after two metered requests and no world step',async()=>{
 const path=dir(),l=new Ledger(join(path,'wire'))
 await fixture(()=>new Response('rate limited',{status:429}),async()=>{
  const r=await pilot('A',l,join(path,'A'))
  assert.equal(r.stop,'http_429');assert.equal(r.attempts[0].time,0);assert.equal(r.attempts[0].after,100)
  assert.deepEqual(l.records().map(x=>x.status),[429,429])
 })
})
