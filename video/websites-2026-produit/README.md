# ARDEUR : site produit 3D au scroll (concept fictif)

Maquette **fictive** d'un site produit en 3D pour la vidéo TikTok « Les sites internet en 2026 »
(format repris de @wearebrand.io). ARDEUR, « shots au gingembre », est une marque imaginaire :
le pied de page, la contre-étiquette du flacon et les boutons le disent.

- three.js 0.170.0, aucune image ni requête réseau : étiquettes, couvercle, ombres, relief des
  mots et studio d'éclairage sont générés au chargement (canvas, PMREM).
- JS, CSS et police tiennent dans **un seul fichier HTML** qui marche hors ligne depuis `file://`.
- Pas de vidéo : la démo se fait en direct. Mode d'emploi pour la démo : [DEMO.md](DEMO.md).

## Construire

```bash
cd video/websites-2026-produit
npm install             # three@0.170.0 + esbuild 0.28.2
node build.mjs          # → dist/ardeur.html (un seul fichier, ~655 Ko, sortie déterministe)
node build.mjs --watch  # reconstruit à chaque modification de src/ (npm run watch)
```

Pas de serveur : ouvrir `dist/ardeur.html` directement. `dist/` et `node_modules/` sont ignorés
par git.

## Structure

| Chemin | Rôle |
|---|---|
| `build.mjs` | esbuild (IIFE minifiée), puis CSS et police (base64) injectés dans `src/index.html` → `dist/ardeur.html` |
| `src/index.html`, `src/style.css` | Interface : onglets, flèches, titre, paragraphe, barre du bas, mention, toast, curseur, chargement, message sans WebGL 2 |
| `src/main.js` | Rendu, défilement amorti (ressort critique), carrousel (clavier, onglets, flèches, balayage horizontal, clic), chapitres, lecture auto, qualité, hooks de test |
| `src/ui.js` | Fondus de l'interface à chaque image, toast, curseur personnalisé |
| `src/scene/config.js` | Palette, produits (ordre du carrousel), caméra, lumière principale, cotes du flacon |
| `src/scene/timeline.js` | Poses des produits : carrousel (glissement et rotation 3D) et histoire au scroll p ∈ [0, 1], bouchon, jaillissement, fondus |
| `src/scene/bottle.js`, `tin.js` | Flacon (verre ambré, liquide, étiquette, bouchon doré moleté qui se dévisse) et boîte de gommes |
| `src/scene/labels.js` | Étiquettes, couvercle et bande de la boîte dessinés sur canvas, avec cartes rugosité / métal |
| `src/scene/words.js` | Table et mots géants en relief (glyphes extrudés), occlusion cuite une fois |
| `src/scene/shadows.js` | Ombres de contact (silhouettes vues de dessous, floutées), force réglée produit par produit |
| `src/scene/splash.js` | Ruban de liquide torsadé et gouttes, reconstruit au scroll |
| `src/scene/stage.js` | Fondu au blanc (couleur exacte de la page) et bande de lumière beige |
| `src/scene/env.js` | Studio de softbox HDR capturé une fois en PMREM |
| `src/scene/geom.js`, `util.js` | Profils de révolution, interpolation, patchs de matériaux |
| `src/fonts/` | Inter Tight (woff2, contours des mots en relief), licence OFL : `OFL-inter-tight.txt` |
| `tools/glyphs.mjs` | Régénère `inter-tight-black-italic-words.json` si les mots changent |

## Paramètres d'URL

