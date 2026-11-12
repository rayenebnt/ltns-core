// Port module: the terminal. The yard ground (light concrete, slab joints, painted bay lines,
// numbers and arrows, contact shadows; in the studio side view it becomes a pure paper-coloured
// shadow catcher), the background stacks (instanced, rows to the north and a few to the south,
// out of the side view's frame), the light masts.
import * as THREE from 'three';
import { PORT, CONTAINER } from '../layout.js';
import { Kit, cyl, box, rbox, mat, lin, kitMaterial, boxMaterial, shared } from './kit.js';
import { containerGeometry, instAttr, PALETTE } from './container.js';
import { genericAtlas, yardMarkings } from './textures.js';

// a seeded random (mulberry32)
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// rows of 40' slots (long axis along X)
export function yardRows() {
  const rows = [];
  const blocks = [
    { block: 'A', z: [-14, -18.4, -22.8, -27.2] },
    { block: 'B', z: [-41, -45.4, -49.8, -54.2] },
    { block: 'C', z: [-68, -72.4, -76.8, -81.2] },
  ];
  for (const b of blocks) for (const z of b.z) rows.push({ block: b.block, z, x0: -62, pitch: 12.6, slots: 11 });
  // south apron, out of the side view's frame
  rows.push({ block: 'S', z: 16, x0: -66, pitch: 12.6, slots: 3 }, { block: 'S', z: 20.4, x0: -66, pitch: 12.6, slots: 3 });
  rows.push({ block: 'T', z: 16, x0: 46, pitch: 12.6, slots: 2 }, { block: 'T', z: 20.4, x0: 46, pitch: 12.6, slots: 2 });
  return rows;
}

export const LANES = [
  // the hero / truck lane to the gate (yellow edges, arrows east)
  { z: 0, w: 6.6, x0: -66, x1: 88, color: 'yellow', arrows: [40, 56], dir: 1 },
  // driving lanes between the blocks (white edges, dashed centre, arrows both ways)
  { z: -34, w: 7, x0: -66, x1: 88, dash: true, arrows: [-30, 10, 50], dir: 1 },
  { z: -61, w: 7, x0: -66, x1: 88, dash: true, arrows: [-10, 30, 70], dir: -1 },
  { z: 10, w: 5.4, x0: -66, x1: 88, dash: true, arrows: [-40, 70], dir: -1 },
];

const MASTS = [[-52, -32], [80, -36], [-46, -86], [38, -88], [82, 24], [-64, 26]];

