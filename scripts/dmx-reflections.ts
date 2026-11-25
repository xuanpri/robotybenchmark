// Complete missing experience collection separately. These answers cannot enter the historical episode.
import {readFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {join} from 'node:path'
import {baseDir,publicMessages} from '../src/learning/dmx-pilot'
import {Ledger,read,save} from '../src/learning/dmx'
import {parseExperience,type AgentInput} from '../src/learning/protocol'
if(process.argv[2]!=='locked'){
  const c=spawnSync('flock',['-n',baseDir,process.execPath,'--import','tsx',process.argv[1],'locked'],{stdio:'inherit'})
  process.exit(c.status??1)
}
const dir=join(baseDir,'B'),summary=read<any>(join(dir,'summary.json'))
if(summary.stop)throw Error('Only completed runs may collect retrospective experience')
const ledger=new Ledger(join(baseDir,'wire')),lines=(name:string)=>readFileSync(join(dir,name+'.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(s=>JSON.parse(s))
const out=[]
for(const missing of lines('memory').filter(m=>m.id.startsWith('exploration-')&&!m.summary&&m.raw==='token_budget')){
  const end=summary.attempts.find((a:any)=>a.id===missing.id)
  const requests=lines('requests').filter(r=>r.name.startsWith(missing.id+'/act-'))
  const prev=requests.at(-1)
  const input:AgentInput=JSON.parse(prev.body.messages[1].content)
  const turns=lines('observations').filter(t=>t.id===missing.id&&t.choice).map(({id,...t})=>t)
  input.current=turns.at(-1).after;input.history=turns;input.hp=end.after
  input.remaining.time=90-end.time;input.remaining.tokens=0;input.remaining.actions=60-end.actions
  input.task+=' Retrospective reflection only. This attempt ended with public result '+end.result+'. Its action budget is closed. This summary will not be given to any subsequent trial.'
  const v=await ledger.ask('B',missing.id+'/posthoc-reflect',publicMessages(input,true,'limited'))
  let memory=null
  try{if(v.valid)memory=parseExperience(v.content)}catch{}
  out.push({id:missing.id,wireSeq:v.r.seq,availableDuringExperiment:false,raw:v.content,memory})
  save(join(dir,'retrospective-memory.json'),out)
}
console.log(out.map(x=>({id:x.id,seq:x.wireSeq,valid:!!x.memory})))
