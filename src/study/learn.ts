import {mkdirSync,existsSync} from 'node:fs'
import {join} from 'node:path'
import {actions,type Config} from '../sim/config'
import {distance} from '../sim/geometry'
import {LearningWorld,parseChoice,parseExperience,settings,type Experience,type PublicTurn} from '../learning/protocol'
import {save,read,Pause} from '../learning/dmx'
import type {Messages,ContentPart} from '../learning/agents'
import type {AttemptFilm,Replay} from '../video/replay'
import {design} from './scenes'
import {digest,type Ask} from './provider'
export type Lesson={layout:string;attempt:number;result:string;summary:Experience}
export interface Job{id:string;layout:'A'|'B';group:'G3';cfg:Config;budget:number;initial:Lesson[];arm:'source'|'transfer'|'scratch'}
const sys='Reach the green exit safely. Coordinates [x,z] in meters; east increases x, south increases z. Walls are [xmin,zmin,xmax,zmax]. Heading in radians from east toward south. Movement is cardinal at 2.5 m/s until blocked; WAIT holds position. Avoid patrol contact and unobstructed 90 degree, 5 m patrol vision. Only nearby unobstructed patrols are shown. The clock stops during decisions. Choose one listed action and duration. Return plain JSON {"action":"...","duration":0.5,"reason":"short English reason"}.'
type Attempt={film:AttemptFilm;turns:PublicTurn[];truth:ReturnType<LearningWorld['get_private_evaluation']>[];memoryIn:Lesson[];lesson?:Lesson;closest:number;remaining:number}
export interface InputOptions {
 observation_mode:'omniscient'|'limited';input_mode:'text'|'hybrid';history_limit:4|'full';
 system:string;noMemory?:boolean;
 screenshot?:(frame:ReturnType<LearningWorld['observe']>,room:Config['room'])=>Promise<string>
}
export async function runJob(job:Job,dir:string,ask:Ask,options?:InputOptions){
  if(options?.noMemory && (job.budget!==1||job.initial.length))throw Error('No-memory entry requires one attempt and empty initial memory')
  if(options?.input_mode==='hybrid'&&!options.screenshot)throw Error('Screenshot provider required')
  mkdirSync(dir,{recursive:true})
  const meta={design,job,...(options?{inputOptions:{...options,screenshot:undefined}}:{}),initialMemoryHash:digest(job.initial)},metaPath=join(dir,'metadata.json')
  if(existsSync(metaPath)&&digest(read(metaPath))!==digest(meta))throw Error('Frozen job metadata mismatch')
  if(!existsSync(metaPath))save(metaPath,meta)
  const lessons=structuredClone(job.initial),trials:Attempt[]=[],w=new LearningWorld()
  const legal=settings({durations:design.durations})
  let hp=design.initialHP,status='running',pause:string|null=null,first:number|null=null
  function progress(){
    const rows=trials.map(t=>({attempt:t.film.attempt,result:t.film.result,hpBefore:t.film.hp,hpAfter:t.film.after,
      time:t.film.frames.at(-1)!.full.time,actions:t.turns.length,closest:t.closest,remaining:t.remaining,memoryInBytes:Buffer.byteLength(JSON.stringify(t.memoryIn)),
      waits:t.turns.filter(x=>x.choice?.action==='WAIT').length,lesson:t.lesson??null}))
    const cp={id:job.id,layout:job.layout,group:job.group,n:job.cfg.robotCount,arm:job.arm,status,pause,hp,first,budget:job.budget,
      decisions:rows.reduce((n,a)=>n+a.actions,0),attempts:rows,memoryOutBytes:Buffer.byteLength(JSON.stringify(lessons)),initialMemoryHash:digest(job.initial)}
    save(join(dir,'checkpoint.json'),cp);return cp
  }
  function archive(t:Attempt){
    save(join(dir,'attempt-'+t.film.attempt+'.json'),t)
    save(join(dir,'replay.json'),{version:1,agent:design.model,maxHP:100,attempts:trials.map(t=>t.film)} satisfies Replay)
  }
  for(let i=1;i<=job.budget;i++){
    w.reset(design.seed,job.cfg)
    const film:AttemptFilm={id:job.id+'-'+i,stage:job.layout+' / N'+job.cfg.robotCount+(options?.noMemory?' / M0 / ':' / G3 / ')+job.arm,attempt:i,seed:design.seed,config:job.cfg,hp,after:hp,result:'active',frames:[w.sample()],decisions:[],resetLabel:i>1?'Same world reset':undefined}
    const t:Attempt={film,turns:[],truth:[w.get_private_evaluation()],memoryIn:structuredClone(lessons),closest:distance(w.observe().player,job.cfg.room.exit),remaining:distance(w.observe().player,job.cfg.room.exit)}
    trials.push(t)
    const view=()=>options?.observation_mode==='omniscient'?w.sample().full:w.observe()
    async function input(reflect:boolean):Promise<Messages<string|ContentPart[]>>{
      const task={map:job.cfg.room,goal:job.cfg.room.exit,current:view(),hp:film.after,attempt:i,remaining:{actions:design.maxActions-t.turns.length,time:job.cfg.maxTime-w.observe().time,attempts:job.budget-i+1},
        legal:actions,durations:design.durations,history:reflect||options?.history_limit==='full'?t.turns:t.turns.slice(-(options?.history_limit??design.historyTurns)),memory:t.memoryIn,...(reflect?{outcome:film.result}:{})}
      const messages:Messages<string|ContentPart[]>=[{role:'system',content:reflect?'Summarize this completed attempt for future play, using only public information. Distinguish observations from hypotheses. Return plain JSON with four short English string fields observations, failure, next, uncertainty. For success describe what worked.':options?.system??sys},{role:'user',content:JSON.stringify(task)}]
      if(!reflect && options?.input_mode==='hybrid'){
        const url=await options.screenshot!(structuredClone(task.current),structuredClone(task.map))
        messages[1].content=[{type:'text',text:JSON.stringify(task)},{type:'image_url',image_url:{url}}]
      }
      return messages
    }
    try{
      while(w.observe().outcome==='active'&&t.turns.length<design.maxActions){
        const before=view(),reply=await ask(i+'-act-'+(t.turns.length+1),await input(false))
        let choice;try{choice=parseChoice(reply.content,legal)}catch{throw new Pause('invalid_action')}
        const after=w.step(choice,()=>{
          film.frames.push(w.sample());t.truth.push(w.get_private_evaluation());t.closest=Math.min(t.closest,distance(w.observe().player,job.cfg.room.exit))
        })
        t.turns.push({before,choice,after:view(),feedback:after.outcome});t.remaining=distance(after.player,job.cfg.room.exit)
        film.decisions.push({action:choice.action,start:before.time,end:after.time,latency:reply.latency,reason:choice.reason})
        progress()
      }
      film.result=w.observe().outcome==='active'?'action_budget':w.observe().outcome
      if(film.result==='escaped')first=i
      else hp-=design.failureHP
      film.after=hp
      archive(t);progress()
      if(options?.noMemory){
        if(first!==null)status='acquired'
        archive(t);break
      }
      const reply=await ask(i+'-reflect',await input(true))
      let summary;try{summary=parseExperience(reply.content)}catch{throw new Pause('invalid_reflection')}
      t.lesson={layout:job.layout,attempt:i,result:film.result,summary}
      lessons.push(t.lesson);film.endLatency=reply.latency;film.notes=Object.entries(summary).map(([k,v])=>k+': '+v)
    }catch(e){
      if(!(e instanceof Pause))throw e
      status='paused';pause=e.message
      if(film.result==='active')film.result='paused'
    }
    archive(t)
    if(status==='paused')break
    if(first!==null){
      save(join(dir,'success-memory.json'),lessons)
      save(join(dir,'success-route.json'),t.turns.map(x=>x.choice))
      status='acquired';break
    }
  }
  if(status==='running')status='not_acquired'
  return progress()
}
