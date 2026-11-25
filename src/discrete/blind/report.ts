import {writeFileSync,existsSync,readFileSync} from 'node:fs'
import {join} from 'node:path'
import {phases} from './environment'
import {conditions,maxAttempts} from './public'
import {loadRuns,save,type Row} from './experiment'
const rate=(rows:Row[])=>{const valid=rows.filter(r=>r.predictionCorrect!==undefined),correct=valid.filter(r=>r.predictionCorrect).length;return {correct,total:valid.length,accuracy:valid.length?correct/valid.length:null}}
const fmt=(metric:{correct:number;total:number;accuracy:number|null})=>metric.accuracy===null?'—':`${metric.correct}/${metric.total} (${(100*metric.accuracy).toFixed(1)}%)`
export function report(root:string){
  const runs=loadRuns(root)
  const summary=conditions.map(condition=>{
    const group=runs.filter(r=>r.condition===condition),terminal=group.filter(r=>r.outcome!=='running'),rows=terminal.flatMap(r=>r.steps)
    const cases=phases.map(phase=>{
      const attempts=group.filter(r=>r.phase===phase),success=attempts.find(r=>r.outcome==='success')
      return {phase,firstSuccessAttempt:success?.attempt??null,completed:!!success||attempts.filter(r=>r.outcome!=='running').length===maxAttempts(condition),
        attempts:attempts.map(r=>({id:r.id,attempt:r.attempt,outcome:r.outcome,attribution:r.attribution,peekCount:r.steps.filter(s=>s.decision?.action==='PEEK').length}))}
    })
    const pass=Object.fromEntries([1,2,3].map(k=>['Pass@'+k,k>maxAttempts(condition)?null:{success:cases.filter(c=>c.firstSuccessAttempt!==null&&c.firstSuccessAttempt<=k).length,total:6,rate:cases.filter(c=>c.firstSuccessAttempt!==null&&c.firstSuccessAttempt<=k).length/6}]))
    const peekRows=rows.filter(r=>r.decision?.action==='PEEK'),locations:Record<string,number>={}
    for(const row of peekRows){const key=row.before.player.join(',');locations[key]=(locations[key]??0)+1}
    return {condition,maxAttempts:maxAttempts(condition),completedCases:cases.filter(c=>c.completed).length,pass,
      visiblePrediction:rate(rows.filter(r=>r.visible)),occludedPrediction:rate(rows.filter(r=>!r.visible)),
      occludedRunupPrediction:rate(rows.filter(r=>!r.visible&&r.before.player[1]===3&&r.before.player[0]>=2&&r.before.player[0]<=4)),
      predictionByAttempt:[1,2,3].filter(n=>n<=maxAttempts(condition)).map(attempt=>{
        const subset=terminal.filter(r=>r.attempt===attempt).flatMap(r=>r.steps)
        return {attempt,episodes:terminal.filter(r=>r.attempt===attempt).length,visible:rate(subset.filter(r=>r.visible)),occluded:rate(subset.filter(r=>!r.visible)),
          occludedByAge:Object.fromEntries(['1','2','3','4+'].map(bucket=>[bucket,rate(subset.filter(r=>!r.visible&&(bucket==='4+'?r.ticks_since_last_seen>=4:r.ticks_since_last_seen===Number(bucket))))]))}
      }),
      occludedByAge:Object.fromEntries(['1','2','3','4+'].map(bucket=>[bucket,rate(rows.filter(r=>!r.visible&&(bucket==='4+'?r.ticks_since_last_seen>=4:r.ticks_since_last_seen===Number(bucket))))])),
      failures:Object.fromEntries(['Format Error','Prediction Error','Action/Planning Error'].map(category=>[category,terminal.filter(r=>r.attribution?.category===category).length])),
      peek:{count:peekRows.length,locations,perAttempt:terminal.map(r=>({id:r.id,count:r.steps.filter(s=>s.decision?.action==='PEEK').length})),
        perPhase:phases.map(phase=>({phase,count:terminal.filter(r=>r.phase===phase).flatMap(r=>r.steps).filter(s=>s.decision?.action==='PEEK').length}))},cases}
  })
  const programmatic=existsSync(join(root,'programmatic-gates.json'))?JSON.parse(readFileSync(join(root,'programmatic-gates.json'),'utf8')):null
  const omni=summary[0],omniSuccess=(omni.pass['Pass@1'] as {success:number}).success
  const result={complete:summary.every(s=>s.completedCases===6),preflight:{programmatic:programmatic?.counts??null,passed:!!programmatic?.passed,
    omniscientCompleted:omni.completedCases,omniscientSuccess:omniSuccess,omniscientPassed:omni.completedCases===6&&omniSuccess>=5},
    phases,summary,attempts:runs.length,
    metrics:{prediction:'Exact position AND heading at next tick, scored against private truth; visibility is the current input observation, before action. Only schema-valid executed actions enter prediction denominators.',
      age:'Current input tick minus last legally seen tick in this attempt. Window and post-PEEK sightings reset age. Hidden steps at all non-window cells enter the main hidden metric; run-up-only metric is also reported.',
      pass:'Cumulative first-success rate across the fixed six phases. Pass@k is null (not tested) when k exceeds the condition attempt cap. Successful cases stop early; failures reset the identical phase.',
      attribution:'Wrong terminal prediction counts as Prediction Error only when substituting the predicted next robot state removes the immediate fatal event. Otherwise Action/Planning Error; invalid JSON/schema is Format Error. Infrastructure errors remain incomplete.'}}
  save(join(root,'summary.json'),result)
  let text=`# Phase 2.1 — blind run-up / opaque airlock\n\nModel: gpt-5.6-sol. Dynamics: identical_loop. Fixed phases: ${phases.join(', ')}. Status: ${result.complete?'COMPLETE':'INCOMPLETE'}.\n\n`
  text+='## Preflight gates\n\n| Policy | Success | Requirement |\n|---|---:|---:|\n'
  for(const policy of ['Oracle','Blind-Rush','Memoryless-Reactive'])text+=`| ${policy} | ${programmatic?.counts[policy]??0}/6 | ${policy==='Oracle'?'6/6':'≤ 2/6'} |\n`
  text+=`| Omniscient | ${omniSuccess}/6 | ≥ 5/6 |\n\n`
  text+='## Pass curves\n\n| Condition | Cases complete | Pass@1 | Pass@2 | Pass@3 |\n|---|---:|---:|---:|---:|\n'
  for(const s of summary)text+=`| ${s.condition} | ${s.completedCases}/6 | ${[1,2,3].map(k=>{const p=s.pass['Pass@'+k] as null|{success:number;rate:number};return p?`${p.success}/6 (${(100*p.rate).toFixed(1)}%)`:'N/A (cap=1)'}).join(' | ')} |\n`
  text+='\n## Prediction accuracy by visibility and time since sighting\n\n| Condition | Visible | Occluded | Hidden age 1 | Age 2 | Age 3 | Age 4+ | Run-up only |\n|---|---:|---:|---:|---:|---:|---:|---:|\n'
  for(const s of summary)text+=`| ${s.condition} | ${fmt(s.visiblePrediction)} | ${fmt(s.occludedPrediction)} | ${['1','2','3','4+'].map(k=>fmt(s.occludedByAge[k])).join(' | ')} | ${fmt(s.occludedRunupPrediction)} |\n`
  text+='\n### Prediction accuracy by attempt index\n\n| Condition | Attempt | Episodes reaching index | Visible | Occluded |\n|---|---:|---:|---:|---:|\n'
  for(const s of summary)for(const p of s.predictionByAttempt)text+=`| ${s.condition} | ${p.attempt} | ${p.episodes} | ${fmt(p.visible)} | ${fmt(p.occluded)} |\n`
  text+='\n## Failure attribution\n\n| Condition | Format Error | Prediction Error | Action/Planning Error |\n|---|---:|---:|---:|\n'
  for(const s of summary)text+=`| ${s.condition} | ${Object.values(s.failures).join(' | ')} |\n`
  text+='\n## Per-attempt results and PEEK use\n\n| Episode | Result | Ticks | Attribution | PEEK | Data / film |\n|---|---|---:|---|---:|---|\n'
  for(const r of runs){const film=existsSync(join(root,r.id,'replay.mp4'))?`, [video](${r.id}/replay.mp4), [interactive](${r.id}/replay.html)`:''
    text+=`| ${r.id} | ${r.outcome} | ${r.states.at(-1)!.tick} | ${r.attribution?.category??'—'} | ${r.steps.filter(s=>s.decision?.action==='PEEK').length} | [truth + decisions](${r.id}/run.json), [public memory](${r.id}/public-history.json)${film} |\n`}
  text+='\n### Interactive PEEK trigger positions\n\n'
  text+=JSON.stringify(summary[3].peek.locations)+'\n'
  text+='\n## Failure evidence\n\n'
  const failed=runs.filter(r=>r.attribution)
  text+=failed.length?failed.map(r=>`- ${r.id}: **${r.attribution!.category}** (${r.outcome}). ${r.attribution!.evidence}`).join('\n'):'No failures in completed attempts.'
  text+='\n\n## Metric definitions and privacy\n\n'+Object.values(result.metrics).join('\n\n')
  text+='\n\nAll model inputs are built from allowlisted public observations and the model’s own decisions. Old legal sightings remain historical sightings. Hidden current or historical truth, phase IDs, Oracle paths, prediction scores and causal attributions never enter model input. Correctness is checked by hidden-truth mutation tests and exact wire reconstruction.\n'
  writeFileSync(join(root,'REPORT.md'),text)
  return result
}
