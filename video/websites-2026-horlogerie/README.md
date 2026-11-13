# Balancier : atelier d’horlogerie en 3D (concept fictif)

Maquette **fictive** pour la vidéo TikTok « Les sites internet en 2026 » (n° 6 de la série).
Balancier, « atelier d’horlogerie · Besançon », est un atelier imaginaire : la mention en bas à
gauche, le toast des boutons « Confier ma montre » et « Prendre rendez-vous » et la dernière
section le disent. Aucun client, aucun avis, aucun prix, aucune statistique, aucune coordonnée,
aucune certification, aucune vraie marque (ni marque de montre, ni fabricant de mouvement, ni
modèle) : la montre est un dessin original.

- three.js 0.170.0. Aucune image, aucun modèle, aucun HDR externe : la montre (boîte, lunette en
  céramique, cadran soleillé, aiguilles, mouvement décoré, bracelet trois rangs), le studio, la
  marée bleue et la version saphir sont construits au chargement (géométrie procédurale, textures
  canvas, shaders).
- JS, CSS et polices tiennent dans **un seul fichier HTML**, qui marche hors ligne depuis
  `file://` (aucune requête réseau : ni `fetch`, ni XHR, ni `sendBeacon`, ni WebSocket, ni URL
  externe).
- Pas de vidéo : la démo se fait en direct. Mode d’emploi : [DEMO.md](DEMO.md).

## Construire

```bash
cd video/websites-2026-horlogerie
npm install                 # three@0.170.0 + esbuild 0.28.2
node build.mjs              # → dist/balancier.html (un seul fichier, ~970 Ko)
node build.mjs --watch      # reconstruit à chaque modification de src/ (npm run watch)
WORLD=stub OUT=../.cache/balancier-stub.html node build.mjs   # la coque avec le monde simplifié
node tools/harness.mjs tools/harness-watch/entry.js .cache/harness-watch.html     # page de test de la montre
node tools/harness.mjs tools/harness-studio/entry.js .cache/harness-studio.html   # studio, marée, saphir
```

`OUT` donne le fichier produit, relatif à `dist/` : sans lui, une construction `WORLD=stub`
remplacerait `dist/balancier.html` ; `dist/` ne contient que `balancier.html`, les essais vont
dans `.cache/`. Pas de serveur : ouvrir `dist/balancier.html` directement. `dist/`, `.cache/` et
`node_modules/` sont ignorés par git. Les polices (Cormorant SC 500/600/700, EB Garamond
400/500/600 et italique 400/500, JetBrains Mono 400/500) et leurs licences OFL sont dans
`src/fonts/` ; `tools/fonts.mjs` les injecte en base64 à la place du marqueur `/*@FONTS@*/` de
`style.css`. Le fichier construit garde la notice MIT de three.js.

## Structure

| Chemin | Rôle |
|---|---|
| `build.mjs` | esbuild (IIFE minifiée), puis CSS et polices injectés dans `src/index.html` (`<!--@STYLE@-->`, `<!--@SCRIPT@-->`) → `dist/balancier.html` |
| `src/story.js` | **Source unique du récit** : écrans de défilement, chapitres, phases 3D, fenêtres des textes, ton du bandeau, arrêts des touches |
| `src/texts.js` | **Tous les textes visibles**, en typographie française (U+202F avant `:` `;` `!` `?` et dans « », apostrophe ’), et les inscriptions de la montre (`WATCH_PRINT`) |
| `src/world/layout.js` | **Mesures de la montre** (mm ; +Z sort du cadran, +Y vers 12 h, +X vers 3 h), ligne éclatée `PARTS` (position sur l’axe, étiquette au-dessus ou au-dessous), heure affichée, couleurs |
| `src/index.html`, `src/style.css` | Structure : bandeau, textes, étiquettes des pièces, rail, section « Rendez-vous » et fiche d’atelier, toast, chargement, message sans WebGL 2 |
| `src/main.js` | Rendu, chargement, test WebGL 2, test de qualité puis régulateur, défilement → `p`, touches, menu et rail, visite, coupure sous voile, curseur, hooks |
| `src/scroll.js` | Défilement virtuel (ressort amorti critique ω 4,4, vraie hauteur de page, barre cachée), glissements programmés, fin magnétique |
| `src/ui.js`, `src/tick.js`, `src/util.js` | Couche DOM image par image (ton, chapitre, textes, étiquettes ancrées aux pièces, rail et son rubis, « Rendez-vous », fiche, toast) ; titres qui apparaissent mot à mot au rythme d’un balancier à 4 Hz ; petites fonctions communes |
| `src/tour.js` | La visite (`P`, `?auto=1`) : clés de temps tirées de `STOPS`, ≈ 26 s |
| `src/world/index.js` | L’intégrateur : une seule caméra (continue en `p`), chorégraphie, lignes éclatées ajustées à la fenêtre, ancres, qualité, préchauffage |
| `src/world/watch/` | La montre : boîte et couronne, lunette, glace, cadran et aiguilles, mouvement (balancier à 4 Hz, spiral, ancre, rouage, rotor), bracelet et fermoir, textures canvas |
| `src/world/studio/` | Le studio : environnements (clair, nuit), fond, marée (ligne de vague), jumeau saphir, ombres, lumières |
| `src/world-stub/index.js` | Monde simplifié, même contrat (`WORLD=stub`) |
| `tools/` | `fonts.mjs` (polices en base64), `harness.mjs` et `harness-watch/`, `harness-studio/` (pages de test des modules, sorties dans `.cache/`) |

