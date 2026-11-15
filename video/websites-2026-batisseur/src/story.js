// PINÈDE: the single source of truth for the scroll story, shared by the shell (the first sections,
// the caption, the rail, keys, tour) and the world (the cameras, the plan on the island).
// The page opens on classic sections (they scroll away like any page: their height is measured, see
// main.js); behind them waits the house, pinned: the living room, the kitchen, the island where a
// plan unrolls under a camera looking straight down, then back to the living room. Then the
// « Votre projet » section rises.

// p of the end of the first sections (their scroll is page-like; the 3D starts here)
export const INTRO_P = 0.16;
// window heights of scroll for the 3D part (p INTRO_P -> STORY_END)
export const SCREENS = 11;
export const STORY_END = 0.9;

export const CHAPTERS = [
  { id: 'metiers', num: '01', label: 'Nos métiers', from: 0.0, to: INTRO_P },
  { id: 'sejour', num: '02', label: 'Le séjour', from: INTRO_P, to: 0.3 },
  { id: 'cuisine', num: '03', label: 'La cuisine', from: 0.3, to: 0.46 },
  { id: 'plan', num: '04', label: 'Le plan', from: 0.46, to: 0.71 },
  { id: 'maison', num: '05', label: 'La maison', from: 0.71, to: STORY_END },
  { id: 'projet', num: '06', label: 'Votre projet', from: STORY_END, to: 1.0 },
];

// the camera: [p, camera x, y, z, target x, y, z, vertical fov] (metres; the room is x -8..10,
// z -7..7; the island's top at y 0.92 around (-2.4, -3.6); main.js keeps the horizontal field on
// narrow windows). Monotone splines per column: no overshoot between two keys.
const LIVING = [1.7, 1.6, 3.6, 2.0, 0.98, -7.0, 56];
const LIVING_IN = [1.3, 1.58, 2.4, 0.9, 0.98, -7.0, 54];
const TURN = [1.0, 1.58, 0.2, -4.6, 1.0, -4.8, 52];
const KITCHEN = [1.15, 1.56, -2.72, -8.0, 0.98, -4.05, 52];
const ISLAND = [0.75, 2.02, -3.3, -2.7, 0.9, -3.66, 48];
const ABOVE = [-2.05, 2.26, -3.52, -2.4, 0.92, -3.6, 42];
const TOP = [-2.4, 2.28, -3.6, -2.4, 0.92, -3.601, 40];
export const KEYS = [
  [0.0, 2.0, 1.68, 4.6, 2.3, 1.0, -7.0, 57],
  [0.1, 2.0, 1.68, 4.6, 2.3, 1.0, -7.0, 57],
  [INTRO_P, ...LIVING],
  [0.215, ...LIVING_IN],
  [0.27, ...TURN],
  [0.32, ...KITCHEN],
  [0.355, 0.95, 1.6, -2.85, -8.0, 0.97, -4.05, 51],
  [0.425, ...ISLAND],
  [0.47, ...ABOVE],
  [0.5, ...TOP],
  [0.645, ...TOP],
  [0.675, ...ABOVE],
  [0.705, ...ISLAND],
  [0.75, ...KITCHEN],
  [0.795, ...TURN],
  [0.845, ...LIVING_IN],
  [STORY_END, ...LIVING],
  [1.0, ...LIVING],
];

// the plan: it unrolls under the camera looking down, stays, then rolls back up as the camera leaves
export const PHASES = { intro: [0, INTRO_P], unroll: [0.5, 0.585], reroll: [0.645, 0.705] };

// DOM text beats: [starts fading in, fully in, starts fading out, fully out], in p
export const BEATS = [
  { id: 'caption', win: [INTRO_P - 0.03, INTRO_P, 0.885, 0.9] },
  { id: 'projet', win: [0.9, 0.93, 1.0, 1.0] },
];

// ↓ / ↑, the rail and the tour: the top, the services, the living room, the kitchen, the island, the
// plan (unrolled), the kitchen again, the living room again, the final section
export const STOPS = [0.0, 0.085, INTRO_P, 0.33, 0.425, 0.615, 0.75, 0.86, 1.0];

export const chapterAt = (p) => CHAPTERS.find((c) => p >= c.from && p < c.to) || CHAPTERS[CHAPTERS.length - 1];
export const within = (p, [a, b]) => (b <= a ? (p >= b ? 1 : 0) : Math.min(1, Math.max(0, (p - a) / (b - a))));
// how much of the plan lies unrolled at p
export const planAt = (p) => within(p, PHASES.unroll) * (1 - within(p, PHASES.reroll));
