# TikTok « Coulisses : PMSB Gestion » — Épisode 04

Premier épisode de la série « Coulisses » : un vrai projet, de l'idée à la livraison.
PMSB, entreprise du bâtiment, faisait ses devis à la main ; LTNS° lui a créé PMSB Gestion,
livré en 4 semaines (accord du client pour le citer).

Une scène 3D par étape : le devis manuscrit, l'écoute (post-its), le plan, la bibliothèque de prix
qui remplit un devis, l'envoi et les relances, les achats et l'échéancier, le tableau de bord
(fidèle au logiciel), la livraison avec la version téléphone, puis les commentaires.
Le bandeau compte les semaines (1/4 → 4/4, puis « LIVRÉ »). La fin revient au devis manuscrit : la vidéo boucle.
Tous les montants et noms de clients affichés sont des **données de démonstration**.

| Fichier | Rôle |
|---|---|
| `tiktok.html` | La vidéo : textes (`SENTENCES`), poses (`POSES`), étapes calées sur les mots (`CUES`) |
| `script-elevenlabs.txt` | Le texte à coller dans Eleven v4, en un seul fichier (`[long pause]` entre les phrases) |
| `voice/` | La voix découpée en phrases, `01.mp3` à `09.mp3` |

## Fabriquer l'épisode

```bash
# depuis la racine du dépôt
python3 -m http.server 8765 --directory . &
python3 video/commun/sync-voice.py video/tiktok-episode-04
node video/commun/render.mjs video/tiktok-episode-04   # → video/tiktok-episode-04/ltns-tiktok-episode-04.mp4
```

## Publication

**Légende**

> Il faisait tous ses devis à la main. Je lui ai créé son propre logiciel, livré en 4 semaines 🏗️
> Commente ton métier : je te dis ce que ton logiciel ferait pour toi.

**Hashtags** : `#logiciel #batiment #artisan #entrepreneur #coulisses`

**Commentaire à épingler** : « Je réponds à chaque métier : dis-moi ce qui te fait perdre du temps 👇 »
