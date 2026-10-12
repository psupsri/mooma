import type { ShowtimeDetails } from '../booking/showtimeDetails'
import { formatDay, formatTime } from '../utils/showtime'
import { MoviePoster } from './MoviePoster'
import './BookingHeader.css'

const STEPS = ['Showtime', 'Seats', 'Review'] as const

type Props = {
  details: ShowtimeDetails
  step: (typeof STEPS)[number]
}

export function BookingHeader({ details, step }: Props) {
  const current = STEPS.indexOf(step)
  return (
    <header className="booking-header">
      <ol className="steps" aria-label="Booking progress">
        {STEPS.map((name, i) => (
          <li
            key={name}
            className={i < current ? 'step step--done' : i === current ? 'step step--current' : 'step'}
            aria-current={i === current ? 'step' : undefined}
          >
            <span className="step__index" aria-hidden="true">
              {i < current ? '✓' : i + 1}
            </span>
            {name}
          </li>
        ))}
      </ol>

      <div className="booking-header__movie">
        <div className="booking-header__poster">
          <MoviePoster movie={details.movie} />
        </div>
        <div>
          <h1 className="booking-header__title">{details.movie.title}</h1>
          <p className="booking-header__meta">
            <span>Cinema {details.cinema.name}</span>
            <time dateTime={details.showtime.showtime}>
              {formatDay(details.showtime.showtime)} · {formatTime(details.showtime.showtime)}
            </time>
          </p>
        </div>
      </div>
    </header>
  )
}
