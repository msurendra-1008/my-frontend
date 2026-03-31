import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@utils/cn';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import { tokenStorage } from '@/utils/axiosInstance';
import type { UserRole } from '@/types/auth';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Users, UserCheck, Network, Package,
  ShoppingCart, RotateCcw, Boxes, Warehouse, BarChart3,
  Building2, PackageSearch, FileText, ClipboardList, ClipboardCheck,
  PieChart, Lock, LogOut, X, ChevronLeft, ChevronRight,
} from 'lucide-react';

/* ── Types ── */
interface SectionItem {
  label:        string;
  path:         string;
  icon:         LucideIcon;
  allowedRoles: UserRole[];
  permission?:  string;
  soon?:        boolean;
}

interface Section {
  label:  string;
  title?: string; // full name tooltip for abbreviated labels (IMS, VM, TM)
  items:  SectionItem[];
}

/* ── Menu sections ── */
const SECTIONS: Section[] = [
  {
    label: 'Dashboard',
    items: [
      { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, allowedRoles: ['superadmin', 'admin', 'employee'] },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Employees', path: '/admin/employees', icon: Users,     allowedRoles: ['superadmin', 'admin'] },
      { label: 'UPA Users', path: '/admin/upa-users', icon: UserCheck, allowedRoles: ['superadmin', 'admin', 'employee'] },
    ],
  },
  {
    label: 'Network',
    items: [
      { label: 'UPA Tree', path: '/admin/upa-tree', icon: Network, allowedRoles: ['superadmin', 'admin'] },
    ],
  },
  {
    label: 'Master',
    items: [
      { label: 'Products', path: '/admin/products', icon: Package, allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'products.edit' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Orders',  path: '/admin/orders',  icon: ShoppingCart, allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'orders.view' },
      { label: 'Returns', path: '/admin/returns', icon: RotateCcw,    allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'orders.view' },
    ],
  },
  {
    label: 'IMS',
    title: 'Inventory Management System',
    items: [
      { label: 'Inventory', path: '/admin/inventory', icon: Boxes,     allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'inventory.view', soon: true },
      { label: 'Warehouse', path: '/admin/warehouse', icon: Warehouse, allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'inventory.view' },
      { label: 'Stock',     path: '/admin/stock',     icon: BarChart3, allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'inventory.view' },
    ],
  },
  {
    label: 'VM',
    title: 'Vendor Management',
    items: [
      { label: 'Vendors',         path: '/admin/vendors',         icon: Building2,     allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'vendors.view' },
      { label: 'Vendor Products', path: '/admin/vendor-products', icon: PackageSearch, allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'vendors.view' },
    ],
  },
  {
    label: 'TM',
    title: 'Tender Management',
    items: [
      { label: 'Tender', path: '/admin/tender', icon: FileText, allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'tenders.view', soon: true },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Procurement', path: '/admin/procurement', icon: ClipboardList,  allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'vendors.view' },
      { label: 'Inspection',  path: '/admin/inspection',  icon: ClipboardCheck, allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'inspection.perform' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { label: 'Reports', path: '/admin/reports', icon: PieChart, allowedRoles: ['superadmin', 'admin'], soon: true },
    ],
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
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState<boolean>(() =>
    localStorage.getItem('sidebar_collapsed') === 'true',
  );

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  const canAccess = (item: { allowedRoles: UserRole[]; permission?: string }): boolean => {
    if (!user) return false;
    if (!item.allowedRoles.includes(user.role)) return false;
    if (!item.permission) return true;
    if (user.role === 'superadmin' || user.role === 'admin') return true;
    return user.permissions?.includes(item.permission) ?? false;
  };

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
        'fixed left-0 top-0 z-30 flex h-full flex-col border-r bg-card transition-all duration-200 ease-in-out lg:static lg:flex-shrink-0',
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
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:flex"
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
          <button className="flex lg:hidden text-muted-foreground" onClick={onMobileToggle}>
            <X size={18} />
          </button>
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {SECTIONS.map((section, sIdx) => {
            const visibleItems = section.items.filter(
              (item) => canAccess(item) || !canAccess(item), // show all, locked ones styled differently
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.label}>
                {/* Thin divider between sections */}
                {sIdx > 0 && <div className="mx-3 my-1 border-t border-border/40" />}

                {/* Section label — hidden when collapsed */}
                {!collapsed && (
                  <p
                    title={section.title}
                    className="px-3 pt-4 pb-1 text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50 select-none"
                  >
                    {section.label}
                  </p>
                )}

                {/* Items */}
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const accessible = canAccess(item);

                  if (!accessible) {
                    return (
                      <Tip key={item.path} label={item.label} collapsed={collapsed}>
                        <div className={cn(
                          'flex w-full cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-sm opacity-35',
                          collapsed && 'justify-center px-0',
                        )}>
                          <Icon size={15} className="shrink-0" />
                          {!collapsed && <><span className="flex-1">{item.label}</span><Lock size={11} /></>}
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
                          'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
                          collapsed && 'justify-center px-0',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        <Icon size={15} className="shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="flex-1">{item.label}</span>
                            {item.soon && (
                              <span className="ml-auto text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full leading-none">
                                Soon
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </Tip>
                  );
                })}
              </div>
            );
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
