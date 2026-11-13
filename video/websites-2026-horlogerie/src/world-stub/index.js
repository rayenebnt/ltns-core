// Cheap stand-in for the 3D world (WORLD=stub node build.mjs): the WHOLE world contract with simple
// shapes from src/world/layout.js and a camera that follows story.js PHASES, so the shell can be
// tested end to end and the integrator can compare.
//   createWorld({ renderer, quality, onProgress }) -> world
//   world.camera, update(state, dt, time), render(), resize(w, h, dpr), warmup(), setQuality(level),
//   stats(), anchors(), info()
// The 13 parts (discs, rings, boxes) on the watch's own axis: the exploded line across the screen,
// assembled per PHASES.assemble (staggered, the bracelet halves last) into a simple watch that turns
// over, lies down; a horizontal tide line rises (background light → blue, the watch turns
// translucent blue below it); the glass watch explodes and reassembles; a reverse wipe turns it
// back to grey on the night blue; it rises as the white section comes up.
import * as THREE from 'three';
import { PHASES, within } from '../story.js';
import { WATCH, PARTS, COLORS } from '../world/layout.js';

export const rendererOptions = { antialias: true };

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
const ss = (t) => t * t * (3 - 2 * t);
const ph = (p, name) => within(p, PHASES[name]);
const hexRGB = (s) => {
  const h = parseInt(s.slice(1), 16);
  return new THREE.Vector3(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255);
};
// piecewise smooth keys [[p, v], ...] (smoothstep between keys: C1 at every key, no overshoot)
function keys(list) {
  return (p) => {
    if (p <= list[0][0]) return list[0][1];
    for (let i = 0; i < list.length - 1; i++) {
      const [a, va] = list[i], [b, vb] = list[i + 1];
      if (p <= b) return mix(va, vb, ss((p - a) / Math.max(1e-9, b - a)));
    }
    return list[list.length - 1][1];
  };
}

const FOV = 30;
const LINE_YAW = -Math.PI / 2 + 0.42; // local +Z (the front) to the left, discs seen obliquely

