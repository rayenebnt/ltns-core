// Cheap stand-in for the 3D world (WORLD=stub node build.mjs): the WHOLE world contract with
// simple shapes in the right places (src/world/layout.js) and a camera that follows story.js
// PHASES, so the shell can be tested end to end and the integrator can compare.
//   createWorld({ renderer, quality, onProgress }) -> world
//   world.camera, update(state, dt, time), render(), resize(w, h, dpr), warmup(), setQuality(level),
//   stats(), anchors(), info()
// Port: a white void, the orange box frame of the cavalier over a 2-high stack (the orange hero
// container on top), the white truck box on its dark trailer. The container is lifted, carried,
// lowered on the trailer; the truck leaves east while the camera cranes from the side view to a
// straight top view; it follows the dark road ribbon (right-hand curve, then south); the camera
// flies on over the quay to a blue sea where a long box ship sails south; it rises (the callout
// anchors around the ship), through white cloud discs, over a white plane shape crossing with its
// contrails, into white.
import * as THREE from 'three';
import { PHASES, within } from '../story.js';
import { PORT, CONTAINER, ROAD, SEA, SKY } from '../world/layout.js';

export const rendererOptions = { antialias: true };

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
const ss = (t) => t * t * (3 - 2 * t);
const ph = (p, name) => within(p, PHASES[name]);
// a seeded generator: the stub is deterministic too
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

const H = CONTAINER.h, L40 = CONTAINER.l40, CW = CONTAINER.w;
const DECK = 1.35; // trailer deck height (m)
const PALETTE = [0x9a4a3a, 0x2c3e57, 0x7d848b, 0x2f6f6c, 0xb08a3e, 0xd9d6cc, 0x5a6a78];

