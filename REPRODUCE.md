# 复现命令与数据路径

本文件区分查看历史结果、离线分析、重跑实验和重新导出视频。**本次整理只读已有证据和写文档，没有执行下列实验、仿真重放、测试、构建、安装或视频命令，没有调用API。** 命令供未来复现使用；结果存在不表示生成入口完整。

## 环境和运行前提

所有命令在项目根目录执行：

```bash
cd /home/jiaxuanren/interview/MultiRobotStealthArena
export PATH=/home/jiaxuanren/miniconda3/envs/codex-env/bin:$PATH
```

依赖以package-lock.json为准。全新环境使用`npm ci`；历史文档记载验收Node 26.13.1，本轮未验证。Python统计脚本主要用标准库；视频另需OpenCV/numpy、puppeteer-core、esbuild、Chromium或@sparticuz/chromium，不全在本项目package.json中。不要为了文档核对自动安装或生成视频。

保留全部wire/journal/checkpoint及元数据。历史任务有目录/配置哈希绑定，不能随意更名、删除账本、改配置后恢复；某些脚本固定输出到原目录。**任何会调用模型的命令都可能在已有回执缺失时新增请求**，不能把恢复模式当作只读操作。

## 只查看已存结果（不重跑）

|阶段|可直接读取的结果|原始证据/配置|
|---|---|---|
|环境|evidence/oracle-seed-1.json；evidence/tests.txt|config/{case,room,patrols}.json|
|程序化记忆|results/pilot-*/summary.json；LEARNING-REPORT.md|同目录metadata、actions/events/requests/memory/observations/private_ground_truth.jsonl、journal和replay；config/pilots|
|真实导航|REAL-AGENT-PILOT.md；results/real-dmx-pilot/{ledger-audit,behavior-audit}.json|同目录wire、smoke/A/B、B/retrospective-memory.json；config/dmx-pilot.json|
|多布局|results/layout-transfer-1/{summary.json,attempts.csv,jobs.csv,transfer.csv,usage.csv}|各job的metadata、checkpoint、attempt-*.json、wire、replay；evidence/layout-transfer-1/scene-manifest.json|
|规则审计|GAME-RULE-AND-FAILURE-AUDIT.md|evidence/rule-audit/{failures,prompts,probes-public,probes-private}.json|
|hybrid主run|results/hybrid-A-N1-{001,known-001}/checkpoint.json|input-config、metadata、wire、decision-*.public.json、PNG、attempt/replay；config/study/hybrid-*.json|
|A/B、E、H、S诊断|hybrid目录下四个时间戳诊断子目录的summary.json|response JSON；部分added_prompt，无独立完整请求/runner|
|P0–P5|results/hint-prediction-pilot-20261125-123433/summary.json|同目录experiment-inputs、ground-truth、system-prompt、六对request/response|
|T1–T3|results/temporal-counterfactual-20261125-123924/{summary,paired-metrics}.json|同目录输入/真值/提示、三对request/response、T3连接错误|

例如（仅解析已有JSON）：

```bash
python3 -m json.tool results/hint-prediction-pilot-20261125-123433/summary.json
python3 -m json.tool results/temporal-counterfactual-20261125-123924/paired-metrics.json
```

浏览回放：`npm run dev`后打开`http://127.0.0.1:5186/studio.html`，加载对应replay.json；不触发模型调用，也不导出新视频。已有视频的路径/原命令见[VIDEO-INDEX](VIDEO-INDEX.md)、[早期film-manifest](evidence/film-manifest.json)及各MP4旁的.json元信息；不扫描或播放二进制也可查来源。

## P/T：可以核对指标，不能完整重建实验

已有request完整保存model/messages；单次system/user，无assistant历史。P输入是current/query_times/可选history或known_dynamics；T输入含current.moving和ordered历史，latent phase只出现在推断/真值。响应读取`choices[0].message.content`，内容为predictions[{time,z}]及inferred_dynamics/uncertainty；P5实际把数字输出为字符串。

**项目内未发现P/T的调用runner、真值生成程序、原解析/计分函数或CLI。因此没有可据实提供的完整重跑命令。** 不用新的API脚本冒充原runner；原请求JSON是输入证据，不是可直接执行的程序。

以下命令只核对已存预测与真值，不运行模型或动力学，不写文件：

```bash
python3 - <<'PYCODE'
from pathlib import Path
import json, math

def read(p): return json.loads(p.read_text())
def check(pred, truth, saved):
    assert len(pred) == len(truth) and len(truth) > 0
    errors = [abs(float(x)-float(y)) for x,y in zip(pred,truth)]
    values = {'ADE':sum(errors)/len(errors), 'FDE':errors[-1],
              'RMSE':math.sqrt(sum(e*e for e in errors)/len(errors)),
              'accuracy_0.1m':sum(e <= 0.1 for e in errors)/len(errors)}
    for k,v in values.items(): assert math.isclose(v,saved[k],abs_tol=1e-10), (k,v,saved[k])
    return values

p=Path('results/hint-prediction-pilot-20261125-123433')
gt=read(p/'ground-truth.json')
for name,row in read(p/'summary.json').items():
    print(name,check(row['predictions'],gt['positions'],row['metrics']))
t=Path('results/temporal-counterfactual-20261125-123924')
gt=read(t/'ground-truth.json')
for name,row in read(t/'summary.json').items():
    for world in ('A','B'):
        print(name,world,check(row['predictions'],gt['world_'+world]['future'],row['metrics_'+world]))
PYCODE
```

