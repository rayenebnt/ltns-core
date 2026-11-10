// Procedural textures of the fence module, generated once at load time (no image files).
//
// Wood tiles are 2 boards wide (u: 2 x 0.15 m, each half is one board face) by 2.4 m along the
// grain (v). An element samples one half at a random height, so no two boards look alike.
// Every wood set is { map (sRGB), normalMap, roughnessMap (G channel) }.
//   douglas    fresh Douglas fir: warm pinkish tan, flat-sawn cathedrals, knots
//   weathered  silver-grey weathered boards: raised latewood, dark streaks, checks, lichen
//   pine       fresh pale pine for the repaired section
//   chestnut   split chestnut stakes (ganivelle): fibrous split face (u < 0.62) and bark (u > 0.62)
// Others: bark (fallen lime branch), leaves (lime leaf atlas, 2 x 2 cells, alpha), wire masks
// (rigid panels and welded mesh), a periodic RGBA noise for the shaders.
import * as THREE from 'three';
import { mulberry32, periodicNoise, periodicFbm, hash2, clamp, smoothstep, fract } from './noise.js';

let ANISO = 8;
export function setTextureAnisotropy(a) {
  ANISO = a;
}

function dataTexture(data, w, h, { srgb = false, repeat = true, mips = true } = {}) {
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.generateMipmaps = mips;
  t.anisotropy = ANISO;
  t.needsUpdate = true;
  return t;
}

// height field (mm) -> tangent-space normal map; du, dv: pixel size in mm along u and v
function normalMapFromHeight(hgt, w, h, du, dv, strength) {
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const yu = ((y + 1) % h) * w, yd = ((y - 1 + h) % h) * w, yr = y * w;
    for (let x = 0; x < w; x++) {
      const xr = (x + 1) % w, xl = (x - 1 + w) % w;
      const sx = ((hgt[yr + xr] - hgt[yr + xl]) / (2 * du)) * strength;
      const sy = ((hgt[yu + x] - hgt[yd + x]) / (2 * dv)) * strength;
      const l = Math.hypot(sx, sy, 1);
      const i = (yr + x) * 4;
      out[i] = (-sx / l) * 127.5 + 127.5;
      out[i + 1] = (-sy / l) * 127.5 + 127.5;
      out[i + 2] = (1 / l) * 127.5 + 127.5;
      out[i + 3] = 255;
    }
  }
  return out;
}

function roughFromArray(r, w, h) {
  const out = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const v = clamp(r[i], 0.02, 1) * 255;
    out[i * 4] = v;
    out[i * 4 + 1] = v;
    out[i * 4 + 2] = v;
    out[i * 4 + 3] = 255;
  }
  return out;
}

