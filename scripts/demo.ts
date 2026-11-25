import {existsSync,readFileSync,writeFileSync} from 'node:fs'
import {defaults,type Action} from '../src/sim/config'
import {Physics,DT} from '../src/sim/world'
import {createSession} from '../src/sim/session'
import type {AttemptFilm,Replay} from '../src/video/replay'
const cfg=defaults(),seed=1,p=new Physics(cfg,seed),source='evidence/oracle-seed-1.json'
const actions=JSON.parse(readFileSync(source,'utf8')).actions as Action[]
for(const name of ['scene_demo','oracle_success','oracle_without_wait']){
  const demo=name==='scene_demo',session=createSession(seed,cfg)
  const a:AttemptFilm={id:name,stage:demo?'Patrol demo':'Witness replay',attempt:1,seed,config:cfg,hp:100,after:100,result:'',frames:[],decisions:[]}
  if(demo){
    const duration=Math.max(40,Math.ceil(Math.max(...p.loops.map(l=>l.period))))
    for(let i=0;i<=duration*30;i++){
      const clock=Math.round(i/30/DT),full={...session.view('omniscient'),time:clock*DT,robots:p.robots(clock)}
      a.frames.push({full,limited:{...full,robots:[]}})
    }
    a.decisions.push({action:'Patrol',start:0,end:duration,latency:0})
    a.result='complete'
  }else{
    const sample=()=>({full:session.view('omniscient'),limited:session.view('limited')})
    a.frames.push(sample())
    for(const action of actions.filter(s=>name==='oracle_success'||s!=='WAIT')){
      const start=session.observe().time
      const o=session.step(action)
      a.decisions.push({action,start,end:o.time,latency:0});a.frames.push(sample())
      if(o.outcome!=='active')break
    }
    a.result=session.observe().outcome;a.after=a.result==='escaped'?100:90
    if(a.result!==(name==='oracle_success'?'escaped':'seen'))throw Error('Invalid witness')
  }
  const replay:Replay={version:1,agent:demo?'Patrol Demo':name==='oracle_success'?'Oracle':'Oracle / WAIT removed',demo,attempts:[a]}
  const file='evidence/videos/'+name+'.replay.json',data=JSON.stringify(replay)
  if(!existsSync(file))writeFileSync(file,data,{flag:'wx'})
  else if(readFileSync(file,'utf8')!==data)throw Error('Replay differs: '+file)
}
