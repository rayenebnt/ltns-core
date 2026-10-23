#!/usr/bin/env bash
# Toutes les captures de la vidéo 06, l'une après l'autre (≈ 35 min avec SwiftShader sur 4 cœurs).
#   bash capture-all.sh <dossier brut> [jobs…]
# Le site RBTI doit être servi en local sur le port 8786 (lecture seule, rien n'est modifié) :
#   python3 -m http.server 8786 --bind 127.0.0.1 --directory /home/user/rayenebnt/rbti
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
RAW="${1:?dossier brut}"; shift || true
JOBS="${*:-morph macro mark cta hero gates rail field}"
mkdir -p "$RAW"
for j in $JOBS; do
  echo "=== $j"
  node "$HERE/capture.mjs" "$j" "$RAW" > "$RAW/$j.log" 2>&1 || { echo "échec $j (voir $RAW/$j.log)"; exit 1; }
  tail -1 "$RAW/$j.log"
done
