"""Prépare les images de la vidéo à partir des captures brutes (capture-site.mjs) et du dépôt du Crousty.

python3 -I video/vrais-sites/v01-crousty-lettres/scripts/prepare-assets.py <dossier brut> [dépôt crousty]

Sorties dans ../assets :
  entree/pNNNNN.webp + entree.json   l'entrée masquée (1080 × 1920)
  lettres/L0-on.webp …  + lettres.json   chaque lettre recadrée, avec sa position à l'écran
  final.webp, compose-tacos.webp
  hero/fin.webp, hero/fin-personne.webp, hero/f054.webp … f084.webp   (images du dépôt, vues de dos uniquement)
  silhouette.json   contour de la personne détourée (coordonnées de fin-personne.webp, 480 × 854)
  fonts/anton-*.woff2   police du site (OFL)
Aucune image avant f054 : le visage de la personne y est visible.
Enfin, flouter-marque.py floute l'inscription de marque imprimée dans le dos de la veste.
"""
import json
import os
import shutil
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(os.path.join(HERE, '..', 'assets'))
RAW = sys.argv[1]
REPO = sys.argv[2] if len(sys.argv) > 2 else '/home/user/rayenebnt/crousty-'
FIRST_BACK = 54  # première image de la marche entièrement de dos


def save_webp(im, path, q=80, **kw):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, 'WEBP', quality=q, method=6, **kw)


# 1) Entrée masquée
man = json.load(open(os.path.join(RAW, 'entree', 'manifest.json')))
for e in man:
    im = Image.open(os.path.join(RAW, 'entree', e['file'] + '.png')).convert('RGB')
    save_webp(im, os.path.join(ASSETS, 'entree', e['file'] + '.webp'), q=78)
json.dump(man, open(os.path.join(ASSETS, 'entree.json'), 'w'), indent=0)

# 2) Lettres seules : recadrage sur la boîte commune (allumée et éteinte), marge pour la lueur
letters = []
for i in range(7):
    on = Image.open(os.path.join(RAW, 'lettres', f'L{i}-on.png')).convert('RGBA')
    off = Image.open(os.path.join(RAW, 'lettres', f'L{i}-off.png')).convert('RGBA')
    a = on.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
    b = off.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
    box = (min(a[0], b[0]) - 4, min(a[1], b[1]) - 4, max(a[2], b[2]) + 4, max(a[3], b[3]) + 4)
    for tag, im in (('on', on), ('off', off)):
        save_webp(im.crop(box), os.path.join(ASSETS, 'lettres', f'L{i}-{tag}.webp'), q=90, alpha_quality=90)
    core = off.getchannel('A').point(lambda v: 255 if v > 200 else 0).getbbox()
    letters.append({'ch': 'CROUSTY'[i], 'x': box[0], 'y': box[1], 'w': box[2] - box[0], 'h': box[3] - box[1], 'core': core})
json.dump(letters, open(os.path.join(ASSETS, 'lettres.json'), 'w'))

# 3) État final et « Compose ton menu »
save_webp(Image.open(os.path.join(RAW, 'final.png')).convert('RGB'), os.path.join(ASSETS, 'final.webp'), q=82)
# (onglet Tacos seulement : sa photo est fournie par le restaurant ; celle de l'onglet Burgers n'a pas d'origine documentée)
for t in ('tacos',):
    im = Image.open(os.path.join(RAW, f'compose-{t}.png')).convert('RGB').resize((720, 1280), Image.LANCZOS)
    save_webp(im, os.path.join(ASSETS, f'compose-{t}.webp'), q=84)

# 4) Images du dépôt (la vraie vidéo TikTok du restaurant, découpée) : vues de dos seulement
os.makedirs(os.path.join(ASSETS, 'hero'), exist_ok=True)
for name in ['fin.webp', 'fin-personne.webp'] + [f'f{i:03d}.webp' for i in range(FIRST_BACK, 85)]:
    shutil.copyfile(os.path.join(REPO, 'public', 'hero', name), os.path.join(ASSETS, 'hero', name))

