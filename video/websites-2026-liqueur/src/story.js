// SIBYLLE: the single source of truth for the scroll story, shared by the shell (text beats, nav,
// progress rail, keys, tour) and the world (the seven sets, the cuts between them, the camera).
// The shell maps the page scroll to p (0..1, smoothed); the world derives every motion from p, the
// held press and the chosen bottle (interact.js), and time for idle motion only.

export const SCREENS = 14;

export const CHAPTERS = [
  { id: 'obole', num: '01', label: 'L’obole', from: 0.0, to: 0.15 },
  { id: 'oracle', num: '02', label: 'L’oracle', from: 0.15, to: 0.3 },
  { id: 'fioles', num: '03', label: 'Les fioles', from: 0.3, to: 0.56 },
  { id: 'rituel', num: '04', label: 'Le rituel', from: 0.56, to: 0.7 },
  { id: 'vision', num: '05', label: 'La vision', from: 0.7, to: 0.9 },
  { id: 'degustation', num: '', label: 'Dégustation', from: 0.9, to: 1.0 },
];

export const STORY_END = 0.9;

// the 3D sets, one after the other; a cut (ink.js cutLayer) hides each change of set
export const SETS = [
  { id: 'comptoir', range: [0.0, 0.15] }, // the hand takes the coin on the red counter; the red spills
  { id: 'oculus', range: [0.15, 0.3] }, // the sibyl's silhouette before the red moon, in the round window
  { id: 'temple', range: [0.3, 0.42] }, // the red hall of columns; a robed figure walks to the altar
  { id: 'fioles', range: [0.42, 0.56] }, // the three bottles on the marble ledge: choose one
  { id: 'verser', range: [0.56, 0.7] }, // the hand pours the chosen bottle into the glass
  { id: 'vision', range: [0.7, 0.8] }, // the columns break and fall through the red
  { id: 'fronton', range: [0.8, 0.9] }, // the temple front, the figure in the chosen colour, the name
];
// [p of the cut, type (0 strokes, 1 flood, 2 bands, 3 burst), half width in p, colour 1, colour 2]
export const CUTS = [
  { at: 0.15, type: 1, w: 0.016, c1: 'wine', c2: 'paper' },
  { at: 0.3, type: 0, w: 0.016, c1: 'ink', c2: 'paper' },
  { at: 0.42, type: 2, w: 0.013, c1: 'paper', c2: 'paper' },
  { at: 0.56, type: 0, w: 0.013, c1: 'red', c2: 'ink' },
  { at: 0.7, type: 3, w: 0.016, c1: 'paper', c2: 'ink' },
  { at: 0.8, type: 2, w: 0.013, c1: 'paper', c2: 'paper' },
];

// 3D choreography windows, in p
export const PHASES = {
  grab: [0.0, 0.12], // the reach, the pinch, the coin lifted, the spill
  walk: [0.3, 0.42],
  pour: [0.575, 0.68], // the tilt, the stream, the glass filling
  fall: [0.7, 0.8],
};

// DOM text beats: [starts fading in, fully in, starts fading out, fully out], in p
export const BEATS = [
  { id: 'hero', win: [0.0, 0.0, 0.02, 0.045] },
  { id: 'oracle', win: [0.185, 0.2, 0.258, 0.272] },
  { id: 'temple', win: [0.325, 0.34, 0.39, 0.405] },
  { id: 'fioles', win: [0.44, 0.455, 0.54, 0.552] },
  { id: 'verser', win: [0.572, 0.585, 0.68, 0.692] },
  { id: 'vision', win: [0.718, 0.732, 0.785, 0.796] },
  { id: 'fronton', win: [0.815, 0.835, 1.0, 1.0] },
  { id: 'rendezvous', win: [0.9, 0.93, 1.0, 1.0] },
];

// header tone: light text on the red and the dark, dark on the paper and the final section
export const TONE = [
  { from: 0.0, to: 0.15, tone: 'light' },
  { from: 0.15, to: 0.3, tone: 'dark' },
  { from: 0.3, to: 0.42, tone: 'light' },
  { from: 0.42, to: 0.56, tone: 'dark' },
  { from: 0.56, to: 0.9, tone: 'light' },
  { from: 0.9, to: 1.0, tone: 'dark' },
];

export const STOPS = [0.0, 0.11, 0.23, 0.37, 0.49, 0.665, 0.76, 0.86, 1.0];

export const chapterAt = (p) => CHAPTERS.find((c) => p >= c.from && p < c.to) || CHAPTERS[CHAPTERS.length - 1];
export const within = (p, [a, b]) => (b <= a ? (p >= b ? 1 : 0) : Math.min(1, Math.max(0, (p - a) / (b - a))));
