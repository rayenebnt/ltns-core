// ALTIÈRE world: the bay of Cap Lumière (sky, haze, sea, coast, town, marina, yachts, vegetation),
// its tower rebuilt floor by floor (a clipping plane for the structure, a cut uniform for the glass,
// a concrete core and a crane), a cloud deck to dive through (Sillage's ray-marched clouds), the lit
// band of floor 7 and a floor plate under the plan. One camera on monotone splines of p.
// Contract (main.js): createWorld({ renderer, quality, onProgress }) → { camera, update(state, dt, time),
// render(), resize(w, h, dpr), warmup(), setQuality(level), stats(), anchors(), info() }.
import * as THREE from 'three';
import { patchFogChunks, hazeUniform } from './scene/atmosphere.js';
import { SUN_LIGHT, SUN_VIEW, TOWER, floorY, BUILDING_YAW } from './scene/config.js';
import { createSky } from './scene/sky.js';
import { createSea } from './scene/sea.js';
import { createTerrain, createTown, createShoreMap, createPromenade } from './scene/terrain.js';
import { createVegetation } from './scene/vegetation.js';
import { createYachts } from './scene/yachts.js';
import { createMarina, BASIN } from './scene/marina.js';
import { createTower, ROOF, CLIP_S, CUT_G } from './scene/tower.js';
import { monotone } from './scene/path.js';
import { createPost } from './scene/post.js';
import { noiseDataTexture, rippleTexture, setAnisotropy } from './scene/textures.js';
import { createClouds } from './clouds.js';
import { makeNoise } from './vutil.js';
import { PHASES, PLAN_FLOOR, within } from '../story.js';

// the composer does its own multisampling (main.js merges this into the renderer's options)
export const rendererOptions = { antialias: false };

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (t) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
const sstep = (a, b, x) => smooth((x - a) / (b - a));
const DEG = Math.PI / 180;
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const col = (h) => new THREE.Color(h);

// per quality level: post-processing and the clouds' ray-march (geometry is built once, at the first level)
const LV = {
  low: { samples: 0, fxaa: true, bloom: 0.25, steps: 8, detail: 0 },
  medium: { samples: 4, fxaa: false, bloom: 0.5, steps: 12, detail: 1 },
  high: { samples: 4, fxaa: false, bloom: 0.5, steps: 16, detail: 2 },
  max: { samples: 4, fxaa: false, bloom: 0.5, steps: 20, detail: 2 },
};

const G0 = TOWER.ground;
const Y7 = floorY(PLAN_FLOOR); // top of the floor-7 slab (the plan's plane)
const TOP = floorY(ROOF) + 1.2; // roof

// the construction: c 0..1 over PHASES.build
const buildAt = (p) => smooth(within(p, PHASES.build));
// structure height (the slabs pop floor by floor) and the glass, three floors behind
function cutsAt(c) {
  if (c >= 1) return { s: 1e9, g: 1e9, k: ROOF + 1 };
  const k = Math.floor(c * (ROOF + 1.0001));
  const s = k <= 0 ? G0 + 0.12 : floorY(k) + 0.02;
  const gk = clamp((c - 0.14) / 0.86);
  const g = gk <= 0 ? G0 + 0.12 : mix(G0, TOP + 2, gk);
  return { s, g: Math.min(g, s), k };
}

