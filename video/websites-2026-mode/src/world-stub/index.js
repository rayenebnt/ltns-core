// Cheap stand-in for the 3D world (WORLD=stub node build.mjs): the WHOLE world contract with
// simple shapes, so the shell can be tested end to end.
//   createWorld({ renderer, quality, onProgress }) -> world
//   world.camera, update(state, dt, time), render(), resize(w, h, dpr), warmup(), setQuality(level),
//   stats(), pick(ndcX, ndcY), anchors(), info()
// Flat cards in the catalogue colours on simple hangers, a rail, paper tags on threads. It answers
// every state field visibly: the hover turn (a spring with overshoot), the opening, the rising dye
// front, the front/back flip, the prev/next slide, the tag hover swing and pulse.
// Units: metres, +Y up; the rail is 1.9 m long, the garments real size (a tee is ~0.7 m long).
import * as THREE from 'three';
import { PRODUCTS, BRAND } from '../catalog.js';

export const rendererOptions = { antialias: true };

const N = PRODUCTS.length;
const SP = 0.228; // m between hooks
const RAIL_LEN = SP * N + 0.18;
const RAIL_Y = 1.6; // m, the rail
const HOOK_DROP = 0.07; // m from the rail to the hanger bar
const PROD_SCALE = 1.62; // the product view garment, relative to the rack
const PROD_HOOK = 0.14; // fraction of the screen height from the top to the product hook
const LEN = { longsleeve: 0.74, tee: 0.68, tank: 0.64, varsity: 0.66, hoodie: 0.72, jersey: 0.72 };
const WID = { longsleeve: 0.46, tee: 0.54, tank: 0.4, varsity: 0.56, hoodie: 0.56, jersey: 0.52 };
const REST_YAW = [1.2, 1.24, 1.16, 1.26, 1.19, 1.27, 1.17, 1.22]; // rad, ~66-73°: a real rail

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

// damped spring, semi-implicit Euler; dt >= 0.5 snaps
function spring(o, target, dt, w = 13, z = 0.55) {
  if (dt >= 0.5) {
    o.x = target;
    o.v = 0;
    return o.x;
  }
  const n = Math.max(1, Math.ceil(dt / (1 / 120)));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    o.v += (-w * w * (o.x - target) - 2 * z * w * o.v) * h;
    o.x += o.v * h;
  }
  return o.x;
}

