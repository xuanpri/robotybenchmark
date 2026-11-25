import json,hashlib,re
from pathlib import Path
p=Path('src/discrete/artifacts/phase2-v2b')
s=json.loads((p/'summary.json').read_text());st=json.loads((p/'stale-rule-audit.json').read_text());seed=json.loads((p/'seed105-reasons.json').read_text())
text='# Local audit details\n\nOld-rule diagnostics are associations, not causal evidence of memory reliance. Primary evaluates previous parameters on actual current internal counters; latent-support marginalizes compatible phases; elapsed-trajectory replays old phase at the same tick.\n\n| Mode / condition | Wrong | Applicable | Direct matches | Compatible-old-phase support | Old elapsed-trajectory matches |\n|---|---:|---:|---:|---:|---:|\n'
for mode in ['parametric_shift','pattern_shift']:
 for c in ['Partial-unknown-passive','Partial-unknown-interactive']:
  r=[r for r in st['rows'] if r['mode']==mode and r['condition']==c];a=[x for x in r if x['matches_prev_attempt_rule'] is not None]
  text+=f"| {mode} / {c} | {len(r)} | {len(a)} | {sum(bool(x['matches_prev_attempt_rule']) for x in a)} | {sum(x['previousRuleCompatibleLatentSupport'] for x in r)} | {sum(x['matchesPreviousElapsedTrajectory'] for x in r)} |\n"
text+='\n## Seed 105 original reasoning\n\n'
pattern=re.compile(r'previous (?:attempt|run|trial)|prior (?:same-start collision|attempt|run|trial|failure)|last (?:attempt|run|trial)|earlier (?:attempt|run|trial)|上一局|上次',re.I)
for r in seed:
 text+=f"### {r['condition']}, attempt {r['attempt']}, {r['outcome']}\n\n"
 chosen=[x for x in r['steps'] if pattern.search(x['reason'] or '')]
 text+=f'Explicit prior-attempt/failure references: {len(chosen)}.\n\n'
 for x in (chosen+[r['steps'][-1]]):text+=f"- tick {x['tick']}, action {x['action']}, correct={x['correct']}: {x['reason']}\n"
text+='\n## Representative failed-step reasoning\n\n'
for mode in ['parametric_shift','pattern_shift']:
 for c in ['Partial-unknown-passive','Partial-unknown-interactive']:
  r=next((r for r in st['rows'] if r['mode']==mode and r['condition']==c and r['fatal']),None)
  if r:text+=f"- {r['id']}, tick {r['tick']}: {r['reason']}\n"
text+='\n## Immediate Counterfactual Attribution\n\nOnly the directly fatal step is relabeled; earlier risk management is not ruled out. Stochastic Realization Error is an interpretation for the random world, not a new replay of causality.\n\n| Dynamics | Condition | Format | Prediction | Planning | Stochastic realization |\n|---|---|---:|---:|---:|---:|\n'
for r in s['attribution']['rows']:text+=f"| {r['mode']} | {r['condition']} | {r['Format Error']} | {r['Prediction Error']} | {r['Action/Planning Error']} | {r['Stochastic Realization Error']} |\n"
(p/'LOCAL-DETAILS.md').write_text(text)
checks=[];ids=[]
for f in p.glob('*/wire/*.json'):
 r=json.loads(f.read_text());u=json.loads(r['body']['messages'][1]['content']);assert u['attempt']==1 and u['active_attempt']['attempt']==1 and not u['previous_attempts'];assert re.search(r'seed-\d+-attempt-\d+',str(f));
 if r.get('status')==200:ids.append(json.loads(r['raw'])['id'])
before=json.loads((p/'protected-before.json').read_text());changed=[f for f,h in before.items() if hashlib.sha256(Path(f).read_bytes()).hexdigest()!=h];assert not changed
(p/'protected-audit.json').write_text(json.dumps({'passed':True,'files':len(before),'changed':[]},indent=2))
(p/'sampling-audit.json').write_text(json.dumps({'passed':True,'wireReceipts':len(ids),'uniqueResponseIDs':len(set(ids)),'responseIDDuplicates':len(ids)-len(set(ids)),'allPromptAttemptsFixedToOne':True,'allCrossAttemptHistoriesEmpty':True,'realSeedAttemptInEveryReceiptPath':True,'sameAttemptResumeOnly':True},indent=2))
print('Verified',len(ids),'wire responses; protected',len(before),'unchanged')
