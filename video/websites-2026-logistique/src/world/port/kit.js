// Port module: geometry kit and material patches shared by the cavalier, the containers, the truck
// and the terminal.
//
// Kit: merges many small parts into ONE BufferGeometry with, per vertex, a linear colour and
// aKit = (roughness, metalness, emissive, decal). One MeshStandardMaterial patched by kitMaterial()
// reads them, so a whole machine is one draw call (plus its shadow).
//
// Studio fade: every port material ends with a mix toward the paper colour #eef0f1 (in output
// space, so it matches the clear colour exactly) by uStudio × smoothstep(fadeZ) of the depth north
// of the hero lane: the background stacks melt into the white void in the side view, and come back
// in full colour from above (uStudio → 0 during the crane).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const PAPER = '#eef0f1';

// uniforms shared by every port material (one object, so one update reaches them all)
export const shared = {
  uStudio: { value: 1 }, // 1 = side-view studio void, 0 = full colour (top view)
  uPaper: { value: new THREE.Color(PAPER) }, // linear
  uFadeZ: { value: new THREE.Vector2(2, 7.5) }, // fade starts at this depth north of z = 0, e-folding length (m)
  uFadeMax: { value: 0.985 },
  uTime: { value: 0 },
};

// ---------------------------------------------------------------- colours
const _c = new THREE.Color();
export const lin = (hex, k = 1) => {
  _c.set(hex);
  return [_c.r * k, _c.g * k, _c.b * k];
};

// ---------------------------------------------------------------- geometry helpers
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

export function mat(pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  _e.set(rot[0], rot[1], rot[2], 'XYZ');
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_p.set(pos[0], pos[1], pos[2]), _q.clone(), _s.set(scale[0], scale[1], scale[2]).clone());
}

const rbCache = new Map();
// rounded box (bevelled edges catch highlights); cached per size
export function rbox(w, h, d, r = 0.04, seg = 1) {
  r = Math.min(r, w * 0.49, h * 0.49, d * 0.49);
  const key = [w, h, d, r, seg].map((v) => v.toFixed(4)).join(',');
  let g = rbCache.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, seg, r);
    rbCache.set(key, g);
  }
  return g;
}
export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const cyl = (rt, rb, h, n = 16, open = false) => new THREE.CylinderGeometry(rt, rb, h, n, 1, open);

// a tube along a polyline (handrails, pipes, hoses): pts = [[x,y,z], ...]
export function tube(pts, r, n = 8, closed = false, tension = 0) {
  const curve = tension > 0
    ? new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), closed, 'catmullrom', tension)
    : new THREE.CurvePath();
  if (tension === 0) {
    for (let i = 0; i < pts.length - 1; i++) curve.add(new THREE.LineCurve3(new THREE.Vector3(...pts[i]), new THREE.Vector3(...pts[i + 1])));
  }
  const segs = tension > 0 ? Math.max(8, pts.length * 8) : (pts.length - 1) * 1;
  return new THREE.TubeGeometry(curve, segs, r, n, closed);
}

// extruded 2D shape (profile in XY, extruded along +Z by depth, centred on z)
export function extrude(points, depth, bevel = 0) {
  const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 6 });
  g.translate(0, 0, -depth / 2);
  return g;
}

