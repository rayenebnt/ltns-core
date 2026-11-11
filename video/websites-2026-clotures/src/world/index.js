// Cordeau world: the garden (sky and light presets, lawn and grass, trees, hedge, the maison de
// maître, the countryside) and the fences (the new fence built in chapter 1 and restyled in
// chapter 2, the old fence repaired in chapter 4), composed for the page shell.
//
//   createWorld({ renderer, quality, onProgress }) -> world
//   world.camera                       THREE.PerspectiveCamera
//   world.update(state, dt, time)      state = { seg, install, style: { from, to, k }, drift,
//                                      repair, pointer: { x, y }, window } (see main.js)
//   world.render()                     one renderer.render (shadow pass included)
//   world.resize(w, h, pixelRatio)
//   world.warmup()                     compiles every program, uploads every buffer and texture
//   world.anchors()                    [{ id, x, y, visible }] in canvas CSS px (repair hotspots)
//   world.info()                       { totalLength: 77, ... }
//   world.stats()                      { calls, triangles, textures, geometries, programs, ... }
//   world.setQuality(level)            'max' | 'high' | 'medium' | 'low': grass, shadow map,
//                                      leaves, litter (the shell sets the pixel ratio with it)
//
// Camera rigs: one keyframed track per segment (contract views refined against the
// reference). The eye glides along a C1 path through the keys (it slows down at the beats but
// never stops between the first and the last key), plus a slow breathing drift and a small
// pointer parallax. The chapter 2 window: while the dark intro shows the styles view through
// a rounded hole, the projection is shifted (setViewOffset) so the hole frames the whole view,
// like a card that grows to full screen; only the hole is drawn (scissor).
import * as THREE from 'three';
import { GRADE, gradeUniformsInto } from './grade.js';
import { createGarden } from './garden/index.js';
import { createFencesAsync } from './fences/index.js';
import { GZ } from './fences/repair.js';
import { PRESETS } from './garden/presets.js';

export const rendererOptions = { antialias: true };

const VIGNETTE = 0.16;
const GRADE_BASE = { warmHi: GRADE.a[2] };

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const nextFrame = () => new Promise((r) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => r()) : setTimeout(r, 0)));

