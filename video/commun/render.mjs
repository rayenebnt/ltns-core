// Rendu MP4 d'un épisode (son tiktok.html) : capture image par image, puis assemblage ffmpeg.
//   node video/commun/render.mjs video/tiktok-episode-02 [sortie.mp4]            (images + son)
//   node video/commun/render.mjs video/tiktok-episode-02 [sortie.mp4] --mux-only (son seulement)
//   options : --page=pc.html --size=1920x1080 pour rendre une autre page de l'épisode (ex. la version PC)
// Prérequis : un serveur local à la racine du dépôt sur le port 8765
//   python3 -m http.server 8765 --directory <racine du dépôt>
// Si voice.mp3 existe dans le dossier de l'épisode, il est mixé. Les bruitages (pop, tic…) ne sont ajoutés qu'avec --bruitages.
import { execFileSync } from 'child_process'
import { mkdirSync, rmSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { dirname, join, resolve, relative, basename } from 'path'
import { fileURLToPath } from 'url'
import { cpus } from 'os'

// Playwright du projet si installé (npm i -D playwright), sinon celui de la machine
const { chromium } = await import('playwright').catch(() => import('/opt/node-tools/node_modules/playwright/index.mjs'))

const COMMUN = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(COMMUN, '..', '..')
const [episodeArg, outArg] = process.argv.slice(2).filter(a => !a.startsWith('--'))
if (!episodeArg) { console.error('Usage : node render.mjs <dossier de l\'épisode> [sortie.mp4] [--mux-only]'); process.exit(1) }
const HERE = resolve(episodeArg)
const opt = name => (process.argv.find(a => a.startsWith(`--${name}=`)) || '').split('=')[1]
const PAGE = opt('page') || 'tiktok.html'
const [W, H] = (opt('size') || '1080x1920').split('x').map(Number)
const SUFFIX = PAGE === 'tiktok.html' ? '' : `-${basename(PAGE, '.html')}`
const OUT = outArg ? resolve(outArg) : join(HERE, `ltns-${basename(HERE)}${SUFFIX}.mp4`)
const FRAMES = join(HERE, `.frames${SUFFIX}`)
const URL = `http://localhost:8765/${relative(ROOT, HERE).split('\\').join('/')}/${PAGE}?render`
const FPS = 30
const WORKERS = Math.max(1, Math.min(3, cpus().length - 1))

const MUX_ONLY = process.argv.includes('--mux-only')
if (!MUX_ONLY) {
rmSync(FRAMES, { recursive: true, force: true })
mkdirSync(FRAMES, { recursive: true })

const browser = await chromium.launch()

async function openPage() {
  const page = await browser.newPage({ viewport: { width: W, height: H } })
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

} // fin du rendu des images

// Habillage sonore synthétisé (pop, tic, souffle) : seulement avec --bruitages.
// Par défaut la voix seule, sur une piste muette de la durée de la vidéo.
const SFX = process.argv.includes('--bruitages')
const base = join(FRAMES, SFX ? 'sfx.wav' : 'silence.wav')
if (SFX) {
  execFileSync('python3', [join(COMMUN, 'sfx.py'), join(FRAMES, 'events.json'), base], { stdio: 'inherit' })
} else {
  const seconds = readdirSync(FRAMES).filter(f => f.endsWith('.jpg')).length / FPS
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', String(seconds), base])
}

const voice = join(HERE, 'voice.mp3')
const args = ['-v', 'error', '-y', '-framerate', String(FPS), '-i', join(FRAMES, '%05d.jpg'), '-i', base]
let filter
if (existsSync(voice)) {
  args.push('-i', voice)
  // La voix devant, l'habillage en retrait
  // --delay=3 : la voix démarre plus tard (pré-roll de la version PC)
  const ms = Math.round(1000 * (+opt('delay') || 0))
  filter = `[1:a]volume=0.55[s];[2:a]${ms ? `adelay=${ms}|${ms},` : ''}volume=1.0[v];[s][v]amix=inputs=2:duration=first:normalize=0`
} else {
  filter = '[1:a]volume=0.8'
}
// Volume au niveau des autres vidéos TikTok (≈ −14 LUFS), sans saturer
filter += ',loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100[a]'
args.push('-filter_complex', filter, '-map', '0:v', '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', OUT)
execFileSync('ffmpeg', args, { stdio: 'inherit' })
console.log(`OK : ${OUT}`)
