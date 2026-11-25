import {patrolRule} from '../blind/public'
import {same,danger,move,type State,type Pos,type Heading,type Action} from '../blind/environment'
import {imageObservation,type Condition} from './render-agent-view'
export type Decision={perceived_current:{player_pos:Pos;robot_visible:boolean;robot_pos:Pos|null;robot_heading:Heading|null};predicted_next:{pos:Pos;heading:Heading};action:Exclude<Action,'PEEK'>;reason:string}
const common=`Control the blue P player on a 10 by 6 integer grid. x increases east and z south; read coordinates from the image axes. Reach the green GOAL alive within 30 actions. UP/DOWN/LEFT/RIGHT move one cell, walls or boundaries leave you in place. WAIT stays in place. Both actors update simultaneously; after updating, same-cell collision, an edge swap or the player in the robot's new forward straight vision ray (up to 3 cells, stopped by walls, boundaries and the opaque door) is fatal. Death precedes exit success; an alive arrival at tick 30 succeeds, otherwise timeout. The orange opaque door allows movement in one tick but blocks sight. Blue circle P is the player; red square is the robot, whose arrow and N/S/E/W label show heading; pink cells show its vision. Gray OCCLUDED denotes unavailable visual observation, not absence of a robot. Only the current image is provided. History entries are YOUR previous estimates, not ground truth or correctness feedback. PEEK is forbidden. There is one fresh attempt. Report perceived CURRENT state and predict the robot's NEXT tick state, including when hidden. Return only one JSON object, without markdown. Schema: {"perceived_current":{"player_pos":[x,z],"robot_visible":true,"robot_pos":[x,z],"robot_heading":"N|S|E|W"},"predicted_next":{"pos":[x,z],"heading":"N|S|E|W"},"action":"UP|DOWN|LEFT|RIGHT|WAIT","reason":"..."}. When robot_visible is false, robot_pos and robot_heading MUST be null.`
export function textMessages(c:Condition,tick:number,history:string[]){return [{role:'system' as const,content:common+'\n'+patrolRule+'\n'+(c==='Omniscient-Vision'?'The image shows the robot globally.':'The robot is drawn only while the player is at the observation window. Everywhere else it is hidden; infer from your own prior sightings.')},
 {role:'user' as const,content:JSON.stringify({tick,own_history:history})}]}
export function compact(tick:number,d:Decision){const p=d.perceived_current;return `t=${tick}: perceived=P(${p.player_pos.join(',')}) R${p.robot_visible?`(${p.robot_pos!.join(',')})${p.robot_heading}`:'hidden'} | pred=R(${d.predicted_next.pos.join(',')})${d.predicted_next.heading} | act=${d.action}`}
const pos=(p:any)=>Array.isArray(p)&&p.length===2&&p.every(Number.isInteger)&&p[0]>=0&&p[0]<10&&p[1]>=0&&p[1]<6
const heading=(h:any)=>['N','S','E','W'].includes(h)
const keys=(o:any,k:string[])=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===k.length&&k.every(x=>x in o)
export function parse(raw:string):Decision{
 const d=JSON.parse(raw)
 if(!keys(d,['perceived_current','predicted_next','action','reason'])||!keys(d.perceived_current,['player_pos','robot_visible','robot_pos','robot_heading'])||!keys(d.predicted_next,['pos','heading']))throw Error('Invalid schema')
 const p=d.perceived_current
 if(!pos(p.player_pos)||typeof p.robot_visible!=='boolean'||(p.robot_visible?(!pos(p.robot_pos)||!heading(p.robot_heading)):(p.robot_pos!==null||p.robot_heading!==null))||!pos(d.predicted_next.pos)||!heading(d.predicted_next.heading)||!['UP','DOWN','LEFT','RIGHT','WAIT'].includes(d.action)||typeof d.reason!=='string')throw Error('Invalid fields')
 return d
}
export function perception(s:State,c:Condition,d:Decision){const truth=imageObservation(s,c),p=d.perceived_current;const player=same(p.player_pos,s.player),visible=p.robot_visible===(truth.robot!==null),robot=truth.robot!==null&&p.robot_visible&&p.robot_pos!==null&&same(p.robot_pos,truth.robot.pos)&&p.robot_heading===truth.robot.heading;return {player,visible,robot:truth.robot?robot:null,all:player&&visible&&(truth.robot?robot:p.robot_pos===null&&p.robot_heading===null)}}
export type Category='Format Error'|'Perception Error (Immediate)'|'Perception Error (Upstream Sighting)'|'Prediction Error'|'Action/Planning Error'
export function attribute(before:State,after:State,c:Condition,d:Decision|undefined,lastSightingPerceptionCorrect:boolean):Category{
 if(!d||after.outcome==='format')return 'Format Error'
 if(!perception(before,c,d).all)return 'Perception Error (Immediate)'
 if(['collision','swap','vision'].includes(after.outcome)&&danger(before,move(before.player,d.action),d.predicted_next)==='running')return lastSightingPerceptionCorrect?'Prediction Error':'Perception Error (Upstream Sighting)'
 return 'Action/Planning Error'
}
