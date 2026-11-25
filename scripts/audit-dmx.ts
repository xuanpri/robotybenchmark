// Offline only. Verify the actual on-wire view and reply against the deterministic simulator,
// then run wait ablations on cloned states for retrospective interpretation.
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {Physics,sees} from '../src/sim/world'
import {distance} from '../src/sim/geometry'
import {actions,defaults,type Action} from '../src/sim/config'
import {parseChoice,settings} from '../src/learning/protocol'
import {publicMessages,baseDir} from '../src/learning/dmx-pilot'
import {dmx,read,type Wire} from '../src/learning/dmx'
import type {Replay} from '../src/video/replay'
const lines=(d:string,f:string):any[]=>readFileSync(join(d,f+'.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l))
const stats:unknown[]=[]
for(const track of process.argv.slice(2)){
  const dir=join(baseDir,track),replay=read<Replay>(join(dir,'replay.json')),meta=read<any>(join(dir,'metadata.json'))
  const wire=lines(dir,'requests') as Wire[],memory=lines(dir,'memory'),log=lines(dir,'actions'),seen=lines(dir,'observations')
  const policy=settings({durations:dmx.seconds}),mode=track==='A'?'full':'limited'
  for(const a of replay.attempts){
    const physics=new Physics(a.config,a.seed),seq=log.filter(t=>t.id===a.id),turns=seen.filter(t=>t.id===a.id&&t.choice)
    assert.equal(seq.length,turns.length)
    const states=[physics.initial()]
    function apply(s:typeof states[number],action:Action,duration:number){
      for(let n=0;n<Math.round(duration*10)&&s.outcome==='active';n++)s=physics.advance(s,action)
      return s
    }
    assert.deepEqual({...a.config,observation:'limited'},defaults())
    const memoryRecord=memory.find(m=>m.id===a.id),priors=memoryRecord.input
    if(memoryRecord.summary){
      const physical=wire.find(r=>r.name===a.id+'/reflect'&&r.status===200)!
      const modelText=JSON.parse(physical.raw!).choices[0].message.content
      assert.equal(memoryRecord.raw,modelText);assert.deepEqual(memoryRecord.summary,JSON.parse(modelText))
    }
    const expected=track!=='B'?[]:memory.filter(m=>m.id.startsWith('exploration-')&&(a.stage==='mastery'||+m.id.split('-')[1]<a.attempt)&&m.summary).map(m=>m.summary)
    assert.deepEqual(priors,expected)
    const scopes=wire.filter(r=>r.name.startsWith(a.id+'/'))
    for(const r of scopes){
      const input=JSON.parse(r.body.messages[1].content)
      assert.deepEqual(Object.keys(r.body).sort(),['messages','model'])
      assert.equal(r.body.model,dmx.model)
      assert.deepEqual(Object.keys(input).sort(),['task','map','goal','current','hp','attempt','remaining','legal','durations','history','memory'].sort())
      assert.deepEqual(input.memory,priors);assert.deepEqual(input.map,defaults().room);assert.deepEqual(input.goal,defaults().room.exit)
      assert.deepEqual(input.legal,actions);assert.deepEqual(input.durations,dmx.seconds)
      const k=r.name.includes('/act-')?Number(r.name.split('/act-')[1])-1:seq.length
      const now=k<seq.length?seq[k].start:a.frames.at(-1)!.full.time
      const projection=a.frames.find(f=>Math.abs(f.full.time-now)<1e-8)![mode]
      assert.deepEqual(input.current,projection)
      const expectedHistory=turns.slice(r.name.includes('/act-')?Math.max(0,k-dmx.history):0,k).map(({id,...rest})=>rest)
      assert.deepEqual(input.history,expectedHistory)
      if(!r.name.endsWith('/feedback-check'))assert.deepEqual(r.body.messages,publicMessages(input,r.name.endsWith('/reflect'),meta.mode))
    }
    let blockedActive=0,moved=0,pathLength=0
    for(const [i,t] of seq.entries()){
      const raw=scopes.filter(r=>r.name===a.id+'/act-'+(i+1)&&r.status===200).at(-1)!
      const model=parseChoice(JSON.parse(raw.raw!).choices[0].message.content,policy)
      assert.deepEqual(model,{action:t.action,duration:t.duration,...(t.reason===undefined?{}:{reason:t.reason})})
      const last=states.at(-1)!,next=apply(last,t.action,t.duration);states.push(next)
      assert.deepEqual(next.player,turns[i].after.player);assert.equal(next.clock*.01,t.end);assert.equal(next.outcome,t.feedback)
      const length=distance(last.player,next.player);pathLength+=length
      if(t.action!=='WAIT'){moved++;if(next.outcome==='active'&&length+1e-5<t.duration*a.config.playerSpeed)blockedActive++}
    }
    const waits=[]
    for(let i=0;i<seq.length;i++){
      if(seq[i].action!=='WAIT')continue
      let j=i
      while(j<seq.length&&seq[j].action==='WAIT')j++
      const next=seq[j],start=states[i],end=states[j]
      waits.push({firstTurn:i+1,start:start.clock*.01,end:end.clock*.01,reason:seq[i].reason,outcome:end.outcome,
        nextMove:next?.action??null,observedNext:next?.feedback??null,
        noWaitNext:next?apply(start,next.action,next.duration).outcome:null,
        otherSafeForLastWait:end.outcome!=='active'?actions.filter(x=>x!=='WAIT'&&apply(states[j-1],x,seq[j-1].duration).outcome==='active'):null})
      i=j-1
    }
    let closestOnPath=distance(states[0].player,a.config.room.exit)
    for(const [j,f] of a.frames.entries()){
      if(!j)continue
      const p=a.frames[j-1].full.player,q=f.full.player,g=a.config.room.exit,dx=q[0]-p[0],dz=q[1]-p[1]
      const u=Math.max(0,Math.min(1,((g[0]-p[0])*dx+(g[1]-p[1])*dz)/(dx*dx+dz*dz||1)))
      closestOnPath=Math.min(closestOnPath,Math.hypot(p[0]+u*dx-g[0],p[1]+u*dz-g[1]))
    }
    const visits=new Map<string,number>()
    for(const st of states){const cell=st.player.map(x=>Math.round(x*4)).join(',');visits.set(cell,(visits.get(cell)??0)+1)}
    const previous=replay.attempts[replay.attempts.indexOf(a)-1],priorMoves=previous?log.filter(t=>t.id===previous.id):[]
    const divergence=seq.findIndex((x,i)=>!priorMoves[i]||x.action!==priorMoves[i].action||x.duration!==priorMoves[i].duration)
    stats.push({track,id:a.id,result:a.result,decisions:seq.length,moves:moved,blockedActive,pathLength,closestOnPath,waits,
      returnedAfterOneMeterExcursion:states.some((end,j)=>states.slice(0,j).some((start,i)=>distance(end.player,start.player)<.2&&states.slice(i+1,j).some(mid=>distance(mid.player,start.player)>=1))),
      seeingAtTerminal:a.result==='seen'?physics.robots(states.at(-1)!.clock).filter(r=>sees(r,states.at(-1)!.player,a.config)).map(r=>r.id):[],
      mostVisitsToQuarterMeterCell:Math.max(...visits.values()),firstDifferentAction:previous&&divergence>=0?divergence+1:null,terminal:states.at(-1)})
  }
}
writeFileSync(join(baseDir,'behavior-audit.json'),JSON.stringify(stats,null,2))
console.log('Verified public payloads, memory snapshots, source of each action and deterministic transitions for '+stats.length+' trials.')
