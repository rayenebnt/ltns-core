// Paper hang tags, one per colour variant, to the right of the garment, each on its own short
// vertical thread that fades out upward (as in the reference: strings from above, no knot to
// show). Each tag and its thread are a damped pendulum about the thread's top (swing in the
// plane, a little forward/back, and a twist). Cards and threads are one merged mesh, re-posed on
// the CPU every frame (a few hundred vertices): one draw call for all the tags.
// (v2, art review: the threads ran almost horizontally 40–58 cm from the hook shank over the
// shoulder while the tags hung plumb, as if on wires)
//
// createTags(product, { quality, clearance }) -> {
//   group        origin = thread anchor (put it at garment.tagAnchor, garment scale, no yaw)
//   setHover(i)  -1 for none: a hovered tag gets a little push and keeps swaying
//   kick(i, s)   impulse (click), s = strength (default 1)
//   setActive(i) selected variant: its card shows a printed frame and a bold eyelet ring, and it
//                hangs a little forward
//   setDrop(k)   0..1: tags fly in from above on their threads (0 = hidden)
//   update(dt)   pendulums (dt >= 0.5 snaps to rest)
//   rects(camera, w, h) -> [{ x, y, w, h }] screen rects (CSS px, top-left origin)
//   hit(raycaster) -> index or -1
//   count, dispose()
// }
import * as THREE from 'three';
import { clamp, mix, rng } from './noise.js';
import { outlineOf, styleOf } from './outlines.js';

// default distance from the anchor to the first tag: clear of the garment's sleeve tips at the
// height where the tags hang
function defaultClearance(product) {
  const { back, m } = outlineOf(styleOf(product).shape, 0.01);
  let w = 0.2;
  for (const [x, y] of back) if (y > m.yH - 0.3) w = Math.max(w, Math.abs(x));
  return w - 0.02;
}

// (integration look-dev: ~1.2x the first size and hung ~3 cm higher, level with the shoulder as in
// the reference: they are the colour picker, they must read at a glance and be easy to hit)
const TAG_W = 0.074, TAG_H = 0.16, TAG_T = 0.0009, HOLE_Y = -0.014, HOLE_R = 0.0042;

function luminance(hex) {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; // linear
}

// the atlas: one slot per variant, two rows: the plain card (row 0) and the selected one (row 1)
function tagTexture(product, slots) {
  const SW = 256, SH = 560;
  const cv = document.createElement('canvas');
  cv.width = SW * slots; cv.height = SH * 2;
  const g = cv.getContext('2d');
  for (let row = 0; row < 2; row++) drawCards(g, product, SW, SH, row);
  // a solid patch for the threads (the top right corner of the last slot is cut off the card)
  // (v3, second review: the light warm grey threads vanished at phone scale and the tags read
  // as floating cards; the reference's strings are dark): a dark grey cotton string
  g.fillStyle = '#4a4a4a';
  g.fillRect(cv.width - 8, 0, 8, 8);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return { tex: t, SW, SH, W: cv.width };
}

function drawCards(g, product, SW, SH, row) {
  const rand = rng(97); // seeded: identical tags on every load (deterministic stills)
  const y0 = row * SH;
  g.save();
  g.translate(0, y0);
  product.variants.forEach((v, i) => {
    const x0 = i * SW;
    g.fillStyle = v.body;
    g.fillRect(x0, 0, SW, SH);
    // paper tooth: faint speckle
    for (let k = 0; k < 900; k++) {
      g.fillStyle = `rgba(${rand() < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + rand() * 0.03})`;
      g.fillRect(x0 + rand() * SW, rand() * SH, 1.5, 1.5);
    }
    const dark = luminance(v.body) > 0.18;
    const fg = dark ? '#151517' : '#f4f2ec';
    // reinforcing ring round the hole
    const hx = x0 + SW / 2, hy = (-HOLE_Y / TAG_H) * SH;
    g.fillStyle = dark ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.22)';
    g.beginPath(); g.arc(hx, hy, (0.0075 / TAG_W) * SW, 0, Math.PI * 2); g.fill();
    g.strokeStyle = dark ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.35)';
    g.lineWidth = 2;
    g.stroke();
    if (row === 1) {
      // the selected card (v3, second review: hanging it 2.5 cm lower broke the staircase and the
      // wrong tag looked chosen): a printed frame that follows the card's cut corners and a bold
      // eyelet ring, in the label's ink, so the choice can be named at a glance on a phone
      const ppm = SW / TAG_W / 1000; // px per mm
      const ins = 3.6 * ppm, lw = 3.4 * ppm, cut = 15 * ppm, r = 3 * ppm;
      const L = x0 + ins + lw / 2, R = x0 + SW - ins - lw / 2, T = ins + lw / 2, B = SH - ins - lw / 2;
      const c = cut + (ins + lw / 2) * (Math.SQRT2 - 1); // the 45° cut, inset by the same amount
      g.strokeStyle = fg;
      g.lineWidth = lw;
      g.lineJoin = 'miter';
      g.beginPath();
      g.moveTo(L, T + c);
      g.lineTo(L + c, T);
      g.lineTo(R - c, T);
      g.lineTo(R, T + c);
      g.lineTo(R, B - r);
      g.arcTo(R, B, R - r, B, r);
      g.lineTo(L + r, B);
      g.arcTo(L, B, L, B - r, r);
      g.closePath();
      g.stroke();
      g.lineWidth = 2.6 * ppm;
      g.beginPath(); g.arc(hx, hy, (0.0062 / TAG_W) * SW, 0, Math.PI * 2); g.stroke();
    }
    // vertical label
    g.save();
    g.translate(hx + 6, SH * 0.56);
    g.rotate(Math.PI / 2);
    g.fillStyle = fg;
    g.font = '800 64px "Inter Tight"';
    if ('letterSpacing' in g) g.letterSpacing = '7px';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const w = g.measureText(v.tag).width;
    const maxW = SH * 0.6;
    if (w > maxW) g.scale(maxW / w, maxW / w);
    g.fillText(v.tag, 0, 0);
    g.restore();
    // tiny ruelle mark
    g.fillStyle = fg;
    g.font = '400 34px "Lilita One"';
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    g.fillText('ruelle', hx, SH - 34 - (row === 1 ? 10 : 0));
  });
  g.restore();
}

