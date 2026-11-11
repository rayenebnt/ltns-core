// Foliage atlas rasterized at load time straight into typed arrays (no canvas: fast and
// identical everywhere): leaf clusters for the cards of the trees, the hedge and the shrubs,
// 4 x 4 cells of 512 px. Leaves are drawn back to front with a soft edge, a light-to-dark
// gradient, a midrib and side veins, and each new leaf darkens the leaves under it (contact
// shadow) without touching the alpha. Transparent texels get the cell's mean colour, so the
// mip chain has no dark fringes.
//
// cells: lime 0-3, oak 4-7, hornbeam 8-9, laurel 10, box 11, hydrangea blue 12,
//        hydrangea white 13, lavender 14, meadow tuft 15
import * as THREE from 'three';
import { mulberry32 } from './noise.js';

export const CELL = { lime: [0, 1, 2, 3], oak: [4, 5, 6, 7], hornbeam: [8, 9], laurel: [10], box: [11], hydrangeaBlue: [12], hydrangeaWhite: [13], lavender: [14], tuft: [15] };
export const ATLAS_N = 4;
const S = 512;
const N = S * ATLAS_N;

// half-width profile of a leaf, t = 0 at the stalk, 1 at the tip
function profile(kind, t, k) {
  if (kind === 'lime') return Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.85) * (1 + 0.22 * Math.exp(-t * 9));
  if (kind === 'oak') return Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.7) * (0.56 + 0.44 * Math.pow(Math.abs(Math.sin(t * Math.PI * 4.6 + 0.4 + k)), 0.55));
  if (kind === 'hornbeam' || kind === 'hydr') return Math.pow(Math.sin(Math.PI * Math.pow(t, 0.78)), 0.9) * (1 + 0.06 * Math.sin(t * 60));
  if (kind === 'round') return Math.sqrt(Math.max(0, 1 - (2 * t - 1) * (2 * t - 1)));
  return Math.pow(Math.sin(Math.PI * t), 0.85);
}
const WIDTH = { lime: 0.46, oak: 0.34, hornbeam: 0.3, laurel: 0.21, box: 0.32, hydr: 0.34, round: 0.5, blade: 0.06 };
// profiles tabulated once (no pow() per texel); the oak has four lobe phases
const LUT = {};
function lut(kind, k) {
  const key = kind === 'oak' ? `oak${Math.floor(k) % 4}` : kind;
  let t = LUT[key];
  if (!t) {
    t = LUT[key] = new Float32Array(257);
    for (let i = 0; i <= 256; i++) t[i] = profile(kind, i / 256, Math.floor(k) % 4);
  }
  return t;
}

