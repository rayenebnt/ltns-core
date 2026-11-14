// POMONE: the single source of truth for the scroll story, shared by the shell (text beats, nav,
// progress rail, keys, tour) and the world (camera, render modes, the tree's growth, the hoist).
// The shell maps the page scroll to p (0..1, smoothed); the world derives every motion from p (and
// time for idle motion only: the clouds' drift, the pear's slow turn, the leaves' sway).

export const SCREENS = 13;

export const CHAPTERS = [
  { id: 'idee', num: '01', label: 'L’idée', from: 0.0, to: 0.18 },
  { id: 'croissance', num: '02', label: 'La croissance', from: 0.18, to: 0.35 },
  { id: 'toit', num: '03', label: 'Sous un toit', from: 0.35, to: 0.47 },
  { id: 'modele', num: '04', label: 'Le modèle', from: 0.47, to: 0.72 },
  { id: 'questions', num: '05', label: 'Questions', from: 0.72, to: 0.88 },
  { id: 'rendezvous', num: '', label: 'Rendez-vous', from: 0.88, to: 1.0 },
];

export const STORY_END = 0.88;

// 3D choreography windows, in p
export const PHASES = {
  heroHold: [0.0, 0.04], // the golden pear on its marble pedestal, in the blue, turning slowly
  stem: [0.04, 0.16], // the camera climbs to the stem and the golden leaf against the sky
  travel: [0.16, 0.2], // to the orchard
  grow: [0.2, 0.33], // the pear tree grows from a sapling, leaves, then golden pears
  halftone: [0.35, 0.47], // back at the pear: it turns into a halftone print
  engraving: [0.48, 0.665], // the sepia engraving: the pear hoisted onto its pedestal, then the plan from above
  hoist: [0.5, 0.58],
  plan: [0.59, 0.66],
  non: [0.665, 0.72], // the blue again: the tree in its urn
  canopy: [0.73, 0.88], // under the tree, looking up: the questions in the sky, framed by branches
};

// DOM text beats: [starts fading in, fully in, starts fading out, fully out], in p
export const BEATS = [
  { id: 'hero', win: [0.0, 0.0, 0.012, 0.035] },
  { id: 'build', win: [0.21, 0.23, 0.26, 0.275] },
  { id: 'rank', win: [0.28, 0.295, 0.33, 0.345] },
  { id: 'roof', win: [0.375, 0.395, 0.45, 0.47] },
  { id: 'model', win: [0.6, 0.62, 0.655, 0.67] },
  { id: 'non', win: [0.675, 0.69, 0.715, 0.73] },
  { id: 'faq', win: [0.765, 0.785, 1.0, 1.0] },
  { id: 'rendezvous', win: [0.88, 0.92, 1.0, 1.0] },
];

// header tone: light text on the blue, dark on the engraving's paper and the final section
export const TONE = [
  { from: 0.0, to: 0.475, tone: 'light' },
  { from: 0.475, to: 0.665, tone: 'dark' },
  { from: 0.665, to: 0.88, tone: 'light' },
  { from: 0.88, to: 1.0, tone: 'dark' },
];

export const STOPS = [0.0, 0.12, 0.25, 0.31, 0.42, 0.56, 0.63, 0.7, 0.82, 1.0];

export const chapterAt = (p) => CHAPTERS.find((c) => p >= c.from && p < c.to) || CHAPTERS[CHAPTERS.length - 1];
export const within = (p, [a, b]) => (b <= a ? (p >= b ? 1 : 0) : Math.min(1, Math.max(0, (p - a) / (b - a))));
