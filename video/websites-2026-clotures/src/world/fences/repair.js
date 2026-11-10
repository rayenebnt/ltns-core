// The old weathered fence along x = -24 (z -26 -> 18) and the chapter 4 repair.
//
// Shadowbox construction (boards alternate on both faces of flat rails), grey weathered wood,
// 1.80 m. Before the storm (chapters 1-2) it is intact. In the repair chapter:
//   storm   the broken section z in [-6, -2]: snapped and hanging boards, boards on the grass,
//           a post leaning toward the garden at z = -4, a big leafy lime branch across the top,
//           the Z-braced gate (z in [0, 1.2], hinged at z = 0) sagging off a loose top hinge and
//           dragging its free corner in the grass (scuff arc), leaf litter and twigs
//   repair  branch lifted away (0.20-0.28); post straightened (0.28-0.32), replaced by a fresh
//           one in fresh concrete (0.32-0.36); broken pieces lifted away (0.30-0.38); fresh rails
//           (0.34-0.38) and fresh pale boards one by one (0.37-0.50); gate lifted level
//           (0.70-0.78); black strap hinges (0.76-0.84); anti-sag cable and turnbuckle
//           (0.82-0.90); latch (0.90)
// Rigid motions use the attachment matrices (aInfo.w = 4 gate, 5 leaning post, 6 branch).
import * as THREE from 'three';
import { GeoBuilder, V } from './geom.js';
import { UP, frame, GROUND } from './layout.js';
import { ROLE } from './material.js';
import { mulberry32 } from './noise.js';
import { woodUV } from './types.js';

const OX = -24;
const T = V(0, 0, 1); // along the old fence
// the gate opening starts at GZ (hinge side, toward -z: on the right seen from the garden) and is
// 1.2 m wide; one short intact bay separates it from the broken section [-6, -2]
export const GZ = -8.4;
export const GATE = { z0: GZ + 0.012, w: 1.176, y0: 0.05, h: 1.73, hingeZ: GZ };
export const LEAN = { z: -4, angle: (-14 * Math.PI) / 180 };
export const SAG = { alpha: (7.5 * Math.PI) / 180, beta: (17 * Math.PI) / 180, pivot: V(OX + 0.05, 0.17, GZ) };

const P = (z, y, x = 0) => V(OX + x, y, z);
const lin = (r, g, b) => [Math.pow(r / 255, 2.2), Math.pow(g / 255, 2.2), Math.pow(b / 255, 2.2)];
const COL = {
  rust: lin(110, 62, 36),
  rustDark: lin(70, 42, 28),
  black: lin(22, 22, 23),
  galv: lin(176, 178, 180),
  concrete: lin(168, 166, 158),
  soil: lin(84, 62, 44),
  soilWet: lin(58, 44, 32),
  turf: lin(92, 96, 52),
};

export function rotAbout(pivot, axis, angle) {
  return new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z).multiply(new THREE.Matrix4().makeRotationAxis(axis.clone().normalize(), angle)).multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
}

// the gate's storm pose relative to its rest pose (level, closed)
export function gateMatrix(k) {
  // k: 1 = sagging (storm), 0 = rest
  const a = SAG.alpha * k, b = SAG.beta * k;
  const piv = SAG.pivot;
  const m = new THREE.Matrix4().makeTranslation(piv.x, piv.y, piv.z);
  m.multiply(new THREE.Matrix4().makeRotationY(b));
  m.multiply(new THREE.Matrix4().makeRotationX(a));
  m.multiply(new THREE.Matrix4().makeTranslation(-piv.x, -piv.y, -piv.z));
  return m;
}
export function leanMatrix(k) {
  return rotAbout(V(OX, 0, LEAN.z), V(0, 0, 1), LEAN.angle * k);
}

const OLD_POSTS = (() => {
  // -26 .. gate post (9 bays), the gate posts, one short bay to the broken section, the broken
  // section (-6, -4 leaning, -2), then 10 bays to the corner post C
  const z = [];
  const g0 = GZ - 0.045, g1 = GZ + 1.245;
  for (let i = 0; i <= 9; i++) z.push(-26 + ((g0 + 26) * i) / 9);
  z.push(g1, -6, -4, -2);
  const a = -2, b = 17.88, n = 10;
  for (let i = 1; i <= n; i++) z.push(a + ((b - a) * i) / n);
  return z;
})();

function boardStations(rnd) {
  // shadowbox boards: 14 cm, every 24 cm on each face, faces offset by 12 cm
  const out = [];
  for (const side of [1, -1]) {
    const off = side > 0 ? 0 : 0.12;
    for (let z = -26.0 + 0.07 + off; z < 17.93; z += 0.24) {
      if (z + 0.07 > GZ - 0.1 && z - 0.07 < GZ + 1.29) continue; // gate opening and its posts
      out.push({ z: z + (rnd() - 0.5) * 0.006, side, h: 1.76 + (rnd() - 0.5) * 0.02 });
    }
  }
  return out;
}

