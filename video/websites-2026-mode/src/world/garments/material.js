// Materials of the wardrobe: MeshPhysicalMaterial patched with onBeforeCompile.
// - FABRIC: one material per garment (its own uniforms; the program is shared by all garments),
//   colours chosen in the shader from 6 slots x 2 variants (from/to) so the DYE can rise from the
//   hem to the collar (soft wavy front, darker wet band); prints, trims and relief come from the
//   garment's atlas (R ink, G trim/sleeve region, B relief, A wear); knit normals tile on top;
//   aPart selects body / rib / label / cord / metal. The SWING bend (hem lagging behind the
//   hanger's motion) is applied in the vertex shader, and in the shadow depth material too.
// - HANGER: lacquered beech with procedural grain + chrome hook that swivels (stays on the rail).
import * as THREE from 'three';
import { HOOK_H } from './outlines.js';

const SWING_VERT_HEAD = /* glsl */ `
attribute float aPart;
uniform vec4 uSwing; // x: hem bend toward +z (m), y: toward +x (m), z: twist (rad), w: top y
uniform vec4 uDye;   // x: k, y: hem y, z: top y, w: seed
varying float vPart;
varying vec3 vRest;
float rlSwingW(float y) {
  float t = clamp((uSwing.w - y) / max(uSwing.w - uDye.y, 0.1), 0.0, 1.3);
  return t * t;
}
mat2 rlRot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
`;
const SWING_VERT_BODY = /* glsl */ `
float rlW = rlSwingW(position.y);
transformed.xz = rlRot(uSwing.z * rlW) * transformed.xz;
transformed.z += uSwing.x * rlW;
transformed.x += uSwing.y * rlW;
vRest = position;
vPart = aPart;
`;

const FABRIC_FRAG_HEAD = /* glsl */ `
uniform sampler2D uAtlas;
uniform sampler2D uNoise;
uniform vec3 uColFrom[6];
uniform vec3 uColTo[6];
uniform vec4 uDye;
uniform vec4 uLook; // x wash, y heather (from), z heather (to), w relief strength
uniform vec4 uMat;  // x roughness, y sheen, z trim roughness, w trim sheen
uniform vec4 uRib;  // x rib mode (0 body, 1 trim, 2 stripes), y clearcoat on the trim region, z knit, w knit on trim
uniform vec2 uFade; // x: colour fade toward uFadeCol (1 = none), y: dissolve threshold (0 = none)
uniform vec3 uFadeCol;
float rlHash(vec2 p) { p = floor(p / 0.0016); return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
varying float vPart;
varying vec3 vRest;
varying vec2 vAtlasUv;
vec3 rlPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float fd) {
  vec3 vSigmaX = normalize(dFdx(surf_pos.xyz));
  vec3 vSigmaY = normalize(dFdy(surf_pos.xyz));
  vec3 R1 = cross(vSigmaY, surf_norm);
  vec3 R2 = cross(surf_norm, vSigmaX);
  float fDet = dot(vSigmaX, R1) * fd;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}
float rlLum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
`;

