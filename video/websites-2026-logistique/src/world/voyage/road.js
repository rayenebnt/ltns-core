// ROUTE (chapter 02, top view): the map-like ground, the road from the terminal gate to the quay,
// its decor (crash barriers, light poles, the terminal fence and gate) and the quay (coping,
// bollards, fenders, two ship-to-shore cranes). Static decor shadows are baked as planar
// projections along the sun (crisp, long, no shadow-map cost); the road and the ground receive the
// real shadow map (the truck's shadow).
//
// road.length, road.pointAt(d), road.tangentAt(d): d = metres along the centreline from the gate
// (d < 0 and d > length extrapolate straight). y = 0 is the road surface.
import * as THREE from 'three';
import { ROAD, PORT } from '../layout.js';
import { Builder, ShadowBaker, shadowMaterial } from './util.js';

const C = (hex) => new THREE.Color(hex);

export function createRoad({ noise, sun, uniforms, gate = true }) {
  const group = new THREE.Group();
  group.name = 'voyage.road';

  // --- centreline: centripetal Catmull-Rom through the layout points, arc-length parameterised
  const curve = new THREE.CatmullRomCurve3(ROAD.points.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  curve.arcLengthDivisions = 4000;
  const length = curve.getLength();
  const P0 = curve.getPointAt(0), T0 = curve.getTangentAt(0);
  const P1 = curve.getPointAt(1), T1 = curve.getTangentAt(1);
  function pointAt(d, target = new THREE.Vector3()) {
    if (d <= 0) return target.copy(P0).addScaledVector(T0, d);
    if (d >= length) return target.copy(P1).addScaledVector(T1, d - length);
    return curve.getPointAt(d / length, target);
  }
  function tangentAt(d, target = new THREE.Vector3()) {
    if (d <= 0) return target.copy(T0);
    if (d >= length) return target.copy(T1);
    return curve.getTangentAt(d / length, target);
  }
  // lateral offset: + = right of the driving direction
  const _p = new THREE.Vector3(), _t = new THREE.Vector3();
  function offsetAt(d, lat, y = 0) {
    pointAt(d, _p);
    tangentAt(d, _t);
    return [_p.x - _t.z * lat, y, _p.z + _t.x * lat];
  }

  const quayZ = ROAD.quayZ;
  const U = uniforms;

  // --- ground: one large quad, the map-like light ground with faint field parcels; the quay
  // apron (concrete, slab joints, crane rails, safety line) along the quay
  const groundGeo = new THREE.BufferGeometry();
  {
    const x0 = -7000, x1 = 7500, z0 = -7000, z1 = quayZ;
    const y = -0.3;
    groundGeo.setAttribute('position', new THREE.Float32BufferAttribute([x0, y, z0, x0, y, z1, x1, y, z1, x1, y, z0], 3));
    groundGeo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    groundGeo.setIndex([0, 1, 2, 0, 2, 3]);
    groundGeo.computeBoundingSphere();
  }
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, metalness: 0 });
  groundMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vWXZ;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform sampler2D uNoise; uniform vec3 uGround; uniform vec3 uPaper; uniform vec3 uConcrete; uniform float uReveal; uniform float uQuayZ;
