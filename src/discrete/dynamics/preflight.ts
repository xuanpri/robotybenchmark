import {mkdirSync,writeFileSync,renameSync} from 'node:fs'
import {join} from 'node:path'
import {modes,seeds,instance,initial,step,solve,advance,rng,danger,move,same,type Instance,type Action,type Robot,type Params} from './world'
export const save=(file:string,data:unknown)=>{writeFileSync(file+'.partial',JSON.stringify(data,null,2));renameSync(file+'.partial',file)}
export const policies=['Blind-Rush','Wait-Random-Then-Rush','Memoryless-Reactive','Symmetric-Prior-Heuristic'] as const
export type Policy=typeof policies[number]
export function baseline(i:Instance,policy:Policy){
  let s=initial(i),wait=Math.floor(rng(i.seed,i.attempt,99)()*11),virtual:Robot|null=null
  const symmetric:Params={min:0,max:5,southSpeed:1,northSpeed:1,northPause:1,southPause:1,alt:false,stutter:false}
  const states=[s],actions:Action[]=[]
  while(s.outcome==='running'){
    let a:Action='RIGHT'
    if(policy==='Memoryless-Reactive'&&same(s.player,[1,3])&&same(s.robot.pos,[5,3]))a='WAIT'
    if(policy==='Wait-Random-Then-Rush'&&wait-->0)a='WAIT'
    if(policy==='Symmetric-Prior-Heuristic'){
      if(same(s.player,[1,3]))virtual={pos:[...s.robot.pos],heading:s.robot.heading,pauseRemaining:(s.robot.pos[1]===0&&s.robot.heading==='N'||s.robot.pos[1]===5&&s.robot.heading==='S')?1:0,cooldown:0,stutterRemaining:0,altNext:0}
      virtual=advance(virtual!,symmetric)
      if(danger(s,move(s.player,'RIGHT'),virtual)!=='running')a='WAIT'
    }
    s=step(s,a,i);states.push(s);actions.push(a)
  }
  return {seed:i.seed,attempt:i.attempt,policy,outcome:s.outcome,actions,states}
}
export function wilson(success:number,n:number){
  if(!n)return null
  const z=1.959963984540054,p=success/n,den=1+z*z/n,center=(p+z*z/(2*n))/den,half=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den
  return [center-half,center+half]
}
// Exact finite-horizon Markov calculation for the declared random transition
// kernel, including heading persistence on STAY and endpoint renormalization.
export function exactRandomProbability(policy:Exclude<Policy,'Symmetric-Prior-Heuristic'>){
  let distribution=new Map<string,number>(),success=0
  const waits=policy==='Wait-Random-Then-Rush'?11:1
  for(let z=0;z<6;z++)for(const h of ['N','S'])for(let w=0;w<waits;w++)distribution.set(JSON.stringify([1,z,h,w]),1/(12*waits))
  for(let tick=0;tick<30;tick++){
    const next=new Map<string,number>()
    for(const [key,mass] of distribution){
      const [x,z,h,w]=JSON.parse(key),wait=policy==='Wait-Random-Then-Rush'&&w>0||policy==='Memoryless-Reactive'&&x===1&&z===3
      const X=wait?x:x+1,choices=[...(z>0?[-1]:[]),...(z<5?[1]:[]),0]
      for(const d of choices){
        const Z=z+d,H=d===0?h:d===1?'S':'N',robot={pos:[5,Z] as [number,number],heading:H},before={tick,player:[x,3] as [number,number],robot:{pos:[5,z],heading:h} as Robot,outcome:'running' as const}
        if(danger(before,[X,3],robot)!=='running')continue
        const p=mass/choices.length
        if(X===8){success+=p;continue}
        const k=JSON.stringify([X,Z,H,Math.max(0,w-1)]);next.set(k,(next.get(k)??0)+p)
      }
    }
    distribution=next
  }
  return success
}
export function randomBaseline(root:string){
  const results=policies.slice(0,3).map(policy=>{
    const outcomes=Array.from({length:100},(_,j)=>Array.from({length:5},(_,a)=>baseline(instance('pure_random',1001+j,a+1),policy).outcome==='success'?1:0))
    const success=outcomes.flat().reduce<number>((n,v)=>n+v,0),p=success/500
    const perAttempt=Array.from({length:5},(_,a)=>{const count=outcomes.reduce<number>((n,row)=>n+row[a],0),rate=count/100;return {attempt:a+1,success:count,total:100,p:rate,ci95:wilson(count,100),sampleBernoulliVariance:rate*(1-rate)*100/99}})
    const mean=perAttempt.reduce((n,r)=>n+r.p,0)/5,roundRateVariance=perAttempt.reduce((n,r)=>n+(r.p-mean)**2,0)/4
    const bootstrap=rng(331,1,7),samples=Array.from({length:2000},()=>{let n=0;for(let j=0;j<100;j++)n+=outcomes[Math.floor(bootstrap()*100)].reduce<number>((s,v)=>s+v,0);return n/500}).sort((a,b)=>a-b)
    return {policy,success,total:500,p,ci95:wilson(success,500),seedClusterBootstrapCI95:[samples[49],samples[1949]],exactFiniteHorizonProbability:exactRandomProbability(policy as Exclude<Policy,'Symmetric-Prior-Heuristic'>),perAttempt,roundRateVariance,outcomes}
  })
  const result={seeds:Array.from({length:100},(_,i)=>1001+i),attempts:5,transition:'Uniform over legal {N,S,STAY}; STAY preserves heading; initial z uniform 0..5 and heading uniform N/S.',
    waitingPolicy:'Wait-Random-Then-Rush independently samples 0..10 initial WAIT ticks uniformly.',
    interval:'Wilson 95% intervals describe Monte Carlo frequencies, not exact theoretical uncertainty. Exact finite-horizon probabilities and seed-cluster bootstrap intervals are separately reported.',results}
  save(join(root,'random-baseline.json'),result);return result
}
export function gates(root:string){
  mkdirSync(root,{recursive:true})
  const oracle=modes.slice(0,3).flatMap(mode=>seeds.flatMap(seed=>Array.from({length:5},(_,a)=>{
    const i=instance(mode,seed,a+1),path=solve(i);return {mode,seed,attempt:a+1,params:i.params,pattern:i.pattern,phase:i.phase,period:i.period,solvable:path!==null,path}
  })))
  const antiPrior=([policies[0],policies[2],policies[3]] as Policy[]).map(policy=>{
    const runs=seeds.map(seed=>baseline(instance('identical_loop',seed,1),policy));return {policy,success:runs.filter(r=>r.outcome==='success').length,total:6,runs}
  })
  const passed=oracle.every(r=>r.solvable)&&antiPrior.every(r=>r.success<=2)
  const result={passed,oracleSolved:oracle.filter(r=>r.solvable).length,oracleTotal:90,antiPrior,oracle}
  save(join(root,'preflight.json'),result)
  if(!passed)throw Error('Zero-cost gate failed; API dispatch forbidden')
  return result
}
