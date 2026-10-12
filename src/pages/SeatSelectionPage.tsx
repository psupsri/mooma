import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  loadShowtimeDetails,
  reviewPath,
  seatsFromParams,
  type Seat,
  type ShowtimeDetails,
} from '../booking/showtimeDetails'
import { BookingHeader } from '../components/BookingHeader'
import { BookingClosed, LoadError, LoadingBlock } from '../components/LoadState'
import { useAsync } from '../hooks/useAsync'
import './SeatSelectionPage.css'

export function SeatSelectionRoute() {
  const { movieId = '', showtimeId = '' } = useParams()
  return <SeatSelectionPage key={`${movieId}/${showtimeId}`} movieId={movieId} showtimeId={showtimeId} />
}

function SeatSelectionPage({ movieId, showtimeId }: { movieId: string; showtimeId: string }) {
  const [state, retry] = useAsync(() => loadShowtimeDetails(movieId, showtimeId))

  return (
    <section>
      <Link to={`/movies/${movieId}`} className="back-link">
        <span aria-hidden="true">←</span> Showtimes
      </Link>

      {state.status === 'loading' && <LoadingBlock label="Loading seats" />}
      {state.status === 'error' && <LoadError error={state.error} onRetry={retry} />}
      {state.status === 'ready' &&
        (state.data.showtime.bookable ? (
          <SeatPicker details={state.data} />
        ) : (
          <BookingClosed movieId={state.data.movie.id} />
        ))}
    </section>
  )
}

function SeatPicker({ details }: { details: ShowtimeDetails }) {
  const navigate = useNavigate()
  // Selection lives in the URL so it survives refresh and "Change seats".
  const [params, setParams] = useSearchParams()
  const selected = seatsFromParams(details, params.getAll('seat')).filter((seat) => !details.booked.has(seat.key))
  const selectedKeys = new Set(selected.map((seat) => seat.key))

  const toggle = (seat: Seat) => {
    const next = selectedKeys.has(seat.key) ? selected.filter((s) => s.key !== seat.key) : [...selected, seat]
    const nextParams = new URLSearchParams()
    for (const s of seatsFromParams(details, next.map((s) => s.key))) nextParams.append('seat', s.key)
    setParams(nextParams, { replace: true })
  }

  const available = details.seatsByKey.size - details.booked.size

  return (
    <>
      <BookingHeader details={details} step="Seats" />

      <div className="seat-layout">
        <div className="screen" aria-hidden="true">
          <span>Screen</span>
        </div>

        {details.rows.length === 0 ? (
          <div className="notice">
            <h2>No seats configured</h2>
            <p>This cinema has no seat layout yet.</p>
          </div>
        ) : (
          <div className="seat-map-scroll">
            <div className="seat-map" role="group" aria-label={`Seats in cinema ${details.cinema.name}`}>
              {details.rows.map((row) => (
                <div key={row.line} className="seat-row">
                  <span className="seat-row__label" aria-hidden="true">
                    {row.line.toUpperCase()}
                  </span>
                  {row.seats.map((seat) => {
                    const booked = details.booked.has(seat.key)
                    const isSelected = selectedKeys.has(seat.key)
                    return (
                      <button
                        key={seat.key}
                        type="button"
                        className="seat"
                        data-state={booked ? 'booked' : isSelected ? 'selected' : 'available'}
                        disabled={booked}
                        aria-pressed={booked ? undefined : isSelected}
                        aria-label={`Seat ${seat.label}${booked ? ', booked' : ''}`}
                        onClick={() => toggle(seat)}
                      >
                        {seat.number}
                      </button>
                    )
                  })}
                  <span className="seat-row__label" aria-hidden="true">
                    {row.line.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <ul className="seat-legend" aria-label="Legend">
          <li>
            <span className="seat seat--legend" data-state="available" /> Available
          </li>
          <li>
            <span className="seat seat--legend" data-state="selected" /> Selected
          </li>
          <li>
            <span className="seat seat--legend" data-state="booked" /> Booked
          </li>
        </ul>
        {available === 0 && details.rows.length > 0 && <p className="sold-out">This showtime is sold out.</p>}
      </div>

      <div className="selection-bar" aria-live="polite">
        <div className="selection-bar__inner">
          <div className="selection-bar__summary">
            {selected.length === 0 ? (
              <span className="selection-bar__hint">Select one or more seats</span>
            ) : (
              <>
                <strong>
                  {selected.length} {selected.length === 1 ? 'seat' : 'seats'}
                </strong>
                <span className="selection-bar__seats">{selected.map((s) => s.label).join(', ')}</span>
              </>
            )}
          </div>
          <button
            type="button"
            className="button selection-bar__cta"
            disabled={selected.length === 0}
            onClick={() => navigate(reviewPath(details.movie.id, details.showtime.id, selected))}
          >
            Continue
          </button>
        </div>
      </div>
    </>
  )
}
