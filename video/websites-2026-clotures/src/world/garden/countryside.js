// The Touraine countryside around the garden: hedgerows along the field edges, woods, rows of
// poplars, isolated field trees and a continuous wooded horizon, all as relit impostors (one
// instanced draw call), plus distant farm buildings and a village with its church spire.
import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { billboardAtlas, BB_CELLS } from './billboard-tex.js';
import { LIGHT_GLSL } from './lighting.js';
import { HAZE_GLSL } from './atmosphere.js';
import { heightAt, CENTER } from './layout.js';

const VERT = /* glsl */ `
attribute vec3 aPos;
attribute vec4 aInfo;   // width, height, cell, tint
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vRight;
varying vec3 vFwd;
varying float vTint;
void main() {
  vec3 toCam = cameraPosition - aPos;
  vec3 F = normalize(vec3(toCam.x, 0.0, toCam.z) + vec3(1e-5));
  vec3 R = normalize(cross(vec3(0.0, 1.0, 0.0), F));
  vec3 p = aPos + R * position.x * aInfo.x + vec3(0.0, 1.0, 0.0) * position.y * aInfo.y;
  vUv = vec2((aInfo.z + uv.x) / ${BB_CELLS}.0, uv.y);
  vWorld = p;
  vRight = R;
  vFwd = F;
  vTint = aInfo.w;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const FRAG = /* glsl */ `