export function buildOldFence() {
  const rnd = mulberry32(3001);
  const old = new GeoBuilder({ name: 'old-wood' }); // weathered: everything grey
  const fresh = new GeoBuilder({ name: 'old-fresh' }); // pine: the repaired section
  const kit = new GeoBuilder({ name: 'old-kit', color: true, rm: true }); // hardware, concrete, scuff
  const bark = new GeoBuilder({ name: 'branch-bark' });
  const leaves = new GeoBuilder({ name: 'old-leaves', color: true });
  const fB = frame(UP, T); // boards and posts: A = along, B = across (x)
  const fR = frame(T, UP); // rails: A = up, B = across
  const inBroken = (z) => z > -6.0 && z < -2.0;
  const boardBox = (b, z, side, y0, h, uv, w = 0.14) => {
    b.box({ c: P(z, y0 + h / 2, side * 0.055), A: fB.A, B: fB.B, G: fB.G, sa: w, sb: 0.02, sg: h, chamfer: 0.003, uv });
  };
  const railBox = (b, z0, z1, y, uv) => {
    b.box({ c: P((z0 + z1) / 2, y, 0), A: fR.A, B: fR.B, G: fR.G, sa: 0.045, sb: 0.09, sg: z1 - z0, chamfer: 0.004, uv });
  };
  const RAILS = [0.3, 0.95, 1.58];

  // ---------------------------------------------------------------- posts
  for (const z of OLD_POSTS) {
    const top = 1.8 + (rnd() - 0.5) * 0.02;
    const isLean = Math.abs(z - LEAN.z) < 0.01;
    if (isLean) {
      // old leaning post (attached to the lean matrix), replaced by a fresh one in the repair
      old.set({ pivot: P(z, 0), d: z, role: ROLE.OLDHW, rnd: rnd(), leg: 5, anim: [0.33, 0, 0, 0] });
      old.box({ c: P(z, (top - 0.4) / 2), A: fB.A, B: fB.B, G: fB.G, sa: 0.09, sb: 0.09, sg: top + 0.4, chamfer: 0.006, uv: woodUV(rnd, 0.09) });
      fresh.set({ pivot: P(z, 0), d: z, role: ROLE.FRESH, rnd: rnd(), leg: 0, anim: [0.32, 0.035, 0, 0] });
      fresh.box({ c: P(z, (1.8 - 0.4) / 2), A: fB.A, B: fB.B, G: fB.G, sa: 0.09, sb: 0.09, sg: 1.8 + 0.4, chamfer: 0.005, uv: woodUV(rnd, 0.09) });
      continue;
    }
    old.set({ pivot: P(z, 0), d: z, role: ROLE.STATIC, rnd: rnd(), leg: 0, anim: [0, 0, 0, 0] });
    old.box({ c: P(z, (top - 0.4) / 2), A: fB.A, B: fB.B, G: fB.G, sa: 0.09, sb: 0.09, sg: top + 0.4, chamfer: 0.006, uv: woodUV(rnd, 0.09) });
  }

  // ---------------------------------------------------------------- rails
  for (let i = 0; i < OLD_POSTS.length - 1; i++) {
    const z0 = OLD_POSTS[i] + 0.045, z1 = OLD_POSTS[i + 1] - 0.045;
    if (z0 > GZ - 0.1 && z1 < GZ + 1.3) continue; // the gate opening
    const broken = OLD_POSTS[i] >= -6 - 1e-6 && OLD_POSTS[i + 1] <= -2 + 1e-6;
    RAILS.forEach((y, k) => {
      if (!broken) {
        old.set({ pivot: P(z0, y), d: z0, role: ROLE.STATIC, rnd: rnd(), leg: 0 });
        railBox(old, z0, z1, y, woodUV(rnd, 0.09));
        return;
      }
      // intact (before the storm)
      old.set({ pivot: P(z0, y), d: z0, role: ROLE.INTACT, rnd: rnd(), leg: 0 });
      railBox(old, z0, z1, y, woodUV(rnd, 0.09));
      // storm: the end at the leaning post follows it; the top rail of the far bay is snapped
      const leanEnd = Math.abs(z1 + 0.045 - LEAN.z) < 0.01 ? 1 : 0; // z1 side is the lean post
      const order = 0.3 + rnd() * 0.05;
      old.set({ role: ROLE.STORM, anim: [order, 0.03, 0.6, 0] });
      const shift = y * Math.tan(-LEAN.angle);
      const fixedZ = leanEnd ? z0 : z1, movingZ = leanEnd ? z1 : z0;
      if (k === 2 && leanEnd) {
        // snapped: two halves hanging
        const mid = (z0 + z1) / 2;
        let m = old.vertexCount;
        railBox(old, z0, mid - 0.02, y, woodUV(rnd, 0.09));
        old.transformFrom(m, rotAbout(P(z0 + 0.02, y), V(1, 0, 0), -0.5));
        m = old.vertexCount;
        railBox(old, mid + 0.03, z1, y, woodUV(rnd, 0.09));
        old.transformFrom(m, new THREE.Matrix4().makeTranslation(shift * 0.9, 0, 0).multiply(rotAbout(P(z1 - 0.02, y), V(1, 0, 0), 0.38)));
      } else {
        const m = old.vertexCount;
        railBox(old, z0, z1, y, woodUV(rnd, 0.09));
        const ang = Math.atan2(shift, Math.abs(movingZ - fixedZ)) * (leanEnd ? -1 : 1);
        old.transformFrom(m, rotAbout(P(fixedZ, y), V(0, 1, 0), -ang));
      }
      // fresh rail (repair)
      fresh.set({ pivot: P(z0, y), d: z0, role: ROLE.FRESH, rnd: rnd(), leg: 0, anim: [0.34 + k * 0.008 + (z0 > -4 ? 0 : 0.012), 0.03, 0, 0] });
      railBox(fresh, z0, z1, y, woodUV(rnd, 0.09));
    });
  }

  // ---------------------------------------------------------------- boards
  const stations = boardStations(rnd);
  const debris = [];
  stations.sort((a, b) => a.z - b.z);
  for (const s of stations) {
    const uv = woodUV(rnd, 0.14);
    if (!inBroken(s.z)) {
      old.set({ pivot: P(s.z, 0.04, s.side * 0.055), d: s.z, role: ROLE.STATIC, rnd: rnd(), leg: 0 });
      boardBox(old, s.z, s.side, 0.04, s.h, uv);
      continue;
    }
    // intact version
    old.set({ pivot: P(s.z, 0.04, s.side * 0.055), d: s.z, role: ROLE.INTACT, rnd: rnd(), leg: 0 });
    boardBox(old, s.z, s.side, 0.04, s.h, uv);
    // fresh version
    const ord = Math.min(1, Math.max(0, (-2.0 - s.z) / 4.0 + (s.side > 0 ? 0 : 0.035)));
    fresh.set({ pivot: P(s.z, 0.04, s.side * 0.055), d: s.z, role: ROLE.FRESH, rnd: rnd(), leg: 0, anim: [0.372 + ord * 0.1, 0.024, 0, 0] });
    boardBox(fresh, s.z, s.side, 0.04, 1.76, woodUV(rnd, 0.14));
    // storm version, structured: in the branch's impact zone (z < -4.7) the tops are snapped
    // off; around the leaning post the boards are pushed over with it; beyond (z > -3.3) a few
    // are pulled off the top rail and hang, one or two are missing.
    const order = 0.3 + rnd() * 0.06;
    old.set({ role: ROLE.STORM, anim: [order, 0.03, 0.7, 0] });
    const nearLean = Math.max(0, 1 - Math.abs(s.z - LEAN.z) / 1.8);
    const pushM = rotAbout(P(s.z, 0.0), V(0, 0, 1), LEAN.angle * nearLean * 0.9).premultiply(new THREE.Matrix4().makeTranslation(nearLean * 0.015, 0, 0));
    const r = rnd();
    const kind = s.z < -4.7 ? (r < 0.72 ? 'snap' : r < 0.86 ? 'hang' : 'miss') : s.z < -3.3 ? (r < 0.8 ? 'push' : 'snap') : r < 0.3 ? 'hang' : r < 0.42 ? 'miss' : 'push';
    if (kind === 'snap') {
      const ys = 0.62 + rnd() * 0.55;
      const m = old.vertexCount;
      boardBox(old, s.z, s.side, 0.04, ys - 0.04, uv);
      snapTeeth(old, P(s.z, ys, s.side * 0.055), rnd, uv);
      old.transformFrom(m, pushM);
      debris.push({ z: s.z, side: s.side, len: s.h - ys + 0.04, uv: woodUV(rnd, 0.14) });
    } else if (kind === 'hang') {
      // hanging by one nail on the bottom rail: swung a little sideways, falling outward
      const m = old.vertexCount;
      boardBox(old, s.z, s.side, 0.04, s.h, uv);
      const sw = (rnd() < 0.5 ? -1 : 1) * (0.1 + rnd() * 0.22);
      const mm = rotAbout(P(s.z, 0.3, s.side * 0.055), V(1, 0, 0), sw).premultiply(rotAbout(P(s.z, 0.3), V(0, 0, 1), -(0.07 + rnd() * 0.12) * s.side));
      old.transformFrom(m, mm.premultiply(pushM));
    } else if (kind === 'miss') {
      debris.push({ z: s.z, side: s.side, len: s.h, uv });
    } else {
      const m = old.vertexCount;
      boardBox(old, s.z, s.side, 0.04, s.h, uv);
      old.transformFrom(m, pushM);
    }
  }
  // fallen pieces on the grass (garden side and neighbour's side), at random angles
  debris.forEach((dbr, i) => {
    const z = dbr.z + (rnd() - 0.5) * 1.6, x = dbr.side * (0.3 + rnd() * 1.3);
    const yaw = (rnd() - 0.5) * 2.2;
    const prop = rnd() < 0.3 ? 0.05 + rnd() * 0.08 : 0;
    const c = P(z, 0.022 + GROUND.lift * 0.8 + (i % 3) * 0.02 + prop * dbr.len * 0.5, x);
    const G = V(Math.sin(yaw), prop, Math.cos(yaw)).normalize();
    const f = frame(G, V(0, 1, 0));
    old.set({ pivot: c, d: z, role: ROLE.STORM, rnd: rnd(), leg: 0, anim: [0.3 + rnd() * 0.07, 0.03, 0.7, 0] });
    old.box({ c, A: f.B, B: f.A.clone().negate(), G: f.G, sa: 0.14, sb: 0.02, sg: dbr.len, chamfer: 0.003, uv: dbr.uv });
  });
  // splinters near the break
  for (let i = 0; i < 26; i++) {
    const z = -6 + rnd() * 4, x = 0.1 + rnd() * 1.4;
    const yaw = rnd() * 6.28;
    const G = V(Math.sin(yaw), 0.05, Math.cos(yaw)).normalize();
    const f = frame(G, V(0, 1, 0));
    const len = 0.08 + rnd() * 0.25;
    fresh.set({ pivot: P(z, 0.03, x), d: z, role: ROLE.STORM, rnd: rnd(), leg: 0, anim: [0.3 + rnd() * 0.07, 0.03, 0.5, 0] });
    const w = 0.008 + rnd() * 0.02;
    fresh.prism({ origin: P(z, 0.035 + GROUND.lift, x).addScaledVector(G, -len / 2), A: f.B, B: f.A.clone().negate(), G: f.G, poly: [[-w, -0.003], [w, -0.003], [w * 0.3, 0.003]], len, scaleEnd: 0.15, uv: woodUV(rnd, 0.03) });
  }

  // ---------------------------------------------------------------- the gate
  buildGate(old, kit, rnd);

  // ---------------------------------------------------------------- concrete and scuff
  // fresh collar for the straightened post
  kit.set({ pivot: P(LEAN.z, 0), d: LEAN.z, role: ROLE.FRESH, rnd: rnd(), leg: 0, anim: [0.335, 0.03, 0, 0], color: COL.concrete, rm: [0.9, 0] });
  kit.mound({ c: P(LEAN.z, 0), radius: (a) => 0.16 * (1 + 0.05 * Math.sin(a * 3)), height: (rn) => 0.03 * (1 - rn * rn) + 0.004 + GROUND.lift * (1 - rn * 0.6), rings: 3, segs: 14 });
  // heaved soil at the foot of the leaning post (storm), torn turf
  kit.set({ role: ROLE.STORM, anim: [0.3, 0.04, 0.0, 0], color: COL.soilWet, rm: [0.95, 0] });
  kit.mound({ c: P(LEAN.z, 0, 0.18), radius: (a) => 0.28 * (1 + 0.3 * Math.sin(a * 2 + 1.0)), height: (rn, a) => 0.05 * (1 - rn) * (1 + 0.3 * Math.sin(a * 5)) + GROUND.lift * (1 - rn * 0.5), rings: 3, segs: 14 });
  // scuff arc of the dragging corner (hinge at z = 0, radius ~1.17)
  kit.set({ pivot: P(GZ, 0), d: GZ, role: ROLE.STORMONLY, rnd: 0.5, leg: 0, anim: [0.84, 0.16, 0.0, 0], color: COL.soil, rm: [0.96, 0] });
  {
    const R = 1.16, a1 = SAG.beta + 0.18, N = 18;
    const hz = SAG.pivot.z, hx = SAG.pivot.x;
    const base = kit.vertexCount;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * a1;
      const wob = 0.025 + 0.015 * Math.sin(i * 2.3) + 0.01 * rnd();
      for (const s of [-1, 1]) {
        const r = R + s * wob;
        kit.set({ color: s > 0 ? COL.soil : COL.soilWet });
        kit.vert(V(hx + Math.sin(a) * r, 0.009 + GROUND.lift, hz + Math.cos(a) * r), UP, 0, 0);
      }
    }
    for (let i = 0; i < N; i++) {
      const a = base + i * 2;
      kit.quadIdx(a, a + 1, a + 3, a + 2);
    }
    // torn turf heaped where the corner digs in
    const cz = hz + Math.cos(SAG.beta) * R, cx = hx + Math.sin(SAG.beta) * R;
    kit.set({ color: COL.turf });
    kit.mound({ c: V(cx + 0.04, 0, cz + 0.04), radius: (a) => 0.1 * (1 + 0.3 * Math.sin(a * 3)), height: (rn) => 0.022 * (1 - rn * rn) + GROUND.lift, rings: 2, segs: 10 });
  }

  // ---------------------------------------------------------------- branch, litter
  const branchInfo = buildBranch(bark, leaves, fresh, rnd);
  buildLitter(leaves, bark, rnd);

  return { old, fresh, kit, bark, leaves, branch: branchInfo, posts: OLD_POSTS };
}

