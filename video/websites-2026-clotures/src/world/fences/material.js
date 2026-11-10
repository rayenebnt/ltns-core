// Fence materials: MeshStandardMaterial patched (onBeforeCompile) to animate merged elements
// on the GPU from per-vertex attributes (aPivot, aInfo, aAnim; see geom.js) and a few
// uniforms, with a matching depth material so the shadows follow the animation.
//
// Fades are dithered (interleaved gradient noise, discard): no sorting, no blending, and the
// same in the shadow pass. An element whose fade is 0 collapses onto its pivot (no fragments).
import * as THREE from 'three';
import { noiseTexture } from './textures.js';

// role ids (aInfo.y)
export const ROLE = {
  STATIC: 0,
  POST: 1, // install: rises out of its hole
  RAIL: 2, // install: drawn along the leg from the near post (aAnim.x: extra delay)
  BOARD: 3, // install: drops into place (aAnim.x: extra delay)
  CAP: 4, // install: cap rail, trim and post caps drop in
  MOUND: 5, // install: spoil heap + gravel, dug before the post, raked away at cleanup
  HOLE: 6, // install: open hole, from the dig to the concrete
  COLLAR: 7, // install: concrete collar after the post, settles flush at cleanup
  PROP: 8, // install: tools and materials, lifted away at cleanup (aAnim.x: order 0..1)
  FLAG: 9, // install: survey flags / tape (flutter: aAnim.y amplitude, aAnim.zw direction)
  DOT: 10, // install: paint dot, until the hole is dug
  STACK: 11, // install: board stack layer (aAnim.x: 0 bottom .. 1 top), used up by the boards
  STRING: 12, // install: string line, removed at cleanup
  INTACT: 20, // repair: only before the storm (chapters 1-2)
  STORM: 21, // repair: storm damage, lifted away in [aAnim.x, aAnim.x + aAnim.y] (aAnim.z: lift)
  FRESH: 22, // repair: new wood, drops in over [aAnim.x, aAnim.x + aAnim.y]
  OLDHW: 23, // repair: old hardware, until aAnim.x (and before the storm)
  NEWHW: 24, // repair: new hardware, pops in over [aAnim.x, aAnim.x + aAnim.y]
  STORMONLY: 25, // repair: litter, scuff (fades by aAnim.z over [aAnim.x, aAnim.x + aAnim.y])
};

// uniforms shared by every fence material (one write reaches all programs)
export function createSharedUniforms() {
  return {
    uTime: { value: 0 },
    // install windows: x start, y end, z duration of one element, w extra (see below)
    uWinPosts: { value: new THREE.Vector4(0.1, 0.36, 0.035, 0.022) }, // w: dig lead
    uWinRails: { value: new THREE.Vector4(0.36, 0.55, 0.03, 0) },
    uWinBoards: { value: new THREE.Vector4(0.55, 0.8, 0.03, 0) },
    uWinCap: { value: new THREE.Vector4(0.8, 0.88, 0.03, 0) },
    uWinClean: { value: new THREE.Vector4(0.84, 0.96, 0.035, 0) },
    // d -> build order: d in [0, x] takes the first 12 % of a window, [x, y] the rest
    uDMap: { value: new THREE.Vector2(14, 44) },
    uRepair: { value: 0 },
    uRepairOn: { value: 0 },
    uNoise: { value: noiseTexture() },
    uViewH: { value: 900 },
    // rigid attachments (aInfo.w = 4, 5, 6): the gate, the leaning post, the fallen branch
    uAttach: { value: [new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()] },
  };
}

