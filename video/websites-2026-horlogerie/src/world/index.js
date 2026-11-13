// BALANCIER world: the real 3D world behind the WORLD CONTRACT (src/world-stub/index.js is the reference
// shape of the contract; the brief lists it). It composes the watch (src/world/watch: createWatch) and the
// studio (src/world/studio: createStudio — envs, background, THE TIDE, the sapphire twin, shadows, lights)
// and drives everything from the story progress p (story.js PHASES), plus time for idle motion only (the
// seconds hand, the balance, the rotor, the gentle float, the tide's ripple, the travelling glints).
//
//   createWorld({ renderer, quality, onProgress }) → world
//   world.camera, update(state, dt, time), render(), resize(w, h, dpr), warmup(), setQuality(level),
//   stats(), anchors(), info()
//
// One continuous camera (a product lens, vertical FOV 22°): a set of SHOT keys (p → holder pose, target,
// orbit angles, distance, lens shift) interpolated per channel with a monotone cubic (C1, no overshoot;
// two equal keys make a hold that eases in and out). The target is given in the watch's own frame (it
// follows the watch), the orbit angles in world space (so a turning watch is SEEN turning). The lens shift
// (an off-centre projection, like a shift lens) places the subject left / right / high / low without
// changing its perspective: the text columns stay clear at every window size.
import * as THREE from 'three';
import { PHASES, within } from '../story.js';
import { PARTS, WATCH } from './layout.js';
import { createWatch } from './watch/index.js';
import { createStudio } from './studio/index.js';

export const rendererOptions = { antialias: true };

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (t) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
const sstep = (a, b, x) => smooth((x - a) / (b - a));
const easeOut3 = (t) => 1 - Math.pow(1 - clamp(t), 3);
const ph = (p, n) => within(p, PHASES[n]);
const DEG = Math.PI / 180;

// ------------------------------------------------------------------------------------------ splines
// monotone cubic Hermite (Fritsch–Carlson) through [[x, y], ...]: C1, no overshoot, flat at the ends
function monotone(keys) {
  const n = keys.length;
  const xs = keys.map((k) => k[0]);
  const ys = keys.map((k) => k[1]);
  if (n === 1) return () => ys[0];
  const d = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-9, xs[i + 1] - xs[i]));
  const m = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
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
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

// ------------------------------------------------------------------------------------------ the shots
// Channels: holder Euler rx, ry, rz (deg, order YXZ) and hy (mm, world up); target tx, ty, tz (mm, in the
// watch's frame); orbit az (deg, from world +X towards +Z), el (deg), dist (mm); fov (deg, vertical); sx, sy
// (lens shift, NDC: the target is drawn at (sx, sy)). dist, sx and sy may be 'line' / 'glass': the values
// fitted to the window for the hero line / the glass line (fitLine), 'line*k' = k times that.
// A key inherits every channel it does not set from the key before it.
const LINE_C = (PARTS[0].z + PARTS[PARTS.length - 1].z) / 2; // the line's centre on local Z
const FOV = 22;
// the hero line: the camera on the +X/+Z side (local +Z, the crystal, on the left; the discs as tall
// ellipses); the glass line (04): the same view of the axis from the other side (mirrored: the crystal on
// the right), so the turning watch of 03 runs straight into it
const HERO = { rx: 0, ry: 0, rz: 0, hy: 0, tx: 0, ty: -2, tz: LINE_C, az: 26, el: 4, dist: 'line', fov: FOV, sx: 'line', sy: 'line' };
const GLASS_RY = 244; // holder yaw of the glass line, seen from the camera at az -90

