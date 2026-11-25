"""Derive pilot tables directly from the paid-call ledger; no model or network access."""
import json, statistics, math, re
from collections import Counter
from decimal import Decimal
from pathlib import Path
ROOT=Path('results/real-dmx-pilot')
def read(p): return json.loads(p.read_text())
def lines(p): return [json.loads(s) for s in p.read_text().splitlines() if s]
def response(r):
    try:return json.loads(r.get('raw') or '{}')
    except ValueError:return {}
def valid(row,d):
    try:
        c=d['choices'][0]
        if c['finish_reason']!='stop' or c['message'].get('refusal'):return False
        v=json.loads(c['message']['content'])
        if '/act-' in row['name']:
            return v['action'] in ['MOVE_EAST','MOVE_WEST','MOVE_NORTH','MOVE_SOUTH','WAIT'] and v['duration'] in [.2,.5,1] and set(v)<=set(['action','duration','reason'])
        if row['name'].endswith('reflect'):
            return set(v)=={'observations','failure','next','uncertainty'} and all(isinstance(x,str) for x in v.values())
        return v['feedback'] in ['active','seen','contact','timeout','escaped'] and v['north']=='decreases z'
    except (KeyError,IndexError,ValueError,TypeError):return False
def fmt(row):return '| '+' | '.join(map(str,row))+' |'
wires=[read(p) for p in sorted((ROOT/'wire').glob('*.json'))]
audits={(r['track'],r['id']):r for r in read(ROOT/'behavior-audit.json')}
rows=[]
for r in wires:
    d=response(r);choice=(d.get('choices')or[{}])[0];u=d.get('usage')or{}
    rows.append(dict(seq=r['seq'],track=r['track'],turn=r['name'],http=r.get('status'),responseID=d.get('id'),model=d.get('model'),finish=choice.get('finish_reason'),valid=valid(r,d),prompt=u.get('prompt_tokens'),completion=u.get('completion_tokens'),reasoning=(u.get('completion_tokens_details')or{}).get('reasoning_tokens'),cost=u.get('cost'),latency=r.get('latency')))
