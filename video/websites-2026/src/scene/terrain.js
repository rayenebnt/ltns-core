import * as THREE from 'three';
import { mergeSafe } from './geom.js';
import { createNoise2D, fbm, mulberry32, smoothstep, clamp } from './noise.js';
import { TOWER } from './config.js';
import { QUAY_Y, breakwaterDistance } from './marina.js';

// Coastline, land on the west side. The tower stands on the tip of a small cape;
// the coast then recedes to the north-north-west (left of the hero frame).
const COAST_CTRL = [
  [-1600, 1500], [-900, 760], [-430, 330], [-170, 158], [-40, 104], [40, 66], [76, 14], [66, -52],
  [22, -118], [-48, -190], [-150, -262], [-232, -360], [-262, -490], [-330, -650], [-452, -880],
  [-610, -1250], [-760, -1700], [-1000, -2350], [-1300, -3150], [-1700, -4200], [-2250, -5600],
  [-2900, -7300], [-3800, -9600], [-5100, -12800], [-7000, -17600], [-9600, -24000], [-13500, -33000],
];

function catmull(points, sub) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    for (let k = 0; k < sub; k++) {
      const t = k / sub, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

const COAST = catmull(COAST_CTRL, 6);
// closed land polygon for the inside test
const LAND_POLY = [...COAST, [-90000, -60000], [-90000, 60000], [-1600, 60000]];
const SEG = [];
for (let i = 0; i < COAST.length - 1; i++) {
  const [ax, az] = COAST[i], [bx, bz] = COAST[i + 1];
  SEG.push({ ax, az, dx: bx - ax, dz: bz - az, l2: (bx - ax) ** 2 + (bz - az) ** 2, minx: Math.min(ax, bx), maxx: Math.max(ax, bx), minz: Math.min(az, bz), maxz: Math.max(az, bz) });
}
export let COAST_LEN = 0;
const COAST_ACC = [0];
for (const s of SEG) {
  COAST_LEN += Math.sqrt(s.l2);
  COAST_ACC.push(COAST_LEN);
}

function insideLand(x, z) {
  let inside = false;
  const P = LAND_POLY;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const xi = P[i][0], zi = P[i][1], xj = P[j][0], zj = P[j][1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function coastSD(x, z) {
  let best = 1e18;
  for (const s of SEG) {
    const bx = x < s.minx ? s.minx - x : x > s.maxx ? x - s.maxx : 0;
    const bz = z < s.minz ? s.minz - z : z > s.maxz ? z - s.maxz : 0;
    if (bx * bx + bz * bz >= best) continue;
    let t = ((x - s.ax) * s.dx + (z - s.az) * s.dz) / s.l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = s.ax + s.dx * t - x, ez = s.az + s.dz * t - z;
    const d2 = ex * ex + ez * ez;
    if (d2 < best) best = d2;
  }
  const d = Math.sqrt(best);
  return insideLand(x, z) ? d : -d;
}

// point on the coast at arc length l (with the local tangent)
export function coastAt(l) {
  l = clamp(l, 0, COAST_LEN - 1e-3);
  let i = 0;
  while (COAST_ACC[i + 1] < l) i++;
  const s = SEG[i];
  const t = (l - COAST_ACC[i]) / (COAST_ACC[i + 1] - COAST_ACC[i]);
  const len = Math.sqrt(s.l2);
  return { x: s.ax + s.dx * t, z: s.az + s.dz * t, tx: s.dx / len, tz: s.dz / len };
}

const nA = createNoise2D(101);
const nB = createNoise2D(102);
const nC = createNoise2D(103);

function ridged(x, z, oct) {
  let a = 0.5, f = 1, s = 0, n = 0;
  for (let i = 0; i < oct; i++) {
    const v = 1 - Math.abs(nB(x * f, z * f));
    s += a * v * v * (i < 2 ? 1 : 0.6);
    n += a;
    a *= 0.5;
    f *= 2.03;
  }
  return s / n;
}

export function landHeight(x, z, sdIn) {
  const sd = sdIn === undefined ? coastSD(x, z) : sdIn;
  let h;
  if (sd <= 0) {
    h = Math.max(-42, sd * 0.2) - 0.5;
  } else {
    const rise = 7.0 * smoothstep(0, 26, sd);
    const coastal = 300 * (1 - Math.exp(-Math.max(0, sd - 26) / 1700));
    const hillAmp = 420 * smoothstep(120, 2200, sd) + 500 * smoothstep(3000, 9000, sd);
    const hills = (fbm(nA, x / 2100, z / 2100, 5) * 0.5 + 0.5) ** 1.3 * hillAmp;
    const ridges = ridged(x / 6400, z / 6400, 4) * smoothstep(5500, 15000, sd) * 1500;
    h = rise + coastal + hills + ridges;
  }
  // rocky irregularities around the water line
  h += nC(x * 0.045, z * 0.045) * 2.2 * Math.exp(-Math.abs(sd) / 30);
  // marina (marina.js): a flat terrace just under the quay top along the south shore of the
  // cape, and a dredged basin in front of the quay wall
  const qm = quayMask(x, z);
  if (qm > 0) {
    if (sd > -1.0) h += (QUAY_Y - 0.12 - h) * qm * smoothstep(17, 9, sd);
    else h = Math.min(h, h + (-4.5 - h) * qm);
  }
  // tower plateau
  const r = Math.hypot(x, z);
  const fl = smoothstep(58, 34, r);
  return h * (1 - fl) + TOWER.ground * fl;
}

// the south shore of the cape that the marina quay follows (by bearing from the tower)
export function quayMask(x, z) {
  const r = Math.hypot(x, z);
  if (r > 240) return 0;
  const b = ((Math.atan2(x, -z) * 180) / Math.PI + 360) % 360;
  return smoothstep(111, 119, b) * smoothstep(217, 210, b);
}

function srgb(hex) {
  return new THREE.Color(hex); // THREE.Color(hex) converts sRGB hex to linear working space
}

// ------------------------------------------------------------------ terrain mesh
export function createTerrain({ envMap, detailTex }) {
  const rings = [];
  for (let r = 7; r < 42000; r *= 1.042) rings.push(r);
  // angular density concentrated on the north-west quadrant seen from the hero view and the room
  const M = 420;
  const thetas = [];
  for (let i = 0; i < M; i++) {
    const u = i / M;
    // bearing measured from north towards east; warp so more samples fall in [-150, 30] degrees
    const b = -180 + 360 * (u + 0.11 * Math.sin(2 * Math.PI * (u - 0.3)));
    thetas.push((b * Math.PI) / 180);
  }
  const nv = rings.length * M;
  const pos = new Float32Array(nv * 3);
  const col = new Float32Array(nv * 3);
  const hgt = new Float32Array(nv);
  const sds = new Float32Array(nv);
  let k = 0;
  for (let i = 0; i < rings.length; i++) {
    for (let j = 0; j < M; j++, k++) {
      const b = thetas[j];
      const x = Math.sin(b) * rings[i];
      const z = -Math.cos(b) * rings[i];
      const sd = coastSD(x, z);
      const h = landHeight(x, z, sd);
      pos[k * 3] = x;
      pos[k * 3 + 1] = h;
      pos[k * 3 + 2] = z;
      hgt[k] = h;
      sds[k] = sd;
    }
  }
  const idx = [];
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < M; j++) {
      const a = i * M + j, b = i * M + ((j + 1) % M), c = (i + 1) * M + j, d = (i + 1) * M + ((j + 1) % M);
      if (Math.max(hgt[a], hgt[b], hgt[c], hgt[d]) < -4) continue;
      idx.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal.array;
  const wet = srgb(0x6a5f52), rock = srgb(0xa89a82), rockDark = srgb(0x7e705c), maquis = srgb(0x2f3a24), dry = srgb(0x4a4a30), olive = srgb(0x3c4630), urban = srgb(0xbfae90), paving = srgb(0x857a68), garden = srgb(0x27331f);
  const c = new THREE.Color();
  for (let v = 0; v < nv; v++) {
    const x = pos[v * 3], z = pos[v * 3 + 2], h = hgt[v], sd = sds[v];
    const ny = nrm[v * 3 + 1];
    const steep = smoothstep(0.88, 0.64, ny);
    const shore = smoothstep(9, 1.5, sd);
    const n1 = fbm(nA, x * 0.012, z * 0.012, 3);
    const n2 = nC(x * 0.003, z * 0.003);
    const n3 = nC(x * 0.021 + 5.0, z * 0.021 - 3.0);
    c.copy(maquis).lerp(dry, clamp(0.2 + n1 * 0.8, 0, 1) * 0.45);
    c.lerp(olive, clamp(n2 * 0.6 + 0.2, 0, 1) * 0.5);
    // exposed pale limestone: shore band, steep slopes, scattered outcrops
    const rk = clamp(Math.max(steep * 0.8, shore * 0.6) + (n1 > 0.4 ? 0.18 : 0) + (n3 > 0.55 ? 0.2 : 0), 0, 1);
    c.lerp(n2 > 0.1 ? rock : rockDark, rk);
    c.lerp(wet, smoothstep(2.5, 0.4, sd) * 0.8);
    // the tower garden and its paved forecourt
    const rt = Math.hypot(x, z);
    c.lerp(garden, smoothstep(62, 44, rt) * 0.85);
    c.lerp(paving, smoothstep(27.6, 27.2, rt)); // crisp edge, under the kerb ring (tower.js)
    // town belt: lighter ground
    const r = Math.hypot(x, z);
    const town = smoothstep(500, 900, r) * smoothstep(500, 120, sd) * smoothstep(-1, 6, h) * (1 - smoothstep(14000, 18000, r));
    c.lerp(urban, town * 0.6);
    if (h < 0) c.copy(rockDark).multiplyScalar(0.6);
    col[v * 3] = c.r;
    col[v * 3 + 1] = c.g;
    col[v * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0, envMap, envMapIntensity: 1.0 });
  // vegetation patches at two scales so the large triangles do not read as flat facets
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDetail = { value: detailTex };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nuniform sampler2D uDetail;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float dA = texture2D(uDetail, vWP.xz / 70.0).b;
        float dB = texture2D(uDetail, vWP.xz / 17.0 + 0.37).b;
        float dC = texture2D(uDetail, vWP.xz / 430.0 + 0.71).b;
        float veg = smoothstep(0.35, 0.75, dA * 0.6 + dC * 0.4);
        diffuseColor.rgb *= 0.78 + 0.34 * dB;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.62, 0.78, 0.52), veg * smoothstep(1.0, 12.0, vWP.y) * 0.8 * smoothstep(30.0, 40.0, length(vWP.xz)));`);
  };
  mat.customProgramCacheKey = () => 'terrain-detail';
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'terrain';
  return mesh;
}

// ------------------------------------------------------- depth map for the sea
export function createShoreMap() {
  const x0 = -1100, z0 = -1700, w = 1500, d = 1900;
  const W = 512, H = 640;
  const data = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const x = x0 + ((i + 0.5) / W) * w;
      const z = z0 + ((j + 0.5) / H) * d;
      // the breakwater is not part of the terrain mesh, but the sea must see it (foam at its toe)
      const h = Math.max(landHeight(x, z), 2.6 - 0.56 * breakwaterDistance(x, z));
      data[j * W + i] = clamp((-h / 30) * 255, 0, 255);
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RedFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return { tex, rect: new THREE.Vector4(x0, z0, 1 / w, 1 / d) };
}

// --------------------------------------------------------------- vegetation
function umbrellaPineGeometry() {
  const parts = [];
  const rnd = mulberry32(7);
  for (let i = 0; i < 4; i++) {
    const g = new THREE.SphereGeometry(1, 9, 5);
    const a = rnd() * Math.PI * 2, r = i === 0 ? 0 : 0.45 + rnd() * 0.18;
    g.scale(0.7 + rnd() * 0.18, 0.36 + rnd() * 0.1, 0.7 + rnd() * 0.18);
    g.translate(Math.cos(a) * r, (rnd() - 0.5) * 0.14 - (i === 0 ? 0 : 0.05), Math.sin(a) * r);
    parts.push(g);
  }
  return mergeSafe(parts); // keeps the smooth normals of each lump
}

export function createVegetation({ envMap, count = 420, shrubs = 700 }) {
  const rnd = mulberry32(17);
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.3, 1, 6, 1, true);
  trunkGeo.translate(0, 0.5, 0);
  const crownGeo = umbrellaPineGeometry();

  const pines = [];
  const cypress = [];
  let tries = 0;
  while (pines.length < count && tries < 40000) {
    tries++;
    const x = -650 + rnd() * 760;
    const z = -820 + rnd() * 1000;
    const r = Math.hypot(x, z);
    if (r < 36) continue;
    const sd = coastSD(x, z);
    if (sd < 7 || sd > 700) continue;
    const h = landHeight(x, z, sd);
    if (h < 1.5 || h > 70) continue;
    const cluster = fbm(nA, x * 0.008 + 3, z * 0.008 - 2, 2);
    if (cluster < -0.12 + rnd() * 0.3) continue;
    pines.push([x, h, z, 0.75 + rnd() * 0.5, rnd()]);
  }
  // a few cypresses around the tower garden
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, r = 38 + rnd() * 50;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const sd = coastSD(x, z);
    if (sd < 6) continue;
    cypress.push([x, landHeight(x, z, sd), z, 0.8 + rnd() * 0.4]);
  }

  // low maquis shrubs filling the ground between the trees
  const bushes = [];
  tries = 0;
  while (bushes.length < shrubs && tries < 60000) {
    tries++;
    const x = -700 + rnd() * 820;
    const z = -900 + rnd() * 1080;
    if (Math.hypot(x, z) < 30) continue;
    const sd = coastSD(x, z);
    if (sd < 4 || sd > 800) continue;
    const h = landHeight(x, z, sd);
    if (h < 1 || h > 90) continue;
    if (fbm(nA, x * 0.01 - 4, z * 0.01 + 6, 2) < -0.2 + rnd() * 0.3) continue;
    bushes.push([x, h, z, 1.2 + rnd() * 1.6]);
  }
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x5a4434, roughness: 0.95, envMap, envMapIntensity: 0.4 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, envMap, envMapIntensity: 0.5, flatShading: false });
  const trunks = new THREE.InstancedMesh(trunkGeo, barkMat, pines.length);
  const crowns = new THREE.InstancedMesh(crownGeo, leafMat, pines.length + cypress.length);
  const bushGeo = new THREE.IcosahedronGeometry(1, 0);
  const bushMesh = new THREE.InstancedMesh(bushGeo, leafMat, bushes.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
  const green = new THREE.Color();
  pines.forEach(([x, h, z, sc, rv], i) => {
    const H = (5.0 + rv * 3.0) * sc;
    e.set((rnd() - 0.5) * 0.18, 0, (rnd() - 0.5) * 0.18);
    q.setFromEuler(e);
    m.compose(p.set(x, h - 0.5, z), q, s.set(sc * 1.3, H, sc * 1.3));
    trunks.setMatrixAt(i, m);
    const R = (4.4 + rv * 2.6) * sc;
    q.setFromEuler(e.set(0, rnd() * 6.28, 0));
    m.compose(p.set(x, h - 0.5 + H, z), q, s.set(R, R * 0.95, R));
    crowns.setMatrixAt(i, m);
    green.setRGB(0.085 + rnd() * 0.03, 0.115 + rnd() * 0.035, 0.05 + rnd() * 0.02);
    crowns.setColorAt(i, green);
  });
  // cypresses share the crown mesh: re-use the instanced crown, stretched into a spindle
  cypress.forEach(([x, h, z, sc], j) => {
    const i = pines.length + j;
    m.compose(p.set(x, h + 7 * sc, z), q.identity(), s.set(1.05 * sc, 24 * sc, 1.05 * sc));
    crowns.setMatrixAt(i, m);
    green.setRGB(0.05, 0.075, 0.04);
    crowns.setColorAt(i, green);
  });
  bushes.forEach(([x, h, z, r], j) => {
    q.setFromEuler(e.set(0, rnd() * 6.28, 0));
    m.compose(p.set(x, h + r * 0.1, z), q, s.set(r, r * 0.55, r));
    bushMesh.setMatrixAt(j, m);
    green.setRGB(0.07 + rnd() * 0.04, 0.09 + rnd() * 0.04, 0.045 + rnd() * 0.02);
    bushMesh.setColorAt(j, green);
  });
  trunks.name = 'pine-trunks';
  crowns.name = 'pine-crowns';
  bushMesh.name = 'shrubs';
  return [trunks, crowns, bushMesh];
}

// ------------------------------------------------------------- coastal town
export function createTown({ envMap, count = 3600 }) {
  const rnd = mulberry32(29);
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  // terracotta tint on roofs, slightly darker bases
  const colors = [];
  const pa = geo.attributes.position, na = geo.attributes.normal;
  for (let i = 0; i < pa.count; i++) {
    const ny = na.getY(i), y = pa.getY(i);
    if (ny > 0.5) colors.push(0.9, 0.55, 0.42);
    else {
      const k = 0.8 + 0.2 * y;
      colors.push(k, k, k);
    }
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, envMap, envMapIntensity: 0.8 });
  // window grid drawn from the world position (no texture), a few warm lit windows
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;')
      .replace('#include <fog_vertex>', `#include <fog_vertex>
        mat4 twm = modelMatrix * instanceMatrix;
        vWP = (twm * vec4(transformed, 1.0)).xyz;
        vWN = normalize(mat3(twm) * objectNormal);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (abs(vWN.y) < 0.5) {
          vec2 hd = normalize(vec2(-vWN.z, vWN.x));
          float hc = dot(vWP.xz, hd);
          vec2 cell = vec2(hc / 3.4, vWP.y / 3.1);
          vec2 f = fract(cell);
          float win = step(0.28, f.x) * step(f.x, 0.78) * step(0.32, f.y) * step(f.y, 0.82);
          float rnd = fract(sin(dot(floor(cell), vec2(12.9898, 78.233))) * 43758.5453);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.055, 0.065), win * 0.85);
          totalEmissiveRadiance += win * step(0.94, rnd) * vec3(1.0, 0.62, 0.3) * 0.9;
        }`);
  };
  mat.customProgramCacheKey = () => 'town-windows';
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const palette = [0xe8dcc0, 0xe9d6a4, 0xd9b17c, 0xe3b195, 0xf0ece2, 0xd89c80, 0xe5cfa8, 0xcfc4b2].map((h) => new THREE.Color(h));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), ax = new THREE.Vector3(0, 1, 0);
  const startL = 3350; // the town starts ~1 km past the cape, along the bay
  let n = 0, tries = 0;
  while (n < count && tries < count * 8) {
    tries++;
    // more buildings close to the cape, thinning out along the bay
    const u = rnd();
    const l = startL + (u ** 1.35) * 15500;
    const c = coastAt(l);
    // inland normal: the land lies on the left of the coast direction
    const nx = c.tz, nz = -c.tx;
    const depth = 12 + (-Math.log(1 - rnd() * 0.97)) * (120 + l * 0.022);
    const lat = (rnd() - 0.5) * 80;
    const x = c.x + nx * depth + c.tx * lat;
    const z = c.z + nz * depth + c.tz * lat;
    const sd = coastSD(x, z);
    if (sd < 10) continue;
    const h = landHeight(x, z, sd);
    if (h < 1 || h > 170) continue;
    const hb = landHeight(x + 9, z + 9, undefined);
    if (Math.abs(hb - h) > 9) continue;
    const tall = rnd() < 0.07;
    const bh = tall ? 26 + rnd() * 18 : 7 + rnd() * rnd() * 16;
    const bw = 8 + rnd() * 14, bd = 8 + rnd() * 9;
    q.setFromAxisAngle(ax, Math.atan2(c.tx, c.tz) + (rnd() - 0.5) * 0.3);
    m.compose(p.set(x, h - 2.5, z), q, s.set(bw, bh + 2.5, bd));
    mesh.setMatrixAt(n, m);
    const col = palette[(rnd() * palette.length) | 0].clone().multiplyScalar(0.82 + rnd() * 0.18);
    mesh.setColorAt(n, col);
    n++;
  }
  mesh.count = n;
  mesh.name = 'town';
  return mesh;
}

// ------------------------------------------------------ promenade lamps on the cape
// Warm lamp posts along the shore path around the tower: a string of lights in the hero.
export function createPromenade({ envMap, extra = [] }) {
  const pts = [...extra];
  let last = null;
  for (let l = 0; l < COAST_LEN; l += 2) {
    const c = coastAt(l);
    if (Math.hypot(c.x, c.z) > 230 || c.z < -70) continue;
    if (quayMask(c.x, c.z) > 0.2) continue; // the marina quay has its own lamps
    // inland normal: the land lies on the left of the coast direction
    const nx = c.tz, nz = -c.tx;
    const x = c.x + nx * 9, z = c.z + nz * 9;
    if (Math.hypot(x, z) < 34) continue;
    if (last && Math.hypot(x - last[0], z - last[1]) < 11) continue;
    const h = landHeight(x, z);
    if (h < 0.5) continue;
    pts.push([x, h, z]);
    last = [x, z];
  }
  const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, 3.2, 6);
  poleGeo.translate(0, 1.6, 0);
  const headGeo = new THREE.SphereGeometry(0.2, 10, 8);
  headGeo.translate(0, 3.25, 0);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.6, metalness: 0.4, envMap });
  const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.66, 0.36).multiplyScalar(5.5) });
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, pts.length);
  const heads = new THREE.InstancedMesh(headGeo, headMat, pts.length);
  const m = new THREE.Matrix4();
  pts.forEach(([x, h, z], i) => {
    m.makeTranslation(x, h - 0.1, z);
    poles.setMatrixAt(i, m);
    heads.setMatrixAt(i, m);
  });
  poles.name = 'promenade-poles';
  heads.name = 'promenade-lamps';
  return [poles, heads];
}
