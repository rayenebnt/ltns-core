// Port module: the truck. A white European cab-over 4×2 tractor (no maker badge) with the brand
// stripe and « SILLAGE » on the doors, and a skeletal tri-axle 40' container chassis.
// Frames: both the tractor and the trailer have their origin on the ground under the kingpin,
// +X forward. The trailer centre (= the container centre) is TRUCK.centre m behind the kingpin.
// Pose API: setPose({ x, z, heading, travelled, articulation }) with (x, z) the trailer centre,
// heading the trailer heading (radians about +Y, 0 = east +X), articulation the tractor's
// heading minus the trailer's (0 on a straight road), travelled the distance for wheel spin.
import * as THREE from 'three';
import { Kit, rbox, box, cyl, tube, extrude, mat, lin, kitMaterial, lampMaterial } from './kit.js';
import { wheelGeometry } from './wheels.js';
import { truckDecal } from './textures.js';

export const TRUCK = {
  centre: 4.65, // kingpin → trailer centre (m)
  deck: 1.32, // container bottom on the twistlocks
  r: 0.535, // wheel radius
  rearAxle: -0.45, // tractor frame
  frontAxle: 3.25,
  trailerAxles: [-6.64, -7.95, -9.26], // trailer frame
  twist: [[1.342, 1.1295], [-10.642, 1.1295]], // corner twistlocks (x, ±z), trailer frame
};

const WHITE = { c: lin('#f3f3f0'), r: 0.18, m: 0.0, e: -0.5 };
const WHITE2 = { c: lin('#e6e7e5'), r: 0.3, m: 0.05 };
const DARK = { c: lin('#1d2024'), r: 0.6, m: 0.25 };
const BLACK = { c: lin('#0f1012'), r: 0.75, m: 0.05 };
const GRAPH = { c: lin('#2b2f34'), r: 0.5, m: 0.45 };
const CHASSIS = { c: lin('#26292d'), r: 0.55, m: 0.4 };
const STEEL = { c: lin('#c3c8cc'), r: 0.22, m: 0.95 };
const GLASS = { c: lin('#121b23'), r: 0.03, m: 0.1, e: -2.5 };
const ORANGE = { c: lin('#ff5a1f'), r: 0.3, m: 0.0, e: -0.5 };
const LENS = { c: lin('#f6f4ee'), r: 0.1, m: 0.1, e: 0.35 };
const RED = { c: lin('#c41a12'), r: 0.3, m: 0, e: 0.5 };
const AMBER = { c: lin('#ff8a10'), r: 0.3, m: 0, e: 0.5 };