class Raster {
  constructor() {
    this.col = new Float32Array(N * N * 3);
    this.cov = new Float32Array(N * N);
  }
  // a leaf from (x, y) (stalk end) along angle ang, length L; colour base [r, g, b] (0-255)
  leaf(x, y, ang, L, kind, base, opts = {}) {
    const W = L * WIDTH[kind] * (opts.wide || 1);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    // tight bounds of the rotated leaf (plus the shadow offset)
    let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
    for (const [a, c] of [[-1, -W - 2], [-1, W + 2], [L + 1, -W - 2], [L + 1, W + 2]]) {
      const px = x + a * ca - c * sa, py = y + a * sa + c * ca;
      bx0 = Math.min(bx0, px);
      bx1 = Math.max(bx1, px);
      by0 = Math.min(by0, py);
      by1 = Math.max(by1, py);
    }
    const x0 = Math.max(opts.cx0, Math.floor(bx0)), x1 = Math.min(opts.cx1, Math.ceil(bx1 + 3));
    const y0 = Math.max(opts.cy0, Math.floor(by0)), y1 = Math.min(opts.cy1, Math.ceil(by1 + 4));
    const k = opts.k || 0;
    const shadow = opts.shadow !== false;
    const veins = opts.veins !== false;
    const g0 = opts.g0 || 0.76, g1 = opts.g1 || 1.12;
    const col = this.col, cov = this.cov;
    const P = lut(kind, k);
    // 1) contact shadow on what is already painted (offset down-right, a little larger)
    if (shadow) {
      const sx = 2.0, sy = 3.0;
      for (let py = y0; py <= y1; py++)
        for (let px = x0; px <= x1; px++) {
          const i = py * N + px;
          if (cov[i] < 0.05) continue;
          const dx = px - x - sx, dy = py - y - sy;
          const a = dx * ca + dy * sa, c = -dx * sa + dy * ca;
          if (a < -1 || a > L + 1) continue;
          const w = P[(Math.min(1, Math.max(0, a / L)) * 256) | 0] * W + 1.5;
          const ac = Math.abs(c);
          if (ac > w) continue;
          const m = 0.7 + 0.3 * Math.max(0, 1 - (w - ac) / 1.5);
          col[i * 3] *= m;
          col[i * 3 + 1] *= m;
          col[i * 3 + 2] *= m;
        }
    }
    // 2) the leaf
    for (let py = y0; py <= y1; py++)
      for (let px = x0; px <= x1; px++) {
        const dx = px + 0.5 - x, dy = py + 0.5 - y;
        const a = dx * ca + dy * sa, c = -dx * sa + dy * ca;
        if (a < -0.5 || a > L + 0.5) continue;
        const t = Math.min(1, Math.max(0, a / L));
        const w = P[(t * 256) | 0] * W;
        const ac = Math.abs(c);
        const edge = Math.min(w - ac, (L - a) * 2, a + 1.0);
        if (edge < -0.6) continue;
        const alpha = Math.min(1, Math.max(0, edge / 1.2 + 0.5));
        let shade = g0 + (g1 - g0) * t;
        if (veins) {
          if (ac < Math.max(0.6, L * 0.018)) shade *= 1.28; // midrib
          else {
            const vt = (a - ac * 0.9) / (L * 0.16);
            if (Math.abs(vt - Math.round(vt)) < 0.09 && ac < w * 0.85) shade *= 1.12;
          }
        }
        if (ac > w * 0.82) shade *= 0.8; // darker rim
        const i = py * N + px;
        const r = base[0] * shade, g = base[1] * shade, b = base[2] * shade;
        col[i * 3] = col[i * 3] * (1 - alpha) + r * alpha;
        col[i * 3 + 1] = col[i * 3 + 1] * (1 - alpha) + g * alpha;
        col[i * 3 + 2] = col[i * 3 + 2] * (1 - alpha) + b * alpha;
        cov[i] = Math.max(cov[i], alpha);
      }
  }
  // a thick line (twig, stem)
  line(xa, ya, xb, yb, wdt, rgb, opts) {
    const x0 = Math.max(opts.cx0, Math.floor(Math.min(xa, xb) - wdt)), x1 = Math.min(opts.cx1, Math.ceil(Math.max(xa, xb) + wdt));
    const y0 = Math.max(opts.cy0, Math.floor(Math.min(ya, yb) - wdt)), y1 = Math.min(opts.cy1, Math.ceil(Math.max(ya, yb) + wdt));
    const dx = xb - xa, dy = yb - ya, l2 = dx * dx + dy * dy || 1;
    const hw = wdt / 2;
    for (let py = y0; py <= y1; py++)
      for (let px = x0; px <= x1; px++) {
        let t = ((px + 0.5 - xa) * dx + (py + 0.5 - ya) * dy) / l2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = xa + dx * t - px - 0.5, ey = ya + dy * t - py - 0.5;
        const d = Math.sqrt(ex * ex + ey * ey);
        const alpha = Math.min(1, Math.max(0, (hw - d) / 1.0 + 0.5));
        if (alpha <= 0) continue;
        const i = py * N + px;
        for (let ch = 0; ch < 3; ch++) this.col[i * 3 + ch] = this.col[i * 3 + ch] * (1 - alpha) + rgb[ch] * alpha;
        this.cov[i] = Math.max(this.cov[i], alpha);
      }
  }
}

const PAL = {
  lime: { top: [[92, 128, 42], [104, 140, 48], [84, 120, 40], [118, 146, 52]], under: [146, 166, 120], twig: [86, 70, 52] },
  oak: { top: [[70, 98, 36], [80, 106, 38], [62, 90, 34], [92, 112, 42]], under: [124, 138, 92], twig: [80, 66, 50] },
  hornbeam: { top: [[78, 116, 40], [88, 124, 44], [70, 106, 38]], under: [130, 150, 100], twig: [90, 76, 60] },
  laurel: { top: [[40, 72, 30], [48, 80, 34], [36, 64, 28]], under: [90, 110, 70], twig: [70, 60, 45] },
  box: { top: [[56, 88, 34], [62, 96, 36], [50, 80, 30]], under: [100, 120, 70], twig: [90, 80, 60] },
};

function bounds(ox, oy) {
  return { cx0: ox, cx1: ox + S - 1, cy0: oy, cy1: oy + S - 1 };
}

