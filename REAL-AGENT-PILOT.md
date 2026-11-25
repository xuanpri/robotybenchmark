# gpt-5.6-sol 真实 Agent 首轮开发实验

在开发世界 seed 1 上依次执行冒烟、全知实时状态单次探索和局部观察下的 Same/M2 探索。统计单位是同一世界上的尝试。模型的决策点与重试不构成独立世界。

**结果。** A 执行 13 个动作，在 10.56 秒被 R1 发现。B 执行 111 个动作，十次未通关，七次被发现、三次因 token 门槛结束。模型在同一位置学会了一个有效的 0.2 秒等待，但在出口前的另一处等待时仍会漏判 R4。五份反思参与了后续决策，另五份事后补采。

## API 与预算

真实请求仅发送 model 和 messages。请求模型为 gpt-5.6-sol。认证只在传输时从环境注入。首个响应带日期快照触发了身份核对，登记该快照后复用了已存回答。JSON Schema、tools、temperature、reasoning_effort 和其他可选输入均未经验证。

| 组别 | 计入预算的请求 | 动作 / 反思 / 反馈检查 | 有效回答 | 输入 token | 输出 token（含推理） | 推理 token | 平均 / P95 延迟（秒） | 服务报告费用 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| smoke | 3 | 2 / 0 / 1 | 3/3 | 2301 | 962 | 869 | 5.76 / 11.18 | ¥0.1412（3/3 有报价） |
| A | 13 | 13 / 0 / 0 | 13/13 | 23289 | 4182 | 3663 | 5.73 / 11.74 | ¥0.9845（13/13 有报价） |
| B | 121 | 111 / 10 / 0 | 121/121 | 261487 | 28893 | 21715 | 4.51 / 8.86 | ¥9.3407（121/121 有报价） |
| 合计 | 137 | 126 / 10 / 1 | 137/137 | 287077 | 34037 | 26247 | 4.66 / 9.18 | ¥10.4665（137/137 有报价） |

返回 model 字段计数为 {'gpt-5.6-sol-2026-07-09': 137}，finish_reason 计数为 {'stop': 137}。首个真实响应 ID 为 `chatcmpl-EniEGFoIqdGn54EdMUDMC7kueSv0j`。费用取原始 usage.cost。最终扣款、账户余额和未报价请求的费用无法由此确认。有效回答率以全部物理请求为分母，反思和动作分别按对应格式解析。请求序号、用量、延迟与原始响应可逐项核对。[逐请求索引](results/real-dmx-pilot/api-evidence.jsonl) · [原始账本](results/real-dmx-pilot/wire)

## 逐次结果

| 组 / 尝试 | HP 起→止 | 模拟秒 | 动作数 | 最近 / 终局距出口(m) | 结果 | WAIT 次数 | 首次与上次动作或时长不同的步号 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| smoke / exploration-1 | 100→100 | 1.01 | 2 | 11.88 / 11.88 | seen (R1) | 0 | — |
| A / exploration-1 | 100→90 | 10.56 | 13 | 4.84 / 6.93 | seen (R1) | 2 | — |
| B / exploration-1 | 100→90 | 5.19 | 6 | 6.82 / 6.82 | seen (R3) | 1 | — |
| B / exploration-2 | 90→80 | 1.70 | 3 | 11.95 / 11.95 | seen (R1) | 0 | 2 |
| B / exploration-3 | 80→70 | 12.40 | 17 | 6.02 / 9.22 | token_budget | 4 | 2 |
| B / exploration-4 | 70→60 | 7.48 | 8 | 7.37 / 7.37 | seen (R3) | 0 | 1 |
| B / exploration-5 | 60→50 | 10.80 | 12 | 7.00 / 7.02 | seen (R4) | 1 | 8 |
| B / exploration-6 | 50→40 | 9.67 | 13 | 6.67 / 6.85 | seen (R4) | 1 | 11 |
| B / exploration-7 | 40→30 | 10.29 | 13 | 6.55 / 6.55 | seen (R4) | 2 | 12 |
| B / exploration-8 | 30→20 | 10.10 | 13 | 6.55 / 6.55 | token_budget | 2 | 13 |
| B / exploration-9 | 20→10 | 9.80 | 13 | 6.55 / 6.69 | token_budget | 1 | 13 |
| B / exploration-10 | 10→0 | 10.22 | 13 | 6.67 / 6.67 | seen (R4) | 3 | 12 |

