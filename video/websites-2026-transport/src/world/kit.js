// ORVAN: the model kit of the dioramas, all procedural, in "clay": matte white and light grey, the
// company's red (trucks, bands, gantries, planes), mint-green low-poly trees, tan boxes, warm lit
// windows. A builder merges the static parts per material (a few draw calls per diorama); the
// vehicles are small groups that share their geometries and materials.
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
const std = (hex, o = {}) => new THREE.MeshStandardMaterial({ color: col(hex), roughness: 0.82, metalness: 0, ...o });

export function canvasTex(w, h, draw, { repeat = false, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
// ribbed cladding: white with soft vertical grooves (tiles every rib)
const ribTex = (base, line, n = 8) =>
  canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * (w / n);
      const gr = g.createLinearGradient(x - 6, 0, x + 6, 0);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(0.5, line);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(x - 6, 0, 12, h);
    }
  }, { repeat: true });
// roller doors: horizontal slats
const doorTex = () =>
  canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#d4d5d7';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 4; y < h; y += 9) g.fillRect(0, y, w, 2);
  });
// cardboard: tan with the tape across
const boxTex = () =>
  canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#d9b479';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(120,80,30,0.18)';
    g.fillRect(0, 0, w, 3);
    g.fillRect(0, h - 3, w, 3);
    g.fillStyle = 'rgba(255,240,210,0.55)';
    g.fillRect(w * 0.44, 0, w * 0.12, h);
  });
// a container's corrugated side
const contTex = (base, dark) =>
  canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    g.fillStyle = dark;
    for (let x = 3; x < w; x += 8) g.fillRect(x, 3, 3, h - 6);
    g.fillRect(0, 0, w, 3);
    g.fillRect(0, h - 3, w, 3);
  });

export const T = {
  rib: ribTex('#f3f2ef', 'rgba(0,0,0,0.10)'),
  ribRed: ribTex('#e3241b', 'rgba(0,0,0,0.16)', 10),
  door: doorTex(),
  box: boxTex(),
  contW: contTex('#eeeeec', 'rgba(0,0,0,0.08)'),
  contG: contTex('#c9cacc', 'rgba(0,0,0,0.1)'),
};

export const M = {
  white: std('#f6f5f2'),
  wall: std('#f1f0ec'),
  ribWall: new THREE.MeshStandardMaterial({ map: T.rib, roughness: 0.85 }),
  ground: std('#efeeeb', { roughness: 1 }),
  yard: std('#e3e2df', { roughness: 1 }),
  asphalt: std('#d8d7d4', { roughness: 1 }),
  grey: std('#c9c8c4'),
  roof: std('#8e9095', { roughness: 0.9 }),
  mid: std('#a9a9a7'),
  dark: std('#3c3f45', { roughness: 0.55 }),
  shelter: std('#55585e', { roughness: 0.8 }),
  glass: std('#7d8b98', { roughness: 0.18, metalness: 0.25 }),
  lit: std('#ffe7a8', { emissive: col('#ffcc66'), emissiveIntensity: 0.55, roughness: 0.4 }),
  red: std('#e3241b', { roughness: 0.5 }),
  redDark: std('#b5170f', { roughness: 0.55 }),
  door: new THREE.MeshStandardMaterial({ map: T.door, roughness: 0.7 }),
  tan: new THREE.MeshStandardMaterial({ map: T.box, roughness: 0.9 }),
  tan2: new THREE.MeshStandardMaterial({ map: T.box, color: col('#e6cfa6'), roughness: 0.9 }),
  wood: std('#d3a46a', { roughness: 0.9 }),
  rack: std('#dcdde0', { roughness: 0.6, metalness: 0.2 }),
  beam: std('#e46e2a', { roughness: 0.6 }),
  green: std('#6fd8a6', { roughness: 0.85, flatShading: true }),
  green2: std('#4fc28d', { roughness: 0.85, flatShading: true }),
  trunk: std('#f2eee6'),
  grass: std('#d6edcd', { roughness: 1 }),
  line: std('#ffffff', { roughness: 0.9 }),
  yellow: std('#f2c84b', { roughness: 0.8 }),
  rail: std('#8a8d93', { roughness: 0.45, metalness: 0.4 }),
  ballast: std('#cfcdc8', { roughness: 1 }),
  sleeper: std('#b9b6b0', { roughness: 1 }),
  contW: new THREE.MeshStandardMaterial({ map: T.contW, roughness: 0.75 }),
  contG: new THREE.MeshStandardMaterial({ map: T.contG, roughness: 0.75 }),
  skin: std('#f1d7c2'),
};