// ------------------------------------------------------------------ wood generator
// One generic sawn-board model (growth rings of a log cut by the board face) with species
// parameters; returns albedo (0..255 floats), height (mm) and roughness arrays.
function sawnWood(W, H, spec) {
  const rnd = mulberry32(spec.seed);
  const half = W / 2;
  const mmU = 150 / half; // mm per pixel across (each half is a 0.15 m board face)
  const mmV = 2400 / H; // mm per pixel along the grain
  const warpA = periodicFbm(W, H, 4, 3, 3, spec.seed + 1);
  const warpB = periodicNoise(W, H, 6, 12, spec.seed + 2);
  const fib = periodicNoise(W, H, half, 6, spec.seed + 3); // fibres: one lattice cell per 2 px column
  const fib2 = periodicNoise(W, H, half / 2, 40, spec.seed + 4);
  const big = periodicFbm(W, H, 2, 4, 3, spec.seed + 5);
  // each half is one board face: flat-sawn (gentle cathedrals) or rift-sawn (straight lines)
  const boards = [0, 1].map((b) => {
    const rift = rnd() < (spec.rift ?? 0.5);
    return {
      cx: rift ? (rnd() < 0.5 ? -1 : 1) * (0.11 + rnd() * 0.2) : (rnd() - 0.5) * 0.05,
      d0: rift ? 0.004 + rnd() * 0.02 : spec.depth[0] + rnd() * (spec.depth[1] - spec.depth[0]),
      a1: rift ? 0.0015 : 0.004 + rnd() * 0.007,
      a2: rift ? 0.0008 : 0.0015 + rnd() * 0.0025,
      p1: rnd() * 6.28,
      p2: rnd() * 6.28,
      tone: 1 + (b ? spec.boardTone : -spec.boardTone),
      sap: rnd() < spec.sapChance ? (rnd() < 0.5 ? -1 : 1) : 0,
    };
  });
  // knots: [board, x (m), v (m), radius (m), dead]
  const knots = [];
  for (let b = 0; b < 2; b++) {
    const n = spec.knots[0] + Math.floor(rnd() * (spec.knots[1] - spec.knots[0] + 1));
    for (let k = 0; k < n; k++) knots.push([b, (rnd() - 0.5) * 0.11, rnd() * 2.4, spec.knotR[0] + rnd() * (spec.knotR[1] - spec.knotR[0]), rnd() < spec.deadKnots]);
  }
  const col = new Float32Array(W * H * 3);
  const hgt = new Float32Array(W * H);
  const rough = new Float32Array(W * H);
  const [e0, e1, e2] = spec.early, [l0, l1, l2] = spec.late;
  const TAU = Math.PI * 2;
  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) * mmV * 0.001; // m
    for (let x = 0; x < W; x++) {
      const b = x < half ? 0 : 1;
      const B = boards[b];
      const lx = ((x - b * half + 0.5) * mmU) * 0.001 - 0.075; // m, -0.075..0.075
      const i = y * W + x;
      const D = B.d0 + B.a1 * Math.sin((TAU * v) / 2.4 + B.p1) + B.a2 * Math.sin((2 * TAU * v) / 2.4 + B.p2) + (warpA[i] - 0.5) * 0.006;
      const dx = lx - B.cx;
      let phase = Math.sqrt(dx * dx + D * D) * spec.rings + (warpB[i] - 0.5) * (spec.wobble ?? 0.4);
      // rings deflected around knots, knot cores
      let knot = 0, knotRing = 0, knotDead = false;
      for (let k = 0; k < knots.length; k++) {
        const K = knots[k];
        if (K[0] !== b) continue;
        let dv = v - K[2];
        if (dv > 1.2) dv -= 2.4;
        else if (dv < -1.2) dv += 2.4;
        const ex = (lx - K[1]) / K[3], ev = dv / (K[3] * 1.5);
        const r2 = ex * ex + ev * ev;
        if (r2 > 40) continue;
        phase += 3.2 * Math.exp(-r2 / 7);
        if (r2 < 1) {
          const r = Math.sqrt(r2);
          knot = Math.max(knot, smoothstep(1.0, 0.82, r));
          knotRing = Math.sin(r * 26) * 0.5 + 0.5;
          if (K[4] && r > 0.86) knotDead = true;
        }
      }
      const f = fract(phase);
      // Douglas-type rings: gradual earlywood, abrupt dense latewood, sharp ring boundary;
      // every ring a little different
      const ringK = 0.65 + 0.55 * hash2(Math.floor(phase), b, spec.seed);
      const lw = smoothstep(spec.lw[0], spec.lw[1], f) * (1 - smoothstep(0.965, 1.0, f)) * ringK;
      const fibre = (fib[i] - 0.5) * 0.7 + (fib2[i] - 0.5) * 0.5;
      const slow = (big[i] - 0.5) * 2;
      let tone = B.tone * (1 + slow * spec.slowTone + fibre * spec.fibreTone);
      let r = e0 + (l0 - e0) * lw, g = e1 + (l1 - e1) * lw, bl = e2 + (l2 - e2) * lw;
      // sapwood band along one edge: paler, more yellow
      if (B.sap) {
        const s = smoothstep(0.02, 0.05, lx * B.sap);
        r += (spec.sap[0] - r) * s * 0.7;
        g += (spec.sap[1] - g) * s * 0.7;
        bl += (spec.sap[2] - bl) * s * 0.7;
      }
      if (knot > 0) {
        const kr = spec.knot[0] * (0.85 + 0.3 * knotRing), kg = spec.knot[1] * (0.85 + 0.3 * knotRing), kb = spec.knot[2] * (0.85 + 0.3 * knotRing);
        r += (kr - r) * knot;
        g += (kg - g) * knot;
        bl += (kb - bl) * knot;
        if (knotDead) {
          r *= 0.6;
          g *= 0.56;
          bl *= 0.54;
        }
      }
      col[i * 3] = r * tone;
      col[i * 3 + 1] = g * tone;
      col[i * 3 + 2] = bl * tone;
      hgt[i] = lw * spec.ridge + fibre * spec.fibreH + knot * spec.knotH;
      rough[i] = spec.rough[0] + (spec.rough[1] - spec.rough[0]) * lw + fibre * 0.06 - knot * 0.12;
    }
  }
  return { col, hgt, rough, W, H, mmU, mmV, rnd };
}

