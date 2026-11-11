// Garment look-dev harness: a studio-like stage (light grey wall, soft key light, RoomEnvironment,
// one soft shadow) and fixed views, switched with window.__view(name) (renders once).
// Build: node tools/harness.mjs tools/harness-garments/main.js .cache/harness-garments.html
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PRODUCTS, BRAND, HERO } from '../../src/catalog.js';
import { createGarment, createTags, loadGarmentFonts } from '../../src/world/garments/index.js';

const params = new URLSearchParams(location.search);
const quality = params.get('q') || 'high';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(BRAND.paper);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.8;

const wallMat = new THREE.MeshStandardMaterial({ color: BRAND.paper, roughness: 0.95 });
const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), wallMat);
wall.position.set(0, -0.5, -0.17);
wall.receiveShadow = true;
scene.add(wall);

const key = new THREE.DirectionalLight(0xffffff, 1.7);
key.position.set(-0.9, 1.9, 4.2);
if (params.get('light') === 'side') { key.position.set(-2.6, 2.2, 2.4); key.intensity = 2.0; }
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.radius = 9;
key.shadow.blurSamples = 16;
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.01;
const sc = key.shadow.camera;
sc.left = -3.4; sc.right = 3.4; sc.top = 1.6; sc.bottom = -2.2; sc.near = 0.5; sc.far = 9;
scene.add(key, key.target);
key.target.position.set(0, -0.45, 0);
const fill = new THREE.HemisphereLight(0xffffff, 0xdedad2, 0.35);
scene.add(fill);

const camera = new THREE.PerspectiveCamera(28, innerWidth / innerHeight, 0.05, 50);

const garments = [];
const extra = {};
let tags = null;
const stage = new THREE.Group();
scene.add(stage);

function clearStage() {
  while (stage.children.length) stage.remove(stage.children[0]);
}
function place(g, x, y = 0, yaw = 0, s = 1, hook = 1) {
  g.setHookMode(hook);
  g.group.position.set(x, y, 0);
  g.group.rotation.set(0, yaw, 0);
  g.group.scale.setScalar(s);
  stage.add(g.group);
  g.update(1);
}
// frame a box of width w centred at (cx, cy) on the garment plane
function frame(cx, cy, h, w = 0) {
  const vf = THREE.MathUtils.degToRad(camera.fov);
  const needH = Math.max(h, w / camera.aspect);
  const dist = needH / 2 / Math.tan(vf / 2);
  camera.position.set(cx, cy, dist);
  camera.lookAt(cx, cy, 0);
}

function instance(name, i) {
  if (!extra[name]) extra[name] = createGarment(PRODUCTS[i], { quality, renderer });
  return extra[name];
}

const VIEWS = {
  lineup() {
    clearStage();
    garments.forEach((g, i) => { g.setVariant(0); place(g, (i - 3.5) * 0.66, 0, 0); });
    frame(0, -0.48, 1.1, 5.5);
  },
  grid() {
    clearStage();
    garments.forEach((g, i) => { g.setVariant(0); place(g, ((i % 4) - 1.5) * 0.7, i < 4 ? 0.52 : -0.52, 0); });
    frame(0, -0.5, 2.2, 2.9);
  },
  rack() {
    clearStage();
    garments.forEach((g, i) => { g.setVariant(0); place(g, (i - 3.5) * 0.2, 0, -1.2 + (i % 3) * 0.05, 1, 0); });
    frame(0, -0.45, 1.3, 2.4);
  },
  heroColors() {
    clearStage();
    const h = garments[HERO];
    [0, 1, 2].forEach((v) => {
      const g = v === 0 ? h : instance('hero' + v, HERO);
      g.setVariant(v);
      place(g, (v - 1) * 1.05, 0, 0);
    });
    frame(0, -0.48, 1.0, 3.2);
  },
  dye() {
    clearStage();
    [0.25, 0.5, 0.75].forEach((k, j) => {
      const g = j === 0 ? garments[HERO] : instance('dye' + j, HERO);
      g.setDye(0, 1, k);
      place(g, (j - 1) * 1.05, 0, 0);
    });
    frame(0, -0.48, 1.0, 3.2);
  },
  angles() {
    clearStage();
    [0, 45, 70].forEach((a, j) => {
      const g = j === 0 ? garments[HERO] : instance('ang' + j, HERO);
      g.setVariant(0);
      place(g, (j - 1) * 0.95, 0, THREE.MathUtils.degToRad(-a));
    });
    frame(0, -0.48, 1.0, 2.9);
  },
  tags() {
    clearStage();
    const g = garments[HERO];
    g.setVariant(0);
    place(g, -0.18, 0, 0);
    if (!tags) tags = createTags(PRODUCTS[HERO], { quality, clearance: g.halfWidth - 0.02 });
    tags.group.position.copy(g.tagAnchor).add(g.group.position);
    stage.add(tags.group);
    tags.setDrop(1);
    tags.setActive(0);
    tags.update(1);
    frame(0.3, -0.25, 0.42, 0.75);
  },
  swing() {
    // hem lag: at rest, swinging sideways (about z), forward (about x), turning (about y)
    clearStage();
    [[0, 0, 0], [0, 5, 0], [5, 0, 0], [0, 0, 5]].forEach((w, j) => {
      const g = j === 0 ? garments[HERO] : instance('sw' + j, HERO);
      g.setVariant(0);
      place(g, (j - 1.5) * 0.95, 0, j === 2 ? -0.9 : 0);
      g.setSwing(w[0], w[1], w[2]);
      g.update(1);
    });
    frame(0, -0.48, 1.0, 3.9);
  },
  fade() {
    // dissolve used when the product view opens: 1, 0.6, 0.3
    clearStage();
    [1, 0.6, 0.3].forEach((a, j) => {
      const g = j === 0 ? garments[3] : instance('fd' + j, 3);
      g.setVariant(0);
      g.setFade(a);
      place(g, (j - 1) * 0.8, 0, 0);
    });
    frame(0, -0.45, 1.0, 2.6);
  },
  dyeOthers() {
    // the dye on other types: varsity (sleeves + ribs), hoodie (heather), jersey (trims)
    clearStage();
    [[3, 0, 1, 0.5], [4, 0, 1, 0.55], [6, 0, 1, 0.45], [0, 1, 0, 0.5]].forEach(([i, a, b, k], j) => {
      const g = instance('do' + j, i);
      g.setDye(a, b, k);
      place(g, (j - 1.5) * 0.8, 0, 0);
    });
    frame(0, -0.48, 1.0, 3.3);
  },
  product() {
    // the product-view framing (hero + tags), roughly as in the reference
    clearStage();
    const g = garments[HERO];
    g.setVariant(0);
    place(g, 0, 0, 0);
    if (!tags) tags = createTags(PRODUCTS[HERO], { quality, clearance: g.halfWidth - 0.02 });
    tags.group.position.copy(g.tagAnchor);
    stage.add(tags.group);
    tags.setDrop(1);
    tags.update(1);
    frame(0.12, -0.5, 1.45, 0);
  },
};
for (let i = 0; i < PRODUCTS.length; i++) {
  VIEWS[`front${i}`] = () => {
    clearStage();
    const g = garments[i];
    g.setVariant(0);
    place(g, 0, 0, 0);
    frame(0, -0.47, 1.12, 0);
  };
  VIEWS[`back${i}`] = () => {
    clearStage();
    const g = garments[i];
    g.setVariant(0);
    place(g, 0, 0, Math.PI);
    frame(0, -0.47, 1.12, 0);
  };
}

