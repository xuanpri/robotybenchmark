import {same,walls,spec,type State,type Pos,type Heading,type Action} from './environment'
export const conditions=['Omniscient','Partial-known','Partial-unknown-passive','Partial-unknown-interactive'] as const
export type Condition=typeof conditions[number]
export const maxAttempts=(c:Condition)=>c.startsWith('Partial-unknown')?3:1
export type Sighting={pos:Pos;heading:Heading}
export type Observation={tick:number;player:Pos;outcome:State['outcome'];robot:Sighting|null;source:'global'|'window'|'peek'|'occluded'}
export type Decision={predicted_next:Sighting;action:Action;reason:string}
export type PublicAttempt={attempt:number;observations:Observation[];decisions:Decision[];failureReason:string|null}
// Explicit allowlist projection: never spread private state into model input.
export function observe(s:State,c:Condition,peek=false):Observation{
  const source=c==='Omniscient'?'global':same(s.player,[1,3])?'window':peek?'peek':'occluded'
  return {tick:s.tick,player:[...s.player],outcome:s.outcome,
    robot:source==='occluded'?null:{pos:[...s.robot.pos],heading:s.robot.heading},source}
}
export const patrolRule='Patrol dynamics: the robot moves only on x=5, z=1..4, one cell per tick. S means z+1; N means z-1. On arriving at z=1 or z=4 it retains its inbound heading. On the next tick it stays at that endpoint and reverses heading. On the following tick it moves in the reversed direction. This repeats with period 8. The observed endpoint heading indicates whether the stationary reversal has occurred.'
const common=`You control a player on a 10 x 6 integer grid; x east, z south. Reach [8,3] alive within 30 actions. Choose one action each tick. UP/DOWN/LEFT/RIGHT move one cell; a wall or boundary leaves you in place. WAIT stays in place. The player and robot update simultaneously. After both update, same-cell collision, edge swap, or entering the robot's new forward cardinal vision ray (up to 3 cells, clipped by walls, boundaries and the opaque door) is fatal. Fatality precedes exit success; at tick 30 an alive exit arrival succeeds, otherwise timeout. The door edge [4,3]-[5,3] permits movement in one tick but blocks sight. Movement itself never reveals the robot through that door. This is a single run; retries, when allowed, reset both actors to the same initial configuration. Use only provided observations and your own estimates. For EVERY action, including when robot is null, predict the robot's position and heading at the NEXT tick. Return a pure JSON object with exactly predicted_next, action, reason. No markdown.`
const local='Observation: the window at [1,3] reveals the robot current position and heading. At all other cells robot is null unless an authorized PEEK just ended. Null means unavailable; no hidden robot state or true prediction feedback is supplied. Past sightings remain historical, not current observations.'
export function messages(c:Condition,attempt:number,current:Observation,history:PublicAttempt[],active:PublicAttempt){
  const interactive=c==='Partial-unknown-interactive'
  const system=common+'\n'+(c==='Omniscient'?'Observation: robot current position and heading are globally visible.':local)+'\n'+
    (c==='Omniscient'||c==='Partial-known'?patrolRule+'\n':'')+
    (interactive?'PEEK is allowed: stay in place for one tick, advance the world normally, then receive one sighting of the robot at that step end. It does not protect against death.':'PEEK is not allowed.')+
    '\nSchema: {"predicted_next":{"pos":[x,z],"heading":"N|S|E|W"},"action":"'+(interactive?'UP|DOWN|LEFT|RIGHT|WAIT|PEEK':'UP|DOWN|LEFT|RIGHT|WAIT')+'","reason":"..."}'
  return [{role:'system' as const,content:system},{role:'user' as const,content:JSON.stringify({
    grid:{width:10,height:6,walls,spawn:spec.spawn,exit:spec.exit,opaquePassableDoor:spec.airlock},
    attempt,maxAttempts:maxAttempts(c),current,previous_attempts:history,active_attempt:active})}]
}
export function parse(content:string,c:Condition):Decision{
  const d=JSON.parse(content),keys=['predicted_next','action','reason']
  if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).length!==3||keys.some(k=>!(k in d)))throw Error('Expected exact decision schema')
  const p=d.predicted_next
  if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).length!==2||!('pos'in p)||!('heading'in p)||
    !Array.isArray(p.pos)||p.pos.length!==2||!p.pos.every(Number.isInteger)||p.pos[0]<0||p.pos[0]>9||p.pos[1]<0||p.pos[1]>5||!['N','S','E','W'].includes(p.heading))throw Error('Invalid predicted_next')
  const allowed=['UP','DOWN','LEFT','RIGHT','WAIT',...(c==='Partial-unknown-interactive'?['PEEK']:[])]
  if(!allowed.includes(d.action)||typeof d.reason!=='string')throw Error('Invalid action or reason')
  return d
}
