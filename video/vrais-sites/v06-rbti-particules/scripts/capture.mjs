// Captures du vrai site RBTI pour la vidéo 06 (temps virtuel, image par image).
//   node capture.mjs <job> <dossier brut> [options]
// Jobs :
//   morph  : la scène « morph » (4 200 particules) seule, 1440 × 1440, sur un cycle complet du site
//   macro  : la même scène en 3240 × 3240, recadrée 1080 × 1080 sur le faîte de la maison (plan macro)
//   mark   : le logo RBTI extrudé en 3D (scène « mark ») seul, 1080 × 1080
//   cta    : la carte de contact en mobile (390 × 844 @3), canvas masqué + positions (pour flouter)
//   hero   : le héros vertical 1080 × 1920 : ville seule (tenue puis descente de l'avenue), titre H1 seul
//   rail   : la méthode en ordinateur 1440 × 900 : rail épinglé, couloir de portes, compteur 01 → 06
//   field  : les avantages en ordinateur 1440 × 900 : 416 cubes qui se soulèvent sous le curseur
import fs from 'fs'
import { launch, openPage, sleep, scrollTo, topOf, ease, savePng, isolateCanvas, goVirtual } from './lib.mjs'

const [JOB, OUT0] = process.argv.slice(2)
if (!JOB || !OUT0) { console.error('Usage : node capture.mjs <job> <dossier>'); process.exit(1) }
const OUT = `${OUT0}/${JOB}`
fs.mkdirSync(OUT, { recursive: true })
const FPS = 30, DT = 1000 / FPS
const pad = i => String(i).padStart(4, '0')
const LIMIT = +(process.env.LIMIT || 1e9)   // essai rapide : LIMIT=3

// Cycle du site (scenes.js) : forme = ((t · 0,92) mod 14,8) / 3,7 → 0 maison, 1 clé, 2 €, 3 marque.
// Cycle n° 3 : la maison est pure de face (balancement sin(t · 0,26) quasi nul) à T_H = 3 × 14,8 / 0,92.
const T_H = 3 * 14.8 / 0.92, PH = 3.7 / 0.92
const tOf = phase => T_H + phase * PH

const browser = await launch()
const started = Date.now()
const log = (...a) => console.log(`[${JOB} ${((Date.now() - started) / 1000).toFixed(0)} s]`, ...a)

if (JOB === 'morph' || JOB === 'macro') {
  const macro = JOB === 'macro'
  const SIZE = macro ? 3240 : 1440
  const FROM = macro ? -0.42 : -0.85, TO = macro ? 0.06 : 3.05
  // Plan macro : 1080 × 1080 autour du faîte du toit (x 1080-2160, y 360-1440 sur 3240)
  const crop = macro ? [1080, 380, 1080, 1080] : null
  const { page } = await openPage(browser, { width: 1080, height: 1080 })
  await isolateCanvas(page, '.cta-canvas', SIZE)
  await goVirtual(page)
  for (let w = 0; w < 3; w++) {   // chauffe : le canvas prend sa nouvelle taille
    await page.evaluate(t => { window.__force.morph = { t } }, tOf(FROM))
    await page.evaluate(() => window.__tick(1000 / 30))
  }
  const n = Math.round((TO - FROM) * PH * FPS) + 1
  for (let i = 0; i < Math.min(n, LIMIT); i++) {
    const t = tOf(FROM) + i / FPS
    await page.evaluate(t => { window.__force.morph = { t } }, t)
    const d = await page.evaluate(g => window.__tick(1000 / 30, g), { sel: '.cta-canvas', crop })
    if (!d) throw new Error('canvas illisible')
    savePng(`${OUT}/a${pad(i)}.png`, d)
    if (i % 30 === 0) log(i, '/', n)
  }
  fs.writeFileSync(`${OUT}/meta.json`, JSON.stringify({ fps: FPS, size: SIZE, crop, from: FROM, to: TO, T_H, PH, frames: n }, null, 1))
}

if (JOB === 'mark') {
  const { page } = await openPage(browser, { width: 1080, height: 1080 })
  await isolateCanvas(page, '.about-mark', 1080)
  await goVirtual(page)
  // Fenêtre où l'oscillation du site (sin(t · 0,36) · 0,52) passe de face : t ≈ 26,2 s ;
  // 3 s de chauffe pour que le lissage de la rotation suive, puis 4 s enregistrées
  const T0 = 25.6, WARM = 90, N = 120
  for (let i = -WARM; i < N; i++) {
    await page.evaluate(t => { window.__force.mark = { t } }, T0 + i / FPS)
    const d = await page.evaluate(g => window.__tick(1000 / 30, g), i >= 0 ? { sel: '.about-mark' } : null)
    if (i >= 0) savePng(`${OUT}/a${pad(i)}.png`, d)
    if (i % 30 === 0) log(i, '/', N)
  }
  fs.writeFileSync(`${OUT}/meta.json`, JSON.stringify({ fps: FPS, T0, frames: N }))
}

