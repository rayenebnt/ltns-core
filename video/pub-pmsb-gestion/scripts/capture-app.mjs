// Pub « PMSB Gestion » : captures TÉLÉPHONE de l'appli réelle, base de DÉMONSTRATION uniquement.
//   node capture-app.mjs <dossier de sortie>
//   env : PMSB_GESTION_URL (défaut http://127.0.0.1:3440), PMSB_GESTION_APP (copie de travail : remet la base de démo à zéro)
// Prérequis : voir README.md (copie de l'appli sans .git ni .env, base PostgreSQL locale, jeu de démo, next start).
// Rien n'est modifié dans le dépôt pmsb-gestion.
//
// Vue téléphone 393 × 798 px CSS (écran d'iPhone moins la barre d'état, que la pub redessine), DPR 6 :
//  m-dashboard   tableau de bord
//  m-menu        menu ouvert (pastille « 2 » sur Échéancier)
//  m-devis-0     éditeur du brouillon DEV-2026-0013 (copie de DEV-2026-0002 par le bouton « Dupliquer »,
//                lots 1 et 2 sans la peinture pliolite, comme la vidéo 4)
//  m-devis-q1    ligne « Peinture de façade pliolite » ajoutée depuis la bibliothèque (quantité 1)
//  m-devis-q2 / q26 / q260   quantité tapée chiffre par chiffre ; les totaux sont ceux de l'appli
//  m-devis-montants          carte Montants après 260 (Total TTC)
//  m-devis-enregistre        après « Enregistrer et voir le PDF » (message « Devis enregistré. »)
//  m-echeancier  échéancier
//  m-relance     fiche FAC-2026-0002, carte Relances (« 3. Mise en demeure » proposé par l'appli)
// rects.json : rectangles utiles (px CSS dans la vue), totaux affichés, et numéros/e-mails à flouter.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const BASE = process.env.PMSB_GESTION_URL || 'http://127.0.0.1:3440'
const OUT = path.resolve(process.argv[2] || 'capture')
const DPR = +(process.env.DPR || 6)
fs.mkdirSync(OUT, { recursive: true })
const R = { dpr: DPR, vue: { w: 393, h: 798 }, flou: {}, el: {} }

if (process.env.PMSB_GESTION_APP) execFileSync('npx', ['tsx', 'demo/seed.ts'], { cwd: process.env.PMSB_GESTION_APP, stdio: 'inherit', env: process.env })

const browser = await chromium.launch({ args: ['--lang=fr-FR'], env: { ...process.env, LANG: 'fr_FR.UTF-8', LANGUAGE: 'fr_FR' } })
const INIT = () => {
  const fix = () => {
    if (!document.getElementById('demo-fix')) {
      const s = document.createElement('style')
      s.id = 'demo-fix'
      // pas de curseur texte (images identiques d'une prise à l'autre), icône sans taille corrigée
      s.textContent = 'td > svg{width:15px;height:15px;vertical-align:-3px;margin-right:4px} *{caret-color:transparent !important}'
      document.head.appendChild(s)
    }
  }
  document.addEventListener('DOMContentLoaded', fix)
  new MutationObserver(fix).observe(document, { childList: true, subtree: true })
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href^="mailto:"]'); if (a) e.preventDefault() }, true)
}
const ctx = await browser.newContext({ locale: 'fr-FR', timezoneId: 'Europe/Paris', viewport: R.vue.w ? { width: R.vue.w, height: R.vue.h } : undefined, deviceScaleFactor: DPR, isMobile: true, hasTouch: true })
await ctx.addInitScript(INIT)
const p = await ctx.newPage()
ctx.on('page', pg => { if (pg !== p) pg.waitForLoadState().then(() => pg.close()).catch(() => {}) }) // onglet du PDF

