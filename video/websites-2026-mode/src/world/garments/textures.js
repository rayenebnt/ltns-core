// Shared procedural textures of the wardrobe (built once, reused by every garment):
// - noise: RGBA tiling noise read by the fabric shader (R mottling of garment-dyed pieces,
//   G heather fibres, B fine fuzz, A medium noise for the dye edge and the print fade);
// - fabric normal maps (tangent space, tiling, mipmapped so the knit never moirés far away):
//   jersey stitches, fleece, wool melton, football mesh.
import * as THREE from 'three';
import { tileNoise, tileFbm, clamp } from './noise.js';

const cache = {};

function dataTexture(data, n, { srgb = false } = {}) {
  const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

export function noiseTexture() {
  if (cache.noise) return cache.noise;
  const n = 256, data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4;
      const u = x / n, v = y / n;
      // R: large soft blotches (garment-dyed mottling)
      data[i] = 255 * clamp(tileFbm(u * 4, v * 4, 4, 4, 4, 11) * 1.35 - 0.17);
      // G: heather fibres: short streaks along the knit courses (stretched along x)
      const f = tileNoise(u * 24, v * 160, 24, 160, 23) * 0.7 + tileNoise(u * 48, v * 256, 48, 256, 29) * 0.3;
      data[i + 1] = 255 * clamp((f - 0.5) * 2.2 + 0.5);
      // B: fine fuzz
      data[i + 2] = 255 * tileFbm(u * 64, v * 64, 64, 64, 2, 31);
      // A: medium noise (dye edge, print wear)
      data[i + 3] = 255 * tileFbm(u * 12, v * 12, 12, 12, 3, 41);
    }
  }
  cache.noise = dataTexture(data, n);
  return cache.noise;
}

// height field -> tangent-space normal map (rows go up with v, as three's uv convention)
function normalFromHeight(n, height, strength) {
  const h = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) h[y * n + x] = height(x / n, y / n, x, y);
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const l = h[y * n + ((x + n - 1) % n)], r = h[y * n + ((x + 1) % n)];
      const d = h[((y + n - 1) % n) * n + x], u = h[((y + 1) % n) * n + x];
      let nx = (l - r) * strength, ny = (d - u) * strength, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len; nz /= len;
      const i = (y * n + x) * 4;
      data[i] = (nx * 0.5 + 0.5) * 255;
      data[i + 1] = (ny * 0.5 + 0.5) * 255;
      data[i + 2] = (nz * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  return data;
}

// single jersey seen from the face: columns of V-shaped loops (two slanted yarn legs per stitch)
function jerseyHeight(cols, rows) {
  return (u, v) => {
    const cu = u * cols, cv = v * rows;
    const fu = cu - Math.floor(cu), fv = cv - Math.floor(cv);
    // each leg: a rounded yarn ridge along a slanted line; legs of the stitch below overlap a little
    let best = 0;
    for (const s of [-1, 1]) {
      for (const dv of [0, 1]) {
        const vv = fv + dv;
        // leg from the V bottom (0.5, 0) to the top (0.5 + s*0.38, 1.15)
        const ax = 0.5, ay = 0, bx = 0.5 + s * 0.4, by = 1.15;
        const dx = bx - ax, dy = by - ay;
        const t = clamp(((fu - ax) * dx + (vv - ay) * dy) / (dx * dx + dy * dy));
        const qx = ax + dx * t - fu, qy = ay + dy * t - vv;
        const d = Math.sqrt(qx * qx + qy * qy) / 0.21;
        if (d < 1) best = Math.max(best, Math.sqrt(1 - d * d) * (0.75 + 0.25 * Math.sin(t * Math.PI)));
      }
    }
    return best;
  };
}

const fineJersey = jerseyHeight(32, 32);
const KINDS = {
  jersey: { n: 256, strength: 2.2, height: jerseyHeight(16, 16) },
  // fleece: soft, brushed: blurry bumps, no visible stitch
  fleece: { n: 256, strength: 3.0, height: (u, v) => tileFbm(u * 32, v * 32, 32, 32, 3, 5) * 0.8 + tileNoise(u * 96, v * 96, 96, 96, 9) * 0.2 },
  // wool melton: felted, almost flat, a fine fibrous grain
  melton: { n: 256, strength: 2.4, height: (u, v) => tileFbm(u * 48, v * 48, 48, 48, 3, 7) * 0.7 + tileNoise(u * 128, v * 40, 128, 40, 13) * 0.3 },
  // football mesh: a grid of small holes in a fine knit
  mesh: {
    n: 256,
    strength: 2.6,
    height: (u, v) => {
      const k = fineJersey(u, v) * 0.35;
      const gu = u * 16, gv = v * 16 + (Math.floor(u * 16) % 2) * 0.5; // staggered holes
      const fu = gu - Math.floor(gu) - 0.5, fv = gv - Math.floor(gv) - 0.5;
      const r = Math.sqrt(fu * fu + fv * fv) / 0.24;
      return k + (r < 1 ? -0.9 * Math.sqrt(1 - r * r) : 0) + 0.6;
    },
  },
};

export function fabricNormal(kind) {
  if (cache[kind]) return cache[kind];
  const k = KINDS[kind] || KINDS.jersey;
  cache[kind] = dataTexture(normalFromHeight(k.n, k.height, k.strength), k.n);
  return cache[kind];
}

export function setAnisotropy(renderer, level) {
  const max = renderer?.capabilities?.getMaxAnisotropy?.() || 1;
  const a = Math.min(max, level === 'low' ? 1 : level === 'medium' ? 4 : 8);
  for (const t of Object.values(cache)) t.anisotropy = a;
  return a;
}

export function disposeTextures() {
  for (const k of Object.keys(cache)) {
    cache[k].dispose();
    delete cache[k];
  }
}
