import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { api, isMovieNotFound } from '../api/client'
import type { CinemaShowtime, Movie, MovieShowtimes } from '../api/types'
import { seatsPath } from '../booking/showtimeDetails'
import { MoviePoster } from '../components/MoviePoster'
import { byShowtime, dayKey, formatDay, formatTime } from '../utils/showtime'
import './MovieShowtimesPage.css'

type ShowtimeDay = {
  key: string
  label: string
  showtimes: CinemaShowtime[]
}

type CinemaGroup = {
  cinemaId: number
  name: string | null
  days: ShowtimeDay[]
}

type State =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  | { status: 'ready'; movie: Movie; cinemas: CinemaGroup[]; total: number }

// Keyed by id so navigating between movies starts from a fresh loading state.
export function MovieShowtimesRoute() {
  const { id = '' } = useParams()
  return <MovieShowtimesPage key={id} id={id} />
}

function MovieShowtimesPage({ id }: { id: string }) {
  const validId = /^\d+$/.test(id)
  const [state, setState] = useState<State>(validId ? { status: 'loading' } : { status: 'not-found' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!validId) return
    let cancelled = false
    loadShowtimes(id)
      .then((result) => !cancelled && setState({ status: 'ready', ...result }))
      .catch((err: unknown) => {
        if (cancelled) return
        if (isMovieNotFound(err)) {
          setState({ status: 'not-found' })
        } else {
          setState({ status: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [id, validId, attempt])

  const retry = () => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }

  return (
    <section className="showtimes-page">
      <Link to="/" className="back-link">
        <span aria-hidden="true">←</span> All movies
      </Link>

      {state.status === 'loading' && <HeroSkeleton />}

      {state.status === 'not-found' && (
        <div className="notice">
          <h2>Movie not found</h2>
          <p>This movie doesn't exist or is no longer showing.</p>
          <Link to="/" className="button">
            Browse movies
          </Link>
        </div>
      )}

      {state.status === 'error' && (
        <div className="notice notice--error" role="alert">
          <h2>Couldn't load showtimes</h2>
          <p>{state.message}</p>
          <button type="button" className="button" onClick={retry}>
            Try again
          </button>
        </div>
      )}

      {state.status === 'ready' && (
        <>
          <header className="movie-hero">
            <div className="movie-hero__poster">
              <MoviePoster movie={state.movie} />
            </div>
            <div className="movie-hero__info">
              <p className="eyebrow">{state.total > 0 ? 'Now showing' : 'No upcoming showtimes'}</p>
              <h1 className="movie-hero__title">{state.movie.title}</h1>
              {state.total > 0 && (
                <p className="movie-hero__meta">
                  {plural(state.total, 'showtime')} available · {plural(state.cinemas.length, 'cinema')}
                </p>
              )}
            </div>
          </header>

          <h2 className="section-title">Choose a showtime</h2>

          {state.cinemas.length === 0 ? (
            <div className="notice">
              <h2>No upcoming showtimes</h2>
              <p>There are no screenings open for booking right now. Check back soon.</p>
            </div>
          ) : (
            <ul className="cinema-list">
              {state.cinemas.map((cinema) => (
                <li key={cinema.cinemaId} className="cinema-card">
                  <header className="cinema-card__header">
                    <span className="eyebrow">Cinema</span>
                    <h3 className="cinema-card__name">{cinema.name ?? `#${cinema.cinemaId}`}</h3>
                  </header>
                  {cinema.days.map((day) => (
                    <div key={day.key} className="showtime-day">
                      <p className="showtime-day__label">{day.label}</p>
                      <ul className="time-list">
                        {day.showtimes.map((showtime) => (
                          <li key={showtime.id}>
                            {showtime.bookable ? (
                              <Link
                                to={seatsPath(state.movie.id, showtime.id)}
                                className="time-chip"
                                aria-label={`${formatDay(showtime.showtime)} ${formatTime(showtime.showtime)}, choose seats`}
                              >
                                <time dateTime={showtime.showtime}>{formatTime(showtime.showtime)}</time>
                              </Link>
                            ) : (
                              <span
                                className="time-chip time-chip--disabled"
                                aria-disabled="true"
                                title="Booking closed 15 minutes after the showtime started"
                              >
                                <time dateTime={showtime.showtime}>{formatTime(showtime.showtime)}</time>
                                <span className="visually-hidden">, booking closed</span>
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

async function loadShowtimes(id: string) {
  const { movie, showtimes } = await api.getMovieShowtimes(id)
  // Only cinemas with something still bookable; within them, see groupByDay.
  const groups = (showtimes ?? []).filter((g) => g.showtimes.some((s) => s.bookable))

  // Showtimes only carry cinema_id; look up names, falling back to the id if
  // a lookup fails rather than failing the whole page.
  const names = await Promise.allSettled(groups.map((g) => api.getCinema(g.cinema_id)))

  const cinemas = groups
    .map((group, i): CinemaGroup => {
      const result = names[i]
      return {
        cinemaId: group.cinema_id,
        name: result.status === 'fulfilled' ? result.value.name : null,
        days: groupByDay(group),
      }
    })
    .sort(byCinema)

  const total = groups.reduce((n, g) => n + g.showtimes.filter((s) => s.bookable).length, 0)
  return { movie, cinemas, total }
}

// Named cinemas alphabetically, then any whose name lookup failed, by id.
function byCinema(a: CinemaGroup, b: CinemaGroup): number {
  if (a.name !== null && b.name !== null) return a.name.localeCompare(b.name) || a.cinemaId - b.cinemaId
  if (a.name !== null) return -1
  if (b.name !== null) return 1
  return a.cinemaId - b.cinemaId
}

// Days in date order. Days that are completely over are left out; on a day
// that still has showtimes, the ones that closed stay visible but disabled.
function groupByDay(group: MovieShowtimes): ShowtimeDay[] {
  const days = new Map<string, ShowtimeDay>()
  for (const showtime of [...group.showtimes].sort(byShowtime)) {
    const key = dayKey(showtime.showtime)
    let day = days.get(key)
    if (!day) {
      day = { key, label: formatDay(showtime.showtime), showtimes: [] }
      days.set(key, day)
    }
    day.showtimes.push(showtime)
  }
  return [...days.values()].filter((day) => day.showtimes.some((s) => s.bookable))
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function HeroSkeleton() {
  return (
    <div className="movie-hero" aria-busy="true" aria-label="Loading showtimes">
      <div className="movie-hero__poster">
        <div className="poster skeleton" />
      </div>
      <div className="movie-hero__info">
        <div className="skeleton skeleton--text" style={{ width: '30%' }} />
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--text" style={{ width: '45%' }} />
      </div>
    </div>
  )
}