async function settle(ms = 400) {
  await p.waitForLoadState('networkidle')
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(ms)
}
const go = async url => { await p.goto(`${BASE}${url}`); await settle() }
const rect = async loc => { const b = await loc.boundingBox(); return b && { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) } }
// Numéros de téléphone et e-mails affichés (px CSS dans la vue), floutés par build-assets.py
const sensibles = () => p.evaluate(() => {
  const re = /(0\d(?:[ .]\d\d){4})|([\w.+-]+@[\w-]+\.[\w.]+)/g
  const out = []
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    for (const m of n.data.matchAll(re)) {
      if (m[0] === 'demo@exemple.fr') continue // compte de démo, affiché exprès
      const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length)
      for (const b of r.getClientRects()) if (b.width > 0 && b.bottom > 0 && b.top < innerHeight) out.push({ x: b.x, y: b.y, w: b.width, h: b.height, t: m[0] })
    }
  }
  return out
})
async function shot(name) {
  R.flou[name] = await sensibles()
  await p.screenshot({ path: path.join(OUT, `${name}.png`) })
  console.log('capture', name)
}

// Connexion au compte de démo
await p.goto(`${BASE}/connexion`, { waitUntil: 'networkidle' })
await p.fill('input[name=email]', 'demo@exemple.fr')
await p.fill('input[name=motDePasse]', 'demo-ltns-2026!')
await Promise.all([p.waitForURL(`${BASE}/`), p.click('button.principal')])
await settle()

/* Tableau de bord et menu */
R.el.dash = { kpis: [] }
for (const k of await p.locator('.indicateurs > *').all()) R.el.dash.kpis.push({ ...(await rect(k)), t: (await k.innerText()).replace(/\s+/g, ' ') })
await shot('m-dashboard')
await p.locator('button.menu-mobile').click(); await p.waitForTimeout(500)
R.el.menu = { badge: await rect(p.locator('#navigation a', { hasText: 'Échéancier' }).locator('.badge')), echeancier: await rect(p.locator('#navigation a', { hasText: 'Échéancier' })), devis: await rect(p.locator('#navigation a', { hasText: 'Devis' }).first()) }
await shot('m-menu')

/* Échéancier */
await go('/echeancier')
R.el.echeancier = { kpis: [] }
for (const k of await p.locator('.indicateurs > *').all()) R.el.echeancier.kpis.push({ ...(await rect(k)), t: (await k.innerText()).replace(/\s+/g, ' ') })
await shot('m-echeancier')

/* Relances : fiche FAC-2026-0002 (jeu de démo : rappel le 05/10, relance le 15/10 → l'appli propose « 3. Mise en demeure ») */
await go('/echeancier')
const fac = await p.locator('a', { hasText: 'FAC-2026-0002' }).first().getAttribute('href')
await go(`${fac}?relancer=1#relances`)
const sec = p.locator('section#relances')
await sec.locator('.panneau-relance').evaluate(el => { const r = el.getBoundingClientRect(); window.scrollBy(0, r.top - 12) })
await p.waitForTimeout(400)
const radios = []
for (const lab of await sec.locator('label.case').all()) radios.push({ ...(await rect(lab)), t: (await lab.innerText()).trim(), checked: await lab.locator('input').isChecked() })
R.el.relance = {
  panneau: await rect(sec.locator('.panneau-relance')), radios,
  objet: await rect(sec.locator('label.champ input')), message: await rect(sec.locator('textarea')),
  messagerie: await rect(sec.getByRole('button', { name: /messagerie/i }).or(sec.getByRole('link', { name: /messagerie/i })).first()),
}
await shot('m-relance')

/* Devis : préparation (non filmée) comme la vidéo 4 — copie de DEV-2026-0002 par « Dupliquer » */
await go('/devis')
const href2 = await p.locator('a', { hasText: 'DEV-2026-0002' }).first().getAttribute('href')
await go(href2)
p.once('dialog', d => d.accept())
await Promise.all([p.waitForURL(u => !u.pathname.endsWith(href2.split('/').pop()), { timeout: 15000 }), p.getByRole('button', { name: 'Dupliquer' }).click()])
await settle()
const hrefNew = new URL(p.url()).pathname
R.numero = (await p.locator('h1 .mono').innerText()).trim()
console.log('copie', R.numero, hrefNew)
const rows = p.locator('table.editeur-lignes tbody tr')
const lastDesignation = () => rows.last().locator('input').first().inputValue()
while ((await lastDesignation()) !== 'Enduit monocouche gratté') {
  await rows.last().getByRole('button', { name: 'Supprimer la ligne' }).click()
  await p.waitForTimeout(60)
}
await p.locator('label:has-text("Début des travaux prévu") input').fill('2026-11-16')
await p.locator('.barre-collante button.principal').click()
await p.getByText('Devis enregistré.').waitFor()
await go(hrefNew)

