// The amber glass shot bottle: lathed glass with a "filled liquid" shader (fake transmission:
// a ray through the turbid liquid, Fresnel, studio reflections), a wrap label with foil,
// a knurled gold cap that can unscrew, and the tamper ring that stays on the neck.
import * as THREE from 'three';
import { Profile, lathe, parametric, band } from './geom.js';
import { BOTTLE as B } from './config.js';
import { patchMaterial, EDGE_FALLOFF, envDiffuse } from './util.js';

// ------------------------------------------------------------------ geometry
function glassGeometry() {
  const R = B.R;
  const p = new Profile(0, 0.2);
  // base: shallow punt, resting ring, heel fillet
  p.cubic(0.6, 0.2, 1.0, 0.04, 1.32, 0.02, 10)
    .line(1.5, 0.0, 2)
    .round(R, 0.0, R, 0.42, 10)
    // straight wall
    .line(R, B.labelY[0], 2)
    .line(R, B.labelY[1], 6)
    .line(R, 6.3, 2)
    // rounded shoulder down to the neck
    .cubic(R, 7.05, 1.1, 7.25, 1.07, 7.9, 22)
    .line(1.07, 7.98, 1)
    // transfer bead (under the tamper ring)
    .round(1.15, 7.98, 1.15, 8.06, 3)
    .line(1.15, 8.14, 1)
    .round(1.15, 8.2, 1.05, 8.22, 3)
    // threads (two ridges) up to the lip
    .line(1.03, 8.34, 1)
    .round(1.11, 8.38, 1.03, 8.46, 4)
    .line(1.03, 8.62, 1)
    .round(1.11, 8.66, 1.03, 8.74, 4)
    .line(1.03, 8.9, 1)
    .round(1.03, B.neckTop, 0.92, B.neckTop, 4)
    .line(0.8, B.neckTop, 1)
    // inner bore down to the liquid surface
    .round(0.76, B.neckTop, 0.76, 8.9, 3)
    .line(0.76, 8.45, 2)
    .line(0.0, 8.45, 2);
  return lathe(p, 96);
}

// gold cap: knurled skirt, rounded top, open underside (seen when the cap floats away).
// Explicit profile rows (few along the height, the knurl only varies around).
function capGeometry() {
  const R0 = B.capR, H = B.capY[1] - B.capY[0];
  const rows = [
    [0.0, H - 0.18], [0.7, H - 0.18], [1.1, H - 0.2], [1.12, H - 0.3], [1.12, 0.06], [1.15, 0.0],
    [R0 - 0.04, 0.0], [R0, 0.05], [R0, 0.14], [R0 + 0.01, 0.2], [R0 + 0.01, 0.29], [R0 + 0.01, H / 2],
    [R0 + 0.01, H - 0.29], [R0 + 0.01, H - 0.2], [R0, H - 0.12], [R0 - 0.05, H - 0.035], [R0 - 0.14, H],
    [0.9, H + 0.008], [0.45, H + 0.013], [0.0, H + 0.015],
  ];
  const nv = rows.length - 1;
  const RIDGES = 56;
  // knurl only on the outer skirt (between y 0.2 and H - 0.2), faded in and out
  const knurl = (phi, y, r) => {
    if (r < R0 - 0.005) return 0;
    const w = Math.min(1, Math.max(0, (y - 0.2) / 0.09)) * Math.min(1, Math.max(0, (H - 0.2 - y) / 0.09));
    const ph = (phi / (Math.PI * 2)) * RIDGES;
    const f = ph - Math.floor(ph);
    const tri = 1 - Math.abs(2 * f - 1); // 0 valley .. 1 crest
    const s = tri * tri * (3 - 2 * tri);
    return w * (s - 0.5) * 0.065;
  };
  const at = (v) => {
    const x = Math.min(nv - 1e-6, Math.max(0, v * nv));
    const i = Math.floor(x), k = x - i;
    return [rows[i][0] + (rows[i + 1][0] - rows[i][0]) * k, rows[i][1] + (rows[i + 1][1] - rows[i][1]) * k];
  };
  const NU = RIDGES * 8; // eight vertices per ridge: true flank normals, a narrow crest
  const g = parametric(
    (u, v, out) => {
      const [r, y] = at(v);
      const phi = u * Math.PI * 2;
      const rr = r + knurl(phi, y, r);
      out.set(rr * Math.sin(phi), y, rr * Math.cos(phi));
    },
    NU,
    nv,
  );
  // cavity of the knurl (1 in the valleys, 0 on the crests): the valleys hide the studio, so
  // they go dark olive while the crests stay white-gold (the smooth normals alone cannot)
  const cav = new Float32Array((NU + 1) * (nv + 1));
  for (let j = 0; j <= nv; j++) {
    const [r, y] = at(j / nv);
    const w = r < R0 - 0.005 ? 0 : Math.min(1, Math.max(0, (y - 0.2) / 0.09)) * Math.min(1, Math.max(0, (H - 0.2 - y) / 0.09));
    for (let i = 0; i <= NU; i++) {
      const f = (i / NU) * RIDGES - Math.floor((i / NU) * RIDGES);
      const tri = 1 - Math.abs(2 * f - 1); // 0 valley .. 1 crest (as in knurl())
      cav[j * (NU + 1) + i] = w * (1 - tri * tri * (3 - 2 * tri));
    }
  }
  g.setAttribute('cavity', new THREE.BufferAttribute(cav, 1));
  return g;
}

