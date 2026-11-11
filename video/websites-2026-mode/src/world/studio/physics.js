// Small motion helpers of the studio: damped springs (the turns, the forward pull, the parting)
// and a pendulum hanging from a moving pivot (the hanger swinging on its hook). Every step
// treats dt >= SNAP as « snap »: the shell uses dt = 1 for its frozen stills (__set, __goto).
export const SNAP = 0.5;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
// 1 at d = 0, 0 from |d| >= 1, smooth (cosine) in between
export const bump = (d) => (Math.abs(d) >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * d));

// damped spring o = { x, v } toward target: w (rad/s) sets the speed, z the damping
// (z < 1 overshoots: z 0.65 with w 13 lands in ~0.3 s with ~7 % overshoot)
export function spring(o, target, dt, w, z) {
  if (dt >= SNAP) {
    o.x = target;
    o.v = 0;
    return o.x;
  }
  const n = Math.max(1, Math.ceil(dt * 240));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    o.v += (-w * w * (o.x - target) - 2 * z * w * o.v) * h;
    o.x += o.v * h;
  }
  return o.x;
}

// pendulum p = { a, v } (angle, rate) under gravity, driven by the pivot's acceleration along the
// swing direction (m/s², already scaled by a coupling: a hand carries the hanger and damps most
// of it). w = sqrt(g / L): a hanger with a garment has its centre of mass ~0.42 m under the hook,
// a 1.3 s period. The angle is clamped: a garment never flies up.
export function pendulum(p, drive, dt, w = 4.8, z = 0.13, max = 0.2) {
  if (dt >= SNAP) {
    p.a = 0;
    p.v = 0;
    return p.a;
  }
  const n = Math.max(1, Math.ceil(dt * 240));
  const h = dt / n;
  const w2 = w * w;
  for (let i = 0; i < n; i++) {
    const acc = -w2 * Math.sin(p.a) - 2 * z * w * p.v - (drive / 9.81) * w2 * Math.cos(p.a);
    p.v += acc * h;
    p.a += p.v * h;
  }
  if (Math.abs(p.a) > max) {
    p.a = Math.sign(p.a) * max;
    p.v *= 0.4;
  }
  return p.a;
}

// velocity and acceleration of a moving point from its positions, frame-rate independent and
// lightly smoothed (a raw second difference of eased values is noisy at 120 Hz)
export function tracker() {
  const t = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, ax: 0, ay: 0, az: 0, primed: false };
  t.step = (x, y, z, dt) => {
    if (dt >= SNAP || !t.primed || dt <= 0) {
      Object.assign(t, { x, y, z, vx: 0, vy: 0, vz: 0, ax: 0, ay: 0, az: 0, primed: true });
      return t;
    }
    const vx = (x - t.x) / dt, vy = (y - t.y) / dt, vz = (z - t.z) / dt;
    const k = 1 - Math.exp(-dt / 0.03);
    t.ax += ((vx - t.vx) / dt - t.ax) * k;
    t.ay += ((vy - t.vy) / dt - t.ay) * k;
    t.az += ((vz - t.vz) / dt - t.az) * k;
    Object.assign(t, { x, y, z, vx, vy, vz });
    return t;
  };
  return t;
}
