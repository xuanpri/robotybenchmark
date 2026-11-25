import {join} from 'node:path'
import {readdirSync,existsSync} from 'node:fs'
import {save,read} from '../src/learning/dmx'
import {type Choice,type PublicTurn} from '../src/learning/protocol'
import {scene,type Count} from '../src/study/scenes'
import {Physics,sees,type State} from '../src/sim/world'
import {distance} from '../src/sim/geometry'
import {type AttemptFilm} from '../src/video/replay'
function execute(p:Physics,s:State,c:Choice){
 for(let k=0;k<Math.round(c.duration*10)&&s.outcome==='active';k++)s=p.advance(s,c.action)
 return s
}
const root='results/layout-transfer-1',runs=[]
for(const id of readdirSync(root)){
 const dir=join(root,id),file=join(dir,'replay.json')
 if(!existsSync(file))continue
 const {attempts}=read<{attempts:AttemptFilm[]}>(file)
 const trials=[]
 for(const f of attempts){
   const {turns}=read<{turns:PublicTurn[]}>(join(dir,'attempt-'+f.attempt+'.json'))
   const phy=new Physics(f.config,f.seed,true),starts:State[]=[],waits=[]
   let s=phy.initial(),blocked=0
   for(const turn of turns){
     starts.push(s)
     const after=execute(phy,s,turn.choice!)
     if(turn.choice?.action!=='WAIT' && after.outcome==='active' && distance(s.player,after.player)<.01)blocked++
     s=after
   }
   for(let k=0;k<turns.length;k++){
     if(turns[k].choice!.action!=='WAIT')continue
     const begin=k
     while(k+1<turns.length && turns[k+1].choice!.action==='WAIT')k++
     const next=turns[k+1]
     if(!next)continue
     const immediate=execute(phy,starts[begin],next.choice!)
     waits.push({time:starts[begin].clock*.01,wait:next.before.time-turns[begin].before.time,next:next.choice,actual:next.after.outcome,skip:immediate.outcome,position:starts[begin].player})
   }
   trials.push({attempt:f.attempt,blocked,waits,outcome:s.outcome,observersAtDetection:s.outcome==='seen'?phy.robots(s.clock).filter(b=>sees(b,s.player,f.config)).map(b=>b.id):[]})
 }
 let copied=null
 const routePath=join(dir,'success-route.json')
 if(id.endsWith('-source')&&existsSync(routePath)){
   const cfg=scene('B',attempts[0].config.robotCount as Count,1),phy=new Physics(cfg,1,true)
   let s=phy.initial(),steps=0
   for(const c of read<Choice[]>(routePath)){if(s.outcome!=='active')break;s=execute(phy,s,c);steps++}
   copied={outcome:s.outcome,steps,time:s.clock*.01,position:s.player,distanceToExit:distance(s.player,cfg.room.exit)}
 }
 runs.push({id,trials,sourceRouteOnB:copied})
}
save(join(root,'offline-behavior.json'),runs)
