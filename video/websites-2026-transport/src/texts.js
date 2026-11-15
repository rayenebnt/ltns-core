// ORVAN: every text of the page (French typography: U+202F before : ; ! ? and inside « », the
// apostrophe ’). The company, its figures and its services are fictional: a concept by LTNS°.
const NN = ' ';
export { NN };

export const TITLE = 'Orvan — Transport et logistique (concept fictif)';
export const META_DESCRIPTION = `Concept fictif${NN}: le site d’un commissionnaire de transport imaginaire, en maquettes 3D au défilement. Imaginé par LTNS°.`;

export const BRAND = {
  name: 'Orvan',
  tagline: 'Transport & logistique',
};

export const NAV = [
  { id: 'route', num: '01', label: 'Route' },
  { id: 'entrepot', num: '02', label: 'Entrepôt' },
  { id: 'distribution', num: '03', label: 'Distribution' },
  { id: 'mer', num: '04', label: 'Air & mer' },
  { id: 'rail', num: '05', label: 'Rail' },
];
export const CTA = 'Demande de fret →';
export const MENU = ['Services', 'Espace client', 'Entreprise', 'Contact', 'Carrières'];
export const TRACK = 'Suivi d’envoi →';
export const ALL = 'Tous nos services →';

// the hotspots of each diorama (world.anchors() gives their place on screen)
export const SPOTS = {
  hub: [{ id: 'route', title: 'La route', lines: ['Groupage et lots complets', 'Toute l’Europe sous 48 à 72 h', 'Suivi de chaque palette en temps réel'] }],
  entrepot: [{ id: 'stock', title: 'L’entreposage', lines: ['18 000 emplacements palettes', 'Préparation de commandes le jour même', 'Votre stock visible en ligne'] }],
  campagne: [{ id: 'distribution', title: 'La distribution', lines: ['Livraison sur rendez-vous', 'Hayon et deux livreurs si besoin', 'Preuve de livraison signée sur écran'] }],
  port: [
    { id: 'mer', title: 'Le maritime', lines: ['Conteneurs complets et groupage', 'Dédouanement pris en charge', 'Départs chaque semaine'] },
    { id: 'air', title: 'L’aérien', lines: ['Express sous 24 à 48 h', 'Marchandises sensibles et urgentes', 'Enlèvement à votre quai'] },
  ],
  rail: [{ id: 'rail', title: 'Le ferroviaire', lines: ['Combiné rail-route', 'Jusqu’à 80 % de CO₂ en moins par tonne', 'Un seul interlocuteur de bout en bout'] }],
};
export const MORE = 'En savoir plus →';

export const BEATS = {
  hero: {
    kicker: 'Commissionnaire de transport',
    title: ['Orvan, votre partenaire', 'transport et logistique.'],
    text: `Par la route, les airs, la mer ou le rail${NN}: nous emmenons votre fret à bon port, avec des outils numériques et un interlocuteur qui vous connaît.`,
    primary: 'Aperçu des services',
    secondary: 'Vers la demande de fret',
    hint: 'Faites défiler',
  },
  rendezvous: {
    kicker: 'Demande de fret',
    title: ['Votre fret,', 'en de bonnes mains.'],
    text: 'Une demande, une réponse sous deux heures ouvrées, et un interlocuteur jusqu’à la livraison.',
    primary: 'Faire une demande de fret',
    secondary: 'Revoir le trajet ↑',
    statement: `Orvan est une entreprise fictive${NN}: ce site est un concept imaginé par LTNS° pour montrer ce qu’un site peut faire en 2026.`,
    ticket: {
      head: 'Votre envoi',
      number: 'OR-2611-0427',
      steps: ['Enlèvement', 'Entreposage', 'Route', 'Mer ou air', 'Rail', 'Livraison'],
      stamp: 'Livré',
    },
  },
};

export const TOAST = `Démonstration${NN}: Orvan est une entreprise fictive imaginée par LTNS°.`;
export const CREDIT = 'Projet fictif · concept de site par LTNS° — ltns.fr';
export const NOGL = ['Cette page a besoin de WebGL 2.', 'Ouvrez-la dans une version récente de Chrome ou d’Edge, avec l’accélération graphique activée.'];
