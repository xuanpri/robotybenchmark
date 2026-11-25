#!/bin/bash
# Offline supervisor. No credential access or provider requests.
set -eu
cd "$(dirname "$0")/.."
export PATH=/home/jiaxuanren/miniconda3/envs/codex-env/bin:"$PATH"
root=results/layout-transfer-1
while true; do
  bash scripts/study-video.sh experiments
  node --import tsx scripts/study-distance.ts
  node --import tsx scripts/study-behavior.ts
  python3 scripts/study-report.py
  if python3 - <<'PY'
import json,sys,pathlib
p=pathlib.Path('results/layout-transfer-1')
rows={x.parent.name:json.loads(x.read_text()) for x in p.glob('*/checkpoint.json')}
done=lambda r:r.get('status') in ('acquired','not_acquired')
needed=[]
for n in (0,2,4):
    k=f'A-N{n}-G3-source';needed.append(k)
    if rows.get(k,{}).get('status')=='acquired':
        needed.extend([f'B-N{n}-G3-{arm}' for arm in ('transfer','scratch')])
concluded=all(done(rows.get(k,{})) for k in needed) or any(r['status']=='paused' for r in rows.values())
films=all((p/k/f"film-{r['decisions']}-{r['status']}.mp4.json").exists() for k,r in rows.items() if done(r) or r['status']=='paused')
sys.exit(0 if concluded and films else 1)
PY
  then
    node --import tsx scripts/study-verify.ts > "$root/replay-verification.txt"
    break
  fi
  sleep 45
done
