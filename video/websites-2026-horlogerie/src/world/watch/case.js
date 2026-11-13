// BALANCIER watch: case middle (lugs, crown, crown guards), bezel (ceramic insert, lume pip), crystal, caseback.
// Each builder adds meshes through ctx.add(key, kind, geometry, parent, matKey) (see index.js).
import * as THREE from 'three';
import { WATCH } from '../layout.js';
import { lathe, latheX, extrude, splitGroups, planarUV, setTangents, merge, polyShape, roundPolygon, circlePath, transformed, toCreasedNormals } from './geo.js';

export const Z = {
  // assembled pivot z of each part (mm, watch local frame)
  crystal: 4.8, bezel: 4.2, dial: 2.1, hands: 2.8, caseMiddle: 0, mainplate: 1.1, train: -0.4, balance: -0.9,
  bridges: -2.1, rotor: -3.4, caseback: -4.6, braceletFront: 0, braceletBack: 0,
};

const LUG_X = WATCH.case.lugWidth / 2 + 1.35; // lug centre in x
export const SPRING_BAR = { y: WATCH.case.lugToLug / 2 - 2.2, z: -1.8 }; // where the bracelet hangs

export function buildCaseMiddle(ctx, obj) {
  const { Q, add } = ctx;
  const seg = Q.seg;
  // the round case: brushed flank, polished chamfers (hard edges between them)
  const polished = [
    lathe([[18.9, -3.6], [19.7, -3.05], [20.0, -2.45]], { segments: seg, crease: 0.3 }),
    lathe([[20.0, 1.95], [19.75, 2.55], [19.3, 3.0]], { segments: seg, crease: 0.3 }),
  ];
  const brushed = [
    lathe([[20.0, -2.45], [20.0, 1.95]], { segments: seg, tangent: 'profile' }),
    lathe([[17.4, -3.6], [18.9, -3.6]], { segments: seg }),
  ];
  // inner surfaces (under the bezel, the tube, the caseback seat, the movement holder ring): userData.internal
  const inner = merge([
    lathe([[19.3, 3.0], [16.0, 3.0], [16.0, -3.0], [17.4, -3.0], [17.4, -3.6]], { segments: seg }),
    lathe([[13.3, -2.6], [16.0, -2.6], [16.0, 1.5], [13.3, 1.5], [13.3, -2.6]], { segments: Math.max(48, seg / 2) }),
  ]);
  // lugs: side profile in (y, z), extruded along x; caps (the lug flanks) polished, walls brushed
  const lugPts = roundPolygon([
    [15.6, -2.9], [22.4, -2.9], [23.55, -2.35], [23.75, -1.3], [23.6, 0.55], [22.9, 1.25], [20.4, 2.0], [17.6, 2.5], [15.6, 2.6],
  ], 1);
  const lugShape = polyShape(lugPts);
  lugShape.holes.push(circlePath(new THREE.Path(), SPRING_BAR.y, SPRING_BAR.z, 0.42, 14, true));
  const lugW = 2.7;
  const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0));
  for (const sx of [-1, 1]) {
    for (const sy of [1, -1]) {
      let g = extrude(lugShape, lugW, { bevel: 0.48, bevelSegments: 3, curveSegments: 6 });
      g.applyMatrix4(basis);
      // taper the lug in plan view towards its tip (the inner face, along the bracelet, stays straight)
      {
        const p = g.attributes.position;
        const h = lugW / 2;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = p.getY(i);
          const t = Math.max(0, Math.min(1, (y - 16.8) / 6.95));
          const k = 1 - 0.3 * t * t * (3 - 2 * t);
          p.setX(i, sx > 0 ? -h + (x + h) * k : h - (h - x) * k);
        }
        const ng = toCreasedNormals(g, 0.7);
        if (ng !== g) { g.dispose(); g = ng; }
      }
      g.translate(sx * LUG_X, 0, 0);
      if (sy < 0) g.rotateZ(Math.PI);
      const [caps, walls] = splitGroups(g);
      g.dispose();
      setTangents(caps, () => [0, 1, 0]);
      setTangents(walls, (x, y) => [0, Math.sign(y) || 1, 0]);
      polished.push(caps);
      brushed.push(walls);
    }
  }
  // crown guards at 3 o'clock (extruded along z; caps brushed, walls polished)
  for (const s of [1, -1]) {
    const pts = roundPolygon([[18.6, 3.35 * s], [22.2, 3.45 * s], [22.85, 4.05 * s], [22.6, 5.1 * s], [21.3, 6.4 * s], [19.0, 8.7 * s], [18.4, 8.2 * s]], 2);
    const g = extrude(polyShape(s > 0 ? pts : pts.slice().reverse()), 3.6, { bevel: 0.4, bevelSegments: 2 });
    const [caps, walls] = splitGroups(g);
    g.dispose();
    brushed.push(setTangents(caps, () => [0, 1, 0]));
    polished.push(walls);
  }
  // crown: tube + fluted, screw-down crown (around +X)
  const crownSeg = Math.max(48, seg);
  polished.push(latheX([[1.3, 19.3], [1.3, 21.3]], { segments: 32 }));
  polished.push(latheX([[1.2, 21.25], [3.05, 21.25], [3.2, 21.5], [3.2, 23.85], [3.0, 24.3], [2.3, 24.58], [1.2, 24.7], [0, 24.72]], {
    segments: crownSeg, crease: 0.5,
    mod: (i, phi) => (i === 2 || i === 3 ? -0.2 * Math.pow(Math.abs(Math.cos(phi * 18)), 3) : 0),
  }));
  // the crown's end: a small engraved balance mark in relief (a ring + 4 arms), polished
  const mark = [];
  const ring = new THREE.Shape(); circlePath(ring, 0, 0, 1.25, 40); ring.holes.push(circlePath(new THREE.Path(), 0, 0, 1.0, 40, true));
  mark.push(extrude(ring, 0.12));
  for (let i = 0; i < 4; i++) {
    const g = extrude(polyShape([[-0.07, 0], [0.07, 0], [0.07, 1.05], [-0.07, 1.05]]), 0.12);
    g.rotateZ(Math.PI / 4 + (i * Math.PI) / 2);
    mark.push(g);
  }
  const markG = merge(mark);
  markG.rotateY(Math.PI / 2);
  markG.translate(24.74, 0, 0);
  polished.push(markG);

  add('case.polished', 'steelPolished', merge(polished), obj);
  add('case.brushed', 'steelBrushed', merge(brushed), obj);
  add('case.inner', 'steelBrushed', inner, obj, 'steelBrushedPlain').userData.internal = true;
}

