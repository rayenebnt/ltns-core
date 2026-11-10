// The liquid that spirals out of the neck up to the floating cap: a twisting sheet with a
// rounded elliptic cross-section, rebuilt on the CPU when the scroll moves (it grows along its
// length), two short lips pulled off its edge, and ten round droplets (instanced) flung beside
// it. Glossy, slightly translucent orange: thin parts let more light through (brighter,
// yellower), the core stays deep orange, and the silhouette glows warm instead of mirroring the
// grey studio.
import * as THREE from 'three';
import { patchMaterial, clamp, smooth, envDiffuse } from './util.js';

const NU = 150; // along
const NV = 18; // around the cross-section
const TU = 40; // along a tendril
const TV = 8; // around a tendril
const DROPS = 10;
// Shape of the sheet: a helix of 1.8 turns whose flat side is turned mostly outward (psi near
// 0.9 rad), so it reads as three bold flaps stacked between the neck and the cap rather than a
// coiled band; phi0 centres the three flaps on screen. Radii and widths in cm (bottle frame).
const SHAPE = {
  turns: 1.8, phi0: 2.3, // helix turns and start angle
  psi0: 0.9, psiA: 0.2, psiF: 7.0, // twist of the flat side: axial (0) to radial (pi / 2)
  r0: 0.22, r1: 0.75, // helix radius: r0 + r1 sin(pi u)^0.8
  a0: 0.5, a1: 0.4, b0: 0.12, // half width a0 + a1 sin(pi u), half thickness b0
  eLo: 0.1, eHi: 0.9, // round column out of the neck and into the cap
  lump: 0.18,
  tPeel: 0.5, tR: 1.35, tRise: 0.45, // tendrils: short liquid lips pulled off the edge
};

function liquidMaterial(envMap, drop) {
  const m = new THREE.MeshPhysicalMaterial({
    // the liquid is seen through its translucency and its reflections, hardly by diffuse light
    color: new THREE.Color().setRGB(0.12, 0.018, 0.0, THREE.LinearSRGBColorSpace),
    roughness: 0.05,
    metalness: 0,
    ior: 1.36,
    envMap,
    envMapIntensity: 0.4,
    clearcoat: 0.35,
    clearcoatRoughness: 0.03,
  });
  // back-lit glow: G exp(-sigma th), fitted (through ACES) so the thick core reads deep orange,
  // sRGB about (226, 104, 22), and the thin parts glow, about (255, 170, 60)
  const uniforms = {
    uGlow: { value: new THREE.Color().setRGB(1.55, 0.18, 0.009, THREE.LinearSRGBColorSpace) },
    uSig: { value: new THREE.Vector3(7.3, 7.8, 15.0) },
  };
  patchMaterial(m, {
    key: drop ? 'liquid-drop' : 'liquid-ribbon',
    uniforms,
    vertex: drop
      ? [
          ['#include <common>', '#include <common>\nvarying float vDropR;'],
          ['#include <fog_vertex>', '#include <fog_vertex>\n#ifdef USE_INSTANCING\nvDropR = length(instanceMatrix[0].xyz);\n#else\nvDropR = 0.1;\n#endif'],
        ]
      : [
          ['#include <common>', '#include <common>\nattribute float aThick;\nvarying float vThick;'],
          ['#include <fog_vertex>', '#include <fog_vertex>\nvThick = aThick;'],
        ],
    fragment: [
      ['#include <common>', `#include <common>\nuniform vec3 uGlow;\nuniform vec3 uSig;\n${drop ? 'varying float vDropR;' : 'varying float vThick;'}`],
      envDiffuse(0.6),
      [
        '#include <transmission_fragment>',
        `{
          float cosi = clamp(dot(normal, geometryViewDir), 0.0, 1.0);
          // path length through the liquid: a drop is as thick as it is wide (small drops glow)
          float th = ${drop ? 'clamp(1.1 * vDropR, 0.05, 0.2) * (0.35 + 0.65 * cosi)' : 'vThick * (0.35 + 0.65 * cosi)'};
          vec3 T = exp(-uSig * th);
          float F = 0.04 + 0.96 * pow(1.0 - cosi, 5.0);
          // back-lit glow through the thin liquid, plus a little light scattered in the core
          totalDiffuse += (uGlow * T + vec3(0.07, 0.012, 0.0)) * (1.0 - 0.55 * F);
          // warm rim: the edges glow orange-gold instead of mirroring the grey studio walls (the
          // grazing reflections are damped, the softbox highlights inside the silhouette stay)
          totalDiffuse += vec3(1.0, 0.5, 0.12) * 0.35 * pow(1.0 - cosi, 3.0);
          float graze = smoothstep(0.55, 0.97, 1.0 - cosi);
          totalSpecular *= 1.0 - 0.7 * graze;
          #ifdef USE_CLEARCOAT
          clearcoatSpecularIndirect *= 1.0 - 0.7 * graze;
          clearcoatSpecularDirect *= 1.0 - 0.7 * graze;
          #endif
        }`,
      ],
    ],
  });
  return m;
}

