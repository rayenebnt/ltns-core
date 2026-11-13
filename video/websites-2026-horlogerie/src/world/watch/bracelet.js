// BALANCIER watch: the three-row steel bracelet (brushed outer links, polished centre links) and the folding
// clasp. Each half is a chain laid along a parametric curve in the watch's (y, z) plane, described by its
// start point, start angle and curvature along the arc length; three target shapes are blended:
//   b = 0  straight (the exploded line: a vertical strip centred on the axis, outer face towards +Z),
//   b = 1  mounted at the lugs and curved back into the closed, worn loop (clasp closed behind the case),
//   b = 2  open and resting: the head up, both halves curving down to the floor on each side.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { WATCH } from '../layout.js';
import { SPRING_BAR } from './case.js';
import { setTangents } from './geo.js';

const DS = 0.5;
const LMAX = 84;
const NS = Math.round(LMAX / DS) + 1;
const PITCH = WATCH.bracelet.pitch;
const END = 4.6; // the solid end link at the lugs
const CLASP = 27.6;
export const LOOP = { A: 33, B: 28 }; // the worn loop: an ellipse in (y, z) through the spring bars
export const FLOOR = { z: -15.0 }; // the open (b = 2) strips lie on z = FLOOR.z (curve) → link bottoms at z - 1.65

// resample a polyline [[y, z], …] by arc length → { p0, th0, k[] }
function stateFromPolyline(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const at = (s) => {
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const t = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
  };
  const th = new Float64Array(NS);
  let prev = null;
  for (let i = 0; i < NS; i++) {
    const a = at(i * DS), b = at(i * DS + DS);
    let t = Math.atan2(b[1] - a[1], b[0] - a[0]);
    if (prev !== null) { while (t - prev > Math.PI) t -= 2 * Math.PI; while (t - prev < -Math.PI) t += 2 * Math.PI; }
    th[i] = t; prev = t;
  }
  const k = new Float64Array(NS);
  for (let i = 0; i < NS - 1; i++) k[i] = (th[i + 1] - th[i]) / DS;
  return { p0: pts[0].slice(), th0: th[0], k };
}

function integrate(st, out) {
  let y = st.p0[0], z = st.p0[1], th = st.th0;
  for (let i = 0; i < NS; i++) {
    out.y[i] = y; out.z[i] = z; out.th[i] = th;
    const th2 = th + st.k[i] * DS * 0.5;
    y += Math.cos(th2) * DS; z += Math.sin(th2) * DS;
    th += st.k[i] * DS;
  }
  return out;
}

// the three target states of the 12 o'clock half (the 6 o'clock half is its mirror image)
function statesFront(len) {
  // b = 0: a gently bowed strip, centred on the axis, attachment at the bottom, outer face towards +Z
  const k0 = -0.0034;
  const s0 = { p0: [0, 0], th0: -k0 * len * 0.5, k: new Float64Array(NS).fill(k0) };
  const tmp = integrate(s0, { y: new Float64Array(NS), z: new Float64Array(NS), th: new Float64Array(NS) });
  const mid = Math.round(len / 2 / DS);
  s0.p0 = [-tmp.y[mid], -tmp.z[mid]];
  // b = 1: the worn loop (ellipse centred at zc, through the spring bars)
  const { A, B } = LOOP;
  const phiL = Math.asin(SPRING_BAR.y / A);
  const zc = SPRING_BAR.z - B * Math.cos(phiL);
  const loop = [];
  for (let i = 0; i <= 400; i++) { const phi = phiL + (i / 400) * (Math.PI * 1.25); loop.push([A * Math.sin(phi), zc + B * Math.cos(phi)]); }
  const s1 = stateFromPolyline(loop);
  // b = 2: open, resting: from the lugs out and down to the floor, then flat along it
  const P0 = [SPRING_BAR.y, SPRING_BAR.z], a0 = -0.1;
  const P3 = [SPRING_BAR.y + 30, FLOOR.z];
  const P1 = [P0[0] + 11 * Math.cos(a0), P0[1] + 11 * Math.sin(a0)];
  const P2 = [P3[0] - 13, P3[1]];
  const open = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120, u = 1 - t;
    open.push([u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0], u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1]]);
  }
  open.push([P3[0] + LMAX + 10, FLOOR.z]);
  const s2 = stateFromPolyline(open);
  return [s0, s1, s2];
}
const mirror = (st) => ({ p0: [-st.p0[0], st.p0[1]], th0: Math.PI - st.th0, k: st.k.map((v) => -v) });

