// DOM layer, updated every frame from the smoothed scroll position: sections, pinned HUDs, beats,
// log panel, styles tabs and card, repair hotspots, nav and credit colours, sticky bar, toast.
import { clamp, smooth, styler, toggler, f3, f1 } from './util.js';
import { windowRect, surfaceAt, RADIUS, PARALLAX, styleAt } from './layout.js';
import { NNBSP } from './format.js';

export const TOAST = `Démonstration${NNBSP}: Cordeau est une entreprise fictive imaginée par LTNS°.`;

// beat windows, in chapter progress [enter, leave] (the shell's choreography; see README)
export const INSTALL_BEATS = { hero: [-1, 0.08], posts: [0.14, 0.34], rails: [0.38, 0.54], boards: [0.55, 0.69], finale: [0.905, 9] };
export const LOG_IN = 0.05; // the log panel arrives as the hero leaves (« Jour 1 » reads before the posts)
export const LOG_TICKS = [0.09, 0.36, 0.55, 0.8, 0.95]; // each item ticks when its step is done in 3D
export const LOG_DAYS = [[0, 'Jour 1'], [0.15, 'Jour 2'], [0.555, 'Jour 3']];
export const REPAIR_BEATS = { open: [-1, 0.205], step1: [0.235, 0.49], step2: [0.52, 0.68], step3: [0.74, 9] };
export const HOTSPOTS_BEFORE = ['branche', 'poteau', 'penture', 'portillon'];
export const HOTSPOTS_AFTER = ['pentures', 'cable', 'garde'];
export const HOTSPOT_OUT = [0.17, 0.215]; // the « before » dots leave as the repair starts
// each « after » dot arrives as its piece lands in 3D: the gate lifted level (garde, 0.78), the
// strap hinges (pentures, 0.84), the cable and turnbuckle (câble, 0.90)
export const HOTSPOT_AFTER_IN = { garde: 0.78, pentures: 0.84, cable: 0.9 };

// metres of new fence shown in the log: posts, rails and boards weigh 30, 25 and 45 %
export function builtShare(p) {
  const posts = clamp((p - 0.1) / 0.26), rails = clamp((p - 0.36) / 0.19), boards = clamp((p - 0.52) / 0.18);
  return 0.3 * posts + 0.25 * rails + 0.45 * boards;
}

function makeBeat(el, win) {
  const items = [...el.querySelectorAll('.a')].map((it) => ({ el: it, s: styler(it) }));
  return { el, win, items, s: styler(el), t: toggler(el) };
}

// enter: opacity, a small rise and a blur that clears; leave: a small lift and blur
function itemStyle(it, kIn, kOut, mul = 1) {
  let o, ty, b;
  if (kIn < 1) {
    o = kIn;
    ty = (1 - kIn) * 26;
    b = (1 - kIn) * 9;
  } else {
    o = kOut;
    ty = -(1 - kOut) * 18;
    b = (1 - kOut) * 6;
  }
  it.s('opacity', f3(o * mul));
  it.s('transform', Math.abs(ty) > 0.05 ? `translate3d(0,${f1(ty)}px,0)` : 'none');
  it.s('filter', b > 0.08 ? `blur(${f1(b)}px)` : 'none');
  return o;
}

// x: px into the chapter, A: chapter length px, V: screen height; d* = durations in px
function runBeat(bt, x, A, V, intro = 1, dIn = 0.16, dOut = 0.12, mul = 1) {
  const [a, b] = bt.win;
  const n = bt.items.length;
  const din = dIn * V, sig = 0.05 * V, dout = dOut * V, sigo = 0.025 * V;
  let vis = 0;
  bt.items.forEach((it, j) => {
    let kIn = a < 0 ? 1 : smooth(a * A + j * sig, a * A + j * sig + din, x);
    if (a < 0 && intro < 1) kIn = smooth(0.12 + j * 0.11, 0.62 + j * 0.11, intro * (1.1 + 0.11 * n));
    const off = (n - 1 - j) * sigo;
    const kOut = b > 2 ? 1 : 1 - smooth(b * A - dout - off, b * A - off, x);
    vis = Math.max(vis, itemStyle(it, kIn, kOut, mul) * mul);
  });
  bt.t('is-on', vis > 0.002);
  bt.s('--k', f3(vis));
  return vis;
}

