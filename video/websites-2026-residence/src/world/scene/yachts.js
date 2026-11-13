// Motor yachts in the bay: the luxury cue of the hero shot.
// Each yacht is lofted from plan outlines: a flared hull with a rising sheer line, a raked
// stem and a dark boot stripe; two superstructure decks with raked fronts wrapped in tinted
// glazing; deck overhangs, a hardtop and a mast. Two instanced meshes (gelcoat/teak with
// vertex colours, glossy glass). The sea shader mirrors them in the water, draws a foam
// line at the waterline and the wake of the one that cruises slowly across the bay.
import * as THREE from 'three';
import { mergeSafe } from './geom.js';

const WHITE = [0.86, 0.86, 0.84];
const TEAK = [0.34, 0.24, 0.16];
const BOOT = [0.07, 0.085, 0.11];
const STEEL = [0.5, 0.5, 0.5];

export const YACHT = { L: 30, B: 6.6 };
const L = YACHT.L, B = YACHT.B;
const sstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// hull lines along u (0 transom .. 1 bow tip), bow toward +x
const deckW = (u) => {
  if (u < 0.42) return (B / 2) * (0.95 + 0.05 * sstep(0, 0.14, u));
  const v = (u - 0.42) / 0.58;
  return (B / 2) * (1 - Math.pow(v, 2.2));
};
const sheer = (u) => 2.0 + 0.42 * u + 1.05 * Math.pow(u, 4);
const STEM = 0.9; // the waterline ends here: raked, overhanging bow
const keelY = (u) => -0.6 + (sheer(u) - 0.25 + 0.6) * Math.pow(sstep(STEM - 0.07, 1.0, u), 1.15);
const waterW = (u) => deckW(Math.min(1, u / STEM)) * 0.9;
// half-width of the topsides at height fraction t (0 bottom .. 1 deck edge): flared above
const sideW = (u, t) => {
  const wb = waterW(u) * 0.86;
  return wb + (deckW(u) - wb) * Math.pow(t, 0.55);
};
const xAt = (u) => -L / 2 + u * L;

function geometry(pos, col, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function hull() {
  const n = 44;
  const pos = [], col = [], idx = [];
  const rows = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = xAt(u);
    const yk = keelY(u), h = sheer(u);
    const ty = (y) => Math.min(1, Math.max(0, (y - yk) / (h - yk)));
    const at = (t, c) => [x, yk + (h - yk) * t, -sideW(u, t), c];
    const tb = ty(0.34); // top of the boot stripe
    const w = deckW(u);
    const port = [
      at(0, BOOT), at(tb, BOOT), at(tb, WHITE), at(tb + (1 - tb) * 0.45, WHITE), at(tb + (1 - tb) * 0.8, WHITE), at(1, WHITE),
      [x, h + 0.16, -w * 0.995, WHITE], [x, h + 0.05, -w * 0.94, WHITE], [x, h + 0.05, -w * 0.94, TEAK],
    ];
    const star = port.map(([px, py, pz, c]) => [px, py, -pz, c]).reverse();
    rows.push([...port, [x, h + 0.11, 0, TEAK], ...star]);
  }
  const P = rows[0].length;
  rows.forEach((r) => r.forEach(([x, y, z, c]) => {
    pos.push(x, y, z);
    col.push(...c);
  }));
  const seams = new Set([1, 7, P - 9, P - 3]); // colour seams: no quad between duplicated points
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < P - 1; j++) {
      if (seams.has(j)) continue;
      const a = i * P + j, b = a + 1, c = a + P, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = geometry(pos, col, idx);
  // transom: horizontal strips between the port and starboard profiles of the first section
  const tp = [], tc = [], ti = [];
  const r0 = rows[0].slice(0, 7); // port bottom .. bulwark top
  r0.forEach(([x, y, z, c]) => {
    tp.push(x, y, z, x, y, -z);
    tc.push(...c, ...c);
  });
  for (let j = 0; j < r0.length - 1; j++) {
    if (j === 1) continue;
    const a = j * 2, c = a + 1, b = a + 2, d = a + 3;
    ti.push(a, c, b, b, c, d);
  }
  return [g, geometry(tp, tc, ti)];
}

// closed plan outline (x, z): square-ish aft end with rounded corners, straight sides and a
// rounded, pointed nose
function outline(x0, x1, w, nose) {
  const r = Math.min(0.8, w * 0.35);
  const half = [[x0, 0]];
  for (let i = 0; i <= 4; i++) {
    const a = (i / 4) * (Math.PI / 2);
    half.push([x0 + r - r * Math.cos(a), w - r + r * Math.sin(a)]);
  }
  const ns = 9;
  for (let i = 0; i <= ns; i++) {
    const s = i / ns;
    half.push([x1 - nose + nose * s, w * Math.pow(Math.max(0, 1 - Math.pow(s, 2.1)), 0.55)]);
  }
  const pts = half.slice();
  for (let i = half.length - 2; i >= 1; i--) pts.push([half[i][0], -half[i][1]]);
  return pts;
}

