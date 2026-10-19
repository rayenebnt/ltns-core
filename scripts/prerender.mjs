// Pré-rendu statique, lancé par `npm run build` après les deux builds Vite.
// Node pur (aucun navigateur) : il tourne tel quel sur Vercel.
//
// Pour chaque page de src/routes.jsx, il écrit dans dist/ un fichier HTML
// complet (son <head> + le contenu rendu par React), puis 404.html,
// sitemap.xml et robots.txt. Il contrôle ensuite chaque page (titre,
// description, adresse officielle, données structurées, formulations, liens).
// La moindre erreur fait échouer le build : le site déjà en ligne reste alors
// en place.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const DIST = path.join(ROOT, 'dist')

// React en version production (avant de charger le bundle serveur)
process.env.NODE_ENV ??= 'production'

// Ce que le site ne doit jamais publier. Ces listes n'existent qu'ici :
// src/ ne les nomme jamais.
// - propriétés de données structurées réservées aux avis (aucun avis publié
//   sur le site, ils restent sur la fiche Google) ;
const FORBIDDEN_KEYS = new Set(['aggregateRating', 'review', 'reviewRating'])
// - statistique non mesurée et promesses de position sur Google.
const FORBIDDEN_WORDING = /LE PLUS CHOISI|Mieux placé sur Google|premi(er|ère) (page|position) sur Google/i

// Limites de longueur, en signes (titre : ~60 avant d'être coupé par Google)
const TITLE_MAX = 60
const DESC_MIN = 70
const DESC_MAX = 155

const write = (file, content) => {
  const out = path.join(DIST, file)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, content)
  console.log(`  dist/${file}  ${(Buffer.byteLength(content) / 1024).toFixed(1)} kB`)
}

const once = (tpl, marker) => {
  const n = tpl.split(marker).length - 1
  if (n !== 1) throw new Error(`dist/index.html : « ${marker} » trouvé ${n} fois au lieu d'une`)
}

// Texte d'un attribut ou d'un nœud HTML, entités décodées
const decode = s => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&amp;/g, '&')
const all = (re, s) => [...s.matchAll(re)].map(m => decode(m[1]))
const len = s => [...s].length // en signes (points de code), pas en octets

// Texte visible du <body> : sans scripts, styles, commentaires ni balises
const visibleText = body => decode(body
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<[^>]+>/g, ' '))
  .replace(/\s+/g, ' ')

// Parcourt un bloc JSON-LD : textes vides ou à compléter, propriétés interdites,
// renvois { '@id' } sans cible dans le même bloc
function checkJsonLd(data, fail) {
  const defined = new Set()
  const refs = []
  const visit = (v, at) => {
    if (typeof v === 'string') {
      if (v === '') fail(`JSON-LD ${at} : texte vide`)
      if (v.includes('[')) fail(`JSON-LD ${at} : « ${v} » (texte à compléter ?)`)
    } else if (Array.isArray(v)) {
      if (!v.length) fail(`JSON-LD ${at} : liste vide`)
      v.forEach((x, i) => visit(x, `${at}[${i}]`))
    } else if (v === null) {
      fail(`JSON-LD ${at} : valeur null`)
    } else if (typeof v === 'object') {
      const keys = Object.keys(v)
      if (keys.length === 1 && keys[0] === '@id') refs.push([v['@id'], at])
      else if (typeof v['@id'] === 'string') defined.add(v['@id'])
      for (const k of keys) {
        if (FORBIDDEN_KEYS.has(k)) fail(`JSON-LD ${at} : propriété interdite « ${k} »`)
        visit(v[k], at ? `${at}.${k}` : k)
      }
    }
  }
  visit(data, '')
  for (const [i, at] of refs) {
    if (!defined.has(i)) fail(`JSON-LD ${at} : renvoi vers ${i}, absent de la page`)
  }
  return (data['@graph'] || [data]).map(n => [].concat(n['@type']).join('+'))
}

