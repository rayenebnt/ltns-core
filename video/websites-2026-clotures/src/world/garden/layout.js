// The shared world contract, in metres (+Y up, the house faces +Z), and the ground height.
//
// heightAt(x, z) is the ground height used by every module. It is exactly 0 within 3 m of
// every fence line and around the house; elsewhere a gentle undulation (never more than
// 0.25 m within 75 m of the garden) gives the lawn some life. Far beyond the garden (the
// Touraine countryside, more than 75 m away) the terrain rolls in long, low hills.
// HEIGHT_GLSL is the same near-field function in GLSL (used by the grass blades).
import { createNoise2D, fbm, smoothstep } from './noise.js';

// new fence, built in chapter 1: A -> B -> C (B is the front-right corner)
export const FENCE_A = [9, -26];
export const FENCE_B = [9, 18];
export const FENCE_C = [-24, 18];
// old weathered fence (repair chapter), along x = -24
export const OLD_FENCE = { x: -24, z0: -26, z1: 18 };
// the maison de maître: centre, width along x, depth along z (facade at z = cz + d / 2)
export const HOUSE = { cx: -4, cz: -38, w: 15, d: 10 };
export const FACADE_Z = HOUSE.cz + HOUSE.d / 2; // -33
// clipped charmille hedge between the lawn and the gravel forecourt, with a gap at the perron
export const HEDGE = { z: -28, t: 0.8, h: 1.05, x0: -24, x1: 10.6, gap0: -6.3, gap1: -1.7 };
export const FORECOURT = { x0: -15.5, x1: 9.2, z0: FACADE_Z, z1: HEDGE.z - HEDGE.t / 2 };
// the drive leaves the forecourt toward the east, behind the end of the new fence
export const DRIVE = { x0: 9.2, x1: 80, z0: -32.4, z1: -29.2 };
// the yard (lawn with mowing stripes) and the mown verge outside the new fence
export const YARD = { x0: -24, x1: 9, z0: HEDGE.z + HEDGE.t / 2, z1: 18 };
export const VERGE = 2.6;
// centre of the radial ground meshes and radius of the near field
export const CENTER = [-7, -12];
export const NEAR_R = 75;

// Big trees modelled in 3D: species, trunk base, height, crown radius (horizontal), seed.
// Behind and beside the house they frame it; the right of the house stays open on the
// countryside (the styles view looks there). N1 is the neighbour's big lime that overhangs
// the old fence (the fence module's fallen branch comes from it).
export const TREES = [
  { id: 'T1', kind: 'lime', x: -18.5, z: -41, h: 21, r: 7.6, seed: 11 },
  { id: 'T3', kind: 'lime', x: -7, z: -56, h: 27, r: 9.6, seed: 12 },
  { id: 'T2', kind: 'oak', x: -30, z: -47, h: 19, r: 9.2, seed: 13 },
  { id: 'T5', kind: 'oak', x: -22, z: -63, h: 20, r: 9.5, seed: 14 },
  { id: 'N1', kind: 'lime', x: -28.5, z: -6, h: 19, r: 8.2, seed: 15, lean: [0.35, 0], extraLobes: [[[0.78, -0.62, 0.05], 0.36], [[0.55, -0.4, -0.35], 0.34]] },
  { id: 'N2', kind: 'oak', x: -37, z: -24, h: 18, r: 8.8, seed: 16 },
  { id: 'N3', kind: 'lime', x: -38, z: 9, h: 20, r: 7.8, seed: 17 },
  { id: 'E1', kind: 'oak', x: 22, z: -5, h: 17, r: 8.4, seed: 18 },
  { id: 'N4', kind: 'oak', x: -36, z: 5.5, h: 17, r: 7.6, seed: 19 },
  { id: 'N5', kind: 'lime', x: -48, z: -21, h: 19, r: 7.4, seed: 20 },
  { id: 'N6', kind: 'lime', x: -30.5, z: -29, h: 24, r: 9.6, seed: 21 },
  // a lime by the lane outside the front fence, behind the chapter 1 and 2 cameras: never in
  // frame, its dappled shade falls across the foreground lawn of the hero, styles and finale
  { id: 'S1', kind: 'lime', x: -8.5, z: 25.5, h: 17, r: 7.4, seed: 23 },
  // a big lime beyond the end of the new fence: frames the hero (and the finale) on the right
  // of the house, as the reference's yard is framed by mature trees on both sides
  { id: 'T6', kind: 'lime', x: 19.5, z: -46, h: 23, r: 8.6, seed: 24 },
];
// the neighbours' tall hedge further back (hides the ground floor of their house)
export const NEIGH_HEDGE = { x: -44, z0: -36, z1: 26, h: 2.7, t: 1.3 };

function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  let t = ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const ex = ax + dx * t - px, ez = az + dz * t - pz;
  return Math.sqrt(ex * ex + ez * ez);
}
function boxDist(px, pz, x0, x1, z0, z1) {
  const dx = Math.max(x0 - px, 0, px - x1), dz = Math.max(z0 - pz, 0, pz - z1);
  return Math.sqrt(dx * dx + dz * dz);
}
// the flat zone: fence lines, and the house with its forecourt and hedge
const FLAT_BOX = [-17, 11.5, -46, HEDGE.z + 0.6];
export function flatDistance(x, z) {
  return Math.min(
    segDist(x, z, FENCE_A[0], FENCE_A[1], FENCE_B[0], FENCE_B[1]),
    segDist(x, z, FENCE_B[0], FENCE_B[1], FENCE_C[0], FENCE_C[1]),
    segDist(x, z, OLD_FENCE.x, OLD_FENCE.z0, OLD_FENCE.x, OLD_FENCE.z1),
    boxDist(x, z, FLAT_BOX[0], FLAT_BOX[1], FLAT_BOX[2], FLAT_BOX[3]),
  );
}

