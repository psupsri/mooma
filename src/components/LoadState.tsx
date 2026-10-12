import { Link } from 'react-router'
import { NotFoundError } from '../booking/showtimeDetails'
import { errorMessage } from '../hooks/useAsync'

type Props = {
  error: unknown
  onRetry: () => void
}

// Error view for the booking pages: not-found vs. a failed request.
export function LoadError({ error, onRetry }: Props) {
  if (error instanceof NotFoundError) {
    return (
      <div className="notice">
        <h2>Showtime not found</h2>
        <p>This showtime doesn't exist or is no longer available.</p>
        <Link to="/" className="button">
          Browse movies
        </Link>
      </div>
    )
  }
  return (
    <div className="notice notice--error" role="alert">
      <h2>Something went wrong</h2>
      <p>{errorMessage(error)}</p>
      <button type="button" className="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="loading-block" aria-busy="true" aria-label={label}>
      <div className="skeleton skeleton--text" style={{ width: '40%' }} />
      <div className="skeleton loading-block__panel" />
    </div>
  )
}

// Shown on the seat and review pages once a showtime is past its booking window.
export function BookingClosed({ movieId }: { movieId: number }) {
  return (
    <div className="notice">
      <h2>Booking closed</h2>
      <p>This showtime started more than 15 minutes ago and can no longer be booked.</p>
      <Link to={`/movies/${movieId}`} className="button">
        Choose another showtime
      </Link>
    </div>
  )
}
