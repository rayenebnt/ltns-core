// RUELLE 3D world (WORLD CONTRACT, see src/world-stub/index.js for the reference shape):
//   export async function createWorld({ renderer, quality, onProgress }) -> world
//   world.camera, update(state, dt, time), render(), resize(w, h, dpr), await warmup(),
//   setQuality(level), stats(), pick(ndcX, ndcY), anchors(), info()
// The shell owns the timings and eases the state (view, focus, swap, dye, side); the world adds
// the secondary motion on top: the hover turn's spring and overshoot, the forward pull, the
// neighbours' parting and sway, the pendulum of every hanger (driven by its pivot's real
// acceleration, so every move swings naturally), the arc and turn of the opening, the 180° turn's
// overshoot, the tags' drop and swing. dt >= 0.5 snaps everything (frozen stills).
//
// Garments: src/world/garments (procedural 3D tees, hoodie, varsity... on wooden hangers, with
// their hang tags). Studio: src/world/studio (framing, wall and light, rail, rack, product view,
// picking).
import * as THREE from 'three';
import { PRODUCTS, HERO } from '../catalog.js';
import { createGarment, createTags, loadGarmentFonts } from './garments/index.js';
import { createFraming, N } from './studio/layout.js';
import { createStage } from './studio/stage.js';
import { createRail } from './studio/rail.js';
import { createFader } from './studio/fade.js';
import { createRack, rackCuts } from './studio/rack.js';
import { createProduct } from './studio/product.js';
import { createPicker } from './studio/pick.js';
import { pendulum, tracker, smooth, clamp, SNAP } from './studio/physics.js';

export const rendererOptions = { antialias: true };

const LEVELS = ['low', 'medium', 'high', 'max'];
// garment grid density per level (garments/index.js: 16 / 11.5 / 8.5 / 7.5 mm cells)
const DENSITY = { low: 'low', medium: 'medium', high: 'high', max: 'max' };
// pendulum coupling: how much of the pivot's acceleration reaches the swing (a hand carries the
// hanger and damps most of it); the rack's moves are short and quick, the product's are slides
const COUPLE = { rack: 0.11, product: 0.12 };

const yieldFrame = () => new Promise((r) => setTimeout(r, 0));

