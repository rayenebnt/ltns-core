// Textures of the maison de maître, generated at load time:
//  tuffeau ashlar (blocks, fine lime joints, per-block tone, weathering) + normal map,
//  smooth tuffeau for the dressings, slate rows + normal map, louvred shutters, and the
//  glass "interior" (dark rooms, sheer curtains) under the sky reflection.
import * as THREE from 'three';
import { mulberry32, createNoise2D, fbm } from './noise.js';

function dataTex(data, w, h, srgb, repeat = true) {
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}
function normalFromHeight(hgt, w, h, k) {
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const xl = (x - 1 + w) % w, xr = (x + 1) % w, yu = (y - 1 + h) % h, yd = (y + 1) % h;
      const dx = (hgt[y * w + xr] - hgt[y * w + xl]) * k;
      const dy = (hgt[yd * w + x] - hgt[yu * w + x]) * k;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      out[i] = (-dx / l * 0.5 + 0.5) * 255;
      out[i + 1] = (dy / l * 0.5 + 0.5) * 255;
      out[i + 2] = (1 / l * 0.5 + 0.5) * 255;
      out[i + 3] = 255;
    }
  return out;
}

// --------------------------------------------------------------- tuffeau ashlar
// 512 px = 2.04 m square; 6 courses of 0.34 m; data rows go up (v up = y up)
export const STONE_TILE = 2.04;
export function tuffeauTextures() {
  const W = 512, H = 512;
  const rnd = mulberry32(77);
  const n = createNoise2D(78), n2 = createNoise2D(79);
  const rows = 6;
  const rh = H / rows;
  // blocks: per row, cut points
  const cuts = [];
  for (let r = 0; r < rows; r++) {
    const c = [];
    let x = rnd() * 60;
    while (x < W) {
      c.push(x);
      x += 110 + rnd() * 90;
    }
    cuts.push(c);
  }
  const col = new Uint8Array(W * H * 4), hgt = new Float32Array(W * H);
  const tone = new Map();
  for (let y = 0; y < H; y++) {
    const r = Math.floor(y / rh);
    const fy = y - r * rh;
    for (let x = 0; x < W; x++) {
      const c = cuts[r];
      let b = 0;
      while (b + 1 < c.length && c[b + 1] <= x) b++;
      const x0 = x < c[0] ? c[c.length - 1] - W : c[b];
      const x1 = x < c[0] ? c[0] : b + 1 < c.length ? c[b + 1] : c[0] + W;
      const key = r * 100 + (x < c[0] ? c.length - 1 : b);
      let tk = tone.get(key);
      if (tk === undefined) tone.set(key, (tk = rnd()));
      const ex = Math.min(x - x0, x1 - x), ey = Math.min(fy, rh - fy);
      const e = Math.min(ex, ey);
      const joint = e < 1.4 ? 1 : 0;
      const chamfer = Math.min(1, e / 4);
      const grain = fbm(n, x * 0.02, y * 0.02, 3) * 0.5 + n2(x * 0.3, y * 0.3) * 0.12;
      const stain = Math.max(0, fbm(n2, x * 0.006 + tk * 7, y * 0.004, 3) - 0.25) * 0.5;
      let v = 0.93 + (tk - 0.5) * 0.1 + grain * 0.06 - stain * 0.18;
      v *= 0.94 + 0.06 * chamfer;
      let R = 230 * v, G = 216 * v, B = 186 * v;
      if (joint) {
        R = 214;
        G = 207;
        B = 190;
      }
      const i = (y * W + x) * 4;
      col[i] = R;
      col[i + 1] = G;
      col[i + 2] = B;
      col[i + 3] = 255;
      hgt[y * W + x] = joint ? 0 : 0.6 + 0.4 * chamfer + grain * 0.15;
    }
  }
  return { map: dataTex(col, W, H, true), normalMap: dataTex(normalFromHeight(hgt, W, H, 2.2), W, H, false) };
}

// smooth dressed tuffeau (cornice, bands, surrounds, quoins), 256 px = 1 m
export function trimTexture() {
  const W = 256, H = 256;
  const n = createNoise2D(91), n2 = createNoise2D(92);
  const col = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      // periodic sampling on a torus so it tiles
      const u = (x / W) * Math.PI * 2, v = (y / H) * Math.PI * 2;
      const g = fbm(n, Math.cos(u) * 1.6 + 5, Math.sin(u) * 1.6 + Math.cos(v) * 1.6, 3) * 0.5 + n2(Math.sin(v) * 4 + x * 0.0, Math.cos(v) * 4) * 0.1;
      const k = 0.95 + g * 0.07;
      const i = (y * W + x) * 4;
      col[i] = 234 * k;
      col[i + 1] = 222 * k;
      col[i + 2] = 194 * k;
      col[i + 3] = 255;
    }
  return dataTex(col, W, H, true);
}

