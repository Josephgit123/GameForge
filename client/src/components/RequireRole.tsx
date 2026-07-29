import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../lib/types';

export function RequireRole({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="page">
        <div className="panel-card">
          <h2>Not available</h2>
          <p style={{ color: 'var(--steam-400)', marginTop: 'var(--sp-2)' }}>
            Your account doesn't have access to this page.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