// teardrop: a sphere with its +Y pole pulled out 1.45 times into a short tail (reads round)
function teardropGeometry() {
  const pts = [];
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const phi = Math.PI * (1 - i / N); // bottom pole to top pole
    let y = Math.cos(phi);
    const r = Math.sin(phi) * Math.pow(Math.sin(phi / 2), 0.75);
    if (y > 0) y *= 1.45;
    pts.push(new THREE.Vector2(Math.max(r, 0), y));
  }
  return new THREE.LatheGeometry(pts, 16);
}

export function createSplash({ envMap }) {
  // ---------------------------------------------------------------- the sheet
  const count = (NU + 1) * (NV + 1);
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const thick = new Float32Array(count);
  const idx = [];
  for (let j = 0; j < NU; j++) {
    for (let i = 0; i < NV; i++) {
      const a = j * (NV + 1) + i, b = a + NV + 1;
      // counter-clockwise seen from outside the tube
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aThick', new THREE.BufferAttribute(thick, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setIndex(idx);
  const ribbonMat = liquidMaterial(envMap, false);
  const ribbon = new THREE.Mesh(geo, ribbonMat);
  ribbon.name = 'ribbon';
  ribbon.frustumCulled = false;

  // ---------------------------------------------------------------- two tendrils (one mesh): short lips
  const TENDRILS = [
    { u0: 0.56, u1: 0.68, side: 1, peel: 0.95, r: 0.075 },
    { u0: 0.7, u1: 0.8, side: -1, peel: 0.75, r: 0.06 },
  ];
  const tCount = TENDRILS.length * (TU + 1) * (TV + 1);
  const tPos = new Float32Array(tCount * 3), tNor = new Float32Array(tCount * 3), tThick = new Float32Array(tCount);
  const tIdx = [];
  TENDRILS.forEach((_, k) => {
    const base = k * (TU + 1) * (TV + 1);
    for (let j = 0; j < TU; j++) {
      for (let i = 0; i < TV; i++) {
        const a = base + j * (TV + 1) + i, b = a + TV + 1;
        tIdx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  });
  const tGeo = new THREE.BufferGeometry();
  tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3).setUsage(THREE.DynamicDrawUsage));
  tGeo.setAttribute('normal', new THREE.BufferAttribute(tNor, 3).setUsage(THREE.DynamicDrawUsage));
  tGeo.setAttribute('aThick', new THREE.BufferAttribute(tThick, 1).setUsage(THREE.DynamicDrawUsage));
  tGeo.setIndex(tIdx);
  const tendrils = new THREE.Mesh(tGeo, ribbonMat);
  tendrils.name = 'tendrils';
  tendrils.frustumCulled = false;

  // ---------------------------------------------------------------- droplets
  const drops = new THREE.InstancedMesh(teardropGeometry(), liquidMaterial(envMap, true), DROPS);
  drops.name = 'drops';
  drops.frustumCulled = false;
  // placed in the view plane at the splash (see update): each one reads beside the sheet, never
  // hidden behind it. u: height along the splash, side: +1 right of the screen, -1 left, 0 the
  // side the sheet reaches furthest at that height (a bead flung off the tip of a flap); gap and
  // drift: distance beyond the silhouette (cm) at birth and added over the flight; up: rise (cm)
  const seeds = [
    // beads, just off the tips of the flaps
    { u: 0.22, side: 0, gap: 0.05, drift: 0.3, up: 0.2, r: 0.19 },
    { u: 0.5, side: 0, gap: 0.08, drift: 0.26, up: -0.1, r: 0.16 },
    { u: 0.66, side: 0, gap: 0.05, drift: 0.34, up: 0.22, r: 0.22 },
    { u: 0.84, side: 0, gap: 0.06, drift: 0.2, up: 0.08, r: 0.15 },
    // spray: smaller, further out on both sides, at scattered heights
    { u: 0.14, side: -1, gap: 0.35, drift: 0.6, up: -0.25, r: 0.085 },
    { u: 0.3, side: 1, gap: 0.5, drift: 0.85, up: 0.4, r: 0.08 },
    { u: 0.44, side: -1, gap: 0.3, drift: 1.0, up: 0.55, r: 0.11 },
    { u: 0.57, side: 1, gap: 0.6, drift: 0.7, up: -0.3, r: 0.075 },
    { u: 0.76, side: -1, gap: 0.45, drift: 0.75, up: 0.3, r: 0.095 },
    { u: 0.38, side: 1, gap: 0.8, drift: 1.1, up: 0.15, r: 0.12 },
  ];

  const group = new THREE.Group();
  group.name = 'splash';
  group.add(ribbon, tendrils, drops);

  // centre line and frame along the sheet
  const A = new THREE.Vector3(), Bc = new THREE.Vector3(), D = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  const C = [], RAD = [], WV = [], HW = [];
  for (let j = 0; j <= NU; j++) {
    C.push(new THREE.Vector3());
    RAD.push(new THREE.Vector3());
    WV.push(new THREE.Vector3());
    HW.push(0);
  }
  const T = new THREE.Vector3(), Nr = new THREE.Vector3(), Bn = new THREE.Vector3(), W = new THREE.Vector3(), Td = new THREE.Vector3();
  const tmp = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), m4 = new THREE.Matrix4(), yAxis = new THREE.Vector3(0, 1, 0);
  const tipC = new THREE.Vector3(), pS = new THREE.Vector3(), pS2 = new THREE.Vector3(), ts = new THREE.Vector3(), n1 = new THREE.Vector3(), n2 = new THREE.Vector3();
  const vel = new THREE.Vector3(), dp = new THREE.Vector3(), V = new THREE.Vector3(), Rt = new THREE.Vector3();
  let last = '';

  function centre(u, time, out, rad) {
    const L = A.distanceTo(Bc);
    const phi = SHAPE.phi0 + Math.PI * 2 * SHAPE.turns * u + Math.sin(time * 0.7) * 0.05;
    const s = Math.sin(Math.PI * u);
    const r = SHAPE.r0 + SHAPE.r1 * Math.pow(s, 0.8) + 0.04 * Math.sin(u * 17 + 1.3);
    rad.copy(e1).multiplyScalar(Math.cos(phi)).addScaledVector(e2, Math.sin(phi));
    out.copy(A).addScaledVector(D, L * u).addScaledVector(rad, r);
  }

  // point on the sheet edge (side +-1) at u, pushed out by `extra` along the sheet width
  function edgeAt(u, side, extra, out) {
    const x = clamp(u, 0, 1) * NU;
    const j = Math.min(NU - 1, Math.floor(x)), f = x - j;
    out.copy(C[j]).lerp(C[j + 1], f);
    tmp.copy(WV[j]).lerp(WV[j + 1], f).normalize();
    const hw = HW[j] + (HW[j + 1] - HW[j]) * f;
    return out.addScaledVector(tmp, side * (hw + extra));
  }

  // grow in [0, 1]; neck and capBottom in the bottle frame; flight in [0, 1] (droplets)
  function update({ grow, neck, capBottom, time = 0, flight = grow, eye = null }) {
    const key = `${grow.toFixed(4)}|${neck.y.toFixed(3)}|${capBottom.x.toFixed(3)},${capBottom.y.toFixed(3)},${capBottom.z.toFixed(3)}|${flight.toFixed(4)}|${time.toFixed(2)}|${eye ? `${eye.x.toFixed(2)},${eye.y.toFixed(2)},${eye.z.toFixed(2)}` : ''}`;
    group.visible = grow > 0.002;
    if (!group.visible || key === last) return;
    last = key;
    A.copy(neck);
    Bc.copy(capBottom);
    D.subVectors(Bc, A).normalize();
    e1.set(0, 0, 1).addScaledVector(D, -D.z).normalize();
    e2.crossVectors(D, e1).normalize();
    for (let j = 0; j <= NU; j++) centre(j / NU, time, C[j], RAD[j]);
    const g = clamp(grow, 0, 1);
    const gj = g * NU;
    const j0 = Math.min(NU - 1, Math.floor(gj));
    tipC.copy(C[j0]).lerp(C[j0 + 1], gj - j0);
    for (let j = 0; j <= NU; j++) {
      const u = j / NU;
      const jp = Math.min(NU, j + 1), jm = Math.max(0, j - 1);
      T.subVectors(C[jp], C[jm]).normalize();
      Nr.copy(RAD[j]).addScaledVector(T, -RAD[j].dot(T)).normalize();
      Bn.crossVectors(T, Nr).normalize();
      // half width / half thickness: a sheet with rounded rims, wider in the middle, a few
      // liquid lumps
      const s = Math.sin(Math.PI * u);
      const lump = 1 + SHAPE.lump * Math.sin(u * 23 + 0.4) * s;
      // leaves the bore as a round column, flattens into a sheet, thickens again into the cap
      const ends = Math.max(1 - u / SHAPE.eLo, 0) + Math.max((u - SHAPE.eHi) / (1 - SHAPE.eHi), 0);
      // smooth edges: one gentle ripple that drifts with time
      let a = (SHAPE.a0 + SHAPE.a1 * s) * lump + 0.025 * Math.sin(u * 19 + time * 2) * s;
      let b = (SHAPE.b0 + 0.42 * ends * ends) * lump;
      // the growing tip rounds off; beyond it every vertex collapses onto the tip
      let k = 1, cen = C[j];
      if (u > g) {
        k = 0;
        cen = tipC;
      } else k = Math.sqrt(clamp((g - u) / 0.05));
      if (g >= 0.999) k = 1;
      // twist: the flat side turns around the centre line
      const psi = SHAPE.psi0 + SHAPE.psiA * Math.sin(u * SHAPE.psiF + 0.5);
      W.copy(Bn).multiplyScalar(Math.cos(psi)).addScaledVector(Nr, Math.sin(psi));
      Td.crossVectors(T, W).normalize();
      WV[j].copy(W);
      HW[j] = a * (k > 0 ? 1 : 0);
      a *= k;
      b *= k;
      for (let i = 0; i <= NV; i++) {
        const th = (i / NV) * Math.PI * 2;
        const ct = Math.cos(th), st = Math.sin(th);
        const o = (j * (NV + 1) + i) * 3;
        pos[o] = cen.x + W.x * a * ct + Td.x * b * st;
        pos[o + 1] = cen.y + W.y * a * ct + Td.y * b * st;
        pos[o + 2] = cen.z + W.z * a * ct + Td.z * b * st;
        // ellipse normal
        tmp.copy(W).multiplyScalar(ct / Math.max(a, 1e-4)).addScaledVector(Td, st / Math.max(b, 1e-4));
        if (k === 0) tmp.copy(T);
        tmp.normalize();
        nor[o] = tmp.x;
        nor[o + 1] = tmp.y;
        nor[o + 2] = tmp.z;
        thick[j * (NV + 1) + i] = 2 * b * Math.abs(st);
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    geo.attributes.aThick.needsUpdate = true;

    // tendrils: thin strands that leave the sheet edge and peel away from it as they rise
    TENDRILS.forEach((td, k) => {
      const base = k * (TU + 1) * (TV + 1);
      const len = clamp((g - td.u0) / (td.u1 - td.u0)); // how much of the strand exists
      for (let j = 0; j <= TU; j++) {
        const t = (j / TU) * len;
        const u = td.u0 + (td.u1 - td.u0) * t;
        edgeAt(u, td.side, SHAPE.tPeel * td.peel * Math.pow(t, 1.25) - 0.04, pS);
        pS.addScaledVector(D, SHAPE.tRise * t * t);
        // tangent by a small step along the strand
        const t2 = Math.min(1, t + 0.02);
        edgeAt(td.u0 + (td.u1 - td.u0) * t2, td.side, SHAPE.tPeel * td.peel * Math.pow(t2, 1.25) - 0.04, pS2);
        pS2.addScaledVector(D, SHAPE.tRise * t2 * t2);
        ts.subVectors(pS2, pS);
        if (ts.lengthSq() < 1e-10) ts.copy(D);
        ts.normalize();
        n1.crossVectors(ts, e1);
        if (n1.lengthSq() < 1e-6) n1.crossVectors(ts, e2);
        n1.normalize();
        n2.crossVectors(ts, n1).normalize();
        // a strand pulled out of the sheet: thick root, thin neck, a drop forming at its tip
        const f = j / TU;
        const tipBulb = smooth(0.72, 0.95, f) * 1.3 * (1 - smooth(0.95, 1.0, f));
        let r = SHAPE.tR * td.r * (1 - 0.6 * smooth(0.0, 0.7, f)) * (1 + tipBulb);
        if (len <= 0.001) r = 0;
        if (j === TU) r *= 0.35; // closes the tip
        for (let i = 0; i <= TV; i++) {
          const th = (i / TV) * Math.PI * 2;
          const ct = Math.cos(th), st = Math.sin(th);
          const vi = base + j * (TV + 1) + i, o = vi * 3;
          tmp.copy(n1).multiplyScalar(ct).addScaledVector(n2, st);
          tPos[o] = pS.x + tmp.x * r;
          tPos[o + 1] = pS.y + tmp.y * r;
          tPos[o + 2] = pS.z + tmp.z * r;
          tNor[o] = tmp.x;
          tNor[o + 1] = tmp.y;
          tNor[o + 2] = tmp.z;
          tThick[vi] = 2 * r;
        }
      }
    });
    tGeo.attributes.position.needsUpdate = true;
    tGeo.attributes.normal.needsUpdate = true;
    tGeo.attributes.aThick.needsUpdate = true;
    tendrils.visible = g > TENDRILS[0].u0;

    // droplets flung outward from where the sheet has already passed, tail toward the sheet.
    // View frame at the splash: V toward the camera, Rt to the right of the screen, D up.
    if (eye) {
      V.subVectors(eye, A);
      V.addScaledVector(D, -V.dot(D)).normalize();
    } else V.copy(e1);
    Rt.crossVectors(D, V).normalize();
    const L = A.distanceTo(Bc);
    for (let i = 0; i < DROPS; i++) {
      const sd = seeds[i];
      const age = clamp((flight - sd.u - 0.04) / 0.36);
      if (!(age > 0.0001 && g > 0.05)) {
        m4.makeScale(0, 0, 0);
        drops.setMatrixAt(i, m4);
        continue;
      }
      const e = 1 - Math.pow(1 - age, 2.2);
      const r = sd.r * smooth(0.0, 0.12, age) * (1 - 0.15 * age);
      // silhouette of the sheet at this height, on each side of the axis
      const h = L * sd.u;
      let xr = 0, xl = 0;
      for (let k = 0; k < count; k++) {
        tmp.set(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]).sub(A);
        if (Math.abs(tmp.dot(D) - h) > sd.r + 0.06) continue;
        const x = tmp.dot(Rt);
        if (x > xr) xr = x;
        if (-x > xl) xl = -x;
      }
      const side = sd.side || (xr >= xl ? 1 : -1);
      const x0 = side > 0 ? xr : xl;
      dp.copy(A).addScaledVector(D, h + sd.up * e).addScaledVector(Rt, side * (x0 + sd.gap + sd.r + sd.drift * e)).addScaledVector(V, 0.25);
      vel.copy(Rt).multiplyScalar(side * (sd.drift + 0.3)).addScaledVector(D, sd.up).normalize();
      // tail (+Y of the teardrop) points back toward the sheet
      q.setFromUnitVectors(yAxis, vel.negate());
      sc.set(r, r * (1 + 0.3 * (1 - age)), r);
      m4.compose(dp, q, sc);
      drops.setMatrixAt(i, m4);
    }
    drops.instanceMatrix.needsUpdate = true;
  }

  return { group, ribbon, tendrils, drops, update, materials: [ribbon.material, drops.material] };
}
