import * as T from 'three'
import {walls,vision} from './world'
import type {Run} from './experiment'
export function setup(run:Run){
  document.body.style.cssText='margin:0;background:#101827;color:white;font:18px monospace'
  const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;canvas.style.width='100%';document.body.append(canvas)
  const ctx=canvas.getContext('2d')!,renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1920,900)
  const scene=new T.Scene();scene.background=new T.Color('#142235')
  const camera=new T.OrthographicCamera(-6.8,6.8,3.4,-3.4,.1,100);camera.position.set(4.5,20,2.5);camera.up.set(0,0,-1);camera.lookAt(4.5,0,2.5)
  const mesh=(color:string,w=.94,h=.1,d=.94)=>new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial({color}))
  for(let z=0;z<6;z++)for(let x=0;x<10;x++){const m=mesh('#334457');m.position.set(x,-.15,z);scene.add(m)}
  for(const [x,z] of walls){const m=mesh('#697c91',.96,.4,.96);m.position.set(x,.1,z);scene.add(m)}
  for(const [x,color] of [[1,'#234f76'],[2,'#43325e'],[3,'#43325e'],[4,'#43325e'],[8,'#16a085']] as [number,string][]){const m=mesh(color);m.position.set(x,0,3);scene.add(m)}
  const door=mesh('#ecc35e',.08,.2,.98);door.position.set(4.5,.15,3);scene.add(door)
  const player=mesh('#55ddff',.5,.5,.5),robot=mesh('#ff7766',.65,.5,.65),overlay=new T.Group();scene.add(player,robot,overlay)
  function paint(i:number){
    const s=run.states[Math.min(i,run.states.length-1)],obs=run.public.observations[Math.min(i,run.public.observations.length-1)],row=run.steps[i-1]
    player.position.set(s.player[0],.3,s.player[1]);robot.position.set(s.robot.pos[0],.3,s.robot.pos[1])
    for(const c of [...overlay.children]){overlay.remove(c);const m=c as T.Mesh;m.geometry.dispose();(m.material as T.Material).dispose()}
    for(const [x,z] of vision(s.robot)){const m=mesh('#b3423d',.86,.06,.86);m.position.set(x,.03,z);overlay.add(m)}
    const arrow=new T.ArrowHelper(new T.Vector3(0,0,s.robot.heading==='S'?1:-1),new T.Vector3(s.robot.pos[0],.65,s.robot.pos[1]),.7,0xffffff,.25,.18)
    scene.add(arrow);renderer.render(scene,camera);scene.remove(arrow);arrow.dispose()
    ctx.fillStyle='#101827';ctx.fillRect(0,0,1920,1080);ctx.drawImage(renderer.domElement,0,90)
    ctx.fillStyle='#e6eef6';ctx.font='bold 22px monospace';ctx.fillText(`${run.mode} / ${run.condition} / seed ${run.seed} / attempt ${run.attempt} / tick ${s.tick} / ${s.outcome}`,30,55)
    ctx.font='21px monospace';ctx.fillText(`AUDIT VIEW: coral robot = private truth | yellow = opaque passable door | purple = blind run-up`,30,1018)
    ctx.fillText(`Agent sees: ${obs.robot?JSON.stringify(obs.robot):'robot: null'} (${obs.source}) | action: ${row?.decision?.action??'initial'} | estimate: ${row?.decision?JSON.stringify(row.decision.predicted_next):'none'}`,30,1053)
    return {png:canvas.toDataURL('image/png').split(',')[1],jpg:canvas.toDataURL('image/jpeg',.9).split(',')[1]}
  }
  const controls=document.createElement('div'),slider=document.createElement('input'),button=document.createElement('button')
  slider.type='range';slider.min='0';slider.max=String(run.states.length-1);slider.style.width='75%';slider.oninput=()=>paint(Number(slider.value))
  button.textContent='Play';button.onclick=()=>{let i=0;const timer=setInterval(()=>{slider.value=String(i);paint(i++);if(i>=run.states.length)clearInterval(timer)},500)}
  controls.append(button,slider);document.body.append(controls);paint(0);return {paint,count:run.states.length}
}
