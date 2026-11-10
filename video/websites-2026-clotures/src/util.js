export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
// quintic ease (C2), used by the scroll tweens
export const ease5 = (k) => k * k * k * (k * (k * 6 - 15) + 10);

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
