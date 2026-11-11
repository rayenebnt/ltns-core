# Démo Cordeau : mode d'emploi

La page à ouvrir : `dist/cordeau.html`. C'est un seul fichier, qui marche sans internet.
Il n'y a pas de vidéo : tu fais la démo toi-même, en direct, sur ton ordinateur.

**Cordeau est une entreprise fictive.** Le poseur de clôtures, ses prix et son jardin de
Touraine n'existent pas : c'est un concept de site imaginé par LTNS°.

## 1. Ouvrir la page

1. Copie `cordeau.html` sur le Bureau (clé USB, Drive, AirDrop…).
2. Double-clique dessus. Utilise de préférence **Chrome** ou **Edge**. Safari devrait marcher,
   mais il n'a pas été testé. Pour choisir le navigateur : clic droit sur le fichier →
   « Ouvrir avec » → Google Chrome (sur Mac : Ctrl + clic).
3. Ferme les autres onglets et les applications lourdes. Branche le chargeur.

## 2. Préparer l'écran

1. Zoom à 100 % : `Ctrl` + `0` (Mac : `Cmd` + `0`).
2. Plein écran : `F11` sur Windows (sur certains portables : `Fn` + `F11`),
   `Ctrl` + `Cmd` + `F` sur Mac.
3. Recharge la page une fois en plein écran : `F5` (Mac : `Cmd` + `R`).
4. Attends la fin du chargement (logo Cordeau et fine barre orange) **sans rien toucher**.
   La page prépare tout le jardin, puis mesure la puissance de l'ordinateur et règle la
   qualité pour la démo.
5. Ne bouge plus la souris : le curseur disparaît après 2 secondes (et les boutons qui passent
   dessous ne s'allument pas tant qu'il est caché).

## 3. Faire la démo

L'histoire, de haut en bas : la pose de la clôture (chapitre 1), « Ce qu'on ne voit pas »,
les cinq modèles dans le même jardin (chapitre 2), le calcul du prix (chapitre 3), la réparation
après la tempête (chapitre 4), puis la fin.

1. **Faire défiler** : deux doigts vers le bas sur le pavé tactile, **régulièrement**, environ
   3 secondes par chapitre.
   - Le défilement est amorti : quand tu lèves les doigts, la page glisse encore un peu
     (moins d'une seconde, au plus trois quarts d'écran). Lève les doigts dès qu'un titre
     apparaît : la page glisse et se pose dessus.
   - La caméra avance en continu pendant que la clôture se monte : poteaux, lisses, lames,
     puis elle passe au-dessus de la clôture pour montrer le jardin terminé.
2. **Chapitre 2, les modèles** : les onglets en haut à gauche, ou les touches `←` `→`, ou
   simplement le défilement. La clôture change devant toi, du plus proche au plus loin.
   « Chiffrer cette clôture » choisit ce modèle dans le calculateur et y descend.
3. **Chapitre 3, le prix** : les pastilles Modèle et Hauteur, la réglette Longueur, les
   boutons − et + des portillons. Le dessin et le prix changent tout de suite.
4. **Boutons qui jouent un chapitre tout seuls** :
   - « ▶ REGARDER LA POSE » (en haut) : tout le chapitre 1 en 7 secondes environ ;
   - « ▶ VOIR LA RÉPARATION » (chapitre 4) : toute la réparation en 6 secondes environ.
5. **Les liens du menu** (POSE, MODÈLES, TARIFS, RÉPARATIONS), le logo et « Revoir la pose » :
   quand la destination est loin, l'écran passe par un court fondu au lieu de faire défiler
   toute l'histoire en accéléré.
6. **Recommencer** : `Début` (Mac : `Fn` + `←`), le bouton « Revoir la pose » à la fin, le logo,
   ou recharger la page.

Au clavier : `↓` (ou `Espace`) avance d'un moment, `↑` (ou `Maj` + `Espace`) recule d'un
moment, `Fin` (Mac : `Fn` + `→`) va à la fin.

Tous les boutons de devis (« DEVIS GRATUIT », « Obtenir mon devis », « Demander un devis
gratuit », « Recevoir ce devis », « Réserver une réparation ») affichent : « Démonstration :
Cordeau est une entreprise fictive imaginée par LTNS°. »

## 4. Sans les mains : la touche P

