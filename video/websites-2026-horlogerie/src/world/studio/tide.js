// BALANCIER studio: THE TIDE on materials. A material patched 'above' only draws the fragments above the
// wave line (the steel watch, the light studio's shadows); one patched 'below' only those under it (the
// sapphire twin). The test runs in screen space (gl_FragCoord against the line of wave.js), so the two
// twins meet exactly on the line, pixel for pixel, whatever their depth: steel keeps d ≥ 0, sapphire d < 0
// (no gap, no overlap). Each side adds a thin bright crest on its own edge of the seam, so the seam reads
// as the same light-catching water edge as the background's crest.
//
//   const tide = createTideUniforms();           // ONE object shared by the background, materials, shadows
//   patchTide(steelMaterial, 'above', tide);      // onBeforeCompile + customProgramCacheKey (chains old ones)
//   tide.uWipe.value = k;                         // the materials' line (0 = all steel … 1 = all sapphire)
//   tide.uTide.value = k;                         // the background's line (blue below)
//   setTideSize(tide, renderer) on every resize   // uRes = the drawing buffer in px, uPx = pixel ratio
//
// uWipe follows uTide during the tide; in 05 Restauration the integrator keeps uTide = 1 (blue) and runs
// uWipe 1 → 0: the line descends and the steel comes back from the top (the reverse wipe).
import * as THREE from 'three';
import { TIDE_GLSL } from './wave.js';

export function createTideUniforms() {
  return {
    uTide: { value: 0 }, // background line progress (0 light studio … 1 blue)
    uWipe: { value: 0 }, // material line progress (0 steel … 1 sapphire)
    uTime: { value: 0 }, // s, the ripple
    uRes: { value: new THREE.Vector2(1280, 720) }, // drawing-buffer px
    uPx: { value: 1 }, // device px per CSS px (crest widths)
    uCrest: { value: 1 }, // crest strength on the materials' seam (0 hides it)
    uNight: { value: 0 }, // 0 blue … 1 night blue (background; read by whoever needs it)
  };
}

export function setTideSize(uniforms, renderer) {
  renderer.getDrawingBufferSize(uniforms.uRes.value);
  uniforms.uPx.value = renderer.getPixelRatio();
}

// GLSL for a fragment shader: the uniforms + tideSide() / tideCrest() helpers
//   float d = tideD();              signed px distance to the materials' line (> 0 above)
export const TIDE_MATERIAL_GLSL = /* glsl */ `
${TIDE_GLSL}
uniform float uWipe;
uniform float uPx;
uniform float uCrest;
float tideD() { return tideDistPx(gl_FragCoord.xy, uWipe); }
`;

// side: 'above' keeps d >= 0, 'below' keeps d < 0. options.crest: crest strength multiplier for this
// material (default 1; opaque steel 0.9, sapphire 1.0, shadows 0).
export function patchTide(material, side = 'above', uniforms, { crest = 1 } = {}) {
  const above = side !== 'below';
  const prevCompile = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey ? material.customProgramCacheKey.bind(material) : () => '';
  material.userData.tideSide = above ? 'above' : 'below';
  material.onBeforeCompile = (shader, renderer) => {
    if (prevCompile && prevCompile !== THREE.Material.prototype.onBeforeCompile) prevCompile.call(material, shader, renderer);
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uRes = uniforms.uRes;
    shader.uniforms.uWipe = uniforms.uWipe;
    shader.uniforms.uPx = uniforms.uPx;
    shader.uniforms.uCrest = uniforms.uCrest;
    let fs = shader.fragmentShader;
    const head = `${TIDE_MATERIAL_GLSL}\nvoid main() {\n  float tideDist = tideD();\n  if (tideDist ${above ? '<' : '>='} 0.0) discard;\n`;
    fs = fs.replace(/void\s+main\s*\(\s*\)\s*\{/, head);
    // the crest on this side of the seam, added at the very end in display space (like the background's)
    const end = fs.lastIndexOf('}');
    const crestGlsl = above
      // steel: a hairline of light on the top edge (1.1 css px) + a short soft bloom
      ? `  { float cd = tideDist / uPx; float c = exp(-cd * cd / 1.2) * 0.85 + exp(-cd / 5.0) * 0.12;
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), clamp(c * uCrest * ${crest.toFixed(3)}, 0.0, 1.0)); }\n`
      // sapphire: the bright edge + the lit band just under the line (premultiplied: add colour and alpha)
      : `  { float cd = -tideDist / uPx; float c = exp(-cd * cd / 1.4) * 0.9 + exp(-cd / 7.0) * 0.22;
      c *= uCrest * ${crest.toFixed(3)}; gl_FragColor.rgb += vec3(0.85, 0.93, 1.0) * c; gl_FragColor.a = min(1.0, gl_FragColor.a + c * 0.6); }\n`;
    fs = fs.slice(0, end) + crestGlsl + fs.slice(end);
    shader.fragmentShader = fs;
  };
  material.customProgramCacheKey = () => `${prevKey()}|tide-${above ? 'a' : 'b'}-${crest}`;
  material.needsUpdate = true;
  return material;
}

// patch every distinct material of a list of meshes once (e.g. watch.meshes(), side 'above')
export function patchTideMeshes(meshes, side, uniforms, opts) {
  const seen = new Set();
  for (const m of meshes) {
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      if (!mat || seen.has(mat) || mat.userData.tideSide) continue;
      seen.add(mat);
      patchTide(mat, side, uniforms, opts);
    }
  }
  return seen.size;
}
