// Studio environment for the products: a custom scene of softboxes captured once into a PMREM.
// World frame: the camera looks down -Z at the table, so "below" (-Z) is the bright lit table
// (bright glass rims at grazing angles), the horizon ring is the darker studio, and the softboxes
// sit above and around (+Z). A cylinder reflects a band of this sphere along its whole length:
// every box placed near those bands draws a long highlight down the bottle.
//
// The boxes are HDR (core radiance 13 to 25): at normal incidence glass reflects 4 %, so only
// HDR sources read near white in the glass, with the soft falloff of a real diffusion panel
// (bright core, about 35 % at the edges, a thin darker frame). Two black flags just inside the
// long strips give the studio-glass edge: a bright line next to a dark one. The diffuse part of
// this environment is scaled down per material (see ENV_DIFFUSE in util.js), so the HDR boxes
// sharpen the reflections without washing out the printed labels.
import * as THREE from 'three';

const boxVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const boxFragment = /* glsl */ `
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uEdge;
  uniform float uFrame;
  void main() {
    vec2 q = abs(vUv - 0.5) * 2.0;
    // rounded-rectangle radius: a broad flat core that rolls off toward the edges
    float r = pow(pow(q.x, 4.0) + pow(q.y, 4.0), 0.25);
    float f = mix(1.0, uEdge, smoothstep(0.12, 0.94, r));
    // thin darker frame of the softbox
    f *= mix(1.0, uFrame, smoothstep(0.935, 0.99, max(q.x, q.y)));
    gl_FragColor = vec4(uColor * f, 1.0);
  }`;

export function createStudioEnv(renderer) {
  const scene = new THREE.Scene();

  const room = new THREE.Mesh(
    new THREE.SphereGeometry(80, 64, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float z = d.z;
          vec3 table = vec3(1.18, 1.2, 1.19);          // lit table top, seen below the product
          vec3 wall = vec3(0.12, 0.13, 0.14);          // studio around: dark bands between boxes
          vec3 ceil = vec3(0.42, 0.42, 0.41);
          vec3 c = mix(wall, ceil, smoothstep(0.12, 0.95, z));
          // the floor brightens toward straight below (the table under the product)
          c = mix(c, table, smoothstep(0.02, -0.3, z));
          // a faint warm / cool split left to right (studio gels)
          c *= mix(vec3(0.97, 0.99, 1.03), vec3(1.03, 1.0, 0.96), smoothstep(-0.8, 0.8, d.x));
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  );
  scene.add(room);

  const meshes = [];
  const panel = (dir, w, h, core, tint, { dist = 34, roll = 0, edge = 0.35, frame = 0.3 } = {}) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        vertexShader: boxVertex,
        fragmentShader: boxFragment,
        uniforms: {
          uColor: { value: new THREE.Vector3(...tint).multiplyScalar(core) },
          uEdge: { value: edge },
          uFrame: { value: frame },
        },
      }),
    );
    const d = new THREE.Vector3(...dir).normalize();
    m.position.copy(d).multiplyScalar(dist);
    m.lookAt(0, 0, 0);
    m.rotateZ(roll);
    scene.add(m);
    meshes.push(m);
    return m;
  };
  // overhead key: big, soft, warm white (top left, like the key light)
  panel([-0.28, 0.34, 0.9], 26, 15, 20, [1.0, 0.97, 0.92]);
  // long strips low on the left and right: the long rim streaks of the glass and the cap
  panel([-0.95, -0.06, 0.3], 2.4, 46, 16, [0.92, 0.97, 1.0], { edge: 0.45 });
  panel([0.94, 0.12, 0.32], 2.0, 46, 13, [1.0, 0.95, 0.88], { edge: 0.45 });
  // black flags just inside the strips: the dark line next to each bright rim line
  panel([-0.86, -0.055, 0.5], 3.6, 50, 0.02, [1, 1, 1], { edge: 1, frame: 1 });
  panel([0.85, 0.11, 0.52], 3.2, 50, 0.02, [1, 1, 1], { edge: 1, frame: 1 });
  // boxes on the diagonal band reflected by the hero bottle lying at about -35 degrees
  panel([0.62, 0.5, 0.6], 8, 12, 22, [1.0, 0.98, 0.95], { roll: 0.6 });
  panel([-0.62, -0.52, 0.58], 7, 11, 14, [0.93, 0.97, 1.0], { roll: 0.6 });
  // a thin top strip behind the frame (edge light on the cap and the shoulder)
  panel([0.05, 0.97, 0.22], 36, 2.8, 10, [1.0, 0.98, 0.95], { edge: 0.5 });
  // a small hard box: crisp specular kick on the gold and the liquid
  panel([0.32, 0.4, 0.86], 3.0, 3.0, 25, [1.0, 0.98, 0.94], { edge: 0.6 });

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.0, 0.5, 300);
  pmrem.dispose();
  room.geometry.dispose();
  room.material.dispose();
  for (const b of meshes) {
    b.geometry.dispose();
    b.material.dispose();
  }
  return rt.texture;
}
