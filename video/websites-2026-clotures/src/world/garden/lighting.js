// Uniforms and GLSL shared by the garden's custom shaders (ground, grass, leaves, hedge,
// billboards): the sun (direction toward it, colour x intensity), a two-colour sky/ground
// ambient matching the environment map, the sun's shadow map sampled by hand (any number of
// taps, also in vertex shaders), wetness, time and wind.
//
// The uniform objects are shared by reference between all these materials: one write per
// frame updates them all. The shadow map texture and matrix are three's own (the directional
// light's), so the custom shaders always see the shadow pass of the current frame.
import * as THREE from 'three';
import { noiseTexture } from './noisetex.js';
import { HAZE_UNIFORMS } from './atmosphere.js';

const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
white.needsUpdate = true;

export function createLightUniforms(sun) {
  return {
    uSunDir: { value: new THREE.Vector3(-0.5, 0.62, 0.6).normalize() },
    uSunCol: { value: new THREE.Vector3(4, 3.7, 3.3) },
    uAmbSky: { value: new THREE.Vector3(0.2, 0.27, 0.4) },
    uAmbGround: { value: new THREE.Vector3(0.05, 0.075, 0.03) },
    uShadowMap: { value: white },
    uShadowMatrix: { value: sun.shadow.matrix },
    // x: 1 / map size, y: unused, z: shadow strength (preset), w: 1 when a map exists
    uShadowInfo: { value: new THREE.Vector4(1 / 2048, 0, 1, 0) },
    uWet: { value: 0 },
    uTime: { value: 0 },
    uWind: { value: 0.6 },
    uNoise: { value: noiseTexture() },
    ...HAZE_UNIFORMS,
  };
}

// keep the custom shaders on the light's current shadow map (it is created lazily by
// three and re-created when its size changes)
export function syncShadowUniforms(u, sun) {
  const map = sun.shadow.map;
  if (map && map.texture) {
    u.uShadowMap.value = map.texture;
    u.uShadowInfo.value.x = 1 / sun.shadow.mapSize.x;
    u.uShadowInfo.value.w = 1;
  } else {
    u.uShadowMap.value = white;
    u.uShadowInfo.value.w = 0;
  }
}

export const LIGHT_GLSL = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform vec3 uAmbSky;
uniform vec3 uAmbGround;
uniform sampler2D uShadowMap;
uniform mat4 uShadowMatrix;
uniform vec4 uShadowInfo;
uniform float uWet;
uniform float uTime;
uniform float uWind;
uniform sampler2D uNoise;

#include <packing>
float g_unpackDepth(vec4 v) {
  return unpackRGBAToDepth(v); // three's RGBA depth packing
}
vec3 g_shadowCoord(vec3 wp) {
  vec4 sc = uShadowMatrix * vec4(wp, 1.0);
  return sc.xyz / sc.w;
}
float g_shadowTap(vec2 uv, float z) {
  return step(z, g_unpackDepth(texture2D(uShadowMap, uv)));
}
bool g_inShadowMap(vec3 c) {
  return uShadowInfo.w > 0.5 && c.x > 0.0 && c.x < 1.0 && c.y > 0.0 && c.y < 1.0 && c.z < 1.0;
}
// soft 12-tap Poisson PCF; radius in texels
float sunShadow(vec3 wp, float bias, float radius) {
  vec3 c = g_shadowCoord(wp);
  if (!g_inShadowMap(c)) return 1.0;
  float z = c.z - bias;
  vec2 t = vec2(uShadowInfo.x * radius);
  float s = 0.0;
  s += g_shadowTap(c.xy + vec2(-0.326, -0.406) * t, z);
  s += g_shadowTap(c.xy + vec2(-0.840, -0.074) * t, z);
  s += g_shadowTap(c.xy + vec2(-0.696, 0.457) * t, z);
  s += g_shadowTap(c.xy + vec2(-0.203, 0.621) * t, z);
  s += g_shadowTap(c.xy + vec2(0.962, -0.195) * t, z);
  s += g_shadowTap(c.xy + vec2(0.473, -0.480) * t, z);
  s += g_shadowTap(c.xy + vec2(0.519, 0.767) * t, z);
  s += g_shadowTap(c.xy + vec2(0.185, -0.893) * t, z);
  s += g_shadowTap(c.xy + vec2(0.507, 0.064) * t, z);
  s += g_shadowTap(c.xy + vec2(0.896, 0.412) * t, z);
  s += g_shadowTap(c.xy + vec2(-0.322, -0.933) * t, z);
  s += g_shadowTap(c.xy + vec2(-0.792, -0.598) * t, z);
  return mix(1.0, s / 12.0, uShadowInfo.z);
}
// cheap 4-tap version (vertex shaders, foliage)
float sunShadow4(vec3 wp, float bias, float radius) {
  vec3 c = g_shadowCoord(wp);
  if (!g_inShadowMap(c)) return 1.0;
  float z = c.z - bias;
  vec2 t = vec2(uShadowInfo.x * radius);
  float s = g_shadowTap(c.xy + vec2(-0.5, -0.2) * t, z) + g_shadowTap(c.xy + vec2(0.2, -0.5) * t, z)
          + g_shadowTap(c.xy + vec2(0.5, 0.2) * t, z) + g_shadowTap(c.xy + vec2(-0.2, 0.5) * t, z);
  return mix(1.0, s * 0.25, uShadowInfo.z);
}
vec3 hemiAmbient(vec3 n) {
  return mix(uAmbGround, uAmbSky, clamp(n.y * 0.5 + 0.5, 0.0, 1.0));
}
const float G_PI = 3.141592653589793;
`;
