// SIBYLLE world: seven small sets drawn in ink (ink.js), one shown at a time, each with its own
// camera track over its share of p; a cut (strokes, a red flood, paper bands, speed lines) hides
// every change of set. The comptoir: a hand takes a coin from a red wooden counter and a red
// liqueur spills. The oculus: a sibyl's silhouette before a red moon, framed by a round window. The
// temple: a red hall of columns, a robed figure walking to three small bottles on the altar. The
// fioles: the three bottles on a marble ledge, one to choose. Verser: the hand pours the chosen one
// into a martini glass. The vision: broken columns falling through red rain. The fronton: the
// temple front, the figure in the chosen colour.
// Contract (main.js): createWorld({ renderer, quality, onProgress }) → { camera, update(state, dt,
// time), render(), resize(w, h, dpr), warmup(), setQuality(level), stats(), anchors(), info() }.
import * as THREE from 'three';
import { SETS, CUTS, within } from '../story.js';
import { IA } from '../interact.js';
import { PAL, FLAVOR_HEX, C, G, NOISE, inkMaterial, outlineMaterial, outline, planarShadows, shadowMaterial, strokesLayer, rainLayer, cutLayer } from './ink.js';
import * as P from './props.js';

export const rendererOptions = { antialias: true };

const { clamp, mix, smooth, sstep, rng } = P;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

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
// keys [u, camera xyz, target xyz, fov] over the set's own progress u
function track(keys) {
  const ch = [];
  for (let c = 1; c <= 7; c++) ch.push(monotone(keys.map((k) => [k[0], k[c]])));
  return (u) => ch.map((f) => f(u));
}

// the counter: red planks, black grain drawn like a woodcut
const WOOD_FRAG = /* glsl */ `
uniform vec3 uRed;
uniform vec3 uInkC;
varying vec3 vW;
${NOISE}
void main() {
  vec2 p = vW.xz;
  float pw = 1.45;
  float zi = floor(p.y / pw);
  float zf = fract(p.y / pw);
  float off = h11(zi * 1.7 + 2.0) * 10.0;
  float aaS = fwidth(p.y / pw) * 1.5;
  float seam = 1.0 - smoothstep(0.012, 0.012 + aaS, min(zf, 1.0 - zf));
  float w = fbm(vec2(p.x * 0.16 + off, p.y * 0.7)) * 2.4 + fbm(vec2(p.x * 0.05 - off, zi)) * 3.0;
  float c = p.y * 4.6 + w * 1.6 + off;
  float g = abs(fract(c) - 0.5) * 2.0;
  float lw = 0.03 + 0.1 * pow(vn(vec2(p.x * 0.45 + off, floor(c) * 1.3)), 2.0);
  float aa = fwidth(c) * 1.5;
  float grain = 1.0 - smoothstep(lw - aa, lw + aa, g);
  grain *= step(0.42, vn(vec2(p.x * 0.55 + off * 3.0, floor(c) * 2.1 + zi)));
  // knots: small rings
  vec2 kc = vec2(floor(p.x / 3.3) * 3.3 + 1.6 + h11(zi + 9.0) * 1.2, (zi + 0.5) * pw);
  float kd = length((p - kc) * vec2(0.5, 1.6));
  float ring = abs(fract(kd * 3.0) - 0.5) * 2.0;
  float knot = step(h11(zi * 3.1 + floor(p.x / 3.3)), 0.35) * (1.0 - smoothstep(0.1, 0.1 + fwidth(kd * 3.0) * 1.5, ring)) * step(kd, 0.55);
  float ink = max(max(seam, grain), knot);
  gl_FragColor = vec4(mix(uRed, uInkC, ink), 1.0);
  #include <colorspace_fragment>
}`;
// the spilt liqueur: a glossy red tide with a black rim and white glints
const SPILL_FRAG = /* glsl */ `
uniform vec3 uCol;
uniform vec3 uInkC;
uniform vec3 uHi;
uniform float uK;
uniform vec2 uO;
uniform float uTime;
varying vec3 vW;
${NOISE}
void main() {
  if (uK <= 0.001) discard;
  vec2 p = vW.xz - uO;
  // the tide runs mostly towards the viewer and the left
  vec2 q = p * vec2(0.85, 0.7) - vec2(-0.6, 0.9) * uK;
  float r = length(q);
  vec2 dir = q / max(r, 1e-4);
  float lobes = fbm(dir * 1.3 + vec2(3.0, uK * 0.8));
  float R = (uK * uK * 4.2 + uK * 0.7) * (0.45 + 1.1 * lobes);
  float f = r - R + (fbm(p * 0.9 + uTime * 0.03) - 0.5) * 0.9 * uK;
  float aa = fwidth(f) * 1.5;
  if (f > aa) discard;
  float rim = smoothstep(-0.11 - aa, -0.06, f);
  vec3 col = mix(uCol, uInkC, rim);
  float band = smoothstep(-0.24, -0.19, f) * (1.0 - smoothstep(-0.16, -0.12, f));
  float gl = band * step(0.56, fbm(p * 1.4 + vec2(4.0, 1.0)));
  col = mix(col, uHi, gl);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;
const WORLD_VERT = /* glsl */ `
varying vec3 vW;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
// the hall's floor: red tiles in black lines
const FLOOR_FRAG = /* glsl */ `
uniform vec3 uRed;
uniform vec3 uInkC;
varying vec3 vW;
void main() {
  vec2 p = vW.xz / vec2(1.5, 1.5);
  vec2 f = abs(fract(p) - 0.5) * 2.0;
  vec2 aa = fwidth(p) * 2.0;
  float lx = 1.0 - smoothstep(0.955 - aa.x, 0.955, f.x);
  float lz = 1.0 - smoothstep(0.955 - aa.y, 0.955, f.y);
  float line = 1.0 - lx * lz;
  line *= 1.0 - smoothstep(0.35, 0.8, max(aa.x, aa.y));
  // far away the floor sinks into the dark
  float far = smoothstep(-26.0, -44.0, vW.z);
  gl_FragColor = vec4(mix(mix(uRed, uInkC, line), uInkC, far), 1.0);
  #include <colorspace_fragment>
}`;

