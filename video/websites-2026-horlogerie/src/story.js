// BALANCIER: the single source of truth for the scroll story, shared by the shell (text beats, nav,
// progress rail, keys, tour) and the world (choreography, camera, studio). The shell maps the page
// scroll to p (0..1, smoothed); the world derives every motion from p (and time for idle motion
// only: the seconds hand, the balance, the rotor, the tide's ripple), so one p and one time always
// give the same frame. Values are starting points: the integrator tunes them HERE, never in a copy.

// how tall the pinned story is, in screen heights of scrolling (p 0 → STORY_END); the final white
// section (« Rendez-vous ») follows
export const SCREENS = 15;

// chapters (nav links, progress rail, header tone)
export const CHAPTERS = [
  { id: 'demontage', num: '01', label: 'Démontage', from: 0.0, to: 0.16 },
  { id: 'remontage', num: '02', label: 'Remontage', from: 0.16, to: 0.4 },
  { id: 'atelier', num: '03', label: 'L’atelier', from: 0.4, to: 0.56 },
  { id: 'transparence', num: '04', label: 'Transparence', from: 0.56, to: 0.78 },
  { id: 'restauration', num: '05', label: 'Restauration', from: 0.78, to: 0.9 },
  { id: 'rendezvous', num: '', label: 'Rendez-vous', from: 0.9, to: 1.0 },
];

// the end of the pinned 3D story: from here the white « Rendez-vous » section slides up over the canvas
export const STORY_END = 0.9;

// 3D choreography windows, in p (a phase runs from its first to its second value)
export const PHASES = {
  // light studio, steel watch
  explodedHold: [0.0, 0.035], // the exploded line across the screen (the watch's own axis), parts gently floating
  assemble: [0.035, 0.15], // the parts slide together along the axis, staggered; the bracelets come in last
  frontHold: [0.15, 0.19], // the assembled watch, three-quarter front view, hands at 10:09:30, seconds running
  turnOver: [0.19, 0.27], // the watch turns over; the camera comes close to the movement through the sapphire back
  heartHold: [0.27, 0.31], // close on the balance wheel beating (8 vibrations a second) and the rotor
  lieDown: [0.31, 0.38], // the watch turns to lie on its side on its bracelet, the bracelet curving away (side view)
  // the blue tide: a curved wave rises from the bottom of the screen; below its line the background is
  // deep blue and the watch is sapphire (x-ray glass); above it, still the light studio and steel
  tide: [0.38, 0.44],
  // blue, sapphire watch
  atelierHold: [0.44, 0.56], // the sapphire watch floats in the right half, slowly turning; the atelier text at the left
  explodeSapphire: [0.56, 0.65], // the sapphire watch explodes along its axis again: the line across the screen
  glide: [0.65, 0.71], // the camera glides along the glass parts (movement wheels, balance) close up
  reassemble: [0.71, 0.78], // the parts come together; the glass bracelet sweeps past close to the camera
  // back to steel on deep blue (night studio)
  restore: [0.78, 0.82], // the watch turns back into steel (the reverse wipe), dial close-up
  restoreHold: [0.82, 0.865], // steel watch on the blue night studio, slowly turning
  exit: [0.865, 0.9], // the watch rises and the white « Rendez-vous » section slides up over the canvas
};

// DOM text beats: [starts fading in, fully in, starts fading out, fully out], in p
export const BEATS = [
  { id: 'hero', win: [0.0, 0.0, 0.025, 0.05] },
  { id: 'labels', win: [0.0, 0.0, 0.03, 0.055] }, // part labels of the exploded line (DOM, from world.anchors())
  { id: 'remontage', win: [0.075, 0.095, 0.14, 0.16] },
  { id: 'coeur', win: [0.245, 0.265, 0.305, 0.32] },
  { id: 'reglee', win: [0.335, 0.35, 0.375, 0.39] },
  { id: 'atelier', win: [0.435, 0.46, 0.54, 0.56] },
  { id: 'transparence', win: [0.585, 0.605, 0.69, 0.71] },
  { id: 'sapphireLabels', win: [0.6, 0.615, 0.645, 0.66] }, // the part labels again, over the glass line
  { id: 'restauration', win: [0.795, 0.815, 0.855, 0.875] },
  { id: 'rendezvous', win: [0.9, 0.94, 1.0, 1.0] },
];

// header and UI colour: 'dark' text on the light studio and the final section; 'light' text on blue
// (the switch follows the tide's line passing under the header)
export const TONE = [
  { from: 0.0, to: 0.425, tone: 'dark' },
  { from: 0.425, to: 0.879, tone: 'light' },
  { from: 0.879, to: 1.0, tone: 'dark' },
];

// where ↓ / ↑ / Espace stop, and the holds of the hands-free tour (P): p values where the story reads best
export const STOPS = [0.0, 0.17, 0.29, 0.36, 0.5, 0.62, 0.75, 0.84, 1.0];

// clamp-free helpers shared by both sides
export const chapterAt = (p) => CHAPTERS.find((c) => p >= c.from && p < c.to) || CHAPTERS[CHAPTERS.length - 1];
// 0..1 progress inside a [from, to] window (clamped)
export const within = (p, [a, b]) => (b <= a ? (p >= b ? 1 : 0) : Math.min(1, Math.max(0, (p - a) / (b - a))));
