// Extra pieces of each type, merged into the garment geometry (same material, aPart decides the
// look): rib collars and V-neck trims swept round the neck, rib cuffs and hem bands, the hood
// lying on the back with its rolled rim, the kangaroo pocket, drawcords with metal aglets, snap
// buttons and the woven label inside the back neck.
import { sweep, superRing, circleRing, framesAlong, v3, PART } from './geo.js';
import { buildPanel } from './pillow.js';
import { atlasUv, LABEL_RECT } from './prints.js';
import { mix, smooth, clamp } from './noise.js';

// loop around the neck: front neckline (cos > 0) on the front panel, back neckline (cos < 0) on
// the back rim, meeting over the shoulders
function neckLoop(m, surf, drape, { neck, frontDrop, backDrop, vneck, n = 64, zBack = -0.002 }) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const phi = (i / n) * Math.PI * 2;
    const c = Math.cos(phi), s = Math.sin(phi);
    const drop = c >= 0 ? frontDrop : backDrop;
    const x = neck * s;
    const y = vneck && c >= 0 ? m.yH - drop * (1 - Math.abs(s)) ** 1.1 : m.yH - drop * Math.abs(c) ** 1.15;
    const zf = surf(x, y - 0.003, 1);
    const zb = drape(x, y) + zBack;
    pts.push([x, y, mix(zb, zf, smooth(-0.35, 0.35, c))]);
  }
  return pts;
}

// sweep a flattened tube round the closed neck loop. a: half width along R (away from the opening
// on the garment surface, or straight up for a stand collar), b: half thickness; off: offset of
// the section centre along R
function neckBand(m, surf, drape, opts) {
  const pts = neckLoop(m, surf, drape, opts);
  const n = pts.length;
  const frames = pts.map((p, i) => {
    const prev = pts[(i + n - 1) % n], next = pts[(i + 1) % n];
    const T = v3.norm(v3.sub(next, prev));
    const phi = (i / n) * Math.PI * 2, c = Math.cos(phi), s = Math.sin(phi);
    // away from the opening along the garment: down at the front and back, out along the shoulders
    let R = opts.stand ? [0, 1, 0] : [s * 1.2, -Math.abs(c) - 0.15, 0];
    const d = R[0] * T[0] + R[1] * T[1] + R[2] * T[2];
    R = v3.norm([R[0] - T[0] * d, R[1] - T[1] * d, R[2] - T[2] * d]);
    const B = v3.norm(v3.cross(T, R)); // R x B = T: outward winding in sweep()
    // lift the section off the surface, toward the outside of the garment (continuous)
    const O = v3.norm([0, Math.max(0, 1 - Math.abs(c)) * 1.2, c]);
    const lift = opts.b * 0.55 * (B[0] * O[0] + B[1] * O[1] + B[2] * O[2]);
    const o = opts.off;
    return { p: [p[0] + R[0] * o + B[0] * lift, p[1] + R[1] * o + B[1] * lift, p[2] + R[2] * o + B[2] * lift], R, B };
  });
  const ring = superRing(opts.a, opts.b, 14, 2.6);
  const piece = sweep(frames, ring, { closed: true });
  // uv.y across the band (stripes): 0 at the sewn edge, 1 at the free edge
  const nr = ring.length;
  for (let i = 0; i < piece.uv.length / 2; i++) {
    const r = i % (nr + 1);
    piece.uv[i * 2 + 1] = 0.5 - 0.5 * Math.cos((r / nr) * Math.PI * 2) * (opts.stand ? -1 : 1);
  }
  return piece;
}

// flattened rib tube along a straight axis (cuffs, hem bands): rings of half sizes a (along
// `across`), b (z), from p0 along `axis` for len metres. uv.x: metres round the tube (rib wales),
// uv.y: 0 at the seam, 1 at the open edge (stripes)
function ribTube(p0, axis, across, len, a, b, drape, { stations = 6, nr = 24, taper = 0.94 } = {}) {
  const ring = superRing(1, 1, nr, 2.4);
  const pos = [], uv = [], index = [];
  const per = Math.PI * (a + b);
  for (let s = 0; s <= stations; s++) {
    const t = s / stations;
    const k = mix(1, taper, t) * (t > 0.92 ? mix(1, 0.93, (t - 0.92) / 0.08) : 1);
    const c = [p0[0] + axis[0] * len * t, p0[1] + axis[1] * len * t];
    for (let r = 0; r <= nr; r++) {
      const [ca, cb] = ring[r % nr];
      const x = c[0] + across[0] * ca * a * k, y = c[1] + across[1] * ca * a * k;
      pos.push(x, y, cb * b * k + drape(x, y));
      uv.push((r / nr) * per, t);
    }
  }
  const W = nr + 1;
  for (let s = 0; s < stations; s++) for (let r = 0; r < nr; r++) {
    const p = s * W + r, q = (s + 1) * W + r;
    index.push(p, q, q + 1, p, q + 1, p + 1);
  }
  // winding: make the normals point outward whatever the axis direction
  const cr = axis[0] * across[1] - axis[1] * across[0];
  if (cr > 0) for (let i = 0; i < index.length; i += 3) { const t = index[i + 1]; index[i + 1] = index[i + 2]; index[i + 2] = t; }
  return { pos: new Float32Array(pos), uv: new Float32Array(uv), index };
}

