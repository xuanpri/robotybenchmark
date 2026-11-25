# 研究迭代日志

整理日期：2026-11-25。依据已有报告、配置、checkpoint、summary 和小型原始请求/响应整理。本轮没有调用 API、重跑实验、重放仿真或生成视频。阶段顺序依据研究依赖、报告和目录命名；mtime 不是完整实验时间线。[阶段证据索引](docs/archive/README.md)。

“已执行”表示有结果或回执；“离线分析已存”表示已有产物；“计划”不计成绩。不同阶段的预算、观测、统计单位不同，不混合计算成功率。以下诊断目的部分据条件命名及已存提示重建，不代表曾预注册。

## 00：环境、权限与可解性（2026-11-24）

目的/设置：建立确定性潜行环境，验证时间、碰撞、遮挡与局部权限。默认 24×16 m、四机器人、seed 1，接触或发现即失败；动作 0.1 s，子步 0.01 s。机器人独立解析巡逻，玩家按子步移动，无机器人相互避让。

已存结果：特权加权 A* 扩展 429 状态，118 基础动作含 32 WAIT，11.75 s 通关；同路线删 WAIT 在 1.01 s 被发现。已有测试与浏览器检查。

问题/结论：等待时序影响默认实例，但单个 Oracle 成功只证明该实例可解，不保证最优、完备或任意扰动可解。渲染为斜俯视正交图。证据：[Oracle](evidence/oracle-seed-1.json)、[测试](evidence/tests.txt)、[浏览器](evidence/browser-check.json)、[归档](docs/archive/00-environment/README.md)。

## 01：程序化失败记忆与管线验证（2026-11-24）

目的：先验证 HP、Same 重试、记忆、预算、日志、回放与导出。设置：同地图/相位、最多十次、HP100/失败扣10、每次20 s/100决策；Random 按试次匹配随机流；M0 无记忆、M1 原始经验、M2 摘要。程序记忆上限4096 UTF-8字节，不是模型token。

|已执行条件|尝试|决策|SR@10|平均生存秒|发现|
|---|---:|---:|---:|---:|---|
|Random M0|10|103|0|4.58|不读记忆|
|Random M1|10|103|0|4.58|轨迹同 M0|
|Random M2|10|103|0|4.58|轨迹同 M0|
|Heuristic M0|10|90|0|1.70|重复被发现|
|Heuristic M1|10|90|0|1.70|未带来通关|
|Heuristic M2|10|236|0|4.64|路线改变，但平均终点更远|

M2 第十次生存7.76 s，平均终点距出口13.28 m，高于 M0 的11.95 m。结论：手写策略根据经验改变行为，不代表恢复隐藏动力学或掌握通关。

附属已执行验证：Oracle 探索首次成功、mastery三次成功；FreshDynamics重新规划18.15 s通关；PhaseShift在reset时0 s/0动作即seen。原始迁移1/2，但一个世界没有行动机会，不能据此估计正常迁移能力。Mock两次0.43 s接触、Replay重现一次、随机短片两次开发时限结束、film-oracle一次成功，均属接口/导出验证。

历史报告记载24项测试通过、11份记录的72尝试/974决策重放一致、23个MP4校验；本轮未复验。此阶段LLM请求为0。模型注册不等于完成对照；local-smoke与本地跨模型比较未执行。

证据：[报告](LEARNING-REPORT.md)、[协议](LEARNING.md)、results/pilot-*/summary.json、[阶段统计](evidence/learning-stage-stats.json)、[归档](docs/archive/01-programmatic-learning/README.md)。

## 02：真实模型 smoke、A/B 导航（2026-11-24）

目的/设置：验证按观察决策和摘要重试。返回模型gpt-5.6-sol-2026-07-09；请求仅model/messages，采样用提供方默认。smoke验证接口；A给全知当前状态单次探索；B给局部状态、Same/M2十次探索。