${LIGHT_GLSL}
${HAZE_GLSL}
uniform sampler2D uMap;
uniform sampler2D uNormal;
uniform vec2 uMapSize;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vRight;
varying vec3 vFwd;
varying float vTint;
void main() {
  vec4 tex = texture2D(uMap, vUv);
  vec2 px = vUv * uMapSize;
  vec2 dx = dFdx(px), dy = dFdy(px);
  float mip = max(0.0, 0.5 * log2(max(dot(dx, dx), dot(dy, dy))));
  float a = tex.a * (1.0 + mip * 0.3);
  a = (a - 0.5) / max(fwidth(a), 1e-4) + 0.5;
  if (a < 0.25) discard;
  vec3 nb = texture2D(uNormal, vUv).xyz * 2.0 - 1.0;
  vec3 N = normalize(vRight * nb.x + vec3(0.0, 1.0, 0.0) * nb.y + vFwd * nb.z);
  vec3 albedo = tex.rgb * mix(vec3(0.92, 0.97, 1.05), vec3(1.08, 1.04, 0.86), vTint);
  float ndl = clamp((dot(N, uSunDir) + 0.3) / 1.3, 0.0, 1.0);
  vec3 col = albedo * (uSunCol * ndl / G_PI * 0.9 + hemiAmbient(N) * 0.85);
  col *= mix(1.0, 0.8, uWet);
  col = applyHaze(col, vWorld - cameraPosition, cameraPosition.y);
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createCountryside(lightU) {
  const rnd = mulberry32(2026);
  const items = []; // x, z, w, h, cell, tint
  const tree = (x, z, h, kind = 'round') => {
    const cell = kind === 'poplar' ? 4 + ((rnd() * 2) | 0) : kind === 'bush' ? 6 : kind === 'strip' ? 7 : (rnd() * 4) | 0;
    // round crowns: +-35 % in size and in aspect, so no two read as the same lollipop
    if (kind === 'round') h *= 0.75 + rnd() * 0.5;
    const w = kind === 'poplar' ? h * 0.34 : kind === 'bush' ? h * 1.7 : kind === 'strip' ? h * (2.2 + rnd() * 1.2) : h * (0.6 + rnd() * 0.75);
    items.push([x, z, w, h, cell, rnd()]);
  };
  const [cx, cz] = CENTER;

  // a hedgerow along the meadow on the right of the garden, and one behind the house: a
  // continuous wooded edge (overlapping strips, crowns of every size, bushes at their feet)
  // rather than a row of separate trees
  const hedgerow = (ax, az, bx, bz) => {
    const L = Math.hypot(bx - ax, bz - az);
    for (let d = 0; d < L; d += 3.2 + rnd() * 3.6) {
      const t = d / L, x = ax + (bx - ax) * t + (rnd() - 0.5) * 4, z = az + (bz - az) * t + (rnd() - 0.5) * 4;
      const r = rnd();
      if (r < 0.42) tree(x, z, 7.5 + rnd() * 6, 'strip');
      else if (r < 0.78) tree(x, z, 10 + rnd() * 10);
      else tree(x, z, 2.6 + rnd() * 2.6, 'bush');
    }
  };
  hedgerow(60, -108, 60, 55);
  hedgerow(14, -108, 60, -108);
  // field hedgerows: the field grid of the ground shader (turned 17 degrees)
  const A = 0.297, ca = Math.cos(A), sa = Math.sin(A);
  const toWorld = (qx, qy) => [ca * qx - sa * qy, sa * qx + ca * qy];
  const cellW = 190, cellH = 120;
  for (let row = -14; row <= 9; row++) {
    for (let col = -12; col <= 12; col++) {
      // horizontal edge at the bottom of the cell, vertical edge at its left
      for (const horiz of [true, false]) {
        if (rnd() > 0.42) continue;
        const qy0 = row * cellH, qx0 = col * cellW + ((row * 37) % 5) * 23;
        const n = horiz ? Math.floor(cellW / 11) : Math.floor(cellH / 11);
        for (let i = 0; i < n; i++) {
          if (rnd() < 0.3) continue;
          const t = (i + rnd() * 0.6) / n;
          const [x, z] = horiz ? toWorld(qx0 + t * cellW, qy0) : toWorld(qx0, qy0 + t * cellH);
          const r = Math.hypot(x - cx, z - cz);
          if (r < 150 || r > 1700) continue;
          if (rnd() < 0.7) tree(x, z, 8 + rnd() * 9);
          else tree(x, z, 3 + rnd() * 3, 'bush');
        }
      }
    }
  }
  // woods: dense edges of a few patches
  const woods = [[-430, -900, 260, 170], [420, -1250, 330, 200], [-1150, -520, 300, 260], [950, -650, 280, 180], [-260, -1850, 420, 220], [1500, -1600, 380, 240], [-1650, -1350, 420, 300], [-900, 600, 300, 200], [1200, 300, 260, 220]];
  for (const [wx, wz, rx, rz] of woods) {
    const n = Math.round((rx + rz) * 0.9);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const k = 0.55 + 0.45 * Math.sqrt(rnd());
      const x = wx + Math.cos(a) * rx * k, z = wz + Math.sin(a) * rz * k;
      tree(x, z, 14 + rnd() * 10, rnd() < 0.5 ? 'strip' : 'round');
    }
  }
  // rows of poplars along the streams
  const rows = [[[150, -330], [430, -260]], [[-320, -620], [-60, -720]], [[260, 140], [520, -60]], [[-700, -260], [-520, -420]]];
  for (const [[ax, az], [bx, bz]] of rows) {
    const L = Math.hypot(bx - ax, bz - az);
    for (let d = 0; d < L; d += 6.5 + rnd() * 1.5) {
      const t = d / L;
      tree(ax + (bx - ax) * t + (rnd() - 0.5) * 1.5, az + (bz - az) * t + (rnd() - 0.5) * 1.5, 22 + rnd() * 7, 'poplar');
    }
  }
  // isolated trees in the fields (far enough for the haze to settle them)
  for (let i = 0; i < 60; i++) {
    const a = rnd() * Math.PI * 2, r = 230 + Math.pow(rnd(), 0.7) * 1400;
    tree(cx + Math.cos(a) * r, cz + Math.sin(a) * r, 11 + rnd() * 8);
  }
  // the wooded horizon
  for (let a = 0; a < Math.PI * 2; a += 0.012 + rnd() * 0.01) {
    for (let k = 0; k < 2; k++) {
      const r = 2600 + rnd() * 1500;
      tree(cx + Math.cos(a) * r, cz + Math.sin(a) * r, 18 + rnd() * 12, 'strip');
    }
  }

  const n = items.length;
  const geo = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  quad.translate(0, 0.5, 0);
  geo.index = quad.index;
  geo.setAttribute('position', quad.attributes.position);
  geo.setAttribute('uv', quad.attributes.uv);
  const pos = new Float32Array(n * 3), info = new Float32Array(n * 4);
  items.forEach(([x, z, w, h, cell, tint], i) => {
    pos.set([x, heightAt(x, z) - 0.4, z], i * 3);
    info.set([w, h, cell, tint], i * 4);
  });
  geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3));
  geo.setAttribute('aInfo', new THREE.InstancedBufferAttribute(info, 4));
  geo.instanceCount = n;
  const atlas = billboardAtlas();
  const mat = new THREE.ShaderMaterial({
    name: 'garden-billboards',
    uniforms: { ...lightU, uMap: { value: atlas.map }, uNormal: { value: atlas.normalMap }, uMapSize: { value: new THREE.Vector2(...atlas.size) } },
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.DoubleSide,
    alphaToCoverage: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'garden-billboards';
  mesh.frustumCulled = false;
  return { mesh, count: n };
}
