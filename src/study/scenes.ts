import design from '../../config/study/design.json'
import {defaults,type Config,type Box,type Action} from '../sim/config'
import type {Choice} from '../learning/protocol'
export {design}
export type Layout='A'|'B'|'C'
export type Count=0|2|4
export function scene(layout:Layout,n:Count,pattern:1|2){
  if(n===0 && pattern!==1)throw Error('N0 has a single configuration')
  const cfg=defaults()
  if(layout!=='A')cfg.room.walls=[...cfg.room.walls.slice(0,4),...design.layouts[layout].map((b,i)=>({id:layout+'-'+(i+1),box:[...b] as Box}))]
  cfg.robotCount=n
  cfg.patrols=cfg.patrols.slice(0,n)
  if(pattern===2)cfg.patrols.forEach((p,i)=>{p.phase=(p.phase+design.phaseShift[i])%1})
  return cfg
}
export function sceneId(l:Layout,n:Count,p:1|2){return l+'-N'+n+'-P'+p}
// Losslessly pack a witness into the model's discrete durations. Only the last
// move may extend past the witness as the simulator stops immediately at exit.
export function pack(trace:Action[]):Choice[]{
  const packed:Choice[]=[]
  for(let i=0;i<trace.length;){
    const action=trace[i];let end=i+1
    while(end<trace.length&&trace[end]===action)end++
    const length=end-i, best:(number[]|undefined)[]=[[]]
    for(let k=1;k<=length+9;k++)for(const d of design.durations.map(x=>Math.round(x*10))){
      const previous=best[k-d]
      if(previous && (!best[k]||previous.length+1<best[k]!.length))best[k]=[...previous,d]
    }
    const chosen=best[length]??(end===trace.length?best.slice(length).find(Boolean):undefined)
    if(!chosen)throw Error('Witness cannot be packed')
    packed.push(...chosen.map(d=>({action,duration:d/10})));i=end
  }
  return packed
}
