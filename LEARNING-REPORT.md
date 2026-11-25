# Multi-Robot Stealth Arena 学习实验与录像验收

**2026-11-24，开发世界 seed 1。** 系统已经能从有限观察做决策，记录失败、扣血、带记忆重试，再以全知和局部视角回放同一动作链。本轮最清楚的实验结果是，公开失败记忆可以改变一个简单策略的行为，但更长的生存时间并未转化为通关。本轮真实语言模型请求数为 **0**。

## 场景与可解性

巡逻录像为 1920 × 1080、30 fps，共 1,200 帧。保持原地图与四条路线，隐藏玩家，通过真实巡逻时间函数取样，机器人视野由现有渲染器按墙体裁切。四条路线的完整周期分别约 10.51、20.19、16.55、24.15 秒，均短于录像的 40 秒。[巡逻演示](evidence/videos/scene_demo.mp4) · [生成源](scripts/demo.ts)

保存的 Oracle 动作链包含 118 个基础动作，其中有 32 次等待。原链在 11.75 秒进入出口；仅删除 WAIT 后在 1.01 秒被发现。附加的失败和结算停帧用于阅读 HUD，通关或发现时间取自模拟器。[成功录像](evidence/videos/oracle_success.mp4) · [删等待录像](evidence/videos/oracle_without_wait.mp4) · [原始动作](evidence/oracle-seed-1.json)

## 有限 HP 与经验对照

以下六个条件使用相同地图、相位、动作时长集合、探索上限十次、HP 100、代价 10、每尝试 20 模拟秒和 100 次决策。每个条件仅有一个探索 episode。十次重试共享同一世界，不能视为十个独立地图样本。随机策略的随机流在三个记忆条件间逐试次匹配。[预设配置](config/pilots) · [配对指标](evidence/learning-comparison.jsonl) · [分阶段统计](evidence/learning-stage-stats.json)

| 策略 | 记忆 | SR@1 | SR@10 | 平均生存秒 | 终局平均距出口中心（m） | 实际决策数 |
|---|---|---:|---:|---:|---:|---:|
| Random | M0 | 0 | 0 | 4.58 | 12.61 | 103 |
| Random | M1 | 0 | 0 | 4.58 | 12.61 | 103 |
| Random | M2 | 0 | 0 | 4.58 | 12.61 | 103 |
| Goal-directed | M0 | 0 | 0 | 1.70 | 11.95 | 90 |
| Goal-directed | M1 | 0 | 0 | 1.70 | 11.87 | 90 |
| Goal-directed | M2 | 0 | 0 | 4.64 | 13.28 | 236 |

六个条件均耗尽探索预算。首次成功次数均为 null，相对匹配随机基线的 SR@10 提升为 0。随机策略忽略记忆，三组轨迹一致；同类失败重复率为 8/9。启发式十次都以被发现结束，重复率为 9/9。每次终局的剩余距离、生存时间、访问网格和 HP 均保存在对应目录的 summary.json；逐次事件和动作可在 events.jsonl 和 actions.jsonl 对齐。

**具体行为变化。** 启发式 M2 的第一次失败在约 (1.00, 4.75)。策略生成的公开摘要建议避免在约 (1.00, 5.00) 再向北。第二次改向东，终局位置变化，仍在 1.70 秒被发现。第十次生存至 7.76 秒，终局位置约 (1.50, 11.90)，离北侧出口更远。这里观察到的是程序化避错策略改变了路线。现有证据无法支持恢复了隐藏机器人轨迹或掌握了通关策略。[策略生成的记忆](results/pilot-heuristic-M2/memory.jsonl) · [终局记录](results/pilot-heuristic-M2/events.jsonl) · [十次尝试合辑](results/pilot-heuristic-M2/videos/learning.mp4)

