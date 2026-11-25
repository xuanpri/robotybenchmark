import {mkdirSync,readFileSync} from 'node:fs'
import {isDeepStrictEqual} from 'node:util'
import {resolve,basename} from 'node:path'
import {dmx} from '../src/learning/dmx'
import {baseDir} from '../src/learning/dmx-pilot'
import {spawnSync} from 'node:child_process'
import {runExperiment} from '../src/learning/runner'
import {settings} from '../src/learning/protocol'
const [file,dir,locked]=process.argv.slice(2)
if(!file||!dir)throw Error('Usage: npm run learn -- config.json results/experiment-id')
const preset=JSON.parse(readFileSync(file,'utf8'))
if(preset.agent_id===dmx.agent_id){
  const track=basename(dir)
  if(!['smoke','A','B'].includes(track)||resolve(dir)!==resolve(baseDir,track)||!isDeepStrictEqual(preset,dmx))throw Error('Use registered DMX pilot config and its shared-budget output directory')
  const child=spawnSync(process.execPath,['--import','tsx','scripts/dmx-pilot.ts',track],{stdio:'inherit'})
  process.exit(child.status??1)
}
mkdirSync(dir,{recursive:true})
if(locked!=='locked'){
  const child=spawnSync('flock',['-n',dir,process.execPath,'--import','tsx',process.argv[1],file,dir,'locked'],{stdio:'inherit'})
  if(child.error)throw child.error;process.exitCode=child.status??1
}else console.log(JSON.stringify(await runExperiment(dir,settings(JSON.parse(readFileSync(file,'utf8')))),null,2))
