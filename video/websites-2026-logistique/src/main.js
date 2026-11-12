// SILLAGE page shell: renderer, loader, quality test and governor, the virtual smooth scroll that
// drives the story progress p, keys, nav and rail, the hands-free tour, test hooks. The 3D world
// is a separate module behind the WORLD CONTRACT (createWorld / update / render / resize / warmup
// / setQuality / stats / anchors / info / camera); story.js is the shared timeline.
import * as THREE from 'three';
import * as WORLD from './world/index.js';
import { SCREENS, STORY_END, CHAPTERS, BEATS, STOPS, chapterAt } from './story.js';
import { createScroller } from './scroll.js';
import { createUI, fillTexts, STATIONS } from './ui.js';
import { tourKeys } from './tour.js';
import { clamp } from './util.js';

const params = new URLSearchParams(location.search);
const CAPTURE = params.has('capture');
const AUTO = params.get('auto') === '1';
const FPS = params.get('fps') === '1';
const Q = params.get('q');

// quality levels: the pixel density (capped by the screen) AND the world's own cost (shadow map,
// ocean detail, cloud layers, mesh density) change together
export const LEVELS = ['low', 'medium', 'high', 'max'];
const DPR = { low: 1, medium: 1.5, high: 1.75, max: 2 };
const FORCED = LEVELS.includes(Q);
const effDpr = (lv) => Math.min(window.devicePixelRatio || 1, DPR[lv]);
// quality test: the 80th percentile of the frame interval at each station must stay under one
// 60 Hz frame (a missed vsync shows as 33 ms); then a governor watches the real frames
const BUDGET_MS = 17.4;
const SLOW_MS = +(params.get('slow') || 0); // debug: busy-wait this long in every frame

const doc = document.documentElement;
const $ = (id) => document.getElementById(id);
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const loaderFill = $('loader-fill');
let loadShown = 0;
const setLoad = (x) => {
  loadShown = Math.max(loadShown, clamp(x));
  if (loaderFill) loaderFill.style.transform = `scaleX(${loadShown.toFixed(3)})`;
};

fillTexts();
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
window.__ready = false;
// the hooks exist from the first line (no-ops until the world is up, and without WebGL 2)
window.__setProgress = window.__goto = window.__setTime = () => {};
window.__stats = () => ({ ready: window.__ready });
window.__world = null;
if (CAPTURE) doc.classList.add('is-capture');
// no pinch-zoom (a trackpad pinch reaches the page as ctrl + wheel) while filming
window.addEventListener('wheel', (e) => {
  if (e.ctrlKey) e.preventDefault();
}, { passive: false });

// the browser's and the system's own keys (F5 reload, F11 full screen, F12, a lone Maj or
// Verr. Maj, volume and media keys): never swallowed, never taken as a hand on the page
const systemKey = (e) =>
  /^F\d{1,2}$/.test(e.key) ||
  ['Shift', 'CapsLock', 'Fn', 'FnLock', 'PrintScreen', 'Unidentified', 'Meta', 'OS', 'Control', 'Alt', 'AltGraph', 'Tab'].includes(e.key) ||
  /^(Audio|Media|Brightness)/.test(e.key);

