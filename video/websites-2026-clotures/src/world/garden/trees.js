// Big parkland trees (lime trees and oaks): the branching is grown by space colonization
// inside the crown envelope (an ovoid for the limes, a union of lobes for the oaks), branch
// radii follow the pipe model, limbs and the trunk (root flare, buttresses) become bark tubes
// merged into one mesh. Leaves are cards painted with leaf clusters (foliage-tex.js), placed
// at the twigs, lit with a crown normal (volume), crown occlusion and translucency, cut out
// with alpha-to-coverage; all cards of all trees, shrubs and the hedge share one draw call.
import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { foliageAtlas, cellRect, CELL } from './foliage-tex.js';
import { barkTextures } from './bark-tex.js';
import { LIGHT_GLSL } from './lighting.js';
import { HAZE_GLSL } from './atmosphere.js';
import { heightAt } from './layout.js';

const fract = (x) => x - Math.floor(x);

const SPECIES = {
  lime: { base: 0.13, cells: CELL.lime, card: [0.68, 1.0], trunkR: 0.46, bark: [0.7, 0.68, 0.66], points: 3300, leader: 0.35, up: 0.14,
    lobes: 7, lobeR: [0.4, 0.56], ring: 0.5, lobeY: 0.0, lobeYv: 0.35, lobeTop: 0.42 },
  oak: { base: 0.11, cells: CELL.oak, card: [0.73, 1.05], trunkR: 0.62, bark: [0.66, 0.6, 0.54], points: 3500, leader: 0.05, up: 0.05,
    lobes: 10, lobeR: [0.32, 0.48], ring: 0.6, lobeY: 0.05, lobeYv: 0.4, lobeTop: 0.4 },
};

// ------------------------------------------------------------ card builder (shared)
export class Cards {
  constructor() {
    this.list = [];
  }
  // c: centre, t1/t2: half-extent vectors in the card plane, n: card normal, cn: crown normal,
  // ao: crown occlusion, cell: atlas cell, tint 0..1, phase 0..1, sway 0..1
  add(c, t1, t2, n, cn, ao, cell, tint, phase, sway) {
    this.list.push([c, t1, t2, n, cn, ao, cell, tint, phase, sway]);
  }
  build(seed = 5) {
    const rnd = mulberry32(seed);
    const L = this.list;
    // shuffled, so that a draw range keeps an even share of every crown (quality levels)
    for (let i = L.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = L[i];
      L[i] = L[j];
      L[j] = t;
    }
    const n = L.length;
    const pos = new Float32Array(n * 12), cor = new Float32Array(n * 12), nrm = new Float32Array(n * 12);
    const uv = new Float32Array(n * 8), crown = new Float32Array(n * 16), leaf = new Float32Array(n * 16);
    const idx = new Uint32Array(n * 6);
    const sgn = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const uvs = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (let i = 0; i < n; i++) {
      const [c, t1, t2, nn, cn, ao, cell, tint, phase, sway] = L[i];
      const r = cellRect(cell);
      const inset = 0.004;
      for (let k = 0; k < 4; k++) {
        const v = i * 4 + k;
        pos.set(c, v * 3);
        cor[v * 3] = t1[0] * sgn[k][0] + t2[0] * sgn[k][1];
        cor[v * 3 + 1] = t1[1] * sgn[k][0] + t2[1] * sgn[k][1];
        cor[v * 3 + 2] = t1[2] * sgn[k][0] + t2[2] * sgn[k][1];
        nrm.set(nn, v * 3);
        uv[v * 2] = r[0] + r[2] * (inset + uvs[k][0] * (1 - 2 * inset));
        uv[v * 2 + 1] = r[1] + r[3] * (inset + uvs[k][1] * (1 - 2 * inset));
        crown[v * 4] = cn[0];
        crown[v * 4 + 1] = cn[1];
        crown[v * 4 + 2] = cn[2];
        crown[v * 4 + 3] = ao;
        leaf[v * 4] = tint;
        leaf[v * 4 + 1] = phase;
        leaf[v * 4 + 2] = sway;
        leaf[v * 4 + 3] = cell;
      }
      idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aCorner', new THREE.BufferAttribute(cor, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('aCrown', new THREE.BufferAttribute(crown, 4));
    geo.setAttribute('aLeaf', new THREE.BufferAttribute(leaf, 4));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeBoundingSphere();
    geo.boundingSphere.radius += 2;
    return geo;
  }
}

const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
};
function randUnit(rnd) {
  for (;;) {
    const x = rnd() * 2 - 1, y = rnd() * 2 - 1, z = rnd() * 2 - 1;
    const l = x * x + y * y + z * z;
    if (l > 1e-4 && l <= 1) {
      const s = 1 / Math.sqrt(l);
      return [x * s, y * s, z * s];
    }
  }
}
export function cardFrame(n, rnd, w, h) {
  const a = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let t1 = v3.norm(v3.cross(a, n));
  let t2 = v3.cross(n, t1);
  const ang = rnd() * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang);
  const r1 = v3.add(v3.mul(t1, ca), v3.mul(t2, sa)), r2 = v3.add(v3.mul(t1, -sa), v3.mul(t2, ca));
  return [v3.mul(r1, w / 2), v3.mul(r2, h / 2)];
}