距离为到出口中心的欧氏距离。最近距离在相邻真实采样之间沿实际轴向位移取最小值。被哪个机器人看见来自运行后的私有评测，未作为反馈发送。冒烟不消耗探索 HP。相邻尝试从第一步起比较动作与时长，末尾长度差也可能造成分歧。

## 每次探索的经验原文

以下是 Agent 自己生成的经验。包括其判断有误或过度概括的条目，评测器没有替它校正。[B 组原始经验及每次注入的快照](results/real-dmx-pilot/B/memory.jsonl)

### exploration-1

- **observations** Observation: Moving west, waiting, then traveling north to z=3.5 and east to x=3.5 remained safe. Continuing east to about (5.98, 3.5) produced outcome 'seen' at time 5.19; R3 was then observed at (7.6, 8.21), heading north. HP remained 90.
- **failure** Observation: The final eastward crossing caused detection. Hypothesis: R3's north-facing sight cone covered the exposed area east of the records wall; the assumed wall shielding ended at x=5.6. Lesson: Do not leave cover based only on an unverified sight-line assumption.
- **next** Next strategy: repeat the safe opening, stop behind the records wall, and wait to observe or outlast R3's northbound pass. Then route south of the divider at z>5, cross east behind the patrol, and turn north after x>8.9 toward the exit.
- **uncertainty** Limited observation: R3's patrol limits, sight range, cone width, and turning schedule are unknown. The proposed timing and shielding route are hypotheses and must be tested with short moves.

### exploration-2

- **observations** Observation: Limited. From spawn, moving west for 0.2 s to about (1.0, 8.5), then north for 1 s to about (1.0, 6.0), remained safe. Continuing north was blocked near z=4.75 and resulted in detection at time 1.7. R1 moved north from about (3.1, 8.64) to (3.1, 6.86).
- **failure** Observation: Detection occurred while advancing north beside the west end of the records wall. Hypothesis: R1's north-facing view reached the exposed corridor west of the wall. Lesson: Avoid following directly ahead of a northbound patrol.
- **next** Next strategy: create more separation by waiting near the southwest side or moving south before following R1 north. Use short moves, then approach the records wall only after R1 has passed farther north.
- **uncertainty** R1's sight range, cone width, patrol endpoint, and turn timing are unknown. It is also uncertain whether the final move was blocked by the records wall, detection, or both.

### exploration-3

无有效经验。token_budget

### exploration-4

- **observations** Observation: Limited. Moving south to z=13.5, east to x=9.0, then north to (9.0, 8.5) remained safe. R3 was observed traveling north near x=7.6. An east move from (9.0, 8.5) ended early at about (10.2, 8.5) with outcome 'seen'; HP was 60.
- **failure** Observation: Detection occurred while moving east through the exposed corridor south of the spine. Hypothesis: R3 turned east near (7.6, 5.95) and gained a clear sight line toward the corridor. Lesson: Do not cross an exposed lane when a patrol has reached its turning point.
- **next** Next strategy: repeat the safe southern route, but pause before entering the corridor near (9.0, 8.5). Use short waits or moves to let R3 turn and travel away, then cross east past the spine and approach the exit from the east side of the divider.
- **uncertainty** R3's sight range, cone width, exact turning cycle, and whether the spine provides sufficient cover are unknown. The proposed timing is a hypothesis and should be tested with 0.2-second actions.

### exploration-5

