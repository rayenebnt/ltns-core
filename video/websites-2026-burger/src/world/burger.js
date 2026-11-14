// BRAISE food: the smash burger the way the reference shows it — a glossy brioche (no sesame), thin
// smashed patties with a dark crust and a lacy crispy rim, melted cheddar draping and dripping over
// them, a heap of caramelized onions, crispy fried onions, an orange sauce — plus the cookie milkshake
// in its clear cup with a dome lid, and a sheet of parchment. Procedural geometry and canvas textures
// only (no images). Units: cm, Y up; each layer is built standing on y = 0.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

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
const hash = (x, y) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const fbm = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.1 + 3.1, y * 2.1 - 1.7) * 0.3 + vnoise(x * 4.3 - 2.3, y * 4.3 + 5.2) * 0.15;
const col = (h) => new THREE.Color(h);

let ANISO = 4;
export const setAniso = (a) => (ANISO = a);
export function canvasTex(w, h, draw, { srgb = true, repeat = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ANISO;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// a grey-level noise canvas (bump maps, alpha maps)
function noiseTex(w, h, f, seed = 0, { contrast = 1, bias = 0, repeat = true } = {}) {
  return canvasTex(w, h, (g) => {
    const im = g.createImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const v = clamp((f(x, y, seed) - 0.5) * contrast + 0.5 + bias);
        const k = (y * w + x) * 4;
        im.data[k] = im.data[k + 1] = im.data[k + 2] = v * 255;
        im.data[k + 3] = 255;
      }
    g.putImageData(im, 0, 0);
  }, { srgb: false, repeat });
}

// ------------------------------------------------------------------ materials
export function burgerMaterials() {
  // the brioche: glossy egg-washed crust (vertex colours: deep orange-brown on top, paler at the edge)
  const breadBump = noiseTex(256, 256, (x, y) => vnoise(x / 3.2, y / 3.2) * 0.6 + vnoise(x / 9, y / 9) * 0.4);
  const crust = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.34, bumpMap: breadBump, bumpScale: 0.25, clearcoat: 0.9, clearcoatRoughness: 0.22, sheen: 0.35, sheenRoughness: 0.5, sheenColor: col('#ffcf8a') });
  const crumbTex = canvasTex(256, 256, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, w * 0.1, w / 2, h / 2, w * 0.5);
    grd.addColorStop(0, '#f0d7a6');
    grd.addColorStop(0.8, '#e2b878');
    grd.addColorStop(1, '#b8732f');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    const r = rng(7);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = r() < 0.55 ? 'rgba(150,95,40,0.35)' : 'rgba(255,240,210,0.4)';
      g.beginPath();
      g.arc(r() * w, r() * h, 0.6 + r() * 1.6, 0, Math.PI * 2);
      g.fill();
    }
  });
  const crumb = new THREE.MeshStandardMaterial({ map: crumbTex, roughness: 0.8, bumpMap: breadBump, bumpScale: 0.6 });
  // the patty: dark seared crust with brighter juicy flecks and charred spots
  const pattyTex = canvasTex(512, 512, (g, w, h) => {
    const im = g.createImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const n = fbm(x / 22, y / 22), m = vnoise(x / 4.5, y / 4.5), c = vnoise(x / 40 + 9, y / 40 - 3);
        const v = 0.35 + 0.75 * n + 0.35 * (m - 0.5);
        const char = clamp((c - 0.62) * 4);
        const k = (y * w + x) * 4;
        im.data[k] = clamp((92 * v) * (1 - 0.6 * char) / 255) * 255;
        im.data[k + 1] = clamp((48 * v) * (1 - 0.65 * char) / 255) * 255;
        im.data[k + 2] = clamp((26 * v) * (1 - 0.7 * char) / 255) * 255;
        im.data[k + 3] = 255;
      }
    g.putImageData(im, 0, 0);
  }, { repeat: true });
  const pattyBump = noiseTex(256, 256, (x, y) => vnoise(x / 2.2, y / 2.2) * 0.5 + vnoise(x / 7, y / 7) * 0.5, 0, { contrast: 1.6 });
  const patty = new THREE.MeshPhysicalMaterial({ map: pattyTex, roughness: 0.48, bumpMap: pattyBump, bumpScale: 1.4, clearcoat: 0.35, clearcoatRoughness: 0.45 });
  // the lacy rim: the same crust, cut by a noise alpha (holes) towards its outer edge
  const laceAlpha = canvasTex(512, 64, (g, w, h) => {
    const im = g.createImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const t = y / (h - 1); // 0 inner .. 1 outer
        const n = vnoise(x / 5, y / 5) * 0.6 + vnoise(x / 13 + 4, y / 13) * 0.4;
        const keep = n - t * 1.25 + 0.36 > 0.5 ? 255 : 0;
        const k = (y * w + x) * 4;
        im.data[k] = im.data[k + 1] = im.data[k + 2] = keep;
        im.data[k + 3] = 255;
      }
    g.putImageData(im, 0, 0);
  }, { srgb: false });
  const lace = new THREE.MeshPhysicalMaterial({ map: pattyTex, color: col('#e6a46a'), alphaMap: laceAlpha, alphaTest: 0.5, roughness: 0.55, bumpMap: pattyBump, bumpScale: 1.2, side: THREE.DoubleSide });
  // melted cheddar: glossy, a little translucent-looking (a warm emissive lift)
  const cheese = new THREE.MeshPhysicalMaterial({ color: col('#f39a14'), emissive: col('#5a2200'), emissiveIntensity: 0.18, roughness: 0.2, clearcoat: 0.7, clearcoatRoughness: 0.2, sheen: 0.6, sheenColor: col('#ffd56e'), side: THREE.DoubleSide });
  const onion = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.25 });
  const crispy = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, bumpMap: pattyBump, bumpScale: 0.3 });
  const sauce = new THREE.MeshPhysicalMaterial({ color: col('#e9772e'), emissive: col('#4a1500'), emissiveIntensity: 0.3, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide });
  const baconTex = canvasTex(512, 128, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    [[0, '#3a0f08'], [0.16, '#7d2614'], [0.3, '#d9925f'], [0.42, '#6e1d10'], [0.6, '#5a170c'], [0.72, '#d48f60'], [0.86, '#6a1d10'], [1, '#2e0b06']].forEach(([o, c]) => grd.addColorStop(o, c));
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    const r = rng(9);
    for (let i = 0; i < 320; i++) {
      g.fillStyle = r() < 0.6 ? 'rgba(25,6,3,0.45)' : 'rgba(255,215,170,0.2)';
      g.fillRect(r() * w, r() * h, 2 + r() * 12, 1 + r() * 2);
    }
  });
  const bacon = new THREE.MeshPhysicalMaterial({ map: baconTex, roughness: 0.42, clearcoat: 0.5, bumpMap: pattyBump, bumpScale: 0.6, side: THREE.DoubleSide });
  const jalapeno = new THREE.MeshPhysicalMaterial({ color: col('#3d8a2a'), roughness: 0.25, clearcoat: 0.8 });
  const pickle = new THREE.MeshPhysicalMaterial({ color: col('#7f8f2e'), roughness: 0.3, clearcoat: 0.6 });
  return { crust, crumb, patty, lace, cheese, onion, crispy, sauce, bacon, jalapeno, pickle };
}