// ------------------------------------------------------------ growth
export function growTree(t) {
  const sp = SPECIES[t.kind];
  const rnd = mulberry32(t.seed * 7919 + 13);
  const y0 = heightAt(t.x, t.z);
  const H = t.h, R = t.r;
  const yb = H * sp.base;
  const ry = (H - yb) / 2;
  const lean = t.lean ? [t.lean[0] * 1.1, 0, t.lean[1] * 1.1] : [0, 0, 0];
  const c = [t.x + lean[0], y0 + yb + ry, t.z + lean[2]];
  const rad = [R, ry, R * (0.92 + rnd() * 0.12)];
  // the crown is a union of lobes (sub-crowns): clumps with gaps between them, each shaded
  // like its own small dome (see leafCards)
  const lobes = [];
  for (let i = 0; i < sp.lobes; i++) {
    let q;
    if (i === 0) q = [(rnd() - 0.5) * 0.2, sp.lobeTop, (rnd() - 0.5) * 0.2];
    else {
      const a = (i / (sp.lobes - 1)) * Math.PI * 2 + rnd() * 0.9;
      const rr = sp.ring * (0.8 + 0.4 * rnd());
      q = [Math.cos(a) * rr, sp.lobeY + (rnd() * 2 - 1) * sp.lobeYv, Math.sin(a) * rr];
    }
    lobes.push({ q, r: sp.lobeR[0] + rnd() * (sp.lobeR[1] - sp.lobeR[0]) });
  }
  if (t.extraLobes) for (const [q, r] of t.extraLobes) lobes.push({ q, r });
  const pts = [];
  let guard = 0;
  while (pts.length < sp.points && guard++ < 400000) {
    const x = rnd() * 2 - 1, y = rnd() * 2 - 1, z = rnd() * 2 - 1;
    const l2 = x * x + y * y + z * z;
    if (l2 > 1.0 && !t.extraLobes) continue;
    if (y < -0.75 && !t.extraLobes) continue; // flatter underside
    let best = 9;
    for (const lb of lobes) {
      const dx = x - lb.q[0], dy = y - lb.q[1], dz = z - lb.q[2];
      best = Math.min(best, Math.sqrt(dx * dx + dy * dy + dz * dz) / lb.r);
    }
    if (best > 1) continue;
    if (rnd() > 0.25 + best * best) continue; // more points toward the lobe shells
    pts.push([c[0] + x * rad[0], c[1] + y * rad[1], c[2] + z * rad[2]]);
  }
  const lobesW = lobes.map((lb) => ({ c: [c[0] + lb.q[0] * rad[0], c[1] + lb.q[1] * rad[1], c[2] + lb.q[2] * rad[2]], rr: [lb.r * rad[0], lb.r * rad[1], lb.r * rad[2]] }));
  const Di = 3.6, Dk = 0.8, D = 0.4;
  // trunk, with a slight bend
  const nodes = [];
  const add = (p, parent) => {
    nodes.push({ p, parent, ch: [], r: 0 });
    return nodes.length - 1;
  };
  let prev = add([t.x, y0 - 0.25, t.z], -1);
  const top = yb + ry * sp.leader;
  const bend = [(rnd() - 0.5) * 0.6, 0, (rnd() - 0.5) * 0.6];
  for (let y = 0.35; y <= top; y += 0.5) {
    const k = y / top;
    const p = [t.x + bend[0] * Math.sin(k * 2.2) + lean[0] * k * k, y0 + y, t.z + bend[2] * Math.sin(k * 2.2) + lean[2] * k * k];
    prev = add(p, prev);
  }
  // space colonization
  const cell = Di;
  const grid = new Map();
  const key = (x, y, z) => ((Math.floor(x / cell) * 73856093) ^ (Math.floor(y / cell) * 19349663) ^ (Math.floor(z / cell) * 83492791)) | 0;
  const insert = (i) => {
    const p = nodes[i].p;
    const k = key(p[0], p[1], p[2]);
    let a = grid.get(k);
    if (!a) grid.set(k, (a = []));
    a.push(i);
  };
  // the trunk keeps climbing toward the crown centre until it reaches the attraction points
  for (let guard2 = 0; guard2 < 60; guard2++) {
    const q = nodes[prev].p;
    let near = false;
    for (const p of pts) {
      if ((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2 < Di * Di * 0.8) {
        near = true;
        break;
      }
    }
    if (near) break;
    const d = v3.norm(v3.sub(c, q));
    prev = add(v3.add(q, v3.mul(v3.norm(v3.add(d, [0, 1.5, 0])), D)), prev);
  }
  for (let i = 0; i < nodes.length; i++) insert(i);
  let alive = pts.map((p) => ({ p, dead: false }));
  for (let it = 0; it < 260 && alive.length; it++) {
    const acc = new Map();
    for (const a of alive) {
      const [px, py, pz] = a.p;
      let best = -1, bd = Di * Di;
      const cx = Math.floor(px / cell), cy = Math.floor(py / cell), cz = Math.floor(pz / cell);
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          for (let dz = -1; dz <= 1; dz++) {
            const arr = grid.get((((cx + dx) * 73856093) ^ ((cy + dy) * 19349663) ^ ((cz + dz) * 83492791)) | 0);
            if (!arr) continue;
            for (const i of arr) {
              const q = nodes[i].p;
              const d2 = (q[0] - px) ** 2 + (q[1] - py) ** 2 + (q[2] - pz) ** 2;
              if (d2 < bd) {
                bd = d2;
                best = i;
              }
            }
          }
      if (best < 0) continue;
      if (bd < Dk * Dk) {
        a.dead = true;
        continue;
      }
      const q = nodes[best].p;
      const d = v3.norm([px - q[0], py - q[1], pz - q[2]]);
      const s = acc.get(best);
      if (s) {
        s[0] += d[0];
        s[1] += d[1];
        s[2] += d[2];
      } else acc.set(best, d.slice());
    }
    alive = alive.filter((a) => !a.dead);
    if (!acc.size) break;
    for (const [i, d] of acc) {
      const q = nodes[i].p;
      let dir = v3.add(v3.norm(d), [0, sp.up, 0]);
      if (v3.len(dir) < 0.2) dir = randUnit(rnd);
      dir = v3.norm(v3.add(dir, v3.mul(randUnit(rnd), 0.12)));
      // branches never dive steeply (a limb growing down along the trunk reads as a growth)
      if (dir[1] < -0.3) {
        dir[1] = -0.3;
        dir = v3.norm(dir);
      }
      const j = add(v3.add(q, v3.mul(dir, D)), i);
      insert(j);
    }
  }
  for (let i = 1; i < nodes.length; i++) nodes[nodes[i].parent].ch.push(i);
  // pipe model radii, then scaled to the species' trunk
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (!n.ch.length) n.r = 1;
    else {
      let s = 0;
      for (const j of n.ch) s += Math.pow(nodes[j].r, 2.1);
      n.r = Math.pow(s, 1 / 2.1);
    }
  }
  const k = sp.trunkR * (t.h / 20) / nodes[0].r;
  for (const n of nodes) n.r *= k;
  // steps to the nearest tip (0 at the tips): leaves go on the last few steps of every twig
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    n.tip = n.ch.length ? Math.min(...n.ch.map((j) => nodes[j].tip)) + 1 : 0;
  }
  return { nodes, c, rad, sp, y0, lobes: lobesW };
}

