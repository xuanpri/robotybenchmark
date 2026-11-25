# MultiRobotStealthArena：四块核心信息

> **2026-11-25 勘误（本轮文件整理）：下文是此前接口交接记录，关于“未找到 P/T 实验、ADE/Accuracy 数值”的结论有遗漏，不能当作当前项目状态。results/hint-prediction-pilot-20261125-123433 与 results/temporal-counterfactual-20261125-123924 已有完整请求/响应、输入、真值与指标；缺的是持久化 runner/原计分实现。T 还提供共同无序历史、不同未来的特定反例，但没有通用信息充分性 Oracle。以下导航样本不变。最新说明见 [研究日志](../../RESEARCH_LOG.md)、[当前状态](../../PROJECT_STATUS.md)、[复现](../../REPRODUCE.md)。原版已留在 [整理前快照](../archive/snapshots-before-organization/MULTIROBOT_CORE_INFO.md)。**

核查日期：2026-11-25。项目根目录：`/home/jiaxuanren/interview/MultiRobotStealthArena`。本次仅阅读源码和已有运行证据，未发起新 API 请求，未改动仿真与实验代码。

**先说明版本差异：当前项目是 TypeScript + Three.js 的潜行导航/跨尝试学习环境。源码、脚本、配置和文档中未找到 P1–P5 / T1–T3 预测实验、ADE 或 Accuracy@0.1m 实现。因此不能提供不存在的 T1/T2 实测样本。下面明确区分已有接口、真实导航样本与待实现部分。**

## 1. 目录与模块分工

以下是手动整理的核心三级结构；完整核心文件清单见 [core-tree-L3.txt](core-tree-L3.txt)。大量生成的 results/evidence 不逐个展开。

```text
MultiRobotStealthArena/
├── config/
│   ├── room.json                  # 静态地图、墙、出生点、出口
│   ├── patrols.json               # 每台机器人巡逻节点、速度、停顿、转向、相位
│   ├── case.json                  # 半径、视野、机器人数量、观测和失败条件
│   ├── learning.json              # 学习预算、动作时长、记忆与重置协议
│   ├── local-agents.json          # 本地模型注册
│   └── study/                    # 多场景/混合输入实验配置
├── src/
│   ├── sim/
│   │   ├── config.ts             # Config/Room/Patrol/Action 类型与默认配置
│   │   ├── patrol.ts             # Circuit.at(time) 解析计算机器人轨迹
│   │   ├── world.ts              # Physics.advance、接触与视野检测
│   │   ├── geometry.ts           # 距离、墙相交、移动裁剪
│   │   ├── session.ts            # observe/step/retry、局部过滤、公开历史
│   │   └── oracle.ts             # 特权加权 A* 寻找通关见证
│   ├── learning/
│   │   ├── protocol.ts           # 输入/动作/经验结构及严格 JSON 解析
│   │   ├── agents.ts             # 提示拼装、本地 API、token/记忆裁剪、程序策略
│   │   ├── runner.ts             # 跨尝试学习主循环和日志
│   │   ├── dmx.ts                # 远程 API、持久回执与暂停处理
│   │   └── dmx-pilot.ts           # 真实模型 pilot 流程
│   ├── study/
│   │   ├── scenes.ts             # 地图、数量、巡逻模式组合
│   │   ├── learn.ts              # G3 source/transfer/scratch 与 hybrid 主循环
│   │   └── provider.ts           # API 请求/原始响应归档和恢复
│   ├── view/{scene,render}.ts     # Three.js 场景与独立帧渲染器
│   ├── video/{capture,replay,studio}.ts # 图片、回放时间轴、视频界面
│   └── main.ts                   # 浏览器交互入口
├── scripts/
│   ├── agent.ts                  # JSONL 环境进程入口（不是模型 API runner）
│   ├── learn.ts                  # 通用学习入口，npm run learn
│   ├── dmx-pilot.ts              # 真实模型 pilot 入口
│   ├── study-run.ts              # 多场景 G3 学习/迁移入口
│   ├── hybrid-single.ts          # 单次 text/hybrid、观测模式实验入口
│   ├── oracle.ts                 # npm run oracle 入口
│   ├── rule-audit.ts             # 失败重放、候选动作检查、D0–D5 探针生成
│   ├── study-{verify,behavior,distance,difficulty}.ts # 校验/行为/距离/反事实评测
│   ├── study-report.py / report-dmx.py / stage-stats.py # 汇总报告和统计
│   ├── decision-screenshot.cjs   # 无头浏览器调用图片导出
│   └── video.cjs / encode.py / study-films.py # 录像与编码
├── tests/                        # motion/visibility/episode/rules/learning/study 等测试
├── results/                      # 请求回执、逐动作记录、checkpoint、replay、经验
└── evidence/                     # Oracle、探针公开题/私有答案、场景清单、视频校验
```