|条件|动作|实际结果|物理请求（含反思）|服务报价 ¥|
|---|---:|---|---:|---:|
|smoke|2|1.01 s seen，反馈检查通过|3|0.1412|
|A|13|10.56 s 被R1发现|13|0.9845|
|B|111|十次未通关：7 seen、3 token_budget|121|9.3407|

合计137回执、报价¥10.4665。B/summary.json的requests=116不含五份事后补采；最终总数以wire账本为准。只有五份在线反思参与后续决策；另外五份availableDuringExperiment=false，不能倒算改善了历史行为。

发现：A局部等待有离线反事实支持；B后期复用0.2 s等待穿越，仍漏判另一处风险。窄缝误判受未公开直径混淆；token门槛与学习失败混在最终成绩中。

结论：局部行为变化和正确等待存在，但无通关/稳定掌握证据。证据：[逐次结果、模型原话](REAL-AGENT-PILOT.md)、[账本审计](results/real-dmx-pilot/ledger-audit.json)、[归档](docs/archive/02-real-model-navigation/README.md)。

## 03：多布局 G3 学习与迁移（2026-11-24）

目的：检验压缩经验能否减少新布局尝试次数。三布局A/B/C共15场景，保存配置、哈希、Oracle见证。场景名P1/P2是巡逻相位模式，与后来的预测P系列无关。活动组仅G3×N0/N2/N4；G1/G2全历史对照暂缓。

设置：seed1，HP100/失败扣10；每次60决策、90 s，合法时长0.2/0.5/1 s；局部当前帧、地图、最近四条公开决策、此前在线摘要。A源最多十次，首次成功停止；B transfer/scratch上限max(1,T−1)。未预注册稳定掌握复验。

|已执行任务|尝试|首次成功|决策|结果|
|---|---:|---:|---:|---|
|A-N0-G3-source|1|1|9|escaped，7.07 s|
|A-N2-G3-source|10|无|152|十次seen，HP耗尽|
|A-N4-G3-source|10|无|102|十次seen，HP耗尽|
|B-N0-G3-transfer|1|1|9|escaped，7.07 s|
|B-N0-G3-scratch|1|1|9|escaped，7.27 s|

共23尝试、281动作、23在线摘要、304模型回执、报价¥20.860088。N2/N4源未成功，其B目标臂未启动，不能记作目标失败。N0两臂都首次成功，源路线直接复制到B也成功，没有T>1到更少尝试的有效配对。

离线已存：部分WAIT对紧随的一个动作有效；新增机器人危险性依赖候选路线/出发时刻；0.25 m静态可通行距离与欧氏距离分别记录。距离改善不等于通关提升。

问题/结论：动态成功源迁移、G1/G2、统计泛化未完成。完整23行逐尝试结果在[ACQUISITION-RESULTS](ACQUISITION-RESULTS.md)和[attempts.csv](results/layout-transfer-1/attempts.csv)，不在此重复抄写。证据：[综合报告](MULTI-SCENE-LEARNING-STUDY.md)、[迁移](TRANSFER-RESULTS.md)、[经验](MEMORY-ANALYSIS.md)、[归档](docs/archive/03-layout-transfer/README.md)。

## 04：规则与失败审计、D0–D5 草稿（2026-11-24）

目的：分离规则缺项、几何、动力学与动作风险，避免全部归因为记忆。已有分析对齐N2/N4二十次终局、真实请求/动作/0.01 s真值，枚举15个动作时长组合。

发现：提示缺少角色半径、墙扩张、区间检测细节；北墙与divider净宽0.52 m小于玩家直径0.56 m。失败可能发生在动作提交后首次无遮挡子步，期间不能再观察；反馈不提供发现者ID。保留受阻经验不等于算对净空。

已完成：审计与D0–D5公开题/私有答案生成。未找到正式答题回执；补全规则是待验证方案。D4/D5额外公开巡逻配置，不等同原导航信息条件。证据：[审计](GAME-RULE-AND-FAILURE-AUDIT.md)、[公开题](evidence/rule-audit/probes-public.json)、[私有答案](evidence/rule-audit/probes-private.json)、[归档](docs/archive/04-rule-audit/README.md)。

