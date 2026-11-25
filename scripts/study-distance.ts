// Offline geometric difficulty metric. Grid edges and connectors use the same
// radius-padded segment test as player movement; moving patrols are excluded.
import {readdirSync,existsSync} from 'node:fs'
import {join} from 'node:path'
import {read,save} from '../src/learning/dmx'
import {distance,wallHit} from '../src/sim/geometry'
import type {Config,Point} from '../src/sim/config'
import type {AttemptFilm} from '../src/video/replay'
const root='results/layout-transfer-1',cache=new Map<string,ReturnType<typeof field>>()
function field(cfg:Config){
 const {room,playerRadius}=cfg,step=.25,nx=Math.round(room.width/step)+1,nz=Math.round(room.depth/step)+1
 const distances=new Int32Array(nx*nz).fill(-1),queue:number[]=[]
 const point=(i:number):Point=>[(i%nx)*step,Math.floor(i/nx)*step]
 const clear=(a:Point,b:Point)=>wallHit(a,b,room,playerRadius)===Infinity
 for(let i=0;i<distances.length;i++){
   const p=point(i)
   if(distance(p,room.exit)<=room.exitRadius && clear(p,p)){distances[i]=0;queue.push(i)}
 }
 for(let k=0;k<queue.length;k++){
   const i=queue[k],p=point(i)
   for(const j of [i-1,i+1,i-nx,i+nx]){
     if(j<0||j>=distances.length||distances[j]>=0)continue
     const q=point(j)
     if(distance(p,q)>step||!clear(p,q))continue
     distances[j]=distances[i]+1;queue.push(j)
   }
 }
 return (p:Point)=>{
   if(distance(p,room.exit)<=room.exitRadius)return 0
   const ix=Math.floor(p[0]/step),iz=Math.floor(p[1]/step)
   let best=Infinity
   for(const x of [ix,ix+1])for(const z of [iz,iz+1]){
     const i=z*nx+x,q=point(i)
     if(distances[i]<0)continue
     const connectors:Point[]=[[p[0],q[1]],[q[0],p[1]]]
     if(connectors.some(c=>clear(p,c)&&clear(c,q)))best=Math.min(best,distances[i]*step+Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1]))
   }
   return best
 }
}
for(const name of readdirSync(root)){
 const dir=join(root,name),file=join(dir,'replay.json')
 if(!existsSync(file))continue
 const {attempts}=read<{attempts:AttemptFilm[]}>(file)
 const rows=attempts.map(film=>{
   const key=JSON.stringify(film.config.room)
   if(!cache.has(key))cache.set(key,field(film.config))
   const from=cache.get(key)!,values=film.frames.map(f=>from(f.full.player))
   return {attempt:film.attempt,closest:Math.min(...values),end:values.at(-1),unconnected:values.filter(v=>!Number.isFinite(v)).length}
 })
 save(join(dir,'navigable-distance.json'),rows)
}
