// The table: an off-white surface with giant heavy-italic words in relief (real extruded glyphs
// with rounded bevels, Inter Tight Black Italic). One merged mesh, hidden back bevels removed.
// Soft occlusion around the letters is baked once from a top-down render of the glyphs,
// the products' moving contact shadow is sampled live (see shadows.js).
import * as THREE from 'three';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import glyphData from '../fonts/inter-tight-black-italic-words.json';
import { patchMaterial } from './util.js';

// Sizes in cm. In this glyph set the cap height is 1.01 x SIZE (1010 units at resolution 1000):
// SIZE 3.9 gives letters about 23 % of the frame height, as in the reference, and ÉNERGIE
// (5.78 x SIZE wide) reads whole across the frame.
const SIZE = 3.9;
const DEPTH = 0.3;
const BEVEL_T = 0.26;
const BEVEL_S = 0.19; // relatively larger than before: rounder shoulders, softer highlights
const LINE = 4.8; // row pitch: three to four rows on screen, a clear gap between them
const ANGLE = 0.28; // rows rise to the right (16 degrees)
const GAP = 0.42; // word space, em
const TRACK = 0.0; // em
// Inter Tight's kerning sits in a GPOS extension the converter skips: the few pairs used here
const KERN = { LA: -0.05, AT: -0.07, TO: -0.04, AN: -0.01, CL: -0.01, EL: -0.01, NU: 0.0, US: -0.01, RG: -0.01, GI: 0.0 };
export const GROUND = { w: 96, h: 64 };

// Rows from the top, in the rows' own frame (rotated by ANGLE): [text, word index, centre of that
// word along the row (cm)]. The middle row puts ÉNERGIE, whole, behind the upper half of the
// hero bottle at p = 0; the others interleave so no two word gaps line up.
const ROW0 = 3.4; // offset of the middle row (cm, across the rows)
const ROWS = [
  ['ÉCLAT  TONUS  ÉNERGIE', 1, -9.0], // top-left corner only
  ['TONUS  ÉLAN  ÉNERGIE', 1, -6.5], // ÉLAN along the top
  ['ÉLAN  ÉNERGIE  ÉCLAT', 1, -1.0], // ÉNERGIE, whole, behind the shoulder of the bottle
  ['ÉNERGIE  ÉLAN  ÉCLAT  TONUS', 2, 5.0], // ÉCLAT right of the bottle
  ['ÉCLAT  TONUS  ÉLAN', 1, 3.5], // TONUS along the bottom
  ['ÉNERGIE  ÉLAN  ÉCLAT', 1, 10.0], // bottom-right corner only
];
const MID = 2; // index of the middle row

