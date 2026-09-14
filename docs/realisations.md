# Photos de présentation des réalisations

Chaque site listé dans la section **Réalisations**
(`src/components/Realisations.jsx`) affiche une photo de présentation.
Dépose la capture d'écran de chaque site dans `public/realisations/`.

## Fichiers attendus

| Projet | Fichier            | Site                |
| ------ | ------------------ | ------------------- |
| P01    | `rbti.png`         | rbti.fr             |
| P02    | `pmsb.png`         | pmsbbatiment.fr     |

Le nom du fichier est défini par le champ `image` du projet, dans
`src/components/Realisations.jsx`.

## Format recommandé

- **Ratio** : 16/10 (la carte recadre en `object-fit: cover`, ancré en haut)
- **Largeur** : 1600 px (écran Retina), poids visé < 300 Ko
- **Format** : `.png` (ou `.jpg` / `.webp` en adaptant le champ `image`)
- **Cadrage** : haut de page du site, sans la barre du navigateur —
  la carte dessine sa propre barre avec le nom de domaine
- **Nom de fichier** : sans espace, accent ni apostrophe — il devient une
  URL publique. `pmsb.png`, pas `Capture d'écran PMSB.png`.

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
  image: '/realisations/exemple.png',
  bg: 'linear-gradient(135deg, #… 0%, #… 50%, #… 100%)',
  hi: '#…', // couleur d'accent de la carte
}
```
