// BALANCIER watch: canvas textures drawn at load (no image is fetched): dial print, sunburst lines,
// ceramic bezel scale, caseback engraving, rotor engraving, perlage, Côtes de Genève.
import * as THREE from 'three';
import { WATCH_PRINT } from '../../texts.js';
import { COLORS } from '../layout.js';

const TAU = Math.PI * 2;

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

let fontsReady = null;
export function loadFonts() {
  if (!fontsReady) {
    fontsReady = (async () => {
      if (!document.fonts || !document.fonts.load) return;
      try {
        await Promise.all([
          document.fonts.load('600 64px "Cormorant SC"'),
          document.fonts.load('500 64px "Cormorant SC"'),
          document.fonts.load('400 64px "JetBrains Mono"'),
          document.fonts.load('500 64px "JetBrains Mono"'),
        ]);
      } catch (e) { /* fall back to the default serif / monospace */ }
    })();
  }
  return fontsReady;
}

function tex(c, { srgb = true, repeat = false, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

// letter-spaced text along a straight line, centred at (x, y)
function spacedText(ctx, text, x, y, spacing) {
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cx = x - total / 2;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cx + widths[i] / 2, y);
    cx += widths[i] + spacing;
  }
}

// text along a circle (centre cx, cy; radius r in px), centred on angle a (canvas angle, 0 = +x, clockwise
// positive since canvas y points down). outward: letters' tops point away from the centre.
function arcText(ctx, text, cx, cy, r, a, spacing, outward = true) {
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((s, w) => s + w, 0) + spacing * (chars.length - 1);
  const dir = outward ? 1 : -1;
  let ang = a - (dir * total) / 2 / r;
  for (let i = 0; i < chars.length; i++) {
    const w = widths[i];
    const am = ang + (dir * w) / 2 / r;
    ctx.save();
    ctx.translate(cx + r * Math.cos(am), cy + r * Math.sin(am));
    ctx.rotate(am + (outward ? Math.PI / 2 : -Math.PI / 2));
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
    ang += (dir * (w + spacing)) / r;
  }
}

