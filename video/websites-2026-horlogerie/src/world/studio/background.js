// BALANCIER studio: the full-screen background, drawn first (one draw call, depthTest / depthWrite off).
//   - the light studio: a very soft radial sweep #eceef0 → #dfe2e6 (a little lighter where the watch
//     sits) and the faintest floor horizon (a cyclorama);
//   - the blue: a deep « bleu acier » gradient #183a8c → #0b1f4d, a soft vignette, a lit floor glow low on
//     the screen (what glass needs behind it to read), a slow, subtle light play;
//   - the night variant (steel on blue, 05 Restauration): the same, darker and colder;
//   - THE TIDE: the wave line of wave.js; below it the blue, above it the light studio, a thin bright crest
//     on the line (a light catching a water edge) and a soft lit gradient just under it.
//
//   const bg = createBackground({ uniforms });   // uniforms = createTideUniforms() (shared with materials)
//   scene.add(bg.mesh);                          // renderOrder -1000, frustumCulled false
//   bg.update({ tide, time, mode, night });      // every frame; mode 'studio' | 'blue' | 'night' sets
//                                                // defaults (tide 0 / 1 / 1, night 0 / 0 / 1), explicit
//                                                // tide / night override them
//   bg.resize(renderer)                          // after every renderer.setSize / setPixelRatio
// Colours are exact on screen: computed in sRGB, not tone mapped (layout.js COLORS).
import * as THREE from 'three';
import { COLORS } from '../layout.js';
import { TIDE_GLSL, tideY, tideCssY } from './wave.js';
import { setTideSize, createTideUniforms } from './tide.js';

export { tideY, tideCssY };

const srgb = (hex) => new THREE.Color().setStyle(hex, THREE.SRGBColorSpace).getRGB(new THREE.Color(), THREE.SRGBColorSpace);
const v3 = (hex) => { const c = srgb(hex); return new THREE.Vector3(c.r, c.g, c.b); };

const vert = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const frag = /* glsl */ `
${TIDE_GLSL}
uniform float uTide;
uniform float uNight;
uniform float uPx;
uniform float uCrest;
uniform float uStudioHorizon;
uniform vec3 cStudio, cStudioEdge, cStudioHi, cBlue, cBlueDeep, cGlow, cNightDeep, cNight, cFloor;

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 toLinear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uRes;                       // 0..1, y up
  float aspect = uRes.x / uRes.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);     // centred, units of screen height

  // ---- light studio: soft radial sweep, centre a little lighter, slightly above the middle
  float r = length((uv - vec2(0.5, 0.55)) * vec2(aspect * 0.55, 1.0));
  vec3 studio = mix(cStudioHi, cStudio, smoothstep(0.0, 0.34, r));
  studio = mix(studio, cStudioEdge, smoothstep(0.26, 0.8, r));
  // the faintest floor horizon (cyclorama): a soft darker seam, the floor a touch lighter towards the viewer
  float hz = uv.y - uStudioHorizon;
  studio *= 1.0 - 0.016 * exp(-hz * hz / 0.0035) - 0.01 * smoothstep(0.0, -0.25, hz) + 0.012 * smoothstep(-0.1, -0.45, hz);

  // ---- blue: deep gradient, lit floor glow low on the screen, vignette, slow light play
  float g = smoothstep(1.05, 0.0, uv.y);
  vec3 blueDay = mix(cBlueDeep, cBlue, g * 0.92);
  vec3 blueNight = mix(cNightDeep, cNight, g * 0.9);
  vec3 blue = mix(blueDay, blueNight, uNight);
  // floor glow: a wide soft ellipse under the centre (lighter steel blue)
  float fg = exp(-pow((uv.y - 0.06) / 0.26, 2.0)) * exp(-pow(p.x / (0.75 * aspect), 2.0));
  blue = mix(blue, cFloor, fg * mix(0.42, 0.28, uNight));
  // slow light play: two very broad drifting lobes
  float t = uTime;
  float play = sin(p.x * 2.1 + t * 0.19 + 1.3 * sin(p.y * 1.7 - t * 0.13)) * 0.5 + 0.5;
  play *= sin(p.y * 2.6 - t * 0.11 + 0.8 * sin(p.x * 1.3 + t * 0.07)) * 0.5 + 0.5;
  blue += cGlow * play * mix(0.045, 0.028, uNight) * (0.4 + 0.6 * g);
  // vignette
  float vr = length(p * vec2(0.82 / max(aspect, 1.0) * 1.5, 1.0));
  blue *= 1.0 - mix(0.26, 0.34, uNight) * smoothstep(0.45, 1.05, vr);

  // ---- the tide
  float d = tideDistPx(frag, uTide);           // px, > 0 above the line
  float below = 1.0 - smoothstep(-0.7 * uPx, 0.7 * uPx, d);
  vec3 col = mix(studio, blue, below);
  float on = step(0.0005, uTide) * step(uTide, 0.9995);
  // the lit water under the crest: a soft lighter gradient
  float under = below * exp(min(d, 0.0) / (0.085 * uRes.y));
  col += (cGlow * 0.55 + vec3(0.12)) * under * 0.3 * on;
  // a soft shade cast on the studio just above the line (the wave lifts off the floor)
  float shade = (1.0 - below) * exp(-max(d, 0.0) / (0.03 * uRes.y));
  col *= 1.0 - 0.07 * shade * on;
  // the crest: a 1 css px hairline of light + a short halo
  float cd = d / uPx;
  float core = exp(-cd * cd / 1.1);
  float halo = exp(-abs(cd) / 6.0);
  col = mix(col, vec3(1.0), clamp(core * 0.92 * uCrest, 0.0, 1.0) * on);
  col += vec3(0.55, 0.72, 1.0) * halo * 0.16 * uCrest * on;

  // dither (the studio sweep is a 13-level gradient across the screen)
  col += (hash12(frag + fract(t) * 37.0) - 0.5) / 255.0;
  gl_FragColor = vec4(toLinear(clamp(col, 0.0, 1.0)), 1.0);
  #include <colorspace_fragment>
}`;

