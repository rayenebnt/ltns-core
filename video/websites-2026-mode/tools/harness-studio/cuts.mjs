// node tools/harness-studio/cuts.mjs : cut-through scan of the rack (no browser): every focus
// value at rest, sweeps with the shell's focus smoothing, and the hand landing on each garment.
// The half widths are the garments' (world.stats / garment.halfWidth at q=high).
import { createRack, rackCuts } from '../../src/world/studio/rack.js';
import { slotX } from '../../src/world/studio/layout.js';
const HW = [0.394, 0.471, 0.258, 0.377, 0.377, 0.387, 0.406, 0.387];
const rigs = HW.map((hw, i) => ({ i, garment: { halfWidth: hw } }));
const rack = createRack(rigs);
const poses = () => rigs.map((r) => ({ x: slotX(r.i) + r.part.x, z: r.fwd.x, yaw: r.yaw.x, scale: 1, hidden: false }));
let bad = [];
for (let f = 0; f <= 7.0001; f += 0.05) {
  rack.step({ focus: f, focusOn: 1 }, 1);
  const c = rackCuts(rigs, poses());
  if (c.cuts) bad.push(`${f.toFixed(2)}:${c.cuts}`);
}
console.log('static cuts at', bad.length, 'of 141 focus values:', bad.join(' '));
// dynamic: sweeps with the shell's focus smoothing
function sweep(from, to, dur) {
  rack.step({ focus: from, focusOn: 1 }, 1);
  const fo = { x: from, v: 0 }, dt = 1 / 60;
  let frames = 0, worst = 0;
  const n = Math.round((dur + 1.2) / dt);
  for (let i = 1; i <= n; i++) {
    const target = from + (to - from) * Math.min(1, (i * dt) / dur);
    const w = 2 / 0.085, x = w * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const ch = fo.x - target, tmp = (fo.v + w * ch) * dt;
    fo.v = (fo.v - w * tmp) * e;
    fo.x = target + (ch + tmp) * e;
    rack.step({ focus: Math.max(0, Math.min(7, fo.x)), focusOn: 1 }, dt);
    const c = rackCuts(rigs, poses());
    if (c.cuts) frames++;
    worst = Math.max(worst, c.cuts);
  }
  return `${frames}/${n} frames, worst ${worst}`;
}
// the hand lands on one garment (focus appears there) and stays
function land(i) {
  rack.step({ focus: -1, focusOn: 0 }, 1);
  let on = 0, frames = 0;
  for (let k = 0; k < 60; k++) {
    on = Math.min(1, on + (1 - on) * (1 - Math.exp(-(1 / 60) / 0.1)));
    rack.step({ focus: i, focusOn: on }, 1 / 60);
    if (rackCuts(rigs, poses()).cuts) frames++;
  }
  return frames;
}
console.log('sweep fast', sweep(0, 7, 0.45), '| slow', sweep(0, 7, 2.5), '| back', sweep(7, 1, 0.6), '| step 3->4', sweep(3, 4, 0.12));
console.log('land (frames with cuts of 60):', [0, 1, 2, 3, 4, 5, 6, 7].map(land).join(' '));