function finishWood(w, normalStrength) {
  const { col, hgt, rough, W, H, mmU, mmV } = w;
  const data = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    data[i * 4] = clamp(col[i * 3], 0, 255);
    data[i * 4 + 1] = clamp(col[i * 3 + 1], 0, 255);
    data[i * 4 + 2] = clamp(col[i * 3 + 2], 0, 255);
    data[i * 4 + 3] = 255;
  }
  return {
    map: dataTexture(data, W, H, { srgb: true }),
    normalMap: dataTexture(normalMapFromHeight(hgt, W, H, mmU, mmV, normalStrength), W, H),
    roughnessMap: dataTexture(roughFromArray(rough, W, H), W, H),
  };
}

const cache = {};

// fresh Douglas fir (type 0 and the board stack)
export function douglasTextures() {
  if (cache.douglas) return cache.douglas;
  const w = sawnWood(384, 1536, {
    seed: 101,
    rings: 170,
    depth: [0.05, 0.11],
    rift: 0.45,
    wobble: 0.35,
    early: [220, 158, 110],
    late: [186, 112, 70],
    sap: [230, 198, 152],
    sapChance: 0.35,
    knot: [150, 88, 52],
    knots: [0, 2],
    knotR: [0.005, 0.013],
    deadKnots: 0.25,
    lw: [0.66, 0.78],
    boardTone: 0.045,
    slowTone: 0.06,
    fibreTone: 0.06,
    ridge: 0.05,
    fibreH: 0.04,
    knotH: 0.05,
    rough: [0.72, 0.6],
  });
  cache.douglas = finishWood(w, 1.2);
  return cache.douglas;
}

// fresh pale pine (repaired section, pallet, stakes)
export function pineTextures() {
  if (cache.pine) return cache.pine;
  const w = sawnWood(384, 1024, {
    seed: 202,
    rings: 140,
    depth: [0.06, 0.14],
    rift: 0.4,
    wobble: 0.3,
    early: [226, 204, 162],
    late: [204, 172, 122],
    sap: [234, 216, 176],
    sapChance: 0.3,
    knot: [150, 98, 52],
    knots: [1, 3],
    knotR: [0.005, 0.012],
    deadKnots: 0.2,
    lw: [0.7, 0.85],
    boardTone: 0.03,
    slowTone: 0.04,
    fibreTone: 0.05,
    ridge: 0.03,
    fibreH: 0.03,
    knotH: 0.04,
    rough: [0.78, 0.7],
  });
  cache.pine = finishWood(w, 1.0);
  return cache.pine;
}

