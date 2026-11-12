// Port module: the straddle carrier (« cavalier »), 1-over-2. Local frame: origin on the ground
// under the machine's centre, front (cabin) toward +X, legs at z = ±ZL.
// About 9.6 m long, 13.6 m high, 5 m wide outside the legs; clear inner width 3.4 m, clear
// height under the hoist sheaves about 10.3 m (a 2.9 m box lifted over a 2-high stack).
// Parts: body (kit, 1 draw), wheels (8 instances), spreader (kit), ropes (4 instances),
// status lamps (instanced, amber → green), beacons (2, rotating flash).
import * as THREE from 'three';
import { Kit, rbox, box, cyl, tube, extrude, mat, lin, kitMaterial, lampMaterial, shared } from './kit.js';
import { wheelGeometry } from './wheels.js';
import { carrierDecal } from './textures.js';

export const CARRIER = {
  ZL: 2.2, // leg centre line
  R: 0.8, // wheel radius
  wheelX: [-3.75, -1.25, 1.25, 3.75],
  topY: 10.62, // underside of the top frame
  sheaveY: 10.3, // rope tops
  ropeX: 2.25,
  ropeZ: 1.25,
  spreaderH: 0.56, // spreader body height above the twistlock plane
};

const ORANGE = (k = 1) => ({ c: lin('#ff5a1f', k), r: 0.36, m: 0.0, e: -0.25 });
const GRAPH = { c: lin('#2a2e33'), r: 0.55, m: 0.4 };
const GRAPH_L = { c: lin('#3c4148'), r: 0.5, m: 0.45 };
const DARK = { c: lin('#16181b'), r: 0.65, m: 0.2 };
const STEEL = { c: lin('#a9afb4'), r: 0.28, m: 0.9 };
const GLASS = { c: lin('#18242e'), r: 0.02, m: 0.1, e: -5 };
const LENS = { c: lin('#fffaf0'), r: 0.2, m: 0, e: 1.4 };
const RAIL = { c: lin('#23272b'), r: 0.5, m: 0.5 };

