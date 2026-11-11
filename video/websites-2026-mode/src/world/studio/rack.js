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
// order of two neighbours has to flip, which a rigid pair cannot do without touching for a few
// frames (~5 frames when the hand lands on a garment); the pull leads the turn to keep it short.
// rackCuts() measures it; tools/harness-studio reports it.
import { N, slotX, SLOT } from './layout.js';
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
  }
  let prevFocus = -1;

  // a second, gentle magnet on top of the shell's: between two garments the hand-over happens
  // over a narrower span of the pointer, so a hand resting near a boundary does not leave two
  // half-turned neighbours touching (see the cut-through note above)
  const settle = (x) => {
    if (x < 0) return x;
    const n = Math.round(x), d = x - n;
    return n + Math.sign(d) * 0.5 * Math.pow(Math.abs(2 * d), TUNE.settle);
  };

  function step(state, dt) {
    const snap = dt >= SNAP;
    const f = settle(state.focus);
    const on = f >= 0 ? clamp(state.focusOn) : 0;
    let fv = 0; // slots per second
    if (!snap && dt > 0 && f >= 0 && prevFocus >= 0) fv = clamp((f - prevFocus) / dt, -40, 40);
    prevFocus = f;
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
