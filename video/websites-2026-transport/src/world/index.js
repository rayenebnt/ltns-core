// ORVAN world: five dioramas in white clay with the company's red, one shown at a time, each with its
// own camera track over its share of p. Rendered through a composer: ambient occlusion (GTAO), a
// tilt-shift blur that makes them read as miniatures, and at every change of diorama a white, blurred
// veil. The hub (the hall's red band, docks with trucks, the office with lit windows, cars, people),
// the hall cut open (racks of boxes, forklifts, the picking line), the countryside (hills, a road
// winding down, a village, trucks), the port and the airport (a container ship under lattice cranes,
// stacks, red planes, the customs), the rail terminal (a red gantry, trains of containers).
// Units: metres, Y up. Contract (main.js): createWorld({ renderer, quality, onProgress }) → { camera,
// update(state, dt, time), render(), resize(w, h, dpr), warmup(), setQuality(level), stats(),
// anchors(), info() }.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SETS, FADES, within } from '../story.js';
import { SPOTS } from '../texts.js';
import { M, box, rbox, cyl, builder, trees, people, car, lamps, truck, forklift, plane, containerStacks, logoTex, wordTex, texMat, tiledPlane, canvasTex, strut, truss, rng, clamp, mix, smooth, col } from './kit.js';

export const rendererOptions = { antialias: false };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const BG = '#f1f0ed';

function monotone(points) {
  const n = points.length, xs = points.map((p) => p[0]), ys = points.map((p) => p[1]), d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m.push(d[0]);
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
function track(keys) {
  const ch = [];
  for (let c = 1; c <= 7; c++) ch.push(monotone(keys.map((k) => [k[0], k[c]])));
  return (u) => ch.map((f) => f(u));
}
function noise(seed) {
  const R = rng(seed);
  const P = new Float32Array(512).map(() => R());
  const h = (x, y) => P[(((x * 73856093) ^ (y * 19349663)) >>> 0) % 512];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return mix(mix(h(xi, yi), h(xi + 1, yi), sx), mix(h(xi, yi + 1), h(xi + 1, yi + 1), sx), sy);
  };
}

