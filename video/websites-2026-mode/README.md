# Ruelle : site de marque de streetwear en 3D (concept fictif)

Maquette **fictive** pour la vidéo TikTok « Les sites internet en 2026 » (n° 4 de la série).
Ruelle, « streetwear, Marseille », est une marque imaginaire : la mention en bas à gauche et le
toast de chaque bouton (« À PROPOS », « CONTACT », « VOIR LA DISPO ») le disent. Aucun prix,
aucune taille, aucun stock, aucun avis.

- three.js 0.170.0. Aucune image, aucun modèle, aucun HDR externe : les 8 vêtements, les cintres,
  le portant, les étiquettes et les impressions sont construits et texturés au chargement
  (géométrie procédurale, canvas, shaders).
- JS, CSS et polices tiennent dans **un seul fichier HTML**, qui marche hors ligne depuis
  `file://` (aucune requête réseau, aucun suivi).
- Pas de vidéo : la démo se fait en direct. Mode d'emploi : [DEMO.md](DEMO.md).

## Construire

```bash
cd video/websites-2026-mode
npm install                 # three@0.170.0 + esbuild 0.28.2
node build.mjs              # → dist/ruelle.html (un seul fichier, ~755 Ko)
node build.mjs --watch      # reconstruit à chaque modification de src/ (npm run watch)
WORLD=stub OUT=ruelle-stub.html node build.mjs   # la coque avec un monde simplifié (src/world-stub)
node tools/harness.mjs tools/harness-studio/main.js .cache/harness-studio.html   # page de test d'un module 3D
```

`OUT` change le nom du fichier produit dans `dist/` : sans lui, une construction `WORLD=stub`
remplacerait `dist/ruelle.html`. Pas de serveur : ouvrir `dist/ruelle.html` directement.
`dist/`, `.cache/` et `node_modules/` sont ignorés par git. Les polices (Inter Tight 100–900,
Anton, Lilita One, Yellowtail) et leurs licences (OFL, Apache 2.0) sont dans `src/fonts/` ;
`tools/fonts.mjs` les injecte en base64 à la place du marqueur `/*@FONTS@*/` de `style.css`.

## Structure

| Chemin | Rôle |
|---|---|
| `build.mjs` | esbuild (IIFE minifiée), puis CSS et polices injectés dans `src/index.html` (`<!--@STYLE@-->`, `<!--@SCRIPT@-->`) → `dist/ruelle.html` |
| `src/catalog.js` | Source unique des 8 produits (ordre du portant, noms, titres, couleurs, étiquettes, impressions) ; le héros est l'indice 1 |
| `src/index.html`, `src/style.css` | Textes fixes, barre du haut, légende, pilule, fiche produit, bandeau défilant (CSS seul), mention, toast, flèche de la visite, chargement, message sans WebGL 2 |
| `src/main.js` | Rendu, chargement, test WebGL 2, test de qualité puis régulateur, entrées (pointeur, clics, molette et pavé tactile, clavier), visite, curseur, hooks de test |
| `src/director.js` | Machine d'états et minutage : seul propriétaire des durées et des courbes de l'état envoyé au monde |
| `src/ui.js` | Couche DOM, image par image : légende (texte qui roule), titre, DEVANT \| DOS, flèches (atténuées quand un vêtement passe dessous), FERMER ×, toast |
| `src/tour.js` | La visite (`P`, `?auto=1`) : flèche factice et suite d'étapes (≈ 22 s) |
| `src/texts.js`, `src/util.js` | Toast et mention (typographie française), petites fonctions partagées |
| `src/world/index.js` | Le monde (contrat ci-dessous) : compose le studio et la garde-robe, mouvement secondaire (balancier des cintres, étiquettes), préchauffage, qualité |
| `src/world/studio/` | Cadrage (`layout`), mur, lumière et ombre (`stage`), portant (`rail`), ressorts du survol (`rack`), ouverture, glissement et demi-tour (`product`), ressorts et pendule (`physics`), fondu dans le mur (`fade`), `pick` et `anchors` (`pick`) |
| `src/world/garments/` | Vêtements procéduraux : contours, corps gonflé et drapé (`pillow`), côtes, capuche, poche, cordons (`parts`), cintre (`hanger`), atlas d'impressions (`prints`), tissu et teinture montante (`material`), textures, étiquettes (`tags`) |
| `src/world-stub/index.js` | Monde simplifié, même contrat (`WORLD=stub`) |
| `tools/fonts.mjs`, `tools/harness.mjs`, `tools/harness-*` | Polices en base64 ; pages de test des modules 3D seuls (sorties dans `.cache/`) |

