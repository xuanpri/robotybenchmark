# Phase 2.2b

只读输入：`src/discrete/artifacts/phase2-v2/`。输出：`src/discrete/artifacts/phase2-v2b/`。默认不渲染视频。

- `node --import tsx scripts/discrete-phase2-2b.ts --local-only`：仅重建本地审计、跑模拟 fetch 测试及汇总，不发真实模型请求。
- `node --import tsx scripts/discrete-phase2-2b.ts --no-video`：本地审计和测试通过后执行消融；完成的 seed/attempt 从自身目录恢复，绝不跨 attempt 复用回执。
- `node --import tsx src/discrete/audit/check.ts`：逐条重建 Memory-off 请求、验证世界状态。
- `python src/discrete/audit/finish.py`：导出摘录和匹配口径表，核验公开历史隔离、响应 ID、旧数据哈希。

Bayesian filter 已知真实随机核，以合法初始窗口观测为起点。在每步预测前计算后验的下一步联合分布及 MAP 概率；预测后再用合法输出（包括继续存活/死亡原因和窗口观测）更新后验。前一尝试与本次独立，不提供当前隐藏状态。主 ceiling 是平均 MAP 后验概率，即条件期望，不是有限样本实际命中率的硬上限；另存固定字典序打破平局后的实际 MAP 命中率。LLM 自身动作导致的观测/存活筛选保留，因此比较的是相同合法历史上的预测，未优化控制策略。

过期规则有三种诊断：旧参数直接作用于当前真实内部计数器（主表；越出旧巡逻范围为 null）、在匹配当前位置与朝向的旧周期隐状态中检查预测支持、旧尝试同 elapsed tick 轨迹匹配。跨模式内部计数器未必可由旧规律到达，因此第一种仅是 oracle-assisted 反事实诊断；后两种提供不同对齐的敏感性检查。任何一种吻合都不能单独证明因果依赖，需结合 reason 原文。seed105 的逐步完整 reason 保存在 JSON，摘录在 LOCAL-DETAILS.md。

Memory-off 保留局内观测与自身预测，每次重试的 previous_attempts 固定空数组、顶层和 active_attempt 的 attempt 固定 1；真实 seed/attempt 仅出现在本地目录和私有 run 元数据。完整档案键是 `...seed-N-attempt-K/wire/tick-T-0.json`；同 seed 的不同 K 即使 Prompt hash 相同，也会产生新的真实请求。仅中断恢复同一个 K 时复用其回执。sampling-audit 检查返回 ID 唯一性，request-reconstruction 检查完整请求一致性。

预算按原始回执 usage.cost 的 RMB 累计，每次新请求前预留0.30元；不并发、不渲染。远端单请求费用未知，预留不是服务端硬费用上限；本次最终实际费用3.885898元，97次请求，18局。完整六 seed 消融已完成，未触发预算停止。

成功条件均值只统计通关 seed，同时报告覆盖数与失败按5计的截尾均值。随机旧数据12次失败仅在新表重标 Stochastic Realization Error；旧 wire/run/summary 均未改写，原反事实归因现在明确限定为 Immediate Counterfactual Attribution。
