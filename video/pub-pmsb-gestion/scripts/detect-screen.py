"""Retrouve l'écran vert de la photo et écrit ses 4 coins dans assets/screen.json.

    python3 -I scripts/detect-screen.py [assets/photo.jpg] [assets/screen.json] [--debug apercu.jpg] [--grow 2]

Méthode (numpy + Pillow seulement) :
1. masque des pixels nettement verts (vert dominant, fond vert pur 0,177,64 sur l'écran) ;
2. plus grande zone verte d'un seul tenant (l'écran) ;
3. coins approchés par les extrêmes (x + y, x − y), puis une droite ajustée sur chaque bord
   (moindres carrés robustes, coins arrondis et encoche de l'écran écartés) ;
4. écran incurvé : sur chaque bord, l'écart à la droite est ajusté par d = e + 4·b·t(1 − t)
   (e décale la droite, b est la flèche au milieu, en px, positive vers l'extérieur) ;
5. les 4 coins sont les intersections des droites, agrandis de --grow px pour couvrir le liseré vert.
La photo est remise à l'endroit si son EXIF indique une rotation (le navigateur ferait pareil).
"""
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
args = [a for a in sys.argv[1:]]
opt = {}
for k in ('--debug', '--grow'):
    if k in args:
        i = args.index(k); opt[k] = args[i + 1]; del args[i:i + 2]
SRC = args[0] if len(args) > 0 else os.path.join(HERE, '..', 'assets', 'photo.jpg')
OUT = args[1] if len(args) > 1 else os.path.join(HERE, '..', 'assets', 'screen.json')
GROW = float(opt.get('--grow', 2))

im = Image.open(SRC)
up = ImageOps.exif_transpose(im)
if up.size != im.size or (im.getexif().get(274, 1) not in (1, None)):
    up.convert('RGB').save(SRC, quality=95)
    print('photo remise à l\'endroit (EXIF)')
im = up.convert('RGB')
W, H = im.size
a = np.asarray(im).astype(np.int32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
mask = (g > 70) & (g - np.maximum(r, b) > np.maximum(35, 0.28 * g))
# nettoyage : ouverture puis fermeture
m = Image.fromarray((mask * 255).astype(np.uint8))
m = m.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
mask = np.asarray(m) > 127
if mask.sum() < 0.02 * W * H:
    sys.exit('Écran vert introuvable : la photo doit montrer l\'écran rempli de vert (0, 177, 64).')

# plus grande zone d'un seul tenant (sur une version réduite, puis ramenée à pleine résolution)
k = max(1, round(max(W, H) / 480))
small = mask[::k, ::k]
lab = np.zeros(small.shape, np.int32)
best, best_n, cur = 0, 0, 0
for sy, sx in zip(*np.nonzero(small)):
    if lab[sy, sx]:
        continue
    cur += 1; n = 0
    q = deque([(sy, sx)]); lab[sy, sx] = cur
    while q:
        yy, xx = q.popleft(); n += 1
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = yy + dy, xx + dx
            if 0 <= ny < small.shape[0] and 0 <= nx < small.shape[1] and small[ny, nx] and not lab[ny, nx]:
                lab[ny, nx] = cur; q.append((ny, nx))
    if n > best_n:
        best, best_n = cur, n
comp = np.kron(lab == best, np.ones((k, k), bool))[:H, :W]
comp = np.pad(comp, ((0, max(0, H - comp.shape[0])), (0, max(0, W - comp.shape[1]))))[:H, :W]
comp = Image.fromarray((comp * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * k + 1))
mask = mask & (np.asarray(comp) > 127)

# bord de la zone
inner = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))) > 127
ys, xs = np.nonzero(mask & ~inner)
P = np.stack([xs, ys], 1).astype(np.float64)
s, d = P[:, 0] + P[:, 1], P[:, 0] - P[:, 1]
c0 = {'tl': P[s.argmin()], 'br': P[s.argmax()], 'tr': P[d.argmax()], 'bl': P[d.argmin()]}
edges = [('tl', 'tr'), ('tr', 'br'), ('br', 'bl'), ('bl', 'tl')]