Chaque module documente son API en tête de son `index.js` (le studio : en tête de `studio.js`).

## Le récit : `src/story.js`

La page fait `SCREENS` (15) hauteurs d’écran de récit épinglé, puis la section « Rendez-vous »
(au moins un écran). Le défilement donne `p` (0..1, adouci) : `p` 0 → `STORY_END` (0,9) pour le
récit 3D, 0,9 → 1 pour la section blanche qui monte par-dessus le canevas.

- `CHAPTERS` : démontage 0–0,06, remontage 0,06–0,4, atelier 0,4–0,56, transparence 0,56–0,78,
  restauration 0,78–0,9, rendez-vous 0,9–1 (menu, rail, chapitre courant).
- `PHASES` : fenêtres de la chorégraphie 3D : ligne éclatée, assemblage, vue de face, retournement
  autour de la couronne, gros plan sur le balancier, montre couchée sur son bracelet, marée
  (0,38–0,44), montre saphir qui tourne, nouvelle ligne éclatée, glissé le long des pièces,
  remontage, retour à l’acier (balayage inverse), studio de nuit, sortie.
- `BEATS` : `[début du fondu, plein, début de sortie, fin]` de chaque texte ; les mots du titre
  montent un à un au rythme d’un balancier à 4 Hz (un mot toutes les 125 ms de la progression
  du texte) : remonter les cache, le rendu reste une fonction de `p`.
- `TONE` : texte sombre sur le studio clair et la fin, clair sur le bleu. Pendant la marée, le
  bandeau suit la ligne de vague (`anchors().tide.y`) : `TONE` (0,431) n’est que le repli.
- `STOPS` : arrêts de `↓` / `↑` et des pauses de la visite (0, 0,17, 0,29, 0,372, 0,5, 0,62,
  0,75, 0,84, 1). Le menu et le rail vont à l’arrêt le plus proche du milieu du texte du
  chapitre (01 → 0, 02 → 0,17, 03 → 0,5, 04 → 0,62, 05 → 0,84).

Les durées, les positions et les textes se changent **là**, jamais dans une copie.

## Contrat du monde

La coque n’appelle que `src/world/index.js` (même contrat dans `src/world-stub/index.js`) :

```js
const world = await createWorld({ renderer, quality, onProgress }); // 'low' | 'medium' | 'high' | 'max'
world.update({ p, pointer: { x, y } }, dt, time); // fonction pure de p (+ time : trotteuse, balancier, rotor, flottement, vague, reflets)
world.render();               // un seul renderer.render
world.resize(w, h, dpr);      // le monde règle lui-même setPixelRatio et setSize
await world.warmup();         // rend 13 étapes sous le chargement (les deux jumeaux, les deux environnements)
world.setQuality(level);      // note le niveau ; la géométrie est refaite au warmup() suivant
world.stats();                // { calls, triangles, textures, geometries, programs, stage, level, e, b, lineDist }
world.anchors();              // px CSS : { labels: [13 × { id, x, y, side, visible, box }], watch: { x, y, r, visible }, tide: { y } }
world.info();                 // { stage: 'studio' | 'tide' | 'blue' | 'night' }
world.camera;
```

