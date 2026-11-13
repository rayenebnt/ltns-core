// BALANCIER watch: the sunburst dial (print layer, flange, applied indices with lume) and the hands.
import * as THREE from 'three';
import { WATCH } from '../layout.js';
import { lathe, extrude, merge, polyShape, circleShape, planarUV, setTangents, transformed, TAU } from './geo.js';

export function buildDial(ctx, obj) {
  const { Q, add } = ctx;
  const R = WATCH.dial.diameter / 2; // 15.5
  const t = WATCH.dial.thickness / 2;
  // sunburst disc: polar uv (u = angle) for the radial lines, a soft darker rim (fumé) as vertex colors
  const rings = [R, 14.2, 12.5, 10.5, 8, 5, 2.5, 0];
  const prof = [[0, -t], [R, -t], [R, t], ...rings.slice(1).map((r) => [r, t])];
  const disc = lathe(prof, {
    segments: Q.seg, crease: 0.5,
    colorFn: (r, z) => { const f = Math.max(0, Math.min(1, (r - 6) / (R - 6))); const c = 1 - 0.42 * f * f; return [c, c, c]; },
  });
  add('dial.disc', 'dial', disc, obj);
  // flange (rehaut) from the dial up to the crystal, matte blue
  add('dial.flange', 'dial', lathe([[15.95, 1.62], [15.78, 1.62], [15.42, t]], { segments: Q.seg, crease: 0.4 }), obj, 'dialFlange');
  // the printed layer (minute track, brand, city)
  const print = new THREE.CircleGeometry(15.2, Q.seg);
  planarUV(print, 1 / ctx.D.dial);
  print.translate(0, 0, t + 0.004);
  add('dial.print', 'print', print, obj);
  // applied polished baton indices with lume inserts, double at 12
  const idx = [], lume = [];
  const r0 = 11.15, r1 = 13.65, h = 0.3;
  const baton = (w, x0) => {
    const g = extrude(polyShape([[x0 - w / 2, r0], [x0 + w / 2, r0], [x0 + w / 2, r1], [x0 - w / 2, r1]]), h, { bevel: 0.07, bevelSegments: 2 });
    g.translate(0, 0, t + h / 2);
    const l = extrude(polyShape([[x0 - w * 0.27, r0 + 0.32], [x0 + w * 0.27, r0 + 0.32], [x0 + w * 0.27, r1 - 0.32], [x0 - w * 0.27, r1 - 0.32]]), 0.05);
    l.translate(0, 0, t + h + 0.005);
    return [g, l];
  };
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const pieces = i === 0 ? [baton(0.8, -0.58), baton(0.8, 0.58)] : [baton(i % 3 === 0 ? 1.05 : 0.86, 0)];
    for (const [g, l] of pieces) {
      g.rotateZ(-a); l.rotateZ(-a);
      idx.push(g); lume.push(l);
    }
  }
  const idxG = merge(idx);
  setTangents(idxG, (x, y) => [x, y, 0]);
  add('dial.indices', 'steelPolished', idxG, obj, 'hands');
  add('dial.lume', 'lume', merge(lume), obj);
}

// a sword hand pointing +Y: hub radius, half width w at height yW, tip at yT
function swordShape(hub, w, yW, yT) {
  const neck = Math.min(hub * 0.85, w * 0.42);
  const a = Math.asin(neck / hub);
  const ny = hub * Math.cos(a);
  const pts = [[neck, ny], [w, yW], [w * 0.62, yW + (yT - yW) * 0.55], [w * 0.2, yT - (yT - yW) * 0.1], [0, yT], [-w * 0.2, yT - (yT - yW) * 0.1], [-w * 0.62, yW + (yT - yW) * 0.55], [-w, yW], [-neck, ny]];
  const s = polyShape(pts);
  const n = 28;
  for (let i = 1; i < n; i++) {
    const ang = Math.PI / 2 + a + (i / n) * (TAU - 2 * a);
    s.lineTo(hub * Math.cos(ang), hub * Math.sin(ang));
  }
  return s;
}
function swordLume(w, y0, yW, yT) {
  return polyShape([[w * 0.32, y0], [w, yW], [w * 0.58, yW + (yT - yW) * 0.55], [0, yT], [-w * 0.58, yW + (yT - yW) * 0.55], [-w, yW], [-w * 0.32, y0]]);
}

