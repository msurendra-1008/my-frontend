import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types/auth';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user);
  if (!user || !allowedRoles.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
}
