// Real grass blades near the camera: 2 m tiles of instanced blade patches, chosen every frame
// around the camera (frustum-tested), in two levels of detail. Blades in a patch are ordered
// on a low-discrepancy sequence, so any prefix is evenly spread: far blades thin out by rank
// (smoothly shrinking, never popping) and the far level only draws the first quarter.
// The lawn blades lean with the mowing stripes and take the exact colour of the ground under
// them (lawn-glsl.js); the meadow outside the new fence has taller blades, seed heads and a
// few flowers, swaying in the wind. Lighting and the sun's shadow are evaluated per vertex.
import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { LIGHT_GLSL } from './lighting.js';
import { HAZE_GLSL } from './atmosphere.js';
import { LAWN_GLSL } from './lawn-glsl.js';
import { HEIGHT_GLSL, YARD, VERGE, DRIVE } from './layout.js';

const TILE = 2;
const f = (v) => (Number.isInteger(v) ? v.toFixed(1) : String(v));

function patchGeometry(n, segs) {
  const a1 = 0.7548776662466927, a2 = 0.5698402909980532; // R2 sequence
  const vpb = segs * 2 + 1;
  const blade = new Float32Array(n * vpb * 4);
  const shape = new Float32Array(n * vpb * 2);
  const pos = new Float32Array(n * vpb * 3);
  const tris = (segs - 1) * 2 + 1;
  const idx = new Uint32Array(n * tris * 3);
  const rnd = mulberry32(segs * 101 + n);
  let k = 0;
  for (let i = 0; i < n; i++) {
    const x = ((0.5 + (i + 1) * a1) % 1) * TILE;
    const z = ((0.5 + (i + 1) * a2) % 1) * TILE;
    const r = rnd();
    for (let v = 0; v < vpb; v++) {
      const row = Math.floor(v / 2);
      const t = v === vpb - 1 ? 1 : row / segs;
      const side = v === vpb - 1 ? 0 : v % 2 ? 1 : -1;
      const o = i * vpb + v;
      blade.set([x, z, i / n, r], o * 4);
      shape.set([t, side], o * 2);
      pos.set([x, t * 0.1, z], o * 3);
    }
    const b = i * vpb;
    for (let s = 0; s < segs - 1; s++) {
      const a = b + s * 2;
      idx.set([a, a + 1, a + 3, a, a + 3, a + 2], k);
      k += 6;
    }
    const a = b + (segs - 1) * 2;
    idx.set([a, a + 1, b + vpb - 1], k);
    k += 3;
  }
  return { blade, shape, pos, idx, vpb, tris };
}

