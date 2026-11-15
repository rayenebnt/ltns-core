// ORVAN: the single source of truth for the scroll story, shared by the shell (the panel, nav,
// progress rail, keys, tour) and the world (five dioramas, the white fades between them, the cameras).
// The shell maps the page scroll to p (0..1, smoothed); the world derives every camera move from p,
// and the traffic (trucks, forklifts, trains, a plane) from time.

export const SCREENS = 13;

export const CHAPTERS = [
  { id: 'route', num: '01', label: 'La route', from: 0.0, to: 0.18 },
  { id: 'entrepot', num: '02', label: 'L’entrepôt', from: 0.18, to: 0.36 },
  { id: 'distribution', num: '03', label: 'La distribution', from: 0.36, to: 0.54 },
  { id: 'mer', num: '04', label: 'L’air et la mer', from: 0.54, to: 0.72 },
  { id: 'rail', num: '05', label: 'Le rail', from: 0.72, to: 0.9 },
  { id: 'demande', num: '', label: 'Demande de fret', from: 0.9, to: 1.0 },
];

export const STORY_END = 0.9;

// the dioramas, one after the other; a white fade hides each change
export const SETS = [
  { id: 'hub', range: [0.0, 0.18] }, // the depot: the hall, its docks, the trucks
  { id: 'entrepot', range: [0.18, 0.36] }, // the hall cut open: racks, boxes, forklifts
  { id: 'campagne', range: [0.36, 0.54] }, // green hills, a winding road, trucks on it
  { id: 'port', range: [0.54, 0.72] }, // the port and the airport: ship, cranes, planes
  { id: 'rail', range: [0.72, 0.9] }, // the rail terminal: gantries, trains, stacks
];
export const FADES = [0.18, 0.36, 0.54, 0.72].map((at) => ({ at, w: 0.02 }));

// DOM text beats: [starts fading in, fully in, starts fading out, fully out], in p (the panel stays)
export const BEATS = [
  { id: 'hero', win: [0.0, 0.0, 1.0, 1.0] },
  { id: 'rendezvous', win: [0.9, 0.93, 1.0, 1.0] },
];
// for the tour: the two moments it lingers on
export const PHASES = { hub: [0.0, 0.18], port: [0.54, 0.72] };

export const TONE = [{ from: 0.0, to: 1.0, tone: 'dark' }];

export const STOPS = [0.0, 0.1, 0.27, 0.45, 0.63, 0.81, 1.0];

export const chapterAt = (p) => CHAPTERS.find((c) => p >= c.from && p < c.to) || CHAPTERS[CHAPTERS.length - 1];
export const within = (p, [a, b]) => (b <= a ? (p >= b ? 1 : 0) : Math.min(1, Math.max(0, (p - a) / (b - a))));
