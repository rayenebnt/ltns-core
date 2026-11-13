import * as THREE from 'three';
import { TOWER, floorY, ROOM_FLOOR, ROOM } from './config.js';
import { ATMOS_GLSL, hazeUniform } from './atmosphere.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const { ga: A, gb: B, gr: R, slabT: T } = TOWER;
const LS = B - R; // half length of the east / west straight parts
const LN = A - R; // half length of the north / south straight parts
const ARC = (Math.PI * R) / 2;
export const PERIM = 4 * LS + 4 * LN + 4 * ARC;
export const BAYS = 56;
export const BAY_W = PERIM / BAYS;
export const ROOF = TOWER.floors + 1;
// (Altière) construction: the structure is clipped above CLIP_S (y <= constant), the glass above CUT_G
export const CLIP_S = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e9);
export const CUT_G = { value: 1e9 };
// part of the floor-14 glass line that belongs to the real living room
export const ROOM_S0 = -ROOM.z1; // east face runs north from (A, 0): s = -z
export const ROOM_S1 = LS + ARC + (LN - ROOM.x0);
export const DOOR_S = -ROOM.doorZ;

const PIECES = [
  [LS, (t) => [A, -t, 0, -1]],
  [ARC, (t) => { const f = t / R; return [LN + R * Math.cos(f), -LS - R * Math.sin(f), -Math.sin(f), -Math.cos(f)]; }],
  [2 * LN, (t) => [LN - t, -B, -1, 0]],
  [ARC, (t) => { const f = t / R; return [-LN - R * Math.sin(f), -LS - R * Math.cos(f), -Math.cos(f), Math.sin(f)]; }],
  [2 * LS, (t) => [-A, -LS + t, 0, 1]],
  [ARC, (t) => { const f = t / R; return [-LN - R * Math.cos(f), LS + R * Math.sin(f), Math.sin(f), Math.cos(f)]; }],
  [2 * LN, (t) => [-LN + t, B, 1, 0]],
  [ARC, (t) => { const f = t / R; return [LN + R * Math.sin(f), LS + R * Math.cos(f), Math.cos(f), -Math.sin(f)]; }],
  [LS, (t) => [A, LS - t, 0, -1]],
];

// point on the glass line at arc length s: { x, z, tx, tz, nx, nz } (n = outward normal)
export function glassLine(s) {
  s = ((s % PERIM) + PERIM) % PERIM;
  for (const [len, fn] of PIECES) {
    if (s <= len + 1e-9) {
      const [x, z, tx, tz] = fn(s);
      return { x, z, tx, tz, nx: -tz, nz: tx };
    }
    s -= len;
  }
  const [x, z, tx, tz] = PIECES[PIECES.length - 1][1](LS);
  return { x, z, tx, tz, nx: -tz, nz: tx };
}

function loopDist(a, b) {
  const d = Math.abs(a - b) % PERIM;
  return Math.min(d, PERIM - d);
}

// depth of the balcony slab beyond the glass line: rippling from floor to floor
export function balconyDepth(s, k) {
  if (k >= ROOF) return 4.2; // cantilevered roof
  const u = (s / PERIM) * Math.PI * 2;
  let d = 2.25 + 0.72 * Math.sin(2 * u + k * 0.52) + 0.42 * Math.sin(3 * u - k * 0.31 + 1.7) + 0.16 * Math.sin(5 * u + k * 0.83);
  if (k === ROOM_FLOOR || k === ROOM_FLOOR + 1) {
    const w = Math.exp(-((loopDist(s, DOOR_S) / 4.6) ** 2));
    d = d * (1 - w) + 3.3 * w;
  }
  return Math.min(3.5, Math.max(1.35, d));
}

// ------------------------------------------------------------------- slabs
export function sampleLoop(straightStep = 0.8, arcSegs = 16) {
  const out = [];
  let s0 = 0;
  PIECES.forEach(([len], i) => {
    const isArc = i % 2 === 1;
    const n = isArc ? arcSegs : Math.max(1, Math.round(len / straightStep));
    for (let k = 0; k < n; k++) out.push(s0 + (len * k) / n);
    s0 += len;
  });
  return out;
}

