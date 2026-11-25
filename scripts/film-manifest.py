"""Index replay inputs and CPU encoder outputs. Run from the project root after export."""
import hashlib, json
from pathlib import Path

def sha(p):
    with p.open('rb') as f:
        h=hashlib.sha256()
        for chunk in iter(lambda: f.read(1048576), b''): h.update(chunk)
        return h.hexdigest()

def entry(sidecar):
    info=json.loads(sidecar.read_text())
    film=Path(str(sidecar)[:-5])
    source=Path(info['input'])
    replay=json.loads(source.read_text())
    split=sorted(film.parent.glob(film.stem+'-attempt-*.mp4'))
    return dict(film=str(film),sha256=sha(film),source=str(source),sourceSHA256=sha(source),
                agent=replay['agent'],seed=info['seed'],command=['node','scripts/video.cjs',str(source),str(film),info['layout'],info['timing']]+(['parts'] if split else []),
                settingsLocations=[f'attempts[{i}].config' for i in range(len(replay['attempts']))],
                clips=[dict(file=str(p),sha256=sha(p)) for p in split],frames=info['frames'])
sidecars=[*Path('evidence/videos').glob('*.mp4.json'),*Path('results').glob('*/videos/*.mp4.json')]
print(json.dumps({'witnessSHA256':sha(Path('evidence/oracle-seed-1.json')),'films':[entry(p) for p in sorted(sidecars)]},indent=2))
