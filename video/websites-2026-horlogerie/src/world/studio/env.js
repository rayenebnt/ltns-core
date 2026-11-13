// BALANCIER studio: the environment light for watch photography, built as a small three.js scene of
// emissive panels and baked once through PMREM (no file is loaded).
//
//   const env = createStudioEnv(renderer, { variant: 'light' | 'night', size: 256 });
//   material.envMap = env.texture  (or scene.environment = env.texture);   env.dispose()
//
// 'light' (the light studio, steel on light grey): a large soft overhead softbox, two tall strip softboxes
// left and right (crisp vertical highlight lines on polished steel), a thin back strip (a line on the
// crystal and the caseback), a weak front fill, a dark horizon band and a dark floor gradient (the
// contrast that makes mirror-polished chamfers read), a very light warm (right) / cool (left) balance.
// 'night' (steel on the blue night studio): the same rig dimmer and cooler, a blue fill from below.
// Both variants at the same size give the same program defines: switching env never recompiles.
// size: the PMREM cube size (256 = three's fromScene default; 128 for low quality, 512 for max).
import * as THREE from 'three';

const RIGS = {
  light: {
    // dome (linear radiance): zenith, ceiling, horizon band, floor near the horizon, nadir
    zenith: [0.52, 0.52, 0.53], ceiling: [0.34, 0.345, 0.35], horizon: [0.07, 0.071, 0.075],
    floorNear: [0.08, 0.081, 0.085], nadir: [0.27, 0.272, 0.276], warmCool: 0.035,
    panels: [
      // [w, h, position, intensity, colour, softness]
      { name: 'overhead', w: 40, h: 28, pos: [0, 26, 2], i: 6.0, c: [1.0, 0.985, 0.965], soft: 0.32 },
      { name: 'stripLeft', w: 4.6, h: 34, pos: [-24, 4, -9], i: 9.0, c: [0.95, 0.975, 1.0], soft: 0.18 },
      { name: 'stripRight', w: 4.6, h: 34, pos: [24, 4, -12], i: 8.0, c: [1.0, 0.975, 0.945], soft: 0.18 },
      { name: 'back', w: 34, h: 2.2, pos: [0, 18, -26], i: 3.4, c: [1, 1, 1], soft: 0.25 },
      { name: 'front', w: 30, h: 12, pos: [0, 3, 30], i: 0.9, c: [1, 0.99, 0.98], soft: 0.5 },
      { name: 'kicker', w: 3.2, h: 20, pos: [18, 10, 20], i: 3.2, c: [1, 1, 1], soft: 0.2 },
      // a broad, low fill on the left horizon: the flat faces of the exploded line (plates, caseback,
      // crystal) seen from the hero camera reflect it as a soft silver instead of the dark band
      { name: 'sideFill', w: 40, h: 10, pos: [-27, 1.5, 4], i: 0.95, c: [1, 0.995, 0.985], soft: 0.6, grad: 0.75 },
    ],
  },
  night: {
    zenith: [0.1, 0.12, 0.17], ceiling: [0.055, 0.068, 0.11], horizon: [0.008, 0.012, 0.03],
    floorNear: [0.025, 0.035, 0.07], nadir: [0.06, 0.1, 0.24], warmCool: 0.0,
    panels: [
      { name: 'overhead', w: 34, h: 24, pos: [0, 26, 2], i: 2.4, c: [0.94, 0.965, 1.0], soft: 0.32 },
      // (two near-white lines on the chamfers, lugs and centre links: « steel », against the night blue)
      { name: 'stripLeft', w: 4.6, h: 34, pos: [-24, 4, -9], i: 5.8, c: [0.97, 0.98, 1.0], soft: 0.18 },
      { name: 'stripRight', w: 4.6, h: 34, pos: [24, 4, -12], i: 4.0, c: [0.9, 0.94, 1.0], soft: 0.18 },
      { name: 'back', w: 34, h: 2.2, pos: [0, 18, -26], i: 1.9, c: [0.7, 0.82, 1.0], soft: 0.25 },
      { name: 'front', w: 30, h: 12, pos: [0, 3, 30], i: 0.32, c: [0.6, 0.72, 1.0], soft: 0.5 },
      { name: 'kicker', w: 3.2, h: 20, pos: [18, 10, 20], i: 2.2, c: [1, 1, 1], soft: 0.2 },
      // the blue fill from below: a wide low panel under the floor horizon
      { name: 'sideFill', w: 40, h: 10, pos: [-27, 1.5, 4], i: 0.45, c: [0.7, 0.8, 1.0], soft: 0.6 },
      { name: 'blueFill', w: 60, h: 40, pos: [0, -24, 4], i: 0.42, c: [0.16, 0.32, 0.95], soft: 0.6 },
    ],
  },
};

