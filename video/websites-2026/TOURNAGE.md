# Tournage : « Les sites internet en 2026 »

But : filmer au téléphone la page `cap-lumiere.html` sur l'écran de l'ordinateur, comme la vidéo
virale de référence. On fait défiler la page, la caméra plonge vers la tour, traverse la baie
vitrée et s'arrête dans le séjour.

**Cap Lumière est un projet fictif.** La résidence, le promoteur et les appartements n'existent
pas : c'est un concept de site imaginé par LTNS°.

## 0. Récupérer le fichier

- Le fichier à ouvrir est `video/websites-2026/dist/cap-lumiere.html`. C'est un seul fichier
  (environ 700 Ko) qui marche sans internet. Le copier sur le Bureau de l'ordinateur du tournage
  (clé USB, Drive, AirDrop…).
- `dist/apercu.mp4` montre la lecture automatique (15 s). Le regarder avant de tourner pour voir
  le mouvement attendu.
- Le dossier `dist/` n'est pas dans git. S'il manque : dans `video/websites-2026`, lancer
  `npm install` puis `node build.mjs`.

## 1. Préparer l'ordinateur

1. Brancher le chargeur : sur batterie, l'ordinateur peut ralentir sa carte graphique.
   - Windows : Paramètres → Système → Alimentation et batterie → Mode d'alimentation :
     « Meilleures performances ».
   - Mac : Réglages Système → Batterie → Mode Économie d'énergie : « Jamais ».
2. Fermer les applications lourdes (visio, jeux, montage) et **tous les autres onglets**.
3. Couper les notifications :
   - Windows : Paramètres → Système → Notifications → Ne pas déranger
     (« Assistant de concentration » sur Windows 10).
   - Mac : Centre de contrôle → Concentration → Ne pas déranger.
4. Couper les filtres qui jaunissent l'écran :
   - Windows : « Éclairage nocturne » (Paramètres → Système → Affichage).
   - Mac : « Night Shift » et « True Tone » (Réglages Système → Écrans).
5. Mettre la luminosité de l'écran **au maximum**.

## 2. Ouvrir la page

1. Double-cliquer sur `cap-lumiere.html` : la page s'ouvre dans le navigateur par défaut.
2. Utiliser de préférence **Chrome** ou **Edge**. Safari devrait marcher, mais n'a pas été testé.
   Pour choisir le navigateur :
   - Windows : clic droit sur le fichier → « Ouvrir avec » → Google Chrome (ou Microsoft Edge).
   - Mac : clic droit (ou Ctrl + clic) sur le fichier → « Ouvrir avec » → Google Chrome.
3. Attendre que l'écran de chargement (logo CAP LUMIÈRE et fine barre) disparaisse, soit
   quelques secondes. Ne rien toucher pendant ce temps. La page mesure la puissance de
   l'ordinateur, choisit la qualité d'image et la garde pendant toute la prise.
4. Si la page affiche « Cette page a besoin de WebGL 2 » : mettre Chrome ou Edge à jour, activer
   « Utiliser l'accélération graphique si disponible » (Chrome : Paramètres → Système ;
   Edge : Paramètres → Système et performances), puis rouvrir le fichier.

## 3. Régler l'affichage

| Réglage | Windows | Mac |
|---|---|---|
| Zoom à 100 % | Ctrl + 0 | Cmd + 0 |
| Masquer la barre de favoris | Ctrl + Maj + B | Cmd + Maj + B |
| Plein écran (entrer et sortir) | F11 (sur certains portables : Fn + F11) | Ctrl + Cmd + F |

- Mac avec Chrome : si la barre d'adresse reste visible en plein écran, appuyer sur
  Cmd + Maj + F. C'est le réglage « Toujours afficher la barre d'outils en mode plein écran »
  de la barre de menus.
- Le curseur disparaît tout seul après 1,5 s sans bouger. S'il réapparaît, ne plus toucher la
  souris ni le pavé tactile pendant 2 s.

## 4. La prise : faire défiler

