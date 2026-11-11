// Chapter 1 site kit (type 0 is built in types.js): what the yard looks like while the fence
// goes up, all driven by the install progress through the roles of material.js.
//   per post: orange paint dot, open hole, spoil heap with a little gravel, concrete collar
//   survey flags (red electricity, orange telecom, yellow gas) on wire stems
//   pine stakes wrapped in pink flagging tape and the orange string line along the right leg
//   a pallet with the board stack (the stack is Douglas: built into the type-0 geometry),
//   plain concrete bags, a wheelbarrow, a post-hole auger and a spirit level
// Builders: kit (vertex colours, per-vertex roughness / metalness), pine (pallet, stakes),
// string (camera-facing ribbon), and boards for the stack (appended to type 0).
import * as THREE from 'three';
import { GeoBuilder, V } from './geom.js';
import { LEGS, UP, legPoint, frame, postStations, GROUND } from './layout.js';
import { ROLE } from './material.js';
import { mulberry32 } from './noise.js';
import { woodUV } from './types.js';

const lin = (r, g, b) => [Math.pow(r / 255, 2.2), Math.pow(g / 255, 2.2), Math.pow(b / 255, 2.2)];
export const KIT_COLORS = {
  soil: lin(118, 94, 70),
  soilDark: lin(70, 54, 40),
  hole: lin(22, 16, 12),
  concrete: lin(140, 138, 130),
  gravel: lin(150, 146, 138),
  paint: [1.0, 0.16, 0.012],
  red: lin(222, 28, 26),
  orange: lin(255, 118, 12),
  yellow: lin(255, 208, 10),
  pink: [1.0, 0.09, 0.42],
  galv: lin(178, 180, 182),
  steel: lin(120, 122, 126),
  black: lin(24, 24, 26),
  rubber: lin(30, 30, 31),
  kraft: lin(168, 136, 96),
  bagGrey: lin(150, 148, 142),
  alu: lin(196, 198, 202),
  levelYellow: lin(240, 196, 30),
  vial: lin(150, 220, 60),
  wood: lin(196, 160, 112),
};

// flag positions (survey: utilities marked before digging) [x, z, colour]
const FLAGS = [
  // red: buried power line toward the garden light, crossing in front of the hero camera
  // (kept right of the hero headline: the line runs from near the right edge toward the house)
  [7.05, 11.6, 'red'], [6.7, 9.9, 'red'], [6.35, 8.0, 'red'], [5.95, 6.0, 'red'], [5.55, 4.0, 'red'], [5.2, 2.0, 'red'], [4.85, 0.0, 'red'],
  // orange: telecom, crossing the fence line near d = 20
  [8.55, -1.9, 'orange'], [7.35, -2.4, 'orange'], [6.15, -2.9, 'orange'],
  // yellow: gas, toward the house
  [5.2, -1.0, 'yellow'], [4.8, -3.2, 'yellow'], [4.4, -5.4, 'yellow'], [4.0, -7.6, 'yellow'], [3.6, -9.8, 'yellow'],
];
// stakes with pink flagging tape along the string line (d on the right leg)
const STAKES_D = [-0.45, 5.4, 44.45]; // the middle one stands in the hero's foreground, right edge
const STRING = { o: 0.058, y: 0.33 };

