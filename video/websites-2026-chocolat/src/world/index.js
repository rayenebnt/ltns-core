// MÉDINA world: a teal studio, then a forest-green one. A steel bowl pours a thick pistachio cream
// that coils into a chocolate mould and settles; milk chocolate falls on it and spreads to the
// edges; the finished bar rises out of the mould, turns to us, gold leaf and dust round it; the
// green comes, the bar stands up in a row of boxes that slides past; then it flies right, lies
// down and breaks in two on its green heart. One camera on monotone splines of p.
// Units: centimetres, Y up; the mould at the origin, 16 x 8.
// Contract (main.js): createWorld({ renderer, quality, onProgress }) → { camera, update(state, dt,
// time), render(), resize(w, h, dpr), warmup(), setQuality(level), stats(), anchors(), info() }.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PHASES, within, rowAt } from '../story.js';
import { BOXES } from '../texts.js';
import * as P from './props.js';

export const rendererOptions = { antialias: true };

const { clamp, mix, smooth, sstep, rng, easeInOut } = P;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const col = (h) => new THREE.Color(h);

function monotone(points) {
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
// p, camera xyz, target xyz, fov
const KEYS = [
  [0.0, 2.6, 10.4, 20.5, 3.2, 8.4, 0.0, 34],
  [0.04, 2.2, 10.8, 21.0, 2.8, 7.2, 0.0, 34],
  [0.1, 0.0, 12.8, 21.5, 0.6, 2.0, 0.0, 34],
  [0.19, 0.0, 13.6, 18.0, 0.0, 1.1, 0.0, 34],
  [0.23, -1.6, 11.6, 19.5, 0.6, 2.4, 0.0, 34],
  [0.33, 0.0, 13.0, 17.5, 0.0, 1.2, 0.0, 34],
  [0.36, 0.0, 12.4, 19.0, 0.0, 2.2, 0.0, 34],
  [0.44, 0.0, 9.2, 27.0, 0.0, 6.0, 0.0, 32],
  [0.5, 0.0, 6.6, 33.0, 0.0, 6.2, 0.0, 30],
  [1.0, 0.0, 6.6, 33.0, 0.0, 6.2, 0.0, 30],
];
const CH = [];
for (let c = 1; c <= 7; c++) CH.push(monotone(KEYS.map((k) => [k[0], k[c]])));

const NOISE = /* glsl */ `
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
`;

export async function createWorld({ renderer, quality = 'high', onProgress = () => {} }) {
  let level = quality;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // the boxes are drawn on canvases with the page's own fonts
  if (document.fonts && document.fonts.load) {
    try {
      await Promise.all([
        document.fonts.load("500 120px 'Bodoni Moda'", 'AMBRE SAFRAN ROSE NUIT DATTE M'),
        document.fonts.load("italic 400 30px 'EB Garamond'", 'L’heure dorée'),
        document.fonts.load("600 15px 'Archivo'", 'MAISON MÉDINA'),
      ]);
    } catch (e) {
      /* the system's fonts then */
    }
  }
  onProgress(0.1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 16 / 10, 0.5, 400);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;

  // ------------------------------------------------------------------ backdrop: teal, then green with leaves
  const leafTex = P.leafTexture();
  const bgU = { uGreen: { value: 0 }, uLeaf: { value: leafTex }, uRes: { value: new THREE.Vector2(1280, 800) }, uDrift: { value: 0 } };
  const bg = new THREE.Mesh(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)),
    new THREE.ShaderMaterial({
      uniforms: bgU,
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
      fragmentShader: /* glsl */ `
        uniform float uGreen; uniform sampler2D uLeaf; uniform vec2 uRes; uniform float uDrift; varying vec2 vP;
        ${NOISE}
        void main(){
          vec2 q = vP * vec2(uRes.x / uRes.y, 1.0);
          float r = length(q * vec2(0.62, 0.9) - vec2(0.05, 0.12));
          vec3 teal = mix(vec3(0.075, 0.24, 0.27), vec3(0.018, 0.075, 0.09), smoothstep(0.1, 1.35, r));
          vec3 green = mix(vec3(0.12, 0.33, 0.17), vec3(0.035, 0.14, 0.07), smoothstep(0.15, 1.45, r));
          vec2 luv = q * 0.55 + vec2(uDrift, 0.0);
          float leaf = texture2D(uLeaf, luv).a;
          green += vec3(0.045, 0.09, 0.05) * leaf;
          vec3 c = mix(teal, green, uGreen);
          c *= 0.97 + 0.06 * vn(gl_FragCoord.xy * 0.7);
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

  // ------------------------------------------------------------------ light
  scene.add(new THREE.HemisphereLight(col('#cfeff2'), col('#3b2416'), 0.35));
  const key = new THREE.DirectionalLight(col('#fff0dc'), 2.7);
  key.position.set(-14, 24, 16);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 4;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.03;
  Object.assign(key.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 4, far: 80 });
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(col('#aee6ff'), 1.5);
  rim.position.set(16, 10, -18);
  scene.add(rim);
  const warm = new THREE.DirectionalLight(col('#ffcf9a'), 0.8);
  warm.position.set(18, 4, 14);
  scene.add(warm);

  // ------------------------------------------------------------------ materials
  const grain = P.normalMap(256, (() => {
    const n1 = P.noise2(3, 32), n2 = P.noise2(8, 64);
    return (u, v) => n1(u, v) * 0.6 + n2(u, v) * 0.4;
  })(), 3.2);
  const mouldMat = new THREE.MeshPhysicalMaterial({ color: col('#41200d'), roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const barMat = new THREE.MeshPhysicalMaterial({ color: col('#5a2911'), roughness: 0.3, clearcoat: 0.65, clearcoatRoughness: 0.14 });
  const barCol0 = col('#5a2911'), barCol1 = col('#b8461a');
  const pistMat = new THREE.MeshPhysicalMaterial({ color: col('#7f880a'), roughness: 0.34, clearcoat: 0.22, clearcoatRoughness: 0.2, specularIntensity: 0.7, normalMap: grain, normalScale: new THREE.Vector2(0.28, 0.28), envMapIntensity: 0.42, emissive: col('#2a3203'), emissiveIntensity: 1 });
  const pasteTex = P.pasteTexture();
  pasteTex.repeat.set(1.5, 0.75);
  const pistLayerMat = new THREE.MeshPhysicalMaterial({ color: col('#ffffff'), map: pasteTex, roughness: 0.66, clearcoat: 0.12, normalMap: grain, normalScale: new THREE.Vector2(1.5, 1.5) });
  grain.repeat.set(1, 1);
  const molten = new THREE.MeshPhysicalMaterial({ color: col('#5a2a10'), roughness: 0.16, clearcoat: 0.85, clearcoatRoughness: 0.08, envMapIntensity: 0.6 });
  const steel = new THREE.MeshStandardMaterial({ color: col('#d6d1c9'), metalness: 1, roughness: 0.2 });
  const goldMat = new THREE.MeshStandardMaterial({ color: col('#efc055'), metalness: 1, roughness: 0.22, emissive: col('#8a6414'), emissiveIntensity: 0.45, side: THREE.DoubleSide });

  // ------------------------------------------------------------------ the mould, its layers
  const mould = P.makeMould(mouldMat);
  scene.add(mould);
  const layerG = new THREE.PlaneGeometry(16, 8, 96, 48);
  {
    const n = P.noise2(5, 12), lp = layerG.attributes.position;
    for (let i = 0; i < lp.count; i++) lp.setZ(i, 0.1 * n((lp.getX(i) + 8) / 16, (lp.getY(i) + 4) / 8) + 0.03 * Math.sin(lp.getX(i) * 3.1 + lp.getY(i) * 2.3));
    layerG.computeVertexNormals();
  }
  const pistLayer = new THREE.Mesh(layerG, pistLayerMat);
  pistLayer.rotation.x = -Math.PI / 2;
  pistLayer.receiveShadow = true;
  scene.add(pistLayer);
  const coils = P.makeCoils(pistMat);
  scene.add(coils.mesh);
  // the molten chocolate: a sheet that spreads from where the stream falls, a swell under it
  const chocU = { uO: { value: new THREE.Vector2(1.6, 0.4) }, uR: { value: 0 }, uA: { value: 0 }, uT: { value: 0 } };
  const chocMat = molten.clone();
  chocMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, chocU);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uO; uniform float uA; uniform float uT; varying vec3 vCW;')
      .replace('#include <beginnormal_vertex>', `
        vec3 wp0 = (modelMatrix * vec4(position, 1.0)).xyz;
        vec2 dv = wp0.xz - uO;
        float dd = max(length(dv), 1e-3);
        float hb = uA * exp(-dd * dd * 0.9);
        float rip = 0.035 * uA * exp(-dd * 0.45);
        float dh = -1.8 * dd * hb + rip * (5.0 * cos(dd * 5.0 - uT * 4.0) - 0.45 * sin(dd * 5.0 - uT * 4.0));
        vec2 gw = dh * dv / dd;
        vec3 objectNormal = normalize(vec3(-gw.x, gw.y, 1.0));
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif`)
      .replace('#include <begin_vertex>', `vec3 transformed = vec3(position);
        transformed.z += hb + rip * sin(dd * 5.0 - uT * 4.0);
        vCW = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform vec2 uO; uniform float uR; varying vec3 vCW;\n${NOISE}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        float edge = uR * (0.9 + 0.2 * vn(normalize(vCW.xz - uO + 1e-4) * 3.0 + 7.0)) + 0.25 * (vn(vCW.xz * 1.1) - 0.5);
        if (length(vCW.xz - uO) > edge) discard;`);
  };
  const chocSheet = new THREE.Mesh(new THREE.PlaneGeometry(16, 8, 160, 80), chocMat);
  chocSheet.rotation.x = -Math.PI / 2;
  chocSheet.receiveShadow = true;
  scene.add(chocSheet);

  // ------------------------------------------------------------------ the bowl, its stream and drips
  const bowl = P.makeBowl(steel, pistMat);
  scene.add(bowl.group);
  const pistStream = P.makeStream(pistMat, 18, 80);
  scene.add(pistStream.mesh);
  const drips = [0, 1].map(() => {
    const s = P.makeStream(pistMat, 10, 24);
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), pistMat);
    drop.scale.set(1, 1.3, 1);
    scene.add(s.mesh, drop);
    return { s, drop };
  });
  const moltenStream = molten.clone();
  Object.assign(moltenStream, { clearcoat: 0, envMapIntensity: 0.25, roughness: 0.32, specularIntensity: 0.6 });
  moltenStream.color = col('#6b3214');
  moltenStream.emissive = col('#3a1708');
  const chocStream = P.makeStream(moltenStream, 18, 90);
  scene.add(chocStream.mesh);

  // ------------------------------------------------------------------ the bar, the gold, the dust
  const bar = P.makeBar(barMat, P.crossTexture(), goldMat);
  scene.add(bar.group);
  const floatG = P.flakeGeometry(11);
  const NF = 80;
  const floaters = new THREE.InstancedMesh(floatG, goldMat, NF);
  floaters.frustumCulled = false;
  scene.add(floaters);
  const FR = rng(23);
  const fl = Array.from({ length: NF }, () => ({ r: 5 + FR() * 7, a: FR() * 6.28, y: (FR() - 0.5) * 9, sp: 0.1 + FR() * 0.25, rot: V3(FR() * 6, FR() * 6, FR() * 6), s: 0.9 + FR() * 1.8, z: (FR() - 0.5) * 6 }));
  const dustG = new THREE.BufferGeometry();
  {
    const n = 420, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      a[i * 3] = (FR() - 0.5) * 30;
      a[i * 3 + 1] = (FR() - 0.5) * 18;
      a[i * 3 + 2] = (FR() - 0.5) * 12;
    }
    dustG.setAttribute('position', new THREE.BufferAttribute(a, 3));
  }
  const dustMat = new THREE.PointsMaterial({ color: col('#ffd27a'), size: 0.09, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const dust = new THREE.Points(dustG, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);
  // the crumbs of the snap (in the bar's frame)
  const crumbG = new THREE.IcosahedronGeometry(1, 0);
  const NC = 40;
  const crumbs = [new THREE.InstancedMesh(crumbG, barMat, NC), new THREE.InstancedMesh(crumbG, pistLayerMat, NC / 2)];
  const CR = rng(29);
  const crumbData = crumbs.map((m) => Array.from({ length: m.count }, () => ({ x: (CR() - 0.5) * 15, y: 0.2 + CR() * 1.0, vx: (CR() - 0.5) * 1.5, vy: 1.2 + CR() * 2.4, vz: (CR() < 0.5 ? -1 : 1) * (0.6 + CR() * 1.6), r: 0.07 + CR() * 0.13, rot: CR() * 6 })));
  crumbs.forEach((m) => {
    m.frustumCulled = false;
    bar.group.add(m);
  });

  // ------------------------------------------------------------------ the boxes
  const S = 5.6; // the row's spacing
  const cards = BOXES.map((b, i) => {
    if (!b.name) return null;
    const m = new THREE.Mesh(new THREE.BoxGeometry(4.3, 6.1, 0.22), [
      new THREE.MeshStandardMaterial({ color: col(b.c2), roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: col(b.c2), roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: col(b.c2), roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: col(b.c2), roughness: 0.5 }),
      new THREE.MeshPhysicalMaterial({ map: P.boxTexture(b), roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 }),
      new THREE.MeshStandardMaterial({ color: col(b.c2), roughness: 0.5 }),
    ]);
    m.castShadow = true;
    scene.add(m);
    return { m, i, tilt: ((i * 37) % 7) / 7 - 0.5 };
  });
  onProgress(0.8);

  // ------------------------------------------------------------------ poses of the bar
  const Q_flat = new THREE.Quaternion();
  const Q_lift = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.62, -0.38, 0.1, 'YXZ'));
  const Q_up = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V3(0, 1, 0), V3(0, 0, 1), V3(1, 0, 0)));
  const Q_snap = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.32, 0.18, -0.62)).multiply(Q_up);
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qt = new THREE.Quaternion();
  const tmpV = new THREE.Vector3(), lip = new THREE.Vector3(), head = new THREE.Vector3(), ctr = new THREE.Vector3();
  const m4 = new THREE.Matrix4(), e = new THREE.Euler(), sv = new THREE.Vector3(), q4 = new THREE.Quaternion();

  // ------------------------------------------------------------------ per frame
  let W = 1280, H = 800, dpr = 1, curP = 0, stage = 'pistache';
  const tgt = new THREE.Vector3();
  let bowlX = 4.0;
  function placeCamera(p, pointer) {
    const v = CH.map((f) => f(p));
    camera.position.set(v[0] + pointer.x * 0.35, v[1] + pointer.y * 0.2, v[2]);
    tgt.set(v[3], v[4], v[5]);
    camera.lookAt(tgt);
    const aspect = W / H;
    camera.fov = aspect < 1.6 ? Math.min(75, (2 * Math.atan(Math.tan((v[6] * Math.PI) / 360) * (1.6 / aspect)) * 180) / Math.PI) : v[6];
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }
  function update(state, dt, time) {
    const p = clamp(state.p);
    curP = p;
    placeCamera(p, state.pointer || { x: 0, y: 0 });
    bgU.uRes.value.set(W, H);
    bgU.uDrift.value = time * 0.004;
    const kGreen = sstep(PHASES.green[0], PHASES.green[1], p);
    bgU.uGreen.value = kGreen;
    barMat.color.copy(barCol0).lerp(barCol1, kGreen);
    barMat.clearcoat = mix(0.65, 0.32, kGreen);
    barMat.roughness = mix(0.3, 0.4, kGreen);
    chocU.uT.value = time;

    // the mould slides away when the green comes
    const kAway = sstep(PHASES.green[0] - 0.01, PHASES.green[1], p);
    mould.position.y = -16 * kAway * kAway;
    mould.visible = kAway < 0.999;

    // ---- the pistachio pour: the rope coils, the stream from the bowl's lip follows the pour point
    const kPour = within(p, [0.0, 0.165]);
    const kCoil = 0.04 + 0.96 * smooth(within(p, [0.005, 0.16]));
    const kSettle = smooth(within(p, PHASES.settle));
    coils.setProgress(kCoil);
    head.copy(coils.setProgress(kCoil));
    coils.centre(ctr);
    coils.mesh.position.y = -1.3 * kSettle;
    coils.mesh.visible = p < PHASES.settle[1] + 0.005;
    // the layer: a little at first under the rope, then up to the brim as the rope settles
    pistLayer.position.y = mix(0.56, 1.15, 0.1 * kCoil + 0.9 * kSettle) + mould.position.y;
    pistLayer.visible = p < PHASES.lift[0] + 0.005;
    // the bowl: high over the mould, it follows the pour point
    const pourOn = p < PHASES.pour[1] + 0.012;
    bowl.group.visible = p < 0.2;
    const bx = ctr.x + 0.7;
    bowlX = bx;
    bowl.group.position.set(bowlX + 0.6, 15.0 + 2.5 * sstep(0.16, 0.2, p), ctr.z * 0.5 - 0.4);
    bowl.group.scale.setScalar(1.05);
    bowl.group.rotation.set(0, -0.3, 2.02 + 0.06 * Math.sin(time * 0.7));
    bowl.group.updateMatrixWorld(true);
    lip.copy(bowl.lip).applyMatrix4(bowl.group.matrixWorld);
    pistStream.mesh.visible = pourOn;
    if (pourOn) {
      const end = head.clone();
      end.y += 0.25;
      const fade = 1 - sstep(0.15, 0.172, p);
      const wob = (k) => 0.12 * Math.sin(time * 2.1 + k * 3.0);
      const pts = [
        lip.clone().add(V3(0.15, 0.2, 0)),
        lip.clone(),
        V3(lip.x - 0.2 + wob(1), lip.y - 1.4, lip.z),
        V3(mix(lip.x, end.x, 0.25) + wob(2), mix(lip.y, end.y, 0.45), mix(lip.z, end.z, 0.25)),
        V3(mix(lip.x, end.x, 0.7), end.y + 1.4, mix(lip.z, end.z, 0.7)),
        end,
      ];
      pistStream.set(pts, (s) => ((s < 0.08 ? mix(1.25, 1.0, s / 0.08) : mix(1.0, 0.72, (s - 0.08) / 0.92)) + 0.06 * Math.sin(s * 14 - time * 3.2)) * (0.35 + 0.65 * fade));
    }
    drips.forEach((d, i) => {
      const vis = p < 0.2;
      d.s.mesh.visible = d.drop.visible = vis;
      if (!vis) return;
      const a = V3(-3.7 + i * 0.6, 2.2 - i * 0.5, i ? 2.0 : -2.2).applyMatrix4(bowl.group.matrixWorld);
      const cyc = (time * (0.35 + i * 0.12) + i * 0.5) % 1;
      const len = 0.8 + 2.8 * cyc * cyc;
      const b2 = a.clone().add(V3(0, -len, 0));
      d.s.set([a, a.clone().add(V3(0.02, -len * 0.5, 0)), b2], (s) => mix(0.12, 0.05, s) * (1 - 0.6 * cyc));
      d.drop.position.copy(b2).add(V3(0, -0.12, 0));
      d.drop.scale.setScalar(0.6 + 0.6 * cyc);
    });

    // ---- the chocolate: a stream from above, coiling where it lands; the sheet spreads to the walls
    const kC = within(p, PHASES.choco);
    const lvl = pistLayer.position.y + 0.14;
    chocU.uR.value = 11.5 * Math.pow(smooth(within(p, [0.215, 0.325])), 0.85);
    chocU.uA.value = 0.36 * sstep(0.215, 0.23, p) * (1 - sstep(0.32, 0.345, p));
    chocSheet.position.y = lvl + 0.18 * smooth(kC);
    chocSheet.visible = p > 0.21 && p < PHASES.lift[0] + 0.005;
    const cOn = p > 0.213 && p < 0.345;
    chocStream.mesh.visible = cOn;
    if (cOn) {
      const o = chocU.uO.value;
      const base = V3(o.x, chocSheet.position.y + chocU.uA.value + 0.05, o.y);
      const top = mix(26, base.y + 0.5, sstep(0.322, 0.345, p));
      const coil = [];
      for (let k = 0; k <= 8; k++) {
        const a = k * 1.1 + time * 2.6;
        coil.push(V3(base.x + Math.cos(a) * 0.32 * (k / 8), base.y + 0.55 * (1 - k / 8), base.z + Math.sin(a) * 0.32 * (k / 8)));
      }
      chocStream.set([V3(o.x + 0.05, top, o.y), V3(o.x + 0.02 + 0.05 * Math.sin(time * 1.7), mix(top, base.y, 0.5), o.y), V3(o.x, base.y + 1.2, o.y), ...coil], (s) => (mix(0.58, 0.46, s) + 0.03 * Math.sin(s * 18 - time * 4)) * (1 - 0.5 * sstep(0.33, 0.345, p)));
    }

    // ---- the bar: in the mould, up, turned to us; then the row; then the snap
    const kLift = easeInOut(within(p, PHASES.lift));
    const kRow = easeInOut(within(p, PHASES.green));
    const kOut = easeInOut(within(p, PHASES.toSnap));
    const kSnap = easeInOut(within(p, PHASES.snap));
    bar.group.visible = p >= PHASES.lift[0];
    // the row's slide: a pause on each flavour
    const shift = S * rowAt(p);
    const rowX = (i) => (i - 2) * S - shift;
    if (p < PHASES.green[0]) {
      bar.group.position.set(0, mix(lvl - 1.42, 7.2, kLift), mix(0, 1.5, kLift));
      bar.group.quaternion.slerpQuaternions(Q_flat, Q_lift, kLift);
      qt.setFromEuler(e.set(0, time * 0.12 * kLift, 0));
      bar.group.quaternion.premultiply(qt);
      bar.group.scale.setScalar(1);
    } else if (p < PHASES.toSnap[0]) {
      qa.copy(Q_lift).premultiply(qt.setFromEuler(e.set(0, time * 0.12, 0)));
      qb.copy(Q_up).premultiply(qt.setFromEuler(e.set(0.08 * Math.sin(time * 0.6), 0.25 * Math.sin(time * 0.5), 0.05)));
      bar.group.quaternion.slerpQuaternions(qa, qb, kRow);
      bar.group.position.set(mix(0, rowX(2), kRow), mix(7.2, 6.3, kRow), mix(1.5, 0.6, kRow));
      bar.group.scale.setScalar(mix(1, 0.37, kRow));
    } else {
      qa.copy(Q_up).premultiply(qt.setFromEuler(e.set(0.08 * Math.sin(time * 0.6), 0.25 * Math.sin(time * 0.5), 0.05)));
      qb.copy(Q_snap).premultiply(qt.setFromEuler(e.set(0, 0.1 * Math.sin(time * 0.4), 0)));
      bar.group.quaternion.slerpQuaternions(qa, qb, kOut);
      bar.group.position.set(mix(rowX(2), 6.2, kOut), mix(6.3, 5.6, kOut), mix(0.6, 2.0, kOut));
      bar.group.scale.setScalar(mix(0.37, 0.62, kOut));
    }
    bar.halves.forEach((h) => {
      h.group.position.set(0, 0, h.sz * kSnap * 1.5);
      h.group.rotation.set(h.sz < 0 ? -kSnap * 0.55 : kSnap * 0.32, 0, h.sz * kSnap * 0.05);
      const kF = sstep(0.37, 0.42, p);
      h.flakes.visible = kF > 0.001;
      h.flakes.scale.set(1, 1, 1);
      h.flakes.position.y = (1 - kF) * 1.2;
      h.flakes.scale.setScalar(Math.max(0.001, kF));
    });
    // the crumbs fly from the break
    crumbs.forEach((m, ci) => {
      const t = kSnap * 1.3;
      const on = kSnap > 0.02 && kSnap < 0.99;
      m.visible = on;
      if (!on) return;
      crumbData[ci].forEach((c, i) => {
        sv.set(c.x + c.vx * t, c.y + c.vy * t - 3.2 * t * t, c.vz * t);
        q4.setFromEuler(e.set(c.rot + t * 3, c.rot * 2 + t * 2, 0));
        tmpV.setScalar(c.r * (1 - 0.4 * kSnap));
        m.setMatrixAt(i, m4.compose(sv, q4, tmpV));
      });
      m.instanceMatrix.needsUpdate = true;
    });
    // gold leaf in the air and dust round the risen bar
    const kAir = sstep(0.38, 0.43, p) * (1 - sstep(0.47, 0.51, p));
    floaters.visible = kAir > 0.001;
    if (floaters.visible) {
      fl.forEach((f, i) => {
        const a = f.a + time * f.sp * 0.3 + p * 4;
        sv.set(Math.cos(a) * f.r, 6.8 + f.y + Math.sin(time * f.sp + i) * 0.4 - (1 - kAir) * 3, f.z + Math.sin(a) * 2.5);
        q4.setFromEuler(e.set(f.rot.x + time * f.sp * 2, f.rot.y + time * f.sp, f.rot.z));
        tmpV.setScalar(f.s * kAir);
        floaters.setMatrixAt(i, m4.compose(sv, q4, tmpV));
      });
      floaters.instanceMatrix.needsUpdate = true;
    }
    dustMat.opacity = 0.85 * kAir;
    dust.position.set(Math.sin(time * 0.1) * 0.5, 6.5 + time * 0.05 - Math.floor((time * 0.05) / 6) * 6, 0);
    dust.visible = kAir > 0.001;

    // ---- the boxes: in from below with the green, the row slides, out before the snap
    cards.forEach((c, k) => {
      if (!c) return;
      const i = c.i;
      const stag = Math.abs(i - 2) * 0.12;
      const kin = easeInOut(clamp((kRow - stag) / (1 - stag)));
      const kex = easeInOut(clamp((kOut * 1.3 - stag * 0.5) / 1.0));
      const x = rowX(i);
      c.m.visible = kin > 0.001 && kex < 0.999;
      c.m.position.set(x, 6.3 - 15 * (1 - kin) - 15 * kex, -Math.abs(x) * 0.18);
      c.m.rotation.set(0.04 * Math.sin(time * 0.5 + i), -x * 0.035, c.tilt * 0.12);
      c.m.scale.setScalar(1 + 0.06 * (1 - clamp(Math.abs(x) / S)));
    });

    stage = p < 0.21 ? 'pistache' : p < 0.35 ? 'chocolat' : p < 0.5 ? 'tablette' : p < 0.73 ? 'collection' : 'craquant';
  }
  function resize(w, h, d) {
    W = Math.max(1, w);
    H = Math.max(1, h);
    dpr = d || 1;
    placeCamera(curP, { x: 0, y: 0 });
  }
  async function warmup() {
    const keep = curP;
    renderer.compile(scene, camera);
    for (const p of [0.05, 0.25, 0.4, 0.55, 0.82]) {
      update({ p, pointer: { x: 0, y: 0 } }, 0, 1);
      renderer.render(scene, camera);
      await new Promise((r) => setTimeout(r, 0));
    }
    update({ p: keep, pointer: { x: 0, y: 0 } }, 0, 0);
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
      key.shadow.mapSize.set(lv === 'low' ? 1024 : 2048, lv === 'low' ? 1024 : 2048);
      if (key.shadow.map) {
        key.shadow.map.dispose();
        key.shadow.map = null;
      }
    },
    stats() {
      const i = renderer.info;
      return { calls: i.render.calls, triangles: i.render.triangles, textures: i.memory.textures, geometries: i.memory.geometries, programs: i.programs ? i.programs.length : 0, stage, level };
    },
    anchors() {
      return {};
    },
    info() {
      return { stage };
    },
  };
}
