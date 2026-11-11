// Fading a solid object into the studio wall without transparency (no sorting, no see-through
// garment panels, no program switch): the colour output is mixed with the wall's own colour
// (exact: the wall is unlit, see stage.js), and the shadow pass discards a growing share of
// texels (a noise dither) that the soft shadow blur turns into a smooth shadow fade.
// It wraps the material's own onBeforeCompile (the garments patch theirs) and keeps its cache key.
import * as THREE from 'three';

// white-noise threshold per shadow-map texel: an ordered (Bayer) pattern aliases with the
// blur's sample spacing into stripes; noise averages out into a plain, slightly grainy fade
const DITHER = /* glsl */ `
float rlDither(vec2 p) {
  vec2 q = floor(p);
  return fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453);
}
`;

function chain(mat, key, patch) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = function (shader, renderer) {
    if (prev) prev.call(this, shader, renderer);
    patch(shader);
  };
  const prevKey = mat.customProgramCacheKey;
  mat.customProgramCacheKey = function () {
    return prevKey.call(this) + '|' + key;
  };
  mat.needsUpdate = true;
}

// colour pass: the last line of main(), after tone mapping and the output colour space, so the
// mix lands exactly on the wall's sRGB value
function patchColor(mat, u) {
  chain(mat, 'rlfade', (shader) => {
    shader.uniforms.uRlFade = u.uRlFade;
    shader.uniforms.uRlPaper = u.uRlPaper;
    let fs = shader.fragmentShader.replace('void main() {', 'uniform float uRlFade;\nuniform vec3 uRlPaper;\nvoid main() {');
    const end = fs.lastIndexOf('}');
    fs = fs.slice(0, end) + '\tgl_FragColor.rgb = mix(gl_FragColor.rgb, uRlPaper, uRlFade);\n}\n';
    shader.fragmentShader = fs;
  });
}

function patchDepth(mat, u) {
  chain(mat, 'rlfade-depth', (shader) => {
    shader.uniforms.uRlFade = u.uRlFade;
    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      'uniform float uRlFade;\n' + DITHER + '\nvoid main() {\n\tif (rlDither(gl_FragCoord.xy) < uRlFade) discard;',
    );
  });
}

// meshes: the meshes of one object (they fade together); paper: the wall colour (sRGB hex)
export function createFader(meshes, paper) {
  // the output is sRGB-encoded where the mix happens: compare with the wall's sRGB components
  const c = new THREE.Color(paper).getRGB({ r: 0, g: 0, b: 0 }, THREE.SRGBColorSpace);
  const u = { uRlFade: { value: 0 }, uRlPaper: { value: new THREE.Vector3(c.r, c.g, c.b) } };
  const own = [];
  for (const m of meshes) {
    patchColor(m.material, u);
    if (m.castShadow) {
      let d = m.customDepthMaterial;
      if (!d) {
        d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
        own.push(d);
        m.customDepthMaterial = d;
      }
      patchDepth(d, u);
    }
  }
  let k = -1;
  return {
    uniforms: u,
    get value() {
      return k;
    },
    // k 0..1; hidden at the end (a faded object would still hide the wall's shadows behind it)
    set(v, root) {
      v = Math.min(1, Math.max(0, v));
      k = v;
      u.uRlFade.value = v;
      if (root) root.visible = v < 0.995;
    },
    dispose() {
      for (const d of own) d.dispose();
    },
  };
}
