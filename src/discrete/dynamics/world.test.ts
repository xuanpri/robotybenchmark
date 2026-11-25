import {test} from 'node:test'
import assert from 'node:assert/strict'
import {modes,seeds,instance,initial,advance,cycle,step,vision,same,type Params,type State,type Action} from './world'
import {gates,exactRandomProbability} from './preflight'
import {observe,messages,parse,type PublicAttempt} from './protocol'
import {mkdtempSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
const base:Params={min:0,max:5,southSpeed:1,northSpeed:1,northPause:0,southPause:3,alt:false,stutter:false}
test('asymmetric loop: north reverses on arrival; south stays three transitions before reversing',()=>{
  const loop=cycle(base);assert.equal(loop.length,13)
  assert.deepEqual(loop.map(r=>[r.pos[1],r.heading,r.pauseRemaining]),[[0,'S',0],[1,'S',0],[2,'S',0],[3,'S',0],[4,'S',0],[5,'S',3],[5,'S',2],[5,'S',1],[5,'N',0],[4,'N',0],[3,'N',0],[2,'N',0],[1,'N',0]])
})
test('all four modes replay identically for each (seed,attempt), with action-independent robot futures',()=>{
  for(const mode of modes)for(const seed of seeds)for(let n=1;n<=5;n++){
    const a=instance(mode,seed,n);assert.deepEqual(a,instance(mode,seed,n))
    assert.equal(a.robots.length,31)
    for(const r of a.robots)assert.ok(r.pos[0]===5&&r.pos[1]>=0&&r.pos[1]<=5)
    assert.deepEqual(step(initial(a),'WAIT',a).robot,step(initial(a),'RIGHT',a).robot)
  }
})
test('identical reuses the same phase and future; shifted modes resample or cycle patterns',()=>{
  for(const seed of seeds){
    const first=instance('identical_loop',seed,1)
    for(let n=2;n<=5;n++){const i=instance('identical_loop',seed,n);assert.deepEqual(i.robots,first.robots);assert.equal(i.phase,first.phase)}
    const patterns=Array.from({length:5},(_,n)=>instance('pattern_shift',seed,n+1).pattern)
    assert.equal(new Set(patterns.slice(0,4)).size,4);assert.equal(patterns[0],patterns[4])
    assert.ok(new Set(Array.from({length:5},(_,n)=>JSON.stringify(instance('parametric_shift',seed,n+1).robots))).size>1)
  }
})
test('asymmetric speed, alternating endpoint pauses and midline stutter have exact transitions',()=>{
  const slow=cycle({...base,southPause:0,northSpeed:2})
  const index=slow.findIndex(r=>r.pos[1]===5&&r.heading==='N')
  assert.equal(slow[index].cooldown,1);assert.equal(slow[index+1].pos[1],5);assert.equal(slow[index+2].pos[1],4)
  const alt=cycle({...base,southPause:0,alt:true});assert.ok(alt.some(r=>r.pauseRemaining===2));assert.ok(alt.some(r=>r.pos[1]===5&&r.heading==='N'))
  const mid=cycle({...base,southPause:0,stutter:true})
  for(let j=0;j<mid.length;j++)if(mid[j].stutterRemaining===1){const next=mid[(j+1)%mid.length];assert.deepEqual(next.pos,mid[j].pos);assert.equal(next.heading,mid[j].heading);assert.equal(next.stutterRemaining,0)}
})
test('random transition is legal; stays preserve heading and moves set heading',()=>{
  for(let seed=1001;seed<=1100;seed++)for(let n=1;n<=5;n++){
    const robots=instance('pure_random',seed,n).robots
    for(let k=1;k<robots.length;k++){const d=robots[k].pos[1]-robots[k-1].pos[1];assert.ok(Math.abs(d)<=1);assert.equal(robots[k].heading,d===0?robots[k-1].heading:d===1?'S':'N')}
  }
})
test('same corridor and opaque passable door; extended patrol endpoints only',()=>{
  assert.deepEqual(vision({pos:[5,3],heading:'W'}),[])
  assert.deepEqual(vision({pos:[5,0],heading:'S'}),[[5,1],[5,2],[5,3]])
  const i=instance('identical_loop',101,1)
  assert.deepEqual(step({...initial(i),player:[4,3]},'RIGHT',i).player,[5,3])
  assert.equal(step({...initial(i),tick:29,player:[7,3]},'RIGHT',i).outcome,'success')
})
test('zero-cost gates solve all 90 predictable instances and defeat all three shortcut policies',()=>{
  const root=mkdtempSync(join(tmpdir(),'dyn-gates-'))
  try{const result=gates(root);assert.equal(result.oracleSolved,90);assert.deepEqual(result.antiPrior.map(r=>r.success),[0,0,2])}finally{rmSync(root,{recursive:true,force:true})}
})
test('unknown prompts and cross-attempt memories are invariant to arbitrary private mode/seed/state',()=>{
  for(const c of ['Partial-unknown-passive','Partial-unknown-interactive'] as const)for(const x of [2,3,4,5,6,7]){
    const obs=observe({...initial(instance('identical_loop',101,1)),tick:3,player:[x,3]},c)
    assert.equal(obs.robot,null)
    const publicHistory:PublicAttempt={attempt:1,observations:[obs],decisions:[],failureReason:'vision'}
    const active:PublicAttempt={attempt:2,observations:[obs],decisions:[],failureReason:null}
    let reference:string|undefined
    for(const mode of modes)for(const seed of seeds){
      const i=instance(mode,seed,2),s:State={...initial(i),tick:3,player:[x,3]}
      const prompt=JSON.stringify(messages(c,2,observe(s,c),[publicHistory],active,i,s))
      assert.doesNotMatch(prompt,/identical_loop|parametric_shift|pattern_shift|pure_random|asym_pause|alt_pause|asym_speed|mid_stutter|pauseRemaining|cooldown|altNext|mechanism_state|safe_action|"seed"|"phase"/)
      if(reference)assert.equal(prompt,reference);else reference=prompt
    }
  }
})
test('PEEK yields exactly one current sighting and is rejected in noninteractive schema',()=>{
  const i=instance('pattern_shift',103,2),before={...initial(i),player:[4,3] as [number,number]},after=step(before,'PEEK',i)
  assert.equal(after.tick,1);assert.deepEqual(after.player,before.player)
  assert.ok(observe(after,'Partial-unknown-interactive',true).robot)
  assert.equal(observe(step(after,'WAIT',i),'Partial-unknown-interactive').robot,null)
  const d=JSON.stringify({predicted_next:{pos:[5,2],heading:'N'},action:'PEEK',reason:''})
  assert.throws(()=>parse(d,'Partial-unknown-passive'));assert.equal(parse(d,'Partial-unknown-interactive').action,'PEEK')
})
test('Omniscient exception supplies rules and counters but no mode labels or future states',()=>{
  for(const seed of seeds){const i=instance('pattern_shift',seed,1),s=initial(i),obs=observe(s,'Omniscient'),p=messages('Omniscient',1,obs,[],{attempt:1,observations:[obs],decisions:[],failureReason:null},i,s)
    assert.ok(JSON.parse(p[1].content).mechanism_state);assert.doesNotMatch(JSON.stringify(p),/pattern_shift|asym_pause|alt_pause|asym_speed|mid_stutter|robots|future_robot/)}
})
test('finite-horizon random probabilities are in range and match independent blind-rush enumeration',()=>{
  const p=exactRandomProbability('Blind-Rush');assert.ok(p>.4&&p<.6)
  // Direct enumerate the 4 transitions needed to enter x=5, without world.step.
  let success=0
  function enumerate(z:number,h:string,t:number,mass:number){
    if(t===4){if(z!==3&&!(h==='S'&&z<3||h==='N'&&z>3))success+=mass;return}
    const choices=[...(z>0?[-1]:[]),...(z<5?[1]:[]),0]
    for(const d of choices)enumerate(z+d,d===0?h:d===1?'S':'N',t+1,mass/choices.length)
  }
  for(let z=0;z<6;z++)for(const h of ['N','S'])enumerate(z,h,0,1/12)
  assert.ok(Math.abs(p-success)<1e-12)
})