// colour: dye front, wash, heather, trims, prints, ribs, label, cords, metal
const FABRIC_COLOR = /* glsl */ `
float rlPart = floor(vPart + 0.5);
bool rlBody = rlPart < 0.5;
vec4 rlAt = texture2D(uAtlas, vAtlasUv);
if (!(rlBody || (rlPart > 1.5 && rlPart < 2.5))) rlAt = vec4(0.0, 0.0, 0.5, 0.0);
vec4 rlNz = texture2D(uNoise, vRest.xy * 1.6 + uDye.w);
// the dye front rises from the hem (h = 0) to the collar (h = 1)
float rlH = (vRest.y - uDye.y) / (uDye.z - uDye.y);
float rlWave = 0.016 * sin(vRest.x * 21.0 + uDye.w * 3.0) + 0.01 * sin(vRest.x * 53.0 - vRest.z * 70.0 + uDye.w) + 0.04 * (rlNz.a - 0.5);
float rlFront = mix(-0.12, 1.16, uDye.x);
float rlLevel = rlH + rlWave;
float rlDyed = 1.0 - smoothstep(rlFront - 0.026, rlFront + 0.026, rlLevel);
float rlWet = (uDye.x > 0.001 && uDye.x < 0.999) ? exp(-pow((rlFront - rlLevel - 0.035) / 0.045, 2.0)) : 0.0;
vec3 rlBodyC = mix(uColFrom[0], uColTo[0], rlDyed);
vec3 rlInkC = mix(uColFrom[1], uColTo[1], rlDyed);
vec3 rlTrimC = mix(uColFrom[2], uColTo[2], rlDyed);
// heather (gris chine): light and dark fibres
float rlHeather = mix(uLook.y, uLook.z, rlDyed);
float rlFib = texture2D(uNoise, vRest.xy * vec2(6.0, 9.0)).g;
rlBodyC *= mix(1.0, 0.7 + 0.62 * rlFib, rlHeather);
// garment-dyed wash: blotchy fading, lighter seams and edges (atlas A), a fine grain
float rlL = rlLum(rlBodyC);
vec3 rlFaded = mix(rlBodyC, vec3(rlL) * 1.25 + 0.035, 0.55);
// light colours barely show the wash (it would read as bleach blotches); dark ones fade to charcoal
float rlDark = pow(1.0 - clamp(rlL * 1.6, 0.0, 1.0), 0.8);
float rlWear = clamp(uLook.x * (0.2 + 0.8 * rlDark) * (0.5 * smoothstep(0.32, 1.0, rlNz.r) + 0.12 * (rlNz.b - 0.5)) + rlAt.a * (0.35 + 0.65 * uLook.x) * (0.4 + 0.6 * rlDark), 0.0, 1.0);
rlBodyC = mix(rlBodyC, rlFaded, rlWear);
rlBodyC *= 1.0 + (texture2D(uNoise, vRest.xy * 13.0).b - 0.5) * 0.06;
// light bodies (rose, jaune, blanc, bleu ciel...): their creases and sheen must keep the hue
float rlLight = smoothstep(0.15, 0.5, rlLum(rlBodyC));
// prints: cracked and faded on washed pieces (v2: the fade only on dark bodies: on the light
// ones a faded white print vanished into the colour, 1.6:1 on rose)
float rlInk = rlAt.r * (1.0 - uLook.x * 0.3 * rlDark * smoothstep(0.35, 0.9, rlNz.b));
// dark ink on a light body: the craquelure's hairlines, once smaller than a texel, filter into
// bright veins (a marble fill on jaune); fill them, the wear stays visible up close
if (rlLum(rlInkC) < rlLum(rlBodyC)) rlInk = max(rlInk, smoothstep(0.08, 0.45, rlAt.r));
vec3 rlCol = mix(rlBodyC, rlTrimC, rlAt.g);
rlCol = mix(rlCol, rlInkC, rlInk);
if (rlPart > 0.5 && rlPart < 1.5) {
  // rib knit: plain, trim colour, or varsity stripes across the band (uv.y)
  float v = vAtlasUv.y;
  vec3 r0 = mix(uColFrom[3], uColTo[3], rlDyed), r1 = mix(uColFrom[4], uColTo[4], rlDyed), r2 = mix(uColFrom[5], uColTo[5], rlDyed);
  vec3 stripes = r0;
  float aa = 0.012;
  stripes = mix(stripes, r1, smoothstep(0.56 - aa, 0.56 + aa, v) - smoothstep(0.68 - aa, 0.68 + aa, v));
  stripes = mix(stripes, r2, smoothstep(0.76 - aa, 0.76 + aa, v) - smoothstep(0.86 - aa, 0.86 + aa, v));
  rlCol = uRib.x < 0.5 ? rlBodyC * 0.93 : (uRib.x < 1.5 ? rlTrimC : stripes);
  rlInk = 0.0;
} else if (rlPart > 1.5 && rlPart < 2.5) {
  // woven label: off-white with dark lettering
  rlCol = mix(vec3(0.82, 0.8, 0.76), vec3(0.03), rlAt.r);
  rlInk = 0.0;
} else if (rlPart > 2.5 && rlPart < 3.5) {
  rlCol = rlInkC * 0.92;
  rlInk = 0.0;
} else if (rlPart > 3.5) {
  rlCol = vec3(0.78, 0.78, 0.8);
  rlInk = 0.0;
}
rlCol *= 1.0 - 0.32 * rlWet;
// inside of the garment: no print, and in shadow where it is really seen: through the neck
// opening. (v2: darkened everywhere, the inside showing through pixel-wide cracks along the
// seams of the turned rack garments made salt-and-pepper specks on the light pieces)
float rlNeck = smoothstep(uDye.z - 0.17, uDye.z - 0.07, vRest.y);
if (!gl_FrontFacing) {
  if (rlBody) rlCol = mix(rlBodyC, rlTrimC, rlAt.g);
  rlCol *= mix(0.97, 0.5, rlNeck);
}
diffuseColor.rgb = rlCol;
`;

