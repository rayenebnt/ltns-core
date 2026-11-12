// MER (chapter 03): the container ship, built for the top view. Local frame: origin at mid-length
// on the waterline, +Z = bow (the ship sails due south, +Z world, down the screen), +X = east.
// Hull (pointed bow, transom stern), deck, hatch covers, lashing bridges, forecastle with breakwater
// and mooring winches, superstructure near the stern (bridge wings, window bands), funnel with the
// orange band and the white wake mark, lifeboats; containers as one InstancedMesh (bays × rows ×
// tiers, uneven stacks, muted industrial palette plus a few brand orange, corrugated atlas
// texture) and the orange SILLAGE container on a top tier (its own mesh, stencilled roof and sides).
import * as THREE from 'three';
import { SEA, CONTAINER, ROAD } from '../layout.js';
import { PHASES } from '../../story.js';
import { MARKINGS } from '../../texts.js';
import { Builder, rng } from './util.js';

const HALF_L = SEA.ship.length / 2;
const HALF_B = SEA.ship.beam / 2;
export const DECK_Y = 14; // main deck above the waterline
const HATCH_TOP = DECK_Y + 1.6;

// the hull outline (half width at local z), shared with the ocean shader (foam, shadow)
export function hullHalfWidth(z, L = HALF_L, B = HALF_B) {
  let w = B;
  const zs = z + L;
  if (zs < 22) {
    const t = Math.min(1, Math.max(0, zs / 22));
    w = B * (0.86 + 0.14 * t * t * (3 - 2 * t));
  }
  const zb = (z - (L - 95)) / 95;
  if (zb > 0) w = B * Math.pow(Math.max(1 - Math.pow(Math.min(zb, 1), 2.3), 0), 0.62);
  return w;
}
export const HULL_GLSL = /* glsl */ `
float hullHW(float z, float L, float B) {
  float w = B;
  float zs = z + L;
  if (zs < 22.0) w = B * (0.86 + 0.14 * smoothstep(0.0, 22.0, zs));
  float zb = (z - (L - 95.0)) / 95.0;
  if (zb > 0.0) w = B * pow(max(1.0 - pow(min(zb, 1.0), 2.3), 0.0), 0.62);
  return w;
}
// signed distance (approximate) to the hull outline at the waterline, q = (lateral, along)
float hullSD(vec2 q, float L, float B) {
  if (q.y > L) return length(vec2(q.x, q.y - L));
  if (q.y < -L) { float dx = max(abs(q.x) - 0.86 * B, 0.0); return length(vec2(dx, -L - q.y)); }
  return abs(q.x) - hullHW(q.y, L, B);
}`;

// --- the ship's path: due south at a constant speed (metres per unit of p) from the moment it
// leaves the quay (before that it waits, stern 25 m off the quay; the wake fades in as it sets off)
export const SHIP_PATH = {
  speed: 640, // metres per unit of p: 160 m over the ship + rise windows
  start: PHASES.ship[0], // p where the ship is at SEA.ship (x, z)
};
const zRest = ROAD.quayZ + 25 + HALF_L;
const pRest = SHIP_PATH.start + (zRest - SEA.ship.z) / SHIP_PATH.speed;

const PALETTE = [
  ['#8e3b2c', 15], // rust red
  ['#263a55', 13], // navy
  ['#7d858b', 13], // grey
  ['#2f6f73', 10], // teal
  ['#c08a2e', 8], // ochre
  ['#d9d6cc', 10], // off-white
  ['#3e5a46', 7], // dark green
  ['#6b2b2e', 7], // maroon
  ['#9eb3c2', 6], // light blue-grey
  ['#4a4e52', 6], // graphite
  ['#a8562f', 5], // burnt orange-brown
];
const BRAND = '#ff5a1f';