function tractorGeometry(quality) {
  const k = new Kit();
  const fine = quality === 'high' || quality === 'max';
  const x0 = 2.35; // cab rear
  const x1 = 4.62; // cab front
  const cw = 2.48;
  const y0 = 1.12;
  const y1 = 3.78;
  const cx = (x0 + x1) / 2;
  // chassis rails and cross members
  for (const z of [-0.43, 0.43]) k.add(box(5.9, 0.3, 0.09), mat([1.5, 0.83, z]), CHASSIS);
  for (const x of [-1.2, 0.3, 1.6, 2.9, 4.0]) k.add(box(0.12, 0.22, 0.8), mat([x, 0.83, 0]), CHASSIS);
  // cab shell
  k.add(rbox(x1 - x0, y1 - y0, cw, 0.2, 3), mat([cx, (y0 + y1) / 2, 0]), WHITE);
  // windshield (raked glass) and its frame
  k.add(rbox(0.06, 1.12, 2.22, 0.03), mat([x1 + 0.0, 2.84, 0], [0, 0, 0.09]), GLASS);
  // side windows (door glass + quarter glass)
  for (const s of [-1, 1]) {
    k.add(rbox(1.08, 1.0, 0.04, 0.03), mat([3.92, 2.82, s * (cw / 2 + 0.002)]), GLASS);
    k.add(rbox(0.32, 0.8, 0.04, 0.03), mat([3.08, 2.9, s * (cw / 2 + 0.002)]), GLASS);
    // door seam and handle
    k.add(box(0.012, 2.15, 0.012), mat([3.3, 2.2, s * (cw / 2 + 0.003)]), DARK);
    k.add(box(0.012, 2.15, 0.012), mat([4.5, 2.2, s * (cw / 2 + 0.003)]), DARK);
    k.add(rbox(0.22, 0.05, 0.04, 0.015), mat([3.5, 2.12, s * (cw / 2 + 0.02)]), GRAPH);
    // the brand decal on the door (below the windows)
    const dp = new THREE.PlaneGeometry(2.28, 1.05);
    const U = dp.attributes.uv;
    for (let i = 0; i < U.count; i++) U.setXY(i, U.getX(i), (1.15 + U.getY(i) * 1.05) / 4);
    k.add(dp, s > 0 ? mat([cx, 1.675, cw / 2 + 0.004]) : mat([cx, 1.675, -cw / 2 - 0.004], [0, Math.PI, 0]), { ...WHITE, d: true });
    // mirrors: arm, main and wide-angle heads
    k.add(tube([[x1 - 0.12, 3.05, s * 1.18], [x1 + 0.05, 3.1, s * 1.42], [x1 + 0.02, 2.95, s * 1.5]], 0.022, 6), null, DARK);
    k.add(rbox(0.08, 0.5, 0.22, 0.03), mat([x1 + 0.02, 2.82, s * 1.5]), DARK);
    k.add(rbox(0.08, 0.22, 0.2, 0.03), mat([x1 + 0.02, 2.36, s * 1.48]), DARK);
    // steps behind the front wheel
    k.add(box(0.36, 0.04, 0.3), mat([2.55, 0.62, s * 1.08]), BLACK);
    k.add(box(0.36, 0.04, 0.3), mat([2.55, 0.98, s * 1.08]), BLACK);
    k.add(box(0.4, 0.75, 0.04), mat([2.55, 0.82, s * 0.95]), DARK);
    // front fender (black arch) over the front wheel
    // (after rotateX the cylinder angle θ sits at (sin θ, −cos θ): θ = π is the top of the wheel)
    const f = new THREE.CylinderGeometry(0.64, 0.64, 0.42, 16, 1, true, Math.PI * 0.64, Math.PI * 0.7);
    f.rotateX(Math.PI / 2);
    k.add(f, mat([TRUCK.frontAxle, TRUCK.r, s * 1.03]), BLACK);
    // side skirt between the axles (covers the tank), and the rear mudguards
    if (s > 0) k.add(rbox(0.85, 0.62, 0.05, 0.03), mat([0.6, 0.8, 1.2]), WHITE2); // short skirt, the tank shows
    else k.add(rbox(2.25, 0.62, 0.05, 0.03), mat([1.42, 0.8, -1.2]), WHITE2);
    k.add(box(1.25, 0.04, 0.72), mat([TRUCK.rearAxle, 1.18, s * 0.92]), BLACK);
    k.add(box(0.03, 0.55, 0.62), mat([TRUCK.rearAxle - 0.66, 0.85, s * 0.92]), BLACK);
    // headlights in the bumper corners
    k.add(rbox(0.06, 0.2, 0.42, 0.03), mat([x1 + 0.05, 1.08, s * 0.92]), LENS);
    k.add(rbox(0.05, 0.08, 0.16, 0.02), mat([x1 + 0.05, 0.72, s * 1.0]), LENS);
    // tail lights on the chassis end
    k.add(box(0.06, 0.12, 0.3), mat([-1.48, 0.86, s * 0.7]), RED);
  }
  // grille (dark, slats, no badge), bumper, lower spoiler
  k.add(rbox(0.04, 0.82, 1.82, 0.03), mat([x1 + 0.01, 1.72, 0]), DARK);
  for (let i = 0; i < 5; i++) k.add(box(0.03, 0.05, 1.7), mat([x1 + 0.04, 1.42 + i * 0.15, 0]), GRAPH);
  k.add(rbox(0.3, 0.55, 2.48, 0.06, 2), mat([x1 - 0.06, 0.88, 0]), { c: lin('#d9dad8'), r: 0.4, m: 0.05 });
  k.add(rbox(0.26, 0.14, 2.3, 0.04), mat([x1 - 0.06, 0.55, 0]), DARK);
  // sun visor
  k.add(rbox(0.36, 0.06, 2.3, 0.025), mat([x1 + 0.12, 3.5, 0], [0, 0, -0.16]), DARK);
  // roof: deflector fairing with an orange band, hatch
  const def = extrude([[x0 + 0.06, y1 - 0.02], [x0 + 0.06, y1 + 0.3], [x0 + 0.5, y1 + 0.32], [x1 - 0.25, y1 - 0.02]], 2.3, 0.04);
  k.add(def, null, WHITE);
  k.add(box(0.06, 0.06, 2.34), mat([x0 + 0.1, y1 + 0.3, 0]), ORANGE);
  k.add(box(0.44, 0.012, 2.3), mat([x0 + 0.29, y1 + 0.335, 0], [0, 0, -0.04]), ORANGE);
  k.add(rbox(0.6, 0.08, 0.7, 0.03), mat([x1 - 0.7, y1 + 0.03, -0.4]), WHITE2);
  // cab back: deck plate, air and electric lines to the trailer (coiled)
  k.add(box(0.95, 0.03, 1.1), mat([1.85, 1.0, 0]), { c: lin('#3a3e43'), r: 0.7, m: 0.4 });
  if (fine) {
    const coil = (z0, col) => {
      const pts = [];
      for (let i = 0; i <= 48; i++) {
        const t = i / 48;
        const a = t * Math.PI * 2 * 7;
        pts.push([x0 - 0.1 - t * 1.0, 2.0 - t * 0.75 + Math.sin(a) * 0.05, z0 + Math.cos(a) * 0.06]);
      }
      k.add(tube(pts, 0.012, 5, false, 0.5), null, col);
    };
    coil(-0.15, { c: lin('#c21d17'), r: 0.5, m: 0 });
    coil(0.0, { c: lin('#e8b417'), r: 0.5, m: 0 });
    coil(0.15, { c: lin('#18191b'), r: 0.5, m: 0 });
  }
  // fifth wheel
  k.add(cyl(0.48, 0.48, 0.1, 24), mat([0, 1.15, 0]), GRAPH);
  k.add(box(0.5, 0.11, 0.18), mat([-0.25, 1.16, 0]), BLACK);
  // fuel tank (right) and air tanks / battery box (left), under the skirts
  k.add(cyl(0.3, 0.3, 1.25, 20), mat([1.68, 0.8, 0.9], [0, 0, Math.PI / 2], [1, 1, 1.05]), STEEL);
  for (const x of [1.25, 2.1]) k.add(cyl(0.312, 0.312, 0.05, 20), mat([x, 0.8, 0.9], [0, 0, Math.PI / 2]), DARK); // straps
  k.add(cyl(0.07, 0.07, 0.05, 12), mat([2.0, 1.1, 0.9]), DARK); // filler cap
  k.add(box(1.3, 0.05, 0.36), mat([1.68, 0.47, 0.9]), DARK); // bracket
  k.add(rbox(1.0, 0.5, 0.4, 0.04), mat([1.6, 0.78, -0.82]), GRAPH);
  // rear axle housing and front axle beam
  k.add(cyl(0.1, 0.1, 1.6, 10), mat([TRUCK.rearAxle, TRUCK.r, 0], [Math.PI / 2, 0, 0]), GRAPH);
  k.add(cyl(0.22, 0.22, 0.3, 14), mat([TRUCK.rearAxle, TRUCK.r, 0], [Math.PI / 2, 0, 0]), GRAPH);
  k.add(box(0.12, 0.12, 1.75), mat([TRUCK.frontAxle, TRUCK.r + 0.05, 0]), GRAPH);
  return k.build();
}

