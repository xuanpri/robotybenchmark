# Phase 2.1：盲区助跑与不透明气闸

入口：`scripts/discrete-phase2.ts`。新逻辑仅位于 `src/discrete/blind/`；默认产物位于 `src/discrete/artifacts/phase2-v1/`。v1 校准、既有入口、原 sim/learning/study 及归档文件均只读。运行前的 337 个受保护文件 SHA-256 存于 `protected-before.json`，运行中和结束时验证 `protected-audit.json`。

## 冻结场景与预检

```text
z=0  ##########
z=1  #####.####
z=2  #####.####
z=3  #SBBBC..E#
z=4  #####.####
z=5  ##########
```

S=(1,3) 是观察口袋，B=(2..4,3) 是盲区助跑，C=(5,3) 是交叉点，E=(8,3) 是出口；x 向右增大。气闸位于 (4,3)—(5,3) 边，移动耗一个 tick、视线不可穿透。机器人巡逻 x=5、z=1..4，速度一格/tick，端点停顿一个 tick 并反向；周期 8。到达端点保留来向，下一 tick 原地反向，再下一 tick 移动。视野是朝向前方最多 3 格的直线射线，遇墙、边界、气闸截止。窗口是明确的观测权限：仅在 S 可看到机器人 pos/heading；从其他格不能因移动或靠近气闸获得机器人状态。全局观测是 Omniscient 的单独权限。

模型请求前冻结 `[0,1,2,4,5,6]` 六个相位。完整八相位下直接右冲死亡 5/8（62.5%），冻结集死亡 5/6（83.3%）。这不是事后挑选模型失败；分层仅使用程序化基线。Oracle 6/6，Blind-Rush 和 Memoryless-Reactive 都为 1/6，满足门槛。Oracle 最短长度为 9、8、7、10、9、8；完整轨迹在 `programmatic-gates.json`，不会进入模型请求。

玩家和机器人同步更新，然后依次检查同格、交换位置、更新后的视野；死亡优先于出口。最多 30 次动作，第 30 步安全到达仍成功，否则 timeout。

## 运行与恢复

在项目根目录、Node 可用的 shell 执行：

```bash
node --import tsx scripts/discrete-phase2.ts --preflight-only
node --import tsx scripts/discrete-phase2.ts --no-video
node --import tsx scripts/discrete-phase2.ts --render-only
```

默认先运行全部 11 项单元测试和程序化门槛，再运行 Omniscient 六局；只有其成功数 ≥5 才允许正式条件。随后严格按 Partial-known、Partial-unknown-passive、Partial-unknown-interactive 的组顺序运行。组内不同相位的记忆互相隔离，默认 3 个相位并发（`--concurrency 1..6` 可调整）；每个相位的 tick、尝试和历史严格顺序。

Partial-known 和 Omniscient 各最多一次；两个 unknown 条件各最多三次，成功即停。每次失败后两方都重置到该相位的同一初始状态。成功响应恢复时直接重放，不能重采样；完成且已确定网络失败的请求可以使用新的 transport 回执重试，保留旧回执，最多三次恢复。不重试未知在途请求。基础设施中断保持 incomplete，不执行备用策略，不算模型失败。

`--stop-after-omni` 仅做新图模型复核；`--out PATH` 选择输出目录。manifest 冻结环境、六相位、尝试上限和环境/Prompt/实验核心源文件指纹，恢复时拒绝变更。模型通过既有只读 `study/provider.ts` 请求，使用现有 DMXAPI 环境变量及 gpt-5.6-sol 配置。

默认导出所有模型失败尝试和每个条件一个代表性成功尝试；interactive 成功代表优先选择 PEEK 较多的一局。`--no-video` 保留完整数据、请求审计、汇总与失败归因；后续 `--render-only` 不调用 API。导出使用相同的 Three.js、Puppeteer、Chromium/SwiftShader 运行方式及只读 `scripts/encode.py` 编码器，运行时环境变量与 v1 管线相同。视频是带公开观测和模型估计的 **审计全局视图**，不作为模型输入；明确标识被遮挡的私有真值。

