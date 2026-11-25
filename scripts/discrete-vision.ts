import {mkdirSync,readFileSync,existsSync} from 'node:fs'
import {join} from 'node:path'
import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {save} from '../src/discrete/dynamics/preflight'
import {spec} from '../src/discrete/blind/environment'
import {runAll,report,phases,conditions} from '../src/discrete/vision/experiment'
import {BudgetStop,ledger,sha} from '../src/discrete/vision/vision-provider'
const root='src/discrete/artifacts/vision-ablation'
function protectedCheck(){const before=JSON.parse(readFileSync(join(root,'protected-before.json'),'utf8')),changed=Object.keys(before).filter(f=>!existsSync(f)||sha(readFileSync(f))!==before[f]);save(join(root,'protected-audit.json'),{passed:changed.length===0,files:Object.keys(before).length,changed});if(changed.length)throw Error('Protected files changed')}
async function main(){
 const args=process.argv.slice(2),index=args.indexOf('--max-budget-rmb'),budget=index<0?12:Number(args[index+1]);if(!Number.isFinite(budget)||budget<=.5||budget>12)throw Error('Budget must be >0.50 and <=12 RMB')
 mkdirSync(root,{recursive:true});protectedCheck()
 const sources=['render-agent-view.ts','vision-provider.ts','protocol.ts','experiment.ts'].map(f=>({file:f,sha256:sha(readFileSync(join('src/discrete/vision',f)))})),manifest={version:1,model:'gpt-5.6-sol',spec,phases,conditions,maxAttempts:1,maxBudgetRMB:budget,reserveRMB:.5,resolution:[640,384],periodResolution:'User confirmed original phase2-v1 period8 rather than period14.',sources,history:'model-owned compact records only',imageCountPerRequest:1,video:false},fingerprint=sha(JSON.stringify(manifest))
 const file=join(root,'manifest.json');if(existsSync(file)&&JSON.parse(readFileSync(file,'utf8')).fingerprint!==fingerprint&&ledger(root).physicalRequests>0)throw Error('Frozen sources/config changed')
 save(file,{...manifest,fingerprint})
 const tests=spawnSync(process.execPath,['--import','tsx','--test','--test-isolation=none','src/discrete/vision/tests.ts'],{encoding:'utf8'});process.stdout.write(tests.stdout);process.stderr.write(tests.stderr);save(join(root,'unit-tests.json'),{status:tests.status,stdout:tests.stdout,stderr:tests.stderr});if(tests.status!==0||!tests.stdout.includes('tests 4'))throw Error('Four preflight tests must execute and pass before API')
 if(args.includes('--preview-only')){protectedCheck();return}
 try{await runAll(root,budget)}catch(e){if(e instanceof BudgetStop){save(join(root,'budget-stop.json'),{reason:e.message,ledger:ledger(root)});console.log('Graceful budget stop',e.message)}else throw e}finally{report(root);protectedCheck()}
 console.log(JSON.stringify(report(root),null,2))
}
main().catch(e=>{console.error('Vision ablation stopped:',(e as Error).message);process.exitCode=1})
