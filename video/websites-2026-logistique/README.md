# Sillage : site de transport et logistique en 3D (concept fictif)

Maquette **fictive** pour la vidéo TikTok « Les sites internet en 2026 » (n° 5 de la série).
Sillage, « transport & logistique, Le Havre », est une entreprise imaginaire : la mention en bas
à gauche, le toast des boutons « DEMANDER UN DEVIS » et la dernière section le disent. Aucun
client, aucun avis, aucun prix, aucune statistique, aucune coordonnée, aucune vraie marque.

- three.js 0.170.0. Aucune image, aucun modèle, aucun HDR externe : le terminal, le cavalier, les
  conteneurs, le camion, la route, l’océan, le navire, les nuages et l’avion sont construits au
  chargement (géométrie procédurale, canvas, shaders).
- JS, CSS et polices tiennent dans **un seul fichier HTML**, qui marche hors ligne depuis
  `file://` (aucune requête réseau : ni `fetch`, ni XHR, ni `sendBeacon`, ni WebSocket, ni URL
  externe).
- Pas de vidéo : la démo se fait en direct. Mode d’emploi : [DEMO.md](DEMO.md).

## Construire

```bash
cd video/websites-2026-logistique
npm install                 # three@0.170.0 + esbuild 0.28.2
node build.mjs              # → dist/sillage.html (un seul fichier, ~945 Ko)
node build.mjs --watch      # reconstruit à chaque modification de src/ (npm run watch)
WORLD=stub OUT=../.cache/sillage-stub.html node build.mjs   # la coque avec un monde simplifié
node tools/harness.mjs tools/harness-port/main.js .cache/harness-port.html     # page de test du port
node tools/harness.mjs tools/harness-voyage/main.js .cache/harness-voyage.html # route, mer, ciel
```

`OUT` donne le fichier produit, relatif à `dist/` : sans lui, une construction `WORLD=stub`
remplacerait `dist/sillage.html` ; `dist/` ne contient que `sillage.html`, les essais vont dans
`.cache/`. Pas de serveur : ouvrir
`dist/sillage.html` directement. `dist/`, `.cache/` et `node_modules/` sont ignorés par git. Les
polices (Big Shoulders Display et Stencil Display, JetBrains Mono, Inter Tight) et leurs licences
OFL sont dans `src/fonts/` ; `tools/fonts.mjs` les injecte en base64 à la place du marqueur
`/*@FONTS@*/` de `style.css`. Le fichier construit garde la notice MIT de three.js.

## Structure

| Chemin | Rôle |
|---|---|
| `build.mjs` | esbuild (IIFE minifiée), puis CSS et polices injectés dans `src/index.html` (`<!--@STYLE@-->`, `<!--@SCRIPT@-->`) → `dist/sillage.html` |
| `src/story.js` | **Source unique du récit** : écrans de défilement, chapitres, phases 3D, fenêtres des textes, ton du bandeau, arrêts des touches |
| `src/texts.js` | **Tous les textes visibles**, en typographie française (U+202F avant `:` `;` `!` `?` et dans « », apostrophe ’) |
| `src/world/layout.js` | **Coordonnées du monde** (mètres, est = +X, nord = −Z) : terminal, route, quai, navire, nuages, avion |
| `src/index.html`, `src/style.css` | Structure, bandeau, textes, services, rail, section « Arrivée », tableau des départs, toast, chargement, message sans WebGL 2 |
| `src/main.js` | Rendu, chargement, test WebGL 2, test de qualité puis régulateur, défilement → `p`, touches, menu et rail, visite, curseur, hooks |
| `src/scroll.js` | Défilement virtuel (ressort amorti critique ω 4,4, vraie hauteur de page, barre cachée), glissements programmés, fin magnétique |
| `src/ui.js`, `src/flap.js` | Couche DOM image par image (ton, chapitre, textes, services ancrés au navire, rail, « Arrivée », crédit) ; lettres qui tournent et tableau à palettes (graine fixe, réversible) |
| `src/tour.js` | La visite (`P`, `?auto=1`) : clés de temps tirées de `STOPS`, ≈ 27 s |
| `src/world/index.js` | L’intégrateur : scène, caméra (une seule, continue en `p`), lumières, étapes, qualité, ancres |
| `src/world/port/` | Chapitre 01 : terminal, cavalier, conteneurs (dont le SILLAGE orange), camion, chorégraphie |
| `src/world/voyage/` | Route, océan et sillage, porte-conteneurs, nuages (ray-march), avion et traînées |
| `src/world-stub/index.js` | Monde simplifié, même contrat (`WORLD=stub`) |
| `tools/` | `fonts.mjs` (polices en base64), `harness.mjs` et `harness-port/`, `harness-voyage/` (pages de test des modules, sorties dans `.cache/`) |

