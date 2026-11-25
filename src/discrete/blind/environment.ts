import type {Pos,Heading,Robot,Outcome} from '../environment'
export type {Pos,Heading,Robot,Outcome}
export type Action='UP'|'DOWN'|'LEFT'|'RIGHT'|'WAIT'|'PEEK'
export type State={tick:number;player:Pos;robot:Robot;outcome:Outcome}
export const actions:Action[]=['WAIT','RIGHT','UP','DOWN','LEFT']
export const spec={width:10,height:6,maxTicks:30,visionRange:3,spawn:[1,3] as Pos,exit:[8,3] as Pos,
  patrol:{x:5,minZ:1,maxZ:4,endpointPause:1,period:8},airlock:[[4,3],[5,3]] as Pos[],dynamics:'identical_loop'}
// Frozen before API dispatch, stratified using only programmatic gates.
export const phases=[0,1,2,4,5,6] as const
export const same=(a:Pos,b:Pos)=>a[0]===b[0]&&a[1]===b[1]
export const walkable=([x,z]:Pos)=>Number.isInteger(x)&&Number.isInteger(z)&&x>=0&&x<10&&z>=0&&z<6&&
  (z===3&&x>=1&&x<=8||x===5&&z>=1&&z<=4)
export const walls:Pos[]=Array.from({length:60},(_,i):Pos=>[i%10,Math.floor(i/10)]).filter(p=>!walkable(p))
const vector:Record<string,Pos>={N:[0,-1],S:[0,1],E:[1,0],W:[-1,0],UP:[0,-1],DOWN:[0,1],LEFT:[-1,0],RIGHT:[1,0],WAIT:[0,0],PEEK:[0,0]}
export const doorBlocks=(a:Pos,b:Pos)=>(same(a,[4,3])&&same(b,[5,3]))||(same(a,[5,3])&&same(b,[4,3]))
export function advance(r:Robot):Robot{
  if(r.pauseRemaining===1)return {pos:[...r.pos],heading:r.heading==='S'?'N':'S',pauseRemaining:0}
  const pos:Pos=[5,r.pos[1]+(r.heading==='S'?1:-1)]
  return {pos,heading:r.heading,pauseRemaining:pos[1]===1||pos[1]===4?1:0}
}
export function initial(phase:number):State{
  if(!Number.isInteger(phase)||phase<0||phase>=8)throw Error('Invalid phase')
  let robot:Robot={pos:[5,1],heading:'S',pauseRemaining:0}
  for(let i=0;i<phase;i++)robot=advance(robot)
  return {tick:0,player:[1,3],robot,outcome:'running'}
}
export function vision(r:Pick<Robot,'pos'|'heading'>):Pos[]{
  const d=vector[r.heading],cells:Pos[]=[];let prev=r.pos
  for(let i=1;i<=3;i++){
    const p:Pos=[r.pos[0]+i*d[0],r.pos[1]+i*d[1]]
    if(!walkable(p)||doorBlocks(prev,p))break
    cells.push(p);prev=p
  }
  return cells
}
export function move(p:Pos,a:Action):Pos{
  const d=vector[a],q:Pos=[p[0]+d[0],p[1]+d[1]]
  return walkable(q)?q:[...p]
}
export function danger(before:State,player:Pos,robot:Pick<Robot,'pos'|'heading'>):Outcome{
  if(same(player,robot.pos))return 'collision'
  if(same(before.player,robot.pos)&&same(player,before.robot.pos))return 'swap'
  if(vision(robot).some(p=>same(p,player)))return 'vision'
  return 'running'
}
export function step(s:State,a:Action):State{
  if(s.outcome!=='running')throw Error('Cannot step terminal state')
  if(![...actions,'PEEK'].includes(a))throw Error('Invalid action')
  const player=move(s.player,a),robot=advance(s.robot),tick=s.tick+1
  let outcome=danger(s,player,robot)
  if(outcome==='running')outcome=same(player,spec.exit)?'success':tick>=30?'timeout':'running'
  return {tick,player,robot,outcome}
}
export function solve(start:State):Action[]|null{
  const q:{state:State;path:Action[]}[]=[{state:start,path:[]}],seen=new Set<string>()
  for(let i=0;i<q.length;i++){
    const {state:s,path}=q[i]
    if(s.outcome==='success')return path
    if(s.outcome!=='running')continue
    const key=JSON.stringify([s.tick,s.player])
    if(seen.has(key))continue
    seen.add(key)
    for(const a of actions)q.push({state:step(s,a),path:[...path,a]})
  }
  return null
}
export type Baseline='Oracle'|'Blind-Rush'|'Memoryless-Reactive'
export function baseline(phase:number,policy:Baseline){
  const states=[initial(phase)],path:Action[]=[]
  const oracle=policy==='Oracle'?solve(states[0]):null
  if(policy==='Oracle'&&!oracle)throw Error('Unsolvable')
  while(states.at(-1)!.outcome==='running'){
    const s=states.at(-1)!,a=policy==='Oracle'?oracle![path.length]:
      policy==='Memoryless-Reactive'&&same(s.player,[1,3])&&same(s.robot.pos,[5,3])?'WAIT':'RIGHT'
    path.push(a);states.push(step(s,a))
  }
  return {policy,phase,path,states,outcome:states.at(-1)!.outcome}
}
