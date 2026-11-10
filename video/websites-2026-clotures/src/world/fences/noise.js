// Small deterministic helpers for the fence module (no dependency): seeded random numbers,
// periodic value noise (tileable textures) and the usual scalar functions.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const fract = (x) => x - Math.floor(x);

// Periodic value noise on a W x H grid with px x py lattice cells (tiles in both directions).
// Quintic interpolation, values in [0, 1].
export function periodicNoise(W, H, px, py, seed) {
  const rnd = mulberry32(seed);
  const lat = new Float32Array(px * py);
  for (let i = 0; i < lat.length; i++) lat[i] = rnd();
  const out = new Float32Array(W * H);
  const q = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const tx = new Float32Array(W), x0s = new Int32Array(W), x1s = new Int32Array(W);
  for (let x = 0; x < W; x++) {
    const fx = (x / W) * px, ix = Math.floor(fx);
    tx[x] = q(fx - ix);
    x0s[x] = ix % px;
    x1s[x] = (ix + 1) % px;
  }
  for (let y = 0; y < H; y++) {
    const fy = (y / H) * py, iy = Math.floor(fy), ty = q(fy - iy);
    const r0 = (iy % py) * px, r1 = ((iy + 1) % py) * px;
    for (let x = 0; x < W; x++) {
      const a = lat[r0 + x0s[x]], b = lat[r0 + x1s[x]], c = lat[r1 + x0s[x]], d = lat[r1 + x1s[x]];
      const t = tx[x];
      out[y * W + x] = (a + (b - a) * t) * (1 - ty) + (c + (d - c) * t) * ty;
    }
  }
  return out;
}

// sum of periodic octaves (each one doubles the lattice), normalised to [0, 1]
export function periodicFbm(W, H, px, py, octaves, seed, gain = 0.5) {
  const out = new Float32Array(W * H);
  let amp = 1, sum = 0;
  for (let o = 0; o < octaves; o++) {
    const n = periodicNoise(W, H, px << o, py << o, seed + o * 101);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    sum += amp;
    amp *= gain;
  }
  for (let i = 0; i < out.length; i++) out[i] /= sum;
  return out;
}

// 32-bit integer hash -> [0, 1)
export function hash2(x, y, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
