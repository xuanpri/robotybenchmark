"""Decode real pilot films and verify frame boundaries/settlement HP against their replays."""
from pathlib import Path
from hashlib import sha256
import json, math
import cv2
import numpy as np
cv2.setNumThreads(1)
root=Path('results/real-dmx-pilot')
out={}
for track,name in [('A','experiment-A-omniscient'),('B','experiment-B-learning')]:
    d=root/track; movie=d/'videos'/f'{name}.mp4'
    metadata=json.loads(Path(str(movie)+'.json').read_text()); replay=json.loads((d/'replay.json').read_text())
    capture=cv2.VideoCapture(str(movie))
    assert capture.isOpened()
    assert [capture.get(i) for i in [3,4,5]]==[1920,1080,30]
    total=0;attempts=[];captions=[]
    retro={m['id']:m for m in json.loads((d/'retrospective-memory.json').read_text())} if (d/'retrospective-memory.json').exists() else {}
    for a in replay['attempts']:
        seconds=(1 if a.get('resetLabel') else 0)+sum(q['end']-q['start'] for q in a['decisions'])+.8+(.8 if not a.get('lesson') else 3)+3*len(a.get('notes',[]))
        n=math.ceil(seconds*30-1e-7)
        for i in range(n):
            ok=capture.grab()
            if not ok:raise ValueError(f'Video truncated in {a["id"]} frame {i}')
            if i in [0,n-1]:
                ok,f=capture.retrieve();assert ok
                row=f[1019,32:212].astype(int)
                pixels=int(np.sum((row[:,1]-row[:,2]>30)&(row[:,1]>140)))
                expected=a['hp'] if i==0 else a['after']
                assert abs(pixels-expected*1.8)<4,(track,a['id'],i,pixels,expected)
        if a['id'] in retro and retro[a['id']]['memory']:
            # Present after the terminal event only; the reflection was unavailable at reset.
            captions.append(((total+n-48)/30,(total+n)/30,retro[a['id']]['memory']['next']))
        total+=n;attempts.append(dict(id=a['id'],frames=n,reflectionCards=len(a.get('notes',[]))))
    assert not capture.grab() and total==metadata['frames'];capture.release()
    if captions:
        def stamp(t):
            ms=round(t*1000)
            return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
        sidecar=movie.with_suffix('.retrospective.en.srt')
        sidecar.write_text(''.join(f'{i}\n{stamp(start)} --> {stamp(end)}\nPost-run reflection (unavailable at reset): {text}\n\n' for i,(start,end,text) in enumerate(captions,1)))
    def digest(p):
        h=sha256()
        with p.open('rb') as f:
            for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
        return h.hexdigest()
    out[track]=dict(frames=total,seconds=total/30,dimensions=[1920,1080],fps=30,layout=metadata['layout'],attempts=attempts,mp4SHA256=digest(movie),replaySHA256=digest(d/'replay.json'))
(root/'video-audit.json').write_text(json.dumps(out,indent=2)+'\n')
print({k:(v['frames'],v['seconds']) for k,v in out.items()})
