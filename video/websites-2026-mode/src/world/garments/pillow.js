// The garment body: a front and a back panel meshed from the flat outline (a regular grid
// clipped to the outline, the boundary ring snapped exactly onto it), inflated with a rounded
// edge profile so the garment has a few centimetres of body, then draped (gravity folds, drag
// lines from the hanger ends, hem waves, a slight wrap). Front and back share the rim, so the
// side seams close; through the deeper front neckline you see the inside of the back panel.
import { clamp, smooth, mix, TAU, segDist } from './noise.js';
import { HANGER_HALF, hangerTopY } from './outlines.js';

// distance-to-outline queries, bucketed so a 20k-vertex grid stays cheap
function distanceField(poly, reach) {
  const B = 0.03;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of poly) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  minX -= reach; minY -= reach; maxX += reach; maxY += reach;
  const nx = Math.ceil((maxX - minX) / B) + 1, ny = Math.ceil((maxY - minY) / B) + 1;
  const buckets = Array.from({ length: nx * ny }, () => []);
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    const x0 = Math.floor((Math.min(a[0], b[0]) - reach - minX) / B), x1 = Math.floor((Math.max(a[0], b[0]) + reach - minX) / B);
    const y0 = Math.floor((Math.min(a[1], b[1]) - reach - minY) / B), y1 = Math.floor((Math.max(a[1], b[1]) + reach - minY) / B);
    for (let y = Math.max(0, y0); y <= Math.min(ny - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(nx - 1, x1); x++) buckets[y * nx + x].push(i);
  }
  // returns distance (clamped to reach) and the closest boundary point
  return (px, py) => {
    const bx = Math.floor((px - minX) / B), by = Math.floor((py - minY) / B);
    if (bx < 0 || by < 0 || bx >= nx || by >= ny) return { d: reach, x: px, y: py };
    let best = reach, cx = px, cy = py;
    for (const i of buckets[by * nx + bx]) {
      const a = poly[i], b = poly[(i + 1) % n];
      const s = segDist(px, py, a[0], a[1], b[0], b[1]);
      if (s.d < best) {
        best = s.d;
        cx = mix(a[0], b[0], s.t);
        cy = mix(a[1], b[1], s.t);
      }
    }
    return { d: best, x: cx, y: cy };
  };
}

// even-odd inside test for a whole grid row at once (sorted crossings of the scanline)
function rowCrossings(poly, y) {
  const xs = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
  }
  return xs.sort((p, q) => p - q);
}
const insideRow = (xs, x) => {
  let c = 0;
  for (const v of xs) { if (v < x) c++; else break; }
  return (c & 1) === 1;
};

