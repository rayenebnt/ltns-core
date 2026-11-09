# Cap Lumière : site 3D au scroll (concept fictif)

Maquette **fictive** d'un site immobilier de luxe en 3D, pour la vidéo TikTok « Les sites internet
en 2026 ». En faisant défiler, la caméra plonge vers la tour, passe la baie vitrée du 14ᵉ étage et
s'arrête dans le séjour, en un seul plan. Le séjour est modélisé dans la tour.

- Rendu : three.js 0.170.0.
- Aucune image ni requête réseau : les textures sont générées au chargement (canvas).
- JS, CSS et police tiennent dans **un seul fichier HTML** qui marche hors ligne depuis `file://`.

Pour filmer, voir [TOURNAGE.md](TOURNAGE.md).

## Construire

```bash
cd video/websites-2026
npm install             # three@0.170.0 + esbuild 0.28.2
node build.mjs          # → dist/cap-lumiere.html (un seul fichier, ~700 Ko)
node build.mjs --watch  # reconstruit à chaque modification de src/ (npm run watch)
```

- Pas de serveur : ouvrir `dist/cap-lumiere.html` directement.
- `dist/` est généré et ignoré par git, comme dans tout le dépôt.

## Structure

| Chemin | Rôle |
|---|---|
| `build.mjs` | esbuild (IIFE minifiée), puis CSS et police en base64 injectés dans `src/index.html` → `dist/cap-lumiere.html` |
| `src/index.html`, `src/style.css` | Interface : logo, carte « Choisissez votre étage », pastilles, étiquettes, chargement, message sans WebGL 2 |
| `src/ui.js` | Interface à chaque image : compteur d'étage, carte, pastilles, étiquettes projetées dans la pièce |
| `src/main.js` | Rendu, défilement amorti (ressort critique), clavier, lecture auto (`AUTO_KEYS`), qualité, hooks de test |
| `src/scene/config.js` | Soleil, dimensions de la tour et du séjour, textes des étages (`FLOOR_INFO`) |
| `src/scene/path.js` | Trajectoire de caméra : progression p ∈ [0, 1] → position, cible, focale |
| `src/scene/tower.js`, `interior.js` | La tour (façade, dalles, verre, bande de l'étage choisi) et le séjour du 14ᵉ |
| `src/scene/sky.js`, `atmosphere.js`, `sea.js` | Ciel, brume (patch du brouillard three.js), mer (shader : houle, reflets, scintillement) |
| `src/scene/terrain.js`, `vegetation.js`, `marina.js`, `yachts.js` | Côte, ville, promenade, végétation instanciée, port, yachts |
| `src/scene/textures.js`, `noise.js`, `geom.js` | Textures procédurales, bruit, utilitaires |
| `src/scene/post.js` | Bloom (moitié de la résolution), sortie ACES, FXAA en qualité basse, étalonnage, vignette, grain |
| `src/fonts/` | Inter Tight (woff2, licence OFL : `OFL-inter-tight.txt`) |
| `tools/apercu.mjs` | Rendu de l'aperçu vidéo `dist/apercu.mp4` (voir plus bas) |

## Paramètres d'URL et clavier

| | |
|---|---|
| `?q=low`, `?q=medium`, `?q=high` | Qualité forcée. Sans paramètre, la page mesure la médiane du temps d'image à p = 0, 0,55 et 0,9 pendant le chargement, descend d'un niveau au-delà de 21,5 ms (deux fois au plus), puis garde ce niveau pour toute la prise |
| `?auto=1` | Lecture automatique dès le chargement (15,2 s), curseur toujours caché |
| `?capture` | Rendu à la demande : pas de boucle ni de test de qualité (captures) |
| `?t=4` | Horloge figée (mer, flammes, yachts) |
| ↓, Espace, Page suivante / ↑, Page précédente | ± 0,085 de progression en 0,9 s |
| Début / Fin | Vers 0 en 4,5 s / vers 1 en 9 s |
| P | Lance la lecture auto depuis le début, ou l'arrête si elle tourne |

Les niveaux sont définis dans `LEVELS` (main.js) :

| Niveau | Densité de pixels | Lissage | Bloom |
|---|---|---|---|
| `low` | 1 | FXAA, sans MSAA | ¼ de la résolution |
| `medium` | ≤ 1,3 | MSAA ×4 | ½ de la résolution |
| `high` | ≤ 1,75 | MSAA ×4 | ½ de la résolution |

`?q=low` allège aussi la scène : port occupé à 50 % au lieu de 70 %, moins de végétation et
d'immeubles, dalles de la tour et oliviers simplifiés, 12 vagues au lieu de 20, ombre en 1024² et
cube d'environnement en 128. Le choix automatique ne touche pas à la scène.

## Hooks de test

- `window.__ready` : `false`, puis `true` après la première image (`'nogl'` sans WebGL 2).
- `window.__setProgress(p)` : saute à la progression p et rend l'image.
- `window.__setTime(t)` : règle l'horloge des animations.
- `window.__stats()` : appels de rendu, triangles, textures, niveau, densité de pixels, p, caméra.
- `window.__debugCam(...)` et `window.__three` : débogage.

## Budget mesuré

Mesures du 9 novembre 2026 : Chromium, 1440 × 900, `renderer.info` après `__setProgress(p)`.

| p | Appels de rendu (scène / image) | Triangles | Textures |
|---|---|---|---|
| 0 | 59 / 74 | 466 k | 31 |
| 0,5 | 55 / 70 | 384 k | 31 |
| 0,8 | 48 / 63 | 382 k | 31 |
| 1 | 48 / 63 | 382 k | 31 |

- Le chiffre « image » ajoute les passes de post-traitement aux appels de la scène.
- Avec `?q=low` : 368 k triangles à p 0 et 309 k dans le séjour. Il y a un appel de plus
  (FXAA). Sous SwiftShader, une image coûte environ 4 fois moins qu'en `high` sur un écran de
  densité 2.
- Lumières : 1 directionnelle avec une carte d'ombre statique, 1 hémisphérique et 2 ponctuelles
  dans le séjour.
- Shaders : 78 programmes (95 en `low`), tous compilés pendant le chargement. Un balayage
  p 0 → 1 → 0 ne crée aucun programme, aucune texture ni aucune géométrie.

## Aperçu vidéo

```bash
npm i -D playwright && npx playwright install chromium   # une fois ; ffmpeg doit être installé
node tools/apercu.mjs                                     # → dist/apercu.mp4
```

- Le script rejoue la lecture automatique image par image, en 1280 × 800 et 24 i/s.
- Il suit `AUTO_KEYS` et le ressort de main.js. À chaque image, il règle l'horloge
  (`__setTime`), puis appelle `__setProgress`.
- WebGL tourne en logiciel (SwiftShader) : compter environ 15 min.
- Le compteur d'étage y change sans son animation de chiffres, puisque `__setProgress` est
  instantané.
