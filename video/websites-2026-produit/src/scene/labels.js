// Printed artwork painted on canvas at load time (no image files): the wrap labels of the two
// shots and the lid / band of the gum tin. Each design also paints a roughness / metalness map
// (G = roughness, B = metalness, three's convention) so the foil areas really are metallic.
// ARDEUR is a fictional brand: the fine print says so.
import * as THREE from 'three';
import { PALETTE as C } from './config.js';
import { mulberry32 } from './util.js';

const F = "'Inter Tight', ui-sans-serif, system-ui, sans-serif";
let ANISO = 8;
export function setLabelAnisotropy(a) {
  ANISO = a;
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function texture(cv, srgb = true) {
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ANISO;
  t.wrapS = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

// text with manual tracking (canvas letterSpacing is not everywhere yet)
function spaced(ctx, text, x, y, track, align = 'center') {
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((ch, i) => {
    ctx.fillText(ch, cx, y);
    cx += widths[i] + track;
  });
  ctx.textAlign = prev;
  return total;
}

function spacedWidth(ctx, text, track) {
  const chars = [...text];
  return chars.reduce((a, ch) => a + ctx.measureText(ch).width, 0) + track * (chars.length - 1);
}

// slanted (oblique) text: the label face is set in a heavy italic
function slanted(ctx, text, x, y, slant = 0.2, track = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1, 0, -slant, 1, 0, 0);
  spaced(ctx, text, 0, 0, track, 'center');
  ctx.restore();
}

// wraps a paragraph into lines of maxW, returns the y after the last line
function paragraph(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = w;
      y += lh;
    } else line = test;
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lh;
  }
  return y;
}

// paints the same drawing twice, at x and x - W: artwork centred on the seam wraps around
function wrapDraw(W, fn) {
  fn(0);
  fn(-W);
  fn(W);
}

function chili(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.5);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-s * 0.9, 0);
  ctx.bezierCurveTo(-s * 0.6, -s * 0.55, s * 0.6, -s * 0.5, s * 1.0, s * 0.05);
  ctx.bezierCurveTo(s * 0.4, s * 0.25, -s * 0.4, s * 0.45, -s * 0.9, 0);
  ctx.fill();
  ctx.fillStyle = C.teal;
  ctx.fillRect(-s * 1.15, -s * 0.12, s * 0.32, s * 0.2);
  ctx.restore();
}

// very faint paper grain: a few thousand light and dark specks (seeded, no image files)
function paperGrain(ctx, w, h, seed) {
  const rnd = mulberry32(seed);
  for (let i = 0; i < 9000; i++) {
    const x = rnd() * w, y = rnd() * h, s = 1 + rnd() * 2;
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(120,110,90,0.05)';
    ctx.fillRect(x, y, s, s);
  }
}

function barcode(ctx, x, y, w, h, seed) {
  const rnd = mulberry32(seed);
  let cx = x;
  ctx.fillStyle = C.ink;
  ctx.fillRect(cx, y, 3, h + 10);
  cx += 6;
  ctx.fillRect(cx, y, 3, h + 10);
  cx += 7;
  while (cx < x + w - 14) {
    const bw = 2 + Math.floor(rnd() * 4) * 2;
    if (rnd() > 0.42) ctx.fillRect(cx, y, bw, h);
    cx += bw + 2 + Math.floor(rnd() * 3) * 2;
  }
  ctx.fillRect(x + w - 9, y, 3, h + 10);
  ctx.fillRect(x + w - 3, y, 3, h + 10);
}

// ------------------------------------------------------------------ bottle label
// 2304 x 992 px wraps 12.0 x 5.1 cm: u = 0.5 (x = 1152) faces the camera at rest, the back
// (fine print) is centred on the seam (x = 0 / 2304).
const LW = 2304, LH = 992;

const VARIANTS = {
  gingembre: {
    band: C.teal,
    bandText: '#ffffff',
    name: 'GINGEMBRE',
    nameColor: C.teal,
    shotColor: C.orange,
    sub: 'CITRON · PIMENT',
    badge: { fill: C.yellow, text: C.tealDeep, word: 'PIQUANT', chili: C.orange },
    wave: C.orange,
    ingredients:
      'INGRÉDIENTS : jus de gingembre frais (60 %), jus de citron (30 %), eau, jus de pomme, piment de Cayenne (0,2 %).',
    num: 'N°01',
  },
  curcuma: {
    band: C.curcuma,
    bandText: C.tealDeep,
    name: 'CURCUMA',
    nameColor: C.tealDeep,
    shotColor: C.orangeDeep,
    sub: 'ORANGE · POIVRE NOIR',
    badge: { fill: C.teal, text: '#ffffff', word: 'DOUX', chili: C.curcuma, dots: true },
    wave: C.curcuma,
    ingredients:
      'INGRÉDIENTS : jus d’orange (55 %), jus de curcuma frais (25 %), jus de citron, gingembre (5 %), poivre noir.',
    num: 'N°02',
  },
};

