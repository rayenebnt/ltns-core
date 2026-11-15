// PINÈDE page UI: every text from texts.js; the header (a solid green bar over the first sections,
// open over the house); the first sections (they scroll away like any page; their pictures are
// views of the house rendered at load) and their headlines; the caption over the house; the
// progress rail; the « Votre projet » section (slide, headline reveal, the site ticket: checks
// then the stamp); the toast.
import { CHAPTERS, BEATS as WIN, STORY_END, chapterAt } from './story.js';
import * as T from './texts.js';
import { createTick } from './tick.js';
import { clamp, mix, smooth, chase, styler, toggler, easeOut3 } from './util.js';

const $ = (id) => document.getElementById(id);
const win = Object.fromEntries(WIN.map((b) => [b.id, b.win]));
// the stations of the rail: every chapter, the first sections to « Votre projet »
export const STATIONS = CHAPTERS;
// the world's anchors are only its pictures, read once after the warm-up (main.js)
export const needAnchors = () => false;

// every [data-t] element gets its text from texts.js (also the loader and the no-WebGL message,
// before anything else runs)
export function fillTexts() {
  const map = {
    'brand.name': T.BRAND.name,
    cta: T.CTA,
    visit: T.VISIT,
    credit: T.CREDIT,
    'nogl.0': T.NOGL[0],
    'nogl.1': T.NOGL[1],
  };
  for (const [id, b] of Object.entries({ dark: T.DARK, about: T.ABOUT, services: T.SERVICES, caption: T.CAPTION, projet: T.PROJET }))
    for (const [k, v] of Object.entries(b)) if (typeof v === 'string') map[`${id}.${k}`] = v;
  document.querySelectorAll('[data-t]').forEach((el) => {
    const v = map[el.dataset.t];
    if (v !== undefined) el.textContent = v;
  });
  document.title = T.TITLE;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', T.META_DESCRIPTION);
}

// the fastest a headline may tick in (or out), whatever the scroll speed: its natural duration
const revealRate = (tk) => 1 / Math.max(0.3, tk.dur);
const TICKET_RATE = 1 / 1.9; // the ticket (six checks, then the stamp) never plays faster than 1.9 s

