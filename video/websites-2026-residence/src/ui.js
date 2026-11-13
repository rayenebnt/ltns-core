// ALTIÈRE page UI: every text from texts.js, the header (tone, current chapter), the text beats over
// the 3D (opacity, drift, the 4 Hz word reveal from story.js BEATS), the floor counter of the works,
// the floor plan of level 07 (an SVG in the tower's own metres, mapped onto the 3D floor plate by
// world.anchors().plan), the progress rail, the « Rendez-vous » section (slide, headline reveal, the
// option ticket: checks then the stamp) and the toast.
import { CHAPTERS, BEATS as WIN, TONE, PHASES, within, chapterAt } from './story.js';
import * as T from './texts.js';
import { createTick } from './tick.js';
import { clamp, mix, smooth, chase, styler, toggler, easeOut3 } from './util.js';

const $ = (id) => document.getElementById(id);
const SVGNS = 'http://www.w3.org/2000/svg';
const win = Object.fromEntries(WIN.map((b) => [b.id, b.win]));
// the stations of the rail and the nav: the five chapters of the story
export const STATIONS = CHAPTERS.filter((c) => c.id !== 'rendezvous');
// world.anchors() is only needed for the plan
export const needAnchors = (p) => p > PHASES.plan[0] + 0.02;

// every [data-t] element gets its text from texts.js (also the loader and the no-WebGL message,
// before anything else runs)
export function fillTexts() {
  const map = {
    'brand.name': T.BRAND.name,
    'brand.tagline': T.BRAND.tagline,
    cta: T.CTA,
    credit: T.CREDIT,
    'nogl.0': T.NOGL[0],
    'nogl.1': T.NOGL[1],
  };
  for (const [id, b] of Object.entries(T.BEATS)) {
    for (const [k, v] of Object.entries(b)) if (typeof v === 'string') map[`${id}.${k}`] = v;
  }
  document.querySelectorAll('[data-t]').forEach((el) => {
    const v = map[el.dataset.t];
    if (v !== undefined) el.textContent = v;
  });
  document.title = T.TITLE;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', T.META_DESCRIPTION);
}

// the fastest a headline may tick in (or out), whatever the scroll speed: its natural duration
// (one word per 125 ms), so a flick still shows it word by word
const revealRate = (tk) => 1 / Math.max(0.3, tk.dur);
const TICKET_RATE = 1 / 1.9; // the ticket (six checks, then the stamp) never plays faster than 1.9 s
const FLOORS = 26;