**P1–P5/T1–T3 入口：未找到。** 场景 ID 中 A/B/C、N0/N2/N4、P1/P2 分别是布局、机器人数量、巡逻模式；不要直接把 P1/P2 解释成所问的预测实验编号。

评测证据：`results/*/checkpoint.json` 记录 result、first、decisions、closest、remaining；`attempt-*.json` 记录公开决策链和私有真值；`wire/*.json` 保存完整模型请求与原始响应；`replay.json` 保存全知和局部帧。现有画面输出以 Three.js 截图/录像为主，汇总以脚本生成 JSON/Markdown 为主，没有找到所问预测指标的专用画图模块。

## 2. 世界与动力学

### 三个问题的直接回答

1. **多机器人同时运行：Yes。机器人相互碰撞/交互：No，未见机器人–机器人碰撞处理或显式交互 hook。** `robotCount` 限制为 0/1/2/4；各机器人独立按 `Circuit` 运动。已有的是机器人–玩家接触检测、机器人发现玩家、玩家撞墙裁剪，以及巡逻路径不穿墙的初始化校验。
2. **渲染与遮挡/可见性可独立调用：Yes。纯 Node 直接生成 PNG：No。** `observable`、`sees` 是导出纯函数；`ArenaRenderer.render(frame,...)` 不推进世界，`decisionScreenshot(frame,room)` 接收公开帧并返回 PNG data URL，但需要 DOM/WebGL；`scripts/decision-screenshot.cjs` 通过无头 Chromium 封装导出。绘制扇形遮挡的 `footprint` 是 render.ts 内部函数，尚未单独导出。`scene.ts` 使用斜俯视正交相机（不是严格垂直顶视）；图片导出不依赖旧游戏循环。严格顶视需调整相机位置。
3. **固定 dt 推进：Yes；机器人解析 state(t)：也 Yes。** 混合实现：一次 `advance` 最多推进 0.1 秒，内部 10 个 0.01 秒子步；玩家按子步移动/裁剪，接触做相对扫掠检测，视野按子步采样；机器人每个子步调用 `Circuit.at(clock*DT)` 解析求值。失败/通关时提前终止。`clock` 是整数子步索引，公开 `time=clock*DT`。

### 原始配置类型

```ts
import room from '../../config/room.json'
import patrols from '../../config/patrols.json'
import settings from '../../config/case.json'
export type Point = [number, number]
export type Box = [number,number,number,number]
export interface Room {width:number; depth:number; spawn:Point; exit:Point; exitRadius:number; walls:{id:string;box:Box}[]}
export interface Patrol {id:string;nodes:Point[];speed:number;pause:number;turn:number;phase:number;periodSeconds?:number}
export interface Config {
  room:Room; patrols:Patrol[]; robotCount:0|1|2|4; robotRadius:number;playerRadius:number;playerSpeed:number;
  visionDegrees:number;visionRange:number;playerRange:number;failure:'contact'|'vision'|'both';
  observation:'limited'|'omniscient';publishRules:boolean;phaseJitter:number;maxTime:number;maxAttempts:number
}
export function defaults():Config {
  return structuredClone({...settings,room,patrols}) as Config
}
export const actions = ['MOVE_NORTH','MOVE_SOUTH','MOVE_WEST','MOVE_EAST','WAIT'] as const
export type Action = typeof actions[number]
export const direction:Record<Action,Point> = {MOVE_NORTH:[0,-1],MOVE_SOUTH:[0,1],MOVE_WEST:[-1,0],MOVE_EAST:[1,0],WAIT:[0,0]}
```

