// Per-product atlas (one DataTexture, front half | back half, planar projection of the flat
// garment): R = ink (screen prints, chenille, puff), G = trim / second-material region (varsity
// sleeves, jersey side panels), B = relief (0.5 neutral: seams and stitches below, raised prints
// above), A = wear (lighter thread, faded seams and edges of washed pieces).
// Drawn with canvas 2D and the page fonts (they must be loaded first: loadGarmentFonts()).
import * as THREE from 'three';
import { rng, mix } from './noise.js';

// atlas frame in garment metres: x in [FX0, FX0 + FS], y in [FY0, FY0 + FS], per half
export const FX0 = -0.55, FY0 = -1.03, FS = 1.1;
// the woven label lives in a corner no outline reaches
export const LABEL_RECT = { x0: -0.545, x1: -0.465, y0: -1.025, y1: -0.985 };

export function atlasUv(x, y, side) {
  const v = (y - FY0) / FS;
  return side > 0 ? [((x - FX0) / FS) * 0.5, v] : [0.5 + ((-x - FX0) / FS) * 0.5, v];
}

export async function loadGarmentFonts() {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all([
    '400 120px Anton', '400 120px "Lilita One"', '400 120px Yellowtail', '800 120px "Inter Tight"', '700 120px "Inter Tight"',
  ].map((f) => document.fonts.load(f).catch(() => null)));
}

let scratch = null;
function canvases(W, H) {
  if (!scratch || scratch.W !== W || scratch.H !== H) {
    const mk = () => {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      return { c, g: c.getContext('2d', { willReadFrequently: true }) };
    };
    scratch = { W, H, ink: mk(), trim: mk(), rel: mk(), wear: mk() };
  }
  return scratch;
}

// drawing context for one half: metres -> pixels, x in the view of that side
function painter(layer, side, px) {
  const g = layer.g;
  const ox = side > 0 ? 0 : px;
  const X = (x) => ox + ((x - FX0) / FS) * px;
  const Y = (y) => ((FY0 + FS - y) / FS) * px;
  const S = (m) => (m / FS) * px;
  return { g, X, Y, S, px };
}

function polyPath(p, pts, side) {
  const { g, X, Y } = p;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(X(side * x), Y(y)) : g.moveTo(X(side * x), Y(y))));
  g.closePath();
}

// text helpers: size in metres (cap height approx), centred at (x, y) view coords
function text(p, str, x, y, size, font, { spacing = 0, skew = 0, rotate = 0, fill = '#fff', maxW = 0, scaleX = 1 } = {}) {
  const { g, X, Y, S } = p;
  g.save();
  g.translate(X(x), Y(y));
  if (rotate) g.rotate(rotate);
  if (skew) g.transform(1, 0, -skew, 1, 0, 0);
  g.font = font.replace('#', `${S(size).toFixed(1)}px`);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if ('letterSpacing' in g) g.letterSpacing = `${S(spacing).toFixed(1)}px`;
  let sx = scaleX;
  if (maxW) {
    const w = g.measureText(str).width;
    if (w > 0) sx *= S(maxW) / w;
  }
  g.scale(sx, 1);
  g.fillStyle = fill;
  g.fillText(str, 0, 0);
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  g.restore();
}

function arcText(p, str, cx, cy, radius, size, font, spread, { fill = '#fff' } = {}) {
  // letters along an arch (centre below the text)
  const { g, X, Y, S } = p;
  g.save();
  g.font = font.replace('#', `${S(size).toFixed(1)}px`);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = fill;
  const widths = [...str].map((ch) => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0);
  let acc = -total / 2;
  for (let i = 0; i < str.length; i++) {
    const mid = acc + widths[i] / 2;
    const a = (mid / total) * spread;
    g.save();
    g.translate(X(cx) + Math.sin(a) * S(radius), Y(cy) - Math.cos(a) * S(radius));
    g.rotate(a);
    g.fillText(str[i], 0, 0);
    g.restore();
    acc += widths[i];
  }
  g.restore();
}

