// BALANCIER studio: the x-ray sapphire look (03 L'atelier, 04 Transparence, the tide's lower side).
// Crystal-clear ice-blue glass: strong Fresnel rims, bright white glints from the studio env, the light
// seen through tinted ice blue, parts visible through each other. Metal parts read as thick sapphire,
// flat parts (dial, lume) as thin frosted sapphire, jewels stay ruby-tinted, blued screws and the
// hairspring turn cobalt glass; the dial print and the bezel numerals stay legible as frosted engraving.
//
//   const kit = createSapphireKit({ envMap: envLight.texture, uniforms: tide });   // uniforms optional
//   const glass = kit.twin(watch.group);   // a sapphire clone of the scene graph: SHARES geometries and
//   scene.add(glass.group);                // instance matrices (no duplicated buffers); add it at the
//                                          // scene root (or anywhere: sync() compensates its parent)
//   every frame, after the watch is posed:  kit.sync()   (≈ 50 matrix copies; cheap)
//   kit.materialFor(kind, srcMesh?)        shared material per mesh.userData.kind (+ texture variants)
//   kit.setEnvMap(tex), kit.setEnvRotation(yaw), kit.setOpacity(v), kit.setTide(false) (no screen-space
//   cut: the whole twin draws), kit.dispose()
//
// Transparency: premultiplied « over » with a LOW alpha (most of the colour is added light), depthWrite
// false, one pass per mesh (DoubleSide, forceSinglePass) and a FIXED renderOrder per twin mesh: the blend
// order never changes from one frame to the next, so the exploded line never pops.
// With uniforms (createTideUniforms), every material is cut 'below' the materials' line (uWipe) with the
// crest on its edge: the steel watch patched 'above' meets it exactly on the line.
import * as THREE from 'three';
import { TIDE_MATERIAL_GLSL } from './tide.js';

