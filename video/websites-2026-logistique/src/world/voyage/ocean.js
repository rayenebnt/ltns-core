// MER (chapter 03): the ocean, one large quad that follows the camera; every detail is computed per
// pixel in world space (no swimming): multi-octave wave normals (a tileable wave map at four
// scales plus three analytic swells), sky reflection with Fresnel, sun glints and sparkles, deep
// natural blues turning lighter and greener near the quay, drifting cloud shadows consistent with
// the cloud layer, and the ship's foam: the hull band, the bow wave, the turbulent wake (« sillage »)
// with its aerated turquoise water and calm slick, the Kelvin arms (19.47°) and transverse waves, and
// the hull's shadow on the water. Land (z < quayZ) is discarded: the ground covers it.
import * as THREE from 'three';
import { ROAD, SEA } from '../layout.js';
import { HULL_GLSL } from './ship.js';
import { CLOUD_FIELD_GLSL } from './clouds.js';

export function createOcean({ uniforms }) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 0, -0.5], 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);

  const U = uniforms;
  const mat = new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, {
      uQuayZ: { value: ROAD.quayZ },
      uSeaLevel: { value: SEA.level },
    }),
    vertexShader: /* glsl */ `
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`,
    fragmentShader: /* glsl */ `
uniform sampler2D uNoise; uniform sampler2D uWaves;
uniform float uTime; uniform float uDetail; uniform float uQuayZ;
uniform vec3 uSunDir; uniform vec3 uSunColor; uniform vec3 uSkyZenith; uniform vec3 uSkyHorizon; uniform vec3 uHaze;
uniform vec3 uDeep; uniform vec3 uMid; uniform vec3 uShallow; uniform vec3 uAerated;
uniform vec4 uShip; uniform vec4 uShipDim; uniform float uWake;
uniform float uThr0; uniform float uCloudShadow; uniform vec2 uWind; uniform float uCloudMid;
varying vec3 vW;
${HULL_GLSL}
${CLOUD_FIELD_GLSL}
vec2 rot2(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
vec3 wv(vec2 uv) { vec4 t = texture2D(uWaves, uv); return vec3(t.r * 2.0 - 1.0, t.g * 2.0 - 1.0, t.b); }
void main() {
  vec2 p = vW.xz;
  if (p.y < uQuayZ - 0.4) discard;
  vec3 V = normalize(cameraPosition - vW);
  float dist = length(cameraPosition - vW);
  float t = uTime;

  // --- ship frame
  vec2 fwd = uShip.zw, rgt = vec2(-fwd.y, fwd.x);
  vec2 rel = p - uShip.xy;
  vec2 q = vec2(dot(rel, rgt), dot(rel, fwd));
  float L = uShipDim.x, Bh = uShipDim.y;
  float dH = hullSD(q, L, Bh);
  float ax = abs(q.x);
  float sb = L - q.y;              // metres aft of the stem
  float ss = -L - q.y;             // metres aft of the transom
  float wakeOn = uWake;

  // --- wave normal: analytic swells + tileable wave map at four scales
  vec2 sl = vec2(0.0);
  float hgt = 0.0;
  {
    vec2 d1 = normalize(vec2(0.8, 0.6)), d2 = normalize(vec2(0.3, 1.0)), d3 = normalize(vec2(1.0, -0.25));
    float k1 = 6.2832 / 190.0, k2 = 6.2832 / 112.0, k3 = 6.2832 / 71.0;
    float w1 = sqrt(9.81 * k1), w2 = sqrt(9.81 * k2), w3 = sqrt(9.81 * k3);
    float a1 = dot(d1, p) * k1 - w1 * t, a2 = dot(d2, p) * k2 - w2 * t, a3 = dot(d3, p) * k3 - w3 * t;
    sl += d1 * cos(a1) * 0.05 + d2 * cos(a2) * 0.04 + d3 * cos(a3) * 0.03;
    hgt += sin(a1) * 0.4 + sin(a2) * 0.3 + sin(a3) * 0.2;
  }
  vec3 o1 = wv(rot2(p, 0.3) / 97.0 + vec2(0.011, 0.006) * t);
  vec3 o2 = wv(rot2(p, -0.9) / 31.0 + vec2(-0.017, 0.021) * t);
  sl += o1.xy * 0.13 + o2.xy * 0.11;
  hgt += (o1.z - 0.5) * 1.2 + (o2.z - 0.5) * 0.7;
  if (uDetail > 0.5) {
    vec3 o3 = wv(rot2(p, 1.7) / 9.7 + vec2(0.034, -0.029) * t);
    sl += o3.xy * 0.09;
    hgt += (o3.z - 0.5) * 0.4;
  }
  if (uDetail > 1.5) {
    vec3 o4 = wv(rot2(p, 2.6) / 3.3 + vec2(-0.06, -0.047) * t);
    sl += o4.xy * 0.07;
  }

  // --- the ship's wake systems (analytic, world-anchored noise)
  float foam = 0.0, aer = 0.0, slick = 0.0;
  if (wakeOn > 0.0 && sb > -40.0 && ss < 2600.0 && ax < 700.0) {
    // flow: world coordinates along/across the path (static water) plus a slow churn
    vec2 pa = vec2(dot(p, rgt), dot(p, fwd));
    float churn = texture2D(uNoise, p / 31.0 + vec2(0.013, -0.009) * t).g;
    float cells = texture2D(uNoise, p / 13.0 - vec2(0.021, 0.017) * t).g;
    float streak = texture2D(uNoise, vec2(pa.x / 5.5, pa.y / 85.0) + vec2(0.0, 0.004 * t)).b;
    float fine = texture2D(uNoise, p / 3.7 + vec2(0.05, 0.03) * t).a;

    // hull band: a narrow, broken line of white water hugging the hull, more at the bow shoulders
    float bowK = smoothstep(0.15 * L, 0.85 * L, q.y);
    float sternK = smoothstep(-0.55 * L, -0.98 * L, q.y);
    float band = (1.0 - smoothstep(0.0, 1.0 + 1.6 * bowK + 2.2 * sternK + 2.0 * churn, dH)) * step(-0.5, dH);
    foam = max(foam, band * (0.45 + 0.55 * max(bowK, sternK)) * smoothstep(0.42, 0.78, cells * 0.6 + fine * 0.35 + churn * 0.3));

    // bow: a small white cushion at the stem, a crest that hugs the bow flare then detaches and
    // breaks into patches and streaks flowing aft
    if (sb > -30.0 && sb < 240.0) {
      float sbp = max(sb, 0.0);
      float gate = smoothstep(-2.0, 4.0, sb) * (1.0 - smoothstep(170.0, 235.0, sb));
      float hwS = hullHW(clamp(q.y, -L, L), L, Bh);
      float off = ax - hwS;
      float xc = 0.5 + 0.11 * sbp + 0.0006 * sbp * sbp;
      float wc = 1.0 + 0.025 * sbp;
      float br = smoothstep(0.42, 0.8, cells * 0.55 + fine * 0.45 + churn * 0.35);
      float crest = exp(-pow((off - xc) / wc, 2.0)) * exp(-sbp / 55.0) * gate;
      float trail = exp(-pow((off - xc) / (wc * 1.8), 2.0)) * exp(-sbp / 110.0) * smoothstep(0.55, 0.85, streak * 0.55 + churn * 0.55) * gate;
      float cushion = exp(-length(vec2(q.x, q.y - L + 4.0)) / 6.0) * smoothstep(0.3, 0.7, cells * 0.6 + fine * 0.6);
      foam = max(foam, crest * (0.25 + 0.75 * br));
      foam = max(foam, trail * 0.55);
      foam = max(foam, cushion * 0.9 * step(0.0, dH));
      sl += rgt * sign(q.x) * (crest + trail * 0.4) * 0.16;
    }

    // Kelvin arms (19.47°) from the stem: faint, broken in long segments
    if (sb > 20.0 && uDetail > 0.5) {
      float xa = sb * 0.3536;
      float wa = 1.4 + 0.006 * sb;
      float arm = exp(-pow((ax - xa) / wa, 2.0)) * smoothstep(30.0, 120.0, sb) * exp(-sb / 900.0);
      float seg = smoothstep(0.42, 0.72, texture2D(uNoise, vec2(sb / 150.0, ax / 300.0) + 0.17).r);
      foam = max(foam, arm * seg * smoothstep(0.4, 0.8, churn) * 0.09);
      sl += rgt * sign(q.x) * arm * seg * 0.03;
      // transverse waves inside the wedge (wavelength 2πU²/g, about 52 m)
      float inW = 1.0 - smoothstep(0.85 * xa, xa, ax);
      sl += fwd * sin(sb * 6.2832 / 52.0) * 0.04 * inW * exp(-sb / 700.0) * smoothstep(40.0, 140.0, sb);
    }

    // turbulent wake: white propeller wash right behind the transom, then a meandering band of
    // aerated turquoise water with white patches and streaks that thin out with age
    if (ss > -30.0) {
      float s = max(ss, 0.0);
      float wc = 0.8 * Bh + 0.03 * s + 3.0 * smoothstep(0.0, 40.0, s);
      float meander = (texture2D(uNoise, vec2(pa.y / 900.0, 0.31)).r - 0.5) * 22.0 * smoothstep(0.0, 300.0, s);
      float axw = abs(q.x - meander);
      float edgeN = (churn - 0.5) * 0.7 + (texture2D(uNoise, p / 70.0 + 0.4).g - 0.5) * 0.6;
      float core = 1.0 - smoothstep(0.35 * wc, wc, axw + edgeN * wc * 0.4);
      float age = exp(-s / 480.0);
      float young = exp(-s / 120.0);
      float blob = texture2D(uNoise, vec2(pa.x / 11.0, pa.y / 38.0) + vec2(0.0, 0.003 * t)).g;
      float turb = blob * 0.55 + churn * 0.3 + streak * 0.3 + cells * 0.15;
      float thr = mix(1.12, 0.6, age);
      float wf = smoothstep(thr, thr + 0.14, turb) * core;
      float wash = (1.0 - smoothstep(0.25 * wc, 0.8 * wc, axw + edgeN * 6.0)) * young * smoothstep(-30.0, 5.0, ss);
      foam = max(foam, max(wf * (0.5 + 0.5 * age), wash * smoothstep(0.3, 0.6, turb)));
      aer = core * exp(-s / 800.0) * (0.35 + 0.65 * smoothstep(0.35, 0.8, blob * 0.6 + churn * 0.5));
      slick = (1.0 - smoothstep(0.7 * wc, 1.35 * wc, axw)) * exp(-s / 1600.0);
    }
    foam *= wakeOn;
    aer *= wakeOn;
    slick *= wakeOn;
  }

  // calm slick in the wake: small waves damped
  sl *= 1.0 - 0.55 * slick;
  vec3 n = normalize(vec3(-sl.x, 1.0, -sl.y));

  // --- light
  vec3 Ls = normalize(uSunDir);
  float NdV = max(dot(n, V), 0.0);
  float F = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);
  vec3 R = reflect(-V, n);
  vec3 sky = mix(uSkyHorizon, uSkyZenith, pow(clamp(R.y, 0.0, 1.0), 0.45));

  // shadows: the hull and its stacks (sun-projected outline), the clouds above
  vec2 toSun = Ls.xz / max(Ls.y, 0.2);
  float hs = 0.0;
  {
    float d1 = hullSD(vec2(dot(rel + toSun * 14.0, rgt), dot(rel + toSun * 14.0, fwd)), L, Bh);
    vec2 r2 = rel + toSun * 31.0;
    vec2 q2 = vec2(dot(r2, rgt), dot(r2, fwd));
    float d2 = max(hullSD(q2, L, Bh) + 1.2, max(q2.y - (L - 36.0), -(L - 48.0) - q2.y));
    vec2 r3 = rel + toSun * 47.0;
    vec2 q3 = vec2(dot(r3, rgt), dot(r3, fwd));
    float d3 = max(abs(q3.x) - 15.0, abs(q3.y + L - 37.0) - 10.0);
    hs = 1.0 - smoothstep(-1.5, 1.5, min(min(d1, d2), d3));
    hs *= step(0.0, dH);
  }
  float cs = 0.0;
  if (uCloudShadow > 0.0) {
    vec2 cp = p + toSun * uCloudMid;
    cs = smoothstep(0.0, 0.22, cloudColumn(cp, uTime)) * uCloudShadow;
  }
  float lit = (1.0 - hs * 0.85) * (1.0 - cs);

  // water body: deep natural blues, lighter and greener near the quay, crests a touch lighter
  float nearQ = 1.0 - smoothstep(uQuayZ + 15.0, uQuayZ + 170.0, p.y);
  vec3 body = mix(uDeep, uMid, clamp(0.35 + hgt * 0.22, 0.0, 1.0));
  body = mix(body, uShallow, nearQ * 0.85);
  body = mix(body, uAerated, aer * 0.38);
  float diff = 0.72 + 0.5 * max(dot(n, Ls), 0.0);
  body *= diff * mix(1.0, 0.62, hs) * mix(1.0, 0.72, cs);
  vec3 col = mix(body, sky * mix(1.0, 0.55, max(hs, cs)), F);

  // glints: a sharp sun lobe, a broad sheen, sparkles on facets turned to the sun
  float rs = max(dot(R, Ls), 0.0);
  float spec = pow(rs, 1400.0) * 90.0 + pow(rs, 90.0) * 0.55 + pow(rs, 12.0) * 0.05;
  if (uDetail > 1.5) {
    vec3 Hh = normalize(V + Ls);
    float facet = smoothstep(0.93, 0.995, dot(n, Hh));
    float spk = texture2D(uNoise, p / 2.1 + vec2(0.07, -0.05) * t).a * texture2D(uNoise, p / 0.83 - vec2(0.11, 0.06) * t).a;
    spec += smoothstep(0.62, 0.86, spk) * (0.6 + 6.0 * facet) * smoothstep(1500.0, 300.0, dist);
  }
  col += uSunColor * spec * lit * (1.0 - foam) * (1.0 - 0.7 * slick);

  // the quay wall: its shadow and a thin line of white where the small waves hit it
  float qd = p.y - uQuayZ;
  col *= 1.0 - 0.45 * (1.0 - smoothstep(0.0, 3.0, qd));
  float qfoam = (1.0 - smoothstep(0.2, 1.6, qd)) * smoothstep(0.4, 0.8, texture2D(uNoise, p / 4.0 + vec2(0.03, 0.0) * t).g);

  // foam: lit white, a cool grey where shadowed
  foam = clamp(max(foam, qfoam * 0.6), 0.0, 1.0);
  vec3 foamCol = vec3(0.93, 0.955, 0.97) * (0.78 + 0.3 * max(dot(n, Ls), 0.0)) * mix(1.0, 0.6, max(hs, cs * 0.7));
  col = mix(col, foamCol, foam);

  // haze towards the horizon (oblique views)
  col = mix(col, uHaze, 1.0 - exp(-dist / 14000.0));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
  mat.customProgramCacheKey = () => 'voyage-ocean';
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'voyage.ocean';
  mesh.frustumCulled = false;
  mesh.position.y = SEA.level;
  mesh.renderOrder = -1;

  // follow the camera: the quad spans well past the frustum at any altitude
  function follow(camera) {
    const h = Math.max(50, camera.position.y - SEA.level);
    const size = Math.max(4000, h * 14);
    mesh.position.set(camera.position.x, SEA.level, camera.position.z);
    mesh.scale.set(size, 1, size);
  }

  return {
    mesh,
    material: mat,
    follow,
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