function cardGeometry() {
  const s = new THREE.Shape();
  const w = TAG_W / 2, r = 0.006, y0 = -TAG_H, y1 = 0;
  // top corners clipped (classic tag shape), bottom corners rounded
  s.moveTo(-w + r, y0);
  s.lineTo(w - r, y0);
  s.quadraticCurveTo(w, y0, w, y0 + r);
  s.lineTo(w, y1 - 0.015);
  s.lineTo(w - 0.015, y1);
  s.lineTo(-w + 0.015, y1);
  s.lineTo(-w, y1 - 0.015);
  s.lineTo(-w, y0 + r);
  s.quadraticCurveTo(-w, y0, -w + r, y0);
  const hole = new THREE.Path();
  hole.absarc(0, HOLE_Y, HOLE_R, 0, Math.PI * 2, true);
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: TAG_T, bevelEnabled: false, curveSegments: 8 });
  g.translate(0, -HOLE_Y, -TAG_T / 2); // pivot at the hole
  return g;
}

export function createTags(product, { quality = 'high', clearance = defaultClearance(product) } = {}) {
  const n = product.variants.length;
  const { tex, SW, SH, W } = tagTexture(product, Math.max(n, 1));
  const base = cardGeometry();
  const bpos = base.attributes.position.array, bnor = base.attributes.normal.array;
  const nvCard = bpos.length / 3;
  const TH = 14, TR = 4; // thread: segments x ring
  const nvThread = (TH + 1) * TR;
  const total = n * (nvCard + nvThread);
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2);
  const index = [];
  // card UVs: the plain row, or the selected one (setActive rewrites them)
  function cardUVs(i, row) {
    const o = i * (nvCard + nvThread);
    for (let v = 0; v < nvCard; v++) {
      const x = bpos[v * 3], y = bpos[v * 3 + 1];
      uv[(o + v) * 2] = (i * SW + ((x + TAG_W / 2) / TAG_W) * SW) / W;
      uv[(o + v) * 2 + 1] = 1 - (row + -(y + HOLE_Y) / TAG_H) / 2;
    }
  }
  for (let i = 0; i < n; i++) {
    const o = i * (nvCard + nvThread);
    cardUVs(i, i === 0 ? 1 : 0);
    for (let v = 0; v < nvCard; v++) index.push(o + v);
    const t0 = o + nvCard;
    for (let s = 0; s <= TH; s++) for (let r = 0; r < TR; r++) {
      uv[(t0 + s * TR + r) * 2] = 1 - 2 / W;
      uv[(t0 + s * TR + r) * 2 + 1] = 1 - 1 / SH;
    }
    for (let s = 0; s < TH; s++) for (let r = 0; r < TR; r++) {
      const a = t0 + s * TR + r, b = t0 + s * TR + ((r + 1) % TR), c = a + TR, d = b + TR;
      index.push(a, c, b, b, c, d);
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geom.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geom.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geom.setIndex(index);
  const mat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.78, metalness: 0, sheen: 0.25, sheenRoughness: 0.8, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  mesh.name = `tags:${product.id}`;
  const group = new THREE.Group();
  group.add(mesh);

  // pendulum state per tag
  // rest: the hole at rest (from the group origin, the hanger neck); len: the thread above it
  const tags = product.variants.map((_, i) => ({
    rest: new THREE.Vector3(clearance + 0.04 + i * 0.087, -0.07 - i * 0.026, 0.012 + i * 0.004),
    // 14–16 cm (v3, second review: 9–12 cm read as no string at all; the reference's strings
    // rise ~1.3 tag heights): the tops step down less than the tags (natural, not a ruler)
    len: 0.14 + 0.01 * i,
    top: new THREE.Vector3(), hole: new THREE.Vector3(), prev: new THREE.Vector3(), vel: new THREE.Vector3(),
    az: 0, vz: 0, ax: 0, vx: 0, ay: 0, vy: 0, // swing (z), forward (x), twist (y)
    active: 0, hover: 0, L: 0.1,
  }));
  let hover = -1, activeIdx = 0, drop = 1, first = true, clock = 0; // own clock: deterministic under __setTime
  const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), ee = new THREE.Euler(), vv = new THREE.Vector3(), nn = new THREE.Vector3();
  const ease = (k) => 1 - Math.pow(1 - clamp(k), 3);

  function pose() {
    for (let i = 0; i < n; i++) {
      const T = tags[i];
      const o = i * (nvCard + nvThread);
      ee.set(T.ax, T.ay, T.az, 'YXZ');
      qq.setFromEuler(ee);
      m4.compose(T.hole, qq, vv.set(1, 1, 1).multiplyScalar(drop > 0.001 ? 1 : 0.0001));
      for (let v = 0; v < nvCard; v++) {
        vv.set(bpos[v * 3], bpos[v * 3 + 1], bpos[v * 3 + 2]).applyMatrix4(m4);
        pos[(o + v) * 3] = vv.x; pos[(o + v) * 3 + 1] = vv.y; pos[(o + v) * 3 + 2] = vv.z;
        nn.set(bnor[v * 3], bnor[v * 3 + 1], bnor[v * 3 + 2]).applyQuaternion(qq);
        nor[(o + v) * 3] = nn.x; nor[(o + v) * 3 + 1] = nn.y; nor[(o + v) * 3 + 2] = nn.z;
      }
      // thread: top -> hole, taut (the tag's weight), as a thin 4-sided tube round the vertical
      // (its section in x / z, so it shows its full width to the camera; v2 had it in y / z, a
      // third of its width on screen) whose radius tapers to nothing over its top quarter: it
      // fades out upward. 1.15 mm: ~1.35 px at 1440 x 900 in the product view
      const t0 = o + nvCard;
      for (let s = 0; s <= TH; s++) {
        const k = s / TH;
        const px = mix(T.top.x, T.hole.x, k), py = mix(T.top.y, T.hole.y, k), pz = mix(T.top.z, T.hole.z, k);
        const tk = Math.min(1, k / 0.25);
        const taper = tk * tk * (3 - 2 * tk); // 0 at the top, full below the top quarter
        for (let r = 0; r < TR; r++) {
          const a = (r / TR) * Math.PI * 2 + Math.PI / 4;
          const rr = 0.00115 * taper;
          const ox = Math.cos(a) * rr * Math.SQRT2, oz = Math.sin(a) * rr * Math.SQRT2;
          const q = (t0 + s * TR + r) * 3;
          pos[q] = px + ox; pos[q + 1] = py; pos[q + 2] = pz + oz;
          nor[q] = Math.cos(a); nor[q + 1] = 0; nor[q + 2] = Math.sin(a);
        }
      }
    }
    geom.attributes.position.needsUpdate = true;
    geom.attributes.normal.needsUpdate = true;
    geom.computeBoundingSphere();
  }

  function update(dt = 1 / 60) {
    const snap = dt >= 0.5 || first;
    if (!snap) clock += dt;
    const h = Math.min(dt, 1 / 30);
    for (let i = 0; i < n; i++) {
      const T = tags[i];
      T.active += ((i === activeIdx ? 1 : 0) - T.active) * (snap ? 1 : 1 - Math.exp(-dt / 0.12));
      // dropping in, the tags fly in from above and a little to the right (away from the
      // garment) while their threads pay out; the selected tag hangs 1.5 cm forward (its
      // printed frame marks the choice; v3: no longer lower, the staircase stays even)
      const k = ease(drop);
      T.prev.copy(T.top);
      T.top.set(T.rest.x + 0.05 * (1 - k), T.rest.y + T.len + 0.05 * (1 - k), T.rest.z + 0.015 * T.active);
      T.L = T.len * mix(0.45, 1, k);
      if (snap) {
        T.vel.set(0, 0, 0);
        T.az = T.vz = T.ax = T.vx = T.ay = T.vy = 0;
        hang(T);
        continue;
      }
      // the top's acceleration drives the pendulum (physical swing when flying in or moving)
      const vx = (T.top.x - T.prev.x) / dt, vy = (T.top.y - T.prev.y) / dt;
      const accX = (vx - T.vel.x) / dt, accY = (vy - T.vel.y) / dt;
      T.vel.set(vx, vy, 0);
      const w = Math.PI * 2 * 1.15, z = 0.11;
      // (integration look-dev: coupling 0.9 -> 0.4 and a lower clamp: the drop-in swung the tags
      // ±35° (the hole decelerates at ~0.7 g at the end of its fall); the reference's tags fly in
      // and settle with a calm ±10–15° swing; a click still kicks them clearly)
      const force = clamp(-accX / 9.81, -1, 1) * 0.4 + clamp(accY / 9.81, -1, 1) * 0.06;
      for (let it = 0; it < Math.ceil(dt / h); it++) {
        const sdt = dt / Math.ceil(dt / h);
        T.vz += (-w * w * T.az - 2 * z * w * T.vz + force * w * w) * sdt;
        T.az += T.vz * sdt;
        T.vx += (-w * w * T.ax - 2 * z * w * T.vx) * sdt;
        T.ax += T.vx * sdt;
        const wy = Math.PI * 2 * 0.6;
        T.vy += (-wy * wy * T.ay - 2 * 0.08 * wy * T.vy) * sdt;
        T.ay += T.vy * sdt;
      }
      if (i === hover) {
        // a hovered tag keeps a gentle sway
        // (per second, not per frame: the same sway at 30, 60 or 120 Hz)
        T.vz += Math.sin(clock * 3.8 + i) * 2.4 * dt;
      }
      hang(T);
    }
    first = false;
    pose();
  }
  // the hole at the end of the thread, swung about the top (the card turns with it)
  function hang(T) {
    ee.set(T.ax, T.ay, T.az, 'YXZ');
    qq.setFromEuler(ee);
    T.hole.set(0, -T.L, 0).applyQuaternion(qq).add(T.top);
  }

  function kick(i, s = 1) {
    const T = tags[i];
    if (!T) return;
    T.vz += 2.2 * s;
    T.vy += 3.0 * s;
    T.vx -= 0.8 * s;
  }

  const corners = [[-TAG_W / 2, 0], [TAG_W / 2, 0], [TAG_W / 2, -TAG_H], [-TAG_W / 2, -TAG_H]];
  function worldCorners(i) {
    const T = tags[i];
    ee.set(T.ax, T.ay, T.az, 'YXZ');
    qq.setFromEuler(ee);
    m4.compose(T.hole, qq, vv.set(1, 1, 1));
    const mw = new THREE.Matrix4().multiplyMatrices(group.matrixWorld, m4);
    return corners.map(([x, y]) => new THREE.Vector3(x, y - HOLE_Y, 0).applyMatrix4(mw));
  }

  pose();
  return {
    group,
    mesh,
    count: n,
    setHover(i) {
      if (i !== hover && i >= 0) kick(i, 0.35);
      hover = i;
    },
    kick,
    setActive(i) {
      if (i === activeIdx) return;
      activeIdx = i;
      for (let j = 0; j < n; j++) cardUVs(j, j === i ? 1 : 0);
      geom.attributes.uv.needsUpdate = true;
    },
    setDrop(k) { drop = clamp(k); mesh.visible = drop > 0.001; },
    update,
    rects(camera, w, h) {
      group.updateWorldMatrix(true, false);
      return tags.map((_, i) => {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const p of worldCorners(i)) {
          p.project(camera);
          const sx = (p.x * 0.5 + 0.5) * w, sy = (-p.y * 0.5 + 0.5) * h;
          x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy);
        }
        return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      });
    },
    hit(raycaster) {
      group.updateWorldMatrix(true, false);
      let best = -1, bestD = Infinity;
      const tri = new THREE.Vector3();
      for (let i = 0; i < n; i++) {
        const c = worldCorners(i);
        for (const [a, b, d] of [[0, 1, 2], [0, 2, 3]]) {
          const hitP = raycaster.ray.intersectTriangle(c[a], c[b], c[d], false, tri);
          if (hitP) {
            const dist = hitP.distanceTo(raycaster.ray.origin);
            if (dist < bestD) { bestD = dist; best = i; }
          }
        }
      }
      return best;
    },
    dispose() { geom.dispose(); mat.dispose(); tex.dispose(); base.dispose(); },
  };
}
