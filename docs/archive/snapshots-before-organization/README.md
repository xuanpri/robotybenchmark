# Multi-Robot Stealth Arena

独立的 Three.js + TypeScript 潜行关卡。青色玩家从左侧入口出发，避开四台暗红色巡逻机器人，进入北墙绿色标志下的地面目标区。

![全知视图实机截图](evidence/omniscient.png)

## 打开与操作

本机已准备项目依赖。在当前服务器的终端运行以下命令。

```bash
cd /home/jiaxuanren/interview/MultiRobotStealthArena
export PATH=/home/jiaxuanren/miniconda3/envs/codex-env/bin:$PATH
npm run dev
```

打开 <http://127.0.0.1:5186/>。如果浏览器在自己的电脑、项目在 SSH 服务器，先在编辑器的 Ports 面板转发服务器的 **5186** 端口，再打开转发地址。也可以在本机执行 `ssh -L 5186:127.0.0.1:5186 用户名@服务器`。服务已运行时可直接打开。其他机器使用带 npm 的 Node.js（本机验收版本 26.13.1），在项目目录先执行 `npm ci`。

点击 **Start**，用 WASD 或方向键移动，松开即原地等候。W/↑ 指向地图北墙，D/→ 沿横墙向东。多键按下时采用最后按下的方向。**Pause** 暂停，暂停时按住方向键点击 **Step** 可只走一个动作；不按方向键即等待一步。**Reset** 重新开局。0.5×、1×、2× 改变播放速率。切离页面自动暂停。

| 模式 | 画面与权限 |
|---|---|
| Omniscient | 固定倾斜正交镜头，显示整张地图与所有机器人。 |
| Limited | 保留同一镜头。只绘制处于玩家 6 m 全向观察距离且视线畅通的机器人。离开视野即移除模型、阴影及视野扇形。 |
| Debug | 可切换巡逻线、路径点、运动阶段、玩家视域、视线和碰撞边界。视线连线颜色分别表示可见、被墙遮挡和超出距离。 |

三个模式均可切换 **Vision**。默认关闭，打开后扇形按墙角及边界裁切。

## 视频参考与地图

以《巴别塔圣歌.mp4》（1024 × 720，30 fps）约 4.8、19.1、28.6 秒画面核对房间。重排了原草图中的右墙和出口，改用水平并列的中央短墙和右侧长墙，左上短墙和纵向隔断，朝向相反的下方两组 L 墙，以及右下短隔断。外围保留切开的低前墙与竖向洋红灯柱，粗网格地砖和高处斜光帮助辨认墙后空间。角色、材质、图案和模型均在本项目中程序化绘制。相机、尺寸与巡逻参数是基于视频构图的近似设计。

| 文件 | 用途 |
|---|---|
| [config/room.json](config/room.json) | 米制 24 × 16 房间、入口、出口、九段内部掩体和四面外墙。矩形依次为 xmin、zmin、xmax、zmax，前四项为 north、south、west、east。 |
| [config/patrols.json](config/patrols.json) | 四条有序闭合路线。R1 左侧往返、R2 上方多点循环、R3 绕中央墙、R4 在右下相邻通道折返。 |
| [config/case.json](config/case.json) | 人数、速度/半径、视域、失败规则、观察权限、运动规律开关、seed 相位扰动、时限和重试上限。 |
| [src/sim](src/sim) | 几何、确定性巡逻、固定步长状态转移、权限过滤和私有 Oracle 搜索。无浏览器或渲染依赖。 |
| [src/view](src/view) | 正交相机、模型、投影、墙体裁切视域及场景渲染。 |
| [src/main.ts](src/main.ts) | 真人控制、时钟累积和基于已公开帧的显示插值。 |
| [scripts/agent.ts](scripts/agent.ts) | Agent 的标准输入/输出 JSONL 进程边界。 |

## 仿真与配置

基本动作是 MOVE_NORTH、MOVE_SOUTH、MOVE_WEST、MOVE_EAST、WAIT，每步 0.1 模拟秒，默认玩家速度 2.5 m/s。引擎在每个 0.01 秒子步推进全体机器人，在整段玩家位移上按角色半宽膨胀墙体做线段碰撞，按相对运动线段检查圆形接触。视觉判定在初始状态和各子步执行圆锥角度、距离与墙体视线相交检测；其时间分辨率为 10 ms。触发失败或进入终点即在该子步结束动作。终局时间可能落在 0.1 秒刻度之间。

- `failure` 取 `contact`、`vision`、`both`，默认两者均判负。默认视野总角 90°、半径 5 m。
- `robotCount` 取 1、2、4，选用配置中的前 N 条路线。每条路线独立设置节点、速度（m/s）、端点停顿与转向（秒）、初始相位（占周期的比例）。给定节点和相位确定起始位置。默认周期为总路程/速度加每个端点的停顿与转向；可设 `periodSeconds` 延长周期，追加时间在返回首节点时等待，保留原行走速度。穿墙路线在初始化时即报错。
- `phaseJitter` 默认 0；大于 0 时种子控制各机器人相位偏移，幅度单位为周期比例。`maxTime` 默认 90 秒。`maxAttempts` 默认 1，配置额外次数后由评测端显式 retry，清空历史并还原同一初始世界。
- `observation` 默认为 limited，`publishRules` 默认关闭。主动公开规律时仅给出配置路线、速度、停顿、转向及配置的周期，当前内部阶段、种子和相位始终由评测端保存。