// Profile of a balcony slab across its edge, as [w (beyond the glass line), y, nw, ny, part]
// part: 0 top (stone), 1 edge (white), 2 soffit (warm white). The outer ~0.6 m drops into a
// bold rounded bullnose, while the slab stays thin at the glass line.
function slabProfile(d, thick, drop, inner) {
  const prof = [[inner, 0, 0, 1, 0]];
  const H = Math.max(thick, drop);
  const a = Math.min(0.34, H * 0.42); // horizontal semi-axis of the rounded nose
  const b = H / 2;
  prof.push([d - a, 0, 0, 1, 0]);
  const n = 8;
  for (let j = 0; j <= n; j++) {
    const th = Math.PI / 2 - (j / n) * Math.PI;
    const c = Math.cos(th), sn = Math.sin(th);
    const nl = Math.hypot(c / a, sn / b);
    prof.push([d - a + a * c, -b + b * sn, c / a / nl, sn / b / nl, 1]);
  }
  if (drop > thick + 0.01) {
    const back = Math.max(inner + 0.1, d - 0.62);
    prof.push([d - a, -H, 0, -1, 1]);
    prof.push([back, -H, 0, -1, 1]);
    prof.push([back, -H, -1, 0, 1]);
    prof.push([back, -thick, -1, 0, 1]);
    prof.push([back, -thick, 0, -1, 2]);
  } else {
    prof.push([d - a, -H, 0, -1, 2]);
  }
  prof.push([inner, -thick, 0, -1, 2]);
  prof.push([inner, -thick, -1, 0, 1]);
  prof.push([inner, 0, -1, 0, 1]);
  return prof;
}