// jagged snapped end (a few splinter teeth) on top of a board at c
function snapTeeth(b, c, rnd, uv) {
  const n = 4;
  for (let i = 0; i < n; i++) {
    const z = c.z - 0.06 + (i + 0.5) * (0.12 / n);
    const h = 0.03 + rnd() * 0.13;
    const G = V((rnd() - 0.5) * 0.15, 1, (rnd() - 0.5) * 0.25).normalize();
    const f = frame(G, V(0, 0, 1));
    const w = 0.014 + rnd() * 0.01;
    b.prism({ origin: V(c.x, c.y - 0.004, z), A: f.A, B: f.B, G: f.G, poly: [[-w, -0.009], [w, -0.009], [w, 0.009], [-w, 0.009]], len: h, scaleEnd: 0.08, uv, caps: [false, true] });
  }
}

// ------------------------------------------------------------------ the Z-braced gate
function buildGate(old, kit, rnd) {
  const g = GATE;
  const zA = g.z0, zB = g.z0 + g.w; // hinge side, latch side
  const fB = frame(UP, T);
  const fR = frame(T, UP);
  // boards (neighbour side of the frame)
  const nb = 8, gap = (g.w - nb * 0.14) / (nb - 1);
  for (let i = 0; i < nb; i++) {
    const z = zA + 0.07 + i * (0.14 + gap);
    const h = g.h - (rnd() - 0.3) * 0.015;
    old.set({ pivot: P(z, g.y0), d: z, role: ROLE.STATIC, rnd: rnd(), leg: 4 });
    old.box({ c: P(z, g.y0 + h / 2, -0.002), A: fB.A, B: fB.B, G: fB.G, sa: 0.14, sb: 0.02, sg: h, chamfer: 0.003, uv: woodUV(rnd, 0.14) });
  }
  // ledges and braces (garden side)
  const ledges = [0.17, 0.88, 1.58];
  for (const y of ledges) {
    old.set({ pivot: P(zA, y), d: zA, role: ROLE.STATIC, rnd: rnd(), leg: 4 });
    old.box({ c: P((zA + zB) / 2, y, 0.026), A: fR.A, B: fR.B, G: fR.G, sa: 0.09, sb: 0.032, sg: g.w - 0.02, chamfer: 0.004, uv: woodUV(rnd, 0.09) });
  }
  for (let k = 0; k < 2; k++) {
    // from the hinge side low to the latch side high (compression braces)
    const ya = ledges[k] + 0.05, yb = ledges[k + 1] - 0.05;
    const a = P(zA + 0.06, ya, 0.026), b = P(zB - 0.06, yb, 0.026);
    const G = b.clone().sub(a);
    const len = G.length();
    G.normalize();
    const f = frame(G, V(1, 0, 0));
    old.set({ pivot: a, d: zA, role: ROLE.STATIC, rnd: rnd(), leg: 4 });
    old.box({ c: a.clone().add(b).multiplyScalar(0.5), A: f.B.clone().negate(), B: f.A, G: f.G, sa: 0.085, sb: 0.03, sg: len, chamfer: 0.004, uv: woodUV(rnd, 0.085) });
  }
  const yGarden = 0.026 + 0.016; // garden face of the ledges (local x offset)
  // ---- old rusty T hinges (bottom: intact until replaced; top: pulled loose in the storm)
  const tHinge = (b, y, role, anim, leg, pulled) => {
    b.set({ pivot: P(zA, y), d: zA, role, rnd: 0.5, leg, anim, color: COL.rust, rm: [0.8, 0.35] });
    // strap on the ledge
    b.box({ c: P(zA + 0.14, y, yGarden + 0.002), A: fR.A, B: fR.B, G: fR.G, sa: 0.032, sb: 0.004, sg: 0.24, uv: { su: 1, sv: 1 } });
    // T plate on the post face (x = garden face of the hinge post)
    const plate = (m) => {
      const mark = b.vertexCount;
      b.box({ c: P(GZ - 0.03, y, 0.047), A: fB.A, B: fB.B, G: fB.G, sa: 0.034, sb: 0.004, sg: 0.12, uv: { su: 1, sv: 1 } });
      if (m) b.transformFrom(mark, m);
    };
    if (!pulled) plate(null);
    else {
      // plate torn off the post: hanging from the strap's knuckle, screws sticking out
      const m = rotAbout(P(GZ, y, 0.047), V(0, 1, 0), 0.75).premultiply(new THREE.Matrix4().makeTranslation(0.012, -0.01, 0.03));
      plate(m);
      b.set({ color: COL.rustDark });
      for (const dy of [-0.035, 0.035]) {
        const sp = P(GZ - 0.03, y + dy, 0.05).applyMatrix4(m);
        const G = V(-1, 0, 0).applyMatrix4(new THREE.Matrix4().extractRotation(m)).normalize();
        const f = frame(G, V(0, 1, 0));
        b.cylinder({ origin: sp, A: f.A, B: f.B, G: f.G, r: 0.0025, len: 0.04, n: 5, uv: { su: 1, sv: 1 } });
      }
    }
    // knuckle
    b.set({ color: COL.rust });
    b.cylinder({ origin: P(GZ + 0.004, y - 0.03, yGarden + 0.004), A: V(1, 0, 0), B: V(0, 0, -1), G: V(0, 1, 0), r: 0.007, len: 0.06, n: 6, uv: { su: 1, sv: 1 } });
  };
  // bottom: before the storm and until replaced
  tHinge(kit, ledges[0], ROLE.OLDHW, [0.77, 0, 0, 0], 4, false);
  // top: intact before the storm, pulled loose in the storm (until replaced)
  tHinge(kit, ledges[2], ROLE.INTACT, [0, 0, 0, 0], 4, false);
  tHinge(kit, ledges[2], ROLE.STORM, [0.77, 0.02, 0.0, 0], 4, true);
  // old latch: a rusty hook on the latch side
  kit.set({ pivot: P(zB, 1.05), d: zB, role: ROLE.OLDHW, rnd: 0.5, leg: 4, anim: [0.88, 0, 0, 0], color: COL.rust, rm: [0.8, 0.35] });
  kit.box({ c: P(zB - 0.08, 1.05, yGarden + 0.003), A: fR.A, B: fR.B, G: fR.G, sa: 0.012, sb: 0.006, sg: 0.16, uv: { su: 1, sv: 1 } });

  // ---- new black strap hinges (heavy, 45 cm straps with bolts) and pintle plates on the post
  ledges.filter((_, i) => i !== 1).forEach((y, i) => {
    const t0 = 0.765 + i * 0.03;
    kit.set({ pivot: P(zA + 0.05, y), d: zA, role: ROLE.NEWHW, rnd: 0.5, leg: 4, anim: [t0, 0.05, 0, 0], color: COL.black, rm: [0.45, 0.55] });
    // tapered strap: 45 cm, 5 -> 2.5 cm
    const s0 = P(zA + 0.005, y, yGarden + 0.003);
    kit.prism({ origin: s0, A: V(0, 1, 0), B: V(-1, 0, 0), G: T, poly: [[-0.025, -0.0025], [0.025, -0.0025], [0.025, 0.0025], [-0.025, 0.0025]], len: 0.45, scaleEnd: 0.55, uv: { su: 1, sv: 1 } });
    // bolts
    for (const dz of [0.06, 0.18, 0.3, 0.41]) kit.cylinder({ origin: P(zA + dz, y, yGarden + 0.005), A: V(0, 1, 0), B: V(0, 0, 1), G: V(1, 0, 0), r: 0.0065, len: 0.008, n: 6, uv: { su: 1, sv: 1 } });
    // knuckle (rides with the gate)
    kit.cylinder({ origin: P(GZ - 0.012, y - 0.045, yGarden + 0.006), A: V(1, 0, 0), B: V(0, 0, -1), G: V(0, 1, 0), r: 0.011, len: 0.09, n: 8, uv: { su: 1, sv: 1 } });
    // pintle plate on the hinge post (static)
    kit.set({ leg: 0, pivot: P(GZ - 0.045, y) });
    kit.box({ c: P(GZ - 0.04, y, 0.048), A: fB.A, B: fB.B, G: fB.G, sa: 0.06, sb: 0.006, sg: 0.16, uv: { su: 1, sv: 1 } });
    for (const dy of [-0.055, 0.055]) kit.cylinder({ origin: P(GZ - 0.04, y + dy, 0.05), A: V(0, 1, 0), B: V(0, 0, 1), G: V(1, 0, 0), r: 0.006, len: 0.008, n: 6, uv: { su: 1, sv: 1 } });
  });
  // ---- anti-sag cable kit: top hinge-side corner -> bottom latch-side corner, turnbuckle
  {
    const a = P(zA + 0.06, ledges[2] + 0.02, yGarden + 0.012), b = P(zB - 0.06, ledges[0] - 0.02, yGarden + 0.012);
    const G = b.clone().sub(a);
    const len = G.length();
    G.normalize();
    const f = frame(G, V(1, 0, 0));
    const mid = a.clone().add(b).multiplyScalar(0.5);
    kit.set({ pivot: mid, d: zA, role: ROLE.NEWHW, rnd: 0.5, leg: 4, anim: [0.825, 0.06, 0, 0], color: COL.galv, rm: [0.3, 1] });
    kit.cylinder({ origin: a, A: f.A, B: f.B, G: f.G, r: 0.003, len: len / 2 - 0.09, n: 5, uv: { su: 1, sv: 1 } });
    kit.cylinder({ origin: mid.clone().addScaledVector(G, 0.09), A: f.A, B: f.B, G: f.G, r: 0.003, len: len / 2 - 0.09, n: 5, uv: { su: 1, sv: 1 } });
    // turnbuckle body (open frame) and two eye bolts
    kit.set({ anim: [0.845, 0.05, 0, 0] });
    for (const s of [-1, 1]) kit.box({ c: mid.clone().addScaledVector(f.B, s * 0.011), A: f.A, B: f.B, G: f.G, sa: 0.009, sb: 0.006, sg: 0.15, chamfer: 0.002, uv: { su: 1, sv: 1 } });
    for (const s of [-1, 1]) kit.box({ c: mid.clone().addScaledVector(G, s * 0.075), A: f.A, B: f.B, G: f.G, sa: 0.012, sb: 0.03, sg: 0.012, chamfer: 0.003, uv: { su: 1, sv: 1 } });
    for (const s of [-1, 1]) kit.cylinder({ origin: mid.clone().addScaledVector(G, s * 0.075), A: f.A, B: f.B.clone().multiplyScalar(s), G: f.G.clone().multiplyScalar(s), r: 0.005, len: 0.04, n: 6, uv: { su: 1, sv: 1 } });
    // corner brackets
    kit.set({ anim: [0.82, 0.04, 0, 0], color: COL.galv });
    for (const p of [a, b]) kit.box({ c: p.clone().add(V(-0.006, 0, 0)), A: V(0, 1, 0), B: V(1, 0, 0).negate(), G: T, sa: 0.05, sb: 0.004, sg: 0.05, uv: { su: 1, sv: 1 } });
  }
  // ---- gravity latch: bar on the gate, keeper on the latch post
  kit.set({ pivot: P(zB, 1.05), d: zB, role: ROLE.NEWHW, rnd: 0.5, leg: 4, anim: [0.9, 0.04, 0, 0], color: COL.black, rm: [0.45, 0.55] });
  kit.box({ c: P(zB - 0.04, 1.06, yGarden + 0.01), A: fR.A, B: fR.B, G: fR.G, sa: 0.018, sb: 0.008, sg: 0.17, uv: { su: 1, sv: 1 } });
  kit.box({ c: P(zB - 0.12, 1.06, yGarden + 0.004), A: fR.A, B: fR.B, G: fR.G, sa: 0.06, sb: 0.005, sg: 0.04, uv: { su: 1, sv: 1 } });
  kit.set({ leg: 0, pivot: P(zB + 0.03, 1.05) });
  kit.box({ c: P(GZ + 1.245, 1.055, 0.05), A: fB.A, B: fB.B, G: fB.G, sa: 0.05, sb: 0.03, sg: 0.07, uv: { su: 1, sv: 1 } });
}

