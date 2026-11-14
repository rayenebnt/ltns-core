// SIBYLLE page UI: every text from texts.js, the header (tone, current chapter), the text beats over the
// 3D (opacity, drift, the word reveal from story.js BEATS), the held press (take the coin, pour) and
// its badge, the choice of the bottle (hit areas over the 3D bottles, three dots, the card), the
// progress rail, the « Dégustation » section (slide, headline reveal, the ritual ticket: checks then
// the stamp) and the toast.
import { CHAPTERS, BEATS as WIN, TONE, SETS, CUTS, within, chapterAt } from './story.js';
import { IA } from './interact.js';
import * as T from './texts.js';
import { createTick } from './tick.js';
import { clamp, mix, smooth, chase, styler, toggler, easeOut3 } from './util.js';

const $ = (id) => document.getElementById(id);
const win = Object.fromEntries(WIN.map((b) => [b.id, b.win]));
// the stations of the rail and the nav: the five chapters of the story
export const STATIONS = CHAPTERS.filter((c) => c.id !== 'rendezvous');
// world.anchors(): the coin, the bottles, the pour (the badge and the hit areas follow them)
const R = Object.fromEntries(SETS.map((s) => [s.id, s.range]));
export const needAnchors = (p) => p < R.comptoir[1] || (p >= R.fioles[0] && p < R.verser[1]);

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
  const beats = ['hero', 'oracle', 'temple', 'fioles', 'verser', 'vision', 'fronton'].map((id) => beat(id, T.BEATS[id].title));
  const B = Object.fromEntries(beats.map((b) => [b.id, b]));
  const hint = { el: $('hint'), s: styler($('hint')) };
  const headscrim = styler($('headscrim'));
  const creditEl = $('credit');
  const credit = styler(creditEl);
  const creditT = toggler(creditEl);
  const fCredit = document.querySelector('#final .f-credit');
  const heroParts = ['.kicker', '.lead'].map((q) => styler(B.hero.el.querySelector(q)));

  // ------------------------------------------------------------------ the bottles: three dots, the card, the hit areas
  const flEls = { num: $('fl-num'), name: $('fl-name'), notes: $('fl-notes'), mood: $('fl-mood'), spec: $('fl-spec') };
  flEls.spec.textContent = T.FLAVOR_SPEC;
  const choose = (i) => {
    IA.flavor = i;
    showFlavor();
  };
  const dotEls = T.FLAVORS.map((f, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `dot dot-${i}`;
    b.setAttribute('aria-label', `${f.num} ${f.name}`);
    b.addEventListener('click', () => choose(i));
    $('fl-dots').appendChild(b);
    return { el: b, t: toggler(b) };
  });
  const picks = T.FLAVORS.map((f, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.setAttribute('aria-label', `Choisir ${f.num} ${f.name}`);
    b.addEventListener('click', () => choose(i));
    b.addEventListener('pointerenter', () => (IA.hover = i));
    b.addEventListener('pointerleave', () => IA.hover === i && (IA.hover = -1));
    $('picks').appendChild(b);
    return { el: b, s: styler(b) };
  });
  const picksT = toggler($('picks'));
  let shownFlavor = -1;
  function showFlavor() {
    const i = IA.flavor;
    if (i === shownFlavor) return;
    shownFlavor = i;
    const f = T.FLAVORS[i];
    flEls.num.textContent = f.num;
    flEls.name.textContent = f.name;
    flEls.notes.textContent = f.notes;
    flEls.mood.textContent = f.mood;
    dotEls.forEach((d, k) => d.t('is-on', k === i));
    $('flavor').dataset.f = String(i);
    $('t-ticket-num').textContent = `${f.num} · ${f.name}`;
  }

  // ------------------------------------------------------------------ the held press and its badge
  const badge = { el: $('badge'), s: styler($('badge')), t: toggler($('badge')), fg: styler($('badge-fg')), text: $('badge-text'), label: '' };
  const holdable = (p) => p < R.comptoir[1] - 0.02 || (p >= R.verser[0] && p < R.verser[1] - 0.01);
  let curP = 0;
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0 || doc.classList.contains('is-touring')) return;
      if (e.target && e.target.closest && e.target.closest('button, a, .top, .rail, .final, .pick')) return;
      if (holdable(curP)) IA.hold = true;
    },
    { passive: true },
  );
  for (const ev of ['pointerup', 'pointercancel', 'blur']) window.addEventListener(ev, () => (IA.hold = false));

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
    const light = tone === 'light';
    curP = p;
    // (the credit rides above the rising « Rendez-vous » section, over the canvas: light until the
    // section reaches it under the header, below)
    const c0 = H - M.creditB - M.creditH;
    const cty = Math.max(M.head + 8 - c0, Math.min(0, top - 12 - (H - M.creditB)));
    creditT('is-light', light && top > c0 + cty + M.creditH);
    const railY = M.railTop + clamp(p) * M.railL;
    railT('is-light', light && top > railY);

    // under the header over the 3D
    // (none over a cut: it would tint the full-screen ink)
    const nearCut = CUTS.reduce((m, c) => Math.max(m, 1 - clamp((Math.abs(p - c.at) - c.w * 0.4) / (c.w * 0.6))), 0);
    headscrim('opacity', (smooth(0.04, 0.08, p) * (1 - smooth(0.96, 0.975, p)) * (1 - nearCut)).toFixed(3));

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
      } else if (b.id === 'fronton') b.s('transform', `translate3d(-50%, ${dy.toFixed(1)}px, 0)`);
      else b.s('transform', `translate3d(0, calc(-50% + ${dy.toFixed(1)}px), 0)`);
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

    // the badge: on the coin, then on the pour; the bottles' hit areas
    showFlavor();
    {
      let on = false, x = 0, y = 0, k = 0, label = '';
      if (an && an.set === 'comptoir' && an.coin && p < R.comptoir[1] - 0.025 && !an.coinDone) {
        on = true;
        x = an.coin.x + 64;
        y = an.coin.y - 58;
        k = clamp(IA.coinK / 0.6);
        label = T.BADGES.hold;
      } else if (an && an.set === 'verser' && an.pour && p > R.verser[0] + 0.012 && p < R.verser[1] - 0.02 && !an.pourDone) {
        on = true;
        x = an.pour.x;
        y = an.pour.y;
        k = IA.pourK;
        label = T.BADGES.pour;
      } else if (an && an.set === 'fioles' && an.choose && p > R.fioles[0] + 0.012 && p < R.fioles[1] - 0.012) {
        on = true;
        x = an.choose.x;
        y = an.choose.y;
        k = 1;
        label = T.BADGES.choose;
      }
      badge.t('is-on', on);
      badge.t('is-held', IA.hold && on);
      if (on) {
        if (label !== badge.label) badge.text.textContent = badge.label = label;
        badge.s('transform', `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`);
        badge.fg('strokeDashoffset', (1 - clamp(k)).toFixed(4));
      }
      const pk = !!(an && an.set === 'fioles' && an.bottles) && p > R.fioles[0] + 0.006 && p < R.fioles[1] - 0.006;
      picksT('is-on', pk);
      if (pk)
        an.bottles.forEach((bt, i) => {
          picks[i].s('transform', `translate3d(${(bt.x - bt.w).toFixed(1)}px, ${(bt.y - bt.h / 2).toFixed(1)}px, 0)`);
          picks[i].s('width', `${(bt.w * 2).toFixed(1)}px`);
          picks[i].s('height', `${bt.h.toFixed(1)}px`);
        });
    }

    // « Dégustation »: slides up over the canvas from STORY_END
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
