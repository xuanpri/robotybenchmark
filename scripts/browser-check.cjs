// Optional visual acceptance. Install puppeteer-core separately or set NODE_PATH.
const puppeteer = require('puppeteer-core')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
async function main(){
  const chromium = process.env.CHROME_BIN ? null : require('@sparticuz/chromium')
  const browser = await puppeteer.launch({
    executablePath:process.env.CHROME_BIN || await chromium.executablePath(),
    args:chromium ? chromium.args : ['--enable-unsafe-swiftshader'], headless:true,
  })
  try {
    const page=await browser.newPage(),errors=[]
    page.on('pageerror',e=>errors.push(String(e)))
    await page.setViewport({width:1440,height:900,deviceScaleFactor:1})
    await page.goto('http://127.0.0.1:5186',{waitUntil:'networkidle0'})
    await page.waitForFunction(()=>document.querySelector('canvas')?.getContext('webgl2'))
    const folder=path.resolve(__dirname,'../evidence')
    const paint=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
    const take=async name=>{await paint();await page.screenshot({path:path.join(folder,name+'.png')})}
    await take('omniscient')
    await page.click('[data-mode=limited]');await page.click('.vision');await take('limited')
    assert(await page.$eval('aside',el=>el.hidden))
    await page.click('[data-mode=debug]');await take('debug')
    assert.match(await page.$eval('aside pre',e=>e.textContent),/R4/)
    await page.keyboard.down('ArrowUp');await page.click('#step');await page.keyboard.up('ArrowUp')
    assert.equal(await page.$eval('time',el=>el.textContent),'00:00.1')
    for(const speed of ['0.5','2','1'])await page.click('[data-speed="'+speed+'"]')
    await page.click('#reset');await page.click('#play')
    await page.waitForFunction(()=>document.querySelector('time').textContent!=='00:00.0')
    await page.click('#play')
    assert.equal(await page.$eval('.status span',e=>e.textContent),'Paused')
    await page.click('[data-mode=limited]')
    assert.equal(await page.$eval('aside pre',e=>e.textContent),'')
    await page.click('#reset')
    assert.equal(await page.$eval('time',el=>el.textContent),'00:00.0')
    assert.deepEqual(errors,[])
    const report={browser:await browser.version(),viewport:[1440,900],webgl:2,screens:['omniscient','limited','debug'],checks:['view switch','vision toggle','debug state removal','keyboard and single tick','speed buttons','start/pause/reset'],pageErrors:errors}
    fs.writeFileSync(path.join(folder,'browser-check.json'),JSON.stringify(report,null,2)+'\n')
    console.log(report)
  } finally {await browser.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1})
