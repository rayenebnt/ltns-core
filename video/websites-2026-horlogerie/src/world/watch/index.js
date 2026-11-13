// BALANCIER watch: an original 40 mm steel three-hand automatic, fully procedural (no file is loaded).
//
//   const watch = await createWatch({ renderer, quality: 'high', envMap });   // ~0.2–0.6 s (textures shared
//   scene.add(watch.group);                                                   // by every watch of that quality)
//   watch.pose(e, time?)   e 0 = assembled … 1 = exploded along local Z (layout.js PARTS z), staggered: the
//                          movement stacks into the case from the back, then dial and hands from the front,
//                          then caseback, bezel and crystal, the bracelet halves last. time (optional, s): a
//                          gentle float of the parts, fading in near e = 1. parts[i].anchorLocal follows.
//   watch.bracelet(b)      b 0 = straight strips at the line's ends, 1 = mounted, closed worn loop (clasp behind
//                          the case), 2 = open and resting on the floor plane z = watch.floorZ (side view).
//   watch.braceletFor(e)   the b that goes with pose(e) while the halves fly in (call bracelet(braceletFor(e))).
//   watch.stripYaw         rad (default 0.85): the straight strips (b = 0) turn to face a camera on the +X/+Z side.
//   watch.setTime(t)       t s on the dial from layout SHOWN_TIME (seconds hand: 8 ticks a second).
//   watch.setMovement(t)   balance at 4 Hz (±220°, watch.balanceAmplitude), hairspring breathing, fork flicking,
//                          escape wheel stepping 8 times a second, train, rotor turning slowly.
//   watch.setQuality(lvl)  'low' | 'medium' | 'high' | 'max': rebuilds geometry in place (~120–220 ms, meshes and
//                          materials kept, so material swaps by kind survive; textures stay as created).
//   watch.meshes()         every Mesh / InstancedMesh: userData.kind, .variant, .part, .internal (hidden inner faces).
//   watch.materials        the steel-mode materials by key; watch.setEnvMap(env), watch.stats(), watch.dispose().
//
// Frame: +Z out of the dial, +Y 12 o'clock, +X 3 o'clock, mm, origin at the case centre.
// Kinds (mesh.userData.kind): steelPolished, steelBrushed, hands, ceramic, crystal (glass and caseback window),
// dial, print, lume, rhodium, gilt (wheels, chatons, balance, engraved rotor rim), ruby (jewels, pallet stones;
// the painted seconds tip has userData.paint = true), blued (screws, hairspring).
import * as THREE from 'three';
import { PARTS, SHOWN_TIME, COLORS, WATCH } from '../layout.js';
import { TAU, smooth, smoother, clamp01 } from './geo.js';
import { Z, buildCaseMiddle, buildBezel, buildCrystal, buildCaseback } from './case.js';
import { buildDial, buildHands } from './dial.js';
import { MV, buildMainplate, buildTrain, buildBalance, buildBridges, buildRotor, movementAO } from './movement.js';
import { BraceletHalf, linkGeometries, FLOOR } from './bracelet.js';
import { loadFonts, dialPrintTexture, sunburstNormal, bezelTextures, casebackTextures, rotorTextures, perlageNormal, cotesNormal } from './textures.js';

const QUALITY = {
  low: { seg: 64, springSeg: 22, screwSeg: 8, linkSeg: 1, tex: 1024, ntex: 512 },
  medium: { seg: 96, springSeg: 30, screwSeg: 10, linkSeg: 2, tex: 1024, ntex: 512 },
  high: { seg: 128, springSeg: 40, screwSeg: 12, linkSeg: 2, tex: 2048, ntex: 1024 },
  max: { seg: 192, springSeg: 56, screwSeg: 16, linkSeg: 3, tex: 2048, ntex: 1024 },
};

// texture uv spans (mm): planar uv = xy / D + 0.5
const D = { dial: 31, bezel: 39.2, caseback: 34.4, movement: 28, rotor: 26 };