// ---------------------------------------------------------------- the kit (merge with per-vertex looks)
export class Kit {
  constructor() {
    this.parts = [];
  }
  // look: { c: '#hex' | [r,g,b] linear, r: roughness, m: metalness, e: emissive, d: decal (uses uv) }
  add(geo, matrix, look) {
    this.parts.push({ geo, matrix: matrix || null, look });
    return this;
  }
  get count() {
    return this.parts.length;
  }
  build() {
    let nv = 0;
    let ni = 0;
    for (const { geo } of this.parts) {
      nv += geo.attributes.position.count;
      ni += geo.index ? geo.index.count : geo.attributes.position.count;
    }
    const pos = new Float32Array(nv * 3);
    const nor = new Float32Array(nv * 3);
    const uv = new Float32Array(nv * 2);
    const col = new Float32Array(nv * 3);
    const kit = new Float32Array(nv * 4);
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vo = 0;
    let io = 0;
    const nm = new THREE.Matrix3();
    const v = new THREE.Vector3();
    for (const { geo, matrix, look } of this.parts) {
      const P = geo.attributes.position;
      const N = geo.attributes.normal;
      const U = geo.attributes.uv;
      if (matrix) nm.getNormalMatrix(matrix);
      const c = Array.isArray(look.c) ? look.c : lin(look.c || '#ffffff');
      const flip = matrix && matrix.determinant() < 0;
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i);
        if (matrix) v.applyMatrix4(matrix);
        pos.set([v.x, v.y, v.z], (vo + i) * 3);
        if (N) {
          v.fromBufferAttribute(N, i);
          if (matrix) v.applyMatrix3(nm).normalize();
          nor.set([v.x, v.y, v.z], (vo + i) * 3);
        }
        if (U && look.d) uv.set([U.getX(i), U.getY(i)], (vo + i) * 2);
        else uv.set([-1, -1], (vo + i) * 2);
        col.set(c, (vo + i) * 3);
        kit.set([look.r ?? 0.6, look.m ?? 0, look.e ?? 0, look.w ?? (look.d ? 1 : 0)], (vo + i) * 4);
      }
      if (geo.index) {
        const I = geo.index.array;
        if (flip) for (let k = 0; k < I.length; k += 3) { idx[io + k] = I[k] + vo; idx[io + k + 1] = I[k + 2] + vo; idx[io + k + 2] = I[k + 1] + vo; }
        else for (let k = 0; k < I.length; k++) idx[io + k] = I[k] + vo;
        io += I.length;
      } else {
        for (let k = 0; k < P.count; k += 3) {
          idx[io + k] = vo + k;
          idx[io + k + 1] = vo + (flip ? k + 2 : k + 1);
          idx[io + k + 2] = vo + (flip ? k + 1 : k + 2);
        }
        io += P.count;
      }
      vo += P.count;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aKit', new THREE.BufferAttribute(kit, 4));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

// ---------------------------------------------------------------- shader snippets
const NOISE = /* glsl */ `
float pHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(pHash(i + vec3(0,0,0)), pHash(i + vec3(1,0,0)), f.x), mix(pHash(i + vec3(0,1,0)), pHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(pHash(i + vec3(0,0,1)), pHash(i + vec3(1,0,1)), f.x), mix(pHash(i + vec3(0,1,1)), pHash(i + vec3(1,1,1)), f.x), f.y), f.z); }
`;

const STUDIO_PARS = /* glsl */ `
uniform float uStudio; uniform vec3 uPaper; uniform vec2 uFadeZ; uniform float uFadeMax;
`;
// the depth fade, applied last (output space)
const STUDIO_END = /* glsl */ `
{
  float fz = uStudio * mix(uFadeMax, 1.0, smoothstep(30.0, 42.0, -vWPos.z)) * (1.0 - exp(-max(0.0, -vWPos.z - uFadeZ.x) / uFadeZ.y));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, linearToOutputTexel(vec4(uPaper, 1.0)).rgb, fz);
}
`;

function worldPosVertex() {
  return /* glsl */ `
  {
    vec4 wpp = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      wpp = instanceMatrix * wpp;
    #endif
    wpp = modelMatrix * wpp;
    vWPos = wpp.xyz;
  }`;
}

// kit material: vertex colour + aKit (rough, metal, emissive, decal) + dust low down + studio fade
export function kitMaterial({ decal = null, grime = 0.5, grimeH = 2.2, dust = '#8f8a80', envI = 1, name = 'kit', occl = [0, 6, 0.0] } = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 1, envMapIntensity: envI });
  m.name = name;
  const u = {
    uDecal: { value: decal || blankTex() },
    uGrime: { value: grime },
    uGrimeH: { value: grimeH },
    uDust: { value: new THREE.Color(dust) },
    uOccl: { value: new THREE.Vector3(...occl) }, // ground occlusion: y from, y to, strength
  };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, shared);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aKit;\nvarying vec4 vKit;\nvarying vec3 vWPos;\nvarying vec2 vKUv;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvKit = aKit; vKUv = uv;' + worldPosVertex());
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vKit;\nvarying vec3 vWPos;\nvarying vec2 vKUv;\nuniform sampler2D uDecal; uniform float uGrime; uniform float uGrimeH; uniform vec3 uDust; uniform vec3 uOccl;' + STUDIO_PARS + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (vKit.w > 0.5) { vec4 dc = texture2D(uDecal, vKUv); diffuseColor.rgb = mix(diffuseColor.rgb, dc.rgb, dc.a); }
        float kn = vnoise(vWPos * 1.9) * 0.6 + vnoise(vWPos * 7.0 + 3.1) * 0.4;
        float kg = uGrime * smoothstep(uGrimeH, 0.0, vWPos.y) * (0.45 + 0.55 * kn) * (1.0 - clamp(vKit.z, 0.0, 1.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, uDust * (0.75 + 0.5 * kn), clamp(kg, 0.0, 0.85));`)
      .replace('#include <roughnessmap_fragment>', `float roughnessFactor = clamp(vKit.x * (0.9 + 0.2 * kn) + kg * 0.35, 0.03, 1.0);`)
      .replace('#include <metalnessmap_fragment>', `float metalnessFactor = vKit.y * (1.0 - kg * 0.6);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * max(vKit.z, 0.0);`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>\nreflectedLight.indirectSpecular *= 1.0 + max(-vKit.z, 0.0);\n{ float oc = 1.0 - uOccl.z * (1.0 - smoothstep(uOccl.x, uOccl.y, vWPos.y)); reflectedLight.indirectDiffuse *= oc; reflectedLight.directDiffuse *= mix(1.0, oc, 0.55); reflectedLight.indirectSpecular *= oc; }`)
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n' + STUDIO_END);
  };
  m.customProgramCacheKey = () => 'sillage-kit';
  return m;
}

