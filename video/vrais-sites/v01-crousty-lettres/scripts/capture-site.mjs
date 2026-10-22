// Captures du vrai site du Crousty (dépôt /home/user/rayenebnt/crousty-, serveur Vite local).
//
//   cd /home/user/rayenebnt/crousty- && npx vite --port 5181 --strictPort --host 127.0.0.1   (dans un autre terminal)
//   node video/vrais-sites/v01-crousty-lettres/scripts/capture-site.mjs [dossier brut]
//
// Produit des PNG bruts 1080 × 1920 (360 × 640 @3, mobile), ensuite convertis par prepare-assets.py :
//   entree/p0440.png …  « entrée masquée » : l'accueil sans interface (en-tête, textes, boutons, indice cachés)
//                        de p 0,44 (déjà de dos) à p 1,00 ; la marche image par image, puis l'arrêt (pas de 0,004)
//   lettres/L0-on.png …  chaque lettre seule, posée, fond transparent, néon allumé (on) et éteint (off)
//   final.png            l'état final de l'accueil avec les boutons, paragraphe « … à la mozzarella » masqué
//   compose-burgers.png, compose-tacos.png   « Compose ton menu », onglets Burgers puis Tacos
// Jamais avant p 0,44 : le visage de la personne est visible au début de la marche.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs'
import fs from 'node:fs'
import { join } from 'node:path'

const URL = process.env.CROUSTY_URL || 'http://127.0.0.1:5181/'
const RAW = process.argv[2] || '/tmp/v01-crousty-raw'
const ONLY = process.argv[3] || 'all'
const sleep = ms => new Promise(r => setTimeout(r, ms))
for (const d of ['entree', 'lettres']) fs.mkdirSync(join(RAW, d), { recursive: true })

const WALK = 0.66, COUNT = 85
// Réplique des formules de Hero.tsx, pour savoir ce que montre chaque image
const clamp01 = v => Math.min(1, Math.max(0, v))
function stateAt(p) {
  const walk = clamp01(p / WALK), hold = clamp01((p - WALK) / (1 - WALK))
  const on = clamp01((hold - 0.62) / 0.2)
  const flicker = on > 0 && on < 1 ? (Math.sin(on * 40) > -0.2 ? 1 : 0.35) : 1
  const landed = [...Array(7)].filter((_, i) => (hold - 0.12 - i * 0.055) / 0.28 >= 1).length
  const push = hold < 0.5 ? 4 * hold ** 3 : 1 - Math.pow(-2 * hold + 2, 3) / 2
  return { p: +p.toFixed(4), idx: Math.round(walk * (COUNT - 1)), hold: +hold.toFixed(4), glow: +(on * flicker).toFixed(3), landed, scale: +(1 + 0.07 * push).toFixed(5), dim: +(0.38 * (1 - Math.pow(1 - clamp01(hold / 0.5), 3))).toFixed(4) }
}

const MASK = `
  header { display: none !important; }
  #accueil > div > *:not(.hero-stage):not(.hero-vignette):not(canvas) { display: none !important; }
`
const LETTERS_ONLY = `
  header { display: none !important; }
  html, body, #root, main, #accueil, #accueil > div { background: transparent !important; }
  #accueil > div > *:not(.hero-stage) { display: none !important; }
  .hero-stage > *:not(.crousty-sign) { display: none !important; }
`
const FINAL = `
  #accueil > div > div.absolute.bottom-0.pb-8 > p:nth-of-type(2) { display: none !important; }
  #accueil .hero-cue { display: none !important; }
`

async function open(css) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' })
  const page = await ctx.newPage()
  page.on('console', m => { if (m.type() === 'error') console.log('console :', m.text()) })
  await page.goto(URL, { waitUntil: 'networkidle' })
  if (css) await page.addStyleTag({ content: css })
  await sleep(3500) // les 85 images et l'image finale en cache
  const range = await page.evaluate(() => { const el = document.getElementById('accueil'); return { top: el.offsetTop, range: el.offsetHeight - innerHeight } })
  const go = async (p, wait = 1300) => {
    await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), Math.round(range.top + p * range.range))
    await sleep(wait) // amorti du site (lambda 9) : l'état se fige sur la cible
  }
  return { ctx, page, go }
}