function wordsGeometry() {
  const font = new Font(glyphData);
  const scale = SIZE / glyphData.resolution;
  const cache = {};
  const glyph = (ch) => {
    if (!cache[ch]) {
      const shapes = font.generateShapes(ch, SIZE);
      const g = new THREE.ExtrudeGeometry(shapes, {
        depth: DEPTH,
        bevelEnabled: true,
        bevelThickness: BEVEL_T,
        bevelSize: BEVEL_S,
        bevelOffset: -BEVEL_S * 0.55,
        bevelSegments: 3,
        curveSegments: 8,
      });
      g.deleteAttribute('uv');
      // smooth normals across the bevel facets and the curves (30 and 11 degrees apart), crisp
      // corners where the outline turns: rounded shoulders that catch a soft highlight
      cache[ch] = toCreasedNormals(g, 0.62);
    }
    return cache[ch];
  };
  const parts = [];
  const m = new THREE.Matrix4(), rot = new THREE.Matrix4().makeRotationZ(ANGLE), v = new THREE.Vector3();
  const adv = (ch) => (ch === ' ' ? GAP * 0.5 * SIZE : glyphData.glyphs[ch].ha * scale);
  const kern = (pair) => ((KERN[pair] || 0) + TRACK) * SIZE;
  ROWS.forEach(([text, wi, wx], ri) => {
    // baseline of the row: letters centred on the row line (cap height 1.01 SIZE)
    const yr = ROW0 + (MID - ri) * LINE;
    const y = yr - SIZE * 0.505;
    const chars = [...text];
    // x of each glyph from 0, then shift the row so word `wi` is centred at wx
    const xs = [];
    let x = 0;
    chars.forEach((ch, i) => {
      xs.push(x);
      x += adv(ch) + kern(ch + (chars[i + 1] || ''));
    });
    const words = text.split(/ +/);
    let start = 0;
    for (let k = 0; k < wi; k++) start = text.indexOf(words[k + 1], start + words[k].length);
    const wStart = [...text.slice(0, start)].length, wLen = [...words[wi]].length;
    const w0 = xs[wStart], w1 = xs[wStart + wLen - 1] + adv(chars[wStart + wLen - 1]);
    const shift = wx - (w0 + w1) / 2;
    chars.forEach((ch, i) => {
      if (ch === ' ') return;
      const gx = xs[i] + shift;
      // keep only glyphs that can ever be on screen (hero framing up to 21:9, plus the drift)
      v.set(gx + adv(ch) * 0.5, yr, 0).applyMatrix4(rot);
      if (Math.abs(v.x) < 22 && Math.abs(v.y) < 13.5) {
        const g = glyph(ch).clone();
        m.makeTranslation(gx, y, 0).premultiply(rot);
        g.applyMatrix4(m);
        parts.push(g);
      }
    });
  });
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  Object.values(cache).forEach((g) => g.dispose());
  // drop the triangles buried under the table (back cap and back bevel)
  const pos = merged.attributes.position.array, nor = merged.attributes.normal.array;
  const keepP = [], keepN = [];
  for (let i = 0; i < pos.length; i += 9) {
    if (Math.max(pos[i + 2], pos[i + 5], pos[i + 8]) <= 0.004) continue;
    for (let k = 0; k < 9; k++) {
      keepP.push(pos[i + k]);
      keepN.push(nor[i + k]);
    }
  }
  merged.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(keepP, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(keepN, 3));
  g.computeBoundingSphere();
  return g;
}

