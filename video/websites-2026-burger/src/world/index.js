// BRAISE world: a warm studio cove (gradient backdrop, shadow-catching floor, room IBL, a key and a rim
// light), the « Double Braise » burger built from procedural layers (it rises apart into its layers and
// comes back together), the takeaway box (tray, hinged lid printed with the logo, fries, sauce cups) with
// its milkshake, and the menu lineup (four burgers built by the same builder). One camera on monotone
// splines of p. Units: centimetres, Y up, the floor at y = 0.
// Contract (main.js): createWorld({ renderer, quality, onProgress }) → { camera, update(state, dt, time),
// render(), resize(w, h, dpr), warmup(), setQuality(level), stats(), anchors(), info() }.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PHASES, within } from '../story.js';
import { LAYER_LABELS, LINEUP } from '../texts.js';

export const rendererOptions = { antialias: true };

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (t) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
const sstep = (a, b, x) => smooth((x - a) / (b - a));
const easeOut3 = (t) => 1 - Math.pow(1 - clamp(t), 3);
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const col = (h) => new THREE.Color(h);

// ------------------------------------------------------------------ small helpers
// deterministic value noise (vertex wobble, canvas speckles)
function rng(seed = 1) {
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
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.1 + 3.1, y * 2.1 - 1.7) * 0.3 + vnoise(x * 4.3 - 2.3, y * 4.3 + 5.2) * 0.15;

let ANISO = 4;
function canvasTex(w, h, draw, { srgb = true, repeat = false } = {}) {
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
// speckled surface: base colour, darker and lighter flecks
function speckle(g, w, h, base, dark, light, n, seed, size = [1, 3]) {
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    g.fillStyle = r() < 0.6 ? dark : light;
    g.globalAlpha = 0.15 + 0.45 * r();
    const s = size[0] + (size[1] - size[0]) * r();
    g.beginPath();
    g.ellipse(r() * w, r() * h, s, s * (0.5 + r() * 0.8), r() * 3.14, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

// ------------------------------------------------------------------ the burger's materials (shared)
function burgerMaterials() {
  const crust = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.32, sheen: 0.25, sheenColor: col('#ffcf9a') });
  const crumbTex = canvasTex(256, 256, (g, w, h) => speckle(g, w, h, '#e7c48d', '#b9884c', '#f5dfb4', 900, 7, [0.8, 2.4]));
  const crumb = new THREE.MeshStandardMaterial({ map: crumbTex, roughness: 0.85 });
  const pattyTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#4a2a19';
    g.fillRect(0, 0, w, h);
    const im = g.getImageData(0, 0, w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const n = fbm(x / 28, y / 28), m = vnoise(x / 6, y / 6);
        const k = (y * w + x) * 4;
        const v = 0.55 + 0.55 * n + 0.25 * (m - 0.5);
        im.data[k] = Math.min(255, 92 * v);
        im.data[k + 1] = Math.min(255, 52 * v);
        im.data[k + 2] = Math.min(255, 30 * v);
      }
    g.putImageData(im, 0, 0);
  }, { repeat: true });
  const patty = new THREE.MeshStandardMaterial({ map: pattyTex, roughness: 0.62, bumpMap: pattyTex, bumpScale: 0.6 });
  const cheese = new THREE.MeshPhysicalMaterial({ color: col('#f1a531'), roughness: 0.32, sheen: 0.4, sheenColor: col('#ffd27a'), side: THREE.DoubleSide });
  const lettuce = new THREE.MeshStandardMaterial({ color: col('#79b43b'), roughness: 0.5, side: THREE.DoubleSide });
  const tomTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c8261c';
    g.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    g.fillStyle = '#e8584a';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      g.beginPath();
      g.ellipse(cx + Math.cos(a) * w * 0.22, cy + Math.sin(a) * h * 0.22, w * 0.14, h * 0.09, a, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#f2d27a';
    const r = rng(3);
    for (let i = 0; i < 40; i++) {
      const a = r() * Math.PI * 2, d = w * (0.15 + r() * 0.12);
      g.beginPath();
      g.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 3, 1.6, a, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#d33a2c';
    g.beginPath();
    g.arc(cx, cy, w * 0.06, 0, Math.PI * 2);
    g.fill();
  });
  const tomato = new THREE.MeshPhysicalMaterial({ map: tomTex, roughness: 0.28, clearcoat: 0.6 });
  const tomSide = new THREE.MeshPhysicalMaterial({ color: col('#b81f17'), roughness: 0.3, clearcoat: 0.6 });
  const baconTex = canvasTex(512, 128, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#5e1a12');
    grd.addColorStop(0.18, '#a33a26');
    grd.addColorStop(0.3, '#e7b08c');
    grd.addColorStop(0.42, '#93301e');
    grd.addColorStop(0.62, '#6e2014');
    grd.addColorStop(0.72, '#e9b997');
    grd.addColorStop(0.84, '#8f2c1b');
    grd.addColorStop(1, '#4e140d');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    const r = rng(9);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(40,10,6,0.35)' : 'rgba(255,220,190,0.18)';
      g.fillRect(r() * w, r() * h, 2 + r() * 10, 1 + r() * 2);
    }
  });
  const bacon = new THREE.MeshStandardMaterial({ map: baconTex, roughness: 0.48, side: THREE.DoubleSide });
  const onion = new THREE.MeshPhysicalMaterial({ color: col('#b06aa0'), roughness: 0.3, clearcoat: 0.5 });
  const pickle = new THREE.MeshPhysicalMaterial({ color: col('#7d8f2c'), roughness: 0.35, clearcoat: 0.4 });
  const jalapeno = new THREE.MeshPhysicalMaterial({ color: col('#3f8a2a'), roughness: 0.3, clearcoat: 0.5 });
  const sauce = new THREE.MeshPhysicalMaterial({ color: col('#e9873a'), roughness: 0.2, clearcoat: 0.8 });
  const seed = new THREE.MeshStandardMaterial({ color: col('#f2e2bf'), roughness: 0.55 });
  return { crust, crumb, patty, cheese, lettuce, tomato, tomSide, bacon, onion, pickle, jalapeno, sauce, seed };
}

