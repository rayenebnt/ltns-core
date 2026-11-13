# Règles de travail pour Claude

## Vidéos « Les sites internet en 2026 » (`video/websites-2026-*`)

- **Mode économe par défaut** : pas de workflow ni de sous-agents, sauf demande explicite de Rayene.
- **Réutiliser la base commune** : la coque de `websites-2026-residence` (ou `-horlogerie`) pour le
  défilement, la ligne de droite, la visite `P`, le curseur, le chargement, la section finale et le
  `DEMO.md` ; les modules 3D existants (ciel, mer, côte, tour : `websites-2026` ; nuages :
  `websites-2026-logistique`). Ne réécrire que la scène 3D, `story.js` et `texts.js`.
- **Un seul contrôle avant livraison** : console vide au chargement, quelques images clés, la visite
  `P` et les interactions principales. Rayene teste ensuite sur son ordinateur.
- **Livrer** seulement `dist/<nom>.html` et `DEMO.md` (pas de vidéo) ; le concept est toujours
  présenté comme fictif.
- **Typographie française** : espace fine insécable (U+202F) avant `:` `;` `!` `?` et à l’intérieur
  des guillemets « », apostrophe ’.
- Ne jamais committer `dist/` ni `node_modules/` ; aucune donnée privée dans le dépôt (il est public).
