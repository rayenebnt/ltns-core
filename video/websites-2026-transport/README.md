# Orvan : site de commissionnaire de transport en maquettes 3D (concept fictif)

Maquette **fictive** d’un site de transport et logistique pour la vidéo TikTok « Les sites internet
en 2026 ». Au défilement, cinq maquettes 3D en « pâte blanche » avec le rouge de la marque, l’une
après l’autre, un fondu blanc entre deux : le dépôt (la halle, ses quais, les camions), la halle
ouverte (rayonnages pleins de cartons, chariots élévateurs), la campagne (collines, route en lacets,
camions), le port et l’aéroport (porte-conteneurs, portiques de quai, avions), le terminal rail
(portiques rouges, trains de fret). Un panneau reste à gauche ; des points cliquables ouvrent une fiche
par métier ; une barre de chapitres en bas.

- three.js 0.170.0, esbuild : **un seul fichier HTML** hors ligne (`dist/orvan.html`), police incluse
  (Archivo).
- Mode économe (`CLAUDE.md`) : coque de Médina (`websites-2026-chocolat`) ; seuls la scène 3D,
  `story.js`, `texts.js` et les points cliquables de `ui.js` sont neufs.

## Construire

```bash
cd video/websites-2026-transport
npm install        # three@0.170.0, esbuild
node build.mjs     # → dist/orvan.html
```

## Structure

| Chemin | Rôle |
|---|---|
| `src/story.js` | Chapitres, les cinq maquettes, les fondus, arrêts |
| `src/texts.js` | Tous les textes, les fiches des points cliquables |
| `src/world/kit.js` | Matériaux « pâte », assembleur (une maille par matériau), arbres, personnages, camion, chariot, avion, conteneurs, logo |
| `src/world/index.js` | Les cinq maquettes, leurs caméras, la circulation (camions, chariots, trains, avion), le fondu blanc |
| `src/ui.js` | Bandeau, panneau, points cliquables et fiche, barre de chapitres, rail, section finale |
| `src/main.js`, `scroll.js`, `tour.js`, `tick.js`, `util.js` | Coque : défilement amorti, clavier, visite `P` (≈ 22 s), qualité |

Paramètres d’adresse et touches : comme Médina (`?q=low|medium|high|max`, `?fps=1`, `?auto=1`,
`?capture` ; `↓ ↑ Espace Début Fin P`).

## Reste connu

- Cadences mesurées seulement en SwiftShader : une passe `?fps=1` reste à faire sur le portable du
  tournage.
