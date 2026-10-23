"""Mesures sur les images capturées, pour caler le montage sur le vrai rendu.

python3 -I analyse.py rangs <dossier intro> <sortie.json> [fps] [début] [px] [py]
    Assises de la façade (projection de la caméra de StoneWall.tsx) et instant où chacune se pose
    (dernière image où la bande bouge encore), pour tracer un trait bleu sous chaque rang.
python3 -I analyse.py lumiere <dossier images> <sortie.json> [fps]
    Position de la tache de lumière qui dérive seule (barycentre de la zone la plus claire), image par image.
"""
import glob
import json
import math
import sys

import numpy as np
from PIL import Image, ImageFilter


def project(p, eye, target, fov=42, w=1440, h=1600):
    eye, target, p = map(np.array, (eye, target, p))
    z = eye - target
    z = z / np.linalg.norm(z)
    x = np.cross([0, 1, 0], z)
    x = x / np.linalg.norm(x)
    y = np.cross(z, x)
    d = p - eye
    c = np.array([d @ x, d @ y, d @ z])
    t = math.tan(math.radians(fov / 2))
    nx = (c[0] / -c[2]) / (t * w / h)
    ny = (c[1] / -c[2]) / t
    return (nx + 1) / 2 * w, (1 - ny) / 2 * h


def rangs(folder, out, fps=60, start=0.0, px=0.0, py=0.0):
    files = sorted(glob.glob(f"{folder}/f*.jpg"))
    H, rows = 21, 26
    ch = H / rows
    # caméra de StoneWall.tsx (ordinateur) : camBase (-1,9 ; 0,6 ; 20,5) + pointeur
    eye, target = (-1.9 + px * 1.7, 0.6 + py * 1.2, 20.5), (0, py * 0.25, 0)
    scale = 1080 / 900  # px CSS -> px vidéo (tranche x 0-900)
    lines = []
    for r in range(1, rows):
        yj = -H / 2 + r * ch  # joint entre l'assise r-1 et r
        a = project((-9.0, yj, 0.35), eye, target)
        b = project((3.0, yj, 0.35), eye, target)
        # droite entre a et b, ramenée aux bords de la tranche (x 0 et 900 px CSS)
        k = (b[1] - a[1]) / (b[0] - a[0])
        y0 = a[1] + k * (0 - a[0])
        y1 = a[1] + k * (900 - a[0])
        if max(y0, y1) * scale > 1130 or min(y0, y1) < 0:  # sous les lettres PMSB ou hors cadre
            continue
        lines.append({"row": r, "y0": round(y0 * scale, 1), "y1": round(y1 * scale, 1)})
    # instant de pose de chaque assise : bande au-dessus du joint
    frames = [np.asarray(Image.open(f).convert("L").resize((270, 480))).astype(np.float32) for f in files]
    diffs = np.array([np.abs(frames[i] - frames[i - 1]) for i in range(1, len(frames))])
    for ln in lines:
        yb = int((ln["y0"] + ln["y1"]) / 2 / 4)  # bas de la bande (image réduite /4)
        band = diffs[:, max(0, yb - 22):yb, 20:250].mean(axis=(1, 2))
        peak = band.max()
        moving = np.where(band > max(0.6, 0.12 * peak))[0]
        ln["lock"] = round(start + (moving[-1] + 1) / fps, 3) if len(moving) else None
        ln["first"] = round(start + (moving[0] + 1) / fps, 3) if len(moving) else None
    json.dump({"fps": fps, "lines": lines}, open(out, "w"), indent=1)
    for ln in lines:
        print(ln)


def lumiere(folder, out, fps=30):
    files = sorted(glob.glob(f"{folder}/f*.jpg"))
    pts = []
    for f in files:
        im = Image.open(f).convert("L")
        w, h = im.size
        small = im.resize((w // 8, h // 8)).filter(ImageFilter.GaussianBlur(6))
        a = np.asarray(small).astype(np.float32)
        thr = np.percentile(a, 92)
        m = np.clip(a - thr, 0, None)
        ys, xs = np.mgrid[0:a.shape[0], 0:a.shape[1]]
        s = m.sum() or 1
        pts.append([round(float((xs * m).sum() / s) / a.shape[1], 4), round(float((ys * m).sum() / s) / a.shape[0], 4)])
    json.dump({"fps": fps, "pts": pts}, open(out, "w"))
    print(len(pts), pts[0], pts[len(pts) // 2], pts[-1])


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "rangs":
        a = sys.argv[4:]
        rangs(sys.argv[2], sys.argv[3], *(float(x) for x in a))
    elif cmd == "lumiere":
        lumiere(sys.argv[2], sys.argv[3], int(sys.argv[4]) if len(sys.argv) > 4 else 30)
