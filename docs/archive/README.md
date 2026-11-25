# 按研究阶段归档

归档日期：2026-11-25。采用**原地归档**：保留全部原始路径，以阶段索引和机器可读清单组织研究历史。实验runner含固定路径、恢复哈希、视频来源和跨文件引用，搬动证据会损害复现，因此本轮不移动或去重原文件。

|阶段|日期|内容与状态|
|---|---|---|
|[00 环境](00-environment/README.md)|2026-11-24|仿真/权限/可解性、历史验收|
|[01 程序化学习](01-programmatic-learning/README.md)|2026-11-24|Random/Heuristic M0–M2、Oracle/Mock/Replay、录像验收|
|[02 真实导航](02-real-model-navigation/README.md)|2026-11-24|smoke/A/B、在线与事后反思、费用账本|
|[03 多布局迁移](03-layout-transfer/README.md)|2026-11-24|G3源与有资格目标；G1/G2未执行|
|[04 规则审计](04-rule-audit/README.md)|2026-11-24|失败诊断已存，D0–D5仅题目草稿|
|[05 hybrid诊断](05-hybrid-diagnostics/README.md)|2026-11-25|两个导航主run，A/B/E/H/S单点回复|
|[06 P预测](06-hint-prediction-P/README.md)|2026-11-25|P0–P5实测，原runner缺失|
|[07 T反事实](07-temporal-counterfactual-T/README.md)|2026-11-25|T1–T3实测及T3连接错误，原runner缺失|

日期为报告/目录的阶段标记，不推断精确执行时间。共享代码和配置不强行归入单一历史阶段，实验实际配置优先查各run metadata/输入。

- [整理前全文件分类清单](file-inventory-before.csv)：3058文件，跳过依赖、缓存、dist目录；原路径、类别、阶段、字节、mtime与小型文本SHA-256。
- [阶段机器清单](stages.json)：阶段与原始目录/文件映射；目录条目保留其全部子文件。
- [小型文本精确重复清单](duplicate-small-text.json)：73组，全部保留；不包含大文件或二进制去重。
- [整理前文档快照](snapshots-before-organization/)：原README及原core-info全文，保留原字节；相对链接是当时原位置的链接，不保证在快照目录可直接访问。
- [整理核验](organization-validation.json)：对原研究文件的保留检查及本轮文档检查范围。

[研究日志](../../RESEARCH_LOG.md) · [当前状态](../../PROJECT_STATUS.md) · [复现](../../REPRODUCE.md) · [文件保留政策](../FILE_ORGANIZATION.md)。