const browser = await chromium.launch()

// 1) Entrée masquée
if (ONLY === 'all' || ONLY === 'entree') {
  const ps = []
  for (let idx = 54; idx <= 84; idx++) ps.push(idx / (COUNT - 1) * WALK)
  for (let k = 1; 0.66 + k * 0.004 <= 1.0001; k++) ps.push(0.66 + k * 0.004)
  const { ctx, page, go } = await open(MASK)
  const manifest = []
  let prev = -1
  for (const p of ps) {
    // Retour en arrière impossible proprement (amorti) : on avance toujours
    if (p < prev) throw new Error('ordre')
    await go(p, prev < 0 ? 2000 : 1150)
    const s = stateAt(p)
    const name = `p${String(Math.round(p * 10000)).padStart(5, '0')}`
    await page.screenshot({ path: join(RAW, 'entree', `${name}.png`) })
    manifest.push({ ...s, file: name })
    prev = p
    process.stdout.write('.')
  }
  fs.writeFileSync(join(RAW, 'entree', 'manifest.json'), JSON.stringify(manifest, null, 1))
  console.log(`\nentrée : ${manifest.length} images`)
  await ctx.close()
}

// 2) Lettres seules, une par une, néon allumé et éteint (posées, p 0,952)
if (ONLY === 'all' || ONLY === 'lettres') {
  for (const glow of ['on', 'off']) {
    const extra = glow === 'off' ? '.hero-stage { --glow: 0 !important; }' : ''
    const { ctx, page, go } = await open(LETTERS_ONLY + extra)
    await go(0.952, 2000)
    for (let i = 0; i < 7; i++) {
      const tag = await page.addStyleTag({ content: `.crousty-letter:not(:nth-child(${i + 1})) { visibility: hidden !important; }` })
      await sleep(150)
      await page.screenshot({ path: join(RAW, 'lettres', `L${i}-${glow}.png`), omitBackground: true })
      await tag.evaluate(n => n.remove())
    }
    await page.screenshot({ path: join(RAW, 'lettres', `all-${glow}.png`), omitBackground: true })
    // Boîtes des lettres à l'écran (repère pour le montage)
    const boxes = await page.evaluate(() => [...document.querySelectorAll('.crousty-letter')].map(l => { const r = l.getBoundingClientRect(); return [r.left * 3, r.top * 3, r.width * 3, r.height * 3].map(Math.round) }))
    fs.writeFileSync(join(RAW, 'lettres', `boxes-${glow}.json`), JSON.stringify(boxes))
    await ctx.close()
  }
  console.log('lettres : OK')
}

// 3) État final (boutons), puis « Compose ton menu » : Burgers, Tacos
if (ONLY === 'all' || ONLY === 'final') {
  const { ctx, page, go } = await open(FINAL)
  await go(1.0, 2000)
  await page.screenshot({ path: join(RAW, 'final.png') })
  const btn = await page.evaluate(() => [...document.querySelectorAll('#accueil a')].map(a => { const r = a.getBoundingClientRect(); return { t: a.textContent.trim(), box: [r.left * 3, r.top * 3, r.width * 3, r.height * 3].map(Math.round) } }))
  fs.writeFileSync(join(RAW, 'final-buttons.json'), JSON.stringify(btn))
  await page.evaluate(() => { const el = document.getElementById('compose'); window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 56, behavior: 'instant' }) })
  await sleep(1200)
  for (const t of ['burgers', 'tacos']) {
    await page.click(`#menu-tab-${t}`)
    await sleep(1800)
    await page.evaluate(() => { const el = document.getElementById('compose'); window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 56, behavior: 'instant' }) })
    await sleep(600)
    await page.screenshot({ path: join(RAW, `compose-${t}.png`) })
  }
  await ctx.close()
  console.log('final + compose : OK')
}

await browser.close()
