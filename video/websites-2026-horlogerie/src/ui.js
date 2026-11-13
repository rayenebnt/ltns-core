// BALANCIER page UI: every text from texts.js, the header (tone, current chapter), the text beats
// over the 3D (opacity, drift, the 4 Hz word reveal from story.js BEATS), the part labels of the
// exploded line (world.anchors().labels), the progress rail with its ruby jewel, the « Rendez-vous »
// section (slide, headline reveal, the atelier ticket: checks then the stamp) and the toast.
import { CHAPTERS, BEATS as WIN, TONE, PHASES, within, chapterAt } from './story.js';
import * as T from './texts.js';
import { createTick } from './tick.js';
import { clamp, mix, smooth, chase, styler, toggler, easeOut3 } from './util.js';

const $ = (id) => document.getElementById(id);
const win = Object.fromEntries(WIN.map((b) => [b.id, b.win]));
// the stations of the rail and the nav: the five chapters of the story
export const STATIONS = CHAPTERS.filter((c) => c.id !== 'rendezvous');
// the part ids in line order (texts.js PARTS keys = src/world/layout.js PARTS ids)
const PART_IDS = Object.keys(T.PARTS);
// when the shell needs world.anchors(): the labels, the Transparence block, the tide's line (the
// credit's and the rail's tone)
const near = (p, w, m = 0.006) => p > w[0] - m && p < w[3] + m;
export const needAnchors = (p) =>
  near(p, win.labels) || near(p, win.sapphireLabels) || near(p, win.transparence) || (p > PHASES.tide[0] - 0.006 && p < PHASES.tide[1] + 0.006);

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
const hit = (a, b, m = 0) => a.l < b.r + m && a.r > b.l - m && a.t < b.b + m && a.b > b.t - m;

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
  const beats = ['hero', 'remontage', 'coeur', 'reglee', 'atelier', 'transparence', 'restauration'].map((id) => beat(id, T.BEATS[id].title));
  const B = Object.fromEntries(beats.map((b) => [b.id, b]));
  // the Transparence block scales on an inner wrapper (see style.css .tr-in)
  const trIn = document.createElement('div');
  trIn.className = 'tr-in';
  trIn.append(...B.transparence.el.childNodes);
  B.transparence.el.appendChild(trIn);
  const trInS = styler(trIn);
  const hint = { el: $('hint'), s: styler($('hint')) };
  const headscrim = styler($('headscrim'));
  const creditEl = $('credit');
  const credit = styler(creditEl);
  const creditT = toggler(creditEl);
  // the section's own credit, in its footer (the same text): the fixed one hands over to it
  const fCredit = document.querySelector('#final .f-credit');
  const heroParts = ['.kicker', '.lead'].map((q) => styler(B.hero.el.querySelector(q)));

  // L’atelier: the three commitments, each with its small line icon
  const points = T.BEATS.atelier.points.map((pt) => {
    const li = document.createElement('li');
    li.className = 'point';
    li.innerHTML = `<span class="pt-icon"><svg aria-hidden="true"><use href="#i-${pt.icon}"/></svg></span><p class="pt-title"></p><p class="pt-text"></p>`;
    li.querySelector('.pt-title').textContent = pt.title;
    li.querySelector('.pt-text').textContent = pt.text;
    $('points').appendChild(li);
    return styler(li);
  });
  // Restauration: three small dark-blue cards
  const cards = T.BEATS.restauration.cards.map((c) => {
    const d = document.createElement('div');
    d.className = 'card';
    d.innerHTML = '<p class="card-title"></p><p class="card-text"></p>';
    d.querySelector('.card-title').textContent = c.title;
    d.querySelector('.card-text').textContent = c.text;
    $('cards').appendChild(d);
    return styler(d);
  });

  // ------------------------------------------------------------------ part labels
  const plWrap = $('plabels');
  const plS = styler(plWrap);
  const plT = toggler(plWrap);
  const labels = PART_IDS.map((id, i) => {
    const el = document.createElement('div');
    el.className = 'pl';
    el.dataset.id = id;
    el.innerHTML = '<i class="pl-lead"></i><i class="pl-dot"></i><span class="pl-box"><b class="pl-num"></b><span class="pl-name"></span></span>';
    el.querySelector('.pl-num').textContent = String(i + 1).padStart(2, '0');
    el.querySelector('.pl-name').textContent = T.PARTS[id];
    plWrap.appendChild(el);
    const box = el.querySelector('.pl-box');
    return { id, i, el, box, s: styler(el), bs: styler(box), ls: styler(el.querySelector('.pl-lead')), ds: styler(el.querySelector('.pl-dot')), w: 90, h: 16, vis: 0, choice: null, placed: false };
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
  // the atelier ticket: six steps, a hand-drawn check each (drawn in order), then the ruby stamp
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
  const M = { W: innerWidth, H: innerHeight, railL: 400, railTop: 112, finalH: innerHeight, m: 40, head: 78, railW: 64, titleOff: 200, ticketOff: 300, fcOff: 1e5, creditH: 14, creditB: 22, creditR: null, hero: [], hintR: null, trW: 600, trH: 200 };
  const rectOf = (r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom });
  const textRect = (el) => {
    const rg = document.createRange();
    rg.selectNodeContents(el);
    return rectOf(rg.getBoundingClientRect());
  };
  function measure() {
    M.W = innerWidth;
    M.H = innerHeight;
    M.railL = rail.querySelector('.rail-line').offsetHeight || 400;
    M.railTop = rail.getBoundingClientRect().top;
    M.finalH = Math.max(innerHeight, finalEl.offsetHeight);
    // where the headline and the ticket sit inside the section (its slide moves them together)
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
    // the hero's text (the labels keep clear of it): the kicker and the lead as text, the headline
    // word by word (the masks: never transformed), without the hero's own drift
    const dy = B.hero.dy;
    const hr = [textRect(B.hero.el.querySelector('.kicker')), textRect(B.hero.el.querySelector('.lead')), ...[...B.hero.el.querySelectorAll('.w')].map((w) => rectOf(w.getBoundingClientRect()))];
    M.hero = hr.map((r) => ({ l: r.l, r: r.r, t: r.t - dy, b: r.b - dy }));
    M.hintR = rectOf(hint.el.getBoundingClientRect());
    const cr = creditEl.getBoundingClientRect();
    M.creditR = { l: cr.left, r: cr.right, t: M.H - M.creditB - M.creditH, b: M.H - M.creditB };
    M.trW = B.transparence.el.offsetWidth || 600;
    M.trH = B.transparence.el.offsetHeight || 200;
    for (const lb of labels) {
      lb.w = lb.box.offsetWidth || 90;
      lb.h = lb.box.offsetHeight || 16;
    }
    dots.forEach((d) => d.s('top', `${(d.c.from * M.railL).toFixed(1)}px`));
    last.p = -1;
    return M;
  }

  // ------------------------------------------------------------------ the part labels' layout
  // Each label sits beyond its anchor (the part's top edge for 'above', its bottom edge for 'below'),
  // clear of the local skyline of the parts (anchors' boxes), of the other labels and their leaders,
  // of the header, the hero text, the Transparence block, the hint and the credit, inside the
  // window. Candidates: its own side then the other one, three rows each; the previous choice is
  // tried first (no flicker); none fits: it fades out where it is.
  const GAP = 16;
  function layoutLabels(list, k, dt, rate, forbid, light, o) {
    plT('is-on', k > 0.002);
    plS('opacity', k > 0.002 ? '1' : '0');
    plT('is-light', light);
    if (k <= 0.002) {
      for (const lb of labels) {
        lb.vis = 0;
        lb.placed = false;
        lb.s('opacity', '0');
      }
      return;
    }
    const W = M.W, H = M.H;
    const safe = { l: Math.max(8, M.m * 0.5), t: M.head + 6, r: W - M.railW - Math.max(8, M.m * 0.35), b: H - 44 };
    const byId = {};
    if (list) for (const a of list) if (a && a.id) byId[a.id] = a;
    const boxes = [];
    if (list) for (const a of list) if (a && a.visible && a.box && Number.isFinite(a.box.x)) boxes.push({ l: a.box.x, t: a.box.y, r: a.box.x + a.box.w, b: a.box.y + a.box.h });
    const placedR = [], placedL = [];
    const picks = new Array(labels.length).fill(null);
    const oks = labels.map((lb) => {
      const a = byId[lb.id];
      return !!(a && a.visible && Number.isFinite(a.x) && Number.isFinite(a.y) && a.x > safe.l - 40 && a.x < safe.r + 40 && a.y > safe.t - 40 && a.y < safe.b + 40);
    });
    function tryPlace(lb, cands) {
      const a = byId[lb.id];
      const w = lb.w, hh = lb.h;
      for (const [s, r, sh] of cands) {
        const x0 = clamp(a.x - w / 2 + sh * (w / 2 - 8), safe.l, safe.r - w);
        let edge = a.y;
        for (const bx of boxes) {
          if (bx.r < x0 - 6 || bx.l > x0 + w + 6) continue;
          edge = s === 'above' ? Math.min(edge, bx.t) : Math.max(edge, bx.b);
        }
        const y0 = s === 'above' ? edge - GAP - hh - r * (hh + 5) : edge + GAP + r * (hh + 5);
        const rc = { l: x0, t: y0, r: x0 + w, b: y0 + hh };
        if (rc.t < safe.t || rc.b > safe.b) continue;
        const lx = clamp(a.x, x0 + 3, x0 + w - 3);
        const ld = s === 'above' ? { l: Math.min(a.x, lx) - 1, r: Math.max(a.x, lx) + 1, t: rc.b, b: a.y } : { l: Math.min(a.x, lx) - 1, r: Math.max(a.x, lx) + 1, t: a.y, b: rc.t };
        let bad = false;
        for (const f of forbid) if (hit(rc, f, 8) || hit(ld, f, 2)) bad = true;
        if (!bad) for (const q of placedR) if (hit(rc, q, 5) || hit(ld, q, 2)) bad = true;
        if (!bad) for (const q of placedL) if (hit(rc, q, 2)) bad = true;
        if (bad) continue;
        placedR.push(rc);
        placedL.push(ld);
        lb.choice = [s, r, sh];
        return { s, r, rc, ld, lx, ey: s === 'above' ? rc.b : rc.t };
      }
      return null;
    }
    // three passes: every label centred on its own side, first row; then slid sideways on that row;
    // then anywhere (further rows, the other side). A label that slides or flips never takes the
    // place of a neighbour that fits where it belongs. (The previous choice is tried first in the
    // pass it belongs to: no flicker.)
    const sameChoice = (c, d) => c && d && c[0] === d[0] && c[1] === d[1] && c[2] === d[2];
    for (const pass of [1, 2, 3]) {
      labels.forEach((lb, i) => {
        if (!oks[i] || picks[i]) return;
        const a = byId[lb.id];
        const side = a.side === 'below' ? 'below' : 'above';
        const other = side === 'above' ? 'below' : 'above';
        const all = [];
        if (pass === 1) all.push([side, 0, 0]);
        else if (pass === 2) all.push([side, 0, 1], [side, 0, -1]);
        else for (const s of [side, other]) for (let r = 0; r < 3; r++) for (const sh of [0, 1, -1]) all.push([s, r, sh]);
        // (in the stills, no history: the rule alone decides)
        const prev = lb.choice && !o.instant && all.some((c) => sameChoice(c, lb.choice)) ? lb.choice : null;
        picks[i] = tryPlace(lb, prev ? [prev, ...all.filter((c) => !sameChoice(c, prev))] : all);
      });
    }
    labels.forEach((lb, i) => {
      const pick = picks[i];
      const a = byId[lb.id];
      const kin = clamp((k - lb.i * 0.02) / 0.6);
      // (a label that cannot be placed fades where it is)
      lb.vis = chase(lb.vis, pick ? 1 : 0, dt, rate(5));
      const op = lb.vis * kin;
      if (pick) {
        const len = Math.hypot(pick.lx - a.x, pick.ey - a.y);
        const ang = Math.atan2(pick.ey - a.y, pick.lx - a.x);
        // the box rises a little out of the line as it comes in
        const sgn = pick.s === 'above' ? 1 : -1;
        lb.bs('transform', `translate3d(${pick.rc.l.toFixed(1)}px, ${(pick.rc.t + sgn * (1 - kin) * 6).toFixed(1)}px, 0)`);
        lb.ls('transform', `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0) rotate(${ang.toFixed(4)}rad) scaleX(${(len * clamp(kin * 1.3)).toFixed(2)})`);
        lb.ds('transform', `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`);
        lb.placed = true;
      } else if (!lb.placed) lb.vis = 0;
      lb.s('opacity', op.toFixed(3));
    });
  }

  // ------------------------------------------------------------------ per frame
  const last = { p: -1, tone: '', chapter: '' };
  let trY = -1; // the Transparence block's top (px), chased
  let trS = 1; // and its scale
  let trSide = '';
  // p: the story progress (smoothed); y, L: the scroll px and the page layout (main.js);
  // an: world.anchors() (or null); o: { dt, intro (0..1, the hero's entrance), instant }
  function update(p, y, L, an, o) {
    const dt = o.instant ? 1 : o.dt;
    const rate = (r) => (o.instant ? 1e9 : r);
    const W = M.W, H = M.H;

    // the final section's top edge (px): the header, the rail and the credit turn dark under it
    const S = L.S;
    const top = H - clamp(y - S, 0, L.F);

    // tone and current chapter
    let tone = (TONE.find((t) => p >= t.from && p < t.to) || TONE[TONE.length - 1]).tone;
    // at the end, the header stays light over the night-blue studio until the white section
    // reaches it
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
    // the tide reaches the credit (bottom), then the rail, then the header (story.js TONE): each
    // turns light once the wave line has passed above it
    const tideY = an && an.tide && Number.isFinite(an.tide.y) ? an.tide.y : -1;
    const tk = within(p, PHASES.tide);
    const passed = (yy) => p >= PHASES.tide[1] || (tk > 0 && (tideY >= 0 ? tideY < yy : tk > 0.5));
    // (the credit rides above the rising « Rendez-vous » section, over the canvas: light until the
    // section reaches it under the header, below)
    const c0 = H - M.creditB - M.creditH; // its top at rest
    const cty = Math.max(M.head + 8 - c0, Math.min(0, top - 12 - (H - M.creditB)));
    creditT('is-light', passed(c0) && top > c0 + cty + M.creditH);
    // (the rail follows its ruby marker and the current label, where the eye is)
    const railY = M.railTop + clamp(p) * M.railL;
    railT('is-light', passed(railY) && top > railY);

    // under the header over the 3D (the assembled watch can come close to it)
    headscrim('opacity', (smooth(0.06, 0.1, p) * (1 - smooth(0.87, 0.9, p))).toFixed(3));

    // rail marker (the ruby jewel)
    markerS('transform', `translate3d(0,${(clamp(p) * M.railL).toFixed(2)}px,0)`);
    railFill('transform', `scaleY(${clamp(p).toFixed(4)})`);

    // the Transparence block: centred, above or below the parts' band (never over its middle)
    {
      const wv = an && an.watch;
      let band = null;
      if (an && an.labels) {
        for (const a of an.labels) {
          if (!a || !a.visible || !a.box) continue;
          if (!band) band = { t: a.box.y, b: a.box.y + a.box.h };
          band.t = Math.min(band.t, a.box.y);
          band.b = Math.max(band.b, a.box.y + a.box.h);
        }
        // (room for the labels themselves, one row each side)
        if (band) {
          band.t -= 44;
          band.b += 44;
        }
      }
      if (!band && wv && wv.visible && Number.isFinite(wv.y)) band = { t: wv.y - wv.r * 1.2, b: wv.y + wv.r * 1.2 };
      if (!band) band = { t: H * 0.3, b: H * 0.62 };
      const roomA = band.t - (M.head + 18);
      const roomB = H - 56 - band.b;
      const fitsB = roomB >= M.trH, fitsA = roomA >= M.trH;
      let side = o.instant ? '' : trSide;
      if (!(side === 'below' && fitsB) && !(side === 'above' && fitsA)) side = fitsB ? 'below' : fitsA ? 'above' : roomB >= roomA ? 'below' : 'above';
      trSide = side;
      // (no room on either side at full size, small windows: the block shrinks a little, down to
      // 78 %, on the roomier side)
      const room = side === 'below' ? roomB : roomA;
      const sc = clamp(room / M.trH, 0.78, 1);
      const hh = M.trH * sc;
      const ty = side === 'below' ? band.b + clamp(room - hh, 0, 28) : band.t - hh - clamp(room - hh, 0, 28);
      trY = trY < 0 || o.instant ? ty : chase(trY, ty, dt, 900);
      trS = o.instant ? sc : chase(trS, sc, dt, 1.5);
    }

    // beats
    for (const b of beats) {
      const [a, bb, c, d] = b.w;
      const kin = smooth(a, bb, p);
      const kout = c >= 1 ? 0 : smooth(c, d, p);
      let op = kin * (1 - kout);
      let target = within(p, [a, bb]);
      if (b.id === 'hero') {
        // the hero comes in with the page (intro), and fades out with the scroll
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
      } else if (b.id === 'transparence') {
        b.s('transform', `translate3d(-50%, ${(trY + dy).toFixed(1)}px, 0)`);
        trInS('transform', trS > 0.9995 ? 'none' : `scale(${trS.toFixed(4)})`);
      }
      else b.s('transform', `translate3d(0, calc(-50% + ${dy.toFixed(1)}px), 0)`);
      // the commitments and the cards follow the headline, one after the other
      if (b.id === 'atelier') points.forEach((s, i) => s('opacity', smooth(a + 0.008 + i * 0.004, bb + 0.004 + i * 0.004, p).toFixed(3)));
      if (b.id === 'restauration') cards.forEach((s, i) => s('opacity', smooth(a + 0.006 + i * 0.003, bb + 0.003 + i * 0.003, p).toFixed(3)));
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

    // the part labels (the exploded line, then the glass line)
    {
      const wl = win.labels, ws = win.sapphireLabels;
      const kL = (wl[1] <= wl[0] ? 1 : smooth(wl[0], wl[1], p)) * (1 - smooth(wl[2], wl[3], p)) * clamp((o.intro - 0.25) / 0.6);
      const kS = smooth(ws[0], ws[1], p) * (1 - smooth(ws[2], ws[3], p));
      const k = Math.max(kL, kS);
      const forbid = [{ l: 0, t: 0, r: W, b: M.head + 2 }];
      if (M.creditR) forbid.push(M.creditR);
      const heroOp = +B.hero.el.style.opacity || 0;
      if (heroOp > 0.01) for (const r of M.hero) forbid.push({ l: r.l - 6, r: r.r + 6, t: r.t + B.hero.dy - 6, b: r.b + B.hero.dy + 6 });
      if (+hint.el.style.opacity > 0.01 && M.hintR) forbid.push(M.hintR);
      if (+B.transparence.el.style.opacity > 0.01) forbid.push({ l: W / 2 - (M.trW * trS) / 2, r: W / 2 + (M.trW * trS) / 2, t: trY, b: trY + M.trH * trS });
      layoutLabels(an && an.labels, k, dt, rate, forbid, p > 0.4, o);
    }

    // « Rendez-vous »: slides up over the canvas from STORY_END
    {
      const on = top < H - 0.5;
      fin.t('is-on', on);
      fin.s('transform', `translate3d(0, ${top.toFixed(2)}px, 0)`);
      // the headline ticks in as it rises into view (settled a quarter of a window above the bottom
      // edge), the ticket as it comes up (settled before the section has landed): still a pure
      // function of p for a given window; once the section is 60 % up, both always land, the ticket
      // on its stamp, wherever the scroll rests
      const tTop = top + M.titleOff, kTop = top + M.ticketOff;
      fin.rv = chase(fin.rv, on ? (top <= 0.4 * H ? 1 : clamp((H - tTop) / (0.25 * H))) : 0, dt, rate(revealRate(fin.title)));
      fin.title.set(fin.rv);
      fin.tv = chase(fin.tv, on ? (top <= 0.4 * H ? 1 : clamp((0.88 * H - kTop) / (0.42 * H))) : 0, dt, rate(TICKET_RATE));
      const tv = fin.tv;
      // six hand-drawn checks in order, then the stamp lands
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
      // the canvas is fully covered: main.js skips the 3D render
      fin.covered = top <= 0;
      // the credit (always visible, never over a text): it rides just above the rising section's top
      // edge, at least 8 px under the header, and hands over to the section's own credit (its footer)
      // once that one is in view
      const ty = cty;
      const fcB = top + M.fcOff + M.creditH; // the footer credit's bottom edge
      const cop = clamp((fcB - (H - 18)) / 18); // (it fades only once the footer one is fully in view)
      credit('transform', ty < -0.01 ? `translate3d(0, ${ty.toFixed(1)}px, 0)` : 'none');
      credit('opacity', cop.toFixed(3));
    }
  }

  return {
    update,
    measure,
    showToast,
    M,
    // the final section covers the whole window (no 3D to draw)
    get covered() {
      return !!fin.covered;
    },
    // for the tests and the tour: the ticket ends on its stamp
    get ticketDone() {
      return fin.tv >= 1;
    },
    els: { navLinks: () => [...nav.children], dots: () => dots.map((d) => d.el) },
  };
}