// The drape of a hanging garment, as a z offset field shared by both panels (they move
// together), plus the shoulder area that must stay thick enough to hide the bar inside.
export function makeDrape(m, rand, opts = {}) {
  const amp = (opts.foldAmp ?? 0.006) * 1.55;
  const ySh = hangerTopY(HANGER_HALF);
  const yHem = m.yBody;
  const waves = Array.from({ length: 7 }, () => ({ k: TAU / mix(0.07, 0.19, rand()), ph: rand() * TAU, a: mix(0.35, 1, rand()), tilt: mix(-0.35, 0.35, rand()) }));
  const hem = Array.from({ length: 3 }, () => ({ k: TAU / mix(0.07, 0.13, rand()), ph: rand() * TAU, a: mix(0.5, 1, rand()) }));
  const drags = [-1, 1].flatMap((s) => [0, 1].map((j) => ({ s, ax: s * (HANGER_HALF - 0.01 - j * 0.03), ay: ySh + 0.004 + j * 0.008, bx: s * mix(0.02, 0.09, rand()), by: ySh - mix(0.22, 0.34, rand()) - j * 0.05, a: mix(0.6, 1, rand()) * (j ? 0.55 : 1) })));
  const sl = m.sleeve;
  // a few defined creases: ridge + valley pairs falling from under the bar ends to the hem
  const creases = [];
  for (const sd of [-1, 1]) {
    for (let j = 0; j < 2; j++) {
      const xa = sd * (HANGER_HALF - 0.035 - j * 0.06 + (rand() - 0.5) * 0.03);
      const xb = sd * (m.hemHalf - 0.07 - j * 0.085 + (rand() - 0.5) * 0.04);
      const a = mix(0.7, 1.1, rand()) * (j ? 0.75 : 1);
      creases.push({ ax: xa, ay: ySh - 0.02, bx: xb, by: yHem, a, w: mix(0.011, 0.018, rand()) });
      creases.push({ ax: xa + sd * 0.026, ay: ySh - 0.05, bx: xb + sd * 0.03, by: yHem, a: -a * 0.7, w: mix(0.012, 0.02, rand()) });
    }
  }
  return (x, y) => {
    const t = clamp((ySh - y) / (ySh - yHem)); // 0 under the hanger, 1 at the hem
    let g = 0;
    for (const w of waves) g += w.a * Math.sin(w.k * (x + w.tilt * (y - ySh)) + w.ph);
    // gravity folds: born under the hanger, deepest at mid-body, a bit fuller at the hem
    // folds gather under the bar ends (the fabric beyond the hanger falls), the centre hangs flatter
    const ax0 = Math.abs(x);
    const lateral = 0.55 + 0.75 * Math.exp(-(((ax0 - HANGER_HALF * 0.95) / 0.09) ** 2)) + 0.35 * smooth(m.half - 0.06, m.half, ax0);
    let f = amp * (g / 3.2) * smooth(0.0, 0.3, t) * (0.6 + 0.55 * t) * lateral;
    // drag lines: ridges from the bar ends converging toward the chest (fabric pulled by the hanger)
    for (const d of drags) {
      const s = segDist(x, y, d.ax, d.ay, d.bx, d.by);
      f += amp * 0.85 * d.a * Math.exp(-((s.d / 0.016) ** 2)) * Math.sin(Math.PI * clamp(s.t * 1.15)) ;
      f -= amp * 0.45 * d.a * Math.exp(-(((s.d - 0.03) / 0.018) ** 2)) * Math.sin(Math.PI * clamp(s.t));
    }
    for (const c of creases) {
      const q = segDist(x, y, c.ax, c.ay, c.bx, c.by);
      f += amp * 0.75 * c.a * Math.exp(-((q.d / c.w) ** 2)) * smooth(0, 0.18, q.t) * (1 - 0.35 * q.t);
    }
    // hem flare: soft waves along the bottom edge
    let hw = 0;
    for (const w of hem) hw += w.a * Math.sin(w.k * x + w.ph);
    f += amp * 0.9 * (hw / 2) * smooth(0.8, 1.0, t);
    // sleeves: hang a bit forward of the body and roll at their end
    if (sl && sl.c1 && Math.abs(x) > m.half - 0.02) {
      const k = smooth(m.half - 0.02, m.half + 0.05, Math.abs(x));
      f += k * 0.006 * Math.sin(Math.abs(x) * 38 + y * 9 + 1.3);
    }
    // the garment wraps a little around the hanger's depth: sides fall back; the sleeves come
    // forward a little (they hang from the shoulder seam, in front of the side seams)
    f -= (opts.wrap ?? 0.09) * x * x;
    if (sl && sl.c1) f += 0.1 * Math.max(0, Math.abs(x) - m.half + 0.02) * smooth(m.ySP + 0.02, m.ySP - 0.12, y);
    // where the bar holds the fabric there is no drape (the wood must stay inside)
    const ax = Math.abs(x);
    const dyBar = hangerTopY(Math.min(ax, HANGER_HALF)) - y;
    const held = (1 - smooth(HANGER_HALF - 0.005, HANGER_HALF + 0.05, ax)) * (1 - smooth(0.0, 0.09, dyBar));
    return f * (1 - held);
  };
}

