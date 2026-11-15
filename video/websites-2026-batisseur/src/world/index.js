// PINÈDE world: the open-plan ground floor of a house on the Riviera, in real time. Seen from the
// living room: the kitchen at the left (an L of light oak, a black marble island with white veins and
// five white chairs, a cluster of black pendants), a painting on the pier, then a wide opening on the
// terrace, the lawn, the pool and a white villa across; a curved boucle sofa, a glass table, a black
// lounge chair. The camera crosses the room, looks down the island (the tall black ovens at the
// left), comes down over it where a plan unrolls, then goes back. Rendered through a composer
// (ambient occlusion, output). At load, a few views are rendered once and handed to the page as the
// pictures of its first sections.
// Units: metres, Y up; the room x -8..10, z -7..7, 3.2 high; the back wall (kitchen, pier, opening)
// at z = -7, the garden beyond it.
// Contract (main.js): createWorld({ renderer, quality, onProgress }) → { camera, update(state, dt,
// time), render(), resize(w, h, dpr), warmup(), setQuality(level), stats(), anchors(), info() }.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { KEYS, planAt } from '../story.js';
import * as TX from './textures.js';
import * as P from './props.js';

export const rendererOptions = { antialias: false };
const { box, cyl, builder, clamp, mix, smooth, sstep } = P;
const col = (h) => new THREE.Color(h);
const std = (hex, r = 0.8, o = {}) => new THREE.MeshStandardMaterial({ color: col(hex), roughness: r, ...o });

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
const CH = [];
for (let c = 1; c <= 7; c++) CH.push(monotone(KEYS.map((k) => [k[0], k[c]])));

// the views rendered at load for the page's pictures: camera, target, vertical fov, plan unrolled
export const SNAPS = {
  cuisine: [[2.6, 1.5, -2.62], [-8, 0.96, -4.1], 50, 0],
  salon: [[1.7, 1.6, 3.6], [2.0, 0.98, -7], 54, 0],
  maison: [[5.5, 1.7, -17.6], [17.5, 2.6, -33], 48, 0],
  piscine: [[2.8, 2.2, -8.6], [12, 0.1, -19], 50, 0],
};

