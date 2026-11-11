# Démo Cordeau : mode d'emploi

Le fichier à ouvrir : `dist/cordeau.html`. C'est un seul fichier, qui marche sans internet.
Il n'y a pas de vidéo toute faite : tu fais la démo toi-même, en direct, sur ton ordinateur.

**Cordeau est une entreprise fictive.** Le poseur de clôtures, ses prix et son jardin de
Touraine n'existent pas : c'est un concept de site imaginé par LTNS°.

## 1. Ouvrir la page

1. Copie `cordeau.html` sur le Bureau.
2. Double-clique dessus. De préférence dans **Chrome** ou **Edge** (Safari n'a pas été testé).
   Pour choisir le navigateur : clic droit sur le fichier → « Ouvrir avec » → Google Chrome
   (sur Mac : Ctrl + clic).
3. Ferme les autres onglets et les applications lourdes. **Branche le chargeur.**

## 2. Préparer l'écran

1. Zoom à 100 % : `Ctrl` + `0` (Mac : `Cmd` + `0`).
2. Plein écran : `F11` sur Windows (sur certains portables : `Fn` + `F11`),
   `Ctrl` + `Cmd` + `F` sur Mac.
3. Recharge la page une fois en plein écran : `F5` (Mac : `Cmd` + `R`).
4. **Attends la fin du chargement** (logo Cordeau et fine barre orange) sans rien toucher : la
   page prépare tout le jardin, mesure la puissance de l'ordinateur et règle la qualité.
5. Ne touche plus la souris : le curseur disparaît tout seul après 2 secondes.

## 3. Filmer

L'histoire, de haut en bas : la pose de la clôture, « Ce qu'on ne voit pas », les cinq modèles,
le calcul du prix, la réparation après la tempête, puis la fin.

1. **La pose (chapitre 1)** : fais défiler **lentement** avec deux doigts sur le pavé tactile,
   d'un mouvement régulier. Les poteaux sortent de terre, puis les lisses, puis les lames, et la
   caméra passe au-dessus de la clôture pour montrer le jardin terminé. Quand tu lèves les doigts,
   la page glisse encore un peu (moins d'une seconde) : lève-les dès qu'un titre apparaît.
2. **Les modèles (chapitre 2)** : continue à faire défiler, ou clique les onglets en haut à
   gauche (Bois plein, PVC blanc…), ou utilise les flèches `←` `→`. La clôture change devant toi,
   du plus proche au plus loin.
3. **Le prix (chapitre 3)** : fais glisser la réglette « Longueur » : le dessin de la clôture et
   le prix bougent en direct, c'est ce qui rend le mieux à l'écran. Tu peux aussi cliquer un
   modèle, une hauteur, ou `−` / `+` pour les portillons.
4. **La réparation (chapitre 4)** : fais défiler doucement : la branche part, la travée cassée
   est refaite, puis le portillon est remis d'équerre.

**Les boutons qui jouent tout seuls** :
- « ▶ REGARDER LA POSE » (en haut de la page) : tout le chapitre 1 en 7 secondes environ ;
- « ▶ VOIR LA RÉPARATION » (au début du chapitre 4) : toute la réparation en 6 secondes environ.

**La touche `P`** : toute la page se joue seule, sans les mains, en 22 secondes environ. `P` à
nouveau l'arrête ; un défilement ou une touche l'arrêtent aussi. Si la page n'est pas en haut,
elle y revient d'abord. Variante : avec `?auto=1` à la fin de l'adresse (partie 4), la visite
démarre toute seule dès que la page est chargée.

**Au clavier** : `↓` (ou `Espace`) avance d'un moment, `↑` recule d'un moment, `Début` revient en
haut, `Fin` va tout en bas (sur Mac : `Fn` + `←` et `Fn` + `→`). Les liens du menu (POSE,
MODÈLES, TARIFS, RÉPARATIONS) et le bouton « Revoir la pose » à la fin marchent aussi.

Tous les boutons de devis (« DEVIS GRATUIT », « Obtenir mon devis », « Demander un devis
gratuit », « Recevoir ce devis », « Réserver une réparation ») affichent : « Démonstration :
Cordeau est une entreprise fictive imaginée par LTNS°. »

## 4. Ajouter un réglage à l'adresse

Les réglages s'ajoutent à la fin de l'adresse de la page :

1. Clique dans la barre d'adresse (ou `Ctrl` + `L`, Mac : `Cmd` + `L`).
2. Va tout au bout (touche `Fin`, Mac : `Cmd` + `→`).
3. Tape le réglage **collé** à `.html`, sans espace, par exemple `?q=low`, puis `Entrée`.
   L'adresse finit alors par `cordeau.html?q=low`, par exemple :
   - Windows : `file:///C:/Users/…/Desktop/cordeau.html?q=low`
   - Mac : `file:///Users/…/Desktop/cordeau.html?q=low`
4. Pour revenir au réglage normal : efface tout ce qui suit `.html`, puis `Entrée`.

Pour mettre deux réglages, sépare-les par `&` : `?q=low&fps=1`.

## 5. Avant de filmer : répéter avec `?fps=1`

Ajoute `?fps=1` à l'adresse (partie 4) et fais toute la page une fois, en plein écran. Un petit
cadre en haut au centre affiche le réglage (`q=…`), la densité, les images par seconde (`i/s`) et
la pire image (`pire`). Il faut rester près de 60 i/s. Si l'ordinateur n'arrive pas à suivre,
la page baisse elle-même la qualité d'un cran (deux fois au plus) et le cadre l'affiche, par
exemple `q=high→medium`. Recharge ensuite sans `?fps=1` pour la vraie prise.

## 6. Si l'image saccade : `?q=low`

Ajoute `?q=low` à l'adresse (partie 4) : c'est le réglage le plus léger (moins de pixels, moins
d'herbe et de feuillage, ombres plus simples). `?q=medium` est un cran intermédiaire. Avec un
`?q=…`, la page ne change plus de réglage toute seule.

## 7. Texte de la vidéo

> **Les sites internet en 2026 😮‍💨**

Exemple de description : « Concept de site pour un poseur de clôtures : le jardin se clôture au
défilement, poteau après poteau. Entreprise fictive, imaginée et codée par LTNS° (ltns.fr). »

## 8. Rappel : c'est un concept

- Cordeau n'existe pas : ni l'entreprise, ni ses prix, ni ses chantiers.
- Dis toujours « concept » ou « projet fictif », à l'oral comme dans le texte de la vidéo.
- Ne présente jamais Cordeau comme une vraie entreprise ni comme un client, et ne cite jamais ses
  prix comme de vrais prix.
- La page le dit aussi : en bas à gauche (« Projet fictif · concept de site par LTNS° —
  ltns.fr ») et dans la dernière section.

## Dépannage

| Problème | Solution |
|---|---|
| « Cette page a besoin de WebGL 2. » | Mettre Chrome ou Edge à jour et activer l'accélération graphique (Chrome : Paramètres → Système), puis rouvrir le fichier |
| L'image saccade | Chargeur branché, autres onglets fermés, puis `?q=low` (partie 6) |
| Le curseur se voit | Ne plus toucher la souris ni le pavé tactile pendant 2 secondes |
| Textes trop grands ou trop petits | Zoom à 100 % : `Ctrl` + `0` (Mac : `Cmd` + `0`) |
| La barre d'adresse reste visible (Mac, Chrome) | `Cmd` + `Maj` + `F` |
| La lecture `P` s'est arrêtée | Un défilement ou une touche l'a interrompue : appuie de nouveau sur `P` |
| Le chargement est long | Normal sur un petit portable : la page prépare tout le jardin avant de commencer, pour que rien ne saccade ensuite |
