// BALANCIER watch: the automatic movement (Ø 26.2 mm): perlage mainplate, gilded train (barrel, centre,
// third, fourth wheels, steel escape wheel), the balance wheel with its breathing hairspring and the pallet
// fork, bridges with Côtes de Genève and polished bevels, gold chatons with ruby jewels, blued screws, and
// the skeletonised rotor engraved « BALANCIER ».
import * as THREE from 'three';
import { lathe, extrude, splitGroups, merge, gearShape, strokeShape, hullShape, sectorShape, sectorPath, circleShape, circlePath, planarUV, setTangents, screwHead, polyShape, transformed, TAU } from './geo.js';

// layout in the watch's xy (seen from the front; from the back x is mirrored)
export const MV = {
  r: 13.1,
  barrel: [3.6, 5.6], centre: [0, 0], third: [-5.4, -2.2], fourth: [-3.4, -6.4], escape: [0.3, -4.6],
  pallet: [2.8, -2.8], balance: [5.6, -5.0],
  balanceR: 4.45,
};
const at = (g, [x, y], z = 0) => { g.translate(x, y, z); return g; };

export function buildMainplate(ctx, obj) {
  const { Q, add } = ctx;
  const plate = lathe([[0, -0.55], [MV.r, -0.55], [MV.r, 0.55], [0, 0.55]], { segments: Q.seg, crease: 0.5 });
  planarUV(plate, 1 / ctx.D.movement);
  add('mainplate.plate', 'rhodium', plate, obj, 'perlage');
  // lower jewels of the train (seen between the wheels from the back), in gold chatons
  const jewels = [], chatons = [];
  for (const p of [MV.third, MV.fourth, MV.escape, MV.pallet, MV.balance]) {
    jewels.push(at(lathe([[0, -0.08], [0.08, -0.06], [0.2, -0.1], [0.42, -0.06], [0.42, 0]], { segments: 20, crease: 0.4 }), p, -0.56));
    chatons.push(at(lathe([[0.42, -0.03], [0.7, -0.03], [0.7, 0.0]], { segments: 24 }), p, -0.56));
  }
  add('mainplate.jewels', 'ruby', merge(jewels), obj);
  add('mainplate.chatons', 'gilt', merge(chatons), obj);
  // dial side: the motion works (hour and minute wheels) and the keyless works (setting lever, yoke)
  const works = [];
  const hw = extrude(gearShape({ r: 2.6, teeth: 48, hole: 0.7, h: 0.22 }), 0.14, { bevel: 0.02, curveSegments: 4 });
  hw.translate(0, 0, 0.6);
  const mw = extrude(gearShape({ r: 1.7, teeth: 30, hole: 0.25, h: 0.2, spokes: 0 }), 0.14, { bevel: 0.02, curveSegments: 4 });
  mw.translate(2.6, -3.04, 0.6);
  const lever = extrude(strokeShape([[5.6, 1.6], [10.2, 0.9], [11.6, -2.2]], [0.75, 0.55, 0.7], [[5.6, 1.6, 0.3]]), 0.14, { bevel: 0.03 });
  lever.translate(0, 0, 0.6);
  const yoke = extrude(strokeShape([[6.8, -1.4], [9.0, -3.2], [11.9, -4.4]], [0.55, 0.45, 0.6], [[6.8, -1.4, 0.25]]), 0.14, { bevel: 0.03 });
  yoke.translate(0, 0, 0.6);
  const cannon = lathe([[0.55, 0.5], [0.55, 1.0], [0.3, 1.05], [0, 1.05]], { segments: 24 });
  works.push(hw, mw, lever, yoke, cannon);
  const wg = merge(works);
  setTangents(wg, (x, y) => [x, y, 0]);
  add('mainplate.works', 'steelBrushed', wg, obj, 'snailed');
  const fs = [];
  for (const [x, y] of [[8.4, 1.3], [9.4, -3.9], [-6.5, 7.8]]) {
    const sc = screwHead(0.5, 0.25, { segments: Q.screwSeg, slot: 0.14 });
    sc.rotateZ(x + y);
    sc.translate(x, y, 0.55);
    fs.push(sc);
  }
  add('mainplate.screws', 'blued', merge(fs), obj);
}

