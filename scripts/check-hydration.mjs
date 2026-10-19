// Test d'hydratation (outil de dev, jamais lancé par le build Vercel) :
//   npm run build && npm run check:hydration
//
// Chaque page pré-rendue de dist/ est reprise par React dans un faux navigateur
// (jsdom), une fois en bureau et une fois en téléphone. Le test échoue si React
// signale la moindre erreur (HTML du serveur différent de celui du navigateur,
// attribut inconnu…) ou si le <h1> d'origine a été remplacé au lieu d'être repris.
//
// React tourne ici en version développement (NODE_ENV n'est pas « production ») :
// ses avertissements comptent comme des erreurs.
//
// Chaque page × écran tourne dans son propre processus Node : gsap, les minuteries
// et React gardent sinon la fenêtre du premier essai.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { format } from 'node:util'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const DIST = path.join(ROOT, 'dist')
const BUNDLE = path.join(ROOT, '.ssr-check', 'entry-hydrate.js')
const SELF = fileURLToPath(import.meta.url)

// Pages outils de public/, sans React
const SKIP = new Set(['affiche.html', 'logo.html', 'motion.html'])

// Réponse des media queries : bureau → aucune ; téléphone → écran étroit et tactile
const VIEWPORTS = {
  desktop: () => false,
  phone: q => q.includes('max-width: 720px') || q.includes('pointer: coarse'),
}

const WAIT = 1500
const MARK = '@@hydratation '

// index.html → /, x.html → /x, 404.html → une adresse inconnue
const urlFor = file => {
  if (file === '404.html') return '/une-page-qui-nexiste-pas'
  if (file === 'index.html') return '/'
  return '/' + file.replace(/\.html$/, '')
}

const htmlFiles = (dir, base = '') => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  const rel = base ? `${base}/${e.name}` : e.name
  if (e.isDirectory()) return htmlFiles(path.join(dir, e.name), rel)
  return e.name.endsWith('.html') && !SKIP.has(rel) ? [rel] : []
})

// ---------- Un essai : une page, un écran ----------
async function runOne(file, urlPath, viewport) {
  const { JSDOM, VirtualConsole } = await import('jsdom')
  const errors = []
  const text = args => format(...args.map(a => (a instanceof Error ? a.message : a))).replace(/\s+/g, ' ').slice(0, 300)

  // Les erreurs internes de jsdom (fonction non simulée…) comptent aussi
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', e => errors.push('[jsdom] ' + e.message))

  const html = fs.readFileSync(path.join(DIST, file), 'utf8').replace(/<script\b[\s\S]*?<\/script>/gi, '')
  const dom = new JSDOM(html, { url: 'https://ltns.fr' + urlPath, pretendToBeVisual: true, virtualConsole })
  const w = dom.window

  // Ce que jsdom ne fournit pas
  const matches = VIEWPORTS[viewport]
  w.matchMedia = q => ({
    matches: matches(q), media: q, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
    dispatchEvent: () => false,
  })
  // Contexte 2D factice : toute méthode existe et ne fait rien
  w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : () => {}),
    set: (t, k, v) => { t[k] = v; return true },
  })
  w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return [] } }
  w.Element.prototype.scrollIntoView = () => {}
  // L'horloge reste celle de Node (jsdom s'en sert lui-même) ; pas d'entrée de navigation
  w.performance.getEntriesByType = () => []
  performance.getEntriesByType = () => []

  // Les variables globales du navigateur, lues par l'application et par React
  const VALUES = [
    'window', 'self', 'document', 'navigator', 'location', 'history', 'localStorage', 'sessionStorage',
    'innerWidth', 'innerHeight', 'scrollX', 'scrollY', 'devicePixelRatio',
    'Node', 'Element', 'HTMLElement', 'SVGElement', 'HTMLCanvasElement', 'HTMLMediaElement',
    'HTMLVideoElement', 'HTMLInputElement', 'HTMLIFrameElement', 'Text',
    'Event', 'CustomEvent', 'KeyboardEvent', 'MouseEvent', 'FocusEvent', 'FormData',
    'ResizeObserver', 'IntersectionObserver', 'MutationObserver',
  ]
  const METHODS = [
    'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia', 'getSelection',
    'scrollTo', 'addEventListener', 'removeEventListener', 'dispatchEvent',
  ]
  for (const k of VALUES) Object.defineProperty(globalThis, k, { get: () => w[k], configurable: true })
  for (const k of METHODS) Object.defineProperty(globalThis, k, { value: (...a) => w[k](...a), configurable: true, writable: true })

  console.error = (...a) => errors.push(text(a))
  process.on('uncaughtException', e => errors.push('[exception] ' + text([e])))
  process.on('unhandledRejection', e => errors.push('[promesse rejetée] ' + text([e])))

  const root = w.document.getElementById('root')
  const h1 = root.querySelector('h1')
  const { mount } = await import(pathToFileURL(BUNDLE).href)
  mount(w.location.pathname, root)
  await new Promise(r => setTimeout(r, WAIT))

  const preserved = !!h1 && h1.isConnected && root.querySelector('h1') === h1
  process.stdout.write('\n' + MARK + JSON.stringify({ errors, preserved }) + '\n')
  process.exit(0)
}

// ---------- Tous les essais ----------
const runChild = (file, urlPath, viewport) => new Promise(done => {
  const env = { ...process.env, NODE_ENV: 'development' }
  const child = spawn(process.execPath, [SELF, '--one', file, urlPath, viewport], { cwd: ROOT, env })
  let out = ''
  let err = ''
  child.stdout.on('data', d => { out += d })
  child.stderr.on('data', d => { err += d })
  const timer = setTimeout(() => child.kill('SIGKILL'), 30000)
  child.on('close', code => {
    clearTimeout(timer)
    const line = out.split('\n').find(l => l.startsWith(MARK))
    if (line) return done(JSON.parse(line.slice(MARK.length)))
    done({ errors: [`essai interrompu (code ${code}) ${(err || out).trim().slice(-300)}`], preserved: false })
  })
})

async function main() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('dist/ absent : lancez d\'abord npm run build')
  if (!fs.existsSync(BUNDLE)) throw new Error('.ssr-check/entry-hydrate.js absent : lancez npm run check:hydration')

  const files = htmlFiles(DIST).sort((a, b) => urlFor(a).localeCompare(urlFor(b)))
  const runs = files.flatMap(file => Object.keys(VIEWPORTS).map(viewport => ({ file, urlPath: urlFor(file), viewport })))

  // Quatre essais à la fois
  const results = new Array(runs.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(4, runs.length) }, async () => {
    while (next < runs.length) {
      const i = next++
      const { file, urlPath, viewport } = runs[i]
      results[i] = await runChild(file, urlPath, viewport)
    }
  }))

  let failed = 0
  runs.forEach(({ urlPath, viewport }, i) => {
    const { errors, preserved } = results[i]
    const ok = errors.length === 0 && preserved
    if (!ok) failed++
    console.log(`${ok ? 'OK  ' : 'ÉCHEC'} ${urlPath} ${viewport} errors=${errors.length} h1 preserved=${preserved}`)
    for (const e of [...new Set(errors)].slice(0, 5)) console.log(`       - ${e}`)
  })
  console.log(failed ? `\n${failed} essai(s) en échec sur ${runs.length}` : `\n${runs.length} essais, aucune erreur d'hydratation`)
  process.exit(failed ? 1 : 0)
}

const [flag, ...rest] = process.argv.slice(2)
const job = flag === '--one' ? runOne(...rest) : main()
job.catch(err => {
  console.log(err.stack || String(err))
  process.exit(1)
})
