// Vidéo 4 · PMSB Gestion : captures de l'appli réelle, base de DÉMONSTRATION uniquement.
//   node capture-app.mjs <dossier de sortie>
//   env : PMSB_GESTION_URL (défaut http://127.0.0.1:3424)
// Prérequis : README.md (base de démo locale + next start). Rien n'est modifié dans le dépôt pmsb-gestion.
//
// Étapes :
//  1. préparation (non filmée) : copie de DEV-2026-0002 avec le bouton « Dupliquer » de l'appli,
//     puis on garde les lots 1 et 2 sans la peinture pliolite, et on enregistre (brouillon DEV-2026-0013) ;
//  2. le geste filmé, image par image en DPR 2 : clic dans « Ajouter depuis la bibliothèque… »,
//     frappe « p », « pe », « pei », « pein », survol puis clic sur « Peinture de façade pliolite »,
//     quantité 1 → 2 → 26 → 260, survol puis clic sur « Enregistrer et voir le PDF » ;
//  3. les PDF générés par l'appli (DEV-2026-0013 et DEV-2026-0002), le tableau de bord, l'échéancier
//     et le téléphone (tableau de bord, menu).
// Chaque état est une capture PNG 2880 × 1800 ; les rectangles utiles (en px CSS) vont dans rects.json.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const BASE = process.env.PMSB_GESTION_URL || 'http://127.0.0.1:3424'
const OUT = path.resolve(process.argv[2] || 'capture')
fs.mkdirSync(OUT, { recursive: true })
const R = {}

// Base de démo remise à zéro (jeu de données inventé de la phase d'exploration) : la copie sera toujours DEV-2026-0013
if (process.env.PMSB_GESTION_APP) execFileSync('npx', ['tsx', 'demo/seed.ts'], { cwd: process.env.PMSB_GESTION_APP, stdio: 'inherit', env: process.env })

const browser = await chromium.launch({ args: ['--lang=fr-FR'], env: { ...process.env, LANG: 'fr_FR.UTF-8', LANGUAGE: 'fr_FR' } })

// Uniquement dans le navigateur de capture (comme la phase d'exploration) : icône sans taille, placeholders de démo
const INIT = () => {
  const fix = () => {
    if (!document.getElementById('demo-fix')) {
      const s = document.createElement('style')
      s.id = 'demo-fix'
      // pas de curseur texte clignotant (images identiques d'une prise à l'autre)
      s.textContent = 'td > svg{width:15px;height:15px;vertical-align:-3px;margin-right:4px} *{caret-color:transparent !important}'
      document.head.appendChild(s)
    }
    const map = { CS001732: 'CS-DEMO-001', C0002294: 'OS-DEMO-001', 'FT Construction': "Maître d'ouvrage (démo)" }
    document.querySelectorAll('input[placeholder]').forEach(i => { if (map[i.placeholder]) i.placeholder = map[i.placeholder] })
  }
  document.addEventListener('DOMContentLoaded', fix)
  new MutationObserver(fix).observe(document, { childList: true, subtree: true })
}
const newCtx = async opts => { const c = await browser.newContext({ locale: 'fr-FR', timezoneId: 'Europe/Paris', ...opts }); await c.addInitScript(INIT); return c }

async function login(ctx) {
  const p = await ctx.newPage()
  await p.goto(`${BASE}/connexion`, { waitUntil: 'networkidle' })
  await p.fill('input[name=email]', 'demo@exemple.fr')
  await p.fill('input[name=motDePasse]', 'demo-ltns-2026!')
  await Promise.all([p.waitForURL(`${BASE}/`), p.click('button.principal')])
  await p.close()
}
async function settle(p, ms = 350) {
  await p.waitForLoadState('networkidle')
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(ms)
}
const rect = async loc => { const b = await loc.boundingBox(); return b && { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) } }
// Rectangles (px CSS) des numéros de téléphone et e-mails affichés, floutés ensuite par build-assets.py
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
async function shot(p, name) { await p.screenshot({ path: path.join(OUT, name) }); console.log('capture', name) }
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

