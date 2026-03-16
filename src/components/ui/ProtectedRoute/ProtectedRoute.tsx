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
    const loginPath = redirectTo ?? (allowedRoles?.includes('upa_user') ? '/login' : '/admin/login');
    return <Navigate to={loginPath} state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const dest = user.role === 'upa_user' ? '/dashboard' : '/admin/dashboard';
    return <Navigate to={dest} replace />;
  }

  return <>{children}</>;
}
