# Démo Orvan : mode d’emploi

Le fichier à ouvrir : `orvan.html` (dans le projet : `dist/orvan.html`). C’est un seul fichier, qui
marche sans internet. Il n’y a pas de vidéo toute faite : tu fais la démo toi-même, en direct, sur
ton ordinateur.

**Orvan est une entreprise fictive.** L’entreprise, ses chiffres et ses services n’existent pas :
c’est un concept de site imaginé par LTNS°.

## 1. Ouvrir la page

1. Copie `orvan.html` sur le Bureau.
2. Ouvre-le dans **Chrome** ou **Edge** : clic droit sur le fichier → « Ouvrir avec » → Google
   Chrome (sur Mac : Ctrl + clic). Évite Safari et Firefox : ils n’ont pas été testés.
3. Ferme les autres onglets et les applications lourdes. **Branche le chargeur.**
4. Coupe les notifications pendant le tournage, et l’éclairage nocturne (Windows) ou Night Shift
   (Mac), qui jaunit les couleurs. Luminosité au maximum.

## 2. Préparer l’écran

1. Zoom du navigateur à 100 % : `Ctrl` + `0` (Mac : `Cmd` + `0`).
2. Plein écran : `F11` sur Windows, `Ctrl` + `Cmd` + `F` sur Mac.
3. Recharge la page une fois en plein écran (`F5`, Mac : `Cmd` + `R`) : elle repart du début.
4. **Attends la fin du chargement** (le logo Orvan et sa fine ligne rouge) sans rien toucher.
5. Ne touche plus la souris : le curseur disparaît tout seul après 2 secondes. Le défilement à
   deux doigts ne le fait pas revenir.

## 3. Filmer

Toute l’histoire se joue au défilement, de haut en bas. Fais descendre la page **lentement**, à deux
doigts sur le pavé tactile, d’un mouvement régulier. La molette de la souris marche aussi. Entre deux
maquettes, un fondu blanc passe : c’est voulu.

Le panneau blanc à gauche reste tout du long ; sa dernière ligne montre le chapitre en cours.
Les camions, les chariots, les trains et un avion bougent tout seuls.

Ce que montre chaque chapitre :

1. **01 ROUTE** : le dépôt, sa halle au bandeau rouge ORVAN, les camions à quai, d’autres qui passent
   sur la route.
2. **02 ENTREPÔT** : la halle ouverte : des rayonnages pleins de cartons, des chariots élévateurs
   rouges qui circulent dans les allées.
3. **03 DISTRIBUTION** : la campagne vue d’en haut : des collines, une route blanche en lacets, des
   camions dessus, deux fermes.
4. **04 AIR & MER** : le port et l’aéroport : un porte-conteneurs rouge sous les portiques blancs, des
   piles de conteneurs, des avions rouges, la douane.
5. **05 RAIL** : le terminal ferroviaire : deux grands portiques rouges, des trains de fret qui
   passent, des conteneurs.
6. **DEMANDE DE FRET** : la section claire monte par-dessus. La fiche « Votre envoi » coche ses six
   étapes une à une, puis le tampon « Livré » se pose.

**Les points cliquables** : sur chaque maquette, un rond blanc avec un point rouge qui pulse.
**Clique dessus** : une fiche s’ouvre (« La route », « L’entreposage », « La distribution », « Le
maritime », « L’aérien », « Le ferroviaire »). Clique ailleurs ou appuie sur `Échap` pour la fermer.

**La barre en bas** (Route, Entrepôt, Distribution, Air & mer, Rail) emmène à la maquette choisie.
« Nos services » dans le panneau passe à la maquette suivante.

**Pour finir la prise** : descends jusqu’en bas et lâche ; le tampon se pose en deux secondes
environ. Ou clique sur « Demande de fret » ou « Faire une demande de fret » : le message
« Démonstration : Orvan est une entreprise fictive imaginée par LTNS°. » s’affiche 3 secondes et
demie.

« Revoir le trajet ↑ » (dans la section claire), la touche `Début` ou le logo Orvan ramènent au
début.

## 4. Au clavier

Chaque touche fait glisser la page jusqu’au prochain arrêt, en douceur.

| Touche | Effet |
|---|---|
| `↓`, `Espace` ou `Pg Suiv` | Arrêt suivant |
| `↑`, `Maj` + `Espace` ou `Pg Préc` | Arrêt précédent |
| `Début` | Retour au début (de loin, par un fondu rapide) |
| `Fin` | Tout en bas : la fiche se coche et le tampon « Livré » se pose |
| `P` | Lance la visite automatique, ou l’arrête |

Les arrêts, dans l’ordre : le dépôt ; ses quais ; l’entrepôt ; la campagne ; le port ; le rail ; la
fiche.

## 5. La visite automatique : `P`

La visite se joue seule, sans les mains, en 22 secondes environ, du dépôt jusqu’au tampon « Livré ».
`P` à nouveau l’arrête ; un clic, une touche ou un nouveau défilement l’arrêtent aussi. Lancée loin
du début, elle repart du début après un court fondu.

Variante : avec `?auto=1` à la fin de l’adresse (partie 6), la visite démarre toute seule environ
2 secondes après le chargement.

## 6. Ajouter un réglage à l’adresse

1. Sors du plein écran (`F11`, Mac : `Ctrl` + `Cmd` + `F`).
2. Clique dans la barre d’adresse, appuie sur `→` pour aller tout au bout.
3. Tape le réglage **collé** à `.html`, par exemple `?q=low`, puis `Entrée` : l’adresse finit par
   `orvan.html?q=low`.
4. Repasse en plein écran, recharge et attends la fin du chargement.

Pour deux réglages : `?q=low&fps=1` (un seul `?`). Pour revenir au réglage normal : efface tout ce
qui suit `.html`.

## 7. Avant de filmer : répéter avec `?fps=1`

Ajoute `?fps=1` et fais toute la page une fois. Un petit cadre en bas affiche les images par
seconde (`i/s`) : il faut rester près de 60. Si ça saccade, filme avec `?q=medium`, ou `?q=low`
(le plus léger). **Pour la vraie prise, enlève `?fps=1`.**

## 8. Texte de la vidéo

> **Les sites internet en 2026**

Exemple de description : « Concept de site pour un commissionnaire de transport : cinq maquettes 3D
qui défilent, du dépôt au terminal rail, avec des points à cliquer sur chaque métier. Entreprise
fictive, site imaginé et codé par LTNS° (ltns.fr). #webdesign #siteinternet #3d #logistique »

## 9. Rappel : c’est un concept

- Orvan n’existe pas : ni l’entreprise, ni ses chiffres, ni ses services.
- Dis toujours « concept » ou « entreprise fictive », à l’oral comme dans le texte de la vidéo.
- La page le dit aussi : en bas à gauche, dans le message des boutons et dans la dernière section.

## Dépannage

| Problème | Solution |
|---|---|
| « Cette page a besoin de WebGL 2. » | Mets Chrome ou Edge à jour et active l’accélération graphique (Paramètres → Système), puis rouvre le fichier |
| L’image saccade | Chargeur branché, autres onglets fermés, puis `?q=low` (partie 6) |
| Le curseur se voit | Ne touche plus la souris ni le pavé tactile pendant 2 secondes |
| Un point cliquable n’apparaît pas | Il se cache pendant les fondus et derrière le panneau : attends que la maquette soit posée |
| La visite `P` s’est arrêtée | Un clic, une touche ou un défilement l’a interrompue : appuie de nouveau sur `P` |
| Textes trop grands ou trop petits | Zoom à 100 % : `Ctrl` + `0` (Mac : `Cmd` + `0`) |
