// BALANCIER studio: the few analytic lights (the env does the heavy lifting). A key light from the upper
// left front puts a crisp specular glint on the polished hands, indices and chamfers (a small sun-like
// highlight the PMREM softboxes cannot give), a faint cool rim from behind on the right separates the
// case from the background. Both are world-space directional lights (no shadow map).
//
//   const lights = createStudioLights();  scene.add(lights.group);
//   lights.setVariant('light' | 'night' | t)   t in 0..1 blends light → night
import * as THREE from 'three';

const V = {
  light: { key: [1.0, 0.98, 0.95], keyI: 1.1, rim: [0.85, 0.92, 1.0], rimI: 0.45 },
  night: { key: [0.78, 0.86, 1.0], keyI: 0.75, rim: [0.45, 0.62, 1.0], rimI: 0.7 },
};

export function createStudioLights() {
  const group = new THREE.Group();
  group.name = 'studio.lights';
  const key = new THREE.DirectionalLight('#ffffff', 1);
  key.position.set(-60, 110, 140);
  const rim = new THREE.DirectionalLight('#ffffff', 1);
  rim.position.set(120, 40, -140);
  group.add(key, key.target, rim, rim.target);
  const a = new THREE.Color(), b = new THREE.Color();
  function setVariant(v) {
    const t = typeof v === 'number' ? Math.min(1, Math.max(0, v)) : v === 'night' ? 1 : 0;
    key.color.copy(a.setRGB(...V.light.key)).lerp(b.setRGB(...V.night.key), t);
    key.intensity = V.light.keyI + (V.night.keyI - V.light.keyI) * t;
    rim.color.copy(a.setRGB(...V.light.rim)).lerp(b.setRGB(...V.night.rim), t);
    rim.intensity = V.light.rimI + (V.night.rimI - V.light.rimI) * t;
  }
  setVariant('light');
  return { group, key, rim, setVariant, dispose() { key.dispose(); rim.dispose(); group.removeFromParent(); } };
}
