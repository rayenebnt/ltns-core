// AIR (chapter 04): a wide-body twin-engine cargo plane seen from above (no real airline or maker):
// glossy white fuselage with cockpit windows, the word SILLAGE on the roof and a thin orange stripe,
// swept wings with slats, spoilers, flaps and ailerons drawn in their texture, flap-track fairings,
// engine nacelles ahead of the wings, horizontal stabilisers, the fin edge-on with an orange tip;
// two contrails (its « sillage »): long ribbons starting a few metres behind the engines, widening,
// softening, slightly wavy, fading, their turbulence anchored in the air (world space).
// Local frame: +Z = nose, +Y = up, +X = left wing (north when flying east).
import * as THREE from 'three';
import { SKY, SEA } from '../layout.js';
import { PHASES } from '../../story.js';
import { MARKINGS } from '../../texts.js';
import { Builder } from './util.js';

const R = 3.1; // fuselage radius
const ZN = 32, ZT = -32; // nose, tail

// --- the flight path: a straight crossing at constant speed, centred over the ship's position in
// the middle of PHASES.plane; heading in degrees clockwise from north (75 = east-north-east)
export const PLANE_PATH = {
  heading: 80, // (integrator: flatter, so the crossing stays above the AIR text block)
  speed: 7200, // metres per unit of p (about 860 m over PHASES.plane)
  centreP: (PHASES.plane[0] + PHASES.plane[1]) / 2,
  altitude: SKY.planeAltitude,
};

const fusR = (z) => {
  if (z > 22) {
    const t = Math.min(1, (z - 22) / (ZN - 22));
    return R * Math.pow(Math.max(0, 1 - Math.pow(t, 2.3)), 0.5);
  }
  if (z < -13) {
    const t = Math.min(1, (-13 - z) / (-13 - ZT));
    return R * (1 - 0.8 * Math.pow(t, 1.25));
  }
  return R;
};
const fusY = (z) => {
  if (z > 22) {
    const t = (z - 22) / (ZN - 22);
    return -0.45 * t * t;
  }
  if (z < -13) {
    const t = (-13 - z) / (-13 - ZT);
    return 1.75 * Math.pow(t, 1.3);
  }
  return 0;
};

