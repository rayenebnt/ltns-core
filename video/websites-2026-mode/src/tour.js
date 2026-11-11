// The hands-free tour (P, or ?auto=1): a fake arrow cursor (DOM, SVG) glides on eased curves and
// « clicks » with a small press. It drives the page through the same paths as a real hand: its
// position feeds the shell's picking (hover, focus, tag hover) and its clicks go through
// clickAt(x, y), which hits the real buttons or the 3D under that point.
import { HERO, PRODUCTS } from './catalog.js';
import { clamp, ease5, easeInOutSine, mix } from './util.js';

const N = PRODUCTS.length;

// [kind, target, seconds]; about 22 s, mirroring the reference video's take
export const TOUR = [
  ['move', ['slot', 0], 0.6], // to the left end of the rack
  ['sweep', [0, N - 1], 2.3], // along the rack, left to right
  ['sweep', [N - 1, HERO], 1.1], // and back to the hero (fast: a wave)
  ['wait', 0.6],
  ['click'], // opens the product view (1.1 s)
  ['wait', 0.5],
  ['move', ['tag', 1], 0.9],
  ['wait', 0.2],
  ['click'], // the pink tag
  ['wait', 1.0],
  ['move', ['tag', 2], 0.45],
  ['wait', 0.15],
  ['click'], // the yellow tag
  ['wait', 1.2],
  ['move', ['side', 1], 0.8],
  ['wait', 0.15],
  ['click'], // DOS
  ['wait', 1.3],
  ['move', ['side', 0], 0.35],
  ['wait', 0.12],
  ['click'], // DEVANT
  ['wait', 0.9],
  ['move', ['arrow', 1], 0.85],
  ['wait', 0.1],
  ['click'], // next garment
  ['wait', 1.4],
  ['move', ['arrow', -1], 1.0],
  ['wait', 0.1],
  ['click'], // previous garment
  ['wait', 1.3],
  ['move', ['close'], 0.85],
  ['wait', 0.1],
  ['click'], // back to the rack (1.1 s)
  ['wait', 0.9],
  ['move', ['slot', HERO], 0.9], // settles on the rack, on the hero
  ['wait', 1.2],
];
// started from the product view: close it first
const FROM_PRODUCT = [['move', ['close'], 0.8], ['wait', 0.1], ['click'], ['wait', 1.25]];
const CLICK_S = 0.14;
const FADE_S = 0.35;

// a step's length: [kind, target, seconds], ['wait', seconds], ['click']
const durOf = (s) => (s[0] === 'click' ? CLICK_S : s[0] === 'wait' ? s[1] : s[2]);
export const tourLength = (steps = TOUR) => steps.reduce((t, s) => t + durOf(s), 0);

// el: the cursor element; target(name, arg) -> {x, y} CSS px or null; clickAt(x, y)
export function createTour({ el, target, clickAt, onEnd = () => {} }) {
  const cur = { x: innerWidth * 0.55, y: innerHeight * 0.8 };
  let steps = null, i = 0, t = 0, from = null, done = true;
  let playing = false, alpha = 0, pressT = 9;
  let hoverEl = null;

  function setHover(b) {
    if (b === hoverEl) return;
    if (hoverEl) hoverEl.classList.remove('is-hover');
    hoverEl = b;
    if (hoverEl) hoverEl.classList.add('is-hover');
  }

  function draw() {
    // the press: a quick squeeze and release
    const p = pressT < 0.24 ? Math.sin(Math.PI * clamp(pressT / 0.24)) : 0;
    el.style.opacity = alpha.toFixed(3);
    el.style.transform = `translate3d(${cur.x.toFixed(1)}px,${cur.y.toFixed(1)}px,0) scale(${(1 - 0.17 * p).toFixed(3)})`;
    el.classList.toggle('is-press', p > 0.3);
  }

  function start(p0, fromProduct = false) {
    if (p0 && Number.isFinite(p0.x)) {
      cur.x = p0.x;
      cur.y = p0.y;
    }
    steps = fromProduct ? [...FROM_PRODUCT, ...TOUR] : TOUR;
    i = 0;
    t = 0;
    from = { ...cur };
    playing = true;
    done = false;
    alpha = Math.max(alpha, 0);
    el.hidden = false;
    draw();
  }

  function stop() {
    if (!playing) return;
    playing = false;
    setHover(null);
    onEnd();
  }

  function resolve(tg) {
    const p = target(tg[0], tg[1]);
    return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : null;
  }

  // one frame; returns the cursor position while it acts on the page (else null)
  function step(dt) {
    pressT += dt;
    if (!playing) {
      if (alpha > 0) {
        alpha = Math.max(0, alpha - dt / FADE_S);
        draw();
        if (alpha === 0) el.hidden = true;
      }
      return null;
    }
    alpha = Math.min(1, alpha + dt / 0.25);
    t += dt;
    // advance through finished steps (a long frame can finish several)
    for (;;) {
      const s = steps[i];
      if (!s) {
        playing = false;
        done = true;
        setHover(null);
        onEnd();
        draw();
        return { ...cur };
      }
      const dur = durOf(s);
      if (t < dur) break;
      finish(s);
      t -= dur;
      i++;
      from = { ...cur };
      if (steps[i] && steps[i][0] === 'click') {
        pressT = 0;
        clickAt(cur.x, cur.y);
      }
    }
    const s = steps[i];
    const k = clamp(t / durOf(s));
    if (s[0] === 'move') {
      const to = resolve(s[1]);
      if (to) {
        const e = ease5(k);
        // a slight arc, as a wrist draws it
        const dx = to.x - from.x, dy = to.y - from.y;
        const arc = Math.sin(Math.PI * e) * 0.07;
        cur.x = from.x + dx * e + dy * arc;
        cur.y = from.y + dy * e - Math.abs(dx) * arc * 0.6;
      }
    } else if (s[0] === 'sweep') {
      const [a, b] = s[1];
      const e = easeInOutSine(k);
      const p = target('slot', mix(a, b, e));
      if (p) {
        cur.x = p.x;
        // a hand never sweeps on a ruler: a soft drift in height
        cur.y = p.y + Math.sin(e * Math.PI * 1.6 + a) * 7;
      }
    }
    const hit = document.elementFromPoint(cur.x, cur.y);
    setHover(hit && hit.closest ? hit.closest('button') : null);
    draw();
    return { ...cur };
  }

  // a move lands exactly on its (live) target
  function finish(s) {
    if (s[0] === 'move') {
      const to = resolve(s[1]);
      if (to) {
        cur.x = to.x;
        cur.y = to.y;
      }
    } else if (s[0] === 'sweep') {
      const p = target('slot', s[1][1]);
      if (p) {
        cur.x = p.x;
        cur.y = p.y + Math.sin(Math.PI * 1.6 + s[1][0]) * 7;
      }
    }
  }

  return {
    start,
    stop,
    step,
    get playing() {
      return playing;
    },
    get done() {
      return done;
    },
    get pos() {
      return { ...cur };
    },
    get visible() {
      return alpha > 0;
    },
  };
}
