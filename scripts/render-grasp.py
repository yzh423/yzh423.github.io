"""Render an original ink study of a robot picking up a machined bushing.
Run: python scripts/render-grasp.py (NumPy, Pillow, imageio-ffmpeg).
This is artwork, not a measurement or experiment recording.
"""
from pathlib import Path
import json
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


def projection(t):
    _, part, _ = pose(t)
    push = travel(.77, 3.78, t)
    pullback = travel(3.78, 5.90, t)
    zoom = math.exp(math.log(1.29) + math.log(3.45/1.29)*push + math.log(1.59/3.45)*pullback)
    center = mix(np.array([563., 270.]), part + [-98., -20.], push * (1 - pullback))
    return center, zoom


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
    center, zoom = projection(t)
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

PAPER = np.array([255, 255, 255])
GRAPHITE = np.array([70, 82, 76])
COPPER = np.array([179, 83, 48])
random = np.random.default_rng(1942)
stock = Image.fromarray(random.normal(128, 28, (90, 240)).astype('uint8')).resize((W,H), Image.Resampling.BILINEAR)
paper_grain = (np.asarray(stock).astype('f')-128)*.035 + random.normal(0,.52,(H,W)).astype('f')


def hatch_lines(coordinate, spacing, width):
    distance = np.abs((coordinate/spacing + .5) % 1 - .5)*spacing
    return np.clip(width - distance, 0, 1)


hatch = hatch_lines(XX*.36 + YY*.93, 6.7, 1.05)
crosshatch = hatch_lines(XX*.88 - YY*.48, 9.2, .95)
dots = 1 - ramp(.18, .30, dist)


def optical_field(t, center, radius):
    """Project a wireframe workspace behind the tool and register the pickup to it."""
    plate = Image.new('RGB', (W, H), 'white')
    pen = ImageDraw.Draw(plate, 'RGBA')
    blue, teal, iris = (49,94,215), (0,155,174), (127,79,205)
    u = np.linspace(0, 1, 144)
    # A family of ruled trajectories. The space between rails twists around a
    # common path, with moving knots revealing the direction of travel.
    def rail(s, v):
        phase = 5.8*s - .20*t
        x = -100 + 1650*s
        y = 352 - 159*np.sin(s*math.pi*.97) + 69*np.sin(2*math.pi*s+.36)
        envelope = 18 + 58*np.sin(math.pi*s)**2
        return x, y + envelope*v*np.cos(phase) + 25*v*v*np.sin(phase)
    for i in range(21):
        s = .18+i*.036
        v = .38*math.sin(i*.71)
        facet = [rail(s,v),rail(s+.035,v-.5),rail(s+.035,v+.48)]
        pen.polygon(facet,fill=(*(teal if i<12 else iris), 17+i%3*5))
    for k in range(15):
        v = (k-7)/7
        x, y = rail(u, v)
        hue = teal if k < 6 else blue if k < 11 else iris
        primary = k in (0,7,14)
        pen.line(list(zip(x,y)),fill=(*hue, 156 if primary else 68),width=3 if primary else 1)
        if k in (0,5,10,14):
            pos = (.18*k + t*.045) % 1
            px,py = rail(pos,v)
            pen.ellipse((px-2,py-2,px+2,py+2),fill=(*hue,190))
    for s in np.linspace(.08,.98,74):
        line = [rail(s,v) for v in np.linspace(-1,1,14)]
        pen.line(line,fill=(*blue,24),width=1)
    # Split arcs, calibration ticks and an acquisition pulse follow the real
    # bushing centre. They remain outside the machined surface.
    cx,cy = center
    r = radius*(1.90 - .31*travel(1.36,1.93,t))
    for factor,hue,arcs in [(1,teal,[(-148,-42),(-23,24),(65,140)]),
                            (1.10,iris,[(-86,-33),(39,100),(144,171)])]:
        rr=r*factor
        for start,end in arcs:
            a = start + 4*t
            pen.arc((cx-rr,cy-rr,cx+rr,cy+rr),a,a+end-start,fill=(*hue,157),width=2)
    for n in range(36):
        a = math.radians(n*10 + 4*t)
        if abs(math.sin(a))>.97: continue
        scale = 1.20 if n%3==0 else 1.16
        dx,dy = r*math.cos(a),r*math.sin(a)
        pen.line((cx+1.12*dx,cy+1.12*dy,cx+scale*dx,cy+scale*dy),fill=(*blue,126),width=1)
    pulse = (t-1.93)/.88
    if 0 < pulse < 1:
        rr = r*(1.02+.56*pulse)
        pen.arc((cx-rr,cy-rr,cx+rr,cy+rr),-171,158,fill=(*teal,int(112*(1-pulse))),width=2)
    return np.asarray(plate)


