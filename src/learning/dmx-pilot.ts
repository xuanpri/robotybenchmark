import {mkdirSync,writeFileSync,renameSync} from 'node:fs'
import {join} from 'node:path'
import {actions,defaults} from '../sim/config'
import {distance} from '../sim/geometry'
import {messages} from './agents'
import {LearningWorld,parseChoice,parseExperience,settings,type PublicTurn,type Experience,type AgentInput} from './protocol'
import {Ledger,Pause,dmx,save,type Track} from './dmx'
import type {Replay,AttemptFilm} from '../video/replay'
export const baseDir='results/real-dmx-pilot'
export function publicMessages(input:AgentInput,reflect:boolean,mode:string){
  const m=messages(input,reflect)
  m[0].content+=' Observation: '+mode+'. Wall rectangles are [xmin,zmin,xmax,zmax]. East increases x; south increases z. Heading is radians from east toward south. Cardinal moves travel 2.5 meters per simulated second until blocked; WAIT holds position. You can see the result only after execution.'
  m[0].content+=reflect?' Include one short lesson and next strategy in English for the replay.':' Pick exactly one listed action and duration. Include a short English reason. Return plain JSON only.'
  return m
}
type Trial={
 film:AttemptFilm;turns:PublicTurn[];truth:ReturnType<LearningWorld['get_private_evaluation']>[];memory:Experience|null;reflection?:string;
 closest:number;remaining:number;valid:boolean;charged:boolean;memoryIn:Experience[]
}
export async function pilot(track:Track,ledger:Ledger,dir:string){
  mkdirSync(dir,{recursive:true})
  const mode=track==='A'?'omniscient':'limited',s=settings({seed:dmx.seed,tokenBudget:dmx.attemptTokenBudget,maxActions:dmx.actionLimit,durations:dmx.seconds,maxAttempts:track==='B'?10:1,memory:track==='B'?'M2':'M0',transfer:[]})
  const cfg=defaults();cfg.observation=mode
  const trials:Trial[]=[],memories:Experience[]=[]
  const limit=track==='smoke'?3:s.maxActions
  let hp=100,stop='',smokeVerified=false
  save(join(dir,'metadata.json'),{agent:dmx.agent_id,model:dmx.model,mode,settings:{...s,agent:dmx.agent_id,masteryTrials:track==='B'?3:0,maxActions:limit},cfg,requestCaps:[5,200],requestFields:['model','messages'],memoryPolicy:track==='B'?'All agent-authored exploration summaries; frozen during verification':'M0'})
  async function trial(stage:string,num:number,initialHP:number,frozen:Experience[]){
    const id=stage+'-'+num,w=new LearningWorld();w.reset(s.seed,cfg)
    const publicView=()=>mode==='limited'?w.observe():w.sample().full
    const film:AttemptFilm={id,stage,attempt:num,seed:s.seed,config:cfg,hp:initialHP,after:initialHP,result:'active',frames:[w.sample()],decisions:[]}
    const tr:Trial={film,turns:[],truth:[w.get_private_evaluation()],memory:null,closest:distance(publicView().player,cfg.room.exit),remaining:0,valid:true,charged:false,memoryIn:[...frozen]}
    trials.push(tr)
    if(num>1||stage==='mastery')film.resetLabel='Same world reset'
    let spent=0
    function input(reflect:boolean):AgentInput{
      return {task:'Reach the green exit safely.',map:cfg.room,goal:cfg.room.exit,current:publicView(),hp:reflect?film.after:initialHP,attempt:num,
        remaining:{actions:limit-film.decisions.length,tokens:Math.max(0,s.tokenBudget-spent),time:cfg.maxTime-publicView().time,attempts:stage==='mastery'?1:s.maxAttempts-num+1},
        legal:actions,durations:s.durations,history:reflect?tr.turns:tr.turns.slice(-dmx.history),memory:[...frozen]}
    }
    try{
      for(let turn=1;turn<=limit&&w.observe().outcome==='active';turn++){
        if(spent>=s.tokenBudget){film.result='token_budget';break}
        const before=publicView(),v=await ledger.ask(track,id+'/act-'+turn,publicMessages(input(false),false,mode))
        spent+=v.data.usage.prompt_tokens+v.data.usage.completion_tokens
        let choice
        try{if(!v.valid)throw Error();choice=parseChoice(v.content,s)}catch{film.result='invalid_response';tr.valid=false;break}
        w.step(choice,()=>{film.frames.push(w.sample());tr.truth.push(w.get_private_evaluation());tr.closest=Math.min(tr.closest,distance(w.observe().player,cfg.room.exit))})
        const after=publicView()
        film.decisions.push({action:choice.action,start:before.time,end:after.time,reason:choice.reason,latency:v.latency})
        tr.turns.push({before,choice,after,feedback:after.outcome})
      }
      if(film.result==='active')film.result=w.observe().outcome==='active'?(track==='smoke'?'smoke_limit':'action_budget'):w.observe().outcome
      tr.charged=track!=='smoke'&&film.result!=='escaped'
      film.after=tr.charged?Math.max(0,initialHP-s.failureCost):initialHP
      if(track==='B'&&stage==='exploration'){
        if(spent>=s.tokenBudget){tr.reflection='token_budget'}else{
          const v=await ledger.ask(track,id+'/reflect',publicMessages(input(true),true,mode))
          film.endLatency=v.latency;tr.reflection=v.content
          try{if(!v.valid)throw Error();tr.memory=parseExperience(v.content);memories.push(tr.memory);film.notes=Object.entries(tr.memory).map(([field,value])=>field+': '+value)}catch{film.lesson='Invalid reflection; see raw response'}
        }
      }
      if(track==='smoke'&&tr.valid&&tr.turns.length){
        const msg=publicMessages(input(true),true,mode)
        msg[0].content='Read the final public action feedback. Return JSON {"feedback":"the last executed action outcome","north":"increases z or decreases z"}. Use the literal outcome and one of the two direction strings.'
        const v=await ledger.ask(track,id+'/feedback-check',msg)
        try{const check=JSON.parse(v.content);smokeVerified=v.valid&&check.feedback===w.observe().outcome&&check.north==='decreases z'}catch{}
      }
    }catch(e){if(!(e instanceof Pause))throw e;stop=e.message;if(film.result==='active')film.result='paused_'+stop}
    tr.remaining=distance(w.observe().player,cfg.room.exit)
    return tr
  }
  for(let n=1;n<=s.maxAttempts&&hp>0&&!stop;n++){
    const tr=await trial('exploration',n,hp,[...memories]);hp=tr.film.after
    if(tr.film.result==='escaped'){
      if(track==='B'&&!stop){const frozen=[...memories];for(let k=1;k<=3&&!stop;k++)await trial('mastery',k,100,frozen)}
      break
    }
  }
  const log=(name:string,rows:unknown[])=>{const f=join(dir,name+'.jsonl');writeFileSync(f+'.partial',rows.map(v=>JSON.stringify(v)).join('\n')+(rows.length?'\n':''));renameSync(f+'.partial',f)}
  const online=ledger.records().filter(r=>r.track===track&&!r.name.endsWith('/posthoc-reflect'))
  log('requests',online)
  log('private_ground_truth',trials.flatMap(t=>t.truth.map(x=>({id:t.film.id,...x}))))
  log('observations',trials.flatMap(t=>[{id:t.film.id,initial:t.film.frames[0][mode==='limited'?'limited':'full']},...t.turns.map(x=>({id:t.film.id,...x}))]))
  log('actions',trials.flatMap(t=>t.turns.map(x=>({id:t.film.id,...x.choice,start:x.before.time,end:x.after.time,feedback:x.feedback}))))
  log('events',trials.flatMap(t=>[{id:t.film.id,event:'reset',hp:t.film.hp,time:0},{id:t.film.id,event:t.film.result,hp:t.film.after,time:t.film.frames.at(-1)!.full.time}]))
  log('memory',trials.map(t=>({id:t.film.id,input:t.memoryIn,raw:t.reflection,summary:t.memory})))
  save(join(dir,'replay.json'),{version:1,agent:dmx.model,attempts:trials.map(t=>t.film)} satisfies Replay)
  const summary={track,stop,smokeVerified,requests:online.length,attempts:trials.map(t=>({id:t.film.id,hp:t.film.hp,after:t.film.after,result:t.film.result,time:t.film.frames.at(-1)!.full.time,actions:t.turns.length,remaining:t.remaining,closest:t.closest}))}
  save(join(dir,'summary.json'),summary)
  return summary
}
