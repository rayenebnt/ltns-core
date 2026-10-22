// Images fixes de la vidéo, pour vérifier la mise en page sans tout rendre.
//   node video/vrais-sites/v01-crousty-lettres/scripts/frames.mjs <dossier de sortie> 0 0.5 1 … | --step=0.5
// Nécessite le serveur local du dépôt sur le port 8765 (voir README).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs'
import fs from 'node:fs'
import { join } from 'node:path'

const [out, ...rest] = process.argv.slice(2)
const step = +((rest.find(a => a.startsWith('--step=')) || '').split('=')[1] || 0)
let times = rest.filter(a => !a.startsWith('--')).map(Number)
fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
page.on('pageerror', e => { console.error('Erreur page :', e.message); process.exit(1) })
page.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') console.log('console :', m.text()) })
await page.goto('http://localhost:8765/video/vrais-sites/v01-crousty-lettres/tiktok.html?render', { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.READY)
const info = await page.evaluate(() => ({ duration: window.DURATION, TIMES: window.K.TIMES, C: window.K.C }))
console.log('durée', info.duration.toFixed(2))
if (step) { times = []; for (let t = 0; t < info.duration; t += step) times.push(+t.toFixed(3)); times.push(+(info.duration - 1 / 30).toFixed(3)) }
fs.writeFileSync(join(out, 'info.json'), JSON.stringify(info, null, 1))
for (const t of times) {
  await page.evaluate(async t => { renderAt(t); await settle() }, t)
  await page.screenshot({ path: join(out, `t${t.toFixed(2).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 85 })
}
await browser.close()