export function buildInstallKit() {
  const rnd = mulberry32(2001);
  const kit = new GeoBuilder({ name: 'install-kit', color: true, rm: true });
  const pine = new GeoBuilder({ name: 'install-pine' });
  const stack = new GeoBuilder({ name: 'install-stack' });
  const C = KIT_COLORS;
  const L = GROUND.lift;

  // ---------------------------------------------------------------- per post
  for (const leg of LEGS) {
    const st = postStations(leg.len, 2.0);
    st.forEach((d, i) => {
      if (leg.id === 1 && i === 0) return;
      const base = legPoint(leg, d, 0, 0);
      const r0 = rnd();
      // paint dot (irregular spray)
      kit.set({ pivot: base, d, role: ROLE.DOT, rnd: r0, leg: leg.id, color: C.paint, rm: [0.7, 0] });
      const k1 = rnd() * 6.28, k2 = rnd() * 6.28;
      kit.mound({ c: base, radius: (a) => 0.055 * (1 + 0.22 * Math.sin(a * 3 + k1) + 0.12 * Math.sin(a * 7 + k2)), height: () => 0, y0: 0.013 + L * 1.3, rings: 1, segs: 14 });
      // open hole
      kit.set({ role: ROLE.HOLE, color: C.hole, rm: [0.95, 0] });
      kit.mound({ c: base, radius: 0.14, height: (rn) => -0.004 * rn, y0: 0.006 + L, rings: 2, segs: 14 });
      // spoil heap on the garden side, and gravel
      const side = leg.n.clone().negate();
      const mc = base.clone().addScaledVector(side, 0.34 + rnd() * 0.08).addScaledVector(leg.t, (rnd() - 0.5) * 0.25);
      kit.set({ pivot: mc, role: ROLE.MOUND, color: C.soil, rm: [0.97, 0] });
      const m1 = rnd() * 6.28, m2 = rnd() * 6.28;
      const mh = 0.05 + rnd() * 0.025;
      // crumbly spoil: a lumpy heap (several frequencies), clods scattered around it
      const m3 = rnd() * 6.28;
      kit.mound({
        c: mc,
        radius: (a) => 0.21 * (1 + 0.25 * Math.sin(a * 2 + m1) + 0.1 * Math.sin(a * 5 + m2) + 0.06 * Math.sin(a * 11 + m3)),
        height: (rn, a) =>
          mh * Math.pow(Math.max(0, 1 - rn * rn), 1.2) * (1 + 0.32 * Math.sin(a * 4 + m2) * rn + 0.22 * Math.sin(a * 9 + m1) * rn + 0.16 * Math.sin(a * 17 + m3 + rn * 7) * Math.sin(rn * 9.4 + m1)) + 0.004 + L * (1 - rn * 0.5),
        rings: 6,
        segs: 24,
      });
      for (let g = 0; g < 9; g++) {
        const a = rnd() * 6.28, r = 0.12 + rnd() * 0.22;
        const p = mc.clone().add(V(Math.cos(a) * r, 0, Math.sin(a) * r));
        const sz = 0.014 + rnd() * 0.022;
        kit.set({ color: (rnd() < 0.5 ? C.soil : C.soilDark).map((c) => c * (0.85 + rnd() * 0.3)), rm: [0.97, 0] });
        const f = frame(V(rnd() - 0.5, 1, rnd() - 0.5), V(rnd() - 0.5, 0, rnd() - 0.5).add(V(0.001, 0, 0)));
        kit.box({ c: p.setY(sz * 0.35 + L), A: f.A, B: f.B, G: f.G, sa: sz * (1 + rnd() * 0.6), sb: sz, sg: sz * 0.75, chamfer: sz * 0.35, uv: { su: 1, sv: 1 } });
      }
      kit.set({ color: C.soilDark });
      kit.mound({ c: base.clone().addScaledVector(side, 0.17), radius: 0.12, height: (rn) => 0.012 * (1 - rn), y0: 0.003 + L, rings: 1, segs: 10 });
      for (let g = 0; g < 7; g++) {
        const p = mc.clone().add(V((rnd() - 0.5) * 0.6, 0, (rnd() - 0.5) * 0.6));
        const s = 0.008 + rnd() * 0.012;
        kit.set({ color: C.gravel.map((c) => c * (0.8 + rnd() * 0.4)), rm: [0.8, 0] });
        const f = frame(V(rnd() - 0.5, 1, rnd() - 0.5), V(1, 0, 0));
        kit.box({ c: p.setY(s * 0.4 + L), A: f.A, B: f.B, G: f.G, sa: s * 1.4, sb: s, sg: s * 0.8, chamfer: s * 0.3, uv: { su: 1, sv: 1 } });
      }
      // concrete collar (crowned to shed water)
      kit.set({ pivot: base, role: ROLE.COLLAR, color: C.concrete.map((c) => c * (0.94 + rnd() * 0.08)), rm: [0.93, 0] });
      kit.mound({ c: base, radius: (a) => 0.15 * (1 + 0.06 * Math.sin(a * 3 + k1)), height: (rn, a) => 0.042 * (1 - rn * rn) * (1 + 0.1 * Math.sin(a * 5 + k2) * rn) + 0.004 + L * (1 - rn * 0.6), rings: 4, segs: 16 });
    });
  }

  // ---------------------------------------------------------------- survey flags
  FLAGS.forEach(([x, z, col], i) => {
    const base = V(x, 0, z);
    const lean = V((rnd() - 0.5) * 0.12, 1, (rnd() - 0.5) * 0.12).normalize();
    const h = 0.68 + rnd() * 0.08;
    const order = 0.02 + (i / FLAGS.length) * 0.16;
    kit.set({ pivot: base, d: 0, role: ROLE.FLAG, rnd: rnd(), leg: 0, anim: [order, 0, 0, 0], color: C.galv, rm: [0.4, 1] });
    const f = frame(lean, V(1, 0, 0));
    kit.cylinder({ origin: base.clone().setY(-0.15), A: f.A, B: f.B, G: f.G, r: 0.0014, len: h + 0.15, n: 4, uv: { su: 1, sv: 1 } });
    // the flag: a 10 x 9 cm sheet along the top of the stem, fluttering
    const top = base.clone().addScaledVector(lean, h);
    const ang = rnd() * Math.PI * 2;
    const dir = V(Math.cos(ang), 0, Math.sin(ang));
    const perp = V(-dir.z, 0, dir.x);
    kit.set({ pivot: top, color: C[col], rm: [0.55, 0], anim: [order, 0.22, perp.x, perp.z] });
    kit.sheet((u, v) => top.clone().addScaledVector(dir, u * 0.13).addScaledVector(lean, -v * 0.105 + u * 0.004).addScaledVector(perp, Math.sin(u * 3.0) * 0.008), 4, 2);
  });

  // ---------------------------------------------------------------- stakes, tape, string
  const leg0 = LEGS[0];
  STAKES_D.forEach((d, i) => {
    const base = legPoint(leg0, d, STRING.o + 0.03, 0);
    const order = 0.22 + i * 0.02;
    pine.set({ pivot: base, d: 0, role: ROLE.PROP, rnd: rnd(), leg: 0, anim: [order, 0, 0, 0] });
    const f = frame(UP, leg0.t);
    const uv = woodUV(rnd, 0.045);
    pine.box({ c: base.clone().setY(0.42), A: f.A, B: f.B, G: f.G, sa: 0.045, sb: 0.045, sg: 0.92, chamfer: 0.003, uv });
    pine.prism({ origin: base.clone().setY(0.88), A: f.A, B: f.B, G: f.G, poly: [[-0.0225, -0.0225], [0.0225, -0.0225], [0.0225, 0.0225], [-0.0225, 0.0225]], len: 0.03, scaleEnd: 0.7, uv });
    // tape: a wrapped band and two tails
    kit.set({ pivot: base.clone().setY(0.8), d: 0, role: ROLE.FLAG, rnd: rnd(), leg: 0, anim: [order, 0, 0, 0], color: C.pink, rm: [0.6, 0] });
    kit.box({ c: base.clone().setY(0.8), A: f.A, B: f.B, G: f.G, sa: 0.05, sb: 0.05, sg: 0.06, uv: { su: 1, sv: 1 } });
    for (let k = 0; k < 2; k++) {
      const a = (k ? 0.6 : -0.4) + rnd() * 0.5;
      const dir = V(Math.cos(a) * leg0.n.x + Math.sin(a) * leg0.t.x, 0, Math.cos(a) * leg0.n.z + Math.sin(a) * leg0.t.z).normalize();
      const L = 0.32 + rnd() * 0.2;
      const att = base.clone().setY(0.8).addScaledVector(dir, 0.025);
      const perp = V(-dir.z, 0, dir.x);
      kit.set({ pivot: att, anim: [order, 0.06, perp.x, perp.z] });
      kit.sheet((u, v) => att.clone().addScaledVector(dir, v * L * 0.35).add(V(0, -v * L * 0.94 + 0.03 * (u - 0.5), 0)).addScaledVector(perp, (u - 0.5) * 0.025 + Math.sin(v * 5 + k) * 0.03 * v), 1, 6);
    }
  });
  // string line: taut between the end stakes, a little sag either side of the middle stake
  const string = new GeoBuilder({ name: 'install-string' });
  {
    const d0 = STAKES_D[0], d1 = STAKES_D[2], dm = STAKES_D[1];
    const N = 90;
    for (let i = 0; i <= N; i++) {
      const d = d0 + ((d1 - d0) * i) / N;
      const span = d < dm ? [d0, dm] : [dm, d1];
      const t = (d - span[0]) / (span[1] - span[0]);
      const sag = 4 * t * (1 - t) * 0.012 * ((span[1] - span[0]) / 20);
      const p = legPoint(leg0, d, STRING.o, STRING.y + 0.47 * 0 - sag);
      for (const side of [-1, 1]) {
        string.set({ pivot: p, d: 0, role: ROLE.STRING, rnd: 0.5, leg: 0, anim: [0.2, 0, side, 0.0011] });
        string.vert(p, UP, i / N, side > 0 ? 1 : 0);
      }
    }
    for (let i = 0; i < N; i++) {
      const a = i * 2;
      string.quadIdx(a, a + 2, a + 3, a + 1);
    }
  }

  // ---------------------------------------------------------------- pallet and board stack
  const pc = V(6.75, 0, -3.7); // pallet centre (long side along z)
  const pal = (c, sx, sy, sz, grainAlongZ) => {
    const G = grainAlongZ ? V(0, 0, 1) : V(1, 0, 0);
    const A = grainAlongZ ? V(1, 0, 0) : V(0, 0, -1);
    const f = frame(G, A);
    pine.box({ c, A: f.A, B: f.B, G: f.G, sa: grainAlongZ ? sx : sz, sb: sy, sg: grainAlongZ ? sz : sx, chamfer: 0.003, uv: woodUV(rnd, 0.14) });
  };
  pine.set({ pivot: pc, d: 0, role: ROLE.PROP, rnd: rnd(), leg: 0, anim: [0.72, 0, 0, 0] });
  for (const x of [-0.35, 0, 0.35]) pal(V(pc.x + x, 0.011, pc.z), 0.1, 0.022, 1.2, true);
  for (const x of [-0.35, 0, 0.35]) for (const z of [-0.53, 0, 0.53]) pine.box({ c: V(pc.x + x, 0.022 + 0.039, pc.z + z), A: V(1, 0, 0), B: V(0, 1, 0), G: V(0, 0, 1), sa: 0.1, sb: 0.078, sg: 0.145, chamfer: 0.004, uv: woodUV(rnd, 0.1) });
  for (const z of [-0.53, 0, 0.53]) pal(V(pc.x, 0.111, pc.z + z), 0.8, 0.022, 0.145, false);
  for (const x of [-0.345, -0.17, 0, 0.17, 0.345]) pal(V(pc.x + x, 0.133, pc.z), x === 0 || Math.abs(x) > 0.3 ? 0.145 : 0.1, 0.022, 1.2, true);
  // stack: 7 layers of 5 boards (1.8 m), the top layers are used first
  const layers = 7;
  const gz = frame(V(0, 0, 1), V(1, 0, 0));
  for (let l = 0; l < layers; l++) {
    for (let k = 0; k < 5; k++) {
      const c = V(pc.x - 0.29 + k * 0.145 + (rnd() - 0.5) * 0.006, 0.144 + 0.0105 + l * 0.0215, pc.z + (rnd() - 0.5) * 0.02);
      stack.set({ pivot: c, d: 0, role: ROLE.STACK, rnd: rnd(), leg: 0, anim: [l / (layers - 1), 0.7, 0, 0] });
      stack.box({ c, A: gz.A, B: gz.B, G: gz.G, sa: 0.143, sb: 0.021, sg: 1.8, chamfer: 0.0025, uv: woodUV(rnd, 0.145) });
    }
  }

  // ---------------------------------------------------------------- concrete bags
  const bag = (c, yaw, color, full = 1) => {
    const G = V(Math.cos(yaw), 0, Math.sin(yaw));
    const f = frame(G, UP);
    const w = 0.4, h = 0.12 * full;
    // pillow section in (A = up, B = across), counter-clockwise
    const poly = [];
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const s = Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), 0.8), t = Math.sign(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), 0.55);
      poly.push([s * h * 0.5, t * w * 0.5]);
    }
    kit.set({ color, rm: [0.96, 0] });
    const start = c.clone().addScaledVector(G, -0.3);
    const S = 0.55;
    kit.prism({ origin: start, A: f.A, B: f.B, G: f.G, poly: poly.map(([a, b]) => [a * S, b * S]), len: 0.05, scaleEnd: 1 / S, uv: { su: 1, sv: 1 }, caps: [true, false] });
    kit.prism({ origin: start.clone().addScaledVector(G, 0.05), A: f.A, B: f.B, G: f.G, poly, len: 0.5, uv: { su: 1, sv: 1 }, caps: [false, false] });
    kit.prism({ origin: start.clone().addScaledVector(G, 0.55), A: f.A, B: f.B, G: f.G, poly, len: 0.05, scaleEnd: S, uv: { su: 1, sv: 1 }, caps: [false, true] });
  };
  const bc = V(7.45, 0, -6.15);
  kit.set({ pivot: bc, d: 0, role: ROLE.PROP, rnd: rnd(), leg: 0, anim: [0.55, 0, 0, 0] });
  bag(bc.clone().setY(0.06), 1.62, C.bagGrey);
  bag(bc.clone().setY(0.18).add(V(0.03, 0, 0.02)), 1.5, C.bagGrey);
  bag(bc.clone().setY(0.06).add(V(-0.44, 0, 0.05)), 1.7, C.bagGrey);
  kit.set({ anim: [0.5, 0, 0, 0] });
  bag(bc.clone().setY(0.025).add(V(-0.3, 0, -0.62)), 0.9, C.kraft, 0.4); // the open, empty one

  // ---------------------------------------------------------------- wheelbarrow
  {
    const wc = V(7.75, 0, -8.7);
    const yaw = -0.18; // nose toward -z
    const R = new THREE.Matrix4().makeRotationY(yaw);
    const P = (x, y, z) => V(x, y, z).applyMatrix4(R).add(wc);
    kit.set({ pivot: wc, d: 0, role: ROLE.PROP, rnd: rnd(), leg: 0, anim: [0.62, 0, 0, 0], color: C.galv, rm: [0.42, 0.9] });
    // tray: top rim 0.62 x 0.95, bottom 0.36 x 0.55, from y 0.34 to 0.62 (local z: -front)
    const yb = 0.36, yt = 0.64;
    const tb = [[-0.18, yb, -0.26], [0.18, yb, -0.26], [0.18, yb, 0.3], [-0.18, yb, 0.3]];
    const tt = [[-0.31, yt, -0.52], [0.31, yt, -0.52], [0.31, yt, 0.43], [-0.31, yt, 0.43]];
    const q = (a, b2, c, d) => kit.quad(P(...a), P(...b2), P(...c), P(...d), { doubleSided: true, uv: [[0, 0], [1, 0], [1, 1], [0, 1]] });
    q(tb[0], tb[1], tb[2], tb[3]);
    for (let k = 0; k < 4; k++) q(tb[k], tt[k], tt[(k + 1) % 4], tb[(k + 1) % 4]);
    // rolled rim
    const rim = [...tt, tt[0]].map((p) => P(...p));
    kit.tube({ pts: rim, r: 0.012, n: 6 });
    // concrete residue in the bottom
    kit.set({ color: C.concrete.map((c) => c * 0.9), rm: [0.9, 0] });
    kit.mound({ c: P(0, yb, 0.02), radius: 0.17, height: (rn) => 0.035 * (1 - rn * rn), rings: 2, segs: 10 });
    // handles (steel tubes with black grips), legs, wheel
    kit.set({ color: C.steel, rm: [0.5, 0.85] });
    for (const sx of [-1, 1]) {
      kit.tube({ pts: [P(sx * 0.16, 0.24, -0.58), P(sx * 0.2, 0.33, -0.2), P(sx * 0.24, 0.42, 0.4), P(sx * 0.27, 0.52, 0.95)], r: 0.017, n: 6 });
      kit.tube({ pts: [P(sx * 0.2, 0.34, 0.25), P(sx * 0.22, 0.01, 0.33)], r: 0.013, n: 5 });
      kit.set({ color: C.black, rm: [0.7, 0] });
      kit.tube({ pts: [P(sx * 0.265, 0.505, 0.85), P(sx * 0.275, 0.53, 1.02)], r: 0.022, n: 6, caps: [true, true] });
      kit.set({ color: C.steel, rm: [0.5, 0.85] });
    }
    const axle = P(0, 0.2, -0.62);
    const ax = V(1, 0, 0).applyMatrix4(R);
    // tyre: a torus around the axle
    kit.set({ color: C.rubber, rm: [0.85, 0] });
    const ring = [];
    for (let k = 0; k <= 20; k++) {
      const a = (k / 20) * Math.PI * 2;
      ring.push(axle.clone().add(V(0, Math.sin(a) * 0.155, 0)).addScaledVector(V(0, 0, 1).applyMatrix4(R), Math.cos(a) * 0.155));
    }
    kit.tube({ pts: ring, r: 0.045, n: 8 });
    kit.set({ color: C.steel, rm: [0.45, 0.9] });
    kit.cylinder({ origin: axle.clone().addScaledVector(ax, -0.05), A: V(0, 1, 0), B: V(0, 0, 1).applyMatrix4(R), G: ax, r: 0.11, len: 0.1, n: 12, uv: { su: 1, sv: 1 } });
  }

  // ---------------------------------------------------------------- post-hole auger
  {
    const base = V(8.25, 0, -14.4);
    const lean = V(-0.09, 1, 0.05).normalize();
    kit.set({ pivot: base, d: 0, role: ROLE.PROP, rnd: rnd(), leg: 0, anim: [0.4, 0, 0, 0], color: C.steel, rm: [0.4, 0.95] });
    const f = frame(lean, V(1, 0, 0));
    kit.cylinder({ origin: base.clone().setY(-0.25), A: f.A, B: f.B, G: f.G, r: 0.012, len: 1.35, n: 6, uv: { su: 1, sv: 1 } });
    const top = base.clone().setY(-0.25).addScaledVector(lean, 1.35);
    kit.set({ color: C.black, rm: [0.7, 0] });
    kit.tube({ pts: [top.clone().addScaledVector(f.A, -0.3), top.clone().addScaledVector(f.A, 0.3)], r: 0.018, n: 8, caps: [true, true] });
    kit.set({ color: C.soil, rm: [0.96, 0] });
    kit.mound({ c: base.clone().add(V(-0.25, 0, 0.12)), radius: 0.22, height: (rn) => 0.07 * (1 - rn * rn), rings: 3, segs: 12 });
  }

  // ---------------------------------------------------------------- spirit level against the pallet
  {
    const c = V(pc.x + 0.5, 0, pc.z + 0.25);
    const G = V(0.38, 0, -1).normalize();
    const f = frame(G, V(0, 1, 0));
    kit.set({ pivot: c, d: 0, role: ROLE.PROP, rnd: rnd(), leg: 0, anim: [0.8, 0, 0, 0], color: C.alu, rm: [0.35, 0.9] });
    const ctr = c.clone().setY(0.03);
    kit.box({ c: ctr, A: f.A, B: f.B, G: f.G, sa: 0.06, sb: 0.024, sg: 1.2, chamfer: 0.002, uv: { su: 1, sv: 1 } });
    kit.set({ color: C.levelYellow, rm: [0.5, 0] });
    for (const t of [-0.45, 0, 0.45]) {
      kit.box({ c: ctr.clone().addScaledVector(G, t), A: f.A, B: f.B, G: f.G, sa: 0.04, sb: 0.026, sg: 0.07, uv: { su: 1, sv: 1 } });
    }
    kit.set({ color: C.vial, rm: [0.15, 0] });
    kit.box({ c: ctr.clone().addScaledVector(G, 0).add(V(0, 0.0005, 0)), A: f.A, B: f.B, G: f.G, sa: 0.016, sb: 0.0275, sg: 0.04, uv: { su: 1, sv: 1 } });
  }

  return { kit, pine, string, stack, stakesD: STAKES_D, flags: FLAGS };
}
