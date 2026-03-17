import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@utils/cn';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import { tokenStorage } from '@/utils/axiosInstance';
import type { UserRole } from '@/types/auth';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Users, GitBranch, ShoppingCart, BarChart2,
  Lock, LogOut, X, ChevronLeft, ChevronRight, ChevronDown,
} from 'lucide-react';

/* ── Types ── */
interface SubItem {
  label:        string;
  path:         string;
  allowedRoles: UserRole[];
  permission?:  string;
}

interface NavItem {
  label:        string;
  icon:         LucideIcon;
  allowedRoles: UserRole[];
  path?:        string;
  children?:    SubItem[];
  permission?:  string;
}

/* ── Menu config ── */
const MENU: NavItem[] = [
  {
    label:        'Dashboard',
    path:         '/admin/dashboard',
    icon:         LayoutDashboard,
    allowedRoles: ['superadmin', 'admin', 'employee'],
  },
  {
    label:        'People',
    icon:         Users,
    allowedRoles: ['superadmin', 'admin', 'employee'],
    children: [
      { label: 'Employees', path: '/admin/employees', allowedRoles: ['superadmin', 'admin'] },
      { label: 'UPA Users', path: '/admin/upa-users', allowedRoles: ['superadmin', 'admin', 'employee'] },
    ],
  },
  {
    label:        'Network',
    icon:         GitBranch,
    allowedRoles: ['superadmin', 'admin'],
    children: [
      { label: 'UPA Tree', path: '/admin/upa-tree', allowedRoles: ['superadmin', 'admin'] },
    ],
  },
  {
    label:        'Commerce',
    icon:         ShoppingCart,
    allowedRoles: ['superadmin', 'admin', 'employee'],
    children: [
      { label: 'Vendors',   path: '/admin/vendors',   allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'vendors.view'   },
      { label: 'Tenders',   path: '/admin/tenders',   allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'tenders.view'   },
      { label: 'Inventory', path: '/admin/inventory', allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'inventory.view' },
      { label: 'Orders',    path: '/admin/orders',    allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'orders.view'    },
    ],
  },
  {
    label:        'Reports',
    path:         '/admin/reports',
    icon:         BarChart2,
    allowedRoles: ['superadmin', 'admin'],
  },
];

/* ── Props ── */
interface AdminSidebarProps {
  mobileOpen:     boolean;
  onMobileToggle: () => void;
}

/* ── Tooltip (only shown in collapsed mode) ── */
function Tip({ label, children, collapsed }: { label: string; children: React.ReactNode; collapsed: boolean }) {
  return (
    <div className="group/tip relative flex w-full">
      {children}
      {collapsed && (
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-md opacity-0 transition-opacity group-hover/tip:opacity-100">
          {label}
        </span>
      )}
    </div>
  );
}

