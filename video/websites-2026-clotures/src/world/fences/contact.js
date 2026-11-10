// Soft ground contact darkening along the fences: one multiply-blended strip per fence line
// (one draw call), strongest at the base and fading over ~0.8 m. Its strength follows the
// fence actually standing: boards being fixed (install), the type under the sweep (styles),
// the old fence (always).
import * as THREE from 'three';
import { LEGS, OLD } from './layout.js';

const VERT = /* glsl */ `
attribute vec3 aC; // x: across (-1..1), y: d along the line, z: line (0 new, 1 old)
varying vec3 vC;
void main() {
  vC = aC;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
uniform vec4 uNew;   // x: strength (current / from type), y: strength (to type), z: mode (0 static, 1 install, 2 sweep), w: global
uniform vec4 uSweepC;
uniform float uBuildC;
uniform vec4 uWinPosts;
uniform vec4 uWinBoards;
uniform vec2 uDMap;
uniform float uOld;
uniform float uHalfW;
varying vec3 vC;
void main() {
  float x = abs(vC.x) * uHalfW;
  float prof = 0.5 * exp(-x / 0.09) + 0.5 * exp(-x / 0.5);
  prof *= 1.0 - smoothstep(uHalfW * 0.7, uHalfW, x);
  float s;
  if (vC.z > 0.5) s = uOld;
  else {
    float d = vC.y;
    if (uNew.z < 0.5) s = uNew.x;
    else if (uNew.z < 1.5) {
      float sd = d < uDMap.x ? 0.12 * max(d, 0.0) / uDMap.x : 0.12 + 0.88 * clamp((d - uDMap.x) / (uDMap.y - uDMap.x), 0.0, 1.0);
      float tp = uWinPosts.x + sd * (uWinPosts.y - uWinPosts.x - uWinPosts.z);
      float tb = uWinBoards.x + sd * (uWinBoards.y - uWinBoards.x - uWinBoards.z);
      float ep = clamp((uBuildC - tp) / uWinPosts.z, 0.0, 1.0);
      float eb = clamp((uBuildC - tb) / uWinBoards.z, 0.0, 1.0);
      s = 0.1 * uNew.x * ep + 0.9 * uNew.x * eb;
    } else {
      float e = clamp((uSweepC.x - d - uSweepC.z * 0.55) / uSweepC.z, 0.0, 1.0);
      s = mix(uNew.x, uNew.y, e);
    }
    s *= uNew.w;
  }
  gl_FragColor = vec4(vec3(1.0 - clamp(s * prof, 0.0, 0.9)), 1.0);
}`;

export function createContact(shared) {
  const halfW = 0.9;
  const pos = [], ac = [], idx = [];
  const line = (origin, t, n, len, lineId, d0 = 0) => {
    const seg = Math.ceil(len / 0.5);
    const base = pos.length / 3;
    for (let i = 0; i <= seg; i++) {
      const d = (len * i) / seg;
      for (const s of [-1, 1]) {
        const p = origin.clone().addScaledVector(t, d).addScaledVector(n, s * halfW);
        pos.push(p.x, 0.007, p.z);
        ac.push(s, d + d0, lineId);
      }
    }
    for (let i = 0; i < seg; i++) {
      const a = base + i * 2;
      idx.push(a, a + 2, a + 3, a, a + 3, a + 1);
    }
  };
  for (const leg of LEGS) line(leg.origin, leg.t, leg.n, leg.len, 0);
  line(new THREE.Vector3(OLD.x, 0, OLD.z0), OLD.t, OLD.n, OLD.z1 - OLD.z0, 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aC', new THREE.Float32BufferAttribute(ac, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  const uniforms = {
    uNew: { value: new THREE.Vector4(0.42, 0.42, 0, 1) },
    uSweepC: { value: new THREE.Vector4(0, 0, 6, 2) },
    uBuildC: { value: 1 },
    uWinPosts: shared.uWinPosts,
    uWinBoards: shared.uWinBoards,
    uDMap: shared.uDMap,
    uOld: { value: 0.38 },
    uHalfW: { value: halfW },
  };
  const mat = new THREE.ShaderMaterial({
    name: 'fence-contact',
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.MultiplyBlending,
    premultipliedAlpha: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
    side: THREE.DoubleSide,
    fog: false,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = 'fence-contact';
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}