function wheel(ctx, { r, teeth, spokes, depth = 0.22, pinion = 0.75, arbor = 1.6, escape = false, hub = 0.85 }) {
  const g = extrude(gearShape({ r, teeth, spokes, spokeW: Math.max(0.32, r * 0.09), rim: Math.max(0.35, r * 0.1), hub, hole: 0, escape }), depth, { bevel: 0.03, curveSegments: 4 });
  const pin = extrude(gearShape({ r: pinion, teeth: 8, hole: 0, h: 0.22 }), arbor * 0.5, { bevel: 0.02 });
  pin.translate(0, 0, arbor * 0.25);
  const arb = lathe([[0.16, -arbor * 0.5], [0.16, arbor * 0.5], [0, arbor * 0.5]], { segments: 12 });
  return merge([g, pin, arb]);
}

export function buildTrain(ctx, obj) {
  const { add, sub } = ctx;
  const W = {};
  const mk = (name, pos, z, kind, opts, matKey) => {
    const s = sub(obj, name, z);
    s.position.x = pos[0]; s.position.y = pos[1];
    add(`train.${name}`, kind, wheel(ctx, opts), s, matKey);
    W[name] = s;
  };
  // barrel: a closed toothed drum with its lid
  const bs = sub(obj, 'barrel', 0.42);
  bs.position.set(MV.barrel[0], MV.barrel[1], 0.42);
  const drum = extrude(gearShape({ r: 5.2, teeth: 72, hole: 0, h: 0.3 }), 0.85, { bevel: 0.05 });
  const lid = lathe([[0, -0.6], [0.9, -0.6], [0.9, -0.47], [4.2, -0.43]], { segments: 64 });
  add('train.barrel', 'gilt', merge([drum, lid]), bs);
  W.barrel = bs;
  mk('centre', MV.centre, -0.5, 'gilt', { r: 4.4, teeth: 64, spokes: 4, arbor: 2.2 });
  mk('third', MV.third, -0.2, 'gilt', { r: 3.6, teeth: 60, spokes: 4 });
  mk('fourth', MV.fourth, -0.45, 'gilt', { r: 3.4, teeth: 60, spokes: 5 });
  mk('escape', MV.escape, -0.75, 'steelPolished', { r: 2.1, teeth: 20, spokes: 5, escape: true, depth: 0.18, hub: 0.6 });
  return W;
}

