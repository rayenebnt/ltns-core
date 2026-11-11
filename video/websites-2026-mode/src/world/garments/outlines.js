// Flat outlines of every garment type, seen from the front, in metres, in the garment frame:
// origin = hook tip (the swing pivot), y up, +x = wearer's left (viewer's right when facing +z).
// The shoulder line of each outline rests on the wooden hanger (hangerTopY), which is why the
// hanger constants live here too. Per-product looks (fit, fabric, wash) are in STYLES, keyed by
// the catalogue id, so catalog.js stays the single list of products.
import { clamp, mix, smooth, TAU } from './noise.js';

export const HOOK_H = 0.105; // hook tip -> top of the wooden bar at its centre
export const HANGER_HALF = 0.2; // half length of the bar
export const HANGER_DROP = 0.05; // the bar ends sit this much lower than the crown
export const BAR_H = 0.021; // bar height at the crown (it tapers to the ends)
export const BAR_D = 0.0112; // bar depth (z)

// top edge of the wooden bar: straight sloping arms, rounded crown
export function hangerTopY(x) {
  const u = Math.min(Math.abs(x) / HANGER_HALF, 1);
  const c = 0.012;
  const s = (Math.sqrt(u * u + c) - Math.sqrt(c)) / (Math.sqrt(1 + c) - Math.sqrt(c));
  return -HOOK_H - HANGER_DROP * s;
}

// shoulder line of a garment: rests on the bar, then falls more steeply past the bar ends
export function shoulderY(x, lift = 0.0105, fall = 0.42) {
  const ax = Math.abs(x);
  if (ax <= HANGER_HALF) return hangerTopY(ax) + lift;
  const over = ax - HANGER_HALF;
  return hangerTopY(HANGER_HALF) + lift - over * fall - over * over * 1.2;
}

// Per-product look. fit: shape key in SHAPES; fabric: normal map family; wash: garment-dyed
// mottling 0..1; thick: half thickness of the body pillow (m); sheen, rough: cotton look.
export const STYLES = {
  'manches-longues': { shape: 'longsleeve', fabric: 'jersey', wash: 0.15, thick: 0.0045, sheen: 0.55, rough: 0.86, seed: 3 },
  'rien-a-prouver': { shape: 'oversized', fabric: 'jersey', wash: 1, thick: 0.0055, sheen: 0.5, rough: 0.9, seed: 7, crack: 1 },
  debardeur: { shape: 'tank', fabric: 'jersey', wash: 0.85, thick: 0.004, sheen: 0.5, rough: 0.9, seed: 11, crack: 1 },
  teddy: { shape: 'varsity', fabric: 'melton', wash: 0, thick: 0.0095, sheen: 0.35, rough: 0.93, seed: 13, rib: 'stripes' },
  capuche: { shape: 'hoodie', fabric: 'fleece', wash: 0.05, thick: 0.0075, sheen: 0.7, rough: 0.94, seed: 17 },
  'hors-saison': { shape: 'tee', fabric: 'jersey', wash: 0.2, thick: 0.0038, sheen: 0.62, rough: 0.84, seed: 19 },
  maillot: { shape: 'jersey', fabric: 'mesh', wash: 0, thick: 0.004, sheen: 0.45, rough: 0.62, seed: 23, rib: 'trim' },
  logo: { shape: 'tee', fabric: 'jersey', wash: 0.1, thick: 0.0045, sheen: 0.55, rough: 0.87, seed: 29 },
};
export const styleOf = (product) => STYLES[product.id] || { shape: product.type === 'tee' ? 'tee' : product.type, fabric: 'jersey', wash: 0, thick: 0.0045, sheen: 0.55, rough: 0.87, seed: 31 };