async function main() {
  const { render, ROUTES, NOT_FOUND, SITE, headFor, normalize } = await import(
    pathToFileURL(path.join(ROOT, '.ssr', 'entry-server.js')).href
  )

  const tpl = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
  once(tpl, '<!--app-head-->')
  once(tpl, '<div id="root"></div>')

  // Remplacements par fonction : un « $& » ou « $1 » dans le contenu reste tel quel
  const page = (p, route) => tpl
    .replace('<!--app-head-->', () => headFor(p, route))
    .replace('<div id="root"></div>', () => '<div id="root">' + render(p) + '</div>')

  // Toutes les pages, rendues avant d'être écrites et contrôlées
  const pages = [
    ...Object.entries(ROUTES).map(([p, route]) => ({
      p, route, file: p === '/' ? 'index.html' : `${p.slice(1)}.html`,
    })),
    { p: '/404', route: NOT_FOUND, file: '404.html' },
  ].map(pg => ({ ...pg, html: page(pg.p, pg.route) }))

  console.log('Pré-rendu :')
  for (const pg of pages) write(pg.file, pg.html)

  // Sitemap : seulement les pages à indexer
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...Object.entries(ROUTES)
      .filter(([, route]) => !route.noindex)
      .map(([p, route]) => [
        '  <url>',
        `    <loc>${SITE.url}${p === '/' ? '/' : p}</loc>`,
        `    <lastmod>${route.updated}</lastmod>`,
        '  </url>',
      ].join('\n')),
    '</urlset>',
    '',
  ].join('\n')
  write('sitemap.xml', sitemap)

  write('robots.txt', [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${SITE.url}/sitemap.xml`,
    '',
  ].join('\n'))

  // ---- Contrôles : toutes les erreurs sont listées, puis le build échoue ----
  const errors = []
  const rows = []
  const canonicals = new Set()

  // Les id de chaque page, pour vérifier les liens vers une ancre
  for (const pg of pages) {
    pg.head = pg.html.slice(0, pg.html.indexOf('</head>'))
    pg.body = pg.html.slice(pg.html.indexOf('<body'))
    pg.ids = all(/\sid="([^"]*)"/g, pg.body)
  }
  const byPath = new Map(pages.map(pg => [pg.p, pg]))

  if (!NOT_FOUND.noindex) errors.push('404.html : la page introuvable doit rester noindex')

  for (const pg of pages) {
    const { p, route, head, body, ids } = pg
    const fail = msg => errors.push(`${pg.file} : ${msg}`)
    const indexable = !route.noindex

    // Une seule fois chacun : <title>, meta description, <h1>
    const titles = all(/<title>([^<]*)<\/title>/g, head)
    const descs = all(/<meta name="description" content="([^"]*)">/g, head)
    const h1 = (body.match(/<h1[\s>]/g) || []).length
    if (titles.length !== 1) fail(`${titles.length} <title> au lieu d'un`)
    if (descs.length !== 1) fail(`${descs.length} meta description au lieu d'une`)
    if (h1 !== 1) fail(`${h1} <h1> au lieu d'un`)
    const title = titles[0] || ''
    const desc = descs[0] || ''

    // Chaque id une seule fois dans la page
    const seen = new Set()
    for (const i of ids) {
      if (seen.has(i)) fail(`id="${i}" présent plusieurs fois`)
      seen.add(i)
    }

    const canonical = all(/<link rel="canonical" href="([^"]*)">/g, head)
    const ogUrl = all(/<meta property="og:url" content="([^"]*)">/g, head)
    const robots = all(/<meta name="robots" content="([^"]*)">/g, head)
    const blocks = all(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, head)

    if (indexable) {
      if (len(title) > TITLE_MAX) fail(`titre de ${len(title)} signes (${TITLE_MAX} au plus) : « ${title} »`)
      if (len(desc) < DESC_MIN || len(desc) > DESC_MAX) {
        fail(`description de ${len(desc)} signes (${DESC_MIN} à ${DESC_MAX}) : « ${desc} »`)
      }
      const expected = SITE.url + (p === '/' ? '/' : p)
      if (canonical.length !== 1 || canonical[0] !== expected) {
        fail(`adresse officielle (canonical) ${JSON.stringify(canonical)} au lieu de ${expected}`)
      }
      if (ogUrl.length !== 1 || ogUrl[0] !== canonical[0]) fail(`og:url ${JSON.stringify(ogUrl)} ≠ canonical`)
      if (robots.some(r => r.includes('noindex'))) fail('page à indexer marquée noindex')
      canonicals.add(expected)
    } else {
      if (!robots.some(r => r.includes('noindex'))) fail('page hors de Google sans robots noindex')
      if (canonical.length) fail('page noindex avec une adresse officielle (canonical)')
      if (blocks.length) fail('page noindex avec des données structurées')
    }

    // Données structurées : lisibles et propres
    let types = []
    for (const b of blocks) {
      try {
        types = types.concat(checkJsonLd(JSON.parse(b), fail))
      } catch (e) {
        fail(`JSON-LD illisible : ${e.message}`)
      }
    }
    if (indexable && route.schema && !blocks.length) fail(`données structurées « ${route.schema} » absentes`)

    // Formulations interdites, dans le texte visible comme dans le titre et la description
    for (const [where, text] of [['texte', visibleText(body)], ['titre', title], ['description', desc]]) {
      for (const m of text.matchAll(new RegExp(FORBIDDEN_WORDING.source, 'gi'))) {
        fail(`formulation interdite dans le ${where} : « ${m[0]} »`)
      }
    }

    // Liens internes : chaque adresse mène à une page ou à un fichier de dist/,
    // et chaque ancre (#id) existe sur la page visée
    for (const href of all(/<a\s[^>]*?\bhref="([^"]*)"/g, body)) {
      if (href.startsWith('#')) {
        const frag = decodeURIComponent(href.slice(1))
        if (frag && !ids.includes(frag)) fail(`lien ${href} : aucun id="${frag}" sur la page`)
        continue
      }
      if (!href.startsWith('/') || href.startsWith('//')) continue
      const [target, frag = ''] = href.split('#')
      const file = decodeURIComponent(target.split('?')[0])
      const dest = byPath.get(normalize(file))
      if (dest) {
        const id = decodeURIComponent(frag)
        if (id && !dest.ids.includes(id)) fail(`lien ${href} : aucun id="${id}" sur ${dest.file}`)
        continue
      }
      const exists = [file, `${file}.html`, path.join(file, 'index.html')]
        .some(f => fs.statSync(path.join(DIST, f), { throwIfNoEntry: false })?.isFile())
      if (!exists) fail(`lien ${href} : ni page ni fichier dans dist/`)
    }

    rows.push([pg.file, `${len(title)}/${TITLE_MAX}`, String(len(desc)), indexable ? 'oui' : 'non', types.join(', ') || '—'])
  }

  // Sitemap = exactement les pages à indexer, à leur adresse officielle
  const locs = new Set(all(/<loc>([^<]*)<\/loc>/g, sitemap))
  for (const l of locs) if (!canonicals.has(l)) errors.push(`sitemap.xml : ${l} n'est l'adresse officielle d'aucune page indexée`)
  for (const c of canonicals) if (!locs.has(c)) errors.push(`sitemap.xml : ${c} manque`)

  // Récapitulatif
  const cols = ['page', 'titre', 'descr.', 'indexée', 'JSON-LD']
  const widths = cols.map((c, i) => Math.max(len(c), ...rows.map(r => len(r[i]))))
  const line = r => '  ' + r.map((c, i) => c + ' '.repeat(widths[i] - len(c))).join('  ').trimEnd()
  console.log('\nContrôles SEO :')
  console.log(line(cols))
  rows.forEach(r => console.log(line(r)))

  if (errors.length) {
    const unique = [...new Set(errors)]
    console.error(`\n${unique.length} erreur(s) :`)
    unique.forEach(e => console.error('  ✗ ' + e))
    process.exit(1)
  }
  console.log('  ✓ tout est conforme')
}

main().catch(err => {
  console.error('Pré-rendu impossible :', err)
  process.exit(1)
})
