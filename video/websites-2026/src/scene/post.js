import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

const FinalShader = {
  name: 'FinalGrade',
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uVignette: { value: 0.24 },
    uGrain: { value: 0.022 },
    uWarm: { value: 0.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uRes;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uWarm;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      // soft filmic grade: slightly warm highlights, cooler deep shadows
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(c, c * vec3(1.03, 1.0, 0.96), smoothstep(0.35, 0.9, l) * (0.6 + uWarm));
      c = mix(c, c * vec3(0.97, 0.99, 1.04), smoothstep(0.3, 0.0, l) * 0.6);
      c = mix(vec3(l), c, 1.1);
      // vignette
      vec2 q = vUv - 0.5;
      q.x *= uRes.x / uRes.y * 0.72;
      float v = smoothstep(0.9, 0.22, length(q));
      c *= mix(1.0 - uVignette, 1.0, v);
      // film grain and dither against banding
      float g = hash(vUv * uRes + fract(uTime * 7.31) * 113.0) - 0.5;
      c += g * uGrain;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export function createPost(renderer, scene, camera, { samples = 4, bloomScale = 1, fxaa = false }) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples });
  const composer = new EffectComposer(renderer, rt);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.55, 0.62, 1.05);
  // the bloom chain starts at half the CSS resolution (less on low quality), whatever the
  // device pixel ratio: halos keep the same size on a high-density laptop screen as in the
  // stills, and the blur passes stay cheap
  let dprNow = 1;
  const baseSetSize = bloom.setSize.bind(bloom);
  bloom.setSize = (w, h) => baseSetSize(Math.max(2, Math.round((w * bloomScale) / dprNow)), Math.max(2, Math.round((h * bloomScale) / dprNow)));
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let fxaaPass = null;
  if (fxaa) {
    fxaaPass = new ShaderPass(FXAAShader);
    composer.addPass(fxaaPass);
  }
  const finalPass = new ShaderPass(FinalShader);
  composer.addPass(finalPass);

  function setSize(w, h, dpr) {
    dprNow = dpr;
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    finalPass.uniforms.uRes.value.set(w * dpr, h * dpr);
    if (fxaaPass) fxaaPass.material.uniforms.resolution.value.set(1 / (w * dpr), 1 / (h * dpr));
  }

  return {
    composer,
    bloom,
    finalPass,
    setSize,
    render(dt) {
      composer.render(dt);
    },
    dispose() {
      composer.dispose();
      rt.dispose();
      bloom.dispose();
    },
  };
}
