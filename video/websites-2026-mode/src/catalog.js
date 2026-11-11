// RUELLE (fictional streetwear brand, Marseille): the single source of truth for the products.
// Shared by the shell (captions, titles, hang-tag labels, arrows) and the 3D world (garment type,
// colours, prints). Order = left to right on the rack.
//
// Colours are sRGB hex (convert with THREE.Color().set(hex) and the renderer's colour management).
// body: main fabric; ink: main print colour; extra keys per type (sleeves, trim, rib) where noted.
// Captions read `${name} — ${variant.label}`; the product view title is `title`.

export const BRAND = {
  name: 'Ruelle',
  city: 'Marseille',
  blue: '#2f3dff', // brand accent: logo fill, marquee band
  ink: '#151517',
  paper: '#ececea', // studio wall / page background
};

export const PRODUCTS = [
  {
    id: 'manches-longues',
    type: 'longsleeve', // crew neck, long sleeves hanging down
    name: 'T-shirt manches longues Ruelle',
    title: 'T-SHIRT MANCHES LONGUES RUELLE',
    prints: {
      front: 'small « ruelle » logo on the left chest (Lilita One)',
      sleeve: 'vertical « RUELLE · MARSEILLE » down the left sleeve (Inter Tight 800, letter-spaced)',
      back: '« RUELLE » across the shoulders (Anton)',
    },
    variants: [
      { id: 'blanc', label: 'Blanc', tag: 'BLANC', body: '#eeece6', ink: '#202022' },
      { id: 'noir', label: 'Noir', tag: 'NOIR', body: '#1f1f21', ink: '#eeece6' },
    ],
  },
  {
    id: 'rien-a-prouver',
    type: 'tee', // oversized heavyweight tee, garment-dyed and washed (mottled, faded seams)
    hero: true,
    name: 'T-shirt Rien à prouver',
    title: 'T-SHIRT RIEN À PROUVER',
    prints: {
      front: 'big stacked slogan « RIEN / À / PROUVER » (Anton, tight leading), cracked screen print',
      back: 'small neck print « RUELLE — MARSEILLE » under the collar',
    },
    variants: [
      { id: 'noir', label: 'Noir', tag: 'NOIR', body: '#2a2a2c', ink: '#e9e5dc' },
      // (v2: '#f0a8c4' / '#fff6f8' left the white print at 1.6:1, a pale ghost on a phone; the
      // review's '#e48aae' measured 1.8:1, this one 2.3:1)
      { id: 'rose', label: 'Rose', tag: 'ROSE', body: '#dc7ba4', ink: '#ffffff' },
      { id: 'jaune', label: 'Jaune', tag: 'JAUNE', body: '#f2d018', ink: '#1b1b1c' },
    ],
  },
  {
    id: 'debardeur',
    type: 'tank', // sleeveless, deep armholes, scoop neck, washed
    name: 'Débardeur délavé',
    title: 'DÉBARDEUR DÉLAVÉ',
    prints: {
      front: '« RUELLE » in a wide arch across the chest (Anton), cracked and faded',
      back: 'plain',
    },
    variants: [
      { id: 'anthracite', label: 'Anthracite', tag: 'ANTHRACITE', body: '#4b4b4e', ink: '#dcd8cf' },
      { id: 'sable', label: 'Sable', tag: 'SABLE', body: '#d9cbad', ink: '#3b342b' },
    ],
  },
  {
    id: 'teddy',
    type: 'varsity', // wool body, leather-look sleeves, snap buttons, striped rib collar, cuffs and hem
    name: 'Veste teddy Ruelle',
    title: 'VESTE TEDDY RUELLE',
    prints: {
      front: 'chenille script « Ruelle » on the left chest (Yellowtail), small « R » patch on the right chest',
      back: '« MARSEILLE » in an arch (Anton) over a big chenille script « Ruelle »',
    },
    variants: [
      { id: 'noir-creme', label: 'Noir et crème', tag: 'NOIR / CRÈME', body: '#1d1d1f', sleeves: '#ebe3d1', rib: ['#1d1d1f', '#ebe3d1', '#2f3dff'], ink: '#ebe3d1' },
      { id: 'bleu-creme', label: 'Bleu et crème', tag: 'BLEU / CRÈME', body: '#26349f', sleeves: '#ebe3d1', rib: ['#26349f', '#ebe3d1', '#1d1d1f'], ink: '#ebe3d1' },
    ],
  },
  {
    id: 'capuche',
    type: 'hoodie', // fleece hoodie: hood behind the neck, kangaroo pocket, drawcords, rib cuffs and hem
    name: 'Sweat à capuche Ruelle',
    title: 'SWEAT À CAPUCHE RUELLE',
    prints: {
      front: 'small centred « ruelle » logo (Lilita One), puff print',
      back: 'plain',
    },
    variants: [
      { id: 'bleu', label: 'Bleu électrique', tag: 'BLEU', body: '#2f3dff', ink: '#ffffff' },
      { id: 'gris', label: 'Gris chiné', tag: 'GRIS', body: '#9d9da0', ink: '#1f1f21' },
      { id: 'noir', label: 'Noir', tag: 'NOIR', body: '#1f1f21', ink: '#ffffff' },
    ],
  },
  {
    id: 'hors-saison',
    type: 'tee', // regular tee, soft and slightly sheer
    name: 'T-shirt Hors saison',
    title: 'T-SHIRT HORS SAISON',
    prints: {
      front: 'small two-line chest print « HORS / SAISON » (Inter Tight 800)',
      back: 'big « HORS SAISON » with a simple wave line drawing under it',
    },
    variants: [
      { id: 'bleu-ciel', label: 'Bleu ciel', tag: 'BLEU CIEL', body: '#a3c7e8', ink: '#1d3c78' },
      { id: 'blanc', label: 'Blanc', tag: 'BLANC', body: '#f1efe8', ink: '#1d3c78' },
    ],
  },
  {
    id: 'maillot',
    type: 'jersey', // football-style jersey: V-neck in the trim colour, raglan side panels, mesh-like knit
    name: 'Maillot Ruelle',
    title: 'MAILLOT RUELLE',
    prints: {
      front: '« RUELLE » across the chest (Anton, slight italic), small « 07 » under it',
      back: '« RUELLE » over a big « 07 » (Anton)',
    },
    variants: [
      { id: 'jaune', label: 'Jaune', tag: 'JAUNE', body: '#f3d01e', trim: '#2f3dff', ink: '#2f3dff' },
      { id: 'blanc', label: 'Blanc', tag: 'BLANC', body: '#f3f3ef', trim: '#2f3dff', ink: '#2f3dff' },
    ],
  },
  {
    id: 'logo',
    type: 'tee',
    name: 'T-shirt Logo',
    title: 'T-SHIRT LOGO',
    prints: {
      front: 'small « ruelle » logo on the left chest (Lilita One)',
      back: 'plain',
    },
    variants: [
      { id: 'blanc', label: 'Blanc', tag: 'BLANC', body: '#f4f3ee', ink: '#2f3dff' },
      { id: 'noir', label: 'Noir', tag: 'NOIR', body: '#202022', ink: '#f4f3ee' },
    ],
  },
];

export const HERO = PRODUCTS.findIndex((p) => p.hero);

export const caption = (p, v = 0) => `${p.name} — ${p.variants[v].label}`;