// the hairspring: a flat Archimedean spiral ribbon, updated on the CPU so that it breathes with the balance
export class Hairspring {
  constructor({ turns = 12.5, r0 = 0.62, r1 = 3.3, height = 0.14, thick = 0.035, segPerTurn = 40 }) {
    this.turns = turns; this.r0 = r0; this.r1 = r1; this.h = height; this.th = thick;
    this.n = Math.ceil(turns * segPerTurn) + 1;
    const n = this.n;
    const vcount = n * 8;
    this.pos = new Float32Array(vcount * 3);
    this.nor = new Float32Array(vcount * 3);
    const uv = new Float32Array(vcount * 2);
    const tan = new Float32Array(vcount * 4);
    for (let i = 0; i < vcount; i++) { tan[i * 4] = 1; tan[i * 4 + 3] = 1; }
    const idx = [];
    for (let i = 0; i < n - 1; i++) {
      for (let f = 0; f < 4; f++) {
        const a = i * 8 + f * 2, b = a + 1, c = a + 8, d = a + 9;
        idx.push(a, c, b, b, c, d);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('tangent', new THREE.BufferAttribute(tan, 4));
    g.setIndex(idx);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), r1 * 1.2 + 0.5);
    this.geometry = g;
    this.last = null;
    this.update(0);
  }
  // theta: the balance angle (rad); the inner end turns with it, the outer end (the stud) stays
  update(theta) {
    if (this.last !== null && Math.abs(theta - this.last) < 1e-4) return;
    this.last = theta;
    const { n, r0, r1, h, th, turns } = this;
    const P = this.pos, N = this.nor;
    const h2 = h / 2, t2 = th / 2;
    for (let i = 0; i < n; i++) {
      const s = i / (n - 1);
      const free = 1 - s;
      const ang = s * turns * TAU + theta * free;
      // breathing: unwinding opens the coils, winding closes them (most in the middle turns)
      const r = (r0 + (r1 - r0) * s) * (1 - 0.06 * (theta / 3.8) * free * s * 2.2);
      const c = Math.cos(ang), si = Math.sin(ang);
      const ri = r - t2, ro = r + t2;
      // 4 faces, 2 vertices each: inner (−radial), outer (+radial), back (−z), front (+z)
      const o = i * 24;
      const set = (k, x, y, z, nx, ny, nz) => { P[o + k * 3] = x; P[o + k * 3 + 1] = y; P[o + k * 3 + 2] = z; N[o + k * 3] = nx; N[o + k * 3 + 1] = ny; N[o + k * 3 + 2] = nz; };
      set(0, ri * c, ri * si, -h2, -c, -si, 0); set(1, ri * c, ri * si, h2, -c, -si, 0);
      set(2, ro * c, ro * si, h2, c, si, 0); set(3, ro * c, ro * si, -h2, c, si, 0);
      set(4, ri * c, ri * si, -h2, 0, 0, -1); set(5, ro * c, ro * si, -h2, 0, 0, -1);
      set(6, ro * c, ro * si, h2, 0, 0, 1); set(7, ri * c, ri * si, h2, 0, 0, 1);
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.normal.needsUpdate = true;
  }
}

export function buildBalance(ctx, obj) {
  const { Q, add, sub } = ctx;
  const B = MV.balance;
  // the balance wheel (turns with theta): rim, three arms, hub, staff, inertia blocks
  const wheelG = sub(obj, 'wheel', 0);
  wheelG.position.set(B[0], B[1], 0);
  const rim = lathe([[3.9, -0.24], [4.45, -0.24], [4.45, 0.24], [3.9, 0.24], [3.9, -0.24]], { segments: Math.max(64, Q.seg), crease: 0.5 });
  const parts = [rim];
  for (let i = 0; i < 3; i++) {
    const arm = extrude(polyShape([[-0.2, 0.5], [0.2, 0.5], [0.2, 4.0], [-0.2, 4.0]]), 0.16, { bevel: 0.03 });
    arm.rotateZ((i / 3) * TAU + 0.3);
    parts.push(arm);
  }
  parts.push(lathe([[0.62, -0.2], [0.62, 0.2], [0, 0.2]], { segments: 24 }));
  parts.push(lathe([[0.14, -0.95], [0.14, 0.95], [0, 0.95]], { segments: 12 }));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.18;
    const blk = lathe([[0.3, 0], [0.3, 0.16], [0.18, 0.22], [0, 0.22]], { segments: 14, crease: 0.5 });
    blk.rotateX(Math.PI);
    blk.translate(4.17 * Math.cos(a), 4.17 * Math.sin(a), -0.235);
    parts.push(blk);
  }
  // impulse roller (a polished disc on the dial side)
  parts.push(lathe([[0.95, 0.3], [0.95, 0.42], [0, 0.42]], { segments: 24 }));
  add('balance.wheel', 'gilt', merge(parts), wheelG);
  // hairspring (behind the wheel, under the cock)
  const springG = sub(obj, 'spring', -0.47);
  springG.position.set(B[0], B[1], -0.47);
  const hs = new Hairspring({ segPerTurn: Q.springSeg });
  add('balance.spring', 'blued', hs.geometry, springG, 'spring');
  // pallet fork (flicks between its banking pins at each beat)
  const P = MV.pallet;
  const fork = sub(obj, 'fork', -0.2);
  fork.position.set(P[0], P[1], -0.2);
  const toB = [B[0] - P[0], B[1] - P[1]];
  const lB = Math.hypot(toB[0], toB[1]);
  const dB = [toB[0] / lB, toB[1] / lB];
  const toE = [MV.escape[0] - P[0], MV.escape[1] - P[1]];
  const lE = Math.hypot(toE[0], toE[1]);
  const dE = [toE[0] / lE, toE[1] / lE];
  const perp = [-dE[1], dE[0]];
  const lever = extrude(strokeShape([[0, 0], [dB[0] * (lB - 1.2), dB[1] * (lB - 1.2)]], [0.32, 0.22]), 0.16, { bevel: 0.03 });
  const hornTip = [dB[0] * (lB - 1.0), dB[1] * (lB - 1.0)];
  const horns = extrude(strokeShape([[hornTip[0] + perp[0] * 0.38, hornTip[1] + perp[1] * 0.38], [hornTip[0] - perp[0] * 0.38, hornTip[1] - perp[1] * 0.38]], [0.13, 0.13]), 0.16, { bevel: 0.02 });
  const a1 = [dE[0] * 1.55 + perp[0] * 1.25, dE[1] * 1.55 + perp[1] * 1.25], a2 = [dE[0] * 1.55 - perp[0] * 1.25, dE[1] * 1.55 - perp[1] * 1.25];
  const anchor = extrude(strokeShape([a1, [0, 0], a2], [0.2, 0.3, 0.2]), 0.16, { bevel: 0.03 });
  const pivot = lathe([[0.35, -0.12], [0.35, 0.12], [0, 0.12]], { segments: 20 });
  add('balance.fork', 'steelPolished', merge([lever, horns, anchor, pivot]), fork);
  const stones = [a1, a2].map((a) => {
    const g = extrude(polyShape([[-0.1, -0.22], [0.1, -0.22], [0.1, 0.22], [-0.1, 0.22]]), 0.18);
    g.rotateZ(Math.atan2(dE[1], dE[0]));
    g.translate(a[0] + dE[0] * 0.25, a[1] + dE[1] * 0.25, 0);
    return g;
  });
  add('balance.stones', 'ruby', merge(stones), fork);
  return { wheel: wheelG, spring: hs, springGroup: springG, fork };
}

