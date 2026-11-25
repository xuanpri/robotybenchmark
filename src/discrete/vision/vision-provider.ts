import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs'
import {join,dirname,relative,resolve} from 'node:path'
import {createHash} from 'node:crypto'
import config from '../../../config/dmx-pilot.json'
import {save} from '../dynamics/preflight'
export const sha=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex')
export class BudgetStop extends Error{}
export function ledger(root:string){const receipts:any[]=[];for(const d of readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory())){const path=join(root,d.name,'wire');if(existsSync(path))for(const f of readdirSync(path).filter(f=>f.endsWith('.json')))receipts.push(JSON.parse(readFileSync(join(path,f),'utf8')))}
 let cost=0,unpriced=0;for(const r of receipts){if(r.status===200){const data=JSON.parse(r.raw),s=String(data.usage?.cost??'');if(!/[¥￥]|RMB|CNY/.test(s))unpriced++;else cost+=Number(s.replace(/[^0-9.]/g,''))}}
 return {costRMB:cost,physicalRequests:receipts.length,completed:receipts.filter(r=>r.latency!==undefined).length,unpriced}}
export async function ask(root:string,dir:string,name:string,text:{role:'system'|'user';content:string}[],frame:string,maxBudget:number){
 mkdirSync(join(dir,'wire'),{recursive:true});const bytes=readFileSync(frame),image={path:relative(dir,frame),sha256:sha(bytes),mimeType:'image/png'},file=join(dir,'wire',name+'.json')
 const archived={model:config.model,messages:[text[0],{role:'user',content:[{type:'text',text:text[1].content},{type:'image_url',image_url:{url:'artifact:'+image.path,sha256:image.sha256}}]}]},hash=sha(JSON.stringify(archived))
 let r:any
 if(existsSync(file)){r=JSON.parse(readFileSync(file,'utf8'));if(r.hash!==hash)throw Error('request_reconstruction_mismatch');if(r.latency===undefined)throw Error('unknown_inflight');}
 else{
  const spent=ledger(root);if(spent.unpriced)throw new BudgetStop('unpriced_response_stop');if(spent.costRMB>=maxBudget-.50)throw new BudgetStop('budget_reserve_stop')
  const key=process.env.DMXAPI_API_KEY,base=process.env.DMXAPI_BASE_URL;if(!key||!base)throw Error('missing_environment')
  const url=new URL(base);if(url.protocol!=='https:'||!(url.hostname==='dmxapi.cn'||url.hostname.endsWith('.dmxapi.cn'))||url.username||url.password||url.search||url.hash)throw Error('unexpected_endpoint')
  const payload={model:config.model,messages:[text[0],{role:'user',content:[{type:'text',text:text[1].content},{type:'image_url',image_url:{url:'data:image/png;base64,'+bytes.toString('base64')}}]}]},body=JSON.stringify(payload)
  if(body.includes(key))throw Error('credential_in_payload')
  r={hash,body:archived,image,payloadSHA256:sha(body),start:new Date().toISOString()};writeFileSync(file,JSON.stringify(r),{flag:'wx',mode:0o600});const start=performance.now()
  try{const res=await fetch(url.toString().replace(/\/+$/,'')+'/chat/completions',{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body,signal:AbortSignal.timeout(120000)});r.status=res.status;r.raw=(await res.text()).replaceAll(key,'[REDACTED]')}catch(e){r.error=(e as Error).name}
  r.latency=(performance.now()-start)/1000;save(file,r);save(join(root,'cost-live.json'),ledger(root))
 }
 if(r.status!==200)throw Error(r.error??'http_'+r.status)
 const data=JSON.parse(r.raw);if(![config.model,config.acceptedSnapshot].includes(data.model)||!data.id||!Number.isSafeInteger(data.usage?.prompt_tokens)||!Number.isSafeInteger(data.usage?.completion_tokens))throw Error('invalid_provider_metadata')
 const choice=data.choices?.[0];if(choice?.finish_reason!=='stop'||choice.message?.refusal||typeof choice.message?.content!=='string')throw Error('invalid_provider_response')
 return {content:choice.message.content,model:data.model,usage:data.usage,latency:r.latency,wire:relative(root,file),image}
}
