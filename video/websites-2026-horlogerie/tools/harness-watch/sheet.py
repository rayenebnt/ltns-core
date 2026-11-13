# usage: python3 sheet.py <dir> <out.jpg> <cols> <thumbW> [glob]
import sys, glob, os
from PIL import Image, ImageDraw, ImageFont
d, out, cols, tw = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
pat = sys.argv[5] if len(sys.argv) > 5 else '*.png'
files = sorted(glob.glob(os.path.join(d, pat)))
ims = [Image.open(f).convert('RGB') for f in files]
th = max(int(im.size[1] * tw / im.size[0]) for im in ims)
rows = (len(ims) + cols - 1) // cols
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14)
except Exception:
    font = ImageFont.load_default()
sheet = Image.new('RGB', (cols * tw + (cols + 1) * 6, rows * (th + 6) + 6), (20, 20, 24))
dr = ImageDraw.Draw(sheet)
for i, (f, im) in enumerate(zip(files, ims)):
    r, c = divmod(i, cols)
    x = 6 + c * (tw + 6); y = 6 + r * (th + 6)
    h = int(im.size[1] * tw / im.size[0])
    sheet.paste(im.resize((tw, h), Image.LANCZOS), (x, y))
    name = os.path.splitext(os.path.basename(f))[0]
    dr.rectangle([x, y, x + 8 + 8 * len(name), y + 18], fill=(0, 0, 0))
    dr.text((x + 4, y + 1), name, fill=(255, 230, 0), font=font)
sheet.save(out, quality=88)
print(out, sheet.size, len(ims))
