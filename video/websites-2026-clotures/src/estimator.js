// The working estimator of chapter 3: model chips, length slider, height chips, gate stepper,
// a live SVG elevation of the fence and the dark result card. The maths live in pricing.js.
import { TYPES } from './styles-data.js';
import { estimate, rangeHTML, sizeLine, gatesLine, daysLine, tallest, LENGTH, GATES } from './pricing.js';
import { NNBSP, metres2 } from './format.js';

// ------------------------------------------------------------------ drawing
const VB_W = 1000;
const GROUND = 190; // ground line (viewBox units)
const H_MAX = 1.8; // the tallest fence fills TOP_SPACE
const TOP_SPACE = 150;
const SY = TOP_SPACE / H_MAX; // vertical units per metre
const X0 = 104; // fence area (room on the left for the height dimension)
const X1 = 972;
const C = { o: '#ee7a2f', o2: '#f39457', o3: '#f6b07f', r: '#c2632b', r2: '#a9521f', w: '#fffaf2', ink: '#15171a' };

const r1 = (x) => Math.round(x * 10) / 10;

function patterns(sx) {
  // pattern widths follow the horizontal scale, with a floor so that long fences stay legible
  const px = (m, min) => Math.max(min, m * sx);
  const bw = px(0.14, 3.2), bp = px(0.12, 2.8);
  const pv = px(0.16, 4);
  const mw = px(0.1, 3.4);
  const gs = px(0.095, 3.6), gw = Math.max(1.4, gs * 0.48);
  return `<defs>
<pattern id="p-bois" patternUnits="userSpaceOnUse" width="${r1(2 * bp)}" height="400"><rect x="0" y="0" width="${r1(bw)}" height="400" fill="${C.r}"/><rect x="${r1(bp)}" y="0" width="${r1(bw)}" height="400" fill="${C.o}"/><rect x="${r1(bp)}" y="0" width="${r1(Math.max(0.8, bw * 0.12))}" height="400" fill="${C.o3}"/></pattern>
<pattern id="p-pvc" patternUnits="userSpaceOnUse" width="${r1(pv)}" height="400"><rect width="${r1(pv)}" height="400" fill="${C.w}"/><rect x="${r1(pv - 1)}" width="1" height="400" fill="rgba(238,122,47,0.32)"/></pattern>
<pattern id="p-rigide" patternUnits="userSpaceOnUse" width="${r1(mw)}" height="${r1(0.2 * SY)}"><rect x="0" width="1.4" height="${r1(0.2 * SY)}" fill="${C.r}"/><rect y="0" width="${r1(mw)}" height="1.4" fill="${C.r}"/></pattern>
<pattern id="p-grillage" patternUnits="userSpaceOnUse" width="9" height="9"><path d="M0 0L9 9M9 0L0 9" stroke="rgba(194,99,43,0.42)" stroke-width="0.8"/></pattern>
<pattern id="p-ganivelle" patternUnits="userSpaceOnUse" width="${r1(gs)}" height="400"><rect width="${r1(gw)}" height="400" fill="${C.o}"/></pattern>
<pattern id="d-hatch" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)"><rect width="1" height="7" fill="rgba(21,23,26,0.12)"/></pattern>
</defs>`;
}

