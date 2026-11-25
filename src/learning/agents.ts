import {actions,direction,type Action,type Config} from '../sim/config'
import {distance,wallHit} from '../sim/geometry'
import {oracle} from '../sim/oracle'
import {draw,registry,type AgentInput,type Choice,type Settings,type Experience} from './protocol'
export type Spec=typeof registry[keyof typeof registry]
export interface Reply {raw:string;content:string;inputTokens:number;outputTokens:number;latency:number;inferenceLatency?:number;usageKnown?:boolean;error?:string}
export const modelSpec=(id:string):Spec|undefined=>Object.hasOwn(registry,id)?registry[id as keyof typeof registry]:undefined
export type ContentPart={type:'text';text:string}|{type:'image_url';image_url:{url:string}}
export type Messages<Content=string>={role:'system'|'user';content:Content}[]
export type TextMessages={role:'system'|'user';content:string}[]
export function messages(input:AgentInput,reflect=false):TextMessages{
  return [{role:'system',content:reflect?
    'Summarize only your public experience. Return JSON with string fields observations, failure, next, uncertainty. Distinguish observation from hypothesis.':
    'Reach the marked exit. Coordinates are [east,south] in meters. Avoid contact and the unobstructed 90 degree, 5 m patrol sight. North decreases the second coordinate. World time stops while deciding. Return one JSON object with action, duration in seconds and optional short reason. Choose only listed values.'},
    {role:'user',content:JSON.stringify(input)}]
}
function endpoint(spec:Spec,path:string){
  const url=new URL(spec.endpoint)
  if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password)throw Error('Local endpoint required')
  return path==='/tokenize'?url.origin+path:spec.endpoint+path
}
async function post(url:string,body:unknown){
  const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},redirect:'error',body:JSON.stringify(body),signal:AbortSignal.timeout(60000)})
  return {ok:res.ok,raw:await res.text()}
}
export function reasoning(spec:Spec){
  return spec.reasoning_mode==='nonthinking'?{chat_template_kwargs:{enable_thinking:false}}:{reasoning_effort:'low'}
}
export async function countTokens(spec:Spec|undefined,content:string|Messages){
  if(!spec)return Buffer.byteLength(typeof content==='string'?content:JSON.stringify(content))
  const request=typeof content==='string'?{prompt:content,add_special_tokens:false}:{messages:content,...reasoning(spec)}
  const res=await post(endpoint(spec,'/tokenize'),{model:spec.model_id,...request})
  const n=JSON.parse(res.raw).count
  if(!res.ok||!Number.isSafeInteger(n)||n<0)throw Error('tokenizer_unavailable')
  return n as number
}
export async function fitMemory(records:unknown[],limit:number,spec?:Spec){
  // Keep a contiguous suffix of whole records. No partial observations or invented summaries.
  let lo=0,hi=records.length,units=0
  while(lo<hi){
    const n=Math.ceil((lo+hi)/2),count=await countTokens(spec,JSON.stringify(records.slice(-n)))
    if(count<=limit){lo=n;units=count}else hi=n-1
  }
  if(lo)units=await countTokens(spec,JSON.stringify(records.slice(-lo)))
  return {records:lo?records.slice(-lo):[],units,discarded:records.length-lo}
}
export async function complete(spec:Spec,body:Record<string,unknown>):Promise<Reply>{
  const start=performance.now();let raw=''
  try{
    const res=await post(endpoint(spec,'/chat/completions'),body);raw=res.raw
    if(!res.ok)throw Error('provider_error')
    const data=JSON.parse(raw),choice=data.choices?.[0],usage=data.usage
    if(data.model!==spec.model_id)throw Error('model_mismatch')
    if(!Number.isSafeInteger(usage?.prompt_tokens)||!Number.isSafeInteger(usage?.completion_tokens))throw Error('missing_usage')
    return {raw,content:choice?.message?.content??'',inputTokens:usage.prompt_tokens,outputTokens:usage.completion_tokens,latency:(performance.now()-start)/1000,inferenceLatency:(performance.now()-start)/1000,usageKnown:true,
      error:choice?.finish_reason==='length'?'truncated':choice?.message?.refusal?'refusal':choice?.finish_reason!=='stop'?'invalid_response':undefined}
  }catch(e){return {raw,content:'',inputTokens:0,outputTokens:0,latency:(performance.now()-start)/1000,inferenceLatency:(performance.now()-start)/1000,usageKnown:false,error:(e as Error).name==='TimeoutError'?'provider_timeout':(e as Error).message}}
}
export function reflectPublic(o:AgentInput):Experience {
  const last=o.history.at(-1)
  return {observations:'Terminal position '+JSON.stringify(o.current.player),failure:last?.feedback??o.current.outcome,
    next:last?.choice?'Avoid repeating '+last.choice.action+' near '+JSON.stringify(last.before.player):'Reinspect visible patrols',
    uncertainty:'Only locally observed positions are known.'}
}
function heuristic(o:AgentInput):Choice {
  const [x,z]=o.current.player,[gx,gz]=o.goal
  const choices=actions.slice(0,4).map(action=>{
    const d=direction[action],p:[number,number]=[x+d[0]*.5,z+d[1]*.5]
    const blocked=wallHit(o.current.player,p,o.map,.28)<Infinity
    let cost=Math.abs(p[0]-gx)+Math.abs(p[1]-gz)+(blocked?1000:0)
    for(const r of o.current.robots)if(distance(r.position,p)<2)cost+=4
    for(const prev of o.history)if(distance(prev.before.player,p)<.2)cost+=1.1
    // A deliberately simple public failure cue, shared by raw and self-summary memory.
    for(const item of o.memory as {next?:string;choice?:Choice;before?:{player:[number,number]};feedback?:string}[]){
      if(item.next?.includes('Avoid repeating '+action+' near '+JSON.stringify(o.current.player))||
        (item.choice?.action===action && item.before && item.feedback!=='active' && distance(item.before.player,o.current.player)<.3))cost+=4
    }
    return {action,cost}
  }).sort((a,b)=>a.cost-b.cost)
  return {action:choices[0].action,duration:o.durations.includes(.2)?.2:o.durations[0],reason:'Minimize public goal distance with wall, nearby patrol and recent position penalties.'}
}
export function programAgent(s:Settings,cfg:Config,attemptSeed:number,replay:(Action|Choice)[]=[]){
  const random=draw(attemptSeed),seq=s.agent==='oracle'?oracle(s.seed,cfg).actions:replay
  let cursor=0
  return (o:AgentInput,reflection:boolean)=>{
    if(reflection)return JSON.stringify(reflectPublic(o))
    if(s.agent==='invalid-mock')return 'unknown action'
    if(s.agent==='heuristic')return JSON.stringify(heuristic(o))
    if(s.agent==='random')return JSON.stringify({action:actions[Math.floor(random()*5)],duration:s.durations[Math.floor(random()*s.durations.length)]})
    if(s.agent==='mock')return JSON.stringify({action:'MOVE_EAST',duration:s.durations.at(-1),reason:'Scripted interface check.'})
    if(!['oracle','replay'].includes(s.agent))throw Error('No programmatic policy registered')
    const action=seq[cursor]
    if(typeof action==='object'){cursor++;return JSON.stringify(action)}
    const duration=[...s.durations].sort((a,b)=>b-a).find(d=>{
      const n=Math.round(d*10);return cursor+n<=seq.length && seq.slice(cursor,cursor+n).every(a=>a===action)
    })
    if(!duration)throw Error('sequence_exhausted_or_incompatible')
    cursor+=Math.round(duration*10)
    return JSON.stringify({action,duration,reason:s.agent==='oracle'?'Privileged search':'Recorded action sequence'})
  }
}
