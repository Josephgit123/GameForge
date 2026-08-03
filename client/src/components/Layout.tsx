import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ThemeToggle } from './ThemeToggle';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { PatsStoreLogo } from './PatsStoreLogo';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

// Scoped to this one publisher account only — not a general "publisher
// branding in nav" feature. See PatsStoreLogo.tsx.
const PATS_STORE_EMAIL = 'publisher@gameforge.dev';

function PageTransition() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

// Publisher/Admin keep the original design system's nav — out of scope for
// the Epic-style redesign, which only covers the customer-facing portal.
function PortalNav() {
  const { user, token, logout } = useAuth();
  const isPatsStore = user?.role === 'PUBLISHER' && user.email === PATS_STORE_EMAIL;
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isPatsStore) return;
    api
      .get<{ branding: { logoUrl?: string } }>('/store/branding', token)
      .then((res) => setLogoUrl(res.branding.logoUrl ?? null))
      .catch(() => {});
  }, [isPatsStore, token]);

  return (
    <header className="topnav">
      <div className="topnav-inner">
        <Link to="/" className="brand" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          Game<span className="ember-dot">Forge</span>
          {isPatsStore &&
            (logoUrl ? (
              <img src={logoUrl} alt="Pat's game store" className="h-6 w-6 rounded-full object-cover" />
            ) : (
              <PatsStoreLogo />
            ))}
        </Link>
        <nav className="nav-links">
          {user?.role !== 'PUBLISHER' && user?.role !== 'ADMIN' && (
            <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              Storefront
            </NavLink>
          )}
          {user && user.role !== 'PUBLISHER' && user.role !== 'ADMIN' && (
            <NavLink to="/orders" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              My Orders
            </NavLink>
          )}
          {user?.role === 'PUBLISHER' && (
            <>
              <NavLink
                to="/publisher/dashboard"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                style={{ ['--portal-color' as string]: 'var(--teal)' }}
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/publisher/games"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                style={{ ['--portal-color' as string]: 'var(--teal)' }}
              >
                My Games
              </NavLink>
              <NavLink
                to="/publisher/orders"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                style={{ ['--portal-color' as string]: 'var(--teal)' }}
              >
                Orders
              </NavLink>
              <NavLink
                to="/publisher/analytics"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                style={{ ['--portal-color' as string]: 'var(--teal)' }}
              >
                Analytics
              </NavLink>
              <NavLink
                to="/publisher/store"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                style={{ ['--portal-color' as string]: 'var(--teal)' }}
              >
                Store Management
              </NavLink>
              <NavLink
                to="/publisher/settings"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                style={{ ['--portal-color' as string]: 'var(--teal)' }}
              >
                Settings
              </NavLink>
            </>
          )}
          {user?.role === 'ADMIN' && (
            <>
              <NavLink
                to="/admin/users"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                style={{ ['--portal-color' as string]: 'var(--violet)' }}
              >
                Manage Users
              </NavLink>
              <NavLink
                to="/admin/games"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                style={{ ['--portal-color' as string]: 'var(--violet)' }}
              >
                Manage Games
              </NavLink>
              <NavLink
                to="/admin/promotions"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                style={{ ['--portal-color' as string]: 'var(--violet)' }}
              >
                Create Promotions
              </NavLink>
              <NavLink
                to="/admin/gift-cards"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                style={{ ['--portal-color' as string]: 'var(--violet)' }}
              >
                Issue Gift Cards
              </NavLink>
              <NavLink
                to="/admin/transactions"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                style={{ ['--portal-color' as string]: 'var(--violet)' }}
              >
                Monitor Transactions
              </NavLink>
              <NavLink
                to="/admin/subscriptions"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                style={{ ['--portal-color' as string]: 'var(--violet)' }}
              >
                Manage Subscriptions
              </NavLink>
            </>
          )}
          {user?.role === 'ADMIN' && (
            <NavLink
              to="/admin/refunds"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              style={{ ['--portal-color' as string]: 'var(--violet)' }}
            >
              Refunds
            </NavLink>
          )}
        </nav>
        <div className="row" style={{ gap: 'var(--sp-3)' }}>
          <ThemeToggle />
          {user ? (
            <>
              <span className="mono" style={{ fontSize: 15, color: 'var(--steam-400)' }}>
                {user.email}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Customer login
              </Link>
              <Link to="/publisher/login" className="btn btn-ghost btn-sm">
                Publisher login
              </Link>
              <Link to="/admin/login" className="btn btn-ghost btn-sm">
                Admin login
              </Link>
              <Link to="/signup" className="btn btn-primary btn-sm">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function Layout() {
  const { user } = useAuth();
  const isCustomerFacing = !user || user.role === 'CUSTOMER';

  if (isCustomerFacing) {
    return (
      <div className="min-h-screen bg-forge-black">
        <Navbar />
        <main>
          <PageTransition />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <PortalNav />
      <main>
        <Outlet />
      </main>
    </>
  );
}
