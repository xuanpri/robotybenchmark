import {walkable as oldWalkable,doorBlocks,same,type Pos,type Heading,type Action,type Outcome} from '../blind/environment'
export type {Pos,Heading,Action,Outcome}
export {same,doorBlocks}
export const modes=['identical_loop','parametric_shift','pattern_shift','pure_random'] as const
export type Mode=typeof modes[number]
export const seeds=[101,102,103,104,105,106] as const
export type Params={min:number;max:number;southSpeed:number;northSpeed:number;northPause:number;southPause:number;alt:boolean;stutter:boolean}
export type Robot={pos:Pos;heading:Heading;pauseRemaining:number;cooldown:number;stutterRemaining:number;altNext:number}
export type State={tick:number;player:Pos;robot:Robot;outcome:Outcome}
export type Instance={mode:Mode;seed:number;attempt:number;params:Params|null;pattern:string|null;phase:number;period:number|null;robots:Robot[]}
export const spec={width:10,height:6,maxTicks:30,visionRange:3,spawn:[1,3] as Pos,exit:[8,3] as Pos,airlock:[[4,3],[5,3]] as Pos[]}
export const walkable=(p:Pos)=>oldWalkable(p)||p[0]===5&&(p[1]===0||p[1]===5)
export const walls:Pos[]=Array.from({length:60},(_,i):Pos=>[i%10,Math.floor(i/10)]).filter(p=>!walkable(p))
export function rng(seed:number,attempt:number,domain=0){
  let state=(Math.imul(seed,0x9e3779b1)^Math.imul(attempt,0x85ebca6b)^Math.imul(domain+1,0xc2b2ae35))>>>0
  return ()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}
}
const base:Params={min:0,max:5,southSpeed:1,northSpeed:1,northPause:0,southPause:3,alt:false,stutter:false}
const copy=(r:Robot):Robot=>({...r,pos:[...r.pos]})
export function advance(r:Robot,p:Params):Robot{
  const n=copy(r),speed=()=>n.heading==='S'?p.southSpeed:p.northSpeed
  if(n.pauseRemaining>0){n.pauseRemaining--;if(n.pauseRemaining===0){n.heading=n.heading==='S'?'N':'S';n.cooldown=speed()-1}return n}
  if(n.stutterRemaining>0){n.stutterRemaining--;return n}
  if(n.cooldown>0){n.cooldown--;return n}
  n.pos[1]+=n.heading==='S'?1:-1
  if(n.pos[1]===p.min||n.pos[1]===p.max){
    const pause=p.alt?n.altNext:n.pos[1]===p.min?p.northPause:p.southPause
    if(p.alt)n.altNext=2-n.altNext
    n.pauseRemaining=pause
    if(pause===0)n.heading=n.heading==='S'?'N':'S'
  }else if(p.stutter&&n.pos[1]===3)n.stutterRemaining=1
  n.cooldown=speed()-1
  return n
}
export function cycle(p:Params):Robot[]{
  const start:Robot={pos:[5,p.min],heading:'S',pauseRemaining:0,cooldown:p.southSpeed-1,stutterRemaining:0,altNext:0}
  const states:Robot[]=[];let r=start
  do{states.push(r);r=advance(r,p);if(states.length>200)throw Error('Period exceeded')}while(JSON.stringify(r)!==JSON.stringify(start))
  return states
}
export function instance(mode:Mode,seed:number,attempt:number):Instance{
  if(!Number.isInteger(attempt)||attempt<1||attempt>5)throw Error('attempt must be 1..5')
  const random=rng(seed,mode==='identical_loop'?1:attempt,1)
  if(mode==='pure_random'){
    let r:Robot={pos:[5,Math.floor(random()*6)],heading:random()<.5?'N':'S',pauseRemaining:0,cooldown:0,stutterRemaining:0,altNext:0}
    const robots=[r]
    for(let i=0;i<30;i++){
      const legal=[...(r.pos[1]>0?[-1]:[]),...(r.pos[1]<5?[1]:[]),0],d=legal[Math.floor(random()*legal.length)]
      r={...r,pos:[5,r.pos[1]+d],heading:d===0?r.heading:d===1?'S':'N'};robots.push(r)
    }
    return {mode,seed,attempt,params:null,pattern:null,phase:0,period:null,robots}
  }
  let params={...base},pattern:string|null=null
  if(mode==='parametric_shift'){
    const ranges=[[0,5],[1,4],[1,5]],range=ranges[Math.floor(random()*3)],speed=1+Math.floor(random()*2)
    params={...base,min:range[0],max:range[1],southSpeed:speed,northSpeed:speed,northPause:Math.floor(random()*3),southPause:Math.floor(random()*3)}
  }
  if(mode==='pattern_shift'){
    const order=['asym_pause','alt_pause','asym_speed','mid_stutter'],shuffle=rng(seed,0,2)
    for(let i=3;i>0;i--){const j=Math.floor(shuffle()*(i+1));[order[i],order[j]]=[order[j],order[i]]}
    pattern=order[(attempt-1)%4]
    if(pattern==='alt_pause')params={...base,northPause:0,southPause:0,alt:true}
    if(pattern==='asym_speed')params={...base,northPause:0,southPause:0,northSpeed:2}
    if(pattern==='mid_stutter')params={...base,northPause:0,southPause:0,stutter:true}
  }
  const loop=cycle(params)
  // Seed-stratified initial phases, fixed before model dispatch. Six distinct
  // phases include both headings; no model outcomes enter this assignment.
  const antiPriorPhases=[4,5,6,9,10,11]
  const phase=mode==='identical_loop'?antiPriorPhases[((seed-101)%6+6)%6]:Math.floor(random()*loop.length)
  const robots=Array.from({length:31},(_,t)=>copy(loop[(phase+t)%loop.length]))
  return {mode,seed,attempt,params,pattern,phase,period:loop.length,robots}
}
export const initial=(i:Instance):State=>({tick:0,player:[1,3],robot:copy(i.robots[0]),outcome:'running'})
const vectors:Record<string,Pos>={N:[0,-1],S:[0,1],E:[1,0],W:[-1,0],UP:[0,-1],DOWN:[0,1],LEFT:[-1,0],RIGHT:[1,0],WAIT:[0,0],PEEK:[0,0]}
export function vision(r:Pick<Robot,'pos'|'heading'>):Pos[]{
  const cells:Pos[]=[],d=vectors[r.heading];let prev=r.pos
  for(let k=1;k<=3;k++){const p:Pos=[r.pos[0]+k*d[0],r.pos[1]+k*d[1]];if(!walkable(p)||doorBlocks(prev,p))break;cells.push(p);prev=p}
  return cells
}
export function move(p:Pos,a:Action):Pos{const d=vectors[a],q:Pos=[p[0]+d[0],p[1]+d[1]];return walkable(q)?q:[...p]}
export function danger(before:State,player:Pos,r:Pick<Robot,'pos'|'heading'>):Outcome{
  if(same(player,r.pos))return 'collision'
  if(same(before.player,r.pos)&&same(player,before.robot.pos))return 'swap'
  return vision(r).some(p=>same(player,p))?'vision':'running'
}
export function step(s:State,a:Action,i:Instance):State{
  if(s.outcome!=='running'||!['UP','DOWN','LEFT','RIGHT','WAIT','PEEK'].includes(a))throw Error('Invalid step')
  const tick=s.tick+1,player=move(s.player,a),robot=copy(i.robots[tick]);let outcome=danger(s,player,robot)
  if(outcome==='running')outcome=same(player,[8,3])?'success':tick>=30?'timeout':'running'
  return {tick,player,robot,outcome}
}
export function solve(i:Instance):Action[]|null{
  const q:{s:State;path:Action[]}[]=[{s:initial(i),path:[]}],seen=new Set<string>()
  for(let k=0;k<q.length;k++){const {s,path}=q[k];if(s.outcome==='success')return path;if(s.outcome!=='running')continue
    const key=JSON.stringify([s.tick,s.player]);if(seen.has(key))continue;seen.add(key)
    for(const a of ['WAIT','RIGHT','UP','DOWN','LEFT'] as Action[])q.push({s:step(s,a,i),path:[...path,a]})}
  return null
}
