import test from 'node:test'
import assert from 'node:assert/strict'
import {createSession} from '../src/sim/session'
import {defaults,actions,direction,type Point} from '../src/sim/config'
import {distance,wallHit} from '../src/sim/geometry'
import {oracle} from '../src/sim/oracle'

test('headless Oracle replay reaches exit with all four robots and both failure rules enabled',()=>{
  const w=oracle(),session=createSession()
  for(const a of w.actions)session.agent.step(a)
  assert.equal(session.agent.observe().outcome,'escaped')
  assert.equal(session.agent.observe().time,w.time)
})
test('map has alternative routes through opposite sides of the central partition',()=>{
  const {room,playerRadius:r}=defaults()
  // Block either the northern or southern passage across x=12 and search again.
  for(const north of [false,true]){
    const queue:Point[]=[room.spawn],seen=new Set<string>();let found=false
    for(let i=0;i<queue.length&&!found;i++){
      const a=queue[i]
      if(distance(a,room.exit)<room.exitRadius){found=true;break}
      for(const act of actions.slice(0,4)){
        const d=direction[act],p:Point=[a[0]+d[0],a[1]+d[1]]
        if(p[0]<0||p[0]>24||p[1]<0||p[1]>16||seen.has(p.join(','))||wallHit(a,p,room,r)!==Infinity)continue
        if((a[0]-12)*(p[0]-12)<0&&(north?p[1]>7:p[1]<7))continue
        seen.add(p.join(','));queue.push(p)
      }
    }
    assert.ok(found)
  }
})
test('seeded jitter and identical actions reproduce a complete episode; attempts capped',()=>{
  const cfg=defaults();cfg.phaseJitter=.22;cfg.maxTime=.3;cfg.maxAttempts=2;cfg.failure='contact'
  const a=createSession(5,cfg),b=createSession(5,cfg)
  assert.notDeepEqual(a.getGroundTruth().robots,createSession(6,cfg).getGroundTruth().robots)
  for(const k of ['MOVE_EAST','WAIT','MOVE_WEST'] as const)assert.deepEqual(a.agent.step(k),b.agent.step(k))
  assert.equal(a.agent.observe().outcome,'timeout');assert.throws(()=>a.agent.step('WAIT'))
  assert.equal(a.retry().time,0)
  for(let i=0;i<3;i++)a.step('WAIT')
  assert.throws(()=>a.retry())
})
