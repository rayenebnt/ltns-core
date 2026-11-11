// Garden module of the Cordeau world: sky and light presets, ground, lawn and meadow grass,
// big trees, hedge and shrubs, the maison de maître, the neighbours and the countryside.
//
//   const garden = await createGarden({ renderer, scene, quality, onProgress })
//   garden.heightAt(x, z)          ground height (0 within 3 m of the fence lines)
//   garden.setPreset(name, k)      'ete' | 'orage' (k: ete -> orage) | 'eclaircie' (k: orage -> eclaircie)
//   garden.fitShadow(center, r)    fit the sun's shadow camera to a view (center: Vector3 or [x, y, z])
//   garden.update(dt, time, camera) per frame, before rendering (grass tiles, wind, clouds)
//   garden.setQuality(level)       'max' | 'high' | 'medium' | 'low' (grass, shadow map, leaves)
//   garden.sun                     the shadow-casting DirectionalLight
//   garden.stats()                 garden-side counters (level, preset, blades, leaf cards...)
//   garden.views                   the contract views with a shadow fit each (layout.js VIEWS)
//   garden.setFenceAO(n, d, o)     contact darkening of the lawn along the new fence (strength n,
//                                  built up to distance d from B) and along the old fence (o)
// The garden owns the renderer's shadow-map type, tone mapping (ACES Filmic) and exposure, the
// scene's environment map and its fog (aerial perspective for every material, atmosphere.js).
// Built-in materials get the haze automatically. A custom ShaderMaterial with fog: true must
// merge UniformsLib.fog and HAZE_UNIFORMS into its uniforms (HAZE_GLSL gives applyHaze()).
// Camera: near 0.15, far 6000 (the countryside reaches 4.6 km).
import * as THREE from 'three';
import { HAZE, HAZE_UNIFORMS, HAZE_GLSL } from './atmosphere.js';
import { heightAt, VIEWS } from './layout.js';
import { blendPreset } from './presets.js';
import { createSkyUniforms, createSky, createEnvBaker } from './sky.js';
import { createLightUniforms, syncShadowUniforms, LIGHT_GLSL } from './lighting.js';
import { createGround } from './ground.js';
import { Cards, createTrees, createLeafMaterials } from './trees.js';
import { createShrubs, hedgeCore } from './shrubs.js';
import { createHouse, createNeighbourHouse, createFarmsAndVillage } from './house.js';
import { createCountryside } from './countryside.js';
import { createGrass } from './grass.js';
import { TREES } from './layout.js';

export { HAZE_UNIFORMS, HAZE_GLSL, LIGHT_GLSL, heightAt, VIEWS };

// leaf: share of the leaf cards drawn (the cards grow a little to keep the crowns full)
export const QUALITY = {
  max: { shadow: 4096, grass: 1.0, grassR: 17, leaf: 0.9 },
  high: { shadow: 2048, grass: 0.8, grassR: 14, leaf: 0.76 },
  medium: { shadow: 2048, grass: 0.6, grassR: 10.5, leaf: 0.58 },
  low: { shadow: 1024, grass: 0.4, grassR: 7, leaf: 0.45 },
};

const nextFrame = () => new Promise((r) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => r()) : setTimeout(r, 0)));

