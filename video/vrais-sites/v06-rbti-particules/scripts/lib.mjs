// Outils communs de capture du vrai site RBTI (dépôt /home/user/rayenebnt/rbti, jamais modifié).
// Le site est servi en local (python3 -m http.server) et ouvert dans Chromium avec SwiftShader.
// SwiftShader est lent (1 à 3 i/s) : tout est capturé en temps virtuel, image par image :
//   - requestAnimationFrame et performance.now sont remplacés par une horloge virtuelle (__tick) ;
//   - chaque scène WebGL du site peut recevoir un temps ou une progression imposés (__force),
//     c'est toujours le vrai code du site (scenes.js, webgl.js) qui dessine.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs'
import fs from 'fs'

export const SITE = process.env.RBTI_URL || 'http://127.0.0.1:8786/?gl=high'
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

export async function launch() {
  return chromium.launch({ args: ARGS })
}

// Horloge virtuelle + accès aux scènes (même principe que la capture d'exploration frames.mjs)
function initScript() {
  let virt = false, vnow = 0, started = false, id = 1
  const realNow = performance.now.bind(performance)
  const realRaf = window.requestAnimationFrame.bind(window)
  const realCaf = window.cancelAnimationFrame.bind(window)
  let q = new Map()
  performance.now = () => (virt ? vnow : realNow())
  window.requestAnimationFrame = cb => { if (virt) { const k = 'v' + id++; q.set(k, cb); return k } return realRaf(cb) }
  window.cancelAnimationFrame = k => { if (typeof k === 'string') q.delete(k); else realCaf(k) }
  window.__force = {}
  window.__virt = () => { virt = true }
  // Avance l'horloge de ms, exécute les rappels en attente (le moteur dessine), puis lit éventuellement un canvas
  window.__tick = (ms, grab) => {
    if (!started) { started = true; vnow = realNow() }
    vnow += ms
    const cbs = [...q.values()]
    q = new Map()
    for (const cb of cbs) { try { cb(vnow) } catch (e) { console.warn(e) } }
    if (!grab) return null
    const c = document.querySelector(grab.sel)
    if (!c) return null
    if (!grab.crop) return c.toDataURL('image/png')
    const [x, y, w, h] = grab.crop
    const o = document.createElement('canvas'); o.width = w; o.height = h
    o.getContext('2d').drawImage(c, x, y, w, h, 0, 0, w, h)
    return o.toDataURL('image/png')
  }
  // Enveloppe le rendu de chaque scène : temps / progression imposés si __force[nom] existe
  window.__wrapScenes = () => {
    const names = []
    document.querySelectorAll('canvas[data-scene]').forEach(c => {
      const s = c.__rbtiScene
      if (!s || !s.api || s.__wrapped) return
      const orig = s.api.render
      s.api.render = function (t, dt, sc) {
        const f = window.__force[s.name]
        if (f) {
          if (f.t != null) t = f.t
          if (f.dt != null) dt = f.dt
          if (f.progress != null) sc.progress = f.progress
          if (f.rail != null) sc.rail = f.rail
        }
        return orig.call(this, t, dt, sc)
      }
      s.__wrapped = true
      names.push(s.name)
    })
    return names
  }
}

export async function openPage(browser, { width, height, dpr = 1, mobile = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile })
  const page = await ctx.newPage()
  page.on('pageerror', e => console.error('Erreur page :', e.message))
  await page.addInitScript(initScript)
  await page.goto(SITE, { waitUntil: 'domcontentloaded' })
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' })
  await page.waitForFunction(() => document.documentElement.classList.contains('is-ready'), null, { timeout: 30000 })
  await page.waitForTimeout(1500)
  const wrapped = await page.evaluate(() => window.__wrapScenes())
  console.log('scènes :', wrapped.join(', '))
  return { ctx, page }
}

export const sleep = (page, ms) => page.waitForTimeout(ms)
// Passe en temps virtuel. Le moteur du site a déjà demandé une image au vrai requestAnimationFrame :
// on attend qu'elle passe (≈ 0,4 s réelle) pour que la boucle tourne ensuite sur l'horloge virtuelle.
export async function goVirtual(page) {
  await page.evaluate(() => window.__virt())
  await page.waitForTimeout(400)
}
export const scrollTo = (page, y) => page.evaluate(v => window.scrollTo({ top: v, behavior: 'instant' }), y)
export const topOf = (page, sel) => page.evaluate(s => document.querySelector(s).getBoundingClientRect().top + scrollY, sel)
export const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export function savePng(path, dataUrl) {
  fs.writeFileSync(path, Buffer.from(dataUrl.split(',')[1], 'base64'))
}

// Place un canvas de scène en plein cadre (déplacé sous <body> : un ancêtre transformé ne le décale plus)
export async function isolateCanvas(page, sel, size) {
  await page.evaluate(({ sel, size }) => {
    const c = document.querySelector(sel)
    document.body.appendChild(c)
    c.style.cssText = `position:fixed!important;left:0;top:0;width:${size}px!important;height:${size}px!important;z-index:2147483647;transform:none!important;opacity:1!important;filter:none!important;visibility:visible!important;display:block!important;max-width:none!important`
    document.querySelectorAll('canvas[data-scene]').forEach(o => { if (o !== c) o.style.display = 'none' })
    // visible tout de suite (sans attendre l'IntersectionObserver, qui ne passe pas en temps virtuel)
    if (c.__rbtiScene) c.__rbtiScene.onScreen = true
  }, { sel, size })
}
