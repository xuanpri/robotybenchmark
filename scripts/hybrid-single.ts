import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {resolve,join} from 'node:path'
import {defaults} from '../src/sim/config'
import {runJob,type InputOptions} from '../src/study/learn'
import {provider} from '../src/study/provider'
const [file,output,flag]=process.argv.slice(2)
if(!file||!output||flag!=='--run')throw Error('Usage: hybrid-single.ts config.json NEW_OUTPUT_DIR --run (real paid requests)')
const c=JSON.parse(readFileSync(file,'utf8'))
if(c.layout!=='A'||![0,1,2,4].includes(c.robot_count)||!Number.isSafeInteger(c.seed)||
 !['omniscient','limited'].includes(c.observation_mode)||!['text','hybrid'].includes(c.input_mode)||![4,'full'].includes(c.history_limit))throw Error('Invalid single-run config')
const dir=resolve(output);mkdirSync(dir) // exclusive fresh output; no overwrites
const cfg=defaults();cfg.robotCount=c.robot_count;cfg.patrols=cfg.patrols.slice(0,c.robot_count);cfg.observation=c.observation_mode
const prompts=JSON.parse(readFileSync('evidence/rule-audit/prompts.json','utf8'))
// The existing rule-complete prompt describes limited visibility. Specialize
// that observation sentence for the explicit omniscient condition.
let system=prompts.complete
if(c.observation_mode==='omniscient')system=system.replace('Only nearby unobstructed patrols are shown.','All patrols are shown at the current decision time.').replace('Within 6 m and a clear segment you receive robot ID, position and heading only at decision boundaries.','You receive every patrol ID, position and heading only at decision boundaries.')

// Optionally expose patrol dynamics without revealing future states.
if(c.publish_rules !== undefined && typeof c.publish_rules !== 'boolean')
 throw Error('publish_rules must be boolean')

if(c.publish_rules === true){
 cfg.publishRules = true
 const rules = cfg.patrols.map(({id,nodes,speed,pause,turn,periodSeconds})=>({
   id,nodes,speed,pause,turn,
   ...(periodSeconds===undefined?{}:{periodSeconds})
 }))
 system += '\n\nAdditional patrol dynamics:'
 system += '\nPatrols follow their patrol nodes.'
 system += '\nSpeed is measured in meters per second.'
 system += '\nPause and turn durations are measured in seconds.'
 system += '\nAt endpoints, patrols pause before turning.'
 system += '\nPatrol configuration: ' + JSON.stringify(rules)
}

let index=0
const options:InputOptions={...c,system,noMemory:true,screenshot:async(frame,room)=>{
 const stem=join(dir,'decision-'+(++index)),input=stem+'.public.json',image=stem+'.png'
 writeFileSync(input,JSON.stringify({frame,room}),{flag:'wx'})
 const proc=spawnSync(process.execPath,['scripts/decision-screenshot.cjs',input,image],{stdio:'inherit'})
 if(proc.status!==0)throw Error('Decision screenshot failed; API not dispatched')
 return 'data:image/png;base64,'+readFileSync(image).toString('base64')
}}
writeFileSync(join(dir,'input-config.json'),JSON.stringify(c),{flag:'wx'})
console.log(await runJob({id:'single',layout:'A',group:'G3',cfg,budget:1,initial:[],arm:'source'},dir,provider(join(dir,'wire')),options))
