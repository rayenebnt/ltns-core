// Distant trees painted at load time as impostors: albedo + alpha and a normal map (one
// small dome per leaf clump), so the far countryside is relit by every light preset.
// Cells (each 256 x 512 px, v up): 0-3 broad deciduous trees, 4-5 poplars, 6 bush,
// 7 a clump of trees (tree-line strip, drawn on a wide card).
import * as THREE from 'three';
import { mulberry32 } from './noise.js';

export const BB_CELLS = 8;
const CW = 256, CH = 512;

function rasterBlob(col, nrm, cov, W, H, cx, cy, rx, ry, rgb, crownN, rnd) {
  const x0 = Math.max(0, Math.floor(cx - rx)), x1 = Math.min(W - 1, Math.ceil(cx + rx));
  const y0 = Math.max(0, Math.floor(cy - ry)), y1 = Math.min(H - 1, Math.ceil(cy + ry));
  const jag = 0.75 + rnd() * 0.2;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      const d2 = dx * dx + dy * dy;
      // ragged edge: a little noise on the radius
      const ang = Math.atan2(dy, dx);
      const rr = jag + (1 - jag) * (0.5 + 0.5 * Math.sin(ang * 7 + cx));
      if (d2 > rr * rr) continue;
      const nz = Math.sqrt(Math.max(0, 1 - d2));
      // blob dome normal blended with the crown's
      let nx = dx * 0.45 + crownN[0] * 0.8, ny = dy * 0.45 + crownN[1] * 0.8, nzz = nz * 0.45 + crownN[2] * 0.8;
      const l = Math.hypot(nx, ny, nzz) || 1;
      nx /= l;
      ny /= l;
      nzz /= l;
      const i = (y * W + x) * 4;
      const k = 0.82 + 0.18 * nz;
      col[i] = rgb[0] * k;
      col[i + 1] = rgb[1] * k;
      col[i + 2] = rgb[2] * k;
      col[i + 3] = 255;
      nrm[i] = (nx * 0.5 + 0.5) * 255;
      nrm[i + 1] = (ny * 0.5 + 0.5) * 255;
      nrm[i + 2] = (nzz * 0.5 + 0.5) * 255;
      nrm[i + 3] = 255;
      cov[y * W + x] = 1;
    }
}

function paintTree(col, nrm, cov, W, H, ox, oy, kind, seed) {
  const rnd = mulberry32(seed);
  const cx = ox + CW / 2;
  const base = oy; // canvas rows here go up (row 0 = bottom)
  let crown;
  if (kind === 'poplar') crown = { cy: base + CH * 0.56, rx: CW * 0.2, ry: CH * 0.42 };
  else if (kind === 'bush') crown = { cy: base + CH * 0.22, rx: CW * 0.44, ry: CH * 0.2 };
  else if (kind === 'strip') crown = { cy: base + CH * 0.42, rx: CW * 0.48, ry: CH * 0.36 };
  else crown = { cy: base + CH * (0.55 + rnd() * 0.05), rx: CW * (0.4 + rnd() * 0.06), ry: CH * (0.34 + rnd() * 0.05) };
  // trunk
  if (kind !== 'bush' && kind !== 'strip') {
    const tw = kind === 'poplar' ? 5 : 8;
    for (let y = base; y < crown.cy - crown.ry * 0.3; y++)
      for (let x = cx - tw / 2; x < cx + tw / 2; x++) {
        const i = (Math.round(y) * W + Math.round(x)) * 4;
        col[i] = 62;
        col[i + 1] = 56;
        col[i + 2] = 48;
        col[i + 3] = 255;
        nrm[i] = 128;
        nrm[i + 1] = 128;
        nrm[i + 2] = 255;
        nrm[i + 3] = 255;
        cov[Math.round(y) * W + Math.round(x)] = 1;
      }
  }
  // clumps of leaves, back to front (bottom/inner first)
  const pal = kind === 'poplar' ? [[70, 96, 40], [80, 104, 44], [62, 88, 38]] : [[66, 94, 36], [78, 104, 40], [58, 84, 34], [88, 110, 44]];
  const n = kind === 'poplar' ? 1500 : kind === 'bush' ? 700 : 2300;
  const blobs = [];
  for (let i = 0; i < n; i++) {
    let u, v, r2;
    do {
      u = rnd() * 2 - 1;
      v = rnd() * 2 - 1;
      r2 = u * u + v * v;
    } while (r2 > 1);
    // lumpy outline: sub-crowns
    const th = Math.atan2(v, u);
    const lump = 0.86 + 0.08 * Math.sin(th * 3 + seed) + 0.06 * Math.sin(th * 7 + seed * 2.3) + 0.04 * Math.sin(th * 11 + seed * 0.7);
    if (Math.sqrt(r2) > lump) continue;
    blobs.push({ u, v, r: Math.sqrt(r2), depth: rnd() });
  }
  blobs.sort((a, b) => a.depth - b.depth);
  for (const b of blobs) {
    const x = cx + b.u * crown.rx, y = crown.cy + b.v * crown.ry;
    const sz = (kind === 'poplar' ? 4.5 : 6) + rnd() * (kind === 'poplar' ? 3.5 : 6);
    const cn = [b.u * 0.8, b.v * 0.8, Math.sqrt(Math.max(0, 1 - b.r * b.r * 0.64))];
    const t = pal[(rnd() * pal.length) | 0];
    // inner and lower clumps darker (occlusion inside the crown)
    const ao = (0.55 + 0.45 * b.depth) * (0.75 + 0.25 * (b.v * 0.5 + 0.5));
    rasterBlob(col, nrm, cov, W, H, x, y, sz, sz * 0.82, [t[0] * ao, t[1] * ao, t[2] * ao], cn, rnd);
  }
}

let cached = null;
export function billboardAtlas() {
  if (cached) return cached;
  const W = CW * BB_CELLS, H = CH;
  const col = new Uint8Array(W * H * 4), nrm = new Uint8Array(W * H * 4), cov = new Uint8Array(W * H);
  const kinds = ['round', 'round', 'round', 'round', 'poplar', 'poplar', 'bush', 'strip'];
  kinds.forEach((k, i) => paintTree(col, nrm, cov, W, H, i * CW, 0, k, 300 + i * 17));
  // transparent texels take the mean colour (no dark fringes in the mips)
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < W * H; i++)
    if (cov[i]) {
      r += col[i * 4];
      g += col[i * 4 + 1];
      b += col[i * 4 + 2];
      n++;
    }
  r /= n;
  g /= n;
  b /= n;
  for (let i = 0; i < W * H; i++)
    if (!cov[i]) {
      col[i * 4] = r;
      col[i * 4 + 1] = g;
      col[i * 4 + 2] = b;
      col[i * 4 + 3] = 0;
      nrm[i * 4] = 128;
      nrm[i * 4 + 1] = 128;
      nrm[i * 4 + 2] = 255;
    }
  const mk = (data, srgb) => {
    const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = 4;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };
  cached = { map: mk(col, true), normalMap: mk(nrm, false), size: [W, H] };
  return cached;
}
