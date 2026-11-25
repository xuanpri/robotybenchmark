# 游戏规则与失败审计

逐请求比对实际回复和执行动作。以下可见指模型决策帧；中途状态仅供离线分析。[完整请求、记忆、理由、逐百分秒状态及所有分支](evidence/rule-audit/failures.json)。

|Rule|Simulator Actual Definition|Actual Prompt Description|Explicit / Ambiguous / Missing|Evidence Path|
|---|---|---|---|---|
|坐标与方向|东 +x，南 +z|[east,south] 坐标、北向及 heading 约定|Explicit|[模拟器](src/sim/world.ts) · [真实请求](results/layout-transfer-1/A-N2-G3-source/wire/1-act-4-0.json)|
|玩家速度|2.5 m/s|2.5 m/s|Explicit|[模拟器](src/sim/world.ts) · [真实请求](results/layout-transfer-1/A-N2-G3-source/wire/1-act-4-0.json)|
|玩家半径|0.28 m|未给|Missing|[模拟器](src/sim/world.ts) · [真实请求](results/layout-transfer-1/A-N2-G3-source/wire/1-act-4-0.json)|
|墙体|闭矩形，移动按玩家半径扩张|每局 map.walls 全部边界|Explicit（边界）；Missing（扩张）|[模拟器](src/sim/world.ts) · [真实请求](results/layout-transfer-1/A-N2-G3-source/wire/1-act-4-0.json)|
|机器人速度|各巡逻配置独立；观察仅 id/position/heading|未给实时速度或规律|Missing|[模拟器](src/sim/world.ts) · [真实请求](results/layout-transfer-1/A-N2-G3-source/wire/1-act-4-0.json)|
|朝向|从东向南，弧度|heading in radians|Explicit|[模拟器](src/sim/world.ts) · [真实请求](results/layout-transfer-1/A-N2-G3-source/wire/1-act-4-0.json)|
|视野角/距离|总角 90°；中心距离 ≤5 m|90 degree, 5 m|Explicit|[模拟器](src/sim/world.ts) · [真实请求](results/layout-transfer-1/A-N2-G3-source/wire/1-act-4-0.json)|
|接触|机器人半径 0.34 m；扫掠圆心距离 ≤0.62|avoid contact|Missing（半径）|[模拟器](src/sim/world.ts) · [真实请求](results/layout-transfer-1/A-N2-G3-source/wire/1-act-4-0.json)|
|遮挡|中心线与任意墙相交含相切则遮挡|unobstructed|Ambiguous|[模拟器](src/sim/world.ts) · [真实请求](results/layout-transfer-1/A-N2-G3-source/wire/1-act-4-0.json)|
|发现即失败、无需接触|seen/contact 任一立即终止|avoid contact and … vision|Ambiguous|[模拟器](src/sim/world.ts) · [真实请求](results/layout-transfer-1/A-N2-G3-source/wire/1-act-4-0.json)|
|WAIT/MOVE 时巡逻|两者都推进机器人|只明确思考时停止|Ambiguous|[模拟器](src/sim/world.ts) · [真实请求](results/layout-transfer-1/A-N2-G3-source/wire/1-act-4-0.json)|
|完整区间检测|每 0.01 秒扫掠接触、采样视野|未给|Missing|[模拟器](src/sim/world.ts) · [真实请求](results/layout-transfer-1/A-N2-G3-source/wire/1-act-4-0.json)|
|动作期间观察|只在下一次决策返回更新|每次请求一帧及历史|Ambiguous|[模拟器](src/sim/world.ts) · [真实请求](results/layout-transfer-1/A-N2-G3-source/wire/1-act-4-0.json)|
|终局观察者身份|只返回 seen，未标注观察者|终局回执 current.outcome|Missing|[模拟器](src/sim/world.ts) · [真实请求](results/layout-transfer-1/A-N2-G3-source/wire/1-act-4-0.json)|

## 二十次终局

