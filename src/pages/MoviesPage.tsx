import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Movie } from '../api/types'
import { MovieCard, MovieCardSkeleton } from '../components/MovieCard'
import './MoviesPage.css'

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; movies: Movie[] }

const SKELETON_COUNT = 8

export function MoviesPage() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .getMovies({ nowShowing: true })
      .then((movies) => !cancelled && setState({ status: 'ready', movies }))
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Unknown error'
        setState({ status: 'error', message })
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = () => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }

  return (
    <section className="movies">
      <header className="movies__header">
        <p className="eyebrow">In cinemas</p>
        <h1>Now showing</h1>
        {state.status === 'ready' && state.movies.length > 0 && (
          <p className="movies__count">
            {state.movies.length} {state.movies.length === 1 ? 'movie' : 'movies'}
          </p>
        )}
      </header>

      {state.status === 'loading' && (
        <div className="movie-grid" aria-busy="true" aria-label="Loading movies">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <MovieCardSkeleton key={i} />
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <div className="notice notice--error" role="alert">
          <h2>Couldn't load movies</h2>
          <p>{state.message}</p>
          <button type="button" className="button" onClick={retry}>
            Try again
          </button>
        </div>
      )}

      {state.status === 'ready' && state.movies.length === 0 && (
        <div className="notice">
          <h2>Nothing showing right now</h2>
          <p>There are no upcoming showtimes at the moment. Check back soon.</p>
        </div>
      )}

      {state.status === 'ready' && state.movies.length > 0 && (
        <ul className="movie-grid">
          {state.movies.map((movie) => (
            <li key={movie.id}>
              <MovieCard movie={movie} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
