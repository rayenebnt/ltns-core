// BRAISE: the single source of truth for the scroll story, shared by the shell (text beats, nav,
// progress rail, keys, tour) and the world (camera, the burger's layers, the box, the lineup). The shell
// maps the page scroll to p (0..1, smoothed); the world derives every motion from p (and time for idle
// motion only: the turntable's breath, the lineup's sway).

// how tall the pinned story is, in screen heights of scrolling (p 0 → STORY_END)
export const SCREENS = 12;

// chapters (nav links, progress rail)
export const CHAPTERS = [
  { id: 'burger', num: '01', label: 'Le burger', from: 0.0, to: 0.3 },
  { id: 'ici', num: '02', label: 'Fait ici', from: 0.3, to: 0.46 },
  { id: 'menu', num: '03', label: 'Le menu', from: 0.46, to: 0.615 },
  { id: 'emporter', num: '04', label: 'À emporter', from: 0.615, to: 0.73 },
  { id: 'carte', num: '05', label: 'La carte', from: 0.73, to: 0.88 },
  { id: 'rendezvous', num: '', label: 'Commander', from: 0.88, to: 1.0 },
];

// the end of the pinned 3D story: from here the white « Commander » section slides up over the canvas
export const STORY_END = 0.88;

// 3D choreography windows, in p
export const PHASES = {
  heroHold: [0.0, 0.04], // the burger on the warm studio cove, turning slowly
  explode: [0.04, 0.2], // it rises apart into its layers, top first (the labels come in)
  stackHold: [0.2, 0.28], // the stack, labelled
  assemble: [0.28, 0.36], // back together, the camera swings round
  why: [0.36, 0.46], // « Tout est fait ici. »
  combo: [0.46, 0.61], // the box slides in, the burger drops into it, the shake joins
  close: [0.625, 0.69], // the lid closes on the logo
  lineup: [0.72, 0.8], // the camera travels to the menu lineup
  menuHold: [0.8, 0.88],
};

// DOM text beats: [starts fading in, fully in, starts fading out, fully out], in p
export const BEATS = [
  { id: 'hero', win: [0.0, 0.0, 0.012, 0.035] },
  { id: 'stack', win: [0.13, 0.155, 0.255, 0.28] },
  { id: 'labels', win: [0.1, 0.15, 0.26, 0.29] }, // the layers' labels (DOM, from world.anchors())
  { id: 'why', win: [0.37, 0.39, 0.44, 0.46] },
  { id: 'combo', win: [0.5, 0.52, 0.585, 0.605] },
  { id: 'close', win: [0.655, 0.675, 0.71, 0.73] },
  { id: 'carte', win: [0.79, 0.81, 1.0, 1.0] },
  { id: 'rendezvous', win: [0.88, 0.92, 1.0, 1.0] },
];

// header and UI colour: dark text on the warm studio throughout (the shell's light tone is unused)
export const TONE = [
  { from: 0.0, to: 0.5, tone: 'dark' },
  { from: 0.5, to: 0.88, tone: 'dark' },
  { from: 0.88, to: 1.0, tone: 'dark' },
];

// where ↓ / ↑ / Espace stop, and the holds of the hands-free tour (P)
export const STOPS = [0.0, 0.2, 0.4, 0.555, 0.7, 0.84, 1.0];

export const chapterAt = (p) => CHAPTERS.find((c) => p >= c.from && p < c.to) || CHAPTERS[CHAPTERS.length - 1];
export const within = (p, [a, b]) => (b <= a ? (p >= b ? 1 : 0) : Math.min(1, Math.max(0, (p - a) / (b - a))));
