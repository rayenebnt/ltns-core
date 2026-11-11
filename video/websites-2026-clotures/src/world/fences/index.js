// Fence module of the Cordeau world: the new fence (five types, built in chapter 1, restyled
// in chapter 2), the chapter 1 site kit, and the old weathered fence repaired in chapter 4.
//
//   const fences = createFences({ renderer, scene, quality })
//   fences.setMode('install' | 'styles' | 'repair')
//   fences.setInstall(p)            chapter 1 progress 0..1 (contract beat windows)
//   fences.setStyle(from, to, k)    chapter 2: type indices 0..4, sweep k 0..1 (near to far)
//   fences.setRepair(p)             chapter 4 progress 0..1
//   fences.anchors()                { branche, poteau, penture, portillon, pentures, cable, garde } (THREE.Vector3, world)
//   fences.info()                   { right: 44, front: 33, total: 77, built, windows, ... }
//   fences.update(dt, time)         flutter, ribbon width (call once per frame)
//   fences.setQuality(level)        'max' | 'high' | 'medium' | 'low'
//   fences.stats()                  meshes, draw calls and triangles of what is visible
// Extras: fences.groundAO() -> [newStrength, builtD, oldStrength] for garden.setFenceAO (if the
// garden's own ground darkening is preferred, pass { contact: false } to drop the strip);
// fences.showAll() -> restore() for the loader warmup; fences.group (everything);
// fences.textures (for renderer.initTexture); fences.config (beat windows, editable).
//
// Everything is merged geometry animated on the GPU (material.js): about 4 to 12 meshes are
// visible at a time, each one draw call plus one in the shadow pass.
import * as THREE from 'three';
import { createSharedUniforms, fenceMaterial, fenceMesh, ROLE } from './material.js';
import { douglasTextures, pineTextures, weatheredTextures, chestnutTextures, barkTextures, leafTexture, panelWireTexture, meshWireTexture, noiseTexture, setTextureAnisotropy } from './textures.js';
import { buildType0, buildType1, buildType2, buildType3, buildType4 } from './types.js';
import { buildInstallKit } from './install.js';
import { buildOldFence, gateMatrix, leanMatrix, ANCHORS_REST } from './repair.js';
import { createContact } from './contact.js';
import { TOTAL, HEIGHTS, GROUND } from './layout.js';

export { ROLE };
export const FENCE_TYPES = ['Bois plein', 'PVC blanc', 'Panneaux rigides', 'Ranch', 'Ganivelle'];
const CONTACT = [0.42, 0.4, 0.12, 0.09, 0.22];
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// Same as createFences, but generates the textures first with a frame between each one (the
// loader keeps animating), reporting onProgress(0..1). Resolves to the same object.
export async function createFencesAsync(opts = {}) {
  const { onProgress = () => {} } = opts;
  const next = () => new Promise((r) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => r()) : setTimeout(r, 0)));
  const steps = [douglasTextures, weatheredTextures, pineTextures, chestnutTextures, barkTextures, leafTexture, panelWireTexture, meshWireTexture, noiseTexture];
  for (let i = 0; i < steps.length; i++) {
    steps[i]();
    onProgress((i + 1) / (steps.length + 1));
    await next();
  }
  const f = createFences(opts);
  onProgress(1);
  return f;
}

