import './style.css'
import {defaults,type Action,type Point} from './sim/config'
import {angleDelta} from './sim/geometry'
import {createSession,type Mode,type Frame} from './sim/session'
import {observable,TICK} from './sim/world'
import {ArenaRenderer,type Overlays} from './view/render'
const cfg=defaults(), game=createSession(1,cfg)
const root=document.querySelector<HTMLDivElement>('#app')!
root.innerHTML=`
<header><div class="brand"><div class="insignia" aria-hidden="true"><i></i><i></i><i></i></div><div><div class="micro">MULTI-ROBOT</div><h1>Stealth Arena</h1></div></div>
<div class="mission"><span class="goal-icon">◇</span><div><div class="micro">OBJECTIVE</div><strong>Reach the green exit undetected</strong></div></div>
<div class="clock"><div class="micro">SIM TIME</div><time>00:00.0</time></div></header>
<main><div class="field"><canvas aria-label="Isometric stealth arena"></canvas>
<nav aria-label="Observation mode"><button data-mode="omniscient" aria-pressed="true">Omniscient</button><button data-mode="limited" aria-pressed="false">Limited</button><button data-mode="debug" aria-pressed="false">Debug</button></nav>
<div class="status" role="status"><i></i><span>Ready</span></div>
<aside hidden><div class="micro">INSPECTION</div><div id="checks"></div><pre></pre></aside>
<div class="legend"><span><i class="you"></i>Player</span><span><i class="bot"></i>Patrol</span><span><i class="exit"></i>Exit</span></div>
<button class="vision" aria-pressed="false" title="Toggle patrol vision"><span aria-hidden="true">◉</span> Vision</button></div>
<div class="controls"><div class="transport"><button class="primary" id="play"><span>▶</span> Start</button><button id="step" title="Advance one 0.1 s tick">Step</button><button id="reset">Reset</button></div>
<div class="keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>or arrow keys to move</span></div>
<a href="./studio.html" class="replay-link">Replay studio</a><div class="speeds" aria-label="Playback speed"><button data-speed="0.5">0.5×</button><button data-speed="1" aria-pressed="true">1×</button><button data-speed="2">2×</button></div></div></main>`
const $=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!
const renderer=new ArenaRenderer($('canvas'),cfg)
const options:Overlays={cones:false,routes:true,range:false,los:false,bounds:false,nodes:true}
const checks:{key:keyof Overlays;label:string}[]=[{key:'routes',label:'Patrol routes'},{key:'nodes',label:'Waypoints & phases'},{key:'range',label:'Player sight'},{key:'los',label:'Sight lines'},{key:'bounds',label:'Colliders'}]
for(const {key,label} of checks){
  const wrap=document.createElement('label'),input=document.createElement('input')
  input.type='checkbox';input.checked=options[key];input.addEventListener('change',()=>{options[key]=input.checked;dirty=true})
  wrap.append(input,label);$('#checks').append(wrap)
}
let mode:Mode='omniscient',prev=game.view(mode),curr=prev,playing=false,speed=1,acc=0,last=performance.now(),dirty=true
const keys:Record<string,Action>={KeyW:'MOVE_NORTH',ArrowUp:'MOVE_NORTH',KeyS:'MOVE_SOUTH',ArrowDown:'MOVE_SOUTH',KeyA:'MOVE_WEST',ArrowLeft:'MOVE_WEST',KeyD:'MOVE_EAST',ArrowRight:'MOVE_EAST'}
const held=new Set<string>()
const activeAction=()=>keys[[...held].at(-1)??'']??'WAIT'
const statuses={active:'Ready',escaped:'Exit reached',seen:'Detected',contact:'Contact',timeout:'Time expired'}
function panel(){
  const terminal=curr.outcome!=='active'
  $('.status span').textContent=terminal?statuses[curr.outcome]:playing?'Running':curr.time?'Paused':'Ready'
  $('.status').dataset.state=terminal?curr.outcome:playing?'running':'ready'
  $('#play').innerHTML=playing?'<span>Ⅱ</span> Pause':'<span>▶</span> '+(curr.time?'Resume':'Start')
  $<HTMLButtonElement>('#play').disabled=terminal
  $<HTMLButtonElement>('#step').disabled=terminal||playing
  $('time').textContent=String(Math.floor(curr.time/60)).padStart(2,'0')+':'+(curr.time%60).toFixed(1).padStart(4,'0')
  $('aside').hidden=mode!=='debug'
}
function tick(){
  prev=curr;game.step(activeAction());curr=game.view(mode)
  if(curr.outcome!=='active')playing=false
  panel();dirty=true
}
function toggle(){
  if(curr.outcome!=='active')return
  playing=!playing;prev=curr;acc=0;last=performance.now();dirty=true;panel()
}
$('#play').onclick=toggle
$('#step').onclick=()=>{if(!playing&&curr.outcome==='active'){tick();prev=curr}}
$('#reset').onclick=()=>{game.reset(1,cfg);playing=false;held.clear();acc=0;prev=curr=game.view(mode);dirty=true;panel()}
for(const button of root.querySelectorAll<HTMLButtonElement>('[data-mode]'))button.onclick=()=>{
  mode=button.dataset.mode as Mode
  for(const b of root.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b===button))
  prev=curr=game.view(mode);$('pre').textContent='';dirty=true;panel()
}
for(const button of root.querySelectorAll<HTMLButtonElement>('[data-speed]'))button.onclick=()=>{
  speed=Number(button.dataset.speed)
  for(const b of root.querySelectorAll('[data-speed]'))b.setAttribute('aria-pressed',String(b===button))
}
$('.vision').onclick=()=>{options.cones=!options.cones;$('.vision').setAttribute('aria-pressed',String(options.cones));dirty=true}
window.addEventListener('keydown',e=>{
  if(keys[e.code]){e.preventDefault();held.add(e.code)}
  if(e.code==='Space'&&!e.repeat&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();toggle()}
})
window.addEventListener('keyup',e=>held.delete(e.code))
window.addEventListener('blur',()=>{held.clear();if(playing)toggle()})
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)toggle()})
new ResizeObserver(()=>{dirty=true}).observe($('canvas'))
function mix(a:Point,b:Point,t:number):Point{return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]}
function render(t:number){
  const f:Frame={...curr,player:mix(prev.player,curr.player,t),robots:[]}
  for(const r of curr.robots){
    const old=prev.robots.find(p=>p.id===r.id)
    const position=old?mix(old.position,r.position,t):r.position
    if(mode==='limited'&&!observable(f.player,position,cfg))continue
    f.robots.push({...r,position,heading:old?old.heading+angleDelta(old.heading,r.heading)*t:r.heading})
  }
  const debug=mode==='debug'?game.getGroundTruth():undefined
  if(debug)$('pre').textContent=options.nodes?debug.robots.map(r=>r.id+'  '+r.phase.padEnd(5)+'  WP '+(r.node+1)).join('\n'):''
  renderer.render(f,mode,options,debug)
}
function frame(now:number){
  if(playing){
    acc+=(now-last)/1000*speed
    while(acc>=TICK&&playing){acc-=TICK;tick()}
  }
  last=now
  if(playing||dirty){render(playing?acc/TICK:1);dirty=false}
  requestAnimationFrame(frame)
}
panel();requestAnimationFrame(frame)
