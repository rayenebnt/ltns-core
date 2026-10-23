// Vidéo 7 · PMSB Gestion « Facture impayée : qui écrit la relance ? » : captures de l'appli réelle,
// base de DÉMONSTRATION uniquement (jeu de données inventé, voir demo-seed.ts).
//   node capture-app.mjs <dossier de sortie>
//   env : PMSB_GESTION_URL (défaut http://127.0.0.1:3437)
//         PMSB_GESTION_APP (copie de travail de l'appli : la base est remise à zéro avec demo/seed.ts)
//         PMSB_DEMO_PSQL   (défaut "-h 127.0.0.1 -p 55437 -U postgres -d pmsb_demo")
// Rien n'est modifié dans le dépôt pmsb-gestion.
//
// Ce qui est capturé (ordinateur 1440 × 900) :
//  1. DPR 2 : tableau de bord, survol de « Relancer » sur FAC-2026-0002, la fiche facture panneau fermé
//     puis ouvert (le lien « Relancer » mène à ?relancer=1#relances), l'échéancier ;
//  2. DPR 3, la carte « Relances » seule, sur la MÊME facture FAC-2026-0002 à trois moments de sa vie :
//     aucune relance → l'appli propose « 1. Rappel » ; après le rappel du 05/10 → « 2. Relance » ;
//     après la relance du 15/10 (état du jeu de démo) → « 3. Mise en demeure ».
//     (Les relances sont retirées puis remises dans la base de démo avec psql, aux dates du jeu de démo.)
//  3. Le geste filmé : survol puis clic sur « Ouvrir dans ma messagerie » (la navigation mailto est bloquée
//     dans le navigateur de capture, le code de l'appli s'exécute : relance notée, message affiché,
//     historique mis à jour), survol de « Lettre PDF », et la vraie lettre PDF de niveau 3.
// Chaque état est une capture PNG ; les rectangles utiles (px CSS) vont dans rects.json.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const BASE = process.env.PMSB_GESTION_URL || 'http://127.0.0.1:3437'
const PSQL = (process.env.PMSB_DEMO_PSQL || '-h 127.0.0.1 -p 55437 -U postgres -d pmsb_demo').split(' ')
const OUT = path.resolve(process.argv[2] || 'capture')
fs.mkdirSync(OUT, { recursive: true })
const R = { flou: {} }

if (process.env.PMSB_GESTION_APP) execFileSync('npx', ['tsx', 'demo/seed.ts'], { cwd: process.env.PMSB_GESTION_APP, stdio: 'inherit', env: process.env })
const sql = q => execFileSync('psql', [...PSQL, '-At', '-c', q], { encoding: 'utf8' }).trim()

const FAC = sql(`select id from "Facture" where numero = 'FAC-2026-0002'`)
const USER = sql(`select id from "Utilisateur" where email = 'demo@exemple.fr'`)
if (!FAC || !USER) throw new Error('Base de démo absente : lancer le jeu de démo (demo/seed.ts)')
R.facture = FAC
const relances = sql(`select niveau || ' ' || le from "Relance" where "factureId" = '${FAC}' order by le`)
console.log('relances du jeu de démo :', relances.replace(/\n/g, ' | '))
const setRelances = n => {
  sql(`delete from "Relance" where "factureId" = '${FAC}'`)
  const seed = [[1, '2026-10-05 09:10:00'], [2, '2026-10-15 09:40:00']]
  for (const [niv, le] of seed.slice(0, n)) sql(`insert into "Relance" (id, "factureId", niveau, le, "parId") values ('demo-v07-${niv}', '${FAC}', ${niv}, '${le}', '${USER}')`)
}

