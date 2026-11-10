// DOM layer: carousel tabs and arrows, heading section, bottom bar, toast, custom cursor.
import { smooth } from './scene/util.js';

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

export const TOAST = 'Démonstration : ARDEUR est une marque fictive imaginée par LTNS°.';

export function createUI({ onTab, onPrev, onNext, onStory, onTop, onCta }) {
  const $ = (id) => document.getElementById(id);
  const tabs = [...document.querySelectorAll('.tab')];
  const sTabs = styler($('tabs'));
  const sPrev = styler($('prev')), sNext = styler($('next'));
  const head = $('head');
  const sHead = styler(head);
  const l1 = styler(head.querySelector('.l1')), l2 = styler(head.querySelector('.l2'));
  const cta = $('cta');
  const sCta = styler(cta);
  const sPara = styler($('para'));
  const sLogo = styler($('bar-logo'));
  const sVig = styler($('vignette'));
  const toast = $('toast');
  let toastTimer = 0;
  let toastTop = false;
  let active = 1;

  function showToast() {
    toast.textContent = TOAST;
    if (toastTop) {
      // second half: under the CTA, in the left column, clear of the bottle and the splash
      const r = cta.getBoundingClientRect();
      toast.style.setProperty('--tx', `${Math.round(r.left)}px`);
      toast.style.setProperty('--ty', `${Math.round(r.bottom + 18)}px`);
    }
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 3400);
  }

  tabs.forEach((t) => t.addEventListener('click', () => onTab(+t.dataset.i)));
  $('prev').addEventListener('click', onPrev);
  $('next').addEventListener('click', onNext);
  $('story').addEventListener('click', onStory);
  $('bar-logo').addEventListener('click', onTop);
  $('contact').addEventListener('click', showToast);
  $('range').addEventListener('click', showToast);
  cta.addEventListener('click', () => {
    showToast();
    onCta && onCta();
  });
  // buttons never keep the keyboard focus: arrow keys and space must stay with the page
  document.querySelectorAll('#ui button').forEach((b) => b.addEventListener('mouseup', () => b.blur()));

  function setActive(i) {
    if (i === active) return;
    active = i;
    tabs.forEach((t, k) => t.classList.toggle('is-active', k === i));
  }

  function update(p, fadesNow) {
    const hero = fadesNow.heroUI;
    const h = hero.toFixed(3);
    sTabs('opacity', h);
    sTabs('transform', `translateX(-50%) translateY(${((1 - hero) * -10).toFixed(1)}px)`);
    sTabs('visibility', hero < 0.01 ? 'hidden' : 'visible');
    for (const [s, dir] of [[sPrev, -1], [sNext, 1]]) {
      s('opacity', h);
      s('transform', `translateX(${((1 - hero) * 14 * dir).toFixed(1)}px)`);
      s('visibility', hero < 0.01 ? 'hidden' : 'visible');
    }
    const a1 = smooth(0.5, 0.575, p), a2 = smooth(0.525, 0.6, p);
    sHead('opacity', a1 > 0.001 ? '1' : '0');
    sHead('visibility', a1 > 0.001 ? 'visible' : 'hidden');
    l1('opacity', a1.toFixed(3));
    l1('transform', `translateY(${((1 - a1) * 26).toFixed(1)}px)`);
    l2('opacity', a2.toFixed(3));
    l2('transform', `translateY(${((1 - a2) * 26).toFixed(1)}px)`);
    const c = smooth(0.885, 0.94, p);
    sCta('opacity', c.toFixed(3));
    sCta('transform', `translateY(${((1 - c) * 14).toFixed(1)}px)`);
    sCta('pointerEvents', c > 0.5 ? 'auto' : 'none');
    const pa = smooth(0.56, 0.635, p);
    sPara('opacity', pa.toFixed(3));
    sPara('transform', `translateY(${((1 - pa) * 14).toFixed(1)}px)`);
    // the upright bottle clears the bar; the logo is gone before the base of the bottle reaches
    // it on the way down to the splash (the base crosses the bar at about p = 0.83)
    const lo = 1 - smooth(0.79, 0.825, p);
    sLogo('opacity', lo.toFixed(3));
    sLogo('pointerEvents', lo > 0.5 ? 'auto' : 'none');
    sVig('opacity', (1 - fadesNow.white).toFixed(3));
    // in the second half the toast shows under the CTA, clear of the bottle
    const top = p > 0.5;
    if (top !== toastTop) {
      toastTop = top;
      // a toast still on screen when the page crosses the middle disappears at once: moving it
      // between its two places while visible would slide it in from beyond the left edge
      toast.style.transition = 'none';
      toast.classList.remove('is-on');
      toast.classList.toggle('is-under', top);
      void toast.offsetWidth; // apply the new place without a transition
      toast.style.transition = '';
      clearTimeout(toastTimer);
    }
  }

  return { update, setActive, showToast };
}

// Custom cursor: a small dark dot that grows into a black disc reading DÉCOUVRIR over a
// product, and hides after 2 s without movement (always hidden in the hands-free take,
// except for its scripted pass).
export function createCursor() {
  const el = document.getElementById('cursor');
  const disc = el.querySelector('b');
  const label = el.querySelector('span');
  const st = { x: innerWidth / 2, y: innerHeight / 2, s: 0.11, l: 0, on: false };
  const sEl = styler(el), sDisc = styler(disc), sLabel = styler(label);
  return {
    // target: { x, y, over (0..1), visible }, dt seconds
    update(target, dt, snap = false) {
      const k = snap ? 1 : 1 - Math.exp(-dt * 26);
      st.x += (target.x - st.x) * k;
      st.y += (target.y - st.y) * k;
      const ks = snap ? 1 : 1 - Math.exp(-dt * 11);
      const goal = target.over ? 1 : target.button ? 0.2 : 0.11;
      st.s += (goal - st.s) * ks;
      st.l += ((target.over ? 1 : 0) - st.l) * (snap ? 1 : 1 - Math.exp(-dt * 9));
      sEl('transform', `translate3d(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px, 0)`);
      sDisc('transform', `scale(${st.s.toFixed(3)})`);
      sLabel('opacity', Math.max(0, (st.l - 0.45) / 0.55).toFixed(3));
      if (target.visible !== st.on) {
        st.on = target.visible;
        el.classList.toggle('is-on', st.on);
      }
    },
    place(x, y) {
      st.x = x;
      st.y = y;
    },
    // the DÉCOUVRIR disc is fully grown (a click on the product may move the story on)
    grown: () => st.on && st.l > 0.9,
  };
}
