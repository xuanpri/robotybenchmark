import {setup} from './capture'
import type {Replay,Timing} from './replay'
import demoUrl from '../../evidence/videos/scene_demo.replay.json?url'
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T
const attempt=$<HTMLSelectElement>('attempt'),layout=$<HTMLSelectElement>('layout'),time=$<HTMLSelectElement>('time'),seek=$<HTMLInputElement>('seek')
const play=$<HTMLButtonElement>('play'),status=$<HTMLOutputElement>('status')
let replay:Replay,film:ReturnType<typeof setup>,playing=false,epoch=0
const host=document.querySelector('iframe')!
function stop(){playing=false;play.textContent='Play'}
function change(){
  stop()
  const index=Number(attempt.value),mode=layout.value as 'omniscient'|'limited'|'split'
  if(!replay)return
  // Dispose previous WebGL contexts when replacing the review surface.
  for(const canvas of document.querySelectorAll<HTMLCanvasElement>('body > canvas')){
    canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();canvas.remove()
  }
  film=setup(replay,index,mode,time.value as Timing)
  const body=host.contentDocument!.body;body.replaceChildren(film.canvas);body.style.cssText='margin:0;background:#22242d'
  film.canvas.style.cssText='display:block;width:100%;height:auto'
  seek.max=String(film.count-1);seek.value='0';film.paint(0)
}
function load(r:Replay){
  if(r.version!==1||!r.attempts?.length)throw Error('Unsupported replay')
  replay=r;attempt.replaceChildren(...r.attempts.map((a,i)=>new Option(a.id,String(i))))
  layout.value=r.demo?'omniscient':'split';status.textContent='';change()
}
async function demo(){load(await (await fetch(demoUrl)).json())}
$('demo').onclick=()=>{demo().catch(e=>status.textContent=String(e))}
$<HTMLInputElement>('file').onchange=async e=>{
  try{const f=(e.target as HTMLInputElement).files?.[0];if(f)load(JSON.parse(await f.text()))}catch(err){status.textContent=String(err)}
}
attempt.onchange=layout.onchange=time.onchange=change
seek.oninput=()=>{stop();film.paint(+seek.value)}
play.onclick=()=>{if(!film)return;if(playing){stop();return}if(+seek.value>=film.count-1)seek.value='0';playing=true;epoch=performance.now()-Number(seek.value)/30*1000;play.textContent='Pause'}
function draw(now:number){
  if(playing){
    const i=Math.floor((now-epoch)*.03);seek.value=String(Math.min(i,film.count-1));film.paint(+seek.value)
    if(i>=film.count-1){
      if(attempt.selectedIndex+1<attempt.options.length){attempt.selectedIndex++;change();play.click()}else stop()
    }
  }
  requestAnimationFrame(draw)
}
demo().catch(e=>status.textContent=String(e));requestAnimationFrame(draw)

const surveys=import.meta.glob('../../evidence/layout-transfer-1/scenes/*.replay.json',{query:'?url',import:'default'})
const selector=$<HTMLSelectElement>('survey')
for(const [path,url] of Object.entries(surveys)){
  const id=path.split('/').at(-1)!.split('.')[0];selector.add(new Option(id,path))
}
selector.onchange=async()=>{try{if(selector.value)load(await (await fetch(await surveys[selector.value]() as string)).json())}catch(err){status.textContent=String(err)}}
