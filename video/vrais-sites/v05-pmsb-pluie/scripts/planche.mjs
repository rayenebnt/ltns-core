// Planche de contrôle : rend tiktok.html à des instants donnés (même chemin que render.mjs : renderAt + settle).
//   node planche.mjs <sortie.png> [t1,t2,…|pas=1] [largeur vignette=270] [--zones]
// Sans liste : 0, 0,5, 1, 1,5, 2, 3, 4, … jusqu'à la fin, plus la dernière image (raccord de boucle).
// --zones : trace les zones TikTok (rien d'important sous y = 1260, ni à x > 940 entre y = 900 et 1500).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

const args = process.argv.slice(2).filter(a => !a.startsWith('--'))
const ZONES = process.argv.includes('--zones')
const [out, list, wArg] = args
const W = +(wArg || 270), H = Math.round(W * 16 / 9)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
page.on('pageerror', e => { console.error('Erreur page :', e.message); process.exit(1) })
page.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') console.log('console', m.text()) })
await page.goto('http://localhost:8765/video/vrais-sites/v05-pmsb-pluie/tiktok.html?render', { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.READY, null, { timeout: 180000 })
const dur = await page.evaluate(() => window.DURATION)
const last = (Math.ceil(dur * 30) - 1) / 30
let times
if (list && list.includes(',')) times = list.split(',').map(Number)
else {
  times = [0, 0.5, 1, 1.5, 2]
  for (let t = 3; t < dur; t += +(list || 1)) times.push(+t.toFixed(2))
  times.push(+last.toFixed(3))
}
if (ZONES) await page.evaluate(() => {
  const z = document.createElement('div')
  z.style.cssText = 'position:absolute;inset:0;z-index:999;pointer-events:none'
  z.innerHTML = '<div style="position:absolute;left:0;right:0;top:1260px;bottom:0;background:rgba(255,0,0,.18);border-top:3px solid red"></div><div style="position:absolute;left:940px;right:0;top:900px;height:600px;background:rgba(255,0,0,.25);border-left:3px solid red"></div>'
  document.getElementById('stage').appendChild(z)
})
const dir = out.replace(/\.png$/, '')
fs.mkdirSync(dir, { recursive: true })
const files = []
for (const t of times) {
  await page.evaluate(async t => { renderAt(t); await settle() }, t)
  const f = `${dir}/t${t.toFixed(2).padStart(6, '0')}.png`
  await page.screenshot({ path: f })
  files.push(f)
}
await browser.close()
const cols = Math.min(8, files.length)
const inputs = []
files.forEach(f => inputs.push('-i', f))
const filt = files.map((f, i) => `[${i}:v]scale=${W}:${H},drawtext=text='${times[i].toFixed(2)} s':x=8:y=h-34:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.6[v${i}]`).join(';')
const layout = files.map((f, i) => `${(i % cols) * W}_${Math.floor(i / cols) * H}`).join('|')
execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', `${filt};${files.map((f, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${layout}:fill=gray[o]`, '-map', '[o]', '-frames:v', '1', out])
console.log('durée', dur.toFixed(2), 's ·', files.length, 'vignettes ->', out)
