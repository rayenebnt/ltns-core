// Captures de la VRAIE maquette Swatter TV (maquette/index.html du dépôt, jamais modifiée), en temps virtuel :
// horloge Playwright + animations CSS calées image par image (Web Animations), hasard figé (neige identique d'une passe à l'autre).
//
//   # 1. la maquette en local (dans un autre terminal ; tuer ce serveur par son PID ensuite)
//   python3 -m http.server 8733 --bind 127.0.0.1 --directory /home/user/rayenebnt/swatter-tv/maquette
//   # 2. captures brutes (PNG) puis conversion
//   node scripts/capture-maquette.mjs /tmp/v03-raw [hero|phone|prog|top|desk ...]
//   python3 -I scripts/prepare-assets.py /tmp/v03-raw /tmp/v03-render/out
//
// Ce qui est masqué par CSS injecté (règles de la vidéo) : le bandeau Flash info (faits divers), la note « 4,5 ★ »
// et le nombre de vues (ordinateur), les cartes météo (« ° »). Rien d'autre n'est changé dans la maquette.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs'
import fs from 'node:fs'

const OUT = process.argv[2] || '/tmp/v03-raw'
const ONLY = process.argv.slice(3)
const URL = 'http://127.0.0.1:8733/index.html#nocookie'
const FPS = 30
const T0 = 3.0 // instant de la maquette qui devient l'image 0 de la vidéo (tout est posé, zoom lent et neige en cours)

const INIT = `
(() => {
  // hasard figé : la neige tombe pareil à chaque passe
  let s = 20261022; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
  // chaque animation CSS / transition est figée puis calée sur l'horloge virtuelle
  window.__vsync = () => {
    const now = performance.now();
    for (const a of document.getAnimations()) {
      if (a.__vt0 === undefined) { a.__vt0 = now; try { a.pause(); } catch (e) {} }
      try { a.currentTime = now - a.__vt0; } catch (e) {}
    }
  };
  window.__kenburns = () => document.getAnimations().filter(a => a.animationName === 'kenburns').map(a => ({ vt0: a.__vt0, img: a.effect && a.effect.target && a.effect.target.getAttribute('src') }));
})();`

const HIDE_ALWAYS = `.ticker, .ck, .rating { visibility: hidden !important; }`
// cartes météo (« ° », « °C ») : jamais à l'écran
const HIDE_METEO = `#meteo, .mini-meteo { visibility: hidden !important; }`
const HIDE_UI = `.hdr, .slide__content, .hero__bottom, .tabbar { visibility: hidden !important; }`
const ONLY_UI = `
html, body, main, .hero { background: transparent !important; }
.slide__media, .hero__glow, .hero__snow, .grain, .ticker, .tabbar, main > :not(#direct), body > :not(.hdr):not(main) { visibility: hidden !important; }
.slide::after { display: none !important; }`

const VIEWS = {
  mobile3: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  mobile2: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 },
}

const browser = await chromium.launch()

async function open(view) {
  const ctx = await browser.newContext(VIEWS[view])
  const page = await ctx.newPage()
  page.on('pageerror', e => console.log('PAGEERR', e.message))
  await page.addInitScript(INIT)
  await page.clock.install({ time: new Date('2026-10-22T18:58:00Z') })
  await page.clock.pauseAt(new Date('2026-10-22T18:58:00.500Z'))
  await page.goto(URL, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({ content: HIDE_ALWAYS })
  await page.evaluate(() => window.__vsync())
  return { ctx, page }
}

let vnow = 0 // temps virtuel écoulé depuis l'ouverture (s)
async function step(page) {
  await page.clock.runFor(Math.round(1000 / FPS * (Math.round(vnow * FPS) + 1)) - Math.round(1000 / FPS * Math.round(vnow * FPS)))
  vnow = (Math.round(vnow * FPS) + 1) / FPS
  await page.evaluate(() => window.__vsync())
}
async function advanceTo(page, t) { while (vnow < t - 1e-6) await step(page) }

async function styleToggle(page, css) {
  return page.evaluate(c => { const s = document.createElement('style'); s.textContent = c; s.id = 'tmp-' + Math.random().toString(36).slice(2); document.head.appendChild(s); return s.id }, css)
}
async function styleOff(page, id) { await page.evaluate(i => document.getElementById(i).remove(), id) }

const dir = name => { const d = `${OUT}/${name}`; fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true }); return d }
const pad = (n, k = 3) => String(n).padStart(k, '0')
const ease = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))