function bendGeometry(g, R) {
  // bend around the x axis so that the piece follows a curve of radius R (centre towards -z)
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), z = p.getZ(i);
    const a = y / R;
    const c = Math.cos(a), s = Math.sin(a);
    p.setY(i, (R + z) * s); p.setZ(i, (R + z) * c - R);
    const ny = n.getY(i), nz = n.getZ(i);
    n.setY(i, ny * c + nz * s); n.setZ(i, -ny * s + nz * c);
  }
  return g;
}

export function linkGeometries(Q) {
  const seg = Q.linkSeg;
  const outer = new RoundedBoxGeometry(6.3, PITCH - 0.42, 3.3, seg, 0.42);
  const centre = new RoundedBoxGeometry(6.7, PITCH - 0.42, 3.4, seg, 0.62);
  centre.translate(0, 0, 0.12);
  // crown the polished centre link, chamfer the top edges of the outer links
  {
    const p = centre.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const top = Math.max(0, Math.min(1, (z + 0.2) / 1.6));
      p.setZ(i, z + 0.45 * top * (1 - Math.min(1, (x / 3.4) ** 2)));
    }
    const q = outer.attributes.position;
    for (let i = 0; i < q.count; i++) {
      const x = q.getX(i), z = q.getZ(i);
      const top = Math.max(0, Math.min(1, (z - 0.6) / 1.05));
      const crown = Math.max(0, Math.min(1, (z + 0.4) / 2.0));
      q.setZ(i, z - top * Math.max(0, Math.abs(x) - 2.35) * 0.55 + 0.22 * crown * (1 - Math.min(1, (x / 3.2) ** 2)));
    }
    centre.computeVertexNormals();
    outer.computeVertexNormals();
  }
  setTangents(outer, () => [1, 0, 0]);
  setTangents(centre, () => [1, 0, 0]);
  const cover = bendGeometry(new RoundedBoxGeometry(15.6, CLASP - 0.6, 2.0, seg, 0.75), 38);
  cover.translate(0, 0, 0.75);
  setTangents(cover, () => [1, 0, 0]);
  const blade = bendGeometry(new RoundedBoxGeometry(13.8, CLASP - 3.0, 1.4, seg, 0.4), 38);
  blade.translate(0, 0, -0.9);
  setTangents(blade, () => [1, 0, 0]);
  return { outer, centre, cover, blade };
}