// ------------------------------------------------------------------ geometries
function latheColored(profile, colorAt, seg = 72) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  const pos = g.attributes.position;
  const c = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  const ys = profile.map((p) => p[1]);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    colorAt((y - y0) / Math.max(1e-6, y1 - y0), tmp, Math.atan2(z, x), x, z);
    c[i * 3] = tmp.r;
    c[i * 3 + 1] = tmp.g;
    c[i * 3 + 2] = tmp.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}
// egg-washed brioche: pale gold at the base, deep glossy orange-brown on the dome
const TOAST = [col('#f2c27a'), col('#e8a04a'), col('#d77a2a'), col('#b8561a'), col('#9a4414')];
function toastColor(t, out, a, x, z) {
  const n = 0.07 * (fbm(x * 0.35 + 3, z * 0.35 - 2) - 0.5) * 2;
  const k = clamp(t + n) * (TOAST.length - 1);
  const i = Math.min(TOAST.length - 2, Math.floor(k));
  out.copy(TOAST[i]).lerp(TOAST[i + 1], k - i);
}
// a strand heap (caramelized or crispy onions): tubes along short wavy curves, merged, one colour each
function strands(n, seed, { r = 5, h = 0.6, len = [2, 4], rad = 0.12, curl = 0.6, cols, dome = 0.4 }) {
  const R = rng(seed);
  const list = [];
  const tmp = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * r;
    const x0 = Math.cos(a) * d, z0 = Math.sin(a) * d;
    const y0 = 0.15 + R() * h + dome * (1 - d / r);
    const L = len[0] + R() * (len[1] - len[0]);
    const dir = R() * Math.PI * 2;
    const pts = [];
    for (let k = 0; k < 5; k++) {
      const t = k / 4;
      const bend = dir + curl * Math.sin(t * 3.1 + i) * 1.4;
      pts.push(new THREE.Vector3(x0 + Math.cos(bend) * L * t, y0 + 0.25 * Math.sin(t * 5 + i) * h, z0 + Math.sin(bend) * L * t));
    }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, rad * (0.7 + 0.6 * R()), 5, false);
    tmp.copy(cols[Math.floor(R() * cols.length)]).offsetHSL(0, 0, (R() - 0.5) * 0.08);
    const c = new Float32Array(g.attributes.position.count * 3);
    for (let k = 0; k < c.length; k += 3) {
      c[k] = tmp.r;
      c[k + 1] = tmp.g;
      c[k + 2] = tmp.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    list.push(g);
  }
  const m = mergeGeometries(list);
  list.forEach((g) => g.dispose());
  return m;
}
// a melted sheet draped over a disc of radius rTop: flat on top, hanging down the side, with rounded
// drips (lobes in angle) — used for the cheddar and the sauce
function drape(seed, { rTop = 5.3, side = 5.75, base = 0.55, drip = 1.7, lobes = 7, thick = 0.05 }) {
  const R = rng(seed);
  const L = [];
  for (let i = 0; i < lobes; i++) L.push({ a: R() * Math.PI * 2, w: 0.07 + R() * 0.14, len: drip * (0.35 + R() * 0.75) });
  const NA = 160, NR = 22;
  const pos = [], idx = [];
  for (let i = 0; i <= NA; i++) {
    const a = (i / NA) * Math.PI * 2;
    let dl = base * (0.7 + 0.6 * vnoise(Math.cos(a) * 2 + 5, Math.sin(a) * 2 + 5));
    for (const l of L) {
      let da = Math.abs(a - l.a);
      da = Math.min(da, Math.PI * 2 - da);
      dl += l.len * Math.exp(-((da / l.w) ** 2));
    }
    const rOut = rTop + dl;
    for (let j = 0; j <= NR; j++) {
      const r = (j / NR) * rOut;
      let x, y, z;
      if (r <= rTop) {
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
        y = thick + 0.06 * Math.sin(r * 1.7 + a * 3);
      } else {
        const over = r - rTop;
        // rolls over the edge (a quarter round), then hangs down the side, bulging a little at the tip
        const roll = Math.min(over, 0.45);
        const rr = rTop + (side - rTop) * Math.sin((roll / 0.45) * Math.PI / 2) + 0.12 * Math.max(0, over - 0.45) * Math.exp(-(over - 0.45) * 0.8);
        x = Math.cos(a) * rr;
        z = Math.sin(a) * rr;
        y = thick - (over > 0.45 ? 0.3 + (over - 0.45) : 0.3 * (1 - Math.cos((roll / 0.45) * Math.PI / 2)));
      }
      pos.push(x, y, z);
    }
  }
  for (let i = 0; i < NA; i++)
    for (let j = 0; j < NR; j++) {
      const a = i * (NR + 1) + j, b = (i + 1) * (NR + 1) + j;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function burgerGeometries() {
  const G = {};
  // the bottom bun: 2.2 cm, rounded edge, its toasted cut face on top
  G.bunBottom = latheColored([[0, 0], [4.8, 0], [5.6, 0.25], [6.05, 0.9], [6.05, 1.6], [5.75, 2.1], [5.4, 2.2]], (t, o, a, x, z) => toastColor(0.12 + 0.3 * (1 - Math.abs(t - 0.45) * 2), o, a, x, z));
  G.cutBottom = new THREE.CircleGeometry(5.42, 72);
  G.cutBottom.rotateX(-Math.PI / 2);
  // the top bun: a tall glossy dome (5.2 cm), its cut face underneath
  G.bunTop = latheColored([[5.4, 0], [5.95, 0.25], [6.3, 1.0], [6.25, 2.0], [5.75, 3.15], [4.7, 4.15], [3.2, 4.85], [1.6, 5.15], [0, 5.25]], (t, o, a, x, z) => toastColor(0.1 + 0.9 * Math.pow(t, 0.7), o, a, x, z));
  G.cutTop = new THREE.CircleGeometry(5.42, 72);
  G.cutTop.rotateX(Math.PI / 2);
  // the smashed patty: thin and wide, an irregular edge, a bumpy seared top
  {
    const g = new THREE.CylinderGeometry(5.95, 6.15, 1.05, 128, 3);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const a = Math.atan2(z, x), r = Math.hypot(x, z);
      if (r > 0.1) {
        const k = 1 + 0.07 * (fbm(Math.cos(a) * 2.2 + 4, Math.sin(a) * 2.2 + 4) - 0.5) * 2 + 0.025 * Math.sin(a * 29);
        p.setX(i, x * k);
        p.setZ(i, z * k);
      }
      if (y > 0.4) p.setY(i, y + 0.22 * (fbm(x * 0.7 + 2, z * 0.7 - 1) - 0.5));
      else if (y < -0.4) p.setY(i, y - 0.12 * (fbm(x * 0.7 - 5, z * 0.7 + 3) - 0.5));
    }
    g.translate(0, 0.525, 0);
    g.computeVertexNormals();
    G.patty = g;
    // the lacy crispy skirt round it (alpha-cut ring, slightly wavy)
    const lace = new THREE.RingGeometry(5.6, 6.9, 128, 4);
    lace.rotateX(-Math.PI / 2);
    const lp = lace.attributes.position, uv = lace.attributes.uv;
    for (let i = 0; i < lp.count; i++) {
      const x = lp.getX(i), z = lp.getZ(i), r = Math.hypot(x, z), a = Math.atan2(z, x);
      lp.setY(i, 0.42 + 0.05 * Math.sin(a * 11) * (r - 5.6) - 0.12 * (r - 5.6));
      uv.setXY(i, (a / (Math.PI * 2) + 0.5) * 4, (r - 5.6) / 1.3);
    }
    lace.computeVertexNormals();
    G.lace = lace;
  }
  G.cheese = drape(5, { rTop: 5.7, side: 6.55, base: 0.18, drip: 2.2, lobes: 10, thick: 0.08 });
  G.cheese2 = drape(17, { rTop: 5.7, side: 6.5, base: 0.14, drip: 1.9, lobes: 9, thick: 0.08 });
  G.sauce = drape(29, { rTop: 5.0, side: 5.45, base: 0.15, drip: 1.0, lobes: 5, thick: 0.04 });
  G.onions = strands(70, 3, { r: 5.2, h: 0.5, len: [1.8, 3.6], rad: 0.26, curl: 1.2, cols: [col('#b8691f'), col('#cf8a34'), col('#9a5016'), col('#e0a552')], dome: 0.8 });
  G.crispy = strands(190, 8, { r: 5.4, h: 0.9, len: [1.0, 2.2], rad: 0.13, curl: 2.0, cols: [col('#c98a34'), col('#b06e22'), col('#dea24c'), col('#8e5418')], dome: 1.4 });
  {
    const g = new THREE.PlaneGeometry(13.5, 2.6, 70, 4);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      p.setY(i, 0.5 * Math.sin(x * 1.35) + 0.15 * Math.sin(x * 3.4 + z) + 0.1 * Math.sin(z * 2.1));
    }
    g.computeVertexNormals();
    G.bacon = g;
  }
  G.ring = new THREE.TorusGeometry(1.25, 0.2, 8, 32);
  G.ring.rotateX(Math.PI / 2);
  G.slice = new THREE.CylinderGeometry(1.3, 1.3, 0.16, 24);
  return G;
}