export async function createWorld({ renderer, quality = 'high', onProgress = () => {} }) {
  let level = quality;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  RectAreaLightUniformsLib.init();
  if (document.fonts && document.fonts.load) {
    try {
      await Promise.all([document.fonts.load("600 60px 'Archivo'", 'PINÈDE SÉJOUR'), document.fonts.load("500 22px 'Archivo'", '18,40 Échelle')]);
    } catch (e) {
      /* the system's fonts then */
    }
  }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 16 / 10, 0.03, 600);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
  scene.background = TX.sky();
  scene.background.mapping = THREE.EquirectangularReflectionMapping;
  scene.fog = new THREE.Fog(col('#d5e4ee'), 70, 260);
  onProgress(0.1);

  // ------------------------------------------------------------------ materials
  const oakFloor = TX.oak({ planks: true, seed: 3 });
  oakFloor.repeat.set(18 / 3.4, 14 / 1.7);
  const oakFront = TX.oak({ planks: false, seed: 9, w: 512, h: 1024 });
  const marbleTex = TX.marble(7);
  const foliageN = TX.leaves();
  const leafy = (hex) => {
    const m = new THREE.MeshStandardMaterial({ color: col(hex), roughness: 0.95, normalMap: foliageN, normalScale: new THREE.Vector2(1.2, 1.2) });
    return m;
  };
  foliageN.repeat.set(3, 3);
  const M = {
    wall: std('#f2f0eb', 0.93),
    ceiling: std('#f6f5f1', 0.96),
    floor: new THREE.MeshStandardMaterial({ map: oakFloor, roughness: 0.38 }),
    oakFront: new THREE.MeshStandardMaterial({ map: oakFront, roughness: 0.6 }),
    marble: new THREE.MeshPhysicalMaterial({ map: marbleTex, roughness: 0.26, clearcoat: 0.35, clearcoatRoughness: 0.22, envMapIntensity: 0.32 }),
    stone: std('#ecebe6', 0.34),
    black: std('#131415', 0.62),
    blackSoft: std('#1b1c1e', 0.5),
    blackCab: std('#1c1d20', 0.38),
    ovenGlass: new THREE.MeshStandardMaterial({ color: col('#0a0b0d'), roughness: 0.05, metalness: 0.6 }),
    steel: new THREE.MeshStandardMaterial({ color: col('#b9bcc0'), metalness: 1, roughness: 0.24 }),
    metal: new THREE.MeshStandardMaterial({ color: col('#1d1e21'), metalness: 0.7, roughness: 0.34 }),
    boucle: new THREE.MeshStandardMaterial({ color: col('#efebe3'), roughness: 0.97, normalMap: TX.boucle(), normalScale: new THREE.Vector2(0.45, 0.45) }),
    navy: new THREE.MeshStandardMaterial({ color: col('#26314b'), roughness: 0.88, normalMap: TX.weave(), normalScale: new THREE.Vector2(0.4, 0.4) }),
    ivory: std('#efeadf', 0.9),
    glass: new THREE.MeshPhysicalMaterial({ color: col('#dfe8e8'), roughness: 0.04, transparent: true, opacity: 0.2, envMapIntensity: 1.6 }),
    chair: new THREE.MeshPhysicalMaterial({ color: col('#f4f3f0'), roughness: 0.3, clearcoat: 0.5 }),
    chairLeg: new THREE.MeshStandardMaterial({ color: col('#c9a46a'), metalness: 0.9, roughness: 0.3 }),
    ceramic: std('#efece5', 0.45),
    led: new THREE.MeshBasicMaterial({ color: col('#ffe8c2') }),
    bulb: new THREE.MeshBasicMaterial({ color: col('#ffeccb') }),
    rug: new THREE.MeshStandardMaterial({ color: col('#9ea59f'), roughness: 1, normalMap: TX.weave(), normalScale: new THREE.Vector2(0.8, 0.8) }),
    trunk: std('#8d7a66', 0.92),
    palm: std('#4f7d36', 0.8),
    palm2: std('#618f42', 0.8),
    render: new THREE.MeshStandardMaterial({ color: col('#f3f1eb'), roughness: 0.9, normalMap: TX.stucco(), normalScale: new THREE.Vector2(0.22, 0.22) }),
    darkGlass: new THREE.MeshStandardMaterial({ map: TX.glassReflect(), roughness: 0.12, metalness: 0.15 }),
    lawn: new THREE.MeshStandardMaterial({ map: TX.grass(), roughness: 0.95 }),
    hedge: leafy('#ffffff'),
    tree: leafy('#ffffff'),
    treeDark: leafy('#ffffff'),
    olive: std('#8a9b74', 0.9),
    water: new THREE.MeshPhysicalMaterial({ map: TX.caustics(), roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04 }),
    poolTile: std('#bfe6f2', 0.6),
    coping: std('#e9e5dc', 0.7),
    terrace: new THREE.MeshStandardMaterial({ map: TX.pavers(), roughness: 0.85 }),
    bark: std('#7a6553', 0.95),
    pine: leafy('#ffffff'),
    cypress: leafy('#ffffff'),
    frame: std('#121314', 0.48),
    blade: new THREE.MeshStandardMaterial({ color: col('#d9b24a'), roughness: 0.5, metalness: 0.3 }),
  };
  M.boucle.normalMap.repeat.set(4, 4);
  M.render.normalMap.repeat.set(10, 4);
  M.lawn.map.repeat.set(20, 17.5);
  M.pine.color.set('#466b34');
  M.cypress.color.set('#2c4a26');
  onProgress(0.25);

  // ------------------------------------------------------------------ the room
  const b = builder();
  // (floor, ceiling and lawn in a grid of small quads: one huge quad that crosses the camera's near
  // plane breaks the ambient occlusion's normal pass on some GPUs)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 14, 18, 14), M.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(1, 0, 0);
  floor.receiveShadow = true;
  scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(18.6, 14.6, 18, 14), M.ceiling);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(1, 3.2, 0);
  ceil.receiveShadow = ceil.castShadow = true;
  scene.add(ceil);
  // the back wall: the kitchen part (its window), the pier, the opening
  const WIN = { x0: -4.3, x1: -2.1, y0: 1.25, y1: 2.45 };
  const OPEN = { x0: 4.6, x1: 9.7, top: 2.95 };
  b.add(box(4.0, 3.2, 0.3), M.wall, -6.3, 1.6, -7.15);
  b.add(box(WIN.x1 - WIN.x0, WIN.y0, 0.3), M.wall, (WIN.x0 + WIN.x1) / 2, WIN.y0 / 2, -7.15);
  b.add(box(WIN.x1 - WIN.x0, 3.2 - WIN.y1, 0.3), M.wall, (WIN.x0 + WIN.x1) / 2, (3.2 + WIN.y1) / 2, -7.15);
  b.add(box(OPEN.x0 - WIN.x1, 3.2, 0.3), M.wall, (OPEN.x0 + WIN.x1) / 2, 1.6, -7.15);
  b.add(box(OPEN.x1 - OPEN.x0, 3.2 - OPEN.top, 0.3), M.wall, (OPEN.x0 + OPEN.x1) / 2, (3.2 + OPEN.top) / 2, -7.15);
  b.add(box(10.6 - OPEN.x1, 3.2, 0.3), M.wall, (OPEN.x1 + 10.6) / 2, 1.6, -7.15);
  b.add(box(0.3, 3.2, 14.6), M.wall, -8.15, 1.6, 0);
  b.add(box(0.3, 3.2, 14.6), M.wall, 10.15, 1.6, 0);
  b.add(box(18.6, 3.2, 0.3), M.wall, 1, 1.6, 7.15);
  // the window and the opening: thin black frames, a sill
  for (const [x0, x1, y0, y1] of [[WIN.x0, WIN.x1, WIN.y0, WIN.y1], [OPEN.x0, OPEN.x1, 0, OPEN.top]]) {
    const w = x1 - x0, h = y1 - y0, xc = (x0 + x1) / 2, yc = (y0 + y1) / 2;
    b.add(box(w, 0.05, 0.3), M.frame, xc, y1 - 0.025, -7.15);
    for (const x of [x0 + 0.025, x1 - 0.025]) b.add(box(0.05, h, 0.3), M.frame, x, yc, -7.15);
    if (y0 > 0) b.add(box(w, 0.04, 0.32), M.stone, xc, y0 + 0.02, -7.12);
  }
  b.add(box(OPEN.x1 - OPEN.x0, 0.02, 0.3), M.frame, (OPEN.x0 + OPEN.x1) / 2, 0.01, -7.15);
  b.add(box(0.035, WIN.y1 - WIN.y0, 0.04), M.frame, (WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, -7.2);
  // the black soffit along the kitchen's walls, the recessed lights
  b.add(box(9.7, 0.2, 1.15), M.black, -3.15, 3.1, -6.42);
  b.add(box(1.15, 0.2, 4.7), M.black, -7.42, 3.1, -3.5);
  for (const [x, z] of [[-6.6, -2.4], [-4.0, -1.4], [-1.0, -1.4], [-4.0, -5.2], [-1.0, -5.2], [2.4, -4.6], [2.4, 0.5], [6.0, -2.0], [6.0, 2.4], [2.4, 4.4], [8.6, 4.4], [8.6, -4.8]]) {
    b.add(cyl(0.065, 0.065, 0.012, 20), M.bulb, x, 3.193, z);
    b.add(cyl(0.085, 0.085, 0.008, 20), M.frame, x, 3.198, z);
  }
  // the painting on the pier: a white mount, a black hairline frame
  const ART = { x: 3.1, y: 1.62 };
  b.add(box(1.18, 1.46, 0.04), M.ceiling, ART.x, ART.y, -6.98);
  b.add(box(1.22, 1.5, 0.03), M.frame, ART.x, ART.y, -6.99);
  // the partition behind the tall black units (between the kitchen and the hall)
  b.add(box(3.4, 3.2, 0.15), M.wall, -6.3, 1.6, -0.625);
  b.add(box(18, 0.07, 0.015), M.wall, 1, 0.035, 6.992);
  b.add(box(0.015, 0.07, 14), M.wall, 9.992, 0.035, 0);
  b.build(scene, { cast: true, receive: true });
  // the roof slab over the ceiling: it casts the room's shadow (a single-sided ceiling would let the
  // sun through)
  {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(18.8, 0.3, 14.8), M.wall);
    roof.position.set(1, 3.36, 0);
    roof.castShadow = true;
    scene.add(roof);
  }
  const art = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.28), new THREE.MeshStandardMaterial({ map: TX.painting(), roughness: 0.85 }));
  art.position.set(ART.x, ART.y, -6.955);
  scene.add(art);
  onProgress(0.32);

  // ------------------------------------------------------------------ the kitchen: an L of oak, the tall black units, the island
  scene.add(P.kitchenRun(M, -7.35, 1.2, -7.0, { sinkX: (WIN.x0 + WIN.x1) / 2, gaps: [[WIN.x0 - 0.12, WIN.x1 + 0.12]], seed: 17 }));
  {
    const left = P.kitchenRun(M, 1.35, 7.0, 0, { uppers: true, seed: 29 });
    left.rotation.y = Math.PI / 2;
    left.position.set(-8.0, 0, 0);
    scene.add(left);
    const tall = P.ovenWall(M, 0, -1.7, 1.7);
    tall.rotation.y = Math.PI / 2;
    tall.position.set(-6.3, 0, -0.7);
    scene.add(tall);
    const t = builder();
    t.add(box(3.4, 0.5, 0.65), M.black, -6.3, 2.95, -1.025);
    t.build(scene);
  }
  const ISL = { x: -2.4, z: -3.6, len: 4.4, depth: 1.15, h: 0.92 };
  const isl = P.island(M, ISL.len, ISL.depth, ISL.h);
  isl.position.set(ISL.x, 0, ISL.z);
  scene.add(isl);
  for (let i = 0; i < 5; i++) {
    const c = P.barChair(M);
    c.position.set(ISL.x - 1.8 + i * 0.9, 0, ISL.z + 1.12);
    c.rotation.y = Math.PI;
    scene.add(c);
  }
  scene.add(P.pendants(M, [[-4.05, -3.68, 0.62], [-3.88, -3.5, 0.5], [-3.7, -3.72, 0.72], [-3.52, -3.52, 0.56], [-3.34, -3.7, 0.66], [-3.18, -3.5, 0.48]]));
  const vase = P.branches(M, 5);
  vase.position.set(ISL.x - 1.75, ISL.h, ISL.z - 0.1);
  scene.add(vase);
  {
    const d = builder();
    d.add(P.lathe([[0, 0], [0.1, 0], [0.16, 0.05], [0.17, 0.08], [0, 0.08]], 32), M.ceramic, ISL.x + 1.55, ISL.h, ISL.z - 0.18);
    d.add(new THREE.SphereGeometry(0.04, 16, 10), M.olive, ISL.x + 1.52, ISL.h + 0.07, ISL.z - 0.17);
    d.add(new THREE.SphereGeometry(0.035, 16, 10), M.olive, ISL.x + 1.6, ISL.h + 0.065, ISL.z - 0.2);
    d.build(scene);
  }
  onProgress(0.42);

  // ------------------------------------------------------------------ the living room
  // the sofa curves around the glass table (LIV), its seats towards the opening
  const LIV = { x: 4.4, z: -2.5 };
  {
    const s = P.sofa(M, 0, 0, 2.35, 2.05);
    s.rotation.y = -2.62;
    s.position.set(LIV.x, 0, LIV.z);
    scene.add(s);
  }
  const table = P.coffeeTable(M);
  table.position.set(LIV.x + 0.15, 0, LIV.z - 0.1);
  table.rotation.y = 0.52;
  scene.add(table);
  const lounge = P.loungeChair(M);
  lounge.position.set(LIV.x + 2.85, 0, LIV.z - 1.55);
  scene.add(lounge);
  {
    const d = builder();
    const sx = LIV.x + 3.55, sz = LIV.z - 0.75;
    d.add(cyl(0.2, 0.2, 0.02, 28), M.blackSoft, sx, 0.52, sz);
    d.add(cyl(0.025, 0.025, 0.5, 10), M.blackSoft, sx, 0.26, sz);
    d.add(cyl(0.16, 0.18, 0.02, 28), M.blackSoft, sx, 0.01, sz);
    d.add(P.lathe([[0, 0], [0.05, 0], [0.07, 0.1], [0.03, 0.22], [0, 0.22]], 20), M.ceramic, sx, 0.53, sz);
    d.build(scene);
  }
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.6), M.rug);
  rug.rotation.set(-Math.PI / 2, 0, 0.52);
  rug.position.set(LIV.x + 0.35, 0.006, LIV.z - 0.2);
  rug.receiveShadow = true;
  scene.add(rug);
  const lamp = P.floorLamp(M, 1.7, 2.1);
  lamp.position.set(9.35, 0, -3.2);
  lamp.rotation.y = -0.35;
  scene.add(lamp);
  const unit = P.lowUnit(M, 4.4);
  unit.position.set(9.77, 0, 1.6);
  scene.add(unit);
  onProgress(0.5);

  // ------------------------------------------------------------------ outside: terrace, lawn, pool, loungers, the villa, palms and trees
  const out = builder();
  out.add(P.boxUV(24, 0.1, 4.2, 3.2), M.terrace, 3, -0.06, -9.1);
  out.add(new THREE.BoxGeometry(160, 0.1, 140, 32, 1, 28), M.lawn, 10, -0.1, -84);
  const POOL = { x0: 5, x1: 15, z0: -16.6, z1: -11.8 };
  const pw = POOL.x1 - POOL.x0, pd = POOL.z1 - POOL.z0, px = (POOL.x0 + POOL.x1) / 2, pz = (POOL.z0 + POOL.z1) / 2;
  out.add(box(pw + 1.2, 0.08, 0.6), M.coping, px, -0.02, POOL.z0 - 0.3);
  out.add(box(pw + 1.2, 0.08, 0.6), M.coping, px, -0.02, POOL.z1 + 0.3);
  out.add(box(0.6, 0.08, pd), M.coping, POOL.x0 - 0.3, -0.02, pz);
  out.add(box(0.6, 0.08, pd), M.coping, POOL.x1 + 0.3, -0.02, pz);
  out.add(box(pw, 0.05, pd), M.poolTile, px, -1.4, pz);
  out.add(box(pw, 1.4, 0.05), M.poolTile, px, -0.7, POOL.z0);
  out.add(box(pw, 1.4, 0.05), M.poolTile, px, -0.7, POOL.z1);
  out.add(box(0.05, 1.4, pd), M.poolTile, POOL.x0, -0.7, pz);
  out.add(box(0.05, 1.4, pd), M.poolTile, POOL.x1, -0.7, pz);
  out.add(P.boxUV(pw + 4, 0.06, 3.0, 3.2), M.terrace, px, -0.05, POOL.z0 - 2.1);
  out.build(scene, { cast: false, receive: true });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd), M.water);
  water.rotation.x = -Math.PI / 2;
  water.position.set(px, -0.07, pz);
  M.water.map.repeat.set(pw / 2.5, pd / 2.5);
  scene.add(water);
  for (let i = 0; i < 3; i++) {
    const l = P.lounger(M);
    l.position.set(POOL.x0 + 2.2 + i * 2.3, 0, POOL.z0 - 2.0);
    l.rotation.y = Math.PI;
    scene.add(l);
  }
  const vil = P.villa(M);
  vil.position.set(18, 0, -38);
  scene.add(vil);
  // umbrella pines, palms, a row of cypresses along the lot
  for (const [x, z, h, sd] of [[1.5, -23, 11.5, 2], [27.5, -27, 12.5, 7], [-7, -36, 10.5, 9], [33, -42, 11, 11]]) {
    const up = P.umbrellaPine(M, h, sd);
    up.position.set(x, 0, z);
    scene.add(up);
  }
  scene.add(P.cypresses(M, Array.from({ length: 9 }, (_, i) => [-12.5 + (i % 2) * 0.4, -14 - i * 2.6, 7 + (i % 3) * 0.8, 0.75 + (i % 2) * 0.12])));
  for (const [x, z, h, lean, s] of [[-1.2, -12.6, 7.4, 0.35, 1], [19.5, -12.5, 7.2, -0.3, 4], [-3.5, -26, 7.8, 0.2, 5]]) {
    const pm = P.palm(M, h, lean, s);
    pm.position.set(x, 0, z);
    pm.rotation.y = s * 1.3;
    scene.add(pm);
  }
  const R = TX.rng(31);
  const hedges = [], trees = [], dark = [];
  for (let z = -9; z > -30; z -= 1.3) {
    hedges.push([-13 + R() * 0.6, 0.8 + R() * 0.3, z, 1.0 + R() * 0.3, 1.0 + R() * 0.4, 0.9]);
    hedges.push([29 + R() * 0.3, 0.8, z, 1.1, 1.3, 1.0]);
  }
  for (let x = -12; x < 2; x += 1.1) hedges.push([x, 0.5 + R() * 0.2, -17 + R() * 0.5, 0.8 + R() * 0.3, 0.7 + R() * 0.3, 0.8]);
  for (let i = 0; i < 40; i++) trees.push([-30 + R() * 90, 3 + R() * 2, -52 - R() * 20, 3.2 + R() * 2.4, 3.2 + R() * 2.2, 3.2 + R() * 2.4]);
  for (let i = 0; i < 16; i++) trees.push([R() < 0.5 ? -15 - R() * 10 : 33 + R() * 10, 3 + R() * 2, -12 - R() * 34, 2.8 + R() * 2, 3 + R() * 2, 2.8 + R() * 2]);
  for (let i = 0; i < 8; i++) trees.push([-12 + R() * 9, 2.6 + R() * 1.5, -21 - R() * 9, 2.2 + R() * 1.5, 2.6 + R() * 1.5, 2.2 + R() * 1.5]);
  for (let i = 0; i < 44; i++) dark.push([-80 + R() * 180, 3.5 + R() * 2.5, -85 - R() * 30, 6 + R() * 4, 4.5 + R() * 3, 5 + R() * 3]);
  const greens = (n, base, spread, seed) => {
    const r = TX.rng(seed);
    return Array.from({ length: n }, () => new THREE.Color(base).offsetHSL((r() - 0.5) * 0.04, (r() - 0.5) * spread, (r() - 0.5) * spread));
  };
  scene.add(P.blobs(hedges, M.hedge, 2, greens(hedges.length, '#3f6b32', 0.12, 3)), P.blobs(trees, M.tree, 2, greens(trees.length, '#4c7c3b', 0.16, 4)), P.blobs(dark, M.treeDark, 1, greens(dark.length, '#355f2d', 0.1, 5)));
  onProgress(0.62);

  // ------------------------------------------------------------------ the plan on the island: it unrolls
  const planTex = TX.blueprint(TX.drawMark);
  const PL = { x0: ISL.x - 0.56, z: ISL.z, W: 1.12, D: 0.78, y: ISL.h };
  const paperGeo = new THREE.PlaneGeometry(1, 1);
  paperGeo.rotateX(-Math.PI / 2);
  const paper = new THREE.Mesh(paperGeo, new THREE.MeshStandardMaterial({ map: planTex, roughness: 0.82 }));
  paper.receiveShadow = true;
  scene.add(paper);
  // the roll: paper outside, a spiral on its two ends
  const spiral = TX.tex(256, 256, (g, w, h) => {
    g.fillStyle = '#eceeeb';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,128,130,0.75)';
    g.lineWidth = 2.2;
    g.beginPath();
    for (let i = 0; i <= 400; i++) {
      const a = (i / 400) * Math.PI * 2 * 5, r = 18 + (i / 400) * 108;
      const x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
    g.fillStyle = '#c9cdca';
    g.beginPath();
    g.arc(w / 2, h / 2, 16, 0, Math.PI * 2);
    g.fill();
  });
  const rollMat = new THREE.MeshStandardMaterial({ color: col('#f2f3f0'), roughness: 0.85 });
  const capMat = new THREE.MeshStandardMaterial({ map: spiral, roughness: 0.9 });
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, PL.D, 48), [rollMat, capMat, capMat]);
  roll.castShadow = roll.receiveShadow = true;
  scene.add(roll);
  // a pencil and a tape measure, on the marble along the plan
  const tools = builder();
  tools.add(cyl(0.0045, 0.0045, 0.17, 6), M.black, 0, 0, 0, 0, 0, Math.PI / 2);
  tools.add(new THREE.ConeGeometry(0.0045, 0.022, 6), M.trunk, 0.096, 0, 0, 0, 0, -Math.PI / 2);
  tools.add(new THREE.ConeGeometry(0.0016, 0.006, 6), M.black, 0.11, 0, 0, 0, 0, -Math.PI / 2);
  const pencil = tools.build(new THREE.Group(), { cast: true, receive: false });
  pencil.position.set(PL.x0 + PL.W * 0.7, PL.y + 0.0046, PL.z + PL.D / 2 + 0.075);
  pencil.rotation.y = 0.14;
  scene.add(pencil);
  const tb = builder();
  tb.add(P.rbox(0.072, 0.036, 0.072, 0.014), M.ivory, 0, 0.018, 0);
  tb.add(cyl(0.013, 0.013, 0.004, 20), M.black, 0, 0.038, 0);
  tb.add(box(0.13, 0.0015, 0.019), M.blade, 0.1, 0.002, 0.012);
  const tape = tb.build(new THREE.Group(), { cast: true, receive: true });
  tape.position.set(PL.x0 + PL.W + 0.07, PL.y, PL.z - PL.D * 0.42);
  tape.rotation.y = -0.5;
  scene.add(tape);
  const uv = paperGeo.attributes.uv;
  let planK = -1;
  function setPlan(k) {
    k = clamp(k);
    if (k === planK) return;
    planK = k;
    const w = Math.max(0.0005, k * PL.W);
    paper.visible = k > 0.002;
    paper.scale.set(w, 1, PL.D);
    paper.position.set(PL.x0 + w / 2, PL.y + 0.0012, PL.z);
    // (the drawing stays put on the island: the paper shows the part of the plan already unrolled)
    for (let i = 0; i < uv.count; i++) uv.setX(i, i % 2 === 0 ? 0 : k);
    uv.needsUpdate = true;
    const r = mix(0.042, 0.016, smooth(k));
    roll.scale.set(r, 1, r);
    roll.position.set(PL.x0 + w + r * 0.55, PL.y + r, PL.z);
    roll.rotation.set(Math.PI / 2, 0, 0);
    roll.rotateY(-(k * PL.W) / 0.03);
  }
  setPlan(0);
  onProgress(0.72);

  // ------------------------------------------------------------------ light: the sun from the garden, the sky in the opening, the kitchen's warm lights
  scene.add(new THREE.HemisphereLight(col('#eaf2fb'), col('#e6dfd4'), 0.35));
  const sun = new THREE.DirectionalLight(col('#fff1df'), 3.4);
  sun.position.set(14, 30, -46);
  sun.target.position.set(2, 0, -2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 4;
  sun.shadow.intensity = 1;
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 18, bottom: -18, near: 20, far: 110 });
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun, sun.target);
  const sky = new THREE.RectAreaLight(col('#eef4ff'), 6.0, OPEN.x1 - OPEN.x0, OPEN.top);
  sky.position.set((OPEN.x0 + OPEN.x1) / 2, OPEN.top / 2, -7.05);
  sky.lookAt((OPEN.x0 + OPEN.x1) / 2, OPEN.top / 2, 0);
  scene.add(sky);
  const kwin = new THREE.RectAreaLight(col('#eef4ff'), 4.0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0);
  kwin.position.set((WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, -7.05);
  kwin.lookAt((WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, 0);
  scene.add(kwin);
  // the sunlit floor by the opening lights the ceiling and the walls back, warm
  const bounce = new THREE.RectAreaLight(col('#fff0e0'), 2.4, 5.2, 4.2);
  bounce.position.set(6.3, 0.03, -4.9);
  bounce.lookAt(6.3, 3, -4.9);
  scene.add(bounce);

  // ------------------------------------------------------------------ composer: ambient occlusion, output
  let W = 1280, H = 800, dpr = 1;
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  const renderPass = new RenderPass(scene, camera);
  const gtao = new GTAOPass(scene, camera, W, H, undefined, { radius: 0.42, distanceExponent: 2, thickness: 0.3, scale: 1.0, samples: 12, distanceFallOff: 1, screenSpaceRadius: false }, { lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 8 });
  gtao.blendIntensity = 0.9;
  // (the additive glows and the glass stay out of the AO's depth and normals; so does the sky: a
  // background texture is drawn by a plane that the normal pass would render as a black panel)
  const restoreVis = gtao.restoreVisibility.bind(gtao);
  let keptBackground = null;
  gtao.overrideVisibility = function () {
    const cache = this._visibilityCache;
    this.scene.traverse((o) => {
      cache.set(o, o.visible);
      if (o.isPoints || o.isLine || o.userData.noAO || (o.material && o.material.transparent)) o.visible = false;
    });
    keptBackground = this.scene.background;
    this.scene.background = null;
  };
  gtao.restoreVisibility = function () {
    this.scene.background = keptBackground;
    restoreVis();
  };
  composer.addPass(renderPass);
  composer.addPass(gtao);
  composer.addPass(new OutputPass());
  onProgress(0.86);

  // ------------------------------------------------------------------ per frame
  let curP = 0;
  const tgt = new THREE.Vector3(), dir = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), UPZ = new THREE.Vector3(0, 0, -1);
  function aim(pos, target, fov, pointer = { x: 0, y: 0 }) {
    camera.position.set(pos[0] + pointer.x * 0.06, pos[1] + pointer.y * 0.04, pos[2]);
    tgt.set(target[0], target[1], target[2]);
    // looking straight down at the plan: "up" on screen turns to the back wall, smoothly
    dir.subVectors(tgt, camera.position).normalize();
    const w = sstep(0.86, 0.995, -dir.y);
    camera.up.copy(UP).multiplyScalar(1 - w).addScaledVector(UPZ, w).normalize();
    camera.lookAt(tgt);
    const aspect = W / H;
    camera.fov = aspect < 1.6 ? Math.min(80, (2 * Math.atan(Math.tan((fov * Math.PI) / 360) * (1.6 / aspect)) * 180) / Math.PI) : fov;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }
  function update(state) {
    const p = clamp(state.p);
    curP = p;
    const v = CH.map((f) => f(p));
    aim([v[0], v[1], v[2]], [v[3], v[4], v[5]], v[6], state.pointer || { x: 0, y: 0 });
    setPlan(planAt(p));
  }
  function resize(w, h, d) {
    W = Math.max(1, w);
    H = Math.max(1, h);
    dpr = d || 1;
    composer.setPixelRatio(dpr);
    composer.setSize(W, H);
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
    const sz = level === 'low' ? 1024 : 2048;
    if (sun.shadow.mapSize.x !== sz) {
      sun.shadow.mapSize.set(sz, sz);
      if (sun.shadow.map) {
        sun.shadow.map.dispose();
        sun.shadow.map = null;
      }
    }
  }
  applyQuality();
  // the page's pictures: a few views rendered once at a fixed size (4:3)
  const thumbs = {};
  function snapshots() {
    const cv = renderer.domElement;
    const keep = { W, H, dpr };
    const SW = 1200, SH = 900;
    renderer.setPixelRatio(1);
    renderer.setSize(SW, SH, false);
    resize(SW, SH, 1);
    for (const [id, [pos, target, fov, k]] of Object.entries(SNAPS)) {
      setPlan(k);
      aim(pos, target, fov);
      camera.aspect = SW / SH;
      camera.fov = fov;
      camera.updateProjectionMatrix();
      composer.render();
      const c = document.createElement('canvas');
      c.width = 960;
      c.height = 720;
      c.getContext('2d').drawImage(cv, 0, 0, SW, SH, 0, 0, 960, 720);
      thumbs[id] = c.toDataURL('image/jpeg', 0.88);
    }
    renderer.setPixelRatio(keep.dpr);
    renderer.setSize(keep.W, keep.H, false);
    resize(keep.W, keep.H, keep.dpr);
  }
  async function warmup() {
    const keep = curP;
    renderer.compile(scene, camera);
    for (const p of [0.2, 0.33, 0.43, 0.6]) {
      update({ p, pointer: { x: 0, y: 0 } });
      render();
      await new Promise((r) => setTimeout(r, 0));
    }
    try {
      snapshots();
    } catch (e) {
      /* no pictures then: the page keeps its plain frames */
    }
    planK = -1;
    update({ p: keep, pointer: { x: 0, y: 0 } });
  }
  onProgress(1);
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
      return { calls: i.render.calls, triangles: i.render.triangles, textures: i.memory.textures, geometries: i.memory.geometries, programs: i.programs ? i.programs.length : 0, level };
    },
    anchors() {
      return { thumbs };
    },
    info() {
      return { p: curP, plan: planK };
    },
    // (test hooks: the scripts of the look-dev and the cost checks reach the scene through these)
    _dbg: { scene, sun, gtao, composer, renderer },
  };
}
