"""Derive stage-specific descriptive statistics from immutable attempt and request logs."""
import json
import statistics
import sys
from pathlib import Path

def load_lines(path):
    return [json.loads(line) for line in path.read_text().splitlines()]
def stage_stats(path):
    report=json.loads((path/'summary.json').read_text())
    requests=load_lines(path/'requests.jsonl')
    events={e['id']:e for e in load_lines(path/'events.jsonl')}
    groups={}
    for attempt in report['attempts']:
        stage=attempt['id'].rsplit('-',1)[0]
        groups.setdefault(stage,[]).append(attempt)
    out={}
    for stage,attempts in groups.items():
        ids={a['id'] for a in attempts}
        calls=[r for r in requests if r['id'].split('/')[0] in ids]
        model=[r for r in calls if r['provider']=='local' and (r['body'] or {}).get('model')]
        valid=[r for r in calls if r['kind']=='act']
        accepted=sum(a['actions'] for a in attempts)
        out[stage]=dict(trials=len(attempts),successes=sum(a['result']=='escaped' for a in attempts),
            hpCharged=sum(events[a['id']]['hpBefore']-events[a['id']]['hpAfter'] for a in attempts),
            meanSurvival=statistics.mean(a['time'] for a in attempts),meanRemainingDistance=statistics.mean(a['remainingDistance'] for a in attempts),
            decisions=len(valid),acceptedActions=accepted,reflectionCalls=len(calls)-len(valid),llmCalls=len(model),
            promptTokens=sum(r['reply']['inputTokens'] for r in model),outputTokens=sum(r['reply']['outputTokens'] for r in model),
            pipelineSeconds=sum(r['reply']['latency'] for r in calls),modelSeconds=sum(r['reply'].get('inferenceLatency',0) for r in model),
            memoryUnit=calls[0]['unit'] if calls else None,peakMemoryUnits=max((r['memoryUnits'] for r in calls),default=0))
    return out
print(json.dumps({p:stage_stats(Path(p)) for p in sys.argv[1:]},indent=2))
