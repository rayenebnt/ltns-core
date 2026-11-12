// Port module test page: the port alone on a white studio stage (paper clear colour, RoomEnvironment
// reflections, a soft key light from the upper left with one shadow map, a weak fill).
//   node tools/harness.mjs tools/harness-port/main.js .cache/harness-port.html
// URL: ?view=<name> ?p=0..1 ?t=4 ?q=low|medium|high|max ?capture (render on demand)
//      ?view=custom&pos=x,y,z&target=x,y,z&fov=30
// Hooks: window.__ready, window.__render({ view, p, t, q }) → stats, window.__port, window.__three,
//        window.__views
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createPort } from '../../src/world/port/index.js';
import { ROAD } from '../../src/world/layout.js';

const params = new URLSearchParams(location.search);
const CAPTURE = params.has('capture');
const num = (k, d) => (params.has(k) ? +params.get(k) : d);

// views: camera position, target, vertical fov, shadow fit (centre, radius), p (default), up
const VIEWS = {
  // side views (looking north): about 45 m of yard in frame at p = 0
  hero: { pos: [10.5, 6.6, 58], target: [10.5, 5.6, 0], fov: 28, shadow: [[10, 0, -2], 34], p: 0 },
  // the same, composed low (subjects in the lower half, room for the DOM title above)
  heroLow: { pos: [11, 2.6, 60], target: [11, 9.6, 0], fov: 28, shadow: [[10, 0, -2], 34], p: 0 },
  lowerClose: { pos: [22.5, 2.4, 40], target: [22.5, 7.0, 0], fov: 28, shadow: [[21, 0, -2], 28], p: 0.142 },
  lift: { pos: [6.5, 6.8, 52], target: [6.5, 6.2, 0], fov: 28, shadow: [[6, 0, -2], 30], p: 0.065 },
  carry: { pos: [12.5, 6.8, 54], target: [12.5, 6.0, 0], fov: 28, shadow: [[12, 0, -2], 30], p: 0.1 },
  lower: { pos: [20, 6.4, 52], target: [20, 5.4, 0], fov: 28, shadow: [[20, 0, -2], 30], p: 0.135 },
  away: { pos: [26, 6.6, 58], target: [26, 5.4, 0], fov: 28, shadow: [[26, 0, -2], 36], p: 0.205 },
  // the terminal straight from above (north up)
  top: { pos: [10, 120, 0.01], target: [10, 0, 0], fov: 40, shadow: [[10, 0, -20], 95], p: 0.3, up: [0, 0, -1] },
  topTruck: { pos: [26, 30, 0.01], target: [26, 0, 0], fov: 40, shadow: [[26, 0, 0], 22], p: 0.16, up: [0, 0, -1] },
  // close-ups
  cabin: { pos: [10.5, 13.6, 8.5], target: [3.6, 11.8, 0.6], fov: 32, shadow: [[2, 0, 0], 16], p: 0 },
  spreader: { pos: [8.6, 8.4, 7.6], target: [4.2, 6.0, 0.4], fov: 32, shadow: [[2, 0, 0], 14], p: 0 },
  doors: { pos: [11.2, 3.4, 6.2], target: [6.0, 2.7, 0.1], fov: 34, shadow: [[4, 0, 0], 12], p: 0 },
  cab: { pos: [33.6, 2.7, 8.6], target: [29.2, 2.2, 0], fov: 34, shadow: [[28, 0, 0], 14], p: 0 },
  wheels: { pos: [4.5, 1.6, 6.5], target: [1.5, 1.0, 2.2], fov: 34, shadow: [[1, 0, 0], 10], p: 0 },
  three: { pos: [42, 16, 36], target: [12, 4.5, 0], fov: 30, shadow: [[12, 0, -2], 36], p: 0.135 },
  // the trailer's rear twistlock as the container is seated (amber → green), mid-crane oblique
  lock: { pos: [12.6, 2.9, 5.2], target: [16.3, 1.6, 0.6], fov: 34, shadow: [[17, 0, 0], 10], p: 0.1442 },
  crane: { pos: [44, 48, 62], target: [34, 0, -6], fov: 36, shadow: [[30, 0, -8], 60], p: 0.22 },
  // the truck on the road's exit curve (poseOnPath), from above: the camera follows the truck
  curve: { follow: 40, fov: 40, shadow: [[0, 0, 0], 26], p: 0.3, up: [0, 0, -1], road: 120 },
  curveSide: { follow: [16, 9, 16], fov: 34, shadow: [[0, 0, 0], 22], p: 0.3, road: 120 },
};