const FABRIC_NORMAL = /* glsl */ `
#ifdef USE_NORMALMAP_TANGENTSPACE
  vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
  float rlKs = rlBody ? mix(uRib.z, uRib.w, rlAt.g) * (1.0 - 0.75 * rlInk) : 0.0;
  // (v2: the stitches fade out once a pixel covers several of them: at grazing angles on the
  // rack they sparkled into salt-and-pepper specks on the white pieces)
  float rlKnitPx = length(fwidth(vNormalMapUv)) * 16.0; // stitches per pixel (16 per tile)
  rlKs *= clamp(2.0 - 0.8 * rlKnitPx, 0.3, 1.0);
  mapN.xy *= normalScale * rlKs;
  if (rlBody) {
    // low-frequency wrinkles of washed cotton: tall vertical creases (gravity), softer under prints
    // (v2: fewer and broader (7 -> 4 across), and mostly off on light bodies, where these
    // normal-only creases read as grey smudges: the real drape carries the folds there)
    vec2 wq = vRest.xy * vec2(4.0, 1.1) + uDye.w + 0.37;
    float w0 = texture2D(uNoise, wq).r;
    float wx = texture2D(uNoise, wq + vec2(0.02, 0.0)).r - w0;
    float wy = texture2D(uNoise, wq + vec2(0.0, 0.02)).r - w0;
    mapN.xy -= vec2(wx, wy * 0.4) * 0.55 * mix(1.0, 0.3, rlLight) * (1.0 - 0.6 * rlInk) * (1.0 - rlAt.g * 0.7);
  }
  if (rlPart > 0.5 && rlPart < 1.5) {
    // ribs: alternating wales along uv.x (metres), faded out when smaller than a pixel
    float period = 0.0029;
    float aaR = clamp(1.6 - fwidth(vAtlasUv.x) / period * 1.6, 0.0, 1.0);
    mapN.x += cos(vAtlasUv.x / period * 6.2831853) * 0.5 * aaR;
  }
  normal = normalize( tbn * mapN );
#endif
{
  // relief from the atlas: seams, stitches, raised prints (chenille, puff)
  vec2 rlDx = dFdx(vAtlasUv), rlDy = dFdy(vAtlasUv);
  float rlB0 = rlAt.b;
  float rlBx = texture2D(uAtlas, vAtlasUv + rlDx).b - rlB0;
  float rlBy = texture2D(uAtlas, vAtlasUv + rlDy).b - rlB0;
  // (v2: the relief (seams, stitches) fades out when the atlas is minified: its derivative of
  // sub-pixel lines is noise, specks along the edges of the resting rack garments)
  float rlTexPx = max(length(rlDx), length(rlDy)) * float(textureSize(uAtlas, 0).x);
  float rlRel = rlBody ? uLook.w * clamp(1.75 - 0.25 * rlTexPx, 0.3, 1.0) : 0.0;
  normal = rlPerturb(-vViewPosition, normal, vec2(rlBx, rlBy) * rlRel, faceDirection);
}
`;

