import fs from 'node:fs'
import assert from 'node:assert/strict'
import {Physics,sees,observable} from '../src/sim/world'
import {distance,wallHit} from '../src/sim/geometry'
import {actions,direction,type Action,type Point} from '../src/sim/config'
const out='evidence/rule-audit/',read=(p:string)=>JSON.parse(fs.readFileSync(p,'utf8')),write=(p:string,v:unknown)=>fs.writeFileSync(out+p,JSON.stringify(v,null,2))
const rows: {n:number;i:number;file:string;request:any;response:string;input:any;c:any;start:number;end:number;killer:string[];blocked:number;candidates:{a:Action;d:number;outcome:string}[];earlier:unknown;micro:{time:number;pos:Point;robot:Point;heading:number;los:boolean;visible:boolean;seen:boolean}[];reflection:unknown}[]=[],chain:any[]=[],questions:any[]=[]
let system=''
for(const n of [2,4])for(let i=1;i<=10;i++){
 const dir='results/layout-transfer-1/A-N'+n+'-G3-source/',t=read(dir+'attempt-'+i+'.json'),cfg=t.film.config,p=new Physics(cfg,1),last=t.turns.length
 let s=p.initial(),blocked=0
 function run(state:typeof s,a:Action,d:number){for(let j=0;j<Math.round(d*10)&&state.outcome==='active';j++)state=p.advance(state,a);return state}
 for(const [k,turn] of t.turns.entries()){
 const file=dir+'wire/'+i+'-act-'+(k+1)+'-0.json',r=read(file),input=JSON.parse(r.body.messages[1].content),c=JSON.parse(JSON.parse(r.raw).choices[0].message.content)
 assert.deepEqual(input.current,turn.before);assert.deepEqual(c,turn.choice);system=r.body.messages[0].content
 const end=run(s,c.action,c.duration);assert.deepEqual(end.player,turn.after.player)
 if(n===2&&i===10)chain.push({time:s.clock/100,end:end.clock/100,pos:s.player,to:end.player,...c,visible:input.current.robots,file})
 if(k+1===last){
 const killer=p.robots(end.clock).filter(b=>sees(b,end.player,cfg)).map(b=>b.id);assert.equal(end.outcome,'seen')
 const candidates=actions.flatMap(a=>input.durations.map((d:number)=>({a,d,outcome:run(s,a,d).outcome})))
 const micro=[];let pos=s.player
 for(let clock=s.clock;clock<=end.clock;clock++){
 if(clock>s.clock){const delta=direction[c.action as Action];pos=move(pos,[delta[0]*cfg.playerSpeed*.01,delta[1]*cfg.playerSpeed*.01],cfg.room,cfg.playerRadius)}
 const b=p.robots(clock).find(b=>b.id===killer[0])!
 micro.push({time:clock/100,pos,robot:b.position,heading:b.heading,los:wallHit(pos,b.position,cfg.room)===Infinity,visible:observable(pos,b.position,cfg),seen:sees(b,pos,cfg)})
 }
 assert.deepEqual(pos,end.player)
 const prev=t.turns[k-1];let earlier=null
 if(!candidates.some(v=>v.outcome==='active')&&prev){let old=p.initial();for(const v of t.turns.slice(0,k-1))old=run(old,v.choice.action,v.choice.duration);earlier=actions.flatMap(a=>input.durations.map((d:number)=>({a,d,outcome:run(old,a,d).outcome})))}
 rows.push({n,i,file,request:r.body,response:r.raw,input,c,start:s.clock/100,end:end.clock/100,killer,blocked,candidates,earlier,micro,reflection:t.lesson})
 }
 if(end.outcome==='active'&&c.action!=='WAIT'&&distance(s.player,end.player)<cfg.playerSpeed*c.duration-1e-5)blocked++
 s=end
 }
}
import {move} from '../src/sim/geometry'
write('failures.json',rows);write('N2-10.json',chain)
const complete=system+' North/south decrement/increment z; west/east decrement/increment x. Player radius 0.28 m. Movement clips against closed wall rectangles expanded by that radius on both axes. Robot radius 0.34 m. Patrols continue while waiting and moving; each 0.01 s substep checks swept contact (center separation ≤0.62 m), then detection, before exit. Detection needs center distance ≤5 m, heading difference ≤45 degrees and an unobstructed center-to-center segment; touching a wall blocks that ray. Either event immediately ends the attempt. Within 6 m and a clear segment you receive robot ID, position and heading only at decision boundaries. No mid-action observation or cancellation. Terminal feedback gives outcome, not detector ID. Reach within 0.64 m of exit center.'
write('prompts.json',{original:system,complete})
const r=rows.at(-1)!,m=r.micro.at(-1)!
for(const [id,q,input,options,key,why] of [
 ['D0','Does WAIT advance patrol time?',complete,['yes','no'],'yes','clock semantics'],
 ['D1','Does the player fit between north wall and divider?',{map:r.input.map,radius:.28},['yes','no'],.52>2*.28?'yes':'no','clearance'],
 ['D2','Freeze this robot pose. Is the player detected?',{map:r.input.map,player:m.pos,robot:m.robot,heading:m.heading,rules:complete},['yes','no'],m.seen?'yes':'no','instantaneous ray and cone'],
 ['D3','Does the specified visible patrol detect before action ends? (other patrols ignored)',null,['yes','no'],'yes','motion and swept risk'],
 ['D4','Which listed position is reached by the occluded patrol? Assume its published circuit.',null,[],null,'hidden dynamics given known family'],
 ['D5','Does this action survive both contact and detection?',{...r.input,action:r.c,rules:complete},['yes','no'],'no','joint risk under partial observation; realized outcome only']
])questions.push({id,q,input,options,key,why})
const visible=rows.find(x=>x.micro[0].visible)!,hidden=rows.find(x=>!x.micro[0].visible)
for(const [idx,x] of [[3,visible],[4,hidden??visible]] as const){const cfg=read('results/layout-transfer-1/A-N'+x.n+'-G3-source/metadata.json').job.cfg,b=cfg.patrols.find((z:any)=>z.id===x.killer[0]);questions[idx].input={map:cfg.room,rules:complete,publicCircuit:b,clock:x.start,player:x.input.current.player,action:x.c,observed:x.input.current.robots.filter((z:any)=>z.id===b.id)};if(idx===4){const engine=new Physics(cfg,1),target=engine.robots(Math.round(x.start*100)+100).find(z=>z.id===b.id)!.position;questions[idx].q='Given the published circuit, predict position at current time +1 second.';questions[idx].options=[target,[target[0]+1,target[1]]];questions[idx].key=target}}
for(const j of [3,4]){const a=questions[j].input.action;questions[j].input.action={action:a.action,duration:a.duration};questions[j].input.circuitDefinition='At t=0 phase is a fraction of the full cycle from node 0. Each cyclic leg moves at fixed speed, pauses at its endpoint, then turns over turn seconds along the shortest angle toward the next leg.'}
const multiCfg=read('results/layout-transfer-1/A-N4-G3-source/metadata.json').job.cfg
questions[5].input={map:r.input.map,player:r.input.current.player,time:r.start,action:{action:r.c.action,duration:r.c.duration},publicCircuits:multiCfg.patrols,rules:complete,circuitDefinition:questions[3].input.circuitDefinition}
questions[5].why='Joint risk with explicitly known circuits; an auxiliary information advantage over live G3.'
write('probes-private.json',questions);write('probes-public.json',questions.map(({key,...q})=>q))
const rule=[['坐标与方向','东 +x，南 +z','[east,south] 坐标、北向及 heading 约定','Explicit'],['玩家速度','2.5 m/s','2.5 m/s','Explicit'],['玩家半径','0.28 m','未给','Missing'],['墙体','闭矩形，移动按玩家半径扩张','每局 map.walls 全部边界','Explicit（边界）；Missing（扩张）'],['机器人速度','各巡逻配置独立；观察仅 id/position/heading','未给实时速度或规律','Missing'],['朝向','从东向南，弧度','heading in radians','Explicit'],['视野角/距离','总角 90°；中心距离 ≤5 m','90 degree, 5 m','Explicit'],['接触','机器人半径 0.34 m；扫掠圆心距离 ≤0.62','avoid contact','Missing（半径）'],['遮挡','中心线与任意墙相交含相切则遮挡','unobstructed','Ambiguous'],['发现即失败、无需接触','seen/contact 任一立即终止','avoid contact and … vision','Ambiguous'],['WAIT/MOVE 时巡逻','两者都推进机器人','只明确思考时停止','Ambiguous'],['完整区间检测','每 0.01 秒扫掠接触、采样视野','未给','Missing'],['动作期间观察','只在下一次决策返回更新','每次请求一帧及历史','Ambiguous'],['终局观察者身份','只返回 seen，未标注观察者','终局回执 current.outcome','Missing']]
const table=rows.map(x=>{const m=x.micro;return '|'+[x.n,x.i,x.start+'–'+x.end,x.c.action+' '+x.c.duration,x.killer.join(','),x.input.current.robots.map((b:any)=>b.id).join(',')||'无',m.find(z=>z.visible)?.time??'无',m.some(z=>Math.abs(z.heading-m[0].heading)>1e-6)?'是':'否',m.find((z,j)=>j&&!m[j-1].los&&z.los)?.time??'—',x.blocked,x.candidates.filter(z=>z.outcome==='active').length,'[回执]('+x.file+')'].join('|')+'|'}).join('\n')
fs.writeFileSync('GAME-RULE-AND-FAILURE-AUDIT.md','# 游戏规则与失败审计\n\n逐请求比对实际回复和执行动作。以下可见指模型决策帧；中途状态仅供离线分析。[完整请求、记忆、理由、逐百分秒状态及所有分支](evidence/rule-audit/failures.json)。\n\n|Rule|Simulator Actual Definition|Actual Prompt Description|Explicit / Ambiguous / Missing|Evidence Path|\n|---|---|---|---|---|\n'+rule.map(z=>'|'+z.join('|')+'|[模拟器](src/sim/world.ts) · [真实请求]('+rows[0].file+')|').join('\n')+'\n\n## 二十次终局\n\n|N|尝试|动作起止/失败秒|动作与请求秒数|发现者|决策可见 IDs|发现者首次可见秒|朝向变化|首次离开遮挡秒|此前受阻动作|安全候选/15|原始证据|\n|---|---|---|---|---|---|---|---|---|---|---|---|\n'+table+'\n\n决策时发现者可见 '+rows.filter(x=>x.micro[0].visible).length+'/20；执行期间才可见 '+rows.filter(x=>!x.micro[0].visible&&x.micro.some(z=>z.visible)).length+'/20。有安全替代 '+rows.filter(x=>x.candidates.some(z=>z.outcome==="active")).length+'/20。安全只涉及所选时长；全失败时另存前一决策分支。\n\n## N2 第十次\n\n'+chain.filter(z=>z.time>=8).map(z=>z.time+'–'+z.end+' s：'+z.c+' '+z.action+' '+z.duration+'。模型原话：'+z.reason).join('\n\n').replaceAll('undefined ','')+'\n\n隔断顶端 z=1，北墙内缘 z=0.48，净宽 0.52 m，小于玩家直径 0.56 m。模型拿到了两面墙的边界，但没有玩家半径。最后经验表达的是对发现者与精确几何的不确定；日志没有直接标注发现者，已提供视角和距离。仅靠自述无法确定内部归因。\n\n## 两版提示与单步计划\n\n原文：'+system+'\n\n修正版：'+complete+'\n\n[公开题目](evidence/rule-audit/probes-public.json)和[私有答案](evidence/rule-audit/probes-private.json)分开。先固定题序，以独立会话分别在原说明和修正版下作答；比较版本时使用同一公开题干并替换规则文本。每题每版本一次，共 12 请求；按上轮 ¥20.860088/304 粗估 ¥0.82，非报价。本轮新增请求 0。\n')
const tenth=rows[9],trap=rows.find(x=>!x.candidates.some(z=>z.outcome==='active'))!
fs.appendFileSync('GAME-RULE-AND-FAILURE-AUDIT.md','\n## 关键结论的回执复核\n\n第 7 次已经观察到顶端东移受阻。第十次末次请求实际包含的第七条经验原文为 “'+tenth.input.memory[6].summary.observations+'”。局部受阻事实被保留；摘要没有给出净宽与直径的比较，因此无法将再试直接归因为遗忘。13.30 秒没有可见机器人；13.46 秒 R2 首次与玩家之间出现无遮挡射线，同一子步发现玩家，期间其朝向一直为 π。该帧发生在动作提交之后。\n\n全部 15 个动作均失败的是 N'+trap.n+' 第 '+trap.i+' 次。前一决策仍有 '+(trap.earlier as {outcome:string}[]).filter(z=>z.outcome==="active").length+' 个能活过自身执行期的选项；这不证明这些分支都能通关。\n')