// screen-print cracks: a craquelure network (jittered lattice, some edges missing) of hairlines
function cracks(p, x0, y0, x1, y1, density, seed) {
  const { g, X, Y, S } = p;
  const r = rng(seed);
  const cell = 0.011 / Math.sqrt(density);
  const nx = Math.ceil((x1 - x0) / cell) + 1, ny = Math.ceil((y1 - y0) / cell) + 1;
  const pts = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) pts.push([x0 + (i + (r() - 0.5) * 0.8) * cell, y0 + (j + (r() - 0.5) * 0.8) * cell]);
  const at = (i, j) => pts[j * (nx + 1) + i];
  g.save();
  g.strokeStyle = '#000';
  g.lineCap = 'round';
  // three batched paths (fine, medium, wide hairlines): thousands of strokes in three calls
  const paths = [new Path2D(), new Path2D(), new Path2D()];
  const edge = (a, b) => {
    if (r() > 0.72) return;
    const pa = paths[Math.floor(r() * 2.999)];
    const mx = (a[0] + b[0]) / 2 + (r() - 0.5) * cell * 0.25, my = (a[1] + b[1]) / 2 + (r() - 0.5) * cell * 0.25;
    pa.moveTo(X(a[0]), Y(a[1]));
    pa.lineTo(X(mx), Y(my));
    pa.lineTo(X(b[0]), Y(b[1]));
  };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    edge(at(i, j), at(i + 1, j));
    edge(at(i, j), at(i, j + 1));
    if (r() < 0.25) edge(at(i, j), at(i + 1, j + 1));
  }
  paths.forEach((pa, k) => { g.lineWidth = Math.max(0.55, S([0.0004, 0.0006, 0.0009][k])); g.stroke(pa); });
  // a few worn patches where the ink flaked off
  for (let k = 0; k < density * 14; k++) {
    g.fillStyle = `rgba(0,0,0,${mix(0.25, 0.7, r())})`;
    g.beginPath();
    g.ellipse(X(mix(x0, x1, r())), Y(mix(y0, y1, r())), S(mix(0.002, 0.007, r())), S(mix(0.001, 0.004, r())), r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

// stitched line (relief groove + wear thread), along a polyline in view coords
function stitch(rel, wear, pts, { double = true, gap = 0.006, thread = 0.55 } = {}) {
  for (const off of double ? [-gap / 2, gap / 2] : [0]) {
    for (const [p, val, w] of [[rel, 'rgb(96,96,96)', 0.0016], [wear, `rgb(${Math.round(thread * 255)},0,0)`, 0.0011]]) {
      const { g, X, Y, S } = p;
      g.save();
      g.strokeStyle = val;
      g.lineWidth = Math.max(0.8, S(w));
      g.setLineDash([Math.max(1.5, S(0.0032)), Math.max(1, S(0.0016))]);
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y + off)) : g.moveTo(X(x), Y(y + off))));
      g.stroke();
      g.restore();
    }
  }
}
// seam: a soft groove (two plain strokes instead of a blur filter: canvas filters are slow on
// the software canvases we read back)
function seam(rel, wear, pts, width = 0.003) {
  const path = (p) => {
    const { g, X, Y } = p;
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
  };
  const { g, S } = rel;
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  path(rel);
  g.strokeStyle = 'rgba(70,70,70,0.45)';
  g.lineWidth = Math.max(1.5, S(width * 1.8));
  g.stroke();
  g.strokeStyle = 'rgba(70,70,70,0.9)';
  g.lineWidth = Math.max(0.8, S(width * 0.7));
  g.stroke();
  g.restore();
  if (wear) {
    const q = wear;
    q.g.save();
    q.g.lineCap = 'round';
    path(q);
    q.g.strokeStyle = 'rgba(110,0,0,0.5)';
    q.g.lineWidth = Math.max(1.5, q.S(width * 2.4));
    q.g.stroke();
    q.g.restore();
  }
}

// relief for raised prints: blurred copy of the ink shape, drawn brighter on the relief layer
function raise(p, draw, height = 0.9, blurM = 0.0015) {
  const { g, S } = p;
  g.save();
  g.filter = `blur(${Math.max(0.6, S(blurM)).toFixed(1)}px)`;
  const v = Math.round(128 + 127 * height);
  draw(`rgb(${v},${v},${v})`);
  g.restore();
}