export function buildBezel(ctx, obj) {
  const { Q, add } = ctx;
  const seg = Q.seg;
  const B = WATCH.bezel;
  const rO = B.outer / 2, rI = B.inner / 2, iI = B.insertInner / 2, iO = B.insertOuter / 2;
  // coin-edge grip on the outer wall: 120 notches
  const grip = lathe([[rO - 0.15, -1.2], [rO, -1.0], [rO, 0.45], [rO - 0.25, 0.85]], {
    segments: Math.max(240, seg * 2), crease: 0.4,
    mod: (i, phi) => (i === 1 || i === 2 ? -0.13 * Math.pow(Math.abs(Math.sin(phi * 60)), 0.6) : 0),
  });
  setTangents(grip, () => [0, 0, 1]);
  const polished = merge([
    lathe([[rO - 0.25, 0.85], [iO + 0.1, 1.0], [iO, 0.86]], { segments: seg, crease: 0.4 }),
    lathe([[iI, 1.12], [rI, 1.15], [rI, -1.2]], { segments: seg, crease: 0.4 }),
    // the lume pip's polished surround at 12
    transformed(lathe([[0.62, 0.86], [0.62, 1.04], [0.47, 1.06], [0.47, 0.9]], { segments: 32 }), { y: 18.2 }),
  ]);
  const hidden = merge([
    lathe([[rI, -1.2], [rO - 0.15, -1.2]], { segments: seg }),
    lathe([[iO, 0.86], [iO, 0.6], [iI, 0.85], [iI, 1.12]], { segments: seg }),
  ]);
  add('bezel.grip', 'steelBrushed', grip, obj);
  add('bezel.polished', 'steelPolished', polished, obj);
  add('bezel.hidden', 'steelBrushed', hidden, obj, 'steelBrushedPlain').userData.internal = true;
  // ceramic insert (sloped down towards the outside), planar uv for the engraved scale
  const ins = lathe([[iO, 0.6], [iO, 0.82], [(iO + iI) / 2, 0.97], [iI, 1.1], [iI, 0.85]], { segments: seg, crease: 0.5 });
  planarUV(ins, 1 / ctx.D.bezel);
  add('bezel.insert', 'ceramic', ins, obj);
  // the luminous pip at 12
  const pip = transformed(lathe([[0.47, 0.88], [0.47, 1.03], [0.3, 1.07], [0, 1.08]], { segments: 32 }), { y: 18.2 });
  add('bezel.pip', 'lume', pip, obj);
}

