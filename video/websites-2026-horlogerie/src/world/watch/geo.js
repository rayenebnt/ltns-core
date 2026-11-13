// BALANCIER watch: procedural geometry helpers (mm, watch local frame: +Z out of the dial, +Y 12 o'clock).
// Every geometry that may be merged carries the same attributes: position, normal, uv, tangent (vec4).
import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const smoother = (x) => { x = clamp01(x); return x * x * x * (x * (x * 6 - 15) + 10); };
export const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------------------------------------
// lathe around +Z. profile: [[r, z], …] traversed counter-clockwise around the solid's section
// (r to the right, z up) so that normals point out of the solid. Turns sharper than `crease` (rad)
// stay hard edges (vertices split), gentler ones are smoothed.
// opts: segments, crease, phi0, phiLen, tangent ('around' | 'profile'), mod(i, phi, r, z) → dr,
// colorFn(r, z) → [r, g, b] (adds a color attribute)
export function lathe(profile, opts = {}) {
  const { segments = 96, crease = 0.6, phi0 = 0, phiLen = TAU, tangent = 'around', mod = null, colorFn = null } = opts;
  const n = profile.length;
  const segN = [], segLen = [], segD = [];
  for (let i = 0; i < n - 1; i++) {
    const [r0, z0] = profile[i], [r1, z1] = profile[i + 1];
    const dr = r1 - r0, dz = z1 - z0;
    const l = Math.hypot(dr, dz) || 1e-6;
    segN.push([dz / l, -dr / l]);
    segD.push([dr / l, dz / l]);
    segLen.push(l);
  }
  const total = segLen.reduce((a, b) => a + b, 0) || 1;
  const pos = [], nor = [], uv = [], tan = [], idx = [], col = [];
  let vAcc = 0;
  const cols = segments + 1;
  const cosC = Math.cos(crease);
  for (let s = 0; s < n - 1; s++) {
    const ends = [0, 1].map((k) => {
      const own = segN[s];
      const other = k === 0 ? segN[s - 1] : segN[s + 1];
      if (!other) return own;
      const dot = own[0] * other[0] + own[1] * other[1];
      if (dot < cosC) return own;
      const a = own[0] + other[0], b = own[1] + other[1];
      const l = Math.hypot(a, b) || 1;
      return [a / l, b / l];
    });
    if (segLen[s] < 1e-5) { vAcc += segLen[s]; continue; }
    const base = pos.length / 3;
    for (let k = 0; k < 2; k++) {
      const [r, z] = profile[s + k];
      const [nr, nz] = ends[k];
      const v = (vAcc + (k ? segLen[s] : 0)) / total;
      const c3 = colorFn ? colorFn(r, z) : null;
      for (let j = 0; j <= segments; j++) {
        const u = j / segments;
        const phi = phi0 + u * phiLen;
        const c = Math.cos(phi), si = Math.sin(phi);
        const rr = mod ? r + mod(s + k, phi, r, z) : r;
        pos.push(rr * c, rr * si, z);
        nor.push(nr * c, nr * si, nz);
        uv.push(u, v);
        if (tangent === 'profile') tan.push(segD[s][0] * c, segD[s][0] * si, segD[s][1], 1);
        else tan.push(-si, c, 0, 1);
        if (c3) col.push(c3[0], c3[1], c3[2]);
      }
    }
    for (let j = 0; j < segments; j++) {
      const a = base + j, b = base + j + 1, c2 = base + cols + j + 1, d = base + cols + j;
      idx.push(a, b, c2, a, c2, d);
    }
    vAcc += segLen[s];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('tangent', new THREE.Float32BufferAttribute(tan, 4));
  if (colorFn) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  if (mod) g.computeVertexNormals();
  return g;
}

// a lathe around +X (crown, crown tube): built around Z then turned
export function latheX(profile, opts) {
  const g = lathe(profile, opts);
  g.rotateY(Math.PI / 2); // z → x
  return g;
}

// ---------------------------------------------------------------------------------------------
// extrusion of a 2D shape along +Z, centred on z = 0 (total thickness = depth). The bevel stays inside
// the shape's outline. Returns a non-indexed geometry with creased normals, groups 0 = caps, 1 = walls.
export function extrude(shape, depth, { bevel = 0, bevelSegments = 1, curveSegments = 8, crease = 0.7 } = {}) {
  const b = Math.min(bevel, depth * 0.45);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(1e-4, depth - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelOffset: -b,
    bevelSegments, curveSegments, steps: 1,
  });
  g.translate(0, 0, -(depth - 2 * b) / 2);
  const out = toCreasedNormals(g, crease);
  if (out !== g) g.dispose();
  return out;
}

// split a grouped (non-indexed) geometry into one geometry per group index
export function splitGroups(g) {
  const res = [];
  const pos = g.attributes;
  for (const grp of g.groups) {
    const m = grp.materialIndex || 0;
    const ng = new THREE.BufferGeometry();
    for (const name of Object.keys(pos)) {
      const a = pos[name];
      const arr = a.array.slice(grp.start * a.itemSize, (grp.start + grp.count) * a.itemSize);
      ng.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize));
    }
    res[m] = res[m] ? merge([res[m], ng]) : ng;
  }
  return res;
}

