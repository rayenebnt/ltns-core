// PINÈDE: every texture is drawn at load on a canvas: light oak (floor planks and cabinet fronts), a
// black marble with white veins, a boucle weave (as a normal map), the painting on the wall, the rug,
// the garden seen through the kitchen window, the sky, and the architect's plan with the house's mark.
import * as THREE from 'three';

export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function tex(w, h, draw, { repeat = false, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
// tileable value noise (for veins, weaves and grains)
function noise2(seed, cells) {
  const R = rng(seed);
  const g = new Float32Array(cells * cells).map(() => R());
  const at = (x, y) => g[((((y % cells) + cells) % cells) * cells) + (((x % cells) + cells) % cells)];
  return (u, v) => {
    const x = u * cells, y = v * cells, xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * sx;
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * sx;
    return a + (b - a) * sy;
  };
}
const fbm = (ns) => (u, v) => ns.reduce((s, [n, k, a]) => s + n(u * k, v * k) * a, 0);

// a normal map from a height function (tiling)
export function normalFrom(size, height, strength = 2) {
  const H = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) H[y * size + x] = height(x / size, y / size);
  const d = new Uint8Array(size * size * 4);
  const at = (x, y) => H[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1), k = (y * size + x) * 4;
      d[k] = (-dx / l * 0.5 + 0.5) * 255;
      d[k + 1] = (-dy / l * 0.5 + 0.5) * 255;
      d[k + 2] = (1 / l * 0.5 + 0.5) * 255;
      d[k + 3] = 255;
    }
  const t = new THREE.DataTexture(d, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

// light oak: long planks (floor) or a vertical grain (fronts)
export function oak({ planks = true, w = 1024, h = 1024, seed = 3 } = {}) {
  const R = rng(seed);
  return tex(w, h, (g) => {
    g.fillStyle = '#c8a682';
    g.fillRect(0, 0, w, h);
    const rows = planks ? 8 : 1;
    const ph = h / rows;
    for (let r = 0; r < rows; r++) {
      let x = planks ? -R() * w * 0.5 : 0;
      while (x < w) {
        const len = planks ? w * (0.45 + R() * 0.4) : w;
        const tone = 0.93 + R() * 0.11;
        g.fillStyle = `rgb(${Math.round(204 * tone)},${Math.round(170 * tone)},${Math.round(132 * tone)})`;
        g.fillRect(x, r * ph, len, ph);
        // the grain: long soft lines along the plank
        for (let k = 0; k < (planks ? 26 : 90); k++) {
          const y = r * ph + R() * ph;
          g.strokeStyle = `rgba(${R() < 0.5 ? '120,80,45' : '235,200,150'},${0.06 + R() * 0.12})`;
          g.lineWidth = 0.6 + R() * 1.8;
          g.beginPath();
          g.moveTo(x, y);
          const amp = 2 + R() * 6;
          for (let s = 0; s <= 8; s++) g.lineTo(x + (len * s) / 8, y + Math.sin(s * 0.9 + R()) * amp);
          g.stroke();
        }
        // a few knots
        if (planks && R() < 0.35) {
          const kx = x + R() * len, ky = r * ph + ph * (0.3 + R() * 0.4);
          g.fillStyle = 'rgba(110,70,40,0.25)';
          g.beginPath();
          g.ellipse(kx, ky, 6 + R() * 8, 3 + R() * 3, 0, 0, Math.PI * 2);
          g.fill();
        }
        if (planks) {
          g.fillStyle = 'rgba(70,45,25,0.35)';
          g.fillRect(x, r * ph, 2, ph);
        }
        x += len;
      }
      if (planks) {
        g.fillStyle = 'rgba(70,45,25,0.3)';
        g.fillRect(0, r * ph, w, 2);
      }
    }
  }, { repeat: true });
}

// black marble (« nero marquina »): a deep, slightly cloudy black crossed by long white veins that
// flow on a diagonal (isolines of a warped linear field, so they run on instead of closing into
// loops), each with a milky halo and a width that swells and thins; finer veins branch across in
// patches; rare warm threads. Tileable (every field is periodic over the tile).
export function marble(seed = 7, size = 1024) {
  const n = (sd, c) => noise2(seed * 31 + sd, c);
  const turb1 = fbm([[n(1, 2), 1, 0.5], [n(2, 4), 1, 0.3], [n(3, 8), 1, 0.14], [n(4, 16), 1, 0.06]]);
  const turb2 = fbm([[n(5, 3), 1, 0.5], [n(6, 6), 1, 0.3], [n(7, 12), 1, 0.2]]);
  const turb3 = fbm([[n(8, 4), 1, 0.6], [n(9, 16), 1, 0.4]]);
  const width = fbm([[n(10, 4), 1, 0.7], [n(11, 8), 1, 0.3]]);
  const mask = fbm([[n(12, 3), 1, 0.7], [n(13, 6), 1, 0.3]]);
  const mask2 = fbm([[n(14, 5), 1, 0.7], [n(15, 10), 1, 0.3]]);
  const cloud = fbm([[n(16, 4), 1, 0.5], [n(17, 8), 1, 0.3], [n(18, 32), 1, 0.2]]);
  const fine = n(19, 128);
  const ss = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const dist = (t) => Math.abs(t - Math.round(t));
  return tex(size, size, (g, w, h) => {
    const img = g.createImageData(w, h);
    const d = img.data;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const u = x / w, v = y / h;
        const t1 = u + 2 * v + 2.2 * (turb1(u, v) - 0.5);
        const d1 = dist(t1);
        const wv = 0.0035 + 0.013 * width(u, v) ** 2;
        const core = Math.exp(-((d1 / wv) ** 2));
        const halo = Math.exp(-((d1 / (wv * 7)) ** 2));
        const t2 = 3 * u - 2 * v + 1.8 * (turb2(u, v) - 0.5);
        const thin = Math.exp(-((dist(t2) / 0.0032) ** 2)) * ss(0.42, 0.62, mask(u, v));
        const t3 = 2 * u + 5 * v + 1.2 * (turb3(u, v) - 0.5);
        const hair = Math.exp(-((dist(t3) / 0.0022) ** 2)) * ss(0.5, 0.7, mask2(u, v)) * 0.6;
        const t4 = 4 * u + v + 1.5 * (turb2(v, u) - 0.5);
        const warm = Math.exp(-((dist(t4) / 0.0025) ** 2)) * ss(0.55, 0.75, mask2(v, u)) * 0.55;
        const cl = cloud(u, v), fn = fine(u, v);
        const base = 11 + cl * 15 + fn * 4;
        const white = Math.min(1, core + halo * (0.09 + 0.15 * cl) + thin * 0.8 + hair);
        const k = (y * w + x) * 4;
        d[k] = base + (238 - base) * white + warm * 150;
        d[k + 1] = base + 1 + (236 - base) * white + warm * 118;
        d[k + 2] = base + 3 + (230 - base) * white + warm * 72;
        d[k + 3] = 255;
      }
    g.putImageData(img, 0, 0);
  }, { repeat: true });
}

// the sky, as an equirectangular panorama (anchored to the world): a deep blue zenith, a pale
// horizon, a few soft clouds low over the trees
export function sky() {
  const R = rng(71);
  return tex(2048, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#3f7fcf');
    gr.addColorStop(0.3, '#69a2e0');
    gr.addColorStop(0.44, '#a8cdef');
    gr.addColorStop(0.5, '#e4eef4');
    gr.addColorStop(0.52, '#c9d6c4');
    gr.addColorStop(1, '#8d9e7c');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.filter = 'blur(14px)';
    for (let i = 0; i < 46; i++) {
      const x = R() * w, y = h * (0.3 + R() * 0.16), s = 30 + R() * 90;
      g.fillStyle = `rgba(255,255,255,${0.25 + R() * 0.4})`;
      for (let k = 0; k < 5; k++) {
        g.beginPath();
        g.ellipse(x + (R() - 0.5) * s * 2.4, y + (R() - 0.5) * s * 0.25, s * (0.6 + R() * 0.6), s * (0.22 + R() * 0.16), 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.filter = 'none';
  });
}

// the lawn: mown stripes, a fine grain, patches of a warmer green (tiles every 8 m)
export function grass() {
  const R = rng(81);
  const n = fbm([[noise2(82, 8), 1, 0.6], [noise2(83, 32), 1, 0.25], [noise2(84, 128), 1, 0.15]]);
  return tex(512, 512, (g, w, h) => {
    const img = g.createImageData(w, h);
    const d = img.data;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const u = x / w, v = y / h;
        const t = n(u, v), stripe = Math.floor(u * 8) % 2 ? 1.05 : 0.95;
        const k = (y * w + x) * 4;
        const l = (0.78 + t * 0.42) * stripe;
        d[k] = 86 * l + (t > 0.62 ? 18 : 0);
        d[k + 1] = 136 * l;
        d[k + 2] = 58 * l;
        d[k + 3] = 255;
      }
    g.putImageData(img, 0, 0);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(${R() < 0.5 ? '40,70,25' : '150,190,90'},${0.08 + R() * 0.12})`;
      g.fillRect(R() * w, R() * h, 1, 2 + R() * 3);
    }
  }, { repeat: true });
}
// large pale stone pavers with thin joints (tiles every 3.2 m: 4 by 4 slabs of 0.8 m)
export function pavers() {
  const R = rng(91);
  return tex(512, 512, (g, w, h) => {
    g.fillStyle = '#bdb4a4';
    g.fillRect(0, 0, w, h);
    const s = w / 4;
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const tone = 0.95 + R() * 0.08;
        g.fillStyle = `rgb(${Math.round(222 * tone)},${Math.round(214 * tone)},${Math.round(199 * tone)})`;
        g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
        for (let k = 0; k < 60; k++) {
          g.fillStyle = `rgba(${R() < 0.5 ? '255,255,250' : '150,140,120'},${0.05 + R() * 0.07})`;
          g.beginPath();
          g.arc(i * s + 2 + R() * (s - 4), j * s + 2 + R() * (s - 4), 1 + R() * 3, 0, Math.PI * 2);
          g.fill();
        }
      }
  }, { repeat: true });
}
// the villa's windows: the sky and the garden reflected in dark glass
export function glassReflect() {
  const R = rng(97);
  return tex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#9fbdd6');
    gr.addColorStop(0.45, '#5f7d96');
    gr.addColorStop(0.55, '#2d3b33');
    gr.addColorStop(1, '#1b2320');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(${30 + R() * 30},${55 + R() * 40},${35 + R() * 20},${0.5 + R() * 0.4})`;
      g.beginPath();
      g.arc(R() * w, h * (0.42 + R() * 0.16), 8 + R() * 22, 0, Math.PI * 2);
      g.fill();
    }
    const sh = g.createLinearGradient(0, 0, w, h);
    sh.addColorStop(0, 'rgba(255,255,255,0)');
    sh.addColorStop(0.5, 'rgba(255,255,255,0.14)');
    sh.addColorStop(0.56, 'rgba(255,255,255,0)');
    g.fillStyle = sh;
    g.fillRect(0, 0, w, h);
  });
}
// the pool: turquoise water, deeper at the far end, a net of caustics (tiles every 2 m)
export function caustics() {
  const n = fbm([[noise2(101, 6), 1, 0.7], [noise2(102, 12), 1, 0.3]]);
  const n2 = fbm([[noise2(103, 5), 1, 0.7], [noise2(104, 10), 1, 0.3]]);
  return tex(512, 512, (g, w, h) => {
    const img = g.createImageData(w, h);
    const d = img.data;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const u = x / w, v = y / h;
        const a = Math.abs(n(u, v) - 0.5), b2 = Math.abs(n2(u + 0.13, v) - 0.5);
        const c = Math.exp(-((a / 0.03) ** 2)) * 0.55 + Math.exp(-((b2 / 0.025) ** 2)) * 0.45;
        const k = (y * w + x) * 4;
        d[k] = 40 + c * 170;
        d[k + 1] = 170 + c * 80;
        d[k + 2] = 205 + c * 45;
        d[k + 3] = 255;
      }
    g.putImageData(img, 0, 0);
  }, { repeat: true });
}
// a facade's stucco: a soft, fine mottling (tiles every 2 m)
export const stucco = () => normalFrom(256, fbm([[noise2(111, 32), 1, 0.6], [noise2(112, 96), 1, 0.4]]), 2.5);

