import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@context/AuthContext';
import { Spinner } from '@components/ui/Spinner';
import type { ReactNode } from 'react';
import type { UserRole } from '@/types/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

export function ProtectedRoute({ children, allowedRoles, redirectTo }: ProtectedRouteProps) {
  const { isLoading } = useAuth();
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    let loginPath = redirectTo ?? '/admin/login';
    if (allowedRoles?.includes('upa_user')) loginPath = '/login';
    else if (allowedRoles?.includes('vendor')) loginPath = '/vendor/login';
    return <Navigate to={loginPath} state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    if (user.role === 'upa_user') return <Navigate to="/dashboard" replace />;
    if (user.role === 'vendor') return <Navigate to="/vendor/dashboard" replace />;
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
}