// silver-grey weathered boards (old fence, gate): eroded earlywood, streaks, checks, lichen
export function weatheredTextures() {
  if (cache.weathered) return cache.weathered;
  const W = 384, H = 1536;
  const w = sawnWood(W, H, {
    seed: 303,
    rings: 175,
    depth: [0.05, 0.12],
    rift: 0.55,
    wobble: 0.45,
    early: [134, 130, 122],
    late: [160, 155, 145],
    sap: [130, 125, 116],
    sapChance: 0,
    knot: [90, 84, 78],
    knots: [1, 3],
    knotR: [0.007, 0.016],
    deadKnots: 0.8,
    lw: [0.55, 0.72],
    boardTone: 0.07,
    slowTone: 0.1,
    fibreTone: 0.14,
    ridge: 0.32,
    fibreH: 0.16,
    knotH: -0.2,
    rough: [0.93, 0.86],
  });
  const { col, hgt, rough, rnd, mmU, mmV } = w;
  // dead knots darker: handled by the generic model; here a little more contrast overall
  const half = W / 2;
  const streak = periodicNoise(W, H, 48, 6, 311); // long vertical water streaks
  const streak2 = periodicNoise(W, H, 96, 14, 312);
  const patch = periodicFbm(W, H, 6, 12, 2, 313);
  const lich = periodicFbm(W, H, 24, 96, 2, 314);
  const lichMask = periodicNoise(W, H, 3, 6, 315);
  // checks (cracks along the grain)
  const cracks = [];
  for (let k = 0; k < 18; k++) cracks.push({ b: k % 2, x: 8 + rnd() * (half - 16), y0: rnd() * H, len: (100 + rnd() * 380) / mmV, wob: rnd() * 6.28, w: 0.6 + rnd() * 1.1 });
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      // dark streaks running down the boards, a few brownish patches of the old colour
      const s = smoothstep(0.55, 0.85, streak[i] * 0.7 + streak2[i] * 0.3);
      let r = col[i * 3], g = col[i * 3 + 1], bl = col[i * 3 + 2];
      const dark = 1 - s * 0.38;
      r *= dark;
      g *= dark;
      bl *= dark * 0.98;
      const p = smoothstep(0.62, 0.8, patch[i]) * 0.35;
      r += (132 - r) * p;
      g += (112 - g) * p;
      bl += (88 - bl) * p;
      // lichen: pale grey-green rosettes in some areas
      const lm = smoothstep(0.66, 0.8, lichMask[i]);
      const l = smoothstep(0.6, 0.72, lich[i]) * lm;
      if (l > 0) {
        const yellow = hash2(x >> 5, y >> 6, 9) < 0.15;
        const lr = yellow ? 168 : 150, lg = yellow ? 164 : 156, lb = yellow ? 104 : 136;
        r += (lr - r) * l * 0.7;
        g += (lg - g) * l * 0.7;
        bl += (lb - bl) * l * 0.7;
        hgt[i] += l * 0.25;
        rough[i] = Math.min(1, rough[i] + l * 0.05);
      }
      col[i * 3] = r;
      col[i * 3 + 1] = g;
      col[i * 3 + 2] = bl;
    }
  }
  for (const c of cracks) {
    const x0 = c.b * half;
    for (let j = 0; j < c.len; j++) {
      const y = Math.floor(c.y0 + j) % H;
      const t = j / c.len;
      const taper = Math.sin(Math.PI * t);
      const cxp = c.x + Math.sin(c.wob + t * 7) * 2.2 + Math.sin(c.wob * 3 + t * 23) * 0.6;
      const wpx = c.w * taper + 0.25;
      for (let dx = -3; dx <= 3; dx++) {
        const xx = Math.round(cxp) + dx;
        if (xx < 1 || xx >= half - 1) continue;
        const k = clamp(1 - Math.abs(xx - cxp) / (wpx + 0.5));
        if (k <= 0) continue;
        const i = y * W + x0 + xx;
        col[i * 3] *= 1 - 0.75 * k;
        col[i * 3 + 1] *= 1 - 0.75 * k;
        col[i * 3 + 2] *= 1 - 0.72 * k;
        hgt[i] -= 0.9 * k;
      }
    }
  }
  cache.weathered = finishWood({ ...w, mmU, mmV }, 1.6);
  return cache.weathered;
}

