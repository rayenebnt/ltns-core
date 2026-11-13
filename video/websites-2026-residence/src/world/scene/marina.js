// Marina on the south shore of the cape, right under the tower in the hook frame (the
// reference puts its main luxury cue there): a curved breakwater in pale limestone with a sea
// parapet and a harbour light on its round head, a quay wall along the shore, three pontoons
// with finger piers and a few dozen berthed motor yachts.
// Four draw calls: stone (quay + breakwater + light tower), pontoons, yachts (body, glass).
// The lamps go to the promenade lamps of terrain.js (no extra call).
import * as THREE from 'three';
import { coastAt } from './terrain.js';
import { mulberry32, createNoise2D } from './noise.js';

// breakwater centreline (world x, z): rooted on the rocks of the cape tip, east arm, then the
// south arm curving west to the round head; the harbour entrance faces west
export const BREAKWATER = [[58, 16], [69, 33], [79, 60], [84, 96], [81, 124], [67, 142], [40, 152], [6, 156], [-24, 153], [-42, 147]];
export const BW_HEAD = { x: -44.5, z: 146.2, r: 6.2 };
// calm water for the sea shader (x0, z0, x1, z1)
export const BASIN = [-50, 36, 80, 150];
// the quay follows the coast between these arc lengths (terrain.js coastAt)
export const QUAY_L = [2068, 2240];
export const QUAY_Y = 1.58; // top of the quay (the terrain behind is flattened just below)
const BW_Y = 2.45; // breakwater walkway

function catmull(points, step) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

// distance from (x, z) to the breakwater centreline (for the sea depth map: foam at its toe)
let BW_PATH = null;
export function breakwaterDistance(x, z) {
  if (!BW_PATH) BW_PATH = catmull(BREAKWATER, 3);
  let best = Math.hypot(x - BW_HEAD.x, z - BW_HEAD.z) - BW_HEAD.r + 3.3;
  for (let i = 0; i < BW_PATH.length - 1; i++) {
    const [ax, az] = BW_PATH[i], [bx, bz] = BW_PATH[i + 1];
    const dx = bx - ax, dz = bz - az;
    let t = ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const d = Math.hypot(ax + dx * t - x, az + dz * t - z);
    if (d < best) best = d;
  }
  return best;
}

// Extrudes a profile along a 2D path. The profile is a list of strips, each
// { pts: [[u, y], ...], col: (u, y, s) => [r, g, b], jitter }, u across the path (positive to
// the left of the direction of travel), s the arc length. Hard edges between strips.
function extrude(path, strips, out) {
  const N = path.length;
  const frames = [];
  let s = 0;
  for (let i = 0; i < N; i++) {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(N - 1, i + 1)];
    let tx = b[0] - a[0], tz = b[1] - a[1];
    const l = Math.hypot(tx, tz) || 1;
    tx /= l;
    tz /= l;
    if (i > 0) s += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    frames.push({ x: path[i][0], z: path[i][1], nx: tz, nz: -tx, s });
  }
  const noise = createNoise2D(91);
  for (const { pts, col, jitter = 0 } of strips) {
    const M = pts.length;
    const base = out.pos.length / 3;
    for (const f of frames) {
      for (let j = 0; j < M; j++) {
        const [u, y] = pts[j];
        // 2D normal of the profile at this point (average of the adjacent segments)
        const pa = pts[Math.max(0, j - 1)], pb = pts[Math.min(M - 1, j + 1)];
        let du = pb[0] - pa[0], dy = pb[1] - pa[1];
        const dl = Math.hypot(du, dy) || 1;
        du /= dl;
        dy /= dl;
        // left normal of (du, dy) in the (u, y) plane
        let nu = -dy, ny = du;
        const jit = jitter ? jitter * noise(f.s * 0.45 + j * 3.1, y * 0.8 + u * 0.3) : 0;
        const uu = u + nu * jit, yy = y + ny * jit;
        out.pos.push(f.x + f.nx * uu, yy, f.z + f.nz * uu);
        out.nrm.push(f.nx * nu, ny, f.nz * nu);
        out.col.push(...col(u, y, f.s, noise));
      }
    }
    for (let i = 0; i < N - 1; i++) {
      for (let j = 0; j < M - 1; j++) {
        const a = base + i * M + j, b = a + 1, c = a + M, d = c + 1;
        out.idx.push(a, c, b, b, c, d);
      }
    }
  }
}

