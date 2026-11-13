// ALTIÈRE: every text of the page (French typography: U+202F before : ; ! ? and inside « », the
// apostrophe ’). The residence, its tower, its lots and its figures are fictional: a concept by LTNS°.
const NN = ' ';
export { NN };

export const TITLE = 'Altière — Résidences sur la baie (concept fictif)';
export const META_DESCRIPTION = `Concept fictif${NN}: le site d’une résidence imaginaire, des nuages jusqu’au plan de l’étage, au défilement. Imaginé par LTNS°.`;

export const BRAND = {
  name: 'Altière', // logo, set in Cormorant SC 600 (true small capitals), letter-spaced
  tagline: 'Résidences sur la baie',
};

export const NAV = [
  { id: 'ciel', num: '01', label: 'Le ciel' },
  { id: 'baie', num: '02', label: 'La baie' },
  { id: 'chantier', num: '03', label: 'Le chantier' },
  { id: 'tour', num: '04', label: 'La tour' },
  { id: 'plans', num: '05', label: 'Les plans' },
];
export const CTA = 'Demander la brochure';

export const BEATS = {
  hero: {
    kicker: 'Résidences sur la baie',
    title: ['Habiter', 'au-dessus', 'des nuages.'],
    text: 'Une tour de vingt-six étages au bout du cap, face au couchant.',
    hint: 'Faites défiler',
  },
  ciel: {
    kicker: '01 — Le ciel',
    title: ['La baie,', 'vue d’en haut.'],
    text: 'Sous les nuages, le cap, le port et la ville.',
  },
  baie: {
    kicker: '02 — La baie',
    title: ['Pourquoi', `ici${NN}?`],
    text: 'Au bout du cap, entre le port de plaisance et la ville.',
    points: [
      { icon: 'mer', title: 'La mer en bas', text: 'Plages et sentier du littoral au pied de la tour.' },
      { icon: 'port', title: 'Le port à pied', text: 'Les quais et leurs terrasses à cinq minutes.' },
      { icon: 'ville', title: 'La ville à côté', text: 'Commerces, écoles et gare à dix minutes.' },
    ],
  },
  chantier: {
    kicker: '03 — Le chantier',
    title: ['Elle s’élève,', 'étage par étage.'],
    text: 'Le noyau d’abord, une dalle par semaine, puis la façade de verre.',
    counter: 'Niveau',
    of: 'sur 26',
  },
  tour: {
    kicker: '04 — La tour',
    title: ['Vingt-six étages', 'face au couchant.'],
    stats: [
      ['112', 'résidences'],
      ['2 à 5', 'pièces'],
      [`12 à 40${NN}m²`, 'de terrasse'],
    ],
  },
  explorer: {
    kicker: 'Explorer les résidences',
    title: ['Choisissez', 'votre étage.'],
    text: `Niveau 07${NN}: cinq résidences, de 64 à 112${NN}m².`,
  },
  plan: {
    kicker: '05 — Les plans',
    title: ['Niveau 07'],
    text: 'Survolez un logement pour le détail.',
    legend: { libre: 'Disponible', option: 'Sous option', vendu: 'Vendu' },
    core: 'Ascenseurs · escalier',
  },
  rendezvous: {
    kicker: 'Rendez-vous',
    title: ['Venez voir', 'la baie d’en haut.'],
    text: 'L’appartement témoin du 7ᵉ étage se visite sur rendez-vous, au coucher du soleil.',
    primary: 'Prendre rendez-vous',
    secondary: 'Revoir la descente ↑',
    statement: `Altière est une résidence fictive${NN}: ce site est un concept imaginé par LTNS° pour montrer ce qu’un site peut faire en 2026.`,
    ticket: {
      head: 'Votre option',
      number: 'Niveau 07 · Lot 7B',
      steps: ['Étage choisi', 'Plan consulté', 'Lot 7B · 3 pièces', 'Visite réservée', 'Dossier envoyé', 'Option confirmée'],
      stamp: 'Réservé',
    },
  },
};

// level 07: five lots on the floor plate (local metres of the tower's frame: x along the long side,
// z across; the glass line is a rounded rectangle 26 × 21 m). status: libre | option | vendu
export const UNITS = [
  { id: '7A', at: [-9.3, -5.6], type: '4 pièces', area: 112, terrace: 24, view: 'Nord-est · vue baie', status: 'vendu', poly: [[-13, -10.5], [-1, -10.5], [-1, -4.2], [-5, -4.2], [-5, 1], [-13, 1]] },
  { id: '7B', at: [6.2, -7.4], type: '3 pièces', area: 98, terrace: 18, view: 'Sud-est · lever du soleil', status: 'libre', poly: [[-1, -10.5], [13, -10.5], [13, -3], [5, -3], [5, -4.2], [-1, -4.2]] },
  { id: '7C', at: [9, 0.6], type: '2 pièces', area: 64, terrace: 12, view: 'Sud · plein soleil', status: 'option', poly: [[5, -3], [13, -3], [13, 4.5], [5, 4.5]] },
  { id: '7D', at: [7.6, 7.2], type: '3 pièces', area: 86, terrace: 16, view: 'Sud-ouest · couchant', status: 'libre', poly: [[13, 4.5], [13, 10.5], [1, 10.5], [1, 4.2], [5, 4.2], [5, 4.5]] },
  { id: '7E', at: [-6.6, 6.9], type: '4 pièces', area: 108, terrace: 22, view: 'Nord-ouest · vue mer', status: 'libre', poly: [[-13, 1], [-5, 1], [-5, 4.2], [1, 4.2], [1, 10.5], [-13, 10.5]] },
];
export const PLAN_SHAPE = { a: 13, b: 10.5, r: 5, core: [-3.2, -2.6, 6.4, 5.2], hall: [-5, -4.2, 10, 8.4] };

export const TOAST = `Démonstration${NN}: Altière est une résidence fictive imaginée par LTNS°.`;
export const CREDIT = 'Projet fictif · concept de site par LTNS° — ltns.fr';
export const NOGL = ['Cette page a besoin de WebGL 2.', 'Ouvrez-la dans une version récente de Chrome ou d’Edge, avec l’accélération graphique activée.'];
