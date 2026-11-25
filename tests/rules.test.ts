import test from 'node:test'
import assert from 'node:assert/strict'
import {defaults,type Point} from '../src/sim/config'
import {Physics,observable,sees} from '../src/sim/world'
import type {Robot} from '../src/sim/patrol'
const bot=(p:Point,heading:number):Robot=>({id:'test',position:p,heading,speed:0,node:0,phase:'pause'})
test('walls clip both player observation and the effective 90 degree vision cone',()=>{
  const cfg=defaults()
  assert.equal(sees(bot([12,6],Math.PI/2),[12,8],cfg),false)
  assert.equal(observable([12,8],[12,6],cfg),false)
  assert.equal(sees(bot([12,6],Math.PI),[10,6],cfg),true)
  assert.equal(sees(bot([12,6],0),[10,6],cfg),false)
})
test('unobstructed vision ends vision/both runs, contact mode ignores it',()=>{
  const cfg=defaults();cfg.robotCount=1;cfg.room.spawn=[5,6.2]
  cfg.patrols[0].nodes=[[3,6.2],[6,6.2]];cfg.patrols[0].phase=0
  for(const rule of ['both','contact','vision'] as const){
    cfg.failure=rule;const p=new Physics(cfg,1)
    assert.equal(p.initial().outcome,rule==='contact'?'active':'seen')
  }
})
test('contact in the middle of a fast action ends it before the endpoint',()=>{
  const cfg=defaults();cfg.robotCount=1;cfg.failure='contact';cfg.room.spawn=[1.5,6.2];cfg.playerSpeed=55;cfg.patrols[0].phase=0
  const p=new Physics(cfg,1),s=p.advance(p.initial(),'MOVE_EAST')
  assert.equal(s.outcome,'contact');assert.ok(s.clock<10 && s.player[0]<3)
})
test('vision can discover the player mid-action with endpoints outside the cone',()=>{
  const cfg=defaults();cfg.robotCount=1;cfg.failure='vision';cfg.playerSpeed=40
  cfg.visionDegrees=20;cfg.visionRange=3;cfg.room.spawn=[1.5,8.2]
  cfg.patrols[0]={id:'R1',nodes:[[3.5,6.2],[3.5,7.2]],speed:.01,pause:0,turn:.5,phase:0}
  const p=new Physics(cfg,1),initial=p.initial()
  assert.equal(initial.outcome,'active')
  assert.equal(sees(p.robots(10)[0],[5.5,8.2],cfg),false)
  const next=p.advance(initial,'MOVE_EAST')
  assert.equal(next.outcome,'seen');assert.ok(next.clock>0 && next.clock<10)
})
