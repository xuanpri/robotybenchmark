# 自主 Agent、失败记忆与实验录像

## 观看或重新执行

在项目目录执行以下命令。本机使用现成的 Node 环境。

```bash
cd /home/jiaxuanren/interview/MultiRobotStealthArena
export PATH=/home/jiaxuanren/miniconda3/envs/codex-env/bin:$PATH
npm run dev
```

打开 <http://127.0.0.1:5186/studio.html>。SSH 环境转发 5186 端口。默认是四机器人巡逻，点击 **Play**；**Open replay** 选择任一实验目录中的 replay.json，可切换尝试、拖动时间条，以及选择全知、局部、左右分屏和两种时间模式。工作台在本地浏览器读取选中的文件。游戏页的 Replay studio 链接可进入同一入口。

```bash
npm run learn -- config/learning.json results/my-learning-run
node --import tsx scripts/verify-learning.ts results/my-learning-run
npm test
npm run build
```

默认是可在 CPU 上运行的目标导向启发式。要精确复现本轮配对对照，使用 config/pilots 中对应 JSON。重复使用同一输出目录和相同配置会恢复已有实验。要新开独立记录，请给新目录名。

## 模型与策略

| Agent ID | 决策来源 |
|---|---|
| random | 使用独立、可复现的策略随机数，从同一合法动作与时长集合均匀抽取。不同尝试可走不同路线。 |
| heuristic | 公开地图上的一步目标距离、墙体净空、可见巡逻、近期位置和失败经验。M2 摘要由策略自身基于公开失败生成。 |
| mock / invalid-mock | 预定东移动作 / 故意无效输出，供接口测试。 |
| oracle | 私有时空搜索，把相邻相同的基础动作编为合法决策时长。 |
| replay | 仅读取已有动作。replayFile 可以是旧 Oracle witness JSON，或新 actions.jsonl；后者可用 replayAttempt 指定尝试。 |
| local-1.7b / local-8b / local-gpt-oss-20b / qwen-local | OpenAI-compatible 本机服务，按登记的模型 ID、部署版本和推理模式发请求。 |

[本机登记表](config/local-agents.json) 从 PatrolBench 的本地配置选取。适配器限定 HTTP 回环地址，禁用重定向，Qwen 请求显式关闭 Thinking，gpt-oss 请求低推理预算。需要服务支持 vLLM 的 /tokenize 和 /v1/chat/completions；缺少计数或模型身份不符均有错误记录。仅当现有服务和资源合适，可用 `npm run learn -- config/local-smoke.json results/local-smoke-01` 验证两次决策。当前交付未执行该命令。单元测试的模拟 HTTP 传输只产生临时测试记录。

## 世界与预算

[LearningWorld](src/learning/protocol.ts) 直接封装已有模拟器，提供 reset(seed, config)、observe()、step(choice, onTick)、get_public_history() 和评测端 get_private_evaluation()。公共输入包括地图、当前时刻和位置、出口、HP、尝试编号与剩余预算、可见巡逻者、动作与此前允许反馈。策略接收序列化公开对象。外部 Agent 应独立进程运行并仅接收该对象；调试工作台、项目文件系统和私有日志限评测人员访问。本地 Vite 开发服务拒绝直接读取 results 目录。

决策时长必须是 0.1 秒的整数倍。默认允许 0.1、0.2、0.5、1 秒。World Simulator 在每个 0.1 秒内继续做十个 0.01 秒检查。终止即截断当前动作，日志分别保存请求时长与实际起止时间。推理和反思不会调用世界的 step。

默认探索 HP 100，一次失败消耗 10，最多十次，首次成功即停止。动作上限、世界超时、token 预算超限、无效回答、截断、拒答、服务故障和不确定的中断都有单独原因，均消耗当前尝试及一次 HP；反思失败只记录摘要错误。未知用量的模型调用结束该尝试，跳过该尝试的后续模型反思。每次尝试的 token 上限涵盖决策和反思的输入与输出；先按模型 tokenizer 预检，再按服务 usage 对账。所有输出组织为显式 JSON；解析错误终止尝试。

Same 保持世界初始状态。PhaseShift 改变相位；FreshDynamics 改变速度和停顿。转移由实验 seed 与试次索引确定。探索首次成功后，三次 Mastery 均重置到成功时的世界，然后分别测试相位和动力学迁移。验证阶段使用独立行动预算与 HP，冻结探索终点记忆；不同验证试次不会互相写入记忆。未解锁的指标是 null。

## 记忆解释

