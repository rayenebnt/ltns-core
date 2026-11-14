# Braise : site 3D au défilement (concept fictif)

Maquette **fictive** d’un site de burgers pour la vidéo TikTok « Les sites internet en 2026 ».
Au défilement : le burger se décompose couche par couche (étiquettes), se recompose, tombe dans sa
boîte à emporter (frites, sauces, milkshake), le couvercle se ferme sur le logo, puis la carte.

- three.js 0.170.0, esbuild : **un seul fichier HTML** hors ligne (`dist/braise.html`), polices
  incluses (Anton, Archivo, JetBrains Mono, OFL).
- Mode économe (`CLAUDE.md`) : coque d’Altière (`websites-2026-residence`) ; seuls la scène 3D,
  `story.js`, `texts.js` et les étiquettes et cartes de `ui.js` sont neufs.

## Construire

```bash
cd video/websites-2026-burger
npm install        # three@0.170.0, esbuild
node build.mjs     # → dist/braise.html
```

## Structure

| Chemin | Rôle |
|---|---|
| `src/story.js` | Chapitres, phases 3D, textes (fenêtres en p), arrêts |
| `src/texts.js` | Tous les textes, les étiquettes des couches, la carte (options de chaque burger) |
| `src/world/index.js` | Studio (fond crème, sol qui reçoit les ombres, IBL), boîte, frites, caméra |
| `src/world/burger.js` | Le burger procédural comme dans la vidéo de référence (brioche brillante, steaks smashés à bord croustillant, cheddar qui coule, oignons confits et croustillants, sauce), le milkshake au cookie, le papier |
| `src/ui.js` | Bandeau, textes, étiquettes des couches et cartes de la carte (depuis `world.anchors()`), rail, section finale |
| `src/main.js`, `scroll.js`, `tour.js`, `tick.js`, `util.js` | Coque : défilement amorti, clavier, visite `P` (≈ 23 s), qualité |

Paramètres d’adresse et touches : comme Altière (`?q=low|medium|high|max`, `?fps=1`, `?auto=1`,
`?capture` ; `↓ ↑ Espace Début Fin P`).

## Reste connu

- Cadences mesurées seulement en SwiftShader : une passe `?fps=1` reste à faire sur le portable du
  tournage.
