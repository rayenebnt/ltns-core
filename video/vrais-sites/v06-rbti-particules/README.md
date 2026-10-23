# Vrai projet 06 · RBTI : « 4 200 particules. Pas un seul mot. »

Vidéo TikTok 1080 × 1920, 30 i/s, en boucle. Concept validé : `../concepts.json`, `final.videos[n = 6]`.
Projet : le site one-page de **RBTI Location** (sous-location encadrée à Paris), créé par LTNS°, avec six scènes WebGL
écrites à la main. Dépôt : `/home/user/rayenebnt/rbti` (jamais modifié : site servi en lecture seule, tout le reste
est injecté dans le navigateur au moment de la capture).

## Ce qu'on voit (tout vient du vrai site)

| Moment | À l'écran | Source |
|---|---|---|
| Image 0 → 3 s | La vraie scène « morph » arrêtée sur la maison (≈ 760 px de large), fond nuit + halo violet du site, reflet discret. Titre fixe « 4 200 PARTICULES. / PAS UN SEUL MOT. » (« 4 200 » et « pas un seul mot » en orange #ff6100), les mots s'allument avec la voix. À 0,3 s la maison éclate en tourbillon (transition du site lue à l'envers, ≈ ×2), puis se reforme (lecture avant) avec une poussée 1,00 → 1,06, puis la caméra continue d'avancer doucement tant que la maison tient. Sur « mot. », la maison s'illumine d'un coup (flash orange + halo additif). | `assets/morph.webm` (scène capturée en 1440 × 1440) |
| « Une maison… une clé… un euro. » | Étiquette « VRAI PROJET · RBTI ». Sur « maison… », un reflet de lumière balaie la maison ; juste après, elle devient la clé, puis l'euro : le vrai morph, accéléré (pastille « ▸▸ ACCÉLÉRÉ »). | `morph.webm` |
| « RBTI devient le locataire… » | Dézoom : les particules sont dans le canvas de la vraie carte de contact mobile (« Marre des impayés et des soucis de gestion ? »), dans un téléphone vectoriel (x ≈ 310-770). La carte est cadrée bord à bord dans l'écran (zoom 390/350 : les 20 px de fond clair de la page de part et d'autre de la carte sortent du cadre, ils se lisaient comme un défaut du téléphone). Quand le téléphone est très agrandi (dézoom, plongée), son haut s'efface sous le sous-titre : le texte de la carte ne passe jamais sous celui de la voix. Bouton téléphone et lignes de contact floutés. | `assets/cta-card.webp` (capture 390 × 844 @3, canvas masqué) + `morph.webm` |
| « …le locataire du propriétaire » | Coup de fouet vers le haut : le héros. Le vrai titre H1 « On devient votre locataire, pas un intermédiaire » apparaît (transitions CSS du site, figées pas à pas) sur la ville 3D de nuit ; « votre locataire » se souligne en orange. | `assets/city.webm` (ville seule), `assets/h1-*.webp` (titre seul, transparent) |
| « …et lui verse un loyer fixe. » | La caméra du site descend l'avenue (progression du défilement imposée à la scène), le titre remonte. | `city.webm` (images 105 → 179) |
| « Sur son site, ce métier… » | Coup de fouet vers le bas : retour à la carte, plongée dans le canvas jusqu'au plan macro ×3 sur le faîte du toit (rendu 3240 × 3240, bords fondus), compteur orange 0 → 4 200. Hors du plan macro, la scène 1440 agrandie continue de bouger, légèrement floutée (profondeur de champ). | `assets/macro.webm` |
| « …se dessine en lumière » | Recul : maison → clé → € → marque RBTI en accéléré (« ACCÉLÉRÉ »), puis la marque en particules devient le vrai logo extrudé en 3D. | `morph.webm`, `assets/mark.webm` |
| « …juste avant le contact. » | Le logo recule ; une porte orange s'allume au fond du vrai couloir. | `assets/gates.webm` |
| « Et la méthode ? Six étapes, six portes… » | On traverse le portique (scène « gates » seule), puis l'ordinateur vectoriel : la vraie section « Notre méthode » en 1440 × 900, rail épinglé, compteur 01/06 → 06/06, le dernier portique s'allume. Mention « SCÈNE 3D · VERSION ORDINATEUR » (ces scènes sont coupées sur mobile). Descriptions des cartes floutées. | `assets/rail.webm` |
| Pause | Dans l'ordinateur, la page descend aux avantages : les 416 cubes se soulèvent sous le curseur, reflets orange. | `assets/field.webm` |
| Fin | « TON MÉTIER, TU LE DESSINERAIS COMMENT ? » en grand (mot à mot), sur le nuage de particules bien visible (la marque RBTI se défait lentement, la caméra avance). Puis « Devis gratuit sous 48 h · lien en bio », « Partout en France à distance / sur place en Île-de-France », « LTNS° », puis un reflet traverse le bouton. | `morph.webm` |
| Boucle (dernière seconde) | Le nuage se resserre et reforme exactement la maison de l'image 0 (même image de la séquence), le titre revient : la dernière image est l'image 0. | `morph.webm` |