// neck: half width at the HPS; backDrop/frontDrop: neckline depths; sp: shoulder point x;
// half/hemHalf: body half widths; length: HPS to hem; sleeve: kind and dimensions;
// band: height of a rib hem band (built separately), cuff: rib cuff length
export const SHAPES = {
  tee: { neck: 0.086, backDrop: 0.018, frontDrop: 0.082, sp: 0.226, half: 0.262, hemHalf: 0.268, length: 0.71, armDepth: 0.2, sleeve: { kind: 'short', angle: 40, len: 0.215, open: 0.15 } },
  // (integration look-dev: narrower, longer, with the sleeves falling at ~47°, as an oversized tee
  // really hangs on a hanger; the first version (sp 0.292, half 0.312, sleeves at 27°) read as a
  // tee laid flat, 1.28 wider than long, and crowded its neighbours on the rack)
  oversized: { neck: 0.092, backDrop: 0.02, frontDrop: 0.078, sp: 0.25, half: 0.27, hemHalf: 0.276, length: 0.76, armDepth: 0.23, fall: 0.55, sleeve: { kind: 'short', angle: 47, len: 0.205, open: 0.148 } },
  jersey: { neck: 0.092, backDrop: 0.02, frontDrop: 0.125, vneck: true, sp: 0.234, half: 0.272, hemHalf: 0.276, length: 0.72, armDepth: 0.21, sleeve: { kind: 'short', angle: 36, len: 0.22, open: 0.165 } },
  longsleeve: { neck: 0.086, backDrop: 0.018, frontDrop: 0.08, sp: 0.226, half: 0.258, hemHalf: 0.264, length: 0.71, sleeve: { kind: 'long', tilt: 15.5, len: 0.6, open: 0.092, apex: 0.27 } },
  hoodie: { neck: 0.1, backDrop: 0.02, frontDrop: 0.07, sp: 0.25, half: 0.29, hemHalf: 0.282, length: 0.69, band: 0.065, cuff: 0.065, fall: 0.5, sleeve: { kind: 'long', tilt: 13, len: 0.575, open: 0.11, apex: 0.3 } },
  varsity: { neck: 0.098, backDrop: 0.016, frontDrop: 0.06, sp: 0.248, half: 0.292, hemHalf: 0.28, length: 0.64, band: 0.06, cuff: 0.06, collar: 0.034, fall: 0.48, sleeve: { kind: 'long', tilt: 13.5, len: 0.565, open: 0.118, apex: 0.29 } },
  tank: { neck: 0.088, backDrop: 0.045, frontDrop: 0.15, strap: 0.052, sp: 0.15, half: 0.25, hemHalf: 0.258, length: 0.7, armDepth: 0.255, sleeve: { kind: 'none' } },
};

// --- polygon helpers -------------------------------------------------------------------------

// closed polygon from control points [x, y, r]: corners rounded with fillets of radius r
function filleted(points) {
  const out = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const [px, py, r = 0] = points[i];
    if (r <= 0) { out.push([px, py]); continue; }
    const a = points[(i + n - 1) % n], b = points[(i + 1) % n];
    let ux = a[0] - px, uy = a[1] - py, vx = b[0] - px, vy = b[1] - py;
    const la = Math.hypot(ux, uy), lb = Math.hypot(vx, vy);
    ux /= la; uy /= la; vx /= lb; vy /= lb;
    const cos = clamp(ux * vx + uy * vy, -1, 1);
    const th = Math.acos(cos);
    if (th < 0.05 || th > Math.PI - 0.02) { out.push([px, py]); continue; }
    let t = r / Math.tan(th / 2);
    t = Math.min(t, 0.45 * la, 0.45 * lb);
    const rr = t * Math.tan(th / 2);
    const sx = px + ux * t, sy = py + uy * t, ex = px + vx * t, ey = py + vy * t;
    // centre on the bisector
    let bx = ux + vx, by = uy + vy;
    const bl = Math.hypot(bx, by);
    bx /= bl; by /= bl;
    const dc = rr / Math.sin(th / 2);
    const cx = px + bx * dc, cy = py + by * dc;
    let a0 = Math.atan2(sy - cy, sx - cx), a1 = Math.atan2(ey - cy, ex - cx);
    let da = a1 - a0;
    while (da > Math.PI) da -= TAU;
    while (da < -Math.PI) da += TAU;
    const steps = Math.max(2, Math.ceil(Math.abs(da) / 0.2));
    for (let s = 0; s <= steps; s++) {
      const ang = a0 + (da * s) / steps;
      out.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]);
    }
  }
  return out;
}

// resample a closed polygon every `step` metres
function resample(poly, step) {
  const n = poly.length, cum = [0];
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    cum.push(cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const L = cum[n], m = Math.max(16, Math.round(L / step));
  const out = [];
  let j = 0;
  for (let k = 0; k < m; k++) {
    const s = (k / m) * L;
    while (cum[j + 1] < s) j++;
    const a = poly[j], b = poly[(j + 1) % n];
    const t = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    out.push([mix(a[0], b[0], t), mix(a[1], b[1], t)]);
  }
  return out;
}

// right half (x >= 0, from the top centre clockwise to the bottom centre) -> full closed outline
function mirror(right) {
  const left = [];
  for (let i = right.length - 2; i >= 1; i--) left.push([-right[i][0], right[i][1], right[i][2]]);
  return [...right, ...left];
}

function neckCurve(neck, drop, yH, vneck, steps = 8) {
  // from the centre (0, yH - drop) to the HPS (neck, yH): elliptic scoop, or straight V
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (vneck) pts.push([neck * t, yH - drop * (1 - t) - 0.012 * Math.sin(Math.PI * t) * 0, 0]);
    else {
      const a = (t * Math.PI) / 2;
      pts.push([neck * Math.sin(a), yH - drop * Math.cos(a) ** 1.15, 0]);
    }
  }
  return pts;
}

// --- the outlines ------------------------------------------------------------------------------