// a soft contact shadow of a hand on the dial: its silhouette blurred into a small canvas (one per hand,
// shared by every watch); kind 'shadow', userData.internal (an x-ray / sapphire look should hide it)
const shadowTex = new Map();
function handShadow(ctx, key, shapes, parent, zDial) {
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const polys = shapes.map((sh) => sh.extractPoints(10).shape);
  for (const pts of polys) for (const p of pts) { box.x0 = Math.min(box.x0, p.x); box.x1 = Math.max(box.x1, p.x); box.y0 = Math.min(box.y0, p.y); box.y1 = Math.max(box.y1, p.y); }
  const m = 0.7, k = 28; // margin (mm), px per mm
  const x0 = box.x0 - m, y0 = box.y0 - m, w = box.x1 - box.x0 + 2 * m, h = box.y1 - box.y0 + 2 * m;
  let tex = shadowTex.get(key);
  if (!tex) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * k); c.height = Math.ceil(h * k);
    const g = c.getContext('2d');
    g.filter = `blur(${Math.round(0.2 * k)}px)`;
    g.fillStyle = '#fff';
    for (const pts of polys) {
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo((p.x - x0) * k, (y0 + h - p.y) * k) : g.moveTo((p.x - x0) * k, (y0 + h - p.y) * k)));
      g.closePath();
      g.fill();
    }
    tex = new THREE.CanvasTexture(c);
    shadowTex.set(key, tex);
  }
  const geo = new THREE.PlaneGeometry(w, h);
  geo.translate(x0 + w / 2, y0 + h / 2, zDial);
  const mesh = ctx.add(`hands.${key}Shadow`, 'shadow', geo, parent, 'handShadow');
  if (!mesh.userData.ownMaterial) {
    mesh.material = new THREE.MeshBasicMaterial({ color: '#05070c', alphaMap: tex, transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    mesh.userData.ownMaterial = true;
    mesh.userData.internal = true;
    mesh.renderOrder = -1;
  }
  return mesh;
}
function circleAt(x, y, r) {
  const s = new THREE.Shape();
  for (let i = 0; i <= 32; i++) { const a = (i / 32) * TAU; if (i) s.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); else s.moveTo(x + r * Math.cos(a), y + r * Math.sin(a)); }
  return s;
}

export function buildHands(ctx, obj) {
  const { add, sub } = ctx;
  const H = WATCH.hands;
  const radialT = (x, y) => [-y, x, 0];
  // hour hand
  const hour = sub(obj, 'hour', -0.22);
  const hf = extrude(swordShape(1.15, 1.05, 5.0, H.hour), 0.14, { bevel: 0.045, bevelSegments: 2 });
  hf.translate(0, 0, 0);
  add('hands.hour', 'hands', setTangents(hf, radialT), hour);
  const hl = extrude(swordLume(0.62, 2.0, 5.0, H.hour - 1.05), 0.04);
  hl.translate(0, 0, 0.085);
  add('hands.hourLume', 'lume', hl, hour);
  const dialZ = WATCH.dial.thickness / 2 + WATCH.dial.z - 2.8; // the dial's top face in the hands part's frame
  // minute hand
  const minute = sub(obj, 'minute', 0.02);
  const mf = extrude(swordShape(0.95, 0.78, 8.6, H.minute), 0.13, { bevel: 0.04, bevelSegments: 2 });
  add('hands.minute', 'hands', setTangents(mf, radialT), minute);
  const ml = extrude(swordLume(0.44, 2.4, 8.6, H.minute - 1.0), 0.04);
  ml.translate(0, 0, 0.08);
  add('hands.minuteLume', 'lume', ml, minute);
  // seconds hand: a thin needle with a counterweight (lume dot) and a ruby-red tip
  const seconds = sub(obj, 'seconds', 0.28);
  const needle = extrude(polyShape([[-0.12, -3.35], [0.12, -3.35], [0.075, H.seconds - 0.45], [0, H.seconds], [-0.075, H.seconds - 0.45]]), 0.08, { bevel: 0.02 });
  const cw = extrude(circleShape(0.88, 32), 0.1, { bevel: 0.03 });
  cw.translate(0, -2.45, 0);
  const hub = extrude(circleShape(0.6, 32), 0.14, { bevel: 0.03 });
  const cap = lathe([[0.62, 0.0], [0.62, 0.1], [0.45, 0.2], [0, 0.24]], { segments: 32, crease: 0.5 });
  cap.translate(0, 0, 0.05);
  add('hands.seconds', 'hands', setTangents(merge([needle, cw, hub, cap]), radialT), seconds);
  const tip = extrude(polyShape([[-0.1, H.seconds - 3.1], [0.1, H.seconds - 3.1], [0.082, H.seconds - 0.45], [0, H.seconds + 0.02], [-0.082, H.seconds - 0.45]]), 0.03);
  tip.translate(0, 0, 0.05);
  add('hands.secondsTip', 'ruby', tip, seconds, 'paint');
  const dot = extrude(circleShape(0.5, 24), 0.03);
  dot.translate(0, -2.45, 0.065);
  add('hands.secondsLume', 'lume', dot, seconds);
  // soft shadows on the dial (children of the hands so that they turn with them; offset in setTime)
  const shadows = {
    hour: handShadow(ctx, 'hour', [swordShape(1.15, 1.05, 5.0, H.hour)], hour, dialZ + 0.22 + 0.006),
    minute: handShadow(ctx, 'minute', [swordShape(0.95, 0.78, 8.6, H.minute)], minute, dialZ - 0.02 + 0.007),
    seconds: handShadow(ctx, 'seconds', [polyShape([[-0.12, -3.35], [0.12, -3.35], [0.075, H.seconds - 0.45], [0, H.seconds], [-0.075, H.seconds - 0.45]]), circleAt(0, -2.45, 0.88), circleAt(0, 0, 0.62)], seconds, dialZ - 0.28 + 0.008),
  };
  return { hour, minute, seconds, shadows };
}