function trailerGeometry(quality) {
  const k = new Kit();
  const fine = quality === 'high' || quality === 'max';
  const xf = 1.55;
  const xr = -10.85;
  const len = xf - xr;
  const xc = (xf + xr) / 2;
  // main I-beams
  for (const z of [-0.5, 0.5]) {
    k.add(box(len, 0.03, 0.16), mat([xc, 1.285, z]), CHASSIS);
    k.add(box(len, 0.3, 0.02), mat([xc, 1.13, z]), CHASSIS);
    k.add(box(len - 0.6, 0.03, 0.16), mat([xc - 0.3, 0.97, z]), CHASSIS);
  }
  // bolsters (front, rear) and middle outriggers, cross members
  for (const [x, w] of [[TRUCK.twist[0][0], 2.44], [TRUCK.twist[1][0], 2.44], [-4.65 + 0.05, 2.38], [-4.65 - 0.05, 2.38]]) {
    k.add(rbox(0.22, 0.26, w, 0.02), mat([x, 1.17, 0]), CHASSIS);
  }
  for (let x = xf - 1.2; x > xr + 0.5; x -= 1.15) k.add(box(0.1, 0.18, 1.0), mat([x, 1.15, 0]), CHASSIS);
  // twistlocks (corner and middle): housing, cone, lever
  const tw = [[TRUCK.twist[0][0], 1.1295], [TRUCK.twist[1][0], 1.1295], [-4.65 + 0.06, 1.1295], [-4.65 - 0.06, 1.1295]];
  for (const [x, z0] of tw) for (const s of [-1, 1]) {
    k.add(box(0.18, 0.1, 0.2), mat([x, 1.27, s * z0]), STEEL);
    k.add(cyl(0.03, 0.05, 0.06, 8), mat([x, 1.33, s * z0]), STEEL);
    k.add(box(0.03, 0.03, 0.16), mat([x, 1.24, s * (z0 + 0.14)]), STEEL);
  }
  // upper coupler plate and kingpin
  k.add(box(1.7, 0.05, 2.0), mat([0.55, 1.2, 0]), CHASSIS);
  k.add(cyl(0.05, 0.05, 0.08, 10), mat([0, 1.14, 0]), STEEL);
  // landing legs with sand shoes and a crank
  for (const s of [-1, 1]) {
    k.add(box(0.13, 0.85, 0.13), mat([-0.7, 0.72, s * 0.86]), GRAPH);
    k.add(box(0.1, 0.5, 0.1), mat([-0.7, 0.42, s * 0.86]), STEEL);
    k.add(box(0.28, 0.05, 0.22), mat([-0.7, 0.16, s * 0.86]), GRAPH);
  }
  k.add(box(0.06, 0.06, 1.72), mat([-0.7, 0.6, 0]), GRAPH);
  k.add(tube([[-0.7, 0.95, 0.94], [-0.7, 0.95, 1.12], [-0.7, 0.72, 1.12]], 0.018, 5), null, STEEL);
  // axles, hangers, air bags
  for (const x of TRUCK.trailerAxles) {
    k.add(cyl(0.065, 0.065, 2.0, 10), mat([x, TRUCK.r, 0], [Math.PI / 2, 0, 0]), GRAPH);
    for (const s of [-1, 1]) {
      k.add(box(0.12, 0.4, 0.1), mat([x + 0.35, 0.8, s * 0.5]), CHASSIS);
      k.add(box(0.75, 0.08, 0.12), mat([x + 0.05, 0.6, s * 0.5]), GRAPH);
      k.add(cyl(0.15, 0.15, 0.22, 14), mat([x - 0.3, 0.8, s * 0.5]), BLACK);
    }
  }
  // mudguards over the axle group, mudflaps, side lights
  for (const s of [-1, 1]) {
    k.add(rbox(4.0, 0.04, 0.5, 0.015), mat([-7.95, 1.12, s * 1.05]), BLACK);
    k.add(box(4.0, 0.12, 0.02), mat([-7.95, 1.08, s * 1.3]), BLACK);
    k.add(box(0.025, 0.62, 0.48), mat([-9.95, 0.62, s * 1.05]), BLACK);
    k.add(box(0.025, 0.12, 0.48), mat([-9.94, 0.98, s * 1.05]), DARK);
    for (const x of [-1.5, -4.6, -7.95]) k.add(box(0.09, 0.05, 0.03), mat([x, 1.06, s * (x < -6 ? 1.32 : 1.22)]), AMBER);
    if (fine) for (const x of [-2.6, -6.5]) k.add(box(0.5, 0.06, 0.6), mat([x, 1.0, s * 0.82]), CHASSIS); // side outriggers
  }
  // rear: under-run bar on its brackets, light bar with lamps, blank plate
  k.add(rbox(0.12, 0.14, 2.3, 0.02), mat([xr + 0.05, 0.48, 0]), GRAPH);
  for (const s of [-1, 1]) k.add(box(0.08, 0.6, 0.08), mat([xr + 0.1, 0.8, s * 0.55]), GRAPH);
  k.add(box(0.1, 0.12, 2.3), mat([xr + 0.08, 1.02, 0]), CHASSIS);
  for (const s of [-1, 1]) {
    k.add(box(0.04, 0.1, 0.22), mat([xr + 0.03, 1.02, s * 0.95]), RED);
    k.add(box(0.04, 0.1, 0.1), mat([xr + 0.03, 1.02, s * 0.75]), AMBER);
  }
  k.add(box(0.02, 0.11, 0.52), mat([xr + 0.02, 0.86, 0.3]), { c: lin('#ecebe6'), r: 0.4, m: 0 });
  return k.build();
}

