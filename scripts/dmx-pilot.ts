import {mkdirSync,existsSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {Ledger,read,type Track} from '../src/learning/dmx'
import {baseDir,pilot} from '../src/learning/dmx-pilot'
const track=process.argv[2] as Track
if(!['A','B','smoke'].includes(track))throw Error('Choose smoke, A or B')
mkdirSync(baseDir,{recursive:true})
if(process.argv[3]!=='locked'){
  const r=spawnSync('flock',['-n',baseDir,process.execPath,'--import','tsx',process.argv[1],track,'locked'],{stdio:'inherit'})
  process.exitCode=r.status??1
}else{
  if(track!=='smoke'&&(!existsSync(baseDir+'/smoke/summary.json')||!read<{smokeVerified:boolean}>(baseDir+'/smoke/summary.json').smokeVerified))throw Error('Smoke gate not passed')
  const finished=baseDir+'/'+track+'/summary.json'
  if(existsSync(finished)&&!read<{stop:string}>(finished).stop){console.log('Finished; using archived '+track+' results');process.exit(0)}
  const r=await pilot(track,new Ledger(baseDir+'/wire',false,process.env.DMX_RESUME_KNOWN_FAILURE==='1'),baseDir+'/'+track)
  console.log(JSON.stringify(r));if(r.stop||track==='smoke'&&!r.smokeVerified)process.exitCode=2
}
