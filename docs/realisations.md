# Photos de présentation des réalisations

Chaque site listé dans la section **Réalisations**
(`src/components/Realisations.jsx`) affiche une photo de présentation.
Dépose la capture d'écran de chaque site dans `public/realisations/`.

## Fichiers attendus

| Projet | Fichier            | Site                |
| ------ | ------------------ | ------------------- |
| P01    | `rbti.jpg`         | rbti.fr             |
| P02    | `pmsb.jpg`         | pmsbbatiment.fr     |
| P03    | `pmsb-gestion.jpg` | logiciel privé (pas de lien) |

Le nom du fichier est défini par le champ `img.name` du projet, dans
`src/components/Realisations.jsx` (`name: 'rbti'` → `public/realisations/rbti.jpg`).

## Ajouter ou remplacer une photo

1. **Dépose un `.jpg` de 1600 px de large** dans `public/realisations/`
   (`<nom>.jpg`). C'est l'image de base, toujours servie aux navigateurs
   qui ne lisent ni l'AVIF ni le WebP.
2. **Renseigne le champ `img`** du projet avec sa taille réelle en pixels :
   `img: { name: 'exemple', width: 1600, height: 900 }`. La largeur et la
   hauteur réservent la place de l'image avant son chargement.
3. **Facultatif, recommandé : les variantes légères.** Le navigateur charge
   alors une version AVIF (ou WebP) à la largeur de l'écran, bien plus
   légère que le JPG (3 à 9 fois pour les photos actuelles). Depuis la
   racine du projet :

   ```sh
   npm install --no-save sharp@0.33.5
   mkdir -p public/media/realisations
   node --input-type=module -e "
   import sharp from 'sharp'
   const name = process.argv[1]
   for (const w of [800, 1600]) {
     const img = sharp('public/realisations/' + name + '.jpg').resize({ width: w })
     await img.clone().avif({ quality: 50 }).toFile('public/media/realisations/' + name + '-' + w + '.avif')
     await img.clone().webp({ quality: 75 }).toFile('public/media/realisations/' + name + '-' + w + '.webp')
   }" exemple
   ```

   (`--no-save` : sharp n'est installé que pour cette commande, ni
   `package.json` ni `package-lock.json` ne changent, et le build n'en a
   pas besoin.) La commande crée `exemple-800.avif`, `exemple-1600.avif`,
   `exemple-800.webp` et `exemple-1600.webp` dans `public/media/realisations/`.
   Ajoute ensuite `variants: true` au champ `img`.

   Le `<picture>` est écrit par `src/components/ProjectPicture.jsx`.
   Sans `variants: true`, la carte n'affiche que le JPG. Ne mets jamais
   `variants: true` avant d'avoir créé les 4 fichiers : un `<picture>` ne
   passe pas au format suivant si un fichier manque, et la carte retomberait
   sur l'aperçu filaire. Si tu remplaces un JPG, relance la commande.

## Cadrage et nom de fichier

- **Ratio** : 16/10 (la carte recadre en `object-fit: cover`, ancré en haut)
- **Largeur** : 1600 px (écran Retina)
- **Cadrage** : haut de page du site, sans la barre du navigateur —
  la carte dessine sa propre barre avec le nom de domaine
- **Nom de fichier** : sans espace, accent ni apostrophe — il devient une
  URL publique. `pmsb.jpg`, pas `Capture d'écran PMSB.jpg`.
- Les `.png` d'origine (`pmsb.png`, `rbti.png`) restent dans
  `public/realisations/` : le film (`motion.html`) s'en sert. Le site, lui,
  ne charge que les `.jpg` et leurs variantes.

## Projet sans lien public (logiciel, outil interne)

Pour un outil privé, ne mets ni `url` ni `domain` : la carte n'est plus cliquable,
la flèche disparaît et la barre affiche le texte du champ `chrome`. Le champ
`features` affiche les modules en pastilles, et `wide: true` étale la carte sur
toute la largeur.

Avant de publier une capture d'un outil privé, masque toute donnée personnelle
(noms, emails, adresses, initiales). Pour `pmsb-gestion.jpg`, le prénom de
l'accueil, le nom, l'email et les initiales de l'utilisateur ont été remplacés
par des barres grises.

## Si la photo est absente

Aucune image cassée n'est affichée : la carte retombe automatiquement sur
l'aperçu filaire généré (`MockPreview`), aux couleurs du projet.

## Ajouter un nouveau projet

Ajoute une entrée dans le tableau `projects` de
`src/components/Realisations.jsx` :

```js
{
  id: 'P03',
  year: '2026',
  name: 'NOM',
  url: 'https://exemple.fr',
  domain: 'exemple.fr',
  type: "Secteur d'activité",
  tag: 'SITE VITRINE',
  description: 'Ce que fait le client et ce que contient le site.',
  img: { name: 'exemple', width: 1600, height: 900 }, // + variants: true une fois les variantes créées
  bg: 'linear-gradient(135deg, #… 0%, #… 50%, #… 100%)',
  hi: '#…', // couleur d'accent de la carte
}
```