# 5) Contour de la personne détourée (suivi de bord de Moore, puis simplification)
alpha = Image.open(os.path.join(REPO, 'public', 'hero', 'fin-personne.webp')).getchannel('A')
W, H = alpha.size
px = alpha.load()
inside = lambda x, y: 0 <= x < W and 0 <= y < H and px[x, y] > 128
start = None
for y in range(H):
    for x in range(W):
        if inside(x, y):
            start = (x, y)
            break
    if start:
        break
dirs = [(-1, 0), (-1, -1), (0, -1), (1, -1), (1, 0), (1, 1), (0, 1), (-1, 1)]
pts, cur, back = [start], start, (start[0] - 1, start[1])
for _ in range(200000):
    k0 = dirs.index((back[0] - cur[0], back[1] - cur[1]))
    nxt = None
    for s in range(1, 9):
        d = dirs[(k0 + s) % 8]
        c = (cur[0] + d[0], cur[1] + d[1])
        if inside(*c):
            pd = dirs[(k0 + s - 1) % 8]
            back, nxt = (cur[0] + pd[0], cur[1] + pd[1]), c
            break
    if nxt is None or nxt == start:
        break
    pts.append(nxt)
    cur = nxt


def rdp(p, eps):
    if len(p) < 3:
        return p
    (x1, y1), (x2, y2) = p[0], p[-1]
    dx, dy = x2 - x1, y2 - y1
    n = (dx * dx + dy * dy) ** 0.5 or 1
    dmax, idx = 0, 0
    for i in range(1, len(p) - 1):
        d = abs(dy * p[i][0] - dx * p[i][1] + x2 * y1 - y2 * x1) / n
        if d > dmax:
            dmax, idx = d, i
    if dmax > eps:
        return rdp(p[:idx + 1], eps)[:-1] + rdp(p[idx:], eps)
    return [p[0], p[-1]]


half = len(pts) // 2
simple = rdp(pts[:half + 1], 0.8)[:-1] + rdp(pts[half:] + [pts[0]], 0.8)
d = 'M' + ' L'.join(f'{x},{y}' for x, y in simple) + ' Z'
length = sum(((simple[i][0] - simple[i - 1][0]) ** 2 + (simple[i][1] - simple[i - 1][1]) ** 2) ** 0.5 for i in range(1, len(simple)))
bbox = alpha.point(lambda v: 255 if v > 128 else 0).getbbox()
json.dump({'w': W, 'h': H, 'd': d, 'length': round(length, 1), 'bbox': bbox, 'points': len(simple)}, open(os.path.join(ASSETS, 'silhouette.json'), 'w'))

# 6) La salle floutée (fond de la carte de fin) : néon allumé (p 0,952) et vacillant (p 0,920)
from PIL import ImageFilter  # noqa: E402
for name, src in (('flou-on', 'p09520'), ('flou-dim', 'p09200')):
    im = Image.open(os.path.join(RAW, 'entree', src + '.png')).convert('RGB').resize((540, 960), Image.LANCZOS)
    save_webp(im.filter(ImageFilter.GaussianBlur(16)), os.path.join(ASSETS, name + '.webp'), q=70)

# 7) Police Anton (celle du site, licence OFL)
os.makedirs(os.path.join(ASSETS, 'fonts'), exist_ok=True)
for f in ('anton-latin-400-normal.woff2', 'anton-latin-ext-400-normal.woff2'):
    shutil.copyfile(os.path.join(REPO, 'node_modules', '@fontsource', 'anton', 'files', f), os.path.join(ASSETS, 'fonts', f))

print('OK', len(man), 'images d\'entrée,', len(simple), 'points de contour, bbox', bbox)

# 8) Inscription de marque dans le dos de la veste : floutée sur toutes les vraies images (une seule fois, ici)
import subprocess  # noqa: E402
subprocess.run([sys.executable, '-I', os.path.join(HERE, 'flouter-marque.py')], check=True)
