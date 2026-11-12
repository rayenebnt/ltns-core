// Port module: tyred wheels (one geometry per kind, drawn as InstancedMesh). Axle along local Z,
// the rim's outer face toward +Z; centre at the origin.
import * as THREE from 'three';
import { Kit, box, cyl, mat, lin } from './kit.js';

const RUBBER = { c: lin('#141516'), r: 0.86, m: 0 };
const RUBBER_SIDE = { c: lin('#1a1b1d'), r: 0.78, m: 0 };

function tyreBody(R, Rin, w, seg) {
  // cross-section (radius, axial): bead → shoulder → tread → shoulder → bead
  const h = w / 2;
  const pts = [
    [Rin, -h * 0.86], [Rin + (R - Rin) * 0.35, -h * 1.0], [R - 0.06, -h * 0.98], [R - 0.012, -h * 0.82], [R, -h * 0.55],
    [R, h * 0.55], [R - 0.012, h * 0.82], [R - 0.06, h * 0.98], [Rin + (R - Rin) * 0.35, h * 1.0], [Rin, h * 0.86],
  ];
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  g.rotateX(Math.PI / 2); // lathe axis Y → Z
  return g;
}

// kind: 'industrial' (straddle carrier: deep angled lugs) | 'road' (truck: ribbed tread)
export function wheelGeometry({ R = 0.8, w = 0.46, rimR = 0.5, kind = 'industrial', rim = '#b7bbbe', quality = 'high' } = {}) {
  const k = new Kit();
  const lvl = { low: 0, medium: 1, high: 2, max: 3 }[quality] ?? 2;
  const fine = lvl >= 2;
  const seg = [20, 28, 40, 56][lvl];
  const lugH = kind === 'industrial' ? 0.05 : 0.012;
  const Rb = R - lugH; // carcass radius under the lugs
  k.add(tyreBody(Rb, rimR + 0.01, w, seg), null, RUBBER_SIDE);
  if (kind === 'industrial') {
    const n = [16, 22, 28, 34][lvl];
    for (let i = 0; i < n; i++) {
      for (const side of [-1, 1]) {
        const a = ((i + (side > 0 ? 0.5 : 0)) / n) * Math.PI * 2;
        const len = w * 0.58;
        const g = box(0.1, lugH + 0.02, len);
        // lug: angled across the tread from one shoulder
        const m = new THREE.Matrix4()
          .makeRotationZ(a)
          .multiply(new THREE.Matrix4().makeTranslation(0, Rb + lugH / 2 - 0.01, side * (w / 2 - len / 2 - 0.005)))
          .multiply(new THREE.Matrix4().makeRotationX(0))
          .multiply(new THREE.Matrix4().makeRotationY(side * 0.38));
        k.add(g, m, RUBBER);
      }
    }
  } else {
    // road tyre: four circumferential ribs (grooves between them)
    for (const z of [-0.36, -0.12, 0.12, 0.36]) {
      const g = new THREE.CylinderGeometry(R, R, w * 0.2, seg, 1, true);
      g.rotateX(Math.PI / 2);
      k.add(g, mat([0, 0, z * w]), RUBBER);
    }
  }
  // rim: barrel, disc with holes, hub, nuts
  const rimL = { c: lin(rim), r: 0.38, m: 0.7 };
  const rimD = { c: lin(rim, 0.55), r: 0.5, m: 0.6 };
  const barrel = new THREE.CylinderGeometry(rimR, rimR, w * 0.9, seg, 1, true);
  barrel.rotateX(Math.PI / 2);
  k.add(barrel, null, rimD);
  // flange ring at the outer face
  const flange = new THREE.TorusGeometry(rimR + 0.006, 0.018, 6, seg);
  k.add(flange, mat([0, 0, w * 0.43]), rimL);
  // dished disc
  const disc = new THREE.LatheGeometry(
    [[rimR * 0.98, w * 0.38], [rimR * 0.82, w * 0.36], [rimR * 0.62, w * 0.24], [rimR * 0.38, w * 0.2], [0.001, w * 0.2]].map(([r, y]) => new THREE.Vector2(r, y)),
    seg,
  );
  disc.rotateX(Math.PI / 2);
  k.add(disc, null, rimL);
  // ventilation holes (dark ovals on the disc)
  const nh = lvl === 0 ? 0 : kind === 'industrial' ? 8 : 10;
  for (let i = 0; i < nh; i++) {
    const a = (i / nh) * Math.PI * 2;
    const r = rimR * 0.72;
    k.add(cyl(0.045, 0.045, 0.01, 10), mat([Math.cos(a) * r, Math.sin(a) * r, w * 0.32], [Math.PI / 2, 0, 0]), { c: lin('#0c0d0e'), r: 0.9, m: 0 });
  }
  // hub and nuts
  const hubR = rimR * 0.34;
  k.add(cyl(hubR, hubR * 1.08, 0.1, 20), mat([0, 0, w * 0.25], [Math.PI / 2, 0, 0]), rimD);
  k.add(cyl(hubR * 0.55, hubR * 0.7, 0.08, 16), mat([0, 0, w * 0.32], [Math.PI / 2, 0, 0]), { c: lin('#5d6266'), r: 0.35, m: 0.8 });
  const nn = lvl === 0 ? 0 : 10;
  for (let i = 0; i < nn; i++) {
    const a = (i / nn) * Math.PI * 2;
    const r = hubR * 1.35;
    k.add(cyl(0.022, 0.022, 0.05, 6), mat([Math.cos(a) * r, Math.sin(a) * r, w * 0.24], [Math.PI / 2, 0, 0]), { c: lin('#cfd2d4'), r: 0.3, m: 0.9 });
  }
  return k.build();
}