function infill(type, x, w, H, sx) {
  const top = GROUND - H * SY;
  const h = H * SY;
  switch (type) {
    case 0: // board-on-board with a cap rail
      return `<rect x="${r1(x)}" y="${r1(top + 4)}" width="${r1(w)}" height="${r1(h - 4)}" fill="url(#p-bois)"/>`;
    case 1: // PVC: white boards, a top rail, an orange outline
      return `<rect x="${r1(x)}" y="${r1(top + 7)}" width="${r1(w)}" height="${r1(h - 7)}" fill="url(#p-pvc)" stroke="${C.o}" stroke-width="1.4"/><rect x="${r1(x)}" y="${r1(top)}" width="${r1(w)}" height="7" fill="${C.w}" stroke="${C.o}" stroke-width="1.4"/>`;
    case 2: { // rigid mesh panel with two V-folds, a little above the ground
      const y0 = top + 3, y1 = GROUND - 0.06 * SY;
      const f1 = y0 + (y1 - y0) * 0.3, f2 = y0 + (y1 - y0) * 0.72;
      return `<rect x="${r1(x)}" y="${r1(y0)}" width="${r1(w)}" height="${r1(y1 - y0)}" fill="url(#p-rigide)"/><rect x="${r1(x)}" y="${r1(y0)}" width="${r1(w)}" height="${r1(y1 - y0)}" fill="none" stroke="${C.r}" stroke-width="1.6"/><path d="M${r1(x)} ${r1(f1)}h${r1(w)}M${r1(x)} ${r1(f1 + 4)}h${r1(w)}M${r1(x)} ${r1(f2)}h${r1(w)}M${r1(x)} ${r1(f2 + 4)}h${r1(w)}" stroke="${C.r}" stroke-width="1.6"/>`;
    }
    case 3: { // ranch: three rails, wire mesh on the garden side
      const rh = Math.max(4, 0.13 * SY);
      let s = `<rect x="${r1(x)}" y="${r1(top + 0.08 * SY)}" width="${r1(w)}" height="${r1(h - 0.1 * SY)}" fill="url(#p-grillage)"/>`;
      for (const f of [0.1, 0.48, 0.86]) s += `<rect x="${r1(x - 2)}" y="${r1(top + h * f - rh / 2)}" width="${r1(w + 4)}" height="${r1(rh)}" rx="1" fill="${C.r2}"/>`;
      return s;
    }
    default: { // ganivelle: split chestnut stakes on twisted wires
      let s = `<rect x="${r1(x)}" y="${r1(top + 6)}" width="${r1(w)}" height="${r1(h - 6)}" fill="url(#p-ganivelle)"/>`;
      // pointed tops along the bay
      const gs = Math.max(3.6, 0.095 * sx), gw = Math.max(1.4, gs * 0.48);
      let d = '';
      const n = Math.floor(w / gs);
      if (gs >= 5) for (let i = 0; i < n; i++) { const a = x + i * gs; d += `M${r1(a)} ${r1(top + 6)}L${r1(a + gw / 2)} ${r1(top)}L${r1(a + gw)} ${r1(top + 6)}Z`; }
      if (d) s += `<path d="${d}" fill="${C.o}"/>`;
      for (const f of [0.16, 0.52, 0.86]) s += `<path d="M${r1(x)} ${r1(top + h * f)}h${r1(w)}" stroke="${C.r2}" stroke-width="2"/>`;
      return s;
    }
  }
}

function gate(type, x, w, H) {
  // a portillon reads at any length: cream leaf, orange frame, Z brace, black latch
  const top = GROUND - H * SY + 2, y1 = GROUND - 0.05 * SY;
  const h = y1 - top;
  const frame = type === 1 ? C.o : C.r2;
  return `<g><rect x="${r1(x)}" y="${r1(top)}" width="${r1(w)}" height="${r1(h)}" rx="2" fill="${C.w}" stroke="${frame}" stroke-width="2.2"/>` +
    `<path d="M${r1(x + 2)} ${r1(top + h * 0.18)}h${r1(w - 4)}M${r1(x + 2)} ${r1(top + h * 0.82)}h${r1(w - 4)}M${r1(x + 3)} ${r1(top + h * 0.82)}L${r1(x + w - 3)} ${r1(top + h * 0.18)}" stroke="${C.o}" stroke-width="3" stroke-linecap="round" fill="none"/>` +
    `<rect x="${r1(x + w - 7)}" y="${r1(top + h * 0.47)}" width="4" height="${r1(Math.max(6, h * 0.08))}" rx="1" fill="${C.ink}"/></g>`;
}

