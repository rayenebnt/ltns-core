// The shell's state machine and easing timeline: it owns every timing of the WORLD CONTRACT and
// writes ONE state object that the world reads each frame (src/world/index.js adds the secondary
// motion on top: swing, sway, overshoot). Every field is always set.
//
//   view     0..1   rack -> product view, eased over TIMING.open / TIMING.close
//   focus    float slot along the rack (0..7), -1 when nothing is focused; focusOn 0..1 fades
//   active   the garment shown in the product view
//   swap     { from, to, k, dir }  prev/next in the product view (idle: from === to, k = 1)
//   colors   int[8] the selected variant of each garment (the hang tag that is « on »)
//   dye      { garment, from, to, k }  the running dye: dye.from below the rising front,
//            dye.to above it (idle: k = 1 and dye.to === colors[dye.garment])
//   side     0..1 (0 front, 1 back)
//   tagHover int (-1 none), tagPulse int (+1 on each tag click)
//   pointer  { x, y } in -1..1, smoothed
import { PRODUCTS, HERO } from './catalog.js';
import { clamp, mix, damp, approach, bezier } from './util.js';

export const N = PRODUCTS.length;

export const TIMING = {
  open: 1.1, // s, rack -> product view
  close: 1.1, // s, product view -> rack (the reverse)
  swap: 1.0, // s, prev / next garment
  dye: 0.9, // s, the colour rising from the hem to the collar
  side: 0.8, // s, front <-> back (the world adds the overshoot and the swing)
  focus: 0.085, // s, smoothing of the focus slot (the world's own spring gives the 0.35 s turn)
  focusIn: 0.1, // s, time constant of focusOn rising
  focusOut: 0.28, // s, time constant of focusOn fading when the pointer leaves the rack
  pointer: 0.2, // s, time constant of the smoothed pointer
};

// one curve per move, the same as the CSS transitions of the shell (style.css --ease-*)
export const EASE = {
  view: bezier(0.62, 0, 0.22, 1), // leaves promptly, long soft landing
  swap: bezier(0.55, 0, 0.3, 1),
  side: bezier(0.5, 0, 0.3, 1),
  dye: bezier(0.42, 0, 0.4, 1),
};

// a value moved from a to b over dur seconds
function tween(v) {
  return { a: v, b: v, t: 0, dur: 0, ease: (k) => k };
}
const running = (tw) => tw.dur > 0 && tw.t < tw.dur;
const valueOf = (tw) => (running(tw) ? mix(tw.a, tw.b, tw.ease(tw.t / tw.dur)) : tw.b);
function run(tw, a, b, dur, ease) {
  tw.a = a;
  tw.b = b;
  tw.t = 0;
  tw.dur = dur;
  tw.ease = ease;
}
const stop = (tw, v) => {
  tw.a = tw.b = v;
  tw.t = tw.dur = 0;
};

// soft magnet of the pointer slot toward the garment under it: the garment the pointer is on
// faces square, the hand-over to the next one stays continuous (no jump at the midpoint)
export function magnet(slot) {
  const n = Math.round(slot), d = slot - n;
  return n + Math.sign(d) * 0.5 * Math.pow(Math.abs(2 * d), 3);
}

