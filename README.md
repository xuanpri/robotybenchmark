# Multi-Robot Stealth Arena

TypeScript + Three.js 的确定性多机器人潜行环境，以及基于该环境开展的导航、失败记忆、布局迁移和 **Hint-based Future Prediction** 研究。当前已有 P0–P5、T1–T3 的真实模型输入输出与指标；它们是独立的一维先导案例，尚未接入多机器人导航评测。

研究入口：[当前状态](PROJECT_STATUS.md) · [研究迭代日志](RESEARCH_LOG.md) · [复现与数据路径](REPRODUCE.md) · [阶段归档](docs/archive/README.md) · [文件分类](docs/FILE_ORGANIZATION.md)。更新日期：2026-11-25。

## 目录

```text
MultiRobotStealthArena/
├── src/
│   ├── sim/          # 配置类型、几何、解析巡逻、动力学、局部观测、通关 Oracle
│   ├── learning/     # 策略/API、记忆协议、重试及真实模型 pilot
│   ├── study/        # 多布局场景、学习循环、持久化 API 回执
│   ├── view/         # Three.js 场景与斜俯视正交渲染
│   ├── video/        # 已存帧回放、截图与视频采集
│   └── main.ts       # 浏览器交互入口
├── config/           # 地图、巡逻、世界/模型配置
│   ├── pilots/       # 程序化策略、Oracle、Mock/Replay 配置
│   └── study/        # G3、多场景、hybrid 单次配置
├── scripts/          # 实验入口、离线分析、校验、报告、视频导出
├── tests/            # 动力学、权限、学习、场景等测试源码
├── results/          # 分实验原始配置快照、请求响应、日志、结果及视频
├── evidence/         # 环境验收、场景登记、失败审计、视频及校验记录
├── docs/
│   ├── archive/      # 八阶段索引、整理前清单、重复清单、文档快照
│   ├── core-info/    # 接口整理与真实导航请求示例，附本轮勘误
│   └── FILE_ORGANIZATION.md
├── README.md / RESEARCH_LOG.md / PROJECT_STATUS.md / REPRODUCE.md
└── 历史研究报告.md    # 保留原路径，统一在阶段归档中索引
```

`node_modules/` 是依赖，`dist/` 是构建产物，均未扫描内容或清理。原实验目录没有搬迁，脚本中固定路径继续有效。日志和视频保留在所属实验内，保持请求—动作—回放的对应关系。

## 打开与操作

以下命令供后续使用，本轮整理未执行安装、启动或实验。

```bash
cd /home/jiaxuanren/interview/MultiRobotStealthArena
export PATH=/home/jiaxuanren/miniconda3/envs/codex-env/bin:$PATH
npm run dev
```

打开 <http://127.0.0.1:5186/>；远程服务器需转发 5186 端口。新环境先 `npm ci`，Node 需支持 `--import tsx` 和测试脚本所用选项，依赖版本以 `package-lock.json` 为准。历史文档记载验收 Node 26.13.1，本轮未重新核验。

Start 开始，WASD/方向键移动，松开等待；Pause/Step/Reset 控制推进。Omniscient 显示全体机器人，Limited 仅显示玩家 6 m 内无遮挡机器人，Debug 可显示路径与边界。`studio.html` 可载入已有 `replay.json`。图像使用斜俯视正交相机，不是严格顶视。

## 世界与入口

默认地图 24×16 m，坐标 `[x,z]=[east,south]`。玩家速度 2.5 m/s、半径 0.28 m，机器人半径 0.34 m；机器人视野 90°、5 m，接触或被发现即失败。动作是四方向与 WAIT，每次最多 0.1 秒，内部步长 0.01 秒；机器人按 `Circuit.at(t)` 解析求值，无机器人相互碰撞响应。渲染仅读取帧。

|用途|入口|数据或限制|
|---|---|---|
|环境 JSONL 进程|`npm run --silent agent -- 1`|observe/step/retry，不是模型 runner|
|测试、构建、通关 Oracle|`npm test`；`npm run build`；`npm run oracle -- 1`|历史验收在 evidence；本轮未运行|
|程序化学习|`npm run learn -- <config> <output>`|config/pilots、results/pilot-*|
|真实模型导航|scripts/dmx-pilot.ts，经 learn 调用|results/real-dmx-pilot；会调用 API|
|多布局 G3|`bash scripts/study-run.sh`|results/layout-transfer-1；会调用 API|
|单机器人 hybrid|scripts/hybrid-single.ts 配置 新目录 --run|results/hybrid-A-N1-*；会调用 API|
|P0–P5、T1–T3|项目内未找到持久化 runner|请求、响应、真值和指标已存；复现缺口见 REPRODUCE|

所有命令、副作用及固定路径见 [REPRODUCE.md](REPRODUCE.md)。远程凭据仅从环境读取；保留 wire/journal，不能删除账本来重置请求状态。

## 已有结论

- 多布局 G3：N0 首次成功，N2/N4 各十次失败。N0 transfer/scratch 都首次成功，尚无减少尝试次数的证据。
- P 系列：P3 完整周期、P5 无序周期均 ADE=0，不能证明顺序必要；P4 更长历史仍有一个点误差。
- T 系列：有序历史正确区分 A/B；共同无序输入兼容两个不同未来，模型承认相位未知并返回均值。这只是一个配对构造的先导证据。

RQ1–RQ3 在原文件中未找到正式定义；[PROJECT_STATUS](PROJECT_STATUS.md) 使用明确标注的暂定工作映射。历史报告保留阶段口径；早期“0 次 API”只指程序化阶段，不代表整个项目。
