// PINÈDE: the house, piece by piece: a merging builder, boxes whose textures keep their scale, the
// curved boucle sofa, the glass coffee table, the black lounge chair, the marble island, the bar
// chairs, the kitchen runs, the tall black ovens' wall, lamps, decor, the umbrella pines and palms
// of the garden, the villa across the lawn.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from './textures.js';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
export const sstep = (a, b, x) => smooth((x - a) / (b - a));
export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const rbox = (w, h, d, r = 0.02, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.max(0.001, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)));
export const cyl = (rt, rb, h, n = 24) => new THREE.CylinderGeometry(rt, rb, h, n);
// (a lathe's vertices on its axis can get a null normal: they take the axis direction instead)
export const lathe = (pts, n = 32) => {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
  const nr = g.attributes.normal, ps = g.attributes.position;
  for (let i = 0; i < nr.count; i++) {
    const l = Math.hypot(nr.getX(i), nr.getY(i), nr.getZ(i));
    if (!(l > 0.5)) nr.setXYZ(i, 0, ps.getY(i) > 0.01 ? 1 : -1, 0);
  }
  return g;
};

// a box whose UVs follow its size: the texture keeps its scale (tile metres per repeat) on every face
export function boxUV(w, h, d, tile = 1) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const size = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    uv.setXY(i, (uv.getX(i) * size[f][0]) / tile, (uv.getY(i) * size[f][1]) / tile);
  }
  return g;
}