// the printed layer of the dial (white ink on transparent), uv: u = x / D + 0.5, v = y / D + 0.5
export function dialPrintTexture(size, D) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const k = size / D; // px per mm
  const X = (x) => size / 2 + x * k, Y = (y) => size / 2 - y * k;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#f6f4ee';
  ctx.strokeStyle = '#f6f4ee';
  // minute track: a fine circle and 60 ticks between r 14.3 and 15.15
  ctx.lineWidth = 0.07 * k;
  ctx.beginPath(); ctx.arc(X(0), Y(0), 14.35 * k, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(X(0), Y(0), 15.15 * k, 0, TAU); ctx.globalAlpha = 0.55; ctx.stroke(); ctx.globalAlpha = 1;
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * TAU;
    const five = i % 5 === 0;
    const r0 = 14.35, r1 = five ? 15.15 : 14.95;
    ctx.lineWidth = (five ? 0.2 : 0.09) * k;
    ctx.beginPath();
    ctx.moveTo(X(r0 * Math.sin(a)), Y(r0 * Math.cos(a)));
    ctx.lineTo(X(r1 * Math.sin(a)), Y(r1 * Math.cos(a)));
    ctx.stroke();
  }
  // quarter-second divisions between the minutes (a fine railway: our seconds hand ticks 8 times a second)
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 0.035 * k;
  for (let i = 0; i < 240; i++) {
    if (i % 4 === 0) continue;
    const a = (i / 240) * TAU;
    ctx.beginPath();
    ctx.moveTo(X(14.35 * Math.sin(a)), Y(14.35 * Math.cos(a)));
    ctx.lineTo(X(14.62 * Math.sin(a)), Y(14.62 * Math.cos(a)));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // the balance wheel mark above the brand: a thin ring with four arms and a tiny spiral hint
  const mx = X(0), my = Y(9.35), mr = 0.62 * k;
  ctx.lineWidth = 0.09 * k;
  ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.stroke();
  ctx.lineWidth = 0.06 * k;
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + mr * Math.cos(a), my + mr * Math.sin(a)); ctx.stroke();
  }
  ctx.lineWidth = 0.035 * k;
  ctx.beginPath();
  for (let i = 0; i <= 60; i++) { const a = (i / 60) * TAU * 1.6, r = (0.1 + 0.28 * (i / 60)) * k; const fn = i ? 'lineTo' : 'moveTo'; ctx[fn](mx + r * Math.cos(a), my + r * Math.sin(a)); }
  ctx.stroke();
  // brand under 12
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${1.55 * k}px "Cormorant SC", "Times New Roman", serif`;
  spacedText(ctx, WATCH_PRINT.dial[0], X(0), Y(6.95), 0.32 * k);
  // city and AUTOMATIQUE above 6
  ctx.font = `500 ${0.92 * k}px "Cormorant SC", "Times New Roman", serif`;
  spacedText(ctx, WATCH_PRINT.dial[1], X(0), Y(-6.05), 0.2 * k);
  ctx.font = `400 ${0.5 * k}px "JetBrains Mono", monospace`;
  spacedText(ctx, WATCH_PRINT.dialSmall, X(0), Y(-7.35), 0.12 * k);
  // the ruby dot of the brand, very small, between the two lines above 6
  ctx.fillStyle = COLORS.ruby;
  ctx.beginPath(); ctx.arc(X(0), Y(-8.25), 0.16 * k, 0, TAU); ctx.fill();
  return tex(c, { srgb: true, aniso: 16 });
}

// sunburst: fine radial lines (a tiling strip, u = angle) as a normal map + a roughness variation
export function sunburstNormal(width) {
  const h = 4;
  const c = canvas(width, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(width, h);
  const height = new Float32Array(width);
  let seed = 12345;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < width; i++) height[i] = rnd() * 0.6 + 0.4 * Math.sin(i * 0.9 + rnd());
  for (let i = 0; i < width; i++) {
    const d = (height[(i + 1) % width] - height[(i - 1 + width) % width]) * 0.35;
    const nx = -d, nz = 1;
    const l = Math.hypot(nx, nz);
    for (let j = 0; j < h; j++) {
      const o = (j * width + i) * 4;
      img.data[o] = Math.round(((nx / l) * 0.5 + 0.5) * 255);
      img.data[o + 1] = 128;
      img.data[o + 2] = Math.round(((nz / l) * 0.5 + 0.5) * 255);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = tex(c, { srgb: false, repeat: true, aniso: 16 });
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// ceramic bezel insert: 60-minute dive scale, engraved and filled slightly lighter. uv = xy / D + 0.5.
// returns { map, bump, rough }
export function bezelTextures(size, D, rIn, rOut) {
  const mk = () => { const c = canvas(size); return [c, c.getContext('2d')]; };
  const [cm, m] = mk(), [cb, b] = mk(), [cr, rg] = mk();
  const k = size / D;
  const X = (x) => size / 2 + x * k, Y = (y) => size / 2 - y * k;
  m.fillStyle = '#15327a'; m.fillRect(0, 0, size, size);
  b.fillStyle = '#ffffff'; b.fillRect(0, 0, size, size);
  rg.fillStyle = '#2a2a2a'; rg.fillRect(0, 0, size, size); // glossy ceramic
  const ink = (ctx, which) => {
    if (which === 'm') ctx.fillStyle = ctx.strokeStyle = '#b7c3df';
    else if (which === 'b') ctx.fillStyle = ctx.strokeStyle = '#000000';
    else ctx.fillStyle = ctx.strokeStyle = '#a0a0a0';
  };
  const mid = (rIn + rOut) / 2;
  const draw = (ctx, which) => {
    ink(ctx, which);
    ctx.lineCap = 'butt';
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU;
      if (i === 0) {
        // the 12 o'clock triangle (the lume pip sits in its centre)
        const r0 = rIn + 0.35, r1 = rOut - 0.25, hw = 1.15;
        ctx.beginPath();
        ctx.moveTo(X(0), Y(r0));
        ctx.lineTo(X(-hw), Y(r1));
        ctx.lineTo(X(hw), Y(r1));
        ctx.closePath();
        ctx.fill();
        continue;
      }
      if (i % 10 === 0) {
        // numerals 10 … 50, upright towards the centre
        ctx.save();
        ctx.translate(X(mid * Math.sin(a)), Y(mid * Math.cos(a)));
        ctx.rotate(a);
        ctx.font = `500 ${1.75 * k}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i), 0, 0.05 * k);
        ctx.restore();
        continue;
      }
      const five = i % 5 === 0;
      const first = i < 15;
      if (!five && !first) continue;
      const r0 = five ? rIn + 0.55 : rOut - 1.25, r1 = rOut - 0.3;
      ctx.lineWidth = (five ? 0.62 : 0.2) * k;
      ctx.beginPath();
      ctx.moveTo(X(r0 * Math.sin(a)), Y(r0 * Math.cos(a)));
      ctx.lineTo(X(r1 * Math.sin(a)), Y(r1 * Math.cos(a)));
      ctx.stroke();
    }
  };
  draw(m, 'm'); draw(b, 'b'); draw(rg, 'r');
  // soften the bump edges a little, then pack: R = bump height (bumpMap reads .x), G = roughness (.g)
  const bump = canvas(size); const bctx = bump.getContext('2d');
  bctx.filter = `blur(${Math.max(1, size / 1024)}px)`;
  bctx.drawImage(cb, 0, 0);
  const bd = bctx.getImageData(0, 0, size, size), rd = rg.getImageData(0, 0, size, size);
  for (let i = 0; i < bd.data.length; i += 4) { bd.data[i + 1] = rd.data[i + 1]; bd.data[i + 2] = 0; }
  const packed = canvas(size);
  packed.getContext('2d').putImageData(bd, 0, 0);
  const br = tex(packed, { srgb: false });
  return { map: tex(cm, { srgb: true, aniso: 16 }), bump: br, rough: br };
}

