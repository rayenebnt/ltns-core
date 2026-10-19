/* ============================================================
   Moteur commun des vidéos « nouveau format » (semaine 1 et suivantes)
   ------------------------------------------------------------
   Chaque page (tiktok.html, pc.html) déclare sa scène puis appelle :

     LTNS.start({
       sentences,          // [{ chunks: [['texte', 'mot en couleur'], …] }, …] : une phrase par fichier de voix
       cues,               // { nom: [phrase, 'mot' | fraction, décalage en s, 'son'?] }
       spoken,             // { '490': 'quatre cent quatre-vingt-dix' } : ce que la voix dit vraiment
       tail,               // durée après la dernière phrase (retour à l'image 0)
       lead,               // décalage du contenu (pré-roll de la version PC), 0 par défaut
       render(t, k),       // dessine l'instant t ; k = { C, TIMES, WORDS, … }
       extraEvents(C, T),  // sons en plus : [{ t, sfx }]
     })

   Le minutage vient de timing.json (sync-voice.py) ; les sons sont lus par render.mjs (window.TL).
   Modes : ?render (rendu MP4), ?t=12.5 (image figée), ?audio (lecture avec la voix).
   ============================================================ */
(function () {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
  const backOut = (p, s = 1.8) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2)
  const easeInOut = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
  const easeOut = p => 1 - Math.pow(1 - p, 3)
  const easeIn = p => p * p * p
  const pop = (t, t0, dur = 0.28) => { const p = clamp((t - t0) / dur); return p <= 0 ? 0 : backOut(p) }
  const ramp = (t, t0, dur) => clamp((t - t0) / dur)
  const pulse = (t, t0, dur) => { const p = (t - t0) / dur; return p <= 0 || p >= 1 ? 0 : Math.sin(Math.PI * p) }
  const lerp = (a, b, k) => a + (b - a) * k
  const mix = (a, b, k) => a.map((v, j) => Math.round(v + (b[j] - v) * k))
  const rgb = c => `rgb(${c[0]}, ${c[1]}, ${c[2]})`
  const rgba = (c, a) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`
  const $ = id => document.getElementById(id)
  const qa = (sel, root = document) => [...root.querySelectorAll(sel)]
  function setT(el, op, tr) { el.style.opacity = op; el.style.transform = tr || 'none' }
  const cache = new Map()
  function setHTML(el, html) { if (cache.get(el) !== html) { el.innerHTML = html; cache.set(el, html) } }
  function rand(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647 }
  function offsetIn(el, root) {
    let x = 0, y = 0
    for (let n = el; n && n !== root; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop }
    return { x, y }
  }

  // Les mots se répartissent sur le temps de parole réel (silences exclus), puis se calent sur les pauses
  function buildWords(sentences, TIMES, spoken) {
    const spokenLength = w => Object.entries(spoken || {}).reduce((x, [k, v]) => x.split(k).join(v), w).replace(/[^\p{L}\p{N}]/gu, '').length
    return sentences.map((s, si) => {
      const { start, end } = TIMES[si]
      const words = []
      s.chunks.forEach(([text, hl], ci) => text.replace(/ ([:;?!])/g, ' $1').split(' ').forEach(w => words.push({ w, ci, hl: w.split(' ')[0] === hl })))
      const weights = words.map(x => spokenLength(x.w) + 2)
      const total = weights.reduce((a, b) => a + b, 0)
      const gaps = (TIMES[si].pauses || []).filter(p => p[1] - p[0] >= 0.12 && p[0] > start && p[1] < end)
      const speech = []
      let a0 = start
      gaps.forEach(p => { speech.push([a0, p[0]]); a0 = p[1] })
      speech.push([a0, end])
      const talk = speech.reduce((x, [a, b]) => x + b - a, 0)
      const at = u => { let r = u * talk; for (const [a, b] of speech) { if (r <= b - a) return a + r; r -= b - a } return end }
      let acc = 0
      words.forEach((x, i) => { x.t0 = at(acc / total); acc += weights[i]; x.t1 = at(acc / total) })
      snapToPauses(words, weights, TIMES[si])
      return words
    })
  }

  function snapToPauses(words, weights, { start, end, pauses }) {
    if (!pauses || !pauses.length) return
    const P = pauses.filter(p => p[1] - p[0] >= 0.12 && p[0] > start + 0.15 && p[1] < end - 0.1)
    const A = words.map((x, i) => (i < words.length - 1 && /[,:;.?!…]$/.test(x.w) ? i : -1)).filter(i => i >= 0)
    if (!P.length || !A.length) return
    const n = A.length, m = P.length
    const SKIP_ANCHOR = 0.35, skipPause = j => Math.max(0, P[j][1] - P[j][0] - 0.12) * 3
    const cost = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity))
    const from = Array.from({ length: n + 1 }, () => Array(m + 1).fill(null))
    cost[0][0] = 0
    for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
      const c = cost[i][j]
      if (c === Infinity) continue
      if (i < n && c + SKIP_ANCHOR < cost[i + 1][j]) { cost[i + 1][j] = c + SKIP_ANCHOR; from[i + 1][j] = [i, j, false] }
      if (j < m && c + skipPause(j) < cost[i][j + 1]) { cost[i][j + 1] = c + skipPause(j); from[i][j + 1] = [i, j, false] }
      if (i < n && j < m) {
        const d = Math.abs(P[j][0] - words[A[i]].t1)
        if (d < 1.2 && c + d < cost[i + 1][j + 1]) { cost[i + 1][j + 1] = c + d; from[i + 1][j + 1] = [i, j, true] }
      }
    }
    const pairs = []
    for (let i = n, j = m; i > 0 || j > 0;) {
      const [pi, pj, matched] = from[i][j]
      if (matched) pairs.unshift([A[pi], P[pj]])
      i = pi; j = pj
    }
    const bounds = [{ i: -1, next: start }, ...pairs.map(([i, p]) => ({ i, at: p[0], next: p[1] })), { i: words.length - 1, at: end }]
    for (let b = 1; b < bounds.length; b++) {
      const lo = bounds[b - 1].i + 1, hi = bounds[b].i
      const t0 = bounds[b - 1].next, t1 = bounds[b].at
      const tot = weights.slice(lo, hi + 1).reduce((x, y) => x + y, 0)
      let acc = 0
      for (let k = lo; k <= hi; k++) { words[k].t0 = t0 + (acc / tot) * (t1 - t0); acc += weights[k]; words[k].t1 = t0 + (acc / tot) * (t1 - t0) }
    }
  }

  // Sous-titre : la phrase entière d'un coup (lisible sans le son), le mot en cours surligné
  function caption(el, t, k, { from = 0, hide = false } = {}) {
    const { TIMES, WORDS } = k
    let si = -1
    for (let i = 0; i < TIMES.length; i++) if (t >= TIMES[i].start - 0.08) si = i
    if (hide || si < 0 || t < from || t > TIMES[si].end + 0.35) { setHTML(el, ''); return }
    const words = WORDS[si]
    const html = words.map(x => {
      const said = t >= x.t0 - 0.03
      return `<span class="w${x.hl ? ' hl' : ''}${said ? ' on' : ''}">${x.w}</span>`
    }).join(' ')
    setHTML(el, html)
    const p = pop(t, Math.max(from, TIMES[si].start - 0.08), 0.22)
    el.style.transform = `translateY(${(1 - clamp(p)) * 24}px) scale(${0.94 + 0.06 * clamp(p)})`
  }

  async function start(cfg) {
    const has = window.VOICE_FILES || []
    let TIMES = null, ENVELOPE = null
    if (has.includes('timing.json')) TIMES = (await (await fetch('timing.json', { cache: 'no-store' })).json()).sentences
    if (has.includes('envelope.json')) ENVELOPE = (await (await fetch('envelope.json', { cache: 'no-store' })).json()).values
    if (!TIMES) {
      let t = 0.1
      TIMES = cfg.sentences.map(s => { const d = Math.max(1.2, s.chunks.map(c => c[0]).join(' ').length / 15); const r = { start: t, end: t + d }; t += d + 0.25; return r })
    }
    const lead = cfg.lead || 0
    if (lead) TIMES = TIMES.map(s => ({ start: s.start + lead, end: s.end + lead, pauses: (s.pauses || []).map(p => [p[0] + lead, p[1] + lead]) }))
    const WORDS = buildWords(cfg.sentences, TIMES, cfg.spoken)
    const norm = w => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
    const C = {}
    for (const [key, [si, f, off = 0]] of Object.entries(cfg.cues)) {
      const at = fr => TIMES[si].start + fr * (TIMES[si].end - TIMES[si].start)
      if (typeof f === 'string') {
        const word = WORDS[si].find(x => norm(x.w) === norm(f))
        if (!word) console.warn('mot introuvable :', key, f)
        C[key] = (word ? word.t0 : at(0)) + off
      } else C[key] = at(f) + off
    }
    C.end = TIMES[TIMES.length - 1].end
    C.loop = C.end + 0.1
    const duration = C.end + (cfg.tail != null ? cfg.tail : 0.7)
    const TL = []
    for (const [key, cue] of Object.entries(cfg.cues)) if (typeof cue[3] === 'string') TL.push({ t: C[key], sfx: cue[3], cue: key })
    if (cfg.extraEvents) TL.push(...cfg.extraEvents(C, TIMES))
    TL.sort((a, b) => a.t - b.t)
    const mouth = t => ENVELOPE ? clamp(((ENVELOPE[Math.round((t - lead) * 30)] || 0) - 0.06) * 1.6) : 0
    const k = { C, TIMES, WORDS, duration, mouth, lead }
    window.TL = TL
    window.DURATION = duration
    window.K = k
    window.renderAt = t => cfg.render(t, k)
    window.settle = cfg.settle || (() => Promise.resolve())
    if (cfg.ready) await cfg.ready(k)
    await document.fonts.ready

    const stage = $('stage')
    const q = new URLSearchParams(location.search)
    if (q.has('render')) { stage.style.cssText += ';left:0;top:0;transform:none'; window.READY = true; return }
    const fit = () => { const s = Math.min(innerWidth / stage.offsetWidth, innerHeight / stage.offsetHeight); stage.style.transform = `translate(-50%, -50%) scale(${s})` }
    fit(); addEventListener('resize', fit)
    if (q.has('t')) { window.renderAt(+q.get('t')); return }
    const audio = q.has('audio') ? new Audio('voice.mp3') : null
    if (audio) { audio.loop = true; audio.play().catch(() => {}) }
    const t0 = performance.now()
    const loop = () => { window.renderAt(audio ? audio.currentTime + lead : ((performance.now() - t0) / 1000) % duration); requestAnimationFrame(loop) }
    loop()
  }

  window.LTNS = { clamp, easeInOut, easeOut, easeIn, pop, ramp, pulse, lerp, mix, rgb, rgba, $, qa, setT, setHTML, rand, offsetIn, caption, start }
})()