// ---------------------------------------------------------------------------------- poses
// pos -> tgt (metres), sh = shadow fit [centre x, centre z, radius]. Each '_b' pose is a short
// continuation of the move that arrives at its beat (a slow dolly, never a step back).
const GATE_C = GZ + 0.6; // centre of the gate opening (z)
export const POSES = {
  // chapter 1: the string line from the bottom-right corner toward the house, the taped stake
  // at the right edge, the house under its big trees with sky above the roof
  hero: { pos: [7.4, 1.55, 17.0], tgt: [-1.2, 0.5, -34], sh: [-1, -8, 32] },
  hero_b: { pos: [7.38, 1.54, 16.3], tgt: [-0.9, 0.56, -34], sh: [-1, -8, 32] },
  posts: { pos: [7.42, 1.44, 11.2], tgt: [1.4, 0.95, -32], sh: [3, -9, 28] },
  posts_b: { pos: [7.45, 1.4, 8.6], tgt: [2.2, 0.95, -32], sh: [3, -9, 28] },
  rails: { pos: [7.55, 1.33, 5.6], tgt: [3.5, 0.95, -26], sh: [5, -8, 24] },
  rails_b: { pos: [7.4, 1.32, 4.6], tgt: [3.4, 0.97, -26.5], sh: [5, -8, 24] },
  boards: { pos: [6.55, 1.36, 4.15], tgt: [2.0, 1.0, -28], sh: [3, -8, 28] },
  boards_b: { pos: [6.0, 1.42, 3.85], tgt: [1.5, 1.02, -28], sh: [3, -8, 28] },
  // outside the front-right corner, lower and closer than a drone view: corner B in the lower
  // centre, both legs wrapping the yard, the house framed by its trees
  finale: { pos: [11.5, 3.4, 24.5], tgt: [-6.5, 0.4, -18], sh: [-3, -2, 34] },
  finale_b: { pos: [11.64, 3.43, 24.82], tgt: [-6.6, 0.4, -18], sh: [-3, -2, 34] },
  // chapter 2: across the yard, the fence crossing the frame at mid-height and running away to
  // the left, the house cropped at the far left under the title, a big sky
  styles_in: { pos: [0.5, 1.75, 13.4], tgt: [12.2, 1.2, -12.5], sh: [6, -2, 24] },
  styles: { pos: [1.2, 1.3, 11.0], tgt: [12.5, 1.15, -12.5], sh: [6, -2, 24] },
  styles_b: { pos: [1.5, 1.3, 10.2], tgt: [12.7, 1.15, -13], sh: [6, -2, 24] },
  // chapter 4: close to the old fence, the branch and the broken section at the left, the gate
  // hanging off its hinges (hinges on its right) at the right
  repair0: { pos: [-17.6, 1.35, -5.0], tgt: [-24, 0.95, -5.6], sh: [-23.5, -5.6, 8] },
  repair1: { pos: [-17.78, 1.37, -4.9], tgt: [-24, 0.95, -5.4], sh: [-23.5, -5.4, 8] },
  repair2: { pos: [-18.15, 1.42, -4.45], tgt: [-24, 0.92, -4.75], sh: [-23.5, -4.6, 8] },
  repair3: { pos: [-18.45, 1.45, -4.2], tgt: [-24, 0.9, -4.6], sh: [-23.5, -4.6, 8] },
  gate0: { pos: [-19.6, 1.6, GZ + 1.95], tgt: [-24, 0.72, GZ + 0.75], sh: [-23.6, GATE_C, 6] },
  gate1: { pos: [-19.82, 1.58, GZ + 1.7], tgt: [-24, 0.73, GZ + 0.5], sh: [-23.6, GATE_C, 6] },
  gate2: { pos: [-19.97, 1.57, GZ + 1.6], tgt: [-24, 0.73, GZ + 0.42], sh: [-23.6, GATE_C, 6] },
};

// tracks: [progress, pose]; the boards -> finale move rises over the front fence through the
// swing's via points (eye only, at the given progress)
const INSTALL_TRACK = [
  [0.0, 'hero'],
  [0.075, 'hero_b'],
  [0.17, 'posts'],
  [0.345, 'posts_b'],
  [0.43, 'rails'],
  [0.545, 'rails_b'],
  [0.6, 'boards'],
  [0.71, 'boards_b'],
  [0.96, 'finale'],
  [1.0, 'finale_b'],
];
const SWING = { from: 'boards_b', to: 'finale', via: [[6.35, 2.05, 8.6], [8.3, 3.05, 17.4]], at: [0.765, 0.87] }; // via points spaced by arc length
const REPAIR_TRACK = [
  [0.0, 'repair0'],
  [0.2, 'repair1'],
  [0.32, 'repair2'],
  [0.5, 'repair3'],
  [0.7, 'gate0'],
  [0.88, 'gate1'],
  [1.0, 'gate2'],
];
// vertical field of view (degrees at 16:10) per segment: a little wider for chapter 1
const FOV = { install: 45, styles: 42, repair: 42 };

const V = () => new THREE.Vector3();