// ------------------------------------------------------------------ the builder
// opts: { patties: 1 | 2, cheese, onions, crispy, sauce, bacon, jalapeno, pickles }
// returns { group, layers: [{ id, g, h, r, y0, k }], setExplode(e, time), height }
export function makeBurger(G, M, opts = {}, seed = 1) {
  const o = Object.assign({ patties: 2, cheese: true, onions: true, crispy: true, sauce: true, bacon: false, jalapeno: false, pickles: false }, opts);
  const group = new THREE.Group();
  const layers = [];
  const R = rng(seed);
  const add = (id, h, r, build) => {
    const g = new THREE.Group();
    g.name = id;
    build(g);
    g.traverse((m) => {
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    group.add(g);
    layers.push({ id, g, h, r, k: 0 });
  };
  add('bunBottom', 2.2, 6.05, (g) => {
    g.add(new THREE.Mesh(G.bunBottom, M.crust));
    const cut = new THREE.Mesh(G.cutBottom, M.crumb);
    cut.position.y = 2.2;
    g.add(cut);
  });
  for (let k = 0; k < o.patties; k++) {
    const last = k === o.patties - 1;
    add(last ? 'patty' : `patty${k}`, 1.05, 6.6, (g) => {
      const m = new THREE.Mesh(G.patty, M.patty);
      const l = new THREE.Mesh(G.lace, M.lace);
      m.rotation.y = l.rotation.y = R() * 6.28;
      g.add(m, l);
    });
    if (o.cheese) add(last ? 'cheese' : `cheese${k}`, 0.15, 6.2, (g) => {
      const m = new THREE.Mesh(k % 2 ? G.cheese2 : G.cheese, M.cheese);
      m.position.y = 0.0;
      m.rotation.y = R() * 6.28;
      g.add(m);
    });
  }
  if (o.pickles) add('pickles', 0.2, 4.0, (g) => {
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(G.slice, M.pickle);
      const a = (i / 4) * 6.28 + R();
      s.position.set(Math.cos(a) * 2.3, 0.1, Math.sin(a) * 2.3);
      g.add(s);
    }
  });
  if (o.bacon) add('bacon', 0.8, 6.8, (g) => {
    for (let i = 0; i < 2; i++) {
      const b = new THREE.Mesh(G.bacon, M.bacon);
      b.position.set(0, 0.45, (i - 0.5) * 2.5);
      b.rotation.y = (i ? 0.16 : -0.22) + R() * 0.1;
      g.add(b);
    }
  });
  if (o.onions) add('onions', 0.85, 5.2, (g) => {
    const m = new THREE.Mesh(G.onions, M.onion);
    m.rotation.y = R() * 6.28;
    g.add(m);
  });
  if (o.jalapeno) add('jalapeno', 0.3, 4.6, (g) => {
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(G.ring, M.jalapeno);
      const a = (i / 6) * 6.28 + R();
      s.position.set(Math.cos(a) * 2.8, 0.18, Math.sin(a) * 2.8);
      s.scale.setScalar(0.85);
      g.add(s);
    }
  });
  if (o.crispy) add('crispy', 1.2, 5.3, (g) => {
    const m = new THREE.Mesh(G.crispy, M.crispy);
    m.rotation.y = R() * 6.28;
    g.add(m);
  });
  if (o.sauce) add('sauce', 0.1, 5.4, (g) => {
    const m = new THREE.Mesh(G.sauce, M.sauce);
    m.rotation.y = R() * 6.28;
    g.add(m);
  });
  add('bunTop', 5.25, 6.3, (g) => {
    g.add(new THREE.Mesh(G.bunTop, M.crust));
    const cut = new THREE.Mesh(G.cutTop, M.crumb);
    cut.position.y = 0.01;
    g.add(cut);
  });
  let y = 0;
  for (const L of layers) {
    L.y0 = y;
    y += L.h;
  }
  const GAP = 3.8;
  function setExplode(e, time = 0) {
    const n = layers.length;
    layers.forEach((L, i) => {
      // a staggered cascade: the top layers leave first
      const k = smooth(e * 1.35 - ((n - 1 - i) / Math.max(1, n - 1)) * 0.35);
      L.k = k;
      L.g.position.y = L.y0 + k * i * GAP;
      L.g.rotation.y = k * (i % 2 ? 0.3 : -0.26) + k * 0.05 * Math.sin(time * 0.8 + i);
    });
  }
  setExplode(0);
  return { group, layers, setExplode, height: y, GAP };
}

