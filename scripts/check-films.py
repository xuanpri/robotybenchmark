"""Decode deliverables, check clocks, and verify reset/HP landmarks against the separate films."""
import json
from pathlib import Path
import cv2
import numpy as np
cv2.setNumThreads(1)
def inspect(path):
    video=cv2.VideoCapture(str(path))
    assert video.isOpened(), path
    fps,w,h,n=(video.get(k) for k in (5,3,4,7))
    assert (fps,w,h)==(30,1920,1080), path
    count=0
    while video.grab():count+=1
    assert count==int(n) and count>0,path
    video.release()
    return count
def at(path,frame):
    v=cv2.VideoCapture(str(path));v.set(1,frame);ok,f=v.read();v.release();assert ok,path
    return f
report={}
for p in sorted([*Path('evidence/videos').glob('*.mp4'),*Path('results').glob('*/videos/*.mp4')]):
    n=inspect(p);report[str(p)]={'frames':n,'seconds':n/30}
    side=Path(str(p)+'.json')
    if side.exists():assert json.loads(side.read_text())['frames']==n
demo=Path('evidence/videos/scene_demo.mp4')
assert report[str(demo)]['seconds']>=40
assert np.mean(cv2.absdiff(at(demo,0),at(demo,187)))>1
for vdir in Path('results').glob('*/videos'):
    combined=vdir/'learning.mp4'
    offset=0
    for clip in sorted(vdir.glob('learning-attempt-*.mp4')):
        n=report[str(clip)]['frames']
        for i in [0,n//2,n-1]:
            a,b=at(clip,i),at(combined,i+offset)
            assert np.mean(cv2.absdiff(a,b))<3.0,(clip,i)
        offset+=n
    assert offset==report[str(combined)]['frames']
mock=Path('results/pilot-film-mock/videos')
# A full HP bar spans x=32..211. The last frame pays the cost, the next attempt starts at 90.
def bar(f):
    row=f[1019,32:212].astype(int)
    return int(np.sum((row[:,1]-row[:,2]>30)&(row[:,1]>140)))
hp=[bar(at(mock/'learning-attempt-001.mp4',i)) for i in [0,report[str(mock/'learning-attempt-001.mp4')]['frames']-1]]
hp+=[bar(at(mock/'learning-attempt-002.mp4',i)) for i in [0,report[str(mock/'learning-attempt-002.mp4')]['frames']-1]]
assert all(abs(a-b)<4 for a,b in zip(hp,[180,162,162,144])),hp
print(json.dumps({'videos':report,'mock_hp_pixels':hp,'resolution':[1920,1080],'fps':30},indent=2))
