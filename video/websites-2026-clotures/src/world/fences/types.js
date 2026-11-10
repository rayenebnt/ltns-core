// The five fence types along the new polyline (both legs), one builder per material.
//   0 Bois plein   Douglas board-on-board: 9 x 9 posts every 2 m, 3 rails, two overlapping
//                  layers of 145 x 21 boards on the outer face, trim board and cap rail, post caps
//   1 PVC blanc    12.7 cm posts with caps, rails, tongue-and-groove boards, 1.93 m bays
//   2 Panneaux rigides anthracite (RAL 7016): 2.5 m welded panels with three V folds, 60 x 40
//                  posts, clips, plastic caps
//   3 Ranch        black-stained Douglas: 10 x 10 posts every 2.4 m, three 150 x 32 boards
//                  spanning two bays (staggered joints), black welded mesh on the garden side
//   4 Ganivelle    split chestnut stakes every 8 cm tied by twisted galvanised wire pairs,
//                  round chestnut posts every 2 m
// Every element carries d (distance from B along its leg), its role and a random value.
import * as THREE from 'three';
import { GeoBuilder } from './geom.js';
import { LEGS, UP, legPoint, frame, postStations, HEIGHTS } from './layout.js';
import { ROLE } from './material.js';
import { mulberry32 } from './noise.js';

// wood UVs: one board face lives in one half of the 0.3 m-wide tile, random height
export function woodUV(rnd, width = 0.145, sv = 2.4) {
  const half = rnd() < 0.5 ? 0 : 0.5;
  const margin = Math.max(0, 0.5 - width / 0.3 - 0.01);
  return { su: 0.3, sv, ou: half + 0.005 + rnd() * margin, ov: rnd() };
}

function postBox(b, rnd, c, t, w, depth, h, chamfer = 0.004) {
  // vertical post from c (base) upward, width w along t, depth along n
  const f = frame(UP, t);
  b.box({ c: c.clone().setY(c.y + h / 2), A: f.A, B: f.B, G: f.G, sa: w, sb: depth, sg: h, chamfer, uv: woodUV(rnd, Math.max(w, depth)) });
}

// small pyramid / chamfered cap on top of a post (centre top at c)
function pyramidCap(b, rnd, c, t, w, h, tip = 0.35) {
  const f = frame(UP, t);
  const a = w / 2;
  b.prism({ origin: c, A: f.A, B: f.B, G: f.G, poly: [[-a, -a], [a, -a], [a, a], [-a, a]], len: h, scaleEnd: tip, uv: woodUV(rnd, w) });
}

