# Semaine 1 : 7 vidéos, une par jour (conçues le 19 octobre 2026)

Conçues d'après le diagnostic de [PLAN-30-JOURS.md](PLAN-30-JOURS.md) : le résultat visible dès l'image 0, l'accroche écrite en entier de 0 à 3 s, pas de phrase d'annonce, quelque chose qui change chaque seconde, ni avatar ni bandeau avant 3 s, et une boucle.

**Tournage (choix de Rayene) :** pas de visage. Ses mains sur l'ordinateur, filmées au téléphone. Claude envoie pour chaque jour une « version PC » de l'animation, calée sur la voix. Rayene la lance en plein écran et filme ses mains, puis Claude monte la vidéo finale en alternant ses mains réelles et l'animation nette.

Voix : clone ElevenLabs v4 (stabilité 35 à 40, similarité 75, 2 à 3 prises par vidéo). L'étiquette IA reste activée à la publication.

## Logique de la semaine

J1 ouvre sur l'accroche la mieux notée par les juges (opinion-1, 15,5) : un avis qui contredit une idée reçue, prouvé par le vrai doigt dès 2 s. Ensuite, les formats alternent pour ne jamais publier le même deux jours de suite : J1 avis, J2 recherche (« modifier son site soi-même »), J3 construction satisfaisante, J4 avis, J5 recherche (« Instagram ou site »), J6 avis, J7 construction satisfaisante.

Variété. Sept métiers et sept idées différentes : plombier, boucherie, fleuriste/paysagiste/food truck/traiteur, boulangerie, menuisier, restaurant, électricien. Une seule vidéo parle de prix : J7, l'Essentiel dès 490 € TTC, la seule où un prix est dit à voix haute. J2 affiche seulement le badge Pro (990 € TTC), parce que la fonction montrée n'existe que dans cette formule. J2 est aussi la seule vidéo « tu le modifies toi-même » : la vidéo du restaurant (J6) ne montre plus d'édition.

Concepts écartés. Les doublons sont retirés : search-1 et satisfying-5 font doublon avec J7, satisfying-3 avec J2, search-7 avec satisfying-8. PMSB est aussi retiré : l'épisode 04 a déjà raconté ce cas, et l'accord écrit n'est pas arrivé. Dès qu'il arrive, opinion-7 corrigé (« Devis bâtiment : / JAMAIS de zéro ») pourra remplacer une vidéo avis la semaine suivante, jamais s'ajouter.

Gabarit commun aux 7 vidéos :
- Titre fixe complet de 0 à 3 s, dans la bande y≈250-470. Ensuite, sous-titres au même endroit, par phrase entière, jamais sur l'écran du site.
- Écran du téléphone d'environ 560 px de large. Boutons touchés et infos clés entre y≈520 et 1250.
- Rien d'important à droite de x≈930 entre y≈900 et 1500.
- Badge « EXEMPLE · entreprise fictive » lisible en haut du site.
- Ni avatar ni HUD avant 3 s.
- Fin : carte « … Devis gratuit sous 48 h · lien en bio », HUD sur une ligne « LTNS° », petit avatar 1 s, musique de fond basse. La dernière image est identique à l'image 0.

Voix : 45 à 57 mots, 6 phrases, une balise audio au plus (J2 et J4 seulement), un seul mot en capitales au plus.

Publication : chaque jour à 18 h 30, couverture = image 0, étiquette IA et « Votre marque » activées, réponse le jour même aux vrais commentaires, jamais de commentaire inventé.

Production : un seul tournage des mains (environ 2 min) sert aux 7 vidéos, plus 7 générations de voix. Claude rend ensuite les 7 MP4.

## Réglages de voix

- Modèle Eleven v4, avec ta voix clonée. L'étiquette IA reste activée à la publication.
- Stabilité entre 35 et 40 (commence à 38). Plus bas, l'intonation part dans tous les sens ; plus haut, ça redevient monotone.
- Similarité 75.
- S'ils sont proposés : style (exagération) au minimum, Speaker boost activé, vitesse 1,0.
- Colle le champ elevenlabs_text du jour tel quel, en une seule génération. Les [pause] séparent les phrases, et mon script coupe aux silences pour caler chaque phrase sur l'image.
- Génère 2 à 3 prises par vidéo et garde celle où : la première phrase part tout de suite, sans blanc avant ; la question finale monte vraiment ; les nombres sont dits en entier et sans hésiter (quatre cent quatre-vingt-dix, dix-sept, huit, quatre) ; « PDF » sonne pé-dé-èf (J6) ; « Insta », « food truck » et « À propos » sonnent naturels.
- [laughs softly] n'est prévu qu'en J2 et J4. Si le rire sonne forcé dans les 3 prises, retire la balise et régénère plutôt que de garder un faux rire.
- Si une pause dépasse environ une demi-seconde, je la raccourcis au montage. Ne remplace pas [pause] par [long pause].
- Exporte en MP3 haute qualité (ou en WAV) et nomme les fichiers j1.mp3 à j7.mp3. Écoute chaque prise au casque, puis sur le haut-parleur d'un téléphone.

## Jour 1 : Plombier : une page, pas six

*Avis tranché (concept opinion-1, le mieux noté) : pour un plombier, je crée une seule page, pas six. Un client qui a une fuite cherche trois choses : est-ce que tu viens chez lui, ce que tu fais, et ton numéro. Le vrai doigt fait défiler tout le site d'un seul geste, donc la preuve est visible dès 2 s. Corrections des juges appliquées : la phrase 2 parle du client et non plus du geste ; les pastilles « 1 page / 6 pages » sont supprimées (temps mort) ; la carte de zone et le bandeau numéro sont remontés au-dessus de y≈1250 ; la carte « À propos » sort sans tampon moqueur ; aucun prix (il est réservé à J7).* · environ 19 s

**Accroche écrite :** Plombier : une page. / Pas six.

**Image 0 :** Vue de dessus : le vrai téléphone posé à plat sur une table en bois clair (écran vert incrusté), écran d'environ 560 px de large, de y≈500 à y≈1700. À l'écran, le site fini « Plomberie Varenne · plombier » : en haut, le nom et un bandeau numéro « 06 •• •• •• •• » (y≈560-700) ; puis la carte « Je viens chez toi · 15 km autour », avec un cercle sur une mini-carte sans nom de ville (y≈720-980) ; puis trois services avec icônes « Fuite · Chauffe-eau · Salle de bain » (y≈1000-1200). Les chantiers et le contact sont plus bas, hors de l'écran visible. Badge lisible « EXEMPLE · entreprise fictive » en haut du site. Titre fixe sur 2 lignes, blanc gras sur bande sombre, entre y≈250 et 470. Ni main, ni avatar, ni HUD. Petit tick sonore à 0 s. 0,5 s : le bandeau numéro pulse. 1,0 s : les trois icônes de services s'allument l'une après l'autre (pop, clic). 1,6 s : le cercle de la zone se redessine.

