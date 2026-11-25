// Uses a bundled local page, SwiftShader and a CPU FFmpeg backend. No network assets.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os')
const {spawn}=require('node:child_process'),{once}=require('node:events')
const puppeteer=require('puppeteer-core'),esbuild=require('esbuild')
async function main(){
  const [input,output,layout='split',timing='simulation',parts]=process.argv.slice(2)
  if(!output||!['split','omniscient','limited'].includes(layout)||!['simulation','wall-clock'].includes(timing))throw Error('video.cjs replay.json output.mp4 [split|limited|omniscient] [simulation|wall-clock] [parts]')
  const dir=path.dirname(output);fs.mkdirSync(dir,{recursive:true})
  if(fs.existsSync(output))throw Error('Output exists: '+output)
  const temp=fs.mkdtempSync(path.join(dir,'.export-')),replay=JSON.parse(fs.readFileSync(input,'utf8'))
  const js=await esbuild.build({entryPoints:['src/video/capture.ts'],bundle:true,globalName:'ArenaFilm',write:false,minify:true})
  const chromium=process.env.CHROME_BIN?null:require('@sparticuz/chromium')
  const browser=await puppeteer.launch({headless:true,executablePath:chromium?await chromium.executablePath():process.env.CHROME_BIN,
    args:[...(chromium?chromium.args:[]),'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-timer-throttling'],protocolTimeout:180000})
  const encoder=spawn(process.env.VIDEO_PYTHON||'python3',['scripts/encode.py',path.join(temp,'film.mp4'),...(parts? [path.join(temp,'attempt-%03d.mp4')]:[])],{stdio:['pipe','inherit','inherit']})
  const finished=once(encoder,'close');let frames=0
  try{
    const page=await browser.newPage();await page.setViewport({width:1920,height:1080,deviceScaleFactor:1})
    for(let j=0;j<replay.attempts.length;j++){
      await page.goto('about:blank');await page.addScriptTag({content:js.outputFiles[0].text})
      const count=await page.evaluate(({r,l,t})=>{window.f=ArenaFilm.setup(r,0,l,t);return f.count},{r:{...replay,maxHP:replay.maxHP??replay.attempts[0].hp,attempts:[replay.attempts[j]]},l:layout,t:timing})
      for(let i=0;i<count;i++){
        const jpg=Buffer.from(await page.evaluate(i=>f.packet(i),i),'base64'),header=Buffer.alloc(8)
        header.writeUInt32BE(j);header.writeUInt32BE(jpg.length,4)
        if(!encoder.stdin.write(Buffer.concat([header,jpg])))await once(encoder.stdin,'drain')
        frames++
      }
      console.log(replay.attempts[j].id,count,'frames')
    }
    encoder.stdin.end()
    if((await finished)[0]!==0)throw Error('encoder failed')
    if(parts)for(let j=0;j<replay.attempts.length;j++){
      const file='attempt-'+String(j+1).padStart(3,'0')+'.mp4'
      fs.linkSync(path.join(temp,file),path.join(dir,path.basename(output,'.mp4')+'-'+file))
    }
    fs.linkSync(path.join(temp,'film.mp4'),output)
    fs.writeFileSync(output+'.json',JSON.stringify({input,layout,timing,frames,fps:30,width:1920,height:1080,seed:replay.attempts.map(a=>a.seed),encoder:'OpenCV FFmpeg CPU mp4v',renderer:'Chromium ANGLE SwiftShader',command:process.argv.slice(1)},null,2),{flag:'wx'})
  }finally{encoder.stdin.destroy();encoder.kill();await browser.close();fs.rmSync(temp,{recursive:true,force:true})}
}
main().catch(e=>{console.error(e);process.exitCode=1})
