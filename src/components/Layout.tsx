import { Link, NavLink, Outlet } from 'react-router'
import { ApiStatus } from './ApiStatus'

export function Layout() {
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
    </div>
  )
}
