// The clipped charmille hedge between the lawn and the forecourt, the flower beds along the
// facade (hydrangeas, lavender), clipped box balls, and shrub masses around the house and on
// the neighbours' side. All of it is leaf cards in the shared foliage draw call; the hedge
// also has a dark solid core so it never reads as see-through.
import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { CELL } from './foliage-tex.js';
import { cardFrame } from './trees.js';
import { HEDGE, NEIGH_HEDGE, FACADE_Z, heightAt } from './layout.js';

const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

// an ellipsoid bush: cards in a shell, normals outward
function bush(cards, rnd, x, z, rx, ry, rz, cells, size, density = 1, yLift = 0) {
  const y0 = heightAt(x, z) + yLift;
  const cy = y0 + ry * 0.92;
  const area = 4 * Math.PI * Math.pow((Math.pow(rx * ry, 1.6) + Math.pow(rx * rz, 1.6) + Math.pow(ry * rz, 1.6)) / 3, 1 / 1.6);
  const n = Math.max(6, Math.round((area / (size * size)) * 2.2 * density));
  for (let i = 0; i < n; i++) {
    let u;
    for (;;) {
      u = [rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1];
      const l = Math.hypot(u[0], u[1], u[2]);
      if (l > 0.05 && l <= 1) break;
    }
    const l = Math.hypot(u[0], u[1], u[2]);
    const shell = 0.7 + 0.3 * Math.pow(rnd(), 0.5);
    const d = [u[0] / l * shell, u[1] / l * shell, u[2] / l * shell];
    if (d[1] < -0.85) continue;
    const c = [x + d[0] * rx, cy + d[1] * ry, z + d[2] * rz];
    const out = norm([d[0] / rx, d[1] / ry, d[2] / rz]);
    const nn = norm([out[0] * 0.8 + (rnd() - 0.5) * 0.9, out[1] * 0.8 + (rnd() - 0.5) * 0.9 + 0.2, out[2] * 0.8 + (rnd() - 0.5) * 0.9]);
    const s = size * (0.8 + 0.4 * rnd());
    const [t1, t2] = cardFrame(nn, rnd, s, s);
    const hy = Math.min(1, Math.max(0, (d[1] + 1) / 2));
    const ao = (0.35 + 0.65 * shell * shell) * (0.6 + 0.4 * hy);
    cards.add(c, t1, t2, nn, out, ao, cells[(rnd() * cells.length) | 0], rnd(), rnd(), 0.25);
  }
}

// cards over a box hedge (both faces, top, ends), normals bent round the top edges
function hedgeCards(cards, rnd, x0, x1) {
  const { z, t, h } = HEDGE;
  const len = x1 - x0;
  const faces = [
    { n: [0, 0, 1], area: len * h },
    { n: [0, 0, -1], area: len * h },
    { n: [0, 1, 0], area: len * t },
    { n: [-1, 0, 0], area: t * h, end: x0 },
    { n: [1, 0, 0], area: t * h, end: x1 },
  ];
  const size = 0.52;
  for (const f of faces) {
    const n = Math.round(f.area * 13);
    for (let i = 0; i < n; i++) {
      let p, cn;
      if (f.n[1] === 1) {
        const x = x0 + rnd() * len, zz = z + (rnd() - 0.5) * t;
        p = [x, h + (rnd() - 0.3) * 0.08, zz];
        const e = (zz - z) / (t / 2);
        cn = norm([0, 1, e * 0.8]);
      } else if (f.n[0] !== 0) {
        p = [f.end + f.n[0] * (rnd() * 0.06), rnd() * h, z + (rnd() - 0.5) * t];
        cn = f.n;
      } else {
        const y = rnd() * h;
        p = [x0 + rnd() * len, y, z + f.n[2] * (t / 2 + (rnd() - 0.4) * 0.07)];
        const top = Math.max(0, (y - (h - 0.25)) / 0.25);
        cn = norm([0, top * 0.9, f.n[2]]);
      }
      p[1] += heightAt(p[0], p[2]);
      const nn = norm([cn[0] + (rnd() - 0.5) * 0.45, cn[1] + (rnd() - 0.5) * 0.45, cn[2] + (rnd() - 0.5) * 0.45]);
      const s = size * (0.8 + 0.4 * rnd());
      const [t1, t2] = cardFrame(nn, rnd, s, s);
      const hy = Math.min(1, Math.max(0, (p[1] - 0.05) / h));
      const ao = 0.5 + 0.5 * Math.pow(hy, 0.8);
      cards.add(p, t1, t2, nn, cn, ao, CELL.hornbeam[(rnd() * 2) | 0], rnd() * 0.6, rnd(), 0.08);
    }
  }
}

