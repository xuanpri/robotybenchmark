import {mkdirSync,writeFileSync,existsSync,readFileSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {provider} from '../study/provider'
import {initial,phases,solve,step,spec,walls,type State} from './environment'
import {messages,parse,predictionCorrect,attribute,type Condition} from './protocol'
import type {Run,StepRecord} from './records'

export function save(file:string,data:unknown){writeFileSync(file,JSON.stringify(data,null,2))}
export function oracleRuns():Run[]{
  return phases.map(phase=>{
    const path=solve(initial(phase));if(!path)throw Error('Unsolvable phase '+phase)
    const run:Run={id:'oracle-phase-'+phase,condition:'Oracle',phase,states:[initial(phase)],steps:[],actions:[],outcome:'running'}
    for(const action of path){
      const before=run.states.at(-1)!,after=step(before,action)
      run.steps.push({before,after,decision:{action,reason:'BFS shortest path'}});run.actions.push(action);run.states.push(after)
    }
    run.outcome=run.states.at(-1)!.outcome
    if(run.outcome!=='success')throw Error('Oracle validation failed')
    return run
  })
}
export async function modelRun(root:string,condition:Exclude<Condition,'Oracle'>,phase:number):Promise<Run>{
  const id=condition.toLowerCase()+'-phase-'+phase, dir=join(root,id)
  mkdirSync(dir,{recursive:true})
  const ask=provider(join(dir,'wire'),true)
  const run:Run={id,condition,phase,states:[initial(phase)],steps:[],actions:[],outcome:'running'}
  const persist=()=>save(join(dir,'run.json'),run)
  persist()
  while(run.states.at(-1)!.outcome==='running'){
    const before=run.states.at(-1)!,baseName='tick-'+String(before.tick).padStart(2,'0')
    let wireName=baseName
    // Resume only completed transport failures under a new receipt name. Keep
    // every failed receipt; never retry an unknown in-flight request.
    for(let retry=0;retry<3;retry++){
      const file=join(dir,'wire',wireName+'-0.json')
      if(!existsSync(file))break
      const receipt=JSON.parse(readFileSync(file,'utf8'))
      if(receipt.latency===undefined || !receipt.error)break
      wireName=baseName+'-transport-'+(retry+1)
    }
    // Only the model's own previous decisions and observed states enter history.
    const history=run.steps.map(r=>({tick:r.before.tick,decision:r.decision,observed_after:r.after}))
    let answer
    try{answer=await ask(wireName,messages(condition,before,history))}
    catch(e){run.infrastructureError=(e as Error).message;persist();throw e}
    let row:StepRecord
    try{
      const decision=parse(answer.content,condition),after=step(before,decision.action)
      row={before,after,decision,raw:answer.content,wireName,model:answer.model,usage:answer.usage,latency:answer.latency,
        ...(condition==='Omniscient'?{predictionCorrect:predictionCorrect(decision,after)}:{})}
      run.actions.push(decision.action)
    }catch(e){
      row={before,after:{...before,outcome:'format'},raw:answer.content,wireName,formatError:(e as Error).message,
        model:answer.model,usage:answer.usage,latency:answer.latency}
    }
    run.steps.push(row);run.states.push(row.after);run.outcome=row.after.outcome
    if(!['running','success'].includes(run.outcome))run.attribution=attribute(before,row.after,row.decision)
    persist();console.log(condition,'phase',phase,'tick',row.after.tick,row.decision?.action??'FORMAT',run.outcome)
  }
  return run
}
export function report(root:string,runs:Run[]){
  const summary=['Oracle','Future-known','Omniscient'].map(condition=>{
    const group=runs.filter(r=>r.condition===condition),predictions=group.flatMap(r=>r.steps).filter(r=>r.predictionCorrect!==undefined)
    const correct=predictions.filter(r=>r.predictionCorrect).length
    return {condition,completed:group.filter(r=>r.outcome!=='running').length,success:group.filter(r=>r.outcome==='success').length,total:5,
      predictionCorrect:correct,predictionTotal:predictions.length,predictionAccuracy:predictions.length?correct/predictions.length:null}
  })
  const passed=summary[0].success===5 && summary.slice(1).every(s=>s.success>=4)
  const complete=summary.every(s=>s.completed===5)
  const audit={passed,complete,summary,failures:runs.filter(r=>!['success','running'].includes(r.outcome)).map(r=>({id:r.id,phase:r.phase,outcome:r.outcome,...r.attribution})),
    predictionMetric:'Exact joint position AND heading accuracy over schema-valid Omniscient actions; format responses are separately counted.',
    attributionPolicy:'Prediction Error requires a wrong terminal prediction and a one-step counterfactual removing collision/swap/vision death. Other decision failures and timeouts are Action/Planning Error; invalid JSON/schema is Format Error. Infrastructure interruptions remain incomplete, never scored as model failures.'}
  save(join(root,'summary.json'),audit)
  let text='# Discrete calibration\n\n'+`Status: ${complete?(passed?'PASS':'FAIL'):'INCOMPLETE'}. Model: gpt-5.6-sol. Fixed phases: ${phases.join(', ')}.\n\n`
  text+='| Condition | Success | Prediction accuracy |\n|---|---:|---:|\n'
  for(const s of summary)text+=`| ${s.condition} | ${s.success}/5 | ${s.predictionAccuracy===null?'—':`${s.predictionCorrect}/${s.predictionTotal} (${(s.predictionAccuracy*100).toFixed(2)}%)`} |\n`
  text+='\n## Per-run report\n\n| Run | Result | Ticks | Attribution | Replay |\n|---|---|---:|---|---|\n'
  for(const r of runs)text+=`| ${r.id} | ${r.outcome} | ${r.states.at(-1)!.tick} | ${r.attribution?.category??'—'} | [video](${r.id}/replay.mp4), [interactive](${r.id}/replay.html) |\n`
  text+='\n## Oracle shortest safe action sequences\n\n'
  for(const r of runs.filter(r=>r.condition==='Oracle'))text+=`- phase ${r.phase}: ${r.actions.join(', ')} (${r.actions.length} ticks).\n`
  text+='\n## Failure evidence\n\n'
  const failures=runs.filter(r=>r.attribution)
  text+=failures.length?failures.map(r=>`- ${r.id}: ${r.attribution!.category}. ${r.attribution!.evidence} See [full state and wire references](${r.id}/run.json).`).join('\n'):'No model failures in completed episodes.\n'
  text+='\n\n'+audit.attributionPolicy+'\n\n'+audit.predictionMetric+'\n'
  writeFileSync(join(root,'REPORT.md'),text)
  return audit
}
export function manifest(root:string){
  mkdirSync(root,{recursive:true})
  const data={version:1,model:'gpt-5.6-sol',spec,walls,phases,conditions:['Oracle','Future-known','Omniscient'],promptProtocolVersion:1}
  const fingerprint=createHash('sha256').update(JSON.stringify(data)).digest('hex')
  const path=join(root,'manifest.json')
  if(existsSync(path) && JSON.parse(readFileSync(path,'utf8')).fingerprint!==fingerprint)throw Error('Manifest differs; choose a fresh output directory')
  save(path,{...data,fingerprint})
}
