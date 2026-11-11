// Lawn and meadow colours shared by the ground shader and the grass blades, so the blades
// always match the ground they grow from (same noise, same mowing stripes).
// Needs uNoise (lighting.js). Works in vertex shaders (texture lookups at mip 0).
export const LAWN_GLSL = /* glsl */ `
// mowing stripes: bands 1.05 m wide parallel to the right leg of the fence (x = 9 is a band
// edge); +1 where the blades lean toward +z, -1 toward -z, soft edges of width w (in tri units)
float g_stripeTri(vec2 p) {
  // a gentle wander of the mower line
  float wob = sin(p.y * 0.23 + 1.7) * 0.06 + sin(p.y * 0.71) * 0.025;
  return 1.0 - 4.0 * abs(fract((p.x + wob - 9.0) / 1.05 * 0.5 + 0.25) - 0.5);
}
float g_stripeSign(float tri, float w) { return clamp(tri / w, -1.0, 1.0); }

// lawn albedo (linear) from the four noise layers
vec3 g_lawnColor(vec2 p, vec4 n1, vec4 n2, vec4 n3) {
  vec3 lawn = vec3(0.093, 0.15, 0.026);
  lawn = mix(lawn, vec3(0.125, 0.165, 0.032), smoothstep(0.55, 0.82, n1.r) * 0.85);  // drier, yellower
  lawn = mix(lawn, vec3(0.042, 0.104, 0.025), smoothstep(0.5, 0.8, n1.g) * 0.65);  // lusher, darker
  lawn *= 0.84 + 0.28 * n2.b + 0.18 * (n3.g - 0.5);
  lawn = mix(lawn, vec3(0.048, 0.11, 0.036), smoothstep(0.7, 0.86, n3.r) * 0.45);  // clover
  return lawn;
}
// how the stripe changes the colour seen from direction V (unit, surface to eye)
vec3 g_stripeTint(float sgn, vec3 V, float k) {
  vec2 vh = normalize(V.xz + vec2(1e-4));
  float lean = -sgn * vh.y; // > 0: blades lean away from the viewer (light band)
  vec3 tint = lean > 0.0 ? vec3(1.14, 1.12, 1.0) : vec3(0.87, 0.9, 0.95);
  return mix(vec3(1.0), tint, abs(lean) * k);
}
vec3 g_meadowColor(vec2 p, vec4 n1, vec4 n2, vec4 n3) {
  vec3 m = mix(vec3(0.1, 0.15, 0.036), vec3(0.17, 0.17, 0.066), smoothstep(0.5, 0.85, n2.r) * 0.4);
  m = mix(m, vec3(0.058, 0.115, 0.03), smoothstep(0.55, 0.8, n1.b) * 0.5);
  return m * (0.84 + 0.3 * n3.b);
}
vec4 g_n1(vec2 p) { return texture2D(uNoise, p * 0.0071 + vec2(0.13, 0.71)); }
vec4 g_n2(vec2 p) { return texture2D(uNoise, p * 0.031 + vec2(0.57, 0.29)); }
vec4 g_n3(vec2 p) { return texture2D(uNoise, p * 0.19 + vec2(0.21, 0.43)); }
`;