// ------------------------------------------------------------------ 0: Douglas board-on-board
export function buildType0(opts = {}) {
  const rnd = mulberry32(1001);
  const b = new GeoBuilder({ name: 'fence-t0' });
  for (const leg of LEGS) {
    const st = postStations(leg.len, 2.0);
    const f = frame(UP, leg.t);
    // posts (the corner post B belongs to leg 0)
    st.forEach((d, i) => {
      if (leg.id === 1 && i === 0) return;
      const base = legPoint(leg, d, 0, 0);
      b.set({ pivot: base, d, role: ROLE.POST, rnd: rnd(), leg: leg.id, anim: [0, 0, 2.25, 0] });
      postBox(b, rnd, base.clone().setY(-0.35), leg.t, 0.09, 0.09, 1.84 + 0.35, 0.005);
      // post cap: flat cap board with a low pyramid
      b.set({ role: ROLE.CAP, anim: [0.004, 0, 0, 0] });
      const top = base.clone().setY(1.84);
      postBox(b, rnd, top, leg.t, 0.12, 0.12, 0.022, 0.004);
      pyramidCap(b, rnd, top.clone().setY(1.862), leg.t, 0.12, 0.022, 0.42);
    });
    // rails between post faces (inset, flush with the outer post face)
    for (let i = 0; i < st.length - 1; i++) {
      const d0 = st[i] + 0.045, d1 = st[i + 1] - 0.045, len = d1 - d0;
      [0.27, 0.9, 1.53].forEach((y, k) => {
        const c = legPoint(leg, (d0 + d1) / 2, 0.0225, y);
        b.set({ pivot: legPoint(leg, d0, 0.0225, y), d: st[i], role: ROLE.RAIL, rnd: rnd(), leg: leg.id, anim: [k * 0.004, 0, 0, 0] });
        const fr = frame(leg.t, UP);
        b.box({ c, A: fr.A, B: fr.B, G: fr.G, sa: 0.07, sb: 0.045, sg: len, chamfer: 0.003, uv: woodUV(rnd, 0.07) });
      });
    }
    // boards: two overlapping layers on the outer face, continuous across the posts
    const start = leg.id === 0 ? -0.087 : -0.045;
    const end = leg.len + 0.045;
    for (let layer = 0; layer < 2; layer++) {
      const pitch = 0.24, w = 0.145;
      const off = layer === 0 ? 0 : pitch / 2;
      for (let x = start + w / 2 + off; x < end - w / 2 + 0.001; x += pitch) {
        const d = x;
        const o = layer === 0 ? 0.0555 : 0.0765;
        const hgt = 1.7 + (rnd() - 0.5) * 0.004;
        const base = legPoint(leg, d, o, 0.05);
        b.set({ pivot: base, d: Math.max(0, d), role: ROLE.BOARD, rnd: rnd(), leg: leg.id, anim: [layer * 0.006, 0, 0, 0] });
        b.box({ c: base.clone().setY(0.05 + hgt / 2), A: f.A, B: f.B, G: f.G, sa: w, sb: 0.021, sg: hgt, chamfer: 0.0025, uv: woodUV(rnd, w) });
      }
    }
    // trim board (outer face, under the cap) and cap rail (flat on top), bay by bay
    for (let i = 0; i < st.length - 1; i++) {
      const dA = i === 0 ? start : st[i];
      const dB = i === st.length - 2 ? end : st[i + 1];
      const dm = (dA + dB) / 2;
      const fr = frame(leg.t, UP);
      b.set({ pivot: legPoint(leg, dm, 0.097, 1.75), d: (st[i] + st[i + 1]) / 2, role: ROLE.CAP, rnd: rnd(), leg: leg.id, anim: [0, 0, 0, 0] });
      b.box({ c: legPoint(leg, dm, 0.098, 1.7025), A: fr.A, B: fr.B, G: fr.G, sa: 0.095, sb: 0.022, sg: dB - dA, chamfer: 0.003, uv: woodUV(rnd, 0.095) });
      const c0 = st[i] + 0.045, c1 = st[i + 1] - 0.045;
      b.set({ anim: [0.006, 0, 0, 0] });
      b.box({ c: legPoint(leg, (c0 + c1) / 2, 0.042, 1.765), A: fr.B, B: fr.A.clone().negate(), G: fr.G, sa: 0.15, sb: 0.03, sg: c1 - c0, chamfer: 0.004, uv: woodUV(rnd, 0.15) });
    }
  }
  return b;
}

// ------------------------------------------------------------------ 1: white PVC privacy
export function buildType1() {
  const rnd = mulberry32(1101);
  const b = new GeoBuilder({ name: 'fence-t1' });
  for (const leg of LEGS) {
    const st = postStations(leg.len, 1.93);
    const f = frame(UP, leg.t);
    const fr = frame(leg.t, UP);
    st.forEach((d, i) => {
      if (leg.id === 1 && i === 0) return;
      const base = legPoint(leg, d, 0, 0);
      b.set({ pivot: base, d, role: ROLE.POST, rnd: rnd(), leg: leg.id });
      b.box({ c: base.clone().setY((1.84 - 0.3) / 2), A: f.A, B: f.B, G: f.G, sa: 0.127, sb: 0.127, sg: 1.84 + 0.3, chamfer: 0.006, uv: { su: 1, sv: 1 } });
      // cap: skirt + pyramid
      b.set({ role: ROLE.CAP });
      b.box({ c: base.clone().setY(1.855), A: f.A, B: f.B, G: f.G, sa: 0.142, sb: 0.142, sg: 0.03, chamfer: 0.004, uv: { su: 1, sv: 1 } });
      pyramidCap(b, rnd, base.clone().setY(1.87), leg.t, 0.142, 0.03, 0.3);
    });
    for (let i = 0; i < st.length - 1; i++) {
      const d0 = st[i] + 0.0635, d1 = st[i + 1] - 0.0635, len = d1 - d0, dm = (d0 + d1) / 2;
      b.set({ pivot: legPoint(leg, d0, 0, 0.1), d: (st[i] + st[i + 1]) / 2, role: ROLE.RAIL, rnd: rnd(), leg: leg.id });
      b.box({ c: legPoint(leg, dm, 0, 0.11), A: fr.A, B: fr.B, G: fr.G, sa: 0.12, sb: 0.05, sg: len, chamfer: 0.003, uv: { su: 1, sv: 1 } });
      b.box({ c: legPoint(leg, dm, 0, 1.75), A: fr.A, B: fr.B, G: fr.G, sa: 0.1, sb: 0.05, sg: len, chamfer: 0.003, uv: { su: 1, sv: 1 } });
      // tongue-and-groove boards: V grooves from the chamfers
      const n = Math.round(len / 0.152);
      const w = len / n;
      for (let k = 0; k < n; k++) {
        const d = d0 + (k + 0.5) * w;
        const base = legPoint(leg, d, 0, 0.17);
        b.set({ pivot: base, d, role: ROLE.BOARD, rnd: rnd(), leg: leg.id });
        b.box({ c: base.clone().setY(0.17 + 1.53 / 2), A: f.A, B: f.B, G: f.G, sa: w, sb: 0.024, sg: 1.53, chamfer: 0.0035, uv: { su: 1, sv: 1 } });
      }
    }
  }
  return b;
}