- Appuie sur `P` : toute la page se joue seule en 22 secondes environ. Pause sur l'accueil,
  pose de la clôture, « Ce qu'on ne voit pas », ouverture de la fenêtre du chapitre 2, quatre
  changements de modèle, pause sur le calculateur, réparation, pause finale sur le portillon.
  Si la page n'est pas en haut, elle y revient d'abord (par un court fondu si elle est loin).
- `P` pendant la lecture l'arrête. Un défilement, une touche ou un toucher l'arrêtent aussi.
- Variante : ajoute `?auto=1` à l'adresse (même méthode qu'à la partie 5). La lecture démarre
  toute seule une fois l'accueil affiché en entier. Recharger (`F5`, Mac : `Cmd` + `R`) la relance.

## 5. Avant de filmer : vérifier la fluidité avec `?fps=1`

1. Clique dans la barre d'adresse (ou `Ctrl` + `L`, Mac : `Cmd` + `L`).
2. Va tout au bout de l'adresse (touche `Fin`, Mac : `Cmd` + `→`) et tape `?fps=1`, collé à
   `.html`, sans espace. Appuie sur `Entrée`.
   - Windows : `file:///C:/Users/Rayene/Desktop/cordeau.html?fps=1`
   - Mac : `file:///Users/rayene/Desktop/cordeau.html?fps=1`
3. En plein écran, fais toute la page une fois. Le petit cadre en haut au centre affiche le
   réglage (`q=…`), la densité, le nombre d'images par seconde (`i/s`) et la pire image
   (`pire`). Il faut rester près de 60 i/s, avec « pire » sous 25 ms dans chaque chapitre.
4. Si l'ordinateur n'arrive pas à suivre pendant la démo, la page baisse elle-même la qualité
   d'un cran (deux fois au plus, de préférence pendant une section blanche ou noire) ; le cadre
   l'affiche, par exemple `q=high→medium`.
5. Recharge ensuite sans `?fps=1` pour la vraie prise.

## 6. Si l'image saccade : `?q=medium` ou `?q=low`

Même méthode que ci-dessus, avec `?q=medium` (un peu plus léger) ou `?q=low` (le plus léger).
Ces réglages allègent la densité de pixels **et** le jardin lui-même (herbe, feuillage, ombres) :
ils servent aussi sur un écran standard (Windows à 100 %). Avec un `?q=…` forcé, la page ne
change plus de réglage toute seule.

Pour combiner : `?q=medium&auto=1`. Pour revenir au réglage automatique, efface ce qui suit
`.html` et appuie sur `Entrée`.

## 7. Texte de la vidéo

Texte en haut de la vidéo, comme la référence :

> **Les sites internet en 2026 😮‍💨**

Exemple de description :

> Concept de site pour un poseur de clôtures : le jardin se clôture au défilement, poteau après
> poteau. Entreprise fictive, imaginée et codée par LTNS° (ltns.fr). #webdesign #siteinternet #3d

## 8. Rappel : c'est un concept

- Cordeau n'existe pas : ni l'entreprise, ni ses prix, ni ses chantiers.
- Dis toujours « concept » ou « projet fictif », à l'oral comme dans le texte de la vidéo.
- Ne présente jamais Cordeau comme un vrai client. Les prix affichés sont fictifs (la page le dit).
- La page le dit aussi : en bas à gauche, « Projet fictif · concept de site par LTNS° —
  ltns.fr », et la dernière section : « Cordeau est une entreprise fictive ».

## Dépannage

| Problème | Solution |
|---|---|
| « Cette page a besoin de WebGL 2 » | Mettre Chrome ou Edge à jour et activer l'accélération graphique (Chrome : Paramètres → Système), puis rouvrir le fichier |
| L'image saccade | Chargeur branché, autres onglets fermés, puis `?q=medium` ou `?q=low` (partie 6) |
| Le curseur se voit | Ne plus toucher la souris ni le pavé tactile pendant 2 s |
| Textes trop grands ou trop petits | Zoom à 100 % : `Ctrl` + `0` (Mac : `Cmd` + `0`) |
| La barre d'adresse reste visible (Mac, Chrome) | `Cmd` + `Maj` + `F` |
| La lecture auto s'est arrêtée | Un défilement ou une touche l'a interrompue : appuie sur `P` pour la relancer |
| Le chargement est long | Normal la première fois sur un petit portable : il prépare tout le jardin avant de commencer, pour que rien ne saccade ensuite |