const SEQS = {
  // Héros mobile 390 × 844 @3 : plaque sans interface (zoom lent + neige), image complète, calques d'interface sur fond transparent
  async hero() {
    vnow = 0
    const { ctx, page } = await open('mobile3')
    const d = dir('hero')
    const from = T0 - 0.8, to = T0 + 1.0
    await advanceTo(page, from)
    const n = Math.round((to - from) * FPS)
    for (let f = 0; f <= n; f++) {
      const mt = from + f / FPS
      const id = await styleToggle(page, HIDE_UI)
      await page.screenshot({ path: `${d}/plate-${pad(f)}.png` })
      await styleOff(page, id)
      if (mt > T0 - 0.35 - 1e-6 && mt < T0 + 0.65) await page.screenshot({ path: `${d}/full-${pad(f)}.png` })
      if (Math.abs(mt - T0) < 1e-6) {
        const id2 = await styleToggle(page, ONLY_UI)
        await page.screenshot({ path: `${d}/ui.png`, omitBackground: true })
        await styleOff(page, id2)
        const boxes = await page.evaluate(() => {
          const r = el => { const b = el.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map(v => Math.round(v * 100) / 100) }
          const q = s => document.querySelector(s)
          const active = q('.slide.is-active')
          return {
            logo: r(q('.hdr .logo')), actions: r(q('.hdr__actions')),
            badges: [...active.querySelectorAll('.badge')].map(r),
            lines: [...active.querySelectorAll('.slide__title .line')].map(r),
            desc: r(active.querySelector('.slide__desc')), progress: r(active.querySelector('.progress')),
            cta: [...active.querySelectorAll('.hero__cta .btn')].map(r),
            hnav: r(q('.hero__bottom')), hero: r(q('#direct')), tabbar: r(q('.tabbar')),
          }
        })
        fs.writeFileSync(`${d}/boxes.json`, JSON.stringify({ T0, from, fps: FPS, frame0: f, boxes, kenburns: await page.evaluate(() => window.__kenburns()) }, null, 1))
      }
      await step(page)
    }
    await ctx.close()
    console.log('hero', n + 1, 'images')
  },

  // Calques d'interface isolés (un par élément, sur fond transparent) à l'instant T0, état identique à la passe « hero »
  async layers() {
    vnow = 0
    const { ctx, page } = await open('mobile3')
    const d = dir('layers')
    await advanceTo(page, T0)
    const names = await page.evaluate(() => {
      const q = s => document.querySelector(s)
      const act = q('.slide.is-active')
      const map = {
        logo: q('.hdr .logo'), actions: q('.hdr__actions'),
        b0: act.querySelectorAll('.badge')[0], b1: act.querySelectorAll('.badge')[1], b2: act.querySelectorAll('.badge')[2],
        l0: act.querySelectorAll('.slide__title .line')[0], l1: act.querySelectorAll('.slide__title .line')[1],
        desc: act.querySelector('.slide__desc'), progress: act.querySelector('.progress'),
        cta0: act.querySelectorAll('.hero__cta .btn')[0], cta1: act.querySelectorAll('.hero__cta .btn')[1],
        hnav: q('.hero__bottom'),
      }
      for (const [k, el] of Object.entries(map)) el.dataset.lay = k
      return Object.keys(map)
    })
    for (const name of names) {
      const id = await styleToggle(page, ONLY_UI + `[data-lay]:not([data-lay="${name}"]) { visibility: hidden !important; }`)
      await page.screenshot({ path: `${d}/${name}.png`, omitBackground: true })
      await styleOff(page, id)
    }
    // le dégradé sombre de l'en-tête (.hdr::before), seul
    const id = await styleToggle(page, ONLY_UI + `[data-lay] { visibility: hidden !important; }`)
    await page.screenshot({ path: `${d}/hdrbg.png`, omitBackground: true })
    await styleOff(page, id)
    await ctx.close()
    console.log('layers', names.length + 1)
  },

  // Téléphone (390 × 844 @2) : la barre du carrousel finit de se remplir, puis le carrousel passe
  // tout seul au programme suivant (« Mont-Blanc » → « La nuit du loup », à 8 s)
  async phone() {
    vnow = 0
    const { ctx, page } = await open('mobile2')
    const d = dir('phone')
    const from = 6.6, to = 9.7
    await advanceTo(page, from)
    const n = Math.round((to - from) * FPS)
    for (let f = 0; f < n; f++) {
      await page.screenshot({ path: `${d}/p-${pad(f)}.png` })
      await step(page)
    }
    const active = await page.evaluate(() => document.querySelector('.slide.is-active').dataset.i)
    console.log('phone', n, 'images, diapositive finale', active)
    await ctx.close()
  },

  // Programme TV (mobile @2) : la grille glisse jusqu'à la ligne dorée « maintenant » qui traverse la carte EN COURS
  async prog() {
    vnow = 0
    const { ctx, page } = await open('mobile2')
    const d = dir('prog')
    await advanceTo(page, 1.0)
    await page.addStyleTag({ content: HIDE_METEO })
    await page.evaluate(() => { const el = document.getElementById('programme'); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 24) })
    for (let i = 0; i < 45; i++) await step(page)
    const target = await page.evaluate(() => document.getElementById('grid-scroll').scrollLeft)
    const start = Math.max(0, target - 470)
    const n = 60
    for (let f = 0; f < n; f++) {
      const p = ease(clamp((f - 8) / 40))
      await page.evaluate(x => { document.getElementById('grid-scroll').scrollLeft = x }, Math.round(start + (target - start) * p))
      await page.evaluate(() => window.__vsync())
      await page.screenshot({ path: `${d}/g-${pad(f)}.png` })
      await step(page)
    }
    await ctx.close()
    console.log('prog', n, 'images', start, '→', target)
  },

  // Top 10 (mobile @2) : le rail glisse, les grands chiffres dorés 1, 2, 3 défilent
  async top() {
    vnow = 0
    const { ctx, page } = await open('mobile2')
    const d = dir('top')
    await advanceTo(page, 1.0)
    await page.addStyleTag({ content: HIDE_METEO })
    await page.evaluate(() => { const el = document.querySelector('[aria-labelledby="top-title"]'); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 24) })
    for (let i = 0; i < 45; i++) await step(page)
    const max = await page.evaluate(() => { const r = document.querySelector('.rail-top'); return r.scrollWidth - r.clientWidth })
    const dist = Math.min(max, 480)
    const n = 60
    for (let f = 0; f < n; f++) {
      const p = ease(clamp((f - 6) / 44))
      await page.evaluate(x => { const r = document.querySelector('.rail-top'); r.style.scrollSnapType = 'none'; r.scrollLeft = x }, Math.round(dist * p))
      await page.evaluate(() => window.__vsync())
      await page.screenshot({ path: `${d}/t-${pad(f)}.png` })
      await step(page)
    }
    await ctx.close()
    console.log('top', n, 'images', dist)
  },

  // Ordinateur 1280 × 720 : le carrousel passe de « Mont-Blanc » à « La nuit du loup » (sans note ni nombre de vues)
  async desk() {
    vnow = 0
    const { ctx, page } = await open('desktop')
    const d = dir('desk')
    const from = 7.6, to = 10.3
    await advanceTo(page, from)
    const n = Math.round((to - from) * FPS)
    for (let f = 0; f < n; f++) {
      await page.screenshot({ path: `${d}/k-${pad(f)}.png` })
      await step(page)
    }
    await ctx.close()
    console.log('desk', n, 'images')
  },
}

for (const [name, fn] of Object.entries(SEQS)) {
  if (ONLY.length && !ONLY.includes(name)) continue
  const t = Date.now()
  await fn()
  console.log(`  ${name} : ${((Date.now() - t) / 1000).toFixed(0)} s`)
}
await browser.close()