export async function createWorld({ renderer, quality = 'high', onProgress = () => {} }) {
  onProgress(0.1);
  let level = quality;
  let W = innerWidth, Hh = innerHeight;
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, W / Hh, 5, 4000);
  scene.add(camera);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7d8590, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.9);
  sun.position.set(-0.5, 0.9, 0.8);
  scene.add(sun);

  // ------------------------------------------------------------------ background (screen space)
  const bgU = {
    uTide: { value: -0.1 },
    uTime: { value: 0 },
    uNight: { value: 0 },
    cS: { value: hexRGB(COLORS.studio) },
    cSE: { value: hexRGB(COLORS.studioEdge) },
    cB: { value: hexRGB(COLORS.blue) },
    cBD: { value: hexRGB(COLORS.blueDeep) },
    cG: { value: hexRGB(COLORS.blueGlow) },
  };
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: bgU,
      depthTest: false,
      depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
      fragmentShader: `varying vec2 vUv; uniform float uTide, uTime, uNight; uniform vec3 cS, cSE, cB, cBD, cG;
        void main(){
          vec2 uv = vUv;
          float edge = uTide + 0.012 * sin(uv.x * 7.0 + uTime * 0.9) + 0.006 * sin(uv.x * 17.0 - uTime * 1.3);
          float r = length((uv - vec2(0.5, 0.55)) * vec2(1.0, 0.8));
          vec3 studio = mix(cS, cSE, smoothstep(0.15, 0.85, r));
          vec3 blue = mix(cB, cBD, smoothstep(0.0, 1.0, r * 1.1 + (1.0 - uv.y) * 0.25));
          blue = mix(blue, cBD * 0.85, uNight * 0.55);
          float below = smoothstep(edge + 0.0015, edge - 0.0015, uv.y);
          vec3 col = mix(studio, blue, below);
          col += cG * exp(-abs(uv.y - edge) * 260.0) * 0.55 * step(-0.05, uTide) * step(uTide, 1.05);
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  bg.frustumCulled = false;
  bg.renderOrder = -10;
  scene.add(bg);

  // ------------------------------------------------------------------ materials
  const planeAbove = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e4); // steel: above the line
  const planeBelow = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e4); // glass: below it
  const mats = [];
  const lam = (color, o = {}) => {
    const m = new THREE.MeshLambertMaterial({ color, clippingPlanes: [planeAbove], ...o });
    mats.push(m);
    return m;
  };
  const steel = lam(0xb9bec6), steelDark = lam(0x8d939b), dialM = lam(COLORS.dialBlue), gilt = lam(COLORS.gilt), rhod = lam(0xd5d8dc), ink = lam(0x1c232c), bezelM = lam(COLORS.dialBlue);
  const crystalM = lam(0xdfe8f2, { transparent: true, opacity: 0.45, depthWrite: false });
  const glass = new THREE.MeshLambertMaterial({ color: 0xa9c8ff, emissive: 0x2a5bd7, emissiveIntensity: 0.4, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide, clippingPlanes: [planeBelow] });

  // ------------------------------------------------------------------ the 13 parts (axis = local Z)
  const cyl = (r, h, seg = 48, theta = Math.PI * 2) => new THREE.CylinderGeometry(r, r, h, seg, 1, false, 0, theta).rotateX(Math.PI / 2);
  const boxG = (x, y, z) => new THREE.BoxGeometry(x, y, z);
  const C = WATCH.case, BR = WATCH.bracelet;
  const lugY = C.lugToLug / 2;
  const brLen = BR.pitch * 8;
  // [geometry, material, x, y, z, rz] per piece
  const DEF = {
    braceletFront: { a: [0, lugY + brLen / 2 - 2, -2.5], pieces: [[boxG(BR.width, brLen, 3.6), steel, 0, 0, 0], [boxG(BR.width * 0.34, brLen, 3.8), steelDark, 0, 0, 0.1]] },
    crystal: { a: [0, 0, 6.2], pieces: [[cyl(WATCH.crystal.diameter / 2, WATCH.crystal.thickness), crystalM, 0, 0, 0]] },
    bezel: { a: [0, 0, 5.0], pieces: [[new THREE.TorusGeometry((WATCH.bezel.outer + WATCH.bezel.inner) / 4, (WATCH.bezel.outer - WATCH.bezel.inner) / 4, 10, 48), bezelM, 0, 0, 0]] },
    dial: { a: [0, 0, 2.1], pieces: [[cyl(WATCH.dial.diameter / 2, WATCH.dial.thickness), dialM, 0, 0, 0]] },
    hands: { a: [0, 0, 2.9], pieces: [[boxG(2.2, WATCH.hands.hour, 0.4), steel, 0, 0, 0, 'h'], [boxG(1.6, WATCH.hands.minute, 0.4), steel, 0, 0, 0.5, 'm'], [boxG(0.5, WATCH.hands.seconds, 0.3), lam(COLORS.ruby), 0, 0, 1.0, 's']] },
    caseMiddle: {
      a: [0, 0, 0],
      pieces: [
        [cyl(C.diameter / 2, C.thickness * 0.7), steel, 0, 0, 0],
        [boxG(4, C.lugToLug, C.lugThickness), steelDark, -C.lugWidth / 2 - 1.6, 0, -1],
        [boxG(4, C.lugToLug, C.lugThickness), steelDark, C.lugWidth / 2 + 1.6, 0, -1],
        [new THREE.CylinderGeometry(WATCH.crown.diameter / 2, WATCH.crown.diameter / 2, WATCH.crown.length, 24).rotateZ(Math.PI / 2), steel, C.diameter / 2 + WATCH.crown.length / 2, 0, 0],
      ],
    },
    mainplate: { a: [0, 0, -1.2], pieces: [[cyl(WATCH.movement.diameter / 2, 1.4), rhod, 0, 0, 0]] },
    train: { a: [0, 0, -2.0], pieces: [[cyl(4.6, 0.6, 32), gilt, -4, 4, 0], [cyl(3.4, 0.6, 32), gilt, 3, 5, 0], [cyl(2.6, 0.6, 32), gilt, 5, -2, 0]] },
    balance: { a: [0, 0, -2.6], pieces: [[new THREE.TorusGeometry(5, 0.55, 8, 40), gilt, 0, -5, 0], [boxG(10, 0.5, 0.4), gilt, 0, -5, 0]] },
    bridges: { a: [0, 0, -3.4], pieces: [[boxG(20, 11, 1.2), rhod, 0, 3, 0], [boxG(9, 7, 1.2), rhod, 3, -7, 0]] },
    rotor: { a: [0, 0, -4.4], pieces: [[cyl(12.4, 0.8, 40, Math.PI), steel, 0, 0, 0]] },
    caseback: { a: [0, 0, -5.6], pieces: [[cyl(WATCH.caseback.diameter / 2, WATCH.caseback.thickness), steelDark, 0, 0, 0]] },
    braceletBack: { a: [0, -(lugY + brLen / 2 - 2), -2.5], pieces: [[boxG(BR.width, brLen, 3.6), steel, 0, 0, 0], [boxG(BR.clasp, 14, 5.2), steelDark, 0, 0, 0.8]] },
  };
  const watch = new THREE.Group();
  scene.add(watch);
  const parts = PARTS.map((pt, idx) => {
    const d = DEF[pt.id];
    const pivot = new THREE.Group();
    const steelG = new THREE.Group(), glassG = new THREE.Group();
    const bb = new THREE.Box3();
    const hands = {};
    for (const [g, m, x, y, z, tag] of d.pieces) {
      const a = new THREE.Mesh(g, m);
      const b = new THREE.Mesh(g, glass);
      for (const o of [a, b]) o.position.set(x, y, z);
      steelG.add(a);
      glassG.add(b);
      g.computeBoundingBox();
      bb.union(g.boundingBox.clone().translate(new THREE.Vector3(x, y, z)));
      if (tag) hands[tag] = [a, b];
    }
    pivot.add(steelG, glassG);
    watch.add(pivot);
    // the order the parts come in: from the case outwards, the bracelet halves last
    const dist = Math.abs(pt.z);
    return { id: pt.id, side: pt.label, z: pt.z, a: d.a, pivot, steelG, glassG, bb, hands, idx, dist, e: 1 };
  });
  const maxDist = Math.max(...parts.filter((q) => !q.id.startsWith('bracelet')).map((q) => q.dist));
  parts.forEach((q) => {
    q.delay = q.id.startsWith('bracelet') ? 0.62 : 0.5 * (1 - q.dist / maxDist);
  });
  onProgress(0.6);

  // ------------------------------------------------------------------ the choreography (from p)
  const yawK = keys([[0, LINE_YAW], [0.035, LINE_YAW], [0.15, 0.45], [0.19, 0.3], [0.27, Math.PI - 0.32], [0.31, Math.PI - 0.22], [0.38, 0.5], [0.44, 0.55], [0.56, 0.85], [0.6, LINE_YAW], [0.65, LINE_YAW], [0.71, LINE_YAW + 0.1], [0.78, 0.5], [0.82, 0.32], [0.865, 0.18], [0.9, 0.1]]);
  const pitchK = keys([[0, 0], [0.31, 0], [0.38, -1.22], [0.44, -1.22], [0.5, -0.45], [0.56, -0.3], [0.6, 0], [0.71, 0], [0.78, -0.25], [0.9, -0.2]]);
  // camera distance (mm) for the assembled views; the line's own framing is computed from the window
  const distK = keys([[0, 1], [0.035, 1], [0.15, 0], [0.56, 0], [0.6, 1], [0.65, 1], [0.68, 0.45], [0.71, 0.55], [0.78, 0]]);
  const nearK = keys([[0.035, 210], [0.15, 190], [0.19, 175], [0.27, 92], [0.31, 86], [0.38, 165], [0.44, 170], [0.56, 190], [0.71, 170], [0.78, 175], [0.82, 112], [0.865, 120], [0.9, 150]]);
  const txK = keys([[0, 0], [0.035, 0], [0.15, -22], [0.19, -20], [0.27, -12], [0.31, -12], [0.38, -8], [0.44, -38], [0.56, -38], [0.6, 0], [0.65, 0], [0.68, 70], [0.71, -50], [0.78, -26], [0.865, -26], [0.9, -24]]);
  const tyK = keys([[0, 26], [0.035, 26], [0.15, 0], [0.56, 0], [0.6, 14], [0.65, 14], [0.71, 0], [0.865, 0], [0.9, -46]]);

  let curP = 0, stage = 'studio', tideUv = -0.1, wipeUv = 1.1;
  const target = new THREE.Vector3();
  const tmpV = new THREE.Vector3();
  function lineDist() {
    // frame the whole line (about 380 mm, bracelets included) with margins at any window
    const aspect = W / Hh;
    const halfW = 215;
    const tanH = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    return Math.max(halfW / aspect / tanH, 150 / tanH);
  }

  function update(state, dt, time) {
    const p = clamp(state.p);
    curP = p;
    // explode factor per part: the assembly (staggered, the bracelets last), the glass explode, the
    // reassembly
    const ka = ph(p, 'assemble'), kx = ph(p, 'explodeSapphire'), kr = ph(p, 'reassemble');
    for (const q of parts) {
      const ea = 1 - ss(clamp((ka - q.delay * 0.55) / 0.45));
      const er = 1 - ss(clamp((kr - q.delay * 0.55) / 0.45));
      q.e = p < PHASES.assemble[1] ? ea : p < PHASES.explodeSapphire[0] ? 0 : p < PHASES.reassemble[0] ? 1 - Math.pow(1 - kx, 3) : er;
      const z = mix(q.a[2], q.z, q.e);
      q.pivot.position.set(mix(q.a[0], 0, q.e), mix(q.a[1], 0, q.e), z);
    }
    // idle motion: the seconds hand (8 ticks a second), a gentle float
    const sec = Math.floor(time * 8) / 8 + 30;
    const hp = parts.find((q) => q.id === 'hands').hands;
    for (const o of hp.h) o.rotation.z = -((10 + 9 / 60) / 12) * Math.PI * 2;
    for (const o of hp.m) o.rotation.z = -(9.5 / 60) * Math.PI * 2;
    for (const o of hp.s) o.rotation.z = -(sec / 60) * Math.PI * 2;
    for (const o of hp.h.concat(hp.m, hp.s)) o.position.set(0, 0, o.position.z);
    watch.rotation.set(pitchK(p), yawK(p) + 0.05 * Math.sin(time * 0.4) * (p > 0.44 && p < 0.56 ? 1 : 0), 0, 'YXZ');
    watch.position.y = Math.sin(time * 0.7) * 0.6;

    // camera
    const D = mix(nearK(p), lineDist(), distK(p));
    target.set(txK(p) + state.pointer.x * 3, tyK(p) + state.pointer.y * 2, 0);
    camera.position.set(target.x, target.y, D);
    camera.lookAt(target);
    camera.updateMatrixWorld();

    // the tide (a straight line here; the background's line undulates) and the reverse wipe
    tideUv = mix(-0.08, 1.08, ss(ph(p, 'tide')));
    wipeUv = mix(1.08, -0.08, ss(ph(p, 'restore')));
    const inTide = p > PHASES.tide[0] && p < PHASES.tide[1];
    const inWipe = p > PHASES.restore[0] && p < PHASES.restore[1];
    const glassOnly = p >= PHASES.tide[1] && p <= PHASES.restore[0];
    const steelOnly = p <= PHASES.tide[0] || p >= PHASES.restore[1];
    const lineUv = inTide ? tideUv : inWipe ? wipeUv : steelOnly ? -1 : 2;
    const a = (lineUv * 2 - 1) * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const n = tmpV.set(0, 1, a).normalize();
    planeAbove.set(n, 0).applyMatrix4(camera.matrixWorld);
    planeBelow.copy(planeAbove).negate();
    for (const q of parts) {
      q.steelG.visible = !glassOnly;
      q.glassG.visible = !steelOnly;
    }
    bgU.uTide.value = p < PHASES.tide[0] ? -0.1 : tideUv;
    bgU.uTime.value = time;
    bgU.uNight.value = ph(p, 'restore');
    stage = p < PHASES.tide[0] ? 'studio' : p < PHASES.tide[1] ? 'tide' : p < PHASES.restore[0] ? 'blue' : 'night';
  }

  // ------------------------------------------------------------------ anchors (CSS px)
  const P = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  function project(v) {
    P.copy(v).project(camera);
    return { x: ((P.x + 1) / 2) * W, y: ((1 - P.y) / 2) * Hh, front: P.z > -1 && P.z < 1 };
  }
  function anchors() {
    watch.updateMatrixWorld(true);
    const labels = parts.map((q) => {
      m4.copy(q.pivot.matrixWorld);
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, front = true;
      const { min, max } = q.bb;
      for (let i = 0; i < 8; i++) {
        P.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).applyMatrix4(m4);
        const s = project(P);
        front = front && s.front;
        x0 = Math.min(x0, s.x);
        y0 = Math.min(y0, s.y);
        x1 = Math.max(x1, s.x);
        y1 = Math.max(y1, s.y);
      }
      const on = front && x1 > 0 && x0 < W && y1 > 0 && y0 < Hh;
      const x = (x0 + x1) / 2;
      return { id: q.id, x, y: q.side === 'above' ? y0 : y1, side: q.side, visible: on && q.e > 0.8, box: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } };
    });
    // the case: its centre and its radius on screen
    const cm = parts.find((q) => q.id === 'caseMiddle');
    const c = project(tmpV.setFromMatrixPosition(cm.pivot.matrixWorld));
    const camR = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(WATCH.case.diameter / 2);
    const e = project(tmpV.setFromMatrixPosition(cm.pivot.matrixWorld).add(camR));
    const r = Math.hypot(e.x - c.x, e.y - c.y);
    const lineUv = curP > PHASES.tide[0] && curP < PHASES.tide[1] ? tideUv : -9;
    const edge = lineUv + 0.012 * Math.sin(0.5 * 7 + bgU.uTime.value * 0.9) + 0.006 * Math.sin(0.5 * 17 - bgU.uTime.value * 1.3);
    const ty = (1 - edge) * Hh;
    return {
      labels,
      watch: { x: c.x, y: c.y, r, visible: c.front && c.x > -r && c.x < W + r && c.y > -r && c.y < Hh + r },
      tide: { y: ty >= 0 && ty <= Hh ? ty : -1 },
    };
  }

  // ------------------------------------------------------------------ the contract
  function resize(w, h, dpr) {
    W = w;
    Hh = h;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize(W, Hh, renderer.getPixelRatio());
  onProgress(1);

  return {
    camera,
    update,
    render() {
      renderer.render(scene, camera);
    },
    resize,
    async warmup() {
      for (const p of [0.02, 0.1, 0.29, 0.41, 0.5, 0.62, 0.68, 0.8, 0.84]) {
        update({ p, pointer: { x: 0, y: 0 } }, 1, 0);
        renderer.render(scene, camera);
      }
    },
    setQuality(lv) {
      level = lv;
    },
    stats() {
      const i = renderer.info;
      return { calls: i.render.calls, triangles: i.render.triangles, textures: i.memory.textures, geometries: i.memory.geometries, programs: i.programs ? i.programs.length : 0, stage, level };
    },
    anchors,
    info() {
      return { stage };
    },
  };
}