- **observations** Observation: Limited. The southern route to (9.0, 8.5) was safe. After a 0.2-second wait, moving east to (14.0, 8.5) remained safe. R2 was observed near (15.58, 5.2), and R4 near (19.32, 10.85) facing west. Retreating west to (11.5, 8.5) was safe, but a later eastward move ended at about (13.0, 8.5) with outcome 'seen'; R4 was then near (17.40, 10.85), facing west.
- **failure** Observation: Detection occurred during the second eastward crossing south of the spine. Hypothesis: R4 had moved close enough for its west-facing view to cover the lane. Lesson: Once a timed crossing succeeds, leave the exposed lane instead of retreating and crossing it again.
- **next** Next strategy: repeat the safe southern route and timed eastward crossing. On reaching the spine’s east end near x=14, immediately move north around it using short actions rather than retreating west; pause under cover if R2’s position makes the northern lane unsafe.
- **uncertainty** R4’s sight range and cone width are unknown, and it is uncertain whether R4 alone caused detection. R2’s patrol timing and the safety of moving north around the spine’s east end remain unverified hypotheses.

### exploration-6

- **observations** Observation: Limited. The southern route from spawn to (9.0, 8.5), a 0.2-second wait, and the eastward crossing to (14.0, 8.5) were safe. Moving north to z=8.0 and east to x=14.5 was also safe. Continuing east ended early at about (14.675, 8.0) with outcome 'seen'. R2 was then near (14.964, 5.2), facing west; R4 was near (18.758, 10.85), facing west.
- **failure** Observation: Detection occurred while moving east just beyond the spine’s east edge. Hypothesis: R2’s west-facing sight cone covered this exposed position; R4 may also have had a sight line. Lesson: Do not move farther east after clearing the spine unless patrol sight lines are verified.
- **next** Next strategy: replay the proven southern route and timed crossing to (14.0, 8.5). Move north only to z=8.0, then use short waits under the spine’s east-edge cover until R2 passes or turns; proceed north with 0.2-second moves before turning west toward the exit.
- **uncertainty** R2’s sight range, cone width, patrol endpoints, and turn timing are unknown. It is uncertain whether R2, R4, or both caused detection, and whether waiting at the spine’s east edge is fully shielded.

### exploration-7

无有效经验。token_budget

### exploration-8

无有效经验。token_budget

### exploration-9

无有效经验。token_budget

### exploration-10

无有效经验。token_budget

### 事后补采，未进入任何尝试的记忆

- exploration-3，请求 133。Next strategy: Repeat the verified opening to reach the area below the divider, but pause before entering R2's west-facing corridor. After R2 passes west, cross east behind it using short moves, go north around the divider's east side, and approach the exit from x greater than 8.9.
- exploration-7，请求 134。Next strategy: Replay the proven southern route and timed crossing, but do not wait at (14.0, 7.88). Use short northward moves immediately after reaching the spine's east end, aiming to pass north of the spine before R2 moves close, then turn west toward the exit.
- exploration-8，请求 135。Next strategy: Replay the proven southern route and timed crossing, then reach (14.0, 7.88). Use minimal short waits to let R2 continue west, then test northward progress in 0.2-second steps around the spine’s east end. Once north of the spine, move west toward x=12.5, then north to the exit while avoiding the divider.
- exploration-9，请求 136。Next strategy: From (14.5, 7.88), use 0.2-second north moves to pass the spine while monitoring R2. Once safely north of the spine, move west toward x between 8.9 and 12.5, then continue north around the divider and approach the exit at (12.5, 1.5). Wait under cover if R2 remains oriented toward the route.
- exploration-10，请求 137。Next strategy: replay the safe southern route and timed crossing, but after reaching (14.0, 8.0), continue north immediately with short 0.2-second moves rather than waiting for R2 to pass west; then turn west toward the exit only after clearing the spine.

原始经验、原始返回及确切时间可在 [补采文件](results/real-dmx-pilot/B/retrospective-memory.json) 与总账本中核查。补采计入 200 次上限和费用，未用来重画原实验的行动或宣称改善了学习。