function bodyGeometry(quality) {
  const k = new Kit();
  const { ZL, wheelX, topY } = CARRIER;
  const fine = quality !== 'low';
  const O = ORANGE();
  const O2 = ORANGE(0.92);
  for (const s of [-1, 1]) {
    const z = s * ZL;
    // sill beam (lower longitudinal box girder) with a recessed web line
    k.add(rbox(9.3, 0.72, 0.56, 0.06, 2), mat([0, 2.11, z]), O);
    k.add(box(8.6, 0.06, 0.02), mat([0, 2.11, z + s * 0.285]), O2);
    k.add(rbox(9.2, 0.1, 0.6, 0.03), mat([0, 1.74, z]), GRAPH); // rubbing strip
    for (const ex of [-1, 1]) {
      const hz = new THREE.PlaneGeometry(0.5, 0.6);
      const HU = hz.attributes.uv;
      for (let i = 0; i < HU.count; i++) HU.setY(i, HU.getY(i) * 0.5);
      k.add(hz, mat([ex * 4.652, 2.11, z], [0, ex * Math.PI / 2, 0]), { c: [1, 1, 1], r: 0.45, m: 0.1, d: true });
    }
    // wheel forks: steering column, inner arm, fender over the tyre
    for (const x of wheelX) {
      k.add(cyl(0.2, 0.22, 0.32, 16), mat([x, 1.62, z - s * 0.08]), GRAPH);
      k.add(rbox(0.52, 1.0, 0.12, 0.03), mat([x, 1.12, z - s * 0.4]), GRAPH);
      // mudguard: a short graphite arc over the top of the tyre
      const fender = new THREE.CylinderGeometry(0.88, 0.88, 0.52, 14, 1, true, -Math.PI * 0.2, Math.PI * 0.4);
      fender.rotateX(Math.PI / 2);
      fender.rotateZ(Math.PI / 2);
      k.add(fender, mat([x, 0.8, z]), { ...GRAPH, r: 0.6 });
      const lip = new THREE.TorusGeometry(0.88, 0.02, 4, 14, Math.PI * 0.4);
      lip.rotateZ(Math.PI / 2 - Math.PI * 0.2);
      k.add(lip, mat([x, 0.8, z + 0.26]), GRAPH);
      k.add(lip, mat([x, 0.8, z - 0.26]), GRAPH);
    }
    // the two legs (tapered plate columns) with a cover plate
    for (const lx of [-3.6, 3.6]) {
      const leg = extrude([[-0.46, 0], [0.46, 0], [0.6, topY - 2.45], [-0.6, topY - 2.45]], 0.54, 0.03);
      k.add(leg, mat([lx, 2.45, z]), O);
      const plate = extrude([[-0.3, 0.35], [0.3, 0.35], [0.4, topY - 2.9], [-0.4, topY - 2.9]], 0.03, 0.01);
      k.add(plate, mat([lx, 2.45, z + s * 0.285]), O2);
      // panel seam, hazard plate at the foot, conduits along the inner edge
      k.add(box(0.05, topY - 3.6, 0.014), mat([lx, (topY + 2.9) / 2 + 0.2, z + s * 0.302]), { ...O, c: lin('#ff5a1f', 0.35) });
      for (const ddx of [-0.33, 0.33]) k.add(box(0.03, topY - 3.6, 0.014), mat([lx + ddx * 1.05, (topY + 2.9) / 2 + 0.2, z + s * 0.302]), { ...O, c: lin('#ff5a1f', 0.62) });
      const hzp = new THREE.PlaneGeometry(0.84, 0.26);
      const HU = hzp.attributes.uv;
      for (let i = 0; i < HU.count; i++) HU.setY(i, HU.getY(i) * 0.5);
      k.add(hzp, s > 0 ? mat([lx, 2.72, z + 0.308]) : mat([lx, 2.72, z - 0.308], [0, Math.PI, 0]), { c: [1, 1, 1], r: 0.45, m: 0.1, d: true });
      for (const dx of [-0.36, -0.26]) k.add(cyl(0.035, 0.035, topY - 2.5, 8), mat([lx + dx * Math.sign(-lx), (topY + 2.5) / 2, z - s * 0.3]), GRAPH);
      // knee gussets to the sill beam and under the top beam
      for (const gx of [-1, 1]) {
        const gus = extrude([[0, 0], [0.7, 0], [0, 0.9]], 0.4, 0.01);
        k.add(gus, mat([lx + gx * 0.46, 2.47, z], [0, gx < 0 ? Math.PI : 0, 0]), O2);
        const top = extrude([[0, 0], [0, -1.1], [0.85, 0]], 0.42, 0.01);
        k.add(top, mat([lx + gx * 0.58, topY + 0.02, z], [0, gx < 0 ? Math.PI : 0, 0]), O2);
      }
    }
    // top longitudinal beam
    k.add(rbox(9.6, 1.0, 0.6, 0.07, 2), mat([0, topY + 0.5, z]), O);
    k.add(box(9.0, 0.05, 0.02), mat([0, topY + 0.22, z + s * 0.305]), O2);
    k.add(box(9.0, 0.05, 0.02), mat([0, topY + 0.78, z + s * 0.305]), O2);
    // ladder with a safety cage on the rear leg (outer face)
    {
      const lx = -3.6;
      const zf = z + s * 0.36;
      const y0 = 2.6;
      const y1 = topY + 1.0;
      for (const dx of [-0.22, 0.22]) k.add(box(0.05, y1 - y0, 0.05), mat([lx + dx, (y0 + y1) / 2, zf + s * 0.1]), RAIL);
      for (let y = y0 + 0.2; y < y1; y += 0.3) k.add(cyl(0.016, 0.016, 0.44, 6), mat([lx, y, zf + s * 0.1], [0, 0, Math.PI / 2]), RAIL);
      // brackets
      for (let y = y0 + 0.5; y < y1; y += 2.2) k.add(box(0.5, 0.05, 0.14), mat([lx, y, zf + s * 0.03]), RAIL);
      // cage hoops
      if (fine) {
        for (let y = 4.4; y < y1 - 0.2; y += 0.95) {
          const hoop = new THREE.TorusGeometry(0.38, 0.016, 4, 14, Math.PI);
          hoop.rotateX(Math.PI / 2);
          hoop.rotateY(s > 0 ? 0 : Math.PI);
          k.add(hoop, mat([lx, y, zf + s * 0.1]), RAIL);
        }
        for (const a of [0.25, 0.5, 0.75]) {
          const ang = Math.PI * a;
          k.add(box(0.03, y1 - 4.4, 0.03), mat([lx + Math.cos(ang) * 0.38, (4.4 + y1) / 2, zf + s * (0.1 + Math.sin(ang) * 0.38)]), RAIL);
        }
      }
    }
    // the « SILLAGE » plate on the top beam
    const plate = new THREE.PlaneGeometry(1.5, 0.37);
    const U = plate.attributes.uv;
    for (let i = 0; i < U.count; i++) U.setY(i, 0.5 + U.getY(i) * 0.5);
    k.add(plate, s > 0 ? mat([0.6, topY + 0.5, z + 0.312]) : mat([0.6, topY + 0.5, z - 0.312], [0, Math.PI, 0]), { c: [1, 1, 1], r: 0.35, m: 0.2, d: true });
    // handrail along the top beam (posts + two rails)
    const hy = topY + 1.0;
    const hz = z + s * 0.24;
    for (let x = -1.2; x <= 3.0; x += 1.05) k.add(cyl(0.022, 0.022, 1.05, 6), mat([x, hy + 0.52, hz]), RAIL);
    k.add(cyl(0.025, 0.025, 4.2, 6), mat([0.9, hy + 1.05, hz], [0, 0, Math.PI / 2]), RAIL);
    k.add(cyl(0.02, 0.02, 4.2, 6), mat([0.9, hy + 0.55, hz], [0, 0, Math.PI / 2]), RAIL);
    // work lights on the top beam ends (lens facing down/out)
    for (const x of [-4.4, 4.4]) {
      k.add(rbox(0.32, 0.18, 0.22, 0.03), mat([x, topY - 0.05, z + s * 0.25], [s * 0.5, 0, 0]), GRAPH);
      k.add(box(0.26, 0.012, 0.16), mat([x, topY - 0.145, z + s * 0.28], [s * 0.5, 0, 0]), LENS);
    }
  }
  // cross beams: front and rear (deep), two inner ones carrying the hoist sheaves
  for (const x of [-4.2, 4.2]) k.add(rbox(0.9, 0.86, 2 * CARRIER.ZL - 0.5, 0.06, 2), mat([x, topY + 0.47, 0]), O);
  for (const x of [-CARRIER.ropeX, CARRIER.ropeX]) {
    k.add(rbox(0.5, 0.6, 2 * CARRIER.ZL - 0.5, 0.05, 1), mat([x, topY + 0.38, 0]), O2);
    for (const z of [-CARRIER.ropeZ, CARRIER.ropeZ]) {
      // sheave block and sheave
      k.add(rbox(0.36, 0.34, 0.3, 0.04), mat([x, topY - 0.08, z]), GRAPH);
      k.add(cyl(0.2, 0.2, 0.08, 18), mat([x, topY - 0.2, z], [Math.PI / 2, 0, 0]), GRAPH_L);
      k.add(cyl(0.05, 0.05, 0.36, 8), mat([x, topY - 0.2, z], [Math.PI / 2, 0, 0]), STEEL);
    }
  }
  // deck plates on the top frame (walkway)
  k.add(box(3.3, 0.04, 3.6), mat([0.6, topY + 1.0, 0]), { c: lin('#2f3338'), r: 0.8, m: 0.3 });

  // ---- cabin at the top front (right side)
  {
    const cx = 4.35;
    const cz = 0.95;
    const fy = topY + 1.0; // floor
    const W = 1.9;
    const D = 1.8;
    const H = 2.2;
    // pedestal and floor slab
    k.add(rbox(1.6, 0.36, 1.7, 0.04), mat([cx - 0.1, fy + 0.1, cz]), GRAPH);
    k.add(rbox(W + 0.06, 0.16, D + 0.06, 0.04), mat([cx, fy + 0.34, cz]), O);
    // glass box (slightly inset), front leaning out at the top
    const gl = rbox(W - 0.08, H - 0.3, D - 0.08, 0.05);
    k.add(gl, mat([cx, fy + 0.42 + (H - 0.3) / 2, cz]), GLASS);
    // pillars
    for (const px of [-1, 1]) for (const pz of [-1, 1]) {
      k.add(rbox(0.09, H - 0.25, 0.09, 0.02), mat([cx + px * (W / 2 - 0.03), fy + 0.42 + (H - 0.3) / 2, cz + pz * (D / 2 - 0.03)]), O);
    }
    // mid pillar on the side facing the camera (door frame) and a sill line
    k.add(rbox(0.07, H - 0.3, 0.07, 0.02), mat([cx - 0.25, fy + 0.42 + (H - 0.3) / 2, cz + D / 2 - 0.02]), O);
    k.add(box(W, 0.06, 0.04), mat([cx, fy + 1.0, cz + D / 2 - 0.02]), O2);
    k.add(box(0.04, 0.06, D), mat([cx + W / 2 - 0.02, fy + 1.0, cz]), O2);
    // roof with a visor lip
    k.add(rbox(W + 0.2, 0.2, D + 0.16, 0.06, 2), mat([cx + 0.06, fy + H + 0.06, cz]), O);
    k.add(box(0.36, 0.04, D + 0.1), mat([cx + W / 2 + 0.2, fy + H - 0.02, cz], [0, 0, -0.18]), DARK);
    // wipers on the front glass
    for (const wz of [-0.35, 0.4]) {
      k.add(box(0.02, 0.62, 0.025), mat([cx + W / 2 - 0.01, fy + 1.55, cz + wz], [0.45, 0, 0]), DARK);
      k.add(box(0.03, 0.06, 0.06), mat([cx + W / 2 - 0.01, fy + 1.24, cz + wz]), DARK);
    }
    // step platform and grab handle by the cabin door
    k.add(box(0.8, 0.05, 0.5), mat([cx - 0.45, fy + 0.22, cz + D / 2 + 0.28]), { c: lin('#2f3338'), r: 0.8, m: 0.3 });
    k.add(tube([[cx - 0.85, fy + 0.25, cz + D / 2 + 0.52], [cx - 0.85, fy + 1.15, cz + D / 2 + 0.52], [cx - 0.05, fy + 1.15, cz + D / 2 + 0.52], [cx - 0.05, fy + 0.25, cz + D / 2 + 0.52]], 0.022, 6), null, RAIL);
    // mirrors
    k.add(box(0.04, 0.3, 0.2), mat([cx + W / 2 + 0.12, fy + 1.4, cz + D / 2 + 0.25]), DARK);
    k.add(cyl(0.015, 0.015, 0.4, 6), mat([cx + W / 2 + 0.05, fy + 1.4, cz + D / 2 + 0.1], [Math.PI / 2, 0.5, 0]), DARK);
    // beacon base on the roof
    k.add(cyl(0.12, 0.14, 0.08, 14), mat([cx - 0.4, fy + H + 0.2, cz - 0.5]), DARK);
  }
  // ---- engine and hydraulic housing at the top rear
  {
    const ex = -3.15;
    const ey = topY + 1.0;
    const L = 3.3;
    const D = 4.1;
    const H = 1.6;
    k.add(rbox(L, H, D, 0.1, 2), mat([ex, ey + H / 2, 0]), O);
    // louvres on both long sides and the rear grille
    for (const s of [-1, 1]) {
      for (let i = 0; i < 7; i++) k.add(box(1.4, 0.05, 0.04), mat([ex + 0.5, ey + 0.4 + i * 0.13, s * (D / 2 + 0.005)], [s * 0.6, 0, 0]), DARK);
      k.add(box(1.5, 1.0, 0.012), mat([ex + 0.5, ey + 0.8, s * (D / 2 - 0.004)]), DARK);
      // a service door outline
      k.add(box(0.9, 0.035, 0.02), mat([ex - 0.8, ey + 1.35, s * (D / 2 + 0.002)]), { ...O, c: lin('#ff5a1f', 0.8) });
      k.add(box(0.035, 1.1, 0.02), mat([ex - 0.35, ey + 0.8, s * (D / 2 + 0.002)]), { ...O, c: lin('#ff5a1f', 0.8) });
    }
    k.add(box(0.03, 1.1, 3.2), mat([ex - L / 2 - 0.004, ey + 0.8, 0]), DARK);
    for (let i = 0; i < 9; i++) k.add(box(0.05, 0.04, 3.1), mat([ex - L / 2 - 0.02, ey + 0.32 + i * 0.12, 0]), GRAPH);
    // roof: radiator fan grille, exhaust stack
    k.add(cyl(0.7, 0.7, 0.05, 28), mat([ex - 0.2, ey + H + 0.02, -0.8]), DARK);
    for (let i = -3; i <= 3; i++) k.add(box(1.36, 0.03, 0.04), mat([ex - 0.2, ey + H + 0.05, -0.8 + i * 0.18]), GRAPH);
    k.add(cyl(0.11, 0.11, 1.1, 14), mat([ex + 0.9, ey + H + 0.5, 1.2]), STEEL);
    k.add(cyl(0.16, 0.13, 0.3, 14), mat([ex + 0.9, ey + H + 0.1, 1.2]), GRAPH);
    // beacon base
    k.add(cyl(0.12, 0.14, 0.08, 14), mat([ex + 0.6, ey + H + 0.04, 0.1]), DARK);
    // hydraulic tank between the housing and the cabin
    k.add(rbox(1.4, 0.7, 1.6, 0.08), mat([-0.6, ey + 0.35, -0.9]), GRAPH);
    k.add(cyl(0.08, 0.08, 0.14, 10), mat([-0.6, ey + 0.76, -0.5]), STEEL);
    // pipes along the top frame
    k.add(tube([[-1.3, ey + 0.2, -1.6], [0.2, ey + 0.2, -1.6], [2.0, ey + 0.1, -1.6]], 0.04, 6), null, GRAPH_L);
    k.add(tube([[-1.3, ey + 0.25, -1.45], [0.2, ey + 0.25, -1.45], [2.0, ey + 0.15, -1.45]], 0.03, 6), null, DARK);
  }
  return k.build();
}