// ------------------------------------------------------------------ fallen lime branch
function buildBranch(bark, leaves, fresh, rnd) {
  // main limb: butt on the neighbour's ground near N1, over the fence top, leafy end in the garden
  const main = [
    V(-27.3, 0.18, -6.25),
    V(-26.3, 0.78, -6.0),
    V(-25.25, 1.38, -5.75),
    V(-24.3, 1.88, -5.55),
    V(-23.5, 1.74, -5.62),
    V(-22.85, 1.3, -5.82),
    V(-22.35, 0.82, -6.06),
    V(-21.95, 0.4, -6.32),
    V(-21.7, 0.13, -6.52),
  ];
  const radii = main.map((_, i) => 0.085 * Math.pow(1 - i / (main.length - 0.6), 0.9) + 0.012);
  const ATT = 6;
  bark.set({ pivot: main[3], d: -5.5, role: ROLE.STORMONLY, rnd: 0.5, leg: ATT, anim: [0.205, 0.06, 1, 0] });
  bark.tube({ pts: smoothPath(main, 4), r: smoothArr(radii, 4), n: 9, uv: { su: 0.5, sv: 1.2 }, caps: [true, true] });
  // pale splintered butt end
  fresh.set({ pivot: main[3], d: -5.5, role: ROLE.STORMONLY, rnd: 0.5, leg: ATT, anim: [0.205, 0.06, 1, 0] });
  const dir0 = main[0].clone().sub(main[1]).normalize();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const f = frame(dir0, V(0, 1, 0));
    const o = main[0].clone().addScaledVector(f.A, Math.cos(a) * 0.05).addScaledVector(f.B, Math.sin(a) * 0.05);
    const G = dir0.clone().addScaledVector(f.A, (rnd() - 0.5) * 0.4).addScaledVector(f.B, (rnd() - 0.5) * 0.4).normalize();
    const ff = frame(G, f.A);
    fresh.prism({ origin: o.addScaledVector(dir0, -0.02), A: ff.A, B: ff.B, G: ff.G, poly: [[-0.02, -0.012], [0.02, -0.012], [0.0, 0.016]], len: 0.06 + rnd() * 0.14, scaleEnd: 0.1, uv: woodUV(rnd, 0.04) });
  }
  // secondary branches with twigs and leaves
  const tips = [];
  const forks = [
    [2.6, V(0.15, 0.6, 0.5), 1.0],
    [3.2, V(0.3, 0.5, -0.8), 1.3],
    [3.8, V(0.45, 0.45, 0.55), 1.05],
    [4.4, V(0.3, 0.25, -0.9), 1.35],
    [5.0, V(0.55, 0.3, 0.45), 0.95],
    [5.6, V(0.4, 0.15, -0.8), 1.15],
    [6.3, V(0.55, 0.2, 0.35), 0.85],
    [1.8, V(-0.4, 0.6, 0.7), 1.0],
    [1.2, V(-0.5, 0.5, -0.8), 0.95],
    // crown branches sticking up over the fence top
    [3.0, V(0.05, 1.0, 0.25), 1.1],
    [3.5, V(-0.15, 0.95, -0.35), 1.2],
    [2.2, V(-0.1, 1.0, 0.1), 1.0],
  ];
  for (const [at, dir, len] of forks) {
    const i0 = Math.floor(at), t = at - i0;
    const o = main[i0].clone().lerp(main[Math.min(i0 + 1, main.length - 1)], t);
    const d = dir.clone().normalize();
    const pts = [o];
    const sag = V(0, -0.35, 0);
    for (let k = 1; k <= 4; k++) {
      const p = o.clone().addScaledVector(d, (len * k) / 4).addScaledVector(sag, Math.pow(k / 4, 2) * len * 0.5).add(V((rnd() - 0.5) * 0.08, (rnd() - 0.5) * 0.06, (rnd() - 0.5) * 0.08));
      p.y = Math.max(p.y, 0.05 + rnd() * 0.05);
      pts.push(p);
    }
    const r0 = 0.032 * (1 - at / 10);
    bark.tube({ pts: smoothPath(pts, 3), r: smoothArr([r0, r0 * 0.75, r0 * 0.55, r0 * 0.38, 0.006], 3), n: 6, uv: { su: 0.5, sv: 1.2 } });
    // twigs
    for (let k = 2; k <= 4; k++) {
      for (let j = 0; j < 2; j++) {
        const s = pts[k];
        const td = d.clone().add(V((rnd() - 0.5) * 1.4, rnd() * 0.6 - 0.2, (rnd() - 0.5) * 1.4)).normalize();
        const e = s.clone().addScaledVector(td, 0.35 + rnd() * 0.35);
        e.y = Math.max(e.y, 0.04);
        e.z = Math.max(-6.8, Math.min(e.z, -4.9));
        bark.tube({ pts: [s, s.clone().lerp(e, 0.5).add(V(0, 0.03, 0)), e], r: [0.009, 0.006, 0.003], n: 4, uv: { su: 0.5, sv: 1.2 } });
        tips.push(e);
      }
    }
    tips.push(pts[4], pts[3]);
  }
  for (let i = 4; i < main.length; i++) tips.push(main[i]);
  // leaf sprays around the tips (fresh green, a few turning)
  leaves.set({ pivot: main[3], d: -5.5, role: ROLE.STORMONLY, rnd: 0.5, leg: ATT, anim: [0.205, 0.06, 1, 0] });
  for (const tip of tips) {
    const n = 11 + Math.floor(rnd() * 6);
    for (let k = 0; k < n; k++) {
      const c = tip.clone().add(V((rnd() - 0.5) * 0.45, (rnd() - 0.3) * 0.36, (rnd() - 0.5) * 0.45));
      c.y = Math.max(c.y, 0.06 + rnd() * 0.05);
      c.z = Math.max(-6.95 + rnd() * 0.1, Math.min(c.z, -4.85 - rnd() * 0.1));
      const g = 0.62 + rnd() * 0.5;
      const t = rnd();
      leaves.set({ color: t < 0.07 ? [0.95 * g, 0.88 * g, 0.42 * g] : t < 0.4 ? [0.62 * g, 0.8 * g, 0.42 * g] : [0.78 * g, 0.93 * g, 0.58 * g] });
      leafCard(leaves, c, 0.17 + rnd() * 0.08, rnd() < 0.5 ? 0 : 1, rnd);
    }
  }
  return { anchor: main[3].clone().add(V(0.0, 0.16, 0.0)), pivot: main[3].clone() };
}