const FABRIC_ROUGH = /* glsl */ `
roughnessFactor = mix(uMat.x, uMat.z, rlAt.g);
roughnessFactor = mix(roughnessFactor, 0.62, rlInk * 0.7);
if (rlPart > 0.5 && rlPart < 1.5) roughnessFactor = uMat.x;
if (rlPart > 2.5 && rlPart < 3.5) roughnessFactor = 0.75;
if (rlPart > 3.5) roughnessFactor = 0.24;
`;
const FABRIC_METAL = /* glsl */ `
metalnessFactor = rlPart > 3.5 ? 1.0 : 0.0;
`;
const FABRIC_SHEEN = /* glsl */ `
// a crack pixel shows the inside of the far panel, which the near one shadows: lift it to the
// outside's light (not through the neck, where the inside is seen and stays dark)
if (!gl_FrontFacing) totalEmissiveRadiance += rlCol * 0.5 * (1.0 - rlNeck);
#ifdef USE_SHEEN
  float rlSh = rlPart > 3.5 ? 0.0 : mix(uMat.y, uMat.w, rlAt.g) * (1.0 - 0.7 * rlInk);
  // (v2: the sheen toward grey greyed the light colours; on them it keeps the body's hue)
  material.sheenColor = mix(rlCol, vec3(rlLum(rlCol)) + 0.12, 0.5 * (1.0 - rlLight)) * rlSh * 1.6;
  material.sheenRoughness = 0.5;
#endif
#ifdef USE_CLEARCOAT
  material.clearcoat = rlBody ? uRib.y * rlAt.g : 0.0;
  material.clearcoatRoughness = 0.3;
#endif
`;

export function createFabricMaterial({ atlas, normalMap, noise, knitRepeat, look, clearcoat = 0 }) {
  const uniforms = {
    uAtlas: { value: atlas },
    uNoise: { value: noise },
    uColFrom: { value: Array.from({ length: 6 }, () => new THREE.Color()) },
    uColTo: { value: Array.from({ length: 6 }, () => new THREE.Color()) },
    uDye: { value: new THREE.Vector4(1, -0.9, -0.1, look.seed || 0) },
    uSwing: { value: new THREE.Vector4(0, 0, 0, -0.1) },
    uLook: { value: new THREE.Vector4(look.wash, 0, 0, look.relief) },
    uMat: { value: new THREE.Vector4(look.rough, look.sheen, look.trimRough ?? look.rough, look.trimSheen ?? look.sheen) },
    uRib: { value: new THREE.Vector4(look.ribMode || 0, clearcoat, look.knit, look.trimKnit ?? look.knit) },
    uFade: { value: new THREE.Vector2(1, 0) },
    uFadeCol: { value: new THREE.Color('#ececea').multiplyScalar(1.15) },
  };
  normalMap.repeat.set(knitRepeat[0], knitRepeat[1]);
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: look.rough,
    metalness: 0,
    sheen: 1,
    sheenRoughness: 0.5,
    sheenColor: 0xffffff,
    normalMap,
    normalScale: new THREE.Vector2(1, 1),
    side: THREE.DoubleSide,
    clearcoat,
    clearcoatRoughness: 0.3,
  });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + SWING_VERT_HEAD + '\nvarying vec2 vAtlasUv;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal.xz = rlRot(uSwing.z * rlSwingW(position.y)) * objectNormal.xz;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + SWING_VERT_BODY + '\nvAtlasUv = uv;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FABRIC_FRAG_HEAD)
      .replace('#include <color_fragment>', FABRIC_COLOR + '\n#include <color_fragment>')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + FABRIC_ROUGH)
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n' + FABRIC_METAL)
      .replace('#include <normal_fragment_maps>', FABRIC_NORMAL)
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n' + FABRIC_SHEEN)
      .replace('#include <alphahash_fragment>', 'if (uFade.y > 0.0 && rlHash(vRest.xy) < uFade.y) discard;')
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.rgb = mix(uFadeCol, gl_FragColor.rgb, uFade.x);');
  };
  mat.customProgramCacheKey = () => 'ruelle-fabric-3' + (clearcoat ? '-cc' : '');
  return { material: mat, uniforms, depth: swingDepthMaterial(uniforms) };
}

