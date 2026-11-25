"""Build reports from persisted public actions, checkpoints, receipts and validated videos."""
import csv, json, math, statistics
from pathlib import Path
from decimal import Decimal
base=Path('results/layout-transfer-1')
ev=Path('evidence/layout-transfer-1')
read=lambda p:json.loads(p.read_text())
manifest=read(ev/'scene-manifest.json')
def size(x):return len(json.dumps(x,ensure_ascii=False,separators=(',',':')).encode())
def cost(rows):
    known=sum((Decimal(str(r['CNY'])) for r in rows if r['CNY'] is not None),Decimal(0))
    return dict(requests=len(rows),knownCNY=float(known),costUnknown=sum(r['CNY'] is None for r in rows),inputTokens=sum(r['input'] or 0 for r in rows),outputTokens=sum(r['output'] or 0 for r in rows),latencySeconds=round(sum(r['latency'] or 0 for r in rows),2))
def md(v):return str(v if v is not None else '—').replace('|','／').replace('\n',' ')
def table(headers,rows):
    return '| '+' | '.join(headers)+' |\n|'+'|'.join(['---']*len(headers))+'|\n'+''.join('| '+' | '.join(map(md,row))+' |\n' for row in rows)
def doc(path,header,sections):
    Path(path).write_text('# '+header+'\n\n'+'\n\n'.join(sections)+'\n')
def csvout(name,rows,fields):
    with (base/name).open('w') as f:
        w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(rows)
jobs=[];receipts=[];attempts=[];lessons=[];comparisons=[]
for n in [0,2,4]:
 for group in ['G1','G2','G3']:
  arms=['source'] if group!='G3' else ['source','transfer','scratch']
  source=None
  for arm in arms:
   layout='A' if arm=='source' else 'B';ident=f'{layout}-N{n}-{group}-{arm}'
   p=base/ident;cp=p/'checkpoint.json'
   state=read(cp) if cp.exists() else {}
   if not state:
    status='deferred_full_memory' if group!='G3' else 'source_not_acquired' if source and source['status']=='not_acquired' else 'pending'
   else:status=state['status']
   rows=[]
   for f in sorted((p/'wire').glob('*.json')):
    r=read(f);data={}
    try:data=json.loads(r.get('raw',''))
    except (TypeError,ValueError):pass
    u=data.get('usage') or {};price=u.get('cost')
    rows.append(dict(job=ident,attempt=int(f.name.split('-')[0]),file=str(f),HTTP=r.get('status'),model=data.get('model'),id=data.get('id'),finish=(data.get('choices') or [{}])[0].get('finish_reason'),input=u.get('prompt_tokens'),output=u.get('completion_tokens'),latency=r.get('latency'),CNY=float(price[1:]) if isinstance(price,str) and price.startswith('¥') else None))
   receipts.extend(rows)
   job=dict(id=ident,n=n,group=group,layout=layout,arm=arm,status=status,pause=state.get('pause'),first=state.get('first'),budget=state.get('budget',10 if arm=='source' else max(1,source['first']-1) if source and source['first'] else None),hpUsed=100-state['hp'] if state else None,decisions=state.get('decisions'),memoryOut=state.get('memoryOutBytes'),**cost(rows))
   job.update(failuresBeforeFirstSuccess=job['first']-1 if job['first'] else None,formalFailures=sum(a['hpAfter']<a['hpBefore'] for a in state.get('attempts',[])),acquired=True if status=='acquired' else False if status=='not_acquired' else None)
   jobs.append(job)
   if arm=='source':source=job
   last=None;failed=[]
   for t in state.get('attempts',[]):
    f=p/f"attempt-{t['attempt']}.json";detail=read(f) if f.exists() else None
    navfile=p/'navigable-distance.json'
    nav=next((r for r in read(navfile) if r['attempt']==t['attempt']),{}) if navfile.exists() else {}
    seq=[(x['choice']['action'],x['choice']['duration']) for x in detail['turns']] if detail else []
    start=next((i for i,(a,b) in enumerate(zip(last,seq),1) if a!=b),min(len(last),len(seq))+1 if last!=seq else None) if last is not None and detail else None
    pos=detail['film']['frames'][-1]['full']['player'] if detail else None
    repeated=bool(pos and any(outcome==t['result'] and math.dist(pos,where)<=0.75 for outcome,where in failed))
    if pos and t['result'] in ('seen','contact','timeout','action_budget'):failed.append((t['result'],pos))
    lesson=t.get('lesson'); prior=detail['memoryIn'] if detail else None
    if lesson:lessons.append((ident,t['attempt'],prior and len(prior) or 0,lesson))
    attempts.append(dict(job=ident,**t,closestNavigableMeters=nav.get('closest'),endNavigableMeters=nav.get('end'),repeatWithin075m=repeated,endPosition=pos,firstDifferentDecision=start,path=seq,memoryInputCount=len(prior) if prior is not None else None,**cost([r for r in rows if r['attempt']==t['attempt']])))
    if detail:last=seq
