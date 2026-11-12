// BALANCIER: every visible French text of the page, exactly as it must appear. French typography:
// U+202F (narrow no-break space, NN below) before : ; ! ? and inside « », typographic apostrophe ’.
// Balancier is a FICTIONAL watch atelier: no other claim, figure, price, contact detail, customer,
// testimonial, certification or brand (no real watch brand, movement maker or model).
const NN = ' ';
export { NN };

export const TITLE = 'Balancier — Atelier d’horlogerie, Besançon (concept fictif)';
export const META_DESCRIPTION = `Concept fictif${NN}: le site d’un atelier imaginaire de révision et de restauration de montres mécaniques, au défilement. Imaginé par LTNS°.`;

export const BRAND = {
  name: 'Balancier', // logo, set in Cormorant SC 600 (true small capitals), letter-spaced
  tagline: 'Atelier d’horlogerie · Besançon',
};

// nav = the story chapters (story.js CHAPTERS, same ids); « Rendez-vous » is the final section
export const NAV = [
  { id: 'demontage', num: '01', label: 'Démontage' },
  { id: 'remontage', num: '02', label: 'Remontage' },
  { id: 'atelier', num: '03', label: 'L’atelier' },
  { id: 'transparence', num: '04', label: 'Transparence' },
  { id: 'restauration', num: '05', label: 'Restauration' },
];
export const CTA = 'Confier ma montre';

// the part labels of the exploded line (keys = part ids of src/world/layout.js PARTS, in line order)
export const PARTS = {
  braceletFront: 'Maillons',
  crystal: 'Glace saphir',
  bezel: 'Lunette',
  dial: 'Cadran',
  hands: 'Aiguilles',
  caseMiddle: 'Carrure',
  mainplate: 'Platine',
  train: 'Rouage',
  balance: 'Balancier',
  bridges: 'Ponts',
  rotor: 'Masse oscillante',
  caseback: 'Fond saphir',
  braceletBack: 'Fermoir',
};

// the text beats, in story order (ids match story.js BEATS)
export const BEATS = {
  hero: {
    kicker: 'Révision · Restauration',
    title: ['Chaque pièce', 'compte.'],
    text: 'Montres mécaniques démontées, nettoyées, remontées et réglées à la main, à Besançon.',
    hint: 'Faites défiler',
  },
  remontage: {
    kicker: '02 — Remontage',
    title: ['Démontée,', 'nettoyée,', 'remontée.'],
    text: 'Chaque pièce passe sous la loupe, une à une, puis retrouve sa place.',
  },
  coeur: {
    kicker: 'Le balancier',
    title: ['Le cœur bat', 'de nouveau.'],
    text: `Huit alternances par seconde${NN}: le balancier, réglé au plus juste.`,
  },
  reglee: {
    kicker: 'Réglage',
    title: ['Réglée.', 'Contrôlée.', 'Rendue.'],
  },
  atelier: {
    kicker: '03 — L’atelier',
    title: ['Un horloger,', 'du début à la fin.'],
    text: `La personne qui ouvre votre montre est celle qui vous la rend. Un seul établi, un seul responsable${NN}: vous savez entre quelles mains elle se trouve.`,
    // three commitments, each with a small line icon (src/index.html symbols)
    points: [
      { icon: 'devis', title: 'Un devis avant tout', text: 'Rien n’est fait sans votre accord.' },
      { icon: 'photo', title: 'Une photo à chaque étape', text: 'Vous suivez votre montre à l’établi.' },
      { icon: 'piece', title: 'Les pièces vous reviennent', text: 'Celles qu’on remplace vous sont rendues.' },
    ],
  },
  transparence: {
    kicker: '04 — Transparence',
    title: ['Rien n’est', 'caché.'],
    text: 'Chaque étape est photographiée et vous est envoyée. Vous voyez votre montre comme nous la voyons.',
  },
  restauration: {
    kicker: '05 — Restauration',
    title: ['Elle repart.', 'Elle reste la vôtre.'],
    text: `Cadran, aiguilles, patine${NN}: on restaure sans effacer l’histoire.`,
    cards: [
      { title: 'Cadran d’origine', text: 'Nettoyé, jamais repeint.' },
      { title: 'Pièces d’époque', text: 'Recherchées avant d’être refaites.' },
      { title: 'Étanchéité', text: 'Contrôlée avant le retour.' },
    ],
  },
  rendezvous: {
    kicker: 'Rendez-vous',
    // the atelier ticket (« fiche d’atelier »): the steps tick off one by one, then the stamp lands
    ticket: {
      head: 'Fiche d’atelier',
      number: 'N° 2611-04',
      steps: ['Reçue', 'Démontée', 'Nettoyée', 'Remontée', 'Réglée', 'Contrôlée'],
      stamp: 'Prête',
    },
    title: ['Confiez-nous', 'votre montre.'],
    text: `Déposez-la à l’atelier ou envoyez-la${NN}: vous recevez un devis précis avant tout travail.`,
    primary: 'Prendre rendez-vous',
    secondary: 'Revoir le démontage ↑',
    statement: `Balancier est un atelier fictif${NN}: ce site est un concept imaginé par LTNS° pour montrer ce qu’un site peut faire en 2026.`,
  },
};

// printed on the watch (canvas textures): the dial and the caseback ring engraving (no real brand)
export const WATCH_PRINT = {
  dial: ['BALANCIER', 'BESANÇON'], // under 12 (brand) and above 6 (city)
  dialSmall: 'AUTOMATIQUE', // small, above 6, under the city
  caseback: ['BALANCIER · BESANÇON', 'ACIER · SAPHIR · 100 M'], // around the sapphire window
  rotor: 'BALANCIER', // engraved on the oscillating weight
};

// always visible, small, bottom left
export const CREDIT = 'Projet fictif · concept de site par LTNS° — ltns.fr';
// every call to action (the header pill, « Prendre rendez-vous »)
export const TOAST = `Démonstration${NN}: Balancier est un atelier fictif imaginé par LTNS°.`;
// without WebGL 2
export const NOGL = ['Cette page a besoin de WebGL 2.', 'Ouvrez-la dans une version récente de Chrome ou d’Edge, avec l’accélération graphique activée.'];
