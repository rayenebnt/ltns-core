// Fence module test page: the fences alone in a simple sunny stand-in (flat lawn, sky
// gradient, PMREM environment, one shadow-casting sun), seen from the contract's views.
//   node tools/harness.mjs tools/harness-fences/main.js .cache/harness-fences.html
// URL: ?mode=install|styles|repair  ?p=0..1 (install)  ?from=0&to=1&k=0.5 (styles)  ?r=0..1
//      ?view=hero|push|finale|styles|repair|gate|<close-ups>  ?preset=ete|orage|eclaircie|auto
//      ?q=max|high|medium|low  ?t=4 (frozen clock)  ?capture (render on demand only)
//      ?view=custom&pos=x,y,z&target=x,y,z
//      ?garden=1 : the real garden module instead of the stand-in (sky, presets, lawn, grass,
//                  trees, house); ?gao=1 : the garden's own fence darkening instead of the strip
// Hooks: window.__ready, window.__render({ mode, p, from, to, k, r, view, preset, t }) -> stats,
//        window.__fences, window.__three.
import * as THREE from 'three';
import { createFences } from '../../src/world/fences/index.js';
import { createGarden } from '../../src/world/garden/index.js';

const params = new URLSearchParams(location.search);
const CAPTURE = params.has('capture');
const num = (k, d) => (params.has(k) ? +params.get(k) : d);

// contract views (position -> target) and a shadow fit (centre, radius) for each
const VIEWS = {
  hero: { pos: [5.0, 1.6, 10.5], target: [-3, 2.4, -34], shadow: [[-2, 0, -14], 32] },
  push: { pos: [6.4, 1.5, 6.0], target: [7.0, 1.0, -24], shadow: [[5, 0, -10], 24] },
  finale: { pos: [15, 4.5, 31], target: [-2, 0.5, -8], shadow: [[-3, 0, 2], 36] },
  styles: { pos: [6.2, 1.35, 14.5], target: [8.6, 1.05, -24], shadow: [[6, 0, -4], 26] },
  repair: { pos: [-17.5, 1.5, -1.0], target: [-24, 1.0, -2.0], shadow: [[-23, 0, -2.5], 10] },
  gate: { pos: [-20.6, 1.4, 0.6], target: [-24, 1.0, 0.6], shadow: [[-23.5, 0, 0.6], 6] },
  // close-ups (materials and props)
  cu_douglas: { pos: [7.2, 1.25, -2.2], target: [9.0, 1.0, -4.6], shadow: [[8.6, 0, -4], 5] },
  cu_douglas_out: { pos: [11.2, 1.45, 2.0], target: [9.1, 1.1, -0.6], shadow: [[9, 0, -0.5], 5] },
  cu_corner: { pos: [12.6, 2.1, 21.4], target: [9.0, 1.2, 18.0], shadow: [[9, 0, 18], 6] },
  cu_pvc: { pos: [7.0, 1.3, -1.2], target: [9.0, 1.0, -4.2], shadow: [[8.6, 0, -4], 5] },
  cu_rigid: { pos: [7.1, 1.2, -1.6], target: [9.0, 0.95, -4.0], shadow: [[8.6, 0, -3.5], 5] },
  cu_ranch: { pos: [7.0, 1.1, -1.2], target: [9.0, 0.75, -4.2], shadow: [[8.6, 0, -3.5], 5] },
  cu_ganivelle: { pos: [7.4, 1.05, -1.8], target: [9.0, 0.7, -3.8], shadow: [[8.6, 0, -3.5], 5] },
  cu_props: { pos: [4.6, 1.55, -1.2], target: [7.3, 0.25, -6.0], shadow: [[7, 0, -6], 6] },
  cu_flags: { pos: [5.0, 1.2, 8.6], target: [6.4, 0.4, 3.2], shadow: [[6, 0, 3], 6] },
  cu_posts: { pos: [7.4, 1.0, 3.2], target: [8.8, 0.25, -1.5], shadow: [[8.6, 0, -1], 5] },
  cu_weathered: { pos: [-22.2, 1.3, -8.8], target: [-24, 1.0, -9.6], shadow: [[-24, 0, -9], 4] },
  cu_branch: { pos: [-20.0, 1.9, -7.2], target: [-23.6, 1.1, -4.8], shadow: [[-23, 0, -5], 6] },
  cu_hinges: { pos: [-22.4, 1.45, -0.3], target: [-24, 1.15, 0.45], shadow: [[-24, 0, 0.5], 3] },
};

