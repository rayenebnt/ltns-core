// Price model of the estimator (fictional prices, stated on the page).
// - range per metre at the tallest height of the type: the card prices;
// - one height step lower x0.88, two steps lower x0.76;
// - plus a range per gate (portillon);
// - the low price is rounded down and the high price up to the nearest 50 €;
// - days of work: lo = max(1, round(L / 20)), hi = lo + 1.
// Defaults (bois plein, 40 m, 1,80 m, 1 portillon) give 5 250 € – 7 950 € and « 2 à 3 jours de pose ».
import { TYPES } from './styles-data.js';
import { euros, metres2, NNBSP } from './format.js';

export const LENGTH = { min: 5, max: 120, step: 1, def: 40 };
export const GATES = { min: 0, max: 3, def: 1 };
const STEP_FACTOR = [1, 0.88, 0.76];

export const tallest = (type) => TYPES[type].heights[TYPES[type].heights.length - 1];

// height index from the top (0 = tallest); an unknown height falls back to the nearest listed one
function stepsDown(type, height) {
  const hs = TYPES[type].heights;
  let best = hs.length - 1;
  for (let i = 0; i < hs.length; i++) if (Math.abs(hs[i] - height) < Math.abs(hs[best] - height)) best = i;
  return hs.length - 1 - best;
}

export function estimate({ type, length, height, gates }) {
  const t = TYPES[type];
  const f = STEP_FACTOR[Math.min(2, stepsDown(type, height))];
  // cents first, so that a product such as 25 x 120 x 0.88 never lands a hair under a multiple of 50
  const lo = Math.round((length * t.lo * f + gates * t.gate[0]) * 100) / 100;
  const hi = Math.round((length * t.hi * f + gates * t.gate[1]) * 100) / 100;
  const daysLo = Math.max(1, Math.round(length / 20));
  return { lo: Math.floor(lo / 50) * 50, hi: Math.ceil(hi / 50) * 50, daysLo, daysHi: daysLo + 1 };
}

// « 5 250 € – 7 950 € » (U+202F inside the numbers and before €; plain spaces around the dash,
// the page keeps « 5 250 € – » together so that a wrap can only happen after the dash)
export const rangeText = (lo, hi) => `${euros(lo)} – ${euros(hi)}`;
const wide = (t) => t.replace(/\u202F/g, '<span class="ns">\u202F</span>');
export const rangeHTML = (lo, hi) => `<span class="nw">${wide(euros(lo))} –</span> <span class="nw">${wide(euros(hi))}</span>`;
export const sizeLine = (length, height) => `${Math.round(length)}${NNBSP}m · hauteur ${metres2(height)}${NNBSP}m`;
export const gatesLine = (n) => (n === 0 ? 'Sans portillon' : n === 1 ? '1 portillon' : `${n} portillons`);
export const daysLine = (lo, hi) => `${lo} à ${hi} jours de pose`;