function slabGeometry(levels, samples) {
  const N = samples.length;
  const pos = [], nrm = [], col = [], idx = [];
  const trav = [0.84, 0.73, 0.6];
  const white = [0.93, 0.9, 0.85];
  const soffitCol = [0.9, 0.87, 0.82];
  let base = 0;
  for (const { y, thick, drop = 0, depth, inner = -0.45, top: topCol = trav, side: sideCol = white, under = soffitCol } of levels) {
    let P = 0;
    for (let i = 0; i < N; i++) {
      const s = samples[i];
      const g = glassLine(s);
      const prof = slabProfile(depth(s), thick, drop, inner);
      P = prof.length;
      for (const [w, py, nw, ny, part] of prof) {
        pos.push(g.x + g.nx * w, y + py, g.z + g.nz * w);
        nrm.push(g.nx * nw, ny, g.nz * nw);
        const c = part === 0 ? topCol : part === 1 ? sideCol : under;
        col.push(c[0], c[1], c[2]);
      }
    }
    for (let i = 0; i < N; i++) {
      const i1 = (i + 1) % N;
      for (let j = 0; j < P - 1; j++) {
        const a = base + i * P + j, b = base + i * P + j + 1, c = base + i1 * P + j, d = base + i1 * P + j + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
    base += N * P;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  return geo;
}

// ------------------------------------------------- vertical ribbons along a line
function ribbon(parts, offset) {
  // parts: [{ s0, s1, y0, y1, floor }]
  const pos = [], nrm = [], uv = [], fl = [], hh = [], idx = [];
  let base = 0;
  for (const { s0, s1, y0, y1, floor, k } of parts) {
    const n = Math.max(2, Math.ceil(((s1 - s0) / PERIM) * 300));
    for (let i = 0; i <= n; i++) {
      const s = s0 + ((s1 - s0) * i) / n;
      const g = glassLine(s);
      const off = typeof offset === 'function' ? offset(s, k) : offset;
      for (const [yy, v] of [[y0, 0], [y1, y1 - y0]]) {
        pos.push(g.x + g.nx * off, yy, g.z + g.nz * off);
        nrm.push(g.nx, 0, g.nz);
        uv.push(s, v);
        fl.push(floor);
        hh.push(y1 - y0);
      }
    }
    for (let i = 0; i < n; i++) {
      const a = base + i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, c, b, b, c, d);
    }
    base += (n + 1) * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('aFloor', new THREE.Float32BufferAttribute(fl, 1));
  geo.setAttribute('aH', new THREE.Float32BufferAttribute(hh, 1));
  geo.setIndex(idx);
  return geo;
}

// --------------------------------------------- facade glass with fake interiors
const FACADE_VERT = /* glsl */ `
  attribute float aFloor;
  attribute float aH;
  varying vec3 vRel;
  varying vec3 vN;
  varying vec2 vUv;
  varying float vFloor;
  varying float vH;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vRel = wp.xyz - cameraPosition;
    vN = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    vFloor = aFloor;
    vH = aH;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const FACADE_FRAG = /* glsl */ `
  uniform float fogDensity;
  uniform vec3 uHi;     // floor, weight (current highlight)
  uniform vec3 uHi2;    // floor, weight (fading highlight)
  uniform float uBayW;
  uniform float uLit;
  uniform float uCutY;
  varying vec3 vRel;
  varying vec3 vN;
  varying vec2 vUv;
  varying float vFloor;
  varying float vH;
  ${ATMOS_GLSL}

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    if (vRel.y + cameraPosition.y > uCutY) discard;
    vec3 N = normalize(vN);
    vec3 Tg = vec3(N.z, 0.0, -N.x);
    vec3 V = normalize(vRel);
    float fl = floor(vFloor + 0.5);   // varyings are not exact integers
    float H = vH;
    bool lobby = fl < 0.5;
    float W = uBayW * (lobby ? 4.0 : 2.0);
    float room = floor(vUv.x / W);
    float ux = vUv.x - room * W;
    float r1 = hash(vec2(room, fl));
    float r2 = hash(vec2(room + 31.7, fl * 1.3 + 2.0));
    float r3 = hash(vec2(room * 0.7 + 3.1, fl + 17.0));
    float r4 = hash(vec2(room + 71.3, fl + 5.0));
    float hi = max(abs(fl - uHi.x) < 0.5 ? uHi.y : 0.0, abs(fl - uHi2.x) < 0.5 ? uHi2.y : 0.0);
    // lights are switched on per apartment (groups of three rooms), a few rooms stay dark
    float apt = floor(room / 3.0);
    float ra = hash(vec2(apt * 1.73 + 0.31, fl * 2.11 + 7.0));
    float lit = (ra < uLit) ? (r1 < 0.22 ? 0.25 : 1.0) : 0.0;
    if (lobby) lit = 1.0;
    lit = max(lit, hi);
    // close to the camera about half of the units glow behind the glass (as in a dusk shot);
    // continuous in each pixel's distance, so nothing pops, and no effect on the hero
    float nearL = 1.0 - smoothstep(60.0, 140.0, length(vRel));
    lit = max(lit, nearL * step(ra, 0.45) * (r1 < 0.22 ? 0.25 : 1.0));

    // ray through a virtual room behind the glass (interior mapping)
    vec3 d = vec3(dot(V, Tg), V.y, max(-dot(V, N), 0.03));
    float D = lobby ? 10.0 : 4.6 + r2 * 3.2;
    vec3 o = vec3(ux, vUv.y, 0.0);
    float tX = 1e6;
    if (d.x > 1e-4) tX = (W - o.x) / d.x;
    else if (d.x < -1e-4) tX = -o.x / d.x;
    float tY = 1e6;
    if (d.y > 1e-4) tY = (H - o.y) / d.y;
    else if (d.y < -1e-4) tY = -o.y / d.y;
    float t = D / d.z;
    int face = 0;                       // 0 back wall, 1 side wall, 2 ceiling, 3 floor
    if (tX < t) { t = tX; face = 1; }
    if (tY < t) { t = tY; face = d.y > 0.0 ? 2 : 3; }
    vec3 p = o + d * t;

    vec3 warm = mix(vec3(1.0, 0.5, 0.18), vec3(1.0, 0.62, 0.3), r3);
    // the selected floor glows a deeper amber: ACES turns a less saturated orange into cream
    warm = mix(warm, vec3(1.0, 0.38, 0.06), hi);
    vec3 lamp = vec3(W * 0.5, H - 0.2, D * 0.42);
    float dl = length(p - lamp);
    float illum = lit * (0.22 + 1.3 / (1.0 + dl * dl * 0.45)) * 2.0 * (1.0 + hi * 2.5);
    vec3 amb = vec3(0.075, 0.07, 0.066); // golden-hour daylight inside unlit rooms
    vec3 light = amb + warm * illum;
    vec3 c;
    if (face == 2) {
      c = vec3(0.80, 0.76, 0.70) * (light * 1.15 + warm * lit * 0.25 * smoothstep(1.2, 0.0, dl));
    } else if (face == 3) {
      c = mix(vec3(0.30, 0.21, 0.15), vec3(0.55, 0.50, 0.45), step(0.5, r3)) * light * 0.8;
    } else if (face == 0) {
      vec3 wall = mix(vec3(0.70, 0.64, 0.56), vec3(0.36, 0.25, 0.18), step(0.55, r4));
      vec2 q = vec2(p.x - W * (0.3 + 0.4 * r2), p.y - H * 0.55);
      if (r3 > 0.45 && abs(q.x) < 0.5 && abs(q.y) < 0.35) wall = mix(vec3(0.15, 0.2, 0.3), vec3(0.6, 0.4, 0.25), r1);
      c = wall * light;
    } else {
      c = vec3(0.62, 0.57, 0.51) * light * 0.82;
    }
    // furniture silhouette layer
    float zf = D * (0.38 + 0.25 * r4);
    float tf = zf / d.z;
    if (tf < t) {
      vec3 pf = o + d * tf;
      float x0 = W * (0.1 + 0.35 * r2);
      float x1 = x0 + W * (0.3 + 0.25 * r3);
      if (pf.y < 0.82 + 0.1 * r1 && pf.x > x0 && pf.x < x1) c = vec3(0.07, 0.065, 0.06) * (amb * 2.0 + warm * illum * 0.6);
    }
    // sheer curtains near the glass
    float cw = r4 * 0.45;
    float curtain = (r2 > 0.35) ? max(smoothstep(cw + 0.05, cw - 0.05, ux / W), smoothstep(1.0 - cw - 0.05, 1.0 - cw + 0.05, ux / W)) : 0.0;
    vec3 sheer = vec3(0.85, 0.78, 0.68) * (amb * 3.0 + warm * illum * 0.55 + 0.05);
    c = mix(c, sheer, curtain * 0.75);
    c *= exp(-t * 0.035);
    if (lobby) c *= vec3(2.5, 2.2, 1.9);

    // glass: sky-reflecting coated glass over the interior
    float cosi = clamp(-dot(V, N), 0.0, 1.0);
    float F = 0.2 + 0.8 * pow(1.0 - cosi, 5.0);
    vec3 Rf = normalize(reflect(V, N));
    vec3 refl = skyClouds(Rf, skyBase(Rf));
    // a lit room outshines the reflection a little (reads warm, not lavender, behind blue sky)
    vec3 col = c * 0.55 * (1.0 - F) + refl * F * (1.0 - 0.45 * lit * (1.0 - hi));
    // far away a room is a few pixels wide: replace it by its average to avoid shimmer
    float foot = max(fwidth(vUv.x), fwidth(vUv.y));
    float lod = smoothstep(0.05, 0.22, foot);
    // (lit apartments read as warm bars from the hero distance, unlit ones keep the sky
    // reflection; the selected floor is one even amber band, its interior light dominating
    // the reflection)
    vec3 warmFar = mix(vec3(1.0, 0.47, 0.13), vec3(1.0, 0.38, 0.05), hi);
    vec3 avgIn = lit * warmFar * mix(0.6 + 0.4 * r2, 0.9, hi) * mix(1.6, 2.0, hi);
    vec3 avg = avgIn * 0.55 * (1.0 - F) + refl * F * (1.0 - 0.6 * lit - 0.3 * hi);
    if (lobby) avg = mix(avg, warm * 0.9, 0.6);
    col = mix(col, avg, lod);
    col += vec3(1.0, 0.36, 0.02) * hi * 0.8;    // the selected floor glows gold through the glass
    // slight darkening at the top and bottom of each floor (slab shadow)
    float ao = smoothstep(0.0, 0.5, vUv.y) * (0.75 + 0.25 * smoothstep(H, H - 0.6, vUv.y));
    col *= mix(1.0, ao, 0.5);
    col = applyAtmos(col, vRel, cameraPosition.y);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

const GLASS_VERT = /* glsl */ `
  varying vec3 vRel;
  varying vec3 vN;
  varying vec2 vUv;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vRel = wp.xyz - cameraPosition;
    vN = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const GLASS_FRAG = /* glsl */ `
  uniform float uCutY;
  uniform float fogDensity;
  uniform float uF0;
  uniform float uTint;
  uniform float uEdge;
  uniform vec3 uGlow;   // light added by the room behind (the selected floor glowing in the hero)
  varying vec3 vRel;
  varying vec3 vN;
  varying vec2 vUv;
  ${ATMOS_GLSL}
  void main() {
    if (vRel.y + cameraPosition.y > uCutY) discard;
    vec3 V = normalize(vRel);
    vec3 N = normalize(vN);
    if (dot(N, V) > 0.0) N = -N;
    float cosi = clamp(-dot(V, N), 0.0, 1.0);
    float F = uF0 + (1.0 - uF0) * pow(1.0 - cosi, 5.0);
    vec3 refl = skyBase(reflect(V, N));
    float edge = uEdge * smoothstep(0.955, 0.99, vUv.y);
    vec3 c = refl * F + vec3(0.55, 0.68, 0.64) * uTint * 0.25 + edge * vec3(1.0, 0.86, 0.72) * 0.6 + uGlow;
    float a = clamp(F + uTint + edge * 0.5, 0.0, 1.0);
    c = applyAtmos(c, vRel, cameraPosition.y);
    gl_FragColor = vec4(c, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

export function glassMaterial({ f0 = 0.05, tint = 0.08, edge = 1.0 } = {}) {
  return new THREE.ShaderMaterial({
    name: 'Glass',
    uniforms: { fogDensity: hazeUniform, uCutY: CUT_G, uF0: { value: f0 }, uTint: { value: tint }, uEdge: { value: edge }, uGlow: { value: new THREE.Color(0, 0, 0) } },
    vertexShader: GLASS_VERT,
    fragmentShader: GLASS_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
}

// ------------------------------------------------------------------ build all
export function createTower({ envMap, lowQuality = false }) {
  const group = new THREE.Group();
  group.name = 'tower';
  const ROOF_T = 1.2;

  // slabs: floors 1..26 with a dropped bullnose, a thick cantilevered roof, the podium terrace
  const levels = [];
  for (let k = 1; k < ROOF; k++) {
    levels.push({ y: floorY(k), thick: T, drop: 0.6, depth: (s) => balconyDepth(s, k) });
  }
  levels.push({ y: floorY(ROOF), thick: ROOF_T, depth: (s) => balconyDepth(s, ROOF), top: [0.86, 0.84, 0.8] });
  const stone = [0.72, 0.66, 0.56]; // travertine podium
  levels.push({ y: TOWER.ground + 0.05, thick: 1.6, depth: () => 9.5, inner: -0.5, top: stone, side: [0.6, 0.55, 0.46], under: stone });
  const slabMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0, envMap, envMapIntensity: 0.75 });
  // golden-hour bounce: the sunlit balconies and sea light the soffits warm from below (they
  // would otherwise mirror the dark sea of the sky-only environment map and read blue-grey);
  // the travertine tops keep a warmer, less sky-blue sheen
  slabMat.onBeforeCompile = (sh) => {
    sh.uniforms.uBounce = { value: new THREE.Color(0.44, 0.37, 0.3) };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uBounce;')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      {
        vec3 nW = inverseTransformDirection(normal, viewMatrix);
        float down = clamp(-nW.y, 0.0, 1.0);
        float up = clamp(nW.y, 0.0, 1.0);
        reflectedLight.indirectDiffuse += diffuseColor.rgb * (uBounce * down + vec3(0.1, 0.075, 0.045) * up);
        reflectedLight.indirectSpecular *= mix(vec3(1.0), vec3(0.25, 0.22, 0.2), down);
        reflectedLight.indirectSpecular *= mix(vec3(1.0), vec3(0.9, 0.8, 0.66), up);
      }`);
  };
  const slabs = new THREE.Mesh(slabGeometry(levels, sampleLoop(lowQuality ? 1.2 : 0.8, lowQuality ? 10 : 16)), slabMat);
  slabs.name = 'slabs';
  group.add(slabs);

  // facade glass, one ribbon per floor; floor 14 leaves a gap for the real living room
  const parts = [];
  for (let k = 0; k <= TOWER.floors; k++) {
    const y0 = k === 0 ? TOWER.ground + 0.05 : floorY(k);
    const y1 = floorY(k + 1) - (k + 1 === ROOF ? ROOF_T : T);
    if (k === ROOM_FLOOR) {
      parts.push({ s0: ROOM_S1, s1: PERIM + ROOM_S0, y0, y1, floor: k, k });
    } else {
      parts.push({ s0: 0, s1: PERIM, y0, y1, floor: k, k });
    }
  }
  const facadeMat = new THREE.ShaderMaterial({
    name: 'Facade',
    uniforms: {
      fogDensity: hazeUniform,
      uHi: { value: new THREE.Vector3(8, 0, 0) },
      uHi2: { value: new THREE.Vector3(-5, 0, 0) },
      uBayW: { value: BAY_W },
      uLit: { value: 0.14 },
      uCutY: CUT_G,
    },
    vertexShader: FACADE_VERT,
    fragmentShader: FACADE_FRAG,
  });
  const facade = new THREE.Mesh(ribbon(parts, 0), facadeMat);
  facade.name = 'facade';
  group.add(facade);

  // glass railings on the balconies (set back from the rounded nose)
  const rails = [];
  for (let k = 1; k < ROOF; k++) {
    rails.push({ s0: 0, s1: PERIM, y0: floorY(k), y1: floorY(k) + 1.05, floor: k, k });
  }
  const railGeo = ribbon(rails, (s, k) => balconyDepth(s, k) - 0.42);
  // v must run 0..1 for the edge highlight
  const ruv = railGeo.attributes.uv;
  for (let i = 0; i < ruv.count; i++) ruv.setY(i, ruv.getY(i) > 0.01 ? 1 : 0);
  const railMat = glassMaterial({ f0: 0.06, tint: 0.07, edge: 1.0 });
  const railings = new THREE.Mesh(railGeo, railMat);
  railings.name = 'railings';
  railings.renderOrder = 5;
  group.add(railings);

  // mullions (instanced), slim warm bronze
  const mullGeo = new THREE.BoxGeometry(0.06, 1, 0.1);
  const mullMat = new THREE.MeshStandardMaterial({ color: 0x6b5848, roughness: 0.38, metalness: 0.6, envMap, envMapIntensity: 1.0 });
  const mullList = [];
  for (let k = 0; k <= TOWER.floors; k++) {
    const y0 = k === 0 ? TOWER.ground + 0.05 : floorY(k);
    const y1 = floorY(k + 1) - (k + 1 === ROOF ? ROOF_T : T);
    const step = k === 0 ? 2 : 1;
    for (let j = 0; j < BAYS; j += step) {
      const s = j * BAY_W;
      if (k === ROOM_FLOOR && s > ROOM_S0 - 0.05 && s < ROOM_S1 + 0.05) continue;
      mullList.push([s, y0, y1]);
    }
  }
  const mullions = new THREE.InstancedMesh(mullGeo, mullMat, mullList.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  mullList.forEach(([s, y0, y1], i) => {
    const g = glassLine(s);
    q.setFromAxisAngle(up, Math.atan2(g.nx, g.nz));
    m.compose(p.set(g.x + g.nx * 0.04, (y0 + y1) / 2, g.z + g.nz * 0.04), q, sc.set(1, y1 - y0, 1));
    mullions.setMatrixAt(i, m);
  });
  mullions.name = 'mullions';
  group.add(mullions);

  // warm downlights in the slab soffits, with a soft glow on the soffit around each one
  const dots = [];
  for (let k = 2; k <= ROOF; k++) {
    const yb = floorY(k) - (k === ROOF ? ROOF_T : T) - 0.004;
    for (let j = 0; j < 36; j++) {
      const s = (j + 0.5) * (PERIM / 36);
      dots.push([s, yb, Math.min(balconyDepth(s, k) - 0.75, balconyDepth(s, k) * 0.45)]);
    }
  }
  const dotGeo = new THREE.CircleGeometry(0.07, 10);
  dotGeo.rotateX(Math.PI / 2);
  const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.74, 0.48).multiplyScalar(6), side: THREE.DoubleSide });
  const soffit = new THREE.InstancedMesh(dotGeo, dotMat, dots.length);
  const haloGeo = new THREE.PlaneGeometry(1.1, 1.1);
  haloGeo.rotateX(Math.PI / 2);
  const haloMat = new THREE.MeshBasicMaterial({ map: haloTexture(), color: new THREE.Color(1.0, 0.7, 0.42).multiplyScalar(0.55), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const halo = new THREE.InstancedMesh(haloGeo, haloMat, dots.length);
  dots.forEach(([s, y, w], i) => {
    const g = glassLine(s);
    m.makeTranslation(g.x + g.nx * w, y, g.z + g.nz * w);
    soffit.setMatrixAt(i, m);
    m.makeTranslation(g.x + g.nx * w, y - 0.002, g.z + g.nz * w);
    halo.setMatrixAt(i, m);
  });
  soffit.name = 'soffit-lights';
  halo.name = 'soffit-halos';
  halo.renderOrder = 3;
  group.add(soffit, halo);

  // highlight band: a warm cove strip under the slab of the selected floor (hero only)
  const bandGeo = ribbon([{ s0: 0, s1: PERIM, y0: 0, y1: 0.12, floor: 0, k: 0 }], 0.1);
  const bandMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.62, 0.32), transparent: true, opacity: 1 });
  const band = new THREE.Mesh(bandGeo, bandMat);
  band.name = 'band';
  group.add(band);

  // warm bollards around the forecourt edge (one instanced mesh, emissive heads via vertex colour)
  const bolGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.8, 10);
  bolGeo.translate(0, 0.4, 0);
  const bolCol = [];
  const bp = bolGeo.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const glow = bp.getY(i) > 0.62;
    bolCol.push(...(glow ? [1.0, 0.66, 0.36] : [0.05, 0.045, 0.04]));
  }
  bolGeo.setAttribute('color', new THREE.Float32BufferAttribute(bolCol, 3));
  const bolMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(4.0, 4.0, 4.0) });
  const nBol = 40;
  const bollards = new THREE.InstancedMesh(bolGeo, bolMat, nBol);
  for (let i = 0; i < nBol; i++) {
    const g = glassLine((i + 0.5) * (PERIM / nBol));
    m.makeTranslation(g.x + g.nx * 9.15, TOWER.ground + 0.05, g.z + g.nz * 9.15);
    bollards.setMatrixAt(i, m);
  }
  bollards.name = 'bollards';
  group.add(bollards);

  // forecourt: a travertine kerb ring at the edge of the paving and eight planters with clipped
  // shrubs (one mesh, vertex colours)
  {
    const parts = [];
    const kerb = new THREE.LatheGeometry([[27.7, -0.1], [27.7, 0.2], [27.62, 0.28], [27.23, 0.28], [27.15, 0.2], [27.15, -0.1]].map(([r, y]) => new THREE.Vector2(r, y)), 128);
    parts.push([kerb, [0.72, 0.66, 0.56]]);
    for (let i = 0; i < 8; i++) {
      const a = ((i + 0.5) / 8) * Math.PI * 2;
      const x = Math.cos(a) * 24.6, z = Math.sin(a) * 24.6;
      const pot = new THREE.CylinderGeometry(0.85, 0.72, 0.8, 20);
      pot.translate(x, 0.4, z);
      parts.push([pot, [0.7, 0.64, 0.54]]);
      const bush = new THREE.IcosahedronGeometry(0.82, 1);
      bush.scale(1, 0.82, 1);
      bush.translate(x, 1.25, z);
      parts.push([bush, [0.06, 0.09, 0.045]]);
    }
    const geos = parts.map(([g, c]) => {
      const n = g.attributes.position.count;
      const col = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) col.set(c, k * 3);
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return g.index ? g.toNonIndexed() : g;
    });
    const merged = mergeGeometries(geos.map((g) => { g.deleteAttribute('uv'); return g; }), false);
    const court = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, envMap, envMapIntensity: 0.7 }));
    court.position.y = TOWER.ground;
    court.name = 'forecourt';
    group.add(court);
  }

  // pool on the terrace in front of the lobby (local +x = south once the building is turned)
  const coping = new THREE.Mesh(
    new THREE.PlaneGeometry(5.4, 15.4).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(0.86, 0.81, 0.72), roughness: 0.6, envMap, envMapIntensity: 0.8 })
  );
  coping.position.set(TOWER.ga + 5.4, TOWER.ground + 0.065, -1.0);
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 14.2).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(0.1, 0.55, 0.6), roughness: 0.05, metalness: 0.0, envMap, envMapIntensity: 1.3, emissive: new THREE.Color(0.05, 0.42, 0.46), emissiveIntensity: 0.9 })
  );
  pool.position.set(TOWER.ga + 5.4, TOWER.ground + 0.075, -1.0);
  coping.name = 'pool-coping';
  pool.name = 'pool';
  group.add(coping, pool);

  return {
    group,
    facadeMat,
    band,
    bandMat,
    soffit,
    soffitMat: dotMat,
    halo,
    haloMat,
    setBandFloor(k) {
      band.position.y = floorY(k + 1) - T - 0.13;
    },
  };
}

// radial glow sprite for the soffit downlights
function haloTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
