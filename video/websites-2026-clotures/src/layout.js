// Page geometry of the virtual scroll. Everything is in CSS px of page scroll (y = 0 at the top).
//
//  install pin   [0, A1]                 install 0 -> 1 (canvas full screen, HUD 1)
//  white         top = A1 + V            slides up over the garden (canvas parallax up)
//  intro2        top = white bottom      dark, with a rounded window onto the styles view; its inner
//                                        screen pins for E px while the window grows to full bleed
//  styles pin    [s0, s1], s0 = intro2Top + E   five types, one step each (sweep in the first 30 %)
//  pricing       top = s1 + V            white estimator, slides up over the styles view
//  intro4        top = pricing bottom    dark, slides up and uncovers the repair view
//  repair pin    [r0, r1], r0 = intro4 bottom   repair 0 -> 1 (HUD 4, hotspots)
//  final         top = r1 + V            white, slides up over the repaired fence; end of the page
import { clamp } from './util.js';

export const PIN = { install: 6, styles: 4, repair: 4, expand: 0.9 }; // lengths in screens
export const N_STEPS = 5;
export const SWEEP = 0.3; // share of a style step taken by the sweep from the previous type
export const HOLD = 0.42; // rest position inside a style step (the sweep is over)
export const PARALLAX = 0.42; // the 3D layer moves at this fraction of the page speed under a sliding section
export const RADIUS = 28; // corner radius of the sections that slide over the 3D and of the window

// same as the CSS page margin --m: clamp(24px, 4.2vw, 72px)
export const pageMargin = (W) => Math.min(72, Math.max(24, 0.042 * W));

// window rect of the chapter 2 intro (inside its pinned screen) at expansion e (0 = card, 1 = full bleed)
export function windowRect(L, e) {
  const k = e <= 0 ? 0 : e >= 1 ? 1 : e * e * (3 - 2 * e);
  const w0 = L.win0;
  return {
    x: w0.x * (1 - k),
    y: w0.y * (1 - k),
    w: w0.w + (L.W - w0.w) * k,
    h: w0.h + (L.V - w0.h) * k,
    r: RADIUS * (1 - k),
  };
}

// dom: { white, pricing, intro4, final, intro2Head, sticky } (elements, already laid out)
export function computeLayout(dom) {
  const V = Math.max(1, window.innerHeight);
  const W = Math.max(1, window.innerWidth);
  const L = { V, W };
  L.A1 = Math.round(PIN.install * V);
  L.A2 = Math.round(PIN.styles * V);
  L.A4 = Math.round(PIN.repair * V);
  L.E = Math.round(PIN.expand * V);
  L.whiteTop = L.A1 + V;
  L.whiteH = Math.max(V, Math.ceil(dom.white.offsetHeight));
  L.intro2Top = L.whiteTop + L.whiteH;
  L.s0 = L.intro2Top + L.E;
  L.s1 = L.s0 + L.A2;
  L.pricingTop = L.s1 + V;
  L.pricingH = Math.max(V, Math.ceil(dom.pricing.offsetHeight));
  L.intro4Top = L.pricingTop + L.pricingH;
  L.intro4H = Math.max(V, Math.ceil(dom.intro4.offsetHeight));
  L.r0 = L.intro4Top + L.intro4H;
  L.r1 = L.r0 + L.A4;
  L.finalTop = L.r1 + V;
  L.finalH = V;
  L.total = L.finalTop + L.finalH;
  L.max = L.total - V;
  // the window sits under the intro title, inset by the page margin, down to 5 % of the screen
  const head = dom.intro2Head;
  const headBottom = head.offsetTop + head.offsetHeight;
  const m = pageMargin(W);
  const top = Math.round(Math.min(headBottom + Math.max(28, 0.045 * V), 0.62 * V));
  // the card ends above the sticky bar (which then sits in the dark margin, never across the edge)
  const barTop = dom.sticky && dom.sticky.offsetHeight ? V - 22 - dom.sticky.offsetHeight : Math.round(V * 0.95);
  L.win0 = { x: m, y: top, w: W - 2 * m, h: Math.max(Math.round(0.2 * V), Math.min(Math.round(V * 0.95), barTop - 18) - top) };
  // y at which the window's top edge enters the screen (the canvas must show the styles view)
  L.yWin = L.intro2Top + L.win0.y - V;
  return L;
}

// style state from the styles pin progress s (any real; clamped)
export function styleAt(s) {
  const u = clamp(s) * N_STEPS;
  const step = Math.min(N_STEPS - 1, Math.floor(u));
  if (step === 0) return { from: 0, to: 0, k: 1 };
  const k = clamp((u - step) / SWEEP);
  if (k >= 1) return { from: step, to: step, k: 1 };
  return { from: step - 1, to: step, k };
}