// Le geste : le dernier ouvrage du lot 2 en haut de l'écran, le sélecteur de bibliothèque dessous
const picker = p.locator('.picker input')
const scrollTo = async y => { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(250) }
await picker.evaluate(el => { const r = el.getBoundingClientRect(); window.scrollBy(0, r.top - 520) })
await p.waitForTimeout(400)
const Y0 = await p.evaluate(() => window.scrollY)
const lignes = async () => {
  const out = []
  for (let i = 0; i < await rows.count(); i++) {
    const r = await rect(rows.nth(i))
    if (r && r.y + r.h > 0 && r.y < R.vue.h) out.push({ ...r, d: await rows.nth(i).locator('input').first().inputValue() })
  }
  return out
}
R.el.devis0 = { lignes: await lignes(), picker: await rect(picker) }
await shot('m-devis-0')

await picker.click(); await p.waitForTimeout(250)
for (const ch of 'pein') { await picker.press(ch); await p.waitForTimeout(200) }
await scrollTo(Y0)
R.el.liste = { liste: await rect(p.locator('.picker-liste')), option: await rect(p.locator('.picker-liste button', { hasText: 'Peinture de façade pliolite' })) }
await shot('m-devis-liste')
await p.locator('.picker-liste button', { hasText: 'Peinture de façade pliolite' }).click(); await p.waitForTimeout(300)

const nrow = rows.last()
await nrow.evaluate(el => { const r = el.getBoundingClientRect(); window.scrollBy(0, r.top - 300) })
await p.waitForTimeout(300)
const Y1 = await p.evaluate(() => window.scrollY)
const cells = async () => ({
  row: await rect(nrow),
  designation: await rect(nrow.locator('input[aria-label="Désignation"]')),
  description: await rect(nrow.locator('textarea')),
  qte: await rect(nrow.locator('input[aria-label="Quantité"]')),
  unite: await rect(nrow.locator('input[aria-label="Unité"]')),
  pu: await rect(nrow.locator('input[aria-label="Prix unitaire HT"]')),
  tva: await rect(nrow.locator('select')),
  totalHT: await rect(nrow.locator('td.num').last()),
  totalHTTexte: (await nrow.locator('td.num').last().innerText()).trim(),
})
R.el.q1 = { ...(await cells()), lignes: await lignes() }
await shot('m-devis-q1')

const q = nrow.locator('input[aria-label="Quantité"]')
await q.click({ clickCount: 3 }); await p.waitForTimeout(150)
let qs = ''
for (const ch of '260') {
  qs += ch
  await q.press(ch); await p.waitForTimeout(250)
  await scrollTo(Y1)
  R.el[`q${qs}`] = await cells()
  await shot(`m-devis-q${qs}`)
}
// Carte Montants (Total TTC recalculé par l'appli)
const montants = p.locator('section.carte', { has: p.locator('h2', { hasText: /^Montants$/ }) }).first()
await montants.evaluate(el => { const r = el.getBoundingClientRect(); window.scrollBy(0, r.top - 200) })
await p.waitForTimeout(300)
const recap = []
for (const row of await montants.locator('tr, .recap > *, dl > div').all()) { const r = await rect(row); if (r) recap.push({ ...r, t: (await row.innerText()).replace(/\s+/g, ' ') }) }
R.el.montants = { carte: await rect(montants), lignes: recap, texte: (await montants.innerText()).replace(/\s+/g, ' ') }
await shot('m-devis-montants')

// « Enregistrer et voir le PDF »
const btnPdf = p.locator('.barre-collante button', { hasText: 'PDF' })
R.el.barre = { barre: await rect(p.locator('.barre-collante')), pdf: await rect(btnPdf) }
await btnPdf.click()
await p.getByText('Devis enregistré.').waitFor()
await p.waitForTimeout(500)
R.el.enregistre = { barre: await rect(p.locator('.barre-collante')), message: await rect(p.getByText('Devis enregistré.')) }
await shot('m-devis-enregistre')

fs.writeFileSync(path.join(OUT, 'rects.json'), JSON.stringify(R, null, 1))
console.log('rects.json', R.numero, R.el.montants.texte)
await browser.close()