def seg_dist(p, a, b):
    ab = b - a
    t = np.clip(((p - a) @ ab) / (ab @ ab), 0, 1)
    return np.linalg.norm(p - (a + t[:, None] * ab), axis=1), t


D, T = [], []
for e in edges:
    dd, tt = seg_dist(P, c0[e[0]], c0[e[1]]); D.append(dd); T.append(tt)
D, T = np.stack(D, 1), np.stack(T, 1)
who = D.argmin(1)
lines, bows = [], []
ctr0 = np.mean(list(c0.values()), 0)
for i, e in enumerate(edges):
    sel = (who == i) & (T[np.arange(len(P)), i] > 0.07) & (T[np.arange(len(P)), i] < 0.93)
    pts = P[sel]
    tpar = T[sel, i]
    for _ in range(4):  # moindres carrés totaux, en écartant les points loin de la droite (encoche, reflets)
        c = pts.mean(0)
        u, sv, vt = np.linalg.svd(pts - c)
        n = vt[1]
        res = np.abs((pts - c) @ n)
        keep = res < max(2.0, 2.5 * np.median(res))
        if keep.all():
            break
        pts = pts[keep]; tpar = tpar[keep]
    if (ctr0 - c) @ n > 0:
        n = -n  # normale vers l'extérieur de l'écran
    # écart (vers l'extérieur) de tous les points du bord à la droite : décalage e + flèche b
    allp = P[sel]; allt = T[sel, i]
    dd = (allp - c) @ n
    ok = np.abs(dd - np.median(dd)) < 25  # écarte l'encoche et les reflets
    A = np.stack([np.ones(ok.sum()), 4 * allt[ok] * (1 - allt[ok])], 1)
    (e0, b0), *_ = np.linalg.lstsq(A, dd[ok], rcond=None)
    if abs(b0) < 1.5:
        e0, b0 = float(np.median(dd[ok])), 0.0
    lines.append((c + n * e0, vt[0], n)); bows.append(float(b0))


def inter(l1, l2):
    (p1, d1, _), (p2, d2, _) = l1, l2
    A = np.array([d1, -d2]).T
    t = np.linalg.solve(A, p2 - p1)
    return p1 + t[0] * d1


corners = {'tl': inter(lines[3], lines[0]), 'tr': inter(lines[0], lines[1]), 'br': inter(lines[1], lines[2]), 'bl': inter(lines[2], lines[3])}
ctr = np.mean(list(corners.values()), 0)
for key in corners:  # léger agrandissement : le liseré vert anticrénelé disparaît sous la pub
    v = corners[key] - ctr
    corners[key] = corners[key] + v / np.linalg.norm(v) * GROW
out = {
    'photo': os.path.basename(SRC), 'size': [W, H],
    'corners': {key: [round(float(v[0]), 1), round(float(v[1]), 1)] for key, v in corners.items()},
    # flèche de chaque bord (écran incurvé), en px de la photo, positive vers l'extérieur
    'bow': {name: round(b + (GROW if b else 0) * 0, 1) for name, b in zip(('top', 'right', 'bottom', 'left'), bows)},
    'green_px': int(mask.sum()),
}
json.dump(out, open(OUT, 'w'), indent=1)
print(json.dumps(out))
if '--debug' in opt:
    dbg = im.copy(); dr = ImageDraw.Draw(dbg)
    q = [tuple(corners[k]) for k in ('tl', 'tr', 'br', 'bl')]
    # bords courbes : chaque bord suit sa flèche
    for (a_, b_), (_, _, nn), bw in zip([(0, 1), (1, 2), (2, 3), (3, 0)], lines, bows):
        pa, pb = np.array(q[a_]), np.array(q[b_])
        pts_ = [tuple(pa + (pb - pa) * u + nn * 4 * bw * u * (1 - u)) for u in np.linspace(0, 1, 30)]
        dr.line(pts_, fill=(255, 0, 255), width=3)
    for p in q:
        dr.ellipse((p[0] - 8, p[1] - 8, p[0] + 8, p[1] + 8), outline=(255, 255, 0), width=3)
    dbg.save(opt['--debug'], quality=90)
