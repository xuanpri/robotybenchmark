// Counterfactual replay of the same lower-count Oracle actions and same delay
// at both counts. This uses only simulator witnesses and never model behavior.
import {Physics} from '../src/sim/world'
import {type Config,type Action} from '../src/sim/config'
import {read,save} from '../src/learning/dmx'
import type {Choice} from '../src/learning/protocol'
const root='evidence/layout-transfer-1'
type Row={id:string;config:Config;layout_id:string;robot_count:number;patrol_pattern_id:number;oracle:{decisions:Choice[]}}
const rows=read<{scenes:Row[]}>(root+'/scene-manifest.json').scenes
const results=[]
for(const row of rows.filter(s=>s.robot_count>0)){
 const low=rows.find(s=>s.layout_id===row.layout_id && s.robot_count===row.robot_count-2 && (s.robot_count===0||s.patrol_pattern_id===row.patrol_pattern_id))!
 const smaller=new Physics(low.config,1,true),larger=new Physics(row.config,1,true)
 const counts={bothEscape:0,extraPatrolsPreventEscape:0,neitherEscapes:0}
 let witness:null|{delay:number;failure:string;time:number}=null
 const actions=low.oracle.decisions.flatMap(c=>Array<Action>(Math.round(10*c.duration)).fill(c.action))
 for(let i=0;i<=40;i++){ // departure in [0,4] s in 0.1 s steps
   function outcome(p:Physics){
    let s=p.initial()
    for(const a of [...Array<Action>(i).fill('WAIT'),...actions]){if(s.outcome!=='active')break;s=p.advance(s,a)}
    return s
   }
   const a=outcome(smaller),b=outcome(larger)
   if(a.outcome==='escaped'&&b.outcome!=='escaped'){
    counts.extraPatrolsPreventEscape++;if(!witness)witness={delay:i/10,failure:b.outcome,time:b.clock*.01}
   }else if(a.outcome==='escaped'&&b.outcome==='escaped')counts.bothEscape++
   else counts.neitherEscapes++
 }
 results.push({scene:row.id,comparison:low.id,counts,witness})
}
save(root+'/incremental-hazards.json',results)
console.table(results.map(r=>({scene:r.scene,newlyUnsafe:r.counts.extraPatrolsPreventEscape,bothEscape:r.counts.bothEscape})))
