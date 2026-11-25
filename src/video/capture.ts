import {ArenaRenderer} from '../view/render'
import {sampleAt,timeline,type Replay,type Timing} from './replay'
type Layout='omniscient'|'limited'|'split'
export function setup(replay:Replay,index:number,layout:Layout,timing:Timing){
  const a=replay.attempts[index],fps=30,w=1920,h=1080,split=layout==='split',pane=split?w/2:w
  const output=document.createElement('canvas');output.width=w;output.height=h
  const ctx=output.getContext('2d',{alpha:false})!
  const views=(split?['omniscient','limited']:[layout]) as ('omniscient'|'limited')[]
  const renders=views.map(()=>{
    const canvas=document.createElement('canvas');canvas.style.cssText='width:'+pane+'px;height:900px;position:fixed;left:-2500px'
    document.body.append(canvas);return {canvas,view:new ArenaRenderer(canvas,a.config)}
  })
  const segments=timeline(a,timing,replay.demo),duration=segments.at(-1)!.until
  const survey=!!replay.demo && replay.agent==='Scene survey'
  const opts={cones:true,routes:survey,range:false,los:false,bounds:false,nodes:false}
  let previous='',jpeg=''
  function paint(i:number){
    const t=i/fps,s=segments.find(row=>row.until>t)??segments.at(-1)!
    const f=sampleAt(a,s.sim+(t-s.from)*s.rate)
    const key=[f.full.time,s.from,s.after].join('/')
    if(key===previous)return false
    previous=key
    ctx.fillStyle='#22242d';ctx.fillRect(0,0,w,h)
    for(const [j,mode] of views.entries()){
      const surveyPane=survey && mode==='omniscient'
      renders[j].view.render(mode==='limited'?f.limited:f.full,surveyPane?'debug':mode,opts,surveyPane?{robots:[]}:undefined,!replay.demo)
      ctx.drawImage(renders[j].canvas,j*pane,90,pane,900)
      if(surveyPane)for(const r of f.full.robots){
        const p=renders[j].view.labelPoint(r.position),x=j*pane+(p.x+1)*pane/2,y=90+(1-p.y)*450
        ctx.fillStyle='#28252e';ctx.fillRect(x-16,y-16,34,22);ctx.fillStyle='#fff';ctx.font='bold 16px monospace';ctx.fillText(r.id,x-11,y)
      }
      ctx.font='22px monospace';ctx.fillStyle='#c3cbd0';ctx.fillText(mode.toUpperCase(),j*pane+30,119)
    }
    if(split){ctx.fillStyle='#4d535a';ctx.fillRect(pane-1,90,2,900)}
    ctx.fillStyle='#131a20';ctx.fillRect(0,0,w,83);ctx.fillRect(0,985,w,95)
    ctx.fillStyle='#f4f3ee';ctx.font='bold 34px sans-serif';ctx.fillText(replay.agent,32,50)
    ctx.font='24px monospace';ctx.fillText(a.stage+'  /  '+timing+' time',620,50)
    ctx.fillText(f.full.time.toFixed(2)+' s',1720,50)
    if(!replay.demo){
      const hp=s.after?a.after:a.hp
      ctx.fillStyle='#474d53';ctx.fillRect(32,1014,180,12);ctx.fillStyle='#76c7a7';ctx.fillRect(32,1014,Math.min(1,hp/(replay.maxHP??replay.attempts[0].hp))*180,12)
      ctx.font='21px monospace';ctx.fillText('HP '+hp,32,1055);ctx.fillStyle='#e5ecee'
      const count=a.decisions.filter(d=>d.start<=f.full.time&&d.end>d.start).length
      ctx.fillText('Attempt '+a.attempt+'   |   Action '+count+'   |   '+s.label,255,1025)
      if(s.label==='Experience'){
        ctx.fillStyle='#131a20ee';ctx.fillRect(32,790,w-64,172);ctx.fillStyle='#e5ecee';ctx.font='26px sans-serif'
        const words=s.reason.split(/\s+/);let line='',row=0
        for(const word of words){if(ctx.measureText(line+' '+word).width>w-140){ctx.fillText(line,62,840+row++*32);line=''}line+=(line?' ':'')+word}
        ctx.fillText(line,62,840+row*32)
      }else if(s.reason)ctx.fillText(s.reason,255,1059,1570)
      else if(s.after&&split&&replay.agent==='gpt-5.6-sol'&&a.stage==='exploration'&&!a.notes?.length)ctx.fillText('No online reflection available at reset.',255,1059,1570)
    }else{ctx.font='23px monospace';ctx.fillStyle='#c6cbd1';ctx.fillText(survey?a.config.robotCount+' patrols   /   routes and wall-clipped vision':'Four autonomous patrols   /   wall-clipped vision',32,1040)}
    return true
  }
  function frame(i:number){
    if(paint(i)||!jpeg)jpeg=output.toDataURL('image/jpeg',.91).split(',')[1]
    return jpeg
  }
  function packet(i:number){
    if(!paint(i))return ''
    return output.toDataURL('image/jpeg',.91).split(',')[1]
  }
  return {count:Math.ceil(duration*fps-1e-7),frame,packet,paint,canvas:output}
}

// Live decision capture receives only the public frame and static room. No
// private patrol configuration, replay, predictions or debug overlays cross here.
export function decisionScreenshot(frame:import('../sim/session').Frame,room:import('../sim/config').Room){
  const canvas=document.createElement('canvas')
  canvas.style.cssText='width:1280px;height:720px'
  document.body.append(canvas)
  const cfg={room,patrols:[],robotCount:0,robotRadius:.34,playerRadius:.28,playerSpeed:2.5,
    visionDegrees:90,visionRange:5,playerRange:6,failure:'both',observation:'limited',
    publishRules:false,phaseJitter:0,maxTime:90,maxAttempts:1} as const
  const renderer=new ArenaRenderer(canvas,{...cfg,patrols:[]})
  renderer.render(frame,'limited',{cones:false,routes:false,range:false,los:false,bounds:false,nodes:false})
  // Copy immediately after rendering; WebGL does not preserve its buffer.
  const copy=document.createElement('canvas');copy.width=1280;copy.height=720
  copy.getContext('2d')!.drawImage(canvas,0,0,1280,720)
  return copy.toDataURL('image/png')
}
