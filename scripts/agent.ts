// A separate process owns the simulator; only this allowlist crosses stdout.
import {createInterface} from 'node:readline'
import {createSession} from '../src/sim/session'
import {actions,defaults,type Action} from '../src/sim/config'
const seed=Number(process.argv[2]??1),cfg=defaults(),session=createSession(seed,cfg)
for await(const line of createInterface({input:process.stdin,crlfDelay:Infinity})){
  try{
    const cmd=JSON.parse(line)
    let observation
    if(cmd.op==='observe')observation=session.agent.observe()
    else if(cmd.op==='step'&&actions.includes(cmd.action as Action))observation=session.agent.step(cmd.action)
    else if(cmd.op==='retry')observation=session.retry()
    else throw Error('Unsupported request')
    console.log(JSON.stringify({ok:true,observation}))
  }catch(e){console.log(JSON.stringify({ok:false,error:e instanceof SyntaxError?'Invalid JSON':(e as Error).message}))}
}
