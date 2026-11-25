import {actions,defaults,type Action,type Config} from './config'
import {distance} from './geometry'
import {Physics,type State,TICK} from './world'
interface Node {state:State;parent?:Node;action?:Action;count:number;priority:number}
class Frontier {
  private nodes:Node[]=[]
  get size(){return this.nodes.length}
  push(n:Node){
    let i=this.nodes.length;this.nodes.push(n)
    while(i){const parent=(i-1)>>1;if(this.nodes[parent].priority<=n.priority)break
      this.nodes[i]=this.nodes[parent];i=parent}
    this.nodes[i]=n
  }
  pop(){
    const first=this.nodes[0],last=this.nodes.pop()!
    if(this.nodes.length){
      let i=0
      while(2*i+1<this.nodes.length){
        let c=2*i+1
        if(c+1<this.nodes.length&&this.nodes[c+1].priority<this.nodes[c].priority)c++
        if(this.nodes[c].priority>=last.priority)break
        this.nodes[i]=this.nodes[c];i=c
      }
      this.nodes[i]=last
    }
    return first
  }
}
// Privileged feasibility witness. Search expands actual simulator actions, including WAIT.
// Aggregate 4 equal actions per edge for speed. This is not a completeness/optimality claim.
export function oracle(seed=1,cfg:Config=defaults(),limit=90000){
  const physics=new Physics(cfg,seed,true),queue=new Frontier(),visited=new Set<string>()
  const macro=4,step=macro*TICK*cfg.playerSpeed,goal=cfg.room.exit
  queue.push({state:physics.initial(),count:0,priority:0})
  let expanded=0
  while(queue.size&&expanded<limit){
    const n=queue.pop(),s=n.state
    const key=[Math.round((s.player[0]-cfg.room.spawn[0])/step),Math.round((s.player[1]-cfg.room.spawn[1])/step),s.clock].join('/')
    if(visited.has(key))continue
    visited.add(key);expanded++
    for(const act of actions){
      let next=s,count=0
      while(count<macro && next.outcome==='active'){next=physics.advance(next,act);count++}
      const [x,z]=next.player
      const travel=(Math.abs(x-goal[0])+Math.abs(z-goal[1]))/cfg.playerSpeed
      const child:Node={state:next,parent:n,action:act,count,priority:next.clock*.01+2.5*travel}
      if(next.outcome==='escaped'){
        const route:Action[]=[]
        for(let p:Node|undefined=child;p?.action;p=p.parent)for(let k=0;k<p.count;k++)route.push(p.action)
        return {strategy:'Oracle / time-aware weighted A*',seed,expanded,actions:route.reverse(),time:next.clock*.01}
      }
      if(next.outcome==='active' && (act==='WAIT'||distance(s.player,next.player)>step-1e-7))queue.push(child)
    }
  }
  throw Error('Oracle search exhausted after '+expanded+' states')
}