## 行为解释与复现

**A 有一次可验证的正确等待。** 在 1.20 秒与 2.20 秒，模型分别等待 1 秒，再向北走 1 秒。私有离线对照从等待前相同的位置、时钟和朝向，直接执行相同的下一步，结果被发现。实际等待后该步安全。对照只检验这一小段，不能据此认定整条路线安全。模型随后试图穿过北墙和上方隔断之间的窄缝：两次非终止移动实际走过的距离小于请求距离。第 11 步自报“隔断挡路”，主动向西折返，再向南绕行。第 13 步的理由着眼于 R3、R2，私有终局显示有效观察者是 R1。按“离开至少 1 m，再回到距原决策点 0.2 m 内”的定义，A 没出现空间循环。模型知道方向且能响应阻挡。公开任务没有明示玩家直径，不能用这次窄缝误判单独量化几何推理能力。[A 动作与理由](results/real-dmx-pilot/A/actions.jsonl) · [事后对照](results/real-dmx-pilot/behavior-audit.json)

**B 中能复用局部成功经验，也会重复危险判断。** 第 4 次选择南线，在 7 秒处直接向东后被 R3 发现。其在线总结建议在东穿前短暂停顿。第 5–10 次都在相同位置和 7.00 秒选择 WAIT 0.2 秒，随后向东成功通过。六次反事实重放中，删去等待并直接执行相同东移动作都会被发现。这六次是同一确定性情境的复现。第 7、10 次则在中央墙东端等待 R2 西行，终止时均被 R4 看见。R4 在最后等待前已可见。同一状态改向西移动相同请求时长，两个局部对照都安全。动作理由和终局支持“对一个巡逻者的判断未覆盖另一台的风险”这一解释，无法据此读取模型内部注意力。[B 动作与理由](results/real-dmx-pilot/B/actions.jsonl) · [可见观察](results/real-dmx-pilot/B/observations.jsonl)

| B 尝试 | 相对上一次实际执行的变化 |
|---|---|
| 1 | 西移、等候、沿西侧北上，再向东越过短墙，被 R3 发现。 |
| 2 | 保留初始短西移，省略上次的一秒等待，连续北上，更早被 R1 发现。 |
| 3 | 恢复等待，增加分段短步和多次停顿，经过此前的失败位置。该次终止于 token 门槛。 |
| 4 | 开局改为连续南行，再向东、北绕下方障碍。未在中央东穿前等待。 |
| 5 | 保留南线路径，在第 8 步加 0.2 秒等待。通过中央通路后向西再折回，被 R4 发现。 |
| 6 | 保留前十步，把通路尽头的西撤改为短北移和东移，仍被 R4 发现。 |
| 7 | 东端连续短北移后在原地等待，被 R4 发现。 |
| 8 | 保留前十二步，把末段等待缩短为 0.5 秒。预算结束时世界仍在运行。 |
| 9 | 前十二步与上次相同，末步改为短东移。该次也终止于 token 门槛。 |
| 10 | 一次短北移后提前等待，随后继续等 R2 离开，终局再次被 R4 发现。 |

**隐藏状态预测与主动观察。** 第 3 次在 10.20 秒见到 R2 朝西。11.40 秒当前只可见 R1，模型仍以 R2 朝西为理由向南。私有轨迹核对到 R2 此时位于约 (12.68, 5.20)，朝西。这是与短时外推一致的定性例子。回答没有未来位置、时间或置信度，沿用最后观测也足以解释。所有 WAIT 都产生新观察，给出的理由主要是错开巡逻者或沿用成功时机，未找到可单独验证“为降低不确定性而主动采样”的行动对照。[B 原始请求](results/real-dmx-pilot/B/requests.jsonl) · [私有评测轨迹](results/real-dmx-pilot/B/private_ground_truth.jsonl)

