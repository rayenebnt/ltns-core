// Every visible sentence the shell writes from JS (index.html holds the static ones).
// French typography: U+202F (narrow no-break space) before : ; ! ? and inside « », typographic ’.
import { PRODUCTS, caption } from './catalog.js';

export const NNBSP = ' ';
export const TOAST = `Démonstration${NNBSP}: Ruelle est une marque fictive imaginée par LTNS°.`;
export const CREDIT = 'Projet fictif · concept de site par LTNS° — ltns.fr';

// rack caption: « T-shirt Rien à prouver — Noir »
export const captionOf = (i, v) => caption(PRODUCTS[i], v);
export const titleOf = (i) => PRODUCTS[i].title;
