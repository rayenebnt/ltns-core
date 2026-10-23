"""Vidéo 4 · PMSB Gestion : prépare les images de assets/ à partir des captures (capture-app.mjs).

    python3 -I build-assets.py <dossier des captures> <dossier assets>

- PDF générés par l'appli (base de démo) → pages JPEG 300 dpi, pied de page recadré
  (« SARL PMSB au capital… »), adresses, téléphones, e-mails et SIRET/TVA du client floutés.
- États de l'éditeur de devis (2880 × 1800) → JPEG.
- Tableau de bord : version floutée (fond de l'image 0) et version nette ; échéancier ; téléphone.
  Les numéros de téléphone repérés par capture-app.mjs (rects.json, « flou ») sont floutés.
Tout est en données de démonstration inventées.
"""
import json
import os
import re
import subprocess
import sys
import tempfile

from PIL import Image, ImageFilter

SRC, DST = sys.argv[1], sys.argv[2]
os.makedirs(DST, exist_ok=True)
R = json.load(open(os.path.join(SRC, "rects.json")))
DPI = 300
CROP_H = 3200  # pied de page coupé (la page fait 3508 px de haut à 300 dpi)


def frost(im, box, radius):
    """Floute une zone (verre dépoli net : on voit qu'il y a du texte, on ne le lit pas)."""
    x0, y0, x1, y1 = [int(round(v)) for v in box]
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(im.width, x1), min(im.height, y1)
    if x1 <= x0 or y1 <= y0:
        return
    pad = radius * 3
    big = im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))
    big = big.filter(ImageFilter.GaussianBlur(radius))
    region = big.crop((x0 - max(0, x0 - pad), y0 - max(0, y0 - pad), x0 - max(0, x0 - pad) + (x1 - x0), y0 - max(0, y0 - pad) + (y1 - y0)))
    im.paste(region, (x0, y0))


