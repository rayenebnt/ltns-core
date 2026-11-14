// SIBYLLE: the props, all procedural. A hand (palm, jointed fingers, thumb, forearm, sleeve) with
// poses; the bottle (lathe, faceted stopper, script label); the martini glass and its liquid; the
// coin; a fluted column (whole or broken); the robed figure seen from behind; balusters.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
export const sstep = (a, b, x) => smooth((x - a) / (b - a));
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const V2 = (r, y) => new THREE.Vector2(r, y);
export const lathe = (prof, seg = 48, phi0 = 0, phiL = Math.PI * 2) => new THREE.LatheGeometry(prof.map(([r, y]) => V2(r, y)), seg, phi0, phiL);

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ------------------------------------------------------------------ the hand
// a right hand: the wrist at the origin, fingers along +x, the back of the hand +y, the thumb at -z
const FINGERS = [
  { at: [0.95, 0.0, -0.28], len: [0.45, 0.27, 0.21], r: 0.066, spread: 0.12 },
  { at: [0.99, 0.01, -0.09], len: [0.5, 0.3, 0.23], r: 0.068, spread: 0.02 },
  { at: [0.96, 0.0, 0.1], len: [0.46, 0.28, 0.21], r: 0.064, spread: -0.08 },
  { at: [0.88, -0.015, 0.275], len: [0.36, 0.22, 0.18], r: 0.055, spread: -0.2 },
];
export const POSES = {
  // curls per finger [knuckle, middle, tip], the spread added to each finger's own, the thumb
  // [swing towards the palm, base flex, middle flex, tip flex]
  rest: { curl: [[0.18, 0.22, 0.14], [0.2, 0.26, 0.16], [0.26, 0.3, 0.18], [0.32, 0.34, 0.2]], spread: 0, thumb: [0.05, 0.1, 0.12, 0.1] },
  reach: { curl: [[0.05, 0.12, 0.1], [0.06, 0.14, 0.1], [0.1, 0.18, 0.12], [0.16, 0.2, 0.14]], spread: 0.08, thumb: [-0.12, 0.0, 0.08, 0.06] },
  pinch: { curl: [[0.5, 0.72, 0.42], [0.62, 0.95, 0.6], [0.85, 1.1, 0.7], [0.98, 1.15, 0.75]], spread: -0.04, thumb: [0.42, 0.22, 0.35, 0.3] },
  grip: { curl: [[1.05, 1.25, 0.85], [1.1, 1.3, 0.85], [1.12, 1.28, 0.8], [1.1, 1.2, 0.75]], spread: -0.06, thumb: [0.62, 0.35, 0.5, 0.35] },
};
function capsule(r, L) {
  const g = new THREE.CapsuleGeometry(r, L, 5, 14);
  g.rotateZ(-Math.PI / 2);
  g.translate(L / 2, 0, 0);
  // a touch flatter on the palm side and the back: fingers, not tubes
  g.scale(1, 0.84, 1);
  return g;
}
export function makeHand(m) {
  const root = new THREE.Group();
  // palm: a rounded box, narrower at the wrist, domed on the back
  const palmG = new RoundedBoxGeometry(1.0, 0.22, 0.8, 5, 0.1);
  palmG.translate(0.5, 0, 0);
  {
    const pp = palmG.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      const x = pp.getX(i);
      let y = pp.getY(i), z = pp.getZ(i);
      z *= mix(0.74, 1.0, clamp(x / 0.5));
      const zz = z / 0.41;
      y *= 1.0 - 0.38 * zz * zz;
      if (y > 0) y += 0.035 * (1 - zz * zz) * clamp((x - 0.2) / 0.6);
      pp.setXYZ(i, x, y, z);
    }
    palmG.computeVertexNormals();
  }
  const palm = new THREE.Mesh(palmG, m.skin);
  root.add(palm);
  // the ball of the thumb
  const thenarG = new THREE.SphereGeometry(1, 20, 14);
  thenarG.scale(0.34, 0.14, 0.2);
  const thenar = new THREE.Mesh(thenarG, m.skin);
  thenar.position.set(0.32, -0.06, -0.24);
  thenar.rotation.y = 0.5;
  root.add(thenar);

  const fingers = FINGERS.map((f) => {
    const joints = [];
    const j0 = new THREE.Group();
    j0.position.set(...f.at);
    j0.rotation.order = 'YZX';
    root.add(j0);
    let cur = j0;
    const rs = [1, 0.92, 0.84];
    f.len.forEach((L, i) => {
      const mesh = new THREE.Mesh(capsule(f.r * rs[i], L), m.skin);
      cur.add(mesh);
      joints.push(cur);
      if (i < f.len.length - 1) {
        const j = new THREE.Group();
        j.position.x = L;
        cur.add(j);
        cur = j;
      }
    });
    // the nail
    const nailG = new THREE.SphereGeometry(1, 12, 8);
    nailG.scale(0.085, 0.022, f.r * 0.8);
    const nail = new THREE.Mesh(nailG, m.nail);
    nail.position.set(f.len[2] - 0.07, f.r * 0.62, 0);
    nail.userData.noShadow = true;
    cur.add(nail);
    const tip = new THREE.Object3D();
    tip.position.set(f.len[2] + f.r * 0.5, -f.r * 0.3, 0);
    cur.add(tip);
    return { f, joints, tip };
  });
  // the thumb
  const t0 = new THREE.Group();
  t0.position.set(0.2, -0.05, -0.3);
  t0.rotation.order = 'YZX';
  root.add(t0);
  const tj = [t0];
  const tlen = [0.4, 0.3, 0.24], tr = [0.088, 0.078, 0.07];
  let cur = t0;
  tlen.forEach((L, i) => {
    cur.add(new THREE.Mesh(capsule(tr[i], L), m.skin));
    if (i < 2) {
      const j = new THREE.Group();
      j.position.x = L;
      cur.add(j);
      tj.push(j);
      cur = j;
    }
  });
  {
    const nailG = new THREE.SphereGeometry(1, 12, 8);
    nailG.scale(0.09, 0.024, 0.07);
    const nail = new THREE.Mesh(nailG, m.nail);
    nail.position.set(tlen[2] - 0.08, tr[2] * 0.6, 0);
    nail.userData.noShadow = true;
    cur.add(nail);
  }
  const thumbTip = new THREE.Object3D();
  thumbTip.position.set(tlen[2] + 0.04, -0.03, 0);
  cur.add(thumbTip);

  // forearm, bracelet, sleeve and its embroidered cuff
  const armG = new THREE.CylinderGeometry(0.3, 0.42, 3.4, 28, 1, false);
  armG.rotateZ(Math.PI / 2);
  armG.translate(-1.62, 0, 0);
  armG.scale(1, 0.84, 0.94);
  const arm = new THREE.Mesh(armG, m.skin);
  root.add(arm);
  const braceG = new THREE.TorusGeometry(0.335, 0.045, 10, 40);
  braceG.rotateY(Math.PI / 2);
  braceG.scale(1, 0.86, 0.95);
  const brace = new THREE.Mesh(braceG, m.dark);
  brace.position.x = -0.3;
  root.add(brace);
  const sleeveG = new THREE.CylinderGeometry(0.6, 0.86, 3.0, 36, 1, true);
  sleeveG.rotateZ(Math.PI / 2);
  sleeveG.translate(-2.55, 0, 0);
  const sleeve = new THREE.Mesh(sleeveG, m.sleeve);
  root.add(sleeve);
  const cuffG = new THREE.CylinderGeometry(0.615, 0.64, 0.34, 48, 1, true);
  cuffG.rotateZ(Math.PI / 2);
  cuffG.translate(-1.2, 0, 0);
  const cuff = new THREE.Mesh(cuffG, m.cuff);
  cuff.userData.noOutline = true;
  root.add(cuff);

  const tw = new THREE.Vector3(), iw = new THREE.Vector3();
  function setPose(a, b, t) {
    const A = POSES[a], B = POSES[b];
    fingers.forEach((F, i) => {
      for (let k = 0; k < 3; k++) F.joints[k].rotation.z = -mix(A.curl[i][k], B.curl[i][k], t);
      F.joints[0].rotation.y = F.f.spread * (1 + mix(A.spread, B.spread, t) * 4);
    });
    const th = A.thumb.map((v, k) => mix(v, B.thumb[k], t));
    t0.rotation.set(-1.0 - th[0] * 0.6, 0.78 + th[0], -0.22 - th[1]);
    tj[1].rotation.z = -th[2];
    tj[2].rotation.z = -th[3];
  }
  // the point between the thumb's tip and the index's tip (where a pinch holds a coin), in world space
  function pinchPoint(out) {
    root.updateMatrixWorld(true);
    thumbTip.getWorldPosition(tw);
    fingers[0].tip.getWorldPosition(iw);
    return out.copy(tw).add(iw).multiplyScalar(0.5);
  }
  setPose('rest', 'rest', 0);
  return { root, setPose, pinchPoint, fingers, sleeve, cuff };
}