// collects static parts per material; build() merges them into one mesh per material
export function builder() {
  const parts = new Map();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const api = {
    add(geo, mat, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
      const g = geo.clone();
      g.applyMatrix4(m4.compose(p.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz, 'YXZ')), s.set(sx, sy, sz)));
      const gi = g.index ? g.toNonIndexed() : g;
      const n = new THREE.BufferGeometry();
      n.setAttribute('position', gi.attributes.position);
      n.setAttribute('normal', gi.attributes.normal);
      n.setAttribute('uv', gi.attributes.uv || new THREE.BufferAttribute(new Float32Array(gi.attributes.position.count * 2), 2));
      if (!parts.has(mat)) parts.set(mat, []);
      parts.get(mat).push(n);
      return api;
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

// an annular sector (inner r0, outer r1, angles a0..a1 around +y), extruded up by h with soft edges
function sector(r0, r1, a0, a1, h, bevel = 0.06) {
  const s = new THREE.Shape();
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const x = Math.cos(a) * r1, y = Math.sin(a) * r1;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  for (let i = n; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / n;
    s.lineTo(Math.cos(a) * r0, Math.sin(a) * r0);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 24 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0);
  return g;
}

// ------------------------------------------------------------------ the living room
// the curved sofa: its concave side looks towards -x; centre of the arc at (cx, cz)
export function sofa(M, cx, cz, R = 3.25, span = 1.75) {
  const g = new THREE.Group();
  const b = builder();
  const a0 = -span / 2, a1 = span / 2;
  b.add(sector(R - 1.05, R - 0.05, a0, a1, 0.1, 0.02), M.black, 0, 0.0, 0);
  b.add(sector(R - 1.1, R - 0.02, a0, a1, 0.2, 0.05), M.boucle, 0, 0.08, 0);
  for (let k = 0; k < 3; k++) {
    const c0 = a0 + ((a1 - a0) * k) / 3 + 0.007, c1 = a0 + ((a1 - a0) * (k + 1)) / 3 - 0.007;
    b.add(sector(R - 1.09, R - 0.26, c0, c1, 0.2, 0.075), M.boucle, 0, 0.255, 0);
  }
  b.add(sector(R - 0.32, R + 0.02, a0 - 0.02, a1 + 0.02, 0.66, 0.14), M.boucle, 0, 0.08, 0);
  b.build(g);
  // cushions: navy and ivory, leaning on the back
  const R0 = rng(5);
  const cush = rbox(0.5, 0.42, 0.15, 0.07, 4);
  const cm = [M.navy, M.navy, M.ivory, M.navy, M.ivory];
  for (let i = 0; i < 5; i++) {
    const a = a0 + 0.22 + ((a1 - a0 - 0.44) * i) / 4;
    const r = R - 0.42;
    const m = new THREE.Mesh(cush, cm[i]);
    m.position.set(Math.cos(a) * r, 0.63, Math.sin(a) * r);
    m.rotation.set(0, -a + Math.PI / 2, 0);
    m.rotateX(-0.28);
    m.rotateZ((R0() - 0.5) * 0.15);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  // the sofa's arc opens to -x
  g.rotation.y = Math.PI;
  g.position.set(cx, 0, cz);
  return g;
}
export function coffeeTable(M) {
  const g = new THREE.Group();
  const b = builder();
  const W = 1.3, D = 0.85, H = 0.42, t = 0.025;
  for (const y of [0.04, H]) {
    for (const z of [-D / 2, D / 2]) b.add(box(W, t, t), M.metal, 0, y, z);
    for (const x of [-W / 2, W / 2]) b.add(box(t, t, D), M.metal, x, y, 0);
  }
  for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) b.add(box(t, H, t), M.metal, x, H / 2 + 0.02, z);
  // books, a black vase, a small sculpture
  b.add(rbox(0.32, 0.05, 0.24, 0.01), M.ivory, -0.28, H + 0.04, 0.1, 0.2);
  b.add(rbox(0.28, 0.04, 0.2, 0.01), M.navy, -0.28, H + 0.085, 0.1, 0.35);
  b.add(lathe([[0, 0], [0.07, 0], [0.11, 0.08], [0.09, 0.2], [0.04, 0.28], [0.05, 0.36], [0, 0.36]], 28), M.black, 0.3, H + 0.015, -0.12);
  b.add(rbox(0.36, 0.06, 0.26, 0.01), M.ivory, 0.0, 0.08, 0.0, -0.1);
  b.build(g);
  const glass = new THREE.Mesh(box(W - 0.02, 0.012, D - 0.02), M.glass);
  glass.position.y = H + 0.01;
  const glass2 = glass.clone();
  glass2.position.y = 0.055;
  g.add(glass, glass2);
  return g;
}
export function loungeChair(M) {
  const g = new THREE.Group();
  const shell = lathe([[0.0, 0.0], [0.34, 0.0], [0.42, 0.08], [0.46, 0.3], [0.46, 0.62], [0.42, 0.68], [0.36, 0.62], [0.36, 0.34], [0.0, 0.34]], 40);
  const m = new THREE.Mesh(shell, M.blackSoft);
  m.scale.set(1.15, 1, 1.0);
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.12, 32), M.blackSoft);
  seat.position.y = 0.38;
  seat.scale.set(1.12, 1, 1);
  seat.castShadow = true;
  g.add(seat);
  return g;
}