`dt >= 0,5` signifie « saut » (hooks, `?capture`). Les étiquettes suivent l’ordre de
`layout.js PARTS` ; `box` est la boîte de la pièce à l’écran, `visible` exige la ligne déployée et
cadrée en entier. `tide.y` vaut -1 hors de la marée. La coque appelle `anchors()` à chaque image
(≈ 120 projections, sans allocation) : étiquettes, bloc « Transparence », ton de la mention et du
rail, voile du nom de chapitre du rail quand la montre ou une étiquette passe dessous. Elle saute
le rendu quand « Rendez-vous » couvre toute la fenêtre. `setQuality` ne refait la géométrie qu’au
`warmup()` suivant, que la coque n’appelle que sous le chargement : après le chargement, le
régulateur ne change que la densité de pixels (pas d’à-coup de 130 à 220 ms).

## Paramètres d’URL

| Paramètre | Effet |
|---|---|
| `?q=low`, `medium`, `high`, `max` | Qualité forcée : ni test au chargement, ni régulateur |
| `?auto=1` | La visite démarre ≈ 2 s après le chargement (un clic, une touche ou un défilement l’annulent) |
| `?fps=1` | Cadre en bas au centre : niveau (et changement du régulateur, ex. `q=high→medium`), densité, images par seconde, pire image ; les messages `[Balancier]` de la console ne sortent qu’avec lui |
| `?capture` | Images fixes déterministes : pas de boucle (rendu par les hooks), pas de visite, pas de test de qualité, pointeur au centre (pas de parallaxe), temps figé sauf `__setTime`, niveau `high` sauf `?q` |
| `?slow=8` | Débogage : attente active de 8 ms à chaque image |
| `?gov=1` | Débogage : garde le régulateur actif avec un `?q=…` forcé |

## Hooks (toujours présents)

- `window.__ready` : `true` quand la page répond, `'nogl'` sans WebGL 2.
- `window.__setProgress(p)` : saute à `p` et pose tous les lissages ; `window.__goto(nom, v)` avec
  `nom` = `'demontage'`, `'remontage'`, `'atelier'`, `'transparence'`, `'restauration'` ou
  `'rendezvous'` et `v` = 0..1 dans le chapitre.
- `window.__setTime(t)` : le temps des mouvements d’ambiance (rendu immédiat en `?capture`).
- `window.__stats()` : `renderer.info` (appels, triangles, textures, géométries, programmes),
  niveau, densité, niveaux mesurés, `p`, chapitre, étape, visite, fiche posée, ancres,
  régulateur, et les `stats()` du monde (`e` éclatement, `b` bracelet).
- `window.__world` (le monde, dont `shot()` pour la caméra) et `window.__layout()` (hauteurs).

## Commandes

| Entrée | Effet |
|---|---|
| Molette, pavé tactile, toucher, barre de défilement | Défilement adouci (ressort ω 4,4) ; arrêté un peu avant la fin après un geste vers le bas (moins de 0,45 écran), la page finit seule (pause 0,35 s, glissement 0,6 s) |
| `↓`, `PageDown`, `Espace` / `↑`, `PageUp`, `Maj` + `Espace` | Arrêt suivant / précédent (`STOPS`) ; une touche tenue n’agit qu’une fois |
| `Home` / `End` (`Début` / `Fin`) | Début / fin de la page : au-delà de 6 écrans, une coupure sous un voile gris (≈ 0,6 s) au lieu d’un long glissement |
| Menu (01 Démontage … 05 Restauration), points du rail, logo | Glissement vers le chapitre (le logo : vers le début) ; même coupure sous voile vers le début ou la fin s’ils sont loin |
| « Revoir le démontage ↑ » | Retour au début (coupure sous voile) |
| « Confier ma montre », « Prendre rendez-vous » | Toast « Démonstration : Balancier est un atelier fictif imaginé par LTNS°. » (3,6 s) |
| `P` | Visite automatique (≈ 26 s, jusqu’au tampon « Prête » de la fiche) ; `P`, un clic, une touche ou un défilement l’arrêtent (ce clic ou cette touche ne font rien d’autre) ; lancée loin du début, elle repart du début après un fondu |