## Agent 与无头验收

宿主通过 `createSession(seed, config)` 持有 `reset(seed, config)`、`observe()`、`step(action)`、`retry()` 和 `getGroundTruth()`。对策略仅传递 `session.agent` 的 observe/step。公开观察含时间、状态、玩家位置与朝向、合法动作、公开地图与目标、当前可见机器人和最近 16 个公开采样。调用 observe 不追加重复采样，真实推理耗时不会推进世界。UI 的 `ArenaRenderer.render(...)` 仅读取画面数据。浏览器用于本地人类游玩和检查；独立评测用 JSONL 子进程，只将 stdout 的公开消息交给 Agent，不分发调试页面、私有配置、进程句柄或源码读取工具。

```bash
npm test
npm run build
npm run oracle -- 1
printf '%s\n' '{"op":"observe"}' '{"op":"step","action":"WAIT"}' | npm run --silent agent -- 1
```

同一条长驻 JSONL 进程代表一次评测，逐行发送请求。每行返回 ok 和 observation，或 ok=false 和错误原因。宿主启动新的进程可重置 seed；受次数限制的重试使用 `{"op":"retry"}`。非法操作不会代替执行默认动作。

## 验收记录

- [自动测试记录](evidence/tests.txt) 覆盖墙体碰撞、巡逻净空与周期、双向遮挡、动作中途发现、隐藏后持续运动、观察隔离、seed 重放、重试及时限。
- 几何搜索分别封住穿过地图中线的北侧或南侧通路，两种约束都可达出口。动态搜索使用真正的四机器人、双失败规则与相同的动作转移函数。
- **Oracle** 使用完整未来巡逻做时空加权 A*，以四个同类基础动作为搜索边，成功时逐动作回放。seed 1 扩展 429 个状态，118 个基础动作（含 32 次 WAIT），11.75 秒抵达终点。保持空间路线并删除这些 WAIT，玩家于 1.01 秒被发现。该结果是默认实例的可解性见证，仅作为私有验收基线。[可回放动作列表](evidence/oracle-seed-1.json)
- 1440 × 900 Chromium WebGL2 实查三个视图、操作按钮和逐步推进。[浏览器记录](evidence/browser-check.json) · [局部视图截图](evidence/limited.png) · [调试视图截图](evidence/debug.png)
- 可选复核脚本为 `scripts/browser-check.cjs`。运行 Vite 后，用可解析 puppeteer-core 的 Node 环境执行该脚本；设置 CHROME_BIN 指向 Chromium，或使用已安装的 @sparticuz/chromium。正常游玩和无头评测不需要浏览器自动化依赖。

## 自主 Agent 与失败学习实验

打开 [Replay Studio](http://127.0.0.1:5186/studio.html) 可播放巡逻演示或在本机打开实验 replay.json。CPU 无头 Runner、HP、记忆条件、重试迁移、断点恢复与录像导出命令见 [实验使用说明](LEARNING.md)。本轮实测结果及资源条件见 [研究报告](LEARNING-REPORT.md)。

## DMXAPI 真实远程 Agent

远程 Agent `dmx-gpt-5.6-sol` 有独立的共享计费账本。凭据从 DMXAPI_API_KEY、DMXAPI_BASE_URL 环境变量读取。运行需要已有授权和匹配的额度。以下命令复用账本中相同的已完成回答；已完成阶段直接返回。真实基线和实验解释见 [首轮报告](REAL-AGENT-PILOT.md)。

```bash
npm run learn -- config/dmx-pilot.json results/real-dmx-pilot/smoke
npm run learn -- config/dmx-pilot.json results/real-dmx-pilot/A
npm run learn -- config/dmx-pilot.json results/real-dmx-pilot/B
```

全部初次调用、网络重试、失败请求、反思和可选复验先持久化占用配额。冒烟上限 5，A、B 与复验共用 200。已知服务故障排除后，可设置 DMX_RESUME_KNOWN_FAILURE=1 再执行对应未完成阶段，原上限继续生效。仅有发送意图且状态不确定的请求暂停等待核对。不要删除 wire 账本来重置配额。离线生成中间回放可执行 `node --import tsx scripts/dmx-checkpoint.ts B`。

## 多布局压缩经验学习实验

三张地图、15 个可复现场景和 Oracle 可解性检查见 [场景登记表](SCENE-REGISTRY.md)。运行 `npm run dev` 后打开 [本机回放工作台](http://127.0.0.1:5186/studio.html)，在 Scene registry 中切换场景；实验可用 Open replay 加载本地 `results/layout-transfer-1/<任务>/replay.json`。

[实验协议](EXPERIMENT-PROTOCOL.md) · [综合研究报告](MULTI-SCENE-LEARNING-STUDY.md) · [视频与截图](VIDEO-INDEX.md) · [逐请求费用与模型版本](results/layout-transfer-1/usage.csv)。从已完成的回放生成视频和分析不会调用模型。
