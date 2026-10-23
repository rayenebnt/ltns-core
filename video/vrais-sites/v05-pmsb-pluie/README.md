# Vrai projet 05 · PMSB : « Il fait de l'étanchéité. Son site fait pleuvoir. »

Vidéo TikTok 1080 × 1920, 30 i/s, en boucle. Concept validé : `../concepts.json`, `final.videos[n = 5]`.
Projet : le site vitrine de PMSB (pages Étanchéité, Isolation, Ravalement), build de production local de
`/home/user/rayenebnt/pmsb-ravalement` (jamais modifié : servi par `next start` sur un port libre, capturé en temps virtuel).

Brouillon muet (sans voix) : 26,9 s avec le minutage estimé par le moteur (il compte 15 caractères/s et ignore la pause longue) ; ≈ 22 s avec la vraie voix (calage du concept), sans rien changer à la page.

## Ce qu'on voit (tout vient du vrai site)

| Moment (calé sur la voix) | À l'écran | Source réelle |
|---|---|---|
| Image 0 → 3 s | Plein cadre : la membrane satinée de la page Étanchéité sous la pluie automatique, à la vraie résolution du canvas (1080 × 1920), voile du site conservé, tout le texte masqué sauf le vrai titre « ÉTANCHÉITÉ » (remonté entre y ≈ 786 et 880). Titre fixe « IL FAIT DE L'ÉTANCHÉITÉ. / SON SITE FAIT PLEUVOIR. » (« pleuvoir. » en bleu du site), les mots s'allument au rythme de V1/V2. À 0,35 s, une grosse goutte tombe près du centre (561, 669) : anneau bleu calé sur le vrai front d'onde, « plic ». Deuxième goutte soulignée à 1,05 s, troisième à 2,33 s (derrière le titre). Poussée 1,00 → 1,08 vers la goutte, la caméra glisse un peu. | `assets/pluie-*.webm` (WaterSurface, graine 5), `assets/mot.png` (le vrai h1, capturé seul sur fond transparent, même mise en page), `assets/pluie.json` (gouttes journalisées) |
| V3 « Chaque goutte dessine une onde, calculée en direct. » | Relance : étiquette « VRAI PROJET · PMSB », l'eau rentre dans un téléphone vectoriel sans marque qui montre la vraie page Étanchéité mobile avec tout son texte (390 × 844). Sur « goutte », anneau sur une vraie goutte de l'écran. Sur « calculée », on replonge : gros plan au ralenti (capture 60 i/s, 0,6×), anneaux sur les ondes qui se croisent, repère « PLUIE CALCULÉE EN DIRECT · PAS UNE VIDÉO ». | `assets/page-*.webm`, `assets/page.json`, `assets/pluie-macro-*.webm` |
| V4 « Page isolation : sur le mur nu, l'énergie s'échappe. » | Un anneau d'onde grandit jusqu'à remplir l'écran : volet vers la vraie démonstration « coupe de mur » (ThermalWall), repère « PAGE ISOLATION · DÉMONSTRATION » (le libellé de la section). Sur « mur », la caméra pousse sur la face du mur. Loupe sur la vraie bascule (« MUR NU » actif, anneau sur « nu »). Zoom × 1,55 sur le nuage de particules qui traverse le mur. | `assets/iso-*.webm` (InsulationDemo), `assets/iso.json` |
| fin de V4 → V5 « L'isolant se pose, et les pertes sont freinées. » | « ISOLÉ PAR L'EXTÉRIEUR » pulse dans la loupe, le doigt tape le vrai bouton (le clic a eu lieu à cet instant dans la capture) : l'isolant vert puis l'enduit glissent sur le mur (« clac »). Les particules continuent, moins nombreuses à s'échapper (freinées, pas arrêtées). La caméra se rapproche des couches posées, puis descend sur la liste du site (le haut du mur, clair, est assombri derrière les sous-titres) : 01 Mur porteur · 02 Isolant · 03 Enduit de finition s'allument tour à tour. | idem |
| V6 « Page ravalement : la brique et la pierre sont calculées, pas photographiées. » | Volet latéral (trait bleu) vers la page Ravalement : le bloc de brique (MaterialCanvas, lancer de rayons) entre en biais, gros plan sur les joints de mortier ; coupes sur « pierre » (Pierre de taille), « calculées » (Plâtre), « photographiées » (Imperméabilisation). Étiquettes comme les titres de section du site (02 Brique, 01 Pierre de taille…). La vraie mention « Échantillon procédural » reste visible. | `assets/brique|pierre|platre|impermeabilisation-*.webm` |
| Pause longue | La brique revient et tourne lentement, repère « AUCUNE TEXTURE CHARGÉE · TOUT EST CALCULÉ ». | idem |
| V7 « Trois métiers, trois pages, trois scènes. » | Le bloc se resserre en bande, puis la pluie et le mur descendent en décalé : triptyque pluie | mur | brique (x 120-920, y 500-1460), chaque bande reçoit son nom (Étanchéité · Isolation · Ravalement), les bandes respirent et glissent lentement, chacune dans son sens (parallaxe). | les trois captures |
| V8 « Et le tien, ce serait laquelle ? » | Le triptyque recule et continue de vivre (pluie, particules, bloc qui tourne). V8 en gros, « laquelle ? » en bleu ; +0,7 s « Devis gratuit sous 48 h · lien en bio » ; +1,3 s « Partout en France à distance · sur place en Île-de-France » ; +1,9 s « PMSB · site réalisé par LTNS° ». | |
| Boucle (dernière seconde) | Les bandes mur et brique se replient, la bande pluie reprend tout l'écran dans le cadrage de l'image 0 (la capture continue jusqu'à l'image qui précède l'image 0), une goutte tombe au centre (anneau, « plic »), le vrai titre de la page et le titre fixe reviennent : la dernière image enchaîne sur l'image 0. | `assets/pluie-*.webm` |

Effets de montage, jamais présentés comme le comportement du site : téléphone vectoriel, anneaux d'onde (posés sur les vraies
gouttes, au rayon du vrai front d'onde : âge × 0,145 × hauteur du canvas, `WaterSurface.tsx`), ralenti, loupe, doigt, volets,
triptyque, recul.

**Masqué (CSS injecté, rien d'autre n'est changé)** : en-tête (le numéro et l'e-mail ne sont jamais visibles ; sur la page
mobile du téléphone il ne reste que le logo et « MENU », liens `tel:` et `mailto:` masqués), rails latéraux, curseur maison ;
sur la page Isolation, le titre de section et les phrases sous la liste (« chaleur », « température ») et la légende ; aucune
photo de la page Ravalement (cadrage sur les blocs seuls) ; aucune photo de la page Étanchéité (bas de page jamais filmé).
Aucun badge RGE, aucun domaine, aucun prix, aucune donnée chiffrée du client. Pas de ThermalFacade (thermographie) ni du bloc
du héros Ravalement.

**Étalonnage** : l'eau (membrane très sombre) passe dans une courbe douce qui relève les tons moyens (`GRADE` dans `build-assets.sh`) ; un filet très pâle du bloc de texte masqué (rangées 1647-1648 de la capture, sous la zone utile) est recouvert par les rangées voisines (en RVB : en YUV, la conversion de plage du JPEG laissait le filet visible).

**Fidélité des captures** : aucune interaction sur la pluie (uniquement la pluie automatique du site, aucun événement de
pointeur) ; `Math.random` a une graine fixe (5) pour que la grosse goutte tombe près du centre à 0,35 s ; chaque goutte est
journalisée (instant, position, force) pendant la capture. La section héros est étirée à tout l'écran (100svh au lieu de
92svh) et le titre remonté pour tenir hors des boutons TikTok. Sur la page Isolation, la démonstration se joue seule à
l'arrivée dans l'écran : on revient d'abord sur « Mur nu » avec le vrai bouton, puis on clique « Isolé par l'extérieur ».

