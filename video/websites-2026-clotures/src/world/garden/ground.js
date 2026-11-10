// Ground: a fine radial disc for the garden (lawn with mowing stripes, gravel forecourt and
// drive, flower beds, mown verge, meadow, the neighbours' lawn) and a coarse ring for the
// Touraine countryside (field patchwork, crop rows, vines, hedgerow lines), both shaded by
// hand: sun with soft PCF shadow, sky ambient with contact occlusion (tree crowns, house,
// hedge, fence lines), wet look after the storm, aerial perspective.
import * as THREE from 'three';
import { heightAt, CENTER, NEAR_R, TREES, HOUSE, HEDGE, FORECOURT, DRIVE, FACADE_Z } from './layout.js';
import { LIGHT_GLSL } from './lighting.js';
import { LAWN_GLSL } from './lawn-glsl.js';
import { HAZE_GLSL } from './atmosphere.js';

function radialGeometry(radii, M) {
  const [cx, cz] = CENTER;
  const nr = radii.length;
  const pos = new Float32Array(nr * M * 3);
  let k = 0;
  for (let i = 0; i < nr; i++) {
    for (let j = 0; j < M; j++, k++) {
      const a = (j / M) * Math.PI * 2;
      const x = cx + Math.cos(a) * radii[i], z = cz + Math.sin(a) * radii[i];
      pos[k * 3] = x;
      pos[k * 3 + 1] = heightAt(x, z);
      pos[k * 3 + 2] = z;
    }
  }
  const idx = [];
  for (let i = 0; i < nr - 1; i++) {
    for (let j = 0; j < M; j++) {
      const a = i * M + j, b = i * M + ((j + 1) % M), c = (i + 1) * M + j, d = (i + 1) * M + ((j + 1) % M);
      idx.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(nr * M > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

const VERT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const f = (v) => (Number.isInteger(v) ? v.toFixed(1) : String(v));

// ------------------------------------------------------------------ garden ground
const GARDEN_FRAG = /* glsl */ `
${LIGHT_GLSL}
${HAZE_GLSL}
${LAWN_GLSL}
uniform vec4 uTrees[${TREES.length}];   // x, z, crown radius, strength
uniform vec4 uFence;                    // new fence AO, built distance d, old fence AO, stripes contrast
varying vec3 vWorld;
varying vec3 vNormal;

float boxDist(vec2 p, vec4 b) { // b = x0, x1, z0, z1
  vec2 d = max(max(vec2(b.x, b.z) - p, vec2(0.0)), p - vec2(b.y, b.w));
  return length(d);
}
float segDist(vec2 p, vec2 a, vec2 b, out float t) {
  vec2 ab = b - a;
  t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
  return length(a + ab * t - p);
}
// box mask with soft edges (w metres)
float inBox(vec2 p, vec4 b, float w) {
  return smoothstep(-w, w, p.x - b.x) * smoothstep(-w, w, b.y - p.x) * smoothstep(-w, w, p.y - b.z) * smoothstep(-w, w, b.w - p.y);
}

void main() {
  vec2 p = vWorld.xz;
  vec3 V = normalize(cameraPosition - vWorld);
  float camDist = length(cameraPosition - vWorld);
  vec3 N = normalize(vNormal);

  // ---------------- multi-scale variation (shared by every grass surface)
  vec4 n1 = g_n1(p);
  vec4 n2 = g_n2(p);
  vec4 n3 = g_n3(p);
  vec4 n4 = texture2D(uNoise, p * 1.37);
  float micro = (n4.b - 0.5) * (1.0 - smoothstep(6.0, 22.0, camDist)) + (n4.g - 0.5) * 0.6;

  // ---------------- lawn (yard), with mowing stripes along z (lawn-glsl.js)
  vec3 lawn = g_lawnColor(p, n1, n2, n3) * (1.0 + 0.12 * micro);
  float tri = g_stripeTri(p);
  float sgn = g_stripeSign(tri, max(0.12, fwidth(tri) * 1.5));
  float stripeK = uFence.w * (0.55 + 0.45 * smoothstep(2.0, 18.0, camDist));
  lawn *= g_stripeTint(sgn, V, stripeK);

  // ---------------- other grounds
  vec3 verge = vec3(0.084, 0.152, 0.03) * (0.86 + 0.26 * n2.b + 0.14 * micro);
  vec3 meadow = g_meadowColor(p, n1, n2, n3) * (1.0 + 0.16 * micro);
  // wild flowers: white, yellow, mauve specks, in drifts
  float fl = n4.r;
  float drift = smoothstep(0.5, 0.8, n2.g);
  vec3 flowers = fl > 0.88 ? vec3(0.62, 0.6, 0.52) : fl < 0.06 ? vec3(0.45, 0.33, 0.04) : (fl > 0.82 && n3.a > 0.6) ? vec3(0.28, 0.16, 0.36) : vec3(0.0);
  meadow = mix(meadow, flowers, (flowers.r > 0.0 ? 0.5 : 0.0) * drift * (1.0 - smoothstep(10.0, 40.0, camDist)));
  vec3 neigh = vec3(0.07, 0.14, 0.03) * (0.86 + 0.26 * n2.g + 0.12 * micro);
  // light tuffeau gravel, cart ruts on the drive
  float peb = texture2D(uNoise, p * 4.1).a * 0.6 + texture2D(uNoise, p * 9.3).b * 0.4;
  vec3 gravel = vec3(0.42, 0.37, 0.29) * (0.72 + 0.42 * peb) * (0.92 + 0.12 * n2.r);
  float rut = 1.0 - 0.12 * (1.0 - smoothstep(0.0, 0.35, abs(abs(p.y - (${f((DRIVE.z0 + DRIVE.z1) / 2)})) - 0.75))) * step(${f(DRIVE.x0)}, p.x);
  gravel *= rut;
  vec3 soil = vec3(0.055, 0.038, 0.026) * (0.75 + 0.5 * n3.b);

  // ---------------- regions
  vec4 yard = vec4(-24.0, 9.0, ${f(HEDGE.z + HEDGE.t / 2)}, 18.0);
  float kYard = inBox(p, yard, 0.03);
  vec4 vergeBox = vec4(-24.6, ${f(9 + 2.6)}, ${f(HEDGE.z - 0.6)}, ${f(18 + 2.6)});
  float kVerge = inBox(p, vergeBox, 0.25) * (1.0 - kYard);
  float kNeigh = (1.0 - smoothstep(-24.2, -24.05, p.x)) * (1.0 - kVerge);
  vec4 court = vec4(${f(FORECOURT.x0)}, ${f(FORECOURT.x1)}, ${f(FORECOURT.z0 - 0.2)}, ${f(FORECOURT.z1)});
  vec4 drive = vec4(${f(DRIVE.x0 - 0.5)}, ${f(DRIVE.x1)}, ${f(DRIVE.z0)}, ${f(DRIVE.z1)});
  float kGravel = max(inBox(p, court, 0.06), inBox(p, drive, 0.12));
  // flower beds along the facade, either side of the perron
  float kBed = max(inBox(p, vec4(-11.2, -6.0, ${f(FACADE_Z)}, ${f(FACADE_Z + 1.25)}), 0.05), inBox(p, vec4(-2.0, 3.2, ${f(FACADE_Z)}, ${f(FACADE_Z + 1.25)}), 0.05));
  float hedgeD = abs(p.y - ${f(HEDGE.z)});
  float inHedgeX = step(${f(HEDGE.x0)}, p.x) * step(p.x, ${f(HEDGE.x1)}) * (1.0 - step(${f(HEDGE.gap0)}, p.x) * step(p.x, ${f(HEDGE.gap1)}));
  float kUnderHedge = inHedgeX * (1.0 - smoothstep(${f(HEDGE.t / 2)}, ${f(HEDGE.t / 2 + 0.12)}, hedgeD));

  vec3 albedo = meadow;
  albedo = mix(albedo, neigh, kNeigh);
  albedo = mix(albedo, verge, kVerge);
  albedo = mix(albedo, lawn, kYard);
  // around and behind the house: the same lawn without stripes
  float kHouseLawn = (1.0 - kYard) * (1.0 - kVerge) * (1.0 - smoothstep(${f(HEDGE.z - 0.6)}, ${f(HEDGE.z - 0.3)}, p.y)) * step(-30.0, p.x) * step(p.x, 9.5);
  albedo = mix(albedo, neigh * 1.05, kHouseLawn);
  albedo = mix(albedo, gravel, kGravel);
  albedo = mix(albedo, soil, max(kBed, kUnderHedge));
  float grassy = 1.0 - max(kGravel, max(kBed, kUnderHedge));

  // ---------------- occlusion (sky light) and contact darkening
  float ao = 1.0;
  for (int i = 0; i < ${TREES.length}; i++) {
    vec4 t = uTrees[i];
    float d = length(p - t.xy);
    ao *= 1.0 - t.w * (1.0 - smoothstep(0.25 * t.z, 1.2 * t.z, d));
    ao *= 1.0 - 0.45 * (1.0 - smoothstep(0.3, 1.6, d));
  }
  float dHouse = boxDist(p, vec4(${f(HOUSE.cx - HOUSE.w / 2)}, ${f(HOUSE.cx + HOUSE.w / 2)}, ${f(HOUSE.cz - HOUSE.d / 2)}, ${f(HOUSE.cz + HOUSE.d / 2)}));
  ao *= mix(0.45, 1.0, smoothstep(0.0, 2.4, dHouse));
  ao *= mix(0.5, 1.0, smoothstep(${f(HEDGE.t / 2)}, ${f(HEDGE.t / 2 + 1.1)}, hedgeD) * inHedgeX + (1.0 - inHedgeX));
  // fence lines (driven by the world: the new fence as it is built, the old fence)
  float tA, tB, tO;
  float dA = segDist(p, vec2(9.0, 18.0), vec2(9.0, -26.0), tA);    // d = 44 t
  float dB = segDist(p, vec2(9.0, 18.0), vec2(-24.0, 18.0), tB);   // d = 33 t
  float dO = segDist(p, vec2(-24.0, -26.0), vec2(-24.0, 18.0), tO);
  float builtA = step(44.0 * tA, uFence.y), builtB = step(33.0 * tB, uFence.y);
  float fNew = max((1.0 - smoothstep(0.04, 0.95, dA)) * builtA, (1.0 - smoothstep(0.04, 0.95, dB)) * builtB) * uFence.x;
  float fOld = (1.0 - smoothstep(0.04, 1.0, dO)) * uFence.z;
  ao *= 1.0 - 0.5 * max(fNew, fOld);

  // ---------------- wet ground after the storm
  float wet = uWet * grassy;
  albedo *= mix(1.0, 0.84, uWet);
  albedo = mix(vec3(dot(albedo, vec3(0.3, 0.55, 0.15))), albedo, 1.0 - 0.18 * wet);

  // ---------------- lighting
  vec3 L = uSunDir;
  float ndl = dot(N, L);
  float wrap = mix(max(ndl, 0.0), clamp((ndl + 0.3) / 1.3, 0.0, 1.0), grassy);
  float sh = sunShadow(vWorld + N * 0.02, 0.0004, 1.6);
  vec3 col = albedo * (uSunCol * wrap * sh / G_PI + hemiAmbient(N) * ao);
  // grazing sheen: distant lawn reads lighter and silvery
  float nv = clamp(dot(N, V), 0.0, 1.0);
  float graze = pow(1.0 - nv, 4.0) * grassy;
  col = mix(col, col * vec3(1.18, 1.16, 1.1) + hazeColor(reflect(-V, N)) * 0.012, graze * 0.6);
  // wet sky reflection and sun glints
  vec3 R = reflect(-V, N);
  float fr = 0.02 + 0.98 * pow(1.0 - nv, 5.0);
  col += wet * fr * hazeColor(R) * 0.07 * ao * (1.0 - smoothstep(0.0, 0.35, nv));
  float gl = pow(max(dot(R, L), 0.0), 90.0) * step(0.93, n4.a);
  col += wet * gl * uSunCol * sh * 0.06;

  col = applyHaze(col, vWorld - cameraPosition, cameraPosition.y);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// ------------------------------------------------------------------ countryside
const FIELDS_FRAG = /* glsl */ `
${LIGHT_GLSL}
${HAZE_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

void main() {
  vec2 p = vWorld.xz;
  vec3 V = normalize(cameraPosition - vWorld);
  float camDist = length(cameraPosition - vWorld);
  vec3 N = normalize(vNormal);
  float r = length(p - vec2(${f(CENTER[0])}, ${f(CENTER[1])}));

  // field grid, turned 17 degrees, rows of fields slipped against each other
  const float A = 0.297;
  mat2 rot = mat2(cos(A), -sin(A), sin(A), cos(A));
  vec2 q = rot * p;
  vec2 cellSize = vec2(190.0, 120.0);
  float row = floor(q.y / cellSize.y);
  q.x += hash12(vec2(row, 3.7)) * cellSize.x;
  vec2 c = floor(q / cellSize);
  vec2 lc = q / cellSize - c;            // 0..1 inside the field
  float id = hash12(c + 17.0);
  float id2 = hash12(c * 1.7 + 3.1);

  // crops of early summer
  vec3 col;
  float rows = 0.0;
  float along = (id2 > 0.5 ? lc.x * cellSize.x : lc.y * cellSize.y);
  float rw = fwidth(along);
  if (id < 0.24) { col = vec3(0.36, 0.27, 0.105); rows = 1.0; }          // ripe wheat
  else if (id < 0.36) { col = vec3(0.3, 0.25, 0.13); rows = 1.0; }       // barley stubble
  else if (id < 0.52) { col = vec3(0.075, 0.14, 0.035); }                // pasture
  else if (id < 0.62) { col = vec3(0.05, 0.11, 0.025); rows = 1.0; }     // maize
  else if (id < 0.72) { col = vec3(0.07, 0.11, 0.03); rows = 2.0; }      // vines on pale soil
  else if (id < 0.8) { col = vec3(0.15, 0.11, 0.075); rows = 1.0; }      // ploughed
  else if (id < 0.9) { col = vec3(0.13, 0.15, 0.06); }                   // hay meadow
  else { col = vec3(0.09, 0.15, 0.04); }                                 // clover
  col *= 0.86 + 0.22 * hash12(c + 5.3);
  // crop rows, faded out where they would alias
  float spacing = rows > 1.5 ? 2.2 : 0.9;
  float rp = abs(fract(along / spacing) - 0.5) * 2.0;
  float aa = 1.0 - smoothstep(0.15, 0.6, rw / spacing);
  if (rows > 1.5) col = mix(col, vec3(0.2, 0.17, 0.12), smoothstep(0.3, 0.7, rp) * aa * 0.8 + (1.0 - aa) * 0.4);
  else if (rows > 0.5) col *= mix(1.0, 0.82 + 0.3 * smoothstep(0.2, 0.8, rp), aa);
  // texture inside fields
  vec4 n2 = texture2D(uNoise, p * 0.004 + 0.3);
  vec4 n3 = texture2D(uNoise, p * 0.021);
  col *= 0.86 + 0.24 * n2.g + 0.12 * (n3.b - 0.5);
  // the meadow around the garden blends into the fields
  vec3 mead = mix(vec3(0.1, 0.15, 0.036), vec3(0.19, 0.18, 0.075), smoothstep(0.45, 0.85, n3.r) * 0.6) * (0.86 + 0.26 * n2.b);
  col = mix(mead, col, smoothstep(${f(NEAR_R + 25)}, ${f(NEAR_R + 120)}, r));
  // hedgerows and grass margins along field edges
  vec2 e = min(lc, 1.0 - lc) * cellSize;
  float edge = min(e.x, e.y);
  float hedge = (hash12(c + vec2(edge == e.x ? 1.0 : 2.0, 0.0)) > 0.4 ? 1.0 : 0.0);
  float ew = fwidth(edge);
  col = mix(col, vec3(0.08, 0.13, 0.035), (1.0 - smoothstep(2.0, 3.5 + ew, edge)) * 0.8 * smoothstep(${f(NEAR_R + 25)}, ${f(NEAR_R + 120)}, r));
  col = mix(col, vec3(0.025, 0.05, 0.02), hedge * (1.0 - smoothstep(0.0, 2.2 + ew, edge)) * smoothstep(${f(NEAR_R + 60)}, ${f(NEAR_R + 200)}, r));

  float ndl = max(dot(N, uSunDir), 0.0);
  vec3 lit = col * (uSunCol * ndl / G_PI + hemiAmbient(N));
  float nv = clamp(dot(N, V), 0.0, 1.0);
  lit = mix(lit, lit * 1.15, pow(1.0 - nv, 4.0) * 0.5);
  lit *= mix(1.0, 0.7, uWet);
  lit = applyHaze(lit, vWorld - cameraPosition, cameraPosition.y);
  gl_FragColor = vec4(lit, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createGround(lightU) {
  // garden disc: rings every 0.8 m up to the near-field radius
  const radiiIn = [];
  for (let r = 0.5; r < NEAR_R - 0.01; r += r < 30 ? 1.0 : 1.4) radiiIn.push(r);
  radiiIn.push(NEAR_R);
  const M = 288;
  const geoIn = radialGeometry(radiiIn, M);
  const treeU = TREES.map((t) => new THREE.Vector4(t.x + (t.lean ? t.lean[0] * 1.5 : 0), t.z + (t.lean ? t.lean[1] * 1.5 : 0), t.r, 0.5));
  const uniforms = {
    ...lightU,
    uTrees: { value: treeU },
    uFence: { value: new THREE.Vector4(0, 0, 0, 1) },
  };
  const matIn = new THREE.ShaderMaterial({ name: 'garden-ground', uniforms, vertexShader: VERT, fragmentShader: GARDEN_FRAG });
  const inner = new THREE.Mesh(geoIn, matIn);
  inner.name = 'garden-ground';
  inner.receiveShadow = true;

  // countryside ring: geometric spacing out to the horizon
  const radiiOut = [NEAR_R];
  for (let r = NEAR_R; r < 4600; ) {
    r = r * 1.048 + 0.8;
    radiiOut.push(r);
  }
  const geoOut = radialGeometry(radiiOut, M);
  const matOut = new THREE.ShaderMaterial({ name: 'garden-fields', uniforms: { ...lightU }, vertexShader: VERT, fragmentShader: FIELDS_FRAG });
  const outer = new THREE.Mesh(geoOut, matOut);
  outer.name = 'garden-fields';

  return { inner, outer, uniforms };
}