export function drawFence({ type, length, height, gates, labelLength = length, labelHeight = height }) {
  const L = Math.max(1, length);
  const sx = Math.min((X1 - X0) / L, SY); // never stretched wider than tall
  const span = L * sx;
  const x0 = X0 + ((X1 - X0) - span) / 2;
  const nb = Math.max(1, Math.round(L / 2)); // bays of about 2 m
  const bayW = span / nb;
  const pw = Math.max(5, 0.11 * sx);
  const H = height;
  const postTop = GROUND - (H + (type === 2 ? 0.02 : 0.07)) * SY;
  // the gates take the first metre of evenly spread bays (portillons of about 1 m)
  const gateBays = new Set();
  for (let k = 0; k < gates; k++) gateBays.add(Math.min(nb - 1, Math.floor(((k + 0.5) * nb) / gates)));
  let body = '';
  const posts = [];
  for (let i = 0; i < nb; i++) {
    const a = x0 + i * bayW + pw / 2, b = x0 + (i + 1) * bayW - pw / 2;
    if (gateBays.has(i)) {
      const gw = Math.min(b - a - 2, Math.max(28, 1.0 * sx));
      body += gate(type, a + 1, gw - 2, H);
      const gp = a + gw + pw / 2;
      posts.push(gp);
      if (b - (gp + pw / 2) > 1.5) body += infill(type, gp + pw / 2, b - (gp + pw / 2), H, sx);
    } else body += infill(type, a, b - a, H, sx);
  }
  for (let i = 0; i <= nb; i++) posts.push(x0 + i * bayW);
  let postPath = '';
  const ph = GROUND - postTop;
  for (const px of posts) postPath += `M${r1(px - pw / 2)} ${r1(postTop)}h${r1(pw)}v${r1(ph)}h${r1(-pw)}Z`;
  const postFill = type === 1 ? C.w : C.r;
  const postStroke = type === 1 ? ` stroke="${C.o}" stroke-width="1.4"` : '';
  let cap = '';
  if (type === 0) cap = `<rect x="${r1(x0 - pw / 2 - 2)}" y="${r1(GROUND - H * SY - 1)}" width="${r1(span + pw + 4)}" height="6" rx="1.5" fill="${C.r2}"/>`;
  // dimensions
  const dimY = 222;
  const xa = x0, xb = x0 + span, xm = (xa + xb) / 2;
  const lenTxt = `${Math.round(labelLength)}${NNBSP}m`;
  const hTxt = `${metres2(labelHeight)}${NNBSP}m`;
  const hx = x0 - 26, hTop = GROUND - H * SY;
  const dims = `<path class="d-dim" d="M${r1(xa)} ${dimY - 6}v12M${r1(xb)} ${dimY - 6}v12M${r1(xa)} ${dimY}H${r1(xm - 34)}M${r1(xm + 34)} ${dimY}H${r1(xb)}"/>` +
    `<text class="d-txt" x="${r1(xm)}" y="${dimY + 5}" text-anchor="middle">${lenTxt}</text>` +
    `<path class="d-dim" d="M${r1(hx - 6)} ${r1(hTop)}h12M${r1(hx - 6)} ${GROUND}h12M${r1(hx)} ${r1(hTop)}V${GROUND}"/>` +
    `<text class="d-txt" x="${r1(hx - 12)}" y="${r1((hTop + GROUND) / 2 + 5)}" text-anchor="end">${hTxt}</text>`;
  return patterns(sx) +
    `<rect class="d-soil" x="${r1(x0 - 30)}" y="${GROUND}" width="${r1(span + 60)}" height="12"/>` +
    `<g class="d-body">${body}${cap}<path d="${postPath}" fill="${postFill}"${postStroke}/></g>` +
    `<path class="d-ground" d="M${r1(x0 - 30)} ${GROUND}H${r1(x0 + span + 30)}"/>` + dims;
}

