import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }
  if (!isAdmin) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