export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const rbox = (w, h, d, r = 0.08, seg = 2) => new RoundedBoxGeometry(w, h, d, seg, Math.max(0.001, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)));
export const cyl = (rt, rb, h, n = 12) => new THREE.CylinderGeometry(rt, rb, h, n);
// a plane whose UVs repeat every `tile` metres (for the ribbed walls)
export function tiledPlane(w, h, tileX = 1.2, tileY = h) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / tileX), uv.getY(i) * (h / tileY));
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
// copies a built prototype (shared geometries and materials)
export function instance(proto) {
  const g = new THREE.Group();
  proto.traverse((o) => {
    if (o.isMesh) {
      const m = new THREE.Mesh(o.geometry, o.material);
      m.position.copy(o.position);
      m.quaternion.copy(o.quaternion);
      m.scale.copy(o.scale);
      m.castShadow = o.castShadow;
      m.receiveShadow = o.receiveShadow;
      g.add(m);
    }
  });
  return g;
}

// ------------------------------------------------------------------ the logo: a white slanted script on red
export function logoTex(w = 1024, h = 256, { bg = '#e3241b', fg = '#ffffff', ribs = 0 } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    if (ribs) {
      g.fillStyle = 'rgba(0,0,0,0.12)';
      for (let x = 0; x < w; x += w / ribs) g.fillRect(x, 0, 3, h);
    }
    g.save();
    g.translate(w / 2, h * 0.58);
    g.transform(1, 0, -0.24, 1, 0, 0);
    g.fillStyle = fg;
    g.font = `800 ${Math.round(h * 0.56)}px 'Archivo', sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if ('letterSpacing' in g) g.letterSpacing = `${Math.round(-h * 0.01)}px`;
    g.fillText('Orvan', 0, 0);
    // the swash under the name
    const tw = g.measureText('Orvan').width;
    g.lineWidth = h * 0.05;
    g.strokeStyle = fg;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-tw * 0.48, h * 0.26);
    g.quadraticCurveTo(0, h * 0.36, tw * 0.52, h * 0.18);
    g.stroke();
    g.restore();
  });
}
export function wordTex(text, { w = 1024, h = 160, color = '#e3241b', bg = null, weight = 800, slant = 0 } = {}) {
  return canvasTex(w, h, (g) => {
    if (bg) {
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
    } else g.clearRect(0, 0, w, h);
    g.save();
    g.translate(w / 2, h * 0.56);
    if (slant) g.transform(1, 0, -slant, 1, 0, 0);
    g.fillStyle = color;
    g.font = `${weight} ${Math.round(h * 0.7)}px 'Archivo', sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if ('letterSpacing' in g) g.letterSpacing = `${Math.round(h * 0.08)}px`;
    g.fillText(text, 0, 0);
    g.restore();
  });
}
export const texMat = (tex, o = {}) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, ...o });

