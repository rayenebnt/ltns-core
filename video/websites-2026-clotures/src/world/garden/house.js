// The maison de maître: pale tuffeau ashlar, two storeys of five bays, a steep hipped slate
// roof with three stone dormers and two chimneys, zinc gutters, grey-blue louvred shutters,
// white small-paned windows that reflect the sky, wrought-iron balconnets, a front perron.
// Plus the two stone pillars at the gap of the hedge and a simpler neighbour house.
// Everything is merged by material (about nine draw calls).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HOUSE, FACADE_Z, HEDGE } from './layout.js';
import { tuffeauTextures, trimTexture, slateTextures, shutterTexture, interiorTexture, STONE_TILE, SLATE_TILE } from './house-tex.js';

// ------------------------------------------------------------------ geometry helpers
class Acc {
  constructor() {
    this.g = {};
  }
  push(name, pos, nrm, uv, col) {
    const a = this.g[name] || (this.g[name] = { pos: [], nrm: [], uv: [], col: [] });
    a.pos.push(...pos);
    a.nrm.push(...nrm);
    a.uv.push(...uv);
    a.col.push(...col);
  }
  // a planar quad o, o + a, o + a + b, o + b (counter-clockwise seen from the normal side)
  quad(name, o, a, b, opt = {}) {
    const n = norm(cross(a, b));
    const P = [o, add(o, a), add(add(o, a), b), add(o, b)];
    const S = opt.tile || 1;
    let U;
    if (opt.uv) U = opt.uv;
    else {
      // world-scaled uv on the face's own axes
      const ua = norm(a), ub = norm(b);
      U = P.map((p) => [dot(p, ua) / S, dot(p, ub) / S]);
    }
    const C = opt.colorFn ? P.map(opt.colorFn) : P.map(() => opt.color || [1, 1, 1]);
    for (const i of [0, 1, 2, 0, 2, 3]) this.push(name, P[i], n, U[i], C[i]);
  }
  tri(name, p0, p1, p2, opt = {}) {
    const n = norm(cross(sub(p1, p0), sub(p2, p0)));
    const S = opt.tile || 1;
    const ua = norm(sub(p1, p0)), ub = norm(cross(n, ua));
    for (const p of [p0, p1, p2]) this.push(name, p, n, opt.uvFn ? opt.uvFn(p) : [dot(p, ua) / S, dot(p, ub) / S], opt.color || [1, 1, 1]);
  }
  // axis-aligned box, faces outward; skip: string of faces to omit ('xXyYzZ': -x,+x,-y,+y,-z,+z)
  box(name, x0, x1, y0, y1, z0, z1, opt = {}) {
    const skip = opt.skip || '';
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
    if (!skip.includes('Z')) this.quad(name, [x0, y0, z1], [dx, 0, 0], [0, dy, 0], opt);
    if (!skip.includes('z')) this.quad(name, [x1, y0, z0], [-dx, 0, 0], [0, dy, 0], opt);
    if (!skip.includes('X')) this.quad(name, [x1, y0, z1], [0, 0, -dz], [0, dy, 0], opt);
    if (!skip.includes('x')) this.quad(name, [x0, y0, z0], [0, 0, dz], [0, dy, 0], opt);
    if (!skip.includes('Y')) this.quad(name, [x0, y1, z1], [dx, 0, 0], [0, 0, -dz], opt);
    if (!skip.includes('y')) this.quad(name, [x0, y0, z0], [dx, 0, 0], [0, 0, dz], opt);
  }
  // a beam of square section w x h between two points
  beam(name, p0, p1, w, h = w, opt = {}) {
    const d = sub(p1, p0);
    const L = len(d);
    const t = norm(d);
    const up = Math.abs(t[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0];
    const s = norm(cross(t, up)), u = cross(s, t);
    const hw = mul(s, w / 2), hh = mul(u, h / 2);
    const c = [add(add(p0, hw), hh), add(sub(p0, hw), hh), sub(sub(p0, hw), hh), sub(add(p0, hw), hh)];
    for (let i = 0; i < 4; i++) {
      const a = c[i], b = c[(i + 1) % 4];
      this.quad(name, b, sub(a, b), d, opt);
    }
  }
  build(name) {
    const a = this.g[name];
    if (!a) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(a.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(a.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(a.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(a.col, 3));
    g.computeBoundingSphere();
    return g;
  }
}
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

// wall occlusion: splash-darkened base, a touch darker under the cornice
const wallAO = (y0, top) => (p) => {
  const y = p[1] - y0;
  const k = 0.8 + 0.2 * Math.min(1, y / 1.6);
  const c = 1 - 0.1 * Math.max(0, 1 - (top - y) / 0.7);
  const v = k * c;
  return [v, v * 0.995, v * 0.985];
};

// ------------------------------------------------------------------ a facade with openings
// The wall plane is given by an origin (bottom-left corner of the face, outer surface),
// a unit axis u along the wall and the outward normal n; s, t are wall coordinates.
function facade(acc, F, openings, y0, top, depth = 0.5) {
  const { o, u, n } = F;
  const v = [0, 1, 0];
  const W = F.width;
  const at = (s, t, d = 0) => add(add(add(o, mul(u, s)), mul(v, t)), mul(n, d));
  // wall surface: a shape with holes, triangulated, then mapped onto the plane
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(W, 0);
  shape.lineTo(W, top);
  shape.lineTo(0, top);
  shape.closePath();
  for (const op of openings) {
    const h = new THREE.Path();
    h.moveTo(op.s0, op.t0);
    h.lineTo(op.s0, op.t1);
    h.lineTo(op.s1, op.t1);
    h.lineTo(op.s1, op.t0);
    h.closePath();
    shape.holes.push(h);
  }
  const sg = new THREE.ShapeGeometry(shape);
  const p = sg.attributes.position.array;
  const ix = sg.index.array;
  const ao = wallAO(y0, top);
  const wa = acc.g.wall || (acc.g.wall = { pos: [], nrm: [], uv: [], col: [] });
  for (let k = 0; k < ix.length; k++) {
    const i = ix[k];
    const P = at(p[i * 3], p[i * 3 + 1]);
    wa.pos.push(...P);
    wa.nrm.push(...n);
    wa.uv.push((p[i * 3] + F.uOffset) / STONE_TILE, (p[i * 3 + 1] + y0) / STONE_TILE);
    wa.col.push(...ao(P));
  }
  // corners of the wall slab (the facade turns at the corners: thickness faces)
  for (const op of openings) {
    const rd = op.reveal || 0.22;
    const rc = [0.82, 0.81, 0.79];
    // reveals (smooth stone), sill sloping slightly
    acc.quad('trim', at(op.s0, op.t0, 0), mul(n, -rd), mul(v, op.t1 - op.t0), { color: rc, tile: 1 });
    acc.quad('trim', at(op.s1, op.t1, 0), mul(n, -rd), mul(v, -(op.t1 - op.t0)), { color: rc, tile: 1 });
    acc.quad('trim', at(op.s1, op.t1, 0), mul(u, -(op.s1 - op.s0)), mul(n, -rd), { color: [0.7, 0.69, 0.67], tile: 1 });
    acc.quad('trim', at(op.s0, op.t0, 0), mul(u, op.s1 - op.s0), mul(n, -rd), { color: [0.9, 0.89, 0.87], tile: 1 });
    // glass / door at the back of the reveal
    const gd = -rd + 0.02;
    if (op.kind === 'door') door(acc, at, u, v, n, op, gd);
    else windowFrame(acc, at, u, v, n, op, gd);
    // stone surround (chambranle) proud of the wall, sill and keystone
    const sw = op.surround || 0.17, sp = 0.03;
    const surround = (s0, s1, t0, t1, d) => {
      const P0 = at(s0, t0, d);
      acc.quad('trim', P0, mul(u, s1 - s0), mul(v, t1 - t0), { tile: 1 });
      acc.quad('trim', at(s0, t0, 0), mul(u, s1 - s0), mul(n, d), { tile: 1 }); // bottom edge
      acc.quad('trim', at(s1, t1, 0), mul(u, s0 - s1), mul(n, d), { tile: 1 }); // top edge (faces up)
      acc.quad('trim', at(s0, t1, 0), mul(v, t0 - t1), mul(n, d), { tile: 1 });
      acc.quad('trim', at(s1, t0, 0), mul(v, t1 - t0), mul(n, d), { tile: 1 });
    };
    surround(op.s0 - sw, op.s0, op.t0, op.t1 + sw, sp);
    surround(op.s1, op.s1 + sw, op.t0, op.t1 + sw, sp);
    surround(op.s0, op.s1, op.t1, op.t1 + sw, sp);
    if (op.kind !== 'door') surround(op.s0 - sw - 0.05, op.s1 + sw + 0.05, op.t0 - 0.1, op.t0, 0.07); // sill
    if (op.key) surround((op.s0 + op.s1) / 2 - 0.13, (op.s0 + op.s1) / 2 + 0.13, op.t1 - 0.02, op.t1 + sw + 0.1, 0.06);
    // shutters open against the wall
    if (op.shutters) {
      const lw = (op.s1 - op.s0) / 2 + 0.02, h = op.t1 - op.t0;
      for (const [s0, flip] of [[op.s0 - sw - lw + 0.06, 0], [op.s1 + sw - 0.06, 1]]) {
        const d0 = 0.035, d1 = 0.07;
        acc.quad('shutter', at(s0, op.t0, d1), mul(u, lw), mul(v, h), { uv: flip ? [[1, 0], [0, 0], [0, 1], [1, 1]] : [[0, 0], [1, 0], [1, 1], [0, 1]] });
        acc.quad('shutter', at(s0, op.t0, d0), mul(n, d1 - d0), mul(v, h), { uv: [[0, 0], [0.04, 0], [0.04, 1], [0, 1]] });
        acc.quad('shutter', at(s0 + lw, op.t1, d0), mul(n, d1 - d0), mul(v, -h), { uv: [[0, 0], [0.04, 0], [0.04, 1], [0, 1]] });
      }
    }
    if (op.rail) balconnet(acc, at, u, v, n, op);
  }
}

function windowFrame(acc, at, u, v, n, op, gd) {
  const w = op.s1 - op.s0, h = op.t1 - op.t0;
  // glass with the room behind it
  acc.quad('glass', at(op.s0, op.t0, gd - 0.03), mul(u, w), mul(v, h), { uv: [[0, 0], [1, 0], [1, 1], [0, 1]] });
  const f = 0.075, m = 0.055, bar = 0.032, d = gd, dd = 0.05;
  const bx = (s0, s1, t0, t1, depth) => {
    acc.quad('frame', at(s0, t0, d + depth), mul(u, s1 - s0), mul(v, t1 - t0));
    acc.quad('frame', at(s0, t1, d), mul(v, t0 - t1), mul(n, depth));
    acc.quad('frame', at(s1, t0, d), mul(v, t1 - t0), mul(n, depth));
    acc.quad('frame', at(s0, t0, d), mul(u, s1 - s0), mul(n, depth));
    acc.quad('frame', at(s1, t1, d), mul(u, s0 - s1), mul(n, depth));
  };
  bx(op.s0, op.s1, op.t0, op.t0 + f, dd);
  bx(op.s0, op.s1, op.t1 - f, op.t1, dd);
  bx(op.s0, op.s0 + f, op.t0, op.t1, dd);
  bx(op.s1 - f, op.s1, op.t0, op.t1, dd);
  const mid = (op.s0 + op.s1) / 2;
  bx(mid - m / 2, mid + m / 2, op.t0, op.t1, dd);
  const panes = op.panes || 4;
  for (let i = 1; i < panes; i++) {
    const t = op.t0 + f + ((h - 2 * f) * i) / panes;
    bx(op.s0 + f, op.s1 - f, t - bar / 2, t + bar / 2, dd * 0.7);
  }
}

function door(acc, at, u, v, n, op, gd) {
  const w = op.s1 - op.s0, h = op.t1 - op.t0;
  const paint = [0.42, 0.5, 0.55];
  const d = gd;
  // fanlight and the glazed upper half of both leaves
  const tFan = op.t1 - 0.5, tGlass = op.t0 + h * 0.36;
  acc.quad('glass', at(op.s0, tGlass, d - 0.02), mul(u, w), mul(v, op.t1 - tGlass), { uv: [[0.2, 0.3], [0.8, 0.3], [0.8, 0.9], [0.2, 0.9]] });
  const pb = (s0, s1, t0, t1, depth, col) => {
    acc.quad('frame', at(s0, t0, d + depth), mul(u, s1 - s0), mul(v, t1 - t0), { color: col });
    acc.quad('frame', at(s0, t1, d), mul(v, t0 - t1), mul(n, depth), { color: col });
    acc.quad('frame', at(s1, t0, d), mul(v, t1 - t0), mul(n, depth), { color: col });
    acc.quad('frame', at(s1, t1, d), mul(u, s0 - s1), mul(n, depth), { color: col });
  };
  pb(op.s0, op.s1, op.t0, tGlass, 0.05, paint); // lower panels
  pb(op.s0, op.s1, tFan - 0.06, tFan, 0.06, paint); // transom bar
  pb(op.s0, op.s0 + 0.09, tGlass, op.t1, 0.06, paint);
  pb(op.s1 - 0.09, op.s1, tGlass, op.t1, 0.06, paint);
  const mid = (op.s0 + op.s1) / 2;
  pb(mid - 0.05, mid + 0.05, tGlass, tFan, 0.06, paint);
  for (let i = 1; i < 3; i++) {
    const t = tGlass + ((tFan - tGlass) * i) / 3;
    pb(op.s0 + 0.09, op.s1 - 0.09, t - 0.02, t + 0.02, 0.04, paint);
  }
  // raised lower panels
  for (const [a, b] of [[op.s0 + 0.12, mid - 0.08], [mid + 0.08, op.s1 - 0.12]]) pb(a, b, op.t0 + 0.15, tGlass - 0.12, 0.075, [0.38, 0.46, 0.51]);
}

function balconnet(acc, at, u, v, n, op) {
  const t0 = op.t0 + 0.02, t1 = op.t0 + 0.95, d = 0.06;
  const bar = (s0, s1, a, b, w) => {
    acc.quad('iron', at(s0, a, d + w), mul(u, s1 - s0), mul(v, b - a));
    acc.quad('iron', at(s1, a, d), mul(v, b - a), mul(n, w));
    acc.quad('iron', at(s0, b, d), mul(v, a - b), mul(n, w));
  };
  bar(op.s0 - 0.04, op.s1 + 0.04, t1 - 0.04, t1, 0.04);
  bar(op.s0 - 0.04, op.s1 + 0.04, t0, t0 + 0.03, 0.03);
  bar(op.s0 - 0.04, op.s1 + 0.04, t0 + 0.2, t0 + 0.22, 0.02);
  const nb = 9;
  for (let i = 0; i <= nb; i++) {
    const s = op.s0 + ((op.s1 - op.s0) * i) / nb;
    bar(s - 0.009, s + 0.009, t0, t1, 0.018);
  }
}

// ------------------------------------------------------------------ the main house
export function createHouse() {
  const acc = new Acc();
  const x0 = HOUSE.cx - HOUSE.w / 2, x1 = HOUSE.cx + HOUSE.w / 2;
  const z0 = HOUSE.cz - HOUSE.d / 2, z1 = FACADE_Z;
  const y0 = 0;
  const top = 7.95; // wall top, under the cornice
  const fl = 0.95; // ground floor level
  // ---- openings
  const bays = [-9.8, -6.9, -4.0, -1.1, 1.8];
  const front = [];
  for (const bx of bays) {
    const s = bx - x0;
    if (bx === -4.0) front.push({ kind: 'door', s0: s - 0.78, s1: s + 0.78, t0: fl, t1: fl + 3.0, key: true, reveal: 0.26 });
    else front.push({ s0: s - 0.6, s1: s + 0.6, t0: fl + 0.12, t1: fl + 2.68, shutters: true, key: true, panes: 4 });
    front.push({ s0: s - 0.58, s1: s + 0.58, t0: 5.3, t1: 7.32, shutters: true, panes: 3, rail: true });
  }
  facade(acc, { o: [x0, y0, z1], u: [1, 0, 0], n: [0, 0, 1], width: HOUSE.w, uOffset: 0 }, front, y0, top);
  const sideOps = () => [
    { s0: 2.4, s1: 3.55, t0: fl + 0.12, t1: fl + 2.6, shutters: true, panes: 4 },
    { s0: 6.45, s1: 7.6, t0: fl + 0.12, t1: fl + 2.6, shutters: true, panes: 4 },
    { s0: 2.42, s1: 3.53, t0: 5.3, t1: 7.25, shutters: true, panes: 3 },
    { s0: 6.47, s1: 7.58, t0: 5.3, t1: 7.25, shutters: true, panes: 3 },
  ];
  facade(acc, { o: [x1, y0, z1], u: [0, 0, -1], n: [1, 0, 0], width: HOUSE.d, uOffset: 3.1 }, sideOps(), y0, top);
  facade(acc, { o: [x0, y0, z0], u: [0, 0, 1], n: [-1, 0, 0], width: HOUSE.d, uOffset: 5.7 }, sideOps(), y0, top);
  facade(acc, { o: [x1, y0, z0], u: [-1, 0, 0], n: [0, 0, -1], width: HOUSE.w, uOffset: 1.3 }, [], y0, top);

  // ---- plinth, string course, quoins, cornice (smooth tuffeau)
  const pr = 0.045;
  const ring = (ya, yb, out, col) => {
    acc.box('trim', x0 - out, x1 + out, ya, yb, z1 - 0.02, z1 + out, { skip: 'z', color: col, tile: 1 });
    acc.box('trim', x0 - out, x1 + out, ya, yb, z0 - out, z0 + 0.02, { skip: 'Z', color: col, tile: 1 });
    acc.box('trim', x1 - 0.02, x1 + out, ya, yb, z0 - out, z1 + out, { skip: 'x', color: col, tile: 1 });
    acc.box('trim', x0 - out, x0 + 0.02, ya, yb, z0 - out, z1 + out, { skip: 'X', color: col, tile: 1 });
  };
  ring(-0.1, 0.88, pr, [0.84, 0.83, 0.8]);
  ring(0.88, 0.96, pr + 0.02, [0.95, 0.94, 0.92]);
  ring(4.58, 4.82, 0.045, [1, 1, 1]);
  ring(top - 0.02, top + 0.16, 0.09, [0.95, 0.95, 0.94]);
  ring(top + 0.16, top + 0.34, 0.2, [1, 1, 1]);
  ring(top + 0.34, top + 0.55, 0.36, [1, 1, 1]);
  // quoins: alternating long and short blocks on both faces of every corner
  const corners = [[x0, z1, 1, -1], [x1, z1, -1, -1], [x1, z0, -1, 1], [x0, z0, 1, 1]];
  for (const [cx, cz, sx, sz] of corners) {
    for (let k = 0, y = 0.96; y < top - 0.1; k++, y += 0.34) {
      const yb = Math.min(top - 0.02, y + 0.33);
      const la = k % 2 ? 0.36 : 0.62, lb = k % 2 ? 0.62 : 0.36, q = 0.025;
      // block on the face that runs along x, then on the face that runs along z
      const ax0 = Math.min(cx - sx * q, cx + sx * la), ax1 = Math.max(cx - sx * q, cx + sx * la);
      const az0 = Math.min(cz, cz - sz * q), az1 = Math.max(cz, cz - sz * q);
      acc.box('trim', ax0, ax1, y, yb, az0 - 0.005, az1 + 0.005, { tile: 1 });
      const bz0 = Math.min(cz - sz * q, cz + sz * lb), bz1 = Math.max(cz - sz * q, cz + sz * lb);
      const bx0 = Math.min(cx, cx - sx * q), bx1 = Math.max(cx, cx - sx * q);
      acc.box('trim', bx0 - 0.005, bx1 + 0.005, y, yb, bz0, bz1, { tile: 1 });
    }
  }

  // ---- perron: landing and four steps, with an iron railing
  const px0 = -5.75, px1 = -2.25;
  const pz = z1 + 1.3;
  acc.box('trim', px0, px1, -0.1, fl - 0.01, z1 - 0.02, pz, { skip: 'z', color: [0.95, 0.94, 0.91], tile: 1 });
  for (let k = 1; k <= 4; k++) {
    const yt = fl - 0.19 * k;
    acc.box('trim', px0 - 0.02 * k, px1 + 0.02 * k, -0.1, yt, pz + 0.34 * (k - 1) - 0.02, pz + 0.34 * k, { color: [0.93, 0.92, 0.89], tile: 1 });
  }
  for (const sx of [px0 + 0.06, px1 - 0.06]) {
    const zEnd = pz + 0.34 * 4 - 0.1;
    const yAt = (zz) => (zz < pz ? fl : fl + ((0.19 - fl) * (zz - pz)) / (zEnd - pz));
    for (const zz of [z1 + 0.05, pz, zEnd]) acc.beam('iron', [sx, yAt(zz), zz], [sx, yAt(zz) + 0.95, zz], 0.035);
    acc.beam('iron', [sx, fl + 0.95, z1 + 0.05], [sx, fl + 0.95, pz], 0.045, 0.03);
    acc.beam('iron', [sx, fl + 0.95, pz], [sx, 0.19 + 0.95, zEnd], 0.045, 0.03);
    for (let i = 1; i < 12; i++) {
      const zz = z1 + 0.05 + ((zEnd - z1 - 0.05) * i) / 12;
      acc.beam('iron', [sx, yAt(zz), zz], [sx, yAt(zz) + 0.92, zz], 0.014);
    }
  }

  // ---- roof: hipped, 47 degrees, slate, zinc hips and ridge
  const o = 0.36, ye = top + 0.55;
  const tanP = Math.tan((47 * Math.PI) / 180);
  const hd = (HOUSE.d + 2 * o) / 2;
  const yr = ye + hd * tanP;
  const E0 = [x0 - o, ye, z1 + o], E1 = [x1 + o, ye, z1 + o], E2 = [x1 + o, ye, z0 - o], E3 = [x0 - o, ye, z0 - o];
  const R0 = [x0 - o + hd, yr, HOUSE.cz], R1 = [x1 + o - hd, yr, HOUSE.cz];
  const slopeUv = (eA, eB, up) => (p) => {
    const ua = norm(sub(eB, eA));
    return [dot(sub(p, eA), ua) / SLATE_TILE, dot(sub(p, eA), up) / SLATE_TILE];
  };
  const upF = norm(sub(R0, [R0[0], ye, z1 + o])), upB = norm(sub(R0, [R0[0], ye, z0 - o]));
  const upL = norm(sub(R0, [x0 - o, ye, R0[2]])), upR = norm(sub(R1, [x1 + o, ye, R1[2]]));
  const roofCol = (p) => {
    const k = 0.85 + 0.15 * Math.min(1, (p[1] - ye) / 2.5);
    return [k, k, k];
  };
  const roofQuad = (a, b, c, d, uvf) => {
    acc.tri('slate', a, b, c, { uvFn: uvf, color: [1, 1, 1] });
    acc.tri('slate', a, c, d, { uvFn: uvf, color: [1, 1, 1] });
  };
  roofQuad(E0, E1, R1, R0, slopeUv(E0, E1, upF));
  roofQuad(E2, E3, R0, R1, slopeUv(E2, E3, upB));
  acc.tri('slate', E3, E0, R0, { uvFn: slopeUv(E3, E0, upL) });
  acc.tri('slate', E1, E2, R1, { uvFn: slopeUv(E1, E2, upR) });
  // eave soffit under the roof edge
  acc.quad('trim', [x0 - o, ye - 0.02, z1 + o], [0, 0, -(HOUSE.d + 2 * o)], [HOUSE.w + 2 * o, 0, 0], { color: [0.7, 0.7, 0.68] });
  for (const [a, b] of [[E0, R0], [E1, R1], [E2, R1], [E3, R0], [R0, R1]]) acc.beam('zinc', add(a, [0, 0.05, 0]), add(b, [0, 0.05, 0]), 0.16, 0.08);
  // gutters along the eaves and downpipes at the front corners
  for (const [a, b] of [[E0, E1], [E2, E3], [E1, E2], [E3, E0]]) acc.beam('zinc', add(a, [0, -0.06, 0]), add(b, [0, -0.06, 0]), 0.16, 0.13);
  for (const [x, z] of [[x0 + 0.18, z1 + 0.2], [x1 - 0.18, z1 + 0.2]]) {
    acc.beam('zinc', [x, ye - 0.1, z1 + o], [x, ye - 0.55, z], 0.085);
    acc.beam('zinc', [x, ye - 0.55, z], [x, 0.25, z], 0.085);
  }
  // chimneys in tuffeau with caps and terracotta pots
  const roofY = (x, z) => ye + Math.min(Math.min(x - (x0 - o), x1 + o - x), Math.min(z - (z0 - o), z1 + o - z)) * tanP;
  for (const cx of [-9.55, 1.55]) {
    const cz = HOUSE.cz, w = 0.62, dz = 1.36;
    const ytop = yr + 1.2;
    const yb = roofY(cx, cz) - 0.6;
    acc.box('trim', cx - w / 2, cx + w / 2, yb, ytop, cz - dz / 2, cz + dz / 2, { tile: 1, color: [0.9, 0.89, 0.86] });
    acc.box('trim', cx - w / 2 - 0.07, cx + w / 2 + 0.07, ytop, ytop + 0.18, cz - dz / 2 - 0.07, cz + dz / 2 + 0.07, { tile: 1 });
    acc.box('trim', cx - w / 2 - 0.04, cx + w / 2 + 0.04, ytop - 0.5, ytop - 0.38, cz - dz / 2 - 0.04, cz + dz / 2 + 0.04, { tile: 1 });
    for (const pzz of [cz - 0.32, cz + 0.32]) acc.box('trim', cx - 0.11, cx + 0.11, ytop + 0.18, ytop + 0.55, pzz - 0.11, pzz + 0.11, { tile: 1, color: [0.62, 0.36, 0.24] });
  }
  // dormers: stone fronts with a small pediment, slate cheeks and roofs
  for (const bx of [-9.8, -4.0, 1.8]) {
    const zf = z1 - 0.55;
    const yb = ye + (z1 + o - zf) * tanP - 0.05;
    const w = 1.62, hw = w / 2, yt = yb + 1.95, yp = yt + 0.72;
    const zb = zf - 3.4;
    // front wall around the window, and its pediment
    const op = { s0: hw - 0.43, s1: hw + 0.43, t0: 0.32, t1: 1.62, panes: 2 };
    const at = (s, t, d = 0) => [bx - hw + s, yb + t, zf + d];
    facadeSmall(acc, at, w, yt - yb, op);
    acc.box('trim', bx - hw - 0.06, bx + hw + 0.06, yt - 0.02, yt + 0.12, zf - 0.25, zf + 0.08, { tile: 1 });
    acc.tri('trim', [bx - hw - 0.04, yt + 0.12, zf + 0.06], [bx + hw + 0.04, yt + 0.12, zf + 0.06], [bx, yp, zf + 0.06], { tile: 1 });
    // dormer roof (two slopes running back into the main roof)
    for (const sx of [-1, 1]) {
      const a = [bx + sx * (hw + 0.12), yt + 0.08, zf + 0.12], b = [bx, yp + 0.04, zf + 0.12];
      const c = [bx, yp + 0.04, zb], d = [bx + sx * (hw + 0.12), yt + 0.08, zb];
      if (sx < 0) {
        acc.tri('slate', a, b, c, { tile: SLATE_TILE });
        acc.tri('slate', a, c, d, { tile: SLATE_TILE });
      } else {
        acc.tri('slate', b, a, d, { tile: SLATE_TILE });
        acc.tri('slate', b, d, c, { tile: SLATE_TILE });
      }
      // cheeks
      const cx = bx + sx * hw;
      const p0 = [cx, yb - 0.6, zf], p1 = [cx, yt + 0.08, zf], p2 = [cx, yt + 0.08, zb], p3 = [cx, yb - 0.6, zb];
      if (sx < 0) {
        acc.tri('slate', p0, p1, p2, { tile: SLATE_TILE });
        acc.tri('slate', p0, p2, p3, { tile: SLATE_TILE });
      } else {
        acc.tri('slate', p1, p0, p3, { tile: SLATE_TILE });
        acc.tri('slate', p1, p3, p2, { tile: SLATE_TILE });
      }
    }
    acc.beam('zinc', [bx, yp + 0.08, zf + 0.12], [bx, yp + 0.08, zb], 0.1, 0.06);
  }

  // ---- gate pillars at the gap of the hedge
  for (const gx of [HEDGE.gap0 - 0.25, HEDGE.gap1 + 0.25]) {
    const z = HEDGE.z;
    acc.box('trim', gx - 0.27, gx + 0.27, 0, 1.38, z - 0.27, z + 0.27, { tile: 1, color: [0.9, 0.89, 0.86] });
    acc.box('trim', gx - 0.33, gx + 0.33, 1.38, 1.5, z - 0.33, z + 0.33, { tile: 1 });
    acc.box('trim', gx - 0.15, gx + 0.15, 1.5, 1.58, z - 0.15, z + 0.15, { tile: 1 });
    // stone ball
    const ball = new THREE.SphereGeometry(0.2, 12, 8);
    const bp = ball.attributes.position.array, bn = ball.attributes.normal.array, bu = ball.attributes.uv.array, bi = ball.index.array;
    for (let k = 0; k < bi.length; k++) {
      const i = bi[k];
      acc.push('trim', [bp[i * 3] + gx, bp[i * 3 + 1] + 1.78, bp[i * 3 + 2] + z], [bn[i * 3], bn[i * 3 + 1], bn[i * 3 + 2]], [bu[i * 2], bu[i * 2 + 1]], [0.95, 0.94, 0.92]);
    }
  }

  return buildMeshes(acc, 'garden-house');
}

// the dormer front: a small wall with one opening (no shutters)
function facadeSmall(acc, at, w, h, op) {
  const t = 0.22;
  const piece = (s0, s1, t0, t1) => {
    acc.quad('trim', at(s0, t0, 0.0), [s1 - s0, 0, 0], [0, t1 - t0, 0], { tile: 1 });
  };
  piece(0, op.s0, 0, h);
  piece(op.s1, w, 0, h);
  piece(op.s0, op.s1, 0, op.t0);
  piece(op.s0, op.s1, op.t1, h);
  acc.quad('trim', at(0, 0, -t), [0, 0, t], [0, h, 0], { tile: 1, color: [0.85, 0.85, 0.83] });
  acc.quad('trim', at(w, 0, 0), [0, 0, -t], [0, h, 0], { tile: 1, color: [0.85, 0.85, 0.83] });
  const u = [1, 0, 0], v = [0, 1, 0], n = [0, 0, 1];
  const rd = 0.18;
  acc.quad('trim', at(op.s0, op.t0, 0), mul(n, -rd), mul(v, op.t1 - op.t0), { color: [0.82, 0.81, 0.79] });
  acc.quad('trim', at(op.s1, op.t1, 0), mul(n, -rd), mul(v, -(op.t1 - op.t0)), { color: [0.82, 0.81, 0.79] });
  acc.quad('trim', at(op.s1, op.t1, 0), mul(u, -(op.s1 - op.s0)), mul(n, -rd), { color: [0.7, 0.69, 0.67] });
  acc.quad('trim', at(op.s0, op.t0, 0), mul(u, op.s1 - op.s0), mul(n, -rd), { color: [0.9, 0.89, 0.87] });
  windowFrame(acc, at, u, v, n, op, -rd + 0.02);
}

let MATS = null;
function materials() {
  if (MATS) return MATS;
  const tx = tuffeauTextures(), sl = slateTextures();
  MATS = {
    wall: new THREE.MeshStandardMaterial({ name: 'house-wall', map: tx.map, normalMap: tx.normalMap, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.9, vertexColors: true }),
    trim: new THREE.MeshStandardMaterial({ name: 'house-trim', map: trimTexture(), roughness: 0.86, vertexColors: true }),
    slate: new THREE.MeshStandardMaterial({ name: 'house-slate', map: sl.map, normalMap: sl.normalMap, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.6, envMapIntensity: 0.8, vertexColors: true, color: new THREE.Color(0.78, 0.78, 0.76) }),
    zinc: new THREE.MeshStandardMaterial({ name: 'house-zinc', color: new THREE.Color(0.5, 0.52, 0.53), roughness: 0.42, metalness: 0.85 }),
    frame: new THREE.MeshStandardMaterial({ name: 'house-frame', color: new THREE.Color(0.86, 0.86, 0.84), roughness: 0.5, vertexColors: true }),
    glass: new THREE.MeshStandardMaterial({ name: 'house-glass', map: interiorTexture(), roughness: 0.04, metalness: 0.1, envMapIntensity: 2.4 }),
    shutter: new THREE.MeshStandardMaterial({ name: 'house-shutter', map: shutterTexture(), roughness: 0.62 }),
    iron: new THREE.MeshStandardMaterial({ name: 'house-iron', color: new THREE.Color(0.025, 0.025, 0.028), roughness: 0.45, metalness: 0.6 }),
  };
  return MATS;
}

function buildMeshes(acc, name) {
  const M = materials();
  const group = new THREE.Group();
  group.name = name;
  for (const key of Object.keys(acc.g)) {
    const geo = acc.build(key);
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, M[key]);
    mesh.name = `${name}-${key}`;
    mesh.castShadow = key !== 'glass';
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

// ------------------------------------------------------------------ the neighbours' house
// a smaller tuffeau house with a slate hipped roof, beyond the old fence (seen above it)
export function createNeighbourHouse() {
  const acc = new Acc();
  const cx = -57, cz = -17, w = 11, d = 8.5, top = 6.1;
  const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
  const ops = (n, W) => {
    const o = [];
    for (let i = 0; i < n; i++) {
      const s = ((i + 0.5) / n) * W;
      o.push({ s0: s - 0.55, s1: s + 0.55, t0: 1.0, t1: 3.2, shutters: true, panes: 4 });
      o.push({ s0: s - 0.5, s1: s + 0.5, t0: 4.0, t1: 5.6, shutters: true, panes: 3 });
    }
    return o;
  };
  // the facade seen from the yard faces +X
  facade(acc, { o: [x1, 0, z1], u: [0, 0, -1], n: [1, 0, 0], width: d, uOffset: 0.7 }, ops(2, d), 0, top);
  facade(acc, { o: [x0, 0, z1], u: [1, 0, 0], n: [0, 0, 1], width: w, uOffset: 0.2 }, ops(3, w), 0, top);
  facade(acc, { o: [x1, 0, z0], u: [-1, 0, 0], n: [0, 0, -1], width: w, uOffset: 0.4 }, [], 0, top);
  facade(acc, { o: [x0, 0, z0], u: [0, 0, 1], n: [-1, 0, 0], width: d, uOffset: 0.9 }, [], 0, top);
  const o = 0.3, ye = top + 0.2;
  acc.box('trim', x0 - o, x1 + o, top, ye, z0 - o, z1 + o, { tile: 1 });
  const tanP = Math.tan((45 * Math.PI) / 180);
  const hd = (d + 2 * o) / 2, yr = ye + hd * tanP;
  const E0 = [x0 - o, ye, z1 + o], E1 = [x1 + o, ye, z1 + o], E2 = [x1 + o, ye, z0 - o], E3 = [x0 - o, ye, z0 - o];
  const R0 = [x0 - o + hd, yr, cz], R1 = [x1 + o - hd, yr, cz];
  for (const [a, b, c] of [[E0, E1, R1], [E0, R1, R0], [E2, E3, R0], [E2, R0, R1], [E3, E0, R0], [E1, E2, R1]]) acc.tri('slate', a, b, c, { tile: SLATE_TILE });
  for (const [a, b] of [[E0, R0], [E1, R1], [E2, R1], [E3, R0], [R0, R1]]) acc.beam('zinc', add(a, [0, 0.04, 0]), add(b, [0, 0.04, 0]), 0.14, 0.07);
  acc.box('trim', cx + 2.2, cx + 2.8, yr - 1.6, yr + 1.1, cz - 0.4, cz + 0.4, { tile: 1, color: [0.88, 0.87, 0.84] });
  return buildMeshes(acc, 'garden-neighbour');
}

// ------------------------------------------------------------------ distant farms and village
// simple gabled buildings (tuffeau walls, slate roofs) and a church with its spire, far out in
// the countryside: a few hundred metres for the farms, two kilometres for the village
function gabled(acc, cx, cz, w, d, wallH, pitchDeg, yaw, y0, wallCol = [0.92, 0.9, 0.86]) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const P = (x, y, z) => [cx + x * c - z * s, y0 + y, cz + x * s + z * c];
  const hw = w / 2, hd = d / 2;
  const rh = hd * Math.tan((pitchDeg * Math.PI) / 180);
  const q = (a, b, cc, dd, name, col) => {
    acc.tri(name, a, b, cc, { tile: name === 'slate' ? SLATE_TILE : 1, color: col });
    acc.tri(name, a, cc, dd, { tile: name === 'slate' ? SLATE_TILE : 1, color: col });
  };
  // walls (front, right, back, left), counter-clockwise from outside
  q(P(-hw, -1, hd), P(hw, -1, hd), P(hw, wallH, hd), P(-hw, wallH, hd), 'trim', wallCol);
  q(P(hw, -1, hd), P(hw, -1, -hd), P(hw, wallH, -hd), P(hw, wallH, hd), 'trim', wallCol);
  q(P(hw, -1, -hd), P(-hw, -1, -hd), P(-hw, wallH, -hd), P(hw, wallH, -hd), 'trim', wallCol);
  q(P(-hw, -1, -hd), P(-hw, -1, hd), P(-hw, wallH, hd), P(-hw, wallH, -hd), 'trim', wallCol);
  // gables
  acc.tri('trim', P(hw, wallH, hd), P(hw, wallH, -hd), P(hw, wallH + rh, 0), { tile: 1, color: wallCol });
  acc.tri('trim', P(-hw, wallH, -hd), P(-hw, wallH, hd), P(-hw, wallH + rh, 0), { tile: 1, color: wallCol });
  // roof slopes with a little overhang
  const o = 0.3;
  q(P(-hw - o, wallH - 0.2, hd + o), P(hw + o, wallH - 0.2, hd + o), P(hw + o, wallH + rh, 0), P(-hw - o, wallH + rh, 0), 'slate', [1, 1, 1]);
  q(P(hw + o, wallH - 0.2, -hd - o), P(-hw - o, wallH - 0.2, -hd - o), P(-hw - o, wallH + rh, 0), P(hw + o, wallH + rh, 0), 'slate', [1, 1, 1]);
  return { P, rh };
}

export function createFarmsAndVillage(heightAtFn) {
  const acc = new Acc();
  const farms = [
    [232, -392, 26, 8, 4.2, 45, 0.3],
    [262, -418, 17, 11, 5.2, 40, 0.3 + Math.PI / 2],
    [-286, -566, 21, 8, 4.0, 45, -0.2],
    [-300, -548, 12, 9, 4.6, 40, -0.2 + Math.PI / 2],
    [470, 120, 22, 8, 4.0, 45, 1.2],
  ];
  for (const [x, z, w, d, h, p, yaw] of farms) gabled(acc, x, z, w, d, h, p, yaw, heightAtFn(x, z));
  // the village: houses around a church, two kilometres away
  const vx = 640, vz = -2260;
  const rnd = mulberry32v(71);
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2, r = 30 + rnd() * 110;
    const x = vx + Math.cos(a) * r, z = vz + Math.sin(a) * r * 0.6;
    gabled(acc, x, z, 9 + rnd() * 8, 7 + rnd() * 3, 5 + rnd() * 2.5, 45, rnd() * Math.PI, heightAtFn(x, z));
  }
  const y0 = heightAtFn(vx, vz);
  gabled(acc, vx, vz, 30, 11, 10, 50, 0.1, y0);
  // bell tower and spire at the west end of the nave
  const c = Math.cos(0.1), s = Math.sin(0.1);
  const tx = vx - 17 * c, tz = vz - 17 * s;
  acc.box('trim', tx - 3.2, tx + 3.2, y0 - 1, y0 + 21, tz - 3.2, tz + 3.2, { tile: 1, color: [0.9, 0.88, 0.84] });
  const apex = [tx, y0 + 38, tz];
  const b = [[tx - 3.5, y0 + 21, tz + 3.5], [tx + 3.5, y0 + 21, tz + 3.5], [tx + 3.5, y0 + 21, tz - 3.5], [tx - 3.5, y0 + 21, tz - 3.5]];
  for (let i = 0; i < 4; i++) acc.tri('slate', b[i], b[(i + 1) % 4], apex, { tile: SLATE_TILE });
  return buildMeshes(acc, 'garden-farms');
}
function mulberry32v(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
