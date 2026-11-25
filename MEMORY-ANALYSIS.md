# 在线经验与证据

各局独立重置时钟，仅载入本任务之前在线生成的摘要。Transfer 的首局载入源成功时的摘要副本。经验中的机器人推断为模型自述。G1/G2 暂缓，两种观察权限与两种记忆表征的效应无法估计。

### A-N0-G3-source · 尝试 1 · escaped

本局载入 0 条经验。

**observations**　Escaped on attempt 1 in 7.07 seconds with 100 HP; no robots appeared.

**failure**　No failure occurred.

**next**　Repeat the route: north to y=6, east to x=11.5, north, align near x=12.75, then enter the exit from the south.

**uncertainty**　The route was safe in this run, but future robot presence or movement is unknown.

### B-N0-G3-transfer · 尝试 1 · escaped

本局载入 1 条经验。

**observations**　Escaped on attempt 1 in 7.07 seconds with 100 HP; no robots were present.

**failure**　No failure occurred.

**next**　Repeat: north to y=6, east to x=11.5, north to y=2.25, east to x=12.75, then north into the exit.

**uncertainty**　Hypothesis: this route remains safe if no robots appear; future robot presence is unknown.

### B-N0-G3-scratch · 尝试 1 · escaped

本局载入 0 条经验。

**observations**　Escaped on attempt 1 in 7.27 seconds with 100 HP; no robots were present.

**failure**　None; every move remained active until the final escape.

**next**　Repeat: west to x=1, north to y=6, east to x=11, north, then align near x=12.25 and enter the exit.

**uncertainty**　The route appears reliable, though exact collision margins and movement timing may vary.

### A-N2-G3-source · 尝试 1 · seen

本局载入 0 条经验。

**observations**　Moving north along the west edge was safe until time 1.4 at (1.0,5.5); R1 was moving north near x=3.1.

**failure**　The final 1-second north move triggered 'seen' at time 1.7 near (1.0,4.75), with R1 near (3.1,6.86).

**next**　Hypothesis: avoid continuing north while R1 faces north; wait behind cover or move south until its heading changes, then advance in short 0.2-second steps.

**uncertainty**　R1's vision range, cone width, and patrol-turn timing are unknown.

### A-N2-G3-source · 尝试 2 · seen

本局载入 1 条经验。

**observations**　Waiting for R1 to turn south enabled a safe west-wall route, then crossing above the records wall and moving below the divider remained safe through time 13.7.

**failure**　Moving east from (5.88,9.12) triggered 'seen' almost immediately at time 13.79; R1 was turning east near (3.1,6.2), while R2 remained near (10,5.2).

**next**　Hypothesis: stay still or retreat behind the west elbow until R1 turns away, then cross east below the spine using 0.2-second moves.

**uncertainty**　It is unclear whether R1 or R2 detected the player, and the robots' exact vision range, cone width, and wall occlusion are unknown.

### A-N2-G3-source · 尝试 3 · seen

本局载入 2 条经验。

**observations**　Observation: The west-edge route, crossing above records, passing below the divider, and reaching (8.5,6.0) stayed safe through time 8.2.

**failure**　Observation: Moving east toward (10.78,6.0) triggered 'seen' at time 9.11; R2 was at (15.70,5.20) facing west.

**next**　Hypothesis: wait behind the divider or spine until R2 turns away, then cross its sightline with 0.2-second moves.

**uncertainty**　It is unknown whether R2 caused detection or exactly how its vision range, cone, and wall occlusion work.

### A-N2-G3-source · 尝试 4 · seen

本局载入 3 条经验。

**observations**　The southern corridor route stayed safe through time 11.7, reaching (7.78,9.75); R1 was visible to the west.

**failure**　A north move from (7.78,9.75) triggered 'seen' at time 12.46 near (7.78,7.85), when R1 faced north and R2 faced west.

**next**　Hypothesis: remain below the spine, wait for R2 to face away, then advance north in 0.2-second steps using walls as cover.

**uncertainty**　It is unknown which robot detected the player and how their vision range, cone, and wall occlusion work.

### A-N2-G3-source · 尝试 5 · seen

本局载入 4 条经验。

**observations**　Waiting for R1 to turn south enabled safe travel up the west side, above records, below the divider, and to (6.0,8.5).

**failure**　Moving east from (6.0,8.5) triggered 'seen' almost immediately at time 13.35; R1 faced north and R2 faced west.

**next**　Hypothesis: wait near (6.0,8.5) until both robots face away, then test the eastward crossing with 0.2-second moves.

**uncertainty**　The detecting robot and the exact vision range, cone width, and wall occlusion remain unknown.

### A-N2-G3-source · 尝试 6 · seen

本局载入 5 条经验。

