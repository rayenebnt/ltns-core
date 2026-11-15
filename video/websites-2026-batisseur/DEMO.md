# Démo Pinède : mode d’emploi

Le fichier à ouvrir : `pinede.html` (dans le projet : `dist/pinede.html`). C’est un seul fichier, qui
marche sans internet. Il n’y a pas de vidéo toute faite : tu fais la démo toi-même, en direct, sur
ton ordinateur.

**Pinède est une entreprise fictive.** Le bâtisseur, ses maisons et ses chiffres n’existent pas :
c’est un concept de site imaginé par LTNS°.

## 1. Ouvrir la page

1. Copie `pinede.html` sur le Bureau.
2. Ouvre-le dans **Chrome** ou **Edge** : clic droit sur le fichier → « Ouvrir avec » → Google
   Chrome (sur Mac : Ctrl + clic). Évite Safari et Firefox : ils n’ont pas été testés.
3. Ferme les autres onglets et les applications lourdes. **Branche le chargeur.**
4. Coupe les notifications pendant le tournage, et l’éclairage nocturne (Windows) ou Night Shift
   (Mac), qui jaunit les couleurs. Luminosité au maximum.

## 2. Préparer l’écran

1. Zoom du navigateur à 100 % : `Ctrl` + `0` (Mac : `Cmd` + `0`).
2. Plein écran : `F11` sur Windows, `Ctrl` + `Cmd` + `F` sur Mac.
3. Recharge la page une fois en plein écran (`F5`, Mac : `Cmd` + `R`) : elle repart du début.
4. **Attends la fin du chargement** (le pin parasol Pinède et sa fine ligne verte) sans rien toucher.
   Pendant ce temps, la page calcule aussi les photos de ses premières sections.
5. Ne touche plus la souris : le curseur disparaît tout seul après 2 secondes. Le défilement à
   deux doigts ne le fait pas revenir.

## 3. Filmer

La page se lit de haut en bas, comme dans la vidéo : d’abord des sections classiques, puis la visite
3D d’une maison. Fais descendre la page **lentement**, à deux doigts sur le pavé tactile, d’un
mouvement régulier. La molette de la souris marche aussi.

En haut, une barre vert sombre : le logo Pinède, un menu (À propos, Services, Réalisations,
Contact), « Visiter une maison » et le bouton « Devis gratuit ». Au-dessus de la maison, la barre
devient transparente.

Ce que montre la page, dans l’ordre :

1. **Les chantiers exigeants** : une section sombre, une photo du séjour à gauche, le titre « Nous
   bâtissons là où d’autres renoncent. » et le bouton vert « Voir nos réalisations ».
2. **Pinède, bâtisseur** : sur fond clair, le grand titre « Construction, rénovation et extérieurs,
   bâtis dans les règles. » et son texte à droite.
3. **Nos métiers** : trois cartes avec photo (cuisines et salles de bains, maisons neuves, piscines
   et extérieurs). Les photos sont des vues de la maison 3D, calculées au chargement.
4. **Le séjour** : en continuant à descendre, les sections partent vers le haut et la maison
   apparaît derrière : le canapé courbe en bouclette, la table basse en verre, la cuisine au fond à
   gauche, un tableau, puis la grande baie ouverte sur la terrasse, la piscine, les pins parasols et
   une villa blanche. En bas à gauche, la phrase d’accroche et ses deux boutons restent tout du long.
5. **La cuisine** : la caméra traverse la pièce et regarde le long de l’îlot en marbre noir veiné de
   blanc, les chaises blanches à gauche, la colonne de fours noirs, les façades en chêne.
6. **Le plan** : la caméra descend au-dessus de l’îlot jusqu’à le voir d’en haut ; un plan d’architecte
   se déroule sur le marbre, avec le logo Pinède au milieu, un mètre ruban et un crayon.
7. **La maison** : le plan se réenroule, la caméra repasse par la cuisine et revient au séjour.
8. **Votre projet** : la section claire monte par-dessus. La fiche « Votre chantier » coche ses six
   étapes une à une, puis le tampon « Livré » se pose.

**À droite**, un rail fin suit la visite ; le chapitre en cours s’affiche (« 02 Le séjour »,
« 03 La cuisine »…). Clique sur un point du rail pour aller au chapitre. **« Visiter une maison »**,
en haut, emmène directement au séjour.

