# Altière : site 3D au défilement (concept fictif)

Maquette **fictive** d’un site de résidence pour la vidéo TikTok « Les sites internet en 2026 ».
Au défilement : la caméra plonge à travers les nuages, survole la baie, la tour se construit
étage par étage (noyau, dalles, façade, grue), le 7ᵉ étage s’allume, puis la caméra monte au-dessus
de la tour coupée au 7ᵉ et le plan du niveau 07 se pose sur la dalle (logements survolables).

- three.js 0.170.0, esbuild : **un seul fichier HTML** hors ligne (`dist/altiere.html`), polices
  incluses (Cormorant SC, EB Garamond, JetBrains Mono, OFL).
- Construit en « mode économe » : réutilisation de la coque de Balancier (`websites-2026-horlogerie`),
  du décor de Cap Lumière (`websites-2026` : ciel, brume, mer, côte, ville, port, tour) et des nuages
  de Sillage (`websites-2026-logistique`).

## Construire

```bash
cd video/websites-2026-residence
npm install        # three@0.170.0, esbuild, @fontsource
node build.mjs     # → dist/altiere.html
```

## Structure

| Chemin | Rôle |
|---|---|
| `src/story.js` | Chapitres, phases 3D, textes (fenêtres en p), ton, arrêts |
| `src/texts.js` | Tous les textes, les cinq lots du niveau 07 (polygones en mètres du repère de la tour) |
| `src/ui.js` | Bandeau, textes, compteur d’étages, plan SVG (matrice depuis `world.anchors().plan`), rail, section finale |
| `src/main.js`, `scroll.js`, `tour.js`, `tick.js`, `util.js` | Coque de Balancier : défilement amorti, clavier, visite `P` (≈ 25 s), qualité |
| `src/world/index.js` | Monde : caméra (splines monotones de p), nuages, coupe de construction, grue, noyau, dalle du plan |
| `src/world/scene/` | Modules de Cap Lumière (`tower.js` : coupe `CLIP_S` / `CUT_G` ajoutée, pas de séjour) |
| `src/world/clouds.js`, `vutil.js` | Nuages en ray-marching de Sillage (couche 700–1 150 m) |

Paramètres d’adresse et touches : comme Balancier (`?q=low|medium|high|max`, `?fps=1`, `?auto=1`,
`?capture` ; `↓ ↑ Espace Début Fin P`).

## Reste connu

- Cadences mesurées seulement en SwiftShader : une passe `?fps=1` reste à faire sur le portable du
  tournage (traversée des nuages, survol de la baie).
- Vue de très haut (p ≈ 0,16–0,2) : les maisons de la ville, vues de loin, forment un motif un peu
  régulier.
