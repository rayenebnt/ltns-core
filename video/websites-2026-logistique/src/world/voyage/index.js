// SILLAGE: the « voyage » module — the road, the sea, the ship, the sky and the plane.
//
// API
//   const voyage = await createVoyage({ renderer, quality = 'high', sun = VOYAGE_SUN, gate = true })
//     renderer : the THREE.WebGLRenderer (only used for capabilities; nothing is rendered here)
//     quality  : 'low' | 'medium' | 'high' | 'max'
//     sun      : THREE.Vector3, direction TOWARDS the sun (normalised). Default VOYAGE_SUN: from the
//                north-west, 50° high, so shadows fall to the south-east (screen right-down in the
//                top views). The integrator's DirectionalLight must use the same direction (its
//                position = target + sun × distance): the decor's baked shadows, the ocean, the
//                clouds and the contrails use it. Change it later with voyage.setSun(dir, color).
//     gate     : false skips the terminal fence, gate pillars and gatehouse at PORT.gate (if the
//                port module builds its own)
//   → {
//     group,        THREE.Group to add to the scene (world coordinates of layout.js, metres)
//     road,         { group, length, pointAt(d, v3?), tangentAt(d, v3?), offsetAt(d, lat, y), cranes }
//                   d = metres along the centreline from the terminal gate (PORT.gate); d < 0 and
//                   d > length extrapolate straight; tangentAt is the unit driving direction;
//                   pointAt(d).y = 0 (the road surface). Drive the truck with these.
//     ocean,        { mesh, follow(camera) } (follow is called by update)
//     ship,         { object, positionAt(p, v3?), heroAt(p, v3?), anchorPoints(p), length, beam,
//                     deckY, topY, halfLength, halfBeam, underWay(p) }
//                   positionAt(p): ship centre on the waterline (y = SEA.level); the ship sails due
//                   south (+Z, bow down the screen) at SHIP_PATH.speed metres per unit of p and is
//                   at SEA.ship (x, z) at PHASES.ship[0]; before it sets off it waits 25 m off the
//                   quay. anchorPoints(p) gives world points for the DOM: centre, bow, stern, the 4
//                   deck corners (project them for the hull's screen rect), hero (the SILLAGE
//                   container's roof) and callouts (5 attach points: 2 left, 2 right, 1 ahead).
//     clouds,       { mesh, veil, densityAt(x, y, z, t), setCoverage(c), setClearing(x, z, r, k),
//                     setSteps(n) } (update drives coverage and the clearing from p and the camera:
//                     a few wisps until p ≈ 0.70, the layer drifts in for the climb, thickens during
//                     the plane, closes to white over PHASES.whiteout; the camera rises through a
//                     clear column of about 170–290 m radius that closes for the white-out)
//     plane,        { object, positionAt(p, centre, v3?), direction, length, span }
//     update(p, time, camera)   positions everything for scroll progress p (0..1) and time (s, idle
//                   motion only: waves, foam churn, drift, contrail turbulence). Pure function of
//                   (p, time, camera): the same inputs render the same frame. Also sets the
//                   visibility of each part by phase (the integrator may override after the call).
//     setQuality(level)         ocean detail (wave octaves, sparkles, Kelvin arms), cloud ray-march
//                               steps (8/12/18/26), container instances (low: top tier + one filler
//                               per stack), road decor density (low: no barrier/fence posts,
//                               bollards, fenders)
//     setSun(dir, color?)       direction towards the sun (Vector3), sun colour (Color)
//     setReveal(k)              0..1: the map details (fields, apron) fade in from the paper colour
//                               (#eef0f1, the port's white void) during the crane shot; default 1.
//                               At 0 the road, its decor and baked shadows are hidden as well (the
//                               gate fence at PORT.gate.x would otherwise cross the side view).
//     stats()                   { calls, triangles, instances, level } of the parts whose visible flag
//                               is on (main pass, before frustum culling: an upper bound)
//     plan(p)                   { ship, hero, plane, coverage, white } world values for camera work
//     dispose()
//   }
//
// Draw calls at high (main pass): road stage 5 (ground, ribbon, decor, fine decor, baked shadows),
// sea stage 4 (ocean, hull, containers, SILLAGE box; + 3 in the shadow pass), air stage 6 (clouds
// (one ray-marched pass), veil, fuselage, wings, details, contrails). Triangles: about 60 k in total.
// The cost is fill rate: the ocean shader (one pass over the sea) and the cloud ray-march
// (8/12/18/26 steps by quality; one texture fetch per step at low, two at medium, three at high
// and max inside clouds).
//
// Camera recommendations (vertical FOV 35–40°, top views with camera.up = (0, 0, -1) so north is up):
//   road (gate, curve, straight): 110–140 m above the road; quay and cranes: 240–300 m (an oblique
//   pass over the quay looking south, e.g. 230 m up and 330 m behind the target, is the best coast
//   shot); ship close: 350 m above the waterline; ship far (services): 800–880 m (under the cloud
//   base; up to 1300 m works since the cover is only wisps until p ≈ 0.70); bow close-up: 120 m;
//   wake: 260–300 m; clouds: rise from 850 m through 900–1500 m to 1800–2400 m; the plane: about
//   260 m above it (PLANE_PATH.altitude + 260), framed on plan(p).plane. Near plane ≈ 1 % of the
//   altitude (depth precision: the ground sits 0.3 m under the port's yard, the road 3 cm above it).
// Light (as in tools/harness-voyage): ACESFilmic tone mapping, exposure 1.22; sun DirectionalLight
// colour VOYAGE_SUN_COLOR, intensity 2.6, direction VOYAGE_SUN; HemisphereLight #dce8f4 / #b8b3a8,
// 1.05. The ground then reads about #e5e7e3. The ship (hull, containers, SILLAGE box) and the plane
// cast into the shadow map; the road decor and cranes do not (their shadows are baked, long and
// crisp); the ground and road receive (the truck's shadow); the ocean draws the hull's shadow
// itself (sun-projected outline).
import * as THREE from 'three';
import { PHASES, within } from '../../story.js';
import { SEA, SKY, ROAD, PORT } from '../layout.js';
import { makeNoise, makeWaveNormals, sunDirection, smoothstep } from './util.js';
import { createRoad } from './road.js';
import { createOcean } from './ocean.js';
import { createShip, SHIP_PATH } from './ship.js';
import { createClouds } from './clouds.js';
import { createPlane, PLANE_PATH } from './plane.js';