`F1`–`F12`, `Maj`, `Tab`, les raccourcis `Ctrl` / `Cmd` / `Alt` et les touches multimédia restent
au navigateur (même pendant la visite). Un pincement ne zoome pas et ne fait pas défiler. Le
curseur se cache après 2 s sans mouvement et pendant la visite ; il revient sur un clic ou un
vrai mouvement (plus de 6 px depuis le début du geste ; le premier événement après un chargement
ne compte pas). Contexte WebGL perdu : message après 3 s s’il ne revient pas ; s’il revient, la
page se recharge.

## Qualité et budget

| Niveau | Densité (au plus celle de l’écran) | Cube d’environnement | Segments des pièces rondes | Textures du cadran / de la lunette | Matières |
|---|---|---|---|---|---|
| `max` | 2 | 512 | 192 | 2048 / 2048 | complètes |
| `high` | 1,75 | 256 | 128 | 2048 / 1024 | complètes |
| `medium` | 1,5 | 256 | 96 | 1024 / 512 | complètes |
| `low` | 1 | 128 | 64 | 1024 / 512 | sans iridescence (glace, vis bleuies), sans reflet satiné des rubis, sans vernis du cadran |

Les textures, le cube d’environnement et les matières de `low` se décident à la création du
monde : sans `?q`, la page crée tout en `max`, puis le test peut baisser la densité et la
géométrie. Avec `?q=low`, tout est créé directement au niveau bas.

- **Test au chargement** (sans `?q`) : dix moments (la ligne éclatée, l’assemblage, le balancier,
  la marée avec les deux montres, l’atelier, la ligne de verre, le glissé, le remontage, le
  balayage inverse, la nuit), 14 vraies images chacun sous l’écran de chargement ; le 80e
  centile de l’intervalle doit rester sous 17,4 ms (ou 1,05 fois la période de l’écran). La page
  part de `max` et descend d’un niveau tant qu’il dépasse (pendant le test, seule la densité
  change ; la géométrie du niveau retenu est refaite au préchauffage final).
- **Régulateur** ensuite : sur 120 images, si plus de 25 % dépassent 1,5 image d’écran, un niveau
  de moins (densité seulement), deux fois au plus, jamais vers le haut (redimensionnements et
  section « Rendez-vous » ignorés).

**Mesuré** (1440 × 900, `?capture&q=…`, `renderer.info` d’une image ; appels / triangles) :

| Étape | p | `low` | `high` | `max` |
|---|---|---|---|---|
| Ligne éclatée | 0 | 58 / 82,1 k | 58 / 104,5 k | 58 / 132,6 k |
| Assemblage | 0,1 | 60 / 82,1 k | 60 / 104,5 k | 60 / 132,6 k |
| Vue de face | 0,17 | 60 / 82,1 k | 60 / 104,5 k | 60 / 132,6 k |
| Balancier (gros plan) | 0,29 | 57 / 81,7 k | 57 / 103,7 k | 57 / 131,3 k |
| Montre couchée | 0,38 | 61 / 82,1 k | 61 / 104,5 k | 61 / 132,6 k |
| Marée (acier + saphir) | 0,41 | 114 / 162,3 k | 114 / 205,5 k | 114 / 259,9 k |
| Atelier (saphir) | 0,5 | 52 / 80,0 k | 52 / 100,3 k | 52 / 126,1 k |
| Ligne de verre | 0,62 | 54 / 80,2 k | 54 / 100,9 k | 54 / 127,2 k |
| Glissé | 0,68 | 35 / 71,9 k | 35 / 88,4 k | 35 / 109,6 k |
| Remontage en verre | 0,75 | 54 / 80,2 k | 54 / 100,9 k | 54 / 127,2 k |
| Balayage inverse (acier + saphir) | 0,8 | 109 / 161,9 k | 109 / 204,3 k | 109 / 257,5 k |
| Nuit | 0,84 | 58 / 81,9 k | 58 / 103,9 k | 58 / 131,4 k |
| Sortie | 0,95 | 59 / 81,9 k | 59 / 104,3 k | 59 / 132,4 k |

