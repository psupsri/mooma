// Types mirror the Go structs in mooma-api/model. Field casing follows the
// JSON the backend actually emits: structs without `json` tags serialize with
// their Go field names (PascalCase), so a few types below are not snake_case.

export type SuccessResponse<T> = {
  status: 'success'
  data: T
}

export type ErrorResponse = {
  status?: 'failed'
  message: string
}

// --- auth ---

export type RegisterRequest = {
  first_name: string
  last_name: string
  tel?: string
  email: string
  password: string
}

export type CustomerResponse = {
  first_name: string
  last_name: string
  tel: string
  email: string
}

export type LoginRequest = {
  email: string
  password: string
}

// model.LoginResponse has no json tag and is not wrapped in SuccessResponse.
export type LoginResponse = {
  AccessToken: string
}

// --- movie ---

export type Movie = {
  id: number
  title: string
  poster_url: string
}

export type CreateMovieRequest = {
  title: string
  poster_url?: string
}

export type CinemaShowtime = {
  id: number
  showtime: string // cinema wall-clock time, labelled "Z"
  starts_at: string // real instant, cinema time zone applied by the backend
  bookable: boolean // false from 15 minutes after the start
}

export type MovieShowtimes = {
  cinema_id: number
  showtimes: CinemaShowtime[]
}

export type MovieWithShowtimes = {
  movie: Movie
  // null (not []) when the movie has no showtimes; entries are grouped by
  // cinema but times within a cinema are not sorted.
  showtimes: MovieShowtimes[] | null
}

// --- showtime ---

// model.ShowtimeResponse has no json tags, so keys are PascalCase.
export type Showtime = {
  ID: number
  MovieID: number
  CinemaID: number
  Showtime: string // RFC 3339 timestamp
}

export type CreateShowtimeRequest = {
  movie_id: number
  cinema_id: number
  showtime: string // RFC 3339 timestamp
}

// --- cinema ---

export type CinemaSeatRow = {
  line: string
  numbers: string[]
}

export type Cinema = {
  id: number
  name: string
  seats: CinemaSeatRow[]
}

// --- booking ---

// GET /showtime/:id/booked-seats
export type BookedSeat = {
  line: string
  number: string
}

// model.CinemaSeat has no json tags; Go decodes keys case-insensitively, but
// PascalCase matches what the backend stores and echoes.
export type BookingSeat = {
  Line: string
  Number: string
}

export type CreateBookingRequest = {
  showtime_id: number
  seats: BookingSeat[]
}

export type Booking = {
  id: number
  customer: CustomerResponse
  movie: Movie
  cinema_id: number
  showtime: CinemaShowtime
  seats: CinemaSeatRow[]
  status: 'confirmed' | 'cancelled' | 'expired'
  created_at: string // RFC 3339, a real UTC instant (unlike showtimes)
  // Computed by the backend in the cinema's time zone (RFC 3339 with offset).
  starts_at: string
  cancel_deadline: string
  can_cancel: boolean // false from 2 hours before the showtime
}

// POST /booking/ responds with { status, message: GetBookingResponse }.
export type CreateBookingResponse = {
  status: 'success'
  message: Booking
}
