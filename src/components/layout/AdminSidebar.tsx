import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@utils/cn';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import { tokenStorage } from '@/utils/axiosInstance';
import type { UserRole } from '@/types/auth';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Users, UserCheck, Network, Package,
  ShoppingCart, RotateCcw, Warehouse, BarChart3, Boxes,
  Building2, PackageSearch, FileText, ClipboardList, ClipboardCheck,
  PieChart, LogOut, ChevronDown, X,
} from 'lucide-react';

/* ── Types ── */
interface MenuItem {
  label:        string;
  path:         string;
  icon:         LucideIcon;
  allowedRoles: UserRole[];
  permission?:  string;
  soon?:        boolean;
}

interface Section {
  key:    string;
  label?: string;        // undefined = no section header (Dashboard)
  title?: string;        // tooltip for abbreviated labels
  items:  MenuItem[];
}

/* ── Sections config ── */
const SECTIONS: Section[] = [
  {
    key: 'dashboard',
    items: [
      { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, allowedRoles: ['superadmin', 'admin', 'employee'] },
    ],
  },
  {
    key: 'people', label: 'People',
    items: [
      { label: 'Employees', path: '/admin/employees', icon: Users,     allowedRoles: ['superadmin', 'admin'] },
      { label: 'UPA Users', path: '/admin/upa-users', icon: UserCheck, allowedRoles: ['superadmin', 'admin', 'employee'] },
    ],
  },
  {
    key: 'network', label: 'Network',
    items: [
      { label: 'UPA Tree', path: '/admin/upa-tree', icon: Network, allowedRoles: ['superadmin', 'admin'] },
    ],
  },
  {
    key: 'master', label: 'Master',
    items: [
      { label: 'Products', path: '/admin/products', icon: Package, allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'products.edit' },
    ],
  },
  {
    key: 'sales', label: 'Sales',
    items: [
      { label: 'Orders',  path: '/admin/orders',  icon: ShoppingCart, allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'orders.view' },
      { label: 'Returns', path: '/admin/returns', icon: RotateCcw,    allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'orders.view' },
    ],
  },
  {
    key: 'ims', label: 'IMS', title: 'Inventory Management System',
    items: [
      { label: 'Warehouse',  path: '/admin/warehouse',  icon: Warehouse, allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'inventory.view' },
      { label: 'Stock',      path: '/admin/stock',      icon: BarChart3, allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'inventory.view' },
      { label: 'Inventory',  path: '/admin/inventory',  icon: Boxes,     allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'inventory.view', soon: true },
    ],
  },
  {
    key: 'vm', label: 'VM', title: 'Vendor Management',
    items: [
      { label: 'Vendors',         path: '/admin/vendors',         icon: Building2,     allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'vendors.view' },
      { label: 'Vendor Products', path: '/admin/vendor-products', icon: PackageSearch, allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'vendors.view' },
    ],
  },
  {
    key: 'tm', label: 'TM', title: 'Tender Management',
    items: [
      { label: 'Tender', path: '/admin/tender', icon: FileText, allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'tenders.view', soon: true },
    ],
  },
  {
    key: 'ops', label: 'Operations',
    items: [
      { label: 'Procurement', path: '/admin/procurement', icon: ClipboardList,  allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'vendors.view' },
      { label: 'Inspection',  path: '/admin/inspection',  icon: ClipboardCheck, allowedRoles: ['superadmin', 'admin', 'employee'], permission: 'inspection.perform' },
    ],
  },
  {
    key: 'reports', label: 'Reports',
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

export function AdminSidebar({ mobileOpen, onMobileToggle }: AdminSidebarProps) {
  const { user, clearAuth } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sidebar_sections');
      return saved ? JSON.parse(saved) : {
        people: true, network: true, master: true,
        sales: true, ims: true, vm: true,
        tm: true, ops: true, reports: true,
      };
    } catch { return {}; }
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('sidebar_sections', JSON.stringify(next));
      return next;
    });
  };

  const canAccess = (item: { allowedRoles: UserRole[]; permission?: string }): boolean => {
    if (!user) return false;
    if (!item.allowedRoles.includes(user.role)) return false;
    if (!item.permission) return true;
    if (user.role === 'superadmin' || user.role === 'admin') return true;
    return user.permissions?.includes(item.permission) ?? false;
  };

  const isActive = (path: string) =>
    path === '/admin/dashboard'
      ? location.pathname === path
      : location.pathname.startsWith(path);

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
        'fixed left-0 top-0 z-30 flex flex-col h-full w-[220px] flex-shrink-0 border-r border-border/50 bg-card transition-transform duration-200 lg:static',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}>

        {/* ── Header ── */}
        <div className="px-4 py-3.5 border-b border-border/50 flex-shrink-0 flex items-start justify-between">
          <div>
            <h2 className="text-sm font-medium text-foreground">Admin Panel</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Manage your platform</p>
          </div>
          <button className="flex lg:hidden text-muted-foreground mt-0.5" onClick={onMobileToggle}>
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable nav ── */}
        <div className="flex-1 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-border">
          {SECTIONS.map((section, sIdx) => {
            const accessibleItems = section.items.filter(canAccess);
            if (accessibleItems.length === 0) return null;

            const isOpen = openSections[section.key] ?? true;

            return (
              <div key={section.key}>
                {/* Divider between sections */}
                {sIdx > 0 && <div className="mx-3 my-1 border-t border-border/40" />}

                {/* Section header (collapsible) — skip for dashboard */}
                {section.label && (
                  <button
                    onClick={() => toggleSection(section.key)}
                    className="flex items-center justify-between w-full px-3 pt-3 pb-1 group"
                  >
                    <span
                      title={section.title}
                      className="text-[9.5px] font-medium tracking-widest uppercase text-muted-foreground/60 group-hover:text-muted-foreground transition-colors"
                    >
                      {section.label}
                    </span>
                    <ChevronDown className={cn(
                      'h-3 w-3 text-muted-foreground/40 transition-transform duration-200',
                      isOpen && 'rotate-180',
                    )} />
                  </button>
                )}

                {/* Items — always show for dashboard (no label = no toggle) */}
                {(!section.label || isOpen) && (
                  <div className="pb-1">
                    {accessibleItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={cn(
                            'flex items-center gap-2 mx-2 px-3 py-[5px] rounded-md text-[12.5px] transition-colors duration-150',
                            active
                              ? 'font-medium bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          )}
                        >
                          <Icon className="h-[14px] w-[14px] flex-shrink-0" />
                          <span className="flex-1">{item.label}</span>
                          {item.soon && (
                            <span className="ml-auto text-[9px] bg-muted text-muted-foreground/70 px-1.5 py-0.5 rounded-full border border-border/50 leading-none">
                              Soon
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-border/50 p-2 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 mb-0.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-foreground leading-tight">{user?.full_name || user?.email}</p>
              <p className="text-[10px] capitalize text-muted-foreground leading-tight">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-[12.5px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-[14px] w-[14px]" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
