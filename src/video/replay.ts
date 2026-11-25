import type {Config,Action} from '../sim/config'
import type {Frame} from '../sim/session'
export interface Sample {full:Frame;limited:Frame}
export interface Decision {action:Action|string;start:number;end:number;latency:number;reason?:string}
export interface AttemptFilm {
  id:string;stage:string;attempt:number;seed:number;config:Config;hp:number;after:number;result:string;
  frames:Sample[];decisions:Decision[];endLatency?:number;lesson?:string;notes?:string[];resetLabel?:string
}
export interface Replay {version:1;agent:string;maxHP?:number;demo?:boolean;attempts:AttemptFilm[]}
export type Timing='simulation'|'wall-clock'
export function timeline(a:AttemptFilm,time:Timing,demo=false){
  let cursor=0
  const segments:{from:number;until:number;sim:number;rate:number;label:string;reason:string;after:boolean}[]=[]
  function add(duration:number,sim:number,rate:number,label:string,reason='',after=false){
    if(duration<=0)return
    segments.push({from:cursor,until:cursor+duration,sim,rate,label,reason,after});cursor+=duration
  }
  if(a.resetLabel)add(1,0,0,a.resetLabel)
  for(const d of a.decisions){
    if(time==='wall-clock')add(d.latency,d.start,0,'Deciding')
    add(d.end-d.start,d.start,1,d.action,d.reason)
  }
  if(!demo){
    const last=a.frames.at(-1)!.full.time
    if(time==='wall-clock')add(a.endLatency??0,last,0,'Reflection')
    add(.8,last,0,a.result);add(a.lesson?3:.8,last,0,a.result,a.lesson??'',true)
    for(const note of a.notes??[])add(3,last,0,'Experience',note,true)
  }
  return segments
}
export function sampleAt(a:AttemptFilm,time:number){
  let lo=0,hi=a.frames.length
  while(lo+1<hi){const mid=(lo+hi)>>1;if(a.frames[mid].full.time<=time+1e-8)lo=mid;else hi=mid}
  return a.frames[lo]
}
