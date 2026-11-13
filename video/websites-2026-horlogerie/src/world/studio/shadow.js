// BALANCIER studio: baked soft shadows for the light studio (no shadow map).
//   - contact: the soft contact shadow of the watch lying on its bracelet: an elliptic gradient on a floor
//     plane, a tight dark core under the case + a wide soft penumbra along the bracelet;
//   - band: a long, faint shadow band on the floor under the exploded line (01 Démontage).
// Both are light-studio things: they are cut by the background's tide line (only drawn above it, with a
// soft 2 px edge) and fade out entirely as the tide covers the screen. Premultiplied darkening, depthWrite
// off, drawn right after the background (renderOrder -900).
//
//   const shadows = createShadows({ uniforms: tide });
//   scene.add(shadows.group);
//   shadows.contact.set({ x, y, z, length, width, yaw, opacity, core });   // floor plane at height y
//   shadows.band.set({ x, y, z, length, width, yaw, opacity });
//   shadows.contact.placeUnder(watch.group, watch.floorZ)  // the lying watch: on its floor plane (local
//                                                          // z = floorZ), length along the bracelet (local Y)
//   (or move shadows.contact.mesh / shadows.band.mesh yourself: a 1 × 1 plane in XZ scaled to size; world
//   space: keep shadows.group at the scene root, untransformed)
import * as THREE from 'three';
import { TIDE_GLSL } from './wave.js';
import { createTideUniforms } from './tide.js';

const vert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const frag = (body) => /* glsl */ `
${TIDE_GLSL}
uniform float uTide;
uniform float uPx;
uniform float uOpacity;
uniform float uCore;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  float vis = smoothstep(-1.0 * uPx, 1.5 * uPx, tideDistPx(gl_FragCoord.xy, uTide));
  vis *= 1.0 - smoothstep(0.75, 1.0, uTide);
  vec2 q = (vUv - 0.5) * 2.0;   // -1..1 across the plane (x = length, y = width)
  float a = 0.0;
  ${body}
  a = clamp(a * uOpacity * vis, 0.0, 1.0);
  gl_FragColor = vec4(uColor * a, a);
  #include <colorspace_fragment>
}`;

// contact: wide penumbra (zero at the plane's edge) + a tight core (narrower across than along)
const CONTACT = /* glsl */ `
  float r2 = dot(q, q);
  float pen = max(0.0, exp(-r2 * 3.0) - exp(-3.0)) / (1.0 - exp(-3.0));
  vec2 c = q * vec2(2.6, 3.4);
  float core = exp(-dot(c, c));
  float mid = exp(-dot(q * vec2(1.25, 2.2), q * vec2(1.25, 2.2)));
  a = pen * 0.36 + mid * 0.22 + core * uCore;`;

// band: a soft gaussian across, smooth ends along
const BAND = /* glsl */ `
  float across = exp(-q.y * q.y * 5.5) - exp(-5.5);
  float along = smoothstep(1.0, 0.55, abs(q.x));
  a = max(0.0, across) * along;`;

const _r = new THREE.Vector3(), _u = new THREE.Vector3(), _b = new THREE.Vector3(), _m = new THREE.Matrix4(), _o = new THREE.Vector3();

function makeShadow(uniforms, body, name, defaults) {
  const material = new THREE.ShaderMaterial({
    name,
    vertexShader: vert,
    fragmentShader: frag(body),
    uniforms: {
      uTide: uniforms.uTide, uTime: uniforms.uTime, uRes: uniforms.uRes, uPx: uniforms.uPx,
      uOpacity: { value: defaults.opacity }, uCore: { value: defaults.core || 0 },
      uColor: { value: new THREE.Color('#1a2230') },
    },
    transparent: true, premultipliedAlpha: true, depthWrite: false, toneMapped: false,
  });
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.rotateX(-Math.PI / 2); // lies in XZ, +X = length, +Z = width
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.renderOrder = -900;
  const api = {
    mesh,
    material,
    set({ x, y, z, length, width, yaw, opacity, core } = {}) {
      if (x !== undefined) mesh.position.x = x;
      if (y !== undefined) mesh.position.y = y;
      if (z !== undefined) mesh.position.z = z;
      if (length !== undefined) mesh.scale.x = length;
      if (width !== undefined) mesh.scale.z = width;
      if (yaw !== undefined) mesh.rotation.y = yaw;
      if (opacity !== undefined) { material.uniforms.uOpacity.value = opacity; mesh.visible = opacity > 0.001; }
      if (core !== undefined) material.uniforms.uCore.value = core;
      return api;
    },
    // put the plane on an object's floor: the world point of its local (0, 0, floorZ) (+ lift, world up),
    // its length along the object's local Y axis projected on the floor (the watch: 12 → 6 o'clock, the
    // bracelet's direction); world up is +Y (the floor is horizontal)
    placeUnder(object, floorZ, { lift = 0.05 } = {}) {
      object.updateWorldMatrix(true, false);
      _o.set(0, 0, floorZ).applyMatrix4(object.matrixWorld);
      _r.set(0, 1, 0).transformDirection(object.matrixWorld);
      mesh.position.set(_o.x, _o.y + lift, _o.z);
      mesh.quaternion.identity();
      mesh.rotation.set(0, Math.atan2(-_r.z, _r.x), 0);
      return api;
    },
    // turn the plane to face the camera, its length along the screen's horizontal (a soft band that stays
    // level on screen under a line seen in perspective); call after the camera moved
    faceCamera(camera) {
      camera.updateMatrixWorld();
      const e = camera.matrixWorld.elements;
      _r.set(e[0], e[1], e[2]).normalize();
      _u.set(e[4], e[5], e[6]).normalize().negate();
      _b.set(e[8], e[9], e[10]).normalize();
      _m.makeBasis(_r, _b, _u);
      mesh.quaternion.setFromRotationMatrix(_m);
      return api;
    },
    dispose() { geometry.dispose(); material.dispose(); },
  };
  api.set({ length: defaults.length, width: defaults.width, opacity: defaults.opacity });
  return api;
}

export function createShadows({ uniforms = createTideUniforms() } = {}) {
  const group = new THREE.Group();
  group.name = 'studio.shadows';
  const contact = makeShadow(uniforms, CONTACT, 'shadow.contact', { length: 180, width: 70, opacity: 0.75, core: 0.55 });
  const band = makeShadow(uniforms, BAND, 'shadow.band', { length: 420, width: 46, opacity: 0.16 });
  group.add(contact.mesh, band.mesh);
  return {
    group,
    contact,
    band,
    dispose() { contact.dispose(); band.dispose(); group.removeFromParent(); },
  };
}
