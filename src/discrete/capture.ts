import * as T from 'three'
import {walls,spec,vision} from './environment'
import type {Run} from './records'
export function setup(run:Run){
  document.body.style.cssText='margin:0;background:#101827;color:white;font:18px monospace'
  const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080
  canvas.style.cssText='width:100%;height:auto';document.body.append(canvas)
  const ctx=canvas.getContext('2d')!
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1920,900)
  const scene=new T.Scene();scene.background=new T.Color('#142235')
  const camera=new T.OrthographicCamera(-6.8,6.8,3.4,-3.4,.1,100)
  camera.position.set(4.5,20,2.5);camera.up.set(0,0,-1);camera.lookAt(4.5,0,2.5)
  const mesh=(color:string,w=0.94,h=.1,d=.94)=>new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial({color}))
  for(let z=0;z<6;z++)for(let x=0;x<10;x++){const m=mesh('#334457');m.position.set(x,-.15,z);scene.add(m)}
  for(const [x,z] of walls){const m=mesh('#697c91',.96,.4,.96);m.position.set(x,.1,z);scene.add(m)}
  const exit=mesh('#16a085');exit.position.set(...[spec.exit[0],0,spec.exit[1]] as [number,number,number]);scene.add(exit)
  const pocket=mesh('#234f76');pocket.position.set(1,.01,3);scene.add(pocket)
  const player=mesh('#55ddff',.5,.5,.5),robot=mesh('#ff7766',.65,.5,.65),overlay=new T.Group()
  scene.add(player,robot,overlay)
  function paint(index:number){
    const s=run.states[Math.min(index,run.states.length-1)]
    player.position.set(s.player[0],.3,s.player[1]);robot.position.set(s.robot.pos[0],.3,s.robot.pos[1])
    for(const c of [...overlay.children]){overlay.remove(c);const m=c as T.Mesh;m.geometry.dispose();(m.material as T.Material).dispose()}
    for(const [x,z] of vision(s.robot)){const m=mesh('#b3423d',.86,.06,.86);m.position.set(x,.03,z);overlay.add(m)}
    const d=s.robot.heading==='S'?[0,0,1]:[0,0,-1]
    const arrow=new T.ArrowHelper(new T.Vector3(...d as [number,number,number]),new T.Vector3(s.robot.pos[0],.65,s.robot.pos[1]),.7,0xffffff,.25,.18)
    scene.add(arrow);renderer.render(scene,camera);scene.remove(arrow);arrow.dispose()
    ctx.fillStyle='#101827';ctx.fillRect(0,0,1920,1080);ctx.drawImage(renderer.domElement,0,90)
    ctx.fillStyle='#e6eef6';ctx.font='bold 30px monospace';ctx.fillText(`${run.condition} / phase ${run.phase} / tick ${s.tick} / ${s.outcome}`,45,55)
    ctx.font='22px monospace';ctx.fillText(`cyan: player | coral: robot | red: exact vision | green: exit | x east, z south`,45,1020)
    const row=run.steps[Math.max(0,index-1)]
    ctx.fillText(`${row?.decision?.action??'initial'} | heading ${s.robot.heading} | pause ${s.robot.pauseRemaining} | ${run.attribution?.category??run.outcome}`,45,1060)
    return {png:canvas.toDataURL('image/png').split(',')[1],jpg:canvas.toDataURL('image/jpeg',.9).split(',')[1]}
  }
  const controls=document.createElement('div'),slider=document.createElement('input'),button=document.createElement('button')
  slider.type='range';slider.min='0';slider.max=String(run.states.length-1);slider.style.width='75%'
  slider.oninput=()=>paint(Number(slider.value));button.textContent='Play';button.onclick=()=>{let i=0;const timer=setInterval(()=>{slider.value=String(i);paint(i++);if(i>=run.states.length)clearInterval(timer)},500)}
  controls.append(button,slider);document.body.append(controls);paint(0)
  return {paint,count:run.states.length}
}
