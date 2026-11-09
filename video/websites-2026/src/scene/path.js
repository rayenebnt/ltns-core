// One continuous camera move driven by the scroll progress p in [0, 1] (world frame):
// hero framing -> dive toward floor 14 with the bay and the sunset behind the tower ->
// three-quarter view of the corner -> square in front of the opening -> through it ->
// lateral glide to a square-on view of the fireplace wall.
import * as THREE from 'three';
import { ROOM, TOWER, toWorld } from './config.js';

// Fritsch-Carlson monotone cubic interpolation (C1, no overshoot)
export function monotone(points) {
  const n = points.length;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const d = [];
  const m = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m.push(d[0]);
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i], b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

const DEG = Math.PI / 180;
const EYE = 1.62; // eye height on the balcony
const EYE_ROOM = 1.38; // eye height of the final view
export const DOOR = toWorld(TOWER.ga, ROOM.y + EYE, ROOM.doorZ); // centre of the opening (world)
export const HERO = new THREE.Vector3(78, 40, 300); // raised: the hook reads the marina from slightly above
// final view: square-on to the fireplace wall, on the room axis
const FINAL = toWorld(TOWER.ga - 0.66, ROOM.y + EYE_ROOM, ROOM.axisZ);

const C = 4.0;
const lg = (r) => Math.log(r + C);
const heroDx = HERO.x - DOOR.x, heroDz = HERO.z - DOOR.z;
const rH = Math.hypot(heroDx, heroDz);
const bH = Math.atan2(heroDx, -heroDz) / DEG; // bearing door -> hero (~165.5)

// p -> [bearing from the door (deg), log horizontal distance, camera height].
// The approach swings a little to the west of the door normal (bearing > 180) so the camera
// always looks north-north-east: open sea and sunset behind the tower, coast out of frame.
const B_IN = 186; // heading through the opening
const bearing = monotone([
  [0.0, bH], [0.22, bH + 0.4], [0.32, 170.5], [0.4, 177.5], [0.47, 184.5], [0.54, 189.0], [0.6, 190.2], [0.66, 189.0], [0.72, 187.2], [0.78, B_IN], [1, B_IN],
]);
const rIn = (FINAL.z - DOOR.z) / -Math.cos(B_IN * DEG); // signed distance at the end (inside: < 0)
const LATERAL = FINAL.x - DOOR.x - Math.sin(B_IN * DEG) * rIn;
const logR = monotone([
  [0.0, lg(rH)], [0.22, lg(rH * 0.9)], [0.3, lg(215)], [0.38, lg(135)], [0.46, lg(66)], [0.53, lg(30)],
  [0.59, lg(14.5)], [0.65, lg(6.6)], [0.71, lg(2.5)], [0.78, lg(0)], [0.87, lg(rIn * 0.62)], [0.94, lg(rIn)], [1.0, lg(rIn)],
]);
const height = monotone([
  [0.0, HERO.y], [0.22, HERO.y + 4.0], [0.32, 50], [0.42, 57.5], [0.5, 61.9], [0.58, 61.5], [0.66, 60.5], [0.74, DOOR.y], [0.84, DOOR.y - 0.12], [0.94, FINAL.y], [1.0, FINAL.y],
]);
// lateral glide inside the room (world +X), after the camera has crossed the opening
const lateral = monotone([[0, 0], [0.76, 0], [0.8, 0.05], [0.88, 0.62], [0.94, 1.0], [1.0, 1.0]]);
// then a slow push-in along the room axis (world -Z) at a fixed heading, height and focal
// length: under a pure dolly the ceiling slats, which run toward the view, stay put (no crawl),
// the end of the take still moves, and the last frame is closer (less empty floor)
const PUSH = 0.5;
// (it starts a little before the glide ends, so the camera never pauses between the two)
const push = monotone([[0, 0], [0.9, 0], [0.94, 0.2], [0.97, 0.38], [1.0, PUSH], [1.1, PUSH]]);

// look target, keyed in world space
const tgt = (x, y, z) => [x, y, z];
const TARGETS = [
  [0.0, tgt(49.8, 34.2, 1.7)],
  [0.22, tgt(45.0, 40.3, 1.7)],
  [0.34, tgt(26.0, 57.0, 0.0)],
  [0.44, tgt(9.5, 60.0, 0.0)],
  [0.5, tgt(8.5, 60.6, 4.0)],
  [0.56, tgt(9.0, 60.4, 8.5)],
  [0.62, tgt(7.6, 60.2, 9.5)],
  [0.7, tgt(4.9, 60.0, 4.0)],
  [0.78, tgt(5.3, 59.95, 1.5)],
  [0.88, tgt(FINAL.x - 0.4, FINAL.y, 0.0)],
  [0.94, tgt(FINAL.x, FINAL.y, -1.0)],
  [1.0, tgt(FINAL.x, FINAL.y, -1.0)],
];
const tx = monotone(TARGETS.map(([p, v]) => [p, v[0]]));
const ty = monotone(TARGETS.map(([p, v]) => [p, v[1]]));
const tz = monotone(TARGETS.map(([p, v]) => [p, v[2]]));

const fovK = monotone([[0, 30], [0.22, 30.2], [0.4, 33], [0.52, 37.5], [0.62, 43], [0.72, 48], [0.8, 50], [0.94, 49], [1, 49]]);
// vertical lens shift in NDC (negative: horizon a little higher, the furniture sits in the
// middle of the frame while verticals stay vertical)
const shiftK = monotone([[0, 0], [0.76, 0], [0.9, -0.05], [0.94, -0.06], [1, -0.06]]);

export function distanceToDoor(p) {
  return Math.exp(logR(p)) - C;
}

export const SEGMENTS = { heroEnd: 0.22, counter: [0.03, 0.2], cross: 0.78 };

export function cameraAt(p, out) {
  const r = distanceToDoor(p);
  const b = bearing(p) * DEG;
  out.position.set(DOOR.x + Math.sin(b) * r + LATERAL * lateral(p), height(p), DOOR.z - Math.cos(b) * r - push(p));
  out.target.set(tx(p), ty(p), tz(p));
  out.fov = fovK(p);
  out.shift = shiftK(p);
  out.roll = -0.03 * Math.sin(Math.PI * Math.min(1, Math.max(0, (p - 0.26) / 0.36)));
  out.near = Math.min(1.2, Math.max(0.04, 0.012 * (Math.abs(r) + C)));
  out.r = r;
  return out;
}
