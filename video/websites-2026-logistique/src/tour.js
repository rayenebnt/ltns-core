// The hands-free tour (P, or ?auto=1): the whole journey in about 24 s, from p = 0 to the end of
// the « Arrivée » section, gliding from stop to stop (story.js STOPS) with short holds on the key
// moments. Keys are [time s, p]; main.js turns them into page px for the current window (so a
// resize mid-tour keeps the same choreography) and the scroll spring smooths them once more.
import { STOPS } from './story.js';
import { clamp } from './util.js';

// the hold at each stop (s): hero, lift, crane, road, ship headline, services, plane, board
const HOLDS = [1.0, 0.85, 0.45, 0.8, 1.0, 1.2, 0.9, 2.4];
const MOVE_BASE = 0.6; // s per move
const MOVE_PER_SCREEN = 0.78; // s per screen of scroll

// yOf(p) -> page px; H: the window height
export function tourKeysP(yOf, H) {
  const keys = [];
  let t = 0;
  STOPS.forEach((p, i) => {
    if (i > 0) {
      const screens = Math.abs(yOf(p) - yOf(STOPS[i - 1])) / H;
      t += MOVE_BASE + MOVE_PER_SCREEN * screens;
    }
    keys.push([t, p]);
    t += HOLDS[i] ?? 0.8;
    keys.push([t, p]);
  });
  return keys;
}

// [t, px] keys of the tour; started away from the top, a glide back to p = 0 comes first
export function tourKeys(yOf, H, fromY) {
  const keys = tourKeysP(yOf, H).map(([t, p]) => [t, yOf(p)]);
  if (fromY < 2) return keys;
  const pre = clamp(0.8 + (0.12 * fromY) / H, 0.8, 2.6);
  // (the first hold is shortened: the glide already lands softly)
  return [[0, fromY], [pre, keys[0][1]], ...keys.slice(1).map(([t, y]) => [t + pre - 0.5, y])];
}

export const tourLength = (yOf, H) => {
  const k = tourKeysP(yOf, H);
  return k[k.length - 1][0];
};
