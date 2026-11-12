// SILLAGE: the 3D world (the integrator). ONE scene composed from the port module (src/world/port/:
// terminal, cavalier, containers, truck) and the voyage module (src/world/voyage/: road, ocean, ship,
// clouds, plane), ONE camera and ONE light rig, all pure functions of the scroll progress p (story.js
// PHASES) and, for idle motion only, the time.
//
// WORLD CONTRACT (as the shell, src/main.js, calls it)
//   export const rendererOptions           merged over the shell's WebGLRenderer options
//   export async function createWorld({ renderer, quality, onProgress }) → world
//   world.camera
//   world.update(state = { p, pointer: { x, y } }, dt, time)   dt ≥ 0.5 = snap (nothing is smoothed
//                                         here: every pose is a function of p, so a snap is free)
//   world.render()
//   world.resize(w, h, dpr)               sets the renderer's pixel ratio and size itself
//   await world.warmup()                  renders every stage once (all programs compile under the loader)
//   world.setQuality('low' | 'medium' | 'high' | 'max')   mesh density, shadow map, ocean, clouds
//   world.stats() → { calls, triangles, textures, geometries, programs, stage, level }
//   world.anchors() → CSS px: { ship: { x, y, w, h, visible }, callouts: [5 × { x, y, side, visible }]
//                     (texts.BEATS.services order), truck: { x, y, visible }, plane: { x, y, visible } }
//   world.info() → { stage: 'port' | 'road' | 'sea' | 'air' }
//
// THE CAMERA (one rig, continuous in p): a target point, a distance, a pitch, a yaw and a vertical
// FOV, each a C1 track through keyframes (monotone cubic, so holds stay still and nothing overshoots).
// The orientation is the Euler YXZ (pitch, yaw, 0): yaw 0 looks north (−Z); at pitch −90° the up
// vector is north (−Z), so the crane from the side view to the top view blends +Y into north with
// no roll and no flip, and every top view has north up the screen (south = down).
//   side rig (port, fov 20: long lens, product-render look): the target follows the hero container
//     along x (heroCentre.x + a keyed offset, so the action stays right of ≈ 0.45 × the width where
//     the DOM text sits at the left) at a keyed absolute height (the yard floor stays put on screen
//     while the box goes up and down); a slow push-in over the hero hold, a dolly in for the lift,
//     a gentle yaw (≤ 10°, a 3/4 view of the box ends) for the carry and the lowering.
//   top rig (fov 38, north up): the target blends from the truck (plus a lead along the smoothed road
//     tangent: the truck sits a little behind the centre) to the ship over the coast (a forward tilt
//     to −78° over the quay cranes and back) and to the plane's track during the climb (the camera
//     glides along it at PLANE_FOLLOW × the plane's speed, so the plane crosses the frame above the
//     AIR text); the altitude rises with p (84 m at the gate → 190 m on the straight → 360–430 m
//     over the ship → 860 m for the services → 2440 m above the clouds).
//   crane: smootherstep blend of every parameter, side rig → top rig, over PHASES.crane.
// The truck is driven here (driveS: one continuous speed profile from the port module's own
// pull-away through the gate onto the voyage road). The port's south apron rows wait under the
// yard during the wide side views; the yard's light masts join with the crane.
// LIGHT: one shadow-casting DirectionalLight (the first: the port's studio shadow catcher reads
// directionalShadowMap[0]) that turns from the studio key (upper left, slightly toward the camera)
// into the voyage's sun (VOYAGE_SUN, from the north-west: the road decor's baked shadows use it),
// a fill DirectionalLight (studio only), a HemisphereLight (sky fill outdoors) and a RoomEnvironment
// PMREM; Khronos PBR Neutral tone mapping (whites stay white, the paper void is exact: the port and
// voyage fades to paper are mixed in output space), exposure keyed per stage. One shadow map,
// fitted to the action of the stage (texel-snapped).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PHASES, CHAPTERS, within } from '../story.js';
import { PORT, ROAD, SKY } from './layout.js';
import { createPort } from './port/index.js';
import { createVoyage, VOYAGE_SUN, VOYAGE_SUN_COLOR, PLANE_PATH } from './voyage/index.js';

export const rendererOptions = { antialias: true };

