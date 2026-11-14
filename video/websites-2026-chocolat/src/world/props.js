// MÉDINA: the props and their textures, all procedural. The mould, the bar (two halves: a slab and
// four chamfered squares each, a cross-section of the green heart for the snap), gold leaf, the
// steel bowl, liquid streams rebuilt every frame (a tube along a moving curve), the coiled rope of
// pistachio cream, the boxes of the collection (canvas), the leaf pattern of the green background.
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
export const easeInOut = (t) => {
  t = clamp(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
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
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export function canvasTex(w, h, draw, { srgb = true, repeat = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
// a tangent-space normal map from a height function h(u, v) in 0..1 (tiling)
export function normalMap(size, height, strength = 2) {
  const H = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) H[y * size + x] = height(x / size, y / size);
  const data = new Uint8Array(size * size * 4);
  const at = (x, y) => H[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      const k = (y * size + x) * 4;
      data[k] = ((-dx / l) * 0.5 + 0.5) * 255;
      data[k + 1] = ((-dy / l) * 0.5 + 0.5) * 255;
      data[k + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      data[k + 3] = 255;
    }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}
// tileable value noise for the height maps
export function noise2(seed = 1, cells = 16) {
  const R = rng(seed);
  const g = new Float32Array(cells * cells).map(() => R());
  const at = (x, y) => g[((y % cells) + cells) % cells * cells + (((x % cells) + cells) % cells)];
  return (u, v) => {
    const x = u * cells, y = v * cells, xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return mix(mix(at(xi, yi), at(xi + 1, yi), sx), mix(at(xi, yi + 1), at(xi + 1, yi + 1), sx), sy);
  };
}

// ------------------------------------------------------------------ the mould
export function makeMould(mat) {
  const g = new THREE.Group();
  const add = (geo, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  };
  add(new RoundedBoxGeometry(17.6, 0.45, 9.6, 3, 0.2), 0, 0.22, 0);
  add(new RoundedBoxGeometry(17.6, 2.05, 0.8, 3, 0.3), 0, 1.0, -4.4);
  add(new RoundedBoxGeometry(17.6, 2.05, 0.8, 3, 0.3), 0, 1.0, 4.4);
  add(new RoundedBoxGeometry(0.8, 2.05, 8.4, 3, 0.3), -8.4, 1.0, 0);
  add(new RoundedBoxGeometry(0.8, 2.05, 8.4, 3, 0.3), 8.4, 1.0, 0);
  return g;
}

// ------------------------------------------------------------------ the bar
// 16 long (x), 8 deep (z), 1.5 high; two halves (z < 0, z > 0), each a slab and four squares
export const BAR = { L: 16, D: 8, slab: 1.0, top: 1.5 };
function piece() {
  const s = new THREE.Shape();
  const w = 3.0, h = 2.9, r = 0.25;
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.34, bevelSize: 0.36, bevelSegments: 3, curveSegments: 6 });
  g.rotateX(-Math.PI / 2);
  return g;
}
export function makeBar(mat, crossTex, goldMat) {
  const group = new THREE.Group();
  const halves = [-1, 1].map((sz) => {
    const parts = [];
    const slab = new RoundedBoxGeometry(BAR.L, BAR.slab, BAR.D / 2, 3, 0.16);
    slab.translate(0, BAR.slab / 2, (sz * BAR.D) / 4);
    parts.push(slab.index ? slab.toNonIndexed() : slab);
    for (let i = 0; i < 4; i++) {
      const p = piece();
      p.translate(-6 + i * 4, BAR.slab - 0.3, sz * 2);
      parts.push(p.index ? p.toNonIndexed() : p);
    }
    const geo = mergeGeometries(parts.map((p) => {
      const q = p.clone();
      q.deleteAttribute('uv');
      return q;
    }));
    geo.computeVertexNormals();
    const half = new THREE.Group();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    half.add(mesh);
    // the break: a face at z = 0, the shell round the green heart
    const cross = new THREE.Mesh(new THREE.PlaneGeometry(BAR.L - 0.2, BAR.slab - 0.06), new THREE.MeshStandardMaterial({ map: crossTex, roughness: 0.75, metalness: 0 }));
    cross.position.set(0, BAR.slab / 2, sz * -0.004);
    cross.rotation.y = sz < 0 ? 0 : Math.PI;
    half.add(cross);
    // gold leaf on the squares
    const R = rng(sz < 0 ? 31 : 47);
    const flakeG = flakeGeometry(5);
    const n = 46;
    const flakes = new THREE.InstancedMesh(flakeG, goldMat, n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), pos = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const col = Math.floor(R() * 4);
      pos.set(-6 + col * 4 + (R() - 0.5) * 2.6, BAR.top + 0.012, sz * 2 + (R() - 0.5) * 2.3);
      e.set(-Math.PI / 2 + (R() - 0.5) * 0.25, (R() - 0.5) * 0.25, R() * 6.28);
      q.setFromEuler(e);
      const k = 0.5 + R() * 1.1;
      s.set(k, k, k);
      flakes.setMatrixAt(i, m4.compose(pos, q, s));
    }
    half.add(flakes);
    group.add(half);
    return { group: half, mesh, cross, flakes, sz };
  });
  return { group, halves };
}
// a ragged gold flake (about 0.25 across)
export function flakeGeometry(seed) {
  const R = rng(seed);
  const s = new THREE.Shape();
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 0.1 + R() * 0.12;
    const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.8;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  return new THREE.ShapeGeometry(s);
}
// the cross-section: a chocolate shell round the pistachio and the kadaïf strands
export function crossTexture() {
  return canvasTex(2048, 128, (g, w, h) => {
    g.fillStyle = '#4a230f';
    g.fillRect(0, 0, w, h);
    const R = rng(9);
    const top = h * 0.2, bot = h * 0.82;
    g.fillStyle = '#7d8f12';
    g.fillRect(10, top, w - 20, bot - top);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = R() < 0.5 ? 'rgba(160,178,40,0.9)' : 'rgba(84,104,10,0.85)';
      g.fillRect(10 + R() * (w - 20), top + R() * (bot - top), 2 + R() * 5, 2 + R() * 4);
    }
    g.lineCap = 'round';
    for (let i = 0; i < 420; i++) {
      const x = 10 + R() * (w - 30), y = top + 4 + R() * (bot - top - 8);
      g.strokeStyle = R() < 0.6 ? 'rgba(222,178,86,0.95)' : 'rgba(176,128,52,0.9)';
      g.lineWidth = 1.5 + R() * 2;
      g.beginPath();
      g.moveTo(x, y);
      g.bezierCurveTo(x + 10 + R() * 20, y - 6 + R() * 12, x + 20 + R() * 20, y - 6 + R() * 12, x + 30 + R() * 30, y - 4 + R() * 8);
      g.stroke();
    }
    // the shell's inner edge, a little ragged
    g.fillStyle = '#4a230f';
    for (let x = 0; x < w; x += 6) {
      g.fillRect(x, top - 2, 6, 1 + R() * 5);
      g.fillRect(x, bot - 3, 6, 1 + R() * 5);
    }
  });
}