// leaf card: atlas cell (0..3), random orientation (mostly facing up / sideways)
function leafCard(b, c, size, cell, rnd, flat = false) {
  const n = flat ? V((rnd() - 0.5) * 0.5, 1, (rnd() - 0.5) * 0.5).normalize() : V(rnd() - 0.5, rnd() * 0.9 + 0.1, rnd() - 0.5).normalize();
  const f = frame(n, V(rnd() - 0.5, 0, rnd() - 0.5).normalize().add(V(0, 0.001, 0)));
  const u = f.A.clone().multiplyScalar(size / 2), v = f.B.clone().multiplyScalar(size / 2);
  const cu = (cell % 2) * 0.5, cv = cell < 2 ? 0.5 : 0;
  const p0 = c.clone().sub(u).sub(v), p1 = c.clone().add(u).sub(v), p2 = c.clone().add(u).add(v), p3 = c.clone().sub(u).add(v);
  b.quad(p0, p1, p2, p3, { uv: [[cu, cv], [cu + 0.5, cv], [cu + 0.5, cv + 0.5], [cu, cv + 0.5]], normal: n.clone().lerp(V(0, 1, 0), flat ? 0.6 : 0.8).normalize() });
}

// leaf litter and twigs on the grass of the repair area
function buildLitter(leaves, bark, rnd) {
  const lift = 0.012 + GROUND.lift * 1.25;
  leaves.set({ pivot: P(-4, 0), d: -4, role: ROLE.STORMONLY, rnd: 0.5, leg: 0, anim: [0, 0, 0, 0] });
  for (let i = 0; i < 900; i++) {
    // denser near the fence and the branch, thinning into the garden
    const x = Math.pow(rnd(), 1.7) * 9.5 + 0.12;
    const z = -11.5 + rnd() * 13 + (rnd() - 0.5) * 2;
    const near = Math.exp(-Math.abs(z + 5.2) / 4);
    if (rnd() > 0.35 + 0.65 * near) continue;
    const c = P(z, lift + rnd() * 0.012, x);
    const g = 0.7 + rnd() * 0.45;
    const t = rnd();
    leaves.set({ color: t < 0.4 ? [0.95 * g, 1.05 * g, 0.72 * g] : t < 0.65 ? [0.8 * g, 0.92 * g, 0.55 * g] : t < 0.85 ? [1.1 * g, 0.95 * g, 0.42 * g] : [0.95 * g, 0.66 * g, 0.36 * g] });
    leafCard(leaves, c, 0.12 + rnd() * 0.08, rnd() < 0.75 ? 2 : 3, rnd, true);
  }
  // twigs
  bark.set({ pivot: P(-4, 0), d: -4, role: ROLE.STORMONLY, rnd: 0.5, leg: 0, anim: [0, 0, 0, 0] });
  for (let i = 0; i < 30; i++) {
    const x = 0.2 + Math.pow(rnd(), 1.4) * 6, z = -10.5 + rnd() * 10.5;
    const yaw = rnd() * 6.28, len = 0.15 + rnd() * 0.5;
    const a = P(z, lift * 0.7, x), b = a.clone().add(V(Math.sin(yaw) * len, 0.01, Math.cos(yaw) * len));
    const m = a.clone().lerp(b, 0.5).add(V((rnd() - 0.5) * 0.05, 0.01, (rnd() - 0.5) * 0.05));
    bark.tube({ pts: [a, m, b], r: [0.007, 0.005, 0.0025], n: 4, uv: { su: 0.5, sv: 1.2 } });
  }
}

// Catmull-Rom resampling of a path (sub samples per segment)
function smoothPath(pts, sub) {
  const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  return c.getPoints((pts.length - 1) * sub);
}
function smoothArr(arr, sub) {
  const out = [];
  for (let i = 0; i < arr.length - 1; i++) for (let k = 0; k < sub; k++) out.push(arr[i] + ((arr[i + 1] - arr[i]) * k) / sub);
  out.push(arr[arr.length - 1]);
  return out;
}

// anchors in the rest pose (transformed by the attachments at runtime)
export const ANCHORS_REST = {
  poteau: { p: V(OX + 0.06, 1.1, LEAN.z), att: 1 },
  penture: { p: V(OX + 0.07, 1.58, GZ + 0.03), att: 0 },
  portillon: { p: V(OX + 0.05, 0.12, GATE.z0 + GATE.w - 0.06), att: 0 },
  pentures: { p: V(OX + 0.06, 1.58, GZ + 0.22), att: 0 },
  cable: { p: V(OX + 0.054, 0.875, GATE.z0 + GATE.w / 2), att: 0 },
  garde: { p: V(OX + 0.05, 0.035, GATE.z0 + GATE.w * 0.5), att: 0 },
};
