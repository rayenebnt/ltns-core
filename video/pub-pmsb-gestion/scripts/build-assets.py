"""Pub « PMSB Gestion » : prépare les textures de la pub 3D.

    python3 -I build-assets.py <captures de capture-app.mjs> <dossier assets>

- captures téléphone (base de démo) : numéros et e-mails floutés, JPEG, et m-rects.json (positions des éléments) ;
- carte « Montants » découpée dans la capture (texture de la carte flottante) ;
- devis PDF et lettre de mise en demeure de la vidéo 4 et de la vidéo 7 (déjà floutés là-bas) ;
- logo de l'appli détouré (pour l'enseigne lumineuse « PMSB Gestion ») ;
- bois du bureau et fond flou, générés (aucune photo) : bois.jpg, bois-relief.jpg, fond.jpg.
"""
import json
import os
import shutil
import sys

import numpy as np
from PIL import Image, ImageFilter

CAP, OUT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))  # video/
os.makedirs(OUT, exist_ok=True)
R = json.load(open(os.path.join(CAP, 'rects.json')))
DPR = R['dpr']

# 1. Captures téléphone : flou des numéros et e-mails, JPEG
for name, boxes in R['flou'].items():
    im = Image.open(os.path.join(CAP, name + '.png')).convert('RGB')
    for b in boxes:
        x0, y0 = int((b['x'] - 3) * DPR), int((b['y'] - 2) * DPR)
        x1, y1 = int((b['x'] + b['w'] + 3) * DPR), int((b['y'] + b['h'] + 2) * DPR)
        reg = im.crop((x0, y0, x1, y1)).filter(ImageFilter.GaussianBlur(5 * DPR))
        im.paste(reg, (x0, y0))
    im.save(os.path.join(OUT, name + '.jpg'), quality=86, optimize=True)
    print(name, len(boxes), 'zones floutées')

# Positions des éléments (chemins du néon) : sans le texte des numéros floutés
Rpub = json.loads(json.dumps(R))
for boxes in Rpub['flou'].values():
    for b in boxes:
        b.pop('t', None)
json.dump(Rpub, open(os.path.join(OUT, 'm-rects.json'), 'w'), indent=1, ensure_ascii=False)

# 2. Carte « Montants » seule
c = R['el']['montants']['carte']
im = Image.open(os.path.join(OUT, 'm-devis-montants.jpg'))
im.crop((int(c['x'] * DPR), int(c['y'] * DPR), int((c['x'] + c['w']) * DPR), int((c['y'] + c['h']) * DPR))).save(os.path.join(OUT, 'carte-montants.jpg'), quality=90)

# 3. Documents PDF (déjà floutés par les vidéos 4 et 7)
shutil.copy(os.path.join(ROOT, 'vrais-sites/v04-pmsb-gestion-devis/assets/devis-0013-p1.jpg'), os.path.join(OUT, 'devis-0013-p1.jpg'))
shutil.copy(os.path.join(ROOT, 'vrais-sites/v07-pmsb-gestion-relance/assets/lettre-n3.jpg'), os.path.join(OUT, 'lettre-n3.jpg'))

# 4. Logo de l'appli détouré : alpha = distance au blanc
src = os.environ.get('PMSB_GESTION_LOGO', '/home/user/pmsb-gestion/public/icones/icone-512.png')
a = np.asarray(Image.open(src).convert('RGB')).astype(np.float32) / 255
alpha = np.clip((1 - a.min(axis=2)) * 1.6, 0, 1)
rgba = np.dstack([a, alpha])
ys, xs = np.where(alpha > 0.05)
crop = rgba[ys.min() - 6:ys.max() + 7, xs.min() - 6:xs.max() + 7]
Image.fromarray((crop * 255).astype(np.uint8), 'RGBA').save(os.path.join(OUT, 'logo-pmsb.png'))

# 5. Bois du bureau (périodique dans les deux sens), relief, fond
rng = np.random.default_rng(20261023)


def noise(W, H, cx, cy):
    """Bruit lissé périodique : une valeur aléatoire tous les cx × cy px, interpolation bicubique."""
    w, h = max(2, round(W / cx)), max(2, round(H / cy))
    lat = rng.random((h, w)).astype(np.float32)
    tiled = np.tile(lat, (3, 3))
    big = Image.fromarray(tiled, mode='F').resize((3 * W, 3 * H), Image.BICUBIC)
    return np.asarray(big)[H:2 * H, W:2 * W]


