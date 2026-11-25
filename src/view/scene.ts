import * as T from 'three'
import type {Room,Point} from '../sim/config'

const matte=(color:number,metalness=0)=>new T.MeshStandardMaterial({color,metalness,roughness:.84})
const light=(color:number)=>new T.MeshBasicMaterial({color,toneMapped:false})
const shell=matte(0x49454d), basalt=matte(0x635e66), slate=matte(0x65636a), top=matte(0x89848a)
const foot=matte(0x322e39), steel=matte(0x57535e,.28), grille=matte(0x393440)
const pink=light(0xf07bb5), violet=matte(0x864b73), mint=light(0x76ffb2), cyan=light(0x7bf1fa)
const guard=matte(0x9c3b55,.12),guardShade=matte(0x542535),traveler=matte(0x1689a2,.16),travelerShade=matte(0x20515e)
function add(parent:T.Object3D,geo:T.BufferGeometry,mat:T.Material,x:number,y:number,z:number){
  const mesh=new T.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh
}
function box(parent:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material){
  return add(parent,new T.BoxGeometry(w,h,d),m,x,y,z)
}
function tileTexture(room:Room){
  const canvas=document.createElement('canvas'),s=64
  canvas.width=room.width*s;canvas.height=room.depth*s
  const g=canvas.getContext('2d')!
  g.scale(s,s);g.fillStyle='#b3afb0';g.fillRect(0,0,room.width,room.depth)
  // Large ceramic slabs. Their joints give the room a scale distinct from the masonry caps.
  const size=3.15
  for(let j=0;j*size<room.depth;j++)for(let i=0;i*size<room.width;i++){
    const c=213+(i*17+j*7+i*j)%7
    g.fillStyle='rgb('+c+','+(c-2)+','+(c-3)+')';g.fillRect(i*size+.022,j*size+.022,size-.044,size-.044)
  }
  function gate([x,z]:Point,color:string,label:string){
    g.strokeStyle=color;g.lineWidth=.04
    for(const side of [-1,1]){
      g.beginPath();g.moveTo(x+side*.52,z+.58);g.lineTo(x+side*.75,z+.58);g.lineTo(x+side*.75,z-.58);g.lineTo(x+side*.52,z-.58);g.stroke()
    }
    g.fillStyle=color;g.font='bold .22px monospace';g.textAlign='center';g.fillText(label,x,z+.94)
  }
  gate(room.spawn,'#327986','ENTRY');gate(room.exit,'#28815b','EXIT')
  // Contact darkening at the base of the cover, baked into the static floor only.
  for(const {box:[x,z,X,Z]} of room.walls){
    for(let i=6;i>0;i--){const e=i*.033;g.fillStyle='rgba(49,42,53,0.023)';g.fillRect(x-e,z-e,X-x+2*e,Z-z+2*e)}
  }
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;return map
}
function gateGlyph(parent:T.Object3D,x:number,z:number){
  const group=new T.Group();group.position.set(x,1.25,z);parent.add(group)
  box(group,0,0,0,1.55,1.38,.20,foot);box(group,0,0,.12,1.30,1.12,.07,basalt)
  for(const sign of [-1,1]){
    const bar=box(group,sign*.155,.09,.175,.09,.49,.055,mint);bar.rotation.z=sign*Math.PI/4
    box(group,sign*.26,-.23,.18,.12,.10,.06,mint)
  }
  box(group,0,-.38,.18,.50,.048,.06,mint)
}
function perimeter(scene:T.Scene,room:Room){
  const w=room.width,d=room.depth
  // A cutaway foreground and taller distant walls preserve sight of the playable floor.
  for(const wall of room.walls.slice(0,4)){
    const [x,z,X,Z]=wall.box
    const h=wall.id==='north'?2.25:wall.id==='west'?1.52:wall.id==='east'?1.15:.48
    box(scene,(x+X)/2,h/2,(z+Z)/2,X-x,h,Z-z,shell)
    box(scene,(x+X)/2,h+.025,(z+Z)/2,X-x+.03,.07,Z-z+.03,slate)
  }
  // Fluted gate pylons on the perimeter, outside the collision line.
  function pylon(x:number,z:number,angle:number,height:number){
    const g=new T.Group();g.position.set(x,0,z);g.rotation.y=angle;scene.add(g)
    box(g,0,height/2,-.22,.76,height,.62,foot)
    box(g,0,height/2,.11,.50,height-.10,.12,steel)
    box(g,0,height*.43,.19,.15,height*.74,.06,violet)
    box(g,0,height*.46,.228,.055,height*.61,.028,pink)
    box(g,0,.28,.24,.58,.49,.19,basalt)
    box(g,0,.27,.345,.20,.15,.02,pink)
    box(g,0,height-.06,-.15,.81,.17,.71,basalt)
    box(g,0,height+.032,-.09,.13,.026,.44,pink)
  }
  for(const x of [1.35,2.3,w-2.4,w-1.45])pylon(x,.41,0,2.95)
  for(const z of [2.15,3.15,d-3.2,d-2.2]){
    pylon(.41,z,Math.PI/2,2.32);pylon(w-.41,z,-Math.PI/2,2.38)
  }
  for(let x=.9;x<w-.2;x+=.81)box(scene,x,1.93,.49,.12,.41,.08,grille)
  for(let z=1.3;z<d-1;z+=1.03)box(scene,.49,1.20,z,.08,.31,.14,grille)
  const [gx,gz]=room.exit
  for(const dx of [-2.20,-1.60,1.60,2.20]){pylon(gx+dx,.41,0,1.50)}
  gateGlyph(scene,gx,.49)
  const diamond=add(scene,new T.RingGeometry(.38,.47,4),mint,gx,.03,gz);diamond.rotation.x=-Math.PI/2
  box(scene,.30,.79,room.spawn[1],.17,.78,.96,foot)
  for(const dz of [-.24,0,.24])box(scene,.40,.85,room.spawn[1]+dz,.07,.42,.08,cyan)
}
function buildRoom(scene:T.Scene,room:Room){
  const {width:w,depth:d}=room
  box(scene,w/2,-.28,d/2,w+1,.55,d+1,shell)
  const floor=add(scene,new T.PlaneGeometry(w,d),new T.MeshStandardMaterial({map:tileTexture(room),roughness:.96}),w/2,.008,d/2)
  floor.rotation.x=-Math.PI/2;floor.castShadow=false
  perimeter(scene,room)
  for(const wall of room.walls.slice(4)){
    const [x,z,X,Z]=wall.box, dx=X-x,dz=Z-z,across=dx>dz,length=across?dx:dz,n=Math.max(1,Math.round(length/.89))
    const h=1.04
    box(scene,(x+X)/2,h/2,(z+Z)/2,dx,h,dz,basalt)
    for(let i=0;i<n;i++){
      const px=across?x+(i+.5)*length/n:(x+X)/2,pz=across?(z+Z)/2:z+(i+.5)*length/n
      box(scene,px,h+.035,pz,across?length/n-.024:dx,.10,across?dz:length/n-.024,top)
      if((i%2)===0){
        // Recessed cross pins on the front of alternating wall blocks.
        const sx=across?px:X+.009,sz=across?Z+.009:pz
        box(scene,sx,.62,sz,across?.20:.024,.045,across?.024:.20,grille)
        box(scene,sx,.62,sz,across?.05:.024,.18,across?.024:.05,grille)
      }
    }
  }
}
export function character(robot:boolean){
  const g=new T.Group(),body=robot?guard:traveler,dark=robot?guardShade:travelerShade,lamp=robot?lightEye:cyan
  // Tapered armour, a single recessed visor and separate boots read from above. Local +X is forward.
  for(const side of [-1,1]){
    const shoe=add(g,new T.DodecahedronGeometry(.17,0),foot,.035,.13,side*.12);shoe.scale.set(1.35,.8,.7)
  }
  const cloak=add(g,new T.CylinderGeometry(.21,.33,.68,7),dark,-.02,.54,0);cloak.scale.x=.84
  const mantle=add(g,new T.IcosahedronGeometry(.345,1),body,-.01,.80,0);mantle.scale.set(.83,1.09,.94)
  const hood=add(g,new T.IcosahedronGeometry(.265,1),body,.045,1.04,0);hood.scale.set(.94,1.13,.92)
  const face=add(g,new T.SphereGeometry(.175,8,6),foot,.200,1.01,0);face.scale.set(.57,.74,1)
  box(g,.298,1.048,0,.028,.056,.19,lamp)
  const crest=box(g,.125,1.294,0,.20,.027,.055,lamp);crest.rotation.z=-.40
  for(const sign of [-1,1]){
    const arm=add(g,new T.CylinderGeometry(.093,.076,.37,5),body,.025,.63,sign*.229);arm.rotation.z=.18
  }
  if(!robot){const scarf=add(g,new T.CylinderGeometry(.246,.21,.09,7),cyan,0,.87,0);scarf.scale.x=.88}
  return g
}
const lightEye=light(0xff8f9d)
export function stage(canvas:HTMLCanvasElement,room:Room){
  const scene=new T.Scene(),renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true})
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02
  scene.add(new T.HemisphereLight(0xfff7ef,0x726579,1.48))
  const fill=new T.DirectionalLight(0xcfd9ee,1.05);fill.position.set(8,9,24);fill.target.position.set(12,0,8);scene.add(fill,fill.target)
  const sun=new T.DirectionalLight(0xfff2df,2.42);sun.position.set(27,19,-5);sun.target.position.set(12,0,8)
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048)
  Object.assign(sun.shadow.camera,{left:-19,right:19,top:17,bottom:-17});sun.shadow.normalBias=.022;scene.add(sun,sun.target)
  const camera=new T.OrthographicCamera();camera.position.set(room.width/2+6.9,29,room.depth/2+19.5);camera.lookAt(room.width/2,0,room.depth/2);camera.updateMatrixWorld()
  buildRoom(scene,room)
  const ground=add(scene,new T.PlaneGeometry(150,150),new T.ShadowMaterial({opacity:.24}),12,-.568,8);ground.rotation.x=-Math.PI/2;ground.castShadow=false
  const corners=[-.32,room.width+.32].flatMap(x=>[-.32,room.depth+.32].flatMap(z=>[-.55,2.96].map(y=>new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse))))
  const requiredW=Math.max(...corners.map(p=>2*Math.abs(p.x))),requiredH=Math.max(...corners.map(p=>2*Math.abs(p.y)))
  function resize(){
    const {width,height}=canvas.getBoundingClientRect(),ratio=width/Math.max(height,1)
    const h=Math.max(requiredH,requiredW/ratio)*1.015
    Object.assign(camera,{left:-h*ratio/2,right:h*ratio/2,top:h/2,bottom:-h/2,near:.1,far:120})
    camera.updateProjectionMatrix();renderer.setSize(width,height,false)
  }
  new ResizeObserver(resize).observe(canvas);resize()
  return {scene,project:(p:Point)=>new T.Vector3(p[0],1.65,p[1]).project(camera),draw:()=>renderer.render(scene,camera)}
}
