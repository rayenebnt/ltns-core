// Ouverture réelle du site PMSB (ordinateur), même cadrage que le héros : préchargeur PMSB 000 → 100,
// rideau de 6 colonnes, lettres qui montent, façade qui se monte assise par assise. 60 i/s (ralenti).
//   node capture-intro.mjs <dossier-images> [fps=60] [dpr=1.2] [secondes=4.2] [début=0]
// (le montage utilise 120 i/s de 1,5 s à 3,7 s : node capture-intro.mjs <dossier> 120 1.2 2.2 1.5)
// La souris est posée en P0 dès le chargement, comme pour le héros (capture-hero.mjs) : la façade se monte
// avec la zone propre au même endroit qu'à l'image 0.
import { launch, open, advance, record, MASK_PRIVATE, VIEWS } from './lib.mjs'

const [dir, fpsArg, dprArg, secArg, fromArg] = process.argv.slice(2)
VIEWS.hero = { viewport: { width: 1440, height: 1600 }, deviceScaleFactor: +(dprArg || 1.2) }
const css = MASK_PRIVATE + `
  header { visibility: hidden !important; }
  [class*="ScrollProgress"] { visibility: hidden !important; }
`
const browser = await launch()
const { ctx, page } = await open(browser, 'hero', '/', { css })
// P0 = pointeur (-0,36 ; 0,06) en coordonnées normalisées du site
const P0 = [720 + 720 * -0.36, 800 - 800 * 0.06]
let jig = 0
const park = async () => { jig = jig ? 0 : 0.01; await page.mouse.move(P0[0] + jig, P0[1]) }
if (+fromArg) await advance(page, +fromArg * 1000, +(fpsArg || 60), park)
await record(page, dir, +(secArg || 4.2), { fps: +(fpsArg || 60), clip: { x: 0, y: 0, width: 900, height: 1600 }, perFrame: park })
await ctx.close(); await browser.close()
console.log('ok', dir)
