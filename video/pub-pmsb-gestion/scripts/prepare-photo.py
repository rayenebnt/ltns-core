"""Cadre la photo de l'écran vert en 1080 × 1920 pour le TikTok.

    python3 -I scripts/prepare-photo.py <photo d'origine> [assets/photo.jpg] [--haut 640]

Une photo 9:16 dont l'écran tient dans la largeur est simplement mise à l'échelle (« cover »).
Sinon (photo 3:4, écran trop large…), la photo est réduite pour que l'écran vert tienne dans la
largeur avec une petite marge, le haut de l'écran est placé vers y = --haut (sous la légende), et
les bandes qui manquent sont prolongées en miroir, adoucies et assombries vers le bord.
Ensuite : python3 -I scripts/detect-screen.py
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter, ImageOps

args = sys.argv[1:]
top_target = 640
if '--haut' in args:
    i = args.index('--haut'); top_target = float(args[i + 1]); del args[i:i + 2]
SRC = args[0]
OUT = args[1] if len(args) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'photo.jpg')
W, H = 1080, 1920
MARGE = 0.05  # de chaque côté de l'écran (le tremblé zoome jusqu'à 1,08)

im = ImageOps.exif_transpose(Image.open(SRC)).convert('RGB')
pw, ph = im.size
a = np.asarray(im).astype(np.int32)
g = a[..., 1]
mask = (g > 70) & (g - np.maximum(a[..., 0], a[..., 2]) > np.maximum(35, 0.28 * g))
ys, xs = np.nonzero(mask)
if len(xs) < 0.02 * pw * ph:
    sys.exit('Écran vert introuvable : la photo doit montrer l\'écran rempli de vert (0, 177, 64).')
# boîte de l'écran (en écartant quelques points isolés)
x0, x1 = np.percentile(xs, [0.02, 99.98]); y0, y1 = np.percentile(ys, [0.02, 99.98])
gw = x1 - x0

k_cover = max(W / pw, H / ph)
k_fit = (1 - 2 * MARGE) * W / gw
k = min(k_cover, k_fit)
sw, sh = round(pw * k), round(ph * k)
# horizontal : écran centré ; vertical : haut de l'écran vers top_target, sans laisser de bande si la photo couvre
ox = W / 2 - (x0 + x1) / 2 * k
oy = top_target - y0 * k
if sw >= W: ox = min(0, max(W - sw, ox))
if sh >= H: oy = min(0, max(H - sh, oy))
ox, oy = round(ox), round(oy)
print(f'échelle {k:.3f} ({"cover" if k == k_cover else "écran dans la largeur"}), photo {sw}×{sh} placée en ({ox}, {oy})')

small = np.asarray(im.resize((sw, sh), Image.LANCZOS)).astype(np.float32)
# toile : chaque pixel prend le pixel de la photo, en miroir au-delà des bords
yy = np.arange(H) - oy
xx = np.arange(W) - ox
def mirror(v, n):
    v = np.abs(v)
    v = np.where(v >= n, 2 * (n - 1) - v, v)
    return np.clip(v, 0, n - 1)
my, mx = mirror(yy, sh), mirror(xx, sw)
out = small[my[:, None], mx[None, :]]
inside = ((yy >= 0) & (yy < sh))[:, None] & ((xx >= 0) & (xx < sw))[None, :]
if not inside.all():
    # les bandes ajoutées : floutées, assombries vers le bord, fondu de 40 px avec la photo
    soft = np.asarray(Image.fromarray(out.astype(np.uint8)).filter(ImageFilter.GaussianBlur(10))).astype(np.float32)
    dy = np.maximum(np.maximum(-yy, yy - (sh - 1)), 0)[:, None].astype(np.float32)
    dx = np.maximum(np.maximum(-xx, xx - (sw - 1)), 0)[None, :].astype(np.float32)
    d = np.maximum(dy, dx)
    fade = np.clip(d / 40, 0, 1)[..., None]
    dark = (1 - 0.55 * np.clip(d / 260, 0, 1))[..., None]
    out = out * (1 - fade) + soft * dark * fade
Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(OUT, quality=93)
print('ok', OUT)
