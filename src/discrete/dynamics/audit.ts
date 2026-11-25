import assert from 'node:assert/strict'
import {existsSync,readFileSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {loadRuns,attribute} from './experiment'
import {instance,initial,step,same} from './world'
import {observe,messages,parse,type PublicAttempt} from './protocol'
import {save} from './preflight'
export function audit(root:string){
  const runs=loadRuns(root);let requests=0,hidden=0
  for(const run of runs){
    const i=instance(run.mode,run.seed,run.attempt)
    assert.deepEqual(run.instance,i);assert.deepEqual(run.states[0],initial(i));assert.equal(run.states.length,run.steps.length+1)
    const history=runs.filter(r=>r.mode===run.mode&&r.condition===run.condition&&r.seed===run.seed&&r.attempt<run.attempt).map(r=>r.public)
    assert.equal(history.length,run.attempt-1)
    const active:PublicAttempt={attempt:run.attempt,observations:[observe(initial(i),run.condition)],decisions:[],failureReason:null}
    let lastSeen=0
    for(const [j,row] of run.steps.entries()){
      assert.deepEqual(row.before,run.states[j]);assert.deepEqual(row.after,run.states[j+1]);assert.deepEqual(row.input,active.observations.at(-1))
      if(row.input.robot)lastSeen=row.before.tick
      assert.equal(row.visible,row.input.robot!==null);assert.equal(row.ticks_since_last_seen,row.before.tick-lastSeen)
      const expected=messages(run.condition,run.attempt,row.input,history,active,i,row.before)
      const receipts=[0,1].map(n=>join(root,run.id,'wire',row.wireName+'-'+n+'.json')).filter(existsSync).map(p=>JSON.parse(readFileSync(p,'utf8'))),receipt=receipts.find(r=>r.status===200)
      assert.ok(receipt);assert.equal(receipt.body.model,'gpt-5.6-sol')
      assert.equal(createHash('sha256').update(JSON.stringify(receipt.body)).digest('hex'),receipt.hash);assert.deepEqual(receipt.body.messages,expected)
      const envelope=JSON.parse(receipt.raw);assert.equal(envelope.choices[0].message.content,row.raw);assert.ok(['gpt-5.6-sol','gpt-5.6-sol-2026-07-09'].includes(envelope.model))
      if(!row.visible){
        const mutated={...row.before,robot:{...row.before.robot,pos:[9,5] as [number,number],heading:'E' as const,cooldown:999}}
        assert.deepEqual(observe(mutated,run.condition),row.input)
        assert.deepEqual(messages(run.condition,run.attempt,row.input,history,active,{...i,mode:'pure_random',params:null,pattern:'PRIVATE-SENTINEL'},mutated),expected);hidden++
      }
      if(row.decision){assert.deepEqual(parse(row.raw,run.condition),row.decision);assert.deepEqual(row.after,step(row.before,row.decision.action,i));assert.equal(row.predictionCorrect,same(row.decision.predicted_next.pos,row.after.robot.pos)&&row.decision.predicted_next.heading===row.after.robot.heading);active.decisions.push(row.decision)}
      else{assert.equal(row.after.outcome,'format');assert.throws(()=>parse(row.raw,run.condition))}
      const output=observe(row.after,run.condition,row.decision?.action==='PEEK');assert.deepEqual(row.output,output);active.observations.push(output);requests++
    }
    active.failureReason=!['running','success'].includes(run.outcome)?run.outcome:null;assert.deepEqual(active,run.public)
    if(run.attribution){const last=run.steps.at(-1)!;assert.deepEqual(run.attribution,attribute(last.before,last.after,last.decision))}
  }
  const result={passed:true,runs:runs.length,requests,hiddenRequestsMutationChecked:hidden,checks:['seed/attempt world reconstruction','private state replay','exact wire reconstruction','public-only historical memory','hidden truth and mode noninterference','prediction/visibility/age metrics','one-step counterfactual attribution']}
  save(join(root,'audit.json'),result);return result
}
