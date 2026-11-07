"""Legacy 2D engraving renderer; the current homepage uses render-arm-3d.mjs.
Render an original ink study of a robot picking up a machined bushing.
Run: python scripts/render-grasp.py (NumPy, Pillow, imageio-ffmpeg).
This is artwork, not a measurement or experiment recording.
"""
from pathlib import Path
import json
import math
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import imageio_ffmpeg

OUT = Path(__file__).resolve().parents[1] / 'assets' / 'motion'
W, H, FPS, SECONDS = 1440, 640, 60, 10
CONTACT, ASSEMBLED, RELEASE, SETTLED = .70, 7.30, 7.48, 9.92
PICKUP_START, PICKUP_END = .85, 1.45
MOVEMENT_END, LIFT_END = 9.84, 9.58
EXPLOSION_START, EXPLOSION_PEAK = 1.70, 3.30
ASSEMBLY_STAGES = {
    'base': (3.55, 4.25),
    'shoulder': (4.05, 4.75),
    'upper_arm': (4.55, 5.25),
    'elbow': (5.05, 5.75),
    'forearm': (5.55, 6.25),
    'wrist': (6.05, 6.75),
    'gripper': (6.55, 7.25),
}
XX, YY = np.meshgrid(np.arange(W, dtype='f')+.5, np.arange(H, dtype='f')+.5)
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

def travel(start, end, time):
    # Quintic motion gives zero velocity and acceleration at both stops.
    fraction = float(np.clip((time - start) / (end - start), 0, 1))
    return fraction**3 * (10 + fraction * (-15 + 6*fraction))


def cruise(start, end, time):
    """Constant middle speed, with short C2-continuous endpoint ramps."""
    n=float(np.clip((time-start)/(end-start),0,1))
    edge=.12
    def entering(x):
        q=x/edge
        return edge*(q**3-.5*q**4)/(1-edge)
    if n<edge:return entering(n)
    if n>1-edge:return 1-entering(1-n)
    return (n-edge*.5)/(1-edge)


PART_RADIUS = 32.
PART_SEAT = np.array([843., 337.])


def pose(t):
    approach = min(1.93, t*1.93/CONTACT)
    align = travel(0, .93, approach)
    descend = travel(.24, 1.35, approach)
    close = travel(1.36, 1.93, approach)
    # Clear the fixture with the complete gripper before any part separates.
    pickup = cruise(PICKUP_START,PICKUP_END,t)
    # After reassembly, continue the lift as the engraving becomes the name.
    lift = cruise(ASSEMBLED,LIFT_END,t)
    carry = cruise(RELEASE,MOVEMENT_END,t)

    # A level approach ends directly above the V-block. Both fingers reach
    # the OD before the first lifting frame. Only then does the load follow.
    offset = np.array([-76 * carry, -45 * pickup -65 * lift])
    wrist = np.array([mix(734, PART_SEAT[0], align), mix(149, 250, descend)]) + offset
    return wrist, PART_SEAT + offset, mix(57, PART_RADIUS, close)


def return_window(stage, lag=0, name=None):
    start,end = ASSEMBLY_STAGES.get(stage,(3.55,7.25))
    if stage == 'base':
        if name == 'base plate': end = start+.38
        elif name == 'pedestal': start += .25
        else: start,end = start+.18,end-.08
    else: start += min(.05,lag*.25)
    return start,end


def explosion(t, lag=0, stage=None, name=None):
    start,end = return_window(stage,lag,name)
    return cruise(EXPLOSION_START+lag, EXPLOSION_PEAK+lag, t)*(1-cruise(start, end, t))


def projection(t):
    settle = cruise(6.55, 7.40, t)
    # Pull back ahead of the separation, hold a readable exploded drawing,
    # then quietly reframe the complete arm for its signature.
    wide = cruise(1.50, 3.05, t)*(1-cruise(6.55, 7.35, t))
    zoom = mix(mix(1.29, 1.80, settle), .76, wide)
    close_center = mix(np.array([563., 270.]), np.array([590., 270.]),settle)
    center = mix(close_center, np.array([600., 265.]), wide)
    return center, zoom


