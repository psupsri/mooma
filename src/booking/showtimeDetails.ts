import { api, isMovieNotFound } from '../api/client'
import type { BookingSeat, Cinema, CinemaShowtime, Movie } from '../api/types'

export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export type Seat = {
  key: string
  line: string
  number: string
  label: string
}

export type SeatRow = {
  line: string
  seats: Seat[]
}

export type ShowtimeDetails = {
  movie: Movie
  showtime: CinemaShowtime
  cinema: Cinema
  rows: SeatRow[]
  seatsByKey: Map<string, Seat>
  booked: Set<string>
}

// Seats are identified as "<line>-<number>" in URLs (?seat=a-1&seat=a-2) and
// state. Keys are only ever looked up in the cinema's own layout, never split.
export function seatKey(line: string, number: string): string {
  return `${line}-${number}`
}

export function seatLabel(line: string, number: string): string {
  return `${line.toUpperCase()}${number}`
}

export function toBookingSeats(seats: Seat[]): BookingSeat[] {
  return seats.map((seat) => ({ Line: seat.line, Number: seat.number }))
}

// There is no GET /showtime/:id, so the showtime is found through its movie's
// showtimes, which also confirms it belongs to that movie.
export async function loadShowtimeDetails(movieId: string, showtimeId: string): Promise<ShowtimeDetails> {
  if (!/^\d+$/.test(movieId) || !/^\d+$/.test(showtimeId)) throw new NotFoundError()

  let result
  try {
    result = await api.getMovieShowtimes(movieId)
  } catch (err) {
    if (isMovieNotFound(err)) throw new NotFoundError()
    throw err
  }

  const id = Number(showtimeId)
  const group = (result.showtimes ?? []).find((g) => g.showtimes.some((s) => s.id === id))
  const showtime = group?.showtimes.find((s) => s.id === id)
  if (!group || !showtime) throw new NotFoundError()

  const [cinema, bookedSeats] = await Promise.all([api.getCinema(group.cinema_id), api.getBookedSeats(id)])

  const seatsByKey = new Map<string, Seat>()
  const rows = cinema.seats.map((row) => ({
    line: row.line,
    seats: row.numbers.map((number) => {
      const seat = { key: seatKey(row.line, number), line: row.line, number, label: seatLabel(row.line, number) }
      seatsByKey.set(seat.key, seat)
      return seat
    }),
  }))
  const booked = new Set(bookedSeats.map((s) => seatKey(s.line, s.number)))

  return { movie: result.movie, showtime, cinema, rows, seatsByKey, booked }
}

// Seats from the URL that exist in this cinema, in layout order, deduplicated.
export function seatsFromParams(details: ShowtimeDetails, keys: string[]): Seat[] {
  const wanted = new Set(keys)
  return details.rows.flatMap((row) => row.seats).filter((seat) => wanted.has(seat.key))
}

export function seatsPath(movieId: number | string, showtimeId: number | string, seats: Seat[] | string[] = []) {
  return withSeats(`/movies/${movieId}/showtimes/${showtimeId}/seats`, seats)
}

export function reviewPath(movieId: number | string, showtimeId: number | string, seats: Seat[] | string[]) {
  return withSeats(`/movies/${movieId}/showtimes/${showtimeId}/review`, seats)
}

function withSeats(path: string, seats: Seat[] | string[]) {
  if (seats.length === 0) return path
  const params = new URLSearchParams()
  for (const seat of seats) params.append('seat', typeof seat === 'string' ? seat : seat.key)
  return `${path}?${params}`
}
