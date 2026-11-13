// ALTIÈRE: the single source of truth for the scroll story, shared by the shell (text beats, nav,
// progress rail, keys, tour) and the world (camera, clouds, construction, highlight, plan). The shell
// maps the page scroll to p (0..1, smoothed); the world derives every motion from p (and time for idle
// motion only: the clouds' drift, the sea, the yachts), so one p and one time give the same frame.

// how tall the pinned story is, in screen heights of scrolling (p 0 → STORY_END); the final white
// section (« Rendez-vous ») follows
export const SCREENS = 13;

// chapters (nav links, progress rail, header tone)
export const CHAPTERS = [
  { id: 'ciel', num: '01', label: 'Le ciel', from: 0.0, to: 0.2 },
  { id: 'baie', num: '02', label: 'La baie', from: 0.2, to: 0.345 },
  { id: 'chantier', num: '03', label: 'Le chantier', from: 0.345, to: 0.55 },
  { id: 'tour', num: '04', label: 'La tour', from: 0.55, to: 0.74 },
  { id: 'plans', num: '05', label: 'Les plans', from: 0.74, to: 0.88 },
  { id: 'rendezvous', num: '', label: 'Rendez-vous', from: 0.88, to: 1.0 },
];

// the end of the pinned 3D story: from here the white « Rendez-vous » section slides up over the canvas
export const STORY_END = 0.88;

// 3D choreography windows, in p
export const PHASES = {
  heroHold: [0.0, 0.03], // above the cloud deck at golden hour, the sun low on the horizon
  descent: [0.03, 0.2], // the camera dives through the deck (white-out inside) and comes out over the bay
  aerial: [0.2, 0.345], // a long glide down over the cape, the marina and the empty plot with its crane
  build: [0.36, 0.53], // the tower rises: the core leads, the slabs follow floor by floor, the glass after
  reveal: [0.55, 0.64], // the finished tower against the sunset, from the marina
  explore: [0.64, 0.74], // close to the south face: floor 7 lights up (the band, its windows)
  plan: [0.74, 0.8], // the camera spirals up over the tower, cut above floor 7, and looks straight down
  planHold: [0.8, 0.88], // the floor plan of level 07 (DOM, aligned on the floor plate by anchors().plan)
};
export const PLAN_FLOOR = 7;

// DOM text beats: [starts fading in, fully in, starts fading out, fully out], in p
export const BEATS = [
  { id: 'hero', win: [0.0, 0.0, 0.012, 0.035] },
  { id: 'ciel', win: [0.175, 0.195, 0.228, 0.248] }, // as the bay opens under the clouds
  { id: 'baie', win: [0.255, 0.275, 0.325, 0.345] },
  { id: 'chantier', win: [0.37, 0.39, 0.51, 0.535] }, // with the floor counter
  { id: 'tour', win: [0.565, 0.585, 0.625, 0.645] },
  { id: 'explorer', win: [0.655, 0.675, 0.725, 0.745] },
  { id: 'plan', win: [0.785, 0.805, 1.0, 1.0] }, // the plan, its list and legend (stay until the white section)
  { id: 'rendezvous', win: [0.88, 0.92, 1.0, 1.0] },
];

// header and UI colour: 'dark' text on the bright clouds and the final section; 'light' text over the
// bay at golden hour, the tower and the plan
export const TONE = [
  { from: 0.0, to: 0.16, tone: 'dark' },
  { from: 0.16, to: 0.88, tone: 'light' },
  { from: 0.88, to: 1.0, tone: 'dark' }, // (the shell keeps it light until the white section reaches the header)
];

// where ↓ / ↑ / Espace stop, and the holds of the hands-free tour (P)
export const STOPS = [0.0, 0.205, 0.3, 0.45, 0.6, 0.7, 0.84, 1.0];

// helpers shared by both sides
export const chapterAt = (p) => CHAPTERS.find((c) => p >= c.from && p < c.to) || CHAPTERS[CHAPTERS.length - 1];
// 0..1 progress inside a [from, to] window (clamped)
export const within = (p, [a, b]) => (b <= a ? (p >= b ? 1 : 0) : Math.min(1, Math.max(0, (p - a) / (b - a))));
