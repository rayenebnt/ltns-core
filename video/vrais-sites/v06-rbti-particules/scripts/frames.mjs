// Images fixes de la vidéo pour vérifier (sans rendre le MP4) :
//   node scripts/frames.mjs <dossier de sortie> [--step=0.5] [--t=0,0.5,1]
// Prérequis : serveur du dépôt sur le port 8765.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs'
import fs from 'node:fs'
const out = process.argv[2] || '/tmp/v06-frames'
const opt = n => (process.argv.find(a => a.startsWith(`--${n}=`)) || '').split('=')[1]
fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
page.on('pageerror', e => console.log('Erreur page :', e.message))
page.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') console.log('console:', m.text()) })
await page.goto('http://localhost:8765/video/vrais-sites/v06-rbti-particules/tiktok.html?render', { waitUntil: 'networkidle', timeout: 180000 })
await page.waitForFunction(() => window.READY, null, { timeout: 120000 })
const D = await page.evaluate(() => window.DURATION)
const step = +(opt('step') || 0.5)
const P = Math.ceil(D * 30) / 30
const times = opt('t') ? opt('t').split(',').map(Number) : Array.from({ length: Math.floor(D / step) + 1 }, (_, i) => +(i * step).toFixed(3))
if (!opt('t')) times.push(+(P - 1 / 30).toFixed(4))
for (const t of times) {
  await page.evaluate(async t => { renderAt(t); await settle() }, t)
  await page.screenshot({ path: `${out}/t${t.toFixed(2).padStart(6, '0')}.jpg`, type: 'jpeg', quality: 85 })
}
const d = await page.evaluate(() => ({ D: window.DURATION, times: window.K.TIMES, TL: window.TL }))
fs.writeFileSync(`${out}/timing.json`, JSON.stringify(d, null, 1))
console.log('durée', D.toFixed(2), 's,', times.length, 'images →', out)
await browser.close()
