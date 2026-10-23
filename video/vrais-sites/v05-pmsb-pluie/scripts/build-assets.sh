#!/usr/bin/env bash
# Construit assets/ (WebM VP9 + JSON) à partir des images capturées par capture-*.mjs.
# Chromium de Playwright ne lit pas le H.264 : tout passe en VP9, image clé toutes les 10 images (recherche exacte).
#   FR=<dossier des images> bash build-assets.sh        (ONLY_JSON=1 : refait seulement les JSON, sans réencoder)
set -euo pipefail
HERE=$(cd "$(dirname "$0")/.." && pwd)
S=$HERE/scripts
FR=${FR:-/tmp/claude-0/-home-user/353cf8ed-4309-504e-b0cc-6e0e4e783db7/scratchpad/v05/frames}
A=$HERE/assets
mkdir -p "$A"
VP9=(-c:v libvpx-vp9 -b:v 0 -crf ${CRF:-30} -row-mt 1 -g 10 -keyint_min 10 -pix_fmt yuv420p -an -deadline good -cpu-used 2)
enc() { ffmpeg -v error -y "$@"; }

# Chaque capture est encodée en morceaux de CHUNK images (assets/<nom>-NN.webm, liste dans assets/videos.json) :
# une seule grosse vidéo chargée en blob garde une requête ouverte et bloque l'attente « networkidle » de render.mjs.
CHUNK=${CHUNK:-90}
: > "$A/.videos"
# seqenc NOM DOSSIER PREMIÈRE PAS I/S [FILTRE] [IMAGES PAR MORCEAU]
seqenc() {
  local name=$1 dir=$2 start=$3 step=$4 fps=$5 vf=${6:-null} chunk=${7:-$CHUNK}
  local tmp; tmp=$(mktemp -d)
  local n=0 f=$start
  while [ -f "$dir/f$(printf %04d $f).jpg" ]; do ln -s "$dir/f$(printf %04d $f).jpg" "$tmp/$(printf %05d $n).jpg"; n=$((n + 1)); f=$((f + step)); done
  [ -n "${ONLY_JSON:-}" ] || rm -f "$A/$name"-[0-9][0-9].webm
  local c=0 k=0 files=""
  while [ $k -lt $n ]; do
    local out="$name-$(printf %02d $c).webm"
    [ -n "${ONLY_JSON:-}" ] || enc -framerate "$fps" -start_number $k -i "$tmp/%05d.jpg" -frames:v "$chunk" -vf "$vf" -r "$fps" "${VP9[@]}" "$A/$out"
    files="$files $out"; c=$((c + 1)); k=$((k + chunk))
  done
  echo "$name $fps $chunk $n$files" >> "$A/.videos"
  rm -rf "$tmp"
  echo "$name : $n images, $c morceaux"
}