// lofted deck structure: rings of the outline at given heights; the front leans back by
// `rake` at the top, the sides lean in a little. bands: [[y0, y1, colour | 'glass', sweep0,
// sweep1], ...]; a sweep tilts that boundary (rise per metre toward the bow), so the glazing
// can taper forward like a yacht's
function loft({ x0, x1, w, nose, y0, h, rake = 0, aftRake = 0, tumble = 0.05, bands }, body, glass) {
  const base = outline(x0, x1, w, nose);
  const xm = (x0 + x1) / 2;
  const ring = (y, sweep = 0) => {
    const f = (y - y0) / h;
    const a = x0 + aftRake * f, b = x1 - rake * f;
    return base.map(([x, z]) => {
      const xx = a + ((x - x0) / (x1 - x0)) * (b - a);
      return [xx, y + sweep * (xx - xm), z * (1 - tumble * f)];
    });
  };
  const M = base.length;
  for (const [ya, yb, c, sa = 0, sb = 0] of bands) {
    const isGlass = c === 'glass';
    const pos = [], col = [], idx = [];
    const ra = ring(ya, sa), rb = ring(yb, sb);
    for (const r of [ra, rb]) for (const [x, y, z] of r) {
      pos.push(x, y, z);
      col.push(...(isGlass ? WHITE : c));
    }
    for (let i = 0; i < M; i++) {
      const j = (i + 1) % M;
      idx.push(i, j, M + i, j, M + j, M + i);
    }
    (isGlass ? glass : body).push(geometry(pos, col, idx));
  }
  // flat top cap
  const last = bands[bands.length - 1];
  const top = ring(y0 + h, last[4] || 0);
  const cx = top.reduce((s, p) => s + p[0], 0) / M;
  const cy = top.reduce((s, p) => s + p[1], 0) / M;
  const pos = [cx, cy, 0], col = [...WHITE], idx = [];
  top.forEach(([x, y, z]) => {
    pos.push(x, y, z);
    col.push(...WHITE);
  });
  for (let i = 0; i < M; i++) idx.push(0, 1 + i, 1 + ((i + 1) % M));
  body.push(geometry(pos, col, idx));
}

