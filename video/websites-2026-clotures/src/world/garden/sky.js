// Sky: a full-screen triangle drawn after the opaque scene (early depth rejection keeps it
// cheap), with the ray rebuilt from the camera matrices so the same mesh also renders into the
// cube camera of the environment map. Blue gradient, Mie glow, a 2D cloud layer lit from the
// sun (fair-weather cumulus, a heavy overcast, or broken clouds after the storm), sun disc.
// The horizon colour is the haze colour of atmosphere.js, so far terrain melts into it.
import * as THREE from 'three';
import { HAZE_GLSL, HAZE_UNIFORMS } from './atmosphere.js';
import { noiseTexture } from './noisetex.js';

export function createSkyUniforms() {
  return {
    uZen: { value: new THREE.Vector3() },
    uMid: { value: new THREE.Vector3() },
    uMie: { value: new THREE.Vector3() },
    uGround: { value: new THREE.Vector3() },
    uCloudLit: { value: new THREE.Vector3() },
    uCloudShade: { value: new THREE.Vector3() },
    uCloud: { value: new THREE.Vector4(0.3, 1, 1, 0) },
    uCloudWind: { value: new THREE.Vector2() },
    uDisc: { value: new THREE.Vector3() },
    uEnvPass: { value: 0 },
    uNoise: { value: noiseTexture() },
    ...HAZE_UNIFORMS,
  };
}

const SKY_FRAG = /* glsl */ `
uniform vec3 uZen;
uniform vec3 uMid;
uniform vec3 uMie;
uniform vec3 uGround;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
uniform vec4 uCloud;     // cover, opacity, scale, overcast
uniform vec2 uCloudWind;
uniform vec3 uDisc;
uniform float uEnvPass;
uniform sampler2D uNoise;
${HAZE_GLSL}
varying vec3 vDir;

float cloudFbm(vec2 p) {
  float n = texture2D(uNoise, p * 0.37).r * 0.5;
  n += texture2D(uNoise, p * 0.41 + vec2(0.31, 0.17)).g * 0.26;
  n += texture2D(uNoise, p * 0.43 + vec2(0.71, 0.53)).b * 0.15;
  n += texture2D(uNoise, p * 0.47 + vec2(0.13, 0.91)).a * 0.09;
  return n;
}

vec3 skyBase(vec3 d) {
  float e = max(d.y, 0.0);
  vec3 c = mix(hazeColor(d), uMid, smoothstep(0.0, 0.34, pow(e, 0.85)));
  c = mix(c, uZen, smoothstep(0.22, 0.98, e));
  float sd = max(dot(d, hazeSun), 0.0);
  c += uMie * (0.22 * pow(sd, 4.0) + 0.55 * pow(sd, 22.0) + 2.2 * pow(sd, 360.0));
  if (d.y < 0.0) c = mix(hazeColor(d), uGround, 1.0 - smoothstep(-0.07, 0.0, d.y));
  return c;
}

// cloud colour (rgb) and opacity (a)
vec4 skyClouds(vec3 d) {
  if (d.y < 0.004) return vec4(0.0);
  // plane projection: ~1 unit = 1 km at a 1.4 km cloud base
  vec2 p = d.xz / (d.y + 0.035) * 1.4 * uCloud.z + uCloudWind;
  float n = cloudFbm(p);
  // large clear spells and cloudier areas
  float macro = texture2D(uNoise, p * 0.045 + vec2(0.37, 0.11)).r;
  float cover = clamp(uCloud.x + (macro - 0.5) * 0.7 * (1.0 - uCloud.w), 0.0, 1.0);
  float dens = smoothstep(1.0 - cover - 0.08, 1.0 - cover + 0.22, n);
  // self-shadowing: denser toward the sun = the side we see is in shade
  vec2 toSun = normalize(hazeSun.xz + vec2(1e-4, 0.0)) * 0.16;
  float n2 = cloudFbm(p + toSun);
  float lit = clamp(0.62 + (n - n2) * 5.5, 0.0, 1.0);
  // thick cores are darker, thin edges glow toward the sun (silver lining)
  float core = smoothstep(0.45, 1.0, dens);
  vec3 col = mix(uCloudShade, uCloudLit, lit * (1.0 - 0.45 * core));
  float sd = max(dot(d, hazeSun), 0.0);
  col += uMie * pow(sd, 6.0) * (1.0 - dens) * 3.0;
  // overcast: a continuous ceiling with heavier rolls and lighter seams
  float big = texture2D(uNoise, p * 0.11 + vec2(0.5, 0.2)).r;
  float roll = smoothstep(0.25, 0.8, big * 0.6 + n * 0.55);
  vec3 ovc = mix(uCloudLit, uCloudShade, roll);
  ovc = mix(ovc, uCloudLit * 1.15, smoothstep(0.75, 0.98, 1.0 - n) * 0.35);
  col = mix(col, ovc, uCloud.w);
  dens = mix(dens, 0.92 + 0.08 * roll, uCloud.w);
  // low clouds sink into the haze
  float low = smoothstep(0.03, 0.16, d.y);
  col = mix(hazeColor(d), col, mix(0.35, 1.0, low));
  return vec4(col, dens * uCloud.y * low);
}

void main() {
  vec3 d = normalize(vDir);
  vec3 c = skyBase(d);
  vec4 cl = skyClouds(d);
  c = mix(c, cl.rgb, cl.a);
  if (uEnvPass < 0.5) {
    float sd = dot(d, hazeSun);
    float disc = smoothstep(0.99995, 0.999975, sd);
    c = mix(c, uDisc, disc * (1.0 - cl.a * 0.97));
  }
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  // (the [2][x] terms keep the sky aligned when the projection is shifted)
  vec3 vd = vec3((position.x + projectionMatrix[2][0]) / projectionMatrix[0][0], (position.y + projectionMatrix[2][1]) / projectionMatrix[1][1], -1.0);
  vDir = (vec4(vd, 0.0) * viewMatrix).xyz;
  gl_Position = vec4(position.xy, 0.99999, 1.0);
}`;

function triangle() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
  return geo;
}

export function createSky(uniforms) {
  const mat = new THREE.ShaderMaterial({
    name: 'garden-sky',
    uniforms,
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    depthWrite: false,
    depthTest: true,
  });
  const mesh = new THREE.Mesh(triangle(), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1000; // after the opaque scene: hidden pixels are rejected by depth
  mesh.name = 'garden-sky';
  return mesh;
}

// Environment: the same sky (no sun disc) rendered into a small cube, then PMREM-filtered.
// bake(target) reuses `target` when given (no allocation while blending presets).
export function createEnvBaker(renderer, uniforms) {
  const envUniforms = { ...uniforms, uEnvPass: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    name: 'garden-sky-env',
    uniforms: envUniforms,
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    depthWrite: false,
    depthTest: false,
  });
  const scene = new THREE.Scene();
  const mesh = new THREE.Mesh(triangle(), mat);
  mesh.frustumCulled = false;
  scene.add(mesh);
  const cubeRT = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType, generateMipmaps: false, depthBuffer: false });
  const cubeCam = new THREE.CubeCamera(0.1, 10, cubeRT);
  const pmrem = new THREE.PMREMGenerator(renderer);
  return {
    bake(target = null) {
      cubeCam.update(renderer, scene);
      return pmrem.fromCubemap(cubeRT.texture, target);
    },
    dispose() {
      cubeRT.dispose();
      pmrem.dispose();
      mat.dispose();
    },
  };
}
