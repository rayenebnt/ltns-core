# Vrai projet 03 · Swatter TV : « Ces montagnes n'existent pas. »

Vidéo TikTok 1080 × 1920, 30 i/s, en boucle. Concept validé : `../concepts.json`, `final.videos[n = 3]`.
Projet : la **maquette animée de la refonte** de Swatter TV & Info (web TV locale de Thyez, Haute-Savoie), client de LTNS°
(devis accepté, acompte payé). Les paysages de la maquette sont des **rendus 3D provisoires** calculés par `render.c`
(316 lignes), en attendant les images de la chaîne. Dépôt : `/home/user/rayenebnt/swatter-tv` (jamais modifié :
maquette servie en lecture seule, `render.c` compilé depuis une copie).

## Ce qu'on voit (tout vient du vrai projet)

| Moment | À l'écran | Source |
|---|---|---|
| Image 0 → 0,5 s | Le vrai héros mobile de la maquette (390 × 844 @3, ramené à 1080 de large, barre d'onglets hors cadre) : zoom lent et neige réels, logo, badges, « Mont-Blanc, le toit de l'Europe ». Titre fixe « CES MONTAGNES / N'EXISTENT PAS. » (« n'existent pas. » en dégradé or de la charte), les mots s'allument au rythme de la voix. | `assets/hero/full/` (vraie capture) |
| 0,5 → 1 s | L'interface se détache en 3D et s'envole (13 calques capturés un par un) ; le dégradé du héros se lève, il reste la montagne. | `assets/hero/plate/`, `assets/hero/ui-*.webp`, `hero-crepuscule.webp` |
| 1 → 2 s | Poussée macro sur l'arête (la vraie image `hero-crepuscule.webp`, même cadrage et même zoom lent que la maquette). | `assets/hero/hero-crepuscule.webp` |
| 2 → 3 s | Le paysage se « dé-calcule » : vrais rendus de `render.c` en 540 × 960, 270 × 480, 135 × 240, 68 × 120 (affichés sans lissage). | `assets/render/p0-*.webp` |
| « Elles sortent de 316 lignes de code » | Le vrai fichier `render.c` défile (316 lignes, ligne 1 « Rendu de paysages alpins par raymarching… »), compteur 000 → 316. Puis le code devient image : la montagne apparaît dans les lettres, puis 68 × 120 → 1080 × 1920. Tampon « Calculé, pas photographié ». | `assets/render.c.txt`, `assets/render/` |
| « Même sommet, 8 lumières » | Les 8 préréglages de `render.c` (même caméra, même graine), 0,12 s chacun, repère « même sommet », puis la grille 2 × 4 « 1 montagne · 8 lumières ». | `assets/render/p0…p7.webp` |
| « C'est la maquette du nouveau site… » | La case 0 devient un téléphone vectoriel sans marque : l'interface de la maquette y revient, reflet sur « nouveau site », le logo s'entoure d'or sur « télé locale », zoom sur le badge HAUTE-SAVOIE qui pulse. Pastille « Maquette · rendus 3D provisoires ». | maquette reconstruite avec ses propres fichiers + calques capturés |
| « …en attendant les images de la chaîne » | Plein cadre : travelling avant calculé par `render.c` (48 images 1080 × 1920). | `assets/render/dolly/` |
| « Autour, le direct » | Retour au téléphone : la vraie capture du carrousel (la barre finit de se remplir, anneau rouge sur EN DIRECT), puis il passe tout seul à « La nuit du loup ». | `assets/phone/carousel/` |
| « le programme » | Programme TV : la grille glisse jusqu'à la ligne dorée « maintenant » qui traverse la carte EN COURS. | `assets/phone/prog/` |
| « le top 10 » | Top 10 : le rail glisse, grands chiffres dorés 1, 2, 3, 4. | `assets/phone/top/` |
| « comme sur une appli de streaming » | Ordinateur vectoriel : la version 1280 × 720 de la maquette, le carrousel passe de « Mont-Blanc » à « La nuit du loup ». | `assets/desk/` |
| Fin | Nuit étoilée (préréglage 1) avec la neige : « TU LES AURAIS PRISES POUR DES VRAIES ? » (« vraies » en or), puis « Devis gratuit sous 48 h · lien en bio », « Partout en France **à distance** / sur place en Île-de-France », « LTNS° » et « Maquette · rendus 3D provisoires ». | `assets/render/p1.webp` |
| Boucle (dernière seconde) | La nuit redevient crépuscule sur le même sommet, plongée dans le héros, l'interface retombe à sa place, le titre revient : la dernière image est l'image 0 (même plaque, la capture continue). | `assets/render/p0.webp`, `assets/hero/` |