export async function createWorld({ renderer, quality = 'high', onProgress = () => {} }) {
  let level = LEVELS.includes(quality) ? quality : 'high';
  await loadGarmentFonts();
  onProgress(0.04);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(22, 1.6, 0.5, 20);
  const fr = createFraming(camera);
  const stage = await createStage(renderer, scene, level);
  const rail = createRail(level);
  scene.add(rail.mesh);
  const railFade = createFader([rail.mesh], stage.paper);
  onProgress(0.1);

  // ------------------------------------------------------------------ garments and tags
  const rigs = [];
  function dress(r, garment) {
    r.garment = garment;
    garment.group.name = `rig:${garment.product.id}`;
    scene.add(garment.group);
    r.fader = createFader([garment.mesh, garment.hanger], stage.paper);
    garment.setQuality(level);
  }
  for (let i = 0; i < N; i++) {
    const garment = createGarment(PRODUCTS[i], { quality: DENSITY[level], renderer });
    const r = { i, sx: { a: 0, v: 0 }, sz: { a: 0, v: 0 }, track: tracker(), prevYaw: 0, tagDrop: 0, tagsOn: false };
    r.pose = { pos: new THREE.Vector3(), yaw: 0, scale: 1, fade: 0, hook: 0 };
    dress(r, garment);
    r.tags = createTags(garment.product, { quality: level, clearance: garment.halfWidth - 0.02 });
    r.tags.group.name = `tags:${garment.product.id}`;
    r.tags.setDrop(0);
    scene.add(r.tags.group);
    r.tagFader = createFader([r.tags.mesh], stage.paper);
    rigs.push(r);
    onProgress(0.1 + (0.85 * (i + 1)) / N);
    await yieldFrame();
  }
  const rack = createRack(rigs);
  const product = createProduct(rigs, fr);

  // ------------------------------------------------------------------ per frame
  let st = null; // the last state seen (pick / anchors / warmup read it)
  let lastTime = 0;
  let lastFocused = HERO;
  let prevPulse = null;
  const rackPos = new THREE.Vector3();
  const euler = new THREE.Euler();
  const qSwing = new THREE.Quaternion();
  const anchor = new THREE.Vector3();
  // the caption's garment, with the shell's hysteresis (director.js capIdx): a hand resting on
  // the boundary between two garments must not flip the caption's place every frame
  let capIdx = HERO;
  const captionIndex = () => {
    if (st && st.focus >= 0 && st.focusOn > 0.05) return capIdx;
    return lastFocused;
  };
  // the direction of the last view change: the close fades the tags out where they hang
  let prevView = 0, closing = false;

  function update(state, dt, time) {
    st = state;
    lastTime = time;
    const snap = dt >= SNAP;
    if (state.focus >= 0) {
      if (snap || Math.abs(state.focus - capIdx) > 0.62) capIdx = clamp(Math.round(state.focus), 0, N - 1);
      if (state.focusOn > 0.5) lastFocused = capIdx;
    }
    const view = clamp(state.view);
    if (view < prevView - 1e-6) closing = true;
    else if (view > prevView + 1e-6 || view >= 1 || view <= 0) closing = false;
    prevView = view;
    const sw = state.swap;
    const swapping = sw.k < 1 && sw.from !== sw.to;

    rack.step(state, dt);
    product.stepSide(state, dt);

    for (const r of rigs) {
      rack.pivot(r, fr, rackPos);
      product.compose(r, state, rackPos, r.yaw.x, r.pose);
    }

    for (const r of rigs) {
      const g = r.garment, P = r.pose;
      // pendulum about z (hem sideways) driven by the pivot's x acceleration, about x (hem
      // forward / back) by its z acceleration; plus the rack's impulses (hand, neighbours)
      const t = r.track.step(P.pos.x, P.pos.y, P.pos.z, dt);
      if (snap) {
        r.sx.a = r.sx.v = r.sz.a = r.sz.v = 0;
        r.kickX = r.kickZ = 0;
      } else {
        const k = P.hook > 0.5 ? COUPLE.product : COUPLE.rack;
        r.sz.v += r.kickZ;
        r.sx.v += r.kickX;
        r.kickX = r.kickZ = 0;
        pendulum(r.sz, t.ax * k, dt);
        pendulum(r.sx, -t.az * k, dt, 4.8, 0.16, 0.12);
      }
      // a breath of air: tiny slow sway, different on every hanger (deterministic with time)
      const ia = 0.0032 * Math.sin(time * 0.83 + r.phase), ib = 0.0022 * Math.sin(time * 0.61 + r.phase * 1.7);
      euler.set(r.sx.a + ib, P.yaw, r.sz.a + ia, 'ZXY');
      g.group.position.copy(P.pos);
      g.group.quaternion.setFromEuler(euler);
      g.group.scale.setScalar(P.scale);
      const yawVel = snap ? 0 : (P.yaw - r.prevYaw) / Math.max(dt, 1e-4);
      r.prevYaw = P.yaw;
      g.setHookMode(P.hook);
      g.setSwing(r.sx.v, r.sz.v, clamp(yawVel, -12, 12));
      r.fader.set(P.fade, g.group);
      g.group.updateMatrixWorld(true);
      g.update(dt);

      // colour: the running dye rises from the hem on its garment, the others show their pick
      if (state.dye.garment === r.i && state.dye.k < 1) g.setDye(state.dye.from, state.dye.to, state.dye.k);
      else g.setVariant(state.colors[r.i] || 0);
    }

    // hang tags: the shown garment's drop in after ~0.4 of the opening; on prev / next the old
    // ones fly back up to their hanger and the new ones drop once their garment has arrived
    const pulse = prevPulse !== null && state.tagPulse !== prevPulse;
    prevPulse = state.tagPulse;
    for (const r of rigs) {
      const isActive = r.i === state.active;
      const isOut = swapping && r.i === sw.from && !isActive;
      if (!isActive && !isOut) {
        if (r.tagsOn) {
          r.tags.setDrop(0);
          r.tagsOn = false;
        }
        r.tagDrop = 0;
        continue;
      }
      let drop, fade;
      if (isActive && closing && !swapping) {
        // the close: they fade out where they hang, with the garment's first move (v2: pulled
        // back into the hook, a sliver of a tag stayed by it half-way)
        drop = view > 0.79 ? 1 : 0;
        fade = smooth(0.98, 0.8, view);
      } else if (isActive) {
        drop = smooth(0.42, 0.92, view) * (swapping ? smooth(0.5, 0.95, sw.k) : 1);
        fade = 1 - smooth(0, 0.45, drop); // they fly in out of the wall
      } else {
        drop = 1 - smooth(0, 0.42, sw.k);
        fade = smooth(0.1, 0.42, sw.k);
      }
      r.tagDrop = drop;
      const wasOn = r.tagsOn;
      r.tagsOn = drop > 0.001;
      const g = r.garment, s = r.pose.scale;
      // the threads start at the hanger neck: follow the hanger's swing but not its yaw (the
      // tags stay on the right of the hanger when the garment turns to show its back)
      euler.set(r.sx.a, 0, r.sz.a, 'ZXY');
      qSwing.setFromEuler(euler);
      anchor.copy(g.tagAnchor).multiplyScalar(s).applyQuaternion(qSwing).add(r.pose.pos);
      r.tags.group.position.copy(anchor);
      r.tags.group.scale.setScalar(s);
      r.tags.setDrop(drop);
      r.tagFader.set(fade);
      if (isActive) {
        r.tags.setActive(state.colors[r.i] || 0);
        r.tags.setHover(snap ? -1 : state.tagHover);
        if (pulse && !snap) r.tags.kick(state.tagHover >= 0 ? state.tagHover : state.colors[r.i] || 0, 1);
      }
      // they start from rest where they appear (no stale velocity from an earlier view); their
      // pendulum divides by dt, and the shell's first frame can have dt = 0
      if (r.tagsOn && !wasOn) r.tags.update(1);
      else if (dt > 1e-5 && (r.tagsOn || snap)) r.tags.update(dt);
    }

    railFade.set(smooth(0, 0.5, view), rail.mesh);
  }

  // ------------------------------------------------------------------ quality
  // shadow map and material features at once; the mesh density by rebuilding the garments
  // (while loading: at once, so the quality test measures the real cost; once interactive (the
  // governor): one garment per frame in the background, then a warm-up of the new programs)
  let rebuilding = null;
  function swapGarment(r, lv) {
    const old = r.garment;
    const garment = createGarment(old.product, { quality: DENSITY[lv], renderer });
    const fade = r.fader.value, oldFader = r.fader;
    scene.remove(old.group);
    dress(r, garment);
    r.density = DENSITY[lv];
    r.fader.set(Math.max(0, fade), garment.group);
    old.dispose();
    oldFader.dispose();
  }
  async function rebuildInBackground(lv) {
    for (const r of rigs) {
      if (r.density === DENSITY[lv]) continue;
      swapGarment(r, lv);
      await yieldFrame();
    }
    // a step down while in use (the governor): compile the new programs now (the low level drops
    // the varsity clearcoat, the shadow blur changes) rather than on their first frame
    await warmup(true);
  }
  for (const r of rigs) r.density = DENSITY[level];
  function setQuality(lv) {
    if (!LEVELS.includes(lv)) return;
    level = lv;
    stage.setQuality(lv);
    const interactive = typeof window !== 'undefined' && window.__ready === true;
    if (!interactive && !rebuilding) {
      // loading (the shell's quality test): at once, so the next measurement sees the real cost
      for (const r of rigs) if (r.density !== DENSITY[lv]) swapGarment(r, lv);
    } else {
      const tracked = (rebuilding || Promise.resolve())
        .then(() => rebuildInBackground(lv))
        .catch((e) => console.error(e))
        .finally(() => {
          if (rebuilding === tracked) rebuilding = null;
        });
      rebuilding = tracked;
    }
    for (const r of rigs) r.garment.setQuality(lv);
    if (st) update(st, 1, lastTime);
  }

  // ------------------------------------------------------------------ warm-up
  // every program compiles now: all garments and tag sets visible, the shadow pass included
  async function warmup(fromRebuild = false) {
    if (rebuilding && !fromRebuild) await rebuilding;
    const saved = st;
    for (const r of rigs) {
      r.fader.set(0, r.garment.group);
      r.tags.setDrop(1);
      r.tags.update(1);
    }
    rail.mesh.visible = true;
    try {
      if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
      else renderer.compile(scene, camera);
    } catch (e) {
      renderer.compile(scene, camera);
    }
    renderer.render(scene, camera);
    for (const r of rigs) {
      r.tags.setDrop(0);
      r.tagsOn = false;
    }
    if (saved) update(saved, 1, lastTime);
    renderer.render(scene, camera);
  }

  // ------------------------------------------------------------------ the rest of the contract
  const picker = createPicker({ camera, fr, rigs, product, getState: () => st || { view: 0, active: HERO, focus: -1, focusOn: 0 }, captionIndex });

  function resize(w, h, dpr) {
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    fr.fit(w, h);
    stage.resize(w, h);
  }
  fr.fit(1440, 900);

  function stats() {
    const i = renderer.info;
    const poses = rigs.map((r) => ({ x: r.pose.pos.x, z: r.pose.pos.z, yaw: r.pose.yaw, scale: r.pose.scale, hidden: !r.garment.group.visible }));
    let tris = 0;
    for (const r of rigs) tris += r.garment.stats().triangles;
    return {
      calls: i.render.calls,
      triangles: i.render.triangles,
      programs: i.programs ? i.programs.length : 0,
      textures: i.memory.textures,
      geometries: i.memory.geometries,
      quality: level,
      density: DENSITY[level],
      shadow: stage.shadowInfo(),
      garments: 'src/world/garments',
      garmentTriangles: tris,
      framing: { vh: +fr.vh.toFixed(3), D: +fr.D.toFixed(3), railFrac: +fr.railFrac.toFixed(3), aspect: +fr.aspect.toFixed(3) },
      rack: rackCuts(rigs, poses),
      rebuilding: !!rebuilding,
    };
  }

  const world = {
    camera,
    scene,
    update,
    render: () => renderer.render(scene, camera),
    resize,
    warmup: () => warmup(false),
    setQuality,
    stats,
    pick: picker.pick,
    anchors: picker.anchors,
    info: picker.info,
    // for the harness and the tests
    debug: { rigs, fr, stage, rail, rack, product, picker },
  };
  onProgress(1);
  return world;
}