// Monotone cubic through (xs, ys) (Fritsch-Carlson slopes, weighted harmonic mean), zero
// slope at both ends: no overshoot, C1, and a strictly increasing ys gives a slope > 0 at every
// interior key.
function monotoneCubic(xs, ys) {
  const n = xs.length;
  const d = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-9, xs[i + 1] - xs[i]));
  const m = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) continue;
    const h0 = xs[i] - xs[i - 1], h1 = xs[i + 1] - xs[i];
    const w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  }
  return (x) => {
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = clamp((x - xs[i]) / h);
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

// A camera track: the eye on a centripetal Catmull-Rom curve through the key positions,
// travelled by arc length; the arc length and each axis of the look-at point are monotone
// cubics of the progress. keys: [[p, pos, tgt]]
function buildTrack(keys) {
  const ps = keys.map((k) => k[0]);
  const curve = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3().fromArray(k[1])), false, 'centripetal');
  const per = 240;
  curve.arcLengthDivisions = (keys.length - 1) * per;
  const lengths = curve.getLengths();
  const total = lengths[lengths.length - 1];
  // arc length at each key (strictly increasing: a tiny step where two keys coincide)
  const s = keys.map((_, i) => lengths[i * per]);
  for (let i = 1; i < s.length; i++) s[i] = Math.max(s[i], s[i - 1] + 1e-4);
  const sOf = monotoneCubic(ps, s);
  const tg = [0, 1, 2].map((c) => monotoneCubic(ps, keys.map((k) => k[2][c])));
  return {
    total,
    eye(p, out) {
      return curve.getPointAt(clamp(sOf(clamp(p)) / Math.max(total, 1e-6)), out);
    },
    look(p, out) {
      const q = clamp(p);
      return out.set(tg[0](q), tg[1](q), tg[2](q));
    },
  };
}

