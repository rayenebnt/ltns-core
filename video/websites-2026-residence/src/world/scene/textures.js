// Procedural textures painted on canvas at load time (no image files).
import * as THREE from 'three';
import { createNoise2D, fbm, mulberry32, clamp, smoothstep } from './noise.js';

let ANISO = 8;
export function setAnisotropy(a) {
  ANISO = a;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(canvas, { srgb = true, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = ANISO;
  t.needsUpdate = true;
  return t;
}

function pixelCanvas(w, h, fn) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const out = [0, 0, 0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      fn(x, y, out);
      const i = (y * w + x) * 4;
      d[i] = clamp(out[0], 0, 255);
      d[i + 1] = clamp(out[1], 0, 255);
      d[i + 2] = clamp(out[2], 0, 255);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// height (Float32Array w*h, wrapping) -> tangent-space normal map
function normalFromHeight(hgt, w, h, strength) {
  return pixelCanvas(w, h, (x, y, o) => {
    const xl = (x - 1 + w) % w, xr = (x + 1) % w;
    const yu = (y - 1 + h) % h, yd = (y + 1) % h;
    const dx = (hgt[y * w + xr] - hgt[y * w + xl]) * strength;
    const dy = (hgt[yd * w + x] - hgt[yu * w + x]) * strength;
    const l = Math.hypot(dx, dy, 1);
    o[0] = (-dx / l * 0.5 + 0.5) * 255;
    o[1] = (dy / l * 0.5 + 0.5) * 255;
    o[2] = (1 / l * 0.5 + 0.5) * 255;
  });
}

// ---------------------------------------------------------------- oak slats
export function oakTexture() {
  const n = createNoise2D(11);
  const w = 1024, h = 64;
  const c = pixelCanvas(w, h, (x, y, o) => {
    const g = fbm(n, x * 0.0032, y * 0.06, 3);
    const lines = 0.5 + 0.5 * Math.sin((y * 0.28 + g * 7.0) * 2.3);
    const fine = n(x * 0.09, y * 0.8);
    const tone = 0.84 + 0.12 * lines + 0.05 * fine + 0.06 * fbm(n, x * 0.0009 + 7, y * 0.01, 2);
    o[0] = 206 * tone;
    o[1] = 172 * tone;
    o[2] = 132 * tone;
  });
  return toTexture(c);
}

// --------------------------------------------------- walnut wall panels (+normal)
// Quarter-cut walnut veneer: two different 1.2 m leaves, mostly straight vertical grain with a
// faint cathedral figure, deep tones and a thin shadow reveal at the leaf edges. The texture
// tiles vertically (each noise term is cross-faded with its copy one tile lower), so the wall
// panels can each take a leaf at a random height (interior.js): no repeat lines up.
export function walnutTextures() {
  const n = createNoise2D(23);
  const n2 = createNoise2D(24);
  const w = 1024, h = 1024; // 2.4 m x 2.4 m
  const half = w / 2;
  const hgt = new Float32Array(w * h);
  const c = pixelCanvas(w, h, (x, y, o) => {
    const pi = x < half ? 0 : 1;
    let lx = (x - pi * half) / half;
    if (pi === 1) lx = 1 - lx;
    const yn = y / h;
    const ka = 1 - yn, kb = yn, kn = 1 / Math.hypot(ka, kb);
    const tile = (f) => (f(yn) * ka + f(yn - 1) * kb) * kn; // zero-mean noise, periodic in y
    // straight grain: thin vertical streaks, slightly wavy
    const wav = tile((v) => fbm(n, lx * 3.0 + pi * 5.0, v * 1.5, 2)) * 0.012;
    const g1 = tile((v) => n2((lx + wav) * 140.0 + pi * 31.0, v * 1.2)) * 0.5 + 0.5;
    const g2 = tile((v) => n2((lx + wav) * 38.0 + 7.0 + pi * 13.0, v * 0.6)) * 0.5 + 0.5;
    // faint cathedral arches, centred differently on the two leaves (6 per tile height)
    const dd = lx - (pi ? 0.45 : 0.62);
    const ring = (dd * dd * 5.0 - yn + tile((v) => fbm(n, lx * 1.6 + pi * 3.0, v * 2.0, 3)) * 0.12 + pi * 0.37) * 6.0;
    const f = ring - Math.floor(ring);
    const arch = smoothstep(0.55, 0.75, f) * smoothstep(1.0, 0.85, f) * smoothstep(0.42, 0.1, Math.abs(dd));
    const big = tile((v) => fbm(n, lx * 0.9 + 9.0 + pi * 4.0, v * 0.8, 2));
    let tone = 0.86 + 0.16 * g1 * g2 - 0.1 * (1 - g2) - 0.05 * arch + 0.1 * big;
    const ex = Math.min(x, w - 1 - x, Math.abs(x - half));
    const reveal = smoothstep(0.4, 2.2, ex);
    tone *= 0.25 + 0.75 * reveal;
    o[0] = 104 * tone;
    o[1] = 68 * tone;
    o[2] = 46 * tone;
    hgt[y * w + x] = reveal * 1.0 + g1 * 0.008;
  });
  const map = toTexture(c);
  const nrm = toTexture(normalFromHeight(hgt, w, h, 2.5), { srgb: false });
  return { map, normalMap: nrm };
}

// ---------------------------------------------------------- limestone floor
// Warm honed limestone in 1.2 m slabs: soft clouding, a few broad, faint veins, fine joints.
export function limestoneTexture() {
  const n = createNoise2D(31);
  const n2 = createNoise2D(32);
  const w = 1024, h = 1024; // 2.4 m x 2.4 m
  const c = pixelCanvas(w, h, (x, y, o) => {
    const cloud = fbm(n, x * 0.0032, y * 0.0032, 4);
    const fine = n2(x * 0.11, y * 0.11);
    const warp = fbm(n2, x * 0.0018 + 3.1, y * 0.0018 + 7.7, 3) * 3.0;
    const v = Math.sin((x * 0.0019 + y * 0.0011) * 6.0 + warp);
    const vein = Math.exp(-v * v * 9.0) * 0.6;
    let r = 231 + cloud * 9 - vein * 16 + fine * 3;
    let g = 220 + cloud * 8 - vein * 15 + fine * 3;
    let b = 199 + cloud * 6 - vein * 12 + fine * 2;
    const jx = Math.min(x % 512, 512 - (x % 512));
    const jy = Math.min(y % 512, 512 - (y % 512));
    const joint = Math.min(jx, jy) < 1.0 ? 0.9 : 1.0;
    o[0] = r * joint;
    o[1] = g * joint;
    o[2] = b * joint;
  });
  return toTexture(c);
}

// --------------------------------------------------------------- travertine
export function travertineTexture() {
  const n = createNoise2D(41);
  const w = 512, h = 512;
  const c = pixelCanvas(w, h, (x, y, o) => {
    const streak = fbm(n, x * 0.003, y * 0.05, 4);
    const pores = n(x * 0.12, y * 0.5);
    let tone = 0.9 + 0.07 * streak - (pores > 0.72 ? 0.18 : 0);
    o[0] = 222 * tone;
    o[1] = 205 * tone;
    o[2] = 178 * tone;
  });
  return toTexture(c);
}

// ------------------------------------------------------------ velvet normal
export function velvetNormal() {
  const n = createNoise2D(51);
  const w = 512, h = 512;
  const hgt = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = (x / w) * Math.PI * 2, v = (y / h) * Math.PI * 2;
      // tileable by sampling the noise on a torus-like mapping
      const crush = fbm(n, Math.cos(u) * 1.6 + Math.sin(v) * 0.4, Math.sin(u) * 1.6 + Math.cos(v) * 1.6, 3);
      const fibre = n(x * 0.45, y * 0.45);
      hgt[y * w + x] = crush * 0.9 + fibre * 0.12;
    }
  return toTexture(normalFromHeight(hgt, w, h, 6), { srgb: false });
}

// ------------------------------------------------------------ boucle normal
export function boucleNormal() {
  const n = createNoise2D(57);
  const w = 256, h = 256;
  const hgt = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const a = n(x * 0.21, y * 0.21);
      const b = n(x * 0.47 + 3, y * 0.47 + 9);
      hgt[y * w + x] = Math.abs(a) * 0.8 + Math.abs(b) * 0.4;
    }
  return toTexture(normalFromHeight(hgt, w, h, 3), { srgb: false });
}

// ---------------------------------------------------------------------- rug
export function rugTexture() {
  const n = createNoise2D(61);
  const w = 1024, h = 780;
  const c = pixelCanvas(w, h, (x, y, o) => {
    const heather = n(x * 0.6, y * 0.6) * 0.5 + 0.5;
    const cloud = fbm(n, x * 0.004, y * 0.004, 3);
    let r = 104, g = 92, b = 80;
    const tone = 0.86 + 0.1 * heather + 0.08 * cloud;
    r *= tone; g *= tone; b *= tone;
    // border band
    const ex = Math.min(x, w - x, y, h - y);
    if (ex > 46 && ex < 56) { r = 150; g = 128; b = 104; }
    // soft abstract contour lines
    const f = fbm(n, x * 0.0028 + 3, y * 0.0028 + 7, 3) * 6.0;
    const l = Math.abs(f - Math.round(f));
    if (ex > 70 && l < 0.02) { const k = 1 - l / 0.02; r += 26 * k; g += 22 * k; b += 17 * k; }
    o[0] = r; o[1] = g; o[2] = b;
  });
  return toTexture(c, { repeat: false });
}

// --------------------------------------------------------------- the painting
// A large textured abstract: layered indigo, umber and ochre palette-knife strokes.
export function artTexture() {
  const w = 900, h = 640;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const rnd = mulberry32(77);
  const n = createNoise2D(78);
  const pal = [
    [34, 42, 78], [28, 33, 58], [52, 64, 108], // indigo
    [84, 58, 40], [62, 44, 32], [112, 78, 52], // umber
    [188, 138, 62], [206, 162, 88], [150, 98, 46], // ochre
    [226, 212, 186], // bone
  ];
  // umber ground
  const gr = ctx.createLinearGradient(0, 0, w, h);
  gr.addColorStop(0, '#4a3628');
  gr.addColorStop(1, '#2e2420');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, w, h);
  // broad colour fields
  const field = (x, y, rw, rh, col, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rw, rh));
    g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a})`);
    g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };
  field(w * 0.25, h * 0.45, w * 0.45, h * 0.5, pal[0], 0.85);
  field(w * 0.72, h * 0.62, w * 0.35, h * 0.4, pal[6], 0.55);
  field(w * 0.6, h * 0.2, w * 0.3, h * 0.25, pal[3], 0.6);
  // palette-knife strokes: layered, mostly horizontal sweeps
  for (let i = 0; i < 520; i++) {
    const zone = rnd();
    const col = zone < 0.42 ? pal[(rnd() * 3) | 0] : zone < 0.75 ? pal[3 + ((rnd() * 3) | 0)] : zone < 0.95 ? pal[6 + ((rnd() * 3) | 0)] : pal[9];
    const x = rnd() * w, y = rnd() * h;
    const len = 30 + rnd() * 170, th = 6 + rnd() * 26;
    const ang = (rnd() - 0.5) * 0.7 + (zone < 0.42 ? 0.25 : -0.1);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.globalAlpha = 0.18 + rnd() * 0.5;
    ctx.fillStyle = `rgb(${col[0] + ((rnd() - 0.5) * 14) | 0},${col[1] + ((rnd() - 0.5) * 14) | 0},${col[2] + ((rnd() - 0.5) * 14) | 0})`;
    ctx.beginPath();
    ctx.moveTo(-len / 2, -th / 2);
    ctx.lineTo(len / 2, -th / 2 + (rnd() - 0.5) * 6);
    ctx.lineTo(len / 2 - 6, th / 2);
    ctx.lineTo(-len / 2 + 4, th / 2 + (rnd() - 0.5) * 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // a few dark gestures and thin bone highlights
  ctx.globalAlpha = 1;
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const bright = i >= 4;
    ctx.strokeStyle = bright ? 'rgba(232,220,196,0.7)' : `rgba(20,18,20,${0.55 + rnd() * 0.3})`;
    ctx.lineWidth = bright ? 2 + rnd() * 2 : 3 + rnd() * 7;
    ctx.beginPath();
    const x0 = w * (0.1 + rnd() * 0.75), y0 = h * (0.15 + rnd() * 0.65);
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(x0 + (rnd() - 0.3) * 260, y0 + (rnd() - 0.5) * 120, x0 + (rnd() - 0.5) * 260, y0 + (rnd() - 0.5) * 160, x0 + (rnd() - 0.5) * 320, y0 + (rnd() - 0.5) * 140);
    ctx.stroke();
  }
  // impasto relief and canvas grain
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const ridge = n(x * 0.045, y * 0.12) * 10 + n(x * 0.6, y * 0.6) * 5 + ((x + y) % 3 === 0 ? 2 : 0);
      d[i] += ridge; d[i + 1] += ridge; d[i + 2] += ridge;
    }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { repeat: false });
}

// ------------------------------------------------------- shader noise texture
export function noiseDataTexture() {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  const rnd = mulberry32(99);
  for (let i = 0; i < data.length; i++) data[i] = (rnd() * 256) | 0;
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

// ------------------------------------------- tileable ripple gradient (sea, ground detail)
// Sum of sines with integer frequencies: perfectly tileable, smooth, isotropic.
export function rippleTexture() {
  const N = 256;
  const rnd = mulberry32(123);
  const comps = [];
  while (comps.length < 72) {
    const m = Math.round((rnd() * 2 - 1) * 22), n = Math.round((rnd() * 2 - 1) * 22);
    const k = Math.hypot(m, n);
    if (k < 3 || k > 22) continue;
    comps.push([m, n, 1 / k, rnd() * Math.PI * 2]);
  }
  const gx = new Float32Array(N * N), gy = new Float32Array(N * N), hh = new Float32Array(N * N);
  let mg = 0, mh = 0;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      let ax = 0, ay = 0, h = 0;
      for (const [m, n, a, ph] of comps) {
        const ang = 2 * Math.PI * ((m * x + n * y) / N) + ph;
        const c = Math.cos(ang);
        ax += a * m * c;
        ay += a * n * c;
        h += a * Math.sin(ang);
      }
      const i = y * N + x;
      gx[i] = ax; gy[i] = ay; hh[i] = h;
      mg = Math.max(mg, Math.abs(ax), Math.abs(ay));
      mh = Math.max(mh, Math.abs(h));
    }
  const data = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    data[i * 4] = (gx[i] / mg) * 127.5 + 127.5;
    data[i * 4 + 1] = (gy[i] / mg) * 127.5 + 127.5;
    data[i * 4 + 2] = (hh[i] / mh) * 127.5 + 127.5;
    data[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = ANISO;
  t.needsUpdate = true;
  return t;
}