def arm_plate(t, audit=None):
    wrist, part, gap = pose(t)
    shoulder = np.array([500.,366.])
    reach = wrist-shoulder
    length = np.linalg.norm(reach)
    u = reach/length
    normal = np.array([-u[1],u[0]])
    a,b=203.,248.
    distance = (length**2+a*a-b*b)/(2*length)
    elbow = shoulder + distance*u - math.sqrt(max(0,a*a-distance*distance))*normal
    center, zoom = projection(t)
    # Supersample rigid geometry so subpixel camera and joint motion do not
    # make one-pixel outlines chatter between frames.
    supersample=2
    img = Image.new('L',(W*supersample,H*supersample))
    pen = ImageDraw.Draw(img)
    pivot, displacement, rotation = np.zeros(2), np.zeros(2), np.eye(2)
    piece_scale,tone = 1.,1.

    def component(name, origin, offset=(0,0), degrees=0, lag=0, stage=None):
        nonlocal pivot, displacement, rotation, piece_scale,tone
        amount = explosion(t, lag, stage, name) if stage else 0.
        pivot = np.asarray(origin)
        # Each rigid part follows a shallow arc and lands with zero velocity
        # and acceleration. Lag gives the assembly a slight mechanical order.
        offset = np.asarray(offset,dtype=float)*[1.55,1.25]
        depth = -.75 if 'cable' in name else .7 if any(word in name for word in ['cover','cap','finger','pad']) else -.15
        offset += np.array([16,-12])*depth
        curve = np.array([-offset[1],offset[0]])*.075*math.sin(math.pi*amount)
        displacement = amount*offset + curve
        angle = math.radians(degrees)*amount*1.18
        piece_scale = 1+depth*.12*amount
        tone = 1+depth*.18*amount
        rotation = np.array([[math.cos(angle),-math.sin(angle)],[math.sin(angle),math.cos(angle)]])
        if audit is not None:
            trail=[]
            for back in [0.18,.12,.06,0]:
                previous=explosion(max(0,t-back),lag,stage,name) if stage else 0.
                shift=previous*offset+np.array([-offset[1],offset[0]])*.075*math.sin(math.pi*previous)
                trail.append(((pivot+shift-center)*zoom+[W/2,H/2]).tolist())
            audit.append(dict(name=name,stage=stage,amount=amount,offset=displacement.tolist(),
                angle=angle,depth=depth,trail=trail,completed=return_window(stage,lag,name)[1] if stage else 0))

    def screen(p):
        transformed = ((np.asarray(p)-pivot)@rotation.T)*piece_scale + pivot + displacement
        return (transformed-center)*zoom + [W/2,H/2]
    def pts(points): return [tuple(p) for p in screen(points)*supersample]
    def pigment(value): return round(min(255,value*tone))
    def polygon(points,value): pen.polygon(pts(points),fill=pigment(value))
    def line(points,value,width): pen.line(pts(points),fill=pigment(value),width=max(1,round(width*zoom*piece_scale*supersample)),joint='curve')
    def circle(p,r,value):
        pt=screen(p)*supersample;rr=r*zoom*piece_scale*supersample
        pen.ellipse([tuple(pt-rr),tuple(pt+rr)],fill=pigment(value))
    def bar(p,q,r1,r2,value):
        delta=q-p; perpendicular=np.array([-delta[1],delta[0]])/np.linalg.norm(delta)
        polygon([p+r1*perpendicular,q+r2*perpendicular,q-r2*perpendicular,p-r1*perpendicular],value)
        circle(p,r1,value);circle(q,r2,value)
    def cable(start,bend1,bend2,end):
        samples=np.linspace(0,1,42)[:,None]
        points=(1-samples)**3*start+3*(1-samples)**2*samples*bend1+3*(1-samples)*samples**2*bend2+samples**3*end
        line(points,178,5);line(points,72,1.7)
    def joint(name,p,r,offset,lag):
        component(name+' housing',p,offset,-9,lag,stage=name)
        circle(p,r,230);circle(p,r*.88,142);circle(p,r*.71,65)
        component(name+' bearing',p,np.asarray(offset)+[-34,-27],8,lag+.025,stage=name)
        circle(p,r*.68,226);circle(p,r*.54,96)
        circle(p,r*.42,194);circle(p,r*.30,0)
        component(name+' shaft cap',p,np.asarray(offset)+[-70,-48],-12,lag+.05,stage=name)
        circle(p,r*.42,221);circle(p,r*.29,147);circle(p,r*.16,55)
        for i in range(6):
            angle=i*math.tau/6
            radial=np.array([math.cos(angle),math.sin(angle)])
            bolt=p+.79*r*radial
            component(name+' fastener '+str(i+1),bolt,np.asarray(offset)+[-70,-48]+radial*22,0,lag+.065+i*.006,stage=name)
            circle(bolt,2.5,208);line([bolt-radial*1.3,bolt+radial*1.3],60,1)
    def casting(name,p,q,r1,r2,offset,degrees,lag):
        mid=(p+q)/2
        component(name+' housing',mid,offset,degrees,lag,stage=name.replace(' ','_'))
        bar(p,q,r1,r2,215);bar(p+(q-p)*.05,q-(q-p)*.05,r1*.80,r2*.77,135)
        component(name+' cover',mid,np.asarray(offset)+[-18,-48],degrees+5,lag+.06,stage=name.replace(' ','_'))
        bar(p+(q-p)*.16,q-(q-p)*.17,r1*.41,r2*.39,74)
        line([p+(q-p)*.17,q-(q-p)*.18],185,2)

    # The workpiece and fixture stay outside the exploded robot assembly.
    component('fixture',PART_SEAT)
    seat_x,seat_y=PART_SEAT
    seat=np.array([seat_x,seat_y+PART_RADIUS*math.sqrt(2)])
    polygon(seat+[(-37,-28),(-28,-28),(0,0),(28,-28),(37,-28),(37,7),(-37,7)],162)
    line(seat+[(-28,-28),(0,0),(28,-28)],230,2.4)
    line(seat+[(-50,9),(50,9)],192,4)
    for x in (-31,31):circle(seat+[x,1],2.4,68)

    component('pedestal',shoulder,(-85,36),-4,.03,stage='base')
    polygon([(475,405),(482,368),(518,368),(527,405)],181)
    component('base plate',[500,416],(-112,70),-4,.07,stage='base')
    polygon([(447,425),(457,410),(475,405),(527,405),(547,410),(555,425)],181)
    line([(448,426),(555,426)],230,4)
    for x in [464,538]:
        component('base fastener '+str(x),[x,415],(-130+(x-500)*.35,100),0,.12,stage='base')
        circle([x,415],3.1,69)
    component('shoulder cable',(shoulder+elbow)/2,(-185,5),-16,.02,stage='upper_arm')
    cable(shoulder+[-17,8],shoulder+[-55,-45],elbow+[-33,41],elbow+[-13,-8])
    component('wrist cable',(elbow+wrist)/2,(20,-82),9,.07,stage='forearm')
    cable(elbow+[-13,-8],elbow+[7,-54],wrist+[-67,-39],wrist+[-4,-6])
    casting('upper arm',shoulder,elbow,31,24,(-90,-28),-8,.07)
    casting('forearm',elbow,wrist,25,16,(75,-55),8,.12)
    joint('shoulder',shoulder,36,(-115,-29),.08)
    joint('elbow',elbow,30,(-15,-80),.13)
    joint('wrist',wrist,18,(176,-47),.09)

    def rel(points): return np.asarray(points)+wrist
    component('wrist coupling',wrist+[0,18],(140,7),4,.06,stage='wrist')
    polygon(rel([(-12,11),(12,11),(12,25),(-12,25)]),170)
    line(rel([(-16,21),(16,21)]),230,3)
    component('gripper housing',wrist+[0,38],(173,49),6,.03,stage='gripper')
    polygon(rel([(-66,24),(66,24),(71,30),(71,45),(64,51),(-64,51),(-71,45),(-71,30)]),223)
    polygon(rel([(-63,30),(63,30),(63,43),(-63,43)]),83)
    component('guide rail',wrist+[0,35],(210,97),7,.02,stage='gripper')
    line(rel([(-61,34),(61,34)]),175,2)
    for side in (-1,1):
        def jaw(points):return rel([(side*(gap+x),y) for x,y in points])
        anchor=jaw([(4,67)])[0]
        shift=np.array([-37,139]) if side<0 else np.array([160,166])
        name='left' if side<0 else 'right'
        component(name+' carriage',anchor,shift+[0,-33],side*6,0,stage='gripper')
        polygon(jaw([(-8,37),(11,37),(13,41),(13,53),(-8,53)]),190)
        circle(jaw([(2,44)])[0],2.6,61)
        component(name+' finger',anchor,shift,side*11,.02,stage='gripper')
        polygon(jaw([(3,50),(13,50),(13,87),(8,95),(0,95),(0,79),(4,76)]),226)
        line(jaw([(9,55),(9,84)]),98,2)
        component(name+' gripping pad',anchor,shift+[side*23,31],side*11,.04,stage='gripper')
        polygon(jaw([(0,80),(4,77),(5,91),(0,94)]),157)
        for height in (82,86,90):line(jaw([(0,height),(3,height-1)]),70,1.2)

    component('workpiece',part)
    for rad,val in [(32,233),(30,110),(27.7,201),(20.5,167),(17.2,237),(14.8,93),(12.8,0)]:
        circle(part,rad,val)
    for i in range(6):
        angle=(i+.5)*math.tau/6
        p=part+23.5*np.array([math.cos(angle),math.sin(angle)])
        circle(p,3.1,61);circle(p,2,0)
    img=img.resize((W,H),Image.Resampling.LANCZOS)
    return np.asarray(img).astype('f')/255,screen(part),PART_RADIUS*zoom

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


