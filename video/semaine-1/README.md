# Semaine 1 : une vidéo par jour, nouveau format

Scripts, déroulés et légendes : [../SEMAINE-1.md](../SEMAINE-1.md). Textes ElevenLabs : [../SEMAINE-1-voix.txt](../SEMAINE-1-voix.txt).

Chaque jour a son dossier (`j1/`, `j2/`…) avec :

| Fichier | Rôle |
|---|---|
| `site.js` | Le site d'exemple du jour (entreprise fictive), partagé par les deux pages |
| `tiktok.html` | La vidéo verticale 1080 × 1920 : image 0 = site fini + titre fixe, sous-titres par phrase entière |
| `pc.html` | La version PC 1920 × 1080 à filmer : même site, même minutage, 3 s de compte à rebours, voix jouée pour caler le film |
| `voice/` | La voix découpée en phrases |

Le moteur commun est `../commun/engine.js` (minutage, sous-titres, sons, modes de lecture).

```bash
# depuis la racine du dépôt
python3 -m http.server 8765 --directory . &
python3 video/commun/sync-voice.py video/semaine-1/j1
node video/commun/render.mjs video/semaine-1/j1                                                   # vidéo verticale
node video/commun/render.mjs video/semaine-1/j1 --page=pc.html --size=1920x1080 --delay=3         # version PC à filmer
```

## Tournage des mains (version PC)

1. Lancer la version PC en plein écran sur l'ordinateur, son allumé (il sert à caler le film).
2. Téléphone en vertical, posé et immobile (pile de livres), derrière ou à côté : l'écran, le clavier et les mains, jamais le visage. Bloquer la mise au point (appui long).
3. Lancer l'enregistrement du téléphone, puis la vidéo PC. Faire les gestes indiqués pour le jour. 2 prises.
4. Envoyer le fichier en qualité d'origine (AirDrop, câble ou Drive, pas WhatsApp).
