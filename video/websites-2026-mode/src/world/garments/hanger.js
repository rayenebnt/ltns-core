// Wooden hanger: lacquered beech bar (straight sloping arms, rounded crown and ends) and a
// chrome swivel hook with a ferrule and a ball tip. Origin = hook tip (the inner top of the curl,
// where it rests on the rail). One geometry for all hangers (aPart 0 wood, 1 chrome).
import * as THREE from 'three';
import { HOOK_H, HANGER_HALF, BAR_H, BAR_D, hangerTopY } from './outlines.js';
import { sweep, superRing, circleRing, framesAlong, computeNormals } from './geo.js';
import { mix, smooth } from './noise.js';

const cache = {};

export function hangerGeometry(quality = 'high') {
  const key = quality === 'low' ? 'low' : 'hi';
  if (cache[key]) return cache[key];
  const lo = key === 'low';
  const pieces = [];
  // bar: vertical superellipse sections along x, ends closed by shrinking the section
  const frames = [];
  const n = lo ? 28 : 56;
  const capN = lo ? 4 : 7;
  const capR = 0.009;
  const section = (x, k = 1) => {
    const ax = Math.min(Math.abs(x), HANGER_HALF);
    const h = mix(BAR_H, 0.0155, smooth(0.03, 1, ax / HANGER_HALF));
    const top = hangerTopY(ax);
    // the crown is a little thicker where the hook enters
    const d = BAR_D * (1 + 0.25 * Math.exp(-((x / 0.02) ** 2)));
    return { y: top - h / 2, a: (h / 2) * k, b: (d / 2) * k };
  };
  for (let i = capN; i >= 1; i--) {
    const t = i / capN, ang = (t * Math.PI) / 2;
    frames.push({ x: -HANGER_HALF - Math.sin(ang) * capR, k: Math.max(0.02, Math.cos(ang)) });
  }
  for (let i = 0; i <= n; i++) frames.push({ x: mix(-HANGER_HALF, HANGER_HALF, i / n), k: 1 });
  for (let i = 1; i <= capN; i++) {
    const t = i / capN, ang = (t * Math.PI) / 2;
    frames.push({ x: HANGER_HALF + Math.sin(ang) * capR, k: Math.max(0.02, Math.cos(ang)) });
  }
  const ring = superRing(1, 1, lo ? 10 : 16, 3.2);
  const bar = { pos: [], uv: [], index: [] };
  const W = ring.length + 1;
  frames.forEach((f, fi) => {
    const s = section(f.x, f.k);
    // the ends dip with the arm slope
    const yEnd = f.x < -HANGER_HALF || f.x > HANGER_HALF ? section(Math.sign(f.x) * HANGER_HALF).y - (Math.abs(f.x) - HANGER_HALF) * 0.24 : s.y;
    for (let r = 0; r <= ring.length; r++) {
      const [a, b] = ring[r % ring.length];
      bar.pos.push(f.x, yEnd + a * s.a, b * s.b);
      bar.uv.push(fi / frames.length, r / ring.length);
    }
    if (fi > 0) for (let r = 0; r < ring.length; r++) {
      const p = (fi - 1) * W + r, q = fi * W + r;
      bar.index.push(p, q + 1, q, p, p + 1, q + 1);
    }
  });
  pieces.push([{ pos: new Float32Array(bar.pos), uv: new Float32Array(bar.uv), index: bar.index }, 0]);

  // chrome hook: ball tip at the back, curl over the rail, S-bend, vertical shank into the crown
  const rw = 0.0023, ri = 0.0135, rc = ri + rw;
  const C = [0, -ri, 0];
  const path = [];
  const a0 = 0.6 * Math.PI, a1 = -0.78 * Math.PI;
  const arcN = lo ? 14 : 26;
  for (let i = 0; i <= arcN; i++) {
    const a = mix(a1, a0, i / arcN);
    path.push([0, C[1] + rc * Math.cos(a), rc * Math.sin(a)]);
  }
  const P0 = path[path.length - 1];
  const dir = [0, -Math.sin(a0), Math.cos(a0)]; // continuing the curl: down and back to centre
  const P3 = [0, -0.062, 0], P2 = [0, -0.047, 0];
  const P1 = [0, P0[1] + dir[1] * 0.012, P0[2] + dir[2] * 0.012];
  const bezN = lo ? 6 : 12;
  for (let i = 1; i <= bezN; i++) {
    const t = i / bezN, u = 1 - t;
    path.push([0, u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1], u * u * u * P0[2] + 3 * u * u * t * P1[2] + 3 * u * t * t * P2[2] + t * t * t * P3[2]]);
  }
  for (let i = 1; i <= 4; i++) path.push([0, mix(P3[1], -HOOK_H - 0.004, i / 4), 0]);
  const hookFrames = framesAlong(path, [1, 0, 0]);
  pieces.push([sweep(hookFrames, circleRing(rw, lo ? 6 : 10), {}), 1]);
  // ball tip
  const tip = path[0];
  const ball = new THREE.SphereGeometry(rw * 1.45, lo ? 8 : 12, lo ? 6 : 8);
  ball.translate(tip[0], tip[1], tip[2]);
  pieces.push([{ pos: ball.attributes.position.array, uv: ball.attributes.uv.array, index: Array.from(ball.index.array), normal: ball.attributes.normal.array }, 1]);
  // ferrule where the hook enters the crown
  const fer = new THREE.CylinderGeometry(0.0052, 0.006, 0.009, lo ? 10 : 16, 1);
  fer.translate(0, -HOOK_H + 0.0025, 0);
  pieces.push([{ pos: fer.attributes.position.array, uv: fer.attributes.uv.array, index: Array.from(fer.index.array), normal: fer.attributes.normal.array }, 1]);

  // merge
  const P = [], N = [], UV = [], K = [], I = [];
  let nv = 0;
  for (const [pc, part] of pieces) {
    const nrm = pc.normal || computeNormals(pc.pos, pc.index);
    for (let i = 0; i < pc.pos.length; i++) { P.push(pc.pos[i]); N.push(nrm[i]); }
    for (let i = 0; i < pc.pos.length / 3; i++) { UV.push(pc.uv[i * 2] || 0, pc.uv[i * 2 + 1] || 0); K.push(part); }
    for (const v of pc.index) I.push(v + nv);
    nv += pc.pos.length / 3;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(K, 1));
  g.setIndex(I);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  cache[key] = g;
  return g;
}

export function disposeHangers() {
  for (const k of Object.keys(cache)) {
    cache[k].dispose();
    delete cache[k];
  }
}
