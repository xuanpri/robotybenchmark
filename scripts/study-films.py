"""Render and verify missing study films serially. Existing valid outputs are reused."""
import json, os, sys, subprocess, pathlib
import cv2
root=pathlib.Path('evidence/layout-transfer-1')
def export(src,dst,mode,parts=False):
    if not dst.exists():
        subprocess.run(['node','scripts/video.cjs',str(src),str(dst),mode,'simulation']+(['parts'] if parts else []),check=True)
    cap=cv2.VideoCapture(str(dst))
    meta=json.loads(pathlib.Path(str(dst)+'.json').read_text())
    try:
        assert [round(cap.get(k)) for k in (cv2.CAP_PROP_FRAME_WIDTH,cv2.CAP_PROP_FRAME_HEIGHT,cv2.CAP_PROP_FPS,cv2.CAP_PROP_FRAME_COUNT)]==[1920,1080,30,meta['frames']]
        cap.set(cv2.CAP_PROP_POS_FRAMES,min(50,meta['frames']-1))
        ok,frame=cap.read()
        assert ok
        thumb=dst.with_suffix('.jpg')
        if not thumb.exists(): assert cv2.imwrite(str(thumb),cv2.resize(frame,(960,540)))
    finally:cap.release()
if sys.argv[1]=='scenes':
    for row in json.loads((root/'scene-manifest.json').read_text())['scenes']:
        export(root/row['replay'],root/row['video'],'omniscient')
else:
    for src in sorted(pathlib.Path('results/layout-transfer-1').glob('*/replay.json')):
        if len(sys.argv)>2 and src.parent.name not in sys.argv[2:]:continue
        st=json.loads((src.parent/'checkpoint.json').read_text())
        if st['status'] in ('acquired','not_acquired','paused') and json.loads(src.read_text())['attempts']:
            dst=src.parent/('film-'+str(st['decisions'])+'-'+st['status']+'.mp4')
            export(src,dst,'omniscient' if st['group']=='G1' else 'split',True)