src=[j for j in jobs if j['arm']=='source'];active=[j for j in src if j['group']=='G3']
for s in active:
 tar=[j for j in jobs if j['n']==s['n'] and j['arm']!='source']
 a,b=tar
 comparisons.append(dict(n=s['n'],transferSuccess=a['acquired'],scratchSuccess=b['acquired'],transferTargetCNY=a['knownCNY'],scratchTargetCNY=b['knownCNY'],sourceCNY=s['knownCNY'],sourceStatus=s['status'],sourceFirst=s['first'],budget=a['budget'],transfer=a['first'],scratch=b['first'],transferStatus=a['status'],scratchStatus=b['status'],firstAttemptTransfer=a['first']==1 if a['status'] in ('acquired','not_acquired') else None,retentionOnly=s['first']==1 if s['first'] else None,hpTransfer=a['hpUsed'],hpScratch=b['hpUsed'],memoryTransferInput=next((t['memoryInBytes'] for t in attempts if t['job']==a['id']),None),memoryScratchInput=next((t['memoryInBytes'] for t in attempts if t['job']==b['id']),None),memoryTransferEnd=a['memoryOut'],memoryScratchEnd=b['memoryOut'],combinedTransferCNY=round(s['knownCNY']+a['knownCNY'],6) if a['requests'] else None,combinedScratchCNY=round(s['knownCNY']+b['knownCNY'],6) if b['requests'] else None))
