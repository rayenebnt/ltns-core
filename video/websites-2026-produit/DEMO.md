# Démo ARDEUR : mode d'emploi

La page à ouvrir : `dist/ardeur.html`. C'est un seul fichier, qui marche sans internet.
Il n'y a pas de vidéo : tu fais la démo toi-même, en direct, sur ton ordinateur.

**ARDEUR est une marque fictive.** Les shots au gingembre, les gommes et la marque n'existent
pas : c'est un concept de site imaginé par LTNS°.

## 1. Ouvrir la page

1. Copie `ardeur.html` sur le Bureau (clé USB, Drive, AirDrop…).
2. Double-clique dessus. Utilise de préférence **Chrome** ou **Edge**. Safari devrait marcher,
   mais il n'a pas été testé. Pour choisir le navigateur : clic droit sur le fichier →
   « Ouvrir avec » → Google Chrome (sur Mac : Ctrl + clic).
3. Ferme les autres onglets et les applications lourdes. Branche le chargeur.

## 2. Préparer l'écran

1. Zoom à 100 % : `Ctrl` + `0` (Mac : `Cmd` + `0`).
2. Plein écran : `F11` sur Windows (sur certains portables : `Fn` + `F11`),
   `Ctrl` + `Cmd` + `F` sur Mac.
3. Recharge la page une fois en plein écran : `F5` (Mac : `Cmd` + `R`). La page reste en plein
   écran.
4. Attends la fin du chargement (logo ARDEUR et fine barre, quelques secondes) sans rien toucher.
   La page mesure la puissance de l'ordinateur et règle la qualité pour toute la démo.
5. Ne bouge plus la souris : le curseur disparaît après 2 secondes.

## 3. Faire la démo

1. **Changer de produit** : les flèches rondes à gauche et à droite, ou les touches `←` `→`,
   ou les onglets en haut, ou deux doigts glissés vers la gauche ou la droite sur le pavé
   tactile. Les produits : gommes agrumes, shot gingembre, shot curcuma.
2. **Faire défiler** : deux doigts vers le bas sur le pavé tactile, **lentement et
   régulièrement**, jusqu'à la fin, en 12 à 15 secondes environ. Le flacon se retourne et
   grandit, le décor devient blanc, le titre « RÉVEILLE TON ÉNERGIE » arrive, le flacon se
   redresse, le bouchon se dévisse et le shot jaillit.
   - Le mouvement est amorti : il continue un peu après chaque geste, c'est voulu.
   - Si les gommes ou le shot curcuma sont affichés, la page revient d'elle-même au shot
     gingembre dès que tu commences à descendre.
3. **Le curseur** : sur un produit, il devient un disque noir « DÉCOUVRIR ». Un clic sur le
   flacon quand le disque est ouvert avance d'une étape.
4. **Recommencer** : remonte tout en haut avec le pavé tactile, ou appuie sur `Début`
   (Mac : `Fn` + `←`), ou recharge la page.

Au clavier : `↓` (ou `Espace`) avance d'une étape, `↑` recule d'une étape, `Fin`
(Mac : `Fn` + `→`) descend jusqu'au jaillissement en 6,5 s.

## 4. Sans les mains : la touche P

- Appuie sur `P` : la démo se joue toute seule en 16 secondes environ. Courte pause, tour des
  trois produits, retour au shot gingembre, puis tout le défilement jusqu'au jaillissement.
  Le curseur passe une fois sur le flacon, comme dans la vidéo de référence.
- `P` pendant la lecture l'arrête. Un défilement l'arrête aussi.
- Variante : ajoute `?auto=1` à l'adresse (même méthode qu'à la partie 5). La lecture démarre alors
  toute seule à la fin du chargement. Recharger (`F5`, Mac : `Cmd` + `R`) la relance.

## 5. Si l'image saccade : `?q=low`

1. Sors du plein écran (`F11`, Mac : `Ctrl` + `Cmd` + `F`).
2. Clique dans la barre d'adresse (ou `Ctrl` + `L`, Mac : `Cmd` + `L`).
3. Va tout au bout de l'adresse (touche `Fin`, Mac : `Cmd` + `→`) et tape `?q=low`, collé à
   `.html`, sans espace.
4. Appuie sur `Entrée`. L'adresse ressemble à ceci (le début dépend de l'endroit du fichier) :
   - Windows : `file:///C:/Users/Rayene/Desktop/ardeur.html?q=low`
   - Mac : `file:///Users/rayene/Desktop/ardeur.html?q=low`
5. Attends la fin du chargement et repasse en plein écran.

L'image est un peu moins fine, mais plus fluide. Attention : `?q=low` n'allège que les écrans à haute
densité (Mac Retina, ou Windows avec une mise à l'échelle de 125 % ou plus). Sur un écran
standard (100 %), la page est déjà au réglage le plus léger.

Autres réglages : `?q=medium`, `?q=high`.
Pour combiner : `?q=low&auto=1`. Pour revenir au réglage automatique, efface `?q=low` et appuie
sur `Entrée`.

Pour vérifier avant de filmer : `?fps=1` affiche dans un coin le réglage choisi et le nombre
d'images par seconde (`i/s`). Fais tout le défilement une fois : il faut rester près de 60.
Recharge ensuite sans `?fps=1` pour la vraie prise.

## 6. Texte de la vidéo

Texte en haut de la vidéo, comme la référence :

> **Les sites internet en 2026 😮‍💨**

Exemple de description :

> Concept de site produit en 3D : le flacon s'anime quand on fait défiler. Marque fictive,
> imaginée et codée par LTNS° (ltns.fr). #webdesign #siteinternet #3d

## 7. Rappel : c'est un concept

- ARDEUR n'existe pas : ni la marque, ni les shots, ni les gommes.
- Dis toujours « concept » ou « projet fictif », à l'oral comme dans le texte de la vidéo.
- Ne présente jamais ARDEUR comme un vrai client ou un vrai produit. N'annonce aucun prix et ne
  tague aucune vraie marque.
- La page le dit aussi. En bas à gauche : « Projet fictif · concept de site par LTNS° —
  ltns.fr ». Les boutons Contact, Voir la gamme et Découvrir le shot affichent :
  « Démonstration : ARDEUR est une marque fictive imaginée par LTNS°. »
- Si quelqu'un demande où acheter, réponds que c'est un concept qui montre ce que LTNS° peut
  faire pour un site.

## Dépannage

| Problème | Solution |
|---|---|
| « Cette page a besoin de WebGL 2 » | Mettre Chrome ou Edge à jour et activer l'accélération graphique (Chrome : Paramètres → Système), puis rouvrir le fichier |
| L'image saccade | Chargeur branché, autres onglets fermés, puis `?q=low` (partie 5) |
| Le curseur se voit | Ne plus toucher la souris ni le pavé tactile pendant 2 s |
| Textes trop grands ou trop petits | Zoom à 100 % : `Ctrl` + `0` (Mac : `Cmd` + `0`) |
| La barre d'adresse reste visible (Mac, Chrome) | `Cmd` + `Maj` + `F` |
| La lecture auto s'est arrêtée | Un défilement l'a interrompue : appuie sur `P` pour la relancer |
