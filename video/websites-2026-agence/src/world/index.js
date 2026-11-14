// POMONE world: a saturated blue sky with halftone clouds; a polished golden pear on a white marble
// pedestal; a pear tree in a marble urn that grows with the scroll (branches, leaves, then golden
// pears); two print modes — the pear as a halftone print, and a sepia engraving (paper, hatching,
// a wooden scaffold that lowers the pear onto its pedestal, then the plan from above). One camera on
// monotone splines of p. Units: metres, Y up. The pear's pedestal at the origin, the tree at x = -30.
// Contract (main.js): createWorld({ renderer, quality, onProgress }) → { camera, update(state, dt, time),
// render(), resize(w, h, dpr), warmup(), setQuality(level), stats(), anchors(), info() }.
import * as THREE from 'three';
import { PHASES, within } from '../story.js';

export const rendererOptions = { antialias: true };

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (t) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
const sstep = (a, b, x) => smooth((x - a) / (b - a));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const col = (h) => new THREE.Color(h);
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
let ANISO = 4;
function canvasTex(w, h, draw, { srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ANISO;
  return t;
}

const TX = -30; // the tree's urn
const PED_H = 1.86; // the pedestal's top
const GLSL_NOISE = /* glsl */ `
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm2(vec2 p) { return vn(p) * 0.55 + vn(p * 2.03 + 7.1) * 0.3 + vn(p * 4.1 - 3.7) * 0.15; }
`;

// ------------------------------------------------------------------ the pear
function pearGeometry(scale = 1, seg = 72) {
  const prof = [[0, 0], [0.3, 0.015], [0.56, 0.12], [0.74, 0.34], [0.8, 0.6], [0.74, 0.86], [0.58, 1.08], [0.43, 1.28], [0.35, 1.47], [0.31, 1.64], [0.25, 1.81], [0.13, 1.94], [0.0, 1.99]];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r * scale, y * scale)), seg);
  // a slight lean and a soft asymmetry (a real pear is never round)
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = y / (2 * scale);
    p.setX(i, x * (1 + 0.04 * Math.sin(Math.atan2(z, x) * 2 + 0.6)) + 0.07 * scale * t * t);
    p.setZ(i, z * (1 - 0.03 * t));
  }
  g.computeVertexNormals();
  return g;
}
function makePear(gold, goldDark) {
  const group = new THREE.Group();
  group.name = 'pear';
  const body = new THREE.Mesh(pearGeometry(1.2), gold);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.1, 2.3, 0), new THREE.Vector3(0.14, 2.6, 0.02), new THREE.Vector3(0.24, 2.86, 0.04), new THREE.Vector3(0.38, 3.02, 0.05)]);
  const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.055, 10, false), goldDark);
  // the leaf: a bent blade with a midrib fold, hanging off the stem
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.22, 0.14, 0.42, 0.36, 0.92, 0.0);
  s.bezierCurveTo(0.42, -0.36, 0.22, -0.14, 0, 0);
  const lg = new THREE.ShapeGeometry(s, 24);
  const lp = lg.attributes.position;
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i), y = lp.getY(i);
    lp.setZ(i, Math.abs(y) * 0.35 - x * x * 0.25);
  }
  lg.computeVertexNormals();
  const leaf = new THREE.Mesh(lg, goldDark);
  leaf.position.set(0.3, 2.95, 0.04);
  leaf.rotation.set(0.3, -0.5, 0.55);
  group.add(body, stem, leaf);
  return { group, parts: [body, stem, leaf] };
}