const browser = await chromium.launch({ args: ['--lang=fr-FR'], env: { ...process.env, LANG: 'fr_FR.UTF-8', LANGUAGE: 'fr_FR' } })
const INIT = () => {
  const fix = () => {
    if (!document.getElementById('demo-fix')) {
      const s = document.createElement('style')
      s.id = 'demo-fix'
      // pas de curseur texte clignotant, icône sans taille corrigée (comme la phase d'exploration)
      s.textContent = 'td > svg{width:15px;height:15px;vertical-align:-3px;margin-right:4px} *{caret-color:transparent !important}'
      document.head.appendChild(s)
    }
  }
  document.addEventListener('DOMContentLoaded', fix)
  new MutationObserver(fix).observe(document, { childList: true, subtree: true })
  // « Ouvrir dans ma messagerie » : le code de l'appli s'exécute (relance notée), mais aucun client mail ne s'ouvre
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href^="mailto:"]'); if (a) e.preventDefault() }, true)
}
const newCtx = async opts => { const c = await browser.newContext({ locale: 'fr-FR', timezoneId: 'Europe/Paris', viewport: { width: 1440, height: 900 }, ...opts }); await c.addInitScript(INIT); return c }
async function login(ctx) {
  const p = await ctx.newPage()
  await p.goto(`${BASE}/connexion`, { waitUntil: 'networkidle' })
  await p.fill('input[name=email]', 'demo@exemple.fr')
  await p.fill('input[name=motDePasse]', 'demo-ltns-2026!')
  await Promise.all([p.waitForURL(`${BASE}/`), p.click('button.principal')])
  await p.close()
}
async function settle(p, ms = 400) {
  await p.waitForLoadState('networkidle')
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(ms)
}
const rect = async loc => { const b = await loc.boundingBox(); return b && { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) } }
const rel = (r, o) => r && o && { x: +(r.x - o.x).toFixed(1), y: +(r.y - o.y).toFixed(1), w: r.w, h: r.h }
// Téléphones et e-mails affichés (même fictifs), floutés ensuite par build-assets.py
async function sensibles(p) {
  return p.evaluate(() => {
    const re = /(0\d(?:[ .]\d\d){4})|([\w.+-]+@[\w-]+\.[\w.]+)/g
    const out = []
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      for (const m of n.data.matchAll(re)) {
        if (m[0] === 'demo@exemple.fr') continue // compte de démo, affiché exprès
        const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length)
        for (const b of r.getClientRects()) if (b.width > 0) out.push({ x: b.x, y: b.y, w: b.width, h: b.height, t: m[0] })
      }
    }
    return out
  })
}
async function shot(p, name, opts = {}) { await p.screenshot({ path: path.join(OUT, name), ...opts }); console.log('capture', name) }
async function pdf(p, url, name) {
  const r = await p.evaluate(async u => {
    const res = await fetch(u, { credentials: 'same-origin' })
    const b = new Uint8Array(await res.arrayBuffer())
    let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000))
    return { status: res.status, type: res.headers.get('content-type'), b64: btoa(s) }
  }, `${BASE}${url}`)
  if (r.status !== 200 || !/pdf/.test(r.type)) throw new Error(`PDF ${url} : ${r.status} ${r.type}`)
  fs.writeFileSync(path.join(OUT, name), Buffer.from(r.b64, 'base64'))
  console.log('pdf', name)
}
const away = p => p.mouse.move(700, 880)

/* ── 1. Ordinateur, DPR 2 ─────────────────────────────────── */
setRelances(2)
{
  const ctx = await newCtx({ deviceScaleFactor: 2 })
  await login(ctx)
  const p = await ctx.newPage()
  const go = async url => { await p.goto(`${BASE}${url}`); await settle(p) }

  await go('/'); await away(p)
  R.dash = {}
  R.dash.kpiRetard = await rect(p.locator('.indicateurs > *', { hasText: 'En retard' }).first())
  R.dash.retard = await rect(p.locator('section.carte', { hasText: 'Factures en retard' }))
  R.dash.relancer = await rect(p.locator('section.carte', { hasText: 'Factures en retard' }).locator('tr', { hasText: 'FAC-2026-0002' }).getByRole('link', { name: 'Relancer' }))
  R.dash.relancer2 = await rect(p.locator('section.carte', { hasText: 'Factures en retard' }).locator('tr', { hasText: 'FAC-2026-0007' }).getByRole('link', { name: 'Relancer' }))
  R.dash.ligne = await rect(p.locator('section.carte', { hasText: 'Factures en retard' }).locator('tr', { hasText: 'FAC-2026-0002' }))
  R.dash.badge = await rect(p.locator('aside.sidebar a', { hasText: 'Échéancier' }).locator('.badge'))
  R.flou.dash = await sensibles(p)
  await shot(p, 'dash.png')
  await p.locator('section.carte', { hasText: 'Factures en retard' }).locator('tr', { hasText: 'FAC-2026-0002' }).getByRole('link', { name: 'Relancer' }).hover()
  await p.waitForTimeout(200)
  await shot(p, 'dash-survol.png')

  // Le clic sur « Relancer » : la fiche facture s'ouvre sur le panneau Relances
  await Promise.all([p.waitForURL(u => u.pathname.startsWith('/factures/')), p.locator('section.carte', { hasText: 'Factures en retard' }).locator('tr', { hasText: 'FAC-2026-0002' }).getByRole('link', { name: 'Relancer' }).click()])
  await settle(p, 700); await away(p)
  R.factureScroll = await p.evaluate(() => window.scrollY)
  R.factureOuvert = { section: await rect(p.locator('section#relances')), panneau: await rect(p.locator('.panneau-relance')) }
  R.flou.factureOuvert = await sensibles(p)
  await shot(p, 'facture-ouvert.png')
  // Même page, même défilement, panneau fermé (avant le clic)
  await go(`/factures/${FAC}`)
  await p.evaluate(y => window.scrollTo(0, y), R.factureScroll); await p.waitForTimeout(300); await away(p)
  R.factureFerme = { section: await rect(p.locator('section#relances')), bouton: await rect(p.locator('section#relances button', { hasText: 'Relancer' })), scroll: await p.evaluate(() => window.scrollY) }
  R.flou.factureFerme = await sensibles(p)
  await shot(p, 'facture-ferme.png')

  await go('/echeancier'); await away(p)
  R.echeancier = { retard: await rect(p.locator('section.carte', { has: p.locator('h2', { hasText: /^En retard$/ }) }).first()), badge: await rect(p.locator('aside.sidebar a', { hasText: 'Échéancier' }).locator('.badge')), sidebar: await rect(p.locator('aside.sidebar')) }
  R.flou.echeancier = await sensibles(p)
  await shot(p, 'echeancier.png')
  await ctx.close()
}

