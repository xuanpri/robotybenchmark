import {existsSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {design,pack,scene,sceneId,type Layout,type Count} from '../src/study/scenes'
import {Physics,DT} from '../src/sim/world'
import {oracle} from '../src/sim/oracle'
import {distance,wallHit} from '../src/sim/geometry'
import {createSession} from '../src/sim/session'
import type {Action,Config} from '../src/sim/config'
import type {Replay,AttemptFilm} from '../src/video/replay'
const dir='evidence/layout-transfer-1'
mkdirSync(dir+'/scenes',{recursive:true})
function immutable(file:string,data:string){
  if(existsSync(file)){if(readFileSync(file,'utf8')!==data)throw Error('Existing artifact differs: '+file)}
  else writeFileSync(file,data,{flag:'wx'})
}
function play(cfg:Config,trace:Action[]){
  const physics=new Physics(cfg,design.seed);let state=physics.initial(),length=0
  for(const a of trace){
    if(state.outcome!=='active')break
    const prior=state;state=physics.advance(state,a);length+=distance(prior.player,state.player)
    if(wallHit(state.player,state.player,cfg.room,cfg.playerRadius-.00001)!==Infinity)throw Error('player inside wall')
  }
  return {state,length}
}
const rows=[]
for(const layout of ['A','B','C'] as Layout[]){
  const geometric=oracle(design.seed,scene(layout,0,1)).actions
  for(const n of [0,2,4] as Count[])for(const p of (n?[1,2]:[1]) as (1|2)[]){
    const cfg=scene(layout,n,p),id=sceneId(layout,n,p),phy=new Physics(cfg,design.seed),session=createSession(design.seed,cfg)
    if(phy.initial().outcome!=='active')throw Error('Unsafe spawn '+id)
    const raw=oracle(design.seed,cfg).actions,choices=pack(raw)
    const trace=choices.flatMap(c=>Array<Action>(Math.round(c.duration*10)).fill(c.action))
    const witness=play(cfg,trace)
    if(choices.length>design.maxActions||witness.state.outcome!=='escaped'||JSON.stringify(play(cfg,trace))!==JSON.stringify(witness))throw Error('Invalid witness '+id)
    const periods=phy.loops.map(l=>l.period),period=Math.ceil(Math.max(0,...periods))
    // Probe the same geometry-only route under different departures. One
    // collision suffices to demonstrate that ignoring patrols can matter.
    let hazard=null
    for(let ticks=0;n&&ticks<=period*10;ticks++){
      const test=play(cfg,[...Array<Action>(ticks).fill('WAIT'),...geometric])
      if(['contact','seen'].includes(test.state.outcome)){hazard={delay:ticks/10,outcome:test.state.outcome,time:test.state.clock*DT};break}
    }
    if(n&&!hazard)throw Error('No patrol influence witnessed '+id)
    const duration=n?Math.max(30,period):30
    const a:AttemptFilm={id,stage:id,attempt:1,seed:design.seed,config:cfg,hp:100,after:100,result:'demo',frames:[],decisions:[{action:'Patrol',start:0,end:duration,latency:0}]}
    const initial=session.view('omniscient')
    for(let tick=0;tick<=(n?10*duration:0);tick++){
      const full={...initial,time:tick/10,robots:phy.robots(tick*10).map(({id,position,heading})=>({id,position,heading}))}
      a.frames.push({full,limited:{...full,robots:[]}})
    }
    immutable(dir+'/scenes/'+id+'.replay.json',JSON.stringify({version:1,agent:'Scene survey',demo:true,attempts:[a]} satisfies Replay))
    const hash=createHash('sha256').update(JSON.stringify({seed:design.seed,config:cfg})).digest('hex')
    rows.push({id,layout_id:layout,robot_count:n,patrol_pattern_id:p,seed:design.seed,hash,config:cfg,periods,duration,oracle:{decisions:choices,seconds:witness.state.clock*DT,meters:witness.length,wait:raw.filter(a=>a==='WAIT').length/10,withoutWait:play(cfg,raw.filter(a=>a!=='WAIT')).state.outcome},hazard,replay:'scenes/'+id+'.replay.json',video:'scenes/'+id+'.mp4'})
    console.log(id,choices.length,witness.state.outcome,hazard)
  }
}
immutable(dir+'/scene-manifest.json',JSON.stringify({design,hashDefinition:'SHA256 UTF-8 JSON.stringify({seed,config})',scenes:rows},null,2)+'\n')
immutable('SCENE-REGISTRY.md','# 场景登记表\n\n种子 1。B/C 使用相同的外墙、起点、出口与巡逻参数，仅调整内部障碍物。P2 仅移动初始相位。动作时长 0.2/0.5/1 秒，上限 60 次决策及 90 秒。距离和等待为一个真实成功见证的测量值，不能解释为最优值。危险反例使用零机器人几何路线和候选延迟。\n\n[完整配置、巡逻周期、哈希与 Oracle 路线](evidence/layout-transfer-1/scene-manifest.json) · [回放工作台](studio.html)\n\n|场景|Oracle 决策|路程 m|等待 s|移除等待结果|几何路线危险反例|视频|\n|---|---:|---:|---:|---|---|---|\n'+rows.map(r=>'|'+[r.id,r.oracle.decisions.length,r.oracle.meters.toFixed(2),r.oracle.wait,r.oracle.withoutWait,r.hazard? r.hazard.outcome+' @ '+r.hazard.time.toFixed(2)+' s':'—','[MP4]('+dir+'/'+r.video+')'].join('|')+'|').join('\n')+'\n')
