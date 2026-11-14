# Pomone : site 3D au défilement (concept fictif)

Maquette **fictive** d’un site de studio de croissance (sites et référencement) pour la vidéo
TikTok « Les sites internet en 2026 ». Au défilement : une poire en or sur un socle de marbre dans
un ciel bleu aux nuages en trame, le poirier qui pousse, la poire en impression tramée, une gravure
sépia (échafaudage, puis le plan vu du dessus), les questions sous les branches.

- three.js 0.170.0, esbuild : **un seul fichier HTML** hors ligne (`dist/pomone.html`), polices
  incluses (Cormorant SC, EB Garamond, JetBrains Mono, OFL).
- Mode économe (`CLAUDE.md`) : coque de Braise (`websites-2026-burger`) ; seuls la scène 3D,
  `story.js`, `texts.js` et les questions de `ui.js` sont neufs.

## Construire

```bash
cd video/websites-2026-agence
npm install        # three@0.170.0, esbuild
node build.mjs     # → dist/pomone.html
```

## Structure

| Chemin | Rôle |
|---|---|
| `src/story.js` | Chapitres, phases 3D (modes trame et gravure, pousse de l’arbre), textes, arrêts |
| `src/texts.js` | Tous les textes, les questions |
| `src/world/index.js` | Ciel ou papier, nuages tramés, poire en or, socle, vasque, poirier procédural, échafaudage, matériaux trame et gravure, caméra |
| `src/ui.js` | Bandeau, textes, questions (accordéon), rail, section finale |
| `src/main.js`, `scroll.js`, `tour.js`, `tick.js`, `util.js` | Coque : défilement amorti, clavier, visite `P` (≈ 26 s), qualité |

Paramètres d’adresse et touches : comme Braise (`?q=low|medium|high|max`, `?fps=1`, `?auto=1`,
`?capture` ; `↓ ↑ Espace Début Fin P`).

## Reste connu

- Cadences mesurées seulement en SwiftShader : une passe `?fps=1` reste à faire sur le portable du
  tournage.
- Les personnages peints de la vidéo de référence (images d’IA) ne sont pas reproduits : la 3D garde
  la poire, le ciel, le marbre, la trame et la gravure.