// ------------------------------------------------------------------ the cookie milkshake
export function makeShake(logoTex) {
  const g = new THREE.Group();
  g.name = 'shake';
  // the shake seen through the cup: cream with cookie crumbs, strawberry drizzle down the wall
  const shakeTex = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#eadbc8';
    c.fillRect(0, 0, w, h);
    const r = rng(41);
    for (let i = 0; i < 360; i++) {
      c.fillStyle = r() < 0.75 ? `rgba(48,38,34,${0.45 + r() * 0.4})` : 'rgba(140,110,90,0.5)';
      c.beginPath();
      c.ellipse(r() * w, r() * h, 1.5 + r() * 5, 1 + r() * 3.5, r() * 3, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = '#a5162a';
    c.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      c.lineWidth = 7 + r() * 9;
      c.globalAlpha = 0.65;
      c.beginPath();
      let x = (i / 9) * w + r() * 30;
      c.moveTo(x, -10);
      const yEnd = h * (0.35 + r() * 0.5);
      for (let y = 0; y < yEnd; y += 24) {
        x += (r() - 0.5) * 10;
        c.lineTo(x, y);
      }
      c.stroke();
    }
    c.globalAlpha = 1;
  }, { repeat: true });
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 3.15, 13.4, 48), new THREE.MeshPhysicalMaterial({ map: shakeTex, roughness: 0.55, sheen: 0.3 }));
  inner.position.y = 6.75;
  const cupMat = new THREE.MeshPhysicalMaterial({ color: col('#ffffff'), transparent: true, opacity: 0.2, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, side: THREE.DoubleSide, depthWrite: false });
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 3.35, 14, 56, 1, true), cupMat);
  cup.position.y = 7;
  cup.renderOrder = 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(4.32, 0.12, 8, 56), cupMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 14;
  // the dome lid, whipped cream and cookie inside
  const dome = new THREE.Mesh(new THREE.SphereGeometry(4.34, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), cupMat);
  dome.position.y = 14;
  dome.scale.y = 0.72;
  dome.renderOrder = 3;
  const creamM = new THREE.MeshPhysicalMaterial({ color: col('#fbf4ea'), roughness: 0.45, sheen: 0.6, sheenColor: col('#ffffff') });
  const cream = new THREE.Mesh(new THREE.SphereGeometry(3.7, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), creamM);
  cream.position.y = 13.8;
  cream.scale.y = 0.62;
  const swirl = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.75, 12, 40), creamM);
  swirl.rotation.x = Math.PI / 2;
  swirl.position.y = 15.3;
  const cookieM = new THREE.MeshStandardMaterial({ color: col('#241c1a'), roughness: 0.75 });
  const cookie = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.45, 24), cookieM);
  cookie.position.set(0.6, 16.0, 0.3);
  cookie.rotation.set(0.9, 0.3, 0.4);
  const crumbs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.2, 0.3), cookieM, 40);
  const r = rng(13), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pv = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < 40; i++) {
    const a = r() * 6.28, d = r() * 3.2;
    pv.set(Math.cos(a) * d, 14 + 2.3 * (1 - (d / 3.4) ** 2) * 0.9, Math.sin(a) * d);
    q.setFromEuler(e.set(r() * 3, r() * 3, r() * 3));
    m4.compose(pv, q, one);
    crumbs.setMatrixAt(i, m4);
  }
  // the round sticker with the logo, facing the front
  const sticker = new THREE.Mesh(new THREE.CircleGeometry(2.3, 40), new THREE.MeshStandardMaterial({ map: logoTex, roughness: 0.5, transparent: true }));
  sticker.position.set(0, 7.2, 3.86);
  sticker.rotation.x = -0.068;
  g.add(inner, cream, swirl, cookie, crumbs, sticker, cup, rim, dome);
  [inner, cream, swirl, cookie].forEach((m) => (m.castShadow = true));
  return g;
}

// ------------------------------------------------------------------ the parchment under the hero burger
export function makeParchment() {
  const g = new THREE.PlaneGeometry(26, 26, 40, 40);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), d = Math.max(Math.abs(x), Math.abs(z));
    const crease = 0.18 * Math.abs(Math.sin(x * 0.45 + z * 0.2)) + 0.12 * Math.abs(Math.sin(z * 0.6 - x * 0.15));
    p.setY(i, 0.04 + crease * smooth((d - 7) / 6) + 0.25 * Math.max(0, d - 11) ** 1.5 * 0.2);
  }
  g.computeVertexNormals();
  const tex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#f5f0e6';
    c.fillRect(0, 0, w, h);
    const r = rng(5);
    for (let i = 0; i < 300; i++) {
      c.strokeStyle = `rgba(160,140,110,${0.05 + r() * 0.08})`;
      c.lineWidth = 0.6;
      c.beginPath();
      const x = r() * w, y = r() * h;
      c.moveTo(x, y);
      c.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 60);
      c.stroke();
    }
  });
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide }));
  m.receiveShadow = true;
  m.name = 'parchment';
  return m;
}
