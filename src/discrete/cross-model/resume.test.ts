import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {dirname,basename,join,resolve} from 'node:path'
import {root} from './baseline'
import {ask,sha,spending,allow} from './provider'
import {slug} from './experiment'
test('all 252 historical receipts are byte-identical and resume checkpoint prices exact',()=>{const r=JSON.parse(readFileSync(join(root,'resume-baseline.json'),'utf8'));assert.equal(Object.keys(r.wires).length,252);for(const [p,h] of Object.entries(r.wires))assert.equal(sha(readFileSync(p)),h);assert.deepEqual(r.models.map((m:any)=>[m.requests,Number(m.actualRMB.toFixed(6))]),[[123,14.55182],[129,14.504894]])})
test('all 252 historical requests replay from cache without invoking fetch',async()=>{
 const r=JSON.parse(readFileSync(join(root,'resume-baseline.json'),'utf8')),old=globalThis.fetch;let network=0;globalThis.fetch=(async()=>{network++;throw Error('Historical cache miss must not bill')}) as typeof fetch
 try{for(const f of Object.keys(r.wires)){const wire=JSON.parse(readFileSync(f,'utf8')),dir=dirname(dirname(f)),model=wire.body.model,frame=wire.image?resolve(dir,wire.image.path):undefined,messages=frame?[wire.body.messages[0],{role:'user',content:wire.body.messages[1].content[0].text}]:wire.body.messages;const answer=await ask(join(root,slug(model)),dir,basename(f,'.json'),model,messages,25,frame);assert.equal(answer.responseID,JSON.parse(wire.raw).id)}assert.equal(network,0)}finally{globalThis.fetch=old}
})
test('manifest selects only A,C and cumulative budget25; protocol core sources remain frozen',()=>{const m=JSON.parse(readFileSync(join(root,'manifest.json'),'utf8'));assert.deepEqual(m.selectedSlices,['A','C']);assert.equal(m.budgetPerModelRMB,25);assert.equal(allow(24.499,25),true);assert.equal(allow(24.5,25),false);for(const s of m.sources)assert.equal(sha(readFileSync(join('src/discrete/cross-model',s.file))),s.sha256);assert.equal(m.originalPromptMaxAttempts,5)})
