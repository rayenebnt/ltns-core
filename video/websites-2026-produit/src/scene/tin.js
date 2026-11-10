// Round gum tin: glossy white body, printed lid with a slight dome, printed skirt band and
// rolled metal rims. Local frame: axis +Y (lid on top), pivot at mid-height.
import * as THREE from 'three';
import { Profile, lathe, parametric, band } from './geom.js';
import { patchMaterial, EDGE_FALLOFF, envDiffuse } from './util.js';

const RB = 3.3; // body radius
const RL = 3.42; // lid radius
const RT = 3.12; // printed top face radius
const H = 2.06;
export const TIN_PIVOT = H / 2;
// exposure of the printed tin in the HDR studio: specular (lacquer) and diffuse parts
export const TIN_ENV = { spec: 0.75, diffuse: 0.55 };

export function createTin({ envMap, lid, skirt }) {
  const root = new THREE.Group();
  root.name = 'tin';
  const inner = new THREE.Group();
  inner.position.y = -TIN_PIVOT;
  root.add(inner);

  const white = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#f2f2ee'),
    roughness: 0.32,
    envMap,
    envMapIntensity: TIN_ENV.spec,
    clearcoat: 0.75,
    clearcoatRoughness: 0.08,
  });
  // rolled tinplate rims: bright polished steel
  const metal = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color().setRGB(0.9, 0.91, 0.92, THREE.LinearSRGBColorSpace),
    metalness: 1,
    roughness: 0.12,
    envMap,
    envMapIntensity: 1.1,
  });
  const skirtMat = new THREE.MeshPhysicalMaterial({
    map: skirt.map,
    roughness: 0.36,
    envMap,
    envMapIntensity: TIN_ENV.spec,
    clearcoat: 0.6,
    clearcoatRoughness: 0.1,
  });
  const lidMat = new THREE.MeshPhysicalMaterial({
    map: lid.map,
    roughnessMap: lid.rm,
    metalnessMap: lid.rm,
    roughness: 1,
    metalness: 1,
    envMap,
    envMapIntensity: TIN_ENV.spec,
    clearcoat: 0.7,
    clearcoatRoughness: 0.08,
  });

  patchMaterial(white, { key: 'tin-white-falloff', fragment: [envDiffuse(TIN_ENV.diffuse), EDGE_FALLOFF] });
  patchMaterial(skirtMat, { key: 'tin-skirt-falloff', fragment: [envDiffuse(TIN_ENV.diffuse), EDGE_FALLOFF] });
  patchMaterial(lidMat, { key: 'tin-lid', fragment: [envDiffuse(TIN_ENV.diffuse)] });

  // body: bottom, rounded heel, wall tucking under the lid
  const body = new Profile(0, 0.02);
  body.line(RB - 0.2, 0.0, 2).round(RB, 0.0, RB, 0.2, 8).line(RB, 1.0, 3).line(RB - 0.02, 1.04, 1);
  const bodyMesh = new THREE.Mesh(lathe(body, 128), white);

  // lid skirt (printed band)
  const skirtMesh = new THREE.Mesh(band(RL, 1.04, 1.86, 180), skirtMat);

  // rolled rims: bottom edge of the skirt, and the top edge curling onto the face
  const rimLo = new Profile(RL - 0.03, 0.96);
  rimLo.round(RL + 0.03, 0.96, RL + 0.03, 1.0, 4).line(RL + 0.03, 1.03, 1).round(RL + 0.03, 1.06, RL - 0.005, 1.06, 3);
  const rimHi = new Profile(RL, 1.84);
  rimHi
    .line(RL + 0.01, 1.9, 1)
    .round(RL + 0.01, H - 0.02, RL - 0.1, H - 0.02, 8)
    .round(RT + 0.08, H - 0.02, RT + 0.04, H - 0.06, 5)
    .line(RT, H - 0.07, 1);
  const rimMat = metal;
  const rimLoMesh = new THREE.Mesh(lathe(rimLo, 128), rimMat);
  const rimHiMesh = new THREE.Mesh(lathe(rimHi, 128), rimMat);

  // printed top face, slight dome, planar UVs (canvas top toward local -Z)
  const dome = 0.035;
  const top = parametric(
    (u, v, out) => {
      const phi = u * Math.PI * 2;
      const r = v * RT;
      out.set(r * Math.sin(phi), H - 0.07 + dome * (1 - v * v), r * Math.cos(phi));
    },
    96,
    18,
    { flip: true },
  );
  const p = top.attributes.position, uv = top.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) / (2 * RT), 0.5 - p.getZ(i) / (2 * RT));
  const topMesh = new THREE.Mesh(top, lidMat);

  // low-poly silhouette: contact shadow caster and cursor hit target (layer 1 only)
  const proxyGeo = new THREE.CylinderGeometry(RL + 0.03, RL, H, 24);
  // neutral grey shadow (explicit: a missing attribute would read a stale GL default)
  proxyGeo.setAttribute('tint', new THREE.BufferAttribute(new Float32Array(proxyGeo.attributes.position.count * 3), 3));
  const proxy = new THREE.Mesh(proxyGeo, new THREE.MeshBasicMaterial());
  proxy.position.y = H / 2;
  proxy.layers.set(1);
  inner.add(bodyMesh, skirtMesh, rimLoMesh, rimHiMesh, topMesh, proxy);
  return { root, inner, proxy, meshes: [bodyMesh, skirtMesh, rimLoMesh, rimHiMesh, topMesh], radius: RL };
}
