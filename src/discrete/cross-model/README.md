# Phase 2.4 — cross-model golden slices

新代码仅在本目录及 `scripts/discrete-cross-model.ts`，输出在 `src/discrete/artifacts/cross-model-v1/`，不渲染视频。所有原始 GPT 基线、环境、原 Prompt 工厂、视觉渲染器和旧脚本只读。protected-before/audit 记录2692个既有文件的内容哈希。

## 模型与运行

网关 `/models` 发现的标题指定标准ID为 `claude-opus-5-5` 和 `gemini-4-argon`，未选 -cc/-ssvip 路由变体。完整列表保存到 model-discovery.json；manifest 记录选择与预算，原始响应保留实际返回 model ID。每个模型各一次文本、一次旧 preview/partial-window-visible.png 图像预检，全部通过才批量运行。它们的预检图像位置/朝向也必须正确。GPT 的新调用由 provider 直接禁止，基线全为只读。

```bash
node --import tsx scripts/discrete-cross-model.ts --local-only
node --import tsx scripts/discrete-cross-model.ts --claude-model claude-opus-5-5 --gemini-model gemini-4-argon --max-budget-per-model-rmb 15 --no-video
node --import tsx src/discrete/cross-model/verify.ts
python src/discrete/cross-model/plot.py
python src/discrete/cross-model/finish.py
```

模型ID也支持CLI显式覆盖；必须在查询列表中。首次选择与核心适配器/执行器源码哈希被冻结，恢复时拒绝替换。已完成局直接复用，未完成局从自己的已完成步骤重建，不跨模型/切片/seed/phase/attempt借用回执。未知在途请求不重试，传输错误保留并中止该模型；不得通过删除成功回执重新采样。

每个模型内部按A的6 seeds、B的6 seeds、C的4 phases顺序执行，同一seed最多3次、成功早停，C最多1次。两个模型可以同时运行，各模型内部始终一个在途请求。每个模型含预检的实际网关RMB达到14.50就停止发新请求，0.50为在途单请求缓冲，不是网关服务端输出费用限制。缺少价格字段会停止该模型，不虚构汇率/费率；本次所有已返回回执均含真实人民币cost，因此没有使用价格估算。后一模型不受前一模型预算耗尽影响。

较长的窗口观察和完整历史可能在A中消耗大部分预算；后续B/C可以完全未测。这是预算受限执行，不是把未测项目计为0分。新模型预检图像正确不能替代C正式四局。若需完整三个切片覆盖，应另行设计分片预算；本次执行中不改变既定顺序、Prompt或费用上限。

## 严格同协议

A/B直接调用 `dynamics/world.instance` 和 `dynamics/protocol.messages/observe/parse`，包含相同seed、PRNG、局内/跨轮历史结构、隐藏观测及PEEK时序。执行上限是3，但模板中原有maxAttempts=5保持原样：改成3会违反“模型名以外载荷一致”。GPT同样只截取attempt<=3。C直接复用 `vision/textMessages/compact/parse/perception/attribute` 和原渲染器，周期8、相位0/1/2/4；每次只有当前PNG，文本历史仅自身JSON估计。

相同协议不等于强迫不同模型走GPT的轨迹：实际行动、可见观测和自己的推理文本自然不同，序列化工厂和数据权限完全相同。测试逐条重建全部选中GPT原始text wire和vision文本/图像载荷，断言替换model字段后相等。新模型只自动剥离覆盖整段输出的Markdown JSON代码块，其他错误严格归Format Error，没有额外修复、动作fallback或正确性反馈。

provider 只读使用现有DMXAPI环境变量，OpenAI兼容chat/completions，无temperature/max_tokens/response_format附加参数。保留完整raw响应、usage、响应ID、返回模型名和费用。图像请求在网络中用base64 data URI，wire归档用PNG相对路径+SHA，另存实际payloadSHA；可从PNG重建逐字验证。输出token使用completion_tokens或output_tokens，输入使用prompt_tokens或input_tokens，不把reasoning子项再重复相加。

## 统计与核验

- 三表包含固定六seed Pass@1..3、cap3截尾平均轮次、可见/隐藏联合预测及Age1/2/3/4+、即时归因、请求与历史/新增费用；B额外给PEEK均值和(4,3)占比；C给三项感知和五细分归因。
- 不完整cohort的Pass只是已观察成功数的下界，不能与完整cohort做最终排名；截尾均值为null。有效的部分局预测和费用保留，PEEK每局均值只用已完成尝试。预算中断不是Format/Prediction/Planning错误。
- GPT表中费用为历史费用、新增为0；模型总费用含各自2次预检，主表只显示切片步骤费用。
- 对比图在左侧给A/B曲线（完整为实线，未完整为观察下界虚线）和隐藏预测（*为部分步骤），右侧给C感知/预测/通关；未测图柱为N/A，不补0。
- 79项全量测试已执行。verify.ts重建每个新模型请求、PRNG世界、公开历史、评分/归因及图像，检查所有原始文件、冻结核心哈希和TypeScript。finish.py给未完成局补写自身public-history侧档，并在报告补充覆盖范围说明，不触碰旧数据。

## 本次 A/C 断点续跑

用户授权累计上限提高为25元，执行范围限定A/C：

```bash
node --import tsx scripts/discrete-cross-model.ts --slices A,C --max-budget-per-model-rmb 25 --no-video
```

manifest v2的selectedSlices记录A,C，B标记Deferred (cost control)，原manifest保存在manifest-history。sources仍固定原provider/experiment核心哈希，Prompt/环境/缓存键没有变化。resume-baseline.json保存续跑开始时252份原始wire的SHA及每模型123/129份回执、已花14.551820/14.504894元。历史、本次新增、累计费用和请求数分开统计；252份历史wire逐字不变。3项resume.test.ts通过禁止fetch的方法实际重放全部252条缓存（0网络调用），不是只看文件存在。

complete现在表示所选A/C评测范围全部完成，fullMatrixComplete保留全A/B/C矩阵状态；B的历史GPT参考仍可读，但新模型不执行B。旧预算stop.json移入各模型stop-history，保留停止事件以便审计。A的completedCases=6表示六seed都评测结束（包括cap3耗尽仍失败），不代表通关率6/6。C同理。

验收总计82项测试（原全量79及缓存续跑3项），verify.ts同时核验旧252份回执哈希、实际请求重建与累计25元预算。summary.complete可为true而fullMatrixComplete为false，这是B被显式延期的结果。未来可用--slices B继续，现有A/C缓存和原始wire不会删除。
