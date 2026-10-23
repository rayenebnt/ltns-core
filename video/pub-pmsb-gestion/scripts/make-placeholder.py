"""Photo PROVISOIRE (1080 × 1920) en attendant la vraie photo de l'ordinateur.

    python3 -I make-placeholder.py <sortie.jpg>

Pièce grise, ordinateur portable sombre vu d'en haut par un téléphone tenu à la main, écran vert
pur (0, 177, 64) en perspective, et la mention PLACEHOLDER bien visible. Rien n'imite une vraie
photo : c'est un gabarit pour caler le montage (detect-screen.py retrouve l'écran vert).
"""
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = sys.argv[1]
W, H = 1080, 1920
GREEN = (0, 177, 64)
y, x = np.mgrid[0:H, 0:W].astype(np.float32)

# Mur gris, une fenêtre floue en haut à gauche, un bureau gris en bas
img = np.zeros((H, W, 3), np.float32)
img[:] = 0.42 + 0.10 * (1 - y / H)[..., None]
win = np.exp(-(((x - 230) / 260) ** 2 + ((y - 360) / 330) ** 4))
img += win[..., None] * np.array([0.33, 0.34, 0.33])
desk = y > 1180 + 0.08 * (x - 540)
img[desk] = img[desk] * 0.55 + np.array([0.20, 0.19, 0.18])
im = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))
d = ImageDraw.Draw(im)

# Écran (quadrilatère en perspective : un peu plus étroit en haut, l'écran est incliné vers l'arrière)
TL, TR, BR, BL = (78, 610), (1006, 598), (1052, 1196), (40, 1226)
bez = 18
lid = [(TL[0] - bez, TL[1] - bez), (TR[0] + bez, TR[1] - bez), (BR[0] + bez + 4, BR[1] + bez + 10), (BL[0] - bez - 4, BL[1] + bez + 10)]
d.polygon(lid, fill=(28, 29, 32))
d.polygon([TL, TR, BR, BL], fill=GREEN)
# Charnière et clavier en perspective
deck = [(BL[0] - 30, BL[1] + 34), (BR[0] + 30, BR[1] + 26), (W + 220, H + 40), (-220, H + 40)]
d.polygon(deck, fill=(150, 152, 156))
for r in range(6):
    t0, t1 = r / 6, (r + 0.78) / 6
    ya, yb = BL[1] + 70 + t0 * 520, BL[1] + 70 + t1 * 520
    spread = lambda yy: (yy - BL[1]) * 0.42
    for c in range(13):
        u0, u1 = c / 13 + 0.006, (c + 0.86) / 13
        xa0 = 70 - spread(ya) + u0 * (940 + 2 * spread(ya)); xa1 = 70 - spread(ya) + u1 * (940 + 2 * spread(ya))
        xb0 = 70 - spread(yb) + u0 * (940 + 2 * spread(yb)); xb1 = 70 - spread(yb) + u1 * (940 + 2 * spread(yb))
        d.polygon([(xa0, ya), (xa1, ya), (xb1, yb), (xb0, yb)], fill=(34, 35, 38))
im = im.filter(ImageFilter.GaussianBlur(0.8))
d = ImageDraw.Draw(im)
# Repasse l'écran net (le vert doit rester pur pour la détection)
d.polygon([TL, TR, BR, BL], fill=GREEN)


def font(size):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf']:
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default()


# Mention PLACEHOLDER (sur le mur et sur le clavier, jamais sur le vert)
for text, size, yy, col in [('PLACEHOLDER', 92, 1480, (255, 214, 0)), ('photo provisoire : mettre la vraie photo', 34, 1604, (255, 255, 255)), ('dans assets/photo.jpg puis lancer detect-screen.py', 34, 1668, (255, 255, 255))]:
    f = font(size)
    w = d.textlength(text, font=f)
    box = (W / 2 - w / 2 - 24, yy - 14, W / 2 + w / 2 + 24, yy + size + 14)
    d.rectangle(box, fill=(0, 0, 0))
    d.text((W / 2 - w / 2, yy), text, font=f, fill=col)
f = font(40)
d.text((40, 200), 'PLACEHOLDER', font=f, fill=(255, 214, 0))
im.save(OUT, quality=92)
print('ok', OUT)
