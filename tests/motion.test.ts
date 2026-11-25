import test from 'node:test'
import assert from 'node:assert/strict'
import {defaults} from '../src/sim/config'
import {distance,move,wallHit} from '../src/sim/geometry'
import {circuits} from '../src/sim/patrol'
test('swept player cannot tunnel through a wall and can slide parallel',()=>{
  const {room}=defaults()
  const p=move([8,7],[12,0],room,.28)
  const face=room.walls.find(w=>w.id==='spine')!.box[0]-.28
  assert.ok(p[0]<face && p[0]>face-.001)
  assert.equal(move(p,[0,1],room,.28)[1],8)
  assert.ok(move([1,8],[-20,0],room,.28)[0]>.69)
})
test('all patrol legs clear walls over a complete cycle and repeat',()=>{
  const cfg=defaults()
  for(const c of circuits(cfg,7)){
    for(let t=0;t<c.period;t+=.025){
      const p=c.at(t).position
      assert.equal(wallHit(p,p,cfg.room,cfg.robotRadius),Infinity)
    }
    assert.ok(Math.abs(c.at(0).position[0]-c.at(c.period).position[0])<1e-8)
  }
  cfg.patrols[0].nodes=[[1,7],[18,7]]
  assert.throws(()=>circuits(cfg,7),/boundary/)
})
test('explicit longer cycle adds a dwell at the first waypoint while preserving leg speed',()=>{
  const cfg=defaults();cfg.patrols[0].phase=0
  const original=circuits(cfg,1)[0]
  cfg.patrols[0].periodSeconds=original.period+3
  const longer=circuits(cfg,1)[0]
  assert.ok(distance(original.at(1).position,longer.at(1).position)<1e-10)
  assert.equal(longer.at(original.period+.5).phase,'pause')
  assert.deepEqual(longer.at(longer.period).position,cfg.patrols[0].nodes[0])
  cfg.patrols[0].periodSeconds=1
  assert.throws(()=>circuits(cfg,1),/shorter/)
})
