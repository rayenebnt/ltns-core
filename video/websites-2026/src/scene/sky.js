import * as THREE from 'three';
import { ATMOS_GLSL, hazeUniform } from './atmosphere.js';

// Full-screen triangle drawn first; the ray direction is rebuilt from the camera matrices,
// so it also works inside the cube camera used for the environment maps.
export function createSky() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const mat = new THREE.ShaderMaterial({
    name: 'Sky',
    uniforms: { fogDensity: hazeUniform },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        // (the [2][x] terms keep the sky aligned when the projection is shifted)
        vec3 vd = vec3((position.x + projectionMatrix[2][0]) / projectionMatrix[0][0], (position.y + projectionMatrix[2][1]) / projectionMatrix[1][1], -1.0);
        vDir = (vec4(vd, 0.0) * viewMatrix).xyz;
        gl_Position = vec4(position.xy, 0.99999, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float fogDensity;
      ${ATMOS_GLSL}
      varying vec3 vDir;
      void main() {
        gl_FragColor = vec4(skyRadiance(normalize(vDir)), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    depthWrite: false,
    depthTest: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  mesh.name = 'sky';
  return mesh;
}