// split chestnut (ganivelle stakes and round posts): u < 0.62 split face, u > 0.62 bark
export function chestnutTextures() {
  if (cache.chestnut) return cache.chestnut;
  const W = 256, H = 1024;
  const mmU = 300 / W, mmV = 2400 / H;
  const fib = periodicNoise(W, H, 128, 10, 401);
  const fib2 = periodicNoise(W, H, 48, 30, 402);
  const big = periodicFbm(W, H, 4, 8, 3, 403);
  const bark1 = periodicNoise(W, H, 24, 18, 404);
  const bark2 = periodicNoise(W, H, 64, 90, 405);
  const col = new Uint8Array(W * H * 4);
  const hgt = new Float32Array(W * H);
  const rough = new Float32Array(W * H);
  const split = Math.round(W * 0.62);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let r, g, b, h, ro;
      if (x < split) {
        const f = (fib[i] - 0.5) * 0.8 + (fib2[i] - 0.5) * 0.6;
        const ring = 0.5 + 0.5 * Math.sin(x * 0.55 + (big[i] - 0.5) * 9);
        const t = 1 + f * 0.28 + (big[i] - 0.5) * 0.25;
        r = (158 + ring * 20) * t;
        g = (116 + ring * 15) * t;
        b = (80 + ring * 9) * t;
        h = f * 0.5 + ring * 0.15;
        ro = 0.86 + f * 0.06;
      } else {
        const fiss = smoothstep(0.42, 0.18, Math.abs(bark1[i] - 0.5) * 2 + (bark2[i] - 0.5) * 0.3);
        const t = 1 + (bark2[i] - 0.5) * 0.3;
        r = (96 - fiss * 38) * t;
        g = (82 - fiss * 34) * t;
        b = (70 - fiss * 30) * t;
        const grey = smoothstep(0.62, 0.78, big[i]);
        r += (128 - r) * grey * 0.6;
        g += (124 - g) * grey * 0.6;
        b += (116 - b) * grey * 0.6;
        h = -fiss * 1.2 + (bark2[i] - 0.5) * 0.3;
        ro = 0.92;
      }
      col[i * 4] = clamp(r, 0, 255);
      col[i * 4 + 1] = clamp(g, 0, 255);
      col[i * 4 + 2] = clamp(b, 0, 255);
      col[i * 4 + 3] = 255;
      hgt[i] = h;
      rough[i] = ro;
    }
  }
  cache.chestnut = {
    map: dataTexture(col, W, H, { srgb: true }),
    normalMap: dataTexture(normalMapFromHeight(hgt, W, H, mmU, mmV, 1.6), W, H),
    roughnessMap: dataTexture(roughFromArray(rough, W, H), W, H),
  };
  return cache.chestnut;
}

// bark of the fallen lime branch (u around, v along: 0.5 m x 1.2 m)
export function barkTextures() {
  if (cache.bark) return cache.bark;
  const W = 256, H = 512;
  const mmU = 500 / W, mmV = 1200 / H;
  const n1 = periodicNoise(W, H, 12, 5, 501);
  const n2 = periodicNoise(W, H, 28, 12, 502);
  const n3 = periodicNoise(W, H, 80, 60, 503);
  const n4 = periodicFbm(W, H, 4, 4, 2, 504);
  const col = new Uint8Array(W * H * 4);
  const hgt = new Float32Array(W * H);
  const rough = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const a = Math.abs(n1[i] * 0.7 + n2[i] * 0.3 - 0.5) * 2;
    const fiss = 1 - smoothstep(0.0, 0.2, a);
    const t = 0.9 + (n3[i] - 0.5) * 0.25 + (n4[i] - 0.5) * 0.3;
    let r = (118 - fiss * 52) * t, g = (108 - fiss * 48) * t, b = (96 - fiss * 42) * t;
    const lich = smoothstep(0.66, 0.78, n4[i] * 0.6 + n3[i] * 0.4);
    r += (150 - r) * lich * 0.5;
    g += (156 - g) * lich * 0.5;
    b += (126 - b) * lich * 0.5;
    col[i * 4] = clamp(r, 0, 255);
    col[i * 4 + 1] = clamp(g, 0, 255);
    col[i * 4 + 2] = clamp(b, 0, 255);
    col[i * 4 + 3] = 255;
    hgt[i] = -fiss * 1.4 + (n3[i] - 0.5) * 0.4;
    rough[i] = 0.9;
  }
  cache.bark = {
    map: dataTexture(col, W, H, { srgb: true }),
    normalMap: dataTexture(normalMapFromHeight(hgt, W, H, mmU, mmV, 1.4), W, H),
    roughnessMap: dataTexture(roughFromArray(rough, W, H), W, H),
  };
  return cache.bark;
}