// looks: tint = colour of the light seen through; body = its strength; rim = Fresnel edge colour × rimK,
// rimPow its tightness; spec = env reflection × Fresnel; rough / frost = env blur of the reflection / of
// the light through; alpha = how much it darkens what is behind (+ rimAlpha on the edges)
const LOOKS = {
  thick: { tint: [0.62, 0.8, 1.0], body: 0.07, rim: [0.74, 0.88, 1.0], rimK: 0.42, rimPow: 2.8, flatRim: 0.35, crease: 0.35, edge: 0.55, spec: 1.0, rough: 0.035, frost: 0.22, alpha: 0.035, rimAlpha: 0.2 },
  hands: { tint: [0.74, 0.87, 1.0], body: 0.14, rim: [0.86, 0.94, 1.0], rimK: 0.7, rimPow: 2.2, flatRim: 0.6, crease: 0.5, edge: 0.7, spec: 1.1, rough: 0.03, frost: 0.2, alpha: 0.08, rimAlpha: 0.3 },
  insert: { tint: [0.34, 0.56, 1.0], body: 0.1, rim: [0.55, 0.76, 1.0], rimK: 0.4, rimPow: 2.6, flatRim: 0.35, crease: 0.3, edge: 0.5, spec: 0.9, rough: 0.04, frost: 0.25, alpha: 0.08, rimAlpha: 0.22, mask: 'luma', maskK: 0.55 },
  plate: { tint: [0.66, 0.8, 1.0], body: 0.04, rim: [0.72, 0.86, 1.0], rimK: 0.3, rimPow: 3.2, flatRim: 0.08, crease: 0.25, edge: 0.45, spec: 0.15, rough: 0.06, frost: 0.32, alpha: 0.03, rimAlpha: 0.16 },
  wheel: { tint: [0.74, 0.86, 1.0], body: 0.06, rim: [0.84, 0.92, 1.0], rimK: 0.45, rimPow: 2.6, flatRim: 0.12, crease: 0.35, edge: 0.55, spec: 0.25, rough: 0.04, frost: 0.25, alpha: 0.04, rimAlpha: 0.22 },
  thin: { tint: [0.78, 0.88, 1.0], body: 0.085, rim: [0.8, 0.9, 1.0], rimK: 0.22, rimPow: 3.2, flatRim: 0.1, crease: 0.15, edge: 0.3, spec: 0.2, rough: 0.16, frost: 0.55, alpha: 0.07, rimAlpha: 0.12 },
  print: { tint: [0.9, 0.95, 1.0], body: 0.0, rim: [0.9, 0.95, 1.0], rimK: 0.0, rimPow: 3.0, flatRim: 0, crease: 0, edge: 0.0, spec: 0.0, rough: 0.3, frost: 0.6, alpha: 0.0, rimAlpha: 0.0, mask: 'alpha', maskK: 0.6 },
  lume: { tint: [0.82, 0.92, 1.0], body: 0.2, rim: [0.85, 0.94, 1.0], rimK: 0.5, rimPow: 2.4, flatRim: 0.3, crease: 0.2, edge: 0.5, spec: 0.3, rough: 0.12, frost: 0.5, alpha: 0.1, rimAlpha: 0.18 },
  crystal: { tint: [0.7, 0.84, 1.0], body: 0.015, rim: [0.8, 0.9, 1.0], rimK: 0.3, rimPow: 3.4, flatRim: 0.25, crease: 0.3, edge: 0.5, spec: 0.9, rough: 0.02, frost: 0.15, alpha: 0.015, rimAlpha: 0.14 },
  ruby: { tint: [1.0, 0.1, 0.22], body: 0.55, rim: [1.0, 0.4, 0.5], rimK: 0.8, rimPow: 1.8, flatRim: 0.6, crease: 0.4, edge: 0.5, spec: 0.8, rough: 0.03, frost: 0.2, alpha: 0.28, rimAlpha: 0.3 },
  blued: { tint: [0.2, 0.38, 1.0], body: 0.26, rim: [0.42, 0.62, 1.0], rimK: 0.6, rimPow: 2.0, flatRim: 0.5, crease: 0.4, edge: 0.5, spec: 0.6, rough: 0.05, frost: 0.25, alpha: 0.12, rimAlpha: 0.25 },
};

// watch kinds (src/world/watch: mesh.userData.kind / variant) → look
const KIND_LOOK = {
  steelPolished: 'thick', steelBrushed: 'thick', hands: 'hands', ceramic: 'insert', crystal: 'crystal',
  dial: 'thin', print: 'print', lume: 'lume', rhodium: 'plate', gilt: 'wheel', ruby: 'ruby', blued: 'blued',
};

const vert = /* glsl */ `
#include <common>
varying vec3 vN;
varying vec3 vV;
#ifdef USE_MASK
varying vec2 vUv;
#endif
void main() {
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  vN = normalize(transformedNormal);
  vV = -mvPosition.xyz;
  #ifdef USE_MASK
  vUv = uv;
  #endif
}`;