// leaves: an irregular, bumpy normal map for hedges and tree crowns
export const leaves = () => normalFrom(256, fbm([[noise2(41, 16), 1, 0.55], [noise2(42, 32), 1, 0.3], [noise2(43, 64), 1, 0.15]]), 7);

// the boucle weave and the rug: normal maps
export const boucle = () => normalFrom(256, fbm([[noise2(4, 64), 1, 0.7], [noise2(5, 128), 1, 0.3]]), 6);
export const weave = () => normalFrom(256, (u, v) => 0.5 + 0.25 * Math.sin(u * 128 * Math.PI) * Math.sin(v * 128 * Math.PI) + 0.25 * noise2(6, 64)(u, v), 3);

// the painting: soft teal and blue strokes, a pale bust in profile
export function painting() {
  const R = rng(19);
  return tex(512, 640, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#dfe7e6');
    gr.addColorStop(1, '#a9c3c6');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) {
      g.fillStyle = ['rgba(40,90,110,0.18)', 'rgba(90,150,160,0.2)', 'rgba(250,250,245,0.25)', 'rgba(30,60,80,0.15)'][Math.floor(R() * 4)];
      g.beginPath();
      g.ellipse(R() * w, R() * h, 10 + R() * 60, 4 + R() * 16, R() * 3, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = 'rgba(245,244,238,0.9)';
    g.beginPath();
    g.ellipse(w * 0.5, h * 0.36, w * 0.14, h * 0.13, 0.1, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(w * 0.3, h * 0.9);
    g.quadraticCurveTo(w * 0.36, h * 0.52, w * 0.5, h * 0.5);
    g.quadraticCurveTo(w * 0.66, h * 0.52, w * 0.72, h * 0.9);
    g.fill();
  });
}

// the garden behind the kitchen window: hedges, trees, light
export function garden() {
  const R = rng(23);
  return tex(1024, 512, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#cfe6f2');
    sky.addColorStop(1, '#f1f4ef');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const x = R() * w, y = h * (0.15 + R() * 0.85), r = 20 + R() * 70;
      g.fillStyle = `rgba(${40 + R() * 50},${90 + R() * 70},${40 + R() * 40},${0.55 + R() * 0.4})`;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  });
}

