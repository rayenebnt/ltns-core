# Pinède : site de bâtisseur de maisons, visite 3D d’intérieur (concept fictif)

Maquette **fictive** d’un site de bâtisseur sur la Côte d’Azur pour la vidéo TikTok « Les sites
internet en 2026 ». La page s’ouvre sur des sections classiques (une section sombre, un grand titre,
trois cartes de métiers) ; en défilant, elles partent vers le haut et laissent place à une maison en
3D, épinglée : le séjour ouvert sur la piscine et une villa, la cuisine (îlot en marbre noir, chaises
blanches, colonne de fours), puis une vue plongeante sur l’îlot où un plan d’architecte se déroule,
avant le retour au séjour et la section finale « Votre projet » (fiche de chantier, tampon).

- three.js 0.170.0, esbuild : **un seul fichier HTML** hors ligne (`dist/pinede.html`), polices
  incluses (Archivo, Instrument Serif).
- Mode économe (`CLAUDE.md`) : coque d’Orvan (`websites-2026-transport`) ; la scène 3D, `story.js`,
  `texts.js`, la page (`index.html`, `style.css`) et `ui.js` sont neufs.
- Les photos des premières sections sont des vues de la maison, rendues une fois au chargement
  (`world/index.js`, `SNAPS`).

## Construire

```bash
cd video/websites-2026-batisseur
npm install        # three@0.170.0, esbuild
node build.mjs     # → dist/pinede.html
```

## Structure

| Chemin | Rôle |
|---|---|
| `src/story.js` | `INTRO_P` (fin des premières sections), chapitres, caméra (`KEYS`), déroulé du plan, arrêts |
| `src/texts.js` | Tous les textes |
| `src/world/textures.js` | Textures dessinées au chargement : chêne, marbre noir, bouclette, ciel, gazon, dalles, piscine, plan d’architecte, logo |
| `src/world/props.js` | Assembleur, canapé courbe, table, chaises, îlot, cuisine, fours, suspensions, pins parasols, cyprès, palmiers, villa |
| `src/world/index.js` | La maison, le jardin, la lumière (soleil, baies en lumières surfaciques), l’occlusion ambiante, la caméra, le plan, les vues pour les photos |
| `src/ui.js` | Barre du haut, premières sections, légende, rail, section finale |
| `src/main.js`, `scroll.js`, `tour.js`, `tick.js`, `util.js` | Coque : défilement amorti (premières sections au pixel, puis la maison épinglée), clavier, visite `P` (≈ 24 s), qualité |

Paramètres d’adresse et touches : comme Orvan (`?q=low|medium|high|max`, `?fps=1`, `?auto=1`,
`?capture` ; `↓ ↑ Espace Début Fin P`).

## Notes

- L’occlusion ambiante (GTAOPass) ignore le fond de ciel pendant sa passe de normales : sinon le plan
  du fond, rendu avec le matériau de remplacement, dessine un panneau noir au milieu de la pièce.
- Une dalle de toit (boîte) porte l’ombre de la pièce : un plafond à une seule face laisse passer le
  soleil.

## Reste connu

- Cadences mesurées seulement en SwiftShader : une passe `?fps=1` reste à faire sur le portable du
  tournage.
