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
// reference), eased between keys, plus a slow breathing drift and a small pointer parallax.
// The chapter 2 window: while the dark intro shows the styles view through a rounded hole,
// the projection is shifted (setViewOffset) so the hole frames the whole view, like a card
// that grows to full screen; only the hole is drawn (scissor).
import * as THREE from 'three';
import { GRADE, gradeUniformsInto } from './grade.js';
import { createGarden } from './garden/index.js';
import { createFencesAsync } from './fences/index.js';
import { GZ } from './fences/repair.js';
import { PRESETS } from './garden/presets.js';

export const rendererOptions = { antialias: true };

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const ease = (t) => t * t * (3 - 2 * t);
const nextFrame = () => new Promise((r) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => r()) : setTimeout(r, 0)));

// ---------------------------------------------------------------------------------- poses
// pos -> tgt (metres), sh = shadow fit [centre x, centre z, radius]
const GATE_C = GZ + 0.6; // centre of the gate opening (z)
export const POSES = {
  // chapter 1: the string line from the bottom-right corner toward the house, the taped stake
  // at the right edge, the house left of centre under its trees
  hero: { pos: [7.8, 1.7, 14.6], tgt: [-0.6, -1.6, -34], sh: [-1, -10, 32] },
  hero_b: { pos: [7.74, 1.68, 14.0], tgt: [-0.4, -1.5, -34], sh: [-1, -10, 32] },
  posts: { pos: [7.45, 1.42, 10.3], tgt: [1.6, 0.95, -32], sh: [3, -9, 28] },
  posts_b: { pos: [7.4, 1.4, 8.7], tgt: [2.2, 0.95, -32], sh: [3, -9, 28] },
  rails: { pos: [7.6, 1.32, 5.3], tgt: [3.6, 0.95, -26], sh: [5, -8, 24] },
  rails_b: { pos: [7.55, 1.3, 4.0], tgt: [3.8, 0.95, -26], sh: [5, -8, 24] },
  boards: { pos: [6.0, 1.38, 6.6], tgt: [1.8, 1.0, -28], sh: [3, -8, 28] },
  boards_b: { pos: [5.7, 1.4, 7.0], tgt: [1.4, 1.0, -28], sh: [3, -8, 28] },
  finale: { pos: [6.2, 6.3, 28.0], tgt: [-2.4, 0.2, -14], sh: [-4, -2, 36] },
  finale_b: { pos: [5.9, 6.2, 27.6], tgt: [-2.5, 0.2, -14], sh: [-4, -2, 36] },
  // chapter 2: low and close inside the yard, the fence running away on the right
  styles_in: { pos: [5.7, 1.8, 17.4], tgt: [8.0, 1.2, -24], sh: [5, -6, 26] },
  styles: { pos: [6.2, 1.35, 14.5], tgt: [8.6, 1.05, -24], sh: [5, -6, 26] },
  styles_b: { pos: [6.3, 1.36, 13.3], tgt: [8.6, 1.05, -24], sh: [5, -6, 26] },
  // chapter 4: the broken section at the left, the gate (hinges on its right) at the right
  repair0: { pos: [-15.2, 1.85, -3.9], tgt: [-24, 0.55, -4.8], sh: [-23.5, -5.2, 9] },
  repair1: { pos: [-15.5, 1.83, -3.95], tgt: [-24, 0.58, -4.8], sh: [-23.5, -5.2, 9] },
  repair2: { pos: [-16.4, 1.75, -3.4], tgt: [-24, 0.6, -4.3], sh: [-23.5, -4.5, 8] },
  repair3: { pos: [-16.7, 1.72, -3.5], tgt: [-24, 0.62, -4.4], sh: [-23.5, -4.5, 8] },
  gate0: { pos: [-19.6, 1.6, GZ + 1.95], tgt: [-24, 0.72, GZ + 1.1], sh: [-23.6, GATE_C, 6] },
  gate1: { pos: [-19.8, 1.58, GZ + 1.85], tgt: [-24, 0.73, GZ + 1.1], sh: [-23.6, GATE_C, 6] },
  gate2: { pos: [-19.4, 1.64, GZ + 2.1], tgt: [-24, 0.72, GZ + 1.15], sh: [-23.6, GATE_C, 6] },
};