**Pour finir la prise** : descends jusqu’en bas et lâche ; le tampon se pose en deux secondes
environ. Ou clique sur un bouton (« Devis gratuit », « Nos réalisations », un lien du menu…) : le
message « Démonstration : Pinède est une entreprise fictive imaginée par LTNS°. » s’affiche 3 secondes
et demie.

« Revoir la visite ↑ » (dans la section claire) ramène au séjour ; la touche `Début` ou le logo
Pinède ramènent tout en haut.

## 4. Au clavier

Chaque touche fait glisser la page jusqu’au prochain arrêt, en douceur.

| Touche | Effet |
|---|---|
| `↓`, `Espace` ou `Pg Suiv` | Arrêt suivant |
| `↑`, `Maj` + `Espace` ou `Pg Préc` | Arrêt précédent |
| `Début` | Retour tout en haut (de loin, par un fondu rapide) |
| `Fin` | Tout en bas : la fiche se coche et le tampon « Livré » se pose |
| `P` | Lance la visite automatique, ou l’arrête |

Les arrêts, dans l’ordre : le haut de page ; les métiers ; le séjour ; la cuisine ; l’îlot ; le plan
déroulé ; la cuisine ; le séjour ; la fiche.

## 5. La visite automatique : `P`

La visite se joue seule, sans les mains, en 24 secondes environ, du haut de la page jusqu’au tampon
« Livré », avec une pause sur le plan déroulé. `P` à nouveau l’arrête ; un clic, une touche ou un
nouveau défilement l’arrêtent aussi. Lancée loin du début, elle repart du début après un court
fondu.

Variante : avec `?auto=1` à la fin de l’adresse (partie 6), la visite démarre toute seule environ
2 secondes après le chargement.

## 6. Ajouter un réglage à l’adresse

1. Sors du plein écran (`F11`, Mac : `Ctrl` + `Cmd` + `F`).
2. Clique dans la barre d’adresse, appuie sur `→` pour aller tout au bout.
3. Tape le réglage **collé** à `.html`, par exemple `?q=low`, puis `Entrée` : l’adresse finit par
   `pinede.html?q=low`.
4. Repasse en plein écran, recharge et attends la fin du chargement.

Pour deux réglages : `?q=low&fps=1` (un seul `?`). Pour revenir au réglage normal : efface tout ce
qui suit `.html`.

## 7. Avant de filmer : répéter avec `?fps=1`

Ajoute `?fps=1` et fais toute la page une fois. Un petit cadre en bas affiche les images par
seconde (`i/s`) : il faut rester près de 60. Si ça saccade, filme avec `?q=medium`, ou `?q=low`
(le plus léger). **Pour la vraie prise, enlève `?fps=1`.**

## 8. Texte de la vidéo

> **Les sites internet en 2026**

Exemple de description : « Concept de site pour un bâtisseur de maisons : des sections classiques,
puis une visite 3D d’intérieur au défilement, jusqu’au plan qui se déroule sur l’îlot de la cuisine.
Entreprise fictive, site imaginé et codé par LTNS° (ltns.fr). #webdesign #siteinternet #3d
#architecture »

## 9. Rappel : c’est un concept

- Pinède n’existe pas : ni l’entreprise, ni ses maisons, ni ses chiffres.
- Dis toujours « concept » ou « entreprise fictive », à l’oral comme dans le texte de la vidéo.
- La page le dit aussi : en bas à droite, dans le message des boutons, sur le cartouche du plan et
  dans la dernière section.
- Il n’y a volontairement aucun numéro de téléphone : un numéro inventé pourrait appartenir à
  quelqu’un.

## Dépannage

| Problème | Solution |
|---|---|
| « Cette page a besoin de WebGL 2. » | Mets Chrome ou Edge à jour et active l’accélération graphique (Paramètres → Système), puis rouvre le fichier |
| L’image saccade | Chargeur branché, autres onglets fermés, puis `?q=low` (partie 6) |
| Le curseur se voit | Ne touche plus la souris ni le pavé tactile pendant 2 secondes |
| Les photos des cartes restent grises | Le chargement a été interrompu : recharge la page et attends la fin |
| La visite `P` s’est arrêtée | Un clic, une touche ou un défilement l’a interrompue : appuie de nouveau sur `P` |
| Textes trop grands ou trop petits | Zoom à 100 % : `Ctrl` + `0` (Mac : `Cmd` + `0`) |
