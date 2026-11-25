import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync,existsSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {build} from 'esbuild'
import type {Run} from './records'
const require=createRequire(import.meta.url)
function browserRuntime(name:string){
  try{return require(name)}
  catch{return createRequire(process.env.DISCRETE_BROWSER_PACKAGE??'/tmp/patrolworld-browser-check/package.json')(name)}
}
export async function exportRuns(root:string,runs:Run[]){
  const bundle=await build({entryPoints:[resolve('src/discrete/capture.ts')],bundle:true,globalName:'DiscreteFilm',write:false,minify:true})
  const js=bundle.outputFiles[0].text
  writeFileSync(join(root,'renderer.js'),js)
  const puppeteer=browserRuntime('puppeteer-core'), chromium=process.env.CHROME_BIN?null:browserRuntime('@sparticuz/chromium')
  const chrome=process.env.CHROME_BIN??await chromium.executablePath()
  const browser=await puppeteer.launch({headless:true,executablePath:chrome,args:[...(chromium?.args??[]),'--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],protocolTimeout:180000})
  try{
    const page=await browser.newPage();await page.setViewport({width:1920,height:1080,deviceScaleFactor:1})
    for(const run of runs){
      const dir=join(root,run.id);mkdirSync(join(dir,'frames'),{recursive:true})
      // Escape embedded JSON so model-produced reason text cannot close a script.
      const json=JSON.stringify(run).replaceAll('<','\\u003c')
      const html='<!doctype html><meta charset="utf-8"><title>Discrete replay</title><script src="../renderer.js"></script><script>window.addEventListener("DOMContentLoaded",()=>{window.f=DiscreteFilm.setup('+json+')})</script>'
      writeFileSync(join(dir,'replay.html'),html)
      const video=join(dir,'replay.mp4')
      if(existsSync(video) && existsSync(join(dir,'video.json')))continue
      await page.goto('file://'+resolve(dir,'replay.html'));await page.waitForFunction('window.f !== undefined')
      const encoder=spawn(process.env.VIDEO_PYTHON??'/home/jiaxuanren/miniconda3/envs/opsd/bin/python',['scripts/encode.py',video],{stdio:['pipe','inherit','inherit']})
      const done=once(encoder,'close');let frames=0
      try{
        for(let i=0;i<run.states.length;i++){
          const data=await page.evaluate((index:number)=>(window as any).f.paint(index),i)
          writeFileSync(join(dir,'frames',String(i).padStart(3,'0')+'.png'),Buffer.from(data.png,'base64'))
          const jpg=Buffer.from(data.jpg,'base64')
          // Half a second per discrete state; use the existing CPU encoder.
          for(let repeat=0;repeat<15;repeat++){
            const header=Buffer.alloc(8);header.writeUInt32BE(0);header.writeUInt32BE(repeat===0?jpg.length:0,4)
            if(!encoder.stdin.write(repeat===0?Buffer.concat([header,jpg]):header))await once(encoder.stdin,'drain')
            frames++
          }
        }
        encoder.stdin.end();if((await done)[0]!==0)throw Error('video encoder failed')
        writeFileSync(join(dir,'video.json'),JSON.stringify({frames,fps:30,width:1920,height:1080,renderer:'Three.js / Chromium / SwiftShader',semantics:'one exact integer world state per 15 frames',states:run.states.length},null,2))
        console.log('replay',run.id,frames,'frames')
      }finally{encoder.stdin.destroy();if(encoder.exitCode===null)encoder.kill()}
    }
  }finally{await browser.close()}
}