|N|尝试|动作起止/失败秒|动作与请求秒数|发现者|决策可见 IDs|发现者首次可见秒|朝向变化|首次离开遮挡秒|此前受阻动作|安全候选/15|原始证据|
|---|---|---|---|---|---|---|---|---|---|---|---|
|2|1|1.4–1.7|MOVE_NORTH 1|R1|R1|1.4|否|—|0|11|[回执](results/layout-transfer-1/A-N2-G3-source/wire/1-act-4-0.json)|
|2|2|13.7–13.79|MOVE_EAST 1|R1|R1,R2|13.7|是|—|4|0|[回执](results/layout-transfer-1/A-N2-G3-source/wire/2-act-19-0.json)|
|2|3|8.2–9.11|MOVE_EAST 1|R2|无|8.85|否|—|0|14|[回执](results/layout-transfer-1/A-N2-G3-source/wire/3-act-10-0.json)|
|2|4|11.7–12.46|MOVE_NORTH 1|R2|R1|12.46|否|12.46|2|14|[回执](results/layout-transfer-1/A-N2-G3-source/wire/4-act-14-0.json)|
|2|5|13.2–13.35|MOVE_EAST 1|R2|R1,R2|13.2|否|—|0|6|[回执](results/layout-transfer-1/A-N2-G3-source/wire/5-act-15-0.json)|
|2|6|13.4–13.52|MOVE_SOUTH 0.5|R1|无|13.52|是|13.52|0|12|[回执](results/layout-transfer-1/A-N2-G3-source/wire/6-act-22-0.json)|
|2|7|12.7–12.72|WAIT 0.5|R2|R1,R2|12.7|否|—|3|2|[回执](results/layout-transfer-1/A-N2-G3-source/wire/7-act-16-0.json)|
|2|8|10.9–11.73|MOVE_SOUTH 1|R2|无|11.58|否|11.58|1|14|[回执](results/layout-transfer-1/A-N2-G3-source/wire/8-act-18-0.json)|
|2|9|10.5–11.4|MOVE_SOUTH 1|R2|无|11.1|否|11.1|1|14|[回执](results/layout-transfer-1/A-N2-G3-source/wire/9-act-13-0.json)|
|2|10|13.3–13.46|MOVE_SOUTH 0.2|R2|无|13.46|否|13.46|1|9|[回执](results/layout-transfer-1/A-N2-G3-source/wire/10-act-21-0.json)|
|4|1|1–1.01|MOVE_NORTH 1|R1|R1|1|否|—|0|9|[回执](results/layout-transfer-1/A-N4-G3-source/wire/1-act-2-0.json)|
|4|2|7–7.48|MOVE_EAST 1|R3|R3|7|是|—|0|11|[回执](results/layout-transfer-1/A-N4-G3-source/wire/2-act-8-0.json)|
|4|3|7–7.48|MOVE_NORTH 1|R3|R3|7|是|—|0|11|[回执](results/layout-transfer-1/A-N4-G3-source/wire/3-act-8-0.json)|
|4|4|10–10.41|MOVE_NORTH 1|R2|R2,R3|10|否|—|0|8|[回执](results/layout-transfer-1/A-N4-G3-source/wire/4-act-11-0.json)|
|4|5|10.9–11.35|MOVE_NORTH 1|R2|R1,R2,R3|10.9|否|—|1|8|[回执](results/layout-transfer-1/A-N4-G3-source/wire/5-act-14-0.json)|
|4|6|7–7.48|MOVE_NORTH 1|R3|R3|7|是|—|0|11|[回执](results/layout-transfer-1/A-N4-G3-source/wire/6-act-8-0.json)|
|4|7|10–10.16|MOVE_NORTH 1|R1|R1,R3|10|否|—|0|8|[回执](results/layout-transfer-1/A-N4-G3-source/wire/7-act-11-0.json)|
|4|8|10–10.16|MOVE_WEST 0.2|R1|R1,R3|10|否|—|0|8|[回执](results/layout-transfer-1/A-N4-G3-source/wire/8-act-11-0.json)|
|4|9|10–10.07|MOVE_SOUTH 0.2|R2|R2,R3|10|否|—|2|3|[回执](results/layout-transfer-1/A-N4-G3-source/wire/9-act-15-0.json)|
|4|10|10.9–10.96|MOVE_EAST 1|R2|R2,R3|10.9|否|—|0|4|[回执](results/layout-transfer-1/A-N4-G3-source/wire/10-act-14-0.json)|

决策时发现者可见 14/20；执行期间才可见 6/20。有安全替代 19/20。安全只涉及所选时长；全失败时另存前一决策分支。

## N2 第十次

8.4–9.4 s：MOVE_NORTH 1。模型原话：Climb the divider’s west side toward the safer upper route while no patrol is nearby.