// ------------------------------------------------------------------ the camera keys
// world frame: the tower at the origin, north = -Z (the bay and the low sun beyond the tower), the
// marina to the south (+Z). Bearings: 0 north, 90 east, 180 south, 270 west.
function orbit(b, r, h, ty) {
  return [Math.sin(b * DEG) * r, h, -Math.cos(b * DEG) * r, 0, ty, 0];
}
function buildKeys() {
  const K = [];
  const key = (p, pos, tgt, fov) => K.push({ p, v: [...pos, ...tgt], fov });
  // above the clouds, then the dive through the deck (700–1150 m), out over the bay
  key(0.0, [0, 1490, 2650], [0, 1170, -2600], 40);
  key(0.03, [0, 1480, 2520], [0, 1160, -2600], 40);
  key(0.08, [0, 1330, 1980], [0, 820, -1300], 40);
  key(0.12, [8, 1080, 1520], [0, 320, -540], 39);
  key(0.155, [22, 660, 1120], [0, 30, -280], 38);
  key(0.2, [44, 560, 900], [0, 0, -150], 38);
  // the aerial glide down over the cape and the marina, to the plot
  key(0.27, [120, 380, 640], [0, 12, -40], 37);
  key(0.345, [170, 250, 450], [0, 26, 0], 36);
  // the construction: an orbit round the rising tower, looking at its working floors
  const orb = { b: monotone([[0.345, 159], [0.4, 166], [0.47, 190], [0.53, 214], [0.55, 220]]), r: monotone([[0.345, 480], [0.39, 250], [0.53, 225], [0.55, 232]]), h: monotone([[0.345, 250], [0.39, 92], [0.53, 168], [0.55, 172]]) };
  for (let p = 0.36; p <= 0.5501; p += 0.015) {
    const s = cutsAt(buildAt(p)).s;
    const ty = Math.min(s, TOP) * 0.6 + 8;
    const o = orbit(orb.b(p), orb.r(p), orb.h(p), ty);
    key(+p.toFixed(3), o.slice(0, 3), o.slice(3), 36);
  }
  // the finished tower from the marina, against the sunset
  key(0.6, [60, 46, 250], [0, 54, 0], 34);
  key(0.64, [72, 40, 245], [0, 52, 0], 34);
  // close to the south face: floor 7
  key(0.7, [34, Y7 + 7, 96], [0, Y7 + 2.5, 0], 34);
  key(0.74, [20, Y7 + 15, 72], [0, Y7, 0], 34);
  // the spiral up: bearing 164° → 270°, closing in over the tower; then straight down, shifted north so
  // the plate sits right of centre (the list on the left)
  const sp = { b: monotone([[0.74, 164], [0.8, 270]]), r: monotone([[0.74, 74], [0.77, 38], [0.8, 0]]), h: monotone([[0.74, Y7 + 15], [0.77, Y7 + 44], [0.8, Y7 + 62]]) };
  for (let p = 0.75; p <= 0.8001; p += 0.01) {
    const k = sstep(0.74, 0.8, p);
    const tz = -11 * k;
    const o = orbit(sp.b(p), sp.r(p), sp.h(p), Y7);
    key(+p.toFixed(3), [o[0], o[1], o[2] + tz], [0, Y7, tz], 34);
  }
  key(0.88, [0, Y7 + 62, -11], [0, Y7, -11], 34);
  key(1.0, [0, Y7 + 62, -11], [0, Y7, -11], 34);
  K.sort((a, b) => a.p - b.p);
  const ch = [];
  for (let i = 0; i < 6; i++) ch.push(monotone(K.map((k) => [k.p, k.v[i]])));
  const fov = monotone(K.map((k) => [k.p, k.fov]));
  const spB = sp.b;
  return { ch, fov, spB };
}