1. Partir du haut de la page : la tour, le chiffre « 08 » et la mention « Faites défiler ».
2. Faire défiler vers le bas avec deux doigts sur le pavé tactile, par petits gestes lents et
   réguliers, jusqu'au séjour. Le parcours complet doit prendre **12 à 15 secondes**.
3. Le mouvement est amorti : la caméra continue un peu après chaque geste, c'est voulu. Éviter
   les grands coups rapides, car l'élan du pavé tactile ferait accélérer la caméra. La molette
   d'une souris marche aussi, mais le mouvement est moins doux.
4. Repères de rythme (ceux de la lecture automatique) :

   | Temps | À l'écran |
   |---|---|
   | 0 à 3,5 s | Choix de l'étage : le chiffre passe de 08 à 14 et l'étage s'allume en doré sur la tour |
   | 3,5 à 8 s | Plongée vers la tour, jusqu'aux balcons du 14ᵉ étage |
   | 8 à 10 s | Passage à travers la baie vitrée |
   | 10 à 15 s | Glissade lente dans le séjour : « Séjour » et trois étiquettes apparaissent |

5. Pour recommencer, remonter tout en haut de la page en faisant défiler vers le haut, ou appuyer
   sur la touche Début (Mac : fn + ←) : la caméra revient à la tour en 4 à 5 s. On peut aussi
   recharger la page (F5, ou Cmd + R sur Mac).
6. Faire 2 ou 3 essais à blanc, puis 3 ou 4 prises.

Le clavier marche aussi :

| Touche | Effet |
|---|---|
| ↓ ou Espace | Avance d'un cran (environ 1 s) |
| ↑ | Recule d'un cran |
| Fin (Mac : fn + →) | Va jusqu'au séjour en 9 s |
| Début (Mac : fn + ←) | Revient à la tour en 4,5 s |
| P | Lecture automatique (voir la partie 5) |

Les boutons de la page marchent aussi :
- « Découvrir l'étage » mène au séjour en 9 s.
- « Retour à la tour » ramène à la tour en 4,5 s.
- « Être rappelé » affiche un court message « Démonstration ».

## 5. Plan B : la lecture automatique (touche P)

- Appuyer sur **P** : tout le parcours se joue seul en 15 s, depuis le début, au rythme du
  tableau ci-dessus, et le curseur est caché. C'est ce que montre `apercu.mp4`.
- Appuyer sur P pendant la lecture l'arrête. Un nouvel appui la relance depuis le début.
- Ne pas faire défiler pendant la lecture : le défilement reprend la main et arrête la lecture.
  Pour garder la main dans l'image, mimer le geste juste au-dessus du pavé tactile, sans le
  toucher.
- Variante : ajouter `?auto=1` à l'adresse (méthode dans la partie 6). La lecture démarre alors
  toute seule à la fin du chargement. En plein écran, recharger la page (F5, ou Cmd + R sur Mac)
  relance tout, sans quitter le plein écran.

## 6. Si l'image saccade : `?q=low`

Sans option, la page choisit la qualité au chargement. Si l'image saccade quand même (mouvement
haché, ventilateur qui souffle fort), ajouter `?q=low` à la fin de l'adresse :

1. Sortir du plein écran (F11, ou Ctrl + Cmd + F sur Mac).
2. Cliquer dans la barre d'adresse (ou Ctrl + L, ou Cmd + L sur Mac).
3. Aller tout au bout de l'adresse (touche Fin, ou Cmd + → sur Mac), puis taper `?q=low` collé
   à `.html`, sans espace.
4. Appuyer sur Entrée. L'adresse ressemble alors à ceci (le début dépend de l'endroit où est le
   fichier) :
   - Windows : `file:///C:/Users/Rayene/Desktop/cap-lumiere.html?q=low`
   - Mac : `file:///Users/rayene/Desktop/cap-lumiere.html?q=low`
5. Attendre la fin du chargement, puis repasser en plein écran.

L'image devient un peu moins fine (moins de pixels, de végétation et de bateaux), mais plus
fluide. `?q=low` allège plus que le choix automatique, qui ne joue que sur la définition et le
lissage de l'image.