// ------------------------------------------------------------------ 2: rigid welded panels
// One mesh: posts, clips, caps and horizontal wires sample the opaque centre of the wire
// texture (u = 0.03); the vertical wires are the alpha-to-coverage panel surface.
export function buildType2() {
  const rnd = mulberry32(1201);
  const b = new GeoBuilder({ name: 'fence-t2' });
  const OPAQUE = { su: 1000, sv: 1000, ou: 0.03, ov: 0.5 };
  const folds = [0.32, 0.88, 1.44];
  const y0 = 0.04, y1 = 1.73, top = 1.77; // panel bottom, top wire, picots
  const out = -0.04; // the V folds bulge toward the garden (-n)
  const prof = [[y0, 0]];
  for (const fy of folds) prof.push([fy - 0.05, 0], [fy, out], [fy + 0.05, 0]);
  prof.push([top, 0]);
  const hWires = [y0 + 0.015, 0.2, ...folds.flatMap((fy) => [fy - 0.05, fy + 0.05]), 0.6, 0.72, 1.16, 1.28, 1.62, y1];
  for (const leg of LEGS) {
    const st = postStations(leg.len, 2.52, 'ceil');
    const f = frame(UP, leg.t);
    const fr = frame(leg.t, UP);
    const pz = -0.02 - 0.006; // panel plane (garden side of the posts)
    st.forEach((d, i) => {
      if (leg.id === 1 && i === 0) return;
      const base = legPoint(leg, d, 0, 0);
      b.set({ pivot: base, d, role: ROLE.POST, rnd: rnd(), leg: leg.id });
      b.box({ c: base.clone().setY((1.8 - 0.3) / 2), A: f.A, B: f.B, G: f.G, sa: 0.06, sb: 0.04, sg: 2.1, chamfer: 0.003, uv: OPAQUE });
      b.box({ c: base.clone().setY(1.806), A: f.A, B: f.B, G: f.G, sa: 0.064, sb: 0.044, sg: 0.012, chamfer: 0.003, uv: OPAQUE });
      for (const cy of [0.22, 0.7, 1.18, 1.62]) b.box({ c: legPoint(leg, d, pz - 0.004, cy), A: f.A, B: f.B, G: f.G, sa: 0.05, sb: 0.014, sg: 0.03, chamfer: 0.003, uv: OPAQUE });
    });
    for (let i = 0; i < st.length - 1; i++) {
      const d0 = st[i] + 0.012, d1 = st[i + 1] - 0.012, len = d1 - d0, dm = (d0 + d1) / 2;
      b.set({ pivot: legPoint(leg, dm, pz, 0), d: dm, role: ROLE.BOARD, rnd: rnd(), leg: leg.id });
      // folded panel surface (vertical wires: texture, u = 1 cell per 5 cm)
      for (let k = 0; k < prof.length - 1; k++) {
        const [ya, oa] = prof[k], [yb, ob] = prof[k + 1];
        const p0 = legPoint(leg, d0, pz + oa, ya), p1 = legPoint(leg, d1, pz + oa, ya);
        const p2 = legPoint(leg, d1, pz + ob, yb), p3 = legPoint(leg, d0, pz + ob, yb);
        const nrm = new THREE.Vector3().crossVectors(p1.clone().sub(p0), p3.clone().sub(p0)).normalize();
        b.quad(p0, p1, p2, p3, { uv: [[0, ya], [len / 0.05, ya], [len / 0.05, yb], [0, yb]], normal: nrm });
      }
      // horizontal wires (on the garden side of the verticals)
      for (const hy of hWires) {
        let o = 0;
        for (let k = 0; k < prof.length - 1; k++) {
          const [ya, oa] = prof[k], [yb, ob] = prof[k + 1];
          if (hy >= ya && hy <= yb) o = oa + ((ob - oa) * (hy - ya)) / (yb - ya);
        }
        b.box({ c: legPoint(leg, dm, pz + o - 0.005, hy), A: fr.A, B: fr.B, G: fr.G, sa: 0.005, sb: 0.005, sg: len, uv: OPAQUE, caps: [false, false] });
      }
    }
  }
  return b;
}