// ------------------------------------------------------------------ UI
export function createEstimator({ onChange } = {}) {
  const $ = (id) => document.getElementById(id);
  const svg = $('est-svg');
  const typeChips = [...document.querySelectorAll('#chips-type .chip')];
  const heightBox = $('chips-height');
  const len = $('len');
  const lenOut = $('len-out');
  const gatesOut = $('gates-out');
  const minus = $('gates-minus'), plus = $('gates-plus');
  const resRange = $('res-range'), resSize = $('res-size'), resGates = $('res-gates'), resDays = $('res-days');

  const st = { type: 0, length: LENGTH.def, height: tallest(0), gates: GATES.def };
  const shown = { length: st.length, height: st.height, lo: 0, hi: 0, type: -1, gates: -1 };
  const tween = { lo: { from: 0, to: 0 }, hi: { from: 0, to: 0 }, t: 1 };
  let drawDirty = true;
  let popType = false;

  function renderHeights() {
    const hs = TYPES[st.type].heights;
    heightBox.innerHTML = hs
      .map((h) => `<button class="chip${h === st.height ? ' is-on' : ''}" type="button" role="radio" aria-checked="${h === st.height}" data-h="${h}">${metres2(h)}${NNBSP}m</button>`)
      .join('');
  }
  function setFill() {
    const f = ((st.length - LENGTH.min) / (LENGTH.max - LENGTH.min)) * 100;
    len.style.setProperty('--fill', `${f.toFixed(2)}%`);
  }
  function recompute(animate = true) {
    const e = estimate(st);
    resSize.textContent = sizeLine(st.length, st.height);
    resGates.textContent = gatesLine(st.gates);
    resDays.textContent = daysLine(e.daysLo, e.daysHi);
    lenOut.textContent = `${st.length}${NNBSP}m`;
    gatesOut.textContent = String(st.gates);
    minus.disabled = st.gates <= GATES.min;
    plus.disabled = st.gates >= GATES.max;
    if (animate && tween.t >= 0) {
      tween.lo.from = shown.lo;
      tween.hi.from = shown.hi;
      tween.t = 0;
    } else {
      tween.t = 1;
      shown.lo = e.lo;
      shown.hi = e.hi;
      resRange.innerHTML = rangeHTML(e.lo, e.hi);
    }
    tween.lo.to = e.lo;
    tween.hi.to = e.hi;
    drawDirty = true;
    onChange && onChange({ ...st, ...e });
  }

  function setType(i, animate = true) {
    if (i === st.type) return;
    st.type = i;
    st.height = tallest(i);
    typeChips.forEach((c, k) => {
      c.classList.toggle('is-on', k === i);
      c.setAttribute('aria-checked', String(k === i));
    });
    renderHeights();
    popType = true;
    recompute(animate);
  }

  typeChips.forEach((c) => c.addEventListener('click', () => setType(+c.dataset.i)));
  heightBox.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    st.height = parseFloat(b.dataset.h);
    [...heightBox.children].forEach((c) => {
      const on = c === b;
      c.classList.toggle('is-on', on);
      c.setAttribute('aria-checked', String(on));
    });
    recompute();
  });
  len.addEventListener('input', () => {
    st.length = Math.round(+len.value);
    setFill();
    recompute();
  });
  minus.addEventListener('click', () => {
    if (st.gates > GATES.min) st.gates--;
    recompute();
  });
  plus.addEventListener('click', () => {
    if (st.gates < GATES.max) st.gates++;
    recompute();
  });

  len.value = String(st.length);
  setFill();
  renderHeights();
  recompute(false);

  const fmtTween = (v) => Math.round(v / 10) * 10;
  // per frame while the section is near the screen (dt in s; snap = no animation, for stills)
  function update(dt, snap = false) {
    // numbers: a short ease-out count to the new range
    if (tween.t < 1) {
      tween.t = snap ? 1 : Math.min(1, tween.t + dt / 0.55);
      const k = 1 - Math.pow(1 - tween.t, 3);
      shown.lo = tween.t >= 1 ? tween.lo.to : fmtTween(tween.lo.from + (tween.lo.to - tween.lo.from) * k);
      shown.hi = tween.t >= 1 ? tween.hi.to : fmtTween(tween.hi.from + (tween.hi.to - tween.hi.from) * k);
      resRange.innerHTML = rangeHTML(shown.lo, shown.hi);
    }
    // drawing: length and height glide to the new values
    const kk = snap ? 1 : 1 - Math.exp(-dt * 11);
    const dl = st.length - shown.length, dh = st.height - shown.height;
    if (Math.abs(dl) > 0.02 || Math.abs(dh) > 0.0005) {
      shown.length = Math.abs(dl) < 0.05 ? st.length : shown.length + dl * kk;
      shown.height = Math.abs(dh) < 0.001 ? st.height : shown.height + dh * kk;
      drawDirty = true;
    } else if (shown.length !== st.length || shown.height !== st.height) {
      shown.length = st.length;
      shown.height = st.height;
      drawDirty = true;
    }
    if (shown.gates !== st.gates || shown.type !== st.type) drawDirty = true;
    if (!drawDirty) return;
    drawDirty = false;
    shown.gates = st.gates;
    shown.type = st.type;
    // the dimension labels show the chosen values, the geometry glides to them
    svg.innerHTML = drawFence({ type: st.type, length: shown.length, height: shown.height, gates: st.gates, labelLength: st.length, labelHeight: st.height });
    if (popType && !snap) {
      popType = false;
      const body = svg.querySelector('.d-body');
      if (body) body.classList.add('d-pop');
    }
  }

  return { setType, update, get state() { return { ...st, ...estimate(st) }; } };
}