export function bridgeShapes() {
  return {
    barrelBridge: hullShape([[MV.barrel[0], MV.barrel[1], 5.9], [0, 0, 2.2], [9.5, 7.9, 1.35]]),
    trainBridge: strokeShape([[-11.7, 2.6], [-8.0, 0.6], MV.third, MV.fourth, MV.escape], [1.35, 1.25, 1.45, 1.45, 1.25]),
    palletBridge: strokeShape([MV.pallet, [1.8, -8.2], [1.1, -12.0]], [1.05, 0.95, 1.25]),
    cock: strokeShape([[11.7, -5.9], MV.balance], [1.45, 1.55]),
  };
}

// soft contact shadows on the mainplate's back face (under the bridges, the wheels and the barrel), in the
// mainplate's planar uv (xy / D + 0.5): an aoMap for the perlage material
export function movementAO(size, D) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, size, size);
  const k = size / D;
  const X = (x) => size / 2 + x * k, Y = (y) => size / 2 - y * k;
  g.filter = `blur(${Math.round(size / 90)}px)`;
  const fillShape = (sh, col) => {
    const pts = sh.extractPoints(8).shape;
    g.fillStyle = col;
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(X(p.x), Y(p.y)) : g.moveTo(X(p.x), Y(p.y))));
    g.closePath();
    g.fill();
  };
  const disc = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(X(x), Y(y), r * k, 0, Math.PI * 2); g.fill(); };
  disc(MV.barrel[0], MV.barrel[1], 5.4, '#5c5c5c');
  for (const [p, r] of [[MV.centre, 4.4], [MV.third, 3.6], [MV.fourth, 3.4], [MV.escape, 2.1], [MV.balance, 4.5]]) disc(p[0], p[1], r, '#9a9a9a');
  const B = bridgeShapes();
  for (const sh of Object.values(B)) fillShape(sh, '#6e6e6e');
  // the edge of the plate under the movement holder ring
  g.filter = `blur(${Math.round(size / 60)}px)`;
  g.strokeStyle = '#707070';
  g.lineWidth = 1.4 * k;
  g.beginPath(); g.arc(X(0), Y(0), 13.4 * k, 0, Math.PI * 2); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

export function buildBridges(ctx, obj) {
  const { Q, add } = ctx;
  const T = 1.0; // bridge thickness (local z -0.5 .. +0.5)
  const jewelPts = [MV.centre, MV.third, MV.fourth, MV.escape, MV.pallet];
  const { barrelBridge, trainBridge, palletBridge, cock } = bridgeShapes();
  const caps = [], walls = [];
  for (const sh of [barrelBridge, trainBridge, palletBridge, cock]) {
    const g = extrude(sh, T, { bevel: 0.16, bevelSegments: 2, curveSegments: 6 });
    const [c, w] = splitGroups(g);
    g.dispose();
    caps.push(c); walls.push(w);
  }
  const capG = merge(caps);
  planarUV(capG, 1 / ctx.D.movement);
  add('bridges.plates', 'rhodium', capG, obj, 'cotes');
  add('bridges.bevels', 'steelPolished', merge(walls), obj);
  // jewels in gold chatons on the back face (z = -0.5), the balance cap jewel larger
  const jewels = [], chatons = [];
  const jp = [...jewelPts.map((p) => [p, 0.42]), [MV.balance, 0.55]];
  for (const [p, r] of jp) {
    jewels.push(at(lathe([[0, -0.08], [r * 0.18, -0.06], [r * 0.45, -0.1], [r, -0.05], [r, 0]], { segments: 24, crease: 0.4 }), p, -0.52));
    chatons.push(at(lathe([[r, -0.02], [r + 0.3, -0.02], [r + 0.38, 0.04]], { segments: 28, crease: 0.4 }), p, -0.55));
  }
  add('bridges.jewels', 'ruby', merge(jewels), obj);
  add('bridges.chatons', 'gilt', merge(chatons), obj);
  // blued screws
  const screws = [];
  const sp = [[7.4, 2.6, 0.62], [-0.9, 7.3, 0.62], [9.5, 7.9, 0.6], [-11.0, 2.3, 0.6], [-4.4, -4.3, 0.55], [-1.55, -5.5, 0.5], [2.0, -7.4, 0.55], [11.0, -5.8, 0.66], [3.6, 5.6, 0.95]];
  for (const [x, y, r] of sp) {
    const s = screwHead(r, r * 0.55, { segments: Q.screwSeg, facing: -1, slot: r * 0.28 });
    s.rotateZ(x * 1.7 + y);
    s.translate(x, y, -0.5);
    screws.push(s);
  }
  add('bridges.screws', 'blued', merge(screws), obj);
  // ratchet wheel over the barrel (polished steel, snailed) and the crown wheel
  const ratchet = extrude(gearShape({ r: 3.5, teeth: 48, hole: 0, escape: true, h: 0.32 }), 0.32, { bevel: 0.04 });
  ratchet.translate(MV.barrel[0], MV.barrel[1], -0.5 - 0.17);
  const crownW = extrude(gearShape({ r: 1.7, teeth: 28, hole: 0, h: 0.22 }), 0.28, { bevel: 0.03 });
  crownW.translate(-0.6, 8.7, -0.5 - 0.15);
  const rg = merge([ratchet, crownW]);
  setTangents(rg, (x, y) => [x - MV.barrel[0], y - MV.barrel[1], 0]);
  add('bridges.ratchet', 'steelBrushed', rg, obj, 'snailed');
}

