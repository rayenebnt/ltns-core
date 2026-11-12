// The letter reveal: headlines appear like a station departure board. Each letter flips through a
// few seeded characters before settling, left to right, driven by a progress value r (0..1): the
// same r always gives the same letters, and lowering r un-reveals them (scrubbing backwards).
// The real text stays in the DOM at all times (textContent is always exact, U+202F included):
// a letter in flight hides its own glyph (transparent, so the line never reflows) and shows the
// seeded character in an ::after drawn from its data-s attribute (style.css .ch).
import { clamp, hash3 } from './util.js';

// mid-width glyphs only (no I, M, W, 1, #...): a letter in flight never spills far over its
// neighbours in the condensed display face
const SCRAMBLE = 'ABCDEFGHKLNOPRSTUVXYZ023456789';
const BOARD_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const NN = ' ';

// splits text into word spans (they wrap as words) made of letter spans; spaces stay plain text
// nodes so lines can break there, the narrow no-break space stays inside its word
function build(parent, text, cells) {
  const words = text.split(' ');
  words.forEach((w, wi) => {
    if (wi > 0) parent.appendChild(document.createTextNode(' '));
    if (!w) return;
    const ws = document.createElement('span');
    ws.className = 'w';
    for (const c of w) {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = c;
      ws.appendChild(s);
      // (the narrow no-break space before ? ! : ; and inside « » never flips)
      cells.push({ el: s, c, fixed: c === NN || c === ' ', state: -2, sc: '' });
    }
    parent.appendChild(ws);
  });
}

// el: the headline element; lines: one string per line (each becomes a block span)
// opts: seed, flips (seeded characters per letter), lead (letters in flight at once)
export function createFlap(el, lines, opts = {}) {
  const seed = opts.seed || 1;
  const flips = opts.flips || 3;
  const lead = opts.lead || 6;
  const cells = [];
  el.textContent = '';
  (Array.isArray(lines) ? lines : [lines]).forEach((line) => {
    const ln = document.createElement('span');
    ln.className = 'ln';
    build(ln, line, cells);
    el.appendChild(ln);
  });
  const n = cells.length;
  let last = -1;

  // r = 0: nothing; r = 1: every letter settled. Letter i is in flight while
  // r * (n + lead) - i is in [0, lead): its flip k = floor(u * flips) picks a seeded character
  function set(r) {
    r = clamp(r);
    if (r === last) return;
    last = r;
    const head = r * (n + lead);
    for (let i = 0; i < n; i++) {
      const c = cells[i];
      const u = (head - i) / lead;
      let state, sc = '';
      if (u >= 1 || r >= 1) state = -1; // settled
      else if (u <= 0) state = -3; // not yet
      else if (c.fixed) state = -1;
      else {
        state = Math.min(flips - 1, Math.floor(u * flips));
        sc = SCRAMBLE[Math.floor(hash3(seed, i, state) * SCRAMBLE.length)];
        // never « flip » to the letter itself
        if (sc === c.c.toUpperCase()) sc = SCRAMBLE[(SCRAMBLE.indexOf(sc) + 7) % SCRAMBLE.length];
      }
      if (state === c.state && sc === c.sc) continue;
      c.state = state;
      c.sc = sc;
      if (state === -1) {
        c.el.className = 'ch';
        c.el.removeAttribute('data-s');
      } else if (state === -3) {
        c.el.className = 'ch is-off';
        c.el.removeAttribute('data-s');
      } else {
        c.el.className = 'ch is-scr';
        c.el.setAttribute('data-s', sc);
      }
    }
  }
  set(0);
  return { set, get length() { return n; } };
}

// The split-flap board of « Arrivée »: rows [label, value]; every row has the same number of flap
// cells (the longest value), values left-aligned, blank cells after. The rows flip one after the
// other (b: 0..1); each cell runs through `flips` seeded characters, with a short fold of the flap
// at each change, and lands on its letter; the last row (the status) flips longest and lands on
// « LIVRÉ », its light turning from amber to green.
export function createBoard(el, rows, opts = {}) {
  const seed = opts.seed || 7;
  const width = Math.max(...rows.map((r) => [...r[1]].length));
  const R = rows.length;
  el.textContent = '';
  const out = rows.map(([label, value], ri) => {
    const row = document.createElement('div');
    row.className = 'b-row' + (ri === R - 1 ? ' is-status' : '');
    const lab = document.createElement('span');
    lab.className = 'b-label';
    lab.textContent = label;
    const val = document.createElement('span');
    val.className = 'b-value';
    val.setAttribute('aria-label', value);
    const chars = [...value];
    const cells = [];
    for (let j = 0; j < width; j++) {
      const s = document.createElement('span');
      const c = chars[j] || '';
      s.className = 'fl' + (c === '' || c === ' ' ? ' is-blank' : '');
      s.textContent = c;
      val.appendChild(s);
      cells.push({ el: s, c, state: -2, sc: '', fold: -1 });
    }
    row.append(lab, val);
    if (ri === R - 1) {
      const led = document.createElement('i');
      led.className = 'b-led';
      led.setAttribute('aria-hidden', 'true');
      row.appendChild(led);
    }
    el.appendChild(row);
    return { row, cells, n: chars.length, flips: ri === R - 1 ? 9 : 5 };
  });
  let last = -1;

  // b = 0: blank board; b = 1: every value in place, the status on « LIVRÉ »
  function set(b) {
    b = clamp(b);
    if (b === last) return;
    last = b;
    out.forEach((r, ri) => {
      // row windows: [0, .34], [.2, .54], [.4, .74], [.58, 1] (the status row is the longest)
      const a = ri === R - 1 ? 0.58 : ri * 0.2, w = ri === R - 1 ? 0.42 : 0.34;
      const rb = clamp((b - a) / w);
      const lead = 5;
      const head = rb * (r.n + lead);
      r.cells.forEach((c, j) => {
        let state = -1, sc = '', fold = 0;
        if (j >= r.n || c.c === ' ') state = -1;
        else {
          const u = (head - j) / lead;
          if (rb >= 1 || u >= 1) state = -1;
          else if (u <= 0) state = -3;
          else {
            const k = u * r.flips;
            state = Math.min(r.flips - 1, Math.floor(k));
            sc = BOARD_SET[Math.floor(hash3(seed + ri * 31, j, state) * BOARD_SET.length)];
            // the flap folds at each change: 0 at rest, 1 mid-fold
            fold = Math.round(Math.sin(Math.PI * (k - Math.floor(k))) * 4) / 4;
          }
        }
        if (state === c.state && sc === c.sc && fold === c.fold) return;
        c.state = state;
        c.sc = sc;
        c.fold = fold;
        if (state === -1) {
          c.el.className = 'fl' + (c.c === '' || c.c === ' ' ? ' is-blank' : '');
          c.el.removeAttribute('data-s');
          c.el.style.removeProperty('--fold');
        } else if (state === -3) {
          c.el.className = 'fl is-off';
          c.el.removeAttribute('data-s');
          c.el.style.removeProperty('--fold');
        } else {
          c.el.className = 'fl is-scr';
          c.el.setAttribute('data-s', sc);
          c.el.style.setProperty('--fold', String(fold));
        }
      });
      r.row.classList.toggle('is-done', rb >= 1);
    });
  }
  set(0);
  return { set, width };
}