export async function createWorld({ renderer, quality = 'high', onProgress = () => {} }) {
  patchFogChunks();
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;
  setAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));
  let level = LV[quality] ? quality : 'high';
  const low = level === 'low';

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xffffff, hazeUniform.value);
  const camera = new THREE.PerspectiveCamera(38, 16 / 10, 1, 90000);

  // sky and the exterior environment
  scene.add(createSky());
  const pmrem = new THREE.PMREMGenerator(renderer);
  const skyScene = new THREE.Scene();
  skyScene.add(createSky());
  const envSky = pmrem.fromScene(skyScene, 0, 0.1, 100).texture;
  const noiseTex = noiseDataTexture();
  const rippleTex = rippleTexture();
  const shore = createShoreMap();
  onProgress(0.15);
  await nextFrame();

  // the bay (Cap Lumière)
  const yachts = createYachts({ envMap: envSky });
  const marina = createMarina({ envMap: envSky, yachtGeo: yachts.geometries, yachtMats: yachts.materials, lowQuality: low });
  const sea = createSea({ shoreTex: shore.tex, shoreRect: shore.rect, noiseTex, rippleTex, waveCount: low ? 12 : 20, yachts, basin: BASIN, marina });
  scene.add(sea);
  scene.add(createTerrain({ envMap: envSky, detailTex: rippleTex }));
  onProgress(0.35);
  await nextFrame();
  scene.add(...createVegetation({ count: low ? 260 : 460, shrubs: low ? 400 : 900, far: low ? 1200 : 2600, dense: low ? 900 : 2000, palms: marina.palms }));
  scene.add(createTown({ envMap: envSky, count: low ? 2200 : 3600 }));
  scene.add(...createPromenade({ envMap: envSky, extra: marina.lamps }));
  scene.add(yachts.group, ...marina.meshes);
  onProgress(0.55);
  await nextFrame();

  // the tower, in its own frame (turned so its +X face looks south, to the marina)
  const tower = createTower({ envMap: envSky, lowQuality: low });
  const building = new THREE.Group();
  building.name = 'building';
  building.rotation.y = BUILDING_YAW;
  building.add(tower.group);
  scene.add(building);
  // the construction cuts: the structure (built-in materials) by a plane, the mullions with the glass
  const CLIP_G = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e9);
  tower.group.traverse((o) => {
    if (!o.isMesh) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of ms) if (!m.isShaderMaterial) m.clippingPlanes = [o.name === 'mullions' ? CLIP_G : CLIP_S];
  });
  const concrete = new THREE.MeshStandardMaterial({ color: col('#b9b2a6'), roughness: 0.9, envMap: envSky, envMapIntensity: 0.6 });
  // the floor plate: the glass line's outline, filled (the slabs are rings: the tower is hollow inside)
  const outline = new THREE.Shape();
  {
    const A = TOWER.ga - 0.25, B = TOWER.gb - 0.25, R = TOWER.gr - 0.25;
    outline.moveTo(A, -B + R);
    outline.lineTo(A, B - R);
    outline.absarc(A - R, B - R, R, 0, Math.PI / 2);
    outline.lineTo(-A + R, B);
    outline.absarc(-A + R, B - R, R, Math.PI / 2, Math.PI);
    outline.lineTo(-A, -B + R);
    outline.absarc(-A + R, -B + R, R, Math.PI, 1.5 * Math.PI);
    outline.lineTo(A - R, -B);
    outline.absarc(A - R, -B + R, R, 1.5 * Math.PI, 2 * Math.PI);
  }
  const plateGeo = new THREE.ShapeGeometry(outline, 12);
  plateGeo.rotateX(Math.PI / 2); // shape (x, y) → (x, 0, y): local z = shape y
  const plateMat = new THREE.MeshStandardMaterial({ color: col('#b9b2a6'), roughness: 0.85, envMap: envSky, envMapIntensity: 0.5, side: THREE.DoubleSide });
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.name = 'plate';
  plate.visible = false;
  building.add(plate);
  // the core leads the slabs by two floors during the works
  const core = new THREE.Mesh(new THREE.BoxGeometry(7.4, 1, 6.2), concrete);
  core.name = 'core';
  building.add(core);
  // the crane, north-east of the tower (behind it from the marina)
  const crane = new THREE.Group();
  crane.name = 'crane';
  const white = new THREE.MeshStandardMaterial({ color: col('#ece6da'), roughness: 0.55, metalness: 0.2, envMap: envSky, envMapIntensity: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: col('#4a4642'), roughness: 0.7, envMap: envSky, envMapIntensity: 0.5 });
  const red = new THREE.MeshStandardMaterial({ color: col('#b0302a'), roughness: 0.6, envMap: envSky, envMapIntensity: 0.5 });
  const mast = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1, 2.0), white);
  mast.geometry.translate(0, 0.5, 0);
  const head = new THREE.Group();
  const jib = new THREE.Mesh(new THREE.BoxGeometry(52, 1.5, 1.5), white);
  jib.position.set(26, 0, 0);
  const cjib = new THREE.Mesh(new THREE.BoxGeometry(16, 1.3, 1.6), white);
  cjib.position.set(-8, 0, 0);
  const weight = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.2, 2.6), dark);
  weight.position.set(-13, -1.6, 0);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.4), red);
  cab.position.set(1.6, -1.4, 1.8);
  const peak = new THREE.Mesh(new THREE.BoxGeometry(1.2, 7, 1.2), white);
  peak.position.set(0, 4.2, 0);
  const tip = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.8), red);
  tip.position.set(52, 0, 0);
  const cable = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.12), dark);
  cable.geometry.translate(0, -0.5, 0);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 1.2), red);
  head.add(jib, cjib, weight, cab, peak, tip, cable, hook);
  crane.add(mast, head);
  crane.position.set(24, G0, -20);
  scene.add(crane);

  // the cloud deck (Sillage): its own uniforms, lit by the low sun we see
  const cnoise = makeNoise(256, 7);
  const CU = {
    uNoise: { value: cnoise.texture },
    uTime: { value: 0 },
    uThr0: { value: 0.6 },
    uThr1: { value: 0.7 },
    uWind: { value: new THREE.Vector2(3.0, 1.0) },
    uSunDir: { value: SUN_VIEW.clone() },
    uCloudLit: { value: col('#fff0d8') },
    uCloudShade: { value: col('#d7b4a4') },
    uCloudDark: { value: col('#8c7b8a') },
    uPaper: { value: col('#f7efe4') },
    uHaze: { value: col('#efcfae') },
    uWhite: { value: 0 },
    uDetail: { value: LV[level].detail },
    uPlane: { value: new THREE.Vector4(0, -1e5, 0, 1) },
    uPlaneDir: { value: new THREE.Vector2(0, 1) },
    uPlaneShadow: { value: 0 },
  };
  const clouds = createClouds({ uniforms: CU, noise: cnoise });
  clouds.setCoverage(0.74, 0.32);
  clouds.setSteps(LV[level].steps);
  scene.add(clouds.mesh, clouds.veil);
  onProgress(0.75);
  await nextFrame();

  // light: the golden key from the south-east (architectural light), a soft sky / warm bounce fill
  const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 0.7, 0.45), 2.8);
  sun.position.copy(SUN_LIGHT).multiplyScalar(600);
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(new THREE.Color(0.47, 0.5, 0.6), new THREE.Color(0.56, 0.4, 0.28), 0.55));

  // ------------------------------------------------------------------ state
  const keys = buildKeys();
  const facadeU = tower.facadeMat.uniforms;
  const bandColor = new THREE.Color(1.0, 0.42, 0.1);
  const soffitBase = tower.soffitMat.color.clone();
  const haloBase = tower.haloMat ? tower.haloMat.color.clone() : null;
  const towerTop = new THREE.Vector3(0, 60, 0);
  const tgt = new THREE.Vector3(), up = new THREE.Vector3(), fwd = new THREE.Vector3();
  let W = 1280, H = 800, dpr = 1, post = null, stage = 'clouds', curP = 0, curC = 0, planK = 0;

  function buildPost() {
    if (post) post.dispose();
    const L = LV[level];
    post = createPost(renderer, scene, camera, { samples: L.samples, bloomScale: L.bloom, fxaa: L.fxaa });
    post.setSize(W, H, dpr);
    post.bloom.strength = 0.45;
  }

  function placeCamera(p) {
    const v = keys.ch.map((f) => f(p));
    camera.position.set(v[0], v[1], v[2]);
    tgt.set(v[3], v[4], v[5]);
    // the spiral up: the up vector turns to the view's horizontal heading as the view gets vertical
    // (at the end, straight down with east up: the plate's long side across the screen)
    fwd.subVectors(tgt, camera.position).normalize();
    const pitch = Math.asin(clamp(-fwd.y, -1, 1)) / DEG;
    const k = p > PHASES.explore[1] ? sstep(62, 89.5, pitch) : 0;
    if (k > 0) {
      const b = keys.spB(Math.min(p, PHASES.plan[1])) * DEG;
      up.set(-Math.sin(b), 0, Math.cos(b)).lerp(new THREE.Vector3(0, 1, 0), 1 - k).normalize();
    } else up.set(0, 1, 0);
    camera.up.copy(up);
    camera.lookAt(tgt);
    // keep the framing on narrow windows (the horizontal field of view of a 16:10 window)
    const aspect = W / H;
    const f = keys.fov(p);
    camera.fov = aspect < 1.6 ? Math.min(80, (2 * Math.atan(Math.tan((f * DEG) / 2) * (1.6 / aspect))) / DEG) : f;
    camera.aspect = aspect;
    const alt = camera.position.y;
    camera.near = alt > 300 ? 4 : 1;
    camera.far = 90000;
    camera.updateProjectionMatrix();
  }

  function update(state, dt, time) {
    const p = clamp(state.p);
    curP = p;
    placeCamera(p);
    // the clouds: the white-out while crossing the deck; gone once the camera is under it and looks down
    const white = sstep(0.1, 0.13, p) * (1 - sstep(0.14, 0.158, p));
    CU.uWhite.value = white * 0.55;
    CU.uTime.value = time;
    const cloudOn = p < 0.24;
    clouds.mesh.visible = cloudOn;
    clouds.update(camera, time, white);
    if (!cloudOn) clouds.veil.visible = false;
    // the construction
    const c = p < PHASES.build[0] ? 0 : buildAt(p);
    curC = c;
    let { s, g, k } = cutsAt(c);
    // the plan: everything above floor 7 is lifted off
    planK = sstep(PHASES.plan[0] + 0.012, PHASES.plan[0] + 0.04, p);
    if (planK > 0) {
      s = Math.min(s, Y7 + 0.02);
      g = Math.min(g, floorY(PLAN_FLOOR + 1) - TOWER.slabT - 0.05);
    }
    CLIP_S.constant = s;
    CLIP_G.constant = g;
    CUT_G.value = g;
    const building_ = c > 0 && c < 1;
    core.visible = building_ || p < PHASES.build[0];
    const coreTop = c <= 0 ? G0 + 1.5 : Math.min(TOP, s + 2 * TOWER.floorH);
    core.scale.y = coreTop - G0;
    core.position.y = G0 + (coreTop - G0) / 2;
    // the top plate: the last poured slab during the works, the floor of the plan
    plate.visible = building_ && k >= 1 ? true : planK > 0;
    plate.position.y = planK > 0 ? Y7 + 0.03 : (k >= 1 ? floorY(k) + 0.02 : G0);
    plateMat.color.set(planK > 0 ? '#d9d2c6' : '#b9b2a6');
    // the crane: on site until the tower is topped out (then gone while the camera swings away)
    crane.visible = c < 1;
    const mastH = Math.max(36, (c > 0 ? s : G0) + 20 - G0);
    mast.scale.y = mastH;
    head.position.y = mastH;
    head.rotation.y = -0.6 + 1.9 * smooth(within(p, [0.3, 0.53])) + 0.04 * Math.sin(time * 0.3);
    const drop = 10 + 18 * (0.5 + 0.5 * Math.sin(p * 90));
    cable.position.set(30, 0, 0);
    cable.scale.y = drop;
    hook.position.set(30, -drop - 0.7, 0);

    // floor 7: the lit band and its windows (explore), off for the plan
    const hiK = sstep(0.655, 0.685, p) * (1 - sstep(0.745, 0.76, p));
    facadeU.uHi.value.set(PLAN_FLOOR, hiK, 0);
    facadeU.uHi2.value.set(-5, 0, 0);
    tower.setBandFloor(PLAN_FLOOR);
    tower.band.visible = hiK > 0.001;
    tower.bandMat.color.copy(bandColor).multiplyScalar(1.5 * hiK);
    // soffit downlights only read from close by
    const near = 1 - sstep(110, 170, camera.position.distanceTo(towerTop));
    tower.soffitMat.color.copy(soffitBase).multiplyScalar(near);
    tower.soffit.visible = near > 0.002 && planK <= 0;
    if (haloBase) {
      tower.haloMat.color.copy(haloBase).multiplyScalar(near);
      tower.halo.visible = near > 0.002 && planK <= 0;
    }
    // the sea and the boats
    sea.material.uniforms.uTime.value = time;
    sea.material.uniforms.uPixAngle.value = ((camera.fov * Math.PI) / 180) / (H * dpr);
    sea.material.uniforms.uDpr.value = dpr;
    yachts.update(time);
    if (post) post.finalPass.uniforms.uTime.value = time;

    stage = p < PHASES.descent[1] ? 'clouds' : p < PHASES.build[0] ? 'aerial' : p < PHASES.reveal[0] ? 'build' : p < PHASES.explore[0] ? 'tower' : p < PHASES.plan[0] ? 'explore' : 'plan';
  }

  function resize(w, h, d) {
    W = Math.max(1, w);
    H = Math.max(1, h);
    dpr = d || 1;
    if (!post) buildPost();
    else post.setSize(W, H, dpr);
    placeCamera(curP);
  }

  // screen projections (CSS px): the plan's frame (local origin and unit axes on the floor-7 plane)
  const P = new THREE.Vector3();
  const toScreen = (lx, ly, lz) => {
    P.set(lx, ly, lz).applyMatrix4(building.matrixWorld).project(camera);
    return [((P.x + 1) / 2) * W, ((1 - P.y) / 2) * H, P.z];
  };
  function anchors() {
    building.updateMatrixWorld();
    camera.updateMatrixWorld();
    const o = toScreen(0, Y7, 0), ex = toScreen(1, Y7, 0), ez = toScreen(0, Y7, 1);
    const top = toScreen(0, TOP, 0);
    return {
      plan: { k: planK, ox: o[0], oy: o[1], ax: ex[0] - o[0], ay: ex[1] - o[1], bx: ez[0] - o[0], by: ez[1] - o[1] },
      tower: { x: top[0], y: top[1], visible: top[2] < 1 },
    };
  }

  const WARM_P = [0, 0.13, 0.2, 0.3, 0.45, 0.6, 0.7, 0.8];
  async function warmup() {
    const keep = curP;
    renderer.compile(scene, camera);
    for (const p of WARM_P) {
      update({ p, pointer: { x: 0, y: 0 } }, 1, 0);
      if (post) post.render(0);
      await new Promise((r) => setTimeout(r, 0));
    }
    update({ p: keep, pointer: { x: 0, y: 0 } }, 1, 0);
  }

  return {
    camera,
    scene,
    update,
    render() {
      if (post) post.render(0);
    },
    resize,
    warmup,
    setQuality(lv) {
      if (!LV[lv] || lv === level) return;
      level = lv;
      clouds.setSteps(LV[lv].steps);
      CU.uDetail.value = LV[lv].detail;
      buildPost();
    },
    stats() {
      const i = renderer.info;
      return { calls: i.render.calls, triangles: i.render.triangles, textures: i.memory.textures, geometries: i.memory.geometries, programs: i.programs ? i.programs.length : 0, stage, level, c: +curC.toFixed(3) };
    },
    anchors,
    info() {
      return { stage };
    },
  };
}
