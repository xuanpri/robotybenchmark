# 配对布局迁移

| N | 源状态 | 源 T | 目标上限 | Transfer 状态 / T | Scratch 状态 / T | 目标 HP 消耗 | 源+目标累计 ¥（各臂） |
|---|---|---|---|---|---|---|---|
| 0 | acquired | 1 | 1 | acquired / 1 | acquired / 1 | 0 / 0 | 0.709958 / 0.726366 |
| 2 | not_acquired | — | — | source_not_acquired / — | source_not_acquired / — | — / — | — / — |
| 4 | not_acquired | — | — | source_not_acquired / — | source_not_acquired / — | — / — | — / — |


两个目标臂的累计费用各含同一个源，汇总实付只计一次。仅源 T>1 时，目标成功才构成较少尝试下的成功。

| 共同尝试上限 | 完成配对数 | Transfer 成功 | Scratch 成功 |
|---|---|---|---|
| 1 | 1 | 1 | 1 |


## 固定动作序列对照

A-N0-G3-source 的源成功动作原样放入 Layout B 后，执行 9 个动作，结局 escaped，离出口中心 0.63 m。此离线对照测量机械复用路线的表现。
