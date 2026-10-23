# Vidéo 2 · Vrai projet PMSB : « Sur ce site, ta souris nettoie la façade. »

TikTok 1080 × 1920, 30 i/s, 21,7 s avec la vraie voix ElevenLabs (23,4 s en minutage estimé : le brouillon sans voix). Concept validé : `../concepts.json`, `final.videos[n=2]`.

Tout ce qui est à l'écran vient du vrai site de PMSB (build de production local de `/home/user/rayenebnt/pmsb-ravalement`, capturé en temps virtuel). Le montage ajoute seulement le titre, les sous-titres, le halo autour du curseur, les traits bleus, la carte de code, les cadres de téléphone et d'ordinateur et la carte de fin.

## Ce qu'on voit

| Moment (calé sur la voix) | À l'écran | Source réelle |
|---|---|---|
| Image 0 → 3 s | Le héros WebGL StoneWall : pierre ravalée à gauche, encrassée à droite, l'anneau du curseur du site (halo bleu ajouté). Titre fixe « Sur ce site, ta souris / nettoie la façade. ». La souris glisse, le front suit, poussée 1,00 → 1,03, gros plan à 160 % sur les joints, retour plein cadre. | `assets/hero.webm`, `hero-macro.webm` (capture-hero.mjs) |
| V2 « P.M.S.B. fait du ravalement… » | Étiquette « VRAI PROJET · PMSB ». Rembobinage du même plan : le curseur revient vite (20 % du temps), puis la façade se démonte à vitesse lisible (images 50 → 30 : les pierres repartent, les lettres redescendent), puis le noir tenu jusqu'au préchargeur. | `hero.webm` lu à l'envers |
| V3 « alors son mur est en trois D… » | Le vrai préchargeur (PMSB, compteur 000 → 100), puis l'ouverture : lettres qui montent, pierres au ralenti, assises posées du bas vers le haut (trait bleu sous chaque rang, à l'instant mesuré). Carte de code : lignes 13 et 17 de `StoneWall.tsx`, « ravale » s'allume, repère « aucun modèle 3D importé ». | `preloader.webm`, `intro120.webm`, `rows.json` |
| V4 « Sur téléphone, la lumière se promène toute seule. » | Téléphone vectoriel incliné avec le héros mobile fini, reflet sur la vitre ; zoom : la lumière qui dérive seule, en temps accéléré (repère « temps accéléré »), suivie d'une trace pointillée ; écran partagé téléphone / ordinateur. | `phone-hero.webm`, `mur-long.webm`, `light-long.json`, `desk.webm` |
| V5 « Et plus bas, ses réalisations, en avant, après. » | Défilement (la façade se disperse), comparateur « Travaux de bardages » de la page Réalisations : la poignée glisse vers APRÈS, passe à AVANT puis se pose à 50 % ; le téléphone avance doucement. Le rail pousse le comparateur (pignon, cheminée, marbre, brique, une carte à la fois), puis le pied de page monte : zoom sur « Site réalisé par LTNS », souligné et tenu. | `scroll.webm`, `compare.webm`, `rail-*.jpg`, `pied-de-page.jpg` |
| V6 « Ton métier, ce serait quel geste ? » | Question en gros sur le mur flouté (le curseur continue de nettoyer), puis « Devis gratuit sous 48 h · lien en bio », « Partout en France à distance · sur place en Île-de-France », « LTNS° ». | `hero.webm` flouté |
| Boucle (1 s) | La façade se remonte sous le curseur (assemblage réel, accéléré), le titre revient : la dernière image enchaîne sur l'image 0. | `hero.webm` |

Masqué ou flouté à la source : numéro et e-mail de l'en-tête (en-tête masqué), rails latéraux (adresse, mention RGE), coordonnées, LinkedIn et badge RGE du pied de page (flou 14 px dans la capture). Aucun compteur 15+ / 500+ / 100 %, ni clinique, ni photo de banque, ni « rénovation à la parisienne ». Aucun domaine à l'écran.

## Étalonnage

Le shader nettoie la pierre avec un dégradé large (`smoothstep(9.5, 2.2, d)`) : dans un cadre 9:16, l'écart sale / propre est discret. Les plans du mur passent dans une courbe de contraste (`build-assets.sh`), sans rien ajouter ni déplacer : `GRADE_D`, plus creusée, pour les plans ordinateur (héros, gros plan, ouverture, écran partagé : la pierre encrassée devient presque noire, la zone ravalée reste claire), `GRADE` pour les clips mobiles.

## Régénérer les captures

Prérequis : le site PMSB construit (`npm ci && NEXT_TELEMETRY_DISABLED=1 npm run build` dans `/home/user/rayenebnt/pmsb-ravalement`), puis servi sur un port libre :

