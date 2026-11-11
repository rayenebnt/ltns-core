// The product view: where the shown garment hangs (centred at ~47 % of the width, hook top at
// ~13 %, hem at ~74 % of the height, square to the camera), how the opening carries it there
// from the rail (an arc toward the camera and a turn, so the travel reads as a hand taking it
// off the rail), the prev / next slide, and the 180° turn on the hook for DEVANT / DOS.
import * as THREE from 'three';
import { PRODUCT } from './layout.js';
import { spring, smooth, mix, clamp } from './physics.js';

const ARC_Y = 0.07; // m, lifted off the rail on the way
const ARC_Z = 0.3; // m, toward the camera on the way (passes in front of the rack)
const TURN = -0.42; // rad, extra turn half-way (swung round by the hand), back to square at the end
const DRIFT = 0.62; // m, the other garments drift outward along the rail while they fade
const SIDE = { w: 9.5, z: 0.42 }; // 180° turn: follows the shell's eased side with an overshoot

export function createProduct(rigs, fr) {
  const hero = rigs.find((r) => r.garment.product.hero) || rigs[1];
  const spanOf = (r) => r.garment.bounds.max.y - r.garment.hemY; // hook top to hem, local
  for (const r of rigs) r.sideYaw = { x: 0, v: 0 };

  // one scale per garment so that every hem lands on the same line (the title under it stays
  // put on prev / next), within -12 % / +16 % of the hero's (the short varsity needs +14 %)
  function scaleOf(r) {
    const want = fr.span(PRODUCT.hem - PRODUCT.top, PRODUCT.z);
    const sh = want / spanOf(hero);
    return clamp(want / spanOf(r), sh * 0.88, sh * 1.16);
  }
  // the product pivot (hook tip) of a garment, before any slide
  function pivot(r, out) {
    const s = scaleOf(r);
    const top = fr.at(PRODUCT.x, PRODUCT.top, PRODUCT.z);
    out.set(top.x, top.y - s * r.garment.bounds.max.y, PRODUCT.z);
    return s;
  }
  // slide distance of prev / next: one garment leaves the window as the other enters
  const slideDist = () => fr.vw * 0.62;

  function stepSide(state, dt) {
    for (const r of rigs) {
      const shown = r.i === state.active || (state.swap.k < 1 && r.i === state.swap.from);
      spring(r.sideYaw, shown ? state.side * Math.PI : 0, shown ? dt : 1, SIDE.w, SIDE.z);
    }
  }

  // compose the pose of garment r: rack pivot/yaw (from the rack springs) blended toward the
  // product pose with the view; returns { fade, hook (0 rack curl .. 1 facing), scale }
  const pp = new THREE.Vector3();
  function compose(r, state, rackPos, rackYaw, out) {
    const v = clamp(state.view);
    const sw = state.swap;
    const swapping = sw.k < 1 && sw.from !== sw.to;
    const isActive = r.i === state.active;
    const isOut = swapping && r.i === sw.from && !isActive;
    if (isActive || isOut) {
      const s = pivot(r, pp);
      let fade = 0;
      if (swapping) {
        if (isActive) {
          pp.x += sw.dir * slideDist() * (1 - sw.k);
          fade = 1 - smooth(0, 0.32, sw.k);
        } else {
          pp.x -= sw.dir * slideDist() * sw.k;
          fade = smooth(0.62, 0.97, sw.k);
        }
      }
      if (isOut) {
        out.pos.copy(pp);
        out.yaw = r.sideYaw.x;
        out.scale = s;
        out.fade = fade;
        out.hook = 1;
        return out;
      }
      const a = Math.sin(Math.PI * v);
      out.pos.set(mix(rackPos.x, pp.x, v), mix(rackPos.y, pp.y, v) + ARC_Y * a, mix(rackPos.z, pp.z, v) + ARC_Z * a);
      out.yaw = mix(rackYaw, r.sideYaw.x, v) + TURN * a * a;
      out.scale = mix(1, s, smooth(0, 1, v));
      out.fade = fade;
      out.hook = smooth(0.15, 0.7, v);
      return out;
    }
    // the rest of the rack drifts outward and fades (the far ones go a little further)
    const dir = Math.sign(r.i - state.active) || 1;
    const k = smooth(0, 1, v);
    out.pos.set(rackPos.x + dir * k * (DRIFT + 0.05 * Math.abs(r.i - state.active)), rackPos.y, rackPos.z - 0.08 * k);
    out.yaw = rackYaw + dir * 0.18 * k;
    out.scale = 1;
    out.fade = smooth(0.02, 0.62, v);
    out.hook = 0;
    return out;
  }

  return { scaleOf, pivot, compose, stepSide, slideDist };
}
