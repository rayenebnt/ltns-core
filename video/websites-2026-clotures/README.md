# Cordeau : site de poseur de clôtures en 3D au scroll (concept fictif)

Maquette **fictive** d'un site de poseur de clôtures en 3D pour la vidéo TikTok « Les sites
internet en 2026 » (format repris de @wearebrand.io, n° 3 de la série). Cordeau, « clôtures en
Touraine », est une entreprise imaginaire : la mention en bas à gauche, la dernière section, le
toast des boutons de devis et la ligne « Prix fictifs, pour la démonstration. » le disent.

- three.js 0.170.0, aucune image, aucun modèle ni HDR externe : ciel, jardin, maison de maître,
  arbres, herbe, bois, clôtures et tempête sont construits et texturés au chargement (canvas,
  shaders).
- JS, CSS et polices tiennent dans **un seul fichier HTML** qui marche hors ligne depuis `file://`.
- Pas de vidéo : la démo se fait en direct. Mode d'emploi pour la démo : [DEMO.md](DEMO.md).

## Construire

```bash
cd video/websites-2026-clotures
npm install                 # three@0.170.0 + esbuild 0.28.2
node build.mjs              # → dist/cordeau.html (un seul fichier, ~890 Ko)
node build.mjs --watch      # reconstruit à chaque modification de src/ (npm run watch)
WORLD=stub node build.mjs   # la coque avec un monde 3D simplifié (src/world-stub), pour travailler l'interface
```

Pas de serveur : ouvrir `dist/cordeau.html` directement. `dist/`, `.cache/` et `node_modules/`
sont ignorés par git. Les polices (Instrument Serif, Inter Tight) et leurs licences OFL sont dans
`src/fonts/` ; `build.mjs` les injecte en base64 à la place du marqueur `/*@FONTS@*/`.

## Structure

| Chemin | Rôle |
|---|---|
| `build.mjs` | esbuild (IIFE minifiée), puis CSS et polices injectés dans `src/index.html` → `dist/cordeau.html` |
| `src/index.html`, `src/style.css` | Tous les textes, la navigation, les HUD au-dessus de la 3D, les sections, le chargement, le voile des longs sauts, le message sans WebGL 2 |
| `src/main.js` | Rendu, chargement, test de qualité puis régulateur, défilement, commandes (clavier, liens, onglets), voile, lectures auto, curseur, hooks de test |
| `src/scroll.js` | Défilement virtuel : la barre native reste vraie, la page suit par un ressort critique (ω = 4,4) |
| `src/layout.js` | Géométrie de la page : segments épinglés, `sceneAt` (état du monde pour une position), `posOf`, surface claire / sombre / 3D sous une ligne d'écran, fenêtre du chapitre 2 |
| `src/ui.js` | Interface image par image : moments du chapitre 1, carnet de chantier, onglets et carte des modèles, points chauds de la réparation, couleurs de la navigation, barre de devis, toast |
| `src/autoplay.js` | Clés des lectures : visite complète (`P`, `?auto=1`), « REGARDER LA POSE », « VOIR LA RÉPARATION » |
| `src/estimator.js`, `src/pricing.js` | Calculateur du chapitre 3 (dessin SVG en direct) et modèle de prix |
| `src/styles-data.js`, `src/format.js` | Données des cinq modèles, typographie française (espaces fines insécables, virgule décimale) |
| `src/world/index.js` | Le monde vu par la coque : trajectoires de caméra, préréglages de lumière, finale dorée, fenêtre du chapitre 2, préchauffage, points d'ancrage, qualité |
| `src/world/grade.js` | Étalonnage photographique dans l'étape de tone mapping (aucune passe en plus) |
| `src/world/garden/` | Ciel et perspective aérienne, préréglages « ete », « orage », « eclaircie », sol et pelouse, brins d'herbe instanciés, arbres, haies, maison de maître, campagne |
| `src/world/fences/` | Clôture neuve (cinq types, pose du chapitre 1, balayage du chapitre 2), matériel du chantier, vieille clôture et réparation du chapitre 4, matériaux et textures |
| `src/world-stub/index.js` | Monde simplifié de même API (`WORLD=stub`) |
| `tools/harness.mjs`, `tools/harness-*` | Pages de test des modules 3D seuls |

