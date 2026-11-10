// Small math helpers shared by the scene and the timeline.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
// quintic smoothstep: zero velocity AND acceleration at both ends (camera-like moves)
export const smoother = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// deterministic pseudo-random sequence
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fritsch-Carlson monotone cubic interpolation through [x, y] keys (C1, no overshoot)
export function monotone(points) {
  const n = points.length;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const d = [];
  const m = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m.push(d[0]);
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i], b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

// Ambient (image-based) light falls off toward the silhouette: printed cylinders turn like
// in a photograph instead of reading as flat stickers. Keeps direct light untouched.
export const EDGE_FALLOFF = [
  '#include <lights_fragment_end>',
  `#include <lights_fragment_end>
  reflectedLight.indirectDiffuse *= mix(0.5, 1.0, smoothstep(0.04, 0.85, dot(normal, geometryViewDir)));`,
];

// The studio environment has HDR softboxes (crisp, near-white reflections in the glass and the
// gold); its diffuse part is scaled per material so printed surfaces keep their exposure.
export const envDiffuse = (k) => [
  '#include <lights_fragment_maps>',
  `#include <lights_fragment_maps>
  iblIrradiance *= ${k.toFixed(3)};`,
];

// Inject GLSL into a built-in material (keeps three's PBR lighting, env map and lights).
// edits: { vertex: [[search, replace], ...], fragment: [[search, replace], ...] }, uniforms: {}
export function patchMaterial(material, { uniforms = {}, vertex = [], fragment = [], key = '' }) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    for (const [a, b] of vertex) {
      if (!shader.vertexShader.includes(a)) throw new Error(`patch: vertex chunk not found ${a}`);
      shader.vertexShader = shader.vertexShader.replace(a, b);
    }
    for (const [a, b] of fragment) {
      if (!shader.fragmentShader.includes(a)) throw new Error(`patch: fragment chunk not found ${a}`);
      shader.fragmentShader = shader.fragmentShader.replace(a, b);
    }
  };
  material.customProgramCacheKey = () => key || material.type + JSON.stringify(Object.keys(uniforms));
  material.userData.uniforms = uniforms;
  return material;
}
