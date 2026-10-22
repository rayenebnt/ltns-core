# Semaine « vrais projets » : 7 vidéos en motion design

Proposition du 22 octobre 2026, à valider avant production. Chaque vidéo est construite sur un **vrai site ou logiciel réalisé par LTNS°**, filmé à partir du vrai code, sans site d'exemple.

Règles appliquées à chaque vidéo :
- dès la première image, le vrai visuel fini et le titre à l'écran ;
- pas d'intro ;
- quelque chose bouge à chaque seconde ;
- sous-titres mot à mot ;
- 17 à 22 s, en boucle.

Les planches de captures sont dans `planches/`, et le détail complet (storyboards seconde par seconde, sources de chaque fait) dans `concepts.json`.

## Ordre de publication proposé

ORDRE DE PUBLICATION
À 18 h 30. La couverture est l'image 0 et l'étiquette IA est activée.
- J1, lun. 26/10 : vidéo 2, PMSB « Sur ce site, ta souris nettoie la façade. ». C'est l'accord le plus avancé.
- J2, mar. 27/10 : vidéo 3, Swatter TV « Ces montagnes n'existent pas. ». Client actif : devis accepté, acompte payé le 16/10.
- J3, mer. 28/10 : vidéo 4, PMSB Gestion « Ses devis ? À la main. J'ai créé ça. ». Remplacée par R2 si l'ép. 04 a déjà été publié.
- J4, jeu. 29/10 : vidéo 1, Le Crousty « Comment ces lettres passent derrière lui ? ». C'est la meilleure accroche, et ça laisse 7 jours pour obtenir les deux accords.
- J5, ven. 30/10 : vidéo 5, PMSB « Il fait de l'étanchéité. Son site fait pleuvoir. ».
- J6, sam. 31/10 : vidéo 6, RBTI « 4 200 particules. Pas un seul mot. ».
- J7, dim. 1/11 : vidéo 7, PMSB Gestion « Facture impayée : qui écrit la relance ? ».

Pourquoi cet ordre :
- PMSB ne passe jamais deux jours de suite.
- Les matières alternent : pierre sombre, nuit et or, papier blanc, vrai resto, eau bleue, particules violettes, appli claire.
- J1 ne dépend plus des deux accords les plus incertains.