export function createFences({ renderer, scene, quality = 'high', contact = true, grassLift = 0.035 } = {}) {
  const t0 = performance.now();
  GROUND.lift = grassLift;
  const maxAniso = renderer && renderer.capabilities ? renderer.capabilities.getMaxAnisotropy() : 8;
  setTextureAnisotropy(Math.min(8, maxAniso || 8));
  const shared = createSharedUniforms();
  const group = new THREE.Group();
  group.name = 'fences';

  // ---------------------------------------------------------------- textures and materials
  const texMs = {};
  const timed = (name, fn) => {
    const a = performance.now();
    const r = fn();
    texMs[name] = Math.round(performance.now() - a);
    return r;
  };
  const dg = timed('douglas', douglasTextures);
  const pn = timed('pine', pineTextures);
  const wt = timed('weathered', weatheredTextures);
  const cn = timed('chestnut', chestnutTextures);
  const bk = timed('bark', barkTextures);
  const lf = timed('leaf', leafTexture);
  const pw = timed('panel', panelWireTexture);
  const mw = timed('mesh', meshWireTexture);
  const tTex = performance.now();
  const ns = new THREE.Vector2(0.7, 0.7);
  const wood = (t, extra = {}) => ({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, normalScale: ns, roughness: 1, metalness: 0, ...extra });
  const M = {
    t0: fenceMaterial(shared, { name: 'douglas', ...wood(dg), tint: [0xe8d0bc, 0xfff4e8], grime: [0.8, 0.74, 0.66, 0.14] }),
    t1: fenceMaterial(shared, { name: 'pvc', color: 0xececea, roughness: 0.3, metalness: 0, envMapIntensity: 1.25, tint: [0xffffff, 0xf9f9f6], grime: [0.86, 0.86, 0.83, 0.08] }),
    t2: fenceMaterial(shared, { name: 'rigid', map: pw, color: 0x3a4044, roughness: 0.46, metalness: 0.15, side: THREE.DoubleSide, alphaToCoverage: true, shadowHash: true, grime: [0.85, 0.85, 0.85, 0.08] }),
    t3: fenceMaterial(shared, { name: 'ranch', ...wood(dg), color: 0x32363b, roughness: 0.85, tint: [0xdadada, 0xffffff], grime: [0.85, 0.82, 0.78, 0.12] }),
    t3m: fenceMaterial(shared, { name: 'ranch-mesh', map: mw, color: 0x1c1c1c, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide, alphaToCoverage: true, shadowHash: true }),
    t4: fenceMaterial(shared, { name: 'chestnut', ...wood(cn), tint: [0xcdbfb2, 0xfff4ea], grime: [0.74, 0.68, 0.58, 0.14] }),
    t4g: fenceMaterial(shared, { name: 'galv-wire', vertexColors: true, rm: true, roughness: 0.4, metalness: 1 }),
    ikit: fenceMaterial(shared, { name: 'install-kit', vertexColors: true, rm: true, grunge: 0.3, roughness: 0.8, metalness: 0 }),
    ipine: fenceMaterial(shared, { name: 'install-pine', ...wood(pn), tint: [0xeee4d6, 0xffffff], grime: [0.78, 0.72, 0.62, 0.12] }),
    string: fenceMaterial(shared, { name: 'string', color: 0xff8a1e, emissive: 0xff6a00, emissiveIntensity: 0.35, roughness: 0.6, side: THREE.DoubleSide }),
    old: fenceMaterial(shared, { name: 'weathered', ...wood(wt), normalScale: new THREE.Vector2(1.1, 1.1), tint: [0xdad6d2, 0xf6f2ee], grime: [0.56, 0.58, 0.5, 0.4] }),
    fresh: fenceMaterial(shared, { name: 'fresh-pine', ...wood(pn), tint: [0xcdbfae, 0xe4d8c6], grime: [0.8, 0.76, 0.68, 0.12] }),
    okit: fenceMaterial(shared, { name: 'old-kit', vertexColors: true, rm: true, grunge: 0.35, roughness: 0.8, metalness: 0 }),
    bark: fenceMaterial(shared, { name: 'bark', ...wood(bk), tint: [0xdcd6cc, 0xfffaf0] }),
    leaves: fenceMaterial(shared, { name: 'leaves', map: lf, vertexColors: true, alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.72, metalness: 0, foliage: true }),
  };
  M.string.defines = { ...(M.string.defines || {}), FENCE_RIBBON: '' };
  M.string.customProgramCacheKey = () => 'fence-std-ribbon';
  M.t2.shadowSide = THREE.DoubleSide;
  M.t3m.shadowSide = THREE.DoubleSide;
  M.leaves.shadowSide = THREE.DoubleSide;
  M.string.shadowSide = THREE.DoubleSide;

  // ---------------------------------------------------------------- geometry
  const b0 = buildType0();
  const kitB = buildInstallKit();
  b0.append(kitB.stack);
  const b3 = buildType3();
  const b4 = buildType4();
  const oldB = buildOldFence();
  const tGeo = performance.now();

  const mk = (builder, mat, opts) => {
    const m = fenceMesh(builder.build(), mat, opts);
    group.add(m);
    return m;
  };
  const meshes = {
    t0: mk(b0, M.t0),
    t1: mk(buildType1(), M.t1),
    t2: mk(buildType2(), M.t2),
    t3: mk(b3.wood, M.t3),
    t3m: mk(b3.mesh, M.t3m),
    t4: mk(b4.wood, M.t4),
    t4g: mk(b4.wire, M.t4g),
    ikit: mk(kitB.kit, M.ikit),
    ipine: mk(kitB.pine, M.ipine),
    string: mk(kitB.string, M.string, { cast: false }),
    old: mk(oldB.old, M.old),
    fresh: mk(oldB.fresh, M.fresh),
    okit: mk(oldB.kit, M.okit),
    bark: mk(oldB.bark, M.bark),
    leaves: mk(oldB.leaves, M.leaves),
  };
  meshes.string.frustumCulled = false;
  const TYPE_MESHES = [[meshes.t0], [meshes.t1], [meshes.t2], [meshes.t3, meshes.t3m], [meshes.t4, meshes.t4g]];
  const TYPE_MATS = [[M.t0], [M.t1], [M.t2], [M.t3, M.t3m], [M.t4, M.t4g]];
  const INSTALL_MESHES = [meshes.ikit, meshes.ipine, meshes.string];
  const REPAIR_ONLY = [meshes.fresh, meshes.bark, meshes.leaves];
  const leafCount = meshes.leaves.geometry.index.count;
  // litter cards come after the branch leaves in the index: a lower quality trims the end
  let contactObj = null;
  if (contact) {
    contactObj = createContact(shared);
    group.add(contactObj.mesh);
  }
  scene.add(group);

  // upload every texture now (we are in the loader)
  const textures = [dg, pn, wt, cn, bk].flatMap((t) => [t.map, t.normalMap, t.roughnessMap]).concat([lf, pw, mw, noiseTexture()]);
  if (renderer && renderer.initTexture) for (const t of textures) renderer.initTexture(t);

  // ---------------------------------------------------------------- state
  const state = { mode: 'install', install: 0, style: { from: 0, to: 0, k: 1 }, repair: 0 };
  const config = {
    sweepWidth: 6, // m of fence over which one element sinks (or rises)
    get windows() {
      const v = (u) => [u.value.x, u.value.y];
      return { posts: v(shared.uWinPosts), rails: v(shared.uWinRails), boards: v(shared.uWinBoards), cap: v(shared.uWinCap), cleanup: v(shared.uWinClean) };
    },
    uniforms: shared,
  };

  function setVisible(list, v) {
    for (const m of list) m.visible = v;
  }

  function applyNew() {
    // new fence meshes for the current mode
    for (let t = 0; t < 5; t++) setVisible(TYPE_MESHES[t], false);
    setVisible(INSTALL_MESHES, state.mode === 'install');
    for (const mats of TYPE_MATS) for (const m of mats) {
      m.userData.u.uSweep.value.y = 0;
      m.userData.u.uBuild.value = 1;
    }
    const cu = contactObj ? contactObj.uniforms : null;
    if (state.mode === 'install') {
      setVisible(TYPE_MESHES[0], true);
      M.t0.userData.u.uBuild.value = state.install;
      M.ikit.userData.u.uBuild.value = state.install;
      M.ipine.userData.u.uBuild.value = state.install;
      M.string.userData.u.uBuild.value = state.install;
      if (cu) {
        cu.uNew.value.set(CONTACT[0], CONTACT[0], 1, 1);
        cu.uBuildC.value = state.install;
      }
    } else if (state.mode === 'styles') {
      const { from, to, k } = state.style;
      const L = 44, w = config.sweepWidth;
      if (from === to || k >= 1 || k <= 0) {
        const t = k <= 0 ? from : to;
        setVisible(TYPE_MESHES[t], true);
        if (cu) cu.uNew.value.set(CONTACT[t], CONTACT[t], 0, 1);
      } else {
        const front = -w * 0.6 - 1.5 + k * (L + w * 2.2 + 3);
        setVisible(TYPE_MESHES[from], true);
        setVisible(TYPE_MESHES[to], true);
        for (const m of TYPE_MATS[from]) m.userData.u.uSweep.value.set(front, -1, w, HEIGHTS[from] + 0.45);
        for (const m of TYPE_MATS[to]) m.userData.u.uSweep.value.set(front, 1, w, HEIGHTS[to] + 0.45);
        if (cu) {
          cu.uNew.value.set(CONTACT[from], CONTACT[to], 2, 1);
          cu.uSweepC.value.set(front, 1, w, 0);
        }
      }
    } else if (cu) cu.uNew.value.set(0, 0, 0, 0);
  }

  function applyRepair() {
    const repairMode = state.mode === 'repair';
    shared.uRepairOn.value = repairMode ? 1 : 0;
    const r = repairMode ? state.repair : 0;
    shared.uRepair.value = r;
    setVisible(REPAIR_ONLY, repairMode);
    const att = shared.uAttach.value;
    if (!repairMode) {
      att[0].identity();
      att[1].identity();
      att[2].identity();
      return;
    }
    // gate: sagging until lifted level (0.70 - 0.78)
    att[0].copy(gateMatrix(1 - smooth(0.7, 0.78, r)));
    // leaning post: straightened 0.28 - 0.32
    att[1].copy(leanMatrix(1 - smooth(0.28, 0.32, r)));
    // branch: lifted away toward the neighbour's side, 0.20 - 0.28
    const kb = smooth(0.2, 0.28, r);
    const piv = oldB.branch.pivot;
    att[2].makeTranslation(-1.6 * kb, 2.4 * kb * kb + 0.6 * kb, -0.3 * kb).multiply(new THREE.Matrix4().makeTranslation(piv.x, piv.y, piv.z)).multiply(new THREE.Matrix4().makeRotationZ(0.25 * kb)).multiply(new THREE.Matrix4().makeTranslation(-piv.x, -piv.y, -piv.z));
  }

  function apply() {
    applyNew();
    applyRepair();
  }

  // ---------------------------------------------------------------- quality
  let level = 'high';
  function setQuality(q) {
    if (!['max', 'high', 'medium', 'low'].includes(q)) return;
    level = q;
    const low = q === 'low';
    // thin things stop casting shadows at low; litter thins out
    // 3.4 mm wires cannot be resolved by the shadow map (1-2 cm texels): never cast
    meshes.t4g.castShadow = false;
    meshes.t3m.castShadow = !low;
    meshes.ikit.castShadow = true;
    meshes.leaves.geometry.setDrawRange(0, Math.floor((leafCount * (q === 'low' ? 0.6 : q === 'medium' ? 0.8 : 1)) / 6) * 6);
  }

  setQuality(quality);
  apply();
  const timings = { textures: Math.round(tTex - t0), texMs, geometry: Math.round(tGeo - tTex), total: Math.round(performance.now() - t0) };

  function anchorsNow() {
    const att = shared.uAttach.value;
    const out = {};
    out.branche = oldB.branch.anchor.clone().applyMatrix4(att[2]);
    for (const [id, a] of Object.entries(ANCHORS_REST)) out[id] = a.p.clone().applyMatrix4(att[a.att]);
    return out;
  }

  return {
    group,
    meshes,
    materials: M,
    textures,
    config,
    timings,
    setMode(mode) {
      if (mode !== 'install' && mode !== 'styles' && mode !== 'repair') return;
      state.mode = mode;
      apply();
    },
    setInstall(p) {
      state.install = clamp01(p);
      if (state.mode === 'install') applyNew();
    },
    setStyle(from, to, k) {
      const f = Math.max(0, Math.min(4, Math.round(from))), t = Math.max(0, Math.min(4, Math.round(to)));
      state.style = { from: f, to: t, k: clamp01(k) };
      if (state.mode === 'styles') applyNew();
    },
    setRepair(p) {
      state.repair = clamp01(p);
      if (state.mode === 'repair') applyRepair();
    },
    anchors: anchorsNow,
    info() {
      // metres "posés" for the log counter: posts, rails and boards weigh a third each
      const p = state.mode === 'install' ? state.install : 1;
      const W = config.windows;
      const f = (w) => clamp01((p - w[0]) / (w[1] - w[0]));
      const built = Math.round(TOTAL * (f(W.posts) * 0.34 + f(W.rails) * 0.33 + f(W.boards) * 0.33));
      return { right: 44, front: 33, total: TOTAL, built, windows: W, mode: state.mode, style: { ...state.style }, repair: state.repair, types: FENCE_TYPES };
    },
    groundAO() {
      const p = state.mode === 'install' ? state.install : 1;
      if (state.mode === 'repair') return [0, 0, 1];
      const t = state.mode === 'styles' ? (state.style.k >= 0.5 ? state.style.to : state.style.from) : 0;
      const W = config.windows;
      const builtD = state.mode === 'install' ? 44 * clamp01((p - W.boards[0]) / (W.boards[1] - W.boards[0])) : 77;
      return [CONTACT[t] / 0.42, builtD, 1];
    },
    update(dt, time) {
      shared.uTime.value = time;
      if (renderer && renderer.domElement) shared.uViewH.value = renderer.domElement.height || 900;
    },
    setQuality,
    showAll() {
      const vis = new Map();
      group.traverse((o) => {
        if (o.isMesh) {
          vis.set(o, o.visible);
          o.visible = true;
        }
      });
      return () => {
        for (const [o, v] of vis) o.visible = v;
        apply();
      };
    },
    stats() {
      let meshesVisible = 0, calls = 0, triangles = 0, shadowTriangles = 0;
      group.traverse((o) => {
        if (!o.isMesh || !o.visible) return;
        meshesVisible++;
        const g = o.geometry;
        const n = Math.min(g.index ? g.index.count : g.attributes.position.count, g.drawRange.count) / 3;
        calls += 1 + (o.castShadow ? 1 : 0);
        triangles += n;
        if (o.castShadow) shadowTriangles += n;
      });
      let geometries = 0;
      group.traverse((o) => o.isMesh && geometries++);
      return { mode: state.mode, level, meshes: meshesVisible, calls, triangles: Math.round(triangles), shadowTriangles: Math.round(shadowTriangles), geometries, textures: textures.length, timings };
    },
  };
}
