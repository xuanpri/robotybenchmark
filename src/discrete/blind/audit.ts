import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {initial,step,same,type State} from './environment'
import {observe,messages,parse,type PublicAttempt} from './public'
import {loadRuns,save,attribute} from './experiment'
export function audit(root:string){
  const runs=loadRuns(root);let requests=0,hidden=0,predictions=0
  for(const run of runs){
    assert.deepEqual(run.states[0],initial(run.phase));assert.equal(run.states.length,run.steps.length+1)
    const history=runs.filter(r=>r.condition===run.condition&&r.phase===run.phase&&r.attempt<run.attempt).map(r=>r.public)
    assert.equal(history.length,run.attempt-1)
    const active:PublicAttempt={attempt:run.attempt,observations:[observe(initial(run.phase),run.condition)],decisions:[],failureReason:null}
    let lastSeen=0
    for(const [i,row] of run.steps.entries()){
      assert.deepEqual(row.before,run.states[i]);assert.deepEqual(row.after,run.states[i+1])
      assert.deepEqual(row.input,active.observations.at(-1))
      if(row.input.robot)lastSeen=row.before.tick
      assert.equal(row.visible,row.input.robot!==null);assert.equal(row.ticks_since_last_seen,row.before.tick-lastSeen)
      const prompt=messages(run.condition,run.attempt,row.input,history,active)
      const receipts=[0,1].map(n=>join(root,run.id,'wire',row.wireName+'-'+n+'.json')).filter(existsSync).map(file=>JSON.parse(readFileSync(file,'utf8')))
      const receipt=receipts.find(r=>r.status===200)
      assert.ok(receipt,'Executed request needs successful receipt')
      assert.equal(receipt.body.model,'gpt-5.6-sol')
      assert.equal(createHash('sha256').update(JSON.stringify(receipt.body)).digest('hex'),receipt.hash)
      assert.deepEqual(receipt.body.messages,prompt)
      const envelope=JSON.parse(receipt.raw)
      assert.ok(['gpt-5.6-sol','gpt-5.6-sol-2026-07-09'].includes(envelope.model))
      assert.equal(envelope.choices[0].message.content,row.raw)
      if(row.decision){
        assert.deepEqual(parse(row.raw,run.condition),row.decision)
        assert.deepEqual(row.after,step(row.before,row.decision.action))
        assert.equal(row.predictionCorrect,same(row.decision.predicted_next.pos,row.after.robot.pos)&&row.decision.predicted_next.heading===row.after.robot.heading)
        active.decisions.push(row.decision);predictions++
      }else{assert.equal(row.after.outcome,'format');assert.throws(()=>parse(row.raw,run.condition))}
      const projected=observe(row.after,run.condition,row.decision?.action==='PEEK')
      assert.deepEqual(row.output,projected);active.observations.push(projected)
      if(!row.input.robot){
        hidden++
        // Actual hidden state may be replaced arbitrarily without affecting the
        // current public observation or any request serialization.
        const mutated:State={...row.before,robot:{pos:[9,5],heading:'E',pauseRemaining:999}}
        const replacement=observe(mutated,run.condition)
        assert.deepEqual(replacement,row.input)
        assert.deepEqual(messages(run.condition,run.attempt,replacement,history,activeForInput(active,i)),prompt)
      }
      requests++
    }
    active.failureReason=!['running','success'].includes(run.outcome)?run.outcome:null
    assert.deepEqual(active,run.public)
    if(run.attribution){const last=run.steps.at(-1)!;assert.deepEqual(run.attribution,attribute(last.before,last.after,last.decision))}
  }
  const result={passed:true,attempts:runs.length,modelRequests:requests,predictions,occludedRequestsVerified:hidden,
    checks:['identical phase reset','integer state replay','strict schemas','exact original wire and model','public-only cross-attempt reconstruction','hidden-state mutation noninterference','PEEK observation lifetime','visibility and last-seen metrics','counterfactual attribution']}
  save(join(root,'audit.json'),result);return result
}
function activeForInput(active:PublicAttempt,index:number):PublicAttempt{
  return {attempt:active.attempt,observations:active.observations.slice(0,index+1),decisions:active.decisions.slice(0,index),failureReason:null}
}