// ------------------------------------------------------------------ the burger's geometries (shared)
// a lathe with vertex colours along the profile (toast: darker towards the top of the dome)
function latheColored(profile, colorAt, seg = 64) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, seg);
  const pos = g.attributes.position;
  const c = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  const ys = profile.map((p) => p[1]);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = (y - y0) / Math.max(1e-6, y1 - y0);
    colorAt(t, tmp, Math.atan2(z, x));
    c[i * 3] = tmp.r;
    c[i * 3 + 1] = tmp.g;
    c[i * 3 + 2] = tmp.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}
const TOAST = [col('#f0c27f'), col('#d98f3e'), col('#b5601f'), col('#8f4515')];
function toastColor(t, out, a) {
  const n = 0.06 * Math.sin(a * 5) + 0.04 * Math.sin(a * 13 + 1);
  const k = clamp(t + n) * (TOAST.length - 1);
  const i = Math.min(TOAST.length - 2, Math.floor(k));
  out.copy(TOAST[i]).lerp(TOAST[i + 1], k - i);
}
function burgerGeometries() {
  const G = {};
  // bottom bun: 2 cm, crust round the sides and under, the toasted cut face on top
  G.bunBottom = latheColored([[0, 0], [4.4, 0], [5.2, 0.2], [5.6, 0.75], [5.6, 1.45], [5.35, 1.9], [5.0, 2.0]], (t, o, a) => toastColor(0.25 + 0.35 * (1 - Math.abs(t - 0.5) * 2), o, a));
  G.cut = new THREE.CircleGeometry(5.02, 64);
  G.cut.rotateX(-Math.PI / 2);
  // top bun: a glossy dome 4.6 cm, the cut face underneath
  G.bunTop = latheColored([[5.0, 0], [5.55, 0.22], [5.85, 0.9], [5.7, 1.9], [5.0, 2.95], [3.8, 3.85], [2.2, 4.4], [0, 4.62]], (t, o, a) => toastColor(0.18 + 0.82 * Math.pow(t, 0.8), o, a));
  // patty: an irregular smashed disc, lacy rim, bumpy top
  {
    const g = new THREE.CylinderGeometry(5.7, 5.9, 1.4, 96, 3);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const a = Math.atan2(z, x), r = Math.hypot(x, z);
      if (r > 0.1) {
        const k = 1 + 0.05 * (fbm(Math.cos(a) * 2 + 4, Math.sin(a) * 2 + 4) - 0.5) * 2 + 0.03 * Math.sin(a * 23);
        p.setX(i, x * k);
        p.setZ(i, z * k);
      }
      if (y > 0.6) p.setY(i, y + 0.18 * (fbm(x * 0.6 + 2, z * 0.6 - 1) - 0.5));
    }
    g.translate(0, 0.7, 0);
    g.computeVertexNormals();
    G.patty = g;
  }
  // cheese: a square slice draped over the patty (corners hanging)
  {
    const g = new THREE.PlaneGeometry(10.2, 10.2, 28, 28);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z);
      const over = Math.max(0, d - 4.9);
      p.setY(i, -0.9 * Math.pow(over, 1.35) + 0.04 * Math.sin(x * 1.3 + z));
    }
    g.computeVertexNormals();
    G.cheese = g;
  }
  // lettuce: a frilly leaf ring
  {
    const g = new THREE.CircleGeometry(6.3, 96, 0, Math.PI * 2);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z), a = Math.atan2(z, x);
      const rim = Math.max(0, d - 4.2) / 2.1;
      const k = 1 + 0.08 * Math.sin(a * 9) * rim;
      p.setX(i, x * k);
      p.setZ(i, z * k);
      p.setY(i, rim * (0.45 * Math.sin(a * 17) + 0.25 * Math.sin(a * 7 + 1)) - rim * rim * 0.35);
    }
    g.computeVertexNormals();
    G.lettuce = g;
  }
  G.tomato = new THREE.CylinderGeometry(4.5, 4.5, 0.55, 48);
  G.tomato.translate(0, 0.275, 0);
  // bacon: a wavy strip
  {
    const g = new THREE.PlaneGeometry(13, 2.5, 60, 4);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      p.setY(i, 0.38 * Math.sin(x * 1.25) + 0.12 * Math.sin(x * 3.1 + z));
    }
    g.computeVertexNormals();
    G.bacon = g;
  }
  G.ring = new THREE.TorusGeometry(1.5, 0.16, 8, 36);
  G.ring.rotateX(Math.PI / 2);
  G.slice = new THREE.CylinderGeometry(1.25, 1.25, 0.16, 24);
  G.sauce = new THREE.CylinderGeometry(4.9, 5.0, 0.2, 48);
  G.seed = new THREE.SphereGeometry(0.2, 8, 6);
  G.seed.scale(1.35, 0.55, 0.75);
  return G;
}

