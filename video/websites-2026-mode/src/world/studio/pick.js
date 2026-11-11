// Picking and DOM anchors (WORLD CONTRACT).
// pick(ndcX, ndcY): in the rack view the continuous slot under the pointer inside the rack band
// (between garments too: the shell's magnet makes the hand-over smooth), in the product view the
// hang tags (exact cards) then the garment (its box). anchors(): CSS px, top-left origin.
import * as THREE from 'three';
import { N, SLOT, slotX, PIVOT_Y, PRODUCT } from './layout.js';
import { clamp } from './physics.js';
import { TUNE } from './rack.js';

export function createPicker({ camera, fr, rigs, product, getState, captionIndex }) {
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  // the rack's lowest hem (local, below the pivot): the bottom of the band and the caption line
  const lowHem = Math.min(...rigs.map((r) => r.garment.hemY));
  const edgeOf = (r) => Math.max(SLOT * 0.8, r.garment.halfWidth * 1.1 + 0.02);
  let edgeL = edgeOf(rigs[0]), edgeR = edgeOf(rigs[N - 1]);

  function onPlane(z) {
    const o = ray.ray.origin, d = ray.ray.direction;
    if (Math.abs(d.z) < 1e-6) return null;
    const t = (z - o.z) / d.z;
    return t > 0 ? v.set(o.x + d.x * t, o.y + d.y * t, z) : null;
  }

  function pick(nx, ny) {
    const st = getState();
    ndc.set(nx, ny);
    ray.setFromCamera(ndc, camera);
    if (st.view < 0.5) {
      const p = onPlane(0);
      if (!p) return null;
      // the band: from a little above the rail to just under the lowest hem, from half a slot
      // beyond the first hook to half a slot beyond the last one (the garments' turned width)
      if (p.y > PIVOT_Y + 0.07 || p.y < PIVOT_Y + lowHem - 0.05) return null;
      // (v2, ux review: the end garments, facing the camera, reach beyond 0.8 slot: their outer
      // sleeve released them; the band now covers their facing silhouette, pulled forward)
      if (p.x < slotX(0) - edgeL || p.x > slotX(N - 1) + edgeR) return null;
      const slot = clamp((p.x - slotX(0)) / SLOT, 0, N - 1);
      return { kind: 'garment', index: Math.round(slot), slot };
    }
    const r = rigs[st.active];
    if (r.tagDrop > 0.6 && r.tags.mesh.visible) {
      const k = r.tags.hit(ray);
      if (k >= 0) return { kind: 'tag', index: k };
    }
    const g = r.garment;
    g.group.updateMatrixWorld(true);
    box.copy(g.bounds).applyMatrix4(g.group.matrixWorld);
    if (ray.ray.intersectsBox(box)) return { kind: 'product' };
    return null;
  }

  // screen rect (CSS px) of a garment's bounding box as it hangs now (the DOM arrows dim when a
  // garment passes under them)
  const corner = new THREE.Vector3();
  function screenRect(r, W, H) {
    const g = r.garment, b = g.bounds;
    g.group.updateMatrixWorld(true);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let k = 0; k < 8; k++) {
      corner.set(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z);
      corner.applyMatrix4(g.group.matrixWorld).project(camera);
      const sx = ((corner.x + 1) / 2) * W, sy = ((1 - corner.y) / 2) * H;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    return { i: r.i, x0, x1, y0, y1, a: clamp(1 - r.pose.fade), active: r.i === getState().active };
  }

  const pv = new THREE.Vector3();
  function anchors() {
    const st = getState();
    const W = fr.W, H = fr.H;
    // caption: under the focused (or last focused) garment, on the rack's hem line
    const ci = captionIndex();
    const rc = rigs[ci];
    const cx = fr.toScreen(slotX(ci) + rc.part.x, PIVOT_Y, rc.fwd.x).x;
    // (a fixed line: under the lowest hem of a garment pulled fully forward, which hangs lower
    // on screen than the rack at rest; the caption must not bob with the swings)
    const cy = fr.toScreen(0, fr.onRailY(TUNE.fwd) + lowHem, TUNE.fwd).y + 0.02 * H;
    // title: under the shown garment's hem in its product pose (the target, not the swinging one)
    const ra = rigs[st.active];
    const s = product.pivot(ra, pv);
    const hem = fr.toScreen(pv.x, pv.y + s * ra.garment.hemY, pv.z);
    const midY = ((PRODUCT.top + PRODUCT.hem) / 2) * H;
    let tags = [];
    if (ra.tagDrop > 0.5 && ra.tags.mesh.visible) tags = ra.tags.rects(camera, W, H);
    // the garments on screen in the product view (the shown one, and the one sliding out)
    const cover = [];
    if (st.view > 0.5) {
      const sw = st.swap;
      cover.push(screenRect(ra, W, H));
      if (sw.k < 1 && sw.from !== sw.to && sw.from !== st.active) cover.push(screenRect(rigs[sw.from], W, H));
    }
    return {
      caption: { x: cx, y: cy },
      title: { x: hem.x, y: hem.y + 0.03 * H },
      arrows: { left: { x: PRODUCT.arrowX * W, y: midY }, right: { x: (1 - PRODUCT.arrowX) * W, y: midY } },
      tags,
      cover,
    };
  }

  // slots: the screen point of each hook on the rail (y: the rail line, for the tour's glide)
  function info() {
    edgeL = edgeOf(rigs[0]);
    edgeR = edgeOf(rigs[N - 1]); // (a garment rebuilt at another quality has its own width)
    return { garments: N, slots: rigs.map((r) => fr.toScreen(slotX(r.i), PIVOT_Y, 0)) };
  }

  return { pick, anchors, info, lowHem };
}