// tracks: [progress, pose]; between keys the pose is eased (holds at the beats), and the
// boards -> finale key uses a path that rises over the front fence
const INSTALL_TRACK = [
  [0.0, 'hero'],
  [0.075, 'hero_b'],
  [0.17, 'posts'],
  [0.345, 'posts_b'],
  [0.43, 'rails'],
  [0.545, 'rails_b'],
  [0.62, 'boards'],
  [0.79, 'boards_b'],
  [0.93, 'finale'],
  [1.0, 'finale_b'],
];
const SWING = { from: 'boards_b', to: 'finale', via: [[6.0, 2.4, 14.8], [6.3, 3.6, 19.8]] };
const REPAIR_TRACK = [
  [0.0, 'repair0'],
  [0.2, 'repair1'],
  [0.32, 'repair2'],
  [0.5, 'repair3'],
  [0.7, 'gate0'],
  [0.88, 'gate1'],
  [1.0, 'gate2'],
];

const V = () => new THREE.Vector3();

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
  // chapter 1 windows: the cap rail is done when its log item ticks (0.86), the cleanup when
  // the last one ticks (0.95)
  fences.config.uniforms.uWinCap.value.set(0.8, 0.86, 0.03, 0);
  fences.config.uniforms.uWinClean.value.set(0.84, 0.95, 0.035, 0);
  gradeUniformsInto(scene);
  garden.setStripes(0.62); // the mowing stripes read, without striping the whole frame
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

  // the boards -> finale swing rises over the front fence (rebuilt if the poses are edited)
  let swingCurve = null, swingKey = '';
  function swing() {
    const key = JSON.stringify([POSES[SWING.from].pos, SWING.via, POSES[SWING.to].pos]);
    if (key !== swingKey) {
      swingKey = key;
      const pts = [POSES[SWING.from].pos, ...SWING.via, POSES[SWING.to].pos].map((p) => new THREE.Vector3().fromArray(p));
      swingCurve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    }
    return swingCurve;
  }

  // pose along a track at progress p -> eye, look, shadow fit
  function trackPose(track, p) {
    let i = 0;
    while (i < track.length - 2 && p > track[i + 1][0]) i++;
    const [p0, a] = track[i];
    const [p1, b] = track[i + 1];
    const k = ease(clamp((p - p0) / (p1 - p0)));
    const A = POSES[a], B = POSES[b];
    if (a === SWING.from && b === SWING.to) swing().getPointAt(k, eye);
    else eye.fromArray(A.pos).lerp(tmpA.fromArray(B.pos), k);
    look.fromArray(A.tgt).lerp(tmpA.fromArray(B.tgt), k);
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

  // lens: 42 degrees vertical at 16:10; narrower windows keep the 16:10 width, wider ones
  // (the chapter 2 window card) keep the 16:9 width
  function lens(aspect) {
    const t = Math.tan(THREE.MathUtils.degToRad(21));
    let fov = 42;
    if (aspect < 1.6) fov = THREE.MathUtils.radToDeg(2 * Math.atan((t * 1.6) / aspect));
    else if (aspect > 1.78) fov = THREE.MathUtils.radToDeg(2 * Math.atan((t * 1.78) / aspect));
    return fov;
  }

  function placeCamera(st, time) {
    const seg = st.seg;
    if (seg === 'styles') {
      const k = smooth(0, 1, st.drift);
      if (k < 1) poseLerp('styles_in', 'styles', 0.35 + 0.65 * k);
      else {
        // slow dolly along the five types
        const s = st.style;
        const u = s.from === s.to ? s.to : s.from + (s.to - s.from) * s.k;
        poseLerp('styles', 'styles_b', clamp(u / 4));
      }
    } else if (seg === 'repair') trackPose(REPAIR_TRACK, st.repair);
    else trackPose(INSTALL_TRACK, st.install);

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
    if (win) {
      const aspect = win.w / win.h;
      camera.aspect = aspect;
      camera.fov = lens(aspect);
      camera.setViewOffset(win.w, win.h, -win.x, -win.y, W, H);
      const cover = (win.w * win.h) / (W * H);
      scissor = cover < 0.92 ? win : null;
      GRADE.b[0] = 0.16 * smooth(0.6, 1, cover);
    } else {
      camera.aspect = W / H;
      camera.fov = lens(W / H);
      camera.clearViewOffset();
      scissor = null;
      GRADE.b[0] = 0.16;
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

  function applyState(st) {
    const seg = st.seg;
    if (seg === 'repair') {
      setMode('repair');
      fences.setRepair(st.repair);
      setPreset('eclaircie', smooth(0.7, 1, st.repair));
    } else if (seg === 'styles') {
      setMode('styles');
      fences.setStyle(st.style.from, st.style.to, st.style.k);
      setPreset('ete', 1);
    } else {
      setMode('install');
      fences.setInstall(st.install);
      setPreset('ete', 1);
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