function tubeAlong(points, r, nr = 6, { capEnds = true } = {}) {
  return sweep(framesAlong(points, [0, 0, 1]), circleRing(r, nr), { capEnds });
}

function lathe(profile, nr, place) {
  // profile [[radius, height]] around +z, placed by place(x, y, z) -> [x, y, z]
  const pos = [], uv = [], index = [];
  profile.forEach(([rad, h], j) => {
    for (let i = 0; i <= nr; i++) {
      const a = (i / nr) * Math.PI * 2;
      pos.push(...place(Math.cos(a) * rad, Math.sin(a) * rad, h));
      uv.push(i / nr, j / (profile.length - 1));
    }
  });
  const W = nr + 1;
  for (let j = 0; j < profile.length - 1; j++) for (let i = 0; i < nr; i++) {
    const p = j * W + i, q = (j + 1) * W + i;
    index.push(p, p + 1, q + 1, p, q + 1, q);
  }
  return { pos: new Float32Array(pos), uv: new Float32Array(uv), index };
}

export function addParts(geo, { type, shape, m, surf, drape, h0, cell, st }) {
  const S = m.S;
  // --- collars ---
  if (type === 'varsity') {
    geo.add(neckBand(m, surf, drape, { neck: S.neck + 0.004, frontDrop: S.frontDrop, backDrop: S.backDrop, a: 0.017, b: 0.0062, off: 0.012, zBack: -0.004, stand: true }), PART.RIB);
  } else if (type === 'hoodie') {
    // the hood's rolled rim round the neck (the hood itself lies on the back, below)
    const rim = neckBand(m, surf, drape, { neck: S.neck + 0.012, frontDrop: S.frontDrop + 0.03, backDrop: S.backDrop, a: 0.02, b: 0.012, off: 0.006, zBack: -0.01, vneck: true });
    // body fabric, but its uv must not pick up the prints: point it at a blank corner of the atlas
    const blank = atlasUv(0.52, -1.0, 1);
    for (let i = 0; i < rim.uv.length; i += 2) { rim.uv[i] = blank[0]; rim.uv[i + 1] = blank[1]; }
    geo.add(rim, PART.BODY);
  } else if (type === 'jersey') {
    geo.add(neckBand(m, surf, drape, { neck: S.neck, frontDrop: S.frontDrop, backDrop: S.backDrop, a: 0.012, b: 0.0032, off: 0.009, vneck: true }), PART.RIB);
  } else if (type === 'tank') {
    geo.add(neckBand(m, surf, drape, { neck: S.neck, frontDrop: S.frontDrop, backDrop: S.backDrop, a: 0.006, b: 0.0035, off: 0.003 }), PART.RIB);
  } else {
    geo.add(neckBand(m, surf, drape, { neck: S.neck, frontDrop: S.frontDrop, backDrop: S.backDrop, a: 0.0095, b: 0.0052, off: 0.0065 }), PART.RIB);
  }

  // --- woven label inside the back neck, facing the front opening ---
  {
    const y1 = m.yH - S.backDrop - 0.016, y0 = y1 - 0.024, x0 = -0.024, x1 = 0.024;
    const pos = [], uv = [];
    const L = LABEL_RECT;
    for (const [x, y, u, v] of [[x0, y0, L.x0, L.y0], [x1, y0, L.x1, L.y0], [x1, y1, L.x1, L.y1], [x0, y1, L.x0, L.y1]]) {
      pos.push(x, y, surf(x, y, -1) + 0.0022);
      uv.push(...atlasUv(u, v, 1));
    }
    geo.add({ pos: new Float32Array(pos), uv: new Float32Array(uv), index: [0, 1, 2, 0, 2, 3], normal: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]) }, PART.LABEL);
  }

  // --- rib cuffs on long sleeves ---
  if (S.cuff && m.sleeve?.long) {
    const sl = m.sleeve;
    for (const sx of [1, -1]) {
      const c1 = [sx * sl.c1[0], sl.c1[1]], c2 = [sx * sl.c2[0], sl.c2[1]];
      const mid = [(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2];
      const ax = [sx * sl.axis[0], sl.axis[1]];
      const across = v3.norm([c1[0] - c2[0], c1[1] - c2[1], 0]);
      const half = Math.hypot(c1[0] - c2[0], c1[1] - c2[1]) / 2;
      const p0 = [mid[0] - ax[0] * 0.006, mid[1] - ax[1] * 0.006];
      geo.add(ribTube(p0, ax, across, S.cuff + 0.006, half * 0.86, h0 + 0.0035, drape, { taper: 0.9 }), PART.RIB);
    }
  }
  // --- rib hem band ---
  if (S.band) {
    const p0 = [0, m.yBody + 0.006];
    geo.add(ribTube(p0, [0, -1], [1, 0, 0], S.band + 0.006, S.hemHalf * 0.965, h0 + 0.004, drape, { stations: 5, nr: 40, taper: 0.97 }), PART.RIB);
  }

  // --- hoodie: hood on the back, kangaroo pocket, drawcords ---
  if (type === 'hoodie') {
    // hood lying flat on the back: its open edge follows the back neckline, its peak hangs down
    const hoodPoly = [];
    const yTop = m.yH - 0.004, yBot = m.yH - 0.37;
    const ctrl = [[0, yTop], [0.07, yTop - 0.006], [0.135, m.yH - 0.035], [0.165, m.yH - 0.1], [0.16, m.yH - 0.2], [0.115, m.yH - 0.3], [0.04, yBot + 0.012], [0, yBot]];
    const half = [];
    for (let i = 0; i < ctrl.length - 1; i++) for (let k = 0; k < 6; k++) {
      const t = k / 6, a = ctrl[i], b = ctrl[i + 1];
      half.push([mix(a[0], b[0], t), mix(a[1], b[1], t)]);
    }
    half.push(ctrl[ctrl.length - 1]);
    for (const p of half) hoodPoly.push(p);
    for (let i = half.length - 2; i >= 1; i--) hoodPoly.push([-half[i][0], half[i][1]]);
    const hood = buildPanel(hoodPoly, -1, cell * 1.25, {
      h0: 0.004,
      puff: 0.009,
      drape: (x, y) => surf(x, Math.min(y, m.yH - 0.03), -1) - 0.006 - 0.01 * smooth(m.yH - 0.05, m.yH + 0.03, y),
      uvOf: (x, y) => atlasUv(x, y, -1),
    });
    geo.add(hood, PART.BODY);
    // kangaroo pocket
    const yb = m.yBody + 0.008, yt = m.yBody + 0.215;
    const pk = [];
    pk.push([-0.17, yb], [0.17, yb]);
    for (let i = 1; i <= 8; i++) { const t = i / 8; pk.push([mix(0.17, 0.118, t) + Math.sin(Math.PI * t) * 0.03, mix(yb, yt, t)]); }
    pk.push([-0.118, yt]);
    for (let i = 7; i >= 1; i--) { const t = i / 8; pk.push([-(mix(0.17, 0.118, t) + Math.sin(Math.PI * t) * 0.03), mix(yb, yt, t)]); }
    const pocket = buildPanel(pk, 1, cell, { h0: 0.0016, puff: 0.0022, drape: (x, y) => surf(x, y, 1) + 0.0012, uvOf: (x, y) => atlasUv(x, y, 1) });
    geo.add(pocket, PART.BODY);
    // drawcords from the rim eyelets, hanging down with a slight swing outward
    for (const sx of [1, -1]) {
      const pts = [];
      const y0 = m.yH - S.frontDrop - 0.012;
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        const x = sx * (0.03 + 0.012 * Math.sin(t * 2.4) + 0.006 * t);
        const y = y0 - t * 0.255;
        pts.push([x, y, surf(x, y, 1) + 0.006 + 0.004 * (1 - t)]);
      }
      geo.add(tubeAlong(pts, 0.0033, 6), PART.CORD);
      const e = pts[pts.length - 1];
      const ag = [[e[0], e[1] + 0.004, e[2]], [e[0], e[1] - 0.03, e[2] + 0.001]];
      geo.add(tubeAlong(ag, 0.0039, 8), PART.METAL);
    }
  }

  // --- varsity: snap buttons down the centre front ---
  if (type === 'varsity') {
    const n = 5, ya = m.yH - S.frontDrop - 0.045, yb = m.yBody + 0.035;
    for (let i = 0; i < n; i++) {
      const y = mix(ya, yb, i / (n - 1));
      const z = surf(0, y, 1) + 0.0012;
      geo.add(lathe([[0.0078, 0], [0.0076, 0.0016], [0.006, 0.0029], [0.003, 0.0035], [0.0001, 0.0036]], 14, (x, yy, h) => [x, y + yy, z + h]), PART.METAL);
    }
  }
}
