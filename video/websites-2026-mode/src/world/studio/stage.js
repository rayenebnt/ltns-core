// The studio: renderer look (colour management, tone mapping, one soft shadow map), the wall,
// the lights and the environment.
// The wall is NOT lit: a full-screen background draws BRAND.paper exactly (#ececea on screen,
// a very soft vignette and a breath of light from the key side), and a shadow-only plane at
// WALL_Z darkens it where the garments cast their shadows. So the page colour never drifts with
// the exposure, and the 3D wall meets the page's CSS colour (loader, UI) without a seam.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BRAND } from '../../catalog.js';
import { WALL_Z } from './layout.js';

// shadow map per quality level: size (px) and VSM blur (radius in texels scales with the size,
// so the softness is the same at every level)
// (soft studio shadows need blur, not resolution: ~3.7 mm per texel at 1024; the sample spacing
// 2r / (n - 1) stays under ~1.6 texels so the blur never aliases)
const SHADOW = {
  low: { size: 512, radius: 7, samples: 10 },
  medium: { size: 768, radius: 10, samples: 14 },
  high: { size: 1024, radius: 14, samples: 18 },
  max: { size: 1536, radius: 20, samples: 26 },
};

const BG_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;
const BG_FRAG = /* glsl */ `
uniform vec3 uPaper;   // sRGB, written as is
uniform float uAspect;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 p = (vUv - vec2(0.5, 0.52)) * vec2(uAspect, 1.0);
  float r = length(p) / (0.5 * length(vec2(uAspect, 1.0)));
  // very soft vignette: nothing in the middle, ~5 % at the corners
  float vig = smoothstep(0.42, 1.15, r) * 0.055;
  // the key side (upper left) a touch brighter, the floor side a touch darker
  float side = (0.5 - vUv.x) * 0.006 + (vUv.y - 0.5) * 0.008;
  vec3 c = uPaper * (1.0 - vig) + side;
  c += (hash(gl_FragCoord.xy) - 0.5) / 255.0; // dither: no banding in the gradient
  gl_FragColor = vec4(c, 1.0);
}`;

export async function createStage(renderer, scene, quality) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps the garment colours true (no hue shift)
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap; // wide soft penumbra, and it blurs the fade dither

  const paper = new THREE.Color(BRAND.paper);
  scene.background = paper.clone(); // also the clear colour (sRGB value converted by three)

  // full-screen paper background (drawn first, no depth)
  const bgMat = new THREE.ShaderMaterial({
    uniforms: { uPaper: { value: new THREE.Vector3(paper.r, paper.g, paper.b) }, uAspect: { value: 1.6 } },
    vertexShader: BG_VERT,
    fragmentShader: BG_FRAG,
    depthTest: false,
    depthWrite: false,
  });
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
  bg.frustumCulled = false;
  bg.renderOrder = -1000;
  bg.name = 'paper';
  scene.add(bg);
  {
    // THREE.Color stores linear values: the shader wants the sRGB components of #ececea
    const s = new THREE.Color(BRAND.paper).getRGB({ r: 0, g: 0, b: 0 }, THREE.SRGBColorSpace);
    bgMat.uniforms.uPaper.value.set(s.r, s.g, s.b);
  }

  // shadow catcher on the wall: warm dark grey, the darkness of a soft studio shadow
  const wallMat = new THREE.ShadowMaterial({ color: 0x2b2722, opacity: 0.15, depthWrite: false });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), wallMat);
  wall.position.set(0, -0.6, WALL_Z);
  wall.receiveShadow = true;
  wall.renderOrder = -10;
  wall.name = 'wall-shadow';
  scene.add(wall);

  // environment: a neutral room for the cotton sheen and the chrome (rail, hooks)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.78;
  pmrem.dispose();

  // key: soft, from the upper left and nearly frontal, so the shadows sit just behind the
  // garments (down and to the right), like a softbox beside the camera
  const key = new THREE.DirectionalLight(0xfffaf2, 1.75);
  const keyDir = new THREE.Vector3(-0.2, 0.3, 0.93).normalize();
  key.castShadow = true;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.012;
  scene.add(key, key.target);
  // fill: sky white, floor warm (the room bounce)
  const fill = new THREE.HemisphereLight(0xffffff, 0xe2ddd3, 0.38);
  scene.add(fill);

  // the shadow camera covers the rack and the product view (and their shadows on the wall)
  const focus = new THREE.Vector3(0.05, -0.75, -0.1);
  function placeLight() {
    key.target.position.copy(focus);
    key.position.copy(focus).addScaledVector(keyDir, 5);
    const sc = key.shadow.camera;
    sc.left = -1.9;
    sc.right = 1.9;
    sc.top = 1.25;
    sc.bottom = -1.35;
    sc.near = 3.2;
    sc.far = 6.6;
    sc.updateProjectionMatrix();
  }
  placeLight();

  let level = null;
  function setQuality(lv) {
    const s = SHADOW[lv] || SHADOW.high;
    if (level && SHADOW[level].size === s.size && SHADOW[level].samples === s.samples) {
      level = lv;
      return;
    }
    level = lv;
    key.shadow.mapSize.set(s.size, s.size);
    key.shadow.radius = s.radius;
    key.shadow.blurSamples = s.samples;
    if (key.shadow.map) {
      key.shadow.map.dispose();
      key.shadow.map = null;
    }
    if (key.shadow.mapPass) {
      key.shadow.mapPass.dispose();
      key.shadow.mapPass = null;
    }
  }
  setQuality(quality);

  return {
    key,
    fill,
    wall,
    bg,
    paper: BRAND.paper,
    setQuality,
    resize(w, h) {
      bgMat.uniforms.uAspect.value = w / Math.max(1, h);
    },
    shadowInfo: () => ({ ...SHADOW[level], type: 'VSM' }),
    dispose() {
      envRT.dispose();
    },
  };
}
