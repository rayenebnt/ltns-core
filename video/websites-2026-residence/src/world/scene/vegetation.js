// Painted vegetation: an atlas of Mediterranean trees painted on canvas at load time,
// drawn as camera-facing cards (one instanced draw call, 2 triangles per tree).
import * as THREE from 'three';
import { mulberry32 } from './noise.js';
import { coastSD, landHeight, quayMask } from './terrain.js';


function paintPine(ctx, ox, oy, w, h, seed) {
  const rnd = mulberry32(seed);
  const cx = ox + w / 2 + (rnd() - 0.5) * w * 0.08;
  // trunk with a lean and a few branches
  const lean = (rnd() - 0.5) * 60;
  const topY = oy + h * (0.44 + rnd() * 0.06);
  ctx.lineCap = 'round';
  for (const [col, wd, dx] of [['#2a211c', 14, 0], ['#5c4636', 4, 4]]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = wd;
    ctx.beginPath();
    ctx.moveTo(cx + dx, oy + h);
    ctx.quadraticCurveTo(cx + lean * 0.3 + dx, oy + h * 0.72, cx + lean + dx, topY);
    ctx.stroke();
  }
  ctx.strokeStyle = '#2a211c';
  for (let i = 0; i < 6; i++) {
    const sx = cx + lean * (0.75 + rnd() * 0.25), sy = topY + rnd() * h * 0.06;
    const ex = cx + lean * 0.5 + (rnd() - 0.5) * w * 0.7, ey = oy + h * (0.3 + rnd() * 0.1);
    ctx.lineWidth = 2.5 + rnd() * 4;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo((sx + ex) / 2, sy - 12, ex, ey);
    ctx.stroke();
  }
  // irregular canopy: 3-5 overlapping flat-topped lobes
  const lobes = [];
  const nl = 3 + ((rnd() * 3) | 0);
  for (let i = 0; i < nl; i++) {
    const lx = cx + lean * 0.6 + (rnd() - 0.5) * w * 0.5;
    const lw = w * (0.16 + rnd() * 0.16);
    const lt = oy + h * (0.1 + rnd() * 0.12);
    const lh = h * (0.12 + rnd() * 0.08);
    lobes.push([lx, lw, lt, lh]);
  }
  const inLobe = (x, y) => {
    for (const [lx, lw, lt, lh] of lobes) {
      const u = (x - lx) / lw;
      if (Math.abs(u) > 1) continue;
      const top = lt + lh * 0.35 * u * u;
      const bot = lt + lh - lh * 0.25 * u * u;
      if (y > top && y < bot) return (y - top) / (bot - top);
    }
    return -1;
  };
  const x0 = Math.min(...lobes.map((l) => l[0] - l[1])), x1 = Math.max(...lobes.map((l) => l[0] + l[1]));
  const y0 = Math.min(...lobes.map((l) => l[2])), y1 = Math.max(...lobes.map((l) => l[2] + l[3]));
  for (let i = 0; i < 5200; i++) {
    const x = x0 + rnd() * (x1 - x0);
    const y = y0 + rnd() * (y1 - y0);
    const vy = inLobe(x, y);
    if (vy < 0) continue;
    // soft top light, deep shade underneath, a warm backlit rim on the very top edge
    const lit = Math.max(0, Math.min(1, 0.7 - vy * 1.1 + (rnd() - 0.5) * 0.45));
    let r = 14 + lit * 50 + rnd() * 8;
    let g = 26 + lit * 62 + rnd() * 8;
    let b = 22 + lit * 40 + rnd() * 6;
    if (vy < 0.12 && rnd() < 0.7) {
      const k = (1 - vy / 0.12) * (0.5 + rnd() * 0.5);
      r += 120 * k; g += 70 * k; b += 18 * k;
    }
    ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${0.75 + rnd() * 0.25})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 4 + rnd() * 8, 3 + rnd() * 5, rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintCypress(ctx, ox, oy, w, h, seed) {
  const rnd = mulberry32(seed);
  const cx = ox + w / 2;
  for (let i = 0; i < 2600; i++) {
    const y = oy + h * 0.03 + rnd() * h * 0.95;
    const v = (y - oy) / h; // 0 top .. 1 bottom
    const prof = Math.sin(Math.min(1, v * 1.08) * Math.PI * 0.62) * (0.42 - 0.12 * Math.max(0, v - 0.85) * 4);
    const x = cx + (rnd() * 2 - 1) * w * prof;
    const vx = (x - cx) / (w * 0.42 + 1e-3);
    const lit = Math.max(0, Math.min(1, 0.45 + vx * 0.2 - v * 0.3 + (rnd() - 0.5) * 0.4));
    const rim = Math.abs(vx) > 0.75 && v < 0.6 ? 0.5 : 0;
    ctx.fillStyle = `rgba(${(12 + lit * 44 + rim * 70) | 0},${(24 + lit * 54 + rim * 40) | 0},${(20 + lit * 34 + rim * 10) | 0},${0.8 + rnd() * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 3 + rnd() * 5, 4 + rnd() * 7, rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintShrub(ctx, ox, oy, w, h, seed) {
  const rnd = mulberry32(seed);
  const cx = ox + w / 2;
  for (let i = 0; i < 1500; i++) {
    const a = rnd() * Math.PI, rr = Math.sqrt(rnd());
    const x = cx + Math.cos(a) * rr * w * 0.46;
    const y = oy + h - Math.sin(a) * rr * h * 0.82 - 4;
    const lit = Math.max(0, Math.min(1, 0.55 - (y - oy) / h * 0.5 + (rnd() - 0.5) * 0.5));
    const tint = rnd();
    const r = (tint > 0.85 ? 58 : 18) + lit * 52, g = 28 + lit * 58, b = 22 + lit * 34;
    ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${0.8 + rnd() * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 3 + rnd() * 6, 3 + rnd() * 4, rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Mediterranean date palm: a ringed, slightly leaning trunk and a crown of arching feathery
// fronds (drawn as filled, serrated shapes so they survive mipmapping at a distance), lit warm
// from the low sun, with a couple of dry fronds hanging under the crown
function paintPalm(ctx, ox, oy, w, h, seed) {
  const rnd = mulberry32(seed);
  const cx0 = ox + w * 0.5 + (rnd() - 0.5) * w * 0.05;
  const lean = (rnd() - 0.5) * w * 0.2;
  const topY = oy + h * (0.27 + rnd() * 0.03);
  const cx = cx0 + lean;
  const N = 90;
  const segH = (oy + h - topY) / N;
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const y = oy + h - t * (oy + h - topY);
    const x = cx0 + lean * t * t;
    const half = 6.2 - 2.4 * t;
    const ring = Math.sin(t * 95) > 0.55 ? 0.78 : 1.0;
    ctx.fillStyle = `rgb(${(104 * ring) | 0},${(90 * ring) | 0},${(74 * ring) | 0})`;
    ctx.fillRect(x - half, y - segH - 1, half * 2, segH + 2);
    ctx.fillStyle = `rgba(214,176,124,${0.6 * ring})`;
    ctx.fillRect(x + half * 0.15, y - segH - 1, half * 0.62, segH + 2);
  }
  const frond = (a, L, droop, rise, dry) => {
    const ex = Math.cos(a), dz = Math.sin(a);
    const pts = 34;
    const C = [];
    for (let i = 0; i <= pts; i++) {
      const s = i / pts;
      C.push([cx + ex * L * s * (0.85 + 0.15 * Math.abs(ex)), topY - L * rise * s + L * droop * s * s]);
    }
    const up = [], lo = [];
    for (let i = 0; i <= pts; i++) {
      const s = i / pts;
      const [x, y] = C[i];
      const [x2, y2] = C[Math.min(pts, i + 1)], [x1, y1] = C[Math.max(0, i - 1)];
      let nx = -(y2 - y1), ny = x2 - x1;
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl;
      ny /= nl;
      if (ny > 0) { nx = -nx; ny = -ny; } // the "upper" side faces up
      const hw = L * 0.15 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.08)), 0.7) * (0.55 + 0.45 * Math.abs(dz) + 0.25 * Math.abs(ex));
      const serr = i % 2 ? 0.62 : 1.0;
      up.push([x + nx * hw * serr, y + ny * hw * serr]);
      lo.push([x - nx * hw * serr * 0.9, y - ny * hw * serr * 0.9]);
    }
    const back = dz < 0 ? 0.72 : 1.0;
    const base = dry ? [118, 92, 58] : [34 + rnd() * 10, 62 + rnd() * 12, 32 + rnd() * 8];
    ctx.fillStyle = `rgb(${(base[0] * back) | 0},${(base[1] * back) | 0},${(base[2] * back) | 0})`;
    ctx.beginPath();
    ctx.moveTo(up[0][0], up[0][1]);
    for (const [x, y] of up) ctx.lineTo(x, y);
    for (let i = lo.length - 1; i >= 0; i--) ctx.lineTo(lo[i][0], lo[i][1]);
    ctx.closePath();
    ctx.fill();
    if (!dry) {
      // warm low sun on the upper side of the frond
      ctx.fillStyle = `rgba(${(150 * back) | 0},${(146 * back) | 0},${(70 * back) | 0},0.55)`;
      ctx.beginPath();
      ctx.moveTo(up[0][0], up[0][1]);
      for (const [x, y] of up) ctx.lineTo(x, y);
      for (let i = C.length - 1; i >= 0; i--) ctx.lineTo(C[i][0], C[i][1]);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = dry ? 'rgba(150,120,80,0.9)' : `rgba(${(120 * back) | 0},${(128 * back) | 0},${(70 * back) | 0},0.9)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(C[0][0], C[0][1]);
    for (const [x, y] of C) ctx.lineTo(x, y);
    ctx.stroke();
  };
  // two dry fronds hanging under the crown
  for (let i = 0; i < 2; i++) frond(Math.PI * (i ? 0.15 : 0.85) + (rnd() - 0.5) * 0.3, h * 0.17, 0.9, 0.05, true);
  // green fronds, back to front
  const fr = [];
  const n = 15;
  for (let i = 0; i < n; i++) fr.push(((i + rnd() * 0.6) / n) * Math.PI * 2);
  fr.sort((a, b) => Math.sin(a) - Math.sin(b));
  for (const a of fr) frond(a, h * (0.2 + rnd() * 0.06), 0.45 + rnd() * 0.45, 0.22 + rnd() * 0.15, false);
  ctx.fillStyle = 'rgb(58,54,40)';
  ctx.beginPath();
  ctx.ellipse(cx, topY + 4, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
}

// cells as [u0, v0, du, dv] in texture space (v up)
export function vegetationAtlas() {
  const AW = 2048, AH = 1024;
  const c = document.createElement('canvas');
  c.width = AW;
  c.height = AH;
  const ctx = c.getContext('2d');
  const cells = { pine: [], cypress: [], shrub: [], palm: [] };
  const cell = (x, y, w, h) => [x / AW, 1 - (y + h) / AH, w / AW, h / AH];
  for (let i = 0; i < 4; i++) {
    paintPine(ctx, i * 512, 0, 512, 512, 11 + i * 12);
    cells.pine.push(cell(i * 512, 0, 512, 512));
  }
  paintPine(ctx, 1024, 512, 512, 512, 71);
  cells.pine.push(cell(1024, 512, 512, 512));
  for (let i = 0; i < 2; i++) {
    paintPalm(ctx, 1536 + i * 256, 512, 256, 512, 90 + i * 7);
    cells.palm.push(cell(1536 + i * 256, 512, 256, 512));
  }
  for (let i = 0; i < 4; i++) {
    paintCypress(ctx, i * 128, 512, 128, 512, 40 + i);
    cells.cypress.push(cell(i * 128, 512, 128, 512));
  }
  for (let i = 0; i < 4; i++) {
    const x = 512 + (i % 2) * 256, y = 512 + Math.floor(i / 2) * 256;
    paintShrub(ctx, x, y + 96, 256, 160, 60 + i);
    cells.shrub.push(cell(x, y + 96, 256, 160));
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, cells };
}

export function createVegetation({ count = 420, shrubs = 700, far = 2600, dense = 2000, palms = [] }) {
  const { tex, cells } = vegetationAtlas();
  const rnd = mulberry32(17);
  const items = []; // [x, y, z, w, h, cell]
  let tries = 0;
  // umbrella pines in clusters on the cape and along the nearby coast
  while (items.length < count && tries < 50000) {
    tries++;
    const x = -650 + rnd() * 760;
    const z = -820 + rnd() * 1000;
    if (Math.hypot(x, z) < 36) continue;
    const sd = coastSD(x, z);
    if (sd < 7 || sd > 700) continue;
    const h = landHeight(x, z, sd);
    if (h < 1.5 || h > 70) continue;
    const cl = Math.sin(x * 0.021 + 1.3) * Math.sin(z * 0.017 - 0.4) + Math.sin(x * 0.043 - z * 0.031) * 0.5 + Math.sin(x * 0.09 + z * 0.07) * 0.25;
    if (cl < 0.35 + rnd() * 0.45) continue; // dense clumps, few lone trees
    const s = 0.7 + rnd() * 0.55;
    items.push([x, h - 0.4, z, 13 * s, 13 * s, cells.pine[(rnd() * cells.pine.length) | 0]]);
  }
  // cypresses around the tower garden
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2, r = 40 + rnd() * 60;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const sd = coastSD(x, z);
    if (sd < 8 || (sd < 18 && quayMask(x, z) > 0.05)) continue;
    const s = 0.75 + rnd() * 0.35;
    items.push([x, landHeight(x, z, sd) - 0.3, z, 3.0 * s, 11.5 * s, cells.cypress[(rnd() * 4) | 0]]);
  }
  // low maquis shrubs filling the ground
  tries = 0;
  let nb = 0;
  while (nb < shrubs && tries < 60000) {
    tries++;
    const x = -700 + rnd() * 820;
    const z = -900 + rnd() * 1080;
    if (Math.hypot(x, z) < 30) continue;
    const sd = coastSD(x, z);
    if (sd < 4 || sd > 800) continue;
    if (sd < 18 && quayMask(x, z) > 0.05) continue; // the marina quay terrace stays clear
    const h = landHeight(x, z, sd);
    if (h < 1 || h > 90) continue;
    const s = 0.7 + rnd() * 0.9;
    items.push([x, h - 0.2, z, 3.6 * s, 2.2 * s, cells.shrub[(rnd() * 4) | 0]]);
    nb++;
  }

  // palms along the marina quay (positions from marina.js)
  for (const [x, y, z, sc] of palms) items.push([x, y - 0.1, z, 6.2 * sc, 12.4 * sc, cells.palm[(rnd() * cells.palm.length) | 0]]);

  // a second, darker maquis pass on the cape and the nearby coast (60-350 m from the tower):
  // dense scrub instead of bare khaki slopes; the quay terrace of the marina stays clear
  tries = 0;
  let nd = 0;
  while (nd < dense && tries < dense * 25) {
    tries++;
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(60 * 60 + rnd() * (350 * 350 - 60 * 60));
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const sd = coastSD(x, z);
    if (sd < 4) continue;
    if (sd < 18 && quayMask(x, z) > 0.05) continue;
    const h = landHeight(x, z, sd);
    if (h < 1) continue;
    const s = 0.55 + rnd() * 0.85;
    items.push([x, h - 0.25, z, 3.4 * s, 2.1 * s, cells.shrub[(rnd() * 4) | 0], 0.5 + rnd() * 0.25]);
    nd++;
  }

  // scattered pines and maquis over the hills, so they do not read as bare lawns
  tries = 0;
  let nf = 0;
  while (nf < far && tries < far * 12) {
    tries++;
    const ang = (-150 + rnd() * 175) * Math.PI / 180;
    const dist = 450 + Math.pow(rnd(), 0.8) * 3600;
    const x = Math.sin(ang) * dist, z = -Math.cos(ang) * dist;
    const sd = coastSD(x, z);
    if (sd < 25) continue;
    const h = landHeight(x, z, sd);
    if (h < 3 || h > 520) continue;
    const cl = Math.sin(x * 0.006 + 2.1) * Math.sin(z * 0.0075 - 1.2) + 0.6 * Math.sin(x * 0.017 + z * 0.013);
    if (cl < -0.2 + rnd() * 0.6) continue;
    const pine = rnd() < 0.55;
    const s = 0.75 + rnd() * 0.5;
    if (pine) items.push([x, h - 0.5, z, 14 * s, 14 * s, cells.pine[(rnd() * cells.pine.length) | 0]]);
    else items.push([x, h - 0.3, z, 7 * s, 4.2 * s, cells.shrub[(rnd() * 4) | 0]]);
    nf++;
  }

  const geo = new THREE.PlaneGeometry(1, 1);
  geo.translate(0, 0.5, 0);
  const cellAttr = new Float32Array(items.length * 4);
  const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.42, color: new THREE.Color(0.9, 0.86, 0.8), side: THREE.DoubleSide, fog: true });
  mat.alphaToCoverage = true;
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aCell;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = aCell.xy + uv * aCell.zw;\n#endif')
      .replace(
        '#include <project_vertex>',
        `vec4 bbC = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
         float bbW = length(instanceMatrix[0].xyz);
         float bbH = length(instanceMatrix[1].xyz);
         vec3 camR = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
         vec3 camU = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
         vec3 bbR = normalize(vec3(camR.x, 0.0, camR.z) + vec3(1e-5));
         vec3 bbU = normalize(mix(vec3(0.0, 1.0, 0.0), camU, 0.3));
         vec3 bbP = bbC.xyz + bbR * position.x * bbW + bbU * position.y * bbH;
         vec4 mvPosition = viewMatrix * vec4(bbP, 1.0);
         gl_Position = projectionMatrix * mvPosition;`
      );
  };
  mat.customProgramCacheKey = () => 'billboard-veg';
  const mesh = new THREE.InstancedMesh(geo, mat, items.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const tint = new THREE.Color();
  items.forEach(([x, y, z, w, h, c, k = 1], i) => {
    m.compose(p.set(x, y, z), q, s.set(w, h, 1));
    mesh.setMatrixAt(i, m);
    cellAttr.set(c, i * 4);
    mesh.setColorAt(i, tint.setRGB(k, k, k * 0.95));
  });
  geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cellAttr, 4));
  mesh.frustumCulled = false;
  mesh.name = 'vegetation';
  return [mesh];
}