export function buildRotor(ctx, obj) {
  const { Q, add, sub } = ctx;
  const spin = sub(obj, 'spin', 0);
  const R = 12.65, hub = 2.6;
  // plate: half disc + hub, skeletonised (three windows) — the mass is on +Y at angle 0
  const plate = new THREE.Shape();
  const n = 64;
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI; const x = R * Math.cos(a), y = R * Math.sin(a); i ? plate.lineTo(x, y) : plate.moveTo(x, y); }
  for (let i = 0; i <= 24; i++) { const a = Math.PI + (i / 24) * Math.PI; plate.lineTo(hub * Math.cos(a), hub * Math.sin(a)); }
  plate.lineTo(R, 0);
  plate.holes.push(sectorPath(3.35, 9.75, 0.17, 0.96, 24, 2));
  plate.holes.push(sectorPath(3.35, 9.75, 1.13, 2.01, 24, 2));
  plate.holes.push(sectorPath(3.35, 9.75, 2.18, 2.97, 24, 2));
  plate.holes.push(circlePath(new THREE.Path(), 0, 0, 0.9, 20, true));
  const pg = extrude(plate, 0.5, { bevel: 0.1, bevelSegments: 2, curveSegments: 4 });
  const [pc, pw] = splitGroups(pg);
  pg.dispose();
  planarUV(pc, 1 / ctx.D.movement);
  add('rotor.plate', 'rhodium', pc, spin, 'cotesRotor');
  // the heavy rim, engraved « BALANCIER » (read from the back), thicker towards the back
  const rim = extrude(sectorShape(10.25, R, 0.03 * Math.PI, 0.97 * Math.PI, 64), 1.0, { bevel: 0.12, bevelSegments: 2 });
  rim.translate(0, 0, -0.15);
  const [rc, rw] = splitGroups(rim);
  rim.dispose();
  planarUV(rc, 1 / ctx.D.rotor, { mirrorX: true });
  add('rotor.rim', 'rhodium', rc, spin, 'rotorEngraved');
  // bearing and walls
  const bearing = merge([
    lathe([[0.9, -0.62], [2.3, -0.62], [2.45, -0.45], [2.45, 0.2], [0.9, 0.2]], { segments: 48, crease: 0.5 }),
    lathe([[0, -0.75], [0.95, -0.75], [0.95, -0.55]], { segments: 32, crease: 0.5 }),
  ]);
  add('rotor.polished', 'steelPolished', merge([pw, rw, bearing]), spin);
  const screws = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 0.5;
    const s = screwHead(0.42, 0.24, { segments: Q.screwSeg, facing: -1, slot: 0.12 });
    s.rotateZ(a * 2.3);
    s.translate(1.7 * Math.cos(a), 1.7 * Math.sin(a), -0.62);
    screws.push(s);
  }
  add('rotor.screws', 'blued', merge(screws), spin);
  return spin;
}