// ------------------------------------------------------------------ the kitchen
export function island(M, len = 4.4, depth = 1.15, h = 0.92) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(boxUV(len, 0.05, depth, 2.4), M.marble);
  top.position.y = h - 0.025;
  const ends = [-1, 1].map((sx) => {
    const e = new THREE.Mesh(boxUV(0.05, h - 0.05, depth, 2.4), M.marble);
    e.position.set(sx * (len / 2 - 0.025), (h - 0.05) / 2, 0);
    return e;
  });
  const front = new THREE.Mesh(boxUV(len - 0.1, h - 0.05, 0.05, 2.4), M.marble);
  front.position.set(0, (h - 0.05) / 2, depth / 2 - 0.025);
  const back = new THREE.Mesh(boxUV(len - 0.1, h - 0.05, depth - 0.1, 1.6), M.blackSoft);
  back.position.set(0, (h - 0.05) / 2, -0.03);
  for (const m of [top, ...ends, front, back]) {
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  const plug = new THREE.Mesh(box(0.12, 0.08, 0.01), M.metal);
  plug.position.set(0.0, 0.52, depth / 2 + 0.002);
  g.add(plug);
  return g;
}
// a white upholstered counter chair on thin brass legs with a footrest ring, facing +z
export function barChair(M) {
  const g = new THREE.Group();
  const b = builder();
  b.add(rbox(0.46, 0.085, 0.44, 0.04, 4), M.chair, 0, 0.665, 0.01);
  b.add(sector(0.185, 0.228, Math.PI / 2 - 1.05, Math.PI / 2 + 1.05, 0.32, 0.018), M.chair, 0, 0.7, 0.03);
  for (const x of [-1, 1])
    for (const z of [-1, 1]) b.add(cyl(0.009, 0.009, 0.64, 8), M.chairLeg, x * 0.175, 0.315, z * 0.165, 0, z * 0.05, -x * 0.05);
  const ring = new THREE.TorusGeometry(0.19, 0.008, 8, 48);
  ring.rotateX(Math.PI / 2);
  b.add(ring, M.chairLeg, 0, 0.26, 0);
  b.add(box(0.36, 0.012, 0.34), M.chairLeg, 0, 0.615, 0.01);
  return b.build(g);
}
// an oak run along a wall at z = zWall (the cabinets towards +z): base cabinets with their joints and
// black bar handles, a white stone top, the sink, the backsplash; above, open oak shelves with LED
// strips, or oak upper cabinets (uppers). The gaps [x0, x1] keep the windows clear.
export function kitchenRun(M, x0, x1, zWall, { sinkX = null, gaps = [], shelves = [1.66, 2.12], uppers = false, seed = 17 } = {}) {
  const g = new THREE.Group();
  const b = builder();
  const L = x1 - x0, cx = (x0 + x1) / 2, d = 0.65, zf = zWall + d;
  b.add(boxUV(L, 0.82, d, 1.2), M.oakFront, cx, 0.51, zWall + d / 2);
  b.add(box(L - 0.02, 0.1, d - 0.08), M.blackSoft, cx, 0.05, zWall + d / 2 - 0.04);
  const n = Math.max(1, Math.round(L / 0.6)), dw = L / n;
  for (let i = 1; i < n; i++) b.add(box(0.005, 0.8, 0.005), M.blackSoft, x0 + i * dw, 0.51, zf + 0.002);
  b.add(box(L, 0.005, 0.005), M.blackSoft, cx, 0.7, zf + 0.002);
  for (let i = 0; i < n; i++) b.add(box(Math.min(0.32, dw * 0.55), 0.014, 0.016), M.blackSoft, x0 + (i + 0.5) * dw, 0.84, zf + 0.012);
  b.add(boxUV(L + 0.02, 0.04, d + 0.03, 1), M.stone, cx, 0.94, zWall + (d + 0.03) / 2);
  if (sinkX !== null) {
    b.add(box(0.74, 0.012, 0.44), M.blackSoft, sinkX, 0.957, zWall + 0.36);
    b.add(cyl(0.017, 0.02, 0.38, 14), M.blackSoft, sinkX, 1.15, zWall + 0.1);
    b.add(cyl(0.012, 0.012, 0.25, 12), M.blackSoft, sinkX, 1.33, zWall + 0.22, 0, Math.PI / 2);
    b.add(cyl(0.012, 0.012, 0.07, 12), M.blackSoft, sinkX, 1.3, zWall + 0.34);
  }
  // the spans of wall between the windows
  const spans = [];
  let a = x0;
  for (const [ga, gb] of [...gaps].sort((u, v) => u[0] - v[0])) {
    if (ga > a + 0.2) spans.push([a, ga]);
    a = Math.max(a, gb);
  }
  if (x1 > a + 0.2) spans.push([a, x1]);
  const R = rng(seed);
  const glows = [];
  for (const [sa, sb] of spans) {
    const sl = sb - sa, sc = (sa + sb) / 2;
    b.add(boxUV(sl, 0.62, 0.02, 1), M.stone, sc, 1.27, zWall + 0.01);
    if (uppers) {
      b.add(boxUV(sl, 0.92, 0.36, 1.2), M.oakFront, sc, 2.2, zWall + 0.18);
      const m = Math.max(1, Math.round(sl / 0.6)), uw = sl / m;
      for (let i = 1; i < m; i++) b.add(box(0.005, 0.9, 0.005), M.blackSoft, sa + i * uw, 2.2, zWall + 0.362);
      b.add(box(sl - 0.04, 0.012, 0.02), M.led, sc, 1.735, zWall + 0.3);
      glows.push([sc, 1.6, sl]);
      continue;
    }
    for (const y of shelves) {
      b.add(boxUV(sl, 0.045, 0.3, 1.2), M.oakFront, sc, y, zWall + 0.15);
      b.add(box(sl - 0.06, 0.008, 0.016), M.led, sc, y - 0.027, zWall + 0.26);
      glows.push([sc, y - 0.2, sl]);
      // bowls, vases and a few books
      for (let x = sa + 0.22; x < sb - 0.2; x += 0.34 + R() * 0.32) {
        const k = R(), yy = y + 0.0225;
        if (k < 0.36) b.add(lathe([[0, 0], [0.07, 0], [0.11, 0.05], [0.115, 0.085], [0, 0.085]], 22), M.ceramic, x, yy, zWall + 0.15);
        else if (k < 0.7) b.add(lathe([[0, 0], [0.045, 0], [0.065, 0.09], [0.04, 0.19], [0.03, 0.25], [0, 0.25]], 22), R() < 0.55 ? M.ceramic : M.blackSoft, x, yy, zWall + 0.15);
        else for (let i = 0; i < 3; i++) b.add(box(0.032, 0.2 + R() * 0.05, 0.17), [M.ivory, M.navy, M.oakFront][i], x + i * 0.036, yy + 0.11, zWall + 0.14);
      }
    }
  }
  b.build(g);
  // the warm wash of the LED strips on the backsplash (additive, kept out of the AO pass)
  const glowTex = glowTexture();
  for (const [x, y, w] of glows) {
    const q = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.42), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffc98a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true }));
    q.position.set(x, y, zWall + 0.024);
    q.userData.noAO = true;
    g.add(q);
  }
  return g;
}
let glowCache = null;
function glowTexture() {
  if (glowCache) return glowCache;
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 128;
  const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, 8, 128);
  glowCache = new THREE.CanvasTexture(c);
  glowCache.colorSpace = THREE.SRGBColorSpace;
  return glowCache;
}
// the tall black wall: four full-height units, two ovens
export function ovenWall(M, xWall, z0, z1) {
  const g = new THREE.Group();
  const b = builder();
  const L = z1 - z0, d = 0.65, H = 2.7;
  b.add(box(d, H, L), M.blackCab, xWall + d / 2, H / 2, (z0 + z1) / 2);
  for (let z = z0 + 0.6; z < z1 - 0.1; z += 0.6) b.add(box(0.004, H - 0.04, 0.004), M.blackSoft, xWall + d + 0.002, H / 2, z);
  for (const [zc, y] of [[z0 + 1.2 + 0.3, 1.25], [z0 + 1.2 + 0.3, 0.6]]) {
    b.add(box(0.03, 0.58, 0.56), M.ovenGlass, xWall + d + 0.012, y, zc);
    b.add(box(0.02, 0.05, 0.56), M.steel, xWall + d + 0.03, y + 0.31, zc);
  }
  for (let z = z0 + 0.3; z < z1; z += 0.6) b.add(box(0.015, 0.5, 0.012), M.steel, xWall + d + 0.02, 1.9, z);
  return b.build(g);
}
// a cluster of thin black tube pendants (their warm ends glow), hung from the ceiling at y 3.2; each
// [x, z, length of the tube], its lower end at y0
export function pendants(M, list, y0 = 1.78) {
  const g = new THREE.Group();
  const b = builder();
  for (const [x, z, len] of list) {
    const cord = 3.2 - y0 - len;
    b.add(cyl(0.003, 0.003, cord, 5), M.blackSoft, x, y0 + len + cord / 2, z);
    b.add(cyl(0.026, 0.026, len, 20), M.metal, x, y0 + len / 2, z);
    b.add(cyl(0.02, 0.02, 0.004, 20), M.bulb, x, y0 - 0.002, z);
  }
  const cx = list.reduce((s, l) => s + l[0], 0) / list.length, cz = list.reduce((s, l) => s + l[1], 0) / list.length;
  b.add(box(1.1, 0.02, 0.2), M.blackSoft, cx, 3.19, cz);
  return b.build(g, { cast: false });
}

