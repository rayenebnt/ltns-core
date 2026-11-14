// SIBYLLE: every text of the page (French typography: U+202F before : ; ! ? and inside « », the
// apostrophe ’). The house, its liqueurs and its tastings are fictional: a concept by LTNS°.
const NN = ' ';
export { NN };

export const TITLE = 'Sibylle — Liqueurs de nuit (concept fictif)';
export const META_DESCRIPTION = `Concept fictif${NN}: le site d’une maison imaginaire de liqueurs de nuit, en gravure rouge et noire, au défilement. Imaginé par LTNS°.`;

export const BRAND = {
  name: 'Sibylle',
  tagline: 'Liqueurs de nuit',
};

export const NAV = [
  { id: 'obole', num: '01', label: 'L’obole' },
  { id: 'oracle', num: '02', label: 'L’oracle' },
  { id: 'fioles', num: '03', label: 'Les fioles' },
  { id: 'rituel', num: '04', label: 'Le rituel' },
  { id: 'vision', num: '05', label: 'La vision' },
];
export const CTA = 'Réserver';

// the three liqueurs (the order of the bottles, left to right)
export const FLAVORS = [
  { num: 'N°1', name: 'Écume', notes: 'Bleuet, sel marin, gentiane', mood: 'Pour les nuits claires.' },
  { num: 'N°2', name: 'Herbier', notes: 'Verveine, absinthe douce, menthe poivrée', mood: 'Pour les nuits longues.' },
  { num: 'N°3', name: 'Songe', notes: 'Cédrat, safran, fleur d’oranger', mood: 'Pour les nuits à rêver.' },
];
export const FLAVOR_SPEC = `50${NN}cl · 24${NN}% vol.`;

export const BADGES = { hold: 'Maintenir', pour: 'Maintenir pour verser', choose: 'Choisir' };

export const BEATS = {
  hero: {
    kicker: 'Maison Sibylle · Liqueurs de nuit',
    title: ['Payez', 'l’obole.'],
    text: 'Trois liqueurs à boire à la nuit tombée. Maintenez le clic pour prendre le jeton, ou faites défiler.',
    hint: 'Faites défiler',
  },
  oracle: {
    kicker: '02 — L’oracle',
    title: ['Elle ne répond', 'que la nuit.'],
    text: 'Une question par soir, pas une de plus. La réponse se boit.',
  },
  temple: {
    kicker: '03 — Les fioles',
    title: ['Trois fioles', 'sur l’autel.'],
    text: 'Chacune garde une nuit différente.',
  },
  fioles: {
    title: ['Choisissez', 'votre nuit.'],
    text: 'Cliquez sur une fiole.',
  },
  verser: {
    kicker: '04 — Le rituel',
    title: ['Versez.', 'Lentement.'],
    text: 'Trois centilitres sur un glaçon, une écorce de cédrat. Le reste appartient à la nuit.',
  },
  vision: {
    kicker: '05 — La vision',
    title: ['Puis les murs', 'tombent.'],
    text: 'Ce que vous voyez ensuite ne regarde que vous.',
  },
  fronton: {
    kicker: 'L’expérience · Dégustations privées à la nuit tombée',
    title: ['Sibylle'],
  },
  rendezvous: {
    kicker: 'Dégustation',
    title: ['Réservez', 'votre nuit.'],
    text: 'Six places par soir, trois fioles ouvertes, une question chacun. Le reste se raconte sur place.',
    primary: 'Réserver une dégustation',
    secondary: 'Revoir le rituel ↑',
    statement: `Sibylle est une maison fictive${NN}: ce site est un concept imaginé par LTNS° pour montrer ce qu’un site peut faire en 2026. L’abus d’alcool est dangereux pour la santé, à consommer avec modération.`,
    ticket: {
      head: 'Votre rituel',
      steps: ['Obole payée', 'Oracle consulté', 'Temple franchi', 'Fiole choisie', 'Liqueur versée', 'Vision reçue'],
      stamp: 'Exaucé',
    },
  },
};

export const TOAST = `Démonstration${NN}: Sibylle est une maison fictive imaginée par LTNS°.`;
export const CREDIT = 'Projet fictif · concept de site par LTNS° — ltns.fr';
export const NOGL = ['Cette page a besoin de WebGL 2.', 'Ouvrez-la dans une version récente de Chrome ou d’Edge, avec l’accélération graphique activée.'];
