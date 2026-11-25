import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {Ledger,dmx,read,save} from '../src/learning/dmx'
import {baseDir} from '../src/learning/dmx-pilot'
const ledger=new Ledger(join(baseDir,'wire'),true),rows=ledger.records(),ids=new Set<string>()
const secrets=process.env.DMXAPI_API_KEY
let checks=0
for(const [i,r] of rows.entries()){
  assert.equal(r.seq,i+1);assert.equal(createHash('sha256').update(JSON.stringify(r.body)).digest('hex'),r.hash)
  assert.deepEqual(Object.keys(r.body).sort(),['messages','model']);assert.equal(r.body.model,dmx.model)
  if(secrets)assert.equal(JSON.stringify(r).includes(secrets),false)
  if(r.status!==200)continue
  const data=JSON.parse(r.raw!);assert.ok(data.id&&!ids.has(data.id));ids.add(data.id)
  assert.ok([dmx.model,dmx.acceptedSnapshot].includes(data.model));assert.ok(r.latency!>=0)
  if(!r.name.endsWith('/posthoc-reflect'))continue
  const dir=join(baseDir,'B'),id=r.name.split('/')[0],attempts=read<any>(join(dir,'summary.json')).attempts
  const a=attempts.find((a:any)=>a.id===id),input=JSON.parse(r.body.messages[1].content)
  const lines=(f:string)=>readFileSync(join(dir,f+'.jsonl'),'utf8').trim().split('\n').map(s=>JSON.parse(s))
  const memory=lines('memory').find(m=>m.id===id),history=lines('observations').filter(t=>t.id===id&&t.choice).map(({id,...rest})=>rest)
  assert.deepEqual(input.history,history);assert.deepEqual(input.current,history.at(-1).after)
  assert.deepEqual(input.memory,memory.input);assert.equal(input.hp,a.after)
  assert.equal(memory.summary,null);assert.ok(input.task.includes('will not be given to any subsequent trial'))
  const summary=read<any[]>(join(dir,'retrospective-memory.json')).find(m=>m.wireSeq===r.seq)
  assert.equal(summary.availableDuringExperiment,false);assert.equal(summary.raw,data.choices[0].message.content)
  assert.deepEqual(summary.memory,JSON.parse(summary.raw));checks++
}
const smoke=rows.filter(r=>r.track==='smoke').length
assert.ok(smoke<=5&&rows.length-smoke<=200)
save(join(baseDir,'ledger-audit.json'),{requests:rows.length,smoke,experimentsIncludingRetrospective:rows.length-smoke,retrospectiveChecked:checks,uniqueResponseIDs:ids.size,
  bodySHA256Verified:rows.length,authFieldInArchivedBodies:false,credentialValueScan:secrets?'absent from archived wire rows':'not run',optionalRequestFields:[],
  actionDecisionLimit:60,tokenBudgetMeaning:'provider-reported cumulative usage checked between calls; no remote output cap sent',
  configNote:'metadata.settings.modelOutput and memoryBudget are inherited local defaults; the DMX transport sends only model/messages and includes all online summaries.'})
console.log('Verified '+rows.length+' reservations, '+ids.size+' distinct response IDs, '+checks+' retrospective public histories.')
