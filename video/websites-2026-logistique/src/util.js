// Small shared helpers of the shell (no DOM state, no three).
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => {
  const t = b <= a ? (x >= b ? 1 : 0) : clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
// quintic ease (C2), used by the scroll tweens
export const ease5 = (k) => k * k * k * (k * (k * 6 - 15) + 10);
export const easeOut3 = (k) => 1 - Math.pow(1 - clamp(k), 3);

// linear approach with a maximum rate (units per second); dt >= 0.5 or rate <= 0 snaps
export const chase = (x, target, dt, rate) => {
  if (dt >= 0.5 || rate <= 0) return target;
  const d = target - x, s = rate * dt;
  return Math.abs(d) <= s ? target : x + Math.sign(d) * s;
};
// exponential approach, frame-rate independent (tau = time constant in s)
export const approach = (x, target, dt, tau) => (tau <= 0 || dt >= 0.5 ? target : x + (target - x) * (1 - Math.exp(-dt / tau)));

// deterministic integer hash -> [0, 1): the letter reveal's « random » characters (no
// Math.random at render time: a given seed, letter and flip always give the same character)
export function hash3(a, b, c) {
  let h = (Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Fritsch-Carlson monotone cubic interpolation (C1, no overshoot): points [[x, y], ...]
export function monotone(points) {
  const n = points.length;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  if (n === 1) return () => ys[0];
  const d = [];
  const m = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-9, xs[i + 1] - xs[i]));
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

// Writes a style only when the value changed (keeps the per-frame DOM cost tiny).
export function styler(el) {
  const cache = {};
  return (prop, value) => {
    if (cache[prop] === value) return;
    cache[prop] = value;
    if (prop.startsWith('--')) el.style.setProperty(prop, value);
    else el.style[prop] = value;
  };
}

// toggles a class only when it changes
export function toggler(el) {
  const cache = {};
  return (cls, on) => {
    on = !!on;
    if (cache[cls] === on) return;
    cache[cls] = on;
    el.classList.toggle(cls, on);
  };
}

export const f3 = (x) => (Math.abs(x) < 5e-4 ? '0' : x.toFixed(3));
export const f1 = (x) => (Math.abs(x) < 0.05 ? '0' : x.toFixed(1));
