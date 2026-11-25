import {readFileSync,writeFileSync,existsSync,mkdirSync,readdirSync} from 'node:fs'
import {join,relative} from 'node:path'
import {sha} from '../vision/vision-provider'
import {save} from '../dynamics/preflight'
export {sha}
export class BudgetStop extends Error{}
export const strip=(s:string)=>{const m=s.trim().match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i);return m?m[1].trim():s.trim()}
export function files(root:string):string[]{if(!existsSync(root))return [];return readdirSync(root,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(join(root,d.name)):d.name.endsWith('.json')&&root.endsWith('/wire')?[join(root,d.name)]:[])}
export function spending(root:string){let actual=0,unknown=0;const wires=files(root);for(const p of wires){const r=JSON.parse(readFileSync(p,'utf8'));if(r.status===200){const data=JSON.parse(r.raw),u=data.usage??{},s=String(u.cost??data.cost??'');if(/[¥￥]|RMB|CNY/.test(s))actual+=Number(s.replace(/[^0-9.]/g,''));else unknown++}}return {actualRMB:actual,unpriced:unknown,requests:wires.length,billing:'gateway response cost; unknown pricing stops new requests until configured'}}
export function allow(cost:number,limit:number){return cost<limit-.5}
export function payload(model:string,messages:any[],image?:Buffer){return {model,messages:image?[messages[0],{role:'user',content:[{type:'text',text:messages[1].content},{type:'image_url',image_url:{url:'data:image/png;base64,'+image.toString('base64')}}]}]:messages}}
export async function ask(modelRoot:string,dir:string,name:string,model:string,messages:any[],budget:number,frame?:string){
 if(model==='gpt-5.6-sol')throw Error('GPT new API forbidden')
 mkdirSync(join(dir,'wire'),{recursive:true});const image=frame?{path:relative(dir,frame),sha256:sha(readFileSync(frame))}:null
 const archivedMessages=frame?[messages[0],{role:'user',content:[{type:'text',text:messages[1].content},{type:'image_url',image_url:{url:'artifact:'+image!.path,sha256:image!.sha256}}]}]:messages
 const archive={model,messages:archivedMessages},hash=sha(JSON.stringify(archive)),file=join(dir,'wire',name+'.json');let r:any
 if(existsSync(file)){r=JSON.parse(readFileSync(file,'utf8'));if(r.hash!==hash)throw Error('request_reconstruction_mismatch');if(r.latency===undefined)throw Error('unknown_inflight')}
 else{
  const spent=spending(modelRoot);if(spent.unpriced)throw new BudgetStop('missing_gateway_price_stop');if(!allow(spent.actualRMB,budget))throw new BudgetStop('budget_reserve_stop')
  const key=process.env.DMXAPI_API_KEY,base=process.env.DMXAPI_BASE_URL;if(!key||!base)throw Error('missing_environment')
  const u=new URL(base);if(u.protocol!=='https:'||!(u.hostname==='dmxapi.cn'||u.hostname.endsWith('.dmxapi.cn'))||u.username||u.password||u.search||u.hash)throw Error('unexpected_endpoint')
  const actualMessages=frame?[messages[0],{role:'user',content:[{type:'text',text:messages[1].content},{type:'image_url',image_url:{url:'data:image/png;base64,'+readFileSync(frame).toString('base64')}}]}]:messages
  const body=JSON.stringify(payload(model,messages,frame?readFileSync(frame):undefined));if(body.includes(key))throw Error('credential_in_payload')
  r={body:archive,hash,image,payloadSHA256:sha(body),start:new Date().toISOString()};writeFileSync(file,JSON.stringify(r),{flag:'wx',mode:0o600});const start=performance.now()
  try{const res=await fetch(u.toString().replace(/\/+$/,'')+'/chat/completions',{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body,signal:AbortSignal.timeout(120000)});r.status=res.status;r.raw=(await res.text()).replaceAll(key,'[REDACTED]')}catch(e){r.error=(e as Error).name}
  r.latency=(performance.now()-start)/1000;save(file,r);save(join(modelRoot,'cost-live.json'),spending(modelRoot))
 }
 if(r.status!==200)throw Error(r.error??'http_'+r.status)
 const data=JSON.parse(r.raw),choice=data.choices?.[0],usage=data.usage??{},content=choice?.message?.content
 const returned=String(data.model??'');if(returned!==model&&!returned.startsWith(model+'-'))throw Error('returned_model_mismatch:'+returned)
 if(!data.id||!Number.isFinite(usage.prompt_tokens??usage.input_tokens)||!Number.isFinite(usage.completion_tokens??usage.output_tokens))throw Error('missing_usage_or_id')
 if(choice?.finish_reason!=='stop'||choice.message?.refusal)throw Error('invalid_finish')
 const text=typeof content==='string'?content:Array.isArray(content)?content.filter((p:any)=>p.type==='text').map((p:any)=>p.text).join(''):null
 if(text===null)throw Error('missing_content')
 return {rawContent:text,content:strip(text),usage,model:returned,latency:r.latency,wire:relative(modelRoot,file),responseID:data.id}
}