// shadow casters must bend like the garment, or the shadow tears away from the hem
function swingDepthMaterial(uniforms) {
  const make = (Base, opts) => {
    const m = new Base(opts);
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uSwing = uniforms.uSwing;
      shader.uniforms.uDye = uniforms.uDye;
      shader.uniforms.uFade = uniforms.uFade;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\n' + SWING_VERT_HEAD)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + SWING_VERT_BODY);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec2 uFade;\nvarying vec3 vRest;\nfloat rlHash(vec2 p) { p = floor(p / 0.0016); return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }')
        .replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\nif (uFade.y > 0.0 && rlHash(vRest.xy) < uFade.y) discard;');
    };
    m.customProgramCacheKey = () => 'ruelle-fabric-depth-2-' + Base.name;
    return m;
  };
  return {
    depth: make(THREE.MeshDepthMaterial, { depthPacking: THREE.RGBADepthPacking }),
    distance: make(THREE.MeshDistanceMaterial, {}),
  };
}

// --- hanger ---------------------------------------------------------------------------------

const HANGER_VERT_HEAD = /* glsl */ `
attribute float aPart;
uniform float uHookYaw;
varying float vPart;
varying vec3 vRest;
`;
const HANGER_VERT = /* glsl */ `
vRest = position;
vPart = aPart;
// swivel hook: the chrome above the bar keeps facing the rail whatever the garment's yaw
if (aPart > 0.5 && position.y > ${(-HOOK_H + 0.004).toFixed(4)}) {
  float c = cos(uHookYaw), s = sin(uHookYaw);
  transformed.xz = mat2(c, s, -s, c) * transformed.xz;
}
`;
const HANGER_FRAG_HEAD = /* glsl */ `
uniform sampler2D uNoise;
uniform vec2 uFade;
uniform vec3 uFadeCol;
float rlHash(vec2 p) { p = floor(p / 0.0016); return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
uniform vec4 uWood; // x seed, y hue shift, z grain contrast
varying float vPart;
varying vec3 vRest;
`;
const HANGER_COLOR = /* glsl */ `
bool hgMetal = vPart > 0.5;
vec3 hgCol;
{
  // beech: fine straight grain along the bar, a few darker rays, varied per hanger
  vec2 q = vec2(vRest.x * 1.4 + uWood.x, (vRest.y + vRest.z * 0.4) * 34.0 + uWood.x * 7.0);
  float n1 = texture2D(uNoise, q * vec2(0.6, 0.05)).a;
  float n2 = texture2D(uNoise, vec2(vRest.x * 9.0 + uWood.x, vRest.y * 60.0 + vRest.z * 30.0)).r;
  float grain = sin((vRest.y * 260.0 + vRest.z * 120.0 + n1 * 9.0) ) * 0.5 + 0.5;
  vec3 light = vec3(0.62, 0.40, 0.22) * (1.0 + uWood.y);
  vec3 dark = vec3(0.42, 0.23, 0.11) * (1.0 + uWood.y);
  hgCol = mix(light, dark, grain * uWood.z * 0.55 + n2 * 0.25);
}
if (hgMetal) hgCol = vec3(0.86, 0.86, 0.88);
diffuseColor.rgb = hgCol;
`;

export function createHangerMaterial({ noise, seed = 0, hue = 0 }) {
  const uniforms = {
    uNoise: { value: noise },
    uWood: { value: new THREE.Vector4(seed, hue, 0.8, 0) },
    uHookYaw: { value: 0 },
    uFade: { value: new THREE.Vector2(1, 0) },
    uFadeCol: { value: new THREE.Color('#ececea').multiplyScalar(1.15) },
  };
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.42, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.16 });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + HANGER_VERT_HEAD)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + HANGER_VERT);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + HANGER_FRAG_HEAD)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + HANGER_COLOR)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = vPart > 0.5 ? 0.13 : 0.45;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = vPart > 0.5 ? 1.0 : 0.0;')
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat = vPart > 0.5 ? 0.0 : 0.75;\n#endif')
      .replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\nif (uFade.y > 0.0 && rlHash(vRest.xy) < uFade.y) discard;')
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.rgb = mix(uFadeCol, gl_FragColor.rgb, uFade.x);');
  };
  mat.customProgramCacheKey = () => 'ruelle-hanger-2';
  return { material: mat, uniforms };
}