// ------------------------------------------------------------------ the pedestal and the urn
function marbleTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#f3f1ec';
    g.fillRect(0, 0, w, h);
    const r = rng(17);
    for (let i = 0; i < 14; i++) {
      g.strokeStyle = `rgba(120,115,112,${0.25 + r() * 0.3})`;
      g.lineWidth = 0.6 + r() * 1.6;
      g.beginPath();
      let x = r() * w, y = r() * h;
      g.moveTo(x, y);
      for (let k = 0; k < 18; k++) {
        x += (r() - 0.3) * 40;
        y += (r() - 0.5) * 30;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  });
}
function makePedestal(marble) {
  const g = new THREE.Group();
  g.name = 'pedestal';
  const tiers = [[2.5, 0.3, 0.15], [2.25, 0.12, 0.36], [1.95, 1.1, 0.97], [2.18, 0.12, 1.58], [2.36, 0.22, 1.75]];
  for (const [w, h, y] of tiers) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), marble);
    m.position.y = y;
    g.add(m);
  }
  return g;
}
function makeUrn(marble) {
  const prof = [[0, 0], [0.9, 0], [0.9, 0.18], [0.55, 0.3], [0.42, 0.6], [0.7, 0.85], [1.15, 1.25], [1.3, 1.6], [1.22, 1.68], [1.15, 1.62], [0, 1.6]];
  const vase = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 56), marble);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 2.0), marble);
  plinth.position.y = -0.55;
  const soil = new THREE.Mesh(new THREE.CircleGeometry(1.12, 40), new THREE.MeshStandardMaterial({ color: col('#5a4632'), roughness: 1 }));
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = 1.55;
  const g = new THREE.Group();
  g.add(vase, plinth, soil);
  g.position.set(TX, 1.1, 0);
  return g;
}

// ------------------------------------------------------------------ the tree (grows with g 0..1)
function makeTree(bark, leafM, pearM) {
  const R = rng(5);
  const branches = [], leaves = [], pears = [];
  const up = new THREE.Vector3(0, 1, 0);
  function grow(start, dir, len, rad, level, birth) {
    const dur = level === 0 ? 0.22 : 0.16;
    branches.push({ start: start.clone(), dir: dir.clone().normalize(), len, rad, level, birth, dur });
    const end = start.clone().addScaledVector(dir, len);
    if (level >= 2) {
      const n = 3 + Math.floor(R() * 3);
      for (let i = 0; i < n; i++) {
        const t = 0.35 + 0.65 * R();
        leaves.push({ at: start.clone().addScaledVector(dir, len * t), dir: dir.clone(), rot: R() * 6.28, tilt: 0.4 + R() * 0.9, size: 0.32 + R() * 0.16, birth: birth + dur * (0.5 + 0.5 * t) + 0.02 });
      }
    }
    if (level >= 3 && R() < 0.75) pears.push({ at: end.clone(), size: 0.9 + R() * 0.35, birth: 0.72 + R() * 0.2, sway: R() * 6.28 });
    if (level >= 4) return;
    const kids = level === 0 ? 3 : 2 + (R() < 0.5 ? 1 : 0);
    for (let k = 0; k < kids; k++) {
      const yaw = (k / kids) * Math.PI * 2 + R() * 0.8 + level;
      const spread = level === 0 ? 0.75 : 0.55 + R() * 0.3;
      const side = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
      const d = dir.clone().multiplyScalar(Math.cos(spread)).addScaledVector(side, Math.sin(spread)).addScaledVector(up, 0.15).normalize();
      grow(end, d, len * (0.68 + R() * 0.12), rad * 0.62, level + 1, birth + dur * 0.85);
    }
  }
  grow(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.05, 1, 0), 2.0, 0.17, 0, 0);
  // normalise the births to 0..1
  const last = Math.max(...branches.map((b) => b.birth + b.dur), ...leaves.map((l) => l.birth + 0.08));
  for (const b of branches) {
    b.birth /= last;
    b.dur /= last;
  }
  for (const l of leaves) l.birth /= last;
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 7, 1);
  cyl.translate(0, 0.5, 0);
  const B = new THREE.InstancedMesh(cyl, bark, branches.length);
  B.frustumCulled = false;
  const leafG = new THREE.PlaneGeometry(1, 0.45);
  leafG.translate(0.5, 0, 0);
  const L = new THREE.InstancedMesh(leafG, leafM, leaves.length);
  L.frustumCulled = false;
  const P = new THREE.InstancedMesh(pearGeometry(0.11, 20), pearM, pears.length);
  P.frustumCulled = false;
  const group = new THREE.Group();
  group.add(B, L, P);
  group.position.set(TX, 2.7, 0);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3(), e = new THREE.Euler();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  let lastG = -1;
  function set(g, time) {
    if (Math.abs(g - lastG) > 1e-4) {
      branches.forEach((b, i) => {
        const f = clamp((g - b.birth) / b.dur);
        if (f <= 0) return B.setMatrixAt(i, zero);
        q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.dir);
        const r = b.rad * (0.35 + 0.65 * Math.sqrt(f)) * (0.6 + 0.4 * g);
        s.set(r, b.len * f, r);
        m4.compose(b.start, q, s);
        B.setMatrixAt(i, m4);
      });
      B.instanceMatrix.needsUpdate = true;
      lastG = g;
    }
    leaves.forEach((l, i) => {
      const f = clamp((g - l.birth) / 0.06);
      if (f <= 0) return L.setMatrixAt(i, zero);
      e.set(l.tilt + 0.06 * Math.sin(time * 1.3 + i), l.rot, 0.25 * Math.sin(time * 0.9 + i * 0.7));
      q.setFromEuler(e);
      s.setScalar(l.size * f);
      m4.compose(l.at, q, s);
      L.setMatrixAt(i, m4);
    });
    L.instanceMatrix.needsUpdate = true;
    pears.forEach((pe, i) => {
      const f = clamp((g - pe.birth) / 0.08);
      if (f <= 0) return P.setMatrixAt(i, zero);
      pos.copy(pe.at).add(new THREE.Vector3(0.04 * Math.sin(time + pe.sway), -0.26 * f, 0));
      q.setFromEuler(e.set(Math.PI + 0.1 * Math.sin(time * 0.8 + pe.sway), pe.sway, 0.08));
      s.setScalar(pe.size * f);
      m4.compose(pos, q, s);
      P.setMatrixAt(i, m4);
    });
    P.instanceMatrix.needsUpdate = true;
  }
  set(1, 0);
  return { group, set };
}