**observations**　The route reached (7.5,1.75) safely at time 12.4, north of the divider and near the exit corridor.

**failure**　Backtracking south ended in detection at (7.5,4.55) at time 13.52; R1 was at (3.1,6.2) and turning northwest.

**next**　Hypothesis: from (7.5,1.75), continue east around the divider’s north end toward the exit instead of moving south.

**uncertainty**　The detecting robot and exact vision range, cone width, and wall occlusion remain unknown.

### A-N2-G3-source · 尝试 7 · seen

本局载入 6 条经验。

**observations**　Waiting for R1 enabled safe travel to (7.72,0.76), but eastward movement there was blocked; retreating to (5.97,5.76) remained safe until time 12.70.

**failure**　Waiting at (5.97,5.76) caused detection at time 12.72 while R1 faced north nearby and R2 faced west across the corridor.

**next**　Hypothesis: avoid waiting at (5.97,5.76); use short moves and cover while both robots face away, and do not retry the blocked north gap.

**uncertainty**　The detecting robot, vision geometry, wall occlusion, and whether any north-side crossing is passable remain unknown.

### A-N2-G3-source · 尝试 8 · seen

本局载入 7 条经验。

**observations**　Waiting for R1 to turn south enabled safe travel up the west corridor, above records, and along the divider’s west side to (7.25,3.28).

**failure**　Moving south from (7.25,3.28) triggered detection at time 11.73 near (7.25,5.36); R1 faced north and R2 faced west.

**next**　Hypothesis: from (7.25,3.28), continue north toward the divider’s north end instead of backtracking south, then approach the exit with short moves.

**uncertainty**　Which robot detected the player, the vision geometry, and whether the north-side route is passable remain unknown.

### A-N2-G3-source · 尝试 9 · seen

本局载入 8 条经验。

**observations**　Waiting for R1 to move south enabled safe travel up the west corridor, above records, and along the divider’s west side to (7.72,3.50).

**failure**　Moving south around the divider triggered detection near (7.72,5.75) at time 11.4; R2 was at (12.68,5.20) facing west.

**next**　Hypothesis: from (7.72,3.50), move north and seek an upper route toward the exit instead of entering R2’s west-facing corridor.

**uncertainty**　The detecting robot, exact vision geometry, wall occlusion, and passability of the upper route remain unknown.

### A-N2-G3-source · 尝试 10 · seen

本局载入 9 条经验。

**observations**　Waiting for R1 to turn enabled safe travel via the west corridor to the divider’s west side; the upper gap was blocked.

**failure**　Moving south to (7.25,4.93) triggered detection at time 13.46; R1 was near (3.1,6.2) and R2 near (10,5.2) facing west.

**next**　Hypothesis: avoid the blocked upper gap and wait behind cover until R2 no longer faces west before rounding the divider in 0.2-second steps.

**uncertainty**　It remains unknown which robot detected the player and what their exact vision geometry and wall occlusion are.

### A-N4-G3-source · 尝试 1 · seen

本局载入 0 条经验。

**observations**　Moving north for 1 second reached (1.5, 6.0) while R1 moved north near x=3.1; the run was still active.

**failure**　A second north move triggered 'seen' almost immediately at (1.5, 5.975), with 90 HP remaining.

**next**　Try moving south or waiting first to alter timing, then use shorter 0.2-second moves near the west corridor.

**uncertainty**　Hypothesis: R1 had line of sight around the records wall; its exact vision range and patrol limits are unknown.

### A-N4-G3-source · 尝试 2 · seen

本局载入 1 条经验。

**observations**　The south-and-east route to (9.0,13.5), then north to (9.0,8.5), remained active.

**failure**　Moving east beneath the spine triggered 'seen' at (10.2,8.5) when R3 turned east near (7.65,5.95).

**next**　Repeat the lower route, then wait or use 0.2-second moves near the spine until R3 is facing away.

**uncertainty**　Hypothesis: R3 gained line of sight through the spine’s western opening; its exact vision range and turn timing are unknown.

### A-N4-G3-source · 尝试 3 · seen

本局载入 2 条经验。

**observations**　The lower route to (9.0,8.5) stayed active; R3 then turned east near (7.65,5.95).

**failure**　Continuing north triggered 'seen' at (9.0,7.3) at time 7.48, leaving 70 HP.

**next**　Repeat the lower route, then wait before the final north approach and use 0.2-second moves when R3 faces away.

**uncertainty**　Hypothesis: R3 can see through the opening west of the spine when facing east; its range and turn schedule remain unknown.

### A-N4-G3-source · 尝试 4 · seen

本局载入 3 条经验。

**observations**　The lower route reached (9.0,6.0) safely; R3 was moving east ahead while R2 appeared near (14.53,5.2) facing west.