// lime (Tilia) leaves: 2 x 2 atlas rasterised analytically (no canvas). 0: spray of 4 leaves,
// 1: spray of 3, 2: one big leaf, 3: two small leaves. RGB is the leaf colour (tinted per
// card; transparent texels keep a leaf colour, so mipmaps do not darken the edges), A the cut-out.
export function leafTexture() {
  if (cache.leaf) return cache.leaf;
  const S = 512, C = 256;
  const rnd = mulberry32(601);
  const data = new Uint8Array(S * S * 4);
  const tone = periodicNoise(S, S, 32, 32, 602);
  // leaves per cell: { cx, cy (base, px), len (px), ang, shade, asym, cell }, petioles as segments
  const leaves = [[], [], [], []];
  const stems = [[], [], [], []];
  const spray = (cell, n, scale) => {
    const ox = (cell % 2) * C, oy = cell < 2 ? 0 : C;
    const bx = ox + C * 0.5, by = oy + C * 0.97;
    for (let k = 0; k < n; k++) {
      const a = -0.9 + (1.8 * (k + 0.5)) / n + (rnd() - 0.5) * 0.25;
      const reach = C * (0.2 + rnd() * 0.12) * scale;
      const cx = bx + Math.sin(a) * reach, cy = by - Math.cos(a) * reach - C * 0.1;
      stems[cell].push([bx, by, cx, cy]);
      leaves[cell].push({ cx, cy, len: C * (0.36 + rnd() * 0.08) * scale, ang: a * 0.9 + (rnd() - 0.5) * 0.3, shade: 0.85 + rnd() * 0.3, asym: 0.9 + rnd() * 0.2 });
    }
  };
  spray(0, 4, 1.0);
  spray(1, 3, 1.08);
  leaves[2].push({ cx: C * 0.5, cy: C * 0.98, len: C * 0.82, ang: 0.08, shade: 1.0, asym: 1.05 });
  leaves[3].push({ cx: C * 1.32, cy: C * 1.92, len: C * 0.5, ang: -0.35, shade: 0.95, asym: 0.95 });
  leaves[3].push({ cx: C * 1.7, cy: C * 1.95, len: C * 0.46, ang: 0.4, shade: 1.05, asym: 1.08 });
  // half-width of a cordate leaf at v (0 base .. 1 tip), in leaf lengths
  const halfW = (v) => {
    if (v < -0.08 || v > 1) return 0;
    const t = Math.max(0, Math.min(1, (v + 0.08) / 1.08));
    return 0.47 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.9) * (1 - 0.15 * t);
  };
  const segDist = (px, py, x0, y0, x1, y1) => {
    const dx = x1 - x0, dy = y1 - y0;
    const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x0 + dx * t - px, y0 + dy * t - py);
  };
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      // canvas-style coordinates (y down) so the atlas matches the card uvs
      const px = x + 0.5, py = S - 1 - y + 0.5;
      const cell = (px >= C ? 1 : 0) + (py >= C ? 2 : 0);
      let a = 0, r = 78, g = 112, b = 40;
      for (const L of leaves[cell]) {
        const dx = px - L.cx, dy = py - L.cy;
        const ca = Math.cos(L.ang), sa = Math.sin(L.ang);
        // local: u across (right +), v along toward the tip (canvas -y)
        const u = (dx * ca + dy * sa) / L.len, v = -(-dx * sa + dy * ca) / L.len;
        const side = u >= 0 ? L.asym : 1 / L.asym;
        const w = halfW(v) * side;
        if (w <= 0) continue;
        // serrated margin
        const serr = 1 - 0.035 * Math.abs(Math.sin(v * 46));
        const e = w * serr - Math.abs(u);
        const cov = Math.max(0, Math.min(1, e * L.len + 0.5));
        if (cov <= 0) continue;
        // veins: midrib and 5 pairs of laterals running toward the margin and the tip
        const au = Math.abs(u);
        let vein = Math.max(0, 1 - au * L.len / 1.4) * (v > -0.02 && v < 0.95 ? 1 : 0);
        for (let k = 0; k < 6; k++) {
          const vk = 0.06 + k * 0.14;
          const dv = v - vk - au * 0.75;
          if (au < w * 0.92) vein = Math.max(vein, Math.max(0, 1 - Math.abs(dv) * L.len / 1.1) * 0.7 * (1 - au / (w + 1e-3)));
        }
        const n = tone[y * S + x] - 0.5;
        const grad = 1.0 - 0.18 * v + 0.1 * (u > 0 ? 1 : -1) * Math.min(1, au * 4);
        const sh = L.shade * grad * (1 + n * 0.25);
        let lr = 76 * sh, lg = 114 * sh, lb = 40 * sh;
        lr += (140 - lr) * vein * 0.35;
        lg += (170 - lg) * vein * 0.35;
        lb += (92 - lb) * vein * 0.35;
        // edge a little darker
        const edge = Math.max(0, 1 - e * L.len / 3);
        lr *= 1 - 0.18 * edge;
        lg *= 1 - 0.18 * edge;
        lb *= 1 - 0.18 * edge;
        if (cov > a) {
          a = cov;
          r = lr;
          g = lg;
          b = lb;
        }
      }
      for (const [x0, y0, x1, y1] of stems[cell]) {
        const dd = segDist(px, py, x0, y0, x1, y1);
        const cov = Math.max(0, Math.min(1, 1.9 - dd));
        if (cov > a) {
          a = cov;
          r = 96;
          g = 102;
          b = 50;
        }
      }
      data[i] = clamp(r, 0, 255);
      data[i + 1] = clamp(g, 0, 255);
      data[i + 2] = clamp(b, 0, 255);
      data[i + 3] = a * 255;
    }
  }
  const t = dataTexture(data, S, S, { srgb: true, repeat: false });
  cache.leaf = t;
  return t;
}

