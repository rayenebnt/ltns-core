// Rendu MP4 de tiktok.html : capture image par image, puis assemblage ffmpeg.
//   node render.mjs [sortie.mp4]
// Prérequis : un serveur local à la racine du dépôt sur le port 8765
//   python3 -m http.server 8765 --directory <racine du dépôt>
// Si voice.mp3 existe à côté de ce fichier, il est mixé avec l'habillage sonore.
import { execFileSync } from 'child_process'
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { cpus } from 'os'

// Playwright du projet si installé (npm i -D playwright), sinon celui de la machine
const { chromium } = await import('playwright').catch(() => import('/opt/node-tools/node_modules/playwright/index.mjs'))

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = process.argv[2] || join(HERE, 'ltns-tiktok-site-froid.mp4')
const FRAMES = join(HERE, '.frames')
const URL = 'http://localhost:8765/video/tiktok-site-froid/tiktok.html?render'
const FPS = 30
const WORKERS = Math.max(1, Math.min(3, cpus().length - 1))

rmSync(FRAMES, { recursive: true, force: true })
mkdirSync(FRAMES, { recursive: true })

const browser = await chromium.launch()

async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
  page.on('pageerror', e => { console.error('Erreur page :', e.message); process.exit(1) })
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.READY)
  const cdp = await page.context().newCDPSession(page)
  return { page, cdp }
}

const first = await openPage()
const duration = await first.page.evaluate(() => window.DURATION)
const total = Math.ceil(duration * FPS)
// Instants des temps forts, pour l'habillage sonore
const events = await first.page.evaluate(() => TL.map(b => ({ t: b.t, kind: b.sfx || (b.insert ? 'pop' : 'tick') })))
writeFileSync(join(FRAMES, 'events.json'), JSON.stringify({ duration, events }))

console.log(`Rendu de ${total} images (${duration.toFixed(2)} s) sur ${WORKERS} navigateurs…`)
const started = Date.now()
let done = 0

// Chaque navigateur rend une tranche continue de la vidéo
async function worker({ page, cdp }, from, to) {
  for (let i = from; i < to; i++) {
    await page.evaluate(async t => { renderAt(t); await settle() }, i / FPS)
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, optimizeForSpeed: true })
    writeFileSync(join(FRAMES, `${String(i).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64'))
    if (++done % 150 === 0) console.log(`  ${done}/${total} — ${((Date.now() - started) / 1000).toFixed(0)} s`)
  }
}
const pages = [first, ...(await Promise.all(Array.from({ length: WORKERS - 1 }, openPage)))]
const slice = Math.ceil(total / WORKERS)
await Promise.all(pages.map((pg, k) => worker(pg, k * slice, Math.min(total, (k + 1) * slice))))
await browser.close()
console.log(`Images rendues en ${((Date.now() - started) / 1000).toFixed(0)} s`)

// Habillage sonore synthétisé (pop, tic, souffle)
execFileSync('python3', [join(HERE, 'sfx.py'), join(FRAMES, 'events.json'), join(FRAMES, 'sfx.wav')], { stdio: 'inherit' })

const voice = join(HERE, 'voice.mp3')
const args = ['-v', 'error', '-y', '-framerate', String(FPS), '-i', join(FRAMES, '%05d.jpg'), '-i', join(FRAMES, 'sfx.wav')]
let filter
if (existsSync(voice)) {
  args.push('-i', voice)
  // La voix devant, l'habillage en retrait
  filter = '[1:a]volume=0.55[s];[2:a]volume=1.0[v];[s][v]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]'
} else {
  filter = '[1:a]volume=0.8,alimiter=limit=0.95[a]'
}
args.push('-filter_complex', filter, '-map', '0:v', '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', OUT)
execFileSync('ffmpeg', args, { stdio: 'inherit' })
console.log(`OK : ${OUT}`)