// ------------------------------------------------------------------ the garden
export function palm(M, h = 7, lean = 0.3, seed = 1) {
  const R = rng(seed);
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pts.push(V3(Math.sin(t * 1.2) * lean * h * 0.25, t * h, 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.17, 10, false), M.trunk);
  trunk.castShadow = true;
  g.add(trunk);
  const top = curve.getPoint(1);
  const frond = new THREE.SphereGeometry(1, 12, 6);
  frond.scale(1.6, 0.06, 0.32);
  frond.translate(1.5, 0, 0);
  for (let i = 0; i < 11; i++) {
    const m = new THREE.Mesh(frond, i % 2 ? M.palm : M.palm2);
    m.position.copy(top);
    m.rotation.set(0, (i / 11) * Math.PI * 2 + R() * 0.3, -0.35 - R() * 0.35, 'YXZ');
    m.castShadow = true;
    g.add(m);
  }
  return g;
}
// soft rounded trees and hedges (instanced)
export function blobs(list, mat, detail = 1, colors = null) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const m = new THREE.InstancedMesh(geo, mat, list.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
  list.forEach(([x, y, z, sx, sy, sz], i) => {
    m.setMatrixAt(i, m4.compose(p.set(x, y, z), q.setFromEuler(e.set(0, i * 2.4, 0)), s.set(sx, sy ?? sx, sz ?? sx)));
    if (colors) m.setColorAt(i, colors[i % colors.length]);
  });
  m.castShadow = m.receiveShadow = true;
  return m;
}
// the white villa across the lawn, its front towards +z: a long flat-roofed volume, a set-back one,
// tall dark glass between black frames, a dark door, a low white wall
export function villa(M) {
  const g = new THREE.Group();
  const b = builder();
  b.add(box(20, 3.4, 10), M.render, 0, 1.7, 0);
  b.add(box(21, 0.32, 11.4), M.render, 0, 3.56, 0.5);
  b.add(box(7.5, 3.0, 8), M.render, -13.6, 1.5, -2);
  b.add(box(8.1, 0.3, 8.8), M.render, -13.6, 3.15, -1.8);
  const F = 5.0;
  const win = (x, w, h, y) => {
    b.add(box(w, h, 0.05), M.darkGlass, x, y, F + 0.01);
    b.add(box(w + 0.1, 0.07, 0.12), M.blackSoft, x, y + h / 2 + 0.035, F + 0.04);
    b.add(box(w + 0.1, 0.07, 0.12), M.blackSoft, x, y - h / 2 - 0.035, F + 0.04);
    for (const sx of [-1, 1]) b.add(box(0.07, h + 0.14, 0.12), M.blackSoft, x + (sx * (w + 0.03)) / 2, y, F + 0.04);
    b.add(box(0.045, h, 0.08), M.blackSoft, x, y, F + 0.04);
  };
  win(-6.6, 3.2, 2.5, 1.45);
  win(-2.6, 3.2, 2.5, 1.45);
  win(4.4, 2.0, 1.4, 2.0);
  win(7.6, 2.0, 1.4, 2.0);
  b.add(box(1.2, 2.4, 0.06), M.blackSoft, 1.0, 1.2, F + 0.02);
  win(-13.6, 2.4, 1.3, 1.8);
  b.add(box(26, 0.7, 0.3), M.render, -2, 0.35, F + 3.6);
  b.add(box(20.2, 0.05, 10.2), M.blackSoft, 0, 3.415, 0);
  b.add(box(7.7, 0.05, 8.2), M.blackSoft, -13.6, 3.015, -2);
  return b.build(g);
}
// a sun lounger: a pale frame, a white cushion, the back raised
export function lounger(M) {
  const g = new THREE.Group();
  const b = builder();
  b.add(rbox(0.72, 0.07, 1.95, 0.025), M.coping, 0, 0.28, 0);
  b.add(rbox(0.66, 0.07, 1.25, 0.03), M.ivory, 0, 0.35, 0.3);
  b.add(rbox(0.66, 0.07, 0.72, 0.03), M.ivory, 0, 0.55, -0.6, 0, -0.62);
  for (const x of [-0.3, 0.3]) for (const z of [-0.85, 0.85]) b.add(box(0.05, 0.25, 0.05), M.coping, x, 0.125, z);
  return b.build(g);
}
// the arc floor lamp: a heavy black disc, a thin arc, a black dome
export function floorLamp(M, reach = 1.6, h = 2.05) {
  const g = new THREE.Group();
  const b = builder();
  b.add(cyl(0.2, 0.22, 0.05, 32), M.blackSoft, 0, 0.025, 0);
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, a = (t * Math.PI) / 2;
    pts.push(V3(-reach * (1 - Math.cos(a)) * 0.98, 0.05 + (h - 0.05) * Math.sin(a) * (1 - 0.08 * t), 0));
  }
  const arc = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.011, 8, false);
  b.add(arc, M.blackSoft);
  const end = pts[pts.length - 1];
  b.add(new THREE.SphereGeometry(0.2, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.blackSoft, end.x - 0.02, end.y - 0.16, 0);
  b.add(cyl(0.18, 0.18, 0.005, 24), M.bulb, end.x - 0.02, end.y - 0.162, 0);
  return b.build(g, { cast: true, receive: false });
}
// the low black unit along the right wall, a vase and a sculpture on it
export function lowUnit(M, len = 4.2) {
  const g = new THREE.Group();
  const b = builder();
  b.add(box(0.45, 0.44, len), M.blackCab, 0, 0.26, 0);
  b.add(box(0.4, 0.04, len - 0.04), M.blackSoft, 0, 0.02, 0);
  for (let z = -len / 2 + len / 4; z < len / 2; z += len / 4) b.add(box(0.004, 0.4, 0.004), M.blackSoft, -0.227, 0.26, z);
  b.add(lathe([[0, 0], [0.09, 0], [0.13, 0.12], [0.08, 0.32], [0.05, 0.42], [0.06, 0.48], [0, 0.48]], 28), M.ceramic, 0, 0.48, -len / 2 + 0.6);
  b.add(lathe([[0, 0], [0.12, 0], [0.12, 0.04], [0.05, 0.06], [0.07, 0.3], [0.02, 0.36], [0, 0.36]], 24), M.blackSoft, 0, 0.48, len / 2 - 0.7);
  return b.build(g);
}
// a tall black vase with dry branches
export function branches(M, seed = 3) {
  const R = rng(seed);
  const g = new THREE.Group();
  const b = builder();
  b.add(lathe([[0, 0], [0.07, 0], [0.1, 0.06], [0.11, 0.16], [0.06, 0.3], [0.035, 0.36], [0.045, 0.4], [0, 0.4]], 28), M.blackSoft, 0, 0, 0);
  const twig = (x, y, z, len, ry, rz, r) => b.add(cyl(r * 0.6, r, len, 5), M.trunk, x, y, z, ry, 0, rz);
  for (let i = 0; i < 7; i++) {
    const ry = R() * Math.PI * 2, rz = 0.15 + R() * 0.45, len = 0.45 + R() * 0.35;
    const dx = -Math.sin(rz) * Math.cos(ry), dz = Math.sin(rz) * Math.sin(ry);
    twig((dx * len) / 2, 0.38 + (Math.cos(rz) * len) / 2, (dz * len) / 2, len, ry, rz, 0.006);
    for (let k = 0; k < 3; k++) {
      const t = 0.4 + R() * 0.5, l2 = 0.12 + R() * 0.16, ry2 = ry + (R() - 0.5) * 1.6, rz2 = rz + 0.3 + R() * 0.4;
      const ox = dx * len * t, oy = 0.38 + Math.cos(rz) * len * t, oz = dz * len * t;
      twig(ox - (Math.sin(rz2) * Math.cos(ry2) * l2) / 2, oy + (Math.cos(rz2) * l2) / 2, oz + (Math.sin(rz2) * Math.sin(ry2) * l2) / 2, l2, ry2, rz2, 0.0035);
    }
  }
  return b.build(g, { cast: true, receive: false });
}

