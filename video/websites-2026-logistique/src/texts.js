// SILLAGE: every visible French text of the page, exactly as it must appear. French typography:
// U+202F (narrow no-break space, NN below) before : ; ! ? and inside « », typographic apostrophe ’.
// Sillage is a FICTIONAL company: no other claim, figure, contact detail, customer or brand.
const NN = ' ';

export const TITLE = 'Sillage — Transport et logistique, Le Havre (concept fictif)';
export const META_DESCRIPTION = `Concept fictif${NN}: le site d’une entreprise de transport imaginaire, du port à l’avion, au défilement. Imaginé par LTNS°.`;

export const BRAND = {
  name: 'SILLAGE', // logo, set in Big Shoulders Stencil Display 900
  tagline: 'TRANSPORT & LOGISTIQUE · LE HAVRE',
};

export const NAV = [
  { id: 'port', num: '01', label: 'PORT' },
  { id: 'route', num: '02', label: 'ROUTE' },
  { id: 'mer', num: '03', label: 'MER' },
  { id: 'air', num: '04', label: 'AIR' },
];
export const CTA = 'DEMANDER UN DEVIS';

// the text beats, in story order (ids match story.js BEATS)
export const BEATS = {
  hero: {
    kicker: '01 — PORT DU HAVRE',
    title: ['Port, route,', 'mer, air.'],
    accent: 'Un seul fil à suivre.',
    text: `Sillage organise le transport de vos conteneurs de bout en bout. Faites défiler${NN}: on suit le vôtre.`,
    hint: 'FAITES DÉFILER',
  },
  port: {
    kicker: '01 — PORT',
    title: ['Levé, posé,', 'parti.'],
    text: 'Au terminal, un cavalier soulève votre conteneur et le pose sur la remorque. Le camion part dans la foulée.',
  },
  route: {
    kicker: '02 — ROUTE',
    title: ['Chaque kilomètre', 'suivi.'],
    text: 'Du terminal au quai d’embarquement, vous voyez où roule votre conteneur, en direct.',
  },
  mer: {
    kicker: '03 — MER',
    title: ['À travers l’océan,', 'jamais perdu de vue.'],
  },
  services: [
    { icon: 'contact', title: 'Un seul interlocuteur', text: 'La même personne suit votre envoi, du premier appel à la livraison.' },
    { icon: 'map', title: 'Suivi en direct', text: 'Votre conteneur sur une carte, à chaque étape du trajet.' },
    { icon: 'customs', title: 'Douane prise en charge', text: 'Déclarations et documents préparés pour vous.' },
    { icon: 'price', title: 'Prix clairs', text: 'Un devis détaillé, sans frais surprises à l’arrivée.' },
    { icon: 'alert', title: 'Alertes en route', text: `Un retard${NN}? Vous êtes prévenu avant de le découvrir.` },
  ],
  air: {
    kicker: '04 — AIR',
    title: [`Pressé${NN}?`, 'On prend l’avion.'],
    text: `Pour les envois urgents, le fret aérien prend le relais${NN}: même suivi, même interlocuteur.`,
  },
  arrivee: {
    kicker: 'ARRIVÉE',
    // the split-flap board: label (left) and value (right) per row; the values flip into place
    board: [
      ['ENVOI', 'N° 041207'],
      ['DÉPART', 'LE HAVRE'],
      ['TRAJET', 'PORT · ROUTE · MER'],
      ['STATUT', 'LIVRÉ'],
    ],
    title: ['Livré.', 'Suivi jusqu’au bout.'],
    text: `Port, route, mer, air${NN}: un seul interlocuteur pour tout le trajet.`,
    primary: 'Demander un devis',
    secondary: 'Revoir le trajet ↑',
    statement: `Sillage est une entreprise fictive${NN}: ce site est un concept imaginé par LTNS° pour montrer ce qu’un site peut faire en 2026.`,
  },
};

// always visible, small, bottom left
export const CREDIT = 'Projet fictif · concept de site par LTNS° — ltns.fr';
// every call to action (the header pill, « Demander un devis »)
export const TOAST = `Démonstration${NN}: Sillage est une entreprise fictive imaginée par LTNS°.`;
// without WebGL 2
export const NOGL = ['Cette page a besoin de WebGL 2.', 'Ouvrez-la dans une version récente de Chrome ou d’Edge, avec l’accélération matérielle activée.'];

// 3D markings (canvas textures). The hero container and the brand's own fleet carry the brand;
// every other container carries only generic technical stencils (no shipping line, no real code).
export const MARKINGS = {
  heroContainer: { brand: 'SILLAGE', code: 'SLGU 041207 0', type: '45G1', maxGross: 'MAX. GROSS 32 500 KG', tare: 'TARE 3 900 KG' },
  truckDoor: 'SILLAGE',
  planeRoof: 'SILLAGE',
  genericTypes: ['22G1', '42G1', '45G1', '22R1'],
};
