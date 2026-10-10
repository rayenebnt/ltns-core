# TikTok « Tu commentes, je crée » #01 — Épisode 06

Premier épisode de la série choisie d'après la recherche TikTok ([../RECHERCHE-TIKTOK.md](../RECHERCHE-TIKTOK.md)) :
un métier demandé en commentaire, un **exemple** de site créé pour lui, et un vrai choix de pro tranché à l'écran.

**Le dilemme de l'épisode :** salon de coiffure, en haut du site, le bouton « Appeler » ou « Réserver » ?
La réponse n'arrive qu'aux deux tiers : « Appeler » est essayé (appels manqués, ciseaux en main),
puis « Réserver » prend la place (la cliente réserve même à 23 h). Version ordinateur,
« un exemple, pas ton site », puis la question au public. La fin revient à l'image de départ : la vidéo boucle.

Le salon « Maison Lila » est fictif ; c'est indiqué à l'écran (badge « EXEMPLE · ENTREPRISE FICTIVE »,
bandeau « UN EXEMPLE, PAS TON SITE »). Les prix sont des prix d'exemple.
Le bouton « Réserver » suppose un lien vers l'outil de réservation du salon (ou un formulaire de demande).

Mise en page adaptée à l'interface TikTok : l'avatar est remonté, rien d'important sous y ≈ 1280
ni dans les 140 px de droite entre y ≈ 900 et 1500.

| Fichier | Rôle |
|---|---|
| `tiktok.html` | La vidéo : textes (`SENTENCES`), poses (`POSES`), étapes calées sur les mots (`CUES`) |
| `script-elevenlabs.txt` | Le texte à coller dans Eleven v4, en un seul fichier (`[long pause]` entre les phrases) |
| `voice/` | La voix découpée en phrases, `01.mp3` à `09.mp3` |

## Fabriquer l'épisode

```bash
# depuis la racine du dépôt
python3 -m http.server 8765 --directory . &
python3 video/commun/sync-voice.py video/tiktok-episode-06
node video/commun/render.mjs video/tiktok-episode-06   # → video/tiktok-episode-06/ltns-tiktok-episode-06.mp4
```

## Publication

- **S'il existe un vrai commentaire** (« je suis coiffeuse », « un site pour mon salon ? ») : publier avec
  « Répondre avec une vidéo » sur ce commentaire. TikTok ajoute lui-même l'autocollant du commentaire ;
  le placer dans le haut de l'image, sur le bandeau. Ne jamais fabriquer de commentaire.
- **Sinon** : publier tel quel, la vidéo fonctionne seule.

**Légende** (commence par la recherche) :

> Site internet pour salon de coiffure : en haut, le bouton Appeler ou Réserver ? ✂️
> Exemple créé pour la vidéo (salon fictif). Et toi, t'aurais mis quoi ? Dis-moi ton métier 👇

**Hashtags** : `#salondecoiffure #coiffure #siteinternet #petiteentreprise #ltns`

**Commentaire à épingler** : « Exemple pour un salon fictif. Les prochains métiers, je les prends dans les commentaires, un par vidéo 👇 »

**Réglages conseillés** (par prudence, non confirmés sur les pages officielles) : étiquette « Contenu généré par IA »
(voix clonée), mention « Votre marque » (promotion de ses propres services).
