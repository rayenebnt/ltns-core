# Médina : site de chocolaterie en 3D au défilement (concept fictif)

Maquette **fictive** d’un site de chocolaterie pour la vidéo TikTok « Les sites internet en 2026 ».
Au défilement, en 3D : un bol d’acier verse une crème de pistache épaisse qui s’enroule dans un moule
puis se pose ; le chocolat au lait coule dessus et s’étale jusqu’aux bords ; la tablette sort du
moule, se tourne vers nous, paillettes d’or et poussière dorée autour ; le fond bleu canard devient
vert forêt, la tablette se range dans une rangée de coffrets qui défile (quatre parfums) ; enfin elle
se pose en biais et se casse en deux sur son cœur vert.

- three.js 0.170.0, esbuild : **un seul fichier HTML** hors ligne (`dist/medina.html`), polices
  incluses (Bodoni Moda, EB Garamond, Archivo).
- Mode économe (`CLAUDE.md`) : coque de Sibylle (`websites-2026-liqueur`) ; seuls la scène 3D,
  `story.js`, `texts.js` et le nom du parfum au centre (`ui.js`) sont neufs.

## Construire

```bash
cd video/websites-2026-chocolat
npm install        # three@0.170.0, esbuild
node build.mjs     # → dist/medina.html
```

## Structure

| Chemin | Rôle |
|---|---|
| `src/story.js` | Chapitres, phases 3D (coulées, tablette, rangée, cassure), arrêts de la rangée, textes, arrêts |
| `src/texts.js` | Tous les textes, les coffrets, les parfums |
| `src/world/props.js` | Moule, tablette en deux moitiés et sa tranche, paillettes, bol, filets de liquide recalculés à chaque image, corde de crème enroulée, coffrets et motif de feuilles (dessinés sur canvas) |
| `src/world/index.js` | Studio (lumières, reflets, fond), coulées, nappe de chocolat qui s’étale, tablette et ses poses, rangée, cassure, caméra |
| `src/ui.js` | Bandeau, textes, nom du parfum au centre de la rangée, rail, section finale |
| `src/main.js`, `scroll.js`, `tour.js`, `tick.js`, `util.js` | Coque : défilement amorti, clavier, visite `P` (≈ 25 s), qualité |

Paramètres d’adresse et touches : comme Sibylle (`?q=low|medium|high|max`, `?fps=1`, `?auto=1`,
`?capture` ; `↓ ↑ Espace Début Fin P`).

## Reste connu

- Cadences mesurées seulement en SwiftShader : une passe `?fps=1` reste à faire sur le portable du
  tournage.
- Les coulées de la vidéo de référence sont filmées (ou générées) en photo réaliste : ici elles sont
  calculées en temps réel (crème en corde enroulée, filet, nappe qui s’étale), proches mais pas
  identiques.
