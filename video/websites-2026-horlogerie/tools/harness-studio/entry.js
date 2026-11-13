// Studio test page: the real watch (src/world/watch, read-only here) in the studio of src/world/studio:
// the light studio, the blue, the night blue, THE TIDE (steel above the line, the sapphire twin below),
// the contact shadow and the line's shadow band, env probes (a polished sphere, a brushed cylinder).
//   node tools/harness.mjs tools/harness-studio/entry.js .cache/harness-studio.html
// URL: ?q=low|medium|high|max  ?capture (no loop)
// Hooks: window.__ready, window.__shot({ view, e, b, t, mode, tide, wipe, night, probes }) → stats
import * as THREE from 'three';
import { createWatch } from '../../src/world/watch/index.js';
import {
  createStudioEnv, createBackground, createTideUniforms, setTideSize, patchTideMeshes,
  createSapphireKit, createShadows, createStudioLights, tideCssY,
} from '../../src/world/studio/index.js';

const params = new URLSearchParams(location.search);
const Q = params.get('q') || 'high';
const CAPTURE = params.has('capture');

async function main() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.info.autoReset = false;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();

  const t0 = performance.now();
  const tide = createTideUniforms();
  const bg = createBackground({ uniforms: tide });
  scene.add(bg.mesh);
  const envLight = createStudioEnv(renderer, { variant: 'light' });
  const envNight = createStudioEnv(renderer, { variant: 'night' });
  const tEnv = Math.round(performance.now() - t0);

  const watch = await createWatch({ renderer, quality: Q, envMap: envLight.texture });
  const holder = new THREE.Group();
  holder.add(watch.group);
  scene.add(holder);
  const patched = patchTideMeshes(watch.meshes(), 'above', tide);
  const kit = createSapphireKit({ envMap: envLight.texture, uniforms: tide });
  const glass = kit.twin(watch.group);
  scene.add(glass.group);
  const shadows = createShadows({ uniforms: tide });
  scene.add(shadows.group);
  const lights = createStudioLights();
  scene.add(lights.group);

  // env probes
  const probes = new THREE.Group();
  const pol = new THREE.MeshPhysicalMaterial({ color: '#cfd4da', metalness: 1, roughness: 0.05, envMap: envLight.texture });
  const bru = new THREE.MeshPhysicalMaterial({ color: '#c2c8cf', metalness: 1, roughness: 0.3, anisotropy: 0.75, envMap: envLight.texture });
  const sph = new THREE.Mesh(new THREE.SphereGeometry(16, 96, 48), pol);
  sph.position.set(-22, 0, 0);
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 40, 96, 1), bru);
  cyl.position.set(22, 0, 0);
  const sapSph = new THREE.Mesh(new THREE.SphereGeometry(9, 64, 32), kit.materialFor('steelPolished'));
  sapSph.position.set(0, -26, 8);
  probes.add(sph, cyl, sapSph);
  probes.visible = false;
  scene.add(probes);

  const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 5000);
  const deg = Math.PI / 180;
  const dirCam = (target, dist, az, el, fov) => {
    const a = az * deg, b = el * deg;
    return { pos: [target[0] + dist * Math.cos(b) * Math.cos(a), target[1] + dist * Math.sin(b), target[2] + dist * Math.cos(b) * Math.sin(a)], target, fov };
  };
  const VIEWS = {
    line: { ...dirCam([0, -3, 6], 600, 26, 3, 21), band: true, density: 1.8 },
    lineMid: { ...dirCam([0, -3, -20], 330, 26, 3, 21), band: true, density: 1.8 },
    lineFront: { ...dirCam([0, -3, 70], 260, 26, 3, 21), band: true, density: 1.8 },
    front34: { pos: [62, -36, 132], target: [0, -2, -2], fov: 27 },
    front: { pos: [0, -8, 120], target: [0, 0, 0], fov: 25 },
    back: { pos: [-30, 18, -92], target: [0, 0, -3], fov: 27 },
    back34: { pos: [-48, 26, -118], target: [0, -2, -3], fov: 26 },
    side: { pos: [0, 30, 158], target: [0, -6, 0], fov: 27, rest: true },
    sideClose: { pos: [0, 26, 112], target: [0, -4, 0], fov: 27, rest: true },
    probes: { pos: [0, 6, 120], target: [0, -4, 0], fov: 30 },
    dialClose: { pos: [14, -10, 70], target: [0, -1, 1], fov: 24 },
  };
  const restQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)));
  function applyView(name) {
    const v = VIEWS[name] || VIEWS.front34;
    holder.quaternion.copy(v.rest ? restQ : new THREE.Quaternion());
    shadows.contact.set({ x: 0, y: watch.floorZ + 0.05, z: 0, length: 200, width: 62, opacity: v.rest ? 0.8 : 0 });
    camera.position.fromArray(v.pos);
    camera.up.set(0, 1, 0);
    camera.lookAt(new THREE.Vector3(...v.target));
    camera.fov = v.fov;
    camera.aspect = innerWidth / innerHeight;
    const d = camera.position.distanceTo(new THREE.Vector3(...v.target));
    camera.near = Math.max(0.5, d * 0.05);
    camera.far = d * 4 + 600;
    camera.updateProjectionMatrix();
    shadows.band.set({ x: 0, y: -30, z: 6, length: 470, width: 46, opacity: v.band ? 0.2 : 0 }).faceCamera(camera);
  }

  let curEnv = 'light';
  const shared0 = { uEnvI: 1, uOpacity: 1, uTime: 1, uWipe: 1, uPx: 1, uCrest: 1 };
  window.__studio = { createStudioEnv };
  window.__three = { renderer, scene, camera, THREE, kit, bg, tide, watch, glass, shadows, lights, envLight, envNight };
  window.__shot = ({ view = 'front34', e = 0, b = null, t = 0, mode = 'studio', tide: k = null, wipe = null, night = null, probes: showProbes = false, envI = null, debug = null, hideKinds = null, density = null } = {}) => {
    renderer.setSize(innerWidth, innerHeight);
    bg.resize(renderer);
    const M = { studio: [0, 0, 0], blue: [1, 1, 0], night: [1, 0, 1], tide: [0.5, 0.5, 0] }[mode] || [0, 0, 0];
    const tk = k === null ? M[0] : k;
    const wk = wipe === null ? (k === null ? M[1] : k) : wipe;
    const nk = night === null ? M[2] : night;
    bg.update({ tide: tk, time: t, night: nk });
    tide.uWipe.value = wk;
    const envName = nk > 0.5 ? 'night' : 'light';
    if (envName !== curEnv) {
      curEnv = envName;
      const tex = envName === 'night' ? envNight.texture : envLight.texture;
      watch.setEnvMap(tex);
      pol.envMap = tex; bru.envMap = tex;
    }
    lights.setVariant(nk);
    if (envI !== null) kit.setEnvIntensity(envI);
    watch.pose(e, null);
    watch.bracelet(b === null ? watch.braceletFor(e) : b);
    watch.setTime(t);
    watch.setMovement(t);
    applyView(view);
    kit.setDensity(density !== null ? density : (VIEWS[view] && VIEWS[view].density) || 1);
    probes.visible = showProbes;
    holder.visible = !showProbes && wk < 1;
    glass.group.visible = !showProbes && wk > 0;
    kit.sync();
    // debug: scale a look uniform on every sapphire material ({ uSpec: 0 } …), hide kinds in the twin
    for (const m of kit.materials()) {
      m.userData.base = m.userData.base || Object.fromEntries(Object.entries(m.uniforms).filter(([, u]) => typeof u.value === 'number').map(([k, u]) => [k, u.value]));
      for (const [k, v] of Object.entries(m.userData.base)) if (!(k in shared0)) m.uniforms[k].value = v * (debug && k in debug ? debug[k] : 1);
    }
    if (hideKinds) for (const t of glass.meshes) if (hideKinds.includes(t.userData.kind)) t.visible = false;
    renderer.info.reset();
    renderer.render(scene, camera);
    const i = renderer.info;
    return {
      view, mode, tide: tk, wipe: wk, calls: i.render.calls, triangles: i.render.triangles, programs: i.programs ? i.programs.length : 0,
      textures: i.memory.textures, geometries: i.memory.geometries, lineY: tideCssY(innerWidth / 2, tk, t, innerWidth, innerHeight),
      patched, sapphireMaterials: kit.materials().length, tEnv,
    };
  };
  window.__ready = true;
  if (!CAPTURE) {
    const loop = (ms) => { window.__shot({ view: 'side', b: 2, mode: 'tide', tide: 0.5 + 0.4 * Math.sin(ms / 4000), t: ms / 1000 }); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  addEventListener('resize', () => setTideSize(tide, renderer));
}
main().catch((e) => { window.__error = String(e && e.stack || e); window.__ready = 'error'; console.error(e); });
