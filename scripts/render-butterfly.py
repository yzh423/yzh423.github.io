"""Render the original homepage ink-wing study. Requires numpy, Pillow, imageio-ffmpeg.
Run from any directory: python scripts/render-butterfly.py
The film has no sound; its final frame and poster remain useful without motion.
"""
from pathlib import Path
import subprocess
import math
import numpy as np
from PIL import Image, ImageDraw
import imageio_ffmpeg

OUT = Path(__file__).resolve().parents[1] / 'assets' / 'motion'
OUT.mkdir(exist_ok=True)
W, H, FPS, SEC = 984, 444, 30, 6
PAPER = (235, 232, 225)
rng = np.random.default_rng(247)

def bezier(p, a, b, q, steps=40):
    t = np.linspace(0, 1, steps)[:, None]
    return (1-t)**3*p + 3*(1-t)**2*t*a + 3*(1-t)*t**2*b + t**3*q

def curve(points):
    knots=np.array(points,dtype=float)
    return np.vstack([bezier(*knots[i:i+4]) for i in range(0,len(knots)-1,3)])

# A forewing and a scalloped hindwing share the same thoracic hinge.
fore = curve([(4,-18),(32,-62),(129,-148),(200,-154),(219,-156),(204,-81),(181,-54),
              (163,-26),(118,-7),(74,4),(39,13),(18,3),(4,-18)])
hind = curve([(5,-5),(29,-22),(101,-33),(136,-16),(156,1),(141,27),(131,41),
              (125,48),(125,62),(113,62),(109,72),(105,85),(94,83),
              (89,93),(78,102),(70,97),(62,117),(51,126),(50,106),
              (25,107),(10,58),(5,-5)])
def pts(a): return [tuple(row) for row in a]
def uv(points): return np.asarray(points)+[0,166]
mask=Image.new('L',(227,303)); brush=ImageDraw.Draw(mask)
vein=Image.new('L',mask.size); pen=ImageDraw.Draw(vein)
for shape in (hind,fore):
    brush.polygon(pts(uv(shape)),fill=255)
    pen.line(pts(uv(shape)),fill=250,width=3)
for x,y in [(202,-148),(199,-113),(189,-79),(168,-51),(140,-30),(112,-15),
            (132,24),(117,57),(91,81),(69,99),(51,104)]:
    route=curve([(5,-9),(x*.32,y*.12-9),(x*.68,y*.64-2),(x,y)])
    pen.line(pts(uv(route)), fill=210,width=2)
# Cells, pigmented margins and small light spots are marks on the wing membrane;
# their projected positions follow each fold rather than sliding over the surface.
m,v=np.asarray(mask),np.asarray(vein)
x,y=np.meshgrid(np.arange(4,217,3.45),np.arange(-157,127,3.65))
x=x.ravel();y=y.ravel()
x+=rng.uniform(-.75,.75,x.shape); y+=rng.uniform(-.65,.65,y.shape)
ix=x.astype(int);iy=(y+166).astype(int)
inside=m[iy,ix]>0
x=x[inside];y=y[inside]; ink=v[iy[inside],ix[inside]]/255
r=np.hypot(x*.87,y*.76); stripe=(np.cos(r*.091+.36*np.sin(y*.072)) + 1)*.5
marbling=(np.sin(x*.066-y*.10)+1)*.5
outer=np.clip((r-99)/58,0,1)
value=np.clip(.22+.28*stripe+.13*marbling+.20*outer+.53*ink+rng.normal(0,.075,len(x)),.12,1)
# Pale border spots, with fine dark edging left visible.
for cx,cy,rx,ry in [(189,-129,4,7),(181,-111,5,8),(171,-93,5,7),(157,-76,5,7),
                     (144,-61,4,6),(123,26,5,7),(111,48,5,7),(91,68,5,7),(69,83,4,6)]:
    value[((x-cx)/rx)**2+((y-cy)/ry)**2<1]*=.17
u=np.tile(x,2)*np.repeat([-1,1],len(x)); v0=np.tile(y,2); pigment=np.tile(value,2)
jitter=np.tile(rng.uniform(-.5,.5,len(x)),2)
def frame(t):
    phi=2*math.pi*t/SEC
    # A flurry of wingbeats subsides into a glide, then a clear open-wing pose.
    envelope=math.sin(math.pi*t/SEC)**1.1
    turn=.12+.14*math.sin(phi-.3)*envelope
    fold=.20+envelope*(.32+.44*(1+math.sin(2*math.pi*t*.97+.18*math.sin(phi)))/2)
    cx=W*.5+20*math.sin(phi+.55)*envelope
    cy=H*.485+10*math.sin(phi*2)*envelope
    def proj(a,b):
        a,b=np.asarray(a),np.asarray(b); f=fold*(.98+.04*np.sign(a))+.065*b/150
        xx=a*np.cos(f); z=np.abs(a)*np.sin(f)
        yy=b+z*.30+np.sin(np.abs(a)/205*math.pi)*z*.10
        return cx+1.15*(xx*math.cos(turn)-yy*math.sin(turn)), cy+1.15*(xx*math.sin(turn)+yy*math.cos(turn))
    img=Image.new('RGB',(W,H),PAPER); p=ImageDraw.Draw(img)
    X,Y=proj(u,v0)
    vals=(219-pigment*(139+17*np.sin(fold))).astype(int)
    # Short, separated ink strokes retain the feel of a printed specimen in motion.
    for a,b,k,l,h in zip(X,Y,vals,pigment,jitter):
        color=(k+1,k,max(0,k-4)); a,b=round(a),round(b)
        p.line((a,b,a+(k<132),b+1+int(l>.51)),fill=color,width=1)
        if l>.62 and h>-.15:p.point((a-1,b+1),fill=color)
    def line(ps,shade,width):
        cx1,cy1=proj(ps[:,0],ps[:,1]);p.line(pts(np.c_[cx1,cy1]),fill=shade,width=width)
    for side in (-1,1):
        line(curve([(0,-27),(side*3,-49),(side*17,-58),(side*21,-64)]),(91,88,79),1)
    for yy in np.arange(-27,51,2):
        radius=1.4+3.1*math.exp(-((yy+11)/15)**2)+1.6*math.exp(-((yy-16)/24)**2)
        a,b=proj(0,yy);p.ellipse((a-radius,b-2,a+radius,b+2),fill=(94,90,79))
    return img
if __name__=='__main__':
    frame(0).save(OUT/'inkwing.webp','WEBP',quality=91,method=6)
    cmd=[imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-loglevel','error','-y','-f','rawvideo',
         '-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264',
         '-preset','slow','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'inkwing.mp4')]
    with subprocess.Popen(cmd,stdin=subprocess.PIPE) as encoder:
        for i in range(FPS*SEC): encoder.stdin.write(frame(i/(FPS*SEC-1)*SEC).tobytes())
        encoder.stdin.close()
        if encoder.wait(): raise RuntimeError('Encoding failed')
