// Poses of the products for the carousel and for the scroll story (p in [0, 1]).
// A pose is { fx, fy, z, s, rz, rx, ry }: screen position (-1..1 of the half frame, measured
// on the plane at height z), height above the table (cm), scale, and the rotations applied as
// Euler 'ZXY' (spin ry about the product's own axis first, then the tilt rx, then the in-plane
// angle rz).
import { monotone, smooth, smoother, clamp } from './util.js';

export const N_PRODUCTS = 3;
export const HERO_SCALE = 1.16;

// slot of product i on the carousel track for a continuous position pos, in [-1.5, 1.5)
export function slotOf(i, pos) {
  let s = i - pos;
  s = ((((s + 1.5) % N_PRODUCTS) + N_PRODUCTS) % N_PRODUCTS) - 1.5;
  return s;
}

export function newPose() {
  return { fx: 0, fy: 0, z: 0, s: 1, rz: 0, rx: 0, ry: 0 };
}

// carousel: a straight diagonal track rising to the right, neighbours cut by the frame edges;
// a move is a slide plus a full spin about the product's axis and a small lift and tumble
export function carouselPose(kind, s, time, out) {
  const f = s - Math.round(s);
  const mid = Math.sin(Math.PI * Math.abs(f)); // 0 at rest, 1 half way
  // the right neighbour peeks in at the top right, the left one waits just out of frame
  out.fx = -0.07 + (s > 0 ? 1.0 : 1.45) * s;
  out.fy = -0.03 + (s > 0 ? 0.6 : 0.8) * s;
  out.z = 3.6 + 1.3 * mid;
  out.s = HERO_SCALE;
  if (kind === 'bottle') {
    out.rz = 0.63 + 0.28 * s;
    out.rx = -0.16 * mid;
    out.ry = Math.PI * 2 * s + 0.3 * Math.sin(time * 0.55);
    out.rz += 0.025 * Math.sin(time * 0.37);
    out.z += 0.12 * Math.sin(time * 0.8);
  } else {
    // the tin shows its printed lid, tilted toward the bottom right so its side reads
    out.rz = 0.42 + 0.3 * s;
    out.rx = 0.98 - 0.1 * mid + 0.04 * Math.sin(time * 0.6);
    // a full turn per slot, like the bottles: the peeking neighbour shows its lid right way up
    out.ry = 2 * Math.PI * s - 0.5 + 0.22 * Math.sin(time * 0.33);
    out.z += 0.6 - 0.8 * mid + 0.12 * Math.sin(time * 0.8 + 1);
    out.s = HERO_SCALE * 1.22;
  }
  return out;
}

const TAU = Math.PI * 2;
const K = (pairs) => monotone(pairs);
// story of the featured bottle (after the carousel came back to it)
const H = HERO_SCALE;
const STORY = {
  fx: K([[0, -0.07], [0.2, -0.05], [0.3, -0.01], [0.42, 0.03], [0.5, 0.05], [0.62, 0.07], [0.7, 0.09], [0.78, 0.09], [0.8, 0.09], [0.9, 0.07], [1, 0.06]]),
  fy: K([[0, -0.03], [0.2, 0.0], [0.3, 0.055], [0.42, 0.075], [0.5, 0.07], [0.62, 0.07], [0.7, 0.05], [0.78, 0.0], [0.8, 0.0], [0.88, -0.42], [0.93, -0.56], [1, -0.6]]),
  // the lift starts with the very first scroll (no dead zone at the top of the page)
  z: K([[0, 3.6], [0.08, 5.4], [0.2, 7.2], [0.3, 9.6], [0.42, 12.5], [0.5, 13.2], [0.62, 14], [1, 14]]),
  s: K([[0, H], [0.2, H], [0.3, 1.16], [0.42, 1.12], [0.5, 1.1], [0.62, 1.1], [0.7, 1.02], [0.8, 0.9], [0.9, 0.94], [1, 0.98]]),
  rz: K([[0, 0.63], [0.2, 0.67], [0.3, 0.73], [0.42, 0.78], [0.5, 0.8], [0.62, 0.74], [0.7, 0.42], [0.78, 0.0], [0.9, 0.0], [1, -0.1]]),
  rx: K([[0, 0], [0.1, -0.1], [0.2, -0.12], [0.3, -0.16], [0.42, -0.36], [0.5, -0.56], [0.62, -0.9], [0.7, -0.6], [0.78, -0.08], [0.9, -0.05], [1, -0.04]]),
  // the turn starts at once; the back of the label (fine print) still shows at p = 0.3
  ry: K([[0, 0], [0.1, 0.9], [0.2, 2.0], [0.3, Math.PI], [0.42, TAU], [0.5, TAU + 0.2], [0.62, TAU + 0.5], [0.7, TAU + 0.3], [0.78, TAU], [0.9, TAU], [1, TAU + 0.12]]),
};

export function storyPose(p, time, out) {
  for (const k of Object.keys(STORY)) out[k] = STORY[k](p);
  // the idle sway of the hero dies out as the story starts
  const idle = 1 - smooth(0.05, 0.3, p);
  out.ry += 0.3 * Math.sin(time * 0.55) * idle;
  out.rz += 0.025 * Math.sin(time * 0.37) * idle;
  out.z += 0.12 * Math.sin(time * 0.8) * idle;
  // a slow breath once large (keeps the frame alive while reading)
  const live = smooth(0.45, 0.6, p) * (1 - smooth(0.74, 0.8, p));
  out.ry += 0.06 * Math.sin(time * 0.6) * live;
  return out;
}

// cap, splash, light band and fades for the last chapter
export function finale(p) {
  const unscrew = smoother(0.79, 0.9, p);
  const rise = smoother(0.81, 0.93, p);
  const tilt = smooth(0.84, 0.96, p);
  return {
    capSpin: TAU * 1.1 * unscrew,
    capRise: 0.09 * unscrew + 3.6 * rise,
    capTiltX: 0.16 * tilt,
    capTiltZ: -0.34 * tilt,
    grow: smoother(0.83, 0.975, p),
    flight: smooth(0.86, 1.0, p),
    band: smoother(0.79, 1.0, p),
    bandA: smooth(0.79, 0.86, p),
  };
}

// how far the non-featured products are pushed out of the frame by the story
export function exitAmount(p) {
  return smoother(0.02, 0.26, p);
}

export function fades(p) {
  return {
    white: smooth(0.36, 0.5, p), // table and words fade to the white stage
    // parallax of the words (grow and drift): moving from the very first pixel of scroll
    words: 1 - (1 - clamp(p / 0.5)) ** 2,
    heroUI: 1 - smooth(0.08, 0.22, p),
    tilt: 1 - smooth(0.3, 0.52, p),
  };
}

export { clamp };
