import {observe as project,parse as parseBlind,type Condition as OldCondition,type Observation,type PublicAttempt,type Decision} from '../blind/public'
import {spec,walls,type State,type Instance} from './world'
export type {Observation,PublicAttempt,Decision}
export type Condition='Partial-unknown-passive'|'Partial-unknown-interactive'|'Omniscient'
export const observe=(s:State,c:Condition,peek=false):Observation=>project(s,c,peek)
export const parse=(raw:string,c:Condition):Decision=>parseBlind(raw,c as OldCondition)
const common=`Control a player on a 10 x 6 integer grid; x east, z south. Reach [8,3] alive within 30 actions. UP/DOWN/LEFT/RIGHT move one cell; walls or boundaries leave you in place. WAIT stays in place. Both actors update simultaneously; same-cell collision, edge swap, or the player in the robot's updated forward cardinal vision ray (up to 3 cells, clipped by walls, boundaries and the opaque door) is fatal. Death precedes exit. At tick 30 an alive exit arrival succeeds, otherwise timeout. The door edge [4,3]-[5,3] permits a one-tick movement but blocks sight. A window at [1,3] reveals the current robot position and heading. Elsewhere robot is null unless a permitted PEEK just ended. Null means unavailable, not absence. Prior sightings are historical. Each attempt restarts the player; robot behavior or initial state may differ across attempts. Infer only from legal observations; previous estimates are not true-state feedback. For EVERY action, predict the robot's position and heading at the NEXT tick, including while hidden. Return only a JSON object with exactly predicted_next, action, reason. No markdown.`
function oracleRule(i:Instance){
  const p=i.params!
  return `For this globally observed verification episode only: the robot traverses x=5, z=${p.min}..${p.max}. South moves occur once per ${p.southSpeed} ticks and north moves once per ${p.northSpeed} ticks. After a movement, cooldown is set to the new heading's speed minus 1; a positive cooldown causes one stationary decrement per tick. Endpoint arrival ${p.alt?'chooses pause=altNext and toggles altNext between 0 and 2':`sets pauseRemaining to ${p.northPause} at the north end and ${p.southPause} at the south end`}. If pause=0 it reverses immediately on arrival; otherwise it retains heading, counts down in place on subsequent ticks, and reverses when the countdown reaches zero. Reversal sets cooldown to the new heading's speed minus 1. ${p.stutter?'Arrival at interior z=3 sets stutterRemaining=1; the next tick stays in place and decrements it without changing heading.':'There is no interior stutter.'} Positive pauseRemaining has priority over stutterRemaining, which has priority over cooldown, which has priority over movement. The mechanism counters below are current values, not future states.`
}
export function messages(c:Condition,n:number,current:Observation,history:PublicAttempt[],active:PublicAttempt,i:Instance,s:State){
  const interactive=c==='Partial-unknown-interactive'
  const system=common+'\n'+(c==='Omniscient'?'In this verification episode the robot is globally visible. '+oracleRule(i)+'\n':'')+
    (interactive?'PEEK is allowed: stay in place for one tick, advance the world normally, then receive one robot sighting at that step end. It does not protect against failure.':'PEEK is forbidden.')+
    '\nSchema: {"predicted_next":{"pos":[x,z],"heading":"N|S|E|W"},"action":"'+(interactive?'UP|DOWN|LEFT|RIGHT|WAIT|PEEK':'UP|DOWN|LEFT|RIGHT|WAIT')+'","reason":"..."}'
  return [{role:'system' as const,content:system},{role:'user' as const,content:JSON.stringify({grid:{width:10,height:6,walls,spawn:spec.spawn,exit:spec.exit,opaquePassableDoor:spec.airlock},
    attempt:n,maxAttempts:c==='Omniscient'?1:5,current,previous_attempts:history,active_attempt:active,
    ...(c==='Omniscient'?{mechanism_state:{pauseRemaining:s.robot.pauseRemaining,cooldown:s.robot.cooldown,stutterRemaining:s.robot.stutterRemaining,altNext:s.robot.altNext}}:{})})}]
}
