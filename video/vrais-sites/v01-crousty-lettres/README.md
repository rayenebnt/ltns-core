# Vrai projet 01 · Le Crousty : « Comment ces lettres passent derrière lui ? »

Vidéo TikTok 1080 × 1920, 30 i/s, en boucle. Concept validé : `../concepts.json`, `final.videos[n = 1]`.
Projet : le site vitrine du Crousty (fast-food, Bonneuil-sur-Marne), **étape 4 « À valider », pas encore en ligne**.
Dépôt du site : `/home/user/rayenebnt/crousty-` (jamais modifié, seulement lancé en local pour les captures).

## Ce qu'on voit (tout vient du vrai site)

| Moment | À l'écran | Source |
|---|---|---|
| Image 0 → « Trois calques » | La fin de l'entrée du site, interface masquée, néon allumé, le S qui passe derrière la casquette. Titre fixe « COMMENT CES LETTRES / PASSENT DERRIÈRE LUI ? ». Le néon vacille (vraies images p 0,920 / p 0,952), poussée vers le S, cercle orange autour du chevauchement. | `assets/entree/` (capture « entrée masquée ») |
| « Trois calques » | Vue éclatée en 3D : le fond, les lettres, la personne. | `assets/hero/fin.webp`, `assets/lettres/`, `assets/hero/fin-personne.webp` |
| « Au fond… 85 images » | Le calque du fond joue la vraie marche de dos (f054 → f084), puis éclate en grille de 85 cases, compteur 01 → 85. | `assets/hero/f054…f084.webp` |
| « Au milieu, les lettres… » | Les 7 lettres (vraies captures, une par une, néon éteint / allumé) remontent puis retombent une par une, ralenti ×0,5 sur le S, puis le néon s'allume. | `assets/lettres/L0…L6-on/off.webp` |
| « Devant, lui, détouré » | Pointillés tracés autour de la silhouette (contour calculé sur le masque alpha). Les calques se recollent, le S repasse derrière la casquette. | `assets/silhouette.json` |
| « Et sur le site, c'est ton pouce… » | Rembobinage (effet de montage) jusqu'à p 0,45 (de dos), indicateur de pouce sur le bord gauche, marche jusqu'au comptoir, puis la vraie chute des lettres en accéléré. | `assets/entree/` |
| « T'as des vidéos de ton commerce ? » | Tout rentre dans un téléphone sans marque : l'état final du site avec ses boutons (paragraphe masqué), pastille « Site en cours de validation », tap sur « Compose ton menu », onglets Burgers puis Tacos. | `assets/final.webp`, `assets/compose-*.webp` |
| « Elles peuvent devenir ton site. » | Carte de fin sur la salle floutée : « Devis gratuit sous 48 h · lien en bio », « Partout en France à distance / sur place en Île-de-France », « LTNS° », « Site du Crousty en cours de validation · pas encore en ligne ». | `assets/flou-*.webp` |
| Boucle | La carte se dissout, les lettres retombent (vraie capture p 0,70 → 0,952), le titre revient : la dernière image est l'image 0. | `assets/entree/` |

Effets de montage, jamais présentés comme le comportement du site : vue éclatée, grille, ralenti, rembobinage, indicateur de pouce.

**Vie privée.** La personne filmée n'apparaît que de dos : aucune image avant f054 / p 0,42 (le visage est visible de profil
jusqu'à f053). Dans la grille, les cases 01 à 54 sont donc des aplats orange numérotés. Pas d'horaires, pas de prix,
aucune mention « mozzarella » (paragraphe de l'accueil masqué, onglet Gratinés jamais montré).

## Timing et voix

`SENTENCES` = le texte ElevenLabs découpé sur `[pause]` / `[long pause]` (8 phrases). Chaque temps fort est accroché à un mot
(`CUES`, et les instants dérivés dans `derive()`), sauf l'accroche 0–3 s et la queue de boucle. Sans voix, le moteur estime
le minutage (brouillon ≈ 25 s) ; avec la voix (`vrai-projet-01.mp3` découpé en `voice/01.mp3` … `08.mp3`) :

```bash
python3 video/commun/sync-voice.py video/vrais-sites/v01-crousty-lettres   # écrit timing.json, envelope.json, voice.mp3, voice-files.js
```

## Régénérer les images

```bash
# 1. le vrai site en local (dans un autre terminal ; tuer ce serveur par son PID ensuite)
cd /home/user/rayenebnt/crousty- && npx vite --port 5181 --strictPort --host 127.0.0.1
# 2. captures brutes (≈ 4 min) puis conversion
node video/vrais-sites/v01-crousty-lettres/scripts/capture-site.mjs /tmp/v01-crousty-raw
python3 -I video/vrais-sites/v01-crousty-lettres/scripts/prepare-assets.py /tmp/v01-crousty-raw
```

`capture-site.mjs` : 360 × 640 @3, CSS injecté pour masquer l'interface (en-tête, textes, boutons, indice) ; lettres seules sur fond
transparent (une capture par lettre, néon allumé et éteint) ; état final (paragraphe masqué) ; « Compose ton menu », onglets Burgers et Tacos.
`prepare-assets.py` : WebP, recadrage des lettres, contour de la silhouette, salle floutée, police Anton (OFL).

## Rendu

```bash
# serveur du dépôt sur le port 8765 (s'il ne répond pas déjà)
setsid nohup python3 -m http.server 8765 --directory /home/user/ltns-core >/dev/null 2>&1 &
node video/commun/render.mjs video/vrais-sites/v01-crousty-lettres     # → ltns-v01-crousty-lettres.mp4 (ignoré par git)
node video/vrais-sites/v01-crousty-lettres/scripts/frames.mjs /tmp/v01-frames --step=0.5   # images fixes pour vérifier
```

## Publication

**Accord bloquant** : OK écrit du Crousty (nom, vidéo, photos, montrer un site encore non validé) et de l'homme filmé (même de dos).
Étiquette « Contenu généré par IA » activée (voix clonée). Couverture : l'image 0.

**Légende**

> Comment ces lettres passent derrière lui ? Trois calques : la vidéo TikTok du resto découpée en 85 images, les lettres, et lui, détouré. C'est l'entrée du futur site du Crousty (Bonneuil-sur-Marne), en cours de validation, créé par LTNS°. T'as des vidéos de ton commerce ? Elles peuvent devenir ton site. Partout en France à distance, sur place en Île-de-France · devis gratuit sous 48 h, lien en bio.

**Hashtags** : `#creationsiteweb #siterestaurant #motiondesign #webdesign #fastfood #commercelocal`