W, H = 4096, 4096
yy = np.arange(H, dtype=np.float32)[:, None] / H
xx = np.arange(W, dtype=np.float32)[None, :] / W
# Veines : lignes fines et irrégulières le long de x (planche sur dosse), stries de couleur
warp = (noise(W, H, 2600, 900) - 0.5) * 0.05 + (noise(W, H, 900, 260) - 0.5) * 0.012
f = (yy + warp) * 70 + (noise(W, H, 4096, 300) - 0.5) * 3.0  # cernes à espacement irrégulier
fr = f - np.floor(f)
late = np.exp(-((fr - 0.5) / 0.06) ** 2) * (0.2 + 0.8 * noise(W, H, 420, 30))  # bois d'été : fine ligne sombre
early = np.exp(-((fr - 0.62) / 0.16) ** 2)
streak = noise(W, H, 700, 3.0) * 0.55 + noise(W, H, 300, 1.6) * 0.45  # stries
fib = noise(W, H, 160, 1.2)  # fibres fines
pores = (noise(W, H, 10, 1.1) > 0.86).astype(np.float32)
blot = noise(W, H, 1100, 700)  # nuances larges
streak2 = noise(W, H, 1800, 14)
t = np.clip(0.42 + 0.8 * (streak - 0.5) + 0.9 * (streak2 - 0.5) + 0.5 * (blot - 0.5) + 0.1 * early + 0.15 * (fib - 0.5), 0, 1)
light = np.array([222, 146, 80], np.float32) / 255
mid = np.array([184, 108, 52], np.float32) / 255
dark = np.array([104, 52, 20], np.float32) / 255
col = mid[None, None] * (1 - t[..., None]) + light[None, None] * t[..., None]
col = col * (1 - 0.5 * late[..., None]) + dark[None, None] * 0.5 * late[..., None]
col *= (1 - 0.18 * pores[..., None])
ring = late
img = np.clip(col, 0, 1) ** 1.0
Image.fromarray((img * 255).astype(np.uint8)).save(os.path.join(OUT, 'bois.jpg'), quality=84)
relief = np.clip(0.55 + 0.5 * (fib - 0.5) + 0.3 * (streak - 0.5) - 0.3 * late - 0.35 * pores, 0, 1)
Image.fromarray((relief * 255).astype(np.uint8)).resize((2048, 2048), Image.LANCZOS).save(os.path.join(OUT, 'bois-relief.jpg'), quality=90)
print('bois.jpg', os.path.getsize(os.path.join(OUT, 'bois.jpg')) // 1024, 'ko')

# Fond (mur sombre, flou, quelques taches de lumière)
FW, FH = 2048, 1024
fy = np.arange(FH, dtype=np.float32)[:, None] / FH
fx = np.arange(FW, dtype=np.float32)[None, :] / FW
base = np.array([0.075, 0.05, 0.035], np.float32)
glow = np.exp(-((fx - 0.72) ** 2 / 0.05 + (fy - 0.35) ** 2 / 0.08))[..., None] * np.array([0.42, 0.30, 0.20], np.float32)
glow2 = np.exp(-((fx - 0.18) ** 2 / 0.03 + (fy - 0.55) ** 2 / 0.05))[..., None] * np.array([0.16, 0.11, 0.07], np.float32)
fond = base[None, None] + glow + glow2
for cx, cy, r, k in [(0.62, 0.42, 0.035, 0.5), (0.8, 0.3, 0.05, 0.35), (0.9, 0.55, 0.03, 0.3), (0.3, 0.38, 0.04, 0.22), (0.12, 0.62, 0.025, 0.18), (0.5, 0.28, 0.02, 0.25)]:
    d = np.sqrt(((fx - cx) * 2) ** 2 + (fy - cy) ** 2)
    fond += (np.clip((r - d) / (r * 0.25), 0, 1) * k)[..., None] * np.array([1.0, 0.8, 0.58], np.float32)
fond = np.clip(fond, 0, 1)
Image.fromarray((fond * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6)).save(os.path.join(OUT, 'fond.jpg'), quality=90)
print('ok')