Chaque module documente son API en tête de son `index.js`.

## Le récit : `src/story.js`

La page fait `SCREENS` (14) hauteurs d’écran de récit épinglé, puis la section « Arrivée » (au
moins un écran). Le défilement donne `p` (0..1, adouci) : `p` 0 → `STORY_END` (0,9) pour le récit
3D, 0,9 → 1 pour la section blanche qui monte par-dessus le canevas.

- `CHAPTERS` : port 0–0,22, route 0,22–0,45, mer 0,45–0,74, air 0,74–0,9, arrivée 0,9–1 (menu,
  rail, chapitre courant).
- `PHASES` : fenêtres de la chorégraphie 3D (levage, transport, pose, départ du camion, grue de
  caméra, route, côte, navire, montée, nuages, avion, blanc).
- `BEATS` : `[début du fondu, plein, début de sortie, fin]` de chaque texte ; le titre s’écrit
  pendant le fondu d’entrée et il est posé au plein.
- `TONE` : texte sombre sur le port, la route et la fin, clair sur la mer et le ciel ;
  `CREDIT_LIGHT` : la mention du bas passe en clair dès que la mer arrive sous elle.
- `STOPS` : arrêts de `↓` / `↑` et des pauses de la visite (0, 0,185, 0,225, 0,37, 0,555, 0,69,
  0,845, 1). Le menu et le rail vont à l’arrêt le plus proche du milieu du texte du chapitre.

Les durées, les positions et les textes se changent **là**, jamais dans une copie.

## Contrat du monde

La coque n’appelle que `src/world/index.js` (même contrat dans `src/world-stub/index.js`) :

```js
const world = await createWorld({ renderer, quality, onProgress }); // 'low' | 'medium' | 'high' | 'max'
world.update({ p, pointer: { x, y } }, dt, time); // fonction pure de p (+ time pour vagues, nuages, balises)
world.render();               // un seul renderer.render (passe d'ombre comprise)
world.resize(w, h, dpr);      // le monde règle lui-même setPixelRatio et setSize
await world.warmup();         // rend chaque étape une fois sous le chargement (tous les programmes compilés)
world.setQuality(level);      // toujours suivi de world.resize
world.stats();                // { calls, triangles, textures, geometries, programs, stage, level }
world.anchors();              // px CSS : { ship: { x, y, w, h, visible }, callouts: [5 × { x, y, side, visible }],
                              //   truck: { x, y, visible }, plane: { x, y, visible } }
world.info();                 // { stage: 'port' | 'road' | 'sea' | 'air' }
world.camera;
```

`dt >= 0,5` signifie « saut » (hooks, `?capture`). La coque n’appelle `anchors()` que pendant les
services ; elle saute le rendu quand « Arrivée » couvre toute la fenêtre. Une seule lumière
directionnelle porte l’ombre (la première : l’ombre du studio la lit), une seule carte d’ombre
ajustée à la vue.

## Paramètres d’URL

| Paramètre | Effet |
|---|---|
| `?q=low`, `medium`, `high`, `max` | Qualité forcée : ni test au chargement, ni régulateur |
| `?auto=1` | La visite démarre ≈ 2 s après le chargement (un clic, une touche ou un défilement l’annulent) |
| `?fps=1` | Cadre en bas au centre : niveau (et changement du régulateur, ex. `q=high→medium`), densité, images par seconde, pire image ; les messages `[Sillage]` de la console ne sortent qu’avec lui |
| `?capture` | Images fixes déterministes : pas de boucle (rendu par les hooks), pas de visite, pas de test de qualité, pointeur au centre, temps figé sauf `__setTime`, niveau `high` sauf `?q` |
| `?slow=8` | Débogage : attente active de 8 ms à chaque image |
| `?gov=1` | Débogage : garde le régulateur actif avec un `?q=…` forcé |

## Hooks (toujours présents)

- `window.__ready` : `true` quand la page répond, `'nogl'` sans WebGL 2.
- `window.__setProgress(p)` : saute à `p` et pose tous les lissages ; `window.__goto(nom, v)` avec
  `nom` = `'port'`, `'route'`, `'mer'`, `'air'` ou `'arrivee'` et `v` = 0..1 dans le chapitre.
- `window.__setTime(t)` : le temps des mouvements d’ambiance (rendu immédiat en `?capture`).
- `window.__stats()` : `renderer.info` (appels, triangles, textures, géométries, programmes),
  niveau, densité, `p`, chapitre, étape, visite, tableau posé, ancres, régulateur.
