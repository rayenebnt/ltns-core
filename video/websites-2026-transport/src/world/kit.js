// ORVAN: the model kit of the dioramas, all procedural and low-poly, in "clay": matte white and
// light grey, red for the company (trucks, bands, gantries, planes), mint-green trees, tan boxes.
// A builder merges the static parts per material (a few draw calls per diorama); the vehicles are
// small groups that share their geometries and materials.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const col = (h) => new THREE.Color(h);
const std = (hex, o = {}) => new THREE.MeshStandardMaterial({ color: col(hex), roughness: 0.86, metalness: 0, ...o });

export const M = {
  white: std('#f5f4f1'),
  wall: std('#efeeea'),
  ground: std('#e8e6e1', { roughness: 1 }),
  yard: std('#dcdad5', { roughness: 1 }),
  grey: std('#c8c6c1'),
  mid: std('#a7a6a3'),
  dark: std('#3b3e44', { roughness: 0.6 }),
  glass: std('#a9bccb', { roughness: 0.25, metalness: 0.1 }),
  glow: std('#fff1c9', { emissive: col('#ffe2a0'), emissiveIntensity: 0.25 }),
  red: std('#e3241b', { roughness: 0.55 }),
  redDark: std('#b3170f', { roughness: 0.6 }),
  tan: std('#d8b274', { roughness: 0.9 }),
  tan2: std('#c99d5c', { roughness: 0.9 }),
  wood: std('#cf9f63', { roughness: 0.9 }),
  green: std('#63d39c', { roughness: 0.82, flatShading: true }),
  green2: std('#46bb83', { roughness: 0.82, flatShading: true }),
  trunk: std('#efe9df'),
  grass: std('#cfe9c4', { roughness: 1 }),
  line: std('#ffffff', { roughness: 0.9 }),
  yellow: std('#f2c84b', { roughness: 0.8 }),
  rail: std('#7c7f86', { roughness: 0.5, metalness: 0.3 }),
  gravel: std('#d2d0cb', { roughness: 1 }),
};

export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const rbox = (w, h, d, r = 0.08) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
export const cyl = (rt, rb, h, n = 12) => new THREE.CylinderGeometry(rt, rb, h, n);

// collects static parts per material; build() merges them into one mesh per material
export function builder() {
  const parts = new Map();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const api = {
    add(geo, mat, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
      const g = geo.clone();
      g.applyMatrix4(m4.compose(p.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz, 'YXZ')), s.set(sx, sy, sz)));
      const n = new THREE.BufferGeometry();
      const gi = g.index ? g.toNonIndexed() : g;
      n.setAttribute('position', gi.attributes.position);
      n.setAttribute('normal', gi.attributes.normal);
      if (!parts.has(mat)) parts.set(mat, []);
      parts.get(mat).push(n);
      return api;
    },
    // a box resting on y (its base at y)
    block(w, h, d, mat, x, y, z, ry = 0) {
      return api.add(box(w, h, d), mat, x, y + h / 2, z, ry);
    },
    build(group, { cast = true, receive = true } = {}) {
      for (const [mat, list] of parts) {
        const mesh = new THREE.Mesh(mergeGeometries(list), mat);
        mesh.castShadow = cast;
        mesh.receiveShadow = receive;
        group.add(mesh);
      }
      parts.clear();
      return group;
    },
  };
  return api;
}

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
// the logo: white on red, in a wide band
export function logoTex(text = 'ORVAN', w = 1024, h = 200) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = '#e3241b';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff';
    g.font = `800 ${Math.round(h * 0.62)}px 'Archivo', sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if ('letterSpacing' in g) g.letterSpacing = `${Math.round(h * 0.04)}px`;
    g.fillText(text, w / 2, h * 0.54);
    // the mark: a small chevron
    g.beginPath();
    g.moveTo(w / 2 - g.measureText(text).width / 2 - h * 0.5, h * 0.3);
    g.lineTo(w / 2 - g.measureText(text).width / 2 - h * 0.25, h * 0.5);
    g.lineTo(w / 2 - g.measureText(text).width / 2 - h * 0.5, h * 0.7);
    g.lineWidth = h * 0.08;
    g.strokeStyle = '#ffffff';
    g.stroke();
  });
}
export function signTex(text, w = 512, h = 128) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#e3241b';
    g.font = `700 ${Math.round(h * 0.5)}px 'Archivo', sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if ('letterSpacing' in g) g.letterSpacing = `${Math.round(h * 0.06)}px`;
    g.fillText(text, w / 2, h * 0.54);
  });
}
export const texMat = (tex) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });

