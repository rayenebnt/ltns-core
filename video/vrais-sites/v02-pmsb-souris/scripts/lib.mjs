// Outils de capture en temps virtuel (repris de l'exploration, scratchpad/pmsb-scripts/seq.mjs).
// Le rendu WebGL logiciel (SwiftShader) est lent : on fige l'horloge de la page et on avance
// image par image, en calant aussi chaque animation CSS sur l'horloge virtuelle.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs'
import fs from 'node:fs'

export const BASE = process.env.PMSB_URL || 'http://localhost:3102'

export const VIEWS = {
  // Ordinateur 1440 x 900, rendu à 2,1333 px par px CSS : 900 px CSS = 1920 px de vidéo
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1920 / 900 },
  desktop1: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: {
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
}

const SYNC = `
window.__vsync = () => {
  const now = performance.now();
  for (const a of document.getAnimations()) {
    if (a.__vt0 === undefined) { a.__vt0 = now; try { a.pause(); } catch (e) {} }
    try { a.currentTime = now - a.__vt0; } catch (e) {}
  }
};`

// Données à ne jamais montrer : numéro de l'en-tête, rails latéraux (adresse, mention RGE)
export const MASK_PRIVATE = `
  header a[href^="tel:"], header a[href^="mailto:"] { visibility: hidden !important; }
  [class*="SideRail"] { visibility: hidden !important; }
`

export const ease = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))

export async function launch() { return chromium.launch() }

export async function open(browser, view, path, { css = '', pauseFirst = true } = {}) {
  const ctx = await browser.newContext(VIEWS[view])
  const page = await ctx.newPage()
  page.on('pageerror', e => console.log('PAGEERR', e.message))
  await page.addInitScript(SYNC)
  if (css) await page.addInitScript(c => {
    const add = () => { const s = document.createElement('style'); s.textContent = c; document.documentElement.appendChild(s) }
    if (document.documentElement) add(); else document.addEventListener('DOMContentLoaded', add)
  }, css)
  await page.clock.install({ time: new Date('2026-10-22T10:00:00Z') })
  if (pauseFirst) await page.clock.pauseAt(new Date('2026-10-22T10:00:01Z'))
  await page.goto(BASE + path, { waitUntil: 'load' })
  return { ctx, page }
}

export async function step(page, fps) {
  // un pas d'image, arrondi à la milliseconde, sans dérive
  page.__f = (page.__f || 0) + 1
  const ms = Math.round((page.__f * 1000) / fps) - Math.round(((page.__f - 1) * 1000) / fps)
  await page.clock.runFor(ms)
  await page.evaluate(() => window.__vsync && window.__vsync())
}

export async function advance(page, ms, fps = 30, perFrame) {
  const n = Math.round((ms / 1000) * fps)
  for (let f = 0; f < n; f++) { if (perFrame) await perFrame(f / fps); await step(page, fps) }
}

// Enregistre n images JPEG (qualité 95) dans dir ; perFrame(t) est appelé avant chaque pas
export async function record(page, dir, seconds, { fps = 30, perFrame, after, clip } = {}) {
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  const n = Math.round(seconds * fps)
  const t0 = Date.now()
  for (let f = 0; f < n; f++) {
    if (perFrame) await perFrame(f / fps, f, n)
    await step(page, fps)
    await page.screenshot({ path: `${dir}/f${String(f).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 95, clip })
    if (after) await after(f / fps, f)
    if (f % 30 === 29) console.log(`  ${dir.split('/').pop()} ${f + 1}/${n} ${((Date.now() - t0) / 1000).toFixed(0)} s`)
  }
  return n
}
