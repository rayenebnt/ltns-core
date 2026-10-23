// Repérage : images fixes et boîtes des éléments, pour choisir cadrages et fenêtres.
//   node probe.mjs <dossier> <cas>
import { launch, open, advance, mobile } from './lib.mjs'
import fs from 'node:fs'
const [dir, cas] = process.argv.slice(2)
fs.mkdirSync(dir, { recursive: true })
const browser = await launch()
const UI = `header, [class*="Cursor"], [class*="ScrollProgress"], [class*="Preloader"] { visibility: hidden !important; }`
const box = (page, sel) => page.evaluate(s => [...document.querySelectorAll(s)].map(e => { const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y + scrollY), Math.round(b.width), Math.round(b.height)] }), sel)
const CASES = {
  async eta() {
    for (const [name, view] of [['eta-864', mobile(864, 1536, 1.25)], ['eta-432', mobile(432, 768, 2.5)]]) {
      const { ctx, page } = await open(browser, view, '/etancheite', { seed: 1, css: UI })
      await advance(page, 3000, 10)
      console.log(name, 'hero', await box(page, '[class*="PageHero_hero"]'), 'h1', await box(page, 'h1'), 'canvas', await page.evaluate(() => [...document.querySelectorAll('canvas')].map(c => [c.width, c.height])))
      await page.screenshot({ path: `${dir}/${name}.jpg`, quality: 90, type: 'jpeg' })
      await ctx.close()
    }
  },
  async iso() {
    for (const [name, view] of [['iso-540', mobile(540, 960, 2)]]) {
      const { ctx, page } = await open(browser, view, '/isolation', { css: UI })
      await advance(page, 1500, 10)
      const top = await page.evaluate(() => { const el = document.querySelector('#pourquoi-isoler [class*="InsulationDemo_demo"]'); const b = el.getBoundingClientRect(); return Math.round(b.top + scrollY - 20) })
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), top)
      await advance(page, 1000, 10)
      console.log(name, 'demo', await box(page, '[class*="InsulationDemo_demo"]'), 'viewport', await box(page, '[class*="InsulationDemo_viewport"]'), 'panel', await box(page, '[class*="InsulationDemo_panel"]'), 'canvas', await page.evaluate(() => [...document.querySelectorAll('canvas')].map(c => [c.width, c.height])))
      await page.screenshot({ path: `${dir}/${name}.jpg`, quality: 90, type: 'jpeg' })
      await advance(page, 3000, 10)
      await page.screenshot({ path: `${dir}/${name}-b.jpg`, quality: 90, type: 'jpeg' })
      await ctx.close()
    }
  },
  async rav() {
    for (const [name, view] of [['rav-540', mobile(540, 960, 2)]]) {
      const { ctx, page } = await open(browser, view, '/ravalement', { css: UI })
      await advance(page, 1500, 10)
      const inners = await box(page, '[class*="Expertises_matterInner"]')
      console.log(name, 'inners', inners)
      for (const [i, b] of inners.entries()) {
        await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), Math.max(0, b[1] - 100))
        await advance(page, 1000, 10)
        console.log(i, 'canvas', await page.evaluate(() => [...document.querySelectorAll('canvas')].map(c => [c.width, c.height])))
        await page.screenshot({ path: `${dir}/${name}-${i}.jpg`, quality: 90, type: 'jpeg' })
      }
      await ctx.close()
    }
  },
}
await CASES[cas]()
await browser.close()