// low-poly silhouette: contact shadow caster and cursor hit target (layer 1 only)
export function bottleProxyGeometry() {
  const p = new Profile(0, 0);
  p.line(1.7, 0, 1).line(B.R, 0.3, 1).line(B.R, 6.3, 1).line(1.6, 7.25, 1).line(1.1, 7.8, 1).line(B.capR, 8.1, 1).line(B.capR, B.capY[1], 1).line(0, B.capY[1], 1);
  return lathe(p, 20);
}

function ringGeometry() {
  const p = new Profile(1.14, 7.92);
  p.line(1.19, 7.94, 1).line(1.19, 8.1, 2).line(1.15, 8.12, 1);
  const g = lathe(p, 96);
  // no knurl on the tamper ring (explicit zeros: a missing attribute reads a stale GL default)
  g.setAttribute('cavity', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count), 1));
  return g;
}

// ------------------------------------------------------------------ materials
// Fake transmission through the filled bottle (no extra render pass): in the bottle's local
// frame the view ray is refracted at the outer surface, its chord through the liquid cylinder
// (inner radius, clipped by the base and the fill level) gives the path length d; the turbid
// liquid mixes the bright backdrop (exp(-sigma d)) with its own in-scattered amber colour.
function glassMaterial(envMap, liquid) {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0x000000,
    roughness: 0.035,
    metalness: 0,
    ior: 1.5,
    envMap,
    envMapIntensity: 1.2,
    specularIntensity: 1,
    clearcoat: 0.0,
  });
  const uniforms = {
    uInnerR: { value: B.R - 0.2 },
    uLiq: { value: new THREE.Vector2(0.28, B.fillY) },
    uSigL: { value: liquid.sigma.clone() },
    uScat: { value: liquid.scatter.clone() },
    uSigG: { value: new THREE.Vector3(2.2, 3.1, 5.6) },
    uBack: { value: new THREE.Color(1.08, 1.1, 1.1) },
    uTrans: { value: 1.0 },
  };
  patchMaterial(m, {
    key: 'amber-glass',
    uniforms,
    vertex: [
      ['#include <common>', '#include <common>\nvarying vec3 vLPos;\nvarying vec3 vLNrm;\nvarying vec3 vLCam;'],
      [
        '#include <fog_vertex>',
        `#include <fog_vertex>
        vLPos = position;
        vLNrm = normal;
        mat3 m3 = mat3(modelMatrix);
        float s2 = dot(m3[0], m3[0]);
        vLCam = (transpose(m3) * (cameraPosition - modelMatrix[3].xyz)) / s2;`,
      ],
    ],
    fragment: [
      [
        '#include <common>',
        `#include <common>
        varying vec3 vLPos;
        varying vec3 vLNrm;
        varying vec3 vLCam;
        uniform float uInnerR;
        uniform vec2 uLiq;
        uniform vec3 uSigL;
        uniform vec3 uScat;
        uniform vec3 uSigG;
        uniform vec3 uBack;
        uniform float uTrans;
        // length of the ray segment ro + t rd (t > 0) inside the liquid cylinder
        float liquidChord(vec3 ro, vec3 rd) {
          float yLo = uLiq.x, yHi = uLiq.y;
          float t0 = 0.0, t1 = 1e4;
          float a = dot(rd.xz, rd.xz);
          float c = dot(ro.xz, ro.xz) - uInnerR * uInnerR;
          if (a > 1e-6) {
            float b = dot(ro.xz, rd.xz);
            float disc = b * b - a * c;
            if (disc <= 0.0) return 0.0;
            float sq = sqrt(disc);
            t0 = max(t0, (-b - sq) / a);
            t1 = min(t1, (-b + sq) / a);
          } else if (c > 0.0) return 0.0;
          if (abs(rd.y) > 1e-5) {
            float ta = (yLo - ro.y) / rd.y, tb = (yHi - ro.y) / rd.y;
            t0 = max(t0, min(ta, tb));
            t1 = min(t1, max(ta, tb));
          } else if (ro.y < yLo || ro.y > yHi) return 0.0;
          return max(t1 - t0, 0.0);
        }`,
      ],
      [
        '#include <transmission_fragment>',
        `{
          vec3 V = normalize(vLPos - vLCam);
          vec3 N = normalize(vLNrm);
          float cosi = clamp(dot(-V, N), 0.0, 1.0);
          vec3 rd = refract(V, N, 1.0 / 1.5);
          float dl = liquidChord(vLPos, rd);
          // amber glass: two walls, longer near the silhouette
          float dg = 0.36 / max(cosi, 0.18);
          vec3 Tg = exp(-uSigG * dg);
          vec3 Tl = exp(-uSigL * dl);
          // in-scattered light: more where the ray runs along the axis (lit from all around):
          // the orange glow through the base when the bottle turns its bottom to the lens
          vec3 scat = uScat * (1.0 + 2.8 * rd.y * rd.y);
          vec3 back = uBack;
          #ifdef USE_ENVMAP
          {
            // where the ray misses the liquid (the empty neck), the studio shows through,
            // bent by the glass: light and dark bands instead of a flat honey tint
            vec3 rdv = refract(-geometryViewDir, normal, 1.0 / 1.5);
            vec3 envT = min(textureCubeUV(envMap, envMapRotation * inverseTransformDirection(rdv, viewMatrix), 0.16).rgb, vec3(2.2));
            back = mix(uBack, envT, 0.5 * (1.0 - smoothstep(0.0, 0.5, dl)));
          }
          #endif
          vec3 inside = back * Tl + scat * (1.0 - Tl);
          // meniscus: a thin bright line where the ray meets the liquid surface
          float men = exp(-pow((vLPos.y - uLiq.y) / 0.035, 2.0)) * step(0.0, dl + 0.001);
          float F = 0.04 + 0.96 * pow(1.0 - cosi, 5.0);
          totalDiffuse += (inside * Tg + men * vec3(0.5, 0.32, 0.14)) * (1.0 - F) * uTrans;
        }`,
      ],
    ],
  });
  return m;
}

