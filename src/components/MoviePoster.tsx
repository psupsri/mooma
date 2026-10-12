import { useState, type CSSProperties } from 'react'
import type { Movie } from '../api/types'
import './MoviePoster.css'

type Props = {
  movie: Movie
}

// poster_url is optional in the backend (nullable column, "" when unset), and
// a set URL can still fail to load, so both cases fall back to a title card.
export function MoviePoster({ movie }: Props) {
  const [failed, setFailed] = useState(false)
  const src = movie.poster_url.trim()

  if (!src || failed) {
    return (
      <div className="poster poster--fallback" style={{ '--hue': (movie.id * 47) % 360 } as CSSProperties}>
        <span className="poster__fallback-title">{movie.title}</span>
      </div>
    )
  }

  return (
    <div className="poster">
      <img src={src} alt={`${movie.title} poster`} loading="lazy" decoding="async" onError={() => setFailed(true)} />
    </div>
  )
}