def frame(t):
    metal, center, radius = arm_plate(t)
    dx, dy = XX-center[0], YY-center[1]
    distance = np.hypot(dx, dy)
    # Keep the silhouette and the relief of the metal visible at every exposure.
    vertical = np.abs(metal - np.roll(metal, 1, axis=0))
    horizontal = np.abs(metal - np.roll(metal, 1, axis=1))
    vertical[0,:] = 0
    horizontal[:,0] = 0
    edges = np.clip(2.5*np.maximum(vertical, horizontal), 0, 1)
    cut = metal*(.14 + .77*hatch + .34*crosshatch*metal)
    printed = metal*(.10 + .52*glyph + .30*dots)
    transition = ramp(2.25, 3.74, t)
    impression = (1-ramp(.2*radius, 3.8*radius, distance))*transition

    # Leave the outline of the bushing at its original seat during the lift.
    _, position, _ = pose(t)
    seat = center + (PART_SEAT-position)*(radius/PART_RADIUS)
    seat_dx, seat_dy = XX-seat[0], YY-seat[1]
    rim = 1-ramp(.4, 1.65, np.abs(np.hypot(seat_dx,seat_dy)-radius))
    broken_line = .32+.68*(np.cos(np.arctan2(seat_dy,seat_dx)*64)>0)
    original_rim = rim*broken_line*ramp(2.4,3.25,t)
    ink = np.clip(mix(cut,printed,impression)+.62*edges+.22*original_rim,0,.85)

    # As the name lifts away, the cut marks around the jaws give up their ink.
    # The outline remains legible and regains its weight when the camera pulls back.
    transfer = travel(2.00, 3.64, t) * (1-travel(4.22, 5.65, t))
    ink *= 1 - .62 * transfer * (1-ramp(radius*.8, radius*2.8, distance))

    # Print two arcs around the physical contacts, after the jaws close.
    angle = np.arcsin(np.abs(np.sin(np.arctan2(dy, dx))))
    edge_arc = (1-ramp(.035,.087,np.abs(distance/radius-.975))) * (1-ramp(.16+.38*transition,.23+.38*transition,angle))
    soft_edge = np.exp(-((distance/radius-1)/.20)**2)*(1-ramp(.25,.51,angle))
    accent = ramp(1.93,2.19,t)*(.86*edge_arc+.15*soft_edge)
    backdrop = optical_field(t, center, radius)
    background_weight = 1 - np.clip(metal*4, 0, 1)
    image = np.empty((H,W,3), dtype='uint8')
    for channel in range(3):
        paper = PAPER[channel] + (backdrop[:,:,channel].astype('f')-255)*background_weight
        layer = paper + paper_grain + (GRAPHITE[channel]-paper)*ink
        image[:,:,channel] = np.clip(mix(layer, COPPER[channel], accent), 0, 255)
    return Image.fromarray(image)

def write_ink_map():
    # Origins are actual engraved pixels, in units of the bushing radius.
    contact = 1.93
    _, center, radius = arm_plate(contact)
    ink = np.asarray(frame(contact))[:,:,1]
    local_x, local_y = (XX-center[0])/radius, (YY-center[1])/radius
    jaws = (np.abs(local_x)<1.4) & (local_y> -1.89) & (local_y<1.04)
    ys, xs = np.nonzero(jaws & (ink<185))
    sample = np.random.default_rng(423).choice(len(xs), 384, replace=False)
    origins = np.column_stack([local_x[ys[sample],xs[sample]],local_y[ys[sample],xs[sample]]])
    rate = 12
    poses = []
    for i in range(SECONDS*rate+1):
        t = i/rate
        _, part, _ = pose(t)
        view, zoom = projection(t)
        x,y = (part-view)*zoom + [W/2,H/2]
        poses.append([round(x,2),round(y,2),round(PART_RADIUS*zoom,2)])
    data = dict(contact=contact, fps=rate, poses=poses, marks=np.round(origins*1000).astype(int).tolist())
    (OUT/'grasp-ink.json').write_text(json.dumps(data,separators=(',',':'))+'\n',encoding='utf-8')


if __name__=='__main__':
    OUT.mkdir(exist_ok=True)
    write_ink_map()
    frame(5.99).save(OUT/'grasp-study.webp','WEBP',quality=92,method=6)
    frame(0).save(OUT/'grasp-study-opening.webp','WEBP',quality=90,method=6)
    cmd=[imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-loglevel','error','-y','-f','rawvideo',
         '-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264',
         '-preset','slow','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'grasp-study.mp4')]
    with subprocess.Popen(cmd,stdin=subprocess.PIPE) as encoder:
        for i in range(FPS*SECONDS): encoder.stdin.write(frame(i/FPS).tobytes())
        encoder.stdin.close()
        if encoder.wait(): raise RuntimeError('Encoding failed')