机器人状态与查询签名：

```ts
export interface Robot {
  id:string; position:Point; heading:number; speed:number;
  node:number; phase:'move'|'pause'|'turn'
}
class Circuit { at(time:number):Robot } // time 单位秒
export interface State {clock:number;player:Point;heading:number;outcome:Outcome}
Physics.robots(clock:number):Robot[] // clock 是子步索引
Physics.advance(state:State, action:Action):State
```

默认世界参数（真实 config/case.json）：

```json
{"robotCount":4,"robotRadius":0.34,"playerRadius":0.28,"playerSpeed":2.5,"visionDegrees":90,"visionRange":5,"playerRange":6,"failure":"both","observation":"limited","publishRules":false,"phaseJitter":0,"maxTime":90,"maxAttempts":1}
```

一台机器人配置（来自 config/patrols.json）：

```json
{
  "id": "R1",
  "nodes": [
    [
      3.1,
      6.2
    ],
    [
      3.1,
      10.3
    ]
  ],
  "speed": 1.05,
  "pause": 0.55,
  "turn": 0.8,
  "phase": 0.65
}
```

静态世界完整配置见 `config/room.json`：24×16 m，spawn=[1.5,8.5]，exit=[12.5,1.5]，exitRadius=0.64，墙为闭矩形 `[xmin,zmin,xmax,zmax]`。

### step 的核心原文

```ts
  advance(state:State,action:Action):State{
    if(state.outcome!=='active')throw Error('Episode has ended')
    if(!actions.includes(action))throw Error('Unknown action')
    const d=direction[action],cfg=this.cfg,delta:Point=[d[0]*cfg.playerSpeed*DT,d[1]*cfg.playerSpeed*DT]
    let {clock,player}=state,old=this.robots(clock)
    const heading=action==='WAIT'?state.heading:Math.atan2(d[1],d[0])
    for(let part=0;part<PARTS;part++){
      const next=action==='WAIT'?player:move(player,delta,cfg.room,cfg.playerRadius),bots=this.robots(++clock)
      let outcome:Outcome='active'
      for(const [i,bot] of bots.entries()){
        if(cfg.failure!=='vision'&&touches(player,next,old[i].position,bot.position,cfg.robotRadius+cfg.playerRadius)){outcome='contact';break}
        if(cfg.failure!=='contact'&&sees(bot,next,cfg)){outcome='seen';break}
      }
      if(outcome==='active'&&distance(next,cfg.room.exit)<=cfg.room.exitRadius)outcome='escaped'
      if(outcome==='active'&&clock>=Math.round(cfg.maxTime/DT))outcome='timeout'
      if(outcome!=='active')return {clock,player:next,heading,outcome}
      player=next;old=bots
    }
    return {clock,player,heading,outcome:'active'}
  }
}
```

### 可独立调用的观测/视野函数

```ts
export function observable(player:Point,target:Point,cfg:Config){
  return distance(player,target)<=cfg.playerRange && wallHit(player,target,cfg.room)===Infinity
}
export function sees(robot:Robot,player:Point,cfg:Config){
  const dx=player[0]-robot.position[0],dz=player[1]-robot.position[1],d=Math.hypot(dx,dz)
  return d<=cfg.visionRange && (d<1e-9 || dx*Math.cos(robot.heading)+dz*Math.sin(robot.heading)>=d*Math.cos(cfg.visionDegrees*Math.PI/360)-1e-10) && wallHit(robot.position,player,cfg.room)===Infinity
}
```

会话接口 `createSession(seed=1, config=defaults())` 返回 `observe()`、`step(action)`、`view(mode)`、`retry()`、`getGroundTruth()`。`view('limited')` 过滤机器人，`view('omniscient')` 返回全部机器人。公开 sighting 只含 id/position/heading，不含 speed/node/phase。session.history 最多 16 帧；学习 runner 的 history 是另一套公开决策链，G3 默认取最近四条。

