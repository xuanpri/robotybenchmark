import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {initial,step,type State} from '../blind/environment'
import {renderer,imageObservation} from './render-agent-view'
import {textMessages,compact,parse,attribute,type Decision} from './protocol'
import {sha} from './vision-provider'
const root='src/discrete/artifacts/vision-ablation'
test('deterministic PNG preview, pixel-level hidden-state noninterference, legal images',async()=>{
 const render=await renderer();try{mkdirSync(root+'/preview',{recursive:true});
 const cases=[['omniscient-visible.png',initial(0),'Omniscient-Vision'],['partial-window-visible.png',initial(1),'Partial-known-Vision'],['partial-corridor-occluded.png',{...initial(0),player:[3,3]},'Partial-known-Vision']] as const
 for(const [name,state,c] of cases){const png=await render.png(state as State,c);assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),640);assert.equal(png.readUInt32BE(20),384);writeFileSync(root+'/preview/'+name,png)}
 const a={...initial(0),tick:2,player:[3,3] as [number,number]},b={...initial(4),tick:2,player:[3,3] as [number,number]}
 assert.equal(sha(await render.png(a,'Partial-known-Vision')),sha(await render.png(b,'Partial-known-Vision')))
 assert.equal(sha(await render.png(a,'Partial-known-Vision')),sha(readFileSync(root+'/preview/partial-corridor-occluded.png')))
 const check=spawnSync('/home/jiaxuanren/miniconda3/envs/opsd/bin/python',['-c',`import cv2,numpy as np,pathlib
for p in pathlib.Path('${root}/preview').glob('*.png'):
 im=cv2.imread(str(p)); assert im is not None and im.shape==(384,640,3); assert len(np.unique(im.reshape(-1,3),axis=0))>20
`],{encoding:'utf8'});assert.equal(check.status,0,check.stderr)
 }finally{await render.close()}
})
test('text contains static rules and model-owned memory only; no phase or backend scores',()=>{
 const p=textMessages('Partial-known-Vision',3,[]);assert.deepEqual(JSON.parse(p[1].content),{tick:3,own_history:[]});assert.doesNotMatch(JSON.stringify(p),/phase|predictionCorrect|perceptionCorrect|true_robot|pauseRemaining/)
 const d:Decision={perceived_current:{player_pos:[2,3],robot_visible:false,robot_pos:null,robot_heading:null},predicted_next:{pos:[5,2],heading:'N'},action:'RIGHT',reason:'x'}
 assert.equal(compact(3,d),'t=3: perceived=P(2,3) Rhidden | pred=R(5,2)N | act=RIGHT')
})
test('strict schema rejects invalid JSON, PEEK and inconsistent visibility',()=>{assert.throws(()=>parse('```json\n{}\n```'));assert.throws(()=>parse('{}'));assert.throws(()=>parse(JSON.stringify({perceived_current:{player_pos:[1,3],robot_visible:false,robot_pos:[5,1],robot_heading:'S'},predicted_next:{pos:[5,2],heading:'S'},action:'PEEK',reason:''})))})
test('all five immediate counterfactual branches',()=>{
 const before={...initial(0),player:[4,3] as [number,number]},after=step(before,'RIGHT'),d:Decision={perceived_current:{player_pos:[4,3],robot_visible:false,robot_pos:null,robot_heading:null},predicted_next:{pos:[5,4],heading:'S'},action:'RIGHT',reason:''}
 assert.equal(after.outcome,'vision')
 assert.equal(attribute(before,{...after,outcome:'format'},'Partial-known-Vision',undefined,true),'Format Error')
 assert.equal(attribute(before,after,'Partial-known-Vision',{...d,perceived_current:{...d.perceived_current,player_pos:[3,3]}},true),'Perception Error (Immediate)')
 assert.equal(attribute(before,after,'Partial-known-Vision',d,false),'Perception Error (Upstream Sighting)')
 assert.equal(attribute(before,after,'Partial-known-Vision',d,true),'Prediction Error')
 assert.equal(attribute(before,after,'Partial-known-Vision',{...d,predicted_next:{pos:after.robot.pos,heading:after.robot.heading}},true),'Action/Planning Error')
})
