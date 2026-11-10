// CORDEAU page shell: renderer, loader, quality test and lock, virtual smooth scroll, controls,
// hands-free tours, test hooks. The 3D world is a separate module behind a small API
// (createWorld / update / render / resize / warmup / anchors / info / stats / setQuality).
import * as THREE from 'three';
import * as WORLD from './world/index.js';
import { computeLayout, sceneAt, posOf, logicalOf, yOfLogical, styleAt, N_STEPS } from './layout.js';
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
const BUDGET_MS = 20.5; // worst median frame time allowed at the test stations

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
  const dom = { white: $('white'), pricing: $('pricing'), intro4: $('intro4'), final: $('final'), intro2Head: $('intro2-head') };
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
  const wstate = { seg: 'install', install: 0, style: { from: 0, to: 0, k: 1 }, drift: 0, repair: 0, pointer: { x: 0, y: 0 }, window: null };
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

  const STATIONS = () => [posOf(L, 'install', 0), posOf(L, 'install', 0.62), posOf(L, 'install', 0.97), posOf(L, 'styles', 1.5), posOf(L, 'repair', 0.06), posOf(L, 'repair', 0.93)];
  async function measureLevel() {
    let worst = 0;
    for (const py of STATIONS()) {
      const sc = sceneAt(L, py);
      fillState(sc);
      const dts = [];
      let prev = performance.now();
      for (let i = 0; i < 12; i++) {
        time += 1 / 60;
        world.update(wstate, 1 / 60, time);
        world.render();
        await nextFrame();
        const now = performance.now();
        if (i > 1) dts.push(now - prev); // the first frames of a station may upload buffers
        prev = now;
      }
      dts.sort((a, b) => a - b);
      worst = Math.max(worst, dts[dts.length >> 1]);
      if (worst > 45) break; // far too slow already
    }
    return worst;
  }
  if (!FORCED && !CAPTURE) {
    for (let tries = 0; tries < LEVELS.length; tries++) {
      const ms = await measureLevel();
      measured.push(`${level} ${ms.toFixed(1)} ms`);
      setLoad(0.78 + 0.05 * (tries + 1));
      if (ms <= BUDGET_MS) break;
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
  function goTo(name) {
    let to;
    if (name === 'top') to = 0;
    else if (name === 'install') to = posOf(L, 'install', 0.24); // the build itself, first beat
    else if (name === 'styles') to = posOf(L, 'styles', 0);
    else if (name === 'pricing') to = posOf(L, 'pricing', 1);
    else if (name === 'repair') to = posOf(L, 'repair', 0.04);
    else to = posOf(L, name);
    scroller.tweenTo(to, durFor(to));
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
    const from = logicalOf(L, scroller.st.target);
    scroller.play('tour', tourKeys(L, scroller.st.target), () => tourKeys(L, yOfLogical(L, from)));
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
        scroller.tweenTo(0, durFor(0));
        break;
      case 'End':
        e.preventDefault();
        scroller.tweenTo(L.max, durFor(L.max));
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

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const raw = (now - last) / 1000;
    const dt = Math.min(0.1, Math.max(0, raw));
    last = now;
    if (FIXED_T === null) time += dt;
    if (fpsEl) {
      fpsAcc.n++;
      fpsAcc.t += raw;
      fpsAcc.worst = Math.max(fpsAcc.worst, raw);
      if (fpsAcc.t >= 0.5) {
        const fps = fpsAcc.n / fpsAcc.t;
        fpsEl.textContent = `q=${level} · ×${String(+dpr.toFixed(2)).replace('.', ',')} · ${fps < 10 ? fps.toFixed(1).replace('.', ',') : Math.round(fps)} i/s · pire ${Math.round(fpsAcc.worst * 1000)} ms`;
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
    if (!window.__ready) {
      ready();
      if (AUTO) startTour();
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
    };
  };
  window.__world = world;
  window.__layout = () => ({ ...L });
  window.__estimate = () => est.state;
}
