// The headline reveal (Balancier's twist): the words of a headline tick in one after another on the
// beat of a 4 Hz balance (one word every 125 ms of the reveal), each rising from its own mask with a
// crisp, slightly overshooting « tick » ease. set(v) takes the reveal's progress (0..1): the caller
// drives it from the beat's progress (scrubbing back hides the words), so it stays deterministic.
import { clamp, styler } from './util.js';

export const TICK = 0.125; // s between two words: one beat of a 4 Hz balance
export const WORD = 0.3; // s for one word to rise from its mask
const C1 = 1.25, C3 = C1 + 1; // overshoot ≈ 4 % of the rise, then it settles
export const tickEase = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 + C3 * Math.pow(k - 1, 3) + C1 * Math.pow(k - 1, 2));

// el: the headline element; lines: texts.js lines (one block line each, never wrapped)
export function createTick(el, lines) {
  el.textContent = '';
  const words = [];
  for (const line of lines) {
    const ln = document.createElement('span');
    ln.className = 'ln';
    const parts = line.split(' ');
    parts.forEach((word, j) => {
      const w = document.createElement('span');
      w.className = 'w';
      const wi = document.createElement('span');
      wi.className = 'wi';
      wi.textContent = word;
      w.appendChild(wi);
      ln.appendChild(w);
      if (j < parts.length - 1) ln.appendChild(document.createTextNode(' '));
      words.push(styler(wi));
    });
    el.appendChild(ln);
  }
  const n = words.length;
  // the whole reveal, in seconds of the beat: the last word starts (n - 1) ticks after the first
  const dur = (n - 1) * TICK + WORD;
  let last = -1;
  function set(v) {
    v = clamp(v);
    if (v === last) return;
    last = v;
    const t = v * dur;
    for (let i = 0; i < n; i++) {
      const s = words[i];
      const k = clamp((t - i * TICK) / WORD);
      if (k >= 1) {
        s('transform', 'none');
        s('opacity', '1');
        continue;
      }
      const e = tickEase(k);
      s('transform', `translate3d(0, ${((1 - e) * 108).toFixed(2)}%, 0)`);
      s('opacity', k <= 0 ? '0' : Math.min(1, k * 3.2).toFixed(3));
    }
  }
  set(0);
  return { set, dur, length: n };
}
