# 文件分类、归档与保留说明

2026-11-25。检查覆盖项目原有文件树，内容阅读以源码入口、配置、历史报告、summary/checkpoint和P/T小型请求响应为主。跳过node_modules、dist、.git及缓存目录；大型二进制不读取内容。归档采用原路径索引，不重命名源码、配置、脚本、结果、日志或媒体。零删除、零实验文件搬迁。

## 分类规则

|类别|位置|处理|
|---|---|---|
|源码|src/sim、learning、study、view、video、main.ts|保留模块和import路径|
|配置|config顶层、pilots、study|保留；历史实际参数看run内metadata/输入|
|实验/分析/导出脚本|scripts|保留原入口；下表分组，不移动|
|测试与工具配置|tests、package*.json、tsconfig、vite、HTML、CSS、.gitignore|保留；本轮未运行|
|实验结果与配置快照|results各run|按八阶段索引，保留完整子树|
|原始模型/策略输入输出|wire、journal、requests.jsonl、*-request/response.json|保留重复及失败回执，禁止用去重改变实验边界|
|日志/私有真值/回放|events/actions/memory/observations/private_ground_truth.jsonl、attempt、replay|与实验同目录保留；私有真值不当作模型输入|
|图片与视频|evidence、results内PNG/JPG/MP4及旁置JSON|元信息登记，未解码/哈希大二进制；不重导出|
|研究报告|根目录MD、scripts/dmx-pilot-findings.md|保留原路径，阶段索引链接，根部四主文档更新|
|接口交接材料|docs/core-info|导航样本保留；旧说明加勘误并留原版快照|
|依赖/构建/缓存|node_modules、dist等|跳过内容扫描，未清理|

原地归档使全部旧链接和脚本硬编码继续有效。不同阶段共享同一源码，不将当前源码假装为逐阶段冻结版本；该项目未发现Git提交历史可用于版本映射。

## 脚本分组（原路径不变）

|职责|scripts内文件|
|---|---|
|环境/策略入口|agent.ts、oracle.ts、learn.ts|
|真实模型与事后采集|dmx-pilot.ts、dmx-reflections.ts（会调用模型）|
|真实模型离线审计/派生记录|audit-dmx.ts、check-dmx-ledger.ts、dmx-checkpoint.ts、report-dmx.py|
|多布局设计/执行|study-plan.py、study-scenes.ts、study-run.ts、study-run.sh（后两者调用模型）|
|单次混合输入|hybrid-single.ts（会调用模型）、decision-screenshot.cjs|
|结果分析|compare-learning.ts、stage-stats.py、study-distance.ts、study-behavior.ts、study-difficulty.ts、study-report.py|
|动作/公开投影校验|verify-learning.ts、study-verify.ts、rule-audit.ts|
|浏览器检查|browser-check.cjs、check-studio.cjs|
|录像生成/编码/调度|demo.ts、video.cjs、encode.py、study-video.sh、study-films.py、study-finish.sh|
|录像校验/索引|check-films.py、check-dmx-films.py、study-video-audit.py、film-manifest.py|
|历史研究文字|dmx-pilot-findings.md|
|待确认备份|hybrid-single.ts.bak|

以上脚本会有写派生文件、启动浏览器或调用模型等不同副作用，不能按“scripts都是离线工具”处理。P/T及四组单点诊断的独立runner未找到。

## 临时、重复与可能过时文件

|候选|判断与处理|
|---|---|
|scripts/hybrid-single.ts.bak|与当前.ts不同的旧备份；未发现执行引用，仅旧目录清单提及。保留原地并登记，不能自动认定无价值|
|results/layout-transfer-1/study.lock|0字节flock路径，study-run.sh明确引用；不是可随意删除的废弃日志|
|dist|可再生成的构建产物，已gitignore；可能过时但本轮不判版本/不清理|
|重复配置/intent/response|小型文本哈希73组，见duplicate-small-text.json；重复不代表多余，可能对应独立尝试/阶段|
|docs/core-info的请求/响应副本|用于交接，指向已有真实导航回执；保留来源及副本|
|T3-unordered-previous-error.json|失败证据，不是临时垃圾；保留|
|根目录旧报告、dmx-pilot-findings.md|部分内容重叠但具有阶段语义，且被脚本/报告链接或生成；保留|
|未知用途文件|清单登记，不删除；未发现可据实安全宣称全部废弃的文件|

未发现其他以.tmp/.partial/.log结尾的原有文件；这只是文件名规则结果，不意味着所有临时状态均已识别。journal/wire是持久恢复记录，不能作为缓存清理。未对大型文件做内容比较，不能宣称媒体无重复。

## 清单与完整性范围

[file-inventory-before.csv](archive/file-inventory-before.csv)记录整理前3058文件，合计928834969字节（排除跳过目录）。对≤256 KiB且属于已列文本扩展名的文件计算SHA-256；其他仅登记路径、大小、mtime。hash用于精确字节重复，未做语义去重。清单是本次整理基线，不是持续更新的运行账本。

[stages.json](archive/stages.json)及八阶段README连接所有历史实验目录；主报告[RESEARCH_LOG](../RESEARCH_LOG.md)串联目的、设置、结果、问题和结论；[REPRODUCE](../REPRODUCE.md)区分只读核对和有副作用重跑。

本轮新增docs/archive、FILE_ORGANIZATION及三个根目录研究文档；重写README，core-info加勘误。原README/core-info快照保留。最终核验见[organization-validation.json](archive/organization-validation.json)：原研究文件小型文本比对哈希，其他核对元信息；没有声称对未读取的二进制完成内容校验。