## Timing et voix

`SENTENCES` = le texte ElevenLabs découpé sur `[pause]` / `[long pause]` (8 phrases). Après l'accroche 0–3 s, chaque temps
fort est accroché à un mot (`CUES` puis `plan()`), sauf la dernière seconde (retour à l'image 0). Sans voix, le moteur estime
le minutage. Quand la voix arrive (`voice/01.mp3` … `08.mp3`, une phrase par segment, découpée sur les silences) :

```bash
cd /home/user/ltns-core
python3 video/commun/sync-voice.py video/vrais-sites/v05-pmsb-pluie     # timing.json, voice.mp3, voice-files.js
node video/commun/render.mjs video/vrais-sites/v05-pmsb-pluie
```

Contrôle : `node video/vrais-sites/v05-pmsb-pluie/scripts/planche.mjs /tmp/planche.png 1 270 --zones`
(vignettes 0, 0,5, 1, 1,5, 2, 3, 4 … fin, zones TikTok en rouge).

## Régénérer les captures

Prérequis : le site PMSB construit (`npm ci && NEXT_TELEMETRY_DISABLED=1 npm run build` dans
`/home/user/rayenebnt/pmsb-ravalement`), servi sur un port libre (tuer ce serveur par son PID ensuite) :

```bash
cd /home/user/rayenebnt/pmsb-ravalement && NEXT_TELEMETRY_DISABLED=1 ./node_modules/.bin/next start -p 3105 &   # PMSB_URL=http://localhost:3105 par défaut
cd /home/user/ltns-core/video/vrais-sites/v05-pmsb-pluie/scripts
FR=/chemin/vers/frames
node capture-pluie.mjs $FR/pluie 5 17.2 plein 2.6   # pluie plein cadre 60 i/s (≈ 40 min en WebGL logiciel), journal des gouttes
node capture-pluie.mjs $FR/mot 5 0 mot               # le vrai titre « ÉTANCHÉITÉ » seul, PNG transparent
node capture-pluie.mjs $FR/page 7 4 page             # la page mobile entière (écran du téléphone)
node capture-iso.mjs $FR/iso 11 6.0                  # démonstration Isolation : mur nu, clic « Isolé » à 6,0 s
node capture-blocs.mjs $FR/blocs                     # brique 8 s, pierre, plâtre, imperméabilisation 3 s
FR=$FR bash build-assets.sh                          # WebM VP9 en morceaux de 3 s + JSON (gouttes, mise en page)
FR=$FR ONLY=pluie bash build-assets.sh               # ne réencode qu'une capture (les JSON sont refaits à l'identique)
```

Choix de la graine : `node capture-pluie.mjs <dossier> <graine> 17 essai` (0,25 px/px CSS, sans image) puis
`python3 -I drops.py <dossier>/rlog.json` liste les gouttes ; la graine 5 donne une goutte de force 1,25 en (561, 669) à
12,18 s, avec une autre goutte au centre 0,7 s avant l'image 0 (boucle).

Chromium de Playwright ne lit pas le H.264 : tout est en WebM VP9 (image clé toutes les 10 images), chargé en blob et
positionné image par image (`currentTime` puis attente de `seeked`). Chaque capture est découpée en morceaux de 3 s : une
seule grosse vidéo en blob garde une requête ouverte et bloque l'attente « networkidle » de `render.mjs`.

## Légende et hashtags

Il fait de l'étanchéité, son site fait pleuvoir. Sur le site de PMSB : trois métiers, trois pages, trois scènes 3D. La pluie
sur une membrane, un mur qui s'isole, la brique et la pierre calculées sans photo. Site réalisé par LTNS°. Partout en France à
distance, sur place en Île-de-France · devis gratuit sous 48 h, lien en bio. #etancheite #isolation #ravalement #siteinternet #webdesign #3d

Étiquette « contenu généré par IA » activée (voix clonée). Couverture : l'image 0.
