// Studio harness: the real world (src/world/index.js) without the shell, fixed views for stills.
// Build: node tools/harness.mjs tools/harness-studio/main.js .cache/harness-studio.html
// Then: node tools/harness-studio/shoot.mjs <outdir> <W> <H> <q> view1 view2 ...
// window.__view(name) renders one view (snapped, or simulated frames for the motion views) and
// returns the composition numbers (rail, garment, tags on screen, in fractions of the window).
import * as THREE from 'three';
import { createWorld } from '../../src/world/index.js';
import { PRODUCTS, HERO } from '../../src/catalog.js';
import { RAIL_LEN, PIVOT_Y } from '../../src/world/studio/layout.js';

const params = new URLSearchParams(location.search);
const quality = params.get('q') || 'high';
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });

const N = PRODUCTS.length;
function freshState() {
  return {
    view: 0, focus: -1, focusOn: 0, active: HERO,
    swap: { from: HERO, to: HERO, k: 1, dir: 1 },
    colors: PRODUCTS.map(() => 0),
    dye: { garment: HERO, from: 0, to: 0, k: 1 },
    side: 0, tagHover: -1, tagPulse: 0, pointer: { x: 0, y: 0 },
  };
}
let state = freshState();
let world = null;
let time = 0;

// one step of the world; only the last step of a simulated move is drawn (software GL is slow)
function frame(dt, draw = true) {
  time += dt >= 0.5 ? 0 : dt;
  world.update(state, dt, time);
  if (draw) world.render();
}
const snap = (patch) => {
  state = Object.assign(freshState(), patch);
  frame(1);
};

// composition: where the rail, the product garment and the tags land (fractions of the window)
function composition() {
  const { fr, rigs, picker } = world.debug;
  const W = fr.W, H = fr.H;
  const a = fr.toScreen(-RAIL_LEN / 2, PIVOT_Y, 0), b = fr.toScreen(RAIL_LEN / 2, PIVOT_Y, 0);
  const out = { rail: { y: +(a.y / H).toFixed(3), x0: +(a.x / W).toFixed(3), x1: +(b.x / W).toFixed(3), span: +((b.x - a.x) / W).toFixed(3) } };
  const r = rigs[state.active];
  const g = r.garment;
  g.group.updateMatrixWorld(true);
  const box = g.bounds.clone().applyMatrix4(g.group.matrixWorld);
  const top = fr.toScreen(g.group.position.x, box.max.y, g.group.position.z);
  const hem = fr.toScreen(g.group.position.x, g.group.position.y + g.hemY * g.group.scale.y, g.group.position.z);
  out.garment = { x: +(top.x / W).toFixed(3), top: +(top.y / H).toFixed(3), hem: +(hem.y / H).toFixed(3), scale: +g.group.scale.x.toFixed(3) };
  const an = picker.anchors();
  out.tags = an.tags.map((t) => ({ x: +(t.x / W).toFixed(3), y: +(t.y / H).toFixed(3), w: +(t.w / W).toFixed(3), h: +(t.h / H).toFixed(3) }));
  out.caption = { x: +(an.caption.x / W).toFixed(3), y: +(an.caption.y / H).toFixed(3) };
  out.title = { x: +(an.title.x / W).toFixed(3), y: +(an.title.y / H).toFixed(3) };
  const st = world.stats();
  out.calls = st.calls;
  out.triangles = st.triangles;
  out.cuts = st.rack;
  return out;
}

// a fast sweep of the hand along the rack: the shell's focus smoothing (~0.085 s) is mimicked
function sweep(frames, from = 0, to = 7, dur = 0.5) {
  snap({ focus: from, focusOn: 1 });
  const fo = { x: from, v: 0 };
  const dt = 1 / 60;
  for (let i = 1; i <= frames; i++) {
    const t = i * dt;
    const target = from + (to - from) * Math.min(1, t / dur);
    // critically damped follow
    const w = 2 / 0.085, x = w * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const ch = fo.x - target, tmp = (fo.v + w * ch) * dt;
    fo.v = (fo.v - w * tmp) * e;
    fo.x = target + (ch + tmp) * e;
    state.focus = Math.max(0, Math.min(N - 1, fo.x));
    frame(dt, i === frames);
  }
}

// a timed move of one field (the shell's easing is not needed for stills of the motion)
function run(patch0, field, a, b, dur, frames) {
  snap(patch0);
  const dt = 1 / 60;
  for (let i = 1; i <= frames; i++) {
    const k = Math.min(1, (i * dt) / dur);
    const e = k * k * (3 - 2 * k);
    if (field === 'swap') state.swap.k = e;
    else state[field] = a + (b - a) * e;
    frame(dt, i === frames);
  }
}