// returns { back, front, m } : back = full outline (shallow back neck), front = same with the
// front neckline; m = measurements reused by the parts, prints and drape
export function outlineOf(shapeKey, step = 0.005) {
  const S = SHAPES[shapeKey] || SHAPES.tee;
  const fall = S.fall ?? 0.42;
  const yH = shoulderY(S.neck); // height of the HPS (where neckline and shoulder seam meet)
  const ySP = shoulderY(S.sp, 0.0105, fall);
  const yHem = yH - S.length;
  const yBody = yHem + (S.band || 0); // the body pillow stops on top of a rib hem band
  const m = { S, yH, ySP, yHem, yBody, neck: S.neck, sp: S.sp, half: S.half, hemHalf: S.hemHalf };

  const right = (drop, vneck) => {
    const pts = [[0, yH - drop, 0], ...neckCurve(S.neck, drop, yH, vneck).slice(1, -1), [S.neck, yH, 0.004]];
    // shoulder line following the hanger, a few intermediate points
    for (let i = 1; i < 4; i++) {
      const x = mix(S.neck, S.sp, i / 4);
      pts.push([x, shoulderY(x, 0.0105, fall), 0]);
    }
    const sl = S.sleeve;
    if (sl.kind === 'short') {
      const a = (sl.angle * Math.PI) / 180;
      const c1 = [S.sp + sl.len * Math.cos(a), ySP - sl.len * Math.sin(a)];
      const c2 = [c1[0] - sl.open * Math.sin(a), c1[1] - sl.open * Math.cos(a)];
      const ap = [S.half, ySP - S.armDepth];
      pts.push([S.sp, ySP, 0.012], [c1[0], c1[1], 0.008], [c2[0], c2[1], 0.008], [ap[0], ap[1], 0.022]);
      m.sleeve = { sp: [S.sp, ySP], c1, c2, ap, axis: [Math.cos(a), -Math.sin(a)] };
    } else if (sl.kind === 'long') {
      const a = (sl.tilt * Math.PI) / 180;
      const len = sl.len - (S.cuff || 0);
      const c1 = [S.sp + len * Math.sin(a) + 0.012, ySP - len * Math.cos(a)];
      const c2 = [c1[0] - sl.open * Math.cos(a), c1[1] - sl.open * Math.sin(a) * 0.35];
      const ap = [S.half + 0.003, ySP - sl.apex];
      // the sleeve keeps its width down to the cuff, slightly tapered
      pts.push([S.sp, ySP, 0.016], [S.sp + 0.035, ySP - 0.12, 0], [c1[0], c1[1], 0.006], [c2[0], c2[1], 0.006], [ap[0], ap[1], 0.004]);
      m.sleeve = { sp: [S.sp, ySP], c1, c2, ap, axis: [Math.sin(a), -Math.cos(a)], long: true };
    } else {
      // tank: narrow strap over the hanger, deep armhole down to the side
      const so = S.neck + S.strap;
      const yS = shoulderY(so);
      const ap = [S.half, yS - S.armDepth];
      pts.pop(); pts.pop(); pts.pop();
      pts.push([so, yS, 0.006], [so + 0.022, yS - 0.07, 0], [so + 0.06, yS - 0.17, 0], [ap[0], ap[1], 0.03]);
      m.strapOut = so;
      m.sleeve = { ap };
    }
    // side seam with a little flare, then the hem
    pts.push([S.hemHalf, yBody, S.band ? 0.006 : 0.01]);
    pts.push([0, yBody - (S.band ? 0 : 0.004), 0]);
    return pts;
  };

  // real edges are never ruler-straight: a small position-based wobble along the normal (the same
  // at a given place for the front and the back outline, so the side seams still close), a little
  // more along the hem; nothing above the shoulder points (the shoulders rest on the bar)
  const wobble = (poly) => poly.map(([x, y], i) => {
    const a = poly[(i + poly.length - 1) % poly.length], b = poly[(i + 1) % poly.length];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l; ty /= l;
    const k = smooth(ySP - 0.03, ySP - 0.1, y);
    const hem = smooth(yBody + 0.05, yBody + 0.005, y) * (S.band ? 0.2 : 1);
    const ax = Math.abs(x);
    const o = k * (0.0014 * Math.sin(ax * 37 + y * 23 + 1.7) + 0.0009 * Math.sin(ax * 91 - y * 53)) + hem * 0.0032 * Math.sin(x * 29 + 0.6) * Math.sin(x * 11 + 2.1);
    // clockwise outline (y up): outward normal = (-ty, tx)
    return [x - ty * o, y + tx * o];
  });
  const back = wobble(resample(filleted(mirror(right(S.backDrop, false))), step));
  const front = wobble(resample(filleted(mirror(right(S.frontDrop, !!S.vneck))), step));
  m.top = yH + 0.01;
  return { back, front, m };
}

// signed area > 0 when counter-clockwise
export function polyArea(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[i], r = p[(i + 1) % p.length];
    a += q[0] * r[1] - r[0] * q[1];
  }
  return a / 2;
}