## 公开历史的硬边界

`observe()` 使用字段白名单：tick、player、outcome、robot、source。robot 只有合法可见时的 pos/heading，永远不含 pauseRemaining。非 Omniscient 玩家在非窗口格且未刚结束 PEEK 时，robot 必须为 null。PEEK 原地耗一个 tick，世界照常推进，在结束状态给予一次观测；下一次非 PEEK 动作后恢复不可见，且 PEEK 不免疫死亡。

跨尝试只携带 `PublicAttempt`：合法观测、模型自己输出的预测/动作/reason，以及失败类型 collision/swap/vision/timeout/format。不会携带完整状态、相位标签、评分、预测正确性、归因、Oracle 解或未公开的机器人状态。模型原有预测即使恰好等于真值，也只是其自身估计。

“不泄露盲区真值”按数据来源验证，而不是禁止文本中碰巧出现同样的坐标数字或 N/S 字母：坐标还会合法出现在地图、历史可见观测和模型自身预测中。保留旧的合法窗口/PEEK 观测，是用户指定的跨尝试学习条件。硬测试将同一盲区状态中的机器人换成全部八相位，要求序列化 Prompt 和跨尝试历史逐字相同；另保留相同合法旧观测，改变后续隐藏真值，要求全历史请求仍不变。运行后 `audit.json` 对每次实际 wire 精确重建请求、核验 hash、重放状态，并逐条做隐藏状态替换不干扰校验。

unknown 条件 Prompt 没有机器人速度、巡逻路线、端点停顿、周期或反向规律；公开地图只表示可通行格。只有 Omniscient 和 Partial-known 明示完整规律。所有条件均要求严格 JSON 的显式下一 tick 预测；非 interactive 使用 PEEK 计 Format Error，不执行该动作。

## 指标与产物

- `REPORT.md`、`summary.json`：门槛、Pass@1/2/3、可见/隐藏预测、年龄分桶、各失败类别、每次尝试及 PEEK 位置分布。
- Pass@k 以六相位为分母累计首个成功尝试；超过 maxAttempts=1 的 k 标记 N/A，没有实际进行第二、三次试验。unknown 成功即停，其成功计入后续累计 k。
- 预测准确率要求下一 tick **位置和朝向均正确**。按动作前输入是否可见拆分；PEEK 动作自身的预测仍按动作前的观测计分，其结束观测只影响下一个决策。
- `ticks_since_last_seen` 是当前输入 tick 减本次尝试最后一次合法看到机器人的 tick；窗口或 PEEK 观测重置。隐藏年龄分桶为 1/2/3/4+。主隐藏指标包含所有非窗口格，另给出仅 (2..4,3) 助跑格指标以免出口后的安全段混淆。
- 无 schema 有效动作的格式错误不进入预测分母，单独统计。失败归因沿用 v1 的一步反事实：错误预测且替换后能消除当前致死事件，才归 Prediction Error；否则 Action/Planning Error；非法 JSON/schema 为 Format Error。这不是对更早历史决策的因果证明。
- 每尝试 `run.json`：私有真值、公开输入/输出、下一步估计、评分、动作、wire 引用、usage、模型名和延迟。`public-history.json` 是下一次尝试允许使用的唯一记忆结构。`wire/` 保存完整原始 Prompt 与 provider 响应。
- `video-selection.json`、所选尝试下的 `replay.mp4`、`replay.html`、`frames/*.png` 和 `video.json`：默认筛选的回放。每整数状态显示 15 帧，30 fps，插值不参与逻辑。

本轮只比较已指定的观测/规律/PEEK 与尝试次数，动力学始终 identical_loop，没有 Hint 退化或动力学变化条件。六相位的小样本结果用于 Phase 2.1，本身不代表跨地图或跨初始分布泛化结论。