// a twig-borne cluster of many small leaves, inner leaves first and darker
function cluster(R, ox, oy, kind, seed, o = {}) {
  const rnd = mulberry32(seed);
  const pal = PAL[kind];
  const B = bounds(ox, oy);
  const cx = ox + S / 2, cy = oy + S / 2;
  const count = o.count || 210;
  const Lmin = o.Lmin || 34, Lmax = o.Lmax || Lmin * 1.35;
  const Rad = S * (o.R || 0.4);
  // a few sprays (sub-clusters) rather than one even disc: the cards then merge into a
  // broken, lumpy foliage instead of reading as round blobs
  const sprays = [];
  const ns = o.sprays || 5;
  for (let i = 0; i < ns; i++) {
    const a = (i / ns) * Math.PI * 2 + rnd() * 0.8, r = Rad * (i === 0 ? 0 : 0.35 + 0.3 * rnd());
    sprays.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, Rad * (0.42 + 0.18 * rnd())]);
  }
  const leaves = [];
  for (let i = 0; i < count; i++) {
    const sp = sprays[(rnd() * ns) | 0];
    const a = rnd() * Math.PI * 2;
    const rr = Math.sqrt(rnd()) * sp[2];
    let x = sp[0] + Math.cos(a) * rr, y = sp[1] + Math.sin(a) * rr * 0.94;
    const dr = Math.hypot(x - cx, y - cy);
    if (dr > Rad) {
      x = cx + ((x - cx) / dr) * Rad;
      y = cy + ((y - cy) / dr) * Rad;
    }
    const r = Math.min(Rad, Math.hypot(x - cx, y - cy));
    const L = Math.min(Lmin + rnd() * (Lmax - Lmin), S * 0.49 - r);
    // leaves point away from their spray's centre
    leaves.push({ x, y, r: r / Rad, a: Math.atan2(y - sp[1], x - sp[0]), L, k: rnd(), u: rnd() < 0.14, j: rnd() });
  }
  leaves.sort((p, q) => p.r - q.r);
  // twigs from the card's centre out to the leaves
  for (let i = 0; i < 9; i++) {
    const a = rnd() * Math.PI * 2, r = Rad * (0.6 + 0.35 * rnd());
    R.line(cx + (rnd() - 0.5) * 20, cy + S * 0.12, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9, 2.2 + rnd() * 1.5, pal.twig, B);
  }
  for (const lf of leaves) {
    const ang = lf.a + (lf.j - 0.5) * 1.4;
    const base = lf.u ? pal.under : pal.top[(lf.k * pal.top.length) | 0];
    const inner = 0.7 + 0.36 * lf.r;
    R.leaf(lf.x, lf.y, ang, lf.L, kind, [base[0] * inner, base[1] * inner, base[2] * inner], { ...B, k: lf.k * 3 });
  }
}

function hydrangea(R, ox, oy, seed, flower) {
  const rnd = mulberry32(seed);
  const B = bounds(ox, oy);
  cluster(R, ox, oy, 'hornbeam', seed + 1, { count: 70, Lmin: 60, Lmax: 80 });
  for (let h = 0; h < 3; h++) {
    const hx = ox + S * (0.3 + 0.4 * rnd()), hy = oy + S * (0.3 + 0.4 * rnd());
    const hr = S * (0.13 + 0.05 * rnd());
    for (let i = 0; i < 260; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * hr;
      const x = hx + Math.cos(a) * r, y = hy + Math.sin(a) * r;
      const shade = 0.7 + 0.36 * (1 - r / hr) + (rnd() - 0.5) * 0.2;
      const fc = flower[(rnd() * flower.length) | 0];
      for (let p = 0; p < 4; p++) {
        const pa = p * Math.PI * 0.5 + rnd();
        R.leaf(x, y, pa, 6 + rnd() * 3, 'round', [fc[0] * shade, fc[1] * shade, fc[2] * shade], { ...B, veins: false, shadow: p === 0, g0: 0.95, g1: 1.05 });
      }
    }
  }
}

function lavender(R, ox, oy, seed) {
  const rnd = mulberry32(seed);
  const B = bounds(ox, oy);
  // rows here go down the cell (the atlas is flipped at the end): stems grow toward -y
  for (let i = 0; i < 160; i++) {
    const x = ox + S * (0.15 + 0.7 * rnd()), y = oy + S * (0.64 + 0.3 * rnd());
    const a = -Math.PI / 2 + (rnd() - 0.5) * 1.6;
    R.leaf(x, y, a, 34 + rnd() * 16, 'blade', [112 * (0.8 + rnd() * 0.3), 128, 100], { ...B, veins: false });
  }
  for (let i = 0; i < 50; i++) {
    const bx = ox + S * (0.2 + 0.6 * rnd()), by = oy + S * 0.88;
    const a = -Math.PI / 2 + ((bx - ox - S / 2) / S) * 1.3 + (rnd() - 0.5) * 0.3;
    const len = S * (0.48 + 0.28 * rnd());
    const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
    R.line(bx, by, ex, ey, 2.4, [108, 122, 88], B);
    for (let k = 0; k < 15; k++) {
      const t = 0.7 + 0.3 * (k / 14);
      const x = bx + (ex - bx) * t + (rnd() - 0.5) * 5, y = by + (ey - by) * t;
      const sh = 0.75 + rnd() * 0.45;
      R.leaf(x, y, a + (rnd() - 0.5), 9 + rnd() * 3, 'round', [124 * sh, 96 * sh, 186 * sh], { ...B, veins: false, shadow: false, g0: 0.9, g1: 1.1 });
    }
  }
}

