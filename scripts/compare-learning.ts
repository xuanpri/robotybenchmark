import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import type {Settings} from '../src/learning/protocol'
const load=(d:string,f:string)=>JSON.parse(readFileSync(join(d,f),'utf8'))
interface Row {agent:string;memory:string;sr1:number;srK:number;mastery:number|null;exactSequence:number|null;transfer:number|null;spawnFailures:number;key:string}
const rows:Row[]=process.argv.slice(2).map(dir=>{
  const m=load(dir,'metadata.json'),s:Settings=m.settings,r=load(dir,'summary.json')
  const {agent,memory,replayFile,replayAttempt,...rules}=s
  const actions=readFileSync(join(dir,'actions.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(x=>JSON.parse(x))
  const sequence=(id:string)=>JSON.stringify(actions.filter(a=>a.id===id).map(a=>[a.action,a.duration]))
  const wins=r.attempts.filter((a:{id:string;result:string})=>a.id.startsWith('exploration')&&a.result==='escaped')
  const checks=r.attempts.filter((a:{id:string})=>a.id.startsWith('mastery'))
  return {agent,memory,sr1:r.sr1,srK:r.srK,mastery:r.masterySuccessRate,transfer:r.transferSuccessRate,
    exactSequence:checks.length&&wins.length?checks.filter((a:{id:string;result:string})=>a.result==='escaped'&&sequence(a.id)===sequence(wins[0].id)).length/checks.length:null,
    spawnFailures:r.attempts.filter((a:{actions:number;time:number;result:string})=>!a.actions&&a.time===0&&['seen','contact'].includes(a.result)).length,
    key:JSON.stringify([rules,m.base])}
})
if(!rows.length)throw Error('Supply learning result directories')
for(const {key,...r} of rows){
  function delta(agent:string){const matches=rows.filter(b=>b.key===key&&b.agent===agent&&b.memory===r.memory)
    if(matches.length>1)throw Error('Duplicate matched baseline')
    return matches.length===1?r.srK-matches[0].srK:null}
  console.log(JSON.stringify({...r,srKImprovementOverRandom:delta('random'),srKImprovementOverGoal:delta('heuristic')}))
}
