# Sibylle : site en gravure rouge et noire au défilement (concept fictif)

Maquette **fictive** d’un site de maison de liqueurs pour la vidéo TikTok « Les sites internet en 2026 ».
Au défilement, sept décors en 3D dessinés à l’encre (hachures, contours noirs, rouge, noir et papier) :
une main prend un jeton sur un comptoir rouge et une liqueur se répand ; la silhouette de la sibylle
devant une lune rouge, dans un oculus ; un temple rouge à colonnes ; trois fioles à choisir ; la main
verse la fiole choisie dans un verre ; des colonnes brisées tombent ; le fronton et le nom. Une
transition à l’encre (traits, flaque, bandes, lignes de vitesse) cache chaque changement de décor.

- three.js 0.170.0, esbuild : **un seul fichier HTML** hors ligne (`dist/sibylle.html`), polices
  incluses (Instrument Serif, Archivo, Yellowtail).
- Mode économe (`CLAUDE.md`) : coque de Pomone (`websites-2026-agence`) ; seuls la scène 3D, `story.js`,
  `texts.js`, `interact.js` et les gestes de `ui.js` (maintenir, choisir) sont neufs.

## Construire

```bash
cd video/websites-2026-liqueur
npm install        # three@0.170.0, esbuild
node build.mjs     # → dist/sibylle.html
```

## Structure

| Chemin | Rôle |
|---|---|
| `src/story.js` | Chapitres, les sept décors, les transitions, textes, arrêts |
| `src/texts.js` | Tous les textes, les trois liqueurs |
| `src/interact.js` | Le clic maintenu, la fiole choisie (partagés par l’interface et la 3D) |
| `src/world/ink.js` | Le rendu à l’encre : matériau à hachures, contours, ombres portées, traits plein écran, transitions |
| `src/world/props.js` | Main articulée et poses, bouteille, verre et liqueur, jeton, colonnes, silhouette en robe |
| `src/world/index.js` | Les sept décors, leurs caméras, le versement, l’assemblage |
| `src/ui.js` | Bandeau, textes, pastille « Maintenir », zones des fioles, fiche, rail, section finale |
| `src/main.js`, `scroll.js`, `tour.js`, `tick.js`, `util.js` | Coque : défilement amorti, clavier, visite `P` (≈ 25 s), qualité |

Paramètres d’adresse et touches : comme Pomone (`?q=low|medium|high|max`, `?fps=1`, `?auto=1`,
`?capture` ; `↓ ↑ Espace Début Fin P`).

## Reste connu

- Cadences mesurées seulement en SwiftShader : une passe `?fps=1` reste à faire sur le portable du
  tournage.
- Les personnages dessinés de la vidéo de référence (visages, yeux) ne sont pas reproduits : la 3D garde
  une main, des silhouettes et des personnages vus de dos.