if (JOB === 'cta') {
  const { page } = await openPage(browser, { width: 390, height: 844, dpr: 3, mobile: true })
  const y = await topOf(page, '.cta-inner')
  await scrollTo(page, y - 70)
  await sleep(page, 2500)
  // Toutes les apparitions terminées avant de mesurer : positions et capture identiques
  await page.evaluate(() => document.getAnimations().forEach(a => { try { a.finish() } catch (e) {} }))
  await sleep(page, 600)
  const rects = await page.evaluate(() => {
    const r = el => { const b = el.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map(v => Math.round(v * 100) / 100) }
    const q = s => [...document.querySelectorAll(s)].map(r)
    return {
      scrollY, inner: q('.cta-inner'), canvas: q('.cta-canvas'), title: q('.cta-title'),
      buttons: q('.cta-actions a'), lines: q('.cta-lines li'), header: q('header'),
    }
  })
  fs.writeFileSync(`${OUT}/rects.json`, JSON.stringify(rects, null, 1))
  await page.screenshot({ path: `${OUT}/with-canvas.png` })
  await page.evaluate(() => { document.querySelector('.cta-canvas').style.visibility = 'hidden' })
  await sleep(page, 300)
  await page.screenshot({ path: `${OUT}/card-bg.png` })
  log('ok', JSON.stringify(rects))
}

async function heroTitle(page, geo) {
  // Horloge virtuelle dès maintenant : entre deux images, la page ne dessine plus rien (SwiftShader est lent)
  await goVirtual(page)
  // 1) Le titre seul, sur fond transparent, pendant sa vraie apparition (transitions CSS du site, figées pas à pas)
  await page.addStyleTag({ content: `
    #v06hide body * { visibility: hidden !important; }
    #v06hide .hero-title, #v06hide .hero-title * { visibility: visible !important; }
    #v06hide, #v06hide body, #v06hide main, #v06hide .hero, #v06hide .hero-grid { background: transparent !important; }
    #v06hide body::before, #v06hide body::after, #v06hide .hero::before, #v06hide .hero::after { display: none !important; }` })
  await page.evaluate(() => { document.documentElement.id = 'v06hide' })
  const clip = { x: 0, y: Math.round(geo.h1[1] - 70), width: 1080, height: Math.round(geo.h1[3] + 150) }
  await page.evaluate(() => {
    const h1 = document.querySelector('.hero-title')
    const units = [h1, ...h1.querySelectorAll('.split-unit')]
    units.forEach(u => { u.style.transition = 'none' })
    h1.classList.remove('is-in'); void h1.offsetWidth
    units.forEach(u => { u.style.transition = '' }); void h1.offsetWidth
    h1.classList.add('is-in')
    window.__h1anims = document.getAnimations().filter(a => a.effect && (a.effect.target === h1 || h1.contains(a.effect.target)))
    window.__h1anims.forEach(a => a.pause())
  })
  const nA = await page.evaluate(() => window.__h1anims.length)
  log('transitions du titre :', nA)
  const STEPS = 46   // 1,5 s à 30 i/s
  for (let i = 0; i < STEPS; i++) {
    await page.evaluate(ms => window.__h1anims.forEach(a => { a.currentTime = ms }), i * DT)
    await page.screenshot({ path: `${OUT}/h1-${pad(i)}.png`, clip, omitBackground: true })
  }
  await page.evaluate(() => window.__h1anims.forEach(a => a.finish()))
  await page.screenshot({ path: `${OUT}/h1-final.png`, clip, omitBackground: true })
  fs.writeFileSync(`${OUT}/h1-clip.json`, JSON.stringify(clip))
  await page.evaluate(() => { document.documentElement.id = '' })
}