// the settled pistachio and kadaïf: olive paste, pale and dark grains, golden strands
export function pasteTexture() {
  return canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#7f8a12';
    g.fillRect(0, 0, w, h);
    const R = rng(13);
    for (let i = 0; i < 9000; i++) {
      const k = R();
      g.fillStyle = k < 0.45 ? 'rgba(170,178,40,0.85)' : k < 0.8 ? 'rgba(92,104,8,0.85)' : 'rgba(205,190,90,0.8)';
      const s = 1.5 + R() * 4;
      g.fillRect(R() * w, R() * h, s, s * (0.6 + R() * 0.8));
    }
    g.lineCap = 'round';
    for (let i = 0; i < 900; i++) {
      const x = R() * w, y = R() * h;
      g.strokeStyle = R() < 0.6 ? 'rgba(214,170,78,0.95)' : 'rgba(160,120,48,0.9)';
      g.lineWidth = 1 + R() * 1.8;
      g.beginPath();
      g.moveTo(x, y);
      g.bezierCurveTo(x + 8 + R() * 14, y - 8 + R() * 16, x + 14 + R() * 16, y - 8 + R() * 16, x + 22 + R() * 22, y - 6 + R() * 12);
      g.stroke();
    }
  }, { repeat: true });
}

// ------------------------------------------------------------------ the bowl
const BOWL = [[0, 0], [1.6, 0.05], [2.8, 0.4], [3.7, 1.1], [4.3, 2.1], [4.52, 2.95], [4.56, 3.05], [4.4, 3.05], [4.2, 2.2], [3.58, 1.25], [2.7, 0.6], [1.5, 0.26], [0, 0.2]];
export function makeBowl(mat, creamMat) {
  const g = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(BOWL.map(([r, y]) => new THREE.Vector2(r, y)), 72), mat);
  bowl.castShadow = true;
  g.add(bowl);
  // the cream inside, heaped against the lip it pours from
  const cg = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
  cg.scale(4.15, 1.1, 4.15);
  const cream = new THREE.Mesh(cg, creamMat);
  cream.position.set(0, 1.9, 0);
  cream.rotation.z = -0.95;
  g.add(cream);
  return { group: g, lip: V3(-4.48, 3.0, 0) };
}

