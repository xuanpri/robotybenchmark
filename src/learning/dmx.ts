import {mkdirSync,readdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import cfg from '../../config/dmx-pilot.json'
import type {Messages} from './agents'

export {cfg as dmx}
export type Track='smoke'|'A'|'B'
export function read<T>(path:string):T{return JSON.parse(readFileSync(path,'utf8'))}
export function save(path:string,data:unknown){
  writeFileSync(path+'.partial',JSON.stringify(data),{mode:0o600,flush:true})
  renameSync(path+'.partial',path)
}
export class Pause extends Error{}
export interface Wire {
  seq:number;name:string;track:Track;hash:string;body:{model:string;messages:Messages};started:string
  status?:number;raw?:string;latency?:number;error?:string
}
export class Ledger{
  constructor(readonly root:string,private offline=false,private resumeKnownFailure=false){mkdirSync(root,{recursive:true})}
  records(){return readdirSync(this.root).filter(n=>/^\d{3}\.json$/.test(n)).sort().map(n=>read<Wire>(join(this.root,n)))}
  async ask(track:Track,name:string,messages:Messages){
    const base=process.env[cfg.base_env],key=process.env[cfg.key_env]
    if(!this.offline&&(!base||!key))throw new Pause('missing_environment')
    const u=new URL(base??'https://www.dmxapi.cn/v1')
    if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||!(u.hostname==='dmxapi.cn'||u.hostname.endsWith('.dmxapi.cn')))throw new Pause('unexpected_endpoint')
    const url=u.toString().replace(/\/+$/,'')+'/chat/completions',body={model:cfg.model,messages},hash=createHash('sha256').update(JSON.stringify(body)).digest('hex')
    if(key&&JSON.stringify(body).includes(key))throw new Pause('credential_in_payload')
    const old=this.records().filter(r=>r.track===track&&r.name===name)
    // A human-initiated continuation can retry a known failed transport, never an unknown outstanding request.
    if(old.some(r=>r.hash!==hash))throw new Pause('request_reconstruction_mismatch')
    const last=old.at(-1)
    const offset=last?.status===200 ? old.length-1 : this.resumeKnownFailure && last?.latency!==undefined ? old.length : 0
    for(let retry=0;retry<=cfg.maxRetries;retry++){
      const rows=this.records(),matching=rows.filter(r=>r.track===track&&r.name===name)
      let r=matching[offset+retry]
      if(r && r.hash!==hash)throw new Pause('request_reconstruction_mismatch')
      if(!r){
        if(this.offline)throw new Pause('checkpoint_boundary')
        const group=rows.filter(x=>(x.track==='smoke')===(track==='smoke'))
        if(group.length>=(track==='smoke'?cfg.smokeLimit:cfg.experimentLimit))throw new Pause('request_cap')
        r={seq:rows.length+1,name,track,hash,body,started:new Date().toISOString()}
        const path=join(this.root,String(r.seq).padStart(3,'0')+'.json')
        writeFileSync(path,JSON.stringify(r),{flag:'wx',mode:0o600,flush:true})
        const start=performance.now()
        try{
          const res=await fetch(url,{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(100000)})
          r.status=res.status;r.raw=(await res.text()).replaceAll(key!,'[REDACTED]')
        }catch(e){r.error=(e as Error).name==='TimeoutError'?'timeout':'network_error'}
        r.latency=(performance.now()-start)/1000;save(path,r)
      }
      if(r.latency===undefined)throw new Pause('unknown_inflight_request')
      if(r.status===200){
        let data
        try{data=JSON.parse(r.raw!)}catch{throw new Pause('unparseable_provider_envelope')}
        if(data.error)throw new Pause('provider_error_envelope')
        if(data.model!==cfg.model && data.model!==cfg.acceptedSnapshot)throw new Pause('returned_model_mismatch')
        if(!data.id||!data.choices?.[0]||!Number.isSafeInteger(data.usage?.prompt_tokens)||!Number.isSafeInteger(data.usage?.completion_tokens))throw new Pause('missing_response_metadata')
        const c=data.choices[0]
        return {r,data,content:c.message?.content??'',valid:c.finish_reason==='stop'&&!c.message?.refusal,
          latency:matching.slice(0,offset+retry).reduce((n,x)=>n+(x.latency??0),0)+(r.latency??0)}
      }
      if(r.status===401||r.status===403||r.status===402||/insufficient|quota exceeded|balance|余额不足|额度不足/i.test(r.raw??''))throw new Pause('auth_or_balance')
      if((r.error||r.status===429||[502,503,504].includes(r.status??0))&&retry<cfg.maxRetries){
        if(!matching[offset+retry+1]&&!this.offline)await new Promise(resolve=>setTimeout(resolve,1500))
        continue
      }
      throw new Pause(r.status?'http_'+r.status:r.error??'provider_interruption')
    }
    throw new Pause('retry_limit')
  }
}
