import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="fullscreen-center">
        <Loader2 className="spin" size={28} />
        <p>Loading your portal session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="fullscreen-center">
        <Loader2 className="spin" size={28} />
        <p>Checking admin access...</p>
      </div>
    );
  }

  return isAdmin ? <Outlet /> : <Navigate to="/portal" replace />;
}