// ------------------------------------------------------------------ a stream: a tube along a moving curve
export function makeStream(mat, radial = 16, segs = 72) {
  const verts = (segs + 1) * (radial + 1);
  const pos = new Float32Array(verts * 3), nor = new Float32Array(verts * 3), uv = new Float32Array(verts * 2);
  const idx = [];
  for (let i = 0; i < segs; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = (i + 1) * (radial + 1) + j;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  for (let i = 0; i <= segs; i++)
    for (let j = 0; j <= radial; j++) {
      const k = (i * (radial + 1) + j) * 2;
      uv[k] = j / radial;
      uv[k + 1] = i / segs;
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  const curve = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0, -1, 0)], false, 'centripetal');
  const P = new THREE.Vector3(), T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), N0 = new THREE.Vector3(), up = new THREE.Vector3();
  // points: the curve's control points; rad(s): the radius along it (s 0..1); wob(s, out): an offset
  function set(points, rad) {
    curve.points = points;
    curve.updateArcLengths();
    for (let i = 0; i <= segs; i++) {
      const s = i / segs;
      curve.getPointAt(s, P);
      curve.getTangentAt(s, T);
      if (i === 0) {
        up.set(0, 0, 1);
        if (Math.abs(T.z) > 0.9) up.set(1, 0, 0);
        N.crossVectors(T, up).normalize();
      } else {
        N.copy(N0).addScaledVector(T, -N0.dot(T)).normalize();
      }
      N0.copy(N);
      B.crossVectors(T, N);
      const r = rad(s);
      for (let j = 0; j <= radial; j++) {
        const a = (j / radial) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        const nx = N.x * ca + B.x * sa, ny = N.y * ca + B.y * sa, nz = N.z * ca + B.z * sa;
        const k = (i * (radial + 1) + j) * 3;
        pos[k] = P.x + nx * r;
        pos[k + 1] = P.y + ny * r;
        pos[k + 2] = P.z + nz * r;
        nor[k] = nx;
        nor[k + 1] = ny;
        nor[k + 2] = nz;
      }
    }
    g.attributes.position.needsUpdate = true;
    g.attributes.normal.needsUpdate = true;
  }
  return { mesh, set };
}

// ------------------------------------------------------------------ the coiled rope of cream
// a thick rope laid in loops over the mould, rising slowly: drawn up to the pour's progress
export function makeCoils(mat, seed = 3) {
  const R = rng(seed);
  const N = 2600;
  const pts = [];
  const ph = R() * 6;
  // the pour point sweeps the mould (cx, cz); the rope's foot runs in small loops under it
  const cxAt = (t) => 4.6 * Math.cos(t * Math.PI * 2.2) * (1 - 0.25 * t);
  const czAt = (t) => 1.7 * Math.sin(t * Math.PI * 3.1 + 0.4);
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = t * 30 * Math.PI * 2 + ph;
    const rad = 0.85 + 0.5 * t + 0.22 * Math.sin(t * 47);
    const x = clamp(cxAt(t) + Math.cos(a) * rad * 1.35, -7.25, 7.25);
    const z = clamp(czAt(t) + Math.sin(a) * rad, -3.35, 3.35);
    const y = 0.95 + 0.7 * t + 0.28 * Math.max(0, Math.sin(a * 0.5 + t * 9));
    pts.push(V3(x, y, z));
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const segs = 3600, radial = 14;
  const geo = new THREE.TubeGeometry(curve, segs, 0.66, radial, false);
  // a little flatter than round: piped cream settles
  const p = geo.attributes.position;
  const c = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    curve.getPointAt(i / segs, c);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      p.setY(k, c.y + (p.getY(k) - c.y) * 0.72);
    }
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const head = new THREE.Vector3();
  let last = 0;
  function setProgress(k) {
    const s = Math.max(1, Math.floor(clamp(k) * segs));
    geo.setDrawRange(0, s * radial * 6);
    mesh.visible = k > 0.002;
    last = clamp(k);
    curve.getPointAt(Math.min(1, s / segs), head);
    return head;
  }
  const centre = (out) => out.set(cxAt(last), 0, czAt(last));
  setProgress(0);
  return { mesh, setProgress, centre, curve };
}