total=cost(receipts)
paired=[c for c in comparisons if c['transferStatus'] in ('acquired','not_acquired') and c['scratchStatus'] in ('acquired','not_acquired')]
horizon=min((c['budget'] for c in paired),default=0)
common=[dict(k=k,pairs=len(paired),transfer=sum(c['transfer'] is not None and c['transfer']<=k for c in paired),scratch=sum(c['scratch'] is not None and c['scratch']<=k for c in paired)) for k in range(1,horizon+1)]
out=dict(design='layout-transfer-1',seed=1,models=sorted(set(r['model'] for r in receipts if r['model'])),activeGroup='G3',jobs=jobs,attempts=attempts,transfer=comparisons,commonHorizon=common,usage=total)
base.mkdir(exist_ok=True,parents=True)
(base/'summary.json').write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n')
csvout('jobs.csv',jobs,list(jobs[0]));csvout('attempts.csv',attempts,[k for k in attempts[0] if k not in ('path','lesson')] if attempts else ['job','attempt','result'])
csvout('usage.csv',receipts,list(receipts[0]) if receipts else ['job','file','CNY'])
csvout('transfer.csv',comparisons,list(comparisons[0]))
results=table(['源任务','状态','首次成功','成功前失败数','消耗 HP','动作数','API 次数','服务费用 ¥'],[(j['id'],j['status'],j['first'],j['first']-1 if j['first'] else None,j['hpUsed'],j['decisions'],j['requests'],round(j['knownCNY'],4) if j['requests'] else None) for j in src])
per=table(['任务','尝试','结果','HP','模拟秒','决策','WAIT','最近/最终距出口 m','最近可通行距离 m','重复失败','首次不同决策','记忆字节','费用 ¥'],[(t['job'],t['attempt'],t['result'],f"{t['hpBefore']}→{t['hpAfter']}",round(t['time'],2),t['actions'],t['waits'],f"{t['closest']:.2f} / {t['remaining']:.2f}",round(t['closestNavigableMeters'],2) if t['closestNavigableMeters'] is not None else None,t['repeatWithin075m'],t['firstDifferentDecision'],t['memoryInBytes'],round(t['knownCNY'],4)) for t in attempts])
doc('ACQUISITION-RESULTS.md','源任务与尝试记录',[results,'首次成功次数为 null 时，参见状态区分未通关、技术暂停和尚未运行。距离为玩家中心至出口中心的欧氏距离。可通行距离为忽略机器人的 0.25 m 四邻接网格路线到终点圆盘的长度，经玩家半径检查的正交短段用于连接实际位置与网格。重复失败按同一任务中同类失败且终点距离 ≤0.75 m 定义。首次不同决策同时比较动作和时长。',per])
transferTable=table(['N','源状态','源 T','目标上限','Transfer 状态 / T','Scratch 状态 / T','目标 HP 消耗','源+目标累计 ¥（各臂）'],[(c['n'],c['sourceStatus'],c['sourceFirst'],c['budget'],f"{c['transferStatus']} / {md(c['transfer'])}",f"{c['scratchStatus']} / {md(c['scratch'])}",f"{md(c['hpTransfer'])} / {md(c['hpScratch'])}",f"{md(c['combinedTransferCNY'])} / {md(c['combinedScratchCNY'])}") for c in comparisons])
doc('TRANSFER-RESULTS.md','配对布局迁移',[transferTable,'两个目标臂的累计费用各含同一个源，汇总实付只计一次。仅源 T>1 时，目标成功才构成较少尝试下的成功。',table(['共同尝试上限','完成配对数','Transfer 成功','Scratch 成功'],[(r['k'],r['pairs'],r['transfer'],r['scratch']) for r in common])])
memoryText=['各局独立重置时钟，仅载入本任务之前在线生成的摘要。Transfer 的首局载入源成功时的摘要副本。经验中的机器人推断为模型自述。G1/G2 暂缓，两种观察权限与两种记忆表征的效应无法估计。']
for ident,i,count,l in lessons:
 s=l['summary'];memoryText.append(f"### {ident} · 尝试 {i} · {l['result']}\n\n本局载入 {count} 条经验。\n\n"+'\n\n'.join(f"**{k}**　{v}" for k,v in s.items()))
doc('MEMORY-ANALYSIS.md','在线经验与证据',memoryText)
videos=[]
for s in manifest['scenes']:
 movie=ev/s['video'];thumb=movie.with_suffix('.jpg');replay=ev/s['replay']
 videos.append((s['id'],f'[视频]({movie})' if movie.exists() else '待导出',f'[截图]({thumb})' if thumb.exists() else '待生成',f'[回放]({replay})'))
for j in jobs:
 p=base/j['id']
 if (p/'replay.json').exists():
    videos.append((j['id'],' · '.join(f'[{f.stem}]({f})' for f in sorted(p.glob('*.mp4'))) or '待导出','',f'[回放]({p}/replay.json)'))
