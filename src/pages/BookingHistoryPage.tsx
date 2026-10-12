import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import { api, ApiError } from '../api/client'
import type { Booking } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { seatLabel } from '../booking/showtimeDetails'
import { MoviePoster } from '../components/MoviePoster'
import { errorMessage, useAsync } from '../hooks/useAsync'
import { byShowtime, cinemaWallClock, formatBookedAt, formatDay, formatTime } from '../utils/showtime'
import './BookingHistoryPage.css'

type History = {
  upcoming: Booking[]
  past: Booking[]
  cinemaNames: Map<number, string>
}

export function BookingHistoryPage() {
  const { isAuthenticated } = useAuth()
  // Also covers an expired token: the 401 signs the user out, which lands here.
  if (!isAuthenticated) return <Navigate to={`/login?${new URLSearchParams({ redirect: '/bookings' })}`} replace />
  return <BookingHistory />
}

function BookingHistory() {
  const [state, retry] = useAsync(loadHistory)
  // Cancelled bookings are deleted server-side; drop them locally instead of reloading.
  const [cancelled, setCancelled] = useState<Booking[]>([])
  const cancelledIds = new Set(cancelled.map((b) => b.id))
  const lastCancelled = cancelled.at(-1)

  const onCancelled = (booking: Booking) => setCancelled((list) => [...list, booking])
  const visible = (list: Booking[]) => list.filter((b) => !cancelledIds.has(b.id))

  return (
    <section className="history">
      <header className="history__header">
        <p className="eyebrow">Your account</p>
        <h1>My bookings</h1>
      </header>

      {state.status === 'loading' && (
        <div className="history-list" aria-busy="true" aria-label="Loading bookings">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton history-skeleton" />
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <div className="notice notice--error" role="alert">
          <h2>Couldn't load your bookings</h2>
          <p>{errorMessage(state.error)}</p>
          <button type="button" className="button" onClick={retry}>
            Try again
          </button>
        </div>
      )}

      {lastCancelled && <CancelledNotice booking={lastCancelled} />}

      {state.status === 'ready' && visible(state.data.upcoming).length + visible(state.data.past).length === 0 && (
        <div className="notice">
          <h2>No bookings yet</h2>
          <p>When you book seats, they'll show up here.</p>
          <Link to="/" className="button">
            Browse movies
          </Link>
        </div>
      )}

      {state.status === 'ready' && (
        <>
          <BookingSection
            title="Upcoming"
            bookings={visible(state.data.upcoming)}
            cinemaNames={state.data.cinemaNames}
            onCancelled={onCancelled}
          />
          <BookingSection
            title="Past"
            bookings={visible(state.data.past)}
            cinemaNames={state.data.cinemaNames}
            onCancelled={onCancelled}
            past
          />
        </>
      )}
    </section>
  )
}

function CancelledNotice({ booking }: { booking: Booking }) {
  const seats = booking.seats.flatMap((row) => row.numbers.map((n) => seatLabel(row.line, n)))
  return (
    <div className="alert alert--success history__toast" role="status">
      <strong>Booking #{booking.id} cancelled.</strong> <span className="capitalize">{booking.movie.title}</span>{' '}
      {seats.length === 1 ? `seat ${seats[0]} has` : `seats ${seats.join(', ')} have`} been released.
    </div>
  )
}

async function loadHistory(): Promise<History> {
  const bookings = await api.getMyBookings()

  // Bookings only carry cinema_id; a failed name lookup falls back to the id.
  const cinemaIds = [...new Set(bookings.map((b) => b.cinema_id))]
  const results = await Promise.allSettled(cinemaIds.map((id) => api.getCinema(id)))
  const cinemaNames = new Map<number, string>()
  results.forEach((result, i) => result.status === 'fulfilled' && cinemaNames.set(cinemaIds[i], result.value.name))

  // starts_at is a real instant (cinema time zone applied by the backend).
  const now = Date.now()
  const started = (b: Booking) => Date.parse(b.starts_at) <= now
  const byTime = (a: Booking, b: Booking) => byShowtime(a.showtime, b.showtime)
  return {
    upcoming: bookings.filter((b) => !started(b)).sort(byTime),
    past: bookings.filter(started).sort((a, b) => byTime(b, a)),
    cinemaNames,
  }
}

type SectionProps = {
  title: string
  bookings: Booking[]
  cinemaNames: Map<number, string>
  onCancelled: (booking: Booking) => void
  past?: boolean
}

