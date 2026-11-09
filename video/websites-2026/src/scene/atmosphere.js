// Golden-hour sky and aerial perspective, shared by every shader in the scene.
// Standard three.js materials get it through a patched fog chunk (scene.fog = FogExp2):
// distant things fade into the colour of the horizon sky in their own direction.
import { ShaderChunk } from 'three';
import { SUN_VIEW } from './config.js';

const v3 = (v) => `vec3(${v.x.toFixed(6)}, ${v.y.toFixed(6)}, ${v.z.toFixed(6)})`;

export const ATMOS_GLSL = /* glsl */ `
const vec3 SUN_V = ${v3(SUN_VIEW)};

vec3 skyBase(vec3 d) {
  float y = d.y;
  float e = max(y, 0.0);
  vec2 dh = normalize(d.xz + vec2(1e-6));
  float az = dot(dh, normalize(SUN_V.xz));
  float toward = 0.5 + 0.5 * az;          // 0 = away from the sun, 1 = toward it
  float tw2 = toward * toward;
  // colour stops by elevation: azure -> light blue -> cool cream -> peach -> orange at the
  // horizon toward the sun. Neighbouring stops keep green >= red or red > green > blue, so
  // the blends never go through mauve.
  // The azure stops take over low (from ~2-3 degrees up), so the sky of the hero frame, which
  // only reaches ~20 degrees, reads deep azure at the top instead of a pale grey-blue.
  vec3 cZen = vec3(0.050, 0.235, 0.640);
  vec3 cHi  = mix(vec3(0.120, 0.340, 0.740), vec3(0.190, 0.370, 0.710), tw2);
  vec3 cMid = mix(vec3(0.420, 0.550, 0.760), vec3(0.800, 0.720, 0.680), tw2);
  vec3 cLow = mix(vec3(0.840, 0.790, 0.720), vec3(1.050, 0.800, 0.540), tw2);
  vec3 cHor = mix(vec3(0.880, 0.760, 0.640), vec3(1.000, 0.500, 0.200), tw2 * toward);
  vec3 c = mix(cHor, cLow, smoothstep(0.0, 0.03, e));
  c = mix(c, cMid, smoothstep(0.012, 0.045, e));
  c = mix(c, cHi, smoothstep(0.03, 0.10, e));
  c = mix(c, cZen, smoothstep(0.09, 0.32, e));
  // forward (Mie) glow around the sun, kept low: the broad terms make the horizon behind the
  // card burn peach-orange without whitening the azure above
  float sd = max(dot(d, SUN_V), 0.0);
  c += vec3(1.00, 0.46, 0.16) * (pow(sd, 8.0) * 0.06 * (1.0 - 0.6 * smoothstep(0.04, 0.25, e)) + pow(sd, 48.0) * 0.14 + pow(sd, 520.0) * 0.12
    + pow(sd, 4.0) * 0.12 * (1.0 - smoothstep(0.0, 0.25, e)));
  // below the horizon: distant sea seen through the haze
  if (y < 0.0) {
    vec3 seaFar = mix(vec3(0.080, 0.130, 0.200), vec3(0.260, 0.190, 0.150), tw2);
    c = mix(c, seaFar, smoothstep(0.0, -0.12, y));
  }
  return c;
}

float skyHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float skyNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(skyHash(i), skyHash(i + vec2(1.0, 0.0)), u.x), mix(skyHash(i + vec2(0.0, 1.0)), skyHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float skyFbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * skyNoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return s;
}
// thin cirrus streaks catching the sunset light (visible sky only)
vec3 skyClouds(vec3 d, vec3 c) {
  if (d.y < 0.012) return c;
  vec2 uv = d.xz / (d.y + 0.07);
  vec2 q = mat2(0.8, -0.6, 0.6, 0.8) * uv * vec2(0.55, 2.4);
  float n = skyFbm(q * 1.1 + vec2(3.0, 1.0));
  float cov = smoothstep(0.55, 0.8, n) * smoothstep(0.012, 0.1, d.y) * (1.0 - smoothstep(0.3, 0.7, d.y));
  float sd = max(dot(d, SUN_V), 0.0);
  vec3 lit = mix(vec3(0.92, 0.88, 0.84), vec3(1.15, 0.62, 0.32), pow(sd, 3.0));
  return mix(c, lit, cov * 0.15);
}

vec3 skyRadiance(vec3 d) {
  vec3 c = skyClouds(d, skyBase(d));
  float sd = dot(d, SUN_V);
  float disc = smoothstep(0.99988, 0.99994, sd);
  // the low sun: a saturated HDR orange that ACES keeps orange (an additive white-hot disc
  // would read as a pale moon); redder at its lower edge, sinking into the haze
  float lowFade = smoothstep(-0.004, 0.035, d.y);
  vec3 sunCol = mix(vec3(2.3, 0.3, 0.05), vec3(2.6, 0.52, 0.09), lowFade);
  c = mix(c, sunCol, disc);
  return c;
}

vec3 hazeColor(vec3 d) {
  vec3 dd = normalize(vec3(d.x, max(d.y, 0.0) * 0.35 + 0.012, d.z));
  return skyBase(dd);
}

vec3 applyAtmos(vec3 col, vec3 rel, float camY) {
  float dist = length(rel);
  vec3 d = rel / max(dist, 1e-3);
  const float H = 420.0;
  float k = exp(-max(camY, 0.0) / H);
  float x = dist * d.y / H;
  float od = abs(x) < 1e-3 ? dist * k : H * k * (1.0 - exp(-x)) / d.y;
  float ext = 1.0 - exp(-od * fogDensity);
  return mix(col, hazeColor(d), ext);
}
`;

let patched = false;
export function patchFogChunks() {
  if (patched) return;
  patched = true;
  ShaderChunk.fog_pars_vertex = /* glsl */ `
#ifdef USE_FOG
  varying vec3 vFogRel;
#endif`;
  ShaderChunk.fog_vertex = /* glsl */ `
#ifdef USE_FOG
  vFogRel = (vec4(mvPosition.xyz, 0.0) * viewMatrix).xyz;
#endif`;
  ShaderChunk.fog_pars_fragment = /* glsl */ `
#ifdef USE_FOG
  uniform vec3 fogColor;
  uniform float fogDensity;
  varying vec3 vFogRel;
  ${ATMOS_GLSL}
#endif`;
  ShaderChunk.fog_fragment = /* glsl */ `
#ifdef USE_FOG
  gl_FragColor.rgb = applyAtmos(gl_FragColor.rgb, vFogRel, cameraPosition.y);
#endif`;
}

// Shared uniform so custom shaders follow scene.fog.density.
export const hazeUniform = { value: 1.25e-4 };
