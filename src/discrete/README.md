# 最小离散穿越校准

所有实现、测试及本轮产物均在本目录；唯一入口是 `scripts/discrete-calibrate.ts`。未修改原有 sim、learning、study 或归档实验。只读复用 `study/provider.ts` 及原有 `scripts/encode.py` 编码器。

## 环境

10×6 网格，整数坐标；x 向东、z 向南。唯一东西通道为 `(1..8,3)`，玩家从 `(1,3)` 到 `(8,3)`；机器人仅沿 `(2,0..5)` 往返，因此任何通关路径都要经过 `(2,3)`。其余格为同时阻挡移动和视线的墙。`(1,3)` 上下左侧均为墙，构成一格安全口袋。机器人不能偏离巡逻线，巡逻全过程看不到口袋。

机器人每 tick 走一格，到达端点后停两次状态转移。到达时保留来向、`pauseRemaining=2`；第一次停顿减为 1、保留来向；第二次停顿减为 0、原地反向；下一 tick 再移动。周期 14。视野为朝向前方最多两格的直线射线，遇墙或边界截止。玩家和机器人同时更新；同格、迎面对穿、更新后视野依次判定。死亡优先于到达出口。最多执行 30 次动作：第 30 步安全到达仍成功，未到达则超时。

测试相位在调用模型前固定为 `[0,1,4,6,10]`。相位从基准状态 `(2,0),S,pauseRemaining=0` 推进得到，不改变地图或规则。0、1、6 开局 RIGHT 致死；其他动作在口袋内原地等待（UP/DOWN/LEFT 撞墙等价于 WAIT）。这三个实例必须先留在口袋等待窗口；Oracle 的 WAIT 优先级只是等长最短解的固定排序。Oracle 搜索真实的 `(tick,player,robot)` 时空状态；5 局最短长度为 10、9、7、10、7。

## 执行

在项目根目录、Node 和依赖可用的 shell 中运行：

```bash
node --import tsx scripts/discrete-calibrate.ts --oracle-only
node --import tsx scripts/discrete-calibrate.ts --no-video
node --import tsx scripts/discrete-calibrate.ts --render-only
```

不加参数会先运行单元测试和 Oracle，再按 Future-known 5 局、Omniscient 5 局的顺序请求模型，最后导出所有回放。`--out PATH` 可指定独立输出目录，默认 `src/discrete/artifacts/calibration-v1`。`--oracle-only` 也默认导出视频；`--no-video` 可以跳过导出。输出目录的 manifest 固定环境和条件，wire 的请求哈希校验防止用不同 Prompt 复用旧响应。

模型凭证使用现有 provider 的 `DMXAPI_API_KEY` / `DMXAPI_BASE_URL`；校准模型为现有配置中的 `gpt-5.6-sol`。成功响应在恢复运行时原样复用，不重采样。已完成且确定失败的网络请求允许另建 transport 回执恢复，旧回执保留；不重试状态未知的在途请求。基础设施中断标为 incomplete，不算成模型失败，不用其他策略替代模型动作。

导出使用本机 Three.js、Puppeteer、Chromium/SwiftShader 和现有 OpenCV/FFmpeg CPU 编码器。优先使用项目可解析的 `puppeteer-core` 和 `@sparticuz/chromium`，否则使用 `/tmp/patrolworld-browser-check/package.json` 的安装。可用 `DISCRETE_BROWSER_PACKAGE` 指向另一依赖环境，`CHROME_BIN` 指定浏览器、`VIDEO_PYTHON` 指定已安装 cv2 的 Python。本机默认 Python 为 `/home/jiaxuanren/miniconda3/envs/opsd/bin/python`。浏览器需具备进程启动权限；模型请求需网络权限。这些都是现有运行时依赖，未修改项目依赖清单。

## 产物和审计

- `manifest.json`：预先固定的环境、相位和条件。
- `unit-tests.json`：调用模型前的单元测试结果。
- `summary.json` / `REPORT.md`：总体结果、逐局结果、Oracle 动作序列、失败证据。
- `<condition>-phase-N/run.json`：原始响应、动作、reason、预测、真值、预测正确性、延迟、模型名、usage 及每次请求的 wire 名。
- `<condition>-phase-N/wire/*.json`：provider 原始 Prompt、完整响应 envelope、请求 hash 和网络回执。Oracle 无模型请求，以其确定性动作序列和全状态作为记录。
- 每局 `replay.html` / `replay.mp4` / `video.json` / `frames/*.png`：可拖动回放、视频和每 tick 帧。HTML 与上级 `renderer.js` 保持相对位置即可离线打开。视频每个逻辑状态显示 15 帧，30 fps，不以插值状态参与模拟。

Omniscient 位置和朝向同时相等才算单步预测正确；准确率分母为 schema 有效且实际执行的 Omniscient 动作。格式错误单独记录，不执行备用动作。失败归因为：

1. `Format Error`：严格 JSON/schema 校验失败。
2. `Prediction Error`：致死步预测错误，且仅将下一机器人状态替换成该预测时，同一动作不再因碰撞、对穿或视野死亡。
3. `Action/Planning Error`：预测正确但失败，或错误预测也不能反事实消除死亡，或耗尽动作预算。错误预测不自动视作死亡原因；`run.json` 保留逐步真值，便于复核。

两组模型 Prompt 只含规则、当前状态和自身历史。Future-known 额外含恰好未来六步的真值；Omniscient 只给巡逻规律。Oracle 解、相位难度标签、安全动作、等待步数及最佳窗口均不进入模型 Prompt。测试覆盖隔离、规则、端点停顿、墙体/视野、同步冲突、超时、schema 和归因。本轮未实现 Hint 退化、动力学变化或主动探索条件。