// exploded-line stagger: [e0, e1] = assembled for e ≤ e0, exploded for e ≥ e1
const WINDOWS = {
  mainplate: [0.7, 1.0], train: [0.64, 0.95], balance: [0.58, 0.9], bridges: [0.52, 0.85], rotor: [0.46, 0.8],
  dial: [0.4, 0.74], hands: [0.34, 0.68], caseback: [0.27, 0.6], bezel: [0.25, 0.58], crystal: [0.2, 0.53],
  braceletFront: [0.0, 0.34], braceletBack: [0.02, 0.36], caseMiddle: [0, 1],
};

function makeMaterials(T, envMap) {
  const env = envMap ? { envMap } : {};
  const phys = (o) => new THREE.MeshPhysicalMaterial({ ...env, ...o });
  const steel = '#cfd4da';
  const M = {};
  M.steelPolished = phys({ color: steel, metalness: 1, roughness: 0.055 });
  M.hands = phys({ color: '#dde1e6', metalness: 1, roughness: 0.045 });
  M.steelBrushed = phys({ color: '#c2c8cf', metalness: 1, roughness: 0.3, anisotropy: 0.75 });
  M.steelBrushedPlain = M.steelBrushed;
  M.steelBrushedLinks = phys({ color: '#c0c6cd', metalness: 1, roughness: 0.32, anisotropy: 0.7 });
  M.snailed = phys({ color: '#cdd2d8', metalness: 1, roughness: 0.16, anisotropy: 0.6 });
  M.casebackEngraved = phys({ color: '#ffffff', map: T.caseback.map, bumpMap: T.caseback.bump, bumpScale: 1.6, metalness: 1, roughness: 0.3, anisotropy: 0.6 });
  M.casebackEngraved.color.set('#c6ccd3');
  M.ceramic = phys({ color: '#ffffff', map: T.bezel.map, bumpMap: T.bezel.bump, bumpScale: 2.2, roughnessMap: T.bezel.rough, roughness: 0.55, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, specularIntensity: 0.7 });
  M.crystal = phys({
    color: '#000000', metalness: 0, roughness: 0.0, ior: 1.77, specularIntensity: 1, specularColor: '#eef0ff',
    transparent: true, opacity: 0.16, depthWrite: false, emissive: '#2a2d5c', emissiveIntensity: 0.02, envMapIntensity: 0.3,
    iridescence: 0.15, iridescenceIOR: 1.45, iridescenceThicknessRange: [280, 420],
  });
  M.crystal.blending = THREE.CustomBlending;
  M.crystal.blendSrc = THREE.OneFactor;
  M.crystal.blendDst = THREE.OneMinusSrcAlphaFactor;
  M.dial = phys({ color: COLORS.dialBlue, vertexColors: true, metalness: 0.82, roughness: 0.2, anisotropy: 0.95, normalMap: T.sunburst, normalScale: new THREE.Vector2(0.35, 0.35), clearcoat: 0.7, clearcoatRoughness: 0.06 });
  M.dialFlange = phys({ color: '#163070', metalness: 0.3, roughness: 0.55 });
  M.print = new THREE.MeshStandardMaterial({ ...env, color: '#ffffff', map: T.print, transparent: true, roughness: 0.42, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  M.handShadow = new THREE.MeshBasicMaterial({ color: '#05070c', transparent: true, opacity: 0.4, depthWrite: false });
  M.lume = new THREE.MeshStandardMaterial({ ...env, color: '#ebe5cf', roughness: 0.62, metalness: 0, emissive: '#bfe6c8', emissiveIntensity: 0.07 });
  const rh = (map, extra = {}) => phys({ color: '#dce0e5', metalness: 1, roughness: 0.18, normalMap: map, normalScale: new THREE.Vector2(0.6, 0.6), ...extra });
  M.perlage = rh(T.perlage, { roughness: 0.26, aoMap: T.ao, aoMapIntensity: 1 });
  M.cotes = rh(T.cotes, { roughness: 0.15, normalScale: new THREE.Vector2(0.4, 0.4) });
  M.cotesRotor = rh(T.cotesRotor, { roughness: 0.15, normalScale: new THREE.Vector2(0.4, 0.4) });
  M.rotorEngraved = phys({ color: COLORS.gilt, map: T.rotor.map, bumpMap: T.rotor.bump, bumpScale: 1.4, metalness: 1, roughness: 0.2 });
  M.rhodium = M.perlage;
  M.gilt = phys({ color: COLORS.gilt, metalness: 1, roughness: 0.24 });
  M.ruby = phys({ color: '#9e0a26', metalness: 0, roughness: 0.03, ior: 1.77, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.02, emissive: '#5a0414', emissiveIntensity: 0.55, sheen: 0.4, sheenColor: '#ff5a6e' });
  M.paint = phys({ color: COLORS.ruby, metalness: 0, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.1 });
  M.blued = phys({ color: '#1d3fa8', metalness: 1, roughness: 0.16, iridescence: 0.25, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 380] });
  M.spring = phys({ color: '#3c5fbf', metalness: 1, roughness: 0.22 });
  return M;
}

const texCache = new Map(); // quality level → { T, refs }
function acquireTextures(level, maxAniso) {
  const hit = texCache.get(level);
  if (hit) { hit.refs++; return hit.T; }
  const Q = QUALITY[level];
  const big = level === 'max' ? Q.tex : Q.ntex;
  const T = {
    print: dialPrintTexture(Q.tex, D.dial),
    sunburst: sunburstNormal(Q.tex),
    bezel: bezelTextures(big, D.bezel, WATCH.bezel.insertInner / 2, WATCH.bezel.insertOuter / 2),
    caseback: casebackTextures(Q.ntex, D.caseback, 14.75),
    rotor: rotorTextures(Q.ntex, D.rotor, 11.45),
    perlage: perlageNormal(Q.ntex / 2, 9),
    ao: movementAO(Q.ntex / 2, D.movement),
    cotes: cotesNormal(Q.ntex / 2, 14),
  };
  T.perlage.repeat.set(4, 4);
  T.cotes.repeat.set(1.45, 1.45);
  T.cotes.rotation = 0.42;
  T.cotesRotor = T.cotes.clone();
  T.cotesRotor.repeat.set(1.45, 1.45);
  T.cotesRotor.rotation = Math.PI / 2;
  T.cotesRotor.needsUpdate = true;
  T.list = [...new Set([T.ao, T.print, T.sunburst, T.bezel.map, T.bezel.bump, T.bezel.rough, T.caseback.map, T.caseback.bump, T.rotor.map, T.rotor.bump, T.perlage, T.cotes, T.cotesRotor])];
  for (const t of T.list) t.anisotropy = Math.min(maxAniso, t.anisotropy || 8);
  texCache.set(level, { T, refs: 1 });
  return T;
}
function releaseTextures(T) {
  for (const [lv, v] of texCache) {
    if (v.T !== T) continue;
    if (--v.refs <= 0) { for (const t of T.list) t.dispose(); texCache.delete(lv); }
  }
}

const VARIANT_KIND = { steelBrushedPlain: 'steelBrushed', steelBrushedLinks: 'steelBrushed', snailed: 'steelBrushed', casebackEngraved: 'steelBrushed', dialFlange: 'dial', perlage: 'rhodium', cotes: 'rhodium', cotesRotor: 'rhodium', rotorEngraved: 'gilt', paint: 'ruby', spring: 'blued' };

export async function createWatch({ renderer, quality = 'high', envMap = null } = {}) {
  let level = QUALITY[quality] ? quality : 'high';
  let Q = QUALITY[level];
  await loadFonts();
  const maxAniso = renderer && renderer.capabilities ? renderer.capabilities.getMaxAnisotropy() : 8;
  // textures (sizes from the creation quality), shared by every watch made at that quality (the steel and
  // sapphire twins): drawn once, disposed with the last watch that uses them
  const T = acquireTextures(level, maxAniso);
  const allTex = T.list;
  const M = makeMaterials(T, envMap);
  if (level === 'low') {
    // cheaper shading on weak GPUs (decided at creation: no program change later)
    M.crystal.iridescence = 0; M.blued.iridescence = 0; M.ruby.sheen = 0; M.dial.clearcoat = 0; M.ceramic.clearcoat = 0.5;
  }

  const group = new THREE.Group();
  group.name = 'watch';
  const registry = new Map(); // key → mesh
  let rebuilding = false;
  const subs = {};
  // ctx.add: creates the mesh (first build) or swaps its geometry (quality rebuild)
  const ctx = {
    Q, D,
    add(key, kind, geometry, parent, matKey = kind, instances = 0) {
      const old = registry.get(key);
      if (old) {
        if (old.geometry !== geometry) old.geometry.dispose();
        old.geometry = geometry;
        return old;
      }
      const mat = M[matKey] || M[kind];
      const mesh = instances > 0 ? new THREE.InstancedMesh(geometry, mat, instances) : new THREE.Mesh(geometry, mat);
      if (instances > 0) { mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); }
      mesh.name = key;
      mesh.userData.kind = VARIANT_KIND[matKey] || kind;
      mesh.userData.variant = matKey;
      if (matKey === 'paint') mesh.userData.paint = true;
      mesh.userData.part = key.split('.')[0].replace(/^case$/, 'caseMiddle');
      registry.set(key, mesh);
      parent.add(mesh);
      return mesh;
    },
    sub(parent, name, z = 0) {
      const id = `${parent.name}.${name}`;
      if (rebuilding && subs[id]) return subs[id];
      const g = new THREE.Group();
      g.name = id;
      g.position.z = z;
      parent.add(g);
      subs[id] = g;
      return g;
    },
  };

  // the parts, in layout PARTS order
  const objects = {};
  for (const p of PARTS) {
    const o = new THREE.Group();
    o.name = p.id;
    o.position.z = Z[p.id];
    group.add(o);
    objects[p.id] = o;
  }
  let hands, train, balance, rotorSpin, halves;
  function build() {
    ctx.Q = Q;
    buildCaseMiddle(ctx, objects.caseMiddle);
    buildBezel(ctx, objects.bezel);
    buildCrystal(ctx, objects.crystal);
    buildCaseback(ctx, objects.caseback);
    buildDial(ctx, objects.dial);
    hands = buildHands(ctx, objects.hands);
    buildMainplate(ctx, objects.mainplate);
    train = buildTrain(ctx, objects.train);
    balance = buildBalance(ctx, objects.balance);
    buildBridges(ctx, objects.bridges);
    rotorSpin = buildRotor(ctx, objects.rotor);
    const geos = linkGeometries(Q);
    if (!halves) {
      halves = {
        front: new BraceletHalf({ front: true, links: WATCH.bracelet.links, clasp: false, geos, parent: objects.braceletFront, add: ctx.add, keyPrefix: 'braceletFront' }),
        back: new BraceletHalf({ front: false, links: 6, clasp: true, geos, parent: objects.braceletBack, add: ctx.add, keyPrefix: 'braceletBack' }),
      };
    } else {
      for (const pre of ['braceletFront', 'braceletBack']) {
        ctx.add(`${pre}.outer`, 'steelBrushed', geos.outer, null);
        ctx.add(`${pre}.centre`, 'steelPolished', geos.centre, null);
      }
      ctx.add('braceletBack.clasp', 'steelPolished', geos.cover, null);
      ctx.add('braceletBack.blade', 'steelBrushed', geos.blade, null);
    }
  }
  build();

  // anchors (exploded pose, part space): top edge for 'above', bottom edge for 'below'
  const halfFrontBottom = halves.front.len / 2 + 2.5;
  const RAD = {
    braceletFront: -halfFrontBottom, crystal: 15.75, bezel: -20.35, dial: 15.95, hands: -15.0, caseMiddle: 23.9,
    mainplate: -13.15, train: MV.barrel[1] + 5.25, balance: MV.balance[1] - 4.5, bridges: MV.barrel[1] + 5.95,
    rotor: -12.7, caseback: 17.95, braceletBack: -(halves.back.len / 2 + 2.5),
  };
  const parts = PARTS.map((p) => ({ id: p.id, object: objects[p.id], anchorLocal: new THREE.Vector3(0, RAD[p.id], 0), label: p.label }));
  const BASE_ANCHOR = { caseback: RAD.caseback, bezel: RAD.bezel };
  const partById = Object.fromEntries(parts.map((p) => [p.id, p]));

  // ---------------------------------------------------------------------------------------------
  let lastE = null, lastFloat = null;
  function pose(e, time = null) {
    e = clamp01(e);
    const fl = time === null ? 0 : smooth((e - 0.82) / 0.18);
    if (e === lastE && fl === 0 && lastFloat === 0) return;
    lastE = e; lastFloat = fl;
    PARTS.forEach((p, i) => {
      const o = objects[p.id];
      const [e0, e1] = WINDOWS[p.id];
      const x = p.id === 'caseMiddle' ? e : smoother((e - e0) / (e1 - e0));
      o.position.set(0, 0, Z[p.id] + (p.z - Z[p.id]) * x);
      o.rotation.set(0, 0, 0);
      if (p.id === 'caseback') o.rotation.z = 1.6 * smooth(x * 1.6);
      if (p.id === 'bezel') o.rotation.z = -0.5 * smooth(x * 1.5);
      if (p.id === 'hands') {
        // the soft hand shadows belong to the dial: only while the hands sit on it
        const k = 1 - smooth(x / 0.03);
        for (const sh of Object.values(hands.shadows)) { sh.visible = k > 0.001; sh.material.opacity = 0.42 * k; }
      }
      if (BASE_ANCHOR[p.id] !== undefined) {
        // keep the label anchor at the top / bottom of the part while it spins about its axis
        const r = BASE_ANCHOR[p.id], a = o.rotation.z;
        partById[p.id].anchorLocal.set(r * Math.sin(a), r * Math.cos(a), 0);
      }
      if (fl > 0) {
        const ph = i * 1.37;
        o.position.y += 0.9 * fl * Math.sin(time * 0.75 + ph);
        o.position.z += 0.6 * fl * Math.sin(time * 0.52 + ph * 0.7);
        o.rotation.x += 0.03 * fl * Math.sin(time * 0.61 + ph);
        o.rotation.y += 0.025 * fl * Math.sin(time * 0.47 + ph * 1.3);
      }
    });
  }
  const braceletFor = (e) => 1 - smooth(clamp01(e) / 0.3);
  let stripYaw = 0.85; // rad: the straight strips (b = 0) face +X a little (a camera on the +X, +Z side)
  function bracelet(b) {
    b = Math.max(0, Math.min(2, b));
    halves.front.update(b, stripYaw);
    halves.back.update(b, stripYaw);
  }

  // ---------------------------------------------------------------------------------------------
  const T0 = SHOWN_TIME.hours * 3600 + SHOWN_TIME.minutes * 60 + SHOWN_TIME.seconds;
  const handTips = { hour: WATCH.hands.hour, minute: WATCH.hands.minute, seconds: WATCH.hands.seconds };
  function setTime(t) {
    const s = T0 + t;
    const h = ((s / 43200) % 1 + 1) % 1, m = ((s / 3600) % 1 + 1) % 1;
    const ticks = Math.floor(s * 8);
    const frac = s * 8 - ticks;
    const sec = (((ticks + smooth(frac / 0.32)) / 480) % 1 + 1) % 1;
    hands.hour.rotation.z = -h * TAU;
    hands.minute.rotation.z = -m * TAU;
    hands.seconds.rotation.z = -sec * TAU;
    // the soft shadows keep a fixed offset on the dial (light from above 12 and a little from the left)
    for (const [k, d] of [['hour', 0.28], ['minute', 0.45], ['seconds', 0.62]]) {
      const a = hands[k].rotation.z, dx = 0.35 * d, dy = -d;
      hands.shadows[k].position.set(dx * Math.cos(a) + dy * Math.sin(a), -dx * Math.sin(a) + dy * Math.cos(a), 0);
    }
    // the hands' lowest point (label 'below')
    let minY = -1.15;
    for (const [k, a] of [['hour', h], ['minute', m], ['seconds', sec]]) {
      minY = Math.min(minY, handTips[k] * Math.cos(a * TAU));
      if (k === 'seconds') minY = Math.min(minY, -3.35 * Math.cos(a * TAU));
    }
    partById.hands.anchorLocal.set(0, minY - 0.2, 0);
  }

  let AMP = (220 / 180) * Math.PI;
  const rotorOutline = [];
  for (let i = 0; i <= 16; i++) { const a = 0.03 * Math.PI + (i / 16) * 0.94 * Math.PI; rotorOutline.push([12.65 * Math.cos(a), 12.65 * Math.sin(a)]); }
  for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI; rotorOutline.push([2.6 * Math.cos(a), 2.6 * Math.sin(a)]); }
  function setMovement(t) {
    const w = 8 * Math.PI; // 4 Hz
    const theta = AMP * Math.sin(w * t);
    balance.wheel.rotation.z = theta;
    balance.spring.update(theta);
    balance.fork.rotation.z = 0.15 * Math.tanh(Math.sin(w * t) * 6);
    // 8 beats a second: the escape wheel steps half a tooth (1/40 turn) at each one
    const beats = 8 * t;
    const bi = Math.floor(beats);
    const step = bi + smooth((beats - bi) / 0.16);
    train.escape.rotation.z = -(step / 40) * TAU;
    train.fourth.rotation.z = (step / 480) * TAU; // one turn a minute
    train.third.rotation.z = -(step / 3600) * TAU;
    train.centre.rotation.z = (t / 3600) * TAU;
    train.barrel.rotation.z = -(t / 28800) * TAU;
    const ra = 0.42 * t + 0.55 * Math.sin(0.33 * t);
    rotorSpin.rotation.z = ra;
    const c = Math.cos(ra), s = Math.sin(ra);
    let minY = Infinity, mx = 0;
    for (const [x, y] of rotorOutline) { const yy = x * s + y * c; if (yy < minY) { minY = yy; mx = x * c - y * s; } }
    partById.rotor.anchorLocal.set(mx, minY - 0.2, 0);
  }

  function setQuality(lvl) {
    if (!QUALITY[lvl] || lvl === level) return;
    level = lvl;
    Q = QUALITY[lvl];
    rebuilding = true;
    const keepSpring = balance.spring;
    build();
    rebuilding = false;
    // the new hairspring updater owns the swapped geometry
    if (keepSpring !== balance.spring) balance.spring.last = null;
    halves.front.lastB = null; halves.back.lastB = null;
    bracelet(curB);
    setMovement(curT);
  }

  // keep the last values so that a quality rebuild restores the pose
  let curB = 1, curT = 0;
  const api = {
    group, parts,
    pose,
    bracelet: (b) => { curB = b; bracelet(b); },
    braceletFor,
    setTime,
    setMovement: (t) => { curT = t; setMovement(t); },
    setQuality,
    setEnvMap(env) {
      for (const m of new Set(Object.values(M))) { m.envMap = env; m.needsUpdate = true; }
    },
    meshes: () => [...registry.values()],
    materials: M,
    floorZ: FLOOR.z - 1.65, // local z of the floor under the open bracelet (b = 2)
    get balanceAmplitude() { return AMP; },
    set balanceAmplitude(v) { AMP = v; setMovement(curT); },
    get stripYaw() { return stripYaw; },
    set stripYaw(v) { stripYaw = v; bracelet(curB); },
    get quality() { return level; },
    stats() {
      let triangles = 0, calls = 0, instances = 0;
      for (const m of registry.values()) {
        if (!m.visible) continue;
        const g = m.geometry;
        const tri = (g.index ? g.index.count : g.attributes.position.count) / 3;
        const n = m.isInstancedMesh ? m.count : 1;
        triangles += tri * n; calls += 1; instances += n;
      }
      return { meshes: registry.size, calls, triangles: Math.round(triangles), instances, textures: allTex.length, materials: new Set(Object.values(M)).size, quality: level };
    },
    dispose() {
      for (const m of registry.values()) { m.geometry.dispose(); if (m.isInstancedMesh) m.dispose(); if (m.userData.ownMaterial) m.material.dispose(); }
      for (const m of new Set(Object.values(M))) m.dispose();
      releaseTextures(T);
      group.removeFromParent();
      registry.clear();
    },
  };
  pose(0);
  api.bracelet(1);
  setTime(0);
  setMovement(0);
  return api;
}