// the cuff's embroidery: rings and dots, black on paper
export function cuffTexture() {
  return canvasTex(1024, 128, (g, w, h) => {
    g.fillStyle = '#f4f0e6';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#0b0a0a';
    g.fillStyle = '#0b0a0a';
    g.lineWidth = 7;
    g.fillRect(0, 6, w, 8);
    g.fillRect(0, h - 14, w, 8);
    for (let i = 0; i < 14; i++) {
      const x = (i + 0.5) * (w / 14);
      g.beginPath();
      g.arc(x, h / 2, 26, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(x, h / 2, 8, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.arc(x + w / 28, h / 2, 4, 0, Math.PI * 2);
      g.fill();
    }
  });
}

// ------------------------------------------------------------------ the bottle
const BODY = [[0, 0], [0.34, 0], [0.4, 0.03], [0.43, 0.11], [0.43, 1.96], [0.42, 2.08], [0.38, 2.2], [0.3, 2.32], [0.2, 2.43], [0.155, 2.52], [0.152, 2.72], [0.19, 2.75], [0.19, 2.83], [0.15, 2.85], [0, 2.85]];
const STOPPER = [[0, 2.83], [0.2, 2.83], [0.245, 2.88], [0.26, 2.98], [0.235, 3.08], [0.17, 3.13], [0.12, 3.17], [0.125, 3.24], [0.1, 3.3], [0.05, 3.34], [0, 3.35]];
export const BOTTLE_MOUTH = 2.85;
export function makeBottle(bodyMat, stopperMat, labelTex) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(lathe(BODY, 56), bodyMat);
  g.add(body);
  let sg = lathe(STOPPER, 10).toNonIndexed();
  sg.computeVertexNormals();
  const stopper = new THREE.Mesh(sg, stopperMat);
  g.add(stopper);
  let label = null;
  if (labelTex) {
    const lg = new THREE.CylinderGeometry(0.436, 0.436, 1.05, 40, 1, true, -1.05, 2.1);
    label = new THREE.Mesh(lg, new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, alphaTest: 0.3, depthWrite: false }));
    label.position.y = 1.08;
    label.userData.noOutline = true;
    label.userData.noShadow = true;
    label.renderOrder = 2;
    g.add(label);
  }
  return { group: g, body, stopper, label };
}
export function labelTexture(num, name) {
  return canvasTex(768, 384, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#0b0a0a';
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.font = "400 150px 'Yellowtail', cursive";
    g.save();
    g.translate(w / 2, h * 0.56);
    g.rotate(-0.12);
    g.fillText('Sibylle', 0, 0);
    g.restore();
    g.font = "700 40px 'Archivo', sans-serif";
    if ('letterSpacing' in g) g.letterSpacing = '8px';
    g.fillText(`${num} · ${name.toUpperCase()}`, w / 2, h * 0.86);
    g.fillRect(w * 0.3, h * 0.92, w * 0.4, 5);
  });
}

