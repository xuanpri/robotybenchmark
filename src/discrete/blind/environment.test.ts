import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {initial,advance,step,vision,baseline,phases,same,walkable,type State,type Action} from './environment'
import {observe,messages,parse,conditions,type PublicAttempt,type Observation} from './public'
import {attribute,play} from './experiment'

test('eight-tick loop includes one stationary reversal at each endpoint',()=>{
  const expected=[[1,'S',0],[2,'S',0],[3,'S',0],[4,'S',1],[4,'N',0],[3,'N',0],[2,'N',0],[1,'N',1]]
  let r=initial(0).robot
  for(const row of expected){assert.deepEqual([r.pos[1],r.heading,r.pauseRemaining],row);r=advance(r)}
  assert.deepEqual(r,initial(0).robot)
})
test('airlock is passable in one tick but opaque to rays, including horizontal counterfactuals',()=>{
  assert.deepEqual(step({...initial(1),player:[4,3]},'RIGHT').player,[5,3])
  assert.deepEqual(vision({pos:[5,3],heading:'W'}),[])
  assert.deepEqual(vision({pos:[4,3],heading:'E'}),[])
  assert.deepEqual(vision({pos:[5,1],heading:'S'}),[[5,2],[5,3],[5,4]])
  assert.deepEqual(vision({pos:[5,4],heading:'S'}),[])
})
test('synchronous collision, edge swap, updated vision and action budget',()=>{
  assert.equal(step({...initial(1),player:[4,3]},'RIGHT').outcome,'collision')
  assert.equal(step({...initial(1),player:[5,3]},'UP').outcome,'swap')
  assert.equal(step({...initial(3),player:[4,3]},'RIGHT').outcome,'vision')
  assert.equal(step({...initial(0),tick:29,player:[7,3]},'RIGHT').outcome,'success')
  assert.equal(step({...initial(0),tick:29},'WAIT').outcome,'timeout')
})
test('all phases protect the run-up; both programmatic shortcut baselines fail 5/6',()=>{
  for(let p=0;p<8;p++)for(const x of [1,2,3,4,6,7]){
    const s={...initial(p),player:[x,3] as [number,number]}
    assert.equal(step(s,'WAIT').outcome,'running')
  }
  for(const policy of ['Oracle','Blind-Rush','Memoryless-Reactive'] as const){
    const runs=phases.map(p=>baseline(p,policy))
    assert.equal(runs.filter(r=>r.outcome==='success').length,policy==='Oracle'?6:1)
  }
  assert.deepEqual(phases.map(p=>baseline(p,'Oracle').path.length),[9,8,7,10,9,8])
})
test('all legal cells and actions match independent table-driven synchronous semantics',()=>{
  const table:[[number,number],string][]=[[[5,1],'S'],[[5,2],'S'],[[5,3],'S'],[[5,4],'S'],[[5,4],'N'],[[5,3],'N'],[[5,2],'N'],[[5,1],'N']]
  const dirs:Record<Action,[number,number]>={UP:[0,-1],DOWN:[0,1],LEFT:[-1,0],RIGHT:[1,0],WAIT:[0,0],PEEK:[0,0]}
  for(let p=0;p<8;p++)for(let x=0;x<10;x++)for(let z=0;z<6;z++){
    if(!walkable([x,z]))continue
    for(const a of Object.keys(dirs) as Action[]){
      const s:State={...initial(p),player:[x,z]},[r,h]=table[(p+1)%8],v=dirs[a]
      let target:[number,number]=[x+v[0],z+v[1]]
      if(!walkable(target))target=[x,z]
      let outcome='running'
      if(same(target,r))outcome='collision'
      else if(same(s.player,r)&&same(target,s.robot.pos))outcome='swap'
      else if(target[0]===5&&target[1]!==r[1]&&Math.abs(target[1]-r[1])<=3&&Math.sign(target[1]-r[1])===(h==='S'?1:-1))outcome='vision'
      if(outcome==='running'&&same(target,[8,3]))outcome='success'
      assert.equal(step(s,a).outcome,outcome,JSON.stringify({p,x,z,a}))
    }
  }
})
test('hard noninterference: hidden truth cannot change serialized Prompt or cross-attempt memory',()=>{
  for(const c of conditions.filter(c=>c!=='Omniscient'))for(const x of [2,3,4,5,6,7,8]){
    const observations:Observation[]=[]
    for(let p=0;p<8;p++){
      const s={...initial(p),tick:3,player:[x,3] as [number,number]},obs=observe(s,c)
      assert.equal(obs.robot,null);assert.equal(obs.source,'occluded')
      assert.deepEqual(Object.keys(obs).sort(),['outcome','player','robot','source','tick'])
      observations.push(obs)
    }
    const serialize=(obs:typeof observations[number])=>{
      const active:PublicAttempt={attempt:2,observations:[obs],decisions:[],failureReason:null}
      const past:PublicAttempt={attempt:1,observations:[obs],decisions:[],failureReason:'vision'}
      const payload=JSON.stringify(messages(c,2,obs,[past],active))
      assert.doesNotMatch(payload,/pauseRemaining|predictionCorrect|ticks_since_last_seen|true_robot|truth|safe_action|optimal|phase|future_robot/)
      const user=JSON.parse(messages(c,2,obs,[past],active)[1].content)
      assert.equal(user.current.robot,null)
      assert.ok(user.previous_attempts.every((a:PublicAttempt)=>a.observations.every(o=>o.robot===null)))
      return payload
    }
    for(const o of observations)assert.equal(serialize(o),serialize(observations[0]))
  }
})
test('legitimate past sightings retained, hidden states redacted even when future truth differs',()=>{
  for(const c of conditions.filter(c=>c!=='Omniscient')){
    const first=observe(initial(0),c)
    const make=(phase:number)=>{
      const hidden=observe({...initial(phase),player:[4,3],tick:3},c)
      const past:PublicAttempt={attempt:1,observations:[first,hidden],decisions:[],failureReason:'collision'}
      return messages(c,2,hidden,[past],{attempt:2,observations:[first,hidden],decisions:[],failureReason:null})
    }
    assert.deepEqual(make(0),make(5))
    assert.deepEqual(JSON.parse(make(0)[1].content).previous_attempts[0].observations[0].robot,first.robot)
  }
})
test('PEEK advances one tick, grants one sighting only, and never immunizes player',()=>{
  const s={...initial(0),player:[3,3] as [number,number]},after=step(s,'PEEK')
  assert.equal(after.tick,1);assert.deepEqual(after.player,s.player)
  assert.deepEqual(observe(after,'Partial-unknown-interactive',true).robot,{pos:[5,2],heading:'S'})
  assert.equal(observe(step(after,'WAIT'),'Partial-unknown-interactive').robot,null)
  assert.equal(step({...initial(1),player:[5,3]},'PEEK').outcome,'collision')
})
test('unknown conditions omit all patrol rules; PEEK forbidden in other schemas',()=>{
  for(const c of conditions){
    const obs=observe(initial(0),c),prompt=messages(c,1,obs,[],{attempt:1,observations:[obs],decisions:[],failureReason:null})[0].content
    assert.equal(prompt.includes('Patrol dynamics:'),c==='Omniscient'||c==='Partial-known')
    if(c.startsWith('Partial-unknown'))assert.doesNotMatch(prompt,/period 8|one cell per tick|z=1\.\.4|endpoint|pauseRemaining/)
    const content=JSON.stringify({predicted_next:{pos:[5,1],heading:'S'},action:'PEEK',reason:'observe'})
    if(c==='Partial-unknown-interactive')assert.equal(parse(content,c).action,'PEEK')
    else assert.throws(()=>parse(content,c))
    assert.throws(()=>parse('```json\n{}\n```',c))
    assert.throws(()=>parse('{"action":"WAIT","reason":"x"}',c))
  }
})
test('same-phase resets reproduce trajectory; counterfactual attribution distinguishes causes',()=>{
  assert.deepEqual(initial(4),initial(4))
  const before={...initial(1),player:[4,3] as [number,number]},after=step(before,'RIGHT')
  assert.equal(attribute(before,after,{predicted_next:{pos:[5,1],heading:'N'},action:'RIGHT',reason:''})?.category,'Prediction Error')
  assert.equal(attribute(before,after,{predicted_next:{pos:after.robot.pos,heading:after.robot.heading},action:'RIGHT',reason:''})?.category,'Action/Planning Error')
  assert.equal(attribute(before,{...before,outcome:'format'})?.category,'Format Error')
})
test('format error terminates without a fallback or world advance; retries receive only public history',async()=>{
  const root=mkdtempSync(join(tmpdir(),'blind-tests-'))
  try{
    const first=await play(root,'Partial-unknown-passive',0,1,[],async()=>({content:'not JSON',model:'mock',latency:0,usage:{}}))
    assert.equal(first.outcome,'format');assert.equal(first.states.at(-1)!.tick,0);assert.equal(first.public.decisions.length,0)
    let captured:any
    const second=await play(root,'Partial-unknown-passive',0,2,[first.public],async(_name,m)=>{captured=m;return {content:'{}',model:'mock',latency:0,usage:{}}})
    assert.deepEqual(second.states[0],first.states[0])
    const input=JSON.parse(captured[1].content)
    assert.equal(input.previous_attempts[0].failureReason,'format')
    assert.doesNotMatch(JSON.stringify(input.previous_attempts),/attribution|predictionCorrect|pauseRemaining|"before"|"after"/)
  }finally{rmSync(root,{recursive:true,force:true})}
})
