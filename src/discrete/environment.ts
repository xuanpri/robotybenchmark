export type Pos = [number, number]
export type Heading = 'N' | 'S' | 'E' | 'W'
export const actions = ['WAIT', 'RIGHT', 'UP', 'DOWN', 'LEFT'] as const
export type Action = typeof actions[number]
export type Robot = {pos: Pos; heading: Heading; pauseRemaining: number}
export type Outcome = 'running' | 'success' | 'collision' | 'swap' | 'vision' | 'timeout' | 'format'
export type State = {tick: number; player: Pos; robot: Robot; outcome: Outcome}
export const spec = {width: 10, height: 6, maxTicks: 30, visionRange: 2,
  spawn: [1, 3] as Pos, exit: [8, 3] as Pos, patrolX: 2, endpointPause: 2}
export const phases = [0, 1, 4, 6, 10] as const
const vectors: Record<Heading, Pos> = {N:[0,-1], S:[0,1], E:[1,0], W:[-1,0]}
const moves: Record<Action, Pos> = {UP:vectors.N, DOWN:vectors.S, LEFT:vectors.W, RIGHT:vectors.E, WAIT:[0,0]}
export const equal = (a: Pos, b: Pos) => a[0] === b[0] && a[1] === b[1]
export const inside = ([x,z]: Pos) => Number.isInteger(x) && Number.isInteger(z) && x >= 0 && x < spec.width && z >= 0 && z < spec.height
export const walkable = (p: Pos) => inside(p) && (p[0] === 2 || p[1] === 3 && p[0] >= 1 && p[0] <= 8)
export const walls: Pos[] = Array.from({length:60},(_,i):Pos=>[i%10,Math.floor(i/10)]).filter(p=>!walkable(p))
// Arrival sets a two-transition pause. Heading stays inbound during the first
// stationary transition, reverses on the second; movement resumes next tick.
export function advanceRobot(r: Robot): Robot {
  if(r.pauseRemaining > 0) return {pos:[...r.pos], pauseRemaining:r.pauseRemaining-1,
    heading:r.pauseRemaining === 1 ? (r.heading === 'S' ? 'N' : 'S') : r.heading}
  const dz = r.heading === 'S' ? 1 : -1
  const pos: Pos = [2,r.pos[1]+dz]
  return {pos, heading:r.heading, pauseRemaining:pos[1] === 0 || pos[1] === 5 ? 2 : 0}
}
export function vision(r: Pick<Robot,'pos'|'heading'>): Pos[] {
  const [dx,dz] = vectors[r.heading], cells: Pos[] = []
  for(let n=1;n<=spec.visionRange;n++){
    const p: Pos = [r.pos[0]+dx*n,r.pos[1]+dz*n]
    if(!walkable(p))break
    cells.push(p)
  }
  return cells
}
export function initial(phase: number): State {
  if(!Number.isInteger(phase) || phase < 0 || phase >= 14) throw Error('phase must be 0..13')
  let robot: Robot = {pos:[2,0],heading:'S',pauseRemaining:0}
  for(let i=0;i<phase;i++)robot=advanceRobot(robot)
  return {tick:0, player:[...spec.spawn],robot,outcome:'running'}
}
export function movePlayer(player: Pos, action: Action): Pos {
  const d=moves[action], p: Pos=[player[0]+d[0],player[1]+d[1]]
  return walkable(p) ? p : [...player]
}
export function danger(before: State, player: Pos, robot: Pick<Robot,'pos'|'heading'>): Outcome {
  if(equal(player,robot.pos))return 'collision'
  if(equal(before.player,robot.pos) && equal(player,before.robot.pos))return 'swap'
  if(vision(robot).some(p=>equal(p,player)))return 'vision'
  return 'running'
}
export function step(s: State, action: Action): State {
  if(s.outcome !== 'running')throw Error('terminal state')
  if(!actions.includes(action))throw Error('invalid action')
  const player=movePlayer(s.player,action), robot=advanceRobot(s.robot), tick=s.tick+1
  let outcome=danger(s,player,robot)
  if(outcome==='running') outcome=equal(player,spec.exit) ? 'success' : tick>=spec.maxTicks ? 'timeout' : 'running'
  return {tick,player,robot,outcome}
}
export function future(s: State, count=6) {
  let r=s.robot
  return Array.from({length:count},(_,i)=>{r=advanceRobot(r);return {tick:s.tick+i+1,...r,vision:vision(r)}})
}
export function solve(start: State): Action[] | null {
  const queue: {s:State; path:Action[]}[]=[{s:start,path:[]}], seen=new Set<string>()
  for(let i=0;i<queue.length;i++){
    const {s,path}=queue[i]
    if(s.outcome==='success')return path
    if(s.outcome!=='running')continue
    const key=JSON.stringify([s.tick,s.player,s.robot])
    if(seen.has(key))continue
    seen.add(key)
    for(const action of actions)queue.push({s:step(s,action),path:[...path,action]})
  }
  return null
}