const LIQUIDS = {
  // ginger: cloudy amber, a deep brown core (not a red syrup)
  gingembre: { sigma: new THREE.Vector3(0.8, 1.3, 2.2), scatter: new THREE.Vector3(0.12, 0.06, 0.015) },
  // turmeric: a little more golden
  curcuma: { sigma: new THREE.Vector3(0.65, 1.1, 2.4), scatter: new THREE.Vector3(0.13, 0.065, 0.01) },
};

let goldMat = null;
function capMaterial(envMap) {
  if (goldMat) return goldMat;
  // polished gold: white-gold crests on the knurl, near-black olive valleys (the dark studio
  // and the black flags between the boxes)
  goldMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color().setRGB(0.95, 0.62, 0.2, THREE.LinearSRGBColorSpace),
    metalness: 1,
    roughness: 0.18,
    envMap,
    envMapIntensity: 1.25,
  });
  patchMaterial(goldMat, {
    key: 'gold-knurl',
    vertex: [
      ['#include <common>', '#include <common>\nattribute float cavity;\nvarying float vCav;'],
      ['#include <fog_vertex>', '#include <fog_vertex>\nvCav = cavity;'],
    ],
    fragment: [
      ['#include <common>', '#include <common>\nvarying float vCav;'],
      [
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        {
          float c = smoothstep(0.25, 0.95, vCav);
          reflectedLight.indirectSpecular *= mix(1.0, 0.08, c);
          reflectedLight.directSpecular *= mix(1.0, 0.3, c);
        }`,
      ],
    ],
  });
  return goldMat;
}

const geoCache = {};
function geometries() {
  if (!geoCache.glass) {
    geoCache.glass = glassGeometry();
    geoCache.label = band(B.R + 0.012, B.labelY[0], B.labelY[1], 180);
    geoCache.cap = capGeometry();
    geoCache.ring = ringGeometry();
  }
  return geoCache;
}

// ------------------------------------------------------------------ assembly
// exposure of the printed label in the HDR studio: specular (varnish) and diffuse parts
export const LABEL_ENV = { spec: 0.7, diffuse: 0.55 };

export function createBottle({ envMap, label, variant }) {
  const g = geometries();
  const root = new THREE.Group();
  root.name = `bottle-${variant}`;
  const inner = new THREE.Group();
  inner.position.y = -B.pivotY;
  root.add(inner);

  const glassMat = glassMaterial(envMap, LIQUIDS[variant]);
  const glass = new THREE.Mesh(g.glass, glassMat);
  glass.name = 'glass';
  inner.add(glass);

  const labelMat = new THREE.MeshPhysicalMaterial({
    map: label.map,
    roughnessMap: label.rm,
    metalnessMap: label.rm,
    roughness: 1,
    metalness: 1,
    envMap,
    envMapIntensity: LABEL_ENV.spec,
    // a thin, sharp varnish (no milky veil)
    clearcoat: 0.25,
    clearcoatRoughness: 0.06,
  });
  patchMaterial(labelMat, { key: 'label-falloff', fragment: [envDiffuse(LABEL_ENV.diffuse), EDGE_FALLOFF] });
  const labelMesh = new THREE.Mesh(g.label, labelMat);
  labelMesh.name = 'label';
  inner.add(labelMesh);

  const gold = capMaterial(envMap);
  const ring = new THREE.Mesh(g.ring, gold);
  inner.add(ring);

  // cap pivot at the centre of its underside, so it can unscrew, rise and tilt
  const capPivot = new THREE.Group();
  capPivot.position.y = B.capY[0];
  inner.add(capPivot);
  const cap = new THREE.Mesh(g.cap, gold);
  cap.name = 'cap';
  capPivot.add(cap);

  const proxyGeo = bottleProxyGeometry();
  // shadow caster flags: x = 1 for amber glass (it lets orange light through, see shadows.js)
  const n = proxyGeo.attributes.position.count;
  const tint = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) tint.set([1.0, 0.0, 0.0], i * 3);
  proxyGeo.setAttribute('tint', new THREE.BufferAttribute(tint, 3));
  const proxy = new THREE.Mesh(proxyGeo, new THREE.MeshBasicMaterial());
  proxy.layers.set(1);
  inner.add(proxy);

  const meshes = [glass, labelMesh, ring, cap];
  return {
    root,
    inner,
    proxy,
    capPivot,
    meshes,
    glassMat,
    labelMat,
    setCap(rise, spin, tiltX, tiltZ) {
      capPivot.position.set(0, B.capY[0] + rise, 0);
      capPivot.rotation.set(tiltX, spin, tiltZ, 'ZXY');
    },
  };
}