(ROOT/'api-evidence.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows))
out=['# gpt-5.6-sol 真实 Agent 首轮开发实验','',
'在开发世界 seed 1 上依次执行冒烟、全知实时状态单次探索和局部观察下的 Same/M2 探索。统计单位是同一世界上的尝试。模型的决策点与重试不构成独立世界。','',
'**结果。** A 执行 13 个动作，在 10.56 秒被 R1 发现。B 执行 111 个动作，十次未通关，七次被发现、三次因 token 门槛结束。模型在同一位置学会了一个有效的 0.2 秒等待，但在出口前的另一处等待时仍会漏判 R4。五份反思参与了后续决策，另五份事后补采。','',
'## API 与预算','',
'真实请求仅发送 model 和 messages。请求模型为 gpt-5.6-sol。认证只在传输时从环境注入。首个响应带日期快照触发了身份核对，登记该快照后复用了已存回答。JSON Schema、tools、temperature、reasoning_effort 和其他可选输入均未经验证。','',
fmt(['组别','计入预算的请求','动作 / 反思 / 反馈检查','有效回答','输入 token','输出 token（含推理）','推理 token','平均 / P95 延迟（秒）','服务报告费用']),fmt(['---']*9)]
for t in ['smoke','A','B','合计']:
    rr=[r for r in rows if r['track']==t or t=='合计']
    tt=sorted(r['latency'] for r in rr if r['latency'] is not None)
    co=[Decimal(str(r['cost'])[1:]) for r in rr if re.fullmatch(r'¥[0-9.]+',str(r['cost']))]
    counts=[sum('/act-' in r['turn'] for r in rr),sum(r['turn'].endswith('reflect') for r in rr),sum(r['turn'].endswith('/feedback-check') for r in rr)]
    out.append(fmt([t,len(rr),' / '.join(map(str,counts)),f"{sum(r['valid'] for r in rr)}/{len(rr)}",*[sum(r[k] or 0 for r in rr) for k in ['prompt','completion','reasoning']],f"{statistics.mean(tt):.2f} / {tt[math.ceil(.95*len(tt))-1]:.2f}" if tt else '—',f"¥{sum(co):.4f}（{len(co)}/{len(rr)} 有报价）"]))
out+=['',f"返回 model 字段计数为 {dict(Counter(r['model'] for r in rows))}，finish_reason 计数为 {dict(Counter(r['finish'] for r in rows))}。首个真实响应 ID 为 `{rows[0]['responseID']}`。费用取原始 usage.cost。最终扣款、账户余额和未报价请求的费用无法由此确认。有效回答率以全部物理请求为分母，反思和动作分别按对应格式解析。请求序号、用量、延迟与原始响应可逐项核对。[逐请求索引](results/real-dmx-pilot/api-evidence.jsonl) · [原始账本](results/real-dmx-pilot/wire)",'',
'## 逐次结果','',fmt(['组 / 尝试','HP 起→止','模拟秒','动作数','最近 / 终局距出口(m)','结果','WAIT 次数','首次与上次动作或时长不同的步号']),fmt(['---']*8)]
for track in ['smoke','A','B']:
    p=ROOT/track
    if not (p/'summary.json').exists():continue
    s=read(p/'summary.json')
    for a in s['attempts']:
        au=audits[(track,a['id'])]
        nw=sum(x['action']=='WAIT' and x['id']==a['id'] for x in lines(p/'actions.jsonl'))
        out.append(fmt([track+' / '+a['id'],f"{a['hp']}→{a['after']}",f"{a['time']:.2f}",a['actions'],f"{au['closestOnPath']:.2f} / {a['remaining']:.2f}",a['result']+(' ('+','.join(au['seeingAtTerminal'])+')' if au['seeingAtTerminal'] else ''),nw,au['firstDifferentAction'] or '—']))
out+=['','距离为到出口中心的欧氏距离。最近距离在相邻真实采样之间沿实际轴向位移取最小值。被哪个机器人看见来自运行后的私有评测，未作为反馈发送。冒烟不消耗探索 HP。相邻尝试从第一步起比较动作与时长，末尾长度差也可能造成分歧。','',
'## 每次探索的经验原文','',
'以下是 Agent 自己生成的经验。包括其判断有误或过度概括的条目，评测器没有替它校正。[B 组原始经验及每次注入的快照](results/real-dmx-pilot/B/memory.jsonl)','']
if (ROOT/'B/memory.jsonl').exists():
    for row in lines(ROOT/'B/memory.jsonl'):
        if not row['id'].startswith('exploration'):continue
        out+=['### '+row['id'],'']
        if row['summary']:
            for k in ['observations','failure','next','uncertainty']:out+=['- **'+k+'** '+row['summary'][k].replace('\n',' ')]
        else:out+=['无有效经验。'+str(row.get('raw') or '')]
        out+=['']
retro=ROOT/'B/retrospective-memory.json'
if retro.exists():
    out+=['### 事后补采，未进入任何尝试的记忆','']
    for row in read(retro):
        out.extend([f"- {row['id']}，请求 {row['wireSeq']}。"+((row['memory'] or {}).get('next') or '格式无效。')])
    out+=['','原始经验、原始返回及确切时间可在 [补采文件](results/real-dmx-pilot/B/retrospective-memory.json) 与总账本中核查。补采计入 200 次上限和费用，未用来重画原实验的行动或宣称改善了学习。','']
out+=['## 行为解释与复现','']
notes=Path('scripts/dmx-pilot-findings.md')
if notes.exists():out.append(notes.read_text())
else:out.append('详细行为分析待本轮运行结束后核对。')
Path('REAL-AGENT-PILOT.md').write_text('\n'.join(out)+'\n')
