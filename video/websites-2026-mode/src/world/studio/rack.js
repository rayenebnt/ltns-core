// The rack: 8 garments on the rail, each turned ~70° away like on a real rail (fronts toward the
// key light), with a little natural variety. The focus (a float slot from the shell) turns the
// garment under it square to the camera with a spring (~0.3 s, slight overshoot), pulls it
// forward (its hook stays visually on the rail) and turns its neighbours a little; the
// neighbours part a few centimetres and sway as it passes. A fast sweep makes a wave: every
// garment's spring lags behind the hand and the hand brushes the hems along.
//
// Cut-through: a garment turned ~67° reaches up to ~0.43 m toward the camera on its right side
// (the widest, the oversized tee), so the focused one comes 0.48 m forward (its hook kept on the
// rail line by perspective) while the neighbours ease back, the left ones more (their near half
// points at the focus): at rest on any garment nothing crosses. Between two garments the stacking
// order of two neighbours has to flip, which a rigid pair cannot do without touching (~5 frames
// when the hand lands on a garment, before v4); the pull leads the turn to keep it short, and
// (v4) untangle() below makes the pair come apart along the rail before it flips: no touching.
// rackCuts() measures it; tools/harness-studio reports it.
import { N, slotX, SLOT, WALL_Z } from './layout.js';
import { spring, bump, clamp, smooth, SNAP } from './physics.js';

// tuning (exported for the cut-through scan in the harness tools)
export const TUNE = {
  fwd: 0.48, // m, the focused garment's pull toward the camera (+7 % on screen)
  // (v2: with the wider slots, the review's 0.36 / 0.10 measured worse in rackCuts (28 of 141
  // resting focus values instead of 14); 0.48 / 0.16 keeps the turning sleeves clear)
  fwdPow: 0.35, // z = fwd * w^fwdPow: < 1 leads the turn (it clears its neighbours first)
  backL: 0.16, // m, neighbours on the left ease back (their near sleeve points at the focus)
  backR: 0.05, // m, neighbours on the right
  backReach: 2.6, // slots
  part: 0.05, // m, near neighbours slide apart along the rail
  nbTurnL: 0.24, // left neighbours turn this share of the way toward the camera
  nbTurnR: 0.24,
  nbReach: 2.6,
  fwdReachL: 0.7, // a garment left of the focus gives up its pull sooner (its near half points right)
  pullW: 15.5, // forward pull spring (rad/s): a little ahead of the turn, it clears first
  settle: 1.8, // exponent of the world's own focus magnet (1 = none)
};
const TURN = { w: 13, z: 0.62 }; // the hover turn: ~0.3 s with ~7 % overshoot
const PULL = { w: 15.5, z: 0.86 }; // forward pull: a little ahead of the turn (it clears first)
// v4: the untangling of crossing pairs (see untangle in createRack). m: the gap kept between two
// garments (m, the hem and sleeve thickness the segments leave out); mx: how far apart along the
// rail two garments count as apart; perp: how far a garment swings out to let another through
// (rad, ~89°); push: how far it slides aside along the rail; back: how far it eases back;
// outTau: the time constant of that move (s); hold: how far a garment can be held back (m);
// wall: its far edge never goes further than this into the wall plane (m); maxWait: a swap that
// cannot clear in this time lets the focused garment through (a garment too wide for its room);
// fast: the hand's speed (slots/s) over which the untangling fades out (a very fast sweep: the
// old wave, several garments turned at once)
const UNT = { m: 0.015, mx: 0.005, perp: 1.55, push: 0.12, back: 0.1, outTau: 0.035, iters: 8, reach: 3, hold: 0.3, wall: -0.04, maxWait: 0.2, fast: [8, 11] };

// deterministic variety per slot (no Math.random: stills must repeat)
const hash = (i) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// extra rest turn (degrees) of the garments right of the centre (v3, second review: at least 6 of
// 7 wall gaps at rest). Turned away, a garment's near half points right and toward the camera;
// right of the lens axis, perspective pushes that half outward, so the right-hand garments look
// wider than the left-hand ones and touched (chest-band gaps 32, 39, 38, 16, 2, -4, -20 px at
// 1440 x 900). These few degrees open them (32, 39, 38, 20, 13, 12, 2 px), with the same hover
// cut-through count (tools: mode-shots/v3/tools/gapexp.mjs)
const RIGHT_TURN = [0, 0, 0, 0, 2, 3, 4, 5.5];

