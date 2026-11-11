// RUELLE wardrobe: procedural 3D garments on wooden hangers, and their paper hang tags.
//
// INTERFACE (used by src/world/index.js and the studio/rack; keep names, add fields only)
//
//   await loadGarmentFonts()             once, before any garment or tag (prints are canvas text)
//   createGarment(product, { quality, renderer }) -> garment   (sync; renderer only for anisotropy)
//   await createGarments(products, opts, onProgress)          fonts + all garments, yields between
//     garment.group        THREE.Group, pivot at the hook tip (inner top of the curl, the point that
//                          rests on the rail), garment facing +z, y up, metres. Children:
//                          garment.mesh (fabric + every part, 1 draw call) and garment.hanger (wood +
//                          chrome, 1 draw call); both cast and receive shadows (custom depth
//                          materials follow the swing bend and the fade).
//     garment.setVariant(i)            colour variant (index in product.variants), no animation
//     garment.setDye(from, to, k)      dye front rising from the hem (k = 0) to the collar (k = 1):
//                                      soft wavy edge, darker wet band; prints change with it.
//                                      k = 1 (idle) shows `to`. Same shader chunk for every type.
//     garment.setSwing(avX, avZ, avY?) angular velocities (rad/s) of the hanger about x, z (and y):
//                                      the hem lags behind (vertex-shader bend, eased in update)
//     garment.update(dt)               eases the bend, keeps the swivel hook's heading (dt >= 0.5 snaps)
//     garment.setHookMode(k)           0 = hook curl across the rail (world-aligned swivel, rack),
//                                      1 = curl facing the camera (product view « ? » silhouette)
//     garment.setFade(a)               1 normal .. 0 gone: melts toward garment.fadeColor (THREE.Color,
//                                      linear, pre-tone-mapping: set it to the lit wall), the last
//                                      quarter dissolves (shadow too); group hidden at 0
//     garment.setQuality(level)        material features only (knit normals, clearcoat); the mesh
//                                      density is fixed at creation (rebuild to change it)
//     garment.hemY / garment.topY      local y of the hem / of the top of the garment (m)
//     garment.tagAnchor                THREE.Vector3, local point on the hook shank where threads start
//     garment.bounds                   THREE.Box3, local, garment + hanger (picking proxy)
//     garment.halfWidth                half width, sleeves included (m)
//     garment.measures                 outline measures (yH = shoulder/neck point height, half, ...)
//     garment.uniforms                 fabric uniforms (uDye, uSwing, uFade, uColFrom/To...) for tuning
//     garment.dispose(); garment.stats() -> { triangles, drawCalls, vertices, atlas, buildMs, ... }
//   createTags(product, { quality, clearance }) -> tags  (see tags.js; clearance defaults from the
//     product's outline). tags.group: origin = the thread anchor; place it at the garment's
//     tagAnchor in world space with the garment's scale but NOT its yaw (tags stay beside it when
//     it turns). setHover(i), kick(i, s), setActive(i), setDrop(k 0..1), update(dt),
//     rects(camera, w, h) -> [{ x, y, w, h }] CSS px, hit(raycaster) -> index | -1, dispose()
//   disposeShared()                      shared noise/knit textures and hanger geometries
//
// Quality: 'low' | 'medium' | 'high' | 'max' -> pillow grid 16 / 11.5 / 8.5 / 7.5 mm, atlas 1024 /
// 1536 / 2048 / 2048 px wide, knit normals off on low, clearcoat (varsity sleeves) off on low.
// Programs: fabric, fabric + clearcoat (varsity), hanger, tags, fabric depth: compile them in the
// world's warmup with every garment and one tag set in the scene.
import * as THREE from 'three';
import { PRODUCTS } from '../../catalog.js';
import { outlineOf, styleOf, SHAPES } from './outlines.js';
import { buildPanel, makeDrape, makeSurface } from './pillow.js';
import { Geo, PART } from './geo.js';
import { addParts } from './parts.js';
import { buildAtlas, atlasUv, loadGarmentFonts, FS } from './prints.js';
import { createFabricMaterial, createHangerMaterial } from './material.js';
import { hangerGeometry } from './hanger.js';
import { noiseTexture, fabricNormal, setAnisotropy } from './textures.js';
import { rng, clamp } from './noise.js';

export { loadGarmentFonts };
export { createTags } from './tags.js';
export { PRODUCTS };

const CELL = { low: 0.016, medium: 0.0115, high: 0.0085, max: 0.0075 }; // max stays <= 40k triangles per garment
// knit tile sizes in metres per fabric (the normal map repeats over the atlas frame)
const KNIT = { jersey: 0.034, fleece: 0.05, melton: 0.07, mesh: 0.05 };

