// Small shared helpers of the shell (no DOM, no three).
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
// quintic ease (C2): also the « minimum jerk » profile of a human hand move (tour cursor)
export const ease5 = (k) => k * k * k * (k * (k * 6 - 15) + 10);
export const easeInOut3 = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const easeInOutSine = (k) => -(Math.cos(Math.PI * k) - 1) / 2;

// CSS-like cubic-bezier(x1, y1, x2, y2) easing, so the JS-driven values and the CSS transitions
// of the shell share the same curves
export function bezier(x1, y1, x2, y2) {
  const ax = 3 * x1 - 3 * x2 + 1, bx = 3 * x2 - 6 * x1, cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1, by = 3 * y2 - 6 * y1, cy = 3 * y1;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const e = sx(t) - x, d = dx(t);
      if (Math.abs(e) < 1e-5) break;
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    t = clamp(t);
    // a few bisection steps when Newton wandered (flat ends of the curve)
    if (Math.abs(sx(t) - x) > 1e-4) {
      let lo = 0, hi = 1;
      for (let i = 0; i < 24; i++) {
        t = (lo + hi) / 2;
        if (sx(t) < x) lo = t; else hi = t;
      }
    }
    return sy(t);
  };
}

// exponential approach, frame-rate independent (tau = time constant in s)
export const approach = (x, target, dt, tau) => (tau <= 0 || dt >= 0.5 ? target : x + (target - x) * (1 - Math.exp(-dt / tau)));

// critically damped spring step (Unity-style SmoothDamp): o = { x, v }, returns o.x
export function damp(o, target, dt, smoothTime) {
  if (dt >= 0.5 || smoothTime <= 0) {
    o.x = target;
    o.v = 0;
    return o.x;
  }
  const w = 2 / smoothTime, x = w * dt;
  const e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = o.x - target;
  const temp = (o.v + w * change) * dt;
  o.v = (o.v - w * temp) * e;
  o.x = target + (change + temp) * e;
  return o.x;
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