// ------------------------------------------------------------------ the burger builder
// opts: { patties: 1 | 2, bacon, onion, pickles, jalapeno, tomato, lettuce, sauce, seeds }
// returns { group, layers: [{ id, g, h, r }], setExplode(e), height }
function makeBurger(G, M, opts = {}, seed = 1) {
  const o = Object.assign({ patties: 2, bacon: true, onion: true, pickles: false, jalapeno: false, tomato: true, lettuce: true, sauce: true, seeds: true }, opts);
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
    layers.push({ id, g, h, r });
  };
  add('bunBottom', 2.0, 5.6, (g) => {
    g.add(new THREE.Mesh(G.bunBottom, M.crust));
    const cut = new THREE.Mesh(G.cut, M.crumb);
    cut.position.y = 2.0;
    g.add(cut);
  });
  if (o.sauce) add('sauce', 0.2, 5.0, (g) => {
    const s = new THREE.Mesh(G.sauce, M.sauce);
    s.position.y = 0.1;
    g.add(s);
  });
  if (o.lettuce) add('lettuce', 0.55, 6.3, (g) => {
    const l = new THREE.Mesh(G.lettuce, M.lettuce);
    l.position.y = 0.3;
    l.rotation.y = R() * 6.28;
    g.add(l);
  });
  if (o.tomato) add('tomato', 0.55, 4.5, (g) => {
    g.add(new THREE.Mesh(G.tomato, [M.tomSide, M.tomato, M.tomato]));
  });
  for (let k = 0; k < o.patties; k++) {
    add(k === o.patties - 1 ? 'patty' : `patty${k}`, 1.45, 5.9, (g) => {
      const m = new THREE.Mesh(G.patty, M.patty);
      m.rotation.y = R() * 6.28;
      g.add(m);
    });
    add(k === o.patties - 1 ? 'cheese' : `cheese${k}`, 0.18, 5.0, (g) => {
      const m = new THREE.Mesh(G.cheese, M.cheese);
      m.position.y = 0.1;
      m.rotation.y = 0.45 + k * 0.6 + R() * 0.2;
      g.add(m);
    });
  }
  if (o.pickles) add('pickles', 0.2, 4.0, (g) => {
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(G.slice, M.pickle);
      const a = (i / 3) * 6.28 + R();
      s.position.set(Math.cos(a) * 2.2, 0.1, Math.sin(a) * 2.2);
      g.add(s);
    }
  });
  if (o.jalapeno) add('jalapeno', 0.2, 4.6, (g) => {
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(G.ring, M.jalapeno);
      const a = (i / 5) * 6.28 + R();
      s.position.set(Math.cos(a) * 2.6, 0.12, Math.sin(a) * 2.6);
      s.scale.setScalar(0.7);
      g.add(s);
    }
  });
  if (o.bacon) add('bacon', 0.7, 6.5, (g) => {
    for (let i = 0; i < 2; i++) {
      const b = new THREE.Mesh(G.bacon, M.bacon);
      b.position.set(0, 0.35, (i - 0.5) * 2.4);
      b.rotation.y = (i ? 0.12 : -0.2) + R() * 0.1;
      g.add(b);
    }
  });
  if (o.onion) add('onion', 0.35, 4.6, (g) => {
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(G.ring, M.onion);
      const a = (i / 4) * 6.28 + R();
      s.position.set(Math.cos(a) * 2.0, 0.16, Math.sin(a) * 2.0);
      s.scale.setScalar(0.8 + 0.4 * R());
      g.add(s);
    }
  });
  add('bunTop', 4.62, 5.85, (g) => {
    g.add(new THREE.Mesh(G.bunTop, M.crust));
    const cut = new THREE.Mesh(G.cut, M.crumb);
    cut.rotation.x = Math.PI;
    cut.position.y = 0.01;
    g.add(cut);
    if (o.seeds) {
      const n = 90;
      const inst = new THREE.InstancedMesh(G.seed, M.seed, n);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), nrm = new THREE.Vector3(), pos = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
      const rs = rng(seed * 7 + 3);
      for (let i = 0; i < n; i++) {
        // on the dome: angle around, and height (the upper two thirds)
        const a = rs() * Math.PI * 2, t = 0.25 + 0.75 * Math.sqrt(rs());
        const y = 1.6 + t * 3.0;
        // radius of the dome at y (from the lathe profile, approximated)
        const r = y > 4.4 ? 2.2 * (4.62 - y) / 0.22 : y > 3.85 ? mix(3.8, 2.2, (y - 3.85) / 0.55) : y > 2.95 ? mix(5.0, 3.8, (y - 2.95) / 0.9) : mix(5.7, 5.0, (y - 1.9) / 1.05);
        pos.set(Math.cos(a) * r, y, Math.sin(a) * r);
        nrm.set(pos.x * 0.6, Math.max(0.6, y - 1.0), pos.z * 0.6).normalize();
        q.setFromUnitVectors(up, nrm);
        q.multiply(new THREE.Quaternion().setFromAxisAngle(up, rs() * 6.28));
        m4.compose(pos, q, sc);
        inst.setMatrixAt(i, m4);
      }
      inst.castShadow = true;
      g.add(inst);
    }
  });
  // assembled heights
  let y = 0;
  for (const L of layers) {
    L.y0 = y;
    y += L.h;
  }
  const height = y;
  const GAP = 3.6;
  function setExplode(e, time = 0) {
    const n = layers.length;
    layers.forEach((L, i) => {
      // a staggered cascade: the top layers leave first
      const k = smooth((e * (1 + 0.35) - ((n - 1 - i) / (n - 1)) * 0.35));
      L.k = k;
      L.g.position.y = L.y0 + k * i * GAP;
      L.g.rotation.y = k * (i % 2 ? 0.35 : -0.3) + k * 0.05 * Math.sin(time * 0.8 + i);
    });
  }
  setExplode(0);
  return { group, layers, setExplode, height, GAP };
}

