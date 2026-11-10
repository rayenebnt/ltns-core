// Garden test page: the garden module alone (plus simple placeholder fences, harness only),
// seen from the contract's camera views.
//   node tools/harness.mjs tools/harness-garden/main.js .cache/harness-garden.html
// URL: ?view=hero|push|finale|styles|repair|gate  ?preset=ete|orage|eclaircie  ?k=0..1
//      ?t=4 (frozen clock)  ?q=max|high|medium|low  ?fence=0 (no placeholders)  ?capture
// Hooks: window.__ready, window.__render(view, preset, k, t) -> stats, window.__garden.
import * as THREE from 'three';
import { createGarden, VIEWS as GARDEN_VIEWS } from '../../src/world/garden/index.js';
import { createPlaceholderFences } from './placeholders.js';

const params = new URLSearchParams(location.search);
const CAPTURE = params.has('capture');
const Q = params.get('q') || 'high';

const VIEWS = { ...GARDEN_VIEWS };

async function main() {
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', stencil: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.info.autoReset = false;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.15, 6000);

const t0 = performance.now();
const garden = await createGarden({ renderer, scene, quality: Q, onProgress: (x) => (document.title = `garden ${Math.round(x * 100)}%`) });
const loadMs = performance.now() - t0;
const fences = params.get('fence') === '0' ? null : createPlaceholderFences(scene, garden);

let state = { view: params.get('view') || 'hero', preset: params.get('preset') || 'ete', k: params.has('k') ? +params.get('k') : 1, t: params.has('t') ? +params.get('t') : 4 };

function applyView(name) {
  // ?view=custom&pos=x,y,z&target=x,y,z (debug views)
  if (name === 'custom' && params.has('pos')) {
    VIEWS.custom = { pos: params.get('pos').split(',').map(Number), target: params.get('target').split(',').map(Number), shadow: [params.get('target').split(',').map(Number), 30] };
  }
  const v = VIEWS[name] || VIEWS.hero;
  camera.position.fromArray(v.pos);
  camera.lookAt(new THREE.Vector3().fromArray(v.target));
  camera.aspect = innerWidth / innerHeight;
  // keep the horizontal framing on narrower screens than 16:10
  const base = 42;
  const aspect = camera.aspect;
  camera.fov = aspect < 1.6 ? (2 * Math.atan(Math.tan((base * Math.PI) / 360) * (1.6 / aspect)) * 180) / Math.PI : base;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  garden.fitShadow(v.shadow[0], v.shadow[1]);
  if (fences) fences.show(name);
}

function renderNow() {
  applyView(state.view);
  garden.setPreset(state.preset, state.k);
  garden.update(0, state.t, camera);
  renderer.info.reset();
  renderer.render(scene, camera);
  const i = renderer.info;
  return {
    calls: i.render.calls,
    triangles: i.render.triangles,
    textures: i.memory.textures,
    geometries: i.memory.geometries,
    programs: i.programs ? i.programs.length : 0,
    loadMs: Math.round(loadMs),
    garden: garden.stats(),
  };
}

window.__garden = garden;
window.__three = { renderer, scene, camera, THREE };
window.__render = (view = state.view, preset = state.preset, k = state.k, t = state.t) => {
  state = { view, preset, k, t };
  return renderNow();
};
window.__setQuality = (q) => garden.setQuality(q);
// triangles per mesh as drawn by the last render (main pass, instancing and draw ranges included)
window.__breakdown = () => {
  const out = [];
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    const g = o.geometry;
    const count = g.index ? g.index.count : g.attributes.position.count;
    const range = Math.min(count, g.drawRange.count);
    const inst = g.isInstancedBufferGeometry ? g.instanceCount : 1;
    out.push({ name: o.name || o.parent?.name || '?', tris: Math.round((range / 3) * inst), shadow: o.castShadow });
  });
  return out.sort((a, b) => b.tris - a.tris);
};

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  if (CAPTURE) renderNow();
});

renderNow();
window.__ready = true;
document.title = 'garden';

if (!CAPTURE) {
  let last = performance.now();
  const loop = (now) => {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    state.t += dt;
    applyView(state.view);
    garden.update(dt, state.t, camera);
    renderer.render(scene, camera);
  };
  requestAnimationFrame(loop);
  addEventListener('keydown', (e) => {
    const names = Object.keys(VIEWS);
    const i = names.indexOf(state.view);
    if (e.key === 'ArrowRight') state.view = names[(i + 1) % names.length];
    if (e.key === 'ArrowLeft') state.view = names[(i + names.length - 1) % names.length];
    if (e.key === '1') state.preset = 'ete';
    if (e.key === '2') state.preset = 'orage';
    if (e.key === '3') state.preset = 'eclaircie';
    garden.setPreset(state.preset, state.k);
  });
}
}

main().catch((e) => {
  console.error(e);
  window.__ready = 'error';
  window.__error = String(e && e.stack ? e.stack : e);
});
