// Voyage module helpers: seeded random, tileable noise textures (built once on the CPU, no image
// is fetched), the ocean's tileable wave normal map, a box builder with vertex colours, and the
// baked planar shadows of the static decor (projected along the sun, no shadow-map cost).
import * as THREE from 'three';

export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

// tileable gradient noise with `period` cells over the unit square
function perlin(period, rnd) {
  const g = new Float32Array(period * period * 2);
  for (let i = 0; i < period * period; i++) {
    const a = rnd() * Math.PI * 2;
    g[i * 2] = Math.cos(a);
    g[i * 2 + 1] = Math.sin(a);
  }
  const dot = (ix, iy, dx, dy) => {
    const k = (((iy % period) + period) % period) * period + (((ix % period) + period) % period);
    return g[k * 2] * dx + g[k * 2 + 1] * dy;
  };
  return (u, v) => {
    const x = u * period, y = v * period;
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const a = fade(xf), b = fade(yf);
    const n00 = dot(xi, yi, xf, yf), n10 = dot(xi + 1, yi, xf - 1, yf);
    const n01 = dot(xi, yi + 1, xf, yf - 1), n11 = dot(xi + 1, yi + 1, xf - 1, yf - 1);
    const x0 = n00 + (n10 - n00) * a, x1 = n01 + (n11 - n01) * a;
    return x0 + (x1 - x0) * b; // about -0.7..0.7
  };
}

// tileable cellular noise (distance to the nearest feature point), `period` cells
function worley(period, rnd) {
  const pts = new Float32Array(period * period * 2);
  for (let i = 0; i < period * period; i++) {
    pts[i * 2] = rnd();
    pts[i * 2 + 1] = rnd();
  }
  return (u, v) => {
    const x = u * period, y = v * period;
    const xi = Math.floor(x), yi = Math.floor(y);
    let md = 9;
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const cx = xi + i, cy = yi + j;
        const k = (((cy % period) + period) % period) * period + (((cx % period) + period) % period);
        const dx = cx + pts[k * 2] - x, dy = cy + pts[k * 2 + 1] - y;
        const d = dx * dx + dy * dy;
        if (d < md) md = d;
      }
    }
    return Math.sqrt(md);
  };
}

// RGBA noise texture, tileable, linear data (not colour):
//  R: perlin fBm (4 octaves)      — broad variation (fields, cloud coverage, aggregate)
//  G: inverted worley fBm         — billows (cloud puffs, foam cells)
//  B: perlin detail (2 octaves)   — fine detail
//  A: inverted fine worley        — sparkles, aggregate grains
// Also returns a CPU sampler so the world can evaluate the same field (cloud veil).
export function makeNoise(size = 256, seed = 7) {
  const rnd = rng(seed);
  const p4 = perlin(4, rnd), p8 = perlin(8, rnd), p16 = perlin(16, rnd), p32 = perlin(32, rnd);
  const w4 = worley(4, rnd), w8 = worley(8, rnd), w16 = worley(16, rnd), w24 = worley(24, rnd);
  const q16 = perlin(16, rnd), q32 = perlin(32, rnd), q64 = perlin(64, rnd);
  const data = new Uint8Array(size * size * 4);
  const fl = new Float32Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const r = 0.5 + 0.62 * (p4(u, v) * 0.55 + p8(u, v) * 0.27 + p16(u, v) * 0.13 + p32(u, v) * 0.07);
      const g = 1 - (w4(u, v) * 0.55 + w8(u, v) * 0.3 + w16(u, v) * 0.15) * 1.05;
      const b = 0.5 + 0.75 * (q16(u, v) * 0.5 + q32(u, v) * 0.3 + q64(u, v) * 0.2);
      const a = 1 - w24(u, v) * 1.1;
      const i = (y * size + x) * 4;
      const vals = [r, g, b, a];
      for (let c = 0; c < 4; c++) {
        const f = Math.min(1, Math.max(0, vals[c]));
        fl[i + c] = f;
        data[i + c] = Math.round(f * 255);
      }
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  // bilinear CPU sample of channel c at (u, v) in tile units (wraps)
  const sample = (u, v, c) => {
    const x = (u - Math.floor(u)) * size - 0.5, y = (v - Math.floor(v)) * size - 0.5;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const at = (xx, yy) => fl[((((yy % size) + size) % size) * size + (((xx % size) + size) % size)) * 4 + c];
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * fx;
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * fx;
    return a + (b - a) * fy;
  };
  return { texture: tex, sample };
}

