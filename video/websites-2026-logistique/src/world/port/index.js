// SILLAGE — port module (chapter 01): the terminal, the straddle carrier (« cavalier »), the
// containers (the orange SILLAGE hero box among them) and the truck.
//
// API
//   const port = await createPort({ renderer, quality })      quality: 'low' | 'medium' | 'high' | 'max'
//   scene.add(port.group)                                      everything, in WORLD coordinates (metres,
//                                                              +Y up, east +X, north −Z; layout.js)
//   port.update(p, time)        pose everything for scroll progress p (0..1) and idle time t (s).
//                               A pure function of (p, time): story.js PHASES heroHold, lift, carry,
//                               lower, truckGo drive the choreography; time only drives the beacons
//                               and a tiny idle sway. Also sets the studio fade from PHASES.crane
//                               (1 = white side-view void, 0 = full-colour yard) unless overridden.
//   port.setStudio(k | null)    override the studio fade (0..1) after update(); null = follow p.
//   port.truck.setPose({ x, z, heading, travelled, articulation })
//                               (x, z) = trailer centre = container centre on the ground (m);
//                               heading = trailer heading, radians about +Y, 0 = east (+X), +π/2 =
//                               north; articulation = tractor heading − trailer heading (0 when
//                               straight); travelled = distance (m) for the wheel spin. Call it AFTER
//                               update(p) (update poses the truck too, clamped at the gate for p ≥ the
//                               end of truckGo). The hero container rides on the trailer once seated.
//   port.truck.poseOnPath(sample, s, travelled)
//                               helper: sample(d) → [x, z] on a centreline (arc length d); s = arc
//                               length of the trailer centre. Places the tractor on the path ahead and
//                               the trailer on the chord to its axles (natural off-tracking in curves).
//   port.carrier, port.hero     { group | mesh, ... } for anchors and cameras (hero: InstancedMesh, its
//                               world centre via port.heroCentre(target Vector3)).
//   port.truckCentre(target)    world centre of the container on the trailer (for camera follow).
//   port.setQuality(level)      rebuilds mesh density and small details (same look).
//   port.stats()                { calls?, triangles, instances, meshes } of the module (static count).
//   port.dispose()
// Lighting it expects (the harness builds it): paper background #eef0f1 as the clear colour, a
// RoomEnvironment PMREM as scene.environment, one soft-shadow DirectionalLight (key, upper left)
// as directional light 0 (the ground's studio shadow catcher reads its shadow map), a weak fill.
import * as THREE from 'three';
import { PORT, CONTAINER } from '../layout.js';
import { PHASES, within } from '../../story.js';
import { shared, boxMaterial, easing, span, clamp01 } from './kit.js';
import { loadFonts, heroAtlas } from './textures.js';
import { containerGeometry, instAttr } from './container.js';
import { createCarrier, CARRIER } from './carrier.js';
import { createTruck, TRUCK } from './truck.js';
import { createTerminal } from './terminal.js';

const HC = CONTAINER.hHC;
// choreography constants (m)
export const CHOREO = {
  stackTop: HC, // the hero's bottom on the stack (a 40' HC under it)
  carryBottom: 5.6, // the hero's bottom while carried
  parkPlane: 7.6, // the spreader's twistlock plane after the release
  carrierBack: 6, // where the cavalier backs off to (x)
};