if (JOB === 'hero') {
  const { page } = await openPage(browser, { width: 1080, height: 1920 })
  await scrollTo(page, 0)
  await sleep(page, 1500)
  // Positions du titre et des mots « votre » et « locataire, »
  const geo = await page.evaluate(() => {
    const r = el => { const b = el.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map(v => Math.round(v * 10) / 10) }
    const h1 = document.querySelector('.hero-title')
    const words = [...h1.querySelectorAll('.split-word')].map(w => ({ w: w.textContent.trim(), r: r(w) }))
    return { h1: r(h1), words, lead: r(document.querySelector('.hero .lead')), facts: r(document.querySelector('.hero-facts')) }
  })
  fs.writeFileSync(`${OUT}/geo.json`, JSON.stringify(geo, null, 1))
  await page.screenshot({ path: `${OUT}/full.png` })
  if (!process.env.CITY_ONLY) await heroTitle(page, geo)
  else await goVirtual(page)
  // 2) La ville seule (titre, texte et puces masqués), tenue puis descente de l'avenue (progression imposée)
  await page.addStyleTag({ content: '.hero-grid { visibility: hidden !important; }' })
  await sleep(page, 400)
  // Progression réelle du héros en haut de page : (vh − top) / (vh + hauteur), soit ≈ 0,5 ;
  // la descente reprend la suite de ce que fait le défilement (la caméra plonge dans l'avenue)
  const P0 = await page.evaluate(() => { const r = document.querySelector('.hero-canvas').getBoundingClientRect(); return (innerHeight - r.top) / (innerHeight + r.height) })
  const HOLD = 105, DIVE = 75, PMAX = Math.min(0.97, P0 + 0.4)
  log('progression au repos', P0.toFixed(3), '→', PMAX.toFixed(3))
  for (let i = 0; i < HOLD + DIVE; i++) {
    const p = i < HOLD ? P0 : P0 + (PMAX - P0) * ease(Math.min(1, (i - HOLD + 1) / DIVE))
    await page.evaluate(p => { window.__force.skyline = { progress: p } }, p)
    await page.evaluate(() => window.__tick(1000 / 30))
    await page.screenshot({ path: `${OUT}/city-${pad(i)}.jpg`, type: 'jpeg', quality: 93 })
    if (i % 15 === 0) log('ville', i, '/', HOLD + DIVE)
  }
  fs.writeFileSync(`${OUT}/meta.json`, JSON.stringify({ fps: FPS, hold: HOLD, dive: DIVE, p0: P0, pmax: PMAX }))
}

if (JOB === 'gates') {
  // Le couloir de portes seul (scène « gates »), cadre vertical 1080 × 1920, rail imposé 0 → 0,16 :
  // la caméra avance et traverse le premier portique allumé
  const { page } = await openPage(browser, { width: 1080, height: 1920 })
  await page.evaluate(() => {
    const c = document.querySelector('.method-canvas')
    document.body.appendChild(c)
    c.style.cssText = 'position:fixed!important;left:0;top:0;width:1080px!important;height:1920px!important;z-index:2147483647;transform:none!important'
    document.querySelectorAll('canvas[data-scene]').forEach(o => { if (o !== c) o.style.display = 'none' })
  })
  await goVirtual(page)
  const WARM = 120, N = 75, R1 = 0.16
  for (let i = -WARM; i < N; i++) {
    const rail = i < 0 ? 0 : R1 * ease(i / (N - 1))
    await page.evaluate(r => { window.__force.gates = { rail: r } }, rail)
    const d = await page.evaluate(g => window.__tick(1000 / 30, g), i >= 0 ? { sel: '.method-canvas' } : null)
    if (i >= 0) savePng(`${OUT}/a${pad(i)}.png`, d)
    if (i % 15 === 0) log(i, '/', N)
  }
  fs.writeFileSync(`${OUT}/meta.json`, JSON.stringify({ fps: FPS, frames: N, rail: [0, R1] }))
}

if (JOB === 'rail') {
  const { page } = await openPage(browser, { width: 1440, height: 900 })
  const y = await topOf(page, '#property')
  const h = await page.evaluate(() => document.querySelector('#property').offsetHeight)
  const a = y - 40, b = y + h - 900
  await scrollTo(page, a)
  await sleep(page, 2500)
  await goVirtual(page)
  const N = 150, steps = []
  for (let i = 0; i < N; i++) {
    await scrollTo(page, a + (b - a) * ease(Math.min(1, i / (N - 1))))
    await page.evaluate(() => window.__tick(1000 / 30))
    await page.screenshot({ path: `${OUT}/f${pad(i)}.jpg`, type: 'jpeg', quality: 92 })
    steps.push(await page.evaluate(() => { const e = document.querySelector('[data-rail-step]'); return e ? e.textContent.trim() : '' }))
    if (i % 15 === 0) log(i, '/', N, steps[i])
  }
  fs.writeFileSync(`${OUT}/meta.json`, JSON.stringify({ fps: FPS, frames: N, steps }))
}

if (JOB === 'field') {
  const { page } = await openPage(browser, { width: 1440, height: 900 })
  const y = await topOf(page, '#avantages')
  await scrollTo(page, y + 60)
  await page.mouse.move(200, 560)
  await sleep(page, 2500)
  await goVirtual(page)
  const N = 90, WARM = 20
  for (let i = -WARM; i < N; i++) {
    const k = Math.max(0, i) / (N - 1)
    await page.mouse.move(1440 * (0.12 + 0.76 * k), 900 * (0.58 + 0.1 * Math.sin(k * Math.PI * 2)))
    await page.evaluate(() => window.__tick(1000 / 30))
    if (i >= 0) await page.screenshot({ path: `${OUT}/f${pad(i)}.jpg`, type: 'jpeg', quality: 92 })
    if (i % 15 === 0) log(i, '/', N)
  }
  fs.writeFileSync(`${OUT}/meta.json`, JSON.stringify({ fps: FPS, frames: N }))
}

await browser.close()
log('terminé')