// ------------------------------------------------------------------ print modes (shaders)
const PRINT_VERT = /* glsl */ `
varying vec3 vN; varying vec3 vV; varying float vY;
uniform float uH;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = -mv.xyz;
  vY = position.y / uH;
  gl_Position = projectionMatrix * mv;
}`;
// the pear as a halftone print: grey paper, navy dots growing in the shade, gold at the foot
function halftoneMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uH: { value: 2.4 }, uCell: { value: 7 }, uMix: { value: 1 }, uInk: { value: col('#1b2a66') }, uBase: { value: col('#dfe3ea') }, uGold: { value: col('#e2b44c') } },
    vertexShader: PRINT_VERT,
    fragmentShader: /* glsl */ `
      uniform float uCell; uniform float uMix; uniform vec3 uInk; uniform vec3 uBase; uniform vec3 uGold;
      varying vec3 vN; varying vec3 vV; varying float vY;
      void main() {
        vec3 N = normalize(vN), V = normalize(vV), L = normalize(vec3(-0.5, 0.75, 0.6));
        float l = clamp(dot(N, L) * 0.62 + 0.42, 0.0, 1.0);
        // the plain gold it comes from (uMix 0)
        vec3 H = normalize(L + V);
        vec3 gold = uGold * (0.35 + 0.75 * l) + vec3(1.0, 0.92, 0.7) * pow(max(dot(N, H), 0.0), 40.0) * 0.8;
        // dots on a 45° grid, bigger where darker
        vec2 q = gl_FragCoord.xy / uCell;
        q = vec2(q.x + q.y, q.x - q.y) * 0.7071;
        vec2 f = fract(q) - 0.5;
        float r = sqrt(clamp(1.0 - l, 0.0, 1.0)) * 0.66;
        float d = 1.0 - smoothstep(r - 0.07, r + 0.05, length(f));
        vec3 base = mix(uBase, uGold, smoothstep(0.32, 0.04, vY));
        vec3 print = mix(base, uInk, d * (1.0 - 0.6 * smoothstep(0.3, 0.05, vY)));
        gl_FragColor = vec4(mix(gold, print, uMix), 1.0);
        #include <colorspace_fragment>
      }`,
  });
}
// the sepia engraving: hatching that thickens in the shade, cross-hatching in the dark, an ink rim
function engravingMaterial(fill) {
  return new THREE.ShaderMaterial({
    uniforms: { uH: { value: 1 }, uPx: { value: 4.5 }, uInk: { value: col('#4a3522') }, uFill: { value: col(fill) } },
    vertexShader: PRINT_VERT,
    fragmentShader: /* glsl */ `
      uniform float uPx; uniform vec3 uInk; uniform vec3 uFill;
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec3 N = normalize(vN), V = normalize(vV), L = normalize(vec3(-0.55, 0.7, 0.45));
        float l = clamp(dot(N, L) * 0.6 + 0.45, 0.0, 1.0);
        vec2 q = gl_FragCoord.xy / uPx;
        float h1 = abs(fract((q.x + q.y) * 0.5) - 0.5) * 2.0;
        float h2 = abs(fract((q.x - q.y) * 0.5) - 0.5) * 2.0;
        float t1 = clamp((0.95 - l) * 1.25, 0.0, 1.0) * 0.55;
        float t2 = clamp((0.62 - l) * 1.7, 0.0, 1.0) * 0.5;
        float ink = max(1.0 - smoothstep(t1, t1 + 0.14, h1), 1.0 - smoothstep(t2, t2 + 0.14, h2));
        float rim = 1.0 - smoothstep(0.06, 0.3, abs(dot(N, V)));
        ink = max(ink * 0.8, rim * 0.95);
        gl_FragColor = vec4(mix(uFill, uInk, ink), 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.DoubleSide,
  });
}
// a halftone cloud: a soft white core, dotted edges
function cloudMaterial(seed) {
  return new THREE.ShaderMaterial({
    uniforms: { uCell: { value: 6 }, uOpacity: { value: 1 }, uSeed: { value: new THREE.Vector2(seed * 3.7, seed * 1.9) }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */ `
      uniform float uCell; uniform float uOpacity; uniform vec2 uSeed; uniform float uTime;
      varying vec2 vUv;
      ${GLSL_NOISE}
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float m = 1.0 - smoothstep(0.2, 1.0, length(p * vec2(1.0, 1.9) + vec2(0.0, 0.25)));
        float n = fbm2(vUv * vec2(4.0, 2.6) + uSeed + vec2(uTime * 0.012, 0.0));
        float dens = clamp(m * (0.35 + 1.25 * n) - 0.18, 0.0, 1.0);
        vec2 q = gl_FragCoord.xy / uCell;
        vec2 f = fract(q) - 0.5;
        float r = sqrt(dens) * 0.62;
        float dotm = 1.0 - smoothstep(r - 0.08, r + 0.03, length(f));
        float a = max(dotm, smoothstep(0.62, 0.92, dens)) * uOpacity;
        if (a < 0.02) discard;
        gl_FragColor = vec4(vec3(1.0), a);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
  });
}