## 3. 完整真实输入输出（导航替代样本，并非 T1/T2）

来源：`results/layout-transfer-1/A-N2-G3-source/wire/2-act-4-0.json`。

已有回执：HTTP 200；模型 `gpt-5.6-sol-2026-07-09`；响应结束原因 `stop`。第二次尝试第 4 次决策，有 3 条当前历史和 1 条先前尝试摘要。

完整可机读文件：[请求 body](actual-navigation-request.json)、[原始响应 envelope](actual-navigation-response.json)、[User JSON 的格式化副本](actual-navigation-context.json)。请求副本保留原 User content 字符串；下面直接贴出两个 prompt，未省略字段。

### System Prompt（原文）

```text
Reach the green exit safely. Coordinates [x,z] in meters; east increases x, south increases z. Walls are [xmin,zmin,xmax,zmax]. Heading in radians from east toward south. Movement is cardinal at 2.5 m/s until blocked; WAIT holds position. Avoid patrol contact and unobstructed 90 degree, 5 m patrol vision. Only nearby unobstructed patrols are shown. The clock stops during decisions. Choose one listed action and duration. Return plain JSON {"action":"...","duration":0.5,"reason":"short English reason"}.
```

### User Prompt（原始字符串，未重新格式化）

```text
{"map":{"width":24,"depth":16,"spawn":[1.5,8.5],"exit":[12.5,1.5],"exitRadius":0.64,"walls":[{"id":"north","box":[0,0,24,0.48]},{"id":"south","box":[0,15.52,24,16]},{"id":"west","box":[0,0.48,0.48,15.52]},{"id":"east","box":[23.52,0.48,24,15.52]},{"id":"records","box":[2.2,4.4,5.6,5.25]},{"id":"divider","box":[8,1,8.9,5]},{"id":"spine","box":[9.3,6.7,13.9,7.6]},{"id":"east-baffle","box":[16.1,7.5,23.52,8.45]},{"id":"west-elbow","box":[4,8.7,4.9,12.85]},{"id":"west-foot","box":[4.9,11.95,8,12.85]},{"id":"east-elbow","box":[10.8,13.65,14.6,14.55]},{"id":"east-foot","box":[13.7,10,14.6,13.65]},{"id":"lower-divider","box":[21,11.65,22,15.52]}]},"goal":[12.5,1.5],"current":{"time":2,"player":[0.7600000025,8.5],"heading":3.141592653589793,"outcome":"active","robots":[{"id":"R1","position":[3.1,6.5447500000000005],"heading":-1.5707963267948966}]},"hp":90,"attempt":2,"remaining":{"actions":57,"time":88,"attempts":9},"legal":["MOVE_NORTH","MOVE_SOUTH","MOVE_WEST","MOVE_EAST","WAIT"],"durations":[0.2,0.5,1],"history":[{"before":{"time":0,"player":[1.5,8.5],"heading":0,"outcome":"active","robots":[{"id":"R1","position":[3.1,8.644750000000002],"heading":-1.5707963267948966}]},"choice":{"action":"MOVE_WEST","duration":0.5,"reason":"Hug the west wall to widen distance from R1's northward vision cone."},"after":{"time":0.5,"player":[0.7600000025,8.5],"heading":3.141592653589793,"outcome":"active","robots":[{"id":"R1","position":[3.1,8.11975],"heading":-1.5707963267948966}]},"feedback":"active"},{"before":{"time":0.5,"player":[0.7600000025,8.5],"heading":3.141592653589793,"outcome":"active","robots":[{"id":"R1","position":[3.1,8.11975],"heading":-1.5707963267948966}]},"choice":{"action":"WAIT","duration":1,"reason":"Stay behind R1 while it faces north; wait for its patrol heading to change."},"after":{"time":1.5,"player":[0.7600000025,8.5],"heading":3.141592653589793,"outcome":"active","robots":[{"id":"R1","position":[3.1,7.069750000000002],"heading":-1.5707963267948966}]},"feedback":"active"},{"before":{"time":1.5,"player":[0.7600000025,8.5],"heading":3.141592653589793,"outcome":"active","robots":[{"id":"R1","position":[3.1,7.069750000000002],"heading":-1.5707963267948966}]},"choice":{"action":"WAIT","duration":0.5,"reason":"Remain safely behind R1 while waiting for it to turn away from the north corridor."},"after":{"time":2,"player":[0.7600000025,8.5],"heading":3.141592653589793,"outcome":"active","robots":[{"id":"R1","position":[3.1,6.5447500000000005],"heading":-1.5707963267948966}]},"feedback":"active"}],"memory":[{"layout":"A","attempt":1,"result":"seen","summary":{"observations":"Moving north along the west edge was safe until time 1.4 at (1.0,5.5); R1 was moving north near x=3.1.","failure":"The final 1-second north move triggered 'seen' at time 1.7 near (1.0,4.75), with R1 near (3.1,6.86).","next":"Hypothesis: avoid continuing north while R1 faces north; wait behind cover or move south until its heading changes, then advance in short 0.2-second steps.","uncertainty":"R1's vision range, cone width, and patrol-turn timing are unknown."}}]}
```

