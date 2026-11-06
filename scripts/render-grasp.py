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

def travel(start, end, time):
    # Quintic motion gives zero velocity and acceleration at both stops.
    fraction = float(np.clip((time - start) / (end - start), 0, 1))
    return fraction**3 * (10 + fraction * (-15 + 6*fraction))


PART_RADIUS = 32.
PART_SEAT = np.array([843., 337.])


def pose(t):
    align = travel(0, .93, t)
    descend = travel(.24, 1.35, t)
    close = travel(1.36, 1.93, t)
    lift = travel(2.16, 3.55, t)
    carry = travel(2.95, 4.85, t)

    # A level approach ends directly above the V-block. Both fingers reach
    # the OD before the first lifting frame. Only then does the load follow.
    offset = np.array([-57 * carry, -98 * lift])
    wrist = np.array([mix(756, PART_SEAT[0], align), mix(171, 250, descend)]) + offset
    return wrist, PART_SEAT + offset, mix(57, PART_RADIUS, close)


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

    # Keep the fixture visible at pickup. On the lift, frame the gripper a
    # little right of centre, leaving room for the name on narrow screens.
    push = travel(.77, 3.78, t)
    pullback = travel(3.78, 5.90, t)
    closeup = push * (1 - pullback)
    zoom = math.exp(math.log(1.29) + math.log(3.45/1.29)*push + math.log(1.34/3.45)*pullback)
    center = mix(np.array([672., 269.]), part + [-49., -21.], closeup)
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
    def cable(start, bend1, bend2, end):
        u = np.linspace(0, 1, 42)[:, None]
        points = (1-u)**3*start + 3*(1-u)**2*u*bend1 + 3*(1-u)*u**2*bend2 + u**3*end
        line(points, 178, 5.0)
        line(points, 72, 1.7)

    # The top faces of the V are tangent to the 64-unit OD. The visible
    # air gap between the lifted part and this fixed seat shows load transfer.
    seat_x, seat_y = PART_SEAT
    v_bottom = seat_y + PART_RADIUS * math.sqrt(2)
    seat = np.array([seat_x, v_bottom])
    polygon(seat + [(-37,-28),(-28,-28),(0,0),(28,-28),(37,-28),(37,7),(-37,7)], 162)
    line(seat + [(-28,-28),(0,0),(28,-28)], 230, 2.4)
    line(seat + [(-50,9),(50,9)], 192, 4)
    for x in (-31,31): circle(seat + [x,1], 2.4, 68)

    polygon([(447,425),(457,410),(475,405),(482,368),(518,368),(527,405),(547,410),(555,425)],181)
    line([(448,426),(555,426)],230,4)
    for x in [464,538]: circle([x,415],3.1,69)
    cable(shoulder+[-17,8], shoulder+[-55,-45], elbow+[-33,41], elbow+[-13,-8])
    cable(elbow+[-13,-8], elbow+[7,-54], wrist+[-67,-39], wrist+[-4,-6])
    casting(shoulder,elbow,31,24);casting(elbow,wrist,25,16)
    joint(shoulder,36);joint(elbow,30);joint(wrist,18)

    def rel(points): return np.asarray(points) + wrist
    polygon(rel([(-12,11),(12,11),(12,25),(-12,25)]),170)
    line(rel([(-16,21),(16,21)]), 230, 3)
    polygon(rel([(-66,24),(66,24),(71,30),(71,45),(64,51),(-64,51),(-71,45),(-71,30)]),223)
    polygon(rel([(-63,30),(63,30),(63,43),(-63,43)]),83)
    line(rel([(-61,34),(61,34)]), 175, 2)

    for side in (-1, 1):
        def on_jaw(points):
            return rel([(side*(gap+x), y) for x,y in points])
        # Rail carriages and serrated pads travel together. The paler face
        # and dark edge keep both jaws legible through the halftone exposure.
        polygon(on_jaw([(-8,37),(11,37),(13,41),(13,53),(-8,53)]), 190)
        polygon(on_jaw([(3,50),(13,50),(13,87),(8,95),(0,95),(0,79),(4,76)]), 226)
        polygon(on_jaw([(0,80),(4,77),(5,91),(0,94)]), 157)
        line(on_jaw([(9,55),(9,84)]), 98, 2)
        for height in (82,86,90):
            line(on_jaw([(0,height),(3,height-1)]), 70, 1.2)
        circle(on_jaw([(2,44)])[0], 2.6, 61)
    # Machined bushing: through bore, two concentric shoulders and six drilled holes.
    for rad,val in [(32,233),(30,110),(27.7,201),(20.5,167),(17.2,237),(14.8,93),(12.8,0)]:
        circle(part,rad,val)
    for i in range(6):
        ang=(i+.5)*math.tau/6
        p=part+23.5*np.array([math.cos(ang),math.sin(ang)])
        circle(p,3.1,61);circle(p,2.0,0)
    return np.asarray(img).astype('f')/255, screen(part), PART_RADIUS*zoom

PAPER=np.array([237,234,226],dtype='f')
INK=np.array([66,67,53],dtype='f')
SAGE=np.array([176,187,158],dtype='f')
PALE=np.array([239,239,225],dtype='f')
GREEN=np.array([151,166,133],dtype='f')
def frame(t):
    plate, center, radius = arm_plate(t)
    # The impression starts after pickup so contact and the emerging gap read on paper first.
    # During the return to a wider view the screen itself stays fixed to the page.
    if t < 2.52: impression=0.
    elif t >= 3.90: impression=1.
    else:
        distance=np.hypot(XX-center[0], YY-center[1])-radius
        front=mix(-150,1500,ramp(2.52,3.90,t))
        impression=ramp(-95,95,front-distance+(V-.5)*28)
    dots=ramp(4.12,5.65,t-.18*(U-.5))
    coverage=ramp(.0,1.,plate)
    # Positive-print passages are made from the same alphabet as the ground.
    ink=plate*(.24+.76*glyph)
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
         '-preset','slow','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'grasp-study.mp4')]
    with subprocess.Popen(cmd,stdin=subprocess.PIPE) as encoder:
        for i in range(FPS*SECONDS): encoder.stdin.write(frame(i/FPS).tobytes())
        encoder.stdin.close()
        if encoder.wait(): raise RuntimeError('Encoding failed')