// three light presets of the stand-in (close to the garden's values)
const PRESETS = {
  ete: { dir: [-0.5, 0.62, 0.6], sun: [1.0, 0.92, 0.78], sunI: 4.9, shadow: 1, env: 0.9, exposure: 0.94, zen: [0.05, 0.13, 0.37], hor: [0.5, 0.6, 0.72], ground: [0.05, 0.085, 0.025] },
  orage: { dir: [0.55, 0.55, 0.35], sun: [0.86, 0.9, 1.0], sunI: 0.25, shadow: 0.25, env: 1.0, exposure: 1.62, zen: [0.3, 0.33, 0.38], hor: [0.42, 0.44, 0.48], ground: [0.03, 0.04, 0.03] },
  eclaircie: { dir: [0.55, 0.55, 0.35], sun: [1.0, 0.95, 0.88], sunI: 3.6, shadow: 1, env: 1.0, exposure: 1.06, zen: [0.045, 0.12, 0.35], hor: [0.45, 0.54, 0.66], ground: [0.045, 0.075, 0.03] },
};

function lawnTexture() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#4f7a2c';
  g.fillRect(0, 0, S, S);
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26000; i++) {
    const v = r();
    g.fillStyle = `rgba(${40 + v * 70 | 0},${84 + v * 80 | 0},${20 + v * 30 | 0},${0.35 + r() * 0.4})`;
    g.fillRect(r() * S, r() * S, 1 + r() * 1.5, 2 + r() * 5);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(160, 160);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uZen: { value: new THREE.Vector3() }, uHor: { value: new THREE.Vector3() }, uGround: { value: new THREE.Vector3() }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunC: { value: new THREE.Vector3(1, 1, 1) }, uI: { value: 1 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: `uniform vec3 uZen; uniform vec3 uHor; uniform vec3 uGround; uniform vec3 uSun; uniform vec3 uSunC; uniform float uI; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float h = d.y;
        vec3 c = h > 0.0 ? mix(uHor, uZen, pow(clamp(h, 0.0, 1.0), 0.5)) : mix(uHor * 0.6, uGround, clamp(-h * 6.0, 0.0, 1.0));
        float s = max(dot(d, normalize(uSun)), 0.0);
        c += uSunC * (pow(s, 600.0) * 60.0 + pow(s, 12.0) * 0.25) * uI;
        c *= 2.2;
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

async function main() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', stencil: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.info.autoReset = false;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.05, 3000);

  const GARDEN = params.get('garden') === '1';
  const GAO = params.get('gao') === '1';
  let garden = null;
  if (GARDEN) garden = await createGarden({ renderer, scene, quality: params.get('q') || 'high' });
  // sky + environment (one PMREM per preset)
  const skyMat = skyMaterial();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), skyMat);
  sky.frustumCulled = false;
  if (!GARDEN) scene.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envs = {};
  const setSky = (P, intensity = 1) => {
    skyMat.uniforms.uZen.value.fromArray(P.zen);
    skyMat.uniforms.uHor.value.fromArray(P.hor);
    skyMat.uniforms.uGround.value.fromArray(P.ground);
    skyMat.uniforms.uSun.value.fromArray(P.dir);
    skyMat.uniforms.uSunC.value.fromArray(P.sun).multiplyScalar(P.sunI / 4.9);
    skyMat.uniforms.uI.value = intensity;
  };
  for (const [name, P] of Object.entries(GARDEN ? {} : PRESETS)) {
    const envScene = new THREE.Scene();
    const m = skyMaterial();
    m.uniforms = THREE.UniformsUtils.clone(skyMat.uniforms);
    m.uniforms.uZen.value.fromArray(P.zen);
    m.uniforms.uHor.value.fromArray(P.hor);
    m.uniforms.uGround.value.fromArray(P.ground);
    m.uniforms.uSun.value.fromArray(P.dir);
    m.uniforms.uSunC.value.set(0, 0, 0);
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), m));
    const tm = renderer.toneMapping;
    renderer.toneMapping = THREE.NoToneMapping;
    envs[name] = pmrem.fromScene(envScene, 0.02).texture;
    renderer.toneMapping = tm;
  }

  // lawn
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshStandardMaterial({ map: lawnTexture(), roughness: 0.95, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  if (!GARDEN) scene.add(ground);
  // context stand-ins: the house, its roof, the hedge, a few tree blobs (harness only)
  const stand = new THREE.Group();
  const tuffeau = new THREE.MeshStandardMaterial({ color: 0xe8dfcb, roughness: 0.9 });
  const slate = new THREE.MeshStandardMaterial({ color: 0x3b4048, roughness: 0.7 });
  const house = new THREE.Mesh(new THREE.BoxGeometry(15, 8.5, 10), tuffeau);
  house.position.set(-4, 4.25, -38);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 7.6, 4.2, 4, 1), slate);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.45, 1, 0.95);
  roof.position.set(-4, 10.6, -38);
  const hedge = new THREE.Mesh(new THREE.BoxGeometry(34.6, 1.05, 0.8), new THREE.MeshStandardMaterial({ color: 0x2f4a1c, roughness: 0.95 }));
  hedge.position.set(-6.7, 0.525, -28);
  const leafy = new THREE.MeshStandardMaterial({ color: 0x3b5e22, roughness: 0.9 });
  for (const [x, z, r, h] of [[-18.5, -41, 7.6, 21], [-7, -56, 8.6, 25], [-30, -47, 9, 19], [-28.5, -6, 8, 19], [22, -5, 8, 17], [-38, 9, 7.5, 20]]) {
    const t = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), leafy);
    t.position.set(x, h - r * 0.8, z);
    t.scale.y = 0.8;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, h - r, 8), new THREE.MeshStandardMaterial({ color: 0x4a3f34, roughness: 0.9 }));
    trunk.position.set(x, (h - r) / 2, z);
    stand.add(t, trunk);
  }
  stand.add(house, roof, hedge);
  stand.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  if (params.get('context') !== '0' && !GARDEN) scene.add(stand);

  // sun
  const sun = new THREE.DirectionalLight(0xffffff, 4.9);
  sun.castShadow = true;
  const shadowSize = { max: 4096, high: 2048, medium: 2048, low: 1024 }[params.get('q') || 'high'] || 2048;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  if (!GARDEN) scene.add(sun, sun.target);

  // fences
  const t0 = performance.now();
  // props rest on the garden's grass blades; on the bare stand-in plane they sit on y = 0
  const fences = createFences({ renderer, scene, quality: params.get('q') || 'high', contact: !GAO, grassLift: GARDEN ? 0.035 : 0 });
  const buildMs = performance.now() - t0;

  let state = {
    mode: params.get('mode') || 'install',
    p: num('p', 0),
    from: num('from', 0),
    to: num('to', 0),
    k: num('k', 1),
    r: num('r', 0),
    view: params.get('view') || 'hero',
    preset: params.get('preset') || 'auto',
    t: num('t', 4),
  };

  function presetFor(s) {
    if (s.preset !== 'auto') return { name: s.preset, P: PRESETS[s.preset] || PRESETS.ete };
    if (s.mode !== 'repair') return { name: 'ete', P: PRESETS.ete };
    // storm, clearing over 0.70 - 1
    const k = Math.min(1, Math.max(0, (s.r - 0.7) / 0.3));
    const a = PRESETS.orage, b = PRESETS.eclaircie;
    const mix = (x, y) => (Array.isArray(x) ? x.map((v, i) => v + (y[i] - v) * k) : x + (y - x) * k);
    const P = {};
    for (const key of Object.keys(a)) P[key] = mix(a[key], b[key]);
    return { name: k < 0.5 ? 'orage' : 'eclaircie', P };
  }

  function applyLight(s) {
    if (GARDEN) {
      if (s.mode !== 'repair') garden.setPreset(s.preset === 'orage' || s.preset === 'eclaircie' ? s.preset : 'ete', 1);
      else if (s.r < 0.7) garden.setPreset('orage', 1);
      else garden.setPreset('eclaircie', Math.min(1, (s.r - 0.7) / 0.3));
      const v = VIEWS[s.view] || VIEWS.hero;
      garden.fitShadow(v.shadow[0], v.shadow[1]);
      if (GAO) garden.setFenceAO(...fences.groundAO());
      return;
    }
    const { name, P } = presetFor(s);
    const d = new THREE.Vector3().fromArray(P.dir).normalize();
    sun.color.setRGB(P.sun[0], P.sun[1], P.sun[2]);
    sun.intensity = P.sunI;
    sun.shadow.intensity = P.shadow;
    scene.environment = envs[name];
    scene.environmentIntensity = P.env;
    renderer.toneMappingExposure = P.exposure;
    setSky(P);
    const v = VIEWS[s.view] || VIEWS.hero;
    const c = new THREE.Vector3().fromArray(v.shadow[0]);
    const r = v.shadow[1];
    sun.target.position.copy(c);
    sun.position.copy(c).addScaledVector(d, r + 60);
    const cam = sun.shadow.camera;
    cam.left = -r;
    cam.right = r;
    cam.top = r;
    cam.bottom = -r;
    cam.near = 1;
    cam.far = 2 * r + 120;
    cam.updateProjectionMatrix();
    sun.target.updateMatrixWorld();
    sun.updateMatrixWorld();
  }

  function applyView(name) {
    if (name === 'custom' && params.has('pos')) {
      const t = params.get('target').split(',').map(Number);
      VIEWS.custom = { pos: params.get('pos').split(',').map(Number), target: t, shadow: [t, 12] };
    }
    const v = VIEWS[name] || VIEWS.hero;
    camera.position.fromArray(v.pos);
    camera.lookAt(new THREE.Vector3().fromArray(v.target));
    camera.aspect = innerWidth / innerHeight;
    const base = 42;
    camera.fov = camera.aspect < 1.6 ? (2 * Math.atan(Math.tan((base * Math.PI) / 360) * (1.6 / camera.aspect)) * 180) / Math.PI : base;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  function applyState(s) {
    fences.setMode(s.mode);
    fences.setInstall(s.p);
    fences.setStyle(s.from, s.to, s.k);
    fences.setRepair(s.r);
    applyView(s.view);
    applyLight(s);
    fences.update(0, s.t);
    if (garden) garden.update(0, s.t, camera);
  }

  function renderNow() {
    applyState(state);
    renderer.info.reset();
    renderer.render(scene, camera);
    const i = renderer.info;
    // anchors in CSS pixels
    const anchors = {};
    for (const [id, p] of Object.entries(fences.anchors())) {
      const q = p.clone().project(camera);
      anchors[id] = { x: Math.round((q.x * 0.5 + 0.5) * innerWidth), y: Math.round((-q.y * 0.5 + 0.5) * innerHeight), visible: q.z < 1 && Math.abs(q.x) < 1 && Math.abs(q.y) < 1 };
    }
    return {
      calls: i.render.calls,
      triangles: i.render.triangles,
      textures: i.memory.textures,
      geometries: i.memory.geometries,
      programs: i.programs ? i.programs.length : 0,
      buildMs: Math.round(buildMs),
      fences: fences.stats(),
      info: fences.info(),
      anchors,
    };
  }

  // raw texture viewer: window.__showTex(index) draws map | normal | roughness of a wood set
  window.__showTex = (name) => {
    const all = { douglas: 0, pine: 1, weathered: 2, chestnut: 3, bark: 4 };
    const i = all[name] ?? 0;
    const set = fences.textures.slice(i * 3, i * 3 + 3);
    let cv = document.getElementById('texview');
    if (!cv) {
      cv = document.createElement('canvas');
      cv.id = 'texview';
      cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;background:#222;z-index:10';
      document.body.appendChild(cv);
    }
    cv.width = innerWidth;
    cv.height = innerHeight;
    const g = cv.getContext('2d');
    g.fillStyle = '#222';
    g.fillRect(0, 0, cv.width, cv.height);
    set.forEach((t, k) => {
      const { data, width, height } = t.image;
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const id = c.getContext('2d').createImageData(width, height);
      id.data.set(data);
      c.getContext('2d').putImageData(id, 0, 0);
      // show the bottom 0.9 m of the tile (rows from v = 0 upward), full width, 2 copies wide
      const rows = Math.round(height * (0.9 / 2.4));
      const w = cv.width / 3 - 8, h = cv.height;
      const sc = Math.min(w / width, h / rows);
      g.save();
      g.translate(k * (cv.width / 3) + 4, 0);
      g.scale(1, -1);
      g.translate(0, -h);
      g.drawImage(c, 0, 0, width, rows, 0, 0, width * sc, rows * sc);
      g.restore();
    });
  };
  window.__hideTex = () => {
    const cv = document.getElementById('texview');
    if (cv) cv.remove();
  };

  window.__fences = fences;
  window.__three = { renderer, scene, camera, THREE, sun };
  window.__views = VIEWS;
  window.__render = (o = {}) => {
    state = { ...state, ...o };
    return renderNow();
  };
  // render without the stand-in context or the fences (for cost measurements)
  window.__only = (what) => {
    stand.visible = what !== 'fences';
    ground.visible = what !== 'fences';
    sky.visible = what !== 'fences';
  };

  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    if (CAPTURE) renderNow();
  });

  renderNow();
  window.__ready = true;
  document.title = 'fences';

  if (!CAPTURE) {
    let last = performance.now();
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      state.t += dt;
      applyState(state);
      renderer.render(scene, camera);
    };
    requestAnimationFrame(loop);
  }
}

main().catch((e) => {
  console.error(e);
  window.__ready = 'error';
  window.__error = String(e && e.stack ? e.stack : e);
});
