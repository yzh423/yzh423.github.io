"""Render an original ink study of a robot picking up a machined bushing.
Run: python scripts/render-grasp.py (NumPy, Pillow, imageio-ffmpeg).
This is artwork, not a measurement or experiment recording.
"""
from pathlib import Path
import math
import subprocess
import numpy as np
from PIL import Image, ImageDraw
import imageio_ffmpeg

OUT = Path(__file__).resolve().parents[1] / 'assets' / 'motion'
W, H, FPS, SECONDS = 1440, 540, 30, 6
XX, YY = np.meshgrid(np.arange(W, dtype='f')+.5, np.arange(H, dtype='f')+.5)
U, V = XX/W, YY/H
def ramp(a,b,x):
    n=np.clip((x-a)/(b-a),0,1)
    return n*n*(3-2*n)
def mix(a,b,x): return a+(b-a)*x
# A custom 3 by 5 alphabet for the screen-printed field. The column offset
# locks the texture to the paper; the geometry moves through it.
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
rolloff=(.7*np.sin(U*7+V*3)+.3*np.sin(V*11-U*4)).astype('f')

def pose(t):
    """Wrist and part share a pose only after the jaws close on the bushing."""
    reach = ramp(0, 1.22, t)
    lift = ramp(1.72, 3.08, t)
    carry = ramp(2.45, 4.90, t)
    grip = ramp(1.12, 1.66, t)
    wrist = np.array([mix(803, 843, reach) - 49*carry, mix(170, 250, reach) - 88*lift])
    part = np.array([843 - 49*carry, 337 - 88*lift])
    return wrist, part, mix(57, 32, grip)

def arm_plate(t):
    wrist, part, gap = pose(t)
    shoulder = np.array([500.,366.])
    # Analytic two-link IK keeps both castings rigid during approach and lift.
    reach = wrist-shoulder
    length = np.linalg.norm(reach)
    u = reach/length
    normal = np.array([-u[1],u[0]])
    a,b=203.,248.
    s = (length**2+a*a-b*b)/(2*length)
    elbow = shoulder + s*u - math.sqrt(max(0,a*a-s*s))*normal

    push = ramp(.70,3.44,t)
    back = ramp(3.44,5.83,t)
    macro = push*(1-back)
    zoom = math.exp(math.log(3.3)*push + math.log(1.14/3.3)*back)
    center = np.array([687.,265.])*(1-macro) + (part+[-8,-28])*macro
    def screen(p): return (np.asarray(p)-center)*zoom + [W/2,H/2]
    img = Image.new('L',(W,H))
    pen = ImageDraw.Draw(img)
    def pts(points): return [tuple(p) for p in screen(points)]
    def polygon(points, value): pen.polygon(pts(points),fill=value)
    def line(points, value, width): pen.line(pts(points),fill=value,width=max(1,round(width*zoom)),joint='curve')
    def circle(center,r,value):
        pt=screen(center); rr=r*zoom;pen.ellipse([tuple(pt-rr),tuple(pt+rr)],fill=value)
    def bar(p,q,r1,r2,value):
        delta=q-p
        perp=np.array([-delta[1],delta[0]])/np.linalg.norm(delta)
        polygon([p+r1*perp,q+r2*perp,q-r2*perp,p-r1*perp],value)
        circle(p,r1,value);circle(q,r2,value)
    def joint(p,r):
        for f,v in [(1,230),(.88,142),(.71,76),(.54,226),(.44,147),(.24,55)]:
            circle(p,r*f,v)
        for i in range(6):
            ang=i*math.tau/6
            circle(p+.79*r*np.array([math.cos(ang),math.sin(ang)]),1.6,45)
    def casting(p,q,r1,r2):
        # Metal edges and a relieved channel, like an inked workshop drawing.
        bar(p,q,r1,r2,215)
        bar(p+(q-p)*.05,q-(q-p)*.05,r1*.80,r2*.77,135)
        bar(p+(q-p)*.16,q-(q-p)*.17,r1*.41,r2*.39,74)
        line([p+(q-p)*.17,q-(q-p)*.18],185,2)
    # Bolted plinth and the part's small fixture on the work surface.
    polygon([(447,425),(457,410),(475,405),(482,368),(518,368),(527,405),(547,410),(555,425)],181)
    line([(448,426),(555,426)],230,4)
    for x in [464,538]: circle([x,415],3.1,69)
    line([(793,377),(893,377)],119,4)
    for x in [815,871]:
        polygon([(x-5,376),(x-5,367),(x+2,361),(x+5,362),(x+5,376)],152)
    casting(shoulder,elbow,31,24);casting(elbow,wrist,25,16)
    joint(shoulder,36);joint(elbow,30);joint(wrist,18)
    # Flange, cross slide, and mirrored L-shaped parallel fingers.
    def rel(points): return np.asarray(points)+wrist
    polygon(rel([(-11,11),(11,11),(11,26),(-11,26)]),170)
    polygon(rel([(-53,23),(53,23),(58,29),(58,46),(53,51),(-53,51),(-58,46),(-58,28)]),225)
    polygon(rel([(-50,29),(50,29),(50,42),(-50,42)]),110)
    for sign in [-1,1]:
        finger=np.array([(gap-5,42),(gap+12,42),(gap+12,90),(gap+5,99),(gap,99),(gap,78),(gap+3,76),(gap+3,53),(gap-5,53)])
        finger[:,0]*=sign
        polygon(rel(finger),232)
        line(rel([(sign*(gap+8),54),(sign*(gap+8),85)]),104,2)
    # Machined bushing: through bore, two concentric shoulders and six drilled holes.
    for rad,val in [(32,233),(30,110),(27.7,201),(20.5,167),(17.2,237),(14.8,93),(12.8,0)]:
        circle(part,rad,val)
    for i in range(6):
        ang=(i+.5)*math.tau/6
        p=part+23.5*np.array([math.cos(ang),math.sin(ang)])
        circle(p,3.1,61);circle(p,2.0,0)
    return np.asarray(img).astype('f')/255, screen(part), 32*zoom