const VIEWS = {
  rack: () => snap({}),
  open25: () => snap({ view: 0.25, focus: HERO, focusOn: 1 }),
  open50: () => snap({ view: 0.5, focus: HERO, focusOn: 1 }),
  open75: () => snap({ view: 0.75, focus: HERO, focusOn: 1 }),
  open100: () => snap({ view: 1, focus: HERO, focusOn: 1 }),
  front: () => snap({ view: 1, focus: HERO, focusOn: 1 }),
  back: () => snap({ view: 1, focus: HERO, focusOn: 1, side: 1 }),
  side50: () => snap({ view: 1, focus: HERO, focusOn: 1, side: 0.5 }),
  swap50: () => snap({ view: 1, focus: HERO, focusOn: 1, active: HERO + 1, swap: { from: HERO, to: HERO + 1, k: 0.5, dir: 1 } }),
  dye50: () => snap({ view: 1, focus: HERO, focusOn: 1, colors: PRODUCTS.map((p, i) => (i === HERO ? 1 : 0)), dye: { garment: HERO, from: 0, to: 1, k: 0.5 } }),
  dyeYellow: () => snap({ view: 1, focus: HERO, focusOn: 1, colors: PRODUCTS.map((p, i) => (i === HERO ? 2 : 0)) }),
  tagHover: () => {
    snap({ view: 1, focus: HERO, focusOn: 1 });
    state.tagHover = 1;
    for (let i = 0; i < 18; i++) frame(1 / 60, i === 17);
  },
};
for (let i = 0; i < N; i++) {
  VIEWS[`focus${i}`] = () => snap({ focus: i, focusOn: 1 });
  VIEWS[`prod${i}`] = () => snap({ view: 1, focus: i, focusOn: 1, active: i });
}
for (const f of [6, 12, 18, 24, 30, 42, 60]) VIEWS[`sweep${f}`] = () => sweep(f);
// the hover turn itself (frames after the pointer lands on the hero)
for (const f of [5, 10, 16, 24]) {
  VIEWS[`hover${f}`] = () => {
    snap({});
    state.focus = HERO;
    for (let i = 1; i <= f; i++) {
      state.focusOn = Math.min(1, state.focusOn + (1 - state.focusOn) * (1 - Math.exp(-(1 / 60) / 0.1)));
      frame(1 / 60, i === f);
    }
  };
}
// the opening as the shell plays it (eased over 1.1 s), and the swap and side turn in motion
for (const f of [20, 33, 46, 66]) VIEWS[`opening${f}`] = () => run({ focus: HERO, focusOn: 1 }, 'view', 0, 1, 1.1, f);
for (const f of [20, 30, 40]) VIEWS[`swapping${f}`] = () => run({ view: 1, focus: HERO, focusOn: 1, active: HERO + 1, swap: { from: HERO, to: HERO + 1, k: 0, dir: 1 } }, 'swap', 0, 1, 1.0, f);
for (const f of [24, 40, 56]) VIEWS[`turning${f}`] = () => run({ view: 1, focus: HERO, focusOn: 1 }, 'side', 0, 1, 0.8, f);

// the rack's cut-through check over whole moves: worst count of crossing pairs over every frame
window.__cutProbe = () => {
  const out = {};
  for (const [name, fn] of [['sweepFast', () => sweepProbe(0, 7, 0.45)], ['sweepSlow', () => sweepProbe(0, 7, 2.5)], ['sweepBack', () => sweepProbe(7, 1, 0.6)]]) out[name] = fn();
  return out;
};
function sweepProbe(from, to, dur) {
  snap({ focus: from, focusOn: 1 });
  const fo = { x: from, v: 0 };
  const dt = 1 / 60;
  let worst = 0, frames = 0, maxSwing = 0, maxFwdSwing = 0;
  const n = Math.round((dur + 1.5) / dt);
  for (let i = 1; i <= n; i++) {
    const target = from + (to - from) * Math.min(1, (i * dt) / dur);
    const w = 2 / 0.085, x = w * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const ch = fo.x - target, tmp = (fo.v + w * ch) * dt;
    fo.v = (fo.v - w * tmp) * e;
    fo.x = target + (ch + tmp) * e;
    state.focus = Math.max(0, Math.min(N - 1, fo.x));
    frame(dt, false);
    const c = world.stats().rack;
    if (c.cuts) frames++;
    worst = Math.max(worst, c.cuts);
    for (const r of world.debug.rigs) {
      maxSwing = Math.max(maxSwing, Math.abs(r.sz.a));
      maxFwdSwing = Math.max(maxFwdSwing, Math.abs(r.sx.a));
    }
  }
  return { worstPairs: worst, framesWithCuts: frames, frames: n, maxSwingDeg: +(maxSwing * 57.3).toFixed(2), maxFwdSwingDeg: +(maxFwdSwing * 57.3).toFixed(2) };
}

window.__view = (name) => {
  if (!VIEWS[name]) throw new Error('unknown view ' + name);
  VIEWS[name]();
  return composition();
};
window.__stats = () => world.stats();
window.__dbg = () => world.debug;
window.__snapState = (p) => snap(p);
window.__setQuality = (q) => {
  world.setQuality(q);
  return world.stats();
};

(async () => {
  const t0 = performance.now();
  world = await createWorld({ renderer, quality });
  world.resize(innerWidth, innerHeight, 1);
  window.__buildMs = Math.round(performance.now() - t0);
  snap({});
  await world.warmup();
  snap({});
  window.__ready = true;
})().catch((e) => {
  console.error(e);
  window.__error = String(e.stack || e);
});
addEventListener('resize', () => world && (world.resize(innerWidth, innerHeight, 1), frame(1)));