const VERT = (kind) => /* glsl */ `
${LIGHT_GLSL}
${HAZE_GLSL}
${LAWN_GLSL}
${HEIGHT_GLSL}
attribute vec4 aBlade;   // patch x, z, rank, random
attribute vec2 aShape;   // t along the blade, side
attribute vec2 aTile;    // per instance: tile origin
uniform vec4 uGrass;     // fade start, fade end, height, width
uniform vec4 uGrass2;    // lean, wind, stripes, density
varying vec3 vColor;

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float inBoxH(vec2 p, vec4 b) { return step(b.x, p.x) * step(p.x, b.y) * step(b.z, p.y) * step(p.y, b.w); }
float region(vec2 p) {
  float yard = inBoxH(p, vec4(${f(YARD.x0)} + 0.03, ${f(YARD.x1)}, ${f(YARD.z0)} + 0.05, ${f(YARD.z1)}));
  float verge = inBoxH(p, vec4(${f(YARD.x0 - 0.6)}, ${f(YARD.x1 + VERGE)}, ${f(YARD.z0 - 0.6)}, ${f(YARD.z1 + VERGE)}));
  float drive = inBoxH(p, vec4(${f(DRIVE.x0 - 0.4)}, ${f(DRIVE.x1)}, ${f(DRIVE.z0 - 0.15)}, ${f(DRIVE.z1 + 0.15)}));
#if ${kind === 'lawn' ? 1 : 0}
  return max(yard, verge);
#else
  float outside = max(step(${f(YARD.x1 + VERGE)}, p.x), step(${f(YARD.z1 + VERGE)}, p.y));
  float mo = (1.0 - verge) * outside * step(${f(YARD.z0 - 9.0)}, p.y) * step(p.x, 70.0) * step(-24.6, p.x);
  return mo * (1.0 - drive);
#endif
}

void main() {
  vec2 tile = aTile;
  float th = hash12(tile * 0.37 + 11.0);
  // turn and mirror the patch per tile (no visible repeat)
  vec2 lp = aBlade.xy - 1.0;
  float q = floor(th * 4.0);
  if (q == 1.0) lp = vec2(-lp.y, lp.x);
  else if (q == 2.0) lp = -lp;
  else if (q == 3.0) lp = vec2(lp.y, -lp.x);
  if (fract(th * 7.31) > 0.5) lp.x = -lp.x;
  vec2 root = tile + 1.0 + lp;
  float rnd = fract(aBlade.w + th * 3.17);
  float rnd2 = fract(rnd * 7.13 + 0.37);
  float rnd3 = fract(rnd * 13.7 + th);
  float dist = length(root - cameraPosition.xz);
  float density = (1.0 - smoothstep(uGrass.x, uGrass.y, dist)) * uGrass2.w;
  float vis = smoothstep(aBlade.z, aBlade.z + 0.03, density) * region(root);
  float t = aShape.x;
  float H = uGrass.z * (0.6 + 0.8 * rnd) * vis;
  float W = uGrass.w * (0.7 + 0.6 * rnd2) * (1.0 + dist * 0.02) / sqrt(max(uGrass2.w, 0.2));
  float yaw = rnd3 * 6.2831;
  vec2 side = vec2(cos(yaw), sin(yaw));
  float tri = g_stripeTri(root);
  float sgn = g_stripeSign(tri, 0.25);
#if ${kind === 'lawn' ? 1 : 0}
  vec2 leanDir = normalize(vec2((rnd2 - 0.5) * 1.3, sgn + (rnd - 0.5) * 0.6));
#else
  vec2 leanDir = vec2(cos(rnd2 * 6.2831), sin(rnd2 * 6.2831));
#endif
  float gust = sin(uTime * 1.55 + root.x * 0.31 + root.y * 0.23) * 0.6 + sin(uTime * 2.9 + rnd * 6.28) * 0.4;
  vec2 windDir = normalize(vec2(0.8, 0.35));
  float bend = t * t;
  vec2 off = leanDir * (uGrass2.x * H * bend) + windDir * (uWind * uGrass2.y * gust * H * bend);
  float wid = aShape.y * W * 0.5 * (1.0 - pow(t, 1.4));
  vec3 pos = vec3(root.x + off.x + side.x * wid, g_heightAt(root) + H * t * (1.0 - 0.3 * bend * uGrass2.x), root.y + off.y + side.y * wid);

  // ---- colour, matching the ground under the blade
  vec3 V = normalize(cameraPosition - pos);
  vec4 n1 = g_n1(root), n2 = g_n2(root), n3 = g_n3(root);
#if ${kind === 'lawn' ? 1 : 0}
  float inYard = inBoxH(root, vec4(${f(YARD.x0)}, ${f(YARD.x1)}, ${f(YARD.z0)}, ${f(YARD.z1)}));
  vec3 base = g_lawnColor(root, n1, n2, n3);
  base = mix(vec3(0.084, 0.152, 0.03) * (0.86 + 0.26 * n2.b), base, inYard);
  base *= mix(vec3(1.0), g_stripeTint(sgn, V, uGrass2.z * (0.55 + 0.45 * smoothstep(2.0, 18.0, dist))), inYard);
  base *= 0.9 + 0.2 * rnd2;
  base = mix(base, base * vec3(1.22, 1.16, 0.78), t * 0.2 * rnd);
#else
  vec3 base = g_meadowColor(root, n1, n2, n3) * (0.78 + 0.44 * rnd2);
  base = mix(base, vec3(0.24, 0.21, 0.1), step(0.82, rnd) * step(0.65, t) * 0.8);     // seed heads
  float flower = step(0.965, rnd3) * step(0.78, t) * smoothstep(0.45, 0.75, n2.g);
  vec3 fc = rnd2 > 0.6 ? vec3(0.7, 0.68, 0.6) : rnd2 > 0.25 ? vec3(0.55, 0.4, 0.04) : vec3(0.32, 0.18, 0.42);
  base = mix(base, fc, flower);
#endif
  float ao = mix(0.62, 1.0, pow(t, 0.8));
  vec3 Nb = normalize(vec3(-side.y, 0.0, side.x));
  Nb *= sign(dot(Nb, V) + 1e-3);
  vec3 N = normalize(mix(Nb, vec3(0.0, 1.0, 0.0), 0.65));
  vec3 L = uSunDir;
  // a shaded blade is never darker than the ground under it: soft shadow, a little lift
  float sh = mix(0.12, 1.0, sunShadow4(pos + vec3(0.0, 0.03, 0.0), 0.0005, 2.0));
  float ndl = clamp(dot(N, L) * 0.6 + 0.4, 0.0, 1.0);
  vec3 col = base * (uSunCol * ndl * sh / G_PI + hemiAmbient(N) * ao);
  float back = pow(clamp(dot(-V, L), 0.0, 1.0), 2.0) * t;
  col += base * vec3(1.0, 1.25, 0.4) * uSunCol * back * sh * 0.07;
  col *= mix(1.0, 0.86, uWet);
  col = mix(vec3(dot(col, vec3(0.3, 0.55, 0.15))), col, 1.0 - 0.18 * uWet);
  vec3 R = reflect(-L, N);
  col += uSunCol * pow(max(dot(R, V), 0.0), 40.0) * uWet * sh * 0.03 * t;
  vColor = applyHaze(col, pos - cameraPosition, cameraPosition.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
}`;