9.4–9.6 s：MOVE_WEST 0.2。模型原话：Step away from the divider edge so the northward route can clear its corner.

9.6–10.6 s：MOVE_NORTH 1。模型原话：Advance safely up the divider’s west side toward the upper route.

10.6–11.1 s：MOVE_NORTH 0.5。模型原话：Approach the narrow passage above the divider while remaining safely west of it.

11.1–12.1 s：MOVE_SOUTH 1。模型原话：Backtrack along the divider’s covered west side; the upper gap is impassable and no patrol is nearby.

12.1–12.6 s：MOVE_NORTH 0.5。模型原话：Retreat from R1’s approaching north-facing vision while staying screened from R2 by the divider.

12.6–12.8 s：MOVE_SOUTH 0.2。模型原话：Begin the necessary southward route around the divider in a short, cautious step.

12.8–13.3 s：MOVE_SOUTH 0.5。模型原话：Continue cautiously toward the divider’s south end while patrols remain out of unobstructed view.

13.3–13.46 s：MOVE_SOUTH 0.2。模型原话：Advance cautiously toward the divider’s south end while its corner still provides cover.

隔断顶端 z=1，北墙内缘 z=0.48，净宽 0.52 m，小于玩家直径 0.56 m。模型拿到了两面墙的边界，但没有玩家半径。最后经验表达的是对发现者与精确几何的不确定；日志没有直接标注发现者，已提供视角和距离。仅靠自述无法确定内部归因。

## 两版提示与单步计划

原文：Reach the green exit safely. Coordinates [x,z] in meters; east increases x, south increases z. Walls are [xmin,zmin,xmax,zmax]. Heading in radians from east toward south. Movement is cardinal at 2.5 m/s until blocked; WAIT holds position. Avoid patrol contact and unobstructed 90 degree, 5 m patrol vision. Only nearby unobstructed patrols are shown. The clock stops during decisions. Choose one listed action and duration. Return plain JSON {"action":"...","duration":0.5,"reason":"short English reason"}.

修正版：Reach the green exit safely. Coordinates [x,z] in meters; east increases x, south increases z. Walls are [xmin,zmin,xmax,zmax]. Heading in radians from east toward south. Movement is cardinal at 2.5 m/s until blocked; WAIT holds position. Avoid patrol contact and unobstructed 90 degree, 5 m patrol vision. Only nearby unobstructed patrols are shown. The clock stops during decisions. Choose one listed action and duration. Return plain JSON {"action":"...","duration":0.5,"reason":"short English reason"}. North/south decrement/increment z; west/east decrement/increment x. Player radius 0.28 m. Movement clips against closed wall rectangles expanded by that radius on both axes. Robot radius 0.34 m. Patrols continue while waiting and moving; each 0.01 s substep checks swept contact (center separation ≤0.62 m), then detection, before exit. Detection needs center distance ≤5 m, heading difference ≤45 degrees and an unobstructed center-to-center segment; touching a wall blocks that ray. Either event immediately ends the attempt. Within 6 m and a clear segment you receive robot ID, position and heading only at decision boundaries. No mid-action observation or cancellation. Terminal feedback gives outcome, not detector ID. Reach within 0.64 m of exit center.

[公开题目](evidence/rule-audit/probes-public.json)和[私有答案](evidence/rule-audit/probes-private.json)分开。先固定题序，以独立会话分别在原说明和修正版下作答；比较版本时使用同一公开题干并替换规则文本。每题每版本一次，共 12 请求；按上轮 ¥20.860088/304 粗估 ¥0.82，非报价。本轮新增请求 0。

## 关键结论的回执复核

第 7 次已经观察到顶端东移受阻。第十次末次请求实际包含的第七条经验原文为 “Waiting for R1 enabled safe travel to (7.72,0.76), but eastward movement there was blocked; retreating to (5.97,5.76) remained safe until time 12.70.”。局部受阻事实被保留；摘要没有给出净宽与直径的比较，因此无法将再试直接归因为遗忘。13.30 秒没有可见机器人；13.46 秒 R2 首次与玩家之间出现无遮挡射线，同一子步发现玩家，期间其朝向一直为 π。该帧发生在动作提交之后。

全部 15 个动作均失败的是 N2 第 2 次。前一决策仍有 6 个能活过自身执行期的选项；这不证明这些分支都能通关。
