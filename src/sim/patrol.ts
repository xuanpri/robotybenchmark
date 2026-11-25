import type {Config,Patrol,Point} from './config'
import {angleDelta,distance,wallHit} from './geometry'
export interface Robot {id:string;position:Point;heading:number;speed:number;node:number;phase:'move'|'pause'|'turn'}
interface Leg {a:Point;b:Point;heading:number;nextHeading:number;travel:number;dwell:number;end:number}
export class Circuit {
  readonly period:number
  private legs:Leg[]=[]
  constructor(readonly rule:Patrol,private offset:number){
    if(![rule.speed,rule.phase,rule.turn,rule.pause,...rule.nodes.flat()].every(Number.isFinite)||rule.nodes.length<2||!(rule.speed>0)||!(rule.turn>=0)||!(rule.pause>=0))throw Error('Invalid circuit '+rule.id)
    let end=0
    rule.nodes.forEach((a,i)=>{
      const b=rule.nodes[(i+1)%rule.nodes.length],c=rule.nodes[(i+2)%rule.nodes.length],travel=distance(a,b)/rule.speed
      if(!(travel>0))throw Error('Empty patrol leg')
      end+=travel+rule.pause+rule.turn
      this.legs.push({a,b,travel,dwell:rule.pause,heading:Math.atan2(b[1]-a[1],b[0]-a[0]),nextHeading:Math.atan2(c[1]-b[1],c[0]-b[0]),end})
    })
    this.period=rule.periodSeconds??end
    if(!Number.isFinite(this.period)||this.period<end)throw Error('Patrol period shorter than physical cycle: '+rule.id)
    const final=this.legs[this.legs.length-1]
    final.dwell+=this.period-end
    final.end=this.period
  }
  at(time:number):Robot{
    const t=((time/this.period+this.offset)%1+1)%1*this.period
    let i=this.legs.findIndex(l=>t<l.end)
    if(i<0)i=0
    const l=this.legs[i],local=t-(i?this.legs[i-1].end:0),f=Math.min(local/l.travel,1)
    const position:Point=[l.a[0]+(l.b[0]-l.a[0])*f,l.a[1]+(l.b[1]-l.a[1])*f]
    const phase=local<l.travel?'move':local<l.travel+l.dwell?'pause':'turn'
    const heading=l.heading+(phase==='turn'?angleDelta(l.heading,l.nextHeading)*(local-l.travel-l.dwell)/this.rule.turn:0)
    return {id:this.rule.id,position,heading,speed:phase==='move'?this.rule.speed:0,node:i,phase}
  }
}
export function circuits(cfg:Config,seed:number){
  let state=seed>>>0
  return cfg.patrols.slice(0,cfg.robotCount).map(rule=>{
    for(const [i,a] of rule.nodes.entries()){
      const b=rule.nodes[(i+1)%rule.nodes.length]
      if(wallHit(a,b,cfg.room,cfg.robotRadius)!==Infinity || a[0]<cfg.robotRadius || a[0]>cfg.room.width-cfg.robotRadius || a[1]<cfg.robotRadius || a[1]>cfg.room.depth-cfg.robotRadius)throw Error('Patrol hits boundary: '+rule.id)
    }
    state=(Math.imul(1664525,state)+1013904223)>>>0
    return new Circuit(rule,rule.phase+(2*state/2**32-1)*cfg.phaseJitter)
  })
}