/* ── 2 et 3. La carte « Relances » en DPR 3 ───────────────── */
{
  const ctx = await newCtx({ deviceScaleFactor: 3 })
  await login(ctx)
  const p = await ctx.newPage()
  const sec = p.locator('section#relances')
  // (paramètre « prise » : sinon le navigateur traite la même URL à ancre comme une simple ancre, sans recharger)
  const open = async k => { await p.goto(`${BASE}/factures/${FAC}?relancer=1&prise=${k}#relances`); await settle(p, 600); await away(p); await p.waitForTimeout(150) }
  const panelRects = async () => {
    const o = await rect(sec)
    const rr = {}
    rr.section = o
    rr.titre = rel(await rect(sec.locator('h3')), o)
    rr.carte = rel(await rect(sec.locator('.panneau-relance')), o)
    rr.radios = []
    for (const lab of await sec.locator('label.case').all()) rr.radios.push({ ...rel(await rect(lab), o), dot: rel(await rect(lab.locator('input')), o), checked: await lab.locator('input').isChecked() })
    rr.objet = rel(await rect(sec.locator('label.champ input')), o)
    rr.message = rel(await rect(sec.locator('textarea')), o)
    rr.info = rel(await rect(sec.locator('p.message.info')).catch(() => null), o)
    rr.ok = (await sec.locator('p.message.ok').count()) ? rel(await rect(sec.locator('p.message.ok')), o) : null
    rr.mail = rel(await rect(sec.getByRole('link', { name: 'Ouvrir dans ma messagerie' })), o)
    rr.copier = rel(await rect(sec.getByRole('button', { name: 'Copier le texte' })), o)
    rr.pdf = rel(await rect(sec.getByRole('link', { name: 'Lettre PDF' })), o)
    rr.historique = []
    for (const li of await sec.locator('ul > li').all()) rr.historique.push({ ...rel(await rect(li), o), t: (await li.innerText()).trim() })
    rr.aucune = (await sec.locator('p.mute').count()) ? rel(await rect(sec.locator('p.mute').last()), o) : null
    rr.texte = await sec.locator('textarea').inputValue()
    rr.objetTexte = await sec.locator('label.champ input').inputValue()
    return rr
  }
  // Éléments du tableau de bord et de l'échéancier en DPR 3 (gros plans nets), état du jeu de démo
  setRelances(2)
  const el = async (url, loc, name, key) => {
    await p.goto(`${BASE}${url}`); await settle(p); await away(p)
    const o = await rect(loc)
    R.el[key] = o
    R.flou[key] = (await sensibles(p)).map(b => rel(b, o)).filter(b => b.x + b.w > 0 && b.y + b.h > 0 && b.x < o.w && b.y < o.h)
    await loc.screenshot({ path: path.join(OUT, name) }); console.log('capture', name)
  }
  R.el = {}
  await el('/', p.locator('.indicateurs > *', { hasText: 'En retard' }).first(), 'el-kpi-retard.png', 'kpi')
  await el('/', p.locator('section.carte', { hasText: 'Factures en retard' }), 'el-dash-retard.png', 'dashRetard')
  R.el.dashRelancer = rel(await rect(p.locator('section.carte', { hasText: 'Factures en retard' }).locator('tr', { hasText: 'FAC-2026-0002' }).getByRole('link', { name: 'Relancer' })), R.el.dashRetard)
  await el('/echeancier', p.locator('section.carte', { has: p.locator('h2', { hasText: /^En retard$/ }) }).first(), 'el-echeancier-retard.png', 'echRetard')
  R.el.echLignes = []
  const echSec = p.locator('section.carte', { has: p.locator('h2', { hasText: /^En retard$/ }) }).first()
  for (const tr of await echSec.locator('tbody tr').all()) R.el.echLignes.push({ ...rel(await rect(tr), R.el.echRetard), t: (await tr.innerText()).replace(/\s+/g, ' ') })
  R.el.echJours = []
  for (const d of await echSec.locator('tbody td div', { hasText: /jours? de retard/ }).all()) R.el.echJours.push({ ...rel(await rect(d), R.el.echRetard), t: (await d.innerText()).trim() })
  R.el.echNumeros = []
  for (const a of await echSec.locator('tbody a.mono').all()) R.el.echNumeros.push({ ...rel(await rect(a), R.el.echRetard), t: (await a.innerText()).trim() })
  await el('/echeancier', p.locator('aside.sidebar nav, aside.sidebar').first(), 'el-sidebar.png', 'sidebar')
  R.el.sideEch = rel(await rect(p.locator('aside.sidebar a', { hasText: 'Échéancier' })), R.el.sidebar)
  R.el.sideBadge = rel(await rect(p.locator('aside.sidebar a', { hasText: 'Échéancier' }).locator('.badge')), R.el.sidebar)

  R.panneau = {}
  for (const n of [0, 1, 2]) {
    setRelances(n)
    await open(n)
    R.panneau[`n${n + 1}`] = await panelRects()
    R.flou[`n${n + 1}`] = (await sensibles(p)).map(b => rel(b, R.panneau[`n${n + 1}`].section))
    await sec.screenshot({ path: path.join(OUT, `panneau-n${n + 1}.png`) }); console.log('capture', `panneau-n${n + 1}.png`)
  }
  // État du jeu de démo (rappel 05/10, relance 15/10) : le geste
  const mail = sec.getByRole('link', { name: 'Ouvrir dans ma messagerie' })
  await mail.hover(); await p.waitForTimeout(200)
  await sec.screenshot({ path: path.join(OUT, 'panneau-n3-survol-messagerie.png') }); console.log('capture panneau-n3-survol-messagerie.png')
  await mail.click()
  await p.getByText('Relance notée.').waitFor()
  await p.waitForFunction(() => document.querySelectorAll('section#relances ul > li').length === 3, null, { timeout: 15000 })
  await p.waitForTimeout(500); await away(p); await p.waitForTimeout(200)
  R.panneau.notee = await panelRects()
  R.flou.notee = (await sensibles(p)).map(b => rel(b, R.panneau.notee.section))
  await sec.screenshot({ path: path.join(OUT, 'panneau-n3-notee.png') }); console.log('capture panneau-n3-notee.png')
  await sec.getByRole('link', { name: 'Lettre PDF' }).hover(); await p.waitForTimeout(200)
  await sec.screenshot({ path: path.join(OUT, 'panneau-n3-notee-survol-pdf.png') }); console.log('capture panneau-n3-notee-survol-pdf.png')
  await sec.getByRole('button', { name: 'Copier le texte' }).hover(); await p.waitForTimeout(200)
  await sec.screenshot({ path: path.join(OUT, 'panneau-n3-notee-survol-copier.png') }); console.log('capture panneau-n3-notee-survol-copier.png')
  // La lettre que produit « Lettre PDF » (même URL que le bouton), sans la noter une deuxième fois
  await pdf(p, `/factures/${FAC}/lettre?niveau=3`, 'lettre-n3.pdf')
  R.relancesApres = sql(`select niveau || ' ' || le from "Relance" where "factureId" = '${FAC}' order by le`).split('\n')
  await ctx.close()
}

fs.writeFileSync(path.join(OUT, 'rects.json'), JSON.stringify(R, null, 1))
console.log('rects.json', R.relancesApres)
await browser.close()
