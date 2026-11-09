import * as THREE from 'three';
import { FLOOR_INFO } from './scene/config.js';

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Writes a style only when the value changed (keeps the per-frame cost tiny).
function styler(el) {
  const cache = {};
  return (prop, value) => {
    if (cache[prop] !== value) {
      cache[prop] = value;
      el.style[prop] = value;
    }
  };
}

export function createUI({ onBack, onDiscover, onCallback }) {
  const $ = (id) => document.getElementById(id);
  const card = $('card');
  const num = $('floor-num');
  const l1 = $('floor-l1');
  const l2 = $('floor-l2');
  const ctaN = $('floor-cta-n');
  const back = $('back');
  const hint = $('hint');
  const tag = $('room-tag');
  const toast = $('toast');
  const sScrim = styler($('scrim'));
  const sCard = styler(card), sBack = styler(back), sHint = styler(hint), sTag = styler(tag);
  const hotspots = [...document.querySelectorAll('.hotspot')].map((el, i) => ({ el, key: el.dataset.anchor, s: styler(el), i }));
  const v = new THREE.Vector3();
  let floor = 8;
  let toastTimer = 0;

  back.addEventListener('click', onBack);
  $('floor-cta').addEventListener('click', onDiscover);
  $('callback').addEventListener('click', () => {
    onCallback && onCallback();
    toast.textContent = 'Démonstration\u202F: Cap Lumière est un projet fictif imaginé par LTNS°.';
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 3200);
  });

  function setFloor(f, instant = false) {
    if (f === floor && !instant) return;
    const up = f > floor;
    const old = [...num.querySelectorAll('.digit.is-in')];
    const nd = document.createElement('span');
    nd.textContent = String(f).padStart(2, '0');
    if (instant) {
      nd.className = 'digit is-in';
      num.querySelectorAll('.digit').forEach((o) => o.remove());
      num.appendChild(nd);
    } else {
      nd.className = 'digit ' + (up ? 'is-below' : 'is-above');
      num.appendChild(nd);
      void nd.offsetWidth;
      nd.className = 'digit is-in';
      old.forEach((o) => {
        o.className = 'digit ' + (up ? 'is-above' : 'is-below');
        setTimeout(() => o.remove(), 480);
      });
    }
    const info = FLOOR_INFO[f];
    if (info) {
      l1.textContent = info[0];
      l2.textContent = info[1];
    }
    ctaN.textContent = String(f);
    floor = f;
  }

  function update(p, camera, anchors, w, h) {
    const cardA = 1 - smooth(0.215, 0.29, p);
    sCard('opacity', cardA.toFixed(3));
    sCard('transform', `translateY(-50%) translateY(${((1 - cardA) * 18).toFixed(1)}px)`);
    sCard('visibility', cardA < 0.005 ? 'hidden' : 'visible');

    const hintA = 1 - smooth(0.004, 0.035, p);
    sHint('opacity', hintA.toFixed(3));

    const backA = smooth(0.38, 0.47, p);
    sBack('opacity', backA.toFixed(3));
    sBack('transform', `translateX(${((1 - backA) * -10).toFixed(1)}px)`);
    sBack('pointerEvents', backA > 0.5 ? 'auto' : 'none');

    // top scrim: light while the logo crosses the tower top, full over the bright ceiling
    sScrim('opacity', Math.max(0.3 * smooth(0.36, 0.42, p), smooth(0.6, 0.74, p)).toFixed(3));

    const tagA = smooth(0.86, 0.93, p);
    sTag('opacity', tagA.toFixed(3));
    sTag('transform', `translateY(${((1 - tagA) * 14).toFixed(1)}px)`);

    for (const hs of hotspots) {
      const a0 = 0.9 + hs.i * 0.025;
      const a = smooth(a0, a0 + 0.05, p);
      const anchor = anchors[hs.key];
      if (!anchor || a <= 0.001) {
        hs.s('opacity', '0');
        continue;
      }
      v.copy(anchor).project(camera);
      if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) {
        hs.s('opacity', '0');
        continue;
      }
      const x = (v.x * 0.5 + 0.5) * w;
      const y = (-v.y * 0.5 + 0.5) * h;
      const flip = x > w * 0.7; // label on the left of the dot near the right edge
      if (flip !== hs.flip) {
        hs.flip = flip;
        hs.el.classList.toggle('is-flip', flip);
      }
      hs.s('opacity', a.toFixed(3));
      hs.s('transform', `translate(${x.toFixed(1)}px, ${(y - 7 + (1 - a) * 8).toFixed(1)}px)${flip ? ' translateX(-100%)' : ''}`);
    }
  }

  return { setFloor, update, get floor() { return floor; } };
}