## 05：单机器人 hybrid 与能力拆解（2026-11-25）

目的：在简化环境区分动力学知识、预测、风险判断、动作选择、目标措辞。两个主run均A/N1/seed1，全知当前帧、文本+当前图片、完整本次历史、M0单尝试；known版公开巡逻节点/速度/停顿/转向。

|主run|差异|动作|实际结果|
|---|---|---:|---|
|hybrid-A-N1-001|未公开巡逻参数|3|2.56 s seen|
|hybrid-A-N1-known-001|公开巡逻参数|4|2.46 s seen|

二者都失败；每条件一次，不能判断公开动力学有害或无效。下表是已存单点诊断回复，不是完整续局实验。

|诊断|目的/设置|已存结果|限制|
|---|---|---|---|
|diagnosis A/B|补动力学或全区间风险提醒|A改WEST0.2；B仍NORTH1；原control NORTH1在2.56 s seen|无干预后整局结果|
|gap-diagnosis E0–E4|端到端、位置预测、风险分类、预测Oracle、风险Oracle|E1给四个未来位置/阶段；E2报A/B/D safe、C unsafe；E0/E3/E4选B|缺完整请求/候选题干/评分真值，不能判选B正确|
|acting-gap H00/H10/H01/H11|候选枚举×局部目标2×2|control/仅候选NORTH1；局部目标/组合NORTH0.5|control复用主run；其他单次回复无完整续局|
|goal-gap S00/S10/S01/S11|安全×进度目标2×2|仅安全NORTH0.5，其余NORTH1|与H11相近措辞回复不稳定，缺重复|

这些子目录保存response与summary，部分added_prompt在summary；未找到独立完整request或生成runner。只有两个主run的wire/metadata/input-config/replay链较完整。结论：整体导航成绩难以定位模块问题；转向独立位置预测有助于减少混淆，现有诊断不足以稳健归因。证据：[阶段索引及全部子目录](docs/archive/05-hybrid-diagnostics/README.md)。

## 06：Hint-based Future Prediction，P0–P5（2026-11-25）

目的：移除玩家控制与风险评价，观察历史Hint对一维预测的影响。每条件一个成功响应，模型gpt-5.6-sol-2026-07-09；每次独立system/user文本JSON，无图像或assistant对话历史。请求仅model/messages，未固定采样参数。

真值：z端点2/6，速度1 m/s，端点pause0.5 s+turn0.5 s，期间位置静止，周期10 s。当前z=3朝北；查询[0.5,1.5,2.5,5,6.5,8.5,10.5]，真值[2.5,2,2.5,5,6,4.5,2.5]。这是独立的一维设置，不能套用原R1参数。

|已执行条件/已存基线|Hint|ADE m|Accuracy@0.1m|发现|
|---|---|---:|---:|---|
|静止基线（数组）|保持z=3|1.285714|0/7|同P1|
|匀速基线（数组）|向北速度1|5.571429|1/7|同P2|
|P0_known_dynamics|全部参数和阶段|0|7/7|数值推演对照|
|P1_current_only|当前位置/朝向|1.285714|0/7|承认信息不足，静止估计|
|P2_short_history|4点有序，间隔0.5 s|5.571429|1/7|直线外推，未观察到端点|
|P3_one_cycle|20点有序，一周期|0|7/7|恢复总驻留与运动|
|P4_two_cycles|40点有序，两周期|0.071429|6/7|t=8.5错0.5 m|
|P5_shuffled_history|P3同一位置多重集，无序|0|7/7|该简单设置仍能推断未来|

结论/问题：完整周期在此样例比当前帧/短历史准，但短历史长时误差甚至高于静止；更多历史不保证更准。P5全对意味着不能证明顺序必要。位置数据也不能单独区分pause/turn内部拆分，只能支持总驻留。模型自述“唯一确定”不是证明。

