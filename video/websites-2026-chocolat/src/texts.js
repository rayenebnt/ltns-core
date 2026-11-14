// MÉDINA: every text of the page (French typography: U+202F before : ; ! ? and inside « », the
// apostrophe ’). The house, its bars and its boxes are fictional: a concept by LTNS°.
const NN = ' ';
export { NN };

export const TITLE = 'Médina — Chocolaterie (concept fictif)';
export const META_DESCRIPTION = `Concept fictif${NN}: le site d’une chocolaterie imaginaire, pistache et kadaïf sous chocolat au lait, en 3D au défilement. Imaginé par LTNS°.`;

export const BRAND = {
  name: 'Médina',
  tagline: 'Chocolaterie',
};

export const NAV = [
  { id: 'pistache', num: '01', label: 'La pistache' },
  { id: 'chocolat', num: '02', label: 'Le chocolat' },
  { id: 'tablette', num: '03', label: 'La tablette' },
  { id: 'collection', num: '04', label: 'La collection' },
  { id: 'craquant', num: '05', label: 'Le craquant' },
];
export const CTA = 'Commander';

// the boxes of the row (left to right); the bar itself stands for L’Originale
export const BOXES = [
  { name: 'ROSE', line: 'Une rose au souk', flavor: 'Rose & framboise', c1: '#b3245a', c2: '#3d0b20', ink: '#f6d6b0' },
  { name: 'NUIT', line: 'Minuit au désert', flavor: 'Noisette & cacao noir', c1: '#28305e', c2: '#0b0f22', ink: '#e8cf98' },
  { name: '', line: '', flavor: '', c1: '', c2: '', ink: '' },
  { name: 'AMBRE', line: 'L’heure dorée', flavor: 'Caramel salé & kadaïf', c1: '#c06a12', c2: '#4a1d05', ink: '#ffe2a6' },
  { name: 'SAFRAN', line: 'Le marché aux épices', flavor: 'Safran & cardamome', c1: '#d4a019', c2: '#5b3a06', ink: '#fff0c4' },
  { name: 'DATTE', line: 'L’oasis au soir', flavor: 'Datte & tahini', c1: '#6b2f6a', c2: '#220b23', ink: '#f2d4a6' },
];
// the flavours as they come to the centre (story.js CENTRED)
export const COLLECTION = [
  { name: 'L’Originale', text: 'Pistache torréfiée, kadaïf grillé au beurre, chocolat au lait.' },
  { name: 'Caramel salé & kadaïf', text: 'Un caramel au beurre salé, les fils dorés du kadaïf.' },
  { name: 'Safran & cardamome', text: 'Une ganache infusée au safran, une pointe de cardamome verte.' },
  { name: 'Datte & tahini', text: 'Une crème de dattes, le sésame grillé du tahini.' },
];

export const BEATS = {
  hero: {
    kicker: 'Maison Médina · Chocolaterie',
    title: ['L’art', 'de la tentation.'],
    text: 'Pistache, kadaïf et chocolat au lait, coulés à la main.',
    hint: 'Faites défiler',
  },
  pistache: {
    kicker: '01 — La pistache',
    title: ['La pistache', 'd’abord.'],
    text: 'Une crème de pistache torréfiée, mêlée de kadaïf grillé au beurre jusqu’à ce qu’il craque.',
  },
  chocolat: {
    kicker: '02 — Le chocolat',
    title: ['Puis le chocolat', 'qui enrobe tout.'],
    text: 'Un chocolat au lait à 41 %, coulé lentement, jusqu’au bord.',
  },
  tablette: {
    kicker: '03 — La tablette',
    title: ['Un modèle', 'de bon goût.'],
    text: 'Huit carrés épais, des paillettes d’or, et un secret qui se révèle lentement.',
  },
  collection: {
    kicker: '04 — La collection',
  },
  craquant: {
    kicker: '05 — Le craquant',
    title: ['Un craquant délicat.', 'Un cœur fondant.'],
    text: 'Sous une fine coque de chocolat, la crème de pistache rencontre les fils dorés du kadaïf. Le secret se révèle lentement.',
  },
  rendezvous: {
    kicker: 'Commander',
    title: ['Offrez', 'une tentation.'],
    text: 'Des coffrets de quatre ou huit tablettes, coulées à la commande et livrées sous trois jours.',
    primary: 'Commander un coffret',
    secondary: 'Revoir la coulée ↑',
    statement: `Médina est une chocolaterie fictive${NN}: ce site est un concept imaginé par LTNS° pour montrer ce qu’un site peut faire en 2026.`,
    ticket: {
      head: 'Votre coffret',
      number: 'Coffret de 8',
      steps: ['Cacao choisi', 'Pistache torréfiée', 'Kadaïf grillé', 'Coque coulée', 'Paillettes d’or', 'Coffret scellé'],
      stamp: 'Scellé',
    },
  },
};

export const TOAST = `Démonstration${NN}: Médina est une chocolaterie fictive imaginée par LTNS°.`;
export const CREDIT = 'Projet fictif · concept de site par LTNS° — ltns.fr';
export const NOGL = ['Cette page a besoin de WebGL 2.', 'Ouvrez-la dans une version récente de Chrome ou d’Edge, avec l’accélération graphique activée.'];