// ------------------------------------------------------------------ the boxes of the collection
export function boxTexture(b) {
  return canvasTex(640, 900, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w * 0.3, h);
    gr.addColorStop(0, b.c1);
    gr.addColorStop(1, b.c2);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    const rg = g.createRadialGradient(w * 0.5, h * 0.42, 10, w * 0.5, h * 0.42, w * 0.75);
    rg.addColorStop(0, 'rgba(255,240,200,0.28)');
    rg.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = b.ink;
    g.globalAlpha = 0.75;
    g.lineWidth = 2;
    g.strokeRect(22, 22, w - 44, h - 44);
    g.lineWidth = 1;
    g.strokeRect(30, 30, w - 60, h - 60);
    g.globalAlpha = 1;
    g.fillStyle = b.ink;
    g.textAlign = 'center';
    // the monogram
    g.beginPath();
    g.arc(w / 2, 104, 30, 0, Math.PI * 2);
    g.lineWidth = 2;
    g.stroke();
    g.font = "500 36px 'Bodoni Moda', serif";
    g.fillText('M', w / 2, 117);
    g.font = "600 15px 'Archivo', sans-serif";
    if ('letterSpacing' in g) g.letterSpacing = '6px';
    g.fillText('MAISON MÉDINA', w / 2, 170);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    g.font = "italic 400 30px 'EB Garamond', serif";
    g.fillText(b.line, w / 2, 262);
    // the name: outlined capitals
    g.font = "500 132px 'Bodoni Moda', serif";
    let size = 132;
    while (g.measureText(b.name).width > w - 90 && size > 60) {
      size -= 6;
      g.font = `500 ${size}px 'Bodoni Moda', serif`;
    }
    g.lineWidth = 3;
    g.strokeStyle = b.ink;
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillText(b.name, w / 2, 400);
    g.strokeText(b.name, w / 2, 400);
    // three bars, stacked
    for (let i = 0; i < 3; i++) {
      const y = 520 + i * 52, x0 = 190 - i * 14, x1 = 450 + i * 6;
      g.save();
      g.translate(w / 2, y);
      g.rotate(-0.18 + i * 0.07);
      g.translate(-w / 2, -y);
      g.fillStyle = i === 1 ? '#7a3a16' : '#5a2a10';
      g.fillRect(x0, y, x1 - x0, 30);
      g.fillStyle = b.ink;
      g.fillRect(x0, y, x1 - x0, 5);
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.lineWidth = 2;
      for (let k = 1; k < 4; k++) {
        g.beginPath();
        g.moveTo(x0 + ((x1 - x0) * k) / 4, y + 5);
        g.lineTo(x0 + ((x1 - x0) * k) / 4, y + 30);
        g.stroke();
      }
      g.restore();
    }
    g.fillStyle = b.ink;
    g.font = "italic 400 30px 'EB Garamond', serif";
    g.fillText(b.flavor, w / 2, 760);
    g.font = "600 14px 'Archivo', sans-serif";
    if ('letterSpacing' in g) g.letterSpacing = '5px';
    g.fillText('CHOCOLAT AU LAIT · 100 G', w / 2, 820);
  });
}

// ------------------------------------------------------------------ the leaf pattern of the green
export function leafTexture() {
  return canvasTex(1024, 1024, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const R = rng(17);
    g.strokeStyle = 'rgba(160, 230, 170, 0.5)';
    g.lineCap = 'round';
    const leaf = (x, y, a, L, W) => {
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, 0);
      g.bezierCurveTo(L * 0.3, -W, L * 0.75, -W * 0.8, L, 0);
      g.bezierCurveTo(L * 0.75, W * 0.8, L * 0.3, W, 0, 0);
      g.stroke();
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(-L * 0.12, 0);
      g.lineTo(L * 0.96, 0);
      g.stroke();
      for (let k = 1; k < 7; k++) {
        const t = k / 7;
        g.beginPath();
        g.moveTo(L * t, 0);
        g.quadraticCurveTo(L * (t + 0.06), -W * 0.4, L * (t + 0.12), -W * 0.7 * Math.sin(Math.PI * Math.min(1, t + 0.1)));
        g.moveTo(L * t, 0);
        g.quadraticCurveTo(L * (t + 0.06), W * 0.4, L * (t + 0.12), W * 0.7 * Math.sin(Math.PI * Math.min(1, t + 0.1)));
        g.stroke();
      }
      g.restore();
    };
    const pod = (x, y, a, L) => {
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(0, 0, L / 2, L / 4.2, 0, 0, Math.PI * 2);
      g.stroke();
      g.lineWidth = 1.2;
      for (let k = -2; k <= 2; k++) {
        g.beginPath();
        g.ellipse(0, 0, L / 2 - 4, (L / 4.2) * Math.abs(k / 2.6), 0, 0, Math.PI * 2);
        g.stroke();
      }
      g.restore();
    };
    for (let i = 0; i < 22; i++) {
      const x = R() * w, y = R() * h;
      for (const [dx, dy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) leaf(x + dx, y + dy, R() * 6.28, 150 + R() * 110, 40 + R() * 22);
    }
    for (let i = 0; i < 5; i++) {
      const x = R() * w, y = R() * h;
      for (const [dx, dy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) pod(x + dx, y + dy, R() * 6.28, 120 + R() * 50);
    }
  }, { repeat: true });
}
