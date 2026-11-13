// BALANCIER studio: THE TIDE's wave line, one formula shared by JS (DOM anchors, header tone) and GLSL
// (background, material wipe, shadows), so that every layer follows exactly the same line.
//
//   y = tideY(xNdc, k, time, aspect)  → the line's screen y in NDC (−1 bottom … +1 top) at screen x xNdc
//   k = the line's progress 0..1: 0 = the line is below the bottom edge (crest and glow off-screen too),
//   0.5 = the line crosses the screen centre, 1 = above the top edge.
//   The shape is set in « screen half-heights » (xs = xNdc · aspect), so the wave keeps its proportions
//   at every window size: a gentle sum of three sines, amplitude AMP (NDC: 0.06 = 3 % of the screen height).
//
// Below the line: blue / sapphire. Above it: the light studio / steel.

export const TIDE = {
  margin: 0.24, // NDC beyond the edges at k = 0 / 1 (the wave amplitude + the crest's halo + the glow under it)
  amp: 0.06, // NDC
};

// the line's mean height (NDC) for a progress k
export const tideBase = (k) => -1 - TIDE.margin + k * (2 + 2 * TIDE.margin);

const W1 = [0.55, 1.15, 0.42, 0.3];
const W2 = [0.3, 2.35, -0.63, 1.7];
const W3 = [0.15, 4.3, 0.97, 4.1];

export function tideWave(xs, time) {
  return TIDE.amp * (W1[0] * Math.sin(W1[1] * xs + W1[2] * time + W1[3])
    + W2[0] * Math.sin(W2[1] * xs + W2[2] * time + W2[3])
    + W3[0] * Math.sin(W3[1] * xs + W3[2] * time + W3[3]));
}

export function tideY(xNdc, k, time, aspect) {
  return tideBase(k) + tideWave(xNdc * aspect, time);
}

// the line in CSS px (top-left origin) at CSS x = cssX, for a viewport w × h (the DOM side)
export function tideCssY(cssX, k, time, w, h) {
  const y = tideY((cssX / w) * 2 - 1, k, time, w / h);
  return (1 - (y + 1) / 2) * h;
}

// the progress k at which the line's mean height sits at the CSS y (inverse of tideBase, for choreography)
export const tideForCssY = (cssY, h) => ((1 - (cssY / h) * 2) + 1 + TIDE.margin) / (2 + 2 * TIDE.margin);

const f = (v) => (Number.isInteger(v) ? v.toFixed(1) : String(v));
const term = ([a, k, w, ph], fn, mul = 1) => `${f(a * mul)} * ${fn}(${f(k)} * xs + ${f(w)} * t + ${f(ph)})`;

// GLSL: the same formula. Needs the uniforms uTime (s) and uRes (drawing-buffer px).
//   tideDistPx(gl_FragCoord.xy, k) → signed distance in drawing-buffer px from the fragment to the line
//   (> 0 above the line, < 0 below), corrected for the line's slope (crisp, even-width crests).
export const TIDE_GLSL = /* glsl */ `
#ifndef TIDE_FUNCS
#define TIDE_FUNCS
uniform float uTime;
uniform vec2 uRes;
float tideBase(float k) { return -1.0 - ${f(TIDE.margin)} + k * ${f(2 + 2 * TIDE.margin)}; }
float tideWave(float xs, float t) {
  return ${f(TIDE.amp)} * (${term(W1, 'sin')} + ${term(W2, 'sin')} + ${term(W3, 'sin')});
}
float tideSlope(float xs, float t) {
  return ${f(TIDE.amp)} * (${term(W1, 'cos', W1[1])} + ${term(W2, 'cos', W2[1])} + ${term(W3, 'cos', W3[1])});
}
float tideDistPx(vec2 frag, float k) {
  vec2 ndc = frag / uRes * 2.0 - 1.0;
  float xs = ndc.x * uRes.x / uRes.y;
  float y = tideBase(k) + tideWave(xs, uTime);
  float s = tideSlope(xs, uTime);
  return (ndc.y - y) * 0.5 * uRes.y * inversesqrt(1.0 + s * s);
}
#endif
`;