// near-field undulation (|h| <= 0.25): a few long sines, identical in JS and GLSL
function undulation(x, z) {
  const n1 = Math.sin(0.21 * x + 0.13 * z + 1.3) * Math.sin(0.17 * z - 0.11 * x + 0.4);
  const n2 = Math.sin(0.37 * x - 0.29 * z + 2.1);
  const n3 = Math.sin(0.61 * x + 0.53 * z + 0.7);
  return 0.11 * n1 + 0.05 * n2 + 0.02 * n3;
}
function outsideAmp(x, z) {
  // 1 inside the yard, 1.3 in the meadows outside (still <= 0.25 m)
  const o = Math.max(x - 11, -24 - x - 3, z - 20.5, 0);
  return 1 + 0.3 * smoothstep(0, 4, o);
}

const nFar = createNoise2D(4021);
const nFar2 = createNoise2D(4022);
function farHeight(x, z, r) {
  // long rolling hills, a little lower toward the north-east (a valley far away)
  const k1 = smoothstep(NEAR_R, 420, r);
  if (k1 <= 0) return 0;
  const hills = fbm(nFar, x / 900, z / 900, 4) * 9;
  const swell = fbm(nFar2, x / 2600 + 3.1, z / 2600 - 1.7, 3) * 26 * smoothstep(400, 2400, r);
  const rim = 22 * smoothstep(1800, 3800, r); // the wooded horizon rises a little
  return k1 * (hills + 4) + swell + rim;
}

export function heightAt(x, z) {
  const d = flatDistance(x, z);
  const m = smoothstep(3, 9, d);
  let h = m > 0 ? m * undulation(x, z) * outsideAmp(x, z) : 0;
  const r = Math.hypot(x - CENTER[0], z - CENTER[1]);
  if (r > NEAR_R) h += farHeight(x, z, r);
  return h;
}

// --- GLSL twin of the near field (same constants) --------------------------------------
const f = (v) => (Number.isInteger(v) ? v.toFixed(1) : String(v));
export const HEIGHT_GLSL = /* glsl */ `
float g_segDist(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
  return length(a + ab * t - p);
}
float g_boxDist(vec2 p, vec4 b) {
  vec2 d = max(max(vec2(b.x, b.z) - p, vec2(0.0)), p - vec2(b.y, b.w));
  return length(d);
}
float g_flatDistance(vec2 p) {
  float d = g_segDist(p, vec2(${f(FENCE_A[0])}, ${f(FENCE_A[1])}), vec2(${f(FENCE_B[0])}, ${f(FENCE_B[1])}));
  d = min(d, g_segDist(p, vec2(${f(FENCE_B[0])}, ${f(FENCE_B[1])}), vec2(${f(FENCE_C[0])}, ${f(FENCE_C[1])})));
  d = min(d, g_segDist(p, vec2(${f(OLD_FENCE.x)}, ${f(OLD_FENCE.z0)}), vec2(${f(OLD_FENCE.x)}, ${f(OLD_FENCE.z1)})));
  d = min(d, g_boxDist(p, vec4(${FLAT_BOX.map(f).join(', ')})));
  return d;
}
float g_heightAt(vec2 p) {
  float m = smoothstep(3.0, 9.0, g_flatDistance(p));
  float x = p.x, z = p.y;
  float n1 = sin(0.21 * x + 0.13 * z + 1.3) * sin(0.17 * z - 0.11 * x + 0.4);
  float n2 = sin(0.37 * x - 0.29 * z + 2.1);
  float n3 = sin(0.61 * x + 0.53 * z + 0.7);
  float o = max(max(x - 11.0, -27.0 - x), max(z - 20.5, 0.0));
  float amp = 1.0 + 0.3 * smoothstep(0.0, 4.0, o);
  return m * (0.11 * n1 + 0.05 * n2 + 0.02 * n3) * amp;
}
`;

// The contract's camera views (position -> target) with the shadow fit that suits each one:
// garden.fitShadow(view.shadow[0], view.shadow[1]). The integrator may refine them.
// hero2 is a suggested variant of the hero that puts the house left of centre.
export const VIEWS = {
  hero: { pos: [5.0, 1.6, 10.5], target: [-3, 2.4, -34], shadow: [[-6, 0, -24], 40] },
  hero2: { pos: [5.0, 1.6, 10.5], target: [1.5, 2.6, -34], shadow: [[-4, 0, -24], 40] },
  push: { pos: [6.4, 1.5, 6.0], target: [7.0, 1.0, -24], shadow: [[1, 0, -12], 26] },
  finale: { pos: [15, 4.5, 31], target: [-2, 0.5, -8], shadow: [[-3, 0, -4], 36] },
  styles: { pos: [6.2, 1.35, 14.5], target: [8.6, 1.05, -24], shadow: [[4, 0, -8], 30] },
  // chapter 4 as composed by the world (the gate sits at z -8.4 .. -7.2, fences/repair.js GZ)
  repair: { pos: [-15.2, 1.85, -3.9], target: [-24, 0.55, -4.8], shadow: [[-23.5, 0, -5.2], 9] },
  gate: { pos: [-19.6, 1.6, -6.45], target: [-24, 0.72, -7.3], shadow: [[-23.6, 0, -7.8], 6] },
};
