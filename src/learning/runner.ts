import {existsSync,mkdirSync,readFileSync,writeFileSync,linkSync,unlinkSync} from 'node:fs'
import {join} from 'node:path'
import {randomUUID} from 'node:crypto'
import {actions,defaults,type Action,type Config} from '../sim/config'
import {distance} from '../sim/geometry'
import type {AttemptFilm,Replay} from '../video/replay'
import {LearningWorld,parseChoice,parseExperience,variant,type AgentInput,type Choice,type Experience,type PublicTurn,type Settings} from './protocol'
import {complete,countTokens,fitMemory,messages,modelSpec,programAgent,reasoning,type Reply} from './agents'

const json=(v:unknown)=>JSON.stringify(v)
function read<T>(path:string):T{return JSON.parse(readFileSync(path,'utf8'))}
function immutable(path:string,text:string){
  if(existsSync(path)){if(readFileSync(path,'utf8')!==text)throw Error('Existing record differs: '+path);return}
  const tmp=path+'.'+randomUUID()+'.partial'
  writeFileSync(tmp,text,{flag:'wx',flush:true})
  try{linkSync(tmp,path)}finally{unlinkSync(tmp)}
}
interface RequestLog {
  id:string;kind:'act'|'reflect';provider:'local'|'programmatic';body:unknown;reply:Reply;
  memoryUnits:number;discarded:number;unit:string;historyDropped:number
}
interface Bundle {
  film:AttemptFilm;turns:PublicTurn[];requests:RequestLog[];truth:ReturnType<LearningWorld['get_private_evaluation']>[];
  summary:Experience|null;summaryError:string|null;terminalDistance:number;regions:string[];charged:boolean;
}
const message=(e:unknown)=>e instanceof Error?e.message:String(e)
function historyMemory(s:Settings,prior:Bundle[]):unknown[]{
  if(s.memory==='M1')return prior.flatMap(b=>b.turns.map(t=>({...t,attempt:b.film.attempt})))
  return s.memory==='M2'?prior.flatMap(b=>b.summary?[b.summary]:[]):[]
}
function localBudget(s:Settings){return {maxTime:s.maxTime,maxActions:s.maxActions,tokenBudget:s.tokenBudget}}
export async function runExperiment(dir:string,s:Settings){
  mkdirSync(dir,{recursive:true});const journal=join(dir,'journal');mkdirSync(journal,{recursive:true})
  const base=defaults();base.maxTime=s.maxTime
  const spec=modelSpec(s.agent)
  let source:(Action|Choice)[]=[]
  if(s.agent==='replay'){
    if(!s.replayFile)throw Error('Replay file is required')
    if(s.replayFile.endsWith('.jsonl')){
      const rows=readFileSync(s.replayFile,'utf8').trim().split('\n').map(l=>JSON.parse(l))
      const id=s.replayAttempt??rows[0]?.id
      source=rows.filter(r=>r.id===id).map(({action,duration,reason})=>({action,duration,reason}))
    }else source=read<{actions:Action[]}>(s.replayFile).actions
    if(!Array.isArray(source)||!source.length)throw Error('No recorded actions for replay')
  }
  const metadata={version:'arena-learning-1',settings:s,base,agentClass:spec?'local-llm':s.agent==='oracle'?'privileged-oracle':'programmatic',
    model:spec??null,replayActions:source,unit:spec?'provider-token':'utf8-byte (program memory); inference tokens=0',
    policy:'Each unsuccessful terminal attempt costs HP once, including invalid output, token/action cap, timeout or provider error. Verified stages use separate budgets. Only completed explorations unlock verification.',
    memoryTruncation:'Longest contiguous suffix of whole public turns or agent summaries within memoryBudget; oldest current-history items dropped first for model context. Empty memory has zero payload units.',
    inferenceClock:'paused',tickSeconds:.1,collisionSeconds:.01}
  immutable(join(dir,'metadata.json'),json(metadata))
  if(existsSync(join(dir,'summary.json')))return read<ReturnType<typeof summarize>>(join(dir,'summary.json'))
  const completed:Bundle[]=[]
  async function attempt(stage:string,num:number,cfg:Config,hp:number,prior:Bundle[],remainingAttempts:number){
    const id=stage+'-'+num,where=join(journal,id);mkdirSync(where,{recursive:true})
    const sealed=join(where,'complete.json')
    if(existsSync(sealed)){const saved=read<Bundle>(sealed);completed.push(saved);return saved}
    const world=new LearningWorld();world.reset(s.seed,cfg)
    const film:AttemptFilm={id,stage,attempt:num,seed:s.seed,config:cfg,hp,after:hp,result:'active',frames:[world.sample()],decisions:[]}
    const b:Bundle={film,turns:[],requests:[],truth:[world.get_private_evaluation()],summary:null,summaryError:null,terminalDistance:0,regions:[],charged:false}
    const allMemory=historyMemory(s,prior)
    let spent=0,calls=0,count=0
    let policy:ReturnType<typeof programAgent>|undefined
    if(!spec && world.observe().outcome==='active'){
      try{policy=programAgent(s,cfg,s.seed+10007*num+stage.length*997,source)}
      catch(e){const failure=message(e);policy=()=>{throw Error(failure)}}
    }
    async function call(reflect:boolean){
      const key=String(++calls).padStart(4,'0'),saved=join(where,key+'.response.json'),pending=join(where,key+'.intent.json')
      if(existsSync(saved)){
        const row=read<RequestLog>(saved)
        // Reconstruct the internal RNG/sequence cursor of the program, never reissue an HTTP call.
        if(policy&&!reflect && row.body && 'current' in (row.body as AgentInput))try{policy(row.body as AgentInput,false)}catch{}
        b.requests.push(row);spent+=row.reply.inputTokens+row.reply.outputTokens;return row.reply
      }
      let body:unknown=null,units=0,discarded=0,historyDropped=0
      let reply:Reply={raw:'',content:'',inputTokens:0,outputTokens:0,latency:0},started=performance.now()
      try{
        if(existsSync(pending)){
          const intent=read<{body:unknown;units:number;discarded:number;historyDropped:number}>(pending)
          ;({body,units,discarded,historyDropped}=intent)
          throw Error('interrupted_request_unknown')
        }
        const memory=await fitMemory(allMemory,s.memoryBudget,spec)
        units=memory.units;discarded=memory.discarded
        const input:AgentInput={task:'Reach the green exit safely.',map:cfg.room,goal:cfg.room.exit,current:world.observe(),hp:reflect?film.after:hp,attempt:num,
          remaining:{actions:s.maxActions-count,tokens:s.tokenBudget-spent,time:cfg.maxTime-world.observe().time,attempts:remainingAttempts},
          legal:actions,durations:s.durations,history:s.currentHistory?b.turns.slice(-s.currentHistory):[],memory:memory.records}
        if(spec){
          let msgs=messages(input,reflect),tokens=await countTokens(spec,msgs)
          while(tokens>spec.input_limit&&input.history.length){input.history.shift();historyDropped++;msgs=messages(input,reflect);tokens=await countTokens(spec,msgs)}
          const max=Math.min(s.modelOutput,s.tokenBudget-spent-tokens)
          if(tokens>spec.input_limit||max<1){body={messages:msgs};throw Error('token_budget')}
          body={model:spec.model_id,messages:msgs,temperature:spec.temperature,max_tokens:max,...reasoning(spec)}
        }else body=input
        immutable(pending,json({body,units,discarded,historyDropped}))
        if(spec)reply=await complete(spec,body as Record<string,unknown>)
        else{
          const raw=policy?policy(input,reflect):JSON.stringify({observations:'Initial state',failure:input.current.outcome,next:'Inspect start',uncertainty:'No actions taken'})
          reply={...reply,raw,content:raw}
        }
      }catch(e){reply.error=message(e)}
      reply.latency=(performance.now()-started)/1000
      spent+=reply.outputTokens+reply.inputTokens
      if(spent>s.tokenBudget)reply.error='token_budget'
      const row:RequestLog={id:id+'/'+key,kind:reflect?'reflect':'act',provider:spec?'local':'programmatic',body,reply,memoryUnits:units,discarded,unit:spec?'provider-token':'utf8-byte',historyDropped}
      immutable(saved,json(row));b.requests.push(row);return reply
    }
    while(world.observe().outcome==='active'){
      if(count>=s.maxActions){film.result='action_budget';break}
      const before=world.observe(),r=await call(false)
      let choice:Choice
      try{if(r.error)throw Error(r.error);choice=parseChoice(r.content,s)}
      catch(e){film.result=r.error??'invalid_response';film.decisions.push({action:film.result,start:before.time,end:before.time,latency:r.latency})
        b.turns.push({before,after:before,feedback:film.result});break}
      const after=world.step(choice,()=>{film.frames.push(world.sample());b.truth.push(world.get_private_evaluation())})
      count++;film.decisions.push({action:choice.action,start:before.time,end:after.time,latency:r.latency,reason:choice.reason})
      b.turns.push({before,choice,after,feedback:after.outcome})
    }
    const last=world.observe()
    if(film.result==='active')film.result=last.outcome
    if(film.result==='action_budget'||!b.turns.length)b.turns.push({before:last,after:last,feedback:film.result})
    b.charged=film.result!=='escaped';film.after=b.charged?Math.max(0,hp-s.failureCost):hp
    const unmeteredCall=spec && b.requests.some(r=>r.reply.error && r.reply.inputTokens===0 && r.body && 'model' in (r.body as object))
    if(unmeteredCall && s.memory==='M2')b.summaryError='reflection_skipped_unknown_usage'
    if(stage==='exploration'&&s.memory==='M2' && !unmeteredCall){
      const r=await call(true);film.endLatency=r.latency
      try{if(r.error)throw Error(r.error);b.summary=parseExperience(r.content)}catch(e){b.summaryError=message(e)}
    }
    b.terminalDistance=distance(last.player,cfg.room.exit)
    b.regions=[...new Set(b.truth.map(t=>Math.floor(t.player[0]/4)+','+Math.floor(t.player[1]/4)))]
    immutable(sealed,json(b));completed.push(b);return b
  }
  let hp=s.initialHP,won:Bundle|undefined
  for(let n=1;n<=s.maxAttempts&&hp>0;n++){
    const b=await attempt('exploration',n,variant(base,s.seed,s.protocol,n-1),hp,completed.slice(),Math.min(s.maxAttempts-n+1,Math.ceil(hp/s.failureCost)))
    hp=b.film.after
    if(b.film.result==='escaped'){won=b;break}
  }
  if(won){
    const frozen=completed.slice()
    for(let n=1;n<=s.masteryTrials;n++)await attempt('mastery',n,won.film.config,s.initialHP,frozen,1)
    for(const [i,reset] of s.transfer.entries())await attempt('transfer-'+reset,i+1,variant(won.film.config,s.seed,reset,i+1),s.initialHP,frozen,1)
  }
  function lines(name:string,records:unknown[]){immutable(join(dir,name+'.jsonl'),records.map(json).join('\n')+(records.length?'\n':''))}
  lines('requests',completed.flatMap(b=>b.requests))
  lines('actions',completed.flatMap(b=>b.turns.flatMap((t,i)=>t.choice?[{id:b.film.id,index:i+1,...t.choice,start:t.before.time,end:t.after.time,feedback:t.feedback}]:[])))
  lines('observations',completed.flatMap(b=>[{id:b.film.id,initial:b.film.frames[0].limited},...b.turns.map((t,i)=>({id:b.film.id,turn:i+1,...t}))]))
  lines('memory',completed.map(b=>({id:b.film.id,condition:s.memory,generated:b.summary,error:b.summaryError})))
  lines('events',completed.map(b=>({id:b.film.id,result:b.film.result,hpBefore:b.film.hp,hpAfter:b.film.after,at:b.film.frames.at(-1)!.limited})))
  lines('private_ground_truth',completed.flatMap(b=>b.truth.map(t=>({id:b.film.id,...t}))))
  immutable(join(dir,'replay.json'),json({version:1,agent:s.agent,attempts:completed.map(b=>b.film)} satisfies Replay))
  const summary=summarize(s,completed);immutable(join(dir,'summary.json'),json(summary));return summary
}
function summarize(s:Settings,all:Bundle[]){
  const exp=all.filter(b=>b.film.stage==='exploration'),win=exp.find(b=>b.film.result==='escaped')
  const rate=(rows:Bundle[])=>rows.length?rows.filter(b=>b.film.result==='escaped').length/rows.length:null
  const failures=exp.filter(b=>b.charged),req=all.flatMap(b=>b.requests),llm=req.filter(r=>r.provider==='local'&&r.body&&'model' in (r.body as object))
  return {agent:s.agent,seed:s.seed,memory:s.memory,protocol:s.protocol,budgets:localBudget(s),sr1:Number(exp[0].film.result==='escaped'),srK:Number(!!win),
    firstSuccessAttempt:win?.film.attempt??null,hpConsumedBeforeFirstSuccess:win?s.initialHP-win.film.after:null,hpConsumed:s.initialHP-exp.at(-1)!.film.after,
    explorationBudgetExhaustion:Number(!win),masterySuccessRate:rate(all.filter(b=>b.film.stage==='mastery')),
    transferSuccessRate:rate(all.filter(b=>b.film.stage.startsWith('transfer'))),
    repeatedFailureRate:failures.length>1?failures.slice(1).filter((b,i)=>failures.slice(0,i+1).some(p=>p.film.result===b.film.result)).length/(failures.length-1):null,
    decisions:req.filter(r=>r.kind==='act').length,llmRequests:llm.length,inputTokens:llm.reduce((n,r)=>n+r.reply.inputTokens,0),outputTokens:llm.reduce((n,r)=>n+r.reply.outputTokens,0),
    modelInferenceSeconds:llm.reduce((n,r)=>n+(r.reply.inferenceLatency??0),0),unknownUsageRequests:llm.filter(r=>r.reply.usageKnown===false||r.reply.error==='interrupted_request_unknown').length,
    decisionPipelineSeconds:req.reduce((n,r)=>n+r.reply.latency,0),
    attempts:all.map(b=>({id:b.film.id,result:b.film.result,time:b.film.frames.at(-1)!.full.time,actions:b.turns.filter(t=>t.choice).length,hp:b.film.after,
      remainingDistance:b.terminalDistance,regions:b.regions,summaryError:b.summaryError}))}
}