// the spreader, local origin = centre of the twistlock plane (the container's top when locked)
function spreaderGeometry(quality) {
  const k = new Kit();
  const fine = quality === 'high' || quality === 'max';
  const tlX = 5.9925; // twistlock centres (40')
  const tlZ = 1.1295;
  // main frame
  k.add(rbox(5.4, 0.42, 1.12, 0.05, 2), mat([0, 0.33, 0]), GRAPH);
  // telescopic beams (lighter grey), sliding out of the frame
  for (const z of [-0.36, 0.36]) {
    k.add(rbox(11.6, 0.24, 0.24, 0.03), mat([0, 0.32, z]), GRAPH_L);
  }
  // end beams with twistlock housings, corner guides (flippers) with hazard faces
  for (const sx of [-1, 1]) {
    k.add(rbox(0.38, 0.38, 2.44, 0.04, 2), mat([sx * 5.82, 0.29, 0]), GRAPH);
    // hazard band on the end face
    const hz = new THREE.PlaneGeometry(2.2, 0.22);
    const U = hz.attributes.uv;
    for (let i = 0; i < U.count; i++) U.setY(i, U.getY(i) * 0.5);
    k.add(hz, mat([sx * 6.012, 0.3, 0], [0, sx * Math.PI / 2, 0]), { c: [1, 1, 1], r: 0.5, m: 0.1, d: true });
    for (const sz of [-1, 1]) {
      k.add(rbox(0.3, 0.2, 0.3, 0.03), mat([sx * tlX, 0.1, sz * tlZ]), GRAPH);
      k.add(cyl(0.05, 0.05, 0.1, 10), mat([sx * tlX, -0.02, sz * tlZ]), STEEL); // twistlock cone (in the casting)
      // flipper: two plates around the container corner, hanging down
      const fx = sx * (6.096 + 0.04);
      const fz = sz * (1.219 + 0.04);
      k.add(rbox(0.05, 0.62, 0.4, 0.015), mat([fx, -0.12, sz * (1.219 - 0.16)]), GRAPH);
      k.add(rbox(0.4, 0.62, 0.05, 0.015), mat([sx * (6.096 - 0.16), -0.12, fz]), GRAPH);
      k.add(rbox(0.16, 0.16, 0.16, 0.02), mat([fx, 0.24, fz]), GRAPH_L); // hinge block
      k.add(cyl(0.04, 0.04, 0.5, 8), mat([sx * 5.7, 0.62, sz * 1.0], [0.0, 0, sx * 0.9]), STEEL); // flipper cylinder
    }
  }
  // headblock arms carrying the rope lugs
  for (const x of [-CARRIER.ropeX, CARRIER.ropeX]) {
    k.add(rbox(0.28, 0.24, 2.7, 0.03), mat([x, 0.66, 0]), GRAPH);
    for (const z of [-CARRIER.ropeZ, CARRIER.ropeZ]) {
      k.add(rbox(0.18, 0.22, 0.12, 0.02), mat([x, 0.86, z]), GRAPH_L);
      k.add(cyl(0.09, 0.09, 0.06, 14), mat([x, 0.9, z], [Math.PI / 2, 0, 0]), STEEL);
    }
  }
  // hydraulic cylinders for the telescopes, cable reel, hoses
  for (const z of [-0.2, 0.2]) k.add(cyl(0.07, 0.07, 4.6, 10), mat([z * 6, 0.6, z], [0, 0, Math.PI / 2]), STEEL);
  k.add(cyl(0.3, 0.3, 0.3, 18), mat([0.9, 0.72, 0], [Math.PI / 2, 0, 0]), GRAPH_L);
  if (fine) {
    k.add(tube([[0.9, 0.9, 0.12], [0.2, 1.4, 0.2], [-0.6, 1.0, 0.25], [-1.0, 0.55, 0.3]], 0.03, 6, false, 0.5), null, DARK);
    k.add(rbox(0.7, 0.3, 0.5, 0.04), mat([-1.2, 0.68, 0]), DARK); // valve block
  }
  return k.build();
}

