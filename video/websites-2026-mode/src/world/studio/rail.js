// The clothes rail: a thin chrome tube with turned end caps, held off the wall by two brackets
// (a short arm and a round wall plate each). One merged geometry, one material: one draw call.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RAIL_LEN, RAIL_R, RAIL_Y, WALL_Z } from './layout.js';

export function createRail(quality = 'high') {
  const seg = quality === 'low' ? 16 : 28;
  const parts = [];
  const tube = new THREE.CylinderGeometry(RAIL_R, RAIL_R, RAIL_LEN - 0.03, seg, 1, true);
  tube.rotateZ(Math.PI / 2);
  parts.push(tube);
  // end caps: a collar and a domed knob, turned like a real fitting
  for (const s of [-1, 1]) {
    const pts = [];
    const r0 = RAIL_R * 1.25, r1 = RAIL_R * 1.55;
    pts.push(new THREE.Vector2(0.0001, 0.034));
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * (Math.PI / 2);
      pts.push(new THREE.Vector2(Math.sin(a) * r1, 0.02 + Math.cos(a) * 0.014));
    }
    pts.push(new THREE.Vector2(r1, 0.012), new THREE.Vector2(r0, 0.008), new THREE.Vector2(r0, -0.004), new THREE.Vector2(RAIL_R, -0.006));
    const cap = new THREE.LatheGeometry(pts, seg);
    cap.rotateZ(-s * Math.PI / 2);
    cap.translate(s * (RAIL_LEN / 2 - 0.02), 0, 0);
    parts.push(cap);
  }
  // brackets: from just inside the caps back to the wall, with a wall plate
  const armLen = -WALL_Z;
  for (const s of [-1, 1]) {
    const x = s * (RAIL_LEN / 2 - 0.11);
    const collar = new THREE.CylinderGeometry(RAIL_R * 1.5, RAIL_R * 1.5, 0.03, seg);
    collar.rotateZ(Math.PI / 2);
    collar.translate(x, 0, 0);
    const arm = new THREE.CylinderGeometry(0.0075, 0.0075, armLen, Math.max(10, seg >> 1));
    arm.rotateX(Math.PI / 2);
    arm.translate(x, 0, -armLen / 2);
    const plate = new THREE.CylinderGeometry(0.034, 0.036, 0.01, seg);
    plate.rotateX(Math.PI / 2);
    plate.translate(x, 0, WALL_Z + 0.005);
    parts.push(collar, arm, plate);
  }
  const clean = parts.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
    return n;
  });
  const geo = mergeGeometries(clean, false);
  geo.computeBoundingSphere();
  const mat = new THREE.MeshStandardMaterial({ color: 0xe9e9eb, metalness: 1, roughness: 0.17, envMapIntensity: 1.15 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = RAIL_Y;
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  mesh.name = 'rail';
  return { mesh, dispose: () => (geo.dispose(), mat.dispose()) };
}
