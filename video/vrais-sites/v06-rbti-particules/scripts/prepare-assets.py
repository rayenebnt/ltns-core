"""Prépare les assets de la vidéo 06 à partir des captures brutes (capture-all.sh).

python3 -I prepare-assets.py <dossier brut> <dossier assets> [morceaux…]

- Particules (morph, macro) : canvas RGBA du site posé sur noir (rendu additif, comme sur la carte),
  léger halo (bloom) pour que les points fins se lisent, encodé en VP9 (Chromium de Playwright ne lit pas le H.264).
- Logo 3D (mark) et couloir (gates) : posés sur noir, VP9.
- Carte de contact mobile : téléphone, e-mail, « Disponible 7j/7 », « Réponse sous 24h » floutés (illisibles).
- Héros : ville seule (tenue + descente) en VP9, titre H1 seul en WebP transparent (apparition réelle du site).
- Ordinateur (rail de la méthode, champ de cubes) : VP9.
"""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image, ImageFilter

RAW, OUT = sys.argv[1], sys.argv[2]
PARTS = sys.argv[3:] or ["morph", "macro", "mark", "gates", "cta", "hero", "rail", "field"]
os.makedirs(OUT, exist_ok=True)


def frames(d, prefix, ext):
    return sorted(f for f in os.listdir(d) if f.startswith(prefix) and f.endswith(ext))


def fixed_sizes(d, fs):
    """La toute première image peut sortir avant que la scène ait dessiné (vide ou à l'ancienne taille) : on la remplace par la suivante."""
    size = Image.open(os.path.join(d, fs[-1])).size

    def bad(f):
        im = Image.open(os.path.join(d, f))
        return im.size != size or (im.mode == "RGBA" and im.getchannel("A").getbbox() is None)

    out = list(fs)
    for i in range(len(out) - 2, -1, -1):
        if bad(out[i]):
            print(f"  {out[i]} : taille inattendue, remplacée par {out[i + 1]}")
            out[i] = out[i + 1]
    return out


def vp9(src_pattern, out, fps=30, crf=30, size=None, extra=None):
    vf = []
    if size:
        vf.append(f"scale={size[0]}:{size[1]}:flags=lanczos")
    args = ["ffmpeg", "-v", "error", "-y", "-framerate", str(fps), "-i", src_pattern]
    if vf:
        args += ["-vf", ",".join(vf)]
    args += ["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", str(crf), "-row-mt", "1", "-g", "15",
             "-pix_fmt", "yuv420p", "-an"] + (extra or []) + [out]
    subprocess.run(args, check=True)
    print(f"  {os.path.basename(out)} : {os.path.getsize(out) / 1e6:.2f} Mo")


def on_black(img):
    """RGBA du canvas (alpha non prémultiplié) posé sur noir."""
    a = np.asarray(img.convert("RGBA"), dtype=np.float32) / 255.0
    return a[..., :3] * a[..., 3:4]


def bloom(rgb, radius, amount=0.55, gain=1.12):
    """Halo doux : flou gaussien ajouté à l'image (mode « plus »), puis léger gain."""
    img = Image.fromarray(np.clip(rgb * 255, 0, 255).astype(np.uint8))
    glow = np.asarray(img.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32) / 255.0
    out = rgb * gain + glow * amount
    return Image.fromarray(np.clip(out * 255, 0, 255).astype(np.uint8))


def particles(name, radius, size=None, crf=28):
    src = os.path.join(RAW, name)
    fs = fixed_sizes(src, frames(src, "a", ".png"))
    print(f"{name} : {len(fs)} images")
    with tempfile.TemporaryDirectory() as tmp:
        for i, f in enumerate(fs):
            img = bloom(on_black(Image.open(os.path.join(src, f))), radius)
            img.save(os.path.join(tmp, f"{i:05d}.png"), compress_level=1)
        vp9(os.path.join(tmp, "%05d.png"), os.path.join(OUT, f"{name}.webm"), crf=crf, size=size)
    meta = json.load(open(os.path.join(src, "meta.json")))
    meta["frames"] = len(fs)
    json.dump(meta, open(os.path.join(OUT, f"{name}.json"), "w"))


