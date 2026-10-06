# TikTok « Ton site fait fuir tes clients » — Épisode 01 · Le test

Vidéo verticale 1080 × 1920 (≈ 37 s) aux couleurs de LTNS° : un test note le site sur 100.
Chaque « signe » qui fait fuir les clients lui retire 30 points (le score passe du bleu
au rouge), puis un bon site remonte à 100. L'avatar LTNS° porte le message.
Rien n'est publié sur le site : ce dossier sert seulement à fabriquer la vidéo.

Stratégie et kit de publication : [`STRATEGIE.md`](STRATEGIE.md).

| Fichier | Rôle |
|---|---|
| `tiktok.html` | La vidéo : textes (`SENTENCES`), mise en scène (`BEATS`), score (`SCORE_KEYS`) |
| `avatar.js` | L'avatar vectoriel : poses, expressions, bouche synchronisée sur la voix |
| `preview.html` | Planche de toutes les poses (`?mode=expr` pour les expressions) |
| `render.mjs` | Fabrique le MP4 image par image, avec l'habillage sonore et la voix |
| `sfx.py` | Habillage sonore synthétisé (pop, clic, souffle, pulsation) |
| `sync-voice.py` | Cale la vidéo sur la voix off ElevenLabs |
| `voice/` | Les phrases de la voix off, `01.mp3`, `02.mp3`… (à fournir) |

## Voix off ElevenLabs

Une phrase par fichier, voix masculine, ton direct et énergique (stabilité ≈ 40 %),
fichiers `01.mp3` à `09.mp3` dans `voice/` :

| Fichier | Texte |
|---|---|
| `01.mp3` | Ton site internet fait fuir tes clients. |
| `02.mp3` | Et tu ne t'en rends même pas compte. |
| `03.mp3` | Signe numéro un : il met plus de trois secondes à s'afficher. |
| `04.mp3` | Plus de la moitié des visiteurs sont déjà partis. |
| `05.mp3` | Signe numéro deux : sur téléphone, il faut zoomer pour lire. |
| `06.mp3` | Signe numéro trois : on ne trouve pas ton numéro en cinq secondes. |
| `07.mp3` | Un seul de ces signes, et tu perds des clients tous les jours. |
| `08.mp3` | Un bon site, c'est simple : rapide, lisible, et il donne envie d'appeler. |
| `09.mp3` | Commente ton métier : je te dis ce que je changerais sur ton site. |

Puis :

```bash
python3 sync-voice.py      # cale sous-titres, poses, encarts, score et bouche sur la voix
```

Si vous changez un texte, changez-le aussi dans `SENTENCES` (tiktok.html) pour les sous-titres.

## Fabriquer la vidéo

```bash
# depuis la racine du dépôt
python3 -m http.server 8765 --directory . &
cd video/tiktok-episode-01
node render.mjs            # → ltns-tiktok-episode-01.mp4
```

Aperçu en direct : http://localhost:8765/video/tiktok-episode-01/tiktok.html
(`?audio` pour l'écouter avec la voix, `?t=12.5` pour figer un instant).

Il faut Playwright (`npm i -D playwright` puis `npx playwright install chromium`) et ffmpeg.