const frag = /* glsl */ `
#include <common>
#include <cube_uv_reflection_fragment>
#ifdef USE_TIDE
${TIDE_MATERIAL_GLSL}
#endif
uniform sampler2D uEnv;
uniform float uEnvI;
uniform mat3 uEnvRot;
uniform float uOpacity;
uniform vec3 uTint;
uniform float uBody;
uniform vec3 uRimC;
uniform float uRimK;
uniform float uRimPow;
uniform float uEdge;
uniform float uFlatRim;
uniform float uCrease;
uniform float uSpec;
uniform float uRough;
uniform float uFrost;
uniform float uAlpha;
uniform float uRimAlpha;
varying vec3 vN;
varying vec3 vV;
#ifdef USE_MASK
uniform sampler2D uMask;
uniform float uMaskK;
varying vec2 vUv;
#endif
void main() {
  #ifdef USE_TIDE
  float tideDist = tideD();
  if (tideDist >= 0.0) discard;
  #endif
  // glass looks the same from both sides: the normal always faces the viewer (robust to meshes whose
  // winding and normals disagree, and to the inner walls of tubes and rings seen through the glass)
  vec3 V = normalize(vV);
  vec3 N = normalize(vN);
  float nv = dot(N, V);
  N *= nv < 0.0 ? -1.0 : 1.0;
  float ndv = abs(nv);
  float fr = 1.0 - ndv;
  float F = 0.077 + 0.923 * pow(fr, 5.0);           // Schlick, sapphire (ior 1.77)
  vec3 Nw = uEnvRot * normalize((vec4(N, 0.0) * viewMatrix).xyz);   // world space, turned with the env
  vec3 Vw = uEnvRot * normalize((vec4(V, 0.0) * viewMatrix).xyz);
  vec3 envR = textureCubeUV(uEnv, reflect(-Vw, Nw), uRough).rgb * uEnvI;
  // reflections: a dim base (the studio seen in the glass) + crisp glints where a softbox core reflects;
  // no broad veil, so stacked parallel faces (crystal, dial, plates) do not add up to a white blob
  vec3 glint = max(envR - 1.6, 0.0) * (gl_FrontFacing ? 0.42 : 0.0);  // glints on the outer faces only
  envR = envR / (1.0 + envR) * 0.45 + glint;
  vec3 envT = textureCubeUV(uEnv, refract(-Vw, Nw, 0.565), uFrost).rgb * uEnvI;
  envT /= 1.0 + envT;                                // the light seen through, 0..1
  // flat faces seen exactly edge-on (the plates and discs of a lying watch) would stack into a white band:
  // the rims peak just inside a silhouette and fall to zero at a perfectly grazing angle
  float graze = smoothstep(0.0, 0.14, ndv);
  // curvature from screen-space derivatives: Fresnel rims belong to curved surfaces (link edges, the
  // bezel's slope, the case's silhouette), not to the many flat discs of the movement stacked in depth;
  // a normal that jumps inside a pixel quad is a crease: a crisp x-ray edge line
  vec3 dN = fwidth(normalize(vN));
  float curv = length(dN) / max(length(fwidth(vV)), 1e-5);
  float curved = smoothstep(0.04, 0.4, curv);
  float crease = smoothstep(0.12, 0.7, length(dN));
  float rim = pow(fr, uRimPow) * graze * mix(uFlatRim, 1.0, curved);
  float edge = pow(fr, 9.0) * smoothstep(0.0, 0.09, ndv); // the crisp white edge of a polished facet
  F *= 0.35 + 0.65 * graze;
  // back faces (the far wall of a thick part) a little dimmer: the volume reads
  float back = gl_FrontFacing ? 1.0 : 0.55;
  vec3 col = envR * F * uSpec * back * back
           + uTint * uBody * (0.25 + 0.75 * envT) * back
           + uRimC * rim * uRimK * back
           + vec3(0.9, 0.96, 1.0) * (edge * uEdge + crease * uCrease) * back;
  float a = uAlpha + rim * uRimAlpha + F * 0.2 + crease * uCrease * 0.3;
  #ifdef USE_MASK
  vec4 m = texture2D(uMask, vUv);
  #ifdef MASK_LUMA
  float mk = smoothstep(0.42, 0.85, dot(m.rgb, vec3(0.3, 0.55, 0.15))) * m.a;
  #else
  float mk = m.a * smoothstep(0.3, 0.8, dot(m.rgb, vec3(0.333)));
  #endif
  col += vec3(0.86, 0.93, 1.0) * mk * uMaskK * (0.55 + 0.45 * envT.b);
  a += mk * uMaskK * 0.35;
  #endif
  col *= uOpacity;
  a = clamp(a, 0.0, 1.0) * uOpacity;
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #ifdef USE_TIDE
  { float cd = -tideDist / uPx; float c = exp(-cd * cd / 1.4) * 0.9 + exp(-cd / 7.0) * 0.22;
    c *= uCrest * uOpacity; gl_FragColor.rgb += vec3(0.85, 0.93, 1.0) * c; gl_FragColor.a = min(1.0, gl_FragColor.a + c * 0.6); }
  #endif
}`;

