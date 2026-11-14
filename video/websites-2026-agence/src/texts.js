// POMONE: every text of the page (French typography: U+202F before : ; ! ? and inside « », the
// apostrophe ’). The studio, its model, its figures and its answers are fictional: a concept by LTNS°.
const NN = ' ';
export { NN };

export const TITLE = 'Pomone — Studio de croissance (concept fictif)';
export const META_DESCRIPTION = `Concept fictif${NN}: le site d’un studio imaginaire de sites et de référencement, de la graine à la récolte, au défilement. Imaginé par LTNS°.`;

export const BRAND = {
  name: 'Pomone',
  tagline: 'Studio de croissance',
};

export const NAV = [
  { id: 'idee', num: '01', label: 'L’idée' },
  { id: 'croissance', num: '02', label: 'La croissance' },
  { id: 'toit', num: '03', label: 'Sous un toit' },
  { id: 'modele', num: '04', label: 'Le modèle' },
  { id: 'questions', num: '05', label: 'Questions' },
];
export const CTA = 'Postuler';

export const BEATS = {
  hero: {
    kicker: 'Studio de croissance · Sites et référencement',
    title: ['Faire pousser', 'votre site.'],
    text: 'Le site, les contenus et le référencement, réunis dans un même atelier. Nous ne gagnons que si vous gagnez.',
    hint: 'Faites défiler',
  },
  build: {
    kicker: '02 — La croissance',
    title: ['On le plante.'],
    text: 'Un site rapide et solide, pensé dès la première ligne pour être trouvé.',
  },
  rank: {
    title: ['On le fait monter.'],
    text: `Contenus, liens, technique${NN}: jusqu’en première page, puis on y reste.`,
  },
  roof: {
    kicker: '03 — Sous un toit',
    title: ['Tout ce qu’il faut', 'pour être trouvé.'],
    text: 'Chez Pomone, le site, les contenus et le référencement sont un seul et même métier.',
    points: [
      { icon: 'site', title: 'Le site', text: 'Rapide, accessible, construit pour les moteurs.' },
      { icon: 'plume', title: 'Les contenus', text: 'Écrits par des gens qui connaissent votre métier.' },
      { icon: 'graine', title: 'Le référencement', text: 'Technique, liens et suivi, chaque semaine.' },
    ],
  },
  model: {
    kicker: '04 — Le modèle',
    title: ['Pas de forfait.', 'Une part de la récolte.'],
    text: `Rien à payer pour commencer${NN}: ni abonnement, ni devis à l’heure. Notre rémunération est une part, convenue d’avance, du chiffre d’affaires que le site vous apporte.`,
  },
  non: {
    title: ['On dit non', 'plus souvent que oui.'],
    text: 'Peu de clients à la fois, choisis là où nous savons faire pousser.',
  },
  faq: {
    kicker: '05 — Questions',
    title: ['Demandé avant', 'de signer.'],
    items: [
      { q: `Combien coûte le démarrage${NN}?`, a: 'Rien. Pas d’abonnement ni d’acompte : nous avançons le travail.' },
      { q: `Quelle part de la récolte${NN}?`, a: 'Un pourcentage du chiffre d’affaires apporté par le site, fixé ensemble avant de signer.' },
      { q: `En combien de temps ça pousse${NN}?`, a: 'Les premières pousses en trois à six mois, selon votre marché.' },
      { q: `Et si rien ne pousse${NN}?`, a: 'Alors vous ne nous devez rien de plus.' },
    ],
  },
  rendezvous: {
    kicker: 'Rendez-vous',
    title: ['Plantons', 'la première graine.'],
    text: 'Un appel de vingt minutes pour voir si votre terrain est fertile.',
    primary: 'Prendre rendez-vous',
    secondary: 'Revoir le verger ↑',
    statement: `Pomone est un studio fictif${NN}: ce site est un concept imaginé par LTNS° pour montrer ce qu’un site peut faire en 2026.`,
    ticket: {
      head: 'Votre verger',
      number: 'Saison 1',
      steps: ['Audit du terrain', 'Site planté', 'Contenus semés', 'Liens greffés', 'Premières pousses', 'Première récolte'],
      stamp: 'Récolte',
    },
  },
};

export const TOAST = `Démonstration${NN}: Pomone est un studio fictif imaginé par LTNS°.`;
export const CREDIT = 'Projet fictif · concept de site par LTNS° — ltns.fr';
export const NOGL = ['Cette page a besoin de WebGL 2.', 'Ouvrez-la dans une version récente de Chrome ou d’Edge, avec l’accélération graphique activée.'];
