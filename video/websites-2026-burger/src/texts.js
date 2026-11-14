// BRAISE: every text of the page (French typography: U+202F before : ; ! ? and inside « », the
// apostrophe ’). The restaurant, its burgers, its prices and its address are fictional: a concept by LTNS°.
const NN = ' ';
export { NN };

export const TITLE = 'Braise — Burgers smashés, Lyon (concept fictif)';
export const META_DESCRIPTION = `Concept fictif${NN}: le site d’un restaurant de burgers imaginaire, couche par couche, au défilement. Imaginé par LTNS°.`;

export const BRAND = {
  name: 'Braise',
  tagline: 'Burgers smashés · Lyon',
};

export const NAV = [
  { id: 'burger', num: '01', label: 'Le burger' },
  { id: 'ici', num: '02', label: 'Fait ici' },
  { id: 'menu', num: '03', label: 'Le menu' },
  { id: 'emporter', num: '04', label: 'À emporter' },
  { id: 'carte', num: '05', label: 'La carte' },
];
export const CTA = 'Commander';

export const BEATS = {
  hero: {
    kicker: 'Burgers smashés · Lyon',
    title: ['Smashé', 'à la minute.'],
    text: 'Deux steaks écrasés sur la plancha brûlante, une croûte qui craque, un cœur juteux.',
    hint: 'Faites défiler',
  },
  stack: {
    kicker: '01 — Le burger',
    title: ['Couche', 'par couche.'],
    text: 'Onze couches, rien de caché.',
  },
  why: {
    kicker: '02 — Fait ici',
    title: ['Tout est', 'fait ici.'],
    text: 'Rien de surgelé, rien d’industriel.',
    points: [
      { icon: 'pain', title: 'Le pain du boulanger d’à côté', text: 'Une brioche livrée chaque matin.' },
      { icon: 'boeuf', title: 'Bœuf français', text: 'Haché le matin, smashé à la commande.' },
      { icon: 'frites', title: 'Frites coupées à la main', text: 'Deux cuissons, une pincée de sel.' },
    ],
  },
  combo: {
    kicker: '03 — Le menu',
    title: ['Le menu', 'Braise.'],
    text: 'Un burger, des frites maison, deux sauces et un milkshake.',
    price: `14,90${NN}€`,
  },
  close: {
    kicker: '04 — À emporter',
    title: ['Fermé,', 'encore chaud.'],
    text: 'Prêt en huit minutes, à emporter ou livré.',
  },
  carte: {
    kicker: '05 — La carte',
    title: ['La carte.'],
    text: 'Frites maison 3,90 € · Frites cheddar-bacon 5,90 € · Milkshake 4,90 €',
  },
  rendezvous: {
    kicker: 'Commander',
    title: ['À table', 'dans huit minutes.'],
    text: 'Commandez en ligne, on lance la plancha. À emporter ou livré dans le quartier.',
    primary: 'Commander',
    secondary: 'Revoir le burger ↑',
    statement: `Braise est un restaurant fictif${NN}: ce site est un concept imaginé par LTNS° pour montrer ce qu’un site peut faire en 2026.`,
    ticket: {
      head: 'Votre commande',
      number: 'N° 0412 · à emporter',
      steps: ['Commande reçue', 'Steaks smashés', 'Cheddar fondu', 'Burger monté', 'Frites salées', 'Boîte fermée'],
      stamp: 'Prête',
    },
  },
};

// the labelled layers of the « Double Braise » (world layer ids; the second patty and cheese are not labelled)
export const LAYER_LABELS = {
  bunTop: 'Brioche toastée au sésame',
  onion: 'Oignons rouges',
  bacon: 'Bacon fumé',
  cheese: 'Cheddar affiné',
  patty: 'Steak smashé · 2 × 90 g',
  tomato: 'Tomate',
  lettuce: 'Salade croquante',
  sauce: 'Sauce Braise',
  bunBottom: 'Brioche du boulanger',
};

// the menu lineup (the world builds each burger from opts)
export const LINEUP = [
  { id: 'smash', name: 'Le Smash', price: `9,50${NN}€`, desc: 'Steak smashé, cheddar, pickles, oignons', opts: { patties: 1, bacon: false, onion: true, pickles: true, tomato: false, lettuce: false } },
  { id: 'double', name: 'Le Double Braise', price: `12,90${NN}€`, desc: 'Deux steaks, double cheddar, bacon', opts: { patties: 2, bacon: true, onion: true } },
  { id: 'fume', name: 'Le Fumé', price: `11,50${NN}€`, desc: 'Bacon fumé, cheddar, oignons rouges', opts: { patties: 1, bacon: true, onion: true, tomato: false } },
  { id: 'piquant', name: 'Le Piquant', price: `11,90${NN}€`, desc: 'Jalapeños, cheddar, sauce pimentée', opts: { patties: 1, jalapeno: true, onion: false, bacon: false } },
];

export const TOAST = `Démonstration${NN}: Braise est un restaurant fictif imaginé par LTNS°.`;
export const CREDIT = 'Projet fictif · concept de site par LTNS° — ltns.fr';
export const NOGL = ['Cette page a besoin de WebGL 2.', 'Ouvrez-la dans une version récente de Chrome ou d’Edge, avec l’accélération graphique activée.'];
