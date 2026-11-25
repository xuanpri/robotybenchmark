import {test} from 'node:test'
import assert from 'node:assert/strict'
import {memoryOffMessages} from './memory'
import {instance,initial} from '../dynamics/world'
import {observe} from '../dynamics/protocol'
import {transitions} from './local'
import {provider} from '../../study/provider'
import {mkdtempSync,readdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
test('memory off hides real attempt and has empty cross-attempt history',()=>{for(let n=1;n<=5;n++){const i=instance('identical_loop',101,n),s=initial(i),o=observe(s,'Partial-unknown-passive'),p=memoryOffMessages(o,{attempt:n,observations:[o],decisions:[],failureReason:null},i,s),u=JSON.parse(p[1].content);assert.equal(u.attempt,1);assert.equal(u.active_attempt.attempt,1);assert.deepEqual(u.previous_attempts,[])}})
test('real seed/attempt directories prevent local cache collapse; same attempt resumes',async()=>{const root=mkdtempSync(join(tmpdir(),'memory-cache-'));const original=globalThis.fetch;let calls=0;globalThis.fetch=(async()=>{calls++;return new Response(JSON.stringify({id:'mock',model:'gpt-5.6-sol',usage:{prompt_tokens:1,completion_tokens:1},choices:[{finish_reason:'stop',message:{content:'{}'}}]}),{status:200})}) as typeof fetch;try{const m=[{role:'user' as const,content:'same prompt'}];await provider(join(root,'seed-101-attempt-1'))('tick-0',m);await provider(join(root,'seed-101-attempt-2'))('tick-0',m);await provider(join(root,'seed-101-attempt-2'))('tick-0',m);assert.equal(calls,2)}finally{globalThis.fetch=original;rmSync(root,{recursive:true,force:true})}})
test('Markov transition probabilities normalized; boundary and heading persistence',()=>{for(let z=0;z<6;z++)for(const h of ['N','S'])assert.ok(Math.abs(transitions(z+','+h).reduce((a,b)=>a+b.p,0)-1)<1e-12);assert.deepEqual(transitions('0,N'),[{key:'1,S',p:.5},{key:'0,N',p:.5}]);assert.equal(Math.max(...transitions('3,N').map(r=>r.p)),1/3)})