Autres réglages possibles :
- `?q=medium` : qualité intermédiaire.
- `?q=high` : qualité maximale forcée.
- `?q=low&auto=1` : qualité basse avec lecture automatique.

Pour revenir au choix automatique, effacer `?q=low` de l'adresse et appuyer sur Entrée.

## 7. Filmer au téléphone

1. Tenir le téléphone **en vertical**, au-dessus de l'épaule, ou le poser derrière soi (pile de
   livres, trépied). Le placer en légère plongée, comme dans la référence : l'écran entier, le
   haut du clavier et la main.
2. Baisser la lumière de la pièce et garder une lumière douce. Aucune lampe ni fenêtre ne doit
   se refléter dans l'écran : incliner l'écran pour chasser les reflets. Nettoyer l'écran (traces
   de doigts).
3. Utiliser l'objectif principal du téléphone (×1, pas le grand-angle ×0,5), en 4K ou 1080p, à
   30 ou 60 images par seconde. Ne pas zoomer.
4. Bloquer la mise au point et l'exposition : sur le téléphone, faire un appui long sur l'écran
   de l'ordinateur tel qu'il apparaît dans l'appareil photo (iPhone : « Verrouillage AE/AF »).
   Baisser ensuite un peu l'exposition, pour que le ciel et les lampes ne soient pas brûlés.
5. Si des rayures ou des vagues bougent sur l'image (moiré), avancer ou reculer un peu le
   téléphone, ou changer légèrement l'angle.
6. Lancer l'enregistrement, attendre 1 s, faire défiler, rester 1 à 2 s dans le séjour, couper.
7. Envoyer la vidéo en qualité d'origine (AirDrop, câble ou Drive, pas WhatsApp).

## 8. Texte à l'écran et légende

Texte fixe en haut de la vidéo, comme dans la référence :

> **Les sites internet en 2026 😮‍💨**

Trois accroches de rechange :

1. « Et si ton site se visitait comme un appartement ? »
2. « POV : tu scrolles… et tu entres dans le salon 😮‍💨 »
3. « J'ai imaginé le site immobilier de 2026 (concept) »

Exemple de description :

> Concept de site immobilier en 3D : on visite l'appartement rien qu'en faisant défiler.
> Projet fictif, imaginé et codé par LTNS° (ltns.fr). #webdesign #siteinternet #3d #immobilier

## 9. Rappel : c'est un projet fictif

- Cap Lumière n'existe pas : ni la résidence, ni le promoteur, ni les appartements et leurs
  surfaces.
- Écrire « concept » ou « projet fictif » dans le texte ou la description de chaque vidéo.
- Ne jamais présenter la page comme un vrai client ou un vrai programme immobilier. N'annoncer
  aucun prix et ne taguer aucun vrai promoteur ni aucune vraie agence.
- La page le rappelle aussi. Le pied de page dit « Projet fictif · concept de site par LTNS° —
  ltns.fr ». Le bouton « Être rappelé » affiche « Démonstration : Cap Lumière est un projet
  fictif imaginé par LTNS°. »
- Si quelqu'un demande en commentaire où acheter, répondre que c'est un concept qui montre ce
  que LTNS° peut faire pour un site.

## Dépannage

| Problème | Solution |
|---|---|
| Message « Cette page a besoin de WebGL 2 » | Chrome ou Edge à jour, accélération graphique activée (partie 2) |
| Chargement très long | Fermer les autres onglets, puis recharger (F5, ou Cmd + R sur Mac) |
| L'image saccade | Chargeur branché, applications fermées, puis `?q=low` (partie 6) |
| La barre d'adresse reste visible (Mac, Chrome) | Cmd + Maj + F |
| Textes trop grands ou trop petits | Zoom à 100 % : Ctrl + 0 (Cmd + 0 sur Mac) |
| Le curseur se voit | Ne plus toucher la souris ni le pavé tactile pendant 2 s |
| La lecture automatique s'arrête | Un défilement l'a interrompue : appuyer sur P pour la relancer |
