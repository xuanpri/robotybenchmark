import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {step,initial,future} from './environment'
import {parse,messages,predictionCorrect} from './protocol'
import type {Run} from './records'

// Replay all recorded actions and reconstruct every executed model request.
// This performs no model calls and does not read Oracle data into a prompt.
export function audit(root:string,runs:Run[]){
  let steps=0,requests=0,predictions=0
  for(const run of runs){
    assert.deepEqual(run.states[0],initial(run.phase))
    assert.equal(run.states.length,run.steps.length+1)
    const executed=[]
    for(const [i,row] of run.steps.entries()){
      assert.deepEqual(row.before,run.states[i]);assert.deepEqual(row.after,run.states[i+1])
      if(row.decision){
        assert.deepEqual(row.after,step(row.before,row.decision.action))
        executed.push(row.decision.action);steps++
      }else assert.equal(row.after.outcome,'format')
      if(run.condition==='Oracle')continue
      const receipts=[0,1].map(n=>join(root,run.id,'wire',row.wireName+'-'+n+'.json'))
        .filter(existsSync).map(file=>JSON.parse(readFileSync(file,'utf8')))
      const receipt=receipts.find(r=>r.status===200)
      assert.ok(receipt,'executed request must have a successful provider receipt')
      const hash=createHash('sha256').update(JSON.stringify(receipt.body)).digest('hex')
      assert.equal(receipt.hash,hash)
      assert.equal(receipt.body.model,'gpt-5.6-sol')
      const history=run.steps.slice(0,i).map(r=>({tick:r.before.tick,decision:r.decision,observed_after:r.after}))
      assert.deepEqual(receipt.body.messages,messages(run.condition,row.before,history))
      if(run.condition==='Future-known')assert.deepEqual(JSON.parse(receipt.body.messages[1].content).future_robot,future(row.before))
      const envelope=JSON.parse(receipt.raw)
      assert.equal(envelope.choices[0].message.content,row.raw)
      assert.ok(['gpt-5.6-sol','gpt-5.6-sol-2026-07-09'].includes(envelope.model))
      if(row.decision)assert.deepEqual(parse(row.raw!,run.condition),row.decision)
      if(run.condition==='Omniscient' && row.decision){
        assert.equal(row.predictionCorrect,predictionCorrect(row.decision,row.after));predictions++
      }
      requests++
    }
    assert.deepEqual(executed,run.actions)
    assert.equal(run.outcome,run.states.at(-1)!.outcome)
  }
  const result={passed:true,runs:runs.length,executedSteps:steps,modelRequests:requests,predictions,
    checks:['integer-state replay','recorded actions','wire request hash','exact prompt reconstruction without Oracle input','six-step future truth','original response','requested and returned model','prediction metric']}
  writeFileSync(join(root,'audit.json'),JSON.stringify(result,null,2))
  return result
}
