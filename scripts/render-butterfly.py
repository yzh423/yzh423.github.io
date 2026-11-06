"""Render the original typographic butterfly film (numpy, Pillow, imageio-ffmpeg).
The marks, wing drawings and camera moves are authored here; no input footage.
Run: python scripts/render-butterfly.py
"""
from pathlib import Path
import math
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import imageio_ffmpeg

OUT = Path(__file__).resolve().parents[1] / 'assets' / 'motion'
W, H, FPS, SECONDS = 1440, 540, 30, 6
# Render the moving continuous-tone plate at half resolution. Print marks are
# composited at delivery resolution, so fine type does not shimmer when zooming.
S = 3
XX, YY = np.meshgrid(np.arange(W, dtype='f')+.5, np.arange(H, dtype='f')+.5)
U, V = XX/W, YY/H
def ramp(a,b,x):
    n=np.clip((x-a)/(b-a),0,1)
    return n*n*(3-2*n)
def mix(a,b,x): return a+(b-a)*x
def track(t,keys):
    for (a,v),(b,w) in zip(keys,keys[1:]):
        if t<=b: return mix(v,w,ramp(a,b,t))
    return keys[-1][1]
def curve(points):
    p=np.array(points,dtype=float); t=np.linspace(0,1,34)[:,None]
    return np.vstack([(1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d
                      for a,b,c,d in (p[i:i+4] for i in range(0,len(p)-1,3))])
def path(ps): return [tuple(row) for row in (np.asarray(ps)+[9,173])*S]
fore=curve([(4,-18),(32,-62),(129,-148),(200,-154),(219,-156),(204,-81),(181,-54),
            (163,-26),(118,-7),(74,4),(39,13),(18,3),(4,-18)])
hind=curve([(5,-5),(29,-22),(101,-33),(136,-16),(156,1),(141,27),(131,41),
            (125,48),(125,62),(113,62),(109,72),(105,85),(94,83),
            (89,93),(78,102),(70,97),(62,117),(51,126),(50,106),
            (25,107),(10,58),(5,-5)])
shape=Image.new('L',(234*S,310*S)); pen=ImageDraw.Draw(shape)
for wing in [hind,fore]: pen.polygon(path(wing),fill=251)
y,x=np.indices((shape.height,shape.width),dtype='f');x=x/S-9;y=y/S-173
radius=np.hypot(x*.87,y*.76)
bands=(np.cos(radius*.1+.8*np.sin(y*.053))*.5+.5)
density=105+55*bands+65*ramp(84,151,radius)+12*np.sin(x*.12-y*.045)
for cx,cy,rx,ry in [(188,-128,4,8),(179,-109,5,9),(169,-91,5,8),(156,-75,6,7),
                     (143,-59,5,7),(123,26,5,8),(111,48,5,8),(91,68,5,8),(69,83,4,7)]:
    d=((x-cx)/rx)**2+((y-cy)/ry)**2
    density*=.14+.86*ramp(.64,1.15,d)
material=Image.fromarray(np.clip(density,0,255).astype('uint8')); pen=ImageDraw.Draw(material)
for tx,ty in [(202,-148),(199,-113),(189,-79),(168,-51),(140,-30),(112,-15),
               (132,24),(117,57),(91,81),(69,99),(51,104)]:
    route=curve([(5,-9),(tx*.32,ty*.15-8),(tx*.68,ty*.7-2),(tx,ty)])
    pen.line(path(route),fill=245,width=2*S)
pen.line(path(fore),fill=239,width=2*S);pen.line(path(hind),fill=239,width=2*S)
plate=np.array(material)* (np.array(shape)>0)
material=Image.fromarray(plate.astype('uint8')).filter(ImageFilter.GaussianBlur(.65))

# A custom 3 by 5 alphabet for the screen-printed field. The column offset
# locks the texture to the paper; the wing silhouette moves through it.
alphabet=dict(zip('ACEFGHIKLMNOPRSTUVY012',
 ['25757','74447','74647','74644','74557','55755','72227','55655','44447',
  '57755','57775','75557','75744','75655','74217','72222','55557','55552','55222','75557','26227','71247']))
words='MOTIONKINEMATICSCONTROLTRAJECTORY012'
tiles=np.zeros((len(words),8,6),dtype='uint8')
for i,ch in enumerate(words):
    for row,n in enumerate(alphabet.get(ch,'00000')):
        for col in range(3):
            if int(n)&(4>>col): tiles[i,row+1,col+1]=255
iy,ix=np.indices((H,W)); col=ix//6; row=iy//8
char=(col*13+row+(col//5)*7+(row//11)*3)%len(words)
glyph=tiles[char,iy%8,ix%6].astype('f')/255
# fine pressure variations are static; there is no frame-to-frame grain noise
pressure=(.89+.11*np.cos(col*1.73+row*.37)).astype('f')
glyph*=pressure
dist=np.hypot(((XX*.94+YY*.34)/5.9)%1-.5, ((YY*.94-XX*.34)/5.9)%1-.5)
radial=np.sqrt(((U-.5)*1.27)**2+((V-.47)*.52)**2)
rolloff=(.7*np.sin(U*7+V*3)+.3*np.sin(V*11-U*4)).astype('f')

def projection(t):
    macro=ramp(1.94,3.18,t)*(1-ramp(3.69,5.61,t))
    env=(1-ramp(4.85,5.85,t))
    fold=.20+env*(.18+.50*(.5+.5*math.sin(2*math.pi*(t*.92+.048*math.sin(2*t))-.8)))
    turn=.055+.095*math.sin(t*1.35)*env-.17*macro
    zoom=track(t,[(0,1.08),(.97,1.48),(1.94,1.73),(3.18,4.25),(3.69,4.08),(5.65,1.62)])
    cx=W*(.5+.28*macro)+9*math.sin(t*2.2)*env
    cy=H*(.523+.61*macro)+5*math.sin(t*3.1)*env
    center=np.array([cx,cy])/2
    rot=np.array([[math.cos(turn),-math.sin(turn)],[math.sin(turn),math.cos(turn)]])
    return center,rot,zoom,fold

def wing_plate(t):
    c,rot,zoom,fold=projection(t)
    accum=Image.new('L',(W//2,H//2))
    for side in [-1,1]:
        ang=fold+side*.045
        mat=(zoom/2)*rot@np.array([[side*math.cos(ang),0],[.27*math.sin(ang),1.]])
        inv=np.linalg.inv(mat)*S
        offset=np.array([9,173])*S-inv@c
        coeff=(inv[0,0],inv[0,1],offset[0],inv[1,0],inv[1,1],offset[1])
        sideplate=material.transform(accum.size,Image.Transform.AFFINE,coeff,Image.Resampling.BILINEAR)
        accum=Image.fromarray(np.maximum(np.asarray(accum),np.asarray(sideplate)))
    pen=ImageDraw.Draw(accum)
    def xy(ps):return [tuple(pt) for pt in np.asarray(ps)@(rot*zoom/2).T+c]
    pen.line(xy([(0,48),(0,-25)]),fill=235,width=max(2,round(3.1*zoom)))
    pen.line(xy([(0,4),(0,-22)]),fill=248,width=max(2,round(5.1*zoom)))
    for sg in [-1,1]:
        pen.line(xy(curve([(0,-24),(sg*3,-41),(sg*16,-49),(sg*19,-58)])),fill=230,width=max(1,round(zoom*.65)))
    return np.asarray(accum.resize((W,H),Image.Resampling.BILINEAR)).astype('f')/255

PAPER=np.array([237,234,226],dtype='f')
INK=np.array([66,67,53],dtype='f')
SAGE=np.array([176,187,158],dtype='f')
PALE=np.array([239,239,225],dtype='f')
GREEN=np.array([151,166,133],dtype='f')
def frame(t):
    wing=wing_plate(t)
    # Iris from pigment on bare paper to pale wings knocked out of sage type.
    iris=ramp(-.13,.14,1.01*ramp(.52,1.67,t)-radial-.16)
    dots=ramp(3.10,4.66,t-.18*(U-.5))
    wing_cover=ramp(.045,.82,wing)
    # Positive-print passages are made from the same alphabet as the ground.
    ink=wing*(.095+.905*glyph)
    bg_light=np.clip(glyph*(.6+.08*rolloff)+.029*rolloff,0,1)
    negative=wing_cover*(.74+.25*wing)
    light=mix(bg_light,.98,negative)
    # In the final exposure, the screen angle changes, revealing a halftone wing.
    dot_radius=.435*(1-.91*wing_cover)+.012*rolloff
    print_dot=1-ramp(dot_radius-.056,dot_radius+.056,dist)
    image=np.empty((H,W,3),dtype='uint8')
    for j in range(3):
        start=mix(PAPER[j],INK[j],ink)
        field=mix(SAGE[j],PALE[j],light)
        dot_field=mix(PALE[j],GREEN[j],print_dot*.93)
        image[:,:,j]=np.clip(mix(mix(start,field,iris),dot_field,dots),0,255)
    return Image.fromarray(image)

if __name__=='__main__':
    OUT.mkdir(exist_ok=True)
    frame(5.99).save(OUT/'inkwing.webp','WEBP',lossless=True,method=6)
    frame(0).save(OUT/'inkwing-opening.webp','WEBP',quality=90,method=6)
    cmd=[imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-loglevel','error','-y','-f','rawvideo',
         '-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264',
         '-preset','slow','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'inkwing.mp4')]
    with subprocess.Popen(cmd,stdin=subprocess.PIPE) as encoder:
        for i in range(FPS*SECONDS): encoder.stdin.write(frame(i/FPS).tobytes())
        encoder.stdin.close()
        if encoder.wait(): raise RuntimeError('Encoding failed')
