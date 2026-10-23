#!/usr/bin/env bash
# Construit assets/ (WebM VP9 + images) à partir des captures. Chromium de Playwright ne lit pas le H.264 :
# toutes les séquences passent en VP9, avec une image clé toutes les 10 images (recherche rapide et exacte).
#   FR=<dossier des images capturées> VS=<clips MP4 de l'exploration> ST=<images fixes> bash build-assets.sh
set -euo pipefail
HERE=$(cd "$(dirname "$0")/.." && pwd)
SP=/tmp/claude-0/-home-user/353cf8ed-4309-504e-b0cc-6e0e4e783db7/scratchpad/v02
FR=${FR:-$SP/frames}
ST=${ST:-$SP/stills}
VS=${VS:-/tmp/claude-0/-home-user-ltns-core/353cf8ed-4309-504e-b0cc-6e0e4e783db7/scratchpad/vrais-sites/pmsb-site/clips}
A=$HERE/assets
mkdir -p "$A"
# Étalonnage : le shader nettoie la pierre en dégradé large ; on creuse l'écart sale / propre, sans rien ajouter
GRADE="curves=all='0/0 0.1/0.05 0.22/0.16 0.4/0.56 0.7/0.88 1/1'"
VP9=(-c:v libvpx-vp9 -b:v 0 -crf 30 -row-mt 1 -g 10 -keyint_min 10 -pix_fmt yuv420p -an -deadline good -cpu-used 2)
enc() { ffmpeg -v error -y "$@"; }

# 1. Héros ordinateur (1440 x 2560 -> 1080 x 1920), 30 i/s, 1,6 s -> 12,8 s après le chargement
enc -framerate 30 -i "$FR/hero/f%04d.jpg" -vf "scale=1080:1920:flags=lanczos,$GRADE" "${VP9[@]}" "$A/hero.webm"
cp "$FR/hero/ring.json" "$A/ring.json"
# 1b. Gros plan (160 %) : même images, région MACRO de la vidéo 1080 x 1920 rendue depuis la source 1440 x 2560
#     MACRO = x y l h en px de la vidéo 1080 ; images MACRO_FROM .. +MACRO_N
read -r MX MY MW MH <<<"${MACRO:-405 0 675 1200}"
MACRO_FROM=${MACRO_FROM:-96}; MACRO_N=${MACRO_N:-44}
S=$(python3 -c "print(1440/1080)")
CX=$(python3 -c "print(round($MX*$S))"); CY=$(python3 -c "print(round($MY*$S))"); CW=$(python3 -c "print(round($MW*$S))"); CH=$(python3 -c "print(round($MH*$S))")
enc -framerate 30 -start_number "$MACRO_FROM" -i "$FR/hero/f%04d.jpg" -frames:v "$MACRO_N" -vf "crop=$CW:$CH:$CX:$CY,scale=1080:1920:flags=lanczos,$GRADE" "${VP9[@]}" "$A/hero-macro.webm"
echo "{\"x\":$MX,\"y\":$MY,\"w\":$MW,\"h\":$MH,\"from\":$MACRO_FROM,\"n\":$MACRO_N}" > "$A/hero-macro.json"

# 2. Ouverture ordinateur à 120 i/s (1,5 s -> 3,7 s) : lettres, pierres au ralenti, assises
enc -framerate 120 -i "$FR/intro120/f%04d.jpg" -vf "$GRADE" "${VP9[@]}" "$A/intro120.webm"

# 3. Préchargeur mobile (3 px/px CSS) : on garde le bloc PMSB + compteur (bas de l'écran)
enc -framerate 30 -i "$FR/preloader/f%04d.jpg" -frames:v 50 -vf "crop=1170:600:0:1932,scale=1080:-2:flags=lanczos,$GRADE" "${VP9[@]}" "$A/preloader.webm"

# 4. Ordinateur pleine page (écran partagé)
enc -framerate 30 -i "$FR/desk/f%04d.jpg" -vf "$GRADE" "${VP9[@]}" "$A/desk.webm"

# 5. Lumière qui se promène seule (mobile, interface masquée), 24 s à 10 i/s
enc -framerate 10 -i "$FR/murlong/f%04d.jpg" -vf "scale=780:1688,$GRADE" "${VP9[@]}" "$A/mur-long.webm"

# 6. Clips mobiles de l'exploration (H.264 -> VP9)
enc -ss 7.0 -i "$VS/accueil-intro-mobile.mp4" -t 2.0 -vf "$GRADE" "${VP9[@]}" "$A/phone-hero.webm"
enc -i "$VS/accueil-scroll-mobile.mp4" -t 1.6 -vf "$GRADE" "${VP9[@]}" "$A/scroll.webm"
enc -i "$VS/realisations-avant-apres-1-mobile.mp4" -t 5.2 "${VP9[@]}" "$A/compare.webm"

# 7. Images fixes : vignettes du rail et pied de page (bas du pied de page, coordonnées floutées à la source)
for s in pignon cheminee poncage-marbre ravalement-brique; do
  enc -i "$ST/rail-$s.png" -vf "scale=558:-2:flags=lanczos" -q:v 3 "$A/rail-$s.jpg"
done
# numéro de rue sur la photo « brique » : flouté
python3 -I -c "
from PIL import Image, ImageFilter
p = '$A/rail-ravalement-brique.jpg'
im = Image.open(p); box = (326, 570, 366, 604)
im.paste(im.crop(box).filter(ImageFilter.GaussianBlur(6)), box); im.save(p, quality=90)"
enc -i "$ST/pied-de-page.png" -vf "crop=1170:3140:0:4300,scale=780:-2:flags=lanczos" -q:v 3 "$A/pied-de-page.jpg"
du -sh "$A"; ls -la "$A"
