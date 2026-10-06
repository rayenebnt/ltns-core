# Vidéo TikTok « services LTNS° »

Vidéo verticale 1080 × 1920 (≈ 40 s) dans le style « avatar autocollant » :
un personnage cartoon qui change de pose à chaque phrase, des sous-titres mot à mot
avec le mot clé en orange, et des encarts animés (cartes, prix, captures de réalisations,
fonds à motifs). Rien n'est publié sur le site : ce dossier sert seulement à fabriquer la vidéo.

| Fichier | Rôle |
|---|---|
| `tiktok.html` | La vidéo : textes, mise en scène (`SENTENCES`, `BEATS`) et rendu de chaque instant |
| `avatar.js` | L'avatar vectoriel : poses, expressions, bouche synchronisée |
| `preview.html` | Planche de toutes les poses (`?mode=expr` pour les expressions) |
| `render.mjs` | Fabrique le MP4 image par image, avec l'habillage sonore et la voix |
| `sfx.py` | Habillage sonore synthétisé (pop, clic, souffle, pulsation) |
| `sync-voice.py` | Cale la vidéo sur la voix off ElevenLabs |
| `voice/` | Les phrases de la voix off, `01.mp3` à `09.mp3` (à fournir) |

## Voix off ElevenLabs

Générez **une phrase par fichier**, avec une voix masculine (de préférence la même que
le film du site), et nommez-les `01.mp3` à `09.mp3` dans `voice/` :

| Fichier | Texte |
|---|---|
| `01.mp3` | Ton entreprise est invisible sur internet ? |
| `02.mp3` | Moi, c'est LTNS. Je crée des sites, des logiciels et des applis, sur mesure. |
| `03.mp3` | Tu es artisan ou indépendant ? Un site vitrine, livré en deux semaines, dès 490 euros. |
| `04.mp3` | Tu veux vendre en ligne ? Ta boutique, avec paiement et espace client. |
| `05.mp3` | Tu perds des heures sur Excel ? Je crée ton logiciel de gestion : devis, factures, clients. |
| `06.mp3` | Et même ton appli mobile, sur iPhone et Android. |
| `07.mp3` | Le prix est fixé avant de commencer. Zéro surprise. |
| `08.mp3` | Le devis est gratuit, réponse en 48 heures. |
| `09.mp3` | Lien dans la bio. Le web, au bon degré. |

Conseils ElevenLabs : ton énergique et souriant, stabilité autour de 40 %,
« LTNS » se prononce lettre par lettre (écrivez « L.T.N.S. » si la voix bute).

Puis :

```bash
python3 sync-voice.py      # cale sous-titres, poses, encarts et bouche sur la voix
```

Si vous changez un texte, changez-le aussi dans `SENTENCES` (tiktok.html) pour les sous-titres.

## Fabriquer la vidéo

```bash
# depuis la racine du dépôt
python3 -m http.server 8765 --directory . &
cd video/tiktok-services
node render.mjs            # → ltns-tiktok-services.mp4
```

Aperçu en direct : http://localhost:8765/video/tiktok-services/tiktok.html
(`?audio` pour l'écouter avec la voix, `?t=12.5` pour figer un instant).

Il faut Playwright (`npm i -D playwright` puis `npx playwright install chromium`) et ffmpeg.
