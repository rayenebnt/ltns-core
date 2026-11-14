// SIBYLLE: the ink look. Every surface is drawn like a printed engraving: flat colour where the
// light falls, parallel ink lines that thicken into the shadow, solid black below, a black outline
// (an inverted hull of constant screen width), hard white glints on glass and liquid. Plus the
// full-screen layers: vertical brush strokes, diagonal rain, and the cuts between the sets.
// Colours are given in sRGB hex; THREE.Color keeps them linear and every shader ends with
// <colorspace_fragment>, so a flat area shows exactly its hex.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const PAL = {
  red: '#e1000f',
  wine: '#a5000b',
  paper: '#f4f0e6',
  ink: '#0b0a0a',
  skin: '#f3e4cd',
  gold: '#c99a42',
  cyan: '#38b4ea',
  green: '#63d24b',
  yellow: '#f5da1c',
  white: '#ffffff',
};
export const FLAVOR_HEX = [PAL.cyan, PAL.green, PAL.yellow];
export const C = (h) => new THREE.Color(h);

// the uniforms every ink material shares (one update per frame): the light in view space, the
// pixel ratio, the drawing buffer size, the ink colour
export const G = {
  uL: { value: new THREE.Vector3(0.3, 0.8, 0.5).normalize() },
  uPx: { value: 1 },
  uRes: { value: new THREE.Vector2(1280, 800) },
  uInkC: { value: C(PAL.ink) },
  uHi: { value: C(PAL.white) },
  uTime: { value: 0 },
};

export const NOISE = /* glsl */ `
float h11(float n) { return fract(sin(n * 91.3458) * 47453.5453); }
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { return vn(p) * 0.55 + vn(p * 2.03 + 7.1) * 0.3 + vn(p * 4.1 - 3.7) * 0.15; }
`;

const INK_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec3 vO;
varying vec3 vW;
void main() {
  vec3 pos = position;
  vec3 nrm = normal;
  #ifdef USE_INSTANCING
    pos = (instanceMatrix * vec4(pos, 1.0)).xyz;
    nrm = mat3(instanceMatrix) * nrm;
  #endif
  vO = position;
  vec4 wp = modelMatrix * vec4(pos, 1.0);
  vW = wp.xyz;
  vec4 mv = viewMatrix * wp;
  vV = mv.xyz;
  vN = normalize(normalMatrix * nrm);
  gl_Position = projectionMatrix * mv;
}`;

const INK_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uTint;
uniform float uTintK;
uniform vec3 uInkC;
uniform vec3 uHi;
uniform vec3 uL;
uniform float uMode;
uniform vec3 uAxis;
uniform float uFreq;
uniform float uBlack;
uniform float uLit;
uniform float uSpec;
uniform float uWrap;
uniform float uAmb;
uniform float uFlat;
uniform float uPx;
uniform float uRim;
uniform float uJit;
uniform float uWeight;
uniform float uAlpha;
uniform float uEdge;
varying vec3 vN;
varying vec3 vV;
varying vec3 vO;
varying vec3 vW;
${NOISE}
void main() {
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(-vV);
  float sh = clamp((dot(N, uL) + uWrap) / (1.0 + uWrap), 0.0, 1.0);
  sh = clamp(sh + uAmb, 0.0, 1.0);
  float rim = 1.0 - abs(dot(N, V));
  sh *= 1.0 - uRim * smoothstep(0.45, 1.0, rim);
  // the line coordinate: object planes, around the object's axis, or the screen
  float c;
  if (uMode < 0.5) c = dot(vO, uAxis) * uFreq;
  else if (uMode < 1.5) c = (atan(vO.z, vO.x) / 6.2831853 + 0.5) * uFreq;
  else if (uMode < 2.5) c = gl_FragCoord.x / (uFreq * uPx);
  else c = gl_FragCoord.y / (uFreq * uPx);
  float fw = min(fwidth(c), 0.5);
  float d = (1.0 - smoothstep(uBlack, uLit, sh)) * uWeight;
  // each line has its own weight along its length: a hand-drawn, slightly broken line
  float n = vn(vec2(floor(c) * 3.17, dot(vO, vec3(0.7, 1.9, 1.3)) * uJit));
  d = clamp(d * (0.7 + 0.6 * n), 0.0, 1.0);
  float s = abs(fract(c) - 0.5) * 2.0;
  float aa = max(fw * 1.5, 0.03);
  float ink = 1.0 - smoothstep(d - aa, d + aa, s);
  ink = mix(ink, d, smoothstep(0.25, 0.6, fw));
  ink = max(ink, 1.0 - smoothstep(uBlack * 0.55, uBlack, sh));
  // a drawn contour where the surface turns away (the glass has no hull: it would show through)
  if (uEdge > 0.0) ink = max(ink, smoothstep(uEdge, uEdge + 0.07, rim));
  vec3 base = mix(uColor, uTint, uTintK);
  vec3 col = mix(base, uInkC, ink);
  if (uSpec > 0.0) {
    vec3 R = reflect(-uL, N);
    float sp = pow(max(dot(R, V), 0.0), 22.0);
    col = mix(col, uHi, smoothstep(0.42, 0.52, sp) * uSpec);
  }
  float alpha = 1.0;
  if (uAlpha < 1.0) alpha = max(uAlpha, max(ink, smoothstep(0.42, 0.52, uSpec > 0.0 ? pow(max(dot(reflect(-uL, N), V), 0.0), 22.0) : 0.0)));
  if (uFlat > 0.5) col = base;
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}`;

