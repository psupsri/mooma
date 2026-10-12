import type {
  BookedSeat,
  Booking,
  Cinema,
  CreateBookingRequest,
  CreateBookingResponse,
  CreateMovieRequest,
  CreateShowtimeRequest,
  CustomerResponse,
  ErrorResponse,
  LoginRequest,
  LoginResponse,
  Movie,
  MovieWithShowtimes,
  RegisterRequest,
  Showtime,
  SuccessResponse,
} from './types'

// Proxied to mooma-api by the Vite dev server (see vite.config.ts).
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const TOKEN_KEY = 'mooma.accessToken'
// The backend answers an unknown movie id with a 500 and this message rather
// than a 404, so it is the only way to tell "not found" from a real failure.
const MOVIE_NOT_FOUND_MESSAGE = 'no movie with the id'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function isMovieNotFound(err: unknown): boolean {
  return err instanceof ApiError && err.message === MOVIE_NOT_FOUND_MESSAGE
}

const tokenListeners = new Set<() => void>()

// Lets React subscribe to sign-in/sign-out (see auth/useAuth.ts), including
// changes made in other tabs.
export function subscribeToken(listener: () => void): () => void {
  tokenListeners.add(listener)
  const onStorage = (e: StorageEvent) => e.key === TOKEN_KEY && listener()
  window.addEventListener('storage', onStorage)
  return () => {
    tokenListeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage unavailable (e.g. private mode); the session just won't persist.
  }
  tokenListeners.forEach((listener) => listener())
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  auth?: boolean
}

async function request<T>(path: string, { method = 'GET', body, auth = false }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const payload: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    // An expired or invalid token: drop it so the UI shows the user as signed out.
    if (auth && res.status === 401) setToken(null)
    const message = (payload as ErrorResponse | null)?.message ?? res.statusText
    throw new ApiError(res.status, message)
  }
  return payload as T
}

async function data<T>(path: string, options?: RequestOptions): Promise<T> {
  return (await request<SuccessResponse<T>>(path, options)).data
}

// Collection routes are registered with a trailing slash ("/movie/") in Gin.
// Calling them without it triggers a redirect whose Location drops the /api
// prefix, so the slashes below are required.
export const api = {
  health: () => request<{ message: string }>('/health'),

  register: (body: RegisterRequest) => data<CustomerResponse>('/auth/register', { method: 'POST', body }),
  login: async (body: LoginRequest) => {
    const { AccessToken } = await request<LoginResponse>('/auth/login', { method: 'POST', body })
    setToken(AccessToken)
    return AccessToken
  },
  logout: () => setToken(null),

  // nowShowing: only movies with a showtime still open for booking.
  getMovies: ({ nowShowing = false } = {}) => data<Movie[]>(nowShowing ? '/movie/?now_showing=true' : '/movie/'),
  getMovie: (id: number | string) => data<Movie>(`/movie/${id}`),
  getMovieShowtimes: (id: number | string) => data<MovieWithShowtimes>(`/movie/${id}/showtimes`),
  createMovie: (body: CreateMovieRequest) => data<Movie>('/movie/', { method: 'POST', body, auth: true }),

  getShowtimes: () => data<Showtime[]>('/showtime/'),
  getBookedSeats: (showtimeId: number | string) => data<BookedSeat[]>(`/showtime/${showtimeId}/booked-seats`),
  createShowtime: (body: CreateShowtimeRequest) => data<Showtime>('/showtime/', { method: 'POST', body, auth: true }),

  getCinema: (id: number | string) => data<Cinema>(`/cinema/${id}`),

  getMyBookings: () => data<Booking[]>('/booking/', { auth: true }),
  // Deletes the booking and releases its seats; 404 if it isn't the user's.
  cancelBooking: async (id: number) => {
    await request<{ status: 'success'; message: string }>(`/booking/${id}`, { method: 'DELETE', auth: true })
  },
  createBooking: async (body: CreateBookingRequest): Promise<Booking> =>
    (await request<CreateBookingResponse>('/booking/', { method: 'POST', body, auth: true })).message,
}