// --- per-product designs (catalog.js prints), drawn in the view coordinates of each side ---------
const DESIGNS = {
  'manches-longues': (L, m) => {
    const { ink } = L.front;
    text(ink, 'ruelle', 0.112, m.yH - 0.13, 0.034, '400 # "Lilita One"');
    // vertical text down the left sleeve (wearer's left = +x on the front)
    const s = m.sleeve;
    const cx = mix(s.sp[0], s.c1[0], 0.5) - 0.022, cy = mix(s.sp[1], s.c1[1], 0.52);
    const ang = Math.atan2(s.c1[0] - s.sp[0], -(s.c1[1] - s.sp[1]));
    text(ink, 'RUELLE · MARSEILLE', cx, cy, 0.018, '800 # "Inter Tight"', { spacing: 0.004, rotate: Math.PI / 2 - ang });
    text(L.back.ink, 'RUELLE', 0, m.yH - 0.11, 0.07, '400 # Anton', { spacing: 0.006 });
  },
  'rien-a-prouver': (L, m) => {
    const { ink, rel } = L.front;
    const lines = ['RIEN', 'À', 'PROUVER'];
    const size = 0.112, lead = 0.112;
    const y0 = m.yH - 0.175;
    // the grave accent of À needs room under RIEN: the middle line sits a little lower
    const ys = [y0, y0 - lead - 0.02, y0 - 2 * lead - 0.008];
    lines.forEach((t, i) => text(ink, t, 0.0, ys[i], size, '400 # Anton', { maxW: i === 2 ? 0.37 : 0 }));
    raise(rel, (c) => lines.forEach((t, i) => text(rel, t, 0, ys[i], size, '400 # Anton', { fill: c, maxW: i === 2 ? 0.37 : 0 })), 0.12, 0.001);
    cracks(ink, -0.22, y0 - 0.3, 0.22, y0 + 0.08, 1.0, 77);
    text(L.back.ink, 'RUELLE — MARSEILLE', 0, m.yH - 0.075, 0.0125, '800 # "Inter Tight"', { spacing: 0.0035 });
  },
  debardeur: (L, m) => {
    const { ink } = L.front;
    arcText(ink, 'RUELLE', 0, m.yH - 0.62, 0.42, 0.095, '400 # Anton', 0.62);
    cracks(ink, -0.22, m.yH - 0.32, 0.22, m.yH - 0.12, 1.2, 91);
  },
  teddy: (L, m) => {
    const { ink, rel } = L.front;
    const chest = m.yH - 0.16;
    const script = (p, c, dx = 0) => text(p, 'Ruelle', 0.135 + dx, chest, 0.072, '400 # Yellowtail', { fill: c, rotate: -0.18 });
    script(ink, '#fff');
    raise(rel, (c) => script(rel, c), 0.85, 0.0025);
    // round felt patch with an R on the right chest (wearer's right = -x)
    const pr = 0.033, px = -0.13, py = chest - 0.005;
    ink.g.save();
    ink.g.fillStyle = '#fff';
    ink.g.beginPath();
    ink.g.arc(ink.X(px), ink.Y(py), ink.S(pr), 0, Math.PI * 2);
    ink.g.fill();
    ink.g.restore();
    text(ink, 'R', px, py - 0.001, 0.05, '400 # Anton', { fill: '#000' });
    raise(rel, (c) => { rel.g.fillStyle = c; rel.g.beginPath(); rel.g.arc(rel.X(px), rel.Y(py), rel.S(pr), 0, Math.PI * 2); rel.g.fill(); }, 0.55, 0.002);
    // back: arched MARSEILLE over a big chenille script
    const b = L.back;
    arcText(b.ink, 'MARSEILLE', 0, m.yH - 0.62, 0.5, 0.062, '400 # Anton', 0.62);
    const big = (p, c) => text(p, 'Ruelle', 0, m.yH - 0.31, 0.2, '400 # Yellowtail', { fill: c, rotate: -0.12 });
    big(b.ink, '#fff');
    raise(b.rel, (c) => big(b.rel, c), 0.9, 0.004);
    // letters drawn one by one: no blur filter here (one filtered layer per letter is slow)
    arcText(b.rel, 'MARSEILLE', 0, m.yH - 0.62, 0.5, 0.062, '400 # Anton', 0.62, { fill: 'rgb(180,180,180)' });
  },
  capuche: (L, m) => {
    const { ink, rel } = L.front;
    const logo = (p, c) => text(p, 'ruelle', 0, m.yH - 0.2, 0.05, '400 # "Lilita One"', { fill: c });
    logo(ink, '#fff');
    raise(rel, (c) => logo(rel, c), 0.8, 0.003);
  },
  'hors-saison': (L, m) => {
    const { ink } = L.front;
    text(ink, 'HORS', 0.115, m.yH - 0.122, 0.022, '800 # "Inter Tight"', { spacing: 0.002 });
    text(ink, 'SAISON', 0.115, m.yH - 0.146, 0.022, '800 # "Inter Tight"', { spacing: 0.002 });
    const b = L.back;
    text(b.ink, 'HORS SAISON', 0, m.yH - 0.2, 0.06, '800 # "Inter Tight"', { spacing: 0.003, maxW: 0.4 });
    // a simple wave line drawing
    const { g, X, Y, S } = b.ink;
    g.save();
    g.strokeStyle = '#fff';
    g.lineWidth = S(0.006);
    g.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      for (let i = 0; i <= 60; i++) {
        const x = -0.17 + (0.34 * i) / 60;
        const y = m.yH - 0.27 - k * 0.028 + Math.sin(x * 34 + k) * 0.012;
        if (i) g.lineTo(X(x), Y(y)); else g.moveTo(X(x), Y(y));
      }
      g.stroke();
    }
    g.restore();
  },
  maillot: (L, m) => {
    const { ink, rel } = L.front;
    text(ink, 'RUELLE', 0, m.yH - 0.2, 0.09, '400 # Anton', { skew: 0.16, maxW: 0.3, spacing: 0.003 });
    text(ink, '07', 0, m.yH - 0.285, 0.05, '400 # Anton', { skew: 0.16 });
    const b = L.back;
    text(b.ink, 'RUELLE', 0, m.yH - 0.13, 0.058, '400 # Anton', { spacing: 0.006 });
    text(b.ink, '07', 0, m.yH - 0.3, 0.25, '400 # Anton');
    raise(rel, () => {}, 0);
  },
  logo: (L, m) => {
    text(L.front.ink, 'ruelle', 0.112, m.yH - 0.13, 0.034, '400 # "Lilita One"');
  },
};