/* ── Ordinateur 1440 × 900, DPR 2 ─────────────────────────── */
{
  const ctx = await newCtx({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  await login(ctx)
  const p = await ctx.newPage()
  ctx.on('page', pg => { if (pg !== p) pg.waitForLoadState().then(() => pg.close()).catch(() => {}) }) // fenêtre du PDF
  const go = async url => { await p.goto(`${BASE}${url}`); await settle(p) }

  // Tableau de bord et échéancier (fond flouté, coupe)
  R.flou = {}
  await go('/'); await shot(p, 'tableau-de-bord.png'); R.flou['tableau-de-bord'] = await sensibles(p)
  await go('/echeancier'); await shot(p, 'echeancier.png'); R.flou.echeancier = await sensibles(p)

  // 1. Préparation : copie de DEV-2026-0002 (bouton « Dupliquer » de l'appli)
  await go('/devis')
  const href2 = await p.locator('a', { hasText: 'DEV-2026-0002' }).first().getAttribute('href')
  R.dev0002 = href2
  await go(href2)
  p.once('dialog', d => d.accept())
  await Promise.all([p.waitForURL(u => !u.pathname.endsWith(href2.split('/').pop()), { timeout: 15000 }), p.getByRole('button', { name: 'Dupliquer' }).click()])
  await settle(p)
  const hrefNew = new URL(p.url()).pathname
  R.copie = hrefNew
  R.numero = (await p.locator('h1 .mono').innerText()).trim()
  console.log('copie', R.numero, hrefNew)
  if (R.numero !== 'DEV-2026-0013') console.warn('Attention : base non remise à zéro, la copie porte un autre numéro')
  const rows = p.locator('table.editeur-lignes tbody tr')
  const lastDesignation = async () => {
    const tr = rows.last()
    const inp = tr.locator('input').first()
    return inp.inputValue()
  }
  while ((await lastDesignation()) !== 'Enduit monocouche gratté') {
    await rows.last().getByRole('button', { name: 'Supprimer la ligne' }).click()
    await p.waitForTimeout(60)
  }
  await p.locator('label:has-text("Début des travaux prévu") input').fill('2026-11-16')
  await p.locator('.barre-collante button.principal').click()
  await p.getByText('Devis enregistré.').waitFor()
  await go(hrefNew)

  // 2. Le geste filmé
  const picker = p.locator('.picker input')
  await picker.evaluate(el => { const r = el.getBoundingClientRect(); window.scrollBy(0, r.top - 330) })
  await p.waitForTimeout(400)
  await p.mouse.move(1300, 120)
  R.scrollY = await p.evaluate(() => window.scrollY)
  const navItems = ['Tableau de bord', 'Clients', 'Devis', 'Factures', 'Achats de matériel', 'Échéancier', 'Bibliothèque de prix', 'Paramètres']
  R.nav = {}
  for (const n of navItems) R.nav[n] = await rect(p.locator('aside.sidebar a', { hasText: n }).first())
  R.sidebar = await rect(p.locator('aside.sidebar'))
  R.picker = await rect(picker)
  R.total = await rect(p.locator('.total-barre'))
  R.barre = await rect(p.locator('.barre-collante'))
  R.btnPdf = await rect(p.locator('.barre-collante button', { hasText: 'PDF' }))
  R.carte = await rect(p.locator('section.carte:has(h2:text-is("Détail des travaux"))'))
  R.rowsBefore = []
  for (let i = 0; i < await rows.count(); i++) R.rowsBefore.push({ ...(await rect(rows.nth(i))), d: await rows.nth(i).locator('input').first().inputValue() })
  R.totals = { avant: await p.locator('.total-barre').innerText() }
  R.flou.editeur = await sensibles(p)
  await shot(p, 'e00-editeur.png')

  await picker.click(); await p.waitForTimeout(250)
  await p.mouse.move(1300, 120)
  R.liste = await rect(p.locator('.picker-liste'))
  await shot(p, 'e01-liste.png')
  let typed = ''
  for (const ch of 'pein') {
    typed += ch
    await picker.press(ch === ' ' ? 'Space' : ch); await p.waitForTimeout(200)
    R[`liste-${typed}`] = await rect(p.locator('.picker-liste'))
    await shot(p, `e0${1 + typed.length}-${typed}.png`)
  }
  const opt = p.locator('.picker-liste button', { hasText: 'Peinture de façade pliolite' })
  R.option = await rect(opt)
  R.options = []
  for (const b of await p.locator('.picker-liste button').all()) R.options.push({ ...(await rect(b)), t: (await b.innerText()).replace(/\s+/g, ' ') })
  await opt.hover(); await p.waitForTimeout(150)
  await shot(p, 'e06-survol.png')
  await opt.click(); await p.waitForTimeout(250)
  await p.mouse.move(1300, 120)
  const nrow = rows.last()
  const cells = async () => ({
    row: await rect(nrow),
    designation: await rect(nrow.locator('input[aria-label="Désignation"]')),
    description: await rect(nrow.locator('textarea')),
    qte: await rect(nrow.locator('input[aria-label="Quantité"]')),
    unite: await rect(nrow.locator('input[aria-label="Unité"]')),
    pu: await rect(nrow.locator('input[aria-label="Prix unitaire HT"]')),
    tva: await rect(nrow.locator('select')),
    totalHT: await rect(nrow.locator('td.num').last()),
  })
  R.ligne = await cells()
  R.pickerApres = await rect(picker)
  R.totals.q1 = await p.locator('.total-barre').innerText()
  R.ligneHT = { q1: await nrow.locator('td.num').last().innerText() }
  R.rowsAfter = []
  for (let i = 0; i < await rows.count(); i++) R.rowsAfter.push({ ...(await rect(rows.nth(i))), d: await rows.nth(i).locator('input').first().inputValue() })
  await shot(p, 'e07-ligne.png')

  const q = nrow.locator('input[aria-label="Quantité"]')
  await q.click({ clickCount: 3 }); await p.waitForTimeout(150)
  await p.mouse.move(1300, 120)
  await shot(p, 'e08-qte-select.png')
  let qs = ''
  for (const ch of '260') {
    qs += ch
    await q.press(ch); await p.waitForTimeout(200)
    R.totals[`q${qs}`] = await p.locator('.total-barre').innerText()
    R.ligneHT[`q${qs}`] = await nrow.locator('td.num').last().innerText()
    await shot(p, `e${String(8 + qs.length).padStart(2, '0')}-qte-${qs}.png`)
  }
  R.ligne260 = await cells()
  R.total260 = await rect(p.locator('.total-barre'))
  R.btnPdf260 = await rect(p.locator('.barre-collante button', { hasText: 'PDF' }))
  await p.locator('.barre-collante button', { hasText: 'PDF' }).hover(); await p.waitForTimeout(150)
  await shot(p, 'e12-survol-pdf.png')
  await p.locator('.barre-collante button', { hasText: 'PDF' }).click()
  await p.getByText('Devis enregistré.').waitFor()
  await p.waitForTimeout(400)
  await p.mouse.move(1300, 120)
  await shot(p, 'e13-enregistre.png')

  // 3. Les PDF générés par l'appli
  await pdf(p, `${hrefNew}/pdf`, 'devis-copie.pdf')
  await pdf(p, `${href2}/pdf`, 'devis-DEV-2026-0002.pdf')
  await ctx.close()
}

/* ── Téléphone 390 × 844, DPR 3 ───────────────────────────── */
{
  const ctx = await newCtx({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  await login(ctx)
  const p = await ctx.newPage()
  await p.goto(`${BASE}/`); await settle(p)
  await shot(p, 'm01-tableau-de-bord.png'); R.flou.m01 = await sensibles(p)
  R.mBadge = await rect(p.locator('button.menu-mobile .badge'))
  await p.locator('button.menu-mobile').click(); await p.waitForTimeout(500)
  R.mBadgeNav = await rect(p.locator('#navigation a', { hasText: 'Échéancier' }).locator('.badge'))
  await shot(p, 'm02-menu.png'); R.flou.m02 = await sensibles(p)
  await ctx.close()
}

fs.writeFileSync(path.join(OUT, 'rects.json'), JSON.stringify(R, null, 1))
console.log('rects.json', R.numero, R.totals)
await browser.close()