Effets de montage, jamais présentés comme le comportement du site : zooms, coups de fouet, téléphone et ordinateur
vectoriels, souligné, compteur, flash, reflets (sol, balayage de la maison, bouton), flou de profondeur, accélérations (signalées « ACCÉLÉRÉ ») et la lecture à l'envers de
l'accroche. Le titre H1 est posé sur la ville capturée sans le reste du bloc héros : le chapeau (« loyer garanti, zéro
gestion »), les puces et « Disponible 7j/7 · Réponse sous 24h » ne sont jamais à l'écran.

**Données sensibles** : 06 25 20 64 93 et contact@rbti.fr floutés (bouton et lignes de contact de la carte, pixellisés
puis floutés dans `cta-card.webp`) ; « Disponible 7j/7 » et « Réponse sous 24h » floutés avec eux. Les descriptions des
cartes de la méthode (dont « loyer fixe garanti ») sont floutées dans l'ordinateur. Les photos d'intérieurs des cartes
(images du gabarit du site, pas des logements de RBTI) défilent sans arrêt. Aucune date, aucun chiffre inventé :
4 200 (`scenes.js`, `N = 4200`), 6 portes, 01/06 → 06/06 et le texte du site sont réels.

## Timing et voix

`SENTENCES` = le texte ElevenLabs (`vrai-projet-06.mp3`) découpé sur `[pause]` / `[long pause]` : **9 phrases**. Chaque
temps fort est accroché à un mot (`CUES`, `plan()`), sauf l'accroche 0–3 s et la dernière seconde.
La maison commence à devenir la clé 0,6 s après « maison… » (ou 0,42 s avant « clé… » si c'est plus tôt) : même
quand une phrase traîne, la maison ne reste jamais figée.

**Vraie voix** : `voix-originale.mp3` (prise ElevenLabs intacte, 23,9 s) coupée au milieu de ses silences en
`voice/01.mp3` … `09.mp3` (une phrase par fichier, durées vérifiées sur le spectrogramme). Calage final :
V1 0,10–1,61 · V2 1,86–2,69 · V3 2,94–3,61 · V4 3,86–4,38 · V5 4,63–5,08 · V6 5,33–9,48 · V7 9,73–13,47 ·
V8 13,72–16,74 · pause longue · V9 17,76–19,57. **Vidéo finale : 21,8 s**, voix seule (≈ −15,7 LUFS, crête −1,5 dBTP).

- `scripts/pause-longue.py` rétablit 1,0 s de `[long pause]` avant V9 (`sync-voice.py` n'en laisse que 0,25 s ; la prise
  en avait 2,35 s) : le champ de cubes tient seul ≈ 0,85 s, puis la question s'affiche en grand sur « Ton ».
- Compteur 0 → 4 200 : il part dès la plongée dans le canvas (`P.CNT`) et compte en 0,35–0,6 s, pour que « 4 200 » reste
  lisible ≈ 0,4 s avant le recul (la vraie voix ne laisse que ≈ 0,8 s entre la plongée et « dessine »).
- Fin : `TAIL` 2,2 s, offre / zone / marque à +0,55 / +1,0 / +1,45 s (la vraie V9 ne dure que 1,8 s) : la carte complète
  tient ≈ 1,25 s avant le retour à l'image 0. Le sous-titre de V9 n'apparaît jamais (la question est déjà en grand).

```bash
# déposer voice/01.mp3 … voice/09.mp3 (une phrase par fichier), puis :
python3 video/commun/sync-voice.py video/vrais-sites/v06-rbti-particules   # timing.json, envelope.json, voice.mp3, voice-files.js
python3 video/vrais-sites/v06-rbti-particules/scripts/pause-longue.py video/vrais-sites/v06-rbti-particules   # pause longue avant V9
```

## Régénérer les images

```bash
# 1. le site RBTI en local, en lecture seule (tuer ce serveur par son PID ensuite)
python3 -m http.server 8786 --bind 127.0.0.1 --directory /home/user/rayenebnt/rbti
# 2. captures en temps virtuel, SwiftShader (≈ 25 min sur 4 cœurs) : morph, macro, mark, cta, hero, gates, rail, field
bash video/vrais-sites/v06-rbti-particules/scripts/capture-all.sh /tmp/v06-raw
# 3. halo, flous, encodage VP9 et WebP dans assets/ (≈ 10 min, surtout le morph)
python3 -I video/vrais-sites/v06-rbti-particules/scripts/prepare-assets.py /tmp/v06-raw video/vrais-sites/v06-rbti-particules/assets
```

`capture.mjs` : `requestAnimationFrame` et `performance.now` passent sur une horloge virtuelle ; le rendu de chaque
scène est enveloppé pour lui imposer un temps (`morph`, `mark`), une progression (`skyline`) ou un rail (`gates`).
Le cycle du morph est pris au 3ᵉ tour (t = 3 × 14,8 / 0,92 s), quand la maison est de face. Assets ≈ 20 Mo, tout est
versionné. Les vidéos sont chargées par MediaSource (aucune requête ouverte pendant le rendu).

## Rendu

```bash
# serveur du dépôt sur le port 8765 (s'il ne répond pas déjà)
setsid nohup python3 -m http.server 8765 --directory /home/user/ltns-core >/dev/null 2>&1 &
node video/commun/render.mjs video/vrais-sites/v06-rbti-particules        # → ltns-v06-rbti-particules.mp4 (ignoré par git)
node video/vrais-sites/v06-rbti-particules/scripts/frames.mjs /tmp/v06-frames --step=0.5   # images fixes pour vérifier
```

Sons : la vidéo publiée est en voix seule (`render.mjs` par défaut). Avec `--bruitages`, sons synthétisés par `sfx.py` : souffle à l'explosion, clochette quand la maison se reforme et quand l'euro se forme,
tic à la clé, souffles sur les coups de fouet, tics du compteur, bulles à chaque forme, à chaque porte (02 → 05),
clochette à 06/06, bulles des lignes de fin. `sfx.py` n'a pas de « clic de serrure », « tin » ni « dong » : remplacés par
tic, clochette et bulle.

## Publication

Accord de RBTI confirmé par le propriétaire (« Oui tout est bon »). Étiquette « Contenu généré par IA » activée (voix
clonée). Couverture : l'image 0. R.B.T.I. est épelé par la voix ; les sous-titres écrivent « RBTI ».

**Légende**

> 4 200 particules, pas un seul mot : une maison, une clé, un euro. En bas du site de RBTI Location (sous-location encadrée à Paris), le métier se dessine en lumière, et la méthode passe par 6 portes en 3D. Site créé par LTNS°. Partout en France à distance, sur place en Île-de-France · devis gratuit sous 48 h, lien en bio.

**Hashtags** : `#creationsiteweb #immobilier #webdesign #motiondesign #3d #siteinternet`
