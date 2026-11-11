// Photographic grade of the Cordeau world, applied inside three's tone-mapping step of every
// program (renderer.toneMapping = CustomToneMapping): no extra render pass, no render target.
//
//   ACES Filmic (exposure included), then in a gamma-2 space: richer greens, saturation, a
//   gentle S-curve, warm highlights and cool shadows (split toning), a touch of black lift,
//   and a soft vignette (gl_FragCoord against the drawing-buffer size).
//
// The parameters live in shared Float32Arrays (three keeps typed arrays by reference when it
// clones uniforms), so one write reaches every program. Built-in materials get them through
// ShaderLib (patched at import, before any material compiles); custom ShaderMaterials get them
// with gradeUniformsInto(scene) before their first render.
import { ShaderChunk, ShaderLib } from 'three';

export const GRADE = {
  // x: saturation, y: S-curve amount, z: warm highlights, w: cool shadows
  a: new Float32Array([0.98, 0.12, 0.7, 0.55]),
  // x: vignette strength, y: vignette start radius, z: green richness, w: black lift
  b: new Float32Array([0.16, 0.42, 0.12, 0.02]),
  // xy: drawing-buffer size in px, z: aspect weight of the vignette
  res: new Float32Array([1440, 900, 0.72, 0]),
};

export const GRADE_UNIFORMS = {
  gradeA: { value: GRADE.a },
  gradeB: { value: GRADE.b },
  gradeRes: { value: GRADE.res },
};

const GRADE_GLSL = /* glsl */ `
uniform vec4 gradeA;
uniform vec4 gradeB;
uniform vec4 gradeRes;
vec3 CustomToneMapping( vec3 color ) {
  vec3 c = ACESFilmicToneMapping( color );
  vec3 p = sqrt( max( c, vec3( 0.0 ) ) );
  // richer greens: foliage and lawn (green clearly above red and blue) gain a little
  // saturation and lean warm (yellow-green highlights, never cyan)
  float gm = clamp( ( p.g - max( p.r, p.b ) ) * 5.0, 0.0, 1.0 ) * gradeB.z;
  float l = dot( p, vec3( 0.2126, 0.7152, 0.0722 ) );
  p = mix( vec3( l ), p, gradeA.x + 0.12 * gm );
  p *= mix( vec3( 1.0 ), vec3( 1.025, 1.012, 0.93 ), gm );
  // gentle S-curve
  p = clamp( p, 0.0, 1.0 );
  p = mix( p, p * p * ( 3.0 - 2.0 * p ), gradeA.y );
  // split toning: warm highlights, cool deep shadows
  float l2 = dot( p, vec3( 0.2126, 0.7152, 0.0722 ) );
  float hi = smoothstep( 0.5, 0.95, l2 ), lo = 1.0 - smoothstep( 0.04, 0.42, l2 );
  p *= mix( vec3( 1.0 ), vec3( 1.0 + 0.05 * gradeA.z, 1.0 + 0.012 * gradeA.z, 1.0 - 0.06 * gradeA.z ), hi );
  p *= mix( vec3( 1.0 ), vec3( 1.0 - 0.035 * gradeA.w, 1.0 - 0.005 * gradeA.w, 1.0 + 0.05 * gradeA.w ), lo );
  p = p * ( 1.0 - gradeB.w ) + gradeB.w;
  // soft vignette
  vec2 q = gl_FragCoord.xy / max( gradeRes.xy, vec2( 1.0 ) ) - 0.5;
  q.x *= gradeRes.z * gradeRes.x / max( gradeRes.y, 1.0 );
  float v = smoothstep( gradeB.y, gradeB.y + 0.62, length( q ) );
  p *= 1.0 - gradeB.x * v * v;
  return clamp( p * p, 0.0, 1.0 );
}
`;

let patched = false;
export function patchGrade() {
  if (patched) return;
  patched = true;
  const stub = 'vec3 CustomToneMapping( vec3 color ) { return color; }';
  if (!ShaderChunk.tonemapping_pars_fragment.includes(stub)) {
    console.warn('[Cordeau] tone-mapping chunk not recognised: no grade');
    return;
  }
  ShaderChunk.tonemapping_pars_fragment = ShaderChunk.tonemapping_pars_fragment.replace(stub, GRADE_GLSL);
  for (const key of Object.keys(ShaderLib)) {
    const u = ShaderLib[key].uniforms;
    if (u) Object.assign(u, GRADE_UNIFORMS);
  }
}
patchGrade();

// custom ShaderMaterials of a scene: add the shared grade uniforms (before their first render)
export function gradeUniformsInto(root) {
  let n = 0;
  root.traverse((o) => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) {
      if (m && m.isShaderMaterial && !m.isRawShaderMaterial && m.uniforms && !m.uniforms.gradeA) {
        Object.assign(m.uniforms, GRADE_UNIFORMS);
        n++;
      }
    }
  });
  return n;
}
