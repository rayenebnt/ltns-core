// Aerial perspective shared by every material of the page.
//
// Importing this module patches three's fog chunks once (before anything compiles):
// with scene.fog set, any built-in material (the house, the fences, anything) fades with
// distance into the colour of the horizon sky in its own direction, brighter toward the
// sun. The haze is mixed in linear HDR before tone mapping (three applies its fog after
// tone mapping, so the patch moves it into the tone-mapping chunk).
//
// The haze parameters live in a few shared Float32Arrays: three clones the uniforms of
// every built-in material, but a typed array is copied by reference, so one write here
// reaches every program. Custom ShaderMaterials merge HAZE_UNIFORMS and use HAZE_GLSL.
import { ShaderChunk, ShaderLib } from 'three';

export const HAZE = {
  sun: new Float32Array([-0.5, 0.62, 0.6]), // direction toward the sun (world)
  hor: new Float32Array([0.7, 0.78, 0.86]), // horizon haze away from the sun (linear)
  glow: new Float32Array([0.95, 0.9, 0.8]), // horizon haze toward the sun
  // x: extinction per metre, y: height scale (m), z: max extinction, w: glow exponent
  params: new Float32Array([3e-4, 380, 0.96, 3.0]),
};

export const HAZE_UNIFORMS = {
  hazeSun: { value: HAZE.sun },
  hazeHor: { value: HAZE.hor },
  hazeGlow: { value: HAZE.glow },
  hazeParams: { value: HAZE.params },
};

export const HAZE_GLSL = /* glsl */ `
uniform vec3 hazeSun;
uniform vec3 hazeHor;
uniform vec3 hazeGlow;
uniform vec4 hazeParams;
vec3 hazeColor(vec3 d) {
  // azimuth only: 1 toward the sun, 0 away from it
  vec2 a = normalize(d.xz + vec2(1e-5, 0.0));
  vec2 s = normalize(hazeSun.xz + vec2(1e-5, 0.0));
  float g = 0.5 + 0.5 * dot(a, s);
  return mix(hazeHor, hazeGlow, pow(g, hazeParams.w));
}
float hazeAmount(vec3 rel, float camY) {
  float dist = length(rel);
  float dy = rel.y / max(dist, 1e-4);
  float H = hazeParams.y;
  float k = exp(-max(camY, 0.0) / H);
  float x = dist * dy / H;
  float od = abs(x) < 1e-3 ? dist * k : H * k * (1.0 - exp(-x)) / dy;
  return min(1.0 - exp(-od * hazeParams.x), hazeParams.z);
}
vec3 applyHaze(vec3 col, vec3 rel, float camY) {
  float e = hazeAmount(rel, camY);
  return mix(col, hazeColor(rel / max(length(rel), 1e-4)), e);
}
`;

let patched = false;
export function patchAtmosphere() {
  if (patched) return;
  patched = true;
  // every built-in material with fog uniforms gets the shared haze arrays
  for (const key of Object.keys(ShaderLib)) {
    const u = ShaderLib[key].uniforms;
    if (u && u.fogDensity) Object.assign(u, HAZE_UNIFORMS);
  }
  ShaderChunk.fog_pars_vertex = /* glsl */ `
#ifdef USE_FOG
  varying vec3 vHazeRel;
#endif`;
  ShaderChunk.fog_vertex = /* glsl */ `
#ifdef USE_FOG
  vHazeRel = (vec4(mvPosition.xyz, 0.0) * viewMatrix).xyz;
#endif`;
  ShaderChunk.fog_pars_fragment = /* glsl */ `
#ifdef USE_FOG
  #define HAZE_READY
  varying vec3 vHazeRel;
  ${HAZE_GLSL}
#endif`;
  ShaderChunk.fog_fragment = '';
  const tm = ShaderChunk.tonemapping_fragment;
  ShaderChunk.tonemapping_fragment = /* glsl */ `
#ifdef HAZE_READY
  gl_FragColor.rgb = applyHaze(gl_FragColor.rgb, vHazeRel, cameraPosition.y);
#endif
${tm}`;
}
patchAtmosphere();