[输入](results/hint-prediction-pilot-20261125-123433/experiment-inputs.json)、[真值](results/hint-prediction-pilot-20261125-123433/ground-truth.json)、[指标/原话](results/hint-prediction-pilot-20261125-123433/summary.json)、同目录六对request/response/system-prompt完整保留。六成功响应报价合计¥0.443962，不代表核对了账户扣款。未找到持久化生成/调用/计分runner，属复现缺口。[归档](docs/archive/06-hint-prediction-P/README.md)。

## 07：T1–T3 时间顺序配对反事实（2026-11-25）

目的：针对P5不依赖顺序的问题，构造同当前观测、同无序历史但不同未来的两世界。提示显式给出模型族：固定端点/速度，北端驻留按两值交替，南端驻留恒定，数值及当前交替相位未知。比P有更强结构先验，两系列不宜直接当同难度比较。

设置：当前z=3朝北、moving=true；40点历史，间隔0.5 s。A/B端点2/6、速度1、南端驻留1 s、北端0.5/1.5 s交替。A最近北端1.5/下次0.5；B相反。查询[2,2.5,3,5,7.5,9]。

|条件|匹配真值|预测|ADE m|Accuracy@0.1m|
|---|---|---|---:|---:|
|T1_ordered|A|[2.5,3,3.5,5.5,5,3.5]|0|6/6|
|T2_ordered|B|[2,2,2.5,4.5,6,4.5]|0|6/6|
|T3_unordered|A或B|[2.25,2.5,3,5,5.5,4]|0.458333（两者均）|0/6（两者均）|

已存paired-metrics：ordered_accuracy=1、unordered_accuracy=0、temporal_hint_gain_pp=100、temporal_ADE_gain=0.458333、paired_counterfactual_accuracy=1。T1对B、T2对A交叉ADE均0.916667、Accuracy=0。只描述一个配对和固定查询，不是独立样本显著性。

信息充分性证据：A/B有序序列不同、位置多重集相同、当前相同、六未来点均不同，故共同无序输入不能唯一确定未来。T3把last/next north dwell置null，承认相位歧义，返回两未来均值；0%阈值准确率是不可辨识下的折中，不能直接称作模型不会用Hint。有限有序样本在未约束参数空间中的全局唯一性仍无程序证明。

异常：T3-unordered-previous-error.json保存Connection error，后来有成功response；缺完整失败传输回执，不能声称只发生三次物理请求或未知失败免费。三成功响应报价¥0.462546。

证据：[输入](results/temporal-counterfactual-20261125-123924/experiment-inputs.json)、[双世界真值](results/temporal-counterfactual-20261125-123924/ground-truth.json)、[逐条件指标](results/temporal-counterfactual-20261125-123924/summary.json)、[配对指标](results/temporal-counterfactual-20261125-123924/paired-metrics.json)、同目录request/response/system/error；[归档](docs/archive/07-temporal-counterfactual-T/README.md)。未找到持久化生成/计分runner；本轮只核对已有输入、输出、数值一致性，未重新生成轨迹。

## 当前研究问题与未执行项

原文件未发现RQ1/RQ2/RQ3正式定义。暂将“Hint信息量”“时间顺序/潜在相位”“复杂世界泛化/充分性校验”作为工作映射，非恢复出的预注册编号，正式定义待协议确认。[当前证据矩阵](PROJECT_STATUS.md)。

未执行：多实例/多种子/多模型重复、噪声/遮挡Hint、多机器人预测、匹配图文对照、Hint预算匹配、有序输入参数可辨识枚举、预测到导航的闭环。D0–D5答题、G1/G2、动态成功源迁移、本地模型对照也未完成。

## 本轮勘误与归档

旧core-info误写“未找到P/T与ADE”。实际已有P/T结果和指标，缺持久化入口/计分实现与通用充分性Oracle。旧原文已快照，现文增加勘误；导航样本仍原样保留。源代码、配置、实验数据、日志、视频、既有历史报告均保持原路径与内容。
