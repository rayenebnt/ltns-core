// The hands-free tour (P, or ?auto=1): the whole story in about 26 s, from p = 0 to the end of
// the « Rendez-vous » section (the ticket on its stamp), gliding from stop to stop (story.js STOPS)
// with short holds on the key moments. Keys are [time s, p]; main.js turns them into page px for the current window (so a
// resize mid-tour keeps the same choreography) and the scroll spring smooths them once more.
import { STOPS, PHASES } from './story.js';
import { clamp } from './util.js';

// the hold at each stop (s): above the clouds, the bay, « Pourquoi ici ? », the works, the tower, floor 7,
// the plan, the ticket (long enough for the six checks and the stamp to land before the tour ends:
// ui.js TICKET_RATE)
const HOLDS = [1.0, 0.9, 1.4, 0.5, 1.2, 1.0, 2.0, 2.4];
const MOVE_BASE = 0.4; // s per move
const MOVE_PER_SCREEN = 0.6; // s per screen of scroll
// tour-only waypoints between two stops (not key stops): [p, hold s]: the white-out in the clouds,
// the tower topped out
const WAYPOINTS = [[0.14, 0.1], [0.53, 0.4]];
// the two signature transitions play slower than the rest: the scroll inside these windows counts
// 1.5× (the assembly and the tide: story.js PHASES)
// (the turn round the crown counts double: the fastest camera move of the story)
const SLOW = [[PHASES.descent, 0.5], [PHASES.build, 0.7], [PHASES.plan, 0.6]];
const slowPart = (a, b) => SLOW.reduce((s, [[u, v], k]) => s + k * Math.max(0, Math.min(b, v) - Math.max(a, u)), 0) / Math.max(1e-9, b - a);

// yOf(p) -> page px; H: the window height
export function tourKeysP(yOf, H) {
  const keys = [];
  let t = 0;
  const seq = STOPS.map((p, i) => [p, HOLDS[i] ?? 0.8]).concat(WAYPOINTS).sort((a, b) => a[0] - b[0]);
  seq.forEach(([p, hold], i) => {
    if (i > 0) {
      const screens = Math.abs(yOf(p) - yOf(seq[i - 1][0])) / H;
      t += MOVE_BASE + MOVE_PER_SCREEN * (1 + slowPart(seq[i - 1][0], p)) * screens;
    }
    keys.push([t, p]);
    t += hold;
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
