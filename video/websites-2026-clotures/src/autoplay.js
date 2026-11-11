// Keyed, hands-free moves. Keys are [time s, position name, value] (see layout.posOf); they are
// turned into page px for the current screen, so a resize mid-tour keeps the same choreography.
import { posOf } from './layout.js';
import { clamp } from './util.js';

// The whole tour (P or ?auto=1), about 22 s: a 1 s hold on the hero, chapter 1, the white
// section, the chapter 2 window (a short hold on the card, then it opens), four type changes
// about 0.9 s apart, a pause on the estimator, chapter 4 with a pause on « Puis le portillon »,
// and an end hold on the repaired gate.
export const TOUR = [
  [0.0, 'install', 0],
  [1.0, 'install', 0],
  [2.2, 'install', 0.25],
  [3.3, 'install', 0.465],
  [4.4, 'install', 0.67],
  [5.8, 'install', 1],
  [6.1, 'install', 1],
  [7.0, 'white', 1],
  [7.4, 'white', 1],
  [8.4, 'intro2', 0],
  [8.9, 'intro2', 0.03],
  [9.8, 'styles', 0],
  // four changes 0.9 s apart: the scroll crosses each hold quickly and each sweep slowly
  // ('styles-s' = styles pin progress; step i spans [i/5, (i+1)/5], its sweep the first 30 %)
  [10.1, 'styles-s', 0.2],
  [10.65, 'styles-s', 0.266],
  [11.0, 'styles-s', 0.4],
  [11.55, 'styles-s', 0.466],
  [11.9, 'styles-s', 0.6],
  [12.45, 'styles-s', 0.666],
  [12.8, 'styles-s', 0.8],
  [13.35, 'styles-s', 0.866],
  [13.8, 'styles', 4],
  [14.7, 'pricing', 1],
  [15.3, 'pricing', 1],
  [16.2, 'intro4', 1],
  [16.9, 'repair', 0],
  [18.1, 'repair', 0.4],
  [19.0, 'repair', 0.585],
  [19.6, 'repair', 0.62],
  [20.9, 'repair', 1],
  [21.9, 'repair', 1],
];

// « ▶ REGARDER LA POSE »: chapter 1 only, with a short breath on each beat
export const INSTALL_PLAY = [
  [1.4, 'install', 0.25],
  [1.9, 'install', 0.27],
  [3.1, 'install', 0.46],
  [3.6, 'install', 0.48],
  [4.8, 'install', 0.665],
  [5.3, 'install', 0.69],
  [7.1, 'install', 1],
];

// « ▶ VOIR LA RÉPARATION »: chapter 4 only
export const REPAIR_PLAY = [
  [1.7, 'repair', 0.4],
  [2.2, 'repair', 0.42],
  [3.5, 'repair', 0.6],
  [4.0, 'repair', 0.62],
  [5.9, 'repair', 1],
];

const toPx = (L, keys) => keys.map(([t, name, v]) => [t, posOf(L, name, v)]);

// the tour, with a glide back to the top first when the page is elsewhere (no hard cut)
export function tourKeys(L, fromY) {
  const keys = toPx(L, TOUR);
  if (fromY < 2) return keys;
  const pre = clamp(0.8 + (0.09 * fromY) / L.V, 0.8, 2.6);
  return [[0, fromY], ...keys.map(([t, y]) => [t + pre, y])];
}

// a chapter play from where the page is: keys already passed are dropped
export function chapterKeys(L, keys, fromY) {
  const px = toPx(L, keys).filter(([, y]) => y > fromY + 2);
  if (!px.length) return null;
  return [[0, fromY], ...px];
}
