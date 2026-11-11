// DOM layer, updated every frame from the director's state and the world's screen anchors:
// top bar, rack caption (with a vertical text roll), « VOIR LA DISPO », product title, DEVANT/DOS
// toggle, link, arrows, « FERMER × », toast. The marquee is pure CSS.
import { PRODUCTS } from './catalog.js';
import { TOAST, captionOf, titleOf } from './texts.js';
import { clamp, smooth, styler, toggler, f1, f3, approach } from './util.js';

export const BAND_H = 34; // px, the marquee band (style.css --band)

export function createUI(handlers) {
  const $ = (id) => document.getElementById(id);

  const topEl = $('top');
  const top = { s: styler(topEl), t: toggler(topEl) };
  const closeEl = $('close');
  const close = { s: styler(closeEl), t: toggler(closeEl) };
  const rackEl = $('rack-ui');
  const rack = { s: styler(rackEl), t: toggler(rackEl) };
  const prodEl = $('product-ui');
  const prod = { s: styler(prodEl), t: toggler(prodEl) };
  const capEl = $('caption');
  const capS = styler(capEl);
  const pinfoEl = $('pinfo');
  const pinfoS = styler(pinfoEl);
  const titleEl = $('title');
  const prevEl = $('prev'), nextEl = $('next');
  const prevS = styler(prevEl), nextS = styler(nextEl);
  const toggleEl = $('toggle');
  const toggleT = toggler(toggleEl);
  const segs = [...toggleEl.querySelectorAll('button')];
  const dispoEl = $('dispo');
  const toast = $('toast');
  let toastTimer = 0;
  const docT = toggler(document.documentElement);

  function showToast() {
    toast.textContent = TOAST;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 3600);
  }

  // ------------------------------------------------------------ events
  document.querySelectorAll('.cta').forEach((b) => b.addEventListener('click', showToast));
  closeEl.addEventListener('click', () => handlers.onClose());
  prevEl.addEventListener('click', () => handlers.onGo(-1));
  nextEl.addEventListener('click', () => handlers.onGo(1));
  segs.forEach((b) => b.addEventListener('click', () => handlers.onSide(+b.dataset.side)));
  // buttons never keep the keyboard focus after a click: arrows, space and Échap stay with the page
  document.addEventListener('pointerup', (e) => {
    const b = e.target && e.target.closest ? e.target.closest('button') : null;
    if (b) setTimeout(() => b.blur(), 0);
  });

  // ------------------------------------------------------------ text rolls
  // the old line leaves up (or down), the new one comes in from the other side
  function roll(host, text, dir, instant) {
    const old = [...host.querySelectorAll('.roll')];
    const nd = document.createElement('span');
    nd.textContent = text;
    if (instant) {
      old.forEach((o) => o.remove());
      nd.className = 'roll is-in';
      host.appendChild(nd);
      return;
    }
    nd.className = `roll ${dir > 0 ? 'is-below' : 'is-above'}`;
    host.appendChild(nd);
    void nd.offsetWidth;
    nd.className = 'roll is-in';
    old.forEach((o) => {
      o.className = `roll ${dir > 0 ? 'is-above' : 'is-below'}`;
      setTimeout(() => o.remove(), 520);
    });
  }

  // ------------------------------------------------------------ per frame
  const cap = { idx: -1, v: -1, text: '', x: 0, y: 0, w: 0, ok: false };
  const pin = { text: '', x: 0, y: 0, ok: false, h: 0 };
  const arr = { y: 0, ok: false };
  let slotsX = null;
  let W = innerWidth, H = innerHeight;
  let pillTop = H - BAND_H - 72;
  let sideShown = -1;

  // measures that depend on the layout (after fonts and on resize)
  function measure(info) {
    W = innerWidth;
    H = innerHeight;
    slotsX = info && info.slots ? info.slots.map((s) => s.x) : null;
    cap.w = capEl.querySelector('.roll.is-in')?.offsetWidth || cap.w;
    pin.h = pinfoEl.offsetHeight;
    pillTop = dispoEl.offsetTop || pillTop; // (cached: a layout read every frame would force a reflow)
  }

  // st: director state; an: world.anchors(); d: the director; o.instant: no smoothing, no CSS
  function update(st, an, d, o = {}) {
    const instant = !!o.instant;
    const dt = o.dt || 1 / 60;
    W = innerWidth;
    H = innerHeight;
    const view = st.view;
    const mode = d.mode();

    // ---------------------------------------------------- layers
    const kRack = 1 - smooth(0, 0.42, view);
    const kProd = smooth(0.6, 1, view);
    top.s('opacity', f3(kRack));
    top.s('transform', kRack < 1 ? `translate3d(0,${f1(-8 * (1 - kRack))}px,0)` : 'none');
    top.t('is-live', mode === 'rack');
    rack.s('opacity', f3(kRack));
    rack.t('is-live', mode === 'rack');
    close.s('opacity', f3(kProd));
    close.s('transform', kProd < 1 ? `translate3d(0,${f1(-8 * (1 - kProd))}px,0)` : 'none');
    // (v2, ux review: live from the last part of the opening, where the product UI is already
    // on screen; main.js keeps the action and runs it once the view has landed)
    const live = mode === 'product' || (mode === 'opening' && view > 0.8);
    close.t('is-live', live);
    prod.s('opacity', f3(kProd));
    prod.t('is-live', live);
    // the toast moves above the hanger hook in the product view (style.css)
    docT('in-product', view > 0.5);
    rack.t('is-gone', kRack <= 0.001);
    prod.t('is-gone', kProd <= 0.001);
    top.t('is-gone', kRack <= 0.001);
    close.t('is-gone', kProd <= 0.001);

    // ---------------------------------------------------- rack caption
    {
      const idx = d.captionIndex;
      const v = st.colors[idx];
      if (idx !== cap.idx || v !== cap.v) {
        const dir = cap.idx < 0 || idx === cap.idx ? 1 : idx > cap.idx ? 1 : -1;
        cap.text = captionOf(idx, v);
        roll(capEl, cap.text, dir, instant || cap.idx < 0);
        cap.idx = idx;
        cap.v = v;
        cap.w = capEl.querySelector('.roll.is-in')?.offsetWidth || cap.w;
      }
      // under the focused garment's hem; when nothing is focused it stays under the last one
      const a = an && an.caption;
      if (a && Number.isFinite(a.x) && Number.isFinite(a.y) && (st.focus >= 0 || !cap.ok) && view < 0.5) {
        const tx = st.focus >= 0 || !slotsX ? a.x : slotsX[idx] ?? a.x;
        const first = !cap.ok || instant;
        cap.x = first ? tx : approach(cap.x, tx, dt, 0.07);
        cap.y = first ? a.y : approach(cap.y, a.y, dt, 0.1);
        cap.ok = true;
      }
      if (cap.ok) {
        const half = Math.max(60, cap.w / 2);
        const x = clamp(cap.x, 18 + half, W - 18 - half);
        // never on the « VOIR LA DISPO » pill
        const y = Math.min(cap.y, pillTop - 34);
        capS('transform', `translate3d(${f1(x)}px,${f1(y)}px,0)`);
      }
    }

    // ---------------------------------------------------- product: title, toggle, link
    {
      const sw = st.swap;
      const show = d.swapping ? (sw.k < 0.5 ? sw.from : sw.to) : st.active;
      const text = titleOf(show);
      if (text !== pin.text) {
        roll(titleEl, text, d.swapping ? sw.dir : 1, instant || !pin.text || view < 0.5);
        pin.text = text;
      }
      const a = an && an.title;
      if (a && Number.isFinite(a.x) && Number.isFinite(a.y)) {
        const first = !pin.ok || instant || view < 0.6;
        pin.x = first ? a.x : approach(pin.x, a.x, dt, 0.08);
        pin.y = first ? a.y : approach(pin.y, a.y, dt, 0.12);
        pin.ok = true;
      }
      if (pin.ok) {
        // the stack stays above the band, whatever the window height
        const y = Math.min(pin.y, H - BAND_H - 16 - (pin.h || 96));
        const rise = (1 - kProd) * 14;
        pinfoS('transform', `translate3d(${f1(pin.x)}px,${f1(y + rise)}px,0)`);
      }
      const side = d.sideTarget >= 0.5 ? 1 : 0;
      toggleT('is-back', side === 1);
      if (side !== sideShown) {
        sideShown = side;
        segs.forEach((b, i) => b.setAttribute('aria-pressed', String(side === i)));
      }
    }

    // ---------------------------------------------------- arrows: near the edges, at the garment's
    // vertical centre
    {
      const a = an && an.arrows;
      if (a && a.left && Number.isFinite(a.left.y)) {
        const ty = (a.left.y + (a.right ? a.right.y : a.left.y)) / 2;
        arr.y = !arr.ok || instant || view < 0.6 ? ty : approach(arr.y, ty, dt, 0.12);
        arr.ok = true;
      }
      const mx = clamp(0.075 * W, 46, 130);
      const y = arr.ok ? arr.y : 0.45 * H;
      const slide = (1 - kProd) * 18;
      prevS('transform', `translate3d(${f1(mx - slide)}px,${f1(y)}px,0)`);
      nextS('transform', `translate3d(${f1(W - mx + slide)}px,${f1(y)}px,0)`);
      // prev / next: the garment leaving passes under the button on its side, which dims while
      // it goes by (still clickable: a press queues the next garment)
      const sw = st.swap;
      const by = d.swapping ? smooth(0.12, 0.28, sw.k) - smooth(0.66, 0.9, sw.k) : 0;
      prevS('opacity', f3(1 - 0.68 * (sw.dir > 0 ? by : 0)));
      nextS('opacity', f3(1 - 0.68 * (sw.dir < 0 ? by : 0)));
    }
  }

  return {
    measure,
    update,
    showToast,
    // screen points the tour aims at (CSS px), from the live DOM
    centerOf(el) {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    els: { close: closeEl, prev: prevEl, next: nextEl, segs, dispo: dispoEl },
  };
}

export const variantCount = (i) => PRODUCTS[i].variants.length;