**Texte ElevenLabs :**

```
Plombier : une page, pas six. [pause] Un coup de pouce, et ton client a tout vu. [pause] Tes services, ta zone, tes chantiers, ton numéro. [pause] Ton client a une fuite, il cherche pas ta page À propos. [pause] Il veut savoir si tu viens chez lui, c'est TOUT. [pause] Et ton métier, il tient sur une page ?
```

**Déroulé :**

- 0,0-2,0 s · Image 0, qui sert aussi de couverture. VOIX 1 (0,1-1,8 s).
- 2,0-4,9 s · L'index entre par le bas et fait défiler TOUT le site d'un seul geste lent : services, zone, chantiers (3 vignettes illustrées), contact, pied de page. Une fine barre de progression avance sur le bord du site. 3,0 s : le titre fixe s'efface et les sous-titres prennent sa place, par phrase entière, dans la bande y≈250-470 (jamais sur l'écran). 4,4 s : la barre atteint 100 % (ding). VOIX 2.
- 5,2-8,0 s · Une « page fantôme » sort du téléphone en carte 3D toutes les 0,7 s, à gauche et au-dessus du téléphone : Services (5,3 s), Zone (6,0 s), Chantiers (6,7 s), Contact (7,4 s). Chacune se replie dans la page unique avec une coche et un clic. VOIX 3.
- 8,3-11,7 s · Une 5e carte « À propos » sort (8,4 s), hésite (9,0 s), devient grise et glisse hors cadre (9,8 s), sans tampon. 10,6 s : le doigt remonte le site d'un coup, retour en haut. VOIX 4.
- 12,0-14,9 s · 12,2 s : tap sur la carte de zone. Le cercle « 15 km » s'agrandit et pulse (12,6 s), puis le bandeau numéro s'allume (13,6 s). VOIX 5, avec TOUT appuyé.
- 15,2-18,4 s · VOIX 6. Carte de fin dans la zone sûre : « Ton entreprise en Île-de-France ? Devis gratuit sous 48 h · lien en bio », avec une petite étiquette « Formule Essentiel · une page », sans prix. HUD sur une ligne « LTNS° », petit avatar en signature pendant 1 s (17,4-18,4 s). Musique de fond basse tout le long.
- 18,4-19,0 s · Rembobinage éclair de 0,4 s, puis image 0 exacte, sans main : la boucle repart.

**Mains (prévu pour un téléphone à plat, à transposer à l'ordinateur) :** Geste G1 (défilement lent à l'index) à 2,0 s : entrée par le bas, glissé du tiers bas au tiers haut jusqu'à 3,8 s, sortie. Geste G2 : glissé rapide vers le bas à 10,6 s (retour en haut), puis tap franc au tiers haut, au centre, à 12,2 s (carte de zone), sortie à 12,8 s. Aucune main de 0 à 2,0 s ni après 13 s, pour raccorder sur l'image 0.

