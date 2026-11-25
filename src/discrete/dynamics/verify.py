"""Offline artifact, protected-file and full-video validation. No model calls."""
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path
import cv2

cv2.setNumThreads(1)
root = Path(sys.argv[1] if len(sys.argv) > 1 else 'src/discrete/artifacts/phase2-v2')
read = lambda p: json.loads(p.read_text())
summary = read(root / 'summary.json')
assert summary['complete']
assert read(root / 'audit.json')['passed']
assert read(root / 'omniscient-gate.json')['passed']
assert read(root / 'preflight.json')['oracleSolved'] == 90
tests = read(root / 'unit-tests.json')
assert tests['status'] == 0 and 'tests 11' in tests['stdout'] and 'fail 0' in tests['stdout']
regression = (root / 'regression-tests.txt').read_text()
assert 'tests 56' in regression and 'fail 0' in regression
node = shutil.which('node') or '/home/jiaxuanren/miniconda3/envs/codex-env/bin/node'
subprocess.run([node, 'node_modules/typescript/bin/tsc', '--noEmit'], check=True)
before = read(root / 'protected-before.json')
changed = [p for p, digest in before.items() if not Path(p).is_file() or hashlib.sha256(Path(p).read_bytes()).hexdigest() != digest]
assert not changed, changed
(root / 'protected-audit.json').write_text(json.dumps({'passed': True, 'files': len(before), 'changed': []}, indent=2))
for source in read(root / 'manifest.json')['sources']:
    assert hashlib.sha256((Path('src/discrete/dynamics') / source['name']).read_bytes()).hexdigest() == source['hash']
runs = [read(p) for p in root.glob('*/run.json')]
assert len(runs) == summary['completedRuns']
random = [r for r in runs if r['mode'] == 'pure_random']
assert len(random) == 30
assert {(r['seed'], r['attempt']) for r in random} == {(s, a) for s in range(101, 107) for a in range(1, 6)}
for run in runs:
    assert read(root / run['id'] / 'public-history.json') == run['public']
selection = read(root / 'video-selection.json')['ids']
failed = [r['id'] for r in runs if r['outcome'] != 'success']
assert set(failed) <= set(selection)
videos = []
for name in selection:
    folder = root / name
    run, meta = read(folder / 'run.json'), read(folder / 'video.json')
    pngs = sorted((folder / 'frames').glob('*.png'))
    assert len(pngs) == len(run['states'])
    assert meta['frames'] == len(pngs) * 15
    cap = cv2.VideoCapture(str(folder / 'replay.mp4'))
    count = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        assert frame.shape == (1080, 1920, 3)
        if count % 15 == 0:
            expected = cv2.imread(str(pngs[count // 15]))
            assert cv2.absdiff(frame, expected).mean() < 8, (name, count)
        count += 1
    cap.release()
    assert count == meta['frames'], (name, count, meta['frames'])
    videos.append({'id': name, 'frames': count, 'pngStates': len(pngs), 'passed': True})
result = {'passed': True, 'videos': len(videos), 'decodedFrames': sum(v['frames'] for v in videos), 'statePNGs': sum(v['pngStates'] for v in videos), 'runs': videos}
(root / 'video-audit.json').write_text(json.dumps(result, indent=2))
verification = {'passed': True, 'unitTests': 11, 'regressionTests': 56, 'typescript': 'passed', 'protectedFiles': len(before), 'modelRuns': len(runs),
                'pureRandomRuns': len(random), 'modelRequests': summary['modelRequests'], 'allPublicHistoriesMatch': True,
                'frozenCoreSourceHashesMatch': True, 'videoCount': len(videos), 'everyFailureHasVideo': True,
                'figures': [p.name for p in root.glob('*.svg')]}
(root / 'verification.json').write_text(json.dumps(verification, indent=2))
print(json.dumps(verification, indent=2))