// planar UV from x, y (mm): uv = (x * sx + ox, y * sy + oy)
export function planarUV(g, scale, { ox = 0.5, oy = 0.5, mirrorX = false } = {}) {
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = (mirrorX ? -p.getX(i) : p.getX(i)) * scale + ox;
    uv[i * 2 + 1] = p.getY(i) * scale + oy;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

// tangents: fn(x, y, z, nx, ny, nz) → [tx, ty, tz] (default: around the Z axis, else +X)
export function setTangents(g, fn = null) {
  const p = g.attributes.position, nn = g.attributes.normal;
  const t = new Float32Array(p.count * 4);
  const v = new THREE.Vector3(), n = new THREE.Vector3(), tt = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    n.fromBufferAttribute(nn, i);
    if (fn) tt.fromArray(fn(v.x, v.y, v.z, n.x, n.y, n.z));
    else {
      tt.set(-v.y, v.x, 0);
      if (tt.lengthSq() < 1e-8) tt.set(1, 0, 0);
    }
    // orthogonalise against the normal
    tt.addScaledVector(n, -tt.dot(n));
    if (tt.lengthSq() < 1e-8) tt.set(n.y, -n.x, 0).lengthSq() < 1e-8 && tt.set(1, 0, 0);
    tt.normalize();
    t[i * 4] = tt.x; t[i * 4 + 1] = tt.y; t[i * 4 + 2] = tt.z; t[i * 4 + 3] = 1;
  }
  g.setAttribute('tangent', new THREE.BufferAttribute(t, 4));
  return g;
}

function normalizeAttrs(g) {
  let x = g.index ? g.toNonIndexed() : g;
  if (x !== g) g.dispose();
  x.clearGroups();
  if (!x.attributes.normal) x.computeVertexNormals();
  if (!x.attributes.uv) x.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2));
  if (!x.attributes.tangent) setTangents(x);
  for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'uv', 'tangent', 'color'].includes(k)) x.deleteAttribute(k);
  return x;
}

// merge geometries (any mix of indexed / non-indexed); keeps position, normal, uv, tangent (and color if all have it)
export function merge(list) {
  const gs = list.filter(Boolean).map(normalizeAttrs);
  if (!gs.length) return new THREE.BufferGeometry();
  const allColor = gs.every((g) => g.attributes.color);
  if (!allColor) for (const g of gs) if (g.attributes.color) g.deleteAttribute('color');
  if (gs.length === 1) return gs[0];
  const m = mergeGeometries(gs, false);
  for (const g of gs) g.dispose();
  return m;
}

export function transformed(g, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1 } = {}) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s));
  g.applyMatrix4(m);
  return g;
}

// ---------------------------------------------------------------------------------------------
// 2D shapes
export function circlePath(path, cx, cy, r, n = 32, cw = false) {
  for (let i = 0; i <= n; i++) {
    const a = (cw ? -1 : 1) * (i / n) * TAU;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
  }
  return path;
}
export function circleShape(r, n = 32, holes = []) {
  const s = circlePath(new THREE.Shape(), 0, 0, r, n);
  for (const h of holes) s.holes.push(circlePath(new THREE.Path(), h[0], h[1], h[2], h[3] || 20, true));
  return s;
}

// annular sector (a0 → a1, radians) between r0 and r1
export function sectorShape(r0, r1, a0, a1, n = 48) {
  const s = new THREE.Shape();
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    const x = r1 * Math.cos(a), y = r1 * Math.sin(a);
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  for (let i = n; i >= 0; i--) {
    const a = a0 + (a1 - a0) * (i / n);
    s.lineTo(r0 * Math.cos(a), r0 * Math.sin(a));
  }
  return s;
}
export function sectorPath(r0, r1, a0, a1, n = 24, round = 0) {
  const p = new THREE.Path();
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); pts.push([r1 * Math.cos(a), r1 * Math.sin(a)]); }
  for (let i = n; i >= 0; i--) { const a = a0 + (a1 - a0) * (i / n); pts.push([r0 * Math.cos(a), r0 * Math.sin(a)]); }
  const q = round > 0 ? roundPolygon(pts, round) : pts;
  q.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  return p;
}

// cheap corner rounding of a closed polygon: chaikin, 2 passes
export function roundPolygon(pts, passes = 2) {
  let p = pts;
  for (let k = 0; k < passes; k++) {
    const q = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    p = q;
  }
  return p;
}

export function polyShape(pts) {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  return s;
}