// a hedge run along z (x fixed), faces toward +x and -x, and its top
function hedgeAlongZ(cards, rnd, H, cells, size) {
  const { x, z0, z1, h, t } = H;
  const len = z1 - z0;
  const faces = [[1, len * h], [-1, len * h], [0, len * t]];
  for (const [fx, area] of faces) {
    const n = Math.round((area / (size * size)) * 2.0);
    for (let i = 0; i < n; i++) {
      let p, cn;
      const z = z0 + rnd() * len;
      if (fx === 0) {
        const xx = x + (rnd() - 0.5) * t;
        p = [xx, h + (rnd() - 0.3) * 0.12, z];
        cn = norm([((xx - x) / (t / 2)) * 0.8, 1, 0]);
      } else {
        const y = rnd() * h;
        p = [x + fx * (t / 2 + (rnd() - 0.4) * 0.12), y, z];
        cn = norm([fx, Math.max(0, (y - (h - 0.35)) / 0.35) * 0.9, 0]);
      }
      p[1] += heightAt(p[0], p[2]);
      const nn = norm([cn[0] + (rnd() - 0.5) * 0.9, cn[1] + (rnd() - 0.5) * 0.9, cn[2] + (rnd() - 0.5) * 0.9]);
      const s = size * (0.8 + 0.4 * rnd());
      const [t1, t2] = cardFrame(nn, rnd, s, s);
      const ao = 0.4 + 0.6 * Math.min(1, Math.max(0, (p[1] - 0.05) / h));
      cards.add(p, t1, t2, nn, cn, ao, cells[(rnd() * cells.length) | 0], rnd() * 0.6, rnd(), 0.1);
    }
  }
}

export function createShrubs(cards) {
  const rnd = mulberry32(9001);
  hedgeAlongZ(cards, rnd, NEIGH_HEDGE, CELL.laurel, 0.9);
  // hedge in two runs, either side of the gap facing the perron
  const runs = [[HEDGE.x0, HEDGE.gap0], [HEDGE.gap1, HEDGE.x1]];
  for (const [a, b] of runs) hedgeCards(cards, rnd, a, b);
  // hydrangeas and lavender in the beds along the facade
  const zb = FACADE_Z + 0.62;
  for (const [a, b] of [[-11.0, -6.2], [-1.8, 3.0]]) {
    const n = 4;
    for (let i = 0; i < n; i++) {
      const x = a + ((i + 0.5) / n) * (b - a) + (rnd() - 0.5) * 0.25;
      const blue = (i + (a < -5 ? 0 : 1)) % 3 !== 0;
      bush(cards, rnd, x, zb - 0.08, 0.62, 0.55, 0.5, blue ? CELL.hydrangeaBlue : CELL.hydrangeaWhite, 0.5, 1.1);
    }
    for (let x = a + 0.2; x < b - 0.1; x += 0.46) bush(cards, rnd, x, FACADE_Z + 1.12, 0.26, 0.28, 0.22, CELL.lavender, 0.42, 1.2);
  }
  // clipped box balls at the foot of the perron and at the forecourt corners
  for (const [x, z] of [[-6.0, FACADE_Z + 3.1], [-2.0, FACADE_Z + 3.1], [-14.6, -29.2], [8.4, -29.2]]) bush(cards, rnd, x, z, 0.46, 0.42, 0.46, CELL.box, 0.32, 1.6);
  // shrub masses: house corners, the left of the forecourt, the neighbours' side of the old fence
  const masses = [
    [-14.0, -34.5, 1.6, 1.4, 1.4, CELL.laurel],
    [6.6, -35.0, 1.5, 1.3, 1.3, CELL.laurel],
    [-21.5, -31.5, 2.2, 1.8, 1.8, CELL.hornbeam],
    [-26.2, -20, 1.6, 1.5, 1.4, CELL.laurel],
    [-26.6, -13.5, 1.5, 1.45, 1.4, CELL.hornbeam],
    [-26.4, -10, 1.3, 1.35, 1.3, CELL.laurel],
    [-26.3, 3.2, 1.5, 1.55, 1.4, CELL.laurel],
    [-26.8, 7.5, 1.6, 1.4, 1.5, CELL.hornbeam],
    [-26.4, 12, 1.8, 1.4, 1.6, CELL.hornbeam],
    [-41.8, -8, 1.8, 1.6, 1.6, CELL.hornbeam],
    [11.8, -30.6, 1.6, 1.2, 1.2, CELL.hornbeam],
    [14.5, -33.8, 2.2, 1.7, 1.8, CELL.oak],
  ];
  for (const [x, z, rx, ry, rz, cells] of masses) bush(cards, rnd, x, z, rx, ry, rz, cells, 0.72, 1.0);
}

// the solid core of the hedge (also its shadow): two long boxes, slightly inside the cards
export function hedgeCore() {
  const { z, t, h } = HEDGE;
  const geos = [];
  for (const [a, b] of [[HEDGE.x0, HEDGE.gap0], [HEDGE.gap1, HEDGE.x1]]) {
    const g = new THREE.BoxGeometry(b - a - 0.12, h - 0.1, t - 0.14);
    g.translate((a + b) / 2, (h - 0.1) / 2, z);
    geos.push(g);
  }
  const NH = NEIGH_HEDGE;
  const g2 = new THREE.BoxGeometry(NH.t - 0.3, NH.h - 0.15, NH.z1 - NH.z0 - 0.3);
  g2.translate(NH.x, (NH.h - 0.15) / 2, (NH.z0 + NH.z1) / 2);
  geos.push(g2);
  const merged = new THREE.BufferGeometry();
  // simple merge of two boxes
  const pos = [], nrm = [], idx = [];
  let off = 0;
  for (const g of geos) {
    pos.push(...g.attributes.position.array);
    nrm.push(...g.attributes.normal.array);
    for (const i of g.index.array) idx.push(i + off);
    off += g.attributes.position.count;
  }
  merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  merged.setIndex(idx);
  const mat = new THREE.MeshStandardMaterial({ name: 'garden-hedge-core', color: new THREE.Color(0.036, 0.068, 0.022), roughness: 0.95 });
  const mesh = new THREE.Mesh(merged, mat);
  mesh.name = 'garden-hedge-core';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
