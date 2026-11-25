import {spawnSync} from 'node:child_process'
import {mkdirSync,readFileSync,existsSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {manifest,oracleRuns,modelRun,report,save} from '../src/discrete/calibrate'
import {phases} from '../src/discrete/environment'
import {exportRuns} from '../src/discrete/export'
import {audit} from '../src/discrete/audit'
import type {Run} from '../src/discrete/records'

async function main(){
  const args=process.argv.slice(2),arg=(name:string)=>{const i=args.indexOf(name);return i<0?undefined:args[i+1]}
  const root=resolve(arg('--out')??'src/discrete/artifacts/calibration-v1')
  manifest(root)
  const tests=spawnSync(process.execPath,['--import','tsx','--test','--test-isolation=none','src/discrete/environment.test.ts'],{encoding:'utf8'})
  process.stdout.write(tests.stdout);process.stderr.write(tests.stderr)
  save(join(root,'unit-tests.json'),{status:tests.status,stdout:tests.stdout,stderr:tests.stderr})
  if(tests.status!==0)throw Error('Unit tests must pass before model requests')
  const runs=oracleRuns()
  for(const run of runs){const dir=join(root,run.id);mkdirSync(dir,{recursive:true});save(join(dir,'run.json'),run)}
  console.log('Oracle',runs.filter(r=>r.outcome==='success').length+'/5')
  if(args.includes('--render-only')){
    for(const condition of ['Future-known','Omniscient'] as const)for(const phase of phases){
      const file=join(root,condition.toLowerCase()+'-phase-'+phase,'run.json')
      if(existsSync(file))runs.push(JSON.parse(readFileSync(file,'utf8')) as Run)
    }
  }else if(!args.includes('--oracle-only')){
    try{
      for(const condition of ['Future-known','Omniscient'] as const)for(const phase of phases){
        runs.push(await modelRun(root,condition,phase));report(root,runs)
      }
    }catch(e){report(root,runs);throw e}
  }
  const summary=report(root,runs);console.log(JSON.stringify(summary,null,2))
  console.log('Audit',JSON.stringify(audit(root,runs)))
  if(!args.includes('--no-video'))await exportRuns(root,runs)
  if(!args.includes('--oracle-only') && !args.includes('--render-only') && !summary.passed)process.exitCode=2
}
main().catch(e=>{console.error('Calibration stopped:',(e as Error).message);process.exitCode=1})
