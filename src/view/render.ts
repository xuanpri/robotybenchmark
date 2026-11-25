import * as T from 'three'
import {stage,character} from './scene'
import {angleDelta,distance,wallHit} from '../sim/geometry'
import type {Config,Point} from '../sim/config'
import type {Frame,Mode} from '../sim/session'
import type {Robot} from '../sim/patrol'
export interface Overlays {cones:boolean;routes:boolean;range:boolean;los:boolean;bounds:boolean;nodes:boolean}
type DebugState={robots:Robot[]}
const groundY=.044
function line(parent:T.Object3D,points:Point[],color:number,y=groundY){
  const geometry=new T.BufferGeometry().setFromPoints(points.map(([x,z])=>new T.Vector3(x,y,z)))
  parent.add(new T.Line(geometry,new T.LineBasicMaterial({color,transparent:true,opacity:.82})))
}
function clear(group:T.Group){
  group.traverse(o=>{if(o instanceof T.Line||o instanceof T.Mesh){o.geometry.dispose();o.material.dispose()}})
  group.clear()
}
// Sample the range arc AND both sides of every wall corner for sharp shadow boundaries.
function footprint(cfg:Config,origin:Point,heading:number,fov:number,radius:number):Point[]{
  const half=fov/2, angles:number[]=[]
  const n=Math.max(12,Math.ceil(fov/.075))
  for(let i=0;i<=n;i++)angles.push(-half+fov*i/n)
  for(const {box:[x,z,X,Z]} of cfg.room.walls){
    for(const [px,pz] of [[x,z],[x,Z],[X,z],[X,Z]]){
      const a=angleDelta(heading,Math.atan2(pz-origin[1],px-origin[0]))
      for(const b of [a-1e-5,a,a+1e-5])if(Math.abs(b)<half)angles.push(b)
    }
  }
  return angles.sort((a,b)=>a-b).map(a=>{
    const dx=radius*Math.cos(heading+a),dz=radius*Math.sin(heading+a)
    const t=Math.min(1,wallHit(origin,[origin[0]+dx,origin[1]+dz],cfg.room))
    return [origin[0]+dx*t,origin[1]+dz*t]
  })
}
function fan(parent:T.Object3D,p:Point,edge:Point[],color:number,opacity:number){
  const vertices:number[]=[]
  for(let i=1;i<edge.length;i++)for(const [x,z] of [p,edge[i-1],edge[i]])vertices.push(x,groundY,z)
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3))
  parent.add(new T.Mesh(geometry,new T.MeshBasicMaterial({color,transparent:true,opacity,side:T.DoubleSide,depthWrite:false})))
  line(parent,[p,...edge,p],color,groundY+.001)
}
export class ArenaRenderer{
  private stage;private player=character(false);private actors=new Map<string,T.Group>();private overlay=new T.Group()
  constructor(canvas:HTMLCanvasElement,private cfg:Config){
    this.stage=stage(canvas,cfg.room);this.stage.scene.add(this.player,this.overlay)
  }
  labelPoint(p:Point){return this.stage.project(p)}
  render(f:Frame,mode:Mode,opt:Overlays,debug?:DebugState,showPlayer=true){
    clear(this.overlay)
    const player=this.player;player.visible=showPlayer;player.position.set(f.player[0],0,f.player[1]);player.rotation.y=-f.heading
    for(const [id,obj] of this.actors)if(!f.robots.some(r=>r.id===id)){
      // Remove from the scene graph including the shadow pass.
      obj.removeFromParent();this.actors.delete(id)
      obj.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose()})
    }
    for(const r of f.robots){
      let obj=this.actors.get(r.id)
      if(!obj){obj=character(true);this.actors.set(r.id,obj);this.stage.scene.add(obj)}
      obj.position.set(r.position[0],0,r.position[1]);obj.rotation.y=-r.heading
      if(opt.cones)fan(this.overlay,r.position,footprint(this.cfg,r.position,r.heading,this.cfg.visionDegrees*Math.PI/180,this.cfg.visionRange),0xda5049,.19)
    }
    if(mode==='debug' && debug){
      if(opt.routes||opt.nodes)for(const p of this.cfg.patrols.slice(0,this.cfg.robotCount)){
        if(opt.routes)line(this.overlay,[...p.nodes,p.nodes[0]],0x9c4879)
        if(opt.nodes)for(const [x,z] of p.nodes)line(this.overlay,[[x-.12,z],[x,z-.12],[x+.12,z],[x,z+.12],[x-.12,z]],0x77365f)
      }
      if(opt.range)fan(this.overlay,f.player,footprint(this.cfg,f.player,0,Math.PI*2,this.cfg.playerRange),0x198b9a,.11)
      if(opt.los)for(const r of f.robots){
        const t=wallHit(f.player,r.position,this.cfg.room)
        line(this.overlay,[f.player,r.position],t!==Infinity?0x914344:distance(f.player,r.position)<=this.cfg.playerRange?0x159f75:0x777985,.12)
      }
      if(opt.bounds){
        for(const {box:[x,z,X,Z]} of this.cfg.room.walls)line(this.overlay,[[x,z],[X,z],[X,Z],[x,Z],[x,z]],0xfcae65,1.29)
        for(const [p,r] of [[f.player,this.cfg.playerRadius],...f.robots.map(r=>[r.position,this.cfg.robotRadius])] as [Point,number][]){
          line(this.overlay,Array.from({length:33},(_,i)=>[p[0]+r*Math.cos(i*Math.PI/16),p[1]+r*Math.sin(i*Math.PI/16)]),0xffad57)
        }
      }
    }
    this.stage.draw()
  }
}