function showNoGL() {
  $('nogl').hidden = false;
  $('loader').classList.add('is-done');
  document.body.classList.add('no-gl');
  doc.classList.remove('cursor-off', 'is-touring', 'tone-light');
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
      document.fonts.load("900 40px 'Big Shoulders Display'", 'PORT ROUTE MER AIR À É'),
      document.fonts.load("800 20px 'Big Shoulders Display'", 'SUIVI'),
      document.fonts.load("900 30px 'Big Shoulders Stencil Display'", 'SILLAGE'),
      document.fonts.load("500 11px 'JetBrains Mono'", '01 PORT'),
      document.fonts.load("700 11px 'JetBrains Mono'", 'LIVRÉ N°'),
      document.fonts.load("400 16px 'Inter Tight'", 'Sillage'),
      document.fonts.load("600 16px 'Inter Tight'", 'Demander'),
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
  // no browser menu (a two-finger click while swiping) and no drag ghost during a take
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('dragstart', (e) => e.preventDefault());
  const canvas = $('scene');
  const opts = Object.assign({ antialias: true, powerPreference: 'high-performance', stencil: false, alpha: false }, WORLD.rendererOptions || {});
  const renderer = new THREE.WebGLRenderer({ canvas, ...opts });
  renderer.info.autoReset = true;
  canvas.addEventListener(
    'webglcontextlost',
    (e) => {
      e.preventDefault(); // ask the browser for the context back
      // a GPU reset (driver timeout, sleep and wake, a GPU switch) usually gives it back within a
      // second: the message only if it does not
      setTimeout(() => {
        if (renderer.getContext().isContextLost()) showNoGL();
      }, 3000);
    },
    false,
  );
  // back: a reload rebuilds everything (programs, textures, shadow map), the page starts over
  canvas.addEventListener('webglcontextrestored', () => location.reload(), false);

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

  // ------------------------------------------------------------------ page layout
  // the pinned story: SCREENS window heights of scroll for p 0 -> STORY_END; then the « Arrivée »
  // section (at least one window high) slides up over the canvas for p STORY_END -> 1
  const scrollSpace = $('scroll-space');
  const ui = createUI({
    onNav: (id) => goChapter(id),
    onTop: () => glideTo(0),
    onReplay: () => glideTo(0),
  });
  let L = null;
  function layout() {
    const M = ui.measure();
    const H = innerHeight;
    const S = SCREENS * H;
    const F = Math.max(H, M.finalH);
    return { H, S, F, max: S + F };
  }
  const pOf = (y, l = L) => (y <= l.S ? (STORY_END * y) / l.S : STORY_END + (1 - STORY_END) * clamp((y - l.S) / l.F));
  const yOf = (p, l = L) => (p <= STORY_END ? (clamp(p) / STORY_END) * l.S : l.S + ((clamp(p) - STORY_END) / (1 - STORY_END)) * l.F);
  L = layout();
  scrollSpace.style.height = `${Math.round(L.max + L.H)}px`;
  const scroller = createScroller();
  scroller.setMax(L.max);

  // ------------------------------------------------------------------ frames
  const state = { p: 0, pointer: { x: 0, y: 0 } };
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  let time = 0;
  let measured = [];
  let cpuMs = 0;
  let intro = CAPTURE ? 1 : 0;
  let introT0 = -1;
  let lastAnchors = null;

  function renderFrame(dt, o = {}) {
    const t0 = performance.now();
    const y = scroller.st.y;
    const p = clamp(pOf(y));
    state.p = p;
    state.pointer.x = CAPTURE ? 0 : ptr.x;
    state.pointer.y = CAPTURE ? 0 : ptr.y;
    world.update(state, dt, time);
    // the service callouts follow the ship (anchors only while they can show)
    const services = BEATS.find((b) => b.id === 'services').win;
    lastAnchors = p > services[0] - 0.02 && p < services[3] + 0.02 && world.anchors ? world.anchors() : null;
    ui.update(p, y, L, lastAnchors, { dt, intro, instant: !!o.instant });
    if (!ui.covered) world.render();
    cpuMs = cpuMs * 0.9 + (performance.now() - t0) * 0.1;
  }
  const renderNow = () => renderFrame(1, { instant: true });

  // ------------------------------------------------------------------ warm-up and quality test
  scroller.jump(0);
  renderNow();
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

  // stations: the hero, the lift, the crane, the road, the ship, the services, the plane
  const TEST_P = [0.02, 0.1, 0.22, 0.36, 0.55, 0.69, 0.84];
  async function measureLevel() {
    let worst = 0;
    for (const p of TEST_P) {
      scroller.jump(yOf(p));
      const dts = [];
      let prev = performance.now();
      for (let i = 0; i < 14; i++) {
        time += 1 / 60;
        renderFrame(i === 0 ? 1 : 1 / 60, { instant: true });
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
    // (only with the ?fps=1 read-out: a plain load keeps the console empty; __stats().measured)
    if (FPS) console.info(`[Sillage] qualité ${level} (densité ${dpr}) : ${measured.join(', ')}`);
    if (measured.length > 1) await world.warmup(); // the locked level's programs, once more
    time = 0;
  }
  setLoad(1);
  scroller.jump(0);
  renderNow();

  // ------------------------------------------------------------------ moves
  // a programmatic glide: longer for longer distances; a long one replays the journey quickly
  // (the world is a pure function of p: the camera simply runs the path faster)
  const durFor = (to, from = scroller.heading) => clamp(1.0 + (0.16 * Math.abs(to - from)) / L.H, 1.1, 3.6);
  function glideTo(y, dur) {
    stopTour();
    scroller.tweenTo(y, dur ?? durFor(y));
  }
  // nav and rail: each chapter opens on the stop where it reads best (the stop inside the chapter
  // closest to the middle of its text beat)
  const NAV_P = {};
  for (const c of STATIONS) {
    const b = BEATS.find((x) => x.id === c.id);
    const mid = b ? (b.win[1] + b.win[2]) / 2 : (c.from + c.to) / 2;
    const inside = STOPS.filter((s) => s >= c.from && s < c.to);
    NAV_P[c.id] = inside.length ? inside.reduce((a, s) => (Math.abs(s - mid) < Math.abs(a - mid) ? s : a), inside[0]) : c.from;
  }
  NAV_P.arrivee = 1;
  function goChapter(id) {
    if (NAV_P[id] === undefined) return;
    glideTo(yOf(NAV_P[id]));
  }
  // ↓ / ↑: the next or previous stop (story.js STOPS)
  function stepStop(dir) {
    const cur = scroller.heading;
    const ys = STOPS.map((p) => yOf(p));
    const to = dir > 0 ? ys.find((s) => s > cur + 4) : [...ys].reverse().find((s) => s < cur - 4);
    if (to === undefined) return;
    scroller.tweenTo(to, clamp(1.0 + (0.32 * Math.abs(to - cur)) / L.H, 1.2, 3.0));
  }

  // ------------------------------------------------------------------ the tour
  let touring = false;
  let tourFromP = 0;
  function startTour() {
    if (CAPTURE) return;
    const from = scroller.st.target;
    tourFromP = pOf(from);
    touring = true;
    doc.classList.add('is-touring');
    scroller.play('tour', tourKeys(yOf, L.H, from), () => tourKeys(yOf, L.H, yOf(tourFromP)));
  }
  function stopTour() {
    if (scroller.playing === 'tour') scroller.stop();
  }
  scroller.onStop((m, natural) => {
    if (!m || m.name !== 'tour') return;
    touring = false;
    doc.classList.remove('is-touring');
    // at the natural end the system cursor stays hidden until the hand moves (one clean last
    // frame for the take)
    if (natural) {
      clearTimeout(cursorTimer);
      doc.classList.add('cursor-off');
    } else wakeCursor();
  });

  // ------------------------------------------------------------------ input
  // the system cursor hides after 2 s without movement (filming) and comes back on movement
  let cursorTimer = 0;
  let govHold = 0; // the governor ignores the frames of a resize or a full-screen animation
  const real = { x: -1, y: -1 };
  function wakeCursor() {
    doc.classList.remove('cursor-off');
    clearTimeout(cursorTimer);
    cursorTimer = setTimeout(() => doc.classList.add('cursor-off'), 2000);
  }
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return;
      const moved = Math.abs(e.clientX - real.x) + Math.abs(e.clientY - real.y) > 2;
      real.x = e.clientX;
      real.y = e.clientY;
      if (!moved) return;
      wakeCursor();
      ptr.tx = clamp((e.clientX / innerWidth) * 2 - 1, -1, 1);
      ptr.ty = clamp(1 - (e.clientY / innerHeight) * 2, -1, 1);
    },
    { passive: true },
  );
  // a click during the tour takes the page back, and does only that (like a key)
  let swallowUntil = 0;
  window.addEventListener(
    'pointerdown',
    (e) => {
      wakeCursor();
      if (e.isTrusted && touring) {
        stopTour();
        swallowUntil = performance.now() + 700;
      }
    },
    { passive: true },
  );
  window.addEventListener(
    'click',
    (e) => {
      if (!e.isTrusted || performance.now() > swallowUntil) return;
      swallowUntil = 0;
      e.stopPropagation();
      e.preventDefault();
    },
    true,
  );
  // a touch takes the page back from any programmatic glide (the wheel: scroll.js)
  window.addEventListener('touchstart', () => scroller.stop(), { passive: true });

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return; // browser shortcuts
    if (systemKey(e)) return; // F5, F11, Maj alone, Tab...: the browser's
    const isP = e.key === 'p' || e.key === 'P';
    const ours = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(e.key);
    if (isP) {
      if (!e.repeat) touring ? stopTour() : startTour();
      return;
    }
    if (touring) {
      // a key takes the page back from the tour (and does only that)
      stopTour();
      if (ours) e.preventDefault();
      return;
    }
    if (!ours) return;
    e.preventDefault();
    // a held key acts once (the auto-repeat would race through the whole story)
    if (e.repeat) return;
    switch (e.key) {
      case 'ArrowDown':
      case 'PageDown':
        stepStop(1);
        break;
      case ' ':
        stepStop(e.shiftKey ? -1 : 1);
        break;
      case 'ArrowUp':
      case 'PageUp':
        stepStop(-1);
        break;
      case 'Home':
        glideTo(0);
        break;
      case 'End':
        glideTo(L.max);
        break;
    }
  });

  // a window dragged to a screen with another scale: devicePixelRatio changes without a resize
  // event; frame() checks it and takes the same path as a resize
  let seenDpr = window.devicePixelRatio || 1;
  window.addEventListener('resize', () => {
    seenDpr = window.devicePixelRatio || 1;
    // the slow frames of a resize or of a full-screen animation are not the page's frame rate
    govHold = performance.now() + 1500;
    gov.win.length = 0;
    dpr = effDpr(level);
    world.resize(innerWidth, innerHeight, dpr);
    const old = L;
    L = layout();
    scrollSpace.style.height = `${Math.round(L.max + L.H)}px`;
    // the page height follows the window: stay on the same p
    scroller.remap((y) => yOf(pOf(y, old)), L.max);
    if (CAPTURE) renderNow();
  });

  // ------------------------------------------------------------------ governor
  // after the loader, a laptop that cannot keep up (it heats up, another app takes the GPU)
  // steps down one quality level, at most twice per session, never back up. Off with a forced
  // ?q and in ?capture (?gov=1 keeps it on with a forced ?q: a test of the governor itself)
  const gov = { on: (!FORCED || params.get('gov') === '1') && !CAPTURE, win: [], steps: 0, note: '' };
  function govStep() {
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
    govHold = performance.now() + 1000; // the new level's first frames upload buffers
    gov.steps++;
    gov.note = `${from}→${level}`;
    if (gov.steps >= 2) gov.on = false;
    if (FPS) console.info(`[Sillage] qualité abaissée : ${gov.note} (densité ${dpr})`);
  }
  // a frame is slow when it takes more than 1.5 frames of 60 Hz (or of the screen, if slower)
  const slowMs = 1.5 * Math.max(vsyncMs, 1000 / 62);
  function govWatch(raw) {
    if (!gov.on) return;
    const ms = raw * 1000;
    // a hidden tab, a resize, or the final section covering the canvas is not the 3D's frame rate
    if (document.hidden || ms > 250 || performance.now() < govHold || ui.covered) return;
    gov.win.push(ms);
    if (gov.win.length > 120) gov.win.shift();
    if (gov.win.length < 120) return;
    let slow = 0;
    for (const x of gov.win) if (x > slowMs) slow++;
    if (slow / gov.win.length > 0.25) govStep();
  }

  let fpsEl = null;
  const fpsAcc = { n: 0, t: 0, worst: 0 };
  if (FPS) {
    fpsEl = document.createElement('div');
    fpsEl.id = 'fps';
    fpsEl.textContent = `q=${level} · mesure…`;
    document.body.appendChild(fpsEl);
  }

  // ------------------------------------------------------------------ go
  function ready() {
    window.__ready = true;
    $('loader').classList.add('is-done');
    doc.classList.add('is-ready');
  }
  if (CAPTURE) ready();

  // ?auto=1: the tour starts about 2 s after the page is up, unless a hand got there first
  let autoAt = AUTO && !CAPTURE ? -1 : 0;
  const cancelAuto = (e) => {
    if (e.isTrusted && !(e.type === 'keydown' && systemKey(e))) autoAt = 0;
  };
  for (const ev of ['wheel', 'keydown', 'pointerdown', 'touchstart']) window.addEventListener(ev, cancelAuto, { passive: true });

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const raw = (now - last) / 1000;
    const dt = Math.min(0.1, Math.max(0, raw));
    last = now;
    time += dt;
    if (SLOW_MS > 0) {
      const t0 = performance.now();
      while (performance.now() - t0 < SLOW_MS);
    }
    if ((window.devicePixelRatio || 1) !== seenDpr) dispatchEvent(new Event('resize'));
    govWatch(raw);
    if (fpsEl) {
      fpsAcc.n++;
      fpsAcc.t += raw;
      fpsAcc.worst = Math.max(fpsAcc.worst, raw);
      if (fpsAcc.t >= 0.5) {
        const fps = fpsAcc.n / fpsAcc.t;
        fpsEl.textContent = `q=${gov.note || level} · ×${String(+dpr.toFixed(2)).replace('.', ',')} · ${fps < 10 ? fps.toFixed(1).replace('.', ',') : Math.round(fps)} i/s · pire ${Math.round(fpsAcc.worst * 1000)} ms`;
        fpsAcc.n = fpsAcc.t = fpsAcc.worst = 0;
      }
    }
    // the hero comes in once the loader has started to fade
    if (introT0 < 0 && window.__ready) introT0 = now + 250;
    if (intro < 1 && introT0 >= 0) intro = clamp((now - introT0) / 1500);
    const kp = 1 - Math.exp(-dt * 2.6);
    ptr.x += (ptr.tx - ptr.x) * kp;
    ptr.y += (ptr.ty - ptr.y) * kp;
    scroller.step(dt);
    renderFrame(dt);
    if (!window.__ready) {
      ready();
      wakeCursor();
      if (autoAt < 0) autoAt = now + 2000;
    }
    if (autoAt > 0 && now >= autoAt) {
      autoAt = 0;
      startTour();
    }
  }
  // a resize or a change of screen scale while the loader was up (F11 pressed during loading,
  // the window moved to another screen) came before the resize listener existed: applied now
  {
    const sz = renderer.getSize(new THREE.Vector2());
    if (sz.x !== innerWidth || sz.y !== innerHeight || renderer.getPixelRatio() !== effDpr(level) || L.H !== innerHeight) dispatchEvent(new Event('resize'));
  }
  if (!CAPTURE) requestAnimationFrame(frame);

  // ------------------------------------------------------------------ test hooks
  // __setProgress(p): jumps the scroll to p and snaps every smoothing
  window.__setProgress = (p) => {
    stopTour();
    ptr.x = ptr.y = ptr.tx = ptr.ty = 0;
    scroller.jump(yOf(clamp(+p || 0)));
    renderNow();
  };
  // __goto(name, v): 'port' | 'route' | 'mer' | 'air' | 'arrivee', v = 0..1 inside the chapter
  window.__goto = (name, v = 0) => {
    const c = CHAPTERS.find((x) => x.id === name);
    if (!c) throw new Error(`__goto: unknown « ${name} »`);
    window.__setProgress(c.from + clamp(+v || 0) * (c.to - c.from));
  };
  window.__setTime = (t) => {
    time = +t || 0;
    if (CAPTURE) renderNow();
  };
  window.__stats = () => {
    const s = (world.stats && world.stats()) || {};
    const y = scroller.st.y;
    const p = clamp(pOf(y));
    const ri = renderer.info;
    return {
      ...s,
      renderer: { calls: ri.render.calls, triangles: ri.render.triangles, textures: ri.memory.textures, geometries: ri.memory.geometries, programs: ri.programs ? ri.programs.length : 0 },
      level,
      dpr,
      measured,
      cpuMs: +cpuMs.toFixed(2),
      y: Math.round(y),
      target: Math.round(scroller.st.target),
      max: Math.round(L.max),
      p: +p.toFixed(5),
      chapter: chapterAt(p).id,
      info: world.info ? world.info() : null,
      tour: touring,
      playing: scroller.playing,
      covered: ui.covered,
      boardDone: ui.boardDone,
      anchors: lastAnchors,
      governor: { on: gov.on, steps: gov.steps, note: gov.note, vsyncMs: +vsyncMs.toFixed(2), slowMs: +slowMs.toFixed(2), window: gov.win.length },
    };
  };
  window.__world = world;
  window.__layout = () => ({ ...L });
}