export function createRack(rigs) {
  for (const r of rigs) {
    // ~66°..75° away (up to ~79° on the right, above), the fronts toward the key light (upper
    // left); v2: a wider spread reads as garments hung by hand, and the sharper angle shows more
    // wall between them
    r.idleYaw = -(1.16 + 0.16 * hash(r.i + 1)) - ((RIGHT_TURN[r.i] || 0) * Math.PI) / 180;
    r.phase = hash(r.i + 11) * 6.283;
    r.yaw = { x: r.idleYaw, v: 0 };
    r.fwd = { x: 0, v: 0 };
    r.part = { x: 0, v: 0 };
    r.kickX = 0; // pending pendulum impulses (rad/s), consumed by the pose step
    r.kickZ = 0;
    r.prevYaw = r.idleYaw;
    r.yawVel = 0;
    r.w = 0; // focus weight, also the pick / draw priority
    r.partT = 0;
    r.fwdT = 0;
  }
  let prevFocus = -1;
  let spd = 0;

  // a second, gentle magnet on top of the shell's: between two garments the hand-over happens
  // over a narrower span of the pointer, so a hand resting near a boundary does not leave two
  // half-turned neighbours touching (see the cut-through note above)
  const settle = (x) => {
    if (x < 0) return x;
    const n = Math.round(x), d = x - n;
    return n + Math.sign(d) * 0.5 * Math.pow(Math.abs(2 * d), TUNE.settle);
  };

  // v4: no cut-through, « sortir puis tourner ». Top view, every garment is a segment (its widest
  // half width, at its pivot, turned by its yaw: the cuts metric below). Two garments whose
  // segments overlap along the rail keep their stacking order (who is in front) until they come
  // apart along the rail: only then can it flip. After the springs, a pair that would cut is
  // resolved on the less focused one, held further back; when the more focused one is behind
  // (the hand moved on), the one in front swings out square to the rail, slides aside and eases
  // back while the focused one waits, turned (it only stops turning in), until the way is clear,
  // then turns to the camera with its usual spring. At rest on a garment nothing touches: the
  // resting rack is unchanged; the focused garment's turn keeps its timing (~0.35 s to face).
  const order = new Map(); // pair key -> +1 (the left one in front) / -1 (the right one)
  const waits = new Map(); // pair key -> seconds a swap has been waiting
  const forced = new Set(); // pairs let through after waiting too long (until they part)
  const segOf = (r, o) => {
    const c = Math.cos(r.yaw.x), hw = r.garment.halfWidth;
    o.X = slotX(r.i) + r.part.x;
    o.Z = r.fwd.x;
    o.ex = Math.max(hw * c, 1e-6); // half extent along the rail
    o.ez = -hw * Math.sin(r.yaw.x); // z of the right end, from the pivot
    o.lo = o.X - o.ex;
    o.hi = o.X + o.ex;
    return o;
  };
  // z of the segment above x (clamped to its ends)
  const zOn = (o, x) => o.Z + clamp((x - o.X) / o.ex, -1, 1) * o.ez;
  const SA = {}, SB = {};
  // the gap (front minus back, metres) at the two ends of the overlap, or null when apart
  function gapOf(a, b, sign) {
    segOf(a, SA);
    segOf(b, SB);
    const x0 = Math.max(SA.lo, SB.lo), x1 = Math.min(SA.hi, SB.hi);
    if (x1 < x0 - UNT.mx) return null;
    const g0 = zOn(SA, x0) - zOn(SB, x0), g1 = zOn(SA, x1) - zOn(SB, x1);
    return sign === 0 ? (g0 + g1 > 0 ? 1 : -1) : sign > 0 ? Math.min(g0, g1) : -Math.max(g0, g1);
  }
  // held back by up to UNT.hold behind where its springs take it (never into the wall)
  function holdBack(r, by) {
    const zMin = Math.min(r.fwd.x, Math.max(r.fwdT - UNT.hold, WALL_Z + UNT.wall + r.garment.halfWidth * Math.abs(Math.sin(r.yaw.x))));
    r.fwd.x = Math.max(zMin, r.fwd.x - by);
    if (r.fwd.v > 0) r.fwd.v = 0;
  }
  // a swap held up too long (a garment too wide for the room it gets, against the wall): the
  // focused one goes through rather than wait (the old few frames of touching); true once given up
  const heldNow = new Set();
  function wait(key, dt) {
    if (forced.has(key)) return true;
    if (!heldNow.has(key)) {
      heldNow.add(key);
      waits.set(key, (waits.get(key) || 0) + (dt >= SNAP ? 0 : dt));
    }
    if (waits.get(key) <= UNT.maxWait) return false;
    forced.add(key);
    return true;
  }
  function untangle(dt, s) {
    const snap = dt >= SNAP;
    heldNow.clear();
    // a still (snapped pose) starts from the rest stacking: the same pose whatever came before
    if (snap) {
      order.clear();
      waits.clear();
      forced.clear();
    }
    for (let it = 0; it < UNT.iters; it++) {
      for (let gap = 1; gap <= UNT.reach; gap++) {
        for (let ia = 0; ia + gap < rigs.length; ia++) {
          const ib = ia + gap;
          const a = rigs[ia], b = rigs[ib], key = ia * 16 + ib;
          let sign = order.get(key) || 0;
          const g = gapOf(a, b, sign);
          if (g === null) {
            order.delete(key);
            forced.delete(key);
            continue;
          }
          if (!sign) {
            // a new overlap starts with the order it has; a still: the more focused one in
            // front, else the left one (the turned rack stacks like cards, fronts to the light)
            sign = snap ? (b.w > a.w + 1e-4 ? -1 : 1) : g;
            order.set(key, sign);
            continue;
          }
          const deficit = UNT.m - g;
          if (s <= 0) {
            // (off: the stacking order follows what is there)
            if (deficit > UNT.m) order.set(key, gapOf(a, b, 0));
            continue;
          }
          const front = sign > 0 ? a : b, back = sign > 0 ? b : a;
          // the pair has to swap: the one behind is the more focused (or, both as little, the
          // left one: at rest the turned rack stacks like cards, fronts toward the light)
          const swap = back.w > front.w + 1e-4 || (back.w > front.w - 1e-4 && back.i < front.i);
          // (a swap starts as soon as it is wanted, before they touch: the way clears in time)
          if (deficit <= 0 && !swap) continue;
          if (swap && deficit > 0 && wait(key, dt)) {
            order.set(key, -sign);
            continue;
          }
          if (!swap) {
            // the one behind gives way: held back
            holdBack(back, deficit * s);
            // (against the wall it cannot: then the more focused one waits behind it instead)
            if (front.w > back.w + 1e-4 && !forced.has(key)) {
              const g2 = gapOf(a, b, sign);
              if (g2 !== null && UNT.m - g2 > 1e-4 && !wait(key, dt)) order.set(key, -sign);
            }
          } else {
            // the more focused one is behind (the stacking order of the pair has to flip): the
            // one in front swings out of its way, square to the rail, and slides aside along it;
            // the one behind waits, turned, until they come apart along the rail
            const k = snap ? 1 : s * (1 - Math.exp(-dt / UNT.outTau));
            front.yaw.x += (-UNT.perp - front.yaw.x) * k;
            if (front.yaw.v > 0) front.yaw.v = 0;
            const dir = front.i < back.i ? -1 : 1;
            front.part.x += (front.partT + dir * UNT.push - front.part.x) * k;
            const cf = Math.cos(front.yaw.x) * front.garment.halfWidth;
            const sep = Math.abs(slotX(back.i) + back.part.x - slotX(front.i) - front.part.x);
            const cap = -Math.acos(clamp((sep - cf - UNT.mx) / back.garment.halfWidth, Math.cos(UNT.perp), 1));
            // (it does not turn away for it: it only stops turning in)
            const lim = snap ? cap : Math.max(cap, Math.min(back.prevYaw, back.yaw.x));
            if (deficit > 0 && back.yaw.x > lim) {
              back.yaw.x += (lim - back.yaw.x) * s;
              if (back.yaw.v > 0) back.yaw.v *= 1 - s;
            }
            // and the one in front eases back, as far as the wall lets it
            const zMin = WALL_Z + UNT.wall + front.garment.halfWidth * Math.abs(Math.sin(front.yaw.x));
            const zt = Math.max(Math.min(front.fwd.x, front.fwdT - UNT.back), Math.min(front.fwd.x, zMin));
            front.fwd.x += (zt - front.fwd.x) * k;
            if (front.fwd.v > 0) front.fwd.v = 0;
            const g2 = deficit > 0 ? gapOf(a, b, sign) : null;
            if (g2 !== null && UNT.m - g2 > 0) holdBack(back, (UNT.m - g2) * s);
          }
        }
      }
    }
    for (const key of waits.keys()) if (!heldNow.has(key)) waits.delete(key);
  }

  function step(state, dt) {
    const snap = dt >= SNAP;
    const f = settle(state.focus);
    const on = f >= 0 ? clamp(state.focusOn) : 0;
    let fv = 0; // slots per second
    if (!snap && dt > 0 && f >= 0 && prevFocus >= 0) fv = clamp((f - prevFocus) / dt, -40, 40);
    prevFocus = f;
    // v4: the hand's speed along the rack (slots/s, smoothed): a very fast sweep (> ~10 slots/s)
    // keeps the old wave, the garments let through (the untangling fades out from UNT.fast)
    spd = snap || f < 0 ? 0 : spd + (Math.abs(fv) - spd) * (1 - Math.exp(-dt / 0.2));
    // in the product view the rack keeps its focus on the active garment (where it goes back)
    for (const r of rigs) {
      const d = f >= 0 ? r.i - f : 99;
      const T = TUNE;
      const w = on * bump(d);
      const left = d < 0;
      const nb = on * bump(d / T.nbReach) * (1 - w);
      const nbBack = on * smooth(T.backReach + 0.5, 0.5, Math.abs(d)) * (1 - w);
      r.w = w;
      const yawT = r.idleYaw * (1 - w) * (1 - (left ? T.nbTurnL : T.nbTurnR) * nb);
      const wz = on * bump(left ? d / T.fwdReachL : d);
      const fwdT = T.fwd * Math.pow(wz, T.fwdPow) - (left ? T.backL : T.backR) * nbBack;
      const partT = T.part * on * clamp(d / 0.7, -1, 1) * bump(d / 2.4);
      spring(r.yaw, yawT, dt, TURN.w, TURN.z);
      spring(r.fwd, fwdT, dt, T.pullW, PULL.z);
      spring(r.part, partT, dt, 11, 0.8);
      r.partT = partT;
      r.fwdT = fwdT;
    }
    untangle(dt, 1 - smooth(UNT.fast[0], UNT.fast[1], spd));
    for (const r of rigs) {
      const d = f >= 0 ? r.i - f : 99;
      r.yawVel = snap ? 0 : (r.yaw.x - r.prevYaw) / Math.max(dt, 1e-4);
      r.prevYaw = r.yaw.x;
      if (snap) continue;
      // the hand sweeping along the rack brushes the hems in its direction (faster: more swing)
      if (fv) r.kickZ += 0.075 * Math.sign(fv) * Math.sqrt(Math.abs(fv)) * bump(d / 1.6) * dt * 12;
    }
    if (snap) return;
    // a garment turning brushes its neighbours aside with its sleeves
    for (const a of rigs) {
      const s = Math.abs(a.yawVel);
      if (s < 0.2) continue;
      for (const b of rigs) {
        const dd = b.i - a.i;
        if (!dd || Math.abs(dd) > 2) continue;
        b.kickZ += Math.sign(dd) * s * 0.5 * bump(dd / 1.6) * dt;
        b.kickX += s * 0.12 * bump(dd / 1.6) * dt;
      }
    }
  }

  // rack pivot of a garment (before the product blend): slot + parting along the rail, pulled
  // forward, and lowered so that its hook projects onto the rail line
  function pivot(r, fr, out) {
    const z = r.fwd.x;
    out.set(slotX(r.i) + r.part.x, fr.onRailY(z), z);
    return out;
  }

  return { step, pivot };
}