// ------------------------------------------------------------------ 3: ranch, black boards
export function buildType3() {
  const rnd = mulberry32(1301);
  const wood = new GeoBuilder({ name: 'fence-t3' });
  const mesh = new GeoBuilder({ name: 'fence-t3-mesh' });
  for (const leg of LEGS) {
    const st = postStations(leg.len, 2.4);
    const fr = frame(leg.t, UP);
    st.forEach((d, i) => {
      if (leg.id === 1 && i === 0) return;
      const base = legPoint(leg, d, 0, 0);
      wood.set({ pivot: base, d, role: ROLE.POST, rnd: rnd(), leg: leg.id });
      postBox(wood, rnd, base.clone().setY(-0.3), leg.t, 0.1, 0.1, 1.27 + 0.3, 0.005);
      pyramidCap(wood, rnd, base.clone().setY(1.27), leg.t, 0.1, 0.035, 0.45);
    });
    // three boards on the outer face, each spanning two bays, joints staggered by row
    [0.42, 0.84, 1.2].forEach((y, row) => {
      const startIdx = row % 2;
      const idx = [0];
      for (let i = startIdx === 1 ? 1 : 2; i < st.length - 1; i += 2) idx.push(i);
      idx.push(st.length - 1);
      for (let j = 0; j < idx.length - 1; j++) {
        const da = st[idx[j]] - (j === 0 ? 0.05 : 0.003), db = st[idx[j + 1]] + (j === idx.length - 2 ? 0.05 : -0.003);
        const dm = (da + db) / 2;
        wood.set({ pivot: legPoint(leg, da, 0.066, y), d: dm, role: ROLE.RAIL, rnd: rnd(), leg: leg.id });
        wood.box({ c: legPoint(leg, dm, 0.066, y), A: fr.A, B: fr.B, G: fr.G, sa: 0.15, sb: 0.032, sg: db - da, chamfer: 0.004, uv: woodUV(rnd, 0.15) });
      }
    });
    // black welded mesh (10 x 5 cm) on the garden face of the posts, ground to 1.0 m
    for (let i = 0; i < st.length - 1; i++) {
      const d0 = st[i], d1 = st[i + 1], dm = (d0 + d1) / 2;
      mesh.set({ pivot: legPoint(leg, dm, -0.053, 0), d: dm, role: ROLE.BOARD, rnd: rnd(), leg: leg.id });
      const y0 = 0.02, y1 = 1.0;
      mesh.quad(legPoint(leg, d0, -0.053, y0), legPoint(leg, d1, -0.053, y0), legPoint(leg, d1, -0.053, y1), legPoint(leg, d0, -0.053, y1), {
        uv: [[d0 / 0.1, y0 / 0.05], [d1 / 0.1, y0 / 0.05], [d1 / 0.1, y1 / 0.05], [d0 / 0.1, y1 / 0.05]],
        normal: leg.n.clone().negate(),
      });
    }
  }
  return { wood, mesh };
}