const FRAG = /* glsl */ `
varying vec3 vColor;
void main() {
  gl_FragColor = vec4(vColor, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const KINDS = {
  lawn: { n: 1600, segs: 2, height: 0.068, width: 0.0055, lean: 0.5, wind: 0.15, maxTiles: 420 },
  meadow: { n: 640, segs: 4, height: 0.34, width: 0.0125, lean: 0.28, wind: 1.0, maxTiles: 420 },
};

export function createGrass(lightU) {
  const layers = [];
  for (const kind of Object.keys(KINDS)) {
    const K = KINDS[kind];
    const P = patchGeometry(K.n, K.segs);
    const bladeA = new THREE.BufferAttribute(P.blade, 4);
    const shapeA = new THREE.BufferAttribute(P.shape, 2);
    const posA = new THREE.BufferAttribute(P.pos, 3);
    const idxA = new THREE.BufferAttribute(P.idx, 1);
    const uniforms = {
      ...lightU,
      uGrass: { value: new THREE.Vector4(5, 14, K.height, K.width) },
      uGrass2: { value: new THREE.Vector4(K.lean, K.wind, 1, 1) },
    };
    const mat = new THREE.ShaderMaterial({ name: `garden-grass-${kind}`, uniforms, vertexShader: VERT(kind), fragmentShader: FRAG, side: THREE.DoubleSide });
    const lods = [];
    for (let l = 0; l < 2; l++) {
      const geo = new THREE.InstancedBufferGeometry();
      geo.setAttribute('position', posA);
      geo.setAttribute('aBlade', bladeA);
      geo.setAttribute('aShape', shapeA);
      geo.setIndex(idxA);
      const tiles = new THREE.InstancedBufferAttribute(new Float32Array(K.maxTiles * 2), 2);
      tiles.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('aTile', tiles);
      geo.instanceCount = 0;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `garden-grass-${kind}-lod${l}`;
      mesh.frustumCulled = false;
      lods.push({ mesh, geo, tiles });
    }
    layers.push({ kind, K, P, mat, uniforms, lods });
  }

  const frustum = new THREE.Frustum();
  const m4 = new THREE.Matrix4();
  const box = new THREE.Box3();
  const last = { x: 1e9, y: 0, z: 0, q: new THREE.Quaternion(), R: 0 };
  let R = 14, density = 0.8;
  let drawn = { lawn: 0, meadow: 0 };

  function setQuality(radius, dens) {
    R = radius;
    density = dens;
    last.x = 1e9; // force a refresh
  }

  function update(camera) {
    const cp = camera.position;
    if (Math.abs(cp.x - last.x) + Math.abs(cp.y - last.y) + Math.abs(cp.z - last.z) < 0.05 && camera.quaternion.angleTo(last.q) < 0.004 && last.R === R) return;
    last.x = cp.x;
    last.y = cp.y;
    last.z = cp.z;
    last.q.copy(camera.quaternion);
    last.R = R;
    camera.updateMatrixWorld();
    m4.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(m4);
    drawn = { lawn: 0, meadow: 0 };
    for (const L of layers) {
      const rad = L.kind === 'meadow' ? R * 1.25 : R;
      const fs = rad * 0.38;
      const d25 = fs + 0.674 * (rad - fs);
      L.uniforms.uGrass.value.x = fs;
      L.uniforms.uGrass.value.y = rad;
      L.uniforms.uGrass2.value.w = density;
      // the near level draws its share of the blades, the far level a quarter of it
      const n0 = Math.round(L.K.n * density);
      L.lods[0].geo.setDrawRange(0, n0 * L.P.tris * 3);
      L.lods[1].geo.setDrawRange(0, Math.max(1, Math.round(n0 * 0.25)) * L.P.tris * 3);
      const c = [0, 0];
      const arr = [L.lods[0].tiles.array, L.lods[1].tiles.array];
      const tx0 = Math.floor((cp.x - rad) / TILE), tx1 = Math.floor((cp.x + rad) / TILE);
      const tz0 = Math.floor((cp.z - rad) / TILE), tz1 = Math.floor((cp.z + rad) / TILE);
      for (let tx = tx0; tx <= tx1; tx++)
        for (let tz = tz0; tz <= tz1; tz++) {
          const x0 = tx * TILE, z0 = tz * TILE;
          // nearest point of the tile to the camera
          const nx = Math.max(x0, Math.min(cp.x, x0 + TILE)), nz = Math.max(z0, Math.min(cp.z, z0 + TILE));
          const dn = Math.hypot(nx - cp.x, nz - cp.z);
          if (dn > rad) continue;
          if (!tileUseful(L.kind, x0, z0)) continue;
          box.min.set(x0, -0.3, z0);
          box.max.set(x0 + TILE, L.kind === 'meadow' ? 0.9 : 0.4, z0 + TILE);
          if (!frustum.intersectsBox(box)) continue;
          const l = dn < d25 ? 0 : 1;
          if (c[l] >= L.K.maxTiles) continue;
          arr[l][c[l] * 2] = x0;
          arr[l][c[l] * 2 + 1] = z0;
          c[l]++;
        }
      for (let l = 0; l < 2; l++) {
        L.lods[l].geo.instanceCount = c[l];
        L.lods[l].tiles.needsUpdate = true;
        L.lods[l].tiles.addUpdateRange(0, Math.max(2, c[l] * 2));
      }
      drawn[L.kind] = c[0] * n0 + c[1] * Math.round(n0 * 0.25);
    }
  }

  return {
    meshes: layers.flatMap((L) => L.lods.map((l) => l.mesh)),
    update,
    setQuality,
    setStripes(k) {
      for (const L of layers) L.uniforms.uGrass2.value.z = k;
    },
    stats: () => drawn,
  };
}

function tileUseful(kind, x0, z0) {
  const x1 = x0 + TILE, z1 = z0 + TILE;
  const ov = (a0, a1, b0, b1) => a1 > b0 && a0 < b1;
  const lawnZone = ov(x0, x1, YARD.x0 - 0.6, YARD.x1 + VERGE) && ov(z0, z1, YARD.z0 - 0.6, YARD.z1 + VERGE);
  if (kind === 'lawn') return lawnZone;
  const outside = x1 > YARD.x1 + VERGE || z1 > YARD.z1 + VERGE;
  return outside && x1 > -24.6 && z1 > YARD.z0 - 9 && x0 < 70;
}