// the liqueur's stream: a parabola from the bottle's mouth to the surface, bent in the shader
const STREAM_VERT = /* glsl */ `
uniform vec3 uP0;
uniform vec3 uV0;
uniform float uGr;
uniform float uT0;
uniform float uT1;
uniform float uR;
uniform float uOut;
varying vec3 vN;
varying vec3 vV;
void main() {
  float s = position.y;
  float t = mix(uT0, uT1, s);
  vec3 c = uP0 + uV0 * t + vec3(0.0, -0.5 * uGr * t * t, 0.0);
  vec3 vel = uV0 + vec3(0.0, -uGr * t, 0.0);
  vec3 T = normalize(vel);
  vec3 B = normalize(cross(T, vec3(0.0, 0.0, 1.0)));
  vec3 Nn = cross(B, T);
  float r = uR * mix(1.0, 0.72, s) + uOut;
  vec3 n = B * position.x + Nn * position.z;
  vec3 p = c + n * r;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  vV = mv.xyz;
  vN = normalize((viewMatrix * vec4(n, 0.0)).xyz);
  gl_Position = projectionMatrix * mv;
}`;
const STREAM_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uInkC;
uniform vec3 uHi;
uniform vec3 uL;
uniform float uOut;
varying vec3 vN;
varying vec3 vV;
void main() {
  if (uOut > 0.0) { gl_FragColor = vec4(uInkC, 1.0);
    #include <colorspace_fragment>
    return; }
  vec3 N = normalize(vN);
  vec3 V = normalize(-vV);
  float ed = abs(dot(N, V));
  vec3 col = uColor;
  col = mix(col, uHi, smoothstep(0.55, 0.62, dot(N, normalize(uL + V))));
  col = mix(col, uInkC, 1.0 - smoothstep(0.18, 0.3, ed));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export async function createWorld({ renderer, quality = 'high', onProgress = () => {} }) {
  let level = quality;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // the labels and the coin are drawn on canvases with the page's own fonts
  if (document.fonts && document.fonts.load) {
    try {
      await Promise.all([document.fonts.load("400 100px 'Yellowtail'", 'Sibylle'), document.fonts.load("700 40px 'Archivo'", 'N°3 SONGE')]);
    } catch (e) {
      /* the system's fonts then */
    }
  }
  onProgress(0.1);
  const camera = new THREE.PerspectiveCamera(36, 16 / 10, 0.05, 400);
  const OUT = outlineMaterial(1.7);
  const OUT_FINE = outlineMaterial(1.15);
  const SHADOW = shadowMaterial();
  const flavorCols = FLAVOR_HEX.map((h) => C(h));

  // shared materials
  const skin = inkMaterial({ color: PAL.skin, mode: 0, axis: V3(0, 0, 1), freq: 52, black: 0.1, lit: 0.56, wrap: 0.55, rim: 0.42 });
  const nail = inkMaterial({ color: PAL.paper, flat: true });
  const sleeve = inkMaterial({ color: PAL.paper, mode: 0, axis: V3(0, 1, 0), freq: 18, black: 0.12, lit: 0.82, wrap: 0.3, side: THREE.DoubleSide });
  const cuff = new THREE.MeshBasicMaterial({ map: P.cuffTexture(), side: THREE.DoubleSide });
  const dark = inkMaterial({ color: PAL.ink, flat: true });
  const handMats = { skin, nail, sleeve, cuff, dark };
  const paperFlat = inkMaterial({ color: PAL.paper, flat: true });
  const redFlat = inkMaterial({ color: PAL.red, flat: true });
  const marble = (o = {}) => inkMaterial({ color: PAL.paper, mode: 0, axis: V3(0, 1, 0), freq: 16, black: 0.1, lit: 0.82, wrap: 0.3, ...o });
  const stopperMat = inkMaterial({ color: PAL.paper, mode: 1, freq: 22, black: 0.12, lit: 0.8, spec: 1 });
  const bottleMat = (hex) => inkMaterial({ color: hex, mode: 0, axis: V3(0, 1, 0), freq: 15, black: 0.12, lit: 0.74, spec: 1, wrap: 0.3, rim: 0.4 });
  const NAMES = [['N°1', 'Écume'], ['N°2', 'Herbier'], ['N°3', 'Songe']];
  const labels = NAMES.map(([n, s]) => P.labelTexture(n, s));

  const project = (v, out) => {
    const q = v.clone().project(camera);
    out.x = (q.x * 0.5 + 0.5) * W;
    out.y = (0.5 - q.y * 0.5) * H;
    out.z = q.z;
    return out;
  };
  let W = 1280, H = 800, dpr = 1;

  // ================================================================ 1 the counter
  function buildComptoir() {
    const scene = new THREE.Scene();
    scene.background = C(PAL.red);
    const tableM = new THREE.ShaderMaterial({ uniforms: { uRed: { value: C(PAL.red) }, uInkC: G.uInkC }, vertexShader: WORLD_VERT, fragmentShader: WOOD_FRAG });
    const table = new THREE.Mesh(new THREE.PlaneGeometry(70, 50), tableM);
    table.rotation.x = -Math.PI / 2;
    scene.add(table);
    const spillU = { uCol: { value: C(PAL.wine) }, uInkC: G.uInkC, uHi: G.uHi, uK: { value: 0 }, uO: { value: new THREE.Vector2(0, 0) }, uTime: G.uTime };
    const spill = new THREE.Mesh(new THREE.PlaneGeometry(70, 50), new THREE.ShaderMaterial({ uniforms: spillU, vertexShader: WORLD_VERT, fragmentShader: SPILL_FRAG, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    spill.rotation.x = -Math.PI / 2;
    spill.position.y = 0.004;
    scene.add(spill);
    const coin = P.makeCoin(inkMaterial({ color: PAL.paper, mode: 1, freq: 110, black: 0.1, lit: 0.86 }), P.coinTexture());
    outline(coin, OUT_FINE);
    scene.add(coin);
    const hand = P.makeHand(handMats);
    outline(hand.root, OUT);
    scene.add(hand.root);
    const sh1 = planarShadows(hand.root, scene, 0.006, SHADOW);
    const sh2 = planarShadows(coin, scene, 0.006, SHADOW);
    const light = V3(-0.5, 1.0, 0.42).normalize();
    const cam = track([
      [0.0, 0.9, 4.7, 3.9, 0.45, 0.0, 0.05, 34],
      [0.45, 0.75, 4.1, 3.3, 0.3, 0.15, 0.0, 34],
      [0.8, 0.4, 5.6, 3.6, 0.0, 0.0, -0.6, 40],
      [1.0, 0.3, 6.2, 3.4, -0.1, 0.0, -0.9, 42],
    ]);
    const pinch = new THREE.Vector3();
    const coinRest = V3(0.05, 0.035, 0.05);
    const wR = V3(3.1, 0.62, 0.62), wReach = V3(1.42, 0.4, 0.34), wLift = V3(1.95, 1.2, 0.6);
    let holdA = 0;
    const st = { a: 0 };
    function update(u, dt, time, active) {
      const live = dt > 0 && dt < 0.2;
      if (active && IA.hold && live) holdA = Math.min(1, holdA + dt / 1.6);
      const a = Math.max(clamp(u / 0.8), holdA);
      st.a = a;
      IA.coinK = a;
      // the hand: in, the pinch, the coin lifted
      const kIn = smooth(a / 0.36), kLift = sstep(0.48, 0.72, a);
      const w = wR.clone().lerp(wReach, kIn).lerp(wLift, kLift);
      w.y += Math.sin(time * 1.4) * 0.012 * (1 - kLift);
      hand.root.position.copy(w);
      hand.root.rotation.set(-0.1 - 0.25 * kLift, Math.PI + 0.22 - 0.1 * kIn, -0.2 + 0.12 * kIn - 0.12 * kLift, 'YXZ');
      if (a < 0.3) hand.setPose('rest', 'reach', smooth(a / 0.3));
      else hand.setPose('reach', 'pinch', sstep(0.3, 0.47, a));
      // the coin follows the pinch once taken
      const kTake = sstep(0.44, 0.5, a);
      hand.pinchPoint(pinch);
      coin.position.copy(coinRest).lerp(pinch, kTake);
      coin.rotation.set(kTake * 1.15, 0.4, kTake * 0.3);
      spillU.uK.value = sstep(0.5, 1.0, a);
      sh1.update(light);
      sh2.update(light);
    }
    const tmp = new THREE.Vector3(), out = { x: 0, y: 0, z: 0 };
    function anchors() {
      tmp.copy(coin.position);
      tmp.y += 0.02;
      project(tmp, out);
      return { coin: { x: out.x, y: out.y }, coinDone: st.a >= 0.6 };
    }
    return { scene, cam, light, update, anchors, reset: () => (holdA = 0) };
  }

  // ================================================================ 2 the round window
  function buildOculus() {
    const scene = new THREE.Scene();
    scene.background = C(PAL.paper);
    const light = V3(0.45, 0.62, 0.7).normalize();
    const oy = 7.2, R = 4.0;
    // the wall with its round hole
    const shape = new THREE.Shape();
    shape.moveTo(-20, -3);
    shape.lineTo(20, -3);
    shape.lineTo(20, 22);
    shape.lineTo(-20, 22);
    shape.lineTo(-20, -3);
    const hole = new THREE.Path();
    hole.absarc(0, oy, R, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const wall = new THREE.Mesh(new THREE.ShapeGeometry(shape, 96), paperFlat);
    wall.userData.noOutline = true;
    scene.add(wall);
    const frameMat = inkMaterial({ color: PAL.paper, mode: 0, axis: V3(1, 0, 0), freq: 7, black: 0.16, lit: 0.8, wrap: 0.2 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.3, 0.42, 24, 120), frameMat);
    ring.position.set(0, oy, 0.12);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(R + 0.95, 0.14, 12, 120), frameMat);
    ring2.position.set(0, oy, 0.08);
    const key = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.3, 0.7), frameMat);
    key.position.set(0, oy + R + 0.75, 0.3);
    const facade = new THREE.Group();
    facade.add(ring, ring2, key);
    // pilasters, capitals, cornice, dentils
    const pilM = inkMaterial({ color: PAL.paper, mode: 0, axis: V3(1, 0, 0), freq: 9, black: 0.2, lit: 0.97, wrap: 0.1, weight: 0.55 });
    for (const sx of [-1, 1]) {
      const pil = new THREE.Mesh(new THREE.BoxGeometry(1.7, 15, 0.8), pilM);
      pil.position.set(sx * 11.2, 4.3, 0.4);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.6, 1.1), frameMat);
      cap.position.set(sx * 11.2, 12.1, 0.55);
      facade.add(pil, cap);
    }
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(40, 0.9, 1.4), frameMat);
    cornice.position.set(0, 13.4, 0.7);
    const dentG = new THREE.BoxGeometry(0.34, 0.42, 0.5);
    const dents = new THREE.InstancedMesh(dentG, frameMat, 60);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 60; i++) dents.setMatrixAt(i, m4.makeTranslation(-19.5 + i * 0.66, 12.75, 0.75));
    facade.add(cornice, dents);
    // the balustrade in front
    const balM = inkMaterial({ color: PAL.paper, mode: 1, freq: 28, black: 0.14, lit: 0.8, wrap: 0.25 });
    const bals = new THREE.InstancedMesh(P.balusterGeometry(), balM, 19);
    for (let i = 0; i < 19; i++) bals.setMatrixAt(i, m4.makeTranslation(-10.8 + i * 1.2, 0.3, 3.2));
    const rail = new THREE.Mesh(new THREE.BoxGeometry(23.4, 0.36, 0.8), frameMat);
    rail.position.set(0, 1.82, 3.2);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(23.4, 0.3, 0.9), frameMat);
    plinth.position.set(0, 0.15, 3.2);
    const posts = [-12, 12].map((x) => {
      const pst = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.3, 0.9), frameMat);
      pst.position.set(x, 1.15, 3.2);
      return pst;
    });
    facade.add(bals, rail, plinth, ...posts);
    outline(facade, OUT);
    scene.add(facade);
    // behind: the red moon on the pale sky, the sibyl's silhouette with her hair in the wind
    const moon = new THREE.Mesh(new THREE.CircleGeometry(5.4, 120), redFlat);
    moon.position.set(0.4, oy + 0.6, -7);
    moon.userData.noOutline = true;
    scene.add(moon);
    // the sibyl: a flat black silhouette (cloak, shoulders, head, hair), her hair flowing to the right
    const s = new THREE.Shape();
    s.moveTo(-2.3, 0);
    s.lineTo(2.3, 0);
    s.bezierCurveTo(2.1, 1.4, 1.75, 2.8, 1.45, 3.75);
    s.quadraticCurveTo(1.25, 4.2, 0.62, 4.32);
    s.quadraticCurveTo(0.55, 4.6, 0.46, 4.95);
    s.quadraticCurveTo(0.42, 5.5, 0.0, 5.55);
    s.quadraticCurveTo(-0.45, 5.52, -0.5, 5.0);
    s.quadraticCurveTo(-0.62, 4.45, -0.85, 4.2);
    s.quadraticCurveTo(-1.35, 4.05, -1.5, 3.7);
    s.bezierCurveTo(-1.8, 2.8, -2.1, 1.4, -2.3, 0);
    const sib = new THREE.Mesh(new THREE.ShapeGeometry(s, 24), dark);
    sib.scale.setScalar(1.12);
    sib.position.set(-0.25, 2.45, -2.2);
    sib.userData.noOutline = true;
    scene.add(sib);
    const strands = [];
    const R2 = rng(7);
    for (let i = 0; i < 13; i++) {
      const len = 1.6 + R2() * 2.4;
      const g = new THREE.PlaneGeometry(1, 0.06 + R2() * 0.12, 32, 1);
      g.translate(0.5, 0, 0);
      const m = new THREE.Mesh(g, P.strandMaterial(G, R2() * 6));
      m.scale.set(len, 1, 1);
      m.position.set(-0.25 + 1.12 * (0.3 + R2() * 0.2), 2.45 + 1.12 * (4.4 + R2() * 1.0), -2.15);
      m.rotation.z = 0.12 - R2() * 0.4;
      m.userData.noOutline = true;
      scene.add(m);
      strands.push(m);
    }
    const cam = track([
      [0.0, 3.6, 5.4, 10.5, 3.4, 7.4, 0.0, 40],
      [0.4, 3.8, 6.0, 14.0, 3.6, 7.0, 0.0, 38],
      [1.0, 3.4, 6.2, 24.5, 3.4, 5.6, 0.0, 34],
    ]);
    function update(u, dt, time) {
      sib.rotation.z = Math.sin(time * 0.6) * 0.008;
    }
    return { scene, cam, light, update };
  }

  // ================================================================ 3 the temple hall
  function buildTemple() {
    const scene = new THREE.Scene();
    scene.background = C(PAL.ink);
    const light = V3(0.35, 0.75, 0.55).normalize();
    const floorM = new THREE.ShaderMaterial({ uniforms: { uRed: { value: C(PAL.red) }, uInkC: G.uInkC }, vertexShader: WORLD_VERT, fragmentShader: FLOOR_FRAG });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 90), floorM);
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -30;
    scene.add(floor);
    const colMat = inkMaterial({ color: PAL.red, mode: 1, freq: 64, black: 0.16, lit: 0.95, wrap: 0.35, rim: 0.35 });
    const { geo: colG, top } = P.columnGeometry(0.44, 6.0);
    const zs = [-1, -7, -13, -19, -25, -31, -37];
    const cols = new THREE.InstancedMesh(colG, colMat, zs.length * 2);
    const m4 = new THREE.Matrix4();
    let k = 0;
    for (const z of zs) for (const x of [-3.6, 3.6]) cols.setMatrixAt(k++, m4.makeTranslation(x, 0, z));
    const hall = new THREE.Group();
    hall.add(cols);
    // the arcades: a wall pierced with pointed arches over each row
    const archM = inkMaterial({ color: PAL.red, mode: 2, freq: 3.2, black: 0.1, lit: 1.3, wrap: 0.2, rim: 0, jit: 0.5 });
    for (const sx of [-1, 1]) {
      const s = new THREE.Shape();
      const L = 44;
      s.moveTo(-2, top - 0.2);
      s.lineTo(L, top - 0.2);
      s.lineTo(L, 16);
      s.lineTo(-2, 16);
      s.lineTo(-2, top - 0.2);
      for (let i = 0; i < zs.length - 1; i++) {
        const a = -zs[i] + 0.75, b = -zs[i + 1] - 0.75, mid = (a + b) / 2;
        const h = new THREE.Path();
        h.moveTo(a, top - 0.2);
        h.lineTo(a, top + 0.7);
        h.quadraticCurveTo(a, top + 2.6, mid, top + 3.3);
        h.quadraticCurveTo(b, top + 2.6, b, top + 0.7);
        h.lineTo(b, top - 0.2);
        h.lineTo(a, top - 0.2);
        s.holes.push(h);
      }
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: false, curveSegments: 12 });
      g.rotateY(Math.PI / 2);
      g.translate(sx * 3.6 - 0.45, 0, 0);
      const wall = new THREE.Mesh(g, archM);
      hall.add(wall);
    }
    // the far wall, deep in the dark: red streaks
    const backM = inkMaterial({ color: PAL.red, mode: 2, freq: 3.0, black: 0.02, lit: 1.25, wrap: 0, amb: -0.2, rim: 0, jit: 0.4 });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(30, 22), backM);
    back.position.set(0, 9, -41);
    back.userData.noOutline = true;
    scene.add(back);
    // the altar and the three small bottles
    const altar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.15, 1.5), marble({ freq: 10 }));
    altar.position.set(0, 0.575, -33);
    hall.add(altar);
    const minis = flavorCols.map((c, i) => {
      const b = P.makeBottle(inkMaterial({ color: FLAVOR_HEX[i], flat: true }), paperFlat, null);
      b.group.scale.setScalar(0.27);
      b.group.position.set((i - 1) * 0.55, 1.15, -33);
      hall.add(b.group);
      return b;
    });
    outline(hall, OUT);
    scene.add(hall);
    const fig = P.makeFigure(inkMaterial({ color: PAL.gold, mode: 1, freq: 70, black: 0.14, lit: 0.95, wrap: 0.4, rim: 0.35 }), dark);
    outline(fig.group, OUT);
    scene.add(fig.group);
    const cam = track([
      [0.0, 0.7, 2.1, 7.0, 0.0, 2.6, -12, 54],
      [0.5, 0.35, 1.95, -3.5, 0.0, 2.1, -24, 50],
      [1.0, 0.1, 1.85, -14.5, 0.0, 1.5, -34, 46],
    ]);
    function update(u, dt, time) {
      const z = mix(2.2, -22.5, u);
      const step = z * 1.9;
      fig.group.position.set(-0.15, Math.abs(Math.sin(step)) * 0.03, z);
      fig.group.rotation.set(0, 0, Math.sin(step) * 0.025);
    }
    return { scene, cam, light, update };
  }

  // ================================================================ 4 the three bottles
  function buildFioles() {
    const scene = new THREE.Scene();
    scene.background = C(PAL.paper);
    const light = V3(0.42, 0.85, 0.5).normalize();
    scene.add(strokesLayer({ bg: PAL.paper, fg: PAL.ink, density: 0.42, top: 0.55, drift: 0.02, clear: 0.36 }));
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(11, 0.55, 2.4), marble({ freq: 18, black: 0.08, lit: 0.9 }));
    ledge.position.set(0, -0.275, 0);
    const under = new THREE.Mesh(new THREE.BoxGeometry(11, 1.6, 2.0), inkMaterial({ color: PAL.ink, flat: true }));
    under.position.set(0, -1.35, -0.1);
    const set = new THREE.Group();
    set.add(ledge, under);
    const bottles = flavorCols.map((c, i) => {
      const b = P.makeBottle(bottleMat(FLAVOR_HEX[i]), stopperMat, labels[i]);
      b.group.position.set((i - 1) * 1.62, 0, 0);
      b.group.rotation.y = -0.18 + (i - 1) * 0.08;
      set.add(b.group);
      return { ...b, lift: 0, glow: 0 };
    });
    outline(set, OUT);
    scene.add(set);
    const cam = track([
      [0.0, -0.9, 2.6, 9.4, -1.35, 1.45, 0.0, 34],
      [0.5, -1.1, 2.1, 8.7, -1.4, 1.5, 0.0, 34],
      [1.0, -1.3, 1.8, 8.2, -1.45, 1.6, 0.0, 34],
    ]);
    function update(u, dt, time) {
      const d = dt > 0 && dt < 0.2 ? dt : 1;
      bottles.forEach((b, i) => {
        const sel = IA.flavor === i, hov = IA.hover === i;
        const target = sel ? 0.34 : hov ? 0.14 : 0;
        b.lift += (target - b.lift) * (1 - Math.exp(-d * 9));
        b.group.position.y = b.lift + (sel ? Math.sin(time * 1.6) * 0.025 : 0);
        b.group.rotation.y = -0.18 + (i - 1) * 0.08 + (sel ? Math.sin(time * 0.7) * 0.12 : 0);
        const dim = sel ? 0 : 0.32;
        b.body.material.uniforms.uTintK.value += (dim - b.body.material.uniforms.uTintK.value) * (1 - Math.exp(-d * 8));
      });
    }
    const tmp = new THREE.Vector3(), o1 = { x: 0, y: 0, z: 0 }, o2 = { x: 0, y: 0, z: 0 };
    function anchors() {
      const list = bottles.map((b) => {
        b.group.updateMatrixWorld(true);
        project(tmp.set(0, 0, 0).applyMatrix4(b.group.matrixWorld), o1);
        const x0 = o1.x, y0 = o1.y;
        project(tmp.set(0, 3.35, 0).applyMatrix4(b.group.matrixWorld), o2);
        return { x: x0, y: (y0 + o2.y) / 2, h: Math.abs(y0 - o2.y), w: Math.abs(y0 - o2.y) * 0.3 };
      });
      const s = list[IA.flavor];
      return { bottles: list, choose: { x: s.x, y: s.y + s.h * 0.5 + 58 } };
    }
    return { scene, cam, light, update, anchors };
  }

  // ================================================================ 5 the pour
  function buildVerser() {
    const scene = new THREE.Scene();
    scene.background = C(PAL.red);
    const light = V3(-0.4, 0.82, 0.55).normalize();
    const slab = new THREE.Mesh(new THREE.BoxGeometry(16, 0.7, 3.2), marble({ freq: 16, black: 0.08, lit: 0.9 }));
    slab.position.set(0, -0.35, 0);
    const set = new THREE.Group();
    set.add(slab);
    const glassMat = inkMaterial({ color: PAL.paper, mode: 0, axis: V3(0, 1, 0), freq: 26, black: 0.0, lit: 0.2, spec: 1, wrap: 1.0, rim: 0.25, alpha: 0.12, edge: 0.8 });
    const liquidMat = inkMaterial({ color: PAL.yellow, mode: 0, axis: V3(1, 0, 0), freq: 30, black: 0.03, lit: 0.45, spec: 1, wrap: 0.7 });
    const glass = P.makeGlass(glassMat, liquidMat);
    glass.group.scale.setScalar(1.12);
    glass.glass.userData.noOutline = true;
    set.add(glass.group);
    // the hand holds the bottle round its body, the arm coming from the left
    const holder = new THREE.Group();
    const inner = new THREE.Group();
    holder.add(inner);
    const bMats = FLAVOR_HEX.map((h) => bottleMat(h));
    const bottle = P.makeBottle(bMats[2], stopperMat, labels[2]);
    bottle.group.rotation.y = 0.9;
    inner.add(bottle.group);
    const hand = P.makeHand(handMats);
    hand.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V3(1, 0, 0), V3(0, 0, 1), V3(0, -1, 0)));
    hand.root.position.set(-0.62, 0.62, 0.58);
    hand.setPose('grip', 'grip', 1);
    inner.add(hand.root);
    inner.position.set(0, -0.75, 0);
    set.add(holder);
    outline(set, OUT);
    scene.add(set);
    // the stream (and its black outline)
    const sU = {
      uP0: { value: V3(0, 3, 0) }, uV0: { value: V3(0.6, -0.3, 0) }, uGr: { value: 6.0 }, uT0: { value: 0 }, uT1: { value: 0 }, uR: { value: 0.055 },
      uColor: { value: C(PAL.yellow) }, uInkC: G.uInkC, uHi: G.uHi, uL: G.uL,
    };
    const sGeo = new THREE.CylinderGeometry(1, 1, 1, 12, 48, true);
    sGeo.translate(0, 0.5, 0);
    const stream = new THREE.Mesh(sGeo, new THREE.ShaderMaterial({ uniforms: { ...sU, uOut: { value: 0 } }, vertexShader: STREAM_VERT, fragmentShader: STREAM_FRAG }));
    const streamO = new THREE.Mesh(sGeo, new THREE.ShaderMaterial({ uniforms: { ...sU, uOut: { value: 0.022 } }, vertexShader: STREAM_VERT, fragmentShader: STREAM_FRAG, side: THREE.BackSide }));
    stream.frustumCulled = streamO.frustumCulled = false;
    scene.add(stream, streamO);
    const pivot = V3(-1.25, 3.75, 0.25);
    const mouth = new THREE.Vector3(), axis = new THREE.Vector3();
    let pourH = 0;
    const st = { pour: 0 };
    // the glass stands where the stream lands at full tilt (worked out once)
    const TILT0 = -0.42, TILT1 = -2.02;
    function aim(tilt) {
      holder.position.copy(pivot);
      holder.rotation.set(0, 0, tilt);
      holder.updateMatrixWorld(true);
      mouth.set(0, P.BOTTLE_MOUTH + 0.02, 0);
      bottle.group.localToWorld(mouth);
      axis.set(0, 1, 0).transformDirection(bottle.group.matrixWorld);
    }
    aim(TILT1);
    const surf = (f) => P.GLASS_APEX * 1.12 + f * 0.72 * 1.12;
    {
      const v0 = axis.clone().multiplyScalar(0.75);
      const yS = surf(0.5);
      const g = sU.uGr.value;
      const t = (v0.y + Math.sqrt(v0.y * v0.y + 2 * g * (mouth.y - yS))) / g;
      glass.group.position.set(mouth.x + v0.x * t, 0, 0.25);
    }
    const cam = track([
      [0.0, -0.9, 4.4, 11.0, -0.7, 2.45, 0.0, 36],
      [0.5, -0.7, 4.2, 10.2, -0.55, 2.35, 0.0, 36],
      [1.0, -0.5, 4.0, 9.6, -0.4, 2.25, 0.0, 36],
    ]);
    function update(u, dt, time, active) {
      const live = dt > 0 && dt < 0.2;
      if (active && IA.hold && live) pourH = Math.min(1, pourH + dt / 3.2);
      const pour = Math.max(clamp((u - 0.08) / 0.8), pourH);
      st.pour = pour;
      IA.pourK = pour;
      const f = IA.flavor;
      bottle.body.material = bMats[f];
      bottle.label.material.map = labels[f];
      sU.uColor.value.copy(flavorCols[f]);
      liquidMat.uniforms.uColor.value.copy(flavorCols[f]);
      const kT = smooth(pour / 0.22);
      const tilt = mix(TILT0, TILT1, kT) + Math.sin(time * 1.1) * 0.012;
      aim(tilt);
      // the stream: from the mouth to the surface, while the bottle is down
      const fill = sstep(0.24, 0.96, pour);
      glass.setFill(fill * 0.92);
      const on = sstep(0.17, 0.23, pour) * (1 - sstep(0.985, 1.0, pour));
      const v0 = axis.clone().multiplyScalar(0.75);
      const yS = surf(Math.max(0.02, fill * 0.92)) + 0.02;
      const g = sU.uGr.value;
      const tLand = (v0.y + Math.sqrt(Math.max(0, v0.y * v0.y + 2 * g * (mouth.y - yS)))) / g;
      sU.uP0.value.copy(mouth);
      sU.uV0.value.copy(v0);
      sU.uT1.value = tLand * clamp(on * 1.6);
      sU.uT0.value = 0;
      stream.visible = streamO.visible = on > 0.01;
    }
    const out = { x: 0, y: 0, z: 0 };
    function anchors() {
      project(mouth, out);
      return { pour: { x: out.x - 30, y: out.y - 70 }, pourDone: st.pour >= 0.99 };
    }
    return { scene, cam, light, update, anchors, reset: () => (pourH = 0) };
  }

  // ================================================================ 6 the fall
  function buildVision() {
    const scene = new THREE.Scene();
    scene.background = C(PAL.red);
    const light = V3(0.5, 0.75, 0.55).normalize();
    const rain = rainLayer({ bg: PAL.red, fg: PAL.paper });
    scene.add(rain);
    const colMat = inkMaterial({ color: PAL.paper, mode: 1, freq: 56, black: 0.16, lit: 0.86, wrap: 0.3, rim: 0.3 });
    const R = rng(11);
    const pieces = [];
    const add = (geo, p0, v, rx, ry, rz, spin) => {
      const m = new THREE.Mesh(geo, colMat);
      outline(m, OUT);
      scene.add(m);
      pieces.push({ m, p0, v, r0: V3(rx, ry, rz), spin });
    };
    const r = 0.95;
    add(P.brokenDrum(r, 7.5, 1, true, false), V3(1.0, 3.0, -1.5), V3(-0.5, -2.2, 0), 0.25, 0.3, -0.42, V3(0.04, 0.1, 0.14));
    add(P.brokenDrum(r, 3.2, 2, true, true), V3(3.6, 9.2, -3), V3(-0.6, -3.0, 0), 0.2, 0.0, -0.5, V3(0.2, 0.1, 0.35));
    add(P.brokenDrum(r, 6.0, 3, false, true), V3(6.2, 4.8, -2.2), V3(-0.7, -2.5, 0), -0.2, 0.5, -0.5, V3(0.06, 0.15, 0.18));
    add(P.brokenDrum(r * 0.96, 2.2, 4, true, true), V3(8.6, 9.4, -3.5), V3(-0.9, -3.4, 0), 0.6, 0.2, 0.3, V3(0.4, 0.3, 0.5));
    const debrisG = new THREE.IcosahedronGeometry(1, 0);
    for (let i = 0; i < 22; i++) {
      const s = 0.07 + R() * 0.22;
      const g = debrisG.clone();
      g.scale(s, s * (0.6 + R() * 0.6), s);
      add(g, V3(-2.5 + R() * 12, -2 + R() * 13, -2 + R() * 3), V3(-0.4 - R() * 0.9, -3.2 - R() * 2.5, 0), R() * 6, R() * 6, R() * 6, V3(R() * 2, R() * 2, R() * 2));
    }
    const cam = track([
      [0.0, 0.0, 1.0, 15.0, 0.0, 1.6, 0.0, 40],
      [1.0, 0.0, 0.4, 13.2, 0.0, 0.8, 0.0, 42],
    ]);
    function update(u, dt, time) {
      const s = u * 2.4 + 0.1;
      for (const pc of pieces) {
        pc.m.position.copy(pc.p0).addScaledVector(pc.v, s);
        pc.m.position.x += Math.sin(time * 0.4 + pc.p0.x) * 0.04;
        pc.m.rotation.set(pc.r0.x + pc.spin.x * s, pc.r0.y + pc.spin.y * s, pc.r0.z + pc.spin.z * s);
      }
      rain.material.uniforms.uFall.value = u * 9 + time * 0.25;
    }
    return { scene, cam, light, update };
  }

  // ================================================================ 7 the temple front
  function buildFronton() {
    const scene = new THREE.Scene();
    scene.background = C(PAL.red);
    const light = V3(-0.5, 0.72, 0.6).normalize();
    const T = new THREE.Group();
    const stone = (o = {}) => inkMaterial({ color: PAL.paper, mode: 0, axis: V3(1, 0, 0), freq: 7, black: 0.14, lit: 0.85, wrap: 0.25, ...o });
    const stepM = stone({ axis: V3(0, 1, 0), freq: 14 });
    [[15, 5.8], [14.2, 5.0], [13.4, 4.2]].forEach(([w, d], i) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.36, d), stepM);
      s.position.set(0, 0.18 + i * 0.36, -1.6 - i * 0.1);
      T.add(s);
    });
    const base = 1.08;
    const colMat = inkMaterial({ color: PAL.paper, mode: 1, freq: 60, black: 0.18, lit: 0.88, wrap: 0.3, rim: 0.3 });
    const { geo: colG, top } = P.columnGeometry(0.5, 6.0);
    const cols = new THREE.InstancedMesh(colG, colMat, 6);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 6; i++) cols.setMatrixAt(i, m4.makeTranslation(-5.5 + i * 2.2, base, 0.0));
    T.add(cols);
    const ent = new THREE.Mesh(new THREE.BoxGeometry(13.6, 1.5, 4.2), stone({ axis: V3(0, 1, 0), freq: 9 }));
    ent.position.set(0, base + top + 0.75, -1.6);
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.4, 4.8), stone());
    cornice.position.set(0, base + top + 1.7, -1.6);
    T.add(ent, cornice);
    const tri = new THREE.Shape();
    tri.moveTo(-7.0, 0);
    tri.lineTo(7.0, 0);
    tri.lineTo(0, 2.6);
    tri.lineTo(-7.0, 0);
    const pedG = new THREE.ExtrudeGeometry(tri, { depth: 0.8, bevelEnabled: false });
    const ped = new THREE.Mesh(pedG, stone({ freq: 6 }));
    ped.position.set(0, base + top + 1.9, 0.0);
    T.add(ped);
    // the cella behind the columns: red, darker at the back
    const cella = new THREE.Mesh(new THREE.BoxGeometry(12.2, top + 0.2, 0.4), redFlat);
    cella.position.set(0, base + (top + 0.2) / 2, -3.2);
    cella.userData.noOutline = true;
    T.add(cella);
    outline(T, OUT);
    scene.add(T);
    // a pale moon behind
    const moon = new THREE.Mesh(new THREE.CircleGeometry(5.5, 96), paperFlat);
    moon.position.set(6.5, 13.5, -26);
    moon.userData.noOutline = true;
    const shadowDisc = new THREE.Mesh(new THREE.CircleGeometry(5.5, 96), redFlat);
    shadowDisc.position.set(4.6, 14.6, -25.9);
    shadowDisc.userData.noOutline = true;
    scene.add(moon, shadowDisc);
    const robeMats = FLAVOR_HEX.map((h) => inkMaterial({ color: h, mode: 1, freq: 70, black: 0.18, lit: 0.88, wrap: 0.3, rim: 0.3 }));
    const fig = P.makeFigure(robeMats[2], dark);
    fig.group.scale.setScalar(1.05);
    outline(fig.group, OUT);
    scene.add(fig.group);
    const cam = track([
      [0.0, 0.0, 6.0, 31.0, 0.0, 9.4, 0.0, 42],
      [1.0, 0.0, 5.8, 27.5, 0.0, 9.1, 0.0, 42],
    ]);
    function update(u, dt, time) {
      fig.robe.material = robeMats[IA.flavor];
      const z = mix(5.5, 1.4, u);
      const y = z > 2.4 ? 0 : sstep(2.4, 1.6, z) * 1.08;
      const step = z * 2.2;
      fig.group.position.set(0.15, y + Math.abs(Math.sin(step)) * 0.03, z);
      fig.group.rotation.set(0, 0, Math.sin(step) * 0.02);
    }
    return { scene, cam, light, update };
  }

  const builders = [buildComptoir, buildOculus, buildTemple, buildFioles, buildVerser, buildVision, buildFronton];
  const sets = [];
  for (let i = 0; i < builders.length; i++) {
    sets.push(builders[i]());
    onProgress(0.15 + (0.8 * (i + 1)) / builders.length);
    await new Promise((r) => setTimeout(r, 0));
  }

  // the cut layer, drawn over the set
  const cutScene = new THREE.Scene();
  const cut = cutLayer();
  cutScene.add(cut);
  const cutCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const CUTC = { ink: C(PAL.ink), paper: C(PAL.paper), red: C(PAL.red), wine: C(PAL.wine) };

  // ------------------------------------------------------------------ per frame
  let cur = 0, curP = 0, cutOn = false;
  const lw = new THREE.Vector3();
  function placeCamera(si, u, pointer) {
    const v = sets[si].cam(u);
    camera.position.set(v[0] + pointer.x * 0.12, v[1] + pointer.y * 0.06, v[2]);
    camera.lookAt(v[3], v[4], v[5]);
    const aspect = W / H;
    camera.fov = aspect < 1.6 ? Math.min(80, (2 * Math.atan(Math.tan((v[6] * Math.PI) / 360) * (1.6 / aspect)) * 180) / Math.PI) : v[6];
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }
  function setIndex(p) {
    for (let i = SETS.length - 1; i >= 0; i--) if (p >= SETS[i].range[0]) return i;
    return 0;
  }
  function update(state, dt, time) {
    const p = clamp(state.p);
    curP = p;
    G.uTime.value = time;
    const si = Math.min(setIndex(p), sets.length - 1);
    cur = si;
    // the held gestures belong to their set: away from it, they start over
    if (p > SETS[0].range[1] + 0.03) sets[0].reset();
    if (p < SETS[4].range[0] - 0.03 || p > SETS[4].range[1] + 0.03) sets[4].reset();
    const set = sets[si];
    const u = within(p, SETS[si].range);
    placeCamera(si, u, state.pointer || { x: 0, y: 0 });
    lw.copy(set.light);
    G.uL.value.copy(lw).transformDirection(camera.matrixWorldInverse);
    set.update(u, dt, time, true);
    // the cut
    cutOn = false;
    for (const c of CUTS) {
      if (Math.abs(p - c.at) < c.w) {
        const t = (p - (c.at - c.w)) / (2 * c.w);
        cut.material.uniforms.uT.value = t;
        cut.material.uniforms.uType.value = c.type;
        cut.material.uniforms.uC1.value.copy(CUTC[c.c1]);
        cut.material.uniforms.uC2.value.copy(CUTC[c.c2]);
        if (c.type === 1) {
          const a = sets[0].anchors ? sets[0].anchors() : null;
          if (a && si === 0) cut.material.uniforms.uO.value.set(a.coin.x / W, 1 - a.coin.y / H);
        }
        cutOn = t > 0 && t < 1;
      }
    }
  }
  function resize(w, h, d) {
    W = Math.max(1, w);
    H = Math.max(1, h);
    dpr = d || 1;
    G.uPx.value = dpr;
    G.uRes.value.set(Math.round(W * dpr), Math.round(H * dpr));
  }
  function render() {
    renderer.autoClear = true;
    renderer.render(sets[cur].scene, camera);
    if (cutOn) {
      renderer.autoClear = false;
      renderer.render(cutScene, cutCam);
      renderer.autoClear = true;
    }
  }
  async function warmup() {
    const keep = curP;
    for (let i = 0; i < sets.length; i++) {
      const s = SETS[i].range;
      update({ p: (s[0] + s[1]) / 2, pointer: { x: 0, y: 0 } }, 0, 0);
      renderer.compile(sets[i].scene, camera);
      render();
      await new Promise((r) => setTimeout(r, 0));
    }
    update({ p: 0.15, pointer: { x: 0, y: 0 } }, 0, 0);
    renderer.compile(cutScene, cutCam);
    update({ p: keep, pointer: { x: 0, y: 0 } }, 0, 0);
  }
  return {
    camera,
    update,
    render,
    resize,
    warmup,
    setQuality(lv) {
      level = lv;
    },
    stats() {
      const i = renderer.info;
      return { calls: i.render.calls, triangles: i.render.triangles, textures: i.memory.textures, geometries: i.memory.geometries, programs: i.programs ? i.programs.length : 0, set: SETS[cur].id, level };
    },
    anchors() {
      const s = sets[cur];
      return { set: SETS[cur].id, ...(s.anchors ? s.anchors() : {}) };
    },
    info() {
      return { set: SETS[cur].id, flavor: IA.flavor };
    },
  };
}