function groundMaterial(markTex, bounds) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0, envMapIntensity: 0.6 });
  const NB = 24;
  const u = {
    uMarks: { value: markTex },
    uBounds: { value: new THREE.Vector4(...bounds) },
    uConcrete: { value: new THREE.Color('#aeb2b3') },
    uBlob: { value: Array.from({ length: NB }, () => new THREE.Vector4(0, 0, 0, 0)) },
    uBlobB: { value: Array.from({ length: NB }, () => new THREE.Vector4(1, 0, 0, 1)) },
    uShadowDark: { value: 0.32 },
    uMarkK: { value: 1 },
    // the colour (output space) the yard's edges fade to in lit mode; < 0 = the paper. The
    // integrator sets the voyage map ground's rendered colour, so there is no seam at the yard's end
    uEdgeOut: { value: new THREE.Vector3(-1, -1, -1) },
  };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, shared);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos;
        uniform sampler2D uMarks; uniform vec4 uBounds; uniform vec3 uConcrete; uniform float uShadowDark; uniform float uMarkK;
        uniform vec4 uBlob[${NB}]; uniform vec4 uBlobB[${NB}];
        uniform float uStudio; uniform vec3 uPaper; uniform vec3 uEdgeOut;
        float gHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float gNoise(vec2 x){ vec2 i = floor(x); vec2 f = fract(x); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(gHash(i), gHash(i + vec2(1, 0)), f.x), mix(gHash(i + vec2(0, 1)), gHash(i + vec2(1, 1)), f.x), f.y); }
        float blobAO(vec2 p){
          float ao = 1.0;
          for (int i = 0; i < ${NB}; i++) {
            vec4 b = uBlob[i]; vec4 bb = uBlobB[i];
            if (bb.z <= 0.0) continue;
            vec2 d = p - b.xy; d = vec2(d.x * bb.x + d.y * bb.y, -d.x * bb.y + d.y * bb.x);
            vec2 q = abs(d) - b.zw;
            float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
            ao *= 1.0 - bb.z * (1.0 - smoothstep(-0.25 * bb.w, bb.w, sd));
          }
          return ao;
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 gp = vWPos.xz;
        // slabs 6 m × 6 m: tone per slab, joints, stains
        vec2 cell = floor(gp / 6.0);
        float tone = 0.94 + 0.08 * gHash(cell);
        vec2 f = abs(fract(gp / 6.0) - 0.5) * 6.0; // distance to the slab centre lines
        vec2 jd = 3.0 - f; // distance to the joints (m)
        float jw = max(fwidth(gp.x), 0.002) * 0.9;
        float joint = 1.0 - smoothstep(0.008, 0.008 + jw * 1.2, min(jd.x, jd.y));
        float n1 = gNoise(gp * 0.35);
        float n2 = gNoise(gp * 2.3 + 7.0);
        vec3 conc = uConcrete * tone * (0.94 + 0.06 * n1) * (0.97 + 0.03 * n2);
        conc *= 1.0 - 0.06 * smoothstep(0.62, 0.9, gNoise(gp * 0.08 + 3.0)); // oil and tyre stains
        conc *= 1.0 - 0.15 * joint;
        // paint (from the markings texture)
        vec2 muv = (gp - uBounds.xy) / (uBounds.zw - uBounds.xy);
        vec4 mk = texture2D(uMarks, vec2(muv.x, 1.0 - muv.y));
        float inside = step(0.0, muv.x) * step(muv.x, 1.0) * step(0.0, muv.y) * step(muv.y, 1.0);
        conc = mix(conc, mk.rgb * (0.9 + 0.1 * n2), mk.a * inside * uMarkK * (0.82 + 0.18 * n1));
        diffuseColor.rgb = conc;
        float gAO = blobAO(gp);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = 0.86 + 0.1 * n2;')
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= gAO; reflectedLight.directDiffuse *= mix(1.0, gAO, 0.6);')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        {
          float shK = 1.0;
          #if defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 )
            DirectionalLightShadow dls = directionalLightShadows[ 0 ];
            shK = getShadow( directionalShadowMap[ 0 ], dls.shadowMapSize, dls.shadowIntensity, dls.shadowBias, dls.shadowRadius, vDirectionalShadowCoord[ 0 ] );
          #endif
          vec3 paperOut = linearToOutputTexel(vec4(uPaper, 1.0)).rgb;
          // studio: paper with soft shadows and contact darkening only; the yard edges fade to paper too
          float far = smoothstep(18.0, 120.0, -vWPos.z) ;
          float shade = (1.0 - uShadowDark * (1.0 - shK)) * mix(1.0, gAO, 0.85);
          vec3 studio = paperOut * mix(shade, 1.0, far);
          vec2 eb = min(gp - uBounds.xy, uBounds.zw - gp);
          float edge = smoothstep(-2.0, 10.0, min(eb.x, eb.y));
          vec3 lit = mix(uEdgeOut.x < 0.0 ? paperOut : uEdgeOut, gl_FragColor.rgb, edge);
          gl_FragColor.rgb = mix(lit, studio, uStudio);
        }`);
  };
  m.customProgramCacheKey = () => 'sillage-ground';
  return m;
}

function mastGeometry(quality) {
  const k = new Kit();
  const G = { c: lin('#9aa0a4'), r: 0.45, m: 0.7 };
  const D = { c: lin('#2c3034'), r: 0.6, m: 0.3 };
  const h = 30;
  for (const [x, z] of MASTS) {
    k.add(cyl(0.22, 0.42, h, 10), mat([x, h / 2, z]), G);
    k.add(cyl(0.7, 0.7, 0.3, 10), mat([x, 0.15, z]), { c: lin('#bcbfbf'), r: 0.9, m: 0 });
    // head: a ring frame with 6 floodlights
    k.add(cyl(1.3, 1.3, 0.12, 14, true), mat([x, h + 0.1, z]), D);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      k.add(rbox(0.6, 0.18, 0.45, 0.03), mat([x + Math.cos(a) * 1.2, h + 0.25, z + Math.sin(a) * 1.2], [0, -a, 0.5]), D);
    }
    k.add(box(0.3, 1.2, 0.3), mat([x, h - 0.8, z]), D);
  }
  return k.build();
}

export function createTerminal({ quality = 'high' } = {}) {
  const group = new THREE.Group();
  group.name = 'terminal';
  const rows = yardRows();
  const yard = PORT.yard;
  // ground
  const marks = yardMarkings(yard, rows, LANES);
  const gmat = groundMaterial(marks.texture, marks.bounds);
  const pad = 40;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(yard.maxX - yard.minX + pad * 2, yard.maxZ - yard.minZ + pad * 2), gmat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((yard.minX + yard.maxX) / 2, PORT.ground, (yard.minZ + yard.maxZ) / 2);
  ground.receiveShadow = true;
  ground.name = 'yard-ground';
  group.add(ground);

  // background stacks
  const atlas = genericAtlas();
  const boxMat = boxMaterial({ atlas, cells: 4, rust: 1, name: 'stacks' });
  const r = rng(41207);
  const items = [];
  for (const row of rows) {
    for (let s = 0; s < row.slots; s++) {
      const x = row.x0 + s * row.pitch + row.pitch / 2;
      const roll = r();
      let n = roll < 0.12 ? 0 : roll < 0.38 ? 1 : roll < 0.78 ? 2 : 3;
      if (row.block === 'S' || row.block === 'T') n = Math.min(n, 2);
      let y = 0;
      for (let i = 0; i < n; i++) {
        const hc = r() < 0.55;
        const two20 = r() < 0.14 && i === 0;
        const pal = PALETTE[Math.floor(r() * PALETTE.length)];
        const h = hc ? CONTAINER.hHC : CONTAINER.h;
        if (two20) {
          for (const dx of [-3.06, 3.06]) items.push({ x: x + dx, y, z: row.z, len: 'l20', hc, pal: PALETTE[Math.floor(r() * PALETTE.length)], flip: r() < 0.5 });
        } else items.push({ x, y, z: row.z, len: 'l40', hc, pal, flip: r() < 0.5 });
        y += h;
        if (two20) break;
      }
    }
  }
  // geometries: 40' HC / 40' std / 20' (LOD1); the instance's y-scale handles std vs HC
  const meshes = [];
  const lod = quality === 'low' ? 2 : 1;
  const g40 = containerGeometry('l40', { hc: true, lod, quality });
  const g20 = containerGeometry('l20', { hc: true, lod, quality });
  const make = (geo, list) => {
    const im = new THREE.InstancedMesh(geo, boxMat, list.length);
    const ia = instAttr(list.length);
    const _m = new THREE.Matrix4();
    const _c = new THREE.Color();
    list.forEach((it, i) => {
      const sy = it.hc ? 1 : CONTAINER.h / CONTAINER.hHC;
      _m.makeScale(1, sy, 1);
      if (it.flip) _m.premultiply(new THREE.Matrix4().makeRotationY(Math.PI));
      _m.setPosition(it.x, it.y, it.z);
      im.setMatrixAt(i, _m);
      _c.set(it.pal[0]);
      ia.setXYZW(i, _c.r, _c.g, _c.b, it.pal[1] + (i * 0.6180339) % 0.999);
    });
    geo.setAttribute('aInst', ia);
    im.castShadow = im.receiveShadow = true;
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    return im;
  };
  const l40 = items.filter((i) => i.len === 'l40');
  const l20 = items.filter((i) => i.len === 'l20');
  const s40 = make(g40, l40);
  const s20 = make(g20, l20);
  s40.name = 'stacks-40';
  s20.name = 'stacks-20';
  meshes.push(s40, s20);
  group.add(s40, s20);

  // light masts
  const mastMat = kitMaterial({ grime: 0, name: 'masts' });
  const masts = new THREE.Mesh(mastGeometry(quality), mastMat);
  masts.castShadow = true;
  masts.receiveShadow = true;
  masts.name = 'masts';
  group.add(masts);

  function setQuality(q) {
    const lv = q === 'low' ? 2 : 1;
    for (const [m, len] of [[s40, 'l40'], [s20, 'l20']]) {
      if (m.geometry.userData.lod === lv) continue;
      const g = containerGeometry(len, { hc: true, lod: lv, quality: q });
      g.setAttribute('aInst', m.geometry.getAttribute('aInst'));
      m.geometry.dispose();
      m.geometry = g;
    }
  }

  return {
    group,
    ground,
    setQuality,
    groundUniforms: gmat.userData.u,
    stacks: meshes,
    count: items.length,
    boxMat,
    textures: [marks.texture, atlas],
    dispose() {
      ground.geometry.dispose();
      gmat.dispose();
      [s40.geometry, s20.geometry, masts.geometry].forEach((g) => g.dispose());
      boxMat.dispose();
      mastMat.dispose();
      marks.texture.dispose();
      atlas.dispose();
    },
  };
}
