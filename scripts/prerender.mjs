// Pré-rendu statique, lancé par `npm run build` après les deux builds Vite.
// Node pur (aucun navigateur) : il tourne tel quel sur Vercel.
//
// Pour chaque page de src/routes.jsx, il écrit dans dist/ un fichier HTML
// complet (son <head> + le contenu rendu par React), puis 404.html,
// sitemap.xml et robots.txt. La moindre erreur fait échouer le build :
// le site déjà en ligne reste alors en place.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const DIST = path.join(ROOT, 'dist')

// React en version production (avant de charger le bundle serveur)
process.env.NODE_ENV ??= 'production'

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

async function main() {
  const { render, ROUTES, NOT_FOUND, SITE, headFor } = await import(
    pathToFileURL(path.join(ROOT, '.ssr', 'entry-server.js')).href
  )

  const tpl = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
  once(tpl, '<!--app-head-->')
  once(tpl, '<div id="root"></div>')

  // Remplacements par fonction : un « $& » ou « $1 » dans le contenu reste tel quel
  const page = (p, route) => tpl
    .replace('<!--app-head-->', () => headFor(p, route))
    .replace('<div id="root"></div>', () => '<div id="root">' + render(p) + '</div>')

  console.log('Pré-rendu :')
  for (const [p, route] of Object.entries(ROUTES)) {
    write(p === '/' ? 'index.html' : `${p.slice(1)}.html`, page(p, route))
  }
  write('404.html', page('/404', NOT_FOUND))

  // Sitemap : seulement les pages à indexer
  const urls = Object.entries(ROUTES)
    .filter(([, route]) => !route.noindex)
    .map(([p, route]) => [
      '  <url>',
      `    <loc>${SITE.url}${p === '/' ? '/' : p}</loc>`,
      `    <lastmod>${route.updated}</lastmod>`,
      '  </url>',
    ].join('\n'))
  write('sitemap.xml', [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n'))

  write('robots.txt', [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${SITE.url}/sitemap.xml`,
    '',
  ].join('\n'))
}

main().catch(err => {
  console.error('Pré-rendu impossible :', err)
  process.exit(1)
})
