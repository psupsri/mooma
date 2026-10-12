import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { api, ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import {
  loadShowtimeDetails,
  seatsFromParams,
  seatsPath,
  toBookingSeats,
  type ShowtimeDetails,
} from '../booking/showtimeDetails'
import { BookingHeader } from '../components/BookingHeader'
import { BookingClosed, LoadError, LoadingBlock } from '../components/LoadState'
import { errorMessage, useAsync } from '../hooks/useAsync'
import { formatDay, formatTime } from '../utils/showtime'
import type { ConfirmedState } from './BookingConfirmedPage'
import './BookingReviewPage.css'

export function BookingReviewRoute() {
  const { movieId = '', showtimeId = '' } = useParams()
  return <BookingReviewPage key={`${movieId}/${showtimeId}`} movieId={movieId} showtimeId={showtimeId} />
}

function BookingReviewPage({ movieId, showtimeId }: { movieId: string; showtimeId: string }) {
  const [params] = useSearchParams()
  const seatKeys = params.getAll('seat')
  const [state, retry] = useAsync(() => loadShowtimeDetails(movieId, showtimeId))

  return (
    <section>
      <Link to={seatsPath(movieId, showtimeId, seatKeys)} className="back-link">
        <span aria-hidden="true">←</span> Change seats
      </Link>

      {state.status === 'loading' && <LoadingBlock label="Loading booking details" />}
      {state.status === 'error' && <LoadError error={state.error} onRetry={retry} />}
      {state.status === 'ready' &&
        (state.data.showtime.bookable ? (
          <Review details={state.data} seatKeys={seatKeys} onConflict={retry} />
        ) : (
          <BookingClosed movieId={state.data.movie.id} />
        ))}
    </section>
  )
}

type ReviewProps = {
  details: ShowtimeDetails
  seatKeys: string[]
  // A 409 means seats were taken or the booking window closed; reloading the
  // details shows whichever it was.
  onConflict: () => void
}

function Review({ details, seatKeys, onConflict }: ReviewProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const seats = seatsFromParams(details, seatKeys)
  const taken = seats.filter((seat) => details.booked.has(seat.key))
  const back = seatsPath(details.movie.id, details.showtime.id, seats.filter((s) => !details.booked.has(s.key)))

  // Nothing (valid) to review, e.g. a hand-edited URL: go pick seats.
  if (seats.length === 0) return <Navigate to={back} replace />

  const here = location.pathname + location.search
  const loginPath = `/login?${new URLSearchParams({ redirect: here })}`

  const confirm = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const booking = await api.createBooking({ showtime_id: details.showtime.id, seats: toBookingSeats(seats) })
      const state: ConfirmedState = { booking, cinemaName: details.cinema.name }
      navigate('/booking/confirmed', { replace: true, state })
    } catch (err) {
      setSubmitting(false)
      if (err instanceof ApiError && err.status === 401) {
        navigate(loginPath, { replace: true })
      } else if (err instanceof ApiError && err.status === 409) {
        onConflict()
      } else {
        setError(errorMessage(err))
      }
    }
  }

  return (
    <>
      <BookingHeader details={details} step="Review" />

      <div className="review">
        <div className="review-card">
          <h2 className="review-card__title">Booking summary</h2>
          <dl className="review-list">
            <div>
              <dt>Movie</dt>
              <dd className="capitalize">{details.movie.title}</dd>
            </div>
            <div>
              <dt>Cinema</dt>
              <dd>{details.cinema.name}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{formatDay(details.showtime.showtime)}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>
                <time dateTime={details.showtime.showtime}>{formatTime(details.showtime.showtime)}</time>
              </dd>
            </div>
            <div>
              <dt>Seats</dt>
              <dd>
                <ul className="seat-chips">
                  {seats.map((seat) => (
                    <li key={seat.key} className={details.booked.has(seat.key) ? 'seat-chip seat-chip--taken' : 'seat-chip'}>
                      {seat.label}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            <div className="review-list__total">
              <dt>Tickets</dt>
              <dd>{seats.length}</dd>
            </div>
          </dl>
        </div>

        <aside className="review-actions">
          {taken.length > 0 ? (
            <div className="alert alert--error" role="alert">
              <strong>
                {taken.map((s) => s.label).join(', ')} {taken.length === 1 ? 'is' : 'are'} no longer available.
              </strong>
              <p>Someone else booked {taken.length === 1 ? 'this seat' : 'these seats'}. Please choose again.</p>
              <Link to={back} className="button">
                Choose seats
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="alert alert--error" role="alert">
                  <strong>Booking failed</strong>
                  <p>{error}</p>
                </div>
              )}
              {isAuthenticated ? (
                <button type="button" className="button button--block" onClick={confirm} disabled={submitting}>
                  {submitting ? 'Booking…' : 'Confirm booking'}
                </button>
              ) : (
                <>
                  <p className="review-actions__note">Sign in to confirm your booking. Your seats stay selected.</p>
                  <Link to={loginPath} className="button button--block">
                    Sign in to confirm
                  </Link>
                  <p className="review-actions__note">
                    New to Mooma? <Link to={`/register?${new URLSearchParams({ redirect: here })}`}>Create an account</Link>
                  </p>
                </>
              )}
            </>
          )}
        </aside>
      </div>
    </>
  )
}
