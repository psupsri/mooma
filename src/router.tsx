import { createBrowserRouter } from 'react-router'
import { Layout } from './components/Layout'
import { ErrorPage } from './pages/ErrorPage'
import { MoviesPage } from './pages/MoviesPage'
import { MovieShowtimesRoute } from './pages/MovieShowtimesPage'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import { BookingConfirmedPage } from './pages/BookingConfirmedPage'
import { BookingHistoryPage } from './pages/BookingHistoryPage'
import { BookingReviewRoute } from './pages/BookingReviewPage'
import { SeatSelectionRoute } from './pages/SeatSelectionPage'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      {
        // Pathless wrapper so route errors render inside the layout.
        ErrorBoundary: ErrorPage,
        children: [
          { index: true, Component: MoviesPage },
          { path: 'movies/:id', Component: MovieShowtimesRoute },
          { path: 'movies/:movieId/showtimes/:showtimeId/seats', Component: SeatSelectionRoute },
          { path: 'movies/:movieId/showtimes/:showtimeId/review', Component: BookingReviewRoute },
          { path: 'booking/confirmed', Component: BookingConfirmedPage },
          { path: 'bookings', Component: BookingHistoryPage },
          { path: 'login', Component: LoginPage },
          { path: 'register', Component: RegisterPage },
          { path: '*', Component: ErrorPage },
        ],
      },
    ],
  },
])