const VERT_PARS = /* glsl */ `
attribute vec3 aPivot;
attribute vec4 aInfo;
attribute vec4 aAnim;
#ifdef FENCE_RM
attribute vec2 aRM;
varying vec2 vRM;
#endif
uniform float uTime;
uniform float uBuild;
uniform vec4 uWinPosts;
uniform vec4 uWinRails;
uniform vec4 uWinBoards;
uniform vec4 uWinCap;
uniform vec4 uWinClean;
uniform vec2 uDMap;
uniform vec4 uSweep;
uniform float uRepair;
uniform float uRepairOn;
uniform float uFade;
uniform vec3 uTintA;
uniform vec3 uTintB;
uniform float uViewH;
uniform mat4 uAttach[3];
varying float vFade;
varying vec3 vTint;
varying vec3 vFWorld;

float fe_lin(float a, float b, float x) { return clamp((x - a) / max(b - a, 1e-5), 0.0, 1.0); }
float fe_out(float t) { float u = 1.0 - t; return 1.0 - u * u * u; }
float fe_sm(float t) { return t * t * (3.0 - 2.0 * t); }
vec3 fe_tangent(float leg) {
  if (leg < 0.5) return vec3(0.0, 0.0, -1.0);
  if (leg < 1.5) return vec3(-1.0, 0.0, 0.0);
  if (leg < 2.5) return vec3(0.0, 0.0, 1.0);
  return vec3(1.0, 0.0, 0.0);
}
mat4 fe_attach(float leg) {
  if (leg < 4.5) return uAttach[0];
  if (leg < 5.5) return uAttach[1];
  return uAttach[2];
}

vec3 fenceAnim(vec3 p, out float fade) {
  float d = aInfo.x;
  float role = aInfo.y;
  float rnd = aInfo.z;
  float leg = aInfo.w;
  fade = 1.0;
  vec3 rel = p - aPivot;
  // build order along d: the first uDMap.x metres (behind the chapter 1 cameras) go quickly
  float s = d < uDMap.x ? 0.12 * max(d, 0.0) / uDMap.x : 0.12 + 0.88 * clamp((d - uDMap.x) / (uDMap.y - uDMap.x), 0.0, 1.0);
  float P = uBuild;
  if (role > 0.5 && role < 12.5) {
    float tPost = uWinPosts.x + s * (uWinPosts.y - uWinPosts.x - uWinPosts.z);
    if (role < 1.5) {
      // POST: rises out of its hole (aAnim.z: travel)
      float e = fe_lin(tPost, tPost + uWinPosts.z, P);
      p.y -= (1.0 - fe_out(e)) * aAnim.z;
      fade = e > 0.0 ? 1.0 : 0.0;
    } else if (role < 2.5) {
      // RAIL: drawn from the near post along the leg
      float t0 = uWinRails.x + s * (uWinRails.y - uWinRails.x - uWinRails.z) + aAnim.x;
      float e = fe_out(fe_lin(t0, t0 + uWinRails.z, P));
      vec3 t = fe_tangent(leg);
      p -= t * dot(rel, t) * (1.0 - e);
      fade = smoothstep(0.0, 0.1, e);
    } else if (role < 4.5) {
      // BOARD / CAP: drop into place
      vec4 W = role < 3.5 ? uWinBoards : uWinCap;
      float t0 = W.x + s * (W.y - W.x - W.z) + aAnim.x;
      float e = fe_lin(t0, t0 + W.z, P);
      float k = 1.0 - fe_out(e);
      p.y += k * k * (role < 3.5 ? 0.5 : 0.3);
      fade = smoothstep(0.0, 0.12, e);
    } else if (role < 7.5) {
      // MOUND / HOLE / COLLAR
      float tDig = tPost - uWinPosts.w;
      float dig = fe_lin(tDig, tDig + uWinPosts.w * 0.7, P);
      float tc = uWinClean.x + s * (uWinClean.y - uWinClean.x - uWinClean.z);
      float clean = fe_sm(fe_lin(tc, tc + uWinClean.z, P));
      if (role < 5.5) {
        float h = fe_out(dig) * (1.0 - clean);
        p = aPivot + vec3(rel.x * mix(0.6, 1.0, h), rel.y * h, rel.z * mix(0.6, 1.0, h));
        fade = h > 0.002 ? 1.0 : 0.0;
      } else if (role < 6.5) {
        float poured = fe_lin(tPost + uWinPosts.z * 0.8, tPost + uWinPosts.z * 1.4, P);
        fade = dig > 0.0 && poured < 1.0 ? 1.0 : 0.0;
      } else {
        float e = fe_out(fe_lin(tPost + uWinPosts.z * 0.8, tPost + uWinPosts.z * 1.6, P));
        p = aPivot + vec3(rel.x * mix(0.7, 1.0, e), rel.y * e * (1.0 - 0.55 * clean), rel.z * mix(0.7, 1.0, e));
        p.y -= 0.012 * clean;
        fade = e > 0.0 ? 1.0 : 0.0;
      }
    } else if (role < 8.5 || (role > 8.5 && role < 9.5) || role > 11.5) {
      // PROP / FLAG / STRING: lifted away one by one at cleanup
      float t0 = uWinClean.x + aAnim.x * (uWinClean.y - uWinClean.x - uWinClean.z);
      float e = fe_lin(t0, t0 + uWinClean.z, P);
      p.y += fe_sm(e) * 0.35;
      fade = 1.0 - fe_sm(e);
      if (role > 8.5 && role < 9.5) {
        // flutter: amplitude aAnim.y, direction aAnim.zw, growing away from the pivot
        float r = length(rel);
        float w = sin(uTime * 7.3 + rnd * 40.0 + r * 16.0) + 0.5 * sin(uTime * 12.1 + rnd * 17.0 + r * 31.0);
        p.xz += aAnim.zw * w * aAnim.y * r * r * 6.0;
        p.y += w * aAnim.y * r * r * 1.5;
      }
    } else if (role < 10.5) {
      // DOT: until its hole is dug
      fade = P < tPost - uWinPosts.w ? 1.0 : 0.0;
    } else {
      // STACK: the top layers go first while the boards go up
      float t0 = uWinBoards.x + (1.0 - aAnim.x) * (uWinBoards.y - uWinBoards.x - 0.02);
      float e = fe_lin(t0, t0 + 0.02, P);
      p.y += e * 0.25;
      fade = 1.0 - e;
      float tc = uWinClean.x + aAnim.y * (uWinClean.y - uWinClean.x - uWinClean.z);
      fade *= 1.0 - fe_lin(tc, tc + uWinClean.z, P);
    }
  } else if (role > 19.5) {
    float R = uRepair;
    if (role < 20.5) {
      fade = 1.0 - uRepairOn;
    } else if (role < 21.5) {
      float e = fe_lin(aAnim.x, aAnim.x + aAnim.y, R);
      float k = fe_sm(e);
      p.y += k * aAnim.z;
      p.x += k * aAnim.z * 0.25 * (rnd - 0.5);
      fade = uRepairOn * (1.0 - smoothstep(0.25, 1.0, e));
    } else if (role < 22.5) {
      float e = fe_lin(aAnim.x, aAnim.x + aAnim.y, R);
      float k = 1.0 - fe_out(e);
      p.y += k * 0.45;
      fade = uRepairOn * smoothstep(0.0, 0.35, e);
    } else if (role < 23.5) {
      float e = fe_lin(aAnim.x, aAnim.x + 0.03, R);
      fade = mix(1.0, 1.0 - e, uRepairOn);
    } else if (role < 24.5) {
      float e = fe_lin(aAnim.x, aAnim.x + aAnim.y, R);
      p = aPivot + rel * mix(0.55, 1.0, fe_out(e));
      fade = uRepairOn * smoothstep(0.0, 0.45, e);
    } else {
      float e = aAnim.y > 0.0 ? fe_lin(aAnim.x, aAnim.x + aAnim.y, R) : 0.0;
      fade = uRepairOn * (1.0 - e * aAnim.z);
    }
  }
  // rigid attachments (gate, leaning post, branch)
  if (leg > 3.5) p = (fe_attach(leg) * vec4(p, 1.0)).xyz;
  // chapter 2 sweep: the old type sinks, the new one rises, element by element along d
  if (abs(uSweep.y) > 0.5) {
    float jd = d + (fract(rnd * 7.31) - 0.5) * 1.6;
    if (uSweep.y > 0.0) {
      float e = clamp((uSweep.x - jd - uSweep.z * 0.55) / uSweep.z, 0.0, 1.0);
      p.y -= (1.0 - fe_out(e)) * uSweep.w;
      fade *= smoothstep(0.0, 0.15, e);
    } else {
      float e = clamp((uSweep.x - jd) / uSweep.z, 0.0, 1.0);
      p.y -= e * e * uSweep.w;
      fade *= 1.0 - smoothstep(0.75, 1.0, e);
    }
  }
  fade *= uFade;
  if (fade < 0.002) p = aPivot;
  return p;
}
`;

