// Port module: ISO containers. Local frame: length along X (centred), width along Z (centred),
// bottom at y = 0. Door end at +X, front end at −X.
// LOD0: real trapezoidal corrugation on the sides and the front end, roof with gentle dents, door
//       end with four locking bars, cams, handles, hinges, gaskets, corner posts and castings.
// LOD1: a light box with procedural ribs (normal perturbation in the box material), castings,
//       rails and door bars: for the background stacks.
// Attributes: position, normal, uv (marking atlas, −1 = none), color, aBox (rough, metal, paint, ribMode).
import * as THREE from 'three';
import { Kit, box, rbox, cyl, mat } from './kit.js';
import { CONTAINER } from '../layout.js';

const W = CONTAINER.w;

// corrugated strip: s runs along the panel (0..len), profile offset into the panel; returns a
// non-indexed geometry in a local frame where the panel's outer face is z = 0, normal +z, s along
// +x, height along +y (y0..y1); uvFn(s, y) → [u, v] or null
function corrugated(len, y0, y1, pitch0, depth, uvFn) {
  const n = Math.max(1, Math.round(len / pitch0));
  const pitch = len / n;
  const a = pitch * 0.26;
  const b = pitch * 0.245;
  const c = pitch * 0.25;
  const pts = []; // [s, d]
  for (let i = 0; i < n; i++) {
    const s0 = i * pitch;
    pts.push([s0, 0], [s0 + a, 0], [s0 + a + b, -depth], [s0 + a + b + c, -depth]);
  }
  pts.push([len, 0]);
  const pos = [];
  const nor = [];
  const uv = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [sa, da] = pts[i];
    const [sb, db] = pts[i + 1];
    const ds = sb - sa;
    const dd = db - da;
    const l = Math.hypot(ds, dd) || 1;
    const nx = -dd / l;
    const nz = ds / l;
    const quad = [[sa, y0, da], [sb, y0, db], [sb, y1, db], [sa, y0, da], [sb, y1, db], [sa, y1, da]];
    for (const [s, y, d] of quad) {
      pos.push(s, y, d);
      nor.push(nx, 0, nz);
      const t = uvFn ? uvFn(s, y) : null;
      uv.push(t ? t[0] : -1, t ? t[1] : -1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

// a flat quad facing +z in a local frame (x 0..w, y 0..h) with custom uvs
function quad(w, h, uvFn, segX = 1, segY = 1) {
  const g = new THREE.PlaneGeometry(w, h, segX, segY);
  g.translate(w / 2, h / 2, 0);
  const P = g.attributes.position;
  const U = g.attributes.uv;
  for (let i = 0; i < P.count; i++) {
    const t = uvFn ? uvFn(P.getX(i), P.getY(i)) : null;
    U.setXY(i, t ? t[0] : -1, t ? t[1] : -1);
  }
  return g;
}

const PAINT = { c: [1, 1, 1], r: 0.62, m: 0.15, e: 1 };
const PAINT_D = { c: [0.82, 0.82, 0.82], r: 0.68, m: 0.15, e: 1 };
const BAR = { c: [0.9, 0.9, 0.9], r: 0.45, m: 0.35, e: 1 };
const RUBBER = { c: '#151617', r: 0.85, m: 0, e: 0 };
const UNDER = { c: '#2b2622', r: 0.9, m: 0.1, e: 0 };
const HOLE = { c: '#0d0d0e', r: 0.9, m: 0, e: 0 };
const PLATE = { c: '#b9bec2', r: 0.35, m: 0.85, e: 0 };

export function containerGeometry(len = 'l40', { hc = true, lod = 0, quality = 'high' } = {}) {
  const L = CONTAINER[len];
  const H = hc ? CONTAINER.hHC : CONTAINER.h;
  const k = new Kit();
  const fine = quality === 'high' || quality === 'max';
  const sideUv = (sgn) => (x, y) => [0.75 * (sgn > 0 ? (x + L / 2) / L : (L / 2 - x) / L), y / H];
  const doorUv = (z, y) => [0.75 + 0.25 * (W / 2 - z) / W, y / H];
  const marked = len === 'l40';

  if (lod >= 2) {
    // minimal: body faces with procedural ribs and markings, door bars
    const sideLen0 = L - 0.06;
    k.add(quad(sideLen0, H - 0.04, marked ? (s, y) => sideUv(1)(-sideLen0 / 2 + s, y) : null), mat([-sideLen0 / 2, 0.02, W / 2]), { ...PAINT, d: !!marked, w: 1 });
    k.add(quad(sideLen0, H - 0.04, marked ? (s, y) => sideUv(-1)(sideLen0 / 2 - s, y) : null), mat([sideLen0 / 2, 0.02, -W / 2], [0, Math.PI, 0]), { ...PAINT, d: !!marked, w: 1 });
    k.add(quad(W, H - 0.04), mat([-L / 2, 0.02, -W / 2], [0, -Math.PI / 2, 0]), { ...PAINT, w: 2 });
    k.add(quad(W, H - 0.04, (x, y) => doorUv(W / 2 - x, y)), mat([L / 2, 0.02, W / 2], [0, Math.PI / 2, 0]), { ...PAINT, d: true, w: 3 });
    const roof = new THREE.PlaneGeometry(L, W);
    roof.rotateX(-Math.PI / 2);
    k.add(roof, mat([0, H, 0]), { ...PAINT, w: 4 });
    const geo = k.build();
    geo.attributes.aBox = geo.attributes.aKit;
    geo.deleteAttribute('aKit');
    geo.userData = { L, H, lod };
    return geo;
  }
  // ---- corner castings (8) with their holes
  const cx = L / 2 - 0.089;
  const cz = W / 2 - 0.081;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const top of [0, 1]) {
    const y = top ? H - 0.059 : 0.059;
    k.add(lod ? box(0.178, 0.118, 0.162) : rbox(0.178, 0.118, 0.162, 0.012), mat([sx * cx, y, sz * cz]), PAINT_D);
    if (!lod || top) {
      // side hole (oval) and end hole, top hole
      k.add(box(0.07, 0.05, 0.004), mat([sx * cx, y, sz * (W / 2 + 0.001)]), HOLE);
      k.add(box(0.004, 0.05, 0.06), mat([sx * (L / 2 + 0.001), y, sz * cz]), HOLE);
      if (top) k.add(box(0.11, 0.004, 0.06), mat([sx * cx, H + 0.001, sz * cz]), HOLE);
    }
  }
  // ---- corner posts
  const postH = H - 0.236;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    k.add(lod ? box(0.15, postH, 0.15) : rbox(0.15, postH, 0.15, 0.012), mat([sx * (L / 2 - 0.075), H / 2, sz * (W / 2 - 0.075)]), PAINT_D);
  }
  // ---- rails: bottom side rails, top side rails, end rails
  const rl = L - 0.356;
  for (const sz of [-1, 1]) {
    k.add(lod ? box(rl, 0.16, 0.06) : rbox(rl, 0.16, 0.06, 0.01), mat([0, 0.08, sz * (W / 2 - 0.03)]), PAINT_D);
    k.add(lod ? box(rl, 0.1, 0.08) : rbox(rl, 0.1, 0.08, 0.012), mat([0, H - 0.05, sz * (W / 2 - 0.04)]), PAINT);
  }
  const el = W - 0.324;
  for (const sx of [-1, 1]) {
    k.add(box(0.08, 0.16, el), mat([sx * (L / 2 - 0.04), 0.08, 0]), PAINT_D); // bottom end rails
  }
  k.add(box(0.12, 0.2, el), mat([-(L / 2 - 0.06), H - 0.1, 0]), PAINT); // front top rail
  k.add(box(0.16, 0.24, el), mat([L / 2 - 0.08, H - 0.12, 0]), PAINT); // door header

  const wallY0 = 0.16;
  const wallY1 = H - 0.1;
  const sideLen = L - 0.3;

  if (lod === 0) {
    // ---- long sides: real corrugation
    for (const sgn of [1, -1]) {
      const uvf = marked ? (s, y) => sideUv(sgn)(sgn > 0 ? -sideLen / 2 + s : sideLen / 2 - s, y) : null;
      const g = corrugated(sideLen, wallY0, wallY1, len === 'l40' ? 0.2831 : 0.288, 0.036, uvf);
      // local: s → x, outer face z = 0 → z = W/2 - 0.012
      const m = sgn > 0 ? mat([-sideLen / 2, 0, W / 2 - 0.012]) : mat([sideLen / 2, 0, -(W / 2 - 0.012)], [0, Math.PI, 0]);
      k.add(g, m, { ...PAINT, d: !!marked });
    }
    // ---- front end: corrugated across z
    {
      const g = corrugated(W - 0.3, wallY0, H - 0.2, 0.278, 0.036, null);
      k.add(g, mat([-(L / 2 - 0.012), 0, -(W / 2 - 0.15)], [0, -Math.PI / 2, 0]), PAINT);
    }
    // ---- roof with gentle dents: a grid, ribs from the material (ribMode 4)
    {
      const lv = { low: 0, medium: 1, high: 2, max: 3 }[quality] ?? 2;
      const g = new THREE.PlaneGeometry(L - 0.2, W - 0.16, [12, 24, 48, 64][lv], [2, 3, 6, 8][lv]);
      g.rotateX(-Math.PI / 2);
      const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i);
        const z = P.getZ(i);
        const ex = 1 - Math.pow(Math.abs(x) / ((L - 0.2) / 2), 8);
        const ez = 1 - Math.pow(Math.abs(z) / ((W - 0.16) / 2), 6);
        const dent = 0.03 * Math.exp(-((x - L * 0.18) ** 2) / 2.2 - (z + 0.3) ** 2 / 0.4) + 0.022 * Math.exp(-((x + L * 0.27) ** 2) / 1.2 - (z - 0.4) ** 2 / 0.3) + 0.012 * Math.sin(x * 1.7) * Math.sin(z * 2.3);
        P.setY(i, H - 0.012 - dent * ex * ez);
      }
      g.computeVertexNormals();
      k.add(g, null, { ...PAINT, w: 4 });
    }
    // ---- underside: floor and cross members
    k.add(box(L - 0.2, 0.02, W - 0.1), mat([0, 0.12, 0]), UNDER);
    if (fine) for (let x = -L / 2 + 0.6; x < L / 2 - 0.4; x += 0.6) k.add(box(0.07, 0.12, W - 0.12), mat([x, 0.07, 0]), UNDER);
    // ---- door end
    const dx = L / 2 - 0.035;
    const dw = W / 2 - 0.16; // each leaf, from the centre to the post
    for (const sz of [1, -1]) {
      // leaf panel (horizontal ribs from the material), markings
      const g = quad(dw, wallY1 - 0.22, (x, y) => doorUv(sz > 0 ? 0.005 + dw - x : -0.005 - x, y + 0.22), 1, 1);
      const m = sz > 0 ? mat([dx, 0.22, 0.005 + dw], [0, Math.PI / 2, 0]) : mat([dx, 0.22, -0.005], [0, Math.PI / 2, 0]);
      k.add(g, m, { ...PAINT, d: true, w: 3 });
      // leaf frame (perimeter)
      const zc = sz * (0.005 + dw / 2);
      k.add(box(0.05, 0.08, dw), mat([dx - 0.005, wallY1 - 0.04, zc]), PAINT);
      k.add(box(0.05, 0.08, dw), mat([dx - 0.005, 0.26, zc]), PAINT);
      k.add(box(0.05, wallY1 - 0.22, 0.06), mat([dx - 0.005, (wallY1 + 0.22) / 2, sz * (0.035)]), PAINT);
      k.add(box(0.05, wallY1 - 0.22, 0.06), mat([dx - 0.005, (wallY1 + 0.22) / 2, sz * (dw - 0.02)]), PAINT);
      // gasket between the leaves and at the posts
      k.add(box(0.02, wallY1 - 0.2, 0.012), mat([dx + 0.012, (wallY1 + 0.2) / 2, sz * 0.004]), RUBBER);
      // 2 locking bars per leaf with guides, cams, handles
      for (const [bz, dir, hy] of [[0.3, 1, 1.05], [0.82, -1, 1.3]]) {
        const z = sz * bz * dw;
        k.add(cyl(0.024, 0.024, H - 0.16, 10), mat([dx + 0.06, H / 2 - 0.02, z]), BAR);
        for (const y of [0.55, 1.35, 2.1]) k.add(box(0.05, 0.05, 0.1), mat([dx + 0.04, y * (H / 2.6), z]), BAR);
        // cams and keepers (top and bottom)
        k.add(box(0.07, 0.09, 0.1), mat([dx + 0.06, 0.2, z]), PAINT_D);
        k.add(box(0.07, 0.09, 0.1), mat([dx + 0.06, H - 0.21, z]), PAINT_D);
        // handle: a lever lying across the leaf, with its retainer near the end
        const hl = 0.36;
        const zEnd = z + sz * dir * hl;
        k.add(rbox(0.035, 0.035, hl, 0.012), mat([dx + 0.1, hy, (z + zEnd) / 2]), BAR);
        k.add(box(0.06, 0.06, 0.06), mat([dx + 0.08, hy, z]), BAR);
        k.add(box(0.05, 0.08, 0.05), mat([dx + 0.07, hy, zEnd - sz * dir * 0.04]), PAINT_D);
      }
      // hinges (4 per leaf) on the outer edge
      for (const y of [0.45, 1.05, 1.75, 2.35]) k.add(cyl(0.03, 0.03, 0.14, 8), mat([dx + 0.04, y * (H / 2.6), sz * (W / 2 - 0.15)]), PAINT_D);
    }
  } else {
    // ---- LOD1: body box faces with procedural ribs
    for (const sgn of [1, -1]) {
      const g = quad(sideLen, wallY1 - wallY0, marked ? (s, y) => sideUv(1)(-sideLen / 2 + s, y + wallY0) : null);
      if (sgn > 0) k.add(g, mat([-sideLen / 2, wallY0, W / 2 - 0.03]), { ...PAINT, d: !!marked, w: 1 });
      else {
        const g2 = quad(sideLen, wallY1 - wallY0, marked ? (s, y) => sideUv(-1)(sideLen / 2 - s, y + wallY0) : null);
        k.add(g2, mat([sideLen / 2, wallY0, -(W / 2 - 0.03)], [0, Math.PI, 0]), { ...PAINT, d: !!marked, w: 1 });
      }
    }
    k.add(quad(W - 0.3, H - 0.36), mat([-(L / 2 - 0.03), wallY0, -(W / 2 - 0.15)], [0, -Math.PI / 2, 0]), { ...PAINT, w: 2 });
    const roof = new THREE.PlaneGeometry(L - 0.2, W - 0.16);
    roof.rotateX(-Math.PI / 2);
    k.add(roof, mat([0, H - 0.015, 0]), { ...PAINT, w: 4 });
    // doors: one panel with the door art, 4 bars
    const g = quad(W - 0.3, wallY1 - 0.24, (x, y) => doorUv(W / 2 - 0.15 - x, y + 0.24));
    k.add(g, mat([L / 2 - 0.03, 0.24, W / 2 - 0.15], [0, Math.PI / 2, 0]), { ...PAINT, d: true, w: 3 });
    for (const bz of [-0.82, -0.3, 0.3, 0.82]) k.add(box(0.05, H - 0.2, 0.05), mat([L / 2 + 0.0, H / 2, bz * (W / 2 - 0.16)]), BAR);
  }
  const geo = k.build();
  geo.attributes.aBox = geo.attributes.aKit;
  geo.deleteAttribute('aKit');
  geo.userData = { L, H, lod };
  return geo;
}

// instanced attribute helper: colours (linear rgb) + variant/seed
export function instAttr(n) {
  return new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
}

// the muted industrial palette (sRGB) + which marking variant suits it (3 = dark stencils)
export const PALETTE = [
  ['#8c3b2c', 0], // rust red
  ['#2d3d57', 1], // navy
  ['#7e868c', 2], // grey
  ['#2f6a6c', 0], // teal
  ['#b38236', 3], // ochre
  ['#d8d4c8', 3], // off-white
  ['#4f5c52', 1], // green-grey
  ['#6a2f2c', 2], // maroon
  ['#5f7488', 0], // slate blue
  ['#a9aeb0', 3], // light grey
];
