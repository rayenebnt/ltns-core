// RUELLE page shell: renderer, loader, quality test and governor, input (pointer, clicks, wheel
// and trackpad, keys), the hands-free tour, test hooks. The 3D world is a separate module behind
// the WORLD CONTRACT (createWorld / update / render / resize / warmup / setQuality / stats /
// pick / anchors / info / camera); the director (director.js) owns every timing of its state.
import * as THREE from 'three';
import * as WORLD from './world/index.js';
import { HERO } from './catalog.js';
import { createDirector, N, magnet } from './director.js';
import { createUI } from './ui.js';
import { createTour } from './tour.js';
import { clamp, mix } from './util.js';

const params = new URLSearchParams(location.search);
const CAPTURE = params.has('capture');
const AUTO = params.get('auto') === '1';
const FPS = params.get('fps') === '1';
const Q = params.get('q');

// quality levels: the pixel density (capped by the screen) AND the world's own cost (shadow map,
// mesh density, material features) change together
export const LEVELS = ['low', 'medium', 'high', 'max'];
const DPR = { low: 1, medium: 1.5, high: 1.75, max: 2 };
const FORCED = LEVELS.includes(Q);
const effDpr = (lv) => Math.min(window.devicePixelRatio || 1, DPR[lv]);
// quality test: the 80th percentile of the frame interval at each station must stay under one
// 60 Hz frame (a missed vsync shows as 33 ms); then a governor watches the real frames
const BUDGET_MS = 17.4;
const SLOW_MS = +(params.get('slow') || 0); // debug: busy-wait this long in every frame
const PX_PER_SLOT = 90; // wheel / trackpad px that move the focus by one garment
const WHEEL_END_MS = 170; // a gesture ends after this much silence: the focus lands on a garment

const doc = document.documentElement;
const $ = (id) => document.getElementById(id);
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const loaderFill = $('loader-fill');
let loadShown = 0;
const setLoad = (x) => {
  loadShown = Math.max(loadShown, clamp(x));
  if (loaderFill) loaderFill.style.transform = `scaleX(${loadShown.toFixed(3)})`;
};

window.__ready = false;
// the hooks exist from the first line (no-ops until the world is up, and without WebGL 2)
window.__set = window.__goto = window.__setTime = () => {};
window.__stats = () => ({ ready: window.__ready });
window.__world = null;
if (CAPTURE) doc.classList.add('is-capture');
// no pinch-zoom while the page loads either: a trackpad pinch reaches the page as ctrl + wheel,
// and once zoomed, the same gesture could not undo it after loading (code review)
window.addEventListener('wheel', (e) => {
  if (e.ctrlKey) e.preventDefault();
}, { passive: false });

// the browser's and the system's own keys (F5 reload, F11 full screen, F12, a lone Maj or
// Verr. Maj, volume and media keys): never swallowed, never taken as a hand on the page (code
// review: during the tour the first F5 only stopped it, the page did not reload)
const systemKey = (e) =>
  /^F\d{1,2}$/.test(e.key) ||
  ['Shift', 'CapsLock', 'Fn', 'FnLock', 'PrintScreen', 'Unidentified', 'Meta', 'OS', 'Control', 'Alt', 'AltGraph'].includes(e.key) ||
  /^(Audio|Media|Brightness)/.test(e.key);