async function main() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', stencil: false });
  renderer.setPixelRatio(1);
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = num('exp', 1.0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = params.get('sh') === 'soft' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  renderer.info.autoReset = false;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eef0f1');
  const camera = new THREE.PerspectiveCamera(28, innerWidth / innerHeight, 0.3, 3000);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = num('env', 0.7);

  const key = new THREE.DirectionalLight(0xffffff, num('key', 2.6));
  key.castShadow = true;
  const q0 = params.get('q') || 'high';
  const sm = { low: 1024, medium: 2048, high: 2048, max: 4096 }[q0] || 2048;
  key.shadow.mapSize.set(sm, sm);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  key.shadow.radius = num('sr2', 7);
  key.shadow.blurSamples = 16;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xf2f5ff, num('fill', 0.5));
  scene.add(fill, fill.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xdcdedf, num('hemi', 0.25));
  scene.add(hemi);
  const keyDir = new THREE.Vector3(-0.66, 0.66, 0.36).normalize();
  const fillDir = new THREE.Vector3(0.55, 0.3, 0.78).normalize();

  const t0 = performance.now();
  const port = await createPort({ renderer, quality: q0 });
  const buildMs = performance.now() - t0;
  scene.add(port.group);

  let state = { view: params.get('view') || 'hero', p: params.has('p') ? +params.get('p') : null, t: num('t', 4), q: q0, road: null };
  // the road centreline as the voyage module will build it (centripetal Catmull-Rom), by arc length
  const roadCurve = new THREE.CatmullRomCurve3(ROAD.points.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  const roadLen = roadCurve.getLength();
  const _rp = new THREE.Vector3();
  const sample = (d) => {
    if (d <= 0) return [ROAD.points[0][0] + d, ROAD.points[0][1]];
    roadCurve.getPointAt(Math.min(1, d / roadLen), _rp);
    return [_rp.x, _rp.z];
  };

  function applyView(name) {
    if (name === 'custom' && params.has('pos')) {
      const t = params.get('target').split(',').map(Number);
      VIEWS.custom = { pos: params.get('pos').split(',').map(Number), target: t, fov: num('fov', 30), shadow: [t, num('sr', 20)], p: 0 };
    }
    const v = { ...(VIEWS[name] || VIEWS.hero) };
    if (v.follow !== undefined) {
      const c = port.truckCentre(new THREE.Vector3());
      v.target = [c.x, 0, c.z];
      v.pos = Array.isArray(v.follow) ? [c.x + v.follow[0], v.follow[1], c.z + v.follow[2]] : [c.x, v.follow, c.z + 0.01];
      v.shadow = [[c.x, 0, c.z], v.shadow[1]];
    }
    camera.up.set(...(v.up || [0, 1, 0]));
    camera.position.fromArray(v.pos);
    camera.fov = v.fov;
    camera.aspect = innerWidth / innerHeight;
    camera.lookAt(new THREE.Vector3().fromArray(v.target));
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const c = new THREE.Vector3().fromArray(v.shadow[0]);
    const r = v.shadow[1];
    key.target.position.copy(c);
    key.position.copy(c).addScaledVector(keyDir, r + 60);
    const sc = key.shadow.camera;
    sc.left = -r;
    sc.right = r;
    sc.top = r;
    sc.bottom = -r;
    sc.near = 1;
    sc.far = 2 * r + 140;
    sc.updateProjectionMatrix();
    key.target.updateMatrixWorld();
    key.updateMatrixWorld();
    fill.target.position.copy(c);
    fill.position.copy(c).addScaledVector(fillDir, 50);
    fill.target.updateMatrixWorld();
    fill.updateMatrixWorld();
    return v;
  }

  function renderNow() {
    if (state.q !== port.stats().quality) port.setQuality(state.q);
    const v0 = VIEWS[state.view] || VIEWS.hero;
    const p = state.p ?? v0.p ?? 0;
    port.update(p, state.t);
    const road = state.road ?? v0.road ?? null;
    if (road !== null) port.truck.poseOnPath(sample, road, road + 50);
    const v = applyView(state.view);
    renderer.info.reset();
    renderer.render(scene, camera);
    const i = renderer.info;
    return {
      calls: i.render.calls,
      triangles: i.render.triangles,
      textures: i.memory.textures,
      geometries: i.memory.geometries,
      programs: i.programs ? i.programs.length : 0,
      buildMs: Math.round(buildMs),
      p,
      port: port.stats(),
    };
  }

  window.__port = port;
  window.__three = { renderer, scene, camera, THREE, key, fill };
  window.__views = VIEWS;
  window.__render = (o = {}) => {
    state = { ...state, ...o };
    return renderNow();
  };
  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    if (CAPTURE) renderNow();
  });
  renderNow();
  window.__ready = true;
  document.title = 'port';

  if (!CAPTURE) {
    let last = performance.now();
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      state.t += dt;
      renderNow();
    };
    requestAnimationFrame(loop);
  }
}

main().catch((e) => {
  console.error(e);
  window.__ready = 'error';
  window.__error = String(e && e.stack ? e.stack : e);
});
