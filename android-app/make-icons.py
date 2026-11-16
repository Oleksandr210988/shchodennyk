# Draws the Android launcher icons and splash screens from the same design as the web icon.
from PIL import Image, ImageDraw
import os, glob
RES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "android/app/src/main/res")
S = 2048; G = (47, 111, 79); B = (31, 95, 191); W = (255, 255, 255); L = (230, 242, 235)
def background():
    im = Image.new("RGBA", (S, S), G + (255,)); ImageDraw.Draw(im).polygon([(S, 0), (S, S), (0, S)], fill=B + (255,)); return im
def glyphs(scale=1.0):
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    cx, cy, r = 700, 700, 400
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=W, width=70)
    d.ellipse([cx - r + 150, cy - r + 150, cx + r - 150, cy + r - 150], fill=L)
    lay = Image.new("RGBA", (S, S), (0, 0, 0, 0)); e = ImageDraw.Draw(lay); y = S // 2; c = S // 2
    e.rounded_rectangle([c - 330, y - 40, c + 330, y + 40], 20, fill=W)
    for sx in (-1, 1):
        e.rounded_rectangle([c + sx * 300 - 60, y - 230, c + sx * 300 + 60, y + 230], 50, fill=W)
        e.rounded_rectangle([c + sx * 440 - 45, y - 150, c + sx * 440 + 45, y + 150], 40, fill=W)
    lay = lay.rotate(45, resample=Image.BICUBIC).resize((S * 80 // 100,) * 2, Image.LANCZOS)
    im.alpha_composite(lay, (S - lay.width + 20, S - lay.height + 20))
    if scale != 1.0:
        small = im.resize((int(S * scale),) * 2, Image.LANCZOS); im = Image.new("RGBA", (S, S), (0, 0, 0, 0)); o = (S - small.width) // 2; im.alpha_composite(small, (o, o))
    return im
full = background(); full.alpha_composite(glyphs())
fg = glyphs(0.62)
bgimg = background()
dens = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
for name, k in dens.items():
    d = f"{RES}/mipmap-{name}"
    full.resize((int(48 * k),) * 2, Image.LANCZOS).save(f"{d}/ic_launcher.png")
    m = Image.new("L", (S, S), 0); ImageDraw.Draw(m).ellipse([0, 0, S, S], fill=255)
    rnd = full.copy(); rnd.putalpha(m); rnd.resize((int(48 * k),) * 2, Image.LANCZOS).save(f"{d}/ic_launcher_round.png")
    fg.resize((int(108 * k),) * 2, Image.LANCZOS).save(f"{d}/ic_launcher_foreground.png")
    bgimg.resize((int(108 * k),) * 2, Image.LANCZOS).save(f"{d}/ic_launcher_background.png")
for f in glob.glob(f"{RES}/drawable*/splash.png"):
    w, h = Image.open(f).size
    sp = Image.new("RGB", (w, h), (243, 245, 242)); ic = full.resize((min(w, h) // 3,) * 2, Image.LANCZOS)
    m = Image.new("L", (S, S), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, S, S], S // 5, fill=255); m = m.resize(ic.size, Image.LANCZOS)
    sp.paste(ic, ((w - ic.width) // 2, (h - ic.height) // 2), m); sp.save(f)
print("icons ready")