// rigid welded panels: vertical wire columns (u: one 5 cm cell, Ø 5 mm wire), a fake round
// shading in RGB, coverage in A. The horizontal wires are geometry.
export function panelWireTexture() {
  if (cache.panel) return cache.panel;
  const W = 64, H = 4;
  const data = new Uint8Array(W * H * 4);
  const wire = 6.4; // px
  for (let x = 0; x < W; x++) {
    const c = x + 0.5;
    const dist = Math.min(Math.abs(c - wire / 2), Math.abs(c - wire / 2 - W));
    const a = clamp(wire / 2 + 0.5 - dist);
    const shade = 0.75 + 0.35 * Math.sqrt(clamp(1 - (dist / (wire / 2)) ** 2));
    for (let y = 0; y < H; y++) {
      const i = (y * W + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = clamp(shade * 230, 0, 255);
      data[i + 3] = a * 255;
    }
  }
  cache.panel = dataTexture(data, W, H);
  return cache.panel;
}

// welded mesh 10 x 5 cm, Ø 2.5 mm (ranch: dog mesh on the garden side)
export function meshWireTexture() {
  if (cache.mesh) return cache.mesh;
  const W = 128, H = 64; // 10 cm x 5 cm
  const data = new Uint8Array(W * H * 4);
  const wpx = 3.2;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = Math.min(x + 0.5, W - x - 0.5), dy = Math.min(y + 0.5, H - y - 0.5);
      const a = Math.max(clamp(wpx / 2 + 0.5 - dx), clamp(wpx / 2 + 0.5 - dy));
      const i = (y * W + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 220;
      data[i + 3] = a * 255;
    }
  cache.mesh = dataTexture(data, W, H);
  return cache.mesh;
}

// periodic RGBA value noise (4 octaves in the 4 channels) for shader variation
export function noiseTexture() {
  if (cache.noise) return cache.noise;
  const N = 256;
  const layers = [periodicNoise(N, N, 8, 8, 701), periodicNoise(N, N, 16, 16, 702), periodicNoise(N, N, 32, 32, 703), periodicNoise(N, N, 64, 64, 704)];
  const data = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) for (let c = 0; c < 4; c++) data[i * 4 + c] = Math.round(layers[c][i] * 255);
  cache.noise = dataTexture(data, N, N);
  return cache.noise;
}

export function disposeTextures() {
  for (const k of Object.keys(cache)) {
    const v = cache[k];
    if (v.isTexture) v.dispose();
    else for (const t of Object.values(v)) t.dispose();
    delete cache[k];
  }
}