// --- container atlas: four bands (roof, side, door end, front end), detail albedo + normal map
function containerAtlas(rnd) {
  const W = 1024, H = 512, BH = 128;
  const alb = document.createElement('canvas');
  alb.width = W;
  alb.height = H;
  const nrm = document.createElement('canvas');
  nrm.width = W;
  nrm.height = H;
  const a = alb.getContext('2d').createImageData(W, H);
  const n = nrm.getContext('2d').createImageData(W, H);
  // smooth value noise for dirt
  const G = 64, grid = new Float32Array(G * G).map(() => rnd());
  const vn = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const g = (i, j) => grid[(((j % G) + G) % G) * G + (((i % G) + G) % G)];
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return (g(xi, yi) * (1 - sx) + g(xi + 1, yi) * sx) * (1 - sy) + (g(xi, yi + 1) * (1 - sx) + g(xi + 1, yi + 1) * sx) * sy;
  };
  for (let y = 0; y < H; y++) {
    const band = Math.floor(y / BH);
    const v = (y % BH) / BH; // 0 at the band's top edge in the canvas
    for (let x = 0; x < W; x++) {
      const u = x / W;
      let alb0 = 0.9, nx = 0, ny = 0;
      const dirt = vn(u * 40, y * 0.08) * 0.5 + vn(u * 160, y * 0.3) * 0.5;
      if (band === 0) {
        // roof: transverse corrugations (along u), raised edge rails, corner castings
        const ph = u * 34 * Math.PI * 2;
        nx = Math.cos(ph) * 0.35;
        alb0 = 0.86 + 0.06 * Math.sin(ph) - 0.1 * Math.max(0, dirt - 0.55);
        const edge = Math.min(v, 1 - v);
        if (edge < 0.05) { alb0 = 0.78; nx = 0; ny = (v < 0.5 ? 1 : -1) * 0.5 * (edge < 0.03 ? 1 : 0); }
        const endD = Math.min(u, 1 - u);
        if (endD < 0.012) { alb0 = 0.72; nx = 0; }
        if (endD < 0.014 && edge < 0.08) alb0 = 0.42; // corner castings
        alb0 *= 0.96 + 0.08 * vn(u * 8, v * 3);
      } else if (band === 1) {
        // side: vertical corrugations, top and bottom rails, vertical rust streaks
        const ph = u * 62 * Math.PI * 2;
        const tri = Math.abs(((u * 62) % 1) - 0.5) * 2; // trapezoid-ish
        nx = Math.sign(Math.sin(ph)) * (tri > 0.25 && tri < 0.75 ? 0.45 : 0);
        alb0 = 0.88 + 0.05 * Math.cos(ph) - 0.12 * Math.max(0, dirt - 0.5);
        if (v < 0.07 || v > 0.92) { alb0 = 0.7; nx = 0; ny = v < 0.07 ? 0.4 : -0.4; }
        const streak = vn(u * 220, 0.5) > 0.82 ? (1 - v) * 0.12 : 0;
        alb0 -= streak;
        const endD = Math.min(u, 1 - u);
        if (endD < 0.012) { alb0 = 0.66; nx = 0; }
      } else if (band === 2) {
        // door end: two leaves, four locking bars, header and sill
        const bars = [0.14, 0.36, 0.64, 0.86];
        alb0 = 0.86 - 0.08 * Math.max(0, dirt - 0.5);
        for (const b of bars) if (Math.abs(u - b) < 0.012) { alb0 = 1.0; nx = (u < b ? -0.5 : 0.5); }
        if (Math.abs(u - 0.5) < 0.006) { alb0 = 0.35; }
        if (v < 0.08 || v > 0.9) { alb0 = 0.68; ny = v < 0.08 ? 0.4 : -0.4; }
        if (u < 0.04 || u > 0.96) { alb0 = 0.66; }
      } else {
        // front end: horizontal corrugations
        const ph = v * 9 * Math.PI * 2;
        ny = Math.cos(ph) * 0.4;
        alb0 = 0.86 + 0.05 * Math.sin(ph) - 0.1 * Math.max(0, dirt - 0.5);
        if (u < 0.04 || u > 0.96) { alb0 = 0.66; ny = 0; }
      }
      const i = (y * W + x) * 4;
      const c = Math.round(Math.min(1, Math.max(0, alb0)) * 255);
      a.data[i] = a.data[i + 1] = a.data[i + 2] = c;
      a.data[i + 3] = 255;
      const l = Math.hypot(nx, ny, 1);
      n.data[i] = Math.round((nx / l * 0.5 + 0.5) * 255);
      n.data[i + 1] = Math.round((-ny / l * 0.5 + 0.5) * 255);
      n.data[i + 2] = Math.round((1 / l * 0.5 + 0.5) * 255);
      n.data[i + 3] = 255;
    }
  }
  alb.getContext('2d').putImageData(a, 0, 0);
  nrm.getContext('2d').putImageData(n, 0, 0);
  const map = new THREE.CanvasTexture(alb);
  map.colorSpace = THREE.NoColorSpace;
  map.anisotropy = 8;
  const normalMap = new THREE.CanvasTexture(nrm);
  normalMap.colorSpace = THREE.NoColorSpace;
  normalMap.anisotropy = 8;
  return { map, normalMap, canvas: alb };
}

