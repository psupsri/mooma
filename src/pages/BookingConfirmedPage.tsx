import { Link, useLocation } from 'react-router'
import type { Booking } from '../api/types'
import { seatLabel } from '../booking/showtimeDetails'
import { formatDay, formatTime } from '../utils/showtime'
import './BookingReviewPage.css'

export type ConfirmedState = {
  booking: Booking
  cinemaName: string
}

// There is no GET /booking/:id, so this page shows the response handed over
// by the review page; on a refresh it has nothing to show.
export function BookingConfirmedPage() {
  const state = useLocation().state as ConfirmedState | null

  if (!state?.booking) {
    return (
      <section className="notice">
        <h2>No booking to show</h2>
        <p>Booking details are only shown right after you book.</p>
        <Link to="/" className="button">
          Browse movies
        </Link>
      </section>
    )
  }

  const { booking, cinemaName } = state
  const seats = booking.seats.flatMap((row) => row.numbers.map((n) => seatLabel(row.line, n)))

  return (
    <section className="confirmed">
      <div className="confirmed__badge" aria-hidden="true">
        ✓
      </div>
      <p className="eyebrow">Booking #{booking.id}</p>
      <h1 className="confirmed__title">You're all set!</h1>
      <p className="confirmed__lead">
        Enjoy the movie, {booking.customer.first_name}. A summary of your booking is below.
      </p>

      <div className="review-card confirmed__card">
        <dl className="review-list">
          <div>
            <dt>Movie</dt>
            <dd className="capitalize">{booking.movie.title}</dd>
          </div>
          <div>
            <dt>Cinema</dt>
            <dd>{cinemaName}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{formatDay(booking.showtime.showtime)}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>
              <time dateTime={booking.showtime.showtime}>{formatTime(booking.showtime.showtime)}</time>
            </dd>
          </div>
          <div>
            <dt>Seats</dt>
            <dd>
              <ul className="seat-chips">
                {seats.map((label) => (
                  <li key={label} className="seat-chip">
                    {label}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt>Booked by</dt>
            <dd>
              {booking.customer.first_name} {booking.customer.last_name}
              <br />
              <span className="confirmed__email">{booking.customer.email}</span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="confirmed__actions">
        <Link to="/bookings" className="button">
          View my bookings
        </Link>
        <Link to="/" className="confirmed__secondary">
          Back to movies
        </Link>
      </div>
    </section>
  )
}