export function createBackground({ uniforms = createTideUniforms() } = {}) {
  const own = {
    uNight: uniforms.uNight || { value: 0 },
    uStudioHorizon: { value: 0.3 },
    cStudio: { value: v3(COLORS.studio) },
    cStudioEdge: { value: v3(COLORS.studioEdge) },
    cStudioHi: { value: v3('#f3f4f6') },
    cBlue: { value: v3(COLORS.blue) },
    cBlueDeep: { value: v3(COLORS.blueDeep) },
    cGlow: { value: v3(COLORS.blueGlow) },
    cNightDeep: { value: v3('#050f2a') },
    cNight: { value: v3('#0f2862') },
    cFloor: { value: v3('#4a6fb8') },
  };
  const material = new THREE.ShaderMaterial({
    name: 'studio.background',
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: { uTide: uniforms.uTide, uTime: uniforms.uTime, uRes: uniforms.uRes, uPx: uniforms.uPx, uCrest: uniforms.uCrest, ...own },
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)); // one big triangle
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'studio.background';
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  mesh.matrixAutoUpdate = false;

  const MODES = { studio: [0, 0], blue: [1, 0], night: [1, 1] };
  function update({ tide, time, mode, night } = {}) {
    const m = MODES[mode] || null;
    if (tide !== undefined) uniforms.uTide.value = tide;
    else if (m) uniforms.uTide.value = m[0];
    if (night !== undefined) own.uNight.value = night;
    else if (m) own.uNight.value = m[1];
    if (time !== undefined) uniforms.uTime.value = time;
  }
  return {
    mesh,
    material,
    uniforms: { ...uniforms, ...own },
    update,
    resize(renderer) { setTideSize(uniforms, renderer); },
    // the line in CSS px at the screen centre (anchors().tide.y); -1 when it is off screen
    lineCssY(w, h) {
      const k = uniforms.uTide.value;
      if (k <= 0 || k >= 1) return -1;
      const y = tideCssY(w / 2, k, uniforms.uTime.value, w, h);
      return y < 0 || y > h ? -1 : y;
    },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}