function fuselageTexture() {
  const W = 2048, H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  // u: tail (0) → nose (1); v: canvas y = (1 - V) * H, V = θ / 2π with θ = π on the roof
  const X = (z) => ((z - ZT) / (ZN - ZT)) * W;
  const Y = (theta) => (1 - theta / (Math.PI * 2)) * H;
  g.fillStyle = '#f4f5f6';
  g.fillRect(0, 0, W, H);
  // belly a touch greyer
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, 'rgba(200,205,210,0.5)');
  grd.addColorStop(0.22, 'rgba(255,255,255,0)');
  grd.addColorStop(0.78, 'rgba(255,255,255,0)');
  grd.addColorStop(1, 'rgba(200,205,210,0.5)');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  // panel lines: frames every 1.6 m (very faint) and a few longitudinal seams
  g.strokeStyle = 'rgba(120,128,136,0.16)';
  g.lineWidth = 1;
  for (let z = -28; z < 26; z += 1.6) {
    g.beginPath();
    g.moveTo(X(z), 0);
    g.lineTo(X(z), H);
    g.stroke();
  }
  g.strokeStyle = 'rgba(120,128,136,0.22)';
  for (const th of [Math.PI * 0.62, Math.PI * 1.38, Math.PI * 0.82, Math.PI * 1.18]) {
    g.beginPath();
    g.moveTo(X(-30), Y(th));
    g.lineTo(X(27), Y(th));
    g.stroke();
  }
  // doors: forward crew door, main cargo door outline (port side, aft of the wing)
  g.strokeStyle = 'rgba(110,118,126,0.5)';
  g.lineWidth = 2;
  g.strokeRect(X(21), Y(Math.PI * 0.62), X(22.1) - X(21), Y(Math.PI * 0.42) - Y(Math.PI * 0.62));
  g.strokeRect(X(-16), Y(Math.PI * 1.62), X(-11.5) - X(-16), Y(Math.PI * 1.36) - Y(Math.PI * 1.62));
  // cockpit windows (both sides, slanted) and the dark nose edge
  g.fillStyle = '#1a2129';
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const z0 = 27.3 + i * 0.62, th0 = Math.PI + s * (0.42 + i * 0.03), th1 = Math.PI + s * (0.2 + i * 0.03);
      g.beginPath();
      g.moveTo(X(z0), Y(th0));
      g.lineTo(X(z0 + 0.55), Y(th0 + s * -0.04));
      g.lineTo(X(z0 + 0.62), Y(th1));
      g.lineTo(X(z0 + 0.05), Y(th1 + s * 0.02));
      g.closePath();
      g.fill();
    }
  }
  // roof: the thin orange stripe along the whole fuselage, the word in ink on the white
  const stripeTh = Math.PI + 0.36;
  g.fillStyle = '#ff5a1f';
  g.fillRect(X(-29), Y(stripeTh) - 4, X(25.5) - X(-29), 8);
  g.save();
  const hPx = 74; // letter height across the roof (about 2.9 m)
  const pxPerMu = W / (ZN - ZT), pxPerMv = H / (Math.PI * 2 * R);
  g.translate(X(-3.5), Y(Math.PI) + 2);
  g.scale(pxPerMu / pxPerMv, 1);
  g.font = `900 ${hPx}px "Big Shoulders Stencil Display"`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#0f1419';
  g.fillText(MARKINGS.planeRoof, 0, 0);
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// wing planform (xa = |x| from the centreline)
const LE = (xa) => 7.5 - (xa - 2.6) * 0.625;
const CH = (xa) => (xa < 11 ? 13.5 - (xa - 2.6) * 0.74 : 7.28 - ((xa - 11) / 21.2) * 4.68);
const TLE = (xa) => -21 - (xa - 1.5) * 0.73;
const TCH = (xa) => 7.0 - ((xa - 1.5) / 9.5) * 4.4;
// wing texture mapping: planform x ∈ [-34, 34] → u, z ∈ [-34, 12] → v
const WU = (x) => (x + 34) / 68;
const WV = (z) => (z + 34) / 46;

