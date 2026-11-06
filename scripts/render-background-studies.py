"""Render the three optional cover studies with the production engraving and film clock."""
from pathlib import Path
import importlib.util
import math
import subprocess
import sys

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw

spec = importlib.util.spec_from_file_location("grasp", Path(__file__).with_name("render-grasp.py"))
grasp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(grasp)
OUT = Path(__file__).resolve().parents[1] / "previews" / "background-studies"
tau = math.tau


def white_plate():
    image = Image.new("RGB", (grasp.W, grasp.H), "white")
    return image, ImageDraw.Draw(image, "RGBA")


def contours(t, center, radius):
    image, draw = white_plate()
    a = np.linspace(0, tau, 240)
    for cx, cy, dx, dy, phase, count in [(1144, 234, 390, 165, .3, 23), (90, 550, 260, 130, 2, 14)]:
        for n in range(count):
            r = .13 + n*.066
            phase_t = phase + .19*t
            ring = r * (1 + .19*np.sin(3*a + phase_t + .32*r) + .06*np.cos(5*a - phase + .18*t))
            x = cx + dx*ring*np.cos(a) + 47*r*np.sin(a)
            y = cy + dy*ring*np.sin(a) - 46*r*np.cos(a)
            line = list(zip(x, y))
            major = n % 5 == 1
            if n == 5:
                draw.polygon(line, fill=(94, 203, 171, 21))
            draw.line(line, fill=(12, 132 if major else 152, 127, 151 if major else 72), width=2 if major else 1)
            if n in (6, 16):
                k = int(239*(.58 + .024*t + .06*n) % 239)
                px, py = line[k]
                draw.ellipse((px-3,py-3,px+3,py+3),fill=(6,111,99,225))
    return np.asarray(image)


def eclipse(t, center, radius):
    image, draw = white_plate()
    x, y = 1000 + 17*math.sin(.42*t), 241 - 12*math.cos(.42*t)
    r = 173
    draw.ellipse((x-r,y-r,x+r,y+r),fill=(241,160,109,32))
    # Parallel copper cuts describe the disk; a moving second disk masks them.
    for h in range(-168,169,5):
        span=math.sqrt(r*r-h*h)
        draw.line((x-span,y+h,x+span,y+h),fill=(208,89,52,95),width=1)
    overlap = x+76+27*math.cos(t*.48)
    draw.ellipse((overlap-r,y-r-27,overlap+r,y+r-27),fill=(255,255,255,255))
    a = np.linspace(0,tau,260)
    for i, (rx,ry,tilt) in enumerate([(290,91,-.39),(319,83,-.47),(284,196,.18)]):
        xx, yy = rx*np.cos(a), ry*np.sin(a)
        pts = list(zip(x+xx*math.cos(tilt)-yy*math.sin(tilt), y+xx*math.sin(tilt)+yy*math.cos(tilt)))
        draw.line(pts,fill=(136,76,128,115 if i==0 else 65),width=2 if i==0 else 1)
        k=int((.071*t+.31*i+.1)%1 * 259)
        px,py=pts[k]
        draw.ellipse((px-3,py-3,px+3,py+3),fill=(193,83,68,230))
    return np.asarray(image)


def prism(t, center, radius):
    image, draw = white_plate()
    offset = 11*math.sin(.51*t)
    tip = (994, 78+offset)
    edge = (866, 377+offset)
    end = (1181, 323+offset)
    seam = (1029, 277+offset)
    draw.polygon([tip,edge,seam],fill=(52,133,209,24))
    draw.polygon([tip,seam,end],fill=(113,91,201,36))
    draw.polygon([edge,seam,end],fill=(24,172,178,28))
    for tri in ([tip,edge,end,tip],[tip,seam,edge],[seam,end]):
        draw.line(tri,fill=(64,100,167,150),width=2)
    hit = (918,258+offset)
    draw.line([(-20,383+offset),hit,seam],fill=(23,131,160,134),width=2)
    shades = [(12,156,181),(46,111,214),(108,74,190),(199,67,148),(231,90,70)]
    for i,hue in enumerate(shades):
        start = (seam[0],seam[1]+i*1.4)
        ey = 97+54*i+26*math.sin(.55*t+i*.09)
        draw.polygon([start,(1460,ey-5),(1460,ey+15)],fill=(*hue,36))
        draw.line([start,(1460,ey)],fill=(*hue,161),width=2)
        u=(.19*t+.18*i)%1
        px,py=(start[0]+u*(1460-start[0]),start[1]+u*(ey-start[1]))
        draw.line((px-5,py,px+5,py),fill=(*hue,218),width=3)
    return np.asarray(image)


def render(key, field):
    grasp.optical_field = field
    final = grasp.frame(5.99)
    final.save(OUT/(key+".webp"),quality=91,method=6)
    grasp.frame(0).save(OUT/(key+"-opening.webp"),quality=88,method=6)
    fps = 30
    command = [imageio_ffmpeg.get_ffmpeg_exe(), "-hide_banner", "-loglevel", "error", "-y",
               "-f","rawvideo","-pix_fmt","rgb24","-s","1440x540","-r",str(fps),"-i","-",
               "-an","-c:v","libx264","-threads","2","-preset","fast","-crf","23","-pix_fmt","yuv420p",
               "-movflags","+faststart",str(OUT/(key+".mp4"))]
    with subprocess.Popen(command,stdin=subprocess.PIPE) as encoder:
        for i in range(grasp.SECONDS*fps):
            encoder.stdin.write(grasp.frame(i/fps).tobytes())
        encoder.stdin.close()
        if encoder.wait(): raise RuntimeError("Encoding failed: "+key)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    options = {"contours":contours, "eclipse":eclipse, "prism":prism}
    for name in sys.argv[1:] or options:
        render(name, options[name])
