// MÉDINA: the single source of truth for the scroll story, shared by the shell (text beats, nav,
// progress rail, keys, tour) and the world (the pours, the bar, the collection, the snap).
// The shell maps the page scroll to p (0..1, smoothed); the world derives every motion from p (and
// time for idle motion only: the drips, the gold dust, the bar's slow turn).

export const SCREENS = 14;

export const CHAPTERS = [
  { id: 'pistache', num: '01', label: 'La pistache', from: 0.0, to: 0.21 },
  { id: 'chocolat', num: '02', label: 'Le chocolat', from: 0.21, to: 0.35 },
  { id: 'tablette', num: '03', label: 'La tablette', from: 0.35, to: 0.5 },
  { id: 'collection', num: '04', label: 'La collection', from: 0.5, to: 0.73 },
  { id: 'craquant', num: '05', label: 'Le craquant', from: 0.73, to: 0.9 },
  { id: 'commande', num: '', label: 'Commander', from: 0.9, to: 1.0 },
];

export const STORY_END = 0.9;

// 3D choreography windows, in p
export const PHASES = {
  pour: [0.0, 0.17], // the bowl tilts, the pistachio cream falls and coils in the mould
  settle: [0.15, 0.21], // the coils settle into a flat layer
  choco: [0.21, 0.34], // the milk chocolate falls and spreads over the pistachio
  lift: [0.35, 0.47], // the bar rises out of the mould, turns to us, gold leaf and dust
  green: [0.47, 0.53], // the teal turns forest green, the mould goes, the bar stands up in the row
  carousel: [0.54, 0.725], // the row of boxes slides: four flavours come to the centre, one after the other
  toSnap: [0.725, 0.77], // the boxes go, the bar flies right and lies down
  snap: [0.78, 0.87], // the bar breaks in two: the green heart
};
// the row's three moves (between them, a flavour rests at the centre)
export const MOVES = [[0.565, 0.59], [0.62, 0.645], [0.675, 0.7]];
// the row's position, in boxes (0: the bar at the centre .. 3)
export const rowAt = (p) => MOVES.reduce((s, [a, b]) => {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)));
  return s + t * t * (3 - 2 * t);
}, 0);

// the flavours that come to the centre of the row, in order (texts.js COLLECTION)
export const CENTRED = 4;

// DOM text beats: [starts fading in, fully in, starts fading out, fully out], in p
export const BEATS = [
  { id: 'hero', win: [0.0, 0.0, 0.025, 0.05] },
  { id: 'pistache', win: [0.09, 0.105, 0.19, 0.205] },
  { id: 'chocolat', win: [0.24, 0.255, 0.33, 0.345] },
  { id: 'tablette', win: [0.39, 0.405, 0.465, 0.48] },
  { id: 'collection', win: [0.535, 0.55, 0.715, 0.73] },
  { id: 'craquant', win: [0.785, 0.8, 1.0, 1.0] },
  { id: 'rendezvous', win: [0.9, 0.93, 1.0, 1.0] },
];

// header tone: light text on the teal and the green, dark on the final section
export const TONE = [
  { from: 0.0, to: 0.9, tone: 'light' },
  { from: 0.9, to: 1.0, tone: 'dark' },
];

export const STOPS = [0.0, 0.12, 0.29, 0.43, 0.553, 0.605, 0.66, 0.84, 1.0];

export const chapterAt = (p) => CHAPTERS.find((c) => p >= c.from && p < c.to) || CHAPTERS[CHAPTERS.length - 1];
export const within = (p, [a, b]) => (b <= a ? (p >= b ? 1 : 0) : Math.min(1, Math.max(0, (p - a) / (b - a))));
