#!/usr/bin/env bash
# Paysages calculés par le vrai render.c de la maquette Swatter TV (copie hors du dépôt, jamais modifié).
#   bash scripts/render-landscapes.sh [dossier de travail]
# Sortie : <travail>/out/*.ppm (puis prepare-assets.py les convertit en WebP / PNG dans assets/render/)
# Durée : ≈ 6 s par image 1080 × 1920 sur 4 cœurs, ≈ 6 min en tout.
set -euo pipefail
SRC=/home/user/rayenebnt/swatter-tv/maquette/outils/render.c
WORK=${1:-/tmp/v03-render}
mkdir -p "$WORK/out/dolly"
cp "$SRC" "$WORK/render.c"
gcc -O3 -fopenmp "$WORK/render.c" -lm -o "$WORK/render"
R="$WORK/render"
# Même caméra et même graine pour les 8 préréglages : même sommet, 8 lumières
CAM="0 150 0 0 600 9000 55"
for k in 0 1 2 3 4 5 6 7; do
  "$R" $k 7 1080 1920 $CAM "$WORK/out/preset$k-1080x1920.ppm"
done
# Le préréglage 0 en 2160 × 3840 (même cadrage) : la poussée macro de 1,5 à 2 s reste nette (≈ 35 s)
"$R" 0 7 2160 3840 $CAM "$WORK/out/preset0-2160x3840.ppm"
# Le préréglage 0 en basse définition (vrais rendus, pas des réductions)
for s in "540 960" "270 480" "135 240" "68 120"; do
  set -- $s
  "$R" 0 7 $1 $2 $CAM "$WORK/out/preset0-$1x$2.ppm"
done
# Travelling avant (dolly) : la caméra avance de z = 1000 à z = 3820, le sommet reste fixe (PEAKD = 9000 − z)
for i in $(seq 0 47); do
  z=$(( 1000 + i * 60 ))
  "$R" 0 7 1080 1920 0 150 $z 0 600 9000 55 "$WORK/out/dolly/d$(printf %02d $i).ppm" 1700 $(( 9000 - z ))
done
echo "OK : $WORK/out"
