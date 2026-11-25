import {test} from 'node:test'
import assert from 'node:assert/strict'
import {advanceRobot, initial, phases, step, solve, spec, vision, equal, walkable, type Robot, type State, type Action} from './environment'
import {parse, messages, attribute} from './protocol'

test('14-step patrol cycle, including both stationary endpoint transitions',()=>{
  const expected: [number,string,number][] = [[0,'S',0],[1,'S',0],[2,'S',0],[3,'S',0],[4,'S',0],[5,'S',2],[5,'S',1],[5,'N',0],[4,'N',0],[3,'N',0],[2,'N',0],[1,'N',0],[0,'N',2],[0,'N',1]]
  let r=initial(0).robot
  for(const [z,h,p] of expected){assert.deepEqual([r.pos[1],r.heading,r.pauseRemaining],[z,h,p]);r=advanceRobot(r)}
  assert.deepEqual(r,initial(0).robot)
})
test('wall bumps, coordinate convention and safe pocket over every phase',()=>{
  for(let phase=0;phase<14;phase++){
    const s=initial(phase)
    for(const action of ['WAIT','UP','DOWN','LEFT'] as Action[])assert.deepEqual(step(s,action).player,[1,3])
    assert.equal(step(s,'WAIT').outcome,'running')
    assert.ok(!vision(s.robot).some(p=>equal(p,[1,3])))
  }
  assert.deepEqual(step({...initial(4),player:[5,3]},'RIGHT').player,[6,3])
  assert.deepEqual(step({...initial(4),player:[2,3]},'UP').player,[2,2])
})
test('vision is a cardinal ray clipped by walls and grid bounds',()=>{
  assert.deepEqual(vision({pos:[2,3],heading:'W'}),[[1,3]])
  assert.deepEqual(vision({pos:[2,2],heading:'W'}),[])
  assert.deepEqual(vision({pos:[2,0],heading:'N'}),[])
  assert.deepEqual(vision({pos:[2,4],heading:'N'}),[[2,3],[2,2]])
})
test('synchronous collision, swap and updated heading vision; failure precedes exit',()=>{
  assert.equal(step(initial(2),'RIGHT').outcome,'collision')
  const s={...initial(1),player:[2,2] as [number,number]}
  assert.equal(step(s,'UP').outcome,'swap')
  assert.equal(step(initial(6),'RIGHT').outcome,'vision')
  // Enter a cell vacated by a robot without a swap or new vision: legal.
  assert.equal(step({...initial(3),player:[1,3]},'RIGHT').outcome,'running')
  assert.equal(step({...initial(4),tick:29,player:[7,3]},'RIGHT').outcome,'success')
  assert.equal(step({...initial(4),tick:29},'WAIT').outcome,'timeout')
  assert.throws(()=>step({...initial(4),outcome:'success'},'WAIT'))
})
// Independent table-driven transition checker: does not call advanceRobot,
// vision, movePlayer or danger, so a shared implementation bug is detectable.
test('all 14 phases, all open cells and all actions match independent transition rules',()=>{
  const cycle:Robot[]=Array.from({length:14},(_,p)=>initial(p).robot)
  const vectors:Record<string,[number,number]>={WAIT:[0,0],RIGHT:[1,0],LEFT:[-1,0],UP:[0,-1],DOWN:[0,1],N:[0,-1],S:[0,1]}
  for(let p=0;p<14;p++)for(let z=0;z<6;z++)for(let x=0;x<10;x++){
    if(!walkable([x,z]))continue
    for(const action of ['WAIT','RIGHT','LEFT','UP','DOWN'] as Action[]){
      const s:State={...initial(p),player:[x,z]}, r=cycle[(p+1)%14], v=vectors[action]
      let target:[number,number]=[x+v[0],z+v[1]]
      if(!walkable(target))target=[x,z]
      let expected='running'
      if(equal(target,r.pos))expected='collision'
      else if(equal([x,z],r.pos) && equal(target,s.robot.pos))expected='swap'
      else {
        const d=vectors[r.heading]
        for(let i=1;i<=2;i++){
          const q:[number,number]=[r.pos[0]+i*d[0],r.pos[1]+i*d[1]]
          if(!walkable(q))break
          if(equal(target,q))expected='vision'
        }
      }
      if(expected==='running' && equal(target,spec.exit))expected='success'
      assert.equal(step(s,action).outcome,expected,JSON.stringify({p,x,z,action}))
    }
  }
})
test('fixed suite solves 5/5; three initial advances die; BFS lengths match unavoidable waits',()=>{
  const lengths=[10,9,7,10,7]
  for(const [i,p] of phases.entries()){
    const path=solve(initial(p))!
    assert.equal(path.length,lengths[i])
    let s=initial(p)
    for(const a of path)s=step(s,a)
    assert.equal(s.outcome,'success')
    if([0,1,6].includes(p)){
      assert.notEqual(step(initial(p),'RIGHT').outcome,'running')
      assert.equal(path[0],'WAIT')
      // Every other initial action bumps against the pocket wall, equivalent to waiting.
      for(const a of ['UP','DOWN','LEFT'] as Action[])assert.deepEqual(step(initial(p),a).player,spec.spawn)
    }
  }
})
test('strict schemas reject fences, missing, unknown, malformed or extra fields',()=>{
  assert.deepEqual(parse('{"action":"WAIT","reason":"observe"}','Future-known').action,'WAIT')
  for(const content of ['```json\n{}\n```','{}','{"action":"JUMP","reason":"x"}','{"action":"WAIT","reason":"x","safe_action":"RIGHT"}'])assert.throws(()=>parse(content,'Future-known'))
  assert.throws(()=>parse('{"action":"WAIT","reason":"x","predicted_next":{"pos":[2.5,3],"heading":"S"}}','Omniscient'))
})
test('prompt separation: no oracle paths, safe actions, wait labels or future truth in Omniscient',()=>{
  for(const p of phases){
    const omni=messages('Omniscient',initial(p),[]), known=messages('Future-known',initial(p),[])
    const publicState=JSON.parse(omni[1].content)
    assert.ok(!('future_robot' in publicState))
    assert.equal(JSON.parse(known[1].content).future_robot.length,6)
    for(const text of [JSON.stringify(omni),JSON.stringify(known)])assert.doesNotMatch(text,/safe_action|optimal|oracle|must.wait|wait.steps|phase/i)
  }
})
test('causal prediction attribution distinguishes erroneous prediction from bad action',()=>{
  const before=initial(0), after=step(before,'RIGHT')
  assert.equal(attribute(before,after,{action:'RIGHT',reason:'x',predicted_next:{pos:[2,4],heading:'S'}}).category,'Prediction Error')
  assert.equal(attribute(before,after,{action:'RIGHT',reason:'x',predicted_next:{pos:after.robot.pos,heading:after.robot.heading}}).category,'Action/Planning Error')
  assert.equal(attribute(before,after,{action:'RIGHT',reason:'x',predicted_next:{pos:[2,2],heading:'S'}}).category,'Action/Planning Error')
  assert.equal(attribute(before,{...before,outcome:'format'}).category,'Format Error')
})