function showNoGL() {
  $('nogl').hidden = false;
  $('loader').classList.add('is-done');
  document.body.classList.add('no-gl');
  doc.classList.remove('cursor-off', 'is-touring');
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
      document.fonts.load("400 40px 'Lilita One'", 'ruelle'),
      document.fonts.load("500 12px 'Inter Tight'", 'À PROPOS'),
      document.fonts.load("700 12px 'Inter Tight'", 'VOIR LA DISPO'),
      document.fonts.load("800 18px 'Inter Tight'", 'T-SHIRT RIEN À PROUVER'),
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
      // second: the message only if it does not (code review: after a restore the page stayed
      // on « Cette page a besoin de WebGL 2 » for good)
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

  // ------------------------------------------------------------------ state, UI
  const director = createDirector();
  const state = director.state;
  let time = 0;
  let measured = [];
  let cpuMs = 0;

  const ui = createUI({
    onClose: () => act(() => director.close()),
    onGo: (d) => act(() => director.go(d)),
    onSide: (b) => act(() => director.setSide(b)),
  });

  // the rack's screen geometry, for the tour and the keyboard: the hook x of each garment
  // (world.info) and a height inside the garments (probed with world.pick: the chest, where a
  // hand points at a garment); measured in the rack view, again after a resize
  const rackGeo = { xs: null, y: 0.45 * innerHeight, railY: 0.3 * innerHeight, ok: false };
  function measureRack() {
    const info = (world.info && world.info()) || {};
    rackGeo.xs = info.slots ? info.slots.map((s) => s.x) : null;
    if (info.slots && Number.isFinite(info.slots[0].y)) rackGeo.railY = info.slots[0].y;
    ui.measure(info);
    if (!rackGeo.xs || state.view > 0.001) return;
    const x = rackGeo.xs[HERO];
    let lo = -1, hi = -1;
    for (let f = 0.12; f <= 0.9; f += 0.01) {
      const h = pickAt(x, f * innerHeight);
      if (h && h.kind === 'garment') {
        if (lo < 0) lo = f;
        hi = f;
      }
    }
    if (lo >= 0) rackGeo.y = mix(lo, hi, 0.38) * innerHeight;
    rackGeo.ok = true;
  }
  function rackPoint(slot) {
    const xs = rackGeo.xs;
    if (!xs) return null;
    const s = clamp(slot, 0, xs.length - 1);
    const i = Math.min(xs.length - 2, Math.floor(s));
    return { x: mix(xs[i], xs[i + 1], s - i), y: rackGeo.y };
  }

  function pickAt(x, y) {
    if (!world.pick) return null;
    return world.pick((x / innerWidth) * 2 - 1, 1 - (y / innerHeight) * 2);
  }
  // a hang tag swings (the opening, the hover's own kick) and can slide off a still pointer:
  // within its screen rect, 10 px around, it still counts as under the pointer
  function nearTag(i, x, y) {
    const an = world.anchors ? world.anchors() : null;
    const r = an && an.tags ? an.tags[i] : null;
    return !!r && x > r.x - 10 && x < r.x + r.w + 10 && y > r.y - 10 && y < r.y + r.h + 10;
  }

  // ------------------------------------------------------------------ frames
  function renderFrame(dt, o = {}) {
    const t0 = performance.now();
    world.update(state, dt, time);
    const an = world.anchors ? world.anchors() : null;
    ui.update(state, an, director, { instant: !!o.instant, dt });
    world.render();
    cpuMs = cpuMs * 0.9 + (performance.now() - t0) * 0.1;
  }
  const renderNow = () => renderFrame(1, { instant: true });

  // ------------------------------------------------------------------ warm-up and quality test
  director.set({ view: 0, focus: -1, focusOn: 0 });
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

  // stations: the rack at rest, the rack with the hero turned, mid-opening, the product view
  const STATIONS = [
    { view: 0, focus: -1, focusOn: 0 },
    { view: 0, focus: HERO, focusOn: 1 },
    { view: 0.5, active: HERO, focus: HERO, focusOn: 1 },
    { view: 1, active: HERO, focus: HERO, focusOn: 1 },
  ];
  async function measureLevel() {
    let worst = 0;
    for (const st of STATIONS) {
      director.set(st);
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
    if (FPS) console.info(`[Ruelle] qualité ${level} (densité ${dpr}) : ${measured.join(', ')}`);
    if (measured.length > 1) await world.warmup(); // the locked level's programs, once more
    time = 0;
  }
  setLoad(1);

  // back to the start: the rack, nothing focused, the caption on the hero
  director.set({ view: 0, focus: -1, focusOn: 0, active: HERO, side: 0, pointer: { x: 0, y: 0 } });
  renderNow();
  measureRack();
  renderNow();

  // ------------------------------------------------------------------ actions
  // every action goes through here: nothing while the product view opens or closes, except in
  // the last part of the opening, where the product view is already on screen: the action is
  // kept and runs as soon as the view has landed (v2, ux review: a click or a key made in the
  // last 0.3 s of the opening was silently lost, a missed click on film)
  let pending = null;
  const landing = () => director.mode() === 'opening' && state.view > 0.8;
  function act(fn) {
    if (landing()) {
      pending = fn;
      return true;
    }
    if (director.busy()) return false;
    return fn();
  }
  function canvasClick(x, y) {
    if (director.busy() && !landing()) return;
    const m = director.mode();
    let hit = pickAt(x, y);
    // a hovered hang tag that swung off the pointer still takes the click (look audit: the first
    // click on ROSE right after the opening could be lost; see input())
    if (m === 'product' && !hit && state.tagHover >= 0 && nearTag(state.tagHover, x, y)) hit = { kind: 'tag', index: state.tagHover };
    if (!hit) return;
    if (m === 'rack' && hit.kind === 'garment') {
      // after a swipe or an arrow key the garment that faces the camera (and is named in the
      // caption) is the one a tap opens, wherever the resting hand is (v2, ux review)
      const ft = director.focusTarget;
      director.open(focusSource === 'keys' && ft !== null ? Math.round(ft) : hit.index);
    } else if (hit.kind === 'tag') act(() => director.dyeTo(hit.index));
  }
  // the tour's clicks: the real button under the point, or the 3D
  function clickAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const b = el && el.closest ? el.closest('button') : null;
    if (b) b.click();
    else canvasClick(x, y);
  }

  // ------------------------------------------------------------------ the tour
  const cursorEl = $('cursor');
  let virtual = null; // where the tour left its pointer, until the real one moves
  function tourTarget(name, arg) {
    if (name === 'slot') return rackPoint(arg);
    // the glides' targets: left of the first garment, and above the rail over a garment
    if (name === 'rackLeft') {
      const p = rackPoint(0), q = rackPoint(1);
      return p && q ? { x: p.x - 0.9 * (q.x - p.x), y: p.y } : null;
    }
    if (name === 'aboveRack') {
      const p = rackPoint(arg);
      return p ? { x: p.x, y: rackGeo.railY - 50 } : null;
    }
    if (name === 'tag') {
      const an = world.anchors();
      const t = an && an.tags && an.tags[arg];
      if (!t) return null;
      // {x, y, w, h} with x, y the top-left corner: aim a little below the middle (the paper,
      // not the thread); the first point that really picks this tag wins (a centre-based rect
      // from the world would still be hit)
      const cands = [{ x: t.x + t.w / 2, y: t.y + t.h * 0.58 }, { x: t.x, y: t.y + t.h * 0.08 }, { x: t.x + t.w / 2, y: t.y + t.h / 2 }];
      for (const p of cands) {
        const hit = pickAt(p.x, p.y);
        if (hit && hit.kind === 'tag' && hit.index === arg) return p;
      }
      return cands[0];
    }
    if (name === 'side') return ui.centerOf(ui.els.segs[arg]);
    if (name === 'arrow') return ui.centerOf(arg < 0 ? ui.els.prev : ui.els.next);
    if (name === 'close') {
      const r = ui.els.close.getBoundingClientRect();
      return { x: r.left + r.width * 0.42, y: r.top + r.height / 2 };
    }
    return null;
  }
  const tour = createTour({
    el: cursorEl,
    target: tourTarget,
    clickAt,
    // the hero dyes back to Noir on the rack, where it hangs turned away (after the close when
    // the tour starts in the product view)
    onReset: () => director.resetHero(),
    onEnd: () => {
      doc.classList.remove('is-touring');
      virtual = { ...tour.pos };
      // at the natural end the tour's arrow stays parked on the hero and the system cursor
      // stays hidden until the hand moves: one arrow in the last frame of a take (v2, ux review)
      if (tour.done) {
        clearTimeout(cursorTimer);
        doc.classList.add('cursor-off');
      } else wakeCursor();
    },
  });
  let focusSource = 'pointer'; // 'pointer' (real or tour) | 'keys' (keyboard, wheel)
  // P pressed while the product view opens or closes: the tour starts as soon as it has landed
  // (code review: P right after FERMER or Échap was silently ignored)
  let tourQueued = false;
  function startTour() {
    if (CAPTURE) return;
    if (director.busy()) {
      tourQueued = true;
      return;
    }
    tourQueued = false;
    const m = director.mode();
    doc.classList.add('is-touring');
    focusSource = 'pointer';
    pending = null;
    // every take plays both dyes (noir -> rose -> jaune), whatever was clicked before: the hero
    // dyes back to Noir at the start (tour.js 'reset' step), the other garments are left alone
    const p0 = real.inside ? { x: real.x, y: real.y } : virtual || { x: innerWidth * 0.56, y: innerHeight * 0.78 };
    tour.start(p0, m === 'product', director.heroNeedsReset());
  }
  function stopTour() {
    tourQueued = false;
    if (tour.playing) tour.stop();
  }

  // ------------------------------------------------------------------ input
  const real = { x: -1, y: -1, inside: false };
  const wheel = { active: false, target: 0, last: 0 };

  // the system cursor hides after 2 s without movement (filming) and comes back on movement
  let cursorTimer = 0;
  let govHold = 0; // the governor ignores the frames of a resize or a full-screen animation
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
      // the parked tour arrow: a tremor does not wake the system cursor, a real move does
      if (tour.parked) {
        if (!moved && real.inside) return;
        tour.unpark();
      }
      wakeCursor();
      real.x = e.clientX;
      real.y = e.clientY;
      real.inside = true;
      if (moved) {
        virtual = null;
        if (!wheel.active) focusSource = 'pointer';
      }
    },
    { passive: true },
  );
  document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget) real.inside = false;
  });
  window.addEventListener('blur', () => (real.inside = false));
  // a click during the tour takes the page back, and does only that (like a key)
  let swallowUntil = 0;
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (tour.parked) tour.unpark();
      wakeCursor();
      if (e.isTrusted && tour.playing) {
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
  canvas.addEventListener('click', (e) => canvasClick(e.clientX, e.clientY));

  // two-finger swipes (horizontal or vertical) and mouse wheels walk the rack
  window.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault(); // no page zoom (pinch) and no history swipe while filming
      if (e.isTrusted) stopTour();
      if (e.ctrlKey || director.mode() !== 'rack') return;
      const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? innerHeight : 1;
      const dx = e.deltaX * unit, dy = e.deltaY * unit;
      const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (!wheel.active) wheel.target = director.focusBase();
      wheel.target = clamp(wheel.target + d / PX_PER_SLOT, 0, N - 1);
      wheel.last = performance.now();
      wheel.active = true;
      focusSource = 'keys';
      virtual = null;
      director.setFocusTarget(wheel.target);
    },
    { passive: false },
  );

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return; // browser shortcuts
    if (systemKey(e)) return; // F5, F11, Maj alone...: the browser's
    if (tour.parked) {
      tour.unpark();
      wakeCursor();
    }
    const isP = e.key === 'p' || e.key === 'P';
    if (isP) {
      if (!e.repeat) {
        if (tourQueued) tourQueued = false; // pressed twice during an opening or a closing: no tour
        else tour.playing ? stopTour() : startTour();
      }
      return;
    }
    if (tour.playing) {
      // a key takes the page back from the tour (and does only that)
      stopTour();
      e.preventDefault();
      return;
    }
    if (director.busy() && !landing()) {
      if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) e.preventDefault();
      return;
    }
    const m = landing() ? 'product' : director.mode();
    if (m === 'rack') {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        // one press, one garment: a held arrow (about 30 repeats a second) whipped the rack
        // faster than its neighbours can make room (page audit)
        if (e.repeat) return;
        const base = director.focusBase();
        focusSource = 'keys';
        virtual = null;
        wheel.active = false;
        director.setFocusTarget(clamp(Math.round(base) + (e.key === 'ArrowRight' ? 1 : -1), 0, N - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        director.open(director.captionIndex);
      }
    } else if (m === 'product') {
      // a held key acts once (code review: the auto-repeat flipped DEVANT/DOS about 30 times a
      // second, and a held arrow queued a whole turn of the carousel)
      if (e.repeat) {
        if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
        return;
      }
      // (through act(): kept for the landing when pressed at the end of the opening)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const d = e.key === 'ArrowRight' ? 1 : -1;
        act(() => director.go(d));
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        act(() => director.toggleSide());
      } else if ((e.key >= '1' && e.key <= '9' && e.key.length === 1) || /^(Digit|Numpad)[1-9]$/.test(e.code)) {
        // (QA: by the physical key too: on a French AZERTY keyboard the digit row types & é "
        // without Maj, so e.key alone ignored 1-3 unless Maj was held)
        const v = (e.key >= '1' && e.key <= '9' && e.key.length === 1 ? +e.key : +e.code.slice(-1)) - 1;
        act(() => director.dyeTo(v));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        act(() => director.close());
      }
    }
  });

  // a window dragged to a screen with another scale: devicePixelRatio changes without a resize
  // event (code review); frame() checks it and takes the same path as a resize
  let seenDpr = window.devicePixelRatio || 1;
  window.addEventListener('resize', () => {
    seenDpr = window.devicePixelRatio || 1;
    // the slow frames of a resize or of a full-screen animation are not the page's frame rate:
    // the governor starts its count again 1.5 s later (code review)
    govHold = performance.now() + 1500;
    gov.win.length = 0;
    dpr = effDpr(level);
    world.resize(innerWidth, innerHeight, dpr);
    ui.measure((world.info && world.info()) || {});
    rackGeo.ok = false; // the tour's rack points: measured again on the next rack frame
    if (CAPTURE) {
      renderNow();
      measureRack();
      renderNow();
    }
  });

  // per frame: the pointer that acts (the tour's, the one it left, or the real one) is picked in
  // the world: the focus along the rack, or the hovered hang tag
  let canvasCursor = '';
  function setCanvasCursor(c) {
    if (c === canvasCursor) return;
    canvasCursor = c;
    canvas.style.cursor = c;
  }
  function input(dt) {
    const tp = tour.step(dt);
    const p = tp || virtual || (real.inside ? real : null);
    if (p) director.setPointer((p.x / innerWidth) * 2 - 1, 1 - (p.y / innerHeight) * 2);
    // a wheel gesture lands on the nearest garment once it stops
    if (wheel.active && performance.now() - wheel.last > WHEEL_END_MS) {
      wheel.active = false;
      director.setFocusTarget(Math.round(wheel.target));
    }
    const m = director.mode();
    if (m === 'rack') {
      if (!rackGeo.ok && state.view <= 0.001) measureRack();
      if (tp && !tour.hovering) {
        // the tour's hand glides to its start (or back over the rail) without brushing the
        // garments it passes: the rack settles calmly (v2, ux review: a fast wave of 4 or 5
        // garments opened and closed every take)
        director.setFocusTarget(tour.hold);
        setCanvasCursor('');
      } else if (focusSource === 'pointer') {
        const hit = p ? pickAt(p.x, p.y) : null;
        const on = hit && hit.kind === 'garment';
        director.setFocusTarget(on ? magnet(Number.isFinite(hit.slot) ? hit.slot : hit.index) : null);
        setCanvasCursor(on && !tp ? 'pointer' : '');
      } else setCanvasCursor('');
      state.tagHover = -1;
    } else if (m === 'product') {
      const hit = p ? pickAt(p.x, p.y) : null;
      let th = hit && hit.kind === 'tag' ? hit.index : -1;
      // a hovered tag that swung off the still pointer stays hovered while the pointer is in its
      // rect (look audit: the pick missed over the wall, the hover dropped and the first click
      // on ROSE right after the opening was lost); over the garment it lets go at once
      if (p && !hit && state.tagHover >= 0 && nearTag(state.tagHover, p.x, p.y)) th = state.tagHover;
      state.tagHover = th;
      setCanvasCursor(state.tagHover >= 0 && !tp ? 'pointer' : '');
    } else {
      state.tagHover = -1;
      setCanvasCursor('');
    }
  }

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
    gov.steps++;
    gov.note = `${from}→${level}`;
    if (gov.steps >= 2) gov.on = false;
    if (FPS) console.info(`[Ruelle] qualité abaissée : ${gov.note} (densité ${dpr})`);
  }
  // a frame is slow when it takes more than 1.5 frames of 60 Hz (or of the screen, if slower)
  const slowMs = 1.5 * Math.max(vsyncMs, 1000 / 62);
  function govWatch(raw) {
    if (!gov.on) return;
    const ms = raw * 1000;
    // a hidden tab or a resize is not the page's frame rate
    if (document.hidden || ms > 250 || performance.now() < govHold) return;
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
    fpsEl.textContent = `q=${level} · mesure…`; // (the first figures come after half a second)
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
  let autoAt = AUTO && !CAPTURE ? performance.now() + 2000 : 0;
  const cancelAuto = (e) => {
    if (e.isTrusted && !(e.type === 'keydown' && systemKey(e))) autoAt = 0;
  };
  for (const ev of ['wheel', 'keydown', 'pointerdown']) window.addEventListener(ev, cancelAuto, { passive: true });

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
    input(dt);
    director.step(dt);
    if (tourQueued && !director.busy()) startTour();
    if (pending && director.mode() === 'product') {
      const fn = pending;
      pending = null;
      fn();
    } else if (pending && director.mode() !== 'opening') pending = null;
    renderFrame(dt);
    if (!window.__ready) {
      ready();
      if (!real.inside) wakeCursor();
    }
    if (autoAt && now >= autoAt) {
      autoAt = 0;
      startTour();
    }
  }
  // a resize or a change of screen scale while the loader was up (F11 pressed during loading,
  // the window moved to another screen) came before the resize listener existed: applied now
  // (code review: the scene stayed stretched, or drawn at the old scale, until the next resize)
  {
    const sz = renderer.getSize(new THREE.Vector2());
    if (sz.x !== innerWidth || sz.y !== innerHeight || renderer.getPixelRatio() !== effDpr(level)) dispatchEvent(new Event('resize'));
  }
  if (!CAPTURE) requestAnimationFrame(frame);

  // ------------------------------------------------------------------ test hooks
  // __set merges into the state and renders once with every smoothing snapped
  window.__set = (p) => {
    director.set(p || {});
    renderNow();
  };
  // shortcuts: 'rack' (v = focus slot, -1 none), 'product' (v = garment, fully open),
  // 'open' (v = 0..1 opening progress of the hero)
  window.__goto = (name, v) => {
    if (name === 'rack') {
      const f = v === undefined ? -1 : +v;
      director.set({ view: 0, focus: f, focusOn: f >= 0 ? 1 : 0, side: 0, swap: { k: 1 }, dye: { k: 1 }, tagHover: -1 });
    } else if (name === 'product') {
      const i = clamp(Math.round(v ?? HERO), 0, N - 1);
      director.set({ view: 1, active: i, focus: i, focusOn: 1, side: 0, swap: { from: i, to: i, k: 1, dir: 1 }, dye: { k: 1 }, tagHover: -1 });
    } else if (name === 'open') {
      // (from the rack: the world sees an opening, whatever the view was before)
      director.set({ view: 0, active: HERO, focus: HERO, focusOn: 1, side: 0, swap: { from: HERO, to: HERO, k: 1, dir: 1 }, dye: { k: 1 }, tagHover: -1 });
      world.update(state, 1, time);
      director.set({ view: clamp(+v || 0) });
    } else throw new Error(`__goto: unknown « ${name} »`);
    renderNow();
  };
  window.__setTime = (t) => {
    time = +t || 0;
    if (CAPTURE) renderNow();
  };
  window.__stats = () => {
    const s = (world.stats && world.stats()) || {};
    return {
      ...s,
      level,
      dpr,
      measured,
      cpuMs: +cpuMs.toFixed(2),
      mode: director.mode(),
      state: JSON.parse(JSON.stringify(state)),
      focusTarget: director.focusTarget,
      captionIndex: director.captionIndex,
      tour: tour.playing,
      pending: !!pending,
      governor: { on: gov.on, steps: gov.steps, note: gov.note, vsyncMs: +vsyncMs.toFixed(2), slowMs: +slowMs.toFixed(2), window: gov.win.length },
    };
  };
  window.__world = world;
}
