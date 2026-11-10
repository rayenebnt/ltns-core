// Soft contact shadows of the floating products on the table (no shadow map): the products are
// rendered from below with an orthographic camera into a small target, each texel holding how
// close the lowest surface is to the table (R), the same for amber glass (G) and a softer
// coverage (B), then blurred
// twice: a tight contact core, and a wide soft penumbra that the table samples further along the
// light direction (it shows 1.5 to 3 cm beyond the silhouette, away from the key). The table and
// the letters sample both (see words.js).
import * as THREE from 'three';
import { makeBlur } from './words.js';

export const CONTACT_LAYER = 1;

export function createContactShadows({ res = 512 } = {}) {
  const W = res, H = Math.round(res * 0.64);
  const rt = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true });
  const tmp = new THREE.WebGLRenderTarget(W, H, { depthBuffer: false });
  const out = new THREE.WebGLRenderTarget(W, H, { depthBuffer: false });
  const wide = new THREE.WebGLRenderTarget(W, H, { depthBuffer: false });
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 40);
  cam.layers.set(CONTACT_LAYER);
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    // uK: shadow strength of the product being drawn (set per proxy, see casterStrength)
    uniforms: { uZ0: { value: 0.6 }, uRange: { value: 3.4 }, uK: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec3 tint; // x = 1 for amber glass (lets orange light through)
      varying float vZ;
      varying float vAmber;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vZ = wp.z;
        vAmber = tint.x;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uZ0;
      uniform float uRange;
      uniform float uK;
      varying float vZ;
      varying float vAmber;
      void main() {
        // R: contact core (closeness of the lowest surface), G: the same for amber glass,
        // B: soft coverage (falls off over twice the range) for the wide penumbra and the halo
        float d = clamp((vZ - uZ0) / uRange, 0.0, 1.0);
        float a = pow(1.0 - d, 0.9);
        float b = pow(1.0 - clamp((vZ - uZ0) / (2.0 * uRange), 0.0, 1.0), 0.7);
        gl_FragColor = vec4(vec3(a, a * vAmber, b) * uK, 1.0);
      }`,
  });
  const blur = makeBlur();
  const matrix = new THREE.Matrix4();
  let halfW = 20, halfH = 12.5;

  // each proxy sets its own strength before it is drawn (proxy.userData.k, 1 by default): a
  // product parked just out of frame casts nothing into the frame
  function casterStrength(proxy) {
    proxy.onBeforeRender = () => {
      mat.uniforms.uK.value = proxy.userData.k ?? 1;
      mat.uniformsNeedUpdate = true; // one material for all proxies: upload per object
    };
  }

  return {
    casterStrength,
    texture: out.texture,
    wide: wide.texture,
    targets: { rt, out, wide },
    matrix,
    camera: cam,
    // frame the visible part of the table (centre and half extents, world cm)
    frame(cx, cy, hw, hh) {
      halfW = hw;
      halfH = hh;
      cam.left = -hw;
      cam.right = hw;
      cam.top = hh;
      cam.bottom = -hh;
      cam.near = 0;
      cam.far = 40;
      cam.position.set(cx, cy, -0.5);
      cam.up.set(0, 1, 0);
      cam.lookAt(cx, cy, 10);
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
      matrix.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    },
    render(renderer, scene) {
      const prevOverride = scene.overrideMaterial;
      const prevClear = renderer.getClearColor(new THREE.Color());
      const prevAlpha = renderer.getClearAlpha();
      scene.overrideMaterial = mat;
      renderer.setClearColor(0x000000, 1);
      renderer.setRenderTarget(rt);
      renderer.clear();
      renderer.render(scene, cam);
      scene.overrideMaterial = prevOverride;
      renderer.setClearColor(prevClear, prevAlpha);
      // contact core: ~0.25 cm then ~0.45 cm of blur (texel ~ 0.07 cm)
      const texel = (2 * halfW) / W;
      blur(renderer, rt, tmp, out, 0.09 / texel);
      blur(renderer, out, tmp, out, 0.16 / texel);
      // wide penumbra: three more passes (~0.6, 0.9 and 1.2 cm), no ringing
      blur(renderer, out, tmp, wide, 0.3 / texel);
      blur(renderer, wide, tmp, wide, 0.45 / texel);
      blur(renderer, wide, tmp, wide, 0.6 / texel);
    },
    dispose() {
      rt.dispose();
      tmp.dispose();
      out.dispose();
      wide.dispose();
      mat.dispose();
    },
  };
}
