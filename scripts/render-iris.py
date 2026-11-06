"""Render the nine-leaf iris preview: python scripts/render-iris.py.
NumPy, Pillow and imageio-ffmpeg. Original procedural artwork, no source footage.
"""
import math
from pathlib import Path
import subprocess

import imageio_ffmpeg
import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parents[1] / 'assets' / 'motion'
W, H, FPS, SECONDS = 1440, 540, 30, 6
X, Y = np.meshgrid(np.arange(W, dtype='f')+.5, np.arange(H, dtype='f')+.5)
TAU = math.tau
SECTOR = TAU/9

def ease(a, b, x):
    n = np.clip((x-a)/(b-a), 0, 1)
    return n*n*(3-2*n)

def mix(a, b, x):
    return a+(b-a)*x

# Engraved letters are pinned to the paper, never scaled with the camera.
font = {'I':'72227','R':'65655','S':'74217','A':'25755','P':'65644',
        'E':'74647','T':'72222','U':'55557','F':'74644','O':'75557',
        'C':'74447','L':'44447','M':'57755','N':'57775'}
words = 'IRISAPERTUREFOCUSCONTROL'
cells = np.zeros((len(words),8,6),dtype='f')
for i, ch in enumerate(words):
    for row, bits in enumerate(font[ch]):
        for col in range(3):
            cells[i,row+1,col+1] = bool(int(bits) & (4>>col))
iy, ix = np.indices((H,W)); j,i = iy//8, ix//6
letters = cells[(i*11+j+(i//7)*3)%len(words),iy%8,ix%6]*(.88+.12*np.cos(i*1.67+j*.4)).astype('f')
grain = (np.sin(X*.73+Y*.19)*np.cos(Y*.91-X*.29)+1)*.5

def frame(t):
    open_by, rest = ease(.22,3.20,t), ease(3.50,5.72,t)
    magnify = math.exp(math.log(7.7)*ease(.64,3.24,t)+math.log(1.44/7.7)*rest)
    ap = .062 + .639*open_by - .235*rest  # polygon apothem, in housing radii
    radius = 174*magnify
    cx = W*(.548-.038*open_by+.023*rest); cy = H*(.477+.017*rest)
    x, y = (X-cx)/radius, (Y-cy)/(radius*.982)
    r, th = np.hypot(x,y), np.arctan2(y,x)
    px = 1/radius
    def inside(d): return 1-ease(-.75*px,.75*px,d)
    def circle(rr): return inside(r-rr)
    def ring(rr,width): return inside(np.abs(r-rr)-width/2)

    # Each straight blade edge pivots through a fixed hinge, while its inner
    # endpoint runs around the aperture polygon. This is not a spinning fan.
    phase = -.21 + math.acos(ap/.82)
    normals = (th-phase+SECTOR*.5)%SECTOR - SECTOR*.5
    window = inside(r*np.cos(normals)-ap)
    seam0 = phase - np.arccos(np.clip(ap/np.maximum(r,ap),0.,1.))
    station = (th-seam0)%TAU/SECTOR
    n, f = np.floor(station), station%1
    shade = .20 + .105*(.5+.5*np.cos((n+.65)*SECTOR-.75)) + .115*(1-f)
    shade += .135*np.exp(-f*r*24) - .105*np.exp(-(1-f)*r*51)
    seam = inside(np.minimum(f,1-f)*SECTOR*r-.0035)
    blades = np.clip(shade + seam*.25 + .023*grain,0,1)
    # Static housing, knurling, three slotted screws and a moving index on the drive ring.
    ink = circle(1.01)*(.23+.085*np.cos(th+.6))
    ink = mix(ink,.49,ring(.991,.007))
    tick = np.abs((th*96/TAU+.5)%1-.5)
    major = np.abs((th*24/TAU+.5)%1-.5)
    ink += .28*(circle(.966)-circle(.925))*inside((tick-.09)*.08)
    ink += .18*(circle(.964)-circle(.905))*inside((major-.032)*.2)
    ink = mix(ink,.075,ring(.903,.013))
    ink = mix(ink,.48,ring(.878,.007))
    for k in range(3):
        angle = k*TAU/3+.30
        dx,dy=x-.924*math.cos(angle),y-.924*math.sin(angle)
        screw=inside(np.hypot(dx,dy)-.018)
        ink=mix(ink,.57,screw)
        ink=mix(ink,.085,screw*inside(np.abs(dx*math.sin(angle+.55)-dy*math.cos(angle+.55))-.0035))
    index=(th+.92-.32*open_by+.12*rest+math.pi)%TAU-math.pi
    ink=mix(ink,.82,(circle(.899)-circle(.861))*inside(np.abs(index)-.019))
    ink=mix(ink,blades,circle(.845)); ink=mix(ink,.61,ring(.847,.013))
    # A pale metallic face leaves the foreground name dominant. A little
    # screen print stays on each leaf; its engraved edge remains continuous.
    density=ink*(.72+.28*letters)
    sheet=np.clip(.15+.63*letters+.03*np.cos(X*.009+Y*.004),0,1)
    paper=(239,235,225); graphite=(92,96,84); sage=(171,183,156); pale=(239,239,221)
    # Once the lens has passed through the opening, return to the settled iris
    # on a pale sage stock. The stock change happens behind a fully open mask.
    new_stock=ease(2.71,3.45,t)
    rgb=np.empty((H,W,3),dtype='uint8')
    for ch in range(3):
        ground=mix(paper[ch],(218,222,206)[ch],new_stock)
        face=mix(ground,graphite[ch],density)
        field=mix(sage[ch],pale[ch],sheet)
        rgb[:,:,ch]=np.clip(mix(face,field,window),0,255)
    return Image.fromarray(rgb)

if __name__=='__main__':
    OUT.mkdir(exist_ok=True)
    frame(0).save(OUT/'iris-opening.webp',quality=93,method=6)
    frame(SECONDS-1/FPS).save(OUT/'iris-rest.webp',quality=93,method=6)
    cmd=[imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-loglevel','error','-y',
         '-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
         '-an','-c:v','libx264','-pix_fmt','yuv420p','-crf','19','-preset','slow',
         '-movflags','+faststart',str(OUT/'iris.mp4')]
    with subprocess.Popen(cmd,stdin=subprocess.PIPE) as enc:
        for i in range(FPS*SECONDS):
            enc.stdin.write(frame(i/FPS).tobytes())
        enc.stdin.close()
        if enc.wait(): raise RuntimeError('Encoding failed')
