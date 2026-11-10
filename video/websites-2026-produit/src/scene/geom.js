// Geometry helpers: profile paths (lines, arcs, cubic Béziers in the (r, y) half-plane),
// lathes with exact profile normals, and parametric grids with numeric normals.
import * as THREE from 'three';

// A profile is a list of segments; each segment is sampled on its own so that the joints are
// hard edges (separate normals) unless the tangents already match.
export class Profile {
  constructor(r, y) {
    this.segs = [];
    this.cur = new THREE.Vector2(r, y);
  }
  line(r, y, n = 1) {
    const a = this.cur.clone(), b = new THREE.Vector2(r, y);
    this.segs.push({ n, at: (t) => a.clone().lerp(b, t) });
    this.cur = b;
    return this;
  }
  cubic(r1, y1, r2, y2, r, y, n = 16) {
    const p0 = this.cur.clone(), p1 = new THREE.Vector2(r1, y1), p2 = new THREE.Vector2(r2, y2), p3 = new THREE.Vector2(r, y);
    this.segs.push({
      n,
      at: (t) => {
        const u = 1 - t;
        return new THREE.Vector2(
          u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
          u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
        );
      },
    });
    this.cur = p3;
    return this;
  }
  // fillet to (r, y) around the corner (rc, yc): a cubic close to a quarter circle
  round(rc, yc, r, y, n = 8) {
    const p0 = this.cur.clone(), c = new THREE.Vector2(rc, yc), p2 = new THREE.Vector2(r, y);
    // a cubic through the corner gives a near-circular fillet
    const k = 0.5523;
    return this.cubic(p0.x + (c.x - p0.x) * k, p0.y + (c.y - p0.y) * k, p2.x + (c.x - p2.x) * k, p2.y + (c.y - p2.y) * k, p2.x, p2.y, n);
  }
  // sampled strips: [{ pts: [Vector2], nrm: [Vector2], len: [cumulative] }]
  strips() {
    const out = [];
    for (const s of this.segs) {
      const pts = [];
      for (let i = 0; i <= s.n; i++) pts.push(s.at(i / s.n));
      const nrm = pts.map((p, i) => {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        // tangent (dr, dy) -> outward normal (dy, -dr) for a profile walked base -> top
        const dr = b.x - a.x, dy = b.y - a.y;
        const l = Math.hypot(dr, dy) || 1;
        return new THREE.Vector2(dy / l, -dr / l);
      });
      out.push({ pts, nrm });
    }
    return out;
  }
}

// Lathe around +Y. phi = 0 faces +Z; u runs 0..1 around, v along the profile (0..1 overall).
export function lathe(profile, segments = 96) {
  const strips = profile.strips();
  let total = 0;
  const lens = strips.map((s) => {
    let l = 0;
    for (let i = 1; i < s.pts.length; i++) l += s.pts[i].distanceTo(s.pts[i - 1]);
    total += l;
    return l;
  });
  const pos = [], nor = [], uv = [], idx = [];
  let base = 0, acc = 0;
  strips.forEach((s, si) => {
    const rows = s.pts.length;
    let along = acc;
    for (let j = 0; j < rows; j++) {
      if (j > 0) along += s.pts[j].distanceTo(s.pts[j - 1]);
      const p = s.pts[j], n = s.nrm[j];
      for (let i = 0; i <= segments; i++) {
        const u = i / segments;
        const phi = u * Math.PI * 2;
        const sn = Math.sin(phi), cs = Math.cos(phi);
        pos.push(p.x * sn, p.y, p.x * cs);
        nor.push(n.x * sn, n.y, n.x * cs);
        uv.push(u, total ? along / total : 0);
      }
    }
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < segments; i++) {
        const a = base + j * (segments + 1) + i;
        const b = a + segments + 1;
        // counter-clockwise seen from the side the profile normal points to
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    base += rows * (segments + 1);
    acc += lens[si];
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// Parametric grid P(u, v) (u around, closed; v along) with numeric normals (no seam).
export function parametric(fn, nu, nv, { closedU = true, flip = false } = {}) {
  const pos = [], nor = [], uv = [], idx = [];
  const p = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3();
  const eu = 1e-4, ev = 1e-4;
  for (let j = 0; j <= nv; j++) {
    const v = j / nv;
    for (let i = 0; i <= nu; i++) {
      const u = i / nu;
      fn(u, v, p);
      pos.push(p.x, p.y, p.z);
      fn(closedU ? (u + eu) % 1 : Math.min(1, u + eu), v, a);
      fn(closedU ? (u - eu + 1) % 1 : Math.max(0, u - eu), v, b);
      fn(u, Math.min(1, v + ev), c);
      fn(u, Math.max(0, v - ev), d);
      const du = a.sub(b), dv = c.sub(d);
      const n = flip ? dv.cross(du) : du.cross(dv);
      if (n.lengthSq() < 1e-20) n.set(0, 1, 0);
      n.normalize();
      nor.push(n.x, n.y, n.z);
      uv.push(u, v);
    }
  }
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a0 = j * (nu + 1) + i, b0 = a0 + nu + 1;
      // winding follows the normal: counter-clockwise seen from the side it points to
      if (flip) idx.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1);
      else idx.push(a0, a0 + 1, b0, b0, a0 + 1, b0 + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// open cylinder band (label), phi = 2 pi (u - 0.5): u = 0.5 faces +Z
export function band(radius, y0, y1, segments = 160) {
  const pos = [], nor = [], uv = [], idx = [];
  for (let j = 0; j <= 1; j++) {
    const y = j ? y1 : y0;
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const phi = (u - 0.5) * Math.PI * 2;
      pos.push(radius * Math.sin(phi), y, radius * Math.cos(phi));
      nor.push(Math.sin(phi), 0, Math.cos(phi));
      uv.push(u, j);
    }
  }
  for (let i = 0; i < segments; i++) {
    const a = i, b = i + segments + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