// styles pin progress for a type index v (a fraction is a mid-sweep: 2.5 = halfway from 2 to 3)
export function sOfType(v) {
  v = clamp(v, 0, N_STEPS - 1);
  const i = Math.floor(v + 1e-9);
  const f = v - i;
  if (f < 1e-6) return (i + HOLD) / N_STEPS;
  return (i + 1 + SWEEP * f) / N_STEPS;
}

// named positions -> page px
export function posOf(L, name, v) {
  switch (name) {
    case 'install':
      return clamp(v ?? 0) * L.A1;
    case 'white': // v = 1: the white section fills the screen (its top at the top)
      return L.whiteTop - (1 - clamp(v ?? 1)) * L.V;
    case 'intro2': // v = expansion of the window (0 = rounded card, 1 = full bleed = styles start)
      return L.intro2Top + clamp(v ?? 0) * L.E;
    case 'styles':
      return L.s0 + sOfType(v ?? 0) * L.A2;
    case 'styles-s': // raw styles pin progress 0..1
      return L.s0 + clamp(v ?? 0) * L.A2;
    case 'pricing':
      return L.pricingTop - (1 - clamp(v ?? 1)) * L.V;
    case 'intro4':
      return L.intro4Top - (1 - clamp(v ?? 1)) * L.V;
    case 'repair':
      return L.r0 + clamp(v ?? 0) * L.A4;
    case 'final':
      return L.max;
    default:
      return 0;
  }
}

// Inverse used on resize: a logical position that survives a change of screen height.
export function logicalOf(L, y) {
  const segs = [
    ['install', 0, L.A1],
    ['outW', L.A1, L.whiteTop],
    ['white', L.whiteTop, L.intro2Top],
    ['intro2', L.intro2Top, L.s0],
    ['styles', L.s0, L.s1],
    ['outP', L.s1, L.pricingTop],
    ['pricing', L.pricingTop, L.intro4Top],
    ['intro4', L.intro4Top, L.r0],
    ['repair', L.r0, L.r1],
    ['outF', L.r1, L.finalTop],
  ];
  for (const [name, a, b] of segs) if (y < b) return { name, a, f: b > a ? (y - a) / (b - a) : 0 };
  return { name: 'end', f: 0 };
}
export function yOfLogical(L, lg) {
  const r = {
    install: [0, L.A1],
    outW: [L.A1, L.whiteTop],
    white: [L.whiteTop, L.intro2Top],
    intro2: [L.intro2Top, L.s0],
    styles: [L.s0, L.s1],
    outP: [L.s1, L.pricingTop],
    pricing: [L.pricingTop, L.intro4Top],
    intro4: [L.intro4Top, L.r0],
    repair: [L.r0, L.r1],
    outF: [L.r1, L.finalTop],
  }[lg.name];
  if (!r) return L.max;
  return r[0] + lg.f * (r[1] - r[0]);
}

// What the 3D layer shows at scroll y, and where it sits (the shell's state for world.update).
export function sceneAt(L, y) {
  const install = clamp(y / L.A1);
  const s = (y - L.s0) / L.A2;
  const style = styleAt(s);
  const drift = clamp((y - L.yWin) / Math.max(1, L.s0 - L.yWin));
  const repair = clamp((y - L.r0) / L.A4);
  const e = clamp((y - L.intro2Top) / L.E);
  let seg = 'hidden';
  let shift = 0; // vertical offset of the 3D layer in CSS px (negative = up)
  if (y < L.whiteTop) {
    seg = 'install';
    shift = -PARALLAX * Math.max(0, y - L.A1);
  } else if (y < L.yWin) seg = 'hidden';
  else if (y < L.pricingTop) {
    seg = 'styles';
    shift = -PARALLAX * Math.max(0, y - L.s1);
  } else if (y < L.r0 - L.V - RADIUS) seg = 'hidden';
  else if (y < L.finalTop) {
    seg = 'repair';
    shift = y < L.r0 ? PARALLAX * (L.r0 - y) : -PARALLAX * Math.max(0, y - L.r1);
  }
  return { seg, install, style, drift, repair, s, e, shift };
}

// Surface under a screen row vy (CSS px from the top of the window): 'light', 'dark' or '3d'
export function surfaceAt(L, y, vy) {
  const py = y + vy;
  if (py >= L.whiteTop && py < L.intro2Top) return 'light';
  if (py >= L.pricingTop && py < L.intro4Top) return 'light';
  if (py >= L.finalTop) return 'light';
  if (py >= L.intro4Top && py < L.r0) return 'dark';
  if (py >= L.intro2Top && py < L.intro2Top + L.V + L.E) {
    const e = clamp((y - L.intro2Top) / L.E);
    if (e >= 1) return '3d';
    const pinTop = L.intro2Top + clamp(y - L.intro2Top, 0, L.E);
    const cy = py - pinTop;
    if (cy < 0 || cy > L.V) return '3d';
    const r = windowRect(L, e);
    return cy >= r.y && cy <= r.y + r.h ? '3d' : 'dark';
  }
  return '3d';
}