function tagTexture(text, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 200;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 96, 200);
  g.fillStyle = fg;
  g.beginPath();
  g.arc(48, 22, 7, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  g.arc(48, 22, 4, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = 'source-over';
  g.save();
  g.translate(56, 110);
  g.rotate(Math.PI / 2);
  g.font = "800 20px 'Inter Tight', sans-serif";
  g.textAlign = 'center';
  g.fillText(text, 0, 0);
  g.restore();
  g.font = "400 15px 'Lilita One', sans-serif";
  g.textAlign = 'center';
  g.fillText('ruelle', 48, 188);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const isLight = (hex) => {
  const c = new THREE.Color(hex);
  return c.r * 0.3 + c.g * 0.59 + c.b * 0.11 > 0.35;
};

export async function createWorld({ renderer, quality = 'high', onProgress = () => {} }) {
  try {
    await Promise.all([document.fonts.load("800 20px 'Inter Tight'"), document.fonts.load("400 15px 'Lilita One'")]);
  } catch (e) {
    /* system fonts */
  }
  onProgress(0.2);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BRAND.paper);
  const camera = new THREE.PerspectiveCamera(24, 16 / 10, 0.1, 50);
  let W = 1440, H = 900, level = quality;

  const flat = (color, o = {}) => new THREE.MeshBasicMaterial({ color, transparent: true, ...o });
  const plane = new THREE.PlaneGeometry(1, 1);

  // the wall's soft shadow band under the rack, and the rail with its end caps
  const shadow = new THREE.Mesh(plane, flat(0x000000, { opacity: 0.05, depthWrite: false }));
  shadow.scale.set(RAIL_LEN * 0.95, 0.8, 1);
  shadow.position.set(0, RAIL_Y - 0.42, -0.4);
  scene.add(shadow);
  const railMat = new THREE.MeshLambertMaterial({ color: 0xc9cacc, transparent: true, emissive: 0x6f7073 });
  const rail = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, RAIL_LEN, 12), railMat);
  bar.rotation.z = Math.PI / 2;
  rail.add(bar);
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), railMat);
    cap.position.x = (s * RAIL_LEN) / 2;
    rail.add(cap);
  }
  rail.position.y = RAIL_Y;
  scene.add(rail, new THREE.HemisphereLight(0xffffff, 0x999999, 1.2));

  // ------------------------------------------------------------------ garments
  const slotX = (i) => (i - (N - 1) / 2) * SP;
  const garments = PRODUCTS.map((p, i) => {
    const len = LEN[p.type] || 0.68, wid = WID[p.type] || 0.5;
    const root = new THREE.Group(); // the hook point
    const turn = new THREE.Group(); // yaw on the hook
    root.add(turn);
    const mats = [];
    const add = (mat, w, h, x, y, z, ry = 0) => {
      const m = new THREE.Mesh(plane, mat);
      m.scale.set(w, h, 1);
      m.position.set(x, y, z);
      m.rotation.y = ry;
      turn.add(m);
      mats.push(mat);
      return m;
    };
    add(flat(0x8a8d91), 0.012, HOOK_DROP, 0, -HOOK_DROP / 2, 0); // hook
    add(flat(0x9a6a3f), wid * 0.86, 0.026, 0, -HOOK_DROP, 0.004); // wooden bar, front
    add(flat(0x9a6a3f), wid * 0.86, 0.026, 0, -HOOK_DROP, -0.004, Math.PI);
    const top = -HOOK_DROP - 0.012;
    const cy = top - len / 2;
    const body = [], dye = [], wet = [], print = [];
    for (const [z, ry] of [[0.002, 0], [-0.002, Math.PI]]) {
      body.push(add(flat(0xffffff), wid, len, 0, cy, z, ry));
      const d = add(flat(0xffffff), wid, len, 0, cy, z * 1.5, ry);
      dye.push(d);
      wet.push(add(flat(0x000000, { opacity: 0.12 }), wid, 0.035, 0, cy, z * 1.75, ry));
    }
    // prints: a big block on the front, a small neck strip on the back
    print.push(add(flat(0xffffff), wid * 0.56, len * 0.3, 0, top - len * 0.32, 0.006));
    print.push(add(flat(0xffffff), wid * 0.3, len * 0.05, 0, top - len * 0.1, -0.006, Math.PI));
    scene.add(root);
    return {
      p, i, len, wid, root, turn, mats, body, dye, wet, print, top,
      yaw: { x: REST_YAW[i], v: 0 }, sway: { x: 0, v: 0 }, fwd: { x: 0, v: 0 }, lastFocusD: 9,
    };
  });

  // ------------------------------------------------------------------ hang tags (product view)
  const tags = [0, 1, 2].map((k) => {
    const g = new THREE.Group(); // the thread's top
    const thread = new THREE.Mesh(plane, flat(0x3a3a3c));
    const card = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ transparent: true }));
    g.add(thread, card);
    scene.add(g);
    return { g, thread, card, sw: { x: 0, v: 0 }, tex: {}, w: 0.055, h: 0.115, len: 0.08 + k * 0.035, garment: -1, variant: -1 };
  });
  function tagTex(t, gi, vi) {
    const key = `${gi}:${vi}`;
    if (!t.tex[key]) {
      const v = PRODUCTS[gi].variants[vi];
      t.tex[key] = tagTexture(v.tag, v.body, isLight(v.body) ? '#151517' : '#f2f0ea');
    }
    return t.tex[key];
  }
  onProgress(0.7);

  // ------------------------------------------------------------------ framing
  // the rail spans ~60 % of the width at ~30 % of the height; the product garment's hook sits
  // at PROD_HOOK of the height
  const fr = { D: 4.6, H: 2, cy: 1.2 };
  const TANF = Math.tan(THREE.MathUtils.degToRad(12));
  function frame() {
    const aspect = W / H;
    let vh = RAIL_LEN / 0.6 / aspect; // visible height (m) when the rail spans 60 % of the width
    vh = Math.max(vh, 1.78); // a very wide window: the rail spans less, the garments stay small
    fr.H = vh;
    fr.D = vh / (2 * TANF);
    fr.cy = RAIL_Y - 0.2 * vh; // the rail 30 % from the top
    camera.aspect = aspect;
    camera.position.set(0, fr.cy, fr.D);
    camera.lookAt(0, fr.cy, 0);
    camera.updateProjectionMatrix();
  }
  const prodHookY = () => fr.cy + fr.H / 2 - PROD_HOOK * fr.H;
  // the product garment grows ~1.6x, less in a short window: hook to hem stays under 56 % of it
  const prodScale = (g) => Math.min(PROD_SCALE, (0.56 * fr.H) / (HOOK_DROP + 0.012 + g.len));

  // ------------------------------------------------------------------ per frame
  const st = { view: 0, focus: -1, focusOn: 0, active: 1, side: 0, swap: { from: 1, to: 1, k: 1, dir: 1 } };
  let lastFocus = 1, prevFocus = -1, prevPulse = 0;
  const col = new THREE.Color();

  function pose(g, view, swap) {
    // where garment g hangs and how it turns, before the springs
    const i = g.i;
    const rack = { x: slotX(i), y: RAIL_Y, z: 0, s: 1, a: 1 };
    const prodY = prodHookY();
    const active = st.active;
    if (view <= 0) return rack;
    if (i === swap.from && swap.k < 1 && i !== active) {
      // sliding out
      return { x: -swap.dir * swap.k * 2.2, y: prodY, z: 0.25, s: prodScale(g), a: 1 - smooth(0.55, 1, swap.k) };
    }
    if (i === active) {
      const sx = swap.k < 1 && swap.from !== swap.to ? swap.dir * (1 - swap.k) * 2.2 : 0;
      const e = view;
      return {
        x: mix(rack.x, sx, e),
        y: mix(rack.y, prodY, e) + Math.sin(Math.PI * e) * 0.06,
        z: mix(0, 0.25, e),
        s: mix(1, prodScale(g), e),
        a: swap.k < 1 && swap.from !== swap.to ? smooth(0, 0.45, swap.k) : 1,
      };
    }
    // the others drift outward and fade
    const dir = Math.sign(i - active) || 1;
    return { x: rack.x + dir * smooth(0, 1, view) * 1.3, y: rack.y, z: -0.1 * view, s: 1, a: 1 - smooth(0, 0.65, view) };
  }

  function update(state, dt, time) {
    Object.assign(st, { view: state.view, focus: state.focus, focusOn: state.focusOn, active: state.active, side: state.side });
    st.swap = state.swap;
    const snap = dt >= 0.5;
    if (state.focus >= 0 && state.focusOn > 0.5) lastFocus = Math.round(state.focus);
    const fv = prevFocus >= 0 && state.focus >= 0 && !snap ? (state.focus - prevFocus) / Math.max(dt, 1e-3) : 0;
    prevFocus = state.focus;

    railMat.opacity = 1 - smooth(0, 0.55, state.view);
    shadow.material.opacity = 0.05 * (1 - smooth(0, 0.55, state.view));
    rail.visible = railMat.opacity > 0.002;

    for (const g of garments) {
      const i = g.i;
      const P = pose(g, state.view, state.swap);
      const d = state.focus >= 0 ? Math.abs(i - state.focus) : 9;
      const w = state.focusOn * Math.max(0, 1 - d); // the focused one faces the camera
      const nb = state.focusOn * Math.max(0, 1 - d / 2.4) * 0.25; // neighbours turn a little
      let yawT = REST_YAW[i] * (1 - w) * (1 - nb);
      const inProduct = i === state.active || (i === state.swap.from && state.swap.k < 1);
      if (inProduct) {
        const e = i === state.active ? state.view : 1;
        yawT = mix(yawT, state.side * Math.PI, e);
      }
      spring(g.yaw, yawT, dt, 12.5, 0.5); // ~0.35 s with a small overshoot
      spring(g.fwd, w * 0.1, dt, 11, 0.7);
      // sway: kicked by the focus passing nearby, a slow pendulum
      if (!snap && d < 1.6) g.sway.v += -fv * 0.012 * (1.6 - d) * dt * 60 * 0.06;
      if (!snap && inProduct && state.swap.k < 1) g.sway.v += state.swap.dir * 0.02 * Math.sin(Math.PI * state.swap.k);
      spring(g.sway, 0, dt, 5.5, 0.18);
      g.root.position.set(P.x, P.y, P.z + g.fwd.x * (1 - state.view));
      g.root.scale.setScalar(P.s * (1 + 0.04 * w * (1 - state.view)));
      g.turn.rotation.y = g.yaw.x;
      g.root.rotation.z = g.sway.x + (inProduct ? Math.sin(time * 1.3 + i) * 0.006 : Math.sin(time * 0.9 + i * 1.7) * 0.004);
      g.root.visible = P.a > 0.002;
      for (const m of g.mats) m.opacity = P.a * (m.userData.o ?? (m.userData.o = m.opacity));

      // colours: the dye rises from the hem to the collar (dye.from below the front, dye.to above)
      const dyeOn = state.dye.garment === i && state.dye.k < 1;
      const vBase = dyeOn ? state.dye.from : state.colors[i];
      const vTop = dyeOn ? state.dye.to : state.colors[i];
      const vb = g.p.variants[vBase], vt = g.p.variants[vTop];
      const k = dyeOn ? state.dye.k : 1;
      for (let s = 0; s < 2; s++) {
        g.body[s].material.color.set(vb.body);
        const front = g.top - g.len + g.len * k; // y of the front
        const hh = Math.max(0.0001, g.len * k);
        g.dye[s].material.color.set(vt.body);
        g.dye[s].scale.y = hh;
        g.dye[s].position.y = g.top - g.len + hh / 2;
        g.dye[s].visible = k > 0.001;
        g.wet[s].position.y = front - 0.018;
        g.wet[s].visible = dyeOn;
      }
      // the print takes the ink of whichever colour is under it
      const printY = g.top - g.len * 0.32;
      const inkV = k * g.len + (g.top - g.len) > printY ? vt : vb;
      g.print[0].material.color.set(inkV.ink);
      g.print[1].material.color.set(k * g.len + (g.top - g.len) > g.top - g.len * 0.1 ? vt.ink : vb.ink);
    }

    // tags of the product garment: drop in on their threads, swing, the selected one hangs lower
    const gi = state.active;
    const ga = garments[gi];
    const vs = PRODUCTS[gi].variants;
    const drop = 1 - smooth(0.5, 0.95, state.view);
    const swapA = state.swap.k < 1 && state.swap.from !== state.swap.to ? smooth(0.35, 0.9, state.swap.k) : 1;
    const pulse = state.tagPulse !== prevPulse;
    prevPulse = state.tagPulse;
    tags.forEach((t, k) => {
      const on = k < vs.length && state.view > 0.3;
      t.g.visible = on;
      if (!on) return;
      if (t.garment !== gi || t.variant !== k) {
        t.garment = gi;
        t.variant = k;
        t.card.material.map = tagTex(t, gi, k);
        t.card.material.needsUpdate = true;
      }
      const s = prodScale(ga);
      const x0 = ga.wid * s * 0.5 + 0.12 + k * 0.085;
      const sel = state.colors[gi] === k;
      const len = t.len + (sel ? 0.035 : 0);
      if (!snap && state.tagHover === k) t.sw.v += 0.06 * Math.sin(time * 9) * dt * 60 * 0.15;
      if (pulse && (state.tagHover === k || (state.tagHover < 0 && sel))) t.sw.v += 2.4;
      if (!snap && drop > 0.02) t.sw.v += drop * 0.02;
      spring(t.sw, 0, dt, 6.5, 0.16);
      t.g.position.set(x0, prodHookY() - 0.02 + drop * 0.9, 0.3);
      t.g.rotation.z = t.sw.x * 0.18;
      t.thread.scale.set(0.0025, len, 1);
      t.thread.position.set(0, -len / 2, 0);
      t.card.scale.set(t.w, t.h, 1);
      t.card.position.set(0, -len - t.h / 2 + 0.01, 0.001);
      const a = smooth(0.45, 0.85, state.view) * swapA;
      t.card.material.opacity = a;
      t.thread.material.opacity = a;
    });
  }

  // ------------------------------------------------------------------ screen helpers
  const v3 = new THREE.Vector3();
  function toScreen(x, y, z) {
    v3.set(x, y, z).project(camera);
    return { x: ((v3.x + 1) / 2) * W, y: ((1 - v3.y) / 2) * H };
  }
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  // the ray's point on the plane z = z0
  function onPlane(nx, ny, z0) {
    ndc.set(nx, ny);
    ray.setFromCamera(ndc, camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    if (Math.abs(d.z) < 1e-6) return null;
    const t = (z0 - o.z) / d.z;
    return { x: o.x + d.x * t, y: o.y + d.y * t };
  }
  const maxLen = Math.max(...garments.map((g) => g.len));

  function pick(nx, ny) {
    if (st.view < 0.5) {
      const p = onPlane(nx, ny, 0);
      if (!p) return null;
      const yTop = RAIL_Y + 0.03, yBot = RAIL_Y - HOOK_DROP - maxLen - 0.03;
      const x0 = slotX(0) - SP / 2, x1 = slotX(N - 1) + SP / 2;
      if (p.y > yTop || p.y < yBot || p.x < x0 || p.x > x1) return null;
      const slot = clamp((p.x - slotX(0)) / SP, 0, N - 1);
      return { kind: 'garment', index: Math.round(slot), slot };
    }
    for (let k = tags.length - 1; k >= 0; k--) {
      const t = tags[k];
      if (!t.g.visible || t.card.material.opacity < 0.5) continue;
      const p = onPlane(nx, ny, t.g.position.z);
      const cx = t.g.position.x, cy = t.g.position.y + t.card.position.y;
      if (p && Math.abs(p.x - cx) < t.w / 2 + 0.006 && Math.abs(p.y - cy) < t.h / 2 + 0.006) return { kind: 'tag', index: k };
    }
    const g = garments[st.active];
    const p = onPlane(nx, ny, g.root.position.z);
    const s = g.root.scale.x;
    if (p && Math.abs(p.x - g.root.position.x) < (g.wid * s) / 2 && p.y < g.root.position.y && p.y > g.root.position.y - (HOOK_DROP + g.len) * s) return { kind: 'product' };
    return null;
  }

  function anchors() {
    const f = st.focus >= 0 ? clamp(Math.round(st.focus), 0, N - 1) : lastFocus;
    const gf = garments[f];
    gf.root.updateMatrixWorld(true);
    const hp = gf.root.localToWorld(new THREE.Vector3(0, gf.top - gf.len - 0.03, 0));
    const cap = toScreen(hp.x, hp.y, hp.z);
    const ga = garments[st.active];
    const s = prodScale(ga), py = prodHookY();
    const pHem = py - (HOOK_DROP + 0.012 + ga.len) * s;
    const title = toScreen(0, pHem - 0.035, 0.25);
    const midY = py - (HOOK_DROP + ga.len / 2) * s;
    const left = toScreen(-1.3, midY, 0.25), right = toScreen(1.3, midY, 0.25);
    const tg = tags
      .filter((t) => t.g.visible)
      .map((t) => {
        const cx = t.g.position.x, cy = t.g.position.y + t.card.position.y, z = t.g.position.z;
        const a = toScreen(cx - t.w / 2, cy + t.h / 2, z), b = toScreen(cx + t.w / 2, cy - t.h / 2, z);
        return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
      });
    return { caption: cap, title, arrows: { left, right }, tags: tg };
  }

  function info() {
    return { garments: N, slots: garments.map((g) => ({ x: toScreen(slotX(g.i), RAIL_Y, 0).x })) };
  }

  function resize(w, h, dpr) {
    W = w;
    H = h;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    frame();
  }
  frame();
  onProgress(1);

  return {
    camera,
    update,
    render: () => renderer.render(scene, camera),
    resize,
    async warmup() {
      renderer.compile(scene, camera);
      renderer.render(scene, camera);
    },
    setQuality(l) {
      level = l;
    },
    stats() {
      const i = renderer.info;
      return { calls: i.render.calls, triangles: i.render.triangles, programs: i.programs ? i.programs.length : 0, textures: i.memory.textures, geometries: i.memory.geometries, quality: level, stub: true };
    },
    pick,
    anchors,
    info,
  };
}