PAPER=np.array([237,234,226],dtype='f')
INK=np.array([66,67,53],dtype='f')
SAGE=np.array([176,187,158],dtype='f')
PALE=np.array([239,239,225],dtype='f')
GREEN=np.array([151,166,133],dtype='f')
def frame(t):
    plate, center, radius = arm_plate(t)
    # The impression starts at contact and spreads past the contour of the part.
    # During the return to a wider view the screen itself stays fixed to the page.
    if t < 1.46: impression=0.
    elif t >= 3.32: impression=1.
    else:
        distance=np.hypot(XX-center[0], YY-center[1])-radius
        front=mix(-150,1500,ramp(1.46,3.32,t))
        impression=ramp(-95,95,front-distance+(V-.5)*28)
    dots=ramp(3.65,5.35,t-.18*(U-.5))
    coverage=ramp(.0,1.,plate)
    # Positive-print passages are made from the same alphabet as the ground.
    ink=plate*(.095+.905*glyph)
    bg_light=np.clip(glyph*(.6+.08*rolloff)+.029*rolloff,0,1)
    negative=coverage*(.82+.18*plate)
    light=mix(bg_light,.98,negative)
    # In the final exposure, the screen angle changes, revealing a halftone drawing.
    dot_radius=.435*(1-.91*coverage)+.012*rolloff
    print_dot=1-ramp(dot_radius-.056,dot_radius+.056,dist)
    image=np.empty((H,W,3),dtype='uint8')
    for j in range(3):
        start=mix(PAPER[j],INK[j],ink)
        field=mix(SAGE[j],PALE[j],light)
        dot_field=mix(PALE[j],GREEN[j],print_dot*.93)
        image[:,:,j]=np.clip(mix(mix(start,field,impression),dot_field,dots),0,255)
    return Image.fromarray(image)

if __name__=='__main__':
    OUT.mkdir(exist_ok=True)
    frame(5.99).save(OUT/'grasp-study.webp','WEBP',lossless=True,method=6)
    frame(0).save(OUT/'grasp-study-opening.webp','WEBP',quality=90,method=6)
    cmd=[imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-loglevel','error','-y','-f','rawvideo',
         '-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264',
         '-preset','slow','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'grasp-study.mp4')]
    with subprocess.Popen(cmd,stdin=subprocess.PIPE) as encoder:
        for i in range(FPS*SECONDS): encoder.stdin.write(frame(i/FPS).tobytes())
        encoder.stdin.close()
        if encoder.wait(): raise RuntimeError('Encoding failed')