```bash
cd /home/user/rayenebnt/pmsb-ravalement && NEXT_TELEMETRY_DISABLED=1 ./node_modules/.bin/next start -p 3102 &   # PMSB_URL=http://localhost:3102 par défaut
cd /home/user/ltns-core/video/vrais-sites/v02-pmsb-souris/scripts
FR=/chemin/vers/frames
node capture-hero.mjs    $FR/hero 30 1.6 11.2            # ~20 min (WebGL logiciel), écrit aussi ring.json
node capture-intro.mjs   $FR/intro120 120 1.2 2.2 1.5    # ouverture à 120 i/s, souris en P0
node capture-mobile.mjs  $FR/preloader preloader
node capture-mobile.mjs  $FR/murlong mur-long
node capture-desktop.mjs $FR/desk 30 0.75 4.5
node capture-stills.mjs  /chemin/vers/stills
python3 -I analyse.py lumiere $FR/murlong ../assets/light-long.json 10
python3 -I analyse.py rangs $FR/intro120 ../assets/rows.json 120 1.5 -0.36 0.06
FR=$FR ST=/chemin/vers/stills MACRO="405 0 675 1200" MACRO_FROM=96 MACRO_N=44 bash build-assets.sh
```

Les clips mobiles `phone-hero`, `scroll` et `compare` sont les MP4 de la phase d'exploration (`VS=…/vrais-sites/pmsb-site/clips`, convertis en VP9 par `build-assets.sh`) ; `capture-mobile.mjs intro|scroll|avant-apres` les refait à l'identique. Chromium de Playwright ne lit pas le H.264 : tout est en WebM VP9 (image clé toutes les 10 images), chargé en blob et positionné image par image (`currentTime` puis attente de `seeked`).

## Voix et rendu

Voix ElevenLabs (voix clonée) : `voix-originale.mp3` (fichier intact, `vrai-projet-02.mp3`), découpée en six phrases sur ses silences (`voice/01.mp3` … `06.mp3`, une phrase par segment `[pause]` du script, P.M.S.B. lu lettre par lettre). Les cinq grands silences de l’original (0,84 · 0,72 · 0,58 · 0,57 · 2,09 s) tombent bien entre les six phrases.

```bash
cd /home/user/ltns-core
python3 video/commun/sync-voice.py video/vrais-sites/v02-pmsb-souris                                      # timing.json, voice.mp3, voice-files.js
python3 video/vrais-sites/v02-pmsb-souris/scripts/pause-longue.py video/vrais-sites/v02-pmsb-souris       # pause longue avant V6
node video/commun/render.mjs video/vrais-sites/v02-pmsb-souris                                             # voix seule (--bruitages pour les sons)
```

`sync-voice.py` met 0,25 s entre les phrases : sans la pause longue, « Ton métier, ce serait quel geste ? » tombait sur le rail et le pied de page, et la carte de fin n'arrivait qu'à la fin de la question. `scripts/pause-longue.py` rétablit la pause de l'enregistrement (2,0 s une fois les bords rognés) : rail 0,85 s, pied de page 1,05 s (zoom sur la moitié, crédit souligné puis tenu), carte de fin dès « Ton ».

Tous les temps forts après 3 s sont accrochés à des mots (`CUES`, puis `plan()` qui impose des durées minimales). Minutage réel : V1 0,10-2,43 · V2 2,68-4,25 · V3 4,50-8,64 · V4 8,89-11,30 · V5 11,55-14,63 · pause · V6 16,64-18,29. Relance à 3,0 s (« P.M.S.B. »), préchargeur sur « alors », ouverture sur « sans », assises posées sur « et il se monte » (le cue `code` vise le premier « rang » : « rang » et « rang. » se confondent), carte de code sur « rang par rang » (ses étapes se resserrent quand elle a moins de 1,5 s), téléphone sur « Sur téléphone », lumière sur « lumière », écran partagé sur « seule », défilement sur « bas », comparateur sur « réalisations », AVANT sur « avant », 50 % sur « après », carte de fin sur V6, 2,1 s de carte après la voix, puis 1 s de retour à l'image 0. Contrôle : `node scripts/planche.mjs /tmp/planche.png` (vignettes 0, 0,5, 1, 1,5, 2, 3, 4 … fin).

## Légende et hashtags

Sur ce site, ta souris nettoie la façade. Le site de PMSB, entreprise de ravalement en Île-de-France : un mur 3D sans modèle importé, qui se monte rang par rang, et plus bas leurs réalisations en avant/après. Site réalisé par LTNS°. Partout en France à distance, sur place en Île-de-France · devis gratuit sous 48 h, lien en bio. #creationsiteweb #siteinternet #ravalement #artisanbtp #webdesign #3d

Étiquette « contenu généré par IA » activée (voix clonée). Couverture : l'image 0.
