// Port module: canvas textures (stencils and decals), drawn with the page fonts.
// Container atlas convention (see container.js): a cell is [side art | door art]; the side art
// covers u 0..0.75 (the whole long side, left end at u 0 as seen from outside), the door art
// u 0.75..1 (door end seen from behind, left door first); v = height / container height.
import * as THREE from 'three';
import { MARKINGS } from '../../texts.js';

export async function loadFonts() {
  if (typeof document === 'undefined' || !document.fonts) return;
  const want = [
    '900 100px "Big Shoulders Stencil Display"',
    '700 100px "Big Shoulders Stencil Display"',
    '800 100px "Big Shoulders Display"',
    '700 100px "JetBrains Mono"',
    '500 100px "JetBrains Mono"',
    '700 100px "Inter Tight"',
  ];
  try {
    await Promise.all(want.map((f) => document.fonts.load(f)));
  } catch (e) {
    /* fonts missing: canvas falls back to system fonts */
  }
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function tex(c, { srgb = true, aniso = 8, mips = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  t.generateMipmaps = mips;
  t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

// draw in metres on a region: returns a ctx transformed so that 1 unit = 1 m, origin at the
// region's top-left, y down
function region(g, x0, y0, wpx, hpx, wm, hm) {
  g.save();
  g.beginPath();
  g.rect(x0, y0, wpx, hpx);
  g.clip();
  g.translate(x0, y0);
  g.scale(wpx / wm, hpx / hm);
}

// the brand's wake mark: three curved parallel lines (fills the box w × h, in the current units)
export function wakeMark(g, x, y, w, h, color, lw) {
  g.save();
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.lineCap = 'butt';
  for (let i = 0; i < 3; i++) {
    const oy = y + h * (0.22 + i * 0.28);
    const sx = x + w * 0.08 * i; // the lines step back like a wake
    g.beginPath();
    g.moveTo(sx, oy + h * 0.2);
    g.bezierCurveTo(sx + w * 0.38, oy + h * 0.2, x + w * 0.5, oy - h * 0.2, x + w, oy - h * 0.2);
    g.stroke();
  }
  g.restore();
}

// text helpers in metre units: font size in metres, letter spacing in em
function text(g, s, x, y, size, { font = '700 {s}px "Inter Tight"', color = '#fff', align = 'left', base = 'alphabetic', spacing = 0, scaleX = 1 } = {}) {
  // the context is scaled to metres; draw at a big pixel size then scale down for crisp glyphs
  const k = 100;
  g.save();
  g.translate(x, y);
  g.scale((size / k) * scaleX, size / k);
  g.font = font.replace('{s}', String(k));
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = base;
  if (spacing) {
    try { g.letterSpacing = `${spacing * k}px`; } catch (e) { /* older canvas */ }
  }
  g.fillText(s, 0, 0);
  g.restore();
}

function boxedCode(g, code, x, y, size, color) {
  // owner code + serial with the check digit boxed (as real ISO markings do)
  const parts = code.split(' ');
  const main = parts.slice(0, 2).join(' ');
  const check = parts[2] || '';
  text(g, main, x, y, size, { color, font: '700 {s}px "Inter Tight"', spacing: 0.02 });
  // measure in metres
  g.save();
  g.font = '700 100px "Inter Tight"';
  const wm = (g.measureText(main + ' ').width / 100) * size * 1.02;
  g.restore();
  text(g, check, x + wm + size * 0.12, y, size, { color, font: '700 {s}px "Inter Tight"' });
  g.save();
  g.strokeStyle = color;
  g.lineWidth = size * 0.07;
  g.strokeRect(x + wm, y - size * 0.86, size * 0.82, size * 1.02);
  g.restore();
}

// the weights between the right door's locking bars: label over value, small
function weights(g, maxGross, tare, x, y, col) {
  const split = (s) => {
    const i = s.search(/\d/);
    return i > 0 ? [s.slice(0, i).trim(), s.slice(i).trim()] : [s, ''];
  };
  const [a1, a2] = split(maxGross);
  const [b1, b2] = split(tare);
  const o = { color: col, font: '700 {s}px "Inter Tight"' };
  text(g, a1, x, y, 0.058, o);
  text(g, a2, x, y + 0.075, 0.058, o);
  text(g, b1, x, y + 0.17, 0.058, o);
  text(g, b2, x, y + 0.245, 0.058, o);
}

// ---------------------------------------------------------------- hero container (2048 × 1024, 1 cell)
export function heroAtlas() {
  const W = 2048;
  const H = 1024;
  const c = canvas(W, H);
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  const L = 12.192;
  const CH = 2.896;
  const white = '#f4f2ec';
  const M = MARKINGS.heroContainer;
  // long side (u 0..0.75)
  region(g, 0, 0, W * 0.75, H, L, CH);
  // big stencil word, its wake mark at the left
  wakeMark(g, 0.95, 0.78, 1.8, 1.3, white, 0.17);
  text(g, M.brand, 3.0, 2.06, 1.42, { font: '900 {s}px "Big Shoulders Stencil Display"', color: white, spacing: 0.04 });
  // code (top right, near the door end), type below
  boxedCode(g, M.code, 10.3, 0.4, 0.17, white);
  text(g, M.type, 10.3, 0.64, 0.15, { color: white, font: '700 {s}px "Inter Tight"' });
  // small plates and placards (blank, technical)
  g.fillStyle = 'rgba(240,238,232,0.92)';
  g.fillRect(11.25, 1.7, 0.34, 0.22);
  g.fillStyle = 'rgba(25,25,25,0.75)';
  g.fillRect(0.55, 2.18, 0.28, 0.2);
  g.restore();
  // door end (u 0.75..1): left door = brand, right door = code and weights
  const W2 = 2.438;
  region(g, W * 0.75, 0, W * 0.25, H, W2, CH);
  // left door spans 0..1.219 m
  wakeMark(g, 0.18, 0.5, 0.5, 0.36, white, 0.05);
  text(g, M.brand, 0.18, 1.18, 0.3, { font: '900 {s}px "Big Shoulders Stencil Display"', color: white, spacing: 0.03 });
  // right door
  boxedCode(g, M.code, 1.36, 0.42, 0.12, white);
  text(g, M.type, 1.36, 0.62, 0.11, { color: white });
  weights(g, M.maxGross, M.tare, 1.6, 1.45, white);
  // CSC plate (left door, low)
  g.fillStyle = 'rgba(200,204,206,0.95)';
  g.fillRect(0.2, 1.95, 0.3, 0.2);
  g.restore();
  return tex(c);
}

// ---------------------------------------------------------------- generic containers (2048 × 2048, 4 cells)
// variants 0-2: white stencils (dark boxes), variant 3: dark stencils (light boxes)
export function genericAtlas() {
  const W = 2048;
  const cellH = 512;
  const c = canvas(W, cellH * 4);
  const g = c.getContext('2d');
  const types = MARKINGS.genericTypes;
  const L = 12.192;
  const CH = 2.896;
  const W2 = 2.438;
  const wts = [
    ['MAX. GROSS 30 480 KG', 'TARE 3 750 KG'],
    ['MAX. GROSS 32 500 KG', 'TARE 3 940 KG'],
    ['MAX. GROSS 30 480 KG', 'TARE 2 230 KG'],
    ['MAX. GROSS 32 500 KG', 'TARE 3 820 KG'],
  ];
  for (let v = 0; v < 4; v++) {
    const col = v === 3 ? '#2a2c2e' : '#ecebe6';
    const y0 = v * cellH;
    region(g, 0, y0, W * 0.75, cellH, L, CH);
    text(g, types[v % types.length], 10.55, 0.5, 0.16, { color: col, font: '700 {s}px "Inter Tight"' });
    // a blank placard frame and a small label
    g.strokeStyle = col;
    g.lineWidth = 0.025;
    if (v !== 1) g.strokeRect(10.2 - v * 0.6, 1.25, 0.32, 0.32);
    g.fillStyle = v === 3 ? 'rgba(40,40,40,0.55)' : 'rgba(236,235,230,0.8)';
    g.fillRect(0.45 + v * 0.3, 0.32, 0.24, 0.12);
    g.restore();
    region(g, W * 0.75, y0, W * 0.25, cellH, W2, CH);
    text(g, types[v % types.length], 1.36, 0.55, 0.12, { color: col });
    weights(g, wts[v][0], wts[v][1], 1.6, 1.45, col);
    g.fillStyle = 'rgba(200,204,206,0.9)';
    g.fillRect(0.2, 1.95, 0.3, 0.2);
    g.restore();
  }
  return tex(c);
}

// ---------------------------------------------------------------- cavalier decal (512 × 256)
// plate « SILLAGE » (u 0..1, v 0.5..1) and a hazard band (v 0..0.5)
export function carrierDecal() {
  const c = canvas(512, 256);
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 256);
  // plate: ink background, white stencil, orange mark
  g.fillStyle = '#14181d';
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#f2f1ec';
  g.font = '900 92px "Big Shoulders Stencil Display"';
  g.textBaseline = 'middle';
  try { g.letterSpacing = '4px'; } catch (e) { /* */ }
  g.fillText(MARKINGS.truckDoor, 118, 68);
  wakeMark(g, 22, 22, 80, 80, '#ff5a1f', 10);
  // hazard band (yellow/black diagonal) for the spreader ends and step edges
  g.save();
  g.beginPath();
  g.rect(0, 128, 512, 128);
  g.clip();
  g.fillStyle = '#f2b81b';
  g.fillRect(0, 128, 512, 128);
  g.fillStyle = '#16181a';
  for (let x = -256; x < 600; x += 64) {
    g.beginPath();
    g.moveTo(x, 256);
    g.lineTo(x + 32, 256);
    g.lineTo(x + 160, 128);
    g.lineTo(x + 128, 128);
    g.fill();
  }
  g.restore();
  return tex(c);
}

// ---------------------------------------------------------------- truck cab decal (1024 × 512)
// the cab side: u 0..1 = cab length (rear → front), v 0..1 = height 0..4 m. An orange band low on
// the door with « SILLAGE » above it; the roof deflector band uses v 0.95..1
export function truckDecal() {
  const W = 1024;
  const H = 512;
  const c = canvas(W, H);
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  // metres: cab side 2.3 m long (rear edge → front), 4 m tall (canvas y = 4 − height)
  region(g, 0, 0, W, H, 2.3, 4);
  const o = '#ff5a1f';
  // orange stripe low on the door, rising toward the front, with a dark pinstripe under it
  const band = (h0, h1, k0, k1, col) => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, 4 - h1);
    g.lineTo(2.3, 4 - h1 - k1);
    g.lineTo(2.3, 4 - h0 - k0);
    g.lineTo(0, 4 - h0);
    g.closePath();
    g.fill();
  };
  band(1.2, 1.36, 0.12, 0.12, o);
  band(1.15, 1.18, 0.12, 0.12, '#16191d');
  // brand on the door
  wakeMark(g, 0.3, 4 - 1.92, 0.3, 0.27, o, 0.042);
  text(g, MARKINGS.truckDoor, 0.68, 4 - 1.6, 0.31, { font: '900 {s}px "Big Shoulders Stencil Display"', color: '#15191e', spacing: 0.03 });
  g.restore();
  return tex(c);
}

