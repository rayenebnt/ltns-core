"""Floute l'inscription de marque imprimée dans le dos de la veste (vraies images de la vidéo du restaurant).

python3 -I video/vrais-sites/v01-crousty-lettres/scripts/flouter-marque.py [--apercu <dossier>]

Lancé à la fin de prepare-assets.py (donc une seule fois par régénération). Agit sur ../assets :
  hero/f054.webp … f084.webp, hero/fin.webp, hero/fin-personne.webp   (480 × 854, coordonnées de référence)
  entree/pNNNNN.webp   (1080 × 1920 : image idx du manifeste, agrandie × 2,25, puis × scale autour de (540, 807))
(final.webp n'est pas touché : la bande y mordrait sur « Fast-food · Bonneuil-sur-Marne », et l'inscription y est minuscule.)
Les bandes ont été relevées à la main sur presque chaque image (centre, longueur du texte, angle) et interpolées entre elles.
--apercu écrit des vignettes avec les bandes tracées en rouge au lieu de flouter (pour vérifier le suivi).
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(os.path.join(HERE, '..', 'assets'))

# idx de l'image de la vidéo : (cx, cy, longueur du texte, angle en degrés), en pixels de l'image 480 × 854
KEYS = {
    54: (100, 590, 150, 14), 56: (136, 582, 195, 13.5), 58: (185, 577, 225, 5), 59: (210, 582, 225, 4.7),
    60: (231, 595, 220, 0), 61: (243, 617, 215, -2), 62: (248, 635, 205, 0), 63: (245, 648, 190, 0),
    64: (235, 648, 180, 0), 65: (221, 643, 170, 0), 66: (216, 635, 170, 0), 67: (211, 625, 165, 2),
    69: (202, 619, 160, 7), 70: (204, 625, 155, 7), 71: (207, 635, 155, 10), 72: (210, 640, 155, 11),
    73: (216, 638, 152, 12), 74: (224, 636, 152, 10), 75: (228, 630, 152, 12), 76: (232, 627, 150, 11),
    77: (237, 623, 145, 11), 78: (248, 622, 140, 10), 79: (258, 625, 140, 11), 80: (262, 625, 140, 10),
    81: (275, 621, 145, 6), 82: (281, 615, 140, 5), 83: (292, 614, 140, 3), 84: (300, 615, 140, 0),
}
FIN = (305, 615, 145, 0)
RADIUS = 6  # flou gaussien, en pixels de l'image 480 × 854
PAD_W, BAND_H = 40, 40  # marge autour du texte (longueur) et hauteur de la bande floutée


def box_at(idx):
    ks = sorted(KEYS)
    if idx <= ks[0]:
        return KEYS[ks[0]]
    if idx >= ks[-1]:
        return KEYS[ks[-1]]
    for a, b in zip(ks, ks[1:]):
        if a <= idx <= b:
            u = (idx - a) / (b - a)
            return tuple(KEYS[a][j] + (KEYS[b][j] - KEYS[a][j]) * u for j in range(4))


def mask_for(size, box, k, feather):
    """Bande arrondie adoucie, tournée, à l'échelle k (taille de l'image / 480)."""
    cx, cy, L, ang = box
    w, h = (L + PAD_W) * k, (BAND_H + (6 if abs(ang) > 12 else 0)) * k
    side = int(w * 1.2) + 8
    big = Image.new('L', (side, side), 0)
    d = ImageDraw.Draw(big)
    bx = by = side / 2
    d.rounded_rectangle((bx - w / 2, by - h / 2, bx + w / 2, by + h / 2), radius=h / 2, fill=255)
    big = big.rotate(-ang, resample=Image.BICUBIC).filter(ImageFilter.GaussianBlur(feather))
    m = Image.new('L', size, 0)
    m.paste(big, (int(round(cx * k - bx)), int(round(cy * k - by))))
    return m


def blur_image(path, box, k, preview=None):
    im = Image.open(path)
    alpha = im.getchannel('A') if im.mode == 'RGBA' else None
    rgb = im.convert('RGB')
    m = mask_for(rgb.size, box, k, 3 * k)
    if preview:
        out = rgb.copy()
        red = Image.new('RGB', rgb.size, (255, 0, 0))
        out.paste(red, (0, 0), m.point(lambda v: v // 3))
        out.save(preview, quality=85)
        return
    soft = rgb.filter(ImageFilter.GaussianBlur(RADIUS * k))
    rgb.paste(soft, (0, 0), m)
    if alpha is not None:
        rgb = rgb.convert('RGBA')
        rgb.putalpha(alpha)
        rgb.save(path, 'WEBP', quality=90, alpha_quality=90, method=6)
    else:
        rgb.save(path, 'WEBP', quality=80, method=6)


def to_screen(box, scale):
    """Boîte 480 × 854 → écran 1080 × 1920 (image × 2,25 décalée de −0,75, puis × scale autour de (540, 807,03))."""
    cx, cy, L, ang = box
    X, Y = cx * 2.25, cy * 2.25 - 0.75
    X, Y = 540 + (X - 540) * scale, 807.03 + (Y - 807.03) * scale
    k = 2.25 * scale
    return (X / k, Y / k, L, ang), k


def main():
    preview = None
    if '--apercu' in sys.argv:
        preview = sys.argv[sys.argv.index('--apercu') + 1]
        os.makedirs(preview, exist_ok=True)
    pv = lambda name: os.path.join(preview, name + '.jpg') if preview else None
    n = 0
    for idx in range(54, 85):
        blur_image(os.path.join(ASSETS, 'hero', f'f{idx:03d}.webp'), box_at(idx), 1, pv(f'f{idx:03d}'))
        n += 1
    blur_image(os.path.join(ASSETS, 'hero', 'fin.webp'), FIN, 1, pv('fin'))
    blur_image(os.path.join(ASSETS, 'hero', 'fin-personne.webp'), box_at(84), 1, pv('fin-personne'))
    man = json.load(open(os.path.join(ASSETS, 'entree.json')))
    for e in man:
        b, k = to_screen(box_at(e['idx']), e['scale'])
        blur_image(os.path.join(ASSETS, 'entree', e['file'] + '.webp'), b, k, pv(e['file']))
        n += 1
    print('marque floutée sur', n + 2, 'images' + (' (aperçu)' if preview else ''))


main()
