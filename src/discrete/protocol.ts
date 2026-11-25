import {actions, spec, walls, vision, future, equal, danger, movePlayer, type Action, type Pos, type Heading, type State} from './environment'
export type Condition = 'Oracle' | 'Future-known' | 'Omniscient'
export type Decision = {action:Action; reason:string; predicted_next?:{pos:Pos;heading:Heading}}
export const rules = `You control a player on an integer 10 x 6 grid. x increases east, z south. Choose exactly one action per tick: UP, DOWN, LEFT, RIGHT, WAIT. Movement is one cell; walls and out-of-bounds movement leave you in place. The player and robot update simultaneously from t to t+1. After both updates, same-cell collision, an edge swap, or the player in the robot's new forward vision cells is fatal. Vision is a straight cardinal ray of length 2, stopped by a wall. Reach the exit alive within 30 actions; at tick 30 a surviving exit arrival succeeds, otherwise timeout. A fatal event takes precedence over reaching the exit. Reason from the observations and choose your action yourself.`
export const patrolRule = `The robot only traverses x=2, z=0..5. Heading S moves z+1 and N moves z-1, one cell per tick when pauseRemaining=0. Arrival at either endpoint sets pauseRemaining=2 and retains the arrival heading. With pauseRemaining=2, the next transition stays in place, retains heading, and changes pauseRemaining to 1. With pauseRemaining=1, the next transition stays in place, reverses heading, and changes pauseRemaining to 0. Movement in the reversed heading resumes on the following transition. This repeats deterministically.`
export function messages(condition: Exclude<Condition,'Oracle'>, s:State, history:unknown[]) {
  const schema=condition==='Omniscient'
    ? '{"predicted_next":{"pos":[x,z],"heading":"N|S|E|W"},"action":"UP|DOWN|LEFT|RIGHT|WAIT","reason":"..."}'
    : '{"action":"UP|DOWN|LEFT|RIGHT|WAIT","reason":"..."}'
  return [{role:'system' as const,content:rules+'\n'+(condition==='Omniscient'?patrolRule+'\n':'')+'Return only one JSON object, without markdown, with exactly this schema: '+schema},
    {role:'user' as const,content:JSON.stringify({grid:{width:spec.width,height:spec.height,walls,exit:spec.exit},
      current:{...s,robot:{...s.robot,vision:vision(s.robot)}},history,
      ...(condition==='Future-known'?{future_robot:future(s)}:{})})}]
}
export function parse(content:string, condition:Exclude<Condition,'Oracle'>): Decision {
  const d=JSON.parse(content)
  if(!d || typeof d!=='object' || Array.isArray(d))throw Error('response must be object')
  const keys=condition==='Omniscient'?['action','reason','predicted_next']:['action','reason']
  if(Object.keys(d).length!==keys.length || keys.some(k=>!(k in d)) || !actions.includes(d.action) || typeof d.reason!=='string')throw Error('invalid response schema')
  if(condition==='Omniscient'){
    const p=d.predicted_next
    if(!p || Object.keys(p).length!==2 || !Array.isArray(p.pos) || p.pos.length!==2 || !p.pos.every(Number.isInteger) || p.pos[0]<0 || p.pos[0]>9 || p.pos[1]<0 || p.pos[1]>5 || !['N','S','E','W'].includes(p.heading))throw Error('invalid prediction schema')
  }
  return d
}
export function predictionCorrect(d:Decision, after:State) {
  return !!d.predicted_next && equal(d.predicted_next.pos,after.robot.pos) && d.predicted_next.heading===after.robot.heading
}
export type Attribution = 'Prediction Error' | 'Action/Planning Error' | 'Format Error'
export function attribute(before:State, after:State, d?:Decision): {category:Attribution; evidence:string} {
  if(after.outcome==='format')return {category:'Format Error',evidence:'Response failed strict JSON/schema validation; no fallback action executed.'}
  if(d?.predicted_next && !predictionCorrect(d,after) && ['vision','collision','swap'].includes(after.outcome)){
    const counterfactual=danger(before,movePlayer(before.player,d.action),d.predicted_next)
    if(counterfactual==='running')return {category:'Prediction Error',evidence:'Fatal action is safe under the reported next robot state, but fatal under ground truth (one-step counterfactual).'}
  }
  return {category:'Action/Planning Error',evidence:d?.predicted_next && !predictionCorrect(d,after)
    ? 'Prediction is incorrect, but replacing truth with it does not remove the fatal event; timeout is also a planning error.'
    : 'Future truth was supplied or the terminal next-state prediction was correct; the chosen action failed or the action budget expired.'}
}