// o: { color, mode (0 planes, 1 around y, 2 screen vertical lines, 3 screen horizontal lines),
// axis, freq, black, lit, spec, wrap, amb, flat, rim, jit, weight, side }
export function inkMaterial(o = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: C(o.color || PAL.paper) },
      uTint: { value: C(o.tint || PAL.paper) },
      uTintK: { value: o.tintK || 0 },
      uInkC: G.uInkC,
      uHi: G.uHi,
      uL: G.uL,
      uPx: G.uPx,
      uMode: { value: o.mode ?? 0 },
      uAxis: { value: (o.axis || new THREE.Vector3(1, 0, 0)).clone().normalize() },
      uFreq: { value: o.freq ?? 20 },
      uBlack: { value: o.black ?? 0.2 },
      uLit: { value: o.lit ?? 0.78 },
      uSpec: { value: o.spec ?? 0 },
      uWrap: { value: o.wrap ?? 0.35 },
      uAmb: { value: o.amb ?? 0 },
      uFlat: { value: o.flat ? 1 : 0 },
      uRim: { value: o.rim ?? 0.35 },
      uJit: { value: o.jit ?? 2.0 },
      uWeight: { value: o.weight ?? 1 },
      uAlpha: { value: o.alpha ?? 1 },
      uEdge: { value: o.edge ?? 0 },
    },
    vertexShader: INK_VERT,
    fragmentShader: INK_FRAG,
    side: o.side ?? THREE.FrontSide,
    transparent: (o.alpha ?? 1) < 1,
    depthWrite: (o.alpha ?? 1) >= 1,
  });
  return m;
}