// layout box of an element in the coordinates of an ancestor (transforms ignored)
function boxIn(el, root) {
  let x = 0, y = 0, n = el;
  while (n && n !== root) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent;
  }
  return [x, y, x + el.offsetWidth, y + el.offsetHeight];
}

// sum of offsetTop up to an ancestor
function offsetIn(el, root) {
  let y = 0, n = el;
  while (n && n !== root) {
    y += n.offsetTop;
    n = n.offsetParent;
  }
  return y;
}

export function createUI(handlers) {
  const $ = (id) => document.getElementById(id);
  const doc = document.documentElement;

  // ------------------------------------------------------------ layers
  const hud = { install: $('hud1'), styles: $('hud2'), repair: $('hud4') };
  const hudS = Object.fromEntries(Object.entries(hud).map(([k, el]) => [k, { s: styler(el), t: toggler(el) }]));
  const canvasS = styler($('scene'));

  const secs = ['white', 'intro2', 'pricing', 'intro4', 'final'].map((id) => {
    const el = $(id);
    return { id, el, s: styler(el), t: toggler(el), reveal: [...el.querySelectorAll('.r')].map((r) => ({ el: r, s: styler(r), off: 0 })) };
  });
  const sec = Object.fromEntries(secs.map((x) => [x.id, x]));
  const pin2 = styler($('intro2-pin'));
  const head2 = $('intro2-head');
  const head2S = styler(head2);
  const winS = styler($('window'));
  const finalMark = styler($('final-mark'));

  // ------------------------------------------------------------ chapter 1
  const beats1 = {
    hero: makeBeat($('hero'), INSTALL_BEATS.hero),
    posts: makeBeat($('b-posts'), INSTALL_BEATS.posts),
    rails: makeBeat($('b-rails'), INSTALL_BEATS.rails),
    boards: makeBeat($('b-boards'), INSTALL_BEATS.boards),
    finale: makeBeat($('b-finale'), INSTALL_BEATS.finale),
  };
  const log = $('log');
  const logS = styler(log), logT = toggler(log);
  const logItems = [...document.querySelectorAll('#log-list li')].map((li) => toggler(li));
  const logDay = $('log-day');
  const logN = $('log-n');
  const logTotal = $('log-total');
  const logOfWord = document.querySelector('.log-of').firstChild;
  let dayShown = 'Jour 1';
  let nShown = -1;
  let total = 77;

  // ------------------------------------------------------------ chapter 2
  const head = { el: $('styles-head') };
  const headBeat = makeBeat(head.el, [0, 9]);
  const card = $('card');
  const cardBeat = { el: card, win: [0, 9], items: [{ el: card, s: styler(card) }], s: styler(card), t: toggler(card) };
  const tabs = [...document.querySelectorAll('#tabs .tab')];
  const facesBox = $('faces');
  const faces = [...facesBox.querySelectorAll('.face')];
  let faceH = faces.map(() => 0);
  let activeType = 0;

  // ------------------------------------------------------------ chapter 4
  const beats4 = {
    open: makeBeat($('r-open'), REPAIR_BEATS.open),
    step1: makeBeat($('r-step1'), REPAIR_BEATS.step1),
    step2: makeBeat($('r-step2'), REPAIR_BEATS.step2),
    step3: makeBeat($('r-step3'), REPAIR_BEATS.step3),
  };
  const hs = [...document.querySelectorAll('#hotspots .hs')].map((el) => ({
    el,
    id: el.dataset.id,
    after: el.classList.contains('is-after'),
    s: styler(el),
    t: toggler(el),
    line: styler(el.querySelector('.hs-line')),
    label: el.querySelector('.hs-label'),
    labelS: styler(el.querySelector('.hs-label')),
    w: 180,
  }));

  // ------------------------------------------------------------ chrome
  const nav = $('nav');
  const navT = toggler(nav);
  const links = [...nav.querySelectorAll('.links button')].map((b) => ({ el: b, t: toggler(b) }));
  const stickyEl = $('sticky');
  const sticky = toggler(stickyEl);
  const credit = toggler($('credit'));
  const toast = $('toast');
  let toastTimer = 0;

  function showToast() {
    toast.textContent = TOAST;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 3600);
  }

  // ------------------------------------------------------------ events
  document.querySelectorAll('.cta').forEach((b) => b.addEventListener('click', showToast));
  $('play-install').addEventListener('click', () => handlers.onPlay('install'));
  $('play-repair').addEventListener('click', () => handlers.onPlay('repair'));
  tabs.forEach((t) => t.addEventListener('click', () => handlers.onType(+t.dataset.i)));
  $('price-this').addEventListener('click', () => handlers.onPriceThis(activeType));
  $('see-prices').addEventListener('click', () => handlers.onGo('pricing'));
  nav.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => handlers.onGo(b.dataset.go)));
  $('logo').addEventListener('click', () => handlers.onGo('top'));
  $('replay').addEventListener('click', () => handlers.onGo('top'));
  // buttons never keep the keyboard focus after a click: arrows and space stay with the page
  // (delegated: the estimator re-creates its height chips)
  document.addEventListener('pointerup', (e) => {
    const b = e.target && e.target.closest ? e.target.closest('button') : null;
    if (b) setTimeout(() => b.blur(), 0);
  });

  let L = null;
  // measures that depend on the layout (call after fonts and on resize)
  function measure(layout) {
    L = layout;
    for (const x of secs) for (const r of x.reveal) r.off = offsetIn(r.el, x.el);
    // the intro2 title lives in the pinned screen: its offset is inside that screen
    for (const r of sec.intro2.reveal) r.off = offsetIn(r.el, $('intro2-pin'));
    for (const h of hs) h.w = h.label.offsetWidth || h.w;
    // the card follows the height of the shown face
    faceH = faces.map((f) => f.offsetHeight);
    facesBox.style.height = `${faceH[activeType]}px`;
    // text of the chapter 4 beats that the hotspot labels keep clear of: the union of the real
    // text boxes (layout boxes, so the entrance transforms do not matter), in layer coordinates
    for (const k of Object.keys(beats4)) {
      const parts = beats4[k].el.querySelectorAll('.kicker, .ln, .body, .actions > *');
      let r = null;
      for (const el of parts) {
        const b = boxIn(el, hud.repair);
        r = r ? [Math.min(r[0], b[0]), Math.min(r[1], b[1]), Math.max(r[2], b[2]), Math.max(r[3], b[3])] : b;
      }
      beats4[k].rect = r;
    }
  }

  function setTotal(m) {
    total = Math.round(m);
    logTotal.textContent = `${total}${NNBSP}m`; // (sans serif: the plain U+202F is wide enough)
  }

  function setDay(text, instant) {
    if (text === dayShown) return;
    const up = LOG_DAYS.findIndex((d) => d[1] === text) > LOG_DAYS.findIndex((d) => d[1] === dayShown);
    dayShown = text;
    const old = [...logDay.querySelectorAll('.roll')];
    const nd = document.createElement('span');
    nd.textContent = text;
    if (instant) {
      old.forEach((o) => o.remove());
      nd.className = 'roll is-in';
      logDay.appendChild(nd);
      return;
    }
    nd.className = `roll ${up ? 'is-below' : 'is-above'}`;
    logDay.appendChild(nd);
    void nd.offsetWidth;
    nd.className = 'roll is-in';
    old.forEach((o) => {
      o.className = `roll ${up ? 'is-above' : 'is-below'}`;
      setTimeout(() => o.remove(), 560);
    });
  }

  function setActiveType(i) {
    if (i === activeType) return;
    activeType = i;
    tabs.forEach((t, k) => {
      t.classList.toggle('is-active', k === i);
      t.setAttribute('aria-selected', String(k === i));
    });
    faces.forEach((f, k) => f.classList.toggle('is-on', k === i));
    if (faceH[i]) facesBox.style.height = `${faceH[i]}px`;
  }

  // ---------------------------------------------------------------- per frame
  // y: smoothed scroll px; sc: layout.sceneAt(y); anchors: world.anchors() or null;
  // intro: 0..1 entrance of the hero after the loader; instant: no CSS-driven animation (stills)
  function update(y, sc, anchors, { intro = 1, instant = false } = {}) {
    const { V, W } = L;

    // the 3D layer (canvas + the active chapter's HUD) and its parallax under sliding sections
    const shift = `translate3d(0,${f1(sc.shift)}px,0)`;
    // under a section sliding up, the top of the HUD (log, styles title, hotspots) fades out
    // before it can reach the nav
    const outPx = sc.shift < 0 ? -sc.shift / PARALLAX : 0;
    const topK = 1 - smooth(0.04 * V, 0.3 * V, outPx);
    canvasS('transform', sc.shift ? shift : 'none');
    for (const k of Object.keys(hud)) {
      const on = sc.seg === k;
      hudS[k].t('is-on', on);
      if (on) hudS[k].s('transform', sc.shift ? shift : 'none');
    }

    // ------------------------------------------------------ sections
    const tops = { white: L.whiteTop, intro2: L.intro2Top, pricing: L.pricingTop, intro4: L.intro4Top, final: L.finalTop };
    const hs_ = { white: L.whiteH, intro2: V + L.E, pricing: L.pricingH, intro4: L.intro4H, final: L.finalH };
    for (const x of secs) {
      const vt = tops[x.id] - y;
      const on = vt < V + 60 && vt + hs_[x.id] > -60;
      x.t('is-on', on);
      if (!on) continue;
      x.s('transform', `translate3d(0,${f1(vt)}px,0)`);
      if (x.el.classList.contains('slide-over')) x.s('--rt', `${f1(RADIUS * smooth(0, 0.3 * V, vt))}px`);
      const base = x.id === 'intro2' ? vt + clamp(y - L.intro2Top, 0, L.E) : vt;
      for (const r of x.reveal) {
        const top = base + r.off;
        const rv = smooth(0.96 * V, 0.72 * V, top);
        r.s('--rv', f3(rv));
      }
    }
    // chapter 2 intro: the pinned screen, the title leaving, the window growing to full bleed
    {
      const pinY = clamp(y - L.intro2Top, 0, L.E);
      pin2('transform', `translate3d(0,${f1(pinY)}px,0)`);
      const e = sc.e;
      const r = windowRect(L, e);
      winS('left', `${f1(r.x)}px`);
      winS('top', `${f1(r.y)}px`);
      winS('width', `${f1(r.w)}px`);
      winS('height', `${f1(r.h)}px`);
      winS('borderRadius', `${f1(r.r)}px`);
      winS('opacity', e >= 1 ? '0' : '1');
      const out = smooth(0, 0.5, e);
      head2S('opacity', f3(1 - out));
      head2S('transform', out > 0.001 ? `translate3d(0,${f1(-60 * out)}px,0)` : 'none');
    }
    // final section: the string line draws itself as the section arrives
    finalMark('--draw', f1(620 * smooth(0.18 * V, 0.86 * V, L.finalTop - y)));

    // ------------------------------------------------------ chapter 1
    if (sc.seg === 'install') {
      const p = sc.install;
      const x = y; // px into the chapter
      for (const k of Object.keys(beats1)) runBeat(beats1[k], x, L.A1, V, k === 'hero' ? intro : 1);
      // log panel: arrives as the hero leaves, stays to the end of the chapter
      const kIn = smooth(LOG_IN * L.A1, LOG_IN * L.A1 + 0.18 * V, x);
      logT('is-on', kIn * topK > 0.002);
      logS('opacity', f3(kIn * topK));
      logS('transform', kIn < 1 ? `translate3d(${f1(-16 * (1 - kIn))}px,0,0)` : 'none');
      logS('filter', kIn < 0.99 ? `blur(${f1(6 * (1 - kIn))}px)` : 'none');
      let day = LOG_DAYS[0][1];
      for (const [at, d] of LOG_DAYS) if (p >= at) day = d;
      setDay(day, instant);
      const n = Math.round(total * builtShare(p));
      if (n !== nShown) {
        nShown = n;
        logN.innerHTML = `${n}<span class="ns">${NNBSP}</span>m`;
        logOfWord.textContent = n < 2 ? 'posé sur ' : 'posés sur ';
      }
      LOG_TICKS.forEach((at, i) => logItems[i]('is-done', p >= at));
    }

    // ------------------------------------------------------ chapter 2
    if (sc.seg === 'styles') {
      const x = y - L.s0;
      runBeat(headBeat, x, L.A2, V, 1, 0.14, 0.12, topK);
      runBeat(cardBeat, x - 0.06 * V, L.A2, V, 1, 0.16);
      const st = sc.style;
      setActiveType(st.k >= 0.5 ? st.to : st.from);
    } else if (instant) {
      const st = styleAt((y - L.s0) / L.A2);
      setActiveType(st.k >= 0.5 ? st.to : st.from);
    }

    // ------------------------------------------------------ chapter 4
    if (sc.seg === 'repair') {
      const x = y - L.r0;
      for (const k of Object.keys(beats4)) {
        const bt = beats4[k];
        // the opening beat comes in with the reveal of the storm view (x < 0 while intro4 slides up)
        if (k === 'open') bt.vis = runBeatOpen(bt, x, L.A4, V);
        else bt.vis = runBeat(bt, x, L.A4, V, 1, 0.13, 0.11);
      }
      placeHotspots(x, anchors, topK);
    }

    // ------------------------------------------------------ nav, links, credit, sticky
    const mid = surfaceAt(L, y, 38);
    const top = surfaceAt(L, y, 2), bot = surfaceAt(L, y, 74);
    navT('on-light', mid === 'light');
    navT('on-dark', mid === 'dark');
    navT('on-3d', mid === '3d');
    navT('is-solid', mid !== '3d' && top === mid && bot === mid);
    const here = y < L.intro2Top - 0.5 * V ? 0 : y < L.pricingTop - 0.5 * V ? 1 : y < L.intro4Top - 0.5 * V ? 2 : y < L.finalTop - 0.5 * V ? 3 : -1;
    links.forEach((l, i) => l.t('is-here', i === here));
    credit('on-light', surfaceAt(L, y, V - 24) === 'light');
    const pv = L.pricingTop - y;
    const overPricing = pv < V - 30 && pv + L.pricingH > V - 96;
    sticky('is-on', y > 0.06 * L.A1 && !overPricing);
    sticky('on-light', surfaceAt(L, y, V - 50) === 'light');
  }

  function runBeatOpen(bt, x, A, V) {
    // enter during the last part of the reveal (x < 0 while intro4 slides up)
    const n = bt.items.length;
    let vis = 0;
    bt.items.forEach((it, j) => {
      const kIn = smooth(-0.5 * V + j * 0.05 * V, -0.32 * V + j * 0.05 * V, x);
      const off = (n - 1 - j) * 0.025 * V;
      const b = REPAIR_BEATS.open[1] * A;
      const kOut = 1 - smooth(b - 0.11 * V - off, b - off, x);
      vis = Math.max(vis, itemStyle(it, kIn, kOut));
    });
    bt.t('is-on', vis > 0.002);
    bt.s('--k', f3(vis));
    return vis;
  }

  const byId = {};
  function placeHotspots(x, anchors, topK = 1) {
    const { V, W, A4 } = L;
    for (const k in byId) delete byId[k];
    if (anchors) for (const a of anchors) byId[a.id] = a;
    const live = [];
    for (const h of hs) {
      let a;
      if (!h.after) {
        const j = HOTSPOTS_BEFORE.indexOf(h.id);
        a = smooth(-0.42 * V + j * 0.05 * V, -0.22 * V + j * 0.05 * V, x) * (1 - smooth(HOTSPOT_OUT[0] * A4, HOTSPOT_OUT[1] * A4, x));
      } else {
        const at = (HOTSPOT_AFTER_IN[h.id] ?? 0.86) * A4;
        a = smooth(at, at + 0.1 * V, x);
      }
      const an = byId[h.id];
      if (!an || !an.visible) a = 0;
      a *= topK;
      let side = 1;
      if (a > 0.002) {
        // never over the text of a beat on screen: flip the label, or leave this hotspot out
        side = an.x > 0.62 * W ? -1 : 1;
        if (hitsText(an.x, an.y, -1, 0) || (hitsText(an.x, an.y, side, h.w) && hitsText(an.x, an.y, (side = -side), h.w))) a = 0;
        if (an.x + 34 + h.w > W - 12 && side > 0) side = -1;
        if (an.x - 34 - h.w < 12 && side < 0) side = 1;
      }
      h.t('is-on', a > 0.002);
      if (a <= 0.002) continue;
      live.push({ h, a, x: an.x, y: an.y, side, dy: 0 });
    }
    // keep the labels apart: push a label down when it would sit on the one above it
    live.sort((p, q) => p.y - q.y);
    for (let i = 0; i < live.length; i++) {
      for (let j = 0; j < i; j++) {
        const p = live[j], q = live[i];
        const px0 = p.side > 0 ? p.x + 34 : p.x - 34 - p.h.w, px1 = px0 + p.h.w;
        const qx0 = q.side > 0 ? q.x + 34 : q.x - 34 - q.h.w, qx1 = qx0 + q.h.w;
        if (Math.min(px1, qx1) - Math.max(px0, qx0) <= 0) continue;
        const gap = q.y + q.dy - (p.y + p.dy);
        if (gap < 40) q.dy += 40 - gap;
      }
    }
    for (const l of live) {
      const { h, a, side, dy } = l;
      h.s('opacity', f3(a));
      h.s('transform', `translate3d(${f1(l.x)}px,${f1(l.y + (1 - a) * 8)}px,0)`);
      const dx = side * 25, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
      h.line('left', `${side * 9}px`);
      h.line('width', `${f1(len)}px`);
      h.line('transform', `rotate(${ang.toFixed(4)}rad)`);
      h.labelS('left', side > 0 ? '34px' : `${f1(-34 - h.w)}px`);
      h.labelS('top', `${f1(dy - 16)}px`);
    }
  }

  // does a hotspot (its dot when w = 0, else its label on that side) touch a visible beat's text?
  function hitsText(x, y, side, w) {
    const box = w === 0 ? [x - 14, y - 14, x + 14, y + 14] : side > 0 ? [x + 30, y - 18, x + 38 + w, y + 18] : [x - 38 - w, y - 18, x - 30, y + 18];
    for (const k of Object.keys(beats4)) {
      const bt = beats4[k];
      if (!bt.rect || !(bt.vis > 0.05)) continue;
      const r = bt.rect;
      if (box[0] < r[2] + 16 && box[2] > r[0] - 16 && box[1] < r[3] + 12 && box[3] > r[1] - 12) return true;
    }
    return false;
  }

  return { measure, update, setTotal, showToast, get activeType() { return activeType; } };
}