// ---------------------------------------------------------- baked occlusion
const blurShader = {
  uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
    void main() {
      float w[7]; w[0] = 0.1964825501511404; w[1] = 0.2969069646728344; w[2] = 0.09447039785044732;
      w[3] = 0.010381362401148057; w[4] = 0.0; w[5] = 0.0; w[6] = 0.0;
      // 13-tap gaussian folded into 7 linear samples
      vec4 c = texture2D(tSrc, vUv) * w[0];
      c += texture2D(tSrc, vUv + uDir * 1.411764705882353) * w[1];
      c += texture2D(tSrc, vUv - uDir * 1.411764705882353) * w[1];
      c += texture2D(tSrc, vUv + uDir * 3.2941176470588234) * w[2];
      c += texture2D(tSrc, vUv - uDir * 3.2941176470588234) * w[2];
      c += texture2D(tSrc, vUv + uDir * 5.176470588235294) * w[3];
      c += texture2D(tSrc, vUv - uDir * 5.176470588235294) * w[3];
      gl_FragColor = c;
    }`,
};

export function makeBlur() {
  const mat = new THREE.ShaderMaterial({ ...blurShader, uniforms: THREE.UniformsUtils.clone(blurShader.uniforms), depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  // separable passes src -> tmp -> dst (radius in texels of the source)
  return (renderer, src, tmp, dst, radius) => {
    mat.uniforms.tSrc.value = src.texture;
    mat.uniforms.uDir.value.set(radius / src.width, 0);
    renderer.setRenderTarget(tmp);
    renderer.render(scene, cam);
    mat.uniforms.tSrc.value = tmp.texture;
    mat.uniforms.uDir.value.set(0, radius / src.height);
    renderer.setRenderTarget(dst);
    renderer.render(scene, cam);
    renderer.setRenderTarget(null);
  };
}

function bakeOcclusion(renderer, geometry) {
  const W = 1280, H = Math.round((W * GROUND.h) / GROUND.w);
  // 8-bit targets: enough for a blurred mask, and colour-renderable everywhere (Safari)
  const opts = { type: THREE.UnsignedByteType, depthBuffer: false };
  const mask = new THREE.WebGLRenderTarget(W, H, { ...opts, depthBuffer: true });
  const tmp = new THREE.WebGLRenderTarget(W, H, opts);
  const near = new THREE.WebGLRenderTarget(W, H, opts);
  const far = new THREE.WebGLRenderTarget(W, H, opts);
  const scene = new THREE.Scene();
  // height-weighted coverage: the glyph tops count fully, bevel flanks less
  const mat = new THREE.ShaderMaterial({
    vertexShader: 'varying float vZ; void main() { vZ = position.z; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying float vZ; void main() { gl_FragColor = vec4(vec3(clamp(vZ / 0.9, 0.0, 1.0)), 1.0); }',
  });
  scene.add(new THREE.Mesh(geometry, mat));
  const cam = new THREE.OrthographicCamera(-GROUND.w / 2, GROUND.w / 2, GROUND.h / 2, -GROUND.h / 2, 0.1, 20);
  cam.position.set(0, 0, 10);
  cam.lookAt(0, 0, 0);
  const prevClear = renderer.getClearColor(new THREE.Color());
  const prevAlpha = renderer.getClearAlpha();
  renderer.setClearColor(0x000000, 1);
  renderer.setRenderTarget(mask);
  renderer.clear();
  renderer.render(scene, cam);
  const blur = makeBlur();
  const texel = GROUND.w / W; // cm per texel
  // ~0.2 cm soft crease, then ~1.1 cm wide falloff (several moderate passes, no ringing)
  blur(renderer, mask, tmp, near, 0.1 / texel);
  blur(renderer, near, tmp, far, 0.2 / texel);
  blur(renderer, far, tmp, far, 0.25 / texel);
  blur(renderer, far, tmp, far, 0.3 / texel);
  renderer.setClearColor(prevClear, prevAlpha);
  mask.dispose();
  tmp.dispose();
  mat.dispose();
  return { near: near.texture, far: far.texture, targets: [near, far] };
}

// ---------------------------------------------------------- materials
// Shared receiver code: hemispheric studio fill (no env map on the table, so the vertical
// flanks of the letters fall darker than their tops), the products' contact shadow, a soft
// light falloff, and the white fade.
function receiverPatch(extraUniforms, extraFrag, vertexExtra = '') {
  const uniforms = {
    uSky: { value: new THREE.Color(1, 1, 1) },
    uGroundC: { value: new THREE.Color(0.3, 0.31, 0.31) },
    uContact: { value: null },
    uContactWide: { value: null },
    uContactMat: { value: new THREE.Matrix4() },
    uContactK: { value: 0.0 },
    uContactOff: { value: new THREE.Vector2(-0.9, 1.08) },
    ...extraUniforms,
  };
  return {
    uniforms,
    vertex: [
      ['#include <common>', '#include <common>\nvarying vec3 vWPos2;\nvarying vec3 vLPos2;\nvarying vec3 vLNrm2;'],
      ['#include <fog_vertex>', `#include <fog_vertex>\nvWPos2 = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvLPos2 = position;\nvLNrm2 = normal;\n${vertexExtra}`],
    ],
    fragment: [
      [
        '#include <common>',
        `#include <common>
        varying vec3 vWPos2;
        varying vec3 vLPos2;
        varying vec3 vLNrm2;
        uniform vec3 uSky;
        uniform vec3 uGroundC;
        uniform sampler2D uContact;
        uniform sampler2D uContactWide;
        uniform mat4 uContactMat;
        uniform float uContactK;
        uniform vec2 uContactOff;
        ${Object.keys(extraUniforms).map((k) => `uniform ${extraUniforms[k].glsl} ${k};`).join('\n')}`,
      ],
      [
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        {
          vec3 upV = normalize((viewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
          vec3 hemi = mix(uGroundC, uSky, 0.5 + 0.5 * dot(normal, upV));
          reflectedLight.indirectDiffuse += hemi * BRDF_Lambert(material.diffuseColor);
        }`,
      ],
      [
        '#include <opaque_fragment>',
        `vec3 shadowD = vec3(1.0);
        {
          float occ = 1.0;
          ${extraFrag}
          vec3 occC = vec3(occ);
          if (uContactK > 0.0) {
            // contact core, offset away from the key light
            vec4 cp = uContactMat * vec4(vWPos2.xy + uContactOff, 0.0, 1.0);
            float sh = texture2D(uContact, cp.xy * 0.5 + 0.5).r;
            // wide soft penumbra, further along the light direction
            vec4 cw = uContactMat * vec4(vWPos2.xy + 1.8 * uContactOff, 0.0, 1.0);
            float shW = texture2D(uContactWide, cw.xy * 0.5 + 0.5).b;
            // and a soft halo hugging the silhouette on all sides (ambient occlusion of the sky)
            vec4 ca = uContactMat * vec4(vWPos2.xy + 0.6 * uContactOff, 0.0, 1.0);
            float shA = smoothstep(0.0, 0.55, texture2D(uContactWide, ca.xy * 0.5 + 0.5).b);
            float dk = 1.0 - (1.0 - 0.34 * sh) * (1.0 - 0.25 * shW) * (1.0 - 0.35 * shA);
            // applied on the displayed value (after tone mapping): the white table sits in the
            // shoulder of the curve, where a linear factor would be squashed to nothing.
            // Slightly cool: the warm key is blocked, the cool sky still fills the shadow.
            shadowD = 1.0 - uContactK * dk * vec3(1.0, 0.96, 0.9);
            // light that went through the amber glass lands further on, tinted orange
            vec4 cc = uContactMat * vec4(vWPos2.xy + 2.6 * uContactOff, 0.0, 1.0);
            float am = texture2D(uContactWide, cc.xy * 0.5 + 0.5).g;
            shadowD *= 1.0 + vec3(0.95, 0.45, 0.12) * (0.15 * uContactK * am);
          }
          outgoingLight *= occC;
        }
        #include <opaque_fragment>`,
      ],
      ['#include <tonemapping_fragment>', '#include <tonemapping_fragment>\n        gl_FragColor.rgb *= shadowD;'],
    ],
  };
}