| Paramètre | Effet |
|---|---|
| `?q=low`, `medium`, `high`, `max` | Qualité forcée : densité de pixels 1, 1,5, 1,75, 2 (jamais plus que l'écran). Sans paramètre, la page part de `max`, mesure pendant le chargement la médiane du temps d'image à quatre moments lourds (p = 0, carrousel en mouvement, p = 0,4, p = 0,95), descend d'un cran tant que la pire dépasse 20,5 ms, puis fige le niveau. Seule la densité change : sur un écran 1× (Windows à 100 %), tous les niveaux rendent en densité 1 et `?q=low` n'allège rien |
| `?auto=1` | Lecture automatique dès la fin du chargement |
| `?fps=1` | Affichage en coin : niveau retenu, densité, images par seconde, pire image |
| `?capture` | Rendu à la demande : ni boucle ni test de qualité (captures) |
| `?t=4` | Horloge figée (oscillations au repos) |

## Commandes

| Commande | Effet |
|---|---|
| `←` / `→`, flèches rondes, onglets, balayage horizontal, clic sur un voisin | Carrousel (0,9 s par mouvement), en haut de page : p < 0,04, soit environ 180 px de défilement sur un écran de 900 px. Plus bas (p < 0,2), flèches, touches, onglets et clic ramènent d'abord la page en haut, puis font le mouvement ; le balayage, lui, n'agit qu'en haut de page (il ramène en haut les quelques pixels qu'il a pu faire défiler). Un geste horizontal ne fait jamais défiler la page |
| Défilement | Histoire au scroll ; au-delà de p = 0,04, le carrousel revient au shot gingembre |
| `↓`, `Espace`, `Page suivante` / `↑`, `Page précédente` | Chapitre suivant / précédent (p = 0 · 0,3 · 0,5 · 0,64 · 0,8 · 0,9 · 1) |
| `Début` / `Fin` | Vers p = 0 en 3,6 s / vers p = 1 en 6,5 s |
| `P` | Lecture auto (16,5 s), ou l'arrête ; un défilement l'arrête aussi |
| Notre histoire / logo ARDEUR | Vers p = 0,5 en 2,6 s / vers p = 0 en 3,2 s |
| Contact, Voir la gamme, Découvrir le shot | Toast « Démonstration : ARDEUR est une marque fictive imaginée par LTNS°. » |
| Clic sur le flacon | Chapitre suivant, seulement si le disque « DÉCOUVRIR » est ouvert (aucun clic n'est pris dans les 1,5 s qui suivent le retour sur la fenêtre) |

Le curseur système est masqué ; le curseur de la page disparaît après 2 s sans mouvement.

## Hooks de test

- `window.__ready` : `false`, puis `true` après la première image (`'nogl'` sans WebGL 2).
- `window.__setProgress(p)` : saute à la progression p et rend l'image.
- `window.__setCarousel(pos)` : position continue du carrousel (0 gommes, 1 gingembre,
  2 curcuma ; 0,5 = en plein mouvement) et rend l'image.
- `window.__setTime(t)` : horloge des oscillations.
- `window.__hit(x, y)` : produit sous un point de l'écran (-1 : aucun), comme le voit le curseur.
- `window.__stats()` : appels de rendu et triangles (scène, ombres de contact), textures,
  géométries, programmes, niveau, densité, temps CPU, p, carrousel.
- `window.__three` : débogage (renderer, scène, caméra, produits, mots, jaillissement, ombres,
  état du balayage `wheel` et du carrousel `car`).

## Budget mesuré

Mesures du 10 novembre 2026 dans Chromium avec SwiftShader (rendu logiciel : les temps ne disent
rien d'un vrai GPU), 1440 × 900, `renderer.info` après `__setProgress(p)`. Le niveau automatique et
`?q=low` donnent les mêmes chiffres : seule la densité de pixels change d'un niveau à l'autre.

| Moment | Passe principale | Ombres de contact | Total |
|---|---|---|---|
| p = 0 (carrousel, mots en relief) | 10 appels, 103 k triangles | 13 appels, 756 triangles | 23 appels |
| Carrousel en plein mouvement | 11 appels, 82 k triangles | 12 appels | 23 appels |
| p = 0,2 à 0,4 (le flacon monte et se retourne) | 6 à 7 appels, 69 k triangles | 11 appels | 17 à 18 appels |
| p = 0,5 et 0,8 (fond blanc, titre, flacon droit) | 5 appels, 34,5 k triangles | aucune | 5 appels |
| p = 1 (bouchon, jaillissement) | 8 appels, 45,6 k triangles | aucune | 8 appels |

- 14 textures, 20 géométries, 14 programmes de shader, tous envoyés au GPU pendant le chargement
  (rien ne se compile pendant la prise).
- Lumières : une directionnelle sans carte d'ombre, plus l'environnement de studio en PMREM. Pas de
  transmission three.js (le verre la simule dans son shader), pas de post-traitement : MSAA natif,
  tone mapping ACES.
- Densité de pixels : 2 en `max`, 1,75 en `high`, 1,5 en `medium`, 1 en `low`.
- Les 60 images par seconde sur un vrai portable à GPU intégré n'ont pas pu être mesurées ici : à
  vérifier avec `?fps=1` avant la démo (voir DEMO.md).

## Contenus

- Tous les textes visibles sont en français, espaces insécables comprises. Aucune allégation
  santé (ni « immunité », ni « défenses », ni « détox ») : goût, énergie, moment.
- Mention permanente : « Projet fictif · concept de site par LTNS° — ltns.fr ».
- La police embarquée (sous-ensemble latin) n'a pas la flèche → : le navigateur la prend dans la
  police système. Elle n'a pas non plus l'espace fine insécable (U+202F, avant le deux-points du
  toast et sur les étiquettes) ; Chrome et Edge la composent à partir de l'espace de la police.
- Toast : sous les onglets dans la première moitié de la page, sous le bouton « Découvrir le
  shot » dans la seconde. S'il est encore affiché quand la page passe le milieu, il disparaît d'un coup.
