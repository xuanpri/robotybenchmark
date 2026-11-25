"""Length-prefixed JPEG frames to a CPU-encoded MP4 with optional per-attempt segments."""
import sys, struct, cv2, numpy as np
cv2.setNumThreads(1)
def writer(path):
    w=cv2.VideoWriter(path,cv2.CAP_FFMPEG,cv2.VideoWriter_fourcc(*'mp4v'),30,(1920,1080))
    if not w.isOpened(): raise RuntimeError('FFmpeg MPEG-4 encoder unavailable')
    return w
out=writer(sys.argv[1]); part=None; current=None; frame=None
try:
    while True:
        header=sys.stdin.buffer.read(8)
        if not header:break
        idx,n=struct.unpack('>II',header)
        if idx!=current and len(sys.argv)>2:
            if part:part.release()
            part=writer(sys.argv[2] % (idx+1))
        if current!=idx:frame=None
        current=idx
        if n:frame=cv2.imdecode(np.frombuffer(sys.stdin.buffer.read(n),np.uint8),cv2.IMREAD_COLOR)
        if frame is None or frame.shape[:2]!=(1080,1920):raise ValueError('incomplete frame')
        out.write(frame)
        if part:part.write(frame)
finally:
    if part:part.release()
    out.release()