// seams, hems and trims that every garment of a shape has (both sides)
function construction(L, m, st, outline) {
  const S = m.S;
  for (const side of [1, -1]) {
    const P = side > 0 ? L.front : L.back;
    const { rel, wear, trim } = P;
    // faded rim (washed garments lose colour along the folded edges)
    if (st.wash > 0.3) {
      const { g, X, Y, S: sc } = wear;
      g.save();
      g.lineJoin = 'round';
      g.beginPath();
      outline.forEach(([x, y], i) => (i ? g.lineTo(X(side * x), Y(y)) : g.moveTo(X(side * x), Y(y))));
      g.closePath();
      for (const [w, a] of [[0.016, 0.22], [0.009, 0.3], [0.004, 0.4]]) {
        g.strokeStyle = `rgba(120,0,0,${a})`;
        g.lineWidth = sc(w);
        g.stroke();
      }
      g.restore();
    }
    // body hem: double needle, 2.2 cm above the hem (garments without a rib band)
    if (!S.band) stitch(rel, wear, [[-S.hemHalf, m.yBody + 0.022], [S.hemHalf, m.yBody + 0.022]], { gap: 0.006, thread: st.wash > 0.3 ? 0.75 : 0.4 });
    const sl = m.sleeve;
    if (sl && sl.c1) {
      for (const sx of [1, -1]) {
        const k = sx * side; // view x sign of this sleeve
        // armhole seam: shoulder point down to the armpit
        const pts = [];
        for (let i = 0; i <= 12; i++) {
          const t = i / 12;
          const x = mix(sl.sp[0], sl.ap[0], t) - Math.sin(Math.PI * t) * 0.018;
          const y = mix(sl.sp[1], sl.ap[1], t);
          pts.push([k * x, y]);
        }
        seam(rel, wear, pts, 0.0028);
        if (!S.cuff) {
          // sleeve hem stitch, parallel to the opening
          const ax = sl.axis, back = 0.02;
          const a = [sl.c1[0] - ax[0] * back, sl.c1[1] - ax[1] * back], b = [sl.c2[0] - ax[0] * back, sl.c2[1] - ax[1] * back];
          stitch(rel, wear, [[k * a[0], a[1]], [k * b[0], b[1]]], { gap: 0.005, thread: st.wash > 0.3 ? 0.75 : 0.4 });
        }
      }
    }
    // shoulder seam is on the rim; the jersey gets side panels and sleeve bands in the trim colour
    if (st.shape === 'jersey') {
      const { g, X, Y, S: sc } = trim;
      g.save();
      g.fillStyle = '#fff';
      for (const sx of [1, -1]) {
        g.beginPath();
        g.moveTo(X(sx * (m.half + 0.02)), Y(sl.ap[1] + 0.02));
        g.lineTo(X(sx * (m.half - 0.05)), Y(sl.ap[1] - 0.02));
        g.lineTo(X(sx * (S.hemHalf - 0.045)), Y(m.yBody - 0.01));
        g.lineTo(X(sx * (S.hemHalf + 0.02)), Y(m.yBody - 0.01));
        g.closePath();
        g.fill();
        // sleeve band near the opening
        const ax = sl.axis;
        const a = [sl.c1[0] - ax[0] * 0.035, sl.c1[1] - ax[1] * 0.035], b = [sl.c2[0] - ax[0] * 0.035, sl.c2[1] - ax[1] * 0.035];
        g.beginPath();
        g.moveTo(X(sx * a[0]), Y(a[1]));
        g.lineTo(X(sx * (a[0] + ax[0] * 0.06)), Y(a[1] + ax[1] * 0.06));
        g.lineTo(X(sx * (b[0] + ax[0] * 0.06)), Y(b[1] + ax[1] * 0.06));
        g.lineTo(X(sx * b[0]), Y(b[1]));
        g.closePath();
        g.fill();
      }
      g.restore();
    }
    // varsity: the leather sleeves are the trim region (raglan-free set-in sleeves)
    if (st.shape === 'varsity') {
      const { g, X, Y } = trim;
      g.save();
      g.fillStyle = '#fff';
      for (const sx of [1, -1]) {
        g.beginPath();
        g.moveTo(X(sx * (sl.sp[0] - 0.01)), Y(sl.sp[1] + 0.05));
        for (let i = 0; i <= 12; i++) {
          const t = i / 12;
          const x = mix(sl.sp[0], sl.ap[0], t) - Math.sin(Math.PI * t) * 0.018;
          g.lineTo(X(sx * x), Y(mix(sl.sp[1], sl.ap[1], t)));
        }
        g.lineTo(X(sx * (sl.ap[0] + 0.0)), Y(sl.c2[1] - 0.1));
        g.lineTo(X(sx * 0.6), Y(sl.c2[1] - 0.1));
        g.lineTo(X(sx * 0.6), Y(sl.sp[1] + 0.05));
        g.closePath();
        g.fill();
      }
      g.restore();
      if (side > 0) {
        // centre front opening: placket groove
        seam(rel, null, [[0, m.yH - S.frontDrop], [0, m.yBody]], 0.004);
      }
    }
  }
  // the woven label (front half corner): « ruelle » + a line
  const lab = L.front.ink;
  const r = LABEL_RECT;
  text(lab, 'ruelle', (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2 + 0.004, 0.016, '400 # "Lilita One"');
  text(lab, 'MARSEILLE', (r.x0 + r.x1) / 2, r.y0 + 0.008, 0.0055, '800 # "Inter Tight"', { spacing: 0.001 });
}

export function buildAtlas(product, st, m, outline, quality) {
  const half = quality === 'low' ? 512 : quality === 'medium' ? 768 : 1024;
  const W = half * 2, H = half;
  const cv = canvases(W, H);
  for (const [k, l] of Object.entries({ ink: cv.ink, trim: cv.trim, rel: cv.rel, wear: cv.wear })) {
    l.g.setTransform(1, 0, 0, 1, 0, 0);
    l.g.filter = 'none';
    l.g.globalAlpha = 1;
    l.g.fillStyle = k === 'rel' ? 'rgb(128,128,128)' : '#000';
    l.g.fillRect(0, 0, W, H);
  }
  const L = {
    front: { ink: painter(cv.ink, 1, half), trim: painter(cv.trim, 1, half), rel: painter(cv.rel, 1, half), wear: painter(cv.wear, 1, half) },
    back: { ink: painter(cv.ink, -1, half), trim: painter(cv.trim, -1, half), rel: painter(cv.rel, -1, half), wear: painter(cv.wear, -1, half) },
  };
  construction(L, m, st, outline);
  (DESIGNS[product.id] || (() => {}))(L, m);
  // pack the four grey layers into RGBA, rows flipped (texture v goes up)
  // the trim layer is only drawn for the varsity and the jersey: skip its read-back otherwise
  const hasTrim = st.shape === 'jersey' || st.shape === 'varsity';
  const a = cv.ink.g.getImageData(0, 0, W, H).data, b = hasTrim ? cv.trim.g.getImageData(0, 0, W, H).data : null;
  const c = cv.rel.g.getImageData(0, 0, W, H).data, d = cv.wear.g.getImageData(0, 0, W, H).data;
  const out = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const src = y * W * 4, dst = (H - 1 - y) * W * 4;
    for (let x = 0; x < W * 4; x += 4) {
      out[dst + x] = a[src + x];
      out[dst + x + 1] = b ? b[src + x] : 0;
      out[dst + x + 2] = c[src + x];
      out[dst + x + 3] = d[src + x];
    }
  }
  const t = new THREE.DataTexture(out, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.NoColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
}