**Pourquoi on reste :** La première phrase contredit une idée répandue (« plus de pages, c'est plus sérieux »), donc le patron reste pour l'argument. La preuve arrive à 2 s : le vrai doigt fait défiler tout le site d'un geste, et on voit que tout tient. Entre 5 et 10 s, une page fantôme se replie environ chaque seconde, puis « il cherche pas ta page À propos » fait sourire les artisans. Un créateur qui conseille la formule la plus simple, ça donne confiance. La question finale porte sur le métier du spectateur, pas sur son site : il peut y répondre sans se sentir jugé.

**Question finale :** Et ton métier, il tient sur une page ?

**Légende :** Site internet plombier : une page ou six ? Mon avis : une seule, avec tes services, ta zone, tes chantiers et ton numéro. Exemple créé pour la vidéo (entreprise fictive). Création de sites pour artisans en Île-de-France · devis gratuit sous 48 h, lien en bio. Et ton métier, il tient sur une page ?

**Hashtags :** #siteinternet #plombier #artisan #creationsiteweb #ltns

**À confirmer :**

- Rayene assume l'avis : il conseille bien une seule page à un plombier, et garde le Pro pour ceux qui veulent une page par service.
- L'étiquette de fin « Formule Essentiel · une page » n'affiche pas de prix : le prix est réservé à J7.
- « Plomberie Varenne » ne correspond à aucune entreprise réelle d'Île-de-France (recherche Google et annuaire). Numéro masqué, zone « 15 km » fictive, aucune ville citée.
- Faisabilité : le défilement animé doit suivre la vitesse réelle du glissé filmé (synchro image par image après l'incrustation du vert).
- Activer « Votre marque » et laisser l'étiquette IA.

## Jour 2 : Fermé ce samedi : tu le changes toi-même

*Recherche visée : « modifier son site soi-même / site internet modifiable » (concept search-6). Le commerçant a une vraie peur : dépendre de son prestataire pour trois mots. Le vrai doigt fait le geste du boucher : Modifier, « Fermé ce samedi », Publier, et c'est à jour sur le téléphone et sur un ordinateur. C'est une fonction réelle de la formule Pro (« Un espace pour modifier vos textes »). Corrections appliquées : le texte tapé est « Fermé ce samedi », trois mots, identique au bandeau de l'image 0 ; la liste de coches du Pro est remplacée par une 2e vraie modification (les horaires) ; le badge Pro arrive seul à 13 s ; Modifier, le champ et Publier sont placés entre y≈650 et 1200 ; badge exact « EXEMPLE · entreprise fictive ». C'est la seule vidéo « tu le modifies toi-même » de la semaine.* · environ 18 s

**Accroche écrite :** Ton site, / tu peux le changer toi-même ?

**Image 0 :** Vue de dessus : téléphone à plat (écran vert incrusté), écran d'environ 560 px de large, y≈500-1700. À l'écran, le site « Boucherie Léon · boucherie-charcuterie » : tout en haut, un bandeau jaune « Fermé ce samedi » (y≈560-640) ; un petit crayon « Modifier » en haut à droite ; le nom ; une vitrine illustrée ; le bloc « Horaires » ; et un message vert « Publié ✓ » vers y≈1150. Badge « EXEMPLE · entreprise fictive » sous le bandeau. Titre fixe sur 2 lignes, y≈250-470. Ni main, ni avatar, ni HUD. 0,7 s : une surbrillance balaie le bandeau. 1,4 s : « Publié » rebondit. 2,0 s : rembobinage, le bandeau remonte et le message disparaît.

**Texte ElevenLabs :**

```
Ton site, tu peux le changer toi-même ? [pause] Tu touches Modifier, tu tapes : fermé ce samedi. [pause] Tu publies, et ton site est à jour. [pause] Pas besoin de m'appeler pour trois mots. [laughs softly] [pause] Tes horaires, pareil, et c'est dans la formule Pro. [pause] Toi, tu changerais quoi en premier ?
```

**Déroulé :**

- 0,0-2,4 s · Image 0 (couverture). VOIX 1 (0,1-2,2 s). 2,0-2,4 s : rembobinage, le site revient sans bandeau.
- 2,6-5,2 s · L'index entre. 2,7 s : tap sur le crayon « Modifier » : l'espace d'édition s'ouvre (champs « Bandeau d'info » et « Horaires »). 3,0 s : le titre fixe s'efface, sous-titres par phrase entière. 3,4 s : tap dans le champ Bandeau, le clavier monte. 3,9-5,0 s : « Fermé ce samedi » s'écrit lettre par lettre au rythme des taps. VOIX 2.
- 5,5-7,8 s · 5,6 s : tap sur « Publier », puis « Publié ✓ ». 6,2 s : la main sort. 6,4 s : l'écran repasse côté client et le bandeau tombe en haut du site (tac). 7,0 s : le plan recule et se décale à droite. 7,4 s : un ordinateur portable 3D se pose à gauche et affiche le même bandeau. VOIX 3.
- 7,9-10,3 s · Les trois mots du bandeau s'allument un par un (8,2 / 8,6 / 9,0 s) avec un petit compteur « 1 · 2 · 3 ». 9,4 s : une icône de téléphone qui sonne glisse hors cadre. VOIX 4, avec le rire léger.
- 10,5-13,4 s · La main revient. 10,6 s : tap sur « Modifier ». 11,1 s : tap sur la ligne « Samedi » des horaires. 11,4-12,0 s : « fermé » s'écrit. 12,3 s : tap sur « Publier », la main sort. 12,8 s : sur l'ordinateur, « Samedi : fermé » s'affiche avec un flash. 13,1 s : badge seul « Formule Pro · un espace pour modifier tes textes · à partir de 990 € TTC ». VOIX 5.
- 13,6-17,4 s · VOIX 6. Carte de fin « Commerce en Île-de-France ? Devis gratuit sous 48 h · lien en bio ». HUD sur une ligne « LTNS° », petit avatar pendant 1 s (16,4-17,4 s). Musique de fond basse.
- 17,4-18,0 s · L'ordinateur repart et le plan reprend sa taille : image 0 exacte (bandeau et « Publié »), boucle.

**Mains (prévu pour un téléphone à plat, à transposer à l'ordinateur) :** Geste G3 (séquence édition), prise 1, à 2,6 s : tap en haut à droite (Modifier, 2,7 s), tap au tiers haut au centre (le champ, 3,4 s), 8 petits taps rapides dans le tiers bas (3,9-5,0 s), tap franc un peu sous le centre (Publier, 5,6 s), sortie à 6,2 s. Geste G3, prise 2, à 10,5 s : même séquence, plus vive (Modifier 10,6 s, ligne Samedi 11,1 s, frappe 11,4-12,0 s, Publier 12,3 s), sortie à 12,6 s. Aucune main avant 2,6 s ni après 12,6 s. Les lettres apparaissent à l'animation : pas besoin de vraies touches.

**Pourquoi on reste :** Le résultat arrive avant 7 s et se voit sur deux écrans : taper, publier, c'est en ligne. Le geste filmé est exactement celui que le commerçant ferait, donc il se projette. Le compteur « 1 · 2 · 3 » sur les trois mots et le rire désamorcent une vraie inquiétude (« je vais dépendre de lui »). La 2e modification montre que ce n'est pas un coup unique, et la question finale lui fait dire ce qu'il changerait.

**Question finale :** Toi, tu changerais quoi en premier sur ton site ?

**Légende :** Modifier son site soi-même, c'est possible ? Oui : avec la formule Pro (à partir de 990 € TTC), tu as un espace pour modifier tes textes. Tu tapes « Fermé ce samedi », tu publies, ton site est à jour. Exemple créé pour la vidéo (entreprise fictive). Île-de-France · devis gratuit sous 48 h, lien en bio. Toi, tu changerais quoi en premier ?

**Hashtags :** #siteinternet #commercant #boucherie #creationsiteweb #ltns

**À confirmer :**

- Confirmer que l'espace « modifier vos textes » du Pro permet d'éditer un bandeau d'info et les horaires, et qu'il s'utilise sur téléphone. Sinon, ne montrer que la modification des horaires.
- Construire l'écran d'édition à partir d'une capture du vrai outil du Pro : pas d'interface inventée plus simple que la réalité.
- Délai réel d'affichage après « Publier » (cache) : à vérifier avant de dire « ton site est à jour ».
- Vérifier que « Boucherie Léon » ne correspond à aucun commerce réel d'Île-de-France.
- Un prix est affiché (badge Pro) : activer « Votre marque » et laisser l'étiquette IA.

## Jour 3 : Fleuriste, paysagiste : pas le même site

*Construction satisfaisante (concept satisfying-2) : à chaque glissé du vrai doigt, la page se tourne et le site devient celui d'un autre métier. La structure change (ordre des blocs, colonnes, typographie), pas seulement les couleurs. L'idée : chaque site commence par ce qu'on cherche chez ce métier-là, ce qui colle avec « Design créé pour vous » et la FAQ (« jamais à partir d'un modèle tout prêt »). Corrections appliquées : le morphing de couleurs est remplacé par un tourne-page qui change la structure ; 4 métiers au lieu de 5 ; plombier, boulangerie et restaurant retirés (ils ont leur propre jour) ; garage retiré (trop proche du « Réserver » de l'épisode 06) ; une étiquette « EN HAUT : … » change à chaque métier ; aucun numéro de téléphone.* · environ 18.5 s

**Accroche écrite :** Fleuriste, paysagiste : / pas le même site

**Image 0 :** Vue de dessus : téléphone à plat (écran vert incrusté), écran d'environ 560 px de large, y≈500-1700. À l'écran, le site fini « Atelier Pétale · fleuriste », en rose poudré : juste sous le nom, une grille de 6 photos de bouquets sur 2 colonnes (y≈620-1150) ; plus bas, « Mariages · Deuil · Livraison » et un bouton « Commander un bouquet ». Badge « EXEMPLE · entreprise fictive ». Titre fixe sur 2 lignes, y≈250-470. Ni avatar ni HUD. Petit whoosh à 0 s. 0,5 s : l'index entre par la droite et reste au-dessus de l'écran. 1,0 s : un pétale traverse la grille. 1,5 s : une photo grossit un instant.

**Texte ElevenLabs :**

```
Fleuriste : tes bouquets, direct. [pause] Paysagiste : le jardin avant, puis après, en premier. [pause] Food truck : où t'es garé aujourd'hui, et jusqu'à quelle heure. [pause] Traiteur : tes formules, selon le nombre d'invités. [pause] Quatre métiers, quatre sites : chacun commence par ce qu'on cherche chez lui. [pause] Et ton métier, ton site commencerait par quoi ?
```

**Déroulé :**

- 0,0-1,8 s · Image 0 (couverture). VOIX 1 (0,1-1,6 s).
- 1,8-4,6 s · Glissé de droite à gauche : la page se tourne (swish, 0,4 s) et la structure se reconstruit sous les yeux ; la grille devient une seule grande image. 2,2 s : « Les Jardins de Noé · paysagiste », en vert sapin, avec en haut une grande photo avant/après et sa poignée. 2,6 s puis 3,6 s : la poignée balaie et dévoile l'après. 3,0 s : le titre fixe s'efface, sous-titres par phrase entière ; à gauche du téléphone, une petite étiquette « EN HAUT : avant / après ». 4,2 s : une feuille tombe sur l'image. VOIX 2.
- 4,8-8,0 s · Glissé : « Camion Paprika · food truck », rouge paprika et noir. En haut, une grosse carte « AUJOURD'HUI · Devant la gare · 12 h – 14 h » avec une épingle sur une mini-carte sans nom de ville. 5,4 s : l'épingle rebondit. 6,0-6,9 s : le planning de la semaine s'allume du lundi au samedi. 7,4 s : « 14 h » se coche. L'étiquette devient « EN HAUT : l'adresse du jour ». VOIX 3.
- 8,2-10,6 s · Glissé : « Maison Calixte · traiteur », ivoire et or. En haut, trois grandes tuiles « Cocktail · Buffet · Repas assis » tombent à 8,6 / 9,1 / 9,6 s, avec « dès 10 / 20 / 40 invités », sans prix. L'étiquette devient « EN HAUT : tes formules ». VOIX 4.
- 10,8-14,6 s · Dernier glissé : les quatre sites rétrécissent en quatre vignettes côte à côte (11,0 s). Le bloc du haut de chacune s'allume à tour de rôle (11,6 / 12,2 / 12,8 / 13,4 s), ce qui montre que les structures diffèrent. La main sort à 11,2 s. 14,0 s : les vignettes se referment sur le fleuriste. VOIX 5.
- 14,9-17,8 s · VOIX 6. Carte de fin « Ton métier en Île-de-France ? Devis gratuit sous 48 h · lien en bio ». HUD sur une ligne « LTNS° », petit avatar pendant 1 s (16,8-17,8 s). Musique de fond basse.
- 17,8-18,5 s · Image 0 exacte, titre fixe compris : boucle.

**Mains (prévu pour un téléphone à plat, à transposer à l'ordinateur) :** Geste G5 (quatre glissés) : la main entre par la droite à 0,5 s et reste au-dessus de l'écran. Glissés francs de droite à gauche, au milieu de l'écran, à 1,8 s, 4,8 s, 8,2 s et 10,8 s, doigt levé entre chaque. Sortie par la droite à 11,2 s, puis plus aucune main. Chaque tourne-page démarre au contact du doigt.

**Pourquoi on reste :** À chaque glissé, le spectateur attend le métier suivant (« et le mien ? »). Le tourne-page qui réorganise les blocs est très satisfaisant, avec un gros changement toutes les 3 s environ et un petit événement chaque seconde. Les vignettes côte à côte montrent d'un coup d'œil que chaque site est dessiné pour son métier, pas recoloré. La question finale demande au patron ce que son site mettrait en haut : c'est facile à commenter.

**Question finale :** Ton métier, ton site commencerait par quoi ?

**Légende :** Site internet : un fleuriste, un paysagiste, un food truck et un traiteur ne commencent pas par la même chose. Chaque site est dessiné pour son métier. Exemples créés pour la vidéo (entreprises fictives). Île-de-France · devis gratuit sous 48 h, lien en bio. Ton métier, ton site commencerait par quoi ?

**Hashtags :** #creationsiteweb #petiteentreprise #artisan #commercelocal #ltns

**À confirmer :**

- Vérifier que les 4 noms (Atelier Pétale, Les Jardins de Noé, Camion Paprika, Maison Calixte) ne désignent aucune entreprise réelle d'Île-de-France. Aucun nom de ville ; « devant la gare » reste générique.
- Faire 4 vraies maquettes de structure différente (ordre des blocs, colonnes, typographie), pas un modèle recoloré, pour rester cohérent avec « Design créé pour vous » et la FAQ.
- Formules du traiteur sans prix ; photos illustrées ou libres de droits ; ni avis ni étoiles.
- Rayene valide le message « chaque site commence par ce qu'on cherche chez ce métier ».
- Vérifier comment le clone prononce « food truck ».

## Jour 4 : Boulangerie : pas de boutique en ligne

*Avis tranché, contre mon propre intérêt (concept opinion-3) : je déconseille la boutique en ligne à une boulangerie de quartier, alors que c'est du Sur-mesure, donc plus cher. Je crée plutôt une page avec les horaires et le jour de fermeture tout en haut, plus une demande de commande de gâteau, sans paiement en ligne. Le pain s'achète à pied, tous les jours. Corrections appliquées : titre coupé en « Boulangerie : / pas de boutique en ligne » ; étiquette « demande de commande · pas de paiement en ligne » sur le formulaire, ce qui reste cohérent avec le bouton de commande de l'épisode 03 ; passage du piéton réduit à 2 s ; boutons au-dessus de y≈1250 ; étiquette « Formule Essentiel · formulaire de contact » sans prix (le prix est réservé à J7).* · environ 19 s

**Accroche écrite :** Boulangerie : / pas de boutique en ligne

**Image 0 :** Vue de dessus : téléphone à plat (écran vert incrusté), y≈500-1700. À l'écran, le site fini « Boulangerie Ondine », sur une seule page : le nom ; un gros bloc « Ouvert aujourd'hui · 6 h 30 – 19 h 30 » avec un point vert (y≈620-820) ; « Fermé le lundi » en gras (y≈840) ; des viennoiseries illustrées ; le bouton « Commander un gâteau » vers y≈1180. Badge « EXEMPLE · entreprise fictive ». Titre fixe sur 2 lignes, y≈250-470. Ni main, ni avatar, ni HUD. 0,5 s : le point vert « Ouvert » clignote. 1,0 s : une carte 3D « Boutique en ligne · panier » tombe du haut et s'arrête au-dessus du site. 1,7 s : tampon « PAS ICI » sur la carte.

**Texte ElevenLabs :**

```
Boulangerie : pas de boutique en ligne. [pause] En haut, tes horaires, et le jour où t'es fermé. [pause] Là, on demande un fraisier pour samedi, huit parts. [pause] La demande arrive chez toi, tu confirmes. [pause] Je pourrais te vendre une boutique [laughs softly], mais ta baguette, on vient la chercher à pied. [pause] Et toi, tu vendrais en ligne ?
```

**Déroulé :**

- 0,0-2,3 s · Image 0 (couverture). VOIX 1 (0,1-1,9 s). 2,1 s : la carte « Boutique en ligne » repart hors cadre avec un whoosh.
- 2,3-5,0 s · 2,6 s : le bloc des horaires grossit légèrement. 3,0 s : le titre fixe s'efface, sous-titres par phrase entière. 3,4 s : « Fermé le lundi » se souligne. 4,0-4,8 s : l'index entre et fait monter la page ; le bouton « Commander un gâteau » arrive au milieu de l'écran. VOIX 2.
- 5,3-7,9 s · 5,4 s : tap sur « Commander un gâteau » : le formulaire s'ouvre, avec l'étiquette « demande de commande · pas de paiement en ligne ». Taps sur les trois champs, qui se remplissent : « Fraisier » (6,0 s), « samedi » (6,5 s), « 8 parts » (7,0 s). 7,5 s : tap sur « Envoyer », la main sort. VOIX 3.
- 8,2-10,2 s · 8,3 s : une enveloppe part du téléphone. 8,9 s : elle arrive dans un petit encart boîte mail à gauche : « Boulangerie Ondine · nouvelle demande : fraisier, 8 parts, samedi ». 9,3 s : étiquette « Formule Essentiel · formulaire de contact ». 9,8 s : tampon « Confirmé ✓ » sur l'encart. VOIX 4.
- 10,5-15,0 s · 10,6 s : le doigt ramène la page en haut d'un geste. 11,4 s : la carte « Boutique en ligne » réapparaît en fantôme, puis s'efface (12,2 s). 12,4-14,2 s : une petite icône de piéton suit un pointillé jusqu'à une vitrine illustrée. 14,4 s : une baguette apparaît dans la vitrine. VOIX 5, avec le rire léger.
- 15,3-18,4 s · VOIX 6 : deux pastilles « En ligne » et « En boutique » s'allument tour à tour à gauche du téléphone (15,5 / 16,1 s). Carte de fin « Ton commerce en Île-de-France ? Devis gratuit sous 48 h · lien en bio ». HUD sur une ligne « LTNS° », petit avatar pendant 1 s (17,4-18,4 s). Musique de fond basse.
- 18,4-19,0 s · Rembobinage de 0,4 s, puis image 0 exacte : boucle.

**Mains (prévu pour un téléphone à plat, à transposer à l'ordinateur) :** Geste G4 (séquence commande) à 4,0 s : court défilement vers le haut (4,0-4,8 s), tap un peu sous le centre (Commander, 5,4 s), trois taps espacés en descendant au milieu de l'écran (6,0 / 6,5 / 7,0 s), tap un peu sous le centre (Envoyer, 7,5 s), sortie à 7,9 s. Geste G2, glissé rapide vers le bas seulement, à 10,6 s, sortie à 11,0 s. Aucune main de 0 à 4,0 s ni après 11 s.

**Pourquoi on reste :** Un créateur de sites qui refuse de vendre sa formule la plus chère, ça surprend : on reste pour comprendre pourquoi. La commande de fraisier, faite au vrai doigt, est un cas que tout boulanger reconnaît, et l'enveloppe qui part puis arrive se comprend sans le son. La phrase « ta baguette, on vient la chercher à pied » sonne comme un vrai avis, et la question finale coupe les commerçants en deux camps.

**Question finale :** Et toi, tu vendrais en ligne ?

**Légende :** Site internet boulangerie : boutique en ligne ou pas ? Mon avis : non. Tes horaires, ton jour de fermeture et une demande de commande pour les gâteaux, sans paiement en ligne. Exemple créé pour la vidéo (entreprise fictive). Île-de-France · devis gratuit sous 48 h, lien en bio. Et toi, tu vendrais en ligne ?

**Hashtags :** #siteinternet #boulangerie #commercedeproximite #creationsiteweb #ltns

**À confirmer :**

- Le formulaire de contact de l'Essentiel accepte-t-il des champs adaptés (gâteau, jour, nombre de parts) et envoie-t-il la demande par e-mail sans surcoût ? Sinon, retirer l'étiquette « Formule Essentiel ».
- La boutique en ligne relève bien du Sur-mesure dans Tarifs.jsx (vérifié). Rayene assume l'avis à l'oral.
- Cohérence avec l'épisode 03 (boulangerie avec bouton « commander à l'avance ») : ici, c'est une demande sans paiement, et l'étiquette « pas de paiement en ligne » doit rester lisible.
- Vérifier que « Boulangerie Ondine » ne correspond à aucun commerce réel. Horaires fictifs, aucune ville citée.
- Vérifier que [laughs softly] sonne naturel avec le clone v4, sinon retirer la balise.
- Activer « Votre marque » et laisser l'étiquette IA.

## Jour 5 : T'as Insta : garde-le, et ajoute ça

*Recherche visée : « Instagram suffit-il / site internet ou Instagram » (concept search-2). On donne raison à l'artisan (« garde ton Insta ») et on ouvre sur son quotidien : les mêmes questions, encore et encore, en message. Chaque bloc du site qui se construit éteint une de ces questions. Menuisier fictif. Corrections appliquées : la grille de gauche est retirée de l'image 0 ; l'ouverture se fait sur trois bulles de questions génériques ; l'image 0 est tenue jusqu'à 2,4 s ; l'étiquette « les photos que tu m'envoies » évite de faire croire à un import automatique depuis Instagram ; les bulles sont à gauche du téléphone, jamais dans la bande droite ; ni logo ni interface Instagram.* · environ 19.5 s

**Accroche écrite :** T'as Insta, et toujours / les mêmes questions ?

**Image 0 :** Vue de dessus : téléphone à plat (écran vert incrusté), décalé à droite (écran x≈340-900, y≈500-1700). À l'écran, le site fini « Atelier Chêne Clair · menuiserie sur mesure » : un bloc « Zone : jusqu'à 20 km autour de l'atelier », un bloc « Escaliers · Cuisines · Dressings », une galerie « Réalisations » en illustrations (y≈1000-1240) et un bouton « Demander un devis ». Badge « EXEMPLE · entreprise fictive ». À gauche du téléphone (x≈30-320, y≈560-1150), sous une petite étiquette « les questions qu'on te pose », trois bulles de message génériques, sans prénom ni photo : « Vous allez jusqu'où ? », « Vous faites les escaliers ? », « Vous avez des photos ? ». Titre fixe sur 2 lignes, y≈250-470. Ni main, ni avatar, ni HUD. 0,7 / 1,4 / 2,0 s : les bulles pulsent l'une après l'autre avec un petit pop.

**Texte ElevenLabs :**

```
T'as Insta, et toujours les mêmes questions ? [pause] Jusqu'où tu vas : c'est écrit, en haut du site. [pause] Escaliers, cuisines, dressings : tes services, juste dessous. [pause] Tes photos de chantier, je les mets dans ta galerie. [pause] Garde ton Insta : il montre ton travail, le site répond aux questions. [pause] Toi, on te demande quoi le plus souvent ?
```

**Déroulé :**

- 0,0-2,4 s · Image 0 (couverture). VOIX 1 (0,1-2,2 s).
- 2,4-2,8 s · Rembobinage : le site se vide, il ne reste que l'en-tête « Atelier Chêne Clair ». Les trois bulles restent allumées.
- 2,8-5,6 s · 3,0 s : le titre fixe s'efface, sous-titres par phrase entière. 3,0-4,6 s : l'index fait monter la page lentement et les blocs se posent sous le doigt. 3,8 s : « Zone : jusqu'à 20 km autour de l'atelier » arrive en haut. 4,4 s : la bulle « Vous allez jusqu'où ? » s'éteint avec une coche. VOIX 2.
- 5,9-8,2 s · Les trois services tombent avec leur icône : escalier (6,0 s), cuisine (6,5 s), dressing (7,0 s). 7,6 s : la bulle « Vous faites les escaliers ? » s'éteint. VOIX 3.
- 8,5-11,2 s · L'index refait monter la page (8,5-10,0 s). Une grille de 9 vignettes génériques, étiquetée « les photos que tu m'envoies », apparaît sur la table en haut à gauche ; les vignettes volent une à une dans la galerie « Réalisations », une toutes les 0,3 s. 10,6 s : la bulle « Vous avez des photos ? » s'éteint. VOIX 4.
- 11,5-15,0 s · 11,6 s : à la place des bulles, une grille générique 3x3 « ton profil » (sans logo ni interface Instagram) glisse à gauche du téléphone. 12,4 s : étiquette « montre ton travail » sous la grille. 13,3 s : étiquette « répond aux questions » sous le site. 14,2 s : le bouton « Demander un devis » pulse. VOIX 5.
- 15,3-19,0 s · VOIX 6 : trois bulles vides « … ? » réapparaissent à gauche. Carte de fin « Artisan en Île-de-France ? Devis gratuit sous 48 h · lien en bio ». HUD sur une ligne « LTNS° », petit avatar pendant 1 s (18,0-19,0 s). Musique de fond basse.
- 19,0-19,5 s · Image 0 exacte (site complet et trois bulles) : boucle.

**Mains (prévu pour un téléphone à plat, à transposer à l'ordinateur) :** Geste G1 (défilement lent à l'index), prise 1, à 3,0 s : entrée par le bas, glissé du tiers bas au tiers haut jusqu'à 4,6 s, sortie. Geste G1, prise 2, à 8,5 s : même geste jusqu'à 10,0 s, sortie. Aucune main avant 3,0 s, entre 4,8 et 8,5 s, ni après 10,2 s.

**Pourquoi on reste :** L'artisan qui vit sur Instagram se sent conforté (« garde-le ») au lieu d'être jugé. Les bulles, c'est son quotidien, et chacune qui s'éteint quand un bloc arrive donne la petite satisfaction de cocher une liste, à peu près à chaque seconde. La phrase « Insta montre ton travail, le site répond aux questions » se retient, et la question finale lui demande son expérience, ce qui est facile à commenter.

**Question finale :** On te demande quoi le plus souvent en message ?

**Légende :** Instagram suffit pour un artisan, ou il faut un site ? Garde ton Insta : il montre ton travail. Le site répond aux questions qu'on te pose en message : ta zone, tes services, tes réalisations. Exemple créé pour la vidéo (entreprise fictive). Île-de-France · devis gratuit sous 48 h, lien en bio. On te demande quoi le plus souvent ?

**Hashtags :** #creationsiteweb #artisan #menuisier #instagram #ltns

**À confirmer :**

- Galerie, services, zone, horaires et formulaire tiennent-ils dans une page Essentiel ? La vidéo ne cite aucune formule ; à confirmer pour pouvoir répondre en commentaire.
- Aucune synchronisation automatique avec Instagram : LTNS° reprend les photos envoyées par le client (d'où l'étiquette « les photos que tu m'envoies »).
- Ni logo ni interface Instagram : une grille générique « ton profil », le mot Insta seulement dit et écrit.
- Les bulles sont des questions-types non attribuées, sans prénom ni photo : pas de faux messages de clients.
- Vérifier que « Atelier Chêne Clair » ne correspond à aucune entreprise réelle. Photos en illustration ou libres de droits.
- Activer « Votre marque » et laisser l'étiquette IA.

## Jour 6 : Restaurant : ta carte écrite, jamais en PDF

*Avis tranché (concept opinion-2) : sur un site de restaurant, la carte est écrite sur la page, jamais en PDF. Sur téléphone, un PDF oblige à zoomer à deux doigts, alors qu'une carte écrite se lit au pouce, et un prix qui change, c'est une ligne. Corrections appliquées : la version PDF arrive dès 1,0 s ; la séquence d'édition est retirée (une seule idée, pas d'interface inventée, pas de doublon avec J2, et la voix ne dit pas qui change la ligne) ; la phrase 5 ménage ceux qui ont une carte faite par un graphiste ; badge exact ; prix marqués « prix d'exemple ».* · environ 18 s

**Accroche écrite :** Restaurant : ta carte écrite, / jamais en PDF

**Image 0 :** Vue de dessus : téléphone à plat (écran vert incrusté), y≈500-1700. À l'écran, le site fini « Bistrot Anouk », ouvert sur « La carte » : un petit menu fixe « Entrées · Plats · Desserts », la ligne « Plat du jour » mise en avant (y≈600-720), puis les entrées et les plats en gros caractères avec leurs prix, et la mention « prix d'exemple ». Badge « EXEMPLE · entreprise fictive ». Titre fixe sur 2 lignes, y≈250-470. Ni main, ni avatar, ni HUD. 0,5 s : un trait souligne « Plat du jour ». 1,0 s : l'écran bascule (whoosh) sur la version PDF du même bistrot : page A4 réduite, petit texte gris, étiquette « version PDF ». 1,8 s : une icône de loupe apparaît à côté du téléphone.

**Texte ElevenLabs :**

```
La carte de ton resto : écrite, jamais en PDF. [pause] En PDF, sur téléphone, faut zoomer à deux doigts. [pause] Écrite sur la page, elle se lit au pouce. [pause] Le magret passe à dix-sept euros : une ligne à changer. [pause] Pas de PDF à refaire, ni de graphiste à rappeler. [pause] Et toi, ta carte, PDF ou écrite ?
```

**Déroulé :**

- 0,0-2,5 s · Image 0 (couverture), puis la version PDF dès 1,0 s. VOIX 1 (0,1-2,4 s).
- 2,6-5,0 s · Pouce et index se posent au centre et s'écartent lentement (2,6-4,1 s) : la page PDF grossit de travers et le texte sort des deux bords. 3,0 s : le titre fixe s'efface, sous-titres par phrase entière. 4,4 s : la main sort. VOIX 2.
- 5,2-7,8 s · 5,2 s : whoosh, la carte écrite revient. 5,6-7,4 s : le pouce la fait défiler lentement ; le texte reste grand et net, et chaque section se coche au passage (Entrées 6,2 s, Plats 6,8 s, Desserts 7,4 s). VOIX 3.
- 8,1-10,8 s · Sans main. 8,2 s : la ligne « Magret, sauce au miel · 16 € » s'éclaire. 9,2 s : le « 16 » défile jusqu'à « 17 » (tic-tic). 9,9 s : une petite marque « 1 ligne modifiée » apparaît ; « prix d'exemple » reste visible. VOIX 4.
- 11,1-13,8 s · 11,3 s : une icône de fichier PDF « à refaire ? » apparaît à gauche du téléphone. 12,0 s : un trait la barre. 12,8 s : elle glisse hors cadre. VOIX 5.
- 14,1-17,6 s · VOIX 6 : deux pastilles « PDF » et « Écrite » s'allument tour à tour à gauche du téléphone (14,4 / 15,0 s). Carte de fin « Ton restaurant en Île-de-France ? Devis gratuit sous 48 h · lien en bio ». HUD sur une ligne « LTNS° », petit avatar pendant 1 s (16,6-17,6 s). Musique de fond basse.
- 17,6-18,0 s · La carte remonte en haut : image 0 exacte, boucle.

**Mains (prévu pour un téléphone à plat, à transposer à l'ordinateur) :** Geste G6 (zoom à deux doigts) à 2,6 s : pouce et index serrés au centre, écartement lent jusqu'à 4,1 s, sortie à 4,4 s. Geste G7 (défilement au pouce) à 5,6 s : main posée sur la table à droite du téléphone, le pouce fait monter l'écran jusqu'à 7,4 s, sortie à 7,8 s. Aucune main avant 2,6 s ni après 7,8 s.

**Pourquoi on reste :** Zoomer à deux doigts sur un PDF, tout le monde l'a vécu : le vrai geste rend l'avis évident sans le son, dès 2,6 s. Le retour à la carte écrite, lisible au pouce, soulage. Le prix qui passe de 16 à 17 € donne une deuxième raison concrète, sans jargon. « PDF ou écrite ? » est un vrai choix binaire, et chaque restaurateur a un avis dessus.

**Question finale :** Et toi, ta carte, PDF ou écrite ?

**Légende :** Site internet restaurant : la carte en PDF ou écrite sur la page ? Mon choix : écrite. Elle se lit au pouce, et un prix qui change, c'est une ligne, pas un PDF à refaire. Exemple créé pour la vidéo (entreprise fictive, prix d'exemple). Île-de-France · devis gratuit sous 48 h, lien en bio. Et toi, PDF ou écrite ?

**Hashtags :** #siteinternet #restaurant #restaurateur #creationsiteweb #ltns

**À confirmer :**

- Le PDF montré est inventé (même bistrot fictif) et ne reprend la carte d'aucun restaurant réel. Les prix sont marqués « prix d'exemple ».
- La voix ne dit pas qui change la ligne. Ne pas ajouter « tu le changes toi-même » sans confirmer la formule Pro.
- Vérifier comment le clone prononce « PDF » (pé-dé-èf), sinon écrire « P.D.F. ». C'est un sigle, pas un mot en capitales pour l'emphase.
- Rayene assume la phrase « ni de graphiste à rappeler » (aucun graphiste n'est visé).
- Vérifier que « Bistrot Anouk » ne correspond à aucun établissement réel d'Île-de-France.
- Activer « Votre marque » et laisser l'étiquette IA.

## Jour 7 : Site dès 490 € : démonté pièce par pièce

*Construction satisfaisante et seule vidéo prix de la semaine (concept satisfying-1). Elle répond aussi à la recherche « combien coûte un site internet artisan ». Le vrai doigt démonte bloc par bloc le site fini d'un électricien fictif ; chaque bloc devient une carte étiquetée sur la table, puis un seul tap remonte tout. On voit exactement ce que contient l'Essentiel, avec le prix exact de Tarifs.jsx, sans devinette. Corrections appliquées : prix dans le titre, pour donner l'enjeu dès la 1re seconde ; index posé sur la photo dès l'image 0 ; cartes rangées en une seule pile en éventail à gauche (rien dans la bande droite) ; boucle de fin qui reprend l'entrée de la main. search-1 et satisfying-5 sont écartés car ils feraient doublon.* · environ 19 s

**Accroche écrite :** Site dès 490 € : / démonté pièce par pièce

**Image 0 :** Vue de dessus : téléphone à plat (écran vert incrusté), décalé à droite (écran x≈330-890, y≈500-1700), table libre à gauche. À l'écran, le site fini « Courant Clair · électricien » : le nom en gros (y≈560-660) ; une photo illustrée de tableau électrique (y≈680-900) ; « Dépannage · Installation · Mise aux normes » (y≈920-1000) ; les horaires (y≈1020-1080) ; une zone d'intervention en plan stylisé sans nom de ville (y≈1100-1240) ; puis le formulaire et le bouton jaune « Demander un devis ». Badge « EXEMPLE · entreprise fictive ». Le vrai index est déjà posé sur la photo. Titre fixe sur 2 lignes, y≈250-470. Ni avatar, ni HUD. Whoosh à 0 s. 0,6 s : des pointillés de découpe apparaissent autour de chaque bloc (clic). 1,2 s : la photo se soulève un peu sous le doigt et son ombre grandit. 1,9 s : le bloc des prestations se soulève à son tour.

**Texte ElevenLabs :**

```
Un site dès quatre cent quatre-vingt-dix euros, démonté pièce par pièce. [pause] La photo, tes prestations, tes horaires, ta zone. [pause] Le formulaire : ton client t'écrit, ça arrive dans tes mails. [pause] Dessous, les bases pour être trouvé sur Google. [pause] Un tap, tout revient : UNE page, et la première année en ligne offerte. [pause] Et pour ton métier, il manquerait quoi ?
```

**Déroulé :**

- 0,0-3,0 s · Image 0 (couverture). VOIX 1 (0,1-3,0 s). 2,5 s : le bord de la photo se décolle avec un clic.
- 3,2-5,6 s · Pichenettes vers la gauche, une toutes les 0,7 s. La photo glisse hors du téléphone et se pose sur la table en carte « Photo de ton travail » (3,2 s, clac sec), puis viennent « Tes prestations » (3,9 s), « Horaires » (4,6 s) et « Ta zone d'intervention » (5,3 s). Les cartes forment une seule pile en éventail serré à gauche (x≈30-300, y≈620-1050) : seule la dernière posée est lisible. 3,0 s : le titre fixe s'efface, sous-titres par phrase entière. VOIX 2.
- 5,9-8,6 s · 6,0 s : le formulaire part en carte « Formulaire de contact ». 6,6-7,6 s : une petite enveloppe file de la carte vers une icône de boîte mail. VOIX 3.
- 8,9-11,2 s · 9,0 s : grand glissé vers le haut, le dernier calque se décolle et devient la 6e carte « Les bases pour être trouvé sur Google » (icône loupe). L'écran reste blanc 0,4 s au plus ; la main sort à 9,5 s. 10,2 s : une loupe balaie la pile. VOIX 4.
- 11,5-15,3 s · 11,5 s : tap au centre. Les six cartes rentrent une par une, 0,3 s chacune (11,7-13,5 s), avec des clacs de plus en plus aigus, et le site se recompose. 13,6-14,4 s : le site bascule en 3D sur un écran d'ordinateur, puis revient sur le téléphone. 14,6 s : étiquette tamponnée sur la table : « Essentiel · 1 page · à partir de 490 € TTC · 1re année en ligne offerte · prix fixé avant de commencer ». VOIX 5, avec UNE appuyé.
- 15,6-18,4 s · VOIX 6. Carte de fin « Artisan en Île-de-France ? Devis gratuit sous 48 h · lien en bio ». HUD sur une ligne « LTNS° », petit avatar pendant 1 s (17,4-18,4 s). Musique de fond basse.
- 18,4-19,0 s · L'index rentre par le bas à droite et se pose sur la photo : image 0 exacte, titre fixe compris, la boucle repart sans coupure.

**Mains (prévu pour un téléphone à plat, à transposer à l'ordinateur) :** Geste G8 (pose et pichenettes) : à l'image 0, l'index est déjà posé, immobile, sur le tiers haut de l'écran (on utilise la partie immobile de la prise, de 0 à 3,2 s). Puis 5 pichenettes vers la gauche en descendant, à 3,2 / 3,9 / 4,6 / 5,3 / 6,0 s, et sortie. Geste G9 (grand glissé vers le haut) à 9,0 s, sortie à 9,5 s. Geste G10 (tap franc au centre) à 11,5 s, sortie à 12,0 s. Fin : à 18,4 s, l'entrée de la main de la prise G8 (entrée par le bas à droite et pose sur le tiers haut) permet de reboucler sur l'image 0.

**Pourquoi on reste :** L'enjeu est là dès la 1re seconde (un prix), et un vrai doigt démonte le site : chaque pichenette envoie une carte sur la table, une par seconde entre 3 et 6 s. On veut voir le téléphone se vider, puis tout revenir d'un seul tap vers 11 s : c'est la récompense. Pour un artisan, c'est la réponse concrète à « qu'est-ce que j'ai pour ce prix ? », sans devinette. L'image finale est identique à l'image 0, ce qui pousse à revoir la vidéo.

**Question finale :** Pour ton métier, il manquerait quoi sur cette page ?

**Légende :** Combien coûte un site internet d'artisan ? Formule Essentiel dès 490 € TTC : une page avec ta photo, tes prestations, tes horaires, ta zone, un formulaire de contact et les bases pour être trouvé sur Google. 1re année en ligne offerte, prix fixé avant de commencer. Exemple créé pour la vidéo (entreprise fictive). Île-de-France · devis gratuit sous 48 h, lien en bio. Pour ton métier, il manquerait quoi ?

**Hashtags :** #siteinternet #electricien #artisan #creationsiteweb #ltns

**À confirmer :**

- Reprendre mot pour mot les libellés de src/components/Tarifs.jsx : « à partir de 490 € TTC », « 1ʳᵉ année en ligne offerte », « Les bases pour être trouvé sur Google », « Prix fixé avant de commencer ». Vérifier qu'ils sont toujours à jour le jour du rendu.
- Le formulaire de l'Essentiel envoie-t-il bien chaque demande par e-mail (« ça arrive dans tes mails ») ? Sinon, dire « ton client t'écrit en deux clics ».
- Une zone d'intervention fait-elle partie d'une page Essentiel standard ? Sinon, remplacer la carte par « Ton adresse ».
- Préparer le commentaire épinglé « Et après la 1re année ? » : maintenance en option avec un prix fixé à l'avance, et adresse internet à ton nom (Faq.jsx). Le coût de l'hébergement après la 1re année n'est écrit nulle part dans le dépôt : à fixer avant la publication.
- Vérifier que « Courant Clair » ne correspond à aucun électricien réel d'Île-de-France. Photo illustrée, ni avis ni étoiles.
- Vidéo qui affiche un prix : activer « Votre marque » et laisser l'étiquette IA.

## Classement du jury (2 juges, sur 20)

- opinion-1 : Plombier : une page, pas six (15.5)
- search-6 : Fermé samedi : tu le changes toi-même (15)
- satisfying-1 : Un site d'une page, démonté pièce par pièce (15)
- satisfying-2 : Pas le même site : cinq métiers en morphing (14.5)
- satisfying-5 : Ta carte de visite devient un site (14)
- opinion-2 : Restaurant : la carte écrite, jamais en PDF (14)
- opinion-3 : Boulangerie : pas de boutique en ligne (14)
- search-1 : Site d'artisan dès 490 € : le ticket (13.5)
- search-2 : T'as Instagram : garde-le, ajoute ça (13.5)
- satisfying-3 : Le plat du jour, changé par le patron lui-même (13.5)
- search-4 : La résa en ligne, côté patron (13)
- satisfying-8 : La carte de fidélité qui ne se perd plus (13)
- opinion-5 : Menuisier : ton délai d'attente écrit en gros (13)
- opinion-6 : Traiteur : là, il faut six pages (12.5)
- opinion-7 : Devis bâtiment : jamais en partant de zéro (PMSB Gestion) (12.5)
- search-7 : La carte de fidélité dans leur téléphone (12)
- search-8 : Ton site en ligne : en combien de temps ? (12)
- search-3 : Site gratuit : la main qui fait tout (11.5)
- satisfying-7 : Le devis qui se remplit avec ses propres prix (11.5)
- opinion-4 : Électricien : tes prix affichés sur ton site (11.5)
- opinion-8 : Food truck : l'adresse avant le menu (11)
- search-5 : PMSB : des devis à la main au logiciel (10)
- satisfying-4 : Avant les couleurs : la maquette grise (10)
- satisfying-6 : PMSB Gestion : un logiciel qui s'assemble (8.5)
