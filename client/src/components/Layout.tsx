import { Link, NavLink, Outlet } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <>
      <header className="topnav">
        <div className="topnav-inner">
          <Link to="/" className="brand">
            Game<span className="ember-dot">Forge</span>
          </Link>
          <nav className="nav-links">
            <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              Storefront
            </NavLink>
            {user && (
              <NavLink to="/orders" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                My Orders
              </NavLink>
            )}
            {user?.role === 'PUBLISHER' && (
              <NavLink
                to="/publisher/games"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                style={{ ['--portal-color' as string]: 'var(--teal)' }}
              >
                My Games
              </NavLink>
            )}
            {(user?.role === 'ADMIN' || user?.role === 'PUBLISHER') && (
              <NavLink
                to="/admin/refunds"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                style={{ ['--portal-color' as string]: 'var(--violet)' }}
              >
                Refunds
              </NavLink>
            )}
            {user?.role === 'ADMIN' && (
              <>
                <NavLink
                  to="/admin/gift-cards"
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  style={{ ['--portal-color' as string]: 'var(--violet)' }}
                >
                  Gift Cards
                </NavLink>
                <NavLink
                  to="/admin/promotions"
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  style={{ ['--portal-color' as string]: 'var(--violet)' }}
                >
                  Promotions
                </NavLink>
                <NavLink
                  to="/admin/analytics"
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  style={{ ['--portal-color' as string]: 'var(--violet)' }}
                >
                  Analytics
                </NavLink>
              </>
            )}
          </nav>
          <div className="row" style={{ gap: 'var(--sp-3)' }}>
            <ThemeToggle />
            {user ? (
              <>
                <span className="mono" style={{ fontSize: 13, color: 'var(--steam-400)' }}>
                  {user.email}
                </span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">
                  Log in
                </Link>
                <Link to="/signup" className="btn btn-primary btn-sm">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