uniform vec4 uYard;
varying vec2 vWXZ;
vec2 vh22(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
float vh12(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  vec2 w = vWXZ;
  float blot = texture2D(uNoise, w / 37.0).b;
  float broad = texture2D(uNoise, w / 900.0).r;
  vec3 col = uGround * (0.985 + 0.03 * blot);
  // field parcels: jittered Voronoi cells, each its own faint tint, hedges as hairlines
  vec2 q = w / 165.0 + vec2(0.37, 0.11);
  vec2 ip = floor(q), fp = fract(q);
  float f1 = 9.0, f2 = 9.0; vec2 id = vec2(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 o = 0.5 + 0.38 * (vh22(ip + g) * 2.0 - 1.0);
    vec2 r = g + o - fp;
    float dd = dot(r, r);
    if (dd < f1) { f2 = f1; f1 = dd; id = ip + g; } else if (dd < f2) { f2 = dd; }
  }
  float h = vh12(id);
  vec3 tint = h < 0.25 ? vec3(0.955, 0.985, 0.94) : h < 0.5 ? vec3(1.012, 1.0, 0.975) : h < 0.75 ? vec3(1.0) : vec3(0.97, 0.982, 0.985);
  tint = 1.0 + (tint - 1.0) * 1.7; // (integrator: a little more present over the very light ground)
  // ploughing stripes in some parcels
  float ang = h * 6.2831;
  float stripe = 0.5 + 0.5 * sin(dot(w, vec2(cos(ang), sin(ang))) * 1.45);
  float striped = step(0.55, fract(h * 7.31));
  float edgeD = (sqrt(f2) - sqrt(f1)) * 165.0;
  float hedge = 1.0 - smoothstep(0.6, 2.2, edgeD);
  // fields fade out around the terminal and near the quay (industrial land, plain)
  float fx = max(uYard.x - w.x, w.x - uYard.y);
  float fz = max(uYard.z - w.y, w.y - uYard.w);
  float nearYard = 1.0 - smoothstep(0.0, 120.0, max(fx, fz));
  float fieldK = (1.0 - nearYard) * smoothstep(uQuayZ - 90.0, uQuayZ - 210.0, w.y) * uReveal;
  vec3 fcol = col * tint * (1.0 - 0.018 * stripe * striped) * (0.99 + 0.02 * broad);
  fcol *= 1.0 - 0.1 * hedge;
  col = mix(col, fcol, fieldK);
  // quay apron: concrete with slab joints, crane rails, a yellow safety line
  float apron = smoothstep(uQuayZ - 74.0, uQuayZ - 72.0, w.y);
  if (apron > 0.0) {
    float grain = texture2D(uNoise, w / 5.0).a;
    vec3 conc = uConcrete * (0.95 + 0.05 * grain) * (0.97 + 0.06 * blot);
    vec2 sl = abs(fract(w / vec2(7.5, 6.0)) - 0.5) * vec2(7.5, 6.0);
    float fwj = fwidth(w.x) * 0.9;
    float joint = 1.0 - smoothstep(0.0, 0.06 + fwj, min(sl.x, sl.y));
    conc *= 1.0 - 0.07 * joint * smoothstep(uQuayZ - 70.0, uQuayZ - 66.0, w.y);
    float rails = 0.0;
    for (int k = 0; k < 2; k++) {
      float rz = uQuayZ - (k == 0 ? 4.0 : 34.0);
      rails = max(rails, 1.0 - smoothstep(0.08, 0.16 + fwj, abs(abs(w.y - rz) - 0.7)));
    }
    conc = mix(conc, vec3(0.16, 0.16, 0.17), rails * 0.75);
    float safety = 1.0 - smoothstep(0.08, 0.1 + fwj, abs(w.y - (uQuayZ - 2.2)));
    conc = mix(conc, vec3(0.86, 0.6, 0.08), safety * 0.85);
    // tyre and container scuffs
    conc *= 1.0 - 0.05 * smoothstep(0.55, 0.8, texture2D(uNoise, w / vec2(90.0, 14.0)).b);
    col = mix(col, conc, apron * uReveal);
  }
  col = mix(uPaper, col, uReveal);
  diffuseColor.rgb = col;
}`
      );
  };
  groundMat.customProgramCacheKey = () => 'voyage-ground';
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.name = 'voyage.ground';
  ground.receiveShadow = true;
  ground.renderOrder = -2;
  group.add(ground);

  // --- the road ribbon ((v3) its cross-section is drawn for an 11 m road and scaled to ROAD.width:
  // wider lanes and hard shoulders, then a flat mid-grey verge band each side, so the road reads
  // at phone scale from the straight's altitude)
  const RK = ROAD.width / 11;
  const trailU = { value: new THREE.Vector2(0, 0) };
  const LAT = [-14, -10.5, -9.2, -7, -5.6, -3.6, -1.75, 0, 1.75, 3.6, 5.6, 7, 9.2, 10.5, 14].map((l) => l * RK);
  const pos = [], att = [], nor = [], idx = [];
  const step = 1.0;
  const n = Math.ceil(length / step) + 1;
  for (let i = 0; i < n; i++) {
    const d = Math.min(length, i * step);
    for (const lat of LAT) {
      const p = offsetAt(d, lat, 0.03);
      pos.push(p[0], p[1], p[2]);
      nor.push(0, 1, 0);
      att.push(lat, d);
    }
  }
  const W = LAT.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < W - 1; j++) {
      const a = i * W + j, b = a + 1, c = a + W, e = c + 1;
      idx.push(a, b, c, b, e, c);
    }
  }
  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  roadGeo.setAttribute('aRoad', new THREE.Float32BufferAttribute(att, 2));
  roadGeo.setIndex(idx);
  roadGeo.computeBoundingSphere();
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.9, metalness: 0, transparent: true,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6,
  });
  roadMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, { uLen: { value: length }, uRK: { value: RK }, uTrail: trailU });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aRoad;\nvarying vec2 vRoad;\nvarying vec2 vWXZ;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvRoad = aRoad;\nvWXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform sampler2D uNoise; uniform vec3 uAsph; uniform vec3 uAsphOld; uniform vec3 uMark; uniform vec3 uVerge; uniform vec3 uGravel; uniform vec3 uGround;
uniform float uLen; uniform float uRK; uniform vec2 uTrail;
varying vec2 vRoad; varying vec2 vWXZ;
float rRough = 0.9;`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  float lat = vRoad.x / uRK, d = vRoad.y, al = abs(lat);
  vec2 w = vWXZ;
  float grain = texture2D(uNoise, w / 3.1).a;
  float grain2 = texture2D(uNoise, w / 1.07 + 0.31).a;
  float blot = texture2D(uNoise, w / 23.0).b;
  float patchN = texture2D(uNoise, w / 260.0).r;
  // asphalt: fine aggregate (two scales of grains), blotches, repaired patches
  vec3 asph = uAsph * (0.84 + 0.22 * grain + 0.12 * grain2) * (0.93 + 0.14 * blot);
  float repair = smoothstep(0.6, 0.63, patchN) * (1.0 - smoothstep(0.66, 0.69, patchN));
  asph *= 1.0 - 0.1 * repair;
  // wheel tracks: darker, polished bands in each lane, a faint drip line between them
  float tr = exp(-pow((al - 0.82) / 0.36, 2.0)) + exp(-pow((al - 2.68) / 0.36, 2.0));
  asph *= 1.0 - 0.14 * tr;
  asph *= 1.0 - 0.07 * exp(-pow((al - 1.75) / 0.22, 2.0)) * smoothstep(0.35, 0.7, blot);
  // shoulders: older, lighter, more open asphalt
  float sh = smoothstep(3.62, 3.8, al);
  vec3 old = uAsphOld * (0.8 + 0.3 * grain + 0.1 * grain2) * (0.95 + 0.1 * blot);
  vec3 col = mix(asph, old, sh);
  // markings: solid edge lines, dashed centre line (3 m dash, 10 m gap; solid near the junctions)
  float fw = max(fwidth(al), 0.003) * 0.8;
  float edge = smoothstep(3.3 - fw, 3.3 + fw, al) * (1.0 - smoothstep(3.5 - fw, 3.5 + fw, al));
  float fd = max(fwidth(d), 0.003);
  float dm = mod(d, 13.0);
  float dash = smoothstep(0.0, fd, dm) * (1.0 - smoothstep(3.0 - fd, 3.0 + fd, dm));
  float solid = 1.0 - step(34.0, d) * step(d, uLen - 40.0);
  float centre = (1.0 - smoothstep(0.075 - fw, 0.075 + fw, al)) * max(dash, solid);
  // the stop line at the berth (the end of the road on the quay apron)
  float stopL = step(uLen - 4.2, d) * step(d, uLen - 3.6) * step(al, 3.5);
  float mk = max(max(edge, centre), stopL);
  float wear = smoothstep(0.3, 0.62, grain * 0.55 + blot * 0.55 + grain2 * 0.15);
  mk *= (0.5 + 0.5 * wear) * (1.0 - 0.35 * tr);
  col = mix(col, uMark, mk * 0.92);
  // (v3) the « sillage » trail: a 1.4 m brand-orange line on the centreline, from the gate to the
  // truck (« suivi en direct » on the map)
  float alm = abs(vRoad.x);
  float fwm = max(fwidth(alm), 0.003) * 0.8;
  float trail = (1.0 - smoothstep(0.7 - fwm, 0.7 + fwm, alm)) * (1.0 - smoothstep(uTrail.x - 4.0, uTrail.x, d)) * uTrail.y;
  col = mix(col, vec3(1.0, 0.105, 0.014), trail * 0.9);
  // paved edge (irregular), gravel strip, verge fading into the ground
  // (integrator: a crisp paved edge and a narrow, flat light-grey gravel strip: no torn-paper edge)
  float eN = (blot - 0.5) * 0.06;
  float paved = 1.0 - smoothstep(5.48 + eN, 5.56 + eN, al);
  // (v3) a flat mid-grey verge band to 9.2 (about 5 m at a 15 m road), crisp edge, then the verge
  vec3 gravel = vec3(0.40, 0.425, 0.44) * (0.97 + 0.05 * grain);
  float vergeK = smoothstep(9.12 + eN, 9.22 + eN, al);
  vec3 grass = uVerge * (0.97 + 0.05 * blot);
  grass = mix(grass, uGround, smoothstep(10.0, 13.2, al + eN * 2.0));
  vec3 outside = mix(gravel, grass, vergeK);
  col = mix(outside, col, paved);
  float a = 1.0 - smoothstep(10.5, 13.8, al + eN * 3.0);
  float vergeVis = smoothstep(16.0, 30.0, d) * (1.0 - smoothstep(uLen - 34.0, uLen - 12.0, d));
  a = mix(paved, a, vergeVis);
  a *= 1.0 - smoothstep(uLen - 0.8, uLen, d); // the road ends at the berth on the quay apron
  a *= smoothstep(0.0, 14.0, d); // and grows out of the yard's lane at the gate (no hard cut)
  rRough = mix(mix(0.93, 0.97, sh), 0.72, mk * paved);
  diffuseColor.rgb = col;
  diffuseColor.a = a;
}`
      )
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = rRough;');
  };
  roadMat.customProgramCacheKey = () => 'voyage-road';
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.name = 'voyage.roadRibbon';
  road.receiveShadow = true;
  road.renderOrder = 1;
  group.add(road);

  // --- decor (vertex-coloured, merged): poles, barriers, fence and gate, quay, cranes
  const shadows = new ShadowBaker(sun, 0.06);
  const B = new Builder(); // always drawn
  const F = new Builder(); // fine decor (barrier posts, fence posts, bollards, fenders): hidden at low
  const steel = C('#a3aaae'), steelDark = C('#6f777c'), galv = C('#b9bfc2'), concrete = C('#cfd1cd'), concreteDark = C('#a9aca8');
  const rubber = C('#1d1f21'), white = C('#eef0ef'), roofGrey = C('#c6cacb'), fenceCol = C('#56615c');

  // crash barriers along the curve, both sides, on posts every 4 m
  const barrierFrom = 46, barrierTo = Math.min(length - 20, 214);
  for (const side of [-1, 1]) {
    const lat = side * 6.55 * RK;
    let prev = null;
    for (let d = barrierFrom; d <= barrierTo + 0.01; d += 2) {
      const p = offsetAt(d, lat, 0.62);
      if (prev) {
        B.beam(prev, p, 0.34, 0.12, galv);
        shadows.addSegment([prev[0], 0.78, prev[2]], [p[0], 0.78, p[2]], 0.34, 0.3, 0);
      }
      prev = p;
      if (Math.round(d) % 4 === 0) {
        const q = offsetAt(d, lat + side * 0.12, 0.36);
        F.box(q[0], q[1], q[2], 0.13, 0.72, 0.13, steelDark);
      }
    }
    // ends flare away from the road
    for (const [d0, d1] of [[barrierFrom, barrierFrom - 6], [barrierTo, barrierTo + 6]]) {
      const a = offsetAt(d0, lat, 0.62), b = offsetAt(d1, lat + side * 1.2, 0.2);
      B.beam(a, b, 0.34, 0.12, galv);
    }
  }

  // light poles: left side of the driving direction (north of the first straight, outside of the
  // curve, east of the southbound straight); long shadows fall to the south-east across the verge
  const poles = [];
  for (let d = 22; d < length - 12; d += 44) poles.push(d);
  for (const d of poles) {
    const lat = -9.4 * RK - 1.5;
    const base = offsetAt(d, lat, 0);
    tangentAt(d, _t);
    const rx = -_t.z, rz = _t.x; // towards the road (right of the pole's side)
    B.box(base[0], 0.2, base[2], 0.7, 0.4, 0.7, concreteDark);
    B.box(base[0], 7.2, base[2], 0.24, 14.0, 0.24, steel);
    const top = [base[0], 14.0, base[2]], end = [base[0] + rx * 2.6, 14.15, base[2] + rz * 2.6];
    B.beam(top, end, 0.12, 0.12, steel);
    const ry = Math.atan2(rx, rz);
    B.box(end[0] + rx * 0.3, 14.05, end[2] + rz * 0.3, 0.32, 0.18, 0.85, steelDark, { ry, top: C('#8d969b') });
    shadows.addBox(base[0], 7.2, base[2], 0.24, 14.0, 0.24, 0, 3);
    shadows.addSegment(top, end, 0.14, 0.12, 2);
    shadows.addBox(end[0] + rx * 0.3, 14.05, end[2] + rz * 0.3, 0.32, 0.18, 0.85, ry, 1);
  }

  // terminal fence along x = gate.x with the gap where the road leaves; a small gatehouse
  // (skipped with gate: false when the port module builds its own)
  if (gate) {
    const gx = PORT.gate.x, gz = PORT.gate.z, gap = 9.5;
    const runs = [[PORT.yard.minZ, gz - gap], [gz + gap, PORT.yard.maxZ]];
    for (const [za, zb] of runs) {
      B.box(gx, 1.15, (za + zb) / 2, 0.06, 2.3, zb - za, fenceCol);
      shadows.addBox(gx, 1.2, (za + zb) / 2, 0.06, 2.4, zb - za, 0, 0);
      for (let z = za; z <= zb + 0.01; z += 3) F.box(gx, 1.25, z, 0.1, 2.5, 0.1, steelDark);
    }
    // gate pillars and the open sliding gate parked along the fence
    for (const z of [gz - gap, gz + gap]) {
      B.box(gx, 1.5, z, 0.7, 3.0, 0.7, C('#7f8589'), { top: C('#9aa0a3') });
      shadows.addBox(gx, 1.5, z, 0.7, 3.0, 0.7, 0, 1);
    }
    B.box(gx + 0.5, 1.1, gz - gap - 7, 0.12, 2.0, 13, C('#7a8580'));
    // gatehouse outside the fence, north of the road
    const hx = gx + 7.5, hz = gz - 15;
    B.box(hx, 1.6, hz, 5.6, 3.2, 4.2, white, { top: roofGrey });
    B.box(hx, 3.3, hz, 6.4, 0.25, 5.0, C('#d7dada'));
    shadows.addBox(hx, 1.7, hz, 6.4, 3.4, 5.0, 0, 1);
    // boom barrier (raised) and its post
    B.box(gx + 3, 0.6, gz - 7.2, 0.5, 1.2, 0.5, C('#d84a2a'));
  }

  // quay: concrete coping along the edge, bollards, fenders on the face
  {
    const x0 = -700, x1 = 1300;
    B.box((x0 + x1) / 2, 0.18, quayZ - 0.7, x1 - x0, 0.36, 1.4, concrete, { top: C('#d8d9d5') });
    for (let x = x0 + 10; x < x1; x += 24) {
      F.cyl(x, 0.0, quayZ - 1.05, 0.36, 0.8, C('#2b2e31'), 8, C('#45494c'));
    }
    for (let x = x0 + 4; x < x1; x += 12) {
      F.box(x, -0.2, quayZ + 0.42, 2.2, 0.9, 0.84, rubber, { top: C('#2a2c2e') });
    }
  }

  // ship-to-shore cranes: portal on two rails, boom over the water, machinery house on the
  // back-reach, apex and stays
  const cranesX = [318, 404];
  let layer = 40;
  for (const cx of cranesX) {
    const body = C('#c3ccd2'), bodyDark = C('#9eaab2'), boom = C('#d4dade'), trolley = C('#3a4248');
    const zw = quayZ - 4, zl = quayZ - 34;
    const box = (x, y, z, sx, sy, sz, col, opt) => {
      B.box(x, y, z, sx, sy, sz, col, opt);
      shadows.addBox(x, y, z, sx, sy, sz, 0, layer--);
    };
    const beam = (a, b, w, h, col) => {
      B.beam(a, b, w, h, col);
      shadows.addSegment(a, b, w, h, layer--);
    };
    for (const lx of [cx - 9, cx + 9]) {
      for (const lz of [zw, zl]) box(lx, 23, lz, 1.7, 46, 1.7, body);
      box(lx, 45.2, (zw + zl) / 2, 1.9, 2.4, 33.6, body); // portal beam across the rails
      box(lx, 12, (zw + zl) / 2, 1.2, 1.4, 30, bodyDark); // lower tie
    }
    for (const lz of [zw, zl]) {
      box(cx, 45.6, lz, 20, 2.0, 1.9, body);
      B.box(cx, 1.0, lz, 21, 2.0, 2.4, C('#4b5459'), { top: C('#5c656b') }); // sill beams and bogies
    }
    // boom: two girders, a top lattice, the trolley, the boom tip
    const zb0 = quayZ - 56, zb1 = quayZ + 64;
    for (const gx of [cx - 3.5, cx + 3.5]) box(gx, 48.5, (zb0 + zb1) / 2, 1.1, 3.0, zb1 - zb0, boom);
    for (let z = zb0 + 3; z < zb1 - 1; z += 6) B.box(cx, 49.9, z, 7.0, 0.3, 0.34, bodyDark);
    for (let z = zb0 + 3; z < zb1 - 7; z += 12) B.beam([cx - 3.4, 49.9, z], [cx + 3.4, 49.9, z + 6], 0.28, 0.28, bodyDark);
    box(cx, 50.8, quayZ + 21, 8.2, 2.4, 6.6, trolley, { top: C('#4a535a') });
    // machinery house on the back-reach (white, darker roof)
    box(cx, 53.5, quayZ - 46, 11.5, 7.0, 15, white, { top: C('#d3d7d8') });
    // apex (A-frame) and stays
    const apex = [cx, 78, zl + 7];
    for (const sx of [-1, 1]) {
      beam([cx + sx * 8.6, 46.5, zl + 1], [cx + sx * 1.4, 78, zl + 7], 1.2, 1.2, body);
      beam([cx + sx * 8.6, 46.5, zw - 1], [cx + sx * 1.4, 77, zl + 8], 0.9, 0.9, body);
    }
    beam([cx, 49.5, zb1 - 1], apex, 0.5, 0.5, bodyDark);
    beam([cx, 49.5, zb0 + 2], apex, 0.5, 0.5, bodyDark);
    beam([cx, 49.5, quayZ + 26], apex, 0.4, 0.4, bodyDark);
  }

  const decorMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.12 });
  const decor = new THREE.Mesh(B.geometry(), decorMat);
  decor.name = 'voyage.roadDecor';
  decor.receiveShadow = true;
  group.add(decor);
  const fine = new THREE.Mesh(F.geometry(), decorMat);
  fine.name = 'voyage.roadDecorFine';
  fine.receiveShadow = true;
  group.add(fine);

  const shadowMesh = new THREE.Mesh(shadows.geometry(), shadowMaterial());
  shadowMesh.name = 'voyage.bakedShadows';
  shadowMesh.renderOrder = 3;
  group.add(shadowMesh);

  function setQuality(level) {
    fine.visible = level !== 'low';
  }

  return {
    group,
    curve,
    length,
    pointAt,
    tangentAt,
    offsetAt,
    cranes: cranesX.map((x) => new THREE.Vector3(x, 0, quayZ)),
    meshes: { ground, road, decor, fine, shadows: shadowMesh },
    // (v3) the orange trail: up to arc length d (m from the gate), strength k (0..1)
    setTrail: (d, k) => trailU.value.set(d, k),
    setQuality,
    dispose() {
      for (const m of [ground, road, decor, fine, shadowMesh]) m.geometry.dispose();
      groundMat.dispose();
      roadMat.dispose();
      decorMat.dispose();
      shadowMesh.material.dispose();
    },
  };
}
