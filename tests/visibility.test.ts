import test from 'node:test'
import assert from 'node:assert/strict'
import {createSession} from '../src/sim/session'
import {defaults} from '../src/sim/config'
test('limited observations and their history omit hidden robots entirely while they move',()=>{
  const cfg=defaults();cfg.playerRange=.01
  const e=createSession(12,cfg),before=e.getGroundTruth()
  assert.deepEqual(Object.keys(e.agent).sort(),['observe','step'])
  assert.ok(!JSON.stringify(e.agent.observe()).includes('"R1"'))
  for(let i=0;i<4;i++)e.agent.step('WAIT')
  assert.equal(e.view('limited').robots.length,0)
  assert.equal(e.view('omniscient').robots.length,4)
  assert.notDeepEqual(before.robots[0].position,e.getGroundTruth().robots[0].position)
  const o=e.agent.observe()
  assert.ok(o.history.every(h=>h.robots.length===0))
  assert.deepEqual(Object.keys(o).sort(),'actions attempt goal heading history map maxAttempts outcome player robots time'.split(' ').sort())
  o.map.spawn[0]=999;assert.notEqual(e.agent.observe().map.spawn[0],999)
})
test('switching views cannot advance time or change the world',()=>{
  const e=createSession(),a=e.getGroundTruth()
  for(const m of ['debug','omniscient','limited'] as const)e.view(m)
  assert.deepEqual(e.getGroundTruth(),a)
})
test('wall hides a patrol from a nearby agent despite range; read-only observation is idempotent',()=>{
  const cfg=defaults();cfg.failure='contact';cfg.robotCount=1
  cfg.room.spawn=[12,8.25];cfg.patrols[0]={id:'R1',nodes:[[12,6],[10,6]],speed:1,phase:0,turn:.4,pause:.2}
  const w=createSession(3,cfg)
  const before=w.observe()
  assert.deepEqual(before.robots,[]);assert.equal(w.getGroundTruth().robots.length,1)
  assert.deepEqual(w.observe(),before)
  assert.equal(w.step('WAIT').history.at(-1)?.robots.length,0)
})
