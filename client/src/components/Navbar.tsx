import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { ThemeToggle } from './ThemeToggle';
import { SearchBar } from './SearchBar';
import { CartDrawer } from './CartDrawer';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors ${isActive ? 'text-steam-100' : 'text-steam-400 hover:text-steam-100'}`;

export function Navbar() {
  const { user, logout } = useAuth();
  const { gameIds } = useCart();
  const { gameIds: wishlistIds } = useWishlist();
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-iron-700 bg-forge-black/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-6">
          <Link to="/" className="shrink-0 font-display text-lg font-bold text-steam-100">
            Game<span className="text-ember">Forge</span>
          </Link>

          <nav className="hidden items-center gap-5 md:flex">
            <NavLink to="/" end className={navLinkClass}>
              Store
            </NavLink>
            <NavLink to="/categories" className={navLinkClass}>
              Categories
            </NavLink>
            <NavLink to="/discover" className={navLinkClass}>
              Discover
            </NavLink>
            {user?.role === 'CUSTOMER' && (
              <>
                <NavLink to="/library" className={navLinkClass}>
                  Library
                </NavLink>
                <NavLink to="/orders" className={navLinkClass}>
                  Orders
                </NavLink>
                <NavLink to="/subscribe" className={navLinkClass}>
                  GameForge+
                </NavLink>
              </>
            )}
          </nav>

          <div className="flex-1">
            <SearchBar className="mx-auto hidden max-w-md md:flex" />
          </div>

          <div className="flex items-center gap-3">
            <Link to="/wishlist" className="relative rounded-full p-2 text-steam-400 hover:bg-iron-800 hover:text-steam-100" aria-label="Wishlist">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
              </svg>
              {wishlistIds.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-ember text-[10px] font-bold text-iron-900">
                  {wishlistIds.length}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative rounded-full p-2 text-steam-400 hover:bg-iron-800 hover:text-steam-100"
              aria-label="Cart"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {gameIds.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-ember text-[10px] font-bold text-iron-900">
                  {gameIds.length}
                </span>
              )}
            </button>

            <ThemeToggle />

            {user ? (
              <div className="relative">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-iron-800 font-display text-sm font-semibold text-steam-100"
                >
                  {user.firstName[0]}
                </motion.button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-11 w-48 rounded-lg border border-iron-700 bg-iron-900 py-2 shadow-xl"
                      onMouseLeave={() => setMenuOpen(false)}
                    >
                      <Link to="/profile" className="block px-4 py-2 text-sm text-steam-100 hover:bg-iron-800" onClick={() => setMenuOpen(false)}>
                        Profile
                      </Link>
                      <Link to="/gift-cards" className="block px-4 py-2 text-sm text-steam-100 hover:bg-iron-800" onClick={() => setMenuOpen(false)}>
                        Gift Cards
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          logout();
                        }}
                        className="block w-full px-4 py-2 text-left text-sm text-steam-100 hover:bg-iron-800"
                      >
                        Log out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="rounded-md px-3 py-2 text-sm font-medium text-steam-100 hover:bg-iron-800">
                  Sign in
                </Link>
                <Link to="/signup" className="rounded-md bg-ember px-3 py-2 text-sm font-semibold text-iron-900 hover:bg-[#ff6a43]">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