doc('VIDEO-INDEX.md','场景和完整学习录像',['[回放工作台](studio.html) 支持场景选择、载入本地实验回放、按尝试跳转和逐帧检查。',table(['场景或任务','1080p / 30 FPS','截图','轨迹'],videos)])
doc('MULTI-SCENE-LEARNING-STUDY.md','多场景少次尝试学习与经验迁移',[
'开发 seed 1。15 个场景均通过真实模拟器验证。三种布局面积、起点、出口和巡逻机制一致；A→B 仅更换内部墙壁。每种机器人数量仅有一个源与一个匹配目标，组间比较属于个案观察。',
results,transferTable,
'**实付与用量**　已取得费用的回执合计 ¥%.6f；%s 次请求，%s 次费用未知。输入 %s token，输出 %s token。'% (total['knownCNY'],total['requests'],total['costUnknown'],total['inputTokens'],total['outputTokens']),
'**证据范围**　成功是一次实际抵达出口。相同布局与条件的重复验证未预注册，无法把一次通过解释为稳定掌握。仅当完成同预算的 Transfer/Scratch 两臂时才能比较迁移。G1/G2 未执行，无法估计完整记忆或全知观察的效果。',
'[场景及 Oracle](SCENE-REGISTRY.md) · [预注册协议及成本估算](EXPERIMENT-PROTOCOL.md) · [逐尝试结果](ACQUISITION-RESULTS.md) · [迁移结果](TRANSFER-RESULTS.md) · [模型原文](MEMORY-ANALYSIS.md) · [录像及截图](VIDEO-INDEX.md) · [机器可读汇总](results/layout-transfer-1/summary.json)'])
print(total)

# Compare executed actions against the actual source route. Prefix agreement is
# descriptive; a matching action in two similar maps does not establish recall.
def same_prefix(a,b):
    i=0
    while i<min(len(a),len(b)) and a[i]==b[i]:i+=1
    return i
def annotate(path,heading,paragraphs):
    with open(path,'a') as f:f.write('\n## '+heading+'\n\n'+'\n\n'.join(paragraphs)+'\n')
desc=[];cases=[];xfer=[]
for j in active:
 ts=[t for t in attempts if t['job']==j['id'] and t['path']]
 first=j['first'];n=j['n'];N='N'+str(n)
 if j['status']=='acquired':
    desc.append(f"{N} 在第 {first} 次源尝试成功，消耗 {j['hpUsed']} HP。")
 elif j['status']=='not_acquired':desc.append(f"{N} 在十次尝试内均未通关，First Success Attempt = null。")
 elif j['status']=='paused':desc.append(f"{N} 暂停于 {j['pause']}，服务中断不作为新增游戏失败。")
 if len(ts)>1:
    # First observed behavioral divergence in chronological order.
    for a,b in zip(ts,ts[1:]):
      i=same_prefix(a['path'],b['path'])
      if i<min(len(a['path']),len(b['path'])):
       cases.append(f"{N} 的第 {a['attempt']}→{b['attempt']} 次在第 {i+1} 步首次改变，从 {a['path'][i]} 改为 {b['path'][i]}，两次最近距离分别为 {a['closest']:.2f} m、{b['closest']:.2f} m。下一局确实载入了前一局摘要。单次前后变化只能证明行为发生变化。")
       break
 if not first:continue
 sourcePath=next((t['path'] for t in ts if t['attempt']==first),[])
 for arm in ['transfer','scratch']:
    ident=f'B-{N}-G3-{arm}'
    t=next((t for t in attempts if t['job']==ident and t['attempt']==1 and t['path']),None)
    if not t:continue
    i=same_prefix(sourcePath,t['path'])
    xfer.append(f"{ident} 首次尝试与源成功路线开头连续相同 {i} 步（含时长）；载入 {t['memoryInputCount']} 条摘要，结果 {t['result']}，最近距离 {t['closest']:.2f} m。")
for c in paired:
 if c['transfer'] is None and c['scratch'] is not None or c['transfer'] and c['scratch'] and c['transfer']>c['scratch']:
    xfer.append(f"N{c['n']} 的记忆臂在相同上限下表现较差，属于可能负迁移的个案。单次模型采样不能确定由旧经验导致。")
 elif c['transfer'] is not None and (c['scratch'] is None or c['transfer']<c['scratch']):
    xfer.append(f"N{c['n']} 的记忆臂本次领先从零臂。相同世界的一对采样不能确定因果效应。")
 else:xfer.append(f"N{c['n']} 的两臂在首次成功次数上未显示差异。")
