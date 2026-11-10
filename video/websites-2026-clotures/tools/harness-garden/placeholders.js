// Harness only: crude stand-ins for the fence module (which is built elsewhere), so the
// garden views can be judged with a fence in them. Not part of the page.
import * as THREE from 'three';

function boardTexture(base, dark, seed = 1) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 16; i++) {
    const k = 0.86 + rnd() * 0.24;
    g.fillStyle = `rgb(${base[0] * k | 0},${base[1] * k | 0},${base[2] * k | 0})`;
    g.fillRect(i * 16, 0, 16, 64);
    g.fillStyle = `rgba(${dark[0]},${dark[1]},${dark[2]},0.7)`;
    g.fillRect(i * 16 + 15, 0, 1, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export function createPlaceholderFences(scene, garden) {
  const newMat = new THREE.MeshStandardMaterial({ map: boardTexture([190, 118, 66], [90, 50, 25], 3), roughness: 0.85 });
  const postMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.62, 0.38, 0.2), roughness: 0.85 });
  const oldMat = new THREE.MeshStandardMaterial({ map: boardTexture([128, 124, 116], [60, 58, 54], 7), roughness: 0.95 });
  const oldPost = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.32, 0.31, 0.29), roughness: 0.95 });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const group = { new: new THREE.Group(), old: new THREE.Group() };

  function panel(g, mat, x0, z0, x1, z1, h, t, y0 = 0) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const m = new THREE.Mesh(box, mat);
    m.scale.set(len, h, t);
    m.position.set((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2);
    m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    m.castShadow = m.receiveShadow = true;
    if (mat.map) {
      const mm = mat.clone();
      mm.map = mat.map.clone();
      mm.map.repeat.set(len / 2.4, 1);
      mm.map.needsUpdate = true;
      m.material = mm;
    }
    g.add(m);
  }
  function post(g, mat, x, z, h, w = 0.12, tilt = 0) {
    const m = new THREE.Mesh(box, mat);
    m.scale.set(w, h, w);
    m.position.set(x, h / 2, z);
    m.rotation.x = tilt;
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  // new Douglas board fence A -> B -> C, 1.80 m
  const legs = [[[9, 18], [9, -26]], [[9, 18], [-24, 18]]];
  for (const [[ax, az], [bx, bz]] of legs) {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.round(len / 2);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      post(group.new, postMat, ax + (bx - ax) * t, az + (bz - az) * t, 1.92, 0.12);
    }
    panel(group.new, newMat, ax, az, bx, bz, 1.74, 0.05, 0.04);
  }
  // old grey fence along x = -24, with a broken span and the gate opening
  const spans = [[-26, -6], [-2, 0], [1.2, 18]];
  for (const [z0, z1] of spans) panel(group.old, oldMat, -24, z0, -24, z1, 1.8, 0.05, 0.0);
  for (let z = -26; z <= 18; z += 2.2) if (z < -6.5 || z > -1.5) post(group.old, oldPost, -24, z, 1.86, 0.11);
  post(group.old, oldPost, -24, -4, 1.8, 0.11, 0.35); // leaning post
  panel(group.old, oldMat, -24.05, -6, -24.05, -4.6, 1.75, 0.05, 0.0);
  // the gate, hanging off and dragging
  const gate = new THREE.Mesh(box, oldMat);
  gate.scale.set(0.05, 1.75, 1.2);
  gate.position.set(-23.75, 0.86, 0.75);
  gate.rotation.set(0.12, -0.35, 0);
  gate.castShadow = gate.receiveShadow = true;
  group.old.add(gate);
  scene.add(group.new, group.old);

  return {
    show(view) {
      const hero = view === 'hero';
      const repair = view === 'repair' || view === 'gate';
      group.new.visible = !hero && !repair;
      group.old.visible = !hero;
      garden.setFenceAO(group.new.visible ? 1 : 0, 77, group.old.visible ? 1 : 0);
    },
  };
}
