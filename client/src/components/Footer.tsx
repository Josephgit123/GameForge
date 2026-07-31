import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-iron-700 bg-iron-900">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
        <div>
          <div className="mb-3 font-display text-lg font-bold text-steam-100">
            Game<span className="text-ember">Forge</span>
          </div>
          <p className="text-sm text-steam-400">A digital game marketplace.</p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-steam-100">Store</h4>
          <div className="flex flex-col gap-2 text-sm text-steam-400">
            <Link to="/" className="hover:text-steam-100">Home</Link>
            <Link to="/categories" className="hover:text-steam-100">Categories</Link>
            <Link to="/wishlist" className="hover:text-steam-100">Wishlist</Link>
          </div>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-steam-100">Account</h4>
          <div className="flex flex-col gap-2 text-sm text-steam-400">
            <Link to="/login" className="hover:text-steam-100">Customer sign in</Link>
            <Link to="/signup" className="hover:text-steam-100">Create account</Link>
          </div>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-steam-100">For businesses</h4>
          <div className="flex flex-col gap-2 text-sm text-steam-400">
            <Link to="/publisher/login" className="hover:text-steam-100">Publisher portal</Link>
            <Link to="/publisher/signup" className="hover:text-steam-100">Become a publisher</Link>
            <Link to="/admin/login" className="hover:text-steam-100">Admin portal</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
