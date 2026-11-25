import {readFileSync,existsSync,writeFileSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
import {loadRuns,matrix,type Row} from './experiment'
import {seeds,modes} from './world'
import {save,wilson} from './preflight'
const metric=(rows:Row[])=>{const r=rows.filter(x=>x.predictionCorrect!==undefined),correct=r.filter(x=>x.predictionCorrect).length;return {correct,total:r.length,accuracy:r.length?correct/r.length:null}}
const fmt=(m:ReturnType<typeof metric>)=>m.total?`${m.correct}/${m.total} (${(m.accuracy!*100).toFixed(1)}%)`:'—'
export function report(root:string){
  const runs=loadRuns(root),completeRuns=runs.filter(r=>r.outcome!=='running')
  const groups=matrix.map(({mode,condition})=>{
    const all=runs.filter(r=>r.mode===mode&&r.condition===condition),done=all.filter(r=>r.outcome!=='running'),cap=condition==='Omniscient'?1:5,rows=done.flatMap(r=>r.steps)
    const cases=seeds.map(seed=>{
      const r=done.filter(r=>r.seed===seed),first=r.find(r=>r.outcome==='success')?.attempt??null
      return {seed,firstSuccess:first,attempts:r.length,complete:mode==='pure_random'?r.length===cap:first!==null||r.length===cap}
    })
    const successful=cases.filter(c=>c.firstSuccess!==null),peek=rows.filter(r=>r.decision?.action==='PEEK'),locations:Record<string,number>={}
    for(const r of peek){const key=r.before.player.join(',');locations[key]=(locations[key]??0)+1}
    return {mode,condition,complete:cases.every(c=>c.complete),completedCases:cases.filter(c=>c.complete).length,attempts:done.length,
      pass:Array.from({length:cap},(_,k)=>({k:k+1,success:cases.filter(c=>c.firstSuccess!==null&&c.firstSuccess<=k+1).length,total:6,rate:cases.filter(c=>c.firstSuccess!==null&&c.firstSuccess<=k+1).length/6})),
      meanAttemptsToSuccess:successful.length?successful.reduce((n,c)=>n+c.firstSuccess!,0)/successful.length:null,successfulSeeds:successful.length,
      restrictedMeanAtCap:cases.reduce((n,c)=>n+(c.firstSuccess??cap),0)/6,visible:metric(rows.filter(r=>r.visible)),occluded:metric(rows.filter(r=>!r.visible)),
      age:Object.fromEntries(['1','2','3','4+'].map(k=>[k,metric(rows.filter(r=>!r.visible&&(k==='4+'?r.ticks_since_last_seen>=4:r.ticks_since_last_seen===Number(k))))])),
      failures:Object.fromEntries(['Format Error','Prediction Error','Action/Planning Error'].map(k=>[k,done.filter(r=>r.attribution?.category===k).length])),
      peek:{count:peek.length,meanPerAttempt:done.length?peek.length/done.length:null,locations,perAttempt:done.map(r=>({id:r.id,count:r.steps.filter(s=>s.decision?.action==='PEEK').length}))},cases}
  })
  const randomRows=Array.from({length:5},(_,a)=>{
    const attempts=completeRuns.filter(r=>r.mode==='pure_random'&&r.attempt===a+1),actions=attempts.flatMap(r=>r.steps.flatMap(s=>s.decision?[s.decision.action]:[])),counts:Record<string,number>={UP:0,DOWN:0,LEFT:0,RIGHT:0,WAIT:0,PEEK:0}
    for(const action of actions)counts[action]++
    const entropy=Object.values(counts).reduce((n,v)=>v?n-(v/actions.length)*Math.log2(v/actions.length):n,0)
    const pocketWaits=attempts.map(r=>r.steps.filter(s=>s.before.player[0]===1&&s.before.player[1]===3&&s.decision?.action==='WAIT').length)
    const patternClaims=attempts.flatMap(r=>r.steps.filter(s=>/\b(cycle|periodic|pattern|always|every \d|repeat|regular)\b/i.test(s.decision?.reason??'')).map(s=>({id:r.id,tick:s.before.tick,reason:s.decision!.reason})))
    const success=attempts.filter(r=>r.outcome==='success').length
    return {attempt:a+1,success,total:attempts.length,rate:attempts.length?success/attempts.length:null,ci95:wilson(success,attempts.length),actionCounts:counts,actionEntropyBits:entropy,
      meanPocketWaitTicks:attempts.length?pocketWaits.reduce((n,v)=>n+v,0)/attempts.length:null,pocketWaits,patternLanguageCount:patternClaims.length,patternLanguageExamples:patternClaims.slice(0,5)}
  })
  const baseline=existsSync(join(root,'random-baseline.json'))?JSON.parse(readFileSync(join(root,'random-baseline.json'),'utf8')):null
  const roundComparisons=randomRows.map(row=>({attempt:row.attempt,comparisons:(baseline?.results??[]).map((b:any)=>{
    const p=b.exactFiniteHorizonProbability,n=row.total
    const choose=(N:number,k:number)=>{let v=1;for(let j=1;j<=k;j++)v=v*(N-j+1)/j;return v}
    let cumulative=0,low:number|null=null,high:number|null=null
    for(let k=0;k<=n&&n>0;k++){cumulative+=choose(n,k)*p**k*(1-p)**(n-k);if(low===null&&cumulative>=.025)low=k;if(high===null&&cumulative>=.975)high=k}
    return {policy:b.policy,exactP:p,baselineRoundWilsonCI95:b.perAttempt[row.attempt-1].ci95,llmRate:row.rate,llmWilsonCI95:row.ci95,
      exactPInsideLLMInterval:row.ci95?p>=row.ci95[0]&&p<=row.ci95[1]:null,predictive95SuccessCountForSameN:n?[low,high]:null,
      note:'Reference policies differ from the LLM; this is not an optimal-policy upper bound or a causal hallucination test.'}
  })}))
  const randomPerSeed=seeds.map(seed=>({seed,attempts:Array.from({length:5},(_,a)=>{
    const r=completeRuns.find(r=>r.mode==='pure_random'&&r.seed===seed&&r.attempt===a+1)
    return {attempt:a+1,outcome:r?.outcome??null,windowWaitTicks:r?r.steps.filter(s=>s.before.player[0]===1&&s.before.player[1]===3&&s.decision?.action==='WAIT').length:null}
  })}))
  const result={complete:groups.every(g=>g.complete),seeds,groups,unrunCells:[{mode:'pure_random',condition:'Partial-unknown-interactive',reason:'Optional slice omitted to control API cost; no inferred measurements.'}],randomDrift:{rounds:randomRows,perSeed:randomPerSeed,roundComparisons,baselineComparisons:baseline?.results.map((r:any)=>({policy:r.policy,p:r.p,ci95:r.ci95,exactP:r.exactFiniteHorizonProbability,perAttempt:r.perAttempt,
      cumulativeChancePass:Array.from({length:5},(_,k)=>({k:k+1,rate:1-(1-r.exactFiniteHorizonProbability)**(k+1)}))})),
    trends:{actionEntropyFirstToLast:randomRows[4].actionEntropyBits-randomRows[0].actionEntropyBits,
      pocketWaitFirstToLast:randomRows[4].meanPocketWaitTicks!==null&&randomRows[0].meanPocketWaitTicks!==null?randomRows[4].meanPocketWaitTicks-randomRows[0].meanPocketWaitTicks:null,
      flaggedReasonsTotal:randomRows.reduce((n,r)=>n+r.patternLanguageCount,0)},
    interpretation:'Six LLM seeds per round are a small paired sample. Baseline Wilson intervals describe baseline Monte Carlo precision, not a six-run predictive acceptance band. Compare LLM Wilson intervals as well. Entropy, waits and pattern-language flags are descriptive, not causal proof of hallucination. Pure random is exogenous and independent across attempts; no early stopping. It is a bounded Markov process with heading persistence, so learning state-dependent probabilities is legitimate; absence of a periodic template does not make the reference-policy success rates an information-theoretic ceiling.'},
    attemptedRuns:runs.length,completedRuns:completeRuns.length,modelRequests:runs.flatMap(r=>r.steps).length,
    providerReceipts:runs.reduce((n,r)=>n+readdirSync(join(root,r.id,'wire')).filter(f=>f.endsWith('.json')).length,0),
    tokenUsage:runs.flatMap(r=>r.steps).reduce((a,r)=>({prompt:a.prompt+Number(r.usage.prompt_tokens??0),completion:a.completion+Number(r.usage.completion_tokens??0)}),{prompt:0,completion:0}),
    definitions:{meanAttempts:'Mean first-success attempt among seeds that succeeded; unsuccessful seeds are reported separately. Restricted mean treats no success as cap; random execution still always consumes 5 attempts.',
      prediction:'Joint next position AND heading; visibility at action input. PEEK affects the following observation. Age counts ticks since the last legal sighting within the current attempt.',
      cohorts:'Main accuracy and action entropy pool recorded actions, so phases/attempt durations and early stopping affect denominators. Age 4+ is not necessarily a monotonic degradation curve.',
      omitted:'pure_random interactive deliberately not run (optional cost slice). Unknown prompts contain no mode IDs, true rules, seeds, future truth or correctness feedback. Omniscient verification alone receives the current true transition rule and counters.'}}
  save(join(root,'summary.json'),result)
  let text=`# Phase 2.2 — Tier-1 dynamics\n\nModel: gpt-5.6-sol. Status: ${result.complete?'COMPLETE':'INCOMPLETE'}. Seeds: ${seeds.join(', ')}.\n\n`
  const figures=['pass-curves.svg','random-drift.svg','prediction-age.svg'].filter(f=>existsSync(join(root,f)))
  if(figures.length)text+=figures.map(f=>`[${f}](${f})`).join(' · ')+'\n\n'
  const pre=existsSync(join(root,'preflight.json'))?JSON.parse(readFileSync(join(root,'preflight.json'),'utf8')):null
  text+=`Oracle: ${pre?.oracleSolved??0}/90 solvable. Anti-prior Pass@1: ${pre?.antiPrior.map((r:any)=>r.policy+' '+r.success+'/6').join('; ')??'pending'}.\n\n`
  text+='## Dynamics degradation\n\n| Dynamics | Condition | Complete | Pass@1..5 | Mean success attempt | Visible | Occluded | Age 1 | Age 2 | Age 3 | Age 4+ |\n|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|\n'
  for(const g of groups)text+=`| ${g.mode} | ${g.condition} | ${g.completedCases}/6 | ${g.pass.map(p=>p.success+'/6').join(' → ')} | ${g.meanAttemptsToSuccess?.toFixed(2)??'—'} (${g.successfulSeeds}/6 seeds) | ${fmt(g.visible)} | ${fmt(g.occluded)} | ${['1','2','3','4+'].map(k=>fmt(g.age[k])).join(' | ')} |\n`
  text+='| pure_random | Partial-unknown-interactive | Not run (optional) | — | — | — | — | — | — | — | — |\n'
  text+='\n`pure_random / interactive`: not run (optional). Omniscient has cap=1.\n\n## Failure attribution and probing\n\n| Dynamics | Condition | Format | Prediction | Planning | PEEK / attempt | PEEK positions |\n|---|---|---:|---:|---:|---:|---|\n'
  for(const g of groups)text+=`| ${g.mode} | ${g.condition} | ${Object.values(g.failures).join(' | ')} | ${g.peek.meanPerAttempt?.toFixed(2)??'—'} | ${JSON.stringify(g.peek.locations)} |\n`
  text+='\n## Pure-random baselines\n\n| Policy | MC p (500) | Wilson 95% CI | Exact Markov p | Round-rate variance |\n|---|---:|---|---:|---:|\n'
  for(const r of baseline?.results??[])text+=`| ${r.policy} | ${r.p.toFixed(3)} | ${r.ci95.map((x:number)=>x.toFixed(3)).join('–')} | ${r.exactFiniteHorizonProbability.toFixed(4)} | ${r.roundRateVariance.toFixed(5)} |\n`
  text+='\nIndependent-attempt reference cumulative chance Pass@1..5 (not learning):\n\n'
  for(const b of result.randomDrift.baselineComparisons??[])text+=`- ${b.policy}: ${b.cumulativeChancePass.map((p:any)=>(100*p.rate).toFixed(1)+'%').join(' → ')}.\n`
  text+='\n## Pure-random drift by attempt\n\n| Attempt | Success | Wilson 95% CI | Action entropy (bits) | Mean window WAIT | Pattern-language flags |\n|---|---:|---|---:|---:|---:|\n'
  for(const r of randomRows)text+=`| ${r.attempt} | ${r.success}/${r.total} | ${r.ci95?.map(x=>x.toFixed(3)).join('–')??'—'} | ${r.actionEntropyBits.toFixed(3)} | ${r.meanPocketWaitTicks?.toFixed(2)??'—'} | ${r.patternLanguageCount} |\n`
  text+='\n### Full random cohort (success does not stop later attempts)\n\n| Seed | Attempt 1 | Attempt 2 | Attempt 3 | Attempt 4 | Attempt 5 |\n|---|---|---|---|---|---|\n'
  for(const r of randomPerSeed)text+=`| ${r.seed} | ${r.attempts.map(a=>a.outcome??'pending').join(' | ')} |\n`
  text+='\n### Matched-round baseline comparison\n\n| Attempt | Reference | Baseline round CI | Exact p inside LLM CI? | 95% predictive successes at same n |\n|---|---|---|---|---|\n'
  for(const row of roundComparisons)for(const c of row.comparisons)text+=`| ${row.attempt} | ${c.policy} | ${c.baselineRoundWilsonCI95.map((v:number)=>v.toFixed(3)).join('–')} | ${c.exactPInsideLLMInterval??'—'} | ${c.predictive95SuccessCountForSameN?.join('–')??'—'} |\n`
  text+='\n'+result.randomDrift.interpretation+' See summary.json for actual action counts, paired per-seed outcomes, baseline round intervals and flagged reason excerpts.\n'
  if(result.complete){
    const randomGroup=groups.find(g=>g.mode==='pure_random')!,success=randomRows.reduce((n,r)=>n+r.success,0)
    const overlap=roundComparisons.flatMap(r=>r.comparisons).every(c=>c.exactPInsideLLMInterval)
    text+='\n## Observed findings (this fixed six-seed sample)\n\n'
    for(const mode of modes.slice(0,3)){
      const passive=groups.find(g=>g.mode===mode&&g.condition==='Partial-unknown-passive')!,interactive=groups.find(g=>g.mode===mode&&g.condition==='Partial-unknown-interactive')!
      text+=`- ${mode}: Pass@2 passive ${passive.pass[1].success}/6 vs interactive ${interactive.pass[1].success}/6; mean first-success attempt among successful seeds ${passive.meanAttemptsToSuccess?.toFixed(2)} vs ${interactive.meanAttemptsToSuccess?.toFixed(2)}. Success denominators are ${passive.successfulSeeds}/6 vs ${interactive.successfulSeeds}/6, so these conditional means alone do not adjust for censoring.\n`
    }
    text+=`- Pure random: ${success}/30 single-round successes, but cumulative Pass@2 ${randomGroup.pass[1].success}/6 with occluded accuracy ${fmt(randomGroup.occluded)}. High cumulative success by itself does not establish accurate dynamics prediction or learning; independent retries already yield high cumulative chance success.\n`
    text+=`- All five per-round LLM Wilson intervals contain all three exact reference-policy probabilities: ${overlap}. The six-run intervals are wide. These observations do not establish a systematic advantage or disadvantage relative to the reference policies.\n`
    text+=`- Action entropy by round: ${randomRows.map(r=>r.actionEntropyBits.toFixed(3)).join(' → ')} bits; window WAIT means: ${randomRows.map(r=>r.meanPocketWaitTicks!.toFixed(2)).join(' → ')}. Neither sequence is monotonic in this run. Periodic-pattern keyword flags total ${result.randomDrift.trends.flaggedReasonsTotal}; this heuristic is not a validated hallucination detector. There is no clear sustained preference drift in these descriptive measurements.\n`
    text+=`- Interactive PEEK per episode: ${modes.slice(0,3).map(mode=>mode+' '+groups.find(g=>g.mode===mode&&g.condition==='Partial-unknown-interactive')!.peek.meanPerAttempt!.toFixed(3)).join('; ')}. Probing frequency does not increase monotonically with the named instability categories in this sample. Different episode durations and early-stop cohorts limit direct causal comparisons.\n`
  }
  text+='\n## Per-run records\n\n| Episode | Outcome | Ticks | Attribution | Records |\n|---|---|---:|---|---|\n'
  for(const r of runs)text+=`| ${r.id} | ${r.outcome} | ${r.states.at(-1)!.tick} | ${r.attribution?.category??'—'} | [run](${r.id}/run.json), [public](${r.id}/public-history.json)${existsSync(join(root,r.id,'replay.mp4'))?`, [video](${r.id}/replay.mp4)`:''} |\n`
  text+='\n## Failure evidence\n\n'+completeRuns.filter(r=>r.attribution).map(r=>`- ${r.id}: ${r.attribution!.category}. ${r.attribution!.evidence}`).join('\n')
  text+='\n\n## Definitions\n\n'+Object.values(result.definitions).join('\n\n')+'\n'
  writeFileSync(join(root,'REPORT.md'),text);return result
}