// ------------------------------------------------------------------ outlines
const OUT_VERT = /* glsl */ `
uniform float uW;
uniform vec2 uRes;
void main() {
  vec3 pos = position;
  vec3 nrm = normal;
  #ifdef USE_INSTANCING
    pos = (instanceMatrix * vec4(pos, 1.0)).xyz;
    nrm = mat3(instanceMatrix) * nrm;
  #endif
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vec4 clip = projectionMatrix * mv;
  vec3 n = normalize(normalMatrix * nrm);
  vec2 dir = (projectionMatrix * vec4(n, 0.0)).xy;
  float l = length(dir);
  dir = l > 1e-5 ? dir / l : vec2(0.0);
  clip.xy += dir * (uW * uPxW * 2.0 / uRes) * clip.w;
  gl_Position = clip;
}`;
const OUT_FRAG = /* glsl */ `
uniform vec3 uInkC;
void main() {
  gl_FragColor = vec4(uInkC, 1.0);
  #include <colorspace_fragment>
}`;
export function outlineMaterial(w = 1.6) {
  return new THREE.ShaderMaterial({
    uniforms: { uW: { value: w }, uRes: G.uRes, uInkC: G.uInkC, uPxW: G.uPx },
    vertexShader: OUT_VERT.replace('uniform vec2 uRes;', 'uniform vec2 uRes;\nuniform float uPxW;'),
    fragmentShader: OUT_FRAG,
    side: THREE.BackSide,
  });
}
const hullCache = new WeakMap();
export function hullGeometry(geo) {
  if (hullCache.has(geo)) return hullCache.get(geo);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', geo.attributes.position.clone());
  if (geo.index) g.setIndex(geo.index.clone());
  const m = mergeVertices(g, 1e-3);
  m.computeVertexNormals();
  hullCache.set(geo, m);
  return m;
}
// adds a black hull to every mesh under root (skips meshes flagged userData.noOutline)
export function outline(root, mat) {
  const list = [];
  root.traverse((o) => {
    if (!o.isMesh || o.userData.noOutline || o.userData.hull) return;
    list.push(o);
  });
  for (const o of list) {
    let h;
    if (o.isInstancedMesh) {
      h = new THREE.InstancedMesh(hullGeometry(o.geometry), mat, o.count);
      h.instanceMatrix = o.instanceMatrix;
    } else h = new THREE.Mesh(hullGeometry(o.geometry), mat);
    h.userData.hull = true;
    h.frustumCulled = o.frustumCulled;
    o.add(h);
  }
  return root;
}

// ------------------------------------------------------------------ planar shadows (hard, black)
// the shadow of every mesh under root, projected along the light onto the plane y = h
export function planarShadows(root, scene, h, mat) {
  const list = [];
  root.traverse((o) => {
    if (o.isMesh && !o.userData.hull && !o.userData.noShadow) {
      const s = new THREE.Mesh(o.geometry, mat);
      s.matrixAutoUpdate = false;
      s.frustumCulled = false;
      s.renderOrder = 1;
      scene.add(s);
      list.push([o, s]);
    }
  });
  const M = new THREE.Matrix4();
  return {
    update(lightW) {
      // plane (0, 1, 0, -h); light direction (towards the light), w = 0
      const L = lightW;
      const dot = L.y; // plane · light
      M.set(
        dot, -L.x, 0, L.x * h,
        0, dot - L.y, 0, L.y * h,
        0, -L.z, dot, L.z * h,
        0, 0, 0, dot,
      );
      root.updateMatrixWorld(true);
      for (const [o, s] of list) {
        let vis = o.visible;
        for (let q = o.parent; q && vis; q = q.parent) vis = q.visible;
        s.visible = vis;
        s.matrix.multiplyMatrices(M, o.matrixWorld);
      }
    },
  };
}
export function shadowMaterial() {
  return new THREE.MeshBasicMaterial({ color: C(PAL.ink), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false });
}

// ------------------------------------------------------------------ full-screen layers
const FS_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }`;
const FS_VERT_FRONT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// vertical brush strokes: ink streaks on a ground (behind the bottles, the hall's dark top)
const STROKES_FRAG = /* glsl */ `
uniform vec3 uBg;
uniform vec3 uFg;
uniform float uDensity;
uniform float uTop;
uniform float uPx;
uniform vec2 uRes;
uniform float uTime;
uniform float uDrift;
uniform float uClear;
varying vec2 vUv;
${NOISE}
void main() {
  vec2 fc = gl_FragCoord.xy / uPx;
  float col = floor(fc.x / 2.6);
  float r = h11(col);
  float y = vUv.y;
  float v = vn(vec2(col * 0.61, fc.y * 0.011 + r * 37.0 + uTime * uDrift));
  float v2 = vn(vec2(col * 1.37 + 5.0, fc.y * 0.05 + r * 11.0));
  // denser towards the top
  float th = uDensity * mix(1.0, 1.0 + uTop, y) * (0.85 + 0.3 * v2);
  // a clear page on the left (the text), the strokes thicken towards the right
  th *= smoothstep(uClear - 0.06, uClear + 0.12, vUv.x + (v2 - 0.5) * 0.08);
  float k = smoothstep(th - 0.015, th + 0.015, v);
  vec3 c = mix(uFg, uBg, k);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;
export function strokesLayer({ bg = PAL.paper, fg = PAL.ink, density = 0.5, top = 0.5, drift = 0, clear = -1 } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uBg: { value: C(bg) }, uFg: { value: C(fg) }, uDensity: { value: density }, uTop: { value: top }, uPx: G.uPx, uRes: G.uRes, uTime: G.uTime, uDrift: { value: drift }, uClear: { value: clear } },
    vertexShader: FS_VERT,
    fragmentShader: STROKES_FRAG,
    depthWrite: false,
    depthTest: false,
  });
  const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
  q.frustumCulled = false;
  q.renderOrder = -10;
  q.userData.noOutline = true;
  return q;
}