## Le monde 3D

- **Caméra** : une trajectoire par chapitre. L'œil suit une courbe de Catmull-Rom centripète
  passant par les poses clés (et, entre les lames et la finale, deux points de passage au-dessus
  de la clôture), parcourue à l'abscisse curviligne ; cette abscisse est une cubique monotone de
  la progression (pentes de Fritsch-Carlson). La caméra ralentit sur chaque moment mais ne
  s'arrête jamais entre la première et la dernière clé. Champ vertical : 45° au chapitre 1, 42°
  ensuite (à 16:10).
- **Lumière** : « ete » (fin de matinée d'été, perspective aérienne), « orage » (couvert clair,
  herbe mouillée) puis « eclaircie » sur la fin de la réparation (0,70 → 1). Fin du chapitre 1
  (0,80 → 1) : soleil plus bas et plus chaud, par uniformes seulement.
- **Une passe** : une seule lumière avec ombre (sa caméra d'ombre suit la vue), MSAA, feuilles en
  alpha-to-coverage, tout le reste en géométrie fusionnée ou instanciée.
- **Écart au contrat** : le portillon de la vieille clôture est à z −8,4 … −7,2 (`GZ` dans
  `src/world/fences/repair.js`) et non à 0 … 1,2, pour que, vu du jardin, la branche et la travée
  cassée soient à gauche et le portillon à droite, comme dans la référence.

## Paramètres d'URL

| Paramètre | Effet |
|---|---|
| `?q=low`, `medium`, `high`, `max` | Qualité forcée (le régulateur est alors coupé) |
| `?auto=1` | Visite complète, lancée une fois l'accueil affiché en entier |
| `?fps=1` | Affichage en coin : niveau (et changement du régulateur, ex. `q=high→medium`), densité, images par seconde, pire image |
| `?capture` | Rendu à la demande, déterministe : ni boucle, ni test de qualité, ni régulateur (captures) |
| `?t=3` | Horloge figée (vent, nuages, respiration de la caméra) |
| `?warm=0` | Saute le préchauffage (captures de mise au point seulement) |
| `?slow=8` | Débogage : attente active de 8 ms à chaque image |
| `?gov=1` | Débogage : garde le régulateur actif même avec un `?q=…` forcé |

## Qualité

| Niveau | Densité de pixels (au plus celle de l'écran) | Carte d'ombre | Feuilles dessinées | Herbe (rayon, densité) |
|---|---|---|---|---|
| `max` | 2 | 4096 | 90 % | 17 m, 100 % |
| `high` | 1,75 | 2048 | 76 % | 14 m, 80 % |
| `medium` | 1,5 | 2048 | 58 % | 10,5 m, 60 % |
| `low` | 1 | 1024 | 45 % | 7 m, 40 % |

Les cartes de feuilles grandissent un peu quand elles sont moins nombreuses. En `low`, la litière
de la tempête s'éclaircit et le grillage du ranch ne projette plus d'ombre.

- **Test au chargement** (sans `?q`) : à six moments lourds, la page dessine de vraies images
  (3D et interface : carnet, carte, barre de devis, verre dépoli) sous l'écran de chargement et
  garde le 80e centile de l'intervalle entre images. Elle descend d'un niveau tant qu'il dépasse
  17,4 ms (ou 1,05 fois la période de l'écran si elle est plus longue), puis fige le niveau.
- **Régulateur** ensuite : sur les 120 dernières images où la 3D est visible, si plus de 20 %
  dépassent 1,5 image à 60 Hz, la page descend d'un niveau, quand une section couvre la 3D
  (tout de suite si plus de 45 % sont lentes). Deux fois au plus, jamais vers le haut.

## Commandes

| Commande | Effet |
|---|---|
| Défilement | Toute l'histoire ; le ressort laisse la page glisser moins d'une seconde après le geste |
| `↓`, `Espace`, `Page suivante` / `↑`, `Maj` + `Espace`, `Page précédente` | Moment suivant / précédent |
| `Début` / `Fin` | Haut / bas de page |
| `←` / `→`, onglets | Modèle précédent / suivant au chapitre 2 (la position de la page suit, défilement et onglets sont toujours d'accord) |
| `P` | Visite complète (22 s environ), ou l'arrête ; un défilement, une touche ou un toucher l'arrêtent aussi |
| « ▶ REGARDER LA POSE » / « ▶ VOIR LA RÉPARATION » | Joue le chapitre 1 (7 s) / le chapitre 4 (6 s) |
| Liens POSE, MODÈLES, TARIFS, RÉPARATIONS, logo, « Revoir la pose », « Voir les tarifs », « Chiffrer cette clôture » | Glissement vers la section ; au-delà de 2,5 écrans, fondu (crème ou encre selon la destination), saut, puis glissement sur le dernier 0,8 écran |
| Boutons de devis et de réservation, « DEVIS GRATUIT » | Toast « Démonstration : Cordeau est une entreprise fictive imaginée par LTNS°. » |

Le curseur système disparaît après 2 s sans mouvement ; tant qu'il est caché, aucun bouton ne
prend l'état de survol. Un bouton cliqué ne garde pas le focus (les flèches restent à la page).

## Hooks de test

- `window.__ready` : `false`, puis `true` après la première image (`'nogl'` sans WebGL 2).
- `window.__setProgress(P)` : saute à la progression P de toute la page et rend l'image.
- `window.__goto(nom, v)` : `install` (v = p), `white`, `intro2` (v = ouverture de la fenêtre),
  `styles` (v = type, une fraction = en plein balayage), `pricing`, `intro4`, `repair` (v = p),
  `final`.
- `window.__setTime(t)` : horloge du monde.
- `window.__stats()` : appels de rendu, triangles, textures, géométries, programmes, niveau,
  densité, mesures du test, état du régulateur, position, état envoyé au monde.
- `window.__world`, `window.__layout()`, `window.__estimate()` : débogage.

## Budget mesuré

Mesures du 11 novembre 2026 dans Chromium avec SwiftShader (rendu logiciel : les temps ne disent
rien d'un vrai GPU), `renderer.info` après `__goto`, 18 moments de l'accueil à la fin de la
réparation. Les appels comprennent la passe d'ombre.

| Niveau | Appels de rendu | Triangles | Cartes de feuilles |
|---|---|---|---|
| `max` | 23 à 35 | 347 k à 639 k | 43,5 k |
| `high` | 23 à 35 | 323 k à 503 k | 36,8 k |
| `medium` | 23 à 35 | 294 k à 406 k | 28,1 k |
| `low` | 22 à 34 | 267 k à 352 k | 21,8 k |

- Le maximum d'appels est la finale du chapitre 1 : le soleil bas fait entrer plus d'objets dans
  la passe d'ombre.
- 39 textures, 55 géométries, 28 programmes, tous compilés et envoyés au GPU pendant le
  chargement : aucun programme n'est créé pendant le défilement.
- Les 60 images par seconde sur un portable à GPU intégré n'ont pas pu être mesurées ici : à
  vérifier avec `?fps=1` avant la démo (voir DEMO.md).

## Contenus

- Tous les textes visibles sont en français, avec l'espace fine insécable (U+202F) avant
  « ; : ! ? », dans les guillemets, comme séparateur de milliers et avant « € » et les unités.
- Aucun téléphone, adresse, e-mail, SIRET, avis client, label ni marque de fournisseur réelle ;
  aucune personne ni aucun animal en 3D ; aucune requête réseau ni aucun suivi.
- Mention permanente : « Projet fictif · concept de site par LTNS° — ltns.fr ».
