import { useEffect, useRef } from 'react'

// Capture d'écran d'un projet (dossier public/realisations/).
// Avec variants, le navigateur choisit la version AVIF ou WebP à la bonne
// largeur (public/media/realisations/<nom>-800 et -1600) ; sinon, le JPG seul.
// Pas de <source> sans variantes : un <picture> ne passe pas à la source
// suivante si un fichier manque, l'image serait cassée.
export default function ProjectPicture({ name, alt, width, height, sizes, variants, onError }) {
  const ref = useRef(null)

  // Image déjà en échec avant que React reprenne la page pré-rendue :
  // l'événement error est passé, on prévient quand même.
  useEffect(() => {
    const img = ref.current
    if (img && img.complete && img.naturalWidth === 0) onError?.()
  }, [])

  const set = ext => [800, 1600].map(w => `/media/realisations/${name}-${w}.${ext} ${w}w`).join(', ')

  return (
    <picture>
      {variants && <source type="image/avif" srcSet={set('avif')} sizes={sizes} />}
      {variants && <source type="image/webp" srcSet={set('webp')} sizes={sizes} />}
      <img
        ref={ref}
        src={`/realisations/${name}.jpg`}
        width={width}
        height={height}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={onError}
      />
    </picture>
  )
}
