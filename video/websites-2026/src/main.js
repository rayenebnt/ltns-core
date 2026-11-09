import * as THREE from 'three';
import { patchFogChunks, hazeUniform } from './scene/atmosphere.js';
import { SUN_LIGHT, FLOOR_MIN, FLOOR_MAX, BUILDING_YAW } from './scene/config.js';
import { createSky } from './scene/sky.js';
import { createSea } from './scene/sea.js';
import { createTerrain, createTown, createShoreMap, createPromenade } from './scene/terrain.js';
import { createVegetation } from './scene/vegetation.js';
import { createYachts } from './scene/yachts.js';
import { createMarina, BASIN } from './scene/marina.js';
import { createTower } from './scene/tower.js';
import { createInterior } from './scene/interior.js';
import { cameraAt, monotone, SEGMENTS } from './scene/path.js';
import { createPost } from './scene/post.js';
import { noiseDataTexture, rippleTexture, setAnisotropy } from './scene/textures.js';
import { createUI } from './ui.js';

const params = new URLSearchParams(location.search);
const CAPTURE = params.has('capture');
const FIXED_T = params.has('t') ? parseFloat(params.get('t')) : null;
const Q = params.get('q');
const FORCED_Q = Q === 'low' || Q === 'medium' || Q === 'high';
const AUTO = params.get('auto') === '1';

const LEVELS = [
  { name: 'low', dpr: 1.0, samples: 0, bloomScale: 0.5, fxaa: true },
  { name: 'medium', dpr: 1.3, samples: 4, bloomScale: 1, fxaa: false },
  { name: 'high', dpr: 1.75, samples: 4, bloomScale: 1, fxaa: false },
];

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

