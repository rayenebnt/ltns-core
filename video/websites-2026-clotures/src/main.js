// CORDEAU page shell: renderer, loader, quality test and lock, virtual smooth scroll, controls,
// hands-free tours, test hooks. The 3D world is a separate module behind a small API
// (createWorld / update / render / resize / warmup / anchors / info / stats / setQuality).
import * as THREE from 'three';
import * as WORLD from './world/index.js';
import { computeLayout, sceneAt, posOf, logicalOf, yOfLogical, styleAt, surfaceAt, N_STEPS } from './layout.js';
import { createScroller } from './scroll.js';
import { createUI } from './ui.js';
import { createEstimator } from './estimator.js';
import { tourKeys, chapterKeys, INSTALL_PLAY, REPAIR_PLAY } from './autoplay.js';
import { clamp } from './util.js';

const params = new URLSearchParams(location.search);
const CAPTURE = params.has('capture');
const AUTO = params.get('auto') === '1';
const FPS = params.get('fps') === '1';
const Q = params.get('q');
const FIXED_T = params.has('t') ? parseFloat(params.get('t')) : null;

// quality levels: the pixel density (capped by the screen) AND the world's own cost
// (grass, LOD radius, shadow map, leaves) change together, so a 1x screen still gets lighter
export const LEVELS = ['low', 'medium', 'high', 'max'];
const DPR = { low: 1, medium: 1.5, high: 1.75, max: 2 };
const FORCED = LEVELS.includes(Q);
const effDpr = (lv) => Math.min(window.devicePixelRatio || 1, DPR[lv]);
// quality test: the 80th percentile of the frame interval at each test station must stay under
// one 60 Hz frame (a missed vsync shows as 33 ms); then a governor watches the real frames
const BUDGET_MS = 17.4;
const SLOW_MS = +(params.get('slow') || 0); // debug: busy-wait this long in every frame

const doc = document.documentElement;
const $ = (id) => document.getElementById(id);
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const loaderFill = $('loader-fill');
let loadShown = 0;
const setLoad = (x) => {
  loadShown = Math.max(loadShown, clamp(x));
  if (loaderFill) loaderFill.style.width = `${(loadShown * 100).toFixed(1)}%`;
};

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
window.__ready = false;
if (CAPTURE) doc.classList.add('is-capture');

