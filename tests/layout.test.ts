import test from 'node:test'
import assert from 'node:assert/strict'
import {defaults} from '../src/sim/config'
test('independent 24 × 16 room has four separately configured patrols and an enclosed perimeter',()=>{
  const {room,patrols}=defaults()
  assert.deepEqual([room.width,room.depth],[24,16])
  assert.equal(new Set(patrols.map(p=>p.id)).size,4)
  assert.deepEqual(room.walls.slice(0,4).map(w=>w.id),['north','south','west','east'])
})