def assembly_effects(t, records, backdrop):
    """Keep depth as a soft impression, without detached trails or rings."""
    shadows=Image.new('RGBA',(W,H))
    shadow_pen=ImageDraw.Draw(shadows)
    colours=[(0,137,149),(66,110,171),(173,91,55)]
    for index,record in enumerate(records):
        name=record['name']
        major=any(word in name for word in ['housing','cover','plate','pedestal','finger','coupling'])
        if not major or not record['stage']:
            continue
        points=[tuple(p) for p in record['trail']]
        x,y=points[-1]
        opening=record['amount']
        hue=colours[list(ASSEMBLY_STAGES).index(record['stage'])%len(colours)]
        radius=13+9*max(0,record['depth'])
        shadow_pen.ellipse((x-radius+8,y-radius*.45+15,x+radius+8,y+radius*.45+15),
            fill=(*hue,round(opening*(21+14*max(0,record['depth'])))))
    image=Image.fromarray(backdrop).convert('RGBA')
    image=Image.alpha_composite(image,shadows.filter(ImageFilter.GaussianBlur(8)))
    return np.asarray(image.convert('RGB'))


def frame(t):
    records=[]
    metal, center, radius = arm_plate(t,records)
    opened = explosion(t,.10)
    dx,dy = XX-center[0],YY-center[1]
    distance = np.hypot(dx,dy)
    vertical=np.abs(metal-np.roll(metal,1,axis=0))
    horizontal=np.abs(metal-np.roll(metal,1,axis=1))
    vertical[0,:]=0;horizontal[:,0]=0
    edges=np.clip(2.5*np.maximum(vertical,horizontal),0,1)
    cut=metal*(.14+.77*hatch+.34*crosshatch*metal)
    ink=np.clip(cut+.62*edges,0,.88)
    # The drawing stays an engraving throughout the exploded view. The paper
    # and restrained ink tint change with its opening and reassembly.
    background_weight=1-np.clip(metal*4,0,1)
    scenery=np.full((H,W,3),255,dtype='uint8')
    handoff=travel(RELEASE,SETTLED-.25,t)
    backdrop=assembly_effects(t,records,scenery)
    warmth=travel(.30,.84,t)*(1-travel(1.05,1.66,t))
    type_field=opened*glyph*.045
    # Ink leaves the jaws first, then drains through the complete drawing.
    # The same media clock drives the strands which carry it into the name.
    front=radius+handoff*930
    retreat=travel(RELEASE,RELEASE+1.05,t)*(1-ramp(front-110,front+110,distance))
    ink*=1-.46*retreat
    light=np.exp(-((distance-front)/68)**2)*math.sin(math.pi*handoff)*.42
    light_colour=mix(np.array([0,137,149]),np.array([184,96,57]),handoff)
    angle=np.arcsin(np.abs(np.sin(np.arctan2(dy,dx))))
    edge_arc=(1-ramp(.035,.087,np.abs(distance/radius-.975)))*(1-ramp(.30,.44,angle))
    accent=travel(CONTACT,CONTACT+.24,t)*(1-explosion(t,.02))*.86*edge_arc*(1-.68*retreat)
    image=np.empty((H,W,3),dtype='uint8')
    for channel in range(3):
        paper=PAPER[channel]+(backdrop[:,:,channel].astype('f')-255)*background_weight
        paper=mix(paper,(224,190,140)[channel],warmth*.15)
        paper=mix(paper,(80,128,118)[channel],type_field)
        engraving=mix(GRAPHITE[channel],(36,98,100)[channel],opened*.35)
        engraving=mix(engraving,light_colour[channel],light)
        layer=paper+paper_grain+(engraving-paper)*ink
        image[:,:,channel]=np.clip(mix(layer,COPPER[channel],accent),0,255)
    return Image.fromarray(image)