export { SHIP_PATH, PLANE_PATH };
export const VOYAGE_SUN = sunDirection(315, 50);
export const VOYAGE_SUN_COLOR = new THREE.Color('#fff3e2');

const DETAIL = { low: 0, medium: 1, high: 2, max: 3 };
// the plane's shadow on the clouds: 1 = the true sun projection (about 500 m to the south-east,
// outside a close top-down frame); 0.4 keeps it in view beside the plane
export const PLANE_SHADOW_DROP = 0.4;
const STEPS = { low: 8, medium: 12, high: 18, max: 26 };

export async function createVoyage({ renderer, quality = 'high', sun = VOYAGE_SUN, gate = true } = {}) {
  void renderer;
  const noise = makeNoise(256, 7);
  const waves = makeWaveNormals(256, 11);
  const col = (h) => new THREE.Color(h);
  const uniforms = {
    uNoise: { value: noise.texture },
    uWaves: { value: waves },
    uTime: { value: 0 },
    uDetail: { value: 2 },
    uSunDir: { value: sun.clone().normalize() },
    uSunColor: { value: VOYAGE_SUN_COLOR.clone() },
    // sea and sky
    uSkyZenith: { value: col('#3f78b5') },
    uSkyHorizon: { value: col('#c4d8e8') },
    uHaze: { value: col('#bccfdd') },
    uDeep: { value: col('#06264c') },
    uMid: { value: col('#0b3c6e') },
    uShallow: { value: col('#1a4450') },
    uAerated: { value: col('#3f9fbd') },
    uShip: { value: new THREE.Vector4(SEA.ship.x, SEA.ship.z, 0, 1) },
    uShipDim: { value: new THREE.Vector4(SEA.ship.length / 2, SEA.ship.beam / 2, 0, 0) },
    uWake: { value: 1 },
    // clouds
    uThr0: { value: 0.6 },
    uThr1: { value: 0.7 },
    uCloudShadow: { value: 0.2 },
    uWind: { value: new THREE.Vector2(5.0, 1.6) },
    uCloudMid: { value: (SKY.cloudBase + SKY.cloudTop) / 2 },
    uCloudLit: { value: col('#ffffff') },
    uCloudShade: { value: col('#a3b3c6') },
    uCloudDark: { value: col('#71839b') },
    uPaper: { value: col('#eef0f1') },
    uWhite: { value: 0 },
    uPlane: { value: new THREE.Vector4() },
    uPlaneDir: { value: new THREE.Vector2(1, 0) },
    uPlaneShadow: { value: 0 },
    // ground and road
    uGround: { value: col('#eef0ec') },
    uConcrete: { value: col('#dcdfdd') },
    uReveal: { value: 1 },
    uQuayZ: { value: ROAD.quayZ },
    uYard: { value: new THREE.Vector4(PORT.yard.minX, PORT.yard.maxX, PORT.yard.minZ, PORT.yard.maxZ) },
    uAsph: { value: col('#3b3835') },
    uAsphOld: { value: col('#5b5956') },
    uMark: { value: col('#efeee8') },
    uVerge: { value: col('#d3dbcb') },
    uGravel: { value: col('#cdcac2') },
  };

  const group = new THREE.Group();
  group.name = 'voyage';

  const road = createRoad({ noise, sun: uniforms.uSunDir.value, uniforms, gate });
  const clouds = createClouds({ uniforms, noise }); // adds uCloudMap, read by the ocean
  const ocean = createOcean({ uniforms });
  const ship = await createShip();
  const plane = await createPlane({ uniforms });
  group.add(road.group, ocean.mesh, ship.object, clouds.mesh, clouds.veil, plane.object);

  let level = quality;
  function setQuality(q) {
    level = DETAIL[q] === undefined ? 'high' : q;
    uniforms.uDetail.value = DETAIL[level];
    clouds.setSteps(STEPS[level]);
    ship.setQuality(level);
    road.setQuality(level);
  }
  setQuality(quality);

  const shipPos = new THREE.Vector3();
  const restPos = new THREE.Vector3();
  const planeCentre = new THREE.Vector3();
  ship.positionAt(PLANE_PATH.centreP, planeCentre);

  // cloud cover: a few wisps while the ship is in view, the layer drifts in as the camera climbs,
  // thickens during the plane's crossing, then closes to white
  function coverageAt(p) {
    const drift = smoothstep(PHASES.rise[1] - 0.04, PHASES.clouds[0] + 0.035, p);
    const thick = within(p, [PHASES.plane[0], PHASES.whiteout[0]]);
    const white = within(p, PHASES.whiteout);
    return Math.min(1, 0.05 + 0.4 * drift + 0.17 * thick + 0.38 * smoothstep(0, 1, white));
  }

  function plan(p) {
    return {
      ship: ship.positionAt(p),
      hero: ship.heroAt(p),
      plane: plane.positionAt(p, planeCentre),
      coverage: coverageAt(p),
      white: smoothstep(PHASES.whiteout[0], PHASES.whiteout[1], p),
    };
  }

  function update(p, time, camera) {
    uniforms.uTime.value = time;
    // ship and its wake
    ship.positionAt(p, shipPos);
    ship.object.position.copy(shipPos);
    uniforms.uShip.value.set(shipPos.x, shipPos.z, 0, 1);
    uniforms.uWake.value = ship.underWay(p);
    // (v3) the wake's length: the way made since the berth, plus its first wash
    ship.positionAt(0, restPos);
    ocean.mesh.material.uniforms.uWakeLen.value = 14 + Math.max(0, shipPos.z - restPos.z);
    ocean.follow(camera);
    // clouds: coverage grows through the climb and the plane's crossing, then the white-out
    const white = smoothstep(PHASES.whiteout[0], PHASES.whiteout[1], p);
    clouds.setCoverage(coverageAt(p));
    uniforms.uWhite.value = Math.pow(white, 1.4);
    // the camera climbs through a clearing (ocean and ship in view), which closes as the cover
    // thickens towards the white-out
    // (integrator) a long gap along the ship's track, centred a little north of the ship (over its
    // wake); it closes in from its rim over [0.79, 0.815]: the ship slips under the cloud as the
    // plane comes in
    const hAbove = Math.max(0, camera.position.y - SKY.cloudBase);
    const shut = smoothstep(0.79, 0.815, p);
    const rC = (170 + 0.08 * hAbove) * (1 - 0.88 * shut);
    clouds.setClearing(shipPos.x, shipPos.z - 0.35 * rC, rC, 1 - smoothstep(0.8, 0.815, p));
    // (integrator) a cloud bank over the coast from the climb on: no straight quay edge from above
    clouds.setBank(shipPos.z - 60, smoothstep(PHASES.rise[1] - 0.04, PHASES.rise[1] - 0.01, p));
    clouds.update(camera, time, white);
    // plane
    plane.place(p, planeCentre, time);
    // (integrator) the plane stays over the white-out and flies out of the frame under « Arrivée »
    const pv = p > PHASES.plane[0] - 0.035;
    plane.object.visible = pv;
    uniforms.uPlane.value.set(plane.object.position.x, plane.object.position.y, plane.object.position.z, PLANE_SHADOW_DROP);
    uniforms.uPlaneDir.value.set(plane.direction.x, plane.direction.z);
    // (v3) the soft shadow goes with the clouds it falls on: no ghost plane on the paper
    uniforms.uPlaneShadow.value = pv ? (1 - 0.6 * white) * (1 - white) : 0;
    // stage visibility (the integrator may override after this call)
    // the ground stays (the coast is in view from the sky); the road and its decor go
    road.group.visible = true;
    const roadOn = p < PHASES.clouds[1] && uniforms.uReveal.value > 0.01;
    for (const k of ['road', 'decor', 'fine', 'shadows']) road.meshes[k].visible = roadOn && (k !== 'fine' || level !== 'low');
    ocean.mesh.visible = p > PHASES.crane[0] && p < PHASES.whiteout[1] + 0.02;
    ship.object.visible = p > PHASES.road[0] && p < PHASES.whiteout[1] + 0.02;
    clouds.mesh.visible = p > PHASES.rise[0] - 0.02 || camera.position.y > SKY.cloudBase - 50;
    uniforms.uCloudShadow.value = 0.2 * (1 - white);
  }

  function setSun(dir, color) {
    uniforms.uSunDir.value.copy(dir).normalize();
    if (color) uniforms.uSunColor.value.copy(color);
  }

  function stats() {
    let calls = 0, triangles = 0, instances = 0;
    group.traverseVisible((o) => {
      if (!o.isMesh) return;
      const g = o.geometry;
      const count = Math.min(g.index ? g.index.count : g.attributes.position.count, g.drawRange.count);
      const inst = o.isInstancedMesh ? o.count : g.isInstancedBufferGeometry ? g.instanceCount : 1;
      calls += 1;
      triangles += (count / 3) * inst;
      instances += inst;
    });
    return { calls, triangles: Math.round(triangles), instances, level };
  }

  return {
    group,
    road,
    ocean,
    ship,
    clouds,
    plane,
    uniforms,
    update,
    setQuality,
    setSun,
    setReveal: (k) => (uniforms.uReveal.value = k),
    stats,
    plan,
    dispose() {
      road.dispose();
      ocean.dispose();
      ship.dispose();
      clouds.dispose();
      plane.dispose();
      noise.texture.dispose();
      waves.dispose();
    },
  };
}