function shotKeys() {
  const P = PHASES;
  const K = [];
  const key = (p, o) => K.push({ p, ...o });
  // 01 the exploded line (hero), a slow drift while it holds
  key(0, { ...HERO });
  key(P.explodedHold[1], { ...HERO, az: 27 });
  // 02 the assembly: the camera eases in on the case while the movement stacks up, then swings round to the
  // three-quarter front as the bracelet halves fly in from the sides
  key(mix(P.assemble[0], P.assemble[1], 0.5), { tx: 0, ty: -2, tz: LINE_C * 0.4, az: 32, el: 2, dist: 'line*0.78', sx: 0.12, sy: -0.1 });
  key(P.assemble[1], { tx: 0, ty: -1.5, tz: -1, az: 62, el: -11, dist: 196, sx: 0.32, sy: 0.02 });
  key(P.frontHold[1], { az: 54, el: -8, dist: 186 });
  // the turn: round the crown side to the back, close on the balance
  key(mix(P.turnOver[0], P.turnOver[1], 0.5), { tx: 2, ty: -3, tz: -2, az: -14, el: 7, dist: 176, sx: 0.2, sy: 0.0 });
  key(P.turnOver[1], { tx: 5.0, ty: -4.8, tz: -1.2, az: -106, el: -6, dist: 116, sx: 0.33, sy: -0.1 });
  key(P.heartHold[1], { az: -98, el: -3, dist: 100 });
  // it turns to lie on its side on its bracelet (dial up, the crown towards the camera), seen from the side
  key(mix(P.lieDown[0], P.lieDown[1], 0.5), { rx: -50, ry: 50, tx: 1, ty: -1, tz: -3, az: -96, el: 6, dist: 168, sx: 0.18, sy: -0.08 });
  key(P.lieDown[1], { rx: -90, ry: 90, tx: 0, ty: 0, tz: -6, az: -90, el: 12, dist: 214, sx: 0.31, sy: -0.17 });
  // the tide: the camera calm
  key(P.tide[1], { el: 11, dist: 200 });
  // 03 the sapphire watch floats up in the right half, turning slowly
  key(mix(P.atelierHold[0], P.atelierHold[1], 0.22), { rx: -14, ry: 140, hy: 8, tx: 0, ty: 0, tz: 0, az: -90, el: 6, dist: 196, sx: 0.34, sy: 0.02 });
  key(P.atelierHold[1], { rx: -10, ry: 176, hy: 8, dist: 204 });
  // 04 the glass line (spread when its labels are in), then the glide close along the glass parts
  key(P.explodeSapphire[1], { rx: 0, ry: GLASS_RY, rz: 0, hy: 0, tx: 0, ty: -2, tz: LINE_C, az: -90, el: 4, dist: 'glass', sx: 'glass', sy: 'glass' });
  key(P.explodeSapphire[1] + 0.04, { ry: GLASS_RY - 2, dist: 'glass*0.97' });
  key(mix(P.glide[0], P.glide[1], 0.73), { ry: GLASS_RY - 12, tx: 0, ty: -3, tz: -30, el: 3, dist: 160, sx: 0.0, sy: -0.3 });
  key(P.glide[1], { ry: GLASS_RY - 22, tx: 0, ty: -4, tz: -62, el: 4, dist: 136, sy: -0.26 });
  // the parts come together, the bracelet halves sweep past the camera; it ends on the dial
  key(mix(P.reassemble[0], P.reassemble[1], 0.55), { ry: 205, tx: 0, ty: -2, tz: -4, el: 2, dist: 160, sx: 0.18, sy: -0.06 });
  key(P.reassemble[1], { rx: -6, ry: 166, tx: 0, ty: 0, tz: 0, az: -90, el: 4, dist: 172, sx: 0.33, sy: 0.0 });
  // 05 the reverse wipe on the night blue: dial close-up, then a slow turn
  key(P.restore[1], { rx: -4, ry: 162, tx: 0, ty: 1, tz: 2, el: 6, dist: 150, sx: 0.39, sy: 0.02 });
  key(P.restoreHold[1], { rx: -10, ry: 194, tx: 0, ty: 0, tz: 0, el: 8, dist: 180, sx: 0.375, sy: 0.02 });
  // the exit: the watch rises and recedes while the white section slides up
  key(0.9, { rx: -16, ry: 206, el: 12, dist: 196, sx: 0.22, sy: 0.3 });
  key(1.0, { rx: -22, ry: 216, el: 16, dist: 240, sx: 0.12, sy: 0.86 });
  // inherit
  for (let i = 1; i < K.length; i++) for (const k of Object.keys(K[0])) if (K[i][k] === undefined) K[i][k] = K[i - 1][k];
  return K;
}
const CHANNELS = ['rx', 'ry', 'rz', 'hy', 'tx', 'ty', 'tz', 'az', 'el', 'dist', 'fov', 'sx', 'sy'];