// ------------------------------------------------------------------ the box, fries, sauce cups, shake
function makeBox(logoTex) {
  const W = 30, D = 20, Hb = 8.6, T = 0.45;
  const black = new THREE.MeshStandardMaterial({ color: col('#1c1a19'), roughness: 0.62 });
  const red = new THREE.MeshStandardMaterial({ color: col('#c4322a'), roughness: 0.7 });
  const box = new THREE.Group();
  box.name = 'box';
  const slab = (w, h, d, m, x, y, z) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    s.position.set(x, y, z);
    s.castShadow = s.receiveShadow = true;
    box.add(s);
    return s;
  };
  // the tray: floor, four walls (black), the red inside, the divider
  slab(W, T, D, black, 0, T / 2, 0);
  slab(W - 2 * T, 0.05, D - 2 * T, red, 0, T + 0.03, 0);
  slab(W, Hb, T, black, 0, Hb / 2, D / 2 - T / 2);
  slab(W, Hb, T, black, 0, Hb / 2, -D / 2 + T / 2);
  slab(T, Hb, D, black, W / 2 - T / 2, Hb / 2, 0);
  slab(T, Hb, D, black, -W / 2 + T / 2, Hb / 2, 0);
  slab(0.3, Hb * 0.8, D - 2 * T, red, 3.5, (Hb * 0.8) / 2, 0);
  // the lid, hinged on the back top edge (pivot at z = -D/2, y = Hb)
  const pivot = new THREE.Group();
  pivot.position.set(0, Hb, -D / 2);
  box.add(pivot);
  const lid = new THREE.Group();
  lid.position.set(0, 0, D / 2); // the lid's centre, relative to the hinge
  pivot.add(lid);
  const lidH = 4.4;
  const top = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, T, D + 0.4), [black, black, new THREE.MeshStandardMaterial({ map: logoTex, roughness: 0.55 }), red, black, black]);
  top.position.y = lidH;
  top.castShadow = top.receiveShadow = true;
  lid.add(top);
  const lslab = (w, h, d, x, z) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), black);
    s.position.set(x, lidH / 2, z);
    s.castShadow = s.receiveShadow = true;
    lid.add(s);
  };
  lslab(W + 0.4, lidH, T, 0, D / 2 + 0.2 - T / 2);
  lslab(W + 0.4, lidH, T, 0, -D / 2 - 0.2 + T / 2);
  lslab(T, lidH, D + 0.4, W / 2 + 0.2 - T / 2, 0);
  lslab(T, lidH, D + 0.4, -W / 2 - 0.2 + T / 2, 0);
  // fries in the right compartment
  const fryM = new THREE.MeshStandardMaterial({ roughness: 0.55 });
  const fryG = new THREE.BoxGeometry(0.72, 0.72, 1);
  const N = 70;
  const fries = new THREE.InstancedMesh(fryG, fryM, N);
  const r = rng(21), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const len = 6.5 + r() * 3.5;
    pos.set(5.6 + r() * 7.6, 3.6 + r() * 2.2, -7.2 + r() * 14.4);
    e.set(-Math.PI / 2 + (r() - 0.5) * 0.9, r() * 3.14, (r() - 0.5) * 0.9, 'YXZ');
    q.setFromEuler(e);
    sc.set(1, 1, len);
    m4.compose(pos, q, sc);
    fries.setMatrixAt(i, m4);
    c.setHSL(0.095 + r() * 0.02, 0.86, 0.4 + r() * 0.08);
    fries.setColorAt(i, c);
  }
  fries.castShadow = fries.receiveShadow = true;
  box.add(fries);
  // two sauce cups (behind the burger)
  const cupM = new THREE.MeshStandardMaterial({ color: col('#f4efe6'), roughness: 0.6 });
  const cupG = new THREE.CylinderGeometry(1.9, 1.5, 2.2, 32, 1, true);
  const sauceG = new THREE.CircleGeometry(1.8, 32);
  sauceG.rotateX(-Math.PI / 2);
  [['#b5261c', -10.6], ['#f1cf72', -6.4]].forEach(([cc, x]) => {
    const cup = new THREE.Mesh(cupG, cupM);
    cup.position.set(x, 1.6, -6.6);
    cup.castShadow = true;
    const s = new THREE.Mesh(sauceG, new THREE.MeshPhysicalMaterial({ color: col(cc), roughness: 0.15, clearcoat: 1 }));
    s.position.set(x, 2.5, -6.6);
    box.add(cup, s);
  });
  return { group: box, pivot, W, D, Hb, burgerSpot: new THREE.Vector3(-6.4, T + 0.05, 1.8) };
}
function makeShake(bandTex) {
  const g = new THREE.Group();
  g.name = 'shake';
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 3.3, 14, 48, 1, true), new THREE.MeshStandardMaterial({ map: bandTex, roughness: 0.55, side: THREE.DoubleSide }));
  cup.position.y = 7;
  const base = new THREE.Mesh(new THREE.CircleGeometry(3.3, 48), new THREE.MeshStandardMaterial({ color: col('#efe8dc') }));
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.02;
  const cream = new THREE.Mesh(new THREE.SphereGeometry(4.1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: col('#fbf3e6'), roughness: 0.4, sheen: 0.5 }));
  cream.scale.y = 0.75;
  cream.position.y = 14;
  const swirl = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.9, 12, 40), cream.material);
  swirl.rotation.x = Math.PI / 2;
  swirl.position.y = 16;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1.4, 20, 12), cream.material);
  cap.position.y = 17.3;
  const drizzle = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.18, 8, 40), new THREE.MeshPhysicalMaterial({ color: col('#9c5418'), roughness: 0.2, clearcoat: 1 }));
  drizzle.rotation.x = Math.PI / 2;
  drizzle.position.y = 16.9;
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 14, 12), new THREE.MeshStandardMaterial({ color: col('#c4322a'), roughness: 0.35 }));
  straw.position.set(1.2, 19, 0.4);
  straw.rotation.z = -0.22;
  g.add(cup, base, cream, swirl, cap, drizzle, straw);
  g.traverse((m) => {
    if (m.isMesh) m.castShadow = true;
  });
  return g;
}