def write_ink_map():
    # Origins are actual engraved pixels, in units of the bushing radius.
    _, center, radius = arm_plate(RELEASE)
    ink = np.asarray(frame(RELEASE))[:,:,1]
    local_x, local_y = (XX-center[0])/radius, (YY-center[1])/radius
    jaws = (np.abs(local_x)<1.4) & (local_y> -1.89) & (local_y<1.04)
    ys, xs = np.nonzero(jaws & (ink<185))
    sample = np.random.default_rng(423).choice(len(xs), 384, replace=False)
    origins = np.column_stack([local_x[ys[sample],xs[sample]],local_y[ys[sample],xs[sample]]])
    origins = origins[np.argsort(origins[:,1])]
    rate = FPS
    poses = []
    for i in range(SECONDS*rate+1):
        t = i/rate
        _, part, _ = pose(t)
        view, zoom = projection(t)
        x,y = (part-view)*zoom + [W/2,H/2]
        poses.append([round(x,2),round(y,2),round(PART_RADIUS*zoom,2)])
    data = dict(width=W, height=H, contact=CONTACT, pickup_start=PICKUP_START, pickup_end=PICKUP_END, assembled=ASSEMBLED, release=RELEASE, settled=SETTLED, movement_end=MOVEMENT_END, explosion_start=EXPLOSION_START, explosion_peak=EXPLOSION_PEAK, assembly_start=ASSEMBLY_STAGES['base'][0], assembly_stages=ASSEMBLY_STAGES, live_currents=True, flow='engraved', motion_profile='cruise', name_duration=1.70, fps=rate, poses=poses, marks=np.round(origins*1000).astype(int).tolist())
    (OUT/'grasp-ink.json').write_text(json.dumps(data,separators=(',',':'))+'\n',encoding='utf-8')


if __name__=='__main__':
    OUT.mkdir(exist_ok=True)
    write_ink_map()
    frame(SECONDS-1/FPS).save(OUT/'grasp-study.webp','WEBP',quality=92,method=6)
    frame(0).save(OUT/'grasp-study-opening.webp','WEBP',quality=90,method=6)
    cmd=[imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-loglevel','error','-y','-f','rawvideo',
         '-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264',
         '-preset','slow','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'grasp-study.mp4')]
    with subprocess.Popen(cmd,stdin=subprocess.PIPE) as encoder:
        for i in range(FPS*SECONDS): encoder.stdin.write(frame(i/FPS).tobytes())
        encoder.stdin.close()
        if encoder.wait(): raise RuntimeError('Encoding failed')
