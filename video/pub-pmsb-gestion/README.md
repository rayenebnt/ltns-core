# Pub « PMSB Gestion » · format tendance « regardez ce que j'ai créé »

TikTok vertical 1080 × 1920, 30 i/s, **22 s**, **muet**. On reprend le style d'une vidéo tendance, pas son contenu :

- un ordinateur posé sur un bureau, filmé au téléphone tenu à la main, en légère plongée (ici l'écran incurvé de Rayene, photo du 23/10 ; la référence montrait un MacBook) ;
- un texte fixe en haut, style « classique » de TikTok (fond blanc arrondi, texte noir) : « Nan les gars, regardez ce que j'ai créé pour mes clients 😳 » ;
- sur l'écran, en plein écran, une **pub produit 3D** façon Apple. On y voit un téléphone sur un bureau en bois, une faible profondeur de champ et une traînée de néon bleue qui file sur l'appli. Les coupes tombent sur le temps.

La vedette est **PMSB Gestion**, le logiciel de gestion sur mesure que LTNS° a créé pour PMSB (entreprise du bâtiment). Tout ce qui est à l'écran du téléphone vient du **vrai logiciel**, lancé en local sur la **base de démonstration** : les clients, les montants et « Alex Démo » sont inventés. La mention « Données de démonstration » est visible du début à la fin :

- dans la pub, en pastille en bas à gauche, tant que l'appli est à l'écran ;
- sur le TikTok, en texte sous la légende.

| Fichier | Rôle |
|---|---|
| `pub.html` | La pub paysage 1920 × 1200 (16:10, l'écran du MacBook). Scène three.js : téléphone 3D, bureau en bois, néon, profondeur de champ, bloom, étalonnage. |
| `tiktok.html` | Le montage vertical : `assets/photo.jpg` + la pub (`assets/pub.webm`) déformée en perspective sur l'écran vert de la photo (bords courbes suivis si l'écran est incurvé, bandes noires si l'écran n'est pas en 16:10), halo, reflet, main qui tremble, texte en haut. |
| `assets/` | Captures téléphone de l'appli (démo), PDF du devis, lettre de mise en demeure, logo, bois et fond générés, `pub.webm`. La photo : `photo-originale.jpg` (telle que reçue, métadonnées retirées), `photo.jpg` (cadrée en 1080 × 1920) et `screen.json` (coins et courbure de l'écran). |
| `scripts/capture-app.mjs`, `scripts/build-assets.py` | Captures de l'appli réelle (base de démo) et préparation des textures. |
| `scripts/prepare-photo.py` | Cadre la photo d'origine en 1080 × 1920 : l'écran vert tient dans la largeur, son haut passe sous la légende, les bandes manquantes sont prolongées en miroir et adoucies. |
| `scripts/detect-screen.py` | Trouve l'écran vert de `assets/photo.jpg` et écrit ses 4 coins et la flèche de chaque bord (écran incurvé) dans `assets/screen.json`. |
| `scripts/make-placeholder.py` | Photo **provisoire** (pièce grise, ordinateur schématique, écran vert, mention PLACEHOLDER). |
| `vendor/` | three.js r170 (licence MIT, `vendor/LICENSE-three.txt`), copié ici : aucune dépendance en ligne. |
| `fonts/`, `fonts.css` | TikTok Sans, Archivo (police de titres de l'appli), Inter, Space Grotesk (logo LTNS°), licence OFL, auto-hébergées. |

## La pub (pub.html), temps par temps (120 BPM : un temps = 0,5 s)

| Temps | À l'écran | Source réelle |
|---|---|---|
| 0 → 2 s | Image d'ouverture : le téléphone debout sur le bureau, l'éditeur du devis DEV-2026-0013 à l'écran. La traînée bleue passe déjà devant lui et l'éclaire. Travelling lent. | `m-devis-q260.jpg` |
| 2 → 3 s | Macro : « pein » tapé dans la bibliothèque de prix, la liste filtrée. | `m-devis-liste.jpg` |
| 3 → 4 s | Macro : la ligne ajoutée « Peinture de façade pliolite, 2 couches », entourée par le néon. | `m-devis-q1.jpg` |
| 4 → 6 s | Quantité 1 → 2 → 26 → 260, une frappe par temps. Le total de la ligne suit les **vraies valeurs de l'appli** : 28,00 → 56,00 → 728,00 → 7 280,00 €. | `m-devis-q1/q2/q26/q260.jpg` |
| 6 → 8 s | La carte « Montants » sort du téléphone et se redresse : Total TTC 26 504,28 €, souligné par le néon. | `carte-montants.jpg` (découpée dans la capture) |
| 8 → 10 s | Le devis PDF s'envole et se pose. Macro sur l'en-tête « ENTREPRISE P.M.S.B / Prestations Multi Services Bâtiment », puis sur « Devis N°DEV-2026-0013 ». | `devis-0013-p1.jpg` (le PDF de l'appli) |
| 10 → 11 s | Relances : « 3. Mise en demeure » entouré par le néon. | `m-relance.jpg` |
| 11 → 12 s | La lettre : « Lettre recommandée avec accusé de réception », « Objet : Mise en demeure de payer ». | `lettre-n3.jpg` (PDF de l'appli) |
| 12 → 14 s | Quatre coupes sur les temps : tableau de bord, échéancier, menu (pastille « 2 »), « Devis enregistré. ». | `m-dashboard`, `m-echeancier`, `m-menu`, `m-devis-enregistre` |
| 14 → 15 s | Au ras du bureau, la traînée file vers le téléphone. | (montage) |
| 15 → 17,5 s | Recul : le téléphone debout, l'enseigne au néon « PMSB Gestion » s'allume (logo de l'appli), la pastille « Créé par LTNS° » monte. | `logo-pmsb.png` |
| 17,5 → 22 s | La traînée passe au violet : l'enseigne devient « LTNS° » (#A855F7), la pastille pivote sur le temps de 18 s et devient « Devis gratuit sous 48 h ». « ltns.fr » s'allume dessous, puis la caméra pousse lentement jusqu'à la boucle. | (montage) |

**Ce qui relève du montage** : le téléphone 3D, le bureau et son bois (généré, aucune photo), la lumière, la traînée, les enseignes, la pastille, la carte flottante et la feuille qui s'envole. La barre d'état « 9:41 » de l'iPhone est redessinée par la page.

**Ce qui n'est jamais lisible** :
- les numéros de téléphone (floutés par `build-assets.py`) ;
- sur les PDF, les coordonnées de l'en-tête et du destinataire (déjà floutées par les vidéos 4 et 7) ;
- l'écran Paramètres, la carte « Contrat et documents du chantier », les vrais noms et la production.

La pub n'annonce aucun chiffre réel ni gain de temps : seuls des montants de démonstration apparaissent.

### Technique

La pub est une vraie scène 3D three.js (r170, dans `vendor/`). La page expose `renderAt(t)`, `DURATION`, `TL = []`, `settle()` et `?render` / `?t=`, comme `video/commun/engine.js`. Le rendu est déterministe : rien ne dépend de l'horloge.
- **Téléphone** au format iPhone 15 Pro : coque titane, verre noir, reflets d'environnement. L'écran est une capture DPR 6 aux coins arrondis.
- **Bureau** : bois verni (vernis, relief, rugosité), ombres douces (VSM) et ombres de contact.
- **Traînée** : sur le bois, un tube au cœur blanc et aux bords bleus saturés dans une gaine lumineuse, avec des lumières qui la suivent. Sur l'appli blanche et le papier, un tube bleu électrique (bleu de l'appli) à fil blanc, et une lueur qui teinte la surface en bleu (mélange multiplicatif) : sur fond blanc, une lueur additive ne se verrait pas.
- **Enseignes** : texte lumineux, halo autour des lettres (pas dessus), reflet dans le vernis et lumière rectangulaire.
- **Post-traitement maison** :
  - profondeur de champ par cercle de confusion, à demi-résolution (72 échantillons) ;
  - flou de bougé sur les coupes rapides (sous-images) ;
  - bloom (`UnrealBloomPass`) ;
  - tons « PBR Neutral », vignettage, grain, légère aberration chromatique.
- **Chromium sans écran** : WebGL passe par SwiftShader, donc compter environ 5 s par image et un peu moins d'une heure pour la pub entière. La page donne `READY` tout de suite et se construit au premier `settle()`, que `render.mjs` attend sans limite de temps.

## La photo de l'écran

La photo actuelle est la vraie : l'écran incurvé (AOC) du bureau de Rayene, avec l'image verte en plein écran, le mur éclairé en bleu et le clavier rétroéclairé (reçue le 23/10, aucune personne ni donnée privée visible). Elle est en 3:4, donc `prepare-photo.py` la réduit pour que l'écran tienne dans la largeur, et prolonge le haut (papier peint en miroir) et le bas (reflet du clavier, sous l'interface de TikTok). L'écran vert est en 16:9 : la pub 16:10 y est affichée avec deux fines bandes noires, comme dans un lecteur vidéo. Sa courbure (bas de l'écran bombé de 20 px) est mesurée par `detect-screen.py` et suivie par `tiktok.html`, qui pose l'écran en 16 bandes verticales.

Pour changer de photo :

1. Afficher en plein écran l'image verte `video/commun/ecran-vert-ordi.png` (vert pur 0, 177, 64). Luminosité moyenne : le vert ne doit pas être surexposé sur la photo.
2. Prendre la photo au téléphone, en portrait, tenu à la main, en légère plongée (comme la vidéo de référence). L'écran doit être entier dans l'image, sans reflet fort dessus. Aucun visage, rien de privé à l'écran ni autour.
3. Cadrer et trouver l'écran :
   ```bash
   cd /home/user/ltns-core/video/pub-pmsb-gestion
   cp <la photo> assets/photo-originale.jpg
   python3 -I scripts/prepare-photo.py assets/photo-originale.jpg assets/photo.jpg   # --haut 640 : hauteur du haut de l'écran
   python3 -I scripts/detect-screen.py --debug /tmp/ecran.jpg                         # écrit assets/screen.json
   ```
   Ouvrir `/tmp/ecran.jpg` : le contour violet doit suivre les bords du vert, courbes comprises. Une encoche éventuelle est ignorée. On peut corriger à la main les coins, la flèche des bords (`bow`, en px) ou imposer le format de l'écran (`"aspect": 1.78`) dans `assets/screen.json`.
4. Refaire le rendu du TikTok (ci-dessous). La pub elle-même ne change pas.

Pour revenir à la photo provisoire (pièce grise, PLACEHOLDER) : `python3 -I scripts/make-placeholder.py assets/photo.jpg`, puis `detect-screen.py`.

Garder le texte du haut lisible : la légende occupe y ≈ 424-544 et sa ligne « Données de démonstration » y ≈ 578. Le haut de l'écran est placé vers y = 640 et son bas reste au-dessus de y ≈ 1260 (interface de TikTok en dessous).

## Rendus

Le serveur local doit servir la racine du dépôt (ne jamais l'arrêter s'il tourne déjà) :

```bash
cd /home/user/ltns-core
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8765/ || (setsid nohup python3 -m http.server 8765 --directory /home/user/ltns-core >/dev/null 2>&1 &)

# 1. La pub 1920 × 1200 (≈ 55 min, muette)
node video/commun/render.mjs video/pub-pmsb-gestion video/pub-pmsb-gestion/pub-1920x1200.mp4 --page=pub.html --size=1920x1200
# 2. Sa version VP9 pour le montage (Chromium ne lit pas le H.264), depuis les images du rendu
ffmpeg -y -framerate 30 -i video/pub-pmsb-gestion/.frames-pub/%05d.jpg -vf scale=1600:1000:flags=lanczos \
  -c:v libvpx-vp9 -b:v 0 -crf 31 -g 15 -row-mt 1 -deadline good -cpu-used 2 -pix_fmt yuv420p -an video/pub-pmsb-gestion/assets/pub.webm
# 3. Le TikTok 1080 × 1920 (muet, ≈ 3 min) → video/pub-pmsb-gestion/ltns-pub-pmsb-gestion.mp4
node video/commun/render.mjs video/pub-pmsb-gestion
```

Les MP4 et les dossiers `.frames*` sont ignorés par git. `assets/pub.webm` est versionné : le TikTok se refait sans relancer la pub.

Aperçus dans un navigateur : `pub.html?t=7.4` ou `tiktok.html?t=20` (image figée), ou sans paramètre (lecture). La pub est lente en lecture : elle est faite pour le rendu image par image.

### Refaire les captures de l'appli (base de démo uniquement)

Même procédure que la vidéo 4 (`../vrais-sites/v04-pmsb-gestion-devis/README.md`) : copie de travail de `/home/user/pmsb-gestion` sans `.git` ni `.env`, PostgreSQL 16 local, jeu de démo `../vrais-sites/v07-pmsb-gestion-relance/scripts/demo-seed.ts` copié en `demo/seed.ts`, `next build` puis `next start -p 3440`. Ensuite :

```bash
cd /home/user/ltns-core/video/pub-pmsb-gestion/scripts
PMSB_GESTION_APP=$W/app node capture-app.mjs $W/captures     # remet la base de démo à zéro, vue téléphone 393 × 798, DPR 6
python3 -I build-assets.py $W/captures ../assets              # flou des numéros, JPEG, m-rects.json, carte Montants, bois, fond, logo
```

Les dates affichées (23/10/2026) et les jours de retard dépendent du jour de la capture.

## Publication

**Son** : la vidéo est muette exprès. Dans TikTok, ajouter un **son tendance** de la bibliothèque, idéalement entre 120 et 160 BPM. Les coupes sont calées sur une grille de 120 BPM (un temps toutes les 0,5 s) et tombent juste sur la plupart des sons. Caler le début du son pour qu'un temps fort tombe sur 2 s (première macro).

Activer l'étiquette **« Contenu généré par IA »**. Couverture : l'image 0.

Légende et hashtags :

```
Le logiciel que j'ai créé pour PMSB, une entreprise du bâtiment : devis avec bibliothèque de prix, total recalculé tout seul, devis en PDF à son en-tête, relances jusqu'à la mise en demeure. Avant, ses devis se faisaient à la main. Livré en 4 semaines. Données de démonstration à l'écran. Logiciel sur mesure, prix sur devis · partout en France à distance, sur place en Île-de-France · devis gratuit sous 48 h, ltns.fr #logicielsurmesure #artisanbtp #batiment #devis #tpe #3d
```

**Avant publication** :
- l'accord écrit de PMSB doit exister pour montrer PMSB Gestion avec des données de démonstration (PLAN-30-JOURS.md) ;
- vérifier que `assets/photo.jpg` est bien la vraie photo et non le PLACEHOLDER (la version provisoire ne se publie pas) ;
- relire l'image d'ouverture et la carte de fin sur un téléphone.
