// Merged-geometry builder with per-element attributes for GPU animation.
//
// Every vertex carries, besides position / normal / uv:
//   aPivot (vec3)  the element's pivot (base point, hinge, start of a rail...)
//   aInfo  (vec4)  x: d (distance from the corner B along its leg, or a sequence value),
//                  y: role id (see ROLE in material.js), z: random [0, 1), w: leg / axis id
//   aAnim  (vec4)  role-specific timing (start time, end time, amount...)
// and optionally a vertex colour and aRM (roughness, metalness) for the "kit" material.
// Primitives: prism (any convex cross-section extruded along an axis: boards, chamfered
// boards, posts, split stakes, round posts), tube (along a polyline: wires, branches,
// handles), disc / mound (soil, concrete), quad (flags, cards, decals), raw triangles.
import * as THREE from 'three';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const _a = V(), _b = V(), _c = V(), _n = V();

export class GeoBuilder {
  constructor({ color = false, rm = false, name = '' } = {}) {
    this.name = name;
    this.hasColor = color;
    this.hasRM = rm;
    this.pos = [];
    this.nor = [];
    this.uv = [];
    this.piv = [];
    this.info = [];
    this.anim = [];
    this.col = [];
    this.rmv = [];
    this.idx = [];
    this.el = { pivot: [0, 0, 0], d: 0, role: 0, rnd: 0, leg: 0, anim: [0, 0, 0, 0], color: [1, 1, 1], rm: [0.8, 0] };
  }

  // set the attributes of the following primitives (merged into the current state)
  set(o) {
    if (o.pivot) this.el.pivot = o.pivot.isVector3 ? [o.pivot.x, o.pivot.y, o.pivot.z] : o.pivot;
    for (const k of ['d', 'role', 'rnd', 'leg']) if (o[k] !== undefined) this.el[k] = o[k];
    if (o.anim) this.el.anim = [o.anim[0] || 0, o.anim[1] || 0, o.anim[2] || 0, o.anim[3] || 0];
    if (o.color) this.el.color = o.color.isColor ? [o.color.r, o.color.g, o.color.b] : o.color;
    if (o.rm) this.el.rm = o.rm;
    return this;
  }

  get vertexCount() {
    return this.pos.length / 3;
  }

  vert(p, n, u, v) {
    this.pos.push(p.x, p.y, p.z);
    this.nor.push(n.x, n.y, n.z);
    this.uv.push(u, v);
    const e = this.el;
    this.piv.push(e.pivot[0], e.pivot[1], e.pivot[2]);
    this.info.push(e.d, e.role, e.rnd, e.leg);
    this.anim.push(e.anim[0], e.anim[1], e.anim[2], e.anim[3]);
    if (this.hasColor) this.col.push(e.color[0], e.color[1], e.color[2]);
    if (this.hasRM) this.rmv.push(e.rm[0], e.rm[1]);
    return this.pos.length / 3 - 1;
  }

  tri(a, b, c) {
    this.idx.push(a, b, c);
  }

  quadIdx(a, b, c, d) {
    this.idx.push(a, b, c, a, c, d);
  }