// the tilt-shift: a separable 9-tap blur that grows towards the top and the bottom of the frame (and
// over the whole frame during a change of diorama), then the white veil
const TiltShader = {
  uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2(1, 0) }, uRes: { value: new THREE.Vector2(1280, 800) }, uBand: { value: 0.2 }, uMax: { value: 4 }, uAll: { value: 0 }, uFade: { value: 0 }, uWhite: { value: new THREE.Color('#f3f2ef') } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 uDir; uniform vec2 uRes; uniform float uBand; uniform float uMax; uniform float uAll; uniform float uFade; uniform vec3 uWhite;
    varying vec2 vUv;
    void main(){
      float d = abs(vUv.y - 0.5);
      float k = clamp((d - uBand) / (0.5 - uBand), 0.0, 1.0);
      float r = mix(k * k * uMax, uMax * 3.0, uAll);
      vec2 px = uDir / uRes * r / 3.2;
      vec4 c = texture2D(tDiffuse, vUv) * 0.2270270270;
      c += (texture2D(tDiffuse, vUv + px * 1.3846153846) + texture2D(tDiffuse, vUv - px * 1.3846153846)) * 0.3162162162;
      c += (texture2D(tDiffuse, vUv + px * 3.2307692308) + texture2D(tDiffuse, vUv - px * 3.2307692308)) * 0.0702702703;
      c.rgb = mix(c.rgb, uWhite, uFade);
      gl_FragColor = c;
    }`,
};

export async function createWorld({ renderer, quality = 'high', onProgress = () => {} }) {
  let level = quality;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  if (document.fonts && document.fonts.load) {
    try {
      await Promise.all([document.fonts.load("800 120px 'Archivo'", 'Orvan DOUANE'), document.fonts.load("700 60px 'Archivo'", 'DOUANE')]);
    } catch (e) {
      /* the system's fonts then */
    }
  }
  const camera = new THREE.PerspectiveCamera(30, 16 / 10, 2, 1600);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const logo = logoTex(1024, 256, { ribs: 26 });
  const logoBand = logoTex(1536, 256);
  let W = 1280, H = 800, dpr = 1;
  const proj = new THREE.Vector3();
  const toScreen = (v) => {
    proj.copy(v).project(camera);
    return { x: (proj.x * 0.5 + 0.5) * W, y: (0.5 - proj.y * 0.5) * H, vis: proj.z < 1 && Math.abs(proj.x) < 0.96 && Math.abs(proj.y) < 0.96 };
  };

  // every diorama: a pale studio, a high sun from the front, soft shadows, a haze at the edges
  function studio(extent, fogNear, fogFar, { sun: sp = [-40, 130, 70] } = {}) {
    const scene = new THREE.Scene();
    scene.background = col(BG);
    scene.fog = new THREE.Fog(col(BG), fogNear, fogFar);
    scene.environment = env;
    scene.environmentIntensity = 0.45;
    scene.add(new THREE.HemisphereLight(col('#ffffff'), col('#e2ded6'), 1.3));
    const sun = new THREE.DirectionalLight(col('#fff8ee'), 1.9);
    sun.position.set(...sp);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.radius = 5;
    sun.shadow.blurSamples = 12;
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.05;
    sun.shadow.intensity = 0.72;
    Object.assign(sun.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, near: 10, far: 500 });
    scene.add(sun, sun.target);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), M.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    return { scene, sun, ground };
  }
  const place = (obj, x, y, z, ry = 0) => {
    obj.position.set(x, y, z);
    obj.rotation.y = ry;
    return obj;
  };

  // ------------------------------------------------------------------ the hall (shared by the hub and the cutaway)
  // x -30..30, z -20..8, 12 high; docks on the front (hub) or the back (cutaway)
  function officeBlock(b, x0, x1, z0, z1, floors = 3) {
    const w = x1 - x0, d = z1 - z0, hgt = floors * 3.3 + 0.6;
    b.block(w, hgt, d, M.white, (x0 + x1) / 2, 0, (z0 + z1) / 2);
    b.add(box(w + 0.3, 0.5, d + 0.3), M.grey, (x0 + x1) / 2, hgt + 0.25, (z0 + z1) / 2);
    for (let f = 0; f < floors; f++) {
      const y = 1.9 + f * 3.3;
      for (let x = x0 + 1.2; x < x1 - 0.8; x += 1.8) b.add(box(1.25, 1.9, 0.12), M.lit, x + 0.6, y, z1 + 0.04);
      for (let z = z0 + 1.2; z < z1 - 0.8; z += 1.8) b.add(box(0.12, 1.9, 1.25), M.lit, x0 - 0.04, y, z + 0.6);
    }
    return hgt;
  }
  function docks(b, zFace, dir, xs) {
    for (const x of xs) {
      b.add(box(3.2, 3.7, 0.1), M.door, x, 3.05, zFace + dir * 0.05);
      b.add(box(0.5, 4.6, 0.8), M.shelter, x - 1.85, 2.9, zFace + dir * 0.4);
      b.add(box(0.5, 4.6, 0.8), M.shelter, x + 1.85, 2.9, zFace + dir * 0.4);
      b.add(box(4.2, 0.6, 0.8), M.shelter, x, 5.0, zFace + dir * 0.4);
      b.add(box(0.5, 0.3, 0.4), M.white, x, 5.8, zFace + dir * 0.25);
      for (const dx of [-1.3, 1.3]) b.add(box(0.35, 0.5, 0.35), M.dark, x + dx, 1.3, zFace + dir * 0.25);
    }
  }
  function hallShell(b, g, { cut = false } = {}) {
    if (!cut) {
      b.block(60, 12, 28, M.wall, 0, 0, -6);
      b.add(box(60.6, 0.6, 28.6), M.roof, 0, 12.3, -6);
      for (const z of [-17, -12, -7, -2, 3]) b.add(box(54, 0.5, 2.0), M.grey, 0, 12.75, z);
      for (const [x, z] of [[-18, -16], [-6, -9], [12, -15], [20, -4]]) b.add(rbox(4, 1.6, 3, 0.15), M.white, x, 13.4, z);
      b.add(box(60.4, 4.0, 0.5), M.red, 0, 9.8, 8.2);
      b.add(box(0.5, 4.0, 28.4), M.red, -30.2, 9.8, -6);
      docks(b, 8, 1, [-26, -22, -18, -14, -10, -6, -2, 2]);
      // ribbed cladding on the walls in view
      const front = new THREE.Mesh(tiledPlane(60, 7.8, 1.6), M.ribWall);
      front.position.set(0, 3.9, 8.03);
      const side = new THREE.Mesh(tiledPlane(28, 7.8, 1.6), M.ribWall);
      side.position.set(-30.03, 3.9, -6);
      side.rotation.y = -Math.PI / 2;
      for (const m of [front, side]) {
        m.receiveShadow = true;
        g.add(m);
      }
      const band = new THREE.Mesh(new THREE.PlaneGeometry(26, 4.0), texMat(logoBand));
      band.position.set(-10, 9.8, 8.47);
      g.add(band);
    } else {
      // the hall cut open: the far walls standing, the near ones cut at the knee
      b.block(60, 0.25, 28, M.white, 0, 0, -6);
      b.block(60, 12, 0.6, M.wall, 0, 0, -20.3);
      b.block(0.6, 12, 28, M.wall, -30.3, 0, -6);
      b.add(box(60.6, 4.0, 0.7), M.red, 0, 9.8, -20.3);
      b.add(box(0.7, 4.0, 28.6), M.red, -30.3, 9.8, -6);
      b.block(60, 1.4, 0.6, M.white, 0, 0, 8.3);
      b.block(0.6, 1.4, 28, M.white, 30.3, 0, -6);
      for (const x of [-30, 30]) b.block(0.9, 12, 0.9, M.grey, x, 0, 8.3);
      b.block(0.9, 12, 0.9, M.grey, 30.3, 0, -20.3);
      docks(b, -20.6, -1, [-24, -20, -16, -12, -8, -4]);
      const band = new THREE.Mesh(new THREE.PlaneGeometry(22, 3.6), texMat(logoBand));
      band.position.set(-2, 9.8, -19.93);
      g.add(band);
    }
  }

  // ================================================================ 1 the hub
  function buildHub() {
    const { scene, sun } = studio(85, 170, 380);
    const g = new THREE.Group();
    const b = builder();
    b.add(box(120, 0.05, 56), M.asphalt, -6, 0.03, 36);
    for (let i = 0; i < 8; i++) b.add(box(0.22, 0.06, 15), M.line, -28 + i * 4, 0.07, 26);
    b.add(box(120, 0.06, 0.25), M.line, -6, 0.07, 46);
    for (let i = 0; i < 18; i++) b.add(box(3.2, 0.06, 0.25), M.line, -64 + i * 7, 0.07, 55);
    b.add(box(124, 0.3, 0.5), M.white, -6, 0.15, 64.2);
    b.add(box(0.5, 0.3, 56), M.white, -66.2, 0.15, 36);
    b.add(box(60, 0.05, 40), M.grass, -100, 0.03, 30);
    b.add(box(80, 0.05, 30), M.grass, 10, 0.03, 82);
    hallShell(b, g);
    // the office at the front right, its red portal, the car park
    officeBlock(b, 10, 32, 8, 22);
    b.add(box(4.4, 0.6, 3.2), M.red, 13, 4.3, 23.6);
    for (const dx of [-2, 2]) b.add(box(0.5, 4.0, 3.2), M.red, 13 + dx, 2.0, 23.6);
    b.add(box(3.2, 3.2, 0.1), M.glass, 13, 1.6, 22.08);
    b.add(box(30, 0.05, 20), M.asphalt, 50, 0.03, 18);
    for (let i = 0; i < 9; i++) b.add(box(0.15, 0.06, 5), M.line, 37 + i * 3, 0.07, 12);
    for (let i = 0; i < 9; i++) b.add(box(0.15, 0.06, 5), M.line, 37 + i * 3, 0.07, 24);
    // the gatehouse and its barrier
    b.block(3.4, 3.2, 3.4, M.white, 44, 0, 50);
    b.add(box(4.0, 0.4, 4.0), M.red, 44, 3.4, 50);
    b.add(box(0.8, 1.2, 0.8), M.red, 46.4, 0.6, 46);
    b.add(box(7, 0.22, 0.22), M.red, 50, 1.15, 46);
    b.build(g);
    scene.add(g);
    // trucks backed into the docks; two passing; one leaving
    [-26, -22, -14, -10, -2].forEach((x, i) => scene.add(place(truck(logo), x, 0, 18.3 + (i % 2) * 0.2, -Math.PI / 2)));
    const moving = [0, 1].map(() => {
      const t = truck(logo);
      scene.add(t);
      return t;
    });
    scene.add(place(truck(logo), -40, 0, 34, 0.35));
    // cars, people, lamps, trees
    const R = rng(4);
    for (let i = 0; i < 12; i++) {
      if (R() < 0.2) continue;
      const row = i < 6 ? 12 : 24;
      scene.add(place(car(Math.floor(R() * 5)), 38.5 + (i % 6) * 3 * 1.5, 0, row + (row === 12 ? 1 : -1), Math.PI / 2 + (row === 12 ? 0 : Math.PI)));
    }
    scene.add(people([[-24, 0, 10.5], [-23, 0, 10.8], [-6, 0, 11], [9, 0, 26], [16, 0, 27], [6, 0, 30], [30, 0, 40], [-18, 0, 30]]));
    scene.add(lamps([[-50, 0, 46], [-30, 0, 46], [-10, 0, 46], [10, 0, 46], [30, 0, 46], [36, 0, 30, Math.PI]]));
    const tl = [];
    for (let x = -60; x <= 60; x += 7 + R() * 3) tl.push([x, 0, 70 + R() * 4]);
    for (let z = -26; z <= 60; z += 7 + R() * 3) tl.push([-72 - R() * 5, 0, z]);
    for (let i = 0; i < 22; i++) tl.push([-90 - R() * 40, 0, -10 + R() * 70]);
    for (let x = 36; x <= 66; x += 6) tl.push([x, 0, 34 + R() * 2, 0.85]);
    for (let z = -20; z <= 4; z += 6) tl.push([38 + R() * 3, 0, z]);
    for (let i = 0; i < 10; i++) tl.push([20 + R() * 40, 0, 30 + R() * 6, 0.8]);
    scene.add(trees(tl, R));
    const cam = track([
      [0.0, 66, 50, 82, -6, 2, 4, 30],
      [1.0, 52, 42, 68, -10, 3, 2, 30],
    ]);
    const spotPos = { route: V3(-14, 8, 18) };
    function update(u, dt, time) {
      moving.forEach((t, i) => {
        const dir = i ? -1 : 1;
        const x = ((((time * 6 + i * 70) % 160) + 160) % 160) - 80;
        t.position.set(dir * x - 6, 0, 55 + (i ? 2.4 : -2.4));
        t.rotation.y = dir > 0 ? 0 : Math.PI;
      });
    }
    return { scene, sun, cam, update, spots: () => SPOTS.hub.map((s) => ({ id: s.id, ...toScreen(spotPos[s.id]) })) };
  }

  // ================================================================ 2 the hall cut open
  function buildEntrepot() {
    const { scene, sun } = studio(70, 150, 330);
    const g = new THREE.Group();
    const b = builder();
    b.add(box(130, 0.05, 90), M.yard, -4, 0.03, -4);
    hallShell(b, g, { cut: true });
    // aisle markings
    for (const x of [-25.5, -18.5, -11.5, -4.5, 2.5]) b.add(box(0.15, 0.02, 22), M.yellow, x, 0.27, -6.5);
    b.add(box(30, 0.02, 0.15), M.yellow, -12, 0.27, 5.6);
    // the racks: five double rows, along the depth
    const rowsX = [-22, -15, -8, -1, 6];
    const z0 = -17, bay = 2.8, nb = 8, lv = [0.3, 2.4, 4.5, 6.6];
    for (const x of rowsX) {
      for (let i = 0; i <= nb; i++) for (const dx of [-1.05, 0, 1.05]) b.block(0.12, 8.6, 0.12, M.rack, x + dx, 0.25, z0 + i * bay);
      for (const y of lv) for (const dx of [-1.05, 1.05]) b.add(box(0.1, 0.18, nb * bay), M.beam, x + dx, y + 0.25, z0 + (nb * bay) / 2);
    }
    // the picking line at the front right: conveyors, tables, pallets
    b.block(24, 0.9, 1.4, M.grey, 16, 0.25, 0);
    b.block(1.4, 0.9, 14, M.grey, 27, 0.25, -6.5);
    for (const [x, z] of [[12, 3.2], [17, 3.2], [22, 3.2], [24, -9], [24, -4]]) b.block(2.4, 0.85, 1.2, M.white, x, 0.25, z);
    b.build(g);
    scene.add(g);
    // pallets of boxes on the racks (instanced): one to three cartons per pallet
    const R = rng(12);
    const pal = [], cart = [];
    for (const x of rowsX)
      for (let i = 0; i < nb; i++)
        for (const y of lv)
          for (const dx of [-0.55, 0.55]) {
            if (R() < 0.1) continue;
            const zc = z0 + (i + 0.5) * bay;
            pal.push([x + dx, y + 0.42, zc, 1.0, 0.14, 2.2]);
            let zz = zc - 1.0;
            while (zz < zc + 0.9) {
              const d = 0.55 + R() * 0.5, hh = 0.5 + R() * 1.0, w = 0.75 + R() * 0.2;
              if (zz + d > zc + 1.1) break;
              cart.push([x + dx, y + 0.49, zz + d / 2, w, hh, d]);
              if (R() < 0.35 && y < 6) cart.push([x + dx, y + 0.49 + hh, zz + d / 2, w * 0.9, 0.4 + R() * 0.4, d * 0.9]);
              zz += d + 0.06;
            }
          }
    for (let i = 0; i < 26; i++) {
      const x = 9 + R() * 16, z = 5 + R() * 2.4;
      cart.push([x, 0.25, z, 0.7 + R() * 0.4, 0.5 + R() * 0.8, 0.7 + R() * 0.4]);
    }
    for (let i = 0; i < 18; i++) cart.push([12 + (i % 6) * 1.3, 1.15, -0.1, 0.8, 0.5 + R() * 0.4, 0.8]);
    const cg = box(1, 1, 1);
    cg.translate(0, 0.5, 0);
    const P = new THREE.InstancedMesh(cg, M.wood, pal.length);
    const A = new THREE.InstancedMesh(cg, M.tan, cart.length), B = new THREE.InstancedMesh(cg, M.tan2, cart.length);
    const m4 = new THREE.Matrix4();
    pal.forEach(([x, y, z, w, h, d], i) => P.setMatrixAt(i, m4.makeScale(w, h, d).setPosition(x, y - 0.14, z)));
    let na = 0, nb2 = 0;
    for (const [x, y, z, w, h, d] of cart) {
      m4.makeScale(w, h, d).setPosition(x, y, z);
      if (R() < 0.6) A.setMatrixAt(na++, m4);
      else B.setMatrixAt(nb2++, m4);
    }
    A.count = na;
    B.count = nb2;
    for (const m of [P, A, B]) {
      m.castShadow = m.receiveShadow = true;
      scene.add(m);
    }
    const lifts = [0, 1, 2].map(() => {
      const f = forklift();
      scene.add(f);
      return f;
    });
    scene.add(people([[13, 0.25, 4.6], [18, 0.25, 4.7], [22, 0.25, 4.5], [25.5, 0.25, -6], [-11.5, 0.25, 3], [-4.5, 0.25, -12], [4, 0.25, 6.5]]));
    // outside: trucks at the back docks, the yard, trees
    [-24, -16, -8].forEach((x) => scene.add(place(truck(logo), x, 0, -30.4, Math.PI / 2)));
    scene.add(place(truck(logo), 18, 0, -34, 0.1));
    const tl = [];
    for (let x = -40; x <= 50; x += 7 + R() * 3) tl.push([x, 0, 24 + R() * 4]);
    for (let z = -40; z <= 20; z += 7 + R() * 2) tl.push([42 + R() * 4, 0, z]);
    for (let z = -40; z <= 20; z += 7 + R() * 2) tl.push([-44 - R() * 4, 0, z]);
    scene.add(trees(tl, R));
    const cam = track([
      [0.0, 44, 46, 54, -7, 0, -6, 30],
      [1.0, 36, 39, 45, -9, 1, -8, 30],
    ]);
    const aisles = [-18.5, -11.5, -4.5];
    const spotPos = { stock: V3(-8, 10, -8) };
    function update(u, dt, time) {
      lifts.forEach((f, i) => {
        const w = time * (0.2 + i * 0.05) + i * 2;
        f.position.set(aisles[i], 0.25, -6.5 + Math.sin(w) * 9);
        f.rotation.y = Math.cos(w) > 0 ? -Math.PI / 2 : Math.PI / 2;
      });
    }
    return { scene, sun, cam, update, spots: () => SPOTS.entrepot.map((s) => ({ id: s.id, ...toScreen(spotPos[s.id]) })) };
  }

  // ================================================================ 3 the countryside
  function buildCampagne() {
    const { scene, sun, ground } = studio(200, 330, 720, { sun: [-140, 95, 70] });
    ground.visible = false;
    const n1 = noise(5), n2 = noise(9);
    const hRaw = (x, z) => 48 * n1(x / 75 + 3, z / 75 + 7) + 10 * n2(x / 28, z / 28) - 26;
    // the road winds down the valley, top to bottom of the frame
    const ctrl = [[-30, -240], [30, -190], [-35, -140], [40, -95], [-40, -50], [35, -5], [-30, 40], [40, 85], [-25, 130], [30, 175], [-10, 240]].map(([x, z]) => V3(x, 0, z));
    const curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
    const NS = 700;
    const rp = [], rh = [];
    for (let i = 0; i <= NS; i++) {
      const p = curve.getPointAt(i / NS);
      rp.push(p);
      rh.push(hRaw(p.x, p.z));
    }
    const rs = rh.map((_, i) => {
      let s = 0, w = 0;
      for (let k = -16; k <= 16; k++) {
        s += rh[Math.min(NS, Math.max(0, i + k))];
        w++;
      }
      return s / w;
    });
    const nearRoad = (x, z) => {
      let best = 1e9, bi = 0;
      for (let i = 0; i <= NS; i += 3) {
        const d = (rp[i].x - x) ** 2 + (rp[i].z - z) ** 2;
        if (d < best) {
          best = d;
          bi = i;
        }
      }
      return [Math.sqrt(best), bi];
    };
    const height = (x, z) => {
      const h = hRaw(x, z);
      const [d, i] = nearRoad(x, z);
      return mix(rs[i] - 0.05, h, smooth((d - 6) / 12));
    };
    const tg = new THREE.PlaneGeometry(520, 520, 170, 170);
    tg.rotateX(-Math.PI / 2);
    const tp = tg.attributes.position;
    const cols = new Float32Array(tp.count * 3);
    const cA = col('#cdeec6'), cB = col('#a6dea2'), cC = col('#e9f5e2'), c = new THREE.Color();
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i), z = tp.getZ(i);
      const h = height(x, z);
      tp.setY(i, h);
      c.copy(cA).lerp(cB, clamp(n2(x / 34 + 11, z / 34) * 1.3 - 0.15)).lerp(cC, clamp((h - 8) / 16));
      cols[i * 3] = c.r;
      cols[i * 3 + 1] = c.g;
      cols[i * 3 + 2] = c.b;
    }
    tg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    tg.computeVertexNormals();
    const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    terrain.receiveShadow = true;
    scene.add(terrain);
    // the road: light asphalt, white edges, a dashed centre
    const pos = [], idx = [];
    const tan = new THREE.Vector3(), side = new THREE.Vector3();
    const strip = (half, lift, out) => {
      for (let i = 0; i <= NS; i++) {
        curve.getTangentAt(i / NS, tan);
        side.set(-tan.z, 0, tan.x).normalize();
        const p = rp[i], y = rs[i] + lift;
        out.push(p.x - side.x * half, y, p.z - side.z * half, p.x + side.x * half, y, p.z + side.z * half);
      }
    };
    strip(5.0, 0.18, pos);
    for (let i = 0; i < NS; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    const roadG = new THREE.BufferGeometry();
    roadG.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    roadG.setIndex(idx);
    roadG.computeVertexNormals();
    const road = new THREE.Mesh(roadG, M.yard);
    road.receiveShadow = true;
    scene.add(road);
    const marks = new THREE.InstancedMesh(box(3, 0.06, 0.32), M.line, Math.floor(NS / 5) * 3);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s1 = new THREE.Vector3(1, 1, 1);
    let mk = 0;
    for (let i = 0; i < NS; i += 5) {
      curve.getTangentAt(i / NS, tan);
      side.set(-tan.z, 0, tan.x).normalize();
      q.setFromUnitVectors(V3(1, 0, 0), V3(tan.x, 0, tan.z).normalize());
      for (const off of [-4.4, 0, 4.4]) {
        if (off === 0 && (i / 5) % 2) continue;
        marks.setMatrixAt(mk++, m4.compose(V3(rp[i].x + side.x * off, rs[i] + 0.22, rp[i].z + side.z * off), q, s1));
      }
    }
    marks.count = mk;
    scene.add(marks);
    // woods and single trees, away from the road; a village of white houses with red roofs
    const R = rng(21);
    const tl = [];
    for (let i = 0; i < 1600 && tl.length < 460; i++) {
      const x = (R() - 0.5) * 460, z = (R() - 0.5) * 460;
      const wood = n1(x / 45 + 20, z / 45 + 4);
      if (R() > wood * 1.5 - 0.35) continue;
      const [d] = nearRoad(x, z);
      if (d < 11) continue;
      tl.push([x, height(x, z), z, 1.8 + R() * 0.9]);
    }
    scene.add(trees(tl, R));
    const b = builder();
    for (const [x, z, ry] of [[68, 30, 0.3], [78, 46, 0.1], [62, 52, -0.2], [-80, -70, 0.5], [-66, -84, 0.2], [70, -120, -0.3]]) {
      const y = height(x, z);
      b.add(box(11, 5, 7), M.white, x, y + 2.5, z, ry);
      const roof = new THREE.CylinderGeometry(0.01, 5.6, 3.6, 4, 1);
      roof.rotateY(Math.PI / 4);
      b.add(roof, M.red, x, y + 6.8, z, ry, 0, 0, 1.55, 1, 0.98);
    }
    b.build(scene);
    const trucks = [0, 1, 2].map(() => {
      const t = truck(logo);
      t.scale.setScalar(1.25);
      scene.add(t);
      return t;
    });
    const cam = track([
      [0.0, 120, 175, 205, 6, 0, 6, 32],
      [1.0, 104, 155, 180, 4, 0, -4, 32],
    ]);
    const tPos = V3(0, 0, 0), spotPos = { distribution: V3() };
    function update(u, dt, time) {
      trucks.forEach((t, i) => {
        const dir = i === 1 ? -1 : 1;
        let s = (((time * 0.01 + i * 0.31) % 1) + 1) % 1;
        if (dir < 0) s = 1 - s;
        const k = Math.min(NS, Math.round(s * NS));
        curve.getTangentAt(Math.min(0.999, s), tan);
        tPos.set(rp[k].x, rs[k] + 0.2, rp[k].z);
        side.set(-tan.z, 0, tan.x).normalize().multiplyScalar(2.2 * dir);
        t.position.copy(tPos).add(side);
        t.rotation.y = Math.atan2(-tan.z * dir, tan.x * dir);
        if (i === 0) spotPos.distribution.copy(t.position).add(V3(0, 10, 0));
      });
    }
    return { scene, sun, cam, update, spots: () => SPOTS.campagne.map((s) => ({ id: s.id, ...toScreen(spotPos[s.id]) })) };
  }

  // ================================================================ 4 the port and the airport
  function buildPort() {
    const { scene, sun, ground } = studio(150, 260, 620);
    ground.visible = false;
    // the water: pale blue cells with white seams, drifting
    const waterTex = canvasTex(512, 512, (gg, w, h) => {
      const R = rng(31);
      const pts = Array.from({ length: 70 }, () => [R() * w, R() * h, R()]);
      const img = gg.createImageData(w, h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          let d1 = 1e9, d2 = 1e9, k = 0;
          for (let i = 0; i < pts.length; i++)
            for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
              const dx = pts[i][0] + ox - x, dy = pts[i][1] + oy - y;
              const d = dx * dx + dy * dy;
              if (d < d1) {
                d2 = d1;
                d1 = d;
                k = i;
              } else if (d < d2) d2 = d;
            }
          const edge = Math.sqrt(d2) - Math.sqrt(d1);
          const t = pts[k][2];
          let r = 150 + t * 40, g2 = 205 + t * 25, b2 = 240 + t * 12;
          const e = edge < 1.6 ? 1 : edge < 3 ? 0.45 : 0;
          r = mix(r, 250, e);
          g2 = mix(g2, 252, e);
          b2 = mix(b2, 255, e);
          const o = (y * w + x) * 4;
          img.data[o] = r;
          img.data[o + 1] = g2;
          img.data[o + 2] = Math.min(255, b2);
          img.data[o + 3] = 255;
        }
      gg.putImageData(img, 0, 0);
    }, { repeat: true });
    waterTex.repeat.set(10, 10);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ map: waterTex, roughness: 0.3 }));
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.6;
    water.receiveShadow = true;
    scene.add(water);
    const g = new THREE.Group();
    const b = builder();
    // the land behind the quay (z < -6), the quay edge, bollards
    b.add(box(900, 2.4, 420), M.ground, 0, -0.6, -216);
    b.add(box(900, 0.6, 1.4), M.grey, 0, 0.4, -6.5);
    for (let x = -140; x <= 140; x += 12) b.add(cyl(0.35, 0.45, 0.8, 8), M.dark, x, 1.0, -7.2);
    b.add(box(260, 0.05, 30), M.asphalt, -10, 0.62, -22);
    for (let i = 0; i < 26; i++) b.add(box(4, 0.06, 0.3), M.line, -130 + i * 10, 0.67, -22);
    b.add(box(4, 0.05, 160), M.asphalt, 70, 0.62, -110);
    // the ship: a red hull with a raised bow, a white castle at the stern
    const hull = new THREE.Shape();
    hull.moveTo(-62, -10);
    hull.lineTo(44, -10);
    hull.bezierCurveTo(56, -9, 64, -4, 68, 0);
    hull.bezierCurveTo(64, 4, 56, 9, 44, 10);
    hull.lineTo(-62, 10);
    hull.bezierCurveTo(-66, 6, -66, -6, -62, -10);
    const hg = new THREE.ExtrudeGeometry(hull, { depth: 10, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.4, bevelSegments: 2, curveSegments: 12 });
    hg.rotateX(-Math.PI / 2);
    b.add(hg, M.red, -4, -3.5, 16);
    b.add(box(118, 0.5, 19.6), M.white, -6, 6.75, 16);
    b.add(box(118, 0.9, 20.4), M.redDark, -6, 0.0, 16);
    b.block(12, 16, 17, M.white, -57, 7, 16);
    for (let k = 0; k < 4; k++) b.add(box(12.2, 0.9, 17.2), M.glass, -57, 9.5 + k * 3.2, 16);
    b.add(box(14, 0.6, 20), M.white, -57, 23.3, 16);
    b.add(box(3, 5, 4), M.red, -61, 26, 16);
    // the quay cranes: lattice legs, a portal, a boom over the ship
    for (const x of [-34, -6, 22]) {
      const zL = -24, zW = -9, top = 32;
      for (const dx of [-7, 7]) {
        truss(b, M.white, V3(x + dx - 0.9, 0.8, zL), V3(x + dx - 0.9, top, zL), V3(x + dx + 0.9, 0.8, zL), V3(x + dx + 0.9, top, zL), 7, 0.25, 0.7);
        truss(b, M.white, V3(x + dx - 0.9, 0.8, zW), V3(x + dx - 0.9, top, zW), V3(x + dx + 0.9, 0.8, zW), V3(x + dx + 0.9, top, zW), 7, 0.25, 0.7);
        b.add(box(1.0, 1.4, 16), M.white, x + dx, 13, (zL + zW) / 2);
      }
      for (const z of [zL, zW]) b.add(box(15.4, 1.6, 1.6), M.white, x, top, z);
      truss(b, M.white, V3(x - 1.4, top + 1.6, -52), V3(x - 1.4, top + 1.6, 46), V3(x - 1.4, top + 4.6, -52), V3(x - 1.4, top + 4.6, 46), 18, 0.22, 0.6);
      truss(b, M.white, V3(x + 1.4, top + 1.6, -52), V3(x + 1.4, top + 1.6, 46), V3(x + 1.4, top + 4.6, -52), V3(x + 1.4, top + 4.6, 46), 18, 0.22, 0.6);
      for (const zt of [-30, -10]) strut(b, M.white, V3(x, top + 12, zt), V3(x, top + 4.6, 38), 0.3);
      b.add(box(1.4, 12, 1.4), M.white, x, top + 6, -20);
      b.add(rbox(6, 4, 8, 0.3), M.white, x, top + 7, -36);
      b.add(rbox(3.4, 2.2, 3.8, 0.2), M.red, x, top + 0.6, 12 + (x % 4) * 3);
    }
    // the customs hall, its word on the ground; the terminal with its fins; the apron
    b.block(46, 9, 18, M.white, 54, 0.6, -52);
    b.add(box(46.4, 1.8, 0.4), M.red, 54, 8.0, -42.8);
    b.add(box(140, 0.05, 90), M.yard, 130, 0.63, -110);
    b.block(64, 12, 22, M.white, 140, 0.6, -170);
    for (let x = 110; x <= 170; x += 2.2) b.add(box(0.5, 11, 0.6), M.wood, x, 6.6, -158.8);
    b.add(box(64.4, 0.8, 22.4), M.grey, 140, 13, -170);
    for (const x of [112, 132, 152]) b.add(box(3, 3, 16), M.white, x, 4.6, -150);
    b.add(box(300, 0.07, 16), M.mid, 140, 0.64, -205);
    for (let i = 0; i < 30; i++) b.add(box(5, 0.08, 0.5), M.line, 0 + i * 10, 0.72, -205);
    b.build(g);
    scene.add(g);
    const word = new THREE.Mesh(new THREE.PlaneGeometry(26, 4), new THREE.MeshStandardMaterial({ map: wordTex('DOUANE', { color: '#e3241b' }), transparent: true, roughness: 0.8 }));
    word.rotation.x = -Math.PI / 2;
    word.rotation.z = 0.0;
    word.position.set(30, 0.7, -36);
    scene.add(word);
    // containers on the ship and in the yard; the company's red ones with its script
    const redLogo = logoTex(512, 128, { ribs: 30 });
    const cells = [];
    for (let bx = 0; bx < 14; bx++) for (let r = 0; r < 7; r++) cells.push([-50 + bx * 6.7, 16 - 7.8 + r * 2.6, 0, 2 + ((bx * 5 + r * 3) % 3)]);
    const shipStack = containerStacks(cells, rng(2), redLogo);
    shipStack.position.y = 7.0;
    scene.add(shipStack);
    const yard = [];
    for (let i = 0; i < 16; i++) for (let r = 0; r < 5; r++) yard.push([-100 + i * 6.7, -40 - r * 2.7, 0, 1 + ((i + r) % 3)]);
    for (let i = 0; i < 9; i++) for (let r = 0; r < 4; r++) yard.push([-30 + i * 6.7, -64 - r * 2.7, 0, 1 + ((i * 2 + r) % 3)]);
    const yardStack = containerStacks(yard, rng(3), redLogo);
    yardStack.position.y = 0.6;
    scene.add(yardStack);
    // planes: four at the stands, one taxiing
    const planes = [[112, -126, -Math.PI / 2], [132, -126, -Math.PI / 2], [152, -126, -Math.PI / 2], [95, -92, -2.4], [40, -205, 0]].map(([x, z, ry]) => {
      const p = plane();
      place(p, x, 0.6, z, ry);
      scene.add(p);
      return p;
    });
    const trucksP = [0, 1].map(() => {
      const t = truck(logo);
      scene.add(t);
      return t;
    });
    const R = rng(8);
    const tl = [];
    for (let x = 40; x <= 220; x += 8 + R() * 4) tl.push([x, 0.6, -36 - R() * 4]);
    for (let i = 0; i < 26; i++) tl.push([-140 + R() * 100, 0.6, -90 - R() * 60]);
    scene.add(trees(tl, R));
    scene.add(people([[20, 0.6, -38], [26, 0.6, -40], [48, 0.6, -40]]));
    const cam = track([
      [0.0, -96, 112, 150, 26, 0, -34, 30],
      [1.0, -80, 98, 132, 30, 0, -40, 30],
    ]);
    const spotPos = { mer: V3(-10, 20, 16), air: V3(132, 9, -126) };
    function update(u, dt, time) {
      waterTex.offset.set(time * 0.003, time * 0.001);
      const tp = planes[4];
      const k = (((time * 0.018) % 1) + 1) % 1;
      tp.position.set(-80 + k * 380, 0.6 + Math.max(0, k - 0.6) * 110, -205);
      tp.rotation.z = Math.max(0, Math.min(0.18, (k - 0.58) * 1.4));
      trucksP.forEach((t, i) => {
        const dir = i ? -1 : 1;
        const x = ((((time * 7 + i * 110) % 240) + 240) % 240) - 120;
        t.position.set(dir * x, 0.62, -22 + (i ? 2.4 : -2.4));
        t.rotation.y = dir > 0 ? 0 : Math.PI;
      });
    }
    return { scene, sun, cam, update, spots: () => SPOTS.port.map((s) => ({ id: s.id, ...toScreen(spotPos[s.id]) })) };
  }

  // ================================================================ 5 the rail terminal
  function buildRail() {
    const { scene, sun } = studio(120, 240, 560);
    const g = new THREE.Group();
    const b = builder();
    const tracksZ = [-15, -9, -3, 3, 9];
    for (const z of tracksZ) {
      b.add(box(520, 0.35, 4.2), M.ballast, 0, 0.17, z);
      for (const dz of [-0.72, 0.72]) b.add(box(520, 0.24, 0.18), M.rail, 0, 0.62, z + dz);
    }
    b.add(box(520, 0.05, 26), M.yard, 0, 0.03, 27);
    b.add(box(520, 0.05, 14), M.yard, 0, 0.03, -27);
    b.add(box(520, 0.06, 10), M.asphalt, 0, 0.04, 44);
    for (let i = 0; i < 52; i++) b.add(box(3.4, 0.06, 0.3), M.line, -255 + i * 10, 0.08, 44);
    // the gantry: a red rectangle on four A legs, on its own rails
    for (const x of [-6, 70]) {
      const top = 23, zA = -24, zB = 32;
      for (const z of [zA, zB]) {
        strut(b, M.red, V3(x - 9, 0.4, z), V3(x - 6.5, top, z), 1.2);
        strut(b, M.red, V3(x + 9, 0.4, z), V3(x + 6.5, top, z), 1.2);
        b.add(box(20, 1.0, 1.4), M.red, x, 0.9, z);
        b.add(box(4, 0.8, 2.2), M.redDark, x - 9, 0.4, z);
        b.add(box(4, 0.8, 2.2), M.redDark, x + 9, 0.4, z);
        b.add(box(15, 1.6, 2.0), M.red, x, top, z);
      }
      for (const dx of [-6.5, 6.5]) b.add(box(1.6, 2.4, zB - zA + 6), M.red, x + dx, top + 1.0, (zA + zB) / 2);
      b.add(rbox(3.4, 2.6, 3.2, 0.2), M.white, x - 6.5, top - 3, zB - 6);
    }
    for (const z of [-24, 32]) b.add(box(520, 0.22, 0.6), M.rail, 0, 0.11, z);
    b.build(g);
    scene.add(g);
    const sleepers = new THREE.InstancedMesh(box(0.32, 0.16, 2.8), M.sleeper, tracksZ.length * 420);
    const m4 = new THREE.Matrix4();
    let k = 0;
    for (const z of tracksZ) for (let i = 0; i < 420; i++) sleepers.setMatrixAt(k++, m4.makeTranslation(-252 + i * 1.2, 0.42, z));
    sleepers.receiveShadow = true;
    scene.add(sleepers);
    // trolleys with a container on the spreader
    const redLogo = logoTex(512, 128, { ribs: 30 });
    const trolleys = [-6, 70].map((x) => {
      const t = new THREE.Group();
      const tb = builder();
      tb.add(rbox(15, 1.8, 4.2, 0.15), M.red, 0, 0, 0);
      for (const dx of [-2.2, 2.2]) for (const dz of [-1.0, 1.0]) tb.add(box(0.08, 3.4, 0.08), M.dark, dx, -2.6, dz);
      tb.add(box(6.4, 0.45, 2.6), M.grey, 0, -4.4, 0);
      tb.build(t);
      const ctr = new THREE.Mesh(rbox(6.0, 2.55, 2.42, 0.05), texMat(redLogo));
      ctr.position.set(0, -5.9, 0);
      ctr.castShadow = true;
      t.add(ctr);
      t.position.set(x, 23.5, 0);
      scene.add(t);
      return { t, x };
    });
    // the trains: a red engine with the script, flat wagons with containers, a few hoppers
    const R = rng(14);
    function train(n) {
      const tg = new THREE.Group();
      const tb = builder();
      tb.add(rbox(19, 3.4, 3.0, 0.4, 3), M.red, 0, 3.2, 0);
      tb.add(rbox(3, 1.4, 2.9, 0.3), M.red, 8.6, 5.2, 0);
      tb.add(box(0.12, 1.0, 2.5), M.glass, 9.52, 4.2, 0);
      tb.add(box(19.4, 0.7, 2.9), M.dark, 0, 1.25, 0);
      for (const dx of [-6.5, 6.5]) tb.add(box(3, 0.8, 2.6), M.mid, dx, 0.75, 0);
      const cells = [];
      for (let i = 0; i < n; i++) {
        const x = -17 - i * 14.4;
        if (R() < 0.22) {
          tb.add(rbox(12.6, 3.2, 2.9, 0.3), M.grey, x, 3.0, 0);
          tb.add(box(13.4, 0.5, 2.8), M.dark, x, 1.35, 0);
        } else {
          tb.add(box(13.6, 0.5, 2.8), M.dark, x, 1.45, 0);
          const two = R() < 0.65;
          const f = R() < 0.45 ? 2 : undefined;
          if (two) cells.push([x - 3.2, 0, 0, 1, f], [x + 3.2, 0, 0, 1, f]);
          else cells.push([x, 0, 0, 1, f]);
        }
        for (const dx of [-5.3, 5.3]) tb.add(box(2.4, 0.8, 2.5), M.mid, x + dx, 0.85, 0);
      }
      tb.build(tg);
      const st = containerStacks(cells, R, redLogo);
      st.position.y = 1.7;
      tg.add(st);
      const side = texMat(redLogo);
      for (const sz of [-1, 1]) {
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2), side);
        pl.position.set(-1, 3.3, sz * 1.52);
        pl.rotation.y = sz > 0 ? 0 : Math.PI;
        tg.add(pl);
      }
      return tg;
    }
    const trains = [[-9, 1, 16], [3, -1, 14], [-3, 0, 12]].map(([z, dir, n]) => {
      const t = train(n);
      place(t, 0, 0.3, z, dir < 0 ? Math.PI : 0);
      scene.add(t);
      return { t, z, dir };
    });
    const st = [];
    for (let i = 0; i < 26; i++) for (let r = 0; r < 4; r++) if (R() < 0.9) st.push([-60 + i * 6.7, 20 + r * 2.7, 0, 1 + Math.floor(R() * 3)]);
    for (let i = 0; i < 30; i++) for (let r = 0; r < 2; r++) if (R() < 0.8) st.push([-90 + i * 6.7, -24 - r * 2.7, 0, 1 + Math.floor(R() * 2)]);
    scene.add(containerStacks(st, R, redLogo));
    const truckR = place(truck(logo), 2, 0, 14.5, 0);
    scene.add(truckR);
    const trucksR = [0, 1].map(() => {
      const t = truck(logo);
      scene.add(t);
      return t;
    });
    const tl = [];
    for (let x = -150; x <= 150; x += 8 + R() * 4) tl.push([x, 0, 54 + R() * 6]);
    for (let x = -150; x <= 150; x += 9 + R() * 4) tl.push([x, 0, -38 - R() * 8]);
    scene.add(trees(tl, R));
    const cam = track([
      [0.0, 72, 58, 96, -4, 3, 0, 30],
      [1.0, 60, 50, 82, -8, 3, -2, 30],
    ]);
    const spotPos = { rail: V3(-6, 27, -10) };
    function update(u, dt, time) {
      trains.forEach((tr, i) => {
        if (!tr.dir) {
          tr.t.position.x = 110;
          return;
        }
        const x = ((((time * 4.5 + i * 160) % 480) + 480) % 480) - 180;
        tr.t.position.x = tr.dir > 0 ? x : -x;
      });
      trolleys.forEach((tr, i) => {
        const s = time * 0.22 + i * 2;
        tr.t.position.z = 4 + Math.sin(s) * 20;
      });
      trucksR.forEach((t, i) => {
        const dir = i ? -1 : 1;
        const x = ((((time * 7 + i * 120) % 260) + 260) % 260) - 130;
        t.position.set(dir * x, 0, 44 + (i ? 2.4 : -2.4));
        t.rotation.y = dir > 0 ? 0 : Math.PI;
      });
    }
    return { scene, sun, cam, update, spots: () => SPOTS.rail.map((s) => ({ id: s.id, ...toScreen(spotPos[s.id]) })) };
  }

  const builders = [buildHub, buildEntrepot, buildCampagne, buildPort, buildRail];
  const sets = [];
  for (let i = 0; i < builders.length; i++) {
    sets.push(builders[i]());
    onProgress(0.15 + (0.75 * (i + 1)) / builders.length);
    await new Promise((r) => setTimeout(r, 0));
  }

  // ------------------------------------------------------------------ the composer: AO, tilt-shift, veil, output
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  const renderPass = new RenderPass(sets[0].scene, camera);
  const gtao = new GTAOPass(sets[0].scene, camera, W, H, undefined, { radius: 2.4, distanceExponent: 1.5, thickness: 3.0, scale: 1.25, samples: 10, distanceFallOff: 1, screenSpaceRadius: false }, { lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 8 });
  gtao.blendIntensity = 0.9;
  const tiltH = new ShaderPass(TiltShader);
  const tiltV = new ShaderPass(TiltShader);
  tiltV.uniforms.uDir.value.set(0, 1);
  tiltH.uniforms.uWhite.value = tiltV.uniforms.uWhite.value = new THREE.Color('#f3f2ef');
  const out = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(gtao);
  composer.addPass(tiltH);
  composer.addPass(tiltV);
  composer.addPass(out);
  onProgress(0.95);

  // ------------------------------------------------------------------ per frame
  let cur = 0, curP = 0, fadeK = 0;
  function setIndex(p) {
    for (let i = SETS.length - 1; i >= 0; i--) if (p >= SETS[i].range[0]) return i;
    return 0;
  }
  function placeCamera(si, u, pointer) {
    const v = sets[si].cam(u);
    camera.position.set(v[0] + pointer.x * 3, v[1] + pointer.y * 2, v[2]);
    camera.lookAt(v[3], v[4], v[5]);
    const aspect = W / H;
    camera.fov = aspect < 1.6 ? Math.min(70, (2 * Math.atan(Math.tan((v[6] * Math.PI) / 360) * (1.6 / aspect)) * 180) / Math.PI) : v[6];
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }
  function update(state, dt, time) {
    const p = clamp(state.p);
    curP = p;
    const si = Math.min(setIndex(p), sets.length - 1);
    cur = si;
    const u = within(p, SETS[si].range);
    placeCamera(si, u, state.pointer || { x: 0, y: 0 });
    sets[si].update(u, dt, time);
    renderPass.scene = gtao.scene = sets[si].scene;
    fadeK = 0;
    for (const f of FADES) fadeK = Math.max(fadeK, 1 - clamp(Math.abs(p - f.at) / f.w));
    const kb = smooth(fadeK);
    tiltH.uniforms.uAll.value = tiltV.uniforms.uAll.value = kb;
    tiltV.uniforms.uFade.value = smooth(clamp((fadeK - 0.35) / 0.65)) * 0.96;
  }
  function resize(w, h, d) {
    W = Math.max(1, w);
    H = Math.max(1, h);
    dpr = d || 1;
    composer.setPixelRatio(dpr);
    composer.setSize(W, H);
    for (const ps of [tiltH, tiltV]) {
      ps.uniforms.uRes.value.set(W * dpr, H * dpr);
      ps.uniforms.uMax.value = 4.5 * dpr;
    }
  }
  function render() {
    composer.render();
  }
  function applyQuality() {
    gtao.enabled = level !== 'low';
    const ms = level === 'low' ? 0 : level === 'medium' ? 2 : 4;
    for (const t of [composer.renderTarget1, composer.renderTarget2])
      if (t.samples !== ms) {
        t.samples = ms;
        t.dispose();
      }
    for (const s of sets) s.sun.shadow.radius = level === 'low' ? 2 : 5;
  }
  applyQuality();
  async function warmup() {
    const keep = curP;
    for (let i = 0; i < sets.length; i++) {
      const s = SETS[i].range;
      update({ p: (s[0] + s[1]) / 2, pointer: { x: 0, y: 0 } }, 0, 0);
      renderer.compile(sets[i].scene, camera);
      render();
      await new Promise((r) => setTimeout(r, 0));
    }
    update({ p: keep, pointer: { x: 0, y: 0 } }, 0, 0);
  }
  return {
    camera,
    update,
    render,
    resize,
    warmup,
    setQuality(lv) {
      level = lv;
      applyQuality();
    },
    stats() {
      const i = renderer.info;
      return { calls: i.render.calls, triangles: i.render.triangles, textures: i.memory.textures, geometries: i.memory.geometries, programs: i.programs ? i.programs.length : 0, set: SETS[cur].id, level };
    },
    anchors() {
      return { set: SETS[cur].id, fade: fadeK, spots: sets[cur].spots() };
    },
    info() {
      return { set: SETS[cur].id };
    },
  };
}
