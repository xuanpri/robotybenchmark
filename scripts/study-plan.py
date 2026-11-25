"""Register the schedule and reference costs before contacting the provider."""
from pathlib import Path
import json,statistics
p=Path('evidence/layout-transfer-1')
rows=[json.loads(f.read_text()) for f in sorted(Path('results/real-dmx-pilot/wire').glob('[0-9]*.json'))]
rows=[r for r in rows if r['track'] in ('A','B') and not 'posthoc' in r['name']]
ok=[json.loads(r['raw'])['usage'] for r in rows if r.get('status')==200]
mean=sum(float(u['cost'].removeprefix('¥')) for u in ok)/len(ok)
# Observed decisions/attempt, including the older pilot's censored attempts.
d=sum('/act-' in r['name'] for r in rows)/11
manifest=json.loads((p/'scene-manifest.json').read_text())
def scenario(source_attempts,source_acquired,target_attempts):
    acts=round(9*source_attempts*d)+round(18*target_attempts*d) if source_acquired else round(9*source_attempts*d)
    refs=3*source_attempts+(6*target_attempts if source_acquired else 0)
    return dict(sourceAttemptsEach=source_attempts,allSourcesAcquired=source_acquired,targetAttemptsPerArm=target_attempts,requests=acts+refs,referenceCNY=round((acts+refs)*mean,2))
o=dict(seed=1,sourceOrder=[f'A-N{n}-G{g}' for n in (0,2,4) for g in (1,2,3)],targetOrder=['transfer','scratch'],targetAfter='source acquisition phase',sceneHashes={s['id']:s['hash'] for s in manifest['scenes']},pilotRequests=len(rows),usageKnown=len(ok),inputTokens=sum(u['prompt_tokens'] for u in ok),outputTokens=sum(u['completion_tokens'] for u in ok),pilotCNY=round(mean*len(ok),6),meanCNY=mean,pilotActionsPerAttempt=d,scenarios=[scenario(1,True,1),scenario(5,True,4),scenario(10,False,0)],maxGameRequests=9*10*60+3*10+18*9*60+6*9,limitations='Pilot had short M0/M2 memory and censored attempts. Price extrapolation at pilot mean is not a cap or an upper bound. Full raw history can materially increase token usage and price.')
out=p/'run-list.json'
s=json.dumps(o,indent=2)+'\n'
if out.exists():assert out.read_text()==s
else:out.write_text(s)
print(s[s.index('"pilotRequests"'):])