// half thickness and edge radius: thick enough over the bar (it hides inside the shoulders),
// thinner and flatter in the body
function thicknessAt(x, y, h0, cell = 0.0085) {
  const ax = Math.abs(x);
  const dy = hangerTopY(Math.min(ax, HANGER_HALF)) - y; // > 0 below the bar top
  const along = 1 - smooth(HANGER_HALF - 0.01, HANGER_HALF + 0.035, ax);
  const zone = along * (1 - smooth(0.012, 0.075, dy));
  // coarse grids interpolate the rounded rim over a longer span: a bit more body over the bar
  const H = mix(h0, Math.max(h0, 0.0105 + Math.max(0, cell - 0.0085) * 0.45), zone);
  return { H, R: mix(Math.max(0.006, h0 * 1.4), H * 0.9, zone), zone };
}

// build one panel. side +1 = front (normals toward +z), -1 = back
export function buildPanel(poly, side, cell, opts) {
  const { drape, h0, puff = 0.004, uvOf } = opts;
  const reach = 0.08;
  const dist = distanceField(poly, reach);
  // inflation follows the garment silhouette (the back outline), even where the front panel is
  // cut lower (neckline): the front stays full up to its neck edge, where the collar sits
  const dInf = opts.inflate ? distanceField(opts.inflate, 0.12) : null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of poly) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  const x0 = minX - cell, y0 = minY - cell;
  const nx = Math.ceil((maxX - minX) / cell) + 3, ny = Math.ceil((maxY - minY) / cell) + 3;
  // signed distance at the grid vertices (positive inside)
  const sd = new Float32Array(nx * ny);
  const cxp = new Float32Array(nx * ny), cyp = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const y = y0 + j * cell;
    const xs = rowCrossings(poly, y);
    for (let i = 0; i < nx; i++) {
      const x = x0 + i * cell;
      const q = dist(x, y);
      const k = j * nx + i;
      sd[k] = insideRow(xs, x) ? q.d : -q.d;
      cxp[k] = q.x;
      cyp[k] = q.y;
    }
  }
  // keep the cells whose centre is inside
  const keep = new Uint8Array((nx - 1) * (ny - 1));
  for (let j = 0; j < ny - 1; j++) {
    const yc = y0 + (j + 0.5) * cell;
    const xs = rowCrossings(poly, yc);
    for (let i = 0; i < nx - 1; i++) if (insideRow(xs, x0 + (i + 0.5) * cell)) keep[j * (nx - 1) + i] = 1;
  }
  // border vertices (corner of a kept cell AND of a dropped cell) are snapped onto the outline:
  // the silhouette is then the outline itself, not the grid's staircase
  const border = new Uint8Array(nx * ny);
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    if (keep[j * (nx - 1) + i]) continue;
    border[j * nx + i] = border[j * nx + i + 1] = border[(j + 1) * nx + i] = border[(j + 1) * nx + i + 1] = 1;
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (i === 0 || j === 0 || i === nx - 1 || j === ny - 1) border[j * nx + i] = 1;
  const vid = new Int32Array(nx * ny).fill(-1);
  const P = [], UV = [], D = [];
  const use = (i, j) => {
    const k = j * nx + i;
    if (vid[k] >= 0) return vid[k];
    let x = x0 + i * cell, y = y0 + j * cell, d = sd[k];
    if (border[k] || d < 0) { x = cxp[k]; y = cyp[k]; d = 0; }
    vid[k] = P.length / 3;
    P.push(x, y, 0);
    D.push(Math.max(0, d));
    return vid[k];
  };
  const I = [];
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      if (!keep[j * (nx - 1) + i]) continue;
      const a = use(i, j), b = use(i + 1, j), c = use(i + 1, j + 1), d = use(i, j + 1);
      // shorter diagonal: fewer slivers where the ring was snapped
      const dac = Math.hypot(P[a * 3] - P[c * 3], P[a * 3 + 1] - P[c * 3 + 1]);
      const dbd = Math.hypot(P[b * 3] - P[d * 3], P[b * 3 + 1] - P[d * 3 + 1]);
      const tris = dac <= dbd ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]];
      for (const [p, q, r] of tris) {
        // drop the degenerate triangles left by snapping
        const ar = (P[q * 3] - P[p * 3]) * (P[r * 3 + 1] - P[p * 3 + 1]) - (P[r * 3] - P[p * 3]) * (P[q * 3 + 1] - P[p * 3 + 1]);
        if (Math.abs(ar) < 1e-9) continue;
        if (side > 0) I.push(p, q, r); else I.push(p, r, q);
      }
    }
  }
  // inflate and drape
  const nv = P.length / 3;
  const ao = new Float32Array(nv);
  const hA = new Float32Array(nv);
  const heldZone = new Float32Array(nv);
  for (let v = 0; v < nv; v++) {
    const x = P[v * 3], y = P[v * 3 + 1];
    const d = dInf && D[v] > 0 ? dInf(x, y).d : D[v];
    D[v] = d;
    const { H, R, zone } = thicknessAt(x, y, h0, cell);
    const e = 1 - Math.min(d / R, 1);
    hA[v] = H * Math.sqrt(Math.max(0, 1 - e * e)) + puff * smooth(0.0, 0.11, d);
    heldZone[v] = zone;
    // the rim turns away from the light: a touch darker (soft side seams)
    ao[v] = 0.8 + 0.2 * smooth(0, 0.035, d);
  }
  // relax the inflation near the rim: the snapped ring is unevenly spaced along slanted edges and
  // would otherwise ripple the shading (scallops); the rim itself stays on the outline at h = 0
  for (let it = 0; it < 4; it++) {
    const next = Float32Array.from(hA);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const v = vid[j * nx + i];
      if (v < 0 || D[v] <= 0 || D[v] > 0.045 || heldZone[v] > 0.25) continue;
      let s = 0, w = 0;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
        const q = vid[jj * nx + ii];
        if (q < 0) continue;
        const wt = di && dj ? 0.5 : 1;
        s += hA[q] * wt;
        w += wt;
      }
      if (w > 0) next[v] = hA[v] * 0.4 + (s / w) * 0.6;
    }
    hA.set(next);
  }
  for (let v = 0; v < nv; v++) {
    const x = P[v * 3], y = P[v * 3 + 1];
    P[v * 3 + 2] = side * hA[v] + drape(x, y);
    const uv = uvOf(x, y, side);
    UV.push(uv[0], uv[1]);
  }
  // fold occlusion: valleys (below the local average surface) get darker, ridges a bit lighter
  const zb = new Float32Array(nx * ny), wb = new Float32Array(nx * ny);
  const r = Math.max(2, Math.round(0.035 / cell));
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    if (vid[k] < 0) continue;
    let s = 0, w = 0;
    for (let dj = -r; dj <= r; dj += 1) for (let di = -r; di <= r; di += 1) {
      const ii = i + di, jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
      const q = vid[jj * nx + ii];
      if (q < 0) continue;
      s += P[q * 3 + 2];
      w++;
    }
    zb[k] = s / w;
    wb[k] = w;
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i, v = vid[k];
    if (v < 0) continue;
    const dz = (P[v * 3 + 2] - zb[k]) * side;
    ao[v] *= clamp(1 + dz * 70, 0.62, 1.08);
  }
  return { pos: new Float32Array(P), uv: new Float32Array(UV), ao, index: I, dist: new Float32Array(D) };
}

// z of the body surface at (x, y) (side +1 front, -1 back), for the parts that sit on it
export function makeSurface(poly, h0, puff, drape) {
  const dist = distanceField(poly, 0.12);
  return (x, y, side) => {
    const xs = rowCrossings(poly, y);
    const d = insideRow(xs, x) ? dist(x, y).d : 0;
    const { H, R } = thicknessAt(x, y, h0);
    const e = 1 - Math.min(d / R, 1);
    const h = H * Math.sqrt(Math.max(0, 1 - e * e)) + puff * smooth(0.0, 0.11, d);
    return side * h + drape(x, y);
  };
}