export function buildCrystal(ctx, obj) {
  const { Q, add } = ctx;
  const r = WATCH.crystal.diameter / 2;
  const sag = WATCH.crystal.dome;
  const rd = r - 0.15;
  const R = (rd * rd + sag * sag) / (2 * sag);
  const top = 1.0, edge = top - sag;
  const prof = [[0, -1.0], [r, -1.0], [r, edge - 0.1], [rd, edge]];
  for (const f of [0.9, 0.75, 0.6, 0.45, 0.3, 0.15, 0]) {
    const rr = rd * f;
    prof.push([rr, top - (R - Math.sqrt(R * R - rr * rr))]);
  }
  const g = lathe(prof, { segments: Q.seg, crease: 0.5 });
  add('crystal', 'crystal', g, obj);
}

export function buildCaseback(ctx, obj) {
  const { Q, add } = ctx;
  const seg = Q.seg;
  const engr = lathe([[12.6, -1.2], [14.0, -1.2], [15.5, -1.2], [16.9, -1.2]], { segments: seg, tangent: 'profile' });
  planarUV(engr, 1 / ctx.D.caseback, { mirrorX: true });
  add('caseback.engraved', 'steelBrushed', engr, obj, 'casebackEngraved');
  add('caseback.polished', 'steelPolished', merge([
    lathe([[12.0, -0.9], [12.45, -1.12], [12.6, -1.2]], { segments: seg, crease: 0.4 }),
    lathe([[16.9, -1.2], [17.55, -0.95], [17.9, -0.5]], { segments: seg, crease: 0.4 }),
  ]), obj);
  // outer wall with 6 notches for the opening tool, the thread inside the case (hidden)
  const wall = lathe([[17.9, -0.5], [17.9, 0.05]], {
    segments: Math.max(96, seg), tangent: 'profile',
    mod: (i, phi) => -0.35 * Math.pow(Math.max(0, Math.cos(phi * 6)), 24),
  });
  add('caseback.brushed', 'steelBrushed', wall, obj, 'steelBrushedPlain');
  add('caseback.inner', 'steelBrushed', lathe([[17.9, 0.05], [17.3, 0.1], [17.3, 1.2], [12.0, 1.2], [12.0, -0.9]], { segments: seg }), obj, 'steelBrushedPlain').userData.internal = true;
  // the sapphire window
  add('caseback.window', 'crystal', lathe([[0, -0.95], [12.3, -0.95], [12.3, 0.25], [0, 0.25]], { segments: seg, crease: 0.5 }), obj, 'crystalBack');
}
