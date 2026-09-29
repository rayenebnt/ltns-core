import { useCallback, useEffect, useRef, useState } from 'react'

// Le film de présentation : version verticale sur téléphone, paysage ailleurs.
// Fichiers dans public/film/ (vidéo avec voix off, image d'aperçu, sous-titres).
const FORMATS = {
  wide: { video: '/film/ltns-film-16x9.mp4', poster: '/film/ltns-film-16x9.jpg' },
  tall: { video: '/film/ltns-film-9x16.mp4', poster: '/film/ltns-film-9x16.jpg' },
}
const TALL_QUERY = '(max-width: 720px) and (orientation: portrait)'

// Lance le film depuis n'importe où (ex. bouton « Voir le film » de l'accueil)
export const playFilm = () => window.dispatchEvent(new Event('film:play'))

export default function FilmPlayer() {
  const wrapRef = useRef(null)
  const videoRef = useRef(null)
  const [tall, setTall] = useState(() => window.matchMedia(TALL_QUERY).matches)
  const [status, setStatus] = useState('idle') // idle → playing → ended

  // Suit l'orientation tant que le film n'a pas été lancé
  useEffect(() => {
    if (status !== 'idle') return
    const mq = window.matchMedia(TALL_QUERY)
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

  const { video, poster } = tall ? FORMATS.tall : FORMATS.wide

  return (
    <div id="film" ref={wrapRef} className={`film${tall ? ' film--tall' : ''}`}>
      <video
        key={video}
        ref={videoRef}
        className="film-video"
        src={video}
        poster={poster}
        preload="none"
        playsInline
        controls={status === 'playing'}
        onEnded={() => setStatus('ended')}
      >
        <track kind="captions" src="/film/ltns-film.vtt" srcLang="fr" label="Français" />
      </video>

      {status === 'idle' && (
        <button
          type="button"
          className="film-play"
          onClick={play}
          aria-label="Lancer le film de présentation, 43 secondes, avec le son"
        >
          <span className="film-play-btn" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" /></svg>
          </span>
          <span className="film-play-txt">
            <b>LANCER LE FILM</b>
            <span>43 S · AVEC LE SON</span>
          </span>
        </button>
      )}

      {status === 'ended' && (
        <div className="film-end">
          <span className="film-end-label">ENVIE D'UN SITE AU BON DEGRÉ ?</span>
          <div className="film-end-ctas">
            <a href="#contact" className="btn btn-primary">
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