// the plan: an architect's ground-floor plan in fine grey-blue ink: the lot, the house (double
// walls, doors and their swings, windows), the furniture of every room, the terrace, a free-form
// pool, trees, dimension chains, a north arrow, the title block; the house's mark in the middle
export function blueprint(mark) {
  const R = rng(57);
  return tex(2048, 1400, (g, w, h) => {
    g.fillStyle = '#f4f4f1';
    g.fillRect(0, 0, w, h);
    // the paper's faint grid, a darker line every five squares
    for (let x = 0, i = 0; x < w; x += 24, i++) {
      g.fillStyle = i % 5 ? 'rgba(120,140,160,0.07)' : 'rgba(120,140,160,0.13)';
      g.fillRect(x, 0, 1, h);
    }
    for (let y = 0, i = 0; y < h; y += 24, i++) {
      g.fillStyle = i % 5 ? 'rgba(120,140,160,0.07)' : 'rgba(120,140,160,0.13)';
      g.fillRect(0, y, w, 1);
    }
    const ink = 'rgba(72,93,120,0.88)', ink2 = 'rgba(72,93,120,0.55)', ink3 = 'rgba(72,93,120,0.3)';
    g.lineJoin = 'miter';
    g.lineCap = 'butt';
    const line = (pts, lw = 2, c = ink, close = false) => {
      g.strokeStyle = c;
      g.lineWidth = lw;
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      if (close) g.closePath();
      g.stroke();
    };
    const rect = (x, y, rw, rh, lw = 2, c = ink) => line([[x, y], [x + rw, y], [x + rw, y + rh], [x, y + rh]], lw, c, true);
    const circ = (x, y, r, lw = 2, c = ink, a0 = 0, a1 = Math.PI * 2) => {
      g.strokeStyle = c;
      g.lineWidth = lw;
      g.beginPath();
      g.arc(x, y, r, a0, a1);
      g.stroke();
    };
    const label = (t, x, y, size = 20, c = ink, wgt = 600) => {
      g.fillStyle = c;
      g.font = `${wgt} ${size}px 'Archivo', sans-serif`;
      if ('letterSpacing' in g) g.letterSpacing = `${Math.round(size * 0.12)}px`;
      g.textAlign = 'center';
      g.fillText(t, x, y);
      if ('letterSpacing' in g) g.letterSpacing = '0px';
    };
    // the lot, dashed
    g.setLineDash([18, 10, 4, 10]);
    rect(110, 80, 1840, 1170, 2, ink2);
    g.setLineDash([]);
    // trees of the garden: soft scalloped circles with a centre dot
    const tree = (x, y, r) => {
      g.strokeStyle = ink3;
      g.lineWidth = 2;
      g.beginPath();
      const n = 14;
      for (let i = 0; i <= n; i++) {
        const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
        g.arc(x + Math.cos((a0 + a1) / 2) * r * 0.86, y + Math.sin((a0 + a1) / 2) * r * 0.86, r * 0.24, a0 - 0.3 + Math.PI / 2 - Math.PI / 2, a1 + 0.3);
      }
      g.stroke();
      g.fillStyle = ink3;
      g.beginPath();
      g.arc(x, y, 4, 0, Math.PI * 2);
      g.fill();
    };
    for (const [x, y, r] of [[200, 170, 60], [330, 150, 44], [1880, 170, 70], [1760, 120, 46], [190, 1150, 58], [1880, 1150, 64], [1060, 1170, 48], [1300, 1180, 40], [190, 560, 50], [1890, 600, 56]]) tree(x, y, r);
    // the house: walls as double lines with a light hatch between them
    const H0 = { x: 300, y: 260 };
    const ext = [[300, 260], [1500, 260], [1500, 900], [820, 900], [820, 1150], [300, 1150]];
    const wallBand = (pts, t) => {
      g.save();
      g.strokeStyle = 'rgba(72,93,120,0.16)';
      g.lineWidth = t;
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
      g.stroke();
      g.restore();
    };
    wallBand(ext, 16);
    line(ext.map(([x, y]) => [x + (x === 300 ? -8 : x === 1500 || x === 820 ? 8 : 0), y + (y === 260 ? -8 : y === 900 || y === 1150 ? 8 : 0)]), 2.6, ink, true);
    line(ext.map(([x, y]) => [x + (x === 300 ? 8 : x === 1500 || x === 820 ? -8 : 0), y + (y === 260 ? 8 : y === 900 || y === 1150 ? -8 : 0)]), 1.6, ink, true);
    // interior walls
    const iw = (x0, y0, x1, y1) => {
      g.strokeStyle = 'rgba(72,93,120,0.16)';
      g.lineWidth = 10;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
      const v = x0 === x1;
      line([[x0 - (v ? 5 : 0), y0 - (v ? 0 : 5)], [x1 - (v ? 5 : 0), y1 - (v ? 0 : 5)]], 1.6);
      line([[x0 + (v ? 5 : 0), y0 + (v ? 0 : 5)], [x1 + (v ? 5 : 0), y1 + (v ? 0 : 5)]], 1.6);
    };
    iw(900, 268, 900, 560);
    iw(308, 600, 900, 600);
    iw(640, 600, 640, 892);
    iw(900, 680, 900, 892);
    iw(1060, 600, 1060, 892);
    iw(900, 600, 1060, 600);
    iw(308, 900, 812, 900);
    // doors: a gap and a quarter swing
    const door = (x, y, r, a0) => {
      g.save();
      g.setLineDash([]);
      circ(x, y, r, 1.4, ink2, a0, a0 + Math.PI / 2);
      line([[x, y], [x + r * Math.cos(a0), y + r * Math.sin(a0)]], 2.2);
      g.restore();
    };
    door(560, 600, 66, -Math.PI / 2);
    door(780, 600, 66, -Math.PI / 2);
    door(900, 680, 62, 0);
    door(1060, 760, 62, Math.PI / 2);
    door(560, 900, 70, -Math.PI / 2);
    door(1500, 420, 0.01, 0);
    // windows on the outer walls: three thin lines across the wall
    const win = (x0, y0, x1, y1) => {
      const hz = y0 === y1;
      g.fillStyle = '#f4f4f1';
      if (hz) g.fillRect(x0, y0 - 9, x1 - x0, 18);
      else g.fillRect(x0 - 9, y0, 18, y1 - y0);
      for (const o of [-8, 0, 8]) line(hz ? [[x0, y0 + o], [x1, y0 + o]] : [[x0 + o, y0], [x0 + o, y1]], o ? 1.6 : 1.1);
    };
    win(380, 260, 560, 260);
    win(640, 260, 840, 260);
    win(1000, 260, 1420, 260);
    win(1500, 330, 1500, 820);
    win(300, 360, 300, 520);
    win(300, 680, 300, 840);
    win(380, 1150, 560, 1150);
    // the kitchen: an L of counters, the sink, the hob, the island and its five stools
    rect(316, 276, 560, 52, 1.6);
    rect(316, 328, 52, 220, 1.6);
    rect(470, 284, 90, 36, 1.4, ink2);
    circ(515, 302, 12, 1.2, ink2);
    for (let i = 0; i < 4; i++) circ(660 + (i % 2) * 34, 292 + Math.floor(i / 2) * 22, 8, 1.2, ink2);
    rect(470, 420, 300, 70, 2);
    for (let i = 0; i < 5; i++) circ(500 + i * 60, 515, 16, 1.4);
    label('CUISINE', 620, 395, 20);
    // the living room: the curved sofa, the table, the armchair, the rug, the low unit
    g.setLineDash([6, 6]);
    rect(1010, 360, 380, 260, 1.2, ink3);
    g.setLineDash([]);
    g.strokeStyle = ink;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(1200, 500, 170, Math.PI * 0.55, Math.PI * 1.25);
    g.arc(1200, 500, 112, Math.PI * 1.25, Math.PI * 0.55, true);
    g.closePath();
    g.stroke();
    rect(1170, 450, 110, 72, 1.6);
    circ(1360, 420, 40, 1.8);
    rect(1440, 380, 40, 300, 1.6);
    label('SÉJOUR', 1200, 640, 22);
    // the bedrooms: beds with pillows, night tables, a wardrobe
    const bed = (x, y, bw, bh) => {
      rect(x, y, bw, bh, 1.8);
      rect(x + 10, y + 10, bw / 2 - 15, 34, 1.2, ink2);
      rect(x + bw / 2 + 5, y + 10, bw / 2 - 15, 34, 1.2, ink2);
      line([[x, y + 64], [x + bw, y + 64]], 1.2, ink2);
      rect(x - 46, y, 36, 36, 1.2, ink2);
      rect(x + bw + 10, y, 36, 36, 1.2, ink2);
    };
    bed(420, 650, 150, 190);
    bed(720, 640, 120, 170);
    rect(1080, 620, 400, 50, 1.4, ink2);
    bed(1200, 700, 160, 180);
    label('CHAMBRE', 470, 875, 18);
    label('CHAMBRE', 770, 875, 18);
    label('SUITE', 1280, 690 + 200, 18);
    // the bathroom: a tub, two basins, a shower
    rect(916, 700, 128, 60, 1.6);
    g.beginPath();
    g.ellipse(980, 730, 50, 20, 0, 0, Math.PI * 2);
    g.stroke();
    circ(940, 840, 14, 1.4);
    circ(1010, 840, 14, 1.4);
    label('BAIN', 980, 805, 16);
    // the stair
    for (let i = 0; i < 10; i++) rect(916, 280 + i * 26, 120, 26, 1.2, ink2);
    line([[976, 290], [976, 520]], 1.2, ink2);
    // the garage: two cars
    const car = (x, y) => {
      g.strokeStyle = ink2;
      g.lineWidth = 1.6;
      g.beginPath();
      g.roundRect ? g.roundRect(x, y, 100, 200, 22) : g.rect(x, y, 100, 200);
      g.stroke();
      rect(x + 14, y + 50, 72, 44, 1.2, ink3);
      rect(x + 14, y + 130, 72, 34, 1.2, ink3);
    };
    car(360, 930);
    car(560, 930);
    label('GARAGE', 560, 1125, 18);
    // the terrace (hatched) and the free-form pool, steps and deck
    g.save();
    g.beginPath();
    g.rect(1516, 270, 330, 620);
    g.clip();
    g.strokeStyle = ink3;
    g.lineWidth = 1;
    for (let k = -700; k < 700; k += 22) {
      g.beginPath();
      g.moveTo(1516 + k, 270);
      g.lineTo(1516 + k + 620, 890);
      g.stroke();
    }
    g.restore();
    rect(1516, 270, 330, 620, 1.6);
    g.fillStyle = '#f4f4f1';
    g.strokeStyle = ink;
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(1590, 360);
    g.bezierCurveTo(1660, 320, 1790, 330, 1800, 420);
    g.bezierCurveTo(1810, 520, 1760, 560, 1780, 660);
    g.bezierCurveTo(1800, 780, 1700, 830, 1620, 800);
    g.bezierCurveTo(1560, 780, 1570, 700, 1580, 620);
    g.bezierCurveTo(1590, 520, 1540, 420, 1590, 360);
    g.fill();
    g.stroke();
    g.lineWidth = 1.2;
    g.strokeStyle = 'rgba(70,120,160,0.55)';
    g.beginPath();
    g.moveTo(1606, 380);
    g.bezierCurveTo(1666, 346, 1776, 356, 1784, 426);
    g.bezierCurveTo(1792, 520, 1744, 560, 1762, 660);
    g.bezierCurveTo(1780, 762, 1694, 806, 1626, 782);
    g.bezierCurveTo(1578, 764, 1588, 700, 1598, 620);
    g.bezierCurveTo(1606, 520, 1562, 430, 1606, 380);
    g.stroke();
    for (let i = 0; i < 3; i++) line([[1630, 770 - i * 14], [1690, 780 - i * 14]], 1.1, ink2);
    label('PISCINE', 1690, 590, 20);
    label('TERRASSE', 1690, 870, 16, ink2);
    // dimension chains: ticks, figures
    const dim = (x0, y0, x1, y1, t, off = 0) => {
      line([[x0, y0], [x1, y1]], 1.2);
      for (const [x, y] of [[x0, y0], [x1, y1]]) line([[x - 7, y + 7], [x + 7, y - 7]], 1.6);
      g.save();
      g.translate((x0 + x1) / 2, (y0 + y1) / 2);
      if (x0 === x1) g.rotate(-Math.PI / 2);
      g.fillStyle = ink;
      g.font = "500 19px 'Archivo', sans-serif";
      g.textAlign = 'center';
      g.fillText(t, 0, -8 + off);
      g.restore();
    };
    for (const [x0, x1, t] of [[300, 640, '5,65'], [640, 900, '4,35'], [900, 1060, '2,65'], [1060, 1500, '7,35']]) dim(x0, 200, x1, 200, t);
    dim(300, 160, 1500, 160, '20,00');
    for (const [y0, y1, t] of [[260, 600, '5,65'], [600, 900, '5,00'], [900, 1150, '4,15']]) dim(230, y0, 230, y1, t);
    dim(1560, 960, 1840, 960, '4,65');
    // area labels
    for (const [t, x, y] of [['32,4 m²', 620, 420], ['48,9 m²', 1200, 666], ['14,2 m²', 470, 899], ['12,8 m²', 770, 899]]) label(t, x, y, 14, ink2, 500);
    // north arrow
    g.save();
    g.translate(1930, 300);
    circ(0, 0, 34, 1.4);
    g.fillStyle = ink;
    g.beginPath();
    g.moveTo(0, -44);
    g.lineTo(11, 12);
    g.lineTo(0, 4);
    g.lineTo(-11, 12);
    g.closePath();
    g.fill();
    label('N', 0, -54, 18);
    g.restore();
    // the scale bar
    for (let i = 0; i < 5; i++) {
      g.fillStyle = i % 2 ? '#f4f4f1' : ink2;
      g.fillRect(1480 + i * 60, 1200, 60, 12);
    }
    rect(1480, 1200, 300, 12, 1.2);
    label('0', 1480, 1236, 14, ink2, 500);
    label('5 m', 1780, 1236, 14, ink2, 500);
    // the title block
    rect(w - 470, h - 190, 410, 150, 2);
    line([[w - 470, h - 140], [w - 60, h - 140]], 1.2);
    line([[w - 250, h - 140], [w - 250, h - 40]], 1.2);
    g.textAlign = 'left';
    g.fillStyle = ink;
    g.font = "700 22px 'Archivo', sans-serif";
    g.fillText('VILLA DES PINS — PLAN DU REZ', w - 455, h - 158);
    g.font = "500 17px 'Archivo', sans-serif";
    g.fillText('Échelle 1:100', w - 455, h - 110);
    g.fillText('Indice C · feuille 2/9', w - 455, h - 76);
    g.fillText('Pinède, bâtisseur', w - 235, h - 110);
    g.fillText('Concept fictif', w - 235, h - 76);
    // the mark, large, in the middle of the sheet
    g.save();
    g.globalAlpha = 0.66;
    mark(g, w * 0.5 - 390, h * 0.46, 150, 'rgba(146,160,176,1)');
    g.restore();
  });
}
// the mark: an umbrella pine over a roof line; drawn at (x, y) with a scale s
export function drawMark(g, x, y, s, color) {
  g.save();
  g.translate(x, y);
  g.fillStyle = color;
  g.strokeStyle = color;
  // the canopy: a flat, wide cloud
  g.beginPath();
  g.moveTo(-1.0 * s, 0);
  g.bezierCurveTo(-0.9 * s, -0.45 * s, -0.3 * s, -0.55 * s, 0, -0.5 * s);
  g.bezierCurveTo(0.35 * s, -0.62 * s, 0.95 * s, -0.4 * s, 1.0 * s, 0);
  g.bezierCurveTo(0.6 * s, 0.1 * s, -0.6 * s, 0.1 * s, -1.0 * s, 0);
  g.fill();
  // the trunk
  g.lineWidth = s * 0.09;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0.05 * s, 0.02 * s);
  g.quadraticCurveTo(0.12 * s, 0.5 * s, -0.02 * s, 0.95 * s);
  g.stroke();
  // the roof line under it
  g.lineWidth = s * 0.07;
  g.beginPath();
  g.moveTo(-0.9 * s, 1.05 * s);
  g.lineTo(-0.45 * s, 0.7 * s);
  g.lineTo(0.0 * s, 1.05 * s);
  g.stroke();
  g.font = `600 ${Math.round(s * 0.62)}px 'Archivo', sans-serif`;
  g.textBaseline = 'middle';
  if ('letterSpacing' in g) g.letterSpacing = `${Math.round(s * 0.12)}px`;
  g.fillText('PINÈDE', 1.35 * s, 0.25 * s);
  g.restore();
}
