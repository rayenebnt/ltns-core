// PINÈDE: every text of the page (French typography: U+202F before : ; ! ? and inside « », the
// apostrophe ’). The company, its houses and its figures are fictional: a concept by LTNS°.
const NN = ' ';
export { NN };

export const TITLE = 'Pinède — Bâtisseur sur la Côte d’Azur (concept fictif)';
export const META_DESCRIPTION = `Concept fictif${NN}: le site d’un bâtisseur de maisons imaginaire, avec une visite 3D d’intérieur au défilement. Imaginé par LTNS°.`;

export const BRAND = {
  name: 'Pinède',
  lines: ['Pinède', 'Bâtisseur', 'Côte d’Azur'],
};

// the header: its menu (every link of this concept is a demonstration), the visit, the quote
export const MENU = [
  { label: 'À propos' },
  { label: 'Services', more: true },
  { label: 'Réalisations' },
  { label: 'Contact' },
];
export const VISIT = 'Visiter une maison';
export const CTA = 'Devis gratuit';

// the first sections, before the house
export const DARK = {
  kicker: 'Les chantiers exigeants',
  title: ['Nous bâtissons', 'là où d’autres', 'renoncent.'],
  text: `Terrains en pente, fondations profondes, reprises de structure et maisons sur mesure${NN}: les chantiers qui demandent un vrai savoir-faire sont ceux pour lesquels nous sommes faits.`,
  button: 'Voir nos réalisations',
  hint: 'Faites défiler',
};
export const ABOUT = {
  kicker: 'Pinède, bâtisseur',
  title: ['Construction,', 'rénovation et', 'extérieurs, bâtis', 'dans les règles.'],
  text: `Maisons neuves, rénovations complètes, piscines et jardins${NN}: de l’étude de sol à la remise des clés, une seule équipe suit votre maison sur toute la Côte d’Azur.`,
  more: 'En savoir plus →',
};
export const SERVICES = {
  kicker: 'Nos métiers',
  title: 'Des savoir-faire pensés pour les maisons du Midi',
  more: 'Découvrir →',
  cards: [
    { shot: 'cuisine', title: 'Cuisines et salles de bains', text: 'Îlots en pierre, façades en chêne, rangements sur mesure, posés au millimètre.' },
    { shot: 'maison', title: 'Maisons neuves', text: 'De la première esquisse à la remise des clés, avec un seul interlocuteur.' },
    { shot: 'piscine', title: 'Piscines et extérieurs', text: 'Bassins, terrasses et jardins dessinés pour le soleil et faits pour durer.' },
  ],
};

// the caption over the house (bottom left, as on the page's first screen of a real site)
export const CAPTION = {
  text: 'Construction haut de gamme, rénovations et aménagements extérieurs sur toute la Côte d’Azur.',
  primary: 'Devis gratuit',
  secondary: 'Nos réalisations',
};

// the final section and its ticket
export const PROJET = {
  kicker: 'Votre projet',
  title: ['Votre maison,', 'du plan aux clés.'],
  text: 'Un premier rendez-vous sur votre terrain, une étude chiffrée sous quinze jours, puis un seul interlocuteur jusqu’à la remise des clés.',
  primary: 'Demander un devis gratuit',
  secondary: 'Revoir la visite ↑',
  statement: `Pinède est une entreprise fictive${NN}: ce site est un concept imaginé par LTNS° pour montrer ce qu’un site peut faire en 2026.`,
  ticket: {
    head: 'Votre chantier',
    number: 'PN-2611-0318',
    steps: ['Étude de sol', 'Plans et permis', 'Gros œuvre', 'Second œuvre', 'Extérieurs', 'Remise des clés'],
    stamp: 'Livré',
  },
};

export const TOAST = `Démonstration${NN}: Pinède est une entreprise fictive imaginée par LTNS°.`;
export const CREDIT = 'Projet fictif · concept de site par LTNS° — ltns.fr';
export const NOGL = ['Cette page a besoin de WebGL 2.', 'Ouvrez-la dans une version récente de Chrome ou d’Edge, avec l’accélération graphique activée.'];
