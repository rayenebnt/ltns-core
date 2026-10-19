import { useCallback, useEffect, useRef, useState } from 'react'
import { useSectionHref } from '../lib/route'

// Le film de présentation : version verticale sur téléphone, paysage ailleurs.
// Fichiers dans public/film/ (vidéo avec voix off, sous-titres). L'image d'aperçu
// est une <picture> du HTML pré-rendu (WebP dans public/media/) : le navigateur
// choisit lui-même la bonne. La forme du cadre vient du CSS (.film, même requête).
const VIDEOS = {
  wide: '/film/ltns-film-16x9.mp4',
  tall: '/film/ltns-film-9x16.mp4',
}
const TALL_QUERY = '(max-width: 720px) and (orientation: portrait)'

// Lance le film depuis n'importe où (ex. bouton « Voir le film » de l'accueil)
export const playFilm = () => window.dispatchEvent(new Event('film:play'))

export default function FilmPlayer() {
  const wrapRef = useRef(null)
  const videoRef = useRef(null)
  const [tall, setTall] = useState(false) // ne choisit que la vidéo à lancer
  const [status, setStatus] = useState('idle') // idle → playing → ended
  const [showPoster, setShowPoster] = useState(true) // jusqu'à la première image du film
  const href = useSectionHref()

  // Suit l'orientation tant que le film n'a pas été lancé
  useEffect(() => {
    if (status !== 'idle') return
    const mq = window.matchMedia(TALL_QUERY)
    setTall(mq.matches)
    const onChange = (e) => setTall(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [status])

  const play = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = 0
    video.muted = false
    video.play().catch(() => {})
    setStatus('playing')
    window.umami?.track?.('Lecture du film')
  }, [])

  useEffect(() => {
    const onPlay = () => {
      wrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      play()
    }
    window.addEventListener('film:play', onPlay)
    return () => window.removeEventListener('film:play', onPlay)
  }, [play])

  const video = tall ? VIDEOS.tall : VIDEOS.wide

  return (
    <div id="film" ref={wrapRef} className="film">
      <video
        key={video}
        ref={videoRef}
        className="film-video"
        src={video}
        preload="none"
        playsInline
        controls={status === 'playing'}
        onPlaying={() => setShowPoster(false)}
        onEnded={() => setStatus('ended')}
      >
        <track kind="captions" src="/film/ltns-film.vtt" srcLang="fr" label="Français" />
      </video>

      {/* fetchpriority en minuscules : React 18 ne connaît pas fetchPriority.
          Sur téléphone, le cadre fait au plus 72vh × 9/16 = 40,5vh de large. */}
      {showPoster && (
        <picture className="film-poster">
          <source
            media={TALL_QUERY}
            srcSet="/media/ltns-film-9x16-720.webp 720w, /media/ltns-film-9x16-1080.webp 1080w"
            sizes="min(100vw, 40.5vh)"
            type="image/webp"
          />
          <img
            src="/media/ltns-film-16x9-1280.webp"
            srcSet="/media/ltns-film-16x9-1280.webp 1280w, /media/ltns-film-16x9-1920.webp 1920w"
            sizes="(max-width: 1080px) 100vw, 50vw"
            width="1280"
            height="720"
            alt=""
            fetchpriority="high"
            decoding="async"
          />
        </picture>
      )}

      {status === 'idle' && (
        <button type="button" className="film-play" onClick={play}>
          <span className="film-play-btn" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" /></svg>
          </span>
          {/* Nom lu par les lecteurs d'écran : le texte affiché, écrit en entier
              (pas d'aria-label, que les contrôles refusent : « 43 S » ≠ « 43 secondes ») */}
          <span className="film-play-txt" aria-hidden="true">
            <b>LANCER LE FILM</b>
            <span>43 S · AVEC LE SON</span>
          </span>
          <span className="sr-only">Lancer le film — 43 secondes, avec le son</span>
        </button>
      )}

      {status === 'ended' && (
        <div className="film-end">
          <span className="film-end-label">ENVIE D'UN SITE AU BON DEGRÉ ?</span>
          <div className="film-end-ctas">
            <a href={href('contact')} className="btn btn-primary">
              Demander mon devis <span className="arrow">→</span>
            </a>
            <button type="button" className="btn btn-ghost" onClick={play}>
              Revoir le film <span className="arrow">↺</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