**failure**　Moving north from (9.0,6.0) triggered 'seen' at (9.0,5.28) around time 10.41.

**next**　Repeat the safe route, then wait at (9.0,6.0) and use 0.2-second north moves only after R2 turns away or leaves.

**uncertainty**　Hypothesis: west-facing R2 saw across the upper corridor; R2's vision range and patrol timing remain unknown.

### A-N4-G3-source · 尝试 5 · seen

本局载入 4 条经验。

**observations**　The lower route to (9.0,6.0) was safe; retreating west to (7.75,5.78) also remained active.

**failure**　Moving north stopped near (7.75,5.28) and triggered 'seen' while R2 was at (12.75,5.2) facing west.

**next**　Repeat the route, retreat farther west than x=7.75, then move north along the divider using 0.2-second steps.

**uncertainty**　Hypothesis: R2 detected the player at roughly 5 m range; the exact vision boundary is unknown.

### A-N4-G3-source · 尝试 6 · seen

本局载入 5 条经验。

**observations**　The lower route to (9.0,8.5) remained active; R3 was near (7.6,5.95) and turned east.

**failure**　Moving north triggered 'seen' at (9.0,7.3) at time 7.48.

**next**　Repeat the lower route, wait at (9.0,8.5), then use 0.2-second moves after R3 turns away.

**uncertainty**　Hypothesis: east-facing R3 can see through the spine’s western opening; its exact range and timing are unknown.

### A-N4-G3-source · 尝试 7 · seen

本局载入 6 条经验。

**observations**　The lower route, a wait at (9.0,8.5), north to (9.0,6.0), and west to (6.5,6.0) all remained active.

**failure**　Moving north from (6.5,6.0) triggered 'seen' almost immediately at (6.5,5.6), time 10.16.

**next**　Repeat the safe route, then wait at (6.5,6.0) for patrol timing to change and test north with 0.2-second steps.

**uncertainty**　Hypothesis: an unlisted or occluded patrol saw the gap west of the divider; the observer and exact vision boundary are unknown.

### A-N4-G3-source · 尝试 8 · seen

本局载入 7 条经验。

**observations**　The lower route, waiting at (9.0,8.5), reaching (9.0,6.0), and moving west to (6.5,6.0) stayed active.

**failure**　A 0.2-second west move from (6.5,6.0) triggered 'seen' near (6.1,6.0) at time 10.16.

**next**　Repeat the safe route, stop at (6.5,6.0), wait for patrol timing to change, then test north or west in 0.2-second steps.

**uncertainty**　Hypothesis: R1 or another occluded patrol could see the area west of x=6.5; the detecting robot and exact boundary are unknown.

### A-N4-G3-source · 尝试 9 · seen

本局载入 8 条经验。

**observations**　The lower route to (9.0,8.5), one-second wait, and northward advance to the divider remained safe through time 10.0.

**failure**　The second 0.2-second south move triggered 'seen' near (9.5,5.96), with R2 west-facing at (14.44,5.2) and R3 east-facing at (11.66,5.95).

**next**　Repeat the safe route, but do not retreat south from (9.5,5.28); instead wait behind cover for R2 to turn or leave before advancing.

**uncertainty**　Hypothesis: R2 detected the player across the upper corridor; the detecting robot, sight boundary, and safer timing remain uncertain.

### A-N4-G3-source · 尝试 10 · seen

本局载入 9 条经验。

**observations**　The lower route, wait at (9.0,8.5), and climb to (9.5,1.75) remained active.

**failure**　Moving east toward the exit triggered 'seen' near (9.65,1.75) at time 10.96.

**next**　Repeat the route, then wait at (9.5,1.75) for patrol timing to change before testing east with 0.2-second moves.

**uncertainty**　Hypothesis: west-facing R2 detected the eastward move; the exact observer and sight boundary are unknown.

## 动作序列复核

N2 的第 1→2 次在第 1 步首次改变，从 ('MOVE_NORTH', 1) 改为 ('MOVE_WEST', 0.5)，两次最近距离分别为 11.88 m、6.08 m。下一局确实载入了前一局摘要。单次前后变化只能证明行为发生变化。

N4 的第 1→2 次在第 1 步首次改变，从 ('MOVE_NORTH', 1) 改为 ('MOVE_SOUTH', 1)，两次最近距离分别为 11.88 m、7.37 m。下一局确实载入了前一局摘要。单次前后变化只能证明行为发生变化。

B-N0-G3-transfer 首次尝试与源成功路线开头连续相同 9 步（含时长）；载入 1 条摘要，结果 escaped，最近距离 0.63 m。

B-N0-G3-scratch 首次尝试与源成功路线开头连续相同 0 步（含时长）；载入 0 条摘要，结果 escaped，最近距离 0.63 m。

N0 的两臂在首次成功次数上未显示差异。
