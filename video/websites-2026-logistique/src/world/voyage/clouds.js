// AIR (chapter 04): the cloud layer between SKY.cloudBase and SKY.cloudTop, ray-marched, in two
// decks (lower: base to 36 % of the slab, upper: 56 % to the top) for parallax as the camera climbs.
// The cloud field is a tileable 2D map baked once on the CPU (shape = broad coverage + billows +
// puffs); the density at a point is shape(xz) minus a threshold that rises with height (flat bases,
// domed tops). One draw call: a camera-following quad at the slab's top (camera above) or base
// (camera below), or a full-screen triangle when the camera is inside the slab; the fragment marches
// the view ray through the slab (5/10/16/24 steps by quality, one map fetch per step, jittered) with
// front-to-back accumulation. Light: points near their cloud's local top are sunlit, deeper ones
// fall to a bluish-grey shade; slopes facing the north-west sun brighter; haze with distance; the
// plane's soft shadow on the first surface hit. Coverage (0..1 = covered fraction) is calibrated
// from the map's distribution. The same map gives the ocean its drifting cloud shadows.
import * as THREE from 'three';
import { SKY } from '../layout.js';

const MAP = 512, MAP_M = 12000; // texels, metres per tile (integrator: bigger masses, real gaps)

// shared GLSL (the ocean uses cloudColumn for its cloud shadows)
export const CLOUD_FIELD_GLSL = /* glsl */ `
uniform sampler2D uCloudMap;
float cloudShape(vec2 xz, float t) { return texture2D(uCloudMap, (xz + uWind * t) / ${MAP_M.toFixed(1)}).r; }
float cloudColumn(vec2 xz, float t) { return cloudShape(xz, t) - uThr0; }
`;

