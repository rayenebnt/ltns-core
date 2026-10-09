# TikTok « Devine le prix » — Épisode 05

Même garage (fictif : « Garage du Centre »), trois sites, un par formule LTNS° :

| Site | Formule (page Tarifs) | Ce qu'on voit |
|---|---|---|
| 1 | Essentiel · à partir de 490 € | Une seule page : numéro, horaires, formulaire |
| 2 | Pro · à partir de 990 € | Plusieurs pages, animations, textes modifiés en direct |
| 3 | Sur-mesure · prix fixé avant de commencer | Rendez-vous en ligne, suivi de la réparation, SMS « voiture prête » |

Les trois sites tournent dans un carrousel 3D. Des étiquettes « ? € » restent visibles tout du long,
le bandeau rappelle « RÉPONSE À LA FIN ». Un compte à rebours 3, 2, 1 laisse deviner,
puis les étiquettes se retournent une à une. La fin revient aux trois « ? € » : la vidéo boucle.
Les prix doivent rester alignés sur `src/components/Tarifs.jsx`.

| Fichier | Rôle |
|---|---|
| `tiktok.html` | La vidéo : textes (`SENTENCES`), poses (`POSES`), étapes calées sur les mots (`CUES`) |
| `script-elevenlabs.txt` | Le texte à coller dans Eleven v4, en un seul fichier (`[long pause]` entre les phrases) |
| `voice/` | La voix découpée en phrases, `01.mp3` à `09.mp3` |

Les prix sont écrits en chiffres à l'écran mais dits en toutes lettres : `SPOKEN` dans `tiktok.html`
sert à répartir le temps entre les mots. Les mots sont répartis sur le temps de parole réel,
silences exclus, ce qui cale le compte à rebours sur la voix.

## Fabriquer l'épisode

```bash
# depuis la racine du dépôt
python3 -m http.server 8765 --directory . &
python3 video/commun/sync-voice.py video/tiktok-episode-05
node video/commun/render.mjs video/tiktok-episode-05   # → video/tiktok-episode-05/ltns-tiktok-episode-05.mp4
```

## Publication

**Légende**

> Même garage, trois sites. Lequel coûte 490 € ? Réponse à la fin 👀
> Commente ton métier : je te dis lequel il te faut.

**Hashtags** : `#siteinternet #garage #prix #entrepreneur #devinette`

**Commentaire à épingler** : « Ton pronostic avant la réponse : 1, 2 ou 3 ? 👇 »