export function createWords(renderer) {
  const geometry = wordsGeometry();
  const ao = bakeOcclusion(renderer, geometry);
  const albedo = new THREE.Color().setRGB(0.76, 0.785, 0.775, THREE.LinearSRGBColorSpace);

  const groundMat = new THREE.MeshStandardMaterial({ color: albedo, roughness: 0.95, metalness: 0, dithering: true });
  const gp = receiverPatch(
    {
      uAONear: { value: ao.near, glsl: 'sampler2D' },
      uAOFar: { value: ao.far, glsl: 'sampler2D' },
      uAOOff: { value: new THREE.Vector2(-0.006, 0.009), glsl: 'vec2' },
      uGroundSize: { value: new THREE.Vector2(GROUND.w, GROUND.h), glsl: 'vec2' },
    },
    `vec2 guv = vLPos2.xy / uGroundSize + 0.5;
     float aoN = texture2D(uAONear, guv).r;
     float aoF = texture2D(uAOFar, guv + uAOOff).r;
     occ *= (1.0 - 0.22 * aoN) * (1.0 - 0.2 * aoF);`,
  );
  patchMaterial(groundMat, { ...gp, key: 'ground' });

  // the letters are a touch whiter than the table: white type on a soft grey-white ground
  const letterAlbedo = albedo.clone().multiplyScalar(1.08);
  const letterMat = new THREE.MeshStandardMaterial({ color: letterAlbedo, roughness: 0.78, metalness: 0, dithering: true });
  const lp = receiverPatch(
    {},
    `// flanks darken toward the table (occlusion in the crease)
     float side = 1.0 - clamp(vLNrm2.z, 0.0, 1.0);
     occ *= mix(1.0, mix(0.85, 1.0, smoothstep(0.0, ${(DEPTH + 0.1).toFixed(2)}, vLPos2.z)), side);`,
  );
  patchMaterial(letterMat, { ...lp, key: 'letters' });

  const group = new THREE.Group();
  group.name = 'table';
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND.w, GROUND.h, 1, 1), groundMat);
  ground.name = 'ground';
  const letters = new THREE.Mesh(geometry, letterMat);
  letters.name = 'letters';
  group.add(ground, letters);
  return {
    group,
    ground,
    letters,
    materials: [groundMat, letterMat],
    triangles: geometry.attributes.position.count / 3,
    setContact(tex, wideTex, matrix, k) {
      for (const m of [groundMat, letterMat]) {
        const u = m.userData.uniforms;
        u.uContact.value = tex;
        u.uContactWide.value = wideTex;
        u.uContactMat.value.copy(matrix);
        u.uContactK.value = k;
      }
    },
  };
}