一维ADE为平均绝对z误差（在此等同一维欧氏位移误差），FDE取最后查询点，Accuracy按查询点比例计，不是整条轨迹成功率。上例按≤0.1 m核对；现有误差没有刚好0.1 m，无法据此恢复原实现的边界约定。它只核对summary中的预测，不替代原解析器，也不验证真值生成的物理正确性。T3需分别对A/B计分；paired-metrics中的gain是该单配对描述量，无置信区间。

## 历史重跑入口（以下未在本轮执行）

### 环境与程序化策略：不调用API，但会推进仿真/生成结果

```bash
npm test
npm run build
npm run oracle -- 1
printf '%s\n' '{"op":"observe"}' '{"op":"step","action":"WAIT"}' | npm run --silent agent -- 1
npm run learn -- config/pilots/random-M0.json results/reproduction-random-M0
npm run learn -- config/pilots/heuristic-M2.json results/reproduction-heuristic-M2
npm run learn -- config/pilots/oracle-verification.json results/reproduction-oracle
```

六组配对分别用`config/pilots/{random,heuristic}-M{0,1,2}.json`，为每组选择新目录。接口/导出验证配置为`film-mock.json`、`film-random.json`、`film-oracle.json`、`replay-mock.json`。Replay配置引用既有动作文件，保留原文件路径。对应历史数据在results/pilot-*，详细设置见LEARNING.md。验证命令为`node --import tsx scripts/verify-learning.ts <run-dir>`，会重放已存动作，本轮未执行。

### 真实模型导航：会调用API/产生费用

需原先登记的DMXAPI_API_KEY和DMXAPI_BASE_URL，不能用本文命令绕过授权或配额。输出路径受代码限制，保留原账本：

```bash
npm run learn -- config/dmx-pilot.json results/real-dmx-pilot/smoke
npm run learn -- config/dmx-pilot.json results/real-dmx-pilot/A
npm run learn -- config/dmx-pilot.json results/real-dmx-pilot/B
```

不得自动执行`dmx-reflections.ts`：它会补采模型反思；历史补采不能进入原实验。`DMX_RESUME_KNOWN_FAILURE=1`只用于人工核实后的恢复，不能假定未知在途请求失败。B探索阶段116请求和最终121请求（含5次补采）须分开。

### 多布局与hybrid：会调用API；路径存在固定绑定

```bash
bash scripts/study-run.sh
# 仅核实已知HTTP故障之后才考虑：bash scripts/study-run.sh --retry-known
node --import tsx scripts/hybrid-single.ts config/study/hybrid-single.json results/reproduction-hybrid-new --run
node --import tsx scripts/hybrid-single.ts config/study/hybrid-known.json results/reproduction-hybrid-known-new --run
```

G3入口固定用results/layout-transfer-1和config/study/design.json，仅在源成功后启动目标。hybrid要求新目录，已存在即拒绝；历史目录不能覆盖。hybrid截图需额外浏览器依赖，并在API前导出当前帧。当前源码与历史版本没有Git提交映射，模型服务版本、默认采样也可能变化，不能保证重新调用逐字一致。

### 离线重放/分析：不调用模型，但可能改写派生报告

下列是已有入口，**并非只读**。重算前应保存报告快照；本轮未执行。

```bash
node --import tsx scripts/audit-dmx.ts smoke A B
node --import tsx scripts/check-dmx-ledger.ts
python3 scripts/report-dmx.py
node --import tsx scripts/study-verify.ts
node --import tsx scripts/study-distance.ts
node --import tsx scripts/study-behavior.ts
node --import tsx scripts/study-difficulty.ts
python3 scripts/study-report.py
node --import tsx scripts/rule-audit.ts
```

输出分别在results/real-dmx-pilot、results/layout-transfer-1、evidence/layout-transfer-1、evidence/rule-audit及根目录历史报告。`study-scenes.ts`会重新搜索/生成场景与登记，`study-finish.sh`会轮询、重算并导出视频，不能当作单纯核对命令。D0–D5题目生成不等同模型答题，未找到答题runner。

### 视频历史生成方式：本轮禁止执行

以下仅记录现有导出接口，供以后明确需要时使用；NEW_OUTPUT要求新输出路径，不覆盖原视频。

```bash
npm run video -- results/hybrid-A-N1-001/replay.json NEW_OUTPUT.mp4 split simulation
```

早期视频命令与SHA见evidence/film-manifest.json；多布局按`scripts/study-video.sh scenes|experiments`导出；各MP4旁.json记录来源。MP4存在和既有审计报告不能替代本轮重新解码验证，本轮未做后者。

## 尚不能完整复现的部分

- P/T缺原runner、真值生成和计分代码；可以检查已存输入/回执与指标，不能声称端到端可重跑。
- E/H/S及A/B单点诊断缺完整request/候选真值/续局，只能复核已存回复，不能恢复全部实验。
- T3失败只存Connection error，未知服务是否计费；不推断物理请求总数。
- 研究RQ正式定义和预注册版本缺失；旧报告和当前源码缺Git提交对应。
- 浏览器/视频额外依赖未完整锁定；本机绝对路径仅属历史环境，换机器需适配，不代表已验收可移植。