export function createTruck({ quality = 'high' } = {}) {
  const decal = truckDecal();
  const material = kitMaterial({ decal, grime: 0.28, grimeH: 1.1, name: 'truck', occl: [0.2, 3.2, 0.22] });
  const tractor = new THREE.Mesh(tractorGeometry(quality), material);
  const trailer = new THREE.Mesh(trailerGeometry(quality), material);
  for (const m of [tractor, trailer]) {
    m.castShadow = m.receiveShadow = true;
    m.matrixAutoUpdate = false;
  }
  const wGeo = wheelGeometry({ R: TRUCK.r, w: 0.34, rimR: 0.29, kind: 'road', rim: '#c9cdd0', quality });
  // 2 front + 4 rear (dual) + 6 trailer
  const wheelDefs = [];
  for (const s of [-1, 1]) {
    wheelDefs.push({ on: 'T', x: TRUCK.frontAxle, z: s * 1.03, s, w: 0.95 });
    wheelDefs.push({ on: 'T', x: TRUCK.rearAxle, z: s * 1.07, s, w: 0.95 });
    wheelDefs.push({ on: 'T', x: TRUCK.rearAxle, z: s * 0.72, s: -s, w: 0.95 });
    for (const x of TRUCK.trailerAxles) wheelDefs.push({ on: 'R', x, z: s * 1.05, s, w: 1.13 });
  }
  const wheels = new THREE.InstancedMesh(wGeo, material, wheelDefs.length);
  wheels.castShadow = wheels.receiveShadow = true;
  wheels.frustumCulled = false;
  // trailer twistlock status lamps (amber → green when the container is locked)
  const lampGeo = new THREE.BoxGeometry(0.06, 0.05, 0.06);
  const lamps = new THREE.InstancedMesh(lampGeo, lampMaterial(), 4);
  lamps.frustumCulled = false;
  const lampLocal = [];
  for (const [x, z] of TRUCK.twist) for (const s of [-1, 1]) lampLocal.push(new THREE.Vector3(x + (x > 0 ? -0.16 : 0.16), 1.25, s * (z + 0.16)));

  const group = new THREE.Group();
  group.name = 'truck';
  group.add(tractor, trailer, wheels, lamps);

  const amber = new THREE.Color(1.0, 0.36, 0.02); // linear, unlit (tone mapping off)
  const green = new THREE.Color(0.08, 1.0, 0.28);
  const _c = new THREE.Color();
  const _m = new THREE.Matrix4();
  const _r = new THREE.Matrix4();
  const _flip = new THREE.Matrix4().makeRotationY(Math.PI);
  const trailerMatrix = new THREE.Matrix4();
  const state = { x: 22, z: 0, heading: 0, articulation: 0, travelled: 0, lock: 0 };

  // the container seat in world space (centre of the container bottom), for the hero
  const seat = new THREE.Matrix4();

  function apply() {
    const { x, z, heading, articulation, travelled } = state;
    // three.js rotation about +Y by θ maps +X to (cos θ, 0, −sin θ): heading h (0 = east, toward
    // north = +π/2 when turning left) → rotation.y = h
    const ch = Math.cos(heading);
    const sh = Math.sin(heading);
    // kingpin = centre + heading direction × centre distance
    const kx = x + ch * TRUCK.centre;
    const kz = z - sh * TRUCK.centre;
    trailerMatrix.makeRotationY(heading).setPosition(kx, 0, kz);
    trailer.matrix.copy(trailerMatrix);
    tractor.matrix.makeRotationY(heading + articulation).setPosition(kx, 0, kz);
    trailer.matrixWorldNeedsUpdate = tractor.matrixWorldNeedsUpdate = true;
    seat.makeTranslation(-TRUCK.centre, TRUCK.deck, 0).premultiply(trailerMatrix);
    const roll = -travelled / TRUCK.r;
    wheelDefs.forEach((w, i) => {
      _r.makeRotationZ(roll);
      if (w.s < 0) _r.multiply(_flip);
      _m.makeScale(1, 1, w.w);
      _r.multiply(_m);
      _r.setPosition(w.x, TRUCK.r, w.z);
      _r.premultiply(w.on === 'T' ? tractor.matrix : trailer.matrix);
      wheels.setMatrixAt(i, _r);
    });
    wheels.instanceMatrix.needsUpdate = true;
    _c.copy(amber).lerp(green, state.lock);
    lampLocal.forEach((p, i) => {
      _m.makeTranslation(p.x, p.y, p.z).premultiply(trailerMatrix);
      lamps.setMatrixAt(i, _m);
      lamps.setColorAt(i, _c);
    });
    lamps.instanceMatrix.needsUpdate = true;
    if (lamps.instanceColor) lamps.instanceColor.needsUpdate = true;
  }

  return {
    group,
    tractor,
    trailer,
    material,
    seat, // world matrix of the container seat (updated by setPose)
    textures: [decal],
    setPose(p) {
      for (const k of ['x', 'z', 'heading', 'articulation', 'travelled', 'lock']) if (p[k] !== undefined) state[k] = p[k];
      apply();
    },
    getPose: () => ({ ...state }),
    dispose() {
      [tractor.geometry, trailer.geometry, wGeo, lampGeo].forEach((g) => g.dispose());
      material.dispose();
      lamps.material.dispose();
      decal.dispose();
    },
  };
}