export function createUI(h) {
  const doc = document.documentElement;
  const docT = toggler(doc);

  // ------------------------------------------------------------------ header
  const lines = $('brand-lines');
  for (const l of T.BRAND.lines) {
    const s = document.createElement('span');
    s.textContent = l;
    lines.appendChild(s);
  }
  for (const m of T.MENU) {
    const li = document.createElement('li');
    const bt = document.createElement('button');
    bt.type = 'button';
    bt.className = 'cta';
    bt.textContent = m.label;
    if (m.more) bt.insertAdjacentHTML('beforeend', '<svg class="chev" aria-hidden="true"><use href="#i-chev"/></svg>');
    li.appendChild(bt);
    $('menu').appendChild(li);
  }
  $('brand').addEventListener('click', (e) => {
    e.preventDefault();
    h.onTop();
  });
  $('visit').addEventListener('click', () => h.onVisit());

  // ------------------------------------------------------------------ the first sections
  const introEl = $('intro');
  const intro = { s: styler(introEl), t: toggler(introEl) };
  const darkEl = introEl.querySelector('.s-dark');
  const hint = styler($('hint'));
  const heads = [
    { el: $('t-dark'), lines: T.DARK.title },
    { el: $('t-about'), lines: T.ABOUT.title },
  ].map((x) => {
    x.el.classList.add('tick');
    return { el: x.el, tick: createTick(x.el, x.lines), rv: 0 };
  });
  const darkParts = ['.kick', '.body', '.btn', '.shot'].map((q) => styler(darkEl.querySelector(q)));
  // the service cards
  const cards = $('cards');
  for (const c of T.SERVICES.cards) {
    const a = document.createElement('article');
    a.className = 'card';
    a.innerHTML = '<figure class="shot"><img alt=""></figure><div class="card-body"><h3 class="card-title"></h3><p class="card-text"></p><button class="more cta" type="button"></button></div>';
    const img = a.querySelector('img');
    img.dataset.shot = c.shot;
    img.alt = c.title;
    a.querySelector('.card-title').textContent = c.title;
    a.querySelector('.card-text').textContent = c.text;
    a.querySelector('.more').textContent = T.SERVICES.more;
    cards.appendChild(a);
  }
  // the pictures: views of the house rendered by the world at load (anchors().thumbs)
  function setPictures(thumbs) {
    if (!thumbs) return;
    document.querySelectorAll('img[data-shot]').forEach((img) => {
      const src = thumbs[img.dataset.shot];
      if (!src) return;
      img.addEventListener('load', () => img.classList.add('is-in'), { once: true });
      img.src = src;
    });
  }

  // ------------------------------------------------------------------ the caption over the house
  const cap = { el: $('b-caption'), s: styler($('b-caption')), t: toggler($('b-caption')), w: win.caption };
  const footscrim = styler($('footscrim'));
  const headscrim = styler($('headscrim'));
  const creditEl = $('credit');
  const credit = styler(creditEl);
  const creditT = toggler(creditEl);

  // ------------------------------------------------------------------ rail
  const rail = $('rail');
  rail.innerHTML = '<i class="rail-line"><i class="rail-fill"></i></i><i class="rail-end"></i>';
  const railT = toggler(rail);
  const railS = styler(rail);
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
  const fin = { s: styler(finalEl), t: toggler(finalEl), rv: 0, tv: 0 };
  {
    // the last word of the title in the serif italic
    const el = $('t-final');
    el.classList.add('tick');
    fin.title = createTick(el, T.PROJET.title);
    const last = el.querySelectorAll('.wi');
    const w = last[last.length - 1];
    if (w) {
      const em = document.createElement('em');
      em.textContent = w.textContent;
      w.textContent = '';
      w.appendChild(em);
    }
  }
  $('f-replay').addEventListener('click', () => h.onReplay());
  const TK = T.PROJET.ticket;
  $('t-ticket-head').textContent = TK.head;
  $('stamp-text').textContent = TK.stamp;
  $('t-ticket-num').textContent = TK.number;
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
    return { s: styler(li.querySelector('path')) };
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
  const M = { W: innerWidth, H: innerHeight, introH: innerHeight * 3, darkH: innerHeight, aboutTop: innerHeight * 1.4, railL: 400, railTop: 110, finalH: innerHeight, titleOff: 200, ticketOff: 300, head: 68 };
  function measure() {
    M.W = innerWidth;
    M.H = innerHeight;
    M.introH = Math.max(innerHeight, introEl.offsetHeight);
    M.darkH = darkEl.offsetHeight;
    const i0 = introEl.getBoundingClientRect().top;
    M.aboutTop = heads[1].el.getBoundingClientRect().top - i0;
    M.railL = rail.querySelector('.rail-line').offsetHeight || 400;
    M.railTop = rail.getBoundingClientRect().top;
    M.finalH = Math.max(innerHeight, finalEl.offsetHeight);
    const f0 = finalEl.getBoundingClientRect().top;
    M.titleOff = $('t-final').getBoundingClientRect().top - f0;
    M.ticketOff = $('ticket').getBoundingClientRect().top - f0;
    M.head = parseFloat(getComputedStyle(doc).getPropertyValue('--head-h')) || 68;
    dots.forEach((d) => d.s('top', `${(d.c.from * M.railL).toFixed(1)}px`));
    last.ch = '';
    return M;
  }

  // ------------------------------------------------------------------ per frame
  const last = { ch: '' };
  // p: the story progress (smoothed); y, L: the scroll px and the page layout (main.js);
  // o: { dt, intro (0..1, the first screen's entrance after the loader), instant }
  function update(p, y, L, an, o) {
    const dt = o.instant ? 1 : o.dt;
    const rate = (r) => (o.instant ? 1e9 : r);
    const H = M.H;

    // the first sections scroll away like a page
    const iy = Math.min(y, L.I);
    intro.s('transform', `translate3d(0, ${(-iy).toFixed(2)}px, 0)`);
    intro.t('is-gone', y >= L.I - 0.5);
    const introBottom = L.I - y; // the first sections' bottom edge on screen (px)
    // the final section's top edge on screen (px)
    const top = H - clamp(y - L.E, 0, L.F);

    // the first screen's entrance, then the second headline as it comes into view
    {
      const it = o.intro;
      const part = (k0) => clamp((it - k0) / 0.45);
      darkParts.forEach((s, i) => {
        const k = part([0.1, 0.55, 0.75, 0][i]);
        s('opacity', k.toFixed(3));
        s('transform', i === 3 ? `translate3d(0, ${((1 - k) * 18).toFixed(1)}px, 0)` : `translate3d(0, ${((1 - k) * 12).toFixed(1)}px, 0)`);
      });
      const d = heads[0];
      d.rv = chase(d.rv, clamp(it * 1.5 - 0.15), dt, rate(revealRate(d.tick)));
      d.tick.set(d.rv);
      const a = heads[1];
      const aTop = M.aboutTop - y;
      a.rv = chase(a.rv, aTop < H * 0.86 ? 1 : 0, dt, rate(revealRate(a.tick)));
      a.tick.set(a.rv);
      const kh = part(0.8) * (1 - smooth(8, 90, y));
      hint('opacity', kh.toFixed(3));
      hint('visibility', kh > 0.002 ? 'visible' : 'hidden');
    }

    // the header: a bar over the sections, open over the house, a bar again over « Votre projet »
    docT('on-3d', introBottom < M.head * 0.6);
    docT('in-final', top < M.head + 1);

    // the caption over the house, its scrims
    {
      const [a, b, c, d] = cap.w;
      const kin = smooth(a, b, p), kout = smooth(c, d, p);
      const op = kin * (1 - kout);
      cap.t('is-on', op > 0.002);
      cap.s('opacity', op.toFixed(3));
      cap.s('transform', `translate3d(0, ${((1 - kin) * 16).toFixed(1)}px, 0)`);
      footscrim('opacity', op.toFixed(3));
      headscrim('opacity', (clamp(1 - introBottom / H) * (1 - smooth(STORY_END - 0.01, STORY_END + 0.02, p))).toFixed(3));
    }

    // the rail: chapter, marker, tone (light over the dark section and the house)
    const ch = chapterAt(p).id;
    if (ch !== last.ch) {
      last.ch = ch;
      dots.forEach((d) => d.t('is-here', d.c.id === ch));
    }
    dots.forEach((d) => d.t('is-past', p >= d.c.from - 1e-4));
    markerS('transform', `translate3d(0,${(clamp(p) * M.railL).toFixed(2)}px,0)`);
    railFill('transform', `scaleY(${clamp(p).toFixed(4)})`);
    // (the rail belongs to the house and « Votre projet »: it comes in as the first sections leave)
    const kr = clamp(1 - (introBottom - 0.08 * H) / (0.3 * H));
    railS('opacity', kr.toFixed(3));
    railS('visibility', kr > 0.002 ? 'visible' : 'hidden');
    const onPaper = (yy) => (yy > M.darkH - y && yy < introBottom) || yy > top;
    railT('is-dark', onPaper(M.railTop + clamp(p) * M.railL));
    const cy = H - 26;
    creditT('is-dark', onPaper(cy));
    credit('opacity', smooth(H - 90, H - 30, top).toFixed(3));

    // « Votre projet »: slides up over the canvas from STORY_END
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
      const ks = clamp((tv - 0.76) / 0.24);
      const sc = ks < 0.55 ? mix(1.8, 0.93, Math.pow(ks / 0.55, 2)) : mix(0.93, 1, easeOut3((ks - 0.55) / 0.45));
      stampS('opacity', clamp(ks / 0.22).toFixed(3));
      stampS('transform', `rotate(${mix(-19, -8, easeOut3(ks)).toFixed(2)}deg) scale(${sc.toFixed(4)})`);
      fin.covered = top <= 0;
    }
    // (nothing of the house shows while the first sections cover the whole window)
    fin.hidden3d = introBottom >= H - 0.5;
  }

  return {
    update,
    measure,
    showToast,
    setPictures,
    M,
    get covered() {
      return !!fin.covered || !!fin.hidden3d;
    },
    get ticketDone() {
      return fin.tv >= 1;
    },
    els: { dots: () => dots.map((d) => d.el) },
  };
}

