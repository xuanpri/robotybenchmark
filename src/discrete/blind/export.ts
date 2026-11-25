import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync,existsSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {build} from 'esbuild'
import {conditions} from './public'
import {save,type Attempt} from './experiment'
const require=createRequire(import.meta.url)
function runtime(name:string){try{return require(name)}catch{return createRequire(process.env.DISCRETE_BROWSER_PACKAGE??'/tmp/patrolworld-browser-check/package.json')(name)}}
export async function exportSelected(root:string,runs:Attempt[]){
  const selected=runs.filter(r=>!['running','success'].includes(r.outcome))
  for(const c of conditions){
    const successes=runs.filter(r=>r.condition===c&&r.outcome==='success')
    if(c==='Partial-unknown-interactive')successes.sort((a,b)=>b.steps.filter(s=>s.decision?.action==='PEEK').length-a.steps.filter(s=>s.decision?.action==='PEEK').length)
    if(successes[0])selected.push(successes[0])
  }
  save(join(root,'video-selection.json'),{policy:'Every model failure and one representative success per condition; interactive representative prefers most PEEK use.',ids:selected.map(r=>r.id)})
  const bundle=await build({entryPoints:[resolve('src/discrete/blind/capture.ts')],bundle:true,globalName:'BlindFilm',write:false,minify:true})
  writeFileSync(join(root,'renderer.js'),bundle.outputFiles[0].text)
  const puppeteer=runtime('puppeteer-core'),chromium=process.env.CHROME_BIN?null:runtime('@sparticuz/chromium')
  const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN??await chromium.executablePath(),
    args:[...(chromium?.args??[]),'--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],protocolTimeout:180000})
  try{
    const page=await browser.newPage();await page.setViewport({width:1920,height:1080,deviceScaleFactor:1})
    for(const run of selected){
      const dir=join(root,run.id);mkdirSync(join(dir,'frames'),{recursive:true})
      const json=JSON.stringify(run).replaceAll('<','\\u003c')
      writeFileSync(join(dir,'replay.html'),'<!doctype html><meta charset="utf-8"><title>Blind run-up audit replay</title><script src="../renderer.js"></script><script>window.addEventListener("DOMContentLoaded",()=>{window.f=BlindFilm.setup('+json+')})</script>')
      if(existsSync(join(dir,'video.json'))&&existsSync(join(dir,'replay.mp4')))continue
      await page.goto('file://'+resolve(dir,'replay.html'));await page.waitForFunction('window.f !== undefined')
      const encoder=spawn(process.env.VIDEO_PYTHON??'/home/jiaxuanren/miniconda3/envs/opsd/bin/python',['scripts/encode.py',join(dir,'replay.mp4')],{stdio:['pipe','inherit','inherit']}),done=once(encoder,'close')
      let frames=0
      try{
        for(let i=0;i<run.states.length;i++){
          const data=await page.evaluate((index:number)=>(window as any).f.paint(index),i)
          writeFileSync(join(dir,'frames',String(i).padStart(3,'0')+'.png'),Buffer.from(data.png,'base64'))
          const jpg=Buffer.from(data.jpg,'base64')
          for(let n=0;n<15;n++){
            const h=Buffer.alloc(8);h.writeUInt32BE(0);h.writeUInt32BE(n===0?jpg.length:0,4)
            if(!encoder.stdin.write(n===0?Buffer.concat([h,jpg]):h))await once(encoder.stdin,'drain')
            frames++
          }
        }
        encoder.stdin.end();if((await done)[0]!==0)throw Error('Encoder failed')
        save(join(dir,'video.json'),{frames,fps:30,width:1920,height:1080,states:run.states.length,renderer:'Three.js / Chromium / SwiftShader',view:'private audit truth plus exact public observation; never used for model input'})
        console.log('replay',run.id,frames,'frames')
      }finally{encoder.stdin.destroy();if(encoder.exitCode===null)encoder.kill()}
    }
  }finally{await browser.close()}
}
