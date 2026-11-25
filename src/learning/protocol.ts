import standard from '../../config/learning.json'
import registry from '../../config/local-agents.json'
import {actions,defaults,type Action,type Config} from '../sim/config'
import {createSession,type Frame} from '../sim/session'
import {TICK} from '../sim/world'
export {registry}
export type Memory='M0'|'M1'|'M2'
export type Reset='Same'|'PhaseShift'|'FreshDynamics'
export interface Settings extends Omit<typeof standard,'memory'|'protocol'|'transfer'> {
  memory:Memory;protocol:Reset;transfer:Exclude<Reset,'Same'>[];replayFile?:string;replayAttempt?:string
}
export function settings(overrides:Partial<Settings>={}):Settings{
  const s={...structuredClone(standard),...overrides} as Settings
  for(const k of ['initialHP','failureCost','maxAttempts','maxActions','tokenBudget','modelOutput'] as const)
    if(!Number.isSafeInteger(s[k])||s[k]<=0)throw Error('Invalid '+k)
  for(const k of ['memoryBudget','currentHistory','masteryTrials','seed'] as const)
    if(!Number.isSafeInteger(s[k])||s[k]<0)throw Error('Invalid '+k)
  if(!['M0','M1','M2'].includes(s.memory)||!['Same','PhaseShift','FreshDynamics'].includes(s.protocol)||s.transfer.some(t=>!['PhaseShift','FreshDynamics'].includes(t)))throw Error('Unknown condition')
  if(!s.durations.length||s.durations.some(t=>!(t>0)||!Number.isFinite(t)||Math.abs(t/TICK-Math.round(t/TICK))>1e-8))throw Error('Durations must be positive tick multiples')
  if(!['oracle','mock','invalid-mock','random','heuristic','replay',...Object.keys(registry)].includes(s.agent))throw Error('Unregistered agent')
  return s
}
export function draw(seed:number){
  let state=seed>>>0
  return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/2**32}
}
export function variant(base:Config,seed:number,protocol:Reset,index:number){
  const cfg=structuredClone(base)
  if(index===0||protocol==='Same')return cfg
  const random=draw(seed+7919*index)
  for(const p of cfg.patrols){
    if(protocol==='PhaseShift')p.phase=(p.phase+.12+.76*random())%1
    else {const scale=.7+random()*.6;p.speed*=scale;p.pause+=random()*.45;delete p.periodSeconds}
  }
  return cfg
}
export interface Choice {action:Action;duration:number;reason?:string}
export function parseChoice(text:string,s:Settings):Choice{
  const obj=JSON.parse(text)
  if(!obj||!actions.includes(obj.action)||!s.durations.includes(obj.duration)||Object.keys(obj).some(k=>!['action','duration','reason'].includes(k))||(obj.reason!==undefined&&typeof obj.reason!=='string'))throw Error('invalid_response')
  return obj
}
export class LearningWorld {
  private session= createSession()
  private history:Frame[]=[]
  reset(seed:number,cfg:Config=defaults()){
    this.session.reset(seed,cfg);this.history=[];return this.observe()
  }
  observe(){return this.session.view('limited')}
  get_public_history(){return structuredClone(this.history)}
  get_private_evaluation(){return this.session.getGroundTruth()}
  step(choice:Choice,onTick:()=>void=()=>{}){
    const before=this.observe()
    if(before.outcome!=='active')throw Error('Attempt has ended')
    if(!actions.includes(choice.action))throw Error('Unknown action')
    let left=Math.round(choice.duration/TICK)
    if(!Number.isSafeInteger(left)||left<=0||Math.abs(left*TICK-choice.duration)>1e-8)throw Error('Invalid duration')
    this.history.push(before)
    while(left-->0 && this.observe().outcome==='active'){this.session.step(choice.action);onTick()}
    return this.observe()
  }
  sample(){return {full:this.session.view('omniscient'),limited:this.observe()}}
}
export type PublicTurn={before:Frame;choice?:Choice;after:Frame;feedback:string}
export interface Experience {observations:string;failure:string;next:string;uncertainty:string}
export function parseExperience(raw:string):Experience{
  const obj=JSON.parse(raw),keys=['observations','failure','next','uncertainty']
  if(!obj||Object.keys(obj).length!==4||keys.some(k=>typeof obj[k]!=='string'))throw Error('invalid_memory')
  return obj
}
export interface AgentInput {
  task:string;map:Config['room'];goal:Config['room']['exit'];current:Frame;hp:number;attempt:number;
  remaining:{actions:number;tokens:number;time:number;attempts:number};legal:readonly Action[];durations:number[];
  history:PublicTurn[];memory:unknown[]
}