// ------------------------------------------------------------ bark tubes
function barkGeometry(tree, out) {
  const { nodes, c, rad, sp } = tree;
  const chains = [];
  const stack = [[0, [0]]];
  while (stack.length) {
    const [start, chain] = stack.pop();
    let n = start;
    for (;;) {
      // the chain carries on with the child that is both thick and straight ahead (a trunk
      // must not turn into its first big limb: the tube would pinch at the bend)
      const par = nodes[n].parent;
      const dir = par >= 0 ? v3.norm(v3.sub(nodes[n].p, nodes[par].p)) : [0, 1, 0];
      const score = (j) => nodes[j].r * (0.35 + 0.65 * Math.max(0, v3.dot(dir, v3.norm(v3.sub(nodes[j].p, nodes[n].p)))));
      const ch = nodes[n].ch.slice().sort((a, b) => score(b) - score(a));
      if (!ch.length) break;
      for (let i = 1; i < ch.length; i++) stack.push([ch[i], [n, ch[i]]]);
      n = ch[0];
      chain.push(n);
    }
    chains.push(chain);
  }
  const minR = 0.034;
  for (const chain of chains) {
    const r0 = nodes[chain[1] !== undefined ? chain[1] : chain[0]].r;
    if (r0 < minR || chain.length < 2) continue;
    // thin the polyline on small branches, cut it where it becomes a twig
    // thick limbs: longer segments and more smoothing (a tube thicker than its segment
    // length pinches at every kink); thin ones keep every node
    const step = r0 > 0.15 ? 3 : 2;
    let idx = chain.filter((j, i) => i === 0 || i === chain.length - 1 || i % step === 0);
    idx = idx.filter((j, i) => i < 2 || nodes[j].r > minR * 0.6);
    if (idx.length < 2) continue;
    const P = idx.map((j) => nodes[j].p.slice());
    const Rr = idx.map((j) => nodes[j].r);
    // a branch starts at its parent's node but with its own radius (a little flared), never
    // with the parent's: that would ring the trunk with a collar at every junction
    if (chain[0] !== 0) Rr[0] = Math.min(Rr[0], Rr[1] * 1.15);
    const passes = r0 > 0.15 ? 5 : 3;
    for (let pass = 0; pass < passes; pass++)
      for (let i = 1; i < P.length - 1; i++) for (let a = 0; a < 3; a++) P[i][a] = (P[i - 1][a] + 2 * P[i][a] + P[i + 1][a]) / 4;
    const sides = r0 > 0.25 ? 10 : r0 > 0.1 ? 7 : r0 > 0.06 ? 5 : 3;
    const isTrunk = chain[0] === 0;
    const uRep = Math.max(1, Math.round((2 * Math.PI * r0) / 0.6));
    let N = null;
    let vAcc = 0;
    const base = out.pos.length / 3;
    for (let i = 0; i < P.length; i++) {
      const T = v3.norm(v3.sub(P[Math.min(P.length - 1, i + 1)], P[Math.max(0, i - 1)]));
      if (!N) N = v3.norm(v3.cross(T, Math.abs(T[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
      else N = v3.norm(v3.sub(N, v3.mul(T, v3.dot(N, T))));
      const B = v3.cross(T, N);
      if (i > 0) vAcc += v3.len(v3.sub(P[i], P[i - 1]));
      const y = P[i][1] - tree.y0;
      let r = Rr[i];
      if (isTrunk && y < 1.4) r *= 1 + 0.5 * Math.exp(-Math.max(0, y) / 0.32);
      // occlusion: inside the crown and near the ground
      const e = v3.len([(P[i][0] - c[0]) / rad[0], (P[i][1] - c[1]) / rad[1], (P[i][2] - c[2]) / rad[2]]);
      let ao = e < 1.05 ? 0.38 + 0.62 * Math.min(1, Math.max(0, (e - 0.15) / 0.9)) : 0.92;
      ao *= 0.72 + 0.28 * Math.min(1, Math.max(0, y / 1.2));
      for (let s = 0; s <= sides; s++) {
        const a = (s / sides) * Math.PI * 2;
        let rr = r;
        if (isTrunk && y < 2.2) rr *= 1 + 0.2 * Math.pow(Math.max(0, Math.cos(5 * a + tree.nodes.length)), 2) * Math.exp(-Math.max(0, y) / 0.7);
        const dir = v3.add(v3.mul(N, Math.cos(a)), v3.mul(B, Math.sin(a)));
        const p = v3.add(P[i], v3.mul(dir, rr));
        out.pos.push(p[0], p[1], p[2]);
        out.nrm.push(dir[0], dir[1], dir[2]);
        out.uv.push((s / sides) * uRep, vAcc / 1.15);
        out.col.push(sp.bark[0] * ao, sp.bark[1] * ao, sp.bark[2] * ao);
      }
    }
    const ring = sides + 1;
    for (let i = 0; i < P.length - 1; i++)
      for (let s = 0; s < sides; s++) {
        const a = base + i * ring + s, b = a + 1, c2 = a + ring, d = c2 + 1;
        out.idx.push(a, c2, b, b, c2, d);
      }
    // close the end of the tube with a short cone (no hollow branch ends)
    const last = P.length - 1;
    const Te = v3.norm(v3.sub(P[last], P[Math.max(0, last - 1)]));
    const tip = v3.add(P[last], v3.mul(Te, Rr[last] * 1.5));
    const ti = out.pos.length / 3;
    out.pos.push(tip[0], tip[1], tip[2]);
    out.nrm.push(Te[0], Te[1], Te[2]);
    out.uv.push(0.5, vAcc / 1.15 + 0.1);
    out.col.push(sp.bark[0] * 0.7, sp.bark[1] * 0.7, sp.bark[2] * 0.7);
    for (let s = 0; s < sides; s++) {
      const a = base + last * ring + s;
      out.idx.push(a, ti, a + 1);
    }
  }
}

// ------------------------------------------------------------ leaves on the twigs
function leafCards(tree, cards, density = 1) {
  const { nodes, c, rad, sp } = tree;
  const rnd = mulberry32(nodes.length * 31 + 7);
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.tip > 2) continue;
    const count = Math.round((n.tip ? 1.2 + rnd() * 1.2 : 3.4 + rnd() * 1.2) * density);
    for (let k = 0; k < count; k++) {
      const rel = [(n.p[0] - c[0]) / rad[0], (n.p[1] - c[1]) / rad[1], (n.p[2] - c[2]) / rad[2]];
      const e = v3.len(rel);
      const gOut = v3.norm([rel[0] / rad[0], rel[1] / rad[1], rel[2] / rad[2]]);
      // nearest lobe: its own dome normal and occlusion make the clumps read in volume
      let lb = tree.lobes[0], le = 9, lrel = [0, 1, 0];
      for (const L of tree.lobes) {
        const r2 = [(n.p[0] - L.c[0]) / L.rr[0], (n.p[1] - L.c[1]) / L.rr[1], (n.p[2] - L.c[2]) / L.rr[2]];
        const d = v3.len(r2);
        if (d < le) {
          le = d;
          lb = L;
          lrel = r2;
        }
      }
      const lOut = v3.norm([lrel[0] / lb.rr[0], lrel[1] / lb.rr[1], lrel[2] / lb.rr[2]]);
      const out = v3.norm(v3.add(v3.mul(gOut, 0.42), v3.mul(lOut, 0.58)));
      const centre = v3.add(v3.add(n.p, v3.mul(randUnit(rnd), 0.32)), v3.mul(out, 0.14));
      const nn = v3.norm(v3.add(v3.add(v3.mul(out, 0.75), v3.mul(randUnit(rnd), 0.7)), [0, 0.2, 0]));
      const s = sp.card[0] + rnd() * (sp.card[1] - sp.card[0]);
      const [t1, t2] = cardFrame(nn, rnd, s, s);
      const hy = Math.min(1, Math.max(0, (n.p[1] - (c[1] - rad[1])) / (2 * rad[1])));
      const lAo = 0.5 + 0.5 * Math.min(1, Math.max(0, (le - 0.2) / 0.8)) * (0.72 + 0.28 * Math.min(1, Math.max(0, lrel[1] * 0.5 + 0.5)));
      // dark cores, bright sunlit shells
      const ao = (0.07 + 0.93 * Math.pow(Math.min(1, Math.max(0, (e - 0.12) / 0.9)), 2.0)) * (0.62 + 0.38 * hy) * lAo;
      const sway = Math.min(1, Math.hypot(n.p[0] - c[0], n.p[2] - c[2]) / rad[0]);
      // hue per clump (some bluer, some yellower), a little per card
      const lobeHue = fract(Math.sin(lb.c[0] * 12.9898 + lb.c[1] * 78.233 + lb.c[2] * 37.719) * 43758.5453);
      const tint = Math.min(1, Math.max(0, 0.15 + 0.7 * lobeHue + (rnd() - 0.5) * 0.3));
      cards.add(centre, t1, t2, nn, out, ao, sp.cells[(rnd() * sp.cells.length) | 0], tint, rnd(), sway);
    }
  }
}

// ------------------------------------------------------------ materials
const LEAF_VERT = /* glsl */ `
${LIGHT_GLSL}
attribute vec3 aCorner;
attribute vec4 aCrown;
attribute vec4 aLeaf;
uniform float uLeafScale;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vCN;
varying float vAO;
varying float vShadow;
varying float vTint;
varying vec3 vWorld;
void main() {
  vec3 p = position + aCorner * uLeafScale;
  float ph = aLeaf.y * 6.2831;
  float w = uWind * (0.25 + 0.75 * aLeaf.z);
  p += vec3(sin(uTime * 1.31 + ph) * 0.045 + sin(uTime * 2.73 + ph * 1.7) * 0.018,
            sin(uTime * 2.11 + ph * 0.7) * 0.022,
            cos(uTime * 1.07 + ph) * 0.035) * w;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorld = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vCN = aCrown.xyz;
  vAO = aCrown.w;
  vTint = aLeaf.x;
  vUv = uv;
  // the outer shell of a crown samples its shadow from outside the crown (light leaks through
  // the outer leaves); the cores keep the crown's own shadow
  vShadow = sunShadow4(wp.xyz + uSunDir * (0.2 + 0.9 * aCrown.w * aCrown.w), 0.0, 1.5);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const LEAF_FRAG = /* glsl */ `
${LIGHT_GLSL}
${HAZE_GLSL}
uniform sampler2D uMap;
uniform float uMapSize;
uniform vec3 uLeafTint;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vCN;
varying float vAO;
varying float vShadow;
varying float vTint;
varying vec3 vWorld;
void main() {
  vec4 tex = texture2D(uMap, vUv);
  // alpha-to-coverage: keep coverage in the small mips, then sharpen to a crisp edge
  vec2 px = vUv * uMapSize;
  vec2 dx = dFdx(px), dy = dFdy(px);
  float mip = max(0.0, 0.5 * log2(max(dot(dx, dx), dot(dy, dy))));
  float a = tex.a * (1.0 + mip * 0.3);
  a = (a - 0.5) / max(fwidth(a), 1e-4) + 0.5;
  if (a < 0.25) discard;
  vec3 albedo = tex.rgb * uLeafTint * mix(vec3(0.9, 0.96, 1.06), vec3(1.1, 1.05, 0.82), vTint);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 N = normalize(mix(n, vCN, 0.8));
  float ndl = dot(N, uSunDir);
  float diff = clamp((ndl + 0.08) / 1.08, 0.0, 1.0) * vShadow; // a narrow wrap: sunlit outsides pop
  // light through the leaves: toward the sun (forward) and, diffusely, on the far side of a lit leaf
  float back = pow(clamp(dot(-V, uSunDir), 0.0, 1.0), 3.0);
  float thru = clamp(-dot(n, uSunDir), 0.0, 1.0);
  float trans = vShadow * (back * 0.6 + thru * 0.4);
  vec3 amb = mix(hemiAmbient(N), (uAmbSky + uAmbGround) * 0.5, 0.35);
  // the sunlit outside of a crown pops (vAO ~ 1 outside), the cores stay deep (ambient x vAO^2)
  vec3 col = albedo * (uSunCol * diff * (0.5 + 1.5 * vAO) / G_PI + amb * vAO * vAO * (0.7 + 0.3 * vShadow));
  col += albedo * vec3(1.0, 1.2, 0.45) * uSunCol * trans * 0.16;
  // seen from below, a canopy glows with the sky light coming through it
  col += albedo * vec3(0.9, 1.15, 0.5) * uAmbSky * 0.2 * clamp(-N.y, 0.0, 1.0) * (0.5 + 0.5 * vAO);
  // soft sheen of the waxy upper side
  vec3 H = normalize(uSunDir + V);
  col += uSunCol * pow(max(dot(n, H), 0.0), 24.0) * 0.03 * vAO * vShadow * (1.0 - uWet * 0.3);
  col = applyHaze(col, vWorld - cameraPosition, cameraPosition.y);
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const DEPTH_VERT = /* glsl */ `
attribute vec3 aCorner;
uniform float uLeafScale;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position + aCorner * uLeafScale, 1.0);
}`;
const DEPTH_FRAG = /* glsl */ `
#include <packing>
uniform sampler2D uMap;
varying vec2 vUv;
void main() {
  if (texture2D(uMap, vUv).a < 0.5) discard;
  gl_FragColor = packDepthToRGBA(gl_FragCoord.z);
}`;

export function createLeafMaterials(lightU) {
  const atlas = foliageAtlas();
  const shared = { uMap: { value: atlas.tex }, uLeafScale: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    name: 'garden-leaves',
    uniforms: { ...lightU, ...shared, uMapSize: { value: atlas.size }, uLeafTint: { value: new THREE.Vector3(1.0, 1.05, 0.88) } },
    vertexShader: LEAF_VERT,
    fragmentShader: LEAF_FRAG,
    side: THREE.DoubleSide,
    alphaToCoverage: true,
  });
  const depth = new THREE.ShaderMaterial({
    name: 'garden-leaves-depth',
    uniforms: shared,
    vertexShader: DEPTH_VERT,
    fragmentShader: DEPTH_FRAG,
    side: THREE.DoubleSide,
  });
  return { mat, depth, shared };
}

export function createTrees(list, lightU, cards) {
  const bark = { pos: [], nrm: [], uv: [], col: [], idx: [] };
  const trees = [];
  for (const t of list) {
    const tree = growTree(t);
    barkGeometry(tree, bark);
    leafCards(tree, cards);
    trees.push({ id: t.id, kind: t.kind, x: t.x, z: t.z, nodes: tree.nodes.length, crown: tree.c, rad: tree.rad });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(bark.pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(bark.nrm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(bark.uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(bark.col, 3));
  geo.setIndex(bark.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(bark.idx, 1) : new THREE.Uint16BufferAttribute(bark.idx, 1));
  geo.computeBoundingSphere();
  const bt = barkTextures();
  const mat = new THREE.MeshStandardMaterial({ name: 'garden-bark', map: bt.map, normalMap: bt.normalMap, normalScale: new THREE.Vector2(1.2, 1.2), vertexColors: true, roughness: 0.93, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'garden-bark';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return { bark: mesh, trees };
}
