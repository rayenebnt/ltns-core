// Héros PMSB (accueil, ordinateur) filmé en temps virtuel avec une souris scriptée.
//   node capture-hero.mjs <dossier-images> [fps=30] [dpr=1.6] [secondes]
// Fenêtre 1440 x 1600 px CSS (mise en page ordinateur, pointeur fin) : la façade remplit le haut,
// les grandes lettres PMSB passent en bas. On garde la tranche x 0-900 (9:16), qui donne 1080 x 1920.
// - En-tête (numéro de téléphone), rails latéraux (adresse, mention RGE) et préchargeur masqués par CSS.
// - La souris est posée en P0 dès le chargement : l'assemblage de la façade se fait sous le curseur,
//   puis à T0 = 4,2 s la souris trace un S lent. La vidéo boucle sur l'image T0 (image 0).
// - ring.json : position de l'anneau du curseur du site, image par image (px de la vidéo).
import { launch, open, advance, record, step, MASK_PRIVATE, VIEWS } from './lib.mjs'
import fs from 'node:fs'

const [dir, fpsArg, dprArg, secArg] = process.argv.slice(2)
const FPS = +(fpsArg || 30)
const DPR = +(dprArg || 1.6)
VIEWS.hero = { viewport: { width: 1440, height: 1600 }, deviceScaleFactor: DPR }
export const START = 1.6, T0 = 4.2
const SECONDS = +(secArg || 11.2) // de 1,6 s à 12,8 s après le chargement

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
// Trajet du pointeur en coordonnées normalisées du site (-1..1), u = temps depuis T0
export function path(u) {
  if (u <= 0) return [-0.36, 0.06]
  let px = -0.36 + 0.25 * sm(0, 2.0, u) - 0.07 * sm(2.0, 3.4, u)
  let py = 0.06 + 0.04 * Math.sin(Math.PI * Math.min(u, 2) / 2) + 0.22 * sm(1.9, 3.4, u)
  if (u > 3.4) { const w = u - 3.4; px += 0.14 * Math.sin(w * 0.95); py -= 0.2 * Math.sin(w * 0.62) }
  return [px, py]
}
const toCss = ([px, py]) => [720 + 720 * px, 800 - 800 * py]

const css = MASK_PRIVATE + `
  header { visibility: hidden !important; }
  [class*="Preloader"] { visibility: hidden !important; }
  [class*="ScrollProgress"] { visibility: hidden !important; }
`
const browser = await launch()
const { ctx, page } = await open(browser, 'hero', '/', { css })
let jig = 0
const moveTo = async t => {
  const [x, y] = toCss(path(t - T0))
  jig = jig ? 0 : 0.01 // un pointermove à chaque image, même immobile
  await page.mouse.move(x + jig, y)
}
// avant l'enregistrement : souris en P0
await advance(page, START * 1000, FPS, async t => moveTo(t))
const ring = []
const t0 = START
await record(page, dir, SECONDS, {
  fps: FPS,
  clip: { x: 0, y: 0, width: 900, height: 1600 },
  perFrame: async (t) => { await moveTo(t0 + t) },
  after: async () => {
    const r = await page.evaluate(() => {
      const el = document.querySelector('[class*="Cursor_ring"]')
      const root = document.querySelector('[class*="Cursor_root"]')
      const m = el && /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(el.style.transform)
      return m ? [+m[1], +m[2], +getComputedStyle(root).opacity] : null
    })
    // px CSS -> px de la vidéo 1080 x 1920 (tranche x 0-900, échelle 1,2)
    ring.push(r ? [+(r[0] * 1.2).toFixed(1), +(r[1] * 1.2).toFixed(1), +r[2].toFixed(2)] : null)
  },
})
fs.writeFileSync(`${dir}/ring.json`, JSON.stringify({ fps: FPS, start: START, t0: T0, ring }))
await ctx.close(); await browser.close()
console.log('ok', dir)