const VERT_MAIN = /* glsl */ `
#include <begin_vertex>
{
  float fFade;
  transformed = fenceAnim(transformed, fFade);
#ifdef FENCE_RIBBON
  // camera-facing line (string): aAnim.z side (+-1), aAnim.w half-width (m), never under ~0.7 px
  {
    vec3 wp = (modelMatrix * vec4(transformed, 1.0)).xyz;
    vec3 tl = fe_tangent(aInfo.w);
    vec3 toCam = cameraPosition - wp;
    float dist = length(toCam);
    vec3 side = normalize(cross(tl, toCam / dist));
    float px = dist * 2.0 / (projectionMatrix[1][1] * max(uViewH, 1.0));
    transformed += side * aAnim.z * max(aAnim.w, px * 0.7) * (fFade > 0.002 ? 1.0 : 0.0);
  }
#endif
  vFade = fFade;
  float h = fract(aInfo.z * 13.17 + 0.37);
  vTint = mix(uTintA, uTintB, h);
  vFWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
#ifdef FENCE_RM
  vRM = aRM;
#endif
}
`;

const FRAG_PARS = /* glsl */ `
varying float vFade;
varying vec3 vTint;
varying vec3 vFWorld;
#ifdef FENCE_RM
varying vec2 vRM;
#endif
uniform vec4 uGrime;
uniform sampler2D uNoise;
uniform float uGrunge;
float fe_ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
`;

