// Séquences mobiles du site PMSB (390 x 844), en temps virtuel.
//   node capture-mobile.mjs <dossier-images> <séquence>
// Séquences :
//   preloader        préchargeur « PMSB / Prestations Multi Services Bâtiment », compteur 000 → 100 (3 px/px CSS, 30 i/s, 2,4 s)
//   intro            ouverture complète de l'accueil, 9 s à 30 i/s (on garde 7,0 → 9,0 s : héros fini, lumière qui dérive)
//   mur-seul         façade seule, interface masquée, 60 i/s, 6 s (la lumière dérive seule de 3,0 à 5,8 s)
//   mur-long         façade seule, interface masquée, 24 s à 10 i/s : la lumière qui se promène seule, en accéléré
//   scroll           défilement de l'accueil : la façade se disperse (on garde 0 → 1,5 s, avant les compteurs)
//   avant-apres      comparateur « Travaux de bardages » sur /realisations : poignée 100 → 0 → 50
// Les quatre dernières reprennent à l'identique scratchpad/pmsb-scripts/seq.mjs (phase d'exploration),
// dont les MP4 ont été réutilisés pour ce brouillon (voir ../README.md).
import { launch, open, advance, record, ease, clamp, VIEWS } from './lib.mjs'

const [dir, name] = process.argv.slice(2)
const HIDE_UI = `[class*="Hero_inner"], [class*="Hero_rail"], header, [class*="SideRail"], [class*="Cursor"], [class*="ScrollProgress"], [class*="Preloader"] { visibility: hidden !important; }`
const smooth = (page, from, to, t, t0, dur) => page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(from + (to - from) * ease(clamp((t - t0) / dur))))

const browser = await launch()
const SEQ = {
  async preloader() {
    VIEWS.m3 = { ...VIEWS.mobile, deviceScaleFactor: 3 }
    const { ctx, page } = await open(browser, 'm3', '/')
    await record(page, dir, 2.4, { fps: 30 })
    await ctx.close()
  },
  async intro() {
    const { ctx, page } = await open(browser, 'mobile', '/')
    await record(page, dir, 9, { fps: 30 })
    await ctx.close()
  },
  async 'mur-seul'() {
    const { ctx, page } = await open(browser, 'mobile', '/', { css: HIDE_UI })
    await advance(page, 2200, 60)
    await record(page, dir, 6, { fps: 60 })
    await ctx.close()
  },
  async 'mur-long'() {
    const { ctx, page } = await open(browser, 'mobile', '/', { css: HIDE_UI })
    await advance(page, 3000, 10)
    await record(page, dir, 24, { fps: 10 })
    await ctx.close()
  },
  async scroll() {
    const { ctx, page } = await open(browser, 'mobile', '/')
    await advance(page, 7000)
    await record(page, dir, 7, { fps: 30, perFrame: async t => { if (t >= 0.6 && t < 3.6) await smooth(page, 0, 844, t, 0.6, 3.0); else if (t >= 3.6) await smooth(page, 844, 1400, t, 3.8, 2.4) } })
    await ctx.close()
  },
  async 'avant-apres'() {
    const { ctx, page } = await open(browser, 'mobile', '/realisations')
    await advance(page, 3000)
    const r = await page.evaluate(() => { const b = document.querySelector('input[type=range]').getBoundingClientRect(); return { top: b.top + scrollY, h: b.height } })
    await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), Math.max(0, Math.round(r.top + r.h / 2 - 844 / 2)))
    const set = v => page.evaluate(val => {
      const el = document.querySelector('input[type=range]')
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(val))
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }, v)
    await set(100); await advance(page, 1500)
    await record(page, dir, 6, { fps: 30, perFrame: async t => {
      let v = 100
      if (t > 0.6 && t <= 3.0) v = 100 - 100 * ease((t - 0.6) / 2.4)
      else if (t > 3.0 && t <= 3.4) v = 0
      else if (t > 3.4) v = 50 * ease(clamp((t - 3.4) / 1.6))
      await set(v.toFixed(1))
    } })
    await ctx.close()
  },
}
await SEQ[name]()
await browser.close()
console.log('ok', name, dir)
