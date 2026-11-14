// BRAISE world: a warm studio cove (gradient backdrop, shadow-catching floor, room IBL, a key and a rim
// light), the « Double Braise » burger built from procedural layers (it rises apart into its layers and
// comes back together), the takeaway box (tray, hinged lid printed with the logo, fries, sauce cups) with
// its milkshake, and the menu lineup (four burgers built by the same builder). One camera on monotone
// splines of p. Units: centimetres, Y up, the floor at y = 0.
// Contract (main.js): createWorld({ renderer, quality, onProgress }) → { camera, update(state, dt, time),
// render(), resize(w, h, dpr), warmup(), setQuality(level), stats(), anchors(), info() }.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PHASES, within } from '../story.js';
import { LAYER_LABELS, LINEUP } from '../texts.js';
import { rng, canvasTex, setAniso, burgerMaterials, burgerGeometries, makeBurger, makeShake, makeParchment } from './burger.js';

export const rendererOptions = { antialias: true };

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (t) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
const sstep = (a, b, x) => smooth((x - a) / (b - a));
const easeOut3 = (t) => 1 - Math.pow(1 - clamp(t), 3);
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const col = (h) => new THREE.Color(h);

// ------------------------------------------------------------------ the box, fries, sauce cups, shake
function makeBox(logoTex) {
  const W = 30, D = 20, Hb = 8.6, T = 0.45;
  const black = new THREE.MeshStandardMaterial({ color: col('#1c1a19'), roughness: 0.62 });
  const red = new THREE.MeshStandardMaterial({ color: col('#c4322a'), roughness: 0.7 });
  const box = new THREE.Group();
  box.name = 'box';
  const slab = (w, h, d, m, x, y, z) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    s.position.set(x, y, z);
    s.castShadow = s.receiveShadow = true;
    box.add(s);
    return s;
  };
  // the tray: floor, four walls (black), the red inside, the divider
  slab(W, T, D, black, 0, T / 2, 0);
  slab(W - 2 * T, 0.05, D - 2 * T, red, 0, T + 0.03, 0);
  slab(W, Hb, T, black, 0, Hb / 2, D / 2 - T / 2);
  slab(W, Hb, T, black, 0, Hb / 2, -D / 2 + T / 2);
  slab(T, Hb, D, black, W / 2 - T / 2, Hb / 2, 0);
  slab(T, Hb, D, black, -W / 2 + T / 2, Hb / 2, 0);
  slab(0.3, Hb * 0.8, D - 2 * T, red, 3.5, (Hb * 0.8) / 2, 0);
  // the lid, hinged on the back top edge (pivot at z = -D/2, y = Hb)
  const pivot = new THREE.Group();
  pivot.position.set(0, Hb, -D / 2);
  box.add(pivot);
  const lid = new THREE.Group();
  lid.position.set(0, 0, D / 2); // the lid's centre, relative to the hinge
  pivot.add(lid);
  const lidH = 4.4;
  const top = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, T, D + 0.4), [black, black, new THREE.MeshStandardMaterial({ map: logoTex, roughness: 0.55 }), red, black, black]);
  top.position.y = lidH;
  top.castShadow = top.receiveShadow = true;
  lid.add(top);
  const lslab = (w, h, d, x, z) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), black);
    s.position.set(x, lidH / 2, z);
    s.castShadow = s.receiveShadow = true;
    lid.add(s);
  };
  lslab(W + 0.4, lidH, T, 0, D / 2 + 0.2 - T / 2);
  lslab(W + 0.4, lidH, T, 0, -D / 2 - 0.2 + T / 2);
  lslab(T, lidH, D + 0.4, W / 2 + 0.2 - T / 2, 0);
  lslab(T, lidH, D + 0.4, -W / 2 - 0.2 + T / 2, 0);
  // fries in the right compartment
  const fryM = new THREE.MeshStandardMaterial({ roughness: 0.55 });
  const fryG = new THREE.BoxGeometry(0.72, 0.72, 1);
  const N = 70;
  const fries = new THREE.InstancedMesh(fryG, fryM, N);
  const r = rng(21), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const len = 6.5 + r() * 3.5;
    pos.set(5.6 + r() * 7.6, 3.6 + r() * 2.2, -7.2 + r() * 14.4);
    e.set(-Math.PI / 2 + (r() - 0.5) * 0.9, r() * 3.14, (r() - 0.5) * 0.9, 'YXZ');
    q.setFromEuler(e);
    sc.set(1, 1, len);
    m4.compose(pos, q, sc);
    fries.setMatrixAt(i, m4);
    c.setHSL(0.088 + r() * 0.02, 0.92, 0.3 + r() * 0.08);
    fries.setColorAt(i, c);
  }
  fries.castShadow = fries.receiveShadow = true;
  box.add(fries);
  // two sauce cups (behind the burger)
  const cupM = new THREE.MeshStandardMaterial({ color: col('#f4efe6'), roughness: 0.6 });
  const cupG = new THREE.CylinderGeometry(1.9, 1.5, 2.2, 32, 1, true);
  const sauceG = new THREE.CircleGeometry(1.8, 32);
  sauceG.rotateX(-Math.PI / 2);
  [['#b5261c', -10.6], ['#f1cf72', -6.4]].forEach(([cc, x]) => {
    const cup = new THREE.Mesh(cupG, cupM);
    cup.position.set(x, 1.6, -6.6);
    cup.castShadow = true;
    const s = new THREE.Mesh(sauceG, new THREE.MeshPhysicalMaterial({ color: col(cc), roughness: 0.15, clearcoat: 1 }));
    s.position.set(x, 2.5, -6.6);
    box.add(cup, s);
  });
  return { group: box, pivot, W, D, Hb, burgerSpot: new THREE.Vector3(-6.4, T + 0.05, 1.8) };
}
// ------------------------------------------------------------------ the camera keys (cm)
export function monotone(points) {
  const n = points.length, xs = points.map((p) => p[0]), ys = points.map((p) => p[1]), d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m.push(d[0]);
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
const LX = 200; // the menu lineup, away along +X
const KEYS = [
  // p, camera xyz, target xyz, fov
  [0.0, 30, 15, 44, -3.5, 6.2, 0, 30],
  [0.04, 30, 16, 44, -3.5, 6.6, 0, 30],
  [0.12, 18, 26, 104, -10, 21, 0, 30],
  [0.2, 10, 27, 118, -12, 23.5, 0, 30],
  [0.28, 4, 26, 116, -12, 23, 0, 30],
  [0.34, -16, 20, 54, -2, 7.5, 0, 30],
  [0.42, -40, 17, 30, 1.5, 6.8, -2, 30],
  [0.47, -30, 40, 48, -1, 4, 0, 32],
  [0.55, -1, 46, 62, -4.5, 4, 0, 32],
  [0.62, 1, 46, 64, -4.5, 4, 0, 32],
  [0.68, 0, 68, 34, 0, 6, -1, 32],
  [0.72, 0, 70, 30, 0, 6, -1, 32],
  [0.78, LX - 4, 30, 118, LX - 4, 7, 0, 30],
  [0.88, LX - 4, 30, 112, LX - 4, 7.5, 0, 30],
  [1.0, LX - 4, 30, 112, LX - 4, 7.5, 0, 30],
];
const CH = [];
for (let c = 1; c <= 7; c++) CH.push(monotone(KEYS.map((k) => [k[0], k[c]])));

export async function createWorld({ renderer, quality = 'high', onProgress = () => {} }) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  setAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));
  let level = quality;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 10, 0.5, 4000);
  // the room IBL (soft studio reflections on the bun, the cheese, the sauce)
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  // the backdrop: a warm cream cove (full-screen triangle drawn first), the floor catches the shadows
  const bgU = { uTop: { value: col('#f6eadb') }, uBot: { value: col('#e9cdb0') }, uGlow: { value: col('#fff6ea') }, uMix: { value: 0 } };
  const bg = new THREE.Mesh(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)),
    new THREE.ShaderMaterial({
      uniforms: bgU,
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
      fragmentShader: `uniform vec3 uTop; uniform vec3 uBot; uniform vec3 uGlow; varying vec2 vP;
        void main(){ float t = clamp(vP.y * 0.5 + 0.5, 0.0, 1.0); vec3 c = mix(uBot, uTop, smoothstep(0.0, 1.0, t));
          float g = exp(-dot(vP - vec2(0.15, 0.05), vP - vec2(0.15, 0.05)) * 1.6); c = mix(c, uGlow, 0.55 * g);
          c *= 1.0 - 0.18 * smoothstep(0.7, 1.6, length(vP * vec2(0.8, 1.0)));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    }),
  );
  bg.frustumCulled = false;
  bg.renderOrder = -1000;
  scene.add(bg);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.ShadowMaterial({ color: col('#6b4126'), opacity: 0.26 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // light: a warm key from the front left (shadows), a rim from behind right, a soft fill
  const key = new THREE.DirectionalLight(col('#fff0dc'), 2.4);
  key.castShadow = true;
  key.shadow.mapSize.set(level === 'low' ? 1024 : 2048, level === 'low' ? 1024 : 2048);
  key.shadow.radius = 5;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  const sc = key.shadow.camera;
  sc.left = -48;
  sc.right = 48;
  sc.top = 48;
  sc.bottom = -48;
  sc.near = 10;
  sc.far = 400;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(col('#ffd2a1'), 1.6);
  rim.position.set(60, 50, -80);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(col('#fff6ec'), col('#d9b896'), 0.5));
  onProgress(0.2);
  await nextFrame();

  // the burger, the box, the shake, the lineup
  const G = burgerGeometries();
  const M = burgerMaterials();
  onProgress(0.45);
  await nextFrame();
  const hero = makeBurger(G, M, { patties: 2 }, 3);
  scene.add(hero.group);
  const parchment = makeParchment();
  parchment.rotation.y = 0.35;
  scene.add(parchment);
  await document.fonts.load("400 120px 'Anton'", 'BRAISE').catch(() => {});
  const logoTex = canvasTex(1024, 682, (g, w, h) => {
    g.fillStyle = '#1c1a19';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c4322a';
    g.lineWidth = 6;
    g.strokeRect(34, 34, w - 68, h - 68);
    // the flame
    g.fillStyle = '#e8572c';
    g.beginPath();
    const fx = w / 2, fy = h * 0.34;
    g.moveTo(fx, fy - 92);
    g.bezierCurveTo(fx + 70, fy - 30, fx + 64, fy + 46, fx, fy + 62);
    g.bezierCurveTo(fx - 64, fy + 46, fx - 70, fy - 6, fx - 26, fy - 40);
    g.bezierCurveTo(fx - 22, fy - 6, fx - 6, fy + 4, fx, fy - 12);
    g.bezierCurveTo(fx + 4, fy - 40, fx - 6, fy - 64, fx, fy - 92);
    g.fill();
    g.fillStyle = '#f6eadb';
    g.textAlign = 'center';
    g.font = "400 150px 'Anton', Impact, sans-serif";
    g.fillText('BRAISE', w / 2, h * 0.72);
    g.font = "500 30px 'JetBrains Mono', monospace";
    g.fillStyle = '#e8572c';
    g.fillText('BURGERS SMASHÉS · LYON', w / 2, h * 0.85);
  });
  const box = makeBox(logoTex);
  box.group.position.set(1.5, 0, 0);
  scene.add(box.group);
  const stickerTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c4322a';
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.48, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#f6eadb';
    g.lineWidth = 5;
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.42, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#f6eadb';
    g.textAlign = 'center';
    g.font = "400 54px 'Anton', Impact, sans-serif";
    g.fillText('BRAISE', w / 2, h * 0.68);
    g.fillStyle = '#ffb347';
    g.beginPath();
    const fx = w / 2, fy = h * 0.36;
    g.moveTo(fx, fy - 34);
    g.bezierCurveTo(fx + 26, fy - 10, fx + 24, fy + 18, fx, fy + 24);
    g.bezierCurveTo(fx - 24, fy + 18, fx - 26, fy - 2, fx - 10, fy - 15);
    g.bezierCurveTo(fx - 8, fy - 2, fx - 2, fy + 2, fx, fy - 4);
    g.bezierCurveTo(fx + 2, fy - 15, fx - 2, fy - 24, fx, fy - 34);
    g.fill();
  });
  const shake = makeShake(stickerTex);
  scene.add(shake);
  const lineup = LINEUP.map((it, i) => {
    const b = makeBurger(G, M, it.opts, 11 + i * 5);
    b.group.position.set(LX - 4 + (i - 1.5) * 17, 0, 0);
    b.group.rotation.y = -0.35 + i * 0.06;
    b.group.scale.setScalar(0.92);
    scene.add(b.group);
    return { it, b };
  });
  onProgress(0.8);
  await nextFrame();

  // ------------------------------------------------------------------ per frame
  const tgt = new THREE.Vector3();
  let W = 1280, H = 800, curP = 0, stage = 'hero', curE = 0, lidA = 0;
  const heroBase = new THREE.Vector3();
  const spot = box.burgerSpot.clone().add(box.group.position);
  function placeCamera(p, pointer = { x: 0, y: 0 }) {
    const v = CH.map((f) => f(p));
    camera.position.set(v[0], v[1], v[2]);
    tgt.set(v[3], v[4], v[5]);
    // a breath of parallax with the pointer
    camera.position.x += pointer.x * 1.2;
    camera.position.y += pointer.y * 0.8;
    camera.lookAt(tgt);
    const aspect = W / H;
    const f = v[6];
    camera.fov = aspect < 1.6 ? Math.min(70, (2 * Math.atan(Math.tan((f * Math.PI) / 360) * (1.6 / aspect)) * 180) / Math.PI) : f;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }

  function update(state, dt, time) {
    const p = clamp(state.p);
    curP = p;
    placeCamera(p, state.pointer || { x: 0, y: 0 });
    // the burger: apart and back together, then into the box
    const e = sstep(PHASES.explode[0], PHASES.explode[1], p) * (1 - sstep(PHASES.assemble[0], PHASES.assemble[1], p));
    curE = e;
    hero.setExplode(e, time);
    const intoBox = sstep(PHASES.combo[0], PHASES.combo[0] + 0.05, p);
    heroBase.set(0, 0, 0).lerp(spot, intoBox);
    heroBase.y += 7 * Math.sin(Math.PI * intoBox) * (1 - intoBox * 0.2);
    hero.group.position.copy(heroBase);
    hero.group.scale.setScalar(1 - 0.1 * intoBox);
    // a slow turntable on the hero (stops once it sits in the box)
    const spin = 1 - intoBox;
    hero.group.rotation.y = spin * (0.25 * Math.sin(time * 0.35) + p * 3.2) + intoBox * 0.4;
    // the box: slides in under the burger, the lid closes, then it stays (the camera leaves for the lineup)
    const boxIn = sstep(PHASES.combo[0] - 0.02, PHASES.combo[0] + 0.035, p);
    box.group.position.set(1.5 + (1 - boxIn) * 0, -40 * (1 - boxIn), 0);
    box.group.visible = boxIn > 0.001;
    parchment.visible = boxIn <= 0.001;
    lidA = sstep(PHASES.close[0], PHASES.close[1], p);
    box.pivot.rotation.x = mix(-2.05, 0, easeOut3(lidA));
    // the shake: slides in from the right with the box
    const shakeIn = sstep(PHASES.combo[0] + 0.01, PHASES.combo[0] + 0.06, p);
    shake.position.set(25 + 30 * (1 - shakeIn), 0, -2);
    shake.visible = shakeIn > 0.001;
    // the lineup turns a little, slowly
    lineup.forEach((l, i) => {
      l.b.group.rotation.y = -0.35 + i * 0.06 + 0.15 * Math.sin(time * 0.3 + i);
    });
    // the key light follows the scene (its shadow camera centred on what is on screen)
    const cx = p < 0.74 ? 0 : LX;
    key.target.position.set(cx, 0, 0);
    key.position.set(cx - 70, 120, 90);
    stage = p < PHASES.explode[0] ? 'hero' : p < PHASES.assemble[1] ? 'stack' : p < PHASES.combo[0] ? 'burger' : p < PHASES.close[1] ? 'box' : 'menu';
  }

  function resize(w, h) {
    W = Math.max(1, w);
    H = Math.max(1, h);
    placeCamera(curP);
  }

  // screen anchors (CSS px): the labelled layers (their side edge at mid-height), the lineup's items
  const P = new THREE.Vector3(), Q = new THREE.Vector3(), right = new THREE.Vector3();
  const toScreen = (v) => {
    P.copy(v).project(camera);
    return { x: ((P.x + 1) / 2) * W, y: ((1 - P.y) / 2) * H, z: P.z };
  };
  function anchors() {
    camera.updateMatrixWorld();
    right.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    const labels = [];
    let side = 1;
    for (const L of hero.layers) {
      const text = LAYER_LABELS[L.id];
      if (!text) continue;
      L.g.updateWorldMatrix(true, false);
      Q.set(0, L.h / 2, 0).applyMatrix4(L.g.matrixWorld);
      const c = toScreen(Q);
      const edge = toScreen(Q.clone().addScaledVector(right, side * L.r * 1.02));
      labels.push({ id: L.id, text, side: side > 0 ? 'right' : 'left', x: edge.x, y: edge.y, cx: c.x, k: L.k || 0, visible: c.z < 1 });
      side = -side;
    }
    const menu = lineup.map((l) => {
      Q.set(0, 0, 9).applyMatrix4(l.b.group.matrixWorld);
      const s = toScreen(Q);
      return { id: l.it.id, x: s.x, y: s.y, visible: s.z < 1 };
    });
    return { labels, menu };
  }

  async function warmup() {
    const keep = curP;
    renderer.compile(scene, camera);
    for (const p of [0, 0.2, 0.5, 0.66, 0.8]) {
      update({ p, pointer: { x: 0, y: 0 } }, 1, 0);
      renderer.render(scene, camera);
      await new Promise((r) => setTimeout(r, 0));
    }
    update({ p: keep, pointer: { x: 0, y: 0 } }, 1, 0);
  }

  return {
    camera,
    scene,
    update,
    render() {
      renderer.render(scene, camera);
    },
    resize,
    warmup,
    setQuality(lv) {
      level = lv;
    },
    stats() {
      const i = renderer.info;
      return { calls: i.render.calls, triangles: i.render.triangles, textures: i.memory.textures, geometries: i.memory.geometries, programs: i.programs ? i.programs.length : 0, stage, level, e: +curE.toFixed(3), lid: +lidA.toFixed(3) };
    },
    anchors,
    info() {
      return { stage };
    },
  };
}