# Pluie plein cadre : capture 60 i/s de 0 à 17,2 s, images enregistrées à partir de 2,6 s (n° 156).
# La vidéo garde une image sur deux (30 i/s) : image n de la séquence « pluie » = image 156 + 2n de la capture.
P0=156
# Étalonnage léger de l'eau (membrane très sombre) : on relève les tons moyens, sans rien ajouter ni déplacer
GRADE="curves=all='0/0 0.12/0.14 0.4/0.52 1/1'"
# Le filet du bloc de texte masqué (rangées 1647-1648, très pâle) est recouvert par les 4 rangées juste en dessous (fond uni)
seqenc pluie "$FR/pluie" $P0 2 30 "split[a][b];[b]crop=1080:4:0:1650[s];[a][s]overlay=0:1646,$GRADE"
# Gros plan au ralenti : région MACRO (x y l h, px de la capture) agrandie au plein cadre, 60 i/s, à partir de MACRO_FROM s
read -r MX MY MW MH <<<"${MACRO:-220 70 640 1138}"
MACRO_FROM=${MACRO_FROM:-15.4}
MF=$(python3 -c "print(round($MACRO_FROM*60))")
seqenc pluie-macro "$FR/pluie" "$MF" 1 60 "crop=$MW:$MH:$MX:$MY,scale=1080:1920:flags=lanczos,$GRADE" 60
# Le vrai titre « ÉTANCHÉITÉ » (PNG transparent), recadré
python3 -I - "$FR/mot/mot.png" "$A/mot.png" "$A/mot.json" <<'PY'
import sys, json
from PIL import Image
src, out, js = sys.argv[1:4]
im = Image.open(src).convert('RGBA')
# seulement le mot (le filet sous le titre, y ≈ 1647, reste hors champ comme le reste du texte)
bb = im.getchannel('A').crop((0, 0, im.width, 1200)).getbbox()
x0, y0, x1, y1 = max(0, bb[0] - 8), max(0, bb[1] - 8), min(im.width, bb[2] + 8), min(im.height, bb[3] + 8)
im.crop((x0, y0, x1, y1)).save(out, optimize=True)
json.dump({'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0}, open(js, 'w'))
print('mot', x0, y0, x1, y1)
PY
# Page mobile entière (écran du téléphone), 30 i/s
seqenc page "$FR/page" 0 1 30
# Isolation : démonstration (coupe + bascule + couches), 30 i/s
seqenc iso "$FR/iso" 0 1 30
# Ravalement : les quatre blocs
for b in brique pierre platre impermeabilisation; do seqenc "$b" "$FR/blocs/$b" 0 1 30; done
python3 -I - "$A" <<'PY'
import json, sys
A = sys.argv[1]
m = {}
for line in open(f'{A}/.videos'):
    name, fps, chunk, n, *files = line.split()
    m[name] = {'fps': int(fps), 'chunk': int(chunk), 'frames': int(n), 'files': files}
json.dump(m, open(f'{A}/videos.json', 'w'), indent=1)
PY
rm -f "$A/.videos"

# Données : gouttes journalisées (instants et positions réels), mise en page de la démonstration
python3 -I "$S/drops.py" "$FR/pluie/rlog.json" "$FR/pluie/drops.json" 1080 1920 > /dev/null
python3 -I "$S/drops.py" "$FR/page/rlog.json" "$FR/page/drops.json" 780 1552 > /dev/null
python3 -I - "$FR" "$A" "$P0" "$MACRO_FROM" "$MX" "$MY" "$MW" "$MH" <<'PY'
import sys, json
FR, A = sys.argv[1], sys.argv[2]
P0, MFROM, MX, MY, MW, MH = int(sys.argv[3]), float(sys.argv[4]), *map(float, sys.argv[5:9])
D = json.load(open(f'{FR}/pluie/drops.json'))['drops']
off = P0 / 60
# Image 0 : la grosse goutte proche du centre tombe 0,35 s après (graine 5 : x ≈ 561, y ≈ 669)
big = min([d for d in D if 380 <= d['px'] <= 720 and 560 <= d['py'] <= 1000 and d['s'] >= 1.15 and d['clip'] > off + 9.0],
          key=lambda d: d['clip'])
T0 = round((big['clip'] - off - 0.35) * 30) / 30
drops = []
last = -9
for d in D:
    t = round(d['clip'] - off, 4)
    if t < -3: continue
    x = {'t': t, 'px': d['px'], 'py': d['py'], 's': round(d['s'], 3)}
    rel = t - T0
    # gouttes soulignées pendant l'accroche : la grosse, puis une par seconde environ, plutôt au centre
    if d is big: x['big'] = True; x['accent'] = True; last = rel
    elif 0.6 <= rel <= 3.0 and 300 <= d['py'] <= 1250 and 250 <= d['px'] <= 850 and d['s'] >= 0.9 and rel - last >= 0.45:
        x['accent'] = True; last = rel
    if -1.0 <= rel <= -0.25 and 300 <= d['px'] <= 800 and 560 <= d['py'] <= 1150: x['loop'] = True
    drops.append(x)
n = 0
import subprocess
VID = json.load(open(f'{A}/videos.json'))
dur = VID['pluie']['frames'] / 30
json.dump({'fps': 30, 'T0': T0, 'dur': round(dur, 3), 'big': {'px': big['px'], 'py': big['py']}, 'drops': drops}, open(f'{A}/pluie.json', 'w'), indent=0)
print('pluie T0', T0, 'grosse goutte', big['px'], big['py'], 'accent', [(round(x['t'] - T0, 2), x['px'], x['py']) for x in drops if x.get('accent')], 'boucle', [(round(x['t'] - T0, 2), x['px'], x['py']) for x in drops if x.get('loop')])
# Gros plan : gouttes dans le repère agrandi
k = 1080 / MW
mdur = VID['pluie-macro']['frames'] / 60
md = [{'t': round(d['clip'] - MFROM, 4), 'px': round((d['px'] - MX) * k, 1), 'py': round((d['py'] - MY) * k, 1)} for d in D
      if d['clip'] - MFROM > -1.5 and MX - 60 < d['px'] < MX + MW + 60 and MY - 60 < d['py'] < MY + MH + 60]
json.dump({'fps': 60, 'dur': round(mdur, 3), 'scale': k, 'rect': [MX, MY, MW, MH], 'from': MFROM, 'drops': md}, open(f'{A}/pluie-macro.json', 'w'), indent=0)
# Page mobile
G = json.load(open(f'{FR}/page/drops.json'))['drops']
pdur = VID['page']['frames'] / 30
json.dump({'fps': 30, 'dur': round(pdur, 3), 'drops': [{'t': d['clip'], 'px': d['px'], 'py': d['py']} for d in G if d['clip'] > -1.6]}, open(f'{A}/page.json', 'w'), indent=0)
# Isolation : boîtes en px de la vidéo (2 px par px CSS, origine au coin du cadre enregistré)
L = json.load(open(f'{FR}/iso/layout.json'))
cx, cy, s = L['clip']['x'], L['clip']['y'], L['dpr']
box = lambda b: [round((b[0] - cx) * s, 1), round((b[1] - cy) * s, 1), round(b[2] * s, 1), round(b[3] * s, 1)]
tg = [box(b) for b in L['toggle']]
x0 = tg[0][0] - 22; y0 = tg[0][1] - 22; x1 = tg[1][0] + tg[1][2] + 22; y1 = tg[0][1] + tg[0][3] + 22
idur = VID['iso']['frames'] / 30
json.dump({'fps': 30, 'dur': round(idur, 3), 'switchAt': L['switchAt'], 'toggle': tg, 'toggleBox': [x0, y0, x1 - x0, y1 - y0],
           'layers': [box(b) for b in L['layers']], 'sides': [box(b) for b in L['sides']], 'viewport': box(L['viewport'])}, open(f'{A}/iso.json', 'w'), indent=1)
PY
du -sh "$A"; ls -la "$A"