def opaque(name, prefix, ext, size=None, crf=30, out=None):
    src = os.path.join(RAW, name)
    fs = fixed_sizes(src, frames(src, prefix, ext))
    print(f"{name} : {len(fs)} images")
    with tempfile.TemporaryDirectory() as tmp:
        for i, f in enumerate(fs):
            im = Image.open(os.path.join(src, f))
            if im.mode == "RGBA":
                im = Image.fromarray(np.clip(on_black(im) * 255, 0, 255).astype(np.uint8))
            im.convert("RGB").save(os.path.join(tmp, f"{i:05d}.png"), compress_level=1)
        vp9(os.path.join(tmp, "%05d.png"), os.path.join(OUT, out or f"{name}.webm"), crf=crf, size=size)


def blur_box(img, box, dpr, pad=10):
    x, y, w, h = [v * dpr for v in box]
    p = pad * dpr
    b = (int(x - p), int(y - p), int(x + w + p), int(y + h + p))
    b = (max(0, b[0]), max(0, b[1]), min(img.width, b[2]), min(img.height, b[3]))
    if b[2] <= b[0] or b[3] <= b[1]:
        return
    region = img.crop(b)
    # pixellisation puis flou fort : aucun chiffre ni lettre ne reste lisible
    small = region.resize((max(1, region.width // 28), max(1, region.height // 28)), Image.BILINEAR)
    region = small.resize(region.size, Image.BILINEAR).filter(ImageFilter.GaussianBlur(18))
    img.paste(region, b)


if "morph" in PARTS:
    particles("morph", radius=7, size=(1152, 1152))
if "macro" in PARTS:
    particles("macro", radius=14, size=(1080, 1080))
if "mark" in PARTS:
    opaque("mark", "a", ".png", crf=28)
if "gates" in PARTS:
    opaque("gates", "a", ".png", crf=30)

if "cta" in PARTS:
    src = os.path.join(RAW, "cta")
    r = json.load(open(os.path.join(src, "rects.json")))
    img = Image.open(os.path.join(src, "card-bg.png")).convert("RGB")
    dpr = img.width / 390
    for box in r["buttons"][1:] + r["lines"]:   # bouton « téléphone » + les trois lignes de contact
        blur_box(img, box, dpr)
    img.save(os.path.join(OUT, "cta-card.webp"), quality=90)
    json.dump({"dpr": dpr, **r}, open(os.path.join(OUT, "cta.json"), "w"))
    print("cta-card.webp", img.size)

if "hero" in PARTS:
    src = os.path.join(RAW, "hero")
    meta = json.load(open(os.path.join(src, "meta.json")))
    opaque("hero", "city-", ".jpg", crf=31, out="city.webm")
    hs = frames(src, "h1-0", ".png")
    for i, f in enumerate(hs):
        Image.open(os.path.join(src, f)).save(os.path.join(OUT, f"h1-{i:02d}.webp"), quality=92)
    Image.open(os.path.join(src, "h1-final.png")).save(os.path.join(OUT, "h1-final.webp"), quality=92)
    geo = json.load(open(os.path.join(src, "geo.json")))
    clip = json.load(open(os.path.join(src, "h1-clip.json")))
    json.dump({**meta, "h1Frames": len(hs), "geo": geo, "clip": clip}, open(os.path.join(OUT, "hero.json"), "w"))
    print("h1 :", len(hs), "états")

if "rail" in PARTS:
    opaque("rail", "f", ".jpg", size=(1152, 720), crf=31)
    meta = json.load(open(os.path.join(RAW, "rail", "meta.json")))
    json.dump(meta, open(os.path.join(OUT, "rail.json"), "w"))
if "field" in PARTS:
    opaque("field", "f", ".jpg", size=(1152, 720), crf=31)
