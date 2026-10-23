"""Prépare les images de la vidéo à partir des captures brutes et des rendus de render.c.

python3 -I scripts/prepare-assets.py <captures brutes> <rendus render.c (dossier out/)>

- héros mobile @3 : plaque sans interface (55 images), images complètes (28), calques d'interface (PNG transparents) ;
- téléphone, Programme TV, Top 10 (mobile @2) et ordinateur (1280 × 720) : séquences WebP ;
- render.c : 8 préréglages 1080 × 1920, le préréglage 0 en 540 × 960 … 68 × 120 (sans perte), travelling avant (48 images) ;
- copie de hero-crepuscule.webp, de render.c (affiché tel quel) et de la police Outfit (OFL) de la maquette.
"""
import json
import shutil
import sys
from pathlib import Path

from PIL import Image

RAW = Path(sys.argv[1])
RENDER = Path(sys.argv[2])
HERE = Path(__file__).resolve().parent.parent
A = HERE / "assets"
REPO = Path("/home/user/rayenebnt/swatter-tv/maquette")


def fresh(p):
    p = A / p
    shutil.rmtree(p, ignore_errors=True)
    p.mkdir(parents=True, exist_ok=True)
    return p


def frame_1080(im):
    # 1170 × 2532 (390 × 844 @3) ramené à 1080 de large, cadré en haut : la barre d'onglets sort du cadre
    im = im.convert("RGB")
    w, h = im.size
    k = 1080 / w
    return im.resize((1080, round(h * k)), Image.LANCZOS).crop((0, 0, 1080, 1920))


# ---------- Héros mobile ----------
hero = RAW / "hero"
if hero.exists():
    out = fresh("hero")
    (out / "plate").mkdir()
    (out / "full").mkdir()
    meta = json.loads((hero / "boxes.json").read_text())
    plates = sorted(hero.glob("plate-*.png"))
    for i, p in enumerate(plates):
        frame_1080(Image.open(p)).save(out / "plate" / f"p{i:02d}.webp", quality=86, method=6)
    fulls = sorted(hero.glob("full-*.png"))
    full_idx = [int(p.stem.split("-")[1]) for p in fulls]
    for p in fulls:
        i = int(p.stem.split("-")[1])
        frame_1080(Image.open(p)).save(out / "full" / f"f{i:02d}.webp", quality=86, method=6)
    # Calques d'interface : capture transparente @3 de chaque élément seul (passe « layers »), avec une marge pour les ombres
    ui = Image.open(hero / "ui.png").convert("RGBA")
    b = meta["boxes"]
    layers = {
        "logo": b["logo"], "actions": b["actions"],
        "b0": b["badges"][0], "b1": b["badges"][1], "b2": b["badges"][2],
        "l0": b["lines"][0], "l1": b["lines"][1],
        "desc": b["desc"], "progress": b["progress"], "cta0": b["cta"][0], "cta1": b["cta"][1],
        "hnav": b["hnav"],
    }
    PADS = {"cta0": 16, "cta1": 16, "b0": 12}
    boxes = {}
    layers["hdrbg"] = [0, 0, 390, 130]
    PADS["hdrbg"] = 0
    for name, (x, y, w, h) in layers.items():
        m = PADS.get(name, 8)
        x0, y0, x1, y1 = x - m, y - m, x + w + m, y + h + m
        src = Image.open(RAW / "layers" / f"{name}.png").convert("RGBA") if (RAW / "layers" / f"{name}.png").exists() else ui
        crop = src.crop((round(x0 * 3), round(y0 * 3), round(x1 * 3), round(y1 * 3)))
        crop.save(out / f"ui-{name}.webp", lossless=True, method=6)
        boxes[name] = [round(x0 * 3) / 3, round(y0 * 3) / 3, crop.size[0] / 3, crop.size[1] / 3]
    # bas de l'écran (sous le héros, 760 → 844) : barre d'onglets de l'image complète, pour le téléphone
    f0 = Image.open(hero / f"full-{meta['frame0']:03d}.png").convert("RGB")
    f0.crop((0, 760 * 3, 1170, 844 * 3)).save(out / "bottom.webp", quality=88, method=6)
    kb = meta["kenburns"][0]["vt0"] / 1000
    (out / "hero.json").write_text(json.dumps({
        "T0": meta["T0"], "from": meta["from"], "fps": meta["fps"], "frame0": meta["frame0"],
        "plates": len(plates), "full": [min(full_idx), max(full_idx)], "kenburns_t0": kb, "layers": boxes,
    }, indent=1))
    shutil.copy(REPO / "assets/visuels/hero-crepuscule.webp", out / "hero-crepuscule.webp")
    print("héros :", len(plates), "plaques,", len(fulls), "complètes,", len(boxes), "calques")


def seq(src, pattern, dst, prefix, size, q=80):
    files = sorted((RAW / src).glob(pattern))
    if not files:
        return 0
    out = fresh(dst)
    for i, p in enumerate(files):
        Image.open(p).convert("RGB").resize(size, Image.LANCZOS).save(out / f"{prefix}{i:03d}.webp", quality=q, method=6)
    return len(files)


print("téléphone :", seq("phone", "p-*.png", "phone/carousel", "c", (540, 1169)))
print("programme :", seq("prog", "g-*.png", "phone/prog", "g", (540, 1169)))
print("top 10 :", seq("top", "t-*.png", "phone/top", "t", (540, 1169)))
print("ordinateur :", seq("desk", "k-*.png", "desk", "k", (768, 432), q=84))

# ---------- render.c ----------
if RENDER.exists():
    out = fresh("render")
    for k in range(8):
        Image.open(RENDER / f"preset{k}-1080x1920.ppm").save(out / f"p{k}.webp", quality=88, method=6)
    for s in ["540x960", "270x480", "135x240", "68x120"]:
        Image.open(RENDER / f"preset0-{s}.ppm").save(out / f"p0-{s}.webp", lossless=True, method=6)
    (out / "dolly").mkdir()
    dl = sorted((RENDER / "dolly").glob("d*.ppm"))
    for i, p in enumerate(dl):
        Image.open(p).save(out / "dolly" / f"d{i:02d}.webp", quality=80, method=6)
    print("render.c : 8 préréglages, 4 basses définitions,", len(dl), "images de travelling")

shutil.copy(REPO / "outils/render.c", A / "render.c.txt")
(A / "fonts").mkdir(exist_ok=True)
shutil.copy(REPO / "assets/fonts/outfit.woff2", A / "fonts/outfit.woff2")
shutil.copy(REPO / "assets/fonts/OFL-outfit.txt", A / "fonts/OFL-outfit.txt")
print("OK")
