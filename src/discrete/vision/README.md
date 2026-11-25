# Phase 2.3: vision ablation

新实现位于本目录，入口 `scripts/discrete-vision.ts`，产物 `src/discrete/artifacts/vision-ablation/`。用户已明确确认复用 phase2-v1 实际周期8（不是初始任务误写的14），因此只读使用 blind/environment.ts 和四个 phase2-v1 原始文本基线，phases=[0,1,2,4]、每局最多一次。

```bash
node --import tsx scripts/discrete-vision.ts --preview-only
node --import tsx scripts/discrete-vision.ts --max-budget-rmb 12 --no-video
node --import tsx src/discrete/vision/verify.ts
python src/discrete/vision/finish.py
```

预检用已有 Puppeteer/Chromium 和 Canvas 生成640×384 PNG，未安装依赖。项目不能解析 puppeteer-core 时从已有 `/tmp/patrolworld-browser-check/package.json` 解析；Chrome可用CHROME_BIN覆盖。图像解码检查用本机已有 `/home/jiaxuanren/miniconda3/envs/opsd/bin/python` 的cv2。没有视频渲染。

渲染输入先做观测白名单投影。局部玩家不在(1,3)时机器人=null、vision=[]，图像完全不绘制机器人或其视野；灰色区域为静态盲区，与隐藏真值无关。PNG字节零泄密测试比较不同位置/朝向的机器人，SHA必须相同。静态地图、目标坐标与巡逻规律可在文字中说明，当前演员位置/朝向只来自图像。文字历史由模型前序JSON生成单行记录，不包含后台真值、评分、原始reason或旧图像。每步恰好一张当前PNG。

vision-provider.ts 复用现有 config/dmx-pilot.json 的模型与环境变量，遵循 study/provider.ts 的HTTPS域名约束、元数据/模型校验、写前回执和中断恢复方式。既有provider会把完整base64写入wire，因此本轮独立封装传输：实际POST用base64 data URI，归档仅存图片相对路径、SHA256、压缩消息结构和实际请求payloadSHA256，原始模型响应完整保存。verify.ts会从PNG重建实际base64请求并检查payload哈希，而不再次请求网络。未知在途请求禁止重试，已完成同一请求从其自身wire恢复，无自动换模型/备用动作。

预算按每个原始回执 usage.cost 的RMB累计，串行运行；达到maxBudget-0.50时停止发新请求。缓冲不是远端单请求费用硬上限，本次实际费用2.863616元，63次请求，全部8局完成。没有新Text-only API调用；历史文本费用只读引用。

归因顺序严格为Format→当前受测感知错误→用模型下一机器人状态替换后是否消除直接致死事件→检查最后一次实际合法看到机器人的感知→上游感知/预测/规划。机器人死亡判定、墙和门一直使用原始离散逻辑。预测分层按动作前实际可见性，隐藏Age自最后合法看到tick起算。感知协议只测玩家位置、机器人可见性、可见机器人位置与朝向，未单独测地图/门/遮挡语义；因此规划类别不能排除未测的场景语义理解错误。

unit-tests.json保存4项预检（含五归因分支），regression-tests.txt保存其余70项测试。verify.ts还会重渲染全部63张输入逐字节比较、重放世界、重建消息/图片载荷、复核评分和归因、解码全部PNG、编译TypeScript，以及核验2540个既有文件与冻结核心源码哈希。finish.py仅完善展示表和证据说明，verify.ts重建REPORT后可再次运行finish.py恢复展示。
