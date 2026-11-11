// Cheap stand-in for the 3D world (WORLD=stub node build.mjs). Same API as src/world/index.js:
//   createWorld({ renderer, quality, onProgress }) -> world
//   world.camera, update(state, dt, time), render(), resize(w, h, pr), warmup(), anchors(),
//   info(), stats(), setQuality(level)
// Simple geometry on the contract positions (metres, +Y up): lawn, a box maison de maître near
// (-4, 0, -38), the new fence A(9,0,-26) -> B(9,0,18) -> C(-24,0,18) built by install and
// restyled by style, the old fence along x = -24 repaired by repair, the contract cameras.
import * as THREE from 'three';

export const rendererOptions = { antialias: true };

const A = new THREE.Vector3(9, 0, -26), B = new THREE.Vector3(9, 0, 18), C = new THREE.Vector3(-24, 0, 18);
const GZ = -8.4; // hinge side of the old fence's gate (z), as in src/world/fences/repair.js
const LEGS = [
  { from: B, to: A, len: 44 },
  { from: B, to: C, len: 33 },
];
const VIEWS = {
  hero: [[5.0, 1.6, 10.5], [-3, 2.4, -34]],
  push: [[6.4, 1.5, 6.0], [7.0, 1.0, -24]],
  finale: [[15, 4.5, 31], [-2, 0.5, -8]],
  styles: [[6.2, 1.35, 14.5], [8.6, 1.05, -24]],
  repair: [[-17.5, 1.5, -1.0], [-24, 1.0, -2.0]],
  gate: [[-20.6, 1.4, GZ + 1.2], [-24, 1.0, GZ + 0.6]], // the gate as in the real world (fences/repair.js GZ)
};
// fence types: 0 bois plein, 1 PVC blanc, 2 panneaux rigides, 3 ranch, 4 ganivelle
const TYPES = [
  { h: 1.8, board: 0xc0814a, post: 0xa86d3c, w: 0.13, gap: 0, rails: 2 },
  { h: 1.8, board: 0xf1f0ea, post: 0xf6f5f0, w: 0.15, gap: 0, rails: 2 },
  { h: 1.73, board: 0x33363b, post: 0x2c2f33, w: 0.012, gap: 0.1, rails: 0 },
  { h: 1.3, board: 0x1d1d1f, post: 0x1d1d1f, w: 0, gap: 0, rails: 3 },
  { h: 1.2, board: 0x8f6c49, post: 0x7a5a3b, w: 0.045, gap: 0.05, rails: 0 },
];
const QUALITY = {
  max: { grass: 7000, shadow: 2048 },
  high: { grass: 4500, shadow: 2048 },
  medium: { grass: 2400, shadow: 1024 },
  low: { grass: 900, shadow: 1024 },
};
const ANCHORS = {
  branche: [-24.3, 2.05, -5.4],
  poteau: [-23.75, 1.1, -4.0],
  penture: [-24.0, 1.55, GZ + 0.06],
  portillon: [-23.7, 0.12, GZ + 0.95],
  pentures: [-24.0, 1.52, GZ + 0.08],
  cable: [-24.0, 0.95, GZ + 0.62],
  garde: [-24.0, 0.04, GZ + 0.6],
};
const PRESETS = {
  ete: { sunDir: [-0.5, 0.62, 0.6], sun: [1.0, 0.93, 0.8], sunI: 2.7, sky: 0xbad3ee, gnd: 0x58683a, hemiI: 0.95, top: 0x3f86d6, hor: 0xd6e6f1, fog: 0xcfdde6, grass: 1.0 },
  orage: { sunDir: [-0.2, 0.8, 0.3], sun: [0.8, 0.84, 0.9], sunI: 0.45, sky: 0x9aa3ad, gnd: 0x485040, hemiI: 1.35, top: 0x5f6a76, hor: 0xa7aeb4, fog: 0xa3aab0, grass: 0.72 },
  eclaircie: { sunDir: [0.55, 0.55, 0.35], sun: [1.0, 0.9, 0.76], sunI: 2.2, sky: 0xaec6df, gnd: 0x55633c, hemiI: 1.05, top: 0x5c8fcc, hor: 0xdbe2e6, fog: 0xc2ccd2, grass: 0.92 },
};

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stripeTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  for (let i = 0; i < 4; i++) {
    g.fillStyle = i % 2 ? '#6f9b3c' : '#5f8a33';
    g.fillRect(i * 64, 0, 64, 256);
  }
  const r = rng(7);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(${30 + r() * 60},${70 + r() * 70},${20 + r() * 30},${0.25 + r() * 0.3})`;
    g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 2 + r() * 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(60, 60);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export async function createWorld({ renderer, quality = 'high', onProgress = () => {} }) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 16 / 10, 0.1, 700);
  scene.fog = new THREE.Fog(0xcfdde6, 60, 420);
  let size = { w: 1440, h: 900 };
  let level = QUALITY[quality] ? quality : 'high';
  const yieldFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

  // ------------------------------------------------------------ sky
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunC: { value: new THREE.Color(1, 0.95, 0.85) } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }',
    fragmentShader:
      'uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uSun; uniform vec3 uSunC; varying vec3 vDir;' +
      'void main(){ float h = clamp(vDir.y, 0.0, 1.0); vec3 c = mix(uHor, uTop, pow(h, 0.55));' +
      ' float s = max(dot(normalize(vDir), normalize(uSun)), 0.0); c += uSunC * (pow(s, 40.0) * 0.5 + pow(s, 6.0) * 0.12);' +
      ' gl_FragColor = vec4(c, 1.0); }',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), skyMat);
  sky.frustumCulled = false;
  scene.add(sky);

  // ------------------------------------------------------------ lights
  const hemi = new THREE.HemisphereLight(0xbad3ee, 0x58683a, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(QUALITY[level].shadow, QUALITY[level].shadow);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const sc = sun.shadow.camera;
  sc.near = 1;
  sc.far = 160;

  // ------------------------------------------------------------ ground and garden
  const lawnTex = stripeTexture();
  const lawnMat = new THREE.MeshLambertMaterial({ map: lawnTex, color: 0xffffff });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), lawnMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const gravel = new THREE.Mesh(new THREE.PlaneGeometry(22, 3.2), new THREE.MeshLambertMaterial({ color: 0xc9bc9f }));
  gravel.rotation.x = -Math.PI / 2;
  gravel.position.set(-4, 0.01, -31.8);
  gravel.receiveShadow = true;
  scene.add(gravel);
  onProgress(0.15);
  await yieldFrame();

  // maison de maître: tuffeau body, slate hipped roof, dormers, chimneys, shutters, perron
  const house = new THREE.Group();
  house.position.set(-4, 0, -38);
  const tuffeau = new THREE.MeshLambertMaterial({ color: 0xdcd0b6 });
  const slate = new THREE.MeshLambertMaterial({ color: 0x3b4149 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(15, 8.6, 10), tuffeau);
  body.position.y = 4.3;
  const roofShape = new THREE.Shape([new THREE.Vector2(-5.4, 0), new THREE.Vector2(5.4, 0), new THREE.Vector2(2.2, 4.2), new THREE.Vector2(-2.2, 4.2)]);
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 15.6, bevelEnabled: false });
  roofGeo.translate(0, 0, -7.8);
  roofGeo.rotateY(Math.PI / 2);
  const roof = new THREE.Mesh(roofGeo, slate);
  roof.position.y = 8.6;
  const chim1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.4, 0.9), tuffeau);
  chim1.position.set(-4.6, 12.6, -1.2);
  const chim2 = chim1.clone();
  chim2.position.x = 4.6;
  house.add(body, roof, chim1, chim2);
  const winGeo = new THREE.BoxGeometry(1.15, 1.9, 0.12);
  const winMat = new THREE.MeshLambertMaterial({ color: 0xf2f0ea });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x2b333b });
  const shutterMat = new THREE.MeshLambertMaterial({ color: 0x6f8597 });
  const wins = new THREE.InstancedMesh(winGeo, winMat, 10);
  const glass = new THREE.InstancedMesh(new THREE.BoxGeometry(0.92, 1.66, 0.12), glassMat, 10);
  const shut = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 1.9, 0.1), shutterMat, 20);
  const m4 = new THREE.Matrix4();
  let wi = 0;
  for (const yy of [2.2, 6.0]) for (const xx of [-5.6, -2.8, 0, 2.8, 5.6]) {
    if (yy < 3 && xx === 0) {
      m4.makeTranslation(xx, 1.5, 5.04);
      wins.setMatrixAt(wi, m4.clone().scale(new THREE.Vector3(1.2, 1.5, 1)));
      glass.setMatrixAt(wi, new THREE.Matrix4().makeTranslation(xx, 1.5, 5.08).scale(new THREE.Vector3(1.2, 1.5, 1)));
    } else {
      wins.setMatrixAt(wi, m4.makeTranslation(xx, yy, 5.04).clone());
      glass.setMatrixAt(wi, new THREE.Matrix4().makeTranslation(xx, yy, 5.08));
    }
    shut.setMatrixAt(wi * 2, new THREE.Matrix4().makeTranslation(xx - 0.9, yy, 5.06));
    shut.setMatrixAt(wi * 2 + 1, new THREE.Matrix4().makeTranslation(xx + 0.9, yy, 5.06));
    wi++;
  }
  house.add(wins, glass, shut);
  const dorm = new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, 1.5, 1.4), tuffeau, 3);
  [-3.6, 0, 3.6].forEach((x, i) => dorm.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, 10.0, 4.0)));
  house.add(dorm);
  for (let i = 0; i < 3; i++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(3.6 - i * 0.5, 0.18, 0.5), new THREE.MeshLambertMaterial({ color: 0xcfc4ab }));
    st.position.set(0, 0.09 + i * 0.18, 5.6 - i * 0.4);
    house.add(st);
  }
  house.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  scene.add(house);

  // charmille hedge with a gap, between the lawn and the forecourt
  const hedgeMat = new THREE.MeshLambertMaterial({ color: 0x3f6a2e });
  for (const [x0, x1] of [[-22, -6.5], [-1.5, 8]]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 1.5, 1.1), hedgeMat);
    h.position.set((x0 + x1) / 2, 0.75, -29.6);
    h.castShadow = h.receiveShadow = true;
    scene.add(h);
  }

  // trees: instanced trunks and canopies (the big lime tree near (-28.5, 0, -6))
  const R = rng(42);
  const treeSpots = [[-28.5, -6, 6.5, 15]];
  for (let i = 0; i < 14; i++) treeSpots.push([-34 + R() * 6, -40 + i * 5.2 + R() * 2, 3 + R() * 2.5, 9 + R() * 6]);
  for (let i = 0; i < 10; i++) treeSpots.push([16 + R() * 8, -40 + i * 6.5 + R() * 2, 3 + R() * 2.5, 9 + R() * 6]);
  for (let i = 0; i < 16; i++) treeSpots.push([-40 + i * 6 + R() * 2, -50 - R() * 8, 3.5 + R() * 3, 11 + R() * 7]);
  for (let i = 0; i < 26; i++) treeSpots.push([-140 + i * 11 + R() * 4, -120 - R() * 40, 4 + R() * 3, 9 + R() * 5]);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.4, 1, 7), new THREE.MeshLambertMaterial({ color: 0x5a4a3a }), treeSpots.length);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), treeSpots.length * 2);
  const col = new THREE.Color();
  treeSpots.forEach(([x, z, r, h], i) => {
    trunks.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, h * 0.3, z), new THREE.Quaternion(), new THREE.Vector3(r * 0.22, h * 0.6, r * 0.22)));
    for (let k = 0; k < 2; k++) {
      const s = r * (k ? 0.75 : 1);
      crowns.setMatrixAt(i * 2 + k, new THREE.Matrix4().compose(new THREE.Vector3(x + (k ? r * 0.45 : 0), h * (k ? 0.82 : 0.68), z + (k ? -r * 0.3 : 0)), new THREE.Quaternion(), new THREE.Vector3(s, s * 0.85, s)));
      col.setHSL(0.24 + R() * 0.06, 0.45 + R() * 0.15, 0.22 + R() * 0.1);
      crowns.setColorAt(i * 2 + k, col);
    }
  });
  trunks.castShadow = crowns.castShadow = true;
  crowns.receiveShadow = true;
  scene.add(trunks, crowns);
  onProgress(0.35);
  await yieldFrame();

  // grass tufts near the camera (the quality level changes their count)
  const tuftGeo = new THREE.ConeGeometry(0.05, 0.22, 3, 1, true);
  const tufts = new THREE.InstancedMesh(tuftGeo, new THREE.MeshLambertMaterial({ color: 0x55822f }), QUALITY.max.grass);
  {
    const r = rng(9);
    for (let i = 0; i < QUALITY.max.grass; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 22;
      tufts.setMatrixAt(i, new THREE.Matrix4().makeTranslation(Math.cos(a) * d, 0.1, Math.sin(a) * d));
    }
  }
  tufts.count = QUALITY[level].grass;
  tufts.frustumCulled = false;
  scene.add(tufts);

  // ------------------------------------------------------------ the new fence (A -> B -> C)
  const bays = [];
  for (let leg = 0; leg < 2; leg++) {
    const { from, to, len } = LEGS[leg];
    const n = Math.round(len / 2);
    for (let i = 0; i < n; i++) bays.push({ leg, d0: (i * len) / n, d1: ((i + 1) * len) / n });
  }
  const postsD = [{ leg: 0, d: 0 }];
  for (const b of bays) postsD.push({ leg: b.leg, d: b.d1 });
  const BOARDS_PER_BAY = 16;
  const unit = new THREE.BoxGeometry(1, 1, 1);
  unit.translate(0, 0.5, 0); // base at y = 0
  const woodMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const posts = new THREE.InstancedMesh(unit, woodMat, postsD.length);
  const collars = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.24, 0.06, 10), new THREE.MeshLambertMaterial({ color: 0xbdbab2 }), postsD.length);
  const rails = new THREE.InstancedMesh(unit, woodMat, bays.length * 3);
  const boards = new THREE.InstancedMesh(unit, woodMat, bays.length * BOARDS_PER_BAY);
  const caps = new THREE.InstancedMesh(unit, woodMat, bays.length);
  for (const m of [posts, collars, rails, boards, caps]) {
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }
  scene.add(posts, collars, rails, boards, caps);
  const legDir = LEGS.map(({ from, to }) => to.clone().sub(from).normalize());
  const pointAt = (leg, d, out) => out.copy(LEGS[leg].from).addScaledVector(legDir[leg], d);

  // survey flags, the string line and the flagged stake of chapter 1
  const flags = new THREE.InstancedMesh(new THREE.ConeGeometry(0.09, 0.16, 3), new THREE.MeshLambertMaterial({ color: 0xffffff }), 12);
  {
    const r = rng(3), fc = [0xd9302a, 0xf07a1e, 0xf2c623];
    for (let i = 0; i < 12; i++) flags.setColorAt(i, col.set(fc[i % 3]));
    flags.userData.spots = Array.from({ length: 12 }, () => [4.0 + r() * 4.4, 4 - r() * 30]);
  }
  const stringLine = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 44), new THREE.MeshBasicMaterial({ color: 0xe8c860 }));
  stringLine.position.set(8.7, 0.35, -4);
  const stake = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.9, 0.07), new THREE.MeshLambertMaterial({ color: 0xa47b4c }));
  stake.position.set(8.7, 0.45, 9.0);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.45, 0.12), new THREE.MeshLambertMaterial({ color: 0xff4fa6 }));
  tape.position.set(8.66, 0.6, 9.0);
  scene.add(flags, stringLine, stake, tape);

  // ------------------------------------------------------------ the old fence (x = -24)
  const OLD = { x: -24, z0: -26, z1: 18 };
  const oldMat = new THREE.MeshLambertMaterial({ color: 0x8e8a83 });
  const newBoardMat = new THREE.MeshLambertMaterial({ color: 0xd8c49d });
  const oldBays = [];
  for (let z = OLD.z0; z < OLD.z1 - 0.01; z += 2) oldBays.push([z, Math.min(OLD.z1, z + 2)]);
  const oldBoards = new THREE.InstancedMesh(unit, oldMat, oldBays.length * 14);
  const newBoards = new THREE.InstancedMesh(unit, newBoardMat, 28);
  const oldPosts = new THREE.InstancedMesh(unit, oldMat, oldBays.length + 1);
  for (const m of [oldBoards, newBoards, oldPosts]) {
    m.castShadow = m.receiveShadow = true;
    m.frustumCulled = false;
  }
  const broken = (z) => z > -6 && z < -2;
  const inGate = (z) => z > GZ - 0.05 && z < GZ + 1.25;
  {
    let k = 0;
    const m = new THREE.Matrix4();
    oldBays.forEach(([z0], bi) => {
      for (let j = 0; j < 14; j++) {
        const z = z0 + 0.08 + j * 0.135;
        if (inGate(z)) continue;
        const h = 1.8 - (j % 2) * 0.02;
        oldBoards.setMatrixAt(k++, m.compose(new THREE.Vector3(OLD.x + (j % 2 ? 0.02 : -0.02), 0, z), new THREE.Quaternion(), new THREE.Vector3(0.02, h, 0.12)).clone());
      }
    });
    oldBoards.count = k;
    oldBoards.userData.list = [];
  }
  scene.add(oldBoards, newBoards, oldPosts);
  // the gate, the branch, the debris
  const gate = new THREE.Group();
  gate.position.set(OLD.x, 0, GZ);
  const gboards = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.75, 1.2), oldMat);
  gboards.position.set(0, 0.95, 0.6);
  const zbar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 1.25), oldMat);
  const zbar2 = zbar.clone();
  zbar.position.set(0.05, 0.4, 0.6);
  zbar2.position.set(0.05, 1.5, 0.6);
  const zdiag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 1.5), oldMat);
  zdiag.position.set(0.05, 0.95, 0.6);
  zdiag.rotation.x = Math.atan2(1.1, 1.2);
  const black = new THREE.MeshLambertMaterial({ color: 0x151515 });
  const hinges = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.06, 0.5), black, 2);
  hinges.setMatrixAt(0, new THREE.Matrix4().makeTranslation(0.08, 0.4, 0.22));
  hinges.setMatrixAt(1, new THREE.Matrix4().makeTranslation(0.08, 1.5, 0.22));
  const cable = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 1.62), black);
  cable.position.set(0.09, 0.95, 0.6);
  cable.rotation.x = -Math.atan2(1.1, 1.2);
  const latch = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.14), black);
  latch.position.set(0.08, 1.0, 1.12);
  gate.add(gboards, zbar, zbar2, zdiag, hinges, cable, latch);
  gate.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
  scene.add(gate);
  const branch = new THREE.Group();
  const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 6, 7), new THREE.MeshLambertMaterial({ color: 0x5b4b3b }));
  limb.rotation.set(0.15, 0, 1.15);
  limb.position.set(-1.6, 2.4, 0);
  branch.add(limb);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3d6328 });
  [[0.2, 1.7, -0.6, 1.0], [-0.5, 2.3, 0.6, 1.2], [0.9, 1.4, 0.5, 0.8], [-1.4, 2.9, -0.2, 1.1]].forEach(([x, y, z, s]) => {
    const l = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), leafMat);
    l.position.set(x, y, z);
    branch.add(l);
  });
  branch.position.set(OLD.x, 0, -5.4);
  branch.traverse((o) => o.isMesh && (o.castShadow = true));
  scene.add(branch);
  const debris = new THREE.InstancedMesh(unit, oldMat, 6);
  {
    const r = rng(5);
    for (let i = 0; i < 6; i++) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, r() * 3, 0));
      debris.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(-22.6 - r() * 0.8, 0.02, -5.4 + r() * 3), q, new THREE.Vector3(0.12, 1.2 + r() * 0.5, 0.02)));
    }
  }
  scene.add(debris);
  onProgress(0.7);
  await yieldFrame();

  // ------------------------------------------------------------ per-frame state
  const mat = new THREE.Matrix4(), q = new THREE.Quaternion(), qy = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const typeCol = TYPES.map((t) => [new THREE.Color(t.board), new THREE.Color(t.post)]);
  const eye = new THREE.Vector3(), look = new THREE.Vector3(), tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  const presetNow = { sunDir: new THREE.Vector3(), sun: new THREE.Color(), sky: new THREE.Color(), gnd: new THREE.Color(), top: new THREE.Color(), hor: new THREE.Color(), fog: new THREE.Color() };
  let lastKey = '';
  let current = { seg: 'install', install: 0, style: { from: 0, to: 0, k: 1 }, drift: 0, repair: 0, pointer: { x: 0, y: 0 } };
  let timeNow = 0;

  function lerpView(a, b, k, outE, outT) {
    outE.fromArray(VIEWS[a][0]).lerp(tmpA.fromArray(VIEWS[b][0]), k);
    outT.fromArray(VIEWS[a][1]).lerp(tmpB.fromArray(VIEWS[b][1]), k);
  }

  function setPreset(a, b, k) {
    const P = PRESETS[a], Q = PRESETS[b];
    presetNow.sunDir.fromArray(P.sunDir).lerp(tmpA.fromArray(Q.sunDir), k).normalize();
    sun.color.setRGB(mix(P.sun[0], Q.sun[0], k), mix(P.sun[1], Q.sun[1], k), mix(P.sun[2], Q.sun[2], k));
    sun.intensity = mix(P.sunI, Q.sunI, k);
    hemi.color.set(P.sky).lerp(col.set(Q.sky), k);
    hemi.groundColor.set(P.gnd).lerp(col.set(Q.gnd), k);
    hemi.intensity = mix(P.hemiI, Q.hemiI, k);
    skyMat.uniforms.uTop.value.set(P.top).lerp(col.set(Q.top), k);
    skyMat.uniforms.uHor.value.set(P.hor).lerp(col.set(Q.hor), k);
    skyMat.uniforms.uSun.value.copy(presetNow.sunDir);
    skyMat.uniforms.uSunC.value.copy(sun.color).multiplyScalar(sun.intensity / 2.7);
    scene.fog.color.set(P.fog).lerp(col.set(Q.fog), k);
    lawnMat.color.setScalar(mix(P.grass, Q.grass, k));
  }

  function fitShadow(cx, cz, r) {
    sun.target.position.set(cx, 0, cz);
    sun.position.copy(sun.target.position).addScaledVector(presetNow.sunDir, 80);
    sc.left = -r;
    sc.right = r;
    sc.top = r;
    sc.bottom = -r;
    sc.updateProjectionMatrix();
  }

  // the new fence for a build progress (install) and a style state (sweep along d, near first)
  const normal = [new THREE.Vector3(), new THREE.Vector3()];
  legDir.forEach((d, i) => normal[i].set(-d.z, 0, d.x));
  function layoutFence(build, style) {
    const key = `${build.toFixed(4)}|${style.from}|${style.to}|${style.k.toFixed(4)}`;
    if (key === lastKey) return;
    lastKey = key;
    const typeAt = (d) => (style.from === style.to ? style.to : d <= style.k * 44 ? style.to : style.from);
    // posts rise near to far over 0.10 - 0.36, each in its concrete collar
    postsD.forEach(({ leg, d }, i) => {
      const ty = typeAt(d), t = TYPES[ty];
      const k = smooth(0.1 + 0.22 * (d / 44), 0.14 + 0.22 * (d / 44), build);
      pointAt(leg, d, p);
      const w = ty === 3 ? 0.13 : ty === 4 ? 0.09 : 0.1;
      posts.setMatrixAt(i, mat.compose(p, q.identity(), s.set(w, Math.max(1e-3, (t.h + 0.06) * k), w)));
      posts.setColorAt(i, typeCol[ty][1]);
      const kc = k > 0.01 ? 1 : 1e-3;
      collars.setMatrixAt(i, mat.compose(p.setY(0.03), q, s.set(kc, 1, kc)));
    });
    let ri = 0, bi = 0;
    bays.forEach((b, i) => {
      const span = b.d1 - b.d0, dm = (b.d0 + b.d1) / 2;
      const ty = typeAt(dm), t = TYPES[ty];
      qy.setFromUnitVectors(tmpA.set(1, 0, 0), legDir[b.leg]);
      // rails 0.36 - 0.55 (they run out from the post)
      const kr = smooth(0.36 + 0.16 * (dm / 44), 0.39 + 0.16 * (dm / 44), build);
      const railH = ty === 3 ? [0.3, 0.7, 1.1] : ty === 0 || ty === 1 ? [0.25, t.h - 0.3] : [];
      for (let r = 0; r < 3; r++) {
        const on = r < railH.length && kr > 0.001;
        pointAt(b.leg, b.d0 + (span * kr) / 2, p);
        p.y = on ? railH[r] : 0;
        if (ty !== 3) p.addScaledVector(normal[b.leg], 0.06);
        rails.setMatrixAt(ri, mat.compose(p, qy, s.set(on ? span * kr : 1e-3, ty === 3 ? 0.14 : 0.08, 0.05)));
        rails.setColorAt(ri, typeCol[ty][ty === 3 ? 0 : 1]);
        ri++;
      }
      // boards 0.55 - 0.80 (grow from the ground)
      const kb = smooth(0.55 + 0.22 * (dm / 44), 0.585 + 0.22 * (dm / 44), build);
      for (let j = 0; j < BOARDS_PER_BAY; j++) {
        pointAt(b.leg, b.d0 + ((j + 0.5) / BOARDS_PER_BAY) * span, p);
        let w = 0, hh = 0;
        if (ty === 0 || ty === 1) {
          w = (span / BOARDS_PER_BAY) * 1.08;
          hh = t.h - (ty === 0 ? 0.06 : 0);
          p.y = 0.02;
        } else if (ty === 2) {
          w = 0.012;
          hh = t.h - 0.08;
          p.y = 0.06;
        } else if (ty === 4) {
          w = 0.045;
          hh = t.h * (0.97 + 0.03 * ((j * 7) % 3));
          p.y = 0.02;
        }
        if (ty === 0) p.addScaledVector(normal[b.leg], j % 2 ? 0.02 : -0.02);
        const on = w > 0 && kb > 0.001;
        boards.setMatrixAt(bi, mat.compose(p, qy, s.set(on ? w : 1e-3, on ? hh * kb : 1e-3, 0.02)));
        boards.setColorAt(bi, typeCol[ty][0]);
        bi++;
      }
      // cap rail (bois plein only), 0.80 - 0.86
      const kc = ty === 0 ? smooth(0.8 + 0.05 * (dm / 44), 0.815 + 0.05 * (dm / 44), build) : 0;
      pointAt(b.leg, b.d0 + (span * kc) / 2, p);
      p.y = t.h - 0.02;
      caps.setMatrixAt(i, mat.compose(p, qy, s.set(kc > 0.001 ? span * kc : 1e-3, kc > 0.001 ? 0.05 : 1e-3, 0.13)));
      caps.setColorAt(i, typeCol[0][1]);
    });
    for (const m of [posts, collars, rails, boards, caps]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    // chapter 1 props: removed 0.80 - 0.95
    const kp = 1 - smooth(0.8, 0.95, build);
    const fs = flags.userData.spots;
    for (let i = 0; i < 12; i++) {
      const [x, z] = fs[i];
      flags.setMatrixAt(i, mat.compose(p.set(x, 0.42, z), q.identity(), s.setScalar(Math.max(1e-3, kp))));
    }
    flags.instanceMatrix.needsUpdate = true;
    stringLine.visible = stake.visible = tape.visible = kp > 0.01;
  }

  function layoutRepair(r) {
    // the leaning post is straightened 0.28 - 0.36; broken boards out and new boards in 0.30 - 0.50
    const kPost = smooth(0.28, 0.36, r);
    oldBays.forEach(([z0], i) => {
      pointAt(0, 0, p);
      p.set(OLD.x, 0, z0);
      q.identity();
      if (Math.abs(z0 + 4) < 0.01) q.setFromEuler(new THREE.Euler(0, 0, -0.24 * (1 - kPost)));
      oldPosts.setMatrixAt(i, mat.compose(p, q, s.set(0.11, 1.86, 0.11)));
    });
    oldPosts.setMatrixAt(oldBays.length, mat.compose(p.set(OLD.x, 0, OLD.z1), q.identity(), s.set(0.11, 1.86, 0.11)));
    oldPosts.instanceMatrix.needsUpdate = true;
    // old boards of the broken section: tilted and falling, then taken out
    const out = smooth(0.3, 0.38, r);
    let k = 0;
    const tmpM = new THREE.Matrix4();
    oldBays.forEach(([z0]) => {
      for (let j = 0; j < 14; j++) {
        const z = z0 + 0.08 + j * 0.135;
        if (inGate(z)) continue;
        const h = 1.8 - (j % 2) * 0.02;
        if (broken(z)) {
          const tilt = (j % 3) * 0.35 + 0.2;
          const sh = j % 2 ? h * 0.55 : h;
          oldBoards.setMatrixAt(k++, tmpM.compose(p.set(OLD.x + 0.25 * tilt, 0, z), q.setFromEuler(new THREE.Euler(0, 0, -tilt)), s.set(0.02, out > 0.999 ? 1e-3 : sh, 0.12)).clone());
        } else oldBoards.setMatrixAt(k++, tmpM.compose(p.set(OLD.x + (j % 2 ? 0.02 : -0.02), 0, z), q.identity(), s.set(0.02, h, 0.12)).clone());
      }
    });
    oldBoards.instanceMatrix.needsUpdate = true;
    for (let j = 0; j < 28; j++) {
      const z = -6 + 0.07 + j * 0.142;
      const kn = smooth(0.36 + j * 0.005, 0.38 + j * 0.005, r);
      newBoards.setMatrixAt(j, mat.compose(p.set(OLD.x + (j % 2 ? 0.02 : -0.02), 0, z), q.identity(), s.set(0.02, Math.max(1e-3, 1.8 * kn), 0.12)));
    }
    newBoards.instanceMatrix.needsUpdate = true;
    debris.visible = out < 0.999;
    // the branch is lifted away 0.20 - 0.28
    const kb = smooth(0.2, 0.28, r);
    branch.visible = kb < 0.999;
    branch.position.y = kb * 4;
    branch.scale.setScalar(1 - kb * 0.6);
    // the gate: sagging and dragging, lifted level 0.70 - 0.78; hinges, cable, latch after
    const kl = smooth(0.7, 0.78, r);
    gate.rotation.set(0.075 * (1 - kl), -0.22 * (1 - kl), 0);
    gate.position.y = -0.04 * (1 - kl);
    hinges.visible = r >= 0.76;
    hinges.scale.setScalar(Math.max(1e-3, smooth(0.76, 0.84, r)));
    cable.visible = r >= 0.82;
    cable.scale.set(1, 1, Math.max(1e-3, smooth(0.82, 0.9, r)));
    latch.visible = r >= 0.9;
  }

  function placeCamera(st) {
    const ptr = st.pointer || { x: 0, y: 0 };
    if (st.seg === 'styles') {
      lerpView('styles', 'styles', 0, eye, look);
      const k = 1 - smooth(0, 1, st.drift);
      eye.add(tmpA.set(-0.3 * k, 0.3 * k, 2.6 * k));
    } else if (st.seg === 'repair') {
      const r = st.repair;
      lerpView('repair', 'gate', smooth(0.5, 0.7, r), eye, look);
      eye.x += 0.5 * smooth(0, 0.5, r) * (r < 0.5 ? 1 : 1 - smooth(0.5, 0.7, r));
    } else {
      const p = st.install;
      if (p < 0.8) lerpView('hero', 'push', smooth(0.06, 0.8, p), eye, look);
      else {
        lerpView('push', 'finale', smooth(0.8, 1, p), eye, look);
        eye.y += Math.sin(Math.PI * smooth(0.8, 1, p)) * 1.2;
      }
    }
    camera.position.copy(eye);
    camera.position.x += 0.16 * ptr.x;
    camera.position.y += 0.08 * ptr.y;
    camera.lookAt(look);
    const aspect = size.w / size.h;
    const fov = 42;
    camera.fov = aspect < 1.6 ? (2 * Math.atan(Math.tan((fov * Math.PI) / 360) * (1.6 / aspect)) * 180) / Math.PI : fov;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  const world = {
    camera,
    update(state, dt, time) {
      current = state;
      timeNow = time;
      const seg = state.seg;
      if (seg === 'hidden') return;
      if (seg === 'repair') {
        const k = smooth(0.7, 1, state.repair);
        setPreset('orage', 'eclaircie', k);
        layoutFence(1, { from: 0, to: 0, k: 1 });
        layoutRepair(state.repair);
        fitShadow(-22, -2, 18);
      } else {
        setPreset('ete', 'ete', 0);
        if (seg === 'styles') layoutFence(1, state.style);
        else layoutFence(state.install, { from: 0, to: 0, k: 1 });
        layoutRepair(0);
        fitShadow(-2, -6, 42);
      }
      placeCamera(state);
      // grass tufts follow the camera
      tufts.position.set(camera.position.x, 0, camera.position.z - 8);
      flags.visible = seg === 'install';
      for (const m of [stringLine, stake, tape]) m.visible = m.visible && seg === 'install';
    },
    render() {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    },
    resize(w, h, pr) {
      size = { w: Math.max(1, w), h: Math.max(1, h) };
      renderer.setPixelRatio(pr);
      renderer.setSize(size.w, size.h, false);
      camera.aspect = size.w / size.h;
      camera.updateProjectionMatrix();
    },
    async warmup() {
      const stations = [
        { seg: 'install', install: 0 },
        { seg: 'install', install: 0.6 },
        { seg: 'install', install: 1 },
        { seg: 'styles', style: { from: 1, to: 2, k: 0.5 }, drift: 1 },
        { seg: 'repair', repair: 0 },
        { seg: 'repair', repair: 1 },
      ];
      renderer.compile(scene, camera);
      for (const st of stations) {
        world.update({ install: 1, style: { from: 0, to: 0, k: 1 }, drift: 1, repair: 0, pointer: { x: 0, y: 0 }, ...st }, 1 / 60, 0);
        world.render();
        await yieldFrame();
      }
      lastKey = '';
    },
    anchors() {
      const out = [];
      for (const [id, xyz] of Object.entries(ANCHORS)) {
        p.fromArray(xyz);
        // the gate anchors ride with the gate
        if (id === 'penture' || id === 'portillon' || id === 'pentures' || id === 'cable' || id === 'garde') {
          p.sub(gate.position.clone().setY(0)).applyEuler(gate.rotation).add(gate.position);
        }
        if (id === 'branche') p.y += branch.position.y;
        const v = p.clone().project(camera);
        const x = (v.x * 0.5 + 0.5) * size.w, y = (-v.y * 0.5 + 0.5) * size.h;
        const visible = v.z < 1 && v.z > -1 && x > 8 && x < size.w - 8 && y > 8 && y < size.h - 8 && (id !== 'branche' || branch.visible);
        out.push({ id, x, y, visible });
      }
      return out;
    },
    info: () => ({ totalLength: LEGS[0].len + LEGS[1].len, legs: LEGS.map((l) => l.len), stub: true }),
    stats() {
      const i = renderer.info;
      return { calls: i.render.calls, triangles: i.render.triangles, textures: i.memory.textures, geometries: i.memory.geometries, programs: i.programs ? i.programs.length : 0 };
    },
    setQuality(lv) {
      if (!QUALITY[lv]) return;
      level = lv;
      tufts.count = QUALITY[lv].grass;
      const sz = QUALITY[lv].shadow;
      if (sun.shadow.mapSize.x !== sz) {
        sun.shadow.mapSize.set(sz, sz);
        if (sun.shadow.map) {
          sun.shadow.map.dispose();
          sun.shadow.map = null;
        }
      }
    },
    get quality() {
      return level;
    },
  };
  onProgress(1);
  return world;
}