// ------------------------------------------------------------------ the martini glass and its liquid
const GLASS = [[0, 0], [0.62, 0], [0.63, 0.035], [0.5, 0.07], [0.16, 0.11], [0.055, 0.17], [0.045, 1.12], [0.075, 1.22], [0.99, 2.0], [1.0, 2.035], [0.965, 2.035], [0.04, 1.27], [0, 1.27]];
export const GLASS_APEX = 1.27;
export const GLASS_SLOPE = (0.965 - 0.04) / (2.035 - 1.27);
export function makeGlass(glassMat, liquidMat) {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(lathe(GLASS, 64), glassMat);
  g.add(glass);
  const lg = new THREE.ConeGeometry(1, 1, 48, 1, false);
  lg.rotateX(Math.PI);
  lg.translate(0, 0.5, 0); // the apex at y = 0, the surface at y = 1
  const liquid = new THREE.Mesh(lg, liquidMat);
  liquid.position.y = GLASS_APEX + 0.005;
  liquid.userData.noOutline = true;
  g.add(liquid);
  function setFill(f) {
    const h = Math.max(0.001, f * 0.72);
    const r = 0.035 + h * GLASS_SLOPE;
    liquid.scale.set(r, h, r);
    liquid.visible = f > 0.005;
  }
  setFill(0);
  return { group: g, glass, liquid, setFill };
}

