# Phase 2.2 — Tier-1 盲区动力学

入口 `scripts/discrete-phase2-2.ts`；新逻辑仅在本目录，产物默认在 `src/discrete/artifacts/phase2-v2/`。只读复用 blind 的通道、气闸、观测投影、严格 JSON schema 与 Three.js/CPU 编码方式。按本轮要求将巡逻线延伸为 x=5,z=0..5，仅打开旧图的两个端点格，通道和气闸不变。旧入口、blind 实现、两轮旧产物和原受保护目录不修改，698 个既有文件的 SHA-256 见 `protected-before.json` / `protected-audit.json`。

## 动力学与冻结

所有过程先生成 0..30 tick 的外生机器人轨迹，和玩家动作无关。Oracle、LLM、重放使用同一轨迹。整数 PRNG 是按 seed/attempt/domain 混合的 mulberry32；随机移动、参数、模式排列和程序策略等待各用独立域，不因策略调用顺序改变随机世界。

- identical_loop：完整范围 0..5、速度 1、北停 0、南停 3。停 0 时到达即反向；停 k 时保留到达朝向，随后 k 次原地状态转移中递减，最后一次反向。周期 13。同一 seed 的 1..5 次尝试使用同样规则和相位。
- parametric_shift：每次用 `(seed,attempt)` 重采样范围 `[0,5]/[1,4]/[1,5]`、统一速度每 1/2 tick 一格、两端分别停 0/1/2 tick，以及完整周期中的初始相位。方向由相位决定，采样允许自然重复。
- pattern_shift：每个 seed 用独立 PRNG 排列四种模式，attempt 1..4 不重复、attempt 5 回到第一模式；每次重采样相位。包括北0南3、全局按到达事件交替停0/2、南速1北速2、每次进入内部 z=3 后下一 tick 原地停1且不改朝向。除明确规定的暂停外，端点停0、立即反向。速度 cooldown 在移动/反向后设为新朝向速度减1，逐 tick 原地递减。暂停优先级高于内部停顿，高于 cooldown，高于移动。
- pure_random：初始 z 均匀取0..5、N/S 各半；每 tick 在合法 N/S/STAY 中均匀采样，边界上去掉越界动作后重新归一化。移动更新朝向，STAY 保持原朝向。不同 attempt 使用独立域种子，没有周期模板。

LLM seeds 冻结为 `[101,102,103,104,105,106]`。identical 的相位依次为 `[4,5,6,9,10,11]`，是 API 前固定的程序化反先验分层，不根据模型结果选样；不同 seed 的相位不同，同 seed 跨尝试相同。其他范围和相位在 manifest / preflight / 每局 instance 中完整记录。

冻结 manifest 包含模型、矩阵、种子、PRNG、随机分布、等待策略，以及 world/protocol/preflight/experiment 源码哈希。恢复时不允许更换核心规则或 Prompt；成功响应不会重采样。明确完成的 transient 网络失败可以产生新 transport 回执，旧回执保留；未知在途请求不重试。基础设施失败保留 incomplete，不执行备用动作，不计为模型失败。

## 执行

在项目根目录、依赖和 Node 可用的环境：

```bash
node --import tsx scripts/discrete-phase2-2.ts --preflight-only
node --import tsx scripts/discrete-phase2-2.ts --no-video
node --import tsx scripts/discrete-phase2-2.ts --render-only
```

数据完成后可离线生成三张 SVG/PNG 图并核验全部产物（Python 需已有 matplotlib/cv2；本机使用 `/home/jiaxuanren/miniconda3/envs/opsd/bin/python`）：

```bash
python src/discrete/dynamics/plot.py
python src/discrete/dynamics/verify.py
```

`verify.py` 检查30局随机组完整性、所有 public-history、一致源码/受保护文件哈希、TypeScript，并完整解码筛选视频、逐 tick 对比对应PNG。该流程不调用模型。汇总中的 tokenUsage 是 provider 返回的 prompt/completion token 实数统计，不推算费用。

默认在所有测试、90 局 Oracle、防捷径与随机基线后，先做 pattern_shift 的 Omniscient 六局。达到 ≥5/6 才进入三种可预测动力学的 passive、interactive 六组；最后运行 pure_random passive。可预测条件成功早停，未知条件最多5次；pure_random 每个 seed 无论先前成功失败都执行5次，共30局，其合法成功和失败历史都保留。Omniscient 最多1次，不进入主要未知条件比较。可选 pure_random interactive 本轮不运行，报告中标明未测。