// caseback ring engraving, read from the back (mirrored in x). uv = (-x) / D + 0.5, y / D + 0.5
export function casebackTextures(size, D, rText) {
  const c = canvas(size), ctx = c.getContext('2d');
  const k = size / D;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = size / 2, cy = size / 2;
  ctx.font = `500 ${1.05 * k}px "JetBrains Mono", monospace`;
  // canvas angle: -90° is the top (12), +90° the bottom (6)
  arcText(ctx, WATCH_PRINT.caseback[0], cx, cy, rText * k, -Math.PI / 2, 0.32 * k, true);
  arcText(ctx, WATCH_PRINT.caseback[1], cx, cy, rText * k, Math.PI / 2, 0.32 * k, false);
  // two fine engraved circles framing the text
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 0.08 * k;
  for (const r of [rText - 1.15, rText + 1.15]) { ctx.beginPath(); ctx.arc(cx, cy, r * k, 0, TAU); ctx.stroke(); }
  // small balance marks at 3 and 9
  for (const s of [-1, 1]) {
    const x = cx + s * rText * k, y = cy, r = 0.55 * k;
    ctx.lineWidth = 0.09 * k;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + (i * Math.PI) / 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); ctx.stroke(); }
  }
  const bumpC = canvas(size); const bctx = bumpC.getContext('2d');
  bctx.filter = `blur(${Math.max(1, size / 1024)}px)`;
  bctx.drawImage(c, 0, 0);
  // color: engraved letters a little darker
  const colC = canvas(size); const cc = colC.getContext('2d');
  cc.fillStyle = '#ffffff'; cc.fillRect(0, 0, size, size);
  cc.globalAlpha = 0.55; cc.drawImage(c, 0, 0); cc.globalAlpha = 1;
  return { map: tex(colC, { srgb: true, aniso: 16 }), bump: tex(bumpC, { srgb: false }) };
}

