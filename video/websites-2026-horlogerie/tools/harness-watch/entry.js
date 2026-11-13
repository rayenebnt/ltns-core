// Watch test page: the watch module alone in a light grey studio (procedural softbox env through PMREM,
// or three's RoomEnvironment with ?env=room), a soft blob shadow for the resting view.
//   node tools/harness.mjs tools/harness-watch/entry.js .cache/harness-watch.html
// URL: ?q=low|medium|high|max  ?env=studio|room  ?capture (no loop)
// Hooks: window.__ready, window.__shot({ e, b, view, t, float, bg }) → stats, window.__watch, window.__views
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createWatch } from '../../src/world/watch/index.js';
import { COLORS } from '../../src/world/layout.js';
import { MV } from '../../src/world/watch/movement.js';
import { PARTS as PART_TEXT } from '../../src/texts.js';

const params = new URLSearchParams(location.search);
const Q = params.get('q') || 'high';
const ENV = params.get('env') || 'studio';
const CAPTURE = params.has('capture');

function studioEnv(renderer) {
  const s = new THREE.Scene();
  // gradient dome: bright top, neutral horizon, darker floor
  const dome = new THREE.SphereGeometry(100, 48, 24);
  const col = [];
  const p = dome.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 100;
    const v = y > 0 ? 0.3 + 0.32 * Math.pow(y, 0.8) : 0.3 + 0.22 * y;
    col.push(v * 0.98, v, v * 1.02);
  }
  dome.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  s.add(new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const box = (w, h, pos, look, inten, color = '#ffffff') => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.material.color.multiplyScalar(inten);
    m.position.set(...pos);
    m.lookAt(...look);
    s.add(m);
  };
  box(90, 60, [0, 80, 10], [0, 0, 0], 4.5); // overhead softbox
  box(26, 70, [-70, 20, 40], [0, 0, 0], 3.6); // left strip
  box(20, 70, [70, 15, -30], [0, 0, 0], 3.0); // right back strip
  box(60, 18, [0, 10, 85], [0, 0, 0], 1.2); // front fill
  box(14, 50, [55, 30, 60], [0, 0, 0], 2.2); // right front kicker
  box(40, 60, [80, 0, 50], [0, 0, 0], 0.03, '#000000'); // black flags for contrast
  box(40, 60, [-80, -5, -50], [0, 0, 0], 0.03, '#000000');
  box(160, 30, [0, -40, 0], [0, 0, 0], 0.18); // floor bounce
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(s, 0.035);
  pm.dispose();
  return rt.texture;
}