export async function createWorld({ renderer, quality = 'high', onProgress = () => {} }) {
  onProgress(0.1);
  let level = quality;
  let W = innerWidth, Hh = innerHeight;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeef0f1);
  const camera = new THREE.PerspectiveCamera(32, W / Hh, 0.5, 12000);
  scene.add(camera);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f96, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-0.4, 1, 0.6);
  scene.add(sun);

  const lam = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
  const basic = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const mesh = (mat, sx, sy, sz, x = 0, y = 0, z = 0, parent = scene) => {
    const m = new THREE.Mesh(box, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  // ------------------------------------------------------------------ ground, quay, sea
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 3000), lam(0xeef0f1));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, ROAD.quayZ - 1500);
  scene.add(ground);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), lam(0x0d3f6e));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.5, ROAD.quayZ + 4500);
  scene.add(sea);
  mesh(lam(0xc9ccd0), 6000, 1, 3, 0, 0.1, ROAD.quayZ); // the quay edge
  onProgress(0.3);

  // ------------------------------------------------------------------ the road ribbon
  const curve = new THREE.CatmullRomCurve3(ROAD.points.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  function ribbon(width, y, color) {
    const N = 240, pos = [], idx = [];
    const t = new THREE.Vector3();
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const p = curve.getPointAt(u);
      curve.getTangentAt(u, t);
      const nx = -t.z, nz = t.x; // the normal in the map plane
      pos.push(p.x + (nx * width) / 2, y, p.z + (nz * width) / 2, p.x - (nx * width) / 2, y, p.z - (nz * width) / 2);
      if (i < N) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, basic(color, { side: THREE.DoubleSide }));
    scene.add(m);
    return m;
  }
  ribbon(ROAD.width, 0.12, 0x1e2329);
  ribbon(0.35, 0.2, 0xf4f4f0);
  // the yard's own lane from the stack to the gate
  mesh(basic(0x1e2329), PORT.gate.x - PORT.truck.x + 30, 0.1, ROAD.width, (PORT.truck.x + PORT.gate.x) / 2 - 10, 0.05, 0);
  const roadLen = curve.getLength();

  // ------------------------------------------------------------------ yard stacks (depth, roofs)
  // (seen from above only: the side view stays a white void)
  let yard = null;
  {
    const r = rng(5);
    const items = [];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 9; col++) {
        const z = -46 - row * 11;
        const x = PORT.yard.minX + 10 + col * 17;
        if (r() < 0.2) continue;
        const hgt = 1 + Math.floor(r() * 2);
        for (let k = 0; k < hgt; k++) items.push([x, H * (k + 0.5), z, PALETTE[Math.floor(r() * PALETTE.length)]]);
      }
    }
    const im = new THREE.InstancedMesh(box, lam(0xffffff), items.length);
    const m4 = new THREE.Matrix4();
    const c = new THREE.Color();
    items.forEach(([x, y, z, col], i) => {
      m4.makeScale(L40, H, CW).setPosition(x, y, z);
      im.setMatrixAt(i, m4);
      im.setColorAt(i, c.set(col));
    });
    scene.add(im);
    yard = im;
  }

  // ------------------------------------------------------------------ the stack, the hero
  mesh(lam(0x7d848b), L40, H, CW, PORT.stack.x, H / 2, PORT.stack.z); // the lower container
  const hero = mesh(lam(0xff5a1f), L40, H, CW);

  // the cavalier: an orange box frame over the stack (legs either side of the row, top beams)
  const cav = new THREE.Group();
  const cavMat = lam(0xc9471a); // (a deeper orange than the hero box, so the two read apart)
  const CAV_H = 3 * H + 3.6, CAV_L = 9.5, CAV_W = CW + 3.2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(cavMat, 0.7, CAV_H, 0.7, (sx * CAV_L) / 2, CAV_H / 2, (sz * CAV_W) / 2, cav);
  for (const sz of [-1, 1]) mesh(cavMat, CAV_L + 0.7, 0.9, 0.8, 0, CAV_H, (sz * CAV_W) / 2, cav);
  for (const sx of [-1, 1]) mesh(cavMat, 0.8, 0.9, CAV_W, (sx * CAV_L) / 2, CAV_H, 0, cav);
  const spreader = mesh(lam(0x1c2229), L40 * 0.96, 0.35, CW * 0.9, 0, 0, 0, cav);
  const cables = mesh(lam(0x1c2229), 0.12, 1, 0.12, 0, 0, 0, cav);
  scene.add(cav);

  // the truck: a white cab-over box, a dark skeletal trailer, two twistlock lights
  const truck = new THREE.Group();
  mesh(lam(0x23292f), L40 + 0.6, 0.35, CW * 0.9, 0, DECK - 0.2, 0, truck); // trailer deck
  mesh(lam(0x23292f), 0.3, 0.9, CW * 0.9, -L40 / 2 + 0.6, 0.45, 0, truck); // rear axles
  mesh(lam(0xf6f7f8), 2.4, 3.1, 2.5, L40 / 2 + 2.2, 1.95, 0, truck); // cab
  mesh(lam(0x2b3238), 3.6, 0.6, 2.4, L40 / 2 + 1.6, 0.5, 0, truck); // tractor chassis
  const lockMat = basic(0xffb000);
  for (const sx of [-1, 1]) mesh(lockMat, 0.35, 0.25, 0.35, (sx * L40) / 2 - sx * 0.3, DECK + 0.05, CW / 2 + 0.1, truck);
  scene.add(truck);
  onProgress(0.5);

  // ------------------------------------------------------------------ the ship
  const ship = new THREE.Group();
  const SL = SEA.ship.length, SB = SEA.ship.beam;
  mesh(lam(0x2b3036), SB, 14, SL * 0.86, 0, 7, -SL * 0.07, ship); // hull
  const bow = mesh(lam(0x2b3036), SB * 0.71, 14, SB * 0.71, 0, 7, SL * 0.36, ship); // a rotated block: the bow
  bow.rotation.y = Math.PI / 4;
  mesh(lam(0xe9ebec), SB * 0.8, 12, 14, 0, 20, -SL * 0.4, ship); // the bridge (stern, north)
  {
    const r = rng(17);
    const bays = 16, per = 4;
    const im = new THREE.InstancedMesh(box, lam(0xffffff), bays * per);
    const m4 = new THREE.Matrix4();
    const c = new THREE.Color();
    let k = 0;
    for (let b = 0; b < bays; b++) {
      for (let j = 0; j < per; j++) {
        const z = -SL * 0.32 + b * ((SL * 0.62) / bays);
        const x = -SB * 0.39 + j * (SB * 0.26);
        m4.makeScale(SB * 0.24, 6 + r() * 4, L40 * 0.95).setPosition(x, 17, z);
        im.setMatrixAt(k, m4);
        const hot = b === 7 && j === 1; // our orange box among them
        im.setColorAt(k, c.set(hot ? 0xff5a1f : PALETTE[Math.floor(r() * PALETTE.length)]));
        k++;
      }
    }
    ship.add(im);
  }
  const wake = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), basic(0xffffff, { transparent: true, opacity: 0.32, depthWrite: false }));
  wake.rotation.x = -Math.PI / 2;
  wake.scale.set(SB * 1.4, 900, 1);
  wake.position.set(0, 0.3, -SL / 2 - 450);
  ship.add(wake);
  scene.add(ship);
  const shipZ = (p) => SEA.ship.z + 110 * (p - 0.42);

  // ------------------------------------------------------------------ clouds (white discs)
  const cloudGroup = new THREE.Group();
  {
    const r = rng(29);
    const disc = new THREE.CircleGeometry(1, 28);
    const mat = basic(0xffffff, { transparent: true, opacity: 0.55, depthWrite: false });
    for (let i = 0; i < 90; i++) {
      const m = new THREE.Mesh(disc, mat);
      const rad = 90 + r() * 260;
      m.scale.set(rad, rad, 1);
      m.rotation.x = -Math.PI / 2;
      m.position.set(SEA.ship.x + (r() - 0.5) * 2600, mix(SKY.cloudBase, SKY.cloudTop, r()), SEA.ship.z + 60 + (r() - 0.5) * 2200);
      cloudGroup.add(m);
    }
  }
  scene.add(cloudGroup);

  // ------------------------------------------------------------------ the plane and its contrails
  const plane = new THREE.Group();
  const pm = lam(0xffffff);
  mesh(pm, 62, 6, 6, 0, 0, 0, plane); // fuselage (along X: it flies east)
  mesh(pm, 12, 1.2, 66, 4, 0, 0, plane); // wings
  mesh(pm, 6, 1, 22, -27, 0, 0, plane); // tailplane
  mesh(basic(0xff5a1f), 6, 6.2, 6.2, 31, 0, 0, plane); // a touch of orange at the nose
  const trailMat = basic(0xffffff, { transparent: true, opacity: 0.6, depthWrite: false });
  for (const sz of [-1, 1]) mesh(trailMat, 700, 0.5, 3, -380, 0, sz * 14, plane);
  scene.add(plane);

  // ------------------------------------------------------------------ white-out (in front of the camera)
  const white = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), basic(0xffffff, { transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
  white.position.z = -1;
  white.renderOrder = 10;
  camera.add(white);
  onProgress(0.8);

  // ------------------------------------------------------------------ choreography (pure functions of p)
  const v3 = new THREE.Vector3(), tgt = new THREE.Vector3(), up = new THREE.Vector3(), tan = new THREE.Vector3();
  const pathLen = PORT.gate.x - PORT.truck.x + roadLen;
  // the truck's position and heading along its path (yard lane, then the road)
  function truckAt(p, out) {
    const k = within(p, [PHASES.truckGo[0], 0.46]);
    // eased start, then a steady drive
    const d = pathLen * (k < 0.25 ? 2 * k * k : k - 0.125) / 0.875;
    const lane = PORT.gate.x - PORT.truck.x;
    if (d <= lane) {
      out.set(PORT.truck.x + d, 0, 0);
      return 0;
    }
    const u = clamp((d - lane) / roadLen);
    out.copy(curve.getPointAt(u));
    curve.getTangentAt(u, tan);
    return Math.atan2(-tan.z, tan.x);
  }
  const truckPos = new THREE.Vector3();
  let truckYaw = 0;
  let stage = 'port';
  let curP = 0;
  const camState = { h: 0 };

  function update(state, dt, time) {
    const p = clamp(state.p || 0);
    curP = p;
    // ---- the port
    const lift = ss(ph(p, 'lift')), carry = ss(ph(p, 'carry')), lower = ss(ph(p, 'lower'));
    const cavX = mix(PORT.stack.x, PORT.truck.x, carry) - 16 * ss(ph(p, 'truckGo'));
    truckYaw = truckAt(p, truckPos);
    truck.position.copy(truckPos);
    truck.rotation.y = truckYaw;
    const onTrailer = p >= PHASES.lower[1];
    if (!onTrailer) {
      const yStack = H + H / 2, yHigh = 2 * H + 1.2 + H / 2, yDeck = DECK + H / 2;
      hero.position.set(mix(PORT.stack.x, PORT.truck.x, carry), lower > 0 ? mix(yHigh, yDeck, lower) : mix(yStack, yHigh, lift), 0);
      hero.rotation.set(0, 0, 0);
    } else {
      hero.position.set(truckPos.x, DECK + H / 2, truckPos.z);
      hero.rotation.y = truckYaw;
    }
    lockMat.color.set(p > PHASES.lower[0] + 0.85 * (PHASES.lower[1] - PHASES.lower[0]) ? 0x2fd36b : 0xffb000);
    cav.position.set(cavX, 0, 0);
    const spY = onTrailer ? mix(DECK + H + 0.4, CAV_H - 1.2, ss(within(p, [PHASES.lower[1], PHASES.lower[1] + 0.02]))) : hero.position.y + H / 2 + 0.2;
    spreader.position.set(onTrailer ? 0 : hero.position.x - cavX, spY, 0);
    cables.scale.y = Math.max(0.1, CAV_H - spY);
    cables.position.set(spreader.position.x, (CAV_H + spY) / 2, 0);

    // ---- the sea, the sky
    ship.position.set(SEA.ship.x, 0, shipZ(p));
    const pk = ph(p, 'plane');
    plane.visible = pk > 0 && pk < 1;
    plane.position.set(SEA.ship.x + mix(-1100, 1100, pk), SKY.planeAltitude, shipZ(p) + mix(160, -160, pk));
    plane.rotation.y = 0.15;
    cloudGroup.visible = p > 0.6;
    yard.visible = p > PHASES.crane[0] + 0.025;
    white.material.opacity = ss(ph(p, 'whiteout'));

    // ---- the camera
    const crane = ss(ph(p, 'crane'));
    const coast = ss(ph(p, 'coast'));
    // port focus: between the stack and the truck, then following the truck
    const fx = Math.max(11, truckPos.x - 11);
    if (p < PHASES.crane[0]) {
      tgt.set(fx - 7, 5, 0);
      camera.position.set(fx - 7, 9, 74);
      camera.up.set(0, 1, 0);
      camera.fov = 32;
      camState.h = 7.5;
    } else {
      // the crane: elevation 6° -> 90°, distance 50 -> 150 m, the look target on the truck;
      // then the top view follows the truck, flies to the ship and rises
      const h = monoH(p);
      const shipT = v3.set(SEA.ship.x, 0, shipZ(p) + 20);
      const tx = mix(truckPos.x, shipT.x, coast), tz = mix(truckPos.z, shipT.z, coast);
      if (crane < 1) {
        const th = mix(0.054, Math.PI / 2, crane), d = mix(74, h, crane);
        tgt.set(mix(fx - 7, tx, crane), mix(5, 0, crane), mix(0, tz, crane));
        camera.position.set(tgt.x, tgt.y + d * Math.sin(th), tgt.z + d * Math.cos(th) + 0.001);
        up.set(0, 1, 0).lerp(v3.set(0, 0, -1), crane).normalize();
        camera.up.copy(up);
      } else {
        tgt.set(tx, 0, tz);
        camera.position.set(tx, h, tz + 0.001);
        camera.up.set(0, 0, -1);
      }
      camera.fov = mix(32, 35, crane);
      camState.h = camera.position.y;
    }
    // a few pixels of parallax (0 in ?capture: the shell sends a neutral pointer)
    const px = state.pointer ? state.pointer.x : 0, py = state.pointer ? state.pointer.y : 0;
    const k = 0.006 * Math.max(8, camState.h);
    camera.position.x += px * k;
    camera.position.z -= py * k * (crane > 0.5 ? 1 : 0);
    camera.position.y += py * k * (crane > 0.5 ? 0 : 0.5);
    camera.near = Math.max(0.5, camState.h * 0.02);
    camera.far = Math.max(4000, camState.h * 4 + 4000);
    camera.lookAt(tgt);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    // the white-out plane covers the view
    const fh = 2 * Math.tan((camera.fov * Math.PI) / 360);
    white.scale.set((fh * camera.aspect) / 3.5, fh / 3.5, 1);

    stage = p < 0.22 ? 'port' : p < 0.45 ? 'road' : p < 0.74 ? 'sea' : 'air';
    sea.material.color.setHSL(0.58, 0.78, 0.22 + 0.02 * Math.sin(time * 0.6)); // a slow idle shimmer
  }
  // the top-view height: a smooth function through the story's keys
  const HK = [[PHASES.crane[1], 150], [PHASES.road[1], 175], [PHASES.coast[1], 330], [PHASES.ship[1], 370], [PHASES.rise[1], 950], [PHASES.clouds[1], 2700], [PHASES.plane[1], 3300], [1, 3400]];
  function monoH(p) {
    if (p <= HK[0][0]) return HK[0][1];
    for (let i = 0; i < HK.length - 1; i++) {
      const [a, ha] = HK[i], [b, hb] = HK[i + 1];
      if (p <= b) return mix(ha, hb, ss((p - a) / (b - a)));
    }
    return HK[HK.length - 1][1];
  }

  // ------------------------------------------------------------------ anchors (CSS px)
  const P = new THREE.Vector3();
  function project(x, y, z) {
    P.set(x, y, z).project(camera);
    const vis = P.z > -1 && P.z < 1;
    return { x: ((P.x + 1) / 2) * W, y: ((1 - P.y) / 2) * Hh, front: vis };
  }
  const onScreen = (q, m = 0) => q.front && q.x >= -m && q.x <= W + m && q.y >= -m && q.y <= Hh + m;
  function anchors() {
    const sz = shipZ(curP), sx = SEA.ship.x, deck = 20;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, front = true;
    for (const [dx, dz] of [[-SB / 2, -SL / 2], [SB / 2, -SL / 2], [SB / 2, SL / 2], [-SB / 2, SL / 2]]) {
      const q = project(sx + dx, deck, sz + dz);
      front = front && q.front;
      x0 = Math.min(x0, q.x);
      y0 = Math.min(y0, q.y);
      x1 = Math.max(x1, q.x);
      y1 = Math.max(y1, q.y);
    }
    const shipVis = front && stage !== 'port' && x1 > 0 && x0 < W && y1 > 0 && y0 < Hh && curP > 0.4;
    // five attach points along the hull, alternating sides (stern to bow)
    const pts = [['left', -0.3], ['right', -0.16], ['left', 0.06], ['right', 0.2], ['left', 0.36]];
    const callouts = pts.map(([side, f]) => {
      const q = project(sx + (side === 'left' ? -1 : 1) * (SB / 2 + 4), deck, sz + f * SL);
      return { x: q.x, y: q.y, side, visible: shipVis && onScreen(q, -4) && curP > 0.6 && curP < 0.78 };
    });
    const t = project(truckPos.x, 3, truckPos.z);
    const pl = project(plane.position.x, plane.position.y, plane.position.z);
    return {
      ship: { x: x0, y: y0, w: x1 - x0, h: y1 - y0, visible: shipVis },
      callouts,
      truck: { x: t.x, y: t.y, visible: onScreen(t) && curP < 0.46 },
      plane: { x: pl.x, y: pl.y, visible: plane.visible && onScreen(pl) },
    };
  }

  // ------------------------------------------------------------------ the contract
  function resize(w, h, dpr) {
    W = w;
    Hh = h;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize(W, Hh, renderer.getPixelRatio());
  onProgress(1);

  return {
    camera,
    update,
    render() {
      renderer.render(scene, camera);
    },
    resize,
    async warmup() {
      for (const p of [0.02, 0.2, 0.36, 0.55, 0.69, 0.84, 0.92]) {
        update({ p, pointer: { x: 0, y: 0 } }, 1, 0);
        renderer.render(scene, camera);
      }
    },
    setQuality(lv) {
      level = lv;
    },
    stats() {
      const i = renderer.info;
      return { calls: i.render.calls, triangles: i.render.triangles, textures: i.memory.textures, geometries: i.memory.geometries, programs: i.programs ? i.programs.length : 0, stage, level };
    },
    anchors,
    info() {
      return { stage };
    },
  };
}