function bakeCloudMap(noise) {
  const fl = new Float32Array(MAP * MAP);
  const data = new Uint8Array(MAP * MAP * 4);
  let mn = 1, mx = 0;
  for (let y = 0; y < MAP; y++) {
    for (let x = 0; x < MAP; x++) {
      const u = x / MAP, v = y / MAP;
      const lo = noise.sample(u * 2 + 0.13, v * 2 + 0.57, 0);
      const puffs = noise.sample(u * 6 + 0.37, v * 6 + 0.21, 1);
      const mid = noise.sample(u * 14 + 0.71, v * 14 + 0.05, 1);
      const s = lo * 0.62 + puffs * 0.28 + mid * 0.1;
      fl[y * MAP + x] = s;
      mn = Math.min(mn, s);
      mx = Math.max(mx, s);
    }
  }
  for (let i = 0; i < MAP * MAP; i++) {
    const s = (fl[i] - mn) / (mx - mn);
    fl[i] = s;
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = Math.round(s * 255);
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, MAP, MAP, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  const sample = (x, z) => {
    const fx = (x / MAP_M - Math.floor(x / MAP_M)) * MAP - 0.5, fz = (z / MAP_M - Math.floor(z / MAP_M)) * MAP - 0.5;
    const x0 = Math.floor(fx), z0 = Math.floor(fz), ax = fx - x0, az = fz - z0;
    const at = (i, j) => fl[(((j % MAP) + MAP) % MAP) * MAP + (((i % MAP) + MAP) % MAP)];
    const a = at(x0, z0) + (at(x0 + 1, z0) - at(x0, z0)) * ax;
    const b = at(x0, z0 + 1) + (at(x0 + 1, z0 + 1) - at(x0, z0 + 1)) * ax;
    return a + (b - a) * az;
  };
  const sorted = Float32Array.from(fl).sort();
  const quantile = (q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];
  return { texture: tex, sample, quantile };
}

export function createClouds({ uniforms, noise }) {
  const base = SKY.cloudBase, top = SKY.cloudTop;
  const map = bakeCloudMap(noise);
  uniforms.uCloudMap = { value: map.texture };
  const U = uniforms;
  const local = {
    uBase: { value: base },
    uTop: { value: top },
    uSteps: { value: 16 },
    uSigma: { value: 0.022 },
    uInside: { value: 0 },
    uInvVP: { value: new THREE.Matrix4() },
    uClear: { value: new THREE.Vector4(0, 0, 250, 0) },
    uBank: { value: new THREE.Vector2(0, 0) }, // the coastal bank: z of its southern edge, strength
  };

  const vertexShader = /* glsl */ `
uniform float uInside;
varying vec3 vW; varying vec2 vNdc;
void main() {
  if (uInside > 0.5) {
    vNdc = position.xy;
    vW = vec3(0.0);
    gl_Position = vec4(position.xy, 0.0, 1.0);
  } else {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    vNdc = vec2(0.0);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
}`;
  const fragmentShader = /* glsl */ `
uniform sampler2D uNoise; uniform float uTime; uniform float uThr0; uniform float uThr1; uniform vec2 uWind;
uniform vec3 uSunDir; uniform vec3 uCloudLit; uniform vec3 uCloudShade; uniform vec3 uCloudDark; uniform vec3 uPaper; uniform vec3 uHaze;
uniform float uWhite; uniform float uDetail; uniform float uBase; uniform float uTop; uniform float uSteps; uniform float uSigma;
uniform float uInside; uniform mat4 uInvVP; uniform vec4 uClear; uniform vec2 uBank;
uniform vec4 uPlane; uniform vec2 uPlaneDir; uniform float uPlaneShadow;
varying vec3 vW; varying vec2 vNdc;
${CLOUD_FIELD_GLSL}
float thrAt(float hn) {
  return mix(uThr0, uThr1, pow(max(hn - 0.1, 0.0) / 0.9, 1.4)) + 0.35 * (uThr1 - uThr0) * (1.0 - smoothstep(0.0, 0.08, hn));
}
float planeSD(vec2 q) {
  float fus = max(abs(q.x) - 3.1 * (1.0 - smoothstep(24.0, 32.0, q.y)), abs(q.y) - 32.0);
  float xa = abs(q.x);
  float le = 7.5 - (xa - 2.6) * 0.625;
  float ch = mix(13.5, 2.6, clamp((xa - 2.6) / 29.6, 0.0, 1.0));
  float wing = max(max(q.y - le, (le - ch) - q.y), xa - 32.2);
  float lt = -21.0 - (xa - 1.5) * 0.73;
  float tch = mix(7.0, 2.6, clamp((xa - 1.5) / 9.5, 0.0, 1.0));
  float tail = max(max(q.y - lt, (lt - tch) - q.y), xa - 11.0);
  return min(fus, min(wing, tail));
}
void main() {
  vec3 ro = cameraPosition;
  vec3 rd;
  if (uInside > 0.5) {
    vec4 wp = uInvVP * vec4(vNdc, 1.0, 1.0);
    rd = normalize(wp.xyz / wp.w - ro);
  } else {
    rd = normalize(vW - ro);
  }
  float tA, tB;
  if (abs(rd.y) < 1e-4) {
    if (ro.y < uBase || ro.y > uTop) discard;
    tA = 0.0; tB = 6000.0;
  } else {
    float t0 = (uBase - ro.y) / rd.y, t1 = (uTop - ro.y) / rd.y;
    tA = max(min(t0, t1), 0.0);
    tB = max(t0, t1);
  }
  if (tB <= tA) discard;
  tB = min(tB, tA + 5200.0);
  float dt = (tB - tA) / uSteps;
  // (integrator: a hashed white-noise jitter: the interleaved gradient noise showed as a diagonal hatch)
  vec2 jq = fract(gl_FragCoord.xy * vec2(0.1031, 0.1030));
  jq += dot(jq, jq.yx + 33.33);
  float jit = fract((jq.x + jq.y) * jq.x);
  float t = tA + dt * jit;
  float T = 1.0;
  vec3 C = vec3(0.0);
  float slab = uTop - uBase;
  vec2 toSun = normalize(uSunDir.xz + 1e-5);
  float slope = 0.0; float tHit = -1.0; vec3 pHit = vec3(0.0);
  float wt = uTime;
  for (int i = 0; i < 32; i++) {
    if (float(i) >= uSteps || T < 0.015) break;
    vec3 p = ro + rd * t;
    // two decks with a gap between them (parallax as the camera climbs): the lower one from the
    // base to 36 % of the slab, the upper one from 56 % to the top; each has its own clouds
    float yy = (p.y - uBase) / slab;
    float upper = step(0.5, yy);
    float hn = upper > 0.5 ? (yy - 0.56) / 0.44 : yy / 0.36;
    if (hn < 0.0 || hn > 1.0) { t += dt; continue; }
    vec2 dxz = p.xz + upper * vec2(2310.0, -1670.0);
    float s = cloudShape(dxz, wt) - upper * 0.035;
    // the camera's clearing: it rises through a hole that closes for the white-out
    // (integrator) a long gap along the ship's track (north-south semi-axis 2.2 r, east-west 1.1 r),
    // with a lobed rim (two noise octaves): a lane of open sea over the ship and its wake, not a
    // round porthole
    float cr = length((p.xz - uClear.xy) * vec2(0.909, 0.4545));
    if (uClear.w > 0.0 && cr < uClear.z * 1.5) cr *= 0.74 + 0.34 * texture2D(uNoise, p.xz / 360.0 + 0.37).g + 0.18 * texture2D(uNoise, p.xz / 120.0 + 0.61).g;
    // a cloud bank over the coast (north of uBank.x), so the climb never shows a straight quay edge:
    // the camera's clearing does not open it
    float bankM = uBank.y * (1.0 - smoothstep(uBank.x - 140.0, uBank.x, p.z));
    // ((v3) a gradual edge: the cover thins towards the ship, with broken cloud in the outer part
    // of the gap, rather than a hard-rimmed hole)
    s -= uClear.w * (1.0 - smoothstep(uClear.z * 0.2, uClear.z * 1.05, cr)) * 0.45 * (1.0 - bankM);
    s += bankM * 0.35;
    float d = s - thrAt(hn);
    float bil = 0.55;
    // the billow detail moves the density by at most ±0.06: skip its fetch in clear air
    if (uDetail > 0.5 && d > -0.065) {
      // billows that change with height: no smooth vertical walls
      vec2 dq = (p.xz + uWind * wt * 1.3 + vec2(hn * 157.0, -hn * 211.0)) / 175.0;
      bil = texture2D(uNoise, dq).g;
      d += (bil - 0.55) * 0.11 * (0.6 + 0.8 * hn);
    }
    d = mix(d, max(d, 0.25), uWhite);
    if (d > 0.0) {
      if (tHit < 0.0) {
        tHit = t; pHit = p;
        float s2 = cloudShape(dxz + toSun * 90.0, wt) - upper * 0.035;
        slope = clamp((s - s2) * 7.0, -1.0, 1.0);
      }
      // (v3) clouds right at the camera thin out (no pop as the camera enters or leaves a deck)
      float a = 1.0 - exp(-smoothstep(0.0, 0.06, d) * uSigma * dt * smoothstep(30.0, 240.0, t));
      // the local cloud top above this point (where the shape meets the rising threshold)
      float k = clamp((s - uThr0) / max(uThr1 - uThr0, 1e-4), 0.0, 1.0);
      float hnTop = 0.1 + 0.9 * pow(k, 0.714);
      float depth = max(hnTop - hn, 0.0) * slab * 0.4;
      float sunT = exp(-depth / 110.0);
      if (uDetail > 1.5) {
        // one look towards the sun, higher up: the cloud's own shadow on its far side
        float hs = min(hn + 0.3, 1.0);
        float ds = cloudShape(dxz + toSun * 70.0, wt) - upper * 0.035 - thrAt(hs);
        sunT *= exp(-max(ds, 0.0) * 26.0);
      } else {
        sunT *= clamp(0.7 + 0.5 * slope, 0.0, 1.0);
      }
      vec3 col = mix(uCloudDark, uCloudShade, smoothstep(0.0, 0.8, hn * 0.6 + sunT * 0.55));
      col = mix(col, uCloudLit, sunT * (0.86 + 0.14 * clamp(0.5 + slope, 0.0, 1.0)));
      col *= 0.9 + 0.12 * bil; // creases between the billows
      C += T * a * col;
      T *= 1.0 - a;
    }
    t += dt;
  }
  float alpha = 1.0 - T;
  if (alpha < 0.004) discard;
  vec3 col = C / alpha;
  float planeSh = 0.0;
  if (uPlaneShadow > 0.0 && tHit > 0.0) {
    // uPlane.w: artistic drop factor (1 = true sun projection; less brings the shadow closer to
    // the plane so the top-down shot can hold both)
    float drop = uPlane.y - pHit.y;
    vec2 sc = uPlane.xz - uSunDir.xz / max(uSunDir.y, 0.2) * drop * uPlane.w;
    vec2 r = pHit.xz - sc;
    vec2 f = uPlaneDir, rr = vec2(-f.y, f.x);
    float sd = planeSD(vec2(dot(r, rr), dot(r, f)));
    float pen = 1.5 + drop * 0.0093;
    planeSh = uPlaneShadow * 0.45 * (1.0 - smoothstep(-pen, pen, sd));
  }
  col = mix(col, uPaper, uWhite);
  col *= 1.0 - planeSh;
  col = mix(col, uHaze, (1.0 - exp(-max(tHit, tA) / 26000.0)) * (1.0 - uWhite));
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
  const mat = new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, local),
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  mat.customProgramCacheKey = () => 'voyage-clouds';

  // one geometry: a unit quad in XZ (quad mode) whose first three vertices also form the
  // full-screen triangle in clip space (inside mode, drawn with drawRange 0..3)
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
  const quadGeo = new THREE.BufferGeometry();
  quadGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 0, -0.5], 3));
  quadGeo.setIndex([0, 1, 2, 0, 2, 3]);
  quadGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
  const mesh = new THREE.Mesh(quadGeo, mat);
  mesh.name = 'voyage.clouds';
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;

  // the veil: a soft full-screen white when the camera sits inside a cloud, and the white-out
  const veilMat = new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { uVeil: { value: 0 }, uVeilCol: { value: new THREE.Color(1, 1, 1) } }),
    transparent: true,
    depthTest: false,
    depthWrite: false,
    vertexShader: /* glsl */ `
varying vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
uniform sampler2D uNoise; uniform float uTime; uniform float uVeil; uniform vec3 uVeilCol;
varying vec2 vUv;
void main() {
  float n = texture2D(uNoise, vUv * vec2(1.6, 1.0) * 0.5 + vec2(uTime * 0.011, uTime * 0.004)).g;
  float n2 = texture2D(uNoise, vUv * 1.3 - vec2(uTime * 0.007, 0.0)).r;
  float a = uVeil * mix(0.8 + 0.4 * n * n2, 1.0, smoothstep(0.7, 1.0, uVeil));
  gl_FragColor = vec4(uVeilCol, clamp(a, 0.0, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
  veilMat.customProgramCacheKey = () => 'voyage-veil';
  const veil = new THREE.Mesh(geo, veilMat);
  veil.name = 'voyage.cloudVeil';
  veil.frustumCulled = false;
  veil.renderOrder = 20;

  let steps = 16;
  function setSteps(n) {
    steps = n;
    local.uSteps.value = n;
  }

  function densityAt(x, y, z, t) {
    const yy = (y - base) / (top - base);
    if (yy < 0 || yy > 1) return -1;
    const upper = yy >= 0.5 ? 1 : 0;
    const hn = upper ? (yy - 0.56) / 0.44 : yy / 0.36;
    if (hn < 0 || hn > 1) return -1;
    x += upper * 2310;
    z -= upper * 1670;
    const k = Math.pow(Math.max(hn - 0.1, 0) / 0.9, 1.4);
    const thr = U.uThr0.value + (U.uThr1.value - U.uThr0.value) * k;
    const c = local.uClear.value;
    const cr = Math.hypot((x - c.x) * 0.909, (z - c.y) * 0.4545);
    const clear = c.w * (1 - Math.min(1, Math.max(0, (cr - c.z * 0.5) / (c.z * 0.5)))) * 0.45;
    return map.sample(x + U.uWind.value.x * t, z + U.uWind.value.y * t) - upper * 0.035 - clear - thr;
  }
  // the clearing around the camera's column: radius in metres, strength 0..1
  function setBank(z, k) {
    local.uBank.value.set(z, k);
  }
  function setClearing(x, z, radius, strength) {
    local.uClear.value.set(x, z, radius, strength);
  }
  // coverage c: the base covers a fraction c of the sky, the tops a fraction c × topShare
  function setCoverage(c, topShare = 0.3) {
    U.uThr0.value = c >= 0.999 ? -0.05 : map.quantile(1 - c);
    U.uThr1.value = map.quantile(1 - Math.max(0.002, c * topShare));
  }

  const _m = new THREE.Matrix4();
  function update(camera, time, white) {
    const cy = camera.position.y;
    const inside = cy > base && cy < top;
    local.uInside.value = inside ? 1 : 0;
    if (inside) {
      if (mesh.geometry !== geo) mesh.geometry = geo;
      mesh.position.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
      camera.updateMatrixWorld();
      _m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      local.uInvVP.value.copy(_m).invert();
    } else {
      if (mesh.geometry !== quadGeo) mesh.geometry = quadGeo;
      const size = Math.max(12000, Math.abs(cy - (base + top) / 2) * 24);
      mesh.position.set(camera.position.x, cy > top ? top : base, camera.position.z);
      mesh.scale.set(size, 1, size);
    }
    const dens = densityAt(camera.position.x, cy, camera.position.z, time);
    const inCloud = dens > 0 ? Math.min(1, dens / 0.05) * 0.55 : 0;
    veilMat.uniforms.uVeil.value = Math.max(inCloud, Math.pow(white, 1.6));
    veilMat.uniforms.uVeilCol.value.copy(U.uCloudLit.value).lerp(U.uPaper.value, white);
    veil.visible = veilMat.uniforms.uVeil.value > 0.002;
  }

  return {
    mesh,
    veil,
    material: mat,
    setSteps,
    setCoverage,
    setClearing,
    setBank,
    densityAt,
    update,
    get steps() {
      return steps;
    },
    dispose() {
      geo.dispose();
      quadGeo.dispose();
      mat.dispose();
      veilMat.dispose();
      map.texture.dispose();
    },
  };
}