RÈGLE D'ACCORD
Rien ne sort sans le oui écrit du client concerné (et, pour le Crousty, de l'homme filmé).
- Envoyer aujourd'hui les 4 demandes :
  - PMSB : site, photos de chantier, Gestion en démo ;
  - Le Crousty et l'homme filmé : nom, vidéo, photos, et montrer le site avant sa validation ;
  - Swatter TV : montrer la maquette avant la mise en ligne ;
  - RBTI : message prêt dans /home/user/ltns-core/docs/FICHE-GOOGLE.md, section 6a.
- Si l'accord d'une vidéo n'est pas arrivé la veille à 18 h, elle laisse sa place à la prochaine vidéo prête et glisse en fin de semaine, puis à la semaine suivante.
- Si le oui de PMSB n'est pas arrivé le dimanche 25 au soir, toute la série glisse d'une semaine : 4 vidéos sur 7 en dépendent.
- Si un accord est refusé, vidéo de secours, uniquement avec PMSB :
  - R1 « Cette façade, avant… » : seulement si PMSB confirme que les photos sont les siennes, et sans jamais dire « même angle » ;
  - R2 PMSB Gestion « Facturer un chantier à 75 % ? » (videos/v3-situation-avancement.webm, démo) ;
  - R3 PMSB « 000 → 100, le rideau, puis le mur » (clips/accueil-intro-mobile.mp4).
- Cette semaine de 7 vidéos remplace, pour TikTok, le rythme d'une vidéo par semaine prévu dans PLAN-30-JOURS.md. La prospection privée continue à côté.

ORDRE DE FABRICATION
1. Créer video/commun/check-hook.py à partir de /tmp/claude-0/-home-user-ltns-core/353cf8ed-4309-504e-b0cc-6e0e4e783db7/scratchpad/rescue_motion.py (aucun commit).
2. Les recaptures :
   - le héros PMSB à la souris, avec le contrôle de contraste ;
   - Étanchéité masquée, page remontée, graine fixée ;
   - Crousty « entrée masquée » et « lettres seules » ;
   - la maquette Swatter @3 en vidéo ;
   - les niveaux 1 et 2 du panneau Relances, le clic « Relancer » et la frappe « pein » en DPR 2 ;
   - les rendus render.c ;
   - la scène morph RBTI en 1080x1080.
3. Les vidéos 2, 4, 5 et 7 dès que tes fichiers voix arrivent. Les vidéos 3, 1 et 6 au fur et à mesure des accords.
4. Chaque MP4 passe check-hook.py avant d'être publié.

## Vidéo 1 : Vrai projet · Le Crousty : « Comment ces lettres passent derrière lui ? »

- **Projet :** Le Crousty, site vitrine d'un fast-food de Bonneuil-sur-Marne (94). Étape 4 « À valider », non publié, sans domaine. Dépôt : /home/user/rayenebnt/crousty-
- **Durée :** 21.3 s
- **Titre à l'écran :** COMMENT CES LETTRES / PASSENT DERRIÈRE LUI ?

**Première image**

Plein cadre 1080x1920 : la vraie fin de l'entrée du site, à p≈0,93, recapturée avec l'interface masquée par CSS injecté (nav, intro, paragraphe, boutons).
- On voit la salle du resto, les écrans de menu en haut (y≈160-600) et les 7 lettres orange CROUSTY en 3D, allumées (y≈600-810, x≈145-940).
- Le bas du S et du T passe derrière la casquette de l'homme, vu de dos (y≈740-900, x≈600-780, hors des zones TikTok).
- Aucun paragraphe « … à la mozzarella », aucun bandeau ni bouton.
- Titre fixe y≈240-470, en Anton blanc (la police du site), posé sur les écrans de menu assombris par un dégradé, avec « DERRIÈRE LUI » en orange #FF6A13.
- Repli : sequence-entree-mobile/f065.png (lettres posées, S derrière la casquette, aucun paragraphe), avec la nav sortie du cadre par un zoom de 1,06 ancré en bas.

Pourquoi on s'arrête : on dirait un effet spécial de clip dans un vrai fast-food de quartier. L'œil cherche comment la lettre passe derrière la casquette, et le titre pose exactement cette question sans le son. Le néon vacille dès 0,1 s.

**Voix (ElevenLabs)**

```
Comment ces lettres passent derrière lui ? [pause] Trois calques. [pause] Au fond, leur propre vidéo TikTok, découpée en quatre-vingt-cinq images. [pause] Au milieu, les lettres, qui tombent une par une. [pause] Devant, lui, détouré. [pause] Et sur le site, c'est ton pouce qui te fait marcher jusqu'au comptoir. [long pause] T'as des vidéos de ton commerce ? [pause] Elles peuvent devenir ton site.
```

**Déroulé**

Calage voix estimé, à recaler sur les silences : V1 0,1-1,9 · V2 2,05-2,75 · V3 2,9-6,2 · V4 6,55-9,3 · V5 9,65-11,0 · V6 11,35-14,8 · pause longue · V7 15,7-17,3 · V8 17,6-19,3.

0-1 s : image 0. Le néon vacille deux fois : on alterne deux vraies images de la capture masquée (p 0,90 éteint, p 0,93 allumé). Poussée de 1,00 à 1,03. Les mots du titre s'allument en orange au rythme de V1. Son : grésillement de néon, musique basse.
1-2 s : poussée jusqu'à 1,15 au plus vers le S. Un cercle orange fin se trace autour du chevauchement S/casquette.
2-3 s : V2 « Trois calques. ». Rotation de 20°, et l'image se sépare en 3 plans espacés : le fond (public/hero/fin.webp), les lettres (capture « lettres seules »), la personne (fin-personne.webp). Un « clac » par plan. Le titre s'efface entre 2,8 et 3,0 s.
3-4 s : relance. Étiquette « VRAI PROJET · SITE DU CROUSTY ». Le plan du fond s'allume, les deux autres passent à 40 %, repère « 1 · leur vidéo TikTok ». Sur ce plan, la vraie marche de dos défile (public/hero f038 à f060, sans interface). Sous-titre de V3.
4-5 s : le fond éclate en une grille de 85 cases (9 colonnes, x 90-910, y 330-1000). Les 47 vignettes de dos (f038 à f084) sont en image. Les 38 premières sont des aplats orange numérotés. Son : rafale d'obturateur.
5-6 s : vague d'allumage case par case, comme un folioscope. Compteur 01 → 85 au centre, qui s'arrête sur 85.
6-7 s : la grille se recompacte. V4 : le plan du milieu s'allume, repère « 2 · les lettres », et les lettres remontent hors du plan.
7-8 s : C, R, O, U retombent une par une, avec un « boum » et une secousse de 4 px à chaque lettre.
8-9 s : S, T, Y retombent, ralenti x0,5 sur le S.
9-10 s : le néon s'allume (lettres seules allumées), halo orange, « bzz-clac ».
10-11 s : V5. Le plan de devant s'allume, repère « 3 · lui, détouré ». Un pointillé blanc fait le tour de sa silhouette (masque alpha de fin-personne.webp).
11-12 s : les 3 plans se recollent (de 20° à 0°) et le bas du S repasse derrière la casquette, avec un flash du halo.
12-13 s : V6. Rembobinage rapide avec un son de bande : les lettres remontent, retour dans la capture masquée à p≈0,45, de dos.
13-14 s : un indicateur de pouce descend le long du bord gauche (x 60-140, y 500-1100). La marche avance de p 0,45 à 0,55.
14-15 s : de p 0,55 à 0,66 : les écrans de menu se rapprochent, on arrive au comptoir.
15-16 s : pendant la pause longue, les lettres retombent en accéléré (p 0,70 à 0,93 en 1 s) et le néon s'allume.
16-17 s : V7. Tout rentre dans un téléphone vectoriel sans marque (x 160-920, incliné à 8°) : l'état final du site, recadré sur « Compose ton menu » et « Voir la carte », paragraphe masqué. Badge « Site en cours de validation ».
17-17,6 s : tap avec une onde sur « Compose ton menu ». Les onglets Burgers puis Tacos glissent dans le téléphone (compose-tab-burgers.png, puis compose-tab-tacos.png).
17,6-20,3 s : fin (voir « end »).
20,3-21,3 s : boucle.

**Fin**

17,6-20,3 s : pendant V8, le téléphone remonte et rétrécit. La salle floutée continue de vivre : le néon vacille, la caméra dérive. V8 s'affiche en gros (y 620-860), avec « ton site » en orange. Puis :
- à +0,7 s, « Devis gratuit sous 48 h · lien en bio » ;
- à +1,3 s, « Partout en France à distance · sur place en Île-de-France » ;
- à +1,9 s, « LTNS° » et, en petit, « Site du Crousty en cours de validation · pas encore en ligne ».
Tout tient entre y 620 et 1180, x 80-900.

20,3-21,3 s : la carte se dissout. Les lettres retombent du haut (capture masquée p 0,86 à 0,93 en accéléré) et se posent exactement comme à l'image 0, puis le titre revient à 21,0 s. La dernière image est l'image 0, et « … ton site » enchaîne sur « Comment ces lettres passent derrière lui ? ».

**Légende et hashtags**

Comment ces lettres passent derrière lui ? Trois calques : la vidéo TikTok du resto découpée en 85 images, les lettres, et lui, détouré. C'est l'entrée du futur site du Crousty (Bonneuil-sur-Marne), en cours de validation, créé par LTNS°. T'as des vidéos de ton commerce ? Elles peuvent devenir ton site. Partout en France à distance, sur place en Île-de-France · devis gratuit sous 48 h, lien en bio. #creationsiteweb #siterestaurant #motiondesign #webdesign #fastfood #commercelocal

**Faits et sources**

FAITS UTILISÉS
1. « leur propre vidéo TikTok, découpée en quatre-vingt-cinq images » : src/data/hero.json (count 85, fps 15) ; README l.5 et docs/etape-4-site.md l.7. Les vidéos ont été envoyées par le restaurant (restaurant.json l.27).
2. « Trois calques », les lettres qui tombent une par une, lui détouré : Hero.tsx l.1-7 et l.15-16, tools/hero/personne.mjs. Il existe aussi une couche d'ombrage : on parle des trois calques visibles.
3. « ton pouce qui te fait marcher jusqu'au comptoir » : Hero.tsx, WALK = 0,66.
Effets de montage, jamais présentés comme le comportement du site : vue éclatée, grille, rembobinage, ralenti.

STATUT
- Site non validé (README étape 4, validatedByRestaurant: false) et non publié.
- Le restaurant collabore (étape 1 validée, photos et vidéos envoyées), mais aucun devis ni accord de publication n'est dans le dépôt.
- Ne jamais dire « en ligne » ni « livré », et n'annoncer aucun résultat.

ACCORD, BLOQUANT
- OK écrit du Crousty pour son nom, sa vidéo, ses photos ET pour montrer un site encore non validé.
- OK de l'homme filmé : même de dos, ses proches le reconnaissent.

À ÉVITER
- Le visage (sources f000 à f037, captures avant p 0,45, galerie « L'entrée » et « La salle »).
- Les horaires de la porte.
- Toute mention « mozzarella » (menu.json toVerify).
- Le filigrane TikTok effacé : ne pas en parler.
- Tout prix.
- Les gros plans sur les marques.
- « Elles peuvent devenir ton site » reste une offre générale, pas une promesse.

## Vidéo 2 : Vrai projet · PMSB : « Sur ce site, ta souris nettoie la façade. »

- **Projet :** PMSB, site vitrine (pmsbbatiment.fr, capturé sur un build de production local) : le héros WebGL StoneWall et la page Réalisations. Dépôt : /home/user/rayenebnt/pmsb-ravalement
- **Durée :** 17.6 s
- **Titre à l'écran :** SUR CE SITE, TA SOURIS / NETTOIE LA FAÇADE.

**Première image**

Plein cadre 1080x1920 : le vrai héros WebGL de PMSB, capturé en temps virtuel avec une souris scriptée.
- Le mur de pierres de taille en 3D, encrassé (pierres presque noires).
- Autour de l'anneau du curseur du site (y≈650-1100, x≈200-880), une zone de pierre claire avec un front de nettoyage marqué, qui suit le curseur.
- Le bord des grandes lettres « PMSB » entre dans le cadre.
- Le numéro de l'en-tête et le rail d'adresse sont hors cadre ou masqués.
- Titre fixe y≈240-470, en Archivo très gras blanc, avec « NETTOIE » dans le bleu des pastilles du site.

Contrôle avant montage : la zone propre doit être nettement plus claire que le reste du mur. Sur la capture existante (t=3,0 s), elle est discrète. Sinon, repli : une tranche verticale de accueil-curseur-desktop.mp4 centrée sur l'anneau, éclaircie au montage, sans rien ajouter.

Pourquoi on s'arrête : le contraste sale/propre se lit en une image, c'est une interaction rare sur un site d'artisan, et le titre explique le geste sans le son. Le front bouge dès la première image.

**Voix (ElevenLabs)**

```
Sur ce site, ta souris nettoie la façade. [pause] P.M.S.B. fait du ravalement… [pause] alors son mur est en trois D, sans modèle importé, et il se monte rang par rang. [pause] Sur téléphone, la lumière se promène toute seule. [pause] Et plus bas, ses réalisations, en avant, après. [long pause] Ton métier, ce serait quel geste ?
```

**Déroulé**

Calage voix estimé : V1 0,1-2,2 · V2 2,35-3,6 · V3 3,75-7,9 · V4 8,25-10,4 · V5 10,75-13,2 · pause longue · V6 14,1-15,8.

0-1 s : image 0. L'anneau glisse vers la droite et le front suit : les pierres passent de la suie à la pierre claire. Poussée de 1,00 à 1,03. Les mots du titre s'allument en bleu au rythme de V1. Son : brosse douce et souffle.
1-2 s : macro à 160 % sur un joint : une pierre bascule de sale à propre.
2-3 s : sous-titre de V2. Le curseur remonte, la caméra du site fait sa parallaxe, léger dézoom sur le bord des lettres PMSB. Le titre reste jusqu'à 3,0 s.
3-4 s : relance. Étiquette « VRAI PROJET · PMSB ». Le mur se démonte à l'envers (mur-seul-mobile.mp4 lu de 1,4 à 0,5 s en 0,8 s) jusqu'au noir. Son de bande qu'on rembobine.
4-5 s : V3. Sur le noir, le vrai préchargeur (accueil-intro-mobile.mp4 de 0 à 1,5 s, x1,5) : « PMSB / Prestations Multi Services Bâtiment », compteur 000 → 100, tics.
5-6 s : le rideau s'ouvre (intro de 1,5 à 2,2 s), puis le premier rang tombe au ralenti x0,5 (60 i/s). « Clac ».
6-7 s : les rangs suivants se verrouillent de bas en haut, un trait bleu fin sous chaque rang.
7-8 s : une carte de code glisse (JetBrains Mono, x 120-900) avec deux vraies lignes de StoneWall.tsx : l.13 « l'appareil se monte assise par assise » et l.17 « Le curseur, lui, ravale ». « ravale » s'allume. Repère « aucun modèle 3D importé ».
8-9 s : V4. La carte sort. Un téléphone vectoriel (x 180-900, incliné à 10°) montre le héros mobile fini (intro à t=7,0 s), un reflet glisse sur la vitre.
9-10 s : zoom dans le téléphone. La tache de lumière dérive seule (mur-seul-mobile de 3,0 à 5,8 s, x2), suivie d'une trace pointillée.
10-11 s : écran partagé (x 140-920). À gauche, le téléphone, où la lumière dérive seule. À droite, un ordinateur vectoriel (accueil-curseur-desktop), où la souris nettoie. V5 commence.
11-12 s : défilement : la façade se disperse en pierres (accueil-scroll-mobile de 0 à 1,5 s, coupé avant les compteurs). Puis le comparateur bardage dans le téléphone (realisations-avant-apres-1-mobile.mp4) : la poignée glisse d'APRÈS vers AVANT, son de glissé.
12-12,6 s : la poignée se pose à 50 %. Repère « page Réalisations du site ».
12,6-13,3 s : le rail « Nos réalisations » défile (accueil-visite-mobile.mp4). Seulement pignon, cheminée, brique et marbre.
13,3-14,1 s : pendant la pause longue, zoom sur le pied de page « Site réalisé par LTNS », dont le soulignement se trace. Téléphone et e-mail floutés.
14,1-16,6 s : fin (voir « end »).
16,6-17,6 s : boucle.

**Fin**

14,1-16,6 s : V6 en gros (y 620-860), « geste » en bleu, sur le mur flouté à 6 px où la zone propre continue de suivre le curseur scripté. Puis :
- à +0,7 s, « Devis gratuit sous 48 h · lien en bio » ;
- à +1,3 s, « Partout en France à distance · sur place en Île-de-France » ;
- à +1,9 s, « LTNS° ».
Tout tient entre y 620 et 1180, x 80-900.

16,6-17,6 s : les pierres dispersées se ressoudent (assemblage rejoué en avant, accéléré). La caméra retrouve le cadrage exact de l'image 0, curseur et front au même endroit, et le titre revient. La dernière image est l'image 0, et « quel geste ? » enchaîne sur « Sur ce site, ta souris nettoie la façade ».

**Légende et hashtags**

Sur ce site, ta souris nettoie la façade. Le site de PMSB, entreprise de ravalement en Île-de-France : un mur 3D sans modèle importé, qui se monte rang par rang, et plus bas leurs réalisations en avant/après. Site réalisé par LTNS°. Partout en France à distance, sur place en Île-de-France · devis gratuit sous 48 h, lien en bio. #creationsiteweb #siteinternet #ravalement #artisanbtp #webdesign #3d

**Faits et sources**

FAITS UTILISÉS
1. « ta souris nettoie la façade » : StoneWall.tsx l.17-18. C'est une zone propre qui suit le curseur (uLight, l.339-342), pas un nettoyage qui reste. Ça marche sur ordinateur (pointermove sur window, lib/webgl.ts l.147-148).
2. « Sur téléphone, la lumière se promène toute seule » : StoneWall.tsx l.338-341 (dérive tant que le curseur n'a pas bougé).
3. « en trois D, sans modèle importé, … rang par rang » : README l.106 et StoneWall.tsx l.13.
4. « P.M.S.B. fait du ravalement » : lib/site.ts l.9.
5. « ses réalisations, en avant, après » : page Réalisations (lib/site.ts, bardage avant/après). Jamais « vrais chantiers », « même mur » ni « même angle ».
6. Crédit : lib/site.ts l.26-29.
Effets de montage : démontage, ralenti, écran partagé.

À CONFIRMER
- OK écrit de PMSB pour TikTok et pour les photos.
- Les photos sont-elles bien les leurs ?
- La version en ligne de pmsbbatiment.fr : pas de domaine à l'écran ni dans la légende avant vérification.

À MASQUER
- 06 13 40 19 01, l'e-mail, le rail d'adresse, LinkedIn et Google.
- Les compteurs 15+, 500+, 100 % et les nombres de l'animation.
- Le badge RGE, les images de banque, la clinique, image_real.JPG, les plaques.

Aucun chiffre ni prix.

## Vidéo 3 : Vrai projet · Swatter TV : « Ces montagnes n'existent pas. »

- **Projet :** Swatter TV & Info, web TV locale de Thyez (Haute-Savoie), client de LTNS° (devis 2026-001 accepté, acompte payé le 16/10/2026) : maquette animée de la refonte, avec des paysages provisoires calculés par render.c. Dépôt : /home/user/rayenebnt/swatter-tv
- **Durée :** 19.1 s
- **Titre à l'écran :** CES MONTAGNES / N'EXISTENT PAS.

**Première image**

Plein cadre : la vraie maquette mobile de Swatter TV, recapturée en vidéo nette (390x844 @3 = 1170x2532, ramenée à 1080 de large et cadrée en haut). La barre d'onglets tombe hors cadre.
- Des sommets dorés au crépuscule, avec le vrai zoom lent et la neige de la maquette déjà en mouvement.
- Les badges EN DIRECT / DOCUMENTAIRE / HAUTE-SAVOIE vers y≈730-900.
- Le titre doré du site, « Mont-Blanc, le toit de l'Europe », vers y≈975-1195 (x≤910).
- Le logo de la maquette (reconstitution du logo de la chaîne) en haut à gauche.
- Titre fixe y≈230-450 dans le ciel, blanc très gras avec une ombre, « N'EXISTENT PAS » en dégradé or #F8E2A0→#B5832A (charte du client).

Pourquoi on s'arrête : l'image dit « Mont-Blanc », le titre dit que ça n'existe pas, alors on regarde la roche pour vérifier. À 0,5 s, l'interface s'envole et il ne reste que la montagne.

**Voix (ElevenLabs)**

```
Ces montagnes n'existent pas. [pause] Elles sortent de trois cent seize lignes de code. [pause] Même sommet, huit lumières. [pause] C'est la maquette du nouveau site d'une télé locale de Haute-Savoie, en attendant les images de la chaîne. [pause] Autour, le direct, le programme, le top dix, comme sur une appli de streaming. [long pause] Tu les aurais prises pour des vraies ?
```

**Déroulé**

Calage voix estimé : V1 0,1-1,6 · V2 1,75-3,9 · V3 4,25-5,7 · V4 6,05-10,4 · V5 10,75-14,6 · pause longue · V6 15,5-17,3.

0-1 s : image 0 (zoom lent et neige réels). À 0,5 s, le logo, les badges, le titre du programme et les boutons se détachent en 3D et s'envolent en 0,4 s (« swish »). Il reste hero-crepuscule.webp, la même image que derrière l'interface. Les mots du titre s'allument en or au rythme de V1. Son : vent léger.
1-2 s : V2. Poussée macro sur l'arête : le grain de la roche calculée.
2-3 s : le paysage se « dé-calcule » en gros pixels avec de vrais rendus de render.c de plus en plus petits (540x960, 270x480, 135x240, 68x120). Petits clics numériques. Le titre reste jusqu'à 3,0 s.
3-4 s : relance. Étiquette « VRAI PROJET · SWATTER TV ». Sur fond noir, le vrai code de render.c défile en or, en police à chasse fixe, avec un compteur « 316 lignes ».
4-5 s : le code redevient image : 68x120, 135x240, 270x480, 540x960, puis 1080x1920 net. Tampon « calculé, pas photographié ».
5-6 s : V3. Huit lumières sur le même sommet, 0,12 s chacune : crépuscule, nuit, matin, alpenglow, mer de nuages, hiver, été, heure bleue. Un « ting » par lumière, compteur 1 → 8.
6-7 s : une grille 2x4 des 8 préréglages se pose (x 120-920). Repère « 1 montagne, 8 lumières ».
7-8 s : V4. La case 0 grandit et devient un téléphone vectoriel incliné, où l'interface de la maquette revient. Repère « maquette · rendus 3D provisoires ».
8-9 s : zoom sur le badge HAUTE-SAVOIE, qui pulse.
9-10 s : plein cadre sur un travelling avant calculé par render.c (dolly 1080x1920), pendant « en attendant les images de la chaîne ».
10-11 s : retour au téléphone : le carrousel du héros passe au programme suivant (capture @3 de la maquette).
11-12 s : V5. Le badge EN DIRECT pulse et la barre de programme avance (animations réelles de la maquette).
12-13 s : Programme TV : la ligne dorée « maintenant » traverse la carte EN COURS (m-07-programme recadré sous la météo).
13-14 s : Top 10 : les grands chiffres dorés 1, 2 et 3 glissent à l'horizontale (m-03-top10 recadré sous la météo).
14-15 s : un ordinateur vectoriel (x 140-920) : le carrousel passe de « Mont-Blanc » à « La nuit du loup » (maquette-desktop-hero.webm, sans « 4,5 ★ » ni le nombre de vues).
15-15,5 s : pendant la pause longue, plein cadre sur la nuit étoilée (préréglage 1), avec la neige.
15,5-18,1 s : fin (voir « end »).
18,1-19,1 s : boucle.

**Fin**

15,5-18,1 s : V6 en gros (y 620-860), « vraies » en or, sur la nuit étoilée qui dérive lentement, avec la neige. Puis :
- à +0,7 s, « Devis gratuit sous 48 h · lien en bio » ;
- à +1,3 s, « Partout en France à distance · sur place en Île-de-France », avec « à distance » mis en avant (client en Haute-Savoie) ;
- à +1,9 s, « LTNS° » et, en petit, « Maquette · rendus 3D provisoires ».

18,1-19,1 s : fondu de la nuit vers le crépuscule sur le même sommet. L'interface de la maquette retombe à sa place et le titre revient. La dernière image est l'image 0, et « pour des vraies ? » enchaîne sur « Ces montagnes n'existent pas ».

**Légende et hashtags**

Ces montagnes n'existent pas : 316 lignes de code les calculent, même sommet, 8 lumières. C'est la maquette du nouveau site de Swatter TV, télé locale de Haute-Savoie, faite à distance par LTNS°. Rendus 3D provisoires, en attendant les images de la chaîne. Tu les aurais prises pour des vraies ? Partout en France à distance, sur place en Île-de-France · devis gratuit sous 48 h, lien en bio. #webdesign #3d #creationsiteweb #maquette #motiondesign #siteinternet

**Faits et sources**

FAITS UTILISÉS
1. « trois cent seize lignes de code » : wc -l render.c = 316. La ligne 1 dit « Rendu de paysages alpins par raymarching ». Tous les paysages de la maquette en sortent (maquette/README l.12). La voix ne dit plus « je » : les commits du dépôt sont signés Claude, à Rayene de trancher.
2. « Même sommet, huit lumières » : preset() l.228-262, 8 cas, même graine.
3. « en attendant les images de la chaîne » : maquette/README l.39.
4. « télé locale de Haute-Savoie » : PROMPT_REFONTE.md l.11 (Thyez).
5. « nouveau site » : devis 2026-001 (refonte de swatter-tv.fr).
6. « comme sur une appli de streaming » : comparaison de style. Ne nommer aucune marque.

CLIENT
Prouvé : devis accepté et acompte payé. Ne jamais montrer devis/, factures/, tampon/ (il porte le portable de Rayene), la page « Le groupe » ni les identifiants admin.

LOGO
C'est une reconstitution du logo de la chaîne (maquette/README l.41). Ne jamais dire ni laisser entendre que LTNS° l'a créé.

ACCORD, BLOQUANT
OK écrit de Swatter TV pour montrer la maquette avant la mise en ligne. Le logo est visible dès l'image 0, donc impossible d'anonymiser.

À NE PAS MONTRER
- Le bandeau Flash info et les faits divers.
- Les vraies vignettes de la chaîne, « 4,5 ★ » et « 995 349 vues ».
- La carte météo (« ° », « °C »).
- Les webcams « LIVE ».
« Mont-Blanc » est le nom que la maquette donne à un paysage calculé : la vidéo dit clairement que ce n'est pas réel. Ne jamais dire que le site est en ligne.

## Vidéo 4 : Vrai projet · PMSB Gestion : « Ses devis ? À la main. J'ai créé ça. »

- **Projet :** PMSB Gestion, le logiciel de gestion privé de PMSB, filmé uniquement sur la base de démonstration. Dépôt : /home/user/pmsb-gestion
- **Durée :** 19.6 s
- **Titre à l'écran :** SES DEVIS ? À LA MAIN. / J'AI CRÉÉ ÇA.

**Première image**

Fond graphite, avec le tableau de bord de démo très flouté loin derrière.
- Au centre (x 120-920, y 520-1240) : la vraie page 1 du devis PDF généré par PMSB Gestion (pdf/devis-DEV-2026-0002-1.png, données de démo).
- La feuille est posée en 3D (rotateY −12°, rotateX 8°), avec une ombre douce et le pied de page recadré.
- On y lit « ENTREPRISE P.M.S.B », « Prestations Multi Services Bâtiment », le filigrane P.M.S.B, « Devis N°DEV-2026-0002 » et les lignes numérotées soulignées de rouge.
- Badge jaune « Données de démonstration » de 30 px, collé en haut à gauche de la feuille (y≈540).
- Titre fixe y≈240-470, très gras, avec « ÇA » en bleu #0a6fb8.

Pourquoi on s'arrête : un patron du BTP reconnaît son document de tous les jours, en version pro, et le titre pose le contraste « à la main / ça » sans le son. Un reflet balaie la feuille dès 0,1 s.

**Voix (ElevenLabs)**

```
Ses devis ? À la main. [pause] Alors j'ai créé ça. [pause] Son logiciel : il tape quatre lettres, il clique, et la ligne de travaux arrive avec son prix. [pause] Le total se recalcule tout seul. [pause] Un clic, et le devis sort en PDF, à son en-tête. [pause] Livré en quatre semaines. [long pause] Et toi, tes devis, tu les fais comment ?
```

**Déroulé**

Calage voix estimé : V1 0,1-1,3 · V2 1,45-2,5 · V3 2,85-7,6 · V4 7,95-9,6 · V5 9,95-13,2 · V6 13,55-14,8 · pause longue · V7 15,7-17,7.

0-1 s : image 0. Un reflet balaie la feuille, poussée de 1,00 à 1,04. Les mots « SES DEVIS ? À LA MAIN. » s'allument au rythme de V1. Son : froissement de papier, musique basse.
1-2 s : V2. La caméra descend le long des lignes soulignées de rouge (« 4. Nettoyage haute pression », « 6. Enduit monocouche gratté ») ; « J'AI CRÉÉ ÇA » s'allume.
2-3 s : macro sur « Devis N°DEV-2026-0002 » et le filigrane ; le tableau de bord, derrière, commence à devenir net. Le titre reste jusqu'à 3,0 s.
3-4 s : relance. Étiquette « VRAI PROJET · PMSB GESTION ». La page se « dé-imprime » de bas en haut et rentre dans un ordinateur vectoriel (x 140-920) qui affiche l'éditeur de devis (04b). Son d'imprimante à l'envers.
4-5 s : les modules de la barre latérale s'allument un par un (sidebar.png) : Clients, Devis, Factures, Achats de matériel, Échéancier, Bibliothèque de prix.
5-6 s : zoom sur « Ajouter depuis la bibliothèque… », clic : la liste (04c) jaillit vers la caméra en couche 3D.
6-7 s : les lettres « p-e-i-n » s'affichent en écho géant (200 px), puis rétrécissent dans le champ (nouvelle capture en DPR 2). Quatre clics de clavier.
7-8 s : clic sur « Peinture de façade pliolite » : la ligne tombe dans le tableau avec un rebond et un contour vert (04e). Mini-étiquette « prix de démo ».
8-9 s : V4. Panoramique vers la barre fixe : le total TTC défile (vrai compteur de v2-devis-bibliotheque.webm), « tictictic ». Badge « montants de démonstration ».
9-10 s : le montant se pose avec un rebond ; macro sur l'unité, le prix unitaire HT et la TVA.
10-11 s : V5. Le curseur va sur « Enregistrer et voir le PDF » : onde de clic, flash.
11-12 s : les lignes de l'écran s'envolent et se reposent sur la feuille A4, qui s'imprime de haut en bas dans la pose de l'image 0.
12-13 s : travelling sur l'en-tête « ENTREPRISE P.M.S.B / Prestations Multi Services Bâtiment ».
13-14 s : la page 2 glisse à côté (x≤920) : les totaux, et la case « bon pour accord » entourée.
14-15 s : V6. Typo animée « 4 SEMAINES » : quatre cases S1 à S4 se remplissent.
15-16 s : pendant la pause longue, trois coupes de 0,33 s : tableau de bord sur téléphone (m01), échéancier (10-echeancier), menu du téléphone dont la pastille rouge rebondit (m02).
16-18,6 s : fin (voir « end »).
18,6-19,6 s : boucle.

**Fin**

16,0-18,6 s : V7 en gros (y 620-860), « comment » surligné, sur la feuille floutée qui continue de tourner lentement, avec un reflet qui passe. Puis :
- à +0,7 s, « Logiciel sur mesure · sur devis » et « Devis gratuit sous 48 h · lien en bio » ;
- à +1,3 s, « Partout en France à distance · sur place en Île-de-France » ;
- à +1,9 s, « LTNS° ».
Le badge « Données de démonstration » reste visible.

18,6-19,6 s : la feuille se réimprime de haut en bas et reprend exactement la pose 3D et le reflet de l'image 0, puis le badge et le titre reviennent. La dernière image est l'image 0, et « tu les fais comment ? » enchaîne sur « Ses devis ? À la main. ».

**Légende et hashtags**

Ses devis ? Avant, PMSB les faisait tous à la main. Je lui ai créé son logiciel : bibliothèque de prix, total recalculé tout seul, devis en PDF à son en-tête. Livré en 4 semaines. Données de démonstration à l'écran. Logiciel sur mesure, prix sur devis · partout en France à distance, sur place en Île-de-France · devis gratuit sous 48 h, lien en bio. #logicielsurmesure #devis #artisanbtp #ravalement #batiment #tpe

**Faits et sources**

FAITS UTILISÉS
1. « Ses devis ? À la main. » : RealisationPmsb.jsx l.67, « Avant son logiciel, PMSB faisait tous ses devis à la main » (dit au présent de narration ; la légende dit « faisait »).
2. « il tape quatre lettres, il clique, et la ligne… arrive avec son prix » : la recherche « pein » (04d), puis le clic dans la bibliothèque de prix (README l.15).
3. « Le total se recalcule tout seul » : barre fixe du clip v2.
4. « le devis sort en PDF, à son en-tête » : README l.6, l.24 et l.159.
5. « Livré en quatre semaines » : RealisationPmsb.jsx l.83.

DONNÉES
- Tout est inventé : SCI Les Glycines, M. Durand, Ville-Démo, les numéros fictifs réservés 01 99 00 12 34 et 06 39 98 00 00, les prix, les montants.
- Le badge doit être visible sur chaque plan chiffré. Ne jamais présenter ces montants comme ceux de PMSB.
- Recadrer le pied du PDF (« SARL PMSB au capital… »).

À NE PAS DIRE
Que le devis est « envoyé » : l'envoi par e-mail est une prochaine étape (README l.165). Aucun gain de temps ni résultat.

JAMAIS À L'ÉCRAN
gestion.pmsbbatiment.fr, l'écran Paramètres, la carte « Contrat et documents du chantier », les vrais noms du gérant et de la secrétaire, le dépôt, le .env.

ACCORD
Il est noté dans IDEES.md. La confirmation écrite (PLAN-30-JOURS.md l.24) doit exister avant la publication.

DOUBLON
L'ép. 04 « Coulisses : PMSB Gestion » (IDEES.md l.11) raconte la même histoire. S'il a été publié, on remplace cette vidéo par R2.

## Vidéo 5 : Vrai projet · PMSB : « Il fait de l'étanchéité. Son site fait pleuvoir. »

- **Projet :** PMSB, site vitrine : pages Étanchéité, Isolation et Ravalement. Dépôt : /home/user/rayenebnt/pmsb-ravalement
- **Durée :** 22 s
- **Titre à l'écran :** IL FAIT DE L'ÉTANCHÉITÉ. / SON SITE FAIT PLEUVOIR.

**Première image**

Plein cadre : la vraie membrane satinée de la page Étanchéité du site PMSB, sous la pluie, avec des ondes concentriques bleu nuit.
- Nouvelle capture 1080x1920 à 60 i/s, texte de la page masqué, sauf le grand mot « ÉTANCHÉITÉ ».
- La page est remontée de 230 px, pour que le mot tienne entre y≈740 et 890. Sur la capture actuelle, il descend vers y≈940-1020 et finit vers x≈1010, sous les boutons TikTok.
- Titre fixe y≈240-470, blanc sur un léger voile, avec « PLEUVOIR » dans le bleu du site.
- La graine de Math.random est fixée dans seq.mjs, pour avoir une grosse goutte près du centre à 0,35 s.

Pourquoi on s'arrête : l'image est hypnotique (de l'eau qui bouge), et la phrase fait sourire en se comprenant sans le son.

**Voix (ElevenLabs)**

```
Il fait de l'étanchéité. [pause] Son site fait pleuvoir. [pause] Chaque goutte dessine une onde, calculée en direct. [pause] Page isolation : sur le mur nu, l'énergie s'échappe. [pause] L'isolant se pose, et les pertes sont freinées. [pause] Page ravalement : la brique et la pierre sont calculées, pas photographiées. [long pause] Trois métiers, trois pages, trois scènes. [pause] Et le tien, ce serait laquelle ?
```

**Déroulé**

Calage voix estimé : V1 0,1-1,4 · V2 1,55-2,8 · V3 2,95-5,3 · V4 5,65-8,6 · V5 8,95-11,2 · V6 11,55-15,4 · pause longue · V7 16,3-18,2 · V8 18,55-20,1.

0-1 s : image 0. À 0,35 s, une grosse goutte tombe près du centre et l'onde s'étend, « plic ». Les mots du titre s'allument, avec « PLEUVOIR » en bleu.
1-2 s : V2. Deuxième goutte, poussée lente de 1,00 à 1,08.
2-3 s : troisième goutte, la caméra glisse un peu. Le titre reste jusqu'à 3,0 s.
3-4 s : relance. Étiquette « VRAI PROJET · PMSB ». Dézoom rapide : l'eau plein cadre rentre dans un téléphone vectoriel sans marque (x 180-900), qui montre la vraie page Étanchéité avec tout son texte (etancheite-pluie-mobile.mp4). « Whoosh ». Sous-titre de V3.
4-5 s : on replonge dans le téléphone : les ondes se croisent, reflets satinés en macro. Repère « pluie calculée en direct, pas une vidéo ».
5-6 s : un anneau d'onde grandit jusqu'à remplir l'écran et sert de volet vers la page Isolation.
6-7 s : V4. La coupe du mur (isolation-coupe-mobile.mp4, phase « Mur nu » de 0,4 à 1,2 s, étirée au montage) : les particules traversent le mur, le bouton « MUR NU » est actif. Recadré pour que les phrases « chaleur » et « température » restent hors champ.
7-8 s : zoom x1,5 sur les particules qui sortent côté EXTÉRIEUR. Les mentions INTÉRIEUR et EXTÉRIEUR s'allument.
8-9 s : le bouton « ISOLÉ PAR L'EXTÉRIEUR » pulse.
9-10 s : V5. La vraie bascule : l'isolant vert et l'enduit glissent sur le mur, « clac ».
10-11 s : les particules se raréfient (freinées, pas arrêtées). La liste du site s'allume : 01 Mur porteur · 02 Isolant · 03 Enduit de finition.
11-12 s : V6. Volet latéral vers la page Ravalement : le bloc de brique s'incline (ravalement-matiere-mobile.mp4, recadré sur le bloc).
12-13 s : macro sur les joints de mortier.
13-14 s : coupe sur le bloc Pierre de taille (ravalement-matieres-scroll-mobile.mp4, t≈3,0 s).
14-15 s : coupe sur Plâtre (t≈5,5 s), puis sur Imperméabilisation (t≈8,5 s), une coupe par temps de musique.
15-16 s : pendant la pause longue, rotation lente du bloc, repère « aucune texture chargée : tout est calculé ».
16-17 s : V7. Triptyque pluie | mur | brique (x 120-920) : trois bandes verticales descendent en décalé.
17-18 s : chaque bande reçoit son mot : Étanchéité · Isolation · Ravalement.
18-18,5 s : les bandes respirent (parallaxe).
18,5-21,0 s : fin (voir « end »).
21,0-22,0 s : boucle.

**Fin**

18,5-21,0 s : le triptyque recule, mais il continue de bouger : la pluie, les particules, le bloc qui tourne. V8 en gros (y 620-860). Puis :
- à +0,7 s, « Devis gratuit sous 48 h · lien en bio » ;
- à +1,3 s, « Partout en France à distance · sur place en Île-de-France » ;
- à +1,9 s, « PMSB · site réalisé par LTNS° ».

21,0-22,0 s : le triptyque se referme sur la bande pluie, qui reprend tout l'écran dans le cadrage de l'image 0. Une grosse goutte tombe au centre et le titre revient. La dernière image est l'image 0, et « ce serait laquelle ? » enchaîne sur « Il fait de l'étanchéité ».

**Légende et hashtags**

Il fait de l'étanchéité, son site fait pleuvoir. Sur le site de PMSB : trois métiers, trois pages, trois scènes 3D. La pluie sur une membrane, un mur qui s'isole, la brique et la pierre calculées sans photo. Site réalisé par LTNS°. Partout en France à distance, sur place en Île-de-France · devis gratuit sous 48 h, lien en bio. #etancheite #isolation #ravalement #siteinternet #webdesign #3d

**Faits et sources**

FAITS UTILISÉS
1. « Son site fait pleuvoir », « chaque goutte dessine une onde, calculée en direct » : WaterSurface.tsx l.8-14 et l.176-179 (pluie automatique, positions aléatoires). Seul le clip « pluie » est utilisé.
2. « sur le mur nu, l'énergie s'échappe… les pertes sont freinées » : InsulationDemo.tsx l.31, l.46 et l.90 ; ThermalWall.tsx l.14. Vérifié sur la capture : des particules restent après la bascule. Donc jamais « tout s'arrête ». Aucun mot de température n'est dit ni affiché.
3. « la brique et la pierre sont calculées, pas photographiées » : MaterialCanvas.tsx l.14 et README l.110. C'est vrai pour les blocs seulement : on recadre sur les blocs.
4. « Trois métiers, trois pages, trois scènes » : app/etancheite, app/isolation et app/ravalement, chacune avec sa scène (README l.106-112). « Travaux de rénovations » (lib/site.ts l.140) n'a ni page ni scène.

NON UTILISÉ
ThermalFacade (thermographie), le bloc du héros Ravalement, les « 30 % d'économies » (affirmation du client), les « jusqu'à 14 ondes ».

MÊMES RÈGLES QUE LA VIDÉO 2
OK écrit de PMSB ; coordonnées floutées ; pas de badge RGE ni d'images de banque ; pas de domaine avant vérification ; aucun prix.

## Vidéo 6 : Vrai projet · RBTI : « 4 200 particules. Pas un seul mot. »

- **Projet :** RBTI Location, site one-page de sous-location encadrée à Paris, avec six scènes WebGL écrites à la main. Dépôt : /home/user/rayenebnt/rbti
- **Durée :** 20.6 s
- **Titre à l'écran :** 4 200 PARTICULES. / PAS UN SEUL MOT.

**Première image**

Fond nuit (#05060a), avec le halo violet #6c5cff du site.
- Au centre : la vraie scène « morph » du site, arrêtée sur la maison (frames-morph-alpha).
- La maison est agrandie à environ 760 px de large (x≈160-920, y≈520-1180). Sur chk-morph-seules.png, elle ne fait que 531 px sur 1080.
- Léger bloom et contraste au montage pour que les points fins se lisent. Une nouvelle capture en 1080x1080 est conseillée pour garder la netteté.
- Aucun texte du site.
- Titre fixe y≈240-470, en Space Grotesk gras blanc, avec « 4 200 » et « PAS UN SEUL MOT » en orange #ff6100.

Pourquoi on s'arrête : une forme nette faite de lumière, un chiffre précis, et la promesse de raconter un métier sans texte. À 0,3 s, la maison explose en tourbillon puis se reforme.

**Voix (ElevenLabs)**

```
Quatre mille deux cents particules. [pause] Pas un seul mot. [pause] Une maison… [pause] une clé… [pause] un euro. [pause] R.B.T.I. devient le locataire du propriétaire, et lui verse un loyer fixe. [pause] Sur son site, ce métier se dessine en lumière, juste avant le contact. [pause] Et la méthode ? Six étapes, six portes qui s'allument. [long pause] Ton métier, tu le dessinerais comment ?
```

**Déroulé**

Calage voix estimé : V1 0,1-1,9 · V2 2,05-2,9 · V3 3,05-3,6 · V4 3,75-4,3 · V5 4,45-5,0 · V6 5,35-9,3 · V7 9,65-13,2 · V8 13,55-16,3 · pause longue · V9 17,2-19,0.

0-1 s : image 0. À 0,3 s, la maison éclate en tourbillon (formation lue à l'envers, x2), « whoosh ». Les mots du titre s'allument au rythme de V1. Son : scintillement cristallin.
1-2 s : le tourbillon se referme et la maison se redessine (lecture avant). Poussée de 1,00 à 1,06.
2-3 s : V2 « Pas un seul mot. » : la maison s'illumine d'un coup (flash orange). Le titre s'efface entre 2,8 et 3,0 s.
3-4 s : relance. Étiquette « VRAI PROJET · RBTI ». La maison devient la clé (vrai morph accéléré x3, mention « accéléré » en petit), avec un « clic » de serrure.
4-5 s : la clé devient l'euro, « tin ». L'euro tient.
5-6 s : V6. Dézoom : les particules sont dans la vraie carte du bas du site (« Marre des impayés et des soucis de gestion ? »), affichée dans un téléphone vectoriel (x 180-900). Téléphone et e-mail floutés (vert-J-cta-*).
6-7 s : whip vers le haut, jusqu'au héros : « On devient votre locataire, pas un intermédiaire » passe du flou au net sur la ville 3D de nuit (vert-A-intro-0 puis vert-B-hero). Les puces et « Disponible 7j/7 · Réponse sous 24h » restent hors champ.
7-8 s : « votre locataire » se souligne en orange.
8-9 s : la caméra du site descend l'avenue et les fenêtres s'allument (rbti-skyline-descente.mp4).
9-10 s : V7. Whip vers le bas jusqu'à la carte de contact : macro x3 dans les points, avec un compteur orange qui monte de 0 à 4 200.
10-11 s : maison, clé et euro à x4, puis 0,3 s de la marque RBTI en particules.
11-12 s : le logo RBTI extrudé en 3D oscille (rbti-logo-3d-seul.mp4).
12-13 s : le logo recule et une porte orange s'allume au fond.
13-14 s : V8. Dans un cadre d'ordinateur vectoriel (x 140-920), on traverse un portique orange (rbti-gates-couloir-3d.mp4). Jamais dans un téléphone : cette scène est coupée sur mobile.
14-15 s : le rail de la méthode (rbti-methode-rail-page.mp4) : le compteur passe de 01/06 à 03/06, les cartes glissent sans s'arrêter sur leurs photos.
15-16 s : de 04/06 à 06/06, un « dong » grave par porte, et le dernier portique s'allume.
16-17 s : pendant la pause longue, le champ de 416 cubes se soulève sous le curseur (rbti-champ-cubes-curseur.mp4, cadre d'ordinateur), reflets orange.
17-19,6 s : fin (voir « end »).
19,6-20,6 s : boucle.

**Fin**

17,0-19,6 s : V9 en gros (y 620-860), sur un nuage de particules qui passe lentement d'une forme à l'autre. Puis :
- à +0,7 s, « Devis gratuit sous 48 h · lien en bio » ;
- à +1,3 s, « Partout en France à distance · sur place en Île-de-France » ;
- à +1,9 s, « LTNS° ».

19,6-20,6 s : le nuage se resserre et reforme exactement la maison de l'image 0 (même image de la séquence), puis le titre revient. La dernière image est l'image 0, et « … comment ? » enchaîne sur « Quatre mille deux cents particules ».

**Légende et hashtags**

4 200 particules, pas un seul mot : une maison, une clé, un euro. En bas du site de RBTI Location (sous-location encadrée à Paris), le métier se dessine en lumière, et la méthode passe par 6 portes en 3D. Site créé par LTNS°. Partout en France à distance, sur place en Île-de-France · devis gratuit sous 48 h, lien en bio. #creationsiteweb #immobilier #webdesign #motiondesign #3d #siteinternet

**Faits et sources**

FAITS UTILISÉS
1. « Quatre mille deux cents particules » : scenes.js l.808 (N = 4200).
2. Maison → clé → euro → marque : scenes.js l.805 et l.972-976, environ 3,7 s par forme. La vidéo l'accélère, d'où la mention « accéléré ».
3. « Pas un seul mot » : vaut pour la scène de particules seule. Le site, lui, a du texte, et la vidéo le montre.
4. « devient le locataire du propriétaire, et lui verse un loyer fixe » : titre du site et meta description (index.html l.7-10). C'est l'offre du client décrite, sans « garanti » ni promesse de LTNS°.
5. « juste avant le contact » : la scène morph est dans la carte de contact en bas de page (index.html l.616 et l.634).
6. Six portes : scenes.js l.527 et l.552. 416 cubes : l.693 (26 x 16). Ces deux scènes sont coupées sur mobile (index.html l.387 et l.502), donc montrées dans un cadre d'ordinateur.

ACCORD NON ENREGISTRÉ, BLOQUANT
/home/user/ltns-core/docs/FICHE-GOOGLE.md l.200 : aucun accord noté. Le message est prêt en section 6a. Le nom et le logo sont partout : impossible d'anonymiser.

À ÉVITER
- Flouter 06 25 20 64 93 (c'est aussi le numéro de LTNS° sur le devis Swatter : à clarifier) et contact@rbti.fr.
- Ne jamais montrer « Loyer fixe garanti », « Zéro gestion », « zéro impayé », « Réponse sous 24h » ni « 7j/7 ».
- Ne pas s'arrêter sur les photos d'intérieurs ou de personnes.
- rbti.fr n'est pas vérifié en ligne. Aucune date ni durée.

## Vidéo 7 : Vrai projet · PMSB Gestion : « Facture impayée : qui écrit la relance ? »

- **Projet :** PMSB Gestion, le logiciel de gestion privé de PMSB, filmé uniquement sur la base de démonstration. Dépôt : /home/user/pmsb-gestion
- **Durée :** 20.5 s
- **Titre à l'écran :** FACTURE IMPAYÉE : / QUI ÉCRIT LA RELANCE ?

**Première image**

Fond papier de l'appli (#f4f2ee). Derrière, le tableau de bord de démo est flouté : la carte « En retard » n'est plus qu'une tache rouge.
- Au centre (x 100-920, y 500-1180) : le vrai panneau « Relances » de PMSB Gestion (elements/facture-panneau-relance.png, recadré du titre jusqu'au début du message), une carte blanche légèrement inclinée en 3D.
- On y lit « Relance de la facture FAC-2026-0002 », les choix « 1. Rappel / 2. Relance / 3. Mise en demeure » avec le 3 coché et un halo bleu, et « Madame, Monsieur, Malgré nos relances restées sans effet… ».
- Badge jaune « Données de démonstration », bien lisible dès l'image 0.
- Titre fixe y≈240-470, graphite très gras, avec « IMPAYÉE » en rouge.

Pourquoi on s'arrête : tous les patrons connaissent la facture qui ne rentre pas. La question vise une vraie corvée, et l'image montre déjà la lettre écrite.

**Voix (ElevenLabs)**

```
Facture impayée : qui écrit la relance ? [pause] Dans le logiciel que j'ai créé pour P.M.S.B., c'est lui. [pause] Rappel, relance, mise en demeure : il propose l'étape d'après, avec le texte déjà écrit. [pause] Ça s'ouvre dans ta messagerie, ou ça sort en lettre PDF pour le recommandé. [pause] Et chaque relance est notée. [long pause] Tes impayés, tu les relances comment ?
```

**Déroulé**

Calage voix estimé : V1 0,1-2,1 · V2 2,25-5,0 · V3 5,35-9,6 · V4 9,95-14,3 · V5 14,65-16,1 · pause longue · V6 17,0-18,9.

0-1 s : image 0. Le choix « 3. Mise en demeure » pulse et un curseur de texte clignote dans le message. Poussée de 1,00 à 1,03. Les mots du titre s'allument, avec « IMPAYÉE » en rouge. Son : ding sec.
1-2 s : bascule de mise au point : le panneau se floute, le tableau de bord de démo devient net, et la carte rouge « En retard » (kpi-02, badge démo) sort vers la caméra.
2-3 s : sous-titre de V2. Un ordinateur vectoriel (x 140-920) affiche le bloc « Factures en retard » (dash-factures-en-retard) ; « Relancer » s'allume et le curseur clique. Le titre reste jusqu'à 3,0 s.
3-4 s : relance. Étiquette « VRAI PROJET · PMSB GESTION ». Du bouton, on passe à la fiche facture (08-facture-retard-relance), et le panneau Relances s'ouvre en glissant (nouveau clip).
4-5 s : sur « c'est lui », le texte apparaît d'un coup, déjà rédigé.
5-6 s : V3. Un escalier de 3 marches se dessine. La marche 1 « Rappel » s'allume, avec le vrai panneau au niveau 1 (nouvelle capture).
6-7 s : la marche 2 « Relance » s'allume (panneau au niveau 2).
7-8 s : la marche 3 « Mise en demeure » s'allume (panneau au niveau 3). Trois notes montantes.
8-9 s : le choix saute tout seul au niveau suivant. Repère « étape suivante proposée ».
9-10 s : le vrai texte « Malgré nos relances restées sans effet… » s'écrit comme à la machine à écrire. Les montants restent couverts par le badge démo.
10-11 s : V4. Le curseur appuie sur « Ouvrir dans ma messagerie » (onde). Le vrai message du logiciel s'affiche : « Relance notée. Vérifiez le message dans votre messagerie avant de l'envoyer. ».
11-12 s : il appuie ensuite sur « Lettre PDF ».
12-13 s : la vraie lettre PDF (lettre-relance-FAC-2026-0002-1.png) glisse en A4 (x 140-920) : « Objet : Mise en demeure de payer ».
13-14 s : la caméra descend le long de la lettre, puis la lettre se pose en biais derrière le panneau.
14-15 s : V5. Retour sur le panneau ; le bouton « Copier le texte » s'allume.
15-16 s : l'historique « Rappel le 05/10/2026 — Alex Démo » et « Relance le 15/10/2026 — Alex Démo » reçoit une coche par ligne.
16-17 s : pendant la pause longue, l'échéancier (echeancier-en-retard.png) montre les retards classés par ancienneté, et la pastille rouge de la barre latérale rebondit.
17-19,5 s : fin (voir « end »).
19,5-20,5 s : boucle.

**Fin**

17,0-19,5 s : V6 en gros (y 620-860), « comment » surligné, sur fond papier où l'escalier 1-2-3 continue de s'allumer marche par marche. Puis :
- à +0,7 s, « Logiciel sur mesure · sur devis » et « Devis gratuit sous 48 h · lien en bio » ;
- à +1,3 s, « Partout en France à distance · sur place en Île-de-France » ;
- à +1,9 s, « LTNS° ».
Le badge « Données de démonstration » reste visible.

19,5-20,5 s : le panneau Relances revient dans la pose de l'image 0, le 3 coché avec son halo, et le titre revient. La dernière image est l'image 0, et « … comment ? » enchaîne sur « Facture impayée : qui écrit la relance ? ».

**Légende et hashtags**

Facture impayée : qui écrit la relance ? Dans le logiciel sur mesure créé pour PMSB, c'est lui : rappel, relance, mise en demeure, texte déjà écrit, lettre PDF pour le recommandé, et chaque relance est notée. Données de démonstration, aucune vraie facture. Logiciel sur mesure, prix sur devis · partout en France à distance, sur place en Île-de-France · devis gratuit sous 48 h, lien en bio. #factureimpayee #relanceclient #logicielsurmesure #artisanbtp #batiment #tpe

**Faits et sources**

FAITS UTILISÉS
1. Trois niveaux, texte prêt, « Ouvrir dans ma messagerie » (mailto), « Copier le texte », « Lettre PDF », relance notée : README l.49-50 et PanneauRelance.tsx l.39, l.74-113. Capture vérifiée, avec l'historique du 05/10 et du 15/10/2026.
2. « il propose l'étape d'après » : factures/[id]/page.tsx l.235, niveauDefaut = min(3, dernier niveau + 1).
3. « pour le recommandé » : texte affiché par le logiciel (PanneauRelance.tsx l.74). Ce n'est pas un conseil juridique de LTNS°.
4. « le logiciel que j'ai créé pour P.M.S.B. » : RealisationPmsb.jsx de ltns-core.

DONNÉES
- Tout est inventé : FAC-2026-0002, 16 269,33 €, 15 455,86 €, les retards, Alex Démo, les clients.
- Le badge doit être visible dès l'image 0 et sur chaque plan chiffré, et la légende le redit. Ne jamais laisser entendre que PMSB a des impayés.
- Vérifier que l'IBAN de la lettre de démo est fictif.

À NE PAS DIRE
Que le logiciel envoie lui-même l'e-mail ou le recommandé. Aucun gain de temps ni d'argent.

JAMAIS À L'ÉCRAN
L'instance de production, l'écran Paramètres, la carte « Contrat et documents du chantier », les vrais noms du gérant et de la secrétaire, le dépôt, le .env.

ACCORD
Confirmation écrite de PMSB à obtenir (PLAN-30-JOURS.md l.24).

## Questions pour le propriétaire

- Voix : tu génères les 7 fichiers toi-même dans ElevenLabs, en v4 avec ta voix clonée. Quels réglages utilises-tu d'habitude (stabilité, similarité, style) ? Sinon, je propose stabilité 35-40, similarité 75 et 2 à 3 prises. Pour les fichiers : vrai-projet-01.mp3 à vrai-projet-07.mp3 (le numéro est celui de la vidéo), texte collé tel quel, aucun silence au début. On garde le tutoiement (« ta souris », « ton commerce ») ?
- Prononciation : comment veux-tu entendre P.M.S.B. et R.B.T.I. (lettre par lettre ?), « Swatter TV » (« Swatteur tévé » ?) et « Crousty » ? Si ElevenLabs bute dessus, j'adapte l'écriture dans le script.
- Fin des vidéos : pour l'instant, la voix finit sur une question, et « Devis gratuit sous 48 h · lien en bio » n'apparaît qu'à l'écran. Préfères-tu que la voix le dise aussi ? Ça ajoute environ 2 s par vidéo.
- PMSB : as-tu reçu le oui écrit (SMS ou e-mail) pour TikTok ? Il doit couvrir (a) le site, (b) les photos de chantier avant/après et celles du rail, (c) PMSB Gestion avec des données de démonstration.
- PMSB : les photos du bardage et du rail sont-elles bien les leurs ? L'avant et l'après du bardage viennent-ils du même chantier ? Y a-t-il des plaques, des personnes ou des adresses à masquer ?
- PMSB : la version en ligne de pmsbbatiment.fr est-elle la même que celle que j'ai capturée en local (mur 3D, comparateur) ? Est-ce que je peux écrire le domaine dans la légende ?
- Le Crousty : le dépôt montre une collaboration (étape 1 validée, photos et vidéos envoyées), mais aucun devis. Sont-ils clients ? Ont-ils donné un OK écrit pour leur nom, leur vidéo TikTok, leurs photos, et pour montrer le site avant de l'avoir validé ? L'homme filmé de dos est-il d'accord ? Est-ce que je peux identifier @lecrousty ?
- Swatter TV : client confirmé (devis 2026-001 accepté, acompte payé le 16/10). As-tu leur OK écrit pour montrer la maquette avant la mise en ligne ? Si le nouveau site est en ligne avant la publication, je capture le vrai site à la place. As-tu le fichier du logo officiel ? La maquette utilise une reconstitution, et je n'en parle plus comme d'une création LTNS°.
- render.c a été écrit avec Claude Code (les commits sont signés Claude). La voix dit maintenant « Elles sortent de trois cent seize lignes de code ». Préfères-tu revenir à « Je les ai calculées » ?
- RBTI : as-tu envoyé le message de /home/user/ltns-core/docs/FICHE-GOOGLE.md (section 6a) et reçu un oui écrit ? rbti.fr affiche-t-il bien cette version ? Le numéro sur le site RBTI (06 25 20 64 93) est le même que celui de LTNS° sur ton devis Swatter : c'est voulu ou provisoire ? Je le floute de toute façon.
- L'épisode 04 « Coulisses : PMSB Gestion » (devis à la main, puis logiciel) a-t-il déjà été publié en public ? Si oui, la vidéo 4 fait doublon et je la remplace par la vidéo de secours R2 (situation de travaux à 75 %).
- La formule « Partout en France à distance · sur place en Île-de-France » te convient-elle mot pour mot, pour la carte de fin et les légendes ?
- Calendrier : on publie bien 7 vidéos du lundi 26/10 au dimanche 1/11 à 18 h 30, au lieu d'une vidéo par semaine comme dans PLAN-30-JOURS.md ? Tu republies aussi sur Instagram Reels ?
- Deux bugs ont été repérés pendant les captures, et aucun n'apparaît dans les vidéos : sur le site PMSB, la façade thermique de la page Isolation ne réagit pas à une vraie souris ; dans PMSB Gestion, l'icône trombone n'a pas de taille (SectionDocuments.tsx l.66). Tu veux qu'on les corrige ?