// rotor: « BALANCIER » engraved along the rim (read from the back), gold-filled. uv = (-x)/D + 0.5, y/D + 0.5
export function rotorTextures(size, D, rText) {
  const c = canvas(size), ctx = c.getContext('2d');
  const k = size / D;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${1.5 * k}px "Cormorant SC", "Times New Roman", serif`;
  arcText(ctx, WATCH_PRINT.rotor, size / 2, size / 2, rText * k, -Math.PI / 2, 0.55 * k, true);
  const bumpC = canvas(size); const bctx = bumpC.getContext('2d');
  bctx.filter = `blur(${Math.max(1, size / 1024)}px)`;
  bctx.drawImage(c, 0, 0);
  // the engraved letters a little darker (the map multiplies the gilt colour)
  const gold = canvas(size); const gc = gold.getContext('2d');
  gc.fillStyle = '#ffffff'; gc.fillRect(0, 0, size, size);
  gc.globalAlpha = 0.6; gc.drawImage(c, 0, 0); gc.globalAlpha = 1;
  return { map: tex(gold, { srgb: true, aniso: 16 }), bump: tex(bumpC, { srgb: false }) };
}

// height field → tangent-space normal map
function normalFromHeight(hgt, w, h, strength, wrap = true) {
  const c = canvas(w, h), ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const at = (x, y) => {
    if (wrap) { x = (x + w) % w; y = (y + h) % h; } else { x = Math.max(0, Math.min(w - 1, x)); y = Math.max(0, Math.min(h - 1, y)); }
    return hgt[y * w + x];
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      // canvas y down, texture v up: flip dy
      let nx = -dx, ny = dy, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      const o = (y * w + x) * 4;
      img.data[o] = ((nx / l) * 0.5 + 0.5) * 255;
      img.data[o + 1] = ((ny / l) * 0.5 + 0.5) * 255;
      img.data[o + 2] = ((nz / l) * 0.5 + 0.5) * 255;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// perlage (circular graining): overlapping small circles, each with fine concentric ridges.
// returns a tiling normal map; tile = `tileMM` mm (set texture.repeat from the uv scale)
export function perlageNormal(size, grainsAcross = 9) {
  const w = size, h = size;
  const hgt = new Float32Array(w * h).fill(0.5);
  const R = (w / grainsAcross) * 0.62;
  const step = w / grainsAcross;
  let seed = 777;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let gy = 0; gy < grainsAcross * 1.5; gy++) {
    for (let gx = 0; gx < grainsAcross; gx++) {
      const cx = (gx + (gy % 2) * 0.5) * step, cy = gy * step * 0.6667;
      const ph = rnd() * TAU;
      for (let y = Math.floor(cy - R); y <= cy + R; y++) {
        for (let x = Math.floor(cx - R); x <= cx + R; x++) {
          const dx = x - cx, dy = y - cy;
          const d = Math.hypot(dx, dy);
          if (d > R) continue;
          const t = d / R;
          const th = Math.atan2(dy, dx);
          // a soft dome per grain (shading on one side) + fine radial brush lines, overlapping the previous grains
          const val = 0.7 * Math.pow(1 - t, 0.9) + 0.035 * Math.sin(th * 46 + ph) * t + 0.02 * Math.sin(t * 40 + ph);
          const xx = ((x % w) + w) % w, yy = ((y % h) + h) % h;
          hgt[yy * w + xx] = val;
        }
      }
    }
  }
  const t = tex(normalFromHeight(hgt, w, h, 1.6, true), { srgb: false, repeat: true });
  return t;
}

// Côtes de Genève: parallel rounded stripes (with the faint arcs of the wheel that cut them)
export function cotesNormal(size, stripes = 12) {
  const w = size, h = size;
  const hgt = new Float32Array(w * h);
  const sw = w / stripes;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const f = (x % sw) / sw; // 0..1 across the stripe
      const d = (f - 0.5) * 2;
      // each stripe a shallow convex band (the wheel's cut), a crisp line between stripes
      hgt[y * w + x] = 1 - d * d * 0.9;
    }
  }
  return tex(normalFromHeight(hgt, w, h, 5.0, true), { srgb: false, repeat: true });
}
