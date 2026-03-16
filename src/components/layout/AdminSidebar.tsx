import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@utils/cn';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import { tokenStorage } from '@/utils/axiosInstance';
import type { UserRole } from '@/types/auth';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Users, UserCheck, GitBranch, Truck, FileText,
  Package, ShoppingCart, BarChart2, Lock, LogOut, X,
} from 'lucide-react';

interface MenuItem {
  label:        string;
  path:         string;
  icon:         LucideIcon;
  allowedRoles: UserRole[];
  permission?:  string;
}

const MENU: MenuItem[] = [
  { label: 'Dashboard',  path: '/admin/dashboard', icon: LayoutDashboard, allowedRoles: ['superadmin','admin','employee'] },
  { label: 'Employees',  path: '/admin/employees', icon: Users,           allowedRoles: ['superadmin','admin'] },
  { label: 'UPA Users',  path: '/admin/upa-users', icon: UserCheck,       allowedRoles: ['superadmin','admin','employee'] },
  { label: 'MLM Tree',   path: '/admin/mlm-tree',  icon: GitBranch,       allowedRoles: ['superadmin','admin'] },
  { label: 'Vendors',    path: '/admin/vendors',   icon: Truck,           allowedRoles: ['superadmin','admin','employee'], permission: 'vendors.view' },
  { label: 'Tenders',    path: '/admin/tenders',   icon: FileText,        allowedRoles: ['superadmin','admin','employee'], permission: 'tenders.view' },
  { label: 'Inventory',  path: '/admin/inventory', icon: Package,         allowedRoles: ['superadmin','admin','employee'], permission: 'inventory.view' },
  { label: 'Orders',     path: '/admin/orders',    icon: ShoppingCart,    allowedRoles: ['superadmin','admin','employee'], permission: 'orders.view' },
  { label: 'Reports',    path: '/admin/reports',   icon: BarChart2,       allowedRoles: ['superadmin','admin'] },
];

interface AdminSidebarProps {
  isOpen:    boolean;
  onToggle:  () => void;
}

export function AdminSidebar({ isOpen, onToggle }: AdminSidebarProps) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const canAccess = (item: MenuItem): boolean => {
    if (!user) return false;
    if (!item.allowedRoles.includes(user.role)) return false;
    if (!item.permission) return true;
    if (user.role === 'superadmin' || user.role === 'admin') return true;
    return user.permissions?.includes(item.permission) ?? false;
  };

  const handleLogout = async () => {
    const refresh = tokenStorage.getRefresh();
    try { if (refresh) await authService.logout(refresh); } catch { /* proceed */ }
    clearAuth();
    navigate('/admin/login', { replace: true });
  };

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'
    : '?';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={onToggle} />}

      <aside className={cn(
        'fixed left-0 top-0 z-30 flex h-full w-[220px] flex-col border-r bg-background transition-transform duration-200 lg:static lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        {/* Header */}
        <div className="flex h-[52px] items-center justify-between border-b px-4">
          <div>
            <p className="text-sm font-bold text-foreground">MyApp</p>
            <p className="text-[10px] text-muted-foreground">Admin Portal</p>
          </div>
          <button className="lg:hidden text-muted-foreground" onClick={onToggle}><X size={18} /></button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {MENU.map((item) => {
            const accessible = canAccess(item);
            const Icon = item.icon;
            if (accessible) {
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin/dashboard'}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            }
            // Locked item — visible but disabled
            return (
              <div
                key={item.path}
                className="flex cursor-not-allowed items-center gap-3 px-4 py-2 text-sm opacity-35"
              >
                <Icon size={16} />
                <span className="flex-1">{item.label}</span>
                <Lock size={12} />
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-medium text-foreground">{user?.full_name || user?.email}</p>
              <p className="text-[10px] capitalize text-muted-foreground">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
