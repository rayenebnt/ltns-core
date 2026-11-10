// The white stage: a plane just above the relief words that fades the table to plain white
// (written in the page colour exactly, no tone mapping), and the broad pale beige shaft of light
// that rises behind the bottle in the last chapter and settles behind the cap and the splash.
// One draw call, screen-space band.
import * as THREE from 'three';

export function createStage(pageColor) {
  // sRGB components written as they are (no tone mapping, no conversion): the exact page colour
  const hex = parseInt(pageColor.slice(1), 16);
  const c = { r: ((hex >> 16) & 255) / 255, g: ((hex >> 8) & 255) / 255, b: (hex & 255) / 255 };
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Vector3(c.r, c.g, c.b) },
      uBeige: { value: new THREE.Vector3(0.952, 0.902, 0.82) },
      uFade: { value: 0 },
      uBand: { value: 0 },
      uBandA: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uBeige;
      uniform float uFade;
      uniform float uBand;
      uniform float uBandA;
      uniform vec2 uRes;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec2 uv = gl_FragCoord.xy / uRes;
        vec2 q = vec2((uv.x - 0.5) * uRes.x / uRes.y, uv.y - 0.5);
        vec3 col = uColor;
        if (uBandA > 0.0) {
          // one broad soft shaft, edges rising to the right (about 18 degrees): it enters from
          // below and settles just under the cap, behind the ribbon
          vec2 n = normalize(vec2(-0.32, 1.0));
          float d = dot(q, n);
          float c0 = mix(-0.85, 0.08, uBand);
          float w = 0.21;
          float b1 = smoothstep(c0 - w - 0.035, c0 - w + 0.035, d) * (1.0 - smoothstep(c0 + w - 0.035, c0 + w + 0.035, d));
          b1 *= 0.82 + 0.18 * smoothstep(c0 - w, c0 + w, d);
          // a faint warm wash around the shaft
          float glow = exp(-pow((d - c0) / 0.5, 2.0)) * 0.12;
          col = mix(col, uBeige, clamp(b1 + glow, 0.0, 1.0) * uBandA);
        }
        // dither against banding on the soft edges
        col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
        gl_FragColor = vec4(col, uFade);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(300, 200), mat);
  mesh.name = 'stage';
  mesh.position.z = 1.62;
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  return {
    mesh,
    uniforms: mat.uniforms,
    set(fade, band, bandA, w, h) {
      mat.uniforms.uFade.value = fade;
      mat.uniforms.uBand.value = band;
      mat.uniforms.uBandA.value = bandA;
      mat.uniforms.uRes.value.set(w, h);
      mesh.visible = fade > 0.001;
    },
  };
}