// diagonal rain of white dashes on red (the fall of the columns), moving with uFall
const RAIN_FRAG = /* glsl */ `
uniform vec3 uBg;
uniform vec3 uFg;
uniform float uPx;
uniform float uFall;
uniform float uAmt;
varying vec2 vUv;
${NOISE}
void main() {
  vec2 fc = gl_FragCoord.xy / uPx;
  vec2 dir = normalize(vec2(0.42, -1.0));
  vec2 nrm = vec2(-dir.y, dir.x);
  float across = dot(fc, nrm);
  float along = dot(fc, dir);
  float lane = floor(across / 9.0);
  float r = h11(lane * 1.31);
  float a = along * 0.008 + r * 50.0 + uFall * (2.0 + r * 3.0);
  float seg = fract(a);
  float on = step(0.86 - 0.06 * r, seg) * step(0.55, h11(floor(a) + lane * 7.0)) * step(0.35, r);
  float w = abs(fract(across / 9.0) - 0.5) * 2.0;
  on *= 1.0 - smoothstep(0.12 + 0.15 * r, 0.25 + 0.15 * r, w);
  vec3 c = mix(uBg, uFg, on * uAmt);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;
export function rainLayer({ bg = PAL.red, fg = PAL.paper } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uBg: { value: C(bg) }, uFg: { value: C(fg) }, uPx: G.uPx, uFall: { value: 0 }, uAmt: { value: 1 } },
    vertexShader: FS_VERT,
    fragmentShader: RAIN_FRAG,
    depthWrite: false,
    depthTest: false,
  });
  const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
  q.frustumCulled = false;
  q.renderOrder = -10;
  q.userData.noOutline = true;
  return q;
}

// manga speed lines: radial wedges from a focus, ink on paper (the vision)
const SPEED_FRAG = /* glsl */ `
uniform vec3 uBg;
uniform vec3 uFg;
uniform vec2 uRes;
uniform vec2 uFocus;
uniform float uSpin;
uniform float uHole;
varying vec2 vUv;
${NOISE}
void main() {
  vec2 d = (gl_FragCoord.xy / uRes - uFocus) * vec2(uRes.x / uRes.y, 1.0);
  float r = length(d);
  float a = atan(d.y, d.x) / 6.2831853 + 0.5;
  float bin = a * 220.0 + uSpin;
  float id = floor(bin);
  float fr = abs(fract(bin) - 0.5) * 2.0;
  float w = h11(id) * step(0.45, h11(id + 3.1)) * smoothstep(uHole, uHole + 0.55, r + 0.12 * h11(id + 9.0));
  float k = 1.0 - smoothstep(w - 0.08, w + 0.08, fr);
  vec3 c = mix(uBg, uFg, k);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;
export function speedLayer({ bg = PAL.paper, fg = PAL.ink } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uBg: { value: C(bg) }, uFg: { value: C(fg) }, uRes: G.uRes, uFocus: { value: new THREE.Vector2(0.5, 0.5) }, uSpin: { value: 0 }, uHole: { value: 0.18 } },
    vertexShader: FS_VERT,
    fragmentShader: SPEED_FRAG,
    depthWrite: false,
    depthTest: false,
  });
  const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
  q.frustumCulled = false;
  q.renderOrder = -10;
  q.userData.noOutline = true;
  return q;
}