function showNoGL() {
  $('nogl').hidden = false;
  $('loader').classList.add('is-done');
  document.body.classList.add('no-gl');
  doc.classList.remove('cursor-off');
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

async function loadFonts() {
  if (!document.fonts || !document.fonts.load) return;
  try {
    await Promise.all([
      document.fonts.load("400 40px 'Instrument Serif'", 'Cordeau É'),
      document.fonts.load("italic 400 40px 'Instrument Serif'", 'bien posées'),
      document.fonts.load("500 16px 'Inter Tight'", 'RÉPARATIONS'),
      document.fonts.load("600 16px 'Inter Tight'", 'DEVIS'),
    ]);
    await document.fonts.ready;
  } catch (e) {
    /* system fonts then */
  }
}

if (!hasWebGL2()) showNoGL();
else
  start().catch((e) => {
    console.error(e);
    showNoGL();
  });

async function start() {
  const canvas = $('scene');
  const opts = Object.assign({ antialias: true, powerPreference: 'high-performance', stencil: false, alpha: false }, WORLD.rendererOptions || {});
  const renderer = new THREE.WebGLRenderer({ canvas, ...opts });
  renderer.info.autoReset = true;
  canvas.addEventListener(
    'webglcontextlost',
    (e) => {
      e.preventDefault();
      showNoGL();
    },
    false,
  );

  let level = FORCED ? Q : CAPTURE ? 'high' : 'max';
  let dpr = effDpr(level);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight, false);
  setLoad(0.03);

  const fontsReady = loadFonts();
  const world = await WORLD.createWorld({ renderer, quality: level, onProgress: (x) => setLoad(0.04 + 0.56 * clamp(+x || 0)) });
  world.resize(innerWidth, innerHeight, dpr);
  await fontsReady;
  setLoad(0.62);
  await nextFrame();

  // ------------------------------------------------------------------ layout and UI
  const dom = { white: $('white'), pricing: $('pricing'), intro4: $('intro4'), final: $('final'), intro2Head: $('intro2-head'), sticky: $('sticky') };
  const scrollSpace = $('scroll-space');
  let L = computeLayout(dom);
  scrollSpace.style.height = `${L.total}px`;
  const scroller = createScroller();
  scroller.setMax(L.max);

  const est = createEstimator();
  const ui = createUI({
    onGo: (name) => goTo(name),
    onPlay: (which) => playChapter(which),
    onType: (i) => toType(i),
    onPriceThis: (i) => {
      est.setType(i);
      goTo('pricing');
    },
  });
  ui.measure(L);
  const info = (world.info && world.info()) || {};
  ui.setTotal(info.totalLength || 77);
  $('len').addEventListener('pointerup', (e) => e.currentTarget.blur());

  // ------------------------------------------------------------------ world state
  const wstate = { seg: 'install', install: 0, style: { from: 0, to: 0, k: 1 }, drift: 0, stylesP: 0, repair: 0, pointer: { x: 0, y: 0 }, window: null };
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  let time = FIXED_T !== null ? FIXED_T : 0;
  let lastSc = null;
  let cpuMs = 0;
  let measured = [];
  let intro = CAPTURE ? 1 : 0;
  let introT0 = -1;

  function fillState(sc) {
    wstate.seg = sc.seg;
    wstate.install = sc.install;
    wstate.style.from = sc.style.from;
    wstate.style.to = sc.style.to;
    wstate.style.k = sc.style.k;
    wstate.drift = sc.drift;
    wstate.stylesP = clamp(sc.s);
    wstate.repair = sc.repair;
    wstate.pointer.x = ptr.x;
    wstate.pointer.y = ptr.y;
    wstate.window = sc.seg === 'styles' && sc.e < 1 ? windowNow(sc.e) : null;
  }
  const winRect = { x: 0, y: 0, w: 0, h: 0 };
  function windowNow(e) {
    // CSS px rect of the hole the styles view is seen through (chapter 2 intro)
    const yv = L.intro2Top - scroller.st.y + clamp(scroller.st.y - L.intro2Top, 0, L.E);
    const w0 = L.win0, k = e * e * (3 - 2 * e);
    winRect.x = w0.x * (1 - k);
    winRect.y = yv + w0.y * (1 - k);
    winRect.w = w0.w + (L.W - w0.w) * k;
    winRect.h = w0.h + (L.V - w0.h) * k;
    return winRect;
  }

  function renderFrame(dt, opts = {}) {
    const t0 = performance.now();
    const y = scroller.st.y;
    const sc = sceneAt(L, y);
    fillState(sc);
    world.update(wstate, dt, time);
    const anchors = sc.seg === 'repair' ? world.anchors() : null;
    ui.update(y, sc, anchors, { intro, instant: !!opts.instant });
    est.update(dt, CAPTURE || !!opts.instant);
    if (sc.seg !== 'hidden') world.render();
    lastSc = sc;
    cpuMs = cpuMs * 0.9 + (performance.now() - t0) * 0.1;
  }

  // ------------------------------------------------------------------ warm-up and quality test
  await world.warmup();
  setLoad(0.74);
  await nextFrame();
  // the screen's own frame period, measured with nothing to draw (60 Hz: 16.7 ms, 120 Hz: 8.3 ms)
  let vsyncMs = 1000 / 60;
  if (!CAPTURE) {
    const iv = [];
    let prev = performance.now();
    for (let i = 0; i < 12; i++) {
      await nextFrame();
      const now = performance.now();
      if (i > 1) iv.push(now - prev);
      prev = now;
    }
    iv.sort((a, b) => a - b);
    vsyncMs = clamp(iv[iv.length >> 1], 4, 40);
  }

  const STATIONS = () => [posOf(L, 'install', 0.02), posOf(L, 'install', 0.62), posOf(L, 'install', 0.97), posOf(L, 'styles', 1.5), posOf(L, 'repair', 0.06), posOf(L, 'repair', 0.93)];
  // each station is drawn as a real frame (renderFrame: the 3D and the overlays in their real
  // state: log, card, sticky bar, glass); the loader stays on top
  async function measureLevel() {
    let worst = 0;
    for (const py of STATIONS()) {
      scroller.jump(py);
      const dts = [];
      let prev = performance.now();
      for (let i = 0; i < 14; i++) {
        time += 1 / 60;
        renderFrame(1 / 60, { instant: true });
        await nextFrame();
        const now = performance.now();
        if (i > 1) dts.push(now - prev); // the first frames of a station may upload buffers
        prev = now;
      }
      dts.sort((a, b) => a - b);
      worst = Math.max(worst, dts[Math.floor(dts.length * 0.8)]);
      if (worst > 45) break; // far too slow already
    }
    scroller.jump(0);
    return worst;
  }
  if (!FORCED && !CAPTURE) {
    for (let tries = 0; tries < LEVELS.length; tries++) {
      const ms = await measureLevel();
      measured.push(`${level} ${ms.toFixed(1)} ms`);
      setLoad(0.78 + 0.05 * (tries + 1));
      if (ms <= Math.max(BUDGET_MS, 1.05 * vsyncMs)) break;
      const i = LEVELS.indexOf(level);
      if (i <= 0) break;
      level = LEVELS[i - 1];
      dpr = effDpr(level);
      world.setQuality(level);
      world.resize(innerWidth, innerHeight, dpr);
    }
    console.info(`[Cordeau] qualité ${level} (densité ${dpr}) : ${measured.join(', ')}`);
    if (measured.length > 1) await world.warmup(); // the locked level's buffers, once more
    time = FIXED_T !== null ? FIXED_T : 0;
  }
  setLoad(1);

  // ------------------------------------------------------------------ moves
  const durFor = (to, from = scroller.heading) => clamp(0.85 + (0.11 * Math.abs(to - from)) / L.V, 1.0, 3.2);
  // A long programmatic move (more than 2.5 screens) does not fast-forward through the story:
  // a veil fades in (cream over a light target, ink otherwise), the page jumps to 0.8 screen
  // before the target, and the last 0.8 screen glides in while the veil fades out.
  const veilEl = $('veil');
  const veil = { timer: 0, on: false, lastWheel: -1e9, ignoreGesture: false };
  function veilOut() {
    clearTimeout(veil.timer);
    veil.timer = 0;
    veil.on = false;
    if (veilEl) veilEl.classList.remove('is-on');
  }
  function longMove(to, then) {
    to = clamp(to, 0, L.max);
    const from = scroller.heading;
    const dist = to - from;
    if (Math.abs(dist) <= 2.5 * L.V || !veilEl || CAPTURE) return false;
    scroller.stop();
    veil.ignoreGesture = performance.now() - veil.lastWheel < 220;
    veilEl.classList.toggle('is-light', surfaceAt(L, to, 0.5 * L.V) === 'light');
    veilEl.classList.add('is-on');
    veil.on = true;
    clearTimeout(veil.timer);
    veil.timer = setTimeout(() => {
      veil.timer = 0;
      const pre = clamp(to - Math.sign(dist) * 0.8 * L.V, 0, L.max);
      scroller.jump(pre);
      if (then) then(pre);
      else scroller.tweenTo(to, 0.9);
      requestAnimationFrame(() => requestAnimationFrame(veilOut));
    }, 170);
    return true;
  }
  function glideTo(to, dur) {
    if (!longMove(to)) scroller.tweenTo(to, dur ?? durFor(to));
  }
  function goTo(name) {
    let to;
    if (name === 'top') to = 0;
    else if (name === 'install') to = posOf(L, 'install', 0.24); // the build itself, first beat
    else if (name === 'styles') to = posOf(L, 'styles', 0);
    else if (name === 'pricing') to = posOf(L, 'pricing', 1);
    else if (name === 'repair') to = posOf(L, 'repair', 0.04);
    else to = posOf(L, name);
    glideTo(to);
  }
  function toType(i) {
    i = clamp(Math.round(i), 0, N_STEPS - 1);
    const to = posOf(L, 'styles', i);
    scroller.tweenTo(to, clamp(0.7 + (0.22 * Math.abs(to - scroller.heading)) / L.V, 0.8, 1.9));
  }
  function currentType(y) {
    if (y < L.s0) return -1;
    const st = styleAt((y - L.s0) / L.A2);
    return st.k >= 0.5 ? st.to : st.from;
  }
  function playChapter(which) {
    const table = which === 'repair' ? REPAIR_PLAY : INSTALL_PLAY;
    const keys = chapterKeys(L, table, scroller.st.target);
    if (!keys) return;
    const from = logicalOf(L, scroller.st.target);
    scroller.play(which, keys, () => chapterKeys(L, table, yOfLogical(L, from)) || [[0, scroller.st.target]]);
  }
  function startTour() {
    const play = () => {
      const from = logicalOf(L, scroller.st.target);
      scroller.play('tour', tourKeys(L, scroller.st.target), () => tourKeys(L, yOfLogical(L, from)));
    };
    // far from the top: the veil, then the tour from the hero (no rewind through the story)
    if (!longMove(0, () => (scroller.jump(0), play()))) play();
  }
  // beat-to-beat stops for the keyboard
  const STOPS = [
    ['install', 0], ['install', 0.24], ['install', 0.46], ['install', 0.665], ['install', 1],
    ['white', 1], ['intro2', 0], ['styles', 0], ['styles', 1], ['styles', 2], ['styles', 3], ['styles', 4],
    ['pricing', 1], ['intro4', 1], ['repair', 0.04], ['repair', 0.4], ['repair', 0.6], ['repair', 1], ['final'],
  ];
  function stepBeat(dir) {
    const cur = scroller.heading;
    const ys = STOPS.map(([n, v]) => posOf(L, n, v));
    let to = null;
    if (dir > 0) to = ys.find((s) => s > cur + 4);
    else to = [...ys].reverse().find((s) => s < cur - 4);
    if (to === undefined || to === null) return;
    scroller.tweenTo(to, clamp(0.75 + (0.2 * Math.abs(to - cur)) / L.V, 0.85, 2.1));
  }

  // ------------------------------------------------------------------ input
  // any wheel (scroll.js: a new gesture), touch or key input interrupts a playing tour and any
  // programmatic glide
  window.addEventListener('touchstart', () => scroller.stop(), { passive: true });
  // a new wheel gesture or a touch during a veiled jump: stay where the page is (the tail of the
  // gesture that was running when the jump started, trackpad momentum included, is ignored)
  window.addEventListener(
    'wheel',
    () => {
      const t = performance.now();
      const same = t - veil.lastWheel < 220;
      veil.lastWheel = t;
      if (veil.timer && !(veil.ignoreGesture && same)) veilOut();
    },
    { passive: true },
  );
  window.addEventListener('touchstart', () => veil.timer && veilOut(), { passive: true });
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return; // browser shortcuts
    const isP = e.key === 'p' || e.key === 'P';
    const wasTour = scroller.playing === 'tour';
    if (!isP) scroller.stop();
    if (e.target && e.target.closest && e.target.closest('input, textarea, select')) return; // the slider keeps its keys
    switch (e.key) {
      case 'ArrowDown':
      case 'PageDown':
        e.preventDefault();
        stepBeat(1);
        break;
      case ' ':
        e.preventDefault();
        stepBeat(e.shiftKey ? -1 : 1);
        break;
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault();
        stepBeat(-1);
        break;
      case 'Home':
        e.preventDefault();
        glideTo(0);
        break;
      case 'End':
        e.preventDefault();
        glideTo(L.max);
        break;
      case 'ArrowLeft':
      case 'ArrowRight': {
        const y = scroller.heading;
        if (y < L.intro2Top || y > L.pricingTop - 0.5 * L.V) return; // chapter 2 only
        e.preventDefault();
        const t = currentType(y);
        if (e.key === 'ArrowRight') toType(t < 0 ? 0 : t + 1);
        else if (t > 0) toType(t - 1);
        break;
      }
      default:
        if (isP && !e.repeat) {
          if (wasTour) scroller.stop();
          else startTour();
        }
    }
  });

  // the system cursor hides after 2 s without movement (filming) and comes back on movement
  let cursorTimer = 0;
  function wakeCursor() {
    doc.classList.remove('cursor-off');
    clearTimeout(cursorTimer);
    cursorTimer = setTimeout(() => doc.classList.add('cursor-off'), 2000);
  }
  window.addEventListener(
    'pointermove',
    (e) => {
      wakeCursor();
      if (e.pointerType === 'touch') return;
      ptr.tx = clamp((e.clientX / innerWidth) * 2 - 1, -1, 1);
      ptr.ty = clamp(1 - (e.clientY / innerHeight) * 2, -1, 1);
    },
    { passive: true },
  );
  window.addEventListener('pointerdown', wakeCursor, { passive: true });
  if (!CAPTURE) wakeCursor();

  window.addEventListener('resize', () => {
    const old = L;
    dpr = effDpr(level);
    world.resize(innerWidth, innerHeight, dpr);
    L = computeLayout(dom);
    scrollSpace.style.height = `${L.total}px`;
    ui.measure(L);
    // the page height follows the window: stay on the same logical position
    scroller.remap((y) => yOfLogical(L, logicalOf(old, y)), L.max);
    if (CAPTURE) renderFrame(1, { instant: true });
  });

  // ------------------------------------------------------------------ first frame
  scroller.jump(0);
  renderFrame(1 / 60, { instant: true });

  // the governor: after the loader, a laptop that cannot keep up (it heats up, another app takes
  // the GPU) steps down one quality level, while the canvas is covered by a section if it can
  // wait, at most twice per session, never back up. Off with a forced ?q and in ?capture.
  // (?gov=1 keeps it on with a forced ?q: a test of the governor itself)
  const gov = { on: (!FORCED || params.get('gov') === '1') && !CAPTURE, win: [], steps: 0, pending: false, severe: false, note: '' };
  function govStep() {
    gov.pending = gov.severe = false;
    gov.win.length = 0;
    const i = LEVELS.indexOf(level);
    if (i <= 0) {
      gov.on = false;
      return;
    }
    const from = level;
    level = LEVELS[i - 1];
    dpr = effDpr(level);
    world.setQuality(level);
    world.resize(innerWidth, innerHeight, dpr);
    gov.steps++;
    gov.note = `${from}→${level}`;
    if (gov.steps >= 2) gov.on = false;
    console.info(`[Cordeau] qualité abaissée : ${gov.note} (densité ${dpr})`);
  }
  // a frame is slow when it takes more than 1.5 frames of 60 Hz (or of the screen, if slower)
  const slowMs = 1.5 * Math.max(vsyncMs, 1000 / 62);
  function govWatch(raw) {
    if (!gov.on) return;
    const ms = raw * 1000;
    // a hidden tab, a resize or a veiled jump are not the page's own frame rate
    if (document.hidden || ms > 250 || veil.on || !lastSc || lastSc.seg === 'hidden') {
      if (gov.pending && lastSc && lastSc.seg === 'hidden') govStep();
      return;
    }
    gov.win.push(ms);
    if (gov.win.length > 120) gov.win.shift();
    if (gov.win.length === 120 && !gov.pending) {
      let slow = 0;
      for (const x of gov.win) if (x > slowMs) slow++;
      slow /= gov.win.length;
      if (slow > 0.2) {
        gov.pending = true;
        gov.severe = slow > 0.45;
        gov.win.length = 0;
      }
    }
    if (gov.pending && gov.severe) govStep();
  }

  let fpsEl = null;
  const fpsAcc = { n: 0, t: 0, worst: 0 };
  if (FPS) {
    fpsEl = document.createElement('div');
    fpsEl.id = 'fps';
    document.body.appendChild(fpsEl);
  }

  function ready() {
    window.__ready = true;
    $('loader').classList.add('is-done');
  }

  if (CAPTURE) ready();

  let autoPending = AUTO && !CAPTURE;
  const cancelAuto = () => (autoPending = false);
  for (const ev of ['wheel', 'keydown', 'touchstart', 'pointerdown']) window.addEventListener(ev, cancelAuto, { passive: true });

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const raw = (now - last) / 1000;
    const dt = Math.min(0.1, Math.max(0, raw));
    last = now;
    if (FIXED_T === null) time += dt;
    if (SLOW_MS > 0) {
      const t0 = performance.now();
      while (performance.now() - t0 < SLOW_MS);
    }
    govWatch(raw);
    if (fpsEl) {
      fpsAcc.n++;
      fpsAcc.t += raw;
      fpsAcc.worst = Math.max(fpsAcc.worst, raw);
      if (fpsAcc.t >= 0.5) {
        const fps = fpsAcc.n / fpsAcc.t;
        fpsEl.textContent = `q=${gov.note || level}${gov.pending ? '…' : ''} · ×${String(+dpr.toFixed(2)).replace('.', ',')} · ${fps < 10 ? fps.toFixed(1).replace('.', ',') : Math.round(fps)} i/s · pire ${Math.round(fpsAcc.worst * 1000)} ms`;
        fpsAcc.n = fpsAcc.t = fpsAcc.worst = 0;
      }
    }
    // the hero comes in once the loader has faded
    if (introT0 < 0 && window.__ready) introT0 = now + 250;
    if (intro < 1 && introT0 >= 0) intro = clamp((now - introT0) / 1700);
    const kp = 1 - Math.exp(-dt * 2.6);
    ptr.x += (ptr.tx - ptr.x) * kp;
    ptr.y += (ptr.ty - ptr.y) * kp;
    scroller.step(dt);
    renderFrame(dt);
    if (!window.__ready) ready();
    // ?auto=1: the tour starts once the hero is fully drawn (its 1 s hold then plays on it)
    if (autoPending && intro >= 1) {
      autoPending = false;
      startTour();
    }
  }
  if (!CAPTURE) requestAnimationFrame(frame);

  // ------------------------------------------------------------------ test hooks
  const renderNow = () => renderFrame(1, { instant: true });
  window.__setProgress = (P) => {
    scroller.jump(clamp(+P || 0) * L.max);
    renderNow();
  };
  window.__goto = (name, v) => {
    scroller.jump(posOf(L, name, v));
    renderNow();
  };
  window.__setTime = (t) => {
    time = +t || 0;
    if (CAPTURE) renderNow();
  };
  window.__stats = () => {
    const s = (world.stats && world.stats()) || {};
    const y = scroller.st.y;
    return {
      ...s,
      level,
      dpr,
      measured,
      cpuMs: +cpuMs.toFixed(2),
      y: Math.round(y),
      P: +(y / L.max).toFixed(5),
      seg: lastSc ? lastSc.seg : null,
      install: wstate.install,
      style: { ...wstate.style },
      drift: wstate.drift,
      repair: wstate.repair,
      playing: scroller.playing,
      governor: { on: gov.on, steps: gov.steps, pending: gov.pending, note: gov.note, vsyncMs: +vsyncMs.toFixed(2), slowMs: +slowMs.toFixed(2), window: gov.win.length },
    };
  };
  window.__world = world;
  window.__layout = () => ({ ...L });
  window.__estimate = () => est.state;
}
