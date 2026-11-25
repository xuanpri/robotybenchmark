const fs=require('node:fs'),p=require('puppeteer-core'),esbuild=require('esbuild')
async function main(){
 const [input,output]=process.argv.slice(2),data=JSON.parse(fs.readFileSync(input,'utf8'))
 const chromium=require('@sparticuz/chromium')
 const browser=await p.launch({headless:true,executablePath:await chromium.executablePath(),args:[...chromium.args,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
 try{
  const page=await browser.newPage();await page.setViewport({width:1280,height:720,deviceScaleFactor:1})
  const js=await esbuild.build({entryPoints:['src/video/capture.ts'],bundle:true,globalName:'ArenaFilm',write:false})
  await page.addScriptTag({content:js.outputFiles[0].text})
  const image=await page.evaluate(({frame,room})=>ArenaFilm.decisionScreenshot(frame,room),data)
  fs.writeFileSync(output,Buffer.from(image.split(',')[1],'base64'),{flag:'wx'})
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1})