export function yachtGeometries() {
  const body = [...hull()];
  const glass = [];
  // hull windows: a long dark band amidships and a short one forward, following the flare
  const strip = (u0, u1, yA, yB, rise = 0) => {
    const n = 16, pos = [], col = [], idx = [];
    for (const side of [-1, 1]) {
      const base = pos.length / 3;
      for (let i = 0; i <= n; i++) {
        const u = u0 + ((u1 - u0) * i) / n;
        const yk = keelY(u), h = sheer(u);
        const lift = rise * ((u - u0) / (u1 - u0));
        for (const y of [yA + lift, yB + lift]) {
          const t = Math.min(1, Math.max(0, (y - yk) / (h - yk)));
          pos.push(xAt(u), y, side * (sideW(u, t) + 0.025));
          col.push(...WHITE);
        }
      }
      for (let i = 0; i < n; i++) {
        const a = base + i * 2;
        if (side < 0) idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        else idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    glass.push(geometry(pos, col, idx));
  };
  strip(0.2, 0.58, 1.02, 1.4);
  strip(0.62, 0.76, 1.35, 1.6, 0.25);

  // main deck saloon: long, low, strongly raked windscreen; glazing all round, tapering forward
  loft({ x0: -10.6, x1: 7.0, w: 2.95, nose: 5.0, y0: 2.0, h: 2.4, rake: 3.3, aftRake: 0.25, bands: [[2.0, 2.85, WHITE, 0, 0.035], [2.85, 4.0, 'glass', 0.035, -0.012], [4.0, 4.4, WHITE, -0.012, 0]] }, body, glass);
  // upper deck floor: a short overhang over the aft deck (shade line) and the side decks
  loft({ x0: -11.6, x1: 4.2, w: 3.12, nose: 3.6, y0: 4.36, h: 0.22, rake: 0.3, tumble: 0, bands: [[4.36, 4.58, WHITE]] }, body, glass);
  // upper deck (bridge)
  loft({ x0: -7.2, x1: 3.0, w: 2.5, nose: 3.8, y0: 4.55, h: 1.95, rake: 2.6, aftRake: 0.25, bands: [[4.55, 5.0, WHITE, 0, 0.03], [5.0, 6.1, 'glass', 0.03, -0.01], [6.1, 6.5, WHITE, -0.01, 0]] }, body, glass);
  // hardtop
  loft({ x0: -9.3, x1: 1.0, w: 2.75, nose: 2.8, y0: 6.46, h: 0.18, rake: 0.2, tumble: 0, bands: [[6.46, 6.64, WHITE]] }, body, glass);
  // slim raked mast blade and a radar bar
  loft({ x0: -5.7, x1: -4.5, w: 0.11, nose: 0.5, y0: 6.6, h: 1.5, rake: 0.85, aftRake: 0.85, tumble: 0, bands: [[6.6, 8.1, WHITE]] }, body, glass);
  loft({ x0: -6.1, x1: -4.9, w: 0.75, nose: 0.4, y0: 7.72, h: 0.09, tumble: 0, bands: [[7.72, 7.81, STEEL]] }, body, glass);
  return { body: mergeSafe(body), glass: mergeSafe(glass) };
}

// [x, z, heading (rad, 0 = bow toward +x, positive turns the bow toward -z), scale]
// The anchored ones all lie head to the same westerly breeze. The last one leaves the
// cape and cruises slowly east into the open bay (through the sun path), its wake trailing
// behind; main.js restarts its clock while the camera is inside the room, so every return
// to the hero starts the cruise again without a visible jump.
export const YACHT_SPOTS = [
  [102, 67, Math.PI + 0.15, 0.86],
  [17, -740, Math.PI - 0.1, 1.1],
  [89, -439, Math.PI - 0.05, 1.0],
  [140, -25, 0.17, 0.9],
];
export const CRUISE = { index: 3, speed: 1.4, lead: 60 };

export function yachtPosition(i, time, out = new THREE.Vector2()) {
  const [x, z, hd] = YACHT_SPOTS[i];
  out.set(x, z);
  if (i === CRUISE.index) {
    const s = CRUISE.speed * Math.max(0, time);
    out.x += Math.cos(hd) * s;
    out.y -= Math.sin(hd) * s;
  }
  return out;
}

export function createYachts({ envMap }) {
  const { body, glass } = yachtGeometries();
  const matBody = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0, envMap, envMapIntensity: 0.85 });
  const matGlass = new THREE.MeshStandardMaterial({ color: 0x0b0f15, roughness: 0.06, metalness: 0.0, envMap, envMapIntensity: 1.25 });
  const n = YACHT_SPOTS.length;
  const meshBody = new THREE.InstancedMesh(body, matBody, n);
  const meshGlass = new THREE.InstancedMesh(glass, matGlass, n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const xz = new THREE.Vector2();
  const place = (i, time) => {
    const [, , hd, sc] = YACHT_SPOTS[i];
    yachtPosition(i, time, xz);
    q.setFromAxisAngle(up, hd);
    m.compose(p.set(xz.x, 0, xz.y), q, s.set(sc, sc, sc));
    meshBody.setMatrixAt(i, m);
    meshGlass.setMatrixAt(i, m);
  };
  for (let i = 0; i < n; i++) place(i, 0);
  meshBody.name = 'yachts';
  meshGlass.name = 'yacht-glass';
  // the cruising instance moves: skip the (static) instanced bounding sphere
  meshBody.frustumCulled = false;
  meshGlass.frustumCulled = false;
  const group = new THREE.Group();
  group.add(meshBody, meshGlass);
  // sea-shader data: position (x, z) and bow direction (cos, sin) per yacht, and its scale
  const uYacht = { value: YACHT_SPOTS.map(() => new THREE.Vector4()) };
  const uYachtS = { value: YACHT_SPOTS.map(([, , , sc]) => new THREE.Vector2(sc, 0)) };
  const update = (time) => {
    place(CRUISE.index, time);
    meshBody.instanceMatrix.needsUpdate = true;
    meshGlass.instanceMatrix.needsUpdate = true;
    YACHT_SPOTS.forEach(([, , hd], i) => {
      yachtPosition(i, time, xz);
      uYacht.value[i].set(xz.x, xz.y, Math.cos(hd), -Math.sin(hd));
    });
    // run so far (wake length): it came out from behind the cape before the page opened
    uYachtS.value[CRUISE.index].y = CRUISE.lead + CRUISE.speed * Math.max(0, time);
  };
  update(0);
  return { group, update, uYacht, uYachtS, count: n, geometries: { body, glass }, materials: { body: matBody, glass: matGlass } };
}