16 textures et 60 géométries partout ; 25 programmes en `high` et `max`, 23 en `low` (matières
simplifiées), le même nombre à chaque `p` : rien ne compile après le chargement (vérifié aussi sur
un chargement normal, avant et après un parcours de toute l’histoire). `medium` se place entre
`low` et `high` (≈ 98 k triangles pour la montre).

Budget : 200 appels et 1 M de triangles par image, textures de 2048 au plus. Le pire cas est la
marée et le balayage inverse, où la montre d’acier et son jumeau saphir sont dessinés tous les
deux. Le vrai coût est le remplissage : le saphir (4 à 8 couches transparentes sur la montre) en
densité 2. Les cadences n’ont été mesurées qu’en SwiftShader (logiciel) : à vérifier une fois avec
`?fps=1` sur le portable du tournage.

## Reste connu (mineur, non corrigé)

- **Cadences** : tout a été mesuré en SwiftShader (rendu logiciel). Une passe `?fps=1` reste à faire
  sur le portable du tournage, en 1440 × 900 : le saphir en densité 2 (chapitres 03 et 04), les
  deux montres pendant la marée et le balayage inverse.
- **Retournement** (p 0,19–0,265) : c’est le mouvement le plus rapide au défilement à la main
  (environ 200° de caméra par écran, la boîte traverse jusqu’à 1,7 hauteur d’écran par écran de
  défilement à p 0,24–0,26). La visite le joue plus lentement. S’il fouette à l’image, allonger
  `PHASES.turnOver`.
- **Marée, vue de côté** (p 0,415–0,43) : une bande blanche traverse la montre saphir couchée
  (la glace et le cadran vus par la tranche).
- **Glissé** (p 0,70–0,72) : la bande du fermoir en verre passe derrière la mention en bas à
  gauche (lisible grâce à son halo), et une roue en verre vue de face y paraît presque blanche un
  instant (p ≈ 0,71).
- **Acier de nuit** : ses reflets restent un peu bleus (|R−B| 22 à 29 sur la couronne, les cornes
  et le bracelet).
- **Préchauffage** : environ 25 programmes compilés d’un bloc ; sous Windows (D3D), le balancier
  du chargement peut marquer un arrêt. `renderer.compileAsync` par étape le rendrait fluide.
- **Test de qualité** : les niveaux inférieurs sont mesurés avec la géométrie du niveau de départ
  (seule la densité change pendant le test) ; la géométrie du niveau retenu est refaite ensuite.
- **`?capture`** : les images 3D sont identiques d’un historique et d’un chargement à l’autre ;
  seuls 3 pixels au bord d’un point du rail varient (jusqu’à 27 niveaux sur 255), un effet de
  composition du navigateur (classes et styles du DOM identiques, à l’ordre des classes près).
- **Curseur** : sous SwiftShader, une image dessinée dure près d’une seconde et retarde les
  événements de la souris ; la règle de la rafale (6 px en moins de 250 ms) n’est vérifiable ici
  qu’en sautant le dessin. À revoir une fois avec une vraie souris, comme la parallaxe (±0,7° et
  ±0,45°, vérifiée dans le code seulement).
- **1280 × 720** : quand le texte de la restauration a fini de s’effacer (p 0,888), la montre qui
  monte passe à 16 px de l’endroit où étaient les cartes (au moins 41 px tant qu’elles se voient).
- **`src/world-stub/index.js`** garde ses anciennes clés de caméra : il se construit et respecte
  le contrat, mais son cadrage ne suit plus les `PHASES` actuelles (il ne sert qu’aux essais de la
  coque).
- **Nom de chapitre du rail** (p 0,565–0,58) : pendant que la montre en verre se démonte, « 04
  Transparence » reste affiché quelques instants devant la bande du bracelet puis devant la
  glace, avant de s’effacer à 0,598 (lisible ; la règle du voile ne regarde que la boîte et les
  étiquettes).
- **Gros plan sur le balancier** (p 0,27–0,31) : la boîte, cadrée de très près, passe sous le
  bandeau du haut (le voile du bandeau garde le menu lisible) ; c’est voulu, comme le recadrage de
  la boîte à droite.
