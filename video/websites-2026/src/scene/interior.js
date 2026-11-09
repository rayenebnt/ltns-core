import * as THREE from 'three';
import { mergeSafe } from './geom.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ROOM, TOWER } from './config.js';
import { glassLine, ROOM_S0, ROOM_S1, glassMaterial } from './tower.js';
import * as TX from './textures.js';
import { mulberry32 } from './noise.js';

// Everything here is in the tower's local frame: the far (fireplace) wall is x = ROOM.x0,
// the side wall z = ROOM.z1, the glazing runs along x = TOWER.ga and around the corner.
// The final camera looks along -x from about (11.95, y + 1.38, ROOM.axisZ).
const Y = ROOM.y; // slab top of floor 14
const CEIL = 3.06; // plaster ceiling above the slab top
const AX = ROOM.axisZ;

function xMaxAt(z) {
  // x of the glass line at a given z inside the room (straight face + rounded corner)
  if (z >= -(TOWER.gb - TOWER.gr)) return TOWER.ga;
  const dz = z + (TOWER.gb - TOWER.gr);
  return TOWER.ga - TOWER.gr + Math.sqrt(Math.max(0, TOWER.gr * TOWER.gr - dz * dz));
}

function roomOutline(step = 0.2) {
  const pts = [[ROOM.x0, ROOM.z1]];
  for (let s = ROOM_S0; s <= ROOM_S1 + 1e-6; s += step) {
    const g = glassLine(Math.min(s, ROOM_S1));
    pts.push([g.x, g.z]);
  }
  return pts;
}