export function bottleLabel(variant) {
  const v = VARIANTS[variant];
  const cv = canvas(LW, LH);
  const ctx = cv.getContext('2d');
  const rm = canvas(LW / 2, LH / 2);
  const r = rm.getContext('2d');
  r.scale(0.5, 0.5);
  // roughness / metalness: paper 0.56, inked areas a little smoother, foil metallic
  const rmPaper = 'rgb(0,143,0)';
  const rmInk = 'rgb(0,118,0)';
  const rmFoil = 'rgb(0,52,255)';
  r.fillStyle = rmPaper;
  r.fillRect(0, 0, LW, LH);

  // paper, with a very soft vertical tone so the white is not flat
  const g = ctx.createLinearGradient(0, 0, 0, LH);
  g.addColorStop(0, '#fdfcf8');
  g.addColorStop(1, '#f5f3ec');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LW, LH);
  paperGrain(ctx, LW, LH, variant === 'gingembre' ? 3 : 5);

  // colour bands (wrap all the way around)
  const topH = 232, botY = 836;
  ctx.fillStyle = v.band;
  ctx.fillRect(0, 0, LW, topH);
  ctx.fillRect(0, botY, LW, LH - botY);
  r.fillStyle = rmInk;
  r.fillRect(0, 0, LW, topH);
  r.fillRect(0, botY, LW, LH - botY);
  // silver foil line above the bottom band, orange hairline under the top one
  const foil = ctx.createLinearGradient(0, 0, LW, 0);
  for (let i = 0; i <= 12; i++) foil.addColorStop(i / 12, i % 2 ? '#c9ced2' : '#eef1f3');
  ctx.fillStyle = foil;
  ctx.fillRect(0, botY - 18, LW, 18);
  r.fillStyle = rmFoil;
  r.fillRect(0, botY - 18, LW, 18);
  ctx.fillStyle = C.orange;
  ctx.fillRect(0, topH, LW, 10);

  // a slow wave of colour all around the waist (gives the bottle colour from any side)
  const waveY = (x) => 700 + Math.sin((x / LW) * Math.PI * 4 + 0.8) * 26;
  ctx.fillStyle = v.wave;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(0, botY - 18);
  for (let x = 0; x <= LW; x += 16) ctx.lineTo(x, waveY(x) + 40);
  ctx.lineTo(LW, botY - 18);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  for (let x = 0; x <= LW; x += 16) ctx.lineTo(x, waveY(x) + 40);
  for (let x = LW; x >= 0; x -= 16) ctx.lineTo(x, waveY(x) + 47);
  ctx.closePath();
  ctx.fill();

  ctx.textBaseline = 'alphabetic';
  // ---- front (centred on x = 1152)
  const fx = LW / 2;
  ctx.fillStyle = v.bandText;
  ctx.font = `900 112px ${F}`;
  spaced(ctx, 'ARDEUR', fx, 160, 30);
  // spot gloss: the logo is varnished (smooth, roughness 0.2) on the satin paper
  r.fillStyle = 'rgb(0,51,0)';
  r.font = `900 112px ${F}`;
  r.textBaseline = 'alphabetic';
  spaced(r, 'ARDEUR', fx, 160, 30);
  ctx.font = `600 30px ${F}`;
  ctx.globalAlpha = 0.85;
  spaced(ctx, 'SHOTS · FAIT EN FRANCE', fx, 208, 10);
  ctx.globalAlpha = 1;

  ctx.fillStyle = v.shotColor;
  ctx.font = `800 64px ${F}`;
  spaced(ctx, 'SHOT', fx, 352, 30);
  // product name: heavy, slanted, fitted to the readable front third
  ctx.fillStyle = v.nameColor;
  let size = 168;
  ctx.font = `900 ${size}px ${F}`;
  while (spacedWidth(ctx, v.name, -2) > 660 && size > 90) {
    size -= 4;
    ctx.font = `900 ${size}px ${F}`;
  }
  slanted(ctx, v.name, fx, 352 + 24 + size * 0.74, 0.2, -2);
  const subY = 352 + 24 + size * 0.74 + 74;
  ctx.fillStyle = C.inkSoft;
  ctx.font = `600 38px ${F}`;
  spaced(ctx, v.sub, fx, subY, 12);

  // 60 ml in the bottom band, then the strapline: measured and set as one centred group
  ctx.fillStyle = v.bandText;
  ctx.font = `800 70px ${F}`;
  const w1 = spacedWidth(ctx, '60 ml', 2);
  ctx.font = `600 26px ${F}`;
  const w2 = spacedWidth(ctx, 'À BOIRE EN UNE GORGÉE', 6);
  const gx0 = fx - (w1 + 40 + w2) / 2;
  ctx.font = `800 70px ${F}`;
  spaced(ctx, '60 ml', gx0, 940, 2, 'left');
  ctx.font = `600 26px ${F}`;
  ctx.globalAlpha = 0.85;
  spaced(ctx, 'À BOIRE EN UNE GORGÉE', gx0 + w1 + 40, 928, 6, 'left');
  ctx.globalAlpha = 1;

  // badge, overlapping the foil line on the right of the front
  const bx = fx + 262, by = 744, br = 86;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = v.badge.fill;
  ctx.beginPath();
  ctx.arc(bx, by, br, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = v.badge.text;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(bx, by, br - 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-0.2);
  ctx.fillStyle = v.badge.text;
  ctx.font = `800 27px ${F}`;
  spaced(ctx, v.badge.word, 0, -6, 4);
  for (let i = -1; i <= 1; i++) {
    if (v.badge.dots) {
      ctx.fillStyle = v.badge.chili;
      ctx.beginPath();
      ctx.arc(i * 26, 30, 7, 0, Math.PI * 2);
      ctx.fill();
    } else chili(ctx, i * 34, 30, 13, v.badge.chili);
  }
  ctx.restore();
  r.fillStyle = 'rgb(0,96,0)';
  r.beginPath();
  r.arc(bx, by, br, 0, Math.PI * 2);
  r.fill();

  // ---- sides: monogram number on the right, vertical strapline on the left
  ctx.save();
  ctx.font = `900 150px ${F}`;
  ctx.strokeStyle = v.nameColor;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.9;
  ctx.textAlign = 'center';
  ctx.strokeText(v.num, LW * 0.75 + 40, 470);
  ctx.globalAlpha = 1;
  ctx.restore();
  // centred in the white field between the orange hairline (y 242) and the colour wave
  // (its top is near y 725 at this x), with a clear margin at both ends
  ctx.save();
  const sx = LW * 0.25 - 30;
  const waveTop = waveY(sx) + 40;
  ctx.translate(sx, (topH + 10 + waveTop) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = v.nameColor;
  let ss = 32;
  ctx.font = `800 ${ss}px ${F}`;
  while (spacedWidth(ctx, 'SHOT AU ' + v.name, 8) > waveTop - topH - 10 - 44 && ss > 22) {
    ss -= 1;
    ctx.font = `800 ${ss}px ${F}`;
  }
  spaced(ctx, 'SHOT AU ' + v.name, 0, ss * 0.36, 8);
  ctx.restore();
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = v.shotColor;
    ctx.beginPath();
    ctx.arc(LW * 0.25 + 46, 330 + i * 46, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- back: fine print around the seam
  wrapDraw(LW, (ox) => {
    const x0 = ox - 330, w = 660;
    ctx.fillStyle = v.bandText;
    ctx.font = `800 54px ${F}`;
    spaced(ctx, 'ARDEUR', ox, 150, 16);
    ctx.textAlign = 'left';
    ctx.fillStyle = C.ink;
    ctx.font = `700 25px ${F}`;
    let y = paragraph(ctx, v.ingredients, x0, 304, w, 33);
    ctx.font = `500 23px ${F}`;
    y = paragraph(ctx, 'Bien agiter avant de boire. À conserver au frais, entre 0 et 4 °C. Après ouverture, à consommer dans les 48 h.', x0, y + 12, w, 31);
    y = paragraph(ctx, '60 ml · un shot, une gorgée. Pressé et mis en bouteille en France.', x0, y + 10, w, 31);
    ctx.font = `600 22px ${F}`;
    ctx.fillStyle = C.orangeDeep;
    // (no-break space after « Ce »: the sentence never starts at the end of a line)
    paragraph(ctx, 'ARDEUR est une marque fictive imaginée par LTNS° · ltns.fr. Ce flacon n’existe pas.', x0, y + 12, w, 30);
    barcode(ctx, ox + 70, 640, 250, 92, variant === 'gingembre' ? 7 : 11);
    ctx.fillStyle = C.ink;
    ctx.font = `500 20px ${F}`;
    ctx.fillText('LOT 26-11 · À CONSOMMER', x0, 676);
    ctx.fillText('DE PRÉFÉRENCE AVANT : VOIR BOUCHON', x0, 704);
    ctx.textAlign = 'center';
    ctx.fillStyle = v.bandText;
    ctx.font = `700 34px ${F}`;
    spaced(ctx, '60 ml', ox, 935, 2);
  });

  const map = texture(cv);
  const rmTex = texture(rm, false);
  return { map, rm: rmTex, canvas: cv };
}

// ---------------------------------------------------------------------- gum tin
export function tinLid() {
  const S = 1024;
  const cv = canvas(S, S);
  const ctx = cv.getContext('2d');
  const rm = canvas(S / 2, S / 2);
  const r = rm.getContext('2d');
  r.scale(0.5, 0.5);
  const cx = S / 2, cy = S / 2;
  ctx.fillStyle = '#f7f7f4';
  ctx.fillRect(0, 0, S, S);
  r.fillStyle = 'rgb(0,100,0)';
  r.fillRect(0, 0, S, S);

  // teal disc
  const g = ctx.createRadialGradient(cx - 120, cy - 160, 40, cx, cy, 500);
  g.addColorStop(0, C.tealHi);
  g.addColorStop(0.65, C.teal);
  g.addColorStop(1, C.tealDeep);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, 486, 0, Math.PI * 2);
  ctx.fill();
  // foil ring
  ctx.strokeStyle = '#e8ecee';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, 452, 0, Math.PI * 2);
  ctx.stroke();
  r.strokeStyle = 'rgb(0,50,255)';
  r.lineWidth = 12;
  r.beginPath();
  r.arc(cx, cy, 452, 0, Math.PI * 2);
  r.stroke();

  // citrus slices (top), slightly overlapping
  const slice = (x, y, rad, rind, flesh, rot) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = rind;
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6e4';
    ctx.beginPath();
    ctx.arc(0, 0, rad * 0.86, 0, Math.PI * 2);
    ctx.fill();
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + 0.06, a1 = ((i + 1) / n) * Math.PI * 2 - 0.06;
      ctx.fillStyle = flesh;
      ctx.beginPath();
      ctx.moveTo(Math.cos((a0 + a1) / 2) * rad * 0.1, Math.sin((a0 + a1) / 2) * rad * 0.1);
      ctx.arc(0, 0, rad * 0.78, a0, a1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };
  slice(cx - 150, cy - 225, 118, C.orangeDeep, C.orange, 0.2);
  slice(cx + 40, cy - 262, 104, '#d9a514', C.yellow, 0.9);
  slice(cx + 205, cy - 188, 86, '#7d9c1c', '#b9d13b', 0.4);

  // brand
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 124px ${F}`;
  ctx.textBaseline = 'alphabetic';
  spaced(ctx, 'ARDEUR', cx, cy + 92, 22);
  ctx.fillStyle = C.orange;
  ctx.fillRect(cx - 70, cy + 128, 140, 7);
  ctx.fillStyle = '#d7e7e5';
  ctx.font = `700 40px ${F}`;
  spaced(ctx, 'GOMMES AGRUMES', cx, cy + 200, 13);

  // text on an arc, bottom
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = `600 25px ${F}`;
  const arcText = '30 GOMMES · ORANGE · CITRON · YUZU · GINGEMBRE';
  const R = 398;
  const total = spacedWidth(ctx, arcText, 7);
  let a = Math.PI / 2 + total / R / 2;
  for (const ch of arcText) {
    const w = ctx.measureText(ch).width;
    ctx.save();
    ctx.translate(cx + Math.cos(a - w / R / 2) * R, cy + Math.sin(a - w / R / 2) * R);
    ctx.rotate(a - w / R / 2 - Math.PI / 2);
    ctx.fillText(ch, -w / 2, 0);
    ctx.restore();
    a -= (w + 7) / R;
  }
  const map = texture(cv);
  map.wrapS = THREE.ClampToEdgeWrapping;
  const rmTex = texture(rm, false);
  rmTex.wrapS = THREE.ClampToEdgeWrapping;
  return { map, rm: rmTex };
}

// band of print around the lid skirt (2048 x 112 px for 21.5 x 1.0 cm)
export function tinBand() {
  const W = 2048, H = 112;
  const cv = canvas(W, H);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f6f6f3';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.teal;
  ctx.fillRect(0, H - 16, W, 16);
  ctx.fillStyle = C.orange;
  ctx.fillRect(0, H - 22, W, 4);
  ctx.fillStyle = C.teal;
  ctx.font = `700 34px ${F}`;
  ctx.textBaseline = 'alphabetic';
  const unit = 'ARDEUR  ·  GOMMES AGRUMES  ·  ';
  const uw = spacedWidth(ctx, unit, 9);
  const n = Math.max(1, Math.round(W / uw));
  const track = 9 + (W / n - uw) / [...unit].length;
  for (let i = 0; i < n; i++) spaced(ctx, unit, (i * W) / n, 62, track, 'left');
  return { map: texture(cv) };
}
