// Page Isolation : la vraie démonstration « coupe de mur » (InsulationDemo + ThermalWall), 540 x 960 px CSS à 2 px/px CSS.
//   node capture-iso.mjs <dossier-images> [secondes=11] [bascule=6.0]
// Le site joue la démonstration seul à l'entrée dans l'écran (bascule « Isolé » 1,4 s après) : on revient
// d'abord sur « Mur nu » avec le vrai bouton, on laisse les particules reprendre leur régime, puis on enregistre :
// mur nu de 0 à <bascule> s, puis clic sur le vrai bouton « Isolé par l'extérieur » (pose de l'isolant et de l'enduit).
// Masqués : le titre de section et le texte sous la liste (phrases « chaleur » / « température »), la légende.
// Cadre enregistré : la démonstration (coupe + bascule + liste des couches), sans aucun texte de paragraphe.
import { launch, open, advance, record, mobile } from './lib.mjs'
import fs from 'node:fs'

const [dir, secArg = '11', swArg = '6.0'] = process.argv.slice(2)
const UI = `header, [class*="Cursor"], [class*="ScrollProgress"], [class*="Preloader"] { visibility: hidden !important; }
  #pourquoi-isoler [class*="SectionHead"], [class*="InsulationDemo_readout"], [class*="InsulationDemo_legend"] { visibility: hidden !important; }`
const browser = await launch()
const { ctx, page } = await open(browser, mobile(540, 960, 2), '/isolation', { css: UI })
await advance(page, 1500, 30)
const top = await page.evaluate(() => { const b = document.querySelector('[class*="InsulationDemo_demo"]').getBoundingClientRect(); return Math.round(b.top + scrollY - 20) })
await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), top)
await advance(page, 1800, 30)                       // la démonstration automatique bascule sur « Isolé »
const btn = i => page.evaluate(k => document.querySelectorAll('[class*="InsulationDemo_toggleBtn"]')[k].click(), i)
await btn(0)                                       // retour au mur nu (vrai bouton)
await advance(page, 4000, 30)                      // l'isolant repart, les particules reprennent leur régime
const r = await page.evaluate(() => {
  const d = document.querySelector('[class*="InsulationDemo_demo"]').getBoundingClientRect()
  const l = document.querySelector('[class*="InsulationDemo_layers"]').getBoundingClientRect()
  const v = document.querySelector('[class*="InsulationDemo_viewport"]').getBoundingClientRect()
  const tg = [...document.querySelectorAll('[class*="InsulationDemo_toggleBtn"]')].map(b => { const q = b.getBoundingClientRect(); return [q.x, q.y, q.width, q.height] })
  const li = [...document.querySelectorAll('[class*="InsulationDemo_layers"] li')].map(b => { const q = b.getBoundingClientRect(); return [q.x, q.y, q.width, q.height] })
  const side = [...document.querySelectorAll('[class*="ThermalWall_side"]')].map(b => { const q = b.getBoundingClientRect(); return [q.x, q.y, q.width, q.height] })
  return { demo: [d.x, d.y, d.width, d.height], layersBottom: l.bottom, viewport: [v.x, v.y, v.width, v.height], toggle: tg, layers: li, sides: side }
})
const clip = { x: Math.round(r.demo[0]), y: Math.round(r.demo[1]), width: Math.round(r.demo[2]), height: Math.round(r.layersBottom + 14 - r.demo[1]) }
const SW = +swArg
await record(page, dir, +secArg, { fps: 30, clip, perFrame: async t => { if (Math.abs(t - SW) < 1e-6) await btn(1) } })
fs.writeFileSync(`${dir}/layout.json`, JSON.stringify({ dpr: 2, clip, switchAt: SW, ...r }, null, 1))
console.log('ok iso', clip)
await ctx.close(); await browser.close()