// ------------------------------------------------------------------ the cuts between the sets
// uT 0..1 across the cut: the cover grows until 0.5 (the set changes under it), then opens.
// types: 0 streaks (black and paper strokes hang from the top, then fall away), 1 flood (the red
// spreads from a point, then strokes open it), 2 bands (paper bands slide in, then out), 3 burst
// (speed lines rush in from the edges, then the centre opens)
const CUT_FRAG = /* glsl */ `
uniform float uT;
uniform float uType;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uInkC;
uniform vec2 uRes;
uniform float uPx;
uniform vec2 uO;
varying vec2 vUv;
${NOISE}
void main() {
  vec2 fc = gl_FragCoord.xy / uPx;
  vec2 uv = gl_FragCoord.xy / uRes;
  float kin = clamp(uT * 2.0, 0.0, 1.0);
  float kout = clamp(uT * 2.0 - 1.0, 0.0, 1.0);
  float col = floor(fc.x / 2.0);
  float r = vn(vec2(fc.x * 0.045, 3.0)) * 0.6 + h11(col + 7.0) * 0.4;
  float yy = 1.0 - uv.y + (vn(vec2(col * 0.5, uv.y * 24.0)) - 0.5) * 0.08;
  float cov = 0.0;
  vec3 c = uC1;
  if (uType < 0.5) {
    float e1 = kin * 1.7 - r * 0.7;
    float e2 = kout * 1.7 - r * 0.7;
    cov = step(yy, e1) * step(e2, yy);
    c = vn(vec2(fc.x * 0.21, fc.y * 0.006 + h11(col) * 3.0)) > 0.4 ? uC1 : uC2;
  } else if (uType < 1.5) {
    vec2 d = (uv - uO) * vec2(uRes.x / uRes.y, 1.0);
    float ang = atan(d.y, d.x);
    float rad = length(d) / (1.0 + 0.35 * (fbm(vec2(ang * 1.6, 2.0)) - 0.5));
    float R = kin * 1.9;
    float inside = step(rad, R);
    float edge = step(R - 0.02, rad) * inside;
    float e2 = kout * 1.7 - r * 0.7;
    cov = inside * step(e2, yy);
    c = mix(uC1, uInkC, edge);
    // the opening strokes: a black lip on each stroke's end
    c = mix(c, uInkC, step(yy, e2 + 0.025) * step(0.001, kout));
  } else if (uType < 2.5) {
    float n = 6.0;
    float i = floor(uv.y * n);
    float x = mod(i, 2.0) < 0.5 ? uv.x : 1.0 - uv.x;
    float del = h11(i + 3.0) * 0.35;
    float e1 = kin * 1.35 - del;
    float e2 = kout * 1.35 - del;
    cov = step(x, e1) * step(e2, x);
    float fy = fract(uv.y * n);
    c = (fy < 0.035 || fy > 0.965) ? uInkC : uC1;
  } else {
    vec2 d = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
    float rr = length(d);
    float a = atan(d.y, d.x) / 6.2831853 + 0.5;
    float bin = a * 200.0;
    float id = floor(bin);
    float fr = abs(fract(bin) - 0.5) * 2.0;
    float jag = 0.18 * h11(id + 1.7);
    float e1 = (1.0 - kin) * 1.15 - jag;
    float e2 = kout * 1.15 + jag * 0.5;
    cov = step(e1, rr) * step(e2, rr);
    float w = h11(id) * step(0.4, h11(id + 3.1)) * smoothstep(0.05, 0.75, rr);
    c = mix(uC1, uC2, 1.0 - smoothstep(w - 0.1, w + 0.1, fr));
  }
  if (cov < 0.5) discard;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;
export function cutLayer() {
  const m = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uType: { value: 0 }, uC1: { value: C(PAL.ink) }, uC2: { value: C(PAL.paper) }, uInkC: G.uInkC, uRes: G.uRes, uPx: G.uPx, uO: { value: new THREE.Vector2(0.5, 0.5) } },
    vertexShader: FS_VERT_FRONT,
    fragmentShader: CUT_FRAG,
    depthWrite: false,
    depthTest: false,
  });
  const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
  q.frustumCulled = false;
  return q;
}