export function createCarrier({ quality = 'high' } = {}) {
  const group = new THREE.Group();
  group.name = 'cavalier';
  const decal = carrierDecal();
  const material = kitMaterial({ decal, grime: 0.6, grimeH: 2.6, name: 'carrier', occl: [0.2, 9, 0.3] });
  const body = new THREE.Mesh(bodyGeometry(quality), material);
  body.castShadow = body.receiveShadow = true;
  group.add(body);

  // wheels
  const wGeo = wheelGeometry({ R: CARRIER.R, w: 0.46, rimR: 0.5, kind: 'industrial', rim: '#b9bdc0', quality });
  const wheels = new THREE.InstancedMesh(wGeo, material, 8);
  wheels.castShadow = wheels.receiveShadow = true;
  wheels.frustumCulled = false;
  group.add(wheels);

  // spreader (in the port group's space, posed by update)
  const spreader = new THREE.Mesh(spreaderGeometry(quality), material);
  spreader.castShadow = spreader.receiveShadow = true;

  // ropes: unit cylinder along +Y (0..1), stretched between the sheave and the lug
  const rGeo = new THREE.CylinderGeometry(0.022, 0.022, 1, 6, 1, true);
  rGeo.translate(0, 0.5, 0);
  const rk = new Kit().add(rGeo, null, { c: lin('#3a3d40'), r: 0.45, m: 0.8 }).build();
  const ropes = new THREE.InstancedMesh(rk, material, 4);
  ropes.castShadow = true;
  ropes.frustumCulled = false;

  // status lamps on the spreader (4 corners + 2 on the frame's long sides), instanced colours
  const lampGeo = new THREE.BoxGeometry(0.1, 0.07, 0.05);
  const lamps = new THREE.InstancedMesh(lampGeo, lampMaterial(), 6);
  lamps.frustumCulled = false;
  const lampLocal = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) lampLocal.push(new THREE.Vector3(sx * 5.55, 0.4, sz * 1.24));
  lampLocal.push(new THREE.Vector3(0.6, 0.42, 0.575), new THREE.Vector3(0.6, 0.42, -0.575));

  // beacons (rotating amber flash, pattern in the shader)
  const bGeo = new THREE.CylinderGeometry(0.1, 0.11, 0.2, 16);
  bGeo.translate(0, 0.1, 0);
  const bMat = new THREE.MeshBasicMaterial({ color: 0xffa21a, toneMapped: false });
  bMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = shared.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvBP = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBP; uniform float uTime;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float ang = atan(vBP.z, vBP.x);
        float rot = pow(max(cos(ang - uTime * 5.5), 0.0), 6.0);
        diffuseColor.rgb *= 0.32 + 2.2 * rot + 0.25 * smoothstep(0.12, 0.2, vBP.y);`);
  };
  bMat.customProgramCacheKey = () => 'sillage-beacon';
  const beacons = new THREE.InstancedMesh(bGeo, bMat, 2);
  beacons.frustumCulled = false;
  const beaconLocal = [new THREE.Vector3(4.35 - 0.4, CARRIER.topY + 1.0 + 2.2 + 0.24, 0.95 - 0.5), new THREE.Vector3(-3.15 + 0.6, CARRIER.topY + 1.0 + 1.6 + 0.08, 0.1)];

  const amber = new THREE.Color(1.0, 0.36, 0.02); // linear, unlit (tone mapping off)
  const green = new THREE.Color(0.08, 1.0, 0.28);
  const _c = new THREE.Color();
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _v = new THREE.Vector3();
  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  // pose: x (group x), spreader world matrix, lock 0 (amber) .. 1 (green)
  function pose({ x, z = 0, travelled = x, spreaderMatrix, lock }) {
    group.position.set(x, 0, z);
    group.updateMatrixWorld();
    // wheels roll (+x travel → rotation about −z)
    const rot = -travelled / CARRIER.R;
    let i = 0;
    for (const s of [-1, 1]) for (const wx of CARRIER.wheelX) {
      _m.makeRotationZ(rot);
      if (s < 0) _m.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
      _m.setPosition(wx, CARRIER.R, s * CARRIER.ZL);
      wheels.setMatrixAt(i++, _m);
    }
    wheels.instanceMatrix.needsUpdate = true;
    // spreader
    spreader.matrixAutoUpdate = false;
    spreader.matrix.copy(spreaderMatrix);
    spreader.matrixWorldNeedsUpdate = true;
    // ropes from the sheaves (carrier space → world) to the lugs (spreader space → world)
    let r = 0;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      _a.set(sx * CARRIER.ropeX + x, CARRIER.sheaveY, sz * CARRIER.ropeZ + z);
      _b.set(sx * CARRIER.ropeX, 0.92, sz * CARRIER.ropeZ).applyMatrix4(spreaderMatrix);
      _v.subVectors(_a, _b);
      const len = _v.length();
      _q.setFromUnitVectors(up, _v.normalize());
      _m.compose(_b, _q, _a.set(1, len, 1));
      ropes.setMatrixAt(r++, _m);
    }
    ropes.instanceMatrix.needsUpdate = true;
    // lamps
    _c.copy(amber).lerp(green, lock);
    lampLocal.forEach((p, j) => {
      _m.makeTranslation(p.x, p.y, p.z).premultiply(spreaderMatrix);
      lamps.setMatrixAt(j, _m);
      lamps.setColorAt(j, _c);
    });
    lamps.instanceMatrix.needsUpdate = true;
    if (lamps.instanceColor) lamps.instanceColor.needsUpdate = true;
    beaconLocal.forEach((p, j) => {
      _m.makeTranslation(p.x + x, p.y, p.z + z);
      beacons.setMatrixAt(j, _m);
    });
    beacons.instanceMatrix.needsUpdate = true;
  }

  return {
    group, // carrier body + wheels (positioned at x)
    parts: [spreader, ropes, lamps, beacons], // in port space (add to the port group)
    spreader,
    pose,
    material,
    textures: [decal],
    dispose() {
      [body.geometry, wGeo, spreader.geometry, rk, lampGeo, bGeo].forEach((g) => g.dispose());
      material.dispose();
      bMat.dispose();
      lamps.material.dispose();
      decal.dispose();
    },
  };
}