  // Convex cross-section `poly` ([[a, b], ...] counter-clockwise in the (A, B) plane, where
  // A x B points along G) extruded along G from `origin` for `len`. UV: v along G (metres /
  // uv.sv + uv.ov), u across each face (metres / uv.su + uv.ou). smooth: shared radial
  // normals and a continuous u around the section (round posts, tubes). caps: [start, end].
  // scaleEnd: the end section is the start section scaled about its centroid (tips, tapers)
  prism({ origin, A, B, G, poly, len, uv = {}, smooth = false, caps = [true, true], uScale = 1, scaleEnd = 1, faceShift = true, endShift = null }) {
    const su = uv.su || 0.3, sv = uv.sv || 2.4, ou = uv.ou || 0, ov = uv.ov || 0;
    const n = poly.length;
    let gx = 0, gy = 0;
    for (const p of poly) {
      gx += p[0] / n;
      gy += p[1] / n;
    }
    const P = (pt, t) => {
      const k = scaleEnd === 1 ? 1 : 1 + (scaleEnd - 1) * (t / len);
      let x = gx + (pt[0] - gx) * k, y = gy + (pt[1] - gy) * k;
      if (endShift) {
        x += endShift[0] * (t / len);
        y += endShift[1] * (t / len);
      }
      return _a.copy(origin).addScaledVector(A, x).addScaledVector(B, y).addScaledVector(G, t).clone();
    };
    if (smooth) {
      // vertex normals: direction from the section's centroid, u continuous
      let cx = 0, cy = 0;
      for (const p of poly) {
        cx += p[0];
        cy += p[1];
      }
      cx /= n;
      cy /= n;
      let perim = 0;
      const us = [0];
      for (let i = 0; i < n; i++) {
        const p = poly[i], q = poly[(i + 1) % n];
        perim += Math.hypot(q[0] - p[0], q[1] - p[1]);
        us.push(perim);
      }
      const base = this.vertexCount;
      for (let i = 0; i <= n; i++) {
        const p = poly[i % n];
        const nn = _n.set(0, 0, 0).addScaledVector(A, p[0] - cx).addScaledVector(B, p[1] - cy).normalize().clone();
        const u = (us[i] / su) * uScale + ou;
        this.vert(P(p, 0), nn, u, ov);
        this.vert(P(p, len), nn, u, len / sv + ov);
      }
      for (let i = 0; i < n; i++) {
        const a = base + i * 2, b = base + (i + 1) * 2;
        this.quadIdx(a, b, b + 1, a + 1);
      }
    } else {
      for (let i = 0; i < n; i++) {
        const p = poly[i], q = poly[(i + 1) % n];
        const ex = q[0] - p[0], ey = q[1] - p[1];
        const el = Math.hypot(ex, ey);
        // outward normal of a CCW polygon edge: (ey, -ex)
        const nn = _n.set(0, 0, 0).addScaledVector(A, ey / el).addScaledVector(B, -ex / el).clone();
        if (scaleEnd !== 1) {
          // tapered: tilt the side normal toward G
          const dr = ((1 - scaleEnd) * Math.abs((p[0] + q[0]) / 2 - gx) * Math.abs(ey / el) + (1 - scaleEnd) * Math.abs((p[1] + q[1]) / 2 - gy) * Math.abs(ex / el)) / len;
          nn.addScaledVector(G, dr).normalize();
        }
        const u0 = ou, u1 = ou + (el / su) * uScale;
        const vo = faceShift ? ov + i * 0.173 : ov;
        const a = this.vert(P(p, 0), nn, u0, vo);
        const b = this.vert(P(q, 0), nn, u1, vo);
        const c = this.vert(P(q, len), nn, u1, len / sv + vo);
        const d = this.vert(P(p, len), nn, u0, len / sv + vo);
        this.quadIdx(a, b, c, d);
      }
    }
    // end caps (end grain: small uv patch)
    for (let s = 0; s < 2; s++) {
      if (!caps[s]) continue;
      const t = s ? len : 0;
      const nn = G.clone().multiplyScalar(s ? 1 : -1);
      const base = this.vertexCount;
      for (const p of poly) this.vert(P(p, t), nn, p[0] / su + ou, p[1] / su + ov);
      for (let i = 1; i < n - 1; i++) {
        if (s) this.tri(base, base + i, base + i + 1);
        else this.tri(base, base + i + 1, base + i);
      }
    }
    return this;
  }

  // box centred on `c` with axes A (width sa), B (thickness sb), G (length sg, grain)
  box({ c, A, B, G, sa, sb, sg, uv, chamfer = 0, caps }) {
    const a = sa / 2, b = sb / 2;
    let poly;
    if (chamfer > 0) {
      const k = Math.min(chamfer, a * 0.45, b * 0.45);
      poly = [[-a + k, -b], [a - k, -b], [a, -b + k], [a, b - k], [a - k, b], [-a + k, b], [-a, b - k], [-a, -b + k]];
    } else poly = [[-a, -b], [a, -b], [a, b], [-a, b]];
    const origin = c.clone().addScaledVector(G, -sg / 2);
    return this.prism({ origin, A, B, G, poly, len: sg, uv, caps });
  }

