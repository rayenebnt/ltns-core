import { SITE } from '../data/site.js'

// Le <head> propre à chaque page, inséré à la place de <!--app-head-->
// dans index.html par le pré-rendu (scripts/prerender.mjs).

// Échappe le texte placé dans un attribut ou dans <title>
const esc = s => String(s)
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

const meta = (attr, key, content) => `<meta ${attr}="${key}" content="${esc(content)}">`

export function headFor(path, route) {
  const canonical = SITE.url + (path === '/' ? '/' : path)
  const image = route.ogImage || SITE.ogImage

  return [
    `<title>${esc(route.title)}</title>`,
    meta('name', 'description', route.description),

    // Page à indexer : une seule adresse officielle, grandes images autorisées
    // dans les résultats. Sinon : hors de Google.
    ...(route.noindex
      ? [meta('name', 'robots', 'noindex')]
      : [
          `<link rel="canonical" href="${esc(canonical)}">`,
          meta('name', 'robots', 'max-image-preview:large'),
        ]),

    // Aperçu au partage (WhatsApp, Facebook, LinkedIn…)
    meta('property', 'og:type', 'website'),
    meta('property', 'og:locale', 'fr_FR'),
    meta('property', 'og:site_name', SITE.name),
    meta('property', 'og:title', route.ogTitle || route.title),
    meta('property', 'og:description', route.description),
    ...(route.noindex ? [] : [meta('property', 'og:url', canonical)]),
    meta('property', 'og:image', SITE.url + image.path),
    meta('property', 'og:image:width', image.width),
    meta('property', 'og:image:height', image.height),
    meta('property', 'og:image:alt', image.alt),
    meta('name', 'twitter:card', 'summary_large_image'),
  ].join('\n  ')
}
