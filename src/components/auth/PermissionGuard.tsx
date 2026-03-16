import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';

interface PermissionGuardProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <>{fallback}</>;
  if (user.role === 'superadmin' || user.role === 'admin') return <>{children}</>;
  if (user.permissions?.includes(permission)) return <>{children}</>;
  return <>{fallback}</>;
}