export function createDirector() {
  const s = {
    view: 0,
    focus: -1,
    focusOn: 0,
    active: HERO,
    swap: { from: HERO, to: HERO, k: 1, dir: 1 },
    colors: PRODUCTS.map(() => 0),
    dye: { garment: HERO, from: 0, to: 0, k: 1 },
    side: 0,
    tagHover: -1,
    tagPulse: 0,
    pointer: { x: 0, y: 0 },
  };
  const tw = { view: tween(0), side: tween(0), swap: tween(1), dye: tween(1) };
  const fo = { x: -1, v: 0 }; // the focus spring
  let focusTarget = null; // float slot, or null: nothing focused
  let lastFocused = HERO; // what the caption shows when nothing is focused
  // the caption's garment while focused, with hysteresis: it changes only when the focus is
  // clearly on another garment (v2, ux review: a hand resting on a boundary, ±1.5 px of
  // tremor, rolled the caption 77 times in 90 frames; the two magnets make the focus ~5x as
  // sensitive there). world/index.js applies the same rule to the caption's place
  let capIdx = HERO;
  const CAP_HYST = 0.62;
  let dyeQueue = null; // { garment, to }: a tag clicked while a dye runs plays right after it
  // prev / next pressed during a swap: every press counts (v2: one direction only dropped
  // quick presses); queued swaps run faster so that a burst stays short
  let swapQueue = 0;
  let closeQueued = false;
  const ptrRaw = { x: 0, y: 0 };

  const variantsOf = (i) => PRODUCTS[i].variants.length;

  // ---------------------------------------------------------------- modes
  // rack | opening | product | closing ; input is locked while opening or closing
  function mode() {
    if (running(tw.view)) return tw.view.b > tw.view.a ? 'opening' : 'closing';
    return s.view >= 1 ? 'product' : 'rack';
  }
  const busy = () => running(tw.view);

  // ---------------------------------------------------------------- per frame
  function step(dt) {
    for (const k in tw) if (running(tw[k])) tw[k].t = Math.min(tw[k].dur, tw[k].t + dt);
    s.view = valueOf(tw.view);
    s.side = valueOf(tw.side);

    if (running(tw.swap)) s.swap.k = valueOf(tw.swap);
    else if (tw.swap.b >= 1) {
      s.swap.k = 1;
      s.swap.from = s.swap.to;
    }
    if (running(tw.dye)) s.dye.k = valueOf(tw.dye);
    else if (tw.dye.b >= 1) {
      // (a dye frozen by __set keeps its k: its tween is stopped below 1)
      lastDyed[s.dye.garment] = s.dye.to;
      s.dye.k = 1;
      s.dye.from = s.dye.to;
      if (dyeQueue) {
        const q = dyeQueue;
        dyeQueue = null;
        startDye(q.garment, q.to);
      }
    }
    if (!running(tw.swap) && !busy()) {
      if (swapQueue) {
        const d = Math.sign(swapQueue);
        swapQueue -= d;
        go(d, TIMING.swap * 0.6);
      } else if (closeQueued) {
        closeQueued = false;
        close();
      }
    }

    // focus: appears where it is wanted (no glide in from an old slot), follows with a short
    // critically damped spring, fades out where it was, then reads -1
    if (focusTarget !== null) {
      if (fo.x < 0 || s.focusOn < 0.25) {
        fo.x = focusTarget;
        fo.v = 0;
      }
      damp(fo, focusTarget, dt, TIMING.focus);
      s.focusOn = approach(s.focusOn, 1, dt, TIMING.focusIn);
    } else if (fo.x >= 0) {
      s.focusOn = approach(s.focusOn, 0, dt, TIMING.focusOut);
      damp(fo, Math.round(fo.x), dt, TIMING.focus);
      // (1.5 % of a turn is below what the eye sees; the world's springs hide the last step)
      if (s.focusOn < 0.015) {
        s.focusOn = 0;
        fo.x = -1;
        fo.v = 0;
      }
    } else s.focusOn = 0;
    s.focus = fo.x < 0 ? -1 : clamp(fo.x, 0, N - 1);
    if (s.focus >= 0 && Math.abs(s.focus - capIdx) > CAP_HYST) capIdx = clamp(Math.round(s.focus), 0, N - 1);
    if (s.focus >= 0 && s.focusOn > 0.5) lastFocused = capIdx;

    s.pointer.x = approach(s.pointer.x, ptrRaw.x, dt, TIMING.pointer);
    s.pointer.y = approach(s.pointer.y, ptrRaw.y, dt, TIMING.pointer);
  }

  // ---------------------------------------------------------------- actions
  // (each returns true when it did something; the shell ignores input while busy())
  function setFocusTarget(slot) {
    if (s.view > 0 && mode() !== 'rack') return;
    focusTarget = slot === null || slot === undefined ? null : clamp(slot, 0, N - 1);
  }
  // keyboard / wheel: from the current target, or the caption's garment when nothing is focused
  function focusBase() {
    if (focusTarget !== null) return focusTarget;
    if (s.focus >= 0 && s.focusOn > 0.3) return s.focus;
    return lastFocused;
  }

  function open(i) {
    if (mode() !== 'rack') return false;
    i = clamp(Math.round(i), 0, N - 1);
    s.active = i;
    s.swap.from = s.swap.to = i;
    s.swap.k = 1;
    stop(tw.swap, 1);
    swapQueue = 0;
    focusTarget = i;
    lastFocused = capIdx = i;
    if (fo.x < 0) fo.x = i;
    stop(tw.side, 0);
    s.side = 0;
    s.tagHover = -1;
    run(tw.view, s.view, 1, TIMING.open * (1 - s.view), EASE.view);
    return true;
  }

  function close() {
    const m = mode();
    if (m !== 'product') return false;
    if (running(tw.swap)) {
      closeQueued = true; // after the slide, so the garment that goes back is the one shown
      return true;
    }
    s.tagHover = -1;
    // the garment goes back to its slot, still facing the camera, then the pointer takes over
    focusTarget = s.active;
    fo.x = s.active;
    fo.v = 0;
    s.focusOn = 1;
    lastFocused = capIdx = s.active;
    if (tw.side.b !== 0 || s.side > 0) run(tw.side, s.side, 0, TIMING.close * 0.8, EASE.side);
    run(tw.view, s.view, 0, TIMING.close * s.view, EASE.view);
    return true;
  }

  // prev / next in the product view (dur: a queued swap runs faster)
  function go(dir, dur = TIMING.swap) {
    if (mode() !== 'product') return false;
    dir = dir < 0 ? -1 : 1;
    if (running(tw.swap)) {
      swapQueue = clamp(swapQueue + dir, -(N - 1), N - 1);
      return true;
    }
    const from = s.active, to = (from + dir + N) % N;
    s.swap.from = from;
    s.swap.to = to;
    s.swap.dir = dir;
    s.swap.k = 0;
    s.active = to;
    s.tagHover = -1;
    run(tw.swap, 0, 1, dur, EASE.swap);
    // the next garment arrives showing its front
    if (tw.side.b !== 0 || s.side > 0) run(tw.side, s.side, 0, dur * 0.75, EASE.side);
    return true;
  }

  // the colour each garment shows outside a dye (the dye starts from it)
  const lastDyed = PRODUCTS.map(() => 0);
  function startDye(g, to) {
    const from = lastDyed[g];
    if (from === to) return;
    s.dye.garment = g;
    s.dye.from = from;
    s.dye.to = to;
    s.dye.k = 0;
    run(tw.dye, 0, 1, TIMING.dye, EASE.dye);
  }
  // every tour take starts from the same look: every garment in its first colour (v2, ux
  // review: after a manual rose, or a tour stopped after its rose, the next take skipped a dye)
  function resetLook() {
    PRODUCTS.forEach((p, i) => {
      s.colors[i] = 0;
      lastDyed[i] = 0;
    });
    s.dye.garment = HERO;
    s.dye.from = s.dye.to = 0;
    s.dye.k = 1;
    stop(tw.dye, 1);
    dyeQueue = null;
  }
  function endDye() {
    lastDyed[s.dye.garment] = s.dye.to;
    stop(tw.dye, 1);
    s.dye.k = 1;
    s.dye.from = s.dye.to;
  }

  // a hang tag (variant v of the active garment): the selection (colors) changes at once; the
  // dye plays now, or right after the one running on the same garment (a dye never jumps back)
  function dyeTo(v) {
    if (mode() !== 'product') return false;
    const g = s.active;
    if (!(v >= 0 && v < variantsOf(g))) return false;
    s.tagPulse++;
    const sameRunning = running(tw.dye) && s.dye.garment === g;
    if (s.colors[g] === v && !sameRunning) return true;
    s.colors[g] = v;
    if (sameRunning) dyeQueue = { garment: g, to: v };
    else {
      // a dye still running on the garment that just slid out lands at once
      if (running(tw.dye)) endDye();
      startDye(g, v);
    }
    return true;
  }

  function setSide(b) {
    if (mode() !== 'product') return false;
    const to = b ? 1 : 0;
    if (tw.side.b === to && (running(tw.side) || s.side === to)) return false;
    run(tw.side, s.side, to, TIMING.side * Math.max(0.35, Math.abs(to - s.side)), EASE.side);
    return true;
  }
  const toggleSide = () => setSide(tw.side.b < 0.5);

  function setPointer(x, y) {
    ptrRaw.x = clamp(x, -1, 1);
    ptrRaw.y = clamp(y, -1, 1);
  }

  // ---------------------------------------------------------------- hooks: merge and snap
  // every smoothing lands on its value at once (window.__set / __goto, the quality test)
  function set(p = {}) {
    for (const k of Object.keys(p)) {
      const v = p[k];
      if (k === 'swap' || k === 'dye' || k === 'pointer') Object.assign(s[k], v);
      else if (k === 'colors') v.forEach((c, i) => (s.colors[i] = c));
      else if (k in s) s[k] = v;
    }
    s.view = clamp(+s.view || 0);
    s.side = clamp(+s.side || 0);
    s.active = clamp(Math.round(s.active), 0, N - 1);
    stop(tw.view, s.view);
    stop(tw.side, s.side);
    if (s.swap.k >= 1) {
      s.swap.from = s.swap.to;
      stop(tw.swap, 1);
    } else stop(tw.swap, s.swap.k); // a frozen mid-swap (stills)
    if (s.dye.k >= 1) {
      s.dye.from = s.dye.to;
      stop(tw.dye, 1);
    } else stop(tw.dye, s.dye.k);
    PRODUCTS.forEach((p, i) => (lastDyed[i] = s.colors[i]));
    if (s.dye.k < 1) lastDyed[s.dye.garment] = s.dye.from;
    dyeQueue = null;
    swapQueue = 0;
    closeQueued = false;
    fo.x = s.focus;
    fo.v = 0;
    if (s.focus < 0) s.focusOn = 0;
    focusTarget = s.focus >= 0 && s.focusOn > 0 ? s.focus : null;
    if (s.focus >= 0) capIdx = clamp(Math.round(s.focus), 0, N - 1);
    if (s.focus >= 0 && s.focusOn > 0.5) lastFocused = capIdx;
    ptrRaw.x = s.pointer.x;
    ptrRaw.y = s.pointer.y;
  }

  // a frozen dye or swap (from set) stays frozen: the tweens only run when an action starts them
  return {
    state: s,
    step,
    set,
    mode,
    busy,
    open,
    close,
    go,
    dyeTo,
    setSide,
    toggleSide,
    setFocusTarget,
    focusBase,
    setPointer,
    resetLook,
    magnet,
    get sideTarget() {
      return tw.side.b;
    },
    get focusTarget() {
      return focusTarget;
    },
    // the garment the rack caption names: the focused one, or the last one
    get captionIndex() {
      return s.focus >= 0 && s.focusOn > 0.05 ? capIdx : lastFocused;
    },
    get swapping() {
      return running(tw.swap);
    },
    get dyeing() {
      return running(tw.dye);
    },
  };
}