// ------------------------------------------------------------------ the coin
export function coinTexture() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#f4f0e6';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#0b0a0a';
    g.fillStyle = '#0b0a0a';
    g.lineWidth = 14;
    g.beginPath();
    g.arc(w / 2, h / 2, 228, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 5;
    g.beginPath();
    g.arc(w / 2, h / 2, 196, 0, Math.PI * 2);
    g.stroke();
    // the crescent
    g.beginPath();
    g.arc(w / 2, h / 2, 104, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f4f0e6';
    g.beginPath();
    g.arc(w / 2 + 44, h / 2 - 22, 92, 0, Math.PI * 2);
    g.fill();
    // three stars
    g.fillStyle = '#0b0a0a';
    for (const [x, y, s] of [[340, 168, 14], [372, 236, 9], [318, 300, 11]]) {
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, rr = i % 2 ? s * 0.38 : s;
        g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.fill();
    }
    g.font = "700 30px 'Archivo', sans-serif";
    g.textAlign = 'center';
    if ('letterSpacing' in g) g.letterSpacing = '10px';
    g.fillText('SIBYLLE', w / 2, h / 2 + 168);
  });
}
export function makeCoin(edgeMat, faceTex) {
  const g = new THREE.Group();
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.07, 56), edgeMat);
  g.add(edge);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.335, 56), new THREE.MeshBasicMaterial({ map: faceTex }));
  face.rotation.x = -Math.PI / 2;
  face.position.y = 0.0352;
  face.userData.noOutline = true;
  face.userData.noShadow = true;
  g.add(face);
  return g;
}