// --------------------------------------------------------------- slate
// 512 px = 2 m; rows of 0.11 m exposed slate, 0.2-0.3 m wide, staggered
export const SLATE_TILE = 2.0;
export function slateTextures() {
  const W = 512, H = 512;
  const rnd = mulberry32(55);
  const n = createNoise2D(56);
  const rows = 18;
  const rh = H / rows;
  const col = new Uint8Array(W * H * 4), hgt = new Float32Array(W * H);
  const widths = [];
  for (let r = 0; r < rows; r++) {
    const c = [];
    let x = (r % 2) * 30 + rnd() * 10;
    while (x < W + 80) {
      c.push(x);
      x += 52 + rnd() * 24;
    }
    widths.push(c);
  }
  const tones = [];
  for (let i = 0; i < rows * 20; i++) tones.push(rnd());
  for (let y = 0; y < H; y++) {
    const r = Math.floor(y / rh);
    const fy = (y - r * rh) / rh; // 0 at the lower edge of the visible part
    for (let x = 0; x < W; x++) {
      const c = widths[r];
      let b = 0;
      while (b + 1 < c.length && c[b + 1] <= x) b++;
      const ex = Math.min(x - c[b], (c[b + 1] || W) - x);
      const t = tones[r * 20 + b];
      const gap = ex < 1.2 ? 0.55 : 1;
      const edge = fy < 0.1 ? 0.62 + fy * 3.0 : 1; // shadow under the slate above
      const g = n(x * 0.05, y * 0.05) * 0.04;
      let v = (0.85 + t * 0.2 + g) * gap * edge;
      const purple = t > 0.8 ? 1 : 0;
      const i = (y * W + x) * 4;
      col[i] = (58 + purple * 6) * v;
      col[i + 1] = (63 - purple * 3) * v;
      col[i + 2] = (70 + purple * 3) * v;
      col[i + 3] = 255;
      hgt[y * W + x] = fy * 0.8 + (gap < 1 ? -0.2 : 0);
    }
  }
  return { map: dataTex(col, W, H, true), normalMap: dataTex(normalFromHeight(hgt, W, H, 1.5), W, H, false) };
}

// --------------------------------------------------------------- louvred shutters
// one leaf: frame, slanted slats; grey-blue paint (u across the leaf, v up)
export function shutterTexture() {
  const W = 128, H = 512;
  const col = new Uint8Array(W * H * 4);
  const base = [116, 138, 150];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const frame = x < 10 || x > W - 11 || y < 12 || y > H - 13 || Math.abs(y - H * 0.5) < 6;
      let k = 1;
      if (!frame) {
        const s = (y % 14) / 14;
        k = s < 0.2 ? 0.6 : 0.88 + 0.16 * s;
      } else k = 1.04;
      const edge = Math.min(x, W - 1 - x, y, H - 1 - y) < 2 ? 0.7 : 1;
      const i = (y * W + x) * 4;
      col[i] = base[0] * k * edge;
      col[i + 1] = base[1] * k * edge;
      col[i + 2] = base[2] * k * edge;
      col[i + 3] = 255;
    }
  return dataTex(col, W, H, true, false);
}

// --------------------------------------------------------------- glass interior
// dark rooms with sheer curtains drawn to the sides; u across the opening, v up
export function interiorTexture() {
  const W = 256, H = 512;
  const n = createNoise2D(61);
  const col = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      const side = Math.min(u, 1 - u);
      const drape = Math.max(0, 1 - side / 0.22);
      const fold = 0.75 + 0.25 * Math.sin(u * 90 + n(u * 6, v * 2) * 2.0);
      let r = 16 + 10 * v, g = 18 + 10 * v, b = 22 + 12 * v;
      const c = drape * fold * 0.75;
      r = r * (1 - c) + 168 * c;
      g = g * (1 - c) + 160 * c;
      b = b * (1 - c) + 146 * c;
      // a faint lamp-less room depth
      const room = Math.max(0, 1 - Math.abs(u - 0.5) * 2.2) * Math.max(0, 0.6 - v) * 18;
      const i = (y * W + x) * 4;
      col[i] = r + room;
      col[i + 1] = g + room * 0.9;
      col[i + 2] = b + room * 0.8;
      col[i + 3] = 255;
    }
  return dataTex(col, W, H, true, false);
}