function tuft(R, ox, oy, seed) {
  const rnd = mulberry32(seed);
  const B = bounds(ox, oy);
  for (let i = 0; i < 110; i++) {
    const bx = ox + S * (0.1 + 0.8 * rnd()), by = oy + S - 1;
    const a = -Math.PI / 2 + (rnd() - 0.5) * 0.9;
    const len = S * (0.45 + 0.5 * rnd());
    const g = 0.75 + 0.4 * rnd();
    const dry = rnd() < 0.3;
    R.leaf(bx, by, a, len, 'blade', dry ? [150 * g, 146 * g, 88 * g] : [96 * g, 128 * g, 52 * g], { ...B, veins: false });
  }
}

let atlas = null;
export function foliageAtlas() {
  if (atlas) return atlas;
  const R = new Raster();
  // cells: row 0 at the top of the atlas image (rows are flipped into texture order at the end)
  const cell = (i) => [(i % ATLAS_N) * S, Math.floor(i / ATLAS_N) * S];
  // denser clusters (more overlapping leaves, fewer transparent texels): fuller crowns
  CELL.lime.forEach((c, i) => cluster(R, ...cell(c), 'lime', 101 + i, { count: 310, Lmin: 30, Lmax: 44, sprays: 4, R: 0.42 }));
  CELL.oak.forEach((c, i) => cluster(R, ...cell(c), 'oak', 201 + i, { count: 270, Lmin: 36, Lmax: 50, sprays: 4, R: 0.42 }));
  CELL.hornbeam.forEach((c, i) => cluster(R, ...cell(c), 'hornbeam', 301 + i, { count: 300, Lmin: 26, Lmax: 36 }));
  cluster(R, ...cell(CELL.laurel[0]), 'laurel', 401, { count: 90, Lmin: 70, Lmax: 96 });
  cluster(R, ...cell(CELL.box[0]), 'box', 501, { count: 700, Lmin: 12, Lmax: 17, R: 0.43 });
  hydrangea(R, ...cell(CELL.hydrangeaBlue[0]), 601, [[112, 138, 214], [128, 150, 222], [150, 140, 210]]);
  hydrangea(R, ...cell(CELL.hydrangeaWhite[0]), 611, [[236, 232, 220], [240, 210, 214], [226, 230, 210]]);
  lavender(R, ...cell(CELL.lavender[0]), 701);
  tuft(R, ...cell(CELL.tuft[0]), 801);
  // pack: mean colour per cell under the transparent texels, rows flipped (v up)
  const out = new Uint8Array(N * N * 4);
  for (let cy = 0; cy < ATLAS_N; cy++)
    for (let cx = 0; cx < ATLAS_N; cx++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let y = cy * S; y < (cy + 1) * S; y += 2)
        for (let x = cx * S; x < (cx + 1) * S; x += 2) {
          const i = y * N + x;
          if (R.cov[i] > 0.9) {
            r += R.col[i * 3];
            g += R.col[i * 3 + 1];
            b += R.col[i * 3 + 2];
            n++;
          }
        }
      const m = n ? [r / n, g / n, b / n] : [90, 120, 50];
      for (let y = cy * S; y < (cy + 1) * S; y++) {
        const ty = N - 1 - y;
        for (let x = cx * S; x < (cx + 1) * S; x++) {
          const i = y * N + x, o = (ty * N + x) * 4;
          const a = R.cov[i];
          out[o] = R.col[i * 3] * a + m[0] * (1 - a);
          out[o + 1] = R.col[i * 3 + 1] * a + m[1] * (1 - a);
          out[o + 2] = R.col[i * 3 + 2] * a + m[2] * (1 - a);
          out[o + 3] = a * 255;
        }
      }
    }
  const tex = new THREE.DataTexture(out, N, N, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  tex.name = 'foliage-atlas';
  atlas = { tex, size: N };
  return atlas;
}

// uv rectangle [u0, v0, du, dv] of an atlas cell (v up)
export function cellRect(i) {
  const cx = i % ATLAS_N, cy = Math.floor(i / ATLAS_N);
  return [cx / ATLAS_N, 1 - (cy + 1) / ATLAS_N, 1 / ATLAS_N, 1 / ATLAS_N];
}
