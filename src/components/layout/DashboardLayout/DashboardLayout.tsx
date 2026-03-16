import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { useTheme } from '@context/ThemeContext';
import { cn } from '@utils/cn';
import {
  LayoutDashboard,
  User,
  ChevronDown,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';

/* ── Nav config ── */
interface NavChild { label: string; to: string }
interface NavGroup { label: string; icon: React.ReactNode; children: NavChild[] }

const NAV: NavGroup[] = [
  {
    label: 'Main',
    icon: <LayoutDashboard size={16} />,
    children: [{ label: 'Overview', to: '/dashboard' }],
  },
  {
    label: 'Account',
    icon: <User size={16} />,
    children: [
      { label: 'Profile', to: '/dashboard/account' },
      { label: 'Settings', to: '/dashboard/settings' },
    ],
  },
];

/* ── Sidebar ── */
function Sidebar() {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV.map((g) => [g.label, true])),
  );

  const toggle = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <aside className="flex w-60 flex-shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-5">
        <span className="text-xl text-sidebar-primary">⬡</span>
        <span className="font-semibold text-white">MyApp</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        {NAV.map((group) => (
          <div key={group.label} className="mb-1 px-3">
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={() => toggle(group.label)}
              aria-expanded={openGroups[group.label]}
            >
              <span className="text-sidebar-foreground/60">{group.icon}</span>
              <span className="flex-1 text-left">{group.label}</span>
              <ChevronDown
                size={12}
                className={cn('transition-transform', openGroups[group.label] && 'rotate-180')}
              />
            </button>

            {openGroups[group.label] && (
              <div className="mt-1 space-y-0.5">
                {group.children.map((child) => (
                  <NavLink
                    key={child.to}
                    to={child.to}
                    end={child.to === '/dashboard'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                        isActive
                          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                      )
                    }
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                    {child.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}

/* ── Topbar ── */
function Topbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'
    : '?';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <div />
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          aria-label="Toggle theme"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials}
          </span>
          <span className="text-sm font-medium text-foreground">{user?.full_name || user?.email}</span>
        </div>

        <button
          onClick={handleLogout}
          title="Sign out"
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}

/* ── Layout ── */
export function DashboardLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