### 模型真实输出

```json
{"action":"WAIT","duration":1,"reason":"Stay safely behind R1 until it reaches the records wall and turns away."}
```

### Hint/历史如何序列化

没有独立的 T1/T2 Hint schema。当前 runner 用 `JSON.stringify(task)` 将 `history` 与 `memory` 放进同一条 user 文本：history 含 before/choice/after/feedback；memory 含 layout/attempt/result/summary，summary 为 observations/failure/next/uncertainty。G3 当前尝试默认最近四条，反思请求用完整公开决策链；跨尝试传递摘要。本样本是 text 模式，没有图片。

Hybrid 模式同一条 user content 是以下数组，文本仍携带历史，图片只导出当前公开帧，没有把每条历史分别渲染为图片：

```ts
messages[1].content = [
  {type:'text', text:JSON.stringify(task)},
  {type:'image_url', image_url:{url}} // data:image/png;base64,...
]
```

现有 hybrid 证据可查看 `results/hybrid-A-N1-001/wire/1-act-1-0.json` 与 `decision-1.png`；完整 base64 不贴进本文。

### 输出约束和实际解析逻辑

没有 API 层 JSON schema/response_format 强制约束；靠 prompt 和 `JSON.parse` 后的手写字段验证。动作集合为四方向 + WAIT，duration 必须属于当次合法时长列表。本样本合法列表见 User Prompt。字段 reason 可选，且必须为 string；拒绝额外字段；不接受 Markdown code fence，也没有正则容错解析。

```ts
export interface Choice {action:Action;duration:number;reason?:string}
export function parseChoice(text:string,s:Settings):Choice{
  const obj=JSON.parse(text)
  if(!obj||!actions.includes(obj.action)||!s.durations.includes(obj.duration)||Object.keys(obj).some(k=>!['action','duration','reason'].includes(k))||(obj.reason!==undefined&&typeof obj.reason!=='string'))throw Error('invalid_response')
  return obj
}
```

注意：校验器没有要求字段 reason 必填，虽然当前 study system 的示例写了它。

### 单轮还是多轮

**实验包含连续多步决策和跨尝试记忆，但 API messages 不维护标准 user/assistant 对话历史。** 每次请求重新构造 `[system, user]`，历史作为 user JSON 中的 history/memory 传入。`Messages` 类型只列 system/user，未包含 assistant。`provider(dir,...):Ask` 接收任意给定 messages，不替调用方追加聊天记录。要做“模型看完新 Hint 后继续上一轮对话”，需要增加 assistant 轮次及其持久化/重建，或延续当前每轮重建上下文的设计。

