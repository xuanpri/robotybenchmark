import {actions,direction,type Action,type Config,type Point} from './config'
import {distance,move,wallHit} from './geometry'
import {circuits,type Circuit,type Robot} from './patrol'

export const TICK=.1, PARTS=10, DT=TICK/PARTS
export type Outcome='active'|'escaped'|'contact'|'seen'|'timeout'
export interface State {clock:number;player:Point;heading:number;outcome:Outcome}
export function observable(player:Point,target:Point,cfg:Config){
  return distance(player,target)<=cfg.playerRange && wallHit(player,target,cfg.room)===Infinity
}
export function sees(robot:Robot,player:Point,cfg:Config){
  const dx=player[0]-robot.position[0],dz=player[1]-robot.position[1],d=Math.hypot(dx,dz)
  return d<=cfg.visionRange && (d<1e-9 || dx*Math.cos(robot.heading)+dz*Math.sin(robot.heading)>=d*Math.cos(cfg.visionDegrees*Math.PI/360)-1e-10) && wallHit(robot.position,player,cfg.room)===Infinity
}
function touches(a:Point,b:Point,old:Point,next:Point,r:number){
  const x=a[0]-old[0],z=a[1]-old[1],dx=b[0]-next[0]-x,dz=b[1]-next[1]-z
  const u=Math.max(0,Math.min(1,-(x*dx+z*dz)/(dx*dx+dz*dz||1)))
  return (x+u*dx)**2+(z+u*dz)**2<=r*r
}
export class Physics{
  readonly loops:Circuit[]
  private frames=new Map<number,Robot[]>()
  constructor(readonly cfg:Config,seed:number,private cache=false){
    if(!Number.isSafeInteger(seed))throw Error('Invalid seed')
    if(![0,1,2,4].includes(cfg.robotCount)||cfg.patrols.length<cfg.robotCount||new Set(cfg.patrols.map(p=>p.id)).size!==cfg.patrols.length)throw Error('Invalid robot roster')
    if(![cfg.playerSpeed,cfg.playerRadius,cfg.robotRadius,cfg.room.width,cfg.room.depth,cfg.room.exitRadius,cfg.maxTime].every(v=>Number.isFinite(v)&&v>0)||
      ![cfg.playerRange,cfg.visionRange,cfg.phaseJitter].every(v=>Number.isFinite(v)&&v>=0)||
      !(cfg.visionDegrees>0&&cfg.visionDegrees<=360)||!Number.isInteger(cfg.maxAttempts)||cfg.maxAttempts<1||
      !Number.isSafeInteger(Math.round(cfg.maxTime/DT))||Math.abs(cfg.maxTime/DT-Math.round(cfg.maxTime/DT))>1e-8)throw Error('Invalid case settings')
    if(!['contact','vision','both'].includes(cfg.failure)||!['omniscient','limited'].includes(cfg.observation))throw Error('Invalid mode')
    for(const p of [cfg.room.spawn,cfg.room.exit]){
      if(wallHit(p,p,cfg.room,cfg.playerRadius)!==Infinity||p[0]<cfg.playerRadius||p[1]<cfg.playerRadius||p[0]>cfg.room.width-cfg.playerRadius||p[1]>cfg.room.depth-cfg.playerRadius)throw Error('Invalid spawn or exit')
    }
    this.loops=circuits(cfg,seed)
  }
  initial():State{
    const player:Point=[...this.cfg.room.spawn],bots=this.robots(0),cfg=this.cfg
    let outcome:Outcome='active'
    if(cfg.failure!=='vision' && bots.some(r=>distance(r.position,player)<=cfg.robotRadius+cfg.playerRadius))outcome='contact'
    else if(cfg.failure!=='contact' && bots.some(r=>sees(r,player,cfg)))outcome='seen'
    else if(distance(player,cfg.room.exit)<=cfg.room.exitRadius)outcome='escaped'
    return {clock:0,player,heading:0,outcome}
  }
  robots(clock:number){
    const found=this.frames.get(clock)
    if(found)return found
    const frame=this.loops.map(c=>c.at(clock*DT))
    if(this.cache)this.frames.set(clock,frame)
    return frame
  }
  advance(state:State,action:Action):State{
    if(state.outcome!=='active')throw Error('Episode has ended')
    if(!actions.includes(action))throw Error('Unknown action')
    const d=direction[action],cfg=this.cfg,delta:Point=[d[0]*cfg.playerSpeed*DT,d[1]*cfg.playerSpeed*DT]
    let {clock,player}=state,old=this.robots(clock)
    const heading=action==='WAIT'?state.heading:Math.atan2(d[1],d[0])
    for(let part=0;part<PARTS;part++){
      const next=action==='WAIT'?player:move(player,delta,cfg.room,cfg.playerRadius),bots=this.robots(++clock)
      let outcome:Outcome='active'
      for(const [i,bot] of bots.entries()){
        if(cfg.failure!=='vision'&&touches(player,next,old[i].position,bot.position,cfg.robotRadius+cfg.playerRadius)){outcome='contact';break}
        if(cfg.failure!=='contact'&&sees(bot,next,cfg)){outcome='seen';break}
      }
      if(outcome==='active'&&distance(next,cfg.room.exit)<=cfg.room.exitRadius)outcome='escaped'
      if(outcome==='active'&&clock>=Math.round(cfg.maxTime/DT))outcome='timeout'
      if(outcome!=='active')return {clock,player:next,heading,outcome}
      player=next;old=bots
    }
    return {clock,player,heading,outcome:'active'}
  }
}