export async function createPort({ renderer, quality = 'high' } = {}) {
  await loadFonts();
  const group = new THREE.Group();
  group.name = 'port';
  let Q = quality;

  const terminal = createTerminal({ quality: Q });
  group.add(terminal.group);

  // near containers (LOD0): the stack's bottom box and a red 20' beside it (the stacks' material)
  const nearMat = terminal.boxMat;
  const near = [
    { len: 'l40', x: PORT.stack.x, y: 0, z: PORT.stack.z, color: '#2d3d57', variant: 1, flip: false },
    { len: 'l20', x: PORT.stack.x - 9.55, y: 0, z: PORT.stack.z, color: '#8c3b2c', variant: 0, flip: true },
  ];
  const nearMeshes = [];
  function buildNear() {
    for (const m of nearMeshes) {
      group.remove(m);
      m.geometry.dispose();
    }
    nearMeshes.length = 0;
    for (const len of ['l40', 'l20']) {
      const list = near.filter((n) => n.len === len);
      const geo = containerGeometry(len, { hc: true, lod: 0, quality: Q });
      const ia = instAttr(list.length);
      const im = new THREE.InstancedMesh(geo, nearMat, list.length);
      const _m = new THREE.Matrix4();
      const _c = new THREE.Color();
      list.forEach((n, i) => {
        _m.makeRotationY(n.flip ? Math.PI : 0).setPosition(n.x, n.y, n.z);
        im.setMatrixAt(i, _m);
        _c.set(n.color);
        ia.setXYZW(i, _c.r, _c.g, _c.b, n.variant + 0.37 + i * 0.21);
      });
      geo.setAttribute('aInst', ia);
      im.castShadow = im.receiveShadow = true;
      im.computeBoundingSphere();
      im.name = 'near-' + len;
      nearMeshes.push(im);
      group.add(im);
    }
  }
  buildNear();

  // the hero container
  const heroTex = heroAtlas();
  const heroMat = boxMaterial({ atlas: heroTex, cells: 1, rust: 0.38, name: 'hero' });
  let heroGeo = containerGeometry('l40', { hc: true, lod: 0, quality: Q });
  const heroInst = instAttr(1);
  {
    const c = new THREE.Color('#ff5a1f');
    heroInst.setXYZW(0, c.r, c.g, c.b, 0 + 0.42);
  }
  heroGeo.setAttribute('aInst', heroInst);
  const hero = new THREE.InstancedMesh(heroGeo, heroMat, 1);
  hero.castShadow = hero.receiveShadow = true;
  hero.frustumCulled = false;
  hero.name = 'hero-container';
  group.add(hero);

  // the cavalier and the truck
  let carrier = createCarrier({ quality: Q });
  group.add(carrier.group, ...carrier.parts);
  let truckCore = createTruck({ quality: Q });
  group.add(truckCore.group);

  // ---- state shared by update / setPose
  const heroM = new THREE.Matrix4();
  const spreaderM = new THREE.Matrix4();
  const _m = new THREE.Matrix4();
  const _t = new THREE.Matrix4();
  let seated = false;
  let studioOverride = null;
  const blobs = terminal.groundUniforms;

  function syncHero() {
    if (seated) heroM.copy(truckCore.seat);
    hero.setMatrixAt(0, heroM);
    hero.instanceMatrix.needsUpdate = true;
  }

  const truck = {
    get group() {
      return truckCore.group;
    },
    setPose(pose) {
      truckCore.setPose(pose);
      syncHero();
      truckBlobs();
    },
    getPose: () => truckCore.getPose(),
    // sample(d) → [x, z]; s = arc length of the trailer centre
    poseOnPath(sample, s, travelled = s) {
      const K = TRUCK.centre;
      const kp = sample(s + K); // kingpin on the path
      const fa = sample(s + K + (TRUCK.frontAxle - 0.3)); // tractor front axle
      const ra = sample(s + K + TRUCK.rearAxle); // tractor rear axle
      const ta = sample(s - (-TRUCK.trailerAxles[1] - K)); // trailer middle axle
      const hT = Math.atan2(-(fa[1] - ra[1]), fa[0] - ra[0]);
      const hR = Math.atan2(-(kp[1] - ta[1]), kp[0] - ta[0]);
      // the trailer centre on the chord from its axles to the kingpin
      const x = kp[0] - Math.cos(hR) * K;
      const z = kp[1] + Math.sin(hR) * K;
      let art = hT - hR;
      art = Math.atan2(Math.sin(art), Math.cos(art));
      this.setPose({ x, z, heading: hR, articulation: art, travelled });
    },
  };

  function truckBlobs() {
    const { x, z, heading, articulation } = truckCore.getPose();
    const ch = Math.cos(heading);
    const sh = Math.sin(heading);
    const kx = x + ch * TRUCK.centre;
    const kz = z - sh * TRUCK.centre;
    const place = (i, lx, lz, hx, hz, k, soft, onTractor) => {
      const h = onTractor ? heading + articulation : heading;
      const c = Math.cos(h);
      const s = Math.sin(h);
      // local (forward lx, side lz) → world: forward = (c, −s), side (+z local) = (s, c)
      blobs.uBlob.value[i].set(kx + c * lx + s * lz, kz - s * lx + c * lz, hx, hz);
      // the shader rotates world offsets into the rect frame: d' = (d.x c' + d.y s', −d.x s' + d.y c')
      // with (c', s') = (cos h, −sin h)
      blobs.uBlobB.value[i].set(c, -s, k, soft);
    };
    let i = 4;
    for (const sd of [-1, 1]) {
      place(i++, -7.95, sd * 1.05, 2.0, 0.22, 0.5, 0.5, false);
      place(i++, TRUCK.rearAxle, sd * 0.9, 0.55, 0.4, 0.5, 0.45, true);
      place(i++, TRUCK.frontAxle, sd * 1.03, 0.4, 0.18, 0.45, 0.4, true);
    }
    place(i++, -TRUCK.centre, 0, 6.0, 1.15, 0.16, 1.6, false);
    place(i++, 2.4, 0, 2.3, 1.2, 0.18, 1.2, true);
  }

  function carrierBlobs(cx) {
    blobs.uBlob.value[0].set(cx, CARRIER.ZL, 4.3, 0.3);
    blobs.uBlobB.value[0].set(1, 0, 0.5, 0.55);
    blobs.uBlob.value[1].set(cx, -CARRIER.ZL, 4.3, 0.3);
    blobs.uBlobB.value[1].set(1, 0, 0.5, 0.55);
    blobs.uBlob.value[2].set(PORT.stack.x, PORT.stack.z, 6.06, 1.2);
    blobs.uBlobB.value[2].set(1, 0, 0.6, 0.5);
    blobs.uBlob.value[3].set(PORT.stack.x - 9.55, PORT.stack.z, 3.0, 1.2);
    blobs.uBlobB.value[3].set(1, 0, 0.6, 0.5);
  }

  // ---- choreography
  const P = PHASES;
  function update(p, time = 0) {
    shared.uTime.value = time;
    const sm = easing.smoother;
    // studio fade follows the crane
    shared.uStudio.value = studioOverride ?? 1 - sm(within(p, P.crane));

    // carrier x: carry east, then back off west during truckGo
    const uCarry = within(p, P.carry);
    const uGo = within(p, P.truckGo);
    let cx = PORT.carrierStart.x + (PORT.truck.x - PORT.carrierStart.x) * sm(uCarry);
    const back = sm(span(uGo, 0.08, 0.62));
    cx += (CHOREO.carrierBack - PORT.truck.x) * back;

    // spreader plane height
    const uLift = within(p, P.lift);
    const uLow = within(p, P.lower);
    const planeStart = CHOREO.stackTop + HC;
    const planeCarry = CHOREO.carryBottom + HC;
    const planeSeat = TRUCK.deck + HC;
    let plane = planeStart + (planeCarry - planeStart) * sm(uLift);
    plane += (planeSeat - planeCarry) * sm(span(uLow, 0, 0.62));
    plane += (CHOREO.parkPlane - planeSeat) * easing.inOut(span(uLow, 0.76, 1));
    seated = uLow >= 0.62;

    // sway: pendulum response to the carrier's acceleration (+ a damped residual, + idle)
    const acc = (u) => 60 * u - 180 * u * u + 120 * u * u * u; // smootherstep''
    let sway = 0;
    if (uCarry > 0 && uCarry < 1) sway = -0.0062 * acc(uCarry);
    const pe = p - P.carry[1];
    if (pe > 0) sway += -0.012 * Math.exp(-pe / 0.009) * Math.sin((pe / 0.011) * Math.PI * 2);
    const lifted = clamp01((plane - planeStart) / 1.2) * (seated ? 0 : 1);
    sway += lifted * 0.0025 * Math.sin(time * 1.25);
    if (seated) sway *= 1 - span(uLow, 0.62, 0.7);
    // lamps
    const spreaderLock = 1 - span(uLow, 0.72, 0.76);
    const trailerLock = span(uLow, 0.64, 0.7);

    // spreader matrix: pivot at the rope tops above the machine's centre
    const pivotY = CARRIER.sheaveY;
    _m.makeTranslation(cx, pivotY, PORT.carrierStart.z);
    _t.makeRotationZ(sway);
    _m.multiply(_t);
    _t.makeTranslation(0, plane - pivotY, 0);
    _m.multiply(_t);
    spreaderM.copy(_m);
    carrier.pose({ x: cx, z: PORT.carrierStart.z, travelled: cx - PORT.carrierStart.x, spreaderMatrix: spreaderM, lock: spreaderLock });
    carrierBlobs(cx);

    // truck: waits, then pulls away to the gate (accelerating), wheels by distance
    const go = span(uGo, 0.06, 1);
    const tx = PORT.truck.x + (PORT.gate.x - PORT.truck.x) * go * go;
    truckCore.setPose({ x: tx, z: PORT.truck.z, heading: 0, articulation: 0, travelled: tx - PORT.truck.x, lock: trailerLock });

    // hero: on the spreader until seated, then on the trailer
    if (!seated) {
      heroM.copy(spreaderM);
      _t.makeTranslation(0, -HC, 0);
      heroM.multiply(_t);
    }
    syncHero();
    truckBlobs();
  }

  function setQuality(level) {
    if (level === Q) return;
    Q = level;
    // rebuild the detailed parts (same look, different density)
    group.remove(carrier.group, ...carrier.parts);
    carrier.dispose();
    carrier = createCarrier({ quality: Q });
    group.add(carrier.group, ...carrier.parts);
    const pose = truckCore.getPose();
    group.remove(truckCore.group);
    truckCore.dispose();
    truckCore = createTruck({ quality: Q });
    group.add(truckCore.group);
    truckCore.setPose(pose);
    heroGeo.dispose();
    heroGeo = containerGeometry('l40', { hc: true, lod: 0, quality: Q });
    heroGeo.setAttribute('aInst', heroInst);
    hero.geometry = heroGeo;
    buildNear();
    terminal.setQuality(Q);
    api.carrier = carrier;
  }

  function stats() {
    let triangles = 0;
    let meshes = 0;
    let instances = 0;
    group.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      meshes++;
      const g = o.geometry;
      const n = (g.index ? g.index.count : g.attributes.position.count) / 3;
      const c = o.isInstancedMesh ? o.count : 1;
      instances += c;
      triangles += n * c;
    });
    return { meshes, instances, triangles: Math.round(triangles), quality: Q, stacks: terminal.count };
  }

  const api = {
    group,
    carrier,
    truck,
    hero,
    terminal,
    update,
    setQuality,
    stats,
    setStudio(k) {
      studioOverride = k;
      if (k !== null && k !== undefined) shared.uStudio.value = k;
    },
    heroCentre(target = new THREE.Vector3()) {
      return target.set(0, HC / 2, 0).applyMatrix4(heroM);
    },
    truckCentre(target = new THREE.Vector3()) {
      return target.set(0, HC / 2, 0).applyMatrix4(truckCore.seat);
    },
    carrierX: () => carrier.group.position.x,
    // hide parts by stage (the truck stays visible on the road while the yard is far away)
    show({ terminal: t = true, carrier: c = true, truck: k = true, hero: h = true } = {}) {
      terminal.group.visible = t;
      for (const m of nearMeshes) m.visible = t;
      carrier.group.visible = c;
      for (const m of carrier.parts) m.visible = c;
      truckCore.group.visible = k;
      hero.visible = h;
    },
    uniforms: shared,
    dispose() {
      carrier.dispose();
      truckCore.dispose();
      terminal.dispose();
      for (const m of nearMeshes) m.geometry.dispose();
      heroGeo.dispose();
      heroMat.dispose();
      heroTex.dispose();
    },
  };
  update(0, 0);
  void renderer; // kept in the signature for the world contract (textures could use its anisotropy)
  return api;
}
