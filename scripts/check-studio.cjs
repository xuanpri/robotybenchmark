const puppeteer=require('puppeteer-core'),chromium=require('@sparticuz/chromium'),assert=require('node:assert/strict')
async function main(){
  const b=await puppeteer.launch({executablePath:await chromium.executablePath(),args:chromium.args,headless:true})
  try{
    const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(String(e)))
    await p.goto('http://127.0.0.1:5186/studio.html')
    await p.waitForFunction(()=>document.querySelector('#seek').max==='1199')
    await p.click('#play')
    await p.waitForFunction(()=>+document.querySelector('#seek').value>2)
    await p.click('#play')
    await (await p.$('#file')).uploadFile('results/pilot-film-mock/replay.json')
    await p.waitForFunction(()=>document.querySelector('#attempt').options.length===2)
    await p.select('#attempt','1');await p.select('#layout','limited');await p.select('#time','wall-clock')
    await p.waitForFunction(()=>document.querySelector('iframe').contentDocument.querySelector('canvas')?.width===1920)
    const renderer=await p.evaluate(()=>{
      const gl=document.querySelector('body > canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info')
      return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)
    })
    assert.deepEqual(errors,[]);console.log(JSON.stringify({renderer,checks:['demo playback','replay upload','attempt switch','limited view','wall-clock'],errors},null,2))
  }finally{await b.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1})
