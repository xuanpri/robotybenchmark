import {spawnSync} from 'node:child_process'
import {mkdirSync,readFileSync,existsSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {createHash} from 'node:crypto'
import {gates,randomBaseline,save} from '../src/discrete/dynamics/preflight'
import {series,matrix,loadRuns} from '../src/discrete/dynamics/experiment'
import {seeds} from '../src/discrete/dynamics/world'
import {report} from '../src/discrete/dynamics/report'
import {audit} from '../src/discrete/dynamics/audit'
const digest=(data:string|Buffer)=>createHash('sha256').update(data).digest('hex')
function protectedAudit(root:string){
  const file=join(root,'protected-before.json');if(!existsSync(file))return
  const before=JSON.parse(readFileSync(file,'utf8')),changed=Object.keys(before).filter(p=>!existsSync(p)||digest(readFileSync(p))!==before[p])
  save(join(root,'protected-audit.json'),{passed:!changed.length,files:Object.keys(before).length,changed});if(changed.length)throw Error('Protected files changed')
}
async function main(){
  const args=process.argv.slice(2),value=(key:string)=>{const i=args.indexOf(key);return i<0?undefined:args[i+1]}
  const root=resolve(value('--out')??'src/discrete/artifacts/phase2-v2'),concurrency=Number(value('--concurrency')??6)
  if(!Number.isInteger(concurrency)||concurrency<1||concurrency>6)throw Error('concurrency must be 1..6')
  mkdirSync(root,{recursive:true});protectedAudit(root)
  const sources=['world.ts','protocol.ts','preflight.ts','experiment.ts'].map(name=>({name,hash:digest(readFileSync(join('src/discrete/dynamics',name)))}))
  const frozen={version:1,model:'gpt-5.6-sol',seeds,matrix,sources,cap:5,randomEarlyStop:false,optionalRandomInteractive:false,phaseStratification:[4,5,6,9,10,11],randomKernel:'uniform over legal N/S/STAY; heading persists on STAY',randomBaselineSeeds:[1001,1100],waitRandomRange:[0,10],prng:'domain-separated mulberry32 integer seed/attempt mix'}
  const fingerprint=digest(JSON.stringify(frozen)),path=join(root,'manifest.json')
  if(existsSync(path)&&JSON.parse(readFileSync(path,'utf8')).fingerprint!==fingerprint)throw Error('Frozen experiment changed; cannot overwrite requests')
  save(path,{...frozen,fingerprint})
  const tests=spawnSync(process.execPath,['--import','tsx','--test','--test-isolation=none','src/discrete/dynamics/world.test.ts'],{encoding:'utf8'})
  process.stdout.write(tests.stdout);process.stderr.write(tests.stderr);save(join(root,'unit-tests.json'),{status:tests.status,stdout:tests.stdout,stderr:tests.stderr})
  if(tests.status!==0||!tests.stdout.includes('tests 11'))throw Error('All 11 tests must actually execute before API dispatch')
  const pre=gates(root);randomBaseline(root);console.log('Zero-cost gates',pre.oracleSolved+'/90',pre.antiPrior.map(r=>[r.policy,r.success]))
  if(args.includes('--preflight-only')){report(root);protectedAudit(root);return}
  if(!args.includes('--render-only'))for(const group of matrix){
    let index=0,failure:unknown
    await Promise.all(Array.from({length:concurrency},async()=>{while(index<seeds.length&&!failure){const seed=seeds[index++];try{await series(root,group.mode,group.condition,seed,()=>report(root))}catch(e){failure=e}}}))
    report(root);if(failure)throw failure
    if(group.condition==='Omniscient'){
      const done=loadRuns(root).filter(r=>r.condition==='Omniscient'),passed=done.filter(r=>r.outcome==='success').length>=5
      save(join(root,'omniscient-gate.json'),{passed,success:done.filter(r=>r.outcome==='success').length,total:6})
      if(!passed)throw Error('Pattern upper-bound gate failed; core matrix not dispatched')
    }
  }
  console.log('Audit',JSON.stringify(audit(root)))
  if(!args.includes('--no-video')){const {exportSelected}=await import('../src/discrete/dynamics/export');await exportSelected(root,loadRuns(root))}
  protectedAudit(root)
  const result=report(root);console.log(JSON.stringify({complete:result.complete,runs:result.completedRuns,requests:result.modelRequests,groups:result.groups.map(g=>({mode:g.mode,condition:g.condition,pass:g.pass,visible:g.visible,occluded:g.occluded}))},null,2))
}
main().catch(e=>{console.error('Phase 2.2 stopped:',(e as Error).message);process.exitCode=1})