API runner：本地 `src/learning/agents.ts::complete`；真实远程请求 `src/study/provider.ts::provider` 与 `src/learning/dmx.ts`。解 envelope 后读取 `choices[0].message.content`，随后 `parseChoice`；记录 raw、usage、model、latency、status。`scripts/agent.ts` 则仅负责环境 JSONL 的 observe/step/retry，不是 LLM API 调用器。

## 4. 评测与 Oracle 校验

### ADE / Accuracy@0.1m

**当前未找到实现，也未找到轨迹预测数组的输入/输出约定。** 现有 `distance(a,b)` 是二维欧氏距离，不能把导航到出口距离当作 ADE。`src/study/learn.ts::progress()` 主要记录：终局 outcome、首次成功尝试 first、决策数、最近/最终到出口欧氏距离 closest/remaining、等待次数、HP 和记忆字节数。`scripts/study-distance.ts` 另用 0.25 m 网格计算考虑静态墙体的到出口路径距离，排除动态巡逻。

如果后续接预测任务，通常需要先固定 robot ID 与预测时刻对齐，再定义：`ADE = mean(||prediction[id,t]-truth[id,t]||₂)`；`Accuracy@0.1m = mean(||prediction[id,t]-truth[id,t]||₂ <= 0.1)`。这只是待实现的指标建议，**不是当前项目已有函数**；还需明确缺失预测、无效输出和多机器人聚合口径。

### 已有 Oracle 入口与含义

```ts
export function oracle(seed=1, cfg:Config=defaults(), limit=90000)
// 返回 {strategy,seed,expanded,actions:Action[],time}
// 找不到见证或达到 limit 会抛错；不证明不存在解。
```

实现：`src/sim/oracle.ts`。特权读取完整巡逻配置，按真实 `Physics.advance` 展开 MOVE/WAIT；每边聚合四个相同动作，用 time-aware weighted A* 寻找成功路线。它是可行性见证，源码明确不承诺完备或最优。已有真实 `evidence/oracle-seed-1.json`：seed=1，expanded=429，附完整动作序列。

程序接口可直接用于真值生成和重放：

```ts
const p = new Physics(cfg, seed)
const s0 = p.initial()
const next = p.advance(s0, 'WAIT')
const robots = p.robots(Math.round(targetTime / DT))
// 或 p.loops[i].at(targetTime)，后者直接按秒查询
const visible = observable(player, robots[0].position, cfg)
const detected = sees(robots[0], player, cfg)
```

### 信息充分性检查草稿：已有相关探针，但没有通用充分性 Oracle

`scripts/rule-audit.ts` 重建真实决策，断言公开输入/模型动作/仿真结果吻合；检查终局时全部 5×3 个动作-时长候选是否存活，并导出逐 0.01 秒的 LOS/可见性/发现状态。生成 D0–D5：时间语义、几何通行、瞬时发现、动作期间发现、遮挡机器人未来位置、联合风险。

已有输出：`evidence/rule-audit/probes-public.json`（无 key）、`probes-private.json`（含 key）、`prompts.json`（原规则与补全规则）、`failures.json`（完整审计）。D4 给出 publicCircuit 和相位约定，使用 `Physics.robots(round(start*100)+100)` 查询一秒后的真实坐标，再设置候选答案；D5 也显式提供全部巡逻配置。这些题额外公开了动力学信息，不能等同原导航观察条件。

**尚无代码枚举“与当前观测/Hint 一致的多个世界”，再检查它们是否给出相同未来答案。** 因此现在只能做给定完整配置下的真值/可行性校验，不能程序化证明局部历史对预测足够。运行文档中 D0–D5 被描述为计划；题目生成文件存在不代表模型答题实验已经完成。

## 对改动成本的直接判断

- 世界、视野和帧渲染已拆分，新增预测采样可复用；导出图片仍需要浏览器/WebGL。
- 若探针需要机器人彼此反应或碰撞，独立解析 Circuit 需扩展成带联合状态的动力学，不能只换提示。
- T1/T2 的输入/Hint/预测输出、ADE/阈值指标、信息充分性 Oracle 当前都需要新建；现有日志归档、模型调用和 JSON 验证模式可复用。
