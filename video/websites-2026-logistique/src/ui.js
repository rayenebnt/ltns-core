// SILLAGE page UI: every text from texts.js, the header (tone, current chapter), the text beats
// over the 3D (opacity, drift, letter reveal from story.js BEATS), the five service callouts
// anchored to the ship (world.anchors().callouts), the progress rail, the « Arrivée » section
// (slide, headline reveal, split-flap board) and the toast.
import { CHAPTERS, BEATS as WIN, TONE, CREDIT_LIGHT, within, chapterAt } from './story.js';
import * as T from './texts.js';
import { createFlap, createBoard } from './flap.js';
import { clamp, smooth, chase, styler, toggler } from './util.js';

const $ = (id) => document.getElementById(id);
const win = Object.fromEntries(WIN.map((b) => [b.id, b.win]));
// the stations of the rail and the nav: the four chapters of the journey
export const STATIONS = CHAPTERS.filter((c) => c.id !== 'arrivee');

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
    if (Array.isArray(b)) continue;
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

// reveal windows: the headline flips in while the beat fades in and is settled once it is fully
// in (so the ?capture stills from the middle of a chapter or of a beat show it whole)
const revealEnd = (w) => w[1];
// the fastest a headline may flip in (or out), whatever the scroll speed, so a flick still shows
// it: about 30 ms per letter (the letters in flight included)
const revealRate = (flap) => 1 / Math.max(0.45, (flap.length + 5) * 0.03); // full reveals per second
const BOARD_RATE = 1 / 1.7;

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
    b.append(num, document.createTextNode(' ' + n.label));
    b.addEventListener('click', () => h.onNav(n.id));
    nav.appendChild(b);
    return { id: n.id, t: toggler(b) };
  });
  $('brand').addEventListener('click', (e) => {
    e.preventDefault();
    h.onTop();
  });

  // ------------------------------------------------------------------ beats
  const beat = (id, lines, seed) => {
    const el = $(`b-${id}`);
    const title = lines ? createFlap($(`t-${id}`), lines, { seed, flips: 3, lead: 5 }) : null;
    return { id, el, s: styler(el), t: toggler(el), title, rv: 0, w: win[id] };
  };
  const beats = [
    beat('hero', T.BEATS.hero.title, 11),
    beat('port', T.BEATS.port.title, 23),
    beat('route', T.BEATS.route.title, 37),
    beat('mer', T.BEATS.mer.title, 41),
    beat('services', null),
    beat('air', T.BEATS.air.title, 53),
  ];
  const B = Object.fromEntries(beats.map((b) => [b.id, b]));
  const hint = { el: $('hint'), s: styler($('hint')) };
  const vignette = styler($('vignette'));
  const headscrim = styler($('headscrim'));
  const airscrim = styler($('airscrim'));
  const creditEl = $('credit');
  const credit = styler(creditEl);
  const creditT = toggler(creditEl);
  // the section's own credit, in its footer (the same text): the fixed one hands over to it
  const fCredit = document.querySelector('#final .f-credit');
  const thread = styler(document.querySelector('.thread'));
  const heroParts = ['.kicker', '.accent', '.lead'].map((q) => styler(B.hero.el.querySelector(q)));

  // the five services
  const sv = $('b-services');
  const callouts = T.BEATS.services.map((s, i) => {
    const el = document.createElement('div');
    el.className = 'callout';
    el.innerHTML = '<i class="c-dot"></i><i class="c-line"></i><div class="c-body"><span class="c-icon"><svg aria-hidden="true"><use href="#i-' + s.icon + '"/></svg></span><p class="c-title"></p><p class="c-text"></p></div>';
    el.querySelector('.c-title').textContent = s.title;
    el.querySelector('.c-text').textContent = s.text;
    sv.appendChild(el);
    const body = el.querySelector('.c-body');
    return { el, s: styler(el), t: toggler(el), body, bs: styler(body), line: styler(el.querySelector('.c-line')), w: 240, h: 80, vis: 0, side: '' };
  });

  // ------------------------------------------------------------------ rail
  const rail = $('rail');
  rail.innerHTML = '<i class="rail-line"><i class="rail-fill"></i></i><i class="rail-end"></i>';
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
  const fin = { s: styler(finalEl), t: toggler(finalEl), title: createFlap($('t-final'), T.BEATS.arrivee.title, { seed: 67, flips: 3, lead: 5 }), rv: 0, bv: 0 };
  const board = createBoard($('board'), T.BEATS.arrivee.board, { seed: 71 });
  $('f-replay').addEventListener('click', () => h.onReplay());

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
  const M = { W: innerWidth, H: innerHeight, railL: 400, finalH: innerHeight, m: 40, head: 78, railW: 64, titleOff: 200, boardOff: 300, fcOff: 1e5, creditH: 14, creditB: 22 };
  function measure() {
    M.W = innerWidth;
    M.H = innerHeight;
    M.railL = rail.querySelector('.rail-line').offsetHeight || 400;
    M.finalH = Math.max(innerHeight, finalEl.offsetHeight);
    // where the headline and the board sit inside the section (its slide moves them together)
    const f0 = finalEl.getBoundingClientRect().top;
    M.titleOff = $('t-final').getBoundingClientRect().top - f0;
    M.boardOff = $('board').getBoundingClientRect().top - f0;
    M.fcOff = fCredit ? fCredit.getBoundingClientRect().top - f0 : 1e5;
    M.creditH = creditEl.offsetHeight || 14;
    M.creditB = parseFloat(getComputedStyle(creditEl).bottom) || 22;
    const cs = getComputedStyle(doc);
    M.m = parseFloat(cs.getPropertyValue('--m')) || 40;
    M.head = parseFloat(cs.getPropertyValue('--head-h')) || 78;
    M.railW = parseFloat(cs.getPropertyValue('--rail-w')) || 64;
    for (const c of callouts) {
      c.w = c.body.offsetWidth || 240;
      c.h = c.body.offsetHeight || 80;
    }
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

    // tone and current chapter
    const tone = (TONE.find((t) => p >= t.from && p < t.to) || TONE[TONE.length - 1]).tone;
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
    // (over the water before the header is: light text, story.js CREDIT_LIGHT)
    creditT('is-light', p >= CREDIT_LIGHT[0] && p < CREDIT_LIGHT[1]);

    // above the bright clouds (the air chapter, light tone): the soft vignette
    vignette('opacity', (smooth(0.72, 0.78, p) * (1 - smooth(0.875, 0.9, p))).toFixed(3));
    // under the header over the busy 3D (from the crane to the white-out)
    headscrim('opacity', (smooth(0.16, 0.2, p) * (1 - smooth(0.86, 0.9, p))).toFixed(3));
    // over the bright clouds: the credit's and the rail's backdrop
    airscrim('opacity', (smooth(0.74, 0.77, p) * (1 - smooth(0.868, 0.88, p))).toFixed(3));

    // rail marker
    markerS('transform', `translate3d(0,${(clamp(p) * M.railL).toFixed(2)}px,0)`);
    railFill('transform', `scaleY(${clamp(p).toFixed(4)})`);

    // beats
    for (const b of beats) {
      if (b.id === 'services') continue; // (its callouts: below)
      const [a, bb, c, d] = b.w;
      const kin = smooth(a, bb, p);
      const kout = c >= 1 ? 0 : smooth(c, d, p);
      let op = kin * (1 - kout);
      let target = within(p, [a, revealEnd(b.w)]);
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
      const dy = (1 - kin) * 26 - kout * 22;
      b.s('opacity', op.toFixed(3));
      if (b.id === 'mer') b.s('transform', `translate3d(-50%, calc(-50% + ${dy.toFixed(1)}px), 0)`);
      else if (b.id === 'port' || b.id === 'route' || b.id === 'air') b.s('transform', `translate3d(0, calc(-50% + ${dy.toFixed(1)}px), 0)`);
      else if (b.id === 'hero') b.s('transform', `translate3d(0, ${(-kout * 30).toFixed(1)}px, 0)`);
    }
    // the hero's parts follow the entrance, one after the other
    {
      const it = o.intro;
      const part = (k0) => clamp((it - k0) / 0.45);
      heroParts.forEach((s, i) => {
        const k = part([0, 0.42, 0.55][i]);
        s('opacity', k.toFixed(3));
        s('transform', `translate3d(0, ${((1 - k) * 14).toFixed(1)}px, 0)`);
      });
      thread('--k', part(0.4).toFixed(3));
      const kh = part(0.7) * (1 - smooth(0.004, 0.03, p));
      hint.s('opacity', kh.toFixed(3));
      hint.s('visibility', kh > 0.002 ? 'visible' : 'hidden');
    }

    // services: the callouts follow their anchors around the ship
    {
      const [a, , c, d] = B.services.w;
      const out = c >= 1 ? 0 : smooth(c, d, p);
      const list = an && an.callouts ? an.callouts : null;
      const any = p > a - 0.01 && p < d + 0.01 && list;
      B.services.t('is-on', !!any);
      B.services.s('opacity', any ? '1' : '0');
      callouts.forEach((co, i) => {
        const pt = list && list[i];
        const ok = !!(pt && pt.visible && Number.isFinite(pt.x) && Number.isFinite(pt.y));
        co.vis = chase(co.vis, ok ? 1 : 0, dt, rate(3.5));
        const kin = smooth(a + i * 0.0055, a + i * 0.0055 + 0.022, p);
        const k = kin * (1 - out) * co.vis;
        co.t('is-on', k > 0.002);
        if (k <= 0.002 || !pt) {
          co.s('opacity', '0');
          return;
        }
        const side = pt.side === 'left' ? 'left' : 'right';
        if (side !== co.side) {
          co.side = side;
          co.t('is-left', side === 'left');
        }
        const W = M.W, H = M.H;
        const x = clamp(pt.x, 8, W - 8), yy = clamp(pt.y, M.head + 16, H - 40);
        // the text block beside the attach point, kept inside the window (the leader line
        // stretches or shortens to reach it)
        const GAP = clamp(W * 0.035, 34, 58);
        let bx = side === 'right' ? x + GAP : x - GAP - co.w;
        bx = clamp(bx, M.m, W - M.m - M.railW - co.w);
        let by = clamp(yy - 22, M.head + 12, H - co.h - 54);
        const lineFrom = side === 'right' ? 6 : bx + co.w - x + 10;
        const lineTo = side === 'right' ? bx - x - 10 : -6;
        const len = Math.max(0, lineTo - lineFrom);
        co.s('opacity', k.toFixed(3));
        co.s('transform', `translate3d(${x.toFixed(1)}px, ${yy.toFixed(1)}px, 0)`);
        co.bs('transform', `translate3d(${(bx - x).toFixed(1)}px, ${(by - yy + 22 + (1 - kin) * 10).toFixed(1)}px, 0)`);
        co.line('left', `${lineFrom.toFixed(1)}px`);
        co.line('width', `${len.toFixed(1)}px`);
        co.line('transform', `scaleX(${clamp(kin * 1.25).toFixed(3)})`);
      });
    }

    // « Arrivée »: slides up over the canvas from STORY_END
    {
      const S = L.S;
      const top = M.H - clamp(y - S, 0, L.F);
      const on = top < M.H - 0.5;
      fin.t('is-on', on);
      fin.s('transform', `translate3d(0, ${top.toFixed(2)}px, 0)`);
      // the headline flips in as it rises into view (settled a quarter of a window above the bottom
      // edge, by the middle of the « arrivee » beat), the board as it comes up (settled before
      // the section has landed): still a pure function of p for a given window
      const H = M.H;
      const tTop = top + M.titleOff, bTop = top + M.boardOff;
      // (once the section is 60 % up, the headline and the board always land, the board on « LIVRÉ »:
      // never frozen mid-scramble or mid-flip on the last frame of a take, wherever the scroll rests)
      fin.rv = chase(fin.rv, on ? (top <= 0.4 * H ? 1 : clamp((H - tTop) / (0.25 * H))) : 0, dt, rate(revealRate(fin.title)));
      fin.title.set(fin.rv);
      fin.bv = chase(fin.bv, on ? (top <= 0.4 * H ? 1 : clamp((0.88 * H - bTop) / (0.42 * H))) : 0, dt, rate(BOARD_RATE));
      board.set(fin.bv);
      // the canvas is fully covered: main.js skips the 3D render
      fin.covered = top <= 0;
      // the credit (always visible, never over a text): it rides just above the rising section's top
      // edge, at least 8 px under the header, and hands over to the section's own credit (its footer)
      // once that one is in view
      const c0 = H - M.creditB - M.creditH; // its top at rest
      const ty = Math.max(M.head + 8 - c0, Math.min(0, top - 12 - (H - M.creditB)));
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
    // for the tests and the tour: the board settled on « LIVRÉ »
    get boardDone() {
      return fin.bv >= 1;
    },
    els: { navLinks: () => [...nav.children], dots: () => dots.map((d) => d.el) },
  };
}
