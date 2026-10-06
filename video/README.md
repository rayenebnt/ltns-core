# Vidéos TikTok LTNS°

Vidéos verticales 1080 × 1920 fabriquées en HTML puis rendues en MP4.
Rien ici n'est publié sur le site.

| Dossier | Contenu |
|---|---|
| `commun/` | L'avatar (`avatar.js`), les polices, le rendu (`render.mjs`), l'habillage sonore (`sfx.py`), le calage de la voix (`sync-voice.py`), la planche des poses (`preview.html`) |
| `tiktok-episode-01/` | « 3 signes que ton site fait fuir tes clients » |
| `IDEES.md` | Les idées d'épisodes, publiés et à venir |

Chaque épisode contient son `tiktok.html` (textes, mise en scène), sa voix (`voice/01.mp3`…)
et les fichiers produits par `sync-voice.py` (`voice.mp3`, `timing.json`, `envelope.json`).

## Fabriquer un épisode

```bash
# depuis la racine du dépôt
python3 -m http.server 8765 --directory . &
python3 video/commun/sync-voice.py video/tiktok-episode-01      # après avoir déposé la voix
node video/commun/render.mjs video/tiktok-episode-01            # → video/tiktok-episode-01/ltns-tiktok-episode-01.mp4
```

Aperçu en direct : http://localhost:8765/video/tiktok-episode-01/tiktok.html
(`?audio` pour l'écouter avec la voix, `?t=12.5` pour figer un instant).
Planche des poses : http://localhost:8765/video/commun/preview.html

Il faut Playwright (`npm i -D playwright` puis `npx playwright install chromium`) et ffmpeg.

L'avatar est sans barbe par défaut ; l'épisode 01 garde la barbe d'origine
(`LTNSAvatar.defaults.beard = true` dans son `tiktok.html`).