// ------------------------------------------------------------------ the camera keys (cm)
export function monotone(points) {
  const n = points.length, xs = points.map((p) => p[0]), ys = points.map((p) => p[1]), d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m.push(d[0]);
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
const LX = 200; // the menu lineup, away along +X
const KEYS = [
  // p, camera xyz, target xyz, fov
  [0.0, 30, 15, 44, -3.5, 6.2, 0, 30],
  [0.04, 30, 16, 44, -3.5, 6.6, 0, 30],
  [0.12, 18, 26, 104, -10, 21, 0, 30],
  [0.2, 10, 27, 118, -12, 23.5, 0, 30],
  [0.28, 4, 26, 116, -12, 23, 0, 30],
  [0.34, -16, 20, 54, -2, 7.5, 0, 30],
  [0.42, -40, 17, 30, 1.5, 6.8, -2, 30],
  [0.47, -30, 40, 48, -1, 4, 0, 32],
  [0.55, -1, 46, 62, -4.5, 4, 0, 32],
  [0.62, 1, 46, 64, -4.5, 4, 0, 32],
  [0.68, 0, 68, 34, 0, 6, -1, 32],
  [0.72, 0, 70, 30, 0, 6, -1, 32],
  [0.78, LX - 4, 30, 118, LX - 4, 7, 0, 30],
  [0.88, LX - 4, 30, 112, LX - 4, 7.5, 0, 30],
  [1.0, LX - 4, 30, 112, LX - 4, 7.5, 0, 30],
];
const CH = [];
for (let c = 1; c <= 7; c++) CH.push(monotone(KEYS.map((k) => [k[0], k[c]])));

export async function createWorld({ renderer, quality = 'high', onProgress = () => {} }) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  let level = quality;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 10, 0.5, 4000);
  // the room IBL (soft studio reflections on the bun, the cheese, the sauce)
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  // the backdrop: a warm cream cove (full-screen triangle drawn first), the floor catches the shadows
  const bgU = { uTop: { value: col('#f6eadb') }, uBot: { value: col('#e9cdb0') }, uGlow: { value: col('#fff6ea') }, uMix: { value: 0 } };
  const bg = new THREE.Mesh(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)),
    new THREE.ShaderMaterial({
      uniforms: bgU,
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
      fragmentShader: `uniform vec3 uTop; uniform vec3 uBot; uniform vec3 uGlow; varying vec2 vP;
        void main(){ float t = clamp(vP.y * 0.5 + 0.5, 0.0, 1.0); vec3 c = mix(uBot, uTop, smoothstep(0.0, 1.0, t));
          float g = exp(-dot(vP - vec2(0.15, 0.05), vP - vec2(0.15, 0.05)) * 1.6); c = mix(c, uGlow, 0.55 * g);
          c *= 1.0 - 0.18 * smoothstep(0.7, 1.6, length(vP * vec2(0.8, 1.0)));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    }),
  );
  bg.frustumCulled = false;
  bg.renderOrder = -1000;
  scene.add(bg);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.ShadowMaterial({ color: col('#6b4126'), opacity: 0.26 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // light: a warm key from the front left (shadows), a rim from behind right, a soft fill
  const key = new THREE.DirectionalLight(col('#fff0dc'), 2.4);
  key.castShadow = true;
  key.shadow.mapSize.set(level === 'low' ? 1024 : 2048, level === 'low' ? 1024 : 2048);
  key.shadow.radius = 5;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  const sc = key.shadow.camera;
  sc.left = -48;
  sc.right = 48;
  sc.top = 48;
  sc.bottom = -48;
  sc.near = 10;
  sc.far = 400;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(col('#ffd2a1'), 1.6);
  rim.position.set(60, 50, -80);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(col('#fff6ec'), col('#d9b896'), 0.5));
  onProgress(0.2);
  await nextFrame();

  // the burger, the box, the shake, the lineup
  const G = burgerGeometries();
  const M = burgerMaterials();
  onProgress(0.45);
  await nextFrame();
  const hero = makeBurger(G, M, { patties: 2, bacon: true, onion: true }, 3);
  scene.add(hero.group);
  await document.fonts.load("400 120px 'Anton'", 'BRAISE').catch(() => {});
  const logoTex = canvasTex(1024, 682, (g, w, h) => {
    g.fillStyle = '#1c1a19';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c4322a';
    g.lineWidth = 6;
    g.strokeRect(34, 34, w - 68, h - 68);
    // the flame
    g.fillStyle = '#e8572c';
    g.beginPath();
    const fx = w / 2, fy = h * 0.34;
    g.moveTo(fx, fy - 92);
    g.bezierCurveTo(fx + 70, fy - 30, fx + 64, fy + 46, fx, fy + 62);
    g.bezierCurveTo(fx - 64, fy + 46, fx - 70, fy - 6, fx - 26, fy - 40);
    g.bezierCurveTo(fx - 22, fy - 6, fx - 6, fy + 4, fx, fy - 12);
    g.bezierCurveTo(fx + 4, fy - 40, fx - 6, fy - 64, fx, fy - 92);
    g.fill();
    g.fillStyle = '#f6eadb';
    g.textAlign = 'center';
    g.font = "400 150px 'Anton', Impact, sans-serif";
    g.fillText('BRAISE', w / 2, h * 0.72);
    g.font = "500 30px 'JetBrains Mono', monospace";
    g.fillStyle = '#e8572c';
    g.fillText('BURGERS SMASHÉS · LYON', w / 2, h * 0.85);
  });
  const box = makeBox(logoTex);
  box.group.position.set(1.5, 0, 0);
  scene.add(box.group);
  const bandTex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#f4efe6';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#c4322a';
    g.fillRect(0, h * 0.42, w, h * 0.3);
    g.fillStyle = '#f6eadb';
    g.textAlign = 'center';
    g.font = "400 46px 'Anton', Impact, sans-serif";
    for (let i = 0; i < 2; i++) g.fillText('BRAISE', w * (0.25 + 0.5 * i), h * 0.66);
  }, {});
  const shake = makeShake(bandTex);
  scene.add(shake);
  const lineup = LINEUP.map((it, i) => {
    const b = makeBurger(G, M, it.opts, 11 + i * 5);
    b.group.position.set(LX - 4 + (i - 1.5) * 17, 0, 0);
    b.group.rotation.y = -0.35 + i * 0.06;
    b.group.scale.setScalar(0.92);
    scene.add(b.group);
    return { it, b };
  });
  onProgress(0.8);
  await nextFrame();

  // ------------------------------------------------------------------ per frame
  const tgt = new THREE.Vector3();
  let W = 1280, H = 800, curP = 0, stage = 'hero', curE = 0, lidA = 0;
  const heroBase = new THREE.Vector3();
  const spot = box.burgerSpot.clone().add(box.group.position);
  function placeCamera(p, pointer = { x: 0, y: 0 }) {
    const v = CH.map((f) => f(p));
    camera.position.set(v[0], v[1], v[2]);
    tgt.set(v[3], v[4], v[5]);
    // a breath of parallax with the pointer
    camera.position.x += pointer.x * 1.2;
    camera.position.y += pointer.y * 0.8;
    camera.lookAt(tgt);
    const aspect = W / H;
    const f = v[6];
    camera.fov = aspect < 1.6 ? Math.min(70, (2 * Math.atan(Math.tan((f * Math.PI) / 360) * (1.6 / aspect)) * 180) / Math.PI) : f;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }

  function update(state, dt, time) {
    const p = clamp(state.p);
    curP = p;
    placeCamera(p, state.pointer || { x: 0, y: 0 });
    // the burger: apart and back together, then into the box
    const e = sstep(PHASES.explode[0], PHASES.explode[1], p) * (1 - sstep(PHASES.assemble[0], PHASES.assemble[1], p));
    curE = e;
    hero.setExplode(e, time);
    const intoBox = sstep(PHASES.combo[0], PHASES.combo[0] + 0.05, p);
    heroBase.set(0, 0, 0).lerp(spot, intoBox);
    heroBase.y += 7 * Math.sin(Math.PI * intoBox) * (1 - intoBox * 0.2);
    hero.group.position.copy(heroBase);
    hero.group.scale.setScalar(1 - 0.1 * intoBox);
    // a slow turntable on the hero (stops once it sits in the box)
    const spin = 1 - intoBox;
    hero.group.rotation.y = spin * (0.25 * Math.sin(time * 0.35) + p * 3.2) + intoBox * 0.4;
    // the box: slides in under the burger, the lid closes, then it stays (the camera leaves for the lineup)
    const boxIn = sstep(PHASES.combo[0] - 0.02, PHASES.combo[0] + 0.035, p);
    box.group.position.set(1.5 + (1 - boxIn) * 0, -40 * (1 - boxIn), 0);
    box.group.visible = boxIn > 0.001;
    lidA = sstep(PHASES.close[0], PHASES.close[1], p);
    box.pivot.rotation.x = mix(-2.05, 0, easeOut3(lidA));
    // the shake: slides in from the right with the box
    const shakeIn = sstep(PHASES.combo[0] + 0.01, PHASES.combo[0] + 0.06, p);
    shake.position.set(25 + 30 * (1 - shakeIn), 0, -2);
    shake.visible = shakeIn > 0.001;
    // the lineup turns a little, slowly
    lineup.forEach((l, i) => {
      l.b.group.rotation.y = -0.35 + i * 0.06 + 0.15 * Math.sin(time * 0.3 + i);
    });
    // the key light follows the scene (its shadow camera centred on what is on screen)
    const cx = p < 0.74 ? 0 : LX;
    key.target.position.set(cx, 0, 0);
    key.position.set(cx - 70, 120, 90);
    stage = p < PHASES.explode[0] ? 'hero' : p < PHASES.assemble[1] ? 'stack' : p < PHASES.combo[0] ? 'burger' : p < PHASES.close[1] ? 'box' : 'menu';
  }

  function resize(w, h) {
    W = Math.max(1, w);
    H = Math.max(1, h);
    placeCamera(curP);
  }

  // screen anchors (CSS px): the labelled layers (their side edge at mid-height), the lineup's items
  const P = new THREE.Vector3(), Q = new THREE.Vector3(), right = new THREE.Vector3();
  const toScreen = (v) => {
    P.copy(v).project(camera);
    return { x: ((P.x + 1) / 2) * W, y: ((1 - P.y) / 2) * H, z: P.z };
  };
  function anchors() {
    camera.updateMatrixWorld();
    right.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    const labels = [];
    let side = 1;
    for (const L of hero.layers) {
      const text = LAYER_LABELS[L.id];
      if (!text) continue;
      L.g.updateWorldMatrix(true, false);
      Q.set(0, L.h / 2, 0).applyMatrix4(L.g.matrixWorld);
      const c = toScreen(Q);
      const edge = toScreen(Q.clone().addScaledVector(right, side * L.r * 1.02));
      labels.push({ id: L.id, text, side: side > 0 ? 'right' : 'left', x: edge.x, y: edge.y, cx: c.x, k: L.k || 0, visible: c.z < 1 });
      side = -side;
    }
    const menu = lineup.map((l) => {
      Q.set(0, 0, 9).applyMatrix4(l.b.group.matrixWorld);
      const s = toScreen(Q);
      return { id: l.it.id, x: s.x, y: s.y, visible: s.z < 1 };
    });
    return { labels, menu };
  }

  async function warmup() {
    const keep = curP;
    renderer.compile(scene, camera);
    for (const p of [0, 0.2, 0.5, 0.66, 0.8]) {
      update({ p, pointer: { x: 0, y: 0 } }, 1, 0);
      renderer.render(scene, camera);
      await new Promise((r) => setTimeout(r, 0));
    }
    update({ p: keep, pointer: { x: 0, y: 0 } }, 1, 0);
  }

  return {
    camera,
    scene,
    update,
    render() {
      renderer.render(scene, camera);
    },
    resize,
    warmup,
    setQuality(lv) {
      level = lv;
    },
    stats() {
      const i = renderer.info;
      return { calls: i.render.calls, triangles: i.render.triangles, textures: i.memory.textures, geometries: i.memory.geometries, programs: i.programs ? i.programs.length : 0, stage, level, e: +curE.toFixed(3), lid: +lidA.toFixed(3) };
    },
    anchors,
    info() {
      return { stage };
    },
  };
}
