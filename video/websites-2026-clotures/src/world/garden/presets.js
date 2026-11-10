// Lighting presets (linear HDR values; the renderer uses ACES Filmic).
//  ete       : summer late morning, sun from the left behind the hero camera, warm.
//  orage     : after the storm, overcast and cool, soft light, wet grass, no hard shadows.
//  eclaircie : the sun comes back through breaking clouds, onto the inner face of the old fence.
// setPreset(name, k) blends along the chain ete -> orage -> eclaircie:
//  ('ete')          summer
//  ('orage', k)     k = 0 summer ... 1 storm
//  ('eclaircie', k) k = 0 storm  ... 1 clearing
const norm = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};

const SUN_ETE = norm([-0.5, 0.62, 0.6]);
const SUN_ECL = norm([0.55, 0.55, 0.35]);

export const PRESETS = {
  ete: {
    sunDir: SUN_ETE,
    sunCol: [1.0, 0.92, 0.78],
    sunI: 5.5,
    shadow: 1.0,
    // sky: zenith, ~20 degrees, sun glow (Mie), ground seen in the environment
    zen: [0.05, 0.13, 0.37],
    mid: [0.17, 0.31, 0.58],
    mie: [0.55, 0.48, 0.38],
    ground: [0.05, 0.085, 0.025],
    hor: [0.5, 0.6, 0.72],
    glow: [0.78, 0.76, 0.7],
    // clouds: lit colour, shaded colour, [cover, opacity, scale, overcast]
    cloudLit: [1.35, 1.32, 1.26],
    cloudShade: [0.42, 0.5, 0.63],
    cloud: [0.3, 0.95, 0.4, 0.0],
    // ambient for the custom shaders (upper / lower hemisphere radiance)
    ambSky: [0.15, 0.2, 0.31],
    ambGround: [0.045, 0.068, 0.026],
    haze: [2.6e-4, 380, 0.95, 2.5],
    wet: 0.0,
    exposure: 0.92,
    env: 0.76,
    disc: [38, 35, 30],
    wind: 0.6,
  },
  orage: {
    sunDir: SUN_ECL,
    sunCol: [0.86, 0.9, 1.0],
    sunI: 0.25,
    shadow: 0.25,
    zen: [0.3, 0.33, 0.38],
    mid: [0.34, 0.37, 0.41],
    mie: [0.05, 0.05, 0.05],
    ground: [0.03, 0.04, 0.03],
    hor: [0.42, 0.44, 0.48],
    glow: [0.46, 0.48, 0.51],
    cloudLit: [0.46, 0.48, 0.52],
    cloudShade: [0.14, 0.15, 0.18],
    cloud: [1.0, 1.0, 0.75, 1.0],
    ambSky: [0.45, 0.48, 0.53],
    ambGround: [0.05, 0.062, 0.045],
    haze: [8e-4, 260, 0.97, 1.5],
    wet: 0.8,
    exposure: 1.95,
    env: 1.0,
    disc: [0, 0, 0],
    wind: 1.0,
  },
  eclaircie: {
    sunDir: SUN_ECL,
    sunCol: [1.0, 0.95, 0.88],
    sunI: 3.6,
    shadow: 1.0,
    zen: [0.045, 0.12, 0.35],
    mid: [0.14, 0.27, 0.53],
    mie: [0.5, 0.45, 0.38],
    ground: [0.045, 0.075, 0.03],
    hor: [0.45, 0.54, 0.66],
    glow: [0.74, 0.73, 0.69],
    cloudLit: [1.45, 1.42, 1.36],
    cloudShade: [0.22, 0.26, 0.34],
    cloud: [0.5, 1.0, 0.45, 0.0],
    ambSky: [0.22, 0.28, 0.39],
    ambGround: [0.045, 0.07, 0.03],
    haze: [1.6e-4, 380, 0.93, 2.5],
    wet: 0.7,
    exposure: 1.06,
    env: 1.0,
    disc: [38, 35, 30],
    wind: 0.7,
  },
};

const KEYS = Object.keys(PRESETS.ete);

function mix(a, b, k) {
  const out = {};
  for (const key of KEYS) {
    const x = a[key], y = b[key];
    if (Array.isArray(x)) out[key] = x.map((v, i) => v + (y[i] - v) * k);
    else out[key] = x + (y - x) * k;
  }
  out.sunDir = norm(out.sunDir);
  return out;
}

export function blendPreset(name, k = 1) {
  k = Math.max(0, Math.min(1, k));
  if (name === 'orage') return mix(PRESETS.ete, PRESETS.orage, k);
  if (name === 'eclaircie') return mix(PRESETS.orage, PRESETS.eclaircie, k);
  return mix(PRESETS.ete, PRESETS.ete, 0);
}