function variantColors(product, i) {
  const v = product.variants[i] || product.variants[0];
  const rib = v.rib || [v.body, v.body, v.body];
  return [v.body, v.ink, v.sleeves || v.trim || v.ink, rib[0], rib[1], rib[2]].map((h) => new THREE.Color(h));
}
const isHeather = (v) => /gris|chin/i.test(v.id + v.label);

export function createGarment(product, { quality = 'high', renderer = null } = {}) {
  const t0 = performance.now();
  const st = { ...styleOf(product) };
  const shapeKey = st.shape;
  const type = product.type;
  const { back, front, m } = outlineOf(shapeKey);
  const rand = rng(st.seed * 7919 + 1);
  const cell = CELL[quality] || CELL.high;
  const foldAmp = type === 'varsity' ? 0.0045 : type === 'hoodie' ? 0.0065 : shapeKey === 'oversized' ? 0.0062 : 0.0058;
  const drape = makeDrape(m, rand, { foldAmp, wrap: type === 'varsity' ? 0.2 : 0.17 });
  const h0 = st.thick;
  // body volume: the varsity is lined and padded, the hoodie is a thick fleece
  const puff = type === 'varsity' ? 0.012 : type === 'hoodie' ? 0.0075 : 0.0042;
  const surf = makeSurface(back, h0, puff, drape);

  // --- geometry: back panel, front panel (cut at the front neckline), parts ---
  const geo = new Geo();
  const backPanel = buildPanel(back, -1, cell, { drape, h0, puff, uvOf: atlasUv, inflate: back });
  const frontPanel = buildPanel(front, 1, cell, { drape, h0, puff, uvOf: atlasUv, inflate: back });
  geo.add(backPanel, PART.BODY).add(frontPanel, PART.BODY);
  addParts(geo, { type, shape: shapeKey, m, surf, drape, h0, cell, st });
  const geometry = geo.build();
  const tGeo = performance.now() - t0;

  // --- textures and materials ---
  const t1 = performance.now();
  const atlas = buildAtlas(product, st, m, back, quality);
  const tAtlas = performance.now() - t1;
  const noise = noiseTexture();
  const nm = fabricNormal(st.fabric);
  if (renderer) setAnisotropy(renderer, quality);
  const rep = FS / (KNIT[st.fabric] || 0.034);
  const varsity = type === 'varsity';
  const look = {
    seed: (st.seed % 13) * 0.37,
    wash: st.wash,
    relief: varsity ? 1.6 : type === 'hoodie' ? 1.3 : 0.9,
    rough: st.rough,
    sheen: st.sheen,
    trimRough: varsity ? 0.36 : st.rough,
    trimSheen: varsity ? 0.12 : st.sheen,
    knit: quality === 'low' ? 0 : type === 'jersey' ? 0.9 : varsity ? 0.5 : type === 'hoodie' ? 0.22 : 0.6,
    trimKnit: varsity ? 0.08 : type === 'jersey' ? 0.9 : type === 'hoodie' ? 0.22 : 0.6,
    ribMode: st.rib === 'stripes' ? 2 : st.rib === 'trim' ? 1 : 0,
  };
  const clearcoat = varsity && quality !== 'low' ? 0.55 : 0;
  const fab = createFabricMaterial({ atlas, normalMap: nm, noise, knitRepeat: [rep * 2, rep], look, clearcoat });
  const mesh = new THREE.Mesh(geometry, fab.material);
  mesh.customDepthMaterial = fab.depth.depth;
  mesh.customDistanceMaterial = fab.depth.distance;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = `garment:${product.id}`;

  const hm = createHangerMaterial({ noise, seed: rand() * 10, hue: (rand() - 0.5) * 0.12 });
  const hanger = new THREE.Mesh(hangerGeometry(quality), hm.material);
  hanger.castShadow = true;
  hanger.receiveShadow = true;
  hanger.name = 'hanger';

  const group = new THREE.Group();
  group.name = `garment-group:${product.id}`;
  group.add(mesh, hanger);

  // --- dye / variants ---
  const u = fab.uniforms;
  const bb = geometry.boundingBox;
  const hemY = m.yHem;
  const topY = Math.max(bb.max.y, m.yH + 0.01);
  u.uDye.value.y = hemY;
  u.uDye.value.z = m.yH;
  u.uSwing.value.w = m.yH - 0.02;
  const heather = product.variants.map(isHeather);
  let cur = { from: 0, to: 0, k: 1 };
  function setDye(from, to, k) {
    from = clamp(from | 0, 0, product.variants.length - 1);
    to = clamp(to | 0, 0, product.variants.length - 1);
    if (from !== cur.from || to !== cur.to) {
      const a = variantColors(product, from), b = variantColors(product, to);
      for (let i = 0; i < 6; i++) { u.uColFrom.value[i].copy(a[i]); u.uColTo.value[i].copy(b[i]); }
      u.uLook.value.y = heather[from] ? 1 : 0;
      u.uLook.value.z = heather[to] ? 1 : 0;
    }
    cur = { from, to, k };
    u.uDye.value.x = clamp(k);
  }
  cur.from = -1;
  setDye(0, 0, 1);

  // --- swing bend (lagging hem) and the swivel hook ---
  const swing = { tz: 0, tx: 0, tw: 0 };
  const SW = u.uSwing.value;
  const len = m.yH - hemY;
  function setSwing(avX = 0, avZ = 0, avY = 0) {
    swing.tz = clamp(avX * 0.045 * len, -0.06, 0.06);
    swing.tx = clamp(-avZ * 0.045 * len, -0.06, 0.06);
    swing.tw = clamp(-avY * 0.07, -0.3, 0.3);
  }
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  function update(dt = 1 / 60) {
    const k = dt >= 0.5 ? 1 : 1 - Math.exp(-dt / 0.07);
    SW.x += (swing.tz - SW.x) * k;
    SW.y += (swing.tx - SW.y) * k;
    SW.z += (swing.tw - SW.z) * k;
    // swivel: the hook keeps its world heading (it stays on the rail) while the garment turns
    group.getWorldQuaternion(q);
    e.setFromQuaternion(q, 'YXZ');
    hm.uniforms.uHookYaw.value = hookMode * Math.PI * 0.5 - e.y;
  }
  // 0: the hook curl stays across the rail (rack); 1: the curl faces the camera (product view,
  // reads as a hanger « ? » like in a catalogue photo)
  let hookMode = 0;
  const setHookMode = (k) => { hookMode = clamp(k); };

  const bounds = geometry.boundingBox.clone().union(hanger.geometry.boundingBox);
  // threads tied round the hook's shank, just above the ferrule (on the swivel axis, so the hook's
  // rotation never moves it); they run above the shoulder line to the tags
  const tagAnchor = new THREE.Vector3(0, -0.082, 0.003);
  let triangles = geometry.index.count / 3 + hanger.geometry.index.count / 3;

  // fade for the rack garments when the product view opens (1 = normal, 0 = gone): the colour
  // first melts toward the wall colour (garment.fadeColor, linear, lit), then the last quarter
  // dissolves (holes aligned on both panels, shadow included); the group is hidden at 0
  const fadeColor = fab.uniforms.uFadeCol.value;
  hm.uniforms.uFadeCol.value = fadeColor;
  function setFade(a) {
    a = clamp(a);
    const colour = clamp(a / 0.75);
    const dissolve = 1 - clamp(a / 0.25);
    fab.uniforms.uFade.value.set(colour, dissolve);
    hm.uniforms.uFade.value.set(colour, dissolve);
    group.visible = a > 0.002;
  }

  function setQuality(level) {
    fab.uniforms.uRib.value.z = level === 'low' ? 0 : look.knit;
    fab.uniforms.uRib.value.y = level === 'low' ? 0 : clearcoat;
  }

  const ms = performance.now() - t0;
  return {
    product,
    group,
    mesh,
    hanger,
    hemY,
    topY,
    halfWidth: Math.max(-bb.min.x, bb.max.x),
    tagAnchor,
    bounds,
    measures: m,
    uniforms: u,
    setVariant: (i) => setDye(i, i, 1),
    setDye,
    setSwing,
    update,
    setQuality,
    setHookMode,
    setFade,
    fadeColor,
    dispose() {
      geometry.dispose();
      atlas.dispose();
      fab.material.dispose();
      fab.depth.depth.dispose();
      fab.depth.distance.dispose();
      hm.material.dispose();
    },
    stats: () => ({ triangles, drawCalls: 2, vertices: geometry.attributes.position.count + hanger.geometry.attributes.position.count, atlas: `${atlas.image.width}x${atlas.image.height}`, buildMs: Math.round(ms), geoMs: Math.round(tGeo), atlasMs: Math.round(tAtlas) }),
  };
}

// helper: build several garments with a progress callback, yielding between them
export async function createGarments(products, opts = {}, onProgress = () => {}) {
  await loadGarmentFonts();
  const out = [];
  for (let i = 0; i < products.length; i++) {
    out.push(createGarment(products[i], opts));
    onProgress((i + 1) / products.length);
    await new Promise((r) => setTimeout(r, 0));
  }
  return out;
}

export { SHAPES };

// shared resources (noise and knit textures, hanger geometries) outlive single garments
export { disposeShared } from './shared.js';
