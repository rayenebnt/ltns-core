# contact sheet: python3 tools/harness-studio/sheet.py <dir> [cols] [order...]
import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1]; cols = int(sys.argv[2]) if len(sys.argv) > 2 else 3
names = sys.argv[3:] or sorted(f[:-4] for f in os.listdir(d) if f.endswith('.png'))
ims = [Image.open(os.path.join(d, n + '.png')).convert('RGB') for n in names]
w, h = ims[0].size; s = 0.5 if w > 700 else 1.0
tw, th = int(w * s), int(h * s); rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (tw + 6) + 6, rows * (th + 6) + 6), (20, 20, 24))
dr = ImageDraw.Draw(sheet)
for i, (n, im) in enumerate(zip(names, ims)):
    x, y = 6 + (i % cols) * (tw + 6), 6 + (i // cols) * (th + 6)
    sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y))
    dr.rectangle([x, y, x + 8 * len(n) + 8, y + 16], fill=(0, 0, 0)); dr.text((x + 4, y + 2), n, fill=(255, 220, 0))
sheet.save(os.path.join(d, 'sheet.jpg'), quality=88)
print(os.path.join(d, 'sheet.jpg'))