  // regular n-gon section (round posts, wires), radius r (or [r0, r1] tapered via scale)
  cylinder({ origin, A, B, G, r, len, n = 8, uv, smooth = true, caps = [true, true] }) {
    const poly = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      poly.push([Math.cos(t) * r, Math.sin(t) * r]);
    }
    return this.prism({ origin, A, B, G, poly, len, uv, smooth, caps });
  }

  // Tube along a polyline `pts` (Vector3[]), radius per point (number or array), `n` sides.
  // UV: u around (perimeter / su), v along (arc length / sv). Parallel-transport frames.
  tube({ pts, r, n = 6, uv = {}, caps = [false, false], twist = 0 }) {
    const su = uv.su || 0.3, sv = uv.sv || 1.2, ou = uv.ou || 0, ov = uv.ov || 0;
    const m = pts.length;
    const rad = (i) => (Array.isArray(r) ? r[i] : r);
    const T = [], N = [], Bn = [];
    for (let i = 0; i < m; i++) {
      const t = V();
      if (i === 0) t.subVectors(pts[1], pts[0]);
      else if (i === m - 1) t.subVectors(pts[m - 1], pts[m - 2]);
      else t.subVectors(pts[i + 1], pts[i - 1]);
      T.push(t.normalize());
    }
    // initial normal: any vector perpendicular to T0
    const up = Math.abs(T[0].y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
    N.push(V().crossVectors(T[0], up).normalize());
    Bn.push(V().crossVectors(T[0], N[0]).normalize());
    for (let i = 1; i < m; i++) {
      const b = V().crossVectors(T[i - 1], T[i]);
      const nn = N[i - 1].clone();
      if (b.lengthSq() > 1e-10) {
        b.normalize();
        const ang = Math.acos(THREE.MathUtils.clamp(T[i - 1].dot(T[i]), -1, 1));
        nn.applyAxisAngle(b, ang);
      }
      N.push(nn.normalize());
      Bn.push(V().crossVectors(T[i], nn).normalize());
    }
    const base = this.vertexCount;
    let s = 0;
    for (let i = 0; i < m; i++) {
      if (i > 0) s += pts[i].distanceTo(pts[i - 1]);
      const rr = rad(i);
      for (let k = 0; k <= n; k++) {
        const a = (k / n) * Math.PI * 2 + twist * s;
        const dir = _b.copy(N[i]).multiplyScalar(Math.cos(a)).addScaledVector(Bn[i], Math.sin(a));
        const p = _c.copy(pts[i]).addScaledVector(dir, rr);
        this.vert(p, dir, ((k / n) * 2 * Math.PI * Math.max(rr, 0.004)) / su + ou, s / sv + ov);
      }
    }
    for (let i = 0; i < m - 1; i++) {
      for (let k = 0; k < n; k++) {
        const a = base + i * (n + 1) + k, b = a + 1, c = a + n + 1 + 1, d = a + n + 1;
        this.quadIdx(a, b, c, d);
      }
    }
    for (let e = 0; e < 2; e++) {
      if (!caps[e]) continue;
      const i = e ? m - 1 : 0;
      const nn = T[i].clone().multiplyScalar(e ? 1 : -1);
      const c0 = this.vert(pts[i], nn, ou, ov);
      const ring = [];
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + twist * (e ? s : 0);
        const dir = _b.copy(N[i]).multiplyScalar(Math.cos(a)).addScaledVector(Bn[i], Math.sin(a));
        ring.push(this.vert(_c.copy(pts[i]).addScaledVector(dir, rad(i) * 0.98), nn, ou + Math.cos(a) * 0.02, ov + Math.sin(a) * 0.02));
      }
      for (let k = 0; k < n; k++) {
        if (e) this.tri(c0, ring[k], ring[(k + 1) % n]);
        else this.tri(c0, ring[(k + 1) % n], ring[k]);
      }
    }
    return this;
  }

  // Radial patch on the ground: rings x segs, height(rn, ang) in metres, radius(ang) function.
  // Normals from finite differences. UV: world xz / uvScale.
  mound({ c, radius, height, rings = 4, segs = 12, uvScale = 0.5, y0 = 0 }) {
    const base = this.vertexCount;
    const P = (rn, a) => {
      const R = typeof radius === 'function' ? radius(a) : radius;
      const x = c.x + Math.cos(a) * R * rn, z = c.z + Math.sin(a) * R * rn;
      return V(x, c.y + y0 + height(rn, a), z);
    };
    const center = P(0, 0);
    this.vert(center, V(0, 1, 0), center.x / uvScale, center.z / uvScale);
    for (let i = 1; i <= rings; i++) {
      const rn = i / rings;
      for (let k = 0; k < segs; k++) {
        const a = (k / segs) * Math.PI * 2;
        const p = P(rn, a);
        const e = 0.01;
        const pr = P(Math.min(1, rn + e), a).sub(P(Math.max(0, rn - e), a));
        const pa = P(rn, a + e).sub(P(rn, a - e));
        const nn = V().crossVectors(pa, pr).normalize();
        if (nn.y < 0) nn.negate();
        this.vert(p, nn, p.x / uvScale, p.z / uvScale);
      }
    }
    for (let k = 0; k < segs; k++) this.tri(base, base + 1 + ((k + 1) % segs), base + 1 + k);
    for (let i = 1; i < rings; i++) {
      const r0 = base + 1 + (i - 1) * segs, r1 = base + 1 + i * segs;
      for (let k = 0; k < segs; k++) {
        const k1 = (k + 1) % segs;
        this.quadIdx(r0 + k, r0 + k1, r1 + k1, r1 + k);
      }
    }
    return this;
  }

  // quad p0 p1 p2 p3 (counter-clockwise seen from the front), uv corners
  quad(p0, p1, p2, p3, { uv = [[0, 0], [1, 0], [1, 1], [0, 1]], normal = null, doubleSided = false } = {}) {
    const nn = normal ? normal.clone() : V().crossVectors(_a.subVectors(p1, p0), _b.subVectors(p3, p0)).normalize();
    const a = this.vert(p0, nn, uv[0][0], uv[0][1]);
    const b = this.vert(p1, nn, uv[1][0], uv[1][1]);
    const c = this.vert(p2, nn, uv[2][0], uv[2][1]);
    const d = this.vert(p3, nn, uv[3][0], uv[3][1]);
    this.quadIdx(a, b, c, d);
    if (doubleSided) {
      const m = nn.clone().negate();
      const a2 = this.vert(p0, m, uv[0][0], uv[0][1]);
      const b2 = this.vert(p1, m, uv[1][0], uv[1][1]);
      const c2 = this.vert(p2, m, uv[2][0], uv[2][1]);
      const d2 = this.vert(p3, m, uv[3][0], uv[3][1]);
      this.quadIdx(a2, d2, c2, b2);
    }
    return this;
  }

  // a grid strip quad with nu x nv subdivisions (cloth-like flags, tapes), f(u, v) -> Vector3
  sheet(f, nu, nv, { uv = (u, v) => [u, v], doubleSided = true } = {}) {
    const sides = doubleSided ? [1, -1] : [1];
    for (const side of sides) {
      const base = this.vertexCount;
      for (let j = 0; j <= nv; j++)
        for (let i = 0; i <= nu; i++) {
          const u = i / nu, v = j / nv;
          const p = f(u, v);
          const e = 0.01;
          const du = f(Math.min(1, u + e), v).sub(f(Math.max(0, u - e), v));
          const dv = f(u, Math.min(1, v + e)).sub(f(u, Math.max(0, v - e)));
          const nn = V().crossVectors(du, dv).normalize().multiplyScalar(side);
          const [tu, tv] = uv(u, v);
          this.vert(p, nn, tu, tv);
        }
      for (let j = 0; j < nv; j++)
        for (let i = 0; i < nu; i++) {
          const a = base + j * (nu + 1) + i, b = a + 1, c = a + nu + 2, d = a + nu + 1;
          if (side > 0) this.quadIdx(a, b, c, d);
          else this.quadIdx(a, d, c, b);
        }
    }
    return this;
  }

  // transform the vertices added since `mark` (= vertexCount before) by a Matrix4
  transformFrom(mark, m) {
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    const p = V(), n = V();
    for (let i = mark; i < this.vertexCount; i++) {
      p.fromArray(this.pos, i * 3).applyMatrix4(m);
      n.fromArray(this.nor, i * 3).applyMatrix3(nm).normalize();
      this.pos[i * 3] = p.x;
      this.pos[i * 3 + 1] = p.y;
      this.pos[i * 3 + 2] = p.z;
      this.nor[i * 3] = n.x;
      this.nor[i * 3 + 1] = n.y;
      this.nor[i * 3 + 2] = n.z;
    }
    return this;
  }

  append(other) {
    // merge another builder with the same attribute layout
    const off = this.vertexCount;
    for (const k of ['pos', 'nor', 'uv', 'piv', 'info', 'anim', 'col', 'rmv']) for (const v of other[k]) this[k].push(v);
    for (const i of other.idx) this.idx.push(i + off);
    return this;
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aPivot', new THREE.Float32BufferAttribute(this.piv, 3));
    g.setAttribute('aInfo', new THREE.Float32BufferAttribute(this.info, 4));
    g.setAttribute('aAnim', new THREE.Float32BufferAttribute(this.anim, 4));
    if (this.hasColor) g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    if (this.hasRM) g.setAttribute('aRM', new THREE.Float32BufferAttribute(this.rmv, 2));
    const nv = this.vertexCount;
    g.setIndex(nv > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    g.name = this.name;
    return g;
  }
}

export { V };