## Contrat du monde

La coque n'appelle que `src/world/index.js` (même contrat dans `src/world-stub/index.js`) :

```js
const world = await createWorld({ renderer, quality, onProgress }); // quality : 'low' | 'medium' | 'high' | 'max'
world.update(state, dt, time); // une fois par image ; dt >= 0,5 = « saut » (tous les ressorts posés)
world.render();                // un seul renderer.render (passe d'ombre comprise)
world.resize(w, h, dpr);
await world.warmup();          // compile tous les programmes (tous les vêtements et étiquettes visibles)
world.setQuality(level);
world.stats();                 // { calls, triangles, textures, geometries, programs, shadow, density, ... }
world.camera;
world.pick(ndcX, ndcY);        // portant : { kind: 'garment', index, slot } (slot continu, entre deux
                               // vêtements aussi) ou null hors de la bande du portant ;
                               // fiche : { kind: 'tag', index } | { kind: 'product' } | null
world.anchors();               // px CSS, origine en haut à gauche : { caption, title, arrows: { left, right },
                               // tags: [{ x, y, w, h }], cover: [...] (rectangles des vêtements de la fiche) }
world.info();                  // { garments: 8, slots: [{ x, y }] } (x du crochet de chaque vêtement)
```

`state` (tous les champs toujours présents ; la coque minute et adoucit, le monde ajoute balancier,
rebond et oscillations) : `view` 0..1 (portant → fiche, 1,1 s), `focus` (position continue 0..7,
−1 sans focus) et `focusOn` 0..1, `active`, `swap: { from, to, k, dir }`, `colors: int[8]`,
`dye: { garment, from, to, k }` (front de teinture), `side` 0..1 (devant → dos), `tagHover`,
`tagPulse` (incrémenté à chaque clic d'étiquette), `pointer: { x, y }` en −1..1.

## Paramètres d'URL

| Paramètre | Effet |
|---|---|
| `?q=low`, `medium`, `high`, `max` | Qualité forcée : ni test de qualité au chargement, ni régulateur |
| `?auto=1` | La visite démarre ≈ 2 s après le chargement (un clic, une touche ou la molette l'annulent) |
| `?fps=1` | Cadre en bas à droite : niveau (et changement du régulateur, ex. `q=high→medium`), densité, images par seconde, pire image |
| `?capture` | Images fixes déterministes : pas de boucle (rendu par les hooks), pas de visite, pas de test de qualité, pointeur au centre, temps figé sauf `__setTime`, niveau `high` sauf `?q` |
| `?slow=8` | Débogage : attente active de 8 ms à chaque image |
| `?gov=1` | Débogage : garde le régulateur actif avec un `?q=…` forcé |

## Qualité

| Niveau | Densité de pixels (au plus celle de l'écran) | Carte d'ombre (VSM) | Maille des vêtements | Atlas d'impressions | Tricot (normales), vernis des manches teddy |
|---|---|---|---|---|---|
| `max` | 2 | 1536 | 7,5 mm | 2048 | oui |
| `high` | 1,75 | 1024 | 8,5 mm | 2048 | oui |
| `medium` | 1,5 | 768 | 11,5 mm | 1536 | oui |
| `low` | 1 | 512 | 16 mm | 1024 | non (cintre simplifié aussi) |

- **Test au chargement** (sans `?q`) : à quatre moments (portant au repos, héros tourné,
  mi-ouverture, fiche), 14 vraies images chacun sous l'écran de chargement ; le 80e centile de
  l'intervalle entre images doit rester sous 17,4 ms (ou 1,05 fois la période de l'écran). La page
  part de `max` et descend d'un niveau tant qu'il dépasse, puis fige le niveau.
- **Régulateur** ensuite : sur les 120 dernières images, si plus de 25 % dépassent 1,5 image à
  60 Hz, un niveau de moins. Deux fois au plus, jamais vers le haut.

## Commandes

| Où | Commande | Effet |
|---|---|---|
| Portant | Survol | Le vêtement sous le pointeur se tourne de face (ressort ≈ 0,35 s), avance et se balance ; la légende suit |
| Portant | Molette, pavé tactile (deux doigts, horizontal ou vertical), `←` / `→` | Focus d'un vêtement à l'autre (90 px de geste par vêtement, posé sur le plus proche 0,17 s après la fin du geste) |
| Portant | Clic, `Entrée` | Ouvre la fiche (1,1 s) ; après un geste ou une touche, le clic ouvre le vêtement de face |
| Fiche | Clic sur une étiquette, `1` à `3` (rangée des chiffres, AZERTY compris, ou pavé numérique) | Teinture de l'ourlet au col (0,9 s) ; des clics rapides s'enchaînent sans retour en arrière |
| Fiche | DEVANT \| DOS, `Espace`, `↑`, `↓` | Demi-tour sur le crochet (0,8 s) |
| Fiche | Flèches rondes, `←` / `→` | Vêtement précédent / suivant (1 s, boucle de 8 ; chaque appui compte) |
| Fiche | FERMER ×, `Échap` | Retour au portant (1,1 s) |
| Partout | `P` | Lance ou arrête la visite ; un clic, une touche ou la molette l'arrêtent aussi |
| Boutons | À PROPOS, CONTACT, VOIR LA DISPO, VOIR LA DISPO ↗ | Toast « Démonstration : Ruelle est une marque fictive imaginée par LTNS°. » |

Le curseur système disparaît après 2 s sans mouvement et pendant la visite. Pendant l'ouverture et
la fermeture, les entrées sont ignorées, sauf en fin d'ouverture (`view` > 0,8, la fiche est
déjà à l'écran) : l'action est gardée et jouée à l'arrivée. Un bouton cliqué ne garde pas le
focus.

## Hooks de test

- `window.__ready` : `false`, puis `true` à la première image interactive (`'nogl'` sans WebGL 2).
- `window.__set(partiel)` : fusionne dans l'état et rend une image, tous les lissages posés.
- `window.__goto(nom, v)` : `'rack'` (v = position du focus, −1 sans), `'product'` (v = vêtement,
  fiche ouverte), `'open'` (v = 0..1, ouverture du héros).
- `window.__setTime(t)` : horloge du monde.
- `window.__stats()` : `renderer.info` du monde, niveau, densité, mesures du test, mode, état,
  visite, régulateur.
- `window.__world` : le monde (débogage).

## Budget mesuré

Mesuré le 11 novembre 2026 dans Chromium avec SwiftShader (rendu logiciel : les temps ne disent
rien d'un vrai GPU) : `?capture&q=…`, fenêtre 1440 × 900, une image après `__goto` / `__set` à
9 moments. Les appels sont comptés au niveau WebGL : passe principale, passe d'ombre et flou VSM
compris.

| Niveau | Portant, début d'ouverture | Fiche, fin d'ouverture, teinture, dos | Glissement (deux vêtements) | Triangles des 8 vêtements |
|---|---|---|---|---|
| `max` | 39 appels, 534 k triangles | 11 appels, 72 k triangles | 13 appels, 124 k triangles | 265 k |
| `high` | 39 appels, 436 k | 11 appels, 59 k | 13 appels, 101 k | 216 k |
| `medium` | 39 appels, 280 k | 11 appels, 38 k | 13 appels, 65 k | 138 k |
| `low` | 39 appels, 153 k | 11 appels, 21 k | 13 appels, 35 k | 75 k |

- Budget visé (≤ 80 appels, ≤ 1,2 M triangles, textures ≤ 2048, une carte d'ombre) : tenu
  partout. 24 textures, 22 géométries.
- 16 programmes (15 en `low`), tous compilés pendant le chargement : le nombre ne change à aucun
  des 9 moments mesurés.
- Les 60 images par seconde sur un vrai portable n'ont pas pu être mesurées ici : à vérifier avec
  `?fps=1` avant la démo (voir DEMO.md).

## Contenus

- Tous les textes visibles sont en français, avec l'espace fine insécable (U+202F) avant
  « ; : ! ? » et l'apostrophe typographique.
- Aucun prix, taille, stock, avis, téléphone, adresse, e-mail, lettre d'information, bandeau de
  cookies ni réseau social ; aucune vraie marque ; aucune requête réseau ni aucun suivi.
- Mention permanente : « Projet fictif · concept de site par LTNS° — ltns.fr ».