export function AdminSidebar({ mobileOpen, onMobileToggle }: AdminSidebarProps) {
  const { user, clearAuth } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [collapsed, setCollapsed] = useState<boolean>(() =>
    localStorage.getItem('sidebar_collapsed') === 'true',
  );

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('sidebar_open_groups');
    if (saved) { try { return JSON.parse(saved) as Record<string, boolean>; } catch { /**/ } }
    return Object.fromEntries(MENU.filter((m) => m.children).map((m) => [m.label, true]));
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    localStorage.setItem('sidebar_open_groups', JSON.stringify(openGroups));
  }, [openGroups]);

  /* auto-open parent group when navigating to a child route */
  useEffect(() => {
    MENU.forEach((item) => {
      if (item.children) {
        const hasActive = item.children.some((c) => location.pathname.startsWith(c.path));
        if (hasActive) setOpenGroups((p) => ({ ...p, [item.label]: true }));
      }
    });
  }, [location.pathname]);

  const toggleGroup = (label: string) => {
    if (collapsed) { setCollapsed(false); return; } // expand sidebar first on click
    setOpenGroups((p) => ({ ...p, [label]: !p[label] }));
  };

  const canAccess = (item: { allowedRoles: UserRole[]; permission?: string }): boolean => {
    if (!user) return false;
    if (!item.allowedRoles.includes(user.role)) return false;
    if (!item.permission) return true;
    if (user.role === 'superadmin' || user.role === 'admin') return true;
    return user.permissions?.includes(item.permission) ?? false;
  };

  const isGroupActive = (item: NavItem): boolean =>
    !!item.children?.some((c) => location.pathname.startsWith(c.path));

  const handleLogout = async () => {
    const refresh = tokenStorage.getRefresh();
    try { if (refresh) await authService.logout(refresh); } catch { /**/ }
    clearAuth();
    navigate('/admin/login', { replace: true });
  };

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
      || user.email?.[0]?.toUpperCase() || '?'
    : '?';

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={onMobileToggle} />
      )}

      <aside className={cn(
        'fixed left-0 top-0 z-30 flex h-full flex-col border-r bg-card transition-all duration-200 ease-in-out lg:static',
        collapsed ? 'w-[60px]' : 'w-[220px]',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}>

        {/* ── Header ── */}
        <div className={cn(
          'flex h-[52px] shrink-0 items-center border-b px-3',
          collapsed ? 'justify-center' : 'justify-between',
        )}>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">MyApp</p>
              <p className="text-[10px] text-muted-foreground">Admin Portal</p>
            </div>
          )}

          {/* Desktop: collapse/expand toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:flex"
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>

          {/* Mobile: close button */}
          <button className="flex lg:hidden text-muted-foreground" onClick={onMobileToggle}>
            <X size={18} />
          </button>
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {MENU.map((item) => {
            const Icon = item.icon;

            /* ─ Direct link (no children) ─ */
            if (item.path && !item.children) {
              const accessible = canAccess(item);

              if (!accessible) {
                return (
                  <Tip key={item.path} label={item.label} collapsed={collapsed}>
                    <div className={cn(
                      'flex w-full cursor-not-allowed items-center gap-3 px-3 py-2 text-sm opacity-35',
                      collapsed && 'justify-center px-0',
                    )}>
                      <Icon size={16} className="shrink-0" />
                      {!collapsed && <><span className="flex-1">{item.label}</span><Lock size={12} /></>}
                    </div>
                  </Tip>
                );
              }

              return (
                <Tip key={item.path} label={item.label} collapsed={collapsed}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/admin/dashboard'}
                    className={({ isActive }) => cn(
                      'flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors',
                      collapsed && 'justify-center px-0',
                      isActive
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                    )}
                  >
                    <Icon size={16} className="shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                </Tip>
              );
            }

            /* ─ Group with submenus ─ */
            if (item.children) {
              const accessibleChildren = item.children.filter(canAccess);
              const lockedChildren     = item.children.filter((c) => !canAccess(c));
              if (accessibleChildren.length === 0 && lockedChildren.length === 0) return null;

              const groupActive = isGroupActive(item);
              const groupOpen   = openGroups[item.label] ?? true;

              return (
                <div key={item.label}>
                  {/* Group header button */}
                  <Tip label={item.label} collapsed={collapsed}>
                    <button
                      onClick={() => toggleGroup(item.label)}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors',
                        collapsed && 'justify-center px-0',
                        groupActive
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                      )}
                    >
                      {/* Active indicator dot on icon when collapsed */}
                      <div className="relative shrink-0">
                        <Icon size={16} />
                        {collapsed && groupActive && (
                          <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </div>
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronDown
                            size={13}
                            className={cn('shrink-0 transition-transform duration-150', groupOpen && 'rotate-180')}
                          />
                        </>
                      )}
                    </button>
                  </Tip>

                  {/* Submenu items — hidden when collapsed or group closed */}
                  {!collapsed && groupOpen && (
                    <div className="ml-3 border-l border-border/60 pl-3 pb-1">
                      {accessibleChildren.map((child) => {
                        const isActive = location.pathname.startsWith(child.path);
                        return (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            className={cn(
                              'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                              isActive
                                ? 'bg-accent text-accent-foreground font-medium'
                                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                            )}
                          >
                            <span className={cn(
                              'h-1.5 w-1.5 shrink-0 rounded-full transition-colors',
                              isActive ? 'bg-primary' : 'bg-muted-foreground/40',
                            )} />
                            {child.label}
                          </NavLink>
                        );
                      })}
                      {lockedChildren.map((child) => (
                        <div
                          key={child.path}
                          className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-xs opacity-35"
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/25" />
                          <span className="flex-1">{child.label}</span>
                          <Lock size={10} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return null;
          })}
        </nav>

        {/* ── Footer ── */}
        <div className={cn('shrink-0 border-t p-3', collapsed && 'flex justify-center')}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{user?.full_name || user?.email}</p>
                  <p className="text-[10px] capitalize text-muted-foreground">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="mt-2.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <LogOut size={13} />
                Sign out
              </button>
            </>
          ) : (
            <Tip label="Sign out" collapsed={collapsed}>
              <button
                onClick={handleLogout}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <LogOut size={15} />
              </button>
            </Tip>
          )}
        </div>
      </aside>
    </>
  );
}