**记忆容量。** 程序化对照共用 4,096 UTF-8 字节上限。启发式 M1 的 90 次行动决策中 81 次实际收到非空记忆，峰值 4,089 字节；M2 的 236 次决策中 227 次收到记忆，峰值 1,867 字节。M1 丢弃旧的完整 turn，M2 累积策略摘要。两种表示的体积与策略读取逻辑均有差异，仅凭结果无法分离摘要形式与检索方式的贡献。真实模型接口单独按部署 tokenizer 记录 token。[逐请求审计](results/pilot-heuristic-M2/requests.jsonl) · [策略代码](src/learning/agents.ts)

## 掌握、迁移与初始失败

特权 Oracle 在探索首次成功，HP 消耗 0。Mastery 三次均以同一成功动作序列在 11.75 秒通关。FreshDynamics 迁移重新规划后于 18.15 秒通关。PhaseShift 迁移的初始站位恰在机器人有效视野内，模拟器 reset 时已经判负：0 秒、0 动作。包括这个世界的原始迁移成绩是 **1/2**，其中只有一个世界给予了行动机会。这个结果不能估计策略的迁移能力。后续正式实验应事先登记出生点合法性与可解性检查，并保留原始生成分布。本轮保留了零时失败样本和独立的验证血量。[Oracle 分阶段记录](results/pilot-oracle-verification/summary.json) · [事件](results/pilot-oracle-verification/events.jsonl)

Mock 连续两次在 0.43 秒接触失败，HP 从 100 降至 90、80。从保存的第一个尝试动作文件，独立 Replay Agent 再次产生相同的 0.43 秒接触。随机短片中的两次终止均为 3 秒开发时限。它们用于验证动作接口与导出流程。[Mock 分屏录像](results/pilot-film-mock/videos/learning.mp4) · [局部墙钟回放](results/pilot-film-mock/videos/limited-wall-clock.mp4) · [随机分屏录像](results/pilot-film-random/videos/learning.mp4) · [Oracle 分屏录像](results/pilot-film-oracle/videos/learning.mp4)

## 有效性与复现

- 全部 24 项测试通过。包含增加的扣血/重试、长动作、三种重置、记忆隔离、预算、无效/截断/拒答、局部信息权限、断点恢复和多阶段评测检查。适配器测试使用模拟 HTTP 传输，未计入实验模型成绩。[测试输出](evidence/learning-tests.txt)
- 从 11 份实验记录独立重跑 72 次尝试、974 次已执行决策，对齐 3,116 个真实状态与可见投影采样。每个比较均覆盖玩家、全部机器人以及同一模拟时刻允许返回的可见集合。所有动作、失败和重置均保留。[逐实验校验](evidence/learning-replay-checks.txt)
- 软件 Chromium + SwiftShader 与 OpenCV 的 CPU FFmpeg 后端完成导出。成片校验包括分辨率、帧数、独立片段与合辑的对应画面，以及跨尝试血条。实际浏览器也验证了演示播放、载入本地实验、切换尝试、权限和时钟。[录像校验](evidence/video-verification.json) · [浏览器检查脚本](scripts/check-studio.cjs)
- 资源审计时物理 GPU 0–7 均为 A100 80GB，利用率均为 100%，空闲显存依次约为 719、5977、6095、4852、971、25893、25893、5044 MiB。回环端口 18347、18350、18351、18352 的模型列表查询均返回连接拒绝。保留了四个本地部署登记，未下载模型或启动推理服务。服务恢复后先运行两决策 local-smoke，并核对原始返回、记忆 token、有效动作和模拟时钟，再开展跨模型比较。

所有配置、预算、隐私边界、验证与录制命令见 [实验使用说明](LEARNING.md)。

最终共校验 23 个 MP4，包括十次尝试的 M2 合辑及十个独立尝试片。浏览器实测的 WebGL 设备为 ANGLE / SwiftShader Device (Subzero)。[录像、回放 SHA-256 与导出命令](evidence/film-manifest.json)
