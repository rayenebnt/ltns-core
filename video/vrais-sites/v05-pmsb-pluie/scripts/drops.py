# Lit le journal des tirages de capture-pluie.mjs et en déduit les gouttes de pluie (WaterSurface.tsx, frame()) :
#   x = r1 * aspect, y = r2 (repère du canvas, y vers le haut), force = 0,85 + r3 * 0,55
#   python3 -I drops.py <rlog.json> [sortie.json|-] [largeur hauteur du canvas en px de la capture, 1080 1920 par défaut]
import json, sys
src = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != '-' else None
W = float(sys.argv[3]) if len(sys.argv) > 3 else 1080
H = float(sys.argv[4]) if len(sys.argv) > 4 else 1920
d = json.load(open(src))
calls = [c for c in d['log'] if 'Object.frame' in c[3]]
drops = []
i = 0
while i + 3 < len(calls):
    a, b, c, e = calls[i:i + 4]
    if abs(a[0] - e[0]) < 1:
        drops.append({'ms': a[0], 'x': a[1], 'y': b[1], 's': 0.85 + c[1] * 0.55,
                      'px': round(a[1] * W, 1), 'py': round((1 - b[1]) * H, 1)})
        i += 4
    else:
        i += 1
# image de la capture où la goutte apparaît : l'image f est prise après le pas (startMs + f*dt, startMs + (f+1)*dt]
import math
dt = 1000 / d['fps']
for x in drops:
    f = math.ceil((x['ms'] - d['startMs']) / dt - 1e-6) - 1
    x['frame'] = f
    x['clip'] = round(f / d['fps'], 4)   # secondes dans la capture (image 0 = 0)
if out:
    json.dump({'seed': d['seed'], 'fps': d['fps'], 'drops': drops}, open(out, 'w'), indent=1)
for x in drops:
    print(f"{x['clip']:7.3f}s  px={x['px']:7.1f} py={x['py']:7.1f}  force={x['s']:.2f}")
