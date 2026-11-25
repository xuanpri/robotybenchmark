"""Check complete films and every attempt segment against recorded timing."""
import cv2,json,math,pathlib
ev=pathlib.Path('evidence/layout-transfer-1');root=pathlib.Path('results/layout-transfer-1')
def read(f):return json.loads(f.read_text())
def inspect(p,expected):
    c=cv2.VideoCapture(str(p))
    try:
        actual=[round(c.get(k)) for k in [cv2.CAP_PROP_FRAME_WIDTH,cv2.CAP_PROP_FRAME_HEIGHT,cv2.CAP_PROP_FPS,cv2.CAP_PROP_FRAME_COUNT]]
        assert actual==[1920,1080,30,expected],(p,actual,expected)
        for i in (0,expected//2,expected-1):
            c.set(cv2.CAP_PROP_POS_FRAMES,i)
            ok,bgr=c.read();assert ok and bgr.std()>12,(p,i,'frame decode')
    finally:c.release()
    return {'path':str(p),'frames':expected}
checked=[]
for s in read(ev/'scene-manifest.json')['scenes']:
    checked.append(inspect(ev/s['video'],s['duration']*30))
for file in sorted(root.glob('*/replay.json')):
    r=read(file);state=read(file.parent/'checkpoint.json')
    movie=file.parent/f"film-{state['decisions']}-{state['status']}.mp4"
    info=read(pathlib.Path(str(movie)+'.json'))
    assert info['layout']=='split' and info['timing']=='simulation'
    n=0
    for i,a in enumerate(r['attempts'],1):
        duration=sum(d['end']-d['start'] for d in a['decisions'])+(.8+(3 if a.get('lesson') else .8))+3*len(a.get('notes',[]))+int(bool(a.get('resetLabel')))
        frames=math.ceil(duration*30-.0000001);n+=frames
        checked.append(inspect(movie.with_name(movie.stem+f'-attempt-{i:03d}.mp4'),frames))
    assert n==info['frames'];checked.append(inspect(movie,n))
(root/'verified-videos.json').write_text(json.dumps(checked,indent=2)+'\n')
print(len(checked),'videos verified')