// an umbrella pine (« pin parasol », the house's namesake): a tall leaning trunk that forks, a wide
// flat crown made of a few flattened clumps
export function umbrellaPine(M, h = 11, seed = 1) {
  const R = rng(seed);
  const g = new THREE.Group();
  const lean = (R() - 0.5) * 0.5, dir = R() * Math.PI * 2;
  const top = V3(Math.cos(dir) * lean * h * 0.3, h * 0.82, Math.sin(dir) * lean * h * 0.3);
  const curve = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(top.x * 0.3, h * 0.35, top.z * 0.3), V3(top.x * 0.8, h * 0.65, top.z * 0.8), top]);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.22, 8, false), M.bark);
  trunk.castShadow = true;
  g.add(trunk);
  const b = builder();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + R();
    const end = V3(top.x + Math.cos(a) * 1.8, top.y + 0.6 + R() * 0.4, top.z + Math.sin(a) * 1.8);
    const br = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([top.clone(), top.clone().lerp(end, 0.5).add(V3(0, 0.4, 0)), end]), 8, 0.1, 6, false);
    b.add(br, M.bark);
  }
  b.build(g, { cast: true, receive: false });
  const crown = new THREE.SphereGeometry(1, 20, 10);
  const parts = [];
  for (let i = 0; i < 9; i++) {
    const a = R() * Math.PI * 2, r = R() * 3.2;
    parts.push([top.x + Math.cos(a) * r, top.y + 1.1 + R() * 0.7, top.z + Math.sin(a) * r, 2.2 + R() * 1.4, 0.75 + R() * 0.35, 2.2 + R() * 1.4]);
  }
  const m = new THREE.InstancedMesh(crown, M.pine, parts.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  parts.forEach(([x, y, z, sx, sy, sz], i) => m.setMatrixAt(i, m4.compose(p.set(x, y, z), q.identity(), sc.set(sx, sy, sz))));
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return g;
}
// a row of Italian cypresses: tall, narrow, dark (instanced)
export function cypresses(M, list) {
  const geo = new THREE.SphereGeometry(1, 16, 14);
  geo.translate(0, 1, 0);
  const m = new THREE.InstancedMesh(geo, M.cypress, list.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  list.forEach(([x, z, h, r], i) => m.setMatrixAt(i, m4.compose(p.set(x, 0, z), q.identity(), sc.set(r, h / 2, r))));
  m.castShadow = m.receiveShadow = true;
  return m;
}