def pdf_lines(pdf):
    """Lignes de texte du PDF (pdftotext -bbox), découpées en blocs quand l'écart horizontal est grand."""
    with tempfile.TemporaryDirectory() as d:
        out = os.path.join(d, "b.html")
        subprocess.run(["pdftotext", "-bbox", pdf, out], check=True)
        html = open(out, encoding="utf-8").read()
    pages = []
    for page in re.findall(r"<page[^>]*>(.*?)</page>", html, re.S):
        words = [(float(a), float(b), float(c), float(d), w) for a, b, c, d, w in
                 re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>', page)]
        words.sort(key=lambda w: (round(w[1]), w[0]))
        lines = []
        for w in words:
            if lines and abs(lines[-1][-1][1] - w[1]) < 2 and w[0] - lines[-1][-1][2] < 40:
                lines[-1].append(w)
            else:
                lines.append([w])
        blocks = []
        for ln in lines:
            text = " ".join(w[4] for w in ln).replace("&apos;", "'").replace("&amp;", "&")
            blocks.append((min(w[0] for w in ln), min(w[1] for w in ln), max(w[2] for w in ln), max(w[3] for w in ln), text))
        pages.append(blocks)
    return pages


# Ce qui ne doit pas se lire, même en démo : coordonnées de l'en-tête, adresse et identifiants du client, adresse du chantier
SENSIBLE = re.compile(r"^\d+ rue |Ville-Démo$|^94\d\d\d |TEL :|^0\d \d\d|@|^SIRET|^TVA FR")


POSITIONS = {}
REPERES = {
    "entreprise": r"^ENTREPRISE", "sous-titre": r"^Prestations Multi", "client": r"^SCI Les Glycines", "date": r"^Ville-Démo, le",
    "chantier": r"^CHANTIER", "numero": r"^Devis N°", "objet": r"^Ravalement de l", "entete-tableau": r"^DÉSIGNATION",
    "lot1": r"^Lot 1", "l1": r"^1\. ", "l2": r"^2\. ", "l3": r"^3\. ", "lot2": r"^Lot 2", "l4": r"^4\. ", "l5": r"^5\. ",
    "l6": r"^6\. ", "l7": r"^7\. ", "total-ht-avant": r"^TOTAL HT AVANT", "total-ttc": r"^TOTAL TTC", "accord": r"^Bon pour accord",
    "pour-pmsb": r"^Pour l'entreprise", "montant-ttc": r"^\d[\d ]*,\d\d €$",
}


def pdf_pages(pdf, name, pages):
    blocks = pdf_lines(pdf)
    k = DPI / 72
    for i in pages:
        pos = {}
        for x0, y0, x1, y1, text in blocks[i]:
            for key, rx in REPERES.items():
                if re.search(rx, text) and key not in pos:
                    pos[key] = [round(x0 * k), round(y0 * k), round(x1 * k), round(y1 * k)]
        POSITIONS[f"{name}-p{i + 1}"] = pos
    with tempfile.TemporaryDirectory() as d:
        subprocess.run(["pdftoppm", "-r", str(DPI), "-png", pdf, os.path.join(d, "p")], check=True)
        files = sorted(f for f in os.listdir(d) if f.endswith(".png"))
        for i in pages:
            im = Image.open(os.path.join(d, files[i])).convert("RGB")
            k = DPI / 72
            hidden = []
            for x0, y0, x1, y1, text in blocks[i]:
                if SENSIBLE.search(text) and not text.startswith("Assurance") and not text.startswith("Règlement"):
                    frost(im, (x0 * k - 14, y0 * k - 10, x1 * k + 14, y1 * k + 10), 16)
                    hidden.append(text)
            im = im.crop((0, 0, im.width, CROP_H))
            out = os.path.join(DST, f"{name}-p{i + 1}.jpg")
            im.save(out, quality=88, optimize=True, progressive=True)
            print(out, "flouté :", hidden)


pdf_pages(os.path.join(SRC, "devis-DEV-2026-0002.pdf"), "devis-0002", [0])
pdf_pages(os.path.join(SRC, "devis-copie.pdf"), "devis-0013", [0, 1])


def app_shot(src, dst, flou=(), scale=2, quality=88, resize=None, blur=0):
    im = Image.open(os.path.join(SRC, src)).convert("RGB")
    for r in flou:
        frost(im, ((r["x"] - 4) * scale, (r["y"] - 3) * scale, (r["x"] + r["w"] + 4) * scale, (r["y"] + r["h"] + 3) * scale), 9 * scale // 2)
    if resize:
        im = im.resize(resize, Image.LANCZOS)
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    out = os.path.join(DST, dst)
    im.save(out, quality=quality, optimize=True, progressive=True)
    print(out)


for f in sorted(os.listdir(SRC)):
    m = re.match(r"(e\d\d)-.*\.png$", f)
    if m:
        app_shot(f, f"{m.group(1)}.jpg", R["flou"].get("editeur", []))
app_shot("tableau-de-bord.png", "tableau-de-bord.jpg", R["flou"]["tableau-de-bord"], quality=84)
app_shot("tableau-de-bord.png", "tableau-de-bord-flou.jpg", R["flou"]["tableau-de-bord"], resize=(720, 450), blur=7, quality=80)
app_shot("echeancier.png", "echeancier.jpg", R["flou"]["echeancier"], quality=84)
app_shot("m01-tableau-de-bord.png", "m01.jpg", R["flou"]["m01"], scale=3, quality=86)
app_shot("m02-menu.png", "m02.jpg", R["flou"]["m02"], scale=3, quality=86)

# Rectangles utiles à la page (px CSS de la fenêtre 1440 × 900 ou 390 × 844)
keep = {k: v for k, v in R.items() if k not in ("flou", "dev0002", "copie")}
keep["pdf"] = POSITIONS
keep["pdfSize"] = [2481, CROP_H]
json.dump(keep, open(os.path.join(DST, "rects.json"), "w"), ensure_ascii=False, indent=1)
print("rects.json")