- M0 清除跨尝试经历，保留必要的 HP、试次及剩余预算。
- M1 从之前真正执行的公开 turn 中选连续后缀，包括前后观察、动作、请求时长和反馈。
- M2 每次探索尝试结束，调用同一 Agent 生成 observations、failure、next、uncertainty 四个字符串。解析失败不补写。验证阶段只读。程序化摘要是显式规则的产物。
- 在预算内保留尽可能多的完整尾部记录。每次请求记录记忆长度、丢弃条数和当前历史裁剪数。真实模型使用部署 tokenizer，程序化策略用序列化 UTF-8 字节作可复现容量单位，模型 token 用量为零。相同上限不保证相同实际输入长度。每次决策附带的本尝试历史默认最多四条。
- 验证成功率、成功动作序列精确复现率分别计算。失败重复率是第一次失败之后，当前失败再次出现先前尝试终止类型的比例（分母为后续失败次数）；该统计不要求在相同位置失败。区域覆盖以 4 m × 4 m 网格记，剩余距离为到出口中心的欧氏距离。

## 日志与恢复

每个实验产生 metadata.json、requests.jsonl、actions.jsonl、observations.jsonl、memory.jsonl、events.jsonl、private_ground_truth.jsonl、replay.json、summary.json。公开决策与反思使用同一审计机制。真实调用的请求体、原始响应、解析文本、状态、token 和耗时在 requests 中；无凭据字段。private_ground_truth 包含每个基础动作结束时及提前终止时的真实位置、朝向和阶段。replay 是评测人员持有的私有衍生文件，同时保留当时允许的可见投影。

Linux CLI 使用 flock 防止并发写同一实验。journal 在发出决策前保存意图，收到回复后先保存响应，再执行仿真；尝试完成后封存。恢复时按已保存回答重演当前未封存尝试。仅有意图的调用标记 interrupted_request_unknown，避免二次推理。已封存尝试直接读取，最终日志以不覆盖方式发布。软件或配置变化导致记录不一致时会显式报错。summary.json 是实验完成标志。

```bash
node --import tsx scripts/compare-learning.ts results/pilot-{heuristic,random}-M{0,1,2} results/pilot-oracle-verification
```

该命令以相同世界、seed、预算、协议与记忆条件配对随机和目标导向基线，缺少匹配时输出 null。当前单世界试验不估计总体置信区间。

## CPU 录像

[演示源](scripts/demo.ts) 通过 Physics 的真实巡逻时间函数生成四十秒轨迹，隐藏玩家以完整观察每条巡逻路径。Oracle 两条演示逐基础动作调用现有模拟器。所有影片均由同一个 ArenaRenderer 绘制。查看 [回放及影片目录](evidence/videos) 和每个 MP4 对应的 .mp4.json。配置随每段回放存储，seed 为 1；两条 Oracle 演示的动作源是 [原始 witness](evidence/oracle-seed-1.json)。

本机已具备 esbuild、Puppeteer、Chromium/SwiftShader 和 OpenCV 的 FFmpeg 后端。以下示例写入新的导出目录。换机可提供等价依赖，用 CHROME_BIN 指向本地 Chromium；VIDEO_PYTHON 需要 cv2 和 numpy。编码器是 CPU MPEG-4 Part 2 的 MP4，可用 VLC/mpv 播放。浏览器也可以直接用工作台播放 replay.json。

```bash
export NODE_PATH=/tmp/patrolworld-browser-check/node_modules
export VIDEO_PYTHON=/home/jiaxuanren/miniconda3/envs/opsd/bin/python
npm run demo
for name in scene_demo oracle_success oracle_without_wait; do
  npm run video -- evidence/videos/$name.replay.json exports/$name.mp4 omniscient simulation
done
npm run video -- results/pilot-film-mock/replay.json exports/mock.mp4 split simulation parts
npm run video -- results/pilot-film-mock/replay.json exports/mock-wall.mp4 limited wall-clock
```

三种布局共享同一个时间索引。右侧机器人、视野扇形与阴影取自该时刻允许的局部帧。两次模型请求之间的画面展示此刻允许看见什么，不会向模型额外发送观察。实验轨迹按基础动作采样，结尾含精确终止时刻；输出 30 fps，采样间保持上一真实状态。simulation 去除决策等待；wall-clock 在同一模拟时刻保留实测决策流水线与反思时延。两种时间模式的终局均留 0.8 秒反馈及 0.8 秒结算阅读时间，重置时血量继承。完整片长还包括这些标注停帧。

带 parts 选项时合辑和独立尝试片在一次渲染中编码，保存成功后再发布。已存在的合辑会拒绝覆盖。新的出口路径可避免与已有影片冲突。[逐片校验脚本](scripts/check-films.py) 检查帧数、分辨率、同步拼接和跨尝试血条。
