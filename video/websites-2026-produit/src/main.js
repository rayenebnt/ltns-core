import * as THREE from 'three';
import { createStudioEnv } from './scene/env.js';
import { createWords } from './scene/words.js';
import { createBottle } from './scene/bottle.js';
import { createTin } from './scene/tin.js';
import { bottleLabel, tinLid, tinBand, setLabelAnisotropy } from './scene/labels.js';
import { createSplash } from './scene/splash.js';
import { createContactShadows, CONTACT_LAYER } from './scene/shadows.js';
import { createStage } from './scene/stage.js';
import { slotOf, newPose, carouselPose, storyPose, finale, exitAmount, fades, N_PRODUCTS } from './scene/timeline.js';
import { PALETTE, PRODUCTS, FEATURED, CAMERA, KEY_DIR } from './scene/config.js';
import { smooth, smoother, mix, clamp, monotone, easeInOutCubic } from './scene/util.js';
import { createUI, createCursor } from './ui.js';

const params = new URLSearchParams(location.search);
const CAPTURE = params.has('capture');
const FIXED_T = params.has('t') ? parseFloat(params.get('t')) : null;
const Q = params.get('q');
const AUTO = params.get('auto') === '1';
const FPS = params.get('fps') === '1';

// quality levels: only the pixel density changes (MSAA is always on, the scene is light).
// The 1.75 step lets a borderline Retina laptop lose 23 % of its pixels instead of 44 %.
const LEVELS = [
  { name: 'low', dpr: 1 },
  { name: 'medium', dpr: 1.5 },
  { name: 'high', dpr: 1.75 },
  { name: 'max', dpr: 2 },
];
const LEVEL_OF = { low: 0, medium: 1, high: 2, max: 3 };
const FORCED_Q = Q in LEVEL_OF;
const effDpr = (i) => Math.min(window.devicePixelRatio || 1, LEVELS[i].dpr);
// carousel zone at the top of the page: the controls work below RETURN_P (about 180 px of
// scroll at 900 px tall), the story takes the ginger shot back above it
const RETURN_P = 0.04;

const mod = (a, n) => ((a % n) + n) % n;

function showNoGL() {
  document.getElementById('nogl').hidden = false;
  document.getElementById('loader').classList.add('is-done');
  document.body.classList.add('no-gl');
  window.__ready = 'nogl';
}

function hasWebGL2() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return false;
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext(); // do not keep a throwaway context alive
    return true;
  } catch (e) {
    return false;
  }
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const loaderFill = document.getElementById('loader-fill');
const setLoad = (x) => {
  if (loaderFill) loaderFill.style.width = `${Math.round(x * 100)}%`;
};

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
window.__ready = false;

if (!hasWebGL2()) showNoGL();
else
  start().catch((e) => {
    console.error(e);
    showNoGL();
  });

async function loadFonts() {
  if (!document.fonts || !document.fonts.load) return;
  try {
    await Promise.all([500, 600, 700, 800, 900].map((w) => document.fonts.load(`${w} 64px 'Inter Tight'`, 'ARDEUR É')));
  } catch (e) {
    /* the labels fall back to the system sans */
  }
}

