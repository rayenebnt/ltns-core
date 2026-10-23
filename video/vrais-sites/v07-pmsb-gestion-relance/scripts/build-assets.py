"""Vidéo 7 · PMSB Gestion : prépare assets/ à partir des captures de capture-app.mjs.

    python3 -I build-assets.py <dossier des captures> <dossier assets>

- Carte « Relances » (DPR 3) aux niveaux 1, 2, 3, survols et « Relance notée » : copiées telles quelles
  (aucune coordonnée visible) ; repérage des lignes du message pour l'effet machine à écrire.
- Lettre PDF de niveau 3 générée par l'appli → JPEG 200 dpi, pied de page (SIRET…) coupé,
  adresses, téléphones et e-mails floutés (même fictifs).
- Tableau de bord, fiche facture, échéancier : téléphones des clients floutés (même fictifs) ;
  version très floutée du tableau de bord pour le fond de l'image 0.
Tout est en données de démonstration inventées.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageFilter

SRC, DST = sys.argv[1], sys.argv[2]
os.makedirs(DST, exist_ok=True)
R = json.load(open(os.path.join(SRC, "rects.json")))
OUT = {}


def frost(im, box, radius):
    """Floute une zone (on voit qu'il y a du texte, on ne le lit pas)."""
    x0, y0, x1, y1 = [int(round(v)) for v in box]
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(im.width, x1), min(im.height, y1)
    if x1 <= x0 or y1 <= y0:
        return
    pad = radius * 3
    bx0, by0 = max(0, x0 - pad), max(0, y0 - pad)
    big = im.crop((bx0, by0, min(im.width, x1 + pad), min(im.height, y1 + pad))).filter(ImageFilter.GaussianBlur(radius))
    im.paste(big.crop((x0 - bx0, y0 - by0, x1 - bx0, y1 - by0)), (x0, y0))


def frost_rects(im, rects, scale, radius, pad=4):
    for b in rects:
        frost(im, ((b["x"] - pad) * scale, (b["y"] - pad) * scale, (b["x"] + b["w"] + pad) * scale, (b["y"] + b["h"] + pad) * scale), radius)


def save(im, name, **kw):
    path = os.path.join(DST, name)
    if name.endswith(".jpg"):
        im.convert("RGB").save(path, quality=kw.get("quality", 90), optimize=True, progressive=True)
    else:
        im.save(path, optimize=True)
    print(name, im.size, os.path.getsize(path) // 1024, "Ko")


# ── Carte « Relances » (aucune donnée sensible : texte de relance, montants de démo) ──
for n in ["panneau-n1", "panneau-n2", "panneau-n3", "panneau-n3-survol-messagerie", "panneau-n3-notee",
          "panneau-n3-notee-survol-pdf", "panneau-n3-notee-survol-copier"]:
    im = Image.open(os.path.join(SRC, n + ".png")).convert("RGB")
    save(im, n + ".png")


def text_lines(im, box, dark=150, min_w=40):
    """Lignes de texte d'une zone (projection horizontale des pixels sombres) : [y0, y1, x0, x1] en px image."""
    x0, y0, x1, y1 = [int(round(v)) for v in box]
    g = im.convert("L").crop((x0, y0, x1, y1))
    w, h = g.size
    px = g.load()
    rows = []
    for y in range(h):
        xs = [x for x in range(w) if px[x, y] < dark]
        rows.append((min(xs), max(xs)) if xs else None)
    lines, cur = [], None
    for y, r in enumerate(rows):
        if r and cur is None:
            cur = [y, y, r[0], r[1]]
        elif r:
            cur[1], cur[2], cur[3] = y, min(cur[2], r[0]), max(cur[3], r[1])
        elif cur is not None:
            lines.append(cur)
            cur = None
    if cur:
        lines.append(cur)
    out = []
    for a, b, c, d in lines:
        if d - c >= min_w and b - a >= 8:
            out.append([y0 + a, y0 + b + 1, x0 + c, x0 + d + 1])
    return out


# Lignes visibles du message (niveaux 1, 2, 3) : intérieur du champ, sans la poignée de redimensionnement
for k, img in [("n1", "panneau-n1"), ("n2", "panneau-n2"), ("n3", "panneau-n3")]:
    m = R["panneau"][k]["message"]
    im = Image.open(os.path.join(SRC, img + ".png"))
    s = im.width / R["panneau"][k]["section"]["w"]
    OUT[f"lignes-{k}"] = [[round(v / s, 2) for v in ln] for ln in text_lines(im, ((m["x"] + 4) * s, (m["y"] + 4) * s, (m["x"] + m["w"] - 16) * s, (m["y"] + m["h"] - 4) * s))]
# Lignes de l'historique (« Relance notée ») et du message vert
im = Image.open(os.path.join(SRC, "panneau-n3-notee.png"))
s = im.width / R["panneau"]["notee"]["section"]["w"]
OUT["historique-notee"] = []
for li in R["panneau"]["notee"]["historique"]:
    ln = text_lines(im, (li["x"] * s, li["y"] * s, (li["x"] + li["w"]) * s, (li["y"] + li["h"]) * s), dark=200, min_w=10)
    OUT["historique-notee"].append({"t": li["t"], "x0": round(min(l[2] for l in ln) / s, 1), "x1": round(max(l[3] for l in ln) / s, 1), "y0": li["y"], "y1": li["y"] + li["h"]})

# ── Lettre PDF (niveau 3) ──
DPI = 200
with tempfile.TemporaryDirectory() as d:
    subprocess.run(["pdftoppm", "-r", str(DPI), "-png", "-singlefile", os.path.join(SRC, "lettre-n3.pdf"), os.path.join(d, "l")], check=True)
    lettre = Image.open(os.path.join(d, "l.png")).convert("RGB")
    subprocess.run(["pdftotext", "-bbox", os.path.join(SRC, "lettre-n3.pdf"), os.path.join(d, "b.html")], check=True)
    html = open(os.path.join(d, "b.html"), encoding="utf-8").read()
k = DPI / 72
words = [(float(a), float(b), float(c), float(e), w) for a, b, c, e, w in
         re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>', html)]
words.sort(key=lambda w: (round(w[1]), w[0]))
lines = []
for w in words:
    if lines and abs(lines[-1][-1][1] - w[1]) < 2 and w[0] - lines[-1][-1][2] < 40:
        lines[-1].append(w)
    else:
        lines.append([w])
blocks = []
for ln in lines:
    text = " ".join(w[4] for w in ln).replace("&apos;", "'").replace("&amp;", "&").replace("&quot;", '"')
    blocks.append((min(w[0] for w in ln) * k, min(w[1] for w in ln) * k, max(w[2] for w in ln) * k, max(w[3] for w in ln) * k, text))
SENSIBLE = re.compile(r"^\d+ (rue|avenue|boulevard|allée|impasse|chemin) |Ville-Démo$|^94\d\d\d |TEL :|^0\d \d\d|@")
pied = min((b[1] for b in blocks if b[4].startswith("SARL ")), default=lettre.height / k) - 40
OUT["lettre"] = {"w": lettre.width, "lignes": []}
for x0, y0, x1, y1, t in blocks:
    if SENSIBLE.search(t):
        frost(lettre, (x0 - 8, y0 - 6, x1 + 8, y1 + 6), 11)
        print("  flou lettre :", t[:3] + "…")
    elif y0 < pied:
        OUT["lettre"]["lignes"].append([round(x0), round(y0), round(x1), round(y1), t])
lettre = lettre.crop((0, 0, lettre.width, int(pied)))
OUT["lettre"]["h"] = lettre.height
save(lettre, "lettre-n3.jpg", quality=92)

# ── Tableau de bord, fiche facture, échéancier (DPR 2) ──
dash = Image.open(os.path.join(SRC, "dash.png")).convert("RGB")
frost_rects(dash, R["flou"]["dash"], 2, 9)
save(dash, "dash.jpg")
flou = dash.resize((720, 450), Image.LANCZOS).filter(ImageFilter.GaussianBlur(9))
save(flou, "dash-flou.jpg", quality=86)
sv = Image.open(os.path.join(SRC, "dash-survol.png")).convert("RGB")
b = R["dash"]["relancer"]
save(sv.crop((int(b["x"] * 2) - 8, int(b["y"] * 2) - 8, int((b["x"] + b["w"]) * 2) + 8, int((b["y"] + b["h"]) * 2) + 8)), "relancer-survol.png")
fo = Image.open(os.path.join(SRC, "facture-ouvert.png")).convert("RGB")
frost_rects(fo, R["flou"]["factureOuvert"], 2, 9)
save(fo, "facture-ouvert.jpg")

# Gros plans DPR 3
for name, key in [("el-kpi-retard", "kpi"), ("el-dash-retard", "dashRetard"), ("el-echeancier-retard", "echRetard"), ("el-sidebar", "sidebar")]:
    im = Image.open(os.path.join(SRC, name + ".png")).convert("RGB")
    s = im.width / R["el"][key]["w"]
    frost_rects(im, R["flou"][key], s, 12)
    if key == "sidebar":
        # le logo (PMSB RAVALEMENT GESTION), la ligne « Échéancier » et sa pastille, séparément
        e, b = R["el"]["sideEch"], R["el"]["sideBadge"]
        save(im.crop((int(12 * s), int(8 * s), int(236 * s), int(186 * s))), "logo-gestion.png")
        save(im.crop((int(e["x"] * s), int(e["y"] * s), int((e["x"] + e["w"]) * s), int((e["y"] + e["h"]) * s))), "ligne-echeancier.png")
        m = 2
        save(im.crop((int((b["x"] - m) * s), int((b["y"] - m) * s), int((b["x"] + b["w"] + m) * s), int((b["y"] + b["h"] + m) * s))), "pastille.png")
        fond = im.getpixel((int((b["x"] - 6) * s), int((b["y"] + b["h"] / 2) * s)))
        OUT["fondPastille"] = "#%02x%02x%02x" % fond[:3]
        continue
    save(im, name + ".png")

OUT["rects"] = {k: R[k] for k in ("dash", "factureOuvert", "panneau", "el")}
OUT["relances"] = R.get("relancesApres")
json.dump(OUT, open(os.path.join(DST, "rects.json"), "w"), ensure_ascii=False, indent=1)
print("rects.json")
