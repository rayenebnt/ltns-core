# TikTok « Un site en 30 secondes » — Épisode 03

Une page blanche devient, sous les yeux, le site d'une boulangerie (« Au Pain Doré ») :
structure, couleurs, produits et prix, bouton de commande, avis, version téléphone, mise en ligne.
Le navigateur flotte en 3D, les blocs arrivent en profondeur, les cartes se retournent,
puis le navigateur pivote pour devenir un téléphone. Un chrono va de 00:00 à 00:30
pile à la mise en ligne. La dernière image revient à la page blanche : la vidéo boucle.

| Fichier | Rôle |
|---|---|
| `tiktok.html` | La vidéo : textes (`SENTENCES`), poses (`POSES`), étapes du site (`CUES`) |
| `voice/` | Les phrases de la voix off, `01.mp3` à `09.mp3` (à fournir) |

L'avatar, les polices et les outils sont dans [`../commun/`](../commun/) (voir [`../README.md`](../README.md)).

## Voix off ElevenLabs

Une phrase par fichier, même voix que les épisodes 01 et 02, fichiers `01.mp3` à `09.mp3` dans `voice/` :

| Fichier | Texte |
|---|---|
| `01.mp3` | Page blanche. Dans trente secondes, c'est le site d'une boulangerie. |
| `02.mp3` | D'abord, la structure : ce qu'on vend, et où. |
| `03.mp3` | Ensuite, les couleurs : le doré du pain, le crème de la farine. |
| `04.mp3` | Les produits, les prix, les horaires. |
| `05.mp3` | Un bouton pour commander à l'avance : c'est lui qui fait vendre. |
| `06.mp3` | Les avis clients, juste en dessous. |
| `07.mp3` | Et maintenant, la version téléphone, parce que c'est là que tes clients regardent. |
| `08.mp3` | En ligne. Trente secondes… en version accélérée. |
| `09.mp3` | Commente ton métier : le prochain site, c'est le tien. |

```bash
# depuis la racine du dépôt
python3 -m http.server 8765 --directory . &
python3 video/commun/sync-voice.py video/tiktok-episode-03
node video/commun/render.mjs video/tiktok-episode-03   # → video/tiktok-episode-03/ltns-tiktok-episode-03.mp4
```

## Publication

**Légende**

> J'ai créé le site d'une boulangerie en 30 secondes ⏱️🥖
> Commente ton métier : le prochain, c'est le tien.

**Hashtags** : `#siteinternet #boulangerie #webdesign #entrepreneur #independant`

**Commentaire à épingler** : « Le métier le plus commenté aura son site dans le prochain épisode 👇 »