// ------------------------------------------------------------------ trees, people, cars, lamps
export function trees(list, R = rng(3)) {
  const g = new THREE.Group();
  const n = list.length;
  const can = new THREE.IcosahedronGeometry(1, 1);
  {
    const p = can.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 1 + 0.12 * Math.sin(p.getX(i) * 5 + p.getY(i) * 3) * Math.cos(p.getZ(i) * 4);
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
    }
    can.computeVertexNormals();
  }
  const tr = cyl(0.13, 0.18, 1, 7);
  tr.translate(0, 0.5, 0);
  const A = new THREE.InstancedMesh(can, M.green, n), B = new THREE.InstancedMesh(can, M.green2, n), Tk = new THREE.InstancedMesh(tr, M.trunk, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let na = 0, nb = 0;
  list.forEach(([x, y, z, k = 1], i) => {
    const h = (2.2 + R() * 1.4) * k, r = (1.35 + R() * 0.55) * k;
    Tk.setMatrixAt(i, m4.compose(p.set(x, y, z), q.identity(), s.set(k, h * 0.55, k)));
    q.setFromEuler(e.set(R() * 0.3, R() * 6, R() * 0.3));
    m4.compose(p.set(x, y + h * 0.5 + r * 0.9, z), q, s.set(r, r * 1.3, r));
    if (R() < 0.6) A.setMatrixAt(na++, m4);
    else B.setMatrixAt(nb++, m4);
  });
  A.count = na;
  B.count = nb;
  for (const m of [A, B, Tk]) {
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}
export function people(list) {
  const body = new THREE.CapsuleGeometry(0.26, 1.0, 3, 8);
  body.translate(0, 0.78, 0);
  const head = new THREE.SphereGeometry(0.2, 10, 8);
  head.translate(0, 1.62, 0);
  const g = new THREE.Group();
  const B = new THREE.InstancedMesh(body, M.dark, list.length), H = new THREE.InstancedMesh(head, M.skin, list.length);
  const m4 = new THREE.Matrix4();
  list.forEach(([x, y, z], i) => {
    m4.makeTranslation(x, y, z);
    B.setMatrixAt(i, m4);
    H.setMatrixAt(i, m4);
  });
  B.castShadow = H.castShadow = true;
  g.add(B, H);
  return g;
}
let carProto = null;
const carCols = ['#f6f5f2', '#c9c8c4', '#3c3f45', '#e3241b', '#9fb3c4'].map((h) => std(h, { roughness: 0.4, metalness: 0.15 }));
export function car(ci = 0) {
  const b = builder();
  b.add(rbox(4.4, 0.9, 1.85, 0.3), carCols[ci % carCols.length], 0, 0.75, 0);
  b.add(rbox(2.4, 0.75, 1.7, 0.28), carCols[ci % carCols.length], -0.3, 1.45, 0);
  b.add(box(2.2, 0.55, 1.74), M.glass, -0.3, 1.47, 0);
  const w = cyl(0.34, 0.34, 0.26, 12);
  w.rotateX(Math.PI / 2);
  for (const x of [-1.4, 1.4]) for (const z of [-0.85, 0.85]) b.add(w, M.dark, x, 0.34, z);
  return b.build(new THREE.Group());
}
export function lamps(list) {
  const b = builder();
  for (const [x, y, z, ry = 0] of list) {
    b.add(cyl(0.09, 0.12, 7, 8), M.mid, x, y + 3.5, z);
    b.add(box(1.4, 0.18, 0.4), M.mid, x + Math.cos(ry) * 0.6, y + 7, z - Math.sin(ry) * 0.6, ry);
  }
  return b.build(new THREE.Group());
}

// ------------------------------------------------------------------ the truck (16.5 m), front along +x
const truckProtos = new Map();
let trailerGeo = null, sideGeo = null;
const sideMats = new Map();
export function truck(logo, { trailer = true } = {}) {
  const key = trailer ? 'full' : 'solo';
  if (!truckProtos.has(key)) {
    const b = builder();
    // the cab
    b.add(rbox(2.35, 2.75, 2.5, 0.28, 3), M.red, 7.15, 2.35, 0);
    b.add(rbox(1.7, 0.75, 2.4, 0.25), M.red, 6.75, 4.05, 0);
    b.add(box(0.06, 1.05, 2.15), M.glass, 8.33, 2.95, 0);
    for (const sz of [-1, 1]) {
      b.add(box(1.05, 0.95, 0.06), M.glass, 7.55, 2.95, sz * 1.26);
      b.add(box(0.12, 0.55, 0.12), M.dark, 8.1, 3.1, sz * 1.42);
      b.add(box(0.5, 0.18, 0.06), M.dark, 8.1, 3.4, sz * 1.36);
      b.add(box(1.5, 0.12, 0.2), M.dark, 6.9, 1.2, sz * 1.28);
    }
    b.add(box(0.1, 0.75, 1.9), M.dark, 8.33, 1.85, 0);
    b.add(box(0.3, 0.35, 2.5), M.grey, 8.32, 1.05, 0);
    for (const sz of [-1, 1]) b.add(box(0.06, 0.2, 0.45), M.white, 8.4, 1.45, sz * 0.92);
    // the chassis and its tanks
    b.add(box(12.5, 0.4, 1.0), M.dark, 0.6, 1.0, 0);
    const tank = cyl(0.42, 0.42, 1.3, 14);
    tank.rotateZ(Math.PI / 2);
    for (const sz of [-1, 1]) b.add(tank, M.grey, 4.9, 1.05, sz * 0.95);
    if (trailer) {
      b.add(rbox(13.2, 0.28, 2.55, 0.06), M.redDark, -0.95, 1.38, 0);
      b.add(box(0.12, 3.0, 2.5), M.grey, -7.55, 2.95, 0);
      for (const sz of [-1, 1]) b.add(box(7.5, 0.6, 0.06), M.red, -0.7, 1.05, sz * 1.2);
    }
    const w = cyl(0.53, 0.53, 0.42, 16);
    w.rotateX(Math.PI / 2);
    const hub = cyl(0.26, 0.26, 0.44, 10);
    hub.rotateX(Math.PI / 2);
    const xs = trailer ? [7.45, 5.5, -4.9, -6.1, -7.3] : [7.45, 5.5];
    for (const x of xs)
      for (const z of [-1.07, 1.07]) {
        b.add(w, M.dark, x, 0.53, z);
        b.add(hub, M.grey, x, 0.53, z);
      }
    truckProtos.set(key, b.build(new THREE.Group()));
  }
  const g = instance(truckProtos.get(key));
  if (trailer) {
    // the box: red sides with ribs and the script, white roof
    if (!sideMats.has(logo)) sideMats.set(logo, texMat(logo, { roughness: 0.55 }));
    const side = sideMats.get(logo);
    trailerGeo = trailerGeo || rbox(13.2, 3.05, 2.55, 0.1);
    sideGeo = sideGeo || new THREE.PlaneGeometry(12.8, 2.75);
    const body = new THREE.Mesh(trailerGeo, M.red);
    body.position.set(-0.95, 3.0, 0);
    body.castShadow = body.receiveShadow = true;
    g.add(body);
    for (const sz of [-1, 1]) {
      const pl = new THREE.Mesh(sideGeo, side);
      pl.position.set(-0.95, 3.0, sz * 1.282);
      pl.rotation.y = sz > 0 ? 0 : Math.PI;
      g.add(pl);
    }
  }
  return g;
}

// ------------------------------------------------------------------ the forklift (red), along +x
let liftProto = null;
export function forklift() {
  if (!liftProto) {
    const b = builder();
    b.add(rbox(2.2, 1.0, 1.3, 0.2), M.red, 0, 0.85, 0);
    b.add(rbox(0.9, 0.5, 1.25, 0.15), M.dark, -0.75, 1.45, 0);
    for (const dx of [-0.35, 0.45]) for (const z of [-0.55, 0.55]) b.add(box(0.07, 1.5, 0.07), M.dark, dx, 2.05, z);
    b.add(box(1.0, 0.07, 1.25), M.dark, 0.05, 2.8, 0);
    for (const z of [-0.42, 0.42]) b.add(box(0.12, 3.0, 0.12), M.dark, 1.15, 1.55, z);
    for (const z of [-0.3, 0.3]) b.add(box(1.3, 0.08, 0.16), M.grey, 1.85, 0.22, z);
    const w = cyl(0.3, 0.3, 0.25, 12);
    w.rotateX(Math.PI / 2);
    for (const x of [-0.65, 0.65]) for (const z of [-0.6, 0.6]) b.add(w, M.dark, x, 0.3, z);
    liftProto = b.build(new THREE.Group());
  }
  return instance(liftProto);
}

// ------------------------------------------------------------------ the plane (red), nose along +x
let planeProto = null;
export function plane() {
  if (!planeProto) {
    const prof = [[0, -15], [0.6, -14.6], [1.5, -12.8], [2.05, -9], [2.15, -4], [2.15, 9], [1.95, 11.6], [1.4, 13.4], [0.7, 14.5], [0, 14.8]];
    const fus = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 24);
    fus.rotateZ(-Math.PI / 2);
    const b = builder();
    b.add(fus, M.red, 0, 3.1, 0);
    const cock = new THREE.SphereGeometry(1.0, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    cock.scale(1.2, 0.5, 1.5);
    b.add(cock, M.glass, 12.6, 3.95, 0, 0, 0, -0.35);
    const wing = new THREE.Shape();
    wing.moveTo(0, 0);
    wing.lineTo(-6.0, 15.5);
    wing.lineTo(-8.2, 15.5);
    wing.lineTo(-6.8, 0);
    const wg = new THREE.ExtrudeGeometry(wing, { depth: 0.4, bevelEnabled: false });
    wg.rotateX(Math.PI / 2);
    b.add(wg, M.white, 3.4, 2.5, 1.9, 0, -0.04);
    const wg2 = wg.clone();
    wg2.scale(1, 1, -1);
    b.add(wg2, M.white, 3.4, 2.1, -1.9, 0, 0.04);
    const fin = new THREE.Shape();
    fin.moveTo(0, 0);
    fin.lineTo(-4.4, 6.6);
    fin.lineTo(-6.4, 6.6);
    fin.lineTo(-5.6, 0);
    b.add(new THREE.ExtrudeGeometry(fin, { depth: 0.32, bevelEnabled: false }), M.red, -8.6, 4.7, -0.16);
    const st = new THREE.Shape();
    st.moveTo(0, 0);
    st.lineTo(-2.6, 5.4);
    st.lineTo(-4.0, 5.4);
    st.lineTo(-3.4, 0);
    const sg = new THREE.ExtrudeGeometry(st, { depth: 0.22, bevelEnabled: false });
    sg.rotateX(Math.PI / 2);
    b.add(sg, M.white, -10.2, 4.8, 0.7);
    const sg2 = sg.clone();
    sg2.scale(1, 1, -1);
    b.add(sg2, M.white, -10.2, 4.58, -0.7);
    const eng = new THREE.LatheGeometry([[0.0, -1.8], [0.75, -1.8], [0.85, -1.2], [0.85, 1.2], [0.6, 1.8], [0, 1.8]].map(([r, y]) => new THREE.Vector2(r, y)), 16);
    eng.rotateZ(-Math.PI / 2);
    for (const z of [-5.6, 5.6]) b.add(eng, M.white, 2.4, 1.85, z);
    for (const z of [-5.6, 5.6]) b.add(box(1.2, 0.8, 0.25), M.white, 1.8, 2.5, z);
    for (let i = 0; i < 9; i++) for (const sz of [-1, 1]) b.add(box(0.5, 0.35, 0.06), M.glass, 9 - i * 1.6, 3.7, sz * 2.12);
    const gear = cyl(0.4, 0.4, 0.34, 12);
    gear.rotateX(Math.PI / 2);
    for (const [x, z] of [[10.5, 0], [-0.6, -1.6], [-0.6, 1.6]]) b.add(gear, M.dark, x, 0.4, z);
    for (const [x, z] of [[10.5, 0], [-0.6, -1.6], [-0.6, 1.6]]) b.add(box(0.16, 1.2, 0.16), M.grey, x, 1.2, z);
    planeProto = b.build(new THREE.Group());
  }
  return instance(planeProto);
}

// ------------------------------------------------------------------ containers (corrugated, a few in the company's red)
export function containerStacks(cells, R = rng(9), redLogo = null) {
  const n = cells.reduce((s, c) => s + c[3], 0);
  const geo = rbox(6.0, 2.55, 2.42, 0.05);
  const mats = [M.contW, M.contG, redLogo ? texMat(redLogo) : M.red, M.white];
  const groups = mats.map((m) => new THREE.InstancedMesh(geo, m, n));
  const counts = mats.map(() => 0);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1), e = new THREE.Euler();
  for (const [x, z, ry, lv, force] of cells)
    for (let k = 0; k < lv; k++) {
      const r = R();
      const i = force !== undefined ? force : r < 0.1 ? 2 : r < 0.45 ? 1 : r < 0.85 ? 0 : 3;
      groups[i].setMatrixAt(counts[i]++, m4.compose(p.set(x, 1.28 + k * 2.58, z), q.setFromEuler(e.set(0, ry, 0)), s));
    }
  const g = new THREE.Group();
  groups.forEach((m, i) => {
    m.count = counts[i];
    m.castShadow = m.receiveShadow = true;
    if (counts[i]) g.add(m);
  });
  return g;
}

// ------------------------------------------------------------------ struts and trusses
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();
// a square bar from A to B
export function strut(b, mat, A, B, w = 0.3) {
  _d.subVectors(B, A);
  const L = _d.length();
  _q.setFromUnitVectors(_up, _d.normalize());
  _e.setFromQuaternion(_q, 'YXZ');
  b.add(box(w, L, w), mat, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2, _e.y, _e.x, _e.z);
}
// two parallel chords A0→A1 and B0→B1, with posts and alternating diagonals between them
export function truss(b, mat, A0, A1, B0, B1, n = 6, w = 0.32, chord = 0.6) {
  strut(b, mat, A0, A1, chord);
  strut(b, mat, B0, B1, chord);
  const P = (a0, a1, t) => a0.clone().lerp(a1, t);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    strut(b, mat, P(A0, A1, t), P(B0, B1, t), w);
    if (i < n) strut(b, mat, P(A0, A1, t), P(B0, B1, (i + 1) / n), w * 0.8);
  }
}
