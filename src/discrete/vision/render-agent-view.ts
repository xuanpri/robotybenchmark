import {createRequire} from 'node:module'
import {walls,vision,same,type State,type Pos,type Heading} from '../blind/environment'
const require=createRequire(import.meta.url)
function runtime(name:string){try{return require(name)}catch{return createRequire('/tmp/patrolworld-browser-check/package.json')(name)}}
export type Condition='Omniscient-Vision'|'Partial-known-Vision'
export function imageObservation(s:State,c:Condition){const visible=c==='Omniscient-Vision'||same(s.player,[1,3]);return {player:[...s.player] as Pos,robot:visible?{pos:[...s.robot.pos] as Pos,heading:s.robot.heading}:null,vision:visible?vision(s.robot):[],fog:!visible,walls}}
export async function renderer(){
 const puppeteer=runtime('puppeteer-core'),chromium=runtime('@sparticuz/chromium')
 const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN??await chromium.executablePath(),args:[...chromium.args,'--no-sandbox'],protocolTimeout:180000})
 const page=await browser.newPage();await page.setViewport({width:640,height:384,deviceScaleFactor:1});await page.goto('about:blank')
 return {close:()=>browser.close(),async png(s:State,c:Condition):Promise<Buffer>{
  const obs=imageObservation(s,c)
  const b64=await page.evaluate((o:any)=>{
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=384;const g=canvas.getContext('2d')!,ox=64,oy=28,k=50
   g.fillStyle='#f7f9fc';g.fillRect(0,0,640,384);g.font='bold 14px Arial';g.textAlign='center';g.fillStyle='#111827'
   for(let x=0;x<10;x++)g.fillText(String(x),ox+(x+.5)*k,19)
   for(let z=0;z<6;z++)g.fillText(String(z),45,oy+(z+.5)*k+5)
   g.font='12px Arial';g.fillText('x',584,18);g.fillText('z',24,42)
   for(let z=0;z<6;z++)for(let x=0;x<10;x++){g.fillStyle=o.walls.some((p:number[])=>p[0]===x&&p[1]===z)?'#475569':'#fff';g.fillRect(ox+x*k,oy+z*k,k,k)}
   g.fillStyle='#12a66a';g.fillRect(ox+8*k+2,oy+3*k+2,46,46);g.fillStyle='#fff';g.font='bold 10px Arial';g.fillText('GOAL',ox+8.5*k,oy+3.5*k+4)
   if(o.fog){g.fillStyle='rgba(45,49,58,.40)';for(const p of [[2,3],[3,3],[4,3],[5,1],[5,2],[5,3],[5,4]])g.fillRect(ox+p[0]*k,oy+p[1]*k,k,k);g.fillStyle='#151b25';g.font='bold 11px Arial';g.fillText('OCCLUDED',ox+3.5*k,oy+3*k+12)}
   for(const p of o.vision){g.fillStyle='#ffc0c0';g.fillRect(ox+p[0]*k+2,oy+p[1]*k+2,46,46)}
   g.strokeStyle='#111827';g.lineWidth=1;for(let x=0;x<=10;x++){g.beginPath();g.moveTo(ox+x*k,oy);g.lineTo(ox+x*k,oy+300);g.stroke()}for(let z=0;z<=6;z++){g.beginPath();g.moveTo(ox,oy+z*k);g.lineTo(ox+500,oy+z*k);g.stroke()}
   // Door is the cell boundary x=4 -> x=5, hence ox+5*k.
   g.strokeStyle='#111827';g.lineWidth=7;g.beginPath();g.moveTo(ox+5*k,oy+3*k+2);g.lineTo(ox+5*k,oy+4*k-2);g.stroke();g.strokeStyle='#f3a712';g.lineWidth=4;g.stroke()
   const px=ox+(o.player[0]+.5)*k,pz=oy+(o.player[1]+.5)*k;g.fillStyle='#0969da';g.beginPath();g.arc(px,pz,14,0,Math.PI*2);g.fill();g.fillStyle='#fff';g.font='bold 18px Arial';g.fillText('P',px,pz+6)
   if(o.robot){const r=o.robot,cx=ox+(r.pos[0]+.5)*k,cz=oy+(r.pos[1]+.5)*k;g.fillStyle='#c51d2b';g.fillRect(cx-15,cz-15,30,30);const d:any={N:[0,-1],S:[0,1],E:[1,0],W:[-1,0]},[dx,dz]=d[r.heading];g.strokeStyle='#fff';g.lineWidth=4;g.beginPath();g.moveTo(cx-dx*10,cz-dz*10);g.lineTo(cx+dx*13,cz+dz*13);g.moveTo(cx+dx*13,cz+dz*13);g.lineTo(cx+dx*5-dz*6,cz+dz*5+dx*6);g.moveTo(cx+dx*13,cz+dz*13);g.lineTo(cx+dx*5+dz*6,cz+dz*5-dx*6);g.stroke();g.fillStyle='#111';g.font='bold 12px Arial';g.fillText(r.heading,cx+21,cz+4)}
   g.textAlign='left';g.font='12px Arial';const legend=[['#fff','Floor'],['#475569','Wall'],['#f3a712','Opaque door'],['#12a66a','GOAL (8,3)'],['#80848c','OCCLUDED']];let lx=24;for(const [color,label] of legend){g.fillStyle=color;g.fillRect(lx,342,12,12);g.strokeStyle='#111';g.lineWidth=1;g.strokeRect(lx,342,12,12);g.fillStyle='#111';g.fillText(label,lx+17,353);lx+=label.length*6+39}g.fillText('P: blue player    Red square + arrow: robot    Pink: robot vision',24,375)
   return canvas.toDataURL('image/png').split(',')[1]
  },obs)
  return Buffer.from(b64,'base64')
 }}
}