// the SILLAGE container's own texture: brand orange, stencilled roof and sides, codes
function heroTexture(atlasCanvas) {
  const W = 1024, H = 512, BH = 128;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  // base: the generic atlas detail tinted orange
  g.drawImage(atlasCanvas, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = BRAND;
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';
  const stencil = (text, cx, cy, hPx, sx, font = '900') => {
    g.save();
    g.translate(cx, cy);
    g.scale(sx, 1);
    g.font = `${font} ${hPx}px "Big Shoulders Stencil Display"`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255,255,255,0.93)';
    g.fillText(text, 0, 0);
    g.restore();
  };
  const mono = (text, x, y, hPx, sx, align = 'left') => {
    g.save();
    g.translate(x, y);
    g.scale(sx, 1);
    g.font = `700 ${hPx}px "JetBrains Mono"`;
    g.textAlign = align;
    g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.fillText(text, 0, 0);
    g.restore();
  };
  // roof (band 0): 12.19 m along u (84 px/m), 2.44 m across v (52.5 px/m): letters tops face +x
  stencil(MARKINGS.heroContainer.brand, W * 0.5, BH * 0.5, 96, 1.55);
  // sides (band 1): brand large, code at the top right
  // (84 px/m along, 49 px/m up: letters widened by 1.7 to keep their proportions)
  stencil(MARKINGS.heroContainer.brand, W * 0.47, BH + BH * 0.55, 74, 1.7);
  mono(MARKINGS.heroContainer.code, W * 0.95, BH + 20, 13, 1.7, 'right');
  mono(MARKINGS.heroContainer.type, W * 0.95, BH + 37, 11, 1.7, 'right');
  // door end (band 2): code and weights (2.44 m over 1024 px across, 49 px/m up: × 8.5)
  mono(MARKINGS.heroContainer.code, W * 0.75, BH * 2 + 22, 7, 8.5, 'center');
  mono(MARKINGS.heroContainer.maxGross, W * 0.75, BH * 2 + 96, 5, 8.5, 'center');
  mono(MARKINGS.heroContainer.tare, W * 0.75, BH * 2 + 106, 5, 8.5, 'center');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// unit container box: x ∈ [-0.5, 0.5] (width), y ∈ [0, 1], z ∈ [-0.5, 0.5] (length, +Z = doors)
function containerGeometry() {
  const pos = [], nor = [], uv = [];
  const face = (corners, normal, uvs) => {
    const [a, b, c, d] = corners;
    for (const [p, t] of [[a, uvs[0]], [b, uvs[1]], [c, uvs[2]], [a, uvs[0]], [c, uvs[2]], [d, uvs[3]]]) {
      pos.push(...p);
      nor.push(...normal);
      uv.push(...t);
    }
  };
  const band = (k, u, v) => [u, k * 0.25 + v * 0.25];
  // roof: u along +z, v along +x (band 3 at the top of the canvas = V 0.75..1)
  face([[-0.5, 1, -0.5], [-0.5, 1, 0.5], [0.5, 1, 0.5], [0.5, 1, -0.5]], [0, 1, 0], [band(3, 0, 0), band(3, 1, 0), band(3, 1, 1), band(3, 0, 1)]);
  // +x side (seen from the east): u increases towards -z
  face([[0.5, 0, 0.5], [0.5, 0, -0.5], [0.5, 1, -0.5], [0.5, 1, 0.5]], [1, 0, 0], [band(2, 0, 0), band(2, 1, 0), band(2, 1, 1), band(2, 0, 1)]);
  // -x side: u increases towards +z
  face([[-0.5, 0, -0.5], [-0.5, 0, 0.5], [-0.5, 1, 0.5], [-0.5, 1, -0.5]], [-1, 0, 0], [band(2, 0, 0), band(2, 1, 0), band(2, 1, 1), band(2, 0, 1)]);
  // +z end: doors
  face([[-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 1, 0.5], [-0.5, 1, 0.5]], [0, 0, 1], [band(1, 0, 0), band(1, 1, 0), band(1, 1, 1), band(1, 0, 1)]);
  // -z end: front wall
  face([[0.5, 0, -0.5], [-0.5, 0, -0.5], [-0.5, 1, -0.5], [0.5, 1, -0.5]], [0, 0, -1], [band(0, 0, 0), band(0, 1, 0), band(0, 1, 1), band(0, 0, 1)]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

export async function createShip() {
  try {
    await Promise.all([document.fonts.load('900 80px "Big Shoulders Stencil Display"'), document.fonts.load('700 20px "JetBrains Mono"')]);
  } catch (e) {
    /* fonts unavailable: the canvas falls back */
  }
  const rnd = rng(20261112);
  const object = new THREE.Group();
  object.name = 'voyage.ship';
  const L = HALF_L, Bh = HALF_B;
  const B = new Builder();
  const C = (h) => new THREE.Color(h);
  const hullCol = C('#1c2733'), bootCol = C('#6a2e26'), deckCol = C('#3c4743'), sheer = C('#c9cfcc');
  const hatchCol = C('#56616a'), white = C('#eceeed'), lashCol = C('#8b9499'), yellow = C('#d8ac2c');

  // --- hull: side walls (boot topping at the waterline), deck, sheer line
  const N = 90;
  const zs = [];
  for (let i = 0; i <= N; i++) zs.push(-L + (2 * L * i) / N);
  const outline = zs.map((z) => [hullHalfWidth(z), z]);
  for (let i = 0; i < N; i++) {
    const [w0, z0] = outline[i], [w1, z1] = outline[i + 1];
    for (const s of [-1, 1]) {
      const a = [s * w0, -2.5, z0], b = [s * w1, -2.5, z1], c = [s * w1, 1.2, z1], d = [s * w0, 1.2, z0];
      const e = [s * w1, DECK_Y, z1], f = [s * w0, DECK_Y, z0];
      if (s > 0) {
        B.quad(a, b, c, d, bootCol);
        B.quad(d, c, e, f, hullCol);
      } else {
        B.quad(b, a, d, c, bootCol);
        B.quad(c, d, f, e, hullCol);
      }
      // sheer: a light strip on the deck edge
      const inset = 0.55;
      const g0 = [s * w0, DECK_Y + 0.06, z0], g1 = [s * w1, DECK_Y + 0.06, z1];
      const h0 = [s * Math.max(0, w0 - inset), DECK_Y + 0.06, z0], h1 = [s * Math.max(0, w1 - inset), DECK_Y + 0.06, z1];
      if (s > 0) B.quad(h0, h1, g1, g0, sheer);
      else B.quad(g0, g1, h1, h0, sheer);
    }
    // deck
    B.quad([-w0, DECK_Y, z0], [-w1, DECK_Y, z1], [w1, DECK_Y, z1], [w0, DECK_Y, z0], deckCol);
  }
  // transom
  {
    const w = hullHalfWidth(-L);
    B.quad([w, -2.5, -L], [-w, -2.5, -L], [-w, DECK_Y, -L], [w, DECK_Y, -L], hullCol);
  }

  // --- forecastle: raised deck over the forward 30 m, white bulwark, breakwater, winches
  const fz0 = L - 31;
  {
    const fN = 24, fy = DECK_Y + 2.4;
    for (let i = 0; i < fN; i++) {
      const z0 = fz0 + ((L - fz0) * i) / fN, z1 = fz0 + ((L - fz0) * (i + 1)) / fN;
      const w0 = hullHalfWidth(z0) - 0.05, w1 = hullHalfWidth(z1) - 0.05;
      B.quad([-w0, fy, z0], [-w1, fy, z1], [w1, fy, z1], [w0, fy, z0], C('#4c5953'));
      for (const s of [-1, 1]) {
        const a = [s * w0, DECK_Y, z0], b = [s * w1, DECK_Y, z1], c = [s * w1, fy + 1.1, z1], d = [s * w0, fy + 1.1, z0];
        if (s > 0) B.quad(a, b, c, d, hullCol); else B.quad(b, a, d, c, hullCol);
        // white bulwark cap
        const e = [s * w0, fy + 1.12, z0], f = [s * w1, fy + 1.12, z1], g = [s * (w1 - 0.5), fy + 1.12, z1], h = [s * (w0 - 0.5), fy + 1.12, z0];
        if (s > 0) B.quad(h, g, f, e, white); else B.quad(e, f, g, h, white);
      }
    }
    // front wall of the forecastle
    const w = hullHalfWidth(fz0);
    B.quad([w, DECK_Y, fz0], [-w, DECK_Y, fz0], [-w, fy, fz0], [w, fy, fz0], white);
    // breakwater: a white V across the deck just aft of the forecastle
    const bz = fz0 - 2.5, bw = hullHalfWidth(bz) - 0.8;
    B.beam([-bw, DECK_Y + 2.2, bz - 3], [0, DECK_Y + 2.2, bz + 1.5], 0.5, 4.4, white);
    B.beam([0, DECK_Y + 2.2, bz + 1.5], [bw, DECK_Y + 2.2, bz - 3], 0.5, 4.4, white);
    // windlasses, mooring winches, bitts, chain lines, the foremast
    for (const s of [-1, 1]) {
      B.box(s * 5.2, fy + 0.8, L - 13, 3.2, 1.6, 4.2, C('#2f5a45'), { top: C('#3d6b54') });
      B.cyl(s * 5.2, fy + 1.6, L - 13, 1.0, 0.5, C('#9a2f27'), 10);
      B.beam([s * 5.2, fy + 0.3, L - 10.8], [s * 3.4, fy + 0.3, L - 4.5], 0.45, 0.3, C('#2a2c2d'));
      B.box(s * 8.6, fy + 0.7, L - 21, 2.6, 1.4, 3.4, C('#2f5a45'), { top: C('#3d6b54') });
      B.box(s * 8.6, fy + 0.9, L - 18.6, 1.6, 0.9, 1.2, white);
      for (const zz of [L - 7, L - 17, L - 25]) B.cyl(s * (hullHalfWidth(zz) - 1.6), fy, zz, 0.32, 0.9, white, 8);
    }
    B.box(0, fy + 4, L - 5.5, 0.5, 8, 0.5, white);
    B.box(0, fy + 7.6, L - 5.5, 2.2, 0.25, 1.2, white);
  }

  // --- container bays, hatch covers, lashing bridges
  const pitch = 13.55;
  const zFront = fz0 - 6;
  const nBays = 16;
  const rowP = CONTAINER.w + 0.08;
  const bayZ = [];
  for (let k = 0; k < nBays; k++) bayZ.push(zFront - CONTAINER.l40 / 2 - 0.4 - k * pitch);
  for (let k = 0; k < nBays; k++) {
    const z = bayZ[k];
    const hw = Math.min(hullHalfWidth(z - 6.3), hullHalfWidth(z + 6.3));
    // hatch covers: three panels across with gaps
    const hcw = hw - 2.0;
    const third = (2 * hcw) / 3;
    for (let j = 0; j < 3; j++) {
      const cx = -hcw + third * (j + 0.5);
      B.box(cx, DECK_Y + 0.8, z, third - 0.25, 1.6, 12.9, hatchCol, { top: C('#5e6971') });
    }
    // coaming sides
    B.box(0, DECK_Y + 0.5, z - 6.6, 2 * hcw + 0.6, 1.0, 0.35, C('#47515a'));
    // lashing bridge aft of the bay (between bays)
    if (k < nBays - 1) {
      const lz = z - CONTAINER.l40 / 2 - 0.68;
      const lw = Math.min(hw, hullHalfWidth(lz)) - 1.0;
      B.box(0, HATCH_TOP + 2.6, lz, 2 * lw, 5.2, 0.9, lashCol, { top: C('#a3abaf') });
      B.box(0, HATCH_TOP + 5.32, lz - 0.42, 2 * lw, 0.12, 0.08, yellow);
      B.box(0, HATCH_TOP + 5.32, lz + 0.42, 2 * lw, 0.12, 0.08, yellow);
      for (let x = -lw + 1; x < lw; x += 5.04) B.box(x, HATCH_TOP + 5.4, lz, 0.1, 0.2, 0.9, yellow);
    }
  }

  // --- stacks
  const palette = [];
  let total = 0;
  for (const [h, w] of PALETTE) total += w;
  const pick = () => {
    let r = rnd() * total;
    for (const [h, w] of PALETTE) {
      if ((r -= w) <= 0) return h;
    }
    return PALETTE[0][0];
  };
  const tops = [], lowers = [], fillers = [];
  let hero = null;
  const heroBay = 6, heroRowFromCentre = -3;
  const bayProfile = (k) => 6 + Math.round(2.2 * Math.sin((Math.PI * (k + 0.5)) / nBays)) - (k < 2 ? 1 : 0);
  for (let k = 0; k < nBays; k++) {
    const z = bayZ[k];
    const hw = Math.min(hullHalfWidth(z - 6.3), hullHalfWidth(z + 6.3));
    let rows = Math.min(16, Math.floor((2 * (hw - 1.15)) / rowP));
    const twenties = rnd() < 0.18; // this bay carries pairs of 20' boxes
    const maxT = bayProfile(k);
    // colour clusters: runs of the same colour across rows within a tier band
    const clusterColour = [];
    for (let r = 0; r < rows; r++) clusterColour.push(pick());
    for (let r = 1; r < rows; r++) if (rnd() < 0.55) clusterColour[r] = clusterColour[r - 1];
    for (let r = 0; r < rows; r++) {
      const x = (r - (rows - 1) / 2) * rowP;
      const rowFromCentre = Math.round(r - (rows - 1) / 2 - 0.01);
      const outer = Math.min(r, rows - 1 - r);
      let tiers = maxT - (outer === 0 ? 1 : 0) - Math.floor(rnd() * rnd() * 4);
      if (rnd() < 0.05) tiers = Math.max(0, tiers - 3 - Math.floor(rnd() * 3));
      const isHero = k === heroBay && rowFromCentre === heroRowFromCentre;
      const nearHero = k === heroBay && Math.abs(rowFromCentre - heroRowFromCentre) === 1;
      if (isHero) tiers = maxT + 1;
      if (nearHero) tiers = maxT - 2;
      let y = HATCH_TOP;
      const colPieces = twenties && !isHero ? 2 : 1;
      for (let tIdx = 0; tIdx < tiers; tIdx++) {
        const hc = rnd() < 0.7;
        const h = hc ? CONTAINER.hHC : CONTAINER.h;
        for (let piece = 0; piece < colPieces; piece++) {
          const len = colPieces === 2 ? CONTAINER.l20 : CONTAINER.l40;
          const zc = colPieces === 2 ? z + (piece === 0 ? -1 : 1) * (CONTAINER.l20 / 2 + 0.04) : z;
          let col = rnd() < 0.6 ? clusterColour[r] : pick();
          if (rnd() < 0.03 && Math.abs(k - heroBay) > 1) col = BRAND;
          if (Math.abs(k - heroBay) <= 1 && (col === BRAND || col === '#a8562f' || col === '#c08a2e')) col = '#7d858b';
          const isTop = tIdx === tiers - 1;
          if (isHero && isTop) {
            hero = { x, y, z: zc, len, h };
            continue;
          }
          const item = { x, y, z: zc, len, h, col, flip: rnd() < 0.5, shade: 0.9 + rnd() * 0.16 };
          (isTop ? tops : lowers).push(item);
        }
        y += h + 0.02;
      }
      if (tiers > 1) fillers.push({ x, y: HATCH_TOP, z, len: CONTAINER.l40 - 0.1, w: CONTAINER.w - 0.12, h: y - HATCH_TOP - 3.0, col: '#3a3f44', flip: false, shade: 1 });
    }
  }

  // --- superstructure (near the stern): accommodation block, wheelhouse, bridge wings, windows
  const sz0 = -L + 27, sz1 = -L + 48; // aft and forward faces
  {
    const top = DECK_Y + 29.5;
    const zc = (sz0 + sz1) / 2;
    B.box(0, (DECK_Y + top) / 2, zc, 24, top - DECK_Y, sz1 - sz0, white, { top: C('#d9dddc') });
    // stepped lower decks forward (wider, lower)
    B.box(0, DECK_Y + 4, zc + 1, 30, 8, sz1 - sz0 - 1, white, { top: C('#d2d6d5') });
    // window bands on the forward face and the sides
    for (let lvl = 0; lvl < 9; lvl++) {
      const yy = DECK_Y + 9.6 + lvl * 2.25;
      B.box(0, yy, sz1 + 0.06, 21.5, 0.95, 0.12, C('#26323b'));
      for (const s of [-1, 1]) B.box(s * 12.06, yy, zc, 0.12, 0.95, (sz1 - sz0) * 0.8, C('#26323b'));
    }
    // wheelhouse and bridge wings spanning the full beam
    const wy = top + 1.6;
    B.box(0, wy, sz1 - 4.2, 26, 3.2, 8.4, white, { top: C('#c9cecd') });
    B.box(0, wy + 0.2, sz1 - 0.02, 25.6, 1.3, 0.14, C('#1d2830'));
    for (const s of [-1, 1]) {
      B.box(s * (13 + (Bh - 13) / 2 + 0.25), top + 1.1, sz1 - 2.6, Bh - 13 + 0.5, 0.35, 4.2, white);
      B.box(s * (Bh + 0.1), top + 1.9, sz1 - 2.6, 0.6, 1.6, 4.2, white);
    }
    // monkey island: radar mast, antennas, compass
    B.box(0, wy + 3.4, sz1 - 6.5, 1.2, 3.6, 1.2, white);
    B.box(0, wy + 5.3, sz1 - 6.5, 7.5, 0.25, 0.45, C('#e2e4e3'));
    B.box(4.5, wy + 2.2, sz1 - 3.5, 0.8, 1.2, 0.8, C('#bfc4c3'));
    B.cyl(-4, wy + 1.6, sz1 - 3.2, 0.7, 0.6, C('#f2f3f2'), 10);
    // lifeboats (orange) on davits on both sides, life-raft canisters
    for (const s of [-1, 1]) {
      B.box(s * 14.6, DECK_Y + 10.5, sz0 + 6, 2.8, 2.6, 8.6, C('#ee6a2e'), { top: C('#f07a3e') });
      B.box(s * 14.6, DECK_Y + 11.9, sz0 + 6, 1.6, 0.4, 6.4, C('#f3f1ec'));
      B.box(s * 13.2, DECK_Y + 12.5, sz0 + 6, 0.5, 4.5, 0.5, C('#7c858a'));
      for (let i = 0; i < 3; i++) B.cyl(s * 12.6, DECK_Y + 8.2, sz0 + 12 + i * 1.6, 0.55, 1.4, white, 8);
    }
  }

  // --- funnel aft of the accommodation: white casing, orange band, black top, uptakes, wake mark
  {
    const fz = -L + 19.5, fw = 9.0, fl = 11, f0 = DECK_Y, f1 = DECK_Y + 35;
    B.box(0, (f0 + f1 - 6) / 2, fz, fw, f1 - 6 - f0, fl, white, { top: white });
    B.box(0, f1 - 4.5, fz, fw + 0.06, 3.0, fl + 0.06, C(BRAND));
    B.box(0, f1 - 1.5, fz, fw, 3.0, fl, C('#24282b'), { top: C('#2b2f33') });
    for (const [x, zz, r] of [[-2.2, fz + 2.0, 1.1], [2.2, fz + 2.0, 1.1], [0, fz - 2.6, 1.4]]) B.cyl(x, f1, zz, r, 1.6, C('#5a6066'), 12, C('#121416'));
    // the white wake mark: three curved lines on the orange band, both sides
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const yy = f1 - 5.4 + i * 0.75;
        B.beam([s * (fw / 2 + 0.05), yy, fz - 3.6], [s * (fw / 2 + 0.05), yy + 0.35, fz + 3.6], 0.08, 0.22, C('#ffffff'));
      }
    }
  }
  // stern mooring deck: winches and bollards
  for (const s of [-1, 1]) {
    B.box(s * 8, DECK_Y + 0.7, -L + 7, 3.0, 1.4, 3.6, C('#2f5a45'), { top: C('#3d6b54') });
    B.cyl(s * 12.5, DECK_Y, -L + 3, 0.32, 0.9, white, 8);
    B.cyl(s * 15.5, DECK_Y, -L + 12, 0.32, 0.9, white, 8);
  }
  B.box(0, DECK_Y + 2.6, -L + 1.0, 2 * hullHalfWidth(-L) - 1, 0.5, 0.4, white);

  const hullMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.08 });
  const hull = new THREE.Mesh(B.geometry(), hullMat);
  hull.name = 'voyage.shipHull';
  hull.castShadow = true;
  hull.receiveShadow = true;
  object.add(hull);

  // --- containers (instanced)
  const atlas = containerAtlas(rng(4242));
  const boxGeo = containerGeometry();
  const all = tops.concat(fillers, lowers);
  const contMat = new THREE.MeshStandardMaterial({
    map: atlas.map, normalMap: atlas.normalMap, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.66, metalness: 0.18,
  });
  const containers = new THREE.InstancedMesh(boxGeo, contMat, all.length);
  containers.name = 'voyage.containers';
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  const flipQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  const col = new THREE.Color();
  all.forEach((c, i) => {
    q.identity();
    if (c.flip) q.copy(flipQ);
    m.compose(ps.set(c.x, c.y, c.z), q, sc.set(c.w || CONTAINER.w, c.h, c.len));
    containers.setMatrixAt(i, m);
    col.set(c.col).multiplyScalar(c.shade);
    containers.setColorAt(i, col);
  });
  containers.instanceMatrix.needsUpdate = true;
  containers.instanceColor.needsUpdate = true;
  containers.castShadow = true;
  containers.receiveShadow = true;
  containers.computeBoundingSphere();
  object.add(containers);
  const counts = { tops: tops.length, fillers: fillers.length, all: all.length };

  // --- the SILLAGE container
  const heroTex = heroTexture(atlas.canvas);
  const heroMat = new THREE.MeshStandardMaterial({ map: heroTex, normalMap: atlas.normalMap, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.55, metalness: 0.15 });
  const heroMesh = new THREE.Mesh(boxGeo, heroMat);
  heroMesh.name = 'voyage.sillageContainer';
  heroMesh.position.set(hero.x, hero.y, hero.z);
  heroMesh.scale.set(CONTAINER.w, hero.h, hero.len);
  heroMesh.castShadow = true;
  heroMesh.receiveShadow = true;
  object.add(heroMesh);
  const heroLocal = new THREE.Vector3(hero.x, hero.y + hero.h, hero.z); // roof centre

  // --- path and anchors
  function positionAt(p, target = new THREE.Vector3()) {
    const pp = Math.max(p, pRest);
    return target.set(SEA.ship.x, SEA.level, SEA.ship.z + (pp - SHIP_PATH.start) * SHIP_PATH.speed);
  }
  // 0 at rest by the quay, 1 under way (drives the wake)
  const underWay = (p) => Math.min(1, Math.max(0, (p - (pRest - 0.015)) / 0.035));
  const heroAt = (p, target = new THREE.Vector3()) => positionAt(p, target).add(heroLocal);
  // world points for the DOM: hull corners at deck level and five callout attach points
  function anchorPoints(p) {
    const c = positionAt(p);
    const P = (x, y, z) => new THREE.Vector3(c.x + x, c.y + y, c.z + z);
    return {
      centre: P(0, DECK_Y, 0),
      bow: P(0, DECK_Y, L),
      stern: P(0, DECK_Y, -L),
      corners: [P(-Bh, DECK_Y, -L), P(Bh, DECK_Y, -L), P(Bh, DECK_Y, L), P(-Bh, DECK_Y, L)],
      hero: heroAt(p),
      // two on the left side, two on the right, one ahead of the bow (screen bottom)
      callouts: [P(-Bh - 4, DECK_Y, -L * 0.45), P(Bh + 4, DECK_Y, -L * 0.15), P(-Bh - 4, DECK_Y, L * 0.25), P(Bh + 4, DECK_Y, L * 0.5), P(0, DECK_Y, L + 30)],
    };
  }

  function setQuality(level) {
    containers.count = level === 'low' ? counts.tops + counts.fillers : counts.all;
  }

  return {
    object,
    hull,
    containers,
    heroMesh,
    length: SEA.ship.length,
    beam: SEA.ship.beam,
    deckY: DECK_Y,
    topY: DECK_Y + 35, // funnel top; stacks reach about DECK_Y + 25
    halfLength: L,
    halfBeam: Bh,
    heroLocal,
    positionAt,
    heroAt,
    underWay,
    anchorPoints,
    setQuality,
    counts,
    dispose() {
      hull.geometry.dispose();
      hullMat.dispose();
      boxGeo.dispose();
      contMat.dispose();
      heroMat.dispose();
      heroTex.dispose();
      atlas.map.dispose();
      atlas.normalMap.dispose();
      containers.dispose();
    },
  };
}
