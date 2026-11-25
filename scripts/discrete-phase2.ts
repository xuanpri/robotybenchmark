import {spawnSync} from 'node:child_process'
import {existsSync,readFileSync,readdirSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {createHash} from 'node:crypto'
import {freeze,programmaticGates,playPhase,save,loadRuns} from '../src/discrete/blind/experiment'
import {phases} from '../src/discrete/blind/environment'
import {conditions,type Condition} from '../src/discrete/blind/public'
import {report} from '../src/discrete/blind/report'

async function phaseGroup(root:string,c:Condition,concurrency:number){
  let index=0,failure:unknown
  await Promise.all(Array.from({length:concurrency},async()=>{
    while(index<phases.length&&!failure){const phase=phases[index++];try{await playPhase(root,c,phase,()=>report(root))}catch(e){failure=e}}
  }))
  report(root);if(failure)throw failure
}
function verifyProtected(root:string){
  const file=join(root,'protected-before.json')
  if(!existsSync(file))return
  const before=JSON.parse(readFileSync(file,'utf8')),changed=Object.keys(before).filter(path=>!existsSync(path)||createHash('sha256').update(readFileSync(path)).digest('hex')!==before[path])
  save(join(root,'protected-audit.json'),{passed:changed.length===0,files:Object.keys(before).length,changed})
  if(changed.length)throw Error('Protected files changed: '+changed.join(', '))
}
async function main(){
  const args=process.argv.slice(2),value=(flag:string)=>{const i=args.indexOf(flag);return i<0?undefined:args[i+1]}
  const root=resolve(value('--out')??'src/discrete/artifacts/phase2-v1'),concurrency=Number(value('--concurrency')??3)
  if(!Number.isInteger(concurrency)||concurrency<1||concurrency>6)throw Error('concurrency must be 1..6')
  freeze(root);verifyProtected(root)
  const tests=spawnSync(process.execPath,['--import','tsx','--test','--test-isolation=none','src/discrete/blind/environment.test.ts'],{encoding:'utf8'})
  process.stdout.write(tests.stdout);process.stderr.write(tests.stderr)
  save(join(root,'unit-tests.json'),{status:tests.status,stdout:tests.stdout,stderr:tests.stderr})
  if(tests.status!==0||!tests.stdout.includes('tests 11'))throw Error('All 11 preflight tests must actually execute before API dispatch')
  console.log('Programmatic gates',JSON.stringify(programmaticGates(root)))
  if(args.includes('--preflight-only')){report(root);verifyProtected(root);return}
  if(!args.includes('--render-only')){
    await phaseGroup(root,'Omniscient',concurrency)
    const gate=report(root).preflight
    if(!gate.omniscientPassed)throw Error('Omniscient gate failed; formal experiment NOT dispatched')
    if(!args.includes('--stop-after-omni'))for(const c of conditions.slice(1))await phaseGroup(root,c,concurrency)
  }
  // Rendering and audits are loaded only after data collection; --no-video is
  // sufficient for a full data-only run with the same frozen requests.
  const {audit}=await import('../src/discrete/blind/audit')
  console.log('Audit',JSON.stringify(audit(root)))
  if(!args.includes('--no-video')){
    const {exportSelected}=await import('../src/discrete/blind/export')
    await exportSelected(root,loadRuns(root))
  }
  verifyProtected(root)
  const result=report(root);console.log(JSON.stringify({complete:result.complete,preflight:result.preflight,summary:result.summary},null,2))
}
main().catch(e=>{console.error('Phase 2 stopped:',(e as Error).message);process.exitCode=1})