// a toothed wheel: outline with `teeth` ogival teeth (tip radius r, tooth height h), optional spokes
// (count, width) between a hub and a rim, an arbor hole. escape: club-shaped, leaning teeth.
export function gearShape({ r, teeth, h = null, spokes = 0, spokeW = 0.5, rim = 0.5, hub = 0.9, hole = 0.15, escape = false, curved = 0 }) {
  h = h ?? Math.min(0.5, (TAU * r) / teeth * 0.75);
  const rr = r - h;
  const pts = [];
  const P = TAU / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * P;
    if (escape) {
      pts.push([rr, a], [rr, a + 0.12 * P], [r - h * 0.25, a + 0.55 * P], [r, a + 0.62 * P], [r - h * 0.05, a + 0.74 * P], [rr + h * 0.15, a + 0.5 * P]);
    } else {
      pts.push([rr, a], [rr, a + 0.4 * P], [r - 0.45 * h, a + 0.5 * P], [r - 0.08 * h, a + 0.6 * P], [r, a + 0.7 * P], [r - 0.08 * h, a + 0.8 * P], [r - 0.45 * h, a + 0.9 * P]);
    }
  }
  const s = new THREE.Shape();
  pts.forEach(([ra, a], i) => {
    const x = ra * Math.cos(a), y = ra * Math.sin(a);
    if (i) s.lineTo(x, y); else s.moveTo(x, y);
  });
  if (spokes > 0) {
    const rin = rr - rim;
    for (let k = 0; k < spokes; k++) {
      const a0 = (k / spokes) * TAU, a1 = ((k + 1) / spokes) * TAU;
      const dOut = Math.asin(Math.min(0.9, spokeW / 2 / rin)), dIn = Math.asin(Math.min(0.9, spokeW / 2 / hub));
      const p = [];
      const n = 16;
      for (let j = 0; j <= n; j++) { const a = a0 + dOut + (a1 - a0 - 2 * dOut) * (j / n); p.push([rin * Math.cos(a + curved), rin * Math.sin(a + curved)]); }
      for (let j = n; j >= 0; j--) { const a = a0 + dIn + (a1 - a0 - 2 * dIn) * (j / n); p.push([hub * Math.cos(a), hub * Math.sin(a)]); }
      const q = roundPolygon(p, 1);
      const path = new THREE.Path();
      q.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
      s.holes.push(path);
    }
  }
  if (hole > 0) s.holes.push(circlePath(new THREE.Path(), 0, 0, hole, 12, true));
  return s;
}

// a thick polyline with round ends (bridges, the balance cock): pts [[x, y], …], half widths w[i]
export function strokeShape(pts, w, holes = []) {
  const n = pts.length;
  const dirs = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1];
    const l = Math.hypot(dx, dy) || 1;
    dirs.push([dx / l, dy / l]);
  }
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const d0 = dirs[Math.max(0, i - 1)], d1 = dirs[Math.min(n - 2, i)];
    let mx = d0[0] + d1[0], my = d0[1] + d1[1];
    const ml = Math.hypot(mx, my) || 1;
    mx /= ml; my /= ml;
    const nx = -my, ny = mx;
    const miter = 1 / Math.max(0.5, nx * -d1[1] + ny * d1[0]);
    const wi = w[i] * miter;
    left.push([pts[i][0] + nx * wi, pts[i][1] + ny * wi]);
    right.push([pts[i][0] - nx * wi, pts[i][1] - ny * wi]);
  }
  const out = [...left];
  const arc = (c, r, a0, a1) => { const m = 18; for (let j = 1; j < m; j++) { const a = a0 + (a1 - a0) * (j / m); out.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); } };
  const dl = dirs[n - 2];
  const aL = Math.atan2(dl[0], -dl[1]); // left normal angle at the end
  arc(pts[n - 1], w[n - 1], aL, aL - Math.PI);
  for (let i = n - 1; i >= 0; i--) out.push(right[i]);
  const d0 = dirs[0];
  const aR = Math.atan2(-d0[0], d0[1]) + Math.PI; // right normal angle at the start
  arc(pts[0], w[0], aR, aR - Math.PI);
  const s = polyShape(out);
  for (const h of holes) s.holes.push(circlePath(new THREE.Path(), h[0], h[1], h[2], 16, true));
  return s;
}

// convex hull of circles [[cx, cy, r], …] as a Shape
export function hullShape(circles, holes = []) {
  const pts = [];
  for (const [cx, cy, r] of circles) for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  const s = polyShape(hull);
  for (const h of holes) s.holes.push(circlePath(new THREE.Path(), h[0], h[1], h[2], 16, true));
  return s;
}

// a slotted, domed screw head (two half domes with a gap), centred at the origin, facing +Z (or -Z)
export function screwHead(r, h, { segments = 12, slot = 0.18, facing = 1 } = {}) {
  const prof = [[0, 0], [r, 0], [r, h * 0.45], [r * 0.8, h * 0.85], [r * 0.4, h], [0, h]];
  const gap = Math.asin(Math.min(0.9, slot / 2 / r));
  const halves = [0, Math.PI].map((a) => lathe(prof, { segments, phi0: a + gap, phiLen: Math.PI - 2 * gap, crease: 0.9 }));
  const g = merge(halves);
  if (facing < 0) g.rotateX(Math.PI);
  return g;
}

// rounded box (simple): BoxGeometry corners rounded via RoundedBoxGeometry when available
export { mergeGeometries, toCreasedNormals };