// container material: per-vertex aBox = (rough, metal, paint, ribMode) + per-instance aInst = (rgb, variant + seed)
// ribMode: 0 none (real geometry), 1 long side (ribs along local x), 2 end wall (along z), 3 door (along y), 4 roof (along x, shallow)
// decal atlas: uv.x < 0 = no marking; else uv in the cell, cell = variant (uCells cells stacked in v)
export function boxMaterial({ atlas, cells = 4, rust = 1, envI = 1, name = 'box' }) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 1, envMapIntensity: envI });
  m.name = name;
  const u = { uAtlas: { value: atlas }, uCells: { value: cells }, uRust: { value: rust } };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, shared);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec4 aBox; attribute vec4 aInst;
        varying vec4 vBox; varying vec4 vInst; varying vec3 vWPos; varying vec3 vLPos; varying vec2 vBUv; varying vec3 vRibT; varying float vRibU;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vBox = aBox; vInst = aInst; vLPos = position; vBUv = uv;
        {
          vec3 ax = aBox.w < 0.5 ? vec3(0.0) : (aBox.w < 1.5 ? vec3(1.0, 0.0, 0.0) : (aBox.w < 2.5 ? vec3(0.0, 0.0, 1.0) : (aBox.w < 3.5 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0))));
          vRibU = dot(position, ax);
          vec4 tt = vec4(ax, 0.0);
          #ifdef USE_INSTANCING
            tt = instanceMatrix * tt;
          #endif
          vRibT = normalize((viewMatrix * modelMatrix * tt).xyz + 1e-6);
        }` + worldPosVertex());
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec4 vBox; varying vec4 vInst; varying vec3 vWPos; varying vec3 vLPos; varying vec2 vBUv; varying vec3 vRibT; varying float vRibU;
        uniform sampler2D uAtlas; uniform float uCells; uniform float uRust;` + STUDIO_PARS + NOISE + `
        float ribSlope(float u, float pitch, float depth){
          float t = fract(u / pitch) * pitch; float a = pitch * 0.26; float b = pitch * 0.245; float c = pitch * 0.25;
          float s = depth / b;
          if (t < a) return 0.0; if (t < a + b) return s; if (t < a + b + c) return 0.0; return -s; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float seed = fract(vInst.w);
        float variant = floor(vInst.w);
        vec3 paint = vInst.rgb * (0.94 + 0.12 * seed);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * paint, vBox.z);
        // markings
        if (vBUv.x >= 0.0) {
          vec2 auv = vec2(vBUv.x, (vBUv.y + (uCells - 1.0 - variant)) / uCells);
          vec4 mk = texture2D(uAtlas, auv);
          diffuseColor.rgb = mix(diffuseColor.rgb, mk.rgb, mk.a * (0.92 - 0.1 * seed));
        }
        // weathering: rust streaks from the top, dirt at the bottom, roof grime
        float bn = vnoise(vLPos * vec3(1.3, 1.3, 1.3) + seed * 17.0);
        float bn2 = vnoise(vLPos * vec3(9.0, 0.7, 9.0) + seed * 31.0);
        float topW = smoothstep(1.2, 2.8, vLPos.y);
        float streak = smoothstep(0.62, 0.92, bn2) * (0.35 + 0.65 * topW);
        float rustK = uRust * (0.35 + 0.65 * seed) * vBox.z;
        vec3 rustC = vec3(0.16, 0.055, 0.025);
        diffuseColor.rgb = mix(diffuseColor.rgb, rustC, clamp(streak * 0.55 * rustK + smoothstep(0.72, 0.95, bn) * 0.25 * rustK, 0.0, 0.8));
        float dirt = smoothstep(0.7, 0.0, vLPos.y) * (0.5 + 0.5 * bn);
        diffuseColor.rgb *= 1.0 - 0.35 * dirt * uRust;
        float roofK = step(3.5, vBox.w) * (0.25 + 0.35 * bn) * uRust;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.72, 0.66, 0.6), roofK);
        if (vBox.w > 3.5) { float tg = fract(vRibU / 0.24 + 0.5); diffuseColor.rgb *= 1.0 - 0.1 * smoothstep(0.5, 0.56, tg) * (1.0 - smoothstep(0.74, 0.8, tg)) * clamp(1.6 - fwidth(vRibU) / 0.24 * 3.0, 0.0, 1.0); }`)
      .replace('#include <roughnessmap_fragment>', `float roughnessFactor = clamp(vBox.x * (0.85 + 0.3 * bn) + streak * 0.15, 0.05, 1.0);`)
      .replace('#include <metalnessmap_fragment>', `float metalnessFactor = vBox.y;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (vBox.w > 0.5) {
          float pitch = vBox.w < 1.5 ? 0.2807 : (vBox.w < 2.5 ? 0.278 : (vBox.w < 3.5 ? 0.6 : 0.24));
          float depth = vBox.w < 3.5 ? 0.036 : 0.028;
          float aa = clamp(1.6 - fwidth(vRibU) / pitch * 3.0, 0.0, 1.0);
          float sl = ribSlope(vRibU + 0.5 * pitch, pitch, depth);
          normal = normalize(normal - vRibT * sl * aa);
        }`)
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n' + STUDIO_END);
  };
  m.customProgramCacheKey = () => 'sillage-box';
  return m;
}

// emissive lamps (status lights, lenses): unlit colour per instance, studio fade not needed
export function lampMaterial() {
  return new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
}

let _blank = null;
export function blankTex() {
  if (_blank) return _blank;
  const d = new Uint8Array([255, 255, 255, 0]);
  _blank = new THREE.DataTexture(d, 1, 1);
  _blank.needsUpdate = true;
  return _blank;
}

// patch any material with the studio depth fade only (glass, lamps)
export function withStudio(m, key) {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    Object.assign(sh.uniforms, shared);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n' + worldPosVertex());
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;' + STUDIO_PARS)
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n' + STUDIO_END);
  };
  m.customProgramCacheKey = () => 'sillage-studio-' + key;
  return m;
}

export const easing = {
  smooth: (t) => t * t * (3 - 2 * t),
  smoother: (t) => t * t * t * (t * (t * 6 - 15) + 10),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  in2: (t) => t * t,
  out2: (t) => 1 - (1 - t) * (1 - t),
};
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const span = (x, a, b) => clamp01((x - a) / (b - a));
