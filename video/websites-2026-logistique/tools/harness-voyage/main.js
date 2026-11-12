// Voyage test page: the voyage module alone on a neutral daylight stage (sun from the north-west,
// 50° high, shadows to the south-east; hemisphere sky fill), with a placeholder truck on the road.
//   node tools/harness.mjs tools/harness-voyage/main.js .cache/harness-voyage.html
// URL: ?view=<name> (see VIEWS)  ?t=4 (time, s)  ?q=low|medium|high|max  ?capture (no loop)
// Hooks: window.__ready, window.__render(view, t) -> stats, window.__voyage, window.__views
import * as THREE from 'three';
import { createVoyage, VOYAGE_SUN, VOYAGE_SUN_COLOR, PLANE_PATH } from '../../src/world/voyage/index.js';
import { PHASES } from '../../src/story.js';
import { SKY, ROAD } from '../../src/world/layout.js';

const params = new URLSearchParams(location.search);
const CAPTURE = params.has('capture');
const Q = params.get('q') || 'high';

async function main() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', stencil: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.info.autoReset = false;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#a9c6e2');
  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 1, 60000);

  const t0 = performance.now();
  const voyage = await createVoyage({ renderer, quality: Q });
  const loadMs = performance.now() - t0;
  scene.add(voyage.group);

  // lights: sun (one shadow map, fitted per view) + sky/ground fill
  const sun = new THREE.DirectionalLight(VOYAGE_SUN_COLOR, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#dce8f4', '#b8b3a8', 1.05);
  scene.add(hemi);

  // placeholder truck: 16.5 m × 2.5 m × 4 m box (cab white, trailer orange container)
  const truck = new THREE.Group();
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.6, 2.4), new THREE.MeshStandardMaterial({ color: '#f2f2f0', roughness: 0.5 }));
  cab.position.set(0, 1.8, 7.0);
  const trailer = new THREE.Mesh(new THREE.BoxGeometry(2.44, 2.9, 12.2), new THREE.MeshStandardMaterial({ color: '#ff5a1f', roughness: 0.6 }));
  trailer.position.set(0, 2.75, -1.6);
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 16.5), new THREE.MeshStandardMaterial({ color: '#2a2d30', roughness: 0.7 }));
  chassis.position.set(0, 0.75, 0);
  truck.add(cab, trailer, chassis);
  truck.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  scene.add(truck);

  const road = voyage.road;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  // views: p (story progress), camera position and target, optional truck d, shadow half-size
  const top = (target, alt, fov = 38) => ({ pos: [target[0], alt, target[2] + 0.001], target, fov, up: [0, 0, -1] });
  const shipAt = (p) => voyage.ship.positionAt(p);
  const pShip = 0.55, pRise = 0.7;
  const sp = shipAt(pShip), sr = shipAt(pRise);
  const planeP = 0.845;
  const pl = voyage.plan(planeP).plane;
  const VIEWS = {
    road0: { p: 0.29, truck: 18, ...top(road.pointAt(28).toArray(), 115), shadow: 90 },
    roadCurve: { p: 0.33, truck: 132, ...top(road.pointAt(132).toArray(), 135), shadow: 100 },
    roadStraight: { p: 0.38, truck: 330, ...top(road.pointAt(345).toArray(), 135), shadow: 100 },
    quay: { p: 0.45, ...top([330, 0, ROAD.quayZ + 10], 270), shadow: 220 },
    ship350: { p: pShip, ...top([sp.x, 0, sp.z + 10], 350), shadow: 200 },
    ship1200: { p: pRise, ...top([sr.x, 0, sr.z + 60], 1200), shadow: 260 },
    ship850: { p: pRise, ...top([sr.x, 0, sr.z + 40], 850), shadow: 260 },
    bow: { p: pShip, ...top([sp.x + 10, 0, sp.z + 175], 125), shadow: 120 },
    wake: { p: 0.86, ...top([shipAt(0.86).x, 0, shipAt(0.86).z - 330], 300), shadow: 200 },
    cloudsBelow: { p: 0.75, pos: [sr.x - 700, 620, sr.z + 900], target: [sr.x + 200, 1250, sr.z - 400], fov: 50, up: [0, 1, 0], shadow: 200 },
    cloudsInside: { p: 0.765, ...top([sr.x, 0, sr.z], 1330, 40), shadow: 200 },
    cloudsAbove: { p: 0.79, ...top([sr.x, 0, sr.z], 2100, 40), shadow: 200 },
    plane: { p: planeP, ...top([pl.x, 0, pl.z], PLANE_PATH.altitude + 260, 38), shadow: 80, sTarget: [pl.x, pl.y, pl.z] },
    planeWide: { p: 0.83, ...top([pl.x + 120, 0, pl.z + 160], PLANE_PATH.altitude + 700, 40), shadow: 200, sTarget: [pl.x, pl.y, pl.z] },
    whiteout: { p: 0.905, ...top([pl.x, 0, pl.z], PLANE_PATH.altitude + 300, 40), shadow: 80 },
  };

  let state = { view: params.get('view') || 'road0', t: params.has('t') ? +params.get('t') : 4 };

  function applyView(name) {
    const v = VIEWS[name] || VIEWS.road0;
    camera.up.fromArray(v.up || [0, 1, 0]);
    camera.position.fromArray(v.pos);
    camera.lookAt(V3(...v.target));
    camera.fov = v.fov || 38;
    camera.aspect = innerWidth / innerHeight;
    camera.near = Math.max(0.5, (v.pos[1] - (v.sTarget ? v.sTarget[1] : 0)) * 0.01);
    camera.far = 80000;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    // the shadow map: fitted around the view's target (at its height)
    const st = v.sTarget ? V3(...v.sTarget) : V3(v.target[0], 0, v.target[2]);
    if (!v.sTarget && name.startsWith('ship') || name === 'bow' || name === 'wake') st.y = 20;
    sun.target.position.copy(st);
    sun.position.copy(st).addScaledVector(VOYAGE_SUN, 1500);
    const s = v.shadow || 150;
    Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 10, far: 4000 });
    sun.shadow.camera.updateProjectionMatrix();
    // truck
    truck.visible = v.truck !== undefined;
    if (truck.visible) {
      const p = road.pointAt(v.truck), tg = road.tangentAt(v.truck);
      truck.position.copy(p);
      truck.rotation.set(0, Math.atan2(tg.x, tg.z), 0);
    }
    return v;
  }

  function renderNow() {
    const v = applyView(state.view);
    voyage.update(v.p, state.t, camera);
    scene.background.set(state.view === 'whiteout' ? '#eef0f1' : '#a9c6e2');
    renderer.info.reset();
    renderer.render(scene, camera);
    const i = renderer.info;
    return {
      view: state.view,
      p: v.p,
      calls: i.render.calls,
      triangles: i.render.triangles,
      programs: i.programs ? i.programs.length : 0,
      textures: i.memory.textures,
      geometries: i.memory.geometries,
      voyage: voyage.stats(),
      loadMs: Math.round(loadMs),
    };
  }

  window.__voyage = voyage;
  window.__views = VIEWS;
  window.__three = { renderer, scene, camera, THREE };
  window.__render = (view = state.view, t = state.t) => {
    state = { view, t };
    return renderNow();
  };
  window.__setQuality = (q) => voyage.setQuality(q);

  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    if (CAPTURE) renderNow();
  });

  renderNow();
  window.__ready = true;
  document.title = 'voyage';

  if (!CAPTURE) {
    let last = performance.now();
    const loop = (now) => {
      requestAnimationFrame(loop);
      state.t += Math.min(0.1, (now - last) / 1000);
      last = now;
      renderNow();
    };
    requestAnimationFrame(loop);
    addEventListener('keydown', (e) => {
      const names = Object.keys(VIEWS);
      const i = names.indexOf(state.view);
      if (e.key === 'ArrowRight') state.view = names[(i + 1) % names.length];
      if (e.key === 'ArrowLeft') state.view = names[(i + names.length - 1) % names.length];
    });
  }
}

main().catch((e) => {
  console.error(e);
  window.__ready = 'error';
  window.__error = String(e && e.stack ? e.stack : e);
});