// ------------------------------------------------------------------------------------------ the world
export async function createWorld({ renderer, quality = 'high', onProgress = () => {} }) {
  onProgress(0.05);
  let W = innerWidth, H = innerHeight;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, W / H, 2, 4000);
  scene.add(camera);

  // the studio (env size chosen once, here), then the watch lit by its light env, then the twin
  const studio = createStudio({ renderer, quality });
  scene.add(studio.group);
  onProgress(0.25);
  const watch = await createWatch({ renderer, quality, envMap: studio.env.light.texture });
  onProgress(0.75);
  const holder = new THREE.Group();
  holder.name = 'holder';
  holder.add(watch.group);
  scene.add(holder);
  const glass = studio.attach(watch);
  const kit = studio.kit;
  const shadows = studio.shadows;
  const lumeBase = watch.materials.lume.emissiveIntensity;
  // the balance still beats 8 times a second, with a ~100° swing: the watch module's 220° moves up to ~90° a
  // frame at 60 Hz and reads as flicker on the heart close-up; this one reads as beating
  watch.balanceAmplitude = 1.75;

  // ------------------------------------------------------------------ the parts' boxes (label boxes, line fit)
  // each part's local Box3 in its own pivot's space, taken on the exploded line (pose 1, straight strips)
  watch.pose(1);
  watch.bracelet(0);
  holder.updateMatrixWorld(true);
  const boxes = {};
  {
    const inv = new THREE.Matrix4(), mm = new THREE.Matrix4(), bb = new THREE.Box3();
    for (const part of watch.parts) {
      const o = part.object;
      o.updateWorldMatrix(true, true);
      inv.copy(o.matrixWorld).invert();
      const box = new THREE.Box3();
      o.traverse((m) => {
        if (!m.isMesh || m.userData.internal || m.userData.kind === 'shadow') return;
        let gb;
        if (m.isInstancedMesh) {
          m.computeBoundingBox();
          gb = m.boundingBox;
        } else {
          if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
          gb = m.geometry.boundingBox;
        }
        bb.copy(gb).applyMatrix4(mm.multiplyMatrices(inv, m.matrixWorld));
        box.union(bb);
      });
      // the hands and the rotor turn inside their pivot: a box that holds them at any angle
      if (part.id === 'hands' || part.id === 'rotor') {
        const r = Math.max(Math.abs(box.min.x), Math.abs(box.max.x), Math.abs(box.min.y), Math.abs(box.max.y));
        box.min.x = box.min.y = -r;
        box.max.x = box.max.y = r;
      }
      boxes[part.id] = box;
    }
  }
  const PZ = Object.fromEntries(PARTS.map((q) => [q.id, q.z]));

  // ------------------------------------------------------------------ the camera rig
  const shot = {};
  const target = new THREE.Vector3();
  let lineDist = 600;
  let splines = null;
  const fitCam = new THREE.PerspectiveCamera(FOV, W / H, 2, 4000);
  const fitHolder = new THREE.Group();
  const _v = new THREE.Vector3(), _c = new THREE.Vector3();

  // place a camera from a shot: holder pose, orbit around the target (watch frame), lens shift
  function place(cam, hold, s, aspect, pointer = null) {
    hold.rotation.set(s.rx * DEG, s.ry * DEG, s.rz * DEG, 'YXZ');
    hold.position.set(0, s.hy, 0);
    hold.updateMatrixWorld(true);
    target.set(s.tx, s.ty, s.tz).applyMatrix4(hold.matrixWorld);
    const az = (s.az + (pointer ? pointer.x * 0.7 : 0)) * DEG;
    const el = (s.el + (pointer ? pointer.y * 0.45 : 0)) * DEG;
    cam.position.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).multiplyScalar(s.dist).add(target);
    cam.up.set(0, 1, 0);
    cam.lookAt(target);
    cam.fov = s.fov;
    cam.aspect = aspect;
    cam.near = Math.max(1.5, s.dist * 0.04);
    cam.far = s.dist * 3 + 800;
    cam.updateProjectionMatrix();
    const e = cam.projectionMatrix.elements;
    e[8] = -s.sx;
    e[9] = -s.sy;
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    cam.updateMatrixWorld(true);
  }

  // the exploded line's framing for this window: the distance, and the lens shift that centres the line
  // (its near end projects longer) and sets its height: the line (bracelet ends included) fits the width
  // with margins, its top stays under the hero text on the left half (and under the header on the right),
  // its bottom above the credit and the hint. o: { ya: the axis' NDC y wanted, topL, topR, bottom (NDC) }
  function fitLine(aspect, o) {
    const s = { ...HERO, sx: 0, sy: 0 };
    const corners = [];
    for (const q of PARTS) {
      const b = boxes[q.id];
      for (let i = 0; i < 8; i++) corners.push(new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, (i & 4 ? b.max.z : b.min.z) + q.z));
    }
    const res = { dist: 600, sx: 0, sy: o.ya };
    const pts = corners.map(() => new THREE.Vector3());
    const fits = (dist) => {
      s.dist = dist;
      s.ry = o.ry || 0;
      s.az = o.az !== undefined ? o.az : HERO.az;
      s.tz = LINE_C;
      place(fitCam, fitHolder, s, aspect);
      let x0 = 1e9, x1 = -1e9;
      corners.forEach((c, i) => {
        pts[i].copy(c).applyMatrix4(fitHolder.matrixWorld).project(fitCam);
        x0 = Math.min(x0, pts[i].x);
        x1 = Math.max(x1, pts[i].x);
      });
      if (x1 - x0 > 2 * 0.86) return false;
      const sx = -(x0 + x1) / 2;
      let syMax = 9, syMin = -9;
      for (const v of pts) {
        const top = v.x + sx < 0 ? o.topL : o.topR;
        syMax = Math.min(syMax, top - v.y);
        syMin = Math.max(syMin, o.bottom - v.y);
      }
      if (syMin > syMax) return false;
      res.sx = sx;
      res.sy = clamp(o.ya, syMin, syMax);
      return true;
    };
    let lo = 120, hi = 3000;
    for (let i = 0; i < 26; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid;
      else lo = mid;
    }
    fits(hi);
    res.dist = hi;
    return res;
  }

  let lineFit = null, glassFit = null;
  function buildSplines() {
    // (NDC limits) the hero: axis at ~0.6 H, top under the hero text (left half) / the header (right half),
    // bottom above the hint and the credit; the glass line: lower, with room above for the Transparence block
    lineFit = fitLine(W / H, { ya: -0.2, topL: 0.02, topR: 0.3, bottom: -0.76 });
    glassFit = fitLine(W / H, { ya: -0.26, topL: 0.06, topR: 0.06, bottom: -0.76, ry: GLASS_RY, az: -90 });
    lineDist = lineFit.dist;
    const K = shotKeys();
    const val = (k, ch) => {
      const v = k[ch];
      if (typeof v === 'string') {
        const m = /^(line|glass)(?:\*([\d.]+))?$/.exec(v);
        const f = m[1] === 'glass' ? glassFit : lineFit;
        const base = ch === 'sx' ? f.sx : ch === 'sy' ? f.sy : f.dist;
        return base * (m[2] ? +m[2] : 1);
      }
      return v;
    };
    splines = {};
    for (const ch of CHANNELS) splines[ch] = monotone(K.map((k) => [k.p, val(k, ch)]));
  }
  buildSplines();

  // ------------------------------------------------------------------ choreography state
  let curP = 0, curE = 1, curB = 0, stripSide = 0, stage = 'studio';
  let level = quality, pendingLevel = quality;

  // the explode amount e (0 assembled … 1 the line) and the bracelet b (0 strips … 1 worn loop … 2 open, resting)
  function explodeAt(p) {
    if (p < PHASES.assemble[0]) return 1;
    if (p < PHASES.assemble[1]) return 1 - smooth(ph(p, 'assemble'));
    if (p < PHASES.explodeSapphire[0]) return 0;
    if (p < PHASES.explodeSapphire[1]) return easeOut3(ph(p, 'explodeSapphire'));
    if (p < PHASES.reassemble[0]) return 1;
    if (p < PHASES.reassemble[1]) return 1 - smooth(ph(p, 'reassemble'));
    return 0;
  }
  function braceletAt(p, e) {
    if (p < PHASES.frontHold[1]) return watch.braceletFor(e);
    if (p < PHASES.heartHold[0]) return 1 + 0.75 * smooth(ph(p, 'turnOver') / 0.8);
    if (p < PHASES.lieDown[0]) return 1.75;
    if (p < PHASES.atelierHold[0]) return 1.75 + 0.25 * smooth(ph(p, 'lieDown') / 0.7);
    // (03 → 05: it stays open, b 1.75, the heart's shape: closed (b 1), the folded clasp and the far half
    // of the loop would show through the glass dial as a bright slab)
    if (p < PHASES.explodeSapphire[0]) return 2 - 0.25 * smooth(ph(p, 'atelierHold') / 0.3);
    if (p < PHASES.explodeSapphire[1]) return watch.braceletFor(e) * (1 + 0.75 * (1 - smooth(ph(p, 'explodeSapphire') / 0.15)));
    if (p < PHASES.reassemble[0]) return watch.braceletFor(e);
    if (p < PHASES.reassemble[1]) return watch.braceletFor(e) * (1 + 0.75 * smooth((ph(p, 'reassemble') - 0.8) / 0.2));
    return 1.75;
  }

  const tmpS = {};
  function update(state, dt, time) {
    const p = clamp(state.p);
    curP = p;
    const pointer = state.pointer || { x: 0, y: 0 };
    // the watch
    const e = explodeAt(p);
    curE = e;
    watch.pose(e, time);
    // the straight strips (b 0) turn to the camera's side of the line: a three-quarter view of the links on
    // the hero (lighter steel than face-on), the link grid on the glass line
    const side = p < PHASES.atelierHold[0] ? 1 : -1;
    if (side !== stripSide) {
      stripSide = side;
      watch.stripYaw = side > 0 ? 0.5 : -0.85;
    }
    const b = braceletAt(p, e);
    if (b !== curB) {
      curB = b;
      watch.bracelet(b);
    }
    watch.setTime(time);
    watch.setMovement(time);

    // the camera
    for (const ch of CHANNELS) tmpS[ch] = splines[ch](p);
    // a gentle float of the assembled watch in the blue (03) and the night (05)
    const floatK = sstep(PHASES.atelierHold[0], PHASES.atelierHold[0] + 0.04, p) * (1 - sstep(PHASES.explodeSapphire[0], PHASES.explodeSapphire[0] + 0.02, p))
      + sstep(PHASES.restore[0], PHASES.restore[1], p);
    tmpS.hy += floatK * 1.2 * Math.sin(time * 0.7);
    tmpS.rz += floatK * 1.5 * Math.sin(time * 0.43);
    Object.assign(shot, tmpS);
    place(camera, holder, tmpS, W / H, pointer);

    // the studio: tide (background line), wipe (materials' line), night, density
    const tide = p < PHASES.tide[0] ? 0 : p < PHASES.restore[0] ? ph(p, 'tide') : 1;
    const wipe = p < PHASES.restore[0] ? tide : 1 - smooth(ph(p, 'restore'));
    const night = sstep(PHASES.restore[0] - 0.015, PHASES.restore[0], p);
    watch.materials.lume.emissiveIntensity = lumeBase + 0.3 * night;
    // shadows: the band under the hero line (fading with the assembly), the contact shadow of the lying watch
    const bandK = 1 - smooth(ph(p, 'assemble') / 0.5);
    if (bandK > 0.001) {
      _c.set(0, -36, LINE_C).applyMatrix4(holder.matrixWorld);
      shadows.band.set({ x: _c.x, y: _c.y, z: _c.z, length: 470, width: 46, opacity: 0.2 * bandK }).faceCamera(camera);
    } else shadows.band.set({ opacity: 0 });
    const lieK = sstep(0.55, 1, ph(p, 'lieDown')) * (1 - sstep(PHASES.atelierHold[0], PHASES.atelierHold[0] + 0.03, p));
    if (lieK > 0.001) shadows.contact.set({ length: 200, width: 62, opacity: 0.8 * lieK }).placeUnder(watch.group, watch.floorZ);
    else shadows.contact.set({ opacity: 0 });
    // travelling glints on the glass
    kit.setEnvRotation(0.35 * Math.sin(0.12 * time) + 1.4 * (p - 0.5));
    studio.update({ tide, wipe, night, time, density: 1.4 + 0.4 * e });
    stage = studio.stage();
  }

  // ------------------------------------------------------------------ anchors (CSS px, top-left origin)
  const P3 = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  const camRight = new THREE.Vector3();
  function proj(v, out) {
    P3.copy(v).project(camera);
    out.x = ((P3.x + 1) / 2) * W;
    out.y = ((1 - P3.y) / 2) * H;
    out.front = P3.z > -1 && P3.z < 1;
    return out;
  }
  const pt = { x: 0, y: 0, front: true };
  const labelsOut = PARTS.map((q) => ({ id: q.id, x: 0, y: 0, side: q.label, visible: false, box: { x: 0, y: 0, w: 0, h: 0 } }));
  function anchors() {
    holder.updateMatrixWorld(true);
    // labels: only while the line is spread (≥ 80 %) AND framed whole (not in the glide's close-ups)
    const lineView = shot.dist >= 0.8 * Math.min(lineFit.dist, glassFit.dist);
    const spread = curE >= 0.8 && lineView;
    for (let i = 0; i < watch.parts.length; i++) {
      const part = watch.parts[i];
      const out = labelsOut[i];
      m4.copy(part.object.matrixWorld);
      const { min, max } = boxes[part.id];
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, front = true;
      for (let k = 0; k < 8; k++) {
        _v.set(k & 1 ? max.x : min.x, k & 2 ? max.y : min.y, k & 4 ? max.z : min.z).applyMatrix4(m4);
        proj(_v, pt);
        front = front && pt.front;
        x0 = Math.min(x0, pt.x);
        y0 = Math.min(y0, pt.y);
        x1 = Math.max(x1, pt.x);
        y1 = Math.max(y1, pt.y);
      }
      // the attach point: the part's edge on its label side (the watch module's anchor, following the
      // spinning caseback / bezel, the hands and the rotor), kept on the box's edge
      _v.copy(part.anchorLocal).applyMatrix4(m4);
      proj(_v, pt);
      out.x = clamp(pt.x, x0, x1);
      out.y = out.side === 'above' ? Math.min(pt.y, y0 + 0.35 * (y1 - y0)) : Math.max(pt.y, y1 - 0.35 * (y1 - y0));
      const on = front && pt.front && x1 > 0 && x0 < W && y1 > 0 && y0 < H && out.x > 0 && out.x < W;
      out.visible = on && spread;
      out.box.x = x0;
      out.box.y = y0;
      out.box.w = x1 - x0;
      out.box.h = y1 - y0;
    }
    // the case: its centre and its radius on screen
    const cm = watch.parts[PARTS.findIndex((q) => q.id === 'caseMiddle')].object;
    _c.setFromMatrixPosition(cm.matrixWorld);
    const c = proj(_c, { x: 0, y: 0, front: true });
    camRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize().multiplyScalar(WATCH.case.diameter / 2);
    let r = Math.hypot(proj(_c.add(camRight), pt).x - c.x, pt.y - c.y);
    // in the glide (the glass line seen close, not framed whole) the « watch » is the glide's subject: the
    // camera target and the band of glass around it (the Transparence block keeps clear of it)
    if (curE >= 0.8 && !lineView) {
      proj(target, c);
      r = 0.16 * H;
    }
    return {
      labels: labelsOut,
      watch: { x: c.x, y: c.y, r, visible: c.front && c.x > -r && c.x < W + r && c.y > -r && c.y < H + r },
      tide: { y: curP > PHASES.tide[0] && curP < PHASES.tide[1] ? studio.lineCssY(W, H) : -1 },
    };
  }

  // ------------------------------------------------------------------ the contract
  function resize(w, h, dpr) {
    W = w;
    H = h;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    studio.resize(renderer);
    buildSplines();
    update({ p: curP, pointer: { x: 0, y: 0 } }, 1, studio.tide.uTime.value);
  }
  resize(W, H, renderer.getPixelRatio());
  onProgress(1);

  // every stage once (studio, the assembly, the heart, the lying watch, the tide with both twins, the blue,
  // the glass line, the glide, the reverse wipe, the night, the exit) so nothing compiles after the loader
  const WARM_P = [0.0, 0.09, 0.17, 0.29, 0.36, 0.41, 0.5, 0.62, 0.68, 0.75, 0.8, 0.84, 0.95];
  async function warmup() {
    if (pendingLevel !== level) {
      // (a geometry rebuild: only here, during the loader; the governor's later steps change the pixel ratio only)
      level = pendingLevel;
      watch.setQuality(level);
      curB = -1;
    }
    const keepP = curP;
    update({ p: 0.41, pointer: { x: 0, y: 0 } }, 1, 0);
    studio.warmup(renderer, scene, camera);
    renderer.compile(scene, camera);
    for (const p of WARM_P) {
      update({ p, pointer: { x: 0, y: 0 } }, 1, 0);
      renderer.render(scene, camera);
      await new Promise((r) => setTimeout(r, 0));
    }
    update({ p: keepP, pointer: { x: 0, y: 0 } }, 1, 0);
  }

  return {
    camera,
    scene,
    watch,
    studio,
    update,
    render() {
      renderer.render(scene, camera);
    },
    resize,
    warmup,
    setQuality(lv) {
      // the pixel ratio is the shell's (resize); the geometry level waits for the next warmup (the loader)
      pendingLevel = lv;
    },
    stats() {
      const i = renderer.info;
      return {
        calls: i.render.calls,
        triangles: i.render.triangles,
        textures: i.memory.textures,
        geometries: i.memory.geometries,
        programs: i.programs ? i.programs.length : 0,
        stage,
        level,
        e: +curE.toFixed(3),
        b: +curB.toFixed(3),
        lineDist: Math.round(lineDist),
      };
    },
    anchors,
    info() {
      return { stage };
    },
    // (debug, ?capture tests) the current shot
    shot: () => ({ ...shot }),
  };
}