const domeVert = /* glsl */ `
varying vec3 vDir;
void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const domeFrag = /* glsl */ `
uniform vec3 zenith, ceiling, horizon, floorNear, nadir; uniform float warmCool;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  vec3 c;
  if (y > 0.0) {
    c = mix(horizon, ceiling, smoothstep(0.1, 0.42, y));
    c = mix(c, zenith, smoothstep(0.55, 1.0, y));
  } else {
    c = mix(horizon, floorNear, smoothstep(-0.02, -0.16, y));
    c = mix(c, nadir, smoothstep(-0.25, -1.0, y));
  }
  c *= vec3(1.0 + warmCool * d.x, 1.0, 1.0 - warmCool * d.x);
  gl_FragColor = vec4(c, 1.0);
}`;
const panelVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// a softbox: a rounded rectangle with a soft edge and a slightly brighter centre (diffuser hot spot)
const panelFrag = /* glsl */ `
uniform vec3 color; uniform float soft; uniform vec2 size; uniform float grad;
varying vec2 vUv;
void main() {
  vec2 p = (vUv - 0.5) * size;
  vec2 hs = size * 0.5;
  float r = min(hs.x, hs.y) * 0.35;
  vec2 q = abs(p) - hs + r;
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; // < 0 inside
  float edge = min(hs.x, hs.y) * soft;
  float a = 1.0 - smoothstep(-edge, 0.0, sd);
  float hot = 1.0 + 0.18 * (1.0 - smoothstep(0.0, 1.0, length(p / hs)));
  float g = mix(1.0 - grad, 1.0, smoothstep(0.0, 1.0, vUv.y));   // brighter at the top
  gl_FragColor = vec4(color * a * hot * g, 1.0);
}`;

function buildScene(rig) {
  const scene = new THREE.Scene();
  const disposables = [];
  const domeGeo = new THREE.SphereGeometry(60, 64, 32);
  const domeMat = new THREE.ShaderMaterial({
    vertexShader: domeVert, fragmentShader: domeFrag, side: THREE.BackSide, depthWrite: false,
    uniforms: {
      zenith: { value: new THREE.Vector3(...rig.zenith) }, ceiling: { value: new THREE.Vector3(...rig.ceiling) },
      horizon: { value: new THREE.Vector3(...rig.horizon) }, floorNear: { value: new THREE.Vector3(...rig.floorNear) },
      nadir: { value: new THREE.Vector3(...rig.nadir) }, warmCool: { value: rig.warmCool },
    },
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.renderOrder = -1;
  scene.add(dome);
  disposables.push(domeGeo, domeMat);
  const plane = new THREE.PlaneGeometry(1, 1);
  disposables.push(plane);
  for (const p of rig.panels) {
    const m = new THREE.ShaderMaterial({
      vertexShader: panelVert, fragmentShader: panelFrag, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { color: { value: new THREE.Vector3(...p.c).multiplyScalar(p.i) }, soft: { value: p.soft }, size: { value: new THREE.Vector2(p.w, p.h) }, grad: { value: p.grad || 0 } },
    });
    const mesh = new THREE.Mesh(plane, m);
    mesh.scale.set(p.w, p.h, 1);
    mesh.position.set(...p.pos);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
    disposables.push(m);
  }
  return { scene, dispose: () => disposables.forEach((d) => d.dispose()) };
}

export function createStudioEnv(renderer, { variant = 'light', size = 256 } = {}) {
  const rig = RIGS[variant] || RIGS.light;
  const { scene, dispose: disposeScene } = buildScene(rig);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let rt;
  if (size === 256) {
    rt = pmrem.fromScene(scene, 0, 0.1, 100);
  } else {
    // other sizes: render a cube map first, then filter it (same cube-UV layout, its own defines)
    const cubeRT = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType });
    const cam = new THREE.CubeCamera(0.1, 100, cubeRT);
    const tm = renderer.toneMapping;
    renderer.toneMapping = THREE.NoToneMapping;
    cam.update(renderer, scene);
    renderer.toneMapping = tm;
    rt = pmrem.fromCubemap(cubeRT.texture);
    cubeRT.dispose();
  }
  pmrem.dispose();
  disposeScene();
  rt.texture.name = `studioEnv.${variant}`;
  return {
    texture: rt.texture,
    renderTarget: rt,
    variant,
    size,
    dispose() { rt.dispose(); },
  };
}

export const ENV_RIGS = RIGS; // for tuning in a harness