export async function createGarden({ renderer, scene, quality = 'high', onProgress = () => {} }) {
  let level = QUALITY[quality] ? quality : 'high';
  let Q = QUALITY[level];
  const timings = [];
  let tPrev = performance.now();
  const progress = async (x, label = '') => {
    const now = performance.now();
    timings.push(`${label || x} ${Math.round(now - tPrev)} ms`);
    tPrev = now;
    try {
      onProgress(x);
    } catch (e) {
      /* the loader is optional */
    }
    await nextFrame();
    tPrev = performance.now();
  };

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  // scene.fog switches the aerial-perspective chunk on (its own values are not used)
  scene.fog = new THREE.FogExp2(0xffffff, 1e-4);

  const sun = new THREE.DirectionalLight(0xffffff, 4);
  sun.name = 'garden-sun';
  sun.castShadow = true;
  sun.shadow.mapSize.set(Q.shadow, Q.shadow);
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.025;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 200;
  scene.add(sun, sun.target);

  const lightU = createLightUniforms(sun);
  const skyU = createSkyUniforms();
  const sky = createSky(skyU);
  scene.add(sky);
  const env = createEnvBaker(renderer, skyU);
  await progress(0.05, 'sky');

  const ground = createGround(lightU);
  scene.add(ground.inner, ground.outer);
  const customMeshes = [ground.inner, ground.outer];
  await progress(0.15, 'ground');

  // trees, hedge and shrubs: bark tubes (one mesh) and all leaf cards (one draw call)
  const cards = new Cards();
  const { bark, trees } = createTrees(TREES, lightU, cards);
  await progress(0.35, 'trees');
  createShrubs(cards);
  const leafGeo = cards.build();
  const leafCount = leafGeo.index.count / 6;
  const leafMats = createLeafMaterials(lightU);
  const leaves = new THREE.Mesh(leafGeo, leafMats.mat);
  leaves.name = 'garden-leaves';
  leaves.customDepthMaterial = leafMats.depth;
  leaves.castShadow = true;
  leaves.frustumCulled = false;
  const hedge = hedgeCore();
  scene.add(bark, leaves, hedge);
  customMeshes.push(leaves);
  await progress(0.45, 'shrubs+atlas');

  // the maison de maître (and the gate pillars), the neighbours' house beyond the old fence
  const house = createHouse();
  const neighbour = createNeighbourHouse();
  // distant farms, the village and its spire, and the countryside impostors
  const farms = createFarmsAndVillage(heightAt);
  const country = createCountryside(lightU);
  scene.add(house, neighbour, farms, country.mesh);
  customMeshes.push(country.mesh);
  await progress(0.6, 'house+country');

  // instanced grass blades around the camera (lawn and meadow, two levels of detail each)
  const grass = createGrass(lightU);
  scene.add(...grass.meshes);
  customMeshes.push(...grass.meshes);
  await progress(0.7, 'grass');

  // every custom shader reads the light's current shadow map (re-created by three on resize)
  const sync = () => syncShadowUniforms(lightU, sun);
  for (const m of customMeshes) m.onBeforeRender = sync;

  // ------------------------------------------------------------ shadow fit
  const fit = { center: new THREE.Vector3(-3, 0, -12), radius: 30 };
  const lx = new THREE.Vector3(), ly = new THREE.Vector3(), tmp = new THREE.Vector3();
  function placeSun() {
    const r = fit.radius;
    const cam = sun.shadow.camera;
    // light basis, then snap the centre to whole texels (no shimmer while the view moves)
    lx.crossVectors(sunDir, Math.abs(sunDir.y) > 0.99 ? tmp.set(1, 0, 0) : tmp.set(0, 1, 0)).normalize();
    ly.crossVectors(lx, sunDir).normalize();
    const texel = (2 * r) / sun.shadow.mapSize.x;
    const c = fit.center;
    const a = Math.round(c.dot(lx) / texel) * texel;
    const b = Math.round(c.dot(ly) / texel) * texel;
    const s = c.dot(sunDir);
    const snapped = tmp.set(0, 0, 0).addScaledVector(lx, a).addScaledVector(ly, b).addScaledVector(sunDir, s);
    const back = r + 60; // tall crowns between the sun and the box still cast into it
    sun.target.position.copy(snapped);
    sun.position.copy(snapped).addScaledVector(sunDir, back);
    cam.left = -r;
    cam.right = r;
    cam.top = r;
    cam.bottom = -r;
    cam.near = 0.5;
    cam.far = back + r + 30;
    cam.updateProjectionMatrix();
    sun.target.updateMatrixWorld();
    sun.updateMatrixWorld();
  }
  function fitShadow(center, radius) {
    if (Array.isArray(center)) fit.center.fromArray(center);
    else if (center) fit.center.copy(center);
    if (radius) fit.radius = radius;
    placeSun();
  }

  // ------------------------------------------------------------ presets
  const sunDir = new THREE.Vector3(-0.5, 0.62, 0.6).normalize();
  let current = blendPreset('ete', 1);
  function applyParams(P) {
    current = P;
    sunDir.set(P.sunDir[0], P.sunDir[1], P.sunDir[2]);
    sun.color.setRGB(P.sunCol[0], P.sunCol[1], P.sunCol[2]);
    sun.intensity = P.sunI;
    sun.shadow.intensity = P.shadow;
    lightU.uSunDir.value.copy(sunDir);
    lightU.uSunCol.value.set(P.sunCol[0] * P.sunI, P.sunCol[1] * P.sunI, P.sunCol[2] * P.sunI);
    lightU.uAmbSky.value.fromArray(P.ambSky);
    lightU.uAmbGround.value.fromArray(P.ambGround);
    lightU.uShadowInfo.value.z = P.shadow;
    lightU.uWet.value = P.wet;
    lightU.uWind.value = P.wind;
    skyU.uZen.value.fromArray(P.zen);
    skyU.uMid.value.fromArray(P.mid);
    skyU.uMie.value.fromArray(P.mie);
    skyU.uGround.value.fromArray(P.ground);
    skyU.uCloudLit.value.fromArray(P.cloudLit);
    skyU.uCloudShade.value.fromArray(P.cloudShade);
    skyU.uCloud.value.fromArray(P.cloud);
    skyU.uDisc.value.fromArray(P.disc);
    HAZE.sun.set(P.sunDir);
    HAZE.hor.set(P.hor);
    HAZE.glow.set(P.glow);
    HAZE.params.set(P.haze);
    renderer.toneMappingExposure = P.exposure;
    scene.environmentIntensity = P.env;
    placeSun();
  }

  // a sun override blended over the preset (direction, colour, intensity), uniforms only: the
  // environment map is not re-baked (the world's warm finale)
  let sunOverride = null, overrideK = 0;
  let baseParams = blendPreset('ete', 1);
  function withOverride(P) {
    if (!sunOverride || overrideK <= 0) return P;
    const k = overrideK, O = sunOverride;
    const lerp3 = (a, b) => a.map((v, i) => v + (b[i] - v) * k);
    const d = lerp3(P.sunDir, O.sunDir || P.sunDir);
    const l = Math.hypot(d[0], d[1], d[2]) || 1;
    return { ...P, sunDir: d.map((v) => v / l), sunCol: lerp3(P.sunCol, O.sunCol || P.sunCol), sunI: P.sunI + ((O.sunI ?? P.sunI) - P.sunI) * k, exposure: P.exposure * (1 + ((O.expMul ?? 1) - 1) * k) };
  }

  // environment maps of the three presets, baked once; blends are baked on demand
  const envRT = {};
  for (const name of ['ete', 'orage', 'eclaircie']) {
    applyParams(blendPreset(name, 1));
    envRT[name] = env.bake();
  }
  let blendRT = null;
  let blendKey = '';
  let presetName = 'ete';
  let presetK = 1;
  function setSunOverride(O, k = 1) {
    sunOverride = O || null;
    overrideK = O ? Math.max(0, Math.min(1, k)) : 0;
    applyParams(withOverride(baseParams));
  }
  function setPreset(name = 'ete', k = 1) {
    if (name !== 'orage' && name !== 'eclaircie') name = 'ete';
    k = Math.max(0, Math.min(1, k));
    presetName = name;
    presetK = k;
    const from = name === 'eclaircie' ? 'orage' : 'ete';
    const kq = Math.round(k * 24) / 24;
    if (name === 'ete' || kq >= 1) scene.environment = envRT[name].texture;
    else if (kq <= 0) scene.environment = envRT[from].texture;
    else {
      const key = `${name}:${kq}`;
      if (key !== blendKey) {
        applyParams(blendPreset(name, kq));
        blendRT = env.bake(blendRT);
        blendKey = key;
      }
      scene.environment = blendRT.texture;
    }
    baseParams = blendPreset(name, k);
    applyParams(withOverride(baseParams));
  }

  // ------------------------------------------------------------ quality
  function setQuality(q) {
    if (!QUALITY[q]) return;
    level = q;
    Q = QUALITY[q];
    // fewer, slightly larger leaf cards (the draw range keeps an even share of every crown)
    leafGeo.setDrawRange(0, Math.round(leafCount * Q.leaf) * 6);
    grass.setQuality(Q.grassR, Q.grass);
    leafMats.shared.uLeafScale.value = Math.min(1.25, 1 / Math.pow(Q.leaf / 0.9, 0.5));
    if (sun.shadow.mapSize.x !== Q.shadow) {
      sun.shadow.mapSize.set(Q.shadow, Q.shadow);
      if (sun.shadow.map) {
        sun.shadow.map.dispose();
        sun.shadow.map = null;
      }
      sync();
      placeSun();
    }
  }

  // ------------------------------------------------------------ per frame
  function update(dt, time, camera) {
    lightU.uTime.value = time;
    if (camera) grass.update(camera);
    skyU.uCloudWind.value.set(time * 0.0045 * (0.6 + current.wind), time * 0.0018 * (0.6 + current.wind));
    sync();
  }

  setQuality(level);
  setPreset('ete', 1);
  fitShadow(fit.center, fit.radius);
  await progress(1, 'presets+env');

  return {
    heightAt,
    setPreset,
    setSunOverride,
    fitShadow,
    update,
    setQuality,
    sun,
    views: VIEWS,
    uniforms: { light: lightU, sky: skyU, ground: ground.uniforms },
    // contrast of the mowing stripes (ground and blades), 1 = as designed
    setStripes(k = 1) {
      ground.uniforms.uFence.value.w = k;
      grass.setStripes(k);
    },
    setFenceAO(newStrength = 0, builtD = 0, oldStrength = 0) {
      const u = ground.uniforms.uFence.value;
      u.x = newStrength;
      u.y = builtD;
      u.z = oldStrength;
    },
    stats() {
      return {
        timings,
        level,
        preset: presetName,
        k: presetK,
        shadowMap: sun.shadow.mapSize.x,
        leafCards: Math.round(leafCount * Q.leaf),
        grassBlades: grass.stats(),
        trees: trees.length,
        billboards: country.count,
      };
    },
  };
}
