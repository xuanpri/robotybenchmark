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