Effets de montage, jamais présentés comme le comportement du site : envol de l'interface, dé-calcul, code qui devient image,
grille, téléphone et ordinateur vectoriels, anneaux et reflets.

**Masqué dans les captures (CSS injecté, rien d'autre n'est changé)** : le bandeau Flash info (faits divers), la note « 4,5 ★ »
et le nombre de vues (version ordinateur), les cartes météo (« ° »). Jamais ouverts ni montrés : `devis/`, `factures/`,
`tampon/`, la page « Le groupe », l'admin, les webcams, les vraies vignettes de la chaîne. Le logo est la reconstitution du logo
de la chaîne faite pour la maquette : la vidéo ne dit jamais que LTNS° l'a créé. Rien ne dit que le site est en ligne.

## Timing et voix

`SENTENCES` = le texte ElevenLabs découpé sur `[pause]` / `[long pause]` (6 phrases), sous-titres mot à mot affichés par
segment de phrase. Chaque temps fort est accroché à un mot (`CUES` et `derive()`), sauf l'accroche 0–3 s et la dernière
seconde (retour à l'image 0). Sans voix, le moteur estime le minutage (brouillon ≈ 23,8 s ; avec la voix ≈ 19 s, comme le
concept). Avec la voix (`vrai-projet-03.mp3` découpé sur les silences en `voice/01.mp3` … `06.mp3`) :

```bash
python3 video/commun/sync-voice.py video/vrais-sites/v03-swatter-montagnes   # écrit timing.json, envelope.json, voice.mp3, voice-files.js
```

## Régénérer les images

```bash
# 1. la maquette en local (dans un autre terminal ; tuer ce serveur par son PID ensuite)
python3 -m http.server 8733 --bind 127.0.0.1 --directory /home/user/rayenebnt/swatter-tv/maquette
# 2. captures en temps virtuel (≈ 7 min) : héros @3 (plaque, images complètes), calques isolés, carrousel, Programme TV, Top 10, ordinateur
node video/vrais-sites/v03-swatter-montagnes/scripts/capture-maquette.mjs /tmp/v03-raw
# 3. paysages calculés par render.c (copie compilée hors du dépôt, ≈ 6 min sur 4 cœurs)
bash video/vrais-sites/v03-swatter-montagnes/scripts/render-landscapes.sh /tmp/v03-render
# 4. conversion en WebP dans assets/ (+ hero-crepuscule.webp, render.c, police Outfit OFL de la maquette)
python3 -I video/vrais-sites/v03-swatter-montagnes/scripts/prepare-assets.py /tmp/v03-raw /tmp/v03-render/out
```

`capture-maquette.mjs` : horloge Playwright + animations CSS calées image par image, hasard figé (la neige tombe pareil d'une
passe à l'autre, donc la plaque, l'image complète et les calques se superposent exactement). Assets ≈ 19 Mo, tout est versionné.

## Rendu

```bash
# serveur du dépôt sur le port 8765 (s'il ne répond pas déjà)
setsid nohup python3 -m http.server 8765 --directory /home/user/ltns-core >/dev/null 2>&1 &
node video/commun/render.mjs video/vrais-sites/v03-swatter-montagnes     # → ltns-v03-swatter-montagnes.mp4 (ignoré par git)
node video/vrais-sites/v03-swatter-montagnes/scripts/frames.mjs /tmp/v03-frames --step=0.5   # images fixes pour vérifier
```

## Publication

**Accord bloquant** : OK écrit de Swatter TV pour montrer la maquette avant la mise en ligne (le logo est visible dès l'image 0).
Étiquette « Contenu généré par IA » activée (voix clonée). Couverture : l'image 0.

**Légende**

> Ces montagnes n'existent pas : 316 lignes de code les calculent, même sommet, 8 lumières. C'est la maquette du nouveau site de Swatter TV, télé locale de Haute-Savoie, faite à distance par LTNS°. Rendus 3D provisoires, en attendant les images de la chaîne. Tu les aurais prises pour des vraies ? Partout en France à distance, sur place en Île-de-France · devis gratuit sous 48 h, lien en bio.

**Hashtags** : `#webdesign #3d #creationsiteweb #maquette #motiondesign #siteinternet`