function flatPolygon(pts, y, faceUp, uvScale) {
  const contour = pts.map(([x, z]) => new THREE.Vector2(x, z));
  const tris = THREE.ShapeUtils.triangulateShape(contour, []);
  const pos = [], uv = [], idx = [];
  for (const [x, z] of pts) {
    pos.push(x, y, z);
    uv.push(x / uvScale, z / uvScale);
  }
  for (const [a, b, c] of tris) {
    const ax = pts[a][0], az = pts[a][1], bx = pts[b][0], bz = pts[b][1], cx = pts[c][0], cz = pts[c][1];
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az); // y of (b-a) x (c-a)
    if ((ny > 0) === faceUp) idx.push(a, b, c);
    else idx.push(a, c, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function box(w, h, d, x, y, z, r = 0, seg = 2) {
  const g = r > 0 ? new RoundedBoxGeometry(w, h, d, seg, r) : new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

function plane(w, h) {
  return new THREE.PlaneGeometry(w, h);
}

// Walnut wall built from 1.2 m veneer panels (merged: one draw call). The texture holds two
// different 1.2 m leaves and tiles vertically, so each panel takes a leaf, maybe mirrored, at a
// random height: the figure never lines up from one panel to the next (no wallpaper repeat).
function panelWall(len, h, seed, tex = 2.4, pw = 1.2) {
  const rnd = mulberry32(seed);
  const parts = [];
  for (let x0 = -len / 2; x0 < len / 2 - 0.01; x0 += pw) {
    const w = Math.min(pw, len / 2 - x0);
    const g = new THREE.PlaneGeometry(w, h);
    g.translate(x0 + w / 2, 0, 0);
    const leaf = rnd() < 0.5 ? 0 : 0.5;
    const flip = rnd() < 0.5;
    const v0 = rnd();
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const u = (uv.getX(i) * w) / tex;
      uv.setXY(i, leaf + (flip ? w / tex - u : u), v0 + (uv.getY(i) * h) / tex);
    }
    parts.push(g);
  }
  return mergeSafe(parts);
}

function tint(g, c) {
  const col = new Float32Array(g.attributes.position.count * 3);
  for (let k = 0; k < col.length; k += 3) col.set(c, k);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

const merge = mergeSafe;

// ---------------------------------------------------------- flame shader
function flameMaterial(noiseTex) {
  return new THREE.ShaderMaterial({
    name: 'Flames',
    uniforms: { uTime: { value: 0 }, uNoise: { value: noiseTex } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform sampler2D uNoise;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv;
        float n1 = texture2D(uNoise, vec2(uv.x * 3.0, uv.y * 0.8 - uTime * 0.9)).r;
        float n2 = texture2D(uNoise, vec2(uv.x * 7.0 + 0.3, uv.y * 1.6 - uTime * 1.7)).g;
        float n = n1 * 0.65 + n2 * 0.35;
        float h = uv.y + (n - 0.5) * 0.55;
        float tongues = 0.55 + 0.45 * sin(uv.x * 42.0 + n1 * 6.0 + uTime * 2.0);
        float body = smoothstep(0.95, 0.05, h * (1.15 - 0.3 * tongues));
        body *= smoothstep(0.0, 0.06, uv.x) * smoothstep(1.0, 0.94, uv.x);
        vec3 c = mix(vec3(1.0, 0.22, 0.03), vec3(1.0, 0.6, 0.22), smoothstep(0.25, 0.9, body));
        gl_FragColor = vec4(c * body * 3.6, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

// --------------------------------------------------------- cove + wall wash
// Warm light grazing down the walnut from the ceiling cove: bright under the cove,
// deep walnut toward the floor.
function addWallWash(mat, strength) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWashY = { value: Y };
    shader.uniforms.uWash = { value: strength };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vWY;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvWY = (modelMatrix * vec4(transformed, 1.0)).y;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vWY;\nuniform float uWashY;\nuniform float uWash;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         float hh = vWY - uWashY;
         float w = smoothstep(1.35, 2.98, hh) * (1.0 - smoothstep(3.0, 3.06, hh));
         totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.68, 0.4) * w * w * w * uWash;`
      );
  };
  mat.customProgramCacheKey = () => 'wallwash2';
}

// ------------------------------------------------------------ olive tree
// returns { wood: geometries, leaves: [Vector3] } for a small olive tree planted at (x, y, z)
function oliveTree(x, y, z, { scale = 1, seed = 12, leavesPerTip = 150, spread = 1.15 } = {}) {
  const wood = [];
  const leaves = [];
  const tr = mulberry32(seed);
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const grow = (a, d, len, rad, depthLeft) => {
    const b = a.clone().addScaledVector(d, len);
    const g = new THREE.CylinderGeometry(rad * 0.7, rad, len, 6);
    g.translate(0, len / 2, 0);
    q.setFromUnitVectors(up, d);
    g.applyQuaternion(q);
    g.translate(a.x, a.y, a.z);
    wood.push(g);
    if (depthLeft === 0) {
      for (let i = 0; i < leavesPerTip; i++) {
        // leaves fill a flattened ellipsoid around the branch tip
        const u = tr() * Math.PI * 2, v = Math.acos(2 * tr() - 1), rr = Math.cbrt(tr());
        leaves.push(b.clone().add(new THREE.Vector3(Math.sin(v) * Math.cos(u) * spread * 0.55 * rr * scale, (Math.cos(v) * 0.32 + 0.08) * rr * scale, Math.sin(v) * Math.sin(u) * spread * 0.55 * rr * scale)));
      }
      return;
    }
    const n = depthLeft > 1 ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const nd = d.clone().add(new THREE.Vector3((tr() - 0.5) * 1.3, 0.35 + tr() * 0.4, (tr() - 0.5) * 1.3)).normalize();
      grow(b, nd, len * (0.6 + tr() * 0.2), rad * 0.62, depthLeft - 1);
    }
  };
  grow(new THREE.Vector3(x, y, z), new THREE.Vector3(0.08, 1, -0.05).normalize(), 0.7 * scale, 0.055 * scale, 3);
  return { wood, leaves };
}

// ===================================================================== room
export function createInterior({ noiseTex, lowQuality = false }) {
  const group = new THREE.Group();
  group.name = 'interior';
  const materials = [];
  const reg = (m) => (materials.push(m), m);

  // ---------------------------------------------------------------- textures
  const stoneFloor = TX.limestoneTexture();
  const walnut = TX.walnutTextures();
  const oak = TX.oakTexture();
  const trav = TX.travertineTexture();
  const velvetN = TX.velvetNormal();
  velvetN.repeat.set(3, 3);
  const boucleN = TX.boucleNormal();
  boucleN.repeat.set(5, 5);
  const rug = TX.rugTexture();
  const art = TX.artTexture();

  // --------------------------------------------------------------- materials
  const mFloor = reg(new THREE.MeshStandardMaterial({ map: stoneFloor, roughness: 0.2, metalness: 0, envMapIntensity: 1.0 }));
  const mWalnut = reg(new THREE.MeshStandardMaterial({ map: walnut.map, normalMap: walnut.normalMap, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.42, envMapIntensity: 1.2 }));
  addWallWash(mWalnut, 1.3);
  const mOak = reg(new THREE.MeshStandardMaterial({ map: oak, roughness: 0.58, envMapIntensity: 0.8 }));
  // warm brown above the slats: light enough to soften the slat/gap contrast (less crawl in motion)
  const mPlaster = reg(new THREE.MeshStandardMaterial({ color: 0x76563c, roughness: 0.92 }));
  const mBeam = reg(new THREE.MeshStandardMaterial({ color: 0x5a3c28, roughness: 0.55, envMapIntensity: 0.8 }));
  const mVelvet = reg(new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x3a5372),
    roughness: 0.82,
    sheen: 1.0,
    sheenColor: new THREE.Color(0xa8bad6),
    sheenRoughness: 0.45,
    normalMap: velvetN,
    normalScale: new THREE.Vector2(0.14, 0.14),
    envMapIntensity: 0.7,
  }));
  const mDark = reg(new THREE.MeshStandardMaterial({ color: 0x1b120d, roughness: 0.45, envMapIntensity: 0.8 }));
  const mBoucle = reg(new THREE.MeshStandardMaterial({ color: 0xe0d6c4, roughness: 0.96, normalMap: boucleN, normalScale: new THREE.Vector2(0.55, 0.55), envMapIntensity: 0.6 }));
  const mPillow = reg(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.9, normalMap: velvetN, normalScale: new THREE.Vector2(0.25, 0.25) }));
  const mTrav = reg(new THREE.MeshStandardMaterial({ map: trav, roughness: 0.48, envMapIntensity: 0.9 }));
  const mBrass = reg(new THREE.MeshStandardMaterial({ color: 0xc89a55, metalness: 1, roughness: 0.27, envMapIntensity: 1.3 }));
  const mRug = reg(new THREE.MeshStandardMaterial({ map: rug, roughness: 1.0, envMapIntensity: 0.4 }));
  const mArt = reg(new THREE.MeshStandardMaterial({ map: art, roughness: 0.82, envMapIntensity: 0.6 }));
  const mCeramic = reg(new THREE.MeshStandardMaterial({ color: 0x23201d, roughness: 0.35, envMapIntensity: 1.0 }));
  const mPot = reg(new THREE.MeshStandardMaterial({ color: 0xb59a7e, roughness: 0.9 }));
  const mBark = reg(new THREE.MeshStandardMaterial({ color: 0x4b4035, roughness: 0.95 }));
  const mLeaf = reg(new THREE.MeshStandardMaterial({ color: 0x6d7658, roughness: 0.7, side: THREE.DoubleSide, envMapIntensity: 0.7 }));
  const mCurtain = reg(new THREE.MeshStandardMaterial({ color: 0xf3eee6, roughness: 0.95, transparent: true, opacity: 0.55, side: THREE.DoubleSide, emissive: 0xdfe4ee, emissiveIntensity: 0.16, depthWrite: false }));
  const mShade = reg(new THREE.MeshStandardMaterial({ color: 0xeee2cc, roughness: 0.9, emissive: 0xffb36b, emissiveIntensity: 2.2, side: THREE.DoubleSide }));
  const mFrame = reg(new THREE.MeshStandardMaterial({ color: 0x6b5848, roughness: 0.35, metalness: 0.6 }));
  const mTeak = reg(new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: 0.7 }));
  const mCushionOut = reg(new THREE.MeshStandardMaterial({ color: 0xe8e1d4, roughness: 0.95, normalMap: boucleN, normalScale: new THREE.Vector2(0.4, 0.4) }));
  const mBook = reg(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));

  const addMesh = (geo, mat, name, { cast = true, receive = true } = {}) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    group.add(mesh);
    return mesh;
  };

  // --------------------------------------------------------------- shell
  const outline = roomOutline();
  addMesh(flatPolygon(outline, Y + 0.02, true, 2.4), mFloor, 'floor', { cast: false });

  // walnut walls (far wall x = x0, side wall z = z1), interior faces only
  const wallH = CEIL + 0.02;
  const farLen = ROOM.z1 + TOWER.gb; // far wall length along z
  const farMid = (ROOM.z1 - TOWER.gb) / 2;
  const far = panelWall(farLen, wallH, 5);
  far.rotateY(Math.PI / 2);
  far.translate(ROOM.x0, Y + wallH / 2, farMid);
  const sideLen = TOWER.ga - ROOM.x0;
  const side = panelWall(sideLen, wallH, 9);
  side.rotateY(Math.PI);
  side.translate(ROOM.x0 + sideLen / 2, Y + wallH / 2, ROOM.z1);
  addMesh(merge([far, side]), mWalnut, 'walls', { cast: true });
  // thick backs so the walls block the low sun in the shadow map
  // (kept 12 cm inside the glass line: a face coplanar with the facade ribbon would z-fight)
  addMesh(merge([box(0.3, wallH, farLen - 0.12, ROOM.x0 - 0.17, Y + wallH / 2, farMid + 0.06), box(sideLen - 0.12, wallH, 0.3, ROOM.x0 + (sideLen - 0.12) / 2, Y + wallH / 2, ROOM.z1 + 0.17)]), mPlaster, 'wall-backs', { receive: false });

  // oak slat ceiling: a field of fine slats running toward the view, split in three panels
  // by two dark beams, recessed from the walls with a warm cove line all around
  const fz0 = ROOM.z1 - 0.42, fz1 = -TOWER.gb + 0.45;
  const fx0 = ROOM.x0 + 0.4;
  const beams = [AX + 1.75, AX - 1.75];
  const slatGeo = new THREE.BoxGeometry(1, 0.04, 0.034);
  const slats = [];
  for (let z = fz0; z > fz1; z -= 0.068) {
    if (beams.some((b) => Math.abs(z - b) < 0.11)) continue;
    const x1 = xMaxAt(z) - 0.5;
    if (x1 - fx0 > 0.3) slats.push([fx0, x1, z]);
  }
  const slatMesh = new THREE.InstancedMesh(slatGeo, mOak, slats.length);
  const m4 = new THREE.Matrix4();
  slats.forEach(([x0, x1, z], i) => {
    m4.makeScale(x1 - x0, 1, 1).setPosition((x0 + x1) / 2, Y + CEIL - 0.13, z);
    slatMesh.setMatrixAt(i, m4);
  });
  slatMesh.castShadow = true;
  slatMesh.receiveShadow = true;
  slatMesh.name = 'slats';
  group.add(slatMesh);
  const beamGeos = beams.map((bz) => box(xMaxAt(bz) - 0.5 - fx0, 0.08, 0.15, (fx0 + xMaxAt(bz) - 0.5) / 2, Y + CEIL - 0.15, bz));
  addMesh(merge(beamGeos), mBeam, 'beams');
  // warm brown ceiling just above the slats (also blocks the low sun in the shadow map)
  addMesh(flatPolygon(outline, Y + CEIL - 0.08, false, 2.4), mPlaster, 'ceiling', { cast: true, receive: false });

  // cove LED line around the whole slat field (both walls and the window side)
  const coveMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.7, 0.4).multiplyScalar(4.2) });
  const covePts = [];
  // just under the slat undersides (-0.15): seen directly, one continuous line, instead of
  // through the slat gaps as a dashed line that crawls in motion. A small box section (not a
  // flat strip) so it keeps a few pixels of height even when seen nearly edge-on from the balcony
  const cy = Y + CEIL - 0.166;
  covePts.push([fx0 - 0.06, fz0 + 0.06]);
  for (let z = fz0 + 0.06; z >= fz1 - 0.06; z -= 0.25) covePts.push([xMaxAt(z) - 0.44, z]);
  covePts.push([xMaxAt(fz1 - 0.06) - 0.44, fz1 - 0.06]);
  covePts.push([fx0 - 0.06, fz1 - 0.06]);
  const coveParts = [];
  for (let i = 0; i < covePts.length; i++) {
    const [ax, az] = covePts[i];
    const [bx, bz] = covePts[(i + 1) % covePts.length];
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 1e-3) continue;
    const g = new THREE.BoxGeometry(len + 0.02, 0.026, 0.028);
    g.rotateY(-Math.atan2(bz - az, bx - ax));
    g.translate((ax + bx) / 2, cy, (az + bz) / 2);
    coveParts.push(g);
  }
  const cove = new THREE.Mesh(merge(coveParts), coveMat);
  cove.name = 'cove';
  group.add(cove);

  // ------------------------------------------------------------------ rug
  const rugGeo = box(4.0, 0.016, 4.4, 6.55, Y + 0.03, AX + 0.2);
  addMesh(rugGeo, mRug, 'rug', { cast: false });

  // ---------------------------------------------------------------- sofa
  // long sofa on the left of the view, facing the room axis (-z); its back toward the side wall
  const sofa = [];
  const sx0 = 4.75, sx1 = 7.95, sz = AX + 2.65; // back line of the sofa
  const depth = 1.05;
  sofa.push(box(sx1 - sx0, 0.3, depth, (sx0 + sx1) / 2, Y + 0.28, sz - depth / 2, 0.06, 3));
  const nSeat = 3;
  const armW = 0.26;
  const seatW = (sx1 - sx0 - 2 * armW) / nSeat;
  for (let i = 0; i < nSeat; i++) {
    const cx = sx0 + armW + seatW * (i + 0.5);
    sofa.push(box(seatW - 0.03, 0.17, 0.8, cx, Y + 0.515, sz - 0.62, 0.075, 3));
    sofa.push(box(seatW - 0.04, 0.5, 0.24, cx, Y + 0.72, sz - 0.16, 0.09, 3));
  }
  sofa.push(box(armW, 0.6, depth, sx0 + armW / 2, Y + 0.43, sz - depth / 2, 0.1, 3));
  sofa.push(box(armW, 0.6, depth, sx1 - armW / 2, Y + 0.43, sz - depth / 2, 0.1, 3));
  addMesh(merge(sofa), mVelvet, 'sofa');
  addMesh(box(sx1 - sx0 - 0.1, 0.13, depth - 0.12, (sx0 + sx1) / 2, Y + 0.085, sz - depth / 2), mDark, 'sofa-plinth');
  // pillows leaning on the back cushions
  const pillowCols = [[0.8, 0.64, 0.44], [0.62, 0.3, 0.18], [0.88, 0.83, 0.74], [0.56, 0.44, 0.31], [0.82, 0.76, 0.66]];
  const pillows = [];
  [[5.25, 0.28], [5.78, -0.16], [6.95, 0.12], [7.42, -0.25]].forEach(([x, r], i) => {
    const g = new RoundedBoxGeometry(0.5, 0.46, 0.15, 3, 0.07);
    g.rotateX(-0.25);
    g.rotateY(r);
    g.translate(x, Y + 0.84, sz - 0.34);
    pillows.push(tint(g, pillowCols[i % pillowCols.length]));
  });
  addMesh(merge(pillows), mPillow, 'pillows');

  // ---------------------------------------------------------- coffee table
  const table = [];
  const tx = 6.45, tz = AX + 0.38;
  const top = new THREE.CylinderGeometry(0.72, 0.72, 0.07, 64);
  top.translate(tx, Y + 0.385, tz);
  table.push(top);
  const ped = new THREE.CylinderGeometry(0.32, 0.38, 0.33, 48);
  ped.translate(tx, Y + 0.185, tz);
  table.push(ped);
  // fireplace block on the far wall, centred on the view axis, under the painting
  const fz = AX, fLen = 3.0;
  table.push(box(0.46, 0.5, fLen, ROOM.x0 + 0.23, Y + 0.27, fz));
  table.push(box(0.52, 0.05, fLen + 0.12, ROOM.x0 + 0.26, Y + 0.545, fz));
  addMesh(merge(table), mTrav, 'travertine');
  // flame slot
  addMesh(box(0.03, 0.2, 2.3, ROOM.x0 + 0.455, Y + 0.3, fz), mDark, 'fire-slot', { cast: false });
  const flameGeo = plane(2.2, 0.3);
  flameGeo.rotateY(Math.PI / 2);
  flameGeo.translate(ROOM.x0 + 0.475, Y + 0.33, fz);
  const flameMat = flameMaterial(noiseTex);
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.name = 'flames';
  flame.renderOrder = 8;
  group.add(flame);
  const fireLight = new THREE.PointLight(0xff8a3a, 2.2, 5.5, 2);
  fireLight.position.set(ROOM.x0 + 0.9, Y + 0.45, fz);

  // decor: bowl and books on the table, a vase on the hearth
  const bowl = new THREE.LatheGeometry([new THREE.Vector2(0.0, 0), new THREE.Vector2(0.12, 0.005), new THREE.Vector2(0.2, 0.05), new THREE.Vector2(0.22, 0.1), new THREE.Vector2(0.205, 0.105), new THREE.Vector2(0.18, 0.06), new THREE.Vector2(0.0, 0.04)], 40);
  bowl.translate(tx + 0.2, Y + 0.42, tz - 0.15);
  const vase = new THREE.LatheGeometry([new THREE.Vector2(0.0, 0), new THREE.Vector2(0.09, 0.0), new THREE.Vector2(0.14, 0.12), new THREE.Vector2(0.11, 0.32), new THREE.Vector2(0.05, 0.42), new THREE.Vector2(0.055, 0.46), new THREE.Vector2(0.0, 0.46)], 40);
  vase.translate(ROOM.x0 + 0.26, Y + 0.57, fz - 1.2);
  addMesh(merge([bowl, vase]), mCeramic, 'ceramics');
  const books = [];
  const bookCols = [[0.85, 0.82, 0.75], [0.3, 0.33, 0.38], [0.72, 0.5, 0.32]];
  for (let i = 0; i < 3; i++) {
    books.push(tint(box(0.34 - i * 0.03, 0.035, 0.25 - i * 0.02, tx - 0.22, Y + 0.44 + i * 0.036, tz + 0.18), bookCols[i]));
  }
  addMesh(merge(books), mBook, 'books');

  // ------------------------------------------------------------- painting
  const artW = 1.8, artH = 1.22;
  const artGeo = plane(artW, artH);
  artGeo.rotateY(Math.PI / 2);
  artGeo.translate(ROOM.x0 + 0.045, Y + 1.58, fz);
  addMesh(artGeo, mArt, 'painting', { cast: false });
  addMesh(box(0.03, artH + 0.06, artW + 0.06, ROOM.x0 + 0.02, Y + 1.58, fz), mDark, 'painting-frame', { cast: false });

  // ------------------------------------------------------- boucle tub chairs
  const chairFrames = [], chairCush = [];
  const chairs = [[5.8, AX - 1.45], [7.35, AX - 1.35]];
  for (const [cx, cz] of chairs) {
    const ang = Math.atan2(tx - cx, tz - cz);
    const parts = [];
    const seat = new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.38, 0), new THREE.Vector2(0.43, 0.04), new THREE.Vector2(0.45, 0.2), new THREE.Vector2(0.43, 0.36), new THREE.Vector2(0.39, 0.4), new THREE.Vector2(0, 0.41)], 40);
    seat.translate(0, 0.06, 0);
    parts.push([seat, 'c']);
    const back = new THREE.TorusGeometry(0.39, 0.12, 14, 40, Math.PI * 1.25);
    back.rotateX(Math.PI / 2);
    back.rotateY(Math.PI * 1.125);
    back.scale(1, 1.6, 1);
    back.translate(0, 0.56, -0.02);
    parts.push([back, 'c']);
    const base = new THREE.CylinderGeometry(0.36, 0.34, 0.07, 40);
    base.translate(0, 0.035, 0);
    parts.push([base, 'f']);
    for (const [g, kind] of parts) {
      g.rotateY(ang);
      g.translate(cx, Y + 0.02, cz);
      (kind === 'f' ? chairFrames : chairCush).push(g);
    }
  }
  addMesh(merge(chairFrames), mDark, 'chair-frames');
  addMesh(merge(chairCush), mBoucle, 'chair-cushions');

  // ------------------------------------------------------------ chandelier
  const hub = new THREE.Vector3(tx, Y + 2.34, AX);
  const rnd = mulberry32(3);
  const rods = [], bulbs = [];
  rods.push([new THREE.Vector3(tx, Y + CEIL - 0.1, AX), hub.clone()]);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rnd() * 0.4;
    const el = (rnd() - 0.45) * 0.9;
    const L = 0.36 + rnd() * 0.22;
    const end = hub.clone().add(new THREE.Vector3(Math.cos(a) * Math.cos(el) * L, Math.sin(el) * L * 0.8, Math.sin(a) * Math.cos(el) * L));
    rods.push([hub.clone(), end]);
    for (let j = 0; j < 2; j++) {
      const a2 = a + (rnd() - 0.5) * 1.6;
      const el2 = el + (rnd() - 0.5) * 1.2;
      const L2 = 0.14 + rnd() * 0.16;
      const e2 = end.clone().add(new THREE.Vector3(Math.cos(a2) * Math.cos(el2) * L2, Math.sin(el2) * L2, Math.sin(a2) * Math.cos(el2) * L2));
      rods.push([end.clone(), e2]);
      bulbs.push(e2);
    }
  }
  const rodGeo = new THREE.CylinderGeometry(0.007, 0.007, 1, 6);
  rodGeo.translate(0, 0.5, 0);
  const rodMesh = new THREE.InstancedMesh(rodGeo, mBrass, rods.length);
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), scl = new THREE.Vector3();
  rods.forEach(([a, b], i) => {
    dir.subVectors(b, a);
    const L = dir.length();
    q.setFromUnitVectors(up, dir.normalize());
    m4.compose(a, q, scl.set(1, L, 1));
    rodMesh.setMatrixAt(i, m4);
  });
  rodMesh.name = 'chandelier-rods';
  group.add(rodMesh);
  const bulbGeo = new THREE.SphereGeometry(0.042, 14, 10);
  const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.68, 0.38).multiplyScalar(9) });
  const bulbMesh = new THREE.InstancedMesh(bulbGeo, bulbMat, bulbs.length);
  bulbs.forEach((b, i) => {
    m4.makeTranslation(b.x, b.y, b.z);
    bulbMesh.setMatrixAt(i, m4);
  });
  bulbMesh.name = 'chandelier-bulbs';
  group.add(bulbMesh);
  const lampLight = new THREE.PointLight(0xffc28e, 11, 13, 2);
  lampLight.position.copy(hub);

  // ------------------------------------------------------------ floor lamp
  const lamp = [];
  const lx = 4.42, lz = sz - 0.2;
  const lbase = new THREE.CylinderGeometry(0.17, 0.17, 0.02, 32);
  lbase.translate(lx, Y + 0.03, lz);
  lamp.push(lbase);
  const lstem = new THREE.CylinderGeometry(0.012, 0.012, 1.42, 8);
  lstem.translate(lx, Y + 0.75, lz);
  lamp.push(lstem);
  addMesh(merge(lamp), mBrass, 'lamp');
  const shade = new THREE.CylinderGeometry(0.2, 0.25, 0.34, 32, 1, true);
  shade.translate(lx, Y + 1.5, lz);
  addMesh(shade, mShade, 'lamp-shade', { cast: false });

  // ------------------------------------------- olive trees (room corner + balcony)
  const potGeo = (r, h) => new THREE.LatheGeometry([new THREE.Vector2(0.0, 0), new THREE.Vector2(r * 0.68, 0), new THREE.Vector2(r * 0.94, h * 0.14), new THREE.Vector2(r, h * 0.92), new THREE.Vector2(r * 0.94, h), new THREE.Vector2(0.0, h * 0.97)], 40);
  const ox = 4.75, oz = -9.85;
  const pots = [potGeo(0.46, 0.6).translate(ox, Y + 0.02, oz)];
  const tIn = oliveTree(ox, Y + 0.55, oz, { scale: 1, seed: 12, leavesPerTip: lowQuality ? 90 : 160 });
  // balcony: olive tree in a tall planter, to the right of the opening
  const bx = TOWER.ga + 1.55, bz = ROOM.openZ1 - 1.15;
  pots.push(potGeo(0.42, 0.72).translate(bx, Y, bz));
  const tOut = oliveTree(bx, Y + 0.68, bz, { scale: 0.9, seed: 31, leavesPerTip: lowQuality ? 70 : 120 });
  addMesh(merge(pots), mPot, 'pots');
  addMesh(merge([...tIn.wood, ...tOut.wood]), mBark, 'olive-wood');
  const leafPts = [...tIn.leaves, ...tOut.leaves];
  // lanceolate leaf: a slim diamond, pointed at both ends
  const leafGeo = new THREE.BufferGeometry();
  leafGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.05, 0, 0, 0, 0.0095, 0, 0.05, 0, 0, 0, -0.0095, 0], 3));
  leafGeo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  leafGeo.setIndex([0, 3, 1, 1, 3, 2]);
  const leaves = new THREE.InstancedMesh(leafGeo, mLeaf, leafPts.length);
  const eu = new THREE.Euler();
  const lc = new THREE.Color();
  const tr = mulberry32(44);
  leafPts.forEach((pt, i) => {
    eu.set(tr() * 6.28, tr() * 6.28, tr() * 6.28);
    q.setFromEuler(eu);
    m4.compose(pt, q, scl.set(1, 1, 1));
    leaves.setMatrixAt(i, m4);
    const silver = tr();
    lc.setRGB(0.7 + silver * 0.5, 0.75 + silver * 0.45, 0.62 + silver * 0.45);
    leaves.setColorAt(i, lc);
  });
  leaves.castShadow = true;
  leaves.name = 'olive-leaves';
  group.add(leaves);

  // ------------------------------------------------------------- curtains
  // sheer curtains gathered at the window corner (a cool, neutral note against the walnut)
  const curtain = (w, h, folds, amp) => {
    const g = new THREE.PlaneGeometry(w, h, folds * 8, 1);
    const pa = g.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i);
      pa.setZ(i, Math.sin((x / w) * folds * Math.PI * 2) * amp);
    }
    g.computeVertexNormals();
    return g;
  };
  const cN = curtain(0.9, CEIL - 0.12, 8, 0.07);
  cN.translate(ROOM.x0 + 0.5, Y + (CEIL - 0.12) / 2 + 0.03, -TOWER.gb + 0.2);
  const curtains = new THREE.Mesh(cN, mCurtain);
  curtains.name = 'curtains';
  curtains.renderOrder = 6;
  group.add(curtains);

  // -------------------------------------------------------- glazing + opening
  const OPEN_S0 = -ROOM.openZ0, OPEN_S1 = -ROOM.openZ1; // opening along the glass line
  const panes = [];
  const frames = [];
  const arcStart = TOWER.gb - TOWER.gr, arcLen = (Math.PI * TOWER.gr) / 2;
  const breaks = [OPEN_S1, arcStart];
  for (let i = 1; i <= 5; i++) breaks.push(arcStart + (arcLen * i) / 5);
  const northStart = arcStart + arcLen;
  const northN = Math.max(1, Math.round((ROOM_S1 - northStart) / 2.2));
  for (let i = 1; i <= northN; i++) breaks.push(northStart + ((ROOM_S1 - northStart) * i) / northN);
  breaks.sort((a, b) => a - b);
  const glassH = CEIL + 0.38;
  const frameAt = (s, w = 0.035, d = 0.08) => {
    const g = glassLine(s);
    const fr = box(w, glassH, d, 0, 0, 0);
    fr.rotateY(Math.atan2(g.nx, g.nz));
    fr.translate(g.x - g.nx * 0.02, Y + glassH / 2, g.z - g.nz * 0.02);
    frames.push(fr);
  };
  for (let i = 0; i < breaks.length - 1; i++) {
    const s0 = breaks[i], s1 = breaks[i + 1];
    if (s1 - s0 < 0.08) continue;
    const a = glassLine(s0), b = glassLine(s1);
    const g = new THREE.PlaneGeometry(1, 1);
    const pa = g.attributes.position;
    const set = (k, p, yy) => pa.setXYZ(k, p.x, yy, p.z);
    set(0, a, Y + glassH);
    set(1, b, Y + glassH);
    set(2, a, Y + 0.02);
    set(3, b, Y + 0.02);
    g.computeVertexNormals();
    panes.push(g);
    frameAt(s0);
  }
  frameAt(ROOM_S1);
  // jambs of the opening
  frameAt(OPEN_S0 - 0.03, 0.09, 0.12);
  const paneMat = glassMaterial({ f0: 0.045, tint: 0.025, edge: 0 });
  const paneMesh = new THREE.Mesh(merge(panes), paneMat);
  paneMesh.name = 'room-glass';
  paneMesh.renderOrder = 4;
  group.add(paneMesh);
  addMesh(merge(frames), mFrame, 'room-frames');

  // two sliding panels; both stack into the wall pocket beyond openZ0 when the opening clears
  const panelW = ROOM.doorW / 2 + 0.03;
  const makePanel = (name) => {
    const p = new THREE.Group();
    p.name = name;
    const pane = new THREE.Mesh(plane(panelW - 0.04, glassH - 0.06).rotateY(Math.PI / 2), paneMat);
    pane.renderOrder = 4;
    p.add(pane);
    const pf = new THREE.Mesh(merge([
      box(0.035, glassH, 0.06, 0, 0, -panelW / 2 + 0.03),
      box(0.035, glassH, 0.06, 0, 0, panelW / 2 - 0.03),
      box(0.035, 0.05, panelW, 0, glassH / 2 - 0.025, 0),
      box(0.035, 0.05, panelW, 0, -glassH / 2 + 0.025, 0),
    ]), mFrame);
    pf.castShadow = true;
    p.add(pf);
    group.add(p);
    return p;
  };
  const panelA = makePanel('panel-a'); // outer track, closes the far end of the opening
  const panelB = makePanel('panel-b'); // inner track, next to the pocket
  const yMid = Y + glassH / 2 + 0.01;
  const aClosed = ROOM.openZ1 + panelW / 2, bClosed = ROOM.openZ0 - panelW / 2;
  const pocket = ROOM.openZ0 + panelW / 2 + 0.02;
  panelA.position.set(TOWER.ga - 0.05, yMid, aClosed);
  panelB.position.set(TOWER.ga - 0.12, yMid, bClosed);

  // ---------------------------------------------------- balcony loungers
  const teak = [], cush = [];
  for (const zc of [-0.05, -1.05]) {
    const xc = TOWER.ga + 1.5;
    teak.push(box(1.9, 0.07, 0.68, xc, Y + 0.3, zc, 0.02));
    for (const [dx, dz] of [[-0.85, -0.29], [0.85, -0.29], [-0.85, 0.29], [0.85, 0.29]]) teak.push(box(0.06, 0.28, 0.06, xc + dx, Y + 0.14, zc + dz));
    cush.push(box(1.3, 0.09, 0.64, xc + 0.28, Y + 0.38, zc, 0.04, 2));
    const backrest = box(0.6, 0.09, 0.64, 0, 0, 0, 0.04, 2);
    backrest.rotateZ(-0.62);
    backrest.translate(xc - 0.58, Y + 0.55, zc);
    cush.push(backrest);
  }
  addMesh(merge(teak), mTeak, 'loungers');
  addMesh(merge(cush), mCushionOut, 'lounger-cushions');

  group.add(lampLight, fireLight);

  // --------------------------------------------------------- shadow casting
  group.traverse((o) => {
    if (o.isMesh && o.material && o.material.transparent) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });

  // hotspot anchors for the HTML labels (local frame; main.js turns them into world points)
  const anchors = {
    ceiling: new THREE.Vector3(7.6, Y + CEIL - 0.15, AX - 1.2),
    view: new THREE.Vector3(6.2, Y + 1.15, -TOWER.gb),
    fire: new THREE.Vector3(ROOM.x0 + 0.47, Y + 0.45, fz - 0.4),
  };
  // where the labels sit in the final frame (NDC), refined by ray casting in main.js
  const hotspotView = { ceiling: [0.3, 0.58], fire: [-0.15, -0.16] };

  return {
    group,
    materials,
    flameMat,
    glassMat: paneMat,
    lampLight,
    fireLight,
    anchors,
    hotspotView,
    center: new THREE.Vector3(8.2, Y + 1.5, AX + 0.3),
    setDoor(open) {
      const o = Math.min(1, Math.max(0, open));
      // the inner panel leads, the outer one follows and both end stacked in the pocket
      const ob = Math.min(1, o * 1.6);
      panelB.position.z = bClosed + (pocket - bClosed) * ob;
      panelA.position.z = aClosed + (pocket - aClosed) * o;
    },
  };
}
