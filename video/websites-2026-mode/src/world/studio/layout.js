// The studio's measures and the camera framing.
// Units: metres, +y up, the camera looks down -z. The rail runs along x at y = 0, z = 0; the
// garments hang from it by their hook tips (their pivot); the wall is behind at WALL_Z.
//
// Composition (reference): the rail at ~30 % of the window height, spanning ~60 % of the width
// at 16:10 (a little less in wider windows, so the rack garments do not grow too tall); in the
// product view the garment's hook top at ~13 % and its hem at ~74 % of the height, centred at
// ~47 % of the width, the hang tags to the right of the hanger.
import * as THREE from 'three';
import { clamp } from './physics.js';

export const N = 8; // garments on the rack
export const SLOT = 0.21; // m between two hooks: enough for garments turned ~70° not to touch
export const RAIL_LEN = 2.36; // m, end cap to end cap
export const RAIL_R = 0.0125; // m, a 25 mm chrome tube (the hook curl is 27 mm inside)
export const RAIL_Y = 0;
export const PIVOT_Y = RAIL_Y + RAIL_R; // the hook tip rests on top of the tube
export const WALL_Z = -0.56; // the wall: the rack garments' far edges stay ~10 cm clear of it
export const FOV = 22; // vertical, degrees: a long-ish lens keeps the rail straight and calm

export const PRODUCT = {
  x: 0.47, // garment centre, fraction of the width
  top: 0.12, // hook top, fraction of the height from the top
  hem: 0.69, // hem (integration look-dev: 0.74 left the tee crowding the window; the reference
  // keeps air around the product and under the title stack)
  z: 0.12, // m: in front of the rail plane (and of the rack garments drifting away)
  arrowX: 0.095, // the ← → buttons, fraction of the width from each edge
};

export const slotX = (i) => (i - (N - 1) / 2) * SLOT;

export function createFraming(camera) {
  const f = { W: 1440, H: 900, aspect: 1.6, vh: 2.45, vw: 3.92, D: 6.3, cy: -0.49, railFrac: 0.6 };
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

  f.fit = (W, H) => {
    f.W = W;
    f.H = H;
    f.aspect = W / Math.max(1, H);
    // 60 % of the width at 16:10, ~56 % at 16:9, 50 % in very wide windows (Windows laptops
    // at 125 % scaling with the browser bars: ~2.1:1)
    f.railFrac = clamp(0.6 - 0.2 * (f.aspect - 1.6), 0.5, 0.62);
    f.vh = clamp(RAIL_LEN / (f.railFrac * f.aspect), 2.05, 3.6); // visible height at z = 0
    f.vw = f.vh * f.aspect;
    f.D = f.vh / (2 * tanHalf);
    f.cy = RAIL_Y - 0.2 * f.vh; // the rail 30 % from the top: 20 % above the centre
    camera.fov = FOV;
    camera.aspect = f.aspect;
    camera.near = 0.5;
    camera.far = f.D + 6;
    camera.position.set(0, f.cy, f.D);
    camera.lookAt(0, f.cy, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  };
  // the world point at depth z that projects to (fx, fy) (fractions of the window, top-left)
  f.at = (fx, fy, z) => {
    const s = (f.D - z) / f.D;
    return new THREE.Vector3((fx - 0.5) * f.vw * s, f.cy + (0.5 - fy) * f.vh * s, z);
  };
  // world height that spans a fraction of the window at depth z
  f.span = (frac, z) => frac * f.vh * ((f.D - z) / f.D);
  // y where a pivot at depth z must sit to project onto the rail line (a garment pulled toward
  // the camera keeps its hook visually on the rail)
  f.onRailY = (z) => f.cy + (PIVOT_Y - f.cy) * ((f.D - z) / f.D);
  const v = new THREE.Vector3();
  f.toScreen = (x, y, z) => {
    v.set(x, y, z).project(camera);
    return { x: ((v.x + 1) / 2) * f.W, y: ((1 - v.y) / 2) * f.H };
  };
  return f;
}
