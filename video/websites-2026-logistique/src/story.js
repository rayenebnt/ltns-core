// SILLAGE: the single source of truth for the scroll story, shared by the shell (text beats, nav,
// progress rail, keys, tour) and the world (choreography, camera). The shell maps the page scroll
// to p (0..1, smoothed); the world derives every motion from p (and time for idle motion only), so
// one p always gives the same frame. Values are starting points: the integrator tunes them HERE,
// never in a copy.

// how tall the pinned story is, in screen heights of scrolling (p 0 → STORY_END); the final white
// section (« Arrivée ») follows
export const SCREENS = 14;

// chapters (nav links, progress rail, header colour)
export const CHAPTERS = [
  { id: 'port', num: '01', label: 'PORT', from: 0.0, to: 0.22 },
  { id: 'route', num: '02', label: 'ROUTE', from: 0.22, to: 0.45 },
  { id: 'mer', num: '03', label: 'MER', from: 0.45, to: 0.74 },
  { id: 'air', num: '04', label: 'AIR', from: 0.74, to: 0.9 },
  { id: 'arrivee', num: '', label: 'ARRIVÉE', from: 0.9, to: 1.0 },
];

// the end of the pinned 3D story: from here the white « Arrivée » section slides up over the canvas
export const STORY_END = 0.9;

// 3D choreography windows, in p (a phase runs from its first to its second value)
export const PHASES = {
  heroHold: [0.0, 0.035], // side view, white void: the cavalier over the stack, spreader locked on the orange container
  lift: [0.035, 0.075], // the cavalier hoists the container
  carry: [0.075, 0.12], // it drives over the waiting trailer
  lower: [0.12, 0.15], // lowers the container onto the trailer, twistlocks lock, the spreader rises
  truckGo: [0.15, 0.27], // the truck pulls away (right), the cavalier backs off (left)
  crane: [0.17, 0.27], // camera: side view → straight top-down view, following the truck
  road: [0.27, 0.43], // top view: the truck takes the exit curve, then drives south on the road
  coast: [0.41, 0.51], // the truck reaches the berth on the quay apron; the camera glides south to the ship
  ship: [0.51, 0.62], // top view, close over the container ship sailing south (down the screen)
  rise: [0.62, 0.74], // the camera rises: the ship gets smaller, the five services appear around it
  clouds: [0.72, 0.8], // up through the cloud layer
  plane: [0.78, 0.9], // the cargo plane crosses above the clouds, contrails behind it
  whiteout: [0.855, 0.895], // the clouds thicken to white (pure paper by 0.895); the « Arrivée » section slides up
};

// DOM text beats: [starts fading in, fully in, starts fading out, fully out], in p
export const BEATS = [
  { id: 'hero', win: [0.0, 0.0, 0.03, 0.055] },
  { id: 'port', win: [0.07, 0.09, 0.18, 0.2] },
  { id: 'route', win: [0.33, 0.35, 0.415, 0.44] },
  { id: 'mer', win: [0.515, 0.535, 0.595, 0.62] },
  { id: 'services', win: [0.63, 0.66, 0.72, 0.75] },
  { id: 'air', win: [0.815, 0.835, 0.875, 0.895] },
  { id: 'arrivee', win: [0.9, 0.94, 1.0, 1.0] },
];

// header and UI colour: 'dark' text on the light port, road and final section; 'light' text over
// the sea and the sky
export const TONE = [
  { from: 0.0, to: 0.478, tone: 'dark' },
  { from: 0.478, to: 0.872, tone: 'light' },
  { from: 0.872, to: 1.0, tone: 'dark' },
];

// where ↓ / ↑ / Espace stop, and the holds of the hands-free tour (P): p values where the story reads best
export const STOPS = [0.0, 0.185, 0.225, 0.37, 0.555, 0.69, 0.845, 1.0];

// clamp-free helpers shared by both sides
export const chapterAt = (p) => CHAPTERS.find((c) => p >= c.from && p < c.to) || CHAPTERS[CHAPTERS.length - 1];
// 0..1 progress inside a [from, to] window (clamped)
export const within = (p, [a, b]) => (b <= a ? (p >= b ? 1 : 0) : Math.min(1, Math.max(0, (p - a) / (b - a))));
