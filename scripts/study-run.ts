import {existsSync,readFileSync} from 'node:fs'
import {join} from 'node:path'
import assert from 'node:assert/strict'
import {read} from '../src/learning/dmx'
import {design,scene,sceneId,type Count} from '../src/study/scenes'
import {provider,digest} from '../src/study/provider'
import {runJob,type Job,type Lesson} from '../src/study/learn'
const root='results/layout-transfer-1',registry=JSON.parse(readFileSync('evidence/layout-transfer-1/scene-manifest.json','utf8'))
const retry=process.argv.includes('--retry-known')
async function run(n:Count,arm:Job['arm'],budget:number,initial:Lesson[]){
  const layout=arm==='source'?'A':'B',cfg=scene(layout,n,1),id=layout+'-N'+n+'-G3-'+arm,dir=join(root,id)
  const row=registry.scenes.find((s:{id:string})=>s.id===sceneId(layout,n,1))
  assert.equal(digest({seed:design.seed,config:cfg}),row.hash)
  const cp=join(dir,'checkpoint.json')
  if(existsSync(cp)){const previous=read<Awaited<ReturnType<typeof runJob>>>(cp)
    if(['acquired','not_acquired'].includes(previous.status))return previous
  }
  const result=await runJob({layout,cfg,id,group:'G3',arm,budget,initial},dir,provider(join(dir,'wire'),retry))
  console.log(id,result.status,result.first,result.pause)
  if(result.status==='paused')throw Error('Checkpoint '+cp+' ('+result.pause+')')
  return result
}
const acquired=[]
for(const n of design.counts as Count[]){
  const src=await run(n,'source',10,[])
  if(src.first!==null)acquired.push({n,first:src.first,id:src.id})
}
for(const {n,first,id} of acquired){
  const snapshot=read<Lesson[]>(join(root,id,'success-memory.json'))
  for(const arm of ['transfer','scratch'] as const)await run(n,arm,Math.max(1,first-1),arm==='transfer'?structuredClone(snapshot):[])
}