function showNoGL() {
  document.getElementById('nogl').hidden = false;
  document.getElementById('loader').classList.add('is-done');
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
const setLoad = (x) => { if (loaderFill) loaderFill.style.width = `${Math.round(x * 100)}%`; };

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
window.__ready = false;

if (!hasWebGL2()) showNoGL();
else start().catch((e) => {
  console.error(e);
  showNoGL();
});

async function start() {
  patchFogChunks();
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false, alpha: false });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.info.autoReset = false;
  setAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

  let levelIndex = Q === 'low' ? 0 : Q === 'medium' ? 1 : 2;
  const low = levelIndex === 0;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xffffff, hazeUniform.value);
  const camera = new THREE.PerspectiveCamera(33, innerWidth / innerHeight, 1, 60000);

  setLoad(0.05);
  await nextFrame();

  // sky and the exterior environment map
  scene.add(createSky());
  const pmrem = new THREE.PMREMGenerator(renderer);
  const skyScene = new THREE.Scene();
  skyScene.add(createSky());
  const envSky = pmrem.fromScene(skyScene, 0, 0.1, 100).texture;

  const noiseTex = noiseDataTexture();
  const rippleTex = rippleTexture();
  const shore = createShoreMap();
  setLoad(0.15);
  await nextFrame();

  const yachts = createYachts({ envMap: envSky });
  const marina = createMarina({ envMap: envSky, yachtGeo: yachts.geometries, yachtMats: yachts.materials, lowQuality: low });
  const sea = createSea({ shoreTex: shore.tex, shoreRect: shore.rect, noiseTex, rippleTex, waveCount: low ? 12 : 20, yachts, basin: BASIN, marina });
  scene.add(sea);
  const terrain = createTerrain({ envMap: envSky, detailTex: rippleTex });
  scene.add(terrain);
  setLoad(0.3);
  await nextFrame();
  scene.add(...createVegetation({ count: low ? 260 : 460, shrubs: low ? 400 : 900, far: low ? 1200 : 2600, dense: low ? 900 : 2000, palms: marina.palms }));
  scene.add(createTown({ envMap: envSky, count: low ? 2200 : 3600 }));
  scene.add(...createPromenade({ envMap: envSky, extra: marina.lamps }));
  scene.add(yachts.group, ...marina.meshes);
  setLoad(0.42);
  await nextFrame();

  const tower = createTower({ envMap: envSky, lowQuality: low });
  // the tower and the apartment are modelled in a local frame; the building is turned so
  // that the living-room opening faces south, toward the hero camera
  const building = new THREE.Group();
  building.name = 'building';
  building.rotation.y = BUILDING_YAW;
  building.add(tower.group);
  scene.add(building);
  tower.group.traverse((o) => {
    if (o.name === 'slabs' || o.name === 'mullions') {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  setLoad(0.55);
  await nextFrame();

  const interior = createInterior({ noiseTex, lowQuality: low });
  building.add(interior.group);
  building.updateMatrixWorld(true);
  const toW = (v) => v.clone().applyMatrix4(building.matrixWorld);
  const roomCenter = toW(interior.center);
  for (const k of Object.keys(interior.anchors)) interior.anchors[k].copy(toW(interior.anchors[k]));
  setLoad(0.72);
  await nextFrame();

  // golden key light (static shadow map around the living room)
  const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 0.7, 0.45), 2.8);
  sun.position.copy(roomCenter).addScaledVector(SUN_LIGHT, 90);
  sun.target.position.copy(roomCenter);
  sun.castShadow = true;
  sun.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048);
  const sc = sun.shadow.camera;
  sc.left = -11;
  sc.right = 11;
  sc.top = 9;
  sc.bottom = -9;
  sc.near = 50;
  sc.far = 135;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  // soft fill: cool sky above, warm bounce from the sunlit sea and ground below
  const fill = new THREE.HemisphereLight(new THREE.Color(0.47, 0.5, 0.6), new THREE.Color(0.56, 0.4, 0.28), 0.55);
  scene.add(fill);

  // interior environment: capture the finished room once, from its centre
  interior.materials.forEach((m) => {
    m.envMap = envSky;
    m.needsUpdate = true;
  });
  renderer.shadowMap.needsUpdate = true;
  const cubeRT = new THREE.WebGLCubeRenderTarget(low ? 128 : 256, { type: THREE.HalfFloatType });
  const cubeCam = new THREE.CubeCamera(0.05, 60000, cubeRT);
  cubeCam.position.copy(roomCenter);
  scene.add(cubeCam);
  cubeCam.update(renderer, scene);
  const envRoom = pmrem.fromCubemap(cubeRT.texture).texture;
  scene.remove(cubeCam);
  cubeRT.dispose();
  interior.materials.forEach((m) => {
    m.envMap = envRoom;
    m.needsUpdate = true;
  });
  setLoad(0.82);
  await nextFrame();

  // post-processing
  let level = LEVELS[levelIndex];
  let post = null;
  let dpr = 1;
  const sceneInfo = { calls: 0, triangles: 0 };
  function buildPost() {
    if (post) post.dispose();
    level = LEVELS[levelIndex];
    dpr = Math.min(window.devicePixelRatio || 1, level.dpr);
    renderer.setPixelRatio(dpr);
    renderer.setSize(innerWidth, innerHeight, false);
    post = createPost(renderer, scene, camera, { samples: level.samples, bloomScale: level.bloomScale, fxaa: level.fxaa });
    post.setSize(innerWidth, innerHeight, dpr);
    // scene-only statistics, read right after the scene pass
    const rp = post.composer.passes[0];
    const orig = rp.render.bind(rp);
    rp.render = (...a) => {
      orig(...a);
      sceneInfo.calls = renderer.info.render.calls;
      sceneInfo.triangles = renderer.info.render.triangles;
    };
  }
  buildPost();

  // ------------------------------------------------------------------ state
  const state = { target: 0, p: 0, v: 0 };
  const cam = { position: new THREE.Vector3(), target: new THREE.Vector3(), fov: 33, roll: 0, near: 1, r: 0, shift: 0 };
  const hi = { floor: FLOOR_MIN, prev: -5, t: 1 };
  let time = FIXED_T !== null ? FIXED_T : 0;
  let tween = null; // { from, to, dur, t, delay } or { keys, dur, t } for the autoplay
  let cpuMs = 0;
  let warming = false;
  // the cruising yacht's clock restarts while the camera is inside the room (yachts unseen),
  // so each return to the hero starts its cruise again without a visible jump
  let cruiseT0 = 0;

  const ui = createUI({
    onBack: () => tweenTo(0, 4.5),
    onDiscover: () => tweenTo(1, 9),
  });

  const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const [c0, c1] = SEGMENTS.counter;
  const floorAt = (p) => Math.round(mix(FLOOR_MIN, FLOOR_MAX, smooth(c0, c1, p)));

  // keep the (hidden) scrollbar in sync with programmatic moves; remember where we put it
  // (null once the user has taken over: a sentinel such as -1 would swallow the user's own
  // scroll events at scrollY 0 and 1, and a scroll back to the very top would stop short of p = 0)
  let lastSyncY = null;
  function syncScroll(p) {
    lastSyncY = Math.round(p * maxScroll());
    window.scrollTo(0, lastSyncY);
  }
  function setProgressInstant(p) {
    p = Math.min(1, Math.max(0, p));
    state.target = state.p = p;
    state.v = 0;
    tween = null;
    const f = floorAt(p);
    hi.floor = f;
    hi.prev = -5;
    hi.t = 1;
    ui.setFloor(f, true);
    syncScroll(p);
  }
  function tweenTo(to, dur, delay = 0) {
    tween = { from: state.target, to, dur, t: 0, delay };
  }
  // hands-free take, keyed so that after the camera spring (lag ~0.4 s) the counter runs
  // 08 -> 14 between ~1.1 s and ~3.3 s, the dive lasts ~4.4 s, the glass ~2 s, then the room
  // is a slow ~5 s glide ending on a push-in, the payoff of the take (15.2 s in all)
  const AUTO_KEYS = monotone([[0, 0], [0.2, 0], [0.55, 0.05], [2.95, 0.175], [3.4, 0.235], [7.6, 0.65], [9.6, 0.85], [14.6, 1.0], [15.2, 1.0]]);
  function startAuto() {
    setProgressInstant(0);
    tween = { keys: AUTO_KEYS, dur: 15.2, t: 0 };
    setCursorHidden(true);
  }

  window.addEventListener('scroll', () => {
    if (lastSyncY !== null && Math.abs(window.scrollY - lastSyncY) <= 2) return; // our own scrollTo, not the user
    lastSyncY = null;
    tween = null; // the user takes over
    state.target = Math.min(1, Math.max(0, window.scrollY / maxScroll()));
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    const step = 0.085;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      tweenTo(Math.min(1, state.target + step), 0.9);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      tweenTo(Math.max(0, state.target - step), 0.9);
    } else if (e.key === 'Home') {
      e.preventDefault();
      tweenTo(0, 4.5);
    } else if (e.key === 'End') {
      e.preventDefault();
      tweenTo(1, 9);
    } else if ((e.key === 'p' || e.key === 'P') && !e.repeat) {
      // (key repeat ignored: a press held a little too long must not stop the take it started)
      if (tween && tween.keys) tween = null;
      else startAuto();
    }
  });

  // the mouse cursor must not show in the take: hide it after 1.5 s of stillness (always in autoplay)
  let cursorTimer = 0;
  function setCursorHidden(h) {
    document.body.classList.toggle('no-cursor', h);
  }
  if (AUTO) setCursorHidden(true);
  window.addEventListener('mousemove', () => {
    if (AUTO) return;
    setCursorHidden(false);
    clearTimeout(cursorTimer);
    cursorTimer = setTimeout(() => setCursorHidden(true), 1500);
  }, { passive: true });
  cursorTimer = setTimeout(() => setCursorHidden(true), 1500);

  window.addEventListener('resize', () => {
    dpr = Math.min(window.devicePixelRatio || 1, level.dpr);
    renderer.setPixelRatio(dpr);
    renderer.setSize(innerWidth, innerHeight, false);
    post.setSize(innerWidth, innerHeight, dpr);
    // the page height follows the window (vh): keep the scroll position on the current progress,
    // so that entering or leaving full screen mid-take does not make the next scroll jump
    syncScroll(state.target);
  });

  // ------------------------------------------------------------- per frame
  const facadeU = tower.facadeMat.uniforms;
  const bandColor = new THREE.Color(1.0, 0.4, 0.08);
  // the real living room (floor 14) has no facade ribbon: its glazing glows the same amber when
  // floor 14 is the selected one, so the band reads as one even floor from the hero
  const roomGlow = new THREE.Color(1.6, 0.52, 0.0);
  const glassGlow = interior.glassMat.uniforms.uGlow.value;
  const soffitBase = tower.soffitMat.color.clone();
  const haloBase = tower.haloMat ? tower.haloMat.color.clone() : null;
  const towerTop = new THREE.Vector3(0, 60, 0);

  // lens shift (vertical): keeps verticals vertical while framing a little lower
  function applyShift(c, shift) {
    if (!shift) return;
    c.projectionMatrix.elements[9] = shift;
    c.projectionMatrixInverse.copy(c.projectionMatrix).invert();
  }

  function applyProgress(p, dt) {
    cameraAt(p, cam);
    // keep the hero framing on narrow / wide screens (horizontal field of view preserved)
    const aspect = innerWidth / innerHeight;
    const fovAdj = aspect < 1.6 ? (2 * Math.atan(Math.tan((cam.fov * Math.PI) / 360) * (1.6 / aspect)) * 180) / Math.PI : cam.fov;
    camera.position.copy(cam.position);
    camera.up.set(0, 1, 0);
    camera.lookAt(cam.target);
    camera.rotateZ(cam.roll);
    camera.fov = Math.min(fovAdj, 80);
    camera.near = cam.near;
    camera.far = 60000;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    applyShift(camera, cam.shift);

    // floor selection and the lit band (the band hands over to the real floor before the close-ups)
    const f = floorAt(p);
    if (f !== hi.floor) {
      hi.prev = hi.floor;
      hi.floor = f;
      hi.t = 0;
      if (!warming) ui.setFloor(f);
    }
    hi.t = Math.min(1, hi.t + dt / 0.35);
    const e = hi.t * hi.t * (3 - 2 * hi.t);
    const strength = 1 - smooth(0.36, 0.5, p);
    facadeU.uHi.value.set(hi.floor, e * strength, 0);
    facadeU.uHi2.value.set(hi.prev, (1 - e) * strength, 0);
    tower.setBandFloor(hi.floor);
    tower.band.visible = strength > 0.001;
    tower.bandMat.color.copy(bandColor).multiplyScalar((0.6 + 0.9 * e) * strength);
    const roomHi = ((hi.floor === FLOOR_MAX ? e : 0) + (hi.prev === FLOOR_MAX ? 1 - e : 0)) * strength;
    glassGlow.copy(roomGlow).multiplyScalar(roomHi);
    // soffit downlights: only read from close by (single-pixel sparkles from afar)
    const near = 1 - smooth(110, 170, camera.position.distanceTo(towerTop));
    tower.soffitMat.color.copy(soffitBase).multiplyScalar(near);
    tower.soffit.visible = near > 0.002;
    if (haloBase) {
      tower.haloMat.color.copy(haloBase).multiplyScalar(near);
      tower.halo.visible = near > 0.002;
    }

    interior.setDoor(smooth(0.6, 0.7, p));
    renderer.toneMappingExposure = 1.0;
    post.bloom.strength = mix(0.5, 0.42, smooth(0.6, 0.85, p));
    ui.update(p, camera, interior.anchors, innerWidth, innerHeight);
  }

  function renderFrame() {
    renderer.info.reset();
    sea.material.uniforms.uTime.value = time;
    sea.material.uniforms.uPixAngle.value = ((camera.fov * Math.PI) / 180) / (innerHeight * dpr);
    sea.material.uniforms.uDpr.value = dpr;
    interior.flameMat.uniforms.uTime.value = time;
    if (state.p > 0.7) cruiseT0 = time;
    yachts.update(time - cruiseT0);
    post.finalPass.uniforms.uTime.value = time;
    post.render();
  }

  // hotspot anchors: ray-cast chosen screen spots of the final frame onto the room
  {
    cameraAt(1, cam);
    const c2 = new THREE.PerspectiveCamera(cam.fov, 1.6, 0.05, 100);
    c2.position.copy(cam.position);
    c2.lookAt(cam.target);
    c2.updateMatrixWorld();
    c2.updateProjectionMatrix();
    applyShift(c2, cam.shift);
    const ray = new THREE.Raycaster();
    const targets = [];
    interior.group.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && o.name !== 'flames' && !(o.material && o.material.transparent)) targets.push(o); });
    const slats = interior.group.getObjectByName('slats');
    if (slats) targets.push(slats);
    for (const [k, xy] of Object.entries(interior.hotspotView)) {
      ray.setFromCamera(new THREE.Vector2(xy[0], xy[1]), c2);
      const hit = ray.intersectObjects(targets, false)[0];
      if (hit) interior.anchors[k].copy(hit.point);
    }
  }

  // ------------------------------------------------------------- warm-up
  renderer.compile(scene, camera);
  warming = true;
  for (const wp of [0.0, 0.5, 0.66, 0.92]) {
    applyProgress(wp, 0.016);
    renderFrame();
    await nextFrame();
  }

  // quality test while the loader is still up: frame times at three key moments, then the
  // level is locked for the whole take (no rebuild mid-scroll)
  if (!FORCED_Q && !CAPTURE) {
    const measure = async () => {
      let worst = 0;
      for (const wp of [0.0, 0.55, 0.9]) {
        const dts = [];
        let prev = performance.now();
        for (let i = 0; i < 11; i++) {
          applyProgress(wp, 0.016);
          renderFrame();
          await nextFrame();
          const now = performance.now();
          if (i > 0) dts.push(now - prev);
          prev = now;
        }
        dts.sort((a, b) => a - b);
        worst = Math.max(worst, dts[dts.length >> 1]);
      }
      return worst;
    };
    for (let tries = 0; tries < 2 && levelIndex > 0; tries++) {
      const ms = await measure();
      if (ms <= 21.5) break;
      levelIndex--;
      buildPost();
      console.info(`[Cap Lumière] ${ms.toFixed(1)} ms/image\u00a0: qualité ${LEVELS[levelIndex].name}`);
    }
  }
  warming = false;
  setLoad(1);
  setProgressInstant(0);
  applyProgress(0, 0);
  renderFrame();

  if (CAPTURE) {
    // render on demand only (stills for the contact sheet)
    window.__ready = true;
    document.getElementById('loader').classList.add('is-done');
  }

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dtMs = Math.min(100, now - last);
    const dt = dtMs / 1000;
    last = now;
    if (FIXED_T === null) time += dt;

    if (tween) {
      if (tween.keys) {
        tween.t = Math.min(tween.dur, tween.t + dt);
        state.target = tween.keys(tween.t);
        syncScroll(state.target);
        if (tween.t >= tween.dur) tween = null;
      } else if (tween.delay > 0) tween.delay -= dt;
      else {
        tween.t = Math.min(1, tween.t + dt / tween.dur);
        const k = tween.t;
        const ek = k * k * k * (k * (k * 6 - 15) + 10);
        state.target = mix(tween.from, tween.to, ek);
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
    const t0 = performance.now();
    applyProgress(state.p, dt);
    renderFrame();
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
    applyProgress(state.p, 1);
    renderFrame();
  };
  window.__stats = () => ({
    scene: { ...sceneInfo },
    frame: { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles },
    programs: renderer.info.programs ? renderer.info.programs.length : 0,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
    level: level.name,
    dpr,
    cpuMs: +cpuMs.toFixed(2),
    p: state.p,
    camera: { x: camera.position.x, y: camera.position.y, z: camera.position.z, fov: camera.fov, near: camera.near },
  });
  window.__debugCam = (pos, target, fov = 40, near = 1) => {
    camera.position.set(...pos);
    camera.up.set(0, 1, 0);
    camera.lookAt(...target);
    camera.fov = fov;
    camera.near = near;
    camera.updateProjectionMatrix();
    renderer.info.reset();
    post.render();
  };
  window.__setTime = (t) => {
    time = t;
  };
  window.__three = { renderer, scene, camera, get post() { return post; } };
}