// ---------------------------------------------------------------- the yard markings (2048 × 1536)
// returns { texture, bounds: [minX, minZ, maxX, maxZ] }: white lines, numbers, arrows; alpha =
// paint coverage (shown only from above)
export function yardMarkings(yard, rows, lanes) {
  const W = 2048;
  const H = 1536;
  const c = canvas(W, H);
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  const [x0, z0, x1, z1] = [yard.minX, yard.minZ, yard.maxX, yard.maxZ];
  g.save();
  g.scale(W / (x1 - x0), H / (z1 - z0));
  g.translate(-x0, -z0);
  const white = 'rgba(250,250,247,0.95)';
  const yellow = 'rgba(244,192,38,0.95)';
  // container slots: corner marks and outlines for every row
  g.strokeStyle = white;
  g.lineWidth = 0.14;
  rows.forEach((r, ri) => {
    for (let s = 0; s < r.slots; s++) {
      const cx = r.x0 + s * r.pitch + r.pitch / 2;
      g.strokeRect(cx - 6.25, r.z - 1.38, 12.5, 2.76);
    }
    // row number at the west end
    g.save();
    g.translate(r.x0 - 2.2, r.z);
    g.rotate(-Math.PI / 2);
    g.fillStyle = white;
    g.font = '700 1.6px "JetBrains Mono"';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(ri + 1).padStart(2, '0'), 0, 0);
    g.restore();
  });
  // bay letters along the north edge of each block
  const letters = 'ABCDEFGHJKLM';
  const blocks = [...new Set(rows.map((r) => r.block))];
  blocks.forEach((b) => {
    const rs = rows.filter((r) => r.block === b);
    const zTop = Math.min(...rs.map((r) => r.z)) - 2.6;
    const r0 = rs[0];
    for (let s = 0; s < r0.slots; s++) {
      g.fillStyle = white;
      g.font = '700 1.3px "JetBrains Mono"';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(letters[s % letters.length], r0.x0 + s * r0.pitch + r0.pitch / 2, zTop);
    }
  });
  // lanes: edge lines, dashed centre lines, arrows
  for (const ln of lanes) {
    g.strokeStyle = ln.color === 'yellow' ? yellow : white;
    g.lineWidth = 0.15;
    g.setLineDash([]);
    g.beginPath();
    g.moveTo(ln.x0, ln.z - ln.w / 2);
    g.lineTo(ln.x1, ln.z - ln.w / 2);
    g.moveTo(ln.x0, ln.z + ln.w / 2);
    g.lineTo(ln.x1, ln.z + ln.w / 2);
    g.stroke();
    if (ln.dash) {
      g.setLineDash([3, 3]);
      g.beginPath();
      g.moveTo(ln.x0, ln.z);
      g.lineTo(ln.x1, ln.z);
      g.stroke();
      g.setLineDash([]);
    }
    // arrows
    g.fillStyle = white;
    for (const ax of ln.arrows || []) {
      const dir = ln.dir || 1;
      const zA = ln.dash ? ln.z + (ln.w / 4) * dir : ln.z;
      g.save();
      g.translate(ax, zA);
      g.scale(dir, 1);
      g.beginPath();
      g.moveTo(-2.6, -0.18);
      g.lineTo(0.6, -0.18);
      g.lineTo(0.6, -0.6);
      g.lineTo(2.2, 0);
      g.lineTo(0.6, 0.6);
      g.lineTo(0.6, 0.18);
      g.lineTo(-2.6, 0.18);
      g.closePath();
      g.fill();
      g.restore();
    }
  }
  // hatched safety zones (yellow diagonal stripes in a frame)
  const hatch = (x, z, w, h) => {
    g.save();
    g.beginPath();
    g.rect(x, z, w, h);
    g.clip();
    g.strokeStyle = yellow;
    g.lineWidth = 0.22;
    for (let k = -h; k < w + h; k += 0.9) {
      g.beginPath();
      g.moveTo(x + k, z);
      g.lineTo(x + k + h, z + h);
      g.stroke();
    }
    g.restore();
    g.strokeStyle = yellow;
    g.lineWidth = 0.18;
    g.strokeRect(x, z, w, h);
  };
  hatch(-12.5, 6.2, 7, 3.4);
  hatch(52, -10.8, 9, 3.2);
  hatch(-60, 8, 8, 3);
  // the gate: a stop line across the truck lane
  g.strokeStyle = white;
  g.lineWidth = 0.4;
  g.beginPath();
  g.moveTo(66, -3.6);
  g.lineTo(66, 3.6);
  g.stroke();
  g.restore();
  const t = tex(c, { aniso: 8 });
  return { texture: t, bounds: [x0, z0, x1, z1] };
}