const wet = (y, c, k = 0.45, top = 0.4) => {
  const w = y < top - 0.3 ? 1 : y < top ? (top - y) / 0.3 : 0;
  return c.map((v) => v * (1 - (1 - k) * w));
};

function lathe(profile, segs, cx, cz, col, out) {
  const base = out.pos.length / 3;
  const M = profile.length;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    for (let j = 0; j < M; j++) {
      const [r, y] = profile[j];
      const pa = profile[Math.max(0, j - 1)], pb = profile[Math.min(M - 1, j + 1)];
      let dr = pb[0] - pa[0], dy = pb[1] - pa[1];
      const dl = Math.hypot(dr, dy) || 1;
      const nr = dy / dl, ny = -dr / dl;
      out.pos.push(cx + ca * r, y, cz + sa * r);
      out.nrm.push(ca * nr, ny, sa * nr);
      out.col.push(...col(r, y));
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < M - 1; j++) {
      const a = base + i * M + j, b = a + 1, c = a + M, d = c + 1;
      out.idx.push(a, b, c, b, d, c);
    }
  }
}

export function createMarina({ envMap, yachtGeo, yachtMats, lowQuality = false }) {
  const occupancy = lowQuality ? 0.5 : 0.7;
  const rnd = mulberry32(2024);
  const stone = { pos: [], nrm: [], col: [], idx: [] };
  // rip-rap: limestone blocks of uneven tone, dark and wet at the water line
  const armour = (u, y, s, n) => {
    const k = 0.55 + 0.6 * (0.5 + 0.5 * n(s * 0.75 + u * 0.6, y * 1.3 + u * 0.4));
    return wet(y, [0.54 * k, 0.5 * k, 0.43 * k], 0.38, 0.7);
  };

  // ------------------------------------------------------------ breakwater
  const bw = catmull(BREAKWATER, 1.6);
  // ends just short of the round head, which closes it
  while (bw.length > 2 && Math.hypot(bw[bw.length - 1][0] - BW_HEAD.x, bw[bw.length - 1][1] - BW_HEAD.z) < 2.5) bw.pop();
  // run it from the head (east along the south arm, then north up the east arm): u > 0, on
  // the left of the direction of travel, is then the basin side
  bw.reverse();
  extrude(bw, [
    { pts: [[-6.4, -2.6], [-5.8, -1.6], [-5.2, -0.7], [-4.6, 0.1], [-4.0, 0.85], [-3.4, 1.45], [-2.9, 1.85], [-2.55, 2.05]], col: armour, jitter: 0.55 },
    { pts: [[-2.55, 2.05], [-2.55, 3.45]], col: () => [0.8, 0.74, 0.64] },
    { pts: [[-2.55, 3.45], [-1.85, 3.45]], col: () => [0.86, 0.8, 0.7] },
    { pts: [[-1.85, 3.45], [-1.85, BW_Y]], col: () => [0.74, 0.68, 0.58] },
    { pts: [[-1.85, BW_Y], [2.3, BW_Y]], col: (u, y, s, n) => { const k = 0.92 + 0.08 * n(s * 0.3, u); return [0.66 * k, 0.6 * k, 0.51 * k]; } },
    { pts: [[2.3, BW_Y], [2.4, -2.6]], col: (u, y) => wet(y, [0.62, 0.56, 0.48], 0.5, 0.35) },
  ], stone);
  // round head with the harbour light
  lathe([[BW_HEAD.r + 2.0, -2.6], [BW_HEAD.r + 1.0, -0.6], [BW_HEAD.r + 0.3, 1.0], [BW_HEAD.r, 2.05], [BW_HEAD.r - 0.2, BW_Y], [0, BW_Y]], 28, BW_HEAD.x, BW_HEAD.z,
    (r, y) => (y < BW_Y - 0.01 ? wet(y, [0.6, 0.55, 0.47], 0.42, 0.55) : [0.68, 0.62, 0.53]), stone);
  const LT = { r: 1.25, h: 7.2 };
  lathe([[LT.r + 0.25, BW_Y], [LT.r, BW_Y + 0.4], [LT.r * 0.82, BW_Y + LT.h], [LT.r * 1.15, BW_Y + LT.h], [LT.r * 1.15, BW_Y + LT.h + 0.25], [0.0, BW_Y + LT.h + 0.25]], 18, BW_HEAD.x, BW_HEAD.z,
    (r, y) => (y > BW_Y + LT.h - 1.3 ? [0.08, 0.34, 0.2] : [0.86, 0.85, 0.81]), stone);

  // ------------------------------------------------------------ quay wall
  const quay = [];
  for (let l = QUAY_L[0]; l <= QUAY_L[1]; l += 1.5) {
    const c = coastAt(l);
    quay.push([c.x, c.z]);
  }
  // the coast runs with the land on its left: u > 0 is inland
  extrude(quay, [
    { pts: [[-1.2, -2.4], [-1.2, QUAY_Y - 0.2]], col: (u, y) => wet(y, [0.6, 0.55, 0.47], 0.45, 0.4) },
    { pts: [[-1.2, QUAY_Y - 0.2], [-1.1, QUAY_Y - 0.03], [-0.95, QUAY_Y]], col: () => [0.84, 0.79, 0.7] },
    { pts: [[-0.95, QUAY_Y], [7.0, QUAY_Y]], col: (u, y, s, n) => { const k = 0.93 + 0.07 * n(s * 0.25, u * 0.3); return [0.64 * k, 0.59 * k, 0.51 * k]; } },
  ], stone);
  // closed end caps of the quay block
  const capProfile = [[-1.2, -2.4], [7.0, -2.4], [7.0, QUAY_Y], [-0.95, QUAY_Y], [-1.1, QUAY_Y - 0.03], [-1.2, QUAY_Y - 0.2]];
  for (const [l, sign] of [[QUAY_L[0], -1], [quay.length ? QUAY_L[0] + (quay.length - 1) * 1.5 : QUAY_L[1], 1]]) {
    const c = coastAt(l);
    const nx = c.tz, nz = -c.tx;
    const cb = stone.pos.length / 3;
    for (const [u, y] of capProfile) {
      stone.pos.push(c.x + nx * u, y, c.z + nz * u);
      stone.nrm.push(c.tx * sign, 0, c.tz * sign);
      stone.col.push(...wet(y, [0.6, 0.55, 0.47], 0.45, 0.4));
    }
    for (let j = 1; j < capProfile.length - 1; j++) {
      if (sign > 0) stone.idx.push(cb, cb + j, cb + j + 1);
      else stone.idx.push(cb, cb + j + 1, cb + j);
    }
  }

  const stoneGeo = new THREE.BufferGeometry();
  stoneGeo.setAttribute('position', new THREE.Float32BufferAttribute(stone.pos, 3));
  stoneGeo.setAttribute('normal', new THREE.Float32BufferAttribute(stone.nrm, 3));
  stoneGeo.setAttribute('color', new THREE.Float32BufferAttribute(stone.col, 3));
  stoneGeo.setIndex(stone.idx);
  const stoneMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0, envMap, envMapIntensity: 0.75 });
  const stoneMesh = new THREE.Mesh(stoneGeo, stoneMat);
  stoneMesh.name = 'marina-stone';

  // ------------------------------------------------------- pontoons + yachts
  const coastZ = (x) => {
    // z of the quay face at a given x (search along the quay line)
    let best = null;
    for (let l = QUAY_L[0]; l <= QUAY_L[1]; l += 0.5) {
      const c = coastAt(l);
      if (best === null || Math.abs(c.x - x) < Math.abs(best.x - x)) best = c;
    }
    return best.z + 1.4;
  };
  const Z_END = 124;
  const pontoons = [];
  const boxes = []; // [x, y, z, sx, sy, sz]
  const berths = []; // [x, z, heading, scale]
  const lamps = [];
  for (const xp of [-26, 13, 52]) {
    const z0 = coastZ(xp);
    const L = Z_END - z0;
    pontoons.push({ x: xp, z0, z1: Z_END });
    boxes.push([xp, 0.32, (z0 + Z_END) / 2, 2.4, 0.5, L]);
    lamps.push([xp, 0.57, Z_END - 1.2]);
    // berths every 4.6 m along both sides, finger piers between them
    const nb = Math.floor((L - 4) / 4.6);
    for (let k = 0; k < nb; k++) {
      const zb = Z_END - 3.2 - k * 4.6;
      for (const side of [-1, 1]) {
        if (k % 2 === 0) boxes.push([xp + side * (1.2 + 4.0), 0.27, zb + 2.3, 8.0, 0.4, 0.75]);
        if (rnd() < occupancy) {
          const sc = 0.31 + rnd() * 0.17;
          const hd = (side > 0 ? Math.PI : 0) + (rnd() - 0.5) * 0.05;
          berths.push([xp + side * (1.2 + 0.8 + 15 * sc), zb, hd, sc]);
        }
      }
    }
  }
  // three larger yachts lying side-to along the inside of the south arm
  for (const [x, sc, hd] of [[-14, 0.72, Math.PI], [22, 0.8, 0.0], [52, 0.68, Math.PI]]) {
    // inner face of the breakwater at this x
    let zf = 0;
    for (let i = 0; i < bw.length - 1; i++) {
      const [ax, az] = bw[i], [bx, bz] = bw[i + 1];
      if ((ax - x) * (bx - x) <= 0 && az > 130) zf = az + ((bz - az) * (x - ax)) / (bx - ax || 1);
    }
    berths.push([x, zf - 2.4 - 0.7 - 3.3 * sc, hd + (rnd() - 0.5) * 0.03, sc]);
  }

  const pGeo = new THREE.BoxGeometry(1, 1, 1);
  const pMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.34, 0.3, 0.26), roughness: 0.8, envMap, envMapIntensity: 0.6 });
  const pMesh = new THREE.InstancedMesh(pGeo, pMat, boxes.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  boxes.forEach(([x, y, z, sx, sy, sz], i) => {
    m.compose(p.set(x, y, z), q.identity(), s.set(sx, sy, sz));
    pMesh.setMatrixAt(i, m);
  });
  pMesh.name = 'marina-pontoons';

  const yBody = new THREE.InstancedMesh(yachtGeo.body, yachtMats.body, berths.length);
  const yGlass = new THREE.InstancedMesh(yachtGeo.glass, yachtMats.glass, berths.length);
  berths.forEach(([x, z, hd, sc], i) => {
    q.setFromAxisAngle(up, hd);
    // the smaller boats sit a touch lower and shorter in the superstructure
    m.compose(p.set(x, 0, z), q, s.set(sc, sc * (0.92 + 0.1 * (sc - 0.3) / 0.5), sc));
    yBody.setMatrixAt(i, m);
    yGlass.setMatrixAt(i, m);
  });
  yBody.name = 'marina-yachts';
  yGlass.name = 'marina-yacht-glass';

  // ------------------------------------------------------------ lamps
  // along the quay every 8 m, along the breakwater walkway every 14 m, the harbour light
  for (let l = QUAY_L[0] + 3; l <= QUAY_L[1] - 2; l += 8) {
    const c = coastAt(l);
    lamps.push([c.x + c.tz * 2.6, QUAY_Y, c.z - c.tx * 2.6]);
  }
  let acc = 0;
  for (let i = 1; i < bw.length - 3; i++) {
    acc += Math.hypot(bw[i][0] - bw[i - 1][0], bw[i][1] - bw[i - 1][1]);
    if (acc < 14 || bw[i][1] < 40) continue;
    acc = 0;
    const tx = bw[i + 1][0] - bw[i - 1][0], tz = bw[i + 1][1] - bw[i - 1][1];
    const l = Math.hypot(tx, tz);
    lamps.push([bw[i][0] + (tz / l) * 1.5, BW_Y, bw[i][1] - (tx / l) * 1.5]);
  }
  // the harbour light: a lamp head (3.25 m above its base) sitting on the gallery
  lamps.push([BW_HEAD.x, BW_Y + LT.h + 0.25 + 0.2 - 3.25, BW_HEAD.z]);

  // palms on the quay promenade, between the lamps, and a few at the root of the breakwater
  const palms = [];
  for (let l = QUAY_L[0] + 9; l <= QUAY_L[1] - 10; l += 15) {
    const c = coastAt(l);
    palms.push([c.x + c.tz * 5.2, QUAY_Y, c.z - c.tx * 5.2, 0.85 + rnd() * 0.3]);
  }

  // for the sea shader: lamp heads (the promenade lamp head is 3.25 m above its base) and the
  // berthed yachts, mirrored in the calm basin water
  const lampHeads = lamps.map(([x, y, z]) => [x, y + 3.25, z]);
  return { meshes: [stoneMesh, pMesh, yBody, yGlass], lamps, lampHeads, berths, palms, count: berths.length };
}
