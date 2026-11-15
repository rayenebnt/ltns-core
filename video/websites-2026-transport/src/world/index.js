// ORVAN world: five small dioramas in white clay with red for the company, one shown at a time, each
// with its own camera track over its share of p; a white fade hides every change. The hub (the hall,
// its docks, trucks backed in, trucks passing), the hall cut open (racks full of boxes, forklifts),
// the countryside (hills, a winding road, trucks on it), the port and the airport (a container ship,
// quay cranes, stacks, red planes), the rail terminal (red gantries, freight trains, stacks).
// Units: metres, Y up. Contract (main.js): createWorld({ renderer, quality, onProgress }) → { camera,
// update(state, dt, time), render(), resize(w, h, dpr), warmup(), setQuality(level), stats(),
// anchors(), info() }.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SETS, FADES, within } from '../story.js';
import { SPOTS } from '../texts.js';
import { M, box, rbox, cyl, builder, trees, people, truck, forklift, plane, containerStacks, logoTex, signTex, texMat, canvasTex, rng, clamp, mix, smooth, col } from './kit.js';

export const rendererOptions = { antialias: true };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const BG = '#ebeae6';

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
// a 2D value noise for the hills
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

export async function createWorld({ renderer, quality = 'high', onProgress = () => {} }) {
  let level = quality;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (document.fonts && document.fonts.load) {
    try {
      await Promise.all([document.fonts.load("800 120px 'Archivo'", 'ORVAN'), document.fonts.load("700 60px 'Archivo'", 'DOUANE')]);
    } catch (e) {
      /* the system's fonts then */
    }
  }
  const camera = new THREE.PerspectiveCamera(25, 16 / 10, 1, 1400);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const logo = logoTex();
  let W = 1280, H = 800;
  const proj = new THREE.Vector3();
  const toScreen = (v) => {
    proj.copy(v).project(camera);
    return { x: (proj.x * 0.5 + 0.5) * W, y: (0.5 - proj.y * 0.5) * H, vis: proj.z < 1 && Math.abs(proj.x) < 0.98 && Math.abs(proj.y) < 0.98 };
  };

  // every diorama: a pale studio, a sun from the left, soft shadows, haze at the edges
  function studio(extent, fogNear, fogFar) {
    const scene = new THREE.Scene();
    scene.background = col(BG);
    scene.fog = new THREE.Fog(col(BG), fogNear, fogFar);
    scene.environment = env;
    scene.environmentIntensity = 0.35;
    scene.add(new THREE.HemisphereLight(col('#ffffff'), col('#d6d2ca'), 1.15));
    const sun = new THREE.DirectionalLight(col('#fff6ea'), 2.3);
    sun.position.set(-70, 110, 45);
    sun.castShadow = true;
    sun.shadow.mapSize.set(level === 'low' ? 1024 : 2048, level === 'low' ? 1024 : 2048);
    sun.shadow.radius = 3;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    Object.assign(sun.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, near: 10, far: 400 });
    scene.add(sun, sun.target);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), M.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    return { scene, sun, ground };
  }

  // ================================================================ 1 the hub
  function hall(b, { open = false } = {}) {
    // the hall: x -25..25, z -16..10, 11 high
    if (!open) {
      b.block(50, 11, 26, M.wall, 0, 0, -3);
      b.add(box(50.6, 0.5, 26.6), M.grey, 0, 11.25, -3);
      for (const z of [-12, -7, -2, 3]) b.add(box(46, 0.7, 1.6), M.white, 0, 11.7, z);
      b.add(box(50.4, 2.2, 0.4), M.red, 0, 9.4, 10.2);
      for (let i = 0; i < 8; i++) {
        const x = -21 + i * 4;
        b.add(box(3.0, 3.4, 0.2), M.mid, x, 2.9, 10.12);
        b.add(box(3.5, 0.3, 0.4), M.red, x, 4.75, 10.2);
        b.add(box(0.25, 0.6, 0.5), M.dark, x - 1.45, 1.6, 10.3);
        b.add(box(0.25, 0.6, 0.5), M.dark, x + 1.45, 1.6, 10.3);
      }
      b.block(33, 1.2, 1.4, M.grey, -7, 0, 10.8);
    }
    // the office block at the front right
    b.block(16, 9, 10, M.white, 17, 0, 9.2);
    for (let k = 0; k < 3; k++) {
      b.add(box(15, 1.2, 0.1), M.glass, 17, 1.9 + k * 2.8, 14.25);
      b.add(box(0.1, 1.2, 9), M.glass, 25.05, 1.9 + k * 2.8, 9.2);
    }
    b.add(box(16.4, 0.5, 10.4), M.grey, 17, 9.25, 9.2);
    b.add(box(4, 0.3, 2.4), M.red, 13, 3.4, 15.4);
  }
  function buildHub() {
    const { scene, sun } = studio(100, 210, 440);
    const g = new THREE.Group();
    const b = builder();
    b.add(box(96, 0.06, 64), M.yard, 2, 0.03, 16);
    for (let i = 0; i < 9; i++) b.add(box(0.25, 0.07, 14), M.line, -21 + i * 4 - 2, 0.06, 26);
    b.add(box(160, 0.07, 9), M.grey, 0, 0.04, 52);
    for (let i = 0; i < 26; i++) b.add(box(3, 0.08, 0.3), M.line, -76 + i * 6, 0.08, 52);
    b.add(box(40, 0.05, 60), M.grass, -66, 0.03, 10);
    b.add(box(60, 0.05, 30), M.grass, 64, 0.03, -30);
    hall(b);
    // the gatehouse and its barrier
    b.block(3.2, 3, 3.2, M.white, 36, 0, 40);
    b.add(box(3.6, 0.3, 3.6), M.red, 36, 3.15, 40);
    b.add(box(7, 0.25, 0.25), M.red, 40.5, 1.2, 43);
    b.build(g);
    const band = new THREE.Mesh(new THREE.PlaneGeometry(18, 2.0), texMat(logo));
    band.position.set(-8, 9.4, 10.42);
    g.add(band);
    scene.add(g);
    // trucks backed into the docks, two on the road
    const docked = [-21, -13, -9, -1, 3].map((x, i) => {
      const t = truck(logo);
      t.rotation.y = -Math.PI / 2;
      t.position.set(x, 0, 19.3 + (i % 2) * 0.3);
      scene.add(t);
      return t;
    });
    const moving = [0, 1].map(() => {
      const t = truck(logo);
      scene.add(t);
      return t;
    });
    const parked = truck(logo);
    parked.rotation.y = 0.4;
    parked.position.set(-34, 0, 32);
    scene.add(parked);
    const R = rng(4);
    const tl = [];
    for (let x = -70; x <= 70; x += 7 + R() * 3) tl.push([x, 0, 60 + R() * 4]);
    for (let z = -30; z <= 44; z += 6 + R() * 3) tl.push([-46 - R() * 6, 0, z]);
    for (let i = 0; i < 18; i++) tl.push([-60 - R() * 30, 0, -20 + R() * 60]);
    for (let i = 0; i < 16; i++) tl.push([40 + R() * 40, 0, -40 + R() * 22]);
    for (let x = 30; x <= 60; x += 6) tl.push([x, 0, 30 + R() * 3, 0.8]);
    scene.add(trees(tl, R));
    scene.add(people([[-15, 1.2, 11.3], [-5, 1.2, 11.4], [7, 0, 16], [11, 0, 22], [-30, 0, 30], [34, 0, 44]]));
    const cam = track([
      [0.0, -122, 88, 128, -12, 0, 2, 25],
      [1.0, -108, 78, 112, -12, 0, 0, 25],
    ]);
    const spotPos = { route: V3(-9, 7.5, 13) };
    function update(u, dt, time) {
      moving.forEach((t, i) => {
        const dir = i ? -1 : 1;
        const x = ((((time * 7 + i * 80) % 200) + 200) % 200) - 100;
        t.position.set(dir * x, 0, 52 + (i ? 2.2 : -2.2));
        t.rotation.y = dir > 0 ? 0 : Math.PI;
      });
    }
    return { scene, sun, cam, update, spots: () => SPOTS.hub.map((s) => ({ id: s.id, ...toScreen(spotPos[s.id]) })) };
  }

  // ================================================================ 2 the hall, cut open
  function buildEntrepot() {
    const { scene, sun } = studio(75, 150, 330);
    const g = new THREE.Group();
    const b = builder();
    b.add(box(96, 0.06, 64), M.yard, 2, 0.03, 10);
    b.block(50, 0.3, 26, M.white, 0, 0, -3);
    // the walls left standing: the back and the left, a stub at the front
    b.block(50, 11, 0.5, M.wall, 0, 0, -16.2);
    b.block(0.5, 11, 26, M.wall, -25.2, 0, -3);
    b.add(box(50.4, 2.2, 0.6), M.red, 0, 9.6, -16.1);
    b.add(box(0.6, 2.2, 26.4), M.red, -25.2, 9.6, -3);
    b.block(50, 1.0, 0.5, M.wall, 0, 0, 10.2);
    b.block(0.5, 1.0, 26, M.wall, 25.2, 0, -3);
    for (let x = -24; x <= 24; x += 8) b.block(0.6, 11, 0.6, M.grey, x, 0, -15.9);
    // aisle markings
    for (const z of [-10.75, -6.25, -1.75, 2.75]) b.add(box(36, 0.02, 0.15), M.yellow, -4, 0.32, z);
    // the racks: five rows, twelve bays, four levels
    const rows = [-13, -8.5, -4, 0.5, 5];
    const x0 = -21, bay = 2.8, nb = 12, lv = [0.35, 2.3, 4.25, 6.2];
    for (const z of rows) {
      for (let i = 0; i <= nb; i++) for (const dz of [-0.55, 0.55]) b.block(0.14, 8.2, 0.14, M.wood, x0 + i * bay, 0.3, z + dz);
      for (const y of lv) for (const dz of [-0.55, 0.55]) b.add(box(nb * bay, 0.16, 0.1), M.redDark, x0 + (nb * bay) / 2, y + 0.3, z + dz);
    }
    // the packing area at the front right: pallets of boxes, a conveyor
    b.block(10, 1.0, 1.2, M.grey, 14, 0.3, 4);
    b.block(1.2, 1.0, 8, M.grey, 19, 0.3, -1);
    hall(b, { open: true });
    b.build(g);
    scene.add(g);
    // the boxes on the racks (instanced, two or three a bay)
    const R = rng(12);
    const cells = [];
    for (const z of rows) for (let i = 0; i < nb; i++) for (const y of lv) {
      let x = x0 + i * bay + 0.25;
      while (x < x0 + (i + 1) * bay - 0.6) {
        const w = 0.7 + R() * 0.55;
        if (R() < 0.88) cells.push([x + w / 2, y + 0.46, z, w, 0.75 + R() * 0.75, 0.9 + R() * 0.25]);
        x += w + 0.1;
      }
    }
    for (let i = 0; i < 22; i++) cells.push([10 + R() * 8, 0.3, 6 + R() * 7, 1, 1 + R() * 0.6, 1]);
    const cg = rbox(1, 1, 1, 0.04);
    cg.translate(0, 0.5, 0);
    const boxesA = new THREE.InstancedMesh(cg, M.tan, cells.length), boxesB = new THREE.InstancedMesh(cg, M.tan2, cells.length);
    let na = 0, nb2 = 0;
    const m4 = new THREE.Matrix4();
    for (const [x, y, z, w, h, d] of cells) {
      m4.makeScale(w, h, d).setPosition(x, y, z);
      if (R() < 0.62) boxesA.setMatrixAt(na++, m4);
      else boxesB.setMatrixAt(nb2++, m4);
    }
    boxesA.count = na;
    boxesB.count = nb2;
    for (const m of [boxesA, boxesB]) {
      m.castShadow = m.receiveShadow = true;
      scene.add(m);
    }
    const lifts = [0, 1, 2].map(() => {
      const f = forklift();
      scene.add(f);
      return f;
    });
    scene.add(people([[12, 0.3, 7], [15, 0.3, 2], [-10, 0.3, -6.3], [4, 0.3, -10.7], [20, 0.3, 8]]));
    const tl = [];
    for (let x = -40; x <= 50; x += 7 + R() * 3) tl.push([x, 0, 26 + R() * 4]);
    for (let z = -26; z <= 22; z += 7 + R() * 2) tl.push([34 + R() * 4, 0, z]);
    scene.add(trees(tl, R));
    // the trucks waiting behind the hall
    for (const [x, z, ry] of [[-14, -28, 0], [2, -28, 0], [18, -30, 0.1]]) {
      const t = truck(logo);
      t.position.set(x, 0, z);
      t.rotation.y = ry;
      scene.add(t);
    }
    const cam = track([
      [0.0, -64, 58, 78, 0, 0, -1, 26],
      [1.0, -55, 50, 67, -1, 1, -2, 26],
    ]);
    const aisles = [-10.75, -6.25, 2.75];
    const spotPos = { stock: V3(-6, 8.6, -4) };
    function update(u, dt, time) {
      lifts.forEach((f, i) => {
        const s = Math.sin(time * (0.22 + i * 0.05) + i * 2);
        f.position.set(-6 + s * 13, 0.3, aisles[i]);
        f.rotation.y = Math.cos(time * (0.22 + i * 0.05) + i * 2) > 0 ? 0 : Math.PI;
      });
    }
    return { scene, sun, cam, update, spots: () => SPOTS.entrepot.map((s) => ({ id: s.id, ...toScreen(spotPos[s.id]) })) };
  }

  // ================================================================ 3 the countryside
  function buildCampagne() {
    const { scene, sun, ground } = studio(170, 380, 760);
    ground.visible = false;
    const n1 = noise(5), n2 = noise(9);
    const hRaw = (x, z) => 26 * n1(x / 60 + 3, z / 60 + 7) + 7 * n2(x / 24, z / 24) - 13;
    // the road: an S across the hills
    const ctrl = [[-190, 40], [-120, 70], [-70, 20], [-40, 60], [0, 20], [10, -30], [55, -10], [80, -60], [130, -40], [200, -80]].map(([x, z]) => V3(x, 0, z));
    const curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
    const NS = 600;
    const rp = [], rh = [];
    for (let i = 0; i <= NS; i++) {
      const p = curve.getPointAt(i / NS);
      rp.push(p);
      rh.push(hRaw(p.x, p.z));
    }
    // the road's own height: the hills, smoothed along it
    const rs = rh.map((_, i) => {
      let s = 0, w = 0;
      for (let k = -14; k <= 14; k++) {
        const j = Math.min(NS, Math.max(0, i + k));
        s += rh[j];
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
      return mix(rs[i], h, smooth((d - 5) / 9));
    };
    const tg = new THREE.PlaneGeometry(420, 420, 150, 150);
    tg.rotateX(-Math.PI / 2);
    const tp = tg.attributes.position;
    const cols = new Float32Array(tp.count * 3);
    const cA = col('#cdebc2'), cB = col('#a9dca3'), cC = col('#e3f1d6'), c = new THREE.Color();
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i), z = tp.getZ(i);
      const h = height(x, z);
      tp.setY(i, h);
      c.copy(cA).lerp(cB, clamp(n2(x / 30 + 11, z / 30) * 1.2 - 0.1)).lerp(cC, clamp((h - 6) / 10));
      cols[i * 3] = c.r;
      cols[i * 3 + 1] = c.g;
      cols[i * 3 + 2] = c.b;
    }
    tg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    tg.computeVertexNormals();
    const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
    terrain.receiveShadow = true;
    scene.add(terrain);
    // the road ribbon and its centre dashes
    const pos = [], idx = [];
    const tan = new THREE.Vector3(), side = new THREE.Vector3();
    for (let i = 0; i <= NS; i++) {
      curve.getTangentAt(i / NS, tan);
      side.set(-tan.z, 0, tan.x).normalize();
      const p = rp[i], y = rs[i] + 0.15;
      pos.push(p.x - side.x * 4.6, y, p.z - side.z * 4.6, p.x + side.x * 4.6, y, p.z + side.z * 4.6);
      if (i < NS) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const roadG = new THREE.BufferGeometry();
    roadG.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    roadG.setIndex(idx);
    roadG.computeVertexNormals();
    const road = new THREE.Mesh(roadG, M.line);
    road.receiveShadow = true;
    scene.add(road);
    const dashes = new THREE.InstancedMesh(box(3, 0.06, 0.35), M.grey, Math.floor(NS / 6));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s1 = new THREE.Vector3(1, 1, 1);
    for (let k = 0; k < dashes.count; k++) {
      const i = k * 6;
      curve.getTangentAt(i / NS, tan);
      q.setFromUnitVectors(V3(1, 0, 0), V3(tan.x, 0, tan.z).normalize());
      dashes.setMatrixAt(k, m4.compose(V3(rp[i].x, rs[i] + 0.2, rp[i].z), q, s1));
    }
    scene.add(dashes);
    // woods and single trees, away from the road
    const R = rng(21);
    const tl = [];
    for (let i = 0; i < 900 && tl.length < 340; i++) {
      const x = (R() - 0.5) * 360, z = (R() - 0.5) * 360;
      const wood = n1(x / 40 + 20, z / 40 + 4);
      if (R() > wood * 1.3 - 0.2) continue;
      const [d] = nearRoad(x, z);
      if (d < 10) continue;
      tl.push([x, height(x, z), z, 1.2 + R() * 0.6]);
    }
    scene.add(trees(tl, R));
    // two farms by the road
    const b = builder();
    for (const [x, z, ry] of [[-30, 82, 0.3], [62, 18, -0.4]]) {
      const y = height(x, z);
      b.add(box(14, 5, 8), M.white, x, y + 2.5, z, ry);
      const roof = new THREE.CylinderGeometry(0.01, 6.2, 4, 4, 1);
      roof.rotateY(Math.PI / 4);
      b.add(roof, M.red, x, y + 7, z, ry, 0, 0, 1.6, 1, 0.95);
    }
    b.build(scene);
    const trucks = [0, 1, 2].map(() => {
      const t = truck(logo);
      t.scale.setScalar(1.15);
      scene.add(t);
      return t;
    });
    const cam = track([
      [0.0, -170, 190, 230, -5, 0, 5, 26],
      [1.0, -150, 168, 202, 0, 0, 0, 26],
    ]);
    const tPos = V3(0, 0, 0), spotPos = { distribution: V3() };
    function update(u, dt, time) {
      trucks.forEach((t, i) => {
        const dir = i === 1 ? -1 : 1;
        let s = ((time * 0.012 + i * 0.33) % 1 + 1) % 1;
        if (dir < 0) s = 1 - s;
        const k = Math.min(NS, Math.round(s * NS));
        curve.getTangentAt(Math.min(0.999, s), tan);
        tPos.set(rp[k].x, rs[k] + 0.15, rp[k].z);
        side.set(-tan.z, 0, tan.x).normalize().multiplyScalar(1.8 * dir);
        t.position.copy(tPos).add(side);
        t.rotation.y = Math.atan2(-tan.z * dir, tan.x * dir);
        if (i === 0) spotPos.distribution.copy(t.position).add(V3(0, 9, 0));
      });
    }
    return { scene, sun, cam, update, spots: () => SPOTS.campagne.map((s) => ({ id: s.id, ...toScreen(spotPos[s.id]) })) };
  }

  // ================================================================ 4 the port and the airport
  function buildPort() {
    const { scene, sun, ground } = studio(165, 360, 760);
    ground.visible = false;
    // the water: pale blue, white streaks drifting
    const waterTex = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#8ccdf4';
      g.fillRect(0, 0, w, h);
      const R = rng(31);
      for (let i = 0; i < 160; i++) {
        g.strokeStyle = `rgba(255,255,255,${0.25 + R() * 0.45})`;
        g.lineWidth = 2 + R() * 5;
        const x = R() * w, y = R() * h, l = 30 + R() * 90;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + l / 2, y - 4 + R() * 8, x + l, y);
        g.stroke();
      }
    });
    waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping;
    waterTex.repeat.set(8, 8);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ map: waterTex, roughness: 0.35 }));
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.4;
    water.receiveShadow = true;
    scene.add(water);
    const g = new THREE.Group();
    const b = builder();
    // the land: the quay and the airport behind, the water in front (z > -8)
    b.add(box(600, 2.0, 300), M.ground, 0, -0.4, -158);
    b.add(box(220, 0.06, 26), M.yard, -40, 0.62, -22);
    b.add(box(600, 0.4, 1.0), M.grey, 0, 0.8, -8.3);
    // the quay cranes: white portals, booms over the ship
    for (const x of [-46, -16, 14]) {
      for (const [dx, dz] of [[-6, -20], [6, -20], [-6, -9], [6, -9]]) b.add(box(1.2, 30, 1.2), M.white, x + dx, 15.6, dz);
      for (const dz of [-20, -9]) b.add(box(13.5, 1.4, 1.4), M.white, x, 30, dz);
      b.add(box(2.4, 2.2, 66), M.white, x, 33, -4);
      b.add(box(6, 4, 8), M.white, x, 36, -26);
      b.add(box(2.6, 1.6, 3), M.red, x, 31.5, 6 + (x % 3));
      for (const dz of [-30, -14]) b.add(box(0.4, 0.4, 16), M.grey, x, 38, dz + 8, 0, 0.5);
    }
    // the ship: a red hull, a white bridge, rows of containers
    const hull = new THREE.Shape();
    hull.moveTo(-50, -9);
    hull.lineTo(36, -9);
    hull.quadraticCurveTo(52, -6, 58, 0);
    hull.quadraticCurveTo(52, 6, 36, 9);
    hull.lineTo(-50, 9);
    hull.quadraticCurveTo(-55, 0, -50, -9);
    const hg = new THREE.ExtrudeGeometry(hull, { depth: 9, bevelEnabled: false, curveSegments: 10 });
    hg.rotateX(-Math.PI / 2);
    b.add(hg, M.red, -14, -3, 14);
    b.add(box(104, 0.4, 17.4), M.white, -18, 6.1, 14);
    b.add(box(10, 15, 15), M.white, -56, 13.5, 14);
    b.add(box(10.2, 1.2, 15.2), M.glass, -56, 18.5, 14);
    b.add(box(4, 5, 4), M.red, -60, 23.5, 14);
    // the customs hall and the airport terminal
    b.block(44, 9, 18, M.white, 64, 0.6, -46);
    b.add(box(44.4, 1.6, 0.3), M.red, 64, 8.2, -36.9);
    b.block(60, 12, 22, M.white, 128, 0.6, -110);
    b.add(box(56, 1.2, 0.1), M.glass, 128, 6, -98.9);
    b.add(box(80, 0.06, 70), M.yard, 120, 0.63, -70);
    b.add(box(260, 0.07, 14), M.mid, 140, 0.64, -150);
    for (let i = 0; i < 30; i++) b.add(box(5, 0.08, 0.5), M.line, 20 + i * 9, 0.7, -150);
    b.build(g);
    scene.add(g);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.4), texMat(signTex('DOUANE')));
    sign.position.set(64, 8.2, -36.7);
    scene.add(sign);
    // containers on the ship and in the yard
    const cells = [];
    for (let bx = 0; bx < 12; bx++) for (let r = 0; r < 6; r++) {
      const x = -44 + bx * 6.6, z = 14 - 7.5 + r * 2.6;
      cells.push([x, z, 0, 2 + ((bx * 7 + r * 3) % 3)]);
    }
    const shipStack = containerStacks(cells, rng(2));
    shipStack.position.y = 6.3;
    scene.add(shipStack);
    const yard = [];
    for (let i = 0; i < 14; i++) for (let r = 0; r < 5; r++) yard.push([-90 + i * 6.6, -36 - r * 2.7, 0, 1 + ((i + r) % 3)]);
    for (let i = 0; i < 8; i++) for (let r = 0; r < 4; r++) yard.push([-10 + i * 6.6, -58 - r * 2.7, 0, 1 + ((i * 2 + r) % 3)]);
    const yardStack = containerStacks(yard, rng(3));
    yardStack.position.y = 0.6;
    scene.add(yardStack);
    // planes: two parked, one taxiing
    const planes = [[96, -72, 2.6], [124, -66, 2.4], [150, -150, 0]].map(([x, z, ry]) => {
      const p = plane();
      p.position.set(x, 0.6, z);
      p.rotation.y = ry;
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
    for (let x = 40; x <= 200; x += 8 + R() * 4) tl.push([x, 0.6, -20 - R() * 6]);
    for (let i = 0; i < 20; i++) tl.push([-120 + R() * 90, 0.6, -80 - R() * 50]);
    scene.add(trees(tl, R));
    const cam = track([
      [0.0, -190, 150, 225, 10, 0, -20, 25],
      [1.0, -165, 130, 195, 14, 0, -22, 25],
    ]);
    const spotPos = { mer: V3(-30, 20, 14), air: V3(124, 9, -66) };
    function update(u, dt, time) {
      waterTex.offset.set(time * 0.004, time * 0.0015);
      const tp = planes[2];
      const k = ((time * 0.02) % 1 + 1) % 1;
      tp.position.set(-40 + k * 320, 0.6 + Math.max(0, k - 0.62) * 90, -150);
      tp.rotation.z = Math.max(0, Math.min(0.2, (k - 0.6) * 1.5));
      trucksP.forEach((t, i) => {
        const dir = i ? -1 : 1;
        const x = ((((time * 8 + i * 110) % 240) + 240) % 240) - 120;
        t.position.set(dir * x, 0.62, -22 + (i ? 2.2 : -2.2));
        t.rotation.y = dir > 0 ? 0 : Math.PI;
      });
    }
    return { scene, sun, cam, update, spots: () => SPOTS.port.map((s) => ({ id: s.id, ...toScreen(spotPos[s.id]) })) };
  }

  // ================================================================ 5 the rail terminal
  function buildRail() {
    const { scene, sun } = studio(150, 320, 680);
    const g = new THREE.Group();
    const b = builder();
    const tracksZ = [-18, -12, -6, 0, 6, 12];
    for (const z of tracksZ) {
      b.add(box(420, 0.12, 3.4), M.gravel, 0, 0.06, z);
      for (const dz of [-0.72, 0.72]) b.add(box(420, 0.22, 0.16), M.rail, 0, 0.3, z + dz);
    }
    b.add(box(420, 0.06, 18), M.yard, 0, 0.04, 26);
    b.add(box(420, 0.06, 14), M.yard, 0, 0.04, -30);
    b.add(box(420, 0.07, 9), M.grey, 0, 0.05, 40);
    for (let i = 0; i < 46; i++) b.add(box(3, 0.08, 0.3), M.line, -200 + i * 9, 0.09, 40);
    // the red gantries: legs in A on the outer lanes, two girders, a trolley
    for (const x of [-34, 30]) {
      for (const z of [-32, 30]) {
        for (const dx of [-5, 5]) b.add(box(1.0, 24, 1.0), M.red, x + dx * 0.7, 12, z, 0, 0, dx > 0 ? -0.18 : 0.18);
        b.add(box(12, 1.0, 1.2), M.red, x, 0.5, z);
      }
      for (const dx of [-1.6, 1.6]) b.add(box(1.4, 2.0, 70), M.red, x + dx, 24, -1);
      for (const z of [-32, 30]) b.add(box(5, 2.0, 1.6), M.red, x, 24, z);
    }
    b.build(g);
    scene.add(g);
    const sleepers = new THREE.InstancedMesh(box(0.3, 0.14, 2.6), M.mid, tracksZ.length * 340);
    const m4 = new THREE.Matrix4();
    let k = 0;
    for (const z of tracksZ) for (let i = 0; i < 340; i++) sleepers.setMatrixAt(k++, m4.makeTranslation(-204 + i * 1.2, 0.18, z));
    sleepers.receiveShadow = true;
    scene.add(sleepers);
    // trolleys with a container on the spreader
    const trolleys = [-34, 30].map((x) => {
      const t = new THREE.Group();
      const tb = builder();
      tb.add(box(5, 1.6, 4), M.red, 0, 0, 0);
      for (const dx of [-1.6, 1.6]) for (const dz of [-1.2, 1.2]) tb.add(box(0.08, 1, 0.08), M.dark, dx * 0.9, -0.5, dz);
      tb.add(box(6.2, 0.4, 2.6), M.grey, 0, -1, 0);
      tb.add(rbox(6.0, 2.55, 2.42, 0.06), M.white, 0, -2.6, 0);
      tb.build(t);
      t.position.set(x, 22.5, 0);
      scene.add(t);
      return { t, x, cables: t.children };
    });
    // the trains: a red engine, wagons with containers
    function train(n, R) {
      const tg = new THREE.Group();
      const tb = builder();
      tb.add(rbox(18, 3.6, 3.0, 0.3), M.red, 0, 2.6, 0);
      tb.add(box(0.1, 1.1, 2.4), M.glass, 9.02, 3.4, 0);
      tb.add(box(18.4, 0.6, 2.8), M.dark, 0, 0.9, 0);
      const cells = [];
      for (let i = 0; i < n; i++) {
        const x = -16 - i * 14.2;
        tb.add(box(13.6, 0.5, 2.8), M.dark, x, 1.15, 0);
        for (const dx of [-5.2, 5.2]) tb.add(box(1.8, 0.7, 2.4), M.mid, x + dx, 0.55, 0);
        const two = R() < 0.6;
        if (two) cells.push([x - 3.2, 0, 0, 1], [x + 3.2, 0, 0, 1]);
        else if (R() < 0.85) cells.push([x, 0, 0, 1]);
      }
      tb.build(tg);
      const st = containerStacks(cells, R);
      st.position.y = 1.4;
      st.children.forEach((m) => m.castShadow = true);
      tg.add(st);
      return tg;
    }
    const R = rng(14);
    const trains = [[-6, 1, 14], [6, -1, 12], [0, 0, 10]].map(([z, dir, n]) => {
      const t = train(n, R);
      t.position.z = z;
      t.rotation.y = dir < 0 ? Math.PI : 0;
      scene.add(t);
      return { t, z, dir };
    });
    const st = [];
    for (let i = 0; i < 30; i++) for (let r = 0; r < 3; r++) if (R() < 0.85) st.push([-100 + i * 6.6, 22 + r * 2.7, 0, 1 + Math.floor(R() * 3)]);
    for (let i = 0; i < 30; i++) for (let r = 0; r < 2; r++) if (R() < 0.8) st.push([-100 + i * 6.6, -27 - r * 2.7, 0, 1 + Math.floor(R() * 2)]);
    scene.add(containerStacks(st, R));
    const trucksR = [0, 1].map(() => {
      const t = truck(logo);
      scene.add(t);
      return t;
    });
    const tl = [];
    for (let x = -120; x <= 120; x += 8 + R() * 4) tl.push([x, 0, 50 + R() * 6]);
    for (let x = -120; x <= 120; x += 9 + R() * 4) tl.push([x, 0, -42 - R() * 8]);
    scene.add(trees(tl, R));
    const cam = track([
      [0.0, -160, 115, 190, 0, 0, -2, 25],
      [1.0, -140, 100, 165, 4, 0, -4, 25],
    ]);
    const spotPos = { rail: V3(-34, 27, -1) };
    function update(u, dt, time) {
      trains.forEach((tr, i) => {
        if (!tr.dir) {
          tr.t.position.x = 60;
          return;
        }
        const x = ((((time * 5 + i * 150) % 420) + 420) % 420) - 160;
        tr.t.position.x = tr.dir > 0 ? x : -x;
      });
      trolleys.forEach((tr, i) => {
        const s = time * 0.25 + i * 2;
        tr.t.position.z = Math.sin(s) * 22;
        tr.t.position.y = 22.5 + Math.cos(s * 2) * 0.0;
      });
      trucksR.forEach((t, i) => {
        const dir = i ? -1 : 1;
        const x = ((((time * 8 + i * 120) % 260) + 260) % 260) - 130;
        t.position.set(dir * x, 0, 40 + (i ? 2.2 : -2.2));
        t.rotation.y = dir > 0 ? 0 : Math.PI;
      });
    }
    return { scene, sun, cam, update, spots: () => SPOTS.rail.map((s) => ({ id: s.id, ...toScreen(spotPos[s.id]) })) };
  }

  const builders = [buildHub, buildEntrepot, buildCampagne, buildPort, buildRail];
  const sets = [];
  for (let i = 0; i < builders.length; i++) {
    sets.push(builders[i]());
    onProgress(0.15 + (0.8 * (i + 1)) / builders.length);
    await new Promise((r) => setTimeout(r, 0));
  }

  // the white fade over the change of diorama
  const fadeScene = new THREE.Scene();
  const fadeMat = new THREE.MeshBasicMaterial({ color: col('#f4f3f0'), transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false });
  const fade = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fadeMat);
  fade.frustumCulled = false;
  fadeScene.add(fade);
  const fadeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // ------------------------------------------------------------------ per frame
  let cur = 0, curP = 0, fadeK = 0;
  function setIndex(p) {
    for (let i = SETS.length - 1; i >= 0; i--) if (p >= SETS[i].range[0]) return i;
    return 0;
  }
  function placeCamera(si, u, pointer) {
    const v = sets[si].cam(u);
    camera.position.set(v[0] + pointer.x * 2.5, v[1] + pointer.y * 1.5, v[2]);
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
    fadeK = 0;
    for (const f of FADES) fadeK = Math.max(fadeK, 1 - clamp(Math.abs(p - f.at) / f.w));
    fadeK = smooth(fadeK);
    fadeMat.opacity = fadeK;
  }
  function resize(w, h) {
    W = Math.max(1, w);
    H = Math.max(1, h);
  }
  function render() {
    renderer.autoClear = true;
    renderer.render(sets[cur].scene, camera);
    if (fadeK > 0.002) {
      renderer.autoClear = false;
      renderer.render(fadeScene, fadeCam);
      renderer.autoClear = true;
    }
  }
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
