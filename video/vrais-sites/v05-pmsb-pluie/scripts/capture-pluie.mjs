// Héros de la page Étanchéité (WaterSurface : membrane satinée sous la pluie automatique), plein cadre 9:16.
//   node capture-pluie.mjs <dossier-images> <graine> <secondes> [plein|mot|essai|page] [début des images, s]
//   plein : 864 x 1536 px CSS à 1,25 px/px CSS = 1080 x 1920 ; le canvas est rendu à sa vraie résolution (dprMax 1,25
//           du site). Tout le texte de la page est masqué ; voile du site conservé ; la section héros occupe tout
//           l'écran (100svh au lieu de 92svh). 60 i/s.
//   mot   : le vrai titre « ÉTANCHÉITÉ » de la page, seul, sur fond transparent (PNG), même mise en page, remonté pour
//           tenir entre y ≈ 740 et 890 : posé sur « plein », il redonne exactement la page avec ce seul mot visible.
//   essai : comme « plein » à 0,25 px/px CSS, sans image (recherche rapide de la graine, gouttes journalisées)
//   page  : la vraie page mobile 390 x 844 à 2 px/px CSS, tout le texte visible (écran du téléphone), 30 i/s
// Aucune interaction : uniquement la pluie automatique du site (aucun événement de pointeur).
// Math.random a une graine fixe : chaque goutte (position, force, instant) est journalisée (rlog.json -> drops.py).
import { launch, open, advance, record, mobile } from './lib.mjs'
import fs from 'node:fs'

const [dir, seedArg, secArg, mode = 'plein', fromArg = '0'] = process.argv.slice(2)
const SEED = +seedArg, SECONDS = +secArg
const FPS = mode === 'page' ? 30 : 60, PRE = 2500   // pré-roulage : le titre du site a fini d'apparaître
const UI = `header, [class*="Cursor"], [class*="ScrollProgress"], [class*="Preloader"] { visibility: hidden !important; }`
const FULL = `section[class*="PageHero_hero"] { min-height: 100svh !important; height: 100svh !important; }`
const NO_TEXT = `[class*="PageHero_inner"] { visibility: hidden !important; }`
const WORD_ONLY = `
  [class*="PageHero_crumb"], [class*="PageHero_index"], [class*="PageHero_body"] { visibility: hidden !important; }
  [class*="PageHero_backdrop"], [class*="PageHero_veil"], [class*="Grain"] { display: none !important; }
  html, body, main, section { background: transparent !important; }
`
// Journal des tirages (la pile d'appel permet de garder ceux de la scène WaterSurface, 4 tirages par goutte)
const LOG = `(() => {
  const r = Math.random; window.__rlog = [];
  Math.random = function () { const v = r(); const s = new Error().stack || ''; window.__rlog.push([performance.now(), v, 0, s.split('\\n').slice(2, 4).join(' | ')]); return v };
})();`

const view = mode === 'page' ? mobile(390, 844, 2) : mobile(864, 1536, mode === 'essai' ? 0.25 : 1.25)
const css = UI + (mode === 'page' ? '' : FULL + (mode === 'mot' ? WORD_ONLY : NO_TEXT))
const browser = await launch()
const { ctx, page } = await open(browser, view, '/etancheite', { seed: SEED, css })
await page.addInitScript(LOG)
await page.reload({ waitUntil: 'load' })
// le mot « ÉTANCHÉITÉ » : bas de la boîte du h1 à y = 890 px de la vidéo (712 px CSS)
const h1 = await page.evaluate(() => { const b = document.querySelector('h1').getBoundingClientRect(); return [b.top, b.bottom, b.left, b.right] })
const dy = Math.round(712 - h1[1])
if (mode !== 'page') await page.addStyleTag({ content: `[class*="PageHero_titleRow"] { transform: translateY(${dy}px) !important; }` })
console.log('h1', h1.map(Math.round), 'décalage', dy)
await advance(page, PRE, FPS)
fs.mkdirSync(dir, { recursive: true })
if (mode === 'mot') {
  const b = await page.evaluate(() => { const q = document.querySelector('h1').getBoundingClientRect(); return [q.left, q.top, q.width, q.height] })
  await page.screenshot({ path: `${dir}/mot.png`, omitBackground: true })
  fs.writeFileSync(`${dir}/mot.json`, JSON.stringify({ dpr: 1.25, box: b.map(v => +(v * 1.25).toFixed(1)) }))
  console.log('ok mot', b)
} else {
  const startMs = await page.evaluate(() => performance.now())
  const n = mode === 'essai' ? (await advance(page, SECONDS * 1000, FPS), 0) : await record(page, dir, SECONDS, { fps: FPS, from: Math.round(+fromArg * FPS) })
  const log = await page.evaluate(() => window.__rlog)
  fs.writeFileSync(`${dir}/rlog.json`, JSON.stringify({ seed: SEED, pre: PRE, fps: FPS, startMs, seconds: SECONDS, log }))
  console.log('ok', mode, SEED, n, 'images', log.length, 'tirages')
}
await ctx.close(); await browser.close()