// ------------------------------------------------------------------ trees and people
export function trees(list, R = rng(3)) {
  const g = new THREE.Group();
  const n = list.length;
  const can = new THREE.IcosahedronGeometry(1, 0);
  const tr = cyl(0.12, 0.16, 1, 6);
  tr.translate(0, 0.5, 0);
  const A = new THREE.InstancedMesh(can, M.green, n), B = new THREE.InstancedMesh(can, M.green2, n), T = new THREE.InstancedMesh(tr, M.trunk, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  list.forEach(([x, y, z, k = 1], i) => {
    const h = (2.6 + R() * 1.6) * k, r = (1.4 + R() * 0.6) * k;
    T.setMatrixAt(i, m4.compose(p.set(x, y, z), q.identity(), s.set(k, h * 0.45, k)));
    q.setFromEuler(e.set(R() * 0.4, R() * 6, R() * 0.4));
    const useA = R() < 0.6;
    (useA ? A : B).setMatrixAt(i, m4.compose(p.set(x, y + h * 0.45 + r * 0.95, z), q, s.set(r, r * 1.35, r)));
    (useA ? B : A).setMatrixAt(i, zero);
  });
  for (const m of [A, B, T]) {
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}
export function people(list) {
  const geo = new THREE.CapsuleGeometry(0.28, 1.1, 3, 8);
  geo.translate(0, 0.83, 0);
  const m = new THREE.InstancedMesh(geo, M.dark, list.length);
  const m4 = new THREE.Matrix4();
  list.forEach(([x, y, z], i) => m.setMatrixAt(i, m4.makeTranslation(x, y, z)));
  m.castShadow = true;
  return m;
}

// ------------------------------------------------------------------ the truck (16.5 m), along +x
let truckProto = null;
export function truck(logo) {
  if (!truckProto) {
    const b = builder();
    // the tractor at the front (+x)
    b.add(rbox(2.4, 2.9, 2.5, 0.25), M.red, 7.0, 2.25, 0);
    b.add(box(0.08, 1.0, 2.1), M.glass, 8.22, 2.75, 0);
    b.add(box(1.2, 0.5, 2.3), M.dark, 7.0, 0.85, 0);
    b.add(box(13.4, 0.35, 1.0), M.dark, -0.6, 1.0, 0);
    // the trailer
    b.add(rbox(13.4, 3.0, 2.55, 0.12), M.red, -0.9, 2.65, 0);
    // wheels
    const w = cyl(0.52, 0.52, 0.4, 12);
    w.rotateX(Math.PI / 2);
    for (const x of [7.4, 5.4, -4.8, -6.0, -7.2]) for (const z of [-1.08, 1.08]) b.add(w, M.dark, x, 0.52, z);
    truckProto = b.build(new THREE.Group());
  }
  const g = new THREE.Group();
  for (const c of truckProto.children) {
    const m = new THREE.Mesh(c.geometry, c.material);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  if (logo) {
    const lm = texMat(logo);
    for (const sz of [-1, 1]) {
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.9), lm);
      pl.position.set(-0.9, 2.75, sz * 1.285);
      pl.rotation.y = sz > 0 ? 0 : Math.PI;
      g.add(pl);
    }
  }
  return g;
}

// ------------------------------------------------------------------ the forklift (red), along +x
export function forklift() {
  const b = builder();
  b.add(rbox(2.2, 1.2, 1.3, 0.15), M.red, 0, 0.9, 0);
  b.add(box(0.1, 1.4, 1.1), M.dark, 0.6, 2.1, 0);
  b.add(box(0.9, 0.08, 1.2), M.dark, -0.2, 2.8, 0);
  for (const z of [-0.45, 0.45]) b.add(box(0.12, 3.2, 0.12), M.dark, 1.15, 1.6, z);
  for (const z of [-0.3, 0.3]) b.add(box(1.3, 0.08, 0.16), M.grey, 1.85, 0.25, z);
  const w = cyl(0.3, 0.3, 0.25, 10);
  w.rotateX(Math.PI / 2);
  for (const x of [-0.65, 0.65]) for (const z of [-0.6, 0.6]) b.add(w, M.dark, x, 0.3, z);
  return b.build(new THREE.Group());
}

// ------------------------------------------------------------------ the plane (red), nose along +x
export function plane() {
  const g = new THREE.Group();
  const prof = [[0, -14], [0.9, -13.4], [1.9, -11.5], [2.1, -8], [2.1, 8], [1.8, 11.2], [1.0, 13.4], [0.25, 14.2], [0, 14.3]];
  const fus = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 20);
  fus.rotateZ(-Math.PI / 2);
  const b = builder();
  b.add(fus, M.red, 0, 3.0, 0);
  const wing = new THREE.Shape();
  wing.moveTo(0, 0);
  wing.lineTo(-5.5, 14);
  wing.lineTo(-8, 14);
  wing.lineTo(-6, 0);
  const wg = new THREE.ExtrudeGeometry(wing, { depth: 0.35, bevelEnabled: false });
  wg.rotateX(Math.PI / 2);
  b.add(wg, M.white, 3.0, 2.6, 1.8);
  const wg2 = wg.clone();
  wg2.scale(1, 1, -1);
  b.add(wg2, M.white, 3.0, 2.25, -1.8);
  const fin = new THREE.Shape();
  fin.moveTo(0, 0);
  fin.lineTo(-4.2, 6.2);
  fin.lineTo(-6, 6.2);
  fin.lineTo(-5, 0);
  const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.3, bevelEnabled: false });
  b.add(fg, M.red, -8.5, 4.5, -0.15);
  const st = new THREE.Shape();
  st.moveTo(0, 0);
  st.lineTo(-2.4, 5);
  st.lineTo(-3.8, 5);
  st.lineTo(-3.2, 0);
  const sg = new THREE.ExtrudeGeometry(st, { depth: 0.2, bevelEnabled: false });
  sg.rotateX(Math.PI / 2);
  b.add(sg, M.white, -9.6, 4.7, 0.6);
  const sg2 = sg.clone();
  sg2.scale(1, 1, -1);
  b.add(sg2, M.white, -9.6, 4.5, -0.6);
  const eng = cyl(0.75, 0.75, 3.2, 14);
  eng.rotateZ(Math.PI / 2);
  for (const z of [-5.2, 5.2]) b.add(eng, M.white, 1.8, 2.0, z);
  const gear = cyl(0.35, 0.35, 0.3, 10);
  gear.rotateX(Math.PI / 2);
  for (const [x, z] of [[9.5, 0], [-0.8, -1.4], [-0.8, 1.4]]) b.add(gear, M.dark, x, 0.35, z);
  b.add(box(0.15, 0.9, 0.15), M.grey, 9.5, 0.9, 0);
  return b.build(g);
}

// ------------------------------------------------------------------ containers
export function containerStacks(cells, R = rng(9)) {
  // cells: [x, z, ry, levels]
  const n = cells.reduce((s, c) => s + c[3], 0);
  const geo = rbox(6.0, 2.55, 2.42, 0.06);
  const mats = [M.white, M.grey, M.red, M.white, M.wall];
  const groups = mats.map((m) => new THREE.InstancedMesh(geo, m, n));
  const counts = mats.map(() => 0);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1), e = new THREE.Euler();
  for (const [x, z, ry, lv] of cells)
    for (let k = 0; k < lv; k++) {
      const i = R() < 0.12 ? 2 : R() < 0.4 ? 1 : R() < 0.7 ? 0 : 4;
      groups[i].setMatrixAt(counts[i]++, m4.compose(p.set(x, 1.3 + k * 2.6, z), q.setFromEuler(e.set(0, ry, 0)), s));
    }
  const g = new THREE.Group();
  groups.forEach((m, i) => {
    m.count = counts[i];
    m.castShadow = m.receiveShadow = true;
    if (counts[i]) g.add(m);
  });
  return g;
}