// Tileable ocean wave normal map: a sum of directional sine waves with integer wave numbers (so the
// tile repeats exactly), spectrum falling with frequency, mostly aligned with the wind (from the
// north-west). RG = slope (x, z) remapped to 0..1, B = height 0..1, A = crest sharpness (foam).
export function makeWaveNormals(size = 256, seed = 11) {
  const rnd = rng(seed);
  const waves = [];
  const wind = Math.atan2(1, 1); // towards the south-east
  for (let i = 0; i < 56; i++) {
    const kmag = 2 + Math.floor(Math.pow(rnd(), 1.6) * 26); // cycles per tile
    const ang = wind + (rnd() - 0.5) * 2.2 * (0.5 + 0.5 * rnd());
    const m = Math.round(Math.cos(ang) * kmag), n = Math.round(Math.sin(ang) * kmag);
    if (m === 0 && n === 0) continue;
    const k = Math.hypot(m, n);
    waves.push({ m, n, a: 1 / Math.pow(k, 1.25), ph: rnd() * Math.PI * 2 });
  }
  const H = new Float32Array(size * size), DX = new Float32Array(size * size), DZ = new Float32Array(size * size);
  let maxS = 0, minH = 1e9, maxH = -1e9;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2, v = (y / size) * Math.PI * 2;
      let h = 0, dx = 0, dz = 0;
      for (const w of waves) {
        // slightly peaked crests (Gerstner-like): sharpen with a power of the phase
        const ph = w.m * u + w.n * v + w.ph;
        const s = Math.sin(ph), c = Math.cos(ph);
        h += w.a * s;
        dx += w.a * c * w.m;
        dz += w.a * c * w.n;
      }
      const i = y * size + x;
      H[i] = h; DX[i] = dx; DZ[i] = dz;
      maxS = Math.max(maxS, Math.abs(dx), Math.abs(dz));
      minH = Math.min(minH, h); maxH = Math.max(maxH, h);
    }
  }
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const hn = (H[i] - minH) / (maxH - minH);
    data[i * 4] = Math.round((0.5 + 0.5 * (DX[i] / maxS)) * 255);
    data[i * 4 + 1] = Math.round((0.5 + 0.5 * (DZ[i] / maxS)) * 255);
    data[i * 4 + 2] = Math.round(hn * 255);
    data[i * 4 + 3] = Math.round(Math.pow(Math.max(0, hn - 0.62) / 0.38, 1.5) * 255);
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// --- geometry builder: boxes (optionally rotated about Y) with vertex colours, merged into one
// non-indexed BufferGeometry. Used for the decor, the hull details, the cranes and the plane parts.
export class Builder {
  constructor() {
    this.pos = [];
    this.nor = [];
    this.col = [];
    this.uv = [];
  }
  tri(a, b, c, color, uva, uvb, uvc) {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    n = [n[0] / l, n[1] / l, n[2] / l];
    for (const [p, t] of [[a, uva], [b, uvb], [c, uvc]]) {
      this.pos.push(p[0], p[1], p[2]);
      this.nor.push(n[0], n[1], n[2]);
      this.col.push(color.r, color.g, color.b);
      this.uv.push(t ? t[0] : 0, t ? t[1] : 0);
    }
  }
  quad(a, b, c, d, color, uvs) {
    this.tri(a, b, c, color, uvs && uvs[0], uvs && uvs[1], uvs && uvs[2]);
    this.tri(a, c, d, color, uvs && uvs[0], uvs && uvs[2], uvs && uvs[3]);
  }
  // axis-aligned box (then rotated by `ry` about its centre), centre (x, y, z), size (sx, sy, sz);
  // `top` colour optional for the upper face (roofs seen from above), `skipBottom` drops the base
  box(x, y, z, sx, sy, sz, color, { ry = 0, top = null, skipBottom = true, sides = null } = {}) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const c = Math.cos(ry), s = Math.sin(ry);
    const P = (dx, dy, dz) => [x + dx * c + dz * s, y + dy, z - dx * s + dz * c];
    const v = [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(-hx, hy, -hz), P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz)];
    const sc = sides || color;
    this.quad(v[4], v[5], v[6], v[7], sc); // +z
    this.quad(v[1], v[0], v[3], v[2], sc); // -z
    this.quad(v[5], v[1], v[2], v[6], sc); // +x
    this.quad(v[0], v[4], v[7], v[3], sc); // -x
    this.quad(v[7], v[6], v[2], v[3], top || color); // top
    if (!skipBottom) this.quad(v[0], v[1], v[5], v[4], color);
    return v;
  }
  // a square-section beam between two 3D points (any orientation), `w` wide, `h` tall
  beam(a, b, w, h, color) {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = d.length();
    d.normalize();
    const up = Math.abs(d.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const s = new THREE.Vector3().crossVectors(d, up).normalize().multiplyScalar(w / 2);
    const u = new THREE.Vector3().crossVectors(s, d).normalize().multiplyScalar(h / 2);
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const c = (base, ss, uu) => base.clone().addScaledVector(s, ss).addScaledVector(u, uu).toArray();
    const a00 = c(A, -1, -1), a10 = c(A, 1, -1), a11 = c(A, 1, 1), a01 = c(A, -1, 1);
    const b00 = c(B, -1, -1), b10 = c(B, 1, -1), b11 = c(B, 1, 1), b01 = c(B, -1, 1);
    this.quad(a01, a11, b11, b01, color); // top
    this.quad(a10, a00, b00, b10, color); // bottom
    this.quad(a11, a10, b10, b11, color);
    this.quad(a00, a01, b01, b00, color);
    if (len > 0) {
      this.quad(a00, a10, a11, a01, color);
      this.quad(b10, b00, b01, b11, color);
    }
  }
  // a vertical cylinder (low poly), centre of the base at (x, y, z)
  cyl(x, y, z, r, h, color, seg = 10, top = null) {
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const p0 = [x + Math.cos(a0) * r, y, z + Math.sin(a0) * r], p1 = [x + Math.cos(a1) * r, y, z + Math.sin(a1) * r];
      const q0 = [p0[0], y + h, p0[2]], q1 = [p1[0], y + h, p1[2]];
      this.quad(p0, q0, q1, p1, color);
      this.tri([x, y + h, z], q1, q0, top || color);
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
  get count() {
    return this.pos.length / 3;
  }
}

// --- baked planar shadows. Every caster is a list of convex parts (boxes); each part's shadow is
// the 2D convex hull of its 8 corners projected along the sun onto the ground, triangulated as a
// fan (so a part never darkens itself twice). Parts are stacked a few millimetres apart in height,
// each lower than the previous one, and the mesh writes depth: where two parts overlap, the later
// (lower) one fails the depth test, so overlapping shadows do not double-darken either.
export class ShadowBaker {
  constructor(sunDir, groundY = 0.05) {
    this.sun = sunDir.clone().normalize();
    this.y0 = groundY;
    this.parts = []; // arrays of [x, z] hull points
  }
  // project a world point along the sun onto the ground plane
  proj(p) {
    const t = (p[1] - this.y0) / this.sun.y;
    return [p[0] - this.sun.x * t, p[2] - this.sun.z * t];
  }
  addPoints(points3, layer = 0) {
    const pts = points3.map((p) => this.proj(p));
    const hull = convexHull(pts);
    if (hull.length >= 3) this.parts.push({ hull, layer });
  }
  addBox(x, y, z, sx, sy, sz, ry = 0, layer = 0) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const c = Math.cos(ry), s = Math.sin(ry);
    const pts = [];
    for (const dx of [-hx, hx]) for (const dy of [-hy, hy]) for (const dz of [-hz, hz]) pts.push([x + dx * c + dz * s, y + dy, z - dx * s + dz * c]);
    this.addPoints(pts, layer);
  }
  // a thin strip (rail, cable) between two 3D points, `w` wide
  addSegment(a, b, w = 0.2, h = 0.2, layer = 0) {
    const dx = b[0] - a[0], dz = b[2] - a[2];
    const l = Math.hypot(dx, dz) || 1;
    const nx = (-dz / l) * w * 0.5, nz = (dx / l) * w * 0.5;
    this.addPoints([
      [a[0] + nx, a[1], a[2] + nz], [a[0] - nx, a[1], a[2] - nz], [b[0] + nx, b[1], b[2] + nz], [b[0] - nx, b[1], b[2] - nz],
      [a[0] + nx, a[1] - h, a[2] + nz], [b[0] - nx, b[1] - h, b[2] - nz],
    ], layer);
  }
  // parts are drawn from the highest layer down: a later (lower) part fails the depth test where
  // an earlier one already darkened the ground
  geometry(step = 0.01) {
    const pos = [];
    const parts = this.parts.slice().sort((a, b) => b.layer - a.layer);
    parts.forEach(({ hull, layer }) => {
      const y = this.y0 + layer * step;
      for (let i = 1; i < hull.length - 1; i++) {
        pos.push(hull[0][0], y, hull[0][1], hull[i + 1][0], y, hull[i + 1][1], hull[i][0], y, hull[i][1]);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeBoundingSphere();
    return g;
  }
}

function convexHull(pts) {
  const p = pts.map((q) => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

// multiply-blended shadow material (keeps the ground's own colour, tints it a cool blue-grey)
export function shadowMaterial(color = new THREE.Color(0.66, 0.69, 0.75)) {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: true, depthTest: true, fog: false });
  m.blending = THREE.CustomBlending;
  m.blendEquation = THREE.AddEquation;
  m.blendSrc = THREE.ZeroFactor;
  m.blendDst = THREE.SrcColorFactor;
  return m;
}

// sun direction from azimuth (degrees, clockwise from north, i.e. 315 = north-west) and elevation
export function sunDirection(azimuthDeg = 315, elevationDeg = 50) {
  const az = (azimuthDeg * Math.PI) / 180, el = (elevationDeg * Math.PI) / 180;
  // north = -Z, east = +X
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
}

export const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
