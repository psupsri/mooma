import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { ApiStatus } from './ApiStatus'

export function Layout() {
  const { isAuthenticated, logout } = useAuth()
  const location = useLocation()
  const onAuthPage = location.pathname === '/login' || location.pathname === '/register'
  const redirect = new URLSearchParams({ redirect: location.pathname + location.search })

  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <Link to="/" className="brand">
            moo<span>ma</span>
          </Link>
          <nav className="nav">
            <NavLink to="/" end>
              Movies
            </NavLink>
            {isAuthenticated && <NavLink to="/bookings">My bookings</NavLink>}
            {isAuthenticated ? (
              <button type="button" className="nav__button" onClick={logout}>
                Sign out
              </button>
            ) : (
              !onAuthPage && <Link to={`/login?${redirect}`}>Sign in</Link>
            )}
          </nav>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <span>Mooma · movie tickets</span>
          <ApiStatus />
        </div>
      </footer>

      <ScrollRestoration />
    </div>
  )
}
