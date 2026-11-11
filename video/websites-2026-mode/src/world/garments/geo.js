// Geometry plumbing: one merged BufferGeometry per garment (one draw call for all its fabric
// and small parts). Every vertex carries: position, normal, uv (atlas uv for the body, band
// coordinates in metres for ribs and cords), color (baked occlusion, grey) and aPart.
import * as THREE from 'three';

export const PART = { BODY: 0, RIB: 1, LABEL: 2, CORD: 3, METAL: 4 };

export function computeNormals(pos, index) {
  const n = new Float32Array(pos.length);
  for (let i = 0; i < index.length; i += 3) {
    const a = index[i] * 3, b = index[i + 1] * 3, c = index[i + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const k of [a, b, c]) { n[k] += nx; n[k + 1] += ny; n[k + 2] += nz; }
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= l; n[i + 1] /= l; n[i + 2] /= l;
  }
  return n;
}

export class Geo {
  constructor() {
    this.P = []; this.N = []; this.UV = []; this.C = []; this.K = []; this.I = [];
    this.nv = 0;
  }
  // piece: { pos, uv, ao?, index, normal? }, part id
  add(piece, part) {
    const { pos, uv, index } = piece;
    const nv = pos.length / 3;
    const normal = piece.normal || computeNormals(pos, index);
    for (let i = 0; i < pos.length; i++) { this.P.push(pos[i]); this.N.push(normal[i]); }
    for (let i = 0; i < nv; i++) {
      this.UV.push(uv[i * 2], uv[i * 2 + 1]);
      const a = piece.ao ? piece.ao[i] : 1;
      this.C.push(a, a, a);
      this.K.push(part);
    }
    for (const v of index) this.I.push(v + this.nv);
    this.nv += nv;
    return this;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.UV, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.C, 3));
    g.setAttribute('aPart', new THREE.Float32BufferAttribute(this.K, 1));
    g.setIndex(this.nv > 65535 ? new THREE.Uint32BufferAttribute(this.I, 1) : new THREE.Uint16BufferAttribute(this.I, 1));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const v3 = { sub, cross, norm };

// Sweep a closed cross-section ring ([a, b] pairs in the frame's R and B axes) along a path.
// frames: [{ p, R, B }]; returns a piece with uv = (arc length in metres, ring parameter)
export function sweep(frames, ring, { closed = false, capEnds = false, uvU = null } = {}) {
  const nr = ring.length, nf = frames.length;
  const pos = [], uv = [], index = [];
  let s = 0;
  for (let f = 0; f < nf; f++) {
    const { p, R, B } = frames[f];
    if (f > 0) s += Math.hypot(p[0] - frames[f - 1].p[0], p[1] - frames[f - 1].p[1], p[2] - frames[f - 1].p[2]);
    for (let r = 0; r <= nr; r++) {
      const [a, b] = ring[r % nr];
      pos.push(p[0] + R[0] * a + B[0] * b, p[1] + R[1] * a + B[1] * b, p[2] + R[2] * a + B[2] * b);
      uv.push(uvU ? uvU(f, s) : s, r / nr);
    }
  }
  const W = nr + 1;
  const segs = closed ? nf : nf - 1;
  for (let f = 0; f < segs; f++) {
    const f2 = (f + 1) % nf;
    for (let r = 0; r < nr; r++) {
      const a = f * W + r, b = f2 * W + r, c = f2 * W + r + 1, d = f * W + r + 1;
      index.push(a, c, b, a, d, c); // outward normals (R x B = T)
    }
  }
  if (capEnds && !closed) {
    for (const [f, flip] of [[0, true], [nf - 1, false]]) {
      const c = pos.length / 3;
      const { p } = frames[f];
      pos.push(p[0], p[1], p[2]);
      uv.push(uvU ? uvU(f, 0) : 0, 0.5);
      for (let r = 0; r < nr; r++) {
        const a = f * W + r, b = f * W + r + 1;
        if (flip) index.push(c, b, a); else index.push(c, a, b);
      }
    }
  }
  return { pos: new Float32Array(pos), uv: new Float32Array(uv), index };
}

// frames along a polyline with a preferred "up" (B roughly along `up`)
export function framesAlong(points, up = [0, 0, 1]) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const T = norm(sub(b, a));
    let R = cross(up, T);
    if (Math.hypot(...R) < 1e-4) R = cross([1, 0, 0], T);
    R = norm(R);
    const B = norm(cross(T, R));
    out.push({ p: points[i], R, B, T });
  }
  return out;
}

export const circleRing = (r, n = 8, sx = 1, sy = 1) => Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2) * r * sx, Math.sin((i / n) * Math.PI * 2) * r * sy]);
// rounded-rectangle-ish ring (superellipse), half sizes a (R axis) and b (B axis)
export const superRing = (a, b, n = 16, p = 3) => Array.from({ length: n }, (_, i) => {
  const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
  return [a * Math.sign(c) * Math.abs(c) ** (2 / p), b * Math.sign(s) * Math.abs(s) ** (2 / p)];
});