const PAPER = '#eef0f1';
const LEVELS = ['low', 'medium', 'high', 'max'];
const SHADOW_SIZE = { low: 1024, medium: 2048, high: 2048, max: 4096 };
const DEG = Math.PI / 180;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
const smoother = (t) => {
  t = clamp(t);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// a C1 monotone cubic (Fritsch–Carlson) through [p, value] keys; flat outside
function track(keys) {
  const n = keys.length;
  const xs = keys.map((k) => k[0]);
  const ys = keys.map((k) => k[1]);
  const d = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else {
      const h0 = xs[i] - xs[i - 1], h1 = xs[i + 1] - xs[i];
      const w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  // ends: flat (the story starts and ends at rest)
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

// ---------------------------------------------------------------- the truck's drive (pure in p)
// distance s (m) of the trailer centre from its parking spot (PORT.truck), by a continuous,
// piecewise-linear speed profile: it pulls away exactly as the port module's own truckGo (constant
// acceleration from rest, ≈ 880 m per unit of p at the gate), keeps accelerating on the road,
// cruises down the straight and comes to rest before the quay (the camera has left it by then).
const LANE = PORT.gate.x - PORT.truck.x; // the yard lane, then the road from the gate
const P_GO = PHASES.truckGo[0] + 0.06 * (PHASES.truckGo[1] - PHASES.truckGo[0]);
const V_GATE = (2 * LANE) / (PHASES.truckGo[1] - P_GO); // the port module's speed at the gate
// the truck accelerates on the road, cruises down the straight, then brakes onto the quay apron
// and stops at the berth's stop line (D_STOP before the end of the road), next to the ship's stern:
// the cruise speed is solved from the road's length so that it arrives at P_STOP
const P_ACC = PHASES.road[0] + 0.05, P_BRAKE = PHASES.coast[0] + 0.025, P_STOP = PHASES.coast[0] + 0.065;
const D_STOP = 12;
let DRIVE = null;
function buildDrive(roadLen) {
  const target = LANE + roadLen - D_STOP;
  // distance after the gate = V_GATE·(P_ACC − gate)/2 + vC·[(P_ACC − gate)/2 + (P_BRAKE − P_ACC) + (P_STOP − P_BRAKE)/2]
  const g = PHASES.truckGo[1];
  const vC = (target - LANE - (V_GATE * (P_ACC - g)) / 2) / ((P_ACC - g) / 2 + (P_BRAKE - P_ACC) + (P_STOP - P_BRAKE) / 2);
  const knots = [
    [P_GO, 0],
    [g, V_GATE],
    [P_ACC, vC],
    [P_BRAKE, vC],
    [P_STOP, 0],
  ];
  // cumulative distance at each knot
  const S = [0];
  for (let i = 1; i < knots.length; i++) S.push(S[i - 1] + ((knots[i][0] - knots[i - 1][0]) * (knots[i][1] + knots[i - 1][1])) / 2);
  DRIVE = { knots, S, vC };
}
function driveS(p) {
  const { knots, S } = DRIVE;
  if (p <= knots[0][0]) return 0;
  for (let i = 1; i < knots.length; i++) {
    const [p1, v1] = knots[i];
    if (p <= p1) {
      const [p0, v0] = knots[i - 1];
      const t = p - p0;
      const a = (v1 - v0) / (p1 - p0);
      return S[i - 1] + v0 * t + 0.5 * a * t * t;
    }
  }
  return S[S.length - 1];
}

// ---------------------------------------------------------------- camera keys (p → value)
// side rig (port, looking north): offset of the target from the hero container's centre (m),
// distance (m), pitch (°), yaw (°, + = the camera swings east, looking a little north-west), fov
const C = PHASES;
const SIDE = {
  ox: track([[0, -7.5], [C.lift[0], -7.5], [C.lift[1], -8.2], [C.carry[1], -7.6], [C.lower[1], -7.4], [C.crane[0], -8.0]]),
  // the target's height (absolute, m): the yard floor stays put on screen while the box goes up and down
  ty: track([[0, 9.0], [C.lift[0], 9.0], [C.lift[1], 8.6], [C.carry[1], 8.2], [C.lower[1], 7.6], [C.crane[0], 7.6]]),
  dist: track([[0, 95], [C.lift[0], 92], [C.lift[1], 88], [C.carry[1], 84], [C.lower[1], 82], [C.crane[0], 90]]),
  pitch: track([[0, -3.2], [C.lift[0], -3.2], [C.lift[1], -3.4], [C.carry[1], -3.6], [C.lower[1], -4.0], [C.crane[0], -5.0]]),
  yaw: track([[0, 0], [C.lift[0], 0], [C.lift[1], 4], [C.carry[1], 8], [C.lower[1], 10], [C.crane[0], 9]]),
  fov: track([[0, 20], [C.crane[0], 20]]),
};
// top rig: altitude of the camera above the target (m), pitch (°), fov, the truck's lead (fraction of
// the frame height along the driving direction) and the ship's screen offset (m, + = ship above centre)
const TOP = {
  alt: track([
    [C.crane[1], 84],
    [C.road[0] + 0.035, 128],
    [C.road[0] + 0.08, 190],
    [C.coast[0] - 0.01, 212],
    [C.coast[0] + 0.035, 262],
    [C.coast[0] + 0.065, 305],
    [C.ship[0] + 0.02, 370],
    [C.ship[1], 430],
    [C.rise[0] + 0.07, 760],
    // (v3) the climb starts as the services fade out, and the cloud base → cloud top crossing is
    // spread over 0.04 p (it was the largest jump of the film)
    [C.rise[1] - 0.024, 830],
    [C.rise[1] - 0.007, 905],
    [C.rise[1] + 0.011, 1200],
    [C.rise[1] + 0.029, 1500],
    [C.clouds[1] + 0.005, 2290],
    [C.plane[0] + 0.05, 2320],
    [1, 2350],
  ]),
  // straight down all along (no tilt over the coast: the quay, the truck and the deck read as one map)
  pitch: track([[C.crane[1], -90], [1, -90]]),
  fov: track([[C.crane[1], 38], [1, 38]]),
  lead: track([[C.crane[1], 0.08], [C.road[0] + 0.04, 0.1], [C.coast[0] + 0.015, 0.1], [C.coast[0] + 0.06, 0.0]]),
  // on the road's straight the target sits west of the truck (a fraction of the frame width): the
  // road runs at about 0.65 W, clear of the centred nav and of the ROUTE text at the left
  west: track([[C.road[0] + 0.035, 0], [C.road[0] + 0.085, 0.15], [C.coast[0], 0.15], [C.coast[0] + 0.035, 0]]),
  // the ship's offset from the frame centre (m, + = ship BELOW the centre): the camera holds still
  // while the ship sails down the screen through the MER headline, then centres it for the services
  // (into the climb the target runs ahead of the ship, south: the coast stays out of the frame
  // while the camera is still under the cloud layer)
  shipOff: track([[C.ship[0] + 0.005, -35], [C.ship[1], 35], [C.rise[0] + 0.045, 8], [C.rise[1] - 0.01, 0], [C.rise[1] + 0.02, -130]]),
};
// subject blends (top rig): truck → ship over the coast, ship → plane track over the climb
const W_SHIP = (p) => smoother((p - (C.coast[0] + 0.025)) / (C.ship[0] + 0.02 - (C.coast[0] + 0.025)));
const W_PLANE = (p) => smoother((p - (C.clouds[0] + 0.03)) / (C.plane[0] + 0.045 - (C.clouds[0] + 0.03)));
const W_CRANE = (p) => smoother(within(p, C.crane));
// the camera's speed along the plane's track (fraction of the plane's), and where the track sits on
// screen (m south of the frame centre at the plane's altitude: the plane passes above the AIR text)
const PLANE_FOLLOW = 0.8;
const PLANE_TRACK_OFF = 33;
// the camera leads the plane along its track (m): at the AIR stop the plane sits left of the
// centre, clear of the AIR text at the right, and it crosses the frame through the white-out
const PLANE_LEAD = 49;

// exposure and light per stage
const EXPOSURE = track([[0, 1.0], [C.crane[0], 1.0], [C.crane[1], 1.12], [C.coast[0] + 0.055, 1.12], [C.ship[0], 1.32], [C.rise[1], 1.32], [C.clouds[1], 1.18], [1, 1.18]]);

export async function createWorld({ renderer, quality = 'high', onProgress = () => {} } = {}) {
  let level = LEVELS.includes(quality) ? quality : 'high';
  onProgress(0.05);

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(PAPER, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAPER);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = envTex;
  scene.environmentIntensity = 0.7;

  let W = Math.max(1, innerWidth), H = Math.max(1, innerHeight);
  const camera = new THREE.PerspectiveCamera(20, W / H, 1, 20000);
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  // ---- lights: the key/sun FIRST (the studio shadow catcher reads directionalShadowMap[0])
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(SHADOW_SIZE[level], SHADOW_SIZE[level]);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  key.shadow.radius = 7;
  key.shadow.blurSamples = 16;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xf2f5ff, 0.5);
  scene.add(fill, fill.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xdcdedf, 0.25);
  scene.add(hemi);
  const KEY_STUDIO = new THREE.Vector3(-0.66, 0.66, 0.36).normalize();
  const FILL_DIR = new THREE.Vector3(0.55, 0.3, 0.78).normalize();
  const SUN = VOYAGE_SUN.clone().normalize();
  const HEMI_STUDIO = [new THREE.Color(0xffffff), new THREE.Color(0xdcdedf)];
  const HEMI_DAY = [new THREE.Color('#dce8f4'), new THREE.Color('#b8b3a8')];
  const KEY_STUDIO_COL = new THREE.Color(0xffffff);
  const KEY_DAY_COL = new THREE.Color('#fff6ec');

  onProgress(0.12);
  const port = await createPort({ renderer, quality: level });
  scene.add(port.group);
  onProgress(0.45);
  // (no voyage gatehouse, pillars or fence: a plain box and a stray cube at the yard edge from above)
  const voyage = await createVoyage({ renderer, quality: level, sun: SUN, gate: false });
  scene.add(voyage.group);
  onProgress(0.8);
  const road = voyage.road;
  const ship = voyage.ship;
  const plane = voyage.plane;
  const vGround = road.meshes.ground;
  buildDrive(road.length);
  // a neutral, very light map ground (the warm sun would turn the module's default cream)
  voyage.uniforms.uGround.value.set('#e3e7ea');
  voyage.uniforms.uConcrete.value.set('#c3c8cb'); // the quay apron a shade darker: road, apron and sea read as one graphic
  // the yard's edges fade (lit, from above) into the map ground's rendered colour, not the paper
  port.terminal.groundUniforms.uEdgeOut.value.set(242 / 255, 245 / 255, 244 / 255);

  // the terminal's south apron rows (blocks S and T, z > 10) sit in front of the hero lane: in the
  // wide side view they would clutter the hero text at the left. They wait under the yard until the
  // camera has moved east (out of their frame), then stand where they belong for the views from above.
  const apron = [];
  port.terminal.group.traverse((o) => {
    if (!o.isInstancedMesh || !/^stacks/.test(o.name)) return;
    const m = new THREE.Matrix4();
    const idx = [];
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, m);
      if (m.elements[14] > 10) idx.push([i, m.elements[13]]);
    }
    if (idx.length) apron.push({ mesh: o, idx });
  });
  // the yard's 30 m light masts: almost fully faded in the side view, but their long shadows would
  // streak the studio floor; they join with the crane (from above they read as masts)
  let masts = null;
  port.terminal.group.traverse((o) => {
    if (o.name === 'masts') masts = o;
  });
  let apronDown = null;
  function sinkApron(down) {
    if (down === apronDown) return;
    apronDown = down;
    const m = new THREE.Matrix4();
    for (const { mesh, idx } of apron) {
      for (const [i, y] of idx) {
        mesh.getMatrixAt(i, m);
        m.elements[13] = down ? y - 30 : y;
        mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }

  // the voyage's ground at reveal 0 must be the exact paper of the void (output space, like the
  // port's fades): chain a last step onto its shader
  {
    const mat = vGround.material;
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => {
      prev(sh, r);
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <dithering_fragment>',
        '#include <dithering_fragment>\ngl_FragColor.rgb = mix(linearToOutputTexel(vec4(uPaper, 1.0)).rgb, gl_FragColor.rgb, smoothstep(0.0, 1.0, uReveal));',
      );
    };
    mat.needsUpdate = true;
  }

  // ---------------------------------------------------------------- per-frame state
  const tmp = new THREE.Vector3();
  const hero = new THREE.Vector3();
  const truckC = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const tan2 = new THREE.Vector3();
  const shipPos = new THREE.Vector3();
  const planeCentre = ship.positionAt(PLANE_PATH.centreP, new THREE.Vector3());
  const PDIR = new THREE.Vector3(Math.sin(PLANE_PATH.heading * DEG), 0, -Math.cos(PLANE_PATH.heading * DEG));
  const PPERP = new THREE.Vector3(-PDIR.z, 0, PDIR.x); // 90° clockwise from the heading: south-ish
  if (PPERP.z < 0) PPERP.negate();
  const sideT = new THREE.Vector3();
  const topT = new THREE.Vector3();
  const target = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const upv = new THREE.Vector3();
  const frustum = new THREE.Frustum();
  const pv = new THREE.Matrix4();
  const yardBox = new THREE.Box3(new THREE.Vector3(PORT.yard.minX - 40, -1, PORT.yard.minZ - 40), new THREE.Vector3(PORT.yard.maxX + 40, 32, PORT.yard.maxZ + 40));
  const truckSphere = new THREE.Sphere(new THREE.Vector3(), 13);
  let curP = 0;
  let stage = 'port';
  const cam = { dist: 100, pitch: 0, yaw: 0, fov: 20, alt: 0 };

  const sample = (d) => {
    road.pointAt(d, tmp);
    return [tmp.x, tmp.z];
  };

  // the truck: posed by the port module until it moves, then driven along the road (pure in p)
  function poseTruck(p) {
    if (p <= P_GO) return 0; // the port module's own pose (parked)
    const s = driveS(p);
    port.truck.poseOnPath(sample, s - LANE, s);
    return s;
  }

  // the driving direction ahead of the truck (smoothed: the camera anticipates the curve)
  function leadDir(s, out) {
    const d = s - LANE;
    road.tangentAt(d + 8, out);
    road.tangentAt(d + 36, tan2);
    return out.add(tan2).setY(0).normalize();
  }

  // ---------------------------------------------------------------- the camera
  function frameH(dist, fovDeg) {
    return 2 * dist * Math.tan((fovDeg * DEG) / 2);
  }
  function placeCamera(p, s, pointer) {
    // side rig
    port.heroCentre(hero);
    sideT.set(hero.x + SIDE.ox(p), SIDE.ty(p), hero.z);
    const sDist = SIDE.dist(p), sPitch = SIDE.pitch(p), sYaw = SIDE.yaw(p), sFov = SIDE.fov(p);
    // top rig: subject blend
    const alt = TOP.alt(p);
    const tFov = TOP.fov(p);
    const fh = frameH(alt, tFov);
    port.truckCentre(truckC);
    leadDir(s, tan);
    const lead = TOP.lead(p) * fh;
    topT.set(truckC.x + tan.x * lead - TOP.west(p) * fh * Math.max(1.6, W / H), 0, truckC.z + tan.z * lead);
    const wS = W_SHIP(p);
    if (wS > 0) {
      ship.positionAt(p, shipPos);
      tmp.set(shipPos.x, 0, shipPos.z - TOP.shipOff(p));
      topT.lerp(tmp, wS);
    }
    const wP = W_PLANE(p);
    if (wP > 0) {
      const d = (p - PLANE_PATH.centreP) * PLANE_PATH.speed * PLANE_FOLLOW + PLANE_LEAD;
      tmp.copy(planeCentre).addScaledVector(PDIR, d).addScaledVector(PPERP, PLANE_TRACK_OFF);
      tmp.y = 0;
      topT.lerp(tmp, wP);
    }
    const tPitch = TOP.pitch(p);
    // the crane: side → top
    const c = W_CRANE(p);
    target.lerpVectors(sideT, topT, c);
    // distance: the top rig's altitude is measured along the view (pitch −90° → straight up)
    cam.dist = mix(sDist, alt, c);
    cam.pitch = mix(sPitch, tPitch, c) * DEG;
    cam.yaw = mix(sYaw, 0, c) * DEG;
    cam.fov = mix(sFov, tFov, c);
    cam.pitch = Math.max(cam.pitch, -89.995 * DEG);
    fwd.set(-Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), -Math.cos(cam.yaw) * Math.cos(cam.pitch));
    camera.position.copy(target).addScaledVector(fwd, -cam.dist);
    camera.rotation.set(cam.pitch, cam.yaw, 0);
    // a few pixels of pointer parallax (0 in ?capture): a pure translation in the view plane
    if (pointer && (pointer.x || pointer.y)) {
      right.set(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
      upv.crossVectors(right, fwd).normalize();
      const k = 0.0045 * cam.dist;
      camera.position.addScaledVector(right, pointer.x * k).addScaledVector(upv, pointer.y * k * 0.6);
    }
    // a narrow window keeps the horizontal field of a 16:10 frame
    const aspect = W / H;
    const tv = Math.tan((cam.fov * DEG) / 2) * Math.max(1, 1.6 / aspect);
    camera.fov = (2 * Math.atan(tv)) / DEG;
    camera.aspect = aspect;
    cam.alt = camera.position.y;
    const reach = Math.max(cam.dist, camera.position.y);
    camera.near = clamp(0.012 * reach, 0.5, 40);
    camera.far = Math.max(3000, reach * 5 + 4000);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    return c;
  }

  // ---------------------------------------------------------------- the light rig
  const shadowC = new THREE.Vector3();
  const lightDir = new THREE.Vector3();
  const _q0 = new THREE.Quaternion();
  const _q1 = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1);
  function placeLights(p, crane) {
    // direction: studio key → sun (spherical interpolation, no dip)
    const k = sstep(C.crane[0] + 0.005, C.crane[1] - 0.02, p);
    _q0.setFromUnitVectors(zAxis, KEY_STUDIO);
    _q1.setFromUnitVectors(zAxis, SUN);
    _q0.slerp(_q1, k);
    lightDir.copy(zAxis).applyQuaternion(_q0).normalize();
    key.color.copy(KEY_STUDIO_COL).lerp(KEY_DAY_COL, k);
    key.intensity = mix(2.6, 2.75, k);
    fill.intensity = 0.5 * (1 - k);
    hemi.intensity = mix(0.25, 1.0, k);
    hemi.color.copy(HEMI_STUDIO[0]).lerp(HEMI_DAY[0], k);
    hemi.groundColor.copy(HEMI_STUDIO[1]).lerp(HEMI_DAY[1], k);
    scene.environmentIntensity = mix(0.7, 0.32, k);
    renderer.toneMappingExposure = EXPOSURE(p);

    // the shadow fit: the action of the stage (centre, radius)
    let r;
    const wS = W_SHIP(p), wP = W_PLANE(p);
    if (crane < 1e-4) {
      // side views: the subjects around the hero box and the truck
      shadowC.set(hero.x + 3, 0, -2);
      r = 34;
    } else {
      const fh = frameH(cam.dist, cam.fov);
      const rTop = clamp(0.62 * fh * 1.25, 40, 150);
      tmp.set(target.x, 0, target.z);
      shadowC.set(hero.x + 3, 0, -2).lerp(tmp, crane);
      r = mix(34, rTop, crane);
      if (wS > 0) {
        tmp.set(shipPos.x, 20, shipPos.z);
        shadowC.lerp(tmp, wS);
        r = mix(r, 190, wS);
      }
      if (wP > 0) {
        plane.positionAt(p, planeCentre, tmp);
        shadowC.lerp(tmp, wP);
        r = mix(r, 70, wP);
      }
    }
    // texel snapping (no shimmer while the frustum slides)
    const texel = (2 * r) / key.shadow.mapSize.x;
    const lx = new THREE.Vector3().crossVectors(lightDir, Math.abs(lightDir.y) > 0.99 ? zAxis : new THREE.Vector3(0, 1, 0)).normalize();
    const ly = new THREE.Vector3().crossVectors(lx, lightDir).normalize();
    const a = Math.round(shadowC.dot(lx) / texel) * texel - shadowC.dot(lx);
    const b = Math.round(shadowC.dot(ly) / texel) * texel - shadowC.dot(ly);
    shadowC.addScaledVector(lx, a).addScaledVector(ly, b);
    const far = 2 * r + 600;
    key.target.position.copy(shadowC);
    key.position.copy(shadowC).addScaledVector(lightDir, r + 300);
    const sc = key.shadow.camera;
    sc.left = -r;
    sc.right = r;
    sc.top = r;
    sc.bottom = -r;
    sc.near = 1;
    sc.far = far;
    sc.updateProjectionMatrix();
    key.shadow.normalBias = 0.0011 * r;
    key.shadow.radius = mix(7, 4, clamp((r - 34) / 120));
    key.target.updateMatrixWorld();
    key.updateMatrixWorld();
    fill.target.position.copy(shadowC);
    fill.position.copy(shadowC).addScaledVector(FILL_DIR, 60);
    fill.target.updateMatrixWorld();
    fill.updateMatrixWorld();
  }

  // ---------------------------------------------------------------- update
  function update(state, dt = 0, time = 0) {
    const p = clamp(+state.p || 0);
    curP = p;
    stage = stageAt(p);
    // 1. the port's choreography, then the truck on the road
    port.update(p, time);
    sinkApron(p < C.carry[1] + 0.01);
    // (the 30 m light masts read as black wedges in the crane and as long sticks at the frame edges
    // from above: the yard does without them)
    if (masts) masts.visible = masts.castShadow = false;
    const s = poseTruck(p);
    // (v3) the orange « sillage » trail on the map, from the gate to the truck, over the road chapter
    road.setTrail(s - LANE, sstep(C.road[0] - 0.005, C.road[0] + 0.015, p) * (1 - sstep(C.coast[0] + 0.005, C.coast[0] + 0.02, p)));
    // 2. the camera (final before the voyage update: the ocean and clouds follow it)
    const crane = placeCamera(p, s, state.pointer);
    // 3. the voyage (ship, plane, ocean, clouds, white-out), then the map's reveal
    const reveal = sstep(C.crane[0] + 0.012, C.crane[1] - 0.012, p);
    voyage.setReveal(reveal); // before update: its stage visibility reads the reveal
    voyage.update(p, time, camera);
    vGround.visible = reveal > 0.001;
    // (v3) from the climb on there is no land: the road, the quay and its cranes go, and the sea runs
    // on to the north (its quay line moves away, out of the frame), so no straight coast or crane
    // leg can show at the top of the frame, whatever the clouds do
    const flood = sstep(C.clouds[0] + 0.022, C.clouds[0] + 0.055, p);
    if (flood > 0) road.group.visible = false;
    voyage.ocean.mesh.material.uniforms.uQuayZ.value = ROAD.quayZ - 4000 * flood;
    // the white-out from above is the cloud layer itself thickening to paper (no full-screen veil):
    // the plane and its contrails stay over it and fly out of the frame as « Arrivée » rises,
    // a white product-render plane on paper (the bookend of the white port studio)
    if (camera.position.y > SKY.cloudTop) voyage.clouds.veil.visible = false;
    plane.object.visible = p > C.plane[0] - 0.035;
    if (p > C.whiteout[1] + 0.003) {
      voyage.ocean.mesh.visible = false;
      ship.object.visible = false;
    }
    // 4. what the camera can see: the port's yard and machines only while in view
    pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(pv);
    const yardOn = p < C.coast[1] && frustum.intersectsBox(yardBox);
    truckSphere.center.copy(truckC);
    const truckOn = p < C.ship[0] + 0.02 && frustum.intersectsSphere(truckSphere);
    port.show({ terminal: yardOn, carrier: yardOn, truck: truckOn, hero: truckOn || yardOn });
    port.group.visible = yardOn || truckOn;
    // past the white-out the frame is the paper clear colour alone (nothing left to draw under the
    // sliding « Arrivée » section)
    voyage.group.visible = true;
    // 5. light, exposure, shadow fit
    placeLights(p, crane);
    void dt;
  }

  function stageAt(p) {
    const c = CHAPTERS.find((k) => p >= k.from && p < k.to) || CHAPTERS[CHAPTERS.length - 1];
    return { port: 'port', route: 'road', mer: 'sea', air: 'air', arrivee: 'air' }[c.id];
  }

  // ---------------------------------------------------------------- anchors (CSS px)
  const P = new THREE.Vector3();
  function project(v) {
    P.copy(v).project(camera);
    const front = P.z > -1 && P.z < 1;
    return { x: ((P.x + 1) / 2) * W, y: ((1 - P.y) / 2) * H, front };
  }
  const onScreen = (q, m = 0) => q.front && q.x >= -m && q.x <= W + m && q.y >= -m && q.y <= H + m;
  // five attach points beside the hull, alternating sides, spread from the stern (top) to the bow
  // (bottom): local (x = side offset beyond the beam, z = fraction of the half length)
  const CALLOUT_LOCAL = [
    ['left', -0.62],
    ['right', -0.3],
    ['left', 0.04],
    ['right', 0.38],
    ['left', 0.7],
  ];
  function anchors() {
    const a = ship.anchorPoints(curP);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    let front = true;
    for (const v of [...a.corners, a.bow, a.stern]) {
      const q = project(v);
      front = front && q.front;
      x0 = Math.min(x0, q.x);
      y0 = Math.min(y0, q.y);
      x1 = Math.max(x1, q.x);
      y1 = Math.max(y1, q.y);
    }
    const shipVis = ship.object.visible && front && x1 > 0 && x0 < W && y1 > 0 && y0 < H && stage !== 'port';
    const c = a.centre;
    const gap = 7 + 0.012 * cam.alt; // metres beyond the hull side (a little more from higher up)
    const callouts = CALLOUT_LOCAL.map(([side, f]) => {
      tmp.set(c.x + (side === 'left' ? -1 : 1) * (ship.halfBeam + gap), c.y, c.z + f * ship.halfLength);
      const q = project(tmp);
      return { x: q.x, y: q.y, side, visible: shipVis && onScreen(q, -6) };
    });
    port.truckCentre(tmp);
    const t = project(tmp);
    const pl = project(plane.object.position);
    return {
      ship: { x: x0, y: y0, w: x1 - x0, h: y1 - y0, visible: shipVis },
      callouts,
      truck: { x: t.x, y: t.y, visible: port.group.visible && onScreen(t) && curP < C.coast[1] },
      plane: { x: pl.x, y: pl.y, visible: plane.object.visible && onScreen(pl) },
    };
  }

  // ---------------------------------------------------------------- contract
  function resize(w, h, dpr) {
    W = Math.max(1, w);
    H = Math.max(1, h);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }

  function render() {
    renderer.render(scene, camera);
  }

  // every stage once, into a small corner of the canvas (the programs and shadow programs compile;
  // the pixels do not matter: the shell renders the real frame right after)
  const WARM = [0.0, 0.1, 0.2, 0.24, 0.3, 0.36, 0.455, 0.55, 0.69, 0.745, 0.765, 0.84, 0.875, 0.93];
  async function warmup() {
    const st = { p: curP, pointer: { x: 0, y: 0 } };
    const keep = curP;
    const size = renderer.getSize(new THREE.Vector2());
    const vp = new THREE.Vector4();
    renderer.getViewport(vp);
    renderer.setScissorTest(true);
    renderer.setScissor(0, 0, Math.min(96, size.x), Math.min(60, size.y));
    renderer.setViewport(0, 0, Math.min(96, size.x), Math.min(60, size.y));
    for (const p of WARM) {
      st.p = p;
      update(st, 1, 0);
      // the cloud veil shows only while the camera sits inside a cloud puff (time-dependent), never at
      // these states: show it for one climb state so its program compiles under the loader too
      if (p === 0.765) voyage.clouds.veil.visible = true;
      renderer.render(scene, camera);
      await new Promise((r) => setTimeout(r, 0));
    }
    renderer.setScissorTest(false);
    renderer.setViewport(vp);
    st.p = keep;
    update(st, 1, 0);
  }

  function setQuality(lv) {
    if (!LEVELS.includes(lv) || lv === level) return;
    level = lv;
    port.setQuality(lv);
    voyage.setQuality(lv);
    const sz = SHADOW_SIZE[lv];
    if (key.shadow.mapSize.x !== sz) {
      key.shadow.mapSize.set(sz, sz);
      if (key.shadow.map) {
        key.shadow.map.dispose();
        key.shadow.map = null;
      }
    }
  }

  function stats() {
    const i = renderer.info;
    return {
      calls: i.render.calls,
      triangles: i.render.triangles,
      textures: i.memory.textures,
      geometries: i.memory.geometries,
      programs: i.programs ? i.programs.length : 0,
      stage,
      level,
    };
  }

  update({ p: 0, pointer: { x: 0, y: 0 } }, 1, 0);
  resize(W, H, renderer.getPixelRatio());
  onProgress(1);

  return {
    camera,
    scene,
    port,
    voyage,
    update,
    render,
    resize,
    warmup,
    setQuality,
    stats,
    anchors,
    info: () => ({ stage }),
    // debugging (window.__world): the rig's current values
    rig: () => ({ p: curP, ...cam, target: target.toArray().map((v) => +v.toFixed(2)), pos: camera.position.toArray().map((v) => +v.toFixed(2)) }),
  };
}

void ROAD;