function wingTexture() {
  const W = 2048, H = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const X = (x) => WU(x) * W, Y = (z) => (1 - WV(z)) * H;
  g.fillStyle = '#e4e7ea';
  g.fillRect(0, 0, W, H);
  const poly = (pts, fill, stroke, lw = 1.5) => {
    g.beginPath();
    pts.forEach(([x, z], i) => (i ? g.lineTo(X(x), Y(z)) : g.moveTo(X(x), Y(z))));
    g.closePath();
    if (fill) {
      g.fillStyle = fill;
      g.fill();
    }
    if (stroke) {
      g.strokeStyle = stroke;
      g.lineWidth = lw;
      g.stroke();
    }
  };
  const at = (xa, f) => LE(xa) - CH(xa) * f; // z at chord fraction f
  for (const s of [-1, 1]) {
    const P = (xa, f) => [s * xa, at(xa, f)];
    // leading-edge slats (lighter, segmented)
    poly([P(4, 0), P(31.5, 0), P(31.5, 0.12), P(4, 0.12)], '#eef0f2', 'rgba(120,128,135,0.55)');
    for (let xa = 6; xa < 31; xa += 3.8) poly([P(xa, 0), P(xa + 0.05, 0.12)], null, 'rgba(120,128,135,0.5)');
    // flaps (inboard, outboard) and ailerons
    poly([P(3.2, 0.72), P(11, 0.72), P(11, 1), P(3.2, 1)], '#d9dde1', 'rgba(105,112,120,0.7)');
    poly([P(11.3, 0.73), P(22.5, 0.73), P(22.5, 1), P(11.3, 1)], '#d9dde1', 'rgba(105,112,120,0.7)');
    poly([P(22.8, 0.74), P(29.5, 0.74), P(29.5, 1), P(22.8, 1)], '#dde1e4', 'rgba(105,112,120,0.7)');
    // spoilers ahead of the flaps
    for (let i = 0; i < 7; i++) {
      const x0 = 4 + i * 2.6;
      poly([P(x0, 0.6), P(x0 + 2.4, 0.6), P(x0 + 2.4, 0.71), P(x0, 0.71)], '#d6dadf', 'rgba(105,112,120,0.6)');
    }
    // walkway outline near the root, panel lines, fuel caps
    g.setLineDash([10, 6]);
    poly([P(4.5, 0.22), P(9, 0.22), P(9, 0.55), P(4.5, 0.55)], null, 'rgba(30,34,38,0.45)', 2);
    g.setLineDash([]);
    for (const f of [0.3, 0.45]) poly([P(4, f), P(30, f)], null, 'rgba(120,128,135,0.25)', 1);
    // navigation light at the tip
    poly([P(32.0, 0.35), P(32.2, 0.35), P(32.2, 0.55), P(32.0, 0.55)], s > 0 ? '#c8352b' : '#2f9a55');
    // stabilisers: elevators
    const tat = (xa, f) => TLE(xa) - TCH(xa) * f;
    const Q = (xa, f) => [s * xa, tat(xa, f)];
    poly([Q(1.5, 0.7), Q(10.6, 0.7), Q(10.6, 1), Q(1.5, 1)], '#dadee2', 'rgba(105,112,120,0.7)');
  }
  // a plain patch for the fin and fairings
  g.fillStyle = '#f4f5f6';
  g.fillRect(0, H - 40, 40, 40);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function fuselageGeometry() {
  const seg = 32;
  const zs = [];
  for (let i = 0; i <= 26; i++) zs.push(ZT + (i / 26) * 19); // tail cone, dense
  for (let i = 1; i <= 18; i++) zs.push(-13 + (i / 18) * 35);
  for (let i = 1; i <= 20; i++) zs.push(22 + (1 - Math.pow(1 - i / 20, 1.6)) * (ZN - 22) * 0.999);
  zs.push(ZN);
  const pos = [], nor = [], uv = [], idx = [];
  zs.forEach((z) => {
    const r = Math.max(0.02, fusR(z)), yc = fusY(z);
    for (let j = 0; j <= seg; j++) {
      const th = (j / seg) * Math.PI * 2;
      const x = -r * Math.sin(th), y = yc - r * Math.cos(th);
      pos.push(x, y, z);
      nor.push(-Math.sin(th), -Math.cos(th), 0);
      uv.push((z - ZT) / (ZN - ZT), th / (Math.PI * 2));
    }
  });
  for (let i = 0; i < zs.length - 1; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * (seg + 1) + j, b = a + 1, c = a + seg + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// a thin lifting surface (wing or stabiliser), both sides, top and bottom skins + edges
function surfaceGeometry(planform) {
  const pos = [], uv = [], idx = [];
  const { x0, x1, le, ch, y0, dihedral, t0, t1, nS = 18, nC = 10 } = planform;
  let base = 0;
  for (const s of [-1, 1]) {
    for (const side of [1, -1]) {
      // side = 1 top skin, -1 bottom skin
      const start = pos.length / 3;
      for (let i = 0; i <= nS; i++) {
        const xa = x0 + ((x1 - x0) * i) / nS;
        const thick = t0 + (t1 - t0) * ((xa - x0) / (x1 - x0));
        const yb = y0 + (xa - x0) * Math.tan(dihedral);
        for (let j = 0; j <= nC; j++) {
          const f = j / nC;
          const hump = Math.pow(Math.sin(Math.PI * Math.pow(f, 0.7)), 1.0);
          const y = yb + (side > 0 ? thick * 0.62 * hump : -thick * 0.3 * hump);
          const z = le(xa) - ch(xa) * f;
          pos.push(s * xa, y, z);
          uv.push(WU(s * xa), WV(z));
        }
      }
      for (let i = 0; i < nS; i++) {
        for (let j = 0; j < nC; j++) {
          const a = start + i * (nC + 1) + j, b = a + 1, c = a + nC + 1, d = c + 1;
          const flip = (s > 0) !== (side > 0);
          if (flip) idx.push(a, b, c, b, d, c);
          else idx.push(a, c, b, b, c, d);
        }
      }
    }
    base = pos.length / 3;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function mergeUV(geos) {
  const pos = [], nor = [], uv = [], idx = [];
  let off = 0;
  for (const g of geos) {
    const p = g.attributes.position.array, n = g.attributes.normal.array, u = g.attributes.uv.array;
    pos.push(...p);
    nor.push(...n);
    uv.push(...u);
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i++) idx.push(ix[i] + off);
    off += p.length / 3;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// nacelle: a lathe along z with vertex colours (lip, cowl, exhaust)
function nacelle(B, cx, cy, z0, z1, rf, rr) {
  const seg = 18, n = 10;
  const white = new THREE.Color('#f1f3f4'), lip = new THREE.Color('#b9c0c5'), dark = new THREE.Color('#2b3035'), core = new THREE.Color('#6d757b');
  const prof = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const z = z1 - (z1 - z0) * t;
    const r = rf * (1 - t) + rr * t + Math.sin(Math.PI * t) * 0.18;
    prof.push([z, r, i === 0 ? lip : white]);
  }
  prof.push([z0 - 1.3, rr * 0.55, core]);
  for (let i = 0; i < prof.length - 1; i++) {
    const [za, ra, ca] = prof[i], [zb, rb] = prof[i + 1];
    for (let j = 0; j < seg; j++) {
      const a0 = (j / seg) * Math.PI * 2, a1 = ((j + 1) / seg) * Math.PI * 2;
      const P = (z, r, a) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r, z];
      B.quad(P(za, ra, a1), P(za, ra, a0), P(zb, rb, a0), P(zb, rb, a1), ca);
    }
  }
  // inlet: a dark disc with the fan hub
  for (let j = 0; j < seg; j++) {
    const a0 = (j / seg) * Math.PI * 2, a1 = ((j + 1) / seg) * Math.PI * 2;
    B.tri([cx, cy, z1 - 0.4], [cx + Math.cos(a1) * rf * 0.92, cy + Math.sin(a1) * rf * 0.92, z1 - 0.2], [cx + Math.cos(a0) * rf * 0.92, cy + Math.sin(a0) * rf * 0.92, z1 - 0.2], dark);
  }
}

export async function createPlane({ uniforms }) {
  try {
    await Promise.all([document.fonts.load('900 80px "Big Shoulders Stencil Display"')]);
  } catch (e) {
    /* fonts unavailable: the canvas falls back */
  }
  const object = new THREE.Group();
  object.name = 'voyage.plane';
  const body = new THREE.Group();
  object.add(body);

  // fuselage
  const fusTex = fuselageTexture();
  const fusMat = new THREE.MeshStandardMaterial({ map: fusTex, roughness: 0.32, metalness: 0.05 });
  const fus = new THREE.Mesh(fuselageGeometry(), fusMat);
  fus.name = 'voyage.planeFuselage';
  body.add(fus);

  // wings, stabilisers (one textured mesh)
  const wingTex = wingTexture();
  const wingMat = new THREE.MeshStandardMaterial({ map: wingTex, roughness: 0.42, metalness: 0.08 });
  const wing = surfaceGeometry({ x0: 2.6, x1: 32.2, le: LE, ch: CH, y0: -1.55, dihedral: (6 * Math.PI) / 180, t0: 1.5, t1: 0.26, nS: 22, nC: 12 });
  const tail = surfaceGeometry({ x0: 1.2, x1: 10.9, le: TLE, ch: TCH, y0: 1.05, dihedral: (7 * Math.PI) / 180, t0: 0.7, t1: 0.16, nS: 8, nC: 8 });
  const wings = new THREE.Mesh(mergeUV([wing, tail]), wingMat);
  wings.name = 'voyage.planeWings';
  body.add(wings);

  // nacelles, pylons, flap-track fairings, fin, wing-body fairing (vertex colours)
  const B = new Builder();
  const white = new THREE.Color('#f1f3f4'), grey = new THREE.Color('#cdd2d6'), orange = new THREE.Color('#ff5a1f');
  for (const s of [-1, 1]) {
    const xa = 9.7;
    nacelle(B, s * xa, -2.95, 0.6, 8.9, 1.78, 1.38);
    B.beam([s * xa, -1.6, 7.2], [s * xa, -0.9, -2.0], 0.55, 1.1, grey);
    for (const fx of [6.5, 12.5, 16.8, 21]) {
      const zt = LE(fx) - CH(fx);
      B.beam([s * fx, -1.55 + (fx - 2.6) * 0.105 - 0.25, zt + 3.2], [s * fx, -1.55 + (fx - 2.6) * 0.105 - 0.35, zt - 1.8], 0.42, 0.55, grey);
    }
  }
  // wing-body fairing (belly)
  B.box(0, -2.6, 0.5, 5.4, 1.2, 16, new THREE.Color('#e6e9eb'));
  // fin: thin blade with an orange tip line
  {
    const yb = 2.4;
    const rootLE = -20.5, rootTE = -31.0, tipLE = -28.3, tipTE = -32.4, h = 11.5;
    const t0 = 0.28, t1 = 0.14;
    for (const s of [-1, 1]) {
      B.quad([s * t0, yb, rootLE], [s * t0, yb, rootTE], [s * t1, yb + h, tipTE], [s * t1, yb + h, tipLE], white);
    }
    B.quad([-t1, yb + h, tipLE], [t1, yb + h, tipLE], [t1, yb + h, tipTE], [-t1, yb + h, tipTE], orange);
    B.quad([-t0, yb, rootLE], [t0, yb, rootLE], [t1, yb + h, tipLE], [-t1, yb + h, tipLE], white);
  }
  const detMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.1, side: THREE.DoubleSide });
  const details = new THREE.Mesh(B.geometry(), detMat);
  details.name = 'voyage.planeDetails';
  body.add(details);
  for (const m of [fus, wings, details]) {
    m.castShadow = true;
    m.receiveShadow = true;
  }

  // contrails: two ribbons, in the plane's frame, deformed in the vertex shader
  const SEGS = 240, LEN = 2600;
  const cpos = [], cs = [], cside = [], cidx = [];
  for (const eng of [-1, 1]) {
    const start = cpos.length / 3;
    for (let i = 0; i <= SEGS; i++) {
      const s = LEN * Math.pow(i / SEGS, 1.7);
      for (const side of [-1, 1]) {
        cpos.push(eng * 9.7, -2.95, 0.6 - 9 - s);
        cs.push(s, eng);
        cside.push(side);
      }
    }
    for (let i = 0; i < SEGS; i++) {
      const a = start + i * 2;
      cidx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const cgeo = new THREE.BufferGeometry();
  cgeo.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3));
  cgeo.setAttribute('aS', new THREE.Float32BufferAttribute(cs, 2));
  cgeo.setAttribute('aSide', new THREE.Float32BufferAttribute(cside, 1));
  cgeo.setIndex(cidx);
  cgeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -LEN / 2), LEN);
  const cmat = new THREE.ShaderMaterial({
    uniforms: Object.assign({}, uniforms, { uTravel: { value: 0 }, uContrail: { value: 1 } }),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
attribute vec2 aS; attribute float aSide;
uniform float uTravel; uniform float uTime;
varying float vS; varying float vAcross; varying vec3 vW; varying float vEng;
void main() {
  float s = aS.x, eng = aS.y;
  float uw = uTravel - s; // along-track coordinate fixed in the air
  float width = 0.9 + 0.011 * s + 3.2 * (1.0 - exp(-s / 70.0));
  float amp = min(0.0055 * s, 9.0);
  float wave = amp * (sin(uw / 150.0 + eng * 1.7) + 0.45 * sin(uw / 61.0 + eng * 4.1 + uTime * 0.05));
  float drift = eng * min(0.004 * s, 6.0);
  vec3 p = position;
  p.x += aSide * width + wave + drift;
  p.y -= 0.004 * s;
  vec4 w = modelMatrix * vec4(p, 1.0);
  vW = w.xyz;
  vS = s; vAcross = aSide; vEng = eng;
  gl_Position = projectionMatrix * viewMatrix * w;
}`,
    fragmentShader: /* glsl */ `
uniform sampler2D uNoise; uniform float uTime; uniform vec3 uSunDir; uniform vec3 uCloudLit; uniform vec3 uCloudShade; uniform float uContrail;
varying float vS; varying float vAcross; varying vec3 vW; varying float vEng;
void main() {
  float s = vS;
  float across = vAcross;
  float ramp = smoothstep(0.0, 38.0, s);
  float fade = 1.0 - smoothstep(900.0, 2550.0, s);
  float core = exp(-across * across * mix(4.5, 2.4, smoothstep(0.0, 800.0, s)));
  vec2 w = vW.xz;
  float n1 = texture2D(uNoise, w / 46.0 + vec2(uTime * 0.003, 0.0) + vEng * 0.31).g;
  float n2 = texture2D(uNoise, w / 13.0 - vec2(0.0, uTime * 0.004)).a;
  float puff = mix(1.0, 0.45 + 0.9 * n1 * (0.7 + 0.5 * n2), smoothstep(30.0, 700.0, s));
  float a = ramp * fade * core * puff * mix(0.92, 0.55, smoothstep(0.0, 1800.0, s)) * uContrail;
  if (a < 0.004) discard;
  vec3 col = mix(uCloudShade, uCloudLit, 0.72 + 0.28 * n1);
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
  cmat.customProgramCacheKey = () => 'voyage-contrails';
  const contrails = new THREE.Mesh(cgeo, cmat);
  contrails.name = 'voyage.contrails';
  contrails.renderOrder = 7;
  object.add(contrails);

  // path
  const hd = (PLANE_PATH.heading * Math.PI) / 180;
  const dir = new THREE.Vector3(Math.sin(hd), 0, -Math.cos(hd)); // world direction of flight
  function positionAt(p, centre, target = new THREE.Vector3()) {
    const d = (p - PLANE_PATH.centreP) * PLANE_PATH.speed;
    return target.set(centre.x + dir.x * d, PLANE_PATH.altitude, centre.z + dir.z * d);
  }
  const yaw = Math.atan2(dir.x, dir.z); // rotation about Y taking local +Z to dir
  function place(p, centre, time) {
    positionAt(p, centre, object.position);
    object.rotation.set(0, yaw, 0);
    // a hint of life: very slight roll and pitch breathing
    body.rotation.z = Math.sin(time * 0.35) * 0.012;
    body.rotation.x = Math.sin(time * 0.27 + 1.3) * 0.006;
    cmat.uniforms.uTravel.value = (p - PLANE_PATH.centreP) * PLANE_PATH.speed + 100000;
  }

  return {
    object,
    contrails,
    meshes: { fus, wings, details },
    direction: dir,
    yaw,
    positionAt,
    place,
    length: ZN - ZT,
    span: 64.4,
    dispose() {
      for (const m of [fus, wings, details, contrails]) {
        m.geometry.dispose();
        m.material.dispose();
      }
      fusTex.dispose();
      wingTex.dispose();
    },
  };
}