annotate('MEMORY-ANALYSIS.md','动作序列复核',cases+xfer or ['尚无可比较的已归档动作序列。'])
annotate('MULTI-SCENE-LEARNING-STUDY.md','能力获取与迁移的实际证据',desc+cases+xfer or ['尚无完整源或目标结果。'])
audit=base/'offline-behavior.json'
if audit.exists():
 checks=[];waiting=[]
 for j in read(audit):
    c=j['sourceRouteOnB']
    if c:checks.append(f"{j['id']} 的源成功动作原样放入 Layout B 后，执行 {c['steps']} 个动作，结局 {c['outcome']}，离出口中心 {c['distanceToExit']:.2f} m。此离线对照测量机械复用路线的表现。")
    for t in j['trials']:
        for w in t['waits']:
            if w['actual']=='active' and w['skip'] in ('contact','seen'):
                waiting.append(f"{j['id']} 第 {t['attempt']} 次在 {w['time']:.2f} s 等待 {w['wait']:.2f} s，随后 {w['next']['action']} 保持安全；从同一真实状态删除等待并立刻执行同一个移动会 {w['skip']}。")
 if checks:annotate('TRANSFER-RESULTS.md','固定动作序列对照',checks)
 if checks or waiting:annotate('MULTI-SCENE-LEARNING-STUDY.md','离线对照与局部等待',checks+waiting[:3]+['等待对照只验证紧随其后的一个动作。完整清单含终止时有效观察者、受阻移动和全部可比等待动作。[程序化复演记录](results/layout-transfer-1/offline-behavior.json)'])
# Final interpretation uses observed terminal states, without extrapolating from censored sources.
finished=len(active)==3 and all(j['status'] in ('acquired','not_acquired') for j in active)
if finished:
    acquired=sum(j['status']=='acquired' for j in active)
    conditional=[c for c in paired if c['sourceFirst'] and c['sourceFirst']>1]
    verified=len(read(base/'offline-behavior.json')) if (base/'offline-behavior.json').exists() else 0
    all_attempts=len(attempts)
    turns=sum(t['actions'] for t in attempts)
    lessons_n=len(lessons)
    texts=[f"三个独立源任务有 {acquired} 个在十次内通关。完成同预算配对的目标为 {len(paired)} 个，其中能检验“尝试次数减少”（源 T>1）的有 {len(conditional)} 个。"]
    if not conditional:texts.append('本轮没有获得可检验“动态关卡经验能否减少新布局尝试次数”的成功源。也没有可判定新增机器人后是否发生负迁移的目标配对。')
    texts.append(f"实际返回版本为 {', '.join(out['models'])}。收录 {all_attempts} 次尝试、{turns} 次执行动作和 {lessons_n} 条在线终局摘要。服务请求耗时合计 {total['latencySeconds']:.2f} 秒；原始用量、版本和回执 ID 见 [usage.csv](results/layout-transfer-1/usage.csv)。")
    annotate('MULTI-SCENE-LEARNING-STUDY.md','结论与覆盖范围',texts)
if finished:
    stats=table(['项目','实测'],[
        ('有效执行的动作',sum(t['actions'] for t in attempts)),
        ('在线终局经验',len(lessons)),('源任务完成数',sum(j['status'] in ('acquired','not_acquired') for j in active)),
        ('暂停任务数',sum(j['status']=='paused' for j in jobs)),
        ('已知 HTTP 非 200 的回执数',sum(r['HTTP'] is not None and r['HTTP']!=200 for r in receipts)),
        ('服务报告费用的已知覆盖',f"{len(receipts)-total['costUnknown']} / {len(receipts)}"),
    ])
    annotate('MULTI-SCENE-LEARNING-STUDY.md','运行核验',[stats,'[回放逐帧与请求核对](results/layout-transfer-1/replay-verification.txt) · [自动测试输出](evidence/layout-transfer-1/test-results.txt) · [构建输出](evidence/layout-transfer-1/build-results.txt)'])