- `window.__world` (le monde, dont `rig()` pour la caméra) et `window.__layout()` (hauteurs).

## Commandes

| Entrée | Effet |
|---|---|
| Molette, pavé tactile, toucher | Défilement adouci (ressort ω 4,4) ; arrêté un peu avant la fin après un geste vers le bas, la page finit seule (pause 0,35 s, glissement 0,6 s) |
| `↓`, `PageDown`, `Espace` / `↑`, `PageUp`, `Maj` + `Espace` | Arrêt suivant / précédent (`STOPS`) ; une touche tenue n’agit qu’une fois |
| `Home` / `End` (`Début` / `Fin`) | Début / fin de la page (le logo ramène aussi au début) |
| Menu (01 PORT … 04 AIR), points du rail | Glissement vers le chapitre |
| « Revoir le trajet ↑ » | Remonte au début |
| « DEMANDER UN DEVIS », « Demander un devis » | Toast « Démonstration : Sillage est une entreprise fictive imaginée par LTNS°. » (3,6 s) |
| `P` | Visite automatique (≈ 27 s, jusqu’au tableau « LIVRÉ ») ; `P`, un clic, une touche ou un défilement l’arrêtent |

`F1`–`F12`, `Maj`, `Tab`, les raccourcis `Ctrl` / `Cmd` / `Alt` et les touches multimédia restent au
navigateur (même pendant la visite). Le curseur se cache après 2 s sans mouvement et pendant la
visite. Contexte WebGL perdu : message après 3 s s’il ne revient pas ; s’il revient, la page se recharge.

## Qualité et budget

| Niveau | Densité (au plus celle de l’écran) | Carte d’ombre | Océan | Nuages (pas) | Conteneurs du navire | Décor de route |
|---|---|---|---|---|---|---|
| `max` | 2 | 4096 | 4 octaves de vagues, scintillements, ondes de Kelvin | 26 | 2 288 | complet |
| `high` | 1,75 | 2048 | idem | 18 | 2 288 | complet |
| `medium` | 1,5 | 2048 | 3 octaves, ondes de Kelvin | 12 | 2 288 | complet |
| `low` | 1 | 1024 | 2 octaves | 8 | 564 (dessus des piles) | sans poteaux de glissière ni de clôture, sans bollards ni défenses |

Le port réduit aussi la finesse de ses maillages (pneus, échelles, fonds des conteneurs).

- **Test au chargement** (sans `?q`) : sept moments (le héros, le levage, la grue, la route, le
  navire, les services, l’avion), 14 vraies images chacun sous l’écran de chargement ; le
  80e centile de l’intervalle doit rester sous 17,4 ms (ou 1,05 fois la période de l’écran). La
  page part de `max` et descend d’un niveau tant qu’il dépasse.
- **Régulateur** ensuite : sur 120 images, si plus de 25 % dépassent 1,5 image d’écran, un niveau
  de moins, deux fois au plus, jamais vers le haut (redimensionnements et section « Arrivée »
  ignorés).

**Mesuré** (1440 × 900, `?capture&q=…`, `renderer.info` d’une image, passe d’ombre comprise ;
appels / triangles) :

| p | low | medium | high | max |
|---|---|---|---|---|
| 0 | 15 / 58 k | 15 / 189 k | 15 / 204 k | 15 / 220 k |
| 0,1 | 16 / 62 k | 16 / 194 k | 16 / 220 k | 16 / 236 k |
| 0,22 | 20 / 77 k | 21 / 213 k | 21 / 239 k | 21 / 255 k |
| 0,36 | 17 / 56 k | 18 / 190 k | 18 / 215 k | 18 / 231 k |
| 0,55 | 7 / 15 k | 8 / 36 k | 8 / 36 k | 8 / 36 k |
| 0,69 | 8 / 15 k | 9 / 36 k | 9 / 36 k | 9 / 36 k |
| 0,8 | 6 / 11 k | 6 / 28 k | 6 / 28 k | 6 / 28 k |
| 0,84 | 9 / 19 k | 9 / 36 k | 9 / 36 k | 9 / 36 k |

15 textures et 26 programmes partout, à tous les niveaux : rien ne compile après le chargement.
Budget : 150 appels et 1,5 M de triangles par image (au pire 21 et 255 k), textures de 2048 au
plus (seule la carte d’ombre de `max` fait 4096). Le vrai coût est le remplissage : l’océan
(une passe plein écran) et le ray-march des nuages pendant la montée et l’avion. Les cadences
n’ont été mesurées qu’en SwiftShader (logiciel) : à vérifier une fois avec `?fps=1` sur le
portable du tournage.
