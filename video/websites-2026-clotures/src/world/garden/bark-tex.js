// Bark of old parkland trees: a network of fissures between long vertical plates, a little
// lichen on the plates. Tiles in both directions (u around the trunk, v along it).
// Returns { map, normalMap } as DataTextures (generated once).
import * as THREE from 'three';
import { mulberry32 } from './noise.js';

function periodic(W, H, px, py, seed) {
  // periodic value noise, px x py lattice cells over the tile
  const rnd = mulberry32(seed);
  const lat = new Float32Array(px * py);
  for (let i = 0; i < lat.length; i++) lat[i] = rnd();
  const out = new Float32Array(W * H);
  const q = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < H; y++) {
    const fy = (y / H) * py, iy = Math.floor(fy), ty = q(fy - iy);
    const y0 = iy % py, y1 = (iy + 1) % py;
    for (let x = 0; x < W; x++) {
      const fx = (x / W) * px, ix = Math.floor(fx), tx = q(fx - ix);
      const x0 = ix % px, x1 = (ix + 1) % px;
      const a = lat[y0 * px + x0], b = lat[y0 * px + x1], c = lat[y1 * px + x0], d = lat[y1 * px + x1];
      out[y * W + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    }
  }
  return out;
}

let cached = null;
export function barkTextures() {
  if (cached) return cached;
  const W = 256, H = 512; // ~0.6 m around x 1.2 m along
  const n1 = periodic(W, H, 10, 5, 31);
  const n2 = periodic(W, H, 22, 9, 32);
  const n3 = periodic(W, H, 48, 40, 33);
  const n4 = periodic(W, H, 6, 6, 34);
  const hgt = new Float32Array(W * H);
  const col = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    // fissures follow the mid-level contours of a vertically stretched noise
    const a = Math.abs(n1[i] * 0.7 + n2[i] * 0.3 - 0.5) * 2;
    const fiss = 1 - Math.min(1, a / 0.16);
    const plate = 1 - fiss * fiss;
    const rough = n3[i];
    const h = plate * 0.85 + rough * 0.15;
    hgt[i] = h;
    const lich = Math.max(0, n4[i] - 0.68) * 3 * plate;
    let r = 70 + 72 * h + 14 * rough, g = 64 + 66 * h + 12 * rough, b = 56 + 58 * h + 10 * rough;
    r = r * (1 - lich) + 150 * lich;
    g = g * (1 - lich) + 158 * lich;
    b = b * (1 - lich) + 128 * lich;
    col[i * 4] = r;
    col[i * 4 + 1] = g;
    col[i * 4 + 2] = b;
    col[i * 4 + 3] = 255;
  }
  const nrm = new Uint8Array(W * H * 4);
  const k = 3.2;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const xl = (x - 1 + W) % W, xr = (x + 1) % W, yu = (y - 1 + H) % H, yd = (y + 1) % H;
      const dx = (hgt[y * W + xr] - hgt[y * W + xl]) * k;
      const dy = (hgt[yd * W + x] - hgt[yu * W + x]) * k;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * W + x) * 4;
      nrm[i] = (-dx / l * 0.5 + 0.5) * 255;
      nrm[i + 1] = (dy / l * 0.5 + 0.5) * 255;
      nrm[i + 2] = (1 / l * 0.5 + 0.5) * 255;
      nrm[i + 3] = 255;
    }
  const mk = (data, srgb) => {
    const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = 4;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };
  cached = { map: mk(col, true), normalMap: mk(nrm, false) };
  return cached;
}