window.__view = (name, opts = {}) => {
  VIEWS[name]();
  if (opts.zoom) {
    camera.position.lerp(new THREE.Vector3(camera.position.x, camera.position.y, 0), opts.zoom);
  }
  renderer.render(scene, camera);
  return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
};
// exercise the whole interface the world uses (no visual check, returns numbers)
window.__apiTest = () => {
  const g = garments[HERO];
  const out = {};
  g.setVariant(2); g.setDye(0, 1, 0.4); g.setSwing(1.2, -0.8, 0.5); g.update(1 / 60); g.update(1);
  g.setHookMode(0.5); g.setQuality('low'); g.setQuality('high');
  out.garment = { hemY: +g.hemY.toFixed(3), topY: +g.topY.toFixed(3), halfWidth: +g.halfWidth.toFixed(3), tagAnchor: g.tagAnchor.toArray().map((v) => +v.toFixed(3)), bounds: [g.bounds.min.toArray().map((v) => +v.toFixed(3)), g.bounds.max.toArray().map((v) => +v.toFixed(3))] };
  const t = createTags(PRODUCTS[HERO], {});
  scene.add(t.group);
  t.group.position.copy(g.tagAnchor);
  t.setDrop(0); t.update(1);
  const ys = [];
  for (let f = 0; f <= 90; f++) { t.setDrop(Math.min(1, f / 40)); t.update(1 / 60); if (f % 15 === 0) ys.push(+t.mesh.geometry.attributes.position.array[1].toFixed(4)); }
  t.setHover(1); t.update(1 / 60); t.kick(2); t.setActive(1); for (let f = 0; f < 20; f++) t.update(1 / 60);
  scene.updateMatrixWorld(true);
  camera.position.set(0.3, -0.25, 1.2); camera.lookAt(0.3, -0.25, 0); camera.updateMatrixWorld();
  out.rects = t.rects(camera, innerWidth, innerHeight).map((r) => [r.x, r.y, r.w, r.h].map((v) => Math.round(v)));
  const rc = new THREE.Raycaster();
  const r0 = out.rects[0];
  rc.setFromCamera(new THREE.Vector2(((r0[0] + r0[2] / 2) / innerWidth) * 2 - 1, -(((r0[1] + r0[3] / 2) / innerHeight) * 2 - 1)), camera);
  out.hit = t.hit(rc);
  rc.setFromCamera(new THREE.Vector2(-0.9, 0.9), camera);
  out.miss = t.hit(rc);
  out.dropY = ys;
  scene.remove(t.group); t.dispose();
  g.setVariant(0); g.setSwing(0, 0, 0); g.update(1); g.setHookMode(1);
  return out;
};
window.__stats = () => garments.map((g) => ({ id: g.product.id, ...g.stats() }));

(async () => {
  await loadGarmentFonts();
  const t0 = performance.now();
  for (const p of PRODUCTS) garments.push(createGarment(p, { quality, renderer }));
  window.__buildMs = performance.now() - t0;
  VIEWS.lineup();
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  window.__ready = true;
})().catch((e) => { console.error(e); window.__error = String(e.stack || e); });

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});