`--concurrency 1..6` 控制组内独立 seed 的并发，默认6；同 seed 的尝试与 tick 严格顺序，组间按 manifest 顺序。`--out PATH` 可以选择输出目录。`--no-video` 不改变任何请求；默认导出全部模型失败尝试和每种动力学一个成功代表（优先 PEEK 较多）；`--render-only` 不调用模型。浏览器/Python 依赖与 blind 管线相同，复用只读 `scripts/encode.py`；可用 CHROME_BIN、DISCRETE_BROWSER_PACKAGE、VIDEO_PYTHON 覆盖本机运行时。

## 零 API 预检

Oracle 验证三种可预测动力学的6 seeds×5 attempts，共90局。identical 的 Blind-Rush、Memoryless-Reactive（仅窗口见 z=3 时 WAIT）、Symmetric-Prior-Heuristic（假设范围0..5、每tick一格、两端各停1）分别为0/6、0/6、2/6。对称启发式在窗口重置其估计，在盲区只外推自身估计；预测立即向右会致死时原地 WAIT。

随机理论基线使用与LLM不重叠的100 seeds=1001..1100，每seed5次，共500局/策略。三种策略是一直向右、先独立均匀等待0..10步再向右、Memoryless-Reactive。`random-baseline.json` 保留500个逐局二元结果、各轮成功率/方差/95% Wilson区间、轮成功率样本方差和seed聚类bootstrap区间。另用完整随机状态 Markov 递推精确计算30 tick 内的策略通关概率；Blind-Rush 的结果还以独立四步枚举核对。Monte Carlo CI 是对有限样本估计 p 的精度，不是LLM每轮6局结果的95%接受带。

## Prompt 与隐私

两个 unknown 条件使用同一通用环境规则；不提供模式、seed、相位、参数、运动规律、预测评分、未来状态或最佳窗口。每次重试通用说明机器人可能改变，所有模式都使用相同措辞。PEEK 权限是唯一条件差异。公共历史只包含当时合法观测、模型自身预测/动作/reason、失败类型；盲区 robot 始终 null，只有窗口或刚结束PEEK可见。历史合法旧观测不会伪装成当前观测。

Omniscient 是任务指定的唯一例外：不提供模式名称，只给当前真实状态、文字形式的真实转移规律及当前内部计数器，以排除隐藏 cooldown/暂停相位歧义；不提供未来表、动作建议或等待步数。所有未知条件仍没有真实规律。

硬测试对所有模式/seed/尝试重放；任意改变未知条件的私有模式、参数、种子或盲区状态，序列化请求必须逐字不变。运行后 audit 逐一重建 actual wire、机器人轨迹、公开历史、PEEK寿命、评分与反事实归因。合法地图坐标、旧观测和模型自身估计可能恰巧等于真值，不能用字符串出现某个数字来判断泄密；检查的是数据来源和非干扰性。

## 报告定义

- `REPORT.md` / `summary.json`：完整8个矩阵切片；四种动力学×未知条件主表中随机interactive明确未测。
- Pass@k 是六个seed中第k次前至少成功一次的累计比例；pure_random 尽管可能已成功仍继续记录后续局。平均通关次数给出成功seed的条件均值、成功seed数量，以及无成功按上限计的restricted mean；不将早停后的缺失局伪造成失败。
- 预测必须同时命中下一tick位置和朝向。按动作前是否可见拆分；隐藏年龄为本次尝试当前tick减最后合法看到tick，分1/2/3/4+。PEEK动作本身仍按其输入可见性计分，结束观测影响下一个决策。不同条件的PEEK和早停会改变评分分母，年龄分桶不等于控制了同样危险状态的因果比较。
- 失败沿用一步反事实：错误预测且将下一机器人状态替换成预测后消除立即致死事件，才记 Prediction Error；其他决策/超时为 Action/Planning Error；非法schema记 Format Error且不执行备用动作。
- PEEK 给出总数、每已完成尝试均值、触发坐标和逐尝试计数，区分观察窗口与气闸前探测。
- 随机漂移报告给出每轮单轮成功率/LLM Wilson CI、三个参考策略对应轮的CI、理论p与同样n的二项预测区间、动作分布与熵（log2）、窗口WAIT均值，以及规律性语言标记和原文例子。参考策略不是最优部分观测策略上界；命中某个区间或使用规律性词汇都不能单独证明幻觉。显式要求估计本身也不等于模型声称存在真实规律。

每局 run.json 保存私有 instance/全状态、公开输入输出、动作/预测/评分、wire引用、延迟、模型及token usage；public-history.json 是唯一可带到下一次尝试的结构；wire 保留原始完整请求/响应。manifest、unit-tests、preflight、random-baseline、audit、protected-audit 和视频筛选/元数据均保存在本轮产物目录。
