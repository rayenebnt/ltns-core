// Page Ravalement : les quatre échantillons de matière (MaterialCanvas : bloc en lancer de rayons, matière procédurale,
// aucune texture chargée), 540 x 960 px CSS à 2 px/px CSS, cadrés sur le bloc seul (sans les photos de la section).
//   node capture-blocs.mjs <dossier> [brique:8,pierre:3,platre:3,impermeabilisation:3]
// Le bloc tourne seul (uTime * 0,22) : aucune interaction.
import { launch, open, advance, record, mobile } from './lib.mjs'

const [dir, spec = 'brique:8,pierre:3,platre:3,impermeabilisation:3'] = process.argv.slice(2)
const IDX = { pierre: 0, brique: 1, platre: 2, impermeabilisation: 3 }
const UI = `header, [class*="Cursor"], [class*="ScrollProgress"], [class*="Preloader"] { visibility: hidden !important; }`
const browser = await launch()
for (const item of spec.split(',')) {
  const [name, sec] = item.split(':')
  const { ctx, page } = await open(browser, mobile(540, 960, 2), '/ravalement', { css: UI })
  await advance(page, 1500, 30)
  const y = await page.evaluate(i => { const b = document.querySelectorAll('[class*="Expertises_matterInner"]')[i].getBoundingClientRect(); return Math.round(b.top + scrollY - 60) }, IDX[name])
  await page.evaluate(v => window.scrollTo({ top: v, behavior: 'instant' }), y)
  await advance(page, 1200, 30)
  const b = await page.evaluate(i => { const q = document.querySelectorAll('[class*="Expertises_matterInner"]')[i].getBoundingClientRect(); return [q.x, q.y, q.width, q.height] }, IDX[name])
  const clip = { x: Math.round(b[0]), y: Math.round(b[1]), width: Math.round(b[2]), height: Math.round(b[3]) }
  await record(page, `${dir}/${name}`, +sec, { fps: 30, clip })
  console.log('ok bloc', name, clip)
  await ctx.close()
}
await browser.close()