const FRAG_DITHER = /* glsl */ `
if (vFade < 0.998 && vFade < fe_ign(gl_FragCoord.xy)) discard;
`;

function patchStandard(shader, mat, uniforms) {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\n' + VERT_PARS)
    .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nif (aInfo.w > 3.5) objectNormal = mat3(fe_attach(aInfo.w)) * objectNormal;')
    .replace('#include <begin_vertex>', VERT_MAIN);
  let fs = shader.fragmentShader.replace('#include <common>', '#include <common>\n' + FRAG_PARS);
  fs = fs.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + FRAG_DITHER);
  fs = fs.replace(
    '#include <color_fragment>',
    /* glsl */ `#include <color_fragment>
    diffuseColor.rgb *= vTint;
    // dirt / moss near the ground, a little large-scale variation
    diffuseColor.rgb *= mix(uGrime.rgb, vec3(1.0), smoothstep(0.0, uGrime.w, vFWorld.y));
    if (uGrunge > 0.0) {
      float gn = texture2D(uNoise, vFWorld.xz * 0.37 + vFWorld.y * 0.21).g * 0.6 + texture2D(uNoise, vFWorld.zy * 1.9 + vFWorld.x * 0.7).b * 0.4;
      diffuseColor.rgb *= 1.0 + (gn - 0.5) * uGrunge;
    }`,
  );
  if (mat.userData.foliage) {
    // foliage cards: keep the (up-bent) normal on both faces instead of flipping it
    fs = fs.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''));
  }
  if (mat.defines && mat.defines.FENCE_RM !== undefined) {
    fs = fs.replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vRM.x;').replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vRM.y;');
  }
  shader.fragmentShader = fs;
}

function patchDepth(shader, uniforms) {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\n' + VERT_PARS)
    .replace('#include <begin_vertex>', VERT_MAIN);
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
varying float vFade;
varying vec3 vTint;
varying vec3 vFWorld;
uniform float uShadowHash;
float fe_ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }`,
    )
    .replace(
      '#include <clipping_planes_fragment>',
      `#include <clipping_planes_fragment>
if (vFade < 0.998 && vFade < fe_ign(gl_FragCoord.xy)) discard;
#ifdef USE_MAP
if (uShadowHash > 0.5 && texture2D(map, vMapUv).a < fe_ign(gl_FragCoord.yx + 3.7)) discard;
#endif`,
    );
}

// Creates a patched standard material plus its depth material.
// opts: MeshStandardMaterial params, plus tint: [colorA, colorB], grime: [r, g, b, height],
// grunge (0..), rm (per-vertex roughness/metalness), shadowHash (hashed alpha in shadows).
export function fenceMaterial(shared, opts = {}) {
  const { tint = [0xffffff, 0xffffff], grime = [1, 1, 1, 0.001], grunge = 0, rm = false, shadowHash = false, foliage = false, name = 'fence', ...params } = opts;
  const own = {
    uBuild: { value: 1 },
    uSweep: { value: new THREE.Vector4(0, 0, 6, 2) },
    uFade: { value: 1 },
    uTintA: { value: new THREE.Color(tint[0]) },
    uTintB: { value: new THREE.Color(tint[1]) },
    uGrime: { value: new THREE.Vector4(...grime) },
    uGrunge: { value: grunge },
    uShadowHash: { value: shadowHash ? 1 : 0 },
  };
  const uniforms = { ...shared, ...own };
  const mat = new THREE.MeshStandardMaterial(params);
  mat.name = name;
  mat.userData.foliage = foliage;
  if (rm) mat.defines = { ...(mat.defines || {}), FENCE_RM: '' };
  mat.onBeforeCompile = (shader) => patchStandard(shader, mat, uniforms);
  mat.customProgramCacheKey = () => 'fence-std' + (rm ? '-rm' : '') + (foliage ? '-leaf' : '');
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depth.name = name + '-depth';
  depth.onBeforeCompile = (shader) => patchDepth(shader, uniforms);
  depth.customProgramCacheKey = () => 'fence-depth';
  mat.userData.u = own;
  mat.userData.depth = depth;
  return mat;
}

// a mesh from a builder geometry and a fence material (shadow casting through the depth material)
export function fenceMesh(geometry, mat, { cast = true, receive = true, name = '' } = {}) {
  const m = new THREE.Mesh(geometry, mat);
  m.name = name || geometry.name;
  m.castShadow = cast;
  m.receiveShadow = receive;
  m.customDepthMaterial = mat.userData.depth;
  // vertices move (rise, drop, sweep): keep the bounds generous instead of exact
  if (geometry.boundingSphere) geometry.boundingSphere.radius += 2.5;
  return m;
}