// Count the pairs of rack garments that cut through each other (top view: each garment is a
// segment of its widest half width, at its pivot, turned by its yaw; the hem swing is ignored).
// Used by the harness to check the spacing and the offsets.
export function rackCuts(rigs, poses) {
  let cuts = 0, worst = 0;
  const seg = (k) => {
    const p = poses[k], hw = rigs[k].garment.halfWidth * p.scale;
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
    // local +x goes to (cos yaw, -sin yaw) in (x, z)
    return [p.x - hw * c, p.z + hw * s, p.x + hw * c, p.z - hw * s];
  };
  for (let a = 0; a < rigs.length; a++) {
    if (poses[a].hidden) continue;
    for (let b = a + 1; b < rigs.length; b++) {
      if (poses[b].hidden) continue;
      const A = seg(a), B = seg(b);
      const d1 = cross(B, A[0], A[1]), d2 = cross(B, A[2], A[3]);
      const d3 = cross(A, B[0], B[1]), d4 = cross(A, B[2], B[3]);
      if (d1 * d2 < 0 && d3 * d4 < 0) {
        cuts++;
        worst = Math.max(worst, Math.min(Math.abs(d1), Math.abs(d2), Math.abs(d3), Math.abs(d4)));
      }
    }
  }
  return { cuts, worst: +worst.toFixed(4) };
}
const cross = (S, x, z) => (S[2] - S[0]) * (z - S[1]) - (S[3] - S[1]) * (x - S[0]);

export { SLOT, N };