export async function createWorld({ renderer, quality = 'high', onProgress = () => {} }) {
  const progress = (x) => {
    try {
      onProgress(clamp(x));
    } catch (e) {
      /* the loader is optional */
    }
  };
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.name = 'cordeau';
  const camera = new THREE.PerspectiveCamera(42, 16 / 10, 0.15, 6000);
  camera.position.fromArray(POSES.hero.pos);
  camera.lookAt(new THREE.Vector3().fromArray(POSES.hero.tgt));
  let level = ['max', 'high', 'medium', 'low'].includes(quality) ? quality : 'high';

  // ------------------------------------------------------------------ modules
  const garden = await createGarden({ renderer, scene, quality: level, onProgress: (x) => progress(0.62 * x) });
  // the grade rides on the tone-mapping step (ACES inside): set before any canvas render
  renderer.toneMapping = THREE.CustomToneMapping;
  const fences = await createFencesAsync({ renderer, scene, quality: level, contact: true, grassLift: 0.035, onProgress: (x) => progress(0.62 + 0.33 * x) });
  // chapter 1 windows: the boards end with their camera hold (0.70), the cap rail goes on while
  // the camera rises over the fence and is done when its log item ticks (0.80), the cleanup
  // when the last one ticks (0.95)
  fences.config.uniforms.uWinBoards.value.set(0.52, 0.7, 0.03, 0);
  fences.config.uniforms.uWinCap.value.set(0.72, 0.8, 0.03, 0);
  fences.config.uniforms.uWinClean.value.set(0.84, 0.95, 0.035, 0);
  gradeUniformsInto(scene);
  garden.setStripes(0.45); // the mowing stripes read, without striping the whole frame
  progress(0.97);

  // ------------------------------------------------------------------ state
  const size = { w: 1440, h: 900, pr: 1 };
  const cur = { seg: 'install', mode: '', preset: '' };
  let anchorsOn = false;
  const look = V(), eye = V(), tmpA = V(), tmpB = V(), tmpC = V(), fwd = V(), right = V(), upv = V();
  const shadowC = V();
  let shadowR = 30;
  let windowRect = null;
  let scissor = null;

  // C1 tracks (rebuilt if the poses are edited through the dev handles)
  const tracks = { key: '', install: null, repair: null };
  function trackKeys(track, swing) {
    const keys = track.map(([p, n]) => [p, POSES[n].pos, POSES[n].tgt]);
    if (swing) {
      // the swing's via points join the eye path; their look-at points lie between the two poses
      const A = POSES[swing.from], B = POSES[swing.to];
      const pa = track.find((k) => k[1] === swing.from)[0], pb = track.find((k) => k[1] === swing.to)[0];
      swing.via.forEach((v, i) => {
        const at = swing.at[i], k = (at - pa) / (pb - pa);
        keys.push([at, v, A.tgt.map((x, c) => x + (B.tgt[c] - x) * k)]);
      });
      keys.sort((a, b) => a[0] - b[0]);
    }
    return keys;
  }
  function ensureTracks() {
    const key = JSON.stringify([POSES, SWING, INSTALL_TRACK, REPAIR_TRACK]);
    if (key === tracks.key) return;
    tracks.key = key;
    tracks.install = buildTrack(trackKeys(INSTALL_TRACK, SWING));
    tracks.repair = buildTrack(trackKeys(REPAIR_TRACK, null));
  }

  // pose along a track at progress p -> eye, look, shadow fit
  function trackPose(track, p, built) {
    built.eye(p, eye);
    built.look(p, look);
    let i = 0;
    while (i < track.length - 2 && p > track[i + 1][0]) i++;
    const [p0, a] = track[i];
    const [p1, b] = track[i + 1];
    const k = clamp((p - p0) / (p1 - p0));
    const A = POSES[a], B = POSES[b];
    shadowC.set(A.sh[0] + (B.sh[0] - A.sh[0]) * k, 0, A.sh[1] + (B.sh[1] - A.sh[1]) * k);
    // the radius changes in one step half way (no scale shimmer while the view drifts)
    shadowR = k < 0.5 ? A.sh[2] : B.sh[2];
  }

  function poseLerp(a, b, k) {
    const A = POSES[a], B = POSES[b];
    eye.fromArray(A.pos).lerp(tmpA.fromArray(B.pos), k);
    look.fromArray(A.tgt).lerp(tmpA.fromArray(B.tgt), k);
    shadowC.set(A.sh[0] + (B.sh[0] - A.sh[0]) * k, 0, A.sh[1] + (B.sh[1] - A.sh[1]) * k);
    shadowR = k < 0.5 ? A.sh[2] : B.sh[2];
  }

  // lens: FOV[seg] degrees vertical at 16:10; narrower windows keep the 16:10 width, wider
  // ones (the chapter 2 window card) keep the 16:9 width
  function lens(aspect, base = 42) {
    const t = Math.tan(THREE.MathUtils.degToRad(base / 2));
    let fov = base;
    if (aspect < 1.6) fov = THREE.MathUtils.radToDeg(2 * Math.atan((t * 1.6) / aspect));
    else if (aspect > 1.78) fov = THREE.MathUtils.radToDeg(2 * Math.atan((t * 1.78) / aspect));
    return fov;
  }

  function placeCamera(st, time) {
    const seg = st.seg;
    ensureTracks();
    if (seg === 'styles') {
      const k = smooth(0, 1, st.drift);
      if (k < 1) poseLerp('styles_in', 'styles', 0.35 + 0.65 * k);
      else {
        // slow dolly along the five types, continuous with the page (never stops on a type)
        let u;
        if (typeof st.stylesP === 'number') u = clamp(st.stylesP);
        else {
          const s = st.style;
          u = clamp((s.from === s.to ? s.to : s.from + (s.to - s.from) * s.k) / 4);
        }
        poseLerp('styles', 'styles_b', u);
      }
    } else if (seg === 'repair') trackPose(REPAIR_TRACK, st.repair, tracks.repair);
    else trackPose(INSTALL_TRACK, st.install, tracks.install);

    // breathing drift (deterministic for a fixed time) and pointer parallax
    const close = seg === 'repair' ? 0.55 : 1;
    eye.x += 0.05 * Math.sin(time * 0.23) * close;
    eye.y += 0.022 * Math.sin(time * 0.31 + 1.0) * close;
    eye.z += 0.045 * Math.sin(time * 0.19 + 2.0) * close;
    const ptr = st.pointer || { x: 0, y: 0 };
    fwd.copy(look).sub(eye).normalize();
    right.crossVectors(fwd, upv.set(0, 1, 0)).normalize();
    eye.addScaledVector(right, 0.16 * ptr.x * close).addScaledVector(upv, 0.06 * ptr.y * close);
    look.addScaledVector(right, 0.05 * ptr.x * close);
    camera.position.copy(eye);
    camera.lookAt(look);

    // lens and the chapter 2 window
    const win = seg === 'styles' && st.window && st.window.w > 2 && st.window.h > 2 ? st.window : null;
    windowRect = win;
    const W = size.w, H = size.h;
    const base = FOV[seg] || 42;
    if (win) {
      const aspect = win.w / win.h;
      camera.aspect = aspect;
      camera.fov = lens(aspect, base);
      camera.setViewOffset(win.w, win.h, -win.x, -win.y, W, H);
      const cover = (win.w * win.h) / (W * H);
      scissor = cover < 0.92 ? win : null;
      GRADE.b[0] = VIGNETTE * smooth(0.6, 1, cover);
    } else {
      camera.aspect = W / H;
      camera.fov = lens(W / H, base);
      camera.clearViewOffset();
      scissor = null;
      GRADE.b[0] = VIGNETTE;
    }
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  // ------------------------------------------------------------------ light and fences
  function setPreset(name, k) {
    const key = `${name}:${k.toFixed(4)}`;
    if (key === cur.preset) return;
    cur.preset = key;
    garden.setPreset(name, k);
  }
  function setMode(mode) {
    if (mode === cur.mode) return;
    cur.mode = mode;
    fences.setMode(mode);
  }

  // the finale's warm finish (install 0.74 -> 0.96): a warmer sun from behind the camera, about
  // 45 degrees high (the yard stays out of the big trees' shadows), warmer highlights. Uniforms only (the environment map stays the summer one).
  const WARM = { sunDir: [-0.2, 0.7, 0.68], sunCol: [1.0, 0.82, 0.6], sunI: 6.0, warmHi: 1.2, expMul: 1.03 };
  let warmK = -1;
  function setWarm(k) {
    if (Math.abs(k - warmK) < 1e-4) return;
    warmK = k;
    garden.setSunOverride(k > 0 ? WARM : null, k);
    GRADE.a[2] = GRADE_BASE.warmHi + (WARM.warmHi - GRADE_BASE.warmHi) * k;
  }

  function applyState(st) {
    const seg = st.seg;
    if (seg === 'repair') {
      setMode('repair');
      fences.setRepair(st.repair);
      setPreset('eclaircie', smooth(0.7, 1, st.repair));
      setWarm(0);
    } else if (seg === 'styles') {
      setMode('styles');
      fences.setStyle(st.style.from, st.style.to, st.style.k);
      setPreset('ete', 1);
      setWarm(0);
    } else {
      setMode('install');
      fences.setInstall(st.install);
      setPreset('ete', 1);
      setWarm(smooth(0.74, 0.96, st.install));
    }
  }

  // ------------------------------------------------------------------ world API
  const world = {
    camera,
    scene,
    garden,
    fences,
    poses: POSES,
    grade: GRADE,
    presets: PRESETS,
    refreshPreset() {
      cur.preset = '';
    },
    swing: SWING,
    tracks: { install: INSTALL_TRACK, repair: REPAIR_TRACK },
    update(state, dt = 1 / 60, time = 0) {
      cur.seg = state.seg;
      anchorsOn = state.seg === 'repair';
      if (state.seg === 'hidden') return;
      applyState(state);
      placeCamera(state, time);
      garden.fitShadow(shadowC, shadowR);
      garden.update(dt, time, camera);
      fences.update(dt, time);
    },
    render() {
      renderer.setRenderTarget(null);
      if (scissor) {
        const m = 6;
        const x = Math.max(0, scissor.x - m), y = Math.max(0, size.h - (scissor.y + scissor.h) - m);
        renderer.setScissor(x, y, Math.min(size.w, scissor.w + 2 * m), Math.min(size.h, scissor.h + 2 * m));
        renderer.setScissorTest(true);
      }
      renderer.render(scene, camera);
      if (scissor) renderer.setScissorTest(false);
    },
    resize(w, h, pr) {
      size.w = Math.max(1, w);
      size.h = Math.max(1, h);
      size.pr = pr || 1;
      renderer.setPixelRatio(size.pr);
      renderer.setSize(size.w, size.h, false);
      const db = renderer.getDrawingBufferSize(tmpC);
      GRADE.res[0] = db.x;
      GRADE.res[1] = db.y;
      camera.aspect = size.w / size.h;
      camera.fov = lens(camera.aspect);
      camera.updateProjectionMatrix();
    },
    async warmup() {
      // every station once (programs, shadow programs, buffers, textures, the preset blend)
      if (typeof location !== 'undefined' && /[?&]warm=0\b/.test(location.search)) return; // dev stills only
      const base = { install: 1, style: { from: 0, to: 0, k: 1 }, drift: 1, repair: 0, pointer: { x: 0, y: 0 }, window: null };
      const stations = [
        { seg: 'install', install: 0 },
        { seg: 'install', install: 0.3 },
        { seg: 'install', install: 0.5 },
        { seg: 'install', install: 0.7 },
        { seg: 'install', install: 0.9 },
        { seg: 'install', install: 1 },
        { seg: 'styles', drift: 0.4, window: { x: 60, y: 340, w: size.w - 120, h: size.h * 0.95 - 340 } },
        { seg: 'styles', style: { from: 0, to: 1, k: 0.5 } },
        { seg: 'styles', style: { from: 1, to: 2, k: 0.5 } },
        { seg: 'styles', style: { from: 2, to: 3, k: 0.5 } },
        { seg: 'styles', style: { from: 3, to: 4, k: 0.5 } },
        { seg: 'styles', style: { from: 4, to: 4, k: 1 } },
        { seg: 'repair', repair: 0 },
        { seg: 'repair', repair: 0.4 },
        { seg: 'repair', repair: 0.6 },
        { seg: 'repair', repair: 0.85 },
        { seg: 'repair', repair: 1 },
      ];
      // all fence meshes at once first: every fence program and its depth twin
      world.update({ ...base, seg: 'install', install: 0.6 }, 1, 0);
      const restore = fences.showAll();
      world.render();
      restore();
      cur.mode = '';
      await nextFrame();
      for (const st of stations) {
        world.update({ ...base, ...st }, 1, 0);
        world.render();
        await nextFrame();
      }
      cur.preset = '';
      cur.mode = '';
    },
    anchors() {
      const out = [];
      if (!anchorsOn) return out;
      const a = fences.anchors();
      camera.getWorldDirection(fwd);
      for (const [id, p] of Object.entries(a)) {
        tmpA.copy(p);
        const ahead = tmpB.copy(p).sub(camera.position).dot(fwd) > 0.2;
        tmpA.project(camera);
        const x = (tmpA.x * 0.5 + 0.5) * size.w, y = (-tmpA.y * 0.5 + 0.5) * size.h;
        const visible = ahead && x > 8 && x < size.w - 8 && y > 8 && y < size.h - 8;
        out.push({ id, x, y, visible });
      }
      return out;
    },
    info() {
      const f = fences.info();
      return { totalLength: f.total, legs: [f.right, f.front], built: f.built, windows: f.windows, types: f.types };
    },
    stats() {
      const i = renderer.info;
      return {
        calls: i.render.calls,
        triangles: i.render.triangles,
        textures: i.memory.textures,
        geometries: i.memory.geometries,
        programs: i.programs ? i.programs.length : 0,
        worldLevel: level,
        shadowR,
        garden: garden.stats(),
        fences: fences.stats(),
      };
    },
    setQuality(lv) {
      if (!['max', 'high', 'medium', 'low'].includes(lv)) return;
      level = lv;
      garden.setQuality(lv);
      fences.setQuality(lv);
    },
    get quality() {
      return level;
    },
  };
  progress(1);
  return world;
}
