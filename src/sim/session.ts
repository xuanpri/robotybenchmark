import {actions,defaults,type Config,type Action,type Point} from './config'
import {DT,Physics,observable} from './world'
import type {Robot} from './patrol'
export type Mode='omniscient'|'limited'|'debug'
function disclose(r:Robot){return {id:r.id,position:[...r.position] as Point,heading:r.heading}}
export type Sighting=ReturnType<typeof disclose>
export interface Sample {time:number;player:Point;robots:Sighting[]}
export function createSession(seed=1,config=defaults()){
  let settings:Config,physics:Physics,state:ReturnType<Physics['initial']>,history:Sample[]=[],attempt=1,initialSeed=seed
  function frame(mode:Mode){
    const bots=physics.robots(state.clock)
    return {time:state.clock*DT,player:[...state.player] as Point,heading:state.heading,outcome:state.outcome,
      robots:bots.filter(r=>mode!=='limited'||observable(state.player,r.position,settings)).map(disclose)}
  }
  function remember(){
    const {time,player,robots}=frame(settings.observation)
    history.push({time,player,robots});if(history.length>16)history.shift()
  }
  function observe(){
    const f=frame(settings.observation)
    return structuredClone({...f,actions:f.outcome==='active'?[...actions]:[],map:settings.room,goal:settings.room.exit,
      attempt,maxAttempts:settings.maxAttempts,history,
      ...(settings.publishRules?{rules:settings.patrols.slice(0,settings.robotCount).map(({id,nodes,speed,pause,turn,periodSeconds})=>({id,nodes,speed,pause,turn,...(periodSeconds===undefined?{}:{periodSeconds})}))}:{})})
  }
  function restart(){
    state=physics.initial();history=[];remember();return observe()
  }
  function reset(nextSeed=initialSeed,nextConfig=settings){
    const next=structuredClone(nextConfig),engine=new Physics(next,nextSeed)
    settings=next;physics=engine;initialSeed=nextSeed;attempt=1;return restart()
  }
  function step(action:Action){state=physics.advance(state,action);remember();return observe()}
  reset(seed,config)
  return {
    agent:Object.freeze({observe,step}),reset,observe,step,
    retry(){if(state.outcome==='active'||state.outcome==='escaped'||attempt>=settings.maxAttempts)throw Error('Retry unavailable');attempt++;return restart()},
    view:frame,
    getGroundTruth(){return structuredClone({...state,time:state.clock*DT,robots:physics.robots(state.clock),attempt,seed:initialSeed})}
  }
}
export type Frame=ReturnType<ReturnType<typeof createSession>['view']>
