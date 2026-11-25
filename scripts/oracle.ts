import {createSession} from '../src/sim/session'
import {oracle} from '../src/sim/oracle'
const seed=Number(process.argv[2]??1),witness=oracle(seed),session=createSession(seed)
for(const action of witness.actions)session.agent.step(action)
const result=session.agent.observe()
if(result.outcome!=='escaped'||result.time!==witness.time)throw Error('Witness replay mismatch')
console.log(JSON.stringify({...witness,replay:{outcome:result.outcome,player:result.player,time:result.time}},null,2))
