// Virtual smooth scroll (from Cordeau). The document keeps a real (hidden) scrollbar: the native
// scroll position is the target, and the page follows it through a critically damped spring
// (omega 4.4), so a trackpad flick glides to a stop. Programmatic moves (keys, nav, the rail, the
// tour) drive the native position too, so the scrollbar always agrees with what is on screen.
import { clamp, mix, ease5, monotone } from './util.js';

export const OMEGA = 4.4;

// a wheel gesture: events closer than this belong to it (trackpad momentum included)
const GESTURE_GAP = 220;
// the magnetic end: a scroll that comes to rest a little short of the end of the page (the last
// wheel notch, a short flick) glides the rest of the way after this pause (s), so the closing frame
// of a take is never caught mid-flip; any input cancels the glide
const MAGNET_WAIT = 0.35, MAGNET_DUR = 0.6, MAGNET_REACH = 0.45; // (window heights)

export function createScroller() {
  const st = { y: 0, v: 0, target: 0, max: 1 };
  let motion = null; // { kind: 'tween', from, to, dur, t } | { kind: 'keys', name, fn, dur, t, rebuild }
  let lastSync = null;
  let lastWheel = -1e9;
  const onStop = [];
  // the scroller's own clock (s, from step()), the last user input on it and the direction of the
  // last user gesture (+1 down, -1 up, 0 after a programmatic move: no magnet)
  let clock = 0, lastInput = -1e9, lastDir = 0;
  const touched = () => (lastInput = clock);
  for (const ev of ['touchstart', 'touchmove', 'keydown', 'pointerdown']) window.addEventListener(ev, touched, { passive: true });

  function sync(px) {
    lastSync = Math.round(px);
    window.scrollTo(0, lastSync);
  }
  const now = () => performance.now();
  // a move started while a wheel gesture was still running (a flick's momentum, the browser's
  // smooth wheel scrolling) ignores the rest of that gesture; a new gesture interrupts it
  const begin = (m) => {
    m.ignoreGesture = now() - lastWheel < GESTURE_GAP;
    motion = m;
    lastDir = 0;
  };

  window.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey) return; // a trackpad pinch (ctrl + wheel) is not a scroll: main.js blocks its zoom
      lastInput = clock;
      if (e.deltaY) lastDir = Math.sign(e.deltaY);
      const t = now();
      const sameGesture = t - lastWheel < GESTURE_GAP;
      lastWheel = t;
      if (motion && !(motion.ignoreGesture && sameGesture)) stop();
    },
    { passive: true },
  );

  window.addEventListener(
    'scroll',
    () => {
      // our own scrollTo: nothing to do
      if (lastSync !== null && Math.abs(window.scrollY - lastSync) <= 2) return;
      // during a move, a scroll we did not ask for can only be the tail of a wheel gesture the
      // move ignores (a new gesture, a touch or a key has already stopped the move): keep the
      // move's position
      if (motion && lastSync !== null) {
        window.scrollTo(0, lastSync);
        return;
      }
      lastSync = null;
      const ny = clamp(window.scrollY, 0, st.max);
      if (Math.abs(ny - st.target) > 0.5) lastDir = Math.sign(ny - st.target);
      lastInput = clock;
      st.target = ny;
    },
    { passive: true },
  );

  function stop() {
    if (!motion) return;
    const m = motion;
    motion = null;
    // an interrupted move glides out from where the picture is (the spring's own rest distance,
    // v / ω), instead of running on to the move's next target
    st.target = clamp(st.y + st.v / OMEGA, 0, st.max);
    sync(st.target);
    for (const f of onStop) f(m);
  }

  function tweenTo(px, dur) {
    px = clamp(px, 0, st.max);
    const from = st.target;
    if (Math.abs(px - from) < 1) {
      motion = null;
      return;
    }
    begin({ kind: 'tween', from, to: px, dur: Math.max(0.05, dur), t: 0 });
  }

  // keyed move: keys = [[t, px], ...] (t in s); rebuild() returns fresh keys after a resize
  function play(name, keys, rebuild) {
    const fn = monotone(keys);
    begin({ kind: 'keys', name, fn, dur: keys[keys.length - 1][0], t: 0, rebuild });
  }

  function jump(px) {
    px = clamp(px, 0, st.max);
    motion = null;
    lastDir = 0;
    st.y = st.target = px;
    st.v = 0;
    sync(px);
  }

  function step(dt) {
    clock += dt;
    if (!motion && lastDir > 0 && clock - lastInput > MAGNET_WAIT) {
      const rest = st.max - st.target;
      lastDir = 0;
      if (rest > 0.5 && rest < MAGNET_REACH * innerHeight) tweenTo(st.max, MAGNET_DUR);
    }
    if (motion) {
      if (motion.kind === 'tween') {
        motion.t = Math.min(1, motion.t + dt / motion.dur);
        st.target = mix(motion.from, motion.to, ease5(motion.t));
        sync(st.target);
        if (motion.t >= 1) {
          const m = motion;
          motion = null;
          for (const f of onStop) f(m, true);
        }
      } else {
        motion.t = Math.min(motion.dur, motion.t + dt);
        st.target = clamp(motion.fn(motion.t), 0, st.max);
        sync(st.target);
        if (motion.t >= motion.dur) {
          const m = motion;
          motion = null;
          for (const f of onStop) f(m, true);
        }
      }
    }
    // critically damped spring toward the target (cinematic inertia), sub-stepped for stability
    let rem = Math.min(dt, 0.25);
    while (rem > 1e-6) {
      const h = Math.min(rem, 1 / 120);
      const a = OMEGA * OMEGA * (st.target - st.y) - 2 * OMEGA * st.v;
      st.v += a * h;
      st.y += st.v * h;
      rem -= h;
    }
    if (Math.abs(st.target - st.y) < 0.05 && Math.abs(st.v) < 0.5) {
      st.y = st.target;
      st.v = 0;
    }
  }

  // after a resize: map every stored position through f (old px -> new px)
  function remap(f, max) {
    st.max = Math.max(1, max);
    st.y = clamp(f(st.y), 0, st.max);
    st.target = clamp(f(st.target), 0, st.max);
    st.v = 0;
    if (motion && motion.kind === 'tween') {
      motion.from = f(motion.from);
      motion.to = clamp(f(motion.to), 0, st.max);
    } else if (motion && motion.kind === 'keys' && motion.rebuild) {
      const keys = motion.rebuild();
      motion.fn = monotone(keys);
      motion.dur = keys[keys.length - 1][0];
    }
    sync(st.target);
  }

  return {
    st,
    step,
    tweenTo,
    play,
    jump,
    stop,
    remap,
    sync,
    setMax: (m) => (st.max = Math.max(1, m)),
    get motion() {
      return motion;
    },
    get playing() {
      return motion && motion.kind === 'keys' ? motion.name : null;
    },
    // where the page is heading (for the next key step)
    get heading() {
      return motion && motion.kind === 'tween' ? motion.to : st.target;
    },
    onStop: (f) => onStop.push(f),
  };
}
