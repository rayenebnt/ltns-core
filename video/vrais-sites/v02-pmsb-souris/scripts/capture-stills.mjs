// Images fixes du site PMSB (mobile 390 x 844, 3 px par px CSS), mouvement réduit (pas de préchargeur) :
//   - les 4 vignettes du rail « Nos réalisations » autorisées : pignon, cheminée, marbre, brique
//     (ni bardage/clinique, ni rénovation parisienne, ni photos de banque) ;
//   - le pied de page, coordonnées, LinkedIn et badge RGE floutés à la source, avec « Site réalisé par LTNS ».
//   node capture-stills.mjs <dossier-sortie>
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs'
import fs from 'node:fs'
import { BASE, VIEWS } from './lib.mjs'

const out = process.argv[2]
fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
const ctx = await browser.newContext({ ...VIEWS.mobile, deviceScaleFactor: 3, reducedMotion: 'reduce' })
const page = await ctx.newPage()
await page.addInitScript(() => {
  const css = `
    footer a[href^="tel:"], footer a[href^="mailto:"], footer [class*="colList"], footer a[href*="linkedin"],
    footer img[alt*="RGE"], [class*="SideRail"] { filter: blur(14px) !important; }
    header, [class*="Cursor"] { visibility: hidden !important; }`
  const add = () => { const s = document.createElement('style'); s.textContent = css; document.documentElement.appendChild(s) }
  if (document.documentElement) add(); else document.addEventListener('DOMContentLoaded', add)
})
await page.goto(BASE + '/', { waitUntil: 'networkidle' })

// Vignettes du rail
for (const slug of ['pignon', 'cheminee', 'poncage-marbre', 'ravalement-brique']) {
  const card = page.locator(`#realisations article:has(a[href="/realisations#${slug}"])`).first()
  await card.scrollIntoViewIfNeeded()
  await page.evaluate(async () => { await new Promise(r => setTimeout(r, 400)) })
  await page.waitForFunction(el => [...el.querySelectorAll('img')].every(i => i.complete && i.naturalWidth > 0), await card.elementHandle())
  await card.screenshot({ path: `${out}/rail-${slug}.png` })
  console.log('rail', slug)
}

// Pied de page complet (flous appliqués à la source)
const foot = page.locator('footer').first()
await foot.scrollIntoViewIfNeeded()
await page.evaluate(async () => { await new Promise(r => setTimeout(r, 600)) })
await foot.screenshot({ path: `${out}/pied-de-page.png` })
const credit = await page.evaluate(() => {
  const f = document.querySelector('footer').getBoundingClientRect()
  const a = document.querySelector('footer a[href="https://ltns.fr"]').getBoundingClientRect()
  return { x: a.left - f.left, y: a.top - f.top, w: a.width, h: a.height, fw: f.width, fh: f.height }
})
fs.writeFileSync(`${out}/pied-de-page.json`, JSON.stringify({ scale: 3, credit }))
console.log('footer', JSON.stringify(credit))
await browser.close()
