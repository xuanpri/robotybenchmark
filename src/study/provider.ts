import {existsSync,mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {dmx,Pause,read,save} from '../learning/dmx'
import type {Messages,ContentPart} from '../learning/agents'
export type Answer={content:string;latency:number;model:string;usage:Record<string,unknown>}
export type Ask=(name:string,messages:Messages<string|ContentPart[]>)=>Promise<Answer>
type Receipt={hash:string;body:{model:string;messages:Messages<string|ContentPart[]>};start:string;status?:number;raw?:string;latency?:number;error?:string}
export const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
export function provider(dir:string,retryKnown=false):Ask{
  mkdirSync(dir,{recursive:true})
  return async(name,messages)=>{
    if(!/^[a-z0-9-]+$/i.test(name))throw Error('Unexpected receipt name')
    const body={model:dmx.model,messages},hash=digest(body)
    for(let i=0;i<=1;i++){
      const file=join(dir,name+'-'+i+'.json')
      let r:Receipt
      if(existsSync(file)){
        r=read<Receipt>(file)
        if(r.hash!==hash)throw new Pause('request_reconstruction_mismatch')
      }else{
        const key=process.env.DMXAPI_API_KEY,base=process.env.DMXAPI_BASE_URL
        if(!key||!base)throw new Pause('missing_environment')
        const url=new URL(base)
        if(url.protocol!=='https:'||!(url.hostname==='dmxapi.cn'||url.hostname.endsWith('.dmxapi.cn'))||url.username||url.password||url.search||url.hash)throw new Pause('unexpected_endpoint')
        const payload=JSON.stringify(body)
        if(payload.includes(key))throw new Pause('credential_in_payload')
        r={hash,body,start:new Date().toISOString()}
        writeFileSync(file,JSON.stringify(r),{flag:'wx',mode:0o600,flush:true})
        const start=performance.now()
        try{
          const res=await fetch(url.toString().replace(/\/+$/,'')+'/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:payload,redirect:'error',signal:AbortSignal.timeout(120000)})
          r.status=res.status;r.raw=(await res.text()).replaceAll(key,'[REDACTED]')
        }catch(e){r.error=(e as Error).name==='TimeoutError'?'timeout':'network_error'}
        r.latency=(performance.now()-start)/1000;save(file,r)
      }
      if(r.latency===undefined)throw new Pause('unknown_inflight')
      if(r.status===200){
        let data
        try{data=JSON.parse(r.raw!)}catch{throw new Pause('invalid_envelope')}
        if(data.error)throw new Pause('provider_error')
        if(![dmx.model,dmx.acceptedSnapshot].includes(data.model))throw new Pause('model_mismatch')
        const c=data.choices?.[0]
        if(!data.id||!Number.isSafeInteger(data.usage?.prompt_tokens)||!Number.isSafeInteger(data.usage?.completion_tokens))throw new Pause('missing_metadata')
        if(c?.finish_reason!=='stop'||c.message?.refusal||typeof c.message?.content!=='string')throw new Pause('invalid_response_'+(c?.finish_reason??'missing'))
        return {content:c.message.content,model:data.model,usage:data.usage,latency:r.latency}
      }
      if(i===0 && (existsSync(join(dir,name+'-1.json'))||retryKnown && r.status!==undefined))continue
      if(/maximum context|context.length|context.window|too many tokens/i.test(r.raw??''))throw new Pause('provider_context_limit')
      throw new Pause(r.error??'http_'+r.status)
    }
    throw new Pause('retry_exhausted')
  }
}