function cubeUVDefines(tex) {
  const h = tex && tex.image && tex.image.height ? tex.image.height : 1024;
  const maxMip = Math.log2(h) - 2;
  return {
    ENVMAP_TYPE_CUBE_UV: '',
    CUBEUV_TEXEL_WIDTH: String(1 / (3 * Math.max(Math.pow(2, maxMip), 7 * 16))),
    CUBEUV_TEXEL_HEIGHT: String(1 / h),
    CUBEUV_MAX_MIP: maxMip.toFixed(1),
  };
}

export function createSapphireKit({ envMap, uniforms = null, envIntensity = 1 } = {}) {
  const shared = {
    uEnv: { value: envMap },
    uEnvI: { value: envIntensity },
    uEnvRot: { value: new THREE.Matrix3() }, // turn the studio around the glass (light play: glints travel)
    uOpacity: { value: 1 },
  };
  let tideOn = !!uniforms;
  const cache = new Map(); // key → material
  const twins = [];

  function makeMaterial(lookName, maskTex = null) {
    const L = LOOKS[lookName] || LOOKS.thick;
    const defines = { ...cubeUVDefines(envMap) };
    if (tideOn) defines.USE_TIDE = '';
    if (maskTex && L.mask) { defines.USE_MASK = ''; if (L.mask === 'luma') defines.MASK_LUMA = ''; }
    const u = {
      ...shared,
      uTint: { value: new THREE.Vector3(...L.tint) }, uBody: { value: L.body },
      uRimC: { value: new THREE.Vector3(...L.rim) }, uRimK: { value: L.rimK }, uRimPow: { value: L.rimPow }, uEdge: { value: L.edge || 0 }, uFlatRim: { value: L.flatRim ?? 0.3 }, uCrease: { value: L.crease ?? 0.3 },
      uSpec: { value: L.spec }, uRough: { value: L.rough }, uFrost: { value: L.frost },
      uAlpha: { value: L.alpha }, uRimAlpha: { value: L.rimAlpha },
      uMask: { value: maskTex }, uMaskK: { value: L.maskK || 0 },
    };
    if (uniforms) Object.assign(u, { uTime: uniforms.uTime, uRes: uniforms.uRes, uWipe: uniforms.uWipe, uPx: uniforms.uPx, uCrest: uniforms.uCrest });
    const m = new THREE.ShaderMaterial({
      name: `sapphire.${lookName}${maskTex ? '.mask' : ''}`,
      vertexShader: vert, fragmentShader: frag, uniforms: u, defines,
      transparent: true, premultipliedAlpha: true, blending: THREE.NormalBlending,
      depthWrite: false, depthTest: true, side: THREE.DoubleSide, forceSinglePass: true,
    });
    m.userData.look = lookName;
    return m;
  }

  // a shared material per kind; meshes with a texture that carries engraving (dial print, bezel insert)
  // get a variant that reads it as frosted engraving (one per texture, the texture itself is shared)
  function materialFor(kind, srcMesh = null) {
    const look = KIND_LOOK[kind] || 'thick';
    const L = LOOKS[look];
    let tex = null;
    if (L.mask && srcMesh && srcMesh.material) {
      const sm = Array.isArray(srcMesh.material) ? srcMesh.material[0] : srcMesh.material;
      tex = sm.map || null;
    }
    const key = `${look}|${tex ? tex.uuid : ''}`;
    let m = cache.get(key);
    if (!m) { m = makeMaterial(look, tex); cache.set(key, m); }
    return m;
  }

  // a sapphire clone sharing geometries and instance matrices: one flat group of meshes whose matrices
  // are copied from the source's world matrices in sync() (no hierarchy to keep in step)
  function twin(source, { renderOrder = 100 } = {}) {
    const group = new THREE.Group();
    group.name = `${source.name || 'object'}.sapphire`;
    group.matrixAutoUpdate = false;
    const pairs = [];
    source.traverse((o) => {
      if (!o.isMesh) return;
      const kind = o.userData.kind || 'steelPolished';
      const mat = materialFor(kind, o);
      let t;
      if (o.isInstancedMesh) {
        t = new THREE.InstancedMesh(o.geometry, mat, 0);
        t.instanceMatrix = o.instanceMatrix; // shared attribute → one GPU buffer, one upload per change
        if (o.instanceColor) t.instanceColor = o.instanceColor;
        t.count = o.count;
        t.frustumCulled = false;
      } else {
        t = new THREE.Mesh(o.geometry, mat);
        t.frustumCulled = o.frustumCulled;
      }
      t.name = `${o.name}.sapphire`;
      t.matrixAutoUpdate = false;
      t.renderOrder = renderOrder + pairs.length; // fixed blend order: no popping
      t.userData = { kind, part: o.userData.part, variant: o.userData.variant, source: o };
      group.add(t);
      pairs.push([o, t]);
    });
    const inv = new THREE.Matrix4();
    const tw = {
      group,
      meshes: pairs.map((p) => p[1]),
      // copy the source's world transforms, geometry swaps (quality rebuilds), visibility and instance counts
      sync() {
        source.updateWorldMatrix(true, true);
        const parent = group.parent;
        let useInv = false;
        if (parent) { parent.updateWorldMatrix(true, false); inv.copy(parent.matrixWorld).invert(); useInv = true; }
        for (let i = 0; i < pairs.length; i++) {
          const s = pairs[i][0], t = pairs[i][1];
          let vis = true;
          for (let o = s; o && vis; o = o === source ? null : o.parent) vis = o.visible;
          t.visible = vis;
          if (!vis) continue;
          if (useInv) t.matrix.multiplyMatrices(inv, s.matrixWorld); else t.matrix.copy(s.matrixWorld);
          t.matrixWorldNeedsUpdate = true;
          if (t.geometry !== s.geometry) t.geometry = s.geometry;
          if (s.isInstancedMesh) { t.instanceMatrix = s.instanceMatrix; t.count = s.count; }
        }
      },
      dispose() { group.removeFromParent(); twins.splice(twins.indexOf(tw), 1); },
    };
    twins.push(tw);
    tw.sync();
    return tw;
  }

  return {
    materialFor,
    twin,
    sync() { for (const t of twins) t.sync(); },
    materials: () => [...cache.values()],
    looks: LOOKS,
    setEnvMap(tex) {
      const was = shared.uEnv.value;
      shared.uEnv.value = tex;
      const h0 = was && was.image ? was.image.height : 0, h1 = tex && tex.image ? tex.image.height : 0;
      if (h0 !== h1) for (const m of cache.values()) { Object.assign(m.defines, cubeUVDefines(tex)); m.needsUpdate = true; }
    },
    setEnvIntensity(v) { shared.uEnvI.value = v; },
    // turn the env around the world Y axis (radians): the glints travel across the still glass; pair it
    // with material.envMapRotation.y on the steel materials for the same light in both twins
    setEnvRotation(yaw) { const c = Math.cos(yaw), s = Math.sin(yaw); shared.uEnvRot.value.set(c, 0, -s, 0, 1, 0, s, 0, c); },
    setOpacity(v) { shared.uOpacity.value = v; },
    // false: no screen-space cut (the whole twin draws); true: cut below the materials' line (needs uniforms)
    setTide(on) {
      on = !!on && !!uniforms;
      if (on === tideOn) return;
      tideOn = on;
      for (const m of cache.values()) { if (on) m.defines.USE_TIDE = ''; else delete m.defines.USE_TIDE; m.needsUpdate = true; }
    },
    dispose() {
      for (const m of cache.values()) m.dispose();
      cache.clear();
      for (const t of [...twins]) t.dispose();
    },
  };
}