// ------------------------------------------------------------------ camera keys
function monotone(points) {
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
const KEYS = [
  // p, camera xyz, target xyz, fov
  [0.0, 0.9, 3.0, 10.5, -1.7, 3.1, 0, 34],
  [0.04, 0.9, 3.1, 10.2, -1.7, 3.2, 0, 34],
  [0.1, 1.6, 4.3, 5.4, -0.3, 4.3, 0, 34],
  [0.16, 0.9, 4.95, 2.3, 0.15, 4.75, 0, 34],
  [0.2, TX + 6.5, 3.4, 12.5, TX - 1.2, 4.6, 0, 36],
  [0.26, TX + 5.4, 2.8, 13.0, TX - 1.4, 5.0, 0, 36],
  [0.335, TX + 6.4, 3.6, 13.8, TX - 1.8, 5.4, 0, 36],
  [0.36, 1.8, 3.4, 7.6, -1.1, 3.2, 0, 34],
  [0.47, 2.8, 3.7, 7.0, -1.0, 3.3, 0, 34],
  [0.49, 7.2, 7.4, 9.0, -0.4, 3.0, 0, 36],
  [0.58, 6.0, 8.2, 7.6, -0.6, 2.6, 0, 36],
  [0.615, 3.4, 14.0, 1.1, 3.4, 0.0, 0, 36],
  [0.655, 3.4, 14.0, 1.0, 3.4, 0.0, 0, 36],
  [0.685, TX + 5.8, 3.4, 11.5, TX - 2.4, 5.0, 0, 36],
  [0.72, TX + 5.4, 3.2, 11.0, TX - 2.4, 5.0, 0, 36],
  [0.78, TX + 2.6, 2.4, 3.6, TX + 0.6, 9.5, -1.6, 50],
  [0.88, TX + 2.6, 2.4, 3.4, TX + 0.6, 9.6, -1.6, 50],
  [1.0, TX + 2.6, 2.4, 3.4, TX + 0.6, 9.6, -1.6, 50],
];
const CH = [];
for (let c = 1; c <= 7; c++) CH.push(monotone(KEYS.map((k) => [k[0], k[c]])));

export async function createWorld({ renderer, quality = 'high', onProgress = () => {} }) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  let level = quality, dpr = 1;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 16 / 10, 0.1, 1000);

  // the backdrop: the saturated blue sky, or the engraving's paper
  const bgU = { uTop: { value: col('#0e3cc0') }, uBot: { value: col('#4f8eea') }, uPaper: { value: 0 }, uP0: { value: col('#f1e7d3') }, uP1: { value: col('#dcc8a6') } };
  const bg = new THREE.Mesh(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)),
    new THREE.ShaderMaterial({
      uniforms: bgU,
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
      fragmentShader: `uniform vec3 uTop; uniform vec3 uBot; uniform float uPaper; uniform vec3 uP0; uniform vec3 uP1; varying vec2 vP;
        ${GLSL_NOISE}
        void main(){
          float t = clamp(vP.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 sky = mix(uBot, uTop, smoothstep(0.0, 1.0, t));
          vec2 uv = vP * 0.5 + 0.5;
          float fib = fbm2(uv * vec2(140.0, 90.0)) * 0.05 + fbm2(uv * 6.0) * 0.08;
          vec3 paper = mix(uP0, uP1, smoothstep(0.35, 1.25, length(vP * vec2(0.85, 1.0)))) - fib;
          gl_FragColor = vec4(mix(sky, paper, uPaper), 1.0);
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

  // the environment the gold reflects: the blue sky, a pale horizon, a warm ground, one sun
  const envScene = new THREE.Scene();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vD; void main(){ float y = vD.y;
      vec3 c = y > 0.0 ? mix(vec3(1.0, 0.94, 0.84), vec3(0.36, 0.52, 0.92), pow(y, 0.7)) : mix(vec3(1.0, 0.92, 0.8), vec3(0.62, 0.5, 0.36), pow(-y, 0.5));
      gl_FragColor = vec4(c * 1.2, 1.0); }`,
  }));
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(12, 11, 9) }));
  sunDisc.position.set(-25, 30, 20);
  const soft = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3), side: THREE.DoubleSide }));
  soft.position.set(30, 10, 25);
  soft.lookAt(0, 0, 0);
  envScene.add(dome, sunDisc, soft);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(envScene, 0.02).texture;
  scene.environment = env;
  onProgress(0.25);
  await nextFrame();

  // materials
  const gold = new THREE.MeshPhysicalMaterial({ color: col('#ffc552'), metalness: 1, roughness: 0.13, clearcoat: 0.3, envMapIntensity: 1.7 });
  const goldDark = new THREE.MeshPhysicalMaterial({ color: col('#e0a83e'), metalness: 1, roughness: 0.24, envMapIntensity: 1.5, side: THREE.DoubleSide });
  const marble = new THREE.MeshPhysicalMaterial({ map: marbleTex(), roughness: 0.32, clearcoat: 0.3, envMapIntensity: 0.6 });
  const bark = new THREE.MeshStandardMaterial({ color: col('#6a5038'), roughness: 0.95 });
  const leafTex = canvasTex(256, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#5f8a2c';
    g.beginPath();
    g.moveTo(0, h / 2);
    g.bezierCurveTo(w * 0.3, h * 0.02, w * 0.75, h * 0.1, w, h / 2);
    g.bezierCurveTo(w * 0.75, h * 0.9, w * 0.3, h * 0.98, 0, h / 2);
    g.fill();
    g.strokeStyle = 'rgba(210,230,150,0.55)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(4, h / 2);
    g.lineTo(w - 6, h / 2);
    g.stroke();
  });
  const leafM = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 });
  const pearM = new THREE.MeshPhysicalMaterial({ color: col('#d7b443'), metalness: 0.55, roughness: 0.3, clearcoat: 0.5 });

  // the golden pear on its pedestal
  const statue = new THREE.Group();
  const pedestal = makePedestal(marble);
  const pear = makePear(gold, goldDark);
  pear.group.position.y = PED_H;
  statue.add(pedestal, pear.group);
  scene.add(statue);
  // the orchard: the tree in its urn
  scene.add(makeUrn(marble));
  const tree = makeTree(bark, leafM, pearM);
  scene.add(tree.group);
  // the scaffold of the engraving (beams, a top cross-beam, the ropes to the stem)
  const scaffold = new THREE.Group();
  {
    const wood = new THREE.MeshStandardMaterial({ color: col('#8a6a48') });
    const beam = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood);
      m.position.set(x, y, z);
      scaffold.add(m);
    };
    for (const sx of [-1.7, 1.7]) for (const sz of [-1.7, 1.7]) beam(0.14, 7.2, 0.14, sx, 3.6, sz);
    for (const y of [2.2, 4.4, 6.9]) {
      beam(3.54, 0.12, 0.12, 0, y, 1.7);
      beam(3.54, 0.12, 0.12, 0, y, -1.7);
      beam(0.12, 0.12, 3.54, 1.7, y, 0);
      beam(0.12, 0.12, 3.54, -1.7, y, 0);
    }
    beam(0.2, 0.2, 3.9, 0, 7.1, 0);
    for (let i = 0; i < 4; i++) beam(1.2, 0.06, 0.4, -1.1 + i * 0.75, 4.47, 1.3 - i * 0.6); // planks
  }
  const ropes = [];
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), new THREE.MeshStandardMaterial({ color: col('#7a5a3a') }));
    r.geometry.translate(0, -0.5, 0);
    scaffold.add(r);
    ropes.push(r);
  }
  scene.add(scaffold);
  // the clouds (halftone billboards) round both places
  const clouds = [];
  const CL = [[-7, 7.5, -14, 7, 3.2], [6, 9, -18, 9, 3.8], [-2, 2.2, -22, 10, 4], [9, 4, -10, 5, 2.4], [TX - 6, 10.5, -16, 9, 3.6], [TX + 7, 8, -20, 10, 4], [TX + 1, 13, -8, 7, 3], [TX - 4, 5.5, -26, 12, 4.5], [TX + 3, 16, -4, 6, 2.6]];
  CL.forEach(([x, y, z, w, h], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), cloudMaterial(i + 1));
    m.position.set(x, y, z);
    m.scale.set(w, h, 1);
    m.renderOrder = 1;
    scene.add(m);
    clouds.push({ m, x0: x, sp: 0.08 + (i % 3) * 0.04 });
  });
  scene.add(new THREE.HemisphereLight(col('#cfe0ff'), col('#a08a6a'), 0.9));
  const sun = new THREE.DirectionalLight(col('#fff2dc'), 2.2);
  sun.position.set(-8, 12, 9);
  scene.add(sun);
  onProgress(0.7);
  await nextFrame();

  // the print-mode materials (the meshes swap to them in their windows)
  const half = halftoneMaterial();
  const engraveGold = engravingMaterial('#d9b464');
  const engraveStone = engravingMaterial('#efe4cf');
  const engraveWood = engravingMaterial('#d7c09a');
  const pearBodies = pear.parts;
  const normalMats = new Map();
  const engraveTargets = [];
  pear.group.traverse((o) => o.isMesh && engraveTargets.push([o, engraveGold]));
  pedestal.traverse((o) => o.isMesh && engraveTargets.push([o, engraveStone]));
  scaffold.traverse((o) => o.isMesh && engraveTargets.push([o, engraveWood]));
  for (const [o] of engraveTargets) normalMats.set(o, o.material);
  ropes.forEach((r) => normalMats.set(r, engraveWood));
  let mode = 'normal';
  function setMode(m) {
    if (m === mode) return;
    mode = m;
    for (const [o, em] of engraveTargets) o.material = m === 'engraving' ? em : normalMats.get(o);
    if (m === 'halftone') pearBodies[0].material = half;
  }

  // ------------------------------------------------------------------ per frame
  let W = 1280, H = 800, curP = 0, stage = 'idee';
  const tgt = new THREE.Vector3();
  function placeCamera(p, pointer = { x: 0, y: 0 }) {
    const v = CH.map((f) => f(p));
    camera.position.set(v[0] + pointer.x * 0.12, v[1] + pointer.y * 0.08, v[2]);
    tgt.set(v[3], v[4], v[5]);
    camera.lookAt(tgt);
    const aspect = W / H;
    camera.fov = aspect < 1.6 ? Math.min(75, (2 * Math.atan(Math.tan((v[6] * Math.PI) / 360) * (1.6 / aspect)) * 180) / Math.PI) : v[6];
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }
  function update(state, dt, time) {
    const p = clamp(state.p);
    curP = p;
    placeCamera(p, state.pointer || { x: 0, y: 0 });
    // modes
    const eng = p >= PHASES.engraving[0] && p < PHASES.engraving[1];
    const ht = p >= PHASES.halftone[0] + 0.005 && p < PHASES.halftone[1];
    setMode(eng ? 'engraving' : ht ? 'halftone' : 'normal');
    half.uniforms.uMix.value = sstep(PHASES.halftone[0] + 0.01, PHASES.halftone[0] + 0.05, p) * (1 - sstep(PHASES.halftone[1] - 0.025, PHASES.halftone[1], p));
    half.uniforms.uCell.value = 7 * dpr;
    for (const m of [engraveGold, engraveStone, engraveWood]) m.uniforms.uPx.value = 4.5 * dpr;
    bgU.uPaper.value = sstep(PHASES.engraving[0] - 0.006, PHASES.engraving[0] + 0.004, p) * (1 - sstep(PHASES.engraving[1] - 0.004, PHASES.engraving[1] + 0.006, p));
    // the pear: a slow turn; hoisted above the pedestal in the engraving, lowered onto it
    const lift = eng ? 2.4 * (1 - smooth(within(p, PHASES.hoist))) : 0;
    pear.group.position.y = PED_H + lift;
    pear.group.rotation.y = 0.3 * Math.sin(time * 0.25) + p * 2.2;
    scaffold.visible = eng && p < PHASES.plan[0];
    ropes.forEach((r, i) => {
      const top = new THREE.Vector3(0, 7.0, 0);
      const end = new THREE.Vector3((i - 1) * 0.25, PED_H + lift + 2.7, (i === 1 ? 0.15 : -0.05));
      r.position.copy(top);
      const d = end.clone().sub(top);
      r.scale.set(1, d.length(), 1);
      r.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d.normalize());
      r.visible = eng && p < PHASES.hoist[1] + 0.01;
    });
    // the tree grows; it stays grown
    const g = p < PHASES.grow[0] ? 0.02 : smooth(within(p, PHASES.grow));
    tree.set(g, time);
    // the clouds drift; they keep their dots the size of the screen grid
    for (const c of clouds) {
      c.m.visible = !eng;
      c.m.position.x = c.x0 + Math.sin(time * 0.05 + c.x0) * 1.5 + time * c.sp * 0.1;
      c.m.quaternion.copy(camera.quaternion);
      c.m.material.uniforms.uTime.value = time;
      c.m.material.uniforms.uCell.value = 6 * dpr;
    }
    stage = p < PHASES.travel[0] ? 'idee' : p < PHASES.halftone[0] ? 'croissance' : p < PHASES.engraving[0] ? 'toit' : p < PHASES.canopy[0] ? 'modele' : 'questions';
  }
  function resize(w, h, d) {
    W = Math.max(1, w);
    H = Math.max(1, h);
    dpr = d || 1;
    placeCamera(curP);
  }
  async function warmup() {
    const keep = curP;
    renderer.compile(scene, camera);
    for (const p of [0, 0.25, 0.4, 0.55, 0.63, 0.8]) {
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
      return { calls: i.render.calls, triangles: i.render.triangles, textures: i.memory.textures, geometries: i.memory.geometries, programs: i.programs ? i.programs.length : 0, stage, level, mode };
    },
    anchors() {
      return {};
    },
    info() {
      return { stage };
    },
  };
}