**距离与掌握。** B 的最佳接近度出现在第 3 次（约 6.02 m），末次约 6.67 m，没有单调接近出口。探索血量用尽，首次成功次数与首次成功前耗血均未定义，没有解锁三次复验。A/B 同时改变了观察条件和重试/记忆策略，无法从二者的差异估计 M2 的净增益。

**预算对实验的影响。** 正式实验保留现有的 32,000 token 单尝试门槛。由于未请求服务的可选输出限制，Runner 在收到真实 usage 后才判断是否还能发下一条请求。末条回答可使合计超过门槛。B 第 3、8、9 次到达门槛时世界仍 active，按既有预算失败规则各扣 10 HP。其余七次均为有效发现。第 7、10 次在最后一步被发现时也已耗尽该尝试 token。因此十次仅有五份总结在实验中在线生成。第 1 到第 10 次实际带入的摘要数依次为 0、1、2、2、3、4、5、5、5、5。其余五份在实验结束后使用当时公开经历补采，未影响任何动作。B 在线 116 个请求，另有 5 个补采请求。两部分服务报价分别为 ¥8.6270 和 ¥0.7138。这个偏离限制了对完整十轮 M2 学习的归因。[在线记忆](results/real-dmx-pilot/B/memory.jsonl) · [事后总结](results/real-dmx-pilot/B/retrospective-memory.json)

### 下一轮

先给反思预留独立请求和 token 额度，同时固定各记忆条件的可用行动机会，并比较 Same 下同一组开发种子的 M0、M1、M2。当前最值得区分的是对隐藏机器人状态的定量预测、对多个同时可见威胁的风险判断，以及对窄通路的几何判断。独立的位置/风险 Probe 可以在行动前记录预测，在离线评测端评分。建议再用预先验证可解的相位变化世界检验迁移。现有结果不足以支持调整地图难度或给模型排名。

### 重放与复现

以下命令在项目目录执行。本机 Node 路径为 /home/jiaxuanren/miniconda3/envs/codex-env/bin。原始实验使用环境提供的两个 DMXAPI 变量，主机不运行推理服务。已完成的阶段读取归档。不要删除共享账本以重新申请同一轮配额。

```bash
export PATH=/home/jiaxuanren/miniconda3/envs/codex-env/bin:$PATH
for track in smoke A B; do
  npm run learn -- config/dmx-pilot.json results/real-dmx-pilot/$track
  node --import tsx scripts/verify-learning.ts results/real-dmx-pilot/$track
done
node --import tsx scripts/audit-dmx.ts smoke A B
python3 scripts/report-dmx.py
```

仅离线重制录像时，使用历史 replay.json 和新的输出路径。左侧和右侧用同一条模拟时间索引。录像中保留在线反思、未得到反思的结算、失败停帧及下一次重置。片长包括这些阅读停帧。

```bash
export NODE_PATH=/tmp/patrolworld-browser-check/node_modules
export VIDEO_PYTHON=/home/jiaxuanren/miniconda3/envs/opsd/bin/python
npm run video -- results/real-dmx-pilot/A/replay.json exports/dmx-A.mp4 omniscient simulation
npm run video -- results/real-dmx-pilot/B/replay.json exports/dmx-B.mp4 split simulation
```

[A 全知录像](results/real-dmx-pilot/A/videos/experiment-A-omniscient.mp4) · [B 十次尝试左右分屏录像](results/real-dmx-pilot/B/videos/experiment-B-learning.mp4) · [视频校验与哈希](results/real-dmx-pilot/video-audit.json) · [标明未参与在线决策的可选补采字幕](results/real-dmx-pilot/B/videos/experiment-B-learning.retrospective.en.srt) · [计费和凭据隔离审计](results/real-dmx-pilot/ledger-audit.json) · [测试记录](evidence/dmx-tests.txt)

逐帧状态验证覆盖 126 个真实执行动作和 1,007 个同步采样。30 项测试通过，包括模拟 HTTP 传输下的认证错误、连续限流、账本恢复和全局配额测试。模拟传输结果未进入本报告的调用次数与成绩。

