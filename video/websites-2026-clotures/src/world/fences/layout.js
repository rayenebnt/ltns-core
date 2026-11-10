// The shared world contract as seen by the fence module (metres, +Y up).
//
// New fence (chapter 1, restyled in chapter 2): A(9, 0, -26) -> B(9, 0, 18) -> C(-24, 0, 18).
// B is the front-right corner. Every element carries d, its distance from B along its leg:
//   leg 0, right leg B -> A: 44 m, tangent (0, 0, -1), outside +x
//   leg 1, front leg B -> C: 33 m, tangent (-1, 0, 0), outside +z
// Old fence (chapter 4): along x = -24 from z = -26 to z = 18 (joins the corner post C).
import * as THREE from 'three';

export const A = new THREE.Vector3(9, 0, -26);
export const B = new THREE.Vector3(9, 0, 18);
export const C = new THREE.Vector3(-24, 0, 18);
export const UP = new THREE.Vector3(0, 1, 0);

export const LEGS = [
  { id: 0, origin: B.clone(), t: new THREE.Vector3(0, 0, -1), n: new THREE.Vector3(1, 0, 0), len: 44 },
  { id: 1, origin: B.clone(), t: new THREE.Vector3(-1, 0, 0), n: new THREE.Vector3(0, 0, 1), len: 33 },
];
export const TOTAL = 77;
export const D_MAX = 44;

// point on a leg: distance d along it, offset o outward (n), height y
export function legPoint(leg, d, o = 0, y = 0) {
  return leg.origin.clone().addScaledVector(leg.t, d).addScaledVector(leg.n, o).setY(y);
}

// right-handed frame for prisms: A x B = G
export function frame(G, A) {
  const g = G.clone().normalize();
  const a = A.clone().sub(g.clone().multiplyScalar(A.dot(g))).normalize();
  const b = new THREE.Vector3().crossVectors(g, a).normalize();
  return { A: a, B: b, G: g };
}

// post positions along a leg for a target spacing (rounded so both ends get a post)
export function postStations(len, spacing, mode = 'round') {
  const n = Math.max(1, mode === 'ceil' ? Math.ceil(len / spacing - 1e-6) : Math.round(len / spacing));
  const out = [];
  for (let i = 0; i <= n; i++) out.push((len * i) / n);
  return out;
}

// old fence (repair chapter)
export const OLD = {
  x: -24,
  z0: -26,
  z1: 18,
  t: new THREE.Vector3(0, 0, 1),
  n: new THREE.Vector3(-1, 0, 0), // outside = the neighbour's side
  height: 1.8,
  broken: [-6, -2],
  leanZ: -4,
  gate: [-8.4, -7.2], // (repair.js GZ)
};

// ground-hugging props (litter, debris, mounds, collars, paint, scuff) sit this much above
// y = 0, on top of the garden's mown lawn blades (~7 cm); 0 for a bare ground plane
export const GROUND = { lift: 0.035 };

// fence heights by type (contract)
export const HEIGHTS = [1.8, 1.8, 1.73, 1.3, 1.2];
export const TYPE_NAMES = ['Bois plein', 'PVC blanc', 'Panneaux rigides', 'Ranch', 'Ganivelle'];
