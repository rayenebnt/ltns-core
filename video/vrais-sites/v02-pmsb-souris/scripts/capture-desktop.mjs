// Accueil PMSB sur ordinateur (1440 x 900, pleine page), souris qui balaie la façade : pour l'écran
// partagé téléphone / ordinateur. Numéro de l'en-tête et rails latéraux masqués par CSS.
//   node capture-desktop.mjs <dossier-images> [fps=30] [dpr=0.75] [secondes=4.5]
import { launch, open, advance, record, MASK_PRIVATE, VIEWS } from './lib.mjs'

const [dir, fpsArg, dprArg, secArg] = process.argv.slice(2)
VIEWS.desk = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: +(dprArg || 0.75) }
const css = MASK_PRIVATE + `[class*="ScrollProgress"] { visibility: hidden !important; }`
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
// S lent de la gauche vers la droite de la façade
const path = u => [1440 * (0.5 + 0.5 * (-0.42 + 0.8 * sm(0, 4.2, u))), 900 * (0.5 - 0.5 * (0.18 * Math.sin(u * 1.5)))]

const browser = await launch()
const { ctx, page } = await open(browser, 'desk', '/', { css })
let jig = 0
const move = async u => { const [x, y] = path(u); jig = jig ? 0 : 0.01; await page.mouse.move(x + jig, y) }
await advance(page, 4500, 30, async () => move(0))
await record(page, dir, +(secArg || 4.5), { fps: +(fpsArg || 30), perFrame: async t => move(t) })
await ctx.close(); await browser.close()
console.log('ok', dir)