function backgroundTexture(top, edge) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 320;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(256, 150, 20, 256, 160, 330);
  gr.addColorStop(0, top); gr.addColorStop(1, edge);
  g.fillStyle = gr; g.fillRect(0, 0, 512, 320);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function blobShadow() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, 'rgba(20,24,30,0.55)'); gr.addColorStop(0.45, 'rgba(20,24,30,0.22)'); gr.addColorStop(1, 'rgba(20,24,30,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

async function main() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.info.autoReset = false;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const bgLight = backgroundTexture('#f4f5f6', COLORS.studioEdge);
  const bgBlue = backgroundTexture('#1f4396', COLORS.blueDeep);
  scene.background = bgLight;
  let env;
  if (ENV === 'room') {
    const pm = new THREE.PMREMGenerator(renderer);
    env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
  } else env = studioEnv(renderer);
  scene.environment = env;
  const t0 = performance.now();
  const watch = await createWatch({ renderer, quality: Q, envMap: env });
  const loadMs = Math.round(performance.now() - t0);
  const holder = new THREE.Group();
  holder.add(watch.group);
  scene.add(holder);
  const shadow = blobShadow();
  scene.add(shadow);
  const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 5000);

  const deg = Math.PI / 180;
  const dirCam = (target, dist, az, el, fov) => {
    // az: angle from +X towards +Z (deg), el: elevation (deg)
    const a = az * deg, b = el * deg;
    return { pos: [target[0] + dist * Math.cos(b) * Math.cos(a), target[1] + dist * Math.sin(b), target[2] + dist * Math.cos(b) * Math.sin(a)], target, fov };
  };
  const B = MV.balance;
  const VIEWS = {
    line: { ...dirCam([0, -3, 16], 600, 26, 3, 22.5) },
    line2: { ...dirCam([0, -4, 20], 620, 24, 4, 17) },
    mid: { ...dirCam([0, -2, -4], 360, 30, 6, 22) },
    near: { ...dirCam([0, 0, -2], 190, 36, 8, 24) },
    front34: { pos: [62, -36, 132], target: [0, -2, -2], fov: 27 },
    front: { pos: [0, -8, 120], target: [0, 0, 0], fov: 25 },
    back: { pos: [-30, 18, -92], target: [0, 0, -3], fov: 27 },
    heart: { pos: [B[0] - 14, B[1] - 6, -44], target: [B[0] - 1.5, B[1] + 0.5, -1.2], fov: 26 },
    balance: { pos: [B[0] - 4, B[1] - 3.5, -19], target: [B[0], B[1], -1.2], fov: 30 },
    dial12: { pos: [5, -4, 34], target: [0, 8.8, 2.6], fov: 24 },
    loop: { pos: [150, 26, 60], target: [0, -2, -20], fov: 30 },
    side: { pos: [0, 30, 158], target: [0, -6, 0], fov: 27, rest: true },
    strip: { ...dirCam([0, -4, -172], 150, 40, 5, 30) },
    lug: { pos: [46, 52, 40], target: [10, 14, 0], fov: 30 },
    mvt: { pos: [6.5, -7.5, -36], target: [3.2, -4.2, -1], fov: 26 },
    crown: { pos: [62, -14, 22], target: [20, 0, 0], fov: 28 },
    hero: { pos: [-18, 34, 98], target: [0, 0, -4], fov: 30 },
  };
  const restQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)));
  function applyView(name) {
    const v = VIEWS[name] || VIEWS.front34;
    holder.quaternion.copy(v.rest ? restQ : new THREE.Quaternion());
    shadow.visible = !!v.rest;
    if (v.rest) { shadow.position.set(0, watch.floorZ + 0.05, 0); shadow.scale.set(120, 60, 1); }
    camera.position.fromArray(v.pos);
    camera.up.set(0, 1, 0);
    camera.lookAt(new THREE.Vector3(...v.target));
    camera.fov = v.fov;
    camera.aspect = innerWidth / innerHeight;
    const d = camera.position.distanceTo(new THREE.Vector3(...v.target));
    camera.near = Math.max(0.5, d * 0.05);
    camera.far = d * 4 + 600;
    camera.updateProjectionMatrix();
  }

  // a label overlay (like the shell's DOM labels) to judge the line's composition
  const ov = document.createElement('canvas');
  ov.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none';
  document.body.appendChild(ov);
  function drawLabels(anchors, on) {
    ov.width = innerWidth; ov.height = innerHeight;
    const g = ov.getContext('2d');
    g.clearRect(0, 0, ov.width, ov.height);
    if (!on) return;
    g.font = '500 10px "JetBrains Mono", monospace';
    g.textAlign = 'center';
    for (const a of anchors) {
      const up = a.side === 'above';
      const y2 = a.y + (up ? -26 : 26);
      g.strokeStyle = 'rgba(16,21,28,0.55)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(a.x + 0.5, a.y); g.lineTo(a.x + 0.5, y2); g.stroke();
      g.fillStyle = '#10151c';
      g.beginPath(); g.arc(a.x + 0.5, a.y, 1.8, 0, Math.PI * 2); g.fill();
      const txt = (PART_TEXT[a.id] || a.id).toUpperCase().split('').join(String.fromCharCode(8202));
      g.fillText(txt, a.x, y2 + (up ? -5 : 12));
    }
  }
  // a second watch (like the sapphire twin): textures are shared, materials swapped by kind here
  window.__twin = async () => {
    const t0 = performance.now();
    const w2 = await createWatch({ renderer, quality: Q, envMap: env });
    const ms = performance.now() - t0;
    const glass = new THREE.MeshPhysicalMaterial({ color: '#9fc4ff', metalness: 0, roughness: 0.05, transparent: true, opacity: 0.35, envMap: env, depthWrite: false });
    for (const m of w2.meshes()) if (!m.userData.internal) m.material = glass; else m.visible = false;
    w2.group.position.x = 60;
    holder.add(w2.group);
    window.__watch2 = w2;
    return { ms: Math.round(ms), stats: w2.stats() };
  };
  window.__watch = watch;
  window.__views = VIEWS;
  window.__three = { renderer, scene, camera, THREE };
  window.__shot = ({ e = 0, b = null, view = 'front34', t = 0, float = false, bg = 'light', q = null, labels = false } = {}) => {
    if (q) watch.setQuality(q);
    scene.background = bg === 'blue' ? bgBlue : bgLight;
    watch.pose(e, float ? t : null);
    watch.bracelet(b === null ? watch.braceletFor(e) : b);
    watch.setTime(t);
    watch.setMovement(t);
    applyView(view);
    renderer.setSize(innerWidth, innerHeight);
    renderer.info.reset();
    renderer.render(scene, camera);
    const i = renderer.info;
    // label anchors on screen (for checking)
    const anchors = watch.parts.map((p) => {
      const v = p.anchorLocal.clone();
      p.object.localToWorld(v);
      v.project(camera);
      return { id: p.id, side: p.label, x: Math.round((v.x * 0.5 + 0.5) * innerWidth), y: Math.round((-v.y * 0.5 + 0.5) * innerHeight) };
    });
    drawLabels(anchors, !!labels);
    return { view, e, calls: i.render.calls, triangles: i.render.triangles, programs: i.programs ? i.programs.length : 0, textures: i.memory.textures, geometries: i.memory.geometries, watch: watch.stats(), loadMs, anchors };
  };
  window.__ready = true;
  if (!CAPTURE) {
    const loop = (ms) => { window.__shot({ e: 0, view: 'front34', t: ms / 1000 }); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
}
main().catch((e) => { window.__error = String(e && e.stack || e); window.__ready = 'error'; console.error(e); });