// ------------------------------------------------------------------ 4: ganivelle (chestnut)
export function buildType4() {
  const rnd = mulberry32(1401);
  const wood = new GeoBuilder({ name: 'fence-t4' });
  const wire = new GeoBuilder({ name: 'fence-t4-wire', rm: true, color: true });
  wire.set({ color: [0.6, 0.61, 0.62], rm: [0.38, 1] });
  const rows = [0.12, 0.46, 0.8, 1.1];
  const split = { su: 0.3, sv: 2.4 };
  for (const leg of LEGS) {
    const st = postStations(leg.len, 2.0);
    const f = frame(UP, leg.t);
    // round posts (bark on), slightly pointed tops
    st.forEach((d, i) => {
      if (leg.id === 1 && i === 0) return;
      const base = legPoint(leg, d, 0, 0);
      wood.set({ pivot: base, d, role: ROLE.POST, rnd: rnd(), leg: leg.id });
      const r = 0.045 + rnd() * 0.008;
      const ou = 0.64 + rnd() * 0.2;
      wood.cylinder({ origin: base.clone().setY(-0.3), A: f.A, B: f.B, G: f.G, r, len: 1.56, n: 9, uv: { su: 0.3 * 2.2, sv: 2.4, ou, ov: rnd() }, caps: [false, false] });
      const poly = [];
      for (let k = 0; k < 9; k++) poly.push([Math.cos((k / 9) * Math.PI * 2) * r, Math.sin((k / 9) * Math.PI * 2) * r]);
      wood.prism({ origin: base.clone().setY(1.26), A: f.A, B: f.B, G: f.G, poly, len: 0.06, scaleEnd: 0.35, smooth: true, uv: { su: 0.3, sv: 2.4, ou: 0.1, ov: rnd() }, caps: [false, true] });
    });
    // split stakes on the outer face of the posts
    const o = 0.068;
    const stakes = [];
    for (let x = 0.04; x < leg.len - 0.02; x += 0.08) {
      if (leg.id === 1 && x < 0.08) continue;
      const d = x + (rnd() - 0.5) * 0.012;
      const w = 0.026 + rnd() * 0.02, t = 0.016 + rnd() * 0.01;
      stakes.push({ d, w, t });
    }
    for (const s of stakes) {
      const base = legPoint(leg, s.d, o, 0.02 + rnd() * 0.02);
      const h = 1.16 + rnd() * 0.05;
      const tilt = (rnd() - 0.5) * 0.035;
      const G = UP.clone().addScaledVector(leg.t, tilt).addScaledVector(leg.n, (rnd() - 0.5) * 0.02).normalize();
      const fr = frame(G, leg.t.clone().applyAxisAngle(UP, (rnd() - 0.5) * 0.4));
      // irregular split section (a wedge with a bark back)
      const a = s.w / 2, bt = s.t / 2;
      const poly = [[-a, -bt * 0.6], [a * 0.2 + (rnd() - 0.5) * a * 0.3, -bt], [a, -bt * 0.3], [a * 0.75, bt], [-a * 0.7, bt * 0.85]];
      wood.set({ pivot: base, d: s.d, role: ROLE.BOARD, rnd: rnd(), leg: leg.id });
      const barkFace = rnd() < 0.32;
      const ou = barkFace ? 0.635 + rnd() * 0.2 : rnd() * 0.45;
      const tip = 0.035 + rnd() * 0.04;
      wood.prism({ origin: base, A: fr.A, B: fr.B, G: fr.G, poly, len: h - tip, uv: { ...split, ou, ov: rnd() }, caps: [true, false] });
      // roughly pointed top: the apex is off-centre (split, then trimmed with a billhook)
      const off = (rnd() - 0.5) * a * 1.1;
      wood.prism({ origin: base.clone().addScaledVector(fr.G, h - tip), A: fr.A, B: fr.B, G: fr.G, poly, len: tip, scaleEnd: 0.15 + rnd() * 0.25, endShift: [off, 0], uv: { ...split, ou, ov: rnd() }, caps: [false, true] });
      s.base = base;
      s.G = G;
    }
    // twisted wire pairs: one strand in front of a stake and behind the next, and vice versa
    for (let k = 0; k < stakes.length - 1; k++) {
      const s0 = stakes[k], s1 = stakes[k + 1];
      for (const y of rows) {
        const dm = (s0.d + s1.d) / 2;
        wire.set({ pivot: legPoint(leg, dm, o, 0), d: dm, role: ROLE.STATIC, rnd: rnd(), leg: leg.id });
        for (const side of [-1, 1]) {
          const pa = legPoint(leg, s0.d, o + side * (s0.t / 2 + 0.002), y + (rnd() - 0.5) * 0.004);
          const pb = legPoint(leg, s1.d, o - side * (s1.t / 2 + 0.002), y + (rnd() - 0.5) * 0.004);
          const G = pb.clone().sub(pa);
          const len = G.length();
          G.normalize();
          const fw = frame(G, UP);
          const r = 0.0017;
          wire.prism({ origin: pa, A: fw.A, B: fw.B, G: fw.G, poly: [[-r, -r], [r, -r], [r, r], [-r, r]], len, caps: [false, false], uv: { su: 1, sv: 1 } });
        }
      }
    }
  }
  return { wood, wire };
}

export const TYPE_HEIGHT = HEIGHTS;
