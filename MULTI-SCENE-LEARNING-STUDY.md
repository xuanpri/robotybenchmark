# 多场景少次尝试学习与经验迁移

开发 seed 1。15 个场景均通过真实模拟器验证。三种布局面积、起点、出口和巡逻机制一致；A→B 仅更换内部墙壁。每种机器人数量仅有一个源与一个匹配目标，组间比较属于个案观察。

| 源任务 | 状态 | 首次成功 | 成功前失败数 | 消耗 HP | 动作数 | API 次数 | 服务费用 ¥ |
|---|---|---|---|---|---|---|---|
| A-N0-G1-source | deferred_full_memory | — | — | — | — | 0 | — |
| A-N0-G2-source | deferred_full_memory | — | — | — | — | 0 | — |
| A-N0-G3-source | acquired | 1 | 0 | 0 | 9 | 10 | 0.3442 |
| A-N2-G1-source | deferred_full_memory | — | — | — | — | 0 | — |
| A-N2-G2-source | deferred_full_memory | — | — | — | — | 0 | — |
| A-N2-G3-source | not_acquired | — | — | 100 | 152 | 162 | 12.0698 |
| A-N4-G1-source | deferred_full_memory | — | — | — | — | 0 | — |
| A-N4-G2-source | deferred_full_memory | — | — | — | — | 0 | — |
| A-N4-G3-source | not_acquired | — | — | 100 | 102 | 112 | 7.6982 |


| N | 源状态 | 源 T | 目标上限 | Transfer 状态 / T | Scratch 状态 / T | 目标 HP 消耗 | 源+目标累计 ¥（各臂） |
|---|---|---|---|---|---|---|---|
| 0 | acquired | 1 | 1 | acquired / 1 | acquired / 1 | 0 / 0 | 0.709958 / 0.726366 |
| 2 | not_acquired | — | — | source_not_acquired / — | source_not_acquired / — | — / — | — / — |
| 4 | not_acquired | — | — | source_not_acquired / — | source_not_acquired / — | — / — | — / — |


**实付与用量**　已取得费用的回执合计 ¥20.860088；304 次请求，0 次费用未知。输入 567177 token，输出 69648 token。

**证据范围**　成功是一次实际抵达出口。相同布局与条件的重复验证未预注册，无法把一次通过解释为稳定掌握。仅当完成同预算的 Transfer/Scratch 两臂时才能比较迁移。G1/G2 未执行，无法估计完整记忆或全知观察的效果。

[场景及 Oracle](SCENE-REGISTRY.md) · [预注册协议及成本估算](EXPERIMENT-PROTOCOL.md) · [逐尝试结果](ACQUISITION-RESULTS.md) · [迁移结果](TRANSFER-RESULTS.md) · [模型原文](MEMORY-ANALYSIS.md) · [录像及截图](VIDEO-INDEX.md) · [机器可读汇总](results/layout-transfer-1/summary.json)

## 能力获取与迁移的实际证据

N0 在第 1 次源尝试成功，消耗 0 HP。

N2 在十次尝试内均未通关，First Success Attempt = null。

N4 在十次尝试内均未通关，First Success Attempt = null。

N2 的第 1→2 次在第 1 步首次改变，从 ('MOVE_NORTH', 1) 改为 ('MOVE_WEST', 0.5)，两次最近距离分别为 11.88 m、6.08 m。下一局确实载入了前一局摘要。单次前后变化只能证明行为发生变化。

N4 的第 1→2 次在第 1 步首次改变，从 ('MOVE_NORTH', 1) 改为 ('MOVE_SOUTH', 1)，两次最近距离分别为 11.88 m、7.37 m。下一局确实载入了前一局摘要。单次前后变化只能证明行为发生变化。

B-N0-G3-transfer 首次尝试与源成功路线开头连续相同 9 步（含时长）；载入 1 条摘要，结果 escaped，最近距离 0.63 m。

B-N0-G3-scratch 首次尝试与源成功路线开头连续相同 0 步（含时长）；载入 0 条摘要，结果 escaped，最近距离 0.63 m。

N0 的两臂在首次成功次数上未显示差异。

## 离线对照与局部等待

A-N0-G3-source 的源成功动作原样放入 Layout B 后，执行 9 个动作，结局 escaped，离出口中心 0.63 m。此离线对照测量机械复用路线的表现。

A-N2-G3-source 第 3 次在 1.20 s 等待 2.00 s，随后 MOVE_NORTH 保持安全；从同一真实状态删除等待并立刻执行同一个移动会 seen。

A-N4-G3-source 第 5 次在 7.00 s 等待 1.00 s，随后 MOVE_NORTH 保持安全；从同一真实状态删除等待并立刻执行同一个移动会 seen。

A-N4-G3-source 第 7 次在 7.00 s 等待 1.00 s，随后 MOVE_NORTH 保持安全；从同一真实状态删除等待并立刻执行同一个移动会 seen。

等待对照只验证紧随其后的一个动作。完整清单含终止时有效观察者、受阻移动和全部可比等待动作。[程序化复演记录](results/layout-transfer-1/offline-behavior.json)

## 结论与覆盖范围

三个独立源任务有 1 个在十次内通关。完成同预算配对的目标为 1 个，其中能检验“尝试次数减少”（源 T>1）的有 0 个。

本轮没有获得可检验“动态关卡经验能否减少新布局尝试次数”的成功源。也没有可判定新增机器人后是否发生负迁移的目标配对。

实际返回版本为 gpt-5.6-sol-2026-07-09。收录 23 次尝试、281 次执行动作和 23 条在线终局摘要。服务请求耗时合计 1349.52 秒；原始用量、版本和回执 ID 见 [usage.csv](results/layout-transfer-1/usage.csv)。

## 运行核验

| 项目 | 实测 |
|---|---|
| 有效执行的动作 | 281 |
| 在线终局经验 | 23 |
| 源任务完成数 | 3 |
| 暂停任务数 | 0 |
| 已知 HTTP 非 200 的回执数 | 0 |
| 服务报告费用的已知覆盖 | 304 / 304 |


[回放逐帧与请求核对](results/layout-transfer-1/replay-verification.txt) · [自动测试输出](evidence/layout-transfer-1/test-results.txt) · [构建输出](evidence/layout-transfer-1/build-results.txt)