async function start() {
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false, alpha: false });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(new THREE.Color(PALETTE.page), 1);
  renderer.info.autoReset = false;
  setLabelAnisotropy(Math.min(16, renderer.capabilities.getMaxAnisotropy()));

  let levelIndex = FORCED_Q ? LEVEL_OF[Q] : LEVELS.length - 1;
  let level = LEVELS[levelIndex];
  let dpr = effDpr(levelIndex);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, innerWidth / innerHeight, 4, 400);

  await loadFonts();
  setLoad(0.08);
  await nextFrame();

  const env = createStudioEnv(renderer);
  setLoad(0.2);
  await nextFrame();

  const words = createWords(renderer);
  scene.add(words.group);
  setLoad(0.38);
  await nextFrame();

  const art = { gingembre: bottleLabel('gingembre'), curcuma: bottleLabel('curcuma'), lid: tinLid(), skirt: tinBand() };
  setLoad(0.5);
  await nextFrame();

  const products = PRODUCTS.map((p) => {
    const obj = p.kind === 'tin' ? createTin({ envMap: env, lid: art.lid, skirt: art.skirt }) : createBottle({ envMap: env, label: art[p.key], variant: p.key });
    scene.add(obj.root);
    // obj.proxy: low-poly silhouette on layer 1 only (contact shadows, cursor hit test)
    return { ...p, obj, proxy: obj.proxy, pose: newPose() };
  });
  const hero = products[FEATURED];
  const splash = createSplash({ envMap: env });
  hero.obj.inner.add(splash.group);
  const stage = createStage(PALETTE.page);
  scene.add(stage.mesh);

  // studio key: soft overhead box from the top left (no shadow map: contact shadows instead)
  const key = new THREE.DirectionalLight(new THREE.Color(1.0, 0.965, 0.92), 3.1);
  key.position.copy(KEY_DIR).multiplyScalar(100);
  scene.add(key, key.target);
  for (const m of words.materials) {
    m.userData.uniforms.uSky.value.setScalar(3.05);
    // light from the table itself fills the flanks of the letters: white on white, the relief
    // reads through soft shading rather than grey walls
    m.userData.uniforms.uGroundC.value.setRGB(2.0, 2.05, 2.1);
  }

  const contact = createContactShadows({ res: 448 });
  for (const pr of products) contact.casterStrength(pr.proxy);
  setLoad(0.62);
  await nextFrame();

  // ------------------------------------------------------------------ state
  const state = { target: 0, p: 0, v: 0 };
  const car = { pos: FEATURED, from: FEATURED, to: FEATURED, t: 1, dur: 0.9 };
  let time = FIXED_T !== null ? FIXED_T : 0;
  let tween = null; // { from, to, dur, t } or the autoplay { keys, dur, t, car: [...] }
  let cpuMs = 0;
  const statsNow = { contactCalls: 0, mainCalls: 0, mainTris: 0, contactTris: 0 };

  const carIndex = () => mod(Math.round(car.to), N_PRODUCTS);
  function carSet(to, dur = 0.9) {
    car.from = car.pos;
    car.to = to;
    car.t = 0;
    car.dur = dur;
  }
  function carGo(delta) {
    carSet(Math.round(car.to) + delta);
  }
  function carTo(i) {
    let d = i - carIndex();
    if (d > 1) d -= N_PRODUCTS;
    if (d < -1) d += N_PRODUCTS;
    if (d) carGo(d);
  }
  // one threshold for both: a control accepted here is never undone by the return below
  const carouselOpen = () => state.target < RETURN_P && state.p < RETURN_P + 0.02;
  // a carousel command while the page is a little scrolled (hero still on screen): glide back
  // to the top first, then do the move (a control never fails silently)
  let pendingCar = null;
  function carCommand(fn) {
    if (carouselOpen()) return fn();
    if (state.target < 0.2 && !(tween && tween.keys)) {
      pendingCar = fn;
      tweenTo(0, clamp(0.5 + 2.5 * state.target, 0.5, 0.9));
    }
  }

  const ui = createUI({
    onTab: (i) => carCommand(() => carTo(i)),
    onPrev: () => carCommand(() => carGo(-1)),
    onNext: () => carCommand(() => carGo(1)),
    onStory: () => tweenTo(0.5, 2.6),
    onTop: () => tweenTo(0, 3.2),
    onCta: () => {},
  });
  const cursor = createCursor();

  const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
  // keep the (hidden) scrollbar in sync with programmatic moves; remember where we put it
  let lastSyncY = null;
  function syncScroll(p) {
    lastSyncY = Math.round(p * maxScroll());
    window.scrollTo(0, lastSyncY);
  }
  function setProgressInstant(p) {
    p = clamp(p);
    state.target = state.p = p;
    state.v = 0;
    tween = null;
    syncScroll(p);
  }
  function tweenTo(to, dur, delay = 0) {
    tween = { from: state.target, to, dur, t: 0, delay };
  }
  // chapters for the keyboard (and a click on the bottle)
  const STOPS = [0, 0.3, 0.5, 0.64, 0.8, 0.9, 1];
  function chapter(dir) {
    const cur = state.target;
    let to = null;
    if (dir > 0) to = STOPS.find((s) => s > cur + 0.01);
    else to = [...STOPS].reverse().find((s) => s < cur - 0.01);
    if (to === undefined || to === null) return;
    tweenTo(to, clamp(0.9 + 4.2 * Math.abs(to - cur), 0.9, 2.4));
  }

  // hands-free take (~16.5 s): a hold, the carousel through the three products (about 1 s on
  // each) and back to the bottle, a hold, then the whole scroll story down to the splash
  const AUTO_SHIFT = 1.3;
  const AUTO_KEYS = monotone([[0, 0], [5.0 + AUTO_SHIFT, 0], [5.45 + AUTO_SHIFT, 0.012], [7.7 + AUTO_SHIFT, 0.3], [9.3 + AUTO_SHIFT, 0.5], [11.4 + AUTO_SHIFT, 0.72], [12.2 + AUTO_SHIFT, 0.8], [14.5 + AUTO_SHIFT, 1.0], [15.2 + AUTO_SHIFT, 1.0]]);
  const AUTO_DUR = 15.2 + AUTO_SHIFT;
  const AUTO_CAR = [0.9, 2.8, 4.7];
  function startAuto() {
    // no hard cut: from another product or from down the page, glide back first
    let pre = 0;
    if (state.target > 0.002 || state.p > 0.002) pre = clamp(0.8 + 1.6 * state.p, 0.8, 2.4);
    if (carIndex() !== FEATURED || car.t < 1) {
      carTo(FEATURED);
      pre = Math.max(pre, (1 - car.t) * car.dur);
    }
    const fromP = state.target;
    tween = { keys: AUTO_KEYS, dur: AUTO_DUR, t: -pre, pre, fromP, car: AUTO_CAR.map((t) => ({ t, done: false })) };
    pendingCar = null;
    ghost.active = true;
    ghost.userMoved = false;
  }

  window.addEventListener(
    'scroll',
    () => {
      if (lastSyncY !== null && Math.abs(window.scrollY - lastSyncY) <= 2) return; // our own scrollTo
      lastSyncY = null;
      tween = null; // the user takes over
      pendingCar = null;
      ghost.active = false;
      state.target = clamp(window.scrollY / maxScroll());
    },
    { passive: true },
  );

  // Horizontal trackpad swipe: one carousel move per gesture. Each gesture (events closer than
  // 200 ms) is classified once, on its first 3 events or 12 px: a horizontal gesture never
  // scrolls the page (all its events are cancelled, the mixed ones too) and never swipes the
  // browser back; a vertical one is left alone. A new swipe inside the decaying momentum tail
  // of the previous one (|deltaX| rising well above the tail) re-arms the carousel.
  const wheel = { last: -1e9, axis: null, sx: 0, sy: 0, n: 0, acc: 0, cooling: false, prev: 0, tailMin: Infinity };
  window.addEventListener(
    'wheel',
    (e) => {
      // gesture gaps measured on the events' own timestamps (a slow frame cannot split a swipe)
      const now = e.timeStamp || performance.now();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
      const dx = e.deltaX * unit, dy = e.deltaY * unit;
      if (now - wheel.last > 200) {
        wheel.axis = null;
        wheel.sx = wheel.sy = 0;
        wheel.n = 0;
        wheel.acc = 0;
        wheel.cooling = false;
        wheel.prev = 0;
        wheel.tailMin = Infinity;
      }
      wheel.last = now;
      let fresh = 0; // deltaX already counted by the classification
      if (wheel.axis === null) {
        wheel.sx += dx;
        wheel.sy += dy;
        wheel.n++;
        if (wheel.n >= 3 || Math.abs(wheel.sx) + Math.abs(wheel.sy) >= 12) {
          wheel.axis = Math.abs(wheel.sx) > 0.8 * Math.abs(wheel.sy) ? 'x' : 'y';
          fresh = wheel.sx;
        } else {
          // not classified yet: hold back what looks horizontal
          if (dx !== 0 && Math.abs(dx) > 0.8 * Math.abs(dy)) e.preventDefault();
          wheel.prev = dx;
          return;
        }
      }
      if (wheel.axis !== 'x') return;
      e.preventDefault();
      const adx = Math.abs(dx);
      if (wheel.cooling) {
        wheel.tailMin = Math.min(wheel.tailMin, adx);
        if (car.t >= 0.65 && adx > 6 && adx > Math.abs(wheel.prev) && adx >= 2.5 * Math.max(wheel.tailMin, 0.5)) {
          wheel.cooling = false;
          wheel.acc = 0;
          fresh = 0;
        }
      }
      wheel.prev = dx;
      if (wheel.cooling || !carouselOpen()) return;
      wheel.acc += fresh || dx;
      if (Math.abs(wheel.acc) > 38) {
        carGo(wheel.acc > 0 ? 1 : -1);
        // a swipe is a carousel command, like the arrows and the keys: the few pixels a swipe
        // can leak vertically (or a small scroll just before it) glide back to the top with the
        // move. The page never moves on its own otherwise.
        if (state.target > 0 && !(tween && tween.keys)) tweenTo(0, 0.6);
        wheel.acc = 0;
        wheel.cooling = true;
        wheel.tailMin = Infinity;
      }
    },
    { passive: false },
  );

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const d = e.key === 'ArrowRight' ? 1 : -1;
      carCommand(() => carGo(d));
    } else if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      chapter(1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      chapter(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      tweenTo(0, 3.6);
    } else if (e.key === 'End') {
      e.preventDefault();
      tweenTo(1, 6.5);
    } else if ((e.key === 'p' || e.key === 'P') && !e.repeat) {
      // (key repeat ignored: a press held a little too long must not stop the take it started)
      if (tween && tween.keys) {
        tween = null;
        ghost.active = false;
      } else startAuto();
    }
  });

  // ------------------------------------------------------------- cursor
  const mouse = { x: innerWidth * 0.5, y: innerHeight * 0.5, last: -1e9, inside: false, button: false };
  const ghost = { active: false, userMoved: false };
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.last = performance.now();
      mouse.inside = true;
      if (ghost.active) ghost.userMoved = true;
    },
    { passive: true },
  );
  document.documentElement.addEventListener('mouseleave', () => (mouse.inside = false));
  document.addEventListener('pointerover', (e) => (mouse.button = !!(e.target.closest && e.target.closest('#ui button'))));
  const ray = new THREE.Raycaster();
  ray.layers.set(CONTACT_LAYER);
  const ndc = new THREE.Vector2();
  function hoverAt(x, y) {
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    let best = -1, bestD = Infinity;
    products.forEach((pr, i) => {
      if (!pr.obj.root.visible) return;
      pr.obj.root.updateMatrixWorld();
      const hit = ray.intersectObject(pr.proxy, false)[0];
      if (hit && hit.distance < bestD) {
        bestD = hit.distance;
        best = i;
      }
    });
    return best;
  }
  let hovered = -1;
  // a click that only gives the window its focus (back from the camera app) never starts the
  // story: clicks are ignored for 1.5 s after the window gets the focus, and the product in
  // front only moves the story on once the DÉCOUVRIR disc is fully grown
  let focusAt = performance.now();
  window.addEventListener('focus', () => (focusAt = performance.now()));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) focusAt = performance.now();
  });
  window.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('#ui button')) return;
    if (performance.now() - focusAt < 1500) return;
    const h = hoverAt(e.clientX, e.clientY);
    if (h < 0) return;
    const s = slotOf(h, car.pos);
    if (Math.abs(s) > 0.5) carCommand(() => carTo(h)); // a neighbour: bring it in
    else if (cursor.grown()) chapter(1); // the product in front: on with the story
  });

  window.addEventListener('resize', () => {
    dpr = effDpr(levelIndex);
    renderer.setPixelRatio(dpr);
    renderer.setSize(innerWidth, innerHeight, false);
    // the page height follows the window (vh): stay on the current progress
    syncScroll(state.target);
  });

  // ------------------------------------------------------------- per frame
  const camBase = new THREE.Vector3();
  function updateCamera(tiltK) {
    const tilt = CAMERA.tilt * tiltK;
    const aspect = innerWidth / innerHeight;
    camBase.set(0, -CAMERA.distance * Math.sin(tilt), CAMERA.distance * Math.cos(tilt));
    camera.position.copy(camBase);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    // keep the horizontal framing on narrower screens
    camera.fov = aspect < 1.6 ? (2 * Math.atan(Math.tan((CAMERA.fov * Math.PI) / 360) * (1.6 / aspect)) * 180) / Math.PI : CAMERA.fov;
    camera.fov = Math.min(camera.fov, 60);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }
  const tv = new THREE.Vector3(), tdir = new THREE.Vector3();
  // point of the plane z = h under the screen position (fx, fy) in [-1, 1]
  function screenToWorld(fx, fy, h, out) {
    tv.set(fx, fy, 0.5).unproject(camera);
    tdir.subVectors(tv, camera.position).normalize();
    const t = (h - camera.position.z) / tdir.z;
    return out.copy(camera.position).addScaledVector(tdir, t);
  }
  const poseA = newPose(), poseB = newPose(), poseC = newPose(), poseS = newPose();
  const POSE_KEYS = Object.keys(poseA);
  function applyPose(root, pose) {
    screenToWorld(pose.fx, pose.fy, pose.z, root.position);
    root.rotation.set(pose.rx, pose.ry, pose.rz, 'ZXY');
    root.scale.setScalar(pose.s);
  }
  const neck = new THREE.Vector3(0, 8.7, 0), capBottom = new THREE.Vector3(), eyeLocal = new THREE.Vector3(0, 0, 100);
  const corner = new THREE.Vector3();
  let fd = fades(0);

  function applyFrame(p) {
    fd = fades(p);
    updateCamera(fd.tilt);
    // the table: words grow and drift behind the bottle, then everything fades to white
    const w = fd.words;
    words.group.scale.set(1 + 0.42 * w, 1 + 0.42 * w, 1 + 0.42 * w);
    words.group.position.set(-2.4 * w, 2.0 * w, 0);
    words.group.visible = fd.white < 0.999;

    const ex = exitAmount(p);
    products.forEach((pr, i) => {
      const s = slotOf(i, car.pos);
      carouselPose(pr.kind, s, time, poseA);
      let pose = poseA;
      if (i === FEATURED) {
        // the story's own motion (pose at p minus pose at 0) applies from the very first pixel
        // when the shot is in front (its carousel pose then equals the story pose at 0); a shot
        // parked elsewhere on the carousel is still pulled into the story over p 0 to 0.1
        storyPose(p, time, poseB);
        storyPose(0, time, poseS);
        const w = smoother(0.0, 0.1, p);
        const k = Math.max(w, 1 - smooth(0.0, 0.5, Math.abs(s)));
        for (const key of POSE_KEYS) poseC[key] = mix(poseA[key], poseS[key], w) + (poseB[key] - poseS[key]) * k;
        pose = poseC;
      } else if (ex > 0) {
        const dir = s >= 0 ? 1 : -1;
        poseA.fx += dir * 1.15 * ex;
        poseA.fy += dir * 0.65 * ex;
        poseA.z += 2.5 * ex;
      }
      applyPose(pr.obj.root, pose);
      // contact shadow strength: a product parked just out of frame on the left casts nothing
      // into the frame (its shadow falls away from the key, toward the inside); it fades in
      // during its slide, before it reaches the screen. The shot keeps it once its story runs.
      const kSlot = 1 - smooth(0.8, 1.0, -s);
      pr.proxy.userData.k = i === FEATURED ? Math.max(kSlot, smoother(0.0, 0.1, p)) : kSlot;
      // off the frame (or in the wrap-around jump): skip it
      pr.obj.root.visible = Math.abs(pose.fx) < 1.75 && Math.abs(pose.fy) < 1.6 && (i === FEATURED || ex < 0.999);
    });

    const fin = finale(p);
    hero.obj.setCap(fin.capRise, fin.capSpin, fin.capTiltX, fin.capTiltZ);
    hero.obj.capPivot.updateMatrix();
    capBottom.set(0, 0.34, 0).applyMatrix4(hero.obj.capPivot.matrix);
    if (fin.grow > 0.002) {
      hero.obj.root.updateMatrixWorld(true);
      eyeLocal.copy(camera.position);
      hero.obj.inner.worldToLocal(eyeLocal);
    }
    splash.update({ grow: fin.grow, neck, capBottom, time, flight: fin.flight, eye: eyeLocal });
    stage.set(fd.white, fin.band, fin.bandA, innerWidth * dpr, innerHeight * dpr);

    // contact shadows: frame the visible table
    if (fd.white < 0.999) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const [fx, fy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        screenToWorld(fx, fy, 0, corner);
        x0 = Math.min(x0, corner.x);
        x1 = Math.max(x1, corner.x);
        y0 = Math.min(y0, corner.y);
        y1 = Math.max(y1, corner.y);
      }
      contact.frame((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 + 2, (y1 - y0) / 2 + 2);
    }
  }

  function renderFrame() {
    renderer.info.reset();
    if (fd.white < 0.999) {
      scene.updateMatrixWorld();
      contact.render(renderer, scene);
      words.setContact(contact.texture, contact.wide, contact.matrix, 1.0 * (1 - fd.white));
    }
    statsNow.contactCalls = renderer.info.render.calls;
    statsNow.contactTris = renderer.info.render.triangles;
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    statsNow.mainCalls = renderer.info.render.calls - statsNow.contactCalls;
    statsNow.mainTris = renderer.info.render.triangles - statsNow.contactTris;
  }

  // ------------------------------------------------------------- warm-up
  // every program and buffer goes to the GPU during the loader (nothing compiles mid-take)
  for (const wp of [0.0, 0.42, 0.62, 0.95]) {
    state.p = wp;
    applyFrame(wp);
    renderFrame();
    await nextFrame();
  }
  car.pos = 0.5; // the tin and both bottles in view
  applyFrame(0);
  renderFrame();
  car.pos = FEATURED;
  setLoad(0.8);
  await nextFrame();

  // quality test while the loader is still up: median frame time at the heaviest moments (the
  // relief table at rest, the carousel mid-move, the grow over the full table, the splash), the
  // worst one decides; then the level is locked for the whole take (no change mid-scroll)
  const TEST_POSES = [
    { p: 0.0, car: FEATURED },
    { p: 0.0, car: FEATURED - 0.5 },
    { p: 0.4, car: FEATURED },
    { p: 0.95, car: FEATURED },
  ];
  const measured = [];
  if (!FORCED_Q && !CAPTURE) {
    const measure = async () => {
      let worst = 0;
      for (const tp of TEST_POSES) {
        car.pos = tp.car;
        const dts = [];
        let prev = performance.now();
        for (let i = 0; i < 12; i++) {
          time += 0.016;
          applyFrame(tp.p);
          renderFrame();
          await nextFrame();
          const now = performance.now();
          if (i > 0) dts.push(now - prev);
          prev = now;
        }
        dts.sort((a, b) => a - b);
        worst = Math.max(worst, dts[dts.length >> 1]);
        if (worst > 41) break; // far too slow already: no need to time the other moments
      }
      car.pos = FEATURED;
      return worst;
    };
    for (let tries = 0; tries < LEVELS.length; tries++) {
      const ms = await measure();
      measured.push(`${level.name} ${ms.toFixed(1)} ms`);
      if (ms <= 20.5) break;
      // next level down that really lowers the pixel density on this screen
      let next = levelIndex - 1;
      while (next >= 0 && effDpr(next) >= dpr) next--;
      if (next < 0) break;
      levelIndex = next;
      level = LEVELS[levelIndex];
      dpr = effDpr(levelIndex);
      renderer.setPixelRatio(dpr);
      renderer.setSize(innerWidth, innerHeight, false);
      setLoad(0.8 + 0.05 * (tries + 1));
    }
    console.info(`[ARDEUR] qualité ${level.name} (densité ${dpr}) : ${measured.join(', ')}`);
    time = FIXED_T !== null ? FIXED_T : 0;
  }
  setLoad(1);
  setProgressInstant(0);
  applyFrame(0);
  renderFrame();

  if (CAPTURE) {
    // render on demand only (stills for the contact sheet)
    window.__ready = true;
    document.getElementById('loader').classList.add('is-done');
  }

  // optional read-out (?fps=1): locked level and live frame rate, to rehearse a take
  let fpsEl = null;
  const fpsAcc = { n: 0, t: 0, worst: 0 };
  if (FPS) {
    fpsEl = document.createElement('div');
    fpsEl.id = 'fps';
    document.body.appendChild(fpsEl);
  }

  let last = performance.now();
  let returning = false;
  function frame(now) {
    requestAnimationFrame(frame);
    const rawDt = (now - last) / 1000;
    const dt = Math.min(100, now - last) / 1000;
    last = now;
    if (FIXED_T === null) time += dt;
    if (fpsEl) {
      fpsAcc.n++;
      fpsAcc.t += rawDt;
      fpsAcc.worst = Math.max(fpsAcc.worst, rawDt);
      if (fpsAcc.t >= 0.5) {
        const fps = fpsAcc.n / fpsAcc.t;
        // q=… is the URL value of the locked level (?q=low|medium|high|max); no-break spaces before the units
        fpsEl.textContent = `q=${level.name} · ×${String(dpr).replace('.', ',')} · ${fps < 10 ? fps.toFixed(1).replace('.', ',') : Math.round(fps)} i/s · pire ${Math.round(fpsAcc.worst * 1000)} ms`;
        fpsAcc.n = fpsAcc.t = fpsAcc.worst = 0;
      }
    }

    if (tween) {
      if (tween.keys) {
        tween.t = Math.min(tween.dur, tween.t + dt);
        if (tween.t < 0) {
          // glide back (to the top, to the ginger shot) before the take
          const k = 1 + tween.t / tween.pre;
          state.target = mix(tween.fromP, 0, k * k * k * (k * (k * 6 - 15) + 10));
          syncScroll(state.target);
        } else {
          for (const ev of tween.car) {
            if (!ev.done && tween.t >= ev.t) {
              ev.done = true;
              carGo(-1);
            }
          }
          state.target = tween.keys(tween.t);
          syncScroll(state.target);
          if (tween.t >= tween.dur) {
            tween = null;
            ghost.active = false;
          }
        }
      } else if (tween.delay > 0) tween.delay -= dt;
      else {
        tween.t = Math.min(1, tween.t + dt / tween.dur);
        const k = tween.t;
        state.target = mix(tween.from, tween.to, k * k * k * (k * (k * 6 - 15) + 10));
        syncScroll(state.target);
        if (tween.t >= 1) tween = null;
      }
    }
    // critically damped spring toward the scroll target (cinematic inertia)
    const omega = 4.4;
    let rem = dt;
    while (rem > 1e-6) {
      const h = Math.min(rem, 1 / 120);
      const a = omega * omega * (state.target - state.p) - 2 * omega * state.v;
      state.v += a * h;
      state.p += state.v * h;
      rem -= h;
    }
    if (Math.abs(state.target - state.p) < 1e-5 && Math.abs(state.v) < 1e-4) {
      state.p = state.target;
      state.v = 0;
    }
    // the story always features the ginger shot: once the scroll leaves the carousel zone, the
    // carousel comes back to it (same threshold as the controls: nothing is ever undone)
    if (state.target > RETURN_P && carIndex() !== FEATURED && !returning) {
      carTo(FEATURED);
      returning = true;
    }
    if (carIndex() === FEATURED) returning = false;
    // a pending carousel command runs once the glide back to the top reaches the zone
    if (pendingCar && carouselOpen()) {
      const f = pendingCar;
      pendingCar = null;
      f();
    }
    if (car.t < 1) {
      car.t = Math.min(1, car.t + dt / car.dur);
      car.pos = mix(car.from, car.to, easeInOutCubic(car.t));
    }

    const t0 = performance.now();
    applyFrame(state.p);
    renderFrame();
    ui.setActive(mod(Math.round(car.pos), N_PRODUCTS));
    ui.update(state.p, fd);

    // cursor: the user's, or the scripted pass of the hands-free take
    let cx = mouse.x, cy = mouse.y, vis = mouse.inside && now - mouse.last < 2000 && !(tween && tween.keys && !ghost.userMoved);
    if (tween && tween.keys && ghost.active && !ghost.userMoved) {
      const gt = tween.t;
      const k1 = smoother(6.0 + AUTO_SHIFT, 6.75 + AUTO_SHIFT, gt), k2 = smoother(7.95 + AUTO_SHIFT, 8.6 + AUTO_SHIFT, gt);
      hero.obj.root.getWorldPosition(tv).project(camera);
      const bx = (tv.x * 0.5 + 0.5) * innerWidth + 18, by = (-tv.y * 0.5 + 0.5) * innerHeight - 30;
      cx = mix(mix(innerWidth * 0.8, bx, k1), innerWidth * 0.93, k2);
      cy = mix(mix(innerHeight * 0.86, by, k1), innerHeight * 0.97, k2);
      vis = gt > 5.95 + AUTO_SHIFT && gt < 8.62 + AUTO_SHIFT;
      if (gt < 6.0 + AUTO_SHIFT) cursor.place(cx, cy);
    }
    hovered = vis ? hoverAt(cx, cy) : -1;
    cursor.update({ x: cx, y: cy, over: hovered >= 0 && !mouse.button, button: mouse.button, visible: vis }, dt);
    cpuMs = cpuMs * 0.9 + (performance.now() - t0) * 0.1;

    if (!window.__ready) {
      window.__ready = true;
      document.getElementById('loader').classList.add('is-done');
      if (AUTO) startAuto();
    }
  }
  if (!CAPTURE) requestAnimationFrame(frame);

  // ------------------------------------------------------------- test hooks
  window.__setProgress = (p) => {
    setProgressInstant(p);
    applyFrame(state.p);
    renderFrame();
    ui.setActive(mod(Math.round(car.pos), N_PRODUCTS));
    ui.update(state.p, fd);
  };
  window.__setCarousel = (pos) => {
    car.pos = car.from = car.to = pos;
    car.t = 1;
    applyFrame(state.p);
    renderFrame();
    ui.setActive(mod(Math.round(car.pos), N_PRODUCTS));
  };
  window.__setTime = (t) => {
    time = t;
  };
  // index of the product under a screen point (-1: none), as the cursor sees it
  window.__hit = (x, y) => hoverAt(x, y);
  window.__stats = () => ({
    main: { calls: statsNow.mainCalls, triangles: statsNow.mainTris },
    contact: { calls: statsNow.contactCalls, triangles: statsNow.contactTris },
    frame: { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles },
    programs: renderer.info.programs ? renderer.info.programs.length : 0,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
    letters: words.triangles,
    level: level.name,
    dpr,
    measured,
    cpuMs: +cpuMs.toFixed(2),
    p: state.p,
    car: car.pos,
  });
  window.__three = { renderer, scene, camera, products, words, splash, contact, wheel, car };
}