// ------------------------------------------------------------------ columns
function flute(geo, r, n = 20, depth = 0.05) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const rr = Math.hypot(x, z);
    if (rr < r * 0.5) continue;
    const a = Math.atan2(z, x);
    const k = 1 - depth * Math.pow(0.5 + 0.5 * Math.cos(a * n), 2);
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}
// a whole column, base at y = 0: plinth, torus, fluted shaft, echinus, abacus
export function columnGeometry(r = 0.42, h = 6.2) {
  const parts = [];
  const plinth = new THREE.BoxGeometry(r * 2.9, 0.22, r * 2.9);
  plinth.translate(0, 0.11, 0);
  parts.push(plinth);
  const torus = lathe([[0, 0.22], [r * 1.32, 0.22], [r * 1.38, 0.3], [r * 1.3, 0.38], [r * 1.12, 0.42], [0, 0.42]], 36);
  parts.push(torus);
  const shaft = flute(new THREE.CylinderGeometry(r * 0.94, r, h, 60, 8, true), r);
  shaft.translate(0, 0.42 + h / 2, 0);
  parts.push(shaft);
  const y1 = 0.42 + h;
  const ech = lathe([[r * 0.94, y1], [r * 1.12, y1 + 0.12], [r * 1.38, y1 + 0.26], [r * 1.44, y1 + 0.32], [0, y1 + 0.32]], 36);
  parts.push(ech);
  const abacus = new THREE.BoxGeometry(r * 3.1, 0.24, r * 3.1);
  abacus.translate(0, y1 + 0.44, 0);
  parts.push(abacus);
  const merged = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  merged.computeVertexNormals();
  return { geo: merged, top: y1 + 0.56 };
}
// a broken drum of the shaft: jagged at one or both ends
export function brokenDrum(r, len, seed, topJag = true, botJag = true) {
  const R = rng(seed);
  const g = flute(new THREE.CylinderGeometry(r * 0.97, r, len, 48, 4, false), r);
  const ph = R() * 10, ph2 = R() * 10;
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const rr = Math.hypot(x, z);
    const jag = (s) => (0.5 * Math.sin(a * 3 + s) + 0.3 * Math.sin(a * 7 + s * 2) + 0.2 * Math.sin(a * 13 + s * 3)) * r * 0.55;
    if (topJag && y > len / 2 - 1e-4) p.setY(i, y + (rr < 1e-3 ? r * 0.25 : jag(ph)));
    if (botJag && y < -len / 2 + 1e-4) p.setY(i, y + (rr < 1e-3 ? -r * 0.25 : jag(ph2)));
  }
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------------ the robed figure, from behind
// facing -z (walking away from a camera at +z), feet at y = 0, about 2.05 tall
export function makeFigure(robeMat, hairMat) {
  const g = new THREE.Group();
  const prof = [[0, 0.01], [0.48, 0.0], [0.54, 0.05], [0.49, 0.3], [0.43, 0.7], [0.37, 1.05], [0.34, 1.25], [0.38, 1.42], [0.44, 1.54], [0.44, 1.62], [0.36, 1.68], [0.2, 1.74], [0.09, 1.78], [0, 1.79]];
  const rg = lathe(prof, 64);
  const p = rg.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const fold = 1 + 0.06 * Math.sin(a * 9 + y * 1.6) * clamp((1.5 - y) / 1.2) + 0.025 * Math.sin(a * 17 - y * 3);
    const sw = y < 1.2 ? 1.08 : y < 1.62 ? mix(1.08, 1.34, smooth((y - 1.2) / 0.42)) : mix(1.34, 1.0, clamp((y - 1.62) / 0.17));
    x *= fold * sw;
    z *= fold * 0.78;
    p.setXYZ(i, x, y, z);
  }
  rg.computeVertexNormals();
  const robe = new THREE.Mesh(rg, robeMat);
  g.add(robe);
  // the head and the long hair down the back
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.125, 24, 16), hairMat);
  head.position.set(0, 1.9, 0);
  head.scale.set(1, 1.12, 1.02);
  g.add(head);
  const hairProf = [[0.0, 2.04], [0.1, 2.03], [0.14, 1.96], [0.16, 1.86], [0.18, 1.72], [0.22, 1.56], [0.26, 1.4], [0.27, 1.32], [0.2, 1.3]];
  const hg = lathe(hairProf, 32, -1.75, 3.5);
  const hp = hg.attributes.position;
  for (let i = 0; i < hp.count; i++) hp.setZ(i, hp.getZ(i) * 0.72 + 0.03);
  hg.computeVertexNormals();
  const hair = new THREE.Mesh(hg, hairMat);
  g.add(hair);
  return { group: g, robe, head, hair };
}

// hair strands that flow in the wind (the silhouette before the moon): ribbons bent in the shader
export function strandMaterial(G, phase) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: G.uTime, uPhase: { value: phase }, uInkC: G.uInkC },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPhase;
      void main() {
        vec3 p = position;
        float t = p.x;
        p.y *= 1.0 - t * 0.85;
        p.y += sin(t * 4.2 - uTime * 2.0 + uPhase) * 0.22 * t - t * t * 0.18;
        p.z += cos(t * 3.0 - uTime * 1.5 + uPhase) * 0.05 * t;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uInkC;
      void main() { gl_FragColor = vec4(uInkC, 1.0);
      #include <colorspace_fragment>
      }`,
    side: THREE.DoubleSide,
  });
}

// ------------------------------------------------------------------ balusters
export function balusterGeometry() {
  return lathe([[0, 0], [0.2, 0], [0.2, 0.1], [0.12, 0.16], [0.1, 0.3], [0.19, 0.54], [0.21, 0.7], [0.14, 0.95], [0.08, 1.07], [0.1, 1.17], [0.17, 1.23], [0.17, 1.33], [0, 1.33]], 28);
}