export function createUI(h) {
  const doc = document.documentElement;
  const docT = toggler(doc);

  // ------------------------------------------------------------------ header
  const nav = $('nav');
  const navLinks = T.NAV.map((n) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nav-link';
    b.dataset.id = n.id;
    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = n.num;
    const lab = document.createElement('span');
    lab.className = 'lab';
    lab.textContent = n.label;
    b.append(num, document.createTextNode(' '), lab);
    b.addEventListener('click', () => h.onNav(n.id));
    nav.appendChild(b);
    return { id: n.id, t: toggler(b) };
  });
  $('brand').addEventListener('click', (e) => {
    e.preventDefault();
    h.onTop();
  });

  // ------------------------------------------------------------------ beats
  const beat = (id, lines) => {
    const el = $(`b-${id}`);
    const title = lines ? createTick($(`t-${id}`), lines) : null;
    return { id, el, s: styler(el), t: toggler(el), title, rv: 0, w: win[id], dy: 0 };
  };
  const beats = ['hero', 'ciel', 'baie', 'chantier', 'tour', 'explorer', 'plan'].map((id) => beat(id, T.BEATS[id].title));
  const B = Object.fromEntries(beats.map((b) => [b.id, b]));
  const hint = { el: $('hint'), s: styler($('hint')) };
  const headscrim = styler($('headscrim'));
  const creditEl = $('credit');
  const credit = styler(creditEl);
  const creditT = toggler(creditEl);
  const fCredit = document.querySelector('#final .f-credit');
  const heroParts = ['.kicker', '.lead'].map((q) => styler(B.hero.el.querySelector(q)));

  // « Pourquoi ici ? »: three points, each with its small line icon
  const points = T.BEATS.baie.points.map((pt) => {
    const li = document.createElement('li');
    li.className = 'point';
    li.innerHTML = `<span class="pt-icon"><svg aria-hidden="true"><use href="#i-${pt.icon}"/></svg></span><p class="pt-title"></p><p class="pt-text"></p>`;
    li.querySelector('.pt-title').textContent = pt.title;
    li.querySelector('.pt-text').textContent = pt.text;
    $('points').appendChild(li);
    return styler(li);
  });
  // the tower in three figures
  const stats = T.BEATS.tour.stats.map(([n, l]) => {
    const d = document.createElement('div');
    d.className = 'stat';
    d.innerHTML = '<b class="stat-n"></b><span class="stat-l"></span>';
    d.querySelector('.stat-n').textContent = n;
    d.querySelector('.stat-l').textContent = l;
    $('stats').appendChild(d);
    return styler(d);
  });
  // the works: the floor counter follows the slabs (the world's construction: story.js PHASES.build)
  const cNum = $('c-num');
  let lastFloor = -1;

  // ------------------------------------------------------------------ the plan of level 07
  const planEl = $('plan');
  const planS = styler(planEl);
  const planT = toggler(planEl);
  const planG = $('plan-g');
  const veilS = styler($('planveil'));
  const card = $('unit-card');
  const cardT = toggler(card);
  const cardS = styler(card);
  const S = T.PLAN_SHAPE;
  const svg = (tag, attrs, parent = planG) => {
    const e = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    parent.appendChild(e);
    return e;
  };
  {
    const defs = svg('defs', {});
    const clip = svg('clipPath', { id: 'plan-clip' }, defs);
    svg('rect', { x: -S.a, y: -S.b, width: 2 * S.a, height: 2 * S.b, rx: S.r, ry: S.r }, clip);
    const hatch = svg('pattern', { id: 'plan-hatch', width: 0.9, height: 0.9, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    svg('line', { x1: 0, y1: 0, x2: 0, y2: 0.9, class: 'hatch' }, hatch);
  }
  // the slab, the hall round the core, the lots, the core, the outline (on top)
  svg('rect', { x: -S.a, y: -S.b, width: 2 * S.a, height: 2 * S.b, rx: S.r, ry: S.r, class: 'p-slab' });
  const lotsG = svg('g', { 'clip-path': 'url(#plan-clip)' });
  svg('rect', { x: S.hall[0], y: S.hall[1], width: S.hall[2], height: S.hall[3], class: 'p-hall' }, lotsG);
  const lots = T.UNITS.map((u) => {
    const g = svg('g', { class: `lot is-${u.status}`, 'data-id': u.id }, lotsG);
    svg('polygon', { points: u.poly.map((q) => q.join(',')).join(' '), class: 'lot-fill' }, g);
    // (the label's spot in the lot, clear of the hall: texts.js UNITS at)
    const [cx, cy] = u.at || [u.poly.reduce((s, q) => s + q[0], 0) / u.poly.length, u.poly.reduce((s, q) => s + q[1], 0) / u.poly.length];
    const t1 = svg('text', { x: cx.toFixed(2), y: (cy - 0.2).toFixed(2), class: 'lot-id' }, g);
    t1.textContent = u.id;
    const t2 = svg('text', { x: cx.toFixed(2), y: (cy + 1.4).toFixed(2), class: 'lot-type' }, g);
    t2.textContent = `${u.type} · ${u.area}${T.NN}m²`;
    return { u, g, t: toggler(g) };
  });
  svg('rect', { x: S.core[0], y: S.core[1], width: S.core[2], height: S.core[3], class: 'p-core' });
  svg('rect', { x: -S.a, y: -S.b, width: 2 * S.a, height: 2 * S.b, rx: S.r, ry: S.r, class: 'p-outline' });
  // the list and the legend, at the left
  const listItems = T.UNITS.map((u) => {
    const li = document.createElement('li');
    li.className = `unit is-${u.status}`;
    li.tabIndex = -1;
    li.innerHTML = '<i class="u-dot"></i><b class="u-id"></b><span class="u-type"></span><span class="u-area"></span><span class="u-st"></span>';
    li.querySelector('.u-id').textContent = u.id;
    li.querySelector('.u-type').textContent = u.type;
    li.querySelector('.u-area').textContent = `${u.area}${T.NN}m²`;
    li.querySelector('.u-st').textContent = T.BEATS.plan.legend[u.status];
    $('units').appendChild(li);
    return { u, li, t: toggler(li) };
  });
  $('legend').innerHTML = Object.entries(T.BEATS.plan.legend).map(([k, v]) => `<span class="lg is-${k}"><i></i>${v}</span>`).join('');
  // hover (the plan or the list) → the lot lights up in both, with its card
  let hot = null;
  function setHot(id, at) {
    hot = id;
    lots.forEach((l) => l.t('is-hot', l.u.id === id));
    listItems.forEach((l) => l.t('is-hot', l.u.id === id));
    const u = T.UNITS.find((x) => x.id === id);
    if (!u) {
      cardT('is-on', false);
      return;
    }
    card.innerHTML = `<p class="uc-head"><b>${u.id}</b><span>${T.BEATS.plan.legend[u.status]}</span></p><p class="uc-type">${u.type} · ${u.area}${T.NN}m²</p><p class="uc-line">Terrasse ${u.terrace}${T.NN}m²</p><p class="uc-line">${u.view}</p>`;
    card.className = `unit-card is-${u.status} is-on`;
    if (at) {
      cardS('left', `${Math.round(at.x + 18)}px`);
      cardS('top', `${Math.round(at.y + 14)}px`);
    }
  }
  lots.forEach((l) => {
    l.g.addEventListener('pointerenter', (e) => setHot(l.u.id, { x: e.clientX, y: e.clientY }));
    l.g.addEventListener('pointermove', (e) => setHot(l.u.id, { x: e.clientX, y: e.clientY }));
    l.g.addEventListener('pointerleave', () => setHot(null));
  });
  listItems.forEach((l) => {
    l.li.addEventListener('pointerenter', () => {
      const r = l.li.getBoundingClientRect();
      setHot(l.u.id, { x: r.right + 8, y: r.top - 14 });
    });
    l.li.addEventListener('pointerleave', () => setHot(null));
  });

  // ------------------------------------------------------------------ rail
  const rail = $('rail');
  rail.innerHTML = '<i class="rail-line"><i class="rail-fill"></i></i><i class="rail-end"></i>';
  const railT = toggler(rail);
  const railFill = styler(rail.querySelector('.rail-fill'));
  const dots = STATIONS.map((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rail-dot';
    b.setAttribute('aria-label', `${c.num} ${c.label}`);
    b.innerHTML = '<span class="rail-label"><b></b></span>';
    b.querySelector('b').textContent = c.num;
    b.querySelector('.rail-label').appendChild(document.createTextNode(c.label));
    b.addEventListener('click', () => h.onNav(c.id));
    rail.appendChild(b);
    return { c, el: b, t: toggler(b), s: styler(b), i };
  });
  const marker = document.createElement('i');
  marker.className = 'rail-marker';
  rail.appendChild(marker);
  const markerS = styler(marker);

  // ------------------------------------------------------------------ final section
  const finalEl = $('final');
  const fin = { s: styler(finalEl), t: toggler(finalEl), title: createTick($('t-final'), T.BEATS.rendezvous.title), rv: 0, tv: 0 };
  $('f-replay').addEventListener('click', () => h.onReplay());
  // the option ticket: six steps, a hand-drawn check each (drawn in order), then the stamp
  const TK = T.BEATS.rendezvous.ticket;
  $('t-ticket-head').textContent = TK.head;
  $('t-ticket-num').textContent = TK.number;
  $('stamp-text').textContent = TK.stamp;
  const CHECKS = [
    'M2.6 13.4c1.9 1.2 3.7 3.4 5.2 6.4 3-7.3 8.4-13.6 16.6-18.2',
    'M2.2 14.2c2.3 1.1 4 3.1 5.6 5.9 2.6-6.8 7.6-12.8 16.2-17.6',
    'M3 12.8c1.6 1.5 3.4 3.8 4.8 6.9 3.4-7.6 8.6-13.2 16.4-17.9',
    'M2.4 13.9c2 1 3.8 3.2 5.3 6.1 2.9-7 8.1-13.1 16.5-17.9',
    'M2.8 13.1c1.8 1.4 3.6 3.6 5 6.6 3.1-7.4 8.4-13.4 16.6-18',
    'M2.3 13.6c2.1 1.2 3.9 3.3 5.5 6.2 2.8-7.1 8-13 16.3-17.8',
  ];
  const steps = TK.steps.map((name, i) => {
    const li = document.createElement('li');
    li.className = 't-step';
    li.innerHTML = `<span class="t-name"></span><i class="t-dots" aria-hidden="true"></i><span class="t-box" aria-hidden="true"><svg class="t-check" viewBox="0 0 28 26"><path pathLength="1" stroke-dasharray="1 1" d="${CHECKS[i % CHECKS.length]}"/></svg></span>`;
    li.querySelector('.t-name').textContent = name;
    $('t-steps').appendChild(li);
    const path = li.querySelector('path');
    return { s: styler(path) };
  });
  const stampS = styler($('stamp'));

  // ------------------------------------------------------------------ toast
  const toast = $('toast');
  let toastTimer = 0;
  function showToast() {
    toast.textContent = T.TOAST;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 3600);
  }
  document.querySelectorAll('.cta').forEach((b) => b.addEventListener('click', showToast));
  // buttons never keep the keyboard focus after a click: the arrows and Espace stay with the page
  document.addEventListener('pointerup', (e) => {
    const b = e.target && e.target.closest ? e.target.closest('button, a') : null;
    if (b) setTimeout(() => b.blur(), 0);
  });

  // ------------------------------------------------------------------ measures
  const M = { W: innerWidth, H: innerHeight, railL: 400, railTop: 112, finalH: innerHeight, m: 40, head: 78, railW: 64, titleOff: 200, ticketOff: 300, fcOff: 1e5, creditH: 14, creditB: 22 };
  function measure() {
    M.W = innerWidth;
    M.H = innerHeight;
    M.railL = rail.querySelector('.rail-line').offsetHeight || 400;
    M.railTop = rail.getBoundingClientRect().top;
    M.finalH = Math.max(innerHeight, finalEl.offsetHeight);
    const f0 = finalEl.getBoundingClientRect().top;
    M.titleOff = $('t-final').getBoundingClientRect().top - f0;
    M.ticketOff = $('ticket').getBoundingClientRect().top - f0;
    M.fcOff = fCredit ? fCredit.getBoundingClientRect().top - f0 : 1e5;
    M.creditH = creditEl.offsetHeight || 14;
    M.creditB = parseFloat(getComputedStyle(creditEl).bottom) || 22;
    const cs = getComputedStyle(doc);
    M.m = parseFloat(cs.getPropertyValue('--m')) || 40;
    M.head = parseFloat(cs.getPropertyValue('--head-h')) || 78;
    M.railW = parseFloat(cs.getPropertyValue('--rail-w')) || 64;
    dots.forEach((d) => d.s('top', `${(d.c.from * M.railL).toFixed(1)}px`));
    last.p = -1;
    return M;
  }

  // ------------------------------------------------------------------ per frame
  const last = { p: -1, tone: '', chapter: '' };
  // p: the story progress (smoothed); y, L: the scroll px and the page layout (main.js);
  // an: world.anchors() (or null); o: { dt, intro (0..1, the hero's entrance), instant }
  function update(p, y, L, an, o) {
    const dt = o.instant ? 1 : o.dt;
    const rate = (r) => (o.instant ? 1e9 : r);
    const H = M.H;

    // the final section's top edge (px): the header, the rail and the credit turn dark under it
    const top = H - clamp(y - L.S, 0, L.F);

    // tone and current chapter
    let tone = (TONE.find((t) => p >= t.from && p < t.to) || TONE[TONE.length - 1]).tone;
    // at the end, the header stays light over the night plan until the white section reaches it
    if (tone === 'dark' && p >= TONE[TONE.length - 1].from && top > M.head * 0.5) tone = 'light';
    if (tone !== last.tone) {
      last.tone = tone;
      docT('tone-light', tone === 'light');
    }
    const ch = chapterAt(p).id;
    if (ch !== last.chapter) {
      last.chapter = ch;
      navLinks.forEach((n) => n.t('is-here', n.id === ch));
      dots.forEach((d) => d.t('is-here', d.c.id === ch));
    }
    dots.forEach((d) => d.t('is-past', p >= d.c.from - 1e-4));
    const light = p >= TONE[1].from && p < TONE[2].from;
    // (the credit rides above the rising « Rendez-vous » section, over the canvas: light until the
    // section reaches it under the header, below)
    const c0 = H - M.creditB - M.creditH;
    const cty = Math.max(M.head + 8 - c0, Math.min(0, top - 12 - (H - M.creditB)));
    creditT('is-light', light && top > c0 + cty + M.creditH);
    const railY = M.railTop + clamp(p) * M.railL;
    railT('is-light', light && top > railY);
    // the current chapter's label rests while the plan is up (it would sit on the night beside the
    // plate's list); a visible hover still shows it
    railT('is-veiled', p > PHASES.plan[0] && p < PHASES.planHold[1] && top > H * 0.5);

    // under the header over the 3D: from the bay on, until the white section is about to reach it
    headscrim('opacity', (smooth(0.16, 0.2, p) * (1 - smooth(0.96, 0.975, p))).toFixed(3));

    // rail marker
    markerS('transform', `translate3d(0,${(clamp(p) * M.railL).toFixed(2)}px,0)`);
    railFill('transform', `scaleY(${clamp(p).toFixed(4)})`);

    // beats
    for (const b of beats) {
      const [a, bb, c, d] = b.w;
      const kin = smooth(a, bb, p);
      const kout = c >= 1 ? 0 : smooth(c, d, p);
      let op = kin * (1 - kout);
      let target = within(p, [a, bb]);
      if (b.id === 'hero') {
        op *= o.intro > 0 ? 1 : 0;
        target = clamp(o.intro * 1.6);
      }
      b.rv = chase(b.rv, target, dt, rate(b.title ? revealRate(b.title) : 1e9));
      if (b.title) b.title.set(b.rv);
      const on = op > 0.002;
      b.t('is-on', on);
      if (!on) {
        b.s('opacity', '0');
        continue;
      }
      const dy = (1 - kin) * 24 - kout * 20;
      b.s('opacity', op.toFixed(3));
      if (b.id === 'hero') {
        b.dy = -kout * 30;
        b.s('transform', `translate3d(0, ${b.dy.toFixed(1)}px, 0)`);
      } else b.s('transform', `translate3d(0, calc(-50% + ${dy.toFixed(1)}px), 0)`);
      if (b.id === 'baie') points.forEach((s, i) => s('opacity', smooth(a + 0.008 + i * 0.004, bb + 0.004 + i * 0.004, p).toFixed(3)));
      if (b.id === 'tour') stats.forEach((s, i) => s('opacity', smooth(a + 0.006 + i * 0.003, bb + 0.003 + i * 0.003, p).toFixed(3)));
    }
    // the floor counter: the slabs poured so far (0 → 26)
    {
      const c = smooth(PHASES.build[0], PHASES.build[1], p);
      const k = clamp(Math.floor(c * (FLOORS + 2.0001)), 0, FLOORS);
      if (k !== lastFloor) {
        lastFloor = k;
        cNum.textContent = String(k).padStart(2, '0');
      }
    }
    // the hero's parts follow the entrance, one after the other
    {
      const it = o.intro;
      const part = (k0) => clamp((it - k0) / 0.45);
      heroParts.forEach((s, i) => {
        const k = part([0, 0.5][i]);
        s('opacity', k.toFixed(3));
        s('transform', `translate3d(0, ${((1 - k) * 14).toFixed(1)}px, 0)`);
      });
      const kh = part(0.7) * (1 - smooth(0.004, 0.03, p));
      hint.s('opacity', kh.toFixed(3));
      hint.s('visibility', kh > 0.002 ? 'visible' : 'hidden');
    }

    // the plan: the night round the plate, then the drawing on the plate (once the camera looks
    // straight down) — its matrix maps the tower's metres (x, z) to the window
    {
      veilS('opacity', (0.82 * smooth(0.772, 0.808, p) * clamp(top / H)).toFixed(3));
      const pl = an && an.plan;
      const k = pl ? smooth(0.796, 0.812, p) * clamp(pl.k) : 0;
      const on = k > 0.002 && top > 0;
      planT('is-on', on);
      planS('opacity', k.toFixed(3));
      if (on) planG.setAttribute('transform', `matrix(${pl.ax.toFixed(4)} ${pl.ay.toFixed(4)} ${pl.bx.toFixed(4)} ${pl.by.toFixed(4)} ${pl.ox.toFixed(2)} ${pl.oy.toFixed(2)})`);
      if (!on && hot) setHot(null);
      cardS('opacity', on ? '1' : '0');
    }

    // « Rendez-vous »: slides up over the canvas from STORY_END
    {
      const on = top < H - 0.5;
      fin.t('is-on', on);
      fin.s('transform', `translate3d(0, ${top.toFixed(2)}px, 0)`);
      const tTop = top + M.titleOff, kTop = top + M.ticketOff;
      fin.rv = chase(fin.rv, on ? (top <= 0.4 * H ? 1 : clamp((H - tTop) / (0.25 * H))) : 0, dt, rate(revealRate(fin.title)));
      fin.title.set(fin.rv);
      fin.tv = chase(fin.tv, on ? (top <= 0.4 * H ? 1 : clamp((0.88 * H - kTop) / (0.42 * H))) : 0, dt, rate(TICKET_RATE));
      const tv = fin.tv;
      steps.forEach((st, i) => {
        const k = clamp((tv - i * 0.105) / 0.15);
        st.s('strokeDashoffset', (1 - easeOut3(k)).toFixed(4));
        st.s('opacity', k > 0 ? '1' : '0');
      });
      {
        const ks = clamp((tv - 0.76) / 0.24);
        const sc = ks < 0.55 ? mix(1.8, 0.93, Math.pow(ks / 0.55, 2)) : mix(0.93, 1, easeOut3((ks - 0.55) / 0.45));
        const rot = mix(-19, -8, easeOut3(ks));
        stampS('opacity', clamp(ks / 0.22).toFixed(3));
        stampS('transform', `rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`);
      }
      fin.covered = top <= 0;
      const fcB = top + M.fcOff + M.creditH;
      const cop = clamp((fcB - (H - 18)) / 18);
      credit('transform', cty < -0.01 ? `translate3d(0, ${cty.toFixed(1)}px, 0)` : 'none');
      credit('opacity', cop.toFixed(3));
    }
  }

  return {
    update,
    measure,
    showToast,
    M,
    get covered() {
      return !!fin.covered;
    },
    get ticketDone() {
      return fin.tv >= 1;
    },
    els: { navLinks: () => [...nav.children], dots: () => dots.map((d) => d.el) },
  };
}