// one half: InstancedMeshes for the outer (brushed, + the end link) and centre (polished) links, the clasp
export class BraceletHalf {
  constructor({ front, links, clasp, geos, mats, parent, add, keyPrefix }) {
    this.front = front;
    this.sigma = front ? 1 : -1;
    this.links = links;
    this.hasClasp = clasp;
    this.len = END + links * PITCH + (clasp ? CLASP : 0);
    const st = statesFront(this.len);
    this.states = front ? st : st.map(mirror);
    this.buf = { y: new Float64Array(NS), z: new Float64Array(NS), th: new Float64Array(NS) };
    this.mix = { p0: [0, 0], th0: 0, k: new Float64Array(NS) };
    // the straight strips (b = 0) turn about their vertical axis to show their face to a front-side camera
    this.yaw = new THREE.Group();
    this.yaw.name = `${keyPrefix}.yaw`;
    parent.add(this.yaw);
    this.outer = add(`${keyPrefix}.outer`, 'steelBrushed', geos.outer, this.yaw, 'steelBrushedLinks', 2 * links + 1);
    this.centre = add(`${keyPrefix}.centre`, 'steelPolished', geos.centre, this.yaw, 'steelPolished', links);
    if (clasp) {
      this.cover = add(`${keyPrefix}.clasp`, 'steelPolished', geos.cover, this.yaw);
      this.blade = add(`${keyPrefix}.blade`, 'steelBrushed', geos.blade, this.yaw, 'steelBrushedLinks');
      this.cover.matrixAutoUpdate = false;
      this.blade.matrixAutoUpdate = false;
    }
    this.m = new THREE.Matrix4();
    this.lastB = null;
  }
  frameAt(s, out) {
    const f = s / DS;
    const i = Math.max(0, Math.min(NS - 2, Math.floor(f)));
    const t = Math.min(1, f - i);
    const B = this.buf;
    const y = B.y[i] + (B.y[i + 1] - B.y[i]) * t, z = B.z[i] + (B.z[i + 1] - B.z[i]) * t, th = B.th[i] + (B.th[i + 1] - B.th[i]) * t;
    out.y = y; out.z = z; out.c = Math.cos(th); out.s = Math.sin(th);
    return out;
  }
  setMatrix(fr, x, sx, sy, sz) {
    const sg = this.sigma;
    // columns: X (across) = sigma·x̂, Y (along) = tangent, Z (outer normal) = sigma·(−sin, cos)
    this.m.set(
      sg * sx, 0, 0, x * sg,
      0, fr.c * sy, -sg * fr.s * sz, fr.y,
      0, fr.s * sy, sg * fr.c * sz, fr.z,
      0, 0, 0, 1,
    );
    return this.m;
  }
  update(b, yaw = 0) {
    const yw = b < 1 ? yaw * (1 - b) * (1 - b) : 0;
    this.yaw.rotation.y = yw;
    if (this.lastB !== null && Math.abs(b - this.lastB) < 1e-6) return;
    this.lastB = b;
    const [S0, S1, S2] = this.states;
    let A, Bs, t;
    if (b <= 1) { A = S0; Bs = S1; t = Math.max(0, b); } else { A = S1; Bs = S2; t = Math.min(1, b - 1); }
    const M = this.mix;
    M.p0[0] = A.p0[0] + (Bs.p0[0] - A.p0[0]) * t;
    M.p0[1] = A.p0[1] + (Bs.p0[1] - A.p0[1]) * t;
    M.th0 = A.th0 + (Bs.th0 - A.th0) * t;
    for (let i = 0; i < NS; i++) M.k[i] = A.k[i] + (Bs.k[i] - A.k[i]) * t;
    integrate(M, this.buf);
    // opening onto the floor (1 < b ≤ 2): the chain cannot sink below the floor, it lies on it
    if (b > 1) {
      const B = this.buf;
      const u = Math.max(0, Math.min(1, (b - 1.3) / 0.4));
      const zf = -120 + (FLOOR.z + 120) * u * u * (3 - 2 * u);
      for (let i = 0; i < NS; i++) if (B.z[i] < zf) B.z[i] = zf;
      for (let i = 0; i < NS - 1; i++) {
        const dy = B.y[i + 1] - B.y[i], dz = B.z[i + 1] - B.z[i];
        if (dy * dy + dz * dz > 1e-8) {
          let t = Math.atan2(dz, dy);
          while (t - B.th[i] > Math.PI) t -= 2 * Math.PI;
          while (t - B.th[i] < -Math.PI) t += 2 * Math.PI;
          B.th[i] = t;
        }
      }
      B.th[NS - 1] = B.th[NS - 2];
    }
    const fr = {};
    const taper = (s) => 1 - 0.2 * Math.min(1, s / 72);
    // end link
    this.frameAt(END / 2, fr);
    this.outer.setMatrixAt(0, this.setMatrix(fr, 0, 20.3 / 6.3, (END - 0.3) / (PITCH - 0.42), 1.12));
    for (let i = 0; i < this.links; i++) {
      const s = END + PITCH * (i + 0.5);
      this.frameAt(s, fr);
      const w = taper(s);
      this.outer.setMatrixAt(1 + i * 2, this.setMatrix(fr, 6.6 * w, w, 1, 1));
      this.outer.setMatrixAt(2 + i * 2, this.setMatrix(fr, -6.6 * w, w, 1, 1));
      this.centre.setMatrixAt(i, this.setMatrix(fr, 0, w, 1, 1));
    }
    this.outer.instanceMatrix.needsUpdate = true;
    this.centre.instanceMatrix.needsUpdate = true;
    if (this.hasClasp) {
      this.frameAt(END + this.links * PITCH + CLASP / 2, fr);
      this.cover.matrix.copy(this.setMatrix(fr, 0, 1, 1, 1));
      this.blade.matrix.copy(this.m);
      this.cover.matrixWorldNeedsUpdate = true;
      this.blade.matrixWorldNeedsUpdate = true;
    }
  }
  // the bottom end of the straight strip (b = 0), in the part's space (for the DOM label line)
  get bottomY() { return -this.len / 2 - 1.5; }
}

export const BRACELET_DIMS = { END, CLASP, PITCH };