function BookingSection({ title, bookings, cinemaNames, onCancelled, past = false }: SectionProps) {
  if (bookings.length === 0) return null
  return (
    <section className="history-section">
      <h2 className="history-section__title">
        {title} <span>{bookings.length}</span>
      </h2>
      <ul className="history-list">
        {bookings.map((booking) => (
          <li key={booking.id}>
            <BookingItem
              booking={booking}
              cinemaName={cinemaNames.get(booking.cinema_id)}
              past={past}
              onCancelled={onCancelled}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

type ItemProps = {
  booking: Booking
  cinemaName?: string
  past: boolean
  onCancelled: (booking: Booking) => void
}

function BookingItem({ booking, cinemaName, past, onCancelled }: ItemProps) {
  const [step, setStep] = useState<'idle' | 'confirming' | 'cancelling'>('idle')
  const [error, setError] = useState<string | null>(null)
  // Set when the backend refuses because the window closed while the page was open.
  const [closed, setClosed] = useState(false)
  const seats = booking.seats.flatMap((row) => row.numbers.map((n) => seatLabel(row.line, n)))
  const status = booking.status === 'confirmed' && past ? 'completed' : booking.status
  // The backend decides (until 2 hours before the showtime) and enforces it too.
  const cancellable = booking.can_cancel && !closed
  const deadline = cinemaWallClock(booking.cancel_deadline)

  const cancel = async () => {
    setStep('cancelling')
    setError(null)
    try {
      await api.cancelBooking(booking.id)
      onCancelled(booking)
    } catch (err) {
      // Already gone (e.g. cancelled in another tab): same outcome for the user.
      if (err instanceof ApiError && err.status === 404) {
        onCancelled(booking)
        return
      }
      if (err instanceof ApiError && err.status === 409) {
        setClosed(true)
        setStep('idle')
        return
      }
      setStep('confirming')
      setError(errorMessage(err))
    }
  }

  return (
    <article className={past ? 'booking-item booking-item--past' : 'booking-item'}>
      <Link to={`/movies/${booking.movie.id}`} className="booking-item__poster" tabIndex={-1} aria-hidden="true">
        <MoviePoster movie={booking.movie} />
      </Link>

      <div className="booking-item__body">
        <div className="booking-item__top">
          <h3 className="booking-item__title">
            <Link to={`/movies/${booking.movie.id}`}>{booking.movie.title}</Link>
          </h3>
          <span className="status-badge" data-status={status}>
            {STATUS_LABELS[status]}
          </span>
        </div>

        <p className="booking-item__when">
          <time dateTime={booking.showtime.showtime}>
            {formatDay(booking.showtime.showtime)} · {formatTime(booking.showtime.showtime)}
          </time>
          <span>Cinema {cinemaName ?? `#${booking.cinema_id}`}</span>
        </p>

        <ul className="seat-chips" aria-label="Seats">
          {seats.map((label) => (
            <li key={label} className="seat-chip">
              {label}
            </li>
          ))}
        </ul>

        <p className="booking-item__meta">
          Booking #{booking.id} · {seats.length} {seats.length === 1 ? 'ticket' : 'tickets'} · Booked{' '}
          <time dateTime={booking.created_at}>{formatBookedAt(booking.created_at)}</time>
        </p>

        {cancellable && step === 'idle' && (
          <div className="booking-item__actions">
            <span className="booking-item__policy">
              Free cancellation until {formatDay(deadline)} · {formatTime(deadline)}
            </span>
            <button type="button" className="link-button" onClick={() => setStep('confirming')}>
              Cancel booking
            </button>
          </div>
        )}

        {!past && !cancellable && (
          <p className="booking-item__policy booking-item__policy--closed">
            Cancellation closed. Bookings can be cancelled until 2 hours before the showtime.
          </p>
        )}

        {cancellable && step !== 'idle' && (
          <div className="cancel-confirm" role="group" aria-label={`Cancel booking #${booking.id}`}>
            <p>
              <strong>Cancel this booking?</strong> Seats {seats.join(', ')} will be released and this can't be undone.
            </p>
            {error && (
              <p className="cancel-confirm__error" role="alert">
                {error}
              </p>
            )}
            <div className="cancel-confirm__buttons">
              <button type="button" className="button button--danger" onClick={cancel} disabled={step === 'cancelling'}>
                {step === 'cancelling' ? 'Cancelling…' : 'Yes, cancel'}
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => {
                  setStep('idle')
                  setError(null)
                }}
                disabled={step === 'cancelling'}
              >
                Keep booking
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

const STATUS_LABELS: Record<Booking['status'] | 'completed', string> = {
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
}
